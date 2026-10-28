/* ==========================================================================
   Tests du moteur : le récit de Céron (js/engine/recit.js, data/recit.json, docs/recit/).
   - les faits : notés avec leur premier et leur dernier jour, leur nombre ; leur âge (récent,
     souvenir, ancien) ;
   - les relations (bornées, entières, paliers) et la confiance des hameaux (départ, niveaux) ;
   - le carnet : une page une seule fois, seulement celles qui existent ;
   - les actes : le chapitre ET le plancher de nuits ;
   - les conditions de chaque sorte, les textes (genre, {prenom}, {nom}, variables) ;
   - le choix d'une réplique : la plus prioritaire, déterministe, « une fois », le repos ; ses effets ;
   - les scènes de l'acte I : une seule fois, dans l'ordre que leurs conditions imposent ;
   - les anciennes parties : sans récit, reparerPartie le remet vide (le format ne change pas).
   Lancer seul : node --test tests/engine/recit.test.mjs (ou node tests/run-tests.mjs recit).
   ========================================================================== */

import {
  awakeMsAtHour, composeFamily, createInitialState, createNewGame, DATA, finishSetup, migrate, reparerPartie, STATE_VERSION,
} from '../../js/engine/index.js';
import {
  acteEnCours, aFait, ageFait, ageSouvenir, ajouterConfiance, ajouterFragment, ajouterRelation, carnet, choisirReplique,
  conditionsVraies, confiance, foisFait, jouerScene, niveauConfiance, noterFait, nouveauRecit, palier, palierNom, parler,
  recitDe, relation, repliquesPossibles, RECIT, scenesPossibles, texteRecit,
} from '../../js/engine/recit.js';
import { assert, assertEqual, test } from './aide.mjs';

// Une nouvelle partie, la famille installée (Léa, une enfant).
function nouvelle(seed = 3, enfants = [{ prenom: 'Zoé', perso: 7 }]) {
  const s = createNewGame(seed);
  const r = composeFamily(s, { perso: 3, prenom: 'Léa', nom: 'Martin', enfants });
  assert(r.ok, r.error);
  assert(finishSetup(s).ok);
  return s;
}
// La partie au jour `jour`, à `h` heures.
function a(s, jour, h = 10) {
  s.day = jour;
  s.awakeMs = awakeMsAtHour(h);
  s.nuitEnCours = null;
  return s;
}
// Le premier jour du mois où la lune est dans la phase `id` (le jour 1 est le premier croissant).
function jourDeLune(id) {
  let j = 1;
  for (const p of DATA.LUNE.PHASES) { if (p.id === id) return j; j += p.jours; }
  return 1;
}

test('récit : une partie neuve a un récit vide', () => {
  const s = createInitialState(1);
  assertEqual(s.recit, nouveauRecit());
  assertEqual(s.recit, { faits: {}, relations: {}, confiance: {}, dites: {}, carnet: [] });
});

test('récit : les faits gardent leur premier jour, leur dernier jour et leur nombre', () => {
  const s = a(nouvelle(), 4);
  assert(noterFait(s, 'vente.caleche'), 'la première fois');
  assert(!noterFait(s, 'vente.caleche'), 'la deuxième fois n\'est plus la première');
  a(s, 9);
  noterFait(s, 'vente.caleche');
  assertEqual(recitDe(s).faits['vente.caleche'], [4, 9, 3]);
  assertEqual([aFait(s, 'vente.caleche'), aFait(s, 'jamais'), foisFait(s, 'vente.caleche'), foisFait(s, 'jamais')], [true, false, 3, 0]);
  // l'âge se compte depuis la dernière fois
  assertEqual([ageFait(s, 'vente.caleche'), ageSouvenir(s, 'vente.caleche'), ageFait(s, 'jamais'), ageSouvenir(s, 'jamais')], [0, 'recent', null, null]);
  a(s, 9 + RECIT.AGES.RECENT + 1);
  assertEqual(ageSouvenir(s, 'vente.caleche'), 'souvenir');
  a(s, 9 + RECIT.AGES.SOUVENIR + 1);
  assertEqual(ageSouvenir(s, 'vente.caleche'), 'ancien');
  // une liste de faits, notés ensemble
  noterFait(s, ['a', 'b']);
  assertEqual([aFait(s, 'a'), aFait(s, 'b')], [true, true]);
});

