/* ==========================================================================
   Tests du moteur : membres (version 1.1), composition de la famille et animaux (version 1.2), plats et bonheur (version 1.11).
   Lancer seul : node --test tests/engine/famille.test.mjs (ou node tests/run-tests.mjs famille).
   ========================================================================== */

import {
  addMember, addPet, petSheets, adultCount, alertEvents, alertSnapshot, autoMaintain, autoTasks,
  averageHappiness, buildMorningReport, childCount, cleanFirstName, collectLeftovers,
  commerceNight, countItem, createInitialState, DATA, dishHappiness, energyMax, escapeHtml,
  familyNeed, feedFamily, feedLivestock, fillSilo, findMember, findPet, findPlot,
  finishPreparations, fridgeNight, getNotifications, growOrchard, harvest, inventoryCounts,
  layEggs, lotsOf, mealHappinessDelta, memberName, memberPortrait, memberRemovalBlock, memberRoom,
  migrate, MIGRATIONS, newGameFrom, NIGHT_STEPS, nightPower, offlineReport, offlineSnapshot,
  petIcon, petName, petRoom, pets, planMeal, plant, portraitEmoji, rainNight, readyCrops,
  removeMember, removePet, robotNight, setMemberProfile, setPetProfile, setSeedReserve,
  simulateFromCopy, sleep, spoil, startFarm, STATE_VERSION, takeMeal, testAddSeeds, testFillEnergy,
  testRipenAll, testSetEnergyZero, validFirstName, water,
} from '../../js/engine/index.js';
import {
  assert, assertEqual, garden, ml, plantRipe, setInv, sleepOnce, test,
} from './aide.mjs';

/* ---------- version 1.1 : prénom, sexe et couleur de peau de chaque membre ---------- */

test('profil : au départ, chaque membre porte son rôle comme prénom, le sexe de DATA et la teinte jaune', () => {
  const P = DATA.FAMILLE.PROFIL;
  assertEqual([P.PRENOM_MAX, P.GENRES, P.TEINTS.length], [12, ['f', 'm'], 6]);
  assertEqual(P.TEINTS, ['', '🏻', '🏼', '🏽', '🏾', '🏿'], 'jaune par défaut, puis les cinq teintes des emojis');
  assertEqual(P.PORTRAITS, { adulte: { f: '👩', m: '👨' }, enfant: { f: '👧', m: '👦' } });
  const s = createInitialState(1);
  assertEqual(s.famille.membres.map((m) => [m.id, m.nom, m.prenom, m.genre, m.teint]), [
    ['adulte-1', 'Adulte 1', 'Adulte 1', 'f', 0],
    ['adulte-2', 'Adulte 2', 'Adulte 2', 'm', 0],
    ['enfant-1', 'Enfant 1', 'Enfant 1', 'm', 0],
    ['enfant-2', 'Enfant 2', 'Enfant 2', 'f', 0],
  ]);
  assertEqual(s.famille.membres.map((m) => memberName(s, m.id)), ['Adulte 1', 'Adulte 2', 'Enfant 1', 'Enfant 2']);
  assertEqual(s.famille.membres.map((m) => memberPortrait(s, m.id)), ['👩', '👨', '👦', '👧']);
  assertEqual([memberName(s, 'inconnu'), memberPortrait(s, 'inconnu')], ['', '']);
});

test('portraitEmoji : 👩 / 👨 pour un adulte, 👧 / 👦 pour un enfant, avec la teinte choisie', () => {
  assertEqual([portraitEmoji(false, 'f', 0), portraitEmoji(false, 'm', 0), portraitEmoji(true, 'f', 0), portraitEmoji(true, 'm', 0)], ['👩', '👨', '👧', '👦']);
  assertEqual([1, 2, 3, 4, 5].map((t) => portraitEmoji(false, 'f', t)), ['👩🏻', '👩🏼', '👩🏽', '👩🏾', '👩🏿']);
  assertEqual([portraitEmoji(false, 'm', 3), portraitEmoji(true, 'f', 5), portraitEmoji(true, 'm', 1)], ['👨🏽', '👧🏿', '👦🏻']);
  // des valeurs inconnues retombent sur le premier sexe et le jaune
  assertEqual([portraitEmoji(false, 'x', 0), portraitEmoji(true, undefined, 9), portraitEmoji(false, 'm', -1)], ['👩', '👧', '👨']);
});

