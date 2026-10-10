import { DATA } from './catalog.js';
import { STATE_VERSION } from './base.js';
import { newVille } from './ville.js';
import { batteryCapacity, newDayStats, startFarm } from './devices.js';
import { addItem, defaultOrigin, lotRank, shelfLife } from './inventory.js';
import { pushLots } from './fridge.js';
import {
  cleanFirstName, defaultMemberProfile, familyNumbers, makeMember, newNightStats, validFirstName,
} from './family.js';
import { makePlot, seedItem, startPlots } from './crops.js';
import { newStableReport } from './animals.js';
import { newTechPoints } from './techtree.js';
import { newAutoReport } from './automation.js';
import { chapterCount, inferChapter, legacyChamp, newCampaign, ownedPlots, ownsElement } from './campaign.js';
import { newTutorial } from './alerts.js';
import { newProgression, unlockLevel } from './levels.js';
import { energyMax } from './stamina.js';

// Lot 2 : inventaire de départ, potager, famille et compte rendu de la nuit.
// Lot 3 : l'inventaire de départ, en lots à conservation pleine.
export function startInventory() {
  const inv = {};
  for (const [item, qty] of Object.entries(DATA.START.INVENTAIRE)) {
    inv[item] = [{ qty, nightsLeft: shelfLife(item), origin: defaultOrigin(item) }];
  }
  return inv;
}

export function startHousehold() {
  return {
    inventaire: startInventory(),
    potager: { parcelles: startPlots(), zone2: [], houe: false },
    famille: {
      membres: DATA.FAMILY.MEMBRES.map(makeMember),
      // version 1.2 : animaux de compagnie, et dernier numéro donné à un adulte, à un
      // enfant et à un animal (les identifiants ne sont jamais réutilisés)
      animaux: [],
      numeros: familyNumbers(DATA.FAMILY.MEMBRES, []),
      reserve: { ...DATA.FAMILY.RESERVE_DEPART },
    },
    nuit: newNightStats(),
  };
}

// État initial du jeu. `seed` doit être fourni par l'appelant (l'app),
// jamais lu depuis l'horloge ici : l'ENGINE reste pur et testable.
// Lot 4 : Silo et Poulailler, tous deux à construire (l'ancien Champ a rejoint
// la Zone de culture en version 15).
export function startLot4() {
  return {
    silo: { construit: false, niveau: 1, ble: 0 },
    poulailler: { construit: false, niveau: 1, poules: 0, nourries: 0, restes: 0 },
  };
}

// Lot 5 : les quatre stations, toutes à construire, libres.
export function startLot5() {
  const stations = {};
  for (const id of Object.keys(DATA.STATIONS)) stations[id] = { construit: false, tache: null, appareil: null };
  return { stations };
}

// Lot 6 : l'Étable des moutons et des vaches, à ouvrir (aucune place, aucun animal).
export function startLot6() {
  return {
    paturage: { construit: false, places: 0, compteur: 0, compteurVache: 0, moutons: [], vaches: [] },
  };
}

// Lot 7 : aucune technologie acquise au départ.
export function startLot7() {
  // routine : réglage « Dormir tout seul » (Routine familiale, arbre v2).
  return { technologies: [], pointsTech: newTechPoints(), routine: false };
}

// Lot 8 : Serre, Verger et Réfrigérateur, tous à construire.
export function startLot8() {
  return {
    serre: { construit: false, niveau: 1, parcelles: [] },
    verger: { construit: false, places: DATA.VERGER.EMPLACEMENTS_DEPART, achetes: 0, compteur: 0, arbres: [] },
    frigo: { construit: false, niveau: 1, appareil: null, items: {}, alimenteMs: 0, eveilMs: 0, panneNuit: false, alimente: true },
  };
}

// Lot 9 : la campagne commence au chapitre 1, sans historique.
export function startLot9() {
  return { campagne: newCampaign() };
}

// Lot 11 : les bulles d'aide commencent à la première (« eau »).
export function startLot11() {
  return { aide: newTutorial() };
}

export function createInitialState(seed = 1) {
  return {
    version: STATE_VERSION,
    day: 1,
    awakeMs: 0,
    repas: null, // version 1.1.1 : compte du repas de 19 h, jusqu'à la nuit (voir takeMeal)
    courrier: [], // version 1.3 : lettres reçues [{ id, nuit, lu }] (voir deliverMail)
    pieces: DATA.START.PIECES,
    rngSeed: seed >>> 0,
    unlockedTabs: ['ferme', 'famille', 'inventaire', 'comptoir'],
    stats: {},
    marche: {}, // Lot 3 : coefficients d'achat au-dessus de leur plancher
    ville: newVille(), // version 1.5 : sorties faites aujourd'hui, marché de la ville
    progression: newProgression(), // version 1.7 : expérience et niveau
    energie: energyMax(), // version 1.8 : l'énergie du personnage (millièmes)
    ...startFarm(),
    ...startHousehold(),
    ...startLot4(),
    ...startLot5(),
    ...startLot6(),
    ...startLot7(),
    ...startLot8(),
    ...startLot9(),
    ...startLot11(),
  };
}

