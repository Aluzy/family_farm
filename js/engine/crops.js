import { DATA, roundPct } from './catalog.js';
import { EPS, nextRandom, randomInt } from './base.js';
import { buildWith, fail, farmOpen, nextLevelCost, NO_COINS, pay, upgradeWith } from './devices.js';
import { countWithSilo, takeWithSilo } from './animals.js';
import { deposit } from './ramassage.js';
import { techPct, techSum } from './techtree.js';
import { bumpCounter, isUnlocked, noteCropHarvested, noteWatered } from './campaign.js';
import { gainActionXp, levelReached } from './levels.js';
import { isMoonPhase, moonHarvestPct, moonWaterPct } from './lune.js';
import { canAfford, spendEnergy, TIRED } from './stamina.js';
import { absoluteHours } from './clock.js';

/* ---------- Lot 2 : Zone de culture (identifiant interne : potager) ---------- */

export function makePlot(n, lieu = DATA.POTAGER.LIEU) {
  // Lot 7 : semis = réglage du semis automatique de la parcelle ('meme' : même
  // culture que la récolte, 'verrou' : toujours `verrou`, 'off' : désactivé).
  return { id: `${lieu}-${n}`, lieu, culture: null, stade: 0, arrose: false, semis: 'meme', verrou: null };
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

// Les mêmes listes, sans les recopier (pour les parcourir).
function plotLists(state) {
  return [state.potager.parcelles, zone2Plots(state), state.serre ? state.serre.parcelles : []];
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

function terrainChar(tile) {
  const T = DATA.TERRAIN;
  if (!Number.isInteger(tile) || tile < 0 || tile >= T.LARGEUR * T.HAUTEUR) return '.';
  return T.LIGNES[Math.floor(tile / T.LARGEUR)][tile % T.LARGEUR];
}

// Les rochers que la pioche casse (DATA.TERRAIN.ROCHERS : leurs tuiles). state.outils.rochers
// donne, pour chacun, le nombre de coups reçus (un nombre) ou, une fois cassé, { retour } :
// le jour où il reviendra. Une tuile « o » du terrain est sous un rocher : labourable
// seulement tant qu'il est cassé.
export function rockGone(state, id) {
  const r = state && state.outils && state.outils.rochers && state.outils.rochers[id];
  return !!r && (typeof r === 'object' || r >= DATA.PIOCHE.COUPS);
}

// L'arbre `id` de la carte est-il abattu (state.outils.arbres[id] = { retour }) ?
export function treeGone(state, id) {
  const a = state && state.outils && state.outils.arbres && state.outils.arbres[id];
  return !!a && typeof a === 'object';
}

// Pour chaque tuile « o » du terrain : les rochers et les arbres qui la couvrent (fait une fois).
let couvertsDe = null, couvertsPour = null;
function coveredBy() {
  const T = DATA.TERRAIN;
  if (couvertsPour === T) return couvertsDe;
  couvertsDe = new Map();
  const add = (kind, list) => {
    for (const [id, tiles] of Object.entries(list || {})) {
      for (const t of tiles) { if (!couvertsDe.has(t)) couvertsDe.set(t, []); couvertsDe.get(t).push([kind, id]); }
    }
  };
  add('rocher', T.ROCHERS);
  add('arbre', T.ARBRES);
  couvertsPour = T;
  return couvertsDe;
}

// Les tuiles libérées : celles dont tous les rochers sont cassés et tous les arbres abattus.
export function freedRockTiles(state) {
  const out = new Set();
  const o = state && state.outils;
  if (!o || (!o.rochers && !o.arbres)) return out;
  const gone = ([kind, id]) => (kind === 'rocher' ? rockGone(state, id) : treeGone(state, id));
  const couverts = coveredBy();
  const T = DATA.TERRAIN;
  for (const [kind, partis, tuiles] of [['rocher', o.rochers, T.ROCHERS], ['arbre', o.arbres, T.ARBRES]]) {
    for (const id of Object.keys(partis || {})) {
      if (!tuiles || !tuiles[id] || !gone([kind, id])) continue;
      for (const t of tuiles[id]) if (!out.has(t) && couverts.get(t).every(gone)) out.add(t);
    }
  }
  return out;
}

// La tuile est-elle labourable ? Sans `state`, une tuile sous un rocher ne l'est pas.
// `libres` : freedRockTiles(state), à passer quand on teste beaucoup de tuiles d'un coup.
export function isArable(tile, state, libres) {
  const ch = terrainChar(tile);
  return ch === '#' || (ch === 'o' && (libres || freedRockTiles(state)).has(tile));
}

// Version 1.15 : la tuile peut-elle porter une bordure mi-herbe mi-terre (herbe foncée,
// labourable ou aux abords d'un bâtiment, ou libérée par un rocher cassé) ?
export function canBorder(tile, state, libres) {
  const ch = terrainChar(tile);
  return ch === '#' || ch === '+' || (ch === 'o' && (libres || freedRockTiles(state)).has(tile));
}

// Les rangées du terrain pour la carte : une tuile sous un rocher cassé y est labourable
// (« # »), sous un rocher debout non (« . »).
export function terrainLines(state) {
  const T = DATA.TERRAIN, libres = freedRockTiles(state);
  return T.LIGNES.map((row, r) => (row.includes('o')
    ? [...row].map((ch, c) => (ch === 'o' ? (libres.has(r * T.LARGEUR + c) ? '#' : '.') : ch)).join('')
    : row));
}

// Dessin d'une tuile d'herbe à côté de la terre (comme sur la planche du jeu de tuiles) :
// ses quatre coins, chacun de terre si une des trois autres tuiles qui le partagent est
// labourée. Bits : 8 haut-gauche, 4 haut-droite, 2 bas-gauche, 1 bas-droite. 0 : herbe
// seule ; 15 (terre aux quatre coins, une tuile d'herbe prise entre deux terres) n'a pas de
// dessin. `dirt` : l'ensemble des tuiles labourées.
export function borderMask(dirt, tile) {
  const W = DATA.TERRAIN.LARGEUR;
  const c = tile % W;
  const at = (dc, dr) => {
    const cc = c + dc;
    return cc >= 0 && cc < W && dirt.has(tile + dr * W + dc);
  };
  return ((at(-1, -1) || at(0, -1) || at(-1, 0)) ? 8 : 0)
    | ((at(0, -1) || at(1, -1) || at(1, 0)) ? 4 : 0)
    | ((at(-1, 0) || at(-1, 1) || at(0, 1)) ? 2 : 0)
    | ((at(1, 0) || at(0, 1) || at(1, 1)) ? 1 : 0);
}

// Tuiles d'herbe autour de `tile` (elle comprise) dont la bordure ne peut pas se dessiner :
// une bordure sur un chemin, de l'eau, une pierre, un arbre (canBorder), ou une herbe prise
// entre deux terres (masque 15). `libres` : freedRockTiles(state), calculé une fois par l'appelant.
function badBorders(dirt, tile, libres) {
  const W = DATA.TERRAIN.LARGEUR, H = DATA.TERRAIN.HAUTEUR;
  const c = tile % W, r = Math.floor(tile / W);
  let n = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const cc = c + dc, rr = r + dr;
      if (cc < 0 || rr < 0 || cc >= W || rr >= H) { n += dirt.has(tile) ? 1 : 0; continue; }
      const t = rr * W + cc;
      if (dirt.has(t)) continue;
      const m = borderMask(dirt, t);
      if (m && (m === 15 || !canBorder(t, null, libres))) n += 1;
    }
  }
  return n;
}

