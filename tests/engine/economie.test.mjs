/* ==========================================================================
   Tests du moteur : l'économie de la ville (docs/plan-ville.md, étape 5c ; js/engine/economie.js).
   Lancer seul : node --test tests/engine/economie.test.mjs (ou node tests/run-tests.mjs economie).
   ========================================================================== */

import {
  acheterRepasVille, addItem, awakeMsAtHour, buyCompany, buyInShop, coefPrix, countItem, DATA, demandeTheorique, economie, economieNuit,
  economieVue, matiereDe, negoceOffres, negoceVue, prixNegoce, sellToNegoce, shopView, sortieVille,
} from '../../js/engine/index.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

const X = DATA.ECONOMIE;

test('économie : au départ, DEPART jours de la demande en stock, la caisse, des prix de base', () => {
  const s = garden();
  const e = economie(s), D = demandeTheorique();
  assertEqual(e.stocks.pain, Math.round(D.pain * X.STOCK.DEPART));
  assertEqual(e.caisse, X.CAISSE.DEPART);
  assert(Math.abs(coefPrix(s, 'pain') - 1) < 0.01, 'le stock visé : le prix de base');
  e.stocks.pain = 0;
  assertEqual(coefPrix(s, 'pain'), Math.min(X.PRIX.MAX, 100 + X.PRIX.ELASTICITE * 100) / 100, 'plus de pain : plus cher');
  e.stocks.pain = D.pain * 100;
  assertEqual(coefPrix(s, 'pain'), X.PRIX.MIN / 100, 'trop de pain : moins cher');
});

test('économie : chaque nuit, une journée (stocks bornés, bilan, caisse)', () => {
  const s = garden();
  for (let j = 0; j < 20; j++) { s.day++; economieNuit(s); }
  const e = economie(s), D = demandeTheorique();
  assertEqual(e.jour, s.day);
  assert(e.bilan && e.bilan.jour === s.day && e.bilan.comptes.boulangerie, 'le bilan d\'hier');
  for (const [p, q] of Object.entries(e.stocks)) assert(q <= Math.ceil((D[p] || 0) * (1 + X.STOCK.DEPART)) + 400, `${p} : stock borné (${q})`);
  assert(e.bilan.camions <= X.CAMIONS.n, 'pas plus de camions qu\'il n\'y en a');
  const v = economieVue(s);
  assertEqual(v.caisse, Math.round(e.caisse));
  assert(v.prix.pain >= 1);
});

test('économie : la nuit rattrape au plus RATTRAPAGE journées', () => {
  const s = garden();
  economie(s);
  s.day += 100;
  economieNuit(s);
  assertEqual(economie(s).jour, s.day);
});

test('économie : un foyer de citadins achète ses repas aux boutiques', () => {
  const s = garden();
  const f = { metier: 'citadin', adultes: 2, enfants: 1, argent: 500, bonheur: 60 };
  const avant = economie(s).stocks.pain;
  const r = acheterRepasVille(s, f, 20000);
  assert(r.energie > 0 && r.cout > 0, 'il a mangé et payé');
  assertEqual(f.argent, 500 - r.cout);
  assertEqual(economie(s).stocks.pain, avant - (r.mange.pain || 0));
  const pauvre = { metier: 'citadin', adultes: 2, enfants: 0, argent: 0, bonheur: 60 };
  assertEqual(acheterRepasVille(s, pauvre, 20000).cout, 0, 'sans argent, rien');
});

test('économie : un foyer malheureux sort (billets à la caisse), un foyer heureux non', () => {
  const s = garden();
  const f = { adultes: 2, enfants: 1, argent: 500, bonheur: X.LOISIRS.SEUIL - 10 };
  const lieu = sortieVille(s, f, s.day);
  assert(lieu && X.LOISIRS.LIEUX[lieu], 'une sortie');
  assert(f.bonheur > X.LOISIRS.SEUIL - 10 && f.argent < 500);
  assertEqual(economie(s).billets, 500 - f.argent);
  assertEqual(sortieVille(s, { adultes: 2, enfants: 0, argent: 500, bonheur: 90 }, s.day), null);
  assertEqual(sortieVille(s, { adultes: 2, enfants: 0, argent: X.LOISIRS.RESERVE, bonheur: 10 }, s.day), null, 'pas sous la réserve');
});

