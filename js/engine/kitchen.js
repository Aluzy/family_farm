import { DATA, ingredientOptions, recipeOutput, recipeOutputQty } from './catalog.js';
import { EPS } from './base.js';
import { efficiency, fail, isBroken, makeDevice, perSecond, spend, tankCapacity } from './devices.js';
import { drawEnergy, loadShedding } from './energy.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { availableEnergy } from './fridge.js';
import { productivity } from './family.js';
import { storeWheat, takeWheat, wheatTotal } from './animals.js';
import { recipeTime, techEffects, techFlag } from './techtree.js';
import { noteRecipeDone } from './campaign.js';
import { gainActionXp } from './levels.js';

// XP d'une préparation terminée, selon l'atelier (version 1.7).
const STATION_XP = { four: 'cuireFour', cuisine: 'cuisiner', moulin: 'moudre', presse: 'presser' };

/* ---------- Lot 5 : stations, recettes, Livre de recette ---------- */

// state.stations = { four|cuisine|moulin|presse: { construit, tache, appareil } }.
// tache : null (libre) ou { recette, resteMs, dureeMs }, en ms à vitesse 1. Au
// Moulin (version 1.1), la tâche porte aussi `enAttente` : le nombre de blés
// déjà sortis du stock qui seront moulus à la suite (voir startMilling()).
// appareil : l'appareil du parc (Moulin, Presse) une fois construit, sinon null.

export function isElectricStation(id) {
  return !!DATA.STATIONS[id].electrique;
}

// Vitesse d'une préparation en % : productivité de la famille (préparations
// lancées à la main) ; pour le Moulin et la Presse, aussi le rendement de l'usure.
export function stationSpeed(state, id) {
  const st = state.stations[id];
  let v = productivity(state);
  if (isElectricStation(id) && st.appareil) v = Math.floor((v * efficiency(st.appareil)) / 100);
  return v;
}

// Secondes réelles restantes d'une préparation, arrondies à la seconde
// supérieure (0 si la station est libre).
export function taskTimeLeft(state, id) {
  const job = state.stations[id].tache;
  if (!job) return 0;
  const v = stationSpeed(state, id);
  return v > 0 ? Math.ceil((job.resteMs * 100) / v / 1000) : Infinity;
}

// Quantité disponible d'un ingrédient : le blé compte celui du Silo.
export function ingredientStock(state, item) {
  return item === DATA.SILO.ITEM ? wheatTotal(state) : countItem(state, item);
}

// Objet choisi pour un ingrédient : le premier de ses options en quantité
// suffisante, ou null.
export function pickIngredient(state, ing) {
  return ingredientOptions(ing).find((item) => ingredientStock(state, item) + EPS >= ing.qte) || null;
}

// Une ligne par ingrédient (puis une pour l'eau) : { options, qte, have, ok, item }.
// `have` est le meilleur stock parmi les options ; `item` l'option retenue.
export function recipeLines(state, id) {
  const r = DATA.recipes[id];
  const lines = r.ingredients.map((ing) => {
    const item = pickIngredient(state, ing);
    const have = Math.max(...ingredientOptions(ing).map((it) => ingredientStock(state, it)));
    return { options: ingredientOptions(ing), qte: ing.qte, have, ok: item !== null, item };
  });
  if (r.eau) lines.push({ eau: true, qte: r.eau, have: Math.floor(state.eauMl / 1000), ok: state.eauMl >= r.eau * 1000, item: null });
  return lines;
}

// État d'une recette pour l'interface : 'absente' (station non construite),
// 'occupee', 'manque' (ingrédients) ou 'pret'.
export function recipeStatus(state, id) {
  const r = DATA.recipes[id];
  const st = state.stations[r.station];
  const lines = recipeLines(state, id);
  let code = 'pret';
  if (!recipeUnlocked(state, id)) code = 'verrouillee';
  else if (!st.construit) code = 'absente';
  else if (st.tache && !queueRoom(state, r.station)) code = 'occupee';
  else if (lines.some((l) => !l.ok)) code = 'manque';
  return { code, lignes: lines, ok: code === 'pret', noeud: recipeNode(id) };
}

// Arbre v2 : une recette est libre (RECETTES_LIBRES) ou débloquée par un nœud.
export function recipeUnlocked(state, id) {
  return DATA.techtree.RECETTES_LIBRES.includes(id) || techEffects(state, 'recettes').some((l) => l.includes(id));
}

