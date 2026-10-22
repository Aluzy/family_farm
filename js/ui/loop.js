import { DATA, recipeOutput } from '../engine/catalog.js';
import { setupPending } from '../engine/depart.js';
import { watchSetup } from './depart.js';
import { watchDemenagement } from './demenagement.js';
import { bedtimeDue, mealDue, nightActive } from '../engine/clock.js';
import { tick } from '../engine/energy.js';
import { takeMeal } from '../engine/family.js';
import { mailbox } from '../engine/campaign.js';
import { mergeOfflineReports, simulateOffline } from '../engine/offline.js';
import { alertSnapshot, tutorialStep } from '../engine/alerts.js';
import { formatCoins, formatDay, formatNumber } from '../engine/format.js';
import { MAX_FRAME_MS, RENDER_THROTTLE_MS, state, TICK_MS } from './store.js';
import { persistState } from './storage.js';
import { showConsentBanner } from './consent.js';
import { consentBannerDue, consentBannerPending, consentBannerShown, modalRoot, storyOpen, tutorialStopsClock, uiCalm } from './calme.js';
import { actionNightStart, wakeUp } from './game-actions.js';
import {
  lastRenderAt, refresh, render, renderScheduled, setLastRenderAt, setRenderScheduled,
} from './render.js';
import { startMealScene } from './stage-windows.js';
import { watchChapters } from './chapitres.js';
import { watchLevels } from './niveaux.js';
import {
  ALERT_MUTE_AFTER_CATCH_UP_MS, notify, setAlertMuteUntil, setAlertState, watchAlerts,
} from './toasts.js';
import { openModal } from './modal.js';
import { accord, itemsText, plural } from './common.js';

// Lot 11 : heure (Date.now) jusqu'à laquelle la partie a été simulée. Elle est
// écrite dans la sauvegarde ({ v, t, s } : t = simulatedAt) ; au chargement, ou
// quand la boucle reprend après une pause (onglet en arrière-plan, téléphone en
// veille), l'écart avec l'heure actuelle est rattrapé par simulateOffline.
export let simulatedAt = Date.now();
export function setSimulatedAt(value) {
  simulatedAt = value;
  return value;
}
// Écart minimal (ms) traité comme une absence : en dessous, la boucle normale suffit.
const CATCH_UP_MIN_MS = 2000;
// Bilan d'absence pas encore montré (une fenêtre était déjà ouverte).
let pendingAbsence = null;
export function setPendingAbsence(value) {
  pendingAbsence = value;
  return value;
}

/* ---------- boucle à pas fixe ---------- */

let accumulatorMs = 0;
let lastFrameTime = null;

// Recette en cours dans chaque station au dernier passage : sert à annoncer
// « prêt ! » quand une préparation se termine pendant que le joueur joue.
let lastJobs = {};

// Lot 7 : l'onglet Arbre des technologies était-il déjà ouvert ? (pour annoncer son arrivée)
let technoOpened = false;

function watchUnlocks() {
  const opened = state.unlockedTabs.includes(DATA.TECHNO.ONGLET);
  if (opened && !technoOpened) notify('🌳 Nouvel onglet : Arbre des technologies');
  technoOpened = opened;
}

export function syncJobs() {
  technoOpened = state.unlockedTabs.includes(DATA.TECHNO.ONGLET);
  lastJobs = {};
  for (const id of Object.keys(DATA.STATIONS)) {
    const job = state.stations[id].tache;
    lastJobs[id] = job ? job.recette : null;
  }
}

function watchPreparations() {
  for (const id of Object.keys(DATA.STATIONS)) {
    const job = state.stations[id].tache;
    const was = lastJobs[id];
    if (was && !job) {
      const r = DATA.RECETTES[was];
      const out = DATA.OBJETS[recipeOutput(was)];
      notify(`${out.icone} ${r.transformation ? out.nom : r.nom} : prêt !`);
    }
    lastJobs[id] = job ? job.recette : null;
  }
}

// Version 1.3 : annonce une lettre qui vient d'arriver (un appui mène aux Notifications).
// `mailSeen` : les lettres déjà annoncées ; il est rempli au chargement de la partie.
let mailSeen = null;
export function setMailSeen(value) {
  mailSeen = value;
  return value;
}

// Le robot a fini sa liste du jour : une annonce (ce qu'il a récolté et semé), une fois.
// Batterie vide en pleine liste : une annonce par panne (il rentre se recharger).
function watchRobot() {
  const r = state.robot;
  if (r && r.jour === state.day && r.charge && (r.annonceCharge || 0) < (r.pannes || 0)) {
    r.annonceCharge = r.pannes;
    notify(`🔋 Batterie du robot vide : il rentre à sa station et reprendra sa liste (${plural(r.taches.length - r.i, 'tâche')}) une fois rechargé.`, { cible: { fenetre: 'robot' } });
    persistState();
  }
  if (!r || r.annonce || r.jour !== state.day || !r.taches.length || r.i < r.taches.length) return;
  r.annonce = true;
  const recolte = itemsText(r.recoltes);
  const semis = r.semees ? `${plural(r.semees, 'parcelle')} ${accord(r.semees, 'replantée')}` : '';
  const manque = r.sansGraine ? ` ; ${r.sansGraine} sans graine` : '';
  notify(`🤖 Le robot a fini sa liste : ${[recolte ? `récolté ${recolte}` : '', semis].filter(Boolean).join(', ') || 'rien à faire'}${manque}.`, { cible: { fenetre: 'zone' } });
  persistState();
}

