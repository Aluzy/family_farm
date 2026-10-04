'use strict';

/* ==========================================================================
   APP — sauvegarde, interface et boucle. Seul bloc à toucher au DOM, à
   window, au stockage ou à l'horloge.
   ========================================================================== */

const SAVE_KEY = 'ferme-save';
const TICK_MS = 200;
const MAX_FRAME_MS = 1000;
const AUTOSAVE_MS = 10000;
const RENDER_THROTTLE_MS = 200; // ~5 fois par seconde

const TABS = [
  { id: 'ferme', label: 'Ferme', icon: '🏠' },
  { id: 'famille', label: 'Famille', icon: '👨‍👩‍👧‍👦' },
  { id: 'inventaire', label: 'Inventaire', icon: '📦' },
  { id: 'recettes', label: 'Livre de recette', icon: '📖' },
  { id: 'techno', label: 'Arbre des technologies', icon: '🌳' },
  { id: 'comptoir', label: 'Marché', icon: '🧺' },
  { id: 'notifications', label: 'Notifications', icon: '✉️' },
];

// Barre de menu du bas : quatre destinations, côte à côte.
const NAV_TABS = ['ferme', 'inventaire', 'comptoir', 'notifications'];

// Écrans ouverts depuis la Ferme (raccourcis en haut de l'écran Ferme). Ils
// restent des onglets pour le moteur et le suivi, mais n'ont pas d'icône en bas :
// la barre garde alors « Ferme » allumé.
const FERME_LINKS = ['famille', 'recettes', 'techno'];

// Onglets toujours disponibles, sans passer par state.unlockedTabs (aucune migration).
const ALWAYS_TABS = ['notifications'];
function tabAvailable(id) {
  return ALWAYS_TABS.includes(id) || state.unlockedTabs.includes(id);
}

let state = null;
let activeTab = 'ferme';
let ecranFerme = null; // écran de détail ouvert dans la Ferme : null, 'panneaux' ou 'batteries'
let testMode = false;
let invTab = 'frais'; // Inventaire : 'frais', 'graines' ou 'produits'
let comptoirTab = 'vendre'; // Marché : 'vendre', 'acheter', 'graines' ou 'animaux'
const sellQuantities = {}; // quantité choisie par item dans l'onglet Vendre
const buyQuantities = {}; // quantité choisie par item dans les onglets Acheter et Graines
const animalQuantities = {}; // quantité choisie par espèce dans l'onglet Animaux
const BUY_MAX = 99; // plus grande quantité qu'on peut choisir d'acheter en une fois

/* ---------- suivi de session (consentement requis, voir cookies.html) ---------- */

// Le mode test n'est jamais mesuré, et un échec du suivi ne doit jamais gêner le jeu.
function tel(method, ...args) {
  if (testMode) return;
  try { Telemetry[method](...args); } catch (e) { /* le suivi ne doit jamais faire planter le jeu */ }
}

function telClick(target, action) {
  if (testMode || action.startsWith('test-') || action.startsWith('consent-')) return;
  const d = target.dataset;
  const detail = [d.crop, d.type, d.id, d.tab, d.screen].filter(Boolean).join('/');
  tel('click', action, detail);
}

function telView() { tel('tab', activeTab, ecranFerme); }

let telChapter = null; // dernier chapitre vu, pour repérer les passages de chapitre

function telNight(awakeSeconds) {
  const chap = state.campagne ? state.campagne.chapitre : null;
  tel('night', {
    day: state.day, chapter: chap, autonomy: lastAutonomy(state),
    pieces: state.pieces, health: averageHealth(state), awake: awakeSeconds,
  });
  if (telChapter !== null && typeof chap === 'number' && chap > telChapter) tel('chapter', chap, state.day);
  telChapter = typeof chap === 'number' ? chap : telChapter;
}

/* ---------- choix sur les traceurs : bandeau et Options ---------- */

function showConsentBanner() {
  if (document.getElementById('consent-banner')) return;
  const el = document.createElement('div');
  el.id = 'consent-banner';
  el.className = 'consent-banner';
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', 'Choix sur le suivi de votre visite');
  el.innerHTML = `
    <p><strong>Nous aider à améliorer le jeu ?</strong> Avec votre accord, il note anonymement les boutons utilisés, les écrans vus et votre progression. Votre partie est sauvegardée quel que soit votre choix.
    <a href="cookies.html" target="_blank" rel="noopener">En savoir plus</a></p>
    <div class="row">
      <button class="btn" type="button" data-action="consent-accept">Accepter</button>
      <button class="btn" type="button" data-action="consent-refuse">Refuser</button>
    </div>`;
  document.body.appendChild(el);
}

function hideConsentBanner() {
  const el = document.getElementById('consent-banner');
  if (el) el.remove();
}

function applyConsent(choice) {
  const before = Telemetry.status();
  Telemetry.setConsent(choice);
  hideConsentBanner();
  if (choice === 'granted' && before !== 'granted') telView();
}