// Nœud qui débloque une recette (null si elle est libre).
export function recipeNode(id) {
  if (DATA.techtree.RECETTES_LIBRES.includes(id)) return null;
  return Object.keys(DATA.techtree.noeuds).find((n) => (DATA.techtree.noeuds[n].effet.recettes || []).includes(id)) || null;
}

// Préparations en série : places totales d'un atelier (1 sans le nœud).
export function queueCapacity(state) {
  return Math.max(1, techFlag(state, 'fileAttente') || 1);
}

// Reste-t-il une place dans la file d'un atelier occupé ?
export function queueRoom(state, stationId) {
  const st = state.stations[stationId];
  const used = (st.tache ? 1 : 0) + (Array.isArray(st.file) ? st.file.length : 0);
  return used < queueCapacity(state);
}

// Démarre la préparation `recette` sur un atelier libre.
export function beginTask(state, stationId, recette) {
  const temps = recipeTime(state, recette) * 1000;
  state.stations[stationId].tache = { recette, resteMs: temps, dureeMs: temps };
}

// Annule une préparation en file (pas celle en cours) : ses ingrédients et son
// eau reviennent au stock.
export function cancelQueued(state, stationId, index) {
  const st = state.stations[stationId];
  if (!st || !Array.isArray(st.file) || !st.file[index]) return fail('Rien à annuler.');
  const [entry] = st.file.splice(index, 1);
  for (const p of entry.pris || []) {
    if (p.item === DATA.SILO.ITEM) storeWheat(state, p.qte);
    else addItem(state, p.item, p.qte);
  }
  if (entry.eau) state.eauMl = Math.min(tankCapacity(state), state.eauMl + entry.eau * 1000);
  return { ok: true, recette: entry.recette };
}

export function takeIngredient(state, item, qty) {
  if (item === DATA.SILO.ITEM) takeWheat(state, qty, 'inventaire');
  else takeItem(state, item, qty);
}

// Lance une préparation : la station doit exister et être libre, les
// ingrédients (et l'eau) présents. Tout est vérifié avant de retirer quoi que
// ce soit ; ensuite les ingrédients partent et le minuteur démarre.
export function startRecipe(state, id) {
  const r = DATA.recipes[id];
  if (!r) return fail('Recette inconnue.');
  // Version 1.1 : le blé se moud dans le Moulin lui-même (startMilling()).
  if (r.horsLivre) return fail('Le blé se moud directement au Moulin.');
  const def = DATA.STATIONS[r.station];
  const st = state.stations[r.station];
  if (!recipeUnlocked(state, id)) {
    const n = DATA.techtree.noeuds[recipeNode(id)];
    return fail(`Recette à débloquer dans l'Arbre des technologies${n ? ` (${n.nom})` : ''}.`);
  }
  if (!st.construit) return fail(`Construis d'abord ${def.article} ${def.nom}.`);
  if (st.tache && !queueRoom(state, r.station)) return fail(`${def.nom} : une préparation est déjà en cours.`);
  const lines = recipeLines(state, id);
  const missing = lines.find((l) => !l.ok);
  if (missing) return fail(missing.eau ? 'Pas assez d\'eau dans le réservoir.' : 'Il manque des ingrédients.');
  const pris = [];
  for (const l of lines) {
    if (l.eau) state.eauMl = Math.max(0, state.eauMl - l.qte * 1000);
    else {
      takeIngredient(state, l.item, l.qte);
      pris.push({ item: l.item, qte: l.qte });
    }
  }
  // Arbre v2 : atelier occupé mais file disponible, la préparation attend son
  // tour (ingrédients déjà réservés).
  if (st.tache) {
    if (!Array.isArray(st.file)) st.file = [];
    st.file.push({ recette: id, pris, eau: r.eau || 0 });
    return { ok: true, recette: id, enFile: true };
  }
  // Lot 7 : les paliers « Préparation rapide » raccourcissent la préparation à
  // son lancement (une préparation déjà en cours garde son temps).
  beginTask(state, r.station, id);
  return { ok: true, recette: id };
}

