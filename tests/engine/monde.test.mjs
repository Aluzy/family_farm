/* ==========================================================================
   Tests du moteur : le grand monde (js/engine/monde.js), la ferme générée posée au centre, la
   migration v51 → v52 qui porte les cases d'une partie dans celles du monde ; les régions vues
   (state.monde.vues, migration v52 → v53) : le moteur et la nuit ne regardent qu'elles.
   Lancer seul : node --test tests/engine/monde.test.mjs (ou node tests/run-tests.mjs monde).
   ========================================================================== */

import {
  addItem, brokenRocks, casesDeRegion, casesDuTerrain, createInitialState, cutBushes, cutGrass, decalerPartie, farmMap,
  farmTerrain, fellenTrees, FERME_DANS_MONDE, genererFerme, genererMonde, hoeableTiles, migrate, MONDE, poserBloc,
  ramassables, regionDeCase, regionsFerme, regionsVues, regionVue, STATE_VERSION, terrainOfMap, voirRegion,
} from '../../js/engine/index.js';
import { assert, assertEqual, avantLeMonde, caseDeLaFerme, garden, sleepOnce, test } from './aide.mjs';

const [OX, OY] = FERME_DANS_MONDE;

test('le monde : la ferme générée au centre, ses couches et son terrain à leur place', () => {
  const f = genererFerme('monde-1'), m = genererMonde('monde-1');
  const W = MONDE.LARGEUR, fw = f.carte.width, fh = f.carte.height;
  assertEqual([m.carte.width, m.carte.height, m.terrain.LARGEUR, m.terrain.HAUTEUR], [644, 510, 644, 510]);
  assertEqual(m.terrain.FERME, { X: OX, Y: OY, LARGEUR: fw, HAUTEUR: fh });
  // chaque couche de la ferme, case par case, à sa place dans le monde
  for (const l of f.carte.layers.filter((x) => x.type === 'tilelayer')) {
    const lm = m.carte.layers.find((x) => x.name === l.name);
    let ecarts = 0;
    for (let r = 0; r < fh; r++) for (let c = 0; c < fw; c++) if (lm.data[(r + OY) * W + c + OX] !== l.data[r * fw + c]) ecarts++;
    assertEqual(ecarts, 0, `couche ${l.name}`);
  }
  // les objets (rectangles, touffes) décalés d'autant de px
  const o = (carte, nom) => carte.layers.find((x) => x.name === 'batiment').objects.find((x) => x.name === nom);
  assertEqual([o(m.carte, 'zone_culture_1').x, o(m.carte, 'zone_culture_1').y], [o(f.carte, 'zone_culture_1').x + OX * 16, o(f.carte, 'zone_culture_1').y + OY * 16]);
  // le terrain : celui que terrain-carte.js lirait sur la carte du monde, sur la ferme (la
  // prairie autour n'est « rien » pour l'instant)
  const lu = terrainOfMap(m.carte);
  assertEqual([m.terrain.ROCHERS, m.terrain.ARBRES, m.terrain.ZONES], [lu.ROCHERS, lu.ARBRES, lu.ZONES]);
  for (let r = 0; r < fh; r++) assertEqual(m.terrain.LIGNES[r + OY].slice(OX, OX + fw), lu.LIGNES[r + OY].slice(OX, OX + fw), `rangée ${r}`);
  assert(m.terrain.LIGNES.every((l, r) => (r < OY || r >= OY + fh ? /^\.+$/.test(l) : /^\.+$/.test(l.slice(0, OX)) && /^\.+$/.test(l.slice(OX + fw)))), 'la prairie : rien');
  assertEqual(casesDuTerrain(m.terrain).length, fw * fh, 'le moteur ne parcourt que la ferme');
  // les herbes hautes, les fleurs, les buissons : dans les cases du monde
  const [i0, ids0] = Object.entries(f.terrain.HERBES)[0];
  const i = (Math.floor(i0 / fw) + OY) * W + (i0 % fw) + OX;
  assertEqual(m.terrain.HERBES[i], ids0.map((id) => { const [x, y] = id.split(',').map(Number); return `${x + OX * 16},${y + OY * 16}`; }));
  assertEqual(m.terrain.BUISSONS[0].slice(0, 2), [f.terrain.BUISSONS[0][0] + OX, f.terrain.BUISSONS[0][1] + OY]);
});

