/* ==========================================================================
   Tests du moteur : meubles, migrations de la Serre, comptes, personnages (1.17), ramassage (1.18).
   Lancer seul : node --test tests/engine/divers.test.mjs (ou node tests/run-tests.mjs divers).
   ========================================================================== */

import {
  buyFurniture, collectLeftovers, COMPTA_MAX, comptaRecente, countItem, createInitialState, DATA,
  earn, findPlot, furnitureCount, furnitureMax, harvest, layEggs, makePlots, memberPerso, migrate,
  noteCompta, pickUp, piles, setMemberProfile,
} from '../../js/engine/index.js';
import {
  assert, assertEqual, garden, plantRipe, test, testBase,
} from './aide.mjs';

test('meubles : achat au Marché, limites selon la famille, bonheur une fois', () => {
  const s = createInitialState();
  s.pieces = 10000;
  s.maison = { reparee: false };
  assertEqual(buyFurniture(s, 'table').ok, false, 'maison à réparer');
  s.maison.reparee = true;
  s.famille.membres.forEach((m) => { m.bonheur = 50; });
  const r = buyFurniture(s, 'canape');
  assertEqual([r.ok, s.pieces, furnitureCount(s, 'canape'), s.famille.membres.every((m) => m.bonheur === 50 + DATA.MEUBLES.canape.bonheur)], [true, 10000 - DATA.MEUBLES.canape.prix, 1, true]);
  assertEqual(buyFurniture(s, 'canape').ok, false, 'un seul canapé');
  // lits : un par adulte, un par enfant (famille de départ : 2 + 2)
  assertEqual([furnitureMax(s, 'lit_adulte'), furnitureMax(s, 'lit_enfant'), furnitureMax(s, 'chaise')], [2, 2, 4]);
  assert(buyFurniture(s, 'lit_enfant').ok && buyFurniture(s, 'lit_enfant').ok);
  assertEqual(buyFurniture(s, 'lit_enfant').ok, false, 'deux enfants, deux lits');
  s.pieces = 0;
  assertEqual(buyFurniture(s, 'table').error, 'Pas assez de pièces.');
  assertEqual(furnitureCount(createInitialState(), 'table'), 0);
});

test('migration v34 → v35 : une Serre construite reçoit les parcelles de son niveau (toute sa terre au niveau 5)', () => {
  const old = createInitialState();
  old.version = 34;
  old.serre = { ...old.serre, construit: true, niveau: 2, parcelles: makePlots(9, 'serre') };
  old.serre.parcelles[0].culture = 'tomate';
  const m = migrate(old);
  assertEqual([m.version >= 35, m.serre.parcelles.length, m.serre.parcelles[0].culture, m.serre.parcelles[25].id], [true, 26, 'tomate', 'serre-26']);
  const vide = createInitialState();
  vide.version = 34;
  assertEqual(migrate(vide).serre.construit, false, 'pas de Serre : rien ne change');
});

test('migration v36 → v37 : la Serre aux deux bacs (56) : parcelles de son niveau, les plantées en trop restent', () => {
  const old = createInitialState();
  old.version = 36;
  old.serre = { ...old.serre, construit: true, niveau: 5, parcelles: makePlots(63, 'serre') };
  old.serre.parcelles[60].culture = 'tomate';
  const m = migrate(old);
  assertEqual([m.version, m.serre.parcelles.length, m.serre.parcelles[56].id, m.serre.parcelles[56].culture], [37, 57, 'serre-61', 'tomate']);
  const un = createInitialState();
  un.version = 36;
  un.serre = { ...un.serre, construit: true, niveau: 1, parcelles: makePlots(15, 'serre') };
  assertEqual(migrate(un).serre.parcelles.map((p) => p.id).slice(-1), ['serre-16'], 'niveau 1 : 16 parcelles');
  const vide = createInitialState();
  vide.version = 36;
  assertEqual(migrate(vide).serre.construit, false, 'pas de Serre : rien ne change');
});

test('Comptes : chaque gain et dépense est noté ; même libellé le même jour : une ligne ; solde d\'avant + somme = pièces', () => {
  const s = createInitialState();
  s.pieces = 1000;
  s.maison = { reparee: true };
  assert(buyFurniture(s, 'chaise').ok && buyFurniture(s, 'chaise').ok);
  earn(s, 50, 'Vente : Carotte', 5);
  const c = comptaRecente(s);
  assertEqual(c.lignes.map((l) => [l.libelle, l.montant, l.n]), [[`Meuble : ${DATA.MEUBLES.chaise.nom}`, -2 * DATA.MEUBLES.chaise.prix, 2], ['Vente : Carotte', 50, 5]]);
  assertEqual([c.avant, c.total], [1000, s.pieces]);
  s.day += 1;
  earn(s, 10, 'Vente : Carotte');
  assertEqual(comptaRecente(s).lignes.length, 3, 'un autre jour : une autre ligne');
  for (let i = 0; i < COMPTA_MAX + 5; i++) noteCompta(s, i % 2 ? 1 : -1, 'x' + i);
  const d = comptaRecente(s);
  assertEqual([d.lignes.length, d.avant + d.lignes.reduce((a, l) => a + l.montant, 0)], [COMPTA_MAX, s.pieces]);
  const vieille = createInitialState();
  delete vieille.compta;
  assertEqual(comptaRecente(vieille).lignes, [], 'ancienne sauvegarde : rien de noté');
});