function privacySectionHtml() {
  const st = Telemetry.status();
  const sid = Telemetry.sessionId();
  let body;
  if (st === 'optout') {
    body = '<p class="muted">Votre navigateur demande de ne pas être suivi (Global Privacy Control ou Do Not Track) : aucun suivi n\'est activé.</p>';
  } else if (st === 'granted') {
    body = `<p class="muted">Suivi anonyme de la visite : <strong>activé</strong>.${sid ? ` Numéro de session, à indiquer pour demander l'effacement de vos données : <code>${sid}</code>` : ''}</p>
      <div class="row"><button class="btn" type="button" data-action="consent-refuse">Arrêter le suivi</button></div>`;
  } else {
    body = `<p class="muted">Suivi anonyme de la visite : <strong>désactivé</strong>${st === 'denied' ? '' : ' (aucun choix fait pour l\'instant)'}.</p>
      <div class="row"><button class="btn" type="button" data-action="consent-accept">Autoriser le suivi</button></div>`;
  }
  return `<div class="stack">
    <strong>Confidentialité</strong>
    ${body}
    <div class="row"><a class="btn" href="cookies.html" target="_blank" rel="noopener">Politique de cookies et traceurs</a></div>
  </div>`;
}
let renderScheduled = false;
let lastRenderAt = 0;

// Lot 11 : heure (Date.now) jusqu'à laquelle la partie a été simulée. Elle est
// écrite dans la sauvegarde ({ v, t, s } : t = simulatedAt) ; au chargement, ou
// quand la boucle reprend après une pause (onglet en arrière-plan, téléphone en
// veille), l'écart avec l'heure actuelle est rattrapé par simulateOffline.
let simulatedAt = Date.now();
// Écart minimal (ms) traité comme une absence : en dessous, la boucle normale suffit.
const CATCH_UP_MIN_MS = 2000;
// Bilan d'absence pas encore montré (une fenêtre était déjà ouverte).
let pendingAbsence = null;

/* ---------- stockage : localStorage, toujours entouré de try/catch ---------- */

function safeStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    return false;
  }
}

// Charge la sauvegarde (ou crée une partie). Lot 11 : simulatedAt reprend
// l'heure de la sauvegarde, pour rattraper le temps passé page fermée.
function loadOrCreateState() {
  simulatedAt = Date.now();
  const raw = safeStorageGet(SAVE_KEY);
  if (!raw) return createInitialState(makeSeed());
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return createInitialState(makeSeed());
    if (typeof parsed.t === 'number' && Number.isFinite(parsed.t)) simulatedAt = parsed.t;
    return migrate(parsed);
  } catch (e) {
    return createInitialState(makeSeed());
  }
}

function makeSeed() {
  // Seule l'app a le droit de lire l'horloge ; l'ENGINE reste pur.
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

function persistState() {
  try {
    const payload = JSON.stringify({ v: state.version, t: simulatedAt, s: state });
    safeStorageSet(SAVE_KEY, payload);
  } catch (e) {
    // La sauvegarde ne doit jamais faire planter la page.
  }
}

/* ---------- export / import ---------- */

function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function decodeBase64(b64) {
  return decodeURIComponent(escape(atob(b64)));
}

function exportSaveText() {
  const payload = JSON.stringify({ v: state.version, t: simulatedAt, s: state });
  return encodeBase64(payload);
}

function importSaveText(text) {
  try {
    const json = decodeBase64(String(text).trim());
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || !parsed.s) {
      throw new Error('format de sauvegarde invalide');
    }
    // Une sauvegarde importée reprend maintenant : pas de rattrapage hors-ligne.
    state = migrate(parsed);
    simulatedAt = Date.now();
    pendingAbsence = null;
    syncJobs();
    persistState();
    return true;
  } catch (e) {
    return false;
  }
}

/* ---------- copie dans le presse-papiers ---------- */

// Copie le contenu d'un textarea et n'annonce « Copié » que si la copie a
// vraiment réussi. On essaie d'abord la commande synchrone (elle marche en
// file://), puis l'API asynchrone dont l'échec est capté par la promesse.
function copyFromTextarea(area) {
  area.focus();
  area.select();
  area.setSelectionRange(0, area.value.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (e) {
    ok = false;
  }
  if (ok) {
    showToast('Copié !');
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(area.value).then(
      () => showToast('Copié !'),
      () => showToast('Copie impossible : le texte est sélectionné, copie-le à la main.')
    );
    return;
  }
  showToast('Copie impossible : le texte est sélectionné, copie-le à la main.');
}

/* ---------- actions du moteur (jamais d'accès direct à state depuis l'UI) ---------- */

function actionNewGame() {
  state = newGameFrom(state, makeSeed());
  simulatedAt = Date.now();
  pendingAbsence = null;
  syncJobs();
  ecranFerme = null;
  activeTab = 'ferme';
  persistState();
  refresh();
}

// Applique le résultat d'une action du moteur : message si elle est refusée,
// puis rafraîchissement immédiat (sans attendre la cadence de 5 par seconde).
function applyResult(result) {
  if (result && result.ok === false) showToast(result.error);
  refresh();
  return result;
}

// `auto` : la nuit s'est lancée d'elle-même à 22 h (voir watchDay).
function actionSleep(auto = false) {
  const awakeBefore = Math.round(state.awakeMs / 1000);
  const report = sleep(state);
  if (!report) {
    showToast('Encore un peu d\'éveil avant de dormir.');
    refresh();
    return;
  }
  telNight(awakeBefore);
  syncJobs(); // les préparations terminées pendant la nuit ne sont pas annoncées par un toast
  persistState(); // sauvegarde après chaque nuit
  refresh();
  openWakeModal(report, auto);
}

function actionTestNights(count) {
  const { report } = testSleepNights(state, count);
  syncJobs();
  persistState();
  refresh();
  if (report) openWakeModal(report);
}

/* ---------- Lot 10 : simulation d'un joueur automatique (mode test) ---------- */

const SIM_NIGHTS = 60;

// Courbe d'autonomie d'une simulation : la valeur de chaque nuit en gris, la
// moyenne mobile en couleur, la courbe cible de la conception en pointillés, et
// une bande rouge pour les nuits où un membre de la famille est à 0 de santé.
function simulationHtml(rows) {
  const S = DATA.SIMULATION;
  const W = 320, H = 150, left = 30, right = 8, top = 8, bottom = 22;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const first = rows[0].nuit;
  const last = rows[rows.length - 1].nuit;
  const span = Math.max(1, last - first);
  const x = (nuit) => left + plotW * ((nuit - first) / span);
  const y = (pct) => top + plotH * (1 - pct / 100);
  const smooth = rows.map((r, i) => {
    const w = rows.slice(Math.max(0, i - S.LISSAGE + 1), i + 1);
    return w.reduce((t, q) => t + q.autonomie, 0) / w.length;
  });
  const grid = [0, 25, 50, 75, 100]
    .map((g) => `<line class="chart-grid" x1="${left}" y1="${y(g).toFixed(1)}" x2="${W - right}" y2="${y(g).toFixed(1)}"/><text class="chart-label" x="${left - 4}" y="${(y(g) + 3).toFixed(1)}" text-anchor="end">${g}</text>`)
    .join('');
  const step = Math.max(1, Math.ceil(span / 6 / 5) * 5);
  const ticks = rows
    .filter((r) => (r.nuit - first) % step === 0)
    .map((r) => `<text class="chart-label" x="${x(r.nuit).toFixed(1)}" y="${H - 6}" text-anchor="middle">${r.nuit}</text>`)
    .join('');
  const death = rows
    .filter((r) => r.santeMin <= 0)
    .map((r) => `<rect class="chart-death" x="${(x(r.nuit) - plotW / span / 2).toFixed(1)}" y="${top}" width="${(plotW / span).toFixed(1)}" height="${plotH}"/>`)
    .join('');
  const raw = rows.map((r) => `${x(r.nuit).toFixed(1)},${y(r.autonomie).toFixed(1)}`).join(' ');
  const curve = rows.map((r, i) => `${x(r.nuit).toFixed(1)},${y(smooth[i]).toFixed(1)}`).join(' ');
  const goal = S.JALONS.filter((j) => j.nuit >= first && j.nuit <= last).map((j) => `${x(j.nuit).toFixed(1)},${y(j.pct).toFixed(1)}`).join(' ');
  const goalLine = goal.includes(' ') ? `<polyline class="chart-target" fill="none" points="${goal}"><title>Courbe cible de la conception (section 8.10)</title></polyline>` : '';
  const zero = rows.find((r) => r.santeMin <= 0);
  const reach = S.JALONS.map((j) => {
    const n = simulationReach(rows, j.pct);
    return `${j.pct} % : ${n === null ? 'pas atteint' : 'nuit ' + n}`;
  }).join(' · ');
  const final = smooth[smooth.length - 1];
  const summary = `Simulation de ${rows.length} nuits (nuits ${first} à ${last}) : autonomie finale ${formatPercent(final)} (moyenne sur ${S.LISSAGE} nuits) ; ${zero ? 'un membre de la famille tombe à 0 de santé dès la nuit ' + zero.nuit : 'aucune santé à 0'}.`;
  return `
    <strong>Joueur appliqué, ${rows.length} nuits</strong>
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${summary}">${grid}${death}<polyline class="chart-raw" points="${raw}"/>${goalLine}<polyline class="chart-curve" points="${curve}"/>${ticks}</svg>
    <p class="muted">Ligne colorée : moyenne sur ${S.LISSAGE} nuits · gris : chaque nuit · pointillés : courbe cible · bande rouge : santé à 0.</p>
    <p>${summary}</p>
    <p class="muted">Jalons (lissés) : ${reach}.</p>
    <p class="muted">Pièces à la fin : ${formatCoins(rows[rows.length - 1].pieces)} · conserves restantes : ${formatNumber(rows[rows.length - 1].conserves)} · soins payés : ${rows[rows.length - 1].soinsPayes}. Ta partie n'a pas été modifiée.</p>`;
}

// Le bouton travaille sur une copie de l'état : la partie en cours ne bouge pas.
function actionTestSimulate() {
  const rows = simulateFromCopy(state, 'applique', SIM_NIGHTS);
  const box = document.getElementById('sim-result');
  box.innerHTML = simulationHtml(rows);
  box.hidden = false;
  showToast(`Simulation de ${SIM_NIGHTS} nuits terminée`);
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

function syncJobs() {
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

function frame(now) {
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
  requestAnimationFrame(frame);
}

/* ---------- Lot 11 : rattrapage hors-ligne et écran « Pendant votre absence… » ---------- */

// Simule le temps écoulé depuis simulatedAt (plafonné par le moteur), garde le
// bilan pour l'écran d'absence s'il dépasse HORS_LIGNE.ECRAN_S, puis sauvegarde.
// Une horloge qui recule (réglage de l'appareil) ne rattrape rien.
function catchUp(wall = Date.now()) {
  const seconds = (wall - simulatedAt) / 1000;
  simulatedAt = wall;
  if (!(seconds > 0)) return null;
  const report = simulateOffline(state, seconds);
  // Les préparations terminées et les alertes sont dans le bilan : pas de notification en rafale.
  syncJobs();
  alertState = alertSnapshot(state);
  alertMuteUntil = Date.now() + ALERT_MUTE_AFTER_CATCH_UP_MS;
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
    `<li>☀️ Énergie produite : <strong class="num">${formatWh(r.energieProduite)}</strong>${r.energiePerdue >= 1000 ? ` <span class="muted">(dont ${formatWh(r.energiePerdue)} perdus, batteries pleines)</span>` : ''}</li>`,
    `<li>🔋 Batteries : <strong class="num">${formatNumber(Math.floor(r.energieDebut / 1000))} → ${formatNumber(Math.floor(r.energieFin / 1000))} / ${formatWh(r.capacite)}</strong></li>`,
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
function onHide() {
  if (document.visibilityState === 'hidden') persistState();
}

function scheduleRender() {
  renderScheduled = true;
}

function renderLoop(now) {
  if (renderScheduled && now - lastRenderAt >= RENDER_THROTTLE_MS) {
    renderScheduled = false;
    lastRenderAt = now;
    render();
  }
  requestAnimationFrame(renderLoop);
}

/* ---------- rendu ---------- */

function render() {
  // Un onglet non débloqué (sauvegarde importée, par exemple) retombe sur la Ferme.
  if (!tabAvailable(activeTab)) activeTab = 'ferme';
  // Avec la carte, Famille, Livre de recette et Arbre des technologies n'existent que
  // comme onglets de la fenêtre Maison : une page ouverte avant que la carte soit prête y est ramenée.
  if (FERME_LINKS.includes(activeTab) && stageUsable()) {
    maisonTab = activeTab;
    activeTab = 'ferme';
    ecranFerme = null;
    stageWindow = 'maison';
  }
  renderIndicators();
  renderTabbar();
  renderTabContent();
  renderSleepBar();
  renderStage();
  renderStageWindow();
  applyAnchor();
  renderTutorial();
  renderTestPanel();
}

// Rafraîchit tout de suite (après une action du joueur).
// Lot 11 : jamais plus de 5 rendus par seconde, même en tapant vite : si le
// dernier rendu est trop récent, celui-ci part au prochain créneau (≤ 200 ms).
function refresh() {
  const now = performance.now();
  if (now - lastRenderAt < RENDER_THROTTLE_MS) {
    renderScheduled = true;
    return;
  }
  renderScheduled = false;
  lastRenderAt = now;
  render();
}

/* Mise à jour du DOM « sur place » : on compare le nouveau gabarit à ce qui
   est affiché et on ne modifie que les textes et attributs qui changent. Les
   boutons et interrupteurs gardent donc le même élément d'un rafraîchissement
   à l'autre : un appui en cours n'est jamais interrompu et le focus clavier
   reste en place. */
function morph(target, html) {
  // Lot 11 : un gabarit identique au précédent ne coûte rien (ni analyse, ni comparaison).
  if (target.__html === html) return;
  target.__html = html;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  patchChildren(target, tpl.content);
}

// Lot 11 : rendu par tranches. `parts` est une liste de gabarits ; chacun a son
// conteneur (.slot, sans boîte à l'écran) et n'est comparé que s'il a changé. Si
// le nombre de tranches change (autre onglet), les conteneurs sont recréés.
function morphSlots(target, parts) {
  const slots = target.__slots;
  if (!slots || slots.length !== parts.length || target.firstChild !== slots[0]) {
    target.textContent = '';
    target.__html = null;
    target.__slots = parts.map(() => {
      const d = document.createElement('div');
      d.className = 'slot';
      target.appendChild(d);
      return d;
    });
  }
  parts.forEach((html, i) => morph(target.__slots[i], html));
}

function patchChildren(from, to) {
  const oldNodes = Array.from(from.childNodes);
  const newNodes = Array.from(to.childNodes);
  const n = Math.max(oldNodes.length, newNodes.length);
  for (let i = 0; i < n; i++) {
    const o = oldNodes[i];
    const w = newNodes[i];
    if (!w) {
      from.removeChild(o);
    } else if (!o) {
      from.appendChild(w);
    } else if (o.nodeType !== w.nodeType || o.nodeName !== w.nodeName) {
      from.replaceChild(w, o);
    } else if (o.nodeType === 1 && o.getAttribute('data-key') !== w.getAttribute('data-key')) {
      // Lot 11 : un dessin dont la clé change (une plante qui pousse, une ponte)
      // est remplacé puis animé ; au premier affichage, rien ne bouge.
      from.replaceChild(w, o);
      if (o.hasAttribute('data-key') && w.hasAttribute('data-key')) animateIn(w);
    } else if (o.nodeType === 1) {
      patchAttributes(o, w);
      patchChildren(o, w);
    } else if (o.nodeValue !== w.nodeValue) {
      o.nodeValue = w.nodeValue;
    }
  }
}

function patchAttributes(o, w) {
  for (const a of Array.from(o.attributes)) {
    if (!w.hasAttribute(a.name)) o.removeAttribute(a.name);
  }
  for (const a of Array.from(w.attributes)) {
    if (o.getAttribute(a.name) !== a.value) o.setAttribute(a.name, a.value);
  }
}

/* ---------- Carte Phaser (voir farm-stage.js et docs/architecture-phaser.md) ---------- */

// Découpe de chaque culture dans assets/crops.png (champ "sprite" de data/crops.json) :
// la scène ne lit pas DATA, elle la reçoit au montage.
function cropSprites() {
  const out = {};
  for (const [id, crop] of Object.entries(DATA.crops)) if (crop.sprite) out[id] = crop.sprite;
  return out;
}

let stageMounted = false;
let stageMountedAt = 0;
let stageBroken = false; // Phaser a planté au montage : la Ferme garde sa liste classique
// Sans scène prête après ce délai (plantage au démarrage, images qui ne viennent pas), la
// Ferme repasse sur la liste classique ; la carte revient d'elle-même si elle finit par démarrer.
const STAGE_BOOT_MS = 12000;

function stageUsable() {
  if (!(window.FarmStage && window.Phaser) || stageBroken) return false;
  // Jeu ouvert depuis le disque : le navigateur refuse de charger la carte et ses images.
  if (location.protocol === 'file:') return false;
  if (stageMounted && !FarmStage.ready() && Date.now() - stageMountedAt > STAGE_BOOT_MS) return false;
  return true;
}

// La carte est affichée si Phaser est disponible et qu'on est sur la Ferme (pas dans un écran
// de détail). Sans Phaser, la Ferme garde sa liste classique.
function stageActive() {
  return stageUsable() && activeTab === 'ferme' && ecranFerme === null;
}

// Colonnes de la zone de culture selon le nombre de parcelles : 6, 12, 18, 24, 30 parcelles =
// 2×3, 3×4, 3×6, 4×6, 5×6 (colonnes × rangées), à partir du coin de `zone_culture` de la carte.
function stageCols(n) {
  return n <= 6 ? 2 : n <= 18 ? 3 : n <= 24 ? 4 : 5;
}

// Heure du jour, de 0 à 24 (fractionnaire) : la journée commence à DAY_START_HOUR au réveil,
// puis une heure passe toutes les CLOCK_SECONDS_PER_HOUR secondes d'éveil (18 s).
function heureDuJour() {
  const parHeure = DATA.TIME.CLOCK_SECONDS_PER_HOUR * 1000;
  return (DATA.TIME.DAY_START_HOUR + state.awakeMs / parHeure) % 24;
}

// Cadran d'horloge de l'heure entière : 🕐 (1 h) à 🕛 (12 h), le même le matin et le soir.
function horlogeEmoji(heure) {
  return String.fromCodePoint(0x1f550 + ((Math.floor(heure) + 11) % 12));
}

// Lieux de la carte qui portent une étiquette (et une fenêtre du même nom).
const STAGE_LIEUX = ['maison', 'etable', 'moulin', 'serre', 'verger', 'zone'];

// Le Moulin a-t-il sa propre fenêtre de travail (renderMoulin) ? Sinon ses commandes
// restent dans le Livre de recette.
function moulinSurPlace() {
  return typeof renderMoulin === 'function';
}

// Une « cible » dit où mène une notification, un indicateur ou un raccourci :
//   { fenetre, onglet, ancre } : une fenêtre de la carte (et, pour la Maison, son onglet) ;
//   { ecran, ancre }           : un écran de détail (panneaux, batteries) ;
//   { page, sous, ancre }      : un onglet du menu du bas (et son sous-onglet).
// `ancre` est l'id de l'élément à amener en haut : on arrive sur la ligne concernée.

// Où se règle un appareil (panne, entretien) : sa propre carte.
function lieuAppareil(id) {
  const d = id ? findDevice(state, id) : null;
  if (!d) return { fenetre: 'maison', onglet: 'batiments', ancre: 'bat-eau' };
  if (d.type === 'panneau') return { ecran: 'panneaux', ancre: `dev-${d.id}` };
  if (d.type === 'batterie') return { ecran: 'batteries', ancre: `dev-${d.id}` };
  if (d.type === 'moulin' && moulinSurPlace()) return { fenetre: 'moulin', ancre: 'moulin-appareil' };
  if (d.type === 'moulin' || d.type === 'presse') return { fenetre: 'maison', onglet: 'recettes', ancre: `station-${d.type}` };
  if (d.type === 'frigo') return { fenetre: 'maison', onglet: 'batiments', ancre: 'dev-frigo' };
  if (d.type === 'pompe') return { fenetre: 'maison', onglet: 'batiments', ancre: 'dev-pompe' };
  return { fenetre: 'maison', onglet: 'batiments', ancre: 'bat-eau' };
}

// Fenêtre de la carte où ranger une cible (pour les pastilles des étiquettes).
function fenetreDeCible(c) {
  return c.fenetre || (c.ecran ? 'maison' : null);
}

// Parcelles d'un lieu ('potager' ou 'serre') qui attendent un geste, avec les règles des
// notifications : à arroser, ou mûres (sauf ce que l'Arbre des technologies automatise).
function parcellesAFaire(lieu, quoi) {
  return allPlots(state).filter((p) => {
    if (!p.culture || p.lieu !== lieu) return false;
    if (isMature(p)) return quoi !== 'arrosage' && !techAuto(state, 'recolte', lieu);
    return quoi !== 'recolte' && !p.arrose && !techAuto(state, 'arrosage', lieu);
  }).length;
}

// Nombre de choses à faire par lieu de la carte : la pastille des étiquettes. Rien de
// nouveau : ce sont les alertes de getNotifications() et de alertSnapshot(), rangées là
// où elles se règlent, plus les malades à soigner (Maison › Famille).
function aFaireParLieu() {
  const n = { maison: 0, etable: 0, moulin: 0, serre: 0, verger: 0, zone: 0 };
  const snap = alertSnapshot(state);
  for (const id of snap.panne.concat(snap.entretien)) {
    const f = fenetreDeCible(lieuAppareil(id));
    if (f) n[f] += 1;
  }
  if (snap.batteriesVides) n.maison += 1;
  if (snap.frigoCoupe) n.maison += 1;
  n.maison += state.famille.membres.filter((m) => m.malade).length;
  for (const a of getNotifications(state)) {
    if (a.type === 'poules' || a.type === 'tonte') n.etable += a.nombre;
  }
  n.zone = parcellesAFaire('potager');
  n.serre = parcellesAFaire('serre');
  return n;
}

// Première parcelle d'un lieu qui attend le geste `quoi` ('arrosage' ou 'recolte').
function premiereParcelle(lieu, quoi) {
  return allPlots(state).find((p) => {
    if (!p.culture || p.lieu !== lieu) return false;
    if (isMature(p)) return quoi === 'recolte' && !techAuto(state, 'recolte', lieu);
    return quoi === 'arrosage' && !p.arrose && !techAuto(state, 'arrosage', lieu);
  }) || null;
}

// Où mène une alerte : la cible où elle se règle, à la ligne concernée. `type` est celui
// de getNotifications() ou de alertEvents() ; `id` l'appareil d'une panne ou d'un entretien.
function cibleAlerte(type, id) {
  switch (type) {
    case 'peremption': return { page: 'inventaire', sous: 'frais' };
    case 'panne': case 'entretien': return lieuAppareil(id || alertSnapshot(state)[type][0]);
    case 'batteriesVides': return { ecran: 'batteries' };
    case 'frigoCoupe': return { fenetre: 'maison', onglet: 'batiments', ancre: 'dev-frigo' };
    case 'arrosage': case 'recolte': {
      const lieu = parcellesAFaire('potager', type) > 0 || !isUnlocked(state, 'serre') ? 'potager' : 'serre';
      const p = premiereParcelle(lieu, type);
      return { fenetre: lieu === 'potager' ? 'zone' : 'serre', ancre: p ? `plot-${p.id}` : null };
    }
    case 'poules': return { fenetre: 'etable', ancre: 'etable-poules' };
    case 'tonte': {
      const m = state.paturage.moutons.find(woolReady);
      return { fenetre: 'etable', ancre: m ? `animal-${m.id}` : 'etable-animaux' };
    }
    // La paille se fait au Moulin ; tant qu'il n'existe pas, on montre le stock à l'Étable.
    case 'paille': case 'pailleManque':
      return isUnlocked(state, 'moulin') && state.stations.moulin.construit && moulinSurPlace()
        ? { fenetre: 'moulin', ancre: 'moulin-moudre' }
        : { fenetre: 'etable', ancre: 'etable-paille' };
    default: return { page: 'ferme' };
  }
}

function notifCible(n) {
  return cibleAlerte(n.type);
}

// Attributs d'un bouton qui mène à une cible (action `aller`, lue par cibleDe()).
function cibleAttrs(c) {
  const a = ['data-action="aller"'];
  if (c.page) a.push(`data-page="${c.page}"`);
  if (c.ecran) a.push(`data-screen="${c.ecran}"`);
  if (c.fenetre) a.push(`data-window="${c.fenetre}"`);
  if (c.onglet || c.sous) a.push(`data-tab="${c.onglet || c.sous}"`);
  if (c.ancre) a.push(`data-anchor="${c.ancre}"`);
  return a.join(' ');
}

function cibleDe(d) {
  if (d.page) return { page: d.page, sous: d.tab || null, ancre: d.anchor || null };
  if (d.screen) return { ecran: d.screen, ancre: d.anchor || null };
  return { fenetre: d.window, onglet: d.tab || null, ancre: d.anchor || null };
}

// Nom du lieu où mène une cible, pour l'écrire sous une notification.
function cibleNom(c) {
  if (c.page) return TABS.find((t) => t.id === c.page).label;
  if (c.ecran) return c.ecran === 'panneaux' ? 'Panneaux solaires' : 'Batteries';
  if (!stageUsable()) return 'Ferme';
  const w = STAGE_WINDOWS[c.fenetre];
  const onglet = c.fenetre === 'maison' && c.onglet ? MAISON_TABS.find((t) => t.id === c.onglet) : null;
  return onglet ? `${w.nom} › ${onglet.label}` : w.nom;
}

// Va à une cible : ouvre le bon menu et amène la ligne concernée en haut.
function allerA(c) {
  if (!c) return;
  if (c.page) {
    activeTab = tabAvailable(c.page) ? c.page : 'ferme';
    if (c.page === 'inventaire' && c.sous) invTab = c.sous;
    if (c.page === 'comptoir' && c.sous) comptoirTab = c.sous;
    stageWindow = null;
    stageReturn = null;
    ecranFerme = null;
  } else if (c.ecran) {
    // Écran de détail : au retour, on retombe sur Maison › Installations.
    activeTab = 'ferme';
    maisonTab = 'batiments';
    stageReturn = stageUsable() ? 'maison' : null;
    stageWindow = null;
    ecranFerme = c.ecran;
  } else {
    allerAuLieu(c.fenetre, c.onglet, c.ancre);
    return;
  }
  ancreVoulue = c.ancre || null;
  telView();
  lastRenderAt = 0; // rendu tout de suite
  refresh();
}

// Modèle de vue : tout ce que la carte a le droit de savoir. Aucune référence à `state`.
function stageModel() {
  const plots = state.potager.parcelles.map((p) => {
    if (!p.culture) return { id: p.id, culture: null, icone: '', phase: -1, mature: false, arrosee: !!p.arrose };
    const max = maxStage(p);
    const mature = isMature(p);
    const phase = mature ? 3 : p.stade <= 0 ? 0 : p.stade / max < 0.5 ? 1 : 2;
    return { id: p.id, culture: p.culture, icone: DATA.crops[p.culture].icone, phase, mature, arrosee: !!p.arrose };
  });
  // Lieux étiquetés : seulement ceux que le jeu a débloqués (la maison et la zone sont
  // toujours là), avec leur nom et le nombre de choses à y faire.
  const aFaire = aFaireParLieu();
  const batiments = {};
  for (const id of STAGE_LIEUX) batiments[id] = { visible: STAGE_WINDOWS[id].ok(), nom: STAGE_WINDOWS[id].nom, badge: aFaire[id] };
  // Heure arrondie au quart d'heure : la lumière de la carte change par petits pas.
  const heure = (Math.round(heureDuJour() * 4) / 4) % 24;
  return { season: currentSeason(state), heure, cols: stageCols(plots.length), plots, batiments };
}

// Pont carte → jeu : crée un bouton invisible portant data-action et le clique. La
// délégation d'événements existante fait le reste (action, fenêtre, suivi).
function stageAct(action, data) {
  const b = document.createElement('button');
  b.type = 'button';
  b.hidden = true;
  b.dataset.action = action;
  for (const k of Object.keys(data || {})) b.dataset[k] = data[k];
  document.getElementById('farm-stage').appendChild(b);
  b.click();
  b.remove();
}

function renderStage() {
  const el = document.getElementById('farm-stage');
  let on = stageActive();
  const wasOn = stageMounted && !el.hidden; // la carte était-elle déjà à l'écran ?
  if (on && !stageMounted) {
    stageMounted = true;
    stageMountedAt = Date.now();
    el.hidden = false;
    // Ne pas laisser un plantage de Phaser empêcher de jouer : repli sur la liste classique.
    try {
      if (!FarmStage.mount(el, { act: stageAct, onView: stageOnView, base: 'assets/', crops: cropSprites() })) stageBroken = true;
    } catch (err) {
      stageBroken = true;
    }
    if (stageBroken) {
      on = false;
      renderTabContent();
    }
  }
  el.hidden = !on;
  document.body.classList.toggle('has-stage', on);
  if (!on) {
    if (window.FarmStage) FarmStage.hide();
    return;
  }
  const head = document.querySelector('.app-header');
  document.documentElement.style.setProperty('--header-h', head.offsetHeight + 'px');
  FarmStage.show();
  FarmStage.update(stageModel());
  // Déplacement demandé par une notification ou un indicateur : sans animation si la carte
  // vient d'apparaître. Tant que la scène n'est pas prête, la demande attend.
  if (stagePan && FarmStage.ready()) {
    FarmStage.panTo(stagePan, !wasOn);
    stagePan = null;
  }
  renderStageHud(el);
}

/* Par-dessus la carte (DOM) : l'objectif du chapitre en haut, les trois points en bas, et
   une flèche sur chaque bord tant que le joueur n'a pas fait glisser la carte. */

const STAGE_DRAG_KEY = 'ferme-carte-glissee';
let stageDragged = safeStorageGet(STAGE_DRAG_KEY) === '1'; // le joueur a déjà fait glisser la carte
let stageView = null;  // dernière vue signalée par la scène (voir viewInfo() dans farm-stage.js)
let stagePan = null;   // lieu vers lequel la carte doit glisser au prochain rendu

// Appelé par la scène quand l'écran courant change, quand un bord est atteint ou quitté,
// et au premier glissement.
function stageOnView(v) {
  stageView = v;
  if (v.glisse && !stageDragged) {
    stageDragged = true;
    safeStorageSet(STAGE_DRAG_KEY, '1');
  }
  const el = document.getElementById('farm-stage');
  if (el && !el.hidden) renderStageNav(el);
}

// Objectif en cours, en une ligne : le premier objectif pas encore atteint du chapitre.
function chapterChipHtml() {
  const c = state.campagne;
  if (c.fini) {
    return '<button type="button" class="stage-chip done" data-action="stage-open" data-window="chapitres" aria-label="Campagne terminée, mode libre. Ouvrir les chapitres"><span class="stage-chip-pill"><span aria-hidden="true">🏆</span><span class="stage-chip-text">Mode libre</span><span class="stage-chip-go" aria-hidden="true">›</span></span></button>';
  }
  const p = chapterProgress(state);
  const faits = p.objectifs.filter((o) => o.ok).length;
  const o = p.objectifs.find((x) => !x.ok) || p.objectifs[p.objectifs.length - 1];
  const valeur = objectiveValueText(o);
  const pct = Math.round(o.ratio * 100);
  const suite = p.objectifs.length > 1 ? `, objectif ${Math.min(faits + 1, p.objectifs.length)} sur ${p.objectifs.length}` : '';
  return `<button type="button" class="stage-chip" data-action="stage-open" data-window="chapitres" aria-label="Chapitre ${p.chapitre}${suite} : ${o.libelle}${valeur ? `, ${valeur}` : ''}. Ouvrir les chapitres" title="Chapitre ${p.chapitre} : ${p.titre}"><span class="stage-chip-pill"><span aria-hidden="true">${p.icone}</span><span class="stage-chip-text">${o.libelle}</span><span class="stage-chip-val num">${valeur}</span><span class="stage-chip-go" aria-hidden="true">›</span><span class="stage-chip-bar" aria-hidden="true"><span style="width:${pct}%"></span></span></span></button>`;
}

function renderStageHud(el) {
  let hud = el.querySelector('.stage-hud');
  if (!hud) {
    el.insertAdjacentHTML('beforeend', '<div class="stage-hud"></div><div class="stage-nav"></div>');
    hud = el.querySelector('.stage-hud');
  }
  morph(hud, chapterChipHtml());
  if (!stageView) stageView = FarmStage.view();
  renderStageNav(el);
}

// Les trois points (écran de gauche, du milieu, de droite) et les flèches des bords.
function renderStageNav(el) {
  const nav = el.querySelector('.stage-nav');
  const v = stageView;
  if (!nav) return;
  if (!v || !v.mobile) {
    morph(nav, '');
    return;
  }
  const noms = ['Écran de gauche : l\'étable', 'Écran du milieu : la maison', 'Écran de droite : le moulin et la serre'];
  const dots = noms
    .map((nom, i) => `<button type="button" class="stage-dot${i === v.ecran ? ' active' : ''}" data-action="stage-pan" data-ecran="${i}" aria-label="${nom}" title="${nom}"${i === v.ecran ? ' aria-current="true"' : ''}><span aria-hidden="true"></span></button>`)
    .join('');
  const fleche = (cote, ecran, signe, nom) =>
    `<button type="button" class="stage-arrow ${cote}" data-action="stage-pan" data-ecran="${ecran}" aria-label="${nom}" title="${nom}"><span aria-hidden="true">${signe}</span></button>`;
  const arrows = stageDragged
    ? ''
    : (v.gauche ? fleche('gauche', Math.max(0, v.ecran - 1), '‹', 'La carte continue à gauche') : '') +
      (v.droite ? fleche('droite', Math.min(v.ecrans - 1, v.ecran + 1), '›', 'La carte continue à droite') : '');
  morph(nav, `<div class="stage-dots" role="group" aria-label="Écrans de la carte">${dots}</div>${arrows}`);
}

// Fait glisser la carte jusqu'à un écran (0, 1 ou 2).
function stagePanToScreen(i) {
  const v = window.FarmStage ? FarmStage.view() : null;
  if (!v || !v.mobile) return;
  const n = Math.max(0, Math.min(v.ecrans - 1, Number(i) || 0));
  FarmStage.panTo(v.min + ((v.max - v.min) * n) / (v.ecrans - 1));
}

/* ---------- Fenêtres de la carte ---------- */

// Un appui sur un bâtiment ou sur son étiquette ouvre une fenêtre dont le contenu est celui
// des sections de la Ferme, redessiné à chaque rendu : les boutons y fonctionnent comme
// dans la liste classique. Les fenêtres de #modal-root s'affichent par-dessus.
let stageWindow = null; // null, 'maison', 'etable', 'serre', 'moulin', 'verger', 'zone' ou 'chapitres'
let stageReturn = null; // fenêtre à rouvrir en revenant d'un écran de détail (panneaux, batteries)
let stageWindowShown = null; // dernière fenêtre dessinée (avec son onglet) : pour remonter en haut au changement
let maisonTab = 'famille'; // onglet de la fenêtre Maison
let ancreVoulue = null; // id de l'élément à amener en haut au prochain rendu (calendrier, eau…)

const MAISON_TABS = [
  { id: 'famille', label: 'Famille', icon: '👨‍👩‍👧‍👦', ok: () => tabAvailable('famille'), corps: () => renderFamille() },
  { id: 'recettes', label: 'Livre de recette', icon: '📖', ok: () => tabAvailable('recettes'), corps: () => renderRecettes() },
  { id: 'techno', label: 'Arbre des technologies', icon: '🌳', ok: () => tabAvailable('techno'), corps: () => renderTechno() },
  { id: 'batiments', label: 'Installations', icon: '🏗️', ok: () => true, corps: () => renderBatiments() },
];

function maisonCurrentTab() {
  const tabs = MAISON_TABS.filter((t) => t.ok());
  return tabs.find((t) => t.id === maisonTab) || tabs[0];
}

// Onglet « Installations » de la Maison (identifiant interne : batiments) : ce qui n'a pas
// de dessin sur la carte : ateliers (Four, Cuisine, Presse), énergie et eau,
// Silo, calendrier. Les ancres servent aux indicateurs du bandeau (💧, saison).
function renderBatiments() {
  return `${renderAteliers()}<div id="bat-eau" class="ancre">${renderEnergieEau()}</div>${isUnlocked(state, 'silo') ? renderSilo() : ''}<h3 class="section-title ancre" id="bat-calendrier">📅 Calendrier</h3>${renderCalendar()}`;
}

// Version 1.1.1 : les animaux s'achètent au Marché ; l'Étable y mène par un raccourci.
// (Les arbres, eux, s'achètent toujours au Verger.)
function lienMarcheAnimaux(libelle) {
  return `<p class="row"><button type="button" class="btn" ${cibleAttrs({ page: 'comptoir', sous: 'animaux' })}>🛒 ${libelle} au Marché <span aria-hidden="true">›</span></button></p>`;
}

function renderAchatPoules() {
  return state.poulailler.construit ? lienMarcheAnimaux('Acheter des poules') : '';
}

function renderAchatTroupeau() {
  return state.paturage.construit ? lienMarcheAnimaux('Acheter des moutons et des vaches') : '';
}

function renderAchatArbres() {
  return state.verger.construit ? renderArbres() : '';
}

// Une partie peut avoir des animaux avant que le chapitre n'ouvre leur logement (mode
// test, sauvegarde modifiée) : l'Étable et ses sections existent alors quand même, pour
// qu'aucun animal ne soit caché (et qu'aucune alerte ne parle d'animaux invisibles).
function coopShown() {
  return isUnlocked(state, 'poulailler') || state.poulailler.construit;
}

function herdShown() {
  return isUnlocked(state, 'paturage') || state.paturage.construit || sheepCount(state) + cowCount(state) > 0;
}

function renderEtableWindow() {
  const poules = coopShown() ? `<div id="etable-poules" class="ancre">${renderPoulailler()}${renderAchatPoules()}</div>` : '';
  const troupeau = herdShown() ? `<div id="etable-troupeau" class="ancre">${renderPaturage()}${renderAchatTroupeau()}</div>` : '';
  return poules + troupeau;
}

// Fenêtres de la carte. Deux tailles seulement : pleine hauteur (`haute`) ou demi-hauteur.
//   nom      : le lieu, tel qu'il est écrit sur son étiquette ;
//   detail   : complément du titre (niveau, emplacements) ;
//   sansTitre: le premier titre du contenu répète le titre de la fenêtre, il est masqué (CSS) ;
//   onglets  : rangée d'onglets fixe, sous le titre ;
//   ok       : la fenêtre (et son bâtiment sur la carte) existe-t-elle à ce stade de la partie ?
const STAGE_WINDOWS = {
  maison: {
    nom: 'Maison', icone: '🏠', ok: () => true, haute: true, sansTitre: true,
    onglets: () => subtabsHtml(MAISON_TABS.filter((t) => t.ok()), maisonCurrentTab().id, 'maison-tab'),
    corps: () => maisonCurrentTab().corps(),
  },
  etable: {
    nom: 'Étable', icone: '🐄',
    ok: () => coopShown() || herdShown(),
    corps: () => renderEtableWindow(),
  },
  serre: {
    nom: 'Serre', icone: '🪴', ok: () => isUnlocked(state, 'serre'), sansTitre: true,
    detail: () => (state.serre.construit ? `niveau ${state.serre.niveau}` : ''),
    corps: () => renderSerre(),
  },
  // Le Moulin : on y fait la farine (renderMoulin). Les autres ateliers sont dans la Maison.
  moulin: {
    nom: 'Moulin', icone: '⚙️', ok: () => isUnlocked(state, 'moulin'),
    corps: () => (typeof renderMoulin === 'function' ? renderMoulin() : renderAteliers()),
  },
  verger: {
    nom: 'Verger', icone: '🍎', ok: () => isUnlocked(state, 'verger'), sansTitre: true,
    detail: () => (state.verger.construit ? `${state.verger.arbres.length} / ${state.verger.places} emplacements` : ''),
    corps: () => renderVerger() + renderAchatArbres(),
  },
  zone: {
    nom: DATA.POTAGER.NOM, icone: '🌱', ok: () => true, haute: true, sansTitre: true,
    detail: () => `niveau ${state.potager.niveau}`,
    corps: () => renderPotager(),
  },
  chapitres: { nom: 'Chapitres', icone: '📜', ok: () => true, corps: () => renderChapterBanner() },
};

function renderStageWindow() {
  const root = document.getElementById('window-root');
  const w = stageWindow ? STAGE_WINDOWS[stageWindow] : null;
  if (stageWindow && (!w || !w.ok() || !stageActive())) stageWindow = null;
  if (!stageWindow) {
    if (root.childElementCount) morph(root, '');
    stageWindowShown = null;
    return;
  }
  const detail = w.detail ? w.detail() : '';
  morph(root, `
    <div class="window-layer">
      <div class="window-backdrop" data-action="stage-close"></div>
      <section class="stage-window ${w.haute ? 'tall' : 'half'}" role="dialog" aria-modal="true" aria-labelledby="stage-window-title">
        <header class="window-head">
          <h2 id="stage-window-title"><span aria-hidden="true">${w.icone}</span> ${w.nom}${detail ? `<span class="window-detail"> · ${detail}</span>` : ''}</h2>
          <button type="button" class="icon-btn" id="stage-window-close" data-action="stage-close" aria-label="Fermer la fenêtre" title="Fermer">✕</button>
        </header>
        ${w.onglets ? `<div class="window-tabs">${w.onglets()}</div>` : ''}
        <div class="window-body${w.sansTitre ? ' sans-titre' : ''}">${w.corps()}</div>
      </section>
    </div>`);
  // Autre fenêtre ou autre onglet : le contenu repart du haut ; à l'ouverture, le focus va sur ✕.
  const shown = stageWindow + (stageWindow === 'maison' ? ':' + maisonCurrentTab().id : '');
  if (shown !== stageWindowShown) {
    const opening = stageWindowShown === null;
    stageWindowShown = shown;
    root.querySelector('.window-body').scrollTop = 0;
    if (opening) document.getElementById('stage-window-close').focus({ preventScroll: true });
  }
}

function openStageWindow(id) {
  if (!STAGE_WINDOWS[id] || !STAGE_WINDOWS[id].ok()) return;
  stageWindow = id;
  stageReturn = null;
  renderStageWindow(); // tout de suite, sans attendre la cadence de rendu
  refresh();
}

function closeStageWindow() {
  stageWindow = null;
  stageReturn = null;
  renderStageWindow();
  refresh();
}

// Règle de rangement : un lieu s'ouvre sur la carte. Va à la fenêtre `fenetre` (et, pour la
// Maison, à son onglet), fait glisser la carte jusqu'au bâtiment et amène `ancre` en haut.
// Sans la carte, ce sont les pages classiques : Famille, Livre de recette, Arbre des
// technologies, ou la liste de la Ferme.
function allerAuLieu(fenetre, onglet, ancre) {
  ecranFerme = null;
  stageReturn = null;
  if (stageUsable()) {
    activeTab = 'ferme';
    if (fenetre === 'maison' && onglet) maisonTab = onglet;
    stageWindow = STAGE_WINDOWS[fenetre] && STAGE_WINDOWS[fenetre].ok() ? fenetre : null;
    if (STAGE_LIEUX.includes(fenetre)) stagePan = fenetre;
  } else {
    stageWindow = null;
    activeTab = fenetre === 'maison' && FERME_LINKS.includes(onglet) && tabAvailable(onglet) ? onglet : 'ferme';
  }
  ancreVoulue = ancre || null;
  telView();
  lastRenderAt = 0; // rendu tout de suite : la fenêtre s'ouvre sans attendre la cadence
  refresh();
}

// Amène l'ancre demandée en haut de ce qui défile (fenêtre de la carte ou page).
function applyAnchor() {
  if (!ancreVoulue) return;
  const el = document.getElementById(ancreVoulue);
  ancreVoulue = null;
  if (el) el.scrollIntoView({ block: 'start' });
}

// Bandeau : chaque indicateur porte sa légende ; ceux qui ont un lieu y mènent (saison →
// calendrier, eau → Maison › Installations, autonomie → Maison › Famille).
function renderIndicators() {
  const saison = DATA.SAISONS.INFOS[currentSeason(state)];
  const heure = Math.floor(heureDuJour());
  const cell = (icone, valeur, legende, titre) =>
    `<span class="indicator" title="${titre}"><span class="ind-val"><span aria-hidden="true">${icone}</span>${valeur ? `<span class="num">${valeur}</span>` : ''}</span><span class="ind-leg">${legende}</span></span>`;
  const lien = (icone, valeur, legende, titre, lieu) =>
    `<button type="button" class="indicator indicator-btn" data-action="stage-goto" data-window="${lieu.fenetre}" data-tab="${lieu.onglet}"${lieu.ancre ? ` data-anchor="${lieu.ancre}"` : ''} title="${titre}" aria-label="${titre}"><span class="ind-val"><span aria-hidden="true">${icone}</span>${valeur ? `<span class="num">${valeur}</span>` : ''}</span><span class="ind-leg">${legende}</span></button>`;
  // Première ligne, à côté du titre : la nuit et l'heure. Deuxième ligne : le reste.
  morph(document.getElementById('app-clock'),
    cell('🌙', state.day, 'Nuit', `Nuit ${state.day}`) +
    cell(horlogeEmoji(heure), `${heure} h`, 'Heure', `Heure de la journée : ${heure} h`));
  morph(document.getElementById('indicators'),
    lien(saison.icone, '', saison.nom, `Saison : ${saison.nom}. Ouvrir le calendrier`, { fenetre: 'maison', onglet: 'batiments', ancre: 'bat-calendrier' }) +
    lien('💧', formatLitres(state.eauMl), 'Eau', `Eau du réservoir : ${formatLitres(state.eauMl)}. Ouvrir l'énergie et l'eau`, { fenetre: 'maison', onglet: 'batiments', ancre: 'bat-eau' }) +
    cell('💰', formatCoins(state.pieces), 'Pièces', `Pièces : ${formatCoins(state.pieces)}`) +
    lien('🌿', formatPercent(lastAutonomy(state)), 'Autonomie', `Autonomie de la dernière nuit : ${formatPercent(lastAutonomy(state))}. Ouvrir la Famille`, { fenetre: 'maison', onglet: 'famille' })
  );
}

function renderTabbar() {
  const current = FERME_LINKS.includes(activeTab) ? 'ferme' : activeTab;
  const alerts = notificationCount(state);
  morph(
    document.getElementById('bottom-nav'),
    NAV_TABS.map((id) => TABS.find((t) => t.id === id))
      .filter((t) => tabAvailable(t.id))
      .map((t) => {
        const badge = t.id === 'notifications' && alerts > 0 ? `<span class="nav-badge" aria-hidden="true">${alerts}</span>` : '';
        const label = t.id === 'notifications' && alerts > 0 ? `${t.label} (${alerts} alerte${alerts > 1 ? 's' : ''})` : t.label;
        return `<button type="button" class="nav-btn${t.id === current ? ' active' : ''}" data-action="switch-tab" data-tab="${t.id}" aria-label="${label}"${t.id === current ? ' aria-current="page"' : ''}><span class="nav-icon" aria-hidden="true">${t.icon}${badge}</span><span class="nav-label">${t.label}</span></button>`;
      })
      .join('')
  );
}

// Chaque onglet donne une liste de tranches (la Ferme en a une par section).
// render() ramène déjà un onglet non débloqué sur la Ferme.
const TAB_RENDERERS = {
  // Avec la carte, tout passe par elle et ses fenêtres ; sans Phaser, la liste classique.
  ferme: () => (ecranFerme === 'panneaux' || ecranFerme === 'batteries' ? [renderDeviceScreen(ecranFerme)] : stageActive() ? [''] : renderFerme()),
  famille: () => [backToFerme() + renderFamille()],
  inventaire: () => [renderInventaire()],
  comptoir: () => [renderComptoir()],
  recettes: () => [backToFerme() + renderRecettes()],
  techno: () => [backToFerme() + renderTechno()],
  notifications: () => [renderNotifications()],
};

function renderTabContent() {
  morphSlots(document.getElementById('tab-content'), (TAB_RENDERERS[activeTab] || TAB_RENDERERS.ferme)());
}

// Bouton « Zzz » (Dormir), en bas à droite sur tous les onglets. L'aperçu du repas est dans
// son libellé (title / aria-label) ; une pastille ne s'affiche que si le repas prévu est insuffisant.
function renderSleepBar() {
  const remaining = Math.max(1, Math.ceil((awakeRequired(state) * 1000 - state.awakeMs) / 1000));
  // Après 19 h, le repas est pris : on montre ce qui a été mangé, plus ce qui est prévu.
  const plan = state.repas || planMeal(state);
  const short = plan.energie + EPS < plan.besoin;
  const eaten = `${formatNumber(Math.min(plan.energie, plan.besoin))} / ${formatNumber(plan.besoin)}`;
  const meal = `${state.repas ? `Repas pris à ${DATA.TIME.MEAL_HOUR} h` : `Repas prévu à ${DATA.TIME.MEAL_HOUR} h`} : ${eaten} énergie${short ? ' (insuffisant)' : ''} · autonomie ${formatPercent(plannedAutonomy(state))}`;
  const ok = canSleep(state);
  const label = `${ok ? 'Dormir' : `Dormir (dans ${remaining} s)`}. ${meal}`;
  morph(
    document.getElementById('sleep-fab'),
    (short ? `<span class="chip warn meal-chip" title="${meal}"><span aria-hidden="true">🍽️ ${eaten} ⚠️</span><span class="visually-hidden">${meal}</span></span>` : '') +
      `<button type="button" class="sleep-btn${tutoTarget('dormir')}" data-action="sleep" title="${label}" aria-label="${label}"${ok ? '' : ' disabled'}><span aria-hidden="true">Zzz</span>${ok ? '' : `<span class="sleep-wait" aria-hidden="true">${remaining} s</span>`}</button>`
  );
}

function renderTestPanel() {
  const panel = document.getElementById('test-panel');
  panel.hidden = !testMode;
  if (!testMode) return;
  syncTestDeviceSelect();
  // Lot 11 : l'état complet n'est sérialisé que si le panneau est déplié.
  if (!panel.open) return;
  const dump = document.getElementById('state-dump');
  const text = JSON.stringify(state, null, 2);
  if (dump.textContent !== text) dump.textContent = text;
}

// La liste des appareils du mode test n'est reconstruite que si le parc change.
function syncTestDeviceSelect() {
  const sel = document.getElementById('test-device');
  const devices = allDevices(state);
  const signature = devices.map((d) => d.id).join('|');
  if (sel.dataset.signature === signature) return;
  const previous = sel.value;
  sel.innerHTML = devices.map((d) => `<option value="${d.id}">${deviceName(d)}</option>`).join('');
  sel.dataset.signature = signature;
  if (devices.some((d) => d.id === previous)) sel.value = previous;
}

/* ---------- Ferme : cartes et écrans de détail ---------- */

const DEVICE_ICONS = { panneau: '☀️', batterie: '🔋', pompe: '⛲', moulin: '⚙️', presse: '🌻', frigo: '🧊' };
const DEVICE_NAMES = { panneau: 'Panneau', batterie: 'Batterie', pompe: 'Pompe', moulin: 'Moulin', presse: 'Presse', frigo: 'Réfrigérateur' };

function deviceName(d) {
  if (d.type === 'pompe' || d.type === 'moulin' || d.type === 'presse' || d.type === 'frigo') return DEVICE_NAMES[d.type];
  const list = d.type === 'panneau' ? state.panneaux : state.batteries;
  return `${DEVICE_NAMES[d.type]} n°${list.indexOf(d) + 1}`;
}

function costLabel(cost) {
  return cost === 0 ? 'gratuit' : `${formatCoins(cost)} 💰`;
}

function canPay(cost) {
  return state.pieces + EPS >= cost;
}

function alertLine(aEntretenir, enPanne) {
  const parts = [];
  if (enPanne) parts.push(`⛔ ${enPanne} en panne`);
  if (aEntretenir) parts.push(`⚠️ ${aEntretenir} à entretenir`);
  return parts.length ? `<span class="alert">${parts.join(' · ')}</span>` : '';
}

// En-tête des écrans ouverts depuis la Ferme.
function backToFerme() {
  return '<div class="screen-head"><button type="button" class="btn" data-action="switch-tab" data-tab="ferme">← Ferme</button></div>';
}

// Raccourcis de la Ferme : Famille, Livre de recette, Arbre des technologies
// (les deux derniers seulement une fois débloqués).
function renderFermeLinks() {
  const links = FERME_LINKS.filter((id) => tabAvailable(id))
    .map((id) => TABS.find((t) => t.id === id))
    .map((t) => `<button type="button" class="ferme-link" data-action="switch-tab" data-tab="${t.id}"><span aria-hidden="true">${t.icon}</span><span>${t.label}</span></button>`)
    .join('');
  return links ? `<nav class="ferme-links" aria-label="Raccourcis de la ferme">${links}</nav>` : '';
}

function renderFerme() {
  // Lot 11 : une tranche par section, toujours le même nombre de tranches (une
  // section pas encore débloquée est vide) : chacune n'est mise à jour que si
  // son gabarit a changé.
  // Les achats d'animaux et d'arbres suivent leur section (comme dans les fenêtres de la
  // carte) ; les ancres sont celles des indicateurs du bandeau et des notifications.
  return [
    `<h2>🌾 Ferme</h2>${renderFermeLinks()}${renderChapterBanner()}<div id="bat-calendrier" class="ancre">${renderCalendar()}</div>`,
    renderPotager(),
    isUnlocked(state, 'serre') ? renderSerre() : '',
    isUnlocked(state, 'silo') ? renderSilo() : '',
    coopShown() ? `<div id="etable-poules" class="ancre">${renderPoulailler()}</div>` : '',
    coopShown() ? renderAchatPoules() : '',
    herdShown() ? `<div id="etable-troupeau" class="ancre">${renderPaturage()}</div>` : '',
    herdShown() ? renderAchatTroupeau() : '',
    isUnlocked(state, 'verger') ? renderVerger() : '',
    isUnlocked(state, 'verger') ? renderAchatArbres() : '',
    renderAteliers(),
    typeof renderMoulin === 'function' ? renderMoulin() : '',
    `<div id="bat-eau" class="ancre">${renderEnergieEau()}</div>`,
  ];
}

// Cartes « Énergie et eau » : dans la liste classique de la Ferme et dans la fenêtre
// Maison › Installations de la carte.
function renderEnergieEau() {
  const e = energyStats(state), p = state.pompe, ps = deviceStatus(state, p), cap = tankCapacity(state);
  let netText = 'Stable (0 Wh/s)';
  if (e.net > 0) netText = `En charge (${formatWhRate(e.net, true)})`;
  else if (e.net < 0) netText = `En décharge (${formatWhRate(e.net, true)})`;
  const tankText = state.eauMl >= cap ? 'Réservoir plein' : `Vitesse de remplissage : ${formatLitresRate(state.flux.eau)}`;
  return `
    <h3 class="section-title">⚡ Énergie et eau</h3>
    <div class="cards">
      <button type="button" class="card" data-action="open-screen" data-screen="panneaux">
        <span class="card-title"><span>${icon('panneau')}Production d'énergie</span><span class="chevron" aria-hidden="true">›</span></span>
        <span class="big">${formatWhRate(e.production)}</span>
        <span class="muted">${e.panneauxEnMarche} panneau${e.panneauxEnMarche > 1 ? 'x' : ''} en marche sur ${e.panneauxTotal}</span>
        ${alertLine(e.panneauxAEntretenir, e.panneauxEnPanne)}
      </button>
      <button type="button" class="card" data-action="open-screen" data-screen="batteries">
        <span class="card-title"><span>${icon('batterie')}Stockage d'énergie</span><span class="chevron" aria-hidden="true">›</span></span>
        <span class="big">${formatNumber(Math.floor(e.charge / 1000))} / ${formatWh(e.capacite)}</span>
        <span class="muted">${netText}</span>
        ${alertLine(e.batteriesAEntretenir, e.batteriesEnPanne)}
      </button>
      <div class="card ancre${tutoTarget('eau')}" id="dev-pompe">
        <span class="card-title"><span>${icon('pompe')}Pompe · niveau ${p.niveau}</span><span class="chips"><span class="chip${ps.code === 'panne' ? ' panne' : ''}">${ps.label}</span>${helpBtn('pompe')}</span></span>
        <span class="muted">Débit réel : <span class="num">${formatLitresRate(p.debit)}</span> (max ${formatLitresRate(pumpFlow(p))})</span>
        <span class="muted">Consommation : <span class="num">${formatWhRate(p.conso)}</span></span>
        ${wearHtml(p)}
        ${deviceControls(p)}
      </div>
      <div class="card${tutoTarget('eau')}">
        <span class="card-title"><span>${icon('reservoir')}Réservoir</span>${helpBtn('reservoir')}</span>
        <span class="big">${formatNumber(Math.floor(state.eauMl / 1000))} / ${formatLitres(cap)}</span>
        <span class="muted">${tankText}</span>
      </div>
      ${isUnlocked(state, 'frigo') ? renderFridgeCard() : ''}
    </div>
  `;
}

function wearHtml(d) {
  const pct = d.usure;
  const cls = isBroken(d) ? ' bad' : needsService(d) ? ' warn' : '';
  return `
    <span class="muted">Usure : <span class="num">${formatNumber(pct)} %</span> · rendement ${formatNumber(efficiency(d))} %</span>
    <span class="bar" role="progressbar" aria-label="Usure" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(d.usure)}"><span class="bar-fill${cls}" style="width:${pct}%"></span></span>
  `;
}

// Interrupteur à deux positions : rouge à l'arrêt, vert en marche, et l'état
// est aussi écrit (la couleur n'est jamais la seule indication).
function switchHtml(d) {
  const broken = isBroken(d);
  const on = d.allume && !broken;
  const text = broken ? 'En panne' : on ? 'Marche' : 'Arrêt';
  return `<button type="button" class="switch" role="switch" aria-checked="${on}" aria-label="${deviceName(d)}" data-action="toggle" data-id="${d.id}"${broken ? ' disabled' : ''}><span class="knob" aria-hidden="true"></span><span>${text}</span></button>`;
}

function deviceControls(d) {
  const up = upgradeCost(d);
  const maintain = maintainCost(d);
  const repair = repairCost(d);
  const broken = isBroken(d);
  const upgradeBtn =
    up === null
      ? '<button type="button" class="btn" disabled>Niveau max</button>'
      : `<button type="button" class="btn" data-action="upgrade" data-id="${d.id}"${canPay(up) ? '' : ' disabled'}>Améliorer (${costLabel(up)})</button>`;
  const maintainOk = !broken && (d.usure > 0 || d.usureMs > 0) && canPay(maintain);
  const repairOk = broken && canPay(repair);
  return `
    <span class="device-actions">
      ${switchHtml(d)}
      ${upgradeBtn}
      <button type="button" class="btn" data-action="maintain" data-id="${d.id}"${maintainOk ? '' : ' disabled'}>Entretenir (${costLabel(maintain)})</button>
      <button type="button" class="btn" data-action="repair" data-id="${d.id}"${repairOk ? '' : ' disabled'}>Réparer (${costLabel(repair)})</button>
    </span>
  `;
}

function deviceRow(d) {
  const st = deviceStatus(state, d);
  let detail;
  if (d.type === 'panneau') {
    detail = `<span class="muted">Production : <span class="num">${formatWhRate(d.prod)}</span> (max ${formatWhRate(panelOutput(d, state))})</span>`;
  } else {
    const cap = batteryCapacity(d);
    let flow = 'Ni charge ni décharge';
    if (st.code === 'decharge') flow = `Puissance soutirée : ${formatWhRate(-d.sortie, true)}`;
    else if (st.code === 'charge') flow = `Charge : ${formatWhRate(d.entree, true)}`;
    detail = `
      <span class="muted">Charge : <span class="num">${formatNumber(Math.floor(d.chargeMwh / 1000))} / ${formatWh(cap)}</span></span>
      <span class="muted">${flow}</span>`;
  }
  const badge = st.badge ? `<span class="chip warn">⚠️ ${st.badge}</span>` : '';
  return `
    <article class="card ancre" id="dev-${d.id}">
      <span class="card-title"><span>${DEVICE_ICONS[d.type]} ${deviceName(d)} · niveau ${d.niveau}</span><span class="chip${st.code === 'panne' ? ' panne' : ''}">${st.label}</span></span>
      ${badge}
      ${detail}
      ${wearHtml(d)}
      ${deviceControls(d)}
    </article>
  `;
}

function renderDeviceScreen(kind) {
  const isPanels = kind === 'panneaux';
  const list = isPanels ? state.panneaux : state.batteries;
  const type = isPanels ? 'panneau' : 'batterie';
  const e = energyStats(state);
  const price = nextPurchasePrice(state, type);
  const summary = isPanels
    ? `<span class="big">${formatWhRate(e.production)}</span>
       <span class="muted">${e.panneauxEnMarche} panneau${e.panneauxEnMarche > 1 ? 'x' : ''} en marche sur ${e.panneauxTotal}</span>`
    : `<span class="big">${formatNumber(Math.floor(e.charge / 1000))} / ${formatWh(e.capacite)}</span>
       <span class="muted">Total reçu : ${formatWhRate(e.entree, true)} · Total soutiré : ${formatWhRate(-e.sortie, true)}</span>`;
  return `
    <div class="screen-head">
      <button type="button" class="btn" data-action="close-screen">← Ferme</button>
      <h2>${icon(type)}${isPanels ? 'Production d\'énergie' : 'Stockage d\'énergie'}</h2>
      ${helpBtn(type)}
    </div>
    <div class="stack">${summary}</div>
    <div class="device-list">${list.map(deviceRow).join('')}</div>
    <button type="button" class="btn primary" data-action="buy" data-type="${type}"${canPay(price) ? '' : ' disabled'}>Acheter ${isPanels ? 'un panneau' : 'une batterie'} (${formatCoins(price)} 💰)</button>
  `;
}

/* ---------- Ferme : Zone de culture (state.potager) ---------- */

function renderPotager() {
  const pot = state.potager;
  const up = potagerUpgradeCost(state);
  const prod = productivity(state);
  const upBtn =
    up === null
      ? '<button type="button" class="btn" disabled>Zone de culture au niveau maximum</button>'
      : `<button type="button" class="btn" data-action="upgrade-potager"${canPay(up) ? '' : ' disabled'}>Agrandir : niveau ${pot.niveau + 1}, ${DATA.POTAGER.PARCELLES[pot.niveau]} parcelles (${costLabel(up)})</button>`;
  return `
    <div class="section-head">
      <h3>${icon('potager')}${DATA.POTAGER.NOM} · niveau ${pot.niveau}</h3>
      <span class="chips">${autoChip('potager', 'Arrose et récolte tout seul, à 100 %, pendant la nuit')}<span class="chip${prod < 100 ? ' warn' : ''}" title="Productivité : ne s'applique qu'aux actions au clic">Productivité ${formatPercent(prod)}</span>${helpBtn('potager')}</span>
    </div>
    <div class="plots${tutoTarget('potager')}">${pot.parcelles.map((p, i) => plotCard(p, i + 1)).join('')}</div>
    <div class="row plot-foot">${groupButtons('potager')}${upBtn}</div>
  `;
}

/* ---------- Ferme : Silo et Poulailler ---------- */

function renderSilo() {
  const s = state.silo;
  if (!s.construit) {
    const cost = DATA.SILO.CONSTRUCTION;
    return `
      <div class="section-head"><h3>${icon('silo')}Silo</h3>${helpBtn('silo')}</div>
      <div class="card">
        <span class="muted">Le blé récolté y est rangé d'abord ; les poules y mangent d'abord. Capacité de départ : ${DATA.SILO.CAPACITE[0]} blés.</span>
        <button type="button" class="btn primary" data-action="build-silo"${canPay(cost) ? '' : ' disabled'}>Construire le Silo (${costLabel(cost)})</button>
      </div>`;
  }
  const cap = siloCapacity(state);
  const pct = cap > 0 ? Math.min(100, Math.round((s.ble / cap) * 100)) : 0;
  const cls = s.ble >= cap - EPS ? ' warn' : '';
  const surplus = countItem(state, DATA.SILO.ITEM);
  const up = siloUpgradeCost(state);
  const upBtn =
    up === null
      ? '<button type="button" class="btn" disabled>Silo au niveau maximum</button>'
      : `<button type="button" class="btn" data-action="upgrade-silo"${canPay(up) ? '' : ' disabled'}>Agrandir : niveau ${s.niveau + 1}, ${formatNumber(DATA.SILO.CAPACITE[s.niveau])} blés (${costLabel(up)})</button>`;
  return `
    <div class="section-head"><h3>${icon('silo')}Silo · niveau ${s.niveau}</h3>${helpBtn('silo')}</div>
    <div class="card">
      <span class="big">${formatQty(s.ble)} / ${formatNumber(cap)} 🌾</span>
      <span class="bar" role="progressbar" aria-label="Remplissage du Silo" aria-valuemin="0" aria-valuemax="${cap}" aria-valuenow="${Math.round(s.ble)}"><span class="bar-fill${cls}" style="width:${pct}%"></span></span>
      <span class="muted">${s.ble >= cap - EPS ? 'Silo plein : le surplus de blé va dans l\'inventaire.' : 'Le blé récolté est rangé ici en premier.'}${surplus > 0 ? ` Inventaire : ${formatQty(surplus)} blé${surplus > 1 ? 's' : ''}.` : ''}</span>
      ${upBtn}
    </div>`;
}

function renderPoulailler() {
  const p = state.poulailler;
  if (!p.construit) {
    const cost = DATA.POULAILLER.CONSTRUCTION;
    return `
      <div class="section-head"><h3>${icon('poulailler')}Poulailler</h3>${helpBtn('poulailler')}</div>
      <div class="card">
        <span class="muted">1 blé nourrit ${DATA.ANIMAUX.poule.poulesParBle} poules pour la nuit ; une poule nourrie pond 1 œuf. Capacité de départ : ${DATA.POULAILLER.CAPACITE[0]} poules. Les poules s'achètent au Marché.</span>
        <button type="button" class="btn primary" data-action="build-poulailler"${canPay(cost) ? '' : ' disabled'}>Construire le Poulailler (${costLabel(cost)})</button>
      </div>`;
  }
  const cap = coopCapacity(state);
  const toFeed = hensToFeed(state);
  const noWheat = !canFeedHen(state);
  const prod = productivity(state);
  const up = coopUpgradeCost(state);
  const upBtn =
    up === null
      ? '<button type="button" class="btn" disabled>Poulailler au niveau maximum</button>'
      : `<button type="button" class="btn" data-action="upgrade-poulailler"${canPay(up) ? '' : ' disabled'}>Agrandir : niveau ${p.niveau + 1}, ${DATA.POULAILLER.CAPACITE[p.niveau]} poules (${costLabel(up)})</button>`;
  let hint;
  if (p.poules === 0) hint = 'Aucune poule : achètes-en au Marché (onglet Animaux).';
  else if (toFeed === 0) hint = '✅ Toutes les poules sont nourries : elles pondront cette nuit.';
  else if (isAutomated(state, 'poulailler')) hint = `🤖 Nourrissage automatique : les poules restantes seront nourries cette nuit avec le blé disponible (${formatQty(wheatTotal(state))}).`;
  else if (noWheat) hint = '⚠️ Pas assez de blé pour nourrir une poule.';
  else hint = `Une poule non nourrie ne pond pas. Blé disponible : ${formatQty(wheatTotal(state))}.`;
  return `
    <div class="section-head">
      <h3>${icon('poulailler')}Poulailler · niveau ${p.niveau}</h3>
      <span class="chips">${autoChip('poulailler', 'Nourrit les poules tout seul, à 100 %, pendant la nuit')}<span class="chip${prod < 100 ? ' warn' : ''}" title="Un nourrissage au clic ne compte qu'avec cette probabilité">Productivité ${formatPercent(prod)}</span>${helpBtn('poulailler')}</span>
    </div>
    <div class="card">
      ${coopArtRow()}
      <span class="big" aria-label="Poules nourries sur total">🥚 ${p.nourries} / ${p.poules} nourries</span>
      <span class="muted">Poules : <span class="num">${p.poules} / ${cap}</span> · 1 blé pour ${DATA.ANIMAUX.poule.poulesParBle} poules${p.restes > 0 ? ` (ration entamée : encore ${p.restes})` : ''}</span>
      <span class="bar" role="progressbar" aria-label="Poules nourries" aria-valuemin="0" aria-valuemax="${p.poules}" aria-valuenow="${p.nourries}"><span class="bar-fill" style="width:${p.poules ? Math.round((p.nourries / p.poules) * 100) : 0}%"></span></span>
      <span class="muted">${hint}</span>
      <span class="device-actions">
        <button type="button" class="btn primary" data-action="feed-all"${toFeed > 0 && !noWheat ? '' : ' disabled'}>🌾 Nourrir tout</button>
        <button type="button" class="btn" data-action="feed-hen"${toFeed > 0 && !noWheat ? '' : ' disabled'}>Nourrir une poule</button>
      </span>
      ${upBtn}
    </div>`;
}

/* ---------- Ferme : Étable — moutons et vaches (state.paturage) ---------- */

// « 1 place », « 3 places ».
function formatPlaces(n) {
  return `${formatNumber(n)} place${n > 1 ? 's' : ''}`;
}

// « 1 paille », « 2 pailles ».
function formatStraw(n) {
  return `${formatNumber(n)} paille${n > 1 ? 's' : ''}`;
}

function sheepNumber(m) {
  return m.id.replace('mouton-', '');
}

// Numéro d'affichage d'une vache, sur le modèle de sheepNumber().
function cowNumber(v) {
  return v.id.replace('vache-', '');
}

// Animaux qui mangeront cette nuit avec la paille en stock : les moutons
// d'abord, puis les vaches, dans l'ordre de la liste (comme feedLivestock()).
function strawPlan() {
  const A = DATA.ANIMAUX;
  let left = strawStock(state);
  const fed = new Set();
  for (const m of state.paturage.moutons) {
    if (left < A.mouton.pailleParNuit) continue;
    left -= A.mouton.pailleParNuit;
    fed.add(m.id);
  }
  for (const v of state.paturage.vaches) {
    if (left < A.vache.pailleParNuit) continue;
    left -= A.vache.pailleParNuit;
    fed.add(v.id);
  }
  return fed;
}

function sheepCard(m, fed) {
  const M = DATA.ANIMAUX.mouton;
  const ready = woolReady(m);
  const woolPct = Math.round((m.laine / M.joursLaine) * 100);
  const woolText = ready ? 'Laine prête' : `Laine : ${m.laine} / ${M.joursLaine} nuits nourri`;
  const willEat = fed.has(m.id);
  return `
    <article class="card sheep ancre${ready ? ' ready' : ''}" id="animal-${m.id}">
      <span class="card-title"><span>Mouton n°${sheepNumber(m)}</span><span class="chip${ready ? ' badge' : ''}">${ready ? '🧶 Prêt à tondre' : 'Laine en cours'}</span></span>
      <span class="card-art-row">${artSvg([ready ? 'sheep-wool' : 'sheep-shorn'], '', `${m.id}-${ready ? 'laine' : 'tondu'}`, 'grow')}</span>
      <span class="muted">${woolText}</span>
      <span class="bar" role="progressbar" aria-label="Laine" aria-valuemin="0" aria-valuemax="${M.joursLaine}" aria-valuenow="${m.laine}"><span class="bar-fill${ready ? '' : ' warn'}" style="width:${woolPct}%"></span></span>
      <span class="${willEat ? 'muted' : 'alert'}">${willEat ? `✅ Mangera ${formatStraw(M.pailleParNuit)} cette nuit` : '⚠️ Pas de paille pour lui cette nuit : sa laine n\'avancera pas'}</span>
      <span class="device-actions">
        <button type="button" class="btn primary" data-action="shear" data-id="${m.id}"${ready ? '' : ' disabled'}>✂️ Tondre</button>
      </span>
    </article>`;
}

// Carte d'une vache : pas de laine, son lait vient la nuit même où elle mange.
function cowCard(v, fed) {
  const V = DATA.ANIMAUX.vache;
  const willEat = fed.has(v.id);
  return `
    <article class="card sheep ancre" id="animal-${v.id}">
      <span class="card-title"><span>Vache n°${cowNumber(v)}</span><span class="chip${willEat ? ' badge' : ''}">${willEat ? '🥛 Lait cette nuit' : 'Pas de lait cette nuit'}</span></span>
      <span class="card-art-row">${artSvg(['cow'], '', v.id, 'grow')}</span>
      <span class="${willEat ? 'muted' : 'alert'}">${willEat ? `✅ Mangera ${formatStraw(V.pailleParNuit)} cette nuit` : `⚠️ Il lui faut ${formatStraw(V.pailleParNuit)} pour donner son lait`}</span>
    </article>`;
}

// Section « Moutons et vaches » de l'Étable. (Le nom de la fonction et
// state.paturage sont historiques.)
function renderPaturage() {
  const p = state.paturage;
  const P = DATA.PATURAGE;
  const M = DATA.ANIMAUX.mouton;
  const V = DATA.ANIMAUX.vache;
  const straw = DATA.items[P.nourriture];
  const rules = `Chaque nuit, un mouton mange ${formatStraw(M.pailleParNuit)} et une vache ${formatStraw(V.pailleParNuit)}. La paille vient du Moulin : 1 blé moulu donne 1 farine et 1 paille. Un mouton nourri ${M.joursLaine} nuits donne ${M.laineParTonte} laine ; une vache nourrie donne ${V.laitParNuit} lait la nuit même.`;
  if (!p.construit) {
    const cost = P.deblocage;
    return `
      <div class="section-head"><h3>${icon('paturage')}Moutons et vaches</h3>${helpBtn('paturage')}</div>
      <div class="card">
        <span class="muted">Les moutons et les vaches vivent à l'Étable : ${formatPlaces(P.placesDepart)} au départ, ${formatPlaces(P.placesParMouton)} par mouton, ${formatPlaces(P.placesParVache)} par vache. ${rules} Sans paille, un animal ne produit rien cette nuit-là, et rien d'autre ne lui arrive. Les moutons et les vaches s'achètent au Marché.</span>
        <button type="button" class="btn primary" data-action="build-paturage"${canPay(cost) ? '' : ' disabled'}>Préparer ${formatPlaces(P.placesDepart)} pour les moutons et les vaches (${costLabel(cost)})</button>
      </div>`;
  }
  const sCount = sheepCount(state);
  const cCount = cowCount(state);
  const sFree = freeSheepPlaces(state);
  const cFree = freeCowPlaces(state);
  const cost = pastureCost(state);
  const occupied = stableOccupied(state);
  const pct = p.places > 0 ? Math.min(100, Math.round((occupied / p.places) * 100)) : 0;
  const ready = sheepToShear(state);
  const need = strawNeed(state);
  const stock = strawStock(state);
  const missing = strawMissing(state);
  const fed = strawPlan();
  let hint;
  if (sCount === 0 && cCount === 0) hint = 'Aucun animal : achètes-en au Marché (onglet Animaux).';
  else if (sFree === 0) hint = `⚠️ Plus de place : achète une place de plus (une vache en demande ${P.placesParVache}).`;
  else hint = `${formatPlaces(sFree)} libre${sFree > 1 ? 's' : ''} : de quoi accueillir ${sFree} mouton${sFree > 1 ? 's' : ''}${cFree > 0 ? ` ou ${cFree} vache${cFree > 1 ? 's' : ''}` : ''}.`;
  let strawHint;
  if (need === 0) strawHint = 'Pas d\'animaux à nourrir pour l\'instant.';
  else if (missing > 0) strawHint = `⚠️ Il manque ${formatStraw(missing)} pour cette nuit : mouds du blé au Moulin. Les animaux sans paille ne donneront rien cette nuit (ils mangent dans l'ordre de la liste).`;
  else strawHint = `✅ Assez de paille pour cette nuit${stock >= need * 2 ? ` (il y en a pour ${formatNumber(Math.floor(stock / need))} nuits)` : ''}.`;
  // L'achat d'une place est refusé tant qu'il en reste une de libre (voir buyPasture()).
  const buyOk = sFree === 0 && canPay(cost);
  return `
    <div class="section-head">
      <h3>${icon('paturage')}Moutons et vaches · ${formatPlaces(p.places)}</h3>
      <span class="chips">${autoChip('paturage', 'Tond tout seul les moutons dont la laine est prête, pendant la nuit')}${ready > 0 ? `<span class="chip badge">🧶 ${ready} à tondre</span>` : ''}${helpBtn('paturage')}</span>
    </div>
    <div class="card">
      <span class="big" aria-label="Moutons et vaches">${M.icone} ${sCount} mouton${sCount > 1 ? 's' : ''} · ${V.icone} ${cCount} vache${cCount > 1 ? 's' : ''}</span>
      <span class="bar" role="progressbar" aria-label="Places occupées" aria-valuemin="0" aria-valuemax="${p.places}" aria-valuenow="${occupied}"><span class="bar-fill${sFree === 0 ? ' warn' : ''}" style="width:${pct}%"></span></span>
      <span class="muted">Places : <span class="num">${formatNumber(occupied)} / ${formatNumber(p.places)}</span> · ${formatPlaces(P.placesParMouton)} par mouton, ${formatPlaces(P.placesParVache)} par vache. Une place achetée reste acquise.</span>
      <span class="muted">${hint}</span>
      <button type="button" class="btn" data-action="buy-pasture"${buyOk ? '' : ' disabled'}>Acheter une place (${costLabel(cost)})</button>
    </div>
    <div class="card ancre" id="etable-paille">
      <span class="card-title"><span><span aria-hidden="true">${straw.icone}</span> Paille</span><span class="chip${missing > 0 ? ' warn' : ''}">${missing > 0 ? `⚠️ il en manque ${formatNumber(missing)}` : 'en stock'}</span></span>
      <span class="big" aria-label="Paille en stock sur paille mangée cette nuit">${formatQty(stock)} / ${formatQty(need)} pour cette nuit</span>
      <span class="${missing > 0 ? 'alert' : 'muted'}">${strawHint}</span>
      <span class="muted">${rules}</span>
    </div>
    ${sCount + cCount > 0 ? `<div class="cards sheep-list ancre" id="etable-animaux">${p.moutons.map((m) => sheepCard(m, fed)).join('')}${p.vaches.map((v) => cowCard(v, fed)).join('')}</div>` : ''}`;
}

// Pastille « Automatique » : les tâches que l'Arbre des technologies automatise ici.
function autoChip(id, title) {
  if (!isAutomated(state, id)) return '';
  const taches = (AUTO_TACHES[id] || []).filter((t) => techAuto(state, t, id));
  const noms = { arrosage: 'arrosage', recolte: 'récolte', semis: 'semis', nourrissage: 'nourrissage', tonte: 'tonte' };
  return `<span class="chip auto" title="${title}">🤖 ${taches.map((t) => noms[t]).join(', ')}</span>`;
}

// Arbre v2 (Outils de jardin) : « Arroser tout » et « Récolter tout ».
function groupButtons(lieu) {
  const g = techFlag(state, 'actionsGroupees') || [];
  if (!g.length) return '';
  const plots = allPlots(state).filter((p) => p.lieu === lieu);
  const aArroser = plots.filter((p) => p.culture && !p.arrose && !isMature(p)).length;
  const murs = plots.filter((p) => p.culture && isMature(p)).length;
  return `${g.includes('arroser') ? `<button type="button" class="btn" data-action="water-all" data-lieu="${lieu}"${aArroser ? '' : ' disabled'}>💧 Arroser tout (${aArroser})</button>` : ''}${g.includes('recolter') ? `<button type="button" class="btn" data-action="harvest-all" data-lieu="${lieu}"${murs ? '' : ' disabled'}>🧺 Récolter tout (${murs})</button>` : ''}`;
}

function semisLabel(p) {
  if (p.semis === 'off') return '⛔ Semis auto : désactivé';
  if (p.semis === 'verrou' && p.verrou && DATA.crops[p.verrou]) return `🔒 Semis auto : ${DATA.crops[p.verrou].icone} ${DATA.crops[p.verrou].nom}`;
  return '🔁 Semis auto : même culture';
}

function semisButton(p) {
  if (!techAuto(state, 'semis', p.lieu)) return '';
  return `<button type="button" class="btn" data-action="semis-open" data-id="${p.id}">${semisLabel(p)}</button>`;
}

function plotCard(p, n) {
  const seedsAvailable = plantableCropsFor(state, p.lieu).some((c) => seedStock(state, c) > 0);
  if (!p.culture) {
    return `
      <div class="card plot ancre" id="plot-${p.id}">
        <span class="card-title"><span>Parcelle ${n}</span></span>
        ${plotArt(p)}
        <span class="muted">Vide</span>
        <button type="button" class="btn primary" data-action="plant-open" data-id="${p.id}"${seedsAvailable ? '' : ' disabled'}>${seedsAvailable ? 'Planter' : 'Aucune graine'}</button>
        ${semisButton(p)}
      </div>`;
  }
  const def = DATA.crops[p.culture];
  const max = maxStage(p);
  const mature = isMature(p);
  const pct = Math.round((p.stade / max) * 100);
  const stateLine = mature
    ? (p.montee ? '🌱 Graines prêtes' : '✅ Mûre')
    : `Stade ${p.stade} / ${max}${p.montee ? ' · monte en graine' : ''}`;
  const canBolt = def.graines.mode === 'montee' && p.stade >= def.stades;
  const boltBtn = canBolt
    ? `<button type="button" class="btn" data-action="bolt" data-id="${p.id}">${p.montee ? '↩ Annuler la montée en graine' : '🌱 Laisser monter en graine'}</button>`
    : '';
  let actions;
  if (mature) {
    const label = p.montee
      ? `Récolter (+${def.graines.quantite} 🌱)`
      : `Récolter (+${harvestYield(state, p.culture, false, p.lieu)} ${DATA.items[cropProduct(p.culture)].icone})`;
    actions = `<button type="button" class="btn primary" data-action="harvest" data-id="${p.id}">${label}</button>${boltBtn}`;
  } else {
    const litres = waterCost(state, p);
    const noWater = state.eauMl < litres * 1000;
    actions = `<button type="button" class="btn" data-action="water" data-id="${p.id}"${p.arrose || noWater ? ' disabled' : ''}>${p.arrose ? '💧 Arrosée' : `💧 Arroser (${formatQty(litres)} L)`}</button>${boltBtn}`;
  }
  return `
    <div class="card plot ancre${mature ? ' mature' : ''}" id="plot-${p.id}">
      <span class="card-title"><span>Parcelle ${n}</span><span aria-hidden="true">${def.icone}</span></span>
      ${plotArt(p)}
      <span class="muted">${def.nom} · ${stateLine}</span>
      <span class="bar" role="progressbar" aria-label="Croissance" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${p.stade}"><span class="bar-fill" style="width:${pct}%"></span></span>
      ${actions}
      ${semisButton(p)}
    </div>`;
}

// Réglage du semis automatique d'une parcelle (Lot 7).
function openSemisModal(plotId) {
  const plot = findPlot(state, plotId);
  if (!plot) return;
  const choice = (mode, crop, title, sub) => {
    const pressed = plot.semis === mode && (mode !== 'verrou' || plot.verrou === crop);
    return `
      <button type="button" class="btn semis-choice" data-action="semis-set" data-id="${plotId}" data-mode="${mode}"${crop ? ` data-crop="${crop}"` : ''} aria-pressed="${pressed}">
        <span>${pressed ? '✅ ' : ''}${title}</span>
        <span class="muted">${sub}</span>
      </button>`;
  };
  const locks = plantableCropsFor(state, plot.lieu).map((c) => {
    const def = DATA.crops[c];
    return choice('verrou', c, `🔒 Toujours ${def.icone} ${def.nom}`, `${def.graines.mode === 'plant' ? 'Plants' : 'Graines'} en stock : ${formatQty(seedStock(state, c))}`);
  });
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="semis-title" data-stop-propagation>
        <h2 id="semis-title">🔁 Semis automatique</h2>
        <p class="muted">Après une récolte automatique, cette parcelle est replantée si une graine reste au-delà de la réserve de semences.</p>
        <div class="stack">
          ${choice('meme', null, '🔁 Même culture que la récolte', 'Réglage par défaut.')}
          ${choice('off', null, '⛔ Désactivé', 'La parcelle reste vide après la récolte.')}
          ${locks.join('')}
        </div>
        <button type="button" class="btn" data-action="close-modal">Fermer</button>
      </div>
    </div>
  `;
}

// Choix de la graine à planter sur une parcelle vide.
function openPlantModal(plotId) {
  tel('modal', 'plant');
  const plot = findPlot(state, plotId);
  if (!plot || plot.culture) return;
  const rows = plantableCropsFor(state, plot.lieu)
    .map((c) => {
      const def = DATA.crops[c];
      const n = seedStock(state, c);
      const stock = def.graines.mode === 'plant' ? 'Plants' : 'Graines';
      return `
        <button type="button" class="btn plant-choice" data-action="plant" data-id="${plotId}" data-crop="${c}"${n > 0 ? '' : ' disabled'}>
          <span>${def.icone} ${def.nom}</span>
          <span class="muted">${stock} : ${formatQty(n)} · ${def.stades} nuits · ${formatQty(waterCostFor(state, c, plot.lieu))} L par arrosage</span>
        </button>`;
    })
    .join('');
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="plant-title" data-stop-propagation>
        <h2 id="plant-title">🌱 Planter</h2>
        <p class="muted">Choisis ce que tu plantes sur cette parcelle.</p>
        <div class="stack">${rows}</div>
        <button type="button" class="btn" data-action="close-modal">Annuler</button>
      </div>
    </div>
  `;
}

function harvestToast(result) {
  const parts = Object.entries(result.items).map(([item, n]) => `+${n} ${DATA.items[item].icone}`);
  return `Récolte : ${parts.join(' ')}`;
}

/* ---------- Lot 8 : calendrier, Serre, Verger, Réfrigérateur ---------- */

// Facteur de saison en % : « +10 % », « −30 % », « 0 % ».
function formatFactor(f) {
  const d = f - 100;
  return d === 0 ? '0 %' : `${d > 0 ? '+' : '−'}${Math.abs(d)} %`;
}

// Calendrier : saison, nuit x / 10, et les modificateurs de la saison (en vert
// ce qui aide, en rouge ce qui freine ; la couleur n'est jamais la seule
// indication : le facteur est écrit).
function renderCalendar() {
  const S = DATA.SAISONS;
  const id = currentSeason(state);
  const info = S.INFOS[id];
  const n = seasonNight(state);
  const chips = Object.keys(S.FACTEURS)
    .map((kind) => {
      const f = seasonFactor(state, kind);
      const cls = f > 100 ? ' auto' : f < 100 ? ' warn' : '';
      const sign = f > 100 ? '▲ ' : f < 100 ? '▼ ' : '';
      const k = S.FACTEURS[kind];
      return `<span class="chip${cls}" title="${k.nom} ${formatFactor(f)}"><span aria-hidden="true">${k.icone}</span> ${k.nom} ${sign}${formatFactor(f)}</span>`;
    })
    .join('');
  return `
    <div class="card season-card">
      <span class="card-title"><span>${info.icone} ${info.nom}</span><span class="chip">Nuit ${n} / ${S.LONGUEUR}</span></span>
      <span class="bar" role="progressbar" aria-label="Avancement de la saison" aria-valuemin="0" aria-valuemax="${S.LONGUEUR}" aria-valuenow="${n}"><span class="bar-fill" style="width:${Math.round((n / S.LONGUEUR) * 100)}%"></span></span>
      <span class="season-chips">${chips}</span>
      <span class="muted">Les modificateurs jouent sur la Zone de culture, l'eau des arrosages et le solaire. La Serre et les animaux les ignorent.</span>
    </div>`;
}

function renderSerre() {
  const g = state.serre;
  if (!g.construit) {
    const cost = DATA.SERRE.CONSTRUCTION;
    return `
      <div class="section-head"><h3>${icon('serre')}Serre</h3>${helpBtn('serre')}</div>
      <div class="card">
        <span class="muted">Tomate, courgette, aubergine et poivron, plus trois cultures de rente exclusives à la Serre (cacao, vanille, café) : ${DATA.SERRE.PARCELLES[0]} parcelles au départ, +${DATA.SERRE.PARCELLES[1] - DATA.SERRE.PARCELLES[0]} par niveau. Aucun modificateur de saison : ni l'hiver ni l'été n'y changent rien.</span>
        <button type="button" class="btn primary" data-action="build-serre"${canPay(cost) ? '' : ' disabled'}>Construire la Serre (${costLabel(cost)})</button>
      </div>`;
  }
  const up = serreUpgradeCost(state);
  const upBtn =
    up === null
      ? '<button type="button" class="btn" disabled>Serre au niveau maximum</button>'
      : `<button type="button" class="btn" data-action="upgrade-serre"${canPay(up) ? '' : ' disabled'}>Agrandir : niveau ${g.niveau + 1}, ${DATA.SERRE.PARCELLES[g.niveau]} parcelles (${costLabel(up)})</button>`;
  return `
    <div class="section-head">
      <h3>${icon('serre')}Serre · niveau ${g.niveau}</h3>
      <span class="chips">${autoChip('serre', 'Travaille tout seul, à 100 %, pendant la nuit')}<span class="chip" title="La Serre ignore les modificateurs de saison">🌡️ Sans saison</span>${helpBtn('serre')}</span>
    </div>
    <div class="plots">${g.parcelles.map((p, i) => plotCard(p, i + 1)).join('')}</div>
    <div class="row plot-foot">${groupButtons('serre')}${upBtn}</div>
  `;
}

function treeCard(tree) {
  const V = DATA.VERGER;
  const def = V.ARBRES[tree.espece];
  const fruit = DATA.items[def.fruit];
  const age = Math.min(V.MATURITE, treeAge(state, tree));
  const adult = isTreeAdult(state, tree);
  const next = treeNextHarvest(state, tree);
  const inWindow = orchardProducesOn(state.day);
  let line;
  if (!adult) line = `Jeune plant : ${age} / ${V.MATURITE} nuits`;
  else line = 'Adulte';
  const when = next === null ? '' : next === state.day ? 'Prochaine récolte : cette nuit' : `Prochaine récolte : nuit ${next} (dans ${nightsLabel(next - state.day)})`;
  return `
    <div class="card plot tree${adult ? ' adult' : ''}">
      <span class="card-title"><span>${def.nom}</span><span aria-hidden="true">${fruit.icone}</span></span>
      ${treeArt(tree)}
      <span class="muted">${line}${adult ? ` · ${V.FRUITS} ${fruit.nom.toLowerCase()}s par récolte` : ''}</span>
      <span class="bar" role="progressbar" aria-label="Croissance" aria-valuemin="0" aria-valuemax="${V.MATURITE}" aria-valuenow="${age}"><span class="bar-fill" style="width:${Math.round((age / V.MATURITE) * 100)}%"></span></span>
      <span class="muted">${when}${inWindow && adult ? ' · 🍎 en saison' : ''}</span>
    </div>`;
}

function renderVerger() {
  const v = state.verger;
  const V = DATA.VERGER;
  if (!v.construit) {
    const cost = V.CONSTRUCTION;
    return `
      <div class="section-head"><h3>${icon('verger')}Verger</h3>${helpBtn('verger')}</div>
      <div class="card">
        <span class="muted">${V.EMPLACEMENTS_DEPART} emplacements au départ. Pommiers et poiriers s'achètent ici, au Verger, sans arrosage : ${V.FRUITS} fruits toutes les ${V.PERIODE} nuits pendant la fin de l'été et l'automne, ${V.MATURITE} nuits après la plantation.</span>
        <button type="button" class="btn primary" data-action="build-verger"${canPay(cost) ? '' : ' disabled'}>Aménager le Verger (${costLabel(cost)})</button>
      </div>`;
  }
  const w = orchardWindow();
  const L = DATA.SAISONS.LONGUEUR;
  const price = orchardSlotPrice(state);
  const free = orchardFree(state);
  const slots = [];
  for (const t of v.arbres) slots.push(treeCard(t));
  for (let i = 0; i < free; i++) {
    slots.push(`
      <div class="card plot tree free">
        <span class="card-title"><span>Emplacement libre</span></span>
        ${artSvg(['plot-soil'], 'plot-art')}
        <span class="muted">Achète un pommier ou un poirier ci-dessous.</span>
      </div>`);
  }
  const nightOfYear = yearNight(state.day);
  const season = nightOfYear >= w.debut && nightOfYear <= w.fin ? '🍎 Les fruits sont de saison.' : `Les fruits arrivent de la nuit ${w.debut} à la nuit ${w.fin} de l'année (l'année compte ${L * DATA.SAISONS.ORDRE.length} nuits).`;
  const atMax = v.places >= V.EMPLACEMENTS_MAX;
  return `
    <div class="section-head">
      <h3>${icon('verger')}Verger · ${v.arbres.length} / ${v.places} emplacements</h3>
      ${helpBtn('verger')}
    </div>
    <div class="plots">${slots.join('')}</div>
    <div class="card">
      <span class="muted">${season}</span>
      ${atMax
        ? `<span class="muted">Le Verger a atteint sa taille maximale (${V.EMPLACEMENTS_MAX} emplacements).</span>`
        : `<button type="button" class="btn" data-action="buy-orchard-slot"${canPay(price) ? '' : ' disabled'}>Acheter un emplacement (${costLabel(price)})</button>`}
    </div>
  `;
}

// ❄️ quand le frigo est alimenté ; ⚠️ en panne, éteint ou hors tension.
function fridgeIcon() {
  const f = state.frigo;
  if (!f.construit) return '';
  const d = f.appareil;
  return !isBroken(d) && d.allume && f.alimente ? '❄️' : '⚠️';
}

function renderFridgeCard() {
  const f = state.frigo;
  if (!f.construit) {
    const cost = DATA.FRIGO.CONSTRUCTION;
    return `
      <div class="card">
        <span class="card-title"><span>${icon('frigo')}Réfrigérateur</span><span class="chips"><span class="chip">Non construit</span>${helpBtn('frigo')}</span></span>
        <span class="muted">Les aliments rangés au frigo ne vieillissent plus. Capacité illimitée, mais il consomme en permanence : ${formatNumber(DATA.FRIGO.BASE_WH_S)} Wh/s + ${formatNumber(DATA.FRIGO.PAR_UNITE_MWH_S)} mWh/s par unité stockée. Appareil électrique : interrupteur, usure, pannes.</span>
        <button type="button" class="btn primary" data-action="build-fridge"${canPay(cost) ? '' : ' disabled'}>Construire le Réfrigérateur (${costLabel(cost)})</button>
      </div>`;
  }
  const d = f.appareil;
  const st = deviceStatus(state, d);
  const ok = fridgeIcon() === '❄️';
  const need = fridgeNightNeed(state);
  const avail = availableEnergy(state);
  const alert = !fridgeCoversNight(state)
    ? `<span class="alert">⚠️ La batterie ne couvrira pas la nuit : il faut <span class="num">${formatWh(need + 999)}</span>, il y en a <span class="num">${formatWh(avail)}</span>. Les aliments perdront une nuit de conservation.</span>`
    : '';
  const badge = st.badge ? `<span class="chip warn">⚠️ ${st.badge}</span>` : '';
  return `
    <div class="card fridge ancre ${ok ? 'cold' : 'warm'}" id="dev-frigo">
      <span class="card-title"><span>${icon('frigo')}${fridgeIcon()} Réfrigérateur</span><span class="chips"><span class="chip${st.code === 'panne' ? ' panne' : ''}">${st.label}</span>${helpBtn('frigo')}</span></span>
      ${badge}
      <span class="big">${formatWhRate(d.conso)}</span>
      <span class="muted">Consommation à pleine charge : <span class="num">${formatWhRate(fridgeRate(state))}</span> · ${fridgeUnits(state)} unité${fridgeUnits(state) > 1 ? 's' : ''} au frais (onglet Inventaire › Frigo)</span>
      ${alert}
      ${wearHtml(d)}
      ${stationControls(d)}
    </div>`;
}

// Frigo (Inventaire) : contenu, conservation figée, ce qu'on peut sortir.
function fridgeRowHtml(item) {
  const it = DATA.items[item];
  const n = fridgeCount(state, item);
  const lots = fridgeLots(state, item)
    .map((l) => `<li><span>${l.qty} ${unitLabel(item, l.qty)} — ${nightsLabel(l.nightsLeft)} <span class="muted">(figé)</span></span></li>`)
    .join('');
  return `
    <div class="inv-row">
      <div class="inv-main"><span><span aria-hidden="true">${it.icone}</span> ${it.nom}</span><span class="big num">${formatQty(n)}</span></div>
      <ul class="lot-list" aria-label="Lots au frigo">${lots}</ul>
      <span class="device-actions">
        <button type="button" class="btn" data-action="fridge-out" data-item="${item}" data-qty="1">Sortir 1</button>
        <button type="button" class="btn" data-action="fridge-out" data-item="${item}" data-qty="all">Tout sortir</button>
      </span>
    </div>`;
}

function renderFridgeTab() {
  const f = state.frigo;
  if (!f.construit) {
    return `<p class="hint">🧊 Pas encore de Réfrigérateur : construis-le ${stageUsable() ? 'dans la Maison, onglet Installations' : 'dans l\'onglet Ferme'} (${costLabel(DATA.FRIGO.CONSTRUCTION)}). Les aliments qui y sont rangés ne vieillissent plus.</p>`;
  }
  const counts = fridgeCounts(state);
  const items = Object.keys(DATA.items).filter((k) => counts[k] > 0);
  const ok = fridgeIcon() === '❄️';
  return `
    <div class="card fridge ${ok ? 'cold' : 'warm'}">
      <span class="card-title"><span>${fridgeIcon()} Réfrigérateur</span><span class="chip">${fridgeUnits(state)} unité${fridgeUnits(state) > 1 ? 's' : ''}</span></span>
      <span class="muted">${ok ? 'Alimenté : la conservation est figée.' : '⚠️ Pas alimenté : si le froid manque plus de la moitié de l\'éveil, ou toute la nuit, chaque lot perd une nuit.'} Consommation : <span class="num">${formatWhRate(fridgeRate(state))}</span>.</span>
      ${!fridgeCoversNight(state) ? '<span class="alert">⚠️ La batterie ne couvrira pas la nuit.</span>' : ''}
      <span class="muted">La famille mange aussi le contenu du frigo, après ce qui est dans l'inventaire. Le Marché et les recettes utilisent l'inventaire : sors ce qu'il te faut.</span>
    </div>
    <div class="inv-group">
      ${items.length ? items.map(fridgeRowHtml).join('') : '<p class="hint">Le frigo est vide. Range des aliments frais depuis l\'onglet Frais.</p>'}
    </div>`;
}

/* ---------- Lot 5 : ateliers (Ferme) et Livre de recette ---------- */

// Recettes d'une station, dans l'ordre de DATA.recipes.
function stationRecipes(id) {
  return Object.keys(DATA.recipes).filter((r) => DATA.recipes[r].station === id);
}

// Ateliers dont les préparations se lancent depuis le Livre de recette : tous,
// sauf le Moulin, qui a son propre menu (voir renderMoulin()).
function bookStations() {
  return Object.keys(DATA.STATIONS).filter((id) => !stationRecipes(id).every((r) => DATA.recipes[r].horsLivre));
}

// Ce que rend le Moulin pour un blé : « 1 🥣 farine + 1 🪹 paille ».
function millOutputText() {
  const r = DATA.recipes.farine;
  const out = DATA.items[r.sortie];
  const extra = DATA.items[r.sousProduit.item];
  return `${formatQty(r.qteSortie)} ${out.icone} ${out.nom.toLowerCase()} + ${formatQty(r.sousProduit.qte)} ${extra.icone} ${extra.nom.toLowerCase()}`;
}

function stationBlurb(id) {
  const def = DATA.STATIONS[id];
  const names = stationRecipes(id).map((r) => DATA.recipes[r].nom.toLowerCase()).join(', ');
  const power = def.electrique
    ? ` Appareil électrique : ${formatNumber(def.whParS)} Wh/s en marche, avec interrupteur, usure et pannes.`
    : ' Pas d\'électricité.';
  if (id === 'moulin') return `Moud le blé : 1 blé donne ${millOutputText()}. La paille nourrit les moutons et les vaches. Le blé se moud ici même, dans le Moulin.${power}`;
  return `${names.charAt(0).toUpperCase()}${names.slice(1)}.${power}${id === 'four' ? ' Le construire ouvre l\'onglet Livre de recette.' : ''}`;
}

function stationBuildCard(id) {
  const def = DATA.STATIONS[id];
  const need = def.requiert ? DATA.STATIONS[def.requiert] : null;
  const blocked = need && !state.stations[def.requiert].construit;
  return `
    <div class="card station">
      <span class="card-title"><span>${icon(id)}${def.nom}</span><span class="chips"><span class="chip">Non construit</span>${helpBtn(id)}</span></span>
      <span class="muted">${stationBlurb(id)}</span>
      ${blocked ? `<span class="alert">Construis d'abord ${need.article} ${need.nom}.</span>` : ''}
      <button type="button" class="btn primary" data-action="build-station" data-station="${id}"${!blocked && canPay(def.cout) ? '' : ' disabled'}>Construire ${def.article} ${def.nom} (${costLabel(def.cout)})</button>
    </div>`;
}

// Les ateliers du Livre de recette : Four, Cuisine et Presse. Le Moulin n'en
// fait plus partie : il a son propre menu (renderMoulin()).
function renderAteliers() {
  const ids = bookStations().filter((id) => isUnlocked(state, id));
  if (!ids.length) return '';
  const cards = ids.map((id) => {
    const def = DATA.STATIONS[id];
    if (!state.stations[id].construit) return stationBuildCard(id);
    const where = state.unlockedTabs.includes('recettes')
      ? 'Se lance depuis l\'onglet Livre de recette.'
      : 'Se lancera depuis le Livre de recette, que le Four ouvre.';
    return `
      <div class="card station">
        <span class="card-title"><span>${icon(id)}${def.nom}</span><span class="chips"><span class="chip">✅ Construit</span>${helpBtn(id)}</span></span>
        <span class="muted">${where}</span>
      </div>`;
  });
  return `
    <h3 class="section-title">🍞 Ateliers</h3>
    <div class="cards">${cards.join('')}</div>`;
}

/* ---------- version 1.1 : le menu du Moulin ---------- */

// Quantité de blé choisie dans le menu du Moulin (réglage d'écran, pas sauvegardé).
let millQty = 1;

// La quantité choisie, toujours entre 1 et le blé disponible (1 s'il n'y en a pas).
function millQuantity() {
  const stock = Math.floor(wheatTotal(state) + EPS);
  return Math.max(1, Math.min(stock, Math.floor(millQty) || 1));
}

// Corps du menu du Moulin : pas encore construit, son bouton de construction ;
// construit, le blé disponible (inventaire et Silo), le choix de la quantité,
// « Moudre », la farine et la paille en stock, puis l'état de l'appareil
// (énergie, usure, interrupteur) comme pour les autres appareils.
function renderMoulin() {
  if (!isUnlocked(state, 'moulin')) return '';
  const def = DATA.STATIONS.moulin;
  const st = state.stations.moulin;
  if (!st.construit) {
    return `
    <div class="section-head"><h3>${icon('moulin')}${def.nom}</h3></div>
    <div class="cards">${stationBuildCard('moulin')}</div>`;
  }
  const r = DATA.recipes.farine;
  const wheat = Math.floor(wheatTotal(state) + EPS);
  const silo = state.silo.construit ? state.silo.ble : 0;
  const q = millQuantity();
  const d = st.appareil;
  const ds = deviceStatus(state, d);
  const job = st.tache;
  const pending = millPending(state);
  const flour = DATA.items[r.sortie];
  const straw = DATA.items[r.sousProduit.item];
  const need = strawNeed(state);
  const missing = strawMissing(state);
  const each = recipeTime(state, 'farine');
  let work;
  if (job) {
    const pct = Math.max(0, Math.min(100, Math.floor(((job.dureeMs - job.resteMs) * 100) / job.dureeMs)));
    const left = millTimeLeft(state);
    const waiting = pending - 1;
    work = `
      <span class="muted">⚙️ En train de moudre : encore <strong class="num">${formatNumber(pending)}</strong> blé${pending > 1 ? 's' : ''} · environ <span class="num">${Number.isFinite(left) ? formatDuration(left) : '?'}</span></span>
      <span class="bar" role="progressbar" aria-label="Avancement du blé en cours" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span class="bar-fill" style="width:${pct}%"></span></span>
      ${waiting > 0 ? `<button type="button" class="btn" data-action="mill-cancel">Reprendre les ${formatNumber(waiting)} blé${waiting > 1 ? 's' : ''} en attente</button>` : ''}`;
  } else {
    work = '<span class="muted">Le Moulin est prêt.</span>';
  }
  let strawNote = '';
  if (need > 0) {
    strawNote = missing > 0
      ? `<span class="alert">⚠️ Tes animaux mangent ${formatStraw(need)} par nuit : il en manque ${formatNumber(missing)} pour cette nuit.</span>`
      : `<span class="muted">✅ Tes animaux mangent ${formatStraw(need)} par nuit : le stock suffit pour cette nuit.</span>`;
  }
  const stopped = !d.allume || isBroken(d);
  const chip = job ? '<span class="chip">⏳ En marche</span>' : '<span class="chip">✅ Libre</span>';
  return `
    <div class="section-head">
      <h3>${icon('moulin')}${def.nom}</h3>
      <span class="chips">${chip}${helpBtn('moulin')}</span>
    </div>
    <div class="cards">
      <div class="card station mill ancre${job ? ' busy' : ''}" id="moulin-moudre">
        <span class="card-title"><span>🌾 Moudre du blé</span><span class="chip">${formatNumber(each)} s par blé</span></span>
        <span class="muted">1 blé donne ${millOutputText()}. Tout se fait ici : choisis combien de blés moudre.</span>
        <span class="big" aria-label="Blé disponible">🌾 ${formatQty(wheat)} blé${wheat > 1 ? 's' : ''} disponible${wheat > 1 ? 's' : ''}</span>
        ${silo > 0 ? `<span class="muted">Dont ${formatQty(silo)} dans le Silo (le Moulin prend d'abord le blé de l'inventaire).</span>` : ''}
        <div class="row qty-row">
          <button type="button" class="btn step-btn" data-action="mill-dec" aria-label="Moudre un blé de moins"${q <= 1 ? ' disabled' : ''}>−</button>
          <strong class="num qty">${formatNumber(q)}</strong>
          <button type="button" class="btn step-btn" data-action="mill-inc" aria-label="Moudre un blé de plus"${q >= wheat ? ' disabled' : ''}>+</button>
          <button type="button" class="btn" data-action="mill-max"${q >= wheat ? ' disabled' : ''}>Tout</button>
          <button type="button" class="btn primary sell-go" data-action="mill-start"${wheat >= 1 ? '' : ' disabled'}>Moudre ${formatNumber(q)} blé${q > 1 ? 's' : ''}</button>
        </div>
        ${wheat < 1 ? '<span class="alert">Pas de blé à moudre : récolte du blé, ou achètes-en au Marché.</span>' : ''}
        ${stopped && (job || wheat >= 1) ? `<span class="alert">${isBroken(d) ? '⛔ Le Moulin est en panne : il faut le réparer.' : '⚠️ Le Moulin est arrêté : remets-le en marche.'}</span>` : ''}
        ${work}
        <span class="muted">La nuit, le blé en train d'être moulu se termine ; le reste reprend au réveil.</span>
      </div>
      <div class="card">
        <span class="card-title"><span>📦 En stock</span></span>
        <span class="mill-stock"><span><span aria-hidden="true">${flour.icone}</span> ${flour.nom} : <strong class="num">${formatQty(countItem(state, r.sortie))}</strong></span><span><span aria-hidden="true">${straw.icone}</span> ${straw.nom} : <strong class="num">${formatQty(strawStock(state))}</strong></span></span>
        <span class="muted">La farine sert au pain et aux tartes. La paille nourrit les moutons et les vaches.</span>
        ${strawNote}
      </div>
      <div class="card ancre" id="moulin-appareil">
        <span class="card-title"><span>⚡ Appareil</span><span class="chip${ds.code === 'panne' ? ' panne' : ''}">${ds.label}</span></span>
        ${ds.badge ? `<span class="chip warn">⚠️ ${ds.badge}</span>` : ''}
        <span class="muted">Consommation : <span class="num">${formatWhRate(d.conso)}</span> (${formatNumber(def.whParS)} Wh/s quand il tourne). Sans énergie, il attend.</span>
        ${wearHtml(d)}
        ${stationControls(d)}
      </div>
    </div>`;
}

// Interrupteur, entretien et réparation du Moulin et de la Presse (pas de niveaux).
function stationControls(d) {
  const maintain = maintainCost(d);
  const repair = repairCost(d);
  const broken = isBroken(d);
  const maintainOk = !broken && (d.usure > 0 || d.usureMs > 0) && canPay(maintain);
  const repairOk = broken && canPay(repair);
  return `
    <span class="device-actions">
      ${switchHtml(d)}
      <button type="button" class="btn" data-action="maintain" data-id="${d.id}"${maintainOk ? '' : ' disabled'}>Entretenir (${costLabel(maintain)})</button>
      <button type="button" class="btn" data-action="repair" data-id="${d.id}"${repairOk ? '' : ' disabled'}>Réparer (${costLabel(repair)})</button>
    </span>`;
}

function stationCard(id) {
  const def = DATA.STATIONS[id];
  const st = state.stations[id];
  if (!st.construit) return stationBuildCard(id);
  const job = st.tache;
  let work;
  if (job) {
    const r = DATA.recipes[job.recette];
    const pct = Math.max(0, Math.min(100, Math.floor(((job.dureeMs - job.resteMs) * 100) / job.dureeMs)));
    const left = taskTimeLeft(state, id);
    work = `
      <span class="muted">${r.icone} ${r.nom} · encore <span class="num">${Number.isFinite(left) ? left : '?'} s</span></span>
      <span class="bar" role="progressbar" aria-label="Avancement : ${r.nom}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span class="bar-fill" style="width:${pct}%"></span></span>`;
  } else {
    work = '<span class="muted">Prête pour une nouvelle préparation.</span>';
  }
  // Arbre v2 : préparations en attente (annulables, ingrédients rendus).
  const file = Array.isArray(st.file) ? st.file : [];
  if (file.length) {
    work += `<span class="muted">En attente :</span><span class="level-chips">${file
      .map((e, i) => `<span class="chip">${DATA.recipes[e.recette].icone} ${DATA.recipes[e.recette].nom} <button type="button" class="btn" data-action="cancel-queued" data-station="${id}" data-index="${i}" aria-label="Annuler ${DATA.recipes[e.recette].nom}">✕</button></span>`)
      .join('')}</span>`;
  }
  let power = '';
  if (def.electrique) {
    const d = st.appareil;
    const ds = deviceStatus(state, d);
    power = `
      <span class="muted">${ds.label}${ds.badge ? ` · ⚠️ ${ds.badge}` : ''} · <span class="num">${formatWhRate(d.conso)}</span> (${formatNumber(def.whParS)} en marche)</span>
      ${wearHtml(d)}
      ${stationControls(d)}`;
  }
  const chip = job ? '<span class="chip">⏳ Occupée</span>' : '<span class="chip">✅ Libre</span>';
  return `
    <div class="card station ancre${job ? ' busy' : ''}" id="station-${id}">
      <span class="card-title"><span>${icon(id)}${def.nom}</span><span class="chips">${chip}${helpBtn(id)}</span></span>
      ${work}
      ${power}
    </div>`;
}

function recipeMeta(id) {
  const r = DATA.recipes[id];
  const out = DATA.items[recipeOutput(id)];
  if (r.transformation) return `→ ${recipeOutputQty(id)} ${out.icone} ${out.nom.toLowerCase()}`;
  const life = shelfLife(id);
  return `⚡ ${out.energie} énergie · 💰 ${formatCoins(out.prix)} · se garde ${nightsLabel(life)}`;
}

function recipeCard(id) {
  const r = DATA.recipes[id];
  const sdef = DATA.STATIONS[r.station];
  const status = recipeStatus(state, id);
  const lines = status.lignes
    .map((l) => {
      const what = l.eau
        ? `${formatQty(l.qte)} L d'eau`
        : `${formatQty(l.qte)} ${l.options.map((it) => `${DATA.items[it].icone} ${DATA.items[it].nom.toLowerCase()}`).join(' ou ')}`;
      const have = l.eau ? `${formatNumber(l.have)} L dans le réservoir` : `en stock : ${formatQty(l.have)}`;
      return `<li class="${l.ok ? 'ok' : 'missing'}"><span aria-hidden="true">${l.ok ? '✅' : '❌'}</span> <span>${what}</span> <span class="muted">(${have})</span></li>`;
    })
    .join('');
  let reason = '';
  if (status.code === 'verrouillee') {
    const n = DATA.techtree.noeuds[status.noeud];
    reason = `<span class="alert">🔒 À débloquer dans l'Arbre des technologies : ${n ? `${n.icone} ${n.nom}` : ''}.</span>`;
  } else if (status.code === 'absente') reason = `<span class="alert">Construis d'abord ${sdef.article} ${sdef.nom}.</span>`;
  else if (status.code === 'occupee') reason = `<span class="alert">${sdef.nom} : ${sdef.article === 'la' ? 'occupée' : 'occupé'}, attends la fin de la préparation.</span>`;
  else if (status.code === 'manque') reason = '<span class="alert">Il manque des ingrédients.</span>';
  const power = sdef.electrique ? ` · ${formatNumber(sdef.whParS)} Wh/s` : '';
  return `
    <article class="card recipe ${status.ok ? 'ready' : 'unavailable'}">
      <span class="card-title"><span>${r.icone} ${r.nom}</span><span class="chip">${sdef.icone} ${sdef.nom} · ${formatNumber(recipeTime(state, id))} s</span></span>
      <span class="muted">${recipeMeta(id)}${power}</span>
      <ul class="ingredients" aria-label="Ingrédients">${lines}</ul>
      ${reason}
      <button type="button" class="btn${status.ok ? ' primary' : ''}" data-action="start-recipe" data-recipe="${id}"${status.ok ? '' : ' disabled'}>Préparer</button>
    </article>`;
}

function renderRecettes() {
  // Le Moulin et sa mouture n'y figurent pas : le blé se moud dans le Moulin (renderMoulin()).
  const ids = bookStations();
  const recipes = Object.keys(DATA.recipes)
    .filter((id) => !DATA.recipes[id].horsLivre)
    .sort((a, b) => ids.indexOf(DATA.recipes[a].station) - ids.indexOf(DATA.recipes[b].station));
  const prod = productivity(state);
  return `
    <div class="section-head">
      <h2>📖 Livre de recette</h2>
      <span class="chip${prod < 100 ? ' warn' : ''}" title="Productivité : la santé de la famille ralentit les préparations">Vitesse ${formatPercent(prod)}</span>
    </div>
    <p class="muted">${queueCapacity(state) > 1 ? `Jusqu'à ${queueCapacity(state)} préparations à la suite par atelier : elles s'enchaînent sans clic, ingrédients réservés au lancement.` : 'Une seule préparation à la fois par atelier : c\'est toi qui relances (les Préparations en série de l\'Arbre des technologies ajoutent une file).'} Tout ce qui est en cours se termine pendant la nuit. Certaines recettes se débloquent dans l'Arbre des technologies. La farine se fait au Moulin, dans son propre menu.</p>
    <h3 class="section-title">Stations</h3>
    <div class="cards">${ids.map(stationCard).join('')}</div>
    <h3 class="section-title">Recettes</h3>
    <div class="recipes">${recipes.map(recipeCard).join('')}</div>`;
}

/* ---------- Lot 7 : Arbre des technologies ---------- */

// Progression d'un bâtiment ou d'un groupe d'appareils (lecture seule : les
// améliorations se font sur les cartes des bâtiments).
function techLevelRow(e) {
  let body;
  if (e.type === 'niveau') {
    const built = e.niveau > 0;
    const pct = Math.round((e.niveau / e.max) * 100);
    const note = e.note
      ? `<span class="chip${e.automatise ? ' auto' : ''}">${e.automatise ? '🤖 Automatisé' : 'Pas encore automatisé'} : ${e.note}</span>`
      : '';
    body = `
      <span class="level-line"><span>${e.icone} ${e.nom}</span><span class="num">${built ? `niveau ${e.niveau} / ${e.max}` : 'non construit'}</span></span>
      <span class="bar" role="progressbar" aria-label="Niveau : ${e.nom}" aria-valuemin="0" aria-valuemax="${e.max}" aria-valuenow="${e.niveau}"><span class="bar-fill" style="width:${pct}%"></span></span>
      ${note}`;
  } else if (e.type === 'appareils') {
    const chips = e.niveaux.map((n, i) => `<span class="chip">n°${i + 1} · niv. ${n} / ${e.max}</span>`).join('');
    body = `
      <span class="level-line"><span>${e.icone} ${e.nom}</span><span class="num">${e.niveaux.length} appareil${e.niveaux.length > 1 ? 's' : ''}</span></span>
      <span class="level-chips">${chips}</span>`;
  } else {
    const chips = e.ateliers.map((a) => `<span class="chip">${a.icone} ${a.nom} · ${a.construit ? 'construit' : 'à construire'}</span>`).join('');
    body = `
      <span class="level-line"><span>${e.icone} ${e.nom}</span></span>
      <span class="level-chips">${chips}</span>`;
  }
  return `<div class="level-row">${body}</div>`;
}

// Coût d'un nœud : « 2 PT + 900 💰 ».
function techCostLabel(n) {
  return `${formatNumber(n.pt)} PT + ${costLabel(n.cout)}`;
}

function techNodeCard(id) {
  const n = DATA.techtree.noeuds[id];
  const status = techStatus(state, id);
  const pt = techPoints(state);
  const chip = status === 'acquis'
    ? '<span class="chip auto">✅ Acquis</span>'
    : status === 'disponible'
      ? '<span class="chip">✨ Disponible</span>'
      : '<span class="chip">🔒 Verrouillé</span>';
  const prereqs = techPrereqs(state, id);
  const prereqList = status === 'acquis'
    ? ''
    : `<ul class="prereqs" aria-label="Prérequis">${prereqs.map((p) => `<li class="${p.ok ? 'ok' : 'missing'}"><span aria-hidden="true">${p.ok ? '✅' : '❌'}</span> ${p.texte}</li>`).join('')}</ul>`;
  const affordable = pt.solde >= n.pt && canPay(n.cout);
  const button = status === 'acquis'
    ? ''
    : `<button type="button" class="btn${status === 'disponible' ? ' primary' : ''}" data-action="buy-tech" data-id="${id}"${status === 'disponible' && affordable ? '' : ' disabled'}>Acquérir (${techCostLabel(n)})</button>`;
  return `
    <article class="card tech-node ${status === 'acquis' ? 'owned' : status === 'disponible' ? 'available' : 'locked'}">
      <span class="card-title"><span>${n.icone} ${n.nom}</span>${chip}</span>
      <span class="muted">Palier ${n.palier} · ${techCostLabel(n)}</span>
      <span class="desc">${n.description}</span>
      ${prereqList}
      ${button}
    </article>`;
}

// Effet en cours d'une branche, affiché dans son en-tête.
function branchEffectChip(id) {
  if (id === 'cuisine') return `<span class="chip">Temps de préparation ${formatPercent(prepTimeMult(state))}</span>`;
  if (id === 'famille') return `<span class="chip">Éveil minimal : ${formatQty(awakeRequired(state))} s</span>`;
  return '';
}

// Jalons de maîtrise : chacun rapporte 1 PT, une seule fois.
function masteryHtml() {
  const pt = techPoints(state);
  const items = DATA.techtree.POINTS.MAITRISE.map((m) => {
    const done = pt.maitrise.includes(m.id);
    const v = Math.min(m.cible, masteryValue(state, m));
    return `<li class="${done ? 'ok' : ''}"><span aria-hidden="true">${done ? '✅' : '⬜'}</span> ${m.libelle} <span class="muted num">(${formatNumber(v)} / ${formatNumber(m.cible)})</span></li>`;
  });
  return `<ul class="prereqs" aria-label="Jalons de maîtrise">${items.join('')}</ul>`;
}

function renderTechno() {
  const pt = techPoints(state);
  const P = DATA.techtree.POINTS;
  const branches = DATA.techtree.branches.map((b) => {
    const nodes = Object.keys(DATA.techtree.noeuds)
      .filter((id) => DATA.techtree.noeuds[id].branche === b.id)
      .sort((x, y) => DATA.techtree.noeuds[x].palier - DATA.techtree.noeuds[y].palier);
    const progress = techProgress(state, b.id).map(techLevelRow).join('');
    const owned = nodes.filter((id) => hasTech(state, id)).length;
    return `
      <section class="branch" aria-label="Branche ${b.nom}">
        <div class="branch-head">
          <h3>${b.icone} ${b.nom}</h3>
          <span class="chips">${branchEffectChip(b.id)}<span class="chip">${owned} / ${nodes.length} acquis</span></span>
        </div>
        <div class="branch-nodes">
          ${progress}
          ${nodes.map(techNodeCard).join('')}
        </div>
      </section>`;
  });
  const libre = state.campagne && state.campagne.fini
    ? ` En mode libre, +1 PT toutes les ${P.MODE_LIBRE_NUITS_100} nuits à 100 % d'autonomie.`
    : '';
  const routine = techFlag(state, 'routine')
    ? `<label class="row check-row"><input type="checkbox" data-action="routine-toggle"${state.routine ? ' checked' : ''}> 🏡 Routine familiale : la famille va dormir toute seule dès que l'éveil minimal est écoulé (jeu ouvert seulement).</label>`
    : '';
  return `
    <div class="section-head">
      <h2>🌳 Arbre des technologies</h2>
      <span class="chips"><span class="chip" title="Points de technologie disponibles">🔬 ${formatNumber(pt.solde)} PT</span><span class="chip" title="Pièces disponibles">💰 ${formatCoins(state.pieces)}</span></span>
    </div>
    <p class="muted">Chaque technologie coûte des points de technologie (PT) et des pièces, et s'ouvre à un palier de la campagne. Les chapitres terminés rapportent des PT (${P.CHAPITRES.join(' · ')}), comme les jalons de maîtrise ci-dessous.${libre} Tu as gagné ${formatNumber(pt.gagnes)} PT en tout.</p>
    ${routine}
    <details class="card">
      <summary><strong>🏅 Jalons de maîtrise</strong> <span class="muted">(${pt.maitrise.length} / ${P.MAITRISE.length})</span></summary>
      ${masteryHtml()}
    </details>
    ${branches.join('')}`;
}

/* ---------- Famille ---------- */

// Prénom d'un membre prêt à être écrit dans la page. Le prénom est saisi par le
// joueur : il passe toujours par escapeHtml(). C'est une donnée personnelle, qui
// reste sur l'appareil : ne jamais le mettre dans un attribut data-crop, data-type,
// data-id, data-tab ou data-screen (lus par le suivi de session), ni dans un appel tel().
function memberNameHtml(id) {
  return escapeHtml(memberName(state, id));
}

function healthBarHtml(sante) {
  const cls = sante < 50 ? ' bad' : sante < 80 ? ' warn' : '';
  return `<span class="bar" role="progressbar" aria-label="Santé" aria-valuemin="0" aria-valuemax="${DATA.FAMILY.SANTE_MAX}" aria-valuenow="${Math.round(sante)}"><span class="bar-fill${cls}" style="width:${sante}%"></span></span>`;
}

function portraitCard(m) {
  const cost = careCost(state);
  const sick = m.malade
    ? `<span class="alert">🤒 Malade : ne compte plus dans la productivité.</span>
       <button type="button" class="btn danger" data-action="heal" data-id="${m.id}"${canPay(cost) ? '' : ' disabled'}>Soigner (${formatCoins(cost)} 💰)</button>`
    : '';
  return `
    <article class="card portrait">
      <span class="portrait-emoji" aria-hidden="true">${m.malade ? '🤒' : memberPortrait(state, m.id) || '🙂'}</span>
      <span class="card-title"><span class="member-name">${memberNameHtml(m.id)}</span></span>
      <span class="muted">${m.enfant ? 'Enfant' : 'Adulte'} · ${DATA.FAMILY.AJ[m.enfant ? 'enfant' : 'adulte']} énergie/jour</span>
      ${healthBarHtml(m.sante)}
      <span class="muted">Santé : <span class="num">${Math.round(m.sante)} / ${DATA.FAMILY.SANTE_MAX}</span></span>
      ${sick}
      <button type="button" class="btn" data-action="member-edit" data-id="${m.id}" aria-label="Modifier ${m.enfant ? 'cet enfant' : 'cet adulte'} : prénom et apparence">✏️ Modifier</button>
    </article>`;
}

/* -- version 1.1 : fenêtre « Modifier » d'un membre (prénom, sexe, couleur de peau) -- */

// Choix en cours dans la fenêtre (rien n'est changé avant « Enregistrer »). Le
// prénom, lui, reste dans le champ de saisie jusqu'à l'enregistrement.
let memberDraft = null; // { id, enfant, genre, teint, depart } (depart : le joueur a demandé le départ, on attend sa confirmation)

const GENRE_LABELS = {
  adulte: { f: 'Femme', m: 'Homme' },
  enfant: { f: 'Fille', m: 'Garçon' },
};
const TEINT_LABELS = ['Jaune (par défaut)', 'Peau claire', 'Peau assez claire', 'Peau moyenne', 'Peau assez foncée', 'Peau foncée'];

function openMemberModal(id) {
  const m = findMember(state, id);
  if (!m) return;
  tel('modal', 'member'); // le nom de la fenêtre seulement : jamais le prénom
  const P = DATA.FAMILY.PROFIL;
  const age = m.enfant ? 'enfant' : 'adulte';
  memberDraft = {
    id: m.id,
    enfant: !!m.enfant,
    genre: P.GENRES.includes(m.genre) ? m.genre : P.GENRES[0],
    teint: Number.isInteger(m.teint) && m.teint >= 0 && m.teint < P.TEINTS.length ? m.teint : 0,
    depart: false,
  };
  // Version 1.2 : le membre peut quitter la famille, sauf s'il est le dernier, le
  // dernier adulte, ou malade (le moteur dit pourquoi).
  const blocage = memberRemovalBlock(state, m.id);
  const depart = blocage
    ? `<span class="muted">${escapeHtml(blocage)}</span>`
    : `<button type="button" class="btn" data-action="member-remove" id="member-remove">Retirer de la famille</button>
       <span class="muted">Le besoin de la famille baisse de ${DATA.FAMILY.AJ[age]} énergie par jour.</span>`;
  const genres = P.GENRES.map((g) => `<button type="button" class="btn choice-btn" data-action="member-genre" data-genre="${g}" aria-pressed="false"><span class="choice-emoji" aria-hidden="true"></span><span>${GENRE_LABELS[age][g]}</span></button>`).join('');
  const teints = P.TEINTS.map((_, t) => `<button type="button" class="btn swatch-btn" data-action="member-teint" data-teint="${t}" aria-pressed="false" aria-label="${TEINT_LABELS[t]}" title="${TEINT_LABELS[t]}"></button>`).join('');
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal member-modal" role="dialog" aria-modal="true" aria-labelledby="member-title" data-stop-propagation>
        <h2 id="member-title">✏️ Modifier : ${escapeHtml(m.nom)}</h2>
        <div class="member-preview" aria-live="polite">
          <span class="portrait-emoji" id="member-preview-emoji" aria-hidden="true"></span>
          <strong class="member-name" id="member-preview-name"></strong>
        </div>
        <div class="stack">
          <div class="stack member-field">
            <label for="member-prenom"><strong>Prénom</strong> <span class="muted">(${P.PRENOM_MAX} caractères au plus)</span></label>
            <input type="text" id="member-prenom" class="member-input" maxlength="${P.PRENOM_MAX}" autocomplete="off" autocapitalize="words" spellcheck="false" value="${memberNameHtml(m.id)}">
          </div>
          <div class="stack member-field" role="group" aria-label="${m.enfant ? 'Fille ou garçon' : 'Femme ou homme'}">
            <strong>${m.enfant ? 'Fille ou garçon' : 'Femme ou homme'}</strong>
            <div class="row choice-row">${genres}</div>
          </div>
          <div class="stack member-field" role="group" aria-label="Couleur de peau">
            <strong>Couleur de peau</strong>
            <div class="row swatch-row">${teints}</div>
          </div>
          <p class="muted">Le prénom reste sur cet appareil, dans ta sauvegarde : il n'est jamais envoyé.</p>
          <p class="alert" id="member-error" role="alert" hidden></p>
        </div>
        <div class="row">
          <button type="button" class="btn primary" data-action="member-save">Enregistrer</button>
          <button type="button" class="btn" data-action="close-modal">Annuler</button>
        </div>
        <div class="stack member-leave">${depart}</div>
      </div>
    </div>`;
  const input = document.getElementById('member-prenom');
  input.addEventListener('input', syncMemberModal);
  syncMemberModal();
  input.focus();
  input.select();
}

// Met à jour l'aperçu, les deux boutons de sexe et les six pastilles de teinte
// d'après les choix en cours, sans toucher au champ du prénom.
function syncMemberModal() {
  const d = memberDraft;
  const root = document.getElementById('modal-root');
  const input = document.getElementById('member-prenom');
  if (!d || !input) return;
  const typed = cleanFirstName(input.value);
  document.getElementById('member-preview-emoji').textContent = portraitEmoji(d.enfant, d.genre, d.teint);
  // textContent : le prénom tapé s'affiche comme du texte, jamais comme du HTML
  document.getElementById('member-preview-name').textContent = typed || '…';
  for (const b of root.querySelectorAll('[data-action="member-genre"]')) {
    const g = b.dataset.genre;
    b.setAttribute('aria-pressed', String(g === d.genre));
    b.classList.toggle('active', g === d.genre);
    b.querySelector('.choice-emoji').textContent = portraitEmoji(d.enfant, g, d.teint);
  }
  for (const b of root.querySelectorAll('[data-action="member-teint"]')) {
    const t = Number(b.dataset.teint);
    b.setAttribute('aria-pressed', String(t === d.teint));
    b.classList.toggle('active', t === d.teint);
    b.textContent = portraitEmoji(d.enfant, d.genre, t);
  }
  const error = document.getElementById('member-error');
  if (error) error.hidden = true;
}

// « Enregistrer » : le moteur vérifie tout ; en cas de refus la fenêtre reste
// ouverte et dit pourquoi.
function saveMemberModal() {
  const d = memberDraft;
  const input = document.getElementById('member-prenom');
  if (!d || !input) return;
  const result = setMemberProfile(state, d.id, { prenom: input.value, genre: d.genre, teint: d.teint });
  if (!result.ok) {
    const error = document.getElementById('member-error');
    if (error) {
      error.textContent = result.error;
      error.hidden = false;
    }
    input.focus();
    return;
  }
  memberDraft = null;
  closeModal();
  persistState();
  refresh();
  showToast('✏️ C\'est noté !');
}

// « Retirer de la famille » : un premier appui demande confirmation, le second
// retire le membre (le moteur vérifie encore qu'il peut partir).
function removeMemberFromModal() {
  const d = memberDraft;
  const btn = document.getElementById('member-remove');
  if (!d || !btn) return;
  if (!d.depart) {
    d.depart = true;
    btn.classList.add('danger');
    btn.textContent = 'Confirmer le départ';
    return;
  }
  const nom = memberName(state, d.id);
  const result = removeMember(state, d.id);
  if (!result.ok) {
    const error = document.getElementById('member-error');
    if (error) {
      error.textContent = result.error;
      error.hidden = false;
    }
    return;
  }
  memberDraft = null;
  closeModal();
  persistState();
  refresh();
  showToast(`👋 ${nom} a quitté la famille. Besoin : ${formatNumber(result.besoin)} énergie par jour.`);
}

/* -- version 1.2 : animaux de compagnie (chiens et chats) -- */

function petNameHtml(id) {
  return escapeHtml(petName(state, id));
}

function petCard(a) {
  const e = DATA.FAMILY.COMPAGNIE.ESPECES[a.espece];
  return `
    <article class="card portrait pet">
      <span class="portrait-emoji" aria-hidden="true">${petIcon(a.espece)}</span>
      <span class="card-title"><span class="member-name">${petNameHtml(a.id)}</span></span>
      <span class="muted">${e ? e.nom : 'Animal'} · ne compte pas dans le besoin</span>
      <button type="button" class="btn" data-action="pet-edit" data-id="${a.id}" aria-label="Modifier cet animal : nom et espèce">✏️ Modifier</button>
    </article>`;
}

let petDraft = null; // { id, espece, depart }

function openPetModal(id) {
  const a = findPet(state, id);
  if (!a) return;
  tel('modal', 'pet'); // le nom de la fenêtre seulement : jamais le nom de l'animal
  const K = DATA.FAMILY.COMPAGNIE;
  const P = DATA.FAMILY.PROFIL;
  petDraft = { id: a.id, espece: K.ESPECES[a.espece] ? a.espece : Object.keys(K.ESPECES)[0], depart: false };
  const especes = Object.entries(K.ESPECES).map(([k, e]) => `<button type="button" class="btn choice-btn" data-action="pet-espece" data-espece="${k}" aria-pressed="false"><span class="choice-emoji" aria-hidden="true">${e.icone}</span><span>${e.nom}</span></button>`).join('');
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal member-modal" role="dialog" aria-modal="true" aria-labelledby="pet-title" data-stop-propagation>
        <h2 id="pet-title">✏️ Animal de compagnie</h2>
        <div class="member-preview" aria-live="polite">
          <span class="portrait-emoji" id="pet-preview-emoji" aria-hidden="true"></span>
          <strong class="member-name" id="pet-preview-name"></strong>
        </div>
        <div class="stack">
          <div class="stack member-field">
            <label for="pet-nom"><strong>Nom</strong> <span class="muted">(${P.PRENOM_MAX} caractères au plus)</span></label>
            <input type="text" id="pet-nom" class="member-input" maxlength="${P.PRENOM_MAX}" autocomplete="off" autocapitalize="words" spellcheck="false" value="${petNameHtml(a.id)}">
          </div>
          <div class="stack member-field" role="group" aria-label="Chien ou chat">
            <strong>Chien ou chat</strong>
            <div class="row choice-row">${especes}</div>
          </div>
          <p class="muted">Il ne mange pas les réserves de la famille : il ne compte pas dans le besoin journalier. Son nom reste sur cet appareil, dans ta sauvegarde.</p>
          <p class="alert" id="pet-error" role="alert" hidden></p>
        </div>
        <div class="row">
          <button type="button" class="btn primary" data-action="pet-save">Enregistrer</button>
          <button type="button" class="btn" data-action="close-modal">Annuler</button>
        </div>
        <div class="stack member-leave">
          <button type="button" class="btn" data-action="pet-remove" id="pet-remove">Retirer de la famille</button>
        </div>
      </div>
    </div>`;
  const input = document.getElementById('pet-nom');
  input.addEventListener('input', syncPetModal);
  syncPetModal();
  input.focus();
  input.select();
}

function syncPetModal() {
  const d = petDraft;
  const input = document.getElementById('pet-nom');
  if (!d || !input) return;
  document.getElementById('pet-preview-emoji').textContent = petIcon(d.espece);
  // textContent : le nom tapé s'affiche comme du texte, jamais comme du HTML
  document.getElementById('pet-preview-name').textContent = cleanFirstName(input.value) || '…';
  for (const b of document.getElementById('modal-root').querySelectorAll('[data-action="pet-espece"]')) {
    const on = b.dataset.espece === d.espece;
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('active', on);
  }
  const error = document.getElementById('pet-error');
  if (error) error.hidden = true;
}

function petModalError(text) {
  const error = document.getElementById('pet-error');
  if (!error) return;
  error.textContent = text;
  error.hidden = false;
}

function savePetModal() {
  const d = petDraft;
  const input = document.getElementById('pet-nom');
  if (!d || !input) return;
  const result = setPetProfile(state, d.id, { nom: input.value, espece: d.espece });
  if (!result.ok) {
    petModalError(result.error);
    input.focus();
    return;
  }
  petDraft = null;
  closeModal();
  persistState();
  refresh();
  showToast('✏️ C\'est noté !');
}

function removePetFromModal() {
  const d = petDraft;
  const btn = document.getElementById('pet-remove');
  if (!d || !btn) return;
  if (!d.depart) {
    d.depart = true;
    btn.classList.add('danger');
    btn.textContent = 'Confirmer le départ';
    return;
  }
  const nom = petName(state, d.id);
  const result = removePet(state, d.id);
  if (!result.ok) {
    petModalError(result.error);
    return;
  }
  petDraft = null;
  closeModal();
  persistState();
  refresh();
  showToast(`👋 ${nom} a quitté la famille.`);
}

// Version 1.2 : composition de la famille (1 à 6 membres) et animaux de compagnie (3 au plus).
function renderFamilyAdd() {
  const C = DATA.FAMILY.COMPOSITION;
  const AJ = DATA.FAMILY.AJ;
  const full = memberRoom(state) === 0;
  return `
    <div class="row family-add">
      <button type="button" class="btn" data-action="member-add" data-age="adulte"${full ? ' disabled' : ''}>➕ Un adulte <span class="muted">(+${AJ.adulte} énergie/jour)</span></button>
      <button type="button" class="btn" data-action="member-add" data-age="enfant"${full ? ' disabled' : ''}>➕ Un enfant <span class="muted">(+${AJ.enfant} énergie/jour)</span></button>
    </div>
    <p class="muted">${full ? `La famille est au complet (${C.MEMBRES_MAX} membres). ` : ''}Pour retirer quelqu'un, ouvre « Modifier » sur sa fiche.</p>`;
}

function renderPets() {
  const K = DATA.FAMILY.COMPAGNIE;
  const list = pets(state);
  const full = petRoom(state) === 0;
  const boutons = Object.entries(K.ESPECES)
    .map(([k, e]) => `<button type="button" class="btn" data-action="pet-add" data-espece="${k}"${full ? ' disabled' : ''}><span aria-hidden="true">${e.icone}</span> Adopter un ${e.nom.toLowerCase()}</button>`)
    .join('');
  return `
    <h3 class="section-title">🐾 Animaux de compagnie · <span class="num">${list.length} / ${K.MAX}</span></h3>
    <p class="muted">Un chien ou un chat tient compagnie à la famille. Il ne mange pas ses réserves : il ne compte pas dans le besoin journalier.</p>
    ${list.length ? `<div class="portraits">${list.map(petCard).join('')}</div>` : ''}
    <div class="row family-add">${boutons}</div>
    ${full ? `<p class="muted">${K.MAX} animaux de compagnie au plus.</p>` : ''}`;
}

function renderFamille() {
  // Avant 19 h : le repas prévu ; après : celui qui a été pris.
  const pris = !!state.repas;
  const plan = state.repas || planMeal(state);
  const shown = Math.min(plan.energie, plan.besoin);
  const short = plan.energie + EPS < plan.besoin;
  const prod = productivity(state);
  const avg = averageHealth(state);
  return `
    <h2>👨‍👩‍👧‍👦 Famille</h2>
    <p class="muted family-count"><span class="num">${state.famille.membres.length} / ${DATA.FAMILY.COMPOSITION.MEMBRES_MAX}</span> membres · besoin : <strong class="num">${formatNumber(familyNeed(state))}</strong> énergie par jour</p>
    <div class="portraits">${state.famille.membres.map(portraitCard).join('')}</div>
    ${renderFamilyAdd()}
    ${renderPets()}
    ${renderAutonomyCard()}
    <div class="cards">
      <div class="card">
        <span class="card-title"><span>🍽️ ${pris ? `Repas de ${DATA.TIME.MEAL_HOUR} h : énergie mangée` : `Repas de ${DATA.TIME.MEAL_HOUR} h : énergie prévue`}</span>${pris ? '<span class="chip">✅ pris</span>' : ''}</span>
        <span class="big">${formatNumber(shown)} / ${formatNumber(plan.besoin)}</span>
        <span class="bar" role="progressbar" aria-label="${pris ? 'Énergie mangée' : 'Énergie prévue'}" aria-valuemin="0" aria-valuemax="${plan.besoin}" aria-valuenow="${Math.round(shown)}"><span class="bar-fill${short ? ' warn' : ''}" style="width:${plan.besoin ? Math.round((shown / plan.besoin) * 100) : 0}%"></span></span>
        <span class="muted">${pris
          ? (short ? '⚠️ Le besoin n\'a pas été couvert : la santé a baissé.' : 'Le besoin a été couvert : la santé est remontée.')
          : (short ? '⚠️ Le besoin ne sera pas couvert : la santé va baisser.' : 'Le besoin sera couvert : la santé remonte.')} La famille mange à ${DATA.TIME.MEAL_HOUR} h, ou au coucher si elle dort avant.</span>
      </div>
      <div class="card">
        <span class="card-title"><span>⚙️ Productivité</span></span>
        <span class="big">${formatPercent(prod)}</span>
        <span class="muted">Santé moyenne : <span class="num">${formatNumber(avg)}</span> (un malade compte pour 0). Elle ne s'applique qu'aux actions au clic, comme la récolte.</span>
      </div>
    </div>`;
}

/* ---------- Notifications ---------- */

// Chaque ligne mène là où l'alerte se règle (voir notifCible) : une fenêtre de la carte,
// avec la carte glissée jusqu'au bâtiment, ou l'Inventaire pour la péremption. Sans la
// carte : la liste de la Ferme, ou la page du Livre de recette.

// Version 1.3 : une lettre du courrier, dans la liste des Notifications.
function mailRow(l) {
  const def = DATA.COURRIER[l.id];
  return `<li><button type="button" class="notif mail${l.lu ? ' lu' : ''}" data-action="mail-open" data-id="${l.id}" aria-label="${def.objet}, de ${def.expediteur}${l.lu ? '' : ' (non lue)'}. Ouvrir la lettre"><span class="notif-icon" aria-hidden="true">${l.lu ? '📭' : '📬'}</span><span class="notif-text">${def.objet}${l.lu ? '' : '<span class="mail-new">Nouveau</span>'}<span class="notif-where">De : ${def.expediteur} · reçue la nuit ${formatNumber(l.nuit)}</span></span><span class="notif-go" aria-hidden="true">›</span></button></li>`;
}

function renderNotifications() {
  const list = getNotifications(state);
  const lettres = mailbox(state).filter((l) => DATA.COURRIER[l.id]);
  const aLire = lettres.filter((l) => !l.lu);
  const lues = lettres.filter((l) => l.lu);
  const items = list
    .map((n) => {
      const c = notifCible(n);
      const ou = cibleNom(c);
      return `<li><button type="button" class="notif p${n.priorite}" ${cibleAttrs(c)}><span class="notif-icon" aria-hidden="true">${n.icone}</span><span class="notif-text">${n.texte}<span class="notif-where">${ou}</span></span><span class="notif-go" aria-hidden="true">›</span></button></li>`;
    })
    .join('');
  // Le courrier à lire passe en premier ; les lettres déjà lues restent en bas, pour les relire.
  return `
    <h2>✉️ Notifications</h2>
    ${aLire.length ? `<h3 class="section-title">📬 Courrier</h3><ul class="notif-list">${aLire.map(mailRow).join('')}</ul>` : ''}
    ${list.length
      ? `<p class="hint${aLire.length ? ' mail-title' : ''}">${list.length} chose${list.length > 1 ? 's' : ''} à voir aujourd'hui.</p><ul class="notif-list">${items}</ul>`
      : `<p class="hint notif-empty">${aLire.length ? 'Rien d\'autre à signaler aujourd\'hui.' : 'Rien à signaler aujourd\'hui.'} 🌾</p>`}
    ${lues.length ? `<h3 class="section-title mail-title">📭 Courrier lu</h3><ul class="notif-list">${lues.map(mailRow).join('')}</ul>` : ''}`;
}

// Ouvre une lettre : elle est marquée lue (elle reste dans le courrier).
function openMailModal(id) {
  const def = DATA.COURRIER[id];
  if (!def || !mailReceived(state, id)) return;
  tel('modal', 'mail');
  // L'annonce d'arrivée n'a plus lieu d'être : elle cacherait le bas de la lettre.
  for (const t of document.querySelectorAll('#toast-root .toast.lettre')) t.remove();
  readMail(state, id);
  persistState();
  const cadeaux = Object.entries(def.cadeaux || {})
    .map(([item, n]) => `${formatNumber(n)} <span aria-hidden="true">${DATA.items[item].icone}</span> ${DATA.items[item].nom}`)
    .join(' · ');
  // Les cadeaux de cette lettre se plantent dans la Serre : un raccourci y mène si la carte l'affiche.
  const serre = def.quand && def.quand.debloque === 'serre';
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal letter" role="dialog" aria-modal="true" aria-labelledby="mail-title" data-stop-propagation>
        <p class="letter-place">${def.lieu}</p>
        <h2 id="mail-title">${def.icone} ${def.objet}</h2>
        <div class="letter-body">${def.texte.map((p) => `<p>${p}</p>`).join('')}</div>
        <p class="letter-sign">${def.signature}</p>
        ${cadeaux ? `<div class="letter-gifts"><strong>Dans l'enveloppe</strong><span class="letter-gift-list">${cadeaux}</span><span class="muted">Déjà rangés dans ton inventaire.${serre ? ' Ils se plantent dans la Serre, et nulle part ailleurs.' : ''}</span></div>` : ''}
        <div class="row">
          ${serre ? `<button type="button" class="btn primary" ${cibleAttrs({ fenetre: 'serre' })}>Aller à la Serre</button>` : ''}
          <button type="button" class="btn${serre ? '' : ' primary'}" data-action="close-modal" id="mail-close">Fermer</button>
        </div>
      </div>
    </div>`;
  // Le focus va sur « Fermer » sans faire défiler : la lettre se lit depuis son en-tête.
  document.getElementById('mail-close').focus({ preventScroll: true });
  refresh();
}

/* ---------- Inventaire ---------- */

// Libellé d'une quantité : « 6 carottes », « 1 carotte », « 1 graine de tomate ».
function unitLabel(item, qty) {
  const name = DATA.items[item].nom.toLowerCase();
  if (name.startsWith('graines ')) return qty > 1 ? name : `graine ${name.slice(8)}`;
  return qty > 1 && !/[sx]$/.test(name) ? `${name}s` : name;
}

function nightsLabel(n) {
  return `${n} nuit${n > 1 ? 's' : ''}`;
}

// « 3 🥕 · 2 🍅 » à partir de { item: quantité }.
function itemsSummary(map) {
  return Object.entries(map)
    .map(([item, n]) => `${n} ${DATA.items[item].icone}`)
    .join(' · ');
}

// Les lots d'un item : « 6 carottes — 2 nuits », le plus ancien en premier ;
// ce qui périt à la prochaine nuit est signalé.
function lotListHtml(item) {
  const lots = lotsOf(state, item);
  if (!isPerishable(item)) return '<span class="muted">Ne périme pas</span>';
  return `<ul class="lot-list" aria-label="Lots">${lots
    .map((l) => {
      const soon = l.nightsLeft === 1;
      return `<li class="${soon ? 'soon-spoil' : ''}"><span>${l.qty} ${unitLabel(item, l.qty)} — ${nightsLabel(l.nightsLeft)}</span>${soon ? '<span aria-hidden="true">⚠️</span><span>périme à la prochaine nuit</span>' : ''}</li>`;
    })
    .join('')}</ul>`;
}

// Lot 8 : boutons pour ranger un aliment périssable au frigo (s'il est construit).
function fridgeInButtons(item) {
  if (!state.frigo.construit || !isPerishable(item) || countItem(state, item) < 1) return '';
  return `
      <span class="device-actions">
        <button type="button" class="btn" data-action="fridge-in" data-item="${item}" data-qty="1">🧊 Ranger 1 au frigo</button>
        <button type="button" class="btn" data-action="fridge-in" data-item="${item}" data-qty="all">🧊 Tout ranger</button>
      </span>`;
}

function inventoryRow(item) {
  const it = DATA.items[item];
  const n = countItem(state, item);
  const reservable = reservableItems().includes(item);
  const res = state.famille.reserve[item] || 0;
  const info = [
    it.energie && it.edible ? `Énergie ${it.energie}` : '',
    it.energie && !it.edible ? `Ingrédient : compte pour ${it.energie} d'énergie dans les plats` : '',
    `Vente ${formatCoins(it.prix)} 💰`,
    it.rachetable === false ? 'non rachetable' : '',
  ].filter(Boolean).join(' · ');
  const reserve = reservable
    ? `
      <div class="row reserve">
        <span class="muted">🔒 Réserve de semences</span>
        <button type="button" class="btn step-btn" data-action="reserve-dec" data-item="${item}" aria-label="Réduire la réserve"${res <= 0 ? ' disabled' : ''}>−</button>
        <strong class="num">${res}</strong>
        <button type="button" class="btn step-btn" data-action="reserve-inc" data-item="${item}" aria-label="Augmenter la réserve"${res >= n ? ' disabled' : ''}>+</button>
      </div>
      <span class="muted">La famille ne mange jamais ${Math.min(res, n)} de ces ${it.nom.toLowerCase()}s : ce sont tes plants.</span>`
    : '';
  return `
    <div class="inv-row">
      <div class="inv-main"><span><span aria-hidden="true">${it.icone}</span> ${it.nom}</span><span class="big num">${formatQty(n)}</span></div>
      ${lotListHtml(item)}
      ${fridgeInButtons(item)}
      <span class="muted">${info}</span>
      ${item === DATA.SILO.ITEM && state.silo.construit ? `<span class="muted">🛖 Dans le Silo : <span class="num">${formatQty(state.silo.ble)}</span> (hors de l'inventaire)</span>` : ''}
      ${reserve}
    </div>`;
}

const INVENTORY_TABS = [
  { id: 'frais', label: 'Frais', icon: '🥕', match: (k) => isPerishable(k), empty: 'Aucun aliment frais pour l\'instant.' },
  { id: 'frigo', label: 'Frigo', icon: '🧊', match: () => false, empty: '' },
  { id: 'graines', label: 'Graines', icon: '🌱', match: (k) => DATA.items[k].category === 'graine', empty: 'Aucune graine pour l\'instant.' },
  { id: 'produits', label: 'Produits', icon: '🥫', match: (k) => !isPerishable(k) && DATA.items[k].category !== 'graine', empty: 'Aucun produit pour l\'instant.' },
];

// Toujours sur une seule rangée. À partir de quatre onglets (`compact`), seul l'onglet
// ouvert affiche son nom ; les autres montrent leur icône (le nom reste dans `title` et
// pour les lecteurs d'écran).
function subtabsHtml(tabs, current, action) {
  return `<div class="subtabs${tabs.length > 3 ? ' compact' : ''}" role="group" aria-label="Sections">${tabs
    .map(
      (t) =>
        `<button type="button" class="subtab-btn${t.id === current ? ' active' : ''}" data-action="${action}" data-tab="${t.id}" aria-pressed="${t.id === current}" title="${t.label}"><span class="subtab-icon" aria-hidden="true">${t.icon}</span><span class="subtab-label">${t.label}</span></button>`
    )
    .join('')}</div>`;
}

function renderInventaire() {
  // Lot 9 : le sous-onglet Frigo n'apparaît qu'avec le chapitre 6.
  const tabs = INVENTORY_TABS.filter((t) => t.id !== 'frigo' || isUnlocked(state, 'frigo'));
  const tab = tabs.find((t) => t.id === invTab) || tabs[0];
  if (tab.id === 'frigo') {
    return `
    <h2>📦 Inventaire</h2>
    ${subtabsHtml(tabs, tab.id, 'inv-tab')}
    ${renderFridgeTab()}`;
  }
  const items = Object.keys(DATA.items).filter(
    (k) => tab.match(k) && (countItem(state, k) > 0 || reservableItems().includes(k))
  );
  const soon = Object.keys(expiringSoon(state)).length > 0 && tab.id === 'frais';
  return `
    <h2>📦 Inventaire</h2>
    ${subtabsHtml(tabs, tab.id, 'inv-tab')}
    ${soon ? '<p class="alert">⚠️ Une partie de tes aliments périt à la prochaine nuit.</p>' : ''}
    <div class="inv-group">
      ${items.length ? items.map(inventoryRow).join('') : `<p class="hint">${tab.empty}</p>`}
    </div>`;
}

/* ---------- Marché ---------- */

// Version 1.1.1 : les animaux s'achètent de nouveau au Marché (onglet Animaux, dès que le
// Poulailler ou l'Étable existe dans la partie) ; l'Étable y mène par un raccourci. Les
// arbres s'achètent au Verger (voir renderArbres).
const COMPTOIR_TABS = [
  { id: 'vendre', label: 'Vendre', icon: '💰', ok: () => true },
  { id: 'acheter', label: 'Acheter', icon: '🛒', ok: () => true },
  { id: 'graines', label: 'Graines', icon: '🌱', ok: () => true },
  { id: 'animaux', label: 'Animaux', icon: '🐔', ok: () => isUnlocked(state, 'poulailler') || isUnlocked(state, 'moutons') || coopShown() || herdShown() },
];

// Quantité choisie pour un achat : entre 1 et ce que les pièces permettent (au moins 1,
// pour que la ligne reste lisible même sans pièces).
function buyQuantity(item) {
  const max = Math.max(1, buyQuote(state, item, BUY_MAX).quantite);
  return Math.max(1, Math.min(max, buyQuantities[item] || 1));
}

function animalQuantity(kind) {
  const max = Math.max(1, Math.min(BUY_MAX, animalBuyMax(state, kind)));
  return Math.max(1, Math.min(max, animalQuantities[kind] || 1));
}

// Les trois boutons de quantité (−, +, Max) d'une ligne d'achat.
function qtyButtons(action, attr, q, max, nom) {
  return `
        <button type="button" class="btn step-btn" data-action="${action}-dec" ${attr} aria-label="Acheter ${nom} de moins"${q <= 1 ? ' disabled' : ''}>−</button>
        <strong class="num qty">${q}</strong>
        <button type="button" class="btn step-btn" data-action="${action}-inc" ${attr} aria-label="Acheter ${nom} de plus"${q >= max ? ' disabled' : ''}>+</button>
        <button type="button" class="btn" data-action="${action}-max" ${attr} title="La plus grande quantité possible"${q >= max ? ' disabled' : ''}>Max</button>`;
}

// Seules les unités entières se vendent (un demi-blé reste en stock).
function sellableStock(item) {
  return Math.floor(sellableCount(state, item) + EPS);
}

// Quantité choisie pour la vente, toujours entre 1 et le stock.
function sellQuantity(item) {
  const stock = sellableStock(item);
  return Math.max(1, Math.min(stock, sellQuantities[item] || 1));
}

function sellRow(item) {
  const it = DATA.items[item];
  const stock = sellableStock(item);
  const q = sellQuantity(item);
  return `
    <div class="shop-row">
      <div class="inv-main"><span><span aria-hidden="true">${it.icone}</span> ${it.nom}</span><span class="muted">En stock : <span class="num">${formatQty(sellableCount(state, item))}</span>${fridgeCount(state, item) > 0 ? ` <span class="chip">❄️ dont ${formatQty(fridgeCount(state, item))} au frigo</span>` : ''}</span></div>
      <span class="muted">Prix de vente : <strong class="num">${formatCoins(it.prix)} 💰</strong> l'unité (fixe)</span>
      <div class="row qty-row">
        <button type="button" class="btn step-btn" data-action="sell-dec" data-item="${item}" aria-label="Vendre une unité de moins"${q <= 1 ? ' disabled' : ''}>−</button>
        <strong class="num qty">${q}</strong>
        <button type="button" class="btn step-btn" data-action="sell-inc" data-item="${item}" aria-label="Vendre une unité de plus"${q >= stock ? ' disabled' : ''}>+</button>
        <button type="button" class="btn" data-action="sell-max" data-item="${item}"${q >= stock ? ' disabled' : ''}>Tout</button>
        <button type="button" class="btn primary sell-go" data-action="sell-item" data-item="${item}">Vendre ${q} (+${formatCoins(q * it.prix)} 💰)</button>
      </div>
    </div>`;
}

// Version 1.1.1 : on choisit la quantité. Le total affiché est le vrai prix : il tient
// compte de la hausse du prix à chaque unité (buyQuote).
function buyRow(item) {
  const it = DATA.items[item];
  const price = buyPrice(state, item);
  const coef = marketCoef(state, item);
  const max = buyQuote(state, item, BUY_MAX).quantite;
  const q = buyQuantity(item);
  const total = max > 0 ? buyQuote(state, item, q).cout : price;
  return `
    <div class="shop-row">
      <div class="inv-main"><span><span aria-hidden="true">${it.icone}</span> ${it.nom}</span><span class="muted">En stock : <span class="num">${formatQty(countItem(state, item))}</span></span></div>
      <span class="muted">Prochaine unité : <strong class="num">${formatCoins(price)} 💰</strong> · coefficient <span class="num">${formatNumber(coef)} %</span> · vente ${formatCoins(it.prix)} 💰</span>
      <div class="row qty-row">${qtyButtons('buy', `data-item="${item}"`, q, max, 'une unité')}
        <button type="button" class="btn primary sell-go" data-action="buy-item" data-item="${item}"${max > 0 ? '' : ' disabled'}>Acheter ${q} (−${formatCoins(total)} 💰)</button>
      </div>
    </div>`;
}

// Quantité et bouton d'achat d'un animal (prix fixe : le total est q × prix).
function animalBuyHtml(kind, ok, libelle) {
  const price = animalPrice(kind);
  const max = ok ? Math.min(BUY_MAX, animalBuyMax(state, kind)) : 0;
  const q = animalQuantity(kind);
  return `
      <div class="row qty-row">${qtyButtons('animal', `data-kind="${kind}"`, q, max, 'un animal')}
        <button type="button" class="btn primary sell-go" data-action="buy-animal" data-kind="${kind}"${max > 0 ? '' : ' disabled'}>Acheter ${q} ${libelle}${q > 1 ? 's' : ''} (−${formatCoins(q * price)} 💰)</button>
      </div>`;
}

// Achat des animaux (au Marché, onglet Animaux) : la poule, le mouton et la vache, à prix
// fixe et sans revente. Grisés s'il n'y a plus de place, ou si leur logement n'existe pas.
function renderHenRow() {
  const def = DATA.ANIMAUX.poule;
  const p = state.poulailler;
  const cap = coopCapacity(state);
  const price = animalPrice('poule');
  let note;
  let ok = true;
  if (!p.construit) {
    note = '⚠️ Construis d\'abord le Poulailler (à l\'Étable, sur la carte).';
    ok = false;
  } else if (p.poules >= cap) {
    note = '⚠️ Le Poulailler est plein : agrandis-le pour accueillir d\'autres poules.';
    ok = false;
  } else {
    note = `Places libres : ${cap - p.poules}.`;
  }
  return `
    <div class="shop-row${ok ? '' : ' unavailable'}">
      <div class="inv-main"><span><span aria-hidden="true">${def.icone}</span> ${def.nom}</span><span class="muted">Poules : <span class="num">${p.poules} / ${cap}</span></span></div>
      <span class="muted">Prix fixe : <strong class="num">${formatCoins(price)} 💰</strong> · 1 blé nourrit ${def.poulesParBle} poules pour la nuit · pond 1 œuf par nuit si nourrie, toute sa vie.</span>
      <span class="muted">${note}</span>
      ${animalBuyHtml('poule', ok, 'poule')}
    </div>`;
}

function renderSheepRow() {
  const def = DATA.ANIMAUX.mouton;
  const p = state.paturage;
  const cap = pastureCapacity(state);
  const price = animalPrice('mouton');
  let note;
  let ok = true;
  if (!p.construit) {
    note = '⚠️ Prépare d\'abord l\'Étable pour les moutons et les vaches.';
    ok = false;
  } else if (freeSheepPlaces(state) <= 0) {
    note = `⚠️ L'Étable est pleine : achète une place de plus (${costLabel(pastureCost(state))}).`;
    ok = false;
  } else {
    note = `Places libres : ${freeSheepPlaces(state)}.`;
  }
  return `
    <div class="shop-row${ok ? '' : ' unavailable'}">
      <div class="inv-main"><span><span aria-hidden="true">${def.icone}</span> ${def.nom}</span><span class="muted">Moutons : <span class="num">${sheepCount(state)} / ${cap}</span></span></div>
      <span class="muted">Prix fixe : <strong class="num">${formatCoins(price)} 💰</strong> · prend ${formatPlaces(DATA.PATURAGE.placesParMouton)} · mange ${formatStraw(def.pailleParNuit)} par nuit · ${def.laineParTonte} laine toutes les ${def.joursLaine} nuits nourri.</span>
      <span class="muted">${note}</span>
      ${animalBuyHtml('mouton', ok, 'mouton')}
    </div>`;
}

// La vache, sur le modèle de renderSheepRow(). Disponible dès le même chapitre
// que le mouton (« Le troupeau ») : elle partage les places de l'Étable.
function renderCowRow() {
  const def = DATA.ANIMAUX.vache;
  const p = state.paturage;
  const cap = cowCapacity(state);
  const price = animalPrice('vache');
  let note;
  let ok = true;
  if (!p.construit) {
    note = '⚠️ Prépare d\'abord l\'Étable pour les moutons et les vaches.';
    ok = false;
  } else if (freeCowPlaces(state) <= 0) {
    note = `⚠️ Pas assez de place pour une vache (il lui faut ${formatPlaces(DATA.PATURAGE.placesParVache)} libres) : achète des places (${costLabel(pastureCost(state))} la prochaine).`;
    ok = false;
  } else {
    note = `Places libres : ${freeCowPlaces(state)}.`;
  }
  return `
    <div class="shop-row${ok ? '' : ' unavailable'}">
      <div class="inv-main"><span><span aria-hidden="true">${def.icone}</span> ${def.nom}</span><span class="muted">Vaches : <span class="num">${cowCount(state)} / ${cap}</span></span></div>
      <span class="muted">Prix fixe : <strong class="num">${formatCoins(price)} 💰</strong> · prend ${formatPlaces(DATA.PATURAGE.placesParVache)} · mange ${formatStraw(def.pailleParNuit)} par nuit · ${def.laitParNuit} lait chaque nuit où elle a mangé.</span>
      <span class="muted">${note}</span>
      ${animalBuyHtml('vache', ok, 'vache')}
    </div>`;
}

// Lignes d'achat des animaux (onglet Animaux du Marché).
function renderAnimaux(especes = ['poule', 'mouton', 'vache']) {
  const lignes = {
    poule: () => (coopShown() ? renderHenRow() : ''),
    mouton: () => (isUnlocked(state, 'moutons') || herdShown() ? renderSheepRow() : ''),
    vache: () => (isUnlocked(state, 'moutons') || herdShown() ? renderCowRow() : ''),
  };
  const html = especes.map((e) => lignes[e]()).join('');
  if (!html) return '';
  return `
    <p class="muted">Prix fixe, quel que soit leur nombre. Un animal ne se revend pas. Les poules, les moutons et les vaches vivent à l'Étable.</p>
    ${html}`;
}

// Lot 8 : achat des arbres (au Verger), pommier et poirier à prix fixe sur un emplacement libre.
function renderTreeRow(espece) {
  const def = DATA.VERGER.ARBRES[espece];
  const fruit = DATA.items[def.fruit];
  const v = state.verger;
  let note;
  let ok = true;
  if (!v.construit) {
    note = '⚠️ Aménage d\'abord le Verger (onglet Ferme).';
    ok = false;
  } else if (orchardFree(state) <= 0) {
    note = v.places >= DATA.VERGER.EMPLACEMENTS_MAX
      ? '⚠️ Le Verger est plein et a atteint sa taille maximale.'
      : `⚠️ Le Verger est plein : achète un emplacement (${costLabel(orchardSlotPrice(state))}).`;
    ok = false;
  } else {
    note = `Emplacements libres : ${orchardFree(state)}.`;
  }
  return `
    <div class="shop-row${ok ? '' : ' unavailable'}">
      <div class="inv-main"><span><span aria-hidden="true">${fruit.icone}</span> ${def.nom}</span><span class="muted">Arbres : <span class="num">${v.arbres.filter((t) => t.espece === espece).length}</span></span></div>
      <span class="muted">Prix fixe : <strong class="num">${formatCoins(def.prix)} 💰</strong> · ${fruit.nom.toLowerCase()}s (${fruit.energie} énergie, vente ${formatCoins(fruit.prix)} 💰) · première récolte ${DATA.VERGER.MATURITE} nuits après la plantation.</span>
      <span class="muted">${note}</span>
      <button type="button" class="btn primary" data-action="buy-tree" data-species="${espece}"${ok && canPay(def.prix) ? '' : ' disabled'}>Acheter un ${def.nom.toLowerCase()} (${formatCoins(def.prix)} 💰)</button>
    </div>`;
}

// Bloc d'achat affiché au Verger, sous les emplacements (l'achat d'un emplacement est
// déjà dans la section du Verger).
function renderArbres() {
  const V = DATA.VERGER;
  return `
    <h3 class="section-title">🛒 Acheter des arbres</h3>
    <p class="muted">Prix fixe. Un arbre se plante sur un emplacement libre et ne s'arrose pas : ${V.FRUITS} fruits toutes les ${V.PERIODE} nuits pendant la fin de l'été et l'automne.</p>
    ${Object.keys(V.ARBRES).map(renderTreeRow).join('')}`;
}

// Une graine dont la culture n'est pas encore débloquée (tournesol) n'est pas en vente.
function seedForSale(item) {
  return !Object.keys(DATA.crops).some((c) => seedItem(c) === item && !isUnlocked(state, c));
}

function renderComptoir() {
  const tabs = COMPTOIR_TABS.filter((t) => t.ok());
  const tab = tabs.find((t) => t.id === comptoirTab) || tabs[0];
  let body;
  if (tab.id === 'vendre') {
    const items = Object.keys(DATA.items).filter((k) => sellableCount(state, k) > 0);
    body = `
      <p class="muted">Prix de vente fixes. Les articles rangés au frigo se vendent aussi (l'inventaire part en premier). Chaque unité vendue baisse de ${formatNumber(DATA.MARCHE.PAS)} points le coefficient d'achat de l'objet, sans passer sous son plancher.</p>
      ${items.length ? items.map(sellRow).join('') : '<p class="hint">Tu n\'as rien à vendre pour l\'instant.</p>'}`;
  } else if (tab.id === 'acheter') {
    const items = Object.keys(DATA.items).filter((k) => isBuyable(k) && DATA.items[k].category !== 'graine');
    body = `
      <p class="muted">Prix d'achat = prix de vente × coefficient, arrondi à l'entier supérieur. Chaque unité achetée ajoute ${formatNumber(DATA.MARCHE.PAS)} points au coefficient, et il ne redescend qu'à la vente : le Marché dépanne, il ne nourrit pas la ferme. Les conserves ne s'achètent pas.</p>
      ${items.map(buyRow).join('')}`;
  } else if (tab.id === 'animaux') {
    body = renderAnimaux();
  } else {
    const items = Object.keys(DATA.items).filter((k) => isBuyable(k) && isGraineComptoir(k) && seedForSale(k));
    body = `
      <p class="muted"><span class="chip badge">dépannage</span> Les graines s'achètent au prix majoré : coefficient de départ et plancher à ${formatNumber(DATA.MARCHE.PLANCHER.graine)} %. Produire tes propres graines reste plus rentable. Le blé fait exception : c'est aussi la ressource du Silo, du Moulin et des poules, donc il garde son prix habituel (plancher ${formatNumber(DATA.MARCHE.PLANCHER.defaut)} %) et reste également listé dans l'onglet Acheter.</p>
      ${items.map(buyRow).join('')}`;
  }
  return `
    <h2>🧺 Marché</h2>
    ${subtabsHtml(tabs, tab.id, 'comptoir-tab')}
    ${body}`;
}

/* ---------- écran de réveil ---------- */

function plural(n, mot) {
  return `${n} ${mot}${n > 1 ? 's' : ''}`;
}

// Lignes du réveil pour les automatisations (Lot 7) : ce qui a été fait, puis ce qui a manqué.
function autoLines(a) {
  if (!a || !(a.potager || a.serre || a.poulailler || a.tondus)) return [];
  const done = [];
  if (a.potager || a.serre) done.push(`💧 ${plural(a.arrosees, 'parcelle')} arrosée${a.arrosees > 1 ? 's' : ''}`);
  const harvested = itemsSummary(a.recoltes || {});
  if (harvested) done.push(`🧺 ${harvested}`);
  if (a.semees > 0) done.push(`🌱 ${plural(a.semees, 'semis')}`);
  if (a.poulailler) done.push(`🌾 ${plural(a.nourries, 'poule')} nourrie${a.nourries > 1 ? 's' : ''}`);
  if (a.tondus > 0) done.push(`✂️ ${plural(a.tondus, 'mouton')} tondu${a.tondus > 1 ? 's' : ''}`);
  const lines = [`<li>🤖 Automatisations : <strong>${done.join(' · ')}</strong></li>`];
  if (a.sansEau > 0) lines.push(`<li class="alert">💧 Eau insuffisante : ${plural(a.sansEau, 'parcelle')} non arrosée${a.sansEau > 1 ? 's' : ''} cette nuit.</li>`);
  if (a.sansBle > 0) lines.push(`<li class="alert">🌾 Blé insuffisant : ${plural(a.sansBle, 'poule')} non nourrie${a.sansBle > 1 ? 's' : ''}, pas d'œuf.</li>`);
  if (a.sansGraine > 0) lines.push(`<li class="alert">🌱 Pas de graine au-delà de la réserve : ${plural(a.sansGraine, 'parcelle')} laissée${a.sansGraine > 1 ? 's' : ''} vide${a.sansGraine > 1 ? 's' : ''}.</li>`);
  return lines;
}

// Version 1.1 : la nuit à l'Étable. Qui a mangé, la laine prête, le lait donné,
// la paille qui a manqué cette nuit et celle qui manque pour la nuit prochaine.
// (Un compte rendu d'avant la version 1.1 n'a pas de champ `etable`.)
function stableLines(report) {
  const lines = [];
  const e = report.etable || null;
  const straw = DATA.items[DATA.PATURAGE.nourriture].icone;
  if (report.moutons > 0) {
    const fed = e ? ` · nourris : <strong class="num">${e.moutonsNourris} / ${e.moutons}</strong>` : '';
    lines.push(`<li>🐑 Moutons : <strong class="num">${report.moutons}</strong>${fed}${report.lainePrete > 0 ? ` · 🧶 Laine prête : <strong class="num">${report.lainePrete}</strong> mouton${report.lainePrete > 1 ? 's' : ''} à tondre` : ''}</li>`);
  }
  if (report.vaches > 0) {
    const fed = e ? ` · nourries : <strong class="num">${e.vachesNourries} / ${e.vaches}</strong>` : '';
    lines.push(`<li>🐄 Vaches : <strong class="num">${report.vaches}</strong>${fed} · 🥛 Lait : <strong class="num">${formatNumber(report.lait)}</strong></li>`);
  }
  if (e && e.paille > 0) lines.push(`<li>${straw} Paille mangée cette nuit : <strong class="num">${formatNumber(e.paille)}</strong></li>`);
  if (e && e.manque > 0) {
    const sans = (e.moutons - e.moutonsNourris) + (e.vaches - e.vachesNourries);
    lines.push(`<li class="alert">${straw} Il a manqué ${formatStraw(e.manque)} cette nuit : ${plural(sans, 'animal').replace('animals', 'animaux')} n'${sans > 1 ? 'ont' : 'a'} pas mangé, donc pas de laine ni de lait pour ${sans > 1 ? 'eux' : 'lui'}. Rien d'autre ne leur arrive.</li>`);
  }
  if (typeof report.pailleBesoin === 'number' && report.pailleBesoin > report.paille) {
    lines.push(`<li class="alert">${straw} Il manque de la paille pour la nuit prochaine : ${formatNumber(report.paille)} en stock, il en faut ${formatNumber(report.pailleBesoin)}. Mouds du blé au Moulin.</li>`);
  }
  return lines;
}

// Lot 8 : saison du réveil, fruits du verger et nuit du frigo.
function seasonLines(report) {
  const lines = [];
  const info = DATA.SAISONS.INFOS[report.saison];
  if (info) {
    lines.push(report.nuitDeSaison === 1
      ? `<li>📅 <strong>Nouvelle saison : ${info.icone} ${info.nom}</strong> (nuit 1 / ${DATA.SAISONS.LONGUEUR})</li>`
      : `<li>📅 ${info.icone} ${info.nom} · nuit ${report.nuitDeSaison} / ${DATA.SAISONS.LONGUEUR}</li>`);
  }
  const fruits = itemsSummary(report.fruits || {});
  if (fruits) lines.push(`<li>🌳 Fruits du verger : <strong>${fruits}</strong></li>`);
  const f = report.frigo;
  if (f && f.construit) {
    lines.push(`<li>🧊 Frigo : <strong class="num">${formatWh(f.mwh)}</strong> prélevés pour la nuit · ${f.unites} unité${f.unites > 1 ? 's' : ''} au frais</li>`);
    if (f.panne) lines.push('<li class="alert">⚠️ Panne de froid cette nuit : batteries insuffisantes (ou frigo éteint).</li>');
    if (f.vieillis) lines.push('<li class="alert">⚠️ Le frigo n\'a pas assez tenu : chaque lot a perdu une nuit de conservation.</li>');
    else if (!f.couvreLaNuit) lines.push('<li class="alert">⚠️ La batterie ne couvrira pas la prochaine nuit du frigo.</li>');
  }
  return lines;
}

function openWakeModal(report, auto = false) {
  tel('modal', 'wake');
  const root = document.getElementById('modal-root');
  const line = (d, text) => {
    const dev = findDevice(state, d.id);
    return `<li>${text.replace('{nom}', dev ? deviceName(dev) : d.id).replace('{usure}', formatNumber(d.usure))}</li>`;
  };
  const problems = [
    ...report.enPanne.map((d) => line(d, '⛔ {nom} : en panne, à réparer.')),
    ...report.aEntretenir.map((d) => line(d, '⚠️ {nom} : à entretenir (usure {usure} %).')),
  ];
  const eaten = itemsSummary(report.mange);
  const spoiled = itemsSummary(report.perimes);
  const expiring = itemsSummary(report.aPerimer);
  const shownEnergy = Math.min(report.energieMangee, report.besoin);
  const covered = report.couverture;
  const ready = report.pretes.length
    ? report.pretes
        .map((r) => `${r.nombre} ${DATA.crops[r.culture].icone} ${DATA.crops[r.culture].nom.toLowerCase()}${r.montee ? ' (graines)' : ''}`)
        .join(', ')
    : '';
  const family = [
    `<li>🍽️ Énergie mangée : <strong class="num">${formatNumber(shownEnergy)} / ${formatNumber(report.besoin)}</strong> (${covered} %)${eaten ? ` — ${eaten}` : ''}</li>`,
    `<li>🌿 Autonomie de la nuit : <strong class="num">${formatPercent(report.autonomie)}</strong> (${formatNumber(report.energieProduit)} énergie produite par la ferme sur ${formatNumber(report.besoin)})</li>`,
    `<li>❤️ Santé moyenne : <strong class="num">${formatNumber(report.santeAvant)} → ${formatNumber(report.santeApres)}</strong> (${formatSigned(report.santeApres - report.santeAvant)})${report.bonusPlats > 0 ? ` · bonus des plats : +${report.bonusPlats}` : ''}</li>`,
    Object.keys(report.termine).length ? `<li>🍳 Terminé pendant la nuit : <strong>${itemsSummary(report.termine)}</strong></li>` : '',
    // Le compte rendu porte des identifiants ; le prénom est lu ici, et échappé.
    ...report.nouveauxMalades.map((id) => `<li class="alert">🤒 ${memberNameHtml(id) || 'Quelqu\'un'} est malade : un soin est nécessaire.</li>`),
    report.poules > 0 || report.oeufs > 0
      ? `<li>🥚 Œufs pondus : <strong class="num">${formatNumber(report.oeufs)}</strong> · 🌾 Blé consommé par les poules : <strong class="num">${formatQty(report.bleConsomme)}</strong></li>`
      : '',
    ...stableLines(report),
    ...autoLines(report.auto),
    report.pluie > 0 ? `<li>🌧️ Eau de pluie récupérée : <strong class="num">${formatNumber(report.pluie)} L</strong></li>` : '',
    ...(report.entretiens || []).map((e) => { const d = findDevice(state, e.id); return `<li>🛠️ Entretien automatique : ${d ? deviceName(d) : e.id} (${costLabel(e.cost)})</li>`; }),
    ...seasonLines(report),
    ready ? `<li>🧺 Récoltes prêtes : <strong>${ready}</strong></li>` : '<li>🌱 Aucune récolte prête pour l\'instant.</li>',
    spoiled ? `<li class="alert">🗑️ Aliments périmés cette nuit : <strong>${spoiled}</strong></li>` : '<li>✅ Rien n\'a péri cette nuit.</li>',
    expiring ? `<li>⏳ À manger vite, périme à la prochaine nuit : <strong>${expiring}</strong></li>` : '',
  ];
  // Résumé allégé : autonomie, santé, récolte de la nuit. Tout le reste (ancien contenu du
  // réveil, inchangé) est dans « Voir plus ».
  const w = wakeSummary(report);
  const harvestName = (r) => `<span aria-hidden="true">${DATA.items[r.item].icone}</span> ${DATA.items[r.item].nom.toLowerCase()} ×${formatNumber(r.qte)}`;
  const harvestLine = w.recolte.affiches.length
    ? w.recolte.affiches.map(harvestName).join(', ') + (w.recolte.reste.length ? ` <span class="muted">+ ${w.recolte.reste.length} autre${w.recolte.reste.length > 1 ? 's' : ''}</span>` : '')
    : '<span class="muted">Rien récolté cette nuit</span>';
  const fullHarvest = w.recolte.reste.length
    ? `<li>🧺 Récolte complète de la nuit : <strong>${[...w.recolte.affiches, ...w.recolte.reste].map(harvestName).join(', ')}</strong></li>`
    : '';
  root.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="wake-title" data-stop-propagation>
        <h2 id="wake-title">🌅 Réveil : nuit ${report.nuit}</h2>
        <p class="muted wake-hour">${auto ? `Il était ${DATA.TIME.NIGHT_HOUR}&nbsp;h : la famille est allée se coucher. ` : ''}Il est ${DATA.TIME.DAY_START_HOUR}&nbsp;h. La journée commence quand tu fermes ce résumé.</p>
        <div class="wake-kpis">
          <div class="wake-kpi"><span class="muted">🌿 Autonomie</span><strong class="num">${formatPercent(w.autonomie)}</strong></div>
          <div class="wake-kpi"><span class="muted">❤️ Santé</span><strong class="num">${formatPercent(w.sante)}</strong></div>
        </div>
        <p class="wake-harvest"><strong>🧺 Récolte</strong> : ${harvestLine}</p>
        <div id="wake-detail" hidden>
          <ul class="report-list">
            ${fullHarvest}
            ${family.join('')}
            <li>⚡ Énergie stockée : <strong class="num">${formatNumber(Math.floor(report.energie / 1000))} / ${formatWh(report.capacite)}</strong></li>
            <li>💧 Eau disponible : <strong class="num">${formatNumber(Math.floor(report.eau / 1000))} / ${formatLitres(report.capaciteEau)}</strong></li>
            ${report.energiePerdue >= 1000 ? `<li>☀️ Énergie perdue pendant la journée (batteries pleines) : <strong class="num">${formatWh(report.energiePerdue)}</strong></li>` : ''}
            ${problems.length ? problems.join('') : '<li>✅ Tous les appareils sont en bon état.</li>'}
          </ul>
        </div>
        <div class="row wake-actions">
          <button type="button" class="btn btn-pill" data-action="wake-more" id="wake-more" aria-expanded="false" aria-controls="wake-detail">Voir plus</button>
          <button type="button" class="btn primary btn-pill" data-action="close-modal" id="wake-close">Bonne journée</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('wake-close').focus();
}

/* ---------- Lot 9 : chapitres, autonomie, graphique ---------- */

function objectiveValueText(o) {
  const n = (x) => formatNumber(Math.floor(x));
  switch (o.type) {
    case 'litres': return `${n(o.valeur)} / ${formatNumber(o.cible)} L`;
    case 'wh': return `${n(o.valeur)} / ${formatNumber(o.cible)} Wh`;
    case 'autonomie': return `${formatPercent(o.valeur)} / ${formatNumber(o.cible)} %`;
    case 'sante': return `${n(o.valeur)} / ${formatNumber(o.cible)}`;
    case 'pontes': case 'serie100': return `${n(o.valeur)} / ${formatNumber(o.cible)} nuits`;
    case 'hiver': return o.ok ? '✅' : '';
    default: return `${n(o.valeur)} / ${formatNumber(o.cible)}`;
  }
}

// Ligne d'explication sous l'objectif de l'hiver.
function winterLine() {
  const w = winterStatus(state);
  const obj = objectiveDef('hiver');
  const L = DATA.SAISONS.LONGUEUR;
  const last = w.dernier && !w.dernier.reussi
    ? ` Dernier hiver : moyenne ${formatPercent(w.dernier.moyenne)}${w.dernier.sansSoin ? '' : ', soin payé'} : raté.`
    : '';
  if (w.etat === 'reussi') return '✅ Hiver traversé.';
  if (w.etat === 'suivi') {
    return `❄️ Hiver suivi : nuit ${w.nuits} / ${L} · moyenne ${formatPercent(w.moyenne)} (objectif ${obj.moyenne} %)${w.soinPaye ? ' · ⚠️ un soin a été payé : cet hiver est raté.' : ''}`;
  }
  if (w.etat === 'manque') return `⏳ L'hiver a commencé sans être suivi depuis sa première nuit : il ne compte pas. Prochain hiver : nuit ${w.prochaine}.${last}`;
  return `⏳ ${w.prochaine === state.day ? 'L\'hiver commence aujourd\'hui.' : `Prochain hiver : nuit ${w.prochaine}.`}${last}`;
}

function objectiveHtml(o) {
  const line = o.type === 'hiver' ? `<span class="muted">${winterLine()}</span>` : '';
  return `
    <li class="objective${o.ok ? ' ok' : ''}">
      <span class="objective-line"><span class="objective-label">${o.ok ? '✅' : '⬜'} ${o.libelle}</span><span class="objective-value">${objectiveValueText(o)}</span></span>
      <span class="bar" role="progressbar" aria-label="${o.libelle}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(o.ratio * 100)}"><span class="bar-fill${o.ok ? '' : ' warn'}" style="width:${Math.round(o.ratio * 100)}%"></span></span>
      ${line}
    </li>`;
}

// Bandeau de chapitre, en haut de la Ferme : titre, objectifs et progression.
function renderChapterBanner() {
  const c = state.campagne;
  if (c.fini) {
    return `
    <div class="card chapter-card done">
      <span class="card-title"><span>🏆 Campagne terminée</span><span class="chip">Mode libre</span></span>
      <span class="muted">La famille est autonome : tout est débloqué. Joue à ton rythme.</span>
    </div>`;
  }
  const p = chapterProgress(state);
  return `
    <div class="card chapter-card">
      <span class="card-title"><span>${p.icone} ${p.titre}</span><span class="chip">Chapitre ${p.chapitre} / ${chapterCount()}</span></span>
      <span class="muted">${p.intro}</span>
      <ul class="objectives">${p.objectifs.map(objectiveHtml).join('')}</ul>
    </div>`;
}

// Petit graphique SVG : une barre par nuit, les GRAPHIQUE_NUITS dernières nuits,
// la plus récente à droite ; la ligne pointillée est l'objectif du chapitre.
function autonomyChartHtml() {
  const N = DATA.AUTONOMIE.GRAPHIQUE_NUITS;
  const h = autonomyHistory(state);
  const W = 320, H = 130, left = 30, right = 6, top = 8, bottom = 20;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const slot = plotW / N;
  const bw = slot * 0.7;
  const y = (pct) => top + plotH * (1 - pct / 100);
  const grid = [0, 25, 50, 75, 100]
    .map((g) => `<line class="chart-grid" x1="${left}" y1="${y(g).toFixed(1)}" x2="${W - right}" y2="${y(g).toFixed(1)}"/><text class="chart-label" x="${left - 4}" y="${(y(g) + 3).toFixed(1)}" text-anchor="end">${g}</text>`)
    .join('');
  const bars = h
    .map((e, i) => {
      const x = left + (N - h.length + i) * slot + (slot - bw) / 2;
      const bh = Math.max(e.pct > 0 ? 1.5 : 0, plotH * (e.pct / 100));
      return `<rect class="chart-bar${e.pct + EPS >= 100 ? ' full' : ''}" x="${x.toFixed(1)}" y="${(top + plotH - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}"><title>Nuit ${e.nuit} : ${formatPercent(e.pct)}</title></rect>`;
    })
    .join('');
  const ends = h.length
    ? `<text class="chart-label" x="${(left + (N - h.length) * slot + slot / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${h[0].nuit}</text>` +
      (h.length > 1 ? `<text class="chart-label" x="${(left + (N - 1) * slot + slot / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${h[h.length - 1].nuit}</text>` : '')
    : `<text class="chart-empty" x="${(left + plotW / 2).toFixed(1)}" y="${(top + plotH / 2).toFixed(1)}" text-anchor="middle">Le graphique apparaît après ta première nuit.</text>`;
  const goal = !state.campagne.fini ? chapterProgress(state).objectifs.find((o) => o.type === 'autonomie') : null;
  const target = goal
    ? `<line class="chart-target" x1="${left}" y1="${y(goal.cible).toFixed(1)}" x2="${W - right}" y2="${y(goal.cible).toFixed(1)}"><title>Objectif du chapitre : ${goal.cible} %</title></line>`
    : '';
  const label = h.length
    ? `Autonomie des ${h.length} dernière${h.length > 1 ? 's' : ''} nuit${h.length > 1 ? 's' : ''} : ${h.map((e) => `nuit ${e.nuit}, ${formatPercent(e.pct)}`).join(' ; ')}`
    : 'Autonomie par nuit : aucune nuit pour l\'instant';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">${grid}${bars}${target}${ends}</svg>`;
}

function renderAutonomyCard() {
  const c = state.campagne;
  const goal = !c.fini ? chapterProgress(state).objectifs.find((o) => o.type === 'autonomie') : null;
  return `
    <div class="card autonomy-card">
      <span class="card-title"><span>🌿 Autonomie</span><span class="chip">${DATA.AUTONOMIE.GRAPHIQUE_NUITS} dernières nuits</span></span>
      <span class="big">${formatPercent(lastAutonomy(state))}</span>
      <span class="muted">Dernière nuit : l'énergie mangée qui vient de la ferme, sur ${formatNumber(familyNeed(state))}. Les conserves et les achats du Marché ne comptent pas. Prévue cette nuit : <strong class="num">${formatPercent(plannedAutonomy(state))}</strong>.${goal ? ` Objectif du chapitre : ${goal.cible} % (ligne pointillée).` : ''}</span>
      ${autonomyChartHtml()}
    </div>`;
}

// Écran de fin de chapitre : ce qu'on vient de finir, les nouveautés, la suite.
function openChapterModal() {
  tel('modal', 'chapter');
  const c = state.campagne;
  const a = c && c.annonces[0];
  if (!a) return;
  const L = DATA.CHAPITRES.liste;
  const done = L[a.chapitre - 1];
  const next = L[a.chapitre] || null;
  const news = next ? next.debloque : [];
  const newsHtml = news.length
    ? `<h3>✨ Nouveautés</h3><ul class="unlock-list">${news
        .map((id) => `<li><strong>${DATA.CHAPITRES.ELEMENTS[id].icone} ${DATA.CHAPITRES.ELEMENTS[id].nom}</strong><br><span class="muted">${DATA.CHAPITRES.ELEMENTS[id].note}</span></li>`)
        .join('')}</ul>`
    : '';
  const body = next
    ? `${newsHtml}
       <h3>Chapitre ${a.chapitre + 1} : ${next.icone} ${next.titre}</h3>
       <p class="muted">${next.intro}</p>
       <ul class="objectives">${next.objectifs.map((o) => `<li class="objective"><span class="objective-label">⬜ ${o.libelle}</span></li>`).join('')}</ul>`
    : `<h3>🏆 Campagne terminée</h3>
       <p>La famille se nourrit de ce que produit la ferme. Le mode libre commence : tout est débloqué, joue à ton rythme. Chaque série de ${DATA.techtree.POINTS.MODE_LIBRE_NUITS_100} nuits à 100 % rapporte encore 1 point de technologie.</p>`;
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" id="chapter-modal" role="dialog" aria-modal="true" aria-labelledby="chapter-title" data-stop-propagation>
        <h2 id="chapter-title">🎉 Chapitre ${a.chapitre} terminé</h2>
        <p><strong>${done.icone} ${done.titre}</strong></p>
        <p>🔬 +${formatNumber(DATA.techtree.POINTS.CHAPITRES[a.chapitre - 1] || 0)} points de technologie, à dépenser dans l'Arbre des technologies.</p>
        ${body}
        <button type="button" class="btn primary" data-action="ack-chapter" id="chapter-close">Continuer</button>
      </div>
    </div>`;
  document.getElementById('chapter-close').focus();
}

// Ouvre l'écran de fin d'un chapitre dès qu'aucune autre fenêtre n'est ouverte.
function watchChapters() {
  if (!state.campagne || !state.campagne.annonces.length) return;
  if (document.getElementById('modal-root').childElementCount === 0) openChapterModal();
}

/* ---------- Lot 11 : illustrations et animations ---------- */

// Dessin décoratif : un <svg> qui empile des symboles du sprite. `key` identifie
// ce qu'il montre (une plante à un stade) : quand la clé change, morph remplace
// le dessin et l'anime (`anim` : 'grow' pour la pousse, 'lay' pour la ponte).
function artSvg(symbols, cls = '', key = '', anim = '') {
  const uses = symbols.map((id) => `<use href="#${id}"/>`).join('');
  return `<svg class="art${cls ? ' ' + cls : ''}" viewBox="0 0 48 48" aria-hidden="true" focusable="false"${key ? ` data-key="${key}"` : ''}${anim ? ` data-anim="${anim}"` : ''}>${uses}</svg>`;
}

// Petite icône de bâtiment, devant un titre.
function icon(id) {
  return artSvg([`b-${id}`], 'art-icon');
}

// Symbole de la plante d'une parcelle : semis, pousse, feuillage, puis la
// culture mûre (ou la fleur à graines d'une carotte montée en graine).
function plotSymbol(p) {
  if (!p.culture) return null;
  const def = DATA.crops[p.culture];
  if (isMature(p)) return p.montee ? 'crop-graine' : `crop-${p.culture}`;
  if (p.stade >= def.stades) return `crop-${p.culture}`; // mûre, en train de monter en graine
  if (p.stade === 0) return 'plant-s0';
  return p.stade * 2 < def.stades ? 'plant-s1' : 'plant-s2';
}

function plotArt(p) {
  const sym = plotSymbol(p);
  return artSvg(sym ? ['plot-soil', sym] : ['plot-soil'], 'plot-art', `${p.culture || 'vide'}-${sym || 'terre'}`, 'grow');
}

// Poulailler : une poule, et l'œuf de la nuit qui tombe au réveil (ponte). L'œuf
// est toujours dans le gabarit (caché sans ponte) pour que sa clé change d'une
// nuit à l'autre et déclenche l'animation.
function coopArtRow() {
  const p = state.poulailler;
  if (!p.poules) return '';
  const r = state.report;
  const laid = r && r.nuit === state.day ? r.oeufs : 0;
  return `<span class="card-art-row">${artSvg(['hen'])}${artSvg(['egg'], `egg-art${laid > 0 ? '' : ' art-hidden'}`, `ponte-${laid > 0 ? state.day : 0}`, 'lay')}${laid > 0 ? `<span class="muted">+${laid} œuf${laid > 1 ? 's' : ''} cette nuit</span>` : ''}</span>`;
}

function treeArt(tree) {
  const adult = isTreeAdult(state, tree);
  return artSvg([adult ? `tree-${tree.espece}` : 'tree-young'], 'plot-art', `${tree.id}-${adult ? 'adulte' : 'jeune'}`, 'grow');
}

const REDUCED_MOTION = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const ANIMATIONS = {
  grow: {
    frames: [{ transform: 'scale(0.6)', opacity: 0.3 }, { transform: 'scale(1.08)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }],
    options: { duration: 600, easing: 'ease-out' },
  },
  lay: {
    frames: [{ transform: 'translateY(-12px)', opacity: 0 }, { transform: 'translateY(2px)', opacity: 1, offset: 0.6 }, { transform: 'translateY(0)', opacity: 1 }],
    options: { duration: 700, easing: 'ease-out' },
  },
};

// Animation discrète d'un dessin qui vient de changer ; rien si le joueur a
// demandé moins d'animations (prefers-reduced-motion).
function animateIn(node) {
  if (!node.animate || (REDUCED_MOTION && REDUCED_MOTION.matches)) return;
  const a = ANIMATIONS[node.getAttribute('data-anim')];
  if (a) node.animate(a.frames, a.options);
}

/* ---------- Lot 11 : aide sur chaque bâtiment ---------- */

const listNum = (values, unit) => `${values.map((v) => formatNumber(v)).join(' · ')} ${unit}`;

// Plage d'un facteur de saison : « −30 % à +30 % ».
function seasonRange(kind) {
  const f = Object.values(DATA.SAISONS.MODS).map((m) => m[kind]);
  return `${formatFactor(Math.min(...f))} à ${formatFactor(Math.max(...f))}`;
}

function cropsLine(lieu, what) {
  return plantableCropsFor(state, lieu)
    .map((c) => {
      const d = DATA.crops[c];
      const out = DATA.items[cropProduct(c)];
      return what === 'eau'
        ? `${d.icone} ${d.nom.toLowerCase()} ${formatQty(d.litres)} L`
        : `${d.icone} ${d.nom.toLowerCase()} : ${d.rendement} ${out.nom.toLowerCase()} en ${nightsLabel(d.stades)}`;
    })
    .join(' · ');
}

function stationRecipesLine(id) {
  return stationRecipes(id)
    .map((r) => {
      const def = DATA.recipes[r];
      const ing = def.ingredients.map((i) => `${formatQty(i.qte)} ${ingredientOptions(i).map((it) => DATA.items[it].nom.toLowerCase()).join(' ou ')}`).join(' + ');
      const eau = def.eau ? ` + ${formatQty(def.eau)} L d'eau` : '';
      return `${def.icone} ${def.nom} : ${ing}${eau} (${formatQty(def.temps)} s)`;
    })
    .join(' ; ');
}

