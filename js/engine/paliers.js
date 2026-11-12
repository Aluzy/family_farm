/* ==========================================================================
   Les paliers de l'île (le chantier « l'île à bâtir », docs/ile.md, fiche I7a).
   Avec le réglage allumé (villageActif, js/engine/village.js), les sept chapitres de la campagne
   deviennent sept paliers de l'île (data/village.json, VILLAGE.PALIERS) : des objectifs courts et une
   récompense, sans introduction ni personnage. La mécanique reste celle des chapitres (campaign.js :
   chapterProgress, updateChapters, completeChapter) : le palier n tient la place du chapitre n, et ce qui
   s'y accroche (les points de technologie, l'XP, les paliers de l'arbre, les plans) tombe comme avant.

   La partie : state.palier, le numéro du palier en cours (1 à 7 : la forme de state.campagne.chapitre,
   que campaign.js tient égal) ; il n'existe que dans une partie neuve faite le réglage allumé (ou une
   partie d'essai, allumerEssaiVillage). Une partie d'avant n'en a pas : elle garde ses chapitres, même le
   réglage allumé, jusqu'à sa migration (fiche I7f). Les compteurs restent ceux de state.campagne.

   Les objectifs du chantier (OBJECTIFS_ILE) lisent l'état de façon défensive : un champ absent compte 0.
   Ils attendent des fiches suivantes :
   - ventesPort : state.campagne.compteurs.ventesPort, les pièces gagnées en vendant au port (I1b :
     bumpCounter(state, 'ventesPort', gain), comme calecheVentes pour la calèche) ;
   - portNiveau : state.port.niveau, le niveau du port, 1 à 5 (I1c) ;
   - villageois : state.villageois, les villageois installés, ceux qui ont une maison (v.maison non
     nul : I3a) ;
   - taches : les villageois de state.villageois qui ont une tâche attribuée (v.tache non nul : I3c) ;
   - commerces : state.commerces, les commerces ouverts (un tableau ou un objet de commerces ; un
     commerce marqué ouvert: false ne compte pas : I5a) ;
   - amitieVillageois : les villageois de state.villageois au palier d'amitié `palier` ou plus,
     palierAmitie(state, v.id) d'amitie.js (state.amitie.pnj[v.id] : I6a).
   ========================================================================== */

import { DATA } from './catalog.js';
import { villageActif } from './village.js';
import { palierAmitie } from './amitie.js';

const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const entier = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : 0);

// La partie suit-elle les paliers de l'île (et non les chapitres) ?
export function paliersSuivis(state) {
  return !!state && Number.isInteger(state.palier) && villageActif(state) && Array.isArray(DATA.VILLAGE && DATA.VILLAGE.PALIERS);
}

// La liste que la partie suit : les paliers de l'île, ou les chapitres de la campagne.
export function listeDesChapitres(state) {
  return paliersSuivis(state) ? DATA.VILLAGE.PALIERS : DATA.CHAPITRES.liste;
}

// Une partie neuve, le réglage allumé : elle commence au premier palier. (Une partie déjà commencée, ou
// faite pour réparer une sauvegarde, n'est pas touchée.)
export function commencerPaliers(state) {
  const c = state && state.campagne;
  if (!c || c.fini || c.chapitre !== 1 || (c.annonces && c.annonces.length) || 'palier' in state) return state;
  state.palier = 1;
  return state;
}

// Les villageois de la partie (I3a : state.villageois), sans ce qui n'en est pas un.
function villageoisDeLaPartie(state) {
  return Array.isArray(state.villageois) ? state.villageois.filter(objet) : [];
}
const present = (v) => v !== null && v !== undefined && v !== false && v !== '';

// Les commerces ouverts (I5a : state.commerces, tableau ou objet).
function commercesOuverts(state) {
  const C = state.commerces;
  const liste = Array.isArray(C) ? C : objet(C) ? Object.values(C) : [];
  return liste.filter((x) => objet(x) && x.ouvert !== false).length;
}

// Le compte de chaque objectif du chantier : (state, objectif) → un entier ≥ 0.
const COMPTES = {
  ventesPort: (state) => entier(state.campagne && state.campagne.compteurs && state.campagne.compteurs.ventesPort),
  portNiveau: (state) => entier(objet(state.port) ? state.port.niveau : 0),
  villageois: (state) => villageoisDeLaPartie(state).filter((v) => present(v.maison)).length,
  taches: (state) => villageoisDeLaPartie(state).filter((v) => present(v.tache)).length,
  commerces: (state) => commercesOuverts(state),
  amitieVillageois: (state, o) => {
    if (!objet(state.amitie)) return 0;
    const palier = entier(o.palier);
    return villageoisDeLaPartie(state).filter((v) => present(v.id) && palierAmitie(state, v.id) >= palier).length;
  },
};
export const OBJECTIFS_ILE = Object.keys(COMPTES);

// Le compte d'un objectif du chantier, ou null si ce n'en est pas un (campaign.js compte les autres).
export function compterObjectifIle(state, o) {
  const f = o && COMPTES[o.type];
  return f ? f(state, o) : null;
}