// Termine la préparation d'une station : le produit entre dans l'inventaire
// (et son sous-produit : la paille du blé moulu) et la station se libère.
// Renvoie { item, qty, sousProduit, suite } (ou null si la station était
// libre) ; `suite` : la même préparation repart aussitôt, parce qu'il restait
// du blé en attente au Moulin.
export function completeTask(state, id) {
  const st = state.stations[id];
  if (!st.tache) return null;
  const recette = st.tache.recette;
  const enAttente = Math.max(0, Math.floor(Number(st.tache.enAttente) || 0));
  const item = recipeOutput(recette);
  const qty = recipeOutputQty(recette);
  addItem(state, item, qty);
  const extra = DATA.recipes[recette].sousProduit || null;
  if (extra) addItem(state, extra.item, extra.qte);
  st.tache = null;
  noteRecipeDone(state, recette, qty); // Lot 9
  gainActionXp(state, STATION_XP[id] || '', 1);
  if (enAttente > 0) {
    // Moulin : le blé suivant du lot se moud à la suite.
    beginTask(state, id, recette);
    st.tache.enAttente = enAttente - 1;
  } else if (Array.isArray(st.file) && st.file.length) {
    // Arbre v2 : la préparation suivante de la file démarre toute seule.
    beginTask(state, id, st.file.shift().recette);
  }
  return { item, qty, sousProduit: extra ? { item: extra.item, qty: extra.qte } : null, suite: enAttente > 0 };
}

/* -- version 1.1 : le Moulin moud le blé par quantité -- */

// Blés confiés au Moulin et pas encore moulus : celui en cours et ceux en attente.
export function millPending(state) {
  const job = state.stations && state.stations.moulin ? state.stations.moulin.tache : null;
  return job ? 1 + Math.max(0, Math.floor(Number(job.enAttente) || 0)) : 0;
}

// Secondes réelles pour finir tout le blé confié au Moulin, à sa vitesse
// actuelle et s'il ne manque pas d'énergie (0 s'il est libre).
export function millTimeLeft(state) {
  const job = state.stations.moulin.tache;
  if (!job) return 0;
  const v = stationSpeed(state, 'moulin');
  if (!(v > 0)) return Infinity;
  const ms = job.resteMs + (millPending(state) - 1) * recipeTime(state, job.recette) * 1000;
  return Math.ceil((ms * 100) / v / 1000);
}

// Moud `qty` blés au Moulin : 1 blé donne 1 farine et 1 paille, en 5 s chacun
// (mêmes temps, énergie et usure qu'une préparation du Moulin). Tout le blé
// demandé sort du stock tout de suite (l'inventaire d'abord, puis le Silo) ; il
// se moud un par un, et la farine et la paille arrivent au fur et à mesure. Si
// le Moulin tourne déjà, le blé s'ajoute à la suite. Refusé si le Moulin n'est
// pas construit, si la quantité n'est pas un entier d'au moins 1, ou s'il n'y a
// pas assez de blé.
export function startMilling(state, qty = 1) {
  const st = state.stations.moulin;
  const def = DATA.STATIONS.moulin;
  if (!st.construit) return fail(`Construis d'abord ${def.article} ${def.nom}.`);
  const n = Math.floor(Number(qty));
  if (!Number.isFinite(n) || n < 1) return fail('Choisis une quantité de blé.');
  const recette = 'farine';
  const parBle = DATA.recipes[recette].ingredients[0].qte;
  if (wheatTotal(state) + EPS < n * parBle) return fail('Pas assez de blé.');
  takeWheat(state, n * parBle, 'inventaire');
  if (st.tache) {
    st.tache.enAttente = Math.max(0, Math.floor(Number(st.tache.enAttente) || 0)) + n;
  } else {
    beginTask(state, 'moulin', recette);
    st.tache.enAttente = n - 1;
  }
  return { ok: true, quantite: n, enAttente: st.tache.enAttente };
}

// Reprend le blé en attente au Moulin (pas celui qui est en train d'être
// moulu) : il retourne au stock, Silo d'abord.
export function cancelMilling(state) {
  const job = state.stations.moulin.tache;
  const n = job ? Math.max(0, Math.floor(Number(job.enAttente) || 0)) : 0;
  if (n <= 0) return fail('Aucun blé en attente au Moulin.');
  job.enAttente = 0;
  storeWheat(state, n * DATA.recipes[job.recette].ingredients[0].qte);
  return { ok: true, rendu: n };
}

