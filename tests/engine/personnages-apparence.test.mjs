/* ==========================================================================
   Tests d'une apparence libre (js/carte/planches.js : CartePlanches.apparence, CartePlanches.visages ;
   chantier « couches », étape E6 : docs/personnage-couches.md) : d'une identité et d'une tenue, le jeu tire
   les éléments, la palette et les tuiles de visage du personnage, comme scripts/personnage/modeles.py et
   expressions.py :
   - les 97 personnages du catalogue tirés de leurs données (pas les 3 retouchés à la main) : leurs éléments
     et leur palette sont ceux de couches.json, leurs tuiles de visage celles de visages.png ;
   - 12 apparences tirées au hasard (tests/engine/apparences.json et .png, couches.py --apparences).
   Lancer seul : node --test tests/engine/personnages-apparence.test.mjs
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { assert, assertEqual, test } from './aide.mjs';
import { lirePng } from './png.mjs';

const lire = (f) => JSON.parse(readFileSync(new URL('../../' + f, import.meta.url), 'utf8'));
const fenetre = {};
new Function('window', readFileSync(new URL('../../js/carte/planches.js', import.meta.url), 'utf8'))(fenetre);
const CP = fenetre.CartePlanches;
const C = lire('assets/personnages/couches.json');
const K = lire('assets/personnages/catalogue.json');
const V = lire('assets/personnages/visages.json');
const RETOUCHES = ['perso_01', 'perso_02', 'perso_03'];

// Les tuiles (une rangée) contre la rangée `r` d'un atlas PNG : les écarts.
function ecartsTuiles(t, atlas, r) {
  const out = [];
  for (let y = 0; y < t.hauteur; y++) {
    for (let x = 0; x < t.largeur; x++) {
      const a = atlas.px(x, r * t.hauteur + y), i = (y * t.largeur + x) * 4;
      const b = [t.data[i], t.data[i + 1], t.data[i + 2], t.data[i + 3]];
      if (!(a[3] === 0 && b[3] === 0) && a.join() !== b.join()) out.push(`(${x}, ${y})`);
    }
  }
  return out;
}

test('apparence : les 97 personnages tirés du catalogue (éléments, palette, visages)', () => {
  const atlas = lirePng('assets/personnages/visages.png');
  let n = 0;
  for (const [nom, p] of Object.entries(K.personnages)) {
    if (RETOUCHES.includes(nom)) continue;
    const A = CP.apparence(C, K, p.age, p.identite, p.tenue);
    assertEqual(A.def.elements, C.personnages[nom].elements, `${nom} : éléments`);
    assertEqual(A.def.chapeau, C.personnages[nom].chapeau, `${nom} : couvre-chef`);
    const ref = C.palettes[nom];
    const faux = Object.keys(ref).filter((L) => A.palette[L] !== ref[L]).map((L) => `${L} ${A.palette[L]} ≠ ${ref[L]}`);
    assertEqual(faux, [], `${nom} : palette`);
    const t = CP.visages(C, A, CP.assembler(C, A.def, A.palette));
    assertEqual(ecartsTuiles(t, atlas, V.personnages.indexOf(nom)).slice(0, 4), [], `${nom} : visages`);
    n++;
  }
  assertEqual(n, 97);
});

test('apparence : 12 apparences tirées au hasard, comme Python les dessine', () => {
  const F = lire('tests/engine/apparences.json').apparences;
  const atlas = lirePng('tests/engine/apparences.png');
  assert(F.length === 12 && F.some((a) => a.age === 'enfant'), 'des adultes et des enfants');
  F.forEach((f, r) => {
    const A = CP.apparence(C, K, f.age, f.identite, f.tenue);
    assertEqual(A.def, f.def, `apparence ${r} : éléments`);
    const faux = Object.keys(f.palette).filter((L) => A.palette[L] !== f.palette[L]).map((L) => `${L} ${A.palette[L]} ≠ ${f.palette[L]}`);
    assertEqual(faux, [], `apparence ${r} : palette`);
    const t = CP.visages(C, A, CP.assembler(C, A.def, A.palette));
    assertEqual(ecartsTuiles(t, atlas, r).slice(0, 4), [], `apparence ${r} : visages`);
  });
});
