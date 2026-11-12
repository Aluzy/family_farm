/* ==========================================================================
   Tests du chantier « l'île à bâtir » : l'arrivée d'un villageois (docs/ile.md, fiche I3a ; js/engine/villageois.js).
   Comme tous les fichiers tests/engine/village-*.test.mjs, il tourne avec VILLAGE.ACTIF forcé à true.
   - la maison libre : une pièce close avec un lit que la famille ne prend pas, marquée d'une boîte aux lettres
     contre sa porte ; la famille dort d'abord ailleurs ;
   - l'arrivée : un jour de bac, une maison libre ; à partir du deuxième, de quoi manger et un port assez grand ;
     un seul par passage ; la nuit installe celui qui n'est pas venu ;
   - le tirage à graine : la même partie rejoue le même villageois, deux villageois ne sont jamais identiques ;
   - la nuit : il mange à la boîte commune (une part de plus), dort dans son lit ; mal nourri ou sans lit, il se
     repose le lendemain et ne part pas ; la famille et son bonheur ne changent pas ;
   - la maison retirée : il dort à l'abri, attend, et reprend une maison libre ;
   - la sauvegarde : v86 → v87, la liste réparée ; éteint, rien ne change.
   Lancer seul : node tests/run-tests.mjs village-arrivee.
   ========================================================================== */

import {
  accueillirVillageois, arriveeDue, arriveeRefus, arriverVillageois, boiteCounts, caseArrivee, couchages, craftStatus,
  createNewGame, DATA, farmTerrain, ficheVillageois, jourDeBac, litsDeLaFamille, maisonsLibres, maisonsMarquees, migrate,
  nombreVillageois, phraseArrivee, plafondVillageois, poserBloc, prendreAvis, recetteDebloquee, reprendreBloc, runNight,
  STATE_VERSION, testMaisonVillageois, tirerVillageois, verifierMaisons, villageoisDe, villageoisNuit, villageoisPourLaCarte,
} from '../../js/engine/index.js';
import { cleDiversite } from '../../js/engine/apparence.js';
import { assert, assertEqual, avecVillage, boite, partie, sansPenalite, test } from './aide.mjs';

const copie = (o) => JSON.parse(JSON.stringify(o));

// Jusqu'au prochain jour de bac (des nuits passées, sans rien d'autre).
function versLeBac(s) {
  for (let k = 0; k < 10 && !jourDeBac(s); k++) runNight(s);
  assert(jourDeBac(s), 'un jour de bac');
  return s;
}

// La partie de test (le foyer de la famille bâti), une maison de villageois, une boîte à nourriture pleine de pain.
function ile(seed = 1, { pain = 40 } = {}) {
  const s = partie(seed);
  const m = testMaisonVillageois(s);
  assert(m.ok, 'la maison du villageois');
  boite(s, { pain });
  return { s, m };
}

/* ---------- la maison libre ---------- */

test('la maison libre : une pièce close, un lit que la famille ne prend pas, une boîte aux lettres contre sa porte', () => {
  const s = partie(2);
  const avant = couchages(s);
  assertEqual(maisonsLibres(s), [], 'sans boîte aux lettres : aucune');
  const m = testMaisonVillageois(s);
  assert(m.ok, 'bâtie');
  const L = maisonsLibres(s);
  assertEqual(L.length, 1, 'une maison libre');
  assertEqual([L[0].boite, L[0].lits], [m.boite, m.lits], 'nommée par sa boîte, son lit');
  // (la famille dort d'abord dans ses lits : celui du villageois passe après)
  assertEqual(couchages(s).slice(0, avant.length), avant, 'les lits de la famille d\'abord');
  assert(!litsDeLaFamille(s).has(m.lits[0]), 'la famille ne prend pas son lit');
  // (la boîte reprise : la pièce n'est plus marquée)
  assert(reprendreBloc(s, m.boite).ok, 'la boîte reprise');
  assertEqual(maisonsLibres(s), [], 'sans sa boîte : plus libre');
  // (posée loin de la porte : elle ne marque rien)
  const W = farmTerrain(s).LARGEUR;
  assert(poserBloc(s, 'boite_aux_lettres', m.boite + 2 * W).ok, 'posée deux rangées plus bas');
  assertEqual(maisonsMarquees(s).length, 0, 'loin de la porte : rien');
  assert(reprendreBloc(s, m.boite + 2 * W).ok);
  assert(poserBloc(s, 'boite_aux_lettres', m.boite).ok, 'reposée contre la porte');
  assertEqual(maisonsLibres(s).length, 1, 'de nouveau libre');
});

