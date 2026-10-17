import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { allDevices, fail, maintainDevice, needsService, NO_COINS, pay, perSecond, perTick, tankCapacity } from './devices.js';
import { drawEnergy, loadShedding } from './energy.js';
import { availableEnergy } from './fridge.js';
import { newNightStats } from './family.js';
import { allPlots, findPlot, harvest, harvestPlot, isMature, maxStage, noteWateredPlots, plant, plantPlot, plotZone, seedItem, seedStock, waterPlot, zone2Plots } from './crops.js';
import { plantableCropsFor } from './campaign.js';
import { feedAllHens, hensToFeed, shear, woolReady } from './animals.js';
import { techAuto, techFlag } from './techtree.js';
import { absoluteHours, hourOfDay, nightActive } from './clock.js';

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
  verger: ['recolte'], // version 1.13 : la Récolte du verger (dans growOrchard)
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
  return plant(state, plot.id, culture, true).ok === true;
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

// Le réseau d'irrigation : tous les jours à TIME.ARROSAGE_HEURE (7 h), les asperseurs des
// lieux qui ont l'arrosage automatique arrosent les plantes qui ont soif, avec l'eau du
// réservoir (comme au clic ; la Gestion intelligente de l'eau sert d'abord les plantes les
// plus proches de la récolte). Ensuite, jusqu'au soir, ils repassent pour toute plante qui
// a soif à son tour (semée après 7 h, par le robot ou à la main ; ou dont le cycle, commencé
// plus tard la veille, vient de finir), au plus tôt quand ils ont fini de tourner. Appelée à
// chaque pas d'horloge (tick, sleep, simulateOffline). Sur la carte, les asperseurs tournent
// ARROSAGE_S secondes (state.irrigation = { jour, h, cases : celles de ce passage, faites :
// celles du jour, arrosees, sansEau }).
// Renvoie { arrosees, sansEau } (ce passage), ou null s'il n'y a pas de passage.
function thirstyPlots(state) {
  const prioritaire = !!techFlag(state, 'arrosagePrioritaire');
  const out = [];
  for (const lieu of ['potager', 'serre']) {
    if (!techAuto(state, 'arrosage', lieu)) continue;
    if (lieu === 'serre' && !(state.serre && state.serre.construit)) continue;
    let soif = allPlots(state).filter((p) => p.lieu === lieu && p.culture && !p.arrose && !isMature(p));
    if (prioritaire) soif = soif.slice().sort((x, y) => (maxStage(x) - x.stade) - (maxStage(y) - y.stade));
    out.push(...soif);
  }
  return out;
}

export function irrigate(state) {
  if (nightActive(state) || hourOfDay(state) < DATA.TIME.ARROSAGE_HEURE || hourOfDay(state) >= DATA.TIME.NIGHT_HOUR) return null;
  const I = state.irrigation;
  const dejaCeJour = !!I && I.jour === state.day;
  const now = absoluteHours(state);
  if (dejaCeJour && (now - I.h) * DATA.TIME.CLOCK_SECONDS_PER_HOUR < DATA.TIME.ARROSAGE_S) return null;
  const soif = thirstyPlots(state);
  if (dejaCeJour && !soif.length) return null;
  const faites = [];
  let sansEau = 0;
  for (const p of soif) {
    if (waterPlot(state, p, true, false).ok) faites.push(p);
    else sansEau += 1;
  }
  if (faites.length) noteWateredPlots(state); // le record, une fois pour tout le passage
  // un repassage sans eau ne fait pas tourner les asperseurs (ni ne recommence aussitôt)
  if (dejaCeJour && !faites.length) { I.sansEau = sansEau; I.h = now; I.cases = []; return { arrosees: 0, sansEau }; }
  const cases = faites.filter((p) => p.lieu === 'potager' && Number.isInteger(p.case)).map((p) => p.case);
  state.irrigation = {
    jour: state.day, h: now, cases,
    faites: (dejaCeJour ? I.faites || I.cases || [] : []).concat(cases),
    arrosees: (dejaCeJour ? I.arrosees || 0 : 0) + faites.length, sansEau,
  };
  return { arrosees: faites.length, sansEau };
}

// Le robot de la ferme : avec la récolte ou le semis automatiques, tous les jours à
// ROBOT.HEURE (6 h) il dresse sa liste de tâches (récolter chaque parcelle mûre de la Zone de
// culture et de la Serre ; après chaque récolte, si le semis automatique est acquis, la
// replanter) et l'exécute dans l'ordre : pour chaque tâche, il roule jusqu'à la parcelle
// (robotTrip, à ROBOT.VITESSE tuiles par minute d'horloge) puis travaille ROBOT.MINUTES minutes.
// state.robot = { jour, taches: [{ t: 'recolter' | 'planter', id, c }], i (tâches faites),
// debut (heure absolue du début de la tâche en cours), recoltes, semees, sansGraine, dernier,
// charge (rentré se recharger), base (la tâche qui part de sa station), pannes }.
// Chaque tâche faite vide sa batterie (robotBattery) ; vide, il rentre à sa station.
// La carte le montre aller de parcelle en parcelle. Appelée à chaque pas d'horloge, le jour.
export function robotOn(state) {
  return ['potager', 'serre'].some((l) => techAuto(state, 'recolte', l) || techAuto(state, 'semis', l));
}

