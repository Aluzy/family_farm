/* carte/ferme/didacticiel.js — la scène de la ferme : ce que le didacticiel montre sur la carte.
 *
 * Le didacticiel d'une nouvelle partie (js/ui/didacticiel.js) désigne ce qu'il faut toucher :
 * dans la page, un anneau autour du bouton ; sur la carte, un cercle doré qui pulse autour des
 * objets (modèle.surbrillance : { ramassables: sorte } les pierres ou le bois à ramasser, les
 * plus proches du personnage ; { blocs: [sortes] } l'Atelier, le puits) ; et les cases où poser
 * l'abri ({ cases: [{ case, sorte }] } : une case allumée qui pulse, dorée pour un mur, blanche
 * pour la porte, verte pour une paillasse).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { reducedMotion } = F;

  // `max` objets entourés au plus (les plus proches du personnage) ; le cercle : `rayon` px de
  // carte (± `pouls` px, `periode` ms), `trait` px, sa couleur.
  const S = { max: 6, rayon: 11, pouls: 2.5, periode: 900, trait: 1.5, couleur: 0xffd23f };
  // Les cases à bâtir : leur couleur selon ce qui s'y pose ; le fond et le bord pulsent.
  const CASES = { mur_bois: 0xffd23f, porte: 0xffffff, paillasse: 0x8be36a, fond: 0.22, bord: 0.55 };
  const { T } = F.C;

  F.partie({

    syncSurbrillance(s) {
      this.surbrillance = s || null;
      if (!this.surbrillanceG) this.surbrillanceG = this.add.graphics().setDepth(1e7);
      if (!s) this.surbrillanceG.clear();
    },

    // Les points à entourer : { x, y } en px de carte.
    pointsSurbrillance() {
      const s = this.surbrillance, out = [];
      if (!s || this.room) return out;
      if (s.blocs && this.blocks) for (const e of this.blocks.values()) if (s.blocs.includes(e.sorte)) out.push({ x: e.x, y: e.y - 8 });
      if (s.ramassables && this.gatherables) {
        for (const g of this.gatherables.values()) if (g.sorte === s.ramassables && !g.busy) out.push({ x: g.x, y: g.y - 5 });
      }
      const p = this.fermier && this.fermier.pos();
      if (p && out.length > S.max) out.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      return out.slice(0, S.max);
    },

    // Chaque image : les cercles pulsent.
    stepSurbrillance(time) {
      const g = this.surbrillanceG;
      if (!g) return;
      g.clear();
      if (!this.surbrillance) return;
      const k = reducedMotion() ? 0.5 : (Math.sin((time / S.periode) * Math.PI * 2) + 1) / 2;
      const r = S.rayon + S.pouls * k;
      if (Array.isArray(this.surbrillance.cases) && !this.room) {
        const cols = this.grid.cols, v = this.cameras.main.worldView;
        for (const q of this.surbrillance.cases) {
          const x = (q.case % cols) * T, y = Math.floor(q.case / cols) * T;
          if (x + T < v.x || x > v.right || y + T < v.y || y > v.bottom) continue;
          const c = CASES[q.sorte] || S.couleur;
          g.fillStyle(c, CASES.fond + 0.18 * k).fillRect(x + 1, y + 1, T - 2, T - 2);
          g.lineStyle(1.5, 0x2a2018, 0.45).strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
          g.lineStyle(1, c, CASES.bord + 0.4 * k).strokeRect(x + 1.5, y + 1.5, T - 3, T - 3);
        }
      }
      for (const q of this.pointsSurbrillance()) {
        g.lineStyle(S.trait + 1.5, 0x2a2018, 0.55).strokeCircle(q.x, q.y, r);
        g.lineStyle(S.trait, S.couleur, 0.65 + 0.35 * k).strokeCircle(q.x, q.y, r);
      }
    },
  });
})(window);
