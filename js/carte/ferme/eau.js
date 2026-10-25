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

    // (au grand monde, les étangs de la ferme et les blocs d'eau dans la vue : eau-monde.js)
    // Fiche 9a : en qualité « économie » (CarteKit.reglages().merVivante), la mer du grand monde n'a pas
    // d'eau vivante (le shader de la houle, de l'écume et du ressac, le plus cher à dessiner) : ses tuiles
    // animées seulement ; les lacs, les rivières et les étangs gardent la leur. La liste filtrée est
    // gardée tant que la liste d'origine et la qualité ne changent pas (syncEau compare les listes).
    eauEtendues() {
      const l = this.eauListe || this.animAreas;
      if (!this.eauListe || K.reglages().merVivante) return l;
      const f = this.eauSansMer;
      if (f && f.de === l) return f.liste;
      this.eauSansMer = { de: l, liste: l.filter((a) => !a.mer) };
      return this.eauSansMer.liste;
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
