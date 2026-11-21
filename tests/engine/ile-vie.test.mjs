/* ==========================================================================
   Tests du moteur : l'île en jeu (js/engine/ile/vie.js, sauvegarde.js, controle.js ; docs/ile-300.md,
   étape 6). L'île née de sa graine (la même que le chantier, sous 1 Mo, sans faute) ; la lecture ; les
   règles des modifications (la mer du large, la terre d'un seul tenant, pas de falaise, les places prises) ;
   la récolte, la pousse et la repousse au fil des nuits ; les régions à repeindre ; la sauvegarde entière
   et par régions, aller et retour, même après l'ajout d'une espèce ; les temps.
   Lancer seul : node --test tests/engine/ile-vie.test.mjs (ou node tests/run-tests.mjs ile-vie).
   ========================================================================== */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DATA } from '../../js/engine/catalog.js';
import {
  auLarge,
  catalogue,
  changerHauteur,
  changerSol,
  construireCatalogue,
  creerIle,
  depuisSauvegarde,
  estEau,
  fusionnerRegions,
  genererChantier,
  ILE,
  indice,
  labourable,
  marchable,
  nuit,
  poserObjet,
  recolter,
  regionDe,
  REGIONS,
  regionsModifiees,
  retirerObjet,
  SOL,
  verifierIle,
  versSauvegarde,
  versSauvegardeRegions,
} from '../../js/engine/ile.js';

const N = ILE.TAILLE;
const CAT = catalogue();
const ORIGINE = creerIle('soleil');
const copie = () => structuredClone(ORIGINE);
const num = (id) => CAT.parId.get(id).numero;
const PENTE = Math.floor(DATA.ILE.RELIEF.PENTE_MAX * DATA.ILE.VIE.HAUTEUR);

// La première case (dans l'ordre) qui remplit la condition.
function trouver(ile, condition) {
  for (let i = 0; i < N * N; i++) if (condition(i)) return i;
  throw new Error('aucune case ne convient');
}

const voisines = (i) => [i - 1, i + 1, i - N, i + N];

// Les tableaux de deux îles sont-ils les mêmes ? (et leurs listes)
function memesIles(a, b) {
  for (const k of ['sol', 'hauteur', 'objet', 'etat', 'bloque']) assert.deepEqual(a[k], b[k], k);
  assert.deepEqual([...a.croissance].sort(), [...b.croissance].sort(), 'croissance');
  assert.deepEqual(a.repousse, b.repousse, 'repousse');
}

/* ---------- l'île née de sa graine ---------- */

test('creerIle : la même que le chantier, sans faute, sous 1 Mo ; la même pour la même graine', () => {
  const ch = genererChantier('soleil');
  assert.deepEqual(ORIGINE.sol, ch.sol);
  assert.deepEqual(ORIGINE.objet, ch.objet);
  for (let i = 0; i < N * N; i++) assert.equal(ORIGINE.hauteur[i], Math.round(ch.hauteur[i] * DATA.ILE.VIE.HAUTEUR));
  assert.deepEqual(verifierIle(ORIGINE), []);
  const octets = ['sol', 'hauteur', 'objet', 'etat', 'bloque'].reduce((s, k) => s + ORIGINE[k].byteLength, 0);
  assert.ok(octets < 1024 * 1024, `${octets} octets`);
  memesIles(creerIle('soleil'), ORIGINE);
  assert.ok(ORIGINE.croissance.size > 0, 'aucune plante jeune');
});

test('la lecture : les cases, les régions, l’eau, la marche, le labour', () => {
  assert.equal(indice(7, 3), 3 * N + 7);
  assert.equal(regionDe(0), 0);
  assert.equal(regionDe(N * N - 1), REGIONS - 1);
  assert.ok(auLarge(0) && !auLarge(indice(ILE.APPARITION.x, ILE.APPARITION.y)));
  const ile = ORIGINE;
  const eau = trouver(ile, (i) => estEau(ile, i) && !auLarge(i));
  assert.ok(!marchable(ile, eau) && !labourable(ile, eau));
  const bloc = trouver(ile, (i) => ile.bloque[i] === 1);
  assert.ok(!marchable(ile, bloc) && !labourable(ile, bloc));
  const depart = indice(ILE.APPARITION.x, ILE.APPARITION.y);
  assert.ok(marchable(ile, depart) && labourable(ile, depart));
});

