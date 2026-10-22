import { DATA } from './catalog.js';
import { unlockTab } from './base.js';
import { deviceLabel, fail, farmOpen, isOwned, NO_COINS, pay, starterOf } from './devices.js';
import { lotsFromCounts } from './inventory.js';
import { createInitialState } from './state.js';
import { cleanFirstName, familyNumbers, findMember, makeMember, persoMax, validFirstName } from './family.js';
import { updateChapters } from './campaign.js';
import { startPlots } from './crops.js';
import { farmTerrain } from './terrain.js';
import { atelierOuvert } from './atelier.js';
import { couchages } from './blocs.js';

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
  // la graine de la carte de transition (js/engine/transition.js) quand la ferme n'est pas générée
  state.graineVoisins = String(seed);
  state.pieces = D.PIECES;
  state.compta = [];
  state.inventaire = lotsFromCounts(D.INVENTAIRE);
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

/* -- la ferme : celle du grand-père (dessinée) ou une ferme générée -- */

// La partie passe sur la ferme générée d'après `graine` (null : la ferme dessinée, celle de
// Tiled ; docs/carte-generee.md). Les terres, les arbres abattus et les rochers cassés de
// l'autre carte n'ont pas de sens sur celle-ci : la partie repart des parcelles de départ (une
// partie neuve, sans terre, n'en reçoit pas), tous les arbres debout et tous les rochers entiers.
export function setFarmSeed(state, graine) {
  if (graine === null || graine === undefined || graine === '') delete state.carte;
  else state.carte = { graine: String(graine) };
  state.potager.parcelles = state.potager.parcelles.length ? startPlots(farmTerrain(state)) : [];
  if (state.outils) { state.outils.arbres = {}; state.outils.rochers = {}; }
  return { ok: true, graine: state.carte ? state.carte.graine : null };
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

// L'accueil d'une nouvelle partie (js/ui/depart.js) : la famille telle que le joueur l'a
// décrite, d'un coup, à la place de celle de DATA.FAMILLE.MEMBRES. `choix` :
//   { perso, prenom, nom,                      le personnage principal (un adulte) et le nom de famille
//     compagnon: { perso, prenom } | null,     un second adulte
//     enfants: [{ prenom, perso? }],           perso : un personnage d'enfant (sinon le défaut)
//     animaux: [{ espece, nom }] }             des chiens ou des chats
// Tout est vérifié avant de rien changer. Les identifiants : adulte-1 (le principal),
// adulte-2, enfant-1…, compagnon-1…
export function composeFamily(state, choix = {}) {
  const C = DATA.FAMILLE.COMPOSITION, K = DATA.FAMILLE.COMPAGNIE, P = DATA.FAMILLE.PROFIL;
  const prenomOk = (t, qui) => (validFirstName(t) ? '' : `${qui} : un prénom de 1 à ${P.PRENOM_MAX} signes.`);
  const persoOk = (n, enfant) => Number.isInteger(n) && n >= 1 && n <= persoMax({ enfant });
  const compagnon = choix.compagnon || null;
  const enfants = Array.isArray(choix.enfants) ? choix.enfants : [];
  const animaux = Array.isArray(choix.animaux) ? choix.animaux : [];
  if (!persoOk(choix.perso, false)) return fail('Choisis un personnage.');
  let err = prenomOk(choix.prenom, 'Ton personnage');
  if (err) return fail(err);
  const nom = String(choix.nom || '').trim().replace(/\s+/g, ' ');
  if (nom.length < DATA.DEPART.NOM_MIN || nom.length > DATA.DEPART.NOM_MAX) return fail(`Le nom fait de ${DATA.DEPART.NOM_MIN} à ${DATA.DEPART.NOM_MAX} signes.`);
  if (compagnon) {
    if (!persoOk(compagnon.perso, false)) return fail('Choisis le personnage du compagnon.');
    if ((err = prenomOk(compagnon.prenom, 'Le compagnon'))) return fail(err);
  }
  if (1 + (compagnon ? 1 : 0) + enfants.length > C.MEMBRES_MAX) return fail(`La famille compte ${C.MEMBRES_MAX} membres au plus.`);
  for (const [i, e] of enfants.entries()) {
    if ((err = prenomOk(e && e.prenom, `L'enfant ${i + 1}`))) return fail(err);
    if (e.perso !== undefined && !persoOk(e.perso, true)) return fail('Personnage d\'enfant inconnu.');
  }
  if (animaux.length > K.MAX) return fail(`${K.MAX} animaux de compagnie au plus.`);
  for (const a of animaux) {
    if (!a || !K.ESPECES[a.espece]) return fail('Cet animal ne s\'adopte pas.');
    if (!validFirstName(a.nom)) return fail(`Le nom d'un animal fait de 1 à ${P.PRENOM_MAX} signes.`);
  }
  const membre = (id, enfant, n, def) => {
    const m = makeMember({ id, nom: `${enfant ? 'Enfant' : 'Adulte'} ${n}`, enfant });
    m.prenom = cleanFirstName(def.prenom);
    if (def.perso !== undefined) m.perso = def.perso;
    return m;
  };
  const f = state.famille;
  f.membres = [membre('adulte-1', false, 1, choix)];
  if (compagnon) f.membres.push(membre('adulte-2', false, 2, compagnon));
  enfants.forEach((e, i) => f.membres.push(membre(`enfant-${i + 1}`, true, i + 1, e)));
  f.animaux = animaux.map((a, i) => ({ id: `compagnon-${i + 1}`, espece: a.espece, nom: cleanFirstName(a.nom) }));
  f.numeros = familyNumbers(f.membres, f.animaux);
  f.nom = nom;
  f.principal = 'adulte-1';
  return { ok: true, membres: f.membres.length, animaux: f.animaux.length };
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

// La maison est-elle réparée ? Sur la ferme générée (docs/carte-generee.md, étape 5b), il n'y a
// pas de maison : le foyer est une pièce close avec une paillasse (js/engine/blocs.js).
export function houseRepaired(state) {
  if (atelierOuvert(state)) return couchages(state).length > 0;
  return !(state.maison && state.maison.reparee === false);
}

export function repairHouse(state) {
  if (atelierOuvert(state)) return fail('Sur une terre sauvage, pas de maison à réparer : bâtis une pièce close (des murs, une porte) et pose-y une paillasse.');
  if (houseRepaired(state)) return fail('La maison est déjà réparée.');
  const cost = DATA.DEPART.MAISON;
  if (!pay(state, cost, 'Réparation de la maison')) return fail(NO_COINS);
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
  if (atelierOuvert(state)) return fail(`Sur une terre sauvage, ${deviceLabel(type).toLowerCase()} se fabrique à l'Atelier et se pose sur la carte (🔨).`);
  const raison = starterBlock(state, type);
  if (raison) return fail(raison);
  const cost = DATA.DEPART.ACHATS[type];
  if (!pay(state, cost, `Achat : ${deviceLabel(type)}`)) return fail(NO_COINS);
  installStarter(state, type);
  return { ok: true, cost, ouvert: farmOpen(state) };
}

// L'appareil de départ `type` est là (acheté, ou posé sur la ferme générée : blocs.js), allumé
// sauf le réservoir ; son prix (entretien, réparation) est celui de DEPART.ACHATS.
export function installStarter(state, type) {
  const obj = starterOf(state, type);
  obj.achete = true;
  if (type !== 'reservoir') {
    obj.allume = true;
    obj.prix = DATA.DEPART.ACHATS[type]; // entretien et réparation suivent le prix payé
  }
  // panneau et pompe : la Zone de culture et le Marché s'ouvrent
  if (farmOpen(state)) unlockTab(state, 'comptoir');
  updateChapters(state);
}

// L'appareil de départ `type` n'est plus là (son bloc repris, sur la ferme générée).
export function removeStarter(state, type) {
  const obj = starterOf(state, type);
  obj.achete = false;
  if (type !== 'reservoir') obj.allume = false;
}