function robotTasks(state) {
  const taches = [];
  for (const lieu of ['potager', 'serre']) {
    if (!techAuto(state, 'recolte', lieu)) continue;
    if (lieu === 'serre' && !(state.serre && state.serre.construit)) continue;
    for (const p of allPlots(state)) if (p.lieu === lieu && p.culture && isMature(p)) taches.push({ t: 'recolter', id: p.id });
  }
  return taches;
}

// Où il se tient pour une parcelle (en tuiles) : à gauche de sa case dans la Zone de culture,
// devant la porte de la Serre pour celles de la Serre.
function robotSpot(state, id) {
  const p = findPlot(state, id);
  if (p && p.lieu === 'potager' && Number.isInteger(p.case)) {
    const W = DATA.TERRAIN.LARGEUR;
    return [(p.case % W) - 0.2, Math.floor(p.case / W) + 0.95];
  }
  return DATA.ROBOT.SERRE;
}

// La tâche i : { route, travail } en heures d'horloge (le trajet depuis la tâche d'avant, ou
// depuis sa base pour la première, puis le travail au bras).
export function robotTrip(state, r, i) {
  const R = DATA.ROBOT;
  const a = i > 0 && i !== r.base ? robotSpot(state, r.taches[i - 1].id) : R.BASE;
  const b = robotSpot(state, r.taches[i].id);
  return { route: Math.hypot(b[0] - a[0], b[1] - a[1]) / R.VITESSE / 60, travail: R.MINUTES / 60 };
}

/* ---------- la batterie du robot et sa station de charge ---------- */

// state.robotBatterie = { mwh (sa charge), paliers (d'autonomie achetés), conso (mWh/s pris
// à la station au dernier pas) } ; créée pleine au premier besoin.
export function robotBattery(state) {
  if (!state.robotBatterie || typeof state.robotBatterie !== 'object') state.robotBatterie = { mwh: null, paliers: 0, conso: 0 };
  const b = state.robotBatterie;
  b.paliers = Math.max(0, Math.min(DATA.ROBOT.BATTERIE.PALIERS_MAX, Math.floor(Number(b.paliers) || 0)));
  if (!Number.isFinite(b.mwh)) b.mwh = robotCapacity(state);
  b.mwh = Math.max(0, Math.min(robotCapacity(state), b.mwh));
  return b;
}

// L'autonomie, en % (100 + PALIER_PCT par palier acheté).
export function robotAutonomy(state) {
  const B = DATA.ROBOT.BATTERIE;
  const n = state.robotBatterie ? Math.floor(Number(state.robotBatterie.paliers) || 0) : 0;
  return 100 + B.PALIER_PCT * Math.max(0, Math.min(B.PALIERS_MAX, n));
}

// La capacité de sa batterie (mWh) et ce qu'elle tient de tâches, pleine.
export function robotCapacity(state) {
  const B = DATA.ROBOT.BATTERIE;
  return Math.round((B.TACHES * B.WH_TACHE * 1000 * robotAutonomy(state)) / 100);
}

export function robotTaskCapacity(state) {
  return Math.floor(robotCapacity(state) / (DATA.ROBOT.BATTERIE.WH_TACHE * 1000) + EPS);
}

// Sa charge, en % de sa capacité (arrondi vers le bas), et les tâches qu'elle tient encore.
export function robotChargePct(state) {
  const b = robotBattery(state);
  return Math.floor((b.mwh * 100) / robotCapacity(state) + EPS);
}

export function robotTasksLeft(state) {
  return Math.floor(robotBattery(state).mwh / (DATA.ROBOT.BATTERIE.WH_TACHE * 1000) + EPS);
}

// Il a du travail en cours (il n'est pas à sa station) : sa liste du jour est commencée, pas
// finie, et il n'est pas rentré se recharger.
export function robotBusy(state) {
  const r = state.robot;
  if (nightActive(state) || !robotOn(state) || !r || r.jour !== state.day || r.charge) return false;
  return r.i < r.taches.length && absoluteHours(state) + EPS >= ((Number(state.day) || 1) - 1) * 24 + DATA.ROBOT.HEURE;
}

