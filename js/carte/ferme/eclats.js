/* carte/ferme/eclats.js — la scène de la ferme : l'éclat de lumière verte d'une graine semée.
 *
 * Quand le personnage sème (semis.js : le jeu a pris la graine), un anneau de lumière vert clair s'élargit sur
 * la terre autour de la graine (aplati : vu de dessus) et s'efface ; trois étincelles vertes montent au passage
 * (DUREE s en tout). Chaque éclat est deux Graphics (l'anneau sur la terre, sous la plante ; les étincelles
 * au-dessus), défaites à la fin. Rien avec « animations réduites ».
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { reducedMotion } = F;

  const ECLAT = {
    DUREE: 0.9, ANNEAU: 0.7, RAYON: [1, 8], APLATI: 0.45, POINTS: 28,
    ETINCELLES: 3, MONTE: 6, DEPART: 0.2, VIE: 0.6,
    // l'anneau (vert clair, un point sur trois blanc), les étincelles (vert, leur cœur plus clair)
    VERT_CLAIR: 0xd2ffaa, BLANC: 0xfffce6, VERT: 0x78dc5a, ALPHA: 0.86,
  };

  F.partie({

    // Une graine semée en (x, y) (le bas du milieu de sa case) : son éclat.
    eclatSemis(x, y) {
      if (reducedMotion()) return;
      const L = this.eclats || (this.eclats = []);
      const sol = this.add.graphics().setDepth(y - 0.5), haut = this.add.graphics().setDepth(y + 0.5);
      // (les étincelles : leur place, de part et d'autre de la graine, et leur départ)
      const et = Array.from({ length: ECLAT.ETINCELLES }, (_, k) => ({ dx: (k - 1) * 3 + (Math.random() - 0.5) * 2, t0: ECLAT.DEPART + k * 0.08, h: ECLAT.MONTE * (0.8 + Math.random() * 0.4) }));
      L.push({ x: Math.round(x), y: Math.round(y) - 2, t: 0, sol, haut, et });
    },

    // À chaque image : les éclats en cours.
    stepEclats(dt) {
      const L = this.eclats;
      if (!L || !L.length) return;
      const E = ECLAT;
      for (let i = L.length - 1; i >= 0; i--) {
        const e = L[i];
        e.t += dt;
        if (e.t >= E.DUREE) { e.sol.destroy(); e.haut.destroy(); L.splice(i, 1); continue; }
        // l'anneau
        const s = e.sol.clear(), u = Math.min(1, e.t / E.ANNEAU);
        if (u < 1) {
          const r = E.RAYON[0] + (E.RAYON[1] - E.RAYON[0]) * u, a = E.ALPHA * (1 - u);
          const vus = new Set();
          for (let k = 0; k < E.POINTS; k++) {
            const ang = (k / E.POINTS) * Math.PI * 2;
            const px = Math.round(Math.cos(ang) * r), py = Math.round(Math.sin(ang) * r * E.APLATI);
            if (vus.has(px + ',' + py)) continue;
            vus.add(px + ',' + py);
            s.fillStyle(k % 3 ? E.VERT_CLAIR : E.BLANC, a).fillRect(e.x + px, e.y + py, 1, 1);
          }
        }
        // les étincelles : une petite croix qui monte et s'éteint
        const h = e.haut.clear();
        for (const p of e.et) {
          const w = (e.t - p.t0) / E.VIE;
          if (w < 0 || w > 1) continue;
          const x = Math.round(e.x + p.dx * 0.6), y = Math.round(e.y - 1 - p.h * w), a = 1 - w;
          h.fillStyle(E.VERT, a);
          h.fillRect(x, y - 1, 1, 1).fillRect(x - 1, y, 1, 1).fillRect(x + 1, y, 1, 1).fillRect(x, y + 1, 1, 1);
          h.fillStyle(E.VERT_CLAIR, a).fillRect(x, y, 1, 1);
        }
      }
    },
  });
})(window);
