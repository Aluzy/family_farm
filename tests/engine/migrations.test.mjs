/* ==========================================================================
   Tests du moteur : migration v15 → v16 (version 1.1).
   Lancer seul : node --test tests/engine/migrations.test.mjs (ou node tests/run-tests.mjs migrations).
   ========================================================================== */

import {
  addItem, buyCow, buyItem, buySheep, buyTech, countItem, cowCount, createInitialState, DATA,
  feedAllHens, freeCowPlaces, freeSheepPlaces, fridgeCount, lotsOf, makeDevice, makePlot,
  makePlots, memberName, memberPortrait, migrate, migrateTechTreeV2, MIGRATION_11, MIGRATIONS,
  millPending, newAutoReport, newStableReport, openStation, ownedTechs, pastureCost, planMeal,
  prepTimeMult, sellItem, setMemberProfile, shear, sheepCount, sheepToShear, sleep, stableFree,
  stableOccupied, startMilling, startRecipe, STATE_VERSION, strawMissing, strawNeed, strawStock,
  techPoints, testFillBatteries, wheatTotal, zoneTile,
} from '../../js/engine/index.js';
import {
  assert, assertEqual, champ, chapter1StepsDone, plotContent, runFor, sleepOnce, test, v14State,
} from './aide.mjs';

/* ---------- migration v15 → v16 (version 1.1) ---------- */

// Une sauvegarde au format 15, telle que la version 1.0 l'écrivait : membres
// sans profil, surface en ares, animaux avec leur poids, pas de compte rendu
// de l'Étable. `mutate` reçoit l'état avant sa copie.
function v15State(mutate) {
  const s = createInitialState(9);
  s.version = 15;
  for (const m of s.famille.membres) {
    delete m.prenom;
    delete m.genre;
    delete m.teint;
  }
  s.paturage = { construit: false, ares: 0, compteur: 0, compteurVache: 0, moutons: [], vaches: [] };
  delete s.nuit.etable;
  s.campagne.chapitre = 5;
  if (mutate) mutate(s);
  return JSON.parse(JSON.stringify(s));
}

// Un troupeau de la version 1.0 : `laines` = jours de repousse de chaque mouton.
function v15Herd(s, laines, vaches = 0, ares = 50) {
  s.paturage = {
    construit: true, ares, compteur: laines.length, compteurVache: vaches,
    moutons: laines.map((laine, i) => ({ id: `mouton-${i + 1}`, poids: 200 + 5 * i, laine })),
    vaches: Array.from({ length: vaches }, (_, i) => ({ id: `vache-${i + 1}`, poids: 400 + 10 * i })),
  };
}

test('migration v15 → v16 : une partie sans animaux ne perd ni ne gagne rien', () => {
  assertEqual(typeof MIGRATIONS[15], 'function');
  const v15 = v15State((s) => { s.pieces = 432; s.day = 12; });
  const m = migrate({ v: 15, t: 0, s: v15 });
  assertEqual(m.version, STATE_VERSION);
  assertEqual([m.pieces, m.day, m.inventaire, m.campagne, m.potager, m.technologies, m.pointsTech], [432, 12, v15.inventaire, chapter1StepsDone(v15.campagne), { ...v15.potager, houe: true, houeVue: true, parcelles: v15.potager.parcelles.map((p, i) => ({ ...p, case: zoneTile(1, i) })) }, v15.technologies, v15.pointsTech]);
  assertEqual(m.paturage, { construit: false, places: 0, compteur: 0, compteurVache: 0, moutons: [], vaches: [] });
  assertEqual(countItem(m, 'paille'), 0, 'pas d\'animaux : pas de paille offerte');
  assertEqual(m.nuit.etable, newStableReport());
  // même forme qu'une partie neuve, et la partie continue
  assertEqual(Object.keys(m).sort(), Object.keys(createInitialState(9)).sort());
  assertEqual(Object.keys(m.paturage), Object.keys(createInitialState(9).paturage));
  assert(sleepOnce(m) !== null, 'la partie migrée passe la nuit');
  // une partie déjà en version 16 n'est pas retouchée
  const again = migrate({ v: STATE_VERSION, t: 0, s: JSON.parse(JSON.stringify(m)) });
  assertEqual(again, m);
});

