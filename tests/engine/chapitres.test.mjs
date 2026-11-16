/* ==========================================================================
   Tests du moteur : Lot 9 : chapitres (et la part de la ferme dans les repas, une mesure).
   Lancer seul : node --test tests/engine/chapitres.test.mjs (ou node tests/run-tests.mjs chapitres).
   ========================================================================== */

import {
  addItem, chapterProgress, chapterReached, completeChapter, createInitialState, DATA, feedAllHens, formatPercent,
  harvest, migrate, shear, startMilling, startRecipe, takeItem, testAddHens, testAddWheat, testBatir,
  testEmptyBatteries, testFillBatteries, testSetBuildingLevel5, testWoolReady, tick, updateChapters,
} from '../../js/engine/index.js';
import { ETAPES } from '../../js/engine/didacticiel.js';
import {
  assert, assertEqual, atChapter, atelier, farm, fillSheep, garden, kwh, ml, mondeFait, OBJECTIFS_MONDE, plantRipe,
  reach, runFor, sleepOnce, test, testBase,
} from './aide.mjs';

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

testBase('version 1.12 : chapitre 2 : la même culture récoltée quatre fois ne compte qu\'une fois', () => {
  const s = atChapter(2);
  for (let i = 1; i <= 4; i++) {
    plantRipe(s, `potager-${i}`, 'carotte');
    assert(harvest(s, `potager-${i}`).ok);
  }
  assertEqual([s.campagne.compteurs.recoltes, s.campagne.compteurs.cultures], [4, ['carotte']]);
  assertEqual(okList(s)[1], false);
});

test('séries d\'affilée : elles ne comptent qu\'à partir du chapitre qui les porte', () => {
  const s = atChapter(1);
  testAddHens(s, 4);
  testAddWheat(s, 20);
  feedAllHens(s);
  sleepOnce(s);
  assertEqual(s.campagne.compteurs.serieOeufs, 0, 'chapitre 1 : la ponte ne compte pas encore');
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

test('version 1.22 : une partie déjà au-delà du chapitre 4 ne recule pas', () => {
  const s = atChapter(5);
  updateChapters(s);
  assertEqual([s.campagne.chapitre, s.campagne.fini], [5, false]);
  assertEqual(chapterProgress(s).objectifs.some((o) => o.type === 'objet'), false);
});

test('chapitres : la campagne finie ne recule pas et ne recompte rien', () => {
  const s = atChapter(8);
  assertEqual(updateChapters(s), 0);
  assertEqual(completeChapter(s).ok, false);
  assertEqual(s.campagne.annonces, []);
});

test('affichage : pourcentage arrondi vers le bas, 100 % seulement à 100', () => {
  assertEqual([formatPercent(0), formatPercent(37.5), formatPercent(99.99), formatPercent(100), formatPercent(undefined)], ['0\u00a0%', '37\u00a0%', '99\u00a0%', '100\u00a0%', '0\u00a0%']);
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