test('le monde : la prairie continue l\'herbe de la ferme (mêmes coins de cases sur son bord)', () => {
  const f = genererFerme('monde-2'), m = genererMonde('monde-2');
  const V = MONDE.LARGEUR + 1, fv = f.carte.width + 1;
  for (const [lx, ly] of [[0, 0], [f.carte.width, 30], [70, f.carte.height]]) {
    assertEqual([m.terrain.SOMMETS[(ly + OY) * V + lx + OX], m.terrain.TEINTES[(ly + OY) * V + lx + OX]], [f.terrain.SOMMETS[ly * fv + lx], f.terrain.TEINTES[ly * fv + lx]]);
  }
  // (le sol autour de la ferme n'est plus dans les couches de la carte : il se calcule région par
  // région, monde-sol.js, tests/engine/monde-sol.test.mjs)
  const sol = m.carte.layers.find((l) => l.name === 'ground').data;
  const F = m.terrain.FERME;
  assert(sol.every((g, i) => { const c = i % MONDE.LARGEUR, r = Math.floor(i / MONDE.LARGEUR); return (c >= F.X && r >= F.Y && c < F.X + F.LARGEUR && r < F.Y + F.HAUTEUR) === (g > 0); }), 'du sol sur la ferme, rien autour dans la carte');
});

test('migration v51 → v52 : les cases d\'une partie passent dans celles du monde', () => {
  const s = garden();
  s.pieces = 5000;
  // de quoi porter : des blocs, des parcelles, des touffes fauchées, des rochers touchés, un morceau au sol
  const p0 = s.potager.parcelles[0].case;
  addItem(s, 'mur_pierre', 1);
  const t = hoeableTiles(s)[10];
  assert(poserBloc(s, 'mur_pierre', t).ok, 'un mur');
  const herbe = Object.values(farmTerrain(s).HERBES)[0][0];
  s.outils = s.outils || {};
  s.outils.herbes = { [herbe]: { retour: 9 } };
  s.outils.rochers = { [Object.keys(farmTerrain(s).ROCHERS)[0]]: 2 };
  s.outils.arbres = { [Object.keys(farmTerrain(s).ARBRES)[0]]: 1, f3: 2 };
  s.morceaux = [{ n: 1, item: 'bois', carte: 'ferme', x: OX * 16 + 100, y: OY * 16 + 200 }];
  // la même partie, d'avant le monde : ses cases sur la largeur de la ferme
  const v51 = avantLeMonde(s, 51);
  assertEqual(v51.potager.parcelles[0].case, caseDeLaFerme(p0));
  assertEqual(v51.blocs[caseDeLaFerme(t)], 'mur_pierre');
  assertEqual(v51.morceaux[0], { n: 1, item: 'bois', carte: 'ferme', x: 100, y: 200 });
  assert(v51.outils.arbres.f3 === 2, 'un arbre planté garde son identifiant');
  // la migration la ramène telle qu'elle était
  const m = migrate({ v: 51, t: 0, s: v51 });
  assertEqual(m.version, STATE_VERSION);
  for (const k of ['blocs', 'potager', 'outils', 'morceaux']) assertEqual(m[k], s[k], k);
  assertEqual(decalerPartie(decalerPartie(s, -1), 1).blocs, s.blocs, 'aller et retour');
  // la carte de la partie : le monde
  assertEqual(farmMap(m).width, MONDE.LARGEUR);
});

/* ---------- les régions vues (étape 3b) ---------- */

// Une case loin de la ferme, dans la région « 1,1 » (la prairie du coin nord-ouest).
const LOIN = 70 * MONDE.LARGEUR + 70;

test('les régions vues : celles de la ferme d\'office ; le personnage qui entre dans une autre la note', () => {
  const s = garden(), T = farmTerrain(s), F = T.FERME, N = MONDE.REGION;
  assertEqual(N, 64);
  assertEqual(regionsFerme(T), ['3,3', '4,3', '5,3', '6,3', '3,4', '4,4', '5,4', '6,4'], 'la ferme (250 + 144, 198 + 114) touche 4 × 2 régions');
  assertEqual(s.monde, { vues: regionsFerme(T) }, 'une partie neuve a vu sa ferme');
  assertEqual(regionDeCase(LOIN), '1,1');
  assert(!regionVue(s, LOIN), 'pas encore vue');
  assertEqual(voirRegion(s, LOIN), true, 'il y entre : elle devient vue');
  assertEqual(voirRegion(s, LOIN + 1), false, 'une fois');
  assertEqual(voirRegion(s, F.Y * MONDE.LARGEUR + F.X), false, 'la ferme l\'était déjà');
  assertEqual(s.monde.vues.at(-1), '1,1');
  assert(regionVue(s, LOIN) && regionsVues(s).has('1,1'));
  assertEqual(voirRegion(s, -1), false, 'hors du monde : rien');
});