test('migration v15 → v16 : chaque membre de la famille reçoit son profil de départ', () => {
  const v15 = v15State((s) => {
    s.famille.membres[2].sante = 40;
    s.famille.membres[3].malade = true;
    s.famille.membres[3].sante = 0;
  });
  assertEqual(v15.famille.membres.every((m) => !('prenom' in m) && !('genre' in m) && !('teint' in m)), true, 'la sauvegarde de départ n\'a pas de profil');
  const m = migrate({ v: 15, t: 0, s: v15 });
  assertEqual(m.famille.membres.map((x) => [x.id, x.nom, x.prenom, x.genre, x.teint]), [
    ['adulte-1', 'Adulte 1', 'Adulte 1', 'f', 0],
    ['adulte-2', 'Adulte 2', 'Adulte 2', 'm', 0],
    ['enfant-1', 'Enfant 1', 'Enfant 1', 'm', 0],
    ['enfant-2', 'Enfant 2', 'Enfant 2', 'f', 0],
  ]);
  assertEqual(m.famille.membres.map((x) => memberPortrait(m, x.id)), ['👩', '👨', '👦', '👧']);
  assertEqual(m.famille.membres.map((x) => ['sante' in x, 'malade' in x, x.enfant]), [[false, false, false], [false, false, false], [false, false, true], [false, false, true]], 'version 1.8 : la santé disparaît à la migration');
  assertEqual(m.famille.membres, createInitialState(1).famille.membres, 'même forme qu\'une partie neuve');
  assert(setMemberProfile(m, 'adulte-1', { prenom: 'Léa', teint: 2 }).ok, 'le profil se règle ensuite normalement');
  // un membre inconnu de DATA (sauvegarde bricolée) reçoit quand même un profil valide
  const bizarre = migrate({ v: 15, t: 0, s: v15State((s) => { s.famille.membres.push({ id: 'cousin-1', nom: 'Cousin', enfant: false, sante: 80, malade: false }); }) });
  const cousin = bizarre.famille.membres[4];
  assertEqual([cousin.prenom, cousin.genre, cousin.teint, memberName(bizarre, 'cousin-1')], ['Cousin', 'f', 0, 'Cousin']);
});

test('migration v15 → v16 : les comptes rendus en attente nomment les nouveaux malades par leur identifiant', () => {
  const v15 = v15State((s) => {
    s.nuit.nouveauxMalades = ['Adulte 2', 'Enfant 1'];
    s.report = { nuit: 7, nouveauxMalades: ['Enfant 2', 'Inconnu'], auto: newAutoReport(), mange: {} };
  });
  const m = migrate({ v: 15, t: 0, s: v15 });
  // version 1.8 : les malades disparaissent ensuite avec la santé
  assertEqual(['nouveauxMalades' in m.nuit, 'nouveauxMalades' in m.report], [false, false]);
  assertEqual(m.report.nuit, 7, 'le reste du compte rendu en attente est gardé');
});

test('migration v15 → v16 : les animaux perdent leur poids, les ares deviennent des places', () => {
  const v15 = v15State((s) => v15Herd(s, [0, 3], 1, 65));
  const m = migrate({ v: 15, t: 0, s: v15 });
  assertEqual(m.paturage, {
    construit: true, places: 13, compteur: 2, compteurVache: 1,
    moutons: [{ id: 'mouton-1', laine: 0 }, { id: 'mouton-2', laine: 0 }],
    vaches: [{ id: 'vache-1' }],
  });
  assertEqual('ares' in m.paturage, false);
  for (const a of [...m.paturage.moutons, ...m.paturage.vaches]) assertEqual('poids' in a, false, a.id);
  assertEqual(JSON.stringify(m).includes('poids'), false, 'plus aucun poids dans la sauvegarde');
  // 5 ares = 1 place : même nombre d'animaux possible qu'avant, même prix pour la suite
  assertEqual([50, 55, 60, 65, 100].map((ares) => migrate({ v: 15, t: 0, s: v15State((s) => v15Herd(s, [], 0, ares)) }).paturage.places), [10, 11, 12, 13, 20]);
  assertEqual([stableOccupied(m), stableFree(m), freeSheepPlaces(m), freeCowPlaces(m)], [5, 8, 8, 2]);
  assertEqual(pastureCost(m), 70, '13 places : la 14ᵉ coûte 70, comme les 5 a suivants avant');
  // les numéros ne sont pas réutilisés
  m.pieces = 1000;
  assertEqual(buySheep(m).id, 'mouton-3');
  assertEqual(buyCow(m).id, 'vache-2');
});

