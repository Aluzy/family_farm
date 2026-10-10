import { DATA } from '../engine/catalog.js';
import { countItem } from '../engine/inventory.js';
import { buyPrice } from '../engine/market.js';
import {
  averageHappiness, buyInTown, goOut, goToTownMarket, outingCost, outingLoot,
  outingMembers, outingStatus, townItems, townMarketOpen, townMarketStatus,
} from '../engine/ville.js';
import { happinessCostPct } from '../engine/stamina.js';
import { formatCoins, formatNumber } from '../engine/format.js';
import { state } from './store.js';
import { applyResult } from './game-actions.js';
import { refresh } from './render.js';
import { showToast } from './toasts.js';
import { registerActions } from './actions.js';
import { canPay } from './common.js';
import { pxGauge } from './pixel-art.js';

/* ---------- version 1.5 : la Ville (sorties, voyages, marché de la ville) ---------- */

// Jauge de bonheur (10 cases) : rouge en dessous de 35, dorée à partir de 85.
export function happinessGaugeHtml(value, label = 'Bonheur') {
  const v = Math.round(value);
  const cls = v < 35 ? 'low' : v >= 85 ? 'full' : 'joie';
  return pxGauge(Math.round(v / 10), 10, `${label} : ${v} sur ${DATA.VILLE.BONHEUR.MAX}`, cls);
}

function lootLabel(loot) {
  const parts = Object.entries(loot).filter(([, n]) => n > 0).map(([item, n]) => `${n} ${DATA.items[item].icone} ${DATA.items[item].nom.toLowerCase()}`);
  return parts.length ? parts.join(', ') : '';
}

function gainLabel(s) {
  const b = s.bonheur;
  return b.enfant === b.adulte ? `😊 +${b.enfant}` : `😊 +${b.enfant} enfant, +${b.adulte} adulte`;
}

function outingCard(id) {
  const s = DATA.VILLE.SORTIES[id];
  const st = outingStatus(state, id);
  const cost = outingCost(state, id);
  const loot = lootLabel(outingLoot(state, id));
  const prix = cost > 0 ? `${formatCoins(cost)} 💰` : 'gratuit';
  const label = s.transport ? `Prendre le ${s.transport}` : 'Y aller';
  return `
    <div class="card outing${st.raison === 'faite' ? ' done' : ''}">
      <span class="plot-head"><span class="plot-ico" aria-hidden="true">${s.icone}</span><span class="plot-name">${s.nom}</span></span>
      <span class="muted">${s.texte}</span>
      <span class="outing-facts"><span class="chip">⏳ ${s.heures} h</span><span class="chip">${prix}</span><span class="chip">${gainLabel(s)}</span></span>
      ${loot ? `<span class="muted">Rapporte : ${loot}</span>` : ''}
      <button type="button" class="btn${st.ok ? ' primary' : ''}" data-action="ville-go" data-id="${id}"${st.ok ? '' : ' disabled'} title="${st.ok ? '' : st.texte}">${st.ok ? label : st.texte}</button>
    </div>`;
}

function townMarketHtml() {
  const M = DATA.VILLE.MARCHE;
  if (!townMarketOpen(state)) {
    const st = townMarketStatus(state);
    return `
      <div class="card">
        <span class="muted">Poisson, miel, fromage d'alpage, sucre et épices : introuvables au marché de la ferme. Un adulte y va (${M.HEURES} h aller-retour, ${formatCoins(M.PRIX)} 💰 de bus) ; le marché reste ouvert jusqu'au soir.</span>
        <button type="button" class="btn${st.ok ? ' primary' : ''}" data-action="ville-market"${st.ok ? '' : ' disabled'}>${st.ok ? `🚌 Aller au marché (${M.HEURES} h, ${formatCoins(M.PRIX)} 💰)` : st.texte}</button>
      </div>`;
  }
  const rows = townItems().map((item) => {
    const it = DATA.items[item];
    const price = buyPrice(state, item);
    return `
      <div class="inv-row">
        <div class="inv-main"><span><span aria-hidden="true">${it.icone}</span> ${it.nom}</span><span class="muted">${formatCoins(price)} 💰 · en stock : ${formatNumber(countItem(state, item))}</span></div>
        <span class="device-actions">
          <button type="button" class="btn" data-action="ville-buy" data-item="${item}" data-qty="1"${canPay(price) ? '' : ' disabled'}>Acheter 1</button>
          <button type="button" class="btn" data-action="ville-buy" data-item="${item}" data-qty="5"${canPay(price) ? '' : ' disabled'}>Acheter 5</button>
        </span>
      </div>`;
  }).join('');
  return `<p class="hint">🧺 Au marché de la ville jusqu'au soir. Le prix monte un peu à chaque achat, comme à la ferme.</p><div class="inv-group">${rows}</div>`;
}

export function renderVille() {
  const ids = Object.keys(DATA.VILLE.SORTIES);
  const enVille = ids.filter((id) => DATA.VILLE.SORTIES[id].lieu === 'ville');
  const voyages = ids.filter((id) => DATA.VILLE.SORTIES[id].lieu === 'voyage');
  const avg = averageHappiness(state);
  return `
    <div class="section-head"><h3>🏙️ Ville</h3><span class="chip" title="Le bonheur réduit l'énergie dépensée par chaque action">😊 ${avg} · actions −${formatNumber(100 - happinessCostPct(state))} % d'énergie</span></div>
    <div class="card">
      ${happinessGaugeHtml(avg, 'Bonheur moyen de la famille')}
      <span class="muted">Le bonheur monte avec les plats cuisinés et les sorties ; il baisse un peu chaque soir de repas cru. Toute la famille part en sortie ; le temps passe pendant ce temps (retour avant ${DATA.TIME.NIGHT_HOUR} h). Une fois par jour pour chaque sortie.</span>
    </div>
    <h3 class="section-title">Sorties en ville</h3>
    <div class="plots outings">${enVille.map(outingCard).join('')}</div>
    <h3 class="section-title">Voyages</h3>
    <div class="plots outings">${voyages.map(outingCard).join('')}</div>
    <h3 class="section-title">🧺 Marché de la ville</h3>
    ${townMarketHtml()}`;
}

registerActions({
  'ville-go': (target) => {
    const id = target.dataset.id;
    const s = DATA.VILLE.SORTIES[id];
    const result = applyResult(goOut(state, id));
    if (!result.ok) return;
    const loot = lootLabel(result.butin);
    showToast(`${s.icone} ${s.nom} : retour à ${result.retour} h${result.cost ? ` (−${formatCoins(result.cost)} 💰)` : ''}${loot ? ` · rapporté : ${loot}` : ''} · 😊 bonheur en hausse`);
    refresh();
  },
  'ville-market': () => {
    const result = applyResult(goToTownMarket(state));
    if (!result.ok) return;
    showToast(`🚌 Au marché de la ville (−${formatCoins(result.cost)} 💰) : il reste ouvert jusqu'au soir`);
    refresh();
  },
  'ville-buy': (target) => {
    const item = target.dataset.item;
    const result = applyResult(buyInTown(state, item, Number(target.dataset.qty) || 1));
    if (!result.ok) return;
    showToast(`Acheté : ${result.bought} ${DATA.items[item].icone} (−${formatCoins(result.cost)} 💰)`);
    refresh();
  },
});