test('casesDuTerrain : la ferme, puis les régions vues ; jamais une région que le joueur n\'a pas vue', () => {
  const s = garden(), T = farmTerrain(s), F = T.FERME;
  const ferme = casesDuTerrain(T);
  assertEqual(ferme.length, F.LARGEUR * F.HAUTEUR);
  // les régions de la ferme sont vues d'office : leurs cases de prairie autour de la ferme aussi
  assertEqual(casesDuTerrain(T, s).length, regionsFerme(T).length * MONDE.REGION * MONDE.REGION);
  assert(!casesDuTerrain(T, s).includes(LOIN), 'une région pas vue est ignorée');
  voirRegion(s, LOIN);
  const vues = casesDuTerrain(T, s);
  assert(vues.includes(LOIN), 'une région vue est prise en compte');
  assertEqual(vues.length, (regionsFerme(T).length + 1) * MONDE.REGION * MONDE.REGION);
  assertEqual(casesDeRegion('1,1').length, MONDE.REGION * MONDE.REGION);
  assert(vues.every((t, i) => i === 0 || t > vues[i - 1]), 'dans l\'ordre des cases');
});

test('la nuit : ce qui est dans une région pas vue ne bouge pas ; vue, elle repousse comme sur la ferme', () => {
  const s = garden(), T = farmTerrain(s), W = MONDE.LARGEUR;
  const [rf] = Object.keys(T.ROCHERS), [af] = Object.keys(T.ARBRES);
  const ici = `${LOIN % W},${Math.floor(LOIN / W)}`;          // « colonne,rangée » dans la région 1,1
  const touffe = `${(LOIN % W) * 16 + 8},${Math.floor(LOIN / W) * 16 + 15}`;   // son pied, en px
  const touffeFerme = Object.values(T.HERBES)[0][0];
  s.outils = s.outils || {};
  s.outils.rochers = { [rf]: { retour: s.day + 1 }, [ici]: { retour: s.day + 1 } };
  s.outils.arbres = { [af]: { retour: s.day + 1 }, [ici]: { retour: s.day + 1 } };
  s.outils.buissons = { [ici]: { retour: s.day + 1 } };
  s.outils.herbes = { [touffeFerme]: { retour: s.day + 1 }, [touffe]: { retour: s.day + 1 } };
  sleepOnce(s);
  assertEqual([brokenRocks(s), fellenTrees(s), cutBushes(s), cutGrass(s)], [[ici], [ici], [ici], [touffe]], 'la ferme a repoussé, pas la région 1,1');
  sleepOnce(s);
  assertEqual([brokenRocks(s), fellenTrees(s), cutBushes(s), cutGrass(s)], [[ici], [ici], [ici], [touffe]], 'elle attend qu\'il y vienne');
  voirRegion(s, LOIN);
  sleepOnce(s);
  assertEqual([brokenRocks(s), fellenTrees(s), cutBushes(s), cutGrass(s)], [[], [], [], []], 'vue : elle repousse la nuit suivante');
});

test('la cueillette : rien dans une région pas vue ; vue, elle a ses places, sans changer celles de la ferme', () => {
  const s = createInitialState(4242);
  const T = farmTerrain(s), W = MONDE.LARGEUR;
  // (la prairie n'a pas encore d'herbe à cueillir, monde.js : on en met dans la région 1,1 de ce
  // monde-là, le temps du test)
  for (let r = 64; r < 128; r++) T.LIGNES[r] = T.LIGNES[r].slice(0, 64) + '#'.repeat(64) + T.LIGNES[r].slice(128);
  const avant = ramassables(s);
  assert(avant.length > 0, 'des places sur la ferme');
  assert(avant.every((p) => regionVue(s, p.case)), 'toutes dans des régions vues');
  voirRegion(s, LOIN);
  const apres = ramassables(s);
  const loin = apres.filter((p) => regionDeCase(p.case) === '1,1');
  assert(loin.length > 0, 'la région vue a ses places');
  assertEqual(apres.filter((p) => regionDeCase(p.case) !== '1,1'), avant, 'celles de la ferme ne changent pas');
  assert(loin.every((p) => Math.floor(p.case / W) >= 64 && Math.floor(p.case / W) < 128));
});

test('migration v52 → v53 : une partie d\'avant a vu les régions de sa ferme, rien d\'autre ne change', () => {
  const s = garden();
  const { monde, ...reste } = s;
  const v52 = JSON.parse(JSON.stringify({ ...reste, version: 52 }));
  const m = migrate({ v: 52, t: 0, s: v52 });
  assertEqual(m.version, STATE_VERSION);
  assertEqual(m.monde, { vues: regionsFerme(farmTerrain(s)) });
  assertEqual({ ...m, monde: undefined, version: 0 }, { ...JSON.parse(JSON.stringify(s)), monde: undefined, version: 0 }, 'le reste à l\'identique');
  assertEqual(casesDuTerrain(farmTerrain(m), m), casesDuTerrain(farmTerrain(s), s));
  assert(sleepOnce(m) !== null, 'la partie continue');
});