function levelsNote(parcelles, nom) {
  return `Parcelles par niveau : ${listNum(parcelles, '')}. L'arrosage, la récolte et le semis automatiques s'acquièrent dans l'Arbre des technologies (branches Eau et Culture) ; ils travaillent la nuit, à 100 %.`;
}

// Rôle, consommation et production de chaque bâtiment, calculés depuis DATA.
const HELP = {
  panneau: () => ({
    nom: 'Panneaux solaires',
    role: 'Transforment le soleil en électricité, rangée dans les batteries. Chaque panneau a son niveau, son usure et son interrupteur.',
    conso: 'Aucune.',
    prod: `${listNum(DATA.GRID.panneau.whParS, 'Wh/s')} selon le niveau, ${seasonRange('solaire')} selon la saison. L'usure en retire jusqu'à ${formatNumber((DATA.WEAR.BREAKDOWN * 100) / DATA.WEAR.EFFICIENCY_DIVISOR)} %. En ce moment : ${formatWhRate(energyStats(state).production)}.`,
    note: `Un panneau de plus coûte ${formatNumber(DATA.PURCHASE.panneau.base)} 💰, +${formatNumber(DATA.PURCHASE.panneau.growth - 100)} % par panneau déjà possédé (arrondi à l'entier supérieur).`,
  }),
  batterie: () => ({
    nom: 'Batteries',
    role: 'Stockent l\'électricité des panneaux. La première batterie disponible se remplit d\'abord ; la dernière remplie se vide d\'abord. Elles ne se déchargent jamais d\'elles-mêmes.',
    conso: 'Aucune : elles alimentent la pompe, le moulin, la presse et le réfrigérateur.',
    prod: `Capacité : ${listNum(DATA.GRID.batterie.wh, 'Wh')} selon le niveau (l'usure réduit la capacité utile). En ce moment : ${formatNumber(Math.floor(energyStats(state).charge / 1000))} / ${formatWh(energyStats(state).capacite)}.`,
    note: `Une batterie de plus coûte ${formatNumber(DATA.PURCHASE.batterie.base)} 💰, +${formatNumber(DATA.PURCHASE.batterie.growth - 100)} % par batterie déjà possédée (arrondi à l'entier supérieur).`,
  }),
  pompe: () => ({
    nom: 'Pompe',
    role: 'Tire l\'eau du puits vers le réservoir, tant qu\'il reste de la place.',
    conso: `${formatNumber(DATA.PUMP.WH_PAR_L)} Wh par litre pompé, soit ${formatWhRate(pumpFlow(state.pompe) * DATA.PUMP.WH_PAR_L)} à plein débit au niveau ${state.pompe.niveau}.`,
    prod: `Débit : ${listNum(DATA.GRID.pompe.litresPerS, 'L/s')} selon le niveau.`,
    note: 'Sans énergie, elle attend ; avec peu d\'énergie, elle pompe au prorata.',
  }),
  reservoir: () => ({
    nom: 'Réservoir',
    role: 'Garde l\'eau pompée pour les arrosages et le pain.',
    conso: 'Aucune.',
    prod: `Capacité : ${listNum(DATA.GRID.pompe.reservoirL, 'L')}, selon le niveau de la pompe.`,
    note: `L'eau d'un arrosage varie avec la saison (${seasonRange('eau')}), sauf dans la Serre.`,
  }),
  potager: () => ({
    nom: DATA.POTAGER.NOM,
    role: `Planter, arroser, récolter : toutes les cultures poussent ici, sur n'importe quelle parcelle. Une plante arrosée gagne un stade chaque nuit ; sans eau, elle attend. La parcelle se libère après la récolte. ${isUnlocked(state, 'champ')
      ? 'Cultures de plein champ : le blé nourrit les poules et donne la farine, le tournesol donne l\'huile, le riz et le houblon servent en cuisine ; un blé sert aussi de graine (comme le riz et le houblon).'
      : `Les cultures de plein champ (blé, riz, houblon) arrivent au chapitre ${unlockChapter('champ')}.`}`,
    conso: `Eau par arrosage : ${cropsLine('potager', 'eau')}.`,
    prod: `${cropsLine('potager', 'recolte')}. Saison : ${seasonRange('potager')}, pour toutes les cultures.`,
    note: levelsNote(DATA.POTAGER.PARCELLES, 'la Zone de culture'),
  }),
  serre: () => ({
    nom: 'Serre',
    role: 'Des légumes toute l\'année, et trois cultures de rente (cacao, vanille, café) qu\'on ne trouve qu\'ici : la Serre ignore les saisons, à l\'eau comme à la récolte.',
    conso: `Eau par arrosage : ${cropsLine('serre', 'eau')}.`,
    prod: `${cropsLine('serre', 'recolte')}. Cacao, vanille et café ne se mangent pas : ils servent à la vente et aux recettes de luxe.`,
    note: `Construction : ${costLabel(DATA.SERRE.CONSTRUCTION)}. Parcelles par niveau : ${listNum(DATA.SERRE.PARCELLES, '')}.`,
  }),
  silo: () => ({
    nom: 'Silo',
    role: 'Stocke le blé récolté ; les poules y mangent d\'abord. Le surplus va dans l\'inventaire.',
    conso: 'Aucune.',
    prod: `Capacité : ${listNum(DATA.SILO.CAPACITE, 'blés')} selon le niveau.`,
    note: '',
  }),
  poulailler: () => ({
    nom: 'Poulailler',
    role: 'Loge les poules, achetées au Marché. Une poule pond toute sa vie, tant qu\'elle est nourrie.',
    conso: `1 blé pour ${DATA.ANIMAUX.poule.poulesParBle} poules nourries (une ration entamée se perd à la fin de la nuit).`,
    prod: `${DATA.ANIMAUX.poule.oeufsParNuit} œuf par nuit et par poule nourrie (${DATA.items.oeuf.energie} énergie).`,
    note: `Poules par niveau : ${listNum(DATA.POULAILLER.CAPACITE, '')}. Avec la Mangeoire à trémie (Arbre des technologies, branche Élevage), les poules sont nourries toutes seules pendant la nuit.`,
  }),
  // 'paturage' : identifiant historique. Le joueur lit « Moutons et vaches » (Étable).
  paturage: () => {
    const M = DATA.ANIMAUX.mouton;
    const V = DATA.ANIMAUX.vache;
    const P = DATA.PATURAGE;
    return {
      nom: 'Moutons et vaches',
      role: `Les moutons et les vaches vivent à l'Étable et s'achètent au Marché. Un mouton prend ${formatPlaces(P.placesParMouton)}, une vache ${formatPlaces(P.placesParVache)}. Une place achetée reste acquise.`,
      conso: `Chaque nuit, ${formatStraw(M.pailleParNuit)} par mouton et ${formatStraw(V.pailleParNuit)} par vache. La paille vient du Moulin : 1 blé moulu donne ${millOutputText()}. Elle ne s'achète pas au Marché.`,
      prod: `Un mouton nourri ${M.joursLaine} nuits donne ${M.laineParTonte} laine (à tondre). Une vache nourrie donne ${V.laitParNuit} lait la nuit même.`,
      note: `Préparer l'Étable pour eux : ${costLabel(P.deblocage)} pour ${formatPlaces(P.placesDepart)} ; ensuite ${formatNumber(P.prixPlace)} 💰 la place, +${formatNumber(P.croissance - 100)} % à chaque achat. S'il n'y a pas assez de paille, les animaux mangent dans l'ordre de la liste (les moutons, puis les vaches). Un animal qui n'a pas mangé ne donne rien cette nuit-là ; il ne lui arrive rien d'autre. La saison ne change rien pour eux.`,
    };
  },
  verger: () => {
    const V = DATA.VERGER;
    const w = orchardWindow();
    return {
      nom: 'Verger',
      role: 'Pommiers et poiriers, achetés au Marché et plantés sur un emplacement libre. Ils restent en place.',
      conso: 'Aucune : pas d\'arrosage.',
      prod: `${V.FRUITS} fruits toutes les ${V.PERIODE} nuits, de la nuit ${w.debut} à la nuit ${w.fin} de l'année, à partir de ${nightsLabel(V.MATURITE)} après la plantation.`,
      note: `Emplacement supplémentaire : ${formatNumber(V.EMPLACEMENT.base)} 💰, +${formatNumber(V.EMPLACEMENT.croissance - 100)} % par emplacement déjà acheté (arrondi à l'entier supérieur).`,
    };
  },
  four: () => ({
    nom: 'Four',
    role: 'Cuit le pain et les plats au four. Une préparation à la fois ; le construire ouvre le Livre de recette.',
    conso: 'Pas d\'électricité.',
    prod: `${stationRecipesLine('four')}.`,
    note: 'Les temps de préparation suivent la productivité de la famille.',
  }),
  cuisine: () => ({
    nom: 'Cuisine',
    role: 'Prépare les plats mijotés. Une préparation à la fois.',
    conso: 'Pas d\'électricité.',
    prod: `${stationRecipesLine('cuisine')}.`,
    note: `Un plat vaut ${formatNumber(DATA.RECETTES.COEF_PLAT)} % de l'énergie de ses ingrédients (arrondi), et chaque plat différent mangé dans la journée donne +${DATA.FAMILY.BONUS_PLATS.PAR_PLAT} de santé (jusqu'à +${DATA.FAMILY.BONUS_PLATS.MAX}). Quatre recettes de luxe (chocolat chaud, café, crème à la vanille, bière artisanale) se vendent 300 % du prix de leurs ingrédients au lieu de ${formatNumber(DATA.RECETTES.COEF_PLAT)} %.`,
  }),
  moulin: () => ({
    nom: 'Moulin',
    role: 'Moud le blé en farine et en paille. Tout se fait dans le Moulin lui-même : tu choisis combien de blés moudre, puis « Moudre ». Appareil électrique : interrupteur, usure, pannes.',
    conso: `${formatNumber(DATA.STATIONS.moulin.whParS)} Wh/s pendant qu'il tourne, et ${formatQty(DATA.recipes.farine.ingredients[0].qte)} blé par mouture (celui de l'inventaire d'abord, puis celui du Silo).`,
    prod: `1 blé donne ${millOutputText()}, en ${formatQty(DATA.recipes.farine.temps)} s. La farine sert au pain et aux tartes ; la paille nourrit les moutons et les vaches.`,
    note: 'Les blés sont moulus un par un. Sans énergie, le Moulin attend. La nuit, le blé en train d\'être moulu se termine ; ceux qui attendent reprennent au réveil. Tu peux reprendre le blé en attente.',
  }),
  presse: () => ({
    nom: 'Presse',
    role: 'Presse les graines de tournesol en huile. Appareil électrique : interrupteur, usure, pannes.',
    conso: `${formatNumber(DATA.STATIONS.presse.whParS)} Wh/s pendant qu'elle tourne.`,
    prod: `${stationRecipesLine('presse')}.`,
    note: 'Sans énergie, la préparation se met en pause.',
  }),
  frigo: () => ({
    nom: 'Réfrigérateur',
    role: 'Les aliments rangés au frais ne vieillissent plus, tant qu\'il est alimenté. Capacité illimitée.',
    conso: `${formatNumber(DATA.FRIGO.BASE_WH_S)} Wh/s + ${formatNumber(DATA.FRIGO.PAR_UNITE_MWH_S)} mWh/s par unité stockée, jour et nuit. Au Dormir, ${DATA.FRIGO.BLOC_NUIT_S} s de consommation sont prélevées d'un coup pour la nuit.`,
    prod: 'Du froid : aucune péremption au frigo.',
    note: `S'il manque de courant plus de ${formatNumber(DATA.FRIGO.SEUIL_ALIMENTE * 100)} % de la journée, ou pendant la nuit, chaque lot perd ${nightsLabel(DATA.FRIGO.PERTE_NUITS)} de conservation.`,
  }),
};

