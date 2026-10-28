/* ==========================================================================
   Tests du moteur : Lot 9 : autonomie et chapitres.
   Lancer seul : node --test tests/engine/chapitres.test.mjs (ou node tests/run-tests.mjs chapitres).
   ========================================================================== */

import {
  acheterCaleche, addItem, addLot, autonomyHistory, autonomyPercent, buyAnimal, buyItem, chapterProgress,
  chapterReached, completeChapter, countItem, createInitialState, createNewGame, DATA, farmTerrain,
  feedAllHens, findPlot, formatPercent, harvest, hoe, holdStatus, lastAutonomy, lotsOf, mailText,
  maxStage, moveToFridge, objectiveValue, plannedAutonomy, plant, plantableCrops,
  plantableCropsFor, shear, startMilling, startRecipe, storeWheat, takeItem, testAddHens,
  testAddWheat, testBatir, testEmptyBatteries, testFillBatteries, testGoToChapter,
  testSetBuildingLevel5, testSetLevel, testWoolReady, tick, unlockLevel, updateChapters, water,
  zoneTile,
} from '../../js/engine/index.js';
import {
  affamer, assert, assertEqual, atChapter, atelier, boite, coldRoom, farm, fillSheep, garden,
  holdNights, kwh, ml, mondeFait, nightWithProduced, OBJECTIFS_MONDE, pature, plantRipe, reach, runFor, setInv, sleepOnce,
  test, testBase, tireless, versBoite,
} from './aide.mjs';
import { vendreCaleche } from '../../js/engine/caleche.js';

/* ---------- Lot 9 : autonomie et chapitres ---------- */

// Les objectifs de la ferme (fiche 9b : ceux du grand monde, à part : OBJECTIFS_MONDE, mondeFait).
function okList(s) {
  return chapterProgress(s).objectifs.filter((o) => !OBJECTIFS_MONDE.includes(o.type)).map((o) => o.ok);
}

test('DATA Lot 9 : sept chapitres, objectifs (version 1.7 : ils ne débloquent plus rien)', () => {
  const L = DATA.CHAPITRES.liste;
  assertEqual(L.map((c) => c.titre), ['L\'héritage', 'Le grenier', 'Le poulailler', 'Le four et le livre de recette', 'Le troupeau', 'Toute l\'année', 'Famille autonome']);
  assertEqual(L.map((c) => c.debloque), [undefined, undefined, undefined, undefined, undefined, undefined, undefined]);
  assertEqual(L.map((c) => c.objectifs.map((o) => [o.type, o.cible])), [
    [['maison', 1], ['panneau', 1], ['pompe', 1], ['reservoir', 1], ['houe', 1], ['labours', 6], ['semis', 6], ['arrosees', 6], ['recoltes', 1]],
    [['niveau', 2], ['cultures', 4], ['silo', 1], ['semisBle', 1], ['siloBle', 50], ['caleche', 50]],
    [['pontes', 7], ['autonomie', 50], ['objet', 4], ['hameaux', 1]],
    [['pains', 5], ['plats', 3], ['objet', 1], ['grotteMonde', 1], ['monde', 10]],
    [['laines', 10], ['autonomie', 60], ['hameaux', 3], ['pecheMer', 1]],
    [['tenue', 1], ['achatsHameaux', 5], ['faune', 6]],
    [['serie100', 7], ['hameaux', 5], ['monde', 15]],
  ]);
  // fiche 9b : chaque chapitre après le premier a ses objectifs du grand monde, aucun ne demande la
  // ville, le Marché ou le train
  for (const ch of L.slice(1)) assert(ch.objectifs.some((o) => OBJECTIFS_MONDE.includes(o.type)), `${ch.titre} : un objectif du monde`);
  // version 1.22 : le palier 2 de l'Arbre des technologies (chapitre 3) demande du fer
  assertEqual([L[2].objectifs[2].item, L[3].objectifs[2].item], ['minerai_fer', 'lingot_fer']);
  assertEqual(DATA.ARBRE.PALIERS[2].chapitre, 3);
  assert(Object.values(DATA.ARBRE.noeuds).some((n) => n.palier === 2 && n.ressources && n.ressources.lingot_fer), 'un nœud du palier 2 demande un lingot de fer');
  assertEqual([DATA.CHAPITRES.liste[5].objectifs[0].nuits, DATA.CHAPITRES.liste[5].objectifs[0].moyenne], [10, 80]);
  assertEqual(DATA.AUTONOMIE, { HISTORIQUE_MAX: 1000, GRAPHIQUE_NUITS: 20 });
  assertEqual(DATA.CHAPITRES.ELEMENTS, undefined, 'les libellés sont dans DATA.NIVEAUX.ELEMENTS');
});