test('récit : les relations sont des entiers bornés, rangés en paliers', () => {
  const s = nouvelle();
  assertEqual([relation(s, 'achille'), palier(s, 'achille'), palierNom(s, 'achille')], [0, 0, 'inconnu']);
  assertEqual(ajouterRelation(s, 'achille', 12.6), { ok: true, valeur: 13 });
  assertEqual([palier(s, 'achille'), palierNom(s, 'achille')], [1, 'poli']);
  assertEqual(ajouterRelation(s, 'achille', 500).valeur, RECIT.RELATION_MAX);
  assertEqual(palierNom(s, 'achille'), 'intime');
  assertEqual(ajouterRelation(s, 'achille', -1000).valeur, 0);
  assert(!ajouterRelation(s, 'personne', 5).ok, 'un personnage inconnu est refusé');
  assertEqual(Object.keys(recitDe(s).relations), ['achille']);
});

test('récit : la confiance des hameaux part de DEPART et se range en trois niveaux', () => {
  const s = nouvelle();
  assertEqual([confiance(s, 'h3'), niveauConfiance(s, 'h3')], [RECIT.CONFIANCE.DEPART, 'cordiale']);
  assertEqual(ajouterConfiance(s, 'h3', 25), { ok: true, valeur: 75 });
  assertEqual([confiance(s, 'h3'), niveauConfiance(s, 'h3')], [75, 'chaleureuse']);
  ajouterConfiance(s, 'h3', -70);
  assertEqual([confiance(s, 'h3'), niveauConfiance(s, 'h3')], [5, 'reservee']);
  ajouterConfiance(s, 'h3', 999);
  assertEqual(confiance(s, 'h3'), RECIT.CONFIANCE.MAX);
  assert(!ajouterConfiance(s, '', 5).ok, 'un hameau sans id est refusé');
});

test('récit : le carnet garde chaque page une fois, dans l\'ordre', () => {
  const s = nouvelle();
  assertEqual([ajouterFragment(s, 'note_j'), ajouterFragment(s, 'note_j'), ajouterFragment(s, 'inconnue'), ajouterFragment(s, 'page_bord')], [true, false, false, true]);
  assertEqual(carnet(s).map((p) => p.id), ['note_j', 'page_bord']);
  assertEqual(carnet(s)[0].titre, RECIT.FRAGMENTS.note_j.titre);
});

test('récit : un acte s\'ouvre avec son chapitre ET ses nuits', () => {
  const s = nouvelle();
  assertEqual(acteEnCours(s), 1);
  s.campagne.chapitre = 3;
  assertEqual(acteEnCours(a(s, 5)), 1, 'chapitre 3, mais 4 nuits seulement');
  assertEqual(acteEnCours(a(s, 11)), 2, 'chapitre 3 et 10 nuits');
  assertEqual(acteEnCours(a(s, 80)), 2, 'beaucoup de nuits, mais le chapitre 5 n\'est pas atteint');
  s.campagne.chapitre = 7;
  assertEqual(acteEnCours(a(s, 30)), 3);
  assertEqual(acteEnCours(a(s, 46)), 4);
  // la campagne finie compte pour tous ses chapitres (chapterReached), même si `chapitre` est resté en arrière
  s.campagne.chapitre = 5;
  assertEqual(acteEnCours(s), 3);
  s.campagne.fini = true;
  assertEqual(acteEnCours(s), 4, 'la campagne finie : le dernier acte');
});

