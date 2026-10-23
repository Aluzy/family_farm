/* ==========================================================================
   Tests du moteur : état initial, sérialisation, formats, hasard, données (RAW_DATA → DATA), départ d'une nouvelle partie (version 1.12).
   Lancer seul : node --test tests/engine/base.test.mjs (ou node tests/run-tests.mjs base).
   ========================================================================== */

import {
  blocsPoses, buildCatalog, buildFridge, buyHoe, buyItem, composeFamily, createInitialState,
  createNewGame, DATA, familyName, farmOpen, farmSeed, findMember, finishSetup, formatNumber,
  graineDemenagement, houseRepaired, inventoryCounts, isOwned, levelBlock, mailReceived,
  mainCharacter, marcheFerme, memberPortrait, memberRemovalBlock, memberStyle, migrate,
  migrateDepart, mulberry32, portraitEmoji, RAW_DATA, removeMember, sellItem, setFamilyName,
  setMainCharacter, setMemberProfile, setupPending, simulateGame, starterBlock, starterOf,
  STATE_VERSION, tankCapacity, testBatir, testSetLevel, tick, toggleDevice, unlockLevel,
  upgradeDevice, upgradeTank,
} from '../../js/engine/index.js';
import {
  assert, assertEqual, AVANT_DEMENAGEMENT, avecLune, migreAvant, ml, runFor, test,
} from './aide.mjs';

test('état initial : forme et valeurs attendues', () => {
  const s = createInitialState(42);
  assertEqual(s.version, STATE_VERSION);
  assertEqual(s.day, 1);
  assertEqual(s.awakeMs, 0);
  assertEqual(s.pieces, 350);
  assertEqual(s.rngSeed, 42);
  assertEqual(s.unlockedTabs, ['ferme', 'famille', 'inventaire', 'comptoir']);
  assertEqual(s.stats, {});
});

test('createInitialState() : une nouvelle partie démarre avec 350 pièces', () => {
  assertEqual(createInitialState().pieces, 350);
  assertEqual(createInitialState().pieces, DATA.DEPART.ETAT_INITIAL.PIECES);
});

test('tick() fait avancer awakeMs (ms entières) sans toucher au jour ni aux pièces', () => {
  const s = createInitialState(1);
  tick(s, 0.2);
  tick(s, 0.2);
  assertEqual(s.awakeMs, 400);
  assertEqual(s.day, 1);
  assertEqual(s.pieces, 350);
});

test('sérialisation JSON aller-retour identique', () => {
  const s = createInitialState(7);
  s.pieces = 123;
  s.stats.test = 1;
  const roundTripped = JSON.parse(JSON.stringify(s));
  assertEqual(roundTripped, s);
});

test('migration factice v0 → version courante', () => {
  const legacy = { day: 3, awakeSeconds: 10, pieces: 80, rngSeed: 9, unlockedTabs: ['ferme'], stats: {} };
  // pas de champ `version` : doit être traité comme version 0 et migré jusqu'au bout
  const migrated = migreAvant({ v: 0, t: Date.now(), s: legacy });
  assertEqual(migrated.version, AVANT_DEMENAGEMENT);
  assertEqual(migrated.day, 3);
  assertEqual(migrated.pieces, 80);
  assertEqual(migrated.panneaux.length, 1);
});

test('migration v1 (Lot 0) → version courante : garde la partie et ajoute le parc', () => {
  const v1 = { version: 1, day: 4, awakeSeconds: 12, pieces: 200, rngSeed: 3, unlockedTabs: ['ferme'], stats: { a: 1 } };
  const m = migreAvant({ v: 1, t: 0, s: v1 });
  assertEqual(m.version, AVANT_DEMENAGEMENT);
  assertEqual(m.day, 4);
  assertEqual(m.pieces, 200);
  assertEqual(m.stats, { a: 1 });
  assertEqual(m.panneaux.length, 1);
  assertEqual(m.batteries.length, 1);
  assertEqual(m.pompe.id, 'pompe');
  assertEqual(m.eauMl, ml(0));
  // l'état migré doit pouvoir tourner
  tick(m, 0.2);
  assertEqual(m.awakeMs, 12200, '12 s converties en ms, plus un pas de 0,2 s');
});

