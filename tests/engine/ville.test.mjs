/* ==========================================================================
   Tests du moteur : bonheur, sorties, marché de la ville (1.5) ; vente en ville et entreprises (1.20).
   Lancer seul : node --test tests/engine/ville.test.mjs (ou node tests/run-tests.mjs ville).
   ========================================================================== */

import {
  addItem, advanceHours, applyMealHappiness, averageHappiness, awakeMsAtHour, buyCompany,
  buyInTown, buyItem, companiesStep, companyPlan, countItem, createInitialState, DATA, findPlot,
  goOut, goToTownMarket, happinessCostPct, hourOfDay, isBuyable, isPerishable, mealHappinessDelta,
  memberHappiness, migrate, migrateHappiness, outingCost, outingLoot, outingMembers, outingStatus,
  ownsCompany, plant, removeMember, sellInTown, setCompanyQuota, STATE_VERSION, takeMeal, tick,
  townItems, townMarketOpen, townSellable, townSellList, townSellPrice, water,
} from '../../js/engine/index.js';
import {
  assert, assertEqual, auto5, garden, setInv, test,
} from './aide.mjs';

/* ---------- version 1.5 : bonheur, sorties, marché de la ville ---------- */

test('bonheur : chaque membre part à DEPART ; repas cru ou cuisiné', () => {
  const s = garden();
  const B = DATA.VILLE.BONHEUR;
  for (const m of s.famille.membres) assertEqual(memberHappiness(m), B.DEPART);
  assertEqual(happinessCostPct(s), 70, 'bonheur 60 : les actions coûtent 30 % de moins');
  assertEqual(mealHappinessDelta({ mange: { carotte: 10 }, couverture: 100 }), -5, 'version 1.11 : tout cru, la baisse de la nuit');
  assertEqual(mealHappinessDelta({ mange: { gratin_patates: 2 }, couverture: 100 }), -5 + 5, 'un plat du Four');
  assertEqual(mealHappinessDelta({ mange: { carotte: 1 }, couverture: 40 }), -5 + B.FAIM, 'cru et pas assez');
  assertEqual(mealHappinessDelta({ mange: {}, couverture: 0 }), -5 + B.FAIM, 'rien mangé');
  const d = applyMealHappiness(s, { mange: { tarte_pommes: 1, pain: 1, omelette: 1 }, couverture: 100 });
  assertEqual(d, -5 + 7 + 5 + 5);
  assertEqual(averageHappiness(s), 72);
  assertEqual(happinessCostPct(s), 64);
});

test('bonheur : le repas de 19 h le fait varier et le note dans state.repas', () => {
  const s = garden();
  setInv(s, { carotte: 40 });
  const avant = averageHappiness(s);
  takeMeal(s);
  assertEqual(s.repas.bonheur, DATA.VILLE.BONHEUR.DECLIN);
  assertEqual(averageHappiness(s), avant + DATA.VILLE.BONHEUR.DECLIN);
});

test('sorties : prix (enfants à moitié), une fois par jour, retour avant 22 h', () => {
  const s = garden();
  s.pieces = 500;
  assertEqual(outingCost(s, 'cinema'), 8 + 8 + 4 + 4, '2 adultes, 2 enfants');
  const avant = s.famille.membres.map((m) => m.bonheur);
  const r = goOut(s, 'cinema');
  assertEqual(r.ok, true);
  assertEqual(s.pieces, 500 - 24);
  assertEqual(hourOfDay(s), 9, '6 h + 3 h');
  s.famille.membres.forEach((m, i) => assertEqual(m.bonheur, avant[i] + 12));
  assertEqual(outingStatus(s, 'cinema').raison, 'faite');
  assertEqual(goOut(s, 'cinema').ok, false);
  s.awakeMs = awakeMsAtHour(15);
  assertEqual(outingStatus(s, 'montagne').raison, 'tard', '15 h + 8 h > 22 h');
  assertEqual(outingStatus(s, 'foret').ok, true, '15 h + 5 h = 20 h');
});

test('sorties : toute la famille sort ; le parc demande un enfant', () => {
  const s = garden();
  s.pieces = 100;
  assertEqual(outingMembers(s).length, s.famille.membres.length, 'version 1.8 : plus de malade qui reste à la maison');
  for (const m of s.famille.membres.filter((x) => x.enfant)) assert(removeMember(s, m.id).ok);
  assertEqual(outingStatus(s, 'parc').raison, 'enfants');
  assertEqual(outingCost(s, 'cinema'), 16, 'seuls les adultes paient');
});