// Table de migrations successives : MIGRATIONS[n] transforme un état de
// version n vers n+1. L'entrée 0 sert de filet pour toute sauvegarde
// antérieure au champ `version` (et de cas de test).
export const MIGRATIONS = {
  0: (state) => ({ ...state, version: 1 }),
  // v1 (Lot 0) → v2 (Lot 1) : ajout du parc d'appareils, de l'eau et du rapport.
  1: (state) => ({ ...startFarm(), ...state, version: 2 }),
  // v2 (Lot 1) → v3 (Lot 2) : inventaire de départ, potager, famille, onglet Famille.
  2: (state) => {
    const tabs = Array.isArray(state.unlockedTabs) ? [...state.unlockedTabs] : ['ferme', 'inventaire', 'comptoir'];
    if (!tabs.includes('famille')) tabs.splice(Math.min(1, tabs.length), 0, 'famille');
    return { ...startHousehold(), ...state, unlockedTabs: tabs, version: 3 };
  },
  // v3 (Lot 2) → v4 (Lot 3) : l'inventaire { item: quantité } devient des lots
  // d'origine « produit » (« acheté » pour les conserves) à conservation pleine ;
  // le Marché et le rapport de péremption apparaissent.
  3: (state) => {
    const inventaire = {};
    const old = state.inventaire && typeof state.inventaire === 'object' ? state.inventaire : {};
    for (const [item, v] of Object.entries(old)) {
      if (Array.isArray(v)) {
        inventaire[item] = v;
        continue;
      }
      const qty = Number(v);
      if (qty > 0) inventaire[item] = [{ qty, nightsLeft: shelfLife(item), origin: defaultOrigin(item) }];
    }
    const nuit = state.nuit && typeof state.nuit === 'object'
      ? { ...state.nuit, perdus: state.nuit.perdus || {} }
      : newNightStats();
    return { ...state, inventaire, nuit, marche: state.marche || {}, version: 4 };
  },
  // v4 (Lot 3) → v5 (Lot 4) : Silo et Poulailler (à construire), blé mangé du
  // jour et œufs de la nuit. (Le Champ, apparu ici à l'époque, n'est plus créé :
  // MIGRATIONS[14] le fond dans la Zone de culture quand il existe.)
  4: (state) => ({
    ...startLot4(),
    ...state,
    jour: { ...newDayStats(), ...(state.jour && typeof state.jour === 'object' ? state.jour : {}) },
    nuit: { oeufs: 0, ...(state.nuit && typeof state.nuit === 'object' ? state.nuit : {}) },
    version: 5,
  }),
  // v5 (Lot 4) → v6 (Lot 5) : les quatre stations (à construire) et les
  // compteurs de nuit des plats.
  5: (state) => ({
    ...startLot5(),
    ...state,
    nuit: { bonusPlats: 0, termine: {}, ...(state.nuit && typeof state.nuit === 'object' ? state.nuit : {}) },
    version: 6,
  }),
  // v6 (Lot 5) → v7 (Lot 6) : le Pâturage (à débloquer), sans moutons.
  6: (state) => ({
    ...startLot6(),
    ...state,
    version: 7,
  }),
  // v7 (Lot 6) → v8 (Lot 7) : les technologies (aucune acquise), le réglage du
  // semis automatique de chaque parcelle et le compte rendu des automatisations.
  7: (state) => {
    const withSemis = (plots) => (Array.isArray(plots) ? plots.map((p) => ({ semis: 'meme', verrou: null, ...p })) : plots);
    const out = { ...startLot7(), ...state, version: 8 };
    if (state.potager && typeof state.potager === 'object') out.potager = { ...state.potager, parcelles: withSemis(state.potager.parcelles) };
    if (state.champ && typeof state.champ === 'object') out.champ = { ...state.champ, parcelles: withSemis(state.champ.parcelles) };
    out.nuit = { auto: newAutoReport(), ...(state.nuit && typeof state.nuit === 'object' ? state.nuit : {}) };
    return out;
  },
  // v8 (Lot 7) → v9 (Lot 8) : Serre, Verger et Réfrigérateur (à construire) ; la
  // saison se déduit de la nuit courante, il n'y a rien d'autre à convertir.
  8: (state) => ({
    ...startLot8(),
    ...state,
    nuit: { fruits: {}, frigo: { kwh: 0, panne: false, vieillis: false }, ...(state.nuit && typeof state.nuit === 'object' ? state.nuit : {}) },
    version: 9,
  }),
  // v9 (Lot 8) → v10 (Lot 9) : la campagne. Une ancienne partie est placée au
  // chapitre qui correspond à ce qu'elle possède déjà ; les compteurs et
  // l'historique d'autonomie repartent de zéro.
  9: (state) => {
    const campagne = newCampaign();
    campagne.chapitre = inferChapter(state);
    return {
      ...state,
      campagne,
      jour: { ...newDayStats(), ...(state.jour && typeof state.jour === 'object' ? state.jour : {}) },
      nuit: { energieProduit: 0, autonomie: 0, ...(state.nuit && typeof state.nuit === 'object' ? state.nuit : {}) },
      version: 10,
    };
  },
  // v10 (Lot 10) → v11 (Lot 11) : les bulles d'aide. Une partie déjà commencée
  // (au moins une nuit passée) ne les affiche pas : elles sont pour la première
  // journée. La progression hors-ligne n'ajoute rien à l'état (l'heure de la
  // sauvegarde est dans l'enveloppe { v, t, s }).
  10: (state) => {
    const commencee = typeof state.day === 'number' && state.day > 1;
    const aide = state.aide && typeof state.aide === 'object' ? state.aide : { ...newTutorial(), fini: commencee };
    return { ...state, aide, version: 11 };
  },
  // v11 → v12 (arrivée de la vache) : le Pâturage gagne compteurVache
  // et vaches (aucune vache dans une ancienne partie) ; l'ancien item générique
  // « viande » (mouton) est renommé « viande_mouton » dans l'inventaire et au
  // Marché (coefficient de marché), pour laisser la place à « viande_boeuf »
  // et « viande_volaille ». Le Poulailler n'a besoin d'aucune migration : les
  // poules restent un simple compteur.
  11: (state) => {
    const oldP = state.paturage && typeof state.paturage === 'object' ? state.paturage : {};
    const paturage = {
      construit: !!oldP.construit,
      ha: typeof oldP.ha === 'number' ? oldP.ha : 0,
      compteur: typeof oldP.compteur === 'number' ? oldP.compteur : 0,
      compteurVache: typeof oldP.compteurVache === 'number' ? oldP.compteurVache : 0,
      moutons: Array.isArray(oldP.moutons) ? oldP.moutons : [],
      vaches: Array.isArray(oldP.vaches) ? oldP.vaches : [],
    };
    const inventaire = state.inventaire && typeof state.inventaire === 'object' ? { ...state.inventaire } : {};
    if (Object.prototype.hasOwnProperty.call(inventaire, 'viande')) {
      const old = inventaire.viande;
      delete inventaire.viande;
      if (Array.isArray(old) && old.length) {
        inventaire.viande_mouton = Array.isArray(inventaire.viande_mouton) ? [...inventaire.viande_mouton, ...old] : old;
      }
    }
    const marche = state.marche && typeof state.marche === 'object' ? { ...state.marche } : {};
    if (Object.prototype.hasOwnProperty.call(marche, 'viande')) {
      if (marche.viande_mouton === undefined) marche.viande_mouton = marche.viande;
      delete marche.viande;
    }
    return { ...state, paturage, inventaire, marche, version: 12 };
  },
  // v12 → v13 : chiffres entiers partout. Pièces et prix entiers, coefficients
  // du Marché en %, énergie en mWh, eau en mL, temps en ms, usure en points
  // entiers (+ temps de marche), pâturage en ares, poids en hg, blé entier
  // (1 blé nourrit 2 poules), autonomie en % entiers. Le rapport de réveil en
  // attente est retiré (il était en anciennes unités).
  12: (state) => migrateToIntegers(state),
  // v13 → v14 : arbre des technologies v2. Points de technologie des chapitres
  // déjà terminés ; les automatisations du niveau 5 et les recettes déjà
  // accessibles sont offertes sous forme de nœuds (rien n'est perdu).
  13: (state) => migrateTechTreeV2(state),
  // v14 → v15 (version 1.0) : le Potager et le Champ deviennent une seule Zone
  // de culture (state.potager). Toutes les parcelles sont regroupées, rien
  // n'est perdu ; state.champ disparaît.
  14: (state) => migrateCropZone(state),
  // v15 → v16 (version 1.1) : profil de la famille, animaux sans poids,
  // places à l'Étable, paille, Moulin par quantité, fin des recettes à la viande.
  15: (state) => migrateRules11(state),
  // v16 → v17 (version 1.1.1) : le repas de 19 h. Le repas du jour n'est pas
  // encore pris (state.repas = null) : il le sera à 19 h ou au coucher.
  16: (state) => ({ ...state, version: 17, repas: null }),
  // v17 → v18 (version 1.2) : la famille se compose. Les membres ne changent
  // pas ; la famille reçoit sa liste d'animaux de compagnie (vide) et ses
  // compteurs d'identifiants.
  17: (state) => migrateFamily12(state),
  // v18 → v19 (version 1.3) : le courrier. La boîte commence vide ; une partie
  // où la Serre est déjà ouverte reçoit la lettre du cousin (et ses trois
  // graines) au premier passage de deliverMail().
  18: (state) => ({ ...state, version: 19, courrier: Array.isArray(state.courrier) ? state.courrier : [] }),
  // v19 → v20 (version 1.4) : le Champ, deuxième zone de culture. Il commence
  // vide ; une partie où le Moulin est déjà débloqué le reçoit, avec toutes ses
  // parcelles, au premier passage de openZone2(). Le Verger passe à 12
  // emplacements au plus : une partie qui en a davantage les garde, avec leurs arbres.
  19: (state) => {
    const p = state.potager && typeof state.potager === 'object' ? state.potager : null;
    return { ...state, version: 20, ...(p ? { potager: { ...p, zone2: Array.isArray(p.zone2) ? p.zone2 : [] } } : {}) };
  },
  // v20 → v21 : la réserve de semences disparaît de l'Inventaire (la famille
  // peut tout manger ; les semences se rachètent au Marché), et le blé de
  // l'inventaire périme désormais (celui du Silo, jamais).
  20: (state) => migrateWheatAndReserve(state),
  // v21 → v22 (version 1.5) : bonheur des membres (DEPART pour chacun) et sorties en ville.
  21: (state) => migrateHappiness(state),
  // v22 → v23 (version 1.6) : plus de saisons. L'objectif de l'hiver (chapitre 6)
  // devient une série de nuits ; un hiver déjà réussi vaut la série réussie.
  22: (state) => migrateNoSeasons(state),
  // v23 → v24 (version 1.6, v2 lot 2) : un seul panneau, une seule batterie, un
  // réservoir à niveaux.
  23: (state) => migrateSingleDevices(state),
  // v24 → v25 (version 1.7, v2 lot 3) : niveaux d'expérience.
  24: (state) => migrateLevels(state),
  // v25 → v26 (version 1.8, v2 lot 4) : l'énergie du personnage remplace la santé.
  25: (state) => migrateEnergy(state),
  26: (state) => migrateHoe(state),
  27: (state) => migrateFridgeCapacity(state),
};

