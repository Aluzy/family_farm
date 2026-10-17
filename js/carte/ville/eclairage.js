/* carte/ville/eclairage.js — la scène de la ville : les réverbères et les phares, la nuit.
 *
 * Sur les cartes où le jour et la nuit passent (la ville, la carte de transition, la montagne,
 * la plage), le voile de l'heure (CarteKit.voile, js/carte/lumiere.js) devient une carte de
 * lumière où s'ajoutent :
 *   - les réverbères (couche d'objets « lumieres » de la carte : la vitre de leur lanterne,
 *     scripts/ville/objets.py) : allumés le soir, un peu l'un après l'autre (ils clignotent un
 *     instant en s'allumant), éteints au matin ; une flaque de lumière chaude sur le trottoir,
 *     sous la lanterne, et la lanterne elle-même ; un petit halo par-dessus la nuit (WebGL) ;
 *   - les voitures et le bus de l'école : deux phares devant (un cône de lumière sur la
 *     chaussée, dans le sens où elles roulent) et deux feux rouges derrière.
 * Les réglages : CarteVille.C.ECLAIRAGE (js/carte/ville/config.js).
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const V = global.CarteVille;
  const { VOL, KY, ECLAIRAGE } = V.C;
  const { reduced } = V;

  // Les taches de lumière : `lueur`, un disque blanc qui s'estompe vers son bord (32 px de
  // rayon) ; `phare`, un cône blanc qui part de son bord gauche (au milieu) vers la droite.
  const R = 32;
  function textures(scene) {
    const T = scene.textures;
    if (!T.exists('lueur')) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 2 * R;
      const g = cv.getContext('2d');
      const grad = g.createRadialGradient(R, R, 0, R, R, R);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.45, 'rgba(255,255,255,0.55)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 2 * R, 2 * R);
      T.addCanvas('lueur', cv);
    }
    if (!T.exists('phare')) {
      const L = 64, H = 40;
      const cv = document.createElement('canvas');
      cv.width = L; cv.height = H;
      const g = cv.getContext('2d');
      const grad = g.createRadialGradient(0, H / 2, 0, 0, H / 2, L);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.45)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(0, H / 2 - 2); g.lineTo(L, 0); g.lineTo(L, H); g.lineTo(0, H / 2 + 2);
      g.closePath();
      g.fill();
      T.addCanvas('phare', cv);
    }
  }

  // Le réverbère i est-il allumé à l'heure h (0 à 24) ? Chacun a son petit décalage (le soir,
  // les uns après les autres ; le matin aussi).
  function allume(h, d) {
    const E = ECLAIRAGE.reverbere;
    return h >= E.allume + d || h < E.eteint + d;
  }

  V.partie({

    // ---------- les réverbères et les phares, la nuit ----------

    makeLighting(lumieres) {
      this.lampes = [];
      if (!this.voile) return;
      textures(this);
      const E = ECLAIRAGE.reverbere, Ph = global.Phaser;
      const webgl = this.sys.renderer.type === Ph.WEBGL;
      this.lampes = lumieres.map((o, i) => ({
        x: o.x, y: o.y,
        d: (((i * 7919) % 97) / 97) * E.decalage,       // le décalage de chacun, toujours le même
        a: 0, flicker: 0,
        halo: webgl ? this.add.pointlight(o.x, o.y, E.halo.couleur, E.halo.rayon, E.halo.intensite, E.halo.attenuation).setDepth(VOL - 0.5).setVisible(false) : null,
      }));
      this.lumieresNuit = [];
      this.voile.eclaire(() => this.lumieresNuit);
    },

    // À chaque image : qui est allumé, et la liste des taches de lumière à poser dans le voile.
    stepLighting(dt) {
      if (!this.voile || !this.lampes) return;
      const out = this.lumieresNuit;
      out.length = 0;
      const nuit = this.voile.nuit;
      if (nuit <= 0) { for (const l of this.lampes) if (l.halo) l.halo.setVisible(false); return; }
      const h = this.heure ? this.heure.heure : null;
      const E = ECLAIRAGE.reverbere, calme = reduced();
      for (const l of this.lampes) {
        const on = h != null && allume(h, l.d);
        if (on && l.a === 0 && !calme) l.flicker = E.clignote;      // il vient de s'allumer
        l.a = on ? Math.min(1, l.a + dt / E.fondu) : Math.max(0, l.a - dt / E.fondu);
        let k = l.a;
        if (l.flicker > 0) { l.flicker -= dt; if (Math.random() < 0.45) k *= 0.25; }
        if (l.halo) l.halo.setVisible(k > 0).setAlpha(k * nuit);
        if (k <= 0) continue;
        const S = E.sol, Lt = E.lanterne;
        out.push({ key: 'lueur', x: l.x, y: l.y + S.dy, tint: S.teinte, alpha: S.alpha * k, scaleX: S.rayon / R, scaleY: (S.rayon * S.aplati) / R });
        out.push({ key: 'lueur', x: l.x, y: l.y, tint: Lt.teinte, alpha: Lt.alpha * k, scaleX: Lt.rayon / R, scaleY: Lt.rayon / R });
      }
      // les phares et les feux arrière (les voitures roulent dans le sens dx, dy « au sol » :
      // à l'écran, dy est aplati de KY)
      const P = ECLAIRAGE.phare;
      for (const car of this.cars || []) {
        const sx = car.dx, sy = car.dy * KY, l = Math.hypot(sx, sy) || 1;
        const ux = sx / l, uy = sy / l, rot = Math.atan2(uy, ux);
        // (le bout avant et le bout arrière : vers le haut de l'écran, le toit dépasse)
        const [cote, bas, haut] = P.bout, ax = Math.abs(ux), ay = Math.abs(uy);
        const avant = cote * ax + (uy < 0 ? haut : bas) * ay, arriere = cote * ax + (uy < 0 ? bas : haut) * ay;
        for (const c of [-1, 1]) {
          const ox = -uy * P.ecart * c, oy = ux * P.ecart * c;
          out.push({ key: 'phare', x: car.x + ux * avant + ox, y: car.y - P.haut + uy * avant + oy, tint: P.teinte, alpha: P.alpha * nuit, scaleX: P.portee / 64, scaleY: P.largeur / 40, rotation: rot, originX: 0, originY: 0.5 });
          out.push({ key: 'lueur', x: car.x - ux * arriere + ox, y: car.y - P.haut - uy * arriere + oy, tint: P.feu.teinte, alpha: P.feu.alpha * nuit, scaleX: P.feu.rayon / R, scaleY: P.feu.rayon / R });
        }
      }
    },
  });
})(window);
