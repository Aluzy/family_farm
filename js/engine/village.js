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
import { nouveauxNoms } from './noms.js';
import { nouvelleChronique } from './chronique.js';

// Le dehors d'une partie neuve du chantier (fiche I2, js/engine/dehors.js) : le tronçon du port est à convertir en
// chemins du joueur (le Web Worker du sol le fait, ou dehors.js assurerTroncon dans Node).
export function nouveauDehors() {
  return { troncon: 'a_poser', chemins: [] };
}

// La ferme de la partie est-elle une terre vierge (fiche I7b) ? Le chantier allumé, une partie commencée par le nouveau
// départ (depart-ile.js commencerNouveauDepart pose state.dehors.ferme : 'vierge' ; une partie d'essai d'avant garde le
// chemin peint de sa ferme).
export function fermeVierge(state) {
  return villageActif(state) && !!(state && state.dehors && state.dehors.ferme === 'vierge');
}

// Le port d'une partie neuve du chantier (fiche I1c, js/engine/bac.js : state.port) : son niveau de départ, le dernier
// bac d'avant le jour `jour` compté pour passé (une partie ne rattrape pas les bacs d'avant elle).
export function nouveauPort(jour = 1) {
  const per = Math.max(1, Math.floor(Number(DATA.PORT && DATA.PORT.BAC && DATA.PORT.BAC.PERIODE) || 1));
  const passe = Math.floor((Math.max(1, jour) - 1) / per) * per;
  return { niveau: DATA.PORT.NIVEAU_DEPART, passe, parti: passe, commandes: [], honorees: 0, imports: [], vendu: {}, chantier: {}, sauvages: [], avis: [] };
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
  if (!state.port) state.port = nouveauPort(state.day);
  // (fiche I7g : les noms de l'île, js/engine/noms.js, et sa chronique, js/engine/chronique.js)
  if (!state.noms) state.noms = nouveauxNoms(state);
  if (!state.chronique) state.chronique = nouvelleChronique();
  return commencerPaliers(state);
}

// La partie l'est-elle par l'essai (et non par le réglage) ? (le bandeau de l'essai)
export function essaiVillage(state) {
  return !(DATA.VILLAGE && DATA.VILLAGE.ACTIF === true) && villageActif(state);
}
