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
import { notify } from './toasts.js';
import { registerActions } from './actions.js';
import { canPay, itemsText, jaugeClasse } from './common.js';
import { pxGauge } from './pixel-art.js';
import { helpBtn } from './aide.js';
import { companyIds, companyPlan, ownsCompany, setCompanyQuota, townSellPrice } from '../engine/entreprises.js';

/* ---------- version 1.5 : la Ville (sorties, voyages, marché de la ville) ---------- */

// Jauge de bonheur (10 cases) : rouge en dessous de 35, dorée à partir de 85.
export function happinessGaugeHtml(value, label = 'Bonheur') {
  const v = Math.round(value);
  // Couleur selon le remplissage (jaugeClasse) : vert, jaune, rouge.
  const pct = (v * 100) / DATA.VILLE.BONHEUR.MAX;
  const cls = jaugeClasse(pct, 'joie');
  // au moins une case allumée dès que le bonheur n'est pas nul : le rouge reste visible
  return pxGauge(v > 0 ? Math.max(1, Math.round(v / 10)) : 0, 10, `${label} : ${v} sur ${DATA.VILLE.BONHEUR.MAX}`, cls);
}

function gainLabel(s) {
  const b = s.bonheur;
  return b.enfant === b.adulte ? `😊 +${b.enfant}` : `😊 +${b.enfant} enfant, +${b.adulte} adulte`;
}