// Le dessin autour de `tile` reste-t-il possible si on la laboure (`labour`) ou la rebouche ?
// Une partie d'avant la règle peut avoir déjà des bordures impossibles : on n'en refuse
// que de nouvelles.
export function soilLayoutOk(state, tile, labour) {
  const dirt = new Set(state.potager.parcelles.map((p) => p.case));
  const libres = freedRockTiles(state);
  const before = badBorders(dirt, tile, libres);
  if (labour) dirt.add(tile); else dirt.delete(tile);
  return badBorders(dirt, tile, libres) <= before;
}

// Version 1.15 : tuiles d'herbe que la houe peut labourer maintenant, pour le dessin (hors
// plafond et énergie, qui se disent au moment du labour) : labourables, sans terre, et dont
// les bordures se dessineraient.
export function hoeableTiles(state) {
  const T = DATA.TERRAIN;
  const dirt = new Set(state.potager.parcelles.map((p) => p.case));
  const libres = freedRockTiles(state); // une fois pour toute la carte
  const out = [];
  for (let t = 0; t < T.LARGEUR * T.HAUTEUR; t++) {
    if (dirt.has(t) || !isArable(t, state, libres)) continue;
    const before = badBorders(dirt, t, libres);
    dirt.add(t);
    if (badBorders(dirt, t, libres) <= before) out.push(t);
    dirt.delete(t);
  }
  return out;
}

