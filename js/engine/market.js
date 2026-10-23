import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { fail, marcheFerme, marcheOuvert, NO_COINS, pay, percentCeil } from './devices.js';
import { earn } from './compta.js';
import { addLot } from './inventory.js';
import { stockCount, takeStock } from './fridge.js';
import { refreshUnlocks } from './techtree.js';
import { fillSilo } from './animals.js';
import { gainActionXp } from './levels.js';

/* ---------- Lot 3 : Marché ---------- */

// Plancher du coefficient d'achat d'un item (1,2 ; 2,0 pour les graines).
export function marketFloor(item) {
  const P = DATA.MARCHE.PLANCHER;
  const p = P[DATA.OBJETS[item].categorie];
  return p === undefined ? P.defaut : p;
}

// Les coefficients ne sont notés dans state.marche qu'une fois sortis de leur
// plancher : { item: coefficient }.
export function marketCoef(state, item) {
  const c = state.marche ? state.marche[item] : undefined;
  return typeof c === 'number' ? c : marketFloor(item);
}

function setMarketCoef(state, item, coef) {
  if (!state.marche) state.marche = {};
  const c = Math.max(marketFloor(item), Math.round(coef));
  if (c <= marketFloor(item)) delete state.marche[item];
  else state.marche[item] = c;
}

export function isBuyable(item) {
  const def = DATA.OBJETS[item];
  return !!def && def.rachetable !== false && !def.ville; // version 1.5 : « ville » = marché de la ville seulement
}

export function sellPrice(item) {
  return DATA.OBJETS[item].prix;
}

// Prix de la prochaine unité achetée.
export function buyPrice(state, item) {
  return percentCeil(sellPrice(item), marketCoef(state, item));
}

// Devis d'un achat de `qty` unités, sans rien modifier : le prix monte d'un
// pas entre deux unités, et l'on s'arrête quand les pièces manquent.
// Renvoie { quantite, cout } : ce que buyItem(state, item, qty) achèterait.
export function buyQuote(state, item, qty = 1) {
  if (!DATA.OBJETS[item] || !isBuyable(item)) return { quantite: 0, cout: 0 };
  const floor = marketFloor(item);
  let coef = marketCoef(state, item);
  let pieces = state.pieces;
  let quantite = 0;
  let cout = 0;
  for (let i = 0; i < Math.max(0, Math.floor(Number(qty)) || 0); i++) {
    const price = percentCeil(sellPrice(item), coef);
    if (pieces + EPS < price) break;
    pieces -= price;
    cout += price;
    quantite += 1;
    coef = Math.max(floor, Math.round(coef + DATA.MARCHE.PAS));
  }
  return { quantite, cout };
}

// Achète jusqu'à `qty` unités, une par une : le prix monte entre deux unités.
// S'arrête quand les pièces manquent. Un item acheté arrive avec sa
// conservation pleine et l'origine « acheté ». Le blé acheté va au Silo s'il y
// a de la place (il n'y périme pas), le reste dans l'inventaire.
// `ville` : achat au marché de la ville (ville.js, buyInTown), le seul où se vendent les
// objets marqués « ville ».
export function buyItem(state, item, qty = 1, { ville = false } = {}) {
  const def = DATA.OBJETS[item];
  if (!def) return fail('Objet inconnu.');
  if (!ville && !marcheOuvert(state)) return fail(marcheFerme(state));
  if (ville ? !def.ville || def.rachetable === false : !isBuyable(item)) return fail(`${def.nom} ne s'achète pas ici.`);
  let bought = 0;
  let cost = 0;
  for (let i = 0; i < qty; i++) {
    const price = buyPrice(state, item);
    if (!pay(state, price, `${ville ? 'Achat en ville' : 'Achat'} : ${def.nom}`)) break;
    addLot(state, item, 1, DATA.ORIGINE.ACHETE);
    setMarketCoef(state, item, marketCoef(state, item) + DATA.MARCHE.PAS);
    bought += 1;
    cost += price;
  }
  if (bought === 0) return fail(NO_COINS);
  if (item === DATA.SILO.ITEM && state.silo) fillSilo(state);
  return { ok: true, bought, cost };
}

// Quantité vendable d'un item : l'inventaire plus ce qui est rangé au frigo.
export function sellableCount(state, item) {
  return stockCount(state, item);
}

// Vend jusqu'à `qty` unités (les lots les plus anciens d'abord) au prix fixe ;
// chaque unité vendue retire un pas au coefficient, sans passer sous le plancher.
// Les articles rangés au frigo se vendent aussi : on vend d'abord ce qui est
// dans l'inventaire (il périt), puis ce qui est au frais.
// Version 1.12 : le Marché de la ferme ouvre quand le panneau et la pompe sont achetés (sur une
// terre sauvage : à un niveau, devices.js marcheOuvert).
export function sellItem(state, item, qty) {
  const def = DATA.OBJETS[item];
  if (!def) return fail('Objet inconnu.');
  if (def.invendable) return fail(`${def.nom} ne se vend pas : il sert à l'arbre des technologies.`);
  if (!marcheOuvert(state)) return fail(marcheFerme(state));
  const wanted = Math.min(Math.floor(Number(qty)) || 0, Math.floor(sellableCount(state, item) + EPS));
  const n = takeStock(state, item, wanted);
  if (n <= 0) return fail('Rien à vendre.');
  const gain = n * sellPrice(item);
  earn(state, gain, `Vente : ${def.nom}`, n);
  gainActionXp(state, 'vendre', gain); // version 1.7 : 1 XP par pièce gagnée
  setMarketCoef(state, item, marketCoef(state, item) - DATA.MARCHE.PAS * n);
  refreshUnlocks(state);
  return { ok: true, sold: n, gain };
}