function outingCard(id) {
  const s = DATA.VILLE.SORTIES[id];
  const st = outingStatus(state, id);
  const cost = outingCost(state, id);
  const loot = itemsText(outingLoot(state, id), 'nom');
  const prix = cost > 0 ? `${formatCoins(cost)} 💰` : 'gratuit';
  const label = s.transport ? `Prendre le ${s.transport}` : 'Y aller';
  return `
    <div class="card outing${st.raison === 'faite' ? ' done' : ''}">
      <span class="plot-head" title="${s.texte}"><span class="plot-ico" aria-hidden="true">${s.icone}</span><span class="plot-name">${s.nom}</span></span>
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
        <button type="button" class="btn${st.ok ? ' primary' : ''}" data-action="ville-market"${st.ok ? '' : ' disabled'}>${st.ok ? `🚌 Aller au marché (${M.HEURES} h, ${formatCoins(M.PRIX)} 💰)` : st.texte}</button>
      </div>`;
  }
  const rows = townItems().map((item) => {
    const it = DATA.OBJETS[item];
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

// Version 1.20 : les entreprises (on les achète en se promenant en ville, devant leur entrepôt) ;
// ici, le quota du jour de celles qu'on a, et ce qu'elles ont fait.
function companiesHtml() {
  const H = DATA.VILLE.ENTREPRISES.HEURE;
  const cards = companyIds().map((id) => {
    const d = DATA.VILLE.ENTREPRISES.LISTE[id];
    if (!ownsCompany(state, id)) {
      return `
      <div class="card outing done">
        <span class="plot-head"><span class="plot-ico" aria-hidden="true">${d.icone}</span><span class="plot-name">${d.nom}</span></span>
        <span class="muted">${d.texte} À acheter en ville, devant son entrepôt (au nord-ouest) : ${formatCoins(d.prix)} 💰.</span>
      </div>`;
    }
    const c = state.ville.entreprises[id], plan = companyPlan(state, id), b = c.bilan;
    const bilan = b ? `Le jour ${b.jour} : ${b.unites} × ${d.produit.toLowerCase()}, +${formatCoins(b.gain)} 💰${b.manque ? ` (il manquait des ${d.intrantNom})` : ''}` : 'Pas encore de production.';
    return `
      <div class="card outing">
        <span class="plot-head"><span class="plot-ico" aria-hidden="true">${d.icone}</span><span class="plot-name">${d.nom}</span></span>
        <span class="outing-facts"><span class="chip">${d.par} ${d.intrantNom} → 1 ${d.produit.toLowerCase()}</span><span class="chip">${formatCoins(d.prixProduit)} 💰 pièce</span><span class="chip">⏰ ${H} h</span></span>
        <span class="device-actions">
          <button type="button" class="btn" data-action="entreprise-quota" data-id="${id}" data-delta="-1"${c.quota > 0 ? '' : ' disabled'} aria-label="Un de moins">−</button>
          <span>Quota : <strong>${c.quota}</strong> par jour</span>
          <button type="button" class="btn" data-action="entreprise-quota" data-id="${id}" data-delta="1"${c.quota < d.quotaMax ? '' : ' disabled'} aria-label="Un de plus">+</button>
        </span>
        <span class="muted">En stock : ${formatNumber(plan.dispo)} ${d.intrantNom} (de quoi en faire ${formatNumber(Math.floor(plan.dispo / d.par))}).</span>
        <span class="muted">${bilan}</span>
      </div>`;
  }).join('');
  return `<p class="hint">🏭 Chaque jour à ${H} h, elles prennent leurs ingrédients dans le stock de la ferme et vendent ce qu'elles fabriquent. Au marché de la ville, la ferme vend aussi ses produits ${DATA.VILLE.MARCHE.VENTE - 100} % plus cher (lait : ${formatCoins(townSellPrice('lait'))} 💰).</p><div class="plots outings">${cards}</div>`;
}

export function renderVille() {
  const ids = Object.keys(DATA.VILLE.SORTIES);
  const enVille = ids.filter((id) => DATA.VILLE.SORTIES[id].lieu === 'ville');
  const voyages = ids.filter((id) => DATA.VILLE.SORTIES[id].lieu === 'voyage');
  const avg = averageHappiness(state);
  return `
    <div class="section-head"><h3>🏙️ Ville</h3><span class="chip" title="Le bonheur réduit l'énergie dépensée par chaque action">😊 ${avg} · actions −${formatNumber(100 - happinessCostPct(state))} % d'énergie</span>${helpBtn('ville')}</div>
    <div class="card">
      ${happinessGaugeHtml(avg, 'Bonheur moyen de la famille')}
    </div>
    <h3 class="section-title">Sorties en ville</h3>
    <div class="plots outings">${enVille.map(outingCard).join('')}</div>
    <details class="more">
      <summary>✈️ Voyages (${voyages.length})</summary>
      <div class="plots outings">${voyages.map(outingCard).join('')}</div>
    </details>
    <h3 class="section-title">🧺 Marché de la ville</h3>
    ${townMarketHtml()}
    <h3 class="section-title">🏭 Entreprises</h3>
    ${companiesHtml()}
    <div class="card">
      <a class="btn primary" href="ville-carte.html">🗺️ Se promener en ville</a>
    </div>`;
}

registerActions({
  'entreprise-quota': (target) => {
    const id = target.dataset.id;
    const c = state.ville && state.ville.entreprises && state.ville.entreprises[id];
    if (!c) return;
    applyResult(setCompanyQuota(state, id, c.quota + (Number(target.dataset.delta) || 0)));
    refresh();
  },
  'ville-go': (target) => {
    const id = target.dataset.id;
    const s = DATA.VILLE.SORTIES[id];
    const result = applyResult(goOut(state, id));
    if (!result.ok) return;
    const loot = itemsText(result.butin, 'nom');
    notify(`${s.icone} ${s.nom} : retour à ${result.retour} h${result.cost ? ` (−${formatCoins(result.cost)} 💰)` : ''}${loot ? ` · rapporté : ${loot}` : ''} · 😊 bonheur en hausse`);
    refresh();
  },
  'ville-market': () => {
    const result = applyResult(goToTownMarket(state));
    if (!result.ok) return;
    notify(`🚌 Au marché de la ville (−${formatCoins(result.cost)} 💰) : il reste ouvert jusqu'au soir`);
    refresh();
  },
  'ville-buy': (target) => {
    const item = target.dataset.item;
    const result = applyResult(buyInTown(state, item, Number(target.dataset.qty) || 1));
    if (!result.ok) return;
    notify(`Acheté : ${result.bought} ${DATA.OBJETS[item].icone} (−${formatCoins(result.cost)} 💰)`);
    refresh();
  },
});
