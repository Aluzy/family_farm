import { DATA } from '../engine/catalog.js';
import { isMature } from '../engine/crops.js';
import { isTreeAdult } from '../engine/orchard.js';
import { state } from './store.js';

/* ---------- Lot 11 : illustrations et animations ---------- */

// Dessin décoratif : un <svg> qui empile des symboles du sprite. `key` identifie
// ce qu'il montre (une plante à un stade) : quand la clé change, morph remplace
// le dessin et l'anime (`anim` : 'grow' pour la pousse, 'lay' pour la ponte).
export function artSvg(symbols, cls = '', key = '', anim = '') {
  const uses = symbols.map((id) => `<use href="#${id}"/>`).join('');
  return `<svg class="art${cls ? ' ' + cls : ''}" viewBox="0 0 48 48" aria-hidden="true" focusable="false"${key ? ` data-key="${key}"` : ''}${anim ? ` data-anim="${anim}"` : ''}>${uses}</svg>`;
}

// Petite icône de bâtiment, devant un titre.
export function icon(id) {
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

export function plotArt(p) {
  const sym = plotSymbol(p);
  return artSvg(sym ? ['plot-soil', sym] : ['plot-soil'], 'plot-art', `${p.culture || 'vide'}-${sym || 'terre'}`, 'grow');
}

// Poulailler : une poule, et l'œuf de la nuit qui tombe au réveil (ponte). L'œuf
// est toujours dans le gabarit (caché sans ponte) pour que sa clé change d'une
// nuit à l'autre et déclenche l'animation.
export function coopArtRow() {
  const p = state.poulailler;
  if (!p.poules) return '';
  const r = state.report;
  const laid = r && r.nuit === state.day ? r.oeufs : 0;
  return `<span class="card-art-row">${artSvg(['hen'])}${artSvg(['egg'], `egg-art${laid > 0 ? '' : ' art-hidden'}`, `ponte-${laid > 0 ? state.day : 0}`, 'lay')}${laid > 0 ? `<span class="muted">+${laid} œuf${laid > 1 ? 's' : ''} cette nuit</span>` : ''}</span>`;
}

export function treeArt(tree) {
  const adult = isTreeAdult(state, tree);
  return artSvg([adult ? `tree-${tree.espece}` : 'tree-young'], 'plot-art', `${tree.id}-${adult ? 'adulte' : 'jeune'}`, 'grow');
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
