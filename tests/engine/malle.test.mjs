/* ==========================================================================
   Tests du moteur : la malle de la calèche (js/engine/caleche.js, « la malle »).
   - déposer ce qu'on veut vendre (de l'inventaire puis du frigo), le reprendre (sa fraîcheur gardée) ;
   - commander quand elle n'est pas là : des semences (payées tout de suite, au cours qui monte), ce que
     porte son coffre (mis de côté) ; annuler (remboursé, le cours et le coffre rendus) ;
   - à son arrivée à la ferme (majCaleche) : la malle vendue au prix de vente, les commandes livrées dans
     la malle, une seule fois ; prendre la livraison ; après une absence, le passage rattrapé.
   Lancer seul : node --test tests/engine/malle.test.mjs (ou node tests/run-tests.mjs malle).
   ========================================================================== */

import { DATA } from '../../js/engine/index.js';
import {
  annulerCommande, CALECHE, commanderCaleche, contenuMalle, deposerMalle, majCaleche, mallePleine, passageMalle,
  prendreLivraison, prixCoffre, reprendreMalle, reprendreTout, tourneeDuMonde,
} from '../../js/engine/caleche.js';
import { buyPrice, marketCoef } from '../../js/engine/market.js';
import { countItem, lotsOf } from '../../js/engine/inventory.js';
import { assert, assertEqual, garden, reach, setInv, test, tireless } from './aide.mjs';

// L'heure `h` du jour en cours (l'éveil commence à 6 h).
const aLHeure = (s, h) => { s.awakeMs = Math.round((h - DATA.TEMPS.HEURE_REVEIL) * DATA.TEMPS.SECONDES_PAR_HEURE * 1000); return s; };

// Une partie au niveau du Marché, sa tournée posée, à 8 h (la calèche pas encore passée à la ferme).
function partie() {
  const s = reach(garden(), 'marche');
  s.carte.graine = '1';
  tireless(s);
  tourneeDuMonde('1');
  aLHeure(s, 8);
  majCaleche(s);
  return s;
}

test('déposer, reprendre : de l\'inventaire à la malle et retour, la fraîcheur gardée', () => {
  const s = partie();
  setInv(s, { carotte: 10 });
  const avant = JSON.parse(JSON.stringify(lotsOf(s, 'carotte')));
  assert(!mallePleine(s), 'vide au départ');
  const r = deposerMalle(s, 'carotte', 6);
  assertEqual([r.ok, r.n, countItem(s, 'carotte')], [true, 6, 4]);
  assert(mallePleine(s), 'pleine');
  const c = contenuMalle(s);
  assertEqual([c.vente, c.valeur], [{ carotte: 6 }, 6 * DATA.OBJETS.carotte.prix]);
  assert(!deposerMalle(s, 'carotte', 0).ok && !deposerMalle(s, 'tomate', 1).ok, 'rien à déposer');
  assertEqual(deposerMalle(s, 'carotte', 99).n, 4, 'au plus ce qu\'on a');
  assertEqual(reprendreMalle(s, 'carotte', 3).n, 3);
  assertEqual([countItem(s, 'carotte'), contenuMalle(s).vente.carotte], [3, 7]);
  assertEqual(reprendreTout(s), 7);
  assertEqual(JSON.parse(JSON.stringify(lotsOf(s, 'carotte'))), avant, 'les mêmes lots qu\'avant');
  assert(!mallePleine(s), 'vide à nouveau');
});

