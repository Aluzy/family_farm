/* ==========================================================================
   Tests du moteur : l'économie des voisins de la carte de transition (js/engine/voisins.js).
   Lancer seul : node --test tests/engine/voisins.test.mjs (ou node tests/run-tests.mjs voisins).
   ========================================================================== */

import { arbresDebout, createNewGame, DATA, livraison, runNight, TRANSITION, transitionPlan, transitionSeed, treeGone, voisinAbat, voisinFoyer, voisinQuota, voisinsFoyers, voisinsVue } from '../../js/engine/index.js';
import { assert, assertEqual, test } from './aide.mjs';

const GRAINES = ['1', '2', '77', 'abc', 'b3', 'x9', '42', 'zz', 'ferme', '123456789'];

// Une partie dont les voisins sont nés (2 adultes et 2 enfants par maison).
function partie(graine = 4242) {
  const s = createNewGame(graine);
  const P = transitionPlan(transitionSeed(s));
  for (const m of P.maisons) voisinFoyer(s, m.nom, { adultes: 2, enfants: 2 });
  return { s, P };
}

test('voisins : chaque maison a un métier (les deux sont là), l\'agriculteur un champ, chacune de quoi cuisiner', () => {
  for (const g of GRAINES) {
    const P = transitionPlan(g);
    assertEqual(new Set(P.maisons.map((m) => m.metier)).size, 2, `${g} : bûcherons et agriculteurs`);
    for (const m of P.maisons) {
      assert(TRANSITION.METIERS.includes(m.metier), m.metier);
      assert(m.plan.some((l) => /[cf]/.test(l)), `${g} ${m.nom} : une cuisinière ou un four`);
      if (m.metier !== 'agriculteur') { assert(!m.champ, `${g} ${m.nom} : pas de champ`); continue; }
      const c = m.champ;
      assert(c && c.w >= 3 && c.h >= 1, `${g} ${m.nom} : un champ`);
      assert(c.x >= 0 && c.x + c.w <= TRANSITION.OUEST && c.y >= 1 && c.y + c.h <= TRANSITION.HAUTEUR - 1, `${g} ${m.nom} : le champ à l'ouest`);
      for (const o of P.maisons) assert(c.x + c.w <= o.x || o.x + o.w <= c.x || c.y + c.h <= o.y || o.y + o.h <= c.y, `${g} : le champ ne touche pas ${o.nom}`);
    }
  }
});

test('voisins : un foyer naît à la première visite, avec sa famille, son argent et son champ déjà planté', () => {
  const { s, P } = partie();
  assertEqual(voisinFoyer(s, 'maison_99'), null);
  const champ = P.maisons.find((m) => m.metier === 'agriculteur');
  const f = voisinFoyer(s, champ.nom, { adultes: 2, enfants: 3 });
  assertEqual([f.metier, f.adultes, f.enfants, f.argent], ['agriculteur', 2, Math.min(3, champ.lits - 2), DATA.VOISINS.ARGENT], 'un lit chacun');
  assertEqual(f.champ.length, champ.champ.w * champ.champ.h);
  assert(f.champ.every((p) => p.pret > s.day - 1), 'tout est planté');
  assertEqual(Object.keys(voisinsFoyers(s)).length, P.maisons.length);
  // (un lit chacun : une famille trop grande pour la maison n'y entre pas toute)
  const petite = P.maisons.find((m) => m.lits === Math.min(...P.maisons.map((q) => q.lits)));
  const g = voisinFoyer(s, petite.nom, { adultes: 2, enfants: 9 });
  assertEqual(g.adultes + g.enfants, petite.lits, 'autant de membres que de lits');
  assertEqual(voisinsVue(s)[petite.nom].lits, petite.lits);
  assert(voisinFoyer(s, champ.nom) === f, 'le même foyer ensuite');
});

