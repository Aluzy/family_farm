import { DATA, dishPrice, ingredientOptions } from './catalog.js';
import { EPS } from './base.js';
import { isBroken, upgradeCost, upgradeDevice } from './devices.js';
import { awakeRequired } from './clock.js';
import { tick } from './energy.js';
import { countItem, expiringSoon, inventoryCounts, isFridgeable } from './inventory.js';
import { buildFridge, fridgeCount, moveFromFridge, moveToFridge } from './fridge.js';
import { buyItem, buyPrice, isBuyable, sellItem } from './market.js';
import { planMeal, rawAverageHealth } from './family.js';
import {
  allPlots, buildSerre, cropProduct, harvest, isMature, plant, potagerUpgradeCost, seedItem, seedStock,
  serreUpgradeCost, toggleBolting, upgradePotager, upgradeSerre, water,
} from './crops.js';
import {
  animalPrice, buildPaturage, buildPoulailler, buildSilo, buyAnimal, buyPasture, buySheep, canFeedHen,
  coopCapacity, coopUpgradeCost, feedAllHens, freeSheepPlaces, hensToFeed, pastureCost, shear, sheepCount,
  siloUpgradeCost, strawNeed, strawStock, upgradePoulailler, upgradeSilo, wheatTotal, woolReady,
} from './animals.js';
import { buildVerger, buyOrchardSlot, buyTree, orchardFree, orchardSlotPrice } from './orchard.js';
import { buildStation, millPending, recipeUnlocked, startMilling, startRecipe } from './kitchen.js';
import { buyTech, hasTech, techPoints, techStatus } from './techtree.js';
import {
  chapterCount, chapterReached, cropUnlocked, isUnlocked, objectiveChapter, objectiveDef, plantableCropsFor,
} from './campaign.js';
import { sleep } from './night.js';
import { createInitialState } from './state.js';
import { botHeal, botInfraInfo, botMaintenance } from './format.js';

/* ---------- cultures ---------- */

// Énergie rendue par une parcelle et par nuit (critère de choix des légumes).
export function botCropScore(culture) {
  const c = DATA.crops[culture];
  const item = DATA.items[cropProduct(culture)];
  return ((item.energie || 0) * c.rendement) / c.stades;
}

// Achète une unité de graine si le prix reste raisonnable ; renvoie true si elle est là.
export function botBuySeed(state, item) {
  if (!isBuyable(item)) return false;
  const price = buyPrice(state, item);
  if (price > DATA.SIMULATION.PRIX_GRAINE_MAX + EPS || state.pieces + EPS < price) return false;
  return buyItem(state, item, 1).ok === true;
}

export function botHasSeed(state, culture) {
  return seedStock(state, culture) >= 1 - EPS || botBuySeed(state, seedItem(culture));
}

// Vrai tant que l'objectif « carottes récoltées » du chapitre en cours n'est pas
// couvert par les récoltes faites et les carottes déjà en terre.
export function botWantsCarrots(state) {
  const obj = objectiveDef('carottes');
  if (!obj || chapterReached(state) > objectiveChapter('carottes')) return false;
  const inGround = allPlots(state).filter((p) => p.culture === 'carotte' && !p.montee).length * DATA.crops.carotte.rendement;
  return state.campagne.compteurs.carottes + inGround < obj.cible;
}

// Une culture de plein champ (blé, tournesol, riz, houblon).
export function botIsFieldCrop(culture) {
  return !!DATA.crops[culture].pleinChamp;
}

// Parcelles de la Zone de culture que le joueur réserve au plein champ (blé et
// tournesol) : PART_PLEIN_CHAMP % de la zone une fois le blé plantable (niveau
// atteint et Silo construit), 0 avant.
export function botFieldTarget(state) {
  if (!cropUnlocked(state, 'ble')) return 0;
  return Math.floor((state.potager.parcelles.length * DATA.SIMULATION.PART_PLEIN_CHAMP) / 100);
}

