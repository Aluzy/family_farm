/* carte/ferme/cueillette.js — la scène de la ferme : ce qu'on ramasse à la main.
 *
 * Sur la ferme générée (docs/carte-generee.md, étape 3), le moteur pose chaque matin des petites
 * pierres, des morceaux de bois et des herbes sur l'herbe (js/engine/atelier.js, ramassables) :
 * le modèle les donne (modèle.ramassables : [{ id, sorte, case }]), chacun a son image
 * (assets/ramassables.png, scripts/carte/ramassables.py), rangée selon son pied. Un appui
 * dessus : le personnage va à côté, se baisse et le prend (le pont : ctx.bridge.ramasser) ; la
 * bulle « +1 » monte et l'image s'efface.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T, RAMASSABLES } = F.C;

  F.partie({

    // Les images de ce qui est à ramasser : celles du modèle, créées ou ôtées.
    syncGatherables(list) {
      if (!this.gatherables) this.gatherables = new Map();
      const G = this.gatherables, seen = new Set();
      if (!this.has(RAMASSABLES.key)) return;
      const cols = this.grid.cols;
      for (const r of list || []) {
        seen.add(r.id);
        if (G.has(r.id)) continue;
        const x = (r.case % cols) * T + T / 2, y = Math.floor(r.case / cols) * T + RAMASSABLES.pied;
        const img = this.add.image(x, y, RAMASSABLES.key, RAMASSABLES.frames[r.sorte] || 0).setOrigin(0.5, 1).setDepth(y);
        G.set(r.id, { id: r.id, sorte: r.sorte, x, y, img, busy: false });
      }
      for (const [id, g] of G) if (!seen.has(id) && !g.busy) { g.img.destroy(); G.delete(id); }
    },

    // Ce qu'il y a à ramasser sous le doigt (un peu plus large que l'image), ou null.
    gatherAt(wx, wy) {
      if (!this.gatherables) return null;
      const r = Math.max(10, (RAMASSABLES.doigt / this.cameras.main.zoom));
      let best = null, bd = Infinity;
      for (const g of this.gatherables.values()) {
        if (g.busy) continue;
        const d = Math.hypot(wx - g.x, wy - (g.y - 6));
        if (d <= r && d < bd) { best = g; bd = d; }
      }
      return best;
    },

    // Le personnage va le prendre : le moteur le met dans l'inventaire au moment du geste.
    gather(g) {
      if (this.ctx.lastModel && this.ctx.lastModel.coucher) return;   // au lit (ou en y allant) : rien
      g.busy = true;
      const prendre = () => {
        const got = this.ctx.bridge && this.ctx.bridge.ramasser ? this.ctx.bridge.ramasser(g.id) : null;
        if (!got || !got.ok) { g.busy = false; return; }
        this.showGain(got.items);
        K.vibre('ramasse');
        this.tweens.add({ targets: g.img, y: g.y - 6, alpha: 0, duration: 260, ease: 'Sine.easeOut', onComplete: () => g.img.destroy() });
        this.gatherables.delete(g.id);
      };
      if (!this.fermier || !this.fermier.gather({ x: g.x, y: g.y }, prendre)) prendre();
    },
  });
})(window);