/* ---------- les règles des modifications ---------- */

test('la mer du large ne se touche pas', () => {
  const ile = copie();
  const large = indice(2, 2);
  assert.match(changerSol(ile, large, SOL.sable).raison, /large/);
  assert.match(changerHauteur(ile, large, 1).raison, /large/);
  assert.match(poserObjet(ile, large, num('algues')).raison, /large/);
  memesIles(ile, ORIGINE);
});

test('combler l’eau : une case qui touche la terre, à la hauteur de sa rive ; jamais une terre au milieu de l’eau', () => {
  const ile = copie();
  const rivage = trouver(
    ile,
    (i) => ile.sol[i] === SOL.eau_profonde && !auLarge(i) && voisines(i).some((j) => !estEau(ile, j)),
  );
  assert.equal(changerSol(ile, rivage, SOL.sable).ok, true);
  assert.equal(estEau(ile, rivage), false);
  const rives = voisines(rivage).filter((j) => !estEau(ile, j) && j !== rivage);
  assert.equal(ile.hauteur[rivage], Math.min(...rives.map((j) => ile.hauteur[j])));
  const auLoin = trouver(
    ile,
    (i) => ile.sol[i] === SOL.eau_profonde && !auLarge(i) && voisines(i).every((j) => estEau(ile, j)),
  );
  assert.match(changerSol(ile, auLoin, SOL.sable).raison, /toucher la terre/);
  assert.deepEqual(verifierIle(ile), []);
});

test('creuser : un canal qui couperait l’île en deux est refusé à la dernière case', () => {
  const ile = copie();
  // un carré de 5 × 5 cases dégagé près du départ ; on creuse son pourtour, case après case
  const cx = ILE.APPARITION.x + 14;
  const cy = ILE.APPARITION.y;
  for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) retirerObjet(ile, indice(x, y));
  const tour = [];
  for (let x = cx - 2; x <= cx + 2; x++) tour.push(indice(x, cy - 2));
  for (let y = cy - 1; y <= cy + 2; y++) tour.push(indice(cx + 2, y));
  for (let x = cx + 1; x >= cx - 2; x--) tour.push(indice(x, cy + 2));
  for (let y = cy + 1; y >= cy - 1; y--) tour.push(indice(cx - 2, y));
  assert.equal(tour.length, 16);
  tour.slice(0, -1).forEach((i) => assert.equal(changerSol(ile, i, SOL.eau).ok, true, `case ${i}`));
  assert.match(changerSol(ile, tour[15], SOL.eau).raison, /coupée en deux/);
  assert.deepEqual(verifierIle(ile), []);
});

test('la hauteur : une marche à la fois, jamais de falaise ; ni dans l’eau ni sous un objet', () => {
  const ile = copie();
  const i = indice(ILE.APPARITION.x, ILE.APPARITION.y);
  let marches = 0;
  while (changerHauteur(ile, i, 1).ok) marches++;
  assert.ok(marches >= 1 && marches <= Math.ceil((2 * PENTE) / DATA.ILE.VIE.MARCHE));
  assert.match(changerHauteur(ile, i, 1).raison, /raide/);
  for (const j of voisines(i)) assert.ok(Math.abs(ile.hauteur[i] - ile.hauteur[j]) <= PENTE);
  const eau = trouver(ile, (j) => estEau(ile, j) && !auLarge(j));
  assert.match(changerHauteur(ile, eau, 1).raison, /eau/);
  const occupee = trouver(ile, (j) => ile.objet[j] > 0);
  assert.match(changerHauteur(ile, occupee, -1).raison, /occupée/);
  assert.deepEqual(verifierIle(ile), []);
});

test('poser et retirer : la place prise, l’eau pour ce qui y pousse, l’empreinte d’un bloc', () => {
  const ile = copie();
  const libre = trouver(ile, (i) => labourable(ile, i) && ile.sol[i] === SOL.herbe && labourable(ile, i + 1));
  assert.equal(poserObjet(ile, libre, num('feuillu')).ok, true);
  assert.equal(ile.bloque[libre], 1);
  assert.equal(marchable(ile, libre), false);
  assert.match(poserObjet(ile, libre, num('coquelicot')).raison, /prise/);
  const eau = trouver(ile, (i) => ile.sol[i] === SOL.eau_basse && !ile.objet[i]);
  assert.match(poserObjet(ile, eau, num('feuillu')).raison, /eau/);
  assert.equal(poserObjet(ile, eau, num('nenuphar')).ok, true);
  assert.equal(retirerObjet(ile, libre), num('feuillu'));
  assert.equal(ile.bloque[libre], 0);
  assert.equal(retirerObjet(ile, libre), 0);
  assert.deepEqual(verifierIle(ile), []);
});

