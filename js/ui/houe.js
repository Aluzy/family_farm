import { DATA } from '../engine/catalog.js';
import {
  buyHoe, hasHoe, hoe, soilCap, soilCapNext, soilCount,
} from '../engine/crops.js';
import { levelReached } from '../engine/levels.js';
import { farmOpen } from '../engine/devices.js';
import { actionCost, TIRED } from '../engine/stamina.js';
import { formatCoins } from '../engine/format.js';
import { hoeMode, setHoeMode, state } from './store.js';
import { applyResult } from './game-actions.js';
import { refresh } from './render.js';
import { formatEnergy } from './energie.js';
import { showToast } from './toasts.js';
import { registerActions } from './actions.js';
import { closeStageWindow, stageWindow } from './stage-windows.js';
import { showHoeHint } from './stage.js';
import { canPay } from './common.js';

/* ---------- version 1.9 (v2, lot 5) : la houe ---------- */

// Ligne « Tuiles : 12 / 20 » : les terres de la carte sur le plafond du niveau.
export function soilLine() {
  const n = soilCount(state);
  const cap = soilCap(state);
  const plus = soilCapNext(state);
  const next = n >= cap && plus ? ` · niveau suivant : +${plus}` : '';
  return `<span class="chip${n >= cap ? ' warn' : ''}" title="Tuiles de terre de la ferme sur le plafond du niveau ${levelReached(state)}">🟫 ${n} / ${cap} tuiles${next}</span>`;
}

// Barre de la houe : l'acheter, ou la prendre. Version 1.15 : la houe laboure partout sur
// la carte ; en mode houe, on touche l'herbe de la carte (plus de grille ici).
export function hoePanelHtml() {
  const H = DATA.HOUE;
  if (!hasHoe(state)) {
    // version 1.12 : avant le panneau et la pompe, le Marché (et donc la houe) est fermé
    const ouvert = farmOpen(state);
    return `
      <div class="hoe-bar">
        <span class="muted">${H.ICONE} Une <strong>houe</strong> change l'herbe en terre à cultiver.${ouvert ? '' : ' Elle s\'achète au Marché, qui ouvre quand le panneau solaire et la pompe sont installés (Maison › Installations).'}</span>
        <button type="button" class="btn" data-action="buy-hoe"${ouvert && canPay(H.PRIX) ? '' : ' disabled'}>Acheter la houe (${formatCoins(H.PRIX)} 💰)</button>
      </div>`;
  }
  const bar = `
    <div class="hoe-bar">
      <button type="button" class="btn${hoeMode ? ' primary' : ''}" data-action="hoe-toggle" aria-pressed="${hoeMode}">${H.ICONE} ${hoeMode ? 'Ranger la houe' : 'Prendre la houe'}</button>
      ${soilLine()}
      <span class="chip" title="Énergie pour labourer une case d'herbe">⚡ labourer : ${formatEnergy(actionCost(state, 'labourer'))}</span>
    </div>`;
  return `${bar}
    <p class="muted">${hoeMode ? 'La houe est en main : sur la carte, touche' : 'Avec la houe en main, touche sur la carte'} n'importe quelle tuile d'herbe pour la labourer, une terre vide pour la reboucher (gratuit). Pas sur les chemins, l'eau, les pierres, les arbres, ni aux abords du Poulailler, de l'Étable, du Moulin, de la Serre et du Verger.</p>`;
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'buy-hoe': () => {
    const r = applyResult(buyHoe(state));
    if (r.ok) showToast(`${DATA.HOUE.ICONE} Houe achetée : sur la carte, touche le bouton ${DATA.HOUE.ICONE} près de la lune pour labourer.`);
  },
  // FLU-42 : la puce « Labourer 6 tuiles » met la houe en main (sans la ranger si elle y est)
  'hoe-take': () => {
    if (!hasHoe(state)) {
      showToast(`Il te faut une houe (${formatCoins(DATA.HOUE.PRIX)} 💰).`);
      return;
    }
    if (!hoeMode) setHoeMode(true);
    if (!state.potager.houeVue) state.potager.houeVue = true;
    showHoeHint();
    if (stageWindow) closeStageWindow();
    else refresh();
  },
  'hoe-toggle': () => {
    if (!hasHoe(state)) {
      showToast(`Il te faut une houe (${formatCoins(DATA.HOUE.PRIX)} 💰).`);
      return;
    }
    setHoeMode(!hoeMode);
    // FLU-06 : la première houe en main de la partie, une bulle montre quoi faire
    if (hoeMode && !state.potager.houeVue) {
      state.potager.houeVue = true;
      showHoeHint();
    }
    // version 1.15 : la houe prise, on retourne sur la carte pour labourer
    if (hoeMode && stageWindow) closeStageWindow();
    else refresh();
  },
  'hoe': (target) => {
    applyResult(hoe(state, Number(target.dataset.case)));
  },
  // FLU-12 : les cases traversées d'un glissement, labourées dans l'ordre ; on s'arrête au
  // plafond ou à court d'énergie. Un seul rendu à la fin.
  'hoe-many': (target) => {
    const tiles = String(target.dataset.cases || '').split(',').map(Number).filter((t) => Number.isInteger(t));
    let n = 0;
    let raison = '';
    for (const t of tiles) {
      const r = hoe(state, t);
      if (r.ok) { n += 1; continue; }
      raison = raison || r.error;
      if (r.error === TIRED || /Plafond/.test(r.error)) break;
    }
    refresh();
    if (n) showToast(`${DATA.HOUE.ICONE} ${n} tuile${n > 1 ? 's' : ''} labourée${n > 1 ? 's' : ''}${raison ? ` · ${raison}` : ''}`);
    else if (raison) showToast(raison);
  },
});
