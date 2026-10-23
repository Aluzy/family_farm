import { DATA, dishPrice, ingredientOptions } from './catalog.js';
import { EPS } from './base.js';
import {
  allDevices, batteryCapacity, canPay, farmOpen, isBroken, isOwned, maintainDevice, marcheOuvert, needsService, panelOutput, pumpFlow,
  repairDevice, starterOf, sunlitMs, tankCapacity, toggleDevice, upgradeCost, upgradeDevice, upgradeTank,
} from './devices.js';
import { awakeRequired } from './clock.js';
import { tick } from './energy.js';
import { addItem, countItem, expiringSoon } from './inventory.js';
import { buildFridge, fridgeLevel, fridgeRate, fridgeUpgradeCost, moveAllToFridge, moveFromFridge, stockCount, upgradeFridge } from './fridge.js';
import { buyItem, buyPrice, isBuyable, sellItem } from './market.js';
import { eatSnack } from './family.js';
import { depenserMembre, jaugeMembre, mangeurs, repasStep, valeurAliment } from './repas.js';
import { actionCost, energyLevel, energyMax } from './stamina.js';
import { averageHappiness, dishHappiness } from './ville.js';
import {
  allPlots, buildSerre, buyHoe, cropProduct, harvest, hasHoe, hoe, hoeStatus, isArable, isMature, plant, plotAtTile, seedItem, seedStock,
  serreUpgradeCost, soilCount, upgradeSerre, water, waterCost,
} from './crops.js';
import {
  animalPrice, buildPaturage, buildPoulailler, buildSilo, buyAnimal, buyCow, buyPasture, buySheep, canFeedHen, cowCount, freeCowPlaces,
  coopCapacity, coopUpgradeCost, feedAllHens, freeSheepPlaces, hensToFeed, pastureCost, shear, sheepCount,
  siloUpgradeCost, strawNeed, strawStock, upgradePoulailler, upgradeSilo, wheatTotal, woolReady,
} from './animals.js';
import { chooseCommerce, commerceStock, commerceUpgradeCost, upgradeCommerce } from './commerce.js';
import { buildVerger, buyOrchardSlot, harvestTree, orchardFree, orchardSlotPrice, plantTree, ripeTrees } from './orchard.js';
import { buildStation, millPending, recipeUnlocked, startMilling, startRecipe } from './kitchen.js';
import { buyTech, hasTech, techPoints, techResources, techStatus } from './techtree.js';
import {
  chapterCount, chapterProgress, chapterReached, cropUnlocked, isUnlocked, objectiveChapter, objectiveDef, plantableCropsFor,
  readMail, unreadMail,
} from './campaign.js';
import { isAutomated } from './automation.js';
import { buyTool, grassCut, hasTool, scytheGrass } from './outils.js';
import { bottelerSansCarte } from './botteleuse.js';
import { sleep } from './night.js';
import { farmTerrain, tileCount } from './terrain.js';
import { createNewGame, buyStarter, houseRepaired, repairHouse, starterBlock } from './depart.js';

/* ==========================================================================
   Lot 10 : simulation d'un joueur automatique (conception, sections 8.10 et
   8.11). Le joueur automatique joue avec les vraies actions du moteur, sans
   interface : il sert au script scripts/simulate.mjs et au bouton du mode test.
   Il ne lit ni l'horloge ni Math.random : une partie simulée est entièrement
   déterminée par sa graine. Tout ce qu'il vise ou garde vit dans
   DATA.SIMULATION.
   ========================================================================== */

/* ---------- entretien, énergie, infrastructure ---------- */

// Répare ce qui est en panne (et le rallume), entretient ce qui est usé.
function botMaintenance(state) {
  for (const d of allDevices(state)) {
    if (isBroken(d)) {
      if (repairDevice(state, d.id).ok) toggleDevice(state, d.id);
    } else if (needsService(d)) {
      maintainDevice(state, d.id);
    }
  }
}

