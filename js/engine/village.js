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
import { commencerPaliers } from './paliers.js';

// Le dehors d'une partie neuve du chantier (fiche I2, js/engine/dehors.js) : le tronçon du port est à convertir en
// chemins du joueur (le Web Worker du sol le fait, ou dehors.js assurerTroncon dans Node).
export function nouveauDehors() {
  return { troncon: 'a_poser', chemins: [] };
}

// Le chantier est-il allumé pour cette partie ?
export function villageActif(state) {
  if (DATA.VILLAGE && DATA.VILLAGE.ACTIF === true) return true;
  return !!(state && state.essais && state.essais.village === true);
}

// L'essai : la partie (neuve) devient une partie d'essai du chantier ; elle suit les paliers de l'île
// (paliers.js, fiche I7a : state.palier).
export function allumerEssaiVillage(state) {
  state.essais = { ...(state.essais || {}), village: true };
  if (!state.dehors) state.dehors = nouveauDehors();
  return commencerPaliers(state);
}

// La partie l'est-elle par l'essai (et non par le réglage) ? (le bandeau de l'essai)
export function essaiVillage(state) {
  return !(DATA.VILLAGE && DATA.VILLAGE.ACTIF === true) && villageActif(state);
}
