import { asleep } from '../engine/night.js';
import { SOMMEIL_MESSAGE } from './actions.js';
import { buyTool, castLine, chopTree, hasTool, mineRock, OUTILS, ramasserMorceau, selectTool, toolDef } from '../engine/outils.js';
import { axeMode, hoeMode, pickMode, rodMode, setAxeMode, setHoeMode, setPickMode, setRodMode, state } from './store.js';
import { applyResult } from './game-actions.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';
import { ACTIONS, registerActions } from './actions.js';
import { persistState } from './storage.js';
import { closeStageWindow, stageInterior, stageWindow } from './stage-windows.js';
import { closeModal } from './modal.js';
import { buildSlotHtml } from './chantier.js';
import { setBuildMode } from './store.js';

/* ---------- la barre d'outils, en bas de la carte ---------- */

// Une case par outil (OUTILS, dans l'ordre de la barre), qui montre l'outil une fois acheté.
// Un appui prend l'outil en main ; un second appui sur l'outil en main le range. La barre se
// range comme le menu : sa languette, au-dessus d'elle, la fait glisser hors de l'écran.
export let toolbarOpen = true;

// Triangle de la languette (5 × 3 pixels), pointé vers le bas (barre ouverte : le sens où
// elle se range) ; retourné quand la barre est rangée.
const BARRE_FLECHE = '<svg class="tool-bar-arrow" viewBox="0 0 5 3" width="20" height="12" aria-hidden="true" shape-rendering="crispEdges">' +
  '<rect x="0" y="0" width="5" height="1"/><rect x="1" y="1" width="3" height="1"/><rect x="2" y="2" width="1" height="1"/></svg>';

// L'outil en main (la houe, la hache ou la pioche), ou null.
function enMain() {
  if (hoeMode) return 'houe';
  if (axeMode) return 'hache';
  if (pickMode) return 'pioche';
  if (rodMode) return 'canne';
  return null;
}

// La barre d'outils de la carte, ou '' : sur la carte de la ferme, sans fenêtre ouverte,
// dès qu'un outil est acheté.
export function toolBarHtml() {
  const bati = buildSlotHtml();             // la ferme générée : le mode Construire (js/ui/chantier.js)
  if (!OUTILS.some((id) => hasTool(state, id)) && !bati) return '';
  const main = enMain();
  const cases = OUTILS.map((id) => {
    const def = toolDef(id);
    if (!hasTool(state, id)) {
      return `<span class="tool-slot vide" title="${def.NOM} : au Marché" aria-hidden="true"></span>`;
    }
    const tenu = id === main;
    const label = tenu ? `${def.NOM} en main : la ranger` : `Prendre : ${def.NOM}`;
    return `<button type="button" class="tool-slot${tenu ? ' active' : ''}" data-action="tool-use" data-outil="${id}" aria-pressed="${tenu}" aria-label="${label}" title="${label}">${def.ICONE}</button>`;
  }).join('') + bati;
  const tab = `<button type="button" class="tool-bar-tab" data-action="toolbar-toggle" aria-expanded="${toolbarOpen}" aria-label="${toolbarOpen ? 'Ranger la barre d\'outils' : 'Sortir la barre d\'outils'}" title="Outils">${BARRE_FLECHE}</button>`;
  return tab + `<div class="tool-bar-body" role="toolbar" aria-label="Outils"${toolbarOpen ? '' : ' inert'}>${cases}</div>`;
}

function useTool(id) {
  const def = toolDef(id);
  if (!hasTool(state, id)) return;
  if (enMain() === id) {                     // l'outil en main : le ranger
    if (id === 'houe') ACTIONS['hoe-toggle']();
    else { setAxeMode(false); setPickMode(false); setRodMode(false); refresh(); }
    return;
  }
  if (id === 'houe' || id === 'hache' || id === 'pioche' || id === 'canne') {
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
  }
  setBuildMode(null);
  applyResult(selectTool(state, id));
  if (id !== 'houe' && hoeMode) setHoeMode(false);
  if (id !== 'hache' && axeMode) setAxeMode(false);
  if (id !== 'pioche' && pickMode) setPickMode(false);
  if (id !== 'canne' && rodMode) setRodMode(false);
  if (id === 'houe') {
    ACTIONS['hoe-toggle']();
    return;
  }
  if (id === 'hache') {
    setAxeMode(true);
    notify(`${def.ICONE} Hache en main : touche un arbre de la carte pour le couper.`);
    if (stageWindow) closeStageWindow();
    else refresh();
    return;
  }
  if (id === 'pioche') {
    setPickMode(true);
    notify(`${def.ICONE} Pioche en main : touche un rocher de la carte pour le casser.`);
    if (stageWindow) closeStageWindow();
    else refresh();
    return;
  }
  setRodMode(true);
  notify(`${def.ICONE} Canne à pêche en main : touche l'eau de l'étang ou de la mare pour y pêcher.`);
  if (stageWindow) closeStageWindow();
  else refresh();
}

const DATA_ICONE = (id) => toolDef(id).ICONE;