function helpBtn(id) {
  const h = HELP[id]();
  return `<button type="button" class="btn help-btn" data-action="help" data-id="${id}" aria-label="Aide : ${h.nom}">?</button>`;
}

function openHelpModal(id) {
  tel('modal', 'help:' + id);
  if (!HELP[id]) return;
  const h = HELP[id]();
  const sym = id === 'reservoir' ? 'b-reservoir' : `b-${id}`;
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="help-title" data-stop-propagation>
        <div class="help-head">${artSvg([sym])}<h2 id="help-title">${h.nom}</h2></div>
        <ul class="help-list">
          <li><strong>Rôle</strong>${h.role}</li>
          <li><strong>Consommation</strong>${h.conso}</li>
          <li><strong>Production</strong>${h.prod}</li>
          ${h.note ? `<li><strong>Bon à savoir</strong>${h.note}</li>` : ''}
        </ul>
        <button type="button" class="btn primary" data-action="close-modal" id="help-close">Compris</button>
      </div>
    </div>`;
  document.getElementById('help-close').focus();
}

/* ---------- Lot 11 : bulles d'aide de la première partie ---------- */

const TUTO = {
  eau: {
    titre: '💧 L\'eau et le soleil',
    texte: () => `Les panneaux solaires chargent la batterie ; la pompe s'en sert pour remplir le réservoir (${formatNumber(DATA.PUMP.WH_PAR_L)} Wh par litre). Chaque arrosage puise dans le réservoir : son niveau est aussi en haut de l'écran (💧).${stageUsable() ? ' Panneaux, batterie et pompe se trouvent dans la maison : touche-la, puis ouvre « Bâtiments ».' : ''}`,
  },
  potager: {
    titre: '🌱 La zone de culture',
    texte: () => `${stageUsable() ? 'Touche une parcelle vide (le carré de terre sous la barrière) pour planter, puis touche-la encore pour l\'arroser' : 'Touche « Planter » sur une parcelle vide, puis « Arroser »'}. Une plante arrosée gagne un stade chaque nuit : les carottes sont mûres en ${nightsLabel(DATA.crops.carotte.stades)}. ${stageUsable() ? 'Mûre, elle se balance : touche-la pour récolter, puis replante.' : 'Après la récolte, replante.'}`,
  },
  dormir: {
    titre: '😴 Dormir',
    texte: () => `Le bouton « Zzz », en bas à droite, s'active après ${formatNumber(awakeRequired(state))} s d'éveil. À ${DATA.TIME.MEAL_HOUR} h la famille mange ; à ${DATA.TIME.NIGHT_HOUR} h, tout le monde va se coucher. La nuit, les plantes arrosées poussent.`,
  },
};

let tutoShown = null; // bulle affichée au dernier rendu (pour faire défiler vers sa cible)

// Bulle visible maintenant : « dormir » partout, les autres sur la Ferme.
function visibleTutorial() {
  const step = tutorialStep(state);
  if (!step) return null;
  if (step === 'dormir') return step;
  return activeTab === 'ferme' && !ecranFerme ? step : null;
}

// Classe à ajouter à l'élément que la bulle montre.
function tutoTarget(step) {
  return visibleTutorial() === step ? ' tuto-target' : '';
}

function renderTutorial() {
  const root = document.getElementById('tuto-root');
  const step = visibleTutorial();
  document.body.classList.toggle('has-tuto', !!step);
  if (!step) {
    if (root.childElementCount) morph(root, '');
    tutoShown = null;
    return;
  }
  const t = TUTO[step];
  const n = DATA.AIDE.ETAPES.indexOf(step) + 1;
  morph(root, `
    <section class="tuto${step === 'dormir' ? '' : ' up'}" aria-labelledby="tuto-title">
      <h2 id="tuto-title"><span>${t.titre}</span><span class="muted num">${n} / ${DATA.AIDE.ETAPES.length}</span></h2>
      <p>${t.texte()}</p>
      <div class="row">
        <button type="button" class="btn" data-action="tuto-skip">Passer l'aide</button>
        <button type="button" class="btn primary" data-action="tuto-next">${n < DATA.AIDE.ETAPES.length ? 'Compris' : 'J\'ai compris'}</button>
      </div>
    </section>`);
  if (tutoShown !== step) {
    tutoShown = step;
    const target = document.querySelector('.tuto-target');
    // La cible monte en haut de l'écran (sous l'en-tête) : la bulle, en bas, ne la cache pas.
    if (target && step !== 'dormir') target.scrollIntoView({ block: 'start', behavior: REDUCED_MOTION && REDUCED_MOTION.matches ? 'auto' : 'smooth' });
  }
}

/* ---------- Lot 11 : À propos ---------- */

function openAboutModal() {
  tel('modal', 'about');
  const F = DATA.FAMILY;
  const V = F.VARIATION;
  const M = DATA.MARCHE;
  const adultes = F.MEMBRES.filter((m) => !m.enfant).length;
  const enfants = F.MEMBRES.length - adultes;
  const durees = [...Object.values(DATA.CONSERVATION), ...Object.values(DATA.CONSERVATION_CATEGORIE)];
  const H = DATA.HORS_LIGNE;
  const rules = [
    `La famille (${adultes} adultes, ${enfants} enfants) a besoin de ${formatNumber(familyNeed(state))} énergie par jour. Elle mange à chaque nuit, d'abord ce qui périme le plus tôt.`,
    `La journée commence à ${DATA.TIME.DAY_START_HOUR} h ; une heure passe toutes les ${DATA.TIME.CLOCK_SECONDS_PER_HOUR} s. À ${DATA.TIME.MEAL_HOUR} h, la famille prend son repas. Tu peux dormir (bouton « Zzz ») après ${DATA.TIME.MIN_AWAKE_S} s d'éveil au moins ; à ${DATA.TIME.NIGHT_HOUR} h, la journée est finie et la nuit se déroule d'elle-même. L'horloge s'arrête pendant que tu lis le résumé du réveil et quand le jeu est fermé.`,
    `La nuit : repas, puis une plante arrosée gagne un stade, une poule nourrie pond, les moutons et les vaches grossissent et le lait est produit, et les aliments hors frigo vieillissent (ils périment en ${Math.min(...durees)} à ${Math.max(...durees)} nuits).`,
    `Santé : un besoin couvert à 100 % la remonte (${formatSigned(V[0].delta)}), sinon elle baisse (${V.slice(1).map((x) => formatSigned(x.delta)).join(', ')}). Une santé faible ralentit les actions au clic ; les automatisations restent à 100 %. À 0, un soin coûte ${formatNumber(F.SOIN.base)} 💰, +${formatNumber(F.SOIN.croissance - 100)} % par soin déjà payé (arrondi à l'entier supérieur).`,
    `Énergie : panneaux → batteries → pompe, moulin, presse, réfrigérateur. Un appareil en marche s'use d'un point toutes les ${formatNumber(DATA.WEAR.HEURES_PAR_POINT)} heures de jeu ; l'entretenir coûte ${formatNumber(DATA.WEAR.MAINTAIN_RATE)} % de son prix, le réparer après une panne ${formatNumber(DATA.WEAR.REPAIR_RATE)} % (arrondis à l'entier supérieur).`,
    `Marché : prix de vente fixes. Prix d'achat = prix de vente × coefficient, arrondi à l'entier supérieur. Chaque unité achetée ajoute ${formatNumber(M.PAS)} points au coefficient d'achat, chaque unité vendue en retire ${formatNumber(M.PAS)} (plancher ${formatNumber(M.PLANCHER.defaut)} %, graines ${formatNumber(M.PLANCHER.graine)} %).`,
    `Saisons de ${DATA.SAISONS.LONGUEUR} nuits : elles nuancent le solaire, les récoltes, l'eau et les moutons, sans rien bloquer. La Serre les ignore.`,
    `Autonomie = énergie mangée produite par la ferme ÷ ${formatNumber(familyNeed(state))}. ${chapterCount()} chapitres mènent à une famille autonome.`,
    `Arbre des technologies : ${Object.keys(DATA.techtree.noeuds).length} technologies en ${DATA.techtree.branches.length} branches, payées en points de technologie (chapitres terminés, jalons de maîtrise, mode libre) et en pièces. Les automatisations (arrosage, récolte, semis, nourrissage, tonte) et certaines recettes s'y débloquent.`,
    `Absence : jusqu'à ${formatDuration(H.MAX_S)} sont rattrapées au retour (énergie, eau, préparations, réfrigérateur), sans nuit${H.USURE ? '' : ' et sans usure'}. Ce temps compte comme temps d'éveil.`,
  ];
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="about-title" data-stop-propagation>
        <h2 id="about-title">ℹ️ À propos</h2>
        <p class="about-version"><strong>Ferme Familiale</strong> · version ${GAME_VERSION} <span class="muted">(format de sauvegarde ${STATE_VERSION})</span></p>
        <h3>Règles principales</h3>
        <ol class="about-rules">${rules.map((r) => `<li>${r}</li>`).join('')}</ol>
        <h3>Crédits</h3>
        <p class="muted">Graphismes : pack "Farm – 4 Seasons 16x16 Tileset" par antarcticbees — <a href="https://antarcticbees.itch.io/" target="_blank" rel="noopener noreferrer">https://antarcticbees.itch.io/</a></p>
        <p class="muted">Moteur d'affichage : Phaser 3 (licence MIT).</p>
        <p class="muted">Icônes et illustrations des fiches : originales.</p>
        <div class="row">
          <button type="button" class="btn" data-action="open-options">← Options</button>
          <button type="button" class="btn primary" data-action="close-modal" id="about-close">Fermer</button>
        </div>
      </div>
    </div>`;
  document.getElementById('about-close').focus();
}

/* ---------- options (modale) ---------- */

// Contenu de la zone « Aidez-nous à améliorer le jeu ! » : le commentaire part
// avec la session de suivi, donc seulement si le joueur a autorisé le suivi.
function feedbackZoneHtml() {
  const st = Telemetry.status();
  if (st === 'granted' && Telemetry.isActive()) {
    return `<div class="stack">
      <label for="feedback-text" class="muted">Une idée, un problème, un passage trop difficile ? Écrivez-nous. N'indiquez aucune donnée personnelle.</label>
      <textarea id="feedback-text" rows="4" maxlength="1000" placeholder="Votre commentaire"></textarea>
      <div class="row"><button class="btn primary" type="button" data-action="send-feedback">Envoyer</button></div>
    </div>`;
  }
  if (st === 'optout') {
    return '<p class="muted">Votre navigateur demande de ne pas être suivi : l\'envoi de commentaires est indisponible.</p>';
  }
  return '<p class="muted">Votre commentaire est transmis avec la session de suivi anonyme. Pour en envoyer un, autorisez d\'abord le suivi dans la rubrique « Confidentialité » ci-dessous.</p>';
}

function openFeedbackZone() {
  const zone = document.getElementById('feedback-zone');
  if (!zone) return;
  zone.innerHTML = feedbackZoneHtml();
  const area = document.getElementById('feedback-text');
  if (area) area.focus();
}

function sendFeedback() {
  const area = document.getElementById('feedback-text');
  if (!area) return;
  if (testMode) { showToast('Envoi désactivé en mode test.'); return; }
  let result = 'inactive';
  try { result = Telemetry.feedback(area.value); } catch (e) { /* le suivi ne doit jamais gêner le jeu */ }
  if (result === 'ok') {
    const zone = document.getElementById('feedback-zone');
    if (zone) zone.innerHTML = '';
    showToast('Merci pour votre commentaire !');
  } else if (result === 'empty') {
    showToast('Écrivez votre commentaire avant de l\'envoyer.');
  } else if (result === 'limit') {
    showToast('Nombre maximal de commentaires atteint pour cette visite.');
  } else {
    showToast('Commentaire non envoyé : le suivi anonyme n\'est pas activé.');
  }
}

function openOptionsModal() {
  tel('modal', 'options');
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="options-title" data-stop-propagation>
        <button class="btn modal-close" type="button" data-action="close-modal">Fermer</button>
        <h2 id="options-title">⚙️ Options</h2>
        <p class="muted about-version">Ferme Familiale · version ${GAME_VERSION}</p>
        <div class="stack">
          <div class="stack">
            <strong>À propos</strong>
            <div class="row">
              <button class="btn" type="button" data-action="open-about">ℹ️ Règles principales et version</button>
            </div>
          </div>
          <div class="stack">
            <strong>Exporter la sauvegarde</strong>
            <textarea id="export-area" rows="4" readonly></textarea>
            <div class="row">
              <button class="btn" type="button" data-action="do-export">Générer</button>
              <button class="btn" type="button" data-action="copy-export">Copier</button>
            </div>
          </div>
          <div class="stack">
            <strong>Importer une sauvegarde</strong>
            <textarea id="import-area" rows="4" placeholder="Coller le texte exporté ici"></textarea>
            <div class="row">
              <button class="btn" type="button" data-action="do-import">Importer</button>
            </div>
          </div>
          <div class="stack">
            <strong>Nouvelle partie</strong>
            <div class="row" id="new-game-zone">
              <button class="btn danger" type="button" data-action="ask-new-game">Recommencer à zéro</button>
            </div>
          </div>
          <div class="stack">
            <strong>Votre avis</strong>
            <div class="row">
              <button class="btn" type="button" data-action="open-feedback">💬 Aidez-nous à améliorer le jeu !</button>
            </div>
            <div id="feedback-zone"></div>
          </div>
          ${privacySectionHtml()}
          <div class="stack">
            <strong>Mode test</strong>
            <label class="row check-row">
              <input type="checkbox" id="test-mode-toggle" ${testMode ? 'checked' : ''}>
              Activer le panneau de mode test
            </label>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('export-area').addEventListener('click', (e) => e.target.select());
}

function closeModal() {
  // Lot 9 : fermer l'écran de fin de chapitre (bouton ou fond) l'acquitte.
  const chapterShown = document.getElementById('chapter-modal');
  document.getElementById('modal-root').innerHTML = '';
  if (chapterShown) {
    acknowledgeChapter(state);
    refresh();
  }
}

/* ---------- Lot 11 : notifications légères ---------- */

// Pile de notifications en bas de l'écran (au plus NOTIFY_MAX), annoncées aux
// lecteurs d'écran (#toast-root est une région aria-live). Une notification
// identique à une notification affichée la remplace au lieu de s'empiler.
const NOTIFY_MAX = 3;
const NOTIFY_MS = { info: 2600, alerte: 5000, repas: 5000, lettre: 7000 };
// Une même alerte n'est pas répétée avant ce délai (batteries qui se vident et
// se rechargent au fil des ticks, par exemple).
const ALERT_REPEAT_MS = 30000;
const lastAlertAt = new Map();
let alertState = null; // dernière photo des alertes (voir alertSnapshot)
// Juste après un rattrapage hors-ligne, l'écran d'absence fait le bilan : les
// alertes des toutes premières secondes (frigo qui s'arrête sur un reste de
// charge, par exemple) seraient redondantes.
const ALERT_MUTE_AFTER_CATCH_UP_MS = 3000;
let alertMuteUntil = 0;

// `cible` (voir cibleAlerte) : la notification devient un bouton qui mène au menu concerné.
function notify(message, kind = 'info', cible = null) {
  const root = document.getElementById('toast-root');
  for (const el of Array.from(root.children)) {
    if (el.dataset.msg === message) el.remove();
  }
  const el = document.createElement(cible ? 'button' : 'div');
  el.className = `toast ${kind}${cible ? ' toast-link' : ''}`;
  el.dataset.msg = message;
  el.textContent = message;
  if (cible) {
    el.type = 'button';
    el.dataset.action = 'aller';
    if (cible.page) el.dataset.page = cible.page;
    if (cible.ecran) el.dataset.screen = cible.ecran;
    if (cible.fenetre) el.dataset.window = cible.fenetre;
    if (cible.onglet || cible.sous) el.dataset.tab = cible.onglet || cible.sous;
    if (cible.ancre) el.dataset.anchor = cible.ancre;
    el.insertAdjacentHTML('beforeend', '<span class="toast-go" aria-hidden="true"> ›</span>');
    el.addEventListener('click', () => setTimeout(() => el.remove(), 0));
  }
  root.appendChild(el);
  while (root.children.length > NOTIFY_MAX) root.firstElementChild.remove();
  setTimeout(() => el.remove(), NOTIFY_MS[kind] || NOTIFY_MS.info);
}

function showToast(message) {
  notify(message, 'info');
}

function alertMessage(ev) {
  const d = ev.id ? findDevice(state, ev.id) : null;
  const name = d ? deviceName(d) : '';
  switch (ev.type) {
    case 'panne': return `⛔ ${name} en panne : il faut le réparer.`;
    case 'entretien': return `⚠️ ${name} : usure à ${formatNumber(DATA.WEAR.SERVICE_THRESHOLD)} %, pense à l'entretenir.`;
    case 'batteriesVides': return '🔋 Batteries vides : la pompe et les ateliers attendent le soleil.';
    case 'frigoCoupe': return '🧊 Réfrigérateur hors tension : il manque d\'énergie.';
    case 'pailleManque': return `${DATA.items[DATA.PATURAGE.nourriture].icone} Il manque de la paille pour les animaux cette nuit : mouds du blé au Moulin.`;
    default: return '';
  }
}

