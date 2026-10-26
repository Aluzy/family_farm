import { GAME_VERSION } from '../engine/base.js';
import { godMode, setEcranFerme, state, testMode } from './store.js';
import { boussoleMontree, montrerBoussole } from '../engine/monde-vu.js';
import { persistState } from './storage.js';
import { privacySectionHtml, tel } from './consent.js';
import { copyFromTextarea, exportSaveText, importSaveText } from './storage.js';
import { morph, refresh } from './render.js';
import { openAboutModal } from './aide.js';
import { notify } from './toasts.js';
import { registerActions } from './actions.js';
import { closeModal, openModal } from './modal.js';
import { sonHtml } from './son.js';

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

// Fiche 9a : la qualité de l'affichage des cartes (un réglage de l'appareil, pas de la partie :
// CarteKit.qualite, js/carte/kit.js). « Auto » : économie sur un téléphone, normale sur un ordinateur.
const QUALITES = [
  ['auto', 'Auto'],
  ['economie', 'Économie'],
  ['normale', 'Normale'],
];
function qualiteHtml() {
  const K = window.CarteKit;
  if (!K || !K.qualite) return '';
  const choisie = K.qualiteChoisie(), vue = K.qualite();
  return `<div class="stack qualite-choix" role="radiogroup" aria-labelledby="qualite-titre">
    <span id="qualite-titre">🖼️ Qualité de l'affichage</span>
    <div class="row">${QUALITES.map(([id, nom]) => `<label class="row check-row"><input type="radio" name="qualite" value="${id}" ${id === choisie ? 'checked' : ''}> ${nom}</label>`).join('')}</div>
    <p class="muted" id="qualite-note">${qualiteNote(choisie, vue)}</p>
  </div>`;
}
function qualiteNote(choisie, vue) {
  const en = vue === 'economie' ? 'économie' : 'normale';
  return `${choisie === 'auto' ? `Ici : ${en}. ` : ''}L'économie dessine l'image un peu moins fine, le brouillard et la nuit en plus gros points, la mer sans ses vagues d'écume, pour rester fluide sur un téléphone. La partie n'en dépend pas.`;
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
      ${sonHtml()}
      <div class="stack">
        <strong>Affichage</strong>
        ${qualiteHtml()}
        ${state && state.monde ? `<label class="row check-row">
          <input type="checkbox" id="boussole-toggle" ${boussoleMontree(state) ? 'checked' : ''}>
          🧭 Montrer la boussole sur la carte (elle mène à la ferme, ou au lieu choisi sur la carte du monde)
        </label>` : ''}
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

document.addEventListener('change', (e) => {
  if (!e.target || e.target.name !== 'qualite' || !window.CarteKit) return;
  const vue = window.CarteKit.reglerQualite(e.target.value);
  const note = document.getElementById('qualite-note');
  if (note) note.textContent = qualiteNote(e.target.value, vue);
});

// Fiche 8 : la boussole se montre ou non (state.monde.boussole, js/engine/monde-vu.js).
document.addEventListener('change', (e) => {
  if (!e.target || e.target.id !== 'boussole-toggle') return;
  montrerBoussole(state, e.target.checked);
  persistState();
  refresh();
});

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