// Four et Cuisine : le minuteur avance à la vitesse de la famille, sans énergie.
export function runCooking(state, dtMs) {
  if (!state.stations) return;
  for (const id of Object.keys(DATA.STATIONS)) {
    if (isElectricStation(id)) continue;
    const st = state.stations[id];
    if (!st.construit || !st.tache) continue;
    st.tache.resteMs -= Math.floor((dtMs * stationSpeed(state, id)) / 100);
    if (st.tache.resteMs <= 0) completeTask(state, id);
  }
}

// Moulin et Presse : appareils électriques au sens du Lot 1. Ils tirent leur
// énergie par drawEnergy (batteries en sens inverse). Éteints ou en panne, ils
// ne font rien ; sans énergie, ils sont en pause ; avec peu d'énergie, ils
// avancent au prorata. Ils s'usent seulement quand ils tournent (voir tick).
export function runElectricStation(state, id, dtMs) {
  const st = state.stations && state.stations[id];
  if (!st || !st.appareil) return;
  const d = st.appareil;
  d.conso = 0;
  if (!st.tache || !d.allume || isBroken(d)) return;
  const speed = stationSpeed(state, id);
  if (!(speed > 0)) return;
  if (loadShedding(state)) return; // arbre v2 : délestage
  // ms de marche nécessaires pour finir, puis ms que l'énergie disponible
  // permet (whParS Wh/s = whParS mWh par ms).
  const whParS = DATA.STATIONS[id].whParS;
  let left = dtMs;
  let got = 0;
  while (left > 0 && st.tache) {
    const job = st.tache;
    const needMs = Math.ceil((job.resteMs * 100) / speed);
    const runMs = Math.min(left, needMs, Math.floor(availableEnergy(state) / whParS));
    if (runMs <= 0) break;
    got += drawEnergy(state, runMs * whParS);
    job.resteMs = runMs >= needMs ? 0 : job.resteMs - Math.floor((runMs * speed) / 100);
    left -= runMs;
    if (job.resteMs > 0) break;
    // Un lot de blé au Moulin : le blé suivant profite du temps qui reste dans ce pas.
    const out = completeTask(state, id);
    if (!out || !out.suite) break;
  }
  d.conso = perSecond(got, dtMs);
}

// Étape nocturne : toute préparation en cours se termine immédiatement, puis
// celles de la file (arbre v2). Au Moulin, seul le blé en train d'être moulu se
// termine : le blé en attente reste au Moulin et reprend au réveil (sinon un
// gros lot lancé juste avant de dormir serait moulu sans électricité ni usure).
export function finishPreparations(state) {
  const done = {};
  const add = (item, qty) => { done[item] = (done[item] || 0) + qty; };
  if (state.stations) {
    for (const id of Object.keys(DATA.STATIONS)) {
      for (let out = completeTask(state, id); out; out = completeTask(state, id)) {
        add(out.item, out.qty);
        if (out.sousProduit) add(out.sousProduit.item, out.sousProduit.qty);
        if (out.suite) break;
      }
    }
  }
  state.nuit.termine = done;
  return done;
}

// Construit une station. Le Four ouvre l'onglet Livre de recette ; la Cuisine
// demande le Four ; le Moulin et la Presse deviennent des appareils du parc.
export function buildStation(state, id) {
  const def = DATA.STATIONS[id];
  if (!def) return fail('Atelier inconnu.');
  const st = state.stations[id];
  if (st.construit) return fail('Cet atelier est déjà construit.');
  if (def.requiert && !state.stations[def.requiert].construit) {
    const need = DATA.STATIONS[def.requiert];
    return fail(`Construis d'abord ${need.article} ${need.nom}.`);
  }
  if (state.pieces + EPS < def.cout) return fail('Pas assez de pièces.');
  spend(state, def.cout);
  openStation(state, id);
  return { ok: true, cost: def.cout };
}

// Pose la station dans l'état (sans payer) : appareil pour les stations
// électriques, onglets débloqués.
export function openStation(state, id) {
  const def = DATA.STATIONS[id];
  const st = state.stations[id];
  st.construit = true;
  if (def.electrique && !st.appareil) st.appareil = makeDevice(id, id, def.cout);
  for (const tab of def.debloque || []) {
    if (!state.unlockedTabs.includes(tab)) state.unlockedTabs.push(tab);
  }
}