test('migrate() ne plante pas sur une entrée déjà à jour', () => {
  const s = createInitialState(5);
  const migrated = migrate({ v: STATE_VERSION, t: Date.now(), s });
  assertEqual(migrated.version, STATE_VERSION);
  assertEqual(migrated.pieces, 350);
  assertEqual(migrated.panneaux.length, 1);
});

test('import d\'un texte invalide sans plantage', () => {
  const badInputs = [null, undefined, {}, { s: null }, 'texte quelconque', 42];
  for (const bad of badInputs) {
    let threw = false;
    let result;
    try {
      result = migreAvant(bad);
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'migrate ne doit jamais lancer d\'exception');
    assert(result && typeof result === 'object', 'migrate doit toujours renvoyer un objet');
  }
});

test('formatage des nombres à la française', () => {
  assertEqual(formatNumber(0), '0');
  assertEqual(formatNumber(50), '50');
  assertEqual(formatNumber(1234), '1 234');
  assertEqual(formatNumber(12345), '12 345');
  assertEqual(formatNumber(1200), '1 200');
  assertEqual(formatNumber(3400000), '3 400 000');
  assertEqual(formatNumber(-15000), '-15 000');
  assertEqual(formatNumber(2.6), '3', 'jamais de décimale');
});

test('générateur aléatoire reproductible à graine égale', () => {
  const rngA = mulberry32(1234);
  const rngB = mulberry32(1234);
  const seqA = [rngA(), rngA(), rngA()];
  const seqB = [rngB(), rngB(), rngB()];
  assertEqual(seqA, seqB);
  for (const v of seqA) {
    assert(v >= 0 && v < 1, 'chaque valeur doit être dans [0, 1)');
  }
  const rngC = mulberry32(9999);
  assert(rngC() !== seqA[0], 'deux graines différentes ne doivent pas (en pratique) produire la même première valeur');
});

/* ---------- données : RAW_DATA (data/*.json) → DATA (buildCatalog) ---------- */

test('données : buildCatalog() calcule sur une copie, RAW_DATA garde les valeurs des fichiers', () => {
  // prix de production doublés, temps des plats divisés, plats enregistrés comme objets
  assertEqual([RAW_DATA.OBJETS.carotte.prix, DATA.OBJETS.carotte.prix], [1, 2]);
  assertEqual([RAW_DATA.RECETTES.pain.temps, DATA.RECETTES.pain.temps], [20, 10]);
  assertEqual([RAW_DATA.OBJETS.pain, DATA.OBJETS.pain.plat], [undefined, true]);
  // deux catalogues tirés des mêmes fichiers sont égaux et indépendants
  const autre = buildCatalog(RAW_DATA);
  avecLune(() => assertEqual(autre, DATA)); // ces tests tournent lune neutre (voir avecLune)
  autre.OBJETS.carotte.prix = 99;
  assertEqual([DATA.OBJETS.carotte.prix, RAW_DATA.OBJETS.carotte.prix], [2, 1]);
});

test('données : l\'ordre des recettes dans le fichier ne change rien (le pain à l\'ail avant le pain)', () => {
  const raw = JSON.parse(JSON.stringify(RAW_DATA));
  const { pain, ...autres } = raw.RECETTES;
  raw.RECETTES = { ...autres, pain }; // le pain en dernier : le pain à l'ail, qui l'utilise, vient avant
  const d = buildCatalog(raw);
  for (const id of ['pain', 'pain_ail']) {
    assertEqual([d.OBJETS[id].energie, d.OBJETS[id].prix], [DATA.OBJETS[id].energie, DATA.OBJETS[id].prix], id);
  }
  // les plats restent rangés dans l'ordre des recettes
  const plats = (data) => Object.keys(data.OBJETS).filter((id) => data.OBJETS[id].plat && !data.OBJETS[id].retire);
  assertEqual(plats(d), Object.keys(raw.RECETTES).filter((id) => !raw.RECETTES[id].transformation));
});

test('données : deux recettes qui s\'utilisent l\'une l\'autre sont refusées', () => {
  const raw = JSON.parse(JSON.stringify(RAW_DATA));
  raw.RECETTES.pain.ingredients.push({ item: 'pain_ail', qte: 1 });
  let message = '';
  try {
    buildCatalog(raw);
  } catch (e) {
    message = e.message;
  }
  assertEqual(message, 'Recettes en boucle : pain → pain_ail → pain');
});