// Version 1.8 : quand l'énergie ne suffit plus pour une récolte, le joueur mange un
// en-cas (l'aliment le plus nourrissant d'abord, hors réserve de semences), et jamais
// au-delà du maximum.
export function botSnack(state) {
  for (let guard = 0; guard < 10; guard++) {
    if (state.energie >= actionCost(state, 'recolter') || state.energie >= energyMax()) return;
    const spare = Object.keys(DATA.OBJETS)
      .filter((k) => DATA.OBJETS[k].mangeable && countItem(state, k) - (state.famille.reserve[k] || 0) >= 1)
      .sort((a, b) => DATA.OBJETS[b].energie - DATA.OBJETS[a].energie);
    if (!spare.length || !eatSnack(state, spare[0]).ok) return;
  }
}

// Eau demandée par une journée : toutes les parcelles arrosées, plus la cuisine.
function botWaterPerDay(state) {
  const S = DATA.SIMULATION;
  let litres = S.LITRES_CUISINE;
  for (const p of allPlots(state)) litres += p.culture ? waterCost(state, p) : S.LITRES_PARCELLE;
  return litres;
}

// Énergie demandée par une journée (mWh) : pompe, réfrigérateur, Moulin et Presse.
function botEnergyPerDay(state, eveilS) {
  let mwh = botWaterPerDay(state) * 1000 * DATA.POMPE.WH_PAR_L;
  if (state.frigo && state.frigo.construit) mwh += fridgeRate(state) * (eveilS + DATA.FRIGO.BLOC_NUIT_S);
  for (const id of Object.keys(DATA.STATIONS)) {
    const st = state.stations[id];
    if (DATA.STATIONS[id].electrique && st.construit) mwh += Math.floor((DATA.STATIONS[id].whParS * 1000 * eveilS * DATA.SIMULATION.MARCHE_STATIONS) / 100);
  }
  return mwh;
}

// Pompe, réservoir, panneau et batterie : le joueur ne laisse pas la ferme manquer
// d'eau ni d'énergie. Version 1.6 : un seul appareil de chaque, qu'il améliore ; le
// panneau ne produit qu'au soleil (de 7 h à 19 h), sur la part ensoleillée de son
// temps d'éveil. Renvoie la prochaine amélioration nécessaire { cost, buy }, ou
// { done: true }.
function botInfraInfo(state, eveilS) {
  const S = DATA.SIMULATION;
  // version 1.12 : rien à améliorer avant d'avoir acheté le panneau, la pompe et le réservoir
  if (!farmOpen(state) || !isOwned(state.reservoir)) return { locked: true };
  const litres = botWaterPerDay(state);
  const pump = state.pompe;
  const needsFlow = litres * 1000 * 100 > pumpFlow(pump) * eveilS * S.MARGE_EAU;
  if (pump.niveau < DATA.NIVEAU_MAX && needsFlow) return { cost: upgradeCost(pump), buy: () => upgradeDevice(state, pump.id) };
  const needsTank = isAutomated(state, 'potager') && litres * 1000 * 100 > tankCapacity(state) * S.MARGE_EAU;
  if (state.reservoir.niveau < DATA.NIVEAU_MAX && needsTank) {
    return { cost: upgradeCost({ type: 'reservoir', niveau: state.reservoir.niveau }), buy: () => upgradeTank(state) };
  }

  const panel = state.panneaux[0];
  const produced = Math.floor((panelOutput(panel) * sunlitMs(0, eveilS * 1000)) / 1000);
  const need = botEnergyPerDay(state, eveilS);
  if (panel.niveau < DATA.NIVEAU_MAX && produced * 100 < need * S.MARGE_ENERGIE) return { cost: upgradeCost(panel), buy: () => upgradeDevice(state, panel.id) };
  const battery = state.batteries[0];
  if (isOwned(battery) && battery.niveau < DATA.NIVEAU_MAX && batteryCapacity(battery) * 100 < need * S.MARGE_BATTERIE) {
    return { cost: upgradeCost(battery), buy: () => upgradeDevice(state, battery.id) };
  }
  return { done: true };
}

/* ---------- cultures ---------- */

// Énergie rendue par une parcelle et par nuit (critère de choix des légumes).
function botCropScore(culture) {
  const c = DATA.CULTURES[culture];
  const item = DATA.OBJETS[cropProduct(culture)];
  return ((item.energie || 0) * c.rendement) / c.stades;
}

