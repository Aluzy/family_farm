import { DATA, roundPct } from './catalog.js';
import { EPS, randomInt } from './base.js';
import { waterSeasonFactor, yieldSeasonFactor } from './seasons.js';
import { fail, spend } from './devices.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { productivity } from './family.js';
import { storeWheat, takeWheat, wheatTotal } from './animals.js';
import { techPct, techSum } from './techtree.js';
import { bumpCounter } from './campaign.js';

/* ---------- Lot 2 : Zone de culture (identifiant interne : potager) ---------- */

export function makePlot(n, lieu = DATA.POTAGER.LIEU) {
  // Lot 7 : semis = réglage du semis automatique de la parcelle ('meme' : même
  // culture que la récolte, 'verrou' : toujours `verrou`, 'off' : désactivé).
  return { id: `${lieu}-${n}`, lieu, culture: null, stade: 0, arrose: false, montee: false, semis: 'meme', verrou: null };
}

export function makePlots(count, lieu = DATA.POTAGER.LIEU) {
  const plots = [];
  for (let i = 1; i <= count; i++) plots.push(makePlot(i, lieu));
  return plots;
}

// Toutes les parcelles de la ferme : la Zone de culture d'abord, puis la Serre.
export function allPlots(state) {
  return [...state.potager.parcelles, ...(state.serre ? state.serre.parcelles : [])];
}

export function findPlot(state, id) {
  return allPlots(state).find((p) => p.id === id) || null;
}

export function seedItem(culture) {
  return DATA.crops[culture].graines.item;
}

// Objet que rend la récolte : le nom de la culture, sauf `produit` (tournesol).
export function cropProduct(culture) {
  return DATA.crops[culture].produit || culture;
}

// Un item apparaît dans l'onglet Graines du Marché (et donc dans la liste
// filtrée par seedForSale) s'il est de catégorie « graine », ou si c'est le
// blé. Le blé garde sa catégorie « ingrédient » (prix, plancher de marché,
// conservation et origine inchangés : voir DATA.items.ble et DATA.MARCHE) car
// il reste avant tout la ressource du Silo, de l'alimentation des poules et
// du Moulin ; ce test l'ajoute simplement à l'onglet Graines en plus, sans
// rien retirer à sa présence dans l'onglet Acheter. On ne généralise pas ce
// cas à toute culture en mode « plant » (ex. la patate) : seul le blé est
// concerné par cette règle.
export function isGraineComptoir(item) {
  return DATA.items[item].category === 'graine' || item === DATA.SILO.ITEM;
}

// Graines disponibles pour semer une culture. Le blé sert de graine : celui de
// l'inventaire et celui du Silo comptent tous les deux.
export function seedStock(state, culture) {
  const item = seedItem(culture);
  return item === DATA.SILO.ITEM ? wheatTotal(state) : countItem(state, item);
}

// Retire une graine. Le blé se prend d'abord dans l'inventaire (le Silo reste
// pour les poules), puis dans le Silo.
export function takeSeed(state, culture) {
  const item = seedItem(culture);
  if (item === DATA.SILO.ITEM) return takeWheat(state, 1, 'inventaire') ? 1 : 0;
  return takeItem(state, item, 1);
}

export function plantableCrops(lieu) {
  return Object.keys(DATA.crops).filter((c) => DATA.crops[c].lieux.includes(lieu));
}

// Dernier stade d'une plante : la montée en graine de la carotte en ajoute.
export function maxStage(plot) {
  const def = DATA.crops[plot.culture];
  return def.stades + (plot.montee ? def.graines.stadesSupp : 0);
}

export function isMature(plot) {
  return !!plot.culture && plot.stade >= maxStage(plot);
}

// Rendement d'une récolte au clic (× productivité) ou automatique (× 1).
// Lot 8 : avec `lieu`, le facteur de saison du lieu s'y applique (Zone de culture,
// quelle que soit la culture ; jamais la Serre).
export function harvestYield(state, culture, auto = false, lieu = null) {
  const saison = lieu ? yieldSeasonFactor(state, lieu) : 100;
  const prod = auto ? 100 : productivity(state);
  return Math.floor((DATA.crops[culture].rendement * prod * saison + 5000) / 10000);
}

// Eau d'un arrosage (L entiers) : celle de la culture × le facteur d'eau de la
// saison (sauf en Serre), arrondie au litre le plus proche, 1 L au minimum.
export function waterCostFor(state, culture, lieu) {
  // arbre v2 : Arrosage économe et Gestion intelligente de l'eau (en %)
  const pct = (waterSeasonFactor(state, lieu) * techPct(state, 'eauArrosage')) / 100;
  return Math.max(1, roundPct(DATA.crops[culture].litres, pct));
}

export function waterCost(state, plot) {
  return waterCostFor(state, plot.culture, plot.lieu);
}

// Parcelles mûres regroupées par culture et par mode : [{ culture, nombre, montee }].
export function readyCrops(state) {
  const out = [];
  for (const p of allPlots(state)) {
    if (!isMature(p)) continue;
    let e = out.find((x) => x.culture === p.culture && x.montee === p.montee);
    if (!e) {
      e = { culture: p.culture, nombre: 0, montee: p.montee };
      out.push(e);
    }
    e.nombre += 1;
  }
  return out;
}

export function plant(state, plotId, culture) {
  const plot = findPlot(state, plotId);
  if (!plot) return fail('Parcelle introuvable.');
  const def = DATA.crops[culture];
  if (!def) return fail('Culture inconnue.');
  if (plot.culture) return fail('Cette parcelle est déjà plantée.');
  if (!def.lieux.includes(plot.lieu)) return fail(`${def.nom} ne se plante pas ici.`);
  if (takeSeed(state, culture) < 1) return fail(`Pas de graines : ${def.nom}.`);
  plot.culture = culture;
  plot.stade = 0;
  plot.arrose = false;
  plot.montee = false;
  return { ok: true };
}

