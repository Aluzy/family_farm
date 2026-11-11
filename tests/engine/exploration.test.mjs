/* ==========================================================================
   Tests du moteur : l'exploration (le récit, lot 8 ; docs/recit/plan.md).
   - la tente : une case à part, à côté du sac ; elle se prend de l'inventaire et s'y range ;
   - le bivouac : loin de la ferme, la nuit, sa tente portée, le personnage dort là où il est ; l'énergie
     remonte comme dans un lit ; il ne prend pas de couchage de la maison ; le bivouac finit avec la nuit.
   Lancer seul : node tests/run-tests.mjs exploration.
   ========================================================================== */

import {
  addItem, advanceNight, awakeMsAtHour, countItem, DATA, farmTerrain, nightLengthMs, startNight,
} from '../../js/engine/index.js';
import { equipementDe, poserTente, retirerTente, tentePortee } from '../../js/engine/equipement.js';
import { dormirSousTente } from '../../js/engine/night.js';
import { bivouacEnCours, nuitCouchee, nuitSansCouchage } from '../../js/engine/blocs.js';
import { assert, assertEqual, farm, test } from './aide.mjs';

const TENTE = DATA.EQUIPEMENT.TENTE;
// La case d'une partie loin de la ferme (au-delà de son bord est), ou sur la ferme.
const loin = (s) => { const T = farmTerrain(s), F = T.FERME; return (F.Y + 2) * T.LARGEUR + F.X + F.LARGEUR + 20; };
const dedans = (s) => { const T = farmTerrain(s), F = T.FERME; return (F.Y + 2) * T.LARGEUR + F.X + 2; };

test('la tente : prise de l\'inventaire dans sa case, rangée ensuite', () => {
  const s = farm();
  assertEqual(tentePortee(s), false);
  assertEqual(poserTente(s).ok, false, 'pas de tente dans l\'inventaire');
  assert(DATA.ATELIER.RECETTES[TENTE].sortie[TENTE] === 1, 'elle se fabrique à l\'Atelier');
  addItem(s, TENTE, 1);
  assert(poserTente(s).ok);
  assertEqual([tentePortee(s), countItem(s, TENTE)], [true, 0]);
  assertEqual(poserTente(s).ok, false, 'déjà portée');
  assert(retirerTente(s).ok);
  assertEqual([tentePortee(s), countItem(s, TENTE), 'tente' in equipementDe(s)], [false, 1, false], 'rangée : la case redevient absente');
  // une sauvegarde abîmée : une valeur autre que vrai ne compte pas
  equipementDe(s).tente = 'oui';
  assertEqual(tentePortee(s), false);
});

test('le bivouac : loin de la ferme, la nuit, sous sa tente ; l\'énergie remonte ; il finit avec la nuit', () => {
  const s = farm();
  addItem(s, TENTE, 1);
  poserTente(s);
  s.monde.ici = loin(s);
  assertEqual(dormirSousTente(s).ok, false, 'pas de jour');
  s.awakeMs = awakeMsAtHour(DATA.TEMPS.HEURE_NUIT);
  startNight(s);
  s.monde.ici = dedans(s);
  assertEqual(dormirSousTente(s).ok, false, 'à la ferme, on dort dans son lit');
  s.monde.ici = loin(s);
  retirerTente(s);
  assertEqual(dormirSousTente(s).ok, false, 'sans tente portée');
  poserTente(s);
  s.energie = 10;
  const r = dormirSousTente(s);
  assert(r.ok, r.error);
  assertEqual([bivouacEnCours(s), s.bivouac.case, s.nuitEnCours.dort], [true, loin(s), true]);
  assertEqual(retirerTente(s).ok, false, 'pas pendant qu\'il dort dessous');
  // sans aucun couchage à la ferme, il dort quand même (sa tente)
  s.blocs = {};
  assertEqual(nuitCouchee(s), true);
  advanceNight(s, nightLengthMs());
  assert(s.energie > 10, 'l\'énergie est remontée');
  assertEqual([s.bivouac, s.reveil], [null, true], 'la tente se replie au réveil');
});

test('le bivouac : le personnage ne prend pas de couchage de la maison (les autres oui)', () => {
  const s = farm();
  const n = s.famille.membres.length;
  s.bivouac = { case: loin(s), jour: s.day };
  // (farm : une partie sans paillasse ? alors tout le monde, sauf lui, est sans couchage)
  const sans = nuitSansCouchage(s).map((m) => m.id);
  assert(!sans.includes(s.famille.principal), 'lui a sa tente');
  assert(sans.length <= n - 1);
});