// Culture à planter sur une parcelle vide, ou null.
export function botPickCrop(state, plot) {
  const S = DATA.SIMULATION;
  const options = plantableCropsFor(state, plot.lieu);
  if (plot.lieu === DATA.POTAGER.LIEU) {
    // Tant que la part de plein champ n'est pas atteinte : du blé (pour les poules
    // et la farine), et un peu de tournesol quand la Presse existe.
    const zone = state.potager.parcelles;
    const field = zone.filter((p) => p.culture && botIsFieldCrop(p.culture)).length;
    if (field < botFieldTarget(state)) {
      const sun = zone.filter((p) => p.culture === 'tournesol').length;
      const wanted = state.stations.presse.construit && sun < S.PARCELLES_TOURNESOL ? ['tournesol', 'ble'] : ['ble'];
      const culture = wanted.find((c) => options.includes(c) && botHasSeed(state, c));
      if (culture) return culture;
    }
  }
  // Le reste de la zone (et la Serre) nourrit la famille : les légumes, pas le plein champ.
  const foods = options.filter((c) => !botIsFieldCrop(c) && DATA.items[cropProduct(c)].edible).sort((a, b) => botCropScore(b) - botCropScore(a));
  // l'objectif du chapitre 2 demande des carottes : elles passent devant
  if (botWantsCarrots(state)) foods.sort((a, b) => (b === 'carotte') - (a === 'carotte'));
  return foods.find((c) => botHasSeed(state, c)) || null;
}

// Récolte, replante, arrose. Une carotte mûre monte en graine quand la réserve
// de graines de carotte descend sous la cible.
export function botFarm(state) {
  const S = DATA.SIMULATION;
  for (const p of allPlots(state)) {
    if (p.culture === 'carotte' && !p.montee && p.stade >= DATA.crops.carotte.stades) {
      const bolting = allPlots(state).filter((x) => x.culture === 'carotte' && x.montee).length;
      const seeds = seedStock(state, 'carotte') + bolting * DATA.crops.carotte.graines.quantite;
      if (seeds < S.GRAINES_CAROTTE) toggleBolting(state, p.id);
    }
    if (isMature(p)) harvest(state, p.id);
    if (!p.culture) {
      // On étale les semis sur plusieurs jours : une ferme plantée d'un coup est
      // récoltée d'un coup, et la famille jeûne entre deux récoltes.
      const lieu = allPlots(state).filter((x) => x.lieu === p.lieu);
      const fresh = lieu.filter((x) => x.culture && x.stade === 0).length;
      if (fresh >= Math.max(1, Math.ceil(lieu.length / S.ETALEMENT_JOURS))) continue;
      const culture = botPickCrop(state, p);
      if (culture) plant(state, p.id, culture);
    }
  }
  const thirsty = allPlots(state).filter((p) => p.culture && !p.arrose && !isMature(p));
  thirsty.sort((a, b) => b.stade - a.stade);
  for (const p of thirsty) water(state, p.id);
}

/* ---------- animaux ---------- */

export function botHens(state) {
  const p = state.poulailler;
  if (!p.construit || p.poules <= 0) return;
  // pas de blé pour les poules : un dépannage au Marché, comme pour les graines
  while (hensToFeed(state) > 0 && !canFeedHen(state) && botBuySeed(state, DATA.SILO.ITEM)) {
    if (canFeedHen(state)) break;
  }
  for (let i = 0; i < p.poules + 3 && hensToFeed(state) > 0; i++) {
    if (!feedAllHens(state).ok) break;
  }
}

// Tond les moutons dont la laine est prête.
export function botSheep(state) {
  const p = state.paturage;
  if (!p.construit) return;
  for (const m of p.moutons) {
    if (woolReady(m)) shear(state, m.id);
  }
}

// Le Moulin : il moud de quoi garder un peu de farine et, surtout, de la
// paille d'avance pour les moutons et les vaches (PAILLE_NUITS nuits). Le blé
// des poules et des semis reste de côté, sauf pour la paille de ce soir : des
// animaux sans paille ne donnent ni laine ni lait. S'il manque encore du blé
// pour cette paille-là, un dépannage au Marché (comme pour les poules).
export function botMill(state) {
  const S = DATA.SIMULATION;
  const st = state.stations.moulin;
  if (!st.construit) return;
  const d = st.appareil;
  if (d && (!d.allume || isBroken(d))) return;
  const enCours = millPending(state);
  const besoin = strawNeed(state);
  const farine = S.STOCK_FARINE - countItem(state, 'farine') - enCours;
  const paille = besoin * S.PAILLE_NUITS - strawStock(state) - enCours;
  const ceSoir = besoin - strawStock(state) - enCours;
  const voulu = Math.max(farine, paille, 0);
  if (voulu < 1) return;
  let libre = Math.max(0, wheatTotal(state) - botWheatKept(state));
  if (ceSoir > libre) {
    // la paille de ce soir passe avant la réserve de blé
    while (wheatTotal(state) < ceSoir && botBuySeed(state, DATA.SILO.ITEM)) { /* un blé de plus */ }
    libre = Math.max(libre, Math.min(ceSoir, wheatTotal(state)));
  }
  const n = Math.min(voulu, libre);
  if (n >= 1) startMilling(state, n);
}