test('voyages : butin de la montagne, cueillette du jour en forêt', () => {
  const s = garden();
  s.pieces = 500;
  setInv(s, {});
  assert(goOut(s, 'montagne').ok);
  assertEqual(countItem(s, 'miel'), 2);
  assertEqual(countItem(s, 'fromage_alpage'), 0, 'le fromage d\'alpage se fait maintenant en Cuisine, avec le lait d\'alpage');
  // version 1.6 : la cueillette de la forêt tourne d'un jour à l'autre
  const t = garden();
  assertEqual([1, 2, 3, 4].map((day) => { t.day = day; return outingLoot(t, 'foret'); }),
    [{ champignon: 3 }, { myrtille: 5 }, { champignon: 2, chataigne: 4 }, { champignon: 3 }]);
});

test('sorties : le temps passe (les panneaux produisent), sans repas ni nuit', () => {
  const s = garden();
  const day = s.day;
  advanceHours(s, 2);
  assertEqual(s.awakeMs, 2 * DATA.TEMPS.SECONDES_PAR_HEURE * 1000);
  assertEqual(s.day, day);
  assertEqual(s.repas, null);
});

test('sorties : pendant l\'absence, les plantes poussent et les asperseurs arrosent (le même pas que tick)', () => {
  const s = garden();
  s.pieces = 500;
  assert(plant(s, 'potager-1', 'carotte').ok);
  s.awakeMs = awakeMsAtHour(12);
  assert(water(s, 'potager-1').ok);
  s.day += 1; // le lendemain à 10 h : 22 h de pousse
  s.awakeMs = awakeMsAtHour(10);
  assert(goOut(s, 'cinema').ok);
  assertEqual([findPlot(s, 'potager-1').stade, findPlot(s, 'potager-1').arrose], [1, false], '24 h après l\'arrosage, pendant le cinéma');
  // arrosage automatique : à 7 h, pendant la sortie
  const a = auto5('potager');
  a.pieces = 500;
  assert(plant(a, 'potager-2', 'carotte').ok);
  const eau = a.eauMl;
  assertEqual(hourOfDay(a), 6);
  assert(goOut(a, 'cinema').ok);
  assertEqual(findPlot(a, 'potager-2').arrose, true, 'arrosée à 7 h, famille en ville');
  assertEqual(a.irrigation.jour, a.day);
  assert(a.eauMl < eau);
});

test('marché de la ville : ouvert après le trajet, seuls ses objets s\'y vendent', () => {
  const s = garden();
  s.pieces = 100;
  assertEqual(townItems(), ['poisson', 'miel', 'fromage_alpage', 'sucre', 'epices']);
  assertEqual(isBuyable('poisson'), false, 'pas au marché de la ferme');
  assertEqual(buyItem(s, 'poisson', 1).ok, false);
  assertEqual(buyInTown(s, 'poisson', 1).ok, false, 'pas encore en ville');
  assert(goToTownMarket(s).ok);
  assertEqual(townMarketOpen(s), true);
  assertEqual(hourOfDay(s), 6 + DATA.VILLE.MARCHE.HEURES);
  const r = buyInTown(s, 'poisson', 2);
  assertEqual(r.ok, true);
  assertEqual(countItem(s, 'poisson'), 2);
  assertEqual(buyInTown(s, 'carotte', 1).ok, false, 'la carotte se vend à la ferme');
  assertEqual(buyInTown(s, 'champignon', 1).ok, false, 'la cueillette ne s\'achète pas');
});

test('migration v21 → v22 : chaque membre reçoit son bonheur de départ', () => {
  const v21 = JSON.parse(JSON.stringify(garden()));
  v21.version = 21;
  delete v21.ville;
  for (const m of v21.famille.membres) delete m.bonheur;
  const m = migrate({ v: 21, t: 0, s: v21 });
  assertEqual(m.version, STATE_VERSION);
  assertEqual(m.ville, { faits: {}, marche: 0 });
  for (const x of m.famille.membres) assertEqual(x.bonheur, DATA.VILLE.BONHEUR.DEPART);
  assertEqual(typeof migrateHappiness, 'function');
});

/* ---------- version 1.20 : la vente en ville et les entreprises ---------- */

