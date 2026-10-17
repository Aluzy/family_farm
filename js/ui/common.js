import { DATA } from '../engine/catalog.js';
import { EPS } from '../engine/base.js';
import { formatCoins } from '../engine/format.js';
import { state } from './store.js';

export function costLabel(cost) {
  return cost === 0 ? 'gratuit' : `${formatCoins(cost)} 💰`;
}

export function canPay(cost) {
  return state.pieces + EPS >= cost;
}

/* ---------- accords et listes d'objets ---------- */

// Le mot accordé au nombre n : au pluriel au-delà de 1 (« 1 blé », « 1,5 blés »).
// accord(n, 'arrosée') : « arrosée » ou « arrosées » ; accord(n, 'périt', 'périssent').
export function accord(n, mot, pluriel = `${mot}s`) {
  return n > 1 ? pluriel : mot;
}

// « 3 parcelles » ; `affiche` : le nombre tel qu'il s'écrit (formatNumber(n), par exemple).
export function plural(n, mot, affiche = n) {
  return `${affiche} ${accord(n, mot)}`;
}

// Une liste d'objets { item: quantité }, selon `format` :
//   'resume' (par défaut) « 3 🥕 · 2 🍅 » ;
//   'bulle'  « 🥕 6 🌱 2 » (bulles de la carte ; objets inconnus et quantités nulles omis) ;
//   'gain'   « +3 🥕 +2 🍅 » (récolte) ;
//   'nom'    « 3 🥕 carotte, 2 🍅 tomate » (quantités nulles omises).
export function itemsText(map, format = 'resume') {
  const entries = Object.entries(map || {});
  const it = (item) => DATA.items[item];
  switch (format) {
    case 'bulle':
      return entries.filter(([item, n]) => it(item) && n > 0).map(([item, n]) => `${it(item).icone} ${n}`).join(' ');
    case 'gain':
      return entries.map(([item, n]) => `+${n} ${it(item).icone}`).join(' ');
    case 'nom':
      return entries.filter(([, n]) => n > 0).map(([item, n]) => `${n} ${it(item).icone} ${it(item).nom.toLowerCase()}`).join(', ');
    default:
      return entries.map(([item, n]) => `${n} ${it(item).icone}`).join(' · ');
  }
}

/* ---------- jauges (énergie, bonheur) ---------- */

// Couleur d'une jauge selon son remplissage en % : verte à JAUGE_HAUT et plus, jaune de
// JAUGE_BAS à JAUGE_HAUT, rouge en dessous. Renvoie la classe : '' (verte), `moyen` ou 'low'.
export const JAUGE_HAUT = 65;
export const JAUGE_BAS = 20;
export function jaugeClasse(pct, moyen = 'mid') {
  return pct >= JAUGE_HAUT ? '' : pct >= JAUGE_BAS ? moyen : 'low';
}

/* ---------- petits graphiques SVG (autonomie, simulation du mode test) ---------- */

// Le cadre commun : zone de tracé, échelle des pourcentages (0 en bas, 100 en haut) et
// lignes de la grille tous les 25 %, avec leur graduation à gauche.
export function chartFrame({ W, H, left, right, top, bottom }) {
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const y = (pct) => top + plotH * (1 - pct / 100);
  const grid = [0, 25, 50, 75, 100]
    .map((g) => `<line class="chart-grid" x1="${left}" y1="${y(g).toFixed(1)}" x2="${W - right}" y2="${y(g).toFixed(1)}"/><text class="chart-label" x="${left - 4}" y="${(y(g) + 3).toFixed(1)}" text-anchor="end">${g}</text>`)
    .join('');
  return { plotW, plotH, y, grid };
}
