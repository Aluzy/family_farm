import { DATA } from '../engine/catalog.js';
import { cowCount, sheepCount } from '../engine/animals.js';
import {
  chooseCommerce, commerceBatches, commerceCapacity, commerceChoiceCost, commerceDef, commerceStock,
  commerceUpgradeCost, setCommerceQuota, upgradeCommerce,
} from '../engine/commerce.js';
import { formatCoins, formatNumber } from '../engine/format.js';
import { state } from './store.js';
import { applyResult } from './game-actions.js';
import { refresh } from './render.js';
import { showToast } from './toasts.js';
import { registerActions } from './actions.js';
import { canPay, costLabel } from './common.js';

/* ---------- version 1.14 (v2, lot 10) : le commerce (Maison › Commerce) ---------- */

// Commerce dont le joueur confirme le choix (null : aucun).
let enChoix = null;

// Matière que la ferme fournit par nuit à ce commerce : le lait des vaches, la laine
// des moutons ; pour la conserverie, les légumes en stock aujourd'hui.
function matiereParNuit(type) {
  if (type === 'cremerie') return cowCount(state) * DATA.ANIMAUX.vache.laitParNuit;
  if (type === 'tissage') return (sheepCount(state) * DATA.ANIMAUX.mouton.laineParTonte) / DATA.ANIMAUX.mouton.joursLaine;
  return commerceStock(state, type);
}

function estimation(type) {
  const def = commerceDef(type);
  const n = Math.min(commerceCapacity(state), Math.floor(matiereParNuit(type) / def.par));
  const source = type === 'conserverie' ? 'avec les légumes en stock' : `avec ${type === 'cremerie' ? 'tes vaches' : 'tes moutons'}`;
  return n > 0
    ? `Aujourd'hui, ${source} : environ <strong class="num">${formatNumber(n)}</strong> ${n > 1 ? def.produits : def.produit} par nuit, <strong class="num">+${formatCoins(n * def.prix)} 💰</strong>.`
    : `Aujourd'hui, ${source} : pas encore assez de ${def.matiere}.`;
}

function recette(def) {
  return `${def.par} ${def.matiere} → 1 ${def.produit}, vendu${def.produit === 'conserve de légumes' ? 'e' : ''} ${formatCoins(def.prix)} 💰`;
}

function choiceCard(type) {
  const def = commerceDef(type);
  const cost = commerceChoiceCost(state, type);
  const actuel = state.commerce.type === type;
  let foot;
  if (actuel) foot = '<span class="chip">Ton commerce</span>';
  else if (enChoix === type) {
    foot = `
      <span class="muted">${state.commerce.type ? `Changer coûte ${formatCoins(cost)} 💰.` : `Choix définitif : en changer coûtera ensuite ${formatCoins(DATA.COMMERCE.CHANGER)} 💰.`}</span>
      <div class="row">
        <button type="button" class="btn primary" data-action="commerce-choose" data-type="${type}"${canPay(cost) ? '' : ' disabled'}>Confirmer${cost ? ` (${costLabel(cost)})` : ''}</button>
        <button type="button" class="btn" data-action="commerce-cancel">Annuler</button>
      </div>`;
  } else {
    foot = `<button type="button" class="btn${state.commerce.type ? '' : ' primary'}" data-action="commerce-pick" data-type="${type}">${state.commerce.type ? `Changer pour ${def.le} (${formatCoins(cost)} 💰)` : `Choisir ${def.le}`}</button>`;
  }
  return `
    <div class="card${actuel ? ' adult' : ''}">
      <span class="card-title"><span><span aria-hidden="true">${def.icone}</span> ${def.nom}</span></span>
      <span class="muted">${recette(def)}.</span>
      <span class="muted">${estimation(type)}</span>
      ${foot}
    </div>`;
}

function currentCard() {
  const c = state.commerce;
  const def = commerceDef(c.type);
  const cap = commerceCapacity(state);
  const up = commerceUpgradeCost(state);
  const n = commerceBatches(state);
  return `
    <div class="card">
      <span class="card-title"><span><span aria-hidden="true">${def.icone}</span> ${def.nom} · niveau ${c.niveau}</span></span>
      <span class="muted">Chaque nuit, après le repas de la famille, ${recette(def)}. Ni énergie ni électricité ; 1 XP par pièce.</span>
      <div class="row qty-row">
        <span>Par nuit : <strong class="num">${formatNumber(c.quota)}</strong> / ${formatNumber(cap)} ${def.produits}</span>
        <button type="button" class="btn small" data-action="commerce-quota-dec"${c.quota > 0 ? '' : ' disabled'} aria-label="Un de moins">−</button>
        <button type="button" class="btn small" data-action="commerce-quota-inc"${c.quota < cap ? '' : ' disabled'} aria-label="Un de plus">+</button>
        <button type="button" class="btn small" data-action="commerce-quota-max"${c.quota < cap ? '' : ' disabled'}>Max</button>
      </div>
      <span class="muted">Avec le stock actuel (${formatNumber(commerceStock(state, c.type))} ${def.matiere}) : ${formatNumber(n)} ${n > 1 ? def.produits : def.produit} cette nuit, +${formatCoins(n * def.prix)} 💰.</span>
      ${up === null
        ? '<span class="muted">Capacité maximale atteinte.</span>'
        : `<button type="button" class="btn" data-action="commerce-upgrade"${canPay(up) ? '' : ' disabled'}>Agrandir : ${formatNumber(DATA.COMMERCE.CAPACITE[c.niveau])} par nuit (${costLabel(up)})</button>`}
    </div>`;
}

export function renderCommerce() {
  const types = Object.keys(DATA.COMMERCE.TYPES);
  if (!state.commerce.type) {
    return `
      <p class="muted">Un commerce transforme chaque nuit une partie de la production de la ferme et la vend tout seul, sans passer par le Marché. Choisis-en un : le choix est définitif (en changer coûte ${formatCoins(DATA.COMMERCE.CHANGER)} 💰).</p>
      ${types.map(choiceCard).join('')}`;
  }
  return `
    ${currentCard()}
    <h3 class="section-title">Changer de commerce</h3>
    ${types.filter((t) => t !== state.commerce.type).map(choiceCard).join('')}`;
}

const quota = (n) => {
  applyResult(setCommerceQuota(state, n));
};

registerActions({
  'commerce-pick': (target) => {
    enChoix = target.dataset.type;
    refresh();
  },
  'commerce-cancel': () => {
    enChoix = null;
    refresh();
  },
  'commerce-choose': (target) => {
    const result = applyResult(chooseCommerce(state, target.dataset.type));
    enChoix = null;
    if (result.ok) {
      const def = commerceDef(result.type);
      showToast(`${def.icone} Ton commerce : ${def.le}${result.cost ? ` (−${formatCoins(result.cost)} 💰)` : ''}`);
    }
  },
  'commerce-upgrade': () => {
    const result = applyResult(upgradeCommerce(state));
    if (result.ok) showToast(`🏪 Commerce niveau ${result.niveau} : ${result.capacite} par nuit (−${formatCoins(result.cost)} 💰)`);
  },
  'commerce-quota-dec': () => quota(state.commerce.quota - 1),
  'commerce-quota-inc': () => quota(state.commerce.quota + 1),
  'commerce-quota-max': () => quota(commerceCapacity(state)),
});
