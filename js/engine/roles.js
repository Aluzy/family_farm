/* ---------- E-11 : les rôles d'un monde partagé ----------
   La stratégie (§ 4.4) et docs/monde-partage.md : chaque membre d'un monde a un rôle, et chaque commande
   en demande un au moins. Le monde (worker/src/monde.mjs) le vérifie à chaque commande ; le jeu
   (js/ui/en-ligne.js) aussi, avant de jouer, pour le dire tout de suite.

     visiteur     : il visite, regarde, dort avec les autres ; il ne change rien à la ferme ;
     jardinier    : en plus, le potager, les bêtes, la cuisine, les outils, le verger ;
     batisseur    : en plus, Construire, l'Atelier, la progression, les appareils, les agrandissements ;
                    I9c : le port, vendre et porter pour le jardinier, acheter pour le bâtisseur, l'agrandir pour le
                    propriétaire ;
     proprietaire : tout, dont retirer une structure sensible (un atelier, un bâtiment, un appareil, un
                    bloc unique, le silo : SENSIBLE) ; et lui seul invite, retire, change les rôles.

   I9e, la grille d'une île (ilePartagee) : le monde en ligne est l'île d'un propriétaire, et ses amis invités viennent
   l'aider à faire progresser SON village. Les rôles sont une grille de confiance : l'ami aidant est vraiment utile
   (il produit, vend, se lie aux villageois, leur confie un outil, bâtit), le propriétaire garde ce qui est structurant
   (GRILLE_ILE, docs/monde-partage.md § 10 et § 13) :
     visiteur     : regarde, parle aux villageois (sa page seule : rien n'est envoyé), dort avec les autres ;
     jardinier    : en plus, récolter sur l'île, vendre au port et à l'étal, parler, offrir, accueillir, fabriquer à
                    l'Atelier, confier ou reprendre un outil, la navette (ce qu'un villageois porte au port), suggérer un
                    commerce au propriétaire, épingler et annoter la chronique (signé) ;
     batisseur    : en plus, Construire (sur l'île aussi), acheter (au port, aux commerces), les réglages de la cuisine
                    du village ; attribuer les tâches si le propriétaire le lui délègue (le réglage du monde `taches`) ;
     proprietaire : en plus, attribuer les tâches, décider qu'un villageois ouvre (ou rejoint) un commerce, former un
                    foyer, accueillir un enfant, nommer (l'île, le village, une maison, un commerce, son enseigne),
                    agrandir le port, retirer la maison d'un villageois (sa boîte aux lettres, sa porte, ses murs, son lit),
                    acheter un palier de la charrette du village (I2b ; les rails, eux, se posent au bâtisseur).
   Un villageois ne se renvoie pas : aucune commande ne le fait. Une ferme d'avant (E-8, sans le chantier) garde la
   grille d'E-11 telle quelle.

   Pur : pas d'horloge, pas de hasard ; le même résultat chez le monde et chez chaque joueur. */

import { DATA } from './catalog.js';
import { surCase } from './commandes.js';
import { blocAt, blocDessus, casesCouvertes, maisonsMarquees } from './blocs.js';
import { dessusEtage, etageBlocs, fenetresHautes } from './etage.js';
import { ilePartagee } from './frontiere.js';
import { farmTerrain } from './terrain.js';

export const ROLES_MONDE = ['visiteur', 'jardinier', 'batisseur', 'proprietaire'];
const RANG = Object.fromEntries(ROLES_MONDE.map((r, i) => [r, i]));
export const NOMS_ROLES = { visiteur: 'Visiteur', jardinier: 'Ami jardinier', batisseur: 'Bâtisseur', proprietaire: 'Propriétaire' };
export const ICONES_ROLES = { visiteur: '👀', jardinier: '🌱', batisseur: '🔨', proprietaire: '🏡' };

