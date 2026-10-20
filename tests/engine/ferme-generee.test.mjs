/* ==========================================================================
   Tests du moteur : la ferme générée d'après une graine (docs/carte-generee.md, étape 2) et
   le terrain d'une carte (terrain-carte.js).
   Lancer seul : node --test tests/engine/ferme-generee.test.mjs (ou node tests/run-tests.mjs ferme-generee).
   ========================================================================== */

import { assert, assertEqual, garden, reach, setInv, sleepOnce, test, tireless } from './aide.mjs';
import { readFileSync } from 'node:fs';
import { blocGid, TRONC_CREUX } from '../../js/engine/planche.js';
import {
  atelierConstruit, atelierOuvert, eatSnack, buildPoulailler, coopCapacity, buildPaturage, freeSheepPlaces, buildSerre, buildSilo, siloCapacity, buildVerger, harvestTree, isArable as arable, removeStarter, blocDessus, buyStarter, farmOpen, isOwned, starterOf, buildStation, buyFurniture, houseRepaired, repairHouse, atelierStatus, createNewGame, mainCharacter, nuitSansCouchage, setFarmSeed, blocAt, blocBloque, blocsEnMain, couchages, dansPiece, nuitCouchee, piecesCloses, poserBloc, reprendreBloc, solAt, buildAtelier, countItem, craft, craftStatus, createInitialState, DATA, FERME_GENEREE, farmMap, farmPoint, farmTerrain, genererFerme, hoeableTiles,
  isArable, migrate, serrePlaces, serreMurs, ramassables, ramasser, etageEmprise, etageBlocs, poserEtage, toits, reprendreEtage, escaliers, robotTrip, robotStation, robotBattery, robotCapacity, runRobotCharge, grantTech, STATE_VERSION, terrainOfMap, testFarmMap, genrePiece, tuilesChemins, etatPoulailler, upgradePoulailler, layEggs,
  etatEtable, stablePlaces, stableHoused, buyPasture, makeSheep, makeCow, feedLivestock,
  TEST_RESSOURCES, testAddBlocs, testAddItem, testAddMetaux, testAddRessources, testAllTools, testBuildAtelier,
} from '../../js/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL('../../' + f, import.meta.url), 'utf8'));

test('le terrain d\'une carte, calculé par le jeu, est celui que scripts/carte/terres.py écrit pour la carte de Tiled', () => {
  // (le puits et la citerne ne sont pas dans la carte de Tiled : la scène les pose, DEFAULT_OBJECTS)
  const t = terrainOfMap(lire('assets/carte_printemps.json'), {
    puits: { x: 596, y: 390, width: 34, height: 38 }, citerne: { x: 629, y: 394, width: 24, height: 34 },
  });
  for (const k of ['LARGEUR', 'HAUTEUR', 'ZONES', 'LIGNES', 'ROCHERS', 'ARBRES']) assertEqual(t[k], DATA.TERRAIN[k], k);
});

// Les cases d'une carte où la couche `nom` a une tuile du bloc de lignes [r0, r1] de herbe_chemin
// (rangées 45 et suivantes de la planche, 16 colonnes) : 4 à 12 sont le chemin et ses raccords.
function chemin(carte) {
  const sol = carte.layers.find((l) => l.name === 'ground').data;
  return sol.map((g) => { const n = g - 1, c = n % 75, r = Math.floor(n / 75) - 45; return c < 16 && r >= 4 && r <= 12; });
}

test('ferme générée : la même graine donne la même carte, une autre graine une autre', () => {
  const a = genererFerme('test-1'), b = genererFerme('test-1'), c = genererFerme('test-2');
  assert(a === b, 'gardée une fois faite');
  assert(JSON.stringify(c.carte) !== JSON.stringify(a.carte), 'une autre graine, une autre carte');
  // d'une fois sur l'autre (pas seulement dans la même page) : toujours la même ferme pour
  // « test-1 » (à mettre à jour si le générateur change, ce qui change les fermes des parties)
  assertEqual([a.terrain.DECALAGE, Object.keys(a.terrain.ARBRES).length, a.terrain.LIGNES.join('').split('#').length - 1], [[25, 29], 256, 12007]);
  assertEqual([a.carte.width, a.carte.height, a.terrain.LARGEUR, a.terrain.HAUTEUR], [FERME_GENEREE.LARGEUR, FERME_GENEREE.HAUTEUR, 144, 114]);
});

