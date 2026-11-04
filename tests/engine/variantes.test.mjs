/* ==========================================================================
   Tests du moteur : A-3, les variantes de couleur des meubles (data/meubles.json : PALETTES,
   MEUBLES.<id>.variantes ; js/engine/blocs.js : varianteBloc, peindreBloc ; js/engine/etage.js :
   varianteEtage, peindreEtage ; les commandes bloc.peindre, etage.peindre et la variante de *.poser).
   Lancer seul : node --test tests/engine/variantes.test.mjs (ou node tests/run-tests.mjs variantes).
   ========================================================================== */

import {
  addItem, couleursVariante, DATA, defaire, deplacerBloc, empreintePartie, etageBlocs, etageEmprise, executerCommande,
  levelCount, nomVariante, peindreBloc, peindreEtage, poserBloc, poserEtage, reprendreBloc, reprendreEtage, testBatir,
  testFarmMap, testFermeConstruite, testSetLevel, tournerBloc, varianteBloc, varianteEtage, variantesBloc, varianteSuivante,
} from '../../js/engine/index.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

const B = DATA.ATELIER.BLOCS;
const AVEC = Object.keys(B).filter((k) => variantesBloc(k).length);

function foyer() {
  const s = garden();
  testFarmMap(s, 'variantes');
  testSetLevel(s, levelCount());
  const r = testBatir(s, 'foyer');
  assert(r.ok, r.error);
  return { s, at: (x, y) => r.coin + y * 644 + x };
}

