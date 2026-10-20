import { DATA } from './catalog.js';
import { unlockTab } from './base.js';
import { batteryCapacity, fail, findDevice, isBroken, tankCapacity } from './devices.js';
import { noteCompta } from './compta.js';
import { awakeMsAtHour } from './clock.js';
import { addItem, spoil } from './inventory.js';
import { openFridge } from './fridge.js';
import { allPlots, makePlot, maxStage, openSerre, seedItem, zoneTile } from './crops.js';
import { farmSeed, farmTerrain } from './terrain.js';
import { coopCapacity, freeCowPlaces, freeSheepPlaces, makeCow, makeSheep, storeWheat } from './animals.js';
import { openVerger } from './orchard.js';
import { openStation } from './kitchen.js';
import { grantTechPoints, refreshUnlocks } from './techtree.js';
import { chapterCount, completeChapter, newCampaignCounters } from './campaign.js';
import { sleep } from './night.js';
import { setFarmSeed } from './depart.js';
import { gainXp, levelCount } from './levels.js';

/* ---------- actions du mode test ---------- */

// La ferme générée (docs/carte-generee.md, étape 2) : la partie passe sur la ferme de la
// graine `graine` (null : revient à la carte de Tiled). Les terres, les arbres abattus et les
// rochers cassés de l'autre carte n'ont pas de sens ici : la partie repart des parcelles de
// départ, tous les arbres debout et tous les rochers entiers.
export function testFarmMap(state, graine) {
  return setFarmSeed(state, graine);
}

export function testAddPieces(state, amount) {
  state.pieces = Math.round(state.pieces + amount);
  noteCompta(state, Math.round(amount), 'Mode test');
  refreshUnlocks(state);
  return { ok: true };
}

// Lot 7 : met un bâtiment au niveau 5 (potager, poulailler, silo), sans
// payer : le bâtiment est construit s'il ne l'était pas et ses parcelles ou sa
// capacité suivent le niveau.
// Version 1.9 : toutes les cases d'une zone en terre (sans plafond, énergie ni XP), avec la houe.
// Version 1.15 : les cases de l'ancienne zone (1 : 30 tuiles, 2 : les 64 du Champ), sur la carte.
export function testHoeAll(state, zone = 1) {
  state.potager.houe = true;
  const list = state.potager.parcelles;
  let n = list.reduce((m, p) => Math.max(m, Number((/^potager-(\d+)$/.exec(p.id) || [0, 0])[1])), 0);
  const cases = zone === 2 ? DATA.POTAGER.ZONE2.CASES : DATA.POTAGER.CASES;
  for (let c = 0; c < cases; c++) {
    const tile = zoneTile(zone, c, farmTerrain(state));
    if (list.some((p) => p.case === tile)) continue;
    n += 1;
    list.push({ ...makePlot(n), case: tile });
  }
  list.sort((a, b) => a.case - b.case);
  return { ok: true };
}

export function testSetBuildingLevel5(state, id) {
  const niveau = DATA.NIVEAU_MAX;
  if (id === 'potager') {
    // version 1.9 : toute la Zone de culture en terre (au-delà du plafond), avec la houe
    testHoeAll(state, 1);
  } else if (id === 'poulailler' || id === 'silo') {
    state[id].construit = true;
    state[id].niveau = niveau;
  } else if (id === 'panneau' || id === 'batterie') {
    (id === 'panneau' ? state.panneaux : state.batteries)[0].niveau = niveau;
  } else if (id === 'pompe' || id === 'reservoir') {
    state[id].niveau = niveau;
  } else {
    return fail('Bâtiment inconnu.');
  }
  return { ok: true };
}

// Lot 7 : débloque tous les nœuds de l'arbre, sans payer ni vérifier les
// prérequis, et ouvre l'onglet.
// Arbre v2 : +n points de technologie (mode test).
export function testAddTechPoints(state, n = 10) {
  grantTechPoints(state, n, 'Mode test');
  return { ok: true };
}

export function testUnlockAllTechs(state) {
  state.technologies = Object.keys(DATA.ARBRE.noeuds);
  unlockTab(state, DATA.TECHNO.ONGLET);
  return { ok: true };
}

export function testFillBatteries(state) {
  for (const b of state.batteries) b.chargeMwh = batteryCapacity(b);
  return { ok: true };
}

export function testFillTank(state) {
  state.eauMl = tankCapacity(state);
  return { ok: true };
}

export function testSetWear(state, id, usure) {
  const d = findDevice(state, id);
  if (!d) return fail('Appareil introuvable.');
  d.usure = Math.max(0, Math.min(DATA.USURE.PANNE, Math.round(usure)));
  d.usureMs = 0;
  if (isBroken(d)) d.allume = false;
  return { ok: true };
}

// Version 1.19 : l'horloge saute à 21 h 50 (la nuit commence peu après).
export function testSkipAwake(state) {
  if (state.nuitEnCours) return fail('C\'est déjà la nuit.');
  state.awakeMs = Math.max(state.awakeMs, awakeMsAtHour(DATA.TEMPS.HEURE_NUIT) - DATA.TEMPS.SECONDES_PAR_HEURE * 1000 / 6);
  return { ok: true };
}