// Compare la situation à la précédente et annonce ce qui vient d'arriver.
function watchAlerts() {
  const now = alertSnapshot(state);
  if (alertState && Date.now() >= alertMuteUntil) {
    const t = Date.now();
    for (const ev of alertEvents(alertState, now)) {
      const msg = alertMessage(ev);
      if (!msg || t - (lastAlertAt.get(msg) || 0) < ALERT_REPEAT_MS) continue;
      lastAlertAt.set(msg, t);
      notify(msg, 'alerte', cibleAlerte(ev.type, ev.id));
      tel('alert', ev.type);
    }
  }
  alertState = now;
}

/* ---------- registre des actions (délégation d'événements) ---------- */

// Chaque valeur de data-action a sa fonction : (target, e, action) => { … }, où
// target est l'élément qui porte data-action. Un écran déclare les siennes avec
// registerActions({ … }) ; l'unique écouteur de clics de la page les appelle.
// Une action déclarée deux fois est une erreur (le second écran masquerait le premier).
const ACTIONS = {};

function registerActions(handlers) {
  for (const [name, fn] of Object.entries(handlers)) {
    if (ACTIONS[name]) throw new Error(`Action déclarée deux fois : ${name}`);
    ACTIONS[name] = fn;
  }
}

// Plusieurs actions, une même fonction (elle reçoit le nom de l'action en 3e argument).
function sameHandler(names, fn) {
  return Object.fromEntries(names.map((name) => [name, fn]));
}