/* ---------- la récolte et les nuits ---------- */

test('une culture sauvage : cueillie mûre, elle repart du premier stade et regagne un stade par nuit', () => {
  const ile = copie();
  const ble = num('ble_sauvage');
  const f = CAT.fiches[ble - 1];
  const i = trouver(ile, (j) => ile.objet[j] === ble && ile.etat[j] === f.stades - 1);
  assert.equal(recolter(ile, i, 1).ok, true);
  assert.equal(ile.etat[i], 0);
  assert.match(recolter(ile, i, 1).raison, /mûr/);
  for (let jour = 1; jour < f.stades; jour++) nuit(ile, jour);
  assert.equal(ile.etat[i], f.stades - 1);
  assert.equal(ile.croissance.has(i), false);
  assert.equal(recolter(ile, i, f.stades).ok, true);
});

test('un fruitier sauvage pousse plus lentement (NUITS_PAR_STADE)', () => {
  const ile = copie();
  const pommier = num('pommier_sauvage');
  const i = trouver(ile, (j) => ile.objet[j] === pommier && ile.etat[j] === CAT.fiches[pommier - 1].stades - 1);
  recolter(ile, i, 0);
  const nuits = DATA.ILE.VIE.NUITS_PAR_STADE.fruitier;
  for (let jour = 1; jour <= nuits; jour++) nuit(ile, jour);
  assert.equal(ile.etat[i], 1);
});

test('un arbre coupé repousse à sa place après son retour ; une place prise, il ne revient pas', () => {
  const ile = copie();
  const feuillu = num('feuillu');
  const [a, b] = CAT.fiches[feuillu - 1].recolte.retour;
  const arbres = [];
  for (let j = 0; j < N * N && arbres.length < 2; j++) if (ile.objet[j] === feuillu) arbres.push(j);
  for (const i of arbres) assert.equal(recolter(ile, i, 10).ok, true);
  assert.equal(ile.objet[arbres[0]], 0);
  assert.equal(ile.repousse.length, 2);
  // sur la place du second, on pose une pierre
  assert.equal(poserObjet(ile, arbres[1], num('pierres')).ok, true);
  for (let jour = 10; jour < 10 + a; jour++) nuit(ile, jour);
  assert.equal(ile.objet[arbres[0]], 0, 'trop tôt');
  for (let jour = 10 + a; jour <= 10 + b; jour++) nuit(ile, jour);
  assert.equal(ile.objet[arbres[0]], feuillu);
  assert.equal(ile.objet[arbres[1]], num('pierres'));
  assert.equal(ile.repousse.length, 0);
  assert.deepEqual(verifierIle(ile), []);
});

test('la nuit ne touche que ce qui pousse et repousse, en moins de 2 ms', () => {
  const ile = copie();
  const avant = structuredClone(ile);
  const debut = performance.now();
  nuit(ile, 1);
  const duree = performance.now() - debut;
  for (let i = 0; i < N * N; i++) {
    if (ile.etat[i] !== avant.etat[i]) assert.ok(avant.croissance.has(i), `la case ${i} a changé sans pousser`);
  }
  assert.deepEqual(ile.sol, avant.sol);
  assert.ok(duree < 2, `${duree.toFixed(2)} ms`);
});

/* ---------- les régions et la sauvegarde ---------- */

test('les régions à repeindre : celle de chaque changement, une fois', () => {
  const ile = copie();
  const i = indice(ILE.APPARITION.x, ILE.APPARITION.y);
  changerHauteur(ile, i, 1);
  assert.deepEqual(regionsModifiees(ile), [regionDe(i)]);
  assert.deepEqual(regionsModifiees(ile), []);
});

