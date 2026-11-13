/* ==========================================================================
   L'île sans récit, vue du moteur (fiche I7c, docs/ile.md « Le récit retiré du moteur »).

   L'une des deux implémentations de la petite interface que js/engine/recit-aiguillage.js choisit pour une
   partie : celle-ci sert le chantier allumé (villageActif). Mêmes noms que js/engine/recit-ancien.js ; rien
   n'y lit le récit (ni data/recit.json, ni les secrets, ni les ateliers des hameaux, ni la visite) :
   - aucune scène, aucune réplique, aucun lieu qui parle, aucun secret, aucun atelier de personnage ;
   - aucun fait noté, aucune relation, aucune confiance des hameaux (ce qu'elle débloquait passe aux paliers de
     l'île, paliers.js, et aux niveaux du port, bac.js : docs/ile.md) ;
   - la nuit ne fait rien du récit (ni empreinte, ni dérive, ni toits usés, ni plat de bienvenue posé) ;
   - la partie neuve a un récit vide, que rien n'écrit (la page d'avant le lit encore jusqu'à la fiche I7d : le
     format de sauvegarde ne change pas), et sa visite de bienvenue déjà faite (il n'y en a pas sur l'île).
   Ce qui parle encore, c'est ce qui n'est pas du récit : un habitant de hameau dit sa phrase (habitants.js,
   jusqu'à la fiche I7e, qui retire les hameaux).
   ========================================================================== */

import { fail } from './devices.js';
import { paroleHabitant } from './habitants.js';
import { noterObjectif } from './objectifs-compte.js';

const RIEN = 'Pas de récit sur l\'île.';

export const RECIT_MUET = Object.freeze({
  nom: 'muet',

  /* -- la partie neuve, la nuit -- */
  nouveauRecit: () => ({ faits: {}, relations: {}, confiance: {}, dites: {}, carnet: [], promesses: {} }),
  nouvelleBienvenue: () => ({ etat: 'faite', qui: null, plat: null, remis: null, jour: null }),
  nuit: () => {},

  /* -- les faits : aucun -- */
  aFait: () => false,
  ageFait: () => null,
  noterFait: () => false,
  premierJourFait: (state) => state.day,
  faitNote: () => false,

  /* -- ni personnage écrit, ni relation, ni confiance -- */
  ecrit: () => false,
  relation: () => 0,
  ajouterRelation: () => fail(RIEN),
  confiance: () => 0,
  ajouterConfiance: () => fail(RIEN),
  ecritsDuHameau: () => [],
  nomCocher: (state, majuscule = true) => (majuscule ? 'Le cocher' : 'le cocher'),

  /* -- pas de pierre de lune : la pousse de toujours (les effets de la lune restent : crops.js, LUNE) -- */
  facteurPousse: () => 1,

  /* -- ce que la page demande au récit : rien à lire -- */
  scenesPossibles: () => [],
  jouerScene: () => fail(RIEN),
  // (un habitant d'un hameau dit sa phrase de tous les jours, sans salut du récit ; parler compte pour les objectifs)
  paroleHameau: (state, hameauId, membreId, o = {}) => {
    noterObjectif(state, 'parler');
    return paroleHabitant(state, hameauId, membreId, o);
  },
  toucherLieu: () => null,
  noterVisite: () => false,
  visiteObservatoire: () => null,
  geodeLuit: () => false,
  fermeLuit: () => false,
  ouvrirSecret: () => null,
  ateliersDuHameau: () => [],
});
