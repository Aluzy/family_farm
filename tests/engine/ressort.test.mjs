/* ==========================================================================
   Tests : le ressort des bêtes (CarteKit.ressort, js/carte/ressort.js).
   - au repos, l'image garde sa taille, et rien n'est refait d'une image à l'autre ;
   - une impulsion écrase (ou étire) puis la bête revient à sa taille en oscillant, en moins d'une
     demi-seconde ;
   - le volume reste le même (scaleX × scaleY = échelle²), les bornes tiennent quoi qu'on pousse ;
   - calme() (animations réduites) et ampleur 0 : la taille de repos, tout de suite.
   Lancer seul : node --test tests/engine/ressort.test.mjs (ou node tests/run-tests.mjs ressort).
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { assert, assertEqual, test } from './aide.mjs';

const KIT = readFileSync(new URL('../../js/carte/kit.js', import.meta.url), 'utf8');
const RESSORT = readFileSync(new URL('../../js/carte/ressort.js', import.meta.url), 'utf8');

// Le kit et le ressort chargés dans une fenêtre d'essai.
function kit() {
  const fenetre = { devicePixelRatio: 1, navigator: {}, matchMedia: () => ({ matches: false }), localStorage: { getItem: () => null, setItem() {} } };
  new Function('window', KIT)(fenetre);
  new Function('window', RESSORT)(fenetre);
  return fenetre.CarteKit;
}

// Une image d'essai : elle compte ses setScale.
function image() {
  return {
    scaleX: 1, scaleY: 1, poses: 0,
    setScale(x, y) { this.scaleX = x; this.scaleY = y === undefined ? x : y; this.poses++; return this; },
  };
}

// Fait avancer le ressort de `s` secondes à 60 images par seconde ; rend les valeurs prises.
function avance(r, img, s, tenu = 0, base = 1) {
  const vues = [];
  for (let i = 0; i < Math.round(s * 60); i++) { r.maj(1 / 60, tenu).applique(img, base); vues.push(r.valeur()); }
  return vues;
}

test('le ressort : au repos, la bête garde sa taille, posée une seule fois', () => {
  const K = kit(), r = K.ressort(), img = image();
  avance(r, img, 1);
  assertEqual(r.valeur(), 0);
  assertEqual(img.scaleX, 1);
  assertEqual(img.scaleY, 1);
  assertEqual(img.poses, 1, 'rien n\'est refait tant qu\'elle est au repos');
});

test('le ressort : un pas l\'écrase un peu, puis elle revient à sa taille en oscillant', () => {
  const K = kit(), r = K.ressort(), img = image();
  r.pousse(K.RESSORT.COUPS.pas);
  const vues = avance(r, img, 0.6);
  const bas = Math.min(...vues), haut = Math.max(...vues);
  assert(bas < -0.04 && bas > -0.12, `écrasée de 4 à 12 % (${bas.toFixed(3)})`);
  assert(haut > 0, 'elle repasse un peu au-delà de sa taille (l\'oscillation)');
  assertEqual(r.valeur(), 0, 'au repos après une demi-seconde');
  assertEqual(img.scaleY, 1);
});

test('le ressort : écrasée, elle s\'élargit d\'autant (le volume reste le même)', () => {
  const K = kit(), r = K.ressort(), img = image();
  r.pousse(K.RESSORT.COUPS.atterrit);
  for (let i = 0; i < 20; i++) {
    r.maj(1 / 60).applique(img, 1.5);
    assert(Math.abs(img.scaleX * img.scaleY - 2.25) < 1e-9, `scaleX × scaleY = 1,5² (image ${i})`);
  }
});

test('le ressort : les bornes tiennent, quoi qu\'on pousse ou qu\'on tienne', () => {
  const K = kit(), { min, max } = K.RESSORT;
  for (const coup of [-500, -40, 40, 500]) {
    const r = K.ressort();
    r.pousse(coup);
    for (const v of avance(r, image(), 0.5)) assert(v >= min - 1e-9 && v <= max + 1e-9, `${coup} : ${v} dans [${min}, ${max}]`);
  }
  const r = K.ressort();
  assertEqual(r.maj(1 / 60, 5).valeur(), max, 'une pose tenue trop forte est bornée');
  assertEqual(r.maj(1 / 60, -5).valeur(), min);
});

test('le ressort : une pose tenue s\'ajoute tant qu\'elle dure, puis s\'en va', () => {
  const K = kit(), r = K.ressort(), img = image();
  avance(r, img, 0.2, K.RESSORT.TENU.vise);
  assertEqual(r.valeur(), K.RESSORT.TENU.vise, 'ramassée');
  avance(r, img, 0.1, 0);
  assertEqual(r.valeur(), 0, 'la pose finie, sa taille');
});

test('le ressort : calme() et ampleur 0 rendent tout de suite la taille de repos', () => {
  const K = kit(), r = K.ressort(), img = image();
  r.pousse(K.RESSORT.COUPS.elan).maj(1 / 60).applique(img);
  assert(img.scaleY > 1, 'étirée');
  r.calme(img, 2);
  assertEqual(r.valeur(), 0);
  assertEqual(img.scaleX, 2);
  assertEqual(img.scaleY, 2);
  K.RESSORT.ampleur = 0;
  const q = K.ressort(), img2 = image();
  q.pousse(K.RESSORT.COUPS.atterrit);
  for (const v of avance(q, img2, 0.3)) assertEqual(v, 0);
  assertEqual(img2.scaleY, 1);
});

test('le ressort : à 10 images par seconde (un téléphone qui peine), il s\'amortit comme à 60', () => {
  const K = kit();
  for (const coup of [K.RESSORT.COUPS.pas, K.RESSORT.COUPS.elan, K.RESSORT.COUPS.atterrit]) {
    const vite = K.ressort().pousse(coup), lent = K.ressort().pousse(coup);
    const a = avance(vite, image(), 0.8).map(Math.abs);
    const b = [];
    for (let i = 0; i < 8; i++) b.push(Math.abs(lent.maj(0.1).valeur()));
    assert(Math.max(...b) <= Math.max(...a) + 1e-9, `${coup} : pas plus fort à 10 images par seconde`);
    assertEqual(lent.valeur(), 0, `${coup} : au repos après 0,8 s`);
  }
  // une image très en retard (2 s) ne compte que pour 0,1 s
  const r = K.ressort().pousse(K.RESSORT.COUPS.atterrit);
  assert(r.maj(2).valeur() !== 0, 'encore en mouvement après une seule image en retard');
});
