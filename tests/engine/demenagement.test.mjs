/* ==========================================================================
   Tests du moteur : une ancienne partie (la carte de Tiled) déménage sur la ferme générée
   (convertirPartie, et la migration v46 → v47 qui le fait au chargement).
   Lancer seul : node --test tests/engine/demenagement.test.mjs (ou node tests/run-tests.mjs demenagement).
   ========================================================================== */

import { readFileSync } from 'node:fs';
import {
  blocDessus, blocsPoses, convertirPartie, countItem, couchages, DATA, etatEtable, etatPoulailler,
  farmSeed, farmTerrain, graineDemenagement, houseRepaired, isOwned, migrate, nuitSansCouchage,
  robotStation, serrePlaces, starterOf, STATE_VERSION,
} from '../../js/engine/index.js';
import { assert, assertEqual, AVANT_DEMENAGEMENT, sleepOnce, test } from './aide.mjs';

// De vraies sauvegardes de la ferme du grand-père (version 46), écrites par le jeu d'avant :
//   - avancee : la maison, le four, la cuisinière, le Moulin, la Presse, le Silo, un Poulailler
//     au niveau 5, une Étable de 25 places, une Serre de 56 parcelles, deux arbres au Verger, le
//     robot ;
//   - debut : une partie neuve, la maison pas encore réparée.
const ANCIENNES = JSON.parse(readFileSync(new URL('./anciennes-parties.json', import.meta.url), 'utf8'));
const vieillePartie = () => structuredClone(ANCIENNES.avancee);

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
    for (const sorte of ['four', 'cuisiniere', 'meule', 'nichoir', 'mangeoire', 'bac_semis', 'puits', 'panneau', 'citerne', 'batterie', 'station_robot']) {
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
  const s = structuredClone(ANCIENNES.debut);
  assertEqual(s.maison, { reparee: false }, 'pas réparée');
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
  const s = structuredClone(ANCIENNES.debut);
  assertEqual(convertirPartie(s, '  ').ok, false);
  assert(convertirPartie(s, 'g').ok, 'déménagée');
  assertEqual(convertirPartie(s, 'h').ok, false);
});

test('Déménager au chargement : la migration v46 → v47, une fois, sur la graine de la partie', () => {
  const v46 = vieillePartie();
  assertEqual([v46.version, AVANT_DEMENAGEMENT, farmSeed(v46)], [46, 46, null]);
  const m = migrate({ v: 46, t: 0, s: structuredClone(v46) });
  assertEqual([m.version, farmSeed(m), m.demenagee], [STATE_VERSION, graineDemenagement(v46), true]);
  assertEqual([m.pieces, m.poulailler.niveau, m.paturage.places, m.serre.parcelles.length], [v46.pieces, 5, 25, 56], 'rien ne se perd');
  assert(houseRepaired(m) && m.poulailler.construit && m.paturage.construit && m.serre.construit && m.silo.construit, 'tout est rebâti');
  assertEqual(migrate({ v: STATE_VERSION, t: 0, s: structuredClone(m) }), m, 'recharger ne déménage plus');
  // une partie dont la famille n'est pas encore installée : sa graine seulement
  const neuve = structuredClone(ANCIENNES.debut);
  neuve.famille.configuree = false;
  const n = migrate({ v: 46, t: 0, s: neuve });
  assertEqual([farmSeed(n), n.demenagee, blocsPoses(n), n.potager.parcelles], [graineDemenagement(neuve), undefined, {}, []]);
});
