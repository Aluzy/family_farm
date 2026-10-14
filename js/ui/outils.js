import { nightActive } from '../engine/clock.js';
import { buyTool, chopTree, hasTool, OUTILS, selectedTool, selectTool, toolDef } from '../engine/outils.js';
import { formatCoins } from '../engine/format.js';
import { axeMode, hoeMode, setAxeMode, setHoeMode, state } from './store.js';
import { applyResult } from './game-actions.js';
import { refresh } from './render.js';
import { showToast } from './toasts.js';
import { ACTIONS, registerActions } from './actions.js';
import { artHtml } from './pixel-art.js';
import { tel } from './consent.js';
import { closeModal } from './common.js';
import { persistState } from './storage.js';
import { closeStageWindow, stageInterior, stageWindow } from './stage-windows.js';

/* ---------- les outils : le bouton rond de la carte et la fenêtre Outils ---------- */

// Un appui sur le bouton rond sert l'outil choisi (la houe : la prendre en main) ; deux appuis
// rapprochés ouvrent la fenêtre Outils, qui change l'outil du bouton. Comme sur la carte
// (farm-stage.js), l'appui simple attend DOUBLE_TAP_MS de voir si un second suit.
const DOUBLE_TAP_MS = 300;
let fabTimer = null;

// Le dessin du bouton rond de chaque outil (assets/art.png).
const BOUTONS = { houe: 'hoe-btn', hache: 'axe-btn', pioche: 'pick-btn' };

// Ce que fait un appui avec la pioche : rien à casser pour l'instant.
const EN_MAIN = {
  pioche: 'il n\'y a encore rien à casser sur la ferme',
};

// Le bouton rond de l'outil choisi (à gauche du bouton Dormir), ou '' sans outil.
export function toolFabHtml() {
  const id = selectedTool(state);
  if (!id) return '';
  const def = toolDef(id);
  const action = id === 'houe' ? 'Prendre la houe' : `${def.NOM} (outil choisi)`;
  const label = `${action}. Double appui : changer d'outil`;
  return `<button type="button" class="hoe-fab tool-fab" data-action="tool-fab" data-outil="${id}" aria-label="${label}" title="${label}">${artHtml(BOUTONS[id], 'hoe-art')}</button>`;
}

function useSelectedTool() {
  const id = selectedTool(state);
  if (!id) return;
  if (id === 'houe') {
    // la même action que l'ancien bouton « Prendre la houe » (bloquée la nuit, comme elle)
    if (nightActive(state)) showToast('🌙 La famille dort : attends le matin, ou passe la nuit (Zzz).');
    else ACTIONS['hoe-toggle']();
    return;
  }
  if (id === 'hache') {
    if (nightActive(state)) { showToast('🌙 La famille dort : attends le matin, ou passe la nuit (Zzz).'); return; }
    setAxeMode(!axeMode);
    if (axeMode) showToast(`${DATA_ICONE('hache')} Hache en main : touche un arbre de la carte pour le couper.`);
    if (axeMode && stageWindow) closeStageWindow();
    else refresh();
    return;
  }
  const def = toolDef(id);
  showToast(`${def.ICONE} ${def.NOM} en main : ${EN_MAIN[id]}. Double appui sur le bouton pour changer d'outil.`);
}

const DATA_ICONE = (id) => toolDef(id).ICONE;

// La puce « Hache en main » de la carte (à la place du bouton rond) : la toucher range la hache.
export function axeChipHtml() {
  if (!axeMode || !hasTool(state, 'hache') || stageInterior) return '';
  return `<button type="button" class="stage-chip hoe axe" data-action="axe-toggle" aria-pressed="true" aria-label="Hache en main : touche un arbre pour le couper. Ranger la hache" title="Touche un arbre de la carte pour le couper"><span class="stage-chip-pill"><span aria-hidden="true">${DATA_ICONE('hache')}</span><span class="stage-chip-text">Hache</span><span class="stage-chip-val num">🪵</span><span class="stage-chip-go" aria-hidden="true">✕</span></span></button>`;
}

// La carte (farm-stage.js) : la hache en main, le joueur a touché l'arbre `id`. Le bois entre
// dans l'inventaire tout de suite ; la carte montre ensuite le personnage qui coupe. Renvoie
// ce qu'il a coupé ({ bois: n }), ou null (la nuit, sans énergie, arbre épuisé : un message).
export function chopFromStage(id) {
  if (nightActive(state)) { showToast('🌙 La famille dort : attends le matin, ou passe la nuit (Zzz).'); return null; }
  const r = chopTree(state, id);
  if (!r.ok) { showToast(r.error); return null; }
  persistState();
  refresh();
  return { bois: r.bois };
}

function toolRow(id) {
  const def = toolDef(id);
  const owned = hasTool(state, id);
  const choisi = owned && selectedTool(state) === id;
  if (owned) {
    return `<button type="button" class="tool-choice${choisi ? ' active' : ''}" data-action="tool-select" data-outil="${id}" aria-pressed="${choisi}">` +
      `<span class="tool-choice-icon" aria-hidden="true">${artHtml(BOUTONS[id], 'tool-choice-art')}</span>` +
      `<span class="tool-choice-text"><strong>${def.NOM}</strong><small>${choisi ? 'Sur le bouton' : 'Choisir'}</small></span></button>`;
  }
  return `<div class="tool-choice off">` +
    `<span class="tool-choice-icon" aria-hidden="true">${artHtml(BOUTONS[id], 'tool-choice-art')}</span>` +
    `<span class="tool-choice-text"><strong>${def.NOM}</strong><small>Au Marché : ${formatCoins(def.PRIX)} 💰</small></span></div>`;
}

function openToolsModal() {
  tel('modal', 'outils');
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal bois item-modal tools-modal" role="dialog" aria-modal="true" aria-labelledby="tools-title" data-stop-propagation>
        <h2 id="tools-title"><span aria-hidden="true">🧰</span> Outils</h2>
        <p class="muted">L'outil choisi va sur le bouton rond de la carte.</p>
        <div class="tool-choices">${OUTILS.map(toolRow).join('')}</div>
        <div class="row"><button type="button" class="btn" data-action="close-modal">Fermer</button></div>
      </div>
    </div>`;
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'tool-fab': () => {
    if (fabTimer) {
      clearTimeout(fabTimer);
      fabTimer = null;
      openToolsModal();
      return;
    }
    fabTimer = setTimeout(() => {
      fabTimer = null;
      useSelectedTool();
    }, DOUBLE_TAP_MS);
  },
  'axe-toggle': () => {
    setAxeMode(false);
    refresh();
  },
  'tool-select': (target) => {
    const id = target.dataset.outil;
    const r = applyResult(selectTool(state, id));
    if (!r.ok) return;
    if (id !== 'houe' && hoeMode) setHoeMode(false);
    if (id !== 'hache' && axeMode) setAxeMode(false);
    closeModal();
    refresh();
    const def = toolDef(id);
    showToast(`${def.ICONE} ${def.NOM} sur le bouton rond.`);
  },
  'buy-tool': (target) => {
    const id = target.dataset.outil;
    const r = applyResult(buyTool(state, id));
    if (!r.ok) return;
    // achetée depuis sa fiche du Marché : la fiche se ferme (un outil ne s'achète qu'une fois)
    if (document.querySelector('#modal-root .shop-modal')) closeModal();
    const def = toolDef(id);
    showToast(`${def.ICONE} ${def.NOM} achetée : double appui sur le bouton rond de la carte pour changer d'outil.`);
  },
});
