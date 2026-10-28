/* ==========================================================================
   Tests du moteur : l'acte II du récit (docs/recit/aventure.md, lot 6).
   - la première veillée : au Gué, une nuit de pleine lune, de 19 h à 22 h, l'acte II ouvert ; ses
     lignes selon ce que le joueur a fait (une promesse commencée, une machine, rien) ; Odile tutoie ;
     la confiance de chaque hameau découvert monte ;
   - Frida vient à la ferme au chapitre 4 (le palier « Automatisation »), ses mots selon l'empreinte ;
   - la fortune de Maurice : Achille, à la calèche, une fois « cordial », après la veillée et 20 nuits ;
   - les promesses de Maurice : ouvertes par son carnet, confiées à Achille en une ou plusieurs fois.
   Lancer seul : node tests/run-tests.mjs recit-acte2.
   ========================================================================== */

import { awakeMsAtHour, composeFamily, createNewGame, DATA, finishSetup } from '../../js/engine/index.js';
import { addItem, countItem } from '../../js/engine/inventory.js';
import {
  aFait, ajouterFragment, ajouterRelation, conditionsVraies, confiance, etatPromesse, jouerScene, livrerPromesse,
  noterFait, palier, promesses, relation, repliquesPossibles, scenesPossibles,
} from '../../js/engine/recit.js';
import { assert, assertEqual, test } from './aide.mjs';

const PLEINE = (() => { let j = 1; for (const p of DATA.LUNE.PHASES) { if (p.id === 'pleine') return j; j += p.jours; } return 1; })();

// Une partie à l'acte II (chapitre 4, jour 20 : une pleine lune), Odile rencontrée, deux hameaux découverts.
function acte2(h = 20) {
  const s = createNewGame(3);
  assert(composeFamily(s, { perso: 3, prenom: 'Léa', nom: 'Martin' }).ok && finishSetup(s).ok);
  s.campagne.chapitre = 4;
  s.day = PLEINE + DATA.LUNE.JOURS_MOIS;
  s.awakeMs = awakeMsAtHour(h);
  s.nuitEnCours = null;
  s.monde.hameaux = { hameau_1: { nom: 'Le Gué', style: 'prairie', jour: 2 }, hameau_2: { nom: 'Brumeval', style: 'foret', jour: 5 } };
  noterFait(s, ['arrivee', 'achille.cle', 'odile.rencontre']);
  ajouterFragment(s, 'carnet_promesses');
  return s;
}
const AU_GUE = { lieu: 'gue', hameau: 'hameau_1' };
const textes = (r) => r.lignes.map((l) => `${l.qui}: ${l.texte}`);

test('la veillée : au Gué, une nuit de pleine lune, de 19 h à 22 h, l\'acte II ouvert', () => {
  assertEqual(scenesPossibles(acte2(), AU_GUE).includes('veillee_1'), true);
  assertEqual(scenesPossibles(acte2(18), AU_GUE).includes('veillee_1'), false, 'avant 19 h');
  assertEqual(scenesPossibles(acte2(), { lieu: 'ferme' }).includes('veillee_1'), false, 'pas à la ferme');
  const s = acte2(); s.day += 3;
  assertEqual(scenesPossibles(s, AU_GUE).includes('veillee_1'), false, 'pas un autre soir de lune');
  const t = acte2(); t.campagne.chapitre = 2;
  assertEqual(scenesPossibles(t, AU_GUE).includes('veillee_1'), false, 'pas à l\'acte I');
});

test('la veillée : rien de notable, Fernand ; Odile tutoie ; la confiance de chaque hameau monte', () => {
  const s = acte2();
  const r = jouerScene(s, 'veillee_1', AU_GUE);
  assert(r.ok, r.error);
  assertEqual(r.lignes.map((l) => l.qui), ['odile', 'fernand', 'odile', 'achille']);
  assert(aFait(s, 'odile.tutoie') && aFait(s, 'veillee.1'));
  assertEqual([confiance(s, 'hameau_1'), confiance(s, 'hameau_2')], [DATA.RECIT.CONFIANCE.DEPART + 5, DATA.RECIT.CONFIANCE.DEPART + 5]);
  assertEqual(palier(s, 'achille') >= 1, true);
  assert(!repliquesPossibles(s, 'odile').some((e) => e.id === 'odile.vous' || e.id === 'odile.veillee'), 'plus de vouvoiement');
  assertEqual(jouerScene(s, 'veillee_1', AU_GUE).ok, false, 'une seule fois');
});