/* ---------- cuisine ---------- */

// Unités disponibles d'un ingrédient (inventaire et frigo), sans la réserve de semences.
export function botSpare(state, item) {
  if (item === DATA.SILO.ITEM) return wheatTotal(state);
  const reserve = state.famille.reserve[item] || 0;
  return countItem(state, item) + fridgeCount(state, item) - reserve;
}

// Option retenue pour un ingrédient (celle dont il reste assez), ou null.
export function botIngredient(state, ing) {
  return ingredientOptions(ing).find((item) => botSpare(state, item) + EPS >= ing.qte) || null;
}

// Intérêt d'une recette : gain en pièces par seconde de préparation, ou 0 si elle ne vaut pas le coup.
export function botRecipeValue(state, id) {
  const S = DATA.SIMULATION;
  const r = DATA.recipes[id];
  if (r.horsLivre) return 0; // le blé se moud au Moulin : voir botMill()
  if (!recipeUnlocked(state, id)) return 0; // arbre v2 : recette encore verrouillée
  if (r.eau && state.eauMl < r.eau * 1000) return 0;
  const items = r.ingredients.map((ing) => botIngredient(state, ing));
  if (items.some((i) => i === null)) return 0;
  if (r.transformation) {
    if (r.sortie === 'huile') {
      const spare = countItem(state, 'graine_tournesol') - S.PARCELLES_TOURNESOL;
      return countItem(state, 'huile') < S.STOCK_HUILE && spare >= r.ingredients[0].qte ? 1 / r.temps : 0;
    }
    return 0;
  }
  let cost = (r.eau || 0) * DATA.RECETTES.PRIX_EAU;
  r.ingredients.forEach((ing, i) => { cost += DATA.items[items[i]].prix * ing.qte; });
  const gain = dishPrice(id) - cost;
  return gain > 0 ? gain / r.temps : 0;
}

// Blé à ne pas moudre : les semis de plein champ et trois nuits de poules.
export function botWheatKept(state) {
  const S = DATA.SIMULATION;
  const hens = Math.ceil(state.poulailler.poules / DATA.ANIMAUX.poule.poulesParBle) * S.BLE_JOURS_GARDES;
  return hens + botFieldTarget(state);
}

// Sort du frigo ce qu'il faut pour une recette, puis la lance.
export function botStartRecipe(state, id) {
  const r = DATA.recipes[id];
  r.ingredients.forEach((ing) => {
    const item = botIngredient(state, ing);
    const missing = ing.qte - countItem(state, item);
    if (item !== DATA.SILO.ITEM && missing > 0) moveFromFridge(state, item, missing);
  });
  return startRecipe(state, id).ok === true;
}

export function botCook(state) {
  if (!state.stations) return;
  for (const station of Object.keys(DATA.STATIONS)) {
    const st = state.stations[station];
    if (!st.construit || st.tache) continue;
    let best = null;
    for (const id of Object.keys(DATA.recipes)) {
      if (DATA.recipes[id].station !== station) continue;
      const v = botRecipeValue(state, id);
      if (v > 0 && (!best || v > best.v)) best = { id, v };
    }
    if (best) botStartRecipe(state, best.id);
  }
}

/* ---------- achats ---------- */

