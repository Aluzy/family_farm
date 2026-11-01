/* ==========================================================================
   Tests du moteur : Lot 6 : Étable (moutons, vaches, paille, laine, lait) et la Vache.
   Lancer seul : node --test tests/engine/etable.test.mjs (ou node tests/run-tests.mjs etable).
   ========================================================================== */

import {
  animalPrice, autoTasks, bottelerSansCarte, buildMorningReport, buyAnimal, buyCow, buyItem,
  buyPasture, buySheep, countItem, cowCapacity, cowCount, cowPlaces, cowsOnHerbs,
  createInitialState, DATA, feedLivestock, finishPreparations, freeCowPlaces, freeSheepPlaces,
  grantTech, herbsOn, herbStock, inventoryCounts, isBuyable, isGraineComptoir, isPerishable,
  layEggs, makeDevice, maxCows, maxSheep, moveToFridge, newStableReport, NIGHT_STEPS, nightHarvest,
  pastureCapacity, pastureCost, recipeNode, recipeUnlocked, roundPct, scaleEnergie, scytheGrass,
  sellItem, setCowHerbs, shear, sheepCount, sheepPlaces, sheepToShear, shelfLife, sleep,
  stableFree, stableOccupied, startFarm, startHousehold, startLot4, startLot5, startMilling,
  startRecipe, STATE_VERSION, strawMissing, strawNeed, strawStock, testAddHens, testAddSheep,
  testAddStraw, testBatir, testFillBatteries, testWoolReady, woolReady,
} from '../../js/engine/index.js';
import {
  affamer, assert, assertEqual, atelier, AVANT_DEMENAGEMENT, farm, fillCows, fillSheep, garden,
  migreAvant, pature, reach, runFor, setInv, setStraw, sleepOnce, test, versBoite,
} from './aide.mjs';

/* ---------- Lot 6 : Étable — moutons, vaches, paille, laine, lait ---------- */

test('DATA Lot 6 : places de l\'Étable, mouton, vache, paille', () => {
  assertEqual(DATA.PATURAGE, { PRIX_CONSTRUCTION: 150, PLACES_DEPART: 10, PLACES_PAR_MOUTON: 1, PLACES_PAR_VACHE: 3, PRIX_PLACE: 40, CROISSANCE: 120, NOURRITURE: 'paille', HERBES: 'herbes_montagne' });
  assertEqual(DATA.ANIMAUX.mouton, { nom: 'Mouton', icone: '🐑', prix: 60, pailleParNuit: 1, joursLaine: 2, laineParTonte: 1, laine: 'laine' });
  assertEqual(DATA.ANIMAUX.vache, { nom: 'Vache', icone: '🐄', prix: 200, pailleParNuit: 2, laitParNuit: 1, lait: 'lait', herbesParNuit: 1, laitAlpage: 'lait_alpage' });
  // Lot 12 : laine 6 → 12, lait 4 → 8 (prix de vente doublés).
  assertEqual([DATA.OBJETS.laine.prix, DATA.OBJETS.laine.mangeable, shelfLife('laine')], [12, false, null]);
  assertEqual([DATA.OBJETS.lait.energie, DATA.OBJETS.lait.prix, shelfLife('lait')], [16, 8, 4]);
  // La paille : ni mangée ni périssable, vendue 1 pièce, jamais achetée au Marché.
  const p = DATA.OBJETS.paille;
  assertEqual([p.nom, p.prix, p.mangeable, p.categorie, p.rachetable], ['Paille', 1, false, 'produit', false]);
  assertEqual([shelfLife('paille'), isPerishable('paille'), isBuyable('paille'), isGraineComptoir('paille')], [null, false, false, false]);
  const memeIcone = Object.keys(DATA.OBJETS).filter((k) => k !== 'paille' && DATA.OBJETS[k].icone === p.icone);
  assertEqual(memeIcone, [], 'l\'icône de la paille n\'est celle d\'aucun autre objet');
  // Les anciennes viandes existent encore (anciennes sauvegardes), avec leur énergie et leur conservation.
  assertEqual([DATA.OBJETS.viande_mouton.energie, DATA.OBJETS.viande_mouton.prix, shelfLife('viande_mouton')], [scaleEnergie(30), 10, 5]);
  assertEqual([DATA.OBJETS.viande_boeuf.energie, DATA.OBJETS.viande_boeuf.prix], [38, 10]);
  assertEqual([DATA.OBJETS.viande_volaille.energie, DATA.OBJETS.viande_volaille.prix], [14, 6]);
});