// Lot 2 : 10 de chaque graine (et de chaque plant).
export function testAddSeeds(state) {
  for (const culture of Object.keys(DATA.CULTURES)) addItem(state, seedItem(culture), 10);
  return { ok: true };
}

// Lot 4 : +50 blés, rangés comme une récolte (Silo d'abord, surplus dans
// l'inventaire).
export function testAddWheat(state, qty = 50) {
  storeWheat(state, qty);
  return { ok: true };
}

// Lot 4 : +4 poules, dans la limite de la capacité. Le Poulailler est construit
// gratuitement s'il ne l'était pas (pas sur la ferme générée).
export function testAddHens(state, count = 4) {
  const p = state.poulailler;
  // la ferme générée : le Poulailler se bâtit (enceinte, nichoir, enclos : blocs.js)
  if (farmSeed(state) !== null && !p.construit) return fail('Bâtis d\'abord le Poulailler : une enceinte avec une porte sur le dehors, un nichoir et un enclos de barrières.');
  if (!p.construit) {
    p.construit = true;
    p.niveau = 1;
  }
  p.poules = Math.min(coopCapacity(state), p.poules + count);
  return { ok: true };
}

// Lot 6 : +3 moutons, dans la limite des places libres. L'Étable est ouverte
// gratuitement si elle ne l'était pas.
export function testAddSheep(state, count = 3) {
  const p = state.paturage;
  // la ferme générée : l'Étable se bâtit (enceinte, mangeoire, enclos : blocs.js)
  if (farmSeed(state) !== null && !p.construit) return fail('Bâtis d\'abord l\'Étable : une enceinte avec une porte sur le dehors, une mangeoire et un enclos de barrières.');
  if (!p.construit) {
    p.construit = true;
    p.places = DATA.PATURAGE.PLACES_DEPART;
  }
  const n = Math.min(count, freeSheepPlaces(state));
  for (let i = 0; i < n; i++) p.moutons.push(makeSheep(state));
  return { ok: true, added: n };
}

// Lot 6 : la laine de tous les moutons est prête à tondre.
export function testWoolReady(state) {
  for (const m of state.paturage.moutons) m.laine = DATA.ANIMAUX.mouton.joursLaine;
  return { ok: true };
}

// +2 vaches, dans la limite des places libres, sur le modèle de testAddSheep().
export function testAddCows(state, count = 2) {
  const p = state.paturage;
  // la ferme générée : l'Étable se bâtit (enceinte, mangeoire, enclos : blocs.js)
  if (farmSeed(state) !== null && !p.construit) return fail('Bâtis d\'abord l\'Étable : une enceinte avec une porte sur le dehors, une mangeoire et un enclos de barrières.');
  if (!p.construit) {
    p.construit = true;
    p.places = DATA.PATURAGE.PLACES_DEPART;
  }
  const n = Math.min(count, freeCowPlaces(state));
  for (let i = 0; i < n; i++) p.vaches.push(makeCow(state));
  return { ok: true, added: n };
}

// Version 1.1 : +20 pailles.
export function testAddStraw(state, qty = 20) {
  addItem(state, DATA.PATURAGE.NOURRITURE, qty);
  return { ok: true };
}

// Lot 5 : construit toutes les stations gratuitement (Four, Cuisine, Moulin,
// Presse) : l'onglet Livre de recette s'ouvre.
export function testBuildStations(state) {
  for (const id of Object.keys(DATA.STATIONS)) openStation(state, id);
  return { ok: true };
}

export function testAddFlour(state, qty = 10) {
  addItem(state, 'farine', qty);
  return { ok: true };
}

export function testAddOil(state, qty = 10) {
  addItem(state, 'huile', qty);
  return { ok: true };
}

export function testAddEggs(state, qty = 20) {
  addItem(state, 'oeuf', qty);
  return { ok: true };
}

// Lot 5 : le Moulin passe à 100 % d'usure (panne).
export function testWearMill(state) {
  const d = state.stations.moulin.appareil;
  if (!d) return fail('Construis d\'abord le Moulin.');
  return testSetWear(state, d.id, DATA.USURE.PANNE);
}

// Lot 9 : valide le chapitre en cours sans remplir son objectif (le suivant
// s'ouvre, son écran de fin apparaît). Après le chapitre 7, la campagne est finie.
export function testCompleteChapter(state) {
  return completeChapter(state);
}

// Lot 9 : va au chapitre `n` (1 à 7) ; n = 8 termine la campagne (mode libre, tout
// débloqué). Les compteurs du chapitre repartent à zéro (sinon un objectif déjà
// rempli le validerait aussitôt) et les écrans de fin en attente sont oubliés ;
// l'historique d'autonomie est conservé.
export function testGoToChapter(state, n) {
  const c = state.campagne;
  const target = Math.floor(Number(n));
  if (!c || !(target >= 1 && target <= chapterCount() + 1)) return fail('Chapitre inconnu.');
  c.compteurs = newCampaignCounters();
  c.annonces = [];
  c.fini = target > chapterCount();
  c.chapitre = c.fini ? chapterCount() : target;
  // version 1.7 : et au niveau d'un joueur arrivé à ce chapitre (NIVEAUX.CHAPITRE_NIVEAU)
  testSetLevel(state, DATA.NIVEAUX.CHAPITRE_NIVEAU[target - 1]);
  return { ok: true, chapitre: c.chapitre, fini: c.fini };
}