test('A-3 : au moins 5 meubles ont au moins 3 couleurs ; chaque variante recolore des couleurs de son dessin', () => {
  assert(AVEC.length >= 5, AVEC.join(' '));
  for (const m of ['meuble_chaise', 'meuble_table', 'meuble_canape', 'meuble_lit_adulte', 'meuble_commode']) assert(variantesBloc(m).length >= 3, m);
  for (const m of AVEC) {
    const [premiere, ...autres] = variantesBloc(m);
    assertEqual([couleursVariante(m, premiere.id), couleursVariante(m, null)], [null, null], `${m} : la première est celle du dessin`);
    for (const v of autres) {
      const c = couleursVariante(m, v.id);
      assert(c && c.length >= 3 && c.every(([de, vers]) => /^#[0-9a-f]{6}$/.test(de) && /^#[0-9a-f]{6}$/.test(vers) && de !== vers), `${m} ${v.id}`);
    }
  }
  assertEqual(variantesBloc('mur_pierre'), []);
  assertEqual(variantesBloc('meuble_tableau_1'), []);
  // la suivante, en boucle ; les noms
  const ids = variantesBloc('meuble_canape').map((v) => v.id);
  assertEqual([varianteSuivante('meuble_canape', null), varianteSuivante('meuble_canape', ids.at(-1))], [ids[1], ids[0]]);
  assertEqual([nomVariante('meuble_canape', null), nomVariante('meuble_canape', 'rouge')], ['vert', 'rouge']);
});

test('A-3 : en bas, la couleur se choisit à la pose, se repeint gratuitement, suit le meuble (reprendre, déplacer, tourner)', () => {
  const { s, at } = foyer();
  addItem(s, B.meuble_canape.objet, 2);
  const t = at(2, 4);
  const p = poserBloc(s, 'meuble_canape', t, 0, 'rouge');
  assert(p.ok, p.error);
  assertEqual([p.variante, varianteBloc(s, t)], ['rouge', 'rouge']);
  // repeindre (sur une case qu'il couvre) : gratuit, rien ne change dans l'inventaire
  const avant = JSON.stringify(s.inventaire || s.inventory || null);
  const r = peindreBloc(s, t + 1, 'bleu');
  assertEqual([r.ok, r.case, r.variante, r.avant, varianteBloc(s, t)], [true, t, 'bleu', 'rouge', 'bleu']);
  assertEqual(JSON.stringify(s.inventaire || s.inventory || null), avant, 'gratuit');
  // la couleur du dessin : plus rien de gardé
  assertEqual(peindreBloc(s, t, 'vert').ok, true);
  assertEqual([varianteBloc(s, t), s.teintes[t]], [null, undefined]);
  assertEqual(peindreBloc(s, t, 'violet').ok, false, 'une couleur inconnue');
  peindreBloc(s, t, 'moutarde');
  // tourné de profil (son emprise change : repris et reposé), déplacé : il garde sa couleur
  assertEqual(tournerBloc(s, t).ok, true);
  assertEqual(varianteBloc(s, t), 'moutarde', 'tourné');
  const d = deplacerBloc(s, t, at(1, 4));
  assert(d.ok, d.error);
  assertEqual([varianteBloc(s, at(1, 4)), varianteBloc(s, t)], ['moutarde', null], 'déplacé');
  // repris : il rend sa couleur, elle s'oublie
  const rp = reprendreBloc(s, at(1, 4));
  assertEqual([rp.variante, varianteBloc(s, at(1, 4))], ['moutarde', null]);
  // une couleur inconnue à la pose : celle du dessin ; un meuble sans variantes : pas de couleur
  assertEqual(poserBloc(s, 'meuble_canape', t, 0, 'violet').ok, true);
  assertEqual(varianteBloc(s, t), null);
  addItem(s, B.meuble_chevet.objet, 1);
  assert(poserBloc(s, 'meuble_chevet', at(5, 4), 0, 'rouge').ok);
  assertEqual(varianteBloc(s, at(5, 4)), null);
  const non = peindreBloc(s, at(5, 4), 'rouge');
  assert(!non.ok && /une seule couleur/.test(non.error), non.error);
});

test('A-3 : les commandes bloc.poser { variante }, bloc.peindre et bloc.reprendre se défont et retrouvent la partie', () => {
  const { s, at } = foyer();
  addItem(s, B.meuble_commode.objet, 1);
  const jouer = (type, args) => executerCommande(s, { id: type, type, args });
  const e0 = empreintePartie(s), t = at(2, 4);
  const p = jouer('bloc.poser', { sorte: 'meuble_commode', case: t, variante: 'sauge' });
  assert(p.ok, p.error);
  const e1 = empreintePartie(s);
  const q = jouer('bloc.peindre', { case: t, variante: 'noyer' });
  assertEqual([q.ok, q.inverses[0].args], [true, { case: t, variante: 'sauge' }]);
  assertEqual(defaire(s, q.inverses), 1);
  assertEqual(empreintePartie(s), e1);
  const rp = jouer('bloc.reprendre', { case: t });
  assertEqual(rp.inverses[0].args.variante, 'sauge', 'reposé dans sa couleur');
  assertEqual(defaire(s, rp.inverses), 1);
  assertEqual([varianteBloc(s, t), empreintePartie(s)], ['sauge', e1]);
  assertEqual(defaire(s, p.inverses), 1);
  assertEqual(empreintePartie(s), e0);
  assertEqual(jouer('bloc.peindre', { case: t, variante: 'Pas Valide' }).ok, false, 'un id invalide');
});

test('A-3 : à l\'étage aussi (pose, peinture, reprise, commandes)', () => {
  const s = garden();
  testFarmMap(s, '42');
  testFermeConstruite(s);
  for (const t of Object.keys(etageBlocs(s)).map(Number)) assert(reprendreEtage(s, t).ok);
  addItem(s, B.meuble_chaise.objet, 2);
  const t = [...etageEmprise(s)].sort((a, b) => a - b).find((c) => poserEtage(s, 'meuble_chaise', c, 0, 'noyer').ok);
  assert(t !== undefined);
  assertEqual(varianteEtage(s, t), 'noyer');
  const r = peindreEtage(s, t, 'bleu');
  assertEqual([r.ok, r.avant, varianteEtage(s, t)], [true, 'noyer', 'bleu']);
  const e1 = empreintePartie(s);
  const q = executerCommande(s, { id: 'p', type: 'etage.peindre', args: { case: t, variante: 'miel' } });
  assertEqual([q.ok, varianteEtage(s, t)], [true, null]);
  assertEqual(defaire(s, q.inverses), 1);
  assertEqual(empreintePartie(s), e1);
  const rp = executerCommande(s, { id: 'r', type: 'etage.reprendre', args: { case: t } });
  assertEqual([rp.variante, rp.inverses[0].args.variante, varianteEtage(s, t)], ['bleu', 'bleu', null]);
  assertEqual(defaire(s, rp.inverses), 1);
  assertEqual([varianteEtage(s, t), empreintePartie(s)], ['bleu', e1]);
});
