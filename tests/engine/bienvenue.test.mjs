/* ==========================================================================
   Tests du moteur : le démarrage et l'accueil (fiche 18).
   - les enfants choisis au démarrage (composeFamily) : chacun son personnage d'enfant et son
     prénom, tels que choisis ; un personnage qui n'existe pas est refusé ; une partie déjà
     commencée ne change pas (la migration ne touche pas à la famille) ;
   - la visite de bienvenue (js/engine/bienvenue.js) : le visiteur, un adulte du hameau le plus
     proche de la ferme (déterministe, il naît avec son hameau) ; elle n'arrive que le jour 2, de
     11 h à 17 h, une seule fois ; le plat (un plat cuisiné nourrissant) donné de sa main, +1 à
     l'inventaire ; le joueur absent : le plat posé devant la porte, donné au retour ; la journée
     passée sans visite : la nuit pose le plat, rien ne se bloque ;
   - la migration v61 → v62 : une partie qui n'a pas passé le jour 2 l'attend, une plus avancée non.
   Lancer seul : node --test tests/engine/bienvenue.test.mjs (ou node tests/run-tests.mjs bienvenue).
   ========================================================================== */

import {
  awakeMsAtHour, countItem, createInitialState, createNewGame, DATA, elementsSol, finishSetup, genererMonde, memberPerso,
  migrate, reparerPartie, runNight, solDirect, STATE_VERSION, composeFamily,
} from '../../js/engine/index.js';
import {
  BIENVENUE, bienvenueDe, bienvenueDonne, bienvenueDue, bienvenueEnRoute, bienvenueModele, bienvenueNuit, bienvenuePose,
  bienvenuePrepare, choisirVisiteur, deHameau, phraseBienvenue,
} from '../../js/engine/bienvenue.js';
import { habitantsDe } from '../../js/engine/habitants.js';
import { assert, assertEqual, test } from './aide.mjs';

const copie = (x) => JSON.parse(JSON.stringify(x));

// Une nouvelle partie, la famille installée (comme après « C'est parti ! »).
function nouvelle(seed = 3) {
  const s = createNewGame(seed);
  const r = composeFamily(s, { perso: 3, prenom: 'Léa', nom: 'Martin', enfants: [{ prenom: 'Zoé', perso: 7 }] });
  assert(r.ok, r.error);
  assert(finishSetup(s).ok);
  return s;
}
// La partie au jour `jour`, à `h` heures.
function a(s, jour, h) {
  s.day = jour;
  s.awakeMs = awakeMsAtHour(h);
  s.nuitEnCours = null;
  return s;
}
// Les plans des hameaux du monde de la partie (le Web Worker les donne à la page).
const plansDe = new Map();
function plans(s) {
  const g = s.carte.graine;
  if (!plansDe.has(g)) {
    const sol = solDirect(genererMonde(g).terrain);
    elementsSol(sol.ctx);
    plansDe.set(g, sol.ctx.hameaux.plans);
  }
  return plansDe.get(g);
}

/* ---------- les enfants choisis au démarrage ---------- */

test('le démarrage : chaque enfant a le personnage et le prénom choisis', () => {
  const s = createNewGame(1);
  const r = composeFamily(s, {
    perso: 4, prenom: 'Léa', nom: 'Martin', compagnon: { perso: 9, prenom: 'Hugo' },
    enfants: [{ prenom: 'Zoé', perso: 12 }, { prenom: 'Noé', perso: 31 }, { prenom: 'Lou', perso: DATA.FAMILLE.PROFIL.PERSOS_ENFANT }],
  });
  assert(r.ok, r.error);
  const enfants = s.famille.membres.filter((m) => m.enfant);
  assertEqual(enfants.map((m) => [m.id, m.prenom, m.perso, memberPerso(m)]), [
    ['enfant-1', 'Zoé', 12, 12], ['enfant-2', 'Noé', 31, 31], ['enfant-3', 'Lou', DATA.FAMILLE.PROFIL.PERSOS_ENFANT, DATA.FAMILLE.PROFIL.PERSOS_ENFANT],
  ]);
  assert(finishSetup(s).ok);
  // un personnage d'enfant qui n'existe pas : refusé, rien ne change
  const t = createNewGame(1), avant = copie(t.famille);
  for (const perso of [0, DATA.FAMILLE.PROFIL.PERSOS_ENFANT + 1, 2.5, '3']) {
    assertEqual(composeFamily(t, { perso: 4, prenom: 'Léa', nom: 'Martin', enfants: [{ prenom: 'Zoé', perso }] }).error, 'Personnage d\'enfant inconnu.', `perso ${perso}`);
  }
  assertEqual(t.famille, avant);
});

