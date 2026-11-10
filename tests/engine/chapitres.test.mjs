/* ==========================================================================
   Tests du moteur : Lot 9 : chapitres (et la part de la ferme dans les repas, une mesure).
   Lancer seul : node --test tests/engine/chapitres.test.mjs (ou node tests/run-tests.mjs chapitres).
   ========================================================================== */

import {
  acheterCaleche, addItem, addLot, buyAnimal, buyItem, chapterProgress,
  chapterReached, completeChapter, countItem, createInitialState, createNewGame, DATA, farmTerrain,
  feedAllHens, findPlot, formatPercent, harvest, hoe, lotsOf, mailText,
  maxStage, migrate, moveToFridge, objectiveValue, plant, plantableCrops,
  plantableCropsFor, shear, startMilling, startRecipe, storeWheat, takeItem, testAddHens,
  testAddWheat, testBatir, testEmptyBatteries, testFillBatteries, testGoToChapter,
  testSetBuildingLevel5, testSetLevel, testWoolReady, tick, unlockLevel, updateChapters, water,
  zoneTile, executerCommande, objectifsARevoir, PAS_OBJECTIFS,
} from '../../js/engine/index.js';
import { ETAPES } from '../../js/engine/didacticiel.js';
import {
  affamer, assert, assertEqual, atChapter, atelier, boite, coldRoom, farm, fillSheep, garden,
  kwh, ml, mondeFait, nightWithProduced, OBJECTIFS_MONDE, pature, plantRipe, reach, runFor, setInv, sleepOnce,
  test, testBase, tireless, versBoite, vieFaite,
} from './aide.mjs';
import { vendreCaleche } from '../../js/engine/caleche.js';

/* ---------- Lot 9 : chapitres ---------- */

// Les objectifs de la ferme (fiche 9b : ceux du grand monde, à part : OBJECTIFS_MONDE, mondeFait).
function okList(s) {
  return chapterProgress(s).objectifs.filter((o) => !OBJECTIFS_MONDE.includes(o.type)).map((o) => o.ok);
}

test('DATA Lot 9 : sept chapitres, objectifs (version 1.7 : ils ne débloquent plus rien)', () => {
  const L = DATA.CHAPITRES.liste;
  // le lot 6 : les titres d'un foyer qui prend vie ; l'ancien titre, l'étape de la ferme, en sous-titre
  assertEqual(L.map((c) => c.titre), ['Notre nouveau chez-nous', 'Une maison à notre image', 'Les premiers animaux', 'Les plaisirs de la cuisine', 'Une ferme pleine de vie', 'Au rythme de la nature', 'Notre petit coin de paradis']);
  assertEqual(L.map((c) => c.etape), ['L\'héritage', 'Le grenier', 'Le poulailler', 'Le four et le livre de recette', 'Le troupeau', 'Toute l\'année', 'La ferme accomplie']);
  assertEqual(L.map((c) => c.debloque), [undefined, undefined, undefined, undefined, undefined, undefined, undefined]);
  assertEqual(L.map((c) => c.objectifs.map((o) => [o.type, o.cible])), [
    [['maison', 1], ['panneau', 1], ['pompe', 1], ['reservoir', 1], ['houe', 1], ['labours', 6], ['semis', 6], ['arrosees', 6], ['recoltes', 1]],
    [['niveau', 2], ['cultures', 4], ['silo', 1], ['semisBle', 1], ['siloBle', 50], ['caleche', 50]],
    [['pontes', 7], ['amis', 1], ['objet', 4], ['hameaux', 1]],
    [['pains', 5], ['plats', 3], ['objet', 1], ['objet', 1], ['monde', 10]],
    [['laines', 10], ['repas', 1], ['hameaux', 3], ['pecheMer', 1]],
    [['projets', 1], ['achatsHameaux', 5], ['faune', 6]],
    [['styles', 3], ['plans', 7], ['hameaux', 5], ['monde', 15]],
  ]);
  // fiche 9b : chaque chapitre après le premier a ses objectifs du grand monde, aucun ne demande la
  // ville, le Marché ou le train
  for (const ch of L.slice(1)) assert(ch.objectifs.some((o) => OBJECTIFS_MONDE.includes(o.type)), `${ch.titre} : un objectif du monde`);
  // version 1.22 : le palier 2 de l'Arbre des technologies (chapitre 3) demande du fer
  assertEqual([L[2].objectifs[2].item, L[3].objectifs[2].item], ['minerai_fer', 'lingot_fer']);
  assertEqual(DATA.ARBRE.PALIERS[2].chapitre, 3);
  assert(Object.values(DATA.ARBRE.noeuds).some((n) => n.palier === 2 && n.ressources && n.ressources.lingot_fer), 'un nœud du palier 2 demande un lingot de fer');
  assertEqual(DATA.AUTONOMIE, undefined, "l'autonomie a quitté le jeu");
  assertEqual(DATA.CHAPITRES.ELEMENTS, undefined, 'les libellés sont dans DATA.NIVEAUX.ELEMENTS');
});