test('état initial Lot 6 : Étable à ouvrir, sans place, mouton ni vache', () => {
  const s = createInitialState(1);
  assertEqual(s.paturage, { construit: false, places: 0, compteur: 0, compteurVache: 0, moutons: [], vaches: [] });
  assertEqual([pastureCapacity(s), sheepCount(s), freeSheepPlaces(s)], [0, 0, 0]);
  assertEqual([cowCapacity(s), cowCount(s), freeCowPlaces(s)], [0, 0, 0]);
  assertEqual([stableOccupied(s), stableFree(s), strawNeed(s), strawMissing(s)], [0, 0, 0, 0]);
});

test('Étable : bâtie en blocs (enceinte, mangeoire, enclos), ouverte aux moutons et aux vaches, 10 places', () => {
  const s = garden();
  s.pieces = 0;
  assertEqual(testBatir(reach(s, 'paturage'), 'etable').ok, true);
  assertEqual([s.pieces, s.paturage.construit, s.paturage.places], [0, true, 10]);
  assertEqual([pastureCapacity(s), freeSheepPlaces(s), cowCapacity(s), stableFree(s)], [10, 10, 3, 10]);
  assertEqual(testBatir(s, 'etable').ok, false, 'une seule mangeoire');
  // même équilibrage qu'avant : 1 place = 5 ares d'autrefois, une vache en prend 3
  assertEqual([maxSheep(10), maxSheep(11), maxSheep(1), maxSheep(0)], [10, 11, 1, 0]);
  assertEqual([maxCows(10), maxCows(9), maxCows(3), maxCows(2)], [3, 3, 1, 0]);
});

test('mouton : 60 pièces, refusé sans Étable ouverte ni pièces, sans poids', () => {
  const s = pature({ built: false });
  const r = buySheep(s);
  assertEqual([r.ok, s.pieces], [false, 5000], 'l\'Étable n\'est pas prête');
  testBatir(reach(s, 'paturage'), 'etable');
  s.pieces = 59;
  assertEqual(buySheep(s).ok, false, 'pas assez de pièces');
  assertEqual(sheepCount(s), 0);
  s.pieces = 200;
  const ok = buyAnimal(s, 'mouton');
  assertEqual([ok.ok, ok.cost, s.pieces], [true, 60, 140]);
  assertEqual(s.paturage.moutons, [{ id: 'mouton-1', laine: 0 }], 'un identifiant et sa laine, rien d\'autre');
  assertEqual(animalPrice('mouton'), 60);
  buyAnimal(s, 'mouton');
  assertEqual(animalPrice('mouton'), 60, 'prix fixe, quel que soit le nombre');
  assertEqual(s.paturage.moutons.map((m) => m.id), ['mouton-1', 'mouton-2']);
});

test('mouton : refusé quand l\'Étable est pleine (10 places), sans effet sur les pièces', () => {
  const s = pature();
  fillSheep(s, 10);
  assertEqual([sheepCount(s), freeSheepPlaces(s)], [10, 0]);
  const before = s.pieces;
  const r = buyAnimal(s, 'mouton');
  assertEqual(r.ok, false);
  assertEqual([s.pieces, sheepCount(s)], [before, 10]);
});

test('places : 40, 48 puis 58 pièces pour les 11ᵉ, 12ᵉ et 13ᵉ places', () => {
  const s = pature();
  fillSheep(s, 10);
  assertEqual(pastureCost(s), 40);
  const prices = [];
  for (let i = 0; i < 3; i++) {
    const cost = pastureCost(s);
    const before = s.pieces;
    const r = buyPasture(s);
    assertEqual([r.ok, r.places], [true, 11 + i]);
    assertEqual(before - s.pieces, cost);
    prices.push(cost);
    assertEqual(freeSheepPlaces(s), 1);
    assert(buySheep(s).ok, 'le mouton suit la place');
  }
  assertEqual(prices, [40, 48, 58], '57,6 arrondi à 58');
  assertEqual([s.paturage.places, sheepCount(s), pastureCapacity(s)], [13, 13, 13]);
  assertEqual(pastureCost(s), 70, '14ᵉ place : 40 × 1,2³ = 69,12, arrondi à 70');
  // Étable agrandie (arbre) : +10 % par place au lieu de +20 %
  grantTech(s, 'el_paturage', false);
  assertEqual(pastureCost(s), 54, '40 × 1,1³ = 53,24, arrondi à 54');
});

