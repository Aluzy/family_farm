/* ==========================================================================
   Tests du moteur : la ferme générée d'après une graine (docs/carte-generee.md, étape 2) et
   le terrain d'une carte (terrain-carte.js).
   Lancer seul : node --test tests/engine/ferme-generee.test.mjs (ou node tests/run-tests.mjs ferme-generee).
   ========================================================================== */

import { assert, assertEqual, garden, reach, setInv, sleepOnce, test, tireless } from './aide.mjs';
import { readFileSync } from 'node:fs';
import {
  atelierConstruit, atelierOuvert, eatSnack, buildPoulailler, coopCapacity, buildPaturage, freeSheepPlaces, buildSerre, buildSilo, siloCapacity, buildVerger, harvestTree, isArable as arable, removeStarter, blocDessus, buyStarter, farmOpen, isOwned, starterOf, buildStation, buyFurniture, houseRepaired, repairHouse, atelierStatus, createNewGame, mainCharacter, nuitSansCouchage, setFarmSeed, blocAt, blocBloque, blocsEnMain, couchages, dansPiece, nuitCouchee, piecesCloses, poserBloc, reprendreBloc, solAt, buildAtelier, countItem, craft, craftStatus, createInitialState, DATA, FERME_GENEREE, farmMap, farmPoint, farmTerrain, genererFerme, hoeableTiles,
  isArable, migrate, ramassables, ramasser, robotTrip, STATE_VERSION, terrainOfMap, testFarmMap,
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
  assertEqual([a.terrain.DECALAGE, Object.keys(a.terrain.ARBRES).length, a.terrain.LIGNES.join('').split('#').length - 1], [[25, 29], 256, 12003]);
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
    assert(pp.includes(539) && pp.includes(540), 'le tronc creux');
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

test('ferme générée : un nichoir posé dans une pièce close construit le Poulailler', () => {
  const s = reach(chantier('p1'), 'poulailler');
  s.pieces = 100000;
  s.poulailler.construit = false;
  assertEqual(buildPoulailler(s).ok, false, 'pas en pièces');
  setInv(s, { mur_pierre: 30, porte: 2, nichoir: 2 });
  const z = terrainLibre(s, 5, 5), p = murs(z, 5, 5);
  assertEqual(poserBloc(s, 'nichoir', p.dedans).ok, false, 'hors d\'une pièce close');
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserBloc(s, 'porte', p.porte);
  assert(poserBloc(s, 'nichoir', p.dedans).ok);
  assertEqual([s.poulailler.construit, s.poulailler.niveau > 0, coopCapacity(s) > 0], [true, true, true]);
  assertEqual(poserBloc(s, 'nichoir', p.dedans + 1).ok, false, 'un seul nichoir');
  reprendreBloc(s, p.dedans);
  assertEqual([s.poulailler.construit, coopCapacity(s)], [false, 0], 'repris : plus de Poulailler');
});

/* ---------- étape 5b : l'Étable (pièce close + mangeoire) ---------- */

test('ferme générée : une mangeoire posée dans une pièce close construit l\'Étable', () => {
  const s = reach(chantier('e1'), 'paturage');
  s.pieces = 100000;
  s.paturage.construit = false;
  s.paturage.places = 0;
  assertEqual(buildPaturage(s).ok, false, 'pas en pièces');
  setInv(s, { mur_pierre: 30, porte: 2, mangeoire: 1 });
  const z = terrainLibre(s, 5, 5), p = murs(z, 5, 5);
  assertEqual(poserBloc(s, 'mangeoire', p.dedans).ok, false, 'hors d\'une pièce close');
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserBloc(s, 'porte', p.porte);
  assert(poserBloc(s, 'mangeoire', p.dedans).ok);
  assertEqual([s.paturage.construit, s.paturage.places, freeSheepPlaces(s)], [true, DATA.PATURAGE.PLACES_DEPART, DATA.PATURAGE.PLACES_DEPART]);
  s.paturage.places += 2;   // des places achetées : gardées si on la reprend puis la repose
  reprendreBloc(s, p.dedans);
  assertEqual([s.paturage.construit, freeSheepPlaces(s), countItem(s, 'mangeoire')], [false, 0, 1], 'repris : plus d\'Étable');
  poserBloc(s, 'mangeoire', p.dedans);
  assertEqual(s.paturage.places, DATA.PATURAGE.PLACES_DEPART + 2);
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