// Consommateur d'électricité (energy.js, CONSUMERS) : à sa station, il recharge sa batterie
// (CHARGE_WH_S Wh/s, dans la limite de l'énergie disponible et de la place).
export function runRobotCharge(state, dtMs) {
  if (!robotOn(state)) return;
  const b = robotBattery(state);
  b.conso = 0;
  if (robotBusy(state) || loadShedding(state)) return;
  const room = robotCapacity(state) - b.mwh;
  if (room <= 0) return;
  const want = Math.min(room, perTick(DATA.ROBOT.BATTERIE.CHARGE_WH_S * 1000, dtMs), availableEnergy(state));
  if (want <= 0) return;
  const got = drawEnergy(state, want);
  b.mwh += got;
  b.conso = perSecond(got, dtMs);
}

// Étape nocturne (après le frigo) : la nuit, il se recharge sur les batteries de la ferme, autant
// qu'elles le peuvent. Rapport : state.nuit.robot (mWh pris).
export function robotNight(state) {
  if (!robotOn(state)) return 0;
  const b = robotBattery(state);
  const want = Math.min(robotCapacity(state) - b.mwh, availableEnergy(state));
  if (want <= 0) return 0;
  const saved = state.batteries.map((x) => x.sortie);
  const got = drawEnergy(state, want);
  state.batteries.forEach((x, i) => { x.sortie = saved[i]; });
  b.mwh += got;
  if (state.nuit) state.nuit.robot = got;
  return got;
}

// Un palier d'autonomie de plus (+PALIER_PCT %, PALIER_PRIX pièces) : la batterie grandit, la
// place gagnée est vide.
export function upgradeRobotBattery(state) {
  const B = DATA.ROBOT.BATTERIE;
  if (!robotOn(state)) return fail('Il faut d\'abord le robot (récolte ou semis automatiques).');
  const b = robotBattery(state);
  if (b.paliers >= B.PALIERS_MAX) return fail('Autonomie maximale atteinte.');
  if (!pay(state, B.PALIER_PRIX, 'Robot : autonomie')) return fail(NO_COINS);
  b.paliers += 1;
  return { ok: true, cost: B.PALIER_PRIX, autonomie: robotAutonomy(state) };
}

function robotDo(state, r, tache) {
  const p = findPlot(state, tache.id);
  r.dernier = { i: r.i, t: tache.t, id: tache.id, items: null };
  if (!p) return;
  if (tache.t === 'recolter') {
    if (!p.culture || !isMature(p)) return;   // le joueur l'a récoltée entre-temps
    const culture = p.culture;
    const res = harvest(state, p.id, true);
    if (!res.ok) return;
    r.dernier.items = res.items;
    for (const [item, qty] of Object.entries(res.items)) r.recoltes[item] = (r.recoltes[item] || 0) + qty;
    // la replanter juste après, si le semis automatique de ce lieu le veut
    if (techAuto(state, 'semis', p.lieu) && replantCulture(p, culture)) r.taches.splice(r.i + 1, 0, { t: 'planter', id: p.id, c: culture });
    return;
  }
  if (p.culture) return;                     // déjà replantée (à la main)
  const ok = autoReplant(state, p, tache.c);
  if (ok === true) r.semees += 1;
  else if (ok === false) r.sansGraine += 1;
}

export function robotStep(state) {
  if (nightActive(state) || !robotOn(state)) return 0;
  const R = DATA.ROBOT;
  const debutJour = ((Number(state.day) || 1) - 1) * 24 + R.HEURE;
  const now = absoluteHours(state);
  if (now < debutJour) return 0;
  let r = state.robot;
  if (!r || r.jour !== state.day) {
    r = state.robot = { jour: state.day, taches: robotTasks(state), i: 0, debut: debutJour, recoltes: {}, semees: 0, sansGraine: 0, dernier: null };
  }
  let n = 0;
  const B = DATA.ROBOT.BATTERIE;
  const bat = robotBattery(state);
  // rentré se recharger : il repart (de sa station) quand sa batterie est assez pleine
  if (r.charge) {
    if (bat.mwh * 100 + EPS < robotCapacity(state) * B.REPRISE) return 0;
    r.charge = false;
    r.base = r.i;
    r.debut = now;
  }
  while (r.i < r.taches.length) {
    // pas assez de batterie pour cette tâche : il rentre à sa station
    if (bat.mwh + EPS < B.WH_TACHE * 1000) {
      r.charge = true;
      r.pannes = (r.pannes || 0) + 1;
      break;
    }
    const d = robotTrip(state, r, r.i);
    if (now + EPS < r.debut + d.route + d.travail) break;
    robotDo(state, r, r.taches[r.i]);
    bat.mwh = Math.max(0, bat.mwh - B.WH_TACHE * 1000);
    r.i += 1;
    r.debut += d.route + d.travail;
    n += 1;
  }
  return n;
}

