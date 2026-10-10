import { DATA } from '../engine/catalog.js';
import {
  actionCost, actionsLeft, energyLevel, enduranceReduction, happinessCostPct, snackEnergy,
} from '../engine/stamina.js';
import { eatSnack } from '../engine/family.js';
import { mainCharacter } from '../engine/depart.js';
import { memberNameHtml } from './famille.js';
import { state } from './store.js';
import { applyResult } from './game-actions.js';
import { showToast } from './toasts.js';
import { registerActions } from './actions.js';

/* ---------- version 1.8 : l'énergie du personnage ---------- */

// Énergie en points, avec une décimale quand il le faut (« 1,5 »).
export function formatEnergy(milli) {
  const n = Math.round(milli / 100) / 10;
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
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
  return `<span class="chip${low ? ' warn' : ''}" title="${title}">⚡ ${e}${cost > 0 ? ` · −${formatEnergy(cost)}` : ''}</span>`;
}

// Carte « Énergie » (Famille) : jauge, ce qui la remplit, bonheur et endurance.
export function energyCardHtml() {
  const e = energyLevel(state);
  const max = DATA.PERSONNAGE.MAX;
  const P = DATA.PERSONNAGE;
  const pct = Math.round((e / max) * 100);
  const reduc = 100 - happinessCostPct(state);
  const endu = enduranceReduction(state);
  const costs = Object.entries(P.COUTS).map(([a, c]) => `${ACTION_LABELS[a] || a} ${formatEnergy(actionCost(state, a))}${actionCost(state, a) !== c * 1000 ? ` (${c})` : ''}`).join(' · ');
  return `
    <div class="card">
      <span class="card-title"><span>⚡ Énergie${mainCharacter(state) ? ` de ${memberNameHtml(mainCharacter(state).id)}` : ''}</span><span class="num">${e} / ${max}</span></span>
      <span class="bar" role="progressbar" aria-label="Énergie" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${e}"><span class="bar-fill${pct < 20 ? ' warn' : ''}" style="width:${pct}%"></span></span>
      <span class="muted">Chaque action au clic en dépense ; à 0, plus d'action jusqu'à un en-cas ou une nuit. Ce qui tourne seul (automatisations, ateliers, panneau) n'en coûte pas.</span>
      <span class="muted">Coût actuel : ${costs}.</span>
      <span class="level-line"><span>😊 Bonheur de la famille</span><span class="num">−${reduc} %</span></span>
      <span class="level-line"><span>💪 Endurance (niveau)</span><span class="num">−${endu} %</span></span>
      <span class="bar" role="progressbar" aria-label="Endurance" aria-valuemin="0" aria-valuemax="${P.ENDURANCE * (DATA.NIVEAUX.SEUILS.length - 1)}" aria-valuenow="${endu}"><span class="bar-fill" style="width:${Math.round((endu * 100) / (P.ENDURANCE * (DATA.NIVEAUX.SEUILS.length - 1)))}%"></span></span>
      <span class="muted">Au réveil, l'énergie remonte à ${P.REVEIL_BASE} + ${P.REVEIL_REPAS} × la part du repas du soir couverte (repas complet : ${P.REVEIL_BASE + P.REVEIL_REPAS}). Un aliment mangé dans la journée rend ses calories ÷ ${P.MANGER_DIVISEUR}, depuis l'Inventaire.</span>
    </div>`;
}

const ACTION_LABELS = {
  planter: 'planter', arroser: 'arroser', recolter: 'récolter', tondre: 'tondre',
  cuisiner: 'cuisiner', cuireFour: 'cuire au four', moudre: 'moudre (par blé)', presser: 'presser',
};

// Bouton « Manger » d'un aliment de l'Inventaire (ce qu'il rendrait).
export function eatButton(item) {
  const def = DATA.items[item];
  if (!def || !def.edible) return '';
  const gain = snackEnergy(state, item);
  return `<button type="button" class="btn" data-action="eat" data-item="${item}" title="Manger : +${formatEnergy(gain)} énergie">🍴 +${formatEnergy(gain)} ⚡</button>`;
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'eat': (target) => {
    const r = applyResult(eatSnack(state, target.dataset.item));
    if (r && r.ok) showToast(`⚡ +${formatEnergy(r.gain)} énergie`);
  },
});