test('données : chaque culture connaît sa découpe sur la carte', () => {
  for (const [id, c] of Object.entries(DATA.CULTURES)) {
    assert(c.sprite && [4, 5].includes(c.sprite.c.length) && [16, 32].includes(c.sprite.h), `${id} : sprite { r, h, c }`);
  }
  // les cultures redessinées (scripts/carte/cultures.py) : dans les rangées ajoutées, la graine d'abord
  for (const id of ['carotte', 'patate', 'epinard', 'fraise', 'ble', 'riz', 'tournesol', 'houblon', 'aubergine', 'poivron', 'ail', 'cacao', 'cafe', 'vanille']) {
    assert(DATA.CULTURES[id].sprite.r >= 18, `${id} : dessinée pour le jeu (rangées 18 et suivantes de crops.png)`);
  }
});

/* ---------- version 1.12 (v2, lot 8) : le départ d'une nouvelle partie ---------- */

test('une nouvelle partie : sur sa terre sauvage, 1 500 pièces, 40 conserves, rien de bâti', () => {
  const s = createNewGame(1);
  assertEqual(farmSeed(s), graineDemenagement(s), 'sa ferme : celle de sa graine');
  assertEqual([s.pieces, inventoryCounts(s), s.potager.parcelles, s.potager.houe, blocsPoses(s)], [1500, { conserve: 40 }, [], false, {}]);
  assertEqual([houseRepaired(s), farmOpen(s), tankCapacity(s), s.unlockedTabs.includes('comptoir')], [false, false, 0, false]);
  assertEqual(['panneau', 'batterie', 'pompe', 'reservoir'].map((t) => isOwned(starterOf(s, t))), [false, false, false, false]);
  assertEqual([s.panneaux[0].allume, s.pompe.allume, s.batteries[0].allume], [false, false, false]);
  assertEqual([setupPending(s), s.famille.nom, mainCharacter(s).id], [true, DATA.DEPART.NOM, 'adulte-1']);
  assertEqual(toggleDevice(s, 'pompe').ok, false, 'pas encore achetée');
  assertEqual(upgradeDevice(s, 'panneau-1').ok, false);
  assertEqual(upgradeTank(s).ok, false);
  assertEqual(buyItem(s, 'graine_carotte', 1).error, marcheFerme(s));
  assertEqual(sellItem(s, 'conserve', 1).error, marcheFerme(s));
  assertEqual(buyHoe(s).ok, false);
  runFor(s, 60);
  assertEqual([s.eauMl, s.batteries[0].chargeMwh], [0, 0], 'rien ne tourne');
  // une partie de test (createInitialState) a ses appareils (panneau, pompe), pas de foyer
  const t = createInitialState(1);
  assertEqual([houseRepaired(t), farmOpen(t), setupPending(t)], [false, true, false]);
});

test('le foyer d\'abord (une pièce close, une paillasse), puis le panneau, la pompe, la citerne, la batterie', () => {
  const s = createNewGame(1, { nom: 'Test' });
  testSetLevel(s, unlockLevel('energie'));
  assertEqual(starterBlock(s, 'panneau'), 'Bâtis d\'abord ton foyer : une pièce close avec une paillasse.');
  assertEqual(testBatir(s, 'panneau').error, 'Bâtis d\'abord ton foyer : une pièce close avec une paillasse.');
  assert(testBatir(s, 'foyer').ok);
  assertEqual([houseRepaired(s), starterBlock(s, 'reservoir')], [true, 'Pose d\'abord le panneau solaire et la pompe.']);
  assert(testBatir(s, 'panneau').ok);
  assertEqual(farmOpen(s), false);
  assert(testBatir(s, 'pompe').ok);
  assertEqual([farmOpen(s), s.unlockedTabs.includes('comptoir')], [true, true], 'panneau et pompe : la ferme s\'ouvre');
  assert(testBatir(s, 'citerne').ok);
  assertEqual(tankCapacity(s), DATA.RESEAU.reservoir.litres[0] * 1000);
  assertEqual(isOwned(s.batteries[0]), false, 'la batterie reste facultative');
  assert(testBatir(s, 'batterie').ok);
  assertEqual([s.batteries[0].allume, s.batteries[0].prix, starterBlock(s, 'batterie')], [true, 180, 'Déjà posé.']);
  assertEqual(s.pieces, 1500, 'rien ne s\'achète : tout se fabrique et se pose');
  // une fois posés, panneau et pompe tournent
  runFor(s, 60);
  assert(s.eauMl > 0, 'la pompe remplit le réservoir');
});

