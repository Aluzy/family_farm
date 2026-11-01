/* ==========================================================================
   Aide commune aux tests du moteur (tests/engine/*.test.mjs).
   - test / testBase / assert / assertEqual : la petite interface maison des
     tests, posée sur node:test (le lanceur intégré de Node) ;
   - le calendrier lunaire neutralisé (avecLune pour le rallumer) ;
   - les états de départ et aides de mise en place utilisées par plusieurs
     fichiers (une aide propre à un seul fichier reste dans ce fichier).
   Ce module n'est jamais chargé par le navigateur.
   ========================================================================== */

import { test } from 'node:test';
import {
  addItem, awakeMsAtHour, boitePosee, buildFridge, buildStation, decalerPartie, FERME_DANS_MONDE, FERME_GENEREE, MONDE,
  buyCow, buySheep, countItem, createInitialState, DATA, defaultOrigin, findPlot, grantTech,
  farmTerrain, growDue, irrigate, makePlot, migrate, maxStage, startPlots, openStation, plant, plotAtTile, robotStep, shelfLife,
  depenserMembre, mangeurs, repasStep, sleep, takeItem, testBatir, testFillBatteries, testGoToChapter, testSetBuildingLevel5, tick, unlockLevel,
  zoneTile,
} from '../../js/engine/index.js';
import { noterEncyclopedie, toutVoir } from '../../js/engine/index.js';

// Le calendrier lunaire change la pousse, l'eau et les récoltes selon le jour. Les tests écrits
// avant lui tournent lune neutre (un stade par nuit, rendements et eau de base) ; ceux de la
// lune la rallument le temps du test (avecLune). Chaque fichier de tests importe ce module en
// premier : le réglage neutre est posé avant le moindre test.
const LUNE_REGLAGES = { ...DATA.LUNE };
const LUNE_NEUTRE = { POUSSE_CHANCE: 0, POUSSE_NOUVELLE: 1, RECOLTE_PLEINE: 100, EAU_DECROISSANTE: 100 };
Object.assign(DATA.LUNE, LUNE_NEUTRE);
export function avecLune(fn) {
  Object.assign(DATA.LUNE, LUNE_REGLAGES);
  try {
    fn();
  } finally {
    Object.assign(DATA.LUNE, LUNE_NEUTRE);
  }
}

// Un test : test(nom, () => { … }), celui de node:test tel quel (pour que chaque test soit
// rattaché à son fichier). Tous les tests du moteur sont des fonctions synchrones sans
// paramètre : node:test les lance dans l'ordre du fichier, une fois le fichier entièrement
// chargé, comme l'ancienne file d'attente maison.
export { test };

// Lots 1 à 7 : tests des règles de base. Ils neutralisaient les saisons, retirées en
// version 1.6 ; le nom reste pour ne pas toucher à tous les tests.
export const testBase = test;

export function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion échouée');
}

// Égalité par JSON.stringify (et pas assert.deepStrictEqual) : l'ordre des clés compte, une clé
// à undefined est ignorée, NaN vaut null. Les tests s'appuient sur ces règles : ne pas changer.
export function assertEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(message || `attendu ${b}, obtenu ${a}`);
  }
}


export function near(a, b, tol = 1e-6) {
  return Math.abs(a - b) <= tol;
}

// Unités entières du moteur : kWh → mWh, L → mL (pour écrire les tests en
// unités lisibles).
export const kwh = (n) => Math.round(n * 1e6);

export const ml = (n) => Math.round(n * 1000);

// État de test : seul le panneau produit, la pompe est coupée (sauf demande).
// Version 1.6 : le panneau ne produit qu'au soleil (7 h – 19 h). La partie de test
// commence à 7 h (`sun`), pour que les tests de flux d'énergie produisent dès le
// premier tick ; `sun: false` la laisse à 6 h, l'heure du réveil.
// Version 1.12 : un bâtiment ne se construit pas avant son niveau ; les aides de test
// montent la partie au niveau qu'il faut (sans XP, sans écran de niveau).
export function reach(s, id) {
  s.progression.niveau = Math.max(s.progression.niveau, unlockLevel(id));
  return s;
}

// La partie de test : au niveau du Marché (il ouvre à un niveau, NIVEAUX), avec son foyer (une
// pièce close, une paillasse par membre : la famille dort).
export function partie(seed = 1) {
  const s = reach(createInitialState(seed), 'marche');
  assert(testBatir(s, 'foyer').ok, 'bâtir le foyer');
  return s;
}

export function farm({ pump = false, sun = true } = {}) {
  const s = partie();
  s.pompe.allume = pump;
  if (sun) s.awakeMs = awakeMsAtHour(DATA.SOLEIL.DEBUT);
  return s;
}

