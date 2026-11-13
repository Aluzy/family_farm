/* ==========================================================================
   Le récit d'avant, vu du moteur (fiche I7c, docs/ile.md « Le récit retiré du moteur »).

   L'une des deux implémentations de la petite interface que js/engine/recit-aiguillage.js choisit pour une
   partie : celle-ci est le jeu publié, réglage du chantier éteint. Elle ne fait que passer aux modules du
   récit (recit.js, fil-lune.js, secrets.js, ile.js, bienvenue.js ; usure.js par recitNuit), tels quels : le
   jeu d'avant ne bouge pas d'un octet. L'autre, js/engine/recit-muet.js, a les mêmes noms et ne lit rien du
   récit.

   C'est le seul module du moteur (avec l'index, qui les ré-exporte pour la page, et les modules du récit
   eux-mêmes) qui importe le récit : tests/engine/village-sans-recit.test.mjs le vérifie. Seul l'aiguillage
   l'importe. Les fonctions sont enveloppées (et non reprises telles quelles) pour qu'aucun import ne soit lu
   pendant l'évaluation du module : le moteur a des imports en boucle (recit.js lit campaign.js, qui lit
   l'aiguillage, qui lit ce module).
   ========================================================================== */

import { DATA } from './catalog.js';
import {
  acteEnCours, aFait, ageFait, ajouterConfiance, ajouterRelation, carnet, confiance, jouerScene, livrerPromesse, nomCocher,
  noterFait, noterVisite, nouveauRecit, ouvrirEnveloppe, parler, paroleHameau, promesses, recitNuit, relation,
  scenesPossibles, toucherLieu,
} from './recit.js';
import { FIL, fermeLuit, geodeLuit, poserPierre, visiteObservatoire } from './fil-lune.js';
import { ouvrirSecret } from './secrets.js';
import {
  acheterMeubleHameau, ateliersConnus, ateliersDuHameau, commander, commandesDe, delaiCommande, lotsPossibles, meublesDuHameau,
  prixCommande, prixMeubleHameau, remboursementCommerce, retirerToutes, veilleeFerme, veilleeFermePossible,
} from './ile.js';
import {
  bienvenueDe, bienvenueDonne, bienvenueDue, bienvenueEnRoute, bienvenueModele, bienvenueNuit, bienvenuePose,
  bienvenuePrepare, nouvelleBienvenue,
} from './bienvenue.js';
import { reparerToit, toitsUses, tousLesToitsUses, USURE } from './usure.js';

const P = () => (DATA.RECIT && DATA.RECIT.PERSONNAGES) || {};

// Ce que la page d'avant lit encore du récit (fiche I7d) : le carnet, les scènes et leurs personnages, les toits des
// hameaux, la visite de bienvenue, la calèche (les promesses, les ateliers et les meubles des hameaux), l'enveloppe et
// la pierre de l'inventaire, la veillée à la ferme et les annonces de la boucle. Fait au premier appel (les imports
// en boucle sont alors tous évalués). La page le demande par recitPage(state) (l'aiguillage) : le récit muet rend
// null, et la page n'en montre rien.
let PAGE = null;
const page = () => PAGE || (PAGE = Object.freeze({
  RECIT: DATA.RECIT, ILE: DATA.ILE, BIENVENUE: DATA.BIENVENUE, FIL, USURE,
  carnet, acteEnCours, aFait,
  tousLesToitsUses, toitsUses, reparerToit,
  bienvenueDe, bienvenueDonne, bienvenueDue, bienvenueEnRoute, bienvenueModele, bienvenuePose, bienvenuePrepare,
  parler, promesses, livrerPromesse, nomCocher,
  acheterMeubleHameau, ateliersConnus, commander, commandesDe, delaiCommande, lotsPossibles, meublesDuHameau, prixCommande,
  prixMeubleHameau, retirerToutes,
  ouvrirEnveloppe, poserPierre,
  veilleeFerme, veilleeFermePossible,
}));
const faitsBruts = (state) => (state && state.recit && typeof state.recit === 'object' && state.recit.faits) || null;

export const RECIT_ANCIEN = Object.freeze({
  nom: 'ancien',

  /* -- la partie neuve, la nuit -- */
  nouveauRecit: () => nouveauRecit(),
  nouvelleBienvenue: () => nouvelleBienvenue(),
  // (runNight : la visite de bienvenue qui n'a pas eu lieu, puis l'empreinte, la dérive de la confiance, les toits)
  nuit: (state) => { bienvenueNuit(state); recitNuit(state); },

  /* -- les faits -- */
  aFait: (state, id) => aFait(state, id),
  ageFait: (state, id) => ageFait(state, id),
  noterFait: (state, id) => noterFait(state, id),
  // (le jour où le fait a été noté la première fois, lu tel quel : le courrier de campaign.js)
  premierJourFait: (state, id) => {
    const f = state.recit && state.recit.faits && state.recit.faits[id];
    return Array.isArray(f) && Number.isInteger(f[0]) ? f[0] : state.day;
  },
  // (un fait noté, lu tel quel sans réparer la partie : la découverte de l'encyclopédie, decouverte.js)
  faitNote: (state, id) => { const f = faitsBruts(state); return !!f && Array.isArray(f[id]); },

  /* -- les personnages écrits, leurs relations ; la confiance des hameaux -- */
  ecrit: (state, cle) => !!P()[cle],
  relation: (state, cle) => relation(state, cle),
  ajouterRelation: (state, cle, points) => ajouterRelation(state, cle, points),
  confiance: (state, hameau) => confiance(state, hameau),
  ajouterConfiance: (state, hameau, points) => ajouterConfiance(state, hameau, points),
  // (les personnages écrits qui habitent le hameau garanti `g`, sauf ceux qui sont partis : habitants.js installerEcrits)
  ecritsDuHameau: (state, g) => {
    const f = faitsBruts(state) || {};
    return Object.entries(P()).filter(([rid, d]) => d.habite && d.habite.hameau === g && !(Array.isArray(f[`${rid}.parti`])));
  },
  nomCocher: (state, majuscule = true) => nomCocher(state, majuscule),

  /* -- la pierre de lune (le fil de la lune) : la pousse sur la ferme -- */
  facteurPousse: (state) => {
    const f = faitsBruts(state);
    return f && Array.isArray(f['pierre.posee']) ? DATA.RECIT.FIL.PIERRE.POUSSE : 1;
  },

  /* -- ce que la page demande au récit -- */
  scenesPossibles: (state, ctx) => scenesPossibles(state, ctx),
  jouerScene: (state, id, ctx) => jouerScene(state, id, ctx),
  paroleHameau: (state, hameauId, membreId, o) => paroleHameau(state, hameauId, membreId, o),
  toucherLieu: (state, sorte, ctx) => toucherLieu(state, sorte, ctx),
  noterVisite: (state, garanti) => noterVisite(state, garanti),
  visiteObservatoire: (state) => visiteObservatoire(state),
  geodeLuit: (state) => geodeLuit(state),
  fermeLuit: (state) => fermeLuit(state),
  ouvrirSecret: (state, l) => ouvrirSecret(state, l),
  ateliersDuHameau: (state, hameauId) => ateliersDuHameau(state, hameauId),
  // (le reste de ce que la page d'avant lit du récit, en un objet : fiche I7d)
  page: () => page(),

  /* -- les migrations des formats d'avant le chantier (state.js) -- */
  jourBienvenue: () => DATA.BIENVENUE.JOUR,
  remboursementCommerce: (commerce) => remboursementCommerce(commerce),
  objetEnveloppe: () => DATA.RECIT.ENVELOPPE.OBJET,
});