test('places : refusée sans Étable ouverte ou sans pièces ; sinon à la suite, même s\'il en reste de libres', () => {
  const s = pature({ built: false });
  assertEqual(buyPasture(s).ok, false, 'l\'Étable n\'est pas prête');
  testBatir(reach(s, 'paturage'), 'etable');
  assertEqual(s.paturage.places, 10);
  fillSheep(s, 10);
  s.pieces = 39;
  assertEqual(buyPasture(s).ok, false, 'pas assez de pièces');
  assertEqual([s.pieces, s.paturage.places], [39, 10]);
  s.pieces = 40 + 48 + 58;
  assertEqual(buyPasture(s).ok, true);
  assertEqual(buyPasture(s).ok, true, 'la place précédente est encore libre : l\'achat suivant passe quand même');
  assertEqual(buyPasture(s).ok, true);
  assertEqual([s.pieces, s.paturage.places, freeCowPlaces(s)], [0, 13, 1], '3 places de suite : de quoi loger une vache');
  assertEqual(buyPasture(s).ok, false, 'plus de pièces');
});

/* -- la paille : qui mange, qui produit -- */

test('paille : chaque nuit un mouton en mange 1 et une vache 2', () => {
  const s = pature();
  fillSheep(s, 3);
  fillCows(s, 2);
  assertEqual(strawNeed(s), 3 * 1 + 2 * 2);
  setStraw(s, 20);
  assertEqual([strawStock(s), strawMissing(s)], [20, 0]);
  const rap = feedLivestock(s);
  assertEqual(rap, { moutons: 3, vaches: 2, moutonsNourris: 3, vachesNourries: 2, paille: 7, manque: 0, herbes: 0, vachesAlpage: 0 });
  assertEqual(strawStock(s), 13);
  assertEqual(s.nuit.etable, rap);
  // une nuit complète : même décompte, noté dans le compte rendu du réveil
  const rep = sleepOnce(s);
  assertEqual([rep.etable.paille, rep.etable.manque, rep.paille, rep.pailleBesoin], [7, 0, 6, 7]);
  assertEqual(strawMissing(s), 1, 'il manquera 1 paille ce soir');
  // sans animaux, la paille ne bouge pas
  const t = pature();
  setStraw(t, 5);
  assertEqual(feedLivestock(t), newStableReport());
  assertEqual(strawStock(t), 5);
});

test('laine : 1 laine toutes les 2 nuits nourries, tonte refusée avant', () => {
  const s = pature();
  fillSheep(s, 1);
  const id = s.paturage.moutons[0].id;
  setStraw(s, 10);
  assertEqual(shear(s, id).ok, false, 'tonte refusée à l\'achat');
  sleepOnce(s);
  assertEqual([s.paturage.moutons[0].laine, sheepToShear(s)], [1, 0]);
  assertEqual(shear(s, id), { ok: false, error: 'La laine n\'est pas encore prête (1 / 2 nuits nourri).' });
  assertEqual(countItem(s, 'laine'), 0);
  sleepOnce(s);
  assertEqual([s.paturage.moutons[0].laine, woolReady(s.paturage.moutons[0]), sheepToShear(s)], [2, true, 1]);
  const r = shear(s, id);
  assertEqual([r.ok, r.laine], [true, 1]);
  assertEqual([countItem(s, 'laine'), s.paturage.moutons[0].laine, sheepCount(s)], [1, 0, 1], 'le mouton reste');
  assertEqual(shear(s, id).ok, false, 'pas deux tontes de suite');
  for (let i = 0; i < 5; i++) sleepOnce(s);
  assertEqual(s.paturage.moutons[0].laine, 2, 'sans tonte, la laine reste prête (elle ne s\'accumule pas)');
  assertEqual(strawStock(s), 3, 'le mouton mange quand même sa paille chaque nuit');
  assertEqual(shear(s, id).ok, true);
  assertEqual(countItem(s, 'laine'), 2);
  assertEqual(shear(s, 'mouton-99').ok, false, 'mouton inconnu');
});