// État de test : réservoir plein d'eau (le potager s'arrose avec).
export function garden() {
  const s = partie();
  s.pompe.allume = false;
  s.eauMl = ml(40);
  return s;
}

// Plante une culture sur une parcelle et la fait mûrir d'un coup.
export function plantRipe(s, plotId, culture) {
  assert(plant(s, plotId, culture).ok, `planter ${culture}`);
  const p = findPlot(s, plotId);
  p.stade = maxStage(p);
  return p;
}

// Lot 3 : remplace l'inventaire par ces quantités (lots à conservation pleine).
export function setInv(s, quantities) {
  s.inventaire = {};
  for (const [item, n] of Object.entries(quantities)) addItem(s, item, n);
}

// La boîte à nourriture posée dans le foyer (bâti s'il le faut), remplie de ces quantités
// (lots à conservation pleine, au-delà des limites de la boîte) : la famille y mange.
export function boite(s, quantities = {}) {
  if (!boitePosee(s)) assert(testBatir(s, 'boite').ok, 'poser la boîte');
  s.boite.items = {};
  for (const [item, n] of Object.entries(quantities)) if (n > 0) s.boite.items[item] = [{ qty: n, nightsLeft: shelfLife(item), origin: defaultOrigin(item) }];
  return s;
}

// Les aliments de l'inventaire passent dans la boîte à nourriture (posée s'il le faut), avec
// leurs lots (origine, conservation), au-delà des limites de la boîte.
export function versBoite(s) {
  if (!boitePosee(s)) assert(testBatir(s, 'boite').ok, 'poser la boîte');
  for (const [item, lots] of Object.entries(s.inventaire)) {
    if (!DATA.OBJETS[item] || !DATA.OBJETS[item].mangeable) continue;
    s.boite.items[item] = [...(s.boite.items[item] || []), ...lots];
    delete s.inventaire[item];
  }
  return s;
}

// Version 1.8 : une partie de test « infatigable », pour les tests qui enchaînent
// beaucoup d'actions au clic sans parler d'énergie (l'énergie a ses propres tests).
export function tireless(s) {
  s.energie = Number.MAX_SAFE_INTEGER;
  return s;
}

// Version 1.9 : la Zone de culture ne s'agrandit plus en pièces ; les tests qui veulent
// plus de parcelles les labourent (mode test : sans plafond, énergie ni XP).
export function growZone(s, total) {
  s.potager.houe = true;
  for (let c = 0; s.potager.parcelles.length < total && c < DATA.POTAGER.CASES; c++) {
    const tile = zoneTile(1, c, farmTerrain(s));
    if (plotAtTile(s, tile)) continue;
    const n = s.potager.parcelles.length + 1;
    s.potager.parcelles.push({ ...makePlot(n), case: tile });
  }
  s.potager.parcelles.sort((a, b) => a.case - b.case);
  return s;
}

// État de test : riche, Silo et Poulailler construits, réservoir plein. Les
// cultures de plein champ (blé, tournesol, riz, houblon) se plantent dans la
// Zone de culture de départ (potager-1 à potager-6) : plus de Champ à construire.
export function ranch({ silo = true, coop = true } = {}) {
  const s = garden();
  s.pieces = 5000;
  if (silo) assert(testBatir(reach(s, 'silo'), 'silo').ok, 'construire le Silo');
  if (coop) assert(testBatir(reach(s, 'poulailler'), 'poulailler').ok, 'construire le Poulailler');
  return s;
}

// État de test : riche, les quatre stations construites, inventaire vide, batteries
// pleines, réservoir plein, panneau coupé (l'énergie ne bouge que par les consommateurs).
export function atelier({ stations = ['four', 'cuisine', 'moulin'] } = {}) {
  const s = ranch();
  for (const id of stations) assert(testBatir(reach(s, id), id).ok, `construire ${id}`);
  s.pieces = 1000;
  setInv(s, {});
  testFillBatteries(s);
  s.panneaux[0].allume = false;
  return s;
}

// Fait avancer la simulation de `seconds` secondes par pas de 0,2 s.
export function runFor(s, seconds, dt = 0.2) {
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) tick(s, dt);
}

// État de test : Étable ouverte aux moutons et aux vaches (10 places), avec
// assez de pièces pour tout acheter. (« pature » : nom historique.)
export function pature({ built = true } = {}) {
  const s = garden();
  s.pieces = 5000;
  if (built) assert(testBatir(reach(s, 'paturage'), 'etable').ok, 'ouvrir l\'Étable');
  return s;
}

export function fillSheep(s, n) {
  for (let i = 0; i < n; i++) assert(buySheep(s).ok, `mouton ${i + 1}`);
}

// Achète n vaches, sur le modèle de fillSheep().
export function fillCows(s, n) {
  for (let i = 0; i < n; i++) assert(buyCow(s).ok, `vache ${i + 1}`);
}

