/* ==========================================================================
   Tests : l'herbe qui penche au passage (CarteKit.herbes, js/carte/nature.js).
   - une touffe penche quand quelqu'un y entre en marchant (n'importe lequel de ceux qui marchent :
     carte/ferme/marcheurs.js), dans le sens de sa marche, puis revient droite ;
   - quelqu'un qui reste dedans sans bouger, ou qui passe à côté : elle ne bouge pas ;
   - animations réduites : elle ne bouge pas.
   Lancer seul : node tests/run-tests.mjs herbes.
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { assert, assertEqual, test } from './aide.mjs';

const KIT = readFileSync(new URL('../../js/carte/kit.js', import.meta.url), 'utf8');
const NATURE = readFileSync(new URL('../../js/carte/nature.js', import.meta.url), 'utf8');

function kit(reduit = false) {
  const fenetre = { devicePixelRatio: 1, navigator: {}, matchMedia: () => ({ matches: reduit }), localStorage: { getItem: () => null, setItem() {} } };
  new Function('window', KIT)(fenetre);
  new Function('window', NATURE)(fenetre);
  if (reduit) fenetre.CarteKit.reduit = () => true;
  return fenetre.CarteKit;
}

// Une touffe d'essai, son pied en (100, 100), ses images 10 à 14 ; elle note les images posées.
function touffe() {
  const img = { visible: true, vues: [], setFrame(f) { this.vues.push(f); return this; } };
  return { img, fleurs: null, x: 100, y: 100, base: 10, t: -1, dir: 1, inside: false };
}

const marche = (x, dx) => ({ x, y: 100, dx, bouge: dx !== 0 });

test('un habitant qui entre en marchant vers la droite : la touffe penche à droite, puis revient', () => {
  const K = kit(), g = touffe();
  K.herbes([g], [marche(300, 1), marche(95, 1)], 16);
  for (let i = 0; i < 40; i++) K.herbes([g], [marche(300, 0)], 16);
  assert(g.img.vues.includes(12), 'penchée à droite (image 12) : ' + g.img.vues.join(','));
  assert(!g.img.vues.includes(14), 'jamais à gauche plus fort');
  assertEqual(g.img.vues[g.img.vues.length - 1], 10, 'revenue droite');
  assertEqual(g.t, -1);
});

test('une bête qui y entre vers la gauche : la touffe penche à gauche', () => {
  const K = kit(), g = touffe();
  K.herbes([g], [marche(104, -1)], 16);
  for (let i = 0; i < 40; i++) K.herbes([g], [], 16);
  assert(g.img.vues.includes(14), 'penchée à gauche (image 14) : ' + g.img.vues.join(','));
});

test('immobile dedans, ou qui passe à côté : rien ne bouge', () => {
  const K = kit(), g = touffe();
  for (let i = 0; i < 10; i++) K.herbes([g], [marche(100, 0), marche(130, 1)], 16);
  assertEqual(g.img.vues.length, 0);
});

test('animations réduites : rien ne bouge', () => {
  const K = kit(true), g = touffe();
  for (let i = 0; i < 10; i++) K.herbes([g], [marche(100, 1)], 16);
  assertEqual(g.img.vues.length, 0);
});
