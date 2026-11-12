/* ==========================================================================
   Tests du moteur : une fenêtre de l'étage dans le haut d'un mur du bas rehaussé jusqu'à l'étage
   (js/engine/etage.js, fenetresHautes). La ferme de test (testFermeConstruite) n'a que de tels murs
   autour de ses pièces de l'étage : on doit pouvoir y percer des fenêtres. Le mur garde sa hauteur,
   la pièce du niveau 1 reste close ; reprise, la fenêtre laisse son mur.
   Lancer seul : node --test tests/engine/fenetres-hautes.test.mjs
   ========================================================================== */

import {
  addItem, countItem, etageEmprise, executerCommande, fenetresHautes, hauteurPile, piecesNiveau, poseEtageStatus, poserEtage,
  reprendreBloc, reprendreEtage, testFarmMap, testFermeConstruite,
} from '../../js/engine/index.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

const ferme = () => {
  const s = garden();
  testFarmMap(s, '42');
  testFermeConstruite(s);
  return s;
};
const murHaut = (s) => [...etageEmprise(s)].find((t) => hauteurPile(s, t) === 2);

test('fenêtres hautes : une fenêtre se perce dans le haut d\'un mur rehaussé, la pièce du niveau 1 reste close', () => {
  const s = ferme(), t = murHaut(s), pieces = piecesNiveau(s, 1).length;
  assert(t !== undefined, 'la ferme de test a des murs rehaussés autour de l\'étage');
  assert(!poseEtageStatus(s, 'mur_pierre', t).ok, 'un mur : non, c\'est déjà le mur de l\'étage');
  addItem(s, 'fenetre_ronde', 1);
  const r = poserEtage(s, 'fenetre_ronde', t);
  assert(r.ok, r.error);
  assertEqual([fenetresHautes(s)[t], hauteurPile(s, t), countItem(s, 'fenetre_ronde'), piecesNiveau(s, 1).length], ['fenetre_ronde', 2, 0, pieces]);
  assert(!poseEtageStatus(s, 'mur_fenetre', t).ok, 'une seule fenêtre par mur');
  // le mur ne s'abaisse pas sous la fenêtre ; il se rehausse au-dessus
  assert(!reprendreBloc(s, t).ok, 'le mur ne s\'abaisse pas : la fenêtre d\'abord');
  const r2 = reprendreEtage(s, t);
  assertEqual([r2.ok, r2.sorte, r2.reste, fenetresHautes(s)[t], hauteurPile(s, t), countItem(s, 'fenetre_ronde')], [true, 'fenetre_ronde', 'mur_pierre', undefined, 2, 1]);
  assert(reprendreBloc(s, t).ok, 'sans fenêtre, le mur s\'abaisse');
});

test('fenêtres hautes : la commande se joue et s\'annule (Annuler du mode Construire)', () => {
  const s = ferme(), t = murHaut(s);
  addItem(s, 'mur_fenetre', 1);
  const r = executerCommande(s, { type: 'etage.poser', args: { sorte: 'mur_fenetre', case: t } });
  assert(r.ok, r.error);
  assertEqual(fenetresHautes(s)[t], 'mur_fenetre');
  for (const inv of r.inverses) assert(executerCommande(s, inv).ok);
  assertEqual([fenetresHautes(s)[t], countItem(s, 'mur_fenetre'), hauteurPile(s, t)], [undefined, 1, 2]);
});