export function sleepOnce(s) {
  s.awakeMs = 30000;
  return sleep(s);
}

// Le matin des automatisations : l'horloge à 7 h (les plantes qui ont fini leur cycle
// poussent), le robot (sa liste de 6 h, chaque tâche après son trajet : quelques parcelles
// proches avant 7 h), puis les asperseurs (irrigate). Renvoie { arrosees, sansEau } ; le travail du robot
// est dans s.robot.
export function matin(s) {
  s.awakeMs = awakeMsAtHour(DATA.TEMPS.ARROSAGE_HEURE);
  growDue(s);
  robotStep(s);
  return irrigate(s);
}

// Met exactement `n` pailles en stock.
export function setStraw(s, n) {
  takeItem(s, 'paille', countItem(s, 'paille'));
  if (n > 0) addItem(s, 'paille', n);
}

// État de test : riche, réservoir plein, Silo et Poulailler construits (ranch).
// Les bâtiments demandés passent au niveau 5 ('potager' : la Zone de culture).
// Arbre v2 : l'ancien « niveau 5 » = le bâtiment au niveau 5 + les nœuds
// d'automatisation correspondants (comme la migration v14 les offre).
export function auto5(...batiments) {
  const s = ranch();
  for (const b of batiments) {
    assert(testSetBuildingLevel5(s, b).ok, `niveau 5 : ${b}`);
    if (b === 'potager') {
      grantTech(s, 'ea_irrigation');
      grantTech(s, 'cu_recolte_auto');
      assert(testBatir(s, 'station_robot').ok, 'la station du robot');
    }
    if (b === 'poulailler') grantTech(s, 'el_mangeoire');
  }
  return s;
}

// Sauvegarde de la version 14 : une partie d'avant la fusion, avec l'ancien
// Potager (6 / 9 / 12 / 16 / 20 parcelles) et l'ancien Champ (4 / 6 / 9 / 12 / 16,
// à construire). `potager` et `champ` : niveaux d'alors (champ 0 : pas construit).
export function v14State({ potager = 1, champ = 0 } = {}, mutate) {
  const anciennes = { potager: [6, 9, 12, 16, 20], champ: [4, 6, 9, 12, 16] };
  const plots = (n, lieu) => Array.from({ length: n }, (_, i) => ({ id: `${lieu}-${i + 1}`, lieu, culture: null, stade: 0, arrose: false, semis: 'meme', verrou: null }));
  const s = ancienne(6);
  s.potager = { niveau: potager, parcelles: plots(anciennes.potager[potager - 1], 'potager') };
  s.champ = champ > 0
    ? { construit: true, niveau: champ, parcelles: plots(anciennes.champ[champ - 1], 'champ') }
    : { construit: false, niveau: 1, parcelles: [] };
  s.nuit.auto = { ...s.nuit.auto, champ: false };
  s.campagne.chapitre = 4;
  s.version = 14;
  if (mutate) mutate(s);
  return JSON.parse(JSON.stringify(s));
}

// Une partie d'avant le déménagement, sur la ferme du grand-père (la carte de Tiled, sans
// graine) : la partie de test, sans sa carte, avec les parcelles de départ de la ferme dessinée.
// Pour les tests des anciennes migrations.
export function ancienne(seed = 1) {
  const s = createInitialState(seed);
  delete s.carte;
  s.potager.parcelles = startPlots();
  return s;
}

// Les anciennes migrations, jusqu'à la version 46 : la dernière sur la ferme du grand-père,
// avant le déménagement (v46 → v47, demenagement.test.mjs).
export const AVANT_DEMENAGEMENT = 46;

// Une partie d'aujourd'hui ramenée d'avant le grand monde (version `v` < 52) : ses cases sur la
// largeur de sa ferme seule, comme la migration 51 → 52 les trouve (decalerPartie, state.js).
export function avantLeMonde(s, v) {
  return { ...decalerPartie(s, -1), version: v };
}

// La case `i` du monde, sur la largeur de la ferme seule (celle d'une partie d'avant le monde).
export function caseDeLaFerme(i) {
  const [ox, oy] = FERME_DANS_MONDE;
  return (Math.floor(i / MONDE.LARGEUR) - oy) * FERME_GENEREE.LARGEUR + (i % MONDE.LARGEUR) - ox;
}
export const migreAvant = (save) => migrate(save, AVANT_DEMENAGEMENT);

// Ce qu'une parcelle porte, sans son identifiant ni son lieu (que la fusion renumérote).
export function plotContent(p) {
  const { id, lieu, case: kase, ...reste } = p;
  return reste;
}