test('version 1.12 : configurer la famille : nom, personnage principal, membres', () => {
  const s = createNewGame(1);
  assertEqual(setFamilyName(s, ' x ').ok, false, 'trop court');
  assertEqual(setFamilyName(s, 'a'.repeat(21)).ok, false, 'trop long');
  assertEqual(setFamilyName(s, '  Dupont   Moreau ').nom, 'Dupont Moreau');
  assertEqual(setMainCharacter(s, 'enfant-1').error, 'Le personnage principal est un adulte.');
  assert(setMainCharacter(s, 'adulte-2').ok);
  assertEqual(memberRemovalBlock(s, 'adulte-2'), 'C\'est le personnage principal : choisis d\'abord un autre adulte.');
  assert(removeMember(s, 'adulte-1').ok, 'l\'autre adulte peut partir');
  assertEqual(mailReceived(s, 'notaire_heritage'), false);
  assert(finishSetup(s).ok);
  assertEqual([setupPending(s), familyName(s), mainCharacter(s).id], [false, 'Dupont Moreau', 'adulte-2']);
  assertEqual(mailReceived(s, 'notaire_heritage'), true, 'la lettre du notaire arrive');
  assertEqual(finishSetup(s).ok, false);
  const t = createNewGame(1, { nom: 'Leroy', principal: 'adulte-2' });
  assertEqual([setupPending(t), familyName(t), mainCharacter(t).id], [false, 'Leroy', 'adulte-2']);
  assertEqual(mailReceived(createInitialState(1), 'notaire_heritage'), false, 'pas de lettre dans une partie de test');
});

test('accueil : la famille décrite par le joueur remplace celle de départ', () => {
  const s = createNewGame(1);
  assertEqual(composeFamily(s, { perso: 0, prenom: 'Léa', nom: 'Martin' }).error, 'Choisis un personnage.');
  assertEqual(composeFamily(s, { perso: 3, prenom: '', nom: 'Martin' }).ok, false, 'un prénom');
  assertEqual(composeFamily(s, { perso: 3, prenom: 'Léa', nom: 'M' }).ok, false, 'un nom trop court');
  assertEqual(composeFamily(s, { perso: 3, prenom: 'Léa', nom: 'Martin', enfants: Array(6).fill({ prenom: 'Zoé' }) }).ok, false, 'trop de membres');
  assertEqual(composeFamily(s, { perso: 3, prenom: 'Léa', nom: 'Martin', animaux: [{ espece: 'lapin', nom: 'Pan' }] }).ok, false, 'un chien ou un chat');
  assertEqual(s.famille.membres.length, 4, 'rien n\'a changé après un refus');
  const r = composeFamily(s, {
    perso: 3, prenom: ' Léa ', nom: ' Martin ', compagnon: { perso: 12, prenom: 'Hugo' },
    enfants: [{ prenom: 'Zoé', perso: 5 }, { prenom: 'Tom' }], animaux: [{ espece: 'chien', nom: 'Rex' }],
  });
  assert(r.ok);
  assertEqual(s.famille.membres.map((m) => [m.id, m.prenom, m.enfant, m.perso]), [
    ['adulte-1', 'Léa', false, 3], ['adulte-2', 'Hugo', false, 12], ['enfant-1', 'Zoé', true, 5], ['enfant-2', 'Tom', true, undefined],
  ]);
  assertEqual(s.famille.animaux, [{ id: 'compagnon-1', espece: 'chien', nom: 'Rex' }]);
  assertEqual([familyName(s), mainCharacter(s).id], ['Martin', 'adulte-1']);
  assert(finishSetup(s).ok);
  const seul = createNewGame(2);
  assert(composeFamily(seul, { perso: 1, prenom: 'Max', nom: 'Petit' }).ok);
  assertEqual([seul.famille.membres.length, seul.famille.animaux.length], [1, 0], 'seul, sans animal');
});

