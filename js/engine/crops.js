import { DATA, roundPct } from './catalog.js';
import { EPS, randomInt } from './base.js';
import { fail, farmOpen, spend } from './devices.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { storeWheat, takeWheat, wheatTotal } from './animals.js';
import { techPct, techSum } from './techtree.js';
import { bumpCounter, isUnlocked, noteCropHarvested } from './campaign.js';
import { gainActionXp, levelBlock, levelReached } from './levels.js';
import { canAfford, spendEnergy, TIRED } from './stamina.js';

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

// Toutes les parcelles de la ferme : la Zone de culture d'abord, puis le Champ, puis la Serre.
export function allPlots(state) {
  return [...state.potager.parcelles, ...zone2Plots(state), ...(state.serre ? state.serre.parcelles : [])];
}

/* ---------- version 1.4 : le Champ (deuxième zone de culture) ---------- */

// Parcelles du Champ (state.potager.zone2) : vide tant qu'il n'est pas ouvert. Elles portent
// le lieu de la Zone de culture ('potager') : toutes ses règles s'y appliquent sans rien
// redire (cultures, règles, automatisations). `zone: 2` les distingue pour l'affichage.
export function zone2Plots(state) {
  return state.potager && Array.isArray(state.potager.zone2) ? state.potager.zone2 : [];
}

export function makeZone2Plot(n) {
  return { ...makePlot(n), id: `${DATA.POTAGER.ZONE2.ID}-${n}`, zone: 2 };
}

/* ---------- version 1.9 (v2, lot 5) : la houe ; version 1.15 : sur toute la carte ---------- */

// Version 1.15 : plus de zones fixes. Toute tuile labourable de la carte (DATA.TERRAIN,
// écrit par scripts/carte/terres.py : herbe foncée, hors chemins, eau, bâtiments, pierres,
// arbres, arbustes et zones interdites) peut devenir de la terre. Une parcelle porte le
// numéro de sa tuile (`case` = rangée × LARGEUR + colonne). Les parcelles sont rangées par tuile.
export function terrainSize() {
  return { largeur: DATA.TERRAIN.LARGEUR, hauteur: DATA.TERRAIN.HAUTEUR };
}

export function isArable(tile) {
  const T = DATA.TERRAIN;
  if (!Number.isInteger(tile) || tile < 0 || tile >= T.LARGEUR * T.HAUTEUR) return false;
  return T.LIGNES[Math.floor(tile / T.LARGEUR)][tile % T.LARGEUR] === '#';
}

// Tuile d'une case des anciennes zones (1 : la Zone de culture, 2 : le Champ) : sauvegardes
// d'avant la version 1.15, parcelles de départ, tests.
export function zoneTile(zone, kase) {
  const Z = DATA.TERRAIN.ZONES[zone === 2 ? 2 : 1];
  return (Z.Y + Math.floor(kase / Z.COLONNES)) * DATA.TERRAIN.LARGEUR + Z.X + (kase % Z.COLONNES);
}

// Parcelle (terre) d'une tuile, ou null (herbe).
export function plotAtTile(state, tile) {
  return state.potager.parcelles.find((p) => p.case === tile) || null;
}

// Parcelles de départ d'une partie neuve : les cases DEPART de l'ancienne Zone de culture.
export function startPlots() {
  return DATA.POTAGER.DEPART.map((c, i) => ({ ...makePlot(i + 1), case: zoneTile(1, c) }));
}

// Tuiles de terre de la ferme et plafond du niveau.
export function soilCount(state) {
  return state.potager ? state.potager.parcelles.length + zone2Plots(state).length : 0;
}

export function soilCap(state) {
  const T = DATA.NIVEAUX.TUILES;
  return T[Math.min(T.length, Math.max(1, levelReached(state))) - 1];
}

// Tuiles de plus au niveau suivant (0 au dernier niveau ou si rien ne change).
export function soilCapNext(state) {
  const T = DATA.NIVEAUX.TUILES;
  const n = Math.max(1, levelReached(state));
  return n >= T.length ? 0 : Math.max(0, T[n] - T[n - 1]);
}

