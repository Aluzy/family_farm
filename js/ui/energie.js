import { DATA } from '../engine/catalog.js';
import { formatNumber } from '../engine/format.js';
import {
  actionCost, actionsLeft, energyLevel, enduranceReduction, happinessCostPct, snackEnergy,
} from '../engine/stamina.js';
import { eatSnack } from '../engine/family.js';
import { state } from './store.js';
import { applyResult } from './game-actions.js';
import { showToast } from './toasts.js';
import { registerActions } from './actions.js';

/* ---------- version 1.8 : l'énergie du personnage ---------- */

// Énergie en points, avec une décimale quand il le faut (« 1,5 »).
// FLU-23 : un coût s'affiche arrondi à l'entier supérieur (le calcul garde ses millièmes) ;
// un gain, à l'entier inférieur. Jamais de décimale.
export function formatEnergy(milli) {
  return formatNumber(Math.ceil(Math.round(milli) / 1000));
}

export function formatEnergyGain(milli) {
  return formatNumber(Math.floor(Math.round(milli) / 1000));
}

// Puce d'énergie des écrans d'action : énergie restante, et ce que coûte l'action
// principale de l'écran (`action`, une clé de DATA.PERSONNAGE.COUTS).
export function energyChip(action) {
  const e = energyLevel(state);
  const cost = action ? actionCost(state, action) : 0;
  const low = cost > 0 && actionsLeft(state, action) < 1;
  const title = cost > 0
    ? `Énergie : ${e} / ${DATA.PERSONNAGE.MAX}. Cette action en coûte ${formatEnergy(cost)}.`
    : `Énergie : ${e} / ${DATA.PERSONNAGE.MAX}.`;
  // FLU-23 : « ⚡ 100 · arroser : 1 », en mots
  return `<span class="chip${low ? ' warn' : ''}" title="${title}">⚡ ${e}${cost > 0 ? ` · ${ACTION_LABELS[action] || action} : ${formatEnergy(cost)}` : ''}</span>`;
}

export function energyDetailsHtml() {
  const P = DATA.PERSONNAGE;
  const endu = enduranceReduction(state);
  const reduc = 100 - happinessCostPct(state);
  const bonheur = reduc > 0 ? `tes actions coûtent ${reduc} % d'énergie en moins` : 'il ne change pas encore le coût de tes actions';
  const costs = Object.entries(P.COUTS).map(([a]) => `${ACTION_LABELS[a] || a} ${formatEnergy(actionCost(state, a))}`).join(' · ');
  return `
    <div class="card">
      <span class="card-title"><span>⚡ L'énergie en détail</span></span>
      <span class="muted">Chaque action au clic en dépense ; à 0, plus d'action jusqu'à un en-cas ou une nuit. Ce qui tourne seul (automatisations, ateliers, panneau) n'en coûte pas.</span>
      <span>😊 Bonheur de la famille : ${bonheur}.</span>
      <span class="muted">Ce que coûte chaque action maintenant : ${costs}.</span>
      <span class="level-line"><span>💪 Endurance : avec ton niveau, tes actions coûtent</span><span class="num">${endu} % de moins</span></span>
      <span class="bar" role="progressbar" aria-label="Endurance" aria-valuemin="0" aria-valuemax="${P.ENDURANCE * (DATA.NIVEAUX.SEUILS.length - 1)}" aria-valuenow="${endu}"><span class="bar-fill" style="width:${Math.round((endu * 100) / (P.ENDURANCE * (DATA.NIVEAUX.SEUILS.length - 1)))}%"></span></span>
      <span class="muted">Au réveil, l'énergie remonte à ${P.REVEIL_BASE} + ${P.REVEIL_REPAS} × la part du repas du soir couverte (repas complet : ${P.REVEIL_BASE + P.REVEIL_REPAS}). Un aliment mangé dans la journée rend ses calories ÷ ${P.MANGER_DIVISEUR}, depuis l'Inventaire.</span>
    </div>`;
}

const ACTION_LABELS = {
  planter: 'planter', arroser: 'arroser', recolter: 'récolter', tondre: 'tondre',
  cuisiner: 'cuisiner', cuireFour: 'cuire au four', moudre: 'moudre (par blé)', presser: 'presser',
};

// Bouton « Manger » d'un aliment de l'Inventaire (ce qu'il rendrait).
export function eatButton(item, texte = '') {
  const def = DATA.items[item];
  if (!def || !def.edible) return '';
  const gain = snackEnergy(state, item);
  return `<button type="button" class="btn" data-action="eat" data-item="${item}" title="Manger : +${formatEnergyGain(gain)} énergie">🍴 ${texte ? `${texte} · ` : ''}+${formatEnergyGain(gain)} ⚡</button>`;
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'eat': (target) => {
    const r = applyResult(eatSnack(state, target.dataset.item));
    if (r && r.ok) showToast(`⚡ +${formatEnergyGain(r.gain)} énergie`);
  },
});