test('état initial Lot 9 : chapitre 1, compteurs à zéro, historique vide', () => {
  const s = createInitialState(1);
  assertEqual(s.campagne, {
    chapitre: 1, fini: false, annonces: [], historique: [],
    compteurs: { eauMl: 0, mwhMax: 0, carottes: 0, serieOeufs: 0, pains: 0, plats: [], laines: 0, serie100: 0, nuits100: 0, tenue: null, tenueDerniere: null, tenueReussie: false, recoltes: 0, cultures: [], semisBle: 0, labours: 0, semis: 0, arroseesMax: 0, objets: {}, calecheVentes: 0, achatsHameaux: 0, pecheMer: 0 },
  });
  assertEqual(chapterReached(s), 1);
  assertEqual(lastAutonomy(s), 0);
});

/* --- autonomie --- */

test('autonomie : points « produit » mangés ÷ points mangés, plafonnée à 100 %', () => {
  assertEqual(autonomyPercent(75, 150), 50);
  assertEqual(autonomyPercent(30, 150), 20);
  assertEqual(autonomyPercent(165, 150), 100);
  assertEqual(autonomyPercent(0, 150), 0);
  assertEqual(autonomyPercent(50, 0), 0);
  // 3 membres au seuil (20) mangent jusqu'à 100 : 6 patates (valeur 5 : 30 points) d'abord, puis
  // les conserves (valeur 6), qui ne périment pas
  const s = boite(farm(), { patate: 6, conserve: 100 });
  affamer(s);
  const r = sleepOnce(s);
  assertEqual([r.energieProduit, r.energieMangee, r.autonomie], [30, 252, 11]);
  assertEqual(s.campagne.historique, [{ nuit: 1, pct: 11, energie: 30 }]);
  assertEqual(lastAutonomy(s), 11);
});

test('autonomie : les conserves n\'y comptent pas ; un jour sans repas garde celle de la veille', () => {
  const s = boite(farm(), { conserve: 60 });
  affamer(s);
  const r = sleepOnce(s);
  assertEqual(r.couverture, 100, 'la famille est rassasiée');
  assertEqual([r.energieMangee, r.energieProduit, r.autonomie], [252, 0, 0]);
  // le lendemain, avec des patates, puis un jour où personne n'a faim : l'autonomie reste
  boite(s, { patate: 60 });
  affamer(s);
  assertEqual(sleepOnce(s).autonomie, 100);
  const r3 = sleepOnce(s);
  assertEqual([r3.energieMangee, r3.autonomie, lastAutonomy(s)], [0, 100, 100]);
});

test('autonomie : un achat à la calèche n\'y compte pas, une récolte oui', () => {
  const s = farm();
  setInv(s, { conserve: 60 });
  s.pieces = 500;
  // (fiche 7c : des carottes d'un hameau, dans le coffre de la calèche)
  s.caleche = { coffre: { carotte: 4 }, haltes: [], fait: null, jour: null };
  assert(acheterCaleche(s, 'carotte', 4, null, { sansPresence: true }).ok, 'acheter 4 carottes');
  addItem(s, 'carotte', 15); // récoltées
  assertEqual(lotsOf(s, 'carotte').map((l) => [l.qty, l.origin]).sort(), [[4, 'acheté'], [15, 'produit']].sort());
  versBoite(s);
  // les 19 carottes (valeur 2) passent avant les conserves : 38 points, dont 30 récoltés
  affamer(s);
  const r = sleepOnce(s);
  assertEqual(r.energieProduit, 30, 'seules les 15 carottes récoltées comptent');
  assertEqual(r.autonomie, Math.floor((30 * 100) / r.energieMangee));
});

test('autonomie : au frigo, les œufs gardent leur origine', () => {
  const s = coldRoom({ lest: 0 });
  s.famille.reserve = {};
  setInv(s, { conserve: 4 });
  addItem(s, 'oeuf', 10);
  addLot(s, 'oeuf', 10, 'acheté');
  assert(moveToFridge(s, 'oeuf', 20).ok, 'ranger les œufs au frigo');
  // le frigo construit, la famille mange au frigo (pas dans l'inventaire) : les 10 œufs
  // « produit » d'abord (valeur 3), puis les 10 achetés ; il en manque, deux ont faim
  affamer(s);
  const r = sleepOnce(s);
  assertEqual([r.energieMangee, r.energieProduit, r.autonomie, countItem(s, 'conserve')], [60, 30, 50, 4]);
  assert(s.nuit.affames.length > 0, 'il n\'y avait pas assez à manger');
});

test('autonomie : la prévision de la nuit est celle qui est vraiment mesurée', () => {
  const s = farm();
  setInv(s, { patate: 5, carotte: 10, conserve: 60 });
  addLot(s, 'carotte', 7, 'acheté');
  versBoite(s);
  assertEqual(plannedAutonomy(s), 0, 'personne n\'a encore mangé : celle de la veille');
  affamer(s);
  const prevue = plannedAutonomy(s);
  assert(prevue > 0 && prevue < 100);
  assertEqual(sleepOnce(s).autonomie, prevue);
});