test('état initial Lot 9 : chapitre 1, compteurs à zéro, historique vide', () => {
  const s = createInitialState(1);
  assertEqual(s.campagne, {
    chapitre: 1, fini: false, annonces: [], recompenses: [],
    compteurs: { eauMl: 0, mwhMax: 0, carottes: 0, serieOeufs: 0, pains: 0, plats: [], laines: 0, repasInvites: 0, recoltes: 0, cultures: [], semisBle: 0, labours: 0, semis: 0, arroseesMax: 0, objets: {}, calecheVentes: 0, achatsHameaux: 0, pecheMer: 0 },
  });
  assertEqual(chapterReached(s), 1);
});

/* --- compteurs --- */

test('compteurs : litres pompés au total, record de kWh stockés', () => {
  const s = farm({ pump: true });
  runFor(s, 10);
  assertEqual(s.campagne.compteurs.eauMl, s.jour.eau, 'mL pompés au total');
  assert(s.campagne.compteurs.eauMl > ml(9.9), `eau ${s.campagne.compteurs.eauMl}`);
  const stored = s.batteries[0].chargeMwh;
  assertEqual(s.campagne.compteurs.mwhMax, stored, 'le record suit la charge');
  testFillBatteries(s);
  tick(s, 0.2);
  const record = s.campagne.compteurs.mwhMax;
  assert(record > kwh(5.99) && record <= kwh(6), `record ${record}`);
  testEmptyBatteries(s);
  runFor(s, 1);
  assertEqual(s.campagne.compteurs.mwhMax, record, 'un record ne redescend pas');
});

testBase('compteurs : carottes récoltées', () => {
  const s = garden();
  plantRipe(s, 'potager-1', 'carotte');
  assert(harvest(s, 'potager-1').ok);
  assertEqual(s.campagne.compteurs.carottes, 6);
  plantRipe(s, 'potager-2', 'tomate');
  assert(harvest(s, 'potager-2').ok);
  assertEqual(s.campagne.compteurs.carottes, 6, 'une tomate n\'est pas une carotte');
  plantRipe(s, 'potager-3', 'carotte');
  assert(harvest(s, 'potager-3').ok);
  assertEqual(s.campagne.compteurs.carottes, 12, 'les graines rendues ne comptent pas');
});

testBase('compteurs : une récolte automatique compte aussi', () => {
  const s = garden();
  testSetBuildingLevel5(s, 'potager');
  plantRipe(s, 'potager-1', 'carotte');
  const r = harvest(s, 'potager-1', true);
  assertEqual(r.ok, true);
  assertEqual(s.campagne.compteurs.carottes, 6);
});

test('compteurs : laines tondues, pains cuits, plats différents', () => {
  const s = atelier();
  fillSheepAfterPasture(s);
  testWoolReady(s);
  for (const m of s.paturage.moutons) assert(shear(s, m.id).ok);
  assertEqual(s.campagne.compteurs.laines, 2);
  for (let i = 0; i < 2; i++) {
    addItem(s, 'farine', 2);
    s.eauMl = ml(40);
    assert(startRecipe(s, 'pain').ok);
    runFor(s, 25);
  }
  assertEqual([s.campagne.compteurs.pains, s.campagne.compteurs.plats], [2, []], 'le pain n\'est pas un plat');
  addItem(s, 'ble', 3);
  assert(startMilling(s, 1).ok);
  runFor(s, 10);
  assertEqual([s.campagne.compteurs.pains, s.campagne.compteurs.plats], [2, []], 'moudre n\'est ni un pain ni un plat');
  for (let i = 0; i < 2; i++) {
    addItem(s, 'oeuf', 3);
    addItem(s, 'huile', 1);
    assert(startRecipe(s, 'omelette').ok);
    runFor(s, 20);
  }
  assertEqual(s.campagne.compteurs.plats, ['omelette'], 'le même plat ne compte qu\'une fois');
  addItem(s, 'patate', 3);
  addItem(s, 'oeuf', 1);
  assert(startRecipe(s, 'gratin_patates').ok);
  runFor(s, 35);
  assertEqual(s.campagne.compteurs.plats, ['omelette', 'gratin_patates']);
});

