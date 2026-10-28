/* ==========================================================================
   Tests du moteur : l'économie de l'île (le récit, lot 7 ; js/engine/ile.js, data/ile.json).
   - les ateliers des hameaux garantis : la scierie et l'ébéniste à Bois-Joli, le tissage, la couture et
     les tapis aux Genêts ; aucun ailleurs ;
   - une commande : ce qu'il faut est pris, l'argent va aux foyers, ce qui est fait se reprend le lendemain ;
     au plus `max` lots en cours ; une sauvegarde abîmée ne casse rien ;
   - un meuble s'achète au hameau qui le vend, une fois s'il est unique ;
   - la veillée à la ferme : au niveau 10, une nuit de pleine lune, le soir, une fois par pleine lune.
   Lancer seul : node tests/run-tests.mjs ile.
   ========================================================================== */

import { awakeMsAtHour, DATA, elementsSol, genererMonde, solDirect, testSetLevel } from '../../js/engine/index.js';
import { addItem, countItem } from '../../js/engine/inventory.js';
import { habitantsDe, peuplerHameau } from '../../js/engine/habitants.js';
import {
  acheterMeubleHameau, ateliersConnus, ateliersDuHameau, commander, commandesDe, garantiDuHameau, lotsPossibles, meublesDuHameau,
  retirerCommandes, retirerToutes, veilleeFerme, veilleeFermePossible,
} from '../../js/engine/ile.js';
import { aFait, confiance, noterFait, RECIT } from '../../js/engine/recit.js';
import { assert, assertEqual, farm, test } from './aide.mjs';

// Une partie (la maison bâtie : farm) et les plans des hameaux de son monde, ceux du récit peuplés.
function partie() {
  const s = farm();
  const sol = solDirect(genererMonde(s.carte.graine).terrain);
  elementsSol(sol.ctx);
  const plans = sol.ctx.hameaux.plans.filter((p) => !p.batisse);
  const de = (g) => plans.find((p) => p.garanti === g);
  for (const g of ['bois_joli', 'genets', 'gue']) peuplerHameau(s, de(g));
  return { s, bois: de('bois_joli').id, genets: de('genets').id, gue: de('gue').id, autre: plans.find((p) => !p.garanti) };
}
const bourses = (s, id) => habitantsDe(s)[id].foyers.reduce((t, f) => t + (f.bourse || 0), 0);

test('île : les ateliers des hameaux garantis, et aucun ailleurs', () => {
  const { s, bois, genets, gue, autre } = partie();
  assertEqual([garantiDuHameau(s, bois), garantiDuHameau(s, genets), garantiDuHameau(s, gue)], ['bois_joli', 'genets', 'gue']);
  assertEqual(ateliersDuHameau(s, bois).map((a) => a.id), ['scierie', 'ebeniste']);
  assertEqual(ateliersDuHameau(s, genets).map((a) => a.id), ['tissage', 'couture', 'tapis']);
  assertEqual(ateliersDuHameau(s, gue), []);
  peuplerHameau(s, autre);
  assertEqual(ateliersDuHameau(s, autre.id), []);
  // une partie d'avant le lot 7 (sans « garanti » noté) : d'après le nom du hameau
  delete habitantsDe(s)[bois].garanti;
  assertEqual(garantiDuHameau(s, bois), 'bois_joli');
  // les meubles : les tapis aux Genêts, tout le reste chez l'ébéniste
  assertEqual(meublesDuHameau(s, genets), ['tapis_1', 'tapis_2', 'tapis_3']);
  assertEqual(meublesDuHameau(s, bois).length, Object.keys(DATA.MEUBLES).length - 3);
});

test('île : la scierie rend 3 planches pour 2 bois, le lendemain', () => {
  const { s, bois, genets } = partie();
  s.inventaire = {};
  addItem(s, 'bois', 11);
  assertEqual(lotsPossibles(s, bois, 'scierie', 'planches'), 5);
  assertEqual(commander(s, genets, 'scierie', 'planches', 1).ok, false, 'pas aux Genêts');
  assertEqual(commander(s, bois, 'scierie', 'planches', 6).ok, false, 'pas assez de bois');
  const r = commander(s, bois, 'scierie', 'planches', 5);
  assertEqual([r.ok, r.lots, r.pret, countItem(s, 'bois')], [true, 5, s.day + 1, 1]);
  assert(aFait(s, 'ile.scierie'), 'le fait est noté');
  assertEqual(retirerCommandes(s, bois).items, {}, 'pas encore prêt');
  s.day += 1;
  assertEqual(retirerCommandes(s, bois).items, { planche: 15 });
  assertEqual([countItem(s, 'planche'), commandesDe(s, bois).length], [15, 0]);
  assertEqual(retirerCommandes(s, bois).items, {}, 'rendu une fois');
});

test('île : au plus `max` lots en cours ; une commande abîmée de la sauvegarde est ôtée', () => {
  const { s, bois } = partie();
  addItem(s, 'bois', 200);
  const max = DATA.ILE.ATELIERS.scierie.max;
  assert(commander(s, bois, 'scierie', 'planches', max - 2).ok);
  assertEqual(lotsPossibles(s, bois, 'scierie', 'planches'), 2);
  assertEqual(commander(s, bois, 'scierie', 'planches', 3).ok, false);
  habitantsDe(s)[bois].commandes.push({ atelier: 'scierie', recette: 'inconnue', lots: 2, pret: 1 }, 'n\'importe quoi');
  assertEqual(commandesDe(s, bois).length, 1);
});