test('autonomie : l\'historique garde une entrée par nuit, dans la limite fixée', () => {
  const s = farm();
  for (let i = 0; i < 3; i++) sleepOnce(s);
  assertEqual(s.campagne.historique.map((h) => h.nuit), [1, 2, 3]);
  assertEqual(autonomyHistory(s, 2).map((h) => h.nuit), [2, 3]);
  const saved = DATA.AUTONOMIE.HISTORIQUE_MAX;
  DATA.AUTONOMIE.HISTORIQUE_MAX = 5;
  try {
    const t = farm();
    for (let i = 0; i < 8; i++) {
      setInv(t, { conserve: 50 });
      sleepOnce(t);
    }
    assertEqual(t.campagne.historique.map((h) => h.nuit), [4, 5, 6, 7, 8]);
  } finally {
    DATA.AUTONOMIE.HISTORIQUE_MAX = saved;
  }
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

testBase('chapitre 3 : 7 nuits de ponte d\'affilée et 50 % d\'autonomie', () => {
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
  assertEqual([s.campagne.chapitre, okList(s)], [3, [true, true, false]], 'version 1.22 : il manque le minerai de la grotte');
  addItem(s, 'minerai_fer', 4);
  updateChapters(s);
  assertEqual(s.campagne.chapitre, 4);
  assertEqual(s.campagne.annonces.map((a) => a.chapitre), [3]);
});

test('chapitre 3 : sept nuits sans l\'autonomie requise ne suffisent pas', () => {
  const s = mondeFait(atChapter(3));
  s.campagne.compteurs.serieOeufs = 7;
  s.campagne.historique = [{ nuit: 1, pct: 49, energie: 73 }];
  addItem(s, 'minerai_fer', 4);
  assertEqual(okList(s), [true, false, true]);
  updateChapters(s);
  assertEqual(s.campagne.chapitre, 3);
  s.campagne.historique.push({ nuit: 2, pct: 50, energie: 75 });
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
  const t = atChapter(6);
  nightWithProduced(t, 48);
  assertEqual(t.campagne.compteurs.serie100, 0, 'chapitre 6 : les nuits à 100 % ne comptent pas encore');
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
  assertEqual([s.campagne.compteurs.pains, okList(s)], [5, [true, false, false]]);
  assertEqual(s.campagne.chapitre, 4, 'cinq pains ne font pas les trois plats');
  // version 1.22 : un lingot de fer fondu au Four (4 minerais + du bois)
  addItem(s, 'minerai_fer', 4);
  addItem(s, 'bois', 3);
  assert(startRecipe(s, 'lingot_fer').ok, 'fondre un lingot de fer');
  runFor(s, 25);
  assertEqual([countItem(s, 'minerai_fer'), countItem(s, 'lingot_fer'), okList(s)[2]], [0, 1, true]);
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

testBase('chapitre 5 : 10 laines et 60 % d\'autonomie', () => {
  const s = pature();
  testGoToChapter(s, 5);
  mondeFait(s);
  fillSheep(s, 3);
  for (let round = 0; round < 3; round++) {
    testWoolReady(s);
    for (const m of s.paturage.moutons) assert(shear(s, m.id).ok);
  }
  updateChapters(s);
  assertEqual([s.campagne.compteurs.laines, okList(s)], [9, [false, false]]);
  testWoolReady(s);
  assert(shear(s, s.paturage.moutons[0].id).ok);
  updateChapters(s);
  assertEqual([s.campagne.compteurs.laines, okList(s)], [10, [true, false]]);
  // patate de valeur 5 : 25 patates sur ~245 points mangés ≈ 51 % : pas assez
  nightWithProduced(s, 25);
  assertEqual(s.campagne.chapitre, 5);
  nightWithProduced(s, 31); // ≈ 63 %
  assertEqual(s.campagne.chapitre, 6);
});

// Version 1.6 : l'hiver du chapitre 6 devient une série de 10 nuits d'affilée.
test('chapitre 6 : 10 nuits d\'affilée à 80 % en moyenne, sans soin', () => {
  const s = mondeFait(atChapter(6));
  s.day = 31;
  holdNights(s, 9, 50); // de quoi tout couvrir : 100 %
  assertEqual([s.campagne.chapitre, s.campagne.compteurs.tenue.nuits], [6, 9]);
  holdNights(s, 1, 50);
  assertEqual(s.campagne.chapitre, 7);
  assertEqual(s.campagne.compteurs.tenueReussie, true);
  assertEqual(s.campagne.compteurs.tenueDerniere.reussi, true);
  assertEqual(s.day, 41);
});

test('chapitre 6 : la série commence dès la première nuit du chapitre, quel que soit le jour', () => {
  for (const day of [1, 7, 33]) {
    const s = mondeFait(atChapter(6));
    s.day = day;
    holdNights(s, 10, 48);
    assertEqual(s.campagne.chapitre, 7, `départ à la nuit ${day}`);
  }
});

test('chapitre 6 : une moyenne de 76 % ne suffit pas, une nouvelle série suit aussitôt', () => {
  const s = mondeFait(atChapter(6));
  // 38 patates (190 points) sur 244 points mangés : 77 %, sous 80 %
  holdNights(s, 10, 38);
  assertEqual(s.campagne.chapitre, 6);
  assertEqual(s.campagne.compteurs.tenueDerniere, { moyenne: 77, reussi: false });
  assertEqual(s.campagne.compteurs.tenue, null);
  holdNights(s, 1, 48);
  assertEqual(s.campagne.compteurs.tenue.nuits, 1, 'la série suivante a commencé');
  holdNights(s, 9, 48);
  assertEqual(s.campagne.chapitre, 7);
});

test('chapitre 6 : la moyenne compte toutes les nuits, pas seulement la dernière', () => {
  const s = atChapter(6);
  holdNights(s, 5, 50); // 100 %
  holdNights(s, 5, 20); // 100 points sur 244 : 40 %
  assertEqual(s.campagne.chapitre, 6);
  assertEqual(s.campagne.compteurs.tenueDerniere.moyenne, 70);
});

test('chapitre 7 : 100 % pendant 7 nuits d\'affilée termine la campagne', () => {
  const s = mondeFait(atChapter(7));
  for (let night = 1; night <= 6; night++) {
    nightWithProduced(s, 48); // 240 points : 100 %
    assertEqual([s.campagne.compteurs.serie100, s.campagne.fini], [night, false]);
  }
  nightWithProduced(s, 48);
  assertEqual(s.campagne.fini, true);
  assertEqual(s.campagne.chapitre, 7);
  assertEqual(chapterReached(s), 8);
  assertEqual(s.campagne.annonces.map((a) => a.chapitre), [7]);
});

test('remise à zéro : une nuit sous 100 % casse la série d\'autonomie', () => {
  const s = mondeFait(atChapter(7));
  for (let i = 0; i < 4; i++) nightWithProduced(s, 48);
  assertEqual(s.campagne.compteurs.serie100, 4);
  nightWithProduced(s, 44); // 220 points sur 244 : 90 %
  assertEqual(s.campagne.compteurs.serie100, 0);
  for (let i = 0; i < 6; i++) nightWithProduced(s, 48);
  assertEqual([s.campagne.compteurs.serie100, s.campagne.fini], [6, false]);
  nightWithProduced(s, 48);
  assertEqual(s.campagne.fini, true);
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

test('tenue : état du suivi pour l\'interface', () => {
  const s = atChapter(6);
  assertEqual(holdStatus(s).etat, 'attente');
  nightWithProduced(s, 48);
  const w = holdStatus(s);
  assertEqual([w.etat, w.nuits, w.moyenne, 'soinPaye' in w], ['suivi', 1, 100, false]);
  const u = atChapter(6);
  holdNights(u, 10, 48);
  assertEqual(holdStatus(u).etat, 'reussi');
  assertEqual(holdStatus(atChapter(5)).etat, 'attente', 'avant le chapitre 6 : rien n\'est suivi');
});

// Le récit (docs/recit/) : la terre sauvage est celle du grand-père, Maurice. Les textes en parlent ; ils ne
// parlent plus de la ferme d'avant (sa maison, son moulin, ses dépendances).
test('terre sauvage : le chapitre 1 et les lettres du notaire parlent de la terre du grand-père, pas de sa ferme', () => {
  const s = createNewGame(1);
  const p = chapterProgress(s);
  assertEqual(/grand-père/.test(p.intro), true, p.intro);
  assertEqual(/moulin|dépendances|répare la maison/i.test(p.intro), false, p.intro);
  // (le panneau, la pompe et la citerne n'arrivent qu'avec l'automatisation : pas d'objectif)
  assertEqual(p.objectifs.slice(0, 3).map((o) => o.libelle), ['Bâtir le foyer (une pièce close, une paillasse)', 'Fabriquer une houe à l\'Atelier', 'Labourer 6 tuiles']);
  assertEqual(p.objectifs.filter((o) => ['panneau', 'pompe', 'reservoir'].includes(o.type)).length, 0);
  for (const id of ['notaire_heritage', 'notaire_legs']) assertEqual(mailText(s, id).some((l) => /moulin|dépendances/.test(l)), false, id);
  assertEqual(mailText(s, 'notaire_heritage').some((l) => /grand-père, Maurice/.test(l)), true, 'le notaire nomme Maurice');
});