test('laine : une nuit sans paille n\'avance pas la laine, et ne l\'enlève pas', () => {
  const s = pature();
  fillSheep(s, 1);
  const m = s.paturage.moutons[0];
  setStraw(s, 1);
  sleepOnce(s);
  assertEqual([m.laine, strawStock(s)], [1, 0]);
  const rep = sleepOnce(s); // plus de paille
  assertEqual([m.laine, rep.etable.moutonsNourris, rep.etable.manque], [1, 0, 1], 'rien ne se passe : la laine attend');
  for (let i = 0; i < 10; i++) sleepOnce(s);
  assertEqual([m.laine, sheepCount(s)], [1, 1], 'dix nuits sans paille : le mouton est toujours là, sans autre effet');
  setStraw(s, 1);
  sleepOnce(s);
  assertEqual([m.laine, woolReady(m)], [2, true], 'la laine reprend où elle en était');
});

test('lait : une vache nourrie donne 1 lait cette nuit-là, une vache sans paille n\'en donne pas', () => {
  const s = pature();
  fillCows(s, 2);
  setStraw(s, 4);
  // Lait dès la première nuit nourrie, sans délai (contrairement à la laine du mouton).
  let rep = sleepOnce(s);
  assertEqual([rep.lait, rep.etable.vachesNourries, strawStock(s)], [2, 2, 0]);
  assertEqual(nightHarvest(rep).lait, 2);
  const lait = countItem(s, 'lait');
  rep = sleepOnce(s);
  assertEqual([rep.lait, rep.etable.vachesNourries, rep.etable.manque, s.nuit.lait], [0, 0, 4, 0], 'pas de paille : pas de lait');
  assert(countItem(s, 'lait') <= lait, 'aucun lait ajouté');
  assertEqual(cowCount(s), 2, 'les vaches sont toujours là');
  // une vache ne mange pas une demi-ration : avec 3 pailles, une seule mange
  setStraw(s, 3);
  rep = sleepOnce(s);
  assertEqual([rep.lait, rep.etable.vachesNourries, rep.etable.paille, rep.etable.manque, strawStock(s)], [1, 1, 2, 2, 1]);
});

test('herbes de montagne : une vache nourrie aux herbes donne du lait d\'alpage, à la place de sa paille', () => {
  const s = pature();
  fillCows(s, 3);
  setStraw(s, 6);
  setInv(s, { paille: 6, herbes_montagne: 2 });
  const V = DATA.ANIMAUX.vache;
  assertEqual([DATA.PATURAGE.HERBES, V.herbesParNuit, V.laitAlpage], ['herbes_montagne', 1, 'lait_alpage']);
  // sans le bouton de l'Étable, les herbes restent dans l'inventaire
  assertEqual([herbsOn(s), cowsOnHerbs(s), strawNeed(s)], [false, 0, 6]);
  let rep = sleepOnce(s);
  assertEqual([rep.lait, rep.laitAlpage, rep.etable.herbes, countItem(s, 'herbes_montagne')], [3, 0, 0, 2]);
  // nourries aux herbes : les 2 premières vaches les mangent, la 3e sa paille
  setInv(s, { paille: 6, herbes_montagne: 2 });
  assertEqual(setCowHerbs(s, true), { ok: true, herbes: true });
  assertEqual([herbsOn(s), herbStock(s), cowsOnHerbs(s), strawNeed(s), strawMissing(s)], [true, 2, 2, 2, 0]);
  const laitAvant = countItem(s, 'lait');
  rep = sleepOnce(s);
  assertEqual([rep.lait, rep.laitAlpage, rep.etable.herbes, rep.etable.vachesAlpage, rep.etable.vachesNourries, rep.etable.paille],
    [1, 2, 2, 2, 3, 2]);
  assertEqual([countItem(s, 'lait_alpage'), countItem(s, 'lait') - laitAvant, countItem(s, 'herbes_montagne'), strawStock(s)], [2, 1, 0, 4]);
  assertEqual(nightHarvest(rep).lait_alpage, 2);
  // plus d'herbes : retour à la paille et au lait ordinaire, le bouton reste
  rep = sleepOnce(s);
  assertEqual([rep.lait, rep.laitAlpage, rep.etable.herbes, herbsOn(s)], [2, 0, 0, true]);
  // revenir à la paille : le champ disparaît (l'Étable des sauvegardes d'avant)
  assertEqual(setCowHerbs(s, false), { ok: true, herbes: false });
  assertEqual('herbes' in s.paturage, false);
  const t = farm();
  assertEqual(setCowHerbs(t, true).ok, false, 'pas d\'Étable');
});

