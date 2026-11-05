/* ==========================================================================
   Tests de l'atlas des visages (assets/personnages/visages.png et visages.json, écrits par
   scripts/personnage/expressions.py ; chantier « couches », étape E2 : docs/personnage-couches.md).
   - l'atlas couvre les 100 personnages du catalogue, 9 expressions, 2 vues ;
   - non-régression : sur chaque case où le visage est dégagé, la tuile de l'atlas posée à sa place
     redonne exactement la planche (le visage neutre, ou les yeux fermés du sommeil) ;
   - une expression ne change pas la silhouette (mêmes pixels transparents que le visage neutre) et
     change bien le visage de chacun.
   Lancer seul : node --test tests/engine/personnages-visages.test.mjs
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { assert, assertEqual, test } from './aide.mjs';
import { lirePng } from './png.mjs';

const lire = (f) => JSON.parse(readFileSync(new URL('../../' + f, import.meta.url), 'utf8'));
const V = lire('assets/personnages/visages.json');
const CAT = lire('assets/personnages/catalogue.json');
const CASES = lire('assets/personnages/cases.json').frames;
const ATLAS = lirePng('assets/personnages/visages.png');
const { w: TW, h: TH } = V.tuile;

// La tuile (expression, vue) du personnage de rang r, ou la zone (x, y) de la case k d'une planche : [[r, g, b, a], …]
const tuileAtlas = (r, expr, vue) => {
  const col = V.expressions.indexOf(expr) * V.vues.length + V.vues.indexOf(vue);
  const out = [];
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) out.push(ATLAS.px(col * TW + i, r * TH + j));
  return out;
};
const zoneCase = (planche, k, x, y) => {
  const cx = (k % 8) * 16, cy = Math.floor(k / 8) * 32, out = [];
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) out.push(planche.px(cx + x + i, cy + y + j));
  return out;
};
const egales = (a, b) => a.every((p, i) => p.join() === b[i].join());

test('visages : l\'atlas couvre le catalogue, 9 expressions, 2 vues', () => {
  assertEqual(V.version, 1);
  assertEqual(V.expressions, ['neutre', 'fermes', 'joie', 'rire', 'colere', 'tristesse', 'peur', 'fatigue', 'concentre']);
  assertEqual(V.vues, ['bas', 'cote']);
  assertEqual(V.personnages, Object.keys(CAT.personnages));
  assertEqual([ATLAS.w, ATLAS.h], [V.expressions.length * V.vues.length * TW, V.personnages.length * TH]);
  for (const age of ['adulte', 'enfant']) {
    assertEqual(Object.keys(V.cases[age]), CASES, `les cases (${age})`);
    for (const [nom, c] of Object.entries(V.cases[age])) {
      if (!c) continue;
      assert(V.vues.includes(c.vue) && V.expressions.includes(c.expr), `${age} ${nom}`);
      assert(c.x >= 0 && c.x + TW <= 16 && c.y >= 0 && c.y + TH <= 32, `${age} ${nom} : la zone dans la case`);
      assert(!nom.includes('_haut_'), `${age} ${nom} : de dos, pas de visage`);
    }
  }
  // (au moins la marche et la pose debout, de face et de profil)
  for (const n of ['idle_bas_0', 'idle_bas_1', 'idle_cote_0', 'marche_bas_0', 'marche_bas_1', 'marche_bas_2', 'marche_bas_3', 'marche_cote_0', 'marche_cote_1', 'marche_cote_2', 'marche_cote_3']) {
    for (const age of ['adulte', 'enfant']) assert(V.cases[age][n], `${age} ${n} : visage dégagé`);
  }
});

test('visages : la tuile posée sur chaque case au visage dégagé redonne exactement la planche', () => {
  let n = 0;
  V.personnages.forEach((nom, r) => {
    const planche = lirePng(`assets/personnages/${nom}.png`);
    const table = V.cases[CAT.personnages[nom].age];
    CASES.forEach((cas, k) => {
      const c = table[cas];
      if (!c) return;
      assert(egales(zoneCase(planche, k, c.x, c.y), tuileAtlas(r, c.expr, c.vue)), `${nom} ${cas} : la tuile ${c.expr} (${c.vue}) ne redonne pas la planche`);
      n++;
    });
  });
  assert(n >= 40 * V.personnages.length, `${n} cases vérifiées seulement`);
});

test('visages : une expression garde la silhouette et change le visage de chacun', () => {
  V.personnages.forEach((nom, r) => {
    for (const vue of V.vues) {
      const neutre = tuileAtlas(r, 'neutre', vue);
      for (const e of V.expressions.slice(1)) {
        const t = tuileAtlas(r, e, vue);
        assert(t.every((p, i) => (p[3] === 0) === (neutre[i][3] === 0)), `${nom} ${e} (${vue}) : la silhouette change`);
        assert(!egales(t, neutre), `${nom} ${e} (${vue}) : rien ne change`);
      }
    }
  });
});

// Le choix de l'expression sur la carte (js/carte/visages.js, script classique chargé avec une fenêtre factice).
const fenetre = { CarteKit: { reduit: () => fenetre.reduit }, reduit: false };
new Function('window', readFileSync(new URL('../../js/carte/visages.js', import.meta.url), 'utf8'))(fenetre);
const CV = fenetre.CarteVisages;

test('visages sur la carte : le nom du personnage d\'une planche', () => {
  assertEqual(['perso_7', 'perso_07', 'enfant_12~joie', 'perso_3~colere', 'fermier', 'mouton', ''].map(CV.nom),
    ['perso_07', 'perso_07', 'enfant_12', 'perso_03', 'perso_01', null, null]);
  for (const n of V.personnages) assertEqual(CV.nom(n.replace(/_0(\d)$/, '_$1')), n);
});

test('visages sur la carte : l\'expression (réaction, travail, soir, clignement)', () => {
  const e = (cas, heure, o, natif = 'neutre') => CV.expression(cas, natif, heure, o, null, 0);
  assertEqual(e('dort_bas_0', 12, { reaction: 'joie' }, 'fermes'), 'fermes', 'la case montre déjà la sienne');
  assertEqual(e('idle_bas_0', 12), 'neutre');
  assertEqual(e('marche_cote_2', 12), 'neutre');
  for (const cas of ['houe_cote_3', 'hache_cote_3', 'pioche_cote_3', 'peche_bas_0', 'plante_bas_1', 'arrose_cote_2', 'jette_bas_0']) assertEqual(e(cas, 12), 'concentre', cas);
  assertEqual([18.75, 19, 23, 0, 5.75, 6].map((h) => e('idle_bas_0', h)), ['neutre', 'fatigue', 'fatigue', 'fatigue', 'fatigue', 'neutre'], 'le soir');
  assertEqual(e('houe_bas_0', 21), 'concentre', 'au travail le soir : concentré');
  assertEqual(e('idle_bas_0', null), 'neutre', 'sans heure');
  assertEqual(['joie', 'colere', 'peur', 'tristesse', 'degout'].map((r) => e('idle_bas_0', 21, { reaction: r })), ['joie', 'colere', 'peur', 'tristesse', 'concentre']);
  assertEqual(e('idle_bas_0', 12, { reaction: 'joie', fort: true }), 'rire', 'un cadeau : il rit');
  for (const x of new Set([...Object.values(CV.REACTIONS), 'rire', 'fatigue', 'concentre', 'fermes', 'neutre'])) assert(V.expressions.includes(x), x);
  // le clignement : de temps en temps, CLIGNE_MS ; jamais avec « réduire les animations »
  const etat = { prochain: 1000 };
  assertEqual(CV.expression('idle_bas_0', 'neutre', 12, null, etat, 999), 'neutre');
  assertEqual(CV.expression('idle_bas_0', 'neutre', 12, null, etat, 1000), 'fermes');
  assertEqual(CV.expression('idle_bas_0', 'neutre', 21, null, etat, 1100), 'fermes');
  assertEqual(CV.expression('idle_bas_0', 'neutre', 21, null, etat, 1200), 'fatigue');
  assert(etat.prochain >= 1000 + 2000, 'le prochain clignement, plus tard');
  fenetre.reduit = true;
  assertEqual(CV.expression('idle_bas_0', 'neutre', 12, null, { prochain: 1 }, 5000), 'neutre', 'animations réduites');
  fenetre.reduit = false;
});