registerActions({
  'consent-accept': () => {
    applyConsent('granted');
    if (document.getElementById('options-title')) openOptionsModal();
  },
  'consent-refuse': () => {
    applyConsent('denied');
    if (document.getElementById('options-title')) openOptionsModal();
  },
  'open-options': () => {
    openOptionsModal();
  },
  'open-about': () => {
    openAboutModal();
  },
  'open-feedback': () => {
    openFeedbackZone();
  },
  'send-feedback': () => {
    sendFeedback();
  },
  'help': (target) => {
    openHelpModal(target.dataset.id);
  },
  // ----- version 1.1 : Moulin (mouture par quantité) -----
  ...sameHandler(['mill-dec', 'mill-inc', 'mill-max'], (target, e, action) => {
    millQty = action === 'mill-max' ? Math.floor(wheatTotal(state) + EPS) : millQuantity() + (action === 'mill-inc' ? 1 : -1);
    refresh();
  }),
  'mill-start': () => {
    const result = applyResult(startMilling(state, millQuantity()));
    if (result.ok) {
      syncJobs();
      millQty = 1;
      showToast(`⚙️ ${formatNumber(result.quantite)} blé${result.quantite > 1 ? 's' : ''} au Moulin`);
      refresh();
    }
  },
  'mill-cancel': () => {
    const result = applyResult(cancelMilling(state));
    if (result.ok) showToast(`🌾 ${formatNumber(result.rendu)} blé${result.rendu > 1 ? 's' : ''} repris`);
  },
  // ----- version 1.1 : prénom et apparence d'un membre de la famille -----
  'member-edit': (target) => {
    openMemberModal(target.dataset.id);
  },
  'member-genre': (target) => {
    if (memberDraft) memberDraft.genre = target.dataset.genre;
    syncMemberModal();
  },
  'member-teint': (target) => {
    if (memberDraft) memberDraft.teint = Number(target.dataset.teint);
    syncMemberModal();
  },
  'member-save': () => {
    saveMemberModal();
  },
  // ----- version 1.2 : composition de la famille, animaux de compagnie -----
  'member-add': (target) => {
    const enfant = target.dataset.age === 'enfant';
    const result = applyResult(addMember(state, enfant));
    if (result.ok) {
      persistState();
      showToast(`👋 Un ${enfant ? 'enfant' : 'adulte'} rejoint la famille. Besoin : ${formatNumber(result.besoin)} énergie par jour.`);
      openMemberModal(result.id); // tout de suite : son prénom et son apparence
    }
  },
  'member-remove': () => {
    removeMemberFromModal();
  },
  'pet-add': (target) => {
    const result = applyResult(addPet(state, target.dataset.espece));
    if (result.ok) {
      persistState();
      openPetModal(result.id); // tout de suite : son nom
    }
  },
  'pet-edit': (target) => {
    openPetModal(target.dataset.id);
  },
  'pet-espece': (target) => {
    if (petDraft) petDraft.espece = target.dataset.espece;
    syncPetModal();
  },
  'pet-save': () => {
    savePetModal();
  },
  'pet-remove': () => {
    removePetFromModal();
  },
  // ----- version 1.3 : courrier -----
  'mail-open': (target) => {
    openMailModal(target.dataset.id);
  },
  'test-straw': () => {
    applyResult(testAddStraw(state));
  },
  'tuto-next': () => {
    applyResult(advanceTutorial(state));
  },
  'tuto-skip': () => {
    applyResult(skipTutorial(state));
  },
  'close-modal': (target, e) => {
    if (e.target === target) closeModal();
  },
  'wake-more': (target) => {
    const detail = document.getElementById('wake-detail');
    if (!detail) return;
    const open = detail.hidden; // hidden = replié : on ouvre
    detail.hidden = !open;
    target.setAttribute('aria-expanded', String(open));
    target.textContent = open ? 'Voir moins' : 'Voir plus';
  },
  'stage-open': (target) => {
    openStageWindow(target.dataset.window);
  },
  'stage-close': () => {
    closeStageWindow();
  },
  'maison-tab': (target) => {
    maisonTab = target.dataset.tab;
    renderStageWindow();
    refresh();
  },
  'stage-goto': (target) => {
    allerAuLieu(target.dataset.window, target.dataset.tab, target.dataset.anchor);
  },
  'aller': (target) => {
    closeModal();
    allerA(cibleDe(target.dataset));
  },
  'stage-pan': (target) => {
    stagePanToScreen(target.dataset.ecran);
  },
  'switch-tab': (target) => {
    if (FERME_LINKS.includes(target.dataset.tab) && stageUsable()) {
      allerAuLieu('maison', target.dataset.tab);
      return;
    }
    activeTab = target.dataset.tab;
    stageWindow = null;
    stageReturn = null;
    ecranFerme = null;
    telView();
    refresh();
  },
  'open-screen': (target) => {
    stageReturn = stageWindow;
    stageWindow = null;
    ecranFerme = target.dataset.screen;
    telView();
    refresh();
  },
  'close-screen': () => {
    ecranFerme = null;
    stageWindow = stageReturn;
    stageReturn = null;
    telView();
    refresh();
  },
  'toggle': (target) => {
    applyResult(toggleDevice(state, target.dataset.id));
  },
  'upgrade': (target) => {
    applyResult(upgradeDevice(state, target.dataset.id));
  },
  'maintain': (target) => {
    applyResult(maintainDevice(state, target.dataset.id));
  },
  'repair': (target) => {
    applyResult(repairDevice(state, target.dataset.id));
  },
  'buy': (target) => {
    applyResult(buyDevice(state, target.dataset.type));
  },
  'sleep': () => {
    actionSleep();
  },
  'plant-open': (target) => {
    openPlantModal(target.dataset.id);
  },
  'plant': (target) => {
    closeModal();
    applyResult(plant(state, target.dataset.id, target.dataset.crop));
  },
  'water': (target) => {
    applyResult(water(state, target.dataset.id));
  },
  'bolt': (target) => {
    applyResult(toggleBolting(state, target.dataset.id));
  },
  'harvest': (target) => {
    const result = applyResult(harvest(state, target.dataset.id));
    if (result.ok) showToast(harvestToast(result));
  },
  'upgrade-potager': () => {
    applyResult(upgradePotager(state));
  },
  'build-silo': () => {
    applyResult(buildSilo(state));
  },
  'upgrade-silo': () => {
    applyResult(upgradeSilo(state));
  },
  'build-poulailler': () => {
    applyResult(buildPoulailler(state));
  },
  'upgrade-poulailler': () => {
    applyResult(upgradePoulailler(state));
  },
  'feed-hen': () => {
    const result = applyResult(feedHen(state));
    if (result.ok) showToast(result.compte ? '🌾 Une poule nourrie (1 blé pour 2 poules)' : 'Le geste n\'a pas compté (santé faible) : le blé est conservé, réessaie.');
  },
  'feed-all': () => {
    const result = applyResult(feedAllHens(state));
    if (result.ok) {
      showToast(
        result.ratees > 0
          ? `${result.nourries} poule${result.nourries > 1 ? 's' : ''} nourrie${result.nourries > 1 ? 's' : ''}, ${result.ratees} geste${result.ratees > 1 ? 's' : ''} sans effet (santé faible) : réessaie.`
          : `${result.nourries} poule${result.nourries > 1 ? 's' : ''} nourrie${result.nourries > 1 ? 's' : ''}.`
      );
    }
  },
  'buy-animal': (target) => {
    const kind = target.dataset.kind;
    const result = applyResult(buyAnimals(state, kind, animalQuantity(kind)));
    if (result.ok) {
      animalQuantities[kind] = 1;
      showToast(`Acheté : ${result.bought} ${DATA.ANIMAUX[kind].icone} (−${formatCoins(result.cost)} 💰)`);
      refresh();
    }
  },
  ...sameHandler(['animal-dec', 'animal-inc', 'animal-max'], (target, e, action) => {
    const kind = target.dataset.kind;
    animalQuantities[kind] = action === 'animal-max' ? Math.min(BUY_MAX, animalBuyMax(state, kind)) : animalQuantity(kind) + (action === 'animal-inc' ? 1 : -1);
    refresh();
  }),
  'build-paturage': () => {
    const result = applyResult(buildPaturage(state));
    if (result.ok) showToast(`🐑 L'Étable est prête pour les moutons et les vaches : ${formatPlaces(result.places)} (−${formatCoins(result.cost)} 💰)`);
  },
  'buy-pasture': () => {
    const result = applyResult(buyPasture(state));
    if (result.ok) showToast(`Place achetée : ${formatPlaces(result.places)} au total (−${formatCoins(result.cost)} 💰)`);
  },
  'shear': (target) => {
    const result = applyResult(shear(state, target.dataset.id));
    if (result.ok) showToast(`✂️ Tonte : +${result.laine} 🧶`);
  },
  'buy-tech': (target) => {
    const id = target.dataset.id;
    const result = applyResult(buyTech(state, id));
    if (result.ok) showToast(`${DATA.techtree.noeuds[id].icone} ${DATA.techtree.noeuds[id].nom} acquis (−${formatNumber(result.pt)} PT, −${formatCoins(result.cost)} 💰)`);
  },
  'water-all': (target) => {
    const result = applyResult(waterAll(state, target.dataset.lieu));
    if (result.ok) showToast(`💧 ${plural(result.arrosees, 'parcelle')} arrosée${result.arrosees > 1 ? 's' : ''}${result.sansEau ? ` · ${result.sansEau} sans eau` : ''}`);
  },
  'harvest-all': (target) => {
    const result = applyResult(harvestAll(state, target.dataset.lieu));
    if (result.ok) showToast(`🧺 ${itemsSummary(result.items)}`);
  },
  'cancel-queued': (target) => {
    applyResult(cancelQueued(state, target.dataset.station, Number(target.dataset.index)));
  },
  'routine-toggle': (target) => {
    applyResult(setRoutine(state, target.checked));
  },
  'test-tech-points': () => {
    applyResult(testAddTechPoints(state, 10));
  },
  'semis-open': (target) => {
    openSemisModal(target.dataset.id);
  },
  'semis-set': (target) => {
    closeModal();
    applyResult(setSemis(state, target.dataset.id, target.dataset.mode, target.dataset.crop));
  },
  'test-level5': () => {
    const result = applyResult(testSetBuildingLevel5(state, document.getElementById('test-building').value));
    if (result.ok) showToast('Bâtiment au niveau 5.');
  },
  'test-techs': () => {
    applyResult(testUnlockAllTechs(state));
  },
  'build-serre': () => {
    const result = applyResult(buildSerre(state));
    if (result.ok) showToast(`🏡 Serre construite : ${state.serre.parcelles.length} parcelles (−${formatCoins(result.cost)} 💰)`);
  },
  'upgrade-serre': () => {
    applyResult(upgradeSerre(state));
  },
  'build-verger': () => {
    const result = applyResult(buildVerger(state));
    if (result.ok) showToast(`🌳 Verger aménagé : ${state.verger.places} emplacements`);
  },
  'buy-orchard-slot': () => {
    const result = applyResult(buyOrchardSlot(state));
    if (result.ok) showToast(`Emplacement acheté : ${result.places} au total (−${formatCoins(result.cost)} 💰)`);
  },
  'buy-tree': (target) => {
    const espece = target.dataset.species;
    const result = applyResult(buyTree(state, espece));
    if (result.ok) showToast(`${DATA.items[DATA.VERGER.ARBRES[espece].fruit].icone} ${DATA.VERGER.ARBRES[espece].nom} planté (−${formatCoins(result.cost)} 💰)`);
  },
  'build-fridge': () => {
    const result = applyResult(buildFridge(state));
    if (result.ok) showToast(`🧊 Réfrigérateur construit (−${formatCoins(result.cost)} 💰)`);
  },
  ...sameHandler(['fridge-in', 'fridge-out'], (target, e, action) => {
    const item = target.dataset.item;
    const all = target.dataset.qty === 'all';
    const qty = all ? (action === 'fridge-in' ? countItem(state, item) : fridgeCount(state, item)) : Number(target.dataset.qty);
    const result = applyResult(action === 'fridge-in' ? moveToFridge(state, item, qty) : moveFromFridge(state, item, qty));
    if (result.ok) showToast(`${action === 'fridge-in' ? '🧊 Rangé' : 'Sorti'} : ${result.moved} ${DATA.items[item].icone}`);
  }),
  'test-next-season': () => {
    const result = applyResult(testNextSeason(state));
    showToast(`Saison : ${DATA.SAISONS.INFOS[result.saison].icone} ${DATA.SAISONS.INFOS[result.saison].nom} (nuit ${state.day})`);
  },
  'test-serre': () => {
    applyResult(testBuildSerre(state));
  },
  'test-verger': () => {
    applyResult(testBuildVerger(state));
  },
  'test-fridge': () => {
    applyResult(testBuildFridge(state));
  },
  'test-empty-batteries': () => {
    applyResult(testEmptyBatteries(state));
  },
  'test-sheep': () => {
    applyResult(testAddSheep(state));
  },
  'test-wool': () => {
    applyResult(testWoolReady(state));
  },
  'test-cows': () => {
    applyResult(testAddCows(state));
  },
  'build-station': (target) => {
    const id = target.dataset.station;
    const result = applyResult(buildStation(state, id));
    if (result.ok) {
      const def = DATA.STATIONS[id];
      showToast(`${def.icone} ${def.nom} construit${def.article === 'la' ? 'e' : ''} (−${formatCoins(result.cost)} 💰)${def.debloque ? ' · onglet Livre de recette débloqué !' : ''}`);
    }
  },
  'start-recipe': (target) => {
    const id = target.dataset.recipe;
    const result = applyResult(startRecipe(state, id));
    if (result.ok) {
      syncJobs();
      showToast(`${DATA.recipes[id].icone} ${DATA.recipes[id].nom} : préparation lancée`);
    }
  },
  'test-stations': () => {
    applyResult(testBuildStations(state));
  },
  'test-flour': () => {
    applyResult(testAddFlour(state));
  },
  'test-oil': () => {
    applyResult(testAddOil(state));
  },
  'test-eggs': () => {
    applyResult(testAddEggs(state));
  },
  'test-wear-mill': () => {
    applyResult(testWearMill(state));
  },
  'test-wheat': () => {
    applyResult(testAddWheat(state));
  },
  'test-hens': () => {
    applyResult(testAddHens(state));
  },
  'heal': (target) => {
    applyResult(heal(state, target.dataset.id));
  },
  ...sameHandler(['reserve-inc', 'reserve-dec'], (target, e, action) => {
    const item = target.dataset.item;
    const now = state.famille.reserve[item] || 0;
    applyResult(setSeedReserve(state, item, now + (action === 'reserve-inc' ? 1 : -1)));
  }),
  'inv-tab': (target) => {
    invTab = target.dataset.tab;
    refresh();
  },
  'comptoir-tab': (target) => {
    comptoirTab = target.dataset.tab;
    refresh();
  },
  'buy-item': (target) => {
    const item = target.dataset.item;
    const result = applyResult(buyItem(state, item, buyQuantity(item)));
    if (result.ok) {
      buyQuantities[item] = 1;
      showToast(`Acheté : ${result.bought} ${DATA.items[item].icone} (−${formatCoins(result.cost)} 💰)`);
      refresh();
    }
  },
  ...sameHandler(['buy-dec', 'buy-inc', 'buy-max'], (target, e, action) => {
    const item = target.dataset.item;
    buyQuantities[item] = action === 'buy-max' ? buyQuote(state, item, BUY_MAX).quantite : buyQuantity(item) + (action === 'buy-inc' ? 1 : -1);
    refresh();
  }),
  ...sameHandler(['sell-dec', 'sell-inc', 'sell-max'], (target, e, action) => {
    const item = target.dataset.item;
    const now = sellQuantity(item);
    sellQuantities[item] = action === 'sell-max' ? sellableStock(item) : now + (action === 'sell-inc' ? 1 : -1);
    refresh();
  }),
  'sell-item': (target) => {
    const item = target.dataset.item;
    const result = applyResult(sellItem(state, item, sellQuantity(item)));
    if (result.ok) showToast(`Vendu : ${result.sold} ${DATA.items[item].icone} (+${formatCoins(result.gain)} 💰)`);
  },
  'test-food': () => {
    applyResult(testAddFood(state));
  },
  'test-age': () => {
    const result = applyResult(testAgeInventory(state));
    const lost = itemsSummary(result.perdus);
    showToast(lost ? `Périmés : ${lost}` : 'Rien n\'a péri.');
  },
  'test-seeds': () => {
    applyResult(testAddSeeds(state));
  },
  'test-ripen': () => {
    applyResult(testRipenAll(state));
  },
  'test-sick': () => {
    applyResult(testSetHealthZero(state));
  },
  'test-add-100': () => {
    applyResult(testAddPieces(state, 100));
  },
  'test-add-1000': () => {
    applyResult(testAddPieces(state, 1000));
  },
  'test-add-panel': () => {
    applyResult(testAddDevice(state, 'panneau'));
  },
  'test-add-battery': () => {
    applyResult(testAddDevice(state, 'batterie'));
  },
  'test-fill-batteries': () => {
    applyResult(testFillBatteries(state));
  },
  'test-fill-tank': () => {
    applyResult(testFillTank(state));
  },
  'test-wear': () => {
    applyResult(testSetWear(state, document.getElementById('test-device').value, DATA.WEAR.BREAKDOWN));
  },
  'test-skip-awake': () => {
    applyResult(testSkipAwake(state));
  },
  'ack-chapter': () => {
    closeModal();
  },
  'test-complete-chapter': () => {
    const result = applyResult(testCompleteChapter(state));
    if (result.ok) showToast(result.fini ? '🏆 Campagne terminée' : `Chapitre ${result.chapitre} atteint`);
  },
  'test-goto-chapter': () => {
    const result = applyResult(testGoToChapter(state, document.getElementById('test-chapter').value));
    if (result.ok) showToast(result.fini ? '🏆 Mode libre : tout est débloqué' : `Chapitre ${result.chapitre}, compteurs remis à zéro`);
  },
  'test-simulate': () => {
    actionTestSimulate();
  },
  'test-nights-1': () => {
    actionTestNights(1);
  },
  'test-nights-5': () => {
    actionTestNights(5);
  },
  'do-export': () => {
    const area = document.getElementById('export-area');
    area.value = exportSaveText();
  },
  'copy-export': () => {
    const area = document.getElementById('export-area');
    if (!area.value) area.value = exportSaveText();
    copyFromTextarea(area);
  },
  'do-import': () => {
    const area = document.getElementById('import-area');
    const ok = importSaveText(area.value);
    showToast(ok ? 'Sauvegarde importée.' : 'Texte invalide, import annulé.');
    if (ok) {
      ecranFerme = null;
      closeModal();
      refresh();
    }
  },
  // Confirmation dans la page (et non confirm()) : certains navigateurs et
  // aperçus bloquent les boîtes de dialogue natives sans rien signaler.
  'ask-new-game': () => {
    document.getElementById('new-game-zone').innerHTML = `
    <p class="alert">Toute la progression actuelle sera perdue.</p>
    <div class="row">
      <button class="btn danger" type="button" data-action="do-new-game">Oui, tout effacer</button>
      <button class="btn" type="button" data-action="cancel-new-game">Annuler</button>
    </div>`;
  },
  'cancel-new-game': () => {
    document.getElementById('new-game-zone').innerHTML =
    '<button class="btn danger" type="button" data-action="ask-new-game">Recommencer à zéro</button>';
  },
  'do-new-game': () => {
    actionNewGame();
    closeModal();
    showToast('Nouvelle partie lancée.');
  },
});

