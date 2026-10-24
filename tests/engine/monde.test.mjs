/* ==========================================================================
   Tests du moteur : le grand monde (js/engine/monde.js), la ferme générée posée au centre, et
   la migration v51 → v52 qui porte les cases d'une partie dans celles du monde.
   Lancer seul : node --test tests/engine/monde.test.mjs (ou node tests/run-tests.mjs monde).
   ========================================================================== */

import {
  addItem, casesDuTerrain, decalerPartie, farmMap, farmTerrain, FERME_DANS_MONDE, genererFerme, genererMonde,
  hoeableTiles, migrate, MONDE, poserBloc, STATE_VERSION, terrainOfMap,
} from '../../js/engine/index.js';
import { assert, assertEqual, avantLeMonde, caseDeLaFerme, garden, test } from './aide.mjs';

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
  const sol = m.carte.layers.find((l) => l.name === 'ground').data;
  assert(sol.every((g) => g > 0), 'du sol partout');
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