test('migration v15 → v16 : la laine passe du rythme de 7 nuits à celui de 2 nuits nourries', () => {
  const v15 = v15State((s) => v15Herd(s, [0, 1, 2, 3, 4, 5, 6, 7], 0, 50));
  const m = migrate({ v: 15, t: 0, s: v15 });
  // 0 à 3 nuits sur 7 → 0 ; 4 à 6 → 1 (à mi-chemin) ; 7 (prête) → 2 (prête)
  assertEqual(m.paturage.moutons.map((x) => x.laine), [0, 0, 0, 0, 1, 1, 1, 2]);
  assertEqual(sheepToShear(m), 1, 'une laine prête reste prête');
  assertEqual(shear(m, 'mouton-8').ok, true);
  assertEqual(shear(m, 'mouton-7').ok, false);
  // une valeur abîmée ne casse rien
  const abime = migrate({ v: 15, t: 0, s: v15State((s) => { v15Herd(s, [99, -3], 0, 50); s.paturage.moutons.push({ id: 'mouton-3', poids: 300 }); }) });
  assertEqual(abime.paturage.moutons.map((x) => x.laine), [2, 0, 0]);
});

test('migration v15 → v16 : 2 nuits de paille offertes par mouton et par vache', () => {
  assertEqual(MIGRATION_11, { ARES_PAR_PLACE: 5, ANCIENS_JOURS_LAINE: 7, NUITS_PAILLE: 2 });
  const v15 = v15State((s) => v15Herd(s, [7, 2, 0], 2, 50));
  assertEqual('paille' in v15.inventaire, false);
  const m = migrate({ v: 15, t: 0, s: v15 });
  assertEqual(strawNeed(m), 3 * 1 + 2 * 2);
  assertEqual(strawStock(m), 2 * 7, '2 nuits pour 3 moutons et 2 vaches');
  assertEqual(lotsOf(m, 'paille'), [{ qty: 14, nightsLeft: null, origin: 'produit' }]);
  assertEqual(strawMissing(m), 0);
  // personne n'est puni le premier soir : tout le monde mange, le lait arrive, et la nuit suivante aussi
  let rep = sleepOnce(m);
  assertEqual([rep.etable.moutonsNourris, rep.etable.vachesNourries, rep.etable.manque, rep.lait], [3, 2, 0, 2]);
  rep = sleepOnce(m);
  assertEqual([rep.etable.moutonsNourris, rep.etable.vachesNourries, rep.etable.manque, rep.lait, strawStock(m)], [3, 2, 0, 2, 0]);
  rep = sleepOnce(m);
  assertEqual([rep.etable.moutonsNourris, rep.etable.vachesNourries, rep.etable.manque, rep.lait], [0, 0, 7, 0], 'ensuite il faut moudre du blé');
  assertEqual([sheepCount(m), cowCount(m)], [3, 2], 'sans paille, les animaux restent');
  // la paille déjà possédée (migration rejouée sur un état hybride) n'est pas écrasée
  const deja = v15State((s) => { v15Herd(s, [0], 0, 50); addItem(s, 'paille', 5); });
  assertEqual(strawStock(migrate({ v: 15, t: 0, s: deja })), 5 + 2);
});

