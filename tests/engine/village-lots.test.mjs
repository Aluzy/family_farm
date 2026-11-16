/* ==========================================================================
   Tests du moteur : les calculs gardés le temps d'un pas (fiche I9g, les performances ; docs/ile.md, « Les
   performances »). Ce qui parcourt tous les blocs posés (les pièces closes, les maisons des villageois, les cases
   couvertes, le quai, les cases devant un comptoir, le nombre de blocs et de sols) n'est relevé qu'une fois par pas « en
   lot » (js/engine/blocs.js enLot) : le pas du monde (I9d), et depuis I9g le tick de la page, le pas de la ferme, la nuit
   (advanceNight, runNight). Les pièces closes se reconnaissent sans refaire le texte de tous les blocs.
   Ce qui est verrouillé : le même résultat, octet pour octet, avec et sans ces calculs gardés (reglerLots({ sans })) ;
   aucun calcul gardé ne change pendant son lot (reglerLots({ verifier }) : chacun refait et comparé) ; les maisons
   relevées d'un coup sont celles de chaque boîte.
   Lancer seul : node tests/run-tests.mjs village-lots.
   ========================================================================== */

import {
  arriverVillageois, attribuer, avancerJusqua, bedtimeDue, blocsPoses, commencerObjectifs, createNewGame, DATA, donnerOutil, farmSeed,
  horlogeDe, maisonDeBoite, maisonsMarquees, nightActive, pasDuMonde, piecesCloses, portDuMonde, roleDemande, simulatePlay,
  startNight, testMaisonVillageois, tick, villageoisDe,
} from '../../js/engine/index.js';
import { reglerLots } from '../../js/engine/blocs.js';
import { assert, assertEqual, boite, partie, test } from './aide.mjs';

const cloner = (v) => JSON.parse(JSON.stringify(v));
const texte = (s) => JSON.stringify(s);
const PAS_PAR_HEURE = (DATA.TEMPS.SECONDES_PAR_HEURE * 1000) / DATA.VILLAGE.EN_LIGNE.PAS_MS;   // 6

// Avec les réglages des lots `r` le temps de `f` (puis comme dans le jeu).
function avec(r, f) {
  reglerLots(r);
  try { return f(); } finally { reglerLots(); }
}

// L'île des tests d'I9d (village-en-ligne.test.mjs) : `n` maisons et leurs villageois, une tâche et son outil à chacun.
const TACHES = [['bois', 'hache'], ['pierre', 'pioche'], ['fauchage', 'faux'], ['cueillette', null], ['peche', 'canne']];
function ile(n, { monde = true } = {}) {
  const s = partie(1);
  portDuMonde(farmSeed(s));
  boite(s, { pain: 200 });
  for (let k = 0; k < n; k++) assert(testMaisonVillageois(s).ok, `la maison ${k + 1}`);
  for (let k = 0; k < n; k++) assert(arriverVillageois(s, { direct: true }).ok, `le villageois ${k + 1}`);
  s.outils = { hache: true, pioche: true, faux: true, canne: true, choisi: 'hache' };
  villageoisDe(s).forEach((v, i) => {
    const [t, o] = TACHES[i % TACHES.length];
    if (o) { s.outils[o] = true; assert(donnerOutil(s, v.id, o).ok, `${v.id} : ${o}`); }
    assert(attribuer(s, v.id, t).ok, `${v.id} : ${t}`);
  });
  if (monde) { s.mondePartage = true; horlogeDe(s); s.amities = {}; s.energies = {}; }
  s.awakeMs = 0;
  return s;
}
// Une journée de la page en solo : tick d'une seconde jusqu'à 22 h, la nuit jusqu'au réveil.
function journeeSolo(s) {
  while (!nightActive(s)) { tick(s, 1); if (bedtimeDue(s)) startNight(s); }
  while (nightActive(s)) tick(s, 1);
  s.reveil = false;
}

test('I9g : le pas du monde (jour, nuit, minuit) donne la même partie, octet pour octet, avec et sans les calculs gardés', () => {
  const a = ile(8), b = cloner(a);
  for (let h = 1; h <= 30; h++) {
    avancerJusqua(a, h * PAS_PAR_HEURE);
    avec({ sans: true }, () => avancerJusqua(b, h * PAS_PAR_HEURE));
    assertEqual(texte(a), texte(b), `la même partie à la ${h}e heure`);
  }
  assert(a.day >= 2 && villageoisDe(a).some((v) => v.travail && v.travail.actions > 0), 'une journée, une nuit, du travail');
});

