/* ==========================================================================
   Tests du moteur : A-1, tout meuble tourne (js/engine/blocs.js tournerBloc ; à l'étage :
   js/engine/etage.js tournerEtage ; les commandes bloc.tourner, etage.tourner, et leurs inverses).
   Chaque meuble qui se pose au sol tourne d'un quart de tour, en bas comme à l'étage ; les tableaux,
   accrochés à un mur, le suivent (un message le dit, jamais « ne se tourne pas »).
   Lancer seul : node --test tests/engine/rotation.test.mjs (ou node tests/run-tests.mjs rotation).
   ========================================================================== */

import {
  addItem, blocsPoses, DATA, defaire, empreintePartie, empriseMeuble, ETAGE_BLOCS, etageBlocs, etageCouvertes,
  etageEmprise, executerCommande, mesuresMeuble, poserBloc, poserEtage, reprendreBloc, reprendreEtage, sensBloc,
  sensEtage, testBatir, testFarmMap, testFermeConstruite, testSetLevel, levelCount, tourneBloc, tournerBloc,
  tournerEtage,
} from '../../js/engine/index.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

const B = DATA.ATELIER.BLOCS;
// Les meubles qui se posent au sol (les tableaux s'accrochent à un mur)
const MEUBLES = Object.keys(B).filter((k) => B[k].meuble && B[k].sur !== 'mur');
const TABLEAUX = Object.keys(B).filter((k) => B[k].meuble && B[k].sur === 'mur');

// Une partie au niveau maximal, avec le foyer (une pièce close de 8 × 6 cases, ses paillasses en haut).
function foyer() {
  const s = garden();
  testFarmMap(s, 'rotation');
  testSetLevel(s, levelCount());
  const r = testBatir(s, 'foyer');
  assert(r.ok, r.error);
  return { s, coin: r.coin };
}

test('A-1 : chaque meuble posé au sol tourne (les lits et le réfrigérateur aussi), les tableaux non', () => {
  assert(MEUBLES.length >= 30 && TABLEAUX.length === 3, `${MEUBLES.length} meubles, ${TABLEAUX.length} tableaux`);
  for (const m of MEUBLES) assert(tourneBloc(m), `${m} tourne`);
  for (const t of TABLEAUX) assertEqual(tourneBloc(t), false, t);
  for (const lit of ['meuble_lit_adulte', 'meuble_lit_enfant']) assertEqual(mesuresMeuble(lit, 1), { largeur: 2, hauteur: 1 }, `${lit} de profil : en long`);
});

test('A-1 : en bas, chaque meuble fait un tour complet dans une pièce vide, et revient de face', () => {
  const { s, coin } = foyer();
  const W = 644, at = (x, y) => coin + y * W + x;   // (le monde : 644 cases de large)
  assertEqual(Number(Object.keys(blocsPoses(s)).find((k) => Number(k) === at(0, 0))), at(0, 0), 'le coin du foyer est un mur');
  for (const sorte of MEUBLES) {
    addItem(s, B[sorte].objet, 1);
    const t = at(3, 4);
    const p = poserBloc(s, sorte, t);
    assert(p.ok, `${sorte} : ${p.error}`);
    const vus = [];
    for (let k = 0; k < 4; k++) {
      const r = tournerBloc(s, t);
      assert(r.ok, `${sorte}, quart de tour ${k + 1} : ${r.error}`);
      vus.push(r.sens);
      // (l'emprise suit le sens : toutes ses cases dans la pièce)
      assert((empriseMeuble(s, sorte, t, sensBloc(s, t)) || []).length === mesuresMeuble(sorte, sensBloc(s, t)).largeur * mesuresMeuble(sorte, sensBloc(s, t)).hauteur, sorte);
    }
    assertEqual(vus, [3, 2, 1, 0], `${sorte} : de face → vers la gauche → de dos → vers la droite → de face`);
    assert(reprendreBloc(s, t).ok, sorte);
  }
});

test('A-1 : un tableau ou un mur ne tourne pas, avec un message qui dit pourquoi (jamais « ne se tourne pas »)', () => {
  const { s, coin } = foyer();
  const W = 644, mur = coin + 2;   // (le mur du haut)
  addItem(s, B.meuble_tableau_1.objet, 1);
  const p = poserBloc(s, 'meuble_tableau_1', mur);
  assert(p.ok, p.error);
  const r = tournerBloc(s, mur);
  assertEqual(r.ok, false);
  assert(/accroché au mur, il suit le mur/.test(r.error), r.error);
  const r2 = tournerBloc(s, coin + 2 * W);   // (le mur de gauche, sans tableau)
  assert(!r2.ok && /seuls les meubles se tournent/.test(r2.error) && !/ne se tourne pas/.test(r2.error), r2.error);
});

