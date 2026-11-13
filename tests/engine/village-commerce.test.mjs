/* ==========================================================================
   Tests du chantier « l'île à bâtir » : le commerce au port (docs/ile.md, fiche I1b). Comme tous les fichiers
   tests/engine/village-*.test.mjs, ils tournent avec VILLAGE.ACTIF forcé à true (tests/engine/aide.mjs).
   Lancer seul : node tests/run-tests.mjs village-commerce
   ========================================================================== */

import {
  acheterAuPort, acheterCaleche, awakeMsAtHour, buyItem, buyPrice, calecheIci, comptoirDuPort, commanderCaleche, commencerObjectifs,
  createNewGame, DATA, deposerMalle, distanceAuComptoir, enVenteAuPort, etalPort, executerCommande, farmSeed, isBuyable, lieuPort,
  marcheFerme, objectiveValue, portDuMonde, portOuvert, sellItem, sellPrice, simulateGame, unlockLevel, vendreAuPort, vendreCaleche,
  chargerPortage,
} from '../../js/engine/index.js';
import { assert, assertEqual, avecVillage, reach, setInv, test } from './aide.mjs';

const P = DATA.PORT;

// (fiche I2, le portage : ce qu'on vend au port, on l'y porte. L'inventaire posé, tout est chargé, sur la ferme.)
function setCharge(s, inv) {
  setInv(s, inv);
  for (const [k, n] of Object.entries(inv)) assert(chargerPortage(s, k, n, null, { sansPresence: true }).ok, `${k} chargé`);
}

// Une partie neuve avec son port (le lieu calculé d'après le plan : portDuMonde), au niveau du commerce (celui de
// l'élément « marche »), à 9 h, et la case devant le comptoir.
function auPort(seed = 'commerce') {
  const s = reach(createNewGame(seed), 'marche');
  portDuMonde(farmSeed(s));
  s.awakeMs = awakeMsAtHour(9);
  const c = comptoirDuPort(s);
  return { s, c, ou: c.devant };
}

test('le comptoir : trois cases sous la halle, la case devant à portée', () => {
  const { s, c, ou } = auPort();
  assert(lieuPort(s) && Number.isInteger(lieuPort(s).case), 'le lieu du port posé');
  assertEqual(c.cases.length, 3, 'trois cases');
  assert(distanceAuComptoir(s, ou) <= P.PORTEE, 'devant le comptoir : à portée');
  assertEqual(portOuvert(s, ou).ok, true, 'ouvert');
});

test('vendre au port : le prix de vente de market.js, les Comptes disent « Port : … », les paliers comptent', () => {
  const { s, ou } = auPort();
  commencerObjectifs(s);
  setCharge(s, { carotte: 5, laine: 2 });
  const avant = s.pieces;
  const r = vendreAuPort(s, 'carotte', 3, ou);
  assert(r.ok, r.error);
  assertEqual(r.sold, 3);
  assertEqual(r.gain, 3 * sellPrice('carotte'), 'le prix de vente');
  assertEqual(s.pieces, avant + r.gain, 'les pièces');
  const l = s.compta[s.compta.length - 1];
  assertEqual(l.libelle, `Port : ${DATA.OBJETS.carotte.nom}`, 'l\'écriture des Comptes');
  assertEqual(l.montant, r.gain);
  assertEqual(s.campagne.compteurs.ventesPort, r.gain, 'les paliers : ventesPort');
  assertEqual(objectiveValue(s, { type: 'ventesPort' }), r.gain, 'l\'objectif du palier');
  assertEqual(objectiveValue(s, { type: 'caleche' }), r.gain, 'l\'objectif de campagne « caleche » compte les ventes au port');
  assert((s.objectifs.faits.vendre || 0) >= r.gain, 'l\'objectif du jour « vendre »');
  assert(vendreAuPort(s, 'laine', 2, ou).ok, 'la laine aussi : tout ce qui se vendait à la calèche');
});

test('acheter au port : le cours des semences de market.js, qui monte ; seulement les semences débloquées', () => {
  const { s, ou } = auPort();
  s.pieces = 1000;
  const p1 = buyPrice(s, 'graine_carotte');
  const r = acheterAuPort(s, 'graine_carotte', 2, ou);
  assert(r.ok, r.error);
  assertEqual(r.bought, 2);
  assert(r.cost >= 2 * p1, 'le cours monte');
  assertEqual(s.compta[s.compta.length - 1].libelle, `Port : ${DATA.OBJETS.graine_carotte.nom}`);
  // (une semence que le niveau n'a pas encore débloquée ; ce qui n'est pas une semence)
  const tard = Object.keys(DATA.OBJETS).find((k) => isBuyable(k) && !enVenteAuPort(s, k));
  assert(tard, 'une semence pas encore débloquée');
  assertEqual(acheterAuPort(s, tard, 1, ou).ok, false, 'refusée');
  assertEqual(acheterAuPort(s, 'carotte', 1, ou).ok, false, 'une carotte ne s\'achète pas');
  assert(etalPort(s).every((o) => enVenteAuPort(s, o.item) && o.prix === buyPrice(s, o.item)), 'l\'étal : les semences en vente, à leur cours');
  // (la même chose qu'acheter au cours de market.js : deux parties pareilles, le même coût)
  const a = auPort().s, b = auPort().s;
  a.pieces = b.pieces = 500;
  const ra = acheterAuPort(a, 'graine_tomate', 5, comptoirDuPort(a).devant), rb = buyItem(b, 'graine_tomate', 5);
  assertEqual(ra.cost, rb.cost, 'le même coût que buyItem');
  assertEqual(a.marche, b.marche, 'les mêmes cours ensuite');
});