export function hasHoe(state) {
  return !!(state.potager && state.potager.houe);
}

// Achat de la houe au Marché (une seule fois).
export function buyHoe(state) {
  if (hasHoe(state)) return fail('Tu as déjà une houe.');
  if (!farmOpen(state)) return fail('La houe s\'achète au Marché, qui ouvre avec le panneau et la pompe.');
  const cost = DATA.HOUE.PRIX;
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  state.potager.houe = true;
  return { ok: true, cost };
}

// Version 1.15 : le Champ n'est plus une zone à part (toutes les terres sont dans
// state.potager.parcelles). Gardé pour les appels existants : toujours fermé.
export function zone2Open() {
  return false;
}

// Ce que fait la houe sur une tuile : { action: 'labourer' | 'reboucher' | null, ok, raison }.
export function hoeStatus(state, tile) {
  const p = Number.isInteger(tile) ? plotAtTile(state, tile) : null;
  if (!p && !isArable(tile)) return { action: null, ok: false, raison: 'On ne laboure ici que l\'herbe : pas les chemins, l\'eau, les pierres, les arbres, ni les abords des bâtiments.' };
  if (!hasHoe(state)) return { action: null, ok: false, raison: `Il te faut une houe (Marché, ${DATA.HOUE.PRIX} 💰).` };
  if (p) {
    if (p.culture) return { action: null, ok: false, raison: 'Terre plantée : récolte d\'abord.' };
    return { action: 'reboucher', ok: true, raison: '' };
  }
  const cap = soilCap(state);
  if (soilCount(state) >= cap) {
    const plus = soilCapNext(state);
    return { action: 'labourer', ok: false, raison: `Plafond atteint : ${cap} tuiles au niveau ${levelReached(state)}.${plus ? ` Niveau suivant : +${plus} tuiles.` : ''}` };
  }
  if (!canAfford(state, 'labourer')) return { action: 'labourer', ok: false, raison: TIRED };
  return { action: 'labourer', ok: true, raison: '' };
}

// Numéro libre pour l'identifiant d'une nouvelle parcelle (« potager-n »).
function nextPlotNumber(list) {
  let n = 0;
  for (const p of list) {
    const m = /^potager-(\d+)$/.exec(p.id);
    if (m) n = Math.max(n, Number(m[1]));
  }
  return n + 1;
}

// Un clic avec la houe : laboure une tuile d'herbe (énergie, XP) ou rebouche une terre
// vide (gratuit). Renvoie { ok, action, plot }.
export function hoe(state, tile) {
  const st = hoeStatus(state, tile);
  if (!st.ok) return fail(st.raison);
  const list = state.potager.parcelles;
  if (st.action === 'reboucher') {
    const i = list.findIndex((p) => p.case === tile);
    const [plot] = list.splice(i, 1);
    return { ok: true, action: 'reboucher', plot };
  }
  const plot = { ...makePlot(nextPlotNumber(list)), case: tile };
  list.push(plot);
  list.sort((a, b) => a.case - b.case);
  spendEnergy(state, 'labourer');
  gainActionXp(state, 'labourer');
  return { ok: true, action: 'labourer', plot };
}