// Version 1.8 : plus de santé ni de soins ; le personnage commence avec son énergie
// pleine ; les nœuds de l'arbre retirés (soins, bonus de santé) sont rendus (points
// et pièces) ; la série du chapitre 6 en cours oublie ses soins.
// Version 1.10 (v2, lot 6) : le frigo a une capacité (niveau 1 : DATA.FRIGO.CAPACITE[0]).
// Un frigo déjà construit passe au niveau 1 ; il garde ce qui périme le plus tôt et le
// surplus revient dans l'inventaire, avec sa conservation.
export function migrateFridgeCapacity(old) {
  const state = { ...old, version: 28 };
  const f = state.frigo;
  if (!f || typeof f !== 'object') return state;
  state.frigo = { ...f, niveau: 1, items: { ...(f.items && typeof f.items === 'object' ? f.items : {}) } };
  if (!state.frigo.construit) return state;
  const all = [];
  for (const [item, lots] of Object.entries(state.frigo.items)) {
    if (!Array.isArray(lots)) continue;
    for (const lot of lots) if (lot && lot.qty > 0) all.push({ item, lot: { ...lot } });
  }
  all.sort((a, b) => lotRank(a.lot) - lotRank(b.lot));
  let room = DATA.FRIGO.CAPACITE[0];
  const keep = {};
  const back = {};
  for (const { item, lot } of all) {
    const n = Math.min(lot.qty, room);
    room -= n;
    if (n > 0) (keep[item] = keep[item] || []).push({ ...lot, qty: n });
    if (lot.qty - n > 0) (back[item] = back[item] || []).push({ ...lot, qty: lot.qty - n });
  }
  // les aliments gardent leur ordre d'avant
  state.frigo.items = Object.fromEntries(Object.keys(state.frigo.items).filter((k) => keep[k]).map((k) => [k, keep[k]]));
  if (Object.keys(back).length) {
    state.inventaire = { ...(state.inventaire || {}) };
    for (const [item, lots] of Object.entries(back)) {
      const inv = Array.isArray(state.inventaire[item]) ? state.inventaire[item].map((l) => ({ ...l })) : [];
      pushLots(inv, lots);
      state.inventaire[item] = inv;
    }
  }
  return state;
}