test('une maison dont la famille a besoin du lit n\'est pas libre ; la famille n\'y dort que faute d\'autre lit', () => {
  const s = createNewGame(4);
  s.famille.configuree = true;
  // (pas de foyer : le seul lit est celui de la maison marquée)
  const m = testMaisonVillageois(s);
  assert(m.ok);
  assert(litsDeLaFamille(s).has(m.lits[0]), 'la famille y dort');
  assertEqual(maisonsLibres(s), [], 'pas libre');
});

test('éteint, la boîte aux lettres ne marque rien et sa recette n\'est pas à l\'Atelier', () => {
  avecVillage(() => {
    const s = partie(2);
    const m = testMaisonVillageois(s);
    assert(m.ok);
    assertEqual(maisonsLibres(s), [], 'aucune maison libre');
    assertEqual(couchages(s).length, s.famille.membres.length + 1, 'le lit compte, dans l\'ordre des pièces');
    assertEqual(recetteDebloquee(s, 'boite_aux_lettres'), false, 'pas de recette');
    assertEqual(villageoisNuit(s), null, 'la nuit : rien');
    runNight(s);
    assert(!('villageois' in s), 'pas de champ villageois');
  }, false);
  const s = partie(2);
  assertEqual(recetteDebloquee(s, 'boite_aux_lettres'), true, 'allumé : la recette');
  assert(craftStatus(s, 'boite_aux_lettres').raison !== 'Recette inconnue.', 'elle se fabrique à l\'Atelier');
});

/* ---------- l'arrivée ---------- */

test('les conditions d\'arrivée : le jour de bac, la maison libre ; le premier vient sans autre condition', () => {
  const s = partie(5);
  assert(!jourDeBac(s) || s.day % DATA.VILLAGE.ARRIVEE.PERIODE === 0);
  versLeBac(s);
  assert(/maison libre/.test(arriveeRefus(s)), 'sans maison : refus');
  assert(testMaisonVillageois(s).ok);
  // (rien à manger : le premier vient quand même)
  assertEqual(arriveeRefus(s), null, 'le premier vient dès la première maison libre');
  runNight(s);
  assertEqual(nombreVillageois(s), 1, 'la nuit l\'a installé (personne ne l\'a vu venir)');
  const v = villageoisDe(s)[0];
  assertEqual([v.accueil, v.arrive, v.avis], [null, s.day - 1, ['arrive']], 'chez lui, l\'avis à dire');
  assertEqual(prendreAvis(s), [{ id: v.id, quoi: 'arrive' }], 'la page le dit une fois');
  assertEqual(prendreAvis(s), [], 'une seule fois');
});

test('un seul par passage ; le deuxième veut de quoi manger, le troisième un port plus grand', () => {
  const { s } = ile(6, { pain: 0 });
  versLeBac(s);
  assert(testMaisonVillageois(s).ok && testMaisonVillageois(s).ok, 'deux maisons de plus');
  assert(arriverVillageois(s).ok, 'le premier');
  assertEqual(arriveeRefus(s), 'Un seul nouveau venu par passage du bac.');
  assertEqual(arriveeDue(s), false, 'pas de second aujourd\'hui');
  runNight(s);
  versLeBac(s);
  assert(/nourrir une bouche de plus/.test(arriveeRefus(s)), 'la boîte vide : pas de deuxième');
  const R = DATA.VILLAGE.ARRIVEE.RESERVE_JOURS, AJ = DATA.FAMILLE.AJ.adulte, pain = DATA.OBJETS.pain.energie;
  boite(s, { pain: Math.ceil((R * AJ * 2) / pain) - 1 });
  assert(/nourrir/.test(arriveeRefus(s)), 'presque assez : non');
  boite(s, { pain: Math.ceil((R * AJ * 2) / pain) });
  assertEqual(arriveeRefus(s), null, 'assez pour deux');
  assert(arriverVillageois(s).ok, 'le deuxième');
  boite(s, { pain: 100 });
  runNight(s);
  versLeBac(s);
  assertEqual(plafondVillageois(s), DATA.VILLAGE.ARRIVEE.PLAFOND['1'], 'un port sans niveau : le niveau 1');
  assert(/port/.test(arriveeRefus(s)), 'au plafond du niveau 1');
  s.port = { niveau: 2 };
  assertEqual(arriveeRefus(s), null, 'le port au niveau 2');
});