// Ce qu'il reste à faire pour une étape du plan : { done }, { locked } ou { cost, buy }.
export function botStepInfo(state, step, eveilS) {
  const built = (b) => b.construit && b.niveau >= step.niveau;
  switch (step.type) {
    case 'infra':
      return botInfraInfo(state, eveilS);
    case 'potager':
      return state.potager.niveau >= step.niveau ? { done: true } : { cost: potagerUpgradeCost(state), buy: () => upgradePotager(state) };
    case 'silo':
      if (!isUnlocked(state, 'silo')) return { locked: true };
      if (built(state.silo)) return { done: true };
      return state.silo.construit ? { cost: siloUpgradeCost(state), buy: () => upgradeSilo(state) } : { cost: DATA.SILO.CONSTRUCTION, buy: () => buildSilo(state) };
    case 'poulailler':
      if (!isUnlocked(state, 'poulailler')) return { locked: true };
      if (built(state.poulailler)) return { done: true };
      return state.poulailler.construit ? { cost: coopUpgradeCost(state), buy: () => upgradePoulailler(state) } : { cost: DATA.POULAILLER.CONSTRUCTION, buy: () => buildPoulailler(state) };
    case 'poules': {
      if (!isUnlocked(state, 'poulailler')) return { locked: true };
      const p = state.poulailler;
      if (p.poules >= step.n) return { done: true };
      if (!p.construit) return { cost: DATA.POULAILLER.CONSTRUCTION, buy: () => buildPoulailler(state) };
      if (p.poules >= coopCapacity(state)) return { cost: coopUpgradeCost(state), buy: () => upgradePoulailler(state) };
      return { cost: animalPrice('poule'), buy: () => buyAnimal(state, 'poule') };
    }
    case 'station': {
      const def = DATA.STATIONS[step.id];
      if (!isUnlocked(state, step.id)) return { locked: true };
      if (state.stations[step.id].construit) return { done: true };
      if (def.requiert && !state.stations[def.requiert].construit) return { locked: true };
      return { cost: def.cout, buy: () => buildStation(state, step.id) };
    }
    case 'paturage':
      if (!isUnlocked(state, 'paturage')) return { locked: true };
      return state.paturage.construit ? { done: true } : { cost: DATA.PATURAGE.deblocage, buy: () => buildPaturage(state) };
    case 'moutons': {
      if (!isUnlocked(state, 'moutons')) return { locked: true };
      const p = state.paturage;
      if (!p.construit) return { cost: DATA.PATURAGE.deblocage, buy: () => buildPaturage(state) };
      if (sheepCount(state) >= step.n) return { done: true };
      if (freeSheepPlaces(state) <= 0) return { cost: pastureCost(state), buy: () => buyPasture(state) };
      return { cost: animalPrice('mouton'), buy: () => buySheep(state) };
    }
    case 'serre':
      if (!isUnlocked(state, 'serre')) return { locked: true };
      if (built(state.serre)) return { done: true };
      return state.serre.construit ? { cost: serreUpgradeCost(state), buy: () => upgradeSerre(state) } : { cost: DATA.SERRE.CONSTRUCTION, buy: () => buildSerre(state) };
    case 'verger':
      if (!isUnlocked(state, 'verger')) return { locked: true };
      return state.verger.construit ? { done: true } : { cost: DATA.VERGER.CONSTRUCTION, buy: () => buildVerger(state) };
    case 'arbres': {
      if (!isUnlocked(state, 'verger')) return { locked: true };
      const v = state.verger;
      if (!v.construit) return { cost: DATA.VERGER.CONSTRUCTION, buy: () => buildVerger(state) };
      if (v.arbres.length >= step.n) return { done: true };
      if (orchardFree(state) <= 0) return { cost: orchardSlotPrice(state), buy: () => buyOrchardSlot(state) };
      const espece = Object.keys(DATA.VERGER.ARBRES)[v.arbres.length % Object.keys(DATA.VERGER.ARBRES).length];
      return { cost: DATA.VERGER.ARBRES[espece].prix, buy: () => buyTree(state, espece) };
    }
    case 'frigo':
      if (!isUnlocked(state, 'frigo')) return { locked: true };
      return state.frigo.construit ? { done: true } : { cost: DATA.FRIGO.CONSTRUCTION, buy: () => buildFridge(state) };
    case 'pompe':
      if (chapterReached(state) < 4) return { locked: true }; // d'abord les achats essentiels
      if (state.pompe.niveau < step.niveau && !hasTech(state, step.niveau === 2 ? 'cu_outils' : 'ea_econome')) return { locked: true }; // après le nœud précédent
      return state.pompe.niveau >= step.niveau ? { done: true } : { cost: upgradeCost(state.pompe), buy: () => upgradeDevice(state, state.pompe.id) };
    case 'tech': {
      if (hasTech(state, step.id)) return { done: true };
      if (chapterReached(state) < 4) return { locked: true }; // d'abord les achats essentiels
      if (techStatus(state, step.id) !== 'disponible') return { locked: true };
      if (techPoints(state).solde < DATA.techtree.noeuds[step.id].pt) return { locked: true }; // arbre v2 : PT
      return { cost: DATA.techtree.noeuds[step.id].cout, buy: () => buyTech(state, step.id) };
    }
    default:
      return { done: true };
  }
}

