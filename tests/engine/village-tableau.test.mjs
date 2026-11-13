/* ==========================================================================
   Tests du chantier « l'île à bâtir » : le tableau des villageois (docs/ile.md, fiche I3d ; js/engine/tableau.js).
   Comme tous les fichiers tests/engine/village-*.test.mjs, il tourne avec VILLAGE.ACTIF forcé à true.
   - coût, produit et solde sur une semaine écrite à la main (des entiers, au prix du port) ; le jour de repos (son
     repas, aucun produit) ; ce que son travail a pris au coffre ; le total du village ; le rendement ;
   - sept jours glissants, et « hier » ; le tri ; ce qui manque, en quelques mots ;
   - le journal que la nuit écrit (le repos du jour, ce que la cuisine a pris) ;
   - le joueur automatique réattribue la tâche dont le solde est le plus bas, après des semaines pleines ;
   - éteint, rien.
   Lancer seul : node tests/run-tests.mjs village-tableau.
   ========================================================================== */

import {
  addItem, arriverVillageois, attribuer, bilanJour, bilanVillageois, botReattribuer, DATA, donnerOutil, entreesPeriode,
  farmSeed, manqueCourt, portDuMonde, runNight, soldeLePlusBas, tableauVillage, tachesNuit, testBatir,
  testMaisonVillageois, trierTableau, valeurPort, villageoisDe,
} from '../../js/engine/index.js';
import { assert, assertEqual, avecVillage, boite, partie, test } from './aide.mjs';

const P = (o) => DATA.OBJETS[o].prix;

// La partie de test : le port, `n` maisons de villageois et leurs villageois, la boîte pleine.
function ile(n = 1, seed = 1) {
  const s = partie(seed);
  portDuMonde(farmSeed(s));
  boite(s, { pain: 60 });
  for (let k = 0; k < n; k++) assert(testMaisonVillageois(s).ok, 'la maison');
  const V = [];
  for (let k = 0; k < n; k++) {
    const r = arriverVillageois(s, { direct: true });
    assert(r.ok, 'il arrive');
    V.push(r.villageois);
  }
  s.outils = { hache: true, pioche: true, faux: true, canne: true, choisi: 'hache' };
  return { s, V };
}

// Une semaine écrite à la main : le journal de `v`, du jour `de` au jour `de + jours.length - 1`, la partie au
// lendemain du dernier.
function semaine(s, v, de, jours) {
  v.journal = jours.map((j, k) => ({ jour: de + k, besoin: 50, energie: 0, lit: v.lit, bonheur: 0, ...j }));
  s.day = de + jours.length;
}

/* ---------- le calcul ---------- */

test('la valeur au port : le prix de vente ; 0 ce qui ne se vend pas ; une pièce vaut une pièce', () => {
  assertEqual(valeurPort('pain'), P('pain'), 'le pain');
  const inv = Object.keys(DATA.OBJETS).find((o) => DATA.OBJETS[o].invendable);
  assertEqual(valeurPort(inv), 0, `${inv} ne se vend pas`);
  assertEqual(valeurPort('pieces'), 1, 'les pièces');
  assertEqual(valeurPort('rien_du_tout'), 0, 'inconnu');
});

