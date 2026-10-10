import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { fail, farmOpen, isOwned, spend, starterOf } from './devices.js';
import { defaultOrigin, shelfLife } from './inventory.js';
import { createInitialState } from './state.js';
import { findMember } from './family.js';
import { updateChapters } from './campaign.js';

/* ---------- version 1.12 (v2, lot 8) : le départ d'une nouvelle partie ---------- */

// Une nouvelle partie (docs/conception-v2.md, sections 2 et 3) : la famille hérite de la
// ferme du grand-père. La maison est à réparer, le panneau, la batterie, la pompe et le
// réservoir sont à acheter, la Zone de culture est en herbe et il n'y a ni houe ni
// graines : seulement DATA.DEPART.INVENTAIRE et DATA.DEPART.PIECES. `famille` : la
// configuration choisie avant la partie ({ nom, principal }) ; sans elle, l'écran de
// configuration s'ouvre au lancement (famille.configuree === false).
export function createNewGame(seed = 1, famille = null) {
  const D = DATA.DEPART;
  const state = createInitialState(seed);
  state.departV2 = true;
  state.pieces = D.PIECES;
  state.inventaire = {};
  for (const [item, qty] of Object.entries(D.INVENTAIRE)) {
    state.inventaire[item] = [{ qty, nightsLeft: shelfLife(item), origin: defaultOrigin(item) }];
  }
  state.potager.parcelles = [];
  state.potager.houe = false;
  for (const type of ['panneau', 'batterie', 'pompe']) {
    const d = starterOf(state, type);
    d.achete = false;
    d.allume = false;
  }
  state.reservoir.achete = false;
  state.maison = { reparee: false };
  state.unlockedTabs = state.unlockedTabs.filter((t) => t !== 'comptoir');
  state.famille.nom = D.NOM;
  state.famille.principal = state.famille.membres.find((m) => !m.enfant).id;
  state.famille.configuree = false;
  if (famille) {
    const r = setupFamily(state, famille);
    if (!r.ok) throw new Error(r.error);
    finishSetup(state);
  }
  return state;
}

/* -- la famille -- */

export function familyName(state) {
  return (state.famille && state.famille.nom) || '';
}

// Le personnage principal : celui qui porte la jauge d'énergie (un adulte).
export function mainCharacter(state) {
  const f = state.famille;
  return findMember(state, f.principal) || f.membres.find((m) => !m.enfant) || f.membres[0] || null;
}

export function setFamilyName(state, nom) {
  const D = DATA.DEPART;
  const n = String(nom || '').trim().replace(/\s+/g, ' ');
  if (n.length < D.NOM_MIN || n.length > D.NOM_MAX) return fail(`Le nom de famille fait de ${D.NOM_MIN} à ${D.NOM_MAX} signes.`);
  state.famille.nom = n;
  return { ok: true, nom: n };
}

export function setMainCharacter(state, id) {
  const m = findMember(state, id);
  if (!m) return fail('Membre introuvable.');
  if (m.enfant) return fail('Le personnage principal est un adulte.');
  state.famille.principal = id;
  return { ok: true, id };
}

// Réglages de l'écran de configuration : { nom, principal } (les membres se règlent
// avec les fonctions habituelles de la Famille).
export function setupFamily(state, { nom, principal } = {}) {
  if (nom !== undefined) {
    const r = setFamilyName(state, nom);
    if (!r.ok) return r;
  }
  if (principal !== undefined) {
    const r = setMainCharacter(state, principal);
    if (!r.ok) return r;
  }
  return { ok: true };
}

// Fin de la configuration : la partie commence (la lettre du notaire arrive).
export function finishSetup(state) {
  const f = state.famille;
  if (f.configuree) return fail('La famille est déjà installée.');
  if (!mainCharacter(state) || mainCharacter(state).enfant) return fail('Choisis un adulte comme personnage principal.');
  f.principal = mainCharacter(state).id;
  f.configuree = true;
  updateChapters(state);
  return { ok: true };
}

export function setupPending(state) {
  return !!(state.famille && state.famille.configuree === false);
}

/* -- la maison et les achats -- */

export function houseRepaired(state) {
  return !(state.maison && state.maison.reparee === false);
}

export function repairHouse(state) {
  if (houseRepaired(state)) return fail('La maison est déjà réparée.');
  const cost = DATA.DEPART.MAISON;
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  state.maison.reparee = true;
  updateChapters(state);
  return { ok: true, cost };
}

// Ce qui empêche d'acheter un appareil de départ (texte), ou '' s'il peut l'être.
export function starterBlock(state, type) {
  const obj = starterOf(state, type);
  if (!obj || !(type in DATA.DEPART.ACHATS)) return 'Appareil inconnu.';
  if (isOwned(obj)) return 'Déjà acheté.';
  if (!houseRepaired(state)) return 'Répare d\'abord la maison.';
  if (type === 'reservoir' && !farmOpen(state)) return 'Achète d\'abord le panneau et la pompe.';
  return '';
}

export function buyStarter(state, type) {
  const raison = starterBlock(state, type);
  if (raison) return fail(raison);
  const cost = DATA.DEPART.ACHATS[type];
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  const obj = starterOf(state, type);
  obj.achete = true;
  if (type !== 'reservoir') {
    obj.allume = true;
    obj.prix = cost; // entretien et réparation suivent le prix payé
  }
  // panneau et pompe : la Zone de culture et le Marché s'ouvrent
  if (farmOpen(state) && !state.unlockedTabs.includes('comptoir')) state.unlockedTabs.push('comptoir');
  updateChapters(state);
  return { ok: true, cost, ouvert: farmOpen(state) };
}