test('migration v15 → v16 : la viande et les anciens plats de l\'inventaire et du frigo restent mangeables et vendables', () => {
  const v15 = v15State((s) => {
    s.inventaire = {
      viande_mouton: [{ qty: 20, nightsLeft: 3, origin: 'produit' }],
      viande_boeuf: [{ qty: 4, nightsLeft: 5, origin: 'produit' }],
      viande_volaille: [{ qty: 3, nightsLeft: 4, origin: 'acheté' }],
      ragout: [{ qty: 2, nightsLeft: 6, origin: 'produit' }],
      poulet_roti_ail: [{ qty: 1, nightsLeft: 2, origin: 'produit' }],
    };
    s.frigo = { ...s.frigo, construit: true, appareil: makeDevice('frigo', 'frigo', 600), items: { roti_boeuf: [{ qty: 3, nightsLeft: 6, origin: 'produit' }], poivrons_farcis: [{ qty: 1, nightsLeft: 4, origin: 'produit' }] } };
    s.marche = { viande_mouton: 150 };
  });
  const m = migrate({ v: 15, t: 0, s: v15 });
  assertEqual(m.inventaire, v15.inventaire, 'rien n\'est retiré de l\'inventaire');
  assertEqual(m.frigo.items, v15.frigo.items, 'ni du frigo (4 unités : elles tiennent au niveau 1)');
  assertEqual(m.frigo.niveau, 1, 'version 1.10 : le frigo a un niveau');
  assertEqual(m.marche, { viande_mouton: 150 });
  for (const id of ['viande_mouton', 'viande_boeuf', 'viande_volaille', 'ragout', 'poulet_roti_ail', 'roti_boeuf', 'poivrons_farcis']) {
    assertEqual([!!DATA.items[id], DATA.items[id].edible], [true, true], id);
  }
  // la famille les mange (ce qui périme le plus tôt d'abord)
  const plan = planMeal(m);
  assertEqual(plan.couverture, 100);
  assert(plan.mange.poulet_roti_ail === 1 && plan.mange.ragout === 1, `version 1.11 : les plats d'abord, au menu : ${JSON.stringify(plan.mange)}`);
  const rep = sleepOnce(m);
  assertEqual([rep.couverture, rep.autonomie > 0], [100, true]);
  // et ils se vendent, au prix d'avant
  m.pieces = 0;
  assertEqual(sellItem(m, 'viande_boeuf', 4).gain, 40);
  assertEqual(sellItem(m, 'ragout', 1).gain, 36, 'version 1.11 : l\'autre a été mangé (les plats d\'abord)');
  const roti = fridgeCount(m, 'roti_boeuf');
  assert(roti >= 2, `rôtis restants : ${roti}`);
  assertEqual(sellItem(m, 'roti_boeuf', roti).gain, 36 * roti, 'même rangé au frigo');
  assertEqual(m.pieces, 76 + 36 * roti);
  // mais on ne peut plus en refaire ni en racheter
  assertEqual(buyItem(m, 'viande_boeuf', 1).ok, false);
  assertEqual(startRecipe(m, 'roti_boeuf').ok, false);
});

test('migration v15 → v16 : la Rôtisserie est retirée de l\'arbre et remboursée', () => {
  const v15 = v15State((s) => {
    s.technologies = ['cu_outils', 'cui_boulangerie', 'cui_rotisserie', 'cui_laiterie'];
    s.pointsTech = { solde: 2, gagnes: 9, maitrise: [], libre: 0, annonces: [] };
    s.pieces = 500;
  });
  const m = migrate({ v: 15, t: 0, s: v15 });
  assertEqual(m.technologies, ['cu_outils', 'cui_boulangerie', 'cui_laiterie']);
  assertEqual([m.pieces, m.pointsTech.solde, m.pointsTech.gagnes], [800, 3, 9], '300 pièces et 1 point de technologie rendus');
  assertEqual(ownedTechs(m).every((id) => DATA.techtree.noeuds[id]), true);
  // sans ce nœud : rien n'est offert
  const sans = migrate({ v: 15, t: 0, s: v15State((s) => { s.technologies = ['cu_outils']; s.pieces = 500; }) });
  assertEqual([sans.pieces, sans.pointsTech.solde, sans.technologies], [500, 0, ['cu_outils']]);
  // l'étape v13 → v14 n'offre plus ce nœud à une vieille partie
  const v13 = v15State((s) => { v15Herd(s, [], 0, 50); s.version = 13; s.technologies = []; });
  assertEqual(migrateTechTreeV2(v13).technologies.includes('cui_rotisserie'), false);
});