// Version 1.9 (v2, lot 5) : la Zone de culture n'a plus de niveaux, c'est une grille de
// cases. Les parcelles existantes restent de la terre, posées dans l'ordre sur les
// premières cases (comme la carte les dessinait) ; celles du Champ aussi. Une ancienne
// partie reçoit la houe (elle avait déjà agrandi sa zone en pièces). Au-delà du plafond
// de son niveau, rien n'est retiré : la houe attend simplement que la place revienne.
export function migrateHoe(old) {
  const state = { ...old, version: 27 };
  const p = state.potager;
  if (p && typeof p === 'object') {
    // une parcelle qui a déjà une case valide (et unique) la garde ; sinon, dans l'ordre
    const place = (list, cases) => {
      const plots = (Array.isArray(list) ? list : []).filter((x) => x && typeof x === 'object').slice(0, cases);
      const valid = plots.every((x, i) => Number.isInteger(x.case) && x.case >= 0 && x.case < cases && plots.findIndex((y) => y.case === x.case) === i);
      return plots.map((x, i) => ({ ...x, case: valid ? x.case : i })).sort((a, b) => a.case - b.case);
    };
    const { niveau, ...potager } = p;
    potager.parcelles = place(p.parcelles, DATA.POTAGER.CASES);
    potager.zone2 = place(p.zone2, DATA.POTAGER.ZONE2.CASES);
    potager.houe = true;
    state.potager = potager;
  }
  return state;
}

export function migrateEnergy(old) {
  const state = { ...old, version: 26, energie: energyMax() };
  const f = state.famille;
  if (f && typeof f === 'object') {
    const { soinsPayes, ...famille } = f;
    famille.membres = (Array.isArray(f.membres) ? f.membres : []).map((m) => {
      if (!m || typeof m !== 'object') return m;
      const { sante, malade, ...membre } = m;
      return membre;
    });
    state.famille = famille;
  }
  refundRetiredNodes(state);
  const k = state.campagne && state.campagne.compteurs;
  if (k && k.tenue && typeof k.tenue === 'object') {
    const { soins, ...tenue } = k.tenue;
    k.tenue = tenue;
  }
  if (k && k.tenueDerniere && typeof k.tenueDerniere === 'object') {
    const { sansSoin, ...derniere } = k.tenueDerniere;
    k.tenueDerniere = derniere;
  }
  if (state.jour && typeof state.jour === 'object') {
    const { soins, ...jour } = state.jour;
    state.jour = jour;
  }
  // le rapport de réveil en attente, la nuit et le repas du jour perdent leurs lignes de santé
  for (const key of ['report', 'nuit', 'repas']) {
    if (!state[key] || typeof state[key] !== 'object') continue;
    const { santeAvant, santeApres, nouveauxMalades, bonusPlats, ...rest } = state[key];
    state[key] = rest;
  }
  return state;
}

// Les nœuds retirés de l'arbre (NOEUDS_RETIRES) que la partie possède sont rendus :
// leurs pièces et leurs points de technologie.
export function refundRetiredNodes(state) {
  if (!Array.isArray(state.technologies)) return;
  for (const [id, n] of Object.entries(DATA.techtree.NOEUDS_RETIRES)) {
    if (!state.technologies.includes(id)) continue;
    state.technologies = state.technologies.filter((x) => x !== id);
    state.pieces = Math.round((Number(state.pieces) || 0) + n.cout);
    if (!state.pointsTech || typeof state.pointsTech !== 'object') state.pointsTech = newTechPoints();
    state.pointsTech.solde = (Number(state.pointsTech.solde) || 0) + n.pt;
  }
}

// Version 1.7 : une partie reçoit le niveau qui garde tout ce qu'elle avait
// débloqué : celui de son chapitre (NIVEAUX.CHAPITRE_NIVEAU), ou plus si elle a
// déjà construit un bâtiment ou planté une culture d'un niveau supérieur. Son XP
// est le seuil de ce niveau ; aucun écran de niveau n'est annoncé.
export function migrateLevels(old) {
  const state = { ...old, version: 25 };
  const c = state.campagne;
  const chapitre = c && typeof c === 'object' ? (c.fini ? chapterCount() + 1 : Math.max(1, Math.floor(Number(c.chapitre) || 1))) : 1;
  const N = DATA.NIVEAUX;
  let niveau = N.CHAPITRE_NIVEAU[Math.min(chapitre, N.CHAPITRE_NIVEAU.length) - 1];
  for (const id of Object.keys(N.ELEMENTS)) if (ownsElement(state, id)) niveau = Math.max(niveau, unlockLevel(id));
  for (const p of ownedPlots(state)) if (p && DATA.crops[p.culture]) niveau = Math.max(niveau, unlockLevel(p.culture));
  const list = (x) => (Array.isArray(x) ? x : []);
  for (const p of [...list(state.potager && state.potager.zone2), ...list(state.serre && state.serre.parcelles)]) {
    if (p && DATA.crops[p.culture]) niveau = Math.max(niveau, unlockLevel(p.culture));
  }
  state.progression = { xp: N.SEUILS[niveau - 1], niveau, annonces: [] };
  return state;
}