test('herbes de montagne : une trouvaille de la montagne, fraîche ; le lait d\'alpage vaut plus que le lait', () => {
  const h = DATA.OBJETS.herbes_montagne;
  assertEqual([h.trouvaille, h.mangeable, h.rachetable, DATA.CONSERVATION.herbes_montagne], ['montagne', false, false, 3]);
  const l = DATA.OBJETS.lait_alpage;
  assertEqual([l.mangeable, DATA.CONSERVATION.lait_alpage], [true, DATA.CONSERVATION.lait]);
  assert(l.prix > DATA.OBJETS.lait.prix, 'le lait d\'alpage se vend plus cher que le lait');
  assert(!isBuyable('herbes_montagne') && !isBuyable('lait_alpage'), 'ni l\'un ni l\'autre ne s\'achète au Marché');
});

test('fromage d\'alpage : 3 laits d\'alpage sur une chaîne de production (nœud Laiterie), plus cher que le fromage frais', () => {
  const r = DATA.RECETTES.fromage_alpage;
  assertEqual([r.station, r.transformation, r.sortie, r.ingredients], ['chaine', true, 'fromage_alpage', [{ item: 'lait_alpage', qte: 3 }]]);
  assertEqual(recipeNode('fromage_alpage'), recipeNode('fromage_frais'));
  // le prix et l'énergie suivent la règle des plats : ingrédients × 1,3
  const coef = DATA.CUISINE.COEF_PLAT;
  assertEqual(DATA.OBJETS.fromage_alpage.prix, roundPct(3 * DATA.OBJETS.lait_alpage.prix, coef));
  assertEqual(DATA.OBJETS.fromage_alpage.energie, roundPct(3 * DATA.OBJETS.lait_alpage.energie, coef));
  assert(DATA.OBJETS.fromage_alpage.prix > DATA.OBJETS.fromage_frais.prix, 'plus cher que le fromage frais');
  const s = atelier();
  setInv(s, { lait_alpage: 3 });
  assertEqual(recipeUnlocked(s, 'fromage_alpage'), false);
  grantTech(s, 'cui_laiterie', false);
  assertEqual(recipeUnlocked(s, 'fromage_alpage'), true);
  assertEqual(startRecipe(s, 'fromage_alpage').ok, false, 'pas en cuisine : sur une chaîne (tests/engine/chaines.test.mjs)');
  assertEqual(countItem(s, 'lait_alpage'), 3);
});

test('paille insuffisante : on nourrit dans l\'ordre de la liste, les moutons puis les vaches', () => {
  const s = pature();
  fillSheep(s, 3);
  fillCows(s, 2);
  // 4 pailles : les 3 moutons (3), puis il n'en reste qu'1 : aucune vache.
  setStraw(s, 4);
  let rap = feedLivestock(s);
  assertEqual(rap, { moutons: 3, vaches: 2, moutonsNourris: 3, vachesNourries: 0, paille: 3, manque: 4, herbes: 0, vachesAlpage: 0 });
  assertEqual([s.paturage.moutons.map((m) => m.laine), s.nuit.lait, strawStock(s)], [[1, 1, 1], 0, 1]);
  // 2 pailles : les deux premiers moutons seulement.
  setStraw(s, 2);
  rap = feedLivestock(s);
  assertEqual([rap.moutonsNourris, rap.vachesNourries, rap.manque], [2, 0, 1 + 4]);
  assertEqual(s.paturage.moutons.map((m) => m.laine), [2, 2, 1], 'les premiers de la liste d\'abord');
  // 5 pailles : les 3 moutons, puis la première vache.
  setStraw(s, 5);
  rap = feedLivestock(s);
  assertEqual([rap.moutonsNourris, rap.vachesNourries, rap.paille, rap.manque, s.nuit.lait], [3, 1, 5, 2, 1]);
  // 0 paille : personne, et il ne se passe rien d'autre.
  setStraw(s, 0);
  const avant = JSON.stringify(s.paturage);
  rap = feedLivestock(s);
  assertEqual([rap.moutonsNourris, rap.vachesNourries, rap.paille, rap.manque], [0, 0, 0, 7]);
  assertEqual(JSON.stringify(s.paturage), avant, 'animaux inchangés');
});

