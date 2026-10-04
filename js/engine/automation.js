import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { currentSeason } from './seasons.js';
import { allDevices, fail, maintainDevice, needsService, tankCapacity } from './devices.js';
import { newNightStats } from './family.js';
import { allPlots, findPlot, harvest, isMature, plant, seedItem, seedStock, water } from './crops.js';
import { feedAllHens, hensToFeed, shear, woolReady } from './animals.js';
import { techAuto, techFlag } from './techtree.js';
import { canSleep } from './night.js';

/* ---------- Lot 7 : automatisations de la nuit ---------- */

export function newAutoReport() {
  return { potager: false, serre: false, poulailler: false, arrosees: 0, sansEau: 0, recoltes: {}, semees: 0, sansGraine: 0, nourries: 0, sansBle: 0, tondus: 0 };
}

// Tâches automatisables par lieu (arbre v2) : un lieu est « automatisé » dès
// qu'une de ses tâches l'est.
export const AUTO_TACHES = {
  potager: ['arrosage', 'recolte', 'semis'],
  serre: ['arrosage', 'recolte', 'semis'],
  poulailler: ['nourrissage'],
  paturage: ['tonte'],
};

export function isAutomated(state, id) {
  return (AUTO_TACHES[id] || []).some((t) => techAuto(state, t, id));
}

// Semis automatique d'une parcelle qui vient d'être récoltée. Renvoie null si
// le semis ne s'applique pas (nœud absent ou parcelle désactivée), true si la
// parcelle est replantée, false s'il n'y a pas de graine au-delà de la réserve
// de semences.
export function autoReplant(state, plot, harvested) {
  if (!techAuto(state, 'semis', plot.lieu)) return null;
  const mode = plot.semis || 'meme';
  if (mode === 'off') return null;
  const culture = mode === 'verrou' && plot.verrou && DATA.crops[plot.verrou] ? plot.verrou : harvested;
  if (!DATA.crops[culture].lieux.includes(plot.lieu)) return false;
  const reserve = state.famille.reserve[seedItem(culture)] || 0;
  if (seedStock(state, culture) - reserve < 1 - EPS) return false;
  return plant(state, plot.id, culture).ok === true;
}

// Réglage du semis automatique d'une parcelle : 'meme', 'off' ou 'verrou' (avec
// la culture à verrouiller, plantable dans ce lieu).
export function setSemis(state, plotId, mode, culture) {
  const plot = findPlot(state, plotId);
  if (!plot) return fail('Parcelle introuvable.');
  if (!['meme', 'off', 'verrou'].includes(mode)) return fail('Réglage inconnu.');
  if (mode === 'verrou') {
    const def = DATA.crops[culture];
    if (!def) return fail('Culture inconnue.');
    if (!def.lieux.includes(plot.lieu)) return fail(`${def.nom} ne se plante pas ici.`);
    plot.verrou = culture;
  } else {
    plot.verrou = null;
  }
  plot.semis = mode;
  return { ok: true };
}

// Étape nocturne (juste après le repas) : automatisations du niveau 5.
// Zone de culture et Serre : récolte des parcelles mûres (sauf celles montées en
// graine), semis automatique, puis arrosage de toutes les parcelles plantées.
// Poulailler : nourrissage. Rien n'est réduit par la productivité ; si l'eau ou
// le blé manquent, on sert ce qu'on peut et le rapport le signale au réveil.
export function autoTasks(state) {
  const rap = newAutoReport();
  const zones = [
    { id: 'potager', plots: state.potager.parcelles },
    { id: 'serre', plots: state.serre && state.serre.construit ? state.serre.parcelles : [] },
  ];
  const prioritaire = !!techFlag(state, 'arrosagePrioritaire');
  for (const zone of zones) {
    const recolte = techAuto(state, 'recolte', zone.id);
    const arrosage = techAuto(state, 'arrosage', zone.id);
    if (!recolte && !arrosage) continue;
    rap[zone.id] = true;
    if (recolte) {
      for (const p of zone.plots) {
        if (!p.culture || !isMature(p) || p.montee) continue;
        const culture = p.culture;
        const r = harvest(state, p.id, true);
        if (!r.ok) continue;
        for (const [item, qty] of Object.entries(r.items)) rap.recoltes[item] = (rap.recoltes[item] || 0) + qty;
        const replanted = autoReplant(state, p, culture);
        if (replanted === true) rap.semees += 1;
        else if (replanted === false) rap.sansGraine += 1;
      }
    }
    if (arrosage) {
      let aArroser = zone.plots.filter((p) => p.culture && !p.arrose && !isMature(p));
      // Gestion intelligente de l'eau : les plantes les plus proches de la récolte d'abord.
      if (prioritaire) aArroser = aArroser.slice().sort((x, y) => (DATA.crops[x.culture].stades - x.stade) - (DATA.crops[y.culture].stades - y.stade));
      for (const p of aArroser) {
        if (water(state, p.id).ok) rap.arrosees += 1;
        else rap.sansEau += 1;
      }
    }
  }
  if (techAuto(state, 'nourrissage', 'poulailler')) {
    rap.poulailler = true;
    if (state.poulailler.poules > 0) {
      const before = state.poulailler.nourries;
      feedAllHens(state, true);
      rap.nourries = state.poulailler.nourries - before;
      rap.sansBle = hensToFeed(state);
    }
  }
  // Tonte planifiée : les moutons dont la laine est prête (avant qu'ils
  // mangent : la laine repart ainsi dès cette nuit).
  if (techAuto(state, 'tonte', 'paturage') && state.paturage && state.paturage.construit) {
    for (const m of state.paturage.moutons) if (woolReady(m) && shear(state, m.id).ok) rap.tondus += 1;
  }
  state.nuit.auto = rap;
  return rap;
}

