/* ==========================================================================
   Tests du moteur : les anciennes parties (fiche 9a).
   - les sauvegardes témoins (tests/engine/temoins.json : une par grande époque du format, écrites
     par le moteur de chaque version d'alors ; anciennes-parties.json : celles d'avant la ferme
     générée) migrent jusqu'à aujourd'hui sans rien perdre ni dupliquer : l'argent, l'inventaire,
     les bâtiments (les blocs, aux cases du monde), les bêtes, les cultures, le cheval, la famille,
     le didacticiel, la campagne, ce qui a été pris dans le monde, les hameaux, leurs habitants, la
     calèche ; la ferme au même endroit ; puis la partie joue quelques nuits ;
   - une sauvegarde abîmée (un champ manquant, un type faux, du n'importe quoi) ne fait pas planter
     le moteur : reparerPartie remet les valeurs de départ là où il le faut, et rien d'autre.
   Lancer seul : node --test tests/engine/temoins.test.mjs (ou node tests/run-tests.mjs temoins).
   ========================================================================== */

import { readFileSync } from 'node:fs';
import {
  caseDuMonde, caseVue, chevalOu, countItem, createInitialState, DATA, farmSeed, farmTerrain, FERME_DANS_MONDE,
  genererFerme, migrate, reparerPartie, STATE_VERSION, tick,
} from '../../js/engine/index.js';
import { assert, assertEqual, sleepOnce, test } from './aide.mjs';

const lire = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8'));
const TEMOINS = lire('./temoins.json');
const ANCIENNES = lire('./anciennes-parties.json');
const EPOQUES = ['v50', 'v51', 'v52', 'v54', 'v57'];
const copie = (x) => structuredClone(x);
const migre = (s) => migrate({ v: s.version, t: 0, s: copie(s) });

// Le décalage d'une case de la ferme seule (une partie d'avant le format 52) vers le monde.
function versLeMonde(avant) {
  if (avant.version >= 52) return (t) => t;
  const W0 = genererFerme(farmSeed(avant)).terrain.LARGEUR;
  return (t) => caseDuMonde(Number(t), W0);
}
const compte = (s) => Object.fromEntries(Object.keys(s.inventaire || {}).map((o) => [o, countItem(s, o)]).filter(([, n]) => n > 0));

