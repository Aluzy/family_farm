import { GAME_VERSION } from '../engine/base.js';
import { godMode, setEcranFerme, testMode } from './store.js';
import { privacySectionHtml, tel } from './consent.js';
import { copyFromTextarea, exportSaveText, importSaveText } from './storage.js';
import { morph, refresh } from './render.js';
import { openAboutModal } from './aide.js';
import { notify } from './toasts.js';
import { registerActions } from './actions.js';
import { closeModal, openModal } from './modal.js';

/* ---------- options (modale) ---------- */

// Contenu de la zone « Aide-nous à améliorer le jeu ! » : le commentaire part
// avec la session de suivi, donc seulement si le joueur a autorisé le suivi.
function feedbackZoneHtml() {
  const st = Telemetry.status();
  if (st === 'granted' && Telemetry.isActive()) {
    return `<div class="stack">
      <label for="feedback-text" class="muted">Une idée, un problème, un passage trop difficile ? Écris-nous. N'indique aucune donnée personnelle.</label>
      <textarea id="feedback-text" rows="4" maxlength="1000" placeholder="Ton commentaire"></textarea>
      <div class="row"><button class="btn primary" type="button" data-action="send-feedback">Envoyer</button></div>
    </div>`;
  }
  if (st === 'optout') {
    return '<p class="muted">Ton navigateur demande de ne pas être suivi : l\'envoi de commentaires est indisponible.</p>';
  }
  return '<p class="muted">Ton commentaire est transmis avec la session de suivi anonyme. Pour en envoyer un, autorise d\'abord le suivi dans la rubrique « Confidentialité » ci-dessous.</p>';
}

function openFeedbackZone() {
  const zone = document.getElementById('feedback-zone');
  if (!zone) return;
  morph(zone, feedbackZoneHtml());
  const area = document.getElementById('feedback-text');
  if (area) area.focus();
}

function sendFeedback() {
  const area = document.getElementById('feedback-text');
  if (!area) return;
  if (testMode) { notify('Envoi désactivé en mode test.'); return; }
  let result = 'inactive';
  try { result = Telemetry.feedback(area.value); } catch (e) { /* le suivi ne doit jamais gêner le jeu */ }
  if (result === 'ok') {
    const zone = document.getElementById('feedback-zone');
    if (zone) morph(zone, '');
    notify('Merci pour ton commentaire !');
  } else if (result === 'empty') {
    notify('Écris ton commentaire avant de l\'envoyer.');
  } else if (result === 'limit') {
    notify('Nombre maximal de commentaires atteint pour cette visite.');
  } else {
    notify('Commentaire non envoyé : le suivi anonyme n\'est pas activé.');
  }
}

// « Recommencer à zéro », puis sa confirmation dans la page (et non confirm() : certains
// navigateurs et aperçus bloquent les boîtes de dialogue natives sans rien signaler).
function newGameZoneHtml(confirmer = false) {
  return confirmer
    ? `<p class="alert">Toute la progression actuelle sera perdue.</p>
    <div class="row">
      <button class="btn danger" type="button" data-action="do-new-game">Oui, tout effacer</button>
      <button class="btn" type="button" data-action="cancel-new-game">Annuler</button>
    </div>`
    : '<button class="btn danger-outline" type="button" data-action="ask-new-game">Recommencer à zéro</button>';
}

export function openOptionsModal() {
  tel('modal', 'options');
  openModal(`
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
      <details class="more">
        <summary>💾 Sauvegarde</summary>
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
      </details>
      <div class="stack">
        <strong>Ton avis</strong>
        <div class="row">
          <button class="btn" type="button" data-action="open-feedback">💬 Aide-nous à améliorer le jeu !</button>
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
        <label class="row check-row">
          <input type="checkbox" id="god-mode-toggle" ${godMode ? 'checked' : ''}>
          God mode : aller d'une carte à l'autre sans le personnage
        </label>
      </div>
      <div class="stack">
        <strong>Nouvelle partie</strong>
        <div class="row" id="new-game-zone">${newGameZoneHtml()}</div>
      </div>
    </div>`, { labelledBy: 'options-title' });
  // FLU-38 : sauvegarde repliée, « Recommencer à zéro » en bas, en contour rouge
  document.getElementById('export-area').addEventListener('click', (e) => e.target.select());
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'open-about': () => {
    openAboutModal();
  },
  'open-feedback': () => {
    openFeedbackZone();
  },
  'send-feedback': () => {
    sendFeedback();
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
    notify(ok ? 'Sauvegarde importée.' : 'Texte invalide, import annulé.');
    if (ok) {
      setEcranFerme(null);
      closeModal();
      refresh();
    }
  },
  'ask-new-game': () => {
    morph(document.getElementById('new-game-zone'), newGameZoneHtml(true));
  },
  'cancel-new-game': () => {
    morph(document.getElementById('new-game-zone'), newGameZoneHtml());
  },
});