test('voisins : un mois de journées, les deux métiers vivent de leur travail et mangent à leur faim', () => {
  const { s } = partie();
  for (let d = 0; d < 30; d++) runNight(s);
  for (const [nom, f] of Object.entries(voisinsFoyers(s))) {
    assertEqual(f.journal.length, DATA.VOISINS.JOURNAL, nom);
    for (const J of f.journal) {
      assertEqual(J.couverture, 100, `${nom} jour ${J.jour} : le besoin couvert`);
      assert(J.plats.length >= 1 && J.plats.every((p) => DATA.VOISINS.RECETTES[f.metier].includes(p)), `${nom} : des plats de son métier`);
      assert(J.vendu > 0 || f.metier === 'agriculteur', `${nom} : le bois vendu`);
    }
    if (f.metier === 'bucheron') {
      assert(f.journal.every((J) => J.arbres === DATA.VOISINS.BUCHERON.ARBRES * f.adultes), `${nom} : ses arbres chaque jour`);
    } else {
      assert(f.journal.some((J) => Object.keys(J.recolte).length), `${nom} : des récoltes`);
      assert(f.journal.some((J) => J.vendu > 0), `${nom} : des légumes vendus`);
    }
    assert(f.argent >= DATA.VOISINS.MAISON.RESERVE, `${nom} : il garde sa réserve (${f.argent})`);
    assert(f.niveau >= 3, `${nom} : sa maison a grandi (étape ${f.niveau})`);
    assert(f.bonheur >= DATA.VILLE.BONHEUR.DEPART, `${nom} : les plats le rendent heureux (${f.bonheur})`);
  }
});

test('voisins : la maison grandit quand la famille s\'enrichit, une étape par nuit, en gardant sa réserve', () => {
  const { s, P } = partie();
  const nom = P.maisons[0].nom, f = voisinsFoyers(s)[nom], E = DATA.VOISINS.MAISON.ETAPES;
  assertEqual(f.niveau, 0, 'une petite pièce au départ');
  assertEqual(voisinsVue(s)[nom].projet.id, E[0].id);
  f.argent = E[0].prix + DATA.VOISINS.MAISON.RESERVE + 1000;
  const b = f.bonheur;
  runNight(s);
  assertEqual([f.niveau, f.journal.at(-1).maison], [1, E[0].id], 'une étape la première nuit');
  assert(f.bonheur > Math.min(b, DATA.VILLE.BONHEUR.MAX - E[0].bonheur), 'elle rend heureux');
  for (let d = 0; d < 20; d++) runNight(s);
  assertEqual(f.niveau, E.length, 'tout est fait');
  assertEqual(voisinsVue(s)[nom].projet, null);
  assert(voisinsVue(s)[nom].maison.objets.some((o) => o.nom === 'tapis_1'), 'le plan de la carte suit');
  f.argent = 10;
  const avant = f.niveau;
  runNight(s);
  assertEqual(f.niveau, avant);
});

test('voisins : le livreur emmène les caisses au marché ; chaque famille touche leur prix à son arrivée, une fois', () => {
  const { s, P } = partie();
  runNight(s);
  const F = voisinsFoyers(s), avant = Object.fromEntries(Object.entries(F).map(([k, f]) => [k, f.argent]));
  const valeurs = Object.fromEntries(Object.keys(F).map((k) => [k, voisinsVue(s)[k].valeur]));
  assert(Object.values(valeurs).some((v) => v > 0), 'des caisses pleines le matin');
  const r = livraison(s);
  for (const k of Object.keys(F)) {
    assertEqual(F[k].argent - avant[k], valeurs[k], `${k} : le prix de sa caisse crédité`);
    assertEqual(r.foyers[k], valeurs[k]);
    assertEqual([voisinsVue(s)[k].valeur, voisinsVue(s)[k].livree], [0, true], `${k} : la caisse vidée`);
  }
  assertEqual(r.total, Object.values(valeurs).reduce((a, b) => a + b, 0));
  assertEqual(livraison(s).total, 0, 'une seule livraison par jour');
  runNight(s);
  for (const k of Object.keys(F)) {
    const J = F[k].journal.at(-1);
    assertEqual(J.vendu, valeurs[k], `${k} : la journée compte la livraison du matin, sans la recréditer`);
  }
  // sans le joueur, la tournée se fait quand même : la caisse est vendue au début de la journée
  const g = F[P.maisons[0].nom], v = voisinsVue(s)[P.maisons[0].nom].valeur;
  runNight(s);
  assertEqual(g.journal.at(-1).vendu, v);
  for (const m of P.maisons) assert(m.caisse && m.caisse.arret, `${m.nom} : une caisse de collecte`);
});

