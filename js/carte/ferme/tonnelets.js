/* carte/ferme/tonnelets.js — la scène de la ferme : le tonnelet en action s'écrase et se relève.
 *
 * Un tonnelet où s'affine une tomme ou fermente un moût (modèle.blocs : { sorte: 'tonnelet', actif: true },
 * js/engine/tonnelets.js) bouge par à-coups, comme une bulle qui monte : il s'écrase un instant vers le sol, puis
 * se relève en s'étirant un peu et revient à sa taille en oscillant. C'est le ressort des bêtes (la poule,
 * js/carte/ressort.js) : une échelle de l'image, aucune image de plus. Le rythme est lent et paisible : un
 * à-coup toutes les TONNELET.PERIODE s (chaque tonnelet décalé des autres). Prêt, il ne bouge plus : une bulle
 * montre son produit (comme la ruche pleine, etiquettes.js). Seulement sur l'écran ; rien avec « animations
 * réduites ».
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const K = global.CarteKit;
  const { reducedMotion } = F;

  // PERIODE : les secondes entre deux à-coups (± ECART, tiré à chaque fois) ; ECRASE, RELEVE : les impulsions
  // du ressort (négative : il s'écrase ; positive : il se relève), RELEVE après APRES s.
  const TONNELET = { PERIODE: 2.6, ECART: 0.6, ECRASE: -2.4, RELEVE: 1.2, APRES: 0.18 };

  F.partie({

    // À chaque image : les tonnelets en action sur l'écran, leur ressort.
    stepTonnelets(dt) {
      if (!this.blocks) return;
      const v = this.cameras.main.worldView, calme = reducedMotion(), M = TONNELET;
      for (const e of this.blocks.values()) {
        if (e.sorte !== 'tonnelet' || !e.img) continue;
        const vue = e.x > v.x - 16 && e.x < v.right + 16 && e.y > v.y - 8 && e.y < v.bottom + 32;
        if (!e.actif || calme || !vue) {
          if (e.ressort) { e.ressort.calme(e.img); e.ressort = null; }
          continue;
        }
        if (!e.ressort) {
          e.ressort = K.ressort();
          e.prochain = 0.4 + ((e.case * 37) % 100) / 100 * M.PERIODE;   // (décalé des autres tonnelets)
          e.releve = -1;
        }
        e.prochain -= dt;
        if (e.prochain <= 0) {
          e.ressort.pousse(M.ECRASE);
          e.releve = M.APRES;
          e.prochain = M.PERIODE + (Math.random() * 2 - 1) * M.ECART;
        }
        if (e.releve >= 0) {
          e.releve -= dt;
          if (e.releve < 0) e.ressort.pousse(M.RELEVE);
        }
        e.ressort.maj(dt, 0).applique(e.img);
      }
    },
  });
})(window);
