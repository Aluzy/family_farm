/* ==========================================================================
   L'aiguillage du récit (fiche I7c, docs/ile.md « Le récit retiré du moteur »).

   Le seul point d'entrée du moteur vers le récit. Deux implémentations d'une même petite interface :
   - js/engine/recit-ancien.js : le jeu publié (le réglage du chantier éteint) ; elle passe aux modules du récit ;
   - js/engine/recit-muet.js : l'île à bâtir (villageActif, js/engine/village.js) ; elle ne lit rien du récit.
   recitPour(state) choisit, en un seul endroit, celle de la partie ; aucun autre module du moteur n'importe le
   récit (tests/engine/village-sans-recit.test.mjs le vérifie par lecture des imports).

   Ce qu'elle porte (les mêmes noms des deux côtés) :
     nouveauRecit(), nouvelleBienvenue()   la partie neuve (state.js) ;
     nuit(state)                           la nuit du récit (night.js : la visite, l'empreinte, la confiance, les toits) ;
     aFait, ageFait, noterFait, premierJourFait, faitNote   les faits ;
     ecrit, relation, ajouterRelation      les personnages écrits (amitie.js, invitations.js) ;
     confiance, ajouterConfiance           la confiance des hameaux (amitie.js, projets.js) ;
     ecritsDuHameau                        les personnages écrits à installer dans un hameau (habitants.js) ;
     nomCocher                             « Achille » ou « le cocher » (caleche.js) ;
     facteurPousse                         la pierre de lune (crops.js) ;
     et ce que la page demande au récit, ré-exporté plus bas sous le même nom que dans le récit : scenesPossibles,
     jouerScene, paroleHameau, toucherLieu, noterVisite, visiteObservatoire, geodeLuit, fermeLuit, ouvrirSecret,
     ateliersDuHameau (la page passe par ici pour tout ce qui ferait paraître du récit ; la fiche I7d retire le reste).
   Les migrations des formats d'avant le chantier lisent le récit d'avant (recitDAvant) : elles ne tournent que sur
   une sauvegarde d'avant le chantier.
   ========================================================================== */

import { villageActif } from './village.js';
import { RECIT_ANCIEN } from './recit-ancien.js';
import { RECIT_MUET } from './recit-muet.js';

// Le récit de la partie : le muet le chantier allumé, sinon l'ancien. `state` peut être null (une partie en
// train de naître : le réglage seul décide).
export function recitPour(state) {
  return villageActif(state) ? RECIT_MUET : RECIT_ANCIEN;
}

// Le récit d'avant, pour les migrations des sauvegardes d'avant le chantier (state.js).
export function recitDAvant() {
  return RECIT_ANCIEN;
}

// La clé d'un membre de hameau qui est un personnage écrit (m.recit), ou null : seul le récit d'avant en installe
// (habitants.js installerEcrits, par ecritsDuHameau) ; un hameau de l'île n'en a pas, m.recit n'y est jamais posé.
export function cleEcrite(m) {
  return m && m.recit && RECIT_ANCIEN.ecrit(null, m.recit) ? m.recit : null;
}

/* ---------- ce que la page demande au récit (mêmes noms, mêmes arguments) ---------- */

export const scenesPossibles = (state, ctx = {}) => recitPour(state).scenesPossibles(state, ctx);
export const jouerScene = (state, id, ctx = {}) => recitPour(state).jouerScene(state, id, ctx);
export const paroleHameau = (state, hameauId, membreId, o = {}) => recitPour(state).paroleHameau(state, hameauId, membreId, o);
export const toucherLieu = (state, sorte, ctx = {}) => recitPour(state).toucherLieu(state, sorte, ctx);
export const noterVisite = (state, garanti) => recitPour(state).noterVisite(state, garanti);
export const visiteObservatoire = (state) => recitPour(state).visiteObservatoire(state);
export const geodeLuit = (state) => recitPour(state).geodeLuit(state);
export const fermeLuit = (state) => recitPour(state).fermeLuit(state);
export const ouvrirSecret = (state, l) => recitPour(state).ouvrirSecret(state, l);
export const ateliersDuHameau = (state, hameauId) => recitPour(state).ateliersDuHameau(state, hameauId);
