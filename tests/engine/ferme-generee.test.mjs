/* ==========================================================================
   Tests du moteur : la ferme générée d'après une graine (docs/carte-generee.md, étape 2) et
   le terrain d'une carte (terrain-carte.js).
   Lancer seul : node --test tests/engine/ferme-generee.test.mjs (ou node tests/run-tests.mjs ferme-generee).
   ========================================================================== */

import { assert, assertEqual, garden, test } from './aide.mjs';
import { readFileSync } from 'node:fs';
import {
  createInitialState, DATA, FERME_GENEREE, farmMap, farmPoint, farmTerrain, genererFerme, hoeableTiles,
  isArable, migrate, robotTrip, STATE_VERSION, terrainOfMap, testFarmMap,
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
  assertEqual([a.terrain.DECALAGE, Object.keys(a.terrain.ARBRES).length, a.terrain.LIGNES.join('').split('#').length - 1], [[25, 29], 256, 10995]);
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
    const m = objets.maison, porte = (Math.ceil((m.y + m.height) / T) + 1) * W + Math.round((m.x + m.width / 2) / T);
    assert(vus.has(porte), 'le chemin passe devant la porte de la maison');
    // les bâtiments de la cour (provisoires) et les rochers, les arbres
    for (const n of ['maison', 'grange', 'moulin', 'serre', 'verger', 'silo', 'poulailler', 'puits', 'citerne', 'ville', 'zone_culture_1', 'zone_culture_2']) assert(objets[n], n);
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