test('migration v15 → v16 : les préparations des recettes retirées sont terminées, le Moulin regroupe ses moutures', () => {
  const v15 = v15State((s) => {
    for (const id of Object.keys(DATA.STATIONS)) openStation(s, id);
    s.inventaire = {};
    s.stations.cuisine.tache = { recette: 'ragout', resteMs: 9000, dureeMs: 23000 };
    s.stations.cuisine.file = [{ recette: 'omelette', pris: [{ item: 'oeuf', qte: 3 }, { item: 'huile', qte: 1 }], eau: 0 }, { recette: 'ragout', pris: [], eau: 0 }];
    s.stations.four.tache = { recette: 'pain', resteMs: 4000, dureeMs: 10000 };
    s.stations.four.file = [{ recette: 'roti_boeuf', pris: [], eau: 0 }, { recette: 'poulet_roti_ail', pris: [], eau: 0 }];
    s.stations.moulin.tache = { recette: 'farine', resteMs: 3000, dureeMs: 5000 };
    s.stations.moulin.file = [{ recette: 'farine', pris: [{ item: 'ble', qte: 1 }], eau: 0 }, { recette: 'farine', pris: [{ item: 'ble', qte: 1 }], eau: 0 }];
    s.stations.presse.tache = { recette: 'huile', resteMs: 1000, dureeMs: 10000 };
  });
  const m = migrate({ v: 15, t: 0, s: v15 });
  // Cuisine : les deux ragoûts sont servis, l'omelette qui attendait démarre.
  assertEqual([countItem(m, 'ragout'), m.stations.cuisine.tache.recette, m.stations.cuisine.file], [2, 'omelette', []]);
  // Four : le pain continue, les deux plats retirés de la file sont servis.
  assertEqual([m.stations.four.tache, m.stations.four.file], [{ recette: 'pain', resteMs: 4000, dureeMs: 10000 }, []]);
  assertEqual([countItem(m, 'roti_boeuf'), countItem(m, 'poulet_roti_ail')], [1, 1]);
  // Moulin : le blé en cours garde son avance, les deux moutures en file deviennent du blé en attente.
  assertEqual([m.stations.moulin.tache, m.stations.moulin.file], [{ recette: 'farine', resteMs: 3000, dureeMs: 5000, enAttente: 2 }, []]);
  assertEqual(millPending(m), 3);
  // Presse : rien ne change.
  assertEqual(m.stations.presse.tache, { recette: 'huile', resteMs: 1000, dureeMs: 10000 });
  // tout se termine ensuite normalement, avec la paille des 3 blés
  testFillBatteries(m);
  runFor(m, 60);
  assertEqual([countItem(m, 'farine'), countItem(m, 'paille'), countItem(m, 'omelette'), countItem(m, 'pain'), countItem(m, 'huile')], [3, 3, 1, 1, 1]);
  assertEqual(Object.keys(DATA.STATIONS).map((id) => m.stations[id].tache), [null, null, null, null]);
  // un Moulin dont seule la file contenait du blé (cas limite) repart avec ce blé
  const file = migrate({ v: 15, t: 0, s: v15State((s) => { openStation(s, 'moulin'); s.stations.moulin.file = [{ recette: 'farine', pris: [], eau: 0 }, { recette: 'farine', pris: [], eau: 0 }]; }) });
  assertEqual(file.stations.moulin.tache, { recette: 'farine', resteMs: 5000, dureeMs: 5000, enAttente: 1 });
});

test('migration v15 → v16 : une partie avancée continue à tourner après la migration', () => {
  const v15 = v15State((s) => {
    s.pieces = 900;
    s.campagne.chapitre = 6;
    s.campagne.compteurs.laines = 4;
    s.campagne.compteurs.plats = ['omelette', 'ragout', 'roti_boeuf'];
    for (const id of Object.keys(DATA.STATIONS)) openStation(s, id);
    s.silo = { construit: true, niveau: 2, ble: 30 };
    s.poulailler = { construit: true, niveau: 1, poules: 4, nourries: 0, restes: 0 };
    v15Herd(s, [7, 5, 1], 1, 50);
    s.inventaire.viande_mouton = [{ qty: 6, nightsLeft: 4, origin: 'produit' }];
    s.inventaire.ble = [{ qty: 60, nightsLeft: null, origin: 'produit' }];
    s.technologies = ['el_tonte', 'cui_rotisserie'];
  });
  const m = migrate({ v: 15, t: 0, s: v15 });
  assertEqual([m.version, m.campagne.compteurs.laines, m.campagne.compteurs.plats], [STATE_VERSION, 4, ['omelette', 'ragout', 'roti_boeuf']], 'les plats déjà préparés restent comptés');
  assertEqual(JSON.parse(JSON.stringify(m)), m, 'l\'état migré se sauvegarde tel quel');
  assertEqual(strawStock(m), 10);
  testFillBatteries(m);
  // 12 nuits de jeu : la tonte automatique, le Moulin et l'Étable fonctionnent ensemble
  let laines = 0;
  let lait = 0;
  for (let i = 0; i < 12; i++) {
    feedAllHens(m);
    if (strawMissing(m) > 0 && wheatTotal(m) > 0) startMilling(m, Math.min(strawMissing(m), wheatTotal(m)));
    runFor(m, 30);
    const rep = sleep(m);
    assert(rep !== null, `nuit ${i + 1}`);
    laines += rep.auto.tondus;
    lait += rep.lait;
    testFillBatteries(m);
  }
  assert(laines >= 6, `la laine continue d'arriver : ${laines}`);
  assert(lait >= 6, `le lait aussi : ${lait}`);
  assertEqual(m.campagne.compteurs.laines, 4 + laines);
  assertEqual([sheepCount(m), cowCount(m), m.poulailler.poules], [3, 1, 4], 'aucun animal ne disparaît');
});