// Vend juste assez de conserves pour payer un achat, sans descendre sous le stock gardé.
export function botRaiseFunds(state, cost) {
  const price = DATA.items.conserve.prix;
  const spare = countItem(state, 'conserve') - DATA.SIMULATION.CONSERVES_GARDEES;
  const needed = Math.ceil((cost - state.pieces - EPS) / price);
  if (needed > 0 && needed <= spare) sellItem(state, 'conserve', needed);
}

// Achète, dans l'ordre, ce qui fait le plus avancer le chapitre en cours puis le
// plan général ; s'arrête sur la première étape trop chère (il économise pour elle).
export function botBuy(state, eveilS) {
  const S = DATA.SIMULATION;
  const chapitre = Math.min(chapterReached(state), chapterCount());
  // Version 1.6 : ce qui fait avancer le chapitre passe avant les appareils (une
  // amélioration coûte désormais 100 à 2 200 pièces ; avant, la pompe pouvait tout
  // absorber dès l'ouverture du Champ).
  const steps = [...(S.PRIORITE[chapitre] || []), { type: 'infra' }, ...S.PLAN];
  for (let guard = 0; guard < 40; guard++) {
    let bought = false;
    for (const step of steps) {
      const info = botStepInfo(state, step, eveilS);
      if (info.done || info.locked) continue;
      // une caisse reste en réserve pour les graines, le blé et les soins (sauf pour l'eau et l'énergie)
      const target = info.cost + (step.type === 'infra' ? 0 : S.CAISSE);
      if (state.pieces + EPS < target) botRaiseFunds(state, target);
      if (state.pieces + EPS < target) return;
      if (!info.buy().ok) return;
      bought = true;
      break; // l'état a changé : on relit le plan depuis le début
    }
    if (!bought) return;
  }
}

/* ---------- ventes et rangement du soir ---------- */

// Vend ce qui périrait demain et que le repas de ce soir ne mangera pas, la laine,
// le blé en trop et la paille en trop. Avec un réfrigérateur en marche, on range au lieu de vendre.
export function botSell(state) {
  const S = DATA.SIMULATION;
  const cold = state.frigo.construit && state.frigo.appareil.allume && !isBroken(state.frigo.appareil);
  if (!cold) {
    const plan = planMeal(state);
    const expiring = expiringSoon(state);
    for (const item of Object.keys(expiring)) {
      const eaten = Math.max(0, (plan.mange[item] || 0) - (plan.froid[item] || 0));
      const spare = Math.min(expiring[item] - eaten, countItem(state, item) - (state.famille.reserve[item] || 0));
      if (spare >= 1) sellItem(state, item, Math.floor(spare));
    }
  }
  const laine = countItem(state, 'laine');
  if (laine >= 1) sellItem(state, 'laine', laine);
  const ble = countItem(state, DATA.SILO.ITEM) - S.BLE_MAX;
  if (ble >= 1) sellItem(state, DATA.SILO.ITEM, ble);
  // la paille que la farine a donnée en trop (sans animaux, toute la paille),
  // et la farine que la paille a donnée en trop
  const paille = strawStock(state) - strawNeed(state) * S.PAILLE_MAX_NUITS;
  if (paille >= 1) sellItem(state, DATA.PATURAGE.nourriture, paille);
  const farine = countItem(state, 'farine') - S.FARINE_MAX;
  if (farine >= 1) sellItem(state, 'farine', farine);
}