test('version 1.12 : migration v28 → v29 : une partie en cours est déjà installée', () => {
  const old = JSON.parse(JSON.stringify(createInitialState(1)));
  old.version = 28;
  for (const k of ['nom', 'principal', 'configuree']) delete old.famille[k];
  for (const k of ['recoltes', 'cultures', 'semisBle']) delete old.campagne.compteurs[k];
  const m = migrateDepart(old);
  assertEqual([m.version, m.famille.nom, m.famille.principal, m.famille.configuree], [29, '', 'adulte-1', true]);
  assertEqual([m.campagne.compteurs.recoltes, m.campagne.compteurs.cultures, m.campagne.compteurs.semisBle], [0, [], 0]);
  assertEqual([farmOpen(m), mailReceived(m, 'notaire_heritage')], [true, false]);
  const full = migreAvant({ v: 28, t: 0, s: old });
  assertEqual([full.version, setupPending(full)], [AVANT_DEMENAGEMENT, false]);
});

test('version 1.12 : le joueur automatique part du départ v2 et termine le chapitre 1', () => {
  const rows = simulateGame('applique', 10);
  assert(rows.some((r) => r.chapitre >= 2), `chapitres : ${rows.map((r) => r.chapitre).join(',')}`);
});

test('version 1.12 : planche d\'avatars : 5 coiffures par âge, choisies dans la fiche du membre', () => {
  const P = DATA.FAMILLE.PROFIL;
  assertEqual([P.STYLES.adulte.length, P.STYLES.enfant.length, P.STYLE_NOMS.adulte, P.STYLE_NOMS.enfant], [5, 5, ['Classique', 'Roux', 'Frisé', 'Cheveux gris', 'Blond'], ['Classique', 'Roux', 'Frisé', 'Casquette', 'Blond']]);
  assertEqual(portraitEmoji(true, 'f', 5, 4), '👧🏿\u200D👱', 'blonde');
  assertEqual(portraitEmoji(false, 'f', 0), '👩', 'coiffure 0 : le portrait d\'avant');
  assertEqual(portraitEmoji(false, 'f', 3, 1), '👩🏽‍🦰');
  assertEqual(portraitEmoji(true, 'm', 0, 3), '👦‍🧢');
  const s = createInitialState(1);
  assertEqual(memberStyle(findMember(s, 'adulte-1')), 0);
  assert(setMemberProfile(s, 'adulte-1', { style: 2 }).ok);
  assertEqual([findMember(s, 'adulte-1').style, memberPortrait(s, 'adulte-1')], [2, '👩‍🦱']);
  assertEqual(setMemberProfile(s, 'adulte-1', { style: 5 }).error, 'Coiffure inconnue.');
  assert(setMemberProfile(s, 'adulte-1', { style: 0 }).ok);
  assertEqual('style' in findMember(s, 'adulte-1'), false, 'la coiffure 0 n\'est pas écrite');
});

test('version 1.12 : un bâtiment ne se répare ni ne se construit avant son niveau', () => {
  const s = createNewGame(1, { nom: 'Test' });
  s.pieces = 100000;
  const refus = [
    ['silo', () => testBatir(s, 'silo')], ['poulailler', () => testBatir(s, 'poulailler')], ['paturage', () => testBatir(s, 'etable')],
    ['serre', () => testBatir(s, 'serre')], ['frigo', () => buildFridge(s)], ['verger', () => testBatir(s, 'pommier')],
    ['four', () => testBatir(s, 'four')], ['moulin', () => testBatir(s, 'moulin')],
  ];
  for (const [id, f] of refus) assertEqual(f().error, `Disponible au niveau ${unlockLevel(id)}.`, id);
  assertEqual([s.pieces, s.silo.construit, s.stations.four.construit], [100000, false, false], 'rien n\'est payé');
  assertEqual(levelBlock(s, 'cuisine'), 'Disponible au niveau 2.');
  testSetLevel(s, 3);
  assertEqual([levelBlock(s, 'silo'), testBatir(s, 'silo').ok], ['', true]);
});