function fillSheepAfterPasture(s) {
  assert(testBatir(reach(s, 'paturage'), 'etable').ok, 'débloquer le Pâturage');
  fillSheep(s, 2);
}

/* --- objectifs de chapitre --- */

test('chapitre 1 « L\'héritage » : foyer, houe, labour, semis, arrosage, première récolte ; chapitre 2 : le Silo', () => {
  const s = createNewGame(1, { nom: 'Martin' });
  const non = Array(6).fill(false);
  assertEqual([s.campagne.chapitre, okList(s)], [1, non]);
  assert(testBatir(s, 'foyer').ok);
  assertEqual(okList(s), [true, false, false, false, false, false]);
  s.potager.houe = true;   // (fabriquée à l'Atelier)
  assertEqual(okList(s), [true, true, false, false, false, false]);
  tireless(s);
  testSetLevel(s, 1);
  const T = farmTerrain(s);
  // FLU-42 : labourer 6 tuiles, planter 6 parcelles, les arroser le même jour
  for (let c = 0, n = 0; n < 6; c++) if (hoe(s, zoneTile(1, c, T)).ok) n += 1;
  assertEqual(objectiveValue(s, { type: 'labours' }), 6);
  assertEqual(okList(s).slice(2), [true, false, false, false]);
  addItem(s, 'graine_carotte', 6);
  const ids = s.potager.parcelles.map((p) => p.id);
  for (const id of ids) assert(plant(s, id, 'carotte').ok, `semis ${id}`);
  assertEqual(okList(s).slice(2), [true, true, false, false]);
  s.eauMl = 1000 * 1000;
  for (const id of ids.slice(0, 5)) assert(water(s, id).ok, `arrosage ${id}`);
  assertEqual([objectiveValue(s, { type: 'arrosees' }), okList(s)[4]], [5, false], '5 parcelles arrosées : pas encore');
  assert(water(s, ids[5]).ok);
  assertEqual(okList(s).slice(2), [true, true, true, false]);
  // la nuit sèche les parcelles, l'objectif reste acquis (record)
  for (const p of s.potager.parcelles) p.arrose = false;
  assertEqual(okList(s)[4], true);
  findPlot(s, ids[0]).stade = maxStage(findPlot(s, ids[0]));
  assertEqual(s.campagne.chapitre, 1);
  assert(harvest(s, ids[0]).ok);
  addItem(s, 'graine_courgette', 1);
  addItem(s, 'patate', 1);
  addItem(s, 'graine_tomate', 1);
  for (const [i, c] of [[1, 'carotte'], [2, 'patate'], [3, 'tomate'], [4, 'courgette']].entries()) {
    findPlot(s, ids[c[0] - 1]).culture = null;
    plantRipe(s, ids[c[0] - 1], c[1]);
    assert(harvest(s, ids[c[0] - 1]).ok, `récolte ${i}`);
  }
  assertEqual(okList(s).slice(0, 2), [true, true], 'quatre cultures différentes');
  updateChapters(s);
  assertEqual(s.campagne.chapitre, 2);
  testSetLevel(s, 3);
  assert(testBatir(reach(s, 'silo'), 'silo').ok);
  addItem(s, 'ble', 5);
  assert(plant(s, ids[0], 'ble').ok);
  assertEqual(okList(s), [true, true, true, true, false]);
  storeWheat(s, 49);
  updateChapters(s);
  assertEqual([s.silo.ble, s.campagne.chapitre], [49, 2], 'pas encore 50 blés au Silo');
  storeWheat(s, 1);
  updateChapters(s);
  assertEqual([s.campagne.chapitre, okList(s).every(Boolean)], [2, true], 'fiche 9b : il reste à vendre à la calèche');
  // (elle passe à la ferme chaque jour : vendre ses carottes)
  addItem(s, 'carotte', 30);
  assert(vendreCaleche(s, 'carotte', 30, null, { sansPresence: true }).ok);
  assert(s.campagne.compteurs.calecheVentes >= 50, `${s.campagne.compteurs.calecheVentes} pièces`);
  updateChapters(s);
  assertEqual(s.campagne.chapitre, 3);
});