test('l\'arrivée de jour : en route du port, puis chez lui ; l\'heure et la famille installée', () => {
  const { s } = ile(7);
  versLeBac(s);
  s.awakeMs = 0;   // (6 h)
  assertEqual(arriveeDue(s), false, 'trop tôt');
  s.awakeMs = (DATA.VILLAGE.ARRIVEE.HEURE - DATA.TEMPS.HEURE_REVEIL) * DATA.TEMPS.SECONDES_PAR_HEURE * 1000;
  assertEqual(arriveeDue(s), true, 'à l\'heure');
  const r = arriverVillageois(s);
  assert(r.ok && r.villageois.accueil === 'en_route', 'en route');
  assert(/^.+ .+/.test(phraseArrivee(s, r.villageois.id)) && phraseArrivee(s, r.villageois.id).includes(r.villageois.prenom), 'sa ligne dit son prénom');
  const carte = villageoisPourLaCarte(s, null);
  assertEqual(carte.length, 1);
  assertEqual(carte[0].depart, caseArrivee(s, null), 'il part du bout du chemin (pas encore de port)');
  assertEqual(caseArrivee(s, { lieux: { port: { case: 1234 } } }), 1234, 'le port du plan, quand il existe');
  assertEqual(caseArrivee(s, { port: 77 }), 77, 'ou ses lieux');
  assert(Number.isInteger(carte[0].porte) && carte[0].lit === r.villageois.lit, 'sa porte, son lit');
  assert(accueillirVillageois(s, r.villageois.id), 'il a frappé');
  assertEqual(r.villageois.accueil, null, 'chez lui');
  assertEqual(prendreAvis(s).map((a) => a.quoi), ['arrive'], 'la notification');
});

/* ---------- le tirage ---------- */

test('le tirage est déterministe ; deux villageois ne sont jamais identiques', () => {
  const a = ile(9).s, b = ile(9).s;
  versLeBac(a); versLeBac(b);
  assertEqual(copie(tirerVillageois(a)), copie(tirerVillageois(b)), 'la même partie, le même villageois');
  assert(JSON.stringify(tirerVillageois(ile(10).s)) !== JSON.stringify(tirerVillageois(a)), 'une autre graine, un autre');
  // (huit villageois d'affilée, chacun le sien : prénom, personnage, apparence, et jamais un prénom de la famille)
  const s = ile(11, { pain: 1000 }).s;
  s.port = { niveau: 5 };
  for (let k = 0; k < 7; k++) assert(testMaisonVillageois(s).ok, `maison ${k + 2}`);
  for (let k = 0; k < 8; k++) { versLeBac(s); assert(arriverVillageois(s).ok, `villageois ${k + 1}`); runNight(s); }
  const V = villageoisDe(s);
  assertEqual(V.length, 8);
  const famille = new Set(s.famille.membres.map((m) => m.prenom.toLowerCase()));
  assertEqual(new Set(V.map((v) => v.prenom)).size, 8, 'huit prénoms');
  assert(V.every((v) => !famille.has(v.prenom.toLowerCase())), 'aucun de la famille');
  assertEqual(new Set(V.map((v) => v.perso)).size, 8, 'huit personnages');
  assertEqual(new Set(V.map((v) => cleDiversite(v.apparence))).size, 8, 'huit apparences');
  assertEqual(new Set(V.map((v) => v.maison)).size, 8, 'chacun sa maison');
  assert(V.every((v) => Object.keys(v.gouts).length > 0), 'des goûts');
});

/* ---------- la nuit ---------- */

test('la nuit : il mange à la boîte commune (une part de plus) et dort dans son lit ; la famille ne change pas', () => {
  const { s, m } = ile(12, { pain: 20 });
  versLeBac(s);
  const sans = copie(s);
  assert(arriverVillageois(s, { direct: true }).ok);
  const pain = DATA.OBJETS.pain.energie, part = Math.ceil(DATA.FAMILLE.AJ.adulte / pain);
  // (sans lui : la même partie, le chantier éteint le temps de la nuit)
  runNight(s); avecVillage(() => runNight(sans), false);
  assertEqual((boiteCounts(sans).pain || 0) - (boiteCounts(s).pain || 0), part, 'une part de plus dans la boîte');
  const v = villageoisDe(s)[0];
  assertEqual([v.lit, v.faim, v.repos], [m.lits[0], 0, false], 'dans son lit, rassasié');
  assertEqual(v.journal[v.journal.length - 1].mange, { pain: part }, 'son journal');
  assertEqual(copie(s.famille), copie(sans.famille), 'la famille et son bonheur : inchangés');
  assertEqual(s.report.sansCouchage, sans.report.sansCouchage, 'les couchages de la famille aussi');
});