// Quelques modifications de toutes sortes, pour la sauvegarde.
function modifier(ile) {
  const d = indice(ILE.APPARITION.x, ILE.APPARITION.y);
  changerHauteur(ile, d, 1);
  poserObjet(ile, d + 3, num('pommier_sauvage'), 1);
  const ble = trouver(ile, (j) => ile.objet[j] === num('ble_sauvage') && ile.etat[j] > 0);
  ile.etat[ble] = CAT.fiches[num('ble_sauvage') - 1].stades - 1;
  recolter(ile, ble, 3);
  recolter(
    ile,
    trouver(ile, (j) => ile.objet[j] === num('sapin')),
    3,
  );
  changerSol(
    ile,
    trouver(ile, (j) => ile.sol[j] === SOL.eau_profonde && !auLarge(j) && voisines(j).some((k) => !estEau(ile, k))),
    SOL.sable,
  );
  nuit(ile, 4);
}

test('la sauvegarde entière : aller et retour, par JSON, sous 300 Ko', () => {
  const ile = copie();
  modifier(ile);
  const s = JSON.parse(JSON.stringify(versSauvegarde(ile)));
  assert.equal(ile.aSauver.size, 0);
  const relue = depuisSauvegarde(s);
  memesIles(relue, ile);
  assert.deepEqual(verifierIle(relue), []);
  assert.ok(JSON.stringify(s).length < 300 * 1024, `${JSON.stringify(s).length} octets`);
});

test('la sauvegarde par régions : un geste du jour, une région, en moins de 2 ms', () => {
  const ile = copie();
  const i = indice(ILE.APPARITION.x, ILE.APPARITION.y);
  changerHauteur(ile, i, 1);
  versSauvegardeRegions(ile); // (une première écriture, à chaud)
  changerHauteur(ile, i, -1);
  const debut = performance.now();
  const partielle = versSauvegardeRegions(ile);
  const duree = performance.now() - debut;
  assert.deepEqual(
    partielle.regions.map((r) => r.r),
    [regionDe(i)],
  );
  assert.equal(ile.aSauver.size, 0);
  assert.ok(duree < 2, `${duree.toFixed(2)} ms`);
});

test('la sauvegarde par régions : fusionnées dans la sauvegarde entière, l’île à jour (après une nuit aussi)', () => {
  const ile = copie();
  const entiere = versSauvegarde(ile);
  modifier(ile);
  const premiere = JSON.parse(JSON.stringify(versSauvegardeRegions(ile)));
  nuit(ile, 5);
  recolter(
    ile,
    trouver(ile, (j) => ile.objet[j] === num('rocher')),
    5,
  );
  const seconde = JSON.parse(JSON.stringify(versSauvegardeRegions(ile)));
  memesIles(depuisSauvegarde(fusionnerRegions(entiere, [premiere, seconde])), ile);
});

test('une sauvegarde se relit après l’ajout d’une espèce au jeu (les numéros changent, pas les espèces)', () => {
  const ile = copie();
  modifier(ile);
  const s = versSauvegarde(ile);
  const data = structuredClone(DATA);
  data.CULTURES.radis = { ...structuredClone(DATA.CULTURES.carotte), nom: 'Radis' };
  data.OBJETS.radis = { ...structuredClone(DATA.OBJETS.carotte), nom: 'Radis' };
  const autre = construireCatalogue(data);
  assert.notEqual(autre.parId.get('pommier_sauvage').numero, CAT.parId.get('pommier_sauvage').numero);
  const relue = depuisSauvegarde(s, autre);
  for (let i = 0; i < N * N; i++) {
    const avant = ile.objet[i] ? CAT.fiches[ile.objet[i] - 1].id : '';
    const apres = relue.objet[i] ? autre.fiches[relue.objet[i] - 1].id : '';
    if (avant !== apres) assert.fail(`case ${i} : ${avant} devenu ${apres}`);
  }
});

test('une sauvegarde d’un autre format est refusée ; le contrôle trouve une falaise et la mer touchée', () => {
  const s = versSauvegarde(copie());
  assert.throws(() => depuisSauvegarde({ ...s, version: 999 }), /format/);
  const ile = copie();
  const i = indice(ILE.APPARITION.x, ILE.APPARITION.y);
  ile.hauteur[i] += 3 * PENTE;
  ile.objet[indice(1, 1)] = num('algues');
  const erreurs = verifierIle(ile).join('\n');
  assert.match(erreurs, /falaise/);
  assert.match(erreurs, /large/);
});