test('setMemberProfile : change le prénom, le sexe et la teinte, et le portrait suit', () => {
  const s = createInitialState(1);
  assertEqual(setMemberProfile(s, 'adulte-1', { prenom: 'Camille', genre: 'm', teint: 3 }), { ok: true, id: 'adulte-1' });
  const m = findMember(s, 'adulte-1');
  assertEqual([m.prenom, m.genre, m.teint, m.nom], ['Camille', 'm', 3, 'Adulte 1'], 'le rôle ne change pas');
  assertEqual([memberName(s, 'adulte-1'), memberPortrait(s, 'adulte-1')], ['Camille', '👨🏽']);
  // un champ absent garde sa valeur
  assert(setMemberProfile(s, 'adulte-1', { teint: 0 }).ok);
  assertEqual([m.prenom, m.genre, m.teint], ['Camille', 'm', 0]);
  assert(setMemberProfile(s, 'enfant-2', { prenom: 'Zoé' }).ok);
  assertEqual([memberName(s, 'enfant-2'), memberPortrait(s, 'enfant-2')], ['Zoé', '👧']);
  assert(setMemberProfile(s, 'enfant-2', { genre: 'm', teint: 5 }).ok);
  assertEqual(memberPortrait(s, 'enfant-2'), '👦🏿');
  // les autres membres ne bougent pas, la santé non plus
  assertEqual([memberName(s, 'adulte-2'), memberPortrait(s, 'adulte-2'), m.bonheur], ['Adulte 2', '👨', DATA.VILLE.BONHEUR.DEPART]);
});

test('setMemberProfile : prénom nettoyé, de 1 à 12 caractères', () => {
  const s = createInitialState(1);
  const name = (p) => { const r = setMemberProfile(s, 'adulte-1', { prenom: p }); return r.ok ? findMember(s, 'adulte-1').prenom : r.error; };
  assertEqual(name('  Léa  '), 'Léa', 'espaces retirés au début et à la fin');
  assertEqual(name('Jean\n  Luc'), 'Jean Luc', 'retours à la ligne et espaces répétés : une seule espace');
  assertEqual(name('A'), 'A', '1 caractère suffit');
  assertEqual(name('Abcdefghijkl'), 'Abcdefghijkl', '12 caractères : accepté');
  assertEqual(name('   Abcdefghijkl   '), 'Abcdefghijkl', 'les espaces autour ne comptent pas');
  assertEqual(name('Éléonore-Zoé'), 'Éléonore-Zoé', '12 caractères accentués comptent pour 12');
  assertEqual(name('😀😀😀😀😀😀😀😀😀😀😀😀'), '😀😀😀😀😀😀😀😀😀😀😀😀', 'un emoji compte pour un caractère');
  assertEqual(name('Abcdefghijklm'), 'Le prénom doit faire 12 caractères au plus.', '13 : refusé');
  assertEqual(name(''), 'Écris un prénom.');
  assertEqual(name('   \n\t '), 'Écris un prénom.', 'que des espaces : refusé');
  for (const bad of [null, 42, {}, ['Léa'], true]) assertEqual(setMemberProfile(s, 'adulte-1', { prenom: bad }).ok, false, JSON.stringify(bad));
  assertEqual(findMember(s, 'adulte-1').prenom, '😀😀😀😀😀😀😀😀😀😀😀😀', 'un refus ne change rien');
  assertEqual([validFirstName('Léa'), validFirstName(''), validFirstName('x'.repeat(13)), validFirstName(undefined)], [true, false, false, false]);
  assertEqual([cleanFirstName('  a  b '), cleanFirstName(7)], ['a b', '']);
});

