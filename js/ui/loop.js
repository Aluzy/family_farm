import { DATA, recipeOutput } from '../engine/catalog.js';
import { bedtimeDue, mealDue } from '../engine/clock.js';
import { tick } from '../engine/energy.js';
import { takeMeal } from '../engine/family.js';
import { routineDue } from '../engine/automation.js';
import { mailbox } from '../engine/campaign.js';
import { canSleep, sleep } from '../engine/night.js';
import { mergeOfflineReports, simulateOffline } from '../engine/offline.js';
import { alertSnapshot, tutorialStep } from '../engine/alerts.js';
import { formatDuration, formatLitres, formatNumber, formatPercent } from '../engine/format.js';
import { MAX_FRAME_MS, RENDER_THROTTLE_MS, state, TICK_MS } from './store.js';
import { persistState } from './storage.js';
import { actionSleep } from './game-actions.js';
import {
  lastRenderAt, refresh, render, renderScheduled, setLastRenderAt, setRenderScheduled,
} from './render.js';
import { itemsSummary } from './inventaire.js';
import { watchChapters } from './chapitres.js';
import { watchLevels } from './niveaux.js';
import {
  ALERT_MUTE_AFTER_CATCH_UP_MS, notify, setAlertMuteUntil, setAlertState, showToast, watchAlerts,
} from './toasts.js';

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
  if (opened && !technoOpened) showToast('🌳 Nouvel onglet : Arbre des technologies');
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
      const r = DATA.recipes[was];
      const out = DATA.items[recipeOutput(was)];
      showToast(`${out.icone} ${r.transformation ? out.nom : r.nom} : prêt !`);
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

function watchMail() {
  const box = mailbox(state);
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
    notify(`${def.icone} ${def.objet} est arrivée ! Elle t'attend dans les Notifications.`, 'lettre', { page: 'notifications' });
    persistState();
    scheduleRender();
  }
}

// Arbre v2 : annonce les points de technologie gagnés (chapitre, maîtrise, mode libre).
function watchTechPoints() {
  const pt = state.pointsTech;
  if (!pt || !pt.annonces || !pt.annonces.length) return;
  for (const a of pt.annonces.splice(0)) showToast(`🔬 +${formatNumber(a.pt)} PT : ${a.raison}`);
  persistState();
}

// Arbre v2 (Routine familiale) : la famille se couche d'elle-même, jeu ouvert,
// dès que l'éveil minimal est écoulé et qu'aucune fenêtre n'attend le joueur.
function watchRoutine() {
  if (!routineDue(state)) return;
  if (document.getElementById('modal-root').childElementCount > 0) return;
  const report = sleep(state);
  if (!report) return;
  syncJobs();
  persistState();
  refresh();
  showToast(`🌙 Routine : la famille a dormi. Nuit ${report.nuit} · autonomie ${formatPercent(report.autonomie)}`);
}

// La journée suit l'horloge : de 6 h à 22 h, 18 s par heure. À 19 h, la famille prend
// son repas. À 22 h, si personne n'a cliqué sur « Zzz », la nuit se déroule d'elle-même
// et le résumé habituel s'affiche (il est alors 6 h). Jeu ouvert seulement : une absence
// n'avance l'horloge que jusqu'à l'éveil minimal (voir simulateOffline). La nuit attend
// qu'une fenêtre ouverte soit refermée, et ne se lance pas tant que l'aide de la première
// partie est affichée (le joueur lit).
function watchDay() {
  if (mealDue(state)) {
    const r = takeMeal(state);
    persistState();
    refresh();
    if (r.ok) playMealScene(r.repas);
  }
  if (!bedtimeDue(state)) return;
  if (document.getElementById('modal-root').childElementCount > 0) return;
  if (tutorialStep(state)) return;
  actionSleep(true);
}

// Le repas de 19 h. Pour l'instant, une annonce (un appui mène à la Famille) ; plus
// tard, une petite cinématique se jouera ici.
function playMealScene(repas) {
  const mange = itemsSummary(repas.mange);
  const complet = repas.couverture >= 100;
  const suite = complet ? 'Tout le monde a mangé à sa faim.' : `Repas insuffisant : ${formatNumber(Math.min(repas.energie, repas.besoin))} / ${formatNumber(repas.besoin)} énergie, la santé baisse.`;
  notify(`🍽️ ${DATA.TIME.MEAL_HOUR} h : la famille passe à table${mange ? ` (${mange})` : ''}. ${suite}`, complet ? 'repas' : 'alerte', { fenetre: 'maison', onglet: 'famille' });
}

