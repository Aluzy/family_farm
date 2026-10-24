import { DATA } from './catalog.js';
import { unlockTab } from './base.js';
import { batteryCapacity, fail, findDevice, isBroken, tankCapacity } from './devices.js';
import { noteCompta } from './compta.js';
import { awakeMsAtHour } from './clock.js';
import { addItem, countItem, spoil, takeItem } from './inventory.js';
import { blocAt, blocsPoses, casesBaties, caseLibreFoyer, couchages, herbesSur, majPoulailler, poserBloc, serrePlaces } from './blocs.js';
import { allPlots, makePlot, maxStage, seedItem, serreCap, zoneTile } from './crops.js';
import { farmTerrain } from './terrain.js';
import { coopCapacity, freeCowPlaces, freeSheepPlaces, makeCow, makeSheep, storeWheat } from './animals.js';
import { arbreProche, openVerger } from './orchard.js';
import { foretProche } from './outils.js';
import { openStation } from './kitchen.js';
import { grantTechPoints, refreshUnlocks } from './techtree.js';
import { chapterCount, completeChapter, newCampaignCounters } from './campaign.js';
import { sleep } from './night.js';
import { setFarmSeed } from './depart.js';
import { gainXp, levelBlock, levelCount } from './levels.js';

/* ---------- actions du mode test ---------- */