test('la veillée : Garance parle de son toit commencé, ou de la machine', () => {
  const s = acte2();
  addItem(s, 'planche', 3);
  assert(livrerPromesse(s, 'toit_garance').ok);
  const r = textes(jouerScene(s, 'veillee_1', AU_GUE));
  assert(r.some((t) => t.startsWith('garance: Il paraît que t\'as commencé mon toit')), r.join(' | '));
  assert(!r.some((t) => t.startsWith('fernand:')), 'Fernand se tait');
  const m = acte2();
  m.blocs = { 1234: 'station_robot' };
  const r2 = textes(jouerScene(m, 'veillee_1', AU_GUE));
  assert(r2.some((t) => t.includes('une machine qui travaille pour toi')), r2.join(' | '));
  assert(!r2.some((t) => t.startsWith('fernand:')));
});

test('Frida : à la ferme, au chapitre 4, ses mots selon l\'empreinte', () => {
  const s = acte2(10);
  s.campagne.chapitre = 3;
  assertEqual(scenesPossibles(s, { lieu: 'ferme' }).includes('frida_ferme'), false, 'avant le palier Automatisation');
  s.campagne.chapitre = 4;
  assertEqual(scenesPossibles(s, { lieu: 'monde' }).includes('frida_ferme'), false, 'à la ferme seulement');
  const r = jouerScene(s, 'frida_ferme', { lieu: 'ferme' });
  assert(r.ok, r.error);
  assertEqual(r.lignes[0].nom, 'Une inconnue');
  assert(r.lignes.some((l) => l.texte.startsWith('Ta ferme est petite')), 'empreinte basse');
  assert(!r.lignes.some((l) => l.texte.startsWith('Ta ferme grandit')));
  assert(conditionsVraies(s, { empreinte: 'basse', machines: false }) && !conditionsVraies(s, { empreinte: ['moyenne', 'haute'] }));
  assertEqual(relation(s, 'frida'), 10);
});

test('la fortune de Maurice : à la calèche, Achille cordial, après la veillée et 20 nuits', () => {
  const s = acte2(10);
  s.day = 22;
  const ici = { lieu: 'caleche_ferme' };
  assertEqual(scenesPossibles(s, ici).includes('maurice_fortune'), false, 'pas avant la veillée');
  noterFait(s, 'veillee.1');
  ajouterRelation(s, 'achille', 10);
  assertEqual(scenesPossibles(s, ici).includes('maurice_fortune'), false, 'Achille seulement poli');
  ajouterRelation(s, 'achille', 20);
  assertEqual(scenesPossibles(s, ici).includes('maurice_fortune'), true);
  s.day = 15;
  assertEqual(scenesPossibles(s, ici).includes('maurice_fortune'), false, 'pas avant la nuit 20');
});

test('les promesses : ouvertes par le carnet, confiées en plusieurs fois, tenues une fois', () => {
  const s = createNewGame(3);
  assertEqual(promesses(s), [], 'pas de carnet, pas de promesse');
  const t = acte2();
  assertEqual(promesses(t).map((p) => p.id), Object.keys(DATA.RECIT.PROMESSES));
  assertEqual(livrerPromesse(t, 'toit_garance').ok, false, 'rien à donner');
  addItem(t, 'planche', 25); addItem(t, 'pierre', 4);
  const r1 = livrerPromesse(t, 'toit_garance');
  assertEqual([r1.ok, r1.donnes, r1.tenue], [true, { planche: 20, pierre: 4 }, false]);
  assertEqual([countItem(t, 'planche'), countItem(t, 'pierre')], [5, 0]);
  const e = etatPromesse(t, 'toit_garance');
  assertEqual([e.commencee, e.tenue, e.manque], [true, false, { pierre: 6, laine: 5 }]);
  const avant = confiance(t, 'hameau_2');
  addItem(t, 'pierre', 10); addItem(t, 'laine', 5);
  const r2 = livrerPromesse(t, 'toit_garance');
  assertEqual([r2.donnes, r2.tenue], [{ pierre: 6, laine: 5 }, true]);
  assertEqual(countItem(t, 'pierre'), 4, 'le reste reste');
  assert(aFait(t, 'promesse.toit_garance'));
  assertEqual([relation(t, 'garance'), confiance(t, 'hameau_2')], [15, avant + 3]);
  assertEqual(livrerPromesse(t, 'toit_garance').ok, false, 'déjà tenue');
  assertEqual(livrerPromesse(t, 'promesse_inventee').ok, false);
  // une sauvegarde abîmée : des quantités qui ne sont pas des nombres comptent pour rien
  t.recit.promesses.scie_bois_joli = { lingot_fer: 'beaucoup' };
  assertEqual(etatPromesse(t, 'scie_bois_joli').donne.lingot_fer, 0);
});
