/* ==========================================================================
   Tests du moteur : B-1, le jardinage sans pénalité (la décision F.5 : les systèmes « survie » sont
   gardés, sans pénalité). DATA.PENALITES (data/general.json) coupe la péremption, l'usure, la baisse
   du bonheur la nuit, la nuit sans « Dormir », la série de pontes remise à zéro et la ration perdue ;
   des réglages coupent le reste (le réveil, la faim, la nuit sans couchage, la dérive de confiance, le
   cheval). Le critère : aucune perte d'objet ou de bonheur subie par absence ou oubli.
   Ces tests posent les réglages du jeu (sansPenalite) ; les autres fichiers gardent ceux d'avant.
   Lancer seul : node --test tests/engine/sans-penalite.test.mjs (ou node tests/run-tests.mjs sans-penalite).
   ========================================================================== */

import {
  addItem, advanceNight, allDevices, awakeMsAtHour, countItem, DATA, migrate, nightLengthMs, objectiveChapter, runNight, startNight,
  testFarmMap, testFermeConstruite, tick,
} from '../../js/engine/index.js';
import { assert, assertEqual, garden, PENALITES_DU_JEU, sansPenalite, test } from './aide.mjs';

// La ferme d'essai (F0-6 : des maisons meublées, des bêtes, des appareils, un frigo), avec des
// aliments qui périmaient en quelques nuits.
function ferme() {
  const s = garden();
  testFarmMap(s, '42');
  testFermeConstruite(s);
  for (const [o, n] of [['carotte', 20], ['oeuf', 12], ['lait', 6], ['tomate', 10], ['fraise', 8], ['baies', 5]]) addItem(s, o, n);
  return s;
}

// Une journée où le joueur ne fait rien (les appareils tournent), puis une nuit qui vient seule :
// il n'a pas touché « Dormir ».
function journeeSansRien(s) {
  for (let h = 0; h < 16; h++) tick(s, DATA.TEMPS.SECONDES_PAR_HEURE);
  s.awakeMs = Math.max(s.awakeMs, awakeMsAtHour(DATA.TEMPS.HEURE_NUIT));
  if (startNight(s)) advanceNight(s, nightLengthMs());
}

test('B-1 : les réglages du jeu coupent chaque pénalité', () => {
  assertEqual(PENALITES_DU_JEU.PENALITES, { PEREMPTION: false, USURE: false, BONHEUR_BAISSE: false, NUIT_SANS_DORMIR: false, SERIE_REMISE: false, RATION_PERDUE: false });
  assertEqual([PENALITES_DU_JEU.FAIM, PENALITES_DU_JEU.SANS_COUCHAGE, PENALITES_DU_JEU.DERIVE, PENALITES_DU_JEU.REVEIL_REPAS], [0, 0, 0, 0]);
  assertEqual(PENALITES_DU_JEU.CHEVAL, DATA.CHEVAL.VITESSE, 'un cheval pas nourri va aussi vite');
});

test('B-1 : 30 jours sans rien faire, rien n\'est perdu (aliments, appareils, bonheur, confiance)', () => sansPenalite(() => {
  const s = ferme();
  const avant = Object.fromEntries(Object.keys(DATA.OBJETS).map((o) => [o, countItem(s, o)]));
  const bonheur = () => s.famille.membres.map((m) => m.bonheur);
  const confiance = () => JSON.stringify(Object.values((s.recit && s.recit.confiance) || {}));
  const b0 = bonheur(), c0 = confiance();
  let perdus = 0;
  for (let j = 0; j < 30; j++) {
    const b = bonheur();
    journeeSansRien(s);
    perdus += Object.values((s.report && s.report.perimes) || {}).reduce((t, n) => t + n, 0);
    bonheur().forEach((x, i) => assert(x >= b[i], `jour ${j + 1} : le bonheur de ${s.famille.membres[i].id} a baissé (${b[i]} → ${x})`));
  }
  assertEqual(perdus, 0, 'rien n\'a péri');
  for (const [o, n] of Object.entries(avant)) assert(countItem(s, o) >= n || DATA.OBJETS[o].mangeable, `${o} : ${n} → ${countItem(s, o)}`);
  for (const o of ['carotte', 'oeuf', 'lait', 'tomate', 'fraise', 'baies']) assert(countItem(s, o) >= avant[o], `${o} gardé`);
  assert(allDevices(s).every((d) => d.usure === 0 && d.usureMs === 0), 'aucun appareil usé');
  assert(bonheur().every((x, i) => x >= b0[i]));
  assertEqual(confiance(), c0, 'la confiance des hameaux n\'a pas dérivé');
}));

test('B-1 : une nuit venue seule rend l\'énergie ; le réveil ne dépend pas du repas de la famille', () => sansPenalite(() => {
  const s = ferme();
  s.energie = 10;
  for (const m of s.famille.membres) m.affame = true;
  journeeSansRien(s);
  assert(s.energie >= DATA.PERSONNAGE.REVEIL_BASE * 0.99 || s.energie >= 99, `énergie au réveil : ${s.energie}`);
}));

test('B-1 : la faim ne fait plus baisser le bonheur ; une nuit sans couchage non plus', () => sansPenalite(() => {
  const s = ferme();
  for (const m of s.famille.membres) { m.bonheur = 90; m.affame = true; }
  runNight(s);
  assert(s.famille.membres.every((m) => m.bonheur >= 90), JSON.stringify(s.famille.membres.map((m) => m.bonheur)));
}));

test('B-1 : la série de pontes ne repart pas de zéro après une nuit sans œuf', () => sansPenalite(() => {
  const s = ferme();
  // (au chapitre qui compte la série, pas encore fini)
  s.campagne.fini = false;
  s.campagne.chapitre = objectiveChapter('pontes');
  const k = s.campagne.compteurs;
  k.serieOeufs = 4;
  s.poulailler.nourries = 0;
  runNight(s);
  assert(k.serieOeufs >= 4, `série : ${k.serieOeufs}`);
}));

test('B-1 : la ration entamée des poules se garde ; un cheval pas nourri n\'est pas ralenti', () => sansPenalite(() => {
  const s = ferme();
  s.poulailler.restes = 1;
  runNight(s);
  assertEqual(s.poulailler.restes, 1);
  assertEqual(DATA.CHEVAL.VITESSE_FAIM, DATA.CHEVAL.VITESSE, 'cheval : la même vitesse, nourri ou pas (vitesseCheval)');
}));

test('B-1 : une partie d\'avant (v70) retrouve ses appareils à neuf, rallumés s\'ils étaient en panne', () => {
  const s = ferme();
  const L = allDevices(s);
  L[0].usure = DATA.USURE.PANNE; L[0].allume = false;
  if (L[1]) { L[1].usure = 42; L[1].usureMs = 999; }
  const m = migrate({ v: 70, t: 0, s: { ...JSON.parse(JSON.stringify(s)), version: 70 } });
  assertEqual(m.version, 71);
  const M = allDevices(m);
  assert(M.every((d) => d.usure === 0 && d.usureMs === 0), 'à neuf');
  assertEqual(M[0].allume, true, 'la panne l\'avait éteint : rallumé');
});
