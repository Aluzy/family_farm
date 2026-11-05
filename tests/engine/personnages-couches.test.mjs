/* ==========================================================================
   Tests de assets/personnages/couches.json, de quoi assembler les planches de personnages dans le jeu
   (écrit par scripts/personnage/couches.py --exporter ; chantier « couches », étape E4 :
   docs/personnage-couches.md). Le fichier doit se suffire : chaque personnage du catalogue, ses
   éléments, son jeu de jambes, une pose et des couches communes pour chaque case, une couleur pour
   chaque lettre qu'il emploie.
   (L'assemblage lui-même est vérifié en Python : couches.py, lettre pour lettre contre chibi.py, pour
   les 100 personnages et 60 combinaisons nouvelles.)
   Lancer seul : node --test tests/engine/personnages-couches.test.mjs
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { assert, assertEqual, test } from './aide.mjs';

const lire = (f) => JSON.parse(readFileSync(new URL('../../' + f, import.meta.url), 'utf8'));
const C = lire('assets/personnages/couches.json');
const CAT = lire('assets/personnages/catalogue.json');
const CASES = lire('assets/personnages/cases.json').frames;
// « x,y,L;x,y,L… » → [[x, y, L]…]
const pixels = (t) => (t ? t.split(';').map((p) => { const [x, y, ...L] = p.split(','); return [+x, +y, L.join(',')]; }) : []);
const HEX = /^#[0-9a-f]{6}$/;

test('couches : la forme du fichier', () => {
  assertEqual(C.version, 1);
  assertEqual(C.case, { w: 16, h: 32 });
  assertEqual(C.cases, CASES);
  assertEqual(C.ordre, ['derriere', 'bras_loin', 'jambes', 'bras_sous', 'modele', 'bras_dessus', 'devant']);
  for (const age of ['adulte', 'enfant']) {
    assertEqual(Object.keys(C.poses[age]), CASES, `poses ${age}`);
    assertEqual(Object.keys(C.communes[age]), CASES, `communes ${age}`);
    assert(C.jambes[age].standard, `jambes ${age}`);
    for (const [n, p] of Object.entries(C.poses[age])) {
      assert(['bas', 'haut', 'cote'].includes(p.vue) && Number.isInteger(p.dy), `${age} ${n}`);
      assert([null, 'bras', 'marche'].includes(p.masque), `${age} ${n} : masque`);
      p.bras.forEach((ref, k) => {
        assert(['tete', 'torse'].includes(ref), `${age} ${n} : bras ${k}`);
        assert(C.communes[age][n][`bras_dessus:${k}`], `${age} ${n} : la couche du bras ${k}`);
      });
    }
  }
  for (const v of ['bas', 'haut', 'cote']) assert(C.zones[v].bras && C.zones[v].mains, `zones ${v}`);
  for (const c of Object.values(C.outils)) assert(HEX.test(c), c);
});

test('couches : chaque personnage du catalogue, ses éléments, ses jambes et toutes ses couleurs', () => {
  assertEqual(Object.keys(C.personnages), Object.keys(CAT.personnages));
  for (const [nom, p] of Object.entries(C.personnages)) {
    assertEqual(p.age, CAT.personnages[nom].age, nom);
    const pal = C.palettes[nom];
    assert(pal, `${nom} : palette`);
    for (const c of Object.values(pal)) assert(HEX.test(c), `${nom} : ${c}`);
    const lettres = new Set();
    const ajoute = (t) => pixels(t).forEach(([, , L]) => lettres.add(L));
    for (const e of p.elements) {
      assert(C.elements[e], `${nom} : élément ${e}`);
      assert(C.ordreModele.includes(e.split(':')[0]), `${nom} : couche de ${e}`);
      Object.values(C.elements[e]).forEach(ajoute);
    }
    assert(C.jambes[p.age][p.jambes], `${nom} : jambes ${p.jambes}`);
    Object.values(C.jambes[p.age][p.jambes]).forEach(ajoute);
    for (const par of Object.values(C.communes[p.age])) Object.values(par).forEach(ajoute);
    ajoute(C.yeuxFermes);
    const manque = [...lettres].filter((L) => !pal[L] && !C.outils[L]);
    assertEqual(manque, [], `${nom} : lettres sans couleur`);
    // (le couvre-chef qui masque le haut de la tête : celui qu'il porte ; un enfant : le nœud dessiné en fleur,
    // le serre-tête en bandeau, fermier.CHAPEAUX_ENFANT)
    if (p.chapeau !== null) assert(p.elements.includes(`couvre_chef:${p.chapeau}`), `${nom} : couvre-chef ${p.chapeau}`);
    // (un modèle retouché à la main : ses éléments portent son nom, son couvre-chef est déjà dessiné sur sa tête)
    const cc = p.elements.find((e) => e.startsWith('couvre_chef:'));
    if (cc && cc !== `couvre_chef:${nom}`) assertEqual(`couvre_chef:${p.chapeau}`, cc, `${nom} : couvre-chef`);
    if (!cc) assertEqual(p.chapeau, null, `${nom} : sans couvre-chef`);
  }
});
