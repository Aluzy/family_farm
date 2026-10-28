/* ==========================================================================
   Tests du moteur : l'exploration (le récit, lot 8 ; docs/recit/plan.md).
   - la tente : une case à part, à côté du sac ; elle se prend de l'inventaire et s'y range ;
   - le bivouac : loin de la ferme, la nuit, sa tente portée, le personnage dort là où il est ; l'énergie
     remonte comme dans un lit ; il ne prend pas de couchage de la maison ; le bivouac finit avec la nuit ;
   - le compagnon garde la ferme : ce qu'il fait pendant que le joueur explore est compté, et il le dit au
     retour (une fois).
   Lancer seul : node tests/run-tests.mjs exploration.
   ========================================================================== */

import {
  addItem, advanceNight, aidant, awakeMsAtHour, countItem, DATA, farmTerrain, journeeCompagnon, nightLengthMs,
  plant, ramassables, seedItem, startNight,
} from '../../js/engine/index.js';
import { equipementDe, poserTente, retirerTente, tentePortee } from '../../js/engine/equipement.js';
import { dormirSousTente } from '../../js/engine/night.js';
import { bivouacEnCours, nuitCouchee, nuitSansCouchage } from '../../js/engine/blocs.js';
import { noterGarde, retourCompagnon } from '../../js/engine/compagnon.js';
import { assert, assertEqual, farm, garden, growZone, test } from './aide.mjs';

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

test('le compagnon garde la ferme : compté pendant l\'exploration seulement, dit au retour, une fois', () => {
  const s = growZone(garden(), 10);
  s.awakeMs = awakeMsAtHour(9);
  s.cueillette = { jour: s.day, pris: ramassables(s).map((p) => p.id) };
  addItem(s, seedItem('carotte'), 4);
  for (const p of s.potager.parcelles.filter((q) => !q.culture).slice(0, 4)) assert(plant(s, p.id, 'carotte').ok);
  // à la ferme : rien n'est compté
  s.monde.ici = dedans(s);
  noterGarde(s, 'betes');
  assertEqual(retourCompagnon(s), null, 'rien à dire : le joueur était là');
  // loin : ce qu'il fait est compté
  s.monde.ici = loin(s);
  const faits = journeeCompagnon(s);
  assert(faits.some((f) => f.action === 'arroser'), 'il a arrosé');
  noterGarde(s, 'betes');
  const r = retourCompagnon(s);
  assert(r && r.id === aidant(s).id, 'c\'est lui qui parle');
  assert(r.texte.includes(DATA.RECIT.COMPAGNON.arroser) && r.texte.includes(DATA.RECIT.COMPAGNON.betes), r.texte);
  assertEqual(retourCompagnon(s), null, 'une fois');
});