// Version 1.6 : on garde le panneau et la batterie du plus haut niveau (à niveau
// égal, le moins usé) ; la batterie gardée reçoit la charge de toutes, dans la
// limite de sa capacité. Les appareils retirés sont remboursés de leur prix
// d'achat. Le réservoir prend le niveau de la pompe, dont il suivait la capacité.
export function migrateSingleDevices(old) {
  const state = { ...old, version: 24 };
  const start = startFarm();
  const best = (list) => list.reduce((a, d) => (d.niveau > a.niveau || (d.niveau === a.niveau && d.usure < a.usure) ? d : a));
  let rembourse = 0;
  const keep = (list, type) => {
    const valid = (Array.isArray(list) ? list : []).filter((d) => d && typeof d === 'object');
    if (!valid.length) return start[type === 'panneau' ? 'panneaux' : 'batteries'];
    const d = best(valid);
    for (const x of valid) if (x !== d) rembourse += Math.max(0, Math.round(Number(x.prix) || 0));
    return [{ ...d, id: `${type}-1` }];
  };
  const charge = (Array.isArray(old.batteries) ? old.batteries : []).reduce((t, b) => t + (b && Number(b.chargeMwh) > 0 ? Math.floor(b.chargeMwh) : 0), 0);
  state.panneaux = keep(old.panneaux, 'panneau');
  state.batteries = keep(old.batteries, 'batterie');
  state.batteries[0].chargeMwh = Math.min(charge, batteryCapacity(state.batteries[0]));
  delete state.compteurs;
  const pompe = state.pompe && Number.isInteger(state.pompe.niveau) ? state.pompe.niveau : 1;
  // (avant cette version, le réservoir n'existait pas à part : il suivait la pompe)
  state.reservoir = { niveau: Math.min(DATA.LEVEL_MAX, Math.max(1, pompe)) };
  if (typeof state.pieces === 'number') state.pieces += rembourse;
  return state;
}

export function migrateNoSeasons(old) {
  const state = { ...old, version: 23 };
  const c = state.campagne;
  if (c && typeof c === 'object' && c.compteurs && typeof c.compteurs === 'object') {
    const { hiver, hiverDernier, hiverReussi, ...k } = c.compteurs;
    state.campagne = {
      ...c,
      compteurs: { ...k, tenue: null, tenueDerniere: hiverDernier && typeof hiverDernier === 'object' ? hiverDernier : null, tenueReussie: !!hiverReussi },
    };
  }
  if (state.report && typeof state.report === 'object') {
    const { saison, nuitDeSaison, ...report } = state.report;
    state.report = report;
  }
  return state;
}

export function migrateHappiness(old) {
  const state = { ...old, version: 22, ville: old.ville && typeof old.ville === 'object' ? old.ville : newVille() };
  const f = state.famille;
  if (f && typeof f === 'object' && Array.isArray(f.membres)) {
    state.famille = { ...f, membres: f.membres.map((m) => (m && typeof m === 'object' && typeof m.bonheur !== 'number' ? { ...m, bonheur: DATA.VILLE.BONHEUR.DEPART } : m)) };
  }
  return state;
}

export function migrateWheatAndReserve(old) {
  const state = { ...old, version: 21 };
  if (state.famille && typeof state.famille === 'object') state.famille = { ...state.famille, reserve: {} };
  const inv = state.inventaire && typeof state.inventaire === 'object' ? state.inventaire : null;
  const item = DATA.SILO.ITEM;
  if (inv && Array.isArray(inv[item])) {
    // Le blé déjà stocké part à conservation pleine (comme s'il venait d'être récolté).
    const life = shelfLife(item);
    const qty = inv[item].reduce((t, l) => t + (Number(l && l.qty) || 0), 0);
    state.inventaire = { ...inv };
    if (qty > 0) state.inventaire[item] = [{ qty, nightsLeft: life, origin: defaultOrigin(item) }];
    else delete state.inventaire[item];
  }
  return state;
}

export function migrateFamily12(old) {
  const state = { ...old, version: 18 };
  const f = state.famille;
  if (f && typeof f === 'object' && !Array.isArray(f)) {
    const animaux = Array.isArray(f.animaux) ? f.animaux : [];
    state.famille = { ...f, animaux, numeros: familyNumbers(f.membres, animaux) };
  }
  return state;
}

// Règles de la version 1.1 (v15 → v16). Rien n'est perdu :
// - famille : chaque membre reçoit son profil de départ (prénom = son rôle,
//   sexe de DATA, teinte jaune) ; un profil déjà présent et valide est gardé ;
// - comptes rendus (nuit en cours et réveil en attente) : la liste des
//   nouveaux malades passe des noms aux identifiants ;
// - Étable : les ares deviennent des places (5 a = 1 place, arrondi vers le
//   bas, jamais moins que ce que les animaux occupent) ; les animaux perdent
//   leur poids ; la laine passe de l'ancien rythme (7 nuits) au nouveau (2
//   nuits nourries), à la même proportion et arrondie vers le bas : une laine
//   prête reste prête, 4 à 6 nuits sur 7 deviennent 1 sur 2, 0 à 3 deviennent 0 ;
// - paille : NUITS_PAILLE nuits de paille par mouton et par vache possédés sont
//   offertes, pour que personne ne soit privé de laine ou de lait le premier soir ;
// - ateliers : une préparation d'une recette retirée (en cours ou en file) est
//   terminée tout de suite et son plat va dans l'inventaire ; au Moulin, les
//   moutures en file deviennent du blé en attente du lot en cours ;
// - arbre : un nœud retiré est rendu (points de technologie et pièces).
// Les viandes et les anciens plats de l'inventaire et du frigo ne bougent pas :
// ils restent mangeables et vendables.
export const MIGRATION_11 = { ARES_PAR_PLACE: 5, ANCIENS_JOURS_LAINE: 7, NUITS_PAILLE: 2 };