test('migration v15 → v16 : toute la chaîne depuis une très vieille sauvegarde mène au nouveau format', () => {
  const m = migrate({ v: 0, t: 0, s: { day: 2, awakeSeconds: 0, pieces: 55, rngSeed: 3, unlockedTabs: ['ferme'], stats: {} } });
  assertEqual(m.version, STATE_VERSION);
  assertEqual(m.famille.membres.map((x) => [x.prenom, x.genre, x.teint]), [['Adulte 1', 'f', 0], ['Adulte 2', 'm', 0], ['Enfant 1', 'm', 0], ['Enfant 2', 'f', 0]]);
  assertEqual(m.paturage, { construit: false, places: 0, compteur: 0, compteurVache: 0, moutons: [], vaches: [] });
  // des entrées absurdes ne font jamais planter la migration
  for (const bad of [null, undefined, 42, 'x', [], { version: 15 }, { version: 15, famille: null, paturage: 7, stations: 'non', technologies: 3, inventaire: null }]) {
    const out = migrate(bad);
    assert(out && typeof out === 'object', `migration sans exception : ${JSON.stringify(bad)}`);
  }
});

test('migration v14 → v15 : chaque champ de chaque parcelle est conservé, quelle que soit la sauvegarde', () => {
  for (const [potager, champ] of [[1, 0], [1, 1], [3, 4], [5, 5], [2, 5]]) {
    const v14 = v14State({ potager, champ }, (s) => {
      // une parcelle sur deux est plantée : il reste toujours assez de parcelles vides à retirer
      [...s.potager.parcelles, ...s.champ.parcelles].forEach((p, i) => {
        if (i % 2 === 0) Object.assign(p, { culture: p.lieu === 'champ' ? 'ble' : 'carotte', stade: 1 + (i % 4), arrose: i % 4 === 0, semis: ['meme', 'off', 'verrou'][i % 3], verrou: i % 3 === 2 ? 'carotte' : null });
      });
    });
    const before = [...v14.potager.parcelles, ...v14.champ.parcelles];
    const m = migrate({ v: 14, t: 0, s: v14 });
    const planted = m.potager.parcelles.filter((p) => p.culture);
    assertEqual(planted.map(plotContent), before.filter((p) => p.culture).map(plotContent), `potager ${potager}, champ ${champ} : les parcelles plantées`);
    assert(DATA.POTAGER.PARCELLES_V1.includes(m.potager.parcelles.length), 'la zone est pleine à son ancien niveau');
    assert(m.potager.parcelles.length >= Math.min(30, before.length), 'aucune parcelle possédée n\'est perdue (30 au plus)');
    assertEqual(new Set(m.potager.parcelles.map((p) => p.id)).size, m.potager.parcelles.length, 'identifiants uniques');
    assertEqual(m.potager.parcelles.map((p) => p.id), m.potager.parcelles.map((_, i) => makePlot(i + 1).id), 'numérotés comme makePlot()');
    assertEqual(m.inventaire, v14.inventaire, 'rien à rendre');
    assert(sleepOnce(m) !== null, 'la partie migrée passe la nuit');
  }
  // sauvegarde abîmée : sans Champ, ou sans parcelles — la migration ne plante pas
  const sans = v14State({ potager: 2 });
  delete sans.champ;
  assertEqual(migrate({ v: 14, t: 0, s: sans }).potager.parcelles.length, 12);
  const vide = v14State();
  delete vide.potager.parcelles;
  const mv = migrate({ v: 14, t: 0, s: vide });
  assertEqual(mv.potager.parcelles, makePlots(6).map((p, i) => ({ ...p, case: zoneTile(1, i) })));
});

test('sauvegarde : identifiants de technologie inconnus ignorés sans plantage', () => {
  const s = createInitialState(1);
  s.technologies = ['prepa_1', 'nexiste_pas'];
  assertEqual(ownedTechs(s), ['prepa_1']);
  assertEqual(prepTimeMult(s), 80);
  delete s.technologies;
  assertEqual(prepTimeMult(s), 100);
  techPoints(s).solde = 1;
  s.pieces = 0; // isole ce test du montant de départ pour vérifier le refus faute de pièces
  assertEqual(buyTech(s, 'fa_sommeil').ok, false, 'pas assez de pièces');
  s.pieces = 400;
  addItem(s, 'bois', 10);
  assertEqual(buyTech(s, 'fa_sommeil').ok, true, 'la liste est recréée');
});
