/* ==========================================================================
   Tests du socle des comportements (fiche 31 : js/carte/comportement.js).
   - la machine à états : le pas de l'état, l'état suivant qu'il rend ; les transitions revues à leur
     cadence, avant le temps qui s'écoule (`avant`) et le pas ;
   - la perception : les voisins dans un rayon, à cheval sur les cellules, filtrés, sans tableau neuf ;
     la vitesse d'un acteur d'une image à l'autre ;
   - le pas commun ; la séparation (deux acteurs l'un sur l'autre s'écartent en moins d'une seconde) ;
   - le hasard à graine : le même tirage pour la même graine.
   Lancer seul : node tests/run-tests.mjs comportement.
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { assert, assertEqual, test } from './aide.mjs';

const fenetre = { addEventListener() {}, matchMedia: () => ({ matches: false }), devicePixelRatio: 1, localStorage: null, navigator: {} };
for (const f of ['kit.js', 'comportement.js']) new Function('window', readFileSync(new URL(`../../js/carte/${f}`, import.meta.url), 'utf8'))(fenetre);
const K = fenetre.CarteKit;

test('la machine : le pas de l\'état, l\'état suivant ; les transitions à leur cadence, avant le temps qui s\'écoule', () => {
  const journal = [];
  const M = K.machine({
    repos: { pas: (a) => { journal.push(a.t > 0 ? 'repos, encore' : 'repos, fini'); return a.t <= 0 ? 'marche' : undefined; } },
    marche: { pas: () => { journal.push('marche'); } },
    fuite: { pas: () => { journal.push('fuite'); return 'repos'; } },
  }, [{ de: ['repos', 'marche'], si: (a, c) => c.peur, vers: 'fuite' }], { cadence: 0.1, avant: (a, dt) => { a.t -= dt; } });
  const a = { etat: 'repos', t: 0.15 };
  const c = { peur: false };
  M.pas(a, 0.1, c); M.pas(a, 0.1, c);
  assertEqual([a.etat, journal], ['marche', ['repos, encore', 'repos, fini']]);
  // la peur : vue à la revue suivante (cadence 0,1 s), avant le pas
  c.peur = true;
  M.pas(a, 0.05, c);
  assertEqual(a.etat, 'marche', 'pas encore revue');
  M.pas(a, 0.05, c);
  assertEqual(journal.slice(-1), ['fuite']);
  assertEqual(a.etat, 'repos', 'la fuite rend l\'état suivant');
});

test('la perception : les voisins dans un rayon, à cheval sur les cellules ; sans tableau neuf ; leur vitesse', () => {
  const P = K.perception(64), sortie = [];
  P.vide();
  P.ajoute(63, 63, 'poule', 'a', 0.1);
  P.ajoute(65, 65, 'poule', 'b', 0.1);
  P.ajoute(200, 200, 'vache', 'c', 0.1);
  P.ajoute(70, 40, 'chien', 'd', 0.1);
  const n = P.voisins(64, 64, 30, sortie);
  assertEqual([n, sortie.map((e) => e.ref).sort()], [3, ['a', 'b', 'd']]);
  const s2 = sortie;
  assertEqual(P.voisins(64, 64, 30, sortie, (e) => e.genre === 'poule'), 2);
  assert(sortie === s2, 'le même tableau, rempli de nouveau');
  // l'image d'après : a a bougé de 10 px vers la droite en 0,1 s
  P.vide();
  const e = P.ajoute(73, 63, 'poule', 'a', 0.1);
  assertEqual([Math.round(e.vx), Math.round(e.vy)], [100, 0]);
  assertEqual(P.voisins(64, 64, 30, sortie), 1);
});

test('le pas commun : vers le but, il regarde où il va ; bloqué ou arrivé : false', () => {
  const a = { x: 0, y: 0, flip: false };
  assert(K.avance(a, -100, 0, 50, 0.1, () => true));
  assertEqual([a.x, a.y, a.flip], [-5, 0, true]);
  assertEqual(K.avance(a, -100, 0, 50, 0.1, () => false), false);
  assertEqual(a.x, -5, 'bloqué : il ne bouge pas');
  assertEqual(K.avance(a, -5, 0.2, 50, 0.1, () => true), false, 'arrivé');
});

test('la séparation : deux acteurs l\'un sur l\'autre s\'écartent en moins d\'une seconde', () => {
  const a = { x: 100, y: 100 }, b = { x: 100, y: 100 }, P = K.perception(64), v = [];
  const R = 10;
  for (let k = 0; k < 60; k++) {
    P.vide();
    P.ajoute(a.x, a.y, 'vache', a, 1 / 60);
    P.ajoute(b.x, b.y, 'vache', b, 1 / 60);
    for (const o of [a, b]) { const n = P.voisins(o.x, o.y, R, v); K.separation(o, v, n, R, 40, 1 / 60, () => true); }
  }
  assert(Math.hypot(a.x - b.x, a.y - b.y) >= R * 0.9, `écartés de ${Math.hypot(a.x - b.x, a.y - b.y).toFixed(1)} px`);
  // loin l'un de l'autre : rien ne bouge
  const c = { x: 0, y: 0 }, d = { x: 50, y: 0 };
  P.vide(); P.ajoute(c.x, c.y, 'x', c, 0.1); P.ajoute(d.x, d.y, 'x', d, 0.1);
  assertEqual(K.separation(c, v, P.voisins(c.x, c.y, R, v), R, 40, 0.1, () => true), false);
});

test('le hasard à graine : le même tirage pour la même graine, entre 0 et 1', () => {
  const g = K.graine('chevreuil:4800,3700');
  const a = K.hasard(g), b = K.hasard(g), c = K.hasard(K.graine('chevreuil:4801,3700'));
  const ta = Array.from({ length: 50 }, a), tb = Array.from({ length: 50 }, b), tc = Array.from({ length: 50 }, c);
  assertEqual(ta, tb);
  assert(ta.join() !== tc.join(), 'une autre place, un autre tirage');
  assert(ta.every((x) => x >= 0 && x < 1));
  const m = ta.reduce((s, x) => s + x, 0) / ta.length;
  assert(m > 0.3 && m < 0.7, `moyenne ${m}`);
});

test('la distance de fuite (fiche 32) : à petits pas, au galop, près d\'un hameau', () => {
  const R = { lent: 0.7, galop: 2, habitue: 0.6 }, M = 40;
  assertEqual(K.rayonFuite(50, M, M, false, R), 50, 'à la marche');
  assertEqual(K.rayonFuite(50, 10, M, false, R), 35, 'à petits pas');
  assertEqual(K.rayonFuite(50, 81, M, false, R), 100, 'au galop');
  assertEqual(K.rayonFuite(50, M, M, true, R), 30, 'près d\'un hameau');
  assertEqual(K.rayonFuite(0, M, M, false, R), 0, 'une bête qui ne fuit pas');
});