test('la paille bottelée nourrit les animaux (faux → fibres → botteleuse → Étable) ; le Moulin n\'en donne plus', () => {
  const s = pature();
  s.stations.moulin = { construit: true, tache: null, appareil: makeDevice('moulin', 'moulin', 120) };
  testFillBatteries(s);
  fillSheep(s, 2);
  fillCows(s, 1);
  setInv(s, { ble: 4, conserve: 200 });
  assertEqual(strawMissing(s), 4);
  assert(startMilling(s, 4).ok);
  runFor(s, 21);
  assertEqual([countItem(s, 'farine'), strawStock(s), strawMissing(s)], [4, 0, 4], 'version 1.23 : la farine seule');
  s.outils = { faux: true, choisi: 'faux' };
  for (let k = 0; k < 10; k++) assert(scytheGrass(s, `${k * 16},40`).ok);
  assertEqual([countItem(s, 'fibre'), strawStock(s)], [10, 0], 'la faux donne des fibres');
  assertEqual(bottelerSansCarte(s), 10);
  assertEqual([countItem(s, 'fibre'), strawStock(s), strawMissing(s)], [0, 10, 0]);
  const rep = sleepOnce(s);
  assertEqual([rep.etable.moutonsNourris, rep.etable.vachesNourries, rep.lait, strawStock(s)], [2, 1, 1, 6]);
  assertEqual(countItem(s, 'farine'), 4, 'la farine reste pour le pain');
});

test('laine : ni périssable ni comestible, vendue 12 pièces l\'unité (6 avant le Lot 12)', () => {
  const s = pature();
  testAddSheep(s, 1);
  testWoolReady(s);
  shear(s, 'mouton-1');
  for (let i = 0; i < 10; i++) sleepOnce(s);
  assertEqual(countItem(s, 'laine'), 1, 'la laine ne périme pas');
  affamer(s);
  assertEqual([s.repasJour.mange.laine, countItem(s, 'laine')], [undefined, 1], 'la famille ne la mange pas');
  const before = s.pieces;
  const r = sellItem(s, 'laine', 1);
  assertEqual([r.ok, r.gain, s.pieces], [true, 12, before + 12]);
  assertEqual(isBuyable('laine'), false, 'la laine ne se rachète pas');
});

test('paille : ne périme pas, ne se mange pas, se vend 1 pièce et ne s\'achète pas', () => {
  const s = pature();
  setStraw(s, 5);
  for (let i = 0; i < 10; i++) sleepOnce(s);
  assertEqual(strawStock(s), 5, 'sans animaux, elle se garde');
  affamer(s);
  assertEqual([s.repasJour.mange.paille, strawStock(s)], [undefined, 5], 'la famille ne la mange pas');
  assertEqual(moveToFridge(Object.assign(s, { frigo: { ...s.frigo, construit: true } }), 'paille', 1).ok, false, 'inutile au frigo');
  const before = s.pieces;
  assertEqual(sellItem(s, 'paille', 2), { ok: true, sold: 2, gain: 2 });
  assertEqual([s.pieces, strawStock(s)], [before + 2, 3]);
  assertEqual(buyItem(s, 'paille', 1).ok, false, 'elle vient seulement du Moulin');
});

test('rapport de réveil : moutons, laine prête, vaches, paille', () => {
  const s = pature();
  fillSheep(s, 3);
  setStraw(s, 6);
  sleepOnce(s);
  let rep = sleepOnce(s);
  assertEqual([rep.moutons, rep.lainePrete], [3, 3]);
  assertEqual(rep.etable, { moutons: 3, vaches: 0, moutonsNourris: 3, vachesNourries: 0, paille: 3, manque: 0, herbes: 0, vachesAlpage: 0 });
  assertEqual([rep.paille, rep.pailleBesoin], [0, 3]);
  shear(s, 'mouton-1');
  rep = buildMorningReport(s);
  assertEqual([rep.moutons, rep.lainePrete], [3, 2]);
  const t = garden();
  rep = sleepOnce(t);
  assertEqual([rep.moutons, rep.lainePrete, rep.vaches, rep.lait, rep.paille, rep.pailleBesoin], [0, 0, 0, 0, 0, 0]);
  assertEqual(rep.etable, newStableReport());
});

