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
  };

  F.partie({

    // Y a-t-il de quoi briller près de la vue ? (chantier.js : sans aucune lumière, le voile n'en calcule pas)
    lumineuxVus() {
      for (const o of this.vegListe || []) if (o.nom && LUMINEUX[o.nom]) return true;
      return false;
    },

    // Les lueurs de la nuit (à ajouter à `out`, les lumières du voile ; stepLanterns).
    stepLumineux(out, nuit, time) {
      const on = nuit > BLOCS_CARTE.lanterne.allume ? Math.min(1, (nuit - BLOCS_CARTE.lanterne.allume) / 0.3) : 0;
      if (on <= 0 || !this.vegListe) return;
      const v = this.cameras.main.worldView, calme = global.CarteKit.reduit();
      for (const o of this.vegListe) {
        const L = o.nom && LUMINEUX[o.nom];
        if (!L || !o.img || !o.img.visible) continue;
        if (o.fx < v.x - 48 || o.fx > v.right + 48 || o.fy < v.y - 48 || o.fy > v.bottom + 64) continue;
        const k = on * (calme ? 1 : 0.8 + 0.2 * Math.sin(time / 900 + (o.fx * 13 + o.fy * 7) % 17));
        out.push({ key: 'lueur', x: o.fx, y: o.fy - 2, tint: L.teinte, alpha: L.sol[1] * k, scaleX: L.sol[0] / R, scaleY: (L.sol[0] * 0.7) / R });
        out.push({ key: 'lueur', x: o.fx, y: o.fy - L.coeur[2], tint: L.teinte, alpha: L.coeur[1] * k, scaleX: L.coeur[0] / R, scaleY: L.coeur[0] / R });
      }
    },
  });
})(window);