// La puce « Hache en main » de la carte : la toucher range la hache.
export function axeChipHtml() {
  if (!axeMode || !hasTool(state, 'hache') || stageInterior) return '';
  return `<button type="button" class="stage-chip hoe axe" data-action="axe-toggle" aria-pressed="true" aria-label="Hache en main : touche un arbre pour le couper. Ranger la hache" title="Touche un arbre de la carte pour le couper"><span class="stage-chip-pill"><span aria-hidden="true">${DATA_ICONE('hache')}</span><span class="stage-chip-text">Hache</span><span class="stage-chip-val num">🪵</span><span class="stage-chip-go" aria-hidden="true">✕</span></span></button>`;
}

// La puce « Pioche en main » de la carte : la toucher range la pioche.
export function pickChipHtml() {
  if (!pickMode || !hasTool(state, 'pioche') || stageInterior) return '';
  return `<button type="button" class="stage-chip hoe axe" data-action="pick-toggle" aria-pressed="true" aria-label="Pioche en main : touche un rocher pour le casser. Ranger la pioche" title="Touche un rocher de la carte pour le casser"><span class="stage-chip-pill"><span aria-hidden="true">${DATA_ICONE('pioche')}</span><span class="stage-chip-text">Pioche</span><span class="stage-chip-val num">🪨</span><span class="stage-chip-go" aria-hidden="true">✕</span></span></button>`;
}

// La puce « Canne à pêche en main » de la carte : la toucher range la canne.
export function rodChipHtml() {
  if (!rodMode || !hasTool(state, 'canne') || stageInterior) return '';
  return `<button type="button" class="stage-chip hoe axe" data-action="rod-toggle" aria-pressed="true" aria-label="Canne à pêche en main : touche l'eau pour pêcher. Ranger la canne" title="Touche l'eau de l'étang ou de la mare pour y pêcher"><span class="stage-chip-pill"><span aria-hidden="true">${DATA_ICONE('canne')}</span><span class="stage-chip-text">Pêche</span><span class="stage-chip-val num">🐟‍🌈</span><span class="stage-chip-go" aria-hidden="true">✕</span></span></button>`;
}

// La carte (farm-stage.js, ou une autre : FermeHote.couper) : la hache en main, le joueur a
// touché l'arbre `id`. Le coup compte tout de suite ; son bois tombe au sol, aux points que la
// carte donne (`ou` : { carte, coup, fin }, voir chopTree) ; la carte montre ensuite le
// personnage qui coupe, et les morceaux. Renvoie { bois, tombe, morceaux: { coup, fin } } (tombe :
// ce coup abat l'arbre), ou null (il dort, sans énergie : un message).
export function chopFromStage(id, ou) {
  if (asleep(state)) { notify(SOMMEIL_MESSAGE); return null; }
  const r = chopTree(state, id, ou);
  if (!r.ok) { notify(r.error); return null; }
  persistState();
  refresh();
  return { bois: r.bois, tombe: r.tombe, morceaux: r.morceaux };
}

// La carte : la pioche en main, le joueur a touché le rocher `id`. Comme chopFromStage : la
// pierre tombe au sol. Renvoie { casse, morceaux } (casse : ce coup brise le rocher), ou null.
export function mineFromStage(id, ou) {
  if (asleep(state)) { notify(SOMMEIL_MESSAGE); return null; }
  const r = mineRock(state, id, ou);
  if (!r.ok) { notify(r.error); return null; }
  persistState();
  refresh();
  return { items: { pierre: r.pierre }, casse: r.casse, morceaux: r.morceaux };
}

// La carte : le personnage a marché sur le morceau `n` (bois, pierre) : dans l'inventaire.
// Renvoie { ok, item, n } ou null (il dort, ou le morceau n'est plus là).
export function morceauFromStage(n) {
  if (asleep(state)) return null;
  const r = ramasserMorceau(state, n);
  if (!r.ok) return null;
  persistState();
  refresh();
  return r;
}

// La carte : la canne en main, le joueur a touché l'eau `eau` (« etang » ou « mare »). La
// prise (s'il y en a une) entre dans l'inventaire tout de suite ; la carte montre ensuite le
// personnage qui lance, attend la touche et ferre. Renvoie { poisson } (null : rien n'a
// mordu), ou null (un message : il dort, sans énergie, le poisson se fait rare).
export function fishFromStage(eau) {
  if (asleep(state)) { notify(SOMMEIL_MESSAGE); return null; }
  const r = castLine(state, eau);
  if (!r.ok) { notify(r.error); return null; }
  persistState();
  refresh();
  return { poisson: r.poisson };
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'tool-use': (target) => {
    useTool(target.dataset.outil);
  },
  'toolbar-toggle': () => {
    toolbarOpen = !toolbarOpen;
    refresh();
  },
  'axe-toggle': () => {
    setAxeMode(false);
    refresh();
  },
  'pick-toggle': () => {
    setPickMode(false);
    refresh();
  },
  'rod-toggle': () => {
    setRodMode(false);
    refresh();
  },
  'buy-tool': (target) => {
    const id = target.dataset.outil;
    const r = applyResult(buyTool(state, id));
    if (!r.ok) return;
    // achetée depuis sa fiche du Marché : la fiche se ferme (un outil ne s'achète qu'une fois)
    if (document.querySelector('#modal-root .shop-modal')) closeModal();
    const def = toolDef(id);
    notify(`${def.ICONE} ${def.NOM} achetée : elle est dans la barre d'outils, en bas de la carte.`);
  },
});