testBase('version 1.12 : chapitre 2 : la même culture récoltée quatre fois ne compte qu\'une fois', () => {
  const s = atChapter(2);
  for (let i = 1; i <= 4; i++) {
    plantRipe(s, `potager-${i}`, 'carotte');
    assert(harvest(s, `potager-${i}`).ok);
  }
  assertEqual([s.campagne.compteurs.recoltes, s.campagne.compteurs.cultures], [4, ['carotte']]);
  assertEqual(okList(s)[1], false);
});

testBase('chapitre 3 : 7 nuits de ponte d\'affilée (et un ami, le minerai)', () => {
  const s = boite(mondeFait(atChapter(3)), { carotte: 200 }); // des légumes de la ferme : la famille est nourrie par la ferme
  setInv(s, {});
  s.pieces = 5000;
  assert(testBatir(reach(s, 'silo'), 'silo').ok);
  assert(testBatir(reach(s, 'poulailler'), 'poulailler').ok);
  for (let i = 0; i < 4; i++) assert(buyAnimal(s, 'poule').ok);
  testAddWheat(s, 50);
  for (let night = 1; night <= 7; night++) {
    assertEqual(s.campagne.chapitre, 3, `nuit ${night} : toujours le chapitre 3`);
    assert(feedAllHens(s).ok);
    affamer(s); // la famille mange les carottes de la ferme
    sleepOnce(s);
    assertEqual(s.campagne.compteurs.serieOeufs, night);
  }
  assertEqual([s.campagne.chapitre, okList(s)], [3, [true, false]], 'version 1.22 : il manque le minerai de fer');
  addItem(s, 'minerai_fer', 4);
  updateChapters(s);
  assertEqual(s.campagne.chapitre, 4);
  assertEqual(s.campagne.annonces.map((a) => a.chapitre), [3]);
});

// La nouvelle vision : l'autonomie a quitté le jeu ; le chapitre 3 demande un ami « cordial ».
test('chapitre 3 : sans ami cordial, les pontes ne suffisent pas', () => {
  const s = mondeFait(atChapter(3));
  s.monde.habitants = {};
  s.campagne.compteurs.serieOeufs = 7;
  addItem(s, 'minerai_fer', 4);
  updateChapters(s);
  assertEqual(s.campagne.chapitre, 3);
  assertEqual(chapterProgress(s).objectifs.find((o) => o.type === 'amis').ok, false);
  vieFaite(s);
  updateChapters(s);
  assertEqual(s.campagne.chapitre, 4);
});

testBase('remise à zéro : une nuit sans œuf casse la série de ponte', () => {
  const s = atChapter(3);
  s.pieces = 5000;
  assert(testBatir(reach(s, 'silo'), 'silo').ok);
  assert(testBatir(reach(s, 'poulailler'), 'poulailler').ok);
  for (let i = 0; i < 4; i++) assert(buyAnimal(s, 'poule').ok);
  testAddWheat(s, 50);
  for (let night = 1; night <= 3; night++) {
    assert(feedAllHens(s).ok);
    sleepOnce(s);
  }
  assertEqual(s.campagne.compteurs.serieOeufs, 3);
  sleepOnce(s); // les poules n'ont pas été nourries : pas d'œuf
  assertEqual(s.campagne.compteurs.serieOeufs, 0);
  assert(feedAllHens(s).ok);
  sleepOnce(s);
  assertEqual(s.campagne.compteurs.serieOeufs, 1, 'la série repart de 1');
});

