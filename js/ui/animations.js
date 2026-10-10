import { artHtml } from './pixel-art.js';
import { treeStage } from '../engine/orchard.js';
import { state } from './store.js';

/* ---------- Lot 11 : illustrations et animations ---------- */

// Dessin en pixel art (assets/art.png, voir pixel-art.js). `key` identifie ce qu'il
// montre : quand la clé change, morph remplace le dessin et l'anime (`anim` : 'grow' pour
// la pousse, 'lay' pour la ponte). `symbols` : liste de noms, seul le dernier est dessiné.
export function artPx(symbols, cls = '', key = '', anim = '') {
  return artHtml(symbols[symbols.length - 1], cls, key, anim);
}

// Petite icône de bâtiment, devant un titre.
export function icon(id) {
  return artHtml(`b-${id}`, 'art-icon');
}

// Poulailler : une poule, et l'œuf de la nuit qui tombe au réveil (ponte). L'œuf
// est toujours dans le gabarit (caché sans ponte) pour que sa clé change d'une
// nuit à l'autre et déclenche l'animation.
export function coopArtRow() {
  const p = state.poulailler;
  if (!p.poules) return '';
  const r = state.report;
  const laid = r && r.nuit === state.day ? r.oeufs : 0;
  return `<span class="card-art-row">${artPx(['hen'])}${artPx(['egg'], `egg-art${laid > 0 ? '' : ' art-hidden'}`, `ponte-${laid > 0 ? state.day : 0}`, 'lay')}${laid > 0 ? `<span class="muted">+${laid} œuf${laid > 1 ? 's' : ''} cette nuit</span>` : ''}</span>`;
}

// Version 1.13 : le dessin suit le stade (jeune arbre, arbuste, arbre, arbre en fruits).
export function treeArt(tree) {
  const st = treeStage(state, tree);
  const art = st === 0 ? 'tree-young' : st < 3 ? 'tree-adult' : `tree-${tree.espece}`;
  return artPx([art], `plot-art${st === 1 ? ' tree-small' : ''}`, `${tree.id}-${st}`, 'grow');
}

export const REDUCED_MOTION = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
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
export function animateIn(node) {
  if (!node.animate || (REDUCED_MOTION && REDUCED_MOTION.matches)) return;
  const a = ANIMATIONS[node.getAttribute('data-anim')];
  if (a) node.animate(a.frames, a.options);
}
