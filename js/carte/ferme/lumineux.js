/* carte/ferme/lumineux.js — la scène de la ferme : ce qui brille la nuit dans le grand monde.
 *
 * Les champignons lumineux des forêts et les cristaux de quartz et d'améthyste des montagnes (data/monde.json :
 * VEGETATION champignons_lumineux, ROCHES cristaux_quartz, cristaux_amethyste ; dessins : scripts/carte/lumineux.py ;
 * docs/gisements.md, lot 2) ne brillent que la nuit : quand le voile de la nuit tombe (au même seuil que les
 * lanternes, BLOCS_CARTE.lanterne.allume), chacun de ceux qui ont leur image près de la vue (vegetation.js,
 * vegListe ; pas ceux qui sont pris) pose dans le voile une lueur de sa couleur : une large, au sol, et une petite,
 * vive, sur lui. Elle respire lentement, chacun à son rythme (rien avec « animations réduites »). Le jour, rien.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype ; chantier.js (stepLanterns) les
 * appelle avec les autres lumières du voile.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { BLOCS_CARTE } = F.C;
  const R = 32;   // le rayon de l'image « lueur » (chantier.js)

  // Par sorte : la teinte, la lueur au sol (rayon px, alpha), le cœur (rayon, alpha, px au-dessus du pied).
  const LUMINEUX = {
    champignons_lumineux: { teinte: 0x8ff5e0, sol: [30, 0.8], coeur: [12, 0.95, 6] },
    cristaux_quartz: { teinte: 0xd4e8ff, sol: [24, 0.5], coeur: [10, 0.7, 8] },
    cristaux_amethyste: { teinte: 0xc48cff, sol: [26, 0.6], coeur: [11, 0.8, 8] },
    // (l'amas d'améthyste du récit, un lieu dessiné : plus grand ; les nuits de pleine lune, tant que la pierre de
    // lune y dort, sa lueur grandit et pâlit, modèle.geodeLuit)
    geode: { teinte: 0xb47cff, sol: [52, 0.75], coeur: [22, 0.85, 22], lune: 0xcaa6ff },
  };

  F.partie({

    // Y a-t-il de quoi briller près de la vue ? (chantier.js : sans aucune lumière, le voile n'en calcule pas)
    lumineuxVus() {
      for (const o of this.vegListe || []) if (LUMINEUX[o.nom || o.lieuNom]) return true;
      return false;
    },

    // Les lueurs de la nuit (à ajouter à `out`, les lumières du voile ; stepLanterns).
    stepLumineux(out, nuit, time) {
      const on = nuit > BLOCS_CARTE.lanterne.allume ? Math.min(1, (nuit - BLOCS_CARTE.lanterne.allume) / 0.3) : 0;
      if (on <= 0 || !this.vegListe) return;
      const v = this.cameras.main.worldView, calme = global.CarteKit.reduit();
      const pleine = !!(this.ctx.lastModel && this.ctx.lastModel.geodeLuit);
      for (const o of this.vegListe) {
        const nom = o.nom || o.lieuNom, L = LUMINEUX[nom];
        if (!L || !o.img || !o.img.visible) continue;
        // (un lieu dessiné n'a pas son pied à part : le bas du milieu de son image)
        const fx = o.fx !== undefined ? o.fx : o.x + o.w / 2, fy = o.fy !== undefined ? o.fy : o.y + o.h;
        if (fx < v.x - 96 || fx > v.right + 96 || fy < v.y - 96 || fy > v.bottom + 96) continue;
        const fort = nom === 'geode' && pleine ? 1.5 : 1, teinte = fort > 1 ? L.lune : L.teinte;
        const k = on * (calme ? 1 : 0.8 + 0.2 * Math.sin(time / (fort > 1 ? 500 : 900) + (fx * 13 + fy * 7) % 17));
        out.push({ key: 'lueur', x: fx, y: fy - 2, tint: teinte, alpha: Math.min(1, L.sol[1] * k * fort), scaleX: (L.sol[0] * fort) / R, scaleY: (L.sol[0] * fort * 0.7) / R });
        out.push({ key: 'lueur', x: fx, y: fy - L.coeur[2], tint: teinte, alpha: Math.min(1, L.coeur[1] * k * fort), scaleX: (L.coeur[0] * fort) / R, scaleY: (L.coeur[0] * fort) / R });
      }
    },
  });
})(window);