test('récit : les conditions de chaque sorte', () => {
  const s = a(nouvelle(), jourDeLune('pleine'), 20);
  const vrai = (q, qui = 'achille', ctx = {}) => conditionsVraies(s, q, qui, ctx);
  assert(vrai({}), 'aucune condition : vrai');
  assertEqual([vrai({ heure: [18, 22] }), vrai({ heure: [6, 12] }), vrai({ heure: [19, 3] }), vrai({ heure: [22, 6] })], [true, false, true, false]);
  // le côté matin d'une plage qui passe minuit (2 h, la nuit en cours)
  const nuit = a(nouvelle(), 5, 10);
  nuit.nuitEnCours = { ms: 4 * DATA.TEMPS.SECONDES_PAR_HEURE * 1000, minuit: true };
  assertEqual([conditionsVraies(nuit, { heure: [22, 6] }), conditionsVraies(nuit, { heure: [6, 22] })], [true, false]);
  assertEqual([vrai({ lune: 'pleine' }), vrai({ lune: ['nouvelle', 'pleine'] }), vrai({ lune: 'nouvelle' })], [true, true, false]);
  assertEqual([vrai({ lieu: 'ferme' }, 'achille', { lieu: 'ferme' }), vrai({ lieu: ['h1', 'h2'] }, 'achille', { lieu: 'ferme' }), vrai({ lieu: 'ferme' })], [true, false, false]);
  ajouterRelation(s, 'achille', 30);
  assertEqual([vrai({ palier_min: 2 }), vrai({ palier_min: 3 }), vrai({ palier_max: 1 }), vrai({ palier_min: 0 }, null)], [true, false, false, false]);
  assertEqual([vrai({ confiance_min: 40 }, 'achille', { hameau: 'h1' }), vrai({ confiance_max: 40 }, 'achille', { hameau: 'h1' }), vrai({ confiance_min: 0 })], [true, false, false]);
  noterFait(s, 'x');
  assertEqual([vrai({ fait: 'x' }), vrai({ fait: ['x', 'y'] }), vrai({ sans_fait: 'y' }), vrai({ sans_fait: ['y', 'x'] })], [true, false, true, false]);
  assertEqual([vrai({ fait_recent: 'x' }), vrai({ fait_souvenir: 'x' }), vrai({ fait_recent: 'y' })], [true, true, false]);
  assertEqual([vrai({ acte_min: 1 }), vrai({ acte_min: 2 }), vrai({ acte_max: 1 })], [true, false, true]);
  assertEqual([vrai({ chapitre_min: 1 }), vrai({ chapitre_min: 2 }), vrai({ jour_min: s.day }), vrai({ jour_min: s.day + 1 })], [true, false, true, false]);
  assertEqual([vrai({ jour_max: s.day }), vrai({ jour_max: s.day - 1 })], [true, false]);
  assertEqual(vrai({ installee: true }), true);
  const avantDepart = createNewGame(9);
  assertEqual([conditionsVraies(avantDepart, { installee: true }), conditionsVraies(avantDepart, { installee: false })], [false, true]);
  const genre = s.famille.membres.find((m) => m.id === s.famille.principal).genre;
  assertEqual([vrai({ genre }), vrai({ genre: genre === 'f' ? 'm' : 'f' })], [true, false]);
  assertEqual([vrai({ enfants: true }), vrai({ enfants: false })], [true, false]);
  assertEqual([vrai({ humeur: 'faim' }, 'achille', { humeur: 'faim' }), vrai({ humeur: 'faim' }, 'achille', { humeur: 'content' })], [true, false]);
  assert(!vrai({ condition_inventee: 1 }), 'une condition inconnue n\'est jamais vraie');
  const sansEnfant = nouvelle(3, []);
  assert(conditionsVraies(sansEnfant, { enfants: false }), 'une famille sans enfant');
});

test('récit : un texte prend la variante du genre, le prénom, le nom et les variables', () => {
  const s = nouvelle();
  const m = s.famille.membres.find((x) => x.id === s.famille.principal);
  m.genre = 'f';
  assertEqual(texteRecit(s, { m: 'Le petit', f: 'La petite' }), 'La petite');
  m.genre = 'm';
  assertEqual(texteRecit(s, { m: 'Le petit', f: 'La petite' }), 'Le petit');
  assertEqual(texteRecit(s, 'Bonjour {prenom} {nom}, {objet} {quand}{absente}.', { vars: { objet: 'le pain', quand: 'hier' } }), 'Bonjour Léa Martin, le pain hier.');
});

test('récit : la réplique choisie est la plus prioritaire, et le choix est déterministe', () => {
  const s = a(nouvelle(), jourDeLune('pleine'), 10);
  assertEqual(choisirReplique(s, 'achille'), choisirReplique(s, 'achille'), 'mêmes partie, jour et touchers : même réplique');
  noterFait(s, 'achille.cle');
  // la pleine lune (priorité 20) passe devant les répliques du palier « poli » (10)
  assertEqual(choisirReplique(s, 'achille').id, 'achille.pleine');
  // une vente récente (40) passe devant la pleine lune
  noterFait(s, 'vente.caleche');
  assertEqual(choisirReplique(s, 'achille').id, 'achille.vente_recente');
  // à priorité égale, les touchers successifs peuvent changer de réplique, toujours parmi les plus hautes
  const t = a(nouvelle(), jourDeLune('croissante'), 10);
  noterFait(t, 'achille.cle');
  const vus = new Set();
  for (let n = 0; n < 40; n++) vus.add(choisirReplique(t, 'achille', { n }).id);
  assertEqual([...vus].sort(), ['achille.poli.cheval', 'achille.poli.surplus']);
  assertEqual(choisirReplique(t, 'personne'), null);
});

