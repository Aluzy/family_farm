/* ---------- le comptoir : ce que la fenêtre du port et ses fiches partagent ----------
   (Repris de la fenêtre de la calèche d'avant, retirée à la bascule, fiche I9h : le port, js/ui/port.js, en prend
   ses cases, ses lots et l'onglet à l'ouverture ; le mode Construire, le dessin d'un meuble.) */

import { DATA } from '../engine/catalog.js';
import { seedStock } from '../engine/crops.js';
import { plantableCropsFor } from '../engine/campaign.js';
import { pxText } from './pixel-art.js';
import { comptoirTabChoisi, state } from './store.js';

// Dessin d'un meuble (assets/meuble_<id>.png), avec l'empreinte du fichier sur le site en ligne
// (le mode Construire en a besoin : js/ui/chantier.js).
export function meubleSrc(id) {
  const file = `meuble_${id}.png`;
  const versions = window.FERME_ASSET_VERSIONS;
  return `assets/${file}${versions && versions[file] ? `?v=${versions[file]}` : ''}`;
}

// FLU-13 : l'onglet à l'ouverture : Acheter si une parcelle est vide et qu'aucune graine n'est en
// stock ; sinon le dernier onglet choisi par le joueur.
export function comptoirTabAOuvrir() {
  const vide = state.potager.parcelles.some((p) => !p.culture);
  const graines = plantableCropsFor(state, DATA.POTAGER.LIEU).some((c) => seedStock(state, c) >= 1);
  if (vide && !graines) return 'acheter';
  return comptoirTabChoisi === 'vendre' || comptoirTabChoisi === 'acheter' ? comptoirTabChoisi : 'vendre';
}

// Une case : `act` = attributs de l'appui (data-mode, data-item), `prix` en haut à gauche, `coin`
// en bas à droite (texte en police pixel, ou HTML).
export function shopSlot(icone, nom, act, prix, coin, off, label) {
  const price = prix === null ? '' : `<span class="shop-slot-price">${pxText(String(Math.round(prix)), 'light')}<span class="shop-coin" aria-hidden="true">💰</span></span>`;
  return `<button type="button" class="inv-slot shop-slot${off ? ' off' : ''}" data-action="port-fiche" ${act} title="${nom}" aria-label="${label}">` +
    `${price}<span class="inv-slot-icon" aria-hidden="true">${icone}</span>` +
    `<span class="inv-slot-qty">${coin}</span></button>`;
}

export function slotsHtml(slots, empty) {
  const html = slots.join('');
  return html ? `<div class="inv-slots">${html}</div>` : `<p class="hint">${empty}</p>`;
}

// Un bouton de lot (×1, ×5, Tout) et son total.
export function lotBtn(attrs, q, label, total, ok) {
  return `<button type="button" class="btn lot-btn" ${attrs} data-q="${q}"${ok ? '' : ' disabled'}><span>${label}</span><small class="num">${total}</small></button>`;
}
