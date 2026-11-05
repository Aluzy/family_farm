/* ==========================================================================
   Tests du catalogue des personnages (assets/personnages/catalogue.json, chantier « couches » :
   docs/personnage-couches.md) : sa forme, ses références aux palettes, et l'accord avec le jeu
   (un modèle prêt par planche, autant que DATA.FAMILLE.PROFIL en propose).
   Lancer seul : node --test tests/engine/personnages-catalogue.test.mjs
   ========================================================================== */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, assertEqual, test } from './aide.mjs';
import { DATA } from '../../js/engine/index.js';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CAT = JSON.parse(readFileSync(join(RACINE, 'assets/personnages/catalogue.json'), 'utf8'));
const P = CAT.palettes;
const PERSOS = Object.entries(CAT.personnages);
const HEX = /^#[0-9a-f]{6}$/;

const COUPES = {
  adulte: ['longs', 'mi', 'carre', 'courts', 'frange', 'frange_carre', 'couettes', 'chignon', 'chauve'],
  enfant: ['court', 'frange', 'meche', 'herisse', 'boucles', 'long', 'queue', 'couettes', 'chignon'],
};
const COUVRE_CHEFS = {
  adulte: [null, 'paille', 'casquette', 'bonnet', 'beret', 'bandeau', 'fleur'],
  enfant: [null, 'casquette', 'bonnet', 'paille', 'noeud', 'serre_tete', 'fleur'],
};

test('catalogue des personnages : version et palettes bien formées', () => {
  assertEqual(CAT.version, 1);
  const tons = { peau: ['clair', 'teinte', 'ombre', 'joues'], yeux: ['pupille', 'reflet'], cheveux: ['teinte', 'ombre', 'sombre'], tissus: ['sombre', 'teinte', 'clair'], bas: ['teinte', 'ombre'] };
  for (const [famille, cles] of Object.entries(tons)) {
    assert(Object.keys(P[famille]).length > 0, `palettes.${famille} vide`);
    for (const [nom, pal] of Object.entries(P[famille])) {
      assertEqual(Object.keys(pal), cles, `palettes.${famille}.${nom} : tons`);
      for (const c of Object.values(pal)) assert(HEX.test(c), `palettes.${famille}.${nom} : couleur ${c}`);
    }
  }
  for (const [nom, c] of Object.entries(P.accessoires)) assert(HEX.test(c), `palettes.accessoires.${nom} : couleur ${c}`);
});

test('catalogue des personnages : chaque identité et chaque tenue renvoient à des palettes et des formes connues', () => {
  for (const [nom, p] of PERSOS) {
    const { identite: i, tenue: t } = p;
    assert(p.age === 'adulte' || p.age === 'enfant', `${nom} : âge ${p.age}`);
    assert(P.peau[i.peau], `${nom} : peau ${i.peau}`);
    assert(P.yeux[i.yeux], `${nom} : yeux ${i.yeux}`);
    assert(P.cheveux[i.cheveux], `${nom} : cheveux ${i.cheveux}`);
    assert(COUPES[p.age].includes(i.coupe), `${nom} : coupe ${i.coupe}`);
    assert([null, 'barbe', 'moustache'].includes(i.pilosite), `${nom} : pilosité ${i.pilosite}`);
    for (const s of i.signes) assert(['rousseur', 'joues'].includes(s), `${nom} : signe ${s}`);
    assert(P.tissus[t.haut.tissu], `${nom} : haut ${t.haut.tissu}`);
    assert([null, 'rayures', 'carreaux', 'pois'].includes(t.haut.motif), `${nom} : motif ${t.haut.motif}`);
    assert(P.bas[t.bas.tissu], `${nom} : bas ${t.bas.tissu}`);
    assert(COUVRE_CHEFS[p.age].includes(t.couvre_chef), `${nom} : couvre-chef ${t.couvre_chef}`);
    assert(P.accessoires[t.accessoire], `${nom} : accessoire ${t.accessoire}`);
    for (const a of t.accessoires) assert(['lunettes', 'boucles', 'pansement'].includes(a), `${nom} : accessoire ${a}`);
    if (p.age === 'enfant') assert(i.signes.includes('joues'), `${nom} : un enfant a les joues roses`);
  }
});

test('catalogue des personnages : un modèle prêt par planche, autant que le jeu en propose', () => {
  const nombre = { adulte: DATA.FAMILLE.PROFIL.PERSOS, enfant: DATA.FAMILLE.PROFIL.PERSOS_ENFANT };
  for (const age of ['adulte', 'enfant']) {
    const noms = PERSOS.filter(([, p]) => p.age === age).map(([n]) => n);
    const attendus = Array.from({ length: nombre[age] }, (_, k) => `${age === 'adulte' ? 'perso' : 'enfant'}_${String(k + 1).padStart(2, '0')}`);
    assertEqual(noms, attendus, `les ${age}s du catalogue`);
    for (const n of noms) assert(existsSync(join(RACINE, 'assets/personnages', n + '.png')), `planche manquante : ${n}.png`);
  }
});