// Achète une unité de graine si le prix reste raisonnable ; renvoie true si elle est là.
function botBuySeed(state, item) {
  if (!isBuyable(item)) return false;
  const price = buyPrice(state, item);
  if (price > DATA.SIMULATION.PRIX_GRAINE_MAX + EPS || !canPay(state, price)) return false;
  return buyItem(state, item, 1).ok === true;
}

function botHasSeed(state, culture) {
  return seedStock(state, culture) >= 1 - EPS || botBuySeed(state, seedItem(culture));
}

// Vrai tant que l'objectif « carottes récoltées » du chapitre en cours n'est pas
// couvert par les récoltes faites et les carottes déjà en terre.
function botWantsCarrots(state) {
  const obj = objectiveDef('carottes');
  if (!obj || chapterReached(state) > objectiveChapter('carottes')) return false;
  const inGround = allPlots(state).filter((p) => p.culture === 'carotte').length * DATA.CULTURES.carotte.rendement;
  return state.campagne.compteurs.carottes + inGround < obj.cible;
}

// Une culture de plein champ (blé, tournesol, riz, houblon).
export function botIsFieldCrop(culture) {
  return !!DATA.CULTURES[culture].pleinChamp;
}

// Parcelles de la Zone de culture que le joueur réserve au plein champ (blé et
// tournesol) : PART_PLEIN_CHAMP % de la zone une fois le blé plantable (niveau
// atteint et Silo construit), 0 avant.
export function botFieldTarget(state) {
  if (!cropUnlocked(state, 'ble')) return 0;
  return Math.floor((state.potager.parcelles.length * DATA.SIMULATION.PART_PLEIN_CHAMP) / 100);
}

// Culture à planter sur une parcelle vide, ou null.
function botPickCrop(state, plot) {
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
  // Version 1.14 : le joueur varie ses cultures (des plats variés font le bonheur) : la
  // culture la moins présente (en terre et en stock) passe devant, la plus nourrissante
  // à égalité.
  const presence = (c) => allPlots(state).filter((p) => p.culture === c).length
    + countItem(state, cropProduct(c)) / Math.max(1, DATA.CULTURES[c].rendement * S.DIVERSITE_STOCK);
  const foods = options.filter((c) => !botIsFieldCrop(c) && DATA.OBJETS[cropProduct(c)].mangeable)
    .sort((a, b) => presence(a) - presence(b) || botCropScore(b) - botCropScore(a));
  // l'objectif du chapitre 2 demande des carottes : elles passent devant
  if (botWantsCarrots(state)) foods.sort((a, b) => (b === 'carotte') - (a === 'carotte'));
  return foods.find((c) => botHasSeed(state, c)) || null;
}

