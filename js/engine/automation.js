import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { allDevices, fail, maintainDevice, needsService, tankCapacity } from './devices.js';
import { newNightStats } from './family.js';
import { allPlots, boltSeedYield, findPlot, harvest, isMature, maxStage, plant, plotZone, seedItem, seedStock, toggleBolting, water, zone2Plots } from './crops.js';
import { feedAllHens, hensToFeed, shear, woolReady } from './animals.js';
import { techAuto, techFlag } from './techtree.js';
import { canSleep } from './night.js';

/* ---------- Lot 7 : automatisations de la nuit ---------- */

export function newAutoReport() {
  return { potager: false, serre: false, poulailler: false, arrosees: 0, sansEau: 0, recoltes: {}, semees: 0, sansGraine: 0, nourries: 0, sansBle: 0, tondus: 0, montees: 0, attendent: 0 };
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

// Culture que le semis automatique replante sur une parcelle dont on vient de récolter
// `harvested` : la même, ou la culture verrouillée ; null si le semis est désactivé.
export function replantCulture(plot, harvested) {
  const mode = plot.semis || 'meme';
  if (mode === 'off') return null;
  return mode === 'verrou' && plot.verrou && DATA.crops[plot.verrou] ? plot.verrou : harvested;
}

// Semis automatique d'une parcelle qui vient d'être récoltée. Renvoie null si
// le semis ne s'applique pas (nœud absent ou parcelle désactivée), true si la
// parcelle est replantée, false s'il n'y a pas de graine au-delà de la réserve
// de semences.
export function autoReplant(state, plot, harvested) {
  if (!techAuto(state, 'semis', plot.lieu)) return null;
  const culture = replantCulture(plot, harvested);
  if (!culture) return null;
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

/* ---------- Montée en graine automatique ---------- */

// Une culture qui ne rend pas ses graines à la récolte (la carotte, mode 'montee') les
// épuise à chaque semis automatique. Le plan dit combien de parcelles mûres doivent
// monter en graine cette nuit pour que le stock suffise à tout replanter.
//
//   besoin     : parcelles que le semis automatique replantera avec cette culture
//   disponible : graines en stock au-delà de la réserve de semences
//   attendu    : graines que rendront les parcelles déjà en montée (q chacune)
//
// Le stock doit couvrir le besoin :  disponible + attendu + q × n ≥ besoin. On en déduit
// le nombre n de parcelles mûres à laisser monter en graine : n = ⌈(besoin − disponible −
// attendu) / q⌉, au plus le nombre de parcelles mûres. Si elles ne suffisent pas, les
// suivantes seront choisies les nuits d'après.
// Seules les parcelles dont la récolte et le semis sont automatiques, mûres et replantées
// avec cette même culture, peuvent monter en graine. Renvoie null pour une culture qui
// rend ses graines à la récolte.
export function boltingPlan(state, culture) {
  const def = DATA.crops[culture];
  if (!def || def.graines.mode !== 'montee') return null;
  const q = boltSeedYield(state, culture);
  const reserve = state.famille.reserve[seedItem(culture)] || 0;
  let besoin = 0;
  let enMontee = 0;
  const candidats = [];
  for (const p of allPlots(state)) {
    if (!p.culture || !techAuto(state, 'recolte', p.lieu) || !techAuto(state, 'semis', p.lieu)) continue;
    const replantee = replantCulture(p, p.culture) === culture;
    if (replantee) besoin += 1;
    if (p.culture !== culture) continue;
    if (p.montee) enMontee += 1;
    else if (replantee && isMature(p)) candidats.push(p.id);
  }
  const disponible = seedStock(state, culture) - reserve;
  const attendu = q * enMontee;
  const manque = besoin - disponible - attendu;
  const aMonter = Math.min(candidats.length, manque > 0 ? Math.ceil(manque / q) : 0);
  return { culture, graines: q, besoin, disponible, attendu, aMonter, parcelles: candidats.slice(0, aMonter) };
}

// Une parcelle mûre d'une culture qui ne rend pas ses graines n'est récoltée que si le
// semis automatique peut la replanter ; sinon elle resterait vide. Elle attend, mûre,
// que des graines arrivent : celles d'une parcelle montée en graine (voir boltingPlan).
function waitsForSeed(state, plot) {
  const culture = plot.culture;
  const def = DATA.crops[culture];
  if (!def || def.graines.mode !== 'montee' || plot.montee) return false;
  if (!techAuto(state, 'semis', plot.lieu) || replantCulture(plot, culture) !== culture) return false;
  const reserve = state.famille.reserve[seedItem(culture)] || 0;
  return seedStock(state, culture) - reserve < 1 - EPS;
}

// Applique le plan de chaque culture concernée ; compte les parcelles passées en montée.
export function autoBolting(state, rap) {
  for (const culture of Object.keys(DATA.crops)) {
    const plan = boltingPlan(state, culture);
    if (!plan) continue;
    for (const id of plan.parcelles) {
      if (toggleBolting(state, id).ok) rap.montees += 1;
    }
  }
}

// Étape nocturne (juste après le repas) : automatisations du niveau 5.
// Zone de culture et Serre : récolte des parcelles mûres (celles qui montent en graine
// le sont à leur tour, graines comprises), semis automatique, puis arrosage de toutes
// les parcelles plantées. Avant la récolte, les carottes à laisser monter en graine
// sont choisies (voir boltingPlan).
// Poulailler : nourrissage. Rien n'est réduit par la productivité ; si l'eau ou
// le blé manquent, on sert ce qu'on peut et le rapport le signale au réveil.
export function autoTasks(state) {
  const rap = newAutoReport();
  autoBolting(state, rap);
  const zones = [
    { id: 'potager', plots: [...state.potager.parcelles, ...zone2Plots(state)] }, // la Zone de culture et le Champ
    { id: 'serre', plots: state.serre && state.serre.construit ? state.serre.parcelles : [] },
  ];
  const prioritaire = !!techFlag(state, 'arrosagePrioritaire');
  for (const zone of zones) {
    const recolte = techAuto(state, 'recolte', zone.id);
    const arrosage = techAuto(state, 'arrosage', zone.id);
    if (!recolte && !arrosage) continue;
    rap[zone.id] = true;
    if (recolte) {
      // Les parcelles montées en graine d'abord : leurs graines servent aux semis des autres.
      const ordre = zone.plots.slice().sort((x, y) => Number(!!y.montee) - Number(!!x.montee));
      for (const p of ordre) {
        if (!p.culture || !isMature(p)) continue;
        if (waitsForSeed(state, p)) {
          rap.attendent += 1;
          continue;
        }
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
      if (prioritaire) aArroser = aArroser.slice().sort((x, y) => (maxStage(x) - x.stade) - (maxStage(y) - y.stade));
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

// Arbre v2 (Récupérateur d'eau de pluie) : chaque nuit, `pluie` litres entrent
// dans le réservoir, sans électricité, dans la limite de sa place.
export function rainNight(state) {
  const pluie = techFlag(state, 'pluie');
  if (!state.nuit) state.nuit = newNightStats();
  if (!pluie) return 0;
  const ml = Math.min(pluie * 1000, Math.max(0, tankCapacity(state) - state.eauMl));
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

// `zone` (facultatif) : 1 pour la Zone de culture seule, 2 pour le Champ seul.
const inZone = (lieu, zone) => (p) => p.lieu === lieu && (!zone || plotZone(p) === Number(zone));

export function waterAll(state, lieu, zone) {
  if (!(techFlag(state, 'actionsGroupees') || []).includes('arroser')) return fail('Débloque les Outils de jardin dans l\'Arbre des technologies.');
  let arrosees = 0;
  let sansEau = 0;
  for (const p of allPlots(state).filter(inZone(lieu, zone)).filter((x) => x.culture && !x.arrose && !isMature(x))) {
    if (water(state, p.id).ok) arrosees += 1;
    else sansEau += 1;
  }
  if (arrosees === 0 && sansEau === 0) return fail('Rien à arroser.');
  return { ok: true, arrosees, sansEau };
}

// Arbre v2 (Outils de jardin) : « Récolter tout » d'un lieu (au clic, avec la
// productivité). Renvoie { ok, recoltees, items }.
export function harvestAll(state, lieu, zone) {
  if (!(techFlag(state, 'actionsGroupees') || []).includes('recolter')) return fail('Débloque les Outils de jardin dans l\'Arbre des technologies.');
  const items = {};
  let recoltees = 0;
  for (const p of allPlots(state).filter(inZone(lieu, zone)).filter((x) => x.culture && isMature(x))) {
    const r = harvest(state, p.id);
    if (!r.ok) continue;
    recoltees += 1;
    for (const [item, qty] of Object.entries(r.items)) items[item] = (items[item] || 0) + qty;
  }
  if (recoltees === 0) return fail('Rien à récolter.');
  return { ok: true, recoltees, items };
}