test('nuit : la paille est mangée juste après la ponte, sans perturber ni le repas ni les œufs', () => {
  const s = pature();
  assert(testBatir(reach(s, 'poulailler'), 'poulailler').ok);
  testAddHens(s, 4);
  fillSheep(s, 2);
  setStraw(s, 2);
  versBoite(s);
  s.poulailler.nourries = 4;
  affamer(s);
  const rep = sleepOnce(s);
  assertEqual(rep.oeufs, 4);
  assertEqual(s.paturage.moutons.map((m) => m.laine), [1, 1]);
  assert(rep.energieMangee > 0, 'le repas a bien eu lieu');
  assert(NIGHT_STEPS.indexOf(feedLivestock) === NIGHT_STEPS.indexOf(layEggs) + 1, 'juste après la ponte');
  assert(NIGHT_STEPS.indexOf(autoTasks) < NIGHT_STEPS.indexOf(feedLivestock), 'la tonte automatique passe avant le repas des moutons');
  assert(NIGHT_STEPS.indexOf(feedLivestock) < NIGHT_STEPS.indexOf(finishPreparations), 'la paille moulue pendant la nuit sert la nuit suivante');
});

test('tonte automatique : la laine prête est tondue avant le repas, et repart dès cette nuit', () => {
  const s = pature();
  fillSheep(s, 2);
  grantTech(s, 'el_tonte', false);
  setStraw(s, 10);
  sleepOnce(s);
  let rep = sleepOnce(s);
  assertEqual([rep.auto.tondus, countItem(s, 'laine'), rep.lainePrete], [0, 0, 2], 'prête au 2ᵉ réveil');
  rep = sleepOnce(s);
  assertEqual([rep.auto.tondus, countItem(s, 'laine')], [2, 2], 'tondus pendant la nuit suivante');
  assertEqual(s.paturage.moutons.map((m) => m.laine), [1, 1], 'et déjà une nuit nourrie de plus');
  assertEqual(s.campagne.compteurs.laines, 2);
});

test('mode test Lot 6 : +3 moutons, laine prête, +20 pailles', () => {
  const s = reach(createInitialState(1), 'paturage');
  s.pieces = 0;
  assertEqual(testAddSheep(s).ok, false, 'pas d\'Étable : elle se bâtit');
  assert(testBatir(s, 'etable').ok);
  assertEqual(testAddSheep(s).ok, true);
  assertEqual([s.pieces, s.paturage.construit, s.paturage.places, sheepCount(s)], [0, true, 10, 3]);
  testAddSheep(s);
  assertEqual(sheepCount(s), 6);
  testAddSheep(s, 10);
  assertEqual(sheepCount(s), 10, 'dans la limite des places libres');
  assertEqual(testAddSheep(s).added, 0);
  assertEqual(s.paturage.moutons.map((m) => m.id).length, 10);
  assertEqual(sheepToShear(s), 0);
  testWoolReady(s);
  assertEqual(sheepToShear(s), 10);
  assertEqual(shear(s, 'mouton-1').ok, true);
  assertEqual(testAddStraw(s).ok, true);
  assertEqual(strawStock(s), 20);
  testAddStraw(s, 5);
  assertEqual(strawStock(s), 25);
  assertEqual([typeof testFattenSheep, typeof testFattenCows], ['undefined', 'undefined']);
});

/* ---------- Vache ---------- */

test('vache : 200 pièces, refusée sans Étable ouverte ni 3 places libres, sans poids', () => {
  const s = pature({ built: false });
  assertEqual(buyCow(s).ok, false, 'l\'Étable n\'est pas prête');
  testBatir(reach(s, 'paturage'), 'etable');
  s.pieces = 199;
  assertEqual(buyCow(s).ok, false, 'pas assez de pièces');
  s.pieces = 5000;
  // 10 places = 3 vaches (3 places chacune, 1 place inutilisable ensuite).
  assertEqual(cowCapacity(s), 3);
  const r = buyAnimal(s, 'vache');
  assertEqual([r.ok, r.cost], [true, 200]);
  assertEqual(s.paturage.vaches, [{ id: 'vache-1' }], 'un identifiant, rien d\'autre');
  assertEqual(animalPrice('vache'), 200, 'prix fixe, quel que soit le nombre');
  fillCows(s, 2);
  assertEqual(cowCount(s), 3);
  assertEqual(buyCow(s), { ok: false, error: 'Pas assez de place pour une vache : il lui faut 3 places libres.' });
  assertEqual([stableOccupied(s), stableFree(s), freeSheepPlaces(s)], [9, 1, 1], '3 vaches = 9 places sur 10 : il reste une place de mouton');
});

