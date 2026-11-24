/* ==========================================================================
   Tests du chantier « l'île à bâtir » : le commerce au port (docs/ile.md, fiche I1b).
   Lancer seul : node tests/run-tests.mjs village-commerce
   ========================================================================== */

import {
  acheterAuPort, awakeMsAtHour, buyItem, buyPrice, comptoirDuPort, commencerObjectifs, createNewGame, DATA,
  distanceAuComptoir, enVenteAuPort, etalPort, executerCommande, farmSeed, isBuyable, lieuPort, marcheFerme,
  objectiveValue, portDuMonde, portOuvert, sellPrice, simulateGame, unlockLevel, vendreAuPort,
} from '../../js/engine/index.js';
import { assert, assertEqual, reach, setInv, test, fonderVillage } from './aide.mjs';

const P = DATA.PORT;


// Une partie neuve avec son port (le lieu calculé d'après le plan : portDuMonde), au niveau du commerce (celui de
// l'élément « marche »), à 9 h, et la case devant le comptoir.
function auPort(seed = 'commerce') {
  const s = reach(createNewGame(seed), 'marche');
  fonderVillage(s);   // (l'île de 300 × 300 : le comptoir du port bâti, le village fondé)
  s.awakeMs = awakeMsAtHour(9);
  const c = comptoirDuPort(s);
  return { s, c, ou: c.devant };
}

// (l'île : le port achète directement ce qu'on a, l'inventaire : plus de chargement à porter)
const garnir = (s, q) => setInv(s, q);

test('le comptoir du port bâti (l\'île) : ses cases, la case devant à portée', () => {
  const { s, c, ou } = auPort();
  assertEqual(c.cases.length, 3, 'ses cases : le comptoir de la halle');
  assert(distanceAuComptoir(s, ou) <= P.PORTEE, 'devant le comptoir : à portée');
  assertEqual(portOuvert(s, ou).ok, true, 'ouvert');
});

test('vendre au port (l’île : ce qu’on a, sans rien porter) : le prix de vente de market.js, les Comptes disent « Port : … », les paliers comptent', () => {
  const { s, ou } = auPort();
  commencerObjectifs(s);
  garnir(s, { carotte: 5, laine: 2 });
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

test('acheter au port : rien sur l\'île (docs/economie.md E4)', () => {
  const { s, ou } = auPort();
  s.pieces = 1000;
  assertEqual(acheterAuPort(s, 'graine_carotte', 2, ou).ok, false);
  assertEqual(etalPort(s), []);
  assertEqual(s.pieces, 1000);
});

test('refus : loin du comptoir, hors des heures, avant le niveau du commerce', () => {
  const { s, c, ou } = auPort();
  garnir(s, { carotte: 5 });
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
  fonderVillage(n);
  n.awakeMs = awakeMsAtHour(9);
  garnir(n, { carotte: 1 });
  const nv = vendreAuPort(n, 'carotte', 1, comptoirDuPort(n).devant);
  assertEqual(nv.ok, false, 'avant le niveau : refusé');
  assertEqual(nv.error, `Le port commerce avec toi à partir du niveau ${unlockLevel('marche')}.`);
  assertEqual(marcheFerme(n), nv.error, 'marcheFerme parle du port');
});

test('les commandes port.vendre et port.acheter', () => {
  const { s, ou } = auPort();
  garnir(s, { patate: 4 });
  s.pieces = 200;
  const v = executerCommande(s, { id: 'v1', type: 'port.vendre', args: { objet: 'patate', quantite: 4, case: ou } });
  assert(v.ok, v.error);
  assertEqual(v.id, 'v1');
  assertEqual(v.inverses.length, 0, 'sans inverse');
  const a = executerCommande(s, { id: 'a1', type: 'port.acheter', args: { objet: 'graine_carotte', quantite: 1, case: ou } });
  assertEqual(a.ok, false, 'l\'île : le port ne vend rien');
  assertEqual(executerCommande(s, { type: 'port.vendre', args: { objet: 'patate', quantite: 1 } }).ok, false, 'il faut la case');
});

test('le joueur automatique va au port : 25 nuits sans nuit sans repas, des ventes au port, ses graines trouvées dans la nature', () => {
  const rows = simulateGame('applique', 25);
  assertEqual(rows.filter((r) => r.couverture <= 0).length, 0, 'aucune nuit sans repas');
  const ventes = rows.filter((r) => (r.gains.vente_cultures || 0) + (r.gains.vente_produits || 0) + (r.gains.vente_autres || 0) > 0);
  assert(ventes.length >= 5, `des jours de vente (${ventes.length})`);
  assert(!rows.some((r) => (r.depenses.graines || 0) > 0), 'pas de graines achetées (l\'île)');
});