// Le Réfrigérateur acheté (buildFridge : il arrive dans l'inventaire), puis posé dans le foyer
// (testBatir, le foyer bâti d'abord s'il n'y en a pas) : construit. Le résultat de l'achat.
export function construireFrigo(s) {
  const r = buildFridge(s);
  if (r.ok) assert(testBatir(s, 'frigo').ok, 'poser le Réfrigérateur');
  return r;
}

// Version 1.10 : un frigo vide ne consomme rien ; il est construit au niveau 5 (120 unités)
// avec `lest` épinards au frais (50 : 5 Wh/s, l'ancienne consommation de base).
export function coldRoom({ charge = true, lest = 50 } = {}) {
  const s = farm();
  s.pieces = 5000;
  assert(construireFrigo(reach(s, 'frigo')).ok, 'construire le Réfrigérateur');
  s.frigo.niveau = DATA.FRIGO.CAPACITE.length;
  if (lest) s.frigo.items.epinard = [{ qty: lest, nightsLeft: shelfLife('epinard'), origin: defaultOrigin('epinard') }];
  if (charge) testFillBatteries(s);
  s.panneaux[0].allume = false; // seul le frigo consomme, rien ne recharge
  return s;
}

// Fiche 9b : les objectifs de la campagne qui se font dans le grand monde (la calèche, les hameaux, le
// monde vu, une grotte de la montagne, la mer, les bêtes), tous remplis d'un coup : les tests d'un
// chapitre de la ferme n'ont pas à sortir. (Après testGoToChapter, qui remet les compteurs à zéro.)
export const OBJECTIFS_MONDE = ['caleche', 'hameaux', 'monde', 'grotteMonde', 'pecheMer', 'achatsHameaux', 'faune'];
export function mondeFait(s) {
  const k = s.campagne.compteurs;
  Object.assign(k, { calecheVentes: 1000, achatsHameaux: 100, pecheMer: 10 });
  s.monde.hameaux = {};
  for (let i = 1; i <= 10; i++) s.monde.hameaux['hameau_' + i] = { nom: 'Hameau ' + i, style: 'prairie', jour: 1 };
  toutVoir(s);
  noterEncyclopedie(s, 'carte:grotte_monde');
  for (const e of Object.keys(DATA.FAUNE.ESPECES)) noterEncyclopedie(s, 'faune:' + e);
  return s;
}

// Partie de test placée au chapitre `n` (1 à 7 ; 8 = campagne finie), pompe coupée.
export function atChapter(n) {
  const s = farm();
  assert(testGoToChapter(s, n).ok, `aller au chapitre ${n}`);
  return s;
}

// La famille a faim : chaque membre (sauf le personnage) dépense `points` de sa jauge
// (FAMILLE.FAIM), puis ceux qui sont au seuil vont manger (repasStep).
export function affamer(s, points = DATA.FAMILLE.FAIM.MAX - DATA.FAMILLE.FAIM.SEUIL) {
  for (const m of mangeurs(s)) depenserMembre(s, m.id, points);
  repasStep(s);
}

// Une nuit où la famille a eu faim (chaque membre au seuil, puis rassasié : 3 membres ×
// 80 points), avec exactement `qty` unités de `item` d'origine « produit » au menu, plus des
// conserves pour le reste. `item` : patate par défaut (valeur 5, mangée avant les conserves
// qui ne périment pas) ; un autre item (ex. courgette, valeur 3) donne d'autres pourcentages.
export function nightWithProduced(s, qty, item = 'patate') {
  setInv(s, {});
  boite(s, { [item]: qty, conserve: 60 });
  affamer(s);
  return sleepOnce(s);
}

// `count` nuits avec `qty` unités de `item` (patate par défaut) produites au menu.
export function holdNights(s, count, qty, item = 'patate') {
  for (let i = 0; i < count; i++) nightWithProduced(s, qty, item);
}

// Version 1.7 : le Champ s'ouvre quand le Moulin est construit (son niveau atteint).
export function withMill() {
  const s = atLevel(unlockLevel('moulin'));
  openStation(s, 'moulin');
  return s;
}

// Version 1.15 : le milieu de l'ancien Champ, de l'herbe tout autour (les bordures s'y
// dessinent) ; (c, r) de 0 à 5.
export const champ = (c, r) => zoneTile(2, (r + 1) * 8 + c + 1, T1);

// Le terrain des parties de test (createInitialState(1) : la ferme générée de la graine '1').
export const T1 = farmTerrain({ carte: { graine: '1' } });

// FLU-42 : une partie migrée qui avait déjà labouré, planté et arrosé (ou dépassé le
// chapitre 1) a les trois nouvelles étapes du chapitre 1 validées.
export function chapter1StepsDone(c) {
  return { ...c, compteurs: { ...c.compteurs, labours: 6, semis: 6, arroseesMax: 6 } };
}