test('Personnages (version 1.17) : adultes et enfants choisissent un des 50 personnages de leur âge ; défaut selon le sexe', () => {
  const s = createInitialState();
  const P = DATA.FAMILLE.PROFIL;
  const adulte = s.famille.membres.find((m) => !m.enfant);
  const enfant = s.famille.membres.find((m) => m.enfant);
  assertEqual(memberPerso(adulte), P.PERSO_DEFAUT[adulte.genre], 'pas encore choisi : le défaut');
  assertEqual(memberPerso(enfant), P.PERSO_DEFAUT_ENFANT[enfant.genre], 'un enfant : le défaut des enfants');
  assert(setMemberProfile(s, adulte.id, { perso: 23 }).ok);
  assertEqual(memberPerso(adulte), 23);
  assertEqual(setMemberProfile(s, adulte.id, { perso: P.PERSOS + 1 }).error, 'Personnage inconnu.');
  assertEqual(setMemberProfile(s, adulte.id, { perso: 0 }).error, 'Personnage inconnu.');
  assert(setMemberProfile(s, enfant.id, { perso: P.PERSOS_ENFANT }).ok);
  assertEqual(memberPerso(enfant), P.PERSOS_ENFANT);
  assertEqual(setMemberProfile(s, enfant.id, { perso: P.PERSOS_ENFANT + 1 }).error, 'Personnage inconnu.');
  assert(setMemberProfile(s, adulte.id, { prenom: 'Lou' }).ok);
  assertEqual(memberPerso(adulte), 23, 'un autre changement garde le personnage');
});

testBase('Ramassage (version 1.18) : avec le personnage, la récolte au clic attend sur sa case ; l\'automatique et la nuit vont à l\'inventaire', () => {
  const s = garden();
  const avant = countItem(s, 'carotte');
  plantRipe(s, 'potager-1', 'carotte');
  assertEqual(harvest(s, 'potager-1').aRamasser, false, 'sans personnage : directement');
  assertEqual(countItem(s, 'carotte'), avant + 6);
  s.ramassage = true;
  plantRipe(s, 'potager-1', 'carotte');
  plantRipe(s, 'potager-2', 'carotte');
  const c = findPlot(s, 'potager-1').case;
  assertEqual(harvest(s, 'potager-1').aRamasser, true);
  assertEqual(countItem(s, 'carotte'), avant + 6, 'pas encore dans l\'inventaire');
  assertEqual(piles(s).map((p) => [p.id, p.lieu, p.ref, p.items.carotte]), [[`parcelle:${c}`, 'parcelle', c, 6]]);
  assertEqual(harvest(s, 'potager-2', true).aRamasser, false, 'automatisation : directement');
  assertEqual(countItem(s, 'carotte'), avant + 12);
  const r = pickUp(s, `parcelle:${c}`);
  assertEqual([r.ok, r.items.carotte, countItem(s, 'carotte'), piles(s).length], [true, 6, avant + 18, 0]);
  assertEqual(pickUp(s, `parcelle:${c}`).ok, false, 'déjà ramassé');
  // Le soir, ce qui traîne est rentré.
  plantRipe(s, 'potager-1', 'carotte');
  harvest(s, 'potager-1');
  assertEqual(collectLeftovers(s).carotte, 6);
  assertEqual([piles(s).length, countItem(s, 'carotte')], [0, avant + 24]);
});

test('Ramassage (version 1.18) : les œufs attendent au Poulailler, le lait et la laine à l\'Étable', () => {
  const s = createInitialState(1);
  s.ramassage = true;
  s.poulailler.construit = true;
  s.poulailler.poules = 2;
  s.poulailler.nourries = 2;
  const oeuf = DATA.ANIMAUX.poule.produit;
  const avant = countItem(s, oeuf);
  assertEqual(layEggs(s), 2 * DATA.ANIMAUX.poule.oeufsParNuit);
  assertEqual(countItem(s, oeuf), avant, 'au Poulailler');
  assertEqual(piles(s).map((p) => p.id), ['poulailler']);
  assertEqual(pickUp(s, 'poulailler').items[oeuf], 2 * DATA.ANIMAUX.poule.oeufsParNuit);
  assertEqual(countItem(s, oeuf), avant + 2 * DATA.ANIMAUX.poule.oeufsParNuit);
});
