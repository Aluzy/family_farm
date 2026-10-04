import { DATA } from './catalog.js';
import { currentSeason } from './seasons.js';
import { batteryCapacity, fail, findDevice, isBroken, makeDevice, tankCapacity } from './devices.js';
import { awakeRequired } from './clock.js';
import { addItem, spoil } from './inventory.js';
import { openFridge } from './fridge.js';
import { allPlots, makePlot, maxStage, openSerre, seedItem } from './crops.js';
import { coopCapacity, freeCowPlaces, freeSheepPlaces, makeCow, makeSheep, storeWheat } from './animals.js';
import { openVerger } from './orchard.js';
import { openStation } from './kitchen.js';
import { grantTechPoints, refreshUnlocks } from './techtree.js';
import { chapterCount, completeChapter, newCampaignCounters } from './campaign.js';
import { sleep } from './night.js';

/* ---------- actions du mode test ---------- */

export function testAddPieces(state, amount) {
  state.pieces = Math.round(state.pieces + amount);
  refreshUnlocks(state);
  return { ok: true };
}

// Lot 7 : met un bâtiment au niveau 5 (potager, poulailler, silo), sans
// payer : le bâtiment est construit s'il ne l'était pas et ses parcelles ou sa
// capacité suivent le niveau.
export function testSetBuildingLevel5(state, id) {
  const niveau = DATA.LEVEL_MAX;
  if (id === 'potager') {
    state.potager.niveau = niveau;
    for (let n = state.potager.parcelles.length + 1; n <= DATA.POTAGER.PARCELLES[niveau - 1]; n++) state.potager.parcelles.push(makePlot(n));
  } else if (id === 'poulailler' || id === 'silo') {
    state[id].construit = true;
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
  state.technologies = Object.keys(DATA.techtree.noeuds);
  const tab = DATA.TECHNO.ONGLET;
  if (!state.unlockedTabs.includes(tab)) state.unlockedTabs.push(tab);
  return { ok: true };
}

export function testAddDevice(state, type) {
  const n = ++state.compteurs[type];
  const d = makeDevice(type, `${type}-${n}`, 0);
  (type === 'panneau' ? state.panneaux : state.batteries).push(d);
  return { ok: true, device: d };
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
  d.usure = Math.max(0, Math.min(DATA.WEAR.BREAKDOWN, Math.round(usure)));
  d.usureMs = 0;
  if (isBroken(d)) d.allume = false;
  return { ok: true };
}

export function testSkipAwake(state) {
  state.awakeMs = Math.max(state.awakeMs, awakeRequired(state) * 1000);
  return { ok: true };
}

// Lot 2 : 10 de chaque graine (et de chaque plant).
export function testAddSeeds(state) {
  for (const culture of Object.keys(DATA.crops)) addItem(state, seedItem(culture), 10);
  return { ok: true };
}

// Lot 4 : +50 blés, rangés comme une récolte (Silo d'abord, surplus dans
// l'inventaire).
export function testAddWheat(state, qty = 50) {
  storeWheat(state, qty);
  return { ok: true };
}

// Lot 4 : +4 poules, dans la limite de la capacité. Le Poulailler est construit
// gratuitement s'il ne l'était pas.
export function testAddHens(state, count = 4) {
  const p = state.poulailler;
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
  if (!p.construit) {
    p.construit = true;
    p.places = DATA.PATURAGE.placesDepart;
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
  if (!p.construit) {
    p.construit = true;
    p.places = DATA.PATURAGE.placesDepart;
  }
  const n = Math.min(count, freeCowPlaces(state));
  for (let i = 0; i < n; i++) p.vaches.push(makeCow(state));
  return { ok: true, added: n };
}

// Version 1.1 : +20 pailles.
export function testAddStraw(state, qty = 20) {
  addItem(state, DATA.PATURAGE.nourriture, qty);
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
  return testSetWear(state, d.id, DATA.WEAR.BREAKDOWN);
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
  return { ok: true, chapitre: c.chapitre, fini: c.fini };
}

// Lot 8 : saute à la première nuit de la saison suivante (sans passer la nuit :
// rien ne pousse, rien ne se mange).
export function testNextSeason(state) {
  const L = DATA.SAISONS.LONGUEUR;
  state.day = (Math.floor((state.day - 1) / L) + 1) * L + 1;
  return { ok: true, saison: currentSeason(state) };
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

// Lot 2 : santé de toute la famille à 0 (tous malades).
export function testSetHealthZero(state) {
  for (const m of state.famille.membres) {
    m.sante = 0;
    m.malade = true;
  }
  return { ok: true };
}

// Lot 3 : 20 unités de chaque aliment (à conservation pleine).
export function testAddFood(state) {
  for (const item of Object.keys(DATA.items)) {
    if (DATA.items[item].edible) addItem(state, item, 20);
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
