/* ==========================================================================
   Tests du moteur : l'île en jeu (js/engine/ile/vie.js, sauvegarde.js, controle.js ; docs/ile-300.md,
   étape 6). L'île née de sa graine (la même que le chantier, plate, sous 1 Mo, sans faute) ; la lecture ;
   les règles des modifications (la mer du large, la terre d'un seul tenant, les places prises) ; la
   récolte (une culture sauvage ne repousse pas, un fruitier garde sa taille et refait ses fruits, la vigne
   revient à son stade de vivace, un arbre coupé repousse), la pousse au fil des nuits ; les régions à
   repeindre ; la sauvegarde entière et par régions, aller et retour, même après l'ajout d'une espèce ; les
   temps.
   Lancer seul : node --test tests/engine/ile-vie.test.mjs (ou node tests/run-tests.mjs ile-vie).
   ========================================================================== */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DATA } from '../../js/engine/catalog.js';
import {
  auLarge,
  catalogue,
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
const fiche = (id) => CAT.fiches[num(id) - 1];
const DEPART = indice(ILE.APPARITION.x, ILE.APPARITION.y);

// La première case (dans l'ordre) qui remplit la condition.
function trouver(condition) {
  for (let i = 0; i < N * N; i++) if (condition(i)) return i;
  throw new Error('aucune case ne convient');
}

const voisines = (i) => [i - 1, i + 1, i - N, i + N];

// Un pied mûr de l'espèce `id` sur l'île.
const unPiedMur = (ile, id) => trouver((j) => ile.objet[j] === num(id) && ile.etat[j] === fiche(id).stades - 1);

// Les tableaux de deux îles sont-ils les mêmes ? (et leurs listes)
function memesIles(a, b) {
  for (const k of ['sol', 'objet', 'etat', 'bloque']) assert.deepEqual(a[k], b[k], k);
  const triee = (m) => [...m].sort((x, y) => x[0] - y[0]);
  assert.deepEqual(triee(a.croissance), triee(b.croissance), 'croissance');
  assert.deepEqual(a.repousse, b.repousse, 'repousse');
}

/* ---------- l'île née de sa graine ---------- */

test('creerIle : la même que le chantier, plate, sans faute, sous 1 Mo ; la même pour la même graine', () => {
  const ch = genererChantier('soleil');
  assert.deepEqual(ORIGINE.sol, ch.sol);
  assert.deepEqual(ORIGINE.objet, ch.objet);
  assert.equal(ORIGINE.hauteur, undefined, 'le relief ne passe pas dans l’île');
  assert.deepEqual(verifierIle(ORIGINE), []);
  const octets = ['sol', 'objet', 'etat', 'bloque'].reduce((s, k) => s + ORIGINE[k].byteLength, 0);
  assert.ok(octets < 1024 * 1024, `${octets} octets`);
  memesIles(creerIle('soleil'), ORIGINE);
  assert.ok(ORIGINE.croissance.size > 0, 'aucune plante jeune');
});

test('la lecture : les cases, les régions, l’eau, la marche, le labour', () => {
  assert.equal(indice(7, 3), 3 * N + 7);
  assert.equal(regionDe(0), 0);
  assert.equal(regionDe(N * N - 1), REGIONS - 1);
  assert.ok(auLarge(0) && !auLarge(DEPART));
  const ile = ORIGINE;
  const eau = trouver((i) => estEau(ile, i) && !auLarge(i));
  assert.ok(!marchable(ile, eau) && !labourable(ile, eau));
  const bloc = trouver((i) => ile.bloque[i] === 1);
  assert.ok(!marchable(ile, bloc) && !labourable(ile, bloc));
  assert.ok(marchable(ile, DEPART) && labourable(ile, DEPART));
});

/* ---------- les règles des modifications ---------- */

test('la mer du large ne se touche pas', () => {
  const ile = copie();
  const large = indice(2, 2);
  assert.match(changerSol(ile, large, SOL.sable).raison, /large/);
  assert.match(poserObjet(ile, large, num('algues')).raison, /large/);
  memesIles(ile, ORIGINE);
});

test('combler l’eau : une case qui touche la terre ; jamais une terre au milieu de l’eau', () => {
  const ile = copie();
  const rivage = trouver(
    (i) => ile.sol[i] === SOL.eau_profonde && !auLarge(i) && voisines(i).some((j) => !estEau(ile, j)),
  );
  assert.equal(changerSol(ile, rivage, SOL.sable).ok, true);
  assert.equal(estEau(ile, rivage), false);
  const auLoin = trouver(
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

test('changer le sol : pas sous un objet', () => {
  const ile = copie();
  const occupee = trouver((j) => ile.objet[j] > 0 && !estEau(ile, j) && !auLarge(j));
  assert.match(changerSol(ile, occupee, SOL.terre).raison, /occupée/);
  assert.equal(changerSol(ile, DEPART, SOL.terre).ok, true);
});

test('poser et retirer : la place prise, l’eau pour ce qui y pousse, l’empreinte d’un bloc', () => {
  const ile = copie();
  const libre = trouver((i) => labourable(ile, i) && ile.sol[i] === SOL.herbe && labourable(ile, i + 1));
  assert.equal(poserObjet(ile, libre, num('feuillu')).ok, true);
  assert.equal(ile.bloque[libre], 1);
  assert.equal(marchable(ile, libre), false);
  assert.match(poserObjet(ile, libre, num('coquelicot')).raison, /prise/);
  const eau = trouver((i) => ile.sol[i] === SOL.eau_basse && !ile.objet[i]);
  assert.match(poserObjet(ile, eau, num('feuillu')).raison, /eau/);
  assert.equal(poserObjet(ile, eau, num('nenuphar')).ok, true);
  assert.equal(retirerObjet(ile, libre), num('feuillu'));
  assert.equal(ile.bloque[libre], 0);
  assert.equal(retirerObjet(ile, libre), 0);
  assert.deepEqual(verifierIle(ile), []);
});

/* ---------- la récolte et les nuits ---------- */

test('une culture sauvage récoltée (mûre) s’en va et ne repousse pas', () => {
  const ile = copie();
  for (const id of ['ble_sauvage', 'ail_ours_sauvage', 'salicorne_sauvage']) {
    const f = fiche(id);
    if (f.stades > 1) {
      const jeune = trouver((j) => ile.objet[j] === f.numero && ile.etat[j] < f.stades - 1);
      assert.match(recolter(ile, jeune, 1).raison, /mûr/, id);
    }
    const i = unPiedMur(ile, id);
    assert.equal(recolter(ile, i, 1).ok, true, id);
    assert.equal(ile.objet[i], 0, id);
    assert.equal(ile.croissance.has(i), false, id);
  }
  assert.equal(ile.repousse.length, 0);
  for (let jour = 1; jour < 30; jour++) nuit(ile, jour);
  assert.deepEqual(verifierIle(ile), []);
});

test('le tournesol sauvage : à la main ses graines, à la faux sa fleur ; il ne repousse pas', () => {
  const ile = copie();
  const a = unPiedMur(ile, 'tournesol_sauvage');
  const main = recolter(ile, a, 1);
  assert.deepEqual(Object.keys(main.recolte.fin), ['graine_tournesol']);
  const b = unPiedMur(ile, 'tournesol_sauvage');
  const faux = recolter(ile, b, 1, 'faux');
  assert.deepEqual(Object.keys(faux.recolte.fin), ['fleur_tournesol']);
  assert.deepEqual([ile.objet[a], ile.objet[b], ile.repousse.length], [0, 0, 0]);
  // à la faux, une plante sans récolte à la faux donne la sienne
  const ble = unPiedMur(ile, 'ble_sauvage');
  assert.deepEqual(Object.keys(recolter(ile, ble, 1, 'faux').recolte.fin), ['ble']);
});

test('la vigne sauvage, une vivace, revient à son stade de vivace', () => {
  const ile = copie();
  const f = fiche('vigne_sauvage');
  const i = unPiedMur(ile, 'vigne_sauvage');
  assert.equal(recolter(ile, i, 1).ok, true);
  assert.equal(ile.objet[i], f.numero);
  assert.equal(ile.etat[i], DATA.CULTURES.vigne.vivace.stade);
  for (let jour = 1; ile.etat[i] < f.stades - 1 && jour < 20; jour++) nuit(ile, jour);
  assert.equal(ile.etat[i], f.stades - 1);
});

test('un fruitier sauvage cueilli garde sa taille et refait ses fruits en VERGER.PERIODE nuits', () => {
  const ile = copie();
  const f = fiche('pommier_sauvage');
  const i = unPiedMur(ile, 'pommier_sauvage');
  assert.equal(recolter(ile, i, 10).ok, true);
  assert.equal(ile.objet[i], f.numero);
  assert.equal(ile.etat[i], f.stades - 2, 'il redevient un arbre sans fruits, pas un jeune arbre');
  assert.match(recolter(ile, i, 10).raison, /mûr/);
  const periode = DATA.VERGER.PERIODE;
  for (let jour = 10; jour < 10 + periode; jour++) nuit(ile, jour);
  assert.equal(ile.etat[i], f.stades - 2, 'trop tôt');
  nuit(ile, 10 + periode);
  assert.equal(ile.etat[i], f.stades - 1);
  assert.equal(recolter(ile, i, 10 + periode).ok, true);
});

test('un jeune fruitier grandit d’un stade toutes les VERGER.NUITS_STADE nuits', () => {
  const ile = copie();
  const libre = trouver((j) => labourable(ile, j) && ile.sol[j] === SOL.herbe);
  assert.equal(poserObjet(ile, libre, num('poirier_sauvage'), 0, 20).ok, true);
  const nuits = DATA.VERGER.NUITS_STADE;
  for (let jour = 20; jour < 20 + nuits; jour++) nuit(ile, jour);
  assert.equal(ile.etat[libre], 0);
  nuit(ile, 20 + nuits);
  assert.equal(ile.etat[libre], 1);
});

test('un arbre coupé repousse à sa place après son retour ; une place prise, il ne revient pas', () => {
  const ile = copie();
  const feuillu = num('feuillu');
  const [a, b] = fiche('feuillu').recolte.retour;
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
  assert.equal(changerSol(ile, DEPART, SOL.terre).ok, true);
  assert.deepEqual(regionsModifiees(ile), [regionDe(DEPART)]);
  assert.deepEqual(regionsModifiees(ile), []);
});

// Quelques modifications de toutes sortes, pour la sauvegarde.
function modifier(ile) {
  changerSol(ile, DEPART, SOL.terre);
  poserObjet(ile, DEPART + 3, num('pommier_sauvage'), 1, 3);
  recolter(ile, unPiedMur(ile, 'ble_sauvage'), 3);
  recolter(ile, unPiedMur(ile, 'cerisier_sauvage'), 3);
  recolter(
    ile,
    trouver((j) => ile.objet[j] === num('sapin')),
    3,
  );
  changerSol(
    ile,
    trouver((j) => ile.sol[j] === SOL.eau_profonde && !auLarge(j) && voisines(j).some((k) => !estEau(ile, k))),
    SOL.sable,
  );
  nuit(ile, 4);
}

test('la sauvegarde entière : aller et retour, par JSON, sous 150 Ko ; la croissance garde ses jours', () => {
  const ile = copie();
  modifier(ile);
  const s = JSON.parse(JSON.stringify(versSauvegarde(ile)));
  assert.equal(ile.aSauver.size, 0);
  assert.equal(s.hauteur, undefined);
  const relue = depuisSauvegarde(s);
  memesIles(relue, ile);
  assert.deepEqual(verifierIle(relue), []);
  assert.ok(JSON.stringify(s).length < 150 * 1024, `${JSON.stringify(s).length} octets`);
  for (let jour = 5; jour < 12; jour++) {
    nuit(ile, jour);
    nuit(relue, jour);
  }
  memesIles(relue, ile);
});

test('la sauvegarde par régions : un geste du jour, une région, en moins de 2 ms', () => {
  const ile = copie();
  changerSol(ile, DEPART, SOL.terre);
  versSauvegardeRegions(ile); // (une première écriture, à chaud)
  changerSol(ile, DEPART, SOL.herbe);
  const debut = performance.now();
  const partielle = versSauvegardeRegions(ile);
  const duree = performance.now() - debut;
  assert.deepEqual(
    partielle.regions.map((r) => r.r),
    [regionDe(DEPART)],
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
    trouver((j) => ile.objet[j] === num('rocher')),
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

test('une sauvegarde d’un autre format est refusée ; le contrôle trouve une terre détachée et la mer touchée', () => {
  const s = versSauvegarde(copie());
  assert.throws(() => depuisSauvegarde({ ...s, version: 999 }), /format/);
  const ile = copie();
  const auLoin = trouver(
    (i) => ile.sol[i] === SOL.eau_profonde && !auLarge(i) && voisines(i).every((j) => estEau(ile, j)),
  );
  ile.sol[auLoin] = SOL.sable;
  ile.objet[indice(1, 1)] = num('algues');
  const erreurs = verifierIle(ile).join('\n');
  assert.match(erreurs, /morceaux/);
  assert.match(erreurs, /large/);
});
