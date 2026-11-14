/* carte/ferme/engrais.js — la scène de la ferme : glisser l'engrais sur les cultures arrosées, son scintillement.
 *
 * L'engrais pris en main (js/ui/compost.js engrais-toggle : sa fiche de l'inventaire, la fenêtre du compost), un
 * glissement qui part d'une culture arrosée (modèle.engraissables, seulement l'engrais en main : js/ui/stage.js ;
 * js/engine/compost.js casesEngraissables) marque en violet celles qu'il traverse, comme les cases
 * bleues de l'arrosage (arroseTo, js/farm-stage.js). Au relâchement, chacune scintille l'une après l'autre : des
 * éclats violets et blancs qui jaillissent, montent et s'éteignent, un éclair lilas sur la case ; puis la page
 * met l'engrais (engrais-many, js/ui/compost.js) : la culture gagne un stade, et la carte joue l'éclat vert de la
 * pousse (eclats.js eclatPousse). Avec « animations réduites » : pas d'éclats, l'engrais tout de suite.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T } = F.C;
  const { reducedMotion } = F;

  // COULEUR : le fond et le bord des cases marquées ; ECLATS : par case ; PAS : ms entre deux cases ; DUREE : ms
  // d'un scintillement ; VIOLETS : les éclats (du violet profond au blanc).
  const ENGRAIS = {
    COULEUR: [0x8a4fd8, 0xe2ccff], ECLATS: 12, PAS: 90, DUREE: 560,
    VIOLETS: [0x6034a0, 0x9662de, 0xc49cfa, 0xf0e2ff, 0xffffff],
  };

  F.partie({

    // Un glissement qui part d'une culture où mettre l'engrais : le tracé violet (arroseTo), ou null.
    engraisStart(wx, wy) {
      const m = this.ctx.lastModel;
      if (!m || !m.engraissables || !m.engraissables.length || m.coucher) return null;
      const t = this.tileAtPoint(wx, wy), ok = new Set(m.engraissables);
      if (!ok.has(t)) return null;
      return { ok, tiles: [], seen: new Set(), last: { x: wx, y: wy }, marks: [], couleur: ENGRAIS.COULEUR };
    },

    // Au relâchement : les cases scintillent l'une après l'autre, puis l'engrais est mis (la pousse suit).
    engraisFin(tiles) {
      if (!tiles.length) return;
      const envoyer = () => this.ctx.bridge.act('engrais-many', { cases: tiles.join(',') });
      if (reducedMotion()) { envoyer(); return; }
      const W = this.grid.cols;
      tiles.forEach((t, k) => this.time.delayedCall(k * ENGRAIS.PAS, () => this.scintille((t % W) * T + T / 2, Math.floor(t / W) * T + T / 2)));
      this.time.delayedCall((tiles.length - 1) * ENGRAIS.PAS + ENGRAIS.DUREE * 0.8, envoyer);
    },

    // Le scintillement magique d'une case (son centre, px) : un éclair lilas, des éclats qui jaillissent et montent.
    scintille(x, y) {
      const M = ENGRAIS, P = 1e5 - 1;
      const eclair = this.add.rectangle(x, y, T - 2, T - 2, M.VIOLETS[3], 0.55).setDepth(P);
      this.tweens.add({ targets: eclair, alpha: 0, scale: 1.25, duration: M.DUREE * 0.6, ease: 'Quad.out', onComplete: () => eclair.destroy() });
      for (let k = 0; k < M.ECLATS; k++) {
        const a = (k / M.ECLATS) * Math.PI * 2 + Math.random() * 0.6;
        const r = 3 + Math.random() * 5, haut = 6 + Math.random() * 8;
        const c = M.VIOLETS[1 + Math.floor(Math.random() * (M.VIOLETS.length - 1))];
        const grand = k % 2 === 0;
        // (un éclat : un pixel clair ; les grands, une petite croix de quatre branches)
        const parts = grand
          ? [this.add.rectangle(0, 0, 1, 3, c), this.add.rectangle(0, 0, 3, 1, c), this.add.rectangle(0, 0, 1, 1, M.VIOLETS[4])]
          : [this.add.rectangle(0, 0, 1, 1, c)];
        const g = this.add.container(x + Math.cos(a) * 2, y + Math.sin(a) * 2 + 2, parts).setDepth(P + 0.1).setAlpha(0);
        const retard = Math.random() * M.DUREE * 0.3;
        this.tweens.add({
          targets: g, delay: retard, duration: M.DUREE - retard,
          x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.6 - haut,
          alpha: { from: 1, to: 0 }, ease: 'Cubic.out',
          onComplete: () => g.destroy(),
        });
      }
    },
  });
})(window);
