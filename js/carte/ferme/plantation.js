/* carte/ferme/plantation.js — la scène de la ferme : planter un arbre depuis l'Inventaire.
 *
 * Une graine d'arbre ou un jeune arbre fruitier choisi dans l'Inventaire (« Planter »,
 * js/ui/plantation.js) : les cases où il peut aller, autour du personnage, sont en surbrillance
 * (modèle.plantation = { cases }) ; un appui sur une case la propose à la page
 * (ctx.bridge.act('arbre-case')), qui demande confirmation et plante.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { reducedMotion } = F;
  const { T } = F.C;

  // La case : un carré vert clair (`fond`), son bord qui pulse (`periode` ms).
  const P = { fond: 0x9be27a, fondAlpha: 0.28, bord: 0xe8ffd0, periode: 1000 };

  F.partie({

    syncPlantation(p) {
      this.plantation = p && Array.isArray(p.cases) ? p : null;
      if (!this.plantationG) this.plantationG = this.add.graphics().setDepth(5e6);
      if (!this.plantation) this.plantationG.clear();
    },

    // Chaque image : les cases en surbrillance (seulement celles qu'on voit).
    stepPlantation(time) {
      const g = this.plantationG;
      if (!g) return;
      g.clear();
      if (!this.plantation || this.room) return;
      const cols = this.grid.cols, v = this.cameras.main.worldView;
      const k = reducedMotion() ? 0.5 : (Math.sin((time / P.periode) * Math.PI * 2) + 1) / 2;
      for (const c of this.plantation.cases) {
        const x = (c % cols) * T, y = Math.floor(c / cols) * T;
        if (x + T < v.x || x > v.right || y + T < v.y || y > v.bottom) continue;
        g.fillStyle(P.fond, P.fondAlpha + 0.12 * k).fillRect(x + 1, y + 1, T - 2, T - 2);
        g.lineStyle(1, P.bord, 0.5 + 0.4 * k).strokeRect(x + 1.5, y + 1.5, T - 3, T - 3);
      }
    },

    // La case du personnage (son numéro), ou -1.
    persoCase() {
      const p = this.fermier && !this.room ? this.fermier.pos() : null;
      return p ? this.tileAtPoint(p.x, p.y - 1) : -1;
    },
  });
})(window);