// Tout ce qu'une partie migrée doit avoir gardé de son témoin.
function gardee(nom, avant, m) {
  const ici = versLeMonde(avant), [ox, oy] = FERME_DANS_MONDE;
  assertEqual(m.version, STATE_VERSION, `${nom} : migrée`);
  assertEqual([m.pieces, m.day, m.awakeMs, m.rngSeed], [avant.pieces, avant.day, avant.awakeMs, avant.rngSeed], `${nom} : l'argent, le jour`);
  // l'inventaire : le même (le cheval laissé en ville au format 50 rend son poteau et sa corde)
  const attendu = compte(avant);
  if (avant.cheval && avant.cheval.attache) for (const o of DATA.CHEVAL.ATTACHE) attendu[o] = (attendu[o] || 0) + 1;
  assertEqual(compte(m), attendu, `${nom} : l'inventaire`);
  assertEqual(m.boite, avant.boite, `${nom} : la boîte à nourriture`);
  // les bâtiments : chaque bloc à sa case du monde, aucun de perdu ni de plus
  const blocs = Object.entries(avant.blocs || {});
  assert(blocs.length > 100, `${nom} : un témoin bâti (${blocs.length} blocs)`);
  assertEqual(Object.keys(m.blocs).length, blocs.length, `${nom} : autant de blocs`);
  for (const [t, sorte] of blocs) assertEqual(m.blocs[ici(t)], sorte, `${nom} : le bloc ${sorte} en ${t}`);
  for (const k of ['sols', 'hauteurs', 'fenetres']) {
    if (avant[k]) assertEqual(Object.entries(m[k]).sort(), Object.entries(avant[k]).map(([t, v]) => [String(ici(t)), v]).sort(), `${nom} : ${k}`);
  }
  for (const k of ['silo', 'poulailler', 'stations', 'atelier']) assertEqual(m[k], avant[k], `${nom} : ${k}`);
  // les bêtes, le cheval (à l'Écurie)
  assertEqual(m.paturage, avant.paturage, `${nom} : l'Étable`);
  assert(m.poulailler.poules >= 3, `${nom} : les poules`);
  assertEqual([chevalOu(m), m.cheval.nourri], ['ecurie', avant.cheval.nourri], `${nom} : le cheval`);
  // les cultures : les mêmes, chacune sur sa case (une par case, sous aucun bloc)
  const sans = (p) => { const { case: c, ...r } = p; return r; };
  assertEqual(m.potager.parcelles.map(sans), avant.potager.parcelles.map(sans), `${nom} : les parcelles`);
  assertEqual(m.potager.parcelles.map((p) => p.case), avant.potager.parcelles.map((p) => ici(p.case)), `${nom} : leurs cases`);
  assert(m.potager.parcelles.filter((p) => p.culture).length >= 6, `${nom} : des cultures`);
  const cases = m.potager.parcelles.map((p) => p.case);
  assertEqual(new Set(cases).size, cases.length, `${nom} : une parcelle par case`);
  assert(cases.every((t) => !m.blocs[t]), `${nom} : aucune parcelle sous un bloc`);
  // la famille, le didacticiel, la campagne, la progression
  assertEqual(m.famille.membres.map((x) => [x.id, x.prenom, x.genre, x.enfant]), avant.famille.membres.map((x) => [x.id, x.prenom, x.genre, x.enfant]), `${nom} : la famille`);
  assertEqual([m.famille.nom, m.famille.principal, m.famille.reserve], [avant.famille.nom, avant.famille.principal, avant.famille.reserve], `${nom} : la famille`);
  assertEqual(m.didacticiel, avant.didacticiel, `${nom} : le didacticiel`);
  assertEqual(m.campagne, avant.campagne, `${nom} : la campagne`);
  assertEqual(m.progression, avant.progression, `${nom} : le niveau`);
  // les arbres, les rochers et les touffes touchés de la ferme : les mêmes, aux identifiants du monde
  const decale = (o, px = 1) => Object.keys(o || {}).map((id) => { if (avant.version >= 52) return id; const [c, r] = id.split(',').map(Number); return `${c + ox * px},${r + oy * px}`; }).sort();
  for (const k of ['arbres', 'rochers']) assertEqual(Object.keys(m.outils[k] || {}).sort(), decale(avant.outils[k]), `${nom} : ${k} touchés`);
  assertEqual(Object.keys(m.outils.herbes || {}).sort(), decale(avant.outils.herbes, 16), `${nom} : touffes fauchées`);
  // la ferme au même endroit, sa graine ; vue d'office, avec sa prairie
  const T = farmTerrain(m);
  assertEqual([farmSeed(m), T.FERME.X, T.FERME.Y], [farmSeed(avant), ...FERME_DANS_MONDE], `${nom} : la ferme`);
  assert(m.potager.parcelles.every((p) => caseVue(m, p.case, T)), `${nom} : la ferme est vue`);
  assertEqual([m.monde.boussole, m.monde.but], [true, null], `${nom} : la boussole`);
  assert(m.caleche && typeof m.caleche === 'object', `${nom} : la calèche`);
  // les époques du grand monde : ce qui y a été pris, les hameaux vus, leurs habitants, la calèche
  if (avant.monde) {
    for (const k of ['vues', 'pris', 'hameaux', 'habitants']) if (avant.monde[k]) assertEqual(m.monde[k], avant.monde[k], `${nom} : monde.${k}`);
  }
  if (avant.caleche) assertEqual(m.caleche, avant.caleche, `${nom} : la calèche`);
  // rien ne bouge à une deuxième migration
  assertEqual(migrate({ v: m.version, t: 0, s: copie(m) }), m, `${nom} : une seule fois`);
}

// Quelques nuits : la partie continue (rien ne plante, rien ne disparaît).
function joue(nom, m) {
  const blocs = Object.keys(m.blocs).length, membres = m.famille.membres.length, poules = m.poulailler.poules;
  for (let n = 0; n < 4; n++) {
    tick(m, 5);
    assert(sleepOnce(m) !== null, `${nom} : la nuit ${n + 1}`);
  }
  assertEqual([Object.keys(m.blocs).length, m.famille.membres.length, m.poulailler.poules], [blocs, membres, poules], `${nom} : après quatre nuits`);
  assert(Number.isFinite(m.pieces) && m.pieces >= 0, `${nom} : l'argent`);
}

/* ---------- les témoins ---------- */

test('les témoins : une partie de chaque époque (format 50 à 57), écrite par le moteur d\'alors', () => {
  assertEqual(EPOQUES.map((k) => TEMOINS[k].s.version), [50, 51, 52, 54, 57]);
  for (const k of EPOQUES) {
    const s = TEMOINS[k].s;
    assertEqual(TEMOINS[k].v, s.version, k);
    assert(Object.keys(s.blocs).length > 100 && s.cheval && s.didacticiel && s.paturage.moutons.length === 2, `${k} : une partie avancée`);
  }
  // ce que chaque époque avait de propre
  assertEqual([TEMOINS.v50.s.cheval.attache.carte, 'monde' in TEMOINS.v51.s, 'monde' in TEMOINS.v52.s], ['ville', false, false]);
  assert(TEMOINS.v54.s.monde.pris[TEMOINS.pris.v54], 'v54 : un arbre du monde pris');
  assert(Object.keys(TEMOINS.v57.s.monde.habitants).length === 1 && TEMOINS.v57.s.caleche, 'v57 : un hameau habité, la calèche');
});

for (const k of EPOQUES) {
  test(`les témoins : la partie du format ${k.slice(1)} migre sans rien perdre, puis joue quatre nuits`, () => {
    const avant = TEMOINS[k].s, m = migre(avant);
    gardee(k, avant, m);
    joue(k, m);
  });
}

