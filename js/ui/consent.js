import { energyLevel } from '../engine/stamina.js';
import { lastAutonomy } from '../engine/campaign.js';
import { ecouterJournal } from '../engine/journal.js';
import { etapeDidacticiel } from '../engine/didacticiel.js';
import { activeTab, ecranFerme, state, testMode } from './store.js';
import { openOptionsModal } from './options.js';
import { registerActions } from './actions.js';

/* ---------- suivi de session (consentement requis, voir cookies.html) ---------- */

// Le mode test n'est jamais mesuré, et un échec du suivi ne doit jamais gêner le jeu.
export function tel(method, ...args) {
  if (testMode) return;
  try { Telemetry[method](...args); } catch (e) { /* le suivi ne doit jamais faire planter le jeu */ }
}

export function telClick(target, action) {
  if (testMode || action.startsWith('test-') || action.startsWith('consent-')) return;
  const d = target.dataset;
  const detail = [d.crop, d.type, d.id, d.tab, d.screen].filter(Boolean).join('/');
  tel('click', action, detail);
}

export function telView() { tel('tab', activeTab, ecranFerme); }

// Le jour de jeu en cours (au chargement, à chaque réveil) : le temps réel passé s'y ajoute.
export function telDay() { tel('day', state.day); }

// Les gestes du personnage, notés par le moteur (js/engine/journal.js) : par jour de jeu.
ecouterJournal((type, donnees) => tel('game', type, donnees));

let telChapter = null; // dernier chapitre vu, pour repérer les passages de chapitre
export function setTelChapter(value) {
  telChapter = value;
  return value;
}

export function telNight(awakeSeconds) {
  const chap = state.campagne ? state.campagne.chapitre : null;
  const membres = state.famille ? state.famille.membres : [];
  const p = state.progression || {};
  tel('night', {
    day: state.day, chapter: chap, autonomy: lastAutonomy(state),
    pieces: state.pieces, energy: energyLevel(state), awake: awakeSeconds,
    level: p.niveau, xp: p.xp, adults: membres.filter((m) => !m.enfant).length, children: membres.filter((m) => m.enfant).length,
    wild: true, meal: state.nuit && Number.isFinite(state.nuit.couverture) ? state.nuit.couverture : null,
    tuto: etapeDidacticiel(state),
  });
  if (telChapter !== null && typeof chap === 'number' && chap > telChapter) tel('chapter', chap, state.day);
  telChapter = typeof chap === 'number' ? chap : telChapter;
}

/* ---------- choix sur les traceurs : bandeau et Options ---------- */

export function showConsentBanner() {
  if (document.getElementById('consent-banner')) return;
  const el = document.createElement('div');
  el.id = 'consent-banner';
  el.className = 'consent-banner';
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', 'Choix sur le suivi de votre visite');
  el.innerHTML = `
    <p><strong>Nous aider à améliorer le jeu ?</strong> Avec votre accord, il note anonymement les boutons utilisés, les écrans vus, ce que fait votre personnage et votre progression d’une visite à l’autre. Votre partie est sauvegardée quel que soit votre choix.
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
  if (choice === 'granted' && before !== 'granted') { telView(); telDay(); }
}

export function privacySectionHtml() {
  const st = Telemetry.status();
  const sid = Telemetry.sessionId();
  let body;
  if (st === 'optout') {
    body = '<p class="muted">Votre navigateur demande de ne pas être suivi (Global Privacy Control ou Do Not Track) : aucun suivi n\'est activé.</p>';
  } else if (st === 'granted') {
    body = `<p class="muted">Suivi anonyme de la visite : <strong>activé</strong>.${sid ? ` Numéro de session, à indiquer pour demander l'effacement de vos données : <code>${sid}</code>` : ''}${Telemetry.playerId() ? ` Numéro de joueur : <code>${Telemetry.playerId()}</code>` : ''}</p>
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

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'consent-accept': () => {
    applyConsent('granted');
    if (document.getElementById('options-title')) openOptionsModal();
  },
  'consent-refuse': () => {
    applyConsent('denied');
    if (document.getElementById('options-title')) openOptionsModal();
  },
});
