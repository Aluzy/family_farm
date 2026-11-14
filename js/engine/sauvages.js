import { DATA } from './catalog.js';
import { villageActif } from './village.js';

/* ---------- les plants sauvages de l'île (le chantier « l'île à bâtir », fiche I7e) ----------

   L'île n'a plus de hameau à découvrir : chaque biome a ses plantes à lui, qu'on va chercher loin de la ferme,
   qu'on rapporte et qu'on cultive (data/village.json VILLAGE.SAUVAGES ; docs/ile.md « Une raison d'explorer »).
     - Dans le monde de l'île (celui d'un port), la végétation pose les plants sauvages (monde-vegetation.js : de
       petites plantes de plus, un tirage à elles, après les autres) ; on les ramasse à la main (data/monde.json
       RECOLTE.SORTES : le plant, « plant_<culture> »), comme une fleur des prés.
     - Le plant se repique dans la zone de culture (data/crops.json : la culture marquée `sauvage`, son biome) ; il
       pousse comme les autres et rend, à la récolte, la plante et de nouveaux plants.
     - Sa première récolte l'inscrit au catalogue d'import du port (state.port.sauvages, comme bac.js inscrireSauvage :
       au rang PORT.IMPORT.SAUVAGES.RANG) : on peut ensuite en commander au bac.
   Le jeu d'avant ne pose aucun plant sauvage : ni dans son monde, ni au comptoir (rachetable : false). */

export const SAUVAGES = (DATA.VILLAGE && DATA.VILLAGE.SAUVAGES) || { LOIN: 0, PLANTS: {} };

// Les cultures sauvages : [{ culture, nom, icone, biome, plant (l'objet ramassé et repiqué), sorte (celle du monde) }].
export function culturesSauvages() {
  return Object.entries(SAUVAGES.PLANTS).map(([sorte, d]) => {
    const c = DATA.CULTURES[d.culture];
    return c ? { culture: d.culture, nom: c.nom, icone: c.icone, biome: d.biome, plant: c.graines.item, sorte } : null;
  }).filter(Boolean);
}

// La culture est-elle un plant sauvage de l'île ?
export function estSauvage(culture) {
  return !!(DATA.CULTURES[culture] && DATA.CULTURES[culture].sauvage);
}

// La récolte de la culture `culture` (crops.js harvestPlot) : un plant sauvage récolté pour la première fois sur l'île
// s'inscrit au catalogue d'import du port. → l'objet inscrit (son plant), ou null.
export function recolteSauvage(state, culture) {
  if (!estSauvage(culture) || !villageActif(state)) return null;
  const p = state && state.port;
  if (!p || typeof p !== 'object') return null;
  if (!Array.isArray(p.sauvages)) p.sauvages = [];
  const item = DATA.CULTURES[culture].graines.item;
  if (!DATA.OBJETS[item] || p.sauvages.includes(item)) return null;
  p.sauvages.push(item);
  return item;
}