// Le rôle demandé par chaque famille de commandes (le début de son type) ; un type précis l'emporte.
const PAR_FAMILLE = {
  potager: 'jardinier', cruche: 'jardinier', poules: 'jardinier', ramassage: 'jardinier', cuisine: 'jardinier',
  moulin: 'jardinier', boite: 'jardinier', manger: 'jardinier', outil: 'jardinier', verger: 'jardinier', monde: 'jardinier', sac: 'jardinier',
  bloc: 'batisseur', mur: 'batisseur', etage: 'batisseur', solEtage: 'batisseur', arbre: 'batisseur',
  atelier: 'batisseur', tech: 'batisseur', appareil: 'batisseur', reservoir: 'batisseur', robot: 'batisseur',
  serre: 'batisseur', poulailler: 'batisseur', piece: 'batisseur', murs: 'batisseur',
  botteleuse: 'jardinier', chaine: 'jardinier', distributeur: 'jardinier', morceau: 'jardinier', cueillette: 'jardinier',
};
const PAR_TYPE = {
  'etable.tondre': 'jardinier', 'etable.herbes': 'jardinier', 'etable.place': 'batisseur',
  'frigo.ranger': 'jardinier', 'frigo.sortir': 'jardinier', 'frigo.toutRanger': 'jardinier', 'frigo.urgent': 'jardinier',
  'frigo.acheter': 'batisseur', 'frigo.agrandir': 'batisseur',
  // I9c, le port (la grille d'I9e pour lui) : vendre ce qu'on a porté (vendre, décharger, honorer une commande, livrer un
  // contrat) et porter, l'ami jardinier ; acheter (les semences, l'import), s'engager (un contrat), apporter au chantier
  // du port, le bâtisseur ; agrandir le port, le propriétaire. Le visiteur ne vend ni n'achète.
  'port.vendre': 'jardinier', 'port.decharger': 'jardinier', 'port.honorer': 'jardinier', 'port.livrer': 'jardinier',
  'portage.charger': 'jardinier', 'portage.reprendre': 'jardinier', 'portage.vehicule': 'jardinier',
  'port.acheter': 'batisseur', 'port.importer': 'batisseur', 'port.contrat': 'batisseur', 'port.apporter': 'batisseur',
  'port.agrandir': 'proprietaire',
  // (I9d : parler à un villageois, lui offrir un cadeau, le nouveau venu à sa porte : ce que fait un ami jardinier ; le
  // visiteur voit le village vivre et lui parle, sans rien changer : sa page ne l'envoie pas, js/ui/villageois.js)
  'villageois.parler': 'jardinier', 'villageois.offrir': 'jardinier', 'villageois.accueillir': 'jardinier',
};
// I9e : la grille d'une île (le chantier allumé pour la partie du monde) : ce qui s'ajoute à PAR_TYPE, ou le change.
export const GRILLE_ILE = Object.freeze({
  // (l'ami jardinier : il produit, vend, se lie, outille ; il fabrique à l'Atelier — un outil à confier, un meuble)
  'atelier.fabriquer': 'jardinier',
  'villageois.outil': 'jardinier', 'villageois.vendre': 'jardinier', 'commerce.suggerer': 'jardinier',
  'etal.mettre': 'jardinier', 'etal.reprendre': 'jardinier',
  'chronique.epingler': 'jardinier', 'chronique.noter': 'jardinier',
  // (le bâtisseur : ce qui dépense la caisse ou règle le village au quotidien)
  'commerce.acheter': 'batisseur', 'commerce.commander': 'batisseur',
  'village.commun': 'batisseur', 'village.reserve': 'batisseur', 'village.cuisine': 'batisseur',
  // (I2b : les rails se posent et se reprennent par les blocs, au bâtisseur ; mettre un villageois à la tournée est
  // l'attribution d'une tâche, plus bas)
  // (le propriétaire : ce qui est structurant pour son village)
  'villageois.attribuer': 'proprietaire', 'villageois.foyer': 'proprietaire', 'villageois.enfant': 'proprietaire',
  'commerce.ouvrir': 'proprietaire', 'commerce.rejoindre': 'proprietaire', 'commerce.lettres': 'proprietaire',
  'nom.donner': 'proprietaire',
  // (I2b : un palier de la charrette du village, une grosse dépense de la caisse commune, comme agrandir le port)
  'charrette.palier': 'proprietaire',
});
// Les réglages du monde que le propriétaire peut changer (worker/src/monde.mjs, la table meta ; diffusés à tous) :
// taches : l'attribution des tâches déléguée aux bâtisseurs (éteint par défaut).
export const REGLAGES_MONDE = Object.freeze({ taches: false });
export function reglagesMonde(r) {
  const o = r && typeof r === 'object' ? r : {};
  return { taches: o.taches === true };
}

