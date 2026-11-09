/* carte/ferme/bacs.js — la scène de la ferme : les bacs à fleurs (js/engine/bacs.js ; leurs images : BACS,
 * dessinées comme un meuble par chantier.js).
 *
 *   - bacAt(wx, wy) : le bac posé sous le doigt (appelé par hitAt), sa case d'ancrage, ou -1 ;
 *   - bacTouche(c) : un appui sur lui. La page décide (ctx.bridge.bacTouche, js/ui/bacs.js) : vide, la fenêtre
 *     « Semer » ; en train de pousser, une bulle au-dessus ; en fleurs, le personnage y va et les coupe à la faux
 *     (un geste de la file, comme une touffe d'herbe haute : ctx.bridge.bacRecolter à l'arrivée), les fleurs
 *     coupées s'envolent vers l'inventaire.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T } = F.C;
  const BACS = new Set(['bac_rond', 'bac_carre', 'bac_long']);

  F.partie({

    bacAt(wx, wy) {
      if (!this.blocSousLeDoigt) return -1;
      const e = this.blocSousLeDoigt(wx, wy, BACS);
      return e ? e.case : -1;
    },

    bacTouche(c) {
      const bridge = this.ctx.bridge;
      if (!bridge || !bridge.bacTouche || (this.ctx.lastModel && this.ctx.lastModel.coucher)) return;
      const e = this.blocks && this.blocks.get(c);
      if (!e) return;
      const r = bridge.bacTouche(c);
      if (!r) return;
      if (r.bulle) { if (this.showCaseTip) this.showCaseTip(r.bulle, e.x, e.y - 22); return; }
      if (!r.faucher) return;
      const pied = { x: e.x, y: Math.round(e.y) - 2 };
      let got = null;
      const coup = () => {
        K.vibre('pioche');
        if (global.FermeSon) global.FermeSon.joue('faux', { x: pied.x, y: pied.y, ecart: 0 });
        // (les fleurs coupées : le bac secoué, ce qu'il donne affiché au-dessus)
        if (e.img && e.img.active) this.tweens.add({ targets: e.img, scaleY: 0.94, duration: 90, yoyo: true });
        if (got && got.items && this.showCaseTip && bridge.icone) {
          this.showCaseTip(Object.entries(got.items).map(([it, n]) => `+${n} ${bridge.icone(it)}`).join(' '), e.x, e.y - 22);
        }
      };
      this.geste({
        cle: 'bac:' + c, seul: true, action: 'faucher', images: () => (e.img ? [e.img] : []),
        valide: () => !!(this.blocks && this.blocks.get(c)),
        faire: () => {
          got = bridge.bacRecolter ? bridge.bacRecolter(c) : null;
          return !!got;
        },
        coup,
        lance: (opts) => !!this.fermier && !!this.fermier.scythe && this.fermier.scythe(pied, coup, opts),
      });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