// Récolte, replante, arrose.
export function botFarm(state) {
  const S = DATA.SIMULATION;
  for (const p of allPlots(state)) {
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

// Tuiles labourables, des plus proches de l'ancienne Zone de culture aux plus lointaines
// (version 1.15 : le joueur automatique cultive d'un seul tenant).
// (Une fois par terrain.)
let botTilesCache = null, botTilesPour = null;
function botTiles(state) {
  const T = farmTerrain(state);
  if (botTilesPour === T) return botTilesCache;
  const W = T.LARGEUR, Z = T.ZONES[1], n = tileCount(T);
  const tiles = [], aucune = new Set(); // (les tuiles sous un rocher ou un arbre n'y sont pas)
  for (let t = 0; t < n; t++) if (isArable(t, state, aucune)) tiles.push(t);
  const d = (t) => Math.hypot((t % W) - (Z.X + 2), Math.floor(t / W) - (Z.Y + 2.5));
  botTilesCache = tiles.sort((a, b) => d(a) - d(b) || a - b);
  botTilesPour = T;
  return botTilesCache;
}

// Version 1.9 : avec la houe, laboure des tuiles d'herbe jusqu'au plafond du niveau, en
// gardant de l'énergie pour trois récoltes.
export function botHoe(state) {
  if (!hasHoe(state)) return;
  const reserve = actionCost(state, 'recolter') * 3;
  for (const t of botTiles(state)) {
    if (plotAtTile(state, t)) continue;
    if (state.energie < reserve + actionCost(state, 'labourer')) return;
    const st = hoeStatus(state, t);
    if (!st.ok && st.dessin) continue; // version 1.15 : sa bordure ne se dessinerait pas
    if (!st.ok) return;
    hoe(state, t);
  }
}

/* ---------- animaux ---------- */

function botHens(state) {
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

// Version 1.13 : cueille les arbres en fruits du Verger.
function botOrchard(state) {
  for (const t of ripeTrees(state)) {
    if (!harvestTree(state, t.id).ok) break;
  }
}

// Version 1.14 : le joueur ouvre son courrier (l'héritage du niveau 9 est versé à l'ouverture).
function botMail(state) {
  for (const l of unreadMail(state)) readMail(state, l.id);
}

// Version 1.14 : au niveau 10, le joueur automatique choisit le commerce qui a le plus
// de matière (laits, laines ou légumes, rapportés à la recette).
function botCommerce(state) {
  if (state.commerce.type || !isUnlocked(state, 'commerce')) return;
  const types = Object.keys(DATA.COMMERCE.TYPES);
  const best = types.reduce((a, t) => (commerceStock(state, t) / DATA.COMMERCE.TYPES[t].par > commerceStock(state, a) / DATA.COMMERCE.TYPES[a].par ? t : a), types[0]);
  chooseCommerce(state, best);
}

// La paille vient des fibres de la faux (FAUX), bottelées (BOTTELEUSE) : dès qu'il a des
// moutons ou des vaches, il achète la faux et fauche les touffes de son pré (« pre_0 »… : il
// n'a pas de carte) pour PAILLE_NUITS nuits d'avance, tant qu'il en reste et qu'il a de
// l'énergie ; ses fibres sont bottelées sans machine (bottelerSansCarte).
export function botScythe(state) {
  const besoin = strawNeed(state);
  if (besoin <= 0) return;
  if (!hasTool(state, 'faux') && !buyTool(state, 'faux').ok) return;
  const voulu = besoin * DATA.SIMULATION.PAILLE_NUITS;
  for (let k = 0; k < DATA.FAUX.BOT_TOUFFES && strawStock(state) < voulu; k++) {
    const id = 'pre_' + k;
    if (grassCut(state, id)) continue;
    if (!scytheGrass(state, id).ok) break;
    bottelerSansCarte(state);
  }
}

// Le Moulin : il moud de quoi garder un peu de farine (STOCK_FARINE). Le blé des poules et
// des semis reste de côté.
export function botMill(state) {
  const S = DATA.SIMULATION;
  const st = state.stations.moulin;
  if (!st.construit) return;
  const d = st.appareil;
  if (d && (!d.allume || isBroken(d))) return;
  const voulu = S.STOCK_FARINE - countItem(state, 'farine') - millPending(state);
  if (voulu < 1) return;
  const n = Math.min(voulu, Math.max(0, wheatTotal(state) - botWheatKept(state)));
  if (n >= 1) startMilling(state, n);
}

/* ---------- cuisine ---------- */

// Unités disponibles d'un ingrédient (inventaire et frigo), sans la réserve de semences.
function botSpare(state, item) {
  if (item === DATA.SILO.ITEM) return wheatTotal(state);
  const reserve = state.famille.reserve[item] || 0;
  return stockCount(state, item) - reserve;
}

// Option retenue pour un ingrédient (celle dont il reste assez), ou null.
function botIngredient(state, ing) {
  return ingredientOptions(ing).find((item) => botSpare(state, item) + EPS >= ing.qte) || null;
}

// Intérêt d'une recette : gain en pièces par seconde de préparation, ou 0 si elle ne vaut pas le coup.
export function botRecipeValue(state, id) {
  const S = DATA.SIMULATION;
  const r = DATA.RECETTES[id];
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
  // version 1.14 : un plat jamais préparé passe devant tant que le chapitre en cours
  // demande des plats différents
  const plats = objectiveDef('plats');
  if (plats && chapterReached(state) === objectiveChapter('plats') && !(plats.exclut || []).includes(id)
    && !state.campagne.compteurs.plats.includes(id)) {
    return (2 * S.PRIORITE_BONHEUR) / r.temps;
  }
  // version 1.11 : sous le bonheur visé, un plat qui manque à la famille passe avant
  // tout (le meilleur bonheur d'abord), même s'il ne rapporte rien
  if (averageHappiness(state) < S.BONHEUR_CIBLE && botSpare(state, id) < 1 && dishHappiness(id) > 0) {
    return (S.PRIORITE_BONHEUR + dishHappiness(id)) / r.temps;
  }
  let cost = (r.eau || 0) * DATA.CUISINE.PRIX_EAU;
  r.ingredients.forEach((ing, i) => { cost += DATA.OBJETS[items[i]].prix * ing.qte; });
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
function botStartRecipe(state, id) {
  const r = DATA.RECETTES[id];
  r.ingredients.forEach((ing) => {
    const item = botIngredient(state, ing);
    const missing = ing.qte - countItem(state, item);
    if (item !== DATA.SILO.ITEM && missing > 0) moveFromFridge(state, item, missing);
  });
  return startRecipe(state, id).ok === true;
}

// Version 1.14 : l'huile et la farine qui manquent aux plats s'achètent au Marché.
function botBuyStaples(state) {
  if (!marcheOuvert(state)) return;
  for (const [item, a] of Object.entries(DATA.SIMULATION.ACHATS_CUISINE)) {
    for (let i = 0; i < a.stock && stockCount(state, item) < a.stock; i++) {
      if (!isBuyable(item) || buyPrice(state, item) > a.prixMax + EPS || !canPay(state, buyPrice(state, item) + DATA.SIMULATION.CAISSE)) break;
      if (!buyItem(state, item, 1).ok) break;
    }
  }
}

// Ce qui manque des ressources d'un nœud de l'arbre, mis dans l'inventaire du bot.
function botGather(state, id) {
  for (const r of techResources(state, id)) if (!r.ok) addItem(state, r.item, r.qte - r.stock);
}

// Les objectifs « objet » du chapitre en cours (grotte, Four) : le joueur simulé rapporte
// les minerais de la grotte (comme botGather pour l'arbre), et fond un lingot au Four dès
// qu'il le peut, minerais et bois compris.
function botObjectives(state) {
  if (!state.campagne || state.campagne.fini) return;
  for (const o of chapterProgress(state).objectifs) {
    if (o.type !== 'objet' || o.ok) continue;
    const manque = o.cible - o.valeur;
    const r = DATA.RECETTES[o.item];
    if (o.item.startsWith('minerai_')) addItem(state, o.item, manque);
    else if (r && r.transformation && r.sortie === o.item) {
      const st = state.stations && state.stations[r.station];
      if (!st || !st.construit || st.tache || !recipeUnlocked(state, o.item)) continue;
      for (const ing of r.ingredients) {
        const item = ingredientOptions(ing)[0];
        if (countItem(state, item) + EPS < ing.qte) addItem(state, item, ing.qte - countItem(state, item));
      }
      botStartRecipe(state, o.item);
    }
  }
}

function botCook(state) {
  if (!state.stations) return;
  botBuyStaples(state);
  for (const station of Object.keys(DATA.STATIONS)) {
    const st = state.stations[station];
    if (!st.construit || st.tache) continue;
    let best = null;
    for (const id of Object.keys(DATA.RECETTES)) {
      if (DATA.RECETTES[id].station !== station) continue;
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
    // version 1.12 (v2, lot 8) : la maison à réparer, les appareils de départ à acheter
    case 'maison':
      return houseRepaired(state) ? { done: true } : { cost: DATA.DEPART.MAISON, buy: () => repairHouse(state) };
    case 'achat':
      if (isOwned(starterOf(state, step.id))) return { done: true };
      if (starterBlock(state, step.id)) return { locked: true };
      return { cost: DATA.DEPART.ACHATS[step.id], buy: () => buyStarter(state, step.id) };
    case 'houe':
      if (hasHoe(state)) return { done: true };
      return marcheOuvert(state) ? { cost: DATA.HOUE.PRIX, buy: () => buyHoe(state) } : { locked: true };
    case 'silo':
      if (!isUnlocked(state, 'silo')) return { locked: true };
      if (built(state.silo)) return { done: true };
      return state.silo.construit ? { cost: siloUpgradeCost(state), buy: () => upgradeSilo(state) } : { cost: DATA.SILO.PRIX_CONSTRUCTION, buy: () => buildSilo(state) };
    case 'poulailler':
      if (!isUnlocked(state, 'poulailler')) return { locked: true };
      if (built(state.poulailler)) return { done: true };
      return state.poulailler.construit ? { cost: coopUpgradeCost(state), buy: () => upgradePoulailler(state) } : { cost: DATA.POULAILLER.PRIX_CONSTRUCTION, buy: () => buildPoulailler(state) };
    case 'poules': {
      if (!isUnlocked(state, 'poulailler')) return { locked: true };
      const p = state.poulailler;
      if (p.poules >= step.n) return { done: true };
      if (!p.construit) return { cost: DATA.POULAILLER.PRIX_CONSTRUCTION, buy: () => buildPoulailler(state) };
      if (p.poules >= coopCapacity(state)) return { cost: coopUpgradeCost(state), buy: () => upgradePoulailler(state) };
      return { cost: animalPrice('poule'), buy: () => buyAnimal(state, 'poule') };
    }
    case 'station': {
      const def = DATA.STATIONS[step.id];
      if (!isUnlocked(state, step.id)) return { locked: true };
      if (state.stations[step.id].construit) return { done: true };
      if (def.requiert && !state.stations[def.requiert].construit) return { locked: true };
      return { cost: def.prixConstruction, buy: () => buildStation(state, step.id) };
    }
    case 'paturage':
      if (!isUnlocked(state, 'paturage')) return { locked: true };
      return state.paturage.construit ? { done: true } : { cost: DATA.PATURAGE.PRIX_CONSTRUCTION, buy: () => buildPaturage(state) };
    case 'moutons': {
      if (!isUnlocked(state, 'moutons')) return { locked: true };
      const p = state.paturage;
      if (!p.construit) return { cost: DATA.PATURAGE.PRIX_CONSTRUCTION, buy: () => buildPaturage(state) };
      if (sheepCount(state) >= step.n) return { done: true };
      if (freeSheepPlaces(state) <= 0) return { cost: pastureCost(state), buy: () => buyPasture(state) };
      return { cost: animalPrice('mouton'), buy: () => buySheep(state) };
    }
    // version 1.14 : des vaches pour le lait, et le commerce agrandi
    case 'vaches': {
      if (!isUnlocked(state, 'moutons')) return { locked: true };
      const p = state.paturage;
      if (!p.construit) return { cost: DATA.PATURAGE.PRIX_CONSTRUCTION, buy: () => buildPaturage(state) };
      if (cowCount(state) >= step.n) return { done: true };
      if (freeCowPlaces(state) <= 0) return { cost: pastureCost(state), buy: () => buyPasture(state) };
      return { cost: animalPrice('vache'), buy: () => buyCow(state) };
    }
    case 'commerce': {
      if (!state.commerce.type) return { locked: true };
      if (state.commerce.niveau >= step.niveau) return { done: true };
      return { cost: commerceUpgradeCost(state), buy: () => upgradeCommerce(state) };
    }
    case 'serre':
      if (!isUnlocked(state, 'serre')) return { locked: true };
      if (built(state.serre)) return { done: true };
      return state.serre.construit ? { cost: serreUpgradeCost(state), buy: () => upgradeSerre(state) } : { cost: DATA.SERRE.PRIX_CONSTRUCTION, buy: () => buildSerre(state) };
    case 'verger':
      if (!isUnlocked(state, 'verger')) return { locked: true };
      return state.verger.construit ? { done: true } : { cost: DATA.VERGER.PRIX_CONSTRUCTION, buy: () => buildVerger(state) };
    case 'arbres': {
      if (!isUnlocked(state, 'verger')) return { locked: true };
      const v = state.verger;
      if (!v.construit) return { cost: DATA.VERGER.PRIX_CONSTRUCTION, buy: () => buildVerger(state) };
      if (v.arbres.length >= step.n) return { done: true };
      if (orchardFree(state) <= 0) return { cost: orchardSlotPrice(state), buy: () => buyOrchardSlot(state) };
      const espece = Object.keys(DATA.VERGER.ARBRES)[v.arbres.length % Object.keys(DATA.VERGER.ARBRES).length];
      return { cost: DATA.VERGER.ARBRES[espece].prix, buy: () => plantTree(state, espece) };
    }
    case 'frigo':
      if (!isUnlocked(state, 'frigo')) return { locked: true };
      if (!state.frigo.construit) return { cost: DATA.FRIGO.PRIX_CONSTRUCTION, buy: () => buildFridge(state) };
      // version 1.10 : un niveau de frigo visé (capacité)
      return fridgeLevel(state) >= (step.niveau || 1) ? { done: true } : { cost: fridgeUpgradeCost(state), buy: () => upgradeFridge(state) };
    case 'pompe':
      if (chapterReached(state) < 4) return { locked: true }; // d'abord les achats essentiels
      if (state.pompe.niveau < step.niveau && !hasTech(state, step.niveau === 2 ? 'cu_outils' : 'ea_econome')) return { locked: true }; // après le nœud précédent
      return state.pompe.niveau >= step.niveau ? { done: true } : { cost: upgradeCost(state.pompe), buy: () => upgradeDevice(state, state.pompe.id) };
    case 'tech': {
      if (hasTech(state, step.id)) return { done: true };
      if (chapterReached(state) < 4) return { locked: true }; // d'abord les achats essentiels
      if (techStatus(state, step.id) !== 'disponible') return { locked: true };
      if (techPoints(state).solde < DATA.ARBRE.noeuds[step.id].pt) return { locked: true }; // arbre v2 : PT
      // les ressources (bois, pierre, lingots) : le joueur simulé va les chercher (couper,
      // piocher, fondre au Four), ce que le bot ne fait pas pas à pas : elles lui sont données
      return { cost: DATA.ARBRE.noeuds[step.id].prix, buy: () => { botGather(state, step.id); return buyTech(state, step.id); } };
    }
    default:
      return { done: true };
  }
}

// Vend juste assez de conserves pour payer un achat, sans descendre sous le stock gardé.
export function botRaiseFunds(state, cost) {
  const price = DATA.OBJETS.conserve.prix;
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
      // une caisse reste en réserve pour les graines et le blé (sauf pour l'eau et l'énergie)
      const target = info.cost + (step.type === 'infra' ? 0 : S.CAISSE);
      if (!canPay(state, target)) botRaiseFunds(state, target);
      if (!canPay(state, target)) return;
      if (!info.buy().ok) return;
      bought = true;
      break; // l'état a changé : on relit le plan depuis le début
    }
    if (!bought) return;
  }
}

/* ---------- ventes et rangement du soir ---------- */

// Vend ce qui périrait demain (hors réserve de semences et ce que la famille mangera ce soir), la laine,
// le blé en trop et la paille en trop. Avec un réfrigérateur en marche, on range au lieu de vendre.
export function botSell(state) {
  const S = DATA.SIMULATION;
  // version 1.10 : le frigo a une capacité ; ce qui n'y tient pas et périrait se vend
  {
    const expiring = expiringSoon(state);
    // (la famille qui mangera ce soir, FAIM_JOUR dépensés : on lui garde de quoi se rassasier)
    let faim = familleAffameeCeSoir(state);
    for (const item of Object.keys(expiring)) {
      const garde = Math.min(expiring[item], Math.ceil(faim / Math.max(1, valeurAliment(item))));
      faim -= garde * valeurAliment(item);
      const spare = Math.min(expiring[item] - garde, countItem(state, item) - (state.famille.reserve[item] || 0));
      if (spare >= 1) sellItem(state, item, Math.floor(spare));
    }
  }
  const laine = countItem(state, 'laine');
  if (laine >= 1) sellItem(state, 'laine', laine);
  const ble = countItem(state, DATA.SILO.ITEM) - S.BLE_MAX;
  if (ble >= 1) sellItem(state, DATA.SILO.ITEM, ble);
  // la paille en trop (sans animaux, toute la paille), et la farine en trop
  const paille = strawStock(state) - strawNeed(state) * S.PAILLE_MAX_NUITS;
  if (paille >= 1) sellItem(state, DATA.PATURAGE.NOURRITURE, paille);
  const farine = countItem(state, 'farine') - S.FARINE_MAX;
  if (farine >= 1) sellItem(state, 'farine', farine);
}

// Points de jauge que la famille mangera ce soir : ceux des membres qui, FAIM_JOUR dépensés,
// arriveront au seuil (botDay) et mangeront jusqu'à rassasiés.
function familleAffameeCeSoir(state) {
  const F = DATA.FAMILLE.FAIM;
  return mangeurs(state).reduce((t, m) => {
    const j = jaugeMembre(m) - DATA.SIMULATION.FAIM_JOUR;
    return j <= F.SEUIL ? t + F.MAX - Math.max(0, j) : t;
  }, 0);
}

// Range au frais ce qui périme (sauf la réserve de semences), tant qu'il y a de la
// place : d'abord ce qui périme le plus tôt.
function botStore(state) {
  const f = state.frigo;
  if (!f.construit || !f.appareil.allume || isBroken(f.appareil)) return;
  moveAllToFridge(state, state.famille.reserve || {});
}

/* ---------- une journée, une partie ---------- */

// Série d'actions du joueur. `soir` : dernière série avant de dormir.
function botActions(state, strat, options, soir) {
  botMaintenance(state);
  botMail(state);
  botSnack(state);
  botBuy(state, strat.eveilS);
  // version 1.14 : les plats d'abord (quelques points d'énergie) : sans eux, plus de
  // bonheur, et chaque action coûte jusqu'au double ; une grande ferme épuisait l'énergie
  // avant la cuisine.
  botObjectives(state);
  botCook(state);
  botFarm(state);
  botHoe(state);
  botHens(state);
  botSheep(state);
  botOrchard(state);
  botCommerce(state);
  botScythe(state);
  botMill(state);
  botCook(state);
  if (!soir) return;
  botStore(state); // version 1.10 : ranger d'abord, vendre ce qui n'a pas tenu au frais
  botSell(state);
  botBuy(state, strat.eveilS);
  if (options.depannage) {
    const item = options.depannage.item;
    const price = buyPrice(state, item);
    options.depannage.dernier = { prix: price, possible: canPay(state, price) };
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
  // la famille ne marche pas sur une carte : sa faim de la journée est simulée (FAIM_JOUR)
  for (const m of mangeurs(state)) depenserMembre(state, m.id, S.FAIM_JOUR);
  repasStep(state);
  return sleep(state);
}

// Joue `nuits` nuits à partir de `state` (l'appelant passe une copie : elle est
// modifiée). Renvoie une ligne par nuit : chapitre au début de la journée,
// autonomie à la fin de la nuit, énergie du personnage et bonheur au réveil,
// pièces et conserves au réveil.
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
    rows.push({
      nuit,
      chapitre,
      autonomie: state.nuit.autonomie,
      couverture: state.nuit.couverture,
      energie: energyLevel(state),
      bonheur: averageHappiness(state),
      niveau: state.progression ? state.progression.niveau : 0,
      pieces: state.pieces,
      conserves: countItem(state, 'conserve'),
      tuiles: soilCount(state),
      depannage: options.depannage ? options.depannage.dernier : null,
    });
  }
  return rows;
}

// Partie neuve de `nights` nuits, jouée par la stratégie donnée.
export function simulateGame(strategyId, nights = DATA.SIMULATION.NUITS, seed = DATA.SIMULATION.GRAINE, options = {}) {
  // version 1.12 : le départ d'une nouvelle partie (maison à réparer, appareils à acheter)
  return simulatePlay(createNewGame(seed, { nom: 'Simulation' }), strategyId, nights, options);
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
  const copy = JSON.parse(JSON.stringify(state));
  copy.ramassage = false; // version 1.18 : le joueur automatique n'a pas de personnage qui ramasse
  return simulatePlay(copy, strategyId, nights);
}