test('une semaine écrite à la main : coût, produit, solde, des entiers ; le jour de repos ; ce qu\'il a pris au coffre', () => {
  const { s, V: [v] } = ile();
  attribuer(s, v.id, 'bois');
  semaine(s, v, 10, [
    { mange: { pain: 2 }, tache: 'bois', actions: 6, produit: { bois: 9 } },
    { mange: { pain: 1, carotte: 3 }, tache: 'bois', actions: 6, produit: { bois: 6, graine_pommier: 0 } },
    { mange: { pain: 2 }, tache: 'bois', actions: 0, produit: {}, repos: true },
    { mange: {}, tache: 'bois', actions: 3, produit: { bois: 4 } },
    { mange: { pain: 2 }, tache: 'cuisine', actions: 1, produit: { soupe_legumes: 1 }, utilise: { carotte: 1, oignon: 1, patate: 1 } },
    { mange: { pain: 2 } },
    { mange: { pain: 1, oeuf: 2 }, tache: 'bois', actions: 6, produit: { bois: 9 } },
  ]);
  const b = bilanVillageois(s, v.id, 'semaine');
  assertEqual(b.jours.length, 7, 'sept jours');
  const repas = 10 * P('pain') + 3 * P('carotte') + 2 * P('oeuf');
  const matieres = P('carotte') + P('oignon') + P('patate');
  const valeur = 28 * P('bois') + P('soupe_legumes');
  assertEqual([b.repas, b.matieres, b.part, b.cout], [repas, matieres, 0, repas + matieres], 'le coût : les repas, ce que la cuisine a pris, pas de part (avant I4)');
  assertEqual(b.valeur, valeur, 'le produit, au prix du port');
  assertEqual(b.solde, valeur - repas - matieres, 'le solde');
  assertEqual(b.produit.map((x) => [x.objet, x.n, x.valeur]), [['bois', 28, 28 * P('bois')], ['soupe_legumes', 1, P('soupe_legumes')]], 'chaque objet, sa quantité, sa valeur (une quantité nulle ne compte pas)');
  for (const k of ['cout', 'valeur', 'solde', 'repas', 'matieres']) assert(Number.isInteger(b[k]), `${k} : un entier`);
  // le jour de repos : son repas, aucun produit
  const r = b.jours[2];
  assertEqual([r.repos, r.cout, r.valeur, r.solde], [true, 2 * P('pain'), 0, -2 * P('pain')], 'le repos : son repas, rien de produit');
  assertEqual([b.joursTravail, b.joursRepos], [5, 1], 'cinq jours de travail (le jour sans tâche n\'en est pas un), un de repos');
  // un jour sans tâche ni repas : rien
  const j = bilanJour({ jour: 3 });
  assertEqual([j.cout, j.valeur, j.solde, j.tache], [0, 0, 0, null], 'une entrée vide');
  // la part (I4) : comptée si elle est là
  assertEqual(bilanJour({ jour: 4, mange: { pain: 1 }, part: 5 }).cout, P('pain') + 5, 'sa part versée');
});

test('sept jours glissants, et hier : les entrées qui finissent hier', () => {
  const { s, V: [v] } = ile();
  attribuer(s, v.id, 'pierre');
  const jours = Array.from({ length: 9 }, (_, k) => ({ mange: { pain: 1 }, tache: 'pierre', actions: 6, produit: { pierre: k + 1 } }));
  semaine(s, v, 20, jours);   // (jours 20 à 28 ; la partie au jour 29)
  assertEqual(entreesPeriode(s, v, 'semaine').map((J) => J.jour), [22, 23, 24, 25, 26, 27, 28], 'les sept derniers');
  assertEqual(entreesPeriode(s, v, 'hier').map((J) => J.jour), [28], 'hier');
  const S = bilanVillageois(s, v.id, 'semaine'), H = bilanVillageois(s, v.id, 'hier');
  assertEqual(S.valeur, (3 + 4 + 5 + 6 + 7 + 8 + 9) * P('pierre'), 'la semaine : les pierres des jours 22 à 28');
  assertEqual(H.valeur, 9 * P('pierre'), 'hier : celles du jour 28');
  // le lendemain, la fenêtre glisse
  s.day = 30;
  v.journal.push({ jour: 29, mange: { pain: 1 }, tache: 'pierre', actions: 6, produit: { pierre: 100 } });
  v.journal.shift(); v.journal.shift();
  assertEqual(bilanVillageois(s, v.id, 'semaine').valeur, (4 + 5 + 6 + 7 + 8 + 9 + 100) * P('pierre'), 'le jour 22 sort, le jour 29 entre');
  // un jour d'aujourd'hui (pas encore fini) n'y est pas
  v.journal.push({ jour: 30, mange: { pain: 9 } });
  assertEqual(bilanVillageois(s, v.id, 'hier').repas, P('pain'), 'aujourd\'hui ne compte pas');
  const T = tableauVillage(s, 'semaine');
  assertEqual([T.du, T.au, T.jours], [23, 29, 7], 'la période dite');
});

