import { nightActive } from '../engine/clock.js';
import { buyTool, chopTree, hasTool, OUTILS, selectTool, toolDef } from '../engine/outils.js';
import { axeMode, hoeMode, setAxeMode, setHoeMode, state } from './store.js';
import { applyResult } from './game-actions.js';
import { refresh } from './render.js';
import { showToast } from './toasts.js';
import { ACTIONS, registerActions } from './actions.js';
import { closeModal } from './common.js';
import { persistState } from './storage.js';
import { closeStageWindow, stageInterior, stageWindow } from './stage-windows.js';

/* ---------- la barre d'outils, en bas de la carte ---------- */

// Une case par outil (OUTILS, dans l'ordre de la barre), qui montre l'outil une fois acheté.
// Un appui prend l'outil en main ; un second appui sur l'outil en main le range. La barre se
// range comme le menu : sa languette, au-dessus d'elle, la fait glisser hors de l'écran.
export let toolbarOpen = true;

// Ce que fait un appui avec un outil qui n'a encore rien à faire sur la ferme.
const EN_MAIN = {
  pioche: 'il n\'y a encore rien à casser sur la ferme',
  canne: 'il n\'y a encore rien à pêcher sur la ferme',
};

// Le dessin de la barre (le modèle, en pixels de la planche) : # le bois (la bordure des
// fenêtres), o une case (le fond des fenêtres), g le clou doré. U : la taille d'un pixel.
const BARRE = [
  '........####################################....',
  '.......###ooooo####ooooo####ooooo####ooooo###...',
  '......###ooooooo##ooooooo##ooooooo##ooooooo###..',
  '.....####ooooooo##ooooooo##ooooooo##ooooooo####.',
  '....##g##ooooooo##ooooooo##ooooooo##ooooooo##g##',
  '.....####ooooooo##ooooooo##ooooooo##ooooooo####.',
  '......###ooooooo##ooooooo##ooooooo##ooooooo###..',
  '.......###ooooo####ooooo####ooooo####ooooo###...',
  '........####################################....',
];
const BARRE_COULEURS = { '#': '#8a5a34', o: '#fae8c4', g: '#d9a066' };
const CASE_EN_MAIN = '#ffd98a';            // la case de l'outil en main
const CASE = { x: 9, y: 1, w: 7, h: 7, pas: 9 };     // la case k : x + k × pas
const BORD = 4;                            // les colonnes vides à gauche du dessin

// Le dessin, en rectangles d'un pixel de haut (le bois par morceaux, les cases pixel par
// pixel) ; la case `active` (son rang) plus claire.
function barreSvg(active) {
  const rects = [];
  BARRE.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const c = row[x];
      let n = 1;
      while (x + n < row.length && row[x + n] === c) n++;
      if (c === 'o') {
        for (let i = x; i < x + n; i++) {
          const k = Math.floor((i - CASE.x) / CASE.pas);
          rects.push(`<rect x="${i}" y="${y}" width="1" height="1" fill="${k === active ? CASE_EN_MAIN : BARRE_COULEURS.o}"/>`);
        }
      } else if (c !== '.') {
        rects.push(`<rect x="${x}" y="${y}" width="${n}" height="1" fill="${BARRE_COULEURS[c]}"/>`);
      }
      x += n;
    }
  });
  return `<svg class="tool-bar-art" viewBox="${BORD} 0 ${BARRE[0].length - BORD} ${BARRE.length}" aria-hidden="true" shape-rendering="crispEdges">${rects.join('')}</svg>`;
}

// Triangle de la languette (5 × 3 pixels), pointé vers le bas (barre ouverte : le sens où
// elle se range) ; retourné quand la barre est rangée.
const BARRE_FLECHE = '<svg class="tool-bar-arrow" viewBox="0 0 5 3" width="15" height="9" aria-hidden="true" shape-rendering="crispEdges">' +
  '<rect x="0" y="0" width="5" height="1"/><rect x="1" y="1" width="3" height="1"/><rect x="2" y="2" width="1" height="1"/></svg>';

// L'outil en main (la houe ou la hache), ou null.
function enMain() {
  if (hoeMode) return 'houe';
  if (axeMode) return 'hache';
  return null;
}

// La barre d'outils de la carte, ou '' : sur la carte de la ferme, sans fenêtre ouverte,
// dès qu'un outil est acheté.
export function toolBarHtml() {
  if (!OUTILS.some((id) => hasTool(state, id))) return '';
  const main = enMain();
  const active = main ? OUTILS.indexOf(main) : -1;
  const cases = OUTILS.map((id, k) => {
    const def = toolDef(id);
    const style = `style="--x:${CASE.x - BORD + k * CASE.pas}"`;
    if (!hasTool(state, id)) {
      return `<span class="tool-slot vide" ${style} title="${def.NOM} : au Marché" aria-hidden="true"></span>`;
    }
    const tenu = id === main;
    const label = tenu ? `${def.NOM} en main : la ranger` : `Prendre : ${def.NOM}`;
    return `<button type="button" class="tool-slot${tenu ? ' active' : ''}" ${style} data-action="tool-use" data-outil="${id}" aria-pressed="${tenu}" aria-label="${label}" title="${label}">${def.ICONE}</button>`;
  }).join('');
  const tab = `<button type="button" class="tool-bar-tab" data-action="toolbar-toggle" aria-expanded="${toolbarOpen}" aria-label="${toolbarOpen ? 'Ranger la barre d\'outils' : 'Sortir la barre d\'outils'}" title="Outils">${BARRE_FLECHE}</button>`;
  return tab + `<div class="tool-bar-body" role="toolbar" aria-label="Outils"${toolbarOpen ? '' : ' inert'}>${barreSvg(active)}${cases}</div>`;
}

function useTool(id) {
  const def = toolDef(id);
  if (!hasTool(state, id)) return;
  if (enMain() === id) {                     // l'outil en main : le ranger
    if (id === 'houe') ACTIONS['hoe-toggle']();
    else { setAxeMode(false); refresh(); }
    return;
  }
  if (id === 'houe' || id === 'hache') {
    if (nightActive(state)) { showToast('🌙 La famille dort : attends le matin, ou passe la nuit (Zzz).'); return; }
  }
  applyResult(selectTool(state, id));
  if (id !== 'houe' && hoeMode) setHoeMode(false);
  if (id !== 'hache' && axeMode) setAxeMode(false);
  if (id === 'houe') {
    ACTIONS['hoe-toggle']();
    return;
  }
  if (id === 'hache') {
    setAxeMode(true);
    showToast(`${def.ICONE} Hache en main : touche un arbre de la carte pour le couper.`);
    if (stageWindow) closeStageWindow();
    else refresh();
    return;
  }
  refresh();
  showToast(`${def.ICONE} ${def.NOM} : ${EN_MAIN[id]}.`);
}

const DATA_ICONE = (id) => toolDef(id).ICONE;

// La puce « Hache en main » de la carte : la toucher range la hache.
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
  'buy-tool': (target) => {
    const id = target.dataset.outil;
    const r = applyResult(buyTool(state, id));
    if (!r.ok) return;
    // achetée depuis sa fiche du Marché : la fiche se ferme (un outil ne s'achète qu'une fois)
    if (document.querySelector('#modal-root .shop-modal')) closeModal();
    const def = toolDef(id);
    showToast(`${def.ICONE} ${def.NOM} achetée : elle est dans la barre d'outils, en bas de la carte.`);
  },
});
