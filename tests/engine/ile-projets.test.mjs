/* ==========================================================================
   Tests du moteur : les projets du village de l'île (js/engine/ile/projets.js ; docs/economie.md E15, E17). Un à la
   fois, payé par la bourse du village dès qu'elle a la somme ; le village donne les blocs ; le bâtiment est fini quand
   ils sont tous posés et que le meuble clé est dans une pièce close. Développer le port : le port monte d'un niveau.
   Lancer seul : node --test tests/engine/ile-projets.test.mjs
   ========================================================================== */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNewGame, DATA, finishSetup } from '../../js/engine/index.js';
import { donnerAuVillage, economie, projetBati, reglerTaux } from '../../js/engine/ile/economie.js';
import {
  abandonnerProjet,
  avancerProjet,
  choisirProjet,
  projetEnCours,
  refusProjet,
  resteAPoser,
  verifierProjet,
} from '../../js/engine/ile/projets.js';
import { countItem } from '../../js/engine/inventory.js';
import { niveauPort } from '../../js/engine/port.js';
import { farmTerrain } from '../../js/engine/terrain.js';

const PR = DATA.ILE.PROJETS;
function partie(niveau = 2) {
  const s = createNewGame(9);
  finishSetup(s);
  s.blocs = { ...(s.blocs || {}), [s.monde.ici + 40]: DATA.ILE.VILLAGE.PLACE };
  s.place = { niveau };
  return s;
}

// Une pièce close de 8 × 7 cases (les murs autour : 34 cases) au nord-ouest du personnage : `murs` le nombre de murs
// en pierre, quatre fenêtres, la porte au milieu du mur du bas (une porte dans un coin ne s'ouvre sur rien) ; le meuble clé accroché au mur du haut (la case sous lui : la pièce).
function batir(s, cle) {
  const W = farmTerrain(s).LARGEUR,
    x0 = (s.monde.ici % W) - 20,
    y0 = Math.floor(s.monde.ici / W) - 20;
  const anneau = [];
  for (let x = x0; x < x0 + 10; x++) anneau.push(y0 * W + x, (y0 + 8) * W + x);
  for (let y = y0 + 1; y < y0 + 8; y++) anneau.push(y * W + x0, y * W + x0 + 9);
  s.blocs = { ...s.blocs };
  anneau.forEach((t, k) => (s.blocs[t] = k === 9 ? 'porte' : k < 6 && k > 1 ? 'mur_fenetre' : 'mur_pierre'));
  if (cle) s.blocsDessus = { ...(s.blocsDessus || {}), [y0 * W + x0 + 4]: cle };
}

test('un projet à la fois ; ses conditions (la place, la mairie d’abord)', () => {
  const s = partie(1);
  assert.match(refusProjet(s, 'mairie'), /niveau 2/);
  assert.match(refusProjet(s, 'ecole'), /mairie/);
  assert.equal(refusProjet(s, 'logement'), null);
  s.place.niveau = 2;
  assert.ok(choisirProjet(s, 'mairie').ok);
  assert.match(refusProjet(s, 'logement'), /un seul à la fois/);
  assert.ok(abandonnerProjet(s).ok, 'pas encore payé : il y renonce');
  assert.equal(projetEnCours(s), null);
});

test('la bourse du village paie dès qu’elle a la somme ; le village donne les blocs', () => {
  const s = partie();
  s.pieces = 2000;
  assert.equal(choisirProjet(s, 'mairie').paye, false, 'la bourse est vide');
  avancerProjet(s);
  assert.equal(projetEnCours(s).paye, false);
  donnerAuVillage(s, PR.mairie.prix);
  avancerProjet(s);
  assert.equal(projetEnCours(s).paye, true);
  assert.equal(economie(s).bourse, 0);
  assert.equal(countItem(s, 'tableau_liege'), 1);
  assert.equal(countItem(s, 'mur_pierre'), PR.mairie.blocs.mur_pierre);
  assert.equal(abandonnerProjet(s).ok, false, 'payé : le chantier est ouvert');
  assert.deepEqual(resteAPoser(s), PR.mairie.blocs);
});

test('le bâtiment fini : tous les blocs posés et le meuble clé dans une pièce close ; la mairie règle la taxe', () => {
  const s = partie();
  economie(s).bourse = PR.mairie.prix;
  choisirProjet(s, 'mairie');
  assert.equal(reglerTaux(s, 10).ok, false, 'pas encore de mairie');
  batir(s, null);
  assert.equal(verifierProjet(s), false, 'sans le tableau en liège');
  batir(s, 'tableau_liege');
  assert.equal(verifierProjet(s), true);
  assert.equal(projetBati(s, 'mairie'), true);
  assert.equal(projetEnCours(s), null);
  assert.ok(reglerTaux(s, 10).ok);
  assert.match(refusProjet(s, 'mairie'), /déjà fait/);
  assert.equal(refusProjet(s, 'ecole'), null, 'les autres projets s’ouvrent');
});

test('développer le port : payé par la bourse du village, sans matériaux ; le port monte', () => {
  const s = partie();
  const n = niveauPort(s),
    prix = DATA.PORT.NIVEAUX[n].prix.pieces;
  economie(s).bourse = prix;
  assert.ok(choisirProjet(s, 'port').ok);
  assert.equal(niveauPort(s), n + 1);
  assert.equal(economie(s).bourse, 0);
  assert.equal(projetEnCours(s), null);
});