test('récit : parler note la réplique ; « une fois » ne revient pas, le repos se compte en jours', () => {
  const s = a(nouvelle(), jourDeLune('decroissante'), 10);
  noterFait(s, ['odile.rencontre', 'odile.tutoie']);
  ajouterRelation(s, 'odile', 30);
  // « odile.enfants » (une fois, 15) d'abord
  assertEqual(parler(s, 'odile').id, 'odile.enfants');
  assertEqual(recitDe(s).dites['odile.enfants'], s.day);
  assert(!repliquesPossibles(s, 'odile').some((e) => e.id === 'odile.enfants'), 'dite une fois : plus jamais');
  a(s, s.day + 30);
  assert(!repliquesPossibles(s, 'odile').some((e) => e.id === 'odile.enfants'), 'même trente jours plus tard');
  // une réplique au repos ne revient qu'après repos_jours
  const e = parler(s, 'odile');
  const def = RECIT.REPLIQUES.find((x) => x.id === e.id);
  assert(def.repos_jours > 0, 'une réplique qui se repose');
  assert(!repliquesPossibles(s, 'odile').some((x) => x.id === e.id), 'au repos le jour même');
  a(s, s.day + def.repos_jours);
  assert(repliquesPossibles(s, 'odile').some((x) => x.id === e.id), 'de retour après son repos');
  // rien à dire : null, rien de noté
  const vide = nouvelle();
  const avant = JSON.stringify(vide.recit);
  assertEqual(parler(vide, 'johnny'), null);
  assertEqual(JSON.stringify(vide.recit), avant);
});

test('récit : les scènes de l\'acte I se jouent une fois, dans l\'ordre de leurs conditions', () => {
  const s = a(nouvelle(), 1, 9);
  // l'arrivée d'abord ; la scène des enfants l'attend ; la clé attend le chapitre 2 et la ferme
  assertEqual(scenesPossibles(s), ['arrivee']);
  const arrivee = jouerScene(s, 'arrivee');
  assert(arrivee.ok, arrivee.error);
  assertEqual(arrivee.lignes.map((l) => l.nom), ['Fernand', 'Fernand']);
  assert(aFait(s, 'arrivee') && relation(s, 'fernand') === 10, 'ses effets : le fait, la relation');
  assert(!jouerScene(s, 'arrivee').ok, 'une scène ne se rejoue pas');
  assertEqual(scenesPossibles(s), ['arrivee_enfants']);
  assert(jouerScene(s, 'arrivee_enfants').ok);
  // la clé d'Achille : le chapitre 2, à la ferme
  assertEqual(scenesPossibles(s, { lieu: 'ferme' }), []);
  s.campagne.chapitre = 2;
  assertEqual(scenesPossibles(s, { lieu: 'hameau' }), []);
  assertEqual(scenesPossibles(s, { lieu: 'ferme' }), ['achille_cle']);
  assert(jouerScene(s, 'achille_cle', { lieu: 'ferme' }).ok);
  // Odile, devant la maison de Maurice, au genre du personnage principal ; la page du carnet
  const m = s.famille.membres.find((x) => x.id === s.famille.principal);
  m.genre = 'f';
  const odile = jouerScene(s, 'odile_maison', { lieu: 'maison_maurice' });
  assert(odile.ok, odile.error);
  assertEqual(odile.lignes[0].texte, 'Vous êtes la petite d\'Adèle.');
  assertEqual(carnet(s).map((p) => p.id), ['carnet_promesses']);
  assertEqual(scenesPossibles(s, { lieu: 'maison_maurice' }), []);
  assert(!jouerScene(s, 'inconnue').ok, 'une scène inconnue est refusée');
});

test('récit : une famille sans enfant n\'a pas la scène des enfants', () => {
  const s = a(nouvelle(3, []), 1, 9);
  jouerScene(s, 'arrivee');
  assertEqual(scenesPossibles(s), []);
});