test('I9g : en solo, le tick de la page et la nuit donnent la même partie avec et sans les calculs gardés', () => {
  const a = ile(6, { monde: false }), b = cloner(a);
  for (let j = 0; j < 2; j++) {
    journeeSolo(a);
    avec({ sans: true }, () => journeeSolo(b));
    assertEqual(texte(a), texte(b), `la même partie au matin du jour ${a.day}`);
  }
});

test('I9g : le joueur automatique (sleep, runNight seule) joue la même partie avec et sans les calculs gardés', () => {
  const jouer = () => { const s = createNewGame(1, { nom: 'Simulation' }); commencerObjectifs(s); simulatePlay(s, 'applique', 25); return s; };
  const a = jouer(), b = avec({ sans: true }, jouer);
  assertEqual(texte(a), texte(b), 'la même partie après 25 nuits');
  assert((a.villageois || []).length >= 1, 'un village');
});

test('I9g : aucun calcul gardé ne change pendant son lot (chacun refait et comparé), sur l\'île en ligne et en solo', () => {
  avec({ verifier: true }, () => {
    const s = ile(10);
    avancerJusqua(s, 28 * PAS_PAR_HEURE);
    assert(s.day >= 2, 'une journée et une nuit jouées');
    const t = ile(5, { monde: false });
    journeeSolo(t);
  });
});

test('I9g : les pièces closes reconnues sans refaire le texte des blocs : les mêmes, gardées tant que les blocs sont les mêmes', () => {
  const s = ile(3, { monde: false });
  const p0 = piecesCloses(s);
  // (les mêmes blocs, dans un autre objet : la même liste, comme avant)
  s.blocs = { ...s.blocs };
  assert(piecesCloses(s) === p0, 'les mêmes blocs, recopiés : la même liste');
  const ref = avec({ sans: true }, () => texte(piecesCloses(cloner(s))));
  assertEqual(texte(piecesCloses(s)), ref, 'le même relevé que sans');
  // (une porte reprise : la pièce s'ouvre, le relevé change ; remise, il revient)
  const porte = p0[0].portes[0], sorte = s.blocs[porte];
  delete s.blocs[porte];
  const p1 = piecesCloses(s);
  assert(p1 !== p0 && p1.length === p0.length - 1, 'une pièce de moins');
  assertEqual(texte(p1), avec({ sans: true }, () => texte(piecesCloses(cloner(s)))), 'sans la porte : le même relevé que sans');
  s.blocs[porte] = sorte;
  assertEqual(texte(piecesCloses(s)), ref, 'la porte remise : le relevé d\'avant');
  // (une autre sorte sur une case : relevé à nouveau)
  const mur = Object.keys(blocsPoses(s)).find((k) => DATA.ATELIER.BLOCS[s.blocs[k]] && DATA.ATELIER.BLOCS[s.blocs[k]].ferme && !DATA.ATELIER.BLOCS[s.blocs[k]].porte);
  s.blocs[mur] = 'paillasse';
  assertEqual(texte(piecesCloses(s)), avec({ sans: true }, () => texte(piecesCloses(cloner(s)))), 'un mur changé : le même relevé que sans');
});

test('I9g : les maisons marquées, relevées d\'un coup, sont celles de chaque boîte ; le contrôle d\'un retrait sur une île est rapide', () => {
  const s = ile(12);
  const M = maisonsMarquees(s);
  assertEqual(M.length, 12, 'douze maisons');
  for (const m of M) assert(maisonDeBoite(s, m.boite) === m.piece, `la maison de la boîte ${m.boite}`);
  const v = villageoisDe(s).find((x) => Number.isInteger(x.maison)), dedans = new Set(M.find((m) => m.boite === v.maison).piece.cases);
  let mur = null;
  for (const t of dedans) for (const d of [-1, 1]) if (mur === null && !dedans.has(t + d)) mur = t + d;
  const t0 = performance.now();
  for (let i = 0; i < 100; i++) assertEqual(roleDemande(s, { type: 'bloc.reprendre', args: { case: mur } }), 'proprietaire', 'le mur d\'une maison habitée');
  const ms = (performance.now() - t0) / 100;
  assert(ms < 5, `un contrôle : ${ms.toFixed(2)} ms`);
});

test('I9g : un pas dans le pas (la nuit dans le pas du monde) garde le lot du pas : rien de changé', () => {
  const a = ile(4), b = cloner(a);
  for (let i = 0; i < 26 * PAS_PAR_HEURE; i++) pasDuMonde(a);
  avec({ sans: true }, () => { for (let i = 0; i < 26 * PAS_PAR_HEURE; i++) pasDuMonde(b); });
  assertEqual(texte(a), texte(b), 'la même partie');
});