export function migrateRules11(old) {
  const K = MIGRATION_11;
  const A = DATA.ANIMAUX;
  const P = DATA.PATURAGE;
  const state = JSON.parse(JSON.stringify(old));
  const num = (x, d = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : d);

  // Famille : profil de chaque membre.
  const membres = state.famille && Array.isArray(state.famille.membres) ? state.famille.membres : [];
  for (const m of membres) {
    if (!m || typeof m !== 'object') continue;
    const d = defaultMemberProfile(m);
    m.prenom = validFirstName(m.prenom) ? cleanFirstName(m.prenom) : d.prenom;
    m.genre = DATA.FAMILY.PROFIL.GENRES.includes(m.genre) ? m.genre : d.genre;
    m.teint = Number.isInteger(m.teint) && m.teint >= 0 && m.teint < DATA.FAMILY.PROFIL.TEINTS.length ? m.teint : d.teint;
  }
  // Nouveaux malades : des noms aux identifiants.
  const versId = (x) => {
    const m = membres.find((y) => y && (y.id === x || y.nom === x));
    return m ? m.id : null;
  };
  for (const r of [state.nuit, state.report]) {
    if (r && typeof r === 'object' && Array.isArray(r.nouveauxMalades)) r.nouveauxMalades = r.nouveauxMalades.map(versId).filter(Boolean);
  }

  // Étable : places, animaux sans poids, laine au nouveau rythme.
  const oldP = state.paturage && typeof state.paturage === 'object' ? state.paturage : {};
  const moutons = (Array.isArray(oldP.moutons) ? oldP.moutons : []).filter((m) => m && typeof m === 'object').map((m) => {
    const laine = Math.max(0, num(m.laine));
    const neuve = laine >= K.ANCIENS_JOURS_LAINE ? A.mouton.joursLaine : Math.floor((laine * A.mouton.joursLaine) / K.ANCIENS_JOURS_LAINE);
    return { id: m.id, laine: Math.min(A.mouton.joursLaine, neuve) };
  });
  const vaches = (Array.isArray(oldP.vaches) ? oldP.vaches : []).filter((v) => v && typeof v === 'object').map((v) => ({ id: v.id }));
  const occupees = moutons.length * P.placesParMouton + vaches.length * P.placesParVache;
  const construit = !!oldP.construit;
  const places = 'places' in oldP ? Math.max(0, Math.floor(num(oldP.places))) : Math.floor(Math.max(0, num(oldP.ares)) / K.ARES_PAR_PLACE);
  state.paturage = {
    construit,
    places: construit ? Math.max(places, occupees, P.placesDepart) : Math.max(places, occupees),
    compteur: num(oldP.compteur),
    compteurVache: num(oldP.compteurVache),
    moutons,
    vaches,
  };

  // Paille offerte : quelques nuits d'avance pour les animaux déjà là.
  if (!state.inventaire || typeof state.inventaire !== 'object') state.inventaire = {};
  const cadeau = K.NUITS_PAILLE * (moutons.length * A.mouton.pailleParNuit + vaches.length * A.vache.pailleParNuit);
  if (cadeau > 0) addItem(state, P.nourriture, cadeau);

  // Ateliers : recettes retirées terminées, moutures en file regroupées.
  const stations = state.stations && typeof state.stations === 'object' ? state.stations : {};
  for (const [id, st] of Object.entries(stations)) {
    if (!st || typeof st !== 'object') continue;
    const file = Array.isArray(st.file) ? st.file : [];
    const gardees = [];
    let moutures = 0;
    for (const e of file) {
      const r = e && e.recette;
      if (DATA.PLATS_RETIRES[r]) addItem(state, r, 1);
      else if (id === 'moulin' && DATA.recipes[r] && DATA.recipes[r].horsLivre) moutures += 1;
      else if (DATA.recipes[r]) gardees.push(e);
    }
    if (st.tache && DATA.PLATS_RETIRES[st.tache.recette]) {
      addItem(state, st.tache.recette, 1);
      st.tache = null;
    } else if (st.tache && !DATA.recipes[st.tache.recette]) {
      st.tache = null;
    }
    if (id === 'moulin') {
      if (st.tache) {
        st.tache.enAttente = Math.max(0, Math.floor(num(st.tache.enAttente))) + moutures;
      } else if (moutures > 0) {
        const temps = DATA.recipes.farine.temps * 1000;
        st.tache = { recette: 'farine', resteMs: temps, dureeMs: temps, enAttente: moutures - 1 };
      }
    } else if (!st.tache && gardees.length) {
      const temps = DATA.recipes[gardees[0].recette].temps * 1000;
      st.tache = { recette: gardees.shift().recette, resteMs: temps, dureeMs: temps };
    }
    if (Array.isArray(st.file)) st.file = gardees;
  }

  // Arbre : nœuds retirés rendus.
  if (Array.isArray(state.technologies)) {
    for (const [id, n] of Object.entries(DATA.techtree.NOEUDS_RETIRES)) {
      if (!state.technologies.includes(id)) continue;
      state.technologies = state.technologies.filter((x) => x !== id);
      state.pieces = Math.round(num(state.pieces) + n.cout);
      if (!state.pointsTech || typeof state.pointsTech !== 'object') state.pointsTech = newTechPoints();
      state.pointsTech.solde = num(state.pointsTech.solde) + n.pt;
    }
  }

  // Comptes rendus : la nuit à l'Étable (vide pour une nuit d'avant la 1.1).
  if (state.nuit && typeof state.nuit === 'object' && !state.nuit.etable) state.nuit.etable = newStableReport();
  state.version = 16;
  return state;
}

