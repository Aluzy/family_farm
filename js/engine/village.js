/* ==========================================================================
   Le réglage de bascule du chantier « l'île à bâtir » (docs/ile.md, fiche I0a).
   Tout le code du chantier demande villageActif(state) avant de se montrer :
   - DATA.VILLAGE.ACTIF (data/village.json) : false tant que le chantier dure, le
     jeu publié ne change pas ; la fiche I9h le passe à true ;
   - state.essais.village : une partie d'essai (jeu.html?village=1, js/ui/village.js)
     l'allume pour elle seule ; le jeu publié ne le pose jamais, et une partie
     d'avant n'est pas touchée.
   ========================================================================== */

import { DATA } from './catalog.js';

// Le chantier est-il allumé pour cette partie ?
export function villageActif(state) {
  if (DATA.VILLAGE && DATA.VILLAGE.ACTIF === true) return true;
  return !!(state && state.essais && state.essais.village === true);
}

// L'essai : la partie (neuve) devient une partie d'essai du chantier.
export function allumerEssaiVillage(state) {
  state.essais = { ...(state.essais || {}), village: true };
  return state;
}

// La partie l'est-elle par l'essai (et non par le réglage) ? (le bandeau de l'essai)
export function essaiVillage(state) {
  return !(DATA.VILLAGE && DATA.VILLAGE.ACTIF === true) && villageActif(state);
}