test('setMemberProfile : sexe, teinte et membre vérifiés ; rien ne change si une seule valeur est refusée', () => {
  const s = createInitialState(1);
  const avant = JSON.stringify(s.famille);
  for (const genre of ['x', '', 'F', 1, null]) assertEqual(setMemberProfile(s, 'adulte-1', { genre }).ok, false, `genre ${JSON.stringify(genre)}`);
  for (const teint of [-1, 6, 1.5, '2', null, NaN]) assertEqual(setMemberProfile(s, 'adulte-1', { teint }).ok, false, `teinte ${JSON.stringify(teint)}`);
  assertEqual(setMemberProfile(s, 'adulte-9', { prenom: 'Léa' }), { ok: false, error: 'Membre introuvable.' });
  assertEqual(setMemberProfile(s, 'adulte-1', null).ok, false);
  assertEqual(setMemberProfile(s, 'adulte-1', 'Léa').ok, false);
  // tout ou rien : un bon prénom avec une mauvaise teinte ne change pas le prénom
  assertEqual(setMemberProfile(s, 'adulte-1', { prenom: 'Léa', genre: 'm', teint: 12 }).ok, false);
  assertEqual(setMemberProfile(s, 'adulte-1', { prenom: 'x'.repeat(13), genre: 'm' }).ok, false);
  assertEqual(JSON.stringify(s.famille), avant, 'la famille est intacte');
  assertEqual(setMemberProfile(s, 'adulte-1', {}).ok, true, 'un profil vide ne change rien et n\'est pas une erreur');
  assertEqual(JSON.stringify(s.famille), avant);
  for (const teint of [0, 1, 2, 3, 4, 5]) assertEqual(setMemberProfile(s, 'enfant-1', { teint }).ok, true, `teinte ${teint}`);
});