test('séries d\'affilée : elles ne comptent qu\'à partir du chapitre qui les porte', () => {
  const s = atChapter(1);
  testAddHens(s, 4);
  testAddWheat(s, 20);
  feedAllHens(s);
  sleepOnce(s);
  assertEqual(s.campagne.compteurs.serieOeufs, 0, 'chapitre 1 : la ponte ne compte pas encore');
});

testBase('chapitre 4 : 5 pains et 3 plats différents', () => {
  const s = atelier();
  testGoToChapter(s, 4);
  mondeFait(s);
  for (let i = 0; i < 5; i++) {
    addItem(s, 'farine', 2);
    s.eauMl = ml(40);
    assert(startRecipe(s, 'pain').ok);
    runFor(s, 25);
  }
  assertEqual([s.campagne.compteurs.pains, okList(s)], [5, [true, false, false, false]]);
  assertEqual(s.campagne.chapitre, 4, 'cinq pains ne font pas les trois plats');
  // version 1.22 : un lingot de fer fondu au Four (4 minerais + du bois)
  addItem(s, 'minerai_fer', 4);
  addItem(s, 'bois', 3);
  assert(startRecipe(s, 'lingot_fer').ok, 'fondre un lingot de fer');
  runFor(s, 25);
  assertEqual([countItem(s, 'minerai_fer'), countItem(s, 'lingot_fer'), okList(s)[2]], [0, 1, true]);
  // la mine n'est plus (docs/gisements.md, lot 4) : un quartz des cristaux de la montagne
  assertEqual(okList(s)[3], false);
  addItem(s, 'quartz', 1);
  assertEqual(okList(s)[3], true);
  const dishes = [['omelette', { oeuf: 3, huile: 1 }, 20], ['gratin_patates', { patate: 3, oeuf: 1 }, 35], ['ratatouille', { tomate: 1, courgette: 1, aubergine: 1, huile: 1 }, 35]];
  dishes.forEach(([id, ing, secs], i) => {
    for (const [item, n] of Object.entries(ing)) addItem(s, item, n);
    assert(startRecipe(s, id).ok, id);
    runFor(s, secs);
    assertEqual(s.campagne.compteurs.plats.length, i + 1);
  });
  assertEqual(s.campagne.chapitre, 5);
  assertEqual(s.campagne.annonces.map((a) => a.chapitre), [4]);
});

test('version 1.22 : objectif « objet » : le record reste quand le minerai est fondu ou le lingot dépensé', () => {
  const s = atChapter(3);
  const objet = () => chapterProgress(s).objectifs.find((o) => o.type === 'objet');
  assertEqual([objet().item, objet().valeur, objet().ok], ['minerai_fer', 0, false]);
  addItem(s, 'minerai_fer', 3);
  updateChapters(s);
  assertEqual(objet().valeur, 3);
  takeItem(s, 'minerai_fer', 3);
  updateChapters(s);
  assertEqual([objet().valeur, s.campagne.compteurs.objets.minerai_fer], [3, 3], 'le record reste');
  addItem(s, 'minerai_fer', 4);
  assertEqual(objet().ok, true, 'quatre minerais en main, avant même le pas d\'horloge');
  updateChapters(s);
  takeItem(s, 'minerai_fer', 4);
  assertEqual([objet().valeur, objet().ok], [4, true]);
});

test('version 1.22 : objectif « objet » : un minerai eu avant le chapitre compte, une ancienne sauvegarde sans record aussi', () => {
  const s = atChapter(2);
  addItem(s, 'minerai_fer', 5);
  updateChapters(s);
  takeItem(s, 'minerai_fer', 5);
  s.campagne.chapitre = 3; // le chapitre 2 terminé (testGoToChapter remettrait les compteurs à zéro)
  assertEqual(chapterProgress(s).objectifs[2].valeur, 5);
  // une sauvegarde d'avant la version 1.22 : pas de compteurs.objets
  const v = atChapter(3);
  delete v.campagne.compteurs.objets;
  assertEqual(chapterProgress(v).objectifs[2].valeur, 0);
  addItem(v, 'minerai_fer', 4);
  updateChapters(v);
  assertEqual(v.campagne.compteurs.objets.minerai_fer, 4);
});