// Range au frais tout ce qui périme (sauf la réserve de semences).
export function botStore(state) {
  const f = state.frigo;
  if (!f.construit || !f.appareil.allume || isBroken(f.appareil)) return;
  for (const item of Object.keys(inventoryCounts(state))) {
    if (!isFridgeable(item)) continue;
    const qty = Math.floor(countItem(state, item) - (state.famille.reserve[item] || 0) + EPS);
    if (qty >= 1) moveToFridge(state, item, qty);
  }
}

/* ---------- une journée, une partie ---------- */

// Série d'actions du joueur. `soir` : dernière série avant de dormir.
export function botActions(state, strat, options, soir) {
  botMaintenance(state);
  botHeal(state);
  botBuy(state, strat.eveilS);
  botFarm(state);
  botHens(state);
  botSheep(state);
  botMill(state);
  botCook(state);
  if (!soir) return;
  botSell(state);
  botBuy(state, strat.eveilS);
  if (options.depannage) {
    const item = options.depannage.item;
    const price = buyPrice(state, item);
    options.depannage.dernier = { prix: price, possible: state.pieces + EPS >= price };
    if (options.depannage.dernier.possible) buyItem(state, item, 1);
  }
  botStore(state);
}

// Une journée complète : des séries d'actions tous les PAS_S secondes pendant
// `eveilS` secondes, puis Dormir. Renvoie le compte rendu du réveil.
export function botDay(state, strat, options) {
  const S = DATA.SIMULATION;
  const eveil = Math.max(strat.eveilS, awakeRequired(state));
  botActions(state, strat, options, false);
  let t = 0;
  while (t + EPS < eveil) {
    const dt = Math.min(S.PAS_S, eveil - t);
    tick(state, dt);
    t += dt;
    botActions(state, strat, options, t + EPS >= eveil);
  }
  return sleep(state);
}

// Joue `nuits` nuits à partir de `state` (l'appelant passe une copie : elle est
// modifiée). Renvoie une ligne par nuit : chapitre au début de la journée,
// autonomie et santé à la fin de la nuit, pièces et conserves au réveil.
// options.depannage = { item } : chaque soir, le joueur achète aussi une unité de
// cet aliment au Marché (vérification de la section 8.11).
export function simulatePlay(state, strategyId, nights = DATA.SIMULATION.NUITS, options = {}) {
  const strat = DATA.SIMULATION.STRATEGIES[strategyId];
  if (!strat) throw new Error(`Stratégie inconnue : ${strategyId}`);
  const rows = [];
  for (let i = 0; i < nights; i++) {
    const nuit = state.day;
    const chapitre = chapterReached(state);
    if (options.depannage) options.depannage.dernier = null;
    botDay(state, strat, options);
    const sante = state.famille.membres.map((m) => m.sante);
    rows.push({
      nuit,
      chapitre,
      autonomie: state.nuit.autonomie,
      couverture: state.nuit.couverture,
      santeMoyenne: rawAverageHealth(state),
      santeMin: Math.min(...sante),
      malades: state.famille.membres.filter((m) => m.malade).length,
      pieces: state.pieces,
      conserves: countItem(state, 'conserve'),
      soinsPayes: state.famille.soinsPayes,
      potager: state.potager.niveau,
      depannage: options.depannage ? options.depannage.dernier : null,
    });
  }
  return rows;
}

// Partie neuve de `nights` nuits, jouée par la stratégie donnée.
export function simulateGame(strategyId, nights = DATA.SIMULATION.NUITS, seed = DATA.SIMULATION.GRAINE, options = {}) {
  return simulatePlay(createInitialState(seed), strategyId, nights, options);
}

// Première nuit où l'autonomie lissée (moyenne des LISSAGE dernières nuits) atteint `pct`, ou null.
export function simulationReach(rows, pct) {
  const k = DATA.SIMULATION.LISSAGE;
  for (let i = k - 1; i < rows.length; i++) {
    const window = rows.slice(i - k + 1, i + 1);
    const mean = window.reduce((t, r) => t + r.autonomie, 0) / k;
    if (mean + EPS >= pct) return rows[i].nuit;
  }
  return null;
}

// Joue `nights` nuits sur une COPIE de la partie (la partie en cours n'est pas
// touchée) : sert au bouton du mode test.
export function simulateFromCopy(state, strategyId = 'applique', nights = 60) {
  return simulatePlay(JSON.parse(JSON.stringify(state)), strategyId, nights);
}