test('le total du village, trois soldes différents, le rendement, le tri', () => {
  const { s, V: [a, b, c] } = ile(3);
  attribuer(s, a.id, 'bois'); attribuer(s, b.id, 'pierre'); attribuer(s, c.id, 'fauchage');
  const j = (tache, produit, mange = { pain: 1 }) => ({ mange, tache, actions: 6, produit });
  semaine(s, a, 1, Array.from({ length: 7 }, () => j('bois', { bois: 10 })));
  semaine(s, b, 1, Array.from({ length: 7 }, () => j('pierre', { pierre: 2 })));
  semaine(s, c, 1, Array.from({ length: 7 }, () => j('fauchage', { fibre: 1 }, { pain: 2 })));
  const T = tableauVillage(s, 'semaine');
  const soldes = Object.fromEntries(T.lignes.map((l) => [l.id, l.solde]));
  assertEqual(soldes[a.id], 7 * (10 * P('bois') - P('pain')), 'le bois');
  assertEqual(soldes[b.id], 7 * (2 * P('pierre') - P('pain')), 'la pierre');
  assertEqual(soldes[c.id], 7 * (P('fibre') - 2 * P('pain')), 'le fauchage');
  assertEqual(new Set(Object.values(soldes)).size, 3, 'trois soldes différents');
  assertEqual(T.total.solde, soldes[a.id] + soldes[b.id] + soldes[c.id], 'le total : la somme des lignes');
  assertEqual(T.total.cout, 7 * 4 * P('pain'), 'le coût du village');
  assertEqual(T.total.produit.find((x) => x.objet === 'bois').n, 70, 'le produit du village, par objet');
  // le tri par défaut : le solde, du plus haut au plus bas ; puis par colonne
  assertEqual(T.lignes.map((l) => l.id), [a.id, b.id, c.id], 'par solde décroissant');
  assertEqual(trierTableau(T.lignes, 'solde', 1).map((l) => l.id), [c.id, b.id, a.id], 'par solde croissant');
  assertEqual(trierTableau(T.lignes, 'cout').map((l) => l.id)[0], c.id, 'par coût : le plus gros mangeur d\'abord');
  const noms = trierTableau(T.lignes, 'prenom').map((l) => l.prenom);
  assertEqual(noms, [...noms].sort((x, y) => x.localeCompare(y, 'fr')), 'par prénom');
  assertEqual(trierTableau(T.lignes, 'inconnue').map((l) => l.id), [a.id, b.id, c.id], 'une colonne inconnue : le solde');
  // le rendement : par jour de travail, en % de la moyenne des tâches
  const par = { bois: 10 * P('bois'), pierre: 2 * P('pierre'), fauchage: P('fibre') };
  assertEqual(T.moyenne.parTache, par, 'ce que chaque tâche produit par jour');
  const moy = Math.round((par.bois + par.pierre + par.fauchage) / 3);
  assertEqual(T.moyenne.moyenne, moy, 'la moyenne des tâches');
  assertEqual(T.lignes.find((l) => l.id === a.id).rendement, Math.round((100 * par.bois) / moy), 'le rendement du bois');
  // hier : une seule journée
  const H = tableauVillage(s, 'hier');
  assertEqual(H.total.solde, T.total.solde / 7, 'hier : le septième de cette semaine régulière');
});

test('ce qui manque, en quelques mots : sans outil, en repos, sans tâche', () => {
  const { s, V: [v] } = ile();
  assertEqual(manqueCourt(s, v), 'sans tâche', 'sans tâche');
  s.outils.hache = false;
  attribuer(s, v.id, 'bois');
  assert(/^sans outil : une hache$/.test(manqueCourt(s, v)), `sans outil : « ${manqueCourt(s, v)} »`);
  s.outils.hache = true;
  donnerOutil(s, v.id, 'hache');
  assertEqual(manqueCourt(s, v), '', 'rien ne manque');
  v.repos = true; v.faim = 20;
  assertEqual(manqueCourt(s, v), 'en repos : pas assez à manger', 'en repos');
  v.faim = 0;
  assertEqual(manqueCourt(s, v), 'en repos : pas de lit', 'sans lit');
  v.repos = false;
  attribuer(s, v.id, 'navette');
  assertEqual(manqueCourt(s, v), 'rien à porter au port', 'la tournée sans rien à vendre');
});

/* ---------- le journal de la nuit ---------- */