test('Étable mixte : capacités et places libres correctes avec des moutons et des vaches', () => {
  const s = pature();
  fillSheep(s, 4); // 4 places
  fillCows(s, 2); // 2 × 3 = 6 places → 10 au total, Étable pleine
  assertEqual([sheepPlaces(s), cowPlaces(s), stableOccupied(s), stableFree(s)], [4, 6, 10, 0]);
  assertEqual(freeSheepPlaces(s), 0, 'plus de place, ni pour un mouton...');
  assertEqual(freeCowPlaces(s), 0, '... ni pour une vache');
  assertEqual([sheepCount(s), pastureCapacity(s), cowCount(s), cowCapacity(s)], [4, 4, 2, 2]);
  // Une vache demande 3 places : on les achète à la suite.
  assert(buyPasture(s).ok);
  assertEqual([freeSheepPlaces(s), freeCowPlaces(s)], [1, 0]);
  assert(buyPasture(s).ok, 'il reste une place libre : l\'achat suivant passe');
  assert(buyPasture(s).ok);
  assertEqual([freeSheepPlaces(s), freeCowPlaces(s), stableOccupied(s), s.paturage.places], [3, 1, 10, 13]);
});

test('sauvegarder et recharger avec des moutons, des vaches et de la paille', () => {
  const s = pature();
  fillSheep(s, 2);
  fillCows(s, 2);
  setStraw(s, 9);
  sleepOnce(s);
  const reloaded = migreAvant({ v: STATE_VERSION, t: Date.now(), s: JSON.parse(JSON.stringify(s)) });
  assertEqual(reloaded, s, 'aucun changement au rechargement (même version)');
  assertEqual([strawStock(reloaded), cowCount(reloaded), sheepCount(reloaded)], [3, 2, 2]);
  // Le jeu continue à fonctionner normalement après le rechargement.
  assertEqual(buyCow(reloaded).ok, false, '2 + 6 = 8 places prises : pas 3 de libres');
  assertEqual(buySheep(reloaded).ok, true);
});

test('sérialisation JSON : Étable, moutons et paille font l\'aller-retour et la partie continue à l\'identique', () => {
  const s = pature();
  fillSheep(s, 3);
  setStraw(s, 14);
  sleepOnce(s);
  const copy = JSON.parse(JSON.stringify(s));
  assertEqual(copy, s);
  for (let i = 0; i < 8; i++) {
    sleepOnce(s);
    sleepOnce(copy);
  }
  assertEqual(copy, s);
  assertEqual([copy.paturage.moutons.map((m) => m.laine), strawStock(copy)], [[2, 2, 2], 0], '14 pailles : 4 nuits nourries à 3 moutons, puis 2 pailles pour deux moutons');
});

test('migration v6 (Lot 5) → v7 : l\'Étable des moutons apparaît à ouvrir, la partie est gardée', () => {
  const v6 = {
    version: 6, day: 30, awakeSeconds: 11, pieces: 640, rngSeed: 2, stats: {},
    unlockedTabs: ['ferme', 'famille', 'inventaire', 'comptoir', 'recettes'], marche: {},
    ...startFarm(), ...startHousehold(), ...startLot4(), ...startLot5(),
  };
  const m = migreAvant({ v: 6, t: 0, s: v6 });
  assertEqual(m.version, AVANT_DEMENAGEMENT);
  assertEqual([m.day, m.pieces], [30, 640]);
  assertEqual(m.paturage, { construit: false, places: 0, compteur: 0, compteurVache: 0, moutons: [], vaches: [] });
  assertEqual(inventoryCounts(m).conserve, 160);
  m.pieces = 500;
  assertEqual(testBatir(reach(m, 'paturage'), 'etable').ok, true);
  assertEqual(buySheep(m).ok, true);
  m.awakeMs = 30000;
  assertEqual(sleep(m).moutons, 1);
  // une sauvegarde déjà en v7 n'est pas modifiée
  const again = migreAvant({ v: 7, t: 0, s: JSON.parse(JSON.stringify(m)) });
  assertEqual(again.paturage, m.paturage);
});

test('migration v0 → version courante : les chaînes mènent au Lot 6', () => {
  const m = migreAvant({ v: 0, t: 0, s: { day: 2, awakeSeconds: 0, pieces: 55, rngSeed: 3, unlockedTabs: ['ferme'], stats: {} } });
  assertEqual(m.version, AVANT_DEMENAGEMENT);
  assertEqual(m.paturage.construit, false);
  assertEqual(m.paturage.moutons, []);
});