test('le passage : à son arrivée à la ferme, la malle vendue au prix de vente, une seule fois', () => {
  const s = partie();
  setInv(s, { carotte: 10, oeuf: 4 });
  const pieces = s.pieces;
  deposerMalle(s, 'carotte', 10);
  deposerMalle(s, 'oeuf', 4);
  const gain = 10 * DATA.OBJETS.carotte.prix + 4 * DATA.OBJETS.oeuf.prix;
  aLHeure(s, CALECHE.FERME - 0.2);
  assertEqual(majCaleche(s).filter((f) => f.malle).length, 0, 'pas avant son arrivée');
  aLHeure(s, CALECHE.FERME + 0.1);
  const faits = majCaleche(s).filter((f) => f.malle);
  assertEqual(faits.length, 1, 'à son arrivée');
  assertEqual(faits[0].malle.vendu, { carotte: 10, oeuf: 4 });
  assertEqual([faits[0].malle.gain, s.pieces - pieces], [gain, gain], 'payé au prix de vente');
  assert(!mallePleine(s), 'la malle vidée');
  assert(s.campagne.compteurs.calecheVentes >= gain, 'compté comme une vente à la calèche');
  assertEqual(majCaleche(s).filter((f) => f.malle).length, 0, 'pas deux fois');
  // déposé après son passage : vendu le lendemain
  setInv(s, { carotte: 2 });
  deposerMalle(s, 'carotte', 2);
  aLHeure(s, CALECHE.FERME + 0.8);
  assertEqual(majCaleche(s).filter((f) => f.malle).length, 0, 'pas le jour même');
  s.day += 1;
  aLHeure(s, CALECHE.FERME + 0.5);
  assertEqual(majCaleche(s).filter((f) => f.malle).map((f) => f.malle.vendu), [{ carotte: 2 }], 'le lendemain');
});

test('commander des semences : payé tout de suite au cours qui monte ; annuler rend tout', () => {
  const s = partie();
  s.pieces = 1000;
  const graine = Object.keys(DATA.OBJETS).find((k) => buyPrice(s, k) > 0 && DATA.OBJETS[k].categorie === 'graine');
  const coef = marketCoef(s, graine), p0 = buyPrice(s, graine), stock = countItem(s, graine);
  const r = commanderCaleche(s, graine, 5);
  assertEqual([r.ok, r.bought], [true, 5]);
  assert(r.cost >= 5 * p0 && s.pieces === 1000 - r.cost, 'payé tout de suite');
  assert(marketCoef(s, graine) > coef, 'le cours monte comme un achat');
  assertEqual(countItem(s, graine), stock, 'rien reçu encore');
  assertEqual(contenuMalle(s).commande, { [graine]: 5 });
  assertEqual(annulerCommande(s), r.cost, 'remboursé');
  assertEqual([s.pieces, marketCoef(s, graine), Object.keys(contenuMalle(s).commande).length], [1000, coef, 0], 'le cours rendu');
  s.pieces = 0;
  assert(!commanderCaleche(s, graine, 1).ok, 'sans pièces, pas de commande');
});

test('commander au coffre : mis de côté ; livré dans la malle à son passage ; prendre la livraison', () => {
  const s = partie();
  s.caleche.coffre = { bois: 10 };
  s.pieces = 1000;
  const r = commanderCaleche(s, 'bois', 4);
  assertEqual([r.ok, r.bought, r.cost, s.caleche.coffre.bois], [true, 4, 4 * prixCoffre('bois'), 6], 'mis de côté');
  assertEqual(commanderCaleche(s, 'bois', 99).bought, 6, 'au plus ce qu\'elle porte');
  assertEqual(s.caleche.coffre.bois, undefined);
  assert(!commanderCaleche(s, 'bois', 1).ok, 'plus rien à commander');
  assertEqual(annulerCommande(s, 'bois'), 10 * prixCoffre('bois'));
  assertEqual(s.caleche.coffre.bois, 10, 'rendu à son coffre');
  commanderCaleche(s, 'bois', 3);
  const bois = countItem(s, 'bois');
  aLHeure(s, CALECHE.FERME + 0.1);
  const f = majCaleche(s).find((x) => x.malle);
  assertEqual(f.malle.livre, { bois: 3 }, 'livré');
  assertEqual([contenuMalle(s).livre, contenuMalle(s).commande], [{ bois: 3 }, {}]);
  assert(mallePleine(s), 'la malle montre la livraison');
  assertEqual(countItem(s, 'bois'), bois, 'pas encore pris');
  assertEqual(prendreLivraison(s), 3);
  assertEqual([countItem(s, 'bois') - bois, mallePleine(s)], [3, false]);
});

test('après une absence : le passage rattrapé à l\'ouverture', () => {
  const s = partie();
  setInv(s, { carotte: 5 });
  deposerMalle(s, 'carotte', 5);
  s.day += 3;
  aLHeure(s, 7);
  const faits = majCaleche(s).filter((f) => f.malle);
  assertEqual(faits.length, 1, 'vendue au premier passage');
  assertEqual(faits[0].malle.vendu, { carotte: 5 });
  assertEqual(passageMalle(s), null, 'plus rien à faire');
});
