/* carte/ferme/miel.js — la scène de la ferme : une goutte de miel tombe des ruches pleines.
 *
 * Sous la caisse d'une ruche pleine (son image ruche_pleine), une goutte dorée se forme lentement (un pixel,
 * puis deux, un reflet clair sur elle), s'étire, se détache, tombe et s'écrase en une petite tache qui s'efface.
 * Chaque ruche a son rythme : la goutte suivante vient ENTRE[0] à ENTRE[1] s après (tirées à chaque fois), la
 * première à un moment tiré aussi, jamais à moins de ECART s de la prochaine goutte d'une autre ruche (le
 * tirage est refait) : deux ruches ne gouttent pas ensemble. Seulement les ruches sur
 * l'écran ; rien avec « animations réduites ». Les ruches pleines sont relevées avec qui marche (traces.js,
 * releveMarcheurs, une fois par seconde) ; toutes leurs gouttes sont dessinées dans une seule Graphics par ruche.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { reducedMotion } = F;

  const MIEL = {
    ENTRE: [4, 9], ECART: 0.8,
    // la goutte : sous la caisse, à DX px à droite du milieu, à HAUT px au-dessus du pied de la ruche
    DX: 4, HAUT: 4,
    // ses temps (s) : un pixel, puis deux (le reflet), étirée, sa chute, la tache
    UN: 0.4, DEUX: 1.3, ETIREE: 1.55, TOMBE: 1.8, TACHE: 2.4,
    MIEL: 0xe8a020, CLAIR: 0xfcce54, SOMBRE: 0xb06810, REFLET: 0xfff8d2,
  };

  // Le temps (négatif : dans combien de s) de la prochaine goutte d'une ruche, à plus de ECART s de celle des
  // autres ruches `L` (au plus quelques essais).
  function prochaine(L, moi) {
    let t = 0;
    for (let essai = 0; essai < 6; essai++) {
      t = -(MIEL.ENTRE[0] + Math.random() * (MIEL.ENTRE[1] - MIEL.ENTRE[0]));
      if (!L.some((r) => r !== moi && r.mielEtat && Math.abs(r.mielEtat.t - t) < MIEL.ECART)) break;
    }
    return t;
  }

  F.partie({

    // À chaque image : chaque ruche pleine sur l'écran, sa goutte.
    stepMiel(time, dt) {
      const L = this.ruchesVues;
      if (!L) return;
      const v = this.cameras.main.worldView, M = MIEL, calme = reducedMotion();
      for (const r of L) {
        const e = r.mielEtat || (r.mielEtat = { t: prochaine(L, r), g: null });
        const vue = r.active && r.visible && r.x > v.x - 16 && r.x < v.right + 16 && r.y > v.y - 8 && r.y < v.bottom + 32;
        if (calme || !vue) { if (e.g) e.g.setVisible(false); continue; }
        e.t += dt;
        if (e.t < 0) { if (e.g) e.g.setVisible(false); continue; }
        if (e.t >= M.TACHE) {
          // (la suivante : dans ENTRE s)
          e.t = prochaine(L, r);
          if (e.g) e.g.setVisible(false);
          continue;
        }
        if (!e.g) e.g = this.add.graphics();
        const g = e.g.clear().setVisible(true).setDepth(r.y + 0.1);
        const x = Math.round(r.x) + M.DX, y0 = Math.round(r.y) - M.HAUT, sol = Math.round(r.y), t = e.t;
        const px = (yy, c, a = 1) => g.fillStyle(c, a).fillRect(x, yy, 1, 1);
        if (t < M.UN) px(y0, M.MIEL);
        else if (t < M.DEUX) { px(y0, M.REFLET); px(y0 + 1, M.SOMBRE); }
        else if (t < M.ETIREE) { px(y0, M.CLAIR); px(y0 + 1, M.MIEL); px(y0 + 2, M.SOMBRE); }
        else if (t < M.TOMBE) {
          // (elle tombe, de plus en plus vite)
          const u = (t - M.ETIREE) / (M.TOMBE - M.ETIREE), yy = Math.round(y0 + 1 + (sol - y0 - 2) * u * u);
          px(yy, M.CLAIR); px(yy + 1, M.SOMBRE);
        } else {
          // la tache, qui s'efface
          const a = 1 - (t - M.TOMBE) / (M.TACHE - M.TOMBE);
          g.fillStyle(M.SOMBRE, a).fillRect(x - 1, sol, 1, 1).fillRect(x + 1, sol, 1, 1);
          g.fillStyle(M.MIEL, a).fillRect(x, sol, 1, 1);
        }
      }
    },
  });
})(window);
