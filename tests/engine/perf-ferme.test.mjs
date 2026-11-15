/* ==========================================================================
   Tests du moteur : la ferme d'essai des mesures de performance (F0-6, docs/perf.md ;
   js/engine/testmode.js, testFermeConstruite) : bâtie d'un coup, elle a ses bâtiments, des maisons
   meublées avec un étage, un jardin ; elle se sauvegarde et se relit telle quelle.
   Lancer seul : node --test tests/engine/perf-ferme.test.mjs (ou node tests/run-tests.mjs perf-ferme).
   ========================================================================== */

import {
  addItem, arriverVillageois, attribuer, blocsPoses, DATA, donnerOutil, empreintePartie, escaliers, etageBlocs, farmSeed, horlogeDe,
  migrate, nightActive, pasDuMonde, piecesCloses, portDuMonde, poseStatus, testFarmMap, testFermeConstruite, testMaisonVillageois,
  villageoisDe,
} from '../../js/engine/index.js';
import { assert, assertEqual, avecVillage, boite, garden, partie, test } from './aide.mjs';

test('la ferme d\'essai : bâtiments, maisons meublées avec un étage, jardin ; sauvegardée et relue telle quelle', () => {
  const s = garden();
  testFarmMap(s, '42');
  const r = testFermeConstruite(s);
  assert(r.ok);
  const B = blocsPoses(s), sortes = Object.values(B), A = DATA.ATELIER.BLOCS;
  assertEqual(r.poses, sortes.length, 'tout ce qui est posé est compté');
  assert(sortes.length > 300, `${sortes.length} blocs`);
  assert(sortes.filter((x) => A[x].meuble).length >= 60, 'des meubles dans les maisons');
  for (const b of ['nichoir', 'mangeoire', 'meule', 'bac_semis', 'puits', 'pergola']) if (A[b]) assert(sortes.includes(b) || Object.values(s.blocsDessus || {}).includes(b), b);
  assert(s.poulailler.construit && s.silo.construit && s.serre.construit, 'les bâtiments sont reconnus');
  assertEqual(escaliers(s).length, 2, 'deux maisons à étage');
  assert(Object.keys(etageBlocs(s)).length >= 8, 'des paillasses à l\'étage');
  assert(piecesCloses(s).length >= 6, 'des pièces closes');
  // sauvegardée (JSON) et relue : la même partie
  const lue = migrate(JSON.parse(JSON.stringify({ v: s.version, t: 0, s })));
  assertEqual(empreintePartie(lue), empreintePartie(s));
});

// Le mode Construire teste chaque case visible (les cases où le bloc en main se pose, en blanc ;
// js/farm-stage.js syncConstructible) : un mur en main, avec un étage, ne doit pas recalculer les pièces
// closes pour chacune (une grosse partie : 2,4 s par image au lieu de quelques millisecondes).
test('Construire, un mur en main : tester 2 000 cases de la ferme d\'essai prend moins d\'une seconde', () => {
  const s = garden();
  testFarmMap(s, '42');
  testFermeConstruite(s);
  addItem(s, DATA.ATELIER.BLOCS.mur_pierre.objet, 5);
  const W = 644, coin = Math.min(...Object.keys(etageBlocs(s)).map(Number));
  const cases = [];
  for (let dy = -20; dy < 20; dy++) for (let dx = -25; dx < 25; dx++) cases.push(coin + dy * W + dx);
  poseStatus(s, 'mur_pierre', cases[0]);   // (le terrain tiré une fois)
  const t0 = performance.now();
  let ok = 0;
  for (const t of cases) if (poseStatus(s, 'mur_pierre', t).ok) ok++;
  const ms = performance.now() - t0;
  assert(ok > 0, 'des cases où le mur se pose');
  assert(ms < 1000, `${cases.length} cases en ${Math.round(ms)} ms`);
});

// I9g (les performances, docs/fiches/ile/I9g-performances.md) : la garde d'un village de quinze. Minuit (la nuit du
// village, runNight) relevait les pièces closes pour chaque villageois : 64 ms en moyenne (au plus 131) sur l'île du
// joueur automatique avant I9g, 9 à 12 ms après (scripts/cout-performances.mjs). La borne laisse la place d'une machine
// lente (le moteur d'avant I9g ne la tenait pas : 37 ms au mieux sur cette île) ; la partie d'une île de quinze tient dans le plafond d'un monde en ligne (VILLAGE.EN_LIGNE.PARTIE_KO).
test('I9g : la nuit d\'un village de quinze (minuit, un pas du monde) reste sous 30 ms ; sa partie sous le plafond d\'un monde', () => avecVillage(() => {
  const s = partie(1);
  portDuMonde(farmSeed(s));
  boite(s, { pain: 200 });
  for (let k = 0; k < 15; k++) assert(testMaisonVillageois(s).ok, `la maison ${k + 1}`);
  for (let k = 0; k < 15; k++) assert(arriverVillageois(s, { direct: true }).ok, `le villageois ${k + 1}`);
  const T = [['bois', 'hache'], ['pierre', 'pioche'], ['fauchage', 'faux'], ['cueillette', null], ['peche', 'canne']];
  s.outils = { hache: true, pioche: true, faux: true, canne: true, choisi: 'hache' };
  villageoisDe(s).forEach((v, i) => { const [t, o] = T[i % T.length]; if (o) { s.outils[o] = true; donnerOutil(s, v.id, o); } attribuer(s, v.id, t); });
  s.mondePartage = true; horlogeDe(s); s.amities = {}; s.energies = {}; s.awakeMs = 0;
  const minuits = [];
  for (let i = 0; i < 2 * 144 + 30 && minuits.length < 2; i++) {
    const avant = nightActive(s) && !s.nuitEnCours.minuit;
    const t0 = performance.now();
    pasDuMonde(s);
    if (avant && s.nuitEnCours && s.nuitEnCours.minuit) minuits.push(performance.now() - t0);
  }
  assertEqual(minuits.length, 2, 'deux minuits');
  const ms = Math.min(...minuits), ko = JSON.stringify(s).length / 1024;
  console.log(`   (quinze villageois : minuit ${minuits.map((x) => x.toFixed(1)).join(' et ')} ms ; la partie ${ko.toFixed(0)} Ko)`);
  assert(ms < 30, `minuit : ${ms.toFixed(1)} ms`);
  assert(ko < DATA.VILLAGE.EN_LIGNE.PARTIE_KO, `la partie : ${ko.toFixed(0)} Ko`);
}));