function watchMail() {
  const box = mailbox(state);
  // FLU-18 : une lettre s'annonce quand l'écran est calme (pas sur l'histoire, ni sur le
  // bandeau des cookies) ; elle n'est annoncée que si elle n'est pas déjà lue
  if (mailSeen !== null && (!uiCalm() || consentBannerShown() || consentBannerPending())) return;
  // Première fois, ou partie remplacée (nouvelle partie, import) : rien à annoncer.
  if (mailSeen === null || box.length < mailSeen.size) {
    mailSeen = new Set(box.map((l) => l.id));
    return;
  }
  for (const l of box) {
    if (mailSeen.has(l.id)) continue;
    mailSeen.add(l.id);
    const def = DATA.COURRIER[l.id];
    if (!def || l.lu) continue;
    notify(`${def.icone} ${def.objet} est arrivée ! Elle t'attend dans les Notifications.`, { kind: 'lettre', cible: { page: 'notifications' } });
    persistState();
    scheduleRender();
  }
}

// Arbre v2 : annonce les points de technologie gagnés (chapitre, maîtrise, mode libre).
function watchTechPoints() {
  const pt = state.pointsTech;
  if (!pt || !pt.annonces || !pt.annonces.length) return;
  const premier = pt.gagnes > 0 && pt.gagnes === pt.annonces.reduce((t, a) => t + a.pt, 0);
  for (const a of pt.annonces.splice(0)) notify(`🔬 +${formatNumber(a.pt)} PT : ${a.raison}`);
  // FLU-28 : le premier point fait apparaître l'Arbre des technologies dans le menu latéral
  if (premier) notify('🌳 L\'Arbre des technologies est ouvert : dépense tes points depuis le menu (🌳).', { cible: { fenetre: 'techno' } });
  persistState();
}

// La journée suit l'horloge : de 6 h à 22 h, 30 s par heure. À 19 h, la famille prend
// son repas. Version 1.19 : à 22 h, la famille va dormir et la nuit défile à la même
// vitesse (tick : seule l'heure avance) ; à minuit, la nuit se calcule (récolte automatique
// comprise) et le jour change ; à 6 h, c'est le réveil (sans résumé). Le bouton « Zzz »
// couche le personnage : quand il dort, la nuit défile en accéléré. Jeu ouvert seulement : une absence n'avance l'horloge du jour que jusqu'à
// l'éveil minimal (voir simulateOffline). La nuit attend qu'une fenêtre ouverte soit
// refermée, et ne commence pas tant qu'une bulle d'aide de la première partie est affichée
// (le joueur lit), sauf celle qui explique la nuit.
function watchDay() {
  if (mealDue(state)) {
    const r = takeMeal(state);
    persistState();
    refresh();
    if (r.ok) playMealScene(r.repas);
  }
  if (state.reveil && !modalRoot().childElementCount) wakeUp();
  if (nightActive(state)) {
    // minuit vient de passer : les préparations finies dans la nuit, sans toast
    if (state.nuitEnCours.minuit && !midnightSeen) { midnightSeen = true; syncJobs(); persistState(); scheduleRender(); }
    return;
  }
  midnightSeen = false;
  if (!bedtimeDue(state)) return;
  if (modalRoot().childElementCount > 0) return;
  const step = tutorialStep(state);
  if (step && step !== 'dormir') return;
  actionNightStart();
}
let midnightSeen = false;

// Le repas de 19 h : une annonce (un appui mène à la Famille) et, sur la carte, la famille
// qui passe à table (startMealScene).
function playMealScene(repas) {
  startMealScene(repas);
  const mange = itemsText(repas.mange);
  const complet = repas.couverture >= 100;
  const suite = complet ? 'Tout le monde a mangé à sa faim.' : `Repas insuffisant : ${formatNumber(Math.min(repas.energie, repas.besoin))} / ${formatNumber(repas.besoin)} calories, ton énergie remontera moins cette nuit.`;
  notify(`🍽️ ${DATA.TEMPS.HEURE_REPAS} h : la famille passe à table${mange ? ` (${mange})` : ''}. ${suite}`, { kind: complet ? 'repas' : 'alerte', cible: { fenetre: 'famille' } });
}

