/* carte/ferme/fenetres.js — la scène de la ferme : la lumière des maisons, la nuit.
 *
 * Quand la nuit tombe (comme les lanternes : le voile de l'heure plus sombre que
 * BLOCS_CARTE.lanterne.allume), les pièces de la maison (les toits marqués `maison`, js/engine/
 * etage.js toits) s'allument : une lueur chaude sur leur plancher (vue quand leur toit s'efface,
 * le personnage dedans), leurs vitres (BLOCS_CARTE.lumiereMaison.sortes) éclairées, et des rayons qui
 * passent par les vitres de la façade (un mur dont la case du dessus est dans la pièce : sa face
 * donne dehors) et tombent sur le sol devant elle, les montants de la fenêtre y laissant une
 * ombre. Elles s'éteignent, en fondu, quand tout le foyer dort : le personnage (modèle.dort) et
 * chacun de sa famille, couché (js/famille-ferme.js).
 *
 * Ces lumières sont posées dans le voile de l'heure avec celles des lanternes (stepLanterns,
 * js/carte/ferme/chantier.js) : CarteKit.voile, eclaire.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T, BLOCS_CARTE } = F.C;
  const L = BLOCS_CARTE.lumiereMaison;

  // Les rayons d'une fenêtre : un faisceau qui part de la vitre (en haut, au milieu) vers le bas,
  // s'élargit et s'estompe ; le montant du milieu y laisse une ombre qui s'élargit aussi.
  const W = 32, H = 64;
  function rayons(textures) {
    if (textures.exists('rayons_fenetre')) return;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.7)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    const h0 = L.rayons.vitre / 2;
    g.beginPath();
    g.moveTo(W / 2 - h0, 0); g.lineTo(W / 2 + h0, 0); g.lineTo(W, H); g.lineTo(0, H);
    g.closePath();
    g.fill();
    // (le montant du milieu)
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = 'rgba(0,0,0,0.75)';
    g.beginPath();
    g.moveTo(W / 2 - 0.5, 0); g.lineTo(W / 2 + 0.5, 0); g.lineTo(W / 2 + 2, H); g.lineTo(W / 2 - 2, H);
    g.closePath();
    g.fill();
    textures.addCanvas('rayons_fenetre', cv);
  }

  F.partie({

    // Les lumières des maisons à ajouter à `out` (les lumières du voile) ; `nuit` : V.nuit.
    stepFenetres(out, nuit, dt) {
      const maisons = (this.toits || []).filter((t) => t.maison);
      if (!maisons.length || !this.blocks) { this.fenK = 0; return; }
      rayons(this.textures);
      // allumées la nuit, sauf quand tout le foyer dort
      const m = this.ctx.lastModel || {};
      const dort = !!m.dort && (!this.family || this.family.info().every((f) => f.lit));
      const but = nuit > BLOCS_CARTE.lanterne.allume && !dort ? Math.min(1, nuit / 0.4) : 0;
      const k0 = this.fenK || 0, pas = L.vitesse * dt;
      const k = this.fenK = global.CarteKit.reduit() ? but : k0 < but ? Math.min(but, k0 + pas) : Math.max(but, k0 - pas);
      if (k <= 0) return;
      const B = this.blocks, cols = this.grid.cols, Hh = BLOCS_CARTE.hauts, dy = BLOCS_CARTE.etage.dy;
      const mur = (c) => { const e = B.get(c); return !!e && e.img.texture.key === Hh.key; };
      for (const t of maisons) {
        // (le dedans ne se voit que quand le toit s'efface)
        const ouvert = k * (1 - t.img.alpha);
        if (ouvert > 0.01) {
          const P = L.piece;
          for (const c of t.dedans) {
            if (mur(c)) continue;
            out.push({ key: 'lueur', x: (c % cols) * T + T / 2, y: Math.floor(c / cols) * T + T / 2, tint: L.teinte, alpha: P.alpha * ouvert, scaleX: P.rayon / 32, scaleY: P.rayon / 32 });
          }
        }
        for (const c of t.dedans) {
          const e = B.get(c);
          if (!e || !L.sortes.includes(e.sorte) || e.img.texture.key !== Hh.key) continue;
          // (la vitre ne se voit que sur un mur sans mur au-dessous ; une grande fenêtre :
          // BLOCS_CARTE.hauts.joints, chacun ses 16 images)
          const n = e.img.frame.name, base = (Hh.joints[e.sorte] || [Hh.variantes[e.sorte]]).find((b) => n >= b && n < b + 16);
          if (base === undefined || (n - base) & 4) continue;
          const facade = t.dedans.has(c - cols) && !mur(c - cols);
          const rangs = [e.img, ...(e.hauts || [])];
          rangs.forEach((img, r) => {
            const vu = r ? img.alpha : 1;
            const a = k * vu * (facade ? 1 : 1 - t.img.alpha);
            if (a <= 0.01) return;
            const V = L.vitre, y0 = e.y - r * dy;
            out.push({ key: 'lueur', x: e.x, y: y0 + V.dy, tint: L.teinte, alpha: V.alpha * a, scaleX: V.rayon / 32, scaleY: (V.rayon * 1.4) / 32 });
            if (!facade) return;
            // les rayons : de la vitre jusqu'au sol devant la façade, et au-delà
            const R = L.rayons, long = R.long + r * dy;
            out.push({ key: 'rayons_fenetre', x: e.x, y: y0 + R.dy, tint: L.teinte, alpha: R.alpha * a, scaleX: R.large / W, scaleY: long / H, originX: 0.5, originY: 0 });
          });
        }
      }
    },
  });
})(window);