test('version 1.22 : une partie déjà au-delà du chapitre 4 ne recule pas', () => {
  const s = atChapter(5);
  updateChapters(s);
  assertEqual([s.campagne.chapitre, s.campagne.fini], [5, false]);
  assertEqual(chapterProgress(s).objectifs.some((o) => o.type === 'objet'), false);
});

testBase('chapitre 5 : 10 laines et un repas partagé', () => {
  const s = pature();
  testGoToChapter(s, 5);
  mondeFait(s);
  s.campagne.compteurs.repasInvites = 0;
  fillSheep(s, 3);
  for (let round = 0; round < 3; round++) {
    testWoolReady(s);
    for (const m of s.paturage.moutons) assert(shear(s, m.id).ok);
  }
  updateChapters(s);
  assertEqual([s.campagne.compteurs.laines, okList(s)], [9, [false]]);
  testWoolReady(s);
  assert(shear(s, s.paturage.moutons[0].id).ok);
  updateChapters(s);
  assertEqual([s.campagne.compteurs.laines, okList(s), s.campagne.chapitre], [10, [true], 5], 'il manque le repas partagé');
  s.campagne.compteurs.repasInvites = 1;
  updateChapters(s);
  assert(chapterReached(s) >= 6, 'le repas partagé : le chapitre 5 est terminé');
});

// La nouvelle vision : le chapitre 6 demande un projet de hameau achevé, le 7 des styles mêlés et des plans.
test('chapitre 6 : un projet de hameau achevé', () => {
  const s = mondeFait(atChapter(6));
  s.projets = {};
  updateChapters(s);
  assertEqual(s.campagne.chapitre, 6);
  s.projets = { h_vie: { rang: 1, recu: {}, don: null, faits: [{ sorte: 'place', jour: 1 }] } };
  updateChapters(s);
  assertEqual(s.campagne.chapitre, 7);
});

test('chapitre 7 : trois styles mêlés (ou un style complet) et sept plans terminent la campagne', () => {
  const s = mondeFait(atChapter(7));
  // (la maison de pierre : le style champêtre, deux pièces)
  s.sols = {};
  updateChapters(s);
  const o = () => chapterProgress(s).objectifs.find((x) => x.type === 'styles');
  assertEqual([s.campagne.fini, o().valeur], [false, 1]);
  s.sols = { 3: 'plancher', 4: 'sol_chevrons' };
  assertEqual(o().valeur, 2, 'deux styles mêlés');
  s.sols[5] = 'sol_carrelage';
  s.sols[6] = 'sol_mosaique';
  assertEqual(o().valeur, 3);
  const P = s.plans.connus;
  s.plans.connus = Object.fromEntries(Object.entries(P).slice(0, 6));
  updateChapters(s);
  assertEqual(s.campagne.fini, false, 'six plans : pas encore');
  s.plans.connus = P;
  nightWithProduced(s, 10);
  assertEqual([s.campagne.fini, s.campagne.chapitre, chapterReached(s)], [true, 7, 8]);
  assertEqual(s.campagne.annonces.map((a) => a.chapitre), [7]);
  // un style complet compte pour l'objectif entier
  const t = mondeFait(atChapter(7));
  t.sols = {};
  t.blocs = { ...t.blocs };
  DATA.STYLES.LISTE.champetre.blocs.filter((b) => /^sol_|^chemin/.test(b)).forEach((b, i) => { t.sols[10 + i] = b; });
  ['meuble_table', 'meuble_chaise', 'meuble_buffet'].forEach((b, i) => { t.blocs[20 + i] = b; });
  assertEqual(chapterProgress(t).objectifs.find((x) => x.type === 'styles').ok, true);
});

test('chapitres : la campagne finie ne recule pas et ne recompte rien', () => {
  const s = atChapter(8);
  assertEqual(updateChapters(s), 0);
  assertEqual(completeChapter(s).ok, false);
  assertEqual(s.campagne.annonces, []);
});