export const SOIL_LAYOUT_REFUS = 'La terre déborde en bordure sur les 8 tuiles autour : elles doivent pouvoir devenir mi-herbe mi-terre (pas de chemin, d\'eau, de pierre ni d\'arbre à côté, et pas une seule tuile d\'herbe prise entre deux terres).';

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
  if (!pay(state, cost, 'Achat : Houe')) return fail(NO_COINS);
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
  if (!p && !isArable(tile, state)) return { action: null, ok: false, raison: 'On ne laboure ici que l\'herbe : pas les chemins, l\'eau, les pierres, les arbres, ni les abords des bâtiments.' };
  if (!hasHoe(state)) return { action: null, ok: false, raison: `Il te faut une houe (Marché, ${DATA.HOUE.PRIX} 💰).` };
  if (p) {
    if (p.culture) return { action: null, ok: false, raison: 'Terre plantée : récolte d\'abord.' };
    if (!soilLayoutOk(state, tile, false)) return { action: 'reboucher', ok: false, raison: SOIL_LAYOUT_REFUS, dessin: true };
    return { action: 'reboucher', ok: true, raison: '' };
  }
  if (!soilLayoutOk(state, tile, true)) return { action: 'labourer', ok: false, raison: SOIL_LAYOUT_REFUS, dessin: true };
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
  bumpCounter(state, 'labours', 1); // FLU-42 : chapitre 1
  return { ok: true, action: 'labourer', plot };
}

// Version 1.15 : une seule Zone de culture (toutes les terres de la carte).
export function plotZone() {
  return 1;
}