test('île : tisser puis coudre aux Genêts ; l\'argent va aux familles', () => {
  const { s, genets } = partie();
  s.inventaire = {};
  addItem(s, 'laine', 6);
  assert(commander(s, genets, 'tissage', 'tissu', 3).ok);
  s.day += 1;
  assertEqual(retirerCommandes(s, genets).items, { tissu: 3 });
  const R = DATA.ILE.ATELIERS.couture.recettes.manteau_chaud;
  const p = s.pieces, b = bourses(s, genets);
  const r = commander(s, genets, 'couture', 'manteau_chaud', 1);
  assert(r.ok, r.error);
  assertEqual([p - s.pieces, bourses(s, genets) - b, countItem(s, 'tissu')], [R.pieces, R.pieces, 3 - R.entrees.tissu]);
  s.day += 1;
  assertEqual(retirerCommandes(s, genets).items, { manteau_chaud: 1 });
  s.pieces = 0;
  addItem(s, 'tissu', 5);
  assertEqual(commander(s, genets, 'couture', 'gants_travail', 1).ok, false, 'sans pièces');
});

test('île : un meuble s\'achète au hameau qui le vend', () => {
  const { s, bois, genets } = partie();
  s.pieces = 1000;
  s.meubles = {};
  assertEqual(acheterMeubleHameau(s, genets, 'table').ok, false, 'pas aux Genêts');
  const b = bourses(s, bois);
  const r = acheterMeubleHameau(s, bois, 'table');
  assert(r.ok, r.error);
  assertEqual([r.cost, 1000 - s.pieces, bourses(s, bois) - b, countItem(s, 'meuble_table'), s.meubles.table], [DATA.MEUBLES.table.prix, DATA.MEUBLES.table.prix, DATA.MEUBLES.table.prix, 1, 1]);
  assertEqual(acheterMeubleHameau(s, bois, 'table').ok, false, 'une seule table');
  assert(acheterMeubleHameau(s, genets, 'tapis_1').ok, 'un tapis aux Genêts');
});

test('île : la veillée à la ferme, au niveau 10, une fois par pleine lune', () => {
  const { s, bois, genets } = partie();
  const pleine = (() => { let j = 1; for (const p of DATA.LUNE.PHASES) { if (p.id === 'pleine') return j; j += p.jours; } return 1; })();
  s.monde.hameaux = { [bois]: { nom: 'Bois-Joli', style: 'foret', jour: 2 }, [genets]: { nom: 'Les Genêts', style: 'lande', jour: 3 } };
  const soir = (jour, h = 20) => { s.day = jour; s.awakeMs = awakeMsAtHour(h); s.nuitEnCours = null; };
  soir(pleine);
  testSetLevel(s, 9);
  assertEqual(veilleeFermePossible(s), false, 'pas avant le niveau 10');
  testSetLevel(s, 10);
  assertEqual(veilleeFermePossible(s), false, 'la première est une scène (veillee_ferme)');
  assert(RECIT.SCENES.some((x) => x.id === 'veillee_ferme'));
  noterFait(s, 'veillee.ferme');
  assertEqual(veilleeFermePossible(s), false, 'pas deux fois la même pleine lune');
  soir(pleine + DATA.LUNE.JOURS_MOIS, 17);
  assertEqual(veilleeFermePossible(s), false, 'pas avant le soir');
  soir(pleine + DATA.LUNE.JOURS_MOIS);
  const avant = confiance(s, bois);
  const r = veilleeFerme(s);
  assertEqual([r.ok, confiance(s, bois) - avant, confiance(s, genets) - avant], [true, DATA.ILE.VEILLEE.CONFIANCE, DATA.ILE.VEILLEE.CONFIANCE]);
  assertEqual(veilleeFerme(s).ok, false, 'une fois');
  soir(pleine + DATA.LUNE.JOURS_MOIS + 3);
  assertEqual(veilleeFermePossible(s), false, 'pas un autre soir de lune');
});

test('île : les ateliers connus (les hameaux où le joueur est allé), et toutes les commandes rendues d\'un coup', () => {
  const { s, bois, genets } = partie();
  const A = ateliersConnus(s);
  assertEqual(A.map((a) => [a.id, a.hameau, a.garanti]), [
    ['scierie', bois, 'bois_joli'], ['ebeniste', bois, 'bois_joli'],
    ['tissage', genets, 'genets'], ['couture', genets, 'genets'], ['tapis', genets, 'genets'],
  ].sort((x, y) => Object.keys(habitantsDe(s)).indexOf(x[1]) - Object.keys(habitantsDe(s)).indexOf(y[1])));
  addItem(s, 'bois', 4);
  addItem(s, 'laine', 2);
  const sc = A.find((a) => a.id === 'scierie'), ti = A.find((a) => a.id === 'tissage');
  assert(commander(s, sc.hameau, 'scierie', 'planches', 2).ok && commander(s, ti.hameau, 'tissage', 'tissu', 1).ok);
  s.day += 1;
  const avant = countItem(s, 'planche');
  assertEqual(retirerToutes(s).items, { planche: 6, tissu: 1 });
  assertEqual(countItem(s, 'planche') - avant, 6);
});