// Le résumé du réveil est-il à l'écran ? Tant qu'il l'est, l'horloge reste à 6 h.
function wakeModalOpen() {
  return !!document.getElementById('wake-title');
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
  const horlogeArretee = wakeModalOpen();
  while (accumulatorMs >= TICK_MS) {
    tick(state, TICK_MS / 1000, horlogeArretee);
    accumulatorMs -= TICK_MS;
    ticked = true;
    scheduleRender();
  }
  simulatedAt = wall;
  watchTechPoints();
  watchRoutine();
  watchDay();
  watchMail();
  watchPreparations();
  watchUnlocks();
  if (ticked) watchAlerts();
  watchAbsence();
  watchChapters();
  watchLevels(); // version 1.7 : après l'écran de fin de chapitre
  requestAnimationFrame(frame);
}

/* ---------- Lot 11 : rattrapage hors-ligne et écran « Pendant votre absence… » ---------- */

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
  if (document.getElementById('modal-root').childElementCount > 0) return;
  const report = pendingAbsence;
  pendingAbsence = null;
  openAbsenceModal(report);
}

function openAbsenceModal(r) {
  const cap = DATA.HORS_LIGNE.MAX_S;
  const done = itemsSummary(r.terminees);
  const running = r.enCours.map((e) => {
    const def = DATA.STATIONS[e.station];
    const rec = DATA.recipes[e.recette];
    const left = Number.isFinite(e.reste) ? `encore ${formatDuration(e.reste)}` : 'en pause';
    // Au Moulin : le nombre de blés qu'il reste à moudre.
    const lot = e.quantite > 1 ? `${formatNumber(e.quantite)} blés à moudre` : rec.nom.toLowerCase();
    return `${def.icone} ${def.nom} : ${lot} (${left})`;
  });
  const f = r.frigo;
  let fridge = '';
  if (f.construit) {
    fridge = f.horsTensionS > 0
      ? `<li class="alert">⚠️ Le réfrigérateur a manqué de courant pendant ${formatDuration(f.horsTensionS)}. S'il a manqué de froid plus de la moitié de la journée, chaque lot perdra une nuit de conservation au prochain Dormir.</li>`
      : '<li>🧊 Le réfrigérateur est resté alimenté.</li>';
  }
  const lines = [
    `<li>⏳ Absence : <strong class="num">${formatDuration(r.demande)}</strong>${r.plafonne ? ` <span class="muted">(seules les ${formatDuration(cap)} premières comptent)</span>` : ''}</li>`,
    // Version 1.6 : l'électricité produite et stockée ne s'affiche plus ici (Maison › Installations).
    `<li>💧 Eau pompée : <strong class="num">${formatLitres(r.eauPompee)}</strong> · réservoir <span class="num">${formatNumber(Math.floor(r.eauFin / 1000))} / ${formatLitres(r.capaciteEau)}</span></li>`,
    done ? `<li>🍳 Préparations terminées : <strong>${done}</strong></li>` : '',
    running.length ? `<li>⏳ Toujours en cours : ${running.join(' · ')}</li>` : '',
    fridge,
    `<li>🌙 Aucune nuit n'est passée : l'horloge s'arrête quand le jeu est fermé, et les cultures, les animaux et la famille t'attendent.${canSleep(state) ? ' Tu peux dormir dès maintenant.' : ''}</li>`,
    DATA.HORS_LIGNE.USURE ? '' : '<li class="muted">🛠️ Les appareils ne se sont pas usés pendant ton absence.</li>',
  ];
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="absence-title" data-stop-propagation>
        <h2 id="absence-title">⏳ Pendant votre absence…</h2>
        <ul class="report-list">${lines.join('')}</ul>
        <button type="button" class="btn primary" data-action="close-modal" id="absence-close">Reprendre</button>
      </div>
    </div>`;
  document.getElementById('absence-close').focus();
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