// Une fois par nuit et par parcelle ; consomme l'eau du réservoir.
export function water(state, plotId) {
  const plot = findPlot(state, plotId);
  if (!plot) return fail('Parcelle introuvable.');
  if (!plot.culture) return fail('Rien n\'est planté ici.');
  if (plot.arrose) return fail('Déjà arrosée : une fois par nuit.');
  if (isMature(plot)) return fail('Déjà mûre, inutile d\'arroser.');
  const litres = waterCost(state, plot);
  if (state.eauMl < litres * 1000) return fail('Pas assez d\'eau dans le réservoir.');
  state.eauMl -= litres * 1000;
  plot.arrose = true;
  return { ok: true, litres };
}

// Carotte seulement, et seulement une fois mûre : elle reste alors 2 stades de
// plus et rend des graines au lieu de carottes. Rebasculer annule.
export function toggleBolting(state, plotId) {
  const plot = findPlot(state, plotId);
  if (!plot) return fail('Parcelle introuvable.');
  if (!plot.culture) return fail('Rien n\'est planté ici.');
  const def = DATA.crops[plot.culture];
  if (def.graines.mode !== 'montee') return fail(`${def.nom} ne monte pas en graine.`);
  if (plot.stade < def.stades) return fail('Pas encore mûre.');
  plot.montee = !plot.montee;
  return { ok: true, montee: plot.montee };
}

// Récolte : la parcelle est libérée. `auto` = true pour une automatisation
// (non pénalisée par la santé) ; le clic du joueur applique la productivité.
export function harvest(state, plotId, auto = false) {
  const plot = findPlot(state, plotId);
  if (!plot) return fail('Parcelle introuvable.');
  if (!plot.culture) return fail('Rien à récolter ici.');
  if (!isMature(plot)) return fail('Pas encore mûre.');
  const culture = plot.culture;
  const def = DATA.crops[culture];
  const items = {};
  const gain = (item, qty) => {
    if (qty > 0) {
      // Le blé récolté va d'abord au Silo, le surplus dans l'inventaire.
      if (item === DATA.SILO.ITEM) storeWheat(state, qty);
      else addItem(state, item, qty);
      items[item] = (items[item] || 0) + qty;
    }
  };
  if (plot.montee) {
    gain(def.graines.item, def.graines.quantite + 2 * techSum(state, 'grainesBonus'));
  } else {
    gain(cropProduct(culture), harvestYield(state, culture, auto, plot.lieu));
    if (def.graines.mode === 'recolte') {
      const bonus = techSum(state, 'grainesBonus'); // arbre v2 : Sélection des semences
      gain(def.graines.item, randomInt(state, def.graines.min + bonus, def.graines.max + bonus));
    }
  }
  plot.culture = null;
  plot.stade = 0;
  plot.arrose = false;
  plot.montee = false;
  if (items.carotte) bumpCounter(state, 'carottes', items.carotte); // Lot 9 (une carotte montée en graine ne compte pas)
  return { ok: true, culture, items };
}

// Deuxième étape nocturne : +1 stade si la parcelle a été arrosée (jusqu'au
// dernier stade), puis remise à zéro de l'arrosage.
export function growAll(state) {
  for (const p of allPlots(state)) {
    if (!p.culture) {
      p.arrose = false;
      continue;
    }
    if (p.arrose && p.stade < maxStage(p)) p.stade += 1;
    p.arrose = false;
  }
}

export function potagerUpgradeCost(state) {
  return state.potager.niveau >= DATA.LEVEL_MAX ? null : DATA.POTAGER.COUT[state.potager.niveau];
}

export function upgradePotager(state) {
  const cost = potagerUpgradeCost(state);
  if (cost === null) return fail('Niveau maximum atteint.');
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  state.potager.niveau += 1;
  const target = DATA.POTAGER.PARCELLES[state.potager.niveau - 1];
  for (let n = state.potager.parcelles.length + 1; n <= target; n++) state.potager.parcelles.push(makePlot(n));
  return { ok: true, cost };
}

/* ---------- Lot 8 : Serre ---------- */

// state.serre = { construit, niveau, parcelles }. Mêmes règles que le Potager
// (arrosage, pousse, récolte), sans aucun modificateur de saison.

export function serreUpgradeCost(state) {
  return state.serre.niveau >= DATA.LEVEL_MAX ? null : DATA.SERRE.COUT[state.serre.niveau];
}

export function buildSerre(state) {
  const g = state.serre;
  if (g.construit) return fail('La Serre est déjà construite.');
  const cost = DATA.SERRE.CONSTRUCTION;
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  openSerre(state);
  return { ok: true, cost };
}

// Pose la Serre au niveau 1 (sans payer) et crée ses parcelles.
export function openSerre(state) {
  const g = state.serre;
  g.construit = true;
  g.niveau = 1;
  g.parcelles = makePlots(DATA.SERRE.PARCELLES[0], DATA.SERRE.LIEU);
}

export function upgradeSerre(state) {
  const g = state.serre;
  if (!g.construit) return fail('Construis d\'abord la Serre.');
  const cost = serreUpgradeCost(state);
  if (cost === null) return fail('Niveau maximum atteint.');
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  g.niveau += 1;
  const target = DATA.SERRE.PARCELLES[g.niveau - 1];
  for (let n = g.parcelles.length + 1; n <= target; n++) g.parcelles.push(makePlot(n, DATA.SERRE.LIEU));
  return { ok: true, cost };
}
