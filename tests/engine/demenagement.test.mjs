/* ==========================================================================
   Tests du moteur : une ancienne partie (la carte de Tiled) déménage sur la ferme générée.
   Lancer seul : node --test tests/engine/demenagement.test.mjs (ou node tests/run-tests.mjs demenagement).
   ========================================================================== */

import {
  blocsPoses, blocDessus, buildPaturage, buildSerre, buildVerger, buyPasture, convertirPartie, countItem,
  couchages, createInitialState, DATA, etatEtable, etatPoulailler, farmSeed, farmTerrain, grantTech,
  houseRepaired, isOwned, nuitSansCouchage, plantTree, robotStation, serrePlaces, starterOf, upgradePoulailler,
  upgradeSerre,
} from '../../js/engine/index.js';
import { assert, assertEqual, atelier, reach, sleepOnce, test } from './aide.mjs';

// Une ancienne partie bien avancée : la maison, le four, la cuisinière, le Moulin, la Presse, le
// Silo, un Poulailler au niveau 5, une Étable de 25 places, une Serre de 56 parcelles, deux arbres
// au Verger, et le robot.
function vieillePartie() {
  const s = atelier();
  s.pieces = 1e6;
  for (let i = 0; i < 4; i++) assert(upgradePoulailler(reach(s, 'poulailler')).ok, 'Poulailler agrandi');
  assert(buildPaturage(reach(s, 'paturage')).ok, 'Étable');
  for (let i = 0; i < 15; i++) assert(buyPasture(s).ok, 'place de l\'Étable');
  assert(buildSerre(reach(s, 'serre')).ok, 'Serre');
  for (let i = 0; i < 4; i++) assert(upgradeSerre(s).ok, 'Serre agrandie');
  assert(buildVerger(reach(s, 'verger')).ok, 'Verger');
  assert(plantTree(s, 'pommier').ok && plantTree(s, 'poirier').ok, 'arbres plantés');
  grantTech(s, 'cu_recolte_auto');
  return s;
}

