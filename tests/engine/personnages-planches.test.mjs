/* ==========================================================================
   Tests de l'assembleur de planches du jeu (js/carte/planches.js ; chantier « couches », étape E5 :
   docs/personnage-couches.md) : chaque planche assemblée depuis assets/personnages/couches.json est
   identique, au pixel près, à la planche PNG du personnage (assets/personnages/<nom>.png), pour les
   100 personnages (et la planche par défaut, assets/fermiere.png, celle de perso_01).
   Lancer seul : node --test tests/engine/personnages-planches.test.mjs
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { assert, assertEqual, test } from './aide.mjs';
import { lirePng } from './png.mjs';

const fenetre = {};
new Function('window', readFileSync(new URL('../../js/carte/planches.js', import.meta.url), 'utf8'))(fenetre);
const CP = fenetre.CartePlanches;
const C = JSON.parse(readFileSync(new URL('../../assets/personnages/couches.json', import.meta.url), 'utf8'));

function compare(p, png, nom) {
  assertEqual([p.largeur, p.hauteur], [png.w, png.h], `${nom} : taille`);
  const ecarts = [];
  for (let y = 0; y < png.h; y++) {
    for (let x = 0; x < png.w; x++) {
      const a = png.px(x, y), i = (y * p.largeur + x) * 4;
      const b = [p.data[i], p.data[i + 1], p.data[i + 2], p.data[i + 3]];
      // (un pixel transparent : seule sa transparence compte)
      if (a[3] === 0 && b[3] === 0) continue;
      if (a.join() !== b.join()) ecarts.push(`(${x}, ${y}) case ${C.cases[Math.floor(y / 32) * 8 + Math.floor(x / 16)]}`);
    }
  }
  assertEqual(ecarts.slice(0, 5), [], `${nom} : ${ecarts.length} pixels différents`);
}

test('planches assemblées : identiques au pixel près aux 100 planches PNG', () => {
  const t0 = performance.now();
  for (const nom of Object.keys(C.personnages)) compare(CP.planche(C, nom), lirePng(`assets/personnages/${nom}.png`), nom);
  compare(CP.planche(C, 'perso_01'), lirePng('assets/fermiere.png'), 'fermiere');
  const ms = (performance.now() - t0) / 101;
  assert(ms < 200, `${ms.toFixed(1)} ms par planche (lecture du PNG comprise)`);
});

test('planches assemblées : une combinaison hors du catalogue (une identité, la tenue d\'un autre)', () => {
  // tests/engine/combinaison.png : la planche que chibi.py dessine pour l'identité de perso_12 (sa peau, ses yeux, sa
  // coupe, sa barbe) et la tenue de perso_40 (son haut à carreaux, son chapeau de paille) ; combinaison.json : ses
  // éléments et sa palette (scripts/personnage/couches.py --fixture)
  const F = JSON.parse(readFileSync(new URL('./combinaison.json', import.meta.url), 'utf8'));
  for (const e of F.def.elements) assert(C.elements[e], `élément ${e}`);
  compare(CP.assembler(C, F.def, F.palette), lirePng('tests/engine/combinaison.png'), 'combinaison');
});

test('planches assemblées : le nom d\'un personnage d\'après la clé de sa planche', () => {
  assertEqual(['perso_7', 'enfant_12', 'perso_07', 'fermier', 'mouton'].map(CP.nomPlanche), ['perso_07', 'enfant_12', 'perso_07', null, null]);
});

test('planches assemblées : coiffé de son équipement (le casque-lampe, le chapeau de paille ; un retouché aussi)', () => {
  // tests/engine/coiffes.png : les planches de scripts/personnage/couches.py --coiffes, l'une sous l'autre (14 rangées de cases)
  const F = JSON.parse(readFileSync(new URL('./coiffes.json', import.meta.url), 'utf8'));
  const K = JSON.parse(readFileSync(new URL('../../assets/personnages/catalogue.json', import.meta.url), 'utf8'));
  const png = lirePng('tests/engine/coiffes.png');
  F.cas.forEach(({ nom, coiffe }, r) => {
    const m = /^(perso|enfant)_(\d+)$/.exec(nom);
    const D = CP.defMembre(C, K, { perso: +m[2], enfant: m[1] === 'enfant', apparence: null, coiffe });
    const p = CP.assembler(C, D.def, D.palette);
    const tranche = { w: png.w, h: 448, px: (x, y) => png.px(x, r * 448 + y) };
    compare(p, tranche, `${nom} + ${coiffe}`);
  });
});

test('planches assemblées : quelques cases seulement (les vignettes de l\'écran « Personnaliser »)', () => {
  for (const nom of ['perso_05', 'enfant_12']) {
    const def = C.personnages[nom], pal = C.palettes[nom], P = CP.assembler(C, def, pal);
    const noms = ['idle_bas_0', 'dort_bas_0'], p = CP.assembler(C, def, pal, noms);
    assertEqual([p.largeur, p.hauteur], [32, 32], `${nom} : deux cases côte à côte`);
    noms.forEach((cas, j) => {
      const k = C.cases.indexOf(cas), x0 = (k % 8) * 16, y0 = Math.floor(k / 8) * 32;
      const tranche = { w: 16, h: 32, px: (x, y) => { const i = (y * p.largeur + j * 16 + x) * 4; return [p.data[i], p.data[i + 1], p.data[i + 2], p.data[i + 3]]; } };
      compare({ largeur: 16, hauteur: 32, data: P.data.filter((_, i) => { const q = i >> 2, x = q % P.largeur, y = Math.floor(q / P.largeur); return x >= x0 && x < x0 + 16 && y >= y0 && y < y0 + 32; }) }, tranche, `${nom} ${cas}`);
    });
  }
});