// La partie passe sur la ferme générée de la graine `graine` (docs/carte-generee.md). Les
// terres, les arbres abattus et les rochers cassés de l'autre ferme n'ont pas de sens ici : la
// partie repart des parcelles de départ, tous les arbres debout et tous les rochers entiers.
export function testFarmMap(state, graine) {
  const g = String(graine === undefined || graine === null ? '' : graine).trim();
  if (!g) return fail('Il faut une graine.');
  return setFarmSeed(state, g);
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
    // (bâtis d'un coup s'ils ne le sont pas ; le Silo n'a pas de niveau : ses blocs)
    if (!state[id].construit) {
      const r = testBatir(state, id);
      if (!r.ok) return r;
    }
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

// Lot 4 : +4 poules, dans la limite de la capacité. Le Poulailler se bâtit (enceinte, nichoir,
// enclos : blocs.js).
export function testAddHens(state, count = 4) {
  const p = state.poulailler;
  if (!p.construit) return fail('Bâtis d\'abord le Poulailler : une enceinte avec une porte sur le dehors, un nichoir et un enclos de barrières.');
  p.poules = Math.min(coopCapacity(state), p.poules + count);
  return { ok: true };
}

// Lot 6 : +3 moutons, dans la limite des places libres. L'Étable se bâtit (enceinte, mangeoire,
// enclos : blocs.js).
export function testAddSheep(state, count = 3) {
  const p = state.paturage;
  if (!p.construit) return fail('Bâtis d\'abord l\'Étable : une enceinte avec une porte sur le dehors, une mangeoire et un enclos de barrières.');
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
  if (!p.construit) return fail('Bâtis d\'abord l\'Étable : une enceinte avec une porte sur le dehors, une mangeoire et un enclos de barrières.');
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
// Toutes les stations : le four, la cuisinière et le Moulin bâtis d'un coup (testBatir), la
// Presse sans payer.
export function testBuildStations(state) {
  for (const id of ['four', 'cuisine', 'moulin']) {
    if (state.stations[id].construit) continue;
    const r = testBatir(state, id);
    if (!r.ok) return r;
  }
  openStation(state, 'presse');
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

// Lot 8 : bâtit la Serre d'un coup (testBatir), ouvre le Verger, construit le Réfrigérateur.
export function testBuildSerre(state) {
  return state.serre.construit ? { ok: true } : testBatir(state, 'serre');
}

export function testBuildVerger(state) {
  openVerger(state);
  return { ok: true };
}

export function testBuildFridge(state) {
  return state.frigo.construit ? { ok: true } : testBatir(state, 'frigo');
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

// L'Atelier construit (sans matériaux).
export function testBuildAtelier(state) {
  state.atelier = { construit: true, niveau: DATA.ATELIER.NIVEAU };
  return { ok: true };
}

/* -- bâtir d'un coup, en blocs (la ferme générée) -- */

// Un coin d'herbe libre de w × h cases (coin haut-gauche), une case de marge autour, le plus
// près possible de la Zone de culture, ou null ; `filtre(tile)` : une condition de plus sur le coin.
function coinLibre(state, w, h, filtre = null) {
  const T = farmTerrain(state), W = T.LARGEUR, H = T.HAUTEUR;
  const pris = casesBaties(state), terres = new Set(state.potager.parcelles.map((p) => p.case));
  // (les cases prises, en sommes cumulées : une boîte se vérifie d'un coup)
  const somme = new Int32Array((W + 1) * (H + 1));
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const t = r * W + c, ch = T.LIGNES[r][c];
      const occupe = (ch === '#' || ch === '+') && !pris.has(t) && !terres.has(t) && !herbesSur(state, t).length ? 0 : 1;
      somme[(r + 1) * (W + 1) + c + 1] = occupe + somme[r * (W + 1) + c + 1] + somme[(r + 1) * (W + 1) + c] - somme[r * (W + 1) + c];
    }
  }
  const boite = (c0, r0, c1, r1) => somme[r1 * (W + 1) + c1] - somme[r0 * (W + 1) + c1] - somme[r1 * (W + 1) + c0] + somme[r0 * (W + 1) + c0];
  const Z = T.ZONES[1], cx = Z.X + Z.COLONNES / 2, cy = Z.Y + 3;
  let best = null, dBest = Infinity;
  for (let r = 2; r < H - h - 2; r++) {
    for (let c = 2; c < W - w - 2; c++) {
      const d = Math.hypot(c + w / 2 - cx, r + h / 2 - cy);
      if (d >= dBest || boite(c - 1, r - 1, c + w + 1, r + h + 1)) continue;
      if (filtre && !filtre(r * W + c)) continue;
      best = { c, r, W };
      dBest = d;
    }
  }
  return best;
}

// Pose `sorte` sur `tile` comme le joueur, l'objet donné juste avant.
function poserDonne(state, sorte, tile) {
  const s = DATA.ATELIER.BLOCS[sorte];
  if (s.objet) addItem(state, s.objet, 1);
  const r = poserBloc(state, sorte, tile);
  if (!r.ok && s.objet) takeItem(state, s.objet, 1);
  return r;
}

// Les blocs sans effet propre (murs, portes, barrières, blocs de silo), écrits d'un coup ; le
// bloc clé se pose ensuite comme le joueur (poserDonne), et le bâtiment suit.
function ecrire(state, tile, sorte, hauteur = 1) {
  if (!state.blocs || typeof state.blocs !== 'object') state.blocs = {};
  state.blocs[tile] = sorte;
  if (hauteur > 1) {
    if (!state.hauteurs || typeof state.hauteurs !== 'object') state.hauteurs = {};
    state.hauteurs[tile] = hauteur;
  }
}

// Une pièce close de w × h cases (murs hauts de `hauteur`), la porte au milieu du bas : at(x, y).
function piece(state, z, w, h, hauteur = 1) {
  const at = (x, y) => (z.r + y) * z.W + z.c + x;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (y === 0 || x === 0 || y === h - 1 || x === w - 1) ecrire(state, at(x, y), 'mur_pierre', hauteur);
  ecrire(state, at(Math.floor(w / 2), h - 1), 'porte');
  return at;
}

// Bâtit d'un coup, en vrais blocs posés sur un coin d'herbe libre de la ferme générée (sans
// matériaux, au niveau qu'il faut déjà atteint) :
//   - 'foyer' : une pièce close avec une paillasse par membre de la famille ;
//   - 'four', 'cuisine', 'boite', 'frigo' : la station, la boîte à nourriture ou le
//     réfrigérateur dans le foyer (bâti d'abord s'il n'y en a pas ; le réfrigérateur déjà acheté,
//     dans l'inventaire, est celui qui se pose) ;
//   - 'poulailler', 'etable' : une enceinte (porte dehors), le nichoir ou la mangeoire, et un
//     enclos de barrières de 6 × 5 cases ;
//   - 'serre' : une pièce close avec le bac à semis, ses cases labourées (testLabourerSerre) ;
//   - 'moulin' : une tour (murs hauts de MOULIN.HAUTEUR) et sa meule au centre ;
//   - 'silo' : SILO.LARGEUR colonnes de SILO.HAUTEUR blocs ;
//   - 'puits', 'panneau', 'batterie', 'citerne', 'pompe', 'station_robot' : posé dehors (la pompe
//     sur le puits) ;
//   - une espèce du Verger ('pommier'…) : le jeune arbre planté dehors, loin des autres.
// Pas avant le niveau qui débloque le bâtiment (levelBlock).
export function testBatir(state, id) {
  const verrou = { etable: 'paturage', frigo: 'frigo', panneau: 'energie', batterie: 'energie', citerne: 'energie', reservoir: 'energie', pompe: 'energie' }[id]
    || (DATA.VERGER.ARBRES[id] ? 'verger' : ['poulailler', 'silo', 'serre', 'moulin', 'four', 'cuisine'].includes(id) ? id : null);
  const bloque = verrou && levelBlock(state, verrou);
  if (bloque) return fail(bloque);
  const dehors = { station_robot: 'station_robot', puits: 'puits', panneau: 'panneau', batterie: 'batterie', citerne: 'citerne', reservoir: 'citerne', pompe: 'puits' };
  // (la pompe : sur le puits déjà posé, s'il y en a un)
  const puits = Object.keys(blocsPoses(state)).map(Number).find((t) => blocAt(state, t) === 'puits');
  if (id === 'pompe' && puits !== undefined) return poserDonne(state, 'pompe', puits);
  if (dehors[id] || DATA.VERGER.ARBRES[id]) {
    const arbre = !dehors[id], e = DATA.ATELIER.ARBRE_ECART;
    const z = coinLibre(state, 1, 1, arbre ? (t) => !arbreProche(state, t, e) && !foretProche(state, t, e) : null);
    if (!z) return fail('Plus de place libre sur la ferme.');
    const t = z.r * z.W + z.c;
    const r = poserDonne(state, arbre ? id : dehors[id], t);
    return r.ok && id === 'pompe' ? poserDonne(state, 'pompe', t) : r;
  }
  const tailles = { foyer: [8, 6], poulailler: [15, 7], etable: [15, 7], serre: [8, 6], moulin: [5, 5], silo: [DATA.ATELIER.SILO.LARGEUR, 1] };
  const dansFoyer = { four: 'four', cuisine: 'cuisiniere', boite: 'boite_nourriture', frigo: 'refrigerateur' };
  if (dansFoyer[id]) {
    if (!couchages(state).length) {
      const r = testBatir(state, 'foyer');
      if (!r.ok) return r;
    }
    const libre = caseLibreFoyer(state);
    if (libre === undefined) return fail('Plus de place dans le foyer.');
    const sorte = dansFoyer[id];
    return sorte === 'refrigerateur' && countItem(state, sorte) > 0 ? poserBloc(state, sorte, libre) : poserDonne(state, sorte, libre);
  }
  if (!tailles[id]) return fail('Bâtiment inconnu.');
  const [w, h] = tailles[id];
  const z = coinLibre(state, w, h);
  if (!z) return fail('Plus de place libre sur la ferme.');
  const at = (x, y) => (z.r + y) * z.W + z.c + x;
  let r;
  if (id === 'silo') {
    for (let x = 0; x < w; x++) ecrire(state, at(x, 0), 'bloc_silo', DATA.ATELIER.SILO.HAUTEUR);
    majPoulailler(state);
    r = { ok: state.silo.construit };
  } else if (id === 'moulin') {
    piece(state, z, w, h, DATA.ATELIER.MOULIN.HAUTEUR);
    r = poserDonne(state, 'meule', at(2, 2));
  } else if (id === 'poulailler' || id === 'etable') {
    piece(state, z, 8, 7);
    ecrire(state, at(7, 3), 'porte');
    for (let x = 8; x <= 14; x++) { ecrire(state, at(x, 0), 'barriere'); ecrire(state, at(x, 6), 'barriere'); }
    for (let y = 1; y <= 5; y++) ecrire(state, at(14, y), 'barriere');
    r = poserDonne(state, id === 'poulailler' ? 'nichoir' : 'mangeoire', at(1, 1));
  } else if (id === 'foyer') {
    piece(state, z, w, h);
    const n = Math.max(1, Math.min(w - 2, state.famille.membres.length));
    for (let x = 1; x <= n; x++) r = poserDonne(state, 'paillasse', at(x, 1));
  } else {
    piece(state, z, w, h);
    r = poserDonne(state, 'bac_semis', at(1, 1));
    if (r.ok) testLabourerSerre(state);
  }
  return r.ok ? { ok: true, coin: at(0, 0) } : r;
}

// Laboure d'un coup les cases libres de la Serre (sans houe ni énergie), jusqu'à ce que son
// niveau permet (serreCap). Renvoie combien de parcelles de plus.
export function testLabourerSerre(state) {
  const g = state.serre, prises = new Set(g.parcelles.map((p) => p.case));
  let n = 0;
  for (const t of serrePlaces(state)) {
    if (g.parcelles.length >= serreCap(state)) break;
    if (prises.has(t) || (state.sols && state.sols[t])) continue;
    g.parcelles.push({ ...makePlot(g.parcelles.length + 1, DATA.SERRE.LIEU), case: t });
    n += 1;
  }
  g.parcelles.sort((a, b) => a.case - b.case);
  return n;
}