test('une partie déjà commencée garde ses enfants (la migration v61 → v62 ne touche pas à la famille)', () => {
  const s = nouvelle(5);
  const enfant = s.famille.membres.find((m) => m.enfant);
  enfant.perso = 21;
  const { bienvenue, ...v61 } = copie(s);
  const m = migrate({ v: 61, t: 0, s: { ...v61, version: 61 } });
  assertEqual(m.version, STATE_VERSION);
  assertEqual(m.famille, s.famille);
});

/* ---------- la visite de bienvenue ---------- */

test('la visite : le visiteur est un adulte du hameau le plus proche, toujours le même', () => {
  const s = nouvelle(3), t = nouvelle(3);
  const P = plans(s);
  assert(P.length > 0, 'des hameaux dans le monde');
  const v = choisirVisiteur(s, P), w = choisirVisiteur(t, P);
  assertEqual(v, w, 'déterministe (la graine du monde)');
  assert(v.hameauId && v.hameau && v.membre, 'un habitant d\'un hameau');
  // le plus proche du milieu de la ferme
  const T = genererMonde(s.carte.graine).terrain, F = T.FERME, W = T.LARGEUR;
  const cx = F.X + (F.LARGEUR >> 1), cy = F.Y + (F.HAUTEUR >> 1);
  const d = (p) => Math.hypot((p.case % W) - cx, Math.floor(p.case / W) - cy);
  // (un hameau : pas une bâtisse du récit, la cabane, l'atelier)
  const proche = P.filter((x) => !x.batisse).sort((x, y) => d(x) - d(y))[0];
  assertEqual(v.hameauId, proche.id);
  assertEqual(v.depart, proche.case);
  // ses habitants sont nés : le visiteur est l'un d'eux, un adulte
  const h = habitantsDe(s)[proche.id];
  const m = h.foyers.flatMap((f) => f.membres).find((x) => x.id === v.membre);
  assert(m && !m.enfant, 'un adulte du hameau');
  assertEqual([v.prenom, v.perso], [m.prenom, m.perso]);
  // sans plans (le monde pas encore là) : un voisin, sans hameau
  const u = choisirVisiteur(nouvelle(3), null);
  assertEqual([u.hameau, u.depart], [null, null]);
  assert(u.prenom && u.perso >= 1, 'un prénom, un personnage');
  assertEqual(deHameau('Le Moulin'), 'du Moulin');
  assertEqual(deHameau('La Combe'), 'de la Combe');
  assertEqual(deHameau('Les Saules'), 'des Saules');
  assertEqual(deHameau('Orval'), 'd\'Orval');
  assertEqual(deHameau('Brume-Haute'), 'de Brume-Haute');
});

test('la visite : le jour 2, de 11 h à 17 h seulement, la famille installée', () => {
  const s = nouvelle();
  assertEqual(bienvenueDe(s).etat, 'attendue');
  for (const [jour, h, due] of [[1, 12, false], [2, 10, false], [2, 11, true], [2, 13, true], [2, 16, true], [2, 17, false], [3, 12, false]]) {
    assertEqual(bienvenueDue(a(s, jour, h)), due, `jour ${jour}, ${h} h`);
  }
  const t = a(createNewGame(3), 2, 12);
  assertEqual(bienvenueDue(t), false, 'pas avant que la famille soit installée');
});

test('la visite : il donne un plat nourrissant (+1 à l\'inventaire), une seule fois par partie', () => {
  const s = a(nouvelle(), 2, 11);
  bienvenuePrepare(s, plans(s));
  const plat = bienvenueDe(s).plat;
  assert(DATA.RECETTES[plat] && DATA.OBJETS[plat].mangeable && DATA.OBJETS[plat].energie >= 60, `un plat nourrissant (${plat})`);
  assertEqual(bienvenueModele(s), null, 'rien sur la carte avant qu\'il se mette en route');
  assert(bienvenueEnRoute(s).ok);
  const M = bienvenueModele(s);
  assertEqual([M.etat, M.prenom, M.plat.id, M.depart], ['en_route', bienvenueDe(s).qui.prenom, plat, bienvenueDe(s).qui.depart]);
  assert(M.phrase.includes(M.prenom) && M.phrase.includes(deHameau(M.hameau)) && M.phrase.includes(BIENVENUE.DITS[plat]), M.phrase);
  assertEqual(M.phrase, phraseBienvenue(s));
  const avant = countItem(s, plat);
  const r = bienvenueDonne(s);
  assert(r.ok, r.error);
  assertEqual([r.remis, countItem(s, plat) - avant, bienvenueDe(s).etat, bienvenueDe(s).jour], ['main', 1, 'faite', 2]);
  assertEqual(bienvenueModele(s), null);
  // une seule fois : ni de nouveau en route, ni un second plat, ni le lendemain
  assertEqual(bienvenueEnRoute(s).ok, false);
  assertEqual(bienvenueDonne(s).ok, false);
  assertEqual(bienvenueDue(a(s, 2, 12)), false);
  runNight(s);
  assertEqual(bienvenueDue(a(s, 2, 12)), false);
  assertEqual([bienvenueDe(s).etat, countItem(s, plat) - avant], ['faite', 1]);
  // la sauvegarde la garde
  const relue = migrate({ v: s.version, t: 0, s: copie(s) });
  assertEqual(relue.bienvenue, s.bienvenue);
});