test('la nuit : le jour de repos est noté (son repas, aucun produit) ; la cuisine note ce qu\'elle a pris', () => {
  const { s, V: [v, w] } = ile(2);
  donnerOutil(s, v.id, 'hache');
  attribuer(s, v.id, 'bois');
  assert(testBatir(s, 'cuisine').ok, 'la cuisinière');
  attribuer(s, w.id, 'cuisine');
  addItem(s, 'oeuf', 6); addItem(s, 'huile', 2);
  runNight(s);
  const Jc = w.journal[w.journal.length - 1];
  assert(Jc.actions >= 1 && Jc.utilise && Jc.utilise.oeuf >= 3, `la cuisine a pris ses œufs : ${JSON.stringify(Jc.utilise)}`);
  const bc = bilanJour(Jc);
  assert(bc.matieres > 0 && bc.cout === bc.repas + bc.matieres, 'ce qu\'elle a pris compte dans son coût');
  // il a eu faim : il se repose demain, et ce jour-là s'écrit « repos »
  boite(s, {});
  runNight(s);
  assert(v.repos, 'mal nourri : au repos demain');
  boite(s, { pain: 60 });
  runNight(s);
  const J = v.journal[v.journal.length - 1];
  assertEqual([J.repos, J.actions, Object.keys(J.produit).length], [true, 0, 0], 'le jour de repos : aucune action, aucun produit');
  const b = bilanJour(J);
  assert(b.cout > 0 && b.valeur === 0 && b.solde === -b.cout, 'son repas compte, rien de produit');
  assert(!v.journal[v.journal.length - 2].repos, 'la veille, il travaillait (il avait faim le soir)');
  assertEqual(manqueCourt(s, v), '', 'il a mangé : demain il travaille');
});

/* ---------- le joueur automatique ---------- */

test('le joueur automatique réattribue la tâche dont le solde est le plus bas, après des semaines pleines', () => {
  const { s, V: [a, b] } = ile(2);
  donnerOutil(s, a.id, 'hache'); attribuer(s, a.id, 'bois');
  attribuer(s, b.id, 'cueillette');
  const R = DATA.SIMULATION.VILLAGEOIS.REATTRIBUER;
  const j = (tache, produit) => ({ mange: { pain: 2 }, tache, actions: 4, produit });
  const ecrire = (de) => {
    semaine(s, a, de, Array.from({ length: R.JOURS }, () => j('bois', { bois: 20 })));
    semaine(s, b, de, Array.from({ length: R.JOURS }, () => j(b.tache, {})));
  };
  // une semaine pas pleine (un repos) : rien
  ecrire(1);
  b.journal[3].repos = true;
  assertEqual(soldeLePlusBas(s).id, b.id, 'le plus bas');
  assertEqual(soldeLePlusBas(s).complet, false, 'pas une semaine pleine');
  assertEqual(botReattribuer(s), null, 'il attend une semaine pleine');
  // SEMAINES semaines pleines sous le SEUIL : il essaie une autre tâche libre
  let t = null;
  for (let k = 1; k <= R.SEMAINES && !t; k++) {
    ecrire(1 + k * R.JOURS);
    t = botReattribuer(s);
    if (k < R.SEMAINES) assertEqual(t, null, `après ${k} semaine(s) : il attend encore`);
  }
  assert(t && t !== 'cueillette' && t !== 'bois', `une autre tâche libre : ${t}`);
  assertEqual(b.tache, t, 'donnée au plus bas');
  assertEqual(a.tache, 'bois', 'l\'autre garde la sienne');
  assertEqual(botReattribuer(s), null, 'une fois par jour');
  // éteint (le réglage du joueur automatique retiré) : rien
  const avant = DATA.SIMULATION.VILLAGEOIS.REATTRIBUER;
  DATA.SIMULATION.VILLAGEOIS.REATTRIBUER = null;
  try {
    s.day += 1;
    assertEqual(botReattribuer(s), null, 'sans réglage, rien');
  } finally {
    DATA.SIMULATION.VILLAGEOIS.REATTRIBUER = avant;
  }
});

/* ---------- éteint ---------- */

test('éteint : pas de tableau', () => {
  const { s, V: [v] } = ile();
  semaine(s, v, 1, [{ mange: { pain: 1 } }]);
  assert(tableauVillage(s, 'semaine'), 'allumé : le tableau');
  avecVillage(() => {
    assertEqual(tableauVillage(s, 'semaine'), null, 'éteint : rien');
    assertEqual(soldeLePlusBas(s), null, 'rien pour le joueur automatique');
    assertEqual(botReattribuer(s), null, 'rien à réattribuer');
  }, false);
  assertEqual(villageoisDe(s).length, 1, 'rien n\'a bougé');
  assert(tachesNuit, 'les tâches restent');
});