test('voisins : l\'agriculteur sans argent mange ce qu\'il produit ; le bûcheron sans arbres ni argent a faim', () => {
  const { s, P } = partie();
  const ag = P.maisons.find((m) => m.metier === 'agriculteur').nom, bu = P.maisons.find((m) => m.metier === 'bucheron').nom;
  for (let d = 0; d < 8; d++) runNight(s);
  const fa = voisinsFoyers(s)[ag], fb = voisinsFoyers(s)[bu];
  fa.argent = 0;
  runNight(s);
  assertEqual(fa.journal[fa.journal.length - 1].couverture, 100, 'l\'agriculteur se nourrit de son champ');
  fb.argent = 0;
  fb.stock = {};
  fb.caisse = {};
  for (const id of arbresDebout(s, bu)) s.outils.arbres[id] = { retour: s.day + 99 };
  const avant = fb.bonheur;
  runNight(s);
  const J = fb.journal[fb.journal.length - 1];
  assert(J.couverture < 100 && J.arbres === 0, 'pas de bois, pas d\'argent : il a faim');
  assert(fb.bonheur < avant, 'il est moins heureux');
});

test('voisins : sous les yeux du joueur, le bûcheron abat un arbre de la carte (dans son quota)', () => {
  const { s, P } = partie();
  const bu = P.maisons.find((m) => m.metier === 'bucheron').nom, ag = P.maisons.find((m) => m.metier === 'agriculteur').nom;
  const quota = voisinQuota(s, bu);
  assertEqual(quota, DATA.VOISINS.BUCHERON.ARBRES * 2);
  assertEqual(voisinQuota(s, ag), 0);
  const id = arbresDebout(s, bu)[0];
  const r = voisinAbat(s, bu, id);
  assertEqual([r.ok, r.bois, r.reste], [true, DATA.VOISINS.BUCHERON.BOIS, quota - 1]);
  assert(treeGone(s, id), 'l\'arbre est abattu (il repoussera)');
  assertEqual(voisinAbat(s, bu, id).ok, false, 'pas deux fois');
  assertEqual(voisinAbat(s, ag, arbresDebout(s, ag)[0]).ok, false, 'l\'agriculteur ne coupe pas');
  for (let k = 1; k < quota; k++) voisinAbat(s, bu, arbresDebout(s, bu)[0]);
  assertEqual(voisinAbat(s, bu, arbresDebout(s, bu)[0]).ok, false, 'le quota fait');
  runNight(s);
  const J = voisinsFoyers(s)[bu].journal.at(-1);
  assertEqual(J.arbres, quota, 'la journée compte les arbres vus');
  assertEqual(J.caisse.bois, (DATA.VOISINS.BUCHERON.ARBRES * 2) * DATA.VOISINS.BUCHERON.BOIS, 'leur bois dans la caisse de collecte');
  assertEqual(voisinsVue(s)[bu].valeur, J.caisse.bois * DATA.OBJETS.bois.prix, 'ce qu\'elle vaut au marché');
  const vue = voisinsVue(s)[ag];
  assert(vue.champ.every((p) => p.stade >= -1 && p.stade <= 3), 'les stades du champ à dessiner');
});