test('vente en ville : VENTE % du prix de la ferme, les produits de la ferme seulement', () => {
  const s = garden();
  setInv(s, { lait: 5, carotte: 3, graine_carotte: 4, fromage_alpage: 1 });
  assertEqual(townSellPrice('lait'), Math.ceil(DATA.OBJETS.lait.prix * DATA.VILLE.MARCHE.VENTE / 100));
  assert(townSellPrice('lait') > DATA.OBJETS.lait.prix, 'plus cher qu\'au marché de la ferme');
  assertEqual(townSellable('graine_carotte'), false, 'pas les graines');
  assertEqual(townSellable('fromage_alpage'), false, 'pas ce qui s\'achète en ville');
  assertEqual(townSellList(s).map((r) => r.item).sort(), ['carotte', 'lait']);
  const avant = s.pieces;
  const r = sellInTown(s, 'lait', 9);
  assertEqual([r.ok, r.sold, r.gain], [true, 5, 5 * townSellPrice('lait')]);
  assertEqual([countItem(s, 'lait'), s.pieces], [0, avant + r.gain]);
  assertEqual(sellInTown(s, 'lait', 1).ok, false, 'plus rien');
  assertEqual(sellInTown(s, 'graine_carotte', 1).ok, false);
});

test('entreprises : achat, quota, production et vente chaque jour à l\'heure', () => {
  const s = garden();
  const def = DATA.VILLE.ENTREPRISES.LISTE.fromagerie;
  s.pieces = def.prix - 1;
  assertEqual(buyCompany(s, 'fromagerie').ok, false, 'pas assez de pièces');
  s.pieces = def.prix + 100;
  s.awakeMs = awakeMsAtHour(8);
  assert(buyCompany(s, 'fromagerie').ok);
  assertEqual([ownsCompany(s, 'fromagerie'), s.pieces], [true, 100]);
  assertEqual(buyCompany(s, 'fromagerie').ok, false, 'une seule fois');
  assertEqual(setCompanyQuota(s, 'fromagerie', 999).quota, def.quotaMax);
  assertEqual(setCompanyQuota(s, 'fromagerie', 3).quota, 3);
  setInv(s, { lait: 7 });
  assertEqual(companyPlan(s, 'fromagerie'), { unites: 3, dispo: 7 });
  assertEqual(companiesStep(s), null, 'pas avant l\'heure');
  s.awakeMs = awakeMsAtHour(DATA.VILLE.ENTREPRISES.HEURE);
  const b = companiesStep(s).fromagerie;
  assertEqual([b.unites, b.gain, b.pris.lait, b.manque], [3, 3 * def.prixProduit, 6, false]);
  assertEqual([countItem(s, 'lait'), s.pieces], [1, 100 + 3 * def.prixProduit]);
  assertEqual(companiesStep(s), null, 'une fois par jour');
  // le lendemain : il manque du lait, elle fait ce qu'elle peut
  s.day += 1;
  setInv(s, { lait: 3 });
  const c = companiesStep(s).fromagerie;
  assertEqual([c.unites, c.manque, countItem(s, 'lait')], [1, true, 1]);
});

test('entreprises : plusieurs intrants, les plus abondants d\'abord ; achetée tard, elle commence le lendemain', () => {
  const s = garden();
  s.pieces = 10000;
  s.awakeMs = awakeMsAtHour(15);
  assert(buyCompany(s, 'confiturerie').ok);
  setInv(s, { pomme: 5, fraise: 2 });
  assertEqual(companiesStep(s), null, 'achetée après l\'heure : pas aujourd\'hui');
  s.day += 1;
  s.awakeMs = awakeMsAtHour(10);
  setCompanyQuota(s, 'confiturerie', 2);
  const b = companiesStep(s).confiturerie;
  assertEqual([b.unites, b.pris.pomme, b.pris.fraise || 0], [2, 5, 1]);
  // la journée qui passe (tick) la fait produire aussi
  s.day += 1;
  setInv(s, { poire: 3 });
  s.awakeMs = awakeMsAtHour(DATA.VILLE.ENTREPRISES.HEURE) - 500;
  tick(s, 1, false);
  assertEqual(s.ville.entreprises.confiturerie.bilan.jour, s.day);
  assertEqual(countItem(s, 'poire'), 0);
});

test('trouvailles de la montagne et de la plage : des objets qui se gardent et se vendent', () => {
  // les identifiants de assets/faune.json (trouvailles), ramassés par FermeHote.ramasser
  const sortes = ['ammonite', 'trilobite', 'quartz', 'amethyste', 'coquille', 'bulot', 'corail', 'perle'];
  const icones = new Set();
  for (const id of sortes) {
    const it = DATA.OBJETS[id];
    assert(it, id);
    assertEqual([it.categorie, it.mangeable, isPerishable(id), isBuyable(id), townSellable(id)], ['produit', false, false, false, true], id);
    icones.add(it.icone);
  }
  assertEqual(icones.size, sortes.length, 'une icône par trouvaille');
  const s = createInitialState();
  addItem(s, 'perle', 2);
  assertEqual(countItem(s, 'perle'), 2);
});