test('récit : une ancienne partie sans récit le retrouve vide, sans changer de format', () => {
  const s = createInitialState(5);
  delete s.recit;
  const m = migrate({ v: STATE_VERSION, t: 0, s: JSON.parse(JSON.stringify(s)) });
  assertEqual([m.version, m.recit], [STATE_VERSION, nouveauRecit()]);
  // un récit abîmé : reparerPartie remet les champs de travers, recitDe le reste
  const abime = createInitialState(5);
  abime.recit = { faits: 'non', relations: { achille: 12 }, carnet: null };
  reparerPartie(abime);
  const r = recitDe(abime);
  assertEqual([r.faits, r.relations, r.carnet, r.dites, r.confiance], [{}, { achille: 12 }, [], {}, {}]);
  const pasObjet = createInitialState(5);
  pasObjet.recit = 7;
  reparerPartie(pasObjet);
  assertEqual(pasObjet.recit, nouveauRecit());
});

test('récit : les effets d\'une réplique (fait, relation, confiance) passent par parler', () => {
  const s = a(nouvelle(), 3, 10);
  const essai = { id: 'essai.effets', qui: 'fernand', quand: {}, texte: 'Essai.', priorite: 100, une_fois: true, effet: { fait: ['essai.a', 'essai.b'], relation: 7, confiance: -4 } };
  RECIT.REPLIQUES.push(essai);
  try {
    assertEqual(parler(s, 'fernand', { hameau: 'h9' }).id, 'essai.effets');
    assertEqual([aFait(s, 'essai.a'), aFait(s, 'essai.b'), relation(s, 'fernand'), confiance(s, 'h9')], [true, true, 7, RECIT.CONFIANCE.DEPART - 4]);
    // sans hameau dans le contexte, l'effet de confiance ne s'applique nulle part
    recitDe(s).dites = {};
    parler(s, 'fernand');
    assertEqual([relation(s, 'fernand'), Object.keys(recitDe(s).confiance)], [14, ['h9']]);
  } finally {
    RECIT.REPLIQUES.splice(RECIT.REPLIQUES.indexOf(essai), 1);
  }
});

test('récit : les entrées abîmées de la sauvegarde ne faussent rien', () => {
  const s = a(nouvelle(), 10);
  const r = recitDe(s);
  r.faits = { texte: [1, 2, 'z'], lettres: ['a', 'b', 'c'], vides: [null, null, null], court: [1, 2] };
  for (const id of Object.keys(r.faits)) assertEqual([aFait(s, id), ageFait(s, id), foisFait(s, id)], [false, null, 0], id);
  assert(noterFait(s, 'texte'), 'une entrée abîmée se refait comme une première fois');
  assertEqual(r.faits.texte, [10, 10, 1]);
  // un texte n'est pas un nombre : ni pour la relation, ni pour la confiance
  r.relations.achille = '30';
  r.confiance.h1 = '70';
  assertEqual([relation(s, 'achille'), confiance(s, 'h1')], [0, RECIT.CONFIANCE.DEPART]);
});

test('récit : l\'arrivée ne se joue ni avant le départ, ni dans une partie avancée', () => {
  assertEqual(scenesPossibles(createNewGame(4)), [], 'la famille n\'est pas encore composée');
  const vieille = a(nouvelle(), 150);
  vieille.campagne.chapitre = 7;
  delete vieille.recit;
  const m = migrate({ v: STATE_VERSION, t: 0, s: JSON.parse(JSON.stringify(vieille)) });
  assertEqual(scenesPossibles(m, { lieu: 'ferme' }), ['achille_cle'], 'une ancienne partie : la clé, pas l\'arrivée');
});

test('récit : Odile vouvoie jusqu\'à ce qu\'elle tutoie', () => {
  const s = a(nouvelle(), 3, 10);
  jouerScene(s, 'arrivee');
  s.campagne.chapitre = 2;
  jouerScene(s, 'achille_cle', { lieu: 'ferme' });
  jouerScene(s, 'odile_maison', { lieu: 'maison_maurice' });
  const vues = new Set();
  for (let n = 0; n < 30; n++) { const r = choisirReplique(s, 'odile', { n }); if (r) vues.add(r.id); }
  assertEqual([...vues], ['odile.vous'], 'avant la première veillée, seulement le vouvoiement');
  noterFait(s, 'odile.tutoie');
  assert(!repliquesPossibles(s, 'odile').some((e) => e.id === 'odile.vous'), 'ensuite, plus jamais');
});