test('Déménager : chaque bâtiment d\'une ancienne partie est rebâti en blocs, et reconnu', () => {
  const avant = vieillePartie();
  assertEqual([avant.poulailler.niveau, avant.paturage.places, avant.serre.parcelles.length, avant.verger.arbres.length], [5, 25, 56, 2]);
  for (const graine of ['a', 'test-1', 'xyz', '42', 'ferme']) {
    const s = structuredClone(avant);
    const r = convertirPartie(s, graine);
    assert(r.ok, r.raison);
    assertEqual(r.batis, ['maison', 'poulailler', 'paturage', 'serre', 'silo', 'moulin', 'appareils', 'station_robot'], `graine ${graine} : tout est bâti`);
    assertEqual(r.rendus, {});
    assertEqual(farmSeed(s), graine);
    // rien ne se perd : l'argent, le niveau, la famille, les bêtes, ce qui est construit
    assertEqual([s.pieces, s.progression.niveau, s.famille.membres.length], [avant.pieces, avant.progression.niveau, avant.famille.membres.length]);
    assertEqual([s.poulailler.niveau, s.paturage.places, s.serre.niveau, s.serre.parcelles.length], [5, 25, 5, 56]);
    // le foyer : une paillasse par membre, la famille dort
    assert(houseRepaired(s), 'le foyer');
    assertEqual(couchages(s).length, s.famille.membres.length);
    assertEqual(nuitSansCouchage(structuredClone(s)), []);
    // le Poulailler et l'Étable : là, à la taille de leur niveau et de leurs places
    assert(etatPoulailler(s).ok && etatPoulailler(s).places >= DATA.POULAILLER.CAPACITE[4], 'le Poulailler');
    assert(s.poulailler.construit && s.paturage.construit, 'construits');
    assert(etatEtable(s).ok && etatEtable(s).places >= 25, 'l\'Étable');
    // la Serre : une case par parcelle ; le Silo, les stations
    assert(serrePlaces(s).length >= 56, 'la Serre');
    assert(s.serre.construit && s.silo.construit, 'Serre et Silo');
    for (const id of ['four', 'cuisine', 'moulin', 'presse']) assert(s.stations[id].construit, id);
    const B = blocsPoses(s), sortes = Object.values(B);
    for (const sorte of ['four', 'cuisiniere', 'meule', 'nichoir', 'mangeoire', 'bac_semis', 'coffre_grain', 'puits', 'panneau', 'citerne', 'batterie', 'station_robot']) {
      assertEqual(sortes.filter((x) => x === sorte).length, 1, `un bloc ${sorte}`);
    }
    // les appareils : toujours là ; la pompe sur le puits ; la station du robot
    for (const type of ['panneau', 'pompe', 'reservoir', 'batterie']) assert(isOwned(starterOf(s, type)), type);
    const puits = Number(Object.keys(B).find((t) => B[t] === 'puits'));
    assertEqual(blocDessus(s, puits), 'pompe');
    assert(Number.isInteger(robotStation(s)), 'la station du robot');
    // tous les blocs sur l'herbe
    const T = farmTerrain(s), W = T.LARGEUR, ch = (t) => T.LIGNES[Math.floor(t / W)][t % W];
    assert(Object.keys(B).every((t) => ch(Number(t)) === '#' || ch(Number(t)) === '+'), 'sur l\'herbe');
    // les parcelles : sur de la terre labourable, sous aucun bloc, une par case
    const cases = s.potager.parcelles.map((p) => p.case);
    assertEqual(cases.length, avant.potager.parcelles.length);
    assertEqual(new Set(cases).size, cases.length);
    assert(cases.every((t) => ch(t) === '#' && !B[t]), 'les parcelles');
    // les arbres du Verger : dans le sol, loin l'un de l'autre, sur aucun bloc
    const arbres = s.verger.arbres.map((t) => t.case);
    assertEqual(arbres.length, 2);
    assert(arbres.every((t) => Number.isInteger(t) && !B[t] && !cases.includes(t)), 'les arbres');
    const [a, b] = arbres;
    assert(Math.max(Math.abs(a % W - b % W), Math.abs(Math.floor(a / W) - Math.floor(b / W))) >= DATA.ATELIER.ARBRE_ECART, 'écartés');
    // l'Atelier : construit, à poser
    assert(s.atelier.construit, 'l\'Atelier');
  }
});

test('Déménager : la partie continue (une nuit, sans perte de bonheur)', () => {
  const s = vieillePartie();
  assert(convertirPartie(s, 'nuit').ok, 'déménagée');
  const bonheur = s.famille.membres.map((m) => m.bonheur);
  sleepOnce(s);
  assertEqual(s.day, 2);
  assert(s.famille.membres.every((m, i) => m.bonheur === undefined || m.bonheur >= bonheur[i] - 20), 'pas de nuit sans couchage');
  assert(couchages(s).length >= s.famille.membres.length, 'les paillasses');
});

test('Déménager : une maison pas réparée rend les blocs d\'un foyer', () => {
  const s = createInitialState(1);
  s.maison = { reparee: false };
  assert(!houseRepaired(s), 'pas réparée');
  const r = convertirPartie(s, 'debut');
  assert(r.ok, r.raison);
  assert(!r.batis.includes('maison'), 'pas de foyer posé');
  assertEqual([countItem(s, 'paillasse'), countItem(s, 'porte')], [s.famille.membres.length, 1]);
  assert(countItem(s, 'mur_pierre') > 10, 'des murs');
  assertEqual(couchages(s), []);
  assert(!houseRepaired(s), 'le foyer reste à bâtir');
  assert(Object.values(blocsPoses(s)).includes('puits'), 'le puits de la cour');
});

test('Déménager : refus sur une ferme générée ou sans graine', () => {
  const s = createInitialState(1);
  assertEqual(convertirPartie(s, '  ').ok, false);
  assert(convertirPartie(s, 'g').ok, 'déménagée');
  assertEqual(convertirPartie(s, 'h').ok, false);
});
