/* ==========================================================================
   Tests du moteur : la vigne, une culture pérenne de la zone de culture (le lot 4 des évolutions du crafting).
   - ses données (6 stades, 4 raisins, le plant à la calèche, niveau 6, vivace) ;
   - la vendange : le raisin, le pied reste, revenu à son feuillage, et refait ses grappes en 2 stades ;
   - la houe arrache une vigne qui n'est pas mûre ; une vigne mûre, on la vendange d'abord.
   Lancer seul : node tests/run-tests.mjs vigne.
   ========================================================================== */

import { countItem, DATA, findPlot, harvest, hoe, hoeStatus, isMature, plant, unlockLevel } from '../../js/engine/index.js';
import { assert, assertEqual, garden, setInv, test, tireless } from './aide.mjs';

function vigne() {
  const s = garden();
  tireless(s);
  s.potager.houe = true;
  if (s.outils) s.outils.houe = true;
  const p = s.potager.parcelles.find((q) => !q.culture && Number.isInteger(q.case)) || s.potager.parcelles[0];
  setInv(s, { plant_vigne: 2 });
  return { s, p };
}

test('les données : 6 stades, 4 raisins, le plant à la calèche, débloquée au niveau 6, vivace', () => {
  const c = DATA.CULTURES.vigne;
  assertEqual([c.stades, c.rendement, c.produit, c.graines, c.vivace, c.lieux], [6, 4, 'raisin', { item: 'plant_vigne', mode: 'plant' }, { stade: 4 }, ['potager']]);
  assertEqual([DATA.OBJETS.raisin.categorie, DATA.OBJETS.plant_vigne.categorie, DATA.OBJETS.plant_vigne.prix], ['fruit', 'graine', 6]);
  assertEqual(unlockLevel('vigne'), 6);
});

test('la vendange : 4 raisins, le pied reste en feuillage et refait ses grappes en 2 stades', () => {
  const { s, p } = vigne();
  assert(plant(s, p.id, 'vigne').ok);
  assertEqual([countItem(s, 'plant_vigne'), p.culture, p.stade], [1, 'vigne', 0]);
  p.stade = DATA.CULTURES.vigne.stades;
  assert(isMature(p));
  const r = harvest(s, p.id, false, true);
  assert(r.ok, r.error);
  assertEqual([r.items, countItem(s, 'raisin')], [{ raisin: 4 }, 4]);
  const q = findPlot(s, p.id);
  assertEqual([q.culture, q.stade, q.arrose, isMature(q)], ['vigne', 4, false, false], 'le pied reste, en feuillage');
  q.stade += 2;
  assert(isMature(q), 'deux stades plus tard, de nouvelles grappes');
  assert(harvest(s, p.id, false, true).ok && countItem(s, 'raisin') === 8, 'une deuxième vendange, sans replanter');
  assertEqual(countItem(s, 'plant_vigne'), 1, 'aucun plant pris de plus');
});

test('la houe : elle arrache une vigne qui n\'est pas mûre ; mûre, on la vendange d\'abord', () => {
  const { s, p } = vigne();
  assert(plant(s, p.id, 'vigne').ok);
  p.stade = DATA.CULTURES.vigne.stades;
  assertEqual(hoeStatus(s, p.case), { action: null, ok: false, raison: 'Vigne : vendange d\'abord.' });
  p.stade = 3;
  assertEqual(hoeStatus(s, p.case).action, 'arracher');
  const r = hoe(s, p.case);
  assert(r.ok, r.error);
  assertEqual([r.action, r.culture, findPlot(s, p.id).culture], ['arracher', 'vigne', null], 'la parcelle reste, en terre nue');
  assertEqual(hoeStatus(s, p.case).action, 'reboucher', 'ensuite, la houe la rebouche');
  // une autre culture plantée : toujours refusée
  setInv(s, { graine_carotte: 1 });
  assert(plant(s, p.id, 'carotte').ok);
  assertEqual(hoeStatus(s, p.case).action, null);
});
