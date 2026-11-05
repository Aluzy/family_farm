/* ---------- E-11 : les rôles d'un monde partagé ----------
   La stratégie (§ 4.4) et docs/monde-partage.md : chaque membre d'un monde a un rôle, et chaque commande
   en demande un au moins. Le monde (worker/src/monde.mjs) le vérifie à chaque commande ; le jeu
   (js/ui/en-ligne.js) aussi, avant de jouer, pour le dire tout de suite.

     visiteur     : il visite, regarde, dort avec les autres ; il ne change rien à la ferme ;
     jardinier    : en plus, le potager, les bêtes, la cuisine, les outils, le verger ;
     batisseur    : en plus, Construire, l'Atelier, la progression, les appareils, les agrandissements ;
     proprietaire : tout, dont retirer une structure sensible (un atelier, un bâtiment, un appareil, un
                    bloc unique, le silo : SENSIBLE) ; et lui seul invite, retire, change les rôles.

   Pur : pas d'horloge, pas de hasard ; le même résultat chez le monde et chez chaque joueur. */

import { DATA } from './catalog.js';
import { surCase } from './commandes.js';
import { blocAt, blocDessus, casesCouvertes } from './blocs.js';
import { dessusEtage, etageBlocs } from './etage.js';

export const ROLES_MONDE = ['visiteur', 'jardinier', 'batisseur', 'proprietaire'];
const RANG = Object.fromEntries(ROLES_MONDE.map((r, i) => [r, i]));
export const NOMS_ROLES = { visiteur: 'Visiteur', jardinier: 'Ami jardinier', batisseur: 'Bâtisseur', proprietaire: 'Propriétaire' };
export const ICONES_ROLES = { visiteur: '👀', jardinier: '🌱', batisseur: '🔨', proprietaire: '🏡' };

// Le rôle demandé par chaque famille de commandes (le début de son type) ; un type précis l'emporte.
const PAR_FAMILLE = {
  potager: 'jardinier', cruche: 'jardinier', poules: 'jardinier', ramassage: 'jardinier', cuisine: 'jardinier',
  moulin: 'jardinier', boite: 'jardinier', manger: 'jardinier', outil: 'jardinier', verger: 'jardinier',
  bloc: 'batisseur', mur: 'batisseur', etage: 'batisseur', solEtage: 'batisseur', arbre: 'batisseur',
  atelier: 'batisseur', tech: 'batisseur', appareil: 'batisseur', reservoir: 'batisseur', robot: 'batisseur',
  serre: 'batisseur', poulailler: 'batisseur',
  botteleuse: 'jardinier', chaine: 'jardinier', distributeur: 'jardinier', morceau: 'jardinier', cueillette: 'jardinier',
};
const PAR_TYPE = {
  'etable.tondre': 'jardinier', 'etable.herbes': 'jardinier', 'etable.place': 'batisseur',
  'frigo.ranger': 'jardinier', 'frigo.sortir': 'jardinier', 'frigo.toutRanger': 'jardinier', 'frigo.urgent': 'jardinier',
  'frigo.acheter': 'batisseur', 'frigo.agrandir': 'batisseur',
};

// Un bloc dont le retrait est réservé au propriétaire.
export function sensible(sorte) {
  const b = DATA.ATELIER.BLOCS[sorte];
  return !!b && !!(b.unique || b.station || b.batiment || b.appareil || b.silo || b.robot || b.ecurie || b.frigo);
}

// Ce que la commande `c` retire (la sorte d'un bloc), s'il y en a un : pour SENSIBLE.
function retire(state, c) {
  const a = c.args || {};
  if (c.type === 'bloc.reprendre') {
    // (un meuble sur plusieurs cases, touché ailleurs que sur sa case d'ancrage : lui)
    if (!blocDessus(state, a.case) && !blocAt(state, a.case)) { const ancre = casesCouvertes(state).get(a.case); if (ancre !== undefined) return blocAt(state, ancre); }
    return surCase(state, a.case);
  }
  if (c.type === 'bloc.remettre' || c.type === 'etage.remettre') return a.apres;
  if (c.type === 'etage.reprendre') return dessusEtage(state)[a.case] || etageBlocs(state)[a.case];
  return null;
}

// Le rôle que demande la commande `c` sur la partie `state`.
export function roleDemande(state, c) {
  const type = String((c && c.type) || '');
  const r = retire(state, c);
  if (r && sensible(r)) return 'proprietaire';
  return PAR_TYPE[type] || PAR_FAMILLE[type.split('.')[0]] || 'batisseur';
}

// null si le rôle `role` permet la commande `c`, sinon la raison (à dire au joueur).
export function refusDuRole(role, state, c) {
  const besoin = roleDemande(state, c);
  if ((RANG[role] ?? -1) >= RANG[besoin]) return null;
  if (besoin === 'proprietaire') return 'Seul le propriétaire de la ferme retire un atelier, un bâtiment ou un appareil.';
  return `Ton rôle dans ce monde (${NOMS_ROLES[role] || role}) ne permet pas ce geste : il faut être ${NOMS_ROLES[besoin].toLowerCase()}. Le propriétaire peut changer ton rôle (👥).`;
}