// Fusion du Potager et du Champ (v14 → v15). Les parcelles du Champ rejoignent
// celles du Potager, à la suite, avec tout ce qu'elles portent (culture, stade,
// arrosage, montée en graine, réglage du semis automatique) ; elles prennent le
// lieu et les identifiants de la zone (« potager-n », comme makePlot()). Le
// niveau de la zone est le plus petit dont la capacité contient toutes les
// parcelles possédées ; des parcelles vides complètent jusqu'à cette capacité.
// Au-delà de la capacité maximale (l'ancien maximum était 20 + 16 = 36, pour
// 30) : les parcelles vides partent d'abord, puis les plantes les moins
// avancées, et chaque plante retirée est rendue sous forme d'une graine (ou
// d'un plant) dans l'inventaire.
export function migrateCropZone(old) {
  const state = JSON.parse(JSON.stringify(old));
  const P = DATA.POTAGER;
  const max = P.PARCELLES_V1[P.PARCELLES_V1.length - 1];
  const plotsOf = (b) => (b && Array.isArray(b.parcelles) ? b.parcelles.filter((p) => p && typeof p === 'object') : []);
  const potager = state.potager && typeof state.potager === 'object' ? state.potager : {};
  let plots = [...plotsOf(potager), ...plotsOf(legacyChamp(state))];
  if (plots.length > max) {
    const planted = (p) => (p.culture ? 1 : 0);
    const stade = (p) => (typeof p.stade === 'number' ? p.stade : 0);
    const rang = plots.map((p, i) => ({ p, i }))
      .sort((a, b) => (planted(b.p) - planted(a.p)) || (stade(b.p) - stade(a.p)) || (a.i - b.i));
    const gardees = new Set(rang.slice(0, max).map((x) => x.i));
    if (!state.inventaire || typeof state.inventaire !== 'object') state.inventaire = {};
    for (const x of rang.slice(max)) {
      if (x.p.culture && DATA.crops[x.p.culture]) addItem(state, seedItem(x.p.culture), 1);
    }
    plots = plots.filter((p, i) => gardees.has(i));
  }
  const niveau = Math.max(1, P.PARCELLES_V1.findIndex((n) => n >= plots.length) + 1);
  const parcelles = [];
  for (let n = 1; n <= P.PARCELLES_V1[niveau - 1]; n++) {
    const neuve = makePlot(n);
    parcelles.push(n <= plots.length ? { ...neuve, ...plots[n - 1], id: neuve.id, lieu: neuve.lieu } : neuve);
  }
  state.potager = { ...potager, niveau, parcelles };
  delete state.champ;
  // Comptes rendus des automatisations (nuit en cours et réveil en attente) :
  // l'ancienne ligne du Champ rejoint celle de la zone.
  for (const auto of [state.nuit && state.nuit.auto, state.report && state.report.auto]) {
    if (auto && typeof auto === 'object' && 'champ' in auto) {
      auto.potager = !!(auto.potager || auto.champ);
      delete auto.champ;
    }
  }
  state.version = 15;
  return state;
}

// Offre un nœud (et, si `avecPrerequis`, ses prérequis de type nœud) sans rien payer.
export function grantTech(state, id, avecPrerequis = true) {
  const n = DATA.techtree.noeuds[id];
  if (!n) return;
  if (!Array.isArray(state.technologies)) state.technologies = [];
  if (avecPrerequis) for (const r of n.requiert) if (r.noeud) grantTech(state, r.noeud, true);
  if (!state.technologies.includes(id)) state.technologies.push(id);
}

export function migrateTechTreeV2(old) {
  const state = JSON.parse(JSON.stringify(old));
  if (!Array.isArray(state.technologies)) state.technologies = [];
  const pt = newTechPoints();
  const c = state.campagne;
  if (c) {
    const faits = c.fini ? chapterCount() : Math.max(0, (c.chapitre || 1) - 1);
    for (let i = 0; i < faits; i++) pt.solde += DATA.techtree.POINTS.CHAPITRES[i] || 0;
    pt.gagnes = pt.solde;
    if (c.compteurs) c.compteurs.nuits100 = (c.historique || []).filter((h) => h.pct >= 100).length;
  }
  state.pointsTech = pt;
  const niveau = (id) => {
    if (id === 'potager') return state.potager ? state.potager.niveau : 0;
    const b = state[id];
    return b && b.construit ? b.niveau : 0;
  };
  const built = (id) => !!((state.stations && state.stations[id] && state.stations[id].construit) || (state[id] && state[id].construit));
  // Automatisations de l'ancien niveau 5 (avec leurs prérequis de type nœud).
  if (niveau('potager') >= 5 || niveau('champ') >= 5) {
    grantTech(state, 'ea_irrigation');
    grantTech(state, 'cu_recolte_auto');
  }
  if (niveau('poulailler') >= 5) grantTech(state, 'el_mangeoire');
  // Recettes déjà accessibles : nœuds de recettes offerts seuls.
  if (built('four')) grantTech(state, 'cui_boulangerie', false);
  if (built('paturage')) grantTech(state, 'cui_laiterie', false);
  if (built('cuisine')) grantTech(state, 'cui_conserverie', false);
  if (built('serre')) grantTech(state, 'cui_epicerie', false);
  state.version = 14;
  return state;
}