// Étape nocturne (juste après le repas) : automatisations du niveau 5.
// Zone de culture et Serre : plus rien la nuit (la récolte et le semis automatiques sont
// le travail du robot, à partir de 6 h : robotStep ; l'arrosage, celui des asperseurs, à 7 h :
// irrigate).
// Poulailler : nourrissage. Rien n'est réduit par la productivité ; si l'eau ou
// le blé manquent, on sert ce qu'on peut et le rapport le signale au réveil.
export function autoTasks(state) {
  const rap = newAutoReport();
  const zones = [
    { id: 'potager', plots: [...state.potager.parcelles, ...zone2Plots(state)] }, // la Zone de culture et le Champ
    { id: 'serre', plots: state.serre && state.serre.construit ? state.serre.parcelles : [] },
  ];
  for (const zone of zones) {
    const recolte = techAuto(state, 'recolte', zone.id);
    const arrosage = techAuto(state, 'arrosage', zone.id);
    if (!recolte && !arrosage) continue;
    rap[zone.id] = true;
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
    for (const m of state.paturage.moutons) if (woolReady(m) && shear(state, m.id, true).ok) rap.tondus += 1;
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
// `zone` (facultatif) : 1 pour la Zone de culture seule, 2 pour le Champ seul.
const inZone = (lieu, zone) => (p) => p.lieu === lieu && (!zone || plotZone(p) === Number(zone));

// Fluidité (FLU-10) : disponible dès le niveau 1, même eau, énergie et XP qu'à la main.
// Arbre v2 (Outils de jardin) : ces actions groupées coûtent `groupeEconome` % d'énergie en
// moins (rendus après coup).
function groupDiscount(state, before) {
  const pct = techFlag(state, 'groupeEconome') || 0;
  const spent = before - (Number(state.energie) || 0);
  if (pct > 0 && spent > 0) state.energie += Math.floor((spent * pct) / 100);
}

export function waterAll(state, lieu, zone) {
  const before = Number(state.energie) || 0;
  let arrosees = 0;
  let sansEau = 0;
  let raison = '';
  for (const p of allPlots(state).filter(inZone(lieu, zone)).filter((x) => x.culture && !x.arrose && !isMature(x))) {
    const r = waterPlot(state, p, false, false);
    if (r.ok) arrosees += 1;
    else { sansEau += 1; raison = raison || r.error; }
  }
  if (arrosees) noteWateredPlots(state); // le record, une fois pour tout le lot
  groupDiscount(state, before);
  if (arrosees === 0 && sansEau === 0) return fail('Rien à arroser.');
  if (arrosees === 0) return fail(raison);
  return { ok: true, arrosees, sansEau, raison };
}

// FLU-09 : « Planter partout » : la même culture sur toutes les parcelles vides d'un lieu
// (d'une zone), dans la limite des graines, de l'énergie et du niveau. Même énergie et XP
// que N plantations à la main. Renvoie { ok, plantees, vides, raison } (raison de l'arrêt).
export function plantAll(state, lieu, culture, zone) {
  if (!DATA.crops[culture]) return fail('Culture inconnue.');
  if (!plantableCropsFor(state, lieu).includes(culture)) return fail(`${DATA.crops[culture].nom} ne se plante pas encore ici.`);
  const vides = allPlots(state).filter(inZone(lieu, zone)).filter((x) => !x.culture);
  if (!vides.length) return fail('Aucune parcelle vide.');
  const before = Number(state.energie) || 0;
  let plantees = 0;
  let raison = '';
  for (const p of vides) {
    const r = plantPlot(state, p, culture);
    if (!r.ok) { raison = r.error; break; }
    plantees += 1;
  }
  groupDiscount(state, before);
  if (!plantees) return fail(raison);
  return { ok: true, plantees, vides: vides.length, raison };
}

// Arbre v2 (Outils de jardin) : « Récolter tout » d'un lieu (au clic, avec la
// productivité). Renvoie { ok, recoltees, items }.
export function harvestAll(state, lieu, zone) {
  const before = Number(state.energie) || 0;
  const items = {};
  let recoltees = 0;
  let raison = '';
  let aRamasser = false; // version 1.18 : au moins une récolte attend le personnage
  for (const p of allPlots(state).filter(inZone(lieu, zone)).filter((x) => x.culture && isMature(x))) {
    const r = harvestPlot(state, p);
    if (!r.ok) { raison = raison || r.error; continue; }
    recoltees += 1;
    if (r.aRamasser) aRamasser = true;
    for (const [item, qty] of Object.entries(r.items)) items[item] = (items[item] || 0) + qty;
  }
  groupDiscount(state, before);
  if (recoltees === 0) return fail(raison || 'Rien à récolter.');
  return { ok: true, recoltees, items, aRamasser };
}