test('cultures plantables : chacune à son niveau, le blé attend aussi le Silo', () => {
  const at = (n) => { const s = farm(); testSetLevel(s, n); return s; };
  assertEqual(plantableCropsFor(at(1), 'potager'), ['carotte', 'patate', 'tomate']);
  assertEqual(plantableCropsFor(at(2), 'potager'), ['carotte', 'patate', 'tomate', 'courgette', 'aubergine', 'oignon']);
  const n3 = at(3);
  assertEqual(plantableCropsFor(n3, 'potager'), ['carotte', 'patate', 'tomate', 'courgette', 'aubergine', 'poivron', 'oignon', 'ail', 'fraise'], 'pas de blé sans Silo');
  n3.pieces = 100;
  assert(testBatir(reach(n3, 'silo'), 'silo').ok);
  assertEqual(plantableCropsFor(n3, 'potager').includes('ble'), true, 'Silo construit : le blé se plante');
  const n5 = at(5);
  testBatir(reach(n5, 'silo'), 'silo');
  assertEqual(plantableCropsFor(n5, 'potager'), ['carotte', 'patate', 'tomate', 'courgette', 'aubergine', 'poivron', 'oignon', 'ail', 'epinard', 'fraise', 'ble', 'tournesol', 'riz', 'houblon']);
  assertEqual(plantableCropsFor(at(6), 'serre'), ['tomate', 'courgette', 'aubergine', 'poivron'], 'cacao, vanille, café au niveau 7');
  assertEqual(plantableCropsFor(at(7), 'serre'), plantableCrops('serre'));
  assertEqual(plantableCropsFor(at(10), 'champ'), [], 'le lieu « champ » n\'existe plus');
  assertEqual(['carotte', 'oignon', 'ble', 'epinard', 'houblon', 'cacao'].map(unlockLevel), [1, 2, 3, 4, 5, 7]);
});

test('affichage : pourcentage arrondi vers le bas, 100 % seulement à 100', () => {
  assertEqual([formatPercent(0), formatPercent(37.5), formatPercent(99.99), formatPercent(100), formatPercent(undefined)], ['0\u00a0%', '37\u00a0%', '99\u00a0%', '100\u00a0%', '0\u00a0%']);
});

// Le récit (docs/recit/) : la terre sauvage est celle du grand-père, Maurice. Les textes en parlent ; ils ne
// parlent plus de la ferme d'avant (sa maison, son moulin, ses dépendances).
test('terre sauvage : le chapitre 1 et les lettres de Maurice parlent de la terre du grand-père, pas de sa ferme', () => {
  const s = createNewGame(1);
  const p = chapterProgress(s);
  assertEqual(/grand-père/.test(p.intro), true, p.intro);
  assertEqual(/moulin|dépendances|répare la maison/i.test(p.intro), false, p.intro);
  // (le panneau, la pompe et la citerne n'arrivent qu'avec l'automatisation : pas d'objectif)
  assertEqual(p.objectifs.slice(0, 3).map((o) => o.libelle), ['Bâtir le foyer (une pièce close, une paillasse)', 'Fabriquer une houe à l\'Atelier', 'Labourer 6 tuiles']);
  assertEqual(p.objectifs.filter((o) => ['panneau', 'pompe', 'reservoir'].includes(o.type)).length, 0);
  for (const id of ['maurice_terre', 'maurice_enveloppe']) assertEqual(mailText(s, id).some((l) => /moulin|dépendances|la maison a besoin/i.test(l)), false, id);
  assertEqual(mailText(s, 'maurice_terre').some((l) => /restée sauvage/.test(l)), true, 'Maurice parle de sa terre sauvage');
});

// La nouvelle vision : l'autonomie quitte le jeu (v67 → v68).
test('migration v67 → v68 : l\'étape « autonomie » du didacticiel disparaît, les compteurs de la tenue aussi', () => {
  const s = createInitialState(1);
  const vieille = (didacticiel) => {
    const { repasInvites, ...k } = s.campagne.compteurs;
    return { v: 67, t: 0, s: { ...JSON.parse(JSON.stringify(s)), version: 67, didacticiel,
      campagne: { ...s.campagne, compteurs: { ...k, serie100: 3, nuits100: 12, tenue: null, tenueDerniere: null, tenueReussie: true } } } };
  };
  const m = migrate(vieille({ etape: 6, fini: false }));   // (« deplacement », la 7e d'alors)
  assertEqual(ETAPES[m.didacticiel.etape], 'deplacement');
  assertEqual(ETAPES[migrate(vieille({ etape: 3, fini: false })).didacticiel.etape], 'xp', 'avant : la même');
  assertEqual(migrate(vieille({ etape: 30, fini: true })).didacticiel, { etape: 30, fini: true }, 'fini : rien ne change');
  assertEqual(m.campagne.compteurs, s.campagne.compteurs, 'les compteurs d\'aujourd\'hui, le repas partagé à zéro');
});

