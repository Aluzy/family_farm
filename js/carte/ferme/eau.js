/* carte/ferme/eau.js — la scène de la ferme : l'eau vivante (CarteKit.eauVive, js/carte/eau.js).
 *
 * Les étendues d'eau animées de la ferme (sol.js makeTileAnims : une image par étendue, repeinte
 * quand ses tuiles changent d'image, qui appelle alors eauRive), sauf dans un intérieur ; l'heure
 * du modèle ; le personnage et sa famille, qui longent l'eau ; les poissons de la pêche
 * (peche.js fishTexture), qui sautent.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const K = global.CarteKit;
  const { FISHING } = F.C;

  F.partie(Object.assign({}, K.eauVive, {

    eauEtendues() {
      return this.animAreas;
    },

    eauHeure() {
      const m = this.ctx.lastModel;
      return m ? m.heure : null;
    },

    eauMarcheurs() {
      const qui = [];
      const p = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      if (p) qui.push({ id: 'fermier', x: p.x, y: p.y });
      if (this.family) for (const m of this.family.info()) if (m.visible) qui.push({ id: m.id, x: m.x, y: m.y });
      return qui;
    },

    eauRepeint(a) {
      this.paintAnimArea(a);
    },

    eauPoissons() {
      return Object.keys(FISHING.fish).map((id) => this.fishTexture(id)).filter(Boolean);
    },
  }));
})(window);