test('mal nourri ou sans lit : il se repose le lendemain, il ne part pas ; sans pénalité, son bonheur ne baisse pas', () => {
  sansPenalite(() => {
    const { s, m } = ile(13, { pain: 0 });
    versLeBac(s);
    assert(arriverVillageois(s, { direct: true }).ok);
    const v = villageoisDe(s)[0], b0 = v.bonheur;
    for (let k = 0; k < 5; k++) runNight(s);
    assertEqual(nombreVillageois(s), 1, 'il est toujours là');
    assert(v.repos && v.faim === DATA.FAMILLE.AJ.adulte, 'il se repose, il a eu faim');
    assert(v.bonheur >= b0, 'son bonheur ne baisse pas');
    assertEqual(ficheVillageois(s, v.id).humeur, 'faim');
    boite(s, { pain: 10 });
    runNight(s);
    assertEqual([v.repos, v.faim], [false, 0], 'nourri : il ne se repose plus');
    // (son lit repris : il dort à l'abri, se repose, ne part pas)
    assert(reprendreBloc(s, m.lits[0]).ok, 'le lit repris');
    runNight(s);
    assertEqual([nombreVillageois(s), v.maison, v.lit, v.repos], [1, null, null, true], 'à l\'abri, au repos');
  });
});

/* ---------- la maison retirée ---------- */

test('la maison retirée : il dort à l\'abri, on le dit au joueur ; une maison libre, il s\'y installe', () => {
  const { s, m } = ile(14);
  versLeBac(s);
  const v = arriverVillageois(s, { direct: true }).villageois;
  prendreAvis(s);
  // (un mur de sa maison repris : la pièce s'ouvre)
  assert(reprendreBloc(s, m.coin + 1).ok, 'un mur repris');
  assertEqual(verifierMaisons(s), { perdues: [v.id], installes: [] }, 'sa maison perdue');
  assertEqual([v.maison, v.lit, v.sansMaison], [null, null, s.day], 'à l\'abri depuis aujourd\'hui');
  assertEqual(prendreAvis(s), [{ id: v.id, quoi: 'sans_maison' }], 'on le dit au joueur');
  assert(/abri/.test(ficheVillageois(s, v.id).maison), 'sa fiche le dit');
  assertEqual(arriveeRefus(s, { jour: false }) !== null, true, 'pas de maison libre pour un autre');
  // (une autre maison bâtie : il la prend avant tout nouveau venu)
  const m2 = testMaisonVillageois(s);
  assert(m2.ok);
  assertEqual(verifierMaisons(s), { perdues: [], installes: [v.id] }, 'il s\'installe');
  assertEqual([v.maison, v.lit, v.sansMaison], [m2.boite, m2.lits[0], null]);
  assertEqual(prendreAvis(s).map((a) => a.quoi), ['installe']);
});

/* ---------- la fiche ---------- */

test('sa fiche : prénom, maison, humeur, depuis quand il est là', () => {
  const { s } = ile(15);
  versLeBac(s);
  const v = arriverVillageois(s, { direct: true }).villageois;
  runNight(s); runNight(s);
  const f = ficheVillageois(s, v.id);
  assertEqual([f.prenom, f.chezLui, f.depuis, f.jours], [v.prenom, true, v.arrive, 2]);
  assert(['heureux', 'content', 'triste'].includes(f.humeur) && typeof f.humeurTexte === 'string', 'son humeur');
  assertEqual(ficheVillageois(s, 'personne'), null);
});

/* ---------- la sauvegarde ---------- */

test('la sauvegarde : v86 → v87, sans villageois rien ne s\'ajoute ; une liste abîmée est réparée', () => {
  assertEqual(STATE_VERSION, 87);
  const ancienne = { ...copie(createNewGame(3)), version: 86 };
  delete ancienne.villageois;
  const m = migrate(ancienne);
  assertEqual(m.version, 87);
  assert(!('villageois' in m), 'une partie d\'avant : pas de champ villageois');
  const { s } = ile(16);
  versLeBac(s);
  arriverVillageois(s, { direct: true });
  runNight(s);
  const relue = migrate(copie(s));
  assertEqual(copie(relue.villageois), copie(s.villageois), 'relue telle quelle');
  const abimee = { ...copie(s), version: 86, villageois: [{ id: 'vg-1', prenom: 'Léa', maison: 'x', bonheur: 'beaucoup' }, 'n\'importe quoi', null] };
  const r = migrate(abimee).villageois;
  assertEqual(r.length, 1, 'le lisible reste');
  assertEqual([r[0].maison, r[0].lit, r[0].bonheur, r[0].journal, r[0].accueil], [null, null, DATA.BONHEUR.DEPART, [], null], 'réparé');
  assertEqual(migrate({ ...copie(s), version: 86, villageois: 'rien' }).villageois, [], 'pas une liste : vide');
});

test('éteint, une partie avec des villageois ne les montre pas (le jeu d\'avant)', () => {
  const { s } = ile(17);
  versLeBac(s);
  arriverVillageois(s, { direct: true });
  avecVillage(() => {
    assertEqual(villageoisDe(s), [], 'aucun');
    assertEqual(villageoisPourLaCarte(s), null, 'rien sur la carte');
    assertEqual(maisonsLibres(s), []);
  }, false);
});