// Plus aucun calcul d'autonomie, même en coulisse (v68 → v69).
test('migration v68 → v69 : l\'historique d\'autonomie, l\'autonomie de la nuit et les points « produits » s\'effacent', () => {
  const s = createInitialState(1);
  const v68 = JSON.parse(JSON.stringify(s));
  Object.assign(v68, { version: 68, repasJour: { mange: { patate: 2 }, energie: 10, produit: 10 } });
  v68.campagne.historique = [{ nuit: 1, pct: 40, energie: 60 }];
  Object.assign(v68.nuit, { autonomie: 40, energieProduit: 60 });
  const m = migrate({ v: 68, t: 0, s: v68 });
  assertEqual(['historique' in m.campagne, 'autonomie' in m.nuit, 'energieProduit' in m.nuit], [false, false, false]);
  assertEqual(m.repasJour, { mange: { patate: 2 }, energie: 10 });
  assertEqual(m.campagne, s.campagne);
});

/* ---------- piste 5 du chantier « allègement » : les objectifs revus chaque seconde ---------- */

// Le chapitre 2 rempli sauf la vente à la calèche : la vente (le « geste ») est faite à la main.
function avantLaVente() {
  const s = atChapter(2);
  testSetLevel(s, 3);
  Object.assign(s.campagne.compteurs, { cultures: ['carotte', 'patate', 'tomate', 'courgette'], semisBle: 1 });
  assert(testBatir(reach(s, 'silo'), 'silo').ok);
  storeWheat(s, 50);
  tick(s, 0.2);   // (un premier pas évalue : le compteur repart de là)
  assertEqual([s.campagne.chapitre, chapterProgress(s).objectifs.map((o) => o.ok)], [2, [true, true, true, true, true, false]]);
  return s;
}

test('piste 5 : tick revoit les objectifs du chapitre au plus tard 1 s après', () => {
  assertEqual(PAS_OBJECTIFS, 5);
  const s = avantLaVente();
  s.campagne.compteurs.calecheVentes = 50;
  let pas = 0;
  while (s.campagne.chapitre === 2 && pas < 10) { tick(s, 0.2); pas += 1; }
  assertEqual(s.campagne.chapitre, 3);
  assert(pas <= PAS_OBJECTIFS, `${pas} pas`);
});

test('piste 5 : après une commande du joueur, les objectifs sont revus au pas suivant', () => {
  // (la marque seule, puis une vraie commande : un semis)
  const a = avantLaVente();
  a.campagne.compteurs.calecheVentes = 50;
  objectifsARevoir(a);
  tick(a, 0.2);
  assertEqual(a.campagne.chapitre, 3, 'objectifsARevoir');
  const s = avantLaVente();
  s.campagne.compteurs.calecheVentes = 50;
  const libre = s.potager.parcelles.find((p) => !p.culture);
  assert(libre, 'une parcelle libre');
  addItem(s, 'graine_carotte', 1);
  const cmd = (args) => executerCommande(s, { id: `p5-${args.culture}`, type: 'potager.planter', args });
  assert(!cmd({ parcelle: libre.id, culture: 'licorne' }).ok, 'une commande refusée');
  tick(s, 0.2);
  assertEqual(s.campagne.chapitre, 2, 'une commande refusée ne compte pas');
  assert(cmd({ parcelle: libre.id, culture: 'carotte' }).ok, 'le semis');
  tick(s, 0.2);
  assertEqual(s.campagne.chapitre, 3, 'après le semis');
});

test('piste 5 : les records d\'objets restent notés à chaque pas', () => {
  const s = avantLaVente();
  const avant = s.campagne.compteurs.objets.minerai_fer || 0;
  addItem(s, 'minerai_fer', avant + 3);
  tick(s, 0.2);
  takeItem(s, 'minerai_fer', avant + 3);
  tick(s, 0.2);
  assert((s.campagne.compteurs.objets.minerai_fer || 0) >= avant + 3, 'le maximum est gardé');
});