// Version 1.15 : une seule Zone de culture (toutes les terres de la carte).
export function plotZone() {
  return 1;
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

// Graines que rend une parcelle montée en graine : la quantité de la culture + 2 par
// niveau de « Sélection des semences » (carotte : 6, puis 8). Sert à la récolte et au
// calcul de la montée en graine automatique.
export function boltSeedYield(state, culture) {
  return DATA.crops[culture].graines.quantite + 2 * techSum(state, 'grainesBonus');
}

// Rendement d'une récolte : le même au clic et en automatique (version 1.8 : plus
// de productivité), partout et toute l'année (version 1.6 : plus de saisons).
export function harvestYield(state, culture) {
  return DATA.crops[culture].rendement;
}

// Eau d'un arrosage (L entiers) : celle de la culture, arrondie au litre le plus
// proche, 1 L au minimum.
export function waterCostFor(state, culture) {
  // arbre v2 : Arrosage économe et Gestion intelligente de l'eau (en %)
  return Math.max(1, roundPct(DATA.crops[culture].litres, techPct(state, 'eauArrosage')));
}

export function waterCost(state, plot) {
  return waterCostFor(state, plot.culture);
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

// `auto` : semis d'une automatisation (moitié de l'XP, version 1.7).
export function plant(state, plotId, culture, auto = false) {
  const plot = findPlot(state, plotId);
  if (!plot) return fail('Parcelle introuvable.');
  const def = DATA.crops[culture];
  if (!def) return fail('Culture inconnue.');
  if (plot.culture) return fail('Cette parcelle est déjà plantée.');
  if (!def.lieux.includes(plot.lieu)) return fail(`${def.nom} ne se plante pas ici.`);
  if (!auto && !canAfford(state, 'planter')) return fail(TIRED); // version 1.8
  if (takeSeed(state, culture) < 1) return fail(`Pas de graines : ${def.nom}.`);
  plot.culture = culture;
  plot.stade = 0;
  plot.arrose = false;
  plot.montee = false;
  if (!auto) spendEnergy(state, 'planter');
  gainActionXp(state, 'planter', 1, auto);
  if (culture === DATA.SILO.ITEM) bumpCounter(state, 'semisBle', 1); // version 1.12 : chapitre 2
  return { ok: true };
}

// Une fois par nuit et par parcelle ; consomme l'eau du réservoir. `auto` :
// arrosage d'une automatisation (moitié de l'XP, version 1.7).
export function water(state, plotId, auto = false) {
  const plot = findPlot(state, plotId);
  if (!plot) return fail('Parcelle introuvable.');
  if (!plot.culture) return fail('Rien n\'est planté ici.');
  if (plot.arrose) return fail('Déjà arrosée : une fois par nuit.');
  if (isMature(plot)) return fail('Déjà mûre, inutile d\'arroser.');
  const litres = waterCost(state, plot);
  if (state.eauMl < litres * 1000) return fail('Pas assez d\'eau dans le réservoir.');
  if (!auto && !canAfford(state, 'arroser')) return fail(TIRED); // version 1.8
  state.eauMl -= litres * 1000;
  plot.arrose = true;
  if (!auto) spendEnergy(state, 'arroser');
  gainActionXp(state, 'arroser', 1, auto);
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
// (gratuite) ; le clic du joueur coûte de l'énergie (version 1.8).
export function harvest(state, plotId, auto = false) {
  const plot = findPlot(state, plotId);
  if (!plot) return fail('Parcelle introuvable.');
  if (!plot.culture) return fail('Rien à récolter ici.');
  if (!isMature(plot)) return fail('Pas encore mûre.');
  if (!auto && !canAfford(state, 'recolter')) return fail(TIRED); // version 1.8
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
    gain(def.graines.item, boltSeedYield(state, culture));
  } else {
    gain(cropProduct(culture), harvestYield(state, culture));
    noteCropHarvested(state, culture); // version 1.12 : chapitres 1 et 2
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
  if (!auto) spendEnergy(state, 'recolter');
  gainActionXp(state, 'recolter', 1, auto); // version 1.7
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

/* ---------- Lot 8 : Serre ---------- */

// state.serre = { construit, niveau, parcelles }. Mêmes règles que le Potager
// (arrosage, pousse, récolte).

export function serreUpgradeCost(state) {
  return state.serre.niveau >= DATA.LEVEL_MAX ? null : DATA.SERRE.COUT[state.serre.niveau];
}

export function buildSerre(state) {
  const g = state.serre;
  if (g.construit) return fail('La Serre est déjà construite.');
  const lock = levelBlock(state, 'serre'); // version 1.12 : pas avant son niveau
  if (lock) return fail(lock);
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
