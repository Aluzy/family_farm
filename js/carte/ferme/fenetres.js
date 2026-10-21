/* carte/ferme/fenetres.js — la scène de la ferme : la lumière des maisons, la nuit.
 *
 * Quand la nuit tombe (comme les lanternes : le voile de l'heure plus sombre que
 * BLOCS_CARTE.lanterne.allume), les pièces de la maison (les toits marqués `maison`, js/engine/
 * etage.js toits) s'allument : une lumière chaude, unie, sur leur plancher (ce qu'on en voit : pas
 * sur le dessus ni la face des murs devant) et la face du mur du fond (vus quand leur toit s'efface,
 * le personnage dedans), leurs vitres (BLOCS_CARTE.lumiereMaison.sortes) éclairées, et des rayons qui
 * passent par les vitres de la façade (un mur dont la case du dessus est dans la pièce : sa face
 * donne dehors) et tombent sur le sol devant elle (seulement le sol vu : un mur ou un toit les
 * arrête, comme un arbre ou un buisson devant elle), les montants de la fenêtre y laissant une
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

  // Les rayons d'une fenêtre : un faisceau qui part du bas de la vitre (large comme elle, au
  // milieu), passe sur le bas du mur (L.rayons.mur px), puis sur le sol devant la façade ; il
  // s'élargit et s'estompe, le montant du milieu y laisse une ombre. Il couvre 3 cases de large
  // (celles de la fenêtre et de ses deux voisines) : découpé en une bande sur le bas du mur
  // (`mur`) et une image par case du sol (`c<colonne>_<rangée>`, sur L.rayons.cases rangées),
  // chaque morceau du sol n'est posé que si sa case est du sol qu'on voit (stepFenetres).
  // `unie` : une case blanche, sans dégradé (la face du mur du fond, éclairée d'un bout à l'autre).
  const W = 3 * T;
  function textures(tx) {
    if (!tx.exists('lumiere_unie')) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = T;
      const g = cv.getContext('2d');
      g.fillStyle = '#fff';
      g.fillRect(0, 0, T, T);
      tx.addCanvas('lumiere_unie', cv);
    }
    if (tx.exists('rayons_fenetre')) return;
    const N = L.rayons.cases, M = L.rayons.mur, H = M + N * T;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.7)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    const h0 = L.rayons.vitre / 2, h1 = L.rayons.large / 2;
    g.beginPath();
    g.moveTo(W / 2 - h0, 0); g.lineTo(W / 2 + h0, 0); g.lineTo(W / 2 + h1, H); g.lineTo(W / 2 - h1, H);
    g.closePath();
    g.fill();
    // (le montant du milieu)
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = 'rgba(0,0,0,0.75)';
    g.beginPath();
    g.moveTo(W / 2 - 0.5, 0); g.lineTo(W / 2 + 0.5, 0); g.lineTo(W / 2 + 2, H); g.lineTo(W / 2 - 2, H);
    g.closePath();
    g.fill();
    const tex = tx.addCanvas('rayons_fenetre', cv);
    tex.add('mur', 0, 0, 0, W, M);
    for (let r = 0; r < N; r++) for (let c = 0; c < 3; c++) tex.add(`c${c}_${r}`, 0, c * T, M + r * T, T, T);
  }

  F.partie({

    // La case `c` est-elle du sol qu'on voit (ni un mur, ni un bloc qui arrête, ni sous un toit) ?
    solVu(c) {
      const e = this.blocks.get(c);
      if (e && (e.img.texture.key === BLOCS_CARTE.hauts.key || BLOCS_CARTE.bloquent.includes(e.sorte))) return false;
      for (const t of this.toits || []) if (t.dedans.has(c) && t.img.alpha > 0.5) return false;
      return true;
    },

    // Les cases couvertes par un arbre ou un buisson debout (ceux de la carte : mapTrees, gardés
    // jusqu'au prochain felledChanged ; ceux du Verger : leur image) : les rayons des fenêtres s'y
    // arrêtent (l'arbre est devant eux, la lumière n'éclaire pas sa face).
    casesArbres() {
      const cols = this.grid.cols;
      if (!this.arbresCases) {
        this.arbresCases = new Set();
        for (const t of this.mapTrees ? this.mapTrees() : []) if (!t.gone) for (const c of t.cells) this.arbresCases.add(c);
      }
      const out = new Set(this.arbresCases);
      for (const e of (this.trees || new Map()).values()) {
        const s = e.sprite, w = s.displayWidth * 0.8;
        for (let y = s.y - s.displayHeight + T / 2; y < s.y; y += T) for (let x = s.x - w / 2 + T / 2; x < s.x + w / 2; x += T) out.add(Math.floor(y / T) * cols + Math.floor(x / T));
      }
      return out;
    },

    // Les lumières des maisons à ajouter à `out` (les lumières du voile) ; `nuit` : V.nuit.
    stepFenetres(out, nuit, dt) {
      const maisons = (this.toits || []).filter((t) => t.maison);
      if (!maisons.length || !this.blocks) { this.fenK = 0; return; }
      textures(this.textures);
      // allumées la nuit, sauf quand tout le foyer dort
      const m = this.ctx.lastModel || {};
      const dort = !!m.dort && (!this.family || this.family.info().every((f) => f.lit));
      const but = nuit > BLOCS_CARTE.lanterne.allume && !dort ? Math.min(1, nuit / 0.4) : 0;
      const k0 = this.fenK || 0, pas = L.vitesse * dt;
      const k = this.fenK = global.CarteKit.reduit() ? but : k0 < but ? Math.min(but, k0 + pas) : Math.max(but, k0 - pas);
      if (k <= 0) return;
      const B = this.blocks, cols = this.grid.cols, Hh = BLOCS_CARTE.hauts, dy = BLOCS_CARTE.etage.dy;
      const mur = (c) => { const e = B.get(c); return !!e && e.img.texture.key === Hh.key; };
      let arbres = null;
      for (const t of maisons) {
        // (le dedans ne se voit que quand le toit s'efface)
        const ouvert = k * (1 - t.img.alpha);
        if (ouvert > 0.01) {
          const P = L.piece;
          for (const c of t.dedans) {
            if (mur(c)) continue;
            // (unie, sur ce qu'on voit de la case : un mur haut une ou deux rangées plus bas en
            // cache le bas, sa face et son dessus, où la lumière du dedans ne va pas)
            const y0 = Math.floor(c / cols) * T;
            let y1 = y0 + T;
            for (let k = 1; k <= 2; k++) if (mur(c + k * cols)) { y1 = Math.min(y1, y0 + (k + 1) * T - Hh.frame.frameHeight); break; }
            if (y1 > y0) out.push({ key: 'lumiere_unie', x: (c % cols) * T, y: y0, tint: L.teinte, alpha: P.alpha * ouvert, scaleY: (y1 - y0) / T, originX: 0, originY: 0 });
            // (le mur du fond : sa face, tournée vers la pièce, au-dessus de la case)
            if (mur(c - cols) && t.dedans.has(c - cols)) {
              const M = L.murFond, e = B.get(c - cols);
              out.push({ key: 'lumiere_unie', x: e.x - T / 2, y: e.y, tint: L.teinte, alpha: M.alpha * ouvert, scaleY: M.haut / T, originX: 0, originY: 1 });
            }
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
          // (un rang rehaussé sous l'emprise de l'étage : le mur de l'étage le cache, sa vitre
          // n'est pas vue)
          const sousEtage = !!(this.etageEmprise && this.etageEmprise.has(c));
          const rangs = [e.img, ...(sousEtage ? [] : e.hauts || [])];
          rangs.forEach((img, r) => {
            const vu = r ? img.alpha : 1;
            const a = k * vu * (facade ? 1 : 1 - t.img.alpha);
            if (a <= 0.01) return;
            const V = L.vitre, y0 = e.y - r * dy;
            out.push({ key: 'lueur', x: e.x, y: y0 + V.dy, tint: L.teinte, alpha: V.alpha * a, scaleX: V.rayon / 32, scaleY: (V.rayon * 1.4) / 32 });
          });
          // les rayons (une fois par fenêtre, quels que soient ses rangs) : sur le bas du mur, sous
          // la vitre, puis sur le sol devant la façade, où chaque colonne s'arrête à la première
          // case qui n'est pas du sol vu (un mur, un bâtiment sous son toit) : la lumière ne monte
          // pas sur ce qui est devant
          if (!facade) continue;
          const R = L.rayons;
          if (!arbres) arbres = this.casesArbres();
          out.push({ key: 'rayons_fenetre', frame: 'mur', x: e.x - W / 2, y: e.y - R.mur, tint: L.teinte, alpha: R.alpha * k, originX: 0, originY: 0 });
          for (let dc = -1; dc <= 1; dc++) {
            for (let r = 0; r < R.cases; r++) {
              const k2 = c + (r + 1) * cols + dc;
              if (!this.solVu(k2) || arbres.has(k2)) break;
              out.push({ key: 'rayons_fenetre', frame: `c${dc + 1}_${r}`, x: e.x - T / 2 + dc * T, y: e.y + r * T, tint: L.teinte, alpha: R.alpha * k, originX: 0, originY: 0 });
            }
          }
        }
      }
    },
  });
})(window);