// I9e : la maison d'un villageois (une île) : les cases que le geste `c` toucherait et qui la font tenir — sa boîte aux
// lettres, ses portes, ses lits, les murs autour de sa pièce. Une maison habitée ne se retire que par le propriétaire.
const GESTES_DE_RETRAIT = new Set(['bloc.reprendre', 'bloc.remettre', 'bloc.deplacer', 'mur.abaisser']);
function toucheUneMaisonHabitee(state, c) {
  if (!GESTES_DE_RETRAIT.has(c.type)) return false;
  const V = Array.isArray(state.villageois) ? state.villageois.filter((v) => v && Number.isInteger(v.maison)) : [];
  if (!V.length) return false;
  const a = c.args || {}, cible = c.type === 'bloc.deplacer' ? a.de : a.case;
  if (!Number.isInteger(cible)) return false;
  // (sa boîte aux lettres, son lit : sans même relever les pièces)
  if (V.some((v) => v.maison === cible || v.lit === cible)) return true;
  const W = farmTerrain(state).LARGEUR, habitees = new Set(V.map((v) => v.maison));
  for (const m of maisonsMarquees(state)) {
    if (!habitees.has(m.boite)) continue;
    const p = m.piece, dedans = new Set(p.cases);
    if (p.portes.includes(cible) || p.paillasses.includes(cible)) return true;
    if (dedans.has(cible)) continue;
    // (un mur : une case hors de la pièce, contre l'une de ses cases)
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const x = (cible % W) + dc;
      if ((dr || dc) && x >= 0 && x < W && dedans.has(cible + dr * W + dc)) return true;
    }
  }
  return false;
}

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
  if (c.type === 'etage.reprendre') { const n = a.niveau || 1; return dessusEtage(state, n)[a.case] || etageBlocs(state, n)[a.case] || fenetresHautes(state, n)[a.case]; }
  return null;
}

// Le rôle que demande la commande `c` sur la partie `state`. `reglages` (I9e) : ceux du monde (reglagesMonde).
export function roleDemande(state, c, reglages = REGLAGES_MONDE) {
  const type = String((c && c.type) || '');
  const r = retire(state, c);
  if (r && sensible(r)) return 'proprietaire';
  if (state && ilePartagee(state)) {
    if (c && toucheUneMaisonHabitee(state, c)) return 'proprietaire';
    if (type === 'villageois.attribuer' && reglages && reglages.taches === true) return 'batisseur';
    if (GRILLE_ILE[type]) return GRILLE_ILE[type];
  }
  return PAR_TYPE[type] || PAR_FAMILLE[type.split('.')[0]] || 'batisseur';
}

// Ce qui est réservé au propriétaire, en mots (le type de la commande).
const AU_PROPRIETAIRE = {
  'port.agrandir': 'Seul le propriétaire de l\'île agrandit le port.',
  'villageois.attribuer': 'Seul le propriétaire de l\'île attribue les tâches des villageois (il peut le confier aux bâtisseurs : 👥).',
  'commerce.ouvrir': 'Seul le propriétaire de l\'île décide qu\'un villageois ouvre un commerce : suggère-le-lui (💡).',
  'commerce.rejoindre': 'Seul le propriétaire de l\'île décide qu\'un villageois rejoint un commerce : suggère-le-lui (💡).',
  'commerce.lettres': 'Seul le propriétaire de l\'île choisit l\'enseigne d\'un commerce.',
  'villageois.foyer': 'Seul le propriétaire de l\'île propose à deux villageois de former un foyer.',
  'villageois.enfant': 'Seul le propriétaire de l\'île propose à un foyer d\'accueillir un enfant.',
  'nom.donner': 'Seul le propriétaire de l\'île nomme l\'île, le village, les maisons et les commerces.',
  'charrette.palier': 'Seul le propriétaire de l\'île améliore la charrette du village (une grosse dépense de la caisse commune).',
};

// null si le rôle `role` permet la commande `c`, sinon la raison (à dire au joueur). `reglages` : ceux du monde (I9e).
export function refusDuRole(role, state, c, reglages = REGLAGES_MONDE) {
  const besoin = roleDemande(state, c, reglages);
  if ((RANG[role] ?? -1) >= RANG[besoin]) return null;
  if (besoin === 'proprietaire') {
    const type = String(c && c.type);
    if (AU_PROPRIETAIRE[type]) return AU_PROPRIETAIRE[type];
    const r = retire(state, c);
    if (!(r && sensible(r)) && state && ilePartagee(state) && toucheUneMaisonHabitee(state, c)) return 'Seul le propriétaire de l\'île retire la maison d\'un villageois (sa boîte aux lettres, sa porte, ses murs, son lit).';
    return 'Seul le propriétaire de la ferme retire un atelier, un bâtiment ou un appareil.';
  }
  return `Ton rôle dans ce monde (${NOMS_ROLES[role] || role}) ne permet pas ce geste : il faut être ${NOMS_ROLES[besoin].toLowerCase()}. Le propriétaire peut changer ton rôle (👥).`;
}
