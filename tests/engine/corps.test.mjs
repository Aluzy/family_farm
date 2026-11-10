/* ==========================================================================
   Tests du corps du personnage dirigé au doigt (fiche 30 : CarteKit.deplacer, js/carte/kit.js).
   - une boîte à ses pieds (CORPS.l px de chaque côté, CORPS.h px au-dessus), jamais sur une case fermée ;
   - contre un mur droit, il glisse ; dans un coin rentrant, il s'arrête ; un coin saillant de peu
     (CORPS.coin px au plus) le pousse de côté, il passe ; de plus, non ;
   - une porte d'une case prise de biais : il y passe sans rester accroché.
   Lancer seul : node tests/run-tests.mjs corps.
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { assert, assertEqual, test } from './aide.mjs';

const fenetre = { addEventListener() {}, matchMedia: () => ({ matches: false }), devicePixelRatio: 1, localStorage: null, navigator: {} };
new Function('window', readFileSync(new URL('../../js/carte/kit.js', import.meta.url), 'utf8'))(fenetre);
const K = fenetre.CarteKit, T = K.T, C = K.CORPS;

// Une petite carte : '#' une case fermée, '.' une libre ; hors de la carte : fermé.
function carte(lignes) {
  return (c, r) => r >= 0 && r < lignes.length && c >= 0 && c < lignes[0].length && lignes[r][c] !== '#';
}
// `n` pas de (dx, dy) depuis (x, y) ; le point d'arrivée.
function marche(libre, x, y, dx, dy, n) {
  let p = { x, y };
  for (let k = 0; k < n; k++) {
    const q = K.deplacer(p.x, p.y, dx, dy, libre);
    assert(q, `coincé au pas ${k} en ${p.x},${p.y}`);
    assert(K.corpsLibre(q.x, q.y, libre, C), `la boîte chevauche une case fermée en ${q.x},${q.y}`);
    p = q;
  }
  return p;
}

test('le corps : contre un mur droit, il s\'arrête au contact, sans y entrer', () => {
  const libre = carte(['.....', '.....', '..#..', '.....']);
  // il monte vers le mur (case 2,2) depuis la case 2,3 : ses pieds s'arrêtent au bas du mur + CORPS.h
  const p = marche(libre, 2 * T + 8, 3 * T + 12, 0, -1, 40);
  assert(Math.abs(p.y - (3 * T + C.h)) < 0.05, `au contact : ${p.y}`);
  assertEqual(p.x, 2 * T + 8);
});

test('le corps : en diagonale contre un mur, il glisse le long', () => {
  const libre = carte(['......', '######', '......', '......']);
  const p = marche(libre, 1 * T + 8, 3 * T + 8, 1, -1, 40);
  assert(p.x > 1 * T + 8 + 30, `il a glissé vers la droite : ${p.x}`);
  assert(Math.abs(p.y - (2 * T + C.h)) < 0.05, `le long du mur : ${p.y}`);
});

test('le corps : dans un coin rentrant, il s\'arrête', () => {
  const libre = carte(['####', '#...', '#...']);
  const p = marche(libre, 2 * T + 8, 2 * T + 8, -1, -1, 60);
  assert(Math.abs(p.x - (T + C.l)) < 0.05 && Math.abs(p.y - (T + C.h)) < 0.05, `dans le coin : ${p.x},${p.y}`);
});

test('le corps : un coin saillant de peu le pousse de côté, de beaucoup non', () => {
  // un pilier en (2, 1) ; il monte le long de sa gauche, sa boîte dépassant de 2 px sur le pilier
  const libre = carte(['.....', '..#..', '.....', '.....']);
  const dep = 2 * T - C.l + 2;   // bord droit de sa boîte : 2 px dans la colonne du pilier
  const p = marche(libre, dep, 3 * T + 8, 0, -1, 60);
  assert(p.y < 1 * T, `il est passé le pilier : ${p.y}`);
  assert(p.x <= 2 * T - C.l + 0.001, `poussé à gauche : ${p.x}`);
  // à 6 px (au-delà de CORPS.coin), il bute
  const q = marche(libre, 2 * T - C.l + 6, 3 * T + 8, 0, -1, 60);
  assert(Math.abs(q.y - (2 * T + C.h)) < 0.05, `il bute sous le pilier : ${q.y}`);
});

test('le corps : une porte d\'une case prise de biais, il y passe', () => {
  // un mur percé d'une porte en colonne 3
  const libre = carte(['.......', '.......', '###.###', '.......', '.......']);
  const p = marche(libre, 1 * T + 8, 4 * T + 8, 0.45, -0.9, 120);
  assert(p.y < 2 * T, `passé la porte : ${p.x},${p.y}`);
});

test('le corps : déjà coincé, deplacer le dit (null) : l\'appelant l\'en sort', () => {
  const libre = carte(['...', '.#.', '...']);
  assertEqual(K.deplacer(T + 8, T + 8, 1, 0, libre), null);
  assertEqual([C.l, C.h, C.coin, C.accel, C.arret], [6, 5, 5, 0.2, 0.15]);
});