// Arbre v2 (Récupérateur d'eau de pluie) : chaque nuit, des litres selon la
// saison entrent dans le réservoir, sans électricité, dans la limite de sa place.
export function rainNight(state) {
  const pluie = techFlag(state, 'pluie');
  if (!state.nuit) state.nuit = newNightStats();
  if (!pluie) return 0;
  const ml = Math.min((pluie[currentSeason(state)] || 0) * 1000, Math.max(0, tankCapacity(state) - state.eauMl));
  state.eauMl += ml;
  state.nuit.pluie = Math.floor(ml / 1000);
  return ml;
}

// Arbre v2 (Entretien automatique) : chaque nuit, les appareils à entretenir
// (sans être en panne) le sont, au prix normal, tant que les pièces suffisent.
export function autoMaintain(state) {
  if (!state.nuit) state.nuit = newNightStats();
  state.nuit.entretiens = [];
  if (!techFlag(state, 'entretienAuto')) return [];
  for (const d of allDevices(state)) {
    if (!needsService(d)) continue;
    const r = maintainDevice(state, d.id);
    if (r.ok) state.nuit.entretiens.push({ id: d.id, cost: r.cost });
  }
  return state.nuit.entretiens;
}

// Arbre v2 (Outils de jardin) : « Arroser tout » d'un lieu (au clic : chaque
// parcelle compte comme un arrosage manuel). Renvoie { ok, arrosees, sansEau }.
// Arbre v2 (Routine familiale) : réglage « Dormir tout seul ».
export function setRoutine(state, on) {
  if (on && !techFlag(state, 'routine')) return fail('Débloque la Routine familiale dans l\'Arbre des technologies.');
  state.routine = !!on;
  return { ok: true, routine: state.routine };
}

// La famille va-t-elle se coucher toute seule maintenant ? (jeu ouvert seulement :
// l'interface l'appelle à chaque image ; le hors-ligne ne fait passer aucune nuit)
export function routineDue(state) {
  return !!(state.routine && techFlag(state, 'routine') && canSleep(state));
}

export function waterAll(state, lieu) {
  if (!(techFlag(state, 'actionsGroupees') || []).includes('arroser')) return fail('Débloque les Outils de jardin dans l\'Arbre des technologies.');
  let arrosees = 0;
  let sansEau = 0;
  for (const p of allPlots(state).filter((x) => x.lieu === lieu && x.culture && !x.arrose && !isMature(x))) {
    if (water(state, p.id).ok) arrosees += 1;
    else sansEau += 1;
  }
  if (arrosees === 0 && sansEau === 0) return fail('Rien à arroser.');
  return { ok: true, arrosees, sansEau };
}

// Arbre v2 (Outils de jardin) : « Récolter tout » d'un lieu (au clic, avec la
// productivité). Renvoie { ok, recoltees, items }.
export function harvestAll(state, lieu) {
  if (!(techFlag(state, 'actionsGroupees') || []).includes('recolter')) return fail('Débloque les Outils de jardin dans l\'Arbre des technologies.');
  const items = {};
  let recoltees = 0;
  for (const p of allPlots(state).filter((x) => x.lieu === lieu && x.culture && isMature(x))) {
    const r = harvest(state, p.id);
    if (!r.ok) continue;
    recoltees += 1;
    for (const [item, qty] of Object.entries(r.items)) items[item] = (items[item] || 0) + qty;
  }
  if (recoltees === 0) return fail('Rien à récolter.');
  return { ok: true, recoltees, items };
}