test('refus : loin du comptoir, hors des heures, avant le niveau du commerce', () => {
  const { s, c, ou } = auPort();
  setCharge(s, { carotte: 5 });
  const loin = c.devant + 10;
  assert(distanceAuComptoir(s, loin) > P.PORTEE, 'à dix cases');
  const r = vendreAuPort(s, 'carotte', 1, loin);
  assertEqual(r.ok, false, 'loin : refusé');
  assert(/n'es pas au port/.test(r.error) && r.error.includes(`${P.HEURES[0]} h`), 'il dit où est le port et ses heures');
  assertEqual(vendreAuPort(s, 'carotte', 1, null).ok, false, 'sans case : refusé');
  s.awakeMs = awakeMsAtHour(P.HEURES[1]);
  const t = vendreAuPort(s, 'carotte', 1, ou);
  assertEqual(t.ok, false, 'après la fermeture : refusé');
  assert(/fermé/.test(t.error), t.error);
  s.awakeMs = awakeMsAtHour(P.HEURES[1] - 0.5);
  assert(vendreAuPort(s, 'carotte', 1, ou).ok, 'juste avant : vendu');
  const n = createNewGame('commerce');
  portDuMonde(farmSeed(n));
  n.awakeMs = awakeMsAtHour(9);
  setCharge(n, { carotte: 1 });
  const nv = vendreAuPort(n, 'carotte', 1, comptoirDuPort(n).devant);
  assertEqual(nv.ok, false, 'avant le niveau : refusé');
  assertEqual(nv.error, `Le port commerce avec toi à partir du niveau ${unlockLevel('marche')}.`);
  assertEqual(marcheFerme(n), nv.error, 'marcheFerme parle du port');
});

test('les commandes port.vendre et port.acheter', () => {
  const { s, ou } = auPort();
  setCharge(s, { patate: 4 });
  s.pieces = 200;
  const v = executerCommande(s, { id: 'v1', type: 'port.vendre', args: { objet: 'patate', quantite: 4, case: ou } });
  assert(v.ok, v.error);
  assertEqual(v.id, 'v1');
  assertEqual(v.inverses.length, 0, 'sans inverse');
  const a = executerCommande(s, { id: 'a1', type: 'port.acheter', args: { objet: 'graine_carotte', quantite: 1, case: ou } });
  assert(a.ok, a.error);
  assertEqual(executerCommande(s, { type: 'port.vendre', args: { objet: 'patate', quantite: 1 } }).ok, false, 'il faut la case');
});

test('la calèche inerte : elle ne vend ni n\'achète plus, sa malle non plus', () => {
  const { s } = auPort();
  setInv(s, { carotte: 5 });
  s.pieces = 200;
  const avant = JSON.stringify([s.pieces, s.inventaire]);
  for (const r of [
    vendreCaleche(s, 'carotte', 1, null, { sansPresence: true }),
    acheterCaleche(s, 'graine_carotte', 1, null, { sansPresence: true }),
    deposerMalle(s, 'carotte', 1),
    commanderCaleche(s, 'graine_carotte', 1),
  ]) {
    assertEqual(r.ok, false, 'refusé');
    assert(/port/.test(r.error), r.error);
  }
  assertEqual(calecheIci(s, 0).ok, false, 'pas de commerce à côté d\'elle');
  assertEqual(JSON.stringify([s.pieces, s.inventaire]), avant, 'rien n\'a bougé');
});

test('le réglage éteint : pas de port, la calèche et market.js comme avant', () => {
  avecVillage(() => {
    const s = reach(createNewGame('commerce'), 'marche');
    s.awakeMs = awakeMsAtHour(9);
    setInv(s, { carotte: 5 });
    assertEqual(lieuPort(s), null, 'pas de lieu de port');
    assertEqual(vendreAuPort(s, 'carotte', 1, 0, { sansPresence: true }).ok, false, 'pas de vente au port');
    const r = sellItem(s, 'carotte', 1);
    assert(r.ok, r.error);
    assertEqual(s.compta[s.compta.length - 1].libelle, `Vente : ${DATA.OBJETS.carotte.nom}`, 'les Comptes d\'avant');
    s.pieces = 100;
    assert(buyItem(s, 'graine_carotte', 1).ok);
    assertEqual(s.compta[s.compta.length - 1].libelle, `Achat : ${DATA.OBJETS.graine_carotte.nom}`);
    assert(vendreCaleche(s, 'carotte', 1, null, { sansPresence: true }).ok, 'la calèche commerce');
    assertEqual(marcheFerme(s), `La calèche commerce avec toi à partir du niveau ${unlockLevel('marche')}.`);
  }, false);
});

test('le joueur automatique va au port : 25 nuits sans nuit sans repas, des ventes au port, des graines achetées', () => {
  const rows = simulateGame('applique', 25);
  assertEqual(rows.filter((r) => r.couverture <= 0).length, 0, 'aucune nuit sans repas');
  const ventes = rows.filter((r) => (r.gains.vente_cultures || 0) + (r.gains.vente_produits || 0) + (r.gains.vente_autres || 0) > 0);
  assert(ventes.length >= 5, `des jours de vente (${ventes.length})`);
  assert(rows.some((r) => (r.depenses.graines || 0) > 0), 'des graines achetées');
});