// Conversion d'une sauvegarde v12 (décimales) vers les unités entières de la v13.
export function migrateToIntegers(old) {
  const num = (x, d = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
  const state = JSON.parse(JSON.stringify(old));
  const msParPoint = DATA.WEAR.HEURES_PAR_POINT * DATA.TIME.SECONDS_PER_HOUR * 1000;
  state.pieces = Math.round(num(state.pieces));
  // Marché : coefficients 1,3 → 130 %.
  const marche = {};
  for (const [item, c] of Object.entries(state.marche || {})) marche[item] = Math.round(num(c) * 100);
  state.marche = marche;
  // Temps d'éveil en ms.
  // (un champ déjà au nouveau format est gardé tel quel)
  state.awakeMs = 'awakeSeconds' in state ? Math.round(num(state.awakeSeconds) * 1000) : Math.round(num(state.awakeMs));
  delete state.awakeSeconds;
  // Appareils : usure entière (+ reste en temps de marche), prix entier, charge en mWh.
  const device = (d) => {
    if (!d || typeof d !== 'object') return d;
    const u = Math.max(0, num(d.usure));
    d.usure = Math.floor(u);
    d.usureMs = Math.round((u - d.usure) * msParPoint);
    if (typeof d.prix === 'number') d.prix = Math.ceil(d.prix - 1e-9);
    if ('charge' in d) {
      d.chargeMwh = Math.floor(num(d.charge) * 1e6);
      delete d.charge;
    }
    for (const k of ['entree', 'sortie', 'prod', 'debit', 'conso']) if (k in d) d[k] = 0;
    return d;
  };
  for (const d of state.panneaux || []) device(d);
  for (const d of state.batteries || []) device(d);
  device(state.pompe);
  for (const st of Object.values(state.stations || {})) {
    if (st && st.appareil) device(st.appareil);
    if (st && st.tache && 'reste' in st.tache) {
      st.tache.resteMs = Math.ceil(num(st.tache.reste) * 1000);
      st.tache.dureeMs = Math.ceil(num(st.tache.duree, num(st.tache.reste)) * 1000);
      delete st.tache.reste;
      delete st.tache.duree;
    }
  }
  if (state.frigo && typeof state.frigo === 'object') {
    device(state.frigo.appareil);
    if ('alimenteS' in state.frigo) state.frigo.alimenteMs = Math.round(num(state.frigo.alimenteS) * 1000);
    if ('eveilS' in state.frigo) state.frigo.eveilMs = Math.round(num(state.frigo.eveilS) * 1000);
    state.frigo.alimenteMs = num(state.frigo.alimenteMs);
    state.frigo.eveilMs = num(state.frigo.eveilMs);
    delete state.frigo.alimenteS;
    delete state.frigo.eveilS;
  }
  // Eau du réservoir en mL.
  state.eauMl = 'eau' in state ? Math.floor(num(state.eau) * 1000) : num(state.eauMl);
  delete state.eau;
  state.flux = { perdue: 0, eau: 0 };
  if (state.jour) {
    state.jour.produite = Math.floor(num(state.jour.produite) * 1e6);
    state.jour.perdue = Math.floor(num(state.jour.perdue) * 1e6);
    state.jour.eau = Math.floor(num(state.jour.eau) * 1000);
    state.jour.ble = Math.ceil(num(state.jour.ble) - 1e-9);
  }
  // Blé et stocks entiers (le blé pouvait compter des demis).
  if (state.silo) state.silo.ble = Math.floor(num(state.silo.ble));
  for (const [item, lots] of Object.entries(state.inventaire || {})) {
    if (!Array.isArray(lots)) continue;
    state.inventaire[item] = lots.map((l) => ({ ...l, qty: Math.floor(num(l.qty)) })).filter((l) => l.qty > 0);
    if (!state.inventaire[item].length) delete state.inventaire[item];
  }
  if (state.poulailler) state.poulailler.restes = 0;
  // Pâturage en ares, poids en hg (ces deux unités disparaissent en version 16 :
  // voir migrateRules11()).
  if (state.paturage) {
    const { ha, ares, construit, ...autres } = state.paturage;
    state.paturage = { construit, ares: ha !== undefined ? Math.round(num(ha) * 100) : num(ares), ...autres };
    for (const a of [...(state.paturage.moutons || []), ...(state.paturage.vaches || [])]) a.poids = Math.round(num(a.poids) * 10);
  }
  // Campagne : compteurs et historique d'autonomie entiers.
  const c = state.campagne;
  if (c && c.compteurs) {
    const k = c.compteurs;
    k.eauMl = 'litres' in k ? Math.floor(num(k.litres) * 1000) : num(k.eauMl);
    k.mwhMax = 'kwhMax' in k ? Math.floor(num(k.kwhMax) * 1e6) : num(k.mwhMax);
    delete k.litres;
    delete k.kwhMax;
    // (noms d'avant la version 1.6 : l'hiver est devenu la tenue, voir migrateNoSeasons())
    if (k.hiver && typeof k.hiver === 'object') k.hiver.somme = Math.floor(num(k.hiver.somme));
    if (k.hiverDernier) k.hiverDernier.moyenne = Math.floor(num(k.hiverDernier.moyenne));
  }
  if (c && Array.isArray(c.historique)) c.historique = c.historique.map((h) => ({ ...h, pct: Math.floor(num(h.pct)) }));
  state.report = null;
  state.version = 13;
  return state;
}

// Applique les migrations successives à une sauvegarde { v, t, s } (ou à un
// état brut) jusqu'à atteindre la version courante. Ne lance jamais
// d'exception : une entrée invalide retombe sur un état migré au mieux.
export function migrate(save) {
  let state = save && typeof save === 'object' && save.s && typeof save.s === 'object'
    ? { ...save.s }
    : (save && typeof save === 'object' ? { ...save } : {});
  let version = typeof state.version === 'number' ? state.version : 0;
  let guard = 0;
  while (MIGRATIONS[version] && guard < 1000) {
    state = MIGRATIONS[version](state);
    version = typeof state.version === 'number' ? state.version : version + 1;
    guard++;
  }
  if (typeof state.version !== 'number') state.version = version;
  return state;
}
