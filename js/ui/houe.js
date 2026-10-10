import { DATA } from '../engine/catalog.js';
import {
  buyHoe, hasHoe, hoe, hoeStatus, plotAtCase, soilCap, soilCapNext, soilCount, zoneGrid,
} from '../engine/crops.js';
import { levelReached } from '../engine/levels.js';
import { actionCost } from '../engine/stamina.js';
import { formatCoins } from '../engine/format.js';
import { hoeMode, setHoeMode, state } from './store.js';
import { applyResult } from './game-actions.js';
import { refresh } from './render.js';
import { formatEnergy } from './energie.js';
import { showToast } from './toasts.js';
import { registerActions } from './actions.js';
import { canPay } from './common.js';

/* ---------- version 1.9 (v2, lot 5) : la houe ---------- */

// Ligne « Tuiles : 12 / 20 » de la Zone de culture et du Champ (plafond commun).
export function soilLine() {
  const n = soilCount(state);
  const cap = soilCap(state);
  const plus = soilCapNext(state);
  const next = n >= cap && plus ? ` · niveau suivant : +${plus}` : '';
  return `<span class="chip${n >= cap ? ' warn' : ''}" title="Tuiles de terre (Zone de culture et Champ) sur le plafond du niveau ${levelReached(state)}">🟫 ${n} / ${cap} tuiles${next}</span>`;
}

// Barre de la houe d'une zone : l'acheter, ou l'activer ; en mode houe, la grille des
// cases de la zone (herbe, terre vide, terre plantée).
export function hoePanelHtml(zone) {
  const H = DATA.HOUE;
  if (!hasHoe(state)) {
    return `
      <div class="hoe-bar">
        <span class="muted">${H.ICONE} Une <strong>houe</strong> change l'herbe en terre à cultiver.</span>
        <button type="button" class="btn" data-action="buy-hoe"${canPay(H.PRIX) ? '' : ' disabled'}>Acheter la houe (${formatCoins(H.PRIX)} 💰)</button>
      </div>`;
  }
  const bar = `
    <div class="hoe-bar">
      <button type="button" class="btn${hoeMode ? ' primary' : ''}" data-action="hoe-toggle" aria-pressed="${hoeMode}">${H.ICONE} ${hoeMode ? 'Ranger la houe' : 'Prendre la houe'}</button>
      ${soilLine()}
      <span class="chip" title="Labourer une case d'herbe">⚡ −${formatEnergy(actionCost(state, 'labourer'))}</span>
    </div>`;
  if (!hoeMode) return bar;
  const g = zoneGrid(zone);
  const cells = [];
  for (let c = 0; c < g.cases; c++) {
    const p = plotAtCase(state, zone, c);
    const st = hoeStatus(state, zone, c);
    let label;
    let cls;
    if (!p) { label = `Case ${c + 1} : herbe. ${st.ok ? 'Labourer.' : st.raison}`; cls = 'herbe'; }
    else if (p.culture) { label = `Case ${c + 1} : ${DATA.crops[p.culture].nom}, plantée.`; cls = 'plantee'; }
    else { label = `Case ${c + 1} : terre vide. Reboucher.`; cls = 'terre'; }
    const ico = p && p.culture ? DATA.crops[p.culture].icone : '';
    cells.push(`<button type="button" class="hoe-cell ${cls}" data-action="hoe" data-zone="${zone}" data-case="${c}" title="${label}" aria-label="${label}"${st.ok ? '' : ' aria-disabled="true"'}>${ico}</button>`);
  }
  return `${bar}
    <p class="muted">Touche une case d'herbe pour la labourer, une terre vide pour la reboucher (gratuit).</p>
    <div class="hoe-grid" style="--cols:${g.cols}">${cells.join('')}</div>`;
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'buy-hoe': () => {
    const r = applyResult(buyHoe(state));
    if (r.ok) showToast(`${DATA.HOUE.ICONE} Houe achetée : touche « Prendre la houe » pour labourer.`);
  },
  'hoe-toggle': () => {
    if (!hasHoe(state)) {
      showToast(`Il te faut une houe (${formatCoins(DATA.HOUE.PRIX)} 💰).`);
      return;
    }
    setHoeMode(!hoeMode);
    refresh();
  },
  'hoe': (target) => {
    const zone = Number(target.dataset.zone) === 2 ? 2 : 1;
    applyResult(hoe(state, zone, Number(target.dataset.case)));
  },
});