for (const graine of ['1', '2', '7', 'abc', '12345']) {
  test(`ferme générée « ${graine} » : un chemin mène de la maison à la sortie vers la transition`, () => {
    const { carte, terrain } = genererFerme(graine);
    const W = carte.width, T = carte.tilewidth;
    const objets = Object.fromEntries(carte.layers.filter((l) => l.type === 'objectgroup').flatMap((l) => l.objects).filter((o) => o.name).map((o) => [o.name, o]));
    const sortie = objets.vers_la_transition;
    assert(sortie, 'le rectangle de la sortie');
    assertEqual([sortie.x + sortie.width, sortie.height], [W * T, 3 * T], 'au bord est, 3 tuiles de haut');
    // de la sortie, en suivant le chemin, on arrive devant la maison
    const est = chemin(carte);
    const r0 = Math.floor((sortie.y + sortie.height / 2) / T);
    const vus = new Set([r0 * W + W - 1]), pile = [r0 * W + W - 1];
    assert(est[r0 * W + W - 1], 'la sortie est sur le chemin');
    while (pile.length) {
      const i = pile.pop(), c = i % W;
      for (const j of [c ? i - 1 : -1, c < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < est.length && est[j] && !vus.has(j)) { vus.add(j); pile.push(j); }
    }
    // (la place de la maison de la carte de Tiled, 513.5, 239, 94 × 95.6 px, décalée avec la cour)
    const [dx, dy] = terrain.DECALAGE, porte = (Math.ceil((239 + 95.6) / T) + 1 + dy) * W + Math.round((513.5 + 47) / T) + dx;
    assert(vus.has(porte), 'le chemin passe devant la place de la maison');
    assert(!objets.maison, 'pas de maison : le foyer se bâtit');
    // les bâtiments de la cour (provisoires) et les rochers, les arbres
    for (const n of ['ville', 'zone_culture_1', 'zone_culture_2']) assert(objets[n], n);
    assert(!objets.poulailler && !objets.grange && !objets.serre && !objets.silo && !objets.moulin, 'le Poulailler, l\'Étable, la Serre, le Silo et le Moulin se bâtissent');
    assert(!objets.verger && !objets.arbre_verger_1, 'pas de Verger : les arbres se plantent dans le sol');
    assert(!objets.puits && !objets.citerne, 'le puits et la citerne se bâtissent');
    assertEqual(Object.keys(terrain.ROCHERS).length, FERME_GENEREE.ROCHERS, 'les rochers');
    assert(Object.keys(terrain.ARBRES).length > 150, 'des bois');
    // un étang assez grand pour la pêche (FISHING.etang : 30 cases), et le tronc creux à son bord
    const sol = carte.layers.find((l) => l.name === 'ground').data;
    const eau = sol.map((g) => { const n = g - 1; return n % 75 >= 32 && n % 75 < 48 && Math.floor(n / 75) >= 45; });
    let plus = 0;
    const vu = new Uint8Array(eau.length);
    for (let i0 = 0; i0 < eau.length; i0++) {
      if (!eau[i0] || vu[i0]) continue;
      let n = 0;
      const p = [i0];
      vu[i0] = 1;
      while (p.length) {
        const i = p.pop(), c = i % W;
        n++;
        for (const j of [c ? i - 1 : -1, c < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < eau.length && eau[j] && !vu[j]) { vu[j] = 1; p.push(j); }
      }
      plus = Math.max(plus, n);
    }
    assert(plus >= 30, 'un étang de 30 cases au moins : ' + plus);
    const pp = carte.layers.find((l) => l.name === 'plantes_pierres').data;
    assert(pp.includes(TRONC_CREUX[0]) && pp.includes(TRONC_CREUX[1]) && !pp.includes(539), 'le tronc creux (le nouveau dessin, pas celui du pack)');
    // des milliers de tuiles labourables, dont les parcelles de départ
    assert(terrain.LIGNES.join('').split('#').length - 1 > 8000, 'de l\'herbe à labourer');
  });
}

test('ferme générée : une partie y passe en mode test, et en revient', () => {
  const s = garden();
  assertEqual([farmTerrain(s), farmMap(s)], [DATA.TERRAIN, null], 'la carte de Tiled');
  s.outils = { arbres: { '14,25': { retour: 9 } }, rochers: { '25,13': 2 } };
  assertEqual(testFarmMap(s, 42), { ok: true, graine: '42' });
  const T = farmTerrain(s);
  assertEqual([T.LARGEUR, farmMap(s).width, s.outils.arbres, s.outils.rochers], [144, 144, {}, {}]);
  assert(s.potager.parcelles.length === DATA.POTAGER.DEPART.length && s.potager.parcelles.every((p) => isArable(p.case, s)), 'les parcelles de départ, sur la nouvelle carte');
  assert(hoeableTiles(s).length > 5000, 'la houe y laboure');
  // le robot : sa base et la Serre suivent la cour
  const [dx, dy] = T.DECALAGE;
  assertEqual(farmPoint(s, DATA.ROBOT.BASE), [DATA.ROBOT.BASE[0] + dx, DATA.ROBOT.BASE[1] + dy]);
  s.robot = { taches: [{ t: 'recolter', id: s.potager.parcelles[0].id }], i: 0, base: -1 };
  assert(robotTrip(s, s.robot, 0).route < 1, 'de sa base à une parcelle de départ : un court trajet');
  // la graine est sauvegardée
  const m = migrate({ v: STATE_VERSION, t: 0, s: JSON.parse(JSON.stringify(s)) });
  assertEqual(m.carte, { graine: '42' });
  testFarmMap(s, null);
  assertEqual(['carte' in s, farmTerrain(s)], [false, DATA.TERRAIN], 'revenue sur la carte de Tiled');
  assert(createInitialState(1).carte === undefined, 'une partie neuve : la carte de Tiled (pour l\'instant)');
});

/* ---------- étape 3 : ramasser à la main, l'Atelier ---------- */

test('ferme générée : chaque matin, des pierres, du bois et des herbes à ramasser à la main', () => {
  const s = garden();
  assertEqual(ramassables(s), [], 'pas sur la carte de Tiled');
  testFarmMap(s, 'r1');
  const R = DATA.ATELIER.RAMASSAGE, liste = ramassables(s);
  assertEqual(liste.length, Object.values(R).reduce((a, d) => a + d.nombre, 0));
  assert(liste.filter((p) => !p.buisson).every((p) => isArable(p.case, s)), 'sur l\'herbe');
  assertEqual(new Set(liste.map((p) => p.case)).size, liste.length, 'deux jamais sur la même tuile');
  assertEqual(ramassables(s), liste, 'les mêmes toute la journée');
  const avant = countItem(s, 'fibre'), e0 = s.energie;
  const h = liste.find((p) => p.sorte === 'herbe');
  assertEqual(ramasser(s, h.id), { ok: true, sorte: 'herbe', items: { fibre: 1 } });
  assertEqual([countItem(s, 'fibre'), s.energie < e0, ramassables(s).length], [avant + 1, true, liste.length - 1]);
  assertEqual(ramasser(s, h.id).ok, false, 'déjà ramassée');
  s.energie = 0;
  assertEqual(ramasser(s, liste[1].id).ok, false, 'à bout de forces');
  // les baies, sur les buissons : trois d'un coup, même à bout de forces, et elles se mangent
  const b = liste.find((p) => p.sorte === 'baies'), T = farmTerrain(s);
  assert(T.BUISSONS.some(([c0, r1, w]) => b.case === r1 * T.LARGEUR + c0 + Math.floor(w / 2)), 'au pied d\'un buisson');
  assertEqual([ramasser(s, b.id), s.energie], [{ ok: true, sorte: 'baies', items: { baies: 3 } }, 0]);
  assert(eatSnack(s, 'baies').ok && s.energie > 0, 'de quoi reprendre des forces');
  // le lendemain, d'autres places, et tout est revenu
  s.day += 1;
  const demain = ramassables(s);
  assertEqual(demain.length, liste.length);
  assert(demain.map((p) => p.case).join() !== liste.map((p) => p.case).join(), 'ailleurs');
});

test('ferme générée : l\'Atelier se construit avec 3 bois et 3 pierres, puis fabrique', () => {
  const s = garden();
  tireless(s);
  assertEqual(buildAtelier(s).ok, false, 'pas sur la carte de Tiled');
  testFarmMap(s, 'r2');
  setInv(s, {});
  const st = atelierStatus(s);
  assertEqual([st.ok, st.manque], [false, { bois: 3, pierre: 3 }]);
  setInv(s, { bois: 11, pierre: 9, fibre: 5 });
  assertEqual(craft(s, 'planche').ok, false, 'pas d\'Atelier');
  const pieces = s.pieces;
  assertEqual(buildAtelier(s), { ok: true });
  assertEqual([atelierConstruit(s), countItem(s, 'bois'), countItem(s, 'pierre'), s.pieces], [true, 8, 6, pieces], 'payé en matériaux, sans pièces');
  assertEqual(buildAtelier(s).ok, false, 'une seule fois');
  // 2 bois → 1 planche ; 4 pierres → 1 mur ; 3 planches → 1 porte ; 3 fibres → 1 paillasse
  for (let k = 0; k < 3; k++) assertEqual(craft(s, 'planche').items, { planche: 1 });
  assertEqual([countItem(s, 'bois'), countItem(s, 'planche')], [2, 3]);
  assertEqual(craft(s, 'porte').items, { porte: 1 });
  assertEqual(craft(s, 'mur_pierre').items, { mur_pierre: 1 });
  assertEqual(craft(s, 'paillasse').items, { paillasse: 1 });
  assertEqual([countItem(s, 'planche'), countItem(s, 'pierre'), countItem(s, 'fibre'), countItem(s, 'porte'), countItem(s, 'mur_pierre'), countItem(s, 'paillasse')], [0, 2, 2, 1, 1, 1]);
  const m = craftStatus(s, 'mur_pierre');
  assertEqual([m.ok, m.manque], [false, { pierre: 2 }]);
  // les outils de pierre
  s.outils = { hache: false, pioche: false, canne: false, choisi: 'houe' };
  setInv(s, { bois: 2, pierre: 2, fibre: 1 });
  assertEqual(craft(s, 'hache').outil, 'hache');
  assertEqual([s.outils.hache, countItem(s, 'bois')], [true, 0]);
  setInv(s, { bois: 2, pierre: 2, fibre: 1 });
  assertEqual(craft(s, 'hache').ok, false, 'déjà une hache');
});

/* ---------- étape 4 : construire bloc par bloc ---------- */

// Une ferme générée, l'Atelier construit, et `n` de chaque matériau en main.
function chantier(graine, n = 40) {
  const s = garden();
  tireless(s);
  testFarmMap(s, graine);
  setInv(s, { bois: 3, pierre: 3 });
  assert(buildAtelier(s).ok);
  setInv(s, { mur_pierre: n, porte: n, paillasse: n });
  return s;
}

// Une case d'herbe libre de `w` × `h` cases (coin haut-gauche), loin des bords.
function terrainLibre(s, w, h) {
  const T = farmTerrain(s), W = T.LARGEUR;
  for (let r = 4; r < T.HAUTEUR - h - 4; r++) {
    for (let c = 4; c < W - w - 4; c++) {
      let ok = true;
      for (let dr = 0; dr < h && ok; dr++) for (let dc = 0; dc < w && ok; dc++) ok = T.LIGNES[r + dr][c + dc] === '#' && !s.potager.parcelles.some((p) => p.case === (r + dr) * W + c + dc);
      if (ok) return { c, r, W };
    }
  }
  return null;
}

// Les murs d'une pièce de w × h cases (murs compris), la porte au milieu du bas.
function murs({ c, r, W }, w, h) {
  const out = [];
  for (let dr = 0; dr < h; dr++) for (let dc = 0; dc < w; dc++) if (dr === 0 || dc === 0 || dr === h - 1 || dc === w - 1) out.push((r + dr) * W + c + dc);
  return { murs: out.filter((t) => t !== (r + h - 1) * W + c + Math.floor(w / 2)), porte: (r + h - 1) * W + c + Math.floor(w / 2), dedans: (r + 1) * W + c + 1 };
}

test('ferme générée : poser et reprendre des blocs, sur l\'herbe seulement', () => {
  const s = chantier('b1');
  const z = terrainLibre(s, 6, 5);
  const t = z.r * z.W + z.c;
  assertEqual(poserBloc(s, 'mur_pierre', t), { ok: true, sorte: 'mur_pierre', case: t });
  assertEqual([blocAt(s, t), countItem(s, 'mur_pierre'), isArable(t, s), blocBloque(s, t)], ['mur_pierre', 39, false, true]);
  assertEqual(poserBloc(s, 'porte', t).ok, false, 'déjà un bloc');
  const route = farmTerrain(s).LIGNES.join('').indexOf('.');
  assertEqual(poserBloc(s, 'mur_pierre', route).ok, false, 'pas hors de l\'herbe');
  assertEqual(poserBloc(s, 'paillasse', t + 2).ok, false, 'la paillasse : dans une pièce close');
  assertEqual(reprendreBloc(s, t), { ok: true, sorte: 'mur_pierre', case: t });
  assertEqual([blocAt(s, t), countItem(s, 'mur_pierre')], [null, 40]);
  // l'Atelier se pose une fois
  assertEqual(blocsEnMain(s, 'atelier'), 1);
  assert(poserBloc(s, 'atelier', t).ok);
  assertEqual([blocsEnMain(s, 'atelier'), poserBloc(s, 'atelier', t + 1).ok], [0, false]);
  reprendreBloc(s, t);
  assertEqual(blocsEnMain(s, 'atelier'), 1, 'repris : à poser de nouveau');
  setInv(s, {});
  assertEqual(poserBloc(s, 'mur_pierre', t).ok, false, 'plus de murs en main');
});

test('ferme générée : des murs tout autour et une porte font une pièce close, où l\'on dort sur une paillasse', () => {
  const s = chantier('b2');
  const z = terrainLibre(s, 5, 5);
  const p = murs(z, 5, 5);
  for (const t of p.murs) assert(poserBloc(s, 'mur_pierre', t).ok);
  assertEqual(piecesCloses(s), [], 'sans porte : pas de pièce close');
  assertEqual(nuitCouchee(s), false, 'pas de paillasse : on ne dort pas');
  assert(poserBloc(s, 'porte', p.porte).ok);
  const pc = piecesCloses(s);
  assertEqual([pc.length, pc[0].cases.length, pc[0].portes], [1, 9, [p.porte]]);
  assert(dansPiece(s, p.dedans));
  assert(poserBloc(s, 'paillasse', p.dedans).ok);
  assertEqual([couchages(s), nuitCouchee(s)], [[p.dedans], true]);
  // la nuit : l'énergie revient
  s.energie = 0;
  assert(sleepOnce(s) !== null);
  assert(s.energie > 0, 'couché : l\'énergie du réveil');
  // (un coin repris : la pièce reste close, on ne passe pas en diagonale)
  reprendreBloc(s, p.murs[0]);
  assertEqual(nuitCouchee(s), true);
  // un mur repris : la pièce s'ouvre, la paillasse reste mais on n'y dort plus
  reprendreBloc(s, p.murs[1]);
  assertEqual([piecesCloses(s), blocAt(s, p.dedans), nuitCouchee(s)], [[], 'paillasse', false]);
  s.energie = 0;
  assert(sleepOnce(s) !== null);
  assertEqual(s.energie, 0, 'sans pièce close : la nuit ne rend rien');
  // la carte de Tiled : on dort comme avant
  const t = garden();
  t.energie = 0;
  assertEqual(nuitCouchee(t), true);
});

test('ferme générée : le plancher se pose à plat, sous les blocs, et se reprend en dernier', () => {
  const s = chantier('b3');
  setInv(s, { planche: 2 });
  assertEqual(craft(s, 'plancher').items, { plancher: 1 }, '2 planches : un plancher');
  setInv(s, { mur_pierre: 40, porte: 2, paillasse: 1, plancher: 3 });
  const z = terrainLibre(s, 5, 5), p = murs(z, 5, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserBloc(s, 'porte', p.porte);
  assertEqual(poserBloc(s, 'plancher', p.murs[0]).ok, false, 'pas sous un mur');
  assert(poserBloc(s, 'plancher', p.dedans).ok);
  assertEqual([solAt(s, p.dedans), blocAt(s, p.dedans), countItem(s, 'plancher'), isArable(p.dedans, s)], ['plancher', null, 2, false]);
  assertEqual(poserBloc(s, 'plancher', p.dedans).ok, false, 'déjà un plancher');
  assertEqual(piecesCloses(s)[0].cases.length, 9, 'la pièce reste close');
  // une paillasse dessus : on y dort
  assert(poserBloc(s, 'paillasse', p.dedans).ok);
  assertEqual(couchages(s), [p.dedans]);
  // dehors aussi (une terrasse), mais pas de mur dessus
  const dehors = p.porte + z.W;
  assert(poserBloc(s, 'plancher', dehors).ok);
  assertEqual(poserBloc(s, 'mur_pierre', dehors).ok, false, 'pas de mur sur un plancher');
  // repris : la paillasse d'abord, puis le plancher
  assertEqual(reprendreBloc(s, p.dedans).sorte, 'paillasse');
  assertEqual(reprendreBloc(s, p.dedans).sorte, 'plancher');
  assertEqual([solAt(s, p.dedans), countItem(s, 'plancher')], [null, 2]);
});

/* ---------- étape 5 : la nouvelle partie, le bonheur sans couchage ---------- */

test('nouvelle partie sur une ferme générée : la graine, sans terre au départ', () => {
  const s = createNewGame(5);
  assertEqual(s.potager.parcelles, []);
  assertEqual(setFarmSeed(s, 'neuve'), { ok: true, graine: 'neuve' });
  assertEqual([farmTerrain(s).LARGEUR, s.potager.parcelles, atelierOuvert(s)], [144, [], true]);
  assertEqual(setFarmSeed(s, null).graine, null, 'et retour à la ferme dessinée');
});

test('ferme générée : chaque nuit, qui n\'a pas de paillasse dans une pièce close perd du bonheur', () => {
  const s = chantier('b3');
  const B = DATA.ATELIER.BONHEUR_SANS_COUCHAGE;
  const membres = s.famille.membres;
  assert(membres.length >= 2, 'une famille de plusieurs');
  for (const m of membres) m.bonheur = 50;
  // (sans repas : le bonheur du repas ne compte pas ici)
  const avant = membres.map((m) => m.bonheur);
  const sans = nuitSansCouchage(s);
  assertEqual([sans.length, membres.map((m) => m.bonheur)], [membres.length, avant.map((b) => b + B)], 'personne n\'a de couchage');
  // une pièce, une paillasse : le personnage principal dort, les autres non
  const z = terrainLibre(s, 5, 5), p = murs(z, 5, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserBloc(s, 'porte', p.porte);
  poserBloc(s, 'paillasse', p.dedans);
  for (const m of membres) m.bonheur = 50;
  const sans2 = nuitSansCouchage(s);
  assertEqual([sans2.includes(mainCharacter(s)), sans2.length], [false, membres.length - 1]);
  assertEqual(mainCharacter(s).bonheur, 50);
  // sur la ferme dessinée, rien
  assertEqual(nuitSansCouchage(garden()), []);
  // et la nuit le note pour le réveil
  const r = sleepOnce(s);
  assertEqual(r.sansCouchage.length, membres.length - 1);
});

/* ---------- étape 5b : la maison en blocs ---------- */

test('ferme générée : pas de maison à réparer, le foyer est une pièce close avec une paillasse', () => {
  const s = chantier('m1');
  s.maison = { reparee: false };
  assertEqual([houseRepaired(s), repairHouse(s).ok], [false, false], 'rien à réparer : à bâtir');
  const z = terrainLibre(s, 5, 5), p = murs(z, 5, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserBloc(s, 'porte', p.porte);
  assertEqual(houseRepaired(s), false, 'une pièce sans paillasse');
  poserBloc(s, 'paillasse', p.dedans);
  assertEqual(houseRepaired(s), true, 'le foyer');
  assertEqual(buyFurniture(s, Object.keys(DATA.MEUBLES)[0]).ok, false, 'pas de maison à meubler');
});

test('ferme générée : le four et la cuisinière se posent dans une pièce close et tiennent lieu des stations', () => {
  const s = chantier('m2');
  s.pieces = 10000;
  assertEqual(buildStation(s, 'four').ok, false, 'pas en pièces');
  setInv(s, { mur_pierre: 40, porte: 2, four_pierre: 1, cuisiniere: 1 });
  const z = terrainLibre(s, 6, 5), p = murs(z, 6, 5);
  assertEqual(poserBloc(s, 'four', p.dedans).ok, false, 'hors d\'une pièce close');
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserBloc(s, 'porte', p.porte);
  assert(poserBloc(s, 'four', p.dedans).ok);
  assert(poserBloc(s, 'cuisiniere', p.dedans + 1).ok);
  assertEqual([s.stations.four.construit, s.stations.cuisine.construit, blocBloque(s, p.dedans)], [true, true, true]);
  assert(s.unlockedTabs.includes('recettes'), 'le Livre de recette s\'ouvre');
  reprendreBloc(s, p.dedans);
  assertEqual([s.stations.four.construit, countItem(s, 'four_pierre')], [false, 1], 'repris : plus de four');
});

/* ---------- étape 5b-2 : l'énergie et l'eau en blocs ---------- */

test('ferme générée : le puits, la pompe dessus, le panneau, la citerne et la batterie se posent et installent les appareils', () => {
  const s = reach(chantier('e1'), 'paturage');
  s.pieces = 100000;
  for (const t of ['panneau', 'pompe', 'reservoir', 'batterie']) removeStarter(s, t);   // (une partie neuve : rien d'installé)
  assertEqual(buyStarter(s, 'panneau').ok, false, 'pas en pièces');
  // le foyer d'abord
  const z = terrainLibre(s, 5, 5), p = murs(z, 5, 5);
  setInv(s, { mur_pierre: 30, porte: 2, paillasse: 2, puits_pierre: 1, pompe: 1, panneau_solaire: 2, citerne: 1, batterie: 1 });
  const dehors = (k) => (z.r + 7) * z.W + z.c + k;
  assertEqual(poserBloc(s, 'panneau', dehors(0)).ok, false, 'sans foyer : rien ne s\'installe');
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserBloc(s, 'porte', p.porte);
  poserBloc(s, 'paillasse', p.dedans);
  assertEqual(poserBloc(s, 'panneau', p.dedans + 1).ok, false, 'pas dans une pièce close');
  assert(poserBloc(s, 'panneau', dehors(0)).ok);
  assertEqual([isOwned(starterOf(s, 'panneau')), poserBloc(s, 'panneau', dehors(1)).ok], [true, false], 'un seul panneau');
  assertEqual(poserBloc(s, 'pompe', dehors(2)).ok, false, 'la pompe : sur un puits');
  assertEqual(poserBloc(s, 'citerne', dehors(4)).ok, false, 'la citerne attend la pompe');
  assert(poserBloc(s, 'puits', dehors(2)).ok);
  assert(poserBloc(s, 'pompe', dehors(2)).ok);
  assertEqual([blocAt(s, dehors(2)), blocDessus(s, dehors(2)), isOwned(starterOf(s, 'pompe')), farmOpen(s)], ['puits', 'pompe', true, true]);
  assert(poserBloc(s, 'citerne', dehors(4)).ok);
  assert(poserBloc(s, 'batterie', dehors(6)).ok);
  assertEqual(['reservoir', 'batterie'].map((t) => isOwned(starterOf(s, t))), [true, true]);
  // reprendre : la pompe d'abord, puis le puits
  reprendreBloc(s, dehors(2));
  assertEqual([blocAt(s, dehors(2)), isOwned(starterOf(s, 'pompe')), countItem(s, 'pompe')], ['puits', false, 1]);
  reprendreBloc(s, dehors(2));
  assertEqual([blocAt(s, dehors(2)), countItem(s, 'puits_pierre')], [null, 1]);
});

/* ---------- étape 5b : le Poulailler (pièce close + nichoir) ---------- */

// Un poulailler (ou une étable) complet : une enceinte de 5 × 5 (porte sur le dehors en bas, porte à droite
// vers l'enclos), un enclos de barrières de 3 × 3 cases à droite, appuyé sur le mur.
function enceinteEtEnclos(s, z) {
  const p = murs(z, 5, 5), W = z.W, at = (x, y) => (z.r + y) * W + z.c + x;
  const porteEnclos = at(4, 2);
  for (const t of p.murs) if (t !== porteEnclos) poserBloc(s, 'mur_pierre', t);
  poserBloc(s, 'porte', p.porte);
  poserBloc(s, 'porte', porteEnclos);
  const barrieres = [];
  for (let x = 5; x <= 8; x++) barrieres.push(at(x, 0), at(x, 4));
  for (let y = 1; y <= 3; y++) barrieres.push(at(8, y));
  return { ...p, porteEnclos, barrieres, enclos: at(6, 2) };
}

test('ferme générée : le Poulailler, une enceinte avec une porte dehors, un nichoir et un enclos de barrières', () => {
  const s = reach(chantier('p1'), 'poulailler');
  s.pieces = 100000;
  s.poulailler.construit = false;
  assertEqual(buildPoulailler(s).ok, false, 'pas en pièces');
  setInv(s, { mur_pierre: 30, porte: 3, nichoir: 2, barriere: 20 });
  const z = terrainLibre(s, 9, 6), p = enceinteEtEnclos(s, z);
  assertEqual(poserBloc(s, 'nichoir', p.dedans + 50).ok, false, 'hors d\'une pièce close');
  assert(poserBloc(s, 'nichoir', p.dedans).ok);
  // sans enclos : pas de Poulailler
  const sans = etatPoulailler(s);
  assertEqual(sans.conditions.map((c) => [c.id, c.ok]), [['enceinte', true], ['cle', true], ['dehors', true], ['enclos', false], ['place', false]]);
  assertEqual([s.poulailler.construit, coopCapacity(s)], [false, 0]);
  // l'enclos fermé : le Poulailler est là ; 8 cases libres dedans, 9 dans l'enclos
  for (const t of p.barrieres) assert(poserBloc(s, 'barriere', t).ok);
  const e = etatPoulailler(s);
  assertEqual([e.ok, e.libresPiece.length, e.libresEnclos.length, e.places, e.porteEnclos, e.porteDehors], [true, 8, 9, 8, p.porteEnclos, p.porte]);
  assertEqual([s.poulailler.construit, s.poulailler.niveau > 0, coopCapacity(s)], [true, true, DATA.POULAILLER.CAPACITE[0]]);
  assertEqual(poserBloc(s, 'nichoir', p.dedans + 1).ok, false, 'un seul nichoir');
  // une barrière reprise : l'enclos s'ouvre, plus de Poulailler (niveau et poules gardés)
  s.poulailler.poules = 3;
  reprendreBloc(s, p.barrieres[0]);
  assertEqual([s.poulailler.construit, s.poulailler.poules, coopCapacity(s)], [false, 3, 0]);
  poserBloc(s, 'barriere', p.barrieres[0]);
  assert(s.poulailler.construit);
  // pas de porte sur le dehors : pas de Poulailler
  reprendreBloc(s, p.porte); poserBloc(s, 'mur_pierre', p.porte);
  assertEqual([etatPoulailler(s).conditions.find((c) => c.id === 'dehors').ok, s.poulailler.construit], [false, false]);
  reprendreBloc(s, p.porte); poserBloc(s, 'porte', p.porte);
  // le nichoir repris : plus de Poulailler
  reprendreBloc(s, p.dedans);
  assertEqual([s.poulailler.construit, coopCapacity(s)], [false, 0], 'repris : plus de Poulailler');
});

test('ferme générée : le Poulailler monte de niveau s\'il a la place ; les poules en trop ne pondent pas', () => {
  const s = reach(chantier('p2'), 'poulailler');
  s.pieces = 100000;
  setInv(s, { mur_pierre: 30, porte: 3, nichoir: 1, barriere: 20, plancher: 9 });
  const z = terrainLibre(s, 9, 6), p = enceinteEtEnclos(s, z);
  poserBloc(s, 'nichoir', p.dedans);
  for (const t of p.barrieres) poserBloc(s, 'barriere', t);
  assert(s.poulailler.construit);
  // niveau 2 : 8 poules, 8 cases libres de chaque côté → oui ; niveau 3 : 12 → non
  assert(upgradePoulailler(s).ok);
  assertEqual(coopCapacity(s), 8);
  const r = upgradePoulailler(s);
  assertEqual([r.ok, s.poulailler.niveau], [false, 2]);
  assert(/il faut 12 cases libres/.test(r.error), r.error);
  // un plancher ne prend pas de place ; une barrière posée dans l'enclos, si
  assert(poserBloc(s, 'plancher', p.enclos).ok);
  assertEqual(etatPoulailler(s).libresEnclos.length, 9);
  poserBloc(s, 'barriere', p.enclos);
  assertEqual([etatPoulailler(s).libresEnclos.length, coopCapacity(s)], [8, 8]);
  // 8 poules nourries, 2 cases de moins dans l'enclos : 6 pondent
  s.poulailler.poules = 8; s.poulailler.nourries = 8;
  poserBloc(s, 'barriere', p.enclos - z.W + 1);
  poserBloc(s, 'barriere', p.enclos - z.W);
  assertEqual(coopCapacity(s), 6);
  assertEqual(layEggs(s), 6 * DATA.ANIMAUX.poule.oeufsParNuit);
});
test('ferme générée : l\'Étable, une enceinte avec une porte dehors, une mangeoire et un enclos ; une place par case libre', () => {
  const s = reach(chantier('e1'), 'paturage');
  s.pieces = 100000;
  s.paturage.construit = false;
  s.paturage.places = 0;
  assertEqual(buildPaturage(s).ok, false, 'pas en pièces');
  setInv(s, { mur_pierre: 30, porte: 3, mangeoire: 1, barriere: 20 });
  const z = terrainLibre(s, 9, 6), p = enceinteEtEnclos(s, z);
  assertEqual(poserBloc(s, 'mangeoire', p.dedans + 50).ok, false, 'hors d\'une pièce close');
  assert(poserBloc(s, 'mangeoire', p.dedans).ok);
  assertEqual([s.paturage.construit, etatEtable(s).conditions.find((c) => c.id === 'enclos').ok], [false, false], 'sans enclos : pas d\'Étable');
  for (const t of p.barrieres) poserBloc(s, 'barriere', t);
  // 10 places de départ, mais 8 cases libres dans l'étable (9 dans l'enclos) : 8 places
  assertEqual([s.paturage.construit, s.paturage.places, stablePlaces(s), freeSheepPlaces(s)], [true, DATA.PATURAGE.PLACES_DEPART, 8, 8]);
  // une place de plus : il faut 11 cases libres de chaque côté
  const r = buyPasture(s);
  assertEqual(r.ok, false);
  assert(/il faut 11 cases libres/.test(r.error), r.error);
  // 2 vaches (3 places chacune) et 3 moutons : 9 places pour 8 → la seconde vache ne donne rien
  s.paturage.moutons = [makeSheep(s), makeSheep(s), makeSheep(s)];
  s.paturage.vaches = [makeCow(s), makeCow(s)];
  const l = stableHoused(s);
  assertEqual([l.moutons.size, l.vaches.size], [3, 1]);
  setInv(s, { paille: 100 });
  feedLivestock(s);
  assertEqual([s.nuit.etable.moutonsNourris, s.nuit.etable.vachesNourries], [3, 1]);
  // la mangeoire reprise : plus d'Étable (places et bêtes gardées)
  s.paturage.places += 2;
  reprendreBloc(s, p.dedans);
  assertEqual([s.paturage.construit, freeSheepPlaces(s), countItem(s, 'mangeoire'), s.paturage.moutons.length], [false, 0, 1, 3], 'repris : plus d\'Étable');
  poserBloc(s, 'mangeoire', p.dedans);
  assertEqual([s.paturage.construit, s.paturage.places], [true, DATA.PATURAGE.PLACES_DEPART + 2]);
});

/* ---------- étape 5b : la Serre (pièce close + bac à semis) ---------- */

test('ferme générée : un bac à semis posé dans une pièce close construit la Serre', () => {
  const s = chantier('s1');
  s.pieces = 100000;
  s.serre = createInitialState(1).serre;   // comme une partie neuve
  assertEqual(buildSerre(s).ok, false, 'pas en pièces');
  setInv(s, { mur_pierre: 30, porte: 2, bac_semis: 1 });
  const z = terrainLibre(s, 5, 5), p = murs(z, 5, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserBloc(s, 'porte', p.porte);
  s.progression.niveau = 1;
  assertEqual(poserBloc(s, 'bac_semis', p.dedans).ok, false, 'pas avant le niveau de la Serre');
  reach(s, 'serre');
  assert(poserBloc(s, 'bac_semis', p.dedans).ok);
  assertEqual([s.serre.construit, s.serre.niveau, s.serre.parcelles.length], [true, 1, DATA.SERRE.PARCELLES[0]]);
  s.serre.parcelles[0].culture = 'tomate';   // ce qui pousse reste là si on la reprend puis la repose
  reprendreBloc(s, p.dedans);
  assertEqual(s.serre.construit, false, 'reprise : plus de Serre');
  poserBloc(s, 'bac_semis', p.dedans);
  assertEqual([s.serre.construit, s.serre.parcelles[0].culture], [true, 'tomate']);
  // sur la carte : ses parcelles sur les cases libres de la pièce (ni le bac, ni la case
  // derrière la porte) ; un toit de verre
  const W = z.W, places = serrePlaces(s);
  assertEqual(places.length, 9 - 2);
  assert(!places.includes(p.dedans) && !places.includes(p.porte - W), 'ni le bac, ni le passage');
  assertEqual(toits(s).map((t) => t.verre), [true]);
  // ses murs et sa porte (dessinés en verre) : toute l'enceinte
  assertEqual(serreMurs(s), [...p.murs, p.porte].sort((a, b) => a - b));
});

/* ---------- étape 5b : le Silo (pièce close + coffre à grain) ---------- */

test('ferme générée : un coffre à grain posé dans une pièce close construit le Silo', () => {
  const s = reach(chantier('g1'), 'silo');
  s.silo = createInitialState(1).silo;
  assertEqual(buildSilo(s).ok, false, 'pas en pièces');
  setInv(s, { mur_pierre: 30, porte: 2, coffre_grain: 1, ble: 5 });
  const z = terrainLibre(s, 5, 5), p = murs(z, 5, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserBloc(s, 'porte', p.porte);
  assert(poserBloc(s, 'coffre_grain', p.dedans).ok);
  assertEqual([s.silo.construit, siloCapacity(s) > 0, s.silo.ble, countItem(s, 'ble')], [true, true, 5, 0], 'le blé y entre');
  reprendreBloc(s, p.dedans);
  assertEqual([s.silo.construit, countItem(s, 'coffre_grain')], [false, 1]);
});

/* ---------- étape 5b : le Moulin (pièce close + meule) ---------- */

test('ferme générée : une meule posée dans une pièce close tient lieu du Moulin', () => {
  const s = chantier('m1');
  s.pieces = 100000;
  assertEqual(buildStation(s, 'moulin').ok, false, 'pas en pièces');
  setInv(s, { mur_pierre: 30, porte: 2, meule: 1 });
  const z = terrainLibre(s, 5, 5), p = murs(z, 5, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserBloc(s, 'porte', p.porte);
  s.progression.niveau = 1;
  assertEqual(poserBloc(s, 'meule', p.dedans).ok, false, 'pas avant le niveau du Moulin');
  reach(s, 'moulin');
  assert(poserBloc(s, 'meule', p.dedans).ok);
  assertEqual(s.stations.moulin.construit, true);
  reprendreBloc(s, p.dedans);
  assertEqual([s.stations.moulin.construit, countItem(s, 'meule')], [false, 1]);
});

/* ---------- étape 5b-8 : les arbres fruitiers, plantés dans le sol ---------- */

test('ferme générée : un jeune arbre se plante dans le sol, dehors, et donne ses fruits', () => {
  const s = reach(chantier('v1'), 'verger');
  s.pieces = 100000;
  assertEqual(buildVerger(s).ok, false, 'pas de Verger à aménager');
  setInv(s, { mur_pierre: 30, porte: 2, jeune_pommier: 3 });
  const z = terrainLibre(s, 8, 5), p = murs(z, 5, 5), W = z.W;
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserBloc(s, 'porte', p.porte);
  assertEqual(poserBloc(s, 'pommier', p.dedans).ok, false, 'dehors, pas dans une pièce');
  const ici = (z.r + 1) * W + z.c + 7;
  s.progression.niveau = 1;
  assertEqual(poserBloc(s, 'pommier', ici).ok, false, 'pas avant le niveau du Verger');
  reach(s, 'verger');
  assert(poserBloc(s, 'pommier', ici).ok);
  assertEqual([s.verger.construit, s.verger.arbres.length, s.verger.arbres[0].case, blocAt(s, ici), countItem(s, 'jeune_pommier')], [true, 1, ici, null, 2]);
  assertEqual(arable(ici, s), false, 'on ne laboure pas sous un arbre');
  assertEqual(poserBloc(s, 'pommier', ici + 1).ok, false, 'trop près');
  assertEqual(poserBloc(s, 'mur_pierre', ici).ok, false, 'pas de bloc sur un arbre');
  // il pousse, puis donne ses fruits
  const t = s.verger.arbres[0];
  for (let i = 0; i < DATA.VERGER.MATURITE + 1; i++) sleepOnce(s);
  assert(t.fruits, 'en fruits');
  assert(harvestTree(s, t.id).ok);
});

test('mode test : les ressources, les blocs, les outils et l\'Atelier en un appui', () => {
  const s = createNewGame(77);
  setFarmSeed(s, '77');
  assert(testAddRessources(s).ok);
  for (const id of TEST_RESSOURCES) assertEqual(countItem(s, id) >= 20, true, id);
  assert(testAddMetaux(s).ok);
  assertEqual(countItem(s, 'lingot_fer') >= 10 && countItem(s, 'minerai_cuivre') >= 10, true);
  assert(testAddBlocs(s).ok);
  for (const b of Object.values(DATA.ATELIER.BLOCS)) if (b.objet) assert(countItem(s, b.objet) >= 5, b.objet);
  assert(testAllTools(s).ok);
  assert(s.potager.houe && s.outils.hache && s.outils.pioche && s.outils.canne);
  assert(testBuildAtelier(s).ok);
  assert(atelierConstruit(s));
  const avant = countItem(s, 'panneau_solaire');
  assertEqual(testAddItem(s, 'panneau_solaire', '3').items, { panneau_solaire: 3 });
  assertEqual(countItem(s, 'panneau_solaire'), avant + 3);
  assertEqual(testAddItem(s, 'licorne', 1).ok, false);
  assertEqual(testBuildAtelier(createInitialState()).ok, false, 'pas d\'Atelier sur la ferme dessinée');
});

test('ferme générée : une enceinte est une maison ou un bâtiment, le premier bloc décide', () => {
  const s = reach(chantier('g1'), 'poulailler');
  setInv(s, { mur_pierre: 40, porte: 4, paillasse: 2, four_pierre: 1, nichoir: 1, plancher: 2, batterie: 1 });
  removeStarter(s, 'batterie');   // (une partie neuve : pas de batterie installée)
  // deux enceintes côte à côte, un mur en commun
  const z = terrainLibre(s, 9, 5), a = murs(z, 5, 5), b = murs({ ...z, c: z.c + 4 }, 5, 5);
  for (const t of new Set([...a.murs, ...b.murs])) poserBloc(s, 'mur_pierre', t);
  poserBloc(s, 'porte', a.porte); poserBloc(s, 'porte', b.porte);
  // la maison : un lit, puis un four ; pas de nichoir
  assert(poserBloc(s, 'paillasse', a.dedans).ok);
  assertEqual([genrePiece(s, a.dedans), genrePiece(s, b.dedans)], ['maison', null]);
  assert(poserBloc(s, 'four', a.dedans + 1).ok, 'un four dans la maison');
  assertEqual(poserBloc(s, 'nichoir', a.dedans + 2).ok, false, 'pas de nichoir dans la maison');
  // le Poulailler : son nichoir, un plancher ; ni lit ni batterie
  assert(poserBloc(s, 'plancher', b.dedans + 1).ok, 'un plancher, oui');
  assert(poserBloc(s, 'nichoir', b.dedans).ok);
  assertEqual(genrePiece(s, b.dedans), 'poulailler');
  assertEqual(poserBloc(s, 'paillasse', b.dedans + 2).ok, false, 'pas de lit au Poulailler');
  assertEqual(poserBloc(s, 'batterie', b.dedans + 2).error, 'Cette enceinte est le Poulailler : on n\'y pose que son bloc (et un plancher). Batterie : dans une autre enceinte.');
  // le mur entre les deux ne se reprend pas (il mêlerait la maison et le Poulailler)
  const commun = (z.r + 2) * z.W + z.c + 4;
  assertEqual([reprendreBloc(s, commun).ok, blocAt(s, commun)], [false, 'mur_pierre']);
  // un bloc clé dans une enceinte qui a déjà autre chose : refusé
  reprendreBloc(s, b.dedans);
  assert(poserBloc(s, 'batterie', b.dedans + 2).ok, 'une enceinte vide prend une batterie');
  assertEqual(poserBloc(s, 'nichoir', b.dedans).ok, false, 'un bâtiment se bâtit dans une enceinte vide');
});

test('migration v37 → v38 : une enceinte qui mêle une maison et un bâtiment rend les blocs en trop', () => {
  const s = reach(chantier('g2'), 'poulailler');
  const z = terrainLibre(s, 5, 5), p = murs(z, 5, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserBloc(s, 'porte', p.porte);
  assert(poserBloc(s, 'paillasse', p.dedans).ok);
  // (une partie d'avant la règle : le nichoir posé à côté du lit)
  s.blocs[p.dedans + 1] = 'nichoir';
  s.poulailler.construit = true;
  setInv(s, {});
  const m = migrate({ ...s, version: 37 });
  assertEqual([m.version, m.blocs[p.dedans], m.blocs[p.dedans + 1], countItem(m, 'nichoir'), m.poulailler.construit], [STATE_VERSION, 'paillasse', undefined, 1, false]);
});

test('ferme générée : la barrière arrête le passage sans fermer de pièce ; le chemin se pose dehors, comme celui de la carte', () => {
  const s = reach(chantier('h1'), 'poulailler');
  setInv(s, { mur_pierre: 30, porte: 2, barriere: 30, chemin: 10, plancher: 2, nichoir: 1 });
  // une enceinte de barrières : pas une pièce close
  const z = terrainLibre(s, 12, 5), p = murs(z, 5, 5);
  for (const t of p.murs) assert(poserBloc(s, 'barriere', t).ok);
  assert(poserBloc(s, 'porte', p.porte).ok);
  assertEqual([blocBloque(s, p.murs[0]), dansPiece(s, p.dedans), piecesCloses(s).length], [true, false, 0]);
  // un chemin : sur l'herbe, dehors ; ses tuiles sont celles du chemin de la carte
  const c = (z.r + 2) * z.W + z.c + 8;
  assert(poserBloc(s, 'chemin', c).ok);
  assert(poserBloc(s, 'chemin', c + 1).ok);
  assertEqual([solAt(s, c), isArable(c, s)], ['chemin', false]);
  const T = farmTerrain(s), tuiles = tuilesChemins(T, new Set([c, c + 1]));
  assert(tuiles.some(([i]) => i === c) && tuiles.length >= 6, 'le chemin et ses raccords');
  assert(tuiles.every(([, g]) => g >= blocGid('herbe_chemin', 0) && g <= blocGid('herbe_chemin', 255)), 'les tuiles herbe / chemin de la planche');
  assertEqual(poserBloc(s, 'plancher', c).error, 'Il y a déjà un chemin ici.');
  // pas dans une pièce close ; le plancher, lui, entre au Poulailler même après le nichoir
  reprendreBloc(s, c); reprendreBloc(s, c + 1);
  for (const k of p.murs) reprendreBloc(s, k);
  for (const k of p.murs) poserBloc(s, 'mur_pierre', k);
  assert(poserBloc(s, 'nichoir', p.dedans).ok);
  assertEqual(poserBloc(s, 'chemin', p.dedans + 1).ok, false, 'le chemin : dehors');
  assert(poserBloc(s, 'plancher', p.dedans + 1).ok, 'un plancher au Poulailler, après le nichoir');
});

test('ferme générée : la lanterne scintillante (un champignon lumineux et un morceau d\'arbre de l\'infra-monde) éclaire, dehors ou dans la maison', () => {
  const s = reach(chantier('l1'), 'poulailler');
  // ses matières se cueillent (grotte, infra-monde) ; la recette de l'Atelier
  assertEqual([DATA.OBJETS.champignon_lumineux.cueillette, DATA.OBJETS.bois_infra.cueillette], ['grotte', 'infra']);
  setInv(s, { champignon_lumineux: 2, bois_infra: 1, mur_pierre: 30, porte: 2, nichoir: 1 });
  assert(craft(s, 'lanterne').ok);
  assertEqual([countItem(s, 'lanterne'), countItem(s, 'champignon_lumineux'), countItem(s, 'bois_infra')], [1, 1, 0]);
  assertEqual(craft(s, 'lanterne').ok, false, 'plus de bois de l\'infra-monde');
  assert(DATA.ATELIER.BLOCS.lanterne.lumiere);
  // posée dehors : elle arrête le passage ; reprise, elle revient dans l'inventaire
  const z = terrainLibre(s, 12, 5), dehors = (z.r + 2) * z.W + z.c + 8;
  assert(poserBloc(s, 'lanterne', dehors).ok);
  assertEqual([blocAt(s, dehors), blocBloque(s, dehors), countItem(s, 'lanterne')], ['lanterne', true, 0]);
  reprendreBloc(s, dehors);
  assertEqual([blocAt(s, dehors), countItem(s, 'lanterne')], [null, 1]);
  // dans une enceinte vide : oui ; dans un bâtiment (le Poulailler) : non
  const p = murs(z, 5, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserBloc(s, 'porte', p.porte);
  assert(poserBloc(s, 'lanterne', p.dedans + 1).ok, 'dans une enceinte vide');
  reprendreBloc(s, p.dedans + 1);
  assert(poserBloc(s, 'nichoir', p.dedans).ok);
  assertEqual(poserBloc(s, 'lanterne', p.dedans + 1).ok, false, 'pas dans un bâtiment');
});

test('ferme générée : la station du robot est un bloc à poser dehors ; sans elle, il ne se recharge pas', () => {
  const s = chantier('robot1');
  setInv(s, { station_robot: 1 });
  const z = terrainLibre(s, 3, 3), t = (z.r + 1) * z.W + z.c + 1;
  assertEqual(poserBloc(s, 'station_robot', t).ok, false, 'pas sans le robot');
  grantTech(s, 'cu_recolte_auto');
  assertEqual(robotStation(s), null, 'pas encore posée');
  const b = robotBattery(s);
  b.mwh = 0;
  runRobotCharge(s, 1000);
  assertEqual(b.mwh, 0, 'sans station : pas de charge');
  const base = robotTrip(s, { taches: [{ t: 'recolter', id: 'x' }], base: 0 }, 0);
  assert(poserBloc(s, 'station_robot', t).ok);
  assertEqual([robotStation(s), blocBloque(s, t), countItem(s, 'station_robot')], [t, true, 0], 'posée : elle arrête le passage');
  assert(base.route >= 0);
  setInv(s, { station_robot: 1 });
  assertEqual(poserBloc(s, 'station_robot', t + 2).ok, false, 'une seule station');
  reprendreBloc(s, t);
  assertEqual([robotStation(s), countItem(s, 'station_robot')], [null, 2], 'reprise : dans l\'inventaire');
  // (une ancienne partie qui a le robot reçoit sa station)
  const v = migrate({ ...JSON.parse(JSON.stringify(s)), version: 40, inventaire: JSON.parse(JSON.stringify(s.inventaire)) });
  assertEqual(countItem(v, 'station_robot'), 2, 'elle en a déjà : rien de plus');
  setInv(s, {});
  const w = migrate({ ...JSON.parse(JSON.stringify(s)), version: 40 });
  assertEqual([w.version, countItem(w, 'station_robot')], [STATE_VERSION, 1]);
  void robotCapacity;
});

test('ferme générée (essai) : l\'escalier ouvre un étage au-dessus de sa pièce close ; on y pose des blocs', () => {
  const s = chantier('etage1');
  setInv(s, { mur_pierre: 40, porte: 4, escalier: 1, paillasse: 2 });
  const z = terrainLibre(s, 6, 5), p = murs(z, 6, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserBloc(s, 'porte', p.porte);
  assertEqual(etageEmprise(s).size, 0, 'pas d\'escalier : pas d\'étage');
  assert(poserBloc(s, 'escalier', p.dedans).ok, 'l\'escalier, dans la pièce close');
  assertEqual([escaliers(s), blocBloque(s, p.dedans)], [[p.dedans], false], 'il se traverse');
  const E = etageEmprise(s);
  assertEqual(E.size, 6 * 5, 'la pièce et ses murs');
  const coin = (z.r) * z.W + z.c;
  assertEqual(poserEtage(s, 'mur_pierre', p.dedans).ok, false, 'pas sur le haut de l\'escalier');
  assertEqual(poserEtage(s, 'four', p.dedans + 1).ok, false, 'pas n\'importe quel bloc');
  assertEqual(poserEtage(s, 'mur_pierre', coin - 1).ok, false, 'pas hors de l\'emprise');
  assert(poserEtage(s, 'mur_pierre', coin).ok, 'au-dessus d\'un mur');
  assert(poserEtage(s, 'paillasse', p.dedans + 2).ok);
  assertEqual(poserEtage(s, 'mur_pierre', coin).ok, false, 'déjà un bloc');
  assertEqual([Object.keys(etageBlocs(s)).length, countItem(s, 'paillasse')], [2, 1]);
  assert(reprendreEtage(s, coin).ok);
  // l'escalier repris : l'étage s'en va, ses blocs reviennent
  reprendreBloc(s, p.dedans);
  assertEqual([Object.keys(etageBlocs(s)).length, countItem(s, 'paillasse'), countItem(s, 'escalier')], [0, 2, 1]);
});

test('ferme générée : les fenêtres et les pierres d\'angle ferment une pièce comme des murs', () => {
  const s = chantier('deco1');
  setInv(s, { mur_pierre: 20, mur_fenetre: 4, pierre_angle: 4, porte: 1 });
  const z = terrainLibre(s, 5, 4), p = murs(z, 5, 4);
  const coins = [p.murs[0], p.murs[4], p.murs[p.murs.length - 1], p.murs[p.murs.length - 4]];
  const fenetres = [p.murs[2], p.murs[p.murs.length - 2]];
  for (const t of p.murs) assert(poserBloc(s, coins.includes(t) ? 'pierre_angle' : fenetres.includes(t) ? 'mur_fenetre' : 'mur_pierre', t).ok, `bloc ${t}`);
  poserBloc(s, 'porte', p.porte);
  assertEqual(piecesCloses(s).length, 1, 'une pièce close');
  assertEqual([blocBloque(s, coins[0]), blocBloque(s, fenetres[0])], [true, true], 'on ne passe pas');
  assertEqual([countItem(s, 'pierre_angle'), countItem(s, 'mur_fenetre')], [0, 2]);
});

test('ferme générée : une fenêtre change un mur sans l\'enlever (au sol et à l\'étage)', () => {
  const s = chantier('deco2');
  setInv(s, { mur_pierre: 20, mur_fenetre: 2, pierre_angle: 1, porte: 1, escalier: 1 });
  const z = terrainLibre(s, 5, 4), p = murs(z, 5, 4);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserBloc(s, 'porte', p.porte);
  const m = p.murs[2], avant = countItem(s, 'mur_pierre');
  const r = poserBloc(s, 'mur_fenetre', m);
  assert(r.ok, r.error);
  assertEqual([blocAt(s, m), r.remplace, countItem(s, 'mur_pierre'), countItem(s, 'mur_fenetre')], ['mur_fenetre', 'mur_pierre', avant + 1, 1]);
  assertEqual(piecesCloses(s).length, 1, 'la pièce reste close');
  assert(poserBloc(s, 'pierre_angle', m).ok, 'une pierre d\'angle à la place de la fenêtre');
  assertEqual([blocAt(s, m), countItem(s, 'mur_fenetre')], ['pierre_angle', 2]);
  assertEqual(poserBloc(s, 'porte', p.murs[3]).ok, false, 'une porte ne change pas un mur');
  // à l'étage
  poserBloc(s, 'escalier', p.dedans);
  const coin = p.murs[0];
  assert(poserEtage(s, 'mur_pierre', coin).ok);
  assert(poserEtage(s, 'mur_fenetre', coin).ok, 'une fenêtre sur le mur de l\'étage');
  assertEqual([etageBlocs(s)[coin], countItem(s, 'mur_fenetre')], ['mur_fenetre', 1]);
});

test('ferme générée : des bouts de murs qui ne se touchent pas ne font pas de pièce close', () => {
  // (une grande étendue ouverte, arrêtée à PIECE_MAX cases, ne doit pas faire un faux mur
  // pour une autre : chaque pièce trouvée est vraiment fermée)
  const s = chantier('pc1'), T = farmTerrain(s), W = T.LARGEUR, H = T.HAUTEUR;
  let x = 7;
  const R = () => (x = (x * 9301 + 49297) % 233280) / 233280;
  s.blocs = {};
  for (let k = 0; k < 40; k++) {
    const c = 10 + Math.floor(R() * (W - 30)), r = 10 + Math.floor(R() * (H - 30)), v = R() < 0.5, n = 3 + Math.floor(R() * 8);
    for (let i = 0; i < n; i++) s.blocs[v ? (r + i) * W + c : r * W + c + i] = i === 1 ? 'porte' : 'mur_pierre';
  }
  for (const p of piecesCloses(s)) {
    const vu = new Set([p.cases[0]]), pile = [p.cases[0]];
    let bord = false;
    while (pile.length && vu.size <= p.cases.length) {
      const i = pile.pop(), c = i % W, r = Math.floor(i / W);
      if (c === 0 || r === 0 || c === W - 1 || r === H - 1) bord = true;
      for (const j of [i - 1, i + 1, i - W, i + W]) if (!s.blocs[j] && !vu.has(j)) { vu.add(j); pile.push(j); }
    }
    assertEqual([bord, vu.size], [false, p.cases.length], 'une pièce vraiment fermée');
  }
});

test('ferme générée : un toit sur le dernier niveau de chaque bâtiment', () => {
  const s = chantier('toit1');
  setInv(s, { mur_pierre: 40, porte: 4, escalier: 1, paillasse: 1 });
  const z = terrainLibre(s, 6, 5), p = murs(z, 6, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  assertEqual(toits(s).length, 0, 'pas de pièce close : pas de toit');
  poserBloc(s, 'porte', p.porte);
  assertEqual(toits(s).length, 0, 'une pièce close vide : une cour, à ciel ouvert');
  poserBloc(s, 'paillasse', p.dedans + 1);
  assertEqual(toits(s).map((t) => [t.niveau, t.cases.length]), [[0, 30]], 'aménagée : sur les murs du bas, murs compris');
  // l'escalier : l'étage, à ciel ouvert tant que ses murs ne le ferment pas
  poserBloc(s, 'escalier', p.dedans);
  assertEqual(toits(s).length, 0, 'une terrasse');
  const tour = [...p.murs, p.porte];
  for (const t of tour) assert(poserEtage(s, 'mur_pierre', t).ok, `étage ${t}`);
  assertEqual(toits(s).map((t) => [t.niveau, t.cases.length, t.dedans.length]), [[1, 30, 30]], 'sur les murs de l\'étage');
  reprendreEtage(s, tour[3]);
  assertEqual(toits(s).length, 0, 'un mur de l\'étage en moins : ouvert');
});

test('ferme générée : la paroi vitrée se pose comme un mur ou à la place d\'un mur', () => {
  const s = chantier('vitre1');
  setInv(s, { mur_pierre: 20, paroi_vitree: 4, porte: 1 });
  const z = terrainLibre(s, 5, 4), p = murs(z, 5, 4);
  for (const [i, t] of p.murs.entries()) assert(poserBloc(s, i === 1 ? 'paroi_vitree' : 'mur_pierre', t).ok, `bloc ${t}`);
  poserBloc(s, 'porte', p.porte);
  assertEqual(piecesCloses(s).length, 1, 'elle ferme la pièce');
  assert(poserBloc(s, 'paroi_vitree', p.murs[2]).ok, 'à la place d\'un mur');
  assertEqual([blocAt(s, p.murs[2]), blocBloque(s, p.murs[2]), countItem(s, 'paroi_vitree'), piecesCloses(s).length], ['paroi_vitree', true, 2, 1]);
});

test('ferme générée : les murs aux matières de la ville ferment une pièce et changent un mur', () => {
  const sortes = ['mur_brique_rouge', 'mur_brique_orange', 'mur_brique_ocre', 'mur_brique_bleue', 'mur_pierre_taille'];
  for (const sorte of sortes) {
    assertEqual([DATA.ATELIER.BLOCS[sorte].mur, DATA.ATELIER.RECETTES[sorte].sortie[sorte]], [true, 1], sorte);
    const s = chantier('mv_' + sorte);
    setInv(s, { [sorte]: 20, porte: 1 });
    const z = terrainLibre(s, 5, 4), p = murs(z, 5, 4);
    for (const t of p.murs) assert(poserBloc(s, sorte, t).ok, `${sorte} ${t}`);
    poserBloc(s, 'porte', p.porte);
    assertEqual(piecesCloses(s).length, 1, `${sorte} : une pièce close`);
    setInv(s, { mur_pierre: 1 });
    assert(poserBloc(s, 'mur_pierre', p.murs[1]).ok, `${sorte} : changé en mur en pierre`);
  }
});
