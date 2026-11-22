/* ==========================================================================
   Tests du moteur : l'économie de l'île (js/engine/ile/economie.js ; docs/economie.md). La bourse du village à part ;
   la taxe prise la nuit sur le total des revenus du jour, arrondie à l'entier supérieur ; les dons ; le port qui
   n'achète que ce que l'île produit, sans rien vendre ni contrats.
   Lancer seul : node --test tests/engine/ile-economie.test.mjs
   ========================================================================== */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNewGame, DATA, finishSetup } from '../../js/engine/index.js';
import {
  donnerAuVillage,
  economie,
  noterRevenu,
  payerLesSalaires,
  salaireDe,
  reglerTaux,
  taxeDe,
  taxerLaNuit,
} from '../../js/engine/ile/economie.js';
import { etalPort } from '../../js/engine/port.js';
import { tirerContrats } from '../../js/engine/contrats.js';
import { encaisserVente } from '../../js/engine/market.js';
import { tacheManque } from '../../js/engine/taches.js';
import { acheterAuVillageois, changerStatut, prendrePart, ventesEntreVillageois } from '../../js/engine/bourse.js';
import { addItem } from '../../js/engine/inventory.js';

function partie() {
  const s = createNewGame(9);
  finishSetup(s);
  return s;
}

test('la taxe : 5 % arrondi à l’entier supérieur, rien sur un jour sans revenu', () => {
  assert.equal(DATA.ILE.ECONOMIE.TAUX, 5);
  assert.deepEqual(
    [0, 1, 20, 21, 100].map((n) => taxeDe(n, 5)),
    [0, 1, 1, 2, 5],
  );
  assert.equal(taxeDe(50, 0), 0);
});

test('la nuit, chacun paie la taxe de son total du jour à la bourse du village, sans passer sous zéro', () => {
  const s = partie();
  s.pieces = 200;
  s.villageois = [
    { id: 'v1', bourse: 3 },
    { id: 'v2', bourse: 40 },
  ];
  noterRevenu(s, 'joueur', 15);
  noterRevenu(s, 'joueur', 6); // 21 → 2
  noterRevenu(s, 'v1', 200); // 10 dus, 3 en bourse
  noterRevenu(s, 'v2', 30); // 2
  const r = taxerLaNuit(s);
  assert.deepEqual([r.joueur, r.villageois, r.total], [2, 5, 7]);
  assert.deepEqual([s.pieces, s.villageois[0].bourse, s.villageois[1].bourse, economie(s).bourse], [198, 0, 38, 7]);
  assert.equal(taxerLaNuit(s).total, 0, 'les revenus remis à zéro');
});

test('une vente au port est un revenu du jour', () => {
  const s = partie();
  const gain = encaisserVente(s, 'bois', 4);
  assert.ok(gain > 0);
  assert.equal(economie(s).revenus.joueur, gain);
});

test('un don : de la bourse du joueur à celle du village, jamais plus que ce qu’il a', () => {
  const s = partie();
  s.pieces = 30;
  assert.equal(donnerAuVillage(s, 50).ok, false);
  assert.equal(donnerAuVillage(s, 0).ok, false);
  assert.ok(donnerAuVillage(s, 20).ok);
  assert.deepEqual([s.pieces, economie(s).bourse, economie(s).dons], [10, 20, 20]);
});

test('le taux se règle de 0 à 30 %', () => {
  const s = partie();
  assert.equal(reglerTaux(s, 31).ok, false);
  assert.ok(reglerTaux(s, 0).ok);
  assert.ok(reglerTaux(s, 30).ok);
  assert.equal(economie(s).taux, 30);
});

test('le port de l’île ne vend rien et ne propose pas de contrats', () => {
  const s = partie();
  assert.deepEqual(etalPort(s), []);
  assert.deepEqual(tirerContrats(s, 3), []);
});

test('le salaire : 30 % de ce qu’il a rapporté, arrondi au-dessus ; sans de quoi payer, il ne travaille pas le lendemain', () => {
  const s = partie();
  const v = { id: 'v1', prenom: 'Léa', bourse: 0 };
  s.villageois = [v];
  assert.deepEqual([salaireDe(0), salaireDe(100), salaireDe(150), salaireDe(7)], [0, 30, 45, 3]);
  s.pieces = 100;
  assert.equal(payerLesSalaires(s, [{ v, net: 150 }]).paye, 45);
  assert.deepEqual([s.pieces, v.bourse, economie(s).revenus.villageois.v1], [55, 45, 45]);
  s.pieces = 10;
  assert.deepEqual(payerLesSalaires(s, [{ v, net: 100 }]).impayes, ['v1']);
  assert.deepEqual([s.pieces, v.bourse, v.impaye], [10, 45, 30], 'rien payé, pas de dette');
  assert.match(tacheManque(s, v, 'bois'), /Pas payé/);
  payerLesSalaires(s, []);
  assert.equal(v.impaye, 30, 'toujours pas de quoi');
  s.pieces = 30;
  payerLesSalaires(s, []);
  assert.equal(v.impaye, undefined, 'il reprend');
});

test('à son compte : son produit lui revient, le joueur et les autres villageois lui achètent, chaque vente est un revenu', () => {
  const s = partie();
  const w = { id: 'w', prenom: 'Paul', bourse: 0 },
    a = { id: 'a', prenom: 'Zoé', bourse: 100, gouts: { pomme: 'adore' } };
  s.villageois = [w, a];
  assert.ok(changerStatut(s, 'w', true).ok);
  addItem(s, 'pomme', 10);
  const J = { jour: s.day, produit: { pomme: 10 }, utilise: {} };
  assert.ok(prendrePart(s, w, J, 100) > 0);
  assert.equal(w.panier.pomme, 10, 'tout son produit');
  s.pieces = 100;
  const r = acheterAuVillageois(s, 'w', 'pomme', 2);
  assert.ok(r.ok, r.error);
  assert.equal(w.bourse, r.prix);
  assert.equal(economie(s).revenus.villageois.w, r.prix);
  assert.equal(acheterAuVillageois(s, 'a', 'pomme', 1).ok, false, 'Zoé est employée : elle ne vend rien');
  // (la nuit, Zoé lui achète ce qu'elle adore)
  const avant = w.bourse;
  assert.equal(ventesEntreVillageois(s), 1);
  assert.deepEqual([w.panier.pomme, w.bourse > avant, a.bourse < 100], [7, true, true]);
  assert.equal(ventesEntreVillageois(s), 0, 'un achat par jour');
});