test('escapeHtml : un prénom comme <b> s\'affiche comme du texte', () => {
  assertEqual(escapeHtml('<b>'), '&lt;b&gt;');
  assertEqual(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assertEqual(escapeHtml('Tom & "Lou" l\'été'), 'Tom &amp; &quot;Lou&quot; l&#39;été');
  assertEqual([escapeHtml('Zoé 🌻'), escapeHtml(''), escapeHtml(null), escapeHtml(undefined), escapeHtml(12)], ['Zoé 🌻', '', '', '', '12']);
  const s = createInitialState(1);
  assert(setMemberProfile(s, 'enfant-1', { prenom: '<b>Lou</b>' }).ok, 'ces caractères sont permis dans un prénom');
  assertEqual(memberName(s, 'enfant-1'), '<b>Lou</b>', 'le moteur garde le texte tel quel');
  const html = escapeHtml(memberName(s, 'enfant-1'));
  assertEqual(html, '&lt;b&gt;Lou&lt;/b&gt;');
  assert(!/[<>"']/.test(html), 'plus aucun caractère spécial une fois échappé');
});

test('profil : le prénom sert dans les messages, mais jamais dans les comptes rendus ni les alertes', () => {
  const s = garden();
  const prenoms = ['Zélie', 'Balthazar', 'Capucine', 'Ferdinand'];
  s.famille.membres.forEach((m, i) => assert(setMemberProfile(s, m.id, { prenom: prenoms[i], teint: i + 1 }).ok));
  setInv(s, {});
  s.awakeMs = 30000;
  const report = sleep(s);
  // Aucun prénom dans ce que le moteur calcule pour les rapports, les alertes et la simulation.
  const sorties = JSON.stringify([report, s.nuit, getNotifications(s), alertSnapshot(s), alertEvents(alertSnapshot(createInitialState(1)), alertSnapshot(s)), buildMorningReport(s), offlineReport(s, offlineSnapshot(s), 0, 0), simulateFromCopy(s, 'minimal', 2)]);
  for (const p of prenoms) assertEqual(sorties.includes(p), false, `${p} ne sort pas du profil`);
  // Ils ne vivent que dans la sauvegarde, qui les garde à l'aller-retour.
  const copy = JSON.parse(JSON.stringify(s));
  assertEqual(copy, s);
  assertEqual(copy.famille.membres.map((m) => memberName(copy, m.id)), prenoms);
  assertEqual(migrate({ v: STATE_VERSION, t: 0, s: copy }), s, 'recharger ne touche pas aux profils');
  // Une nouvelle partie repart d'une famille neuve.
  assertEqual(newGameFrom(s, 4).famille.membres.map((m) => m.prenom), ['Adulte 1', 'Adulte 2', 'Enfant 1', 'Enfant 2']);
});

test('profil : un prénom abîmé dans une sauvegarde retombe sur le rôle à l\'affichage', () => {
  const s = createInitialState(1);
  for (const bad of [undefined, null, '', '   ', 42, 'x'.repeat(40)]) {
    findMember(s, 'adulte-2').prenom = bad;
    assertEqual(memberName(s, 'adulte-2'), 'Adulte 2', JSON.stringify(bad));
  }
  findMember(s, 'adulte-2').genre = 'z';
  findMember(s, 'adulte-2').teint = 99;
  assertEqual(memberPortrait(s, 'adulte-2'), '👩', 'sexe et teinte inconnus : premier sexe, jaune');
});

test('ordre des étapes nocturnes : ce qui reste à ramasser, repas et santé, automatisations, ponte (la pousse suit l\'horloge), paille des moutons et des vaches, préparations, puis péremption en dernier', () => {
  // Arbre v2 : la pluie avant les automatisations, l'entretien automatique
  // après les préparations et avant le bloc nocturne du frigo.
  assertEqual(NIGHT_STEPS, [collectLeftovers, feedFamily, rainNight, autoTasks, layEggs, feedLivestock, growOrchard, finishPreparations, commerceNight, autoMaintain, nightPower, robotNight, fridgeNight, fillSilo, spoil]);
  assert(NIGHT_STEPS[NIGHT_STEPS.length - 1] === spoil, 'la péremption est toujours la dernière étape');
});

test('Dormir : repas, énergie, pousse et rapport de réveil', () => {
  const s = garden();
  plant(s, 'potager-1', 'carotte');
  plant(s, 'potager-2', 'carotte');
  findPlot(s, 'potager-1').stade = 3;
  water(s, 'potager-1');
  water(s, 'potager-2');
  s.awakeMs = 30000;
  const r = sleep(s);
  assertEqual(s.day, 2);
  // Plus de réserve de semences : les 6 patates de départ (19 d'énergie)
  // passent avant les conserves, puis 2 conserves (25) couvrent le reste.
  assertEqual(countItem(s, 'conserve'), 158);
  assertEqual(findPlot(s, 'potager-1').stade, 4);
  assertEqual(findPlot(s, 'potager-2').stade, 1);
  assertEqual(r.besoin, 150);
  assertEqual(r.couverture, 100);
  assertEqual(r.mange, { patate: 6, conserve: 2 });
  assertEqual(r.energieReveil, 100000, 'repas complet : l\'énergie remonte à 100');
  assertEqual(r.pretes, [{ culture: 'carotte', nombre: 1 }]);
  // une nuit sans rien à manger : l'énergie ne remonte qu'à 60, et l'écran de réveil le dit
  const t = garden();
  setInv(t, {});
  t.energie = 0;
  t.awakeMs = 30000;
  const r2 = sleep(t);
  assertEqual([r2.energieMangee, r2.couverture, r2.energieReveil, t.energie], [0, 0, 60000, 60000]);
  // une énergie déjà plus haute que celle du réveil est gardée
  t.energie = 90000;
  t.awakeMs = 30000;
  assertEqual(sleep(t).energieReveil, 90000);
});

test('Dormir avec la réserve de semences : 10 nuits de conserves, patates jamais mangées', () => {
  const s = garden();
  setSeedReserve(s, 'patate', 6);
  setInv(s, { conserve: 60, patate: 6 }); // 6 conserves/nuit (besoin 150, 25 d'énergie chacune) × 10 nuits = 60
  for (let i = 0; i < 6; i++) {
    s.awakeMs = 30000;
    sleep(s);
  }
  // la réserve n'est jamais mangée ; les patates n'ont que vieilli (7 nuits au départ)
  assertEqual(countItem(s, 'patate'), 6);
  assertEqual(lotsOf(s, 'patate')[0].nightsLeft, 1);
  for (let i = 0; i < 4; i++) {
    s.awakeMs = 30000;
    sleep(s);
  }
  assertEqual(countItem(s, 'conserve'), 0);
  s.awakeMs = 30000;
  const r = sleep(s); // 11e nuit : plus rien à manger hors réserve
  assertEqual([r.energieMangee, r.couverture], [0, 0]);
});

test('mode test Lot 2 : graines, maturité, énergie à 0 puis pleine', () => {
  const s = garden();
  testAddSeeds(s);
  assertEqual(countItem(s, 'graine_carotte'), 20);
  assertEqual(countItem(s, 'graine_tomate'), 14);
  assertEqual(countItem(s, 'graine_courgette'), 10);
  assertEqual(countItem(s, 'graine_aubergine'), 10);
  assertEqual(countItem(s, 'patate'), 16);
  plant(s, 'potager-1', 'carotte');
  plant(s, 'potager-2', 'aubergine');
  plantRipe(s, 'potager-3', 'carotte');
  testRipenAll(s);
  assertEqual(readyCrops(s).map((c) => [c.culture, c.nombre]), [['carotte', 2], ['aubergine', 1]]);
  assertEqual(s.potager.parcelles.filter((p) => !p.culture).every((p) => p.stade === 0), true);
  testSetEnergyZero(s);
  assertEqual(s.energie, 0);
  assertEqual(plant(s, 'potager-4', 'carotte').error, 'Plus assez d\'énergie : mange quelque chose ou va dormir.');
  testFillEnergy(s);
  assertEqual(s.energie, energyMax());
});

test('migration v2 (Lot 1) → version courante : garde la partie, ajoute le potager, la famille et l\'inventaire', () => {
  const v2 = {
    version: 2, day: 5, awakeSeconds: 3, pieces: 120, rngSeed: 9, stats: {},
    unlockedTabs: ['ferme', 'inventaire', 'comptoir'], ...startFarm(),
  };
  delete v2.eauMl;
  v2.eau = 12; // ancienne sauvegarde : litres décimaux
  const m = migrate({ v: 2, t: 0, s: v2 });
  assertEqual(m.version, STATE_VERSION);
  assertEqual([m.day, m.pieces, m.eauMl], [5, 120, ml(12)]);
  assertEqual(m.unlockedTabs, ['ferme', 'famille', 'inventaire', 'comptoir']);
  assertEqual(inventoryCounts(m), { conserve: 160, graine_carotte: 10, patate: 6, graine_tomate: 4 });
  assertEqual(m.potager.parcelles.length, 6);
  assertEqual(m.famille.membres.length, 4);
  assertEqual(m.famille.reserve, {});
  assertEqual(m.panneaux.length, 1);
  m.awakeMs = 30000;
  assert(sleep(m) !== null, 'l\'état migré peut dormir');
  assertEqual(countItem(m, 'conserve'), 158, '6 patates puis 2 conserves');
  // une sauvegarde déjà à jour n'est pas touchée
  const s = garden();
  s.pieces = 77;
  setInv(s, { conserve: 3 });
  const same = migrate({ v: STATE_VERSION, t: 0, s });
  assertEqual([same.pieces, countItem(same, 'conserve')], [77, 3]);
});

test('sérialisation JSON aller-retour avec potager, famille et nuit', () => {
  const s = createInitialState(11);
  testAddSeeds(s);
  s.eauMl = ml(40);
  plant(s, 'potager-1', 'tomate');
  water(s, 'potager-1');
  s.awakeMs = 30000;
  sleep(s);
  const copy = JSON.parse(JSON.stringify(s));
  assertEqual(copy, s);
  plantRipe(copy, 'potager-2', 'courgette');
  plantRipe(s, 'potager-2', 'courgette');
  harvest(copy, 'potager-2');
  harvest(s, 'potager-2');
  assertEqual(copy, s, 'même suite d\'actions, même état (aléatoire compris)');
});

/* ---------- version 1.2 : composition de la famille, animaux de compagnie ---------- */

test('version 1.2 : format 18, la migration ajoute les animaux de compagnie et les compteurs sans toucher aux membres', () => {
  assertEqual(typeof MIGRATIONS[17], 'function');
  assertEqual(DATA.FAMILLE.COMPOSITION, { MEMBRES_MIN: 1, MEMBRES_MAX: 6, ADULTES_MIN: 1 });
  assertEqual([DATA.FAMILLE.COMPAGNIE.MAX, Object.keys(DATA.FAMILLE.COMPAGNIE.ESPECES)], [3, ['chien', 'chat']]);
  const neuf = createInitialState(1);
  assertEqual([neuf.famille.animaux, neuf.famille.numeros, neuf.famille.membres.length], [[], { adulte: 2, enfant: 2, compagnon: 0 }, 4]);
  const v17 = JSON.parse(JSON.stringify(createInitialState(7)));
  v17.version = 17;
  delete v17.famille.animaux;
  delete v17.famille.numeros;
  v17.famille.membres[0].prenom = 'Léa';
  v17.famille.membres[2].sante = 40;
  const m = migrate({ v: 17, t: 0, s: v17 });
  assertEqual([m.version, m.famille.animaux, m.famille.numeros], [STATE_VERSION, [], { adulte: 2, enfant: 2, compagnon: 0 }]);
  assertEqual(m.famille.membres, v17.famille.membres.map(({ sante, malade, ...x }) => x), 'les membres ne changent pas (sauf la santé, retirée en version 1.8)');
  assertEqual(migrate({ v: STATE_VERSION, t: 0, s: JSON.parse(JSON.stringify(m)) }), m, 'recharger ne change rien');
  // une sauvegarde abîmée ne fait pas planter la migration
  for (const bad of [{ version: 17 }, { version: 17, famille: null }, { version: 17, famille: 7 }, { version: 17, famille: { membres: 'x' } }]) {
    assertEqual(migrate(bad).version, STATE_VERSION);
  }
});

test('version 1.2 : ajouter des membres jusqu\'à 6, le besoin journalier suit', () => {
  const s = garden();
  assertEqual([familyNeed(s), memberRoom(s), adultCount(s), childCount(s)], [150, 2, 2, 2]);
  const a = addMember(s, false);
  assertEqual([a.ok, a.id, a.besoin, familyNeed(s)], [true, 'adulte-3', 200, 200]);
  const e = addMember(s, true);
  assertEqual([e.ok, e.id, e.besoin, memberRoom(s)], [true, 'enfant-3', 225, 0]);
  const m = findMember(s, 'adulte-3');
  assertEqual([m.nom, m.prenom, m.enfant, 'sante' in m, m.teint, DATA.FAMILLE.PROFIL.GENRES.includes(m.genre)], ['Adulte 3', 'Adulte 3', false, false, 0, true]);
  assertEqual(findMember(s, 'enfant-3').enfant, true);
  const plein = addMember(s, true);
  assertEqual([plein.ok, s.famille.membres.length], [false, 6], 'pas de septième membre');
  // le repas se calcule sur le nouveau besoin
  setInv(s, { conserve: 200 });
  assertEqual(planMeal(s).besoin, 225);
  const rep = sleepOnce(s);
  assertEqual([rep.besoin, rep.couverture], [225, 100]);
  assertEqual(setMemberProfile(s, 'adulte-3', { prenom: 'Mamie', genre: 'f', teint: 2 }).ok, true);
  assertEqual([memberName(s, 'adulte-3'), memberPortrait(s, 'adulte-3')], ['Mamie', '👩\u{1F3FC}']);
});

test('version 1.2 : le nouveau membre arrive avec le bonheur moyen de la famille', () => {
  const s = garden();
  for (const m of s.famille.membres) m.bonheur = 70;
  s.famille.membres[0].bonheur = 30;
  const avant = averageHappiness(s);
  addMember(s, true);
  assertEqual([findMember(s, 'enfant-3').bonheur, averageHappiness(s)], [60, avant], 'la moyenne ne bouge pas');
});

test('version 1.2 : retirer un membre : au moins un membre, au moins un adulte', () => {
  const s = garden();
  const r = removeMember(s, 'enfant-2');
  assertEqual([r.ok, r.besoin, s.famille.membres.map((m) => m.id)], [true, 125, ['adulte-1', 'adulte-2', 'enfant-1']]);
  assertEqual(removeMember(s, 'enfant-2').ok, false, 'déjà parti');
  assertEqual(removeMember(s, 'adulte-2').ok, true);
  const dernierAdulte = removeMember(s, 'adulte-1');
  assertEqual([dernierAdulte.ok, dernierAdulte.error, memberRemovalBlock(s, 'adulte-1')], [false, 'Il faut au moins un adulte dans la famille.', 'Il faut au moins un adulte dans la famille.']);
  assertEqual([removeMember(s, 'enfant-1').ok, familyNeed(s)], [true, 50]);
  const seul = removeMember(s, 'adulte-1');
  assertEqual([seul.ok, seul.error, s.famille.membres.length], [false, 'Il faut au moins un membre dans la famille.', 1]);
  assertEqual(memberRemovalBlock(garden(), 'enfant-2'), '');
});

test('version 1.2 : un identifiant de membre n\'est jamais réutilisé, la famille se sauvegarde telle quelle', () => {
  const s = garden();
  addMember(s, true);
  assertEqual(removeMember(s, 'enfant-3').ok, true);
  assertEqual(addMember(s, true).id, 'enfant-4');
  assertEqual(s.famille.numeros, { adulte: 2, enfant: 4, compagnon: 0 });
  // compteur perdu (sauvegarde modifiée) : on repart du plus grand numéro présent
  delete s.famille.numeros;
  assertEqual(addMember(s, false).id, 'adulte-3');
  const copie = JSON.parse(JSON.stringify(s));
  assertEqual(migrate({ v: STATE_VERSION, t: 0, s: copie }).famille, s.famille);
});

test('version 1.2 : une famille d\'un seul adulte vit sa nuit (besoin 50), une famille de six aussi (besoin 250)', () => {
  const s = garden();
  for (const id of ['adulte-2', 'enfant-1', 'enfant-2']) assert(removeMember(s, id).ok, id);
  setInv(s, { conserve: 200 });
  const r = sleepOnce(s);
  assertEqual([r.besoin, r.couverture, familyNeed(s), r.energieReveil], [50, 100, 50, 100000]);
  const t = garden();
  addMember(t, false);
  addMember(t, false);
  setInv(t, { conserve: 400 });
  const r6 = sleepOnce(t);
  assertEqual([familyNeed(t), r6.besoin, r6.couverture, t.famille.membres.length], [250, 250, 100, 6]);
});

test('version 1.2 : chiens et chats : trois au plus, hors du besoin journalier et du bonheur', () => {
  const s = garden();
  const besoin = familyNeed(s);
  const sante = [averageHappiness(s), s.energie];
  assertEqual([pets(s), petRoom(s)], [[], 3]);
  const a = addPet(s, 'chien');
  const b = addPet(s, 'chat');
  const c = addPet(s, 'chat');
  assertEqual([a.ok, a.id, b.id, c.id, petRoom(s)], [true, 'compagnon-1', 'compagnon-2', 'compagnon-3', 0]);
  assertEqual(pets(s), [{ id: 'compagnon-1', espece: 'chien', nom: 'Chien 1' }, { id: 'compagnon-2', espece: 'chat', nom: 'Chat 2' }, { id: 'compagnon-3', espece: 'chat', nom: 'Chat 3' }]);
  assertEqual([addPet(s, 'chien').ok, pets(s).length], [false, 3], 'pas de quatrième animal');
  assertEqual(addPet(garden(), 'poney').ok, false);
  assertEqual([familyNeed(s), averageHappiness(s), s.energie, s.famille.membres.length], [besoin, ...sante, 4], 'ils ne comptent pas');
  // la nuit ne les nourrit pas et ne les compte pas
  setInv(s, { conserve: 200 });
  const avant = countItem(s, 'conserve');
  const rep = sleepOnce(s);
  const sans = garden();
  setInv(sans, { conserve: 200 });
  sleepOnce(sans);
  assertEqual([rep.besoin, avant - countItem(s, 'conserve')], [150, 200 - countItem(sans, 'conserve')], 'même repas avec ou sans animaux');
  assertEqual(pets(s).length, 3, 'ils sont toujours là au réveil');
});

test('version 1.2 : nom et espèce d\'un animal de compagnie, départ, identifiants jamais réutilisés', () => {
  const s = garden();
  addPet(s, 'chien');
  assertEqual([petName(s, 'compagnon-1'), petIcon('chien'), petIcon('chat'), petIcon('poney')], ['Chien 1', '🐶', '🐱', '🐾']);
  assertEqual(setPetProfile(s, 'compagnon-1', { nom: '  Rex  ', espece: 'chat' }).ok, true);
  assertEqual(findPet(s, 'compagnon-1'), { id: 'compagnon-1', espece: 'chat', nom: 'Rex' });
  for (const bad of [{ nom: '' }, { nom: '   ' }, { nom: 'x'.repeat(13) }, { nom: 7 }, { espece: 'poney' }, null]) {
    assertEqual(setPetProfile(s, 'compagnon-1', bad).ok, false, JSON.stringify(bad));
  }
  assertEqual(findPet(s, 'compagnon-1'), { id: 'compagnon-1', espece: 'chat', nom: 'Rex' }, 'un refus ne change rien');
  assertEqual([setPetProfile(s, 'inconnu', { nom: 'A' }).ok, removePet(s, 'inconnu').ok, petName(s, 'inconnu')], [false, false, '']);
  assertEqual([removePet(s, 'compagnon-1').ok, pets(s), petRoom(s)], [true, [], 3]);
  assertEqual(addPet(s, 'chat').id, 'compagnon-2');
  assertEqual(JSON.parse(JSON.stringify(s)).famille.animaux, [{ id: 'compagnon-2', espece: 'chat', nom: 'Chat 2' }]);
});

/* ---------- version 1.11 (v2, lot 7) : plats et bonheur ---------- */

test('version 1.11 : barème du bonheur des plats (atelier, huile ou fruit, cultures spéciales)', () => {
  const B = DATA.VILLE.BONHEUR;
  assertEqual([B.DECLIN, B.PLATS, B.HUILE_FRUIT, B.SPECIALES, B.PLATS_MAX, B.REPAS_CRU, B.REPAS_PLATS], [-5, { cuisine: 3, four: 5 }, 2, { objets: ['cacao', 'cafe', 'vanille'], bonus: 4 }, 3, undefined, undefined]);
  const table = (ids) => ids.map(dishHappiness);
  assertEqual(table(['soupe_legumes', 'fromage_frais', 'bocal_legumes', 'biere_artisanale']), [3, 3, 3, 3], 'Cuisine');
  assertEqual(table(['omelette', 'salade_tomates', 'compote', 'confiture_fraises', 'creme_marrons']), [5, 5, 5, 5, 5], 'Cuisine + huile ou fruit');
  assertEqual(table(['pain', 'gratin_patates', 'quiche_epinards', 'pain_epices']), [5, 5, 5, 5], 'Four');
  assertEqual(table(['pain_ail', 'tarte_pommes', 'tarte_fraises', 'tarte_myrtilles']), [7, 7, 7, 7], 'Four + huile ou fruit');
  assertEqual(table(['chocolat_chaud', 'cafe_boisson', 'creme_vanille']), [7, 7, 7], 'cultures spéciales');
  assertEqual(table(['carotte', 'farine', 'huile', 'conserve']), [0, 0, 0, 0], 'ni cru ni transformation');
  assertEqual(dishHappiness('ragout'), 3, 'un ancien plat sans recette compte comme la Cuisine');
});

test('version 1.11 : au plus trois plats différents comptent, les meilleurs', () => {
  const plan = { mange: { pain: 2, tarte_pommes: 1, chocolat_chaud: 1, soupe_legumes: 3, omelette: 1, carotte: 5 }, couverture: 100 };
  assertEqual(mealHappinessDelta(plan), -5 + 7 + 7 + 5);
});

test('version 1.11 : le repas commence par un exemplaire des trois meilleurs plats, même au-delà du besoin', () => {
  const s = garden();
  setInv(s, { gratin_patates: 5, pain: 3, soupe_legumes: 2, omelette: 2, carotte: 40 });
  const plan = planMeal(s);
  assertEqual([plan.mange.gratin_patates >= 1, plan.mange.pain, plan.mange.omelette, plan.mange.soupe_legumes], [true, 1, 1, undefined]);
  assertEqual(mealHappinessDelta(plan), -5 + 5 + 5 + 5);
  takeMeal(s);
  assertEqual(averageHappiness(s), DATA.VILLE.BONHEUR.DEPART + 10);
  const t = garden();
  setInv(t, { carotte: 40 });
  t.famille.reserve = {};
  assertEqual(Object.keys(planMeal(t).mange), ['carotte'], 'sans plat : rien ne change');
});

test('animaux de compagnie : chacun sa robe sur la carte, le n-ième chat (ou chien) prend la n-ième', () => {
  const s = createInitialState(1);
  s.famille.animaux = [];
  assertEqual(petSheets(s), [], 'sans animal : ni chat ni chien sur la carte');
  addPet(s, 'chat'); addPet(s, 'chien'); addPet(s, 'chat');
  assertEqual(petSheets(s).map((p) => p.planche), ['chat', 'chien', 'chat_2']);
  s.famille.animaux = [];
  for (let k = 0; k < 3; k++) addPet(s, 'chien');
  assertEqual(petSheets(s).map((p) => p.planche), ['chien', 'chien_2', 'chien_3']);
});