test('les témoins : les parties d\'avant la ferme générée (format 46) déménagent, puis jouent quatre nuits', () => {
  for (const nom of ['avancee', 'debut']) {
    const avant = ANCIENNES[nom], m = migre(avant);
    assertEqual(m.version, STATE_VERSION, nom);
    assertEqual([m.pieces, m.famille.membres.length, m.campagne.chapitre], [avant.pieces, avant.famille.membres.length, avant.campagne.chapitre], nom);
    for (const [o] of Object.entries(compte(avant))) assert(countItem(m, o) >= countItem(avant, o), `${nom} : ${o}`);
    assertEqual([farmTerrain(m).FERME.X, farmTerrain(m).FERME.Y], FERME_DANS_MONDE, `${nom} : la ferme dans le monde`);
    assertEqual(migrate({ v: m.version, t: 0, s: copie(m) }), m, `${nom} : une seule fois`);
    for (let n = 0; n < 4; n++) assert(sleepOnce(m) !== null, `${nom} : la nuit ${n + 1}`);
  }
});

/* ---------- une sauvegarde abîmée ---------- */

// Ce qu'on peut trouver dans une sauvegarde bricolée, coupée ou abîmée.
const ABIMEES = {
  'sans inventaire': (s) => { delete s.inventaire; },
  'l\'inventaire en liste': (s) => { s.inventaire = ['bois', 'pierre']; },
  'l\'argent en texte': (s) => { s.pieces = 'beaucoup'; },
  'l\'argent infini': (s) => { s.pieces = null; },
  'sans famille': (s) => { delete s.famille; },
  'des membres en texte': (s) => { s.famille.membres = 'quatre'; },
  'sans potager': (s) => { delete s.potager; },
  'des parcelles en objet': (s) => { s.potager.parcelles = { a: 1 }; },
  'sans monde': (s) => { delete s.monde; },
  'le vu en nombre': (s) => { s.monde.vu = 42; },
  'les régions vues en texte': (s) => { s.monde.vues = '5,4'; },
  'pris en liste': (s) => { s.monde.pris = [1, 2]; },
  'la calèche en texte': (s) => { s.caleche = 'loin'; },
  'les blocs en liste': (s) => { s.blocs = [1, 2, 3]; },
  'le jour en texte': (s) => { s.day = 'lundi'; },
  'sans progression': (s) => { delete s.progression; },
  'la campagne nulle': (s) => { s.campagne = null; },
  'les outils en nombre': (s) => { s.outils = 3; },
  'l\'énergie négative': (s) => { s.energie = -5; },
};

test('une sauvegarde abîmée : le moteur la relit avec des valeurs de départ, sans planter, et la partie continue', () => {
  const base = TEMOINS.v57.s;
  for (const [quoi, abime] of Object.entries(ABIMEES)) {
    const s = copie(base);
    abime(s);
    let m;
    try { m = migrate({ v: s.version, t: 0, s }); } catch (e) { throw new Error(`${quoi} : la migration plante (${e.message})`); }
    assertEqual(m.version, STATE_VERSION, quoi);
    try {
      tick(m, 2);
      sleepOnce(m);
      tick(m, 2);
    } catch (e) {
      throw new Error(`${quoi} : la partie plante (${e.stack.split('\n').slice(0, 3).join(' | ')})`);
    }
    assert(Number.isFinite(m.pieces) && Number.isInteger(m.day), `${quoi} : l'argent et le jour`);
    // ce qui n'était pas abîmé reste
    assertEqual(farmSeed(m), farmSeed(base), `${quoi} : la ferme`);
    if (quoi !== 'les blocs en liste') assertEqual(Object.keys(m.blocs).length, Object.keys(base.blocs).length, `${quoi} : les blocs`);
  }
});

test('une sauvegarde abîmée : reparerPartie ne change rien à une partie saine, remet le départ là où c\'est faux', () => {
  for (const k of EPOQUES) {
    const m = migre(TEMOINS[k].s);
    assertEqual(reparerPartie(copie(m)), m, `${k} : rien ne change`);
  }
  const neuve = createInitialState(3);
  assertEqual(reparerPartie(copie(neuve)), neuve, 'une partie neuve non plus');
  const s = migre(TEMOINS.v57.s);
  s.pieces = 'x'; s.monde.vu = 7; delete s.famille.membres; s.caleche = [];
  const r = reparerPartie(s);
  assertEqual([r.pieces, typeof r.monde.vu, r.famille.membres.length, Array.isArray(r.caleche)], [neuve.pieces, 'string', DATA.FAMILLE.MEMBRES.length, false]);
  assertEqual(r.monde.pris, TEMOINS.v57.s.monde.pris, 'le reste du monde est gardé');
  // n'importe quoi à la place de la sauvegarde : une partie de départ, pas une exception
  for (const brut of [null, 42, 'texte', [], { s: 'x' }, { v: 57, s: { version: 'cinquante' } }]) {
    const p = migrate(brut);
    assertEqual(p.version, STATE_VERSION, JSON.stringify(brut));
    tick(p, 1);
  }
});