// La ferme d'essai (F0-6) : une maison à étage ; l'étage de la première maison vidé de ses paillasses.
function etage() {
  const s = garden();
  testFarmMap(s, '42');
  testFermeConstruite(s);
  for (const t of Object.keys(etageBlocs(s)).map(Number)) assert(reprendreEtage(s, t).ok);
  const E = [...etageEmprise(s)].sort((a, b) => a - b);
  // une case de l'étage d'où un lit tient dans les quatre sens (2 cases de large ou de haut)
  const W = 644, libre = (t) => E.includes(t) && blocsPoses(s)[t] !== 'escalier';
  const t = E.find((c) => [c, c - W, c + 1, c - 1, c + W].every(libre) && [c - 2 * W, c + 2, c - 2].every(libre));
  assert(t !== undefined, 'une place libre à l\'étage');
  return { s, t, W };
}

test('A-1 : à l\'étage, chaque meuble qui s\'y pose tourne ; l\'emprise suit le sens ; reprendre rend le sens', () => {
  const { s, t, W } = etage();
  const meubles = ETAGE_BLOCS.filter((k) => B[k].meuble && B[k].sur !== 'mur');
  assert(meubles.includes('meuble_lit_adulte') && !meubles.includes('refrigerateur'), 'les lits montent, le réfrigérateur reste en bas');
  for (const sorte of meubles.filter((k) => (B[k].largeur || 1) <= 2 && (B[k].hauteur || 1) <= 2)) {
    addItem(s, B[sorte].objet, 1);
    const p = poserEtage(s, sorte, t);
    assert(p.ok, `${sorte} : ${p.error}`);
    for (let k = 0; k < 4; k++) assert(tournerEtage(s, t).ok, `${sorte} : quart de tour ${k + 1}`);
    assertEqual(sensEtage(s, t), 0, sorte);
    assert(reprendreEtage(s, t).ok);
  }
  // le lit adulte de profil : deux cases en long, la seconde couverte ; reprise sur elle, il rend son sens
  addItem(s, B.meuble_lit_adulte.objet, 1);
  assert(poserEtage(s, 'meuble_lit_adulte', t).ok);
  assertEqual(etageCouvertes(s).get(t - W), t, 'de face : la case au-dessus');
  assertEqual(tournerEtage(s, t).sens, 3);
  assertEqual([etageCouvertes(s).get(t + 1), etageCouvertes(s).has(t - W)], [t, false], 'de profil : la case à droite');
  const r = reprendreEtage(s, t + 1);
  assertEqual([r.ok, r.case, r.sens, sensEtage(s, t)], [true, t, 3, 0]);
  // posé de profil d'emblée ; un tableau ne monte pas
  assert(poserEtage(s, 'meuble_lit_adulte', t, 1).ok);
  assertEqual(sensEtage(s, t), 1);
  assertEqual(poserEtage(s, 'meuble_tableau_1', t + 2 * W).ok, false);
});

test('A-1 : les commandes etage.poser (avec un sens), etage.tourner, etage.reprendre se défont et se rejouent', () => {
  const { s, t } = etage();
  addItem(s, B.meuble_lit_enfant.objet, 1);
  const e0 = empreintePartie(s);
  const jouer = (type, args) => executerCommande(s, { id: type, type, args });
  const p = jouer('etage.poser', { sorte: 'meuble_lit_enfant', case: t, sens: 3 });
  assert(p.ok, p.error);
  assertEqual(sensEtage(s, t), 3);
  const e1 = empreintePartie(s);
  const q = jouer('etage.tourner', { case: t });
  assertEqual([q.ok, q.sens, q.inverses[0].type], [true, 2, 'etage.orienter']);
  assertEqual(defaire(s, q.inverses), 1);
  assertEqual(empreintePartie(s), e1, 'tourner défait : le sens d\'avant');
  const rp = jouer('etage.reprendre', { case: t });
  assert(rp.ok);
  assertEqual(rp.inverses[0].args, { sorte: 'meuble_lit_enfant', case: t, sens: 3 }, 'reposé dans son sens');
  assertEqual(defaire(s, rp.inverses), 1);
  assertEqual([sensEtage(s, t), empreintePartie(s)], [3, e1]);
  assertEqual(defaire(s, p.inverses), 1);
  assertEqual(empreintePartie(s), e0, 'la pose défaite : la partie d\'avant');
  // un sens invalide est refusé par la commande
  assertEqual(jouer('etage.poser', { sorte: 'meuble_lit_enfant', case: t, sens: 7 }).ok, false);
});