// Version 1.7 : place la partie au début d'un niveau (XP = son seuil), sans écran
// d'annonce.
export function testSetLevel(state, n) {
  const niveau = Math.floor(Number(n));
  if (!(niveau >= 1 && niveau <= levelCount())) return fail('Niveau inconnu.');
  state.progression = { xp: DATA.NIVEAUX.SEUILS[niveau - 1], niveau, annonces: [] };
  return { ok: true, niveau };
}

// Version 1.7 : +n XP (les niveaux franchis sont annoncés, comme en jeu).
export function testAddXp(state, n = 1000) {
  return { ok: true, niveaux: gainXp(state, n) };
}

// Lot 8 : construit gratuitement la Serre (niveau 1), le Verger et le Réfrigérateur.
export function testBuildSerre(state) {
  if (!state.serre.construit) openSerre(state);
  return { ok: true };
}

export function testBuildVerger(state) {
  openVerger(state);
  return { ok: true };
}

export function testBuildFridge(state) {
  openFridge(state);
  return { ok: true };
}

// Lot 8 : toutes les batteries à 0 Wh.
export function testEmptyBatteries(state) {
  for (const b of state.batteries) b.chargeMwh = 0;
  return { ok: true };
}

// Lot 2 : toutes les parcelles plantées deviennent mûres.
export function testRipenAll(state) {
  for (const p of allPlots(state)) {
    if (p.culture) p.stade = maxStage(p);
  }
  return { ok: true };
}

// Version 1.8 : l'énergie du personnage à 0 (à la place de « santé à 0 »).
export function testSetEnergyZero(state) {
  state.energie = 0;
  return { ok: true };
}

// Version 1.8 : l'énergie du personnage au maximum.
export function testFillEnergy(state) {
  state.energie = DATA.PERSONNAGE.MAX * 1000;
  return { ok: true };
}

// Lot 3 : 20 unités de chaque aliment (à conservation pleine).
export function testAddFood(state) {
  for (const item of Object.keys(DATA.OBJETS)) {
    if (DATA.OBJETS[item].mangeable) addItem(state, item, 20);
  }
  return { ok: true };
}

// Lot 3 : vieillit tout l'inventaire d'une nuit (sans passer la nuit) ; les
// lots arrivés à 0 disparaissent. Renvoie les pertes.
export function testAgeInventory(state) {
  return { ok: true, perdus: spoil(state) };
}

export function testSleepNights(state, count) {
  let report = null;
  for (let i = 0; i < count; i++) {
    testSkipAwake(state);
    report = sleep(state);
  }
  return { ok: true, report };
}

/* ---------- les ressources, pour essayer vite (la ferme générée surtout) ---------- */

// `n` fois l'objet `id` (n'importe lequel de DATA.OBJETS).
export function testAddItem(state, id, n = 10) {
  if (!DATA.OBJETS[id]) return fail('Objet inconnu.');
  const k = Math.max(1, Math.min(9999, Math.round(Number(n) || 0)));
  addItem(state, id, k);
  return { ok: true, items: { [id]: k } };
}

// Ce qui se ramasse et se fabrique d'abord : bois, pierre, fibre, planches (qty chacun).
export const TEST_RESSOURCES = ['bois', 'pierre', 'fibre', 'planche'];
export function testAddRessources(state, qty = 20) {
  for (const id of TEST_RESSOURCES) addItem(state, id, qty);
  return { ok: true };
}

// Les minerais et les lingots (qty de chaque).
export function testAddMetaux(state, qty = 10) {
  for (const id of Object.keys(DATA.OBJETS)) if (/^(minerai|lingot)_/.test(id)) addItem(state, id, qty);
  return { ok: true };
}

// qty de chaque bloc à poser (ATELIER.BLOCS : murs, portes, plancher, four, panneau…).
export function testAddBlocs(state, qty = 5) {
  for (const b of Object.values(DATA.ATELIER.BLOCS)) if (b.objet && DATA.OBJETS[b.objet]) addItem(state, b.objet, qty);
  return { ok: true };
}

// Tous les outils (houe, pioche, hache, faux, canne), sans payer.
export function testAllTools(state) {
  state.potager.houe = true;
  if (!state.outils || typeof state.outils !== 'object') state.outils = { hache: false, pioche: false, canne: false, choisi: 'houe' };
  Object.assign(state.outils, { hache: true, pioche: true, faux: true, canne: true });
  return { ok: true };
}

// L'Atelier construit (sans matériaux) : la ferme générée seulement.
export function testBuildAtelier(state) {
  if (farmSeed(state) === null) return fail('L\'Atelier se construit sur une ferme générée.');
  state.atelier = { construit: true, niveau: DATA.ATELIER.NIVEAU };
  return { ok: true };
}