export function findPlot(state, id) {
  for (const list of plotLists(state)) {
    for (const p of list) if (p.id === id) return p;
  }
  return null;
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
// FLU-15 : une culture qui se plante d'elle-même (la patate, l'ail, le riz…) a sa place
// dans l'onglet Graines, à son prix habituel.
export function isGraineComptoir(item) {
  return DATA.items[item].category === 'graine' || item === DATA.SILO.ITEM
    || Object.values(DATA.crops).some((c) => c.graines.item === item && c.graines.mode === 'plant');
}

// FLU-15 : ce qu'on plante pour une culture, en toutes lettres (« Graines », ou l'objet
// lui-même : « Patates »).
export function seedLabel(culture) {
  const g = DATA.crops[culture].graines;
  if (DATA.items[g.item].category === 'graine') return 'Graines';
  const nom = DATA.items[g.item].nom;
  return /s$/.test(nom) ? nom : `${nom}s`;
}

// Graines disponibles pour semer une culture. Le blé sert de graine : celui de
// l'inventaire et celui du Silo comptent tous les deux.
export function seedStock(state, culture) {
  return countWithSilo(state, seedItem(culture));
}

// Retire une graine. Le blé se prend d'abord dans l'inventaire (le Silo reste
// pour les poules), puis dans le Silo.
function takeSeed(state, culture) {
  return takeWithSilo(state, seedItem(culture), 1);
}

export function plantableCrops(lieu) {
  return Object.keys(DATA.crops).filter((c) => DATA.crops[c].lieux.includes(lieu));
}

// Dernier stade d'une plante.
export function maxStage(plot) {
  return DATA.crops[plot.culture].stades;
}

export function isMature(plot) {
  return !!plot.culture && plot.stade >= maxStage(plot);
}

// Rendement d'une récolte : le même au clic et en automatique (version 1.8 : plus
// de productivité), partout (version 1.6 : plus de saisons) ; plus fort à la pleine lune.
export function harvestYield(state, culture) {
  return roundPct(DATA.crops[culture].rendement, moonHarvestPct(state));
}

// Eau d'un arrosage (L entiers) : celle de la culture, arrondie au litre le plus
// proche, 1 L au minimum.
export function waterCostFor(state, culture) {
  // arbre v2 : Arrosage économe et Gestion intelligente de l'eau (en %) ; moins à la lune
  // décroissante
  return Math.max(1, roundPct(DATA.crops[culture].litres, roundPct(techPct(state, 'eauArrosage'), moonWaterPct(state))));
}

export function waterCost(state, plot) {
  return waterCostFor(state, plot.culture);
}

// Parcelles mûres regroupées par culture : [{ culture, nombre }].
export function readyCrops(state) {
  const out = [];
  for (const p of allPlots(state)) {
    if (!isMature(p)) continue;
    let e = out.find((x) => x.culture === p.culture);
    if (!e) {
      e = { culture: p.culture, nombre: 0 };
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
  return plantPlot(state, plot, culture, auto);
}

// plant() sur la parcelle elle-même (les actions groupées l'ont déjà en main).
export function plantPlot(state, plot, culture, auto = false) {
  const def = DATA.crops[culture];
  if (!def) return fail('Culture inconnue.');
  if (plot.culture) return fail('Cette parcelle est déjà plantée.');
  if (!def.lieux.includes(plot.lieu)) return fail(`${def.nom} ne se plante pas ici.`);
  if (!auto && !canAfford(state, 'planter')) return fail(TIRED); // version 1.8
  if (takeSeed(state, culture) < 1) return fail(`Pas de graines : ${def.nom}.`);
  plot.culture = culture;
  plot.stade = 0;
  plot.arrose = false;
  if (!auto) spendEnergy(state, 'planter');
  gainActionXp(state, 'planter', 1, auto);
  if (culture === DATA.SILO.ITEM) bumpCounter(state, 'semisBle', 1); // version 1.12 : chapitre 2
  bumpCounter(state, 'semis', 1); // FLU-42 : chapitre 1
  return { ok: true };
}

// Une fois par cycle de pousse (TIME.POUSSE_HEURES heures d'horloge, voir growDue) et par
// parcelle ; consomme l'eau du réservoir. `auto` :
// arrosage d'une automatisation (moitié de l'XP, version 1.7).
export function water(state, plotId, auto = false) {
  const plot = findPlot(state, plotId);
  if (!plot) return fail('Parcelle introuvable.');
  return waterPlot(state, plot, auto);
}

// water() sur la parcelle elle-même. `note` = false : le record de parcelles arrosées
// (noteWateredPlots) est laissé à l'appelant, qui le fait une fois après tout un lot.
export function waterPlot(state, plot, auto = false, note = true) {
  if (!plot.culture) return fail('Rien n\'est planté ici.');
  if (plot.arrose) return fail('Déjà arrosée : elle pousse.');
  if (isMature(plot)) return fail('Déjà mûre, inutile d\'arroser.');
  const litres = waterCost(state, plot);
  if (state.eauMl < litres * 1000) return fail('Pas assez d\'eau dans le réservoir.');
  if (!auto && !canAfford(state, 'arroser')) return fail(TIRED); // version 1.8
  state.eauMl -= litres * 1000;
  plot.arrose = true;
  plot.arroseH = absoluteHours(state); // elle gagne son stade POUSSE_HEURES heures plus tard
  if (!auto) spendEnergy(state, 'arroser');
  gainActionXp(state, 'arroser', 1, auto);
  if (note) noteWateredPlots(state);
  return { ok: true, litres };
}

// FLU-42 (chapitre 1) : record de parcelles arrosées en même temps.
export function noteWateredPlots(state) {
  let n = 0;
  for (const list of plotLists(state)) {
    for (const p of list) if (p.arrose) n += 1;
  }
  noteWatered(state, n);
}

// Récolte : la parcelle est libérée. `auto` = true pour une automatisation
// (gratuite) ; le clic du joueur coûte de l'énergie (version 1.8).
export function harvest(state, plotId, auto = false) {
  const plot = findPlot(state, plotId);
  if (!plot) return fail('Parcelle introuvable.');
  return harvestPlot(state, plot, auto);
}

// harvest() sur la parcelle elle-même.
export function harvestPlot(state, plot, auto = false) {
  if (!plot.culture) return fail('Rien à récolter ici.');
  if (!isMature(plot)) return fail('Pas encore mûre.');
  if (!auto && !canAfford(state, 'recolter')) return fail(TIRED); // version 1.8
  const culture = plot.culture;
  const def = DATA.crops[culture];
  const items = {};
  const gain = (item, qty) => {
    if (qty > 0) items[item] = (items[item] || 0) + qty;
  };
  gain(cropProduct(culture), harvestYield(state, culture));
  noteCropHarvested(state, culture); // version 1.12 : chapitres 1 et 2
  if (def.graines.mode === 'recolte') {
    const bonus = techSum(state, 'grainesBonus'); // arbre v2 : Sélection des semences
    gain(def.graines.item, randomInt(state, def.graines.min + bonus, def.graines.max + bonus));
  }
  // Version 1.18 : au clic, sur la carte, la récolte reste sur sa case jusqu'à ce que le
  // personnage la ramasse ; sinon (automatisation, Serre, sans carte) elle va à l'inventaire
  // (le blé d'abord au Silo).
  const aRamasser = deposit(state, 'parcelle', plot.case, items, !auto && plot.lieu === 'potager' && Number.isInteger(plot.case));
  plot.culture = null;
  plot.stade = 0;
  plot.arrose = false;
  if (items.carotte) bumpCounter(state, 'carottes', items.carotte); // Lot 9
  if (!auto) spendEnergy(state, 'recolter');
  gainActionXp(state, 'recolter', 1, auto); // version 1.7
  return { ok: true, culture, items, aRamasser };
}

// Deuxième étape nocturne : +1 stade si la parcelle a été arrosée (jusqu'au
// dernier stade), puis remise à zéro de l'arrosage.
// La pousse de la nuit (state.day : le jour qui s'achève) : un stade par plante arrosée. À la
// nouvelle lune, LUNE.POUSSE_NOUVELLE stade (0 : rien ne pousse) ; à la lune croissante, une
// plante qui pousse a LUNE.POUSSE_CHANCE % de chances de gagner un stade de plus.
//
// Version des cycles : la pousse n'a plus lieu à minuit (growAll ne sert plus qu'aux essais) ;
// chaque plante gagne son stade POUSSE_HEURES heures d'horloge après son arrosage (growDue).
export function growAll(state) {
  const stades = isMoonPhase(state, 'nouvelle') ? DATA.LUNE.POUSSE_NOUVELLE : 1;
  const croissante = isMoonPhase(state, 'croissante') && DATA.LUNE.POUSSE_CHANCE > 0;
  for (const p of allPlots(state)) {
    if (!p.culture) {
      p.arrose = false;
      continue;
    }
    if (p.arrose && stades > 0 && p.stade < maxStage(p)) {
      p.stade = Math.min(maxStage(p), p.stade + stades);
      if (croissante && p.stade < maxStage(p) && nextRandom(state) * 100 < DATA.LUNE.POUSSE_CHANCE) p.stade += 1;
    }
    p.arrose = false;
  }
}

// La pousse suit l'horloge : une plante arrosée gagne son stade TIME.POUSSE_HEURES heures
// d'horloge après son arrosage (p.arroseH, heure absolue), de jour comme de nuit, puis
// redemande de l'eau. La lune joue au moment où le stade est gagné (voir growAll). Une
// plante arrosée sans heure connue (ancienne sauvegarde) compte depuis 6 h du jour. Appelée
// à chaque pas d'horloge (tick, advanceNight, sleep, simulateOffline). Renvoie le nombre de
// plantes qui ont fini leur cycle.
export function growDue(state) {
  const now = absoluteHours(state);
  const debutJour = ((Number(state.day) || 1) - 1) * 24 + DATA.TIME.DAY_START_HOUR;
  let n = 0;
  for (const p of allPlots(state)) {
    if (!p.arrose) continue;
    if (!Number.isFinite(p.arroseH)) p.arroseH = Math.min(debutJour, now);
    if (now + EPS < p.arroseH + DATA.TIME.POUSSE_HEURES) continue;
    if (p.culture && p.stade < maxStage(p)) {
      const stades = isMoonPhase(state, 'nouvelle') ? DATA.LUNE.POUSSE_NOUVELLE : 1;
      if (stades > 0) {
        p.stade = Math.min(maxStage(p), p.stade + stades);
        if (isMoonPhase(state, 'croissante') && DATA.LUNE.POUSSE_CHANCE > 0 && p.stade < maxStage(p) && nextRandom(state) * 100 < DATA.LUNE.POUSSE_CHANCE) p.stade += 1;
      }
    }
    p.arrose = false;
    delete p.arroseH;
    n += 1;
  }
  return n;
}

// Heures d'horloge avant que la plante arrosée gagne son stade (null : pas arrosée).
export function growHoursLeft(state, plot) {
  if (!plot || !plot.arrose) return null;
  const debut = Number.isFinite(plot.arroseH) ? plot.arroseH : ((Number(state.day) || 1) - 1) * 24 + DATA.TIME.DAY_START_HOUR;
  return Math.max(0, debut + DATA.TIME.POUSSE_HEURES - absoluteHours(state));
}

/* ---------- Lot 8 : Serre ---------- */

// state.serre = { construit, niveau, parcelles }. Mêmes règles que le Potager
// (arrosage, pousse, récolte).

export function serreUpgradeCost(state) {
  return nextLevelCost(DATA.SERRE.COUT, state.serre.niveau);
}

export function buildSerre(state) {
  const deja = 'La Serre est déjà construite.';
  return buildWith(state, 'serre', { built: state.serre.construit, deja, cost: DATA.SERRE.CONSTRUCTION, libelle: 'Serre' }, () => { openSerre(state); });
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
  return upgradeWith(state, serreUpgradeCost(state), 'Serre agrandie', () => {
    g.niveau += 1;
    const target = DATA.SERRE.PARCELLES[g.niveau - 1];
    for (let n = g.parcelles.length + 1; n <= target; n++) g.parcelles.push(makePlot(n, DATA.SERRE.LIEU));
  });
}