test('la visite : le joueur absent, le plat attend devant la porte et lui est donné au retour', () => {
  const s = a(nouvelle(), 2, 12);
  bienvenueEnRoute(s, plans(s));
  const plat = bienvenueDe(s).plat, avant = countItem(s, plat);
  // personne n'ouvre : il pose le plat (rien à l'inventaire encore)
  assert(bienvenuePose(s).ok);
  assertEqual([bienvenueDe(s).etat, countItem(s, plat) - avant], ['posee', 0]);
  assertEqual(bienvenueModele(s).etat, 'posee', 'la carte montre le plat devant la porte');
  assertEqual(bienvenuePose(s).ok, false);
  // il passe la nuit dehors, le plat attend toujours (la nuit ne le perd pas)
  runNight(s);
  assertEqual([bienvenueDe(s).etat, countItem(s, plat) - avant], ['posee', 0]);
  // le personnage revient à la porte : le plat est à lui
  const r = bienvenueDonne(s);
  assertEqual([r.ok, r.remis, countItem(s, plat) - avant, bienvenueDe(s).etat], [true, 'porte', 1, 'faite']);
});

test('la visite : la journée passée sans visite (la scène fermée, la mine) : la nuit pose le plat, rien ne se bloque', () => {
  // personne ne l'a fait venir : il est tiré la nuit (un voisin, sans les plans) et le plat est posé
  const s = a(nouvelle(), 2, 20);
  assertEqual(bienvenueNuit(a(nouvelle(), 1, 20)), false, 'le jour 1 : rien');
  runNight(s);
  const b = bienvenueDe(s);
  assertEqual([b.etat, s.day], ['posee', 3]);
  assert(b.qui && b.plat, 'un visiteur et un plat');
  assertEqual(bienvenueDue(a(s, 3, 12)), false, 'il ne revient pas le jour 3');
  const avant = countItem(s, b.plat);
  assert(bienvenueDonne(s).ok);
  assertEqual(countItem(s, b.plat) - avant, 1);
  // en route (il attendait à la porte) quand la nuit tombe : le plat est posé aussi
  const t = a(nouvelle(), 2, 16);
  bienvenueEnRoute(t, plans(t));
  runNight(t);
  assertEqual(bienvenueDe(t).etat, 'posee');
  // une visite abîmée dans la sauvegarde reprend la forme de départ
  const u = nouvelle();
  u.bienvenue = 'visite';
  assertEqual(reparerPartie(u).bienvenue, { etat: 'attendue', qui: null, plat: null, remis: null, jour: null });
  u.bienvenue = { etat: 'nimporte' };
  assertEqual(bienvenueDe(u).etat, 'attendue');
});

test('migration v61 → v62 : la visite attendue avant le jour 2, déjà passée après', () => {
  assertEqual(STATE_VERSION, 62);
  const neuve = createInitialState(4);
  assertEqual(neuve.bienvenue, { etat: 'attendue', qui: null, plat: null, remis: null, jour: null });
  for (const [jour, etat] of [[1, 'attendue'], [2, 'attendue'], [3, 'faite'], [40, 'faite']]) {
    const { bienvenue, ...v61 } = copie({ ...neuve, day: jour });
    const m = migrate({ v: 61, t: 0, s: { ...v61, version: 61 } });
    assertEqual([m.version, m.bienvenue.etat, m.bienvenue.qui], [62, etat, null], `jour ${jour}`);
  }
  // depuis v60 (la place v60 → v61 d'une autre fiche) : jusqu'au bout
  const { bienvenue, ...v60 } = copie({ ...neuve, day: 9 });
  const m = migrate({ v: 60, t: 0, s: { ...v60, version: 60 } });
  assertEqual([m.version, m.bienvenue.etat], [62, 'faite']);
});