test('économie : le négoce rachète ce qui manque, PRIME % du prix', () => {
  const s = garden();
  assertEqual(matiereDe('ble'), 'ble');
  assertEqual(matiereDe('sardine'), 'poisson');
  assertEqual(matiereDe('carotte'), 'legume');
  assertEqual(matiereDe('pizza'), null);
  addItem(s, 'ble', 30);
  assertEqual(sellToNegoce(s, 'ble', 5).ok, false, 'pas de pénurie : pas besoin');
  const e = economie(s);
  e.penuries = { ble: 10 };
  assertEqual(negoceVue(s)[0].matiere, 'ble');
  const pieces = s.pieces, prix = prixNegoce(s, 'ble');
  assert(prix >= Math.round((X.PRODUITS.ble.prix * X.NEGOCE.PRIME) / 100));
  const stock = e.stocks.ble || 0;
  const r = sellToNegoce(s, 'ble', 25);
  assert(r.ok);
  assertEqual(r.sold, 10, 'au plus la pénurie');
  assertEqual(countItem(s, 'ble'), 20);
  assertEqual(s.pieces, pieces + 10 * prix);
  assertEqual(e.stocks.ble, stock + 10);
  assertEqual(negoceVue(s).length, 0);
});

test('économie : le comptoir prend au stock ; vide, il n\'en a plus', () => {
  const s = garden();
  s.pieces = 1000;
  const e = economie(s);
  e.stocks.pizza = 1;
  assert(buyInShop(s, 'pizzeria', 'pizza').ok);
  assertEqual(e.stocks.pizza, 0);
  assertEqual(buyInShop(s, 'pizzeria', 'pizza').ok, false);
});

test('économie : le propriétaire d\'une entreprise touche sa part du bénéfice', () => {
  const s = garden();
  for (let j = 0; j < 5; j++) { s.day++; economieNuit(s); }
  assertEqual(economie(s).bilan.part, 0, 'sans entreprise, pas de part');
  const B = economie(s).bilan.comptes;
  const lieu = Object.keys(DATA.VILLE.ENTREPRISES.LISTE).find((l) => B[l] && B[l].benefice > 0);
  assert(lieu, 'une entreprise bénéficiaire');
  s.pieces = DATA.VILLE.ENTREPRISES.LISTE[lieu].prix;
  s.awakeMs = awakeMsAtHour(8);
  assert(buyCompany(s, lieu).ok);
  const avant = s.pieces;
  s.day++;
  economieNuit(s);
  const b = economie(s).bilan;
  if (b.comptes[lieu].benefice > 0) {
    assertEqual(b.part, Math.round((b.comptes[lieu].benefice * X.ENTREPRISES.PART) / 100));
    assertEqual(s.pieces, avant + b.part);
  }
});

test('économie : les vues de la mairie, du négoce et des comptoirs', () => {
  const s = garden();
  const v = economieVue(s);
  assertEqual(v.produits.length, Object.keys(X.PRODUITS).length, 'tous les produits');
  assert(v.produits.every((p) => p.nom && p.icone && p.prix >= 1), 'nom, icône, prix');
  assert(v.produits[0].matiere, 'les matières premières d\'abord');
  addItem(s, 'carotte', 4);
  addItem(s, 'tomate', 2);
  economie(s).penuries = { legume: 5 };
  const o = negoceOffres(s);
  assertEqual(o.length, 1);
  assertEqual(o[0].nom, X.PRODUITS.legume.nom);
  const objets = Object.fromEntries(o[0].objets.map((q) => [q.item, q.qte]));
  assertEqual([objets.carotte, objets.tomate], [4, 2]);
  economie(s).stocks.pizza = 0;
  assertEqual(shopView('pizzeria', s).cours, X.PRIX.MAX);
  assertEqual(shopView('pizzeria', s).stock, 0);
});