export function frame(now) {
  const wall = Date.now();
  if (wall - simulatedAt >= CATCH_UP_MIN_MS) {
    // La boucle était en pause (onglet caché, veille) : même règle que hors-ligne.
    catchUp(wall);
    lastFrameTime = now;
    accumulatorMs = 0;
  }
  if (lastFrameTime === null) lastFrameTime = now;
  let elapsed = now - lastFrameTime;
  lastFrameTime = now;
  if (elapsed > MAX_FRAME_MS) elapsed = MAX_FRAME_MS;
  accumulatorMs += elapsed;
  let ticked = false;
  // version 1.12 : pas d'heure avant le départ ; FLU-21 : ni pendant l'histoire ou une bulle d'aide
  const horlogeArretee = setupPending(state) || storyOpen() || tutorialStopsClock();
  while (accumulatorMs >= TICK_MS) {
    tick(state, TICK_MS / 1000, horlogeArretee);
    accumulatorMs -= TICK_MS;
    ticked = true;
    scheduleRender();
  }
  simulatedAt = wall;
  watchSetup(); // version 1.12 : la configuration de la famille passe avant tout
  watchDemenagement(); // une ancienne partie : déménager sur une terre sauvage ?
  if (consentBannerDue()) showConsentBanner(); // FLU-17 : après l'histoire, la carte seule 500 ms
  watchTechPoints();
  watchDay();
  watchMail();
  watchRobot();
  watchPreparations();
  watchUnlocks();
  if (ticked) watchAlerts();
  watchAbsence();
  watchChapters();
  watchLevels(); // version 1.7 : après l'écran de fin de chapitre
  requestAnimationFrame(frame);
}

/* ---------- Lot 11 : rattrapage hors-ligne et écran « Pendant ton absence… » ---------- */

// Simule le temps écoulé depuis simulatedAt (plafonné par le moteur), garde le
// bilan pour l'écran d'absence s'il dépasse HORS_LIGNE.ECRAN_S, puis sauvegarde.
// Une horloge qui recule (réglage de l'appareil) ne rattrape rien.
export function catchUp(wall = Date.now()) {
  const seconds = (wall - simulatedAt) / 1000;
  simulatedAt = wall;
  if (!(seconds > 0)) return null;
  const report = simulateOffline(state, seconds);
  // Les préparations terminées et les alertes sont dans le bilan : pas de notification en rafale.
  syncJobs();
  setAlertState(alertSnapshot(state));
  setAlertMuteUntil(Date.now() + ALERT_MUTE_AFTER_CATCH_UP_MS);
  if (report.demande >= DATA.HORS_LIGNE.ECRAN_S) pendingAbsence = mergeOfflineReports(pendingAbsence, report);
  persistState();
  scheduleRender();
  return report;
}

// Ouvre l'écran d'absence dès qu'aucune autre fenêtre n'est ouverte (il passe
// avant l'écran de fin de chapitre).
function watchAbsence() {
  if (!pendingAbsence) return;
  if (modalRoot().childElementCount > 0) return;
  const report = pendingAbsence;
  pendingAbsence = null;
  openAbsenceModal(report);
}

// Une petite fenêtre du jeu (cadre bois, en-tête et ✕ comme les fenêtres de la carte) : la date,
// l'argent, et les biens produits pendant l'absence (ce que les ateliers ont ajouté aux stocks).
function openAbsenceModal(r) {
  const biens = Object.entries(r.terminees || {}).filter(([item, n]) => DATA.OBJETS[item] && n > 0)
    .map(([item, n]) => `<li><span aria-hidden="true">${DATA.OBJETS[item].icone}</span> ${DATA.OBJETS[item].nom}<strong class="num">+${formatNumber(n)}</strong></li>`);
  openModal(`
    <header class="window-head">
      <h2 id="absence-title"><span aria-hidden="true">👋</span> Ravi de te revoir !</h2>
      <button type="button" class="icon-btn" id="absence-close" data-action="close-modal" aria-label="Fermer" title="Fermer">✕</button>
    </header>
    <div class="absence-body">
      <p class="absence-ligne"><span aria-hidden="true">📅</span> ${formatDay(state.day)}</p>
      <p class="absence-ligne"><span aria-hidden="true">🪙</span> <strong class="num">${formatCoins(state.pieces)}</strong> pièces</p>
      <h3>Biens produits</h3>
      ${biens.length ? `<ul class="absence-biens">${biens.join('')}</ul>` : '<p class="muted">Rien de nouveau.</p>'}
    </div>`, { labelledBy: 'absence-title', focus: '#absence-close', className: 'modal bois item-modal absence-modal' });
}

// Quitter la page ou la cacher : on sauvegarde tout de suite (sur mobile,
// l'onglet peut être tué en arrière-plan sans « beforeunload »).
export function onHide() {
  if (document.visibilityState === 'hidden') persistState();
}

export function scheduleRender() {
  setRenderScheduled(true);
}

export function renderLoop(now) {
  if (renderScheduled && now - lastRenderAt >= RENDER_THROTTLE_MS) {
    setRenderScheduled(false);
    setLastRenderAt(now);
    render();
  }
  requestAnimationFrame(renderLoop);
}