document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) {
    if (!testMode && e.target && e.target.closest && !e.target.closest('#consent-banner')) tel('deadClick', e.target);
    return;
  }
  const action = target.dataset.action;
  telClick(target, action);

  const run = ACTIONS[action];
  if (run) run(target, e, action);
});

document.addEventListener('change', (e) => {
  if (e.target && e.target.id === 'test-mode-toggle') {
    testMode = e.target.checked;
    scheduleRender();
  }
});

// Lot 11 : Échap ferme la fenêtre ouverte (comme le bouton Fermer) ; d'abord celle de
// #modal-root, puis la fenêtre de la carte.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (document.getElementById('modal-root').childElementCount > 0) {
    e.preventDefault();
    closeModal();
  } else if (stageWindow) {
    e.preventDefault();
    closeStageWindow();
  }
});

document.getElementById('modal-root').addEventListener('click', (e) => {
  // ferme la modale si on clique sur le fond, pas sur son contenu
  if (e.target.dataset.action === 'close-modal' && e.target.classList.contains('modal-backdrop')) {
    closeModal();
  }
});

/* ---------- démarrage ---------- */

state = loadOrCreateState();
telChapter = state.campagne ? state.campagne.chapitre : null;
syncJobs();
mailSeen = new Set(mailbox(state).map((l) => l.id)); // les lettres déjà là ne sont pas réannoncées
alertState = alertSnapshot(state);
catchUp(); // Lot 11 : le temps passé page fermée depuis la dernière sauvegarde

// Lot 9 : les chapitres proposés par le mode test viennent de DATA.
document.getElementById('test-chapter').innerHTML =
  DATA.CHAPITRES.liste.map((ch, i) => `<option value="${i + 1}">${i + 1} · ${ch.titre}</option>`).join('') +
  `<option value="${chapterCount() + 1}">Mode libre (fin)</option>`;

setInterval(persistState, AUTOSAVE_MS);
window.addEventListener('beforeunload', persistState);
window.addEventListener('pagehide', persistState);
document.addEventListener('visibilitychange', onHide);

requestAnimationFrame(frame);
requestAnimationFrame(renderLoop);
render();

// Suivi de session : démarre seulement si le joueur a déjà accepté ; sinon on le lui demande.
try {
  if (Telemetry.init({ version: GAME_VERSION }) === 'unknown') showConsentBanner();
  telView();
} catch (e) { /* le suivi ne doit jamais empêcher de jouer */ }
