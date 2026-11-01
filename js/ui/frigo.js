import { DATA } from '../engine/catalog.js';
import { countItem, isFridgeable } from '../engine/inventory.js';
import { expiringTonight, expiringToFridge, fridgeRoom, moveExpiringToFridge, moveToFridge } from '../engine/fridge.js';
import { formatQty } from '../engine/format.js';
import { state } from './store.js';
import { persistState } from './storage.js';
import { applyResult } from './game-actions.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';
import { registerActions } from './actions.js';
import { itemsText } from './common.js';
import { fridgeSlots, slotHtml } from './inventaire.js';

/* ---------- la fenêtre du Réfrigérateur : ranger sans passer par l'inventaire ----------
   En tête, l'urgent : ce qui, dans le sac, périt cette nuit, et un bouton pour le mettre au frais
   d'un coup. Puis ce qui est au frais (un appui sur un aliment : sa fiche, pour le sortir), la
   grille finissant par une case « + » : elle ouvre le tiroir « Ranger au frais », où l'on choisit
   un aliment du sac, puis combien (−/+, le curseur, Tout), et « Ranger ». */

// Le tiroir : ouvert ou non, l'aliment choisi, la quantité.
const tiroir = { ouvert: false, item: null, qte: 1 };

// Les aliments du sac qui peuvent aller au frigo, ceux qui périssent cette nuit d'abord.
function rangeables() {
  return Object.keys(DATA.OBJETS)
    .filter((k) => isFridgeable(k) && countItem(state, k) >= 1)
    .sort((a, b) => (expiringTonight(state, b) > 0) - (expiringTonight(state, a) > 0));
}

// Combien de `item` on peut ranger : ce qu'il y en a dans le sac, dans la place qui reste.
const maxi = (item) => Math.max(0, Math.min(Math.floor(countItem(state, item)), fridgeRoom(state)));

// L'encart de l'urgent (rien si rien ne périt cette nuit).
function urgentHtml() {
  const u = expiringToFridge(state);
  const n = Object.values(u).reduce((t, k) => t + k, 0);
  if (!n) return '';
  const liste = Object.entries(u).map(([k, q]) => `${formatQty(q)} ${DATA.OBJETS[k].icone} ${DATA.OBJETS[k].nom.toLowerCase()}`).join(' · ');
  const place = fridgeRoom(state);
  return `<div class="card frigo-urgent">
      <span class="card-title"><span>⚠️ ${formatQty(n)} ${n > 1 ? 'aliments périssent' : 'aliment périt'} cette nuit</span></span>
      <span>${liste} : au frigo, ${n > 1 ? 'ils se gardent' : 'il se garde'}.</span>
      ${place > 0
    ? `<button type="button" class="btn primary" data-action="fridge-in-urgent">🧊 ${n > 1 ? 'Les' : 'Le'} mettre au frais (${formatQty(Math.min(n, place))}${n > place ? ` sur ${formatQty(n)}` : ''})</button>`
    : '<button type="button" class="btn" disabled>🧊 Frigo plein</button>'}
    </div>`;
}

// La case « + » qui ouvre (ou ferme) le tiroir.
function casePlus() {
  return `<button type="button" class="inv-slot frigo-plus${tiroir.ouvert ? ' on' : ''}" data-action="frigo-tiroir" aria-expanded="${tiroir.ouvert}" aria-label="${tiroir.ouvert ? 'Fermer' : 'Ranger un aliment au frais'}" title="Ranger au frais"><span class="inv-slot-icon" aria-hidden="true">${tiroir.ouvert ? '−' : '＋'}</span></button>`;
}

// Le tiroir « Ranger au frais » : les aliments du sac, puis, l'un choisi, sa quantité.
function tiroirHtml() {
  if (!tiroir.ouvert) return '';
  const liste = rangeables();
  const place = fridgeRoom(state);
  if (tiroir.item && maxi(tiroir.item) < 1) tiroir.item = null;
  const choix = liste.length
    ? `<div class="inv-slots">${liste.map((k) => slotHtml(k, countItem(state, k), 'sac', { action: 'frigo-choisir', choisi: k === tiroir.item })).join('')}</div>`
    : '<p class="hint">Rien à ranger : le sac n\'a pas d\'aliment frais.</p>';
  let detail = '';
  if (tiroir.item) {
    const it = DATA.OBJETS[tiroir.item], max = maxi(tiroir.item), q = Math.max(1, Math.min(tiroir.qte, max));
    tiroir.qte = q;
    const soon = expiringTonight(state, tiroir.item);
    const nom = (n) => (n > 1 && !it.nom.endsWith('s') ? `${it.nom.toLowerCase()}s` : it.nom.toLowerCase());
    detail = `
      <div class="frigo-choisi"><span class="item-icon" aria-hidden="true">${it.icone}</span><span><b>${it.nom}</b><br><span class="muted">${formatQty(countItem(state, tiroir.item))} dans le sac${soon ? ` · <span class="frigo-soon">${formatQty(soon)} ${soon > 1 ? 'périssent' : 'périt'} cette nuit</span>` : ''}</span></span></div>
      <div class="frigo-qte">
        <button type="button" class="btn" data-action="frigo-qte" data-delta="-1" aria-label="Un de moins"${q > 1 ? '' : ' disabled'}>−</button>
        <span class="num frigo-qte-n" aria-live="polite">${q}</span>
        <button type="button" class="btn" data-action="frigo-qte" data-delta="1" aria-label="Un de plus"${q < max ? '' : ' disabled'}>+</button>
        <input type="range" class="frigo-curseur" min="1" max="${max}" value="${q}" aria-label="Combien en ranger"${max > 1 ? '' : ' disabled'}>
        <button type="button" class="btn" data-action="frigo-qte" data-qte="tout"${q < max ? '' : ' disabled'}>Tout (${max})</button>
      </div>
      <button type="button" class="btn primary" data-action="frigo-ranger" data-item="${tiroir.item}">🧊 Ranger <span class="frigo-qte-n">${q}</span> ${nom(q)}</button>`;
  } else if (liste.length) detail = '<p class="hint">Choisis un aliment à ranger.</p>';
  return `<div class="card frigo-tiroir">
      <span class="card-title"><span>➕ Ranger au frais</span><span class="chips"><span class="chip">${place > 0 ? `${formatQty(place)} place${place > 1 ? 's' : ''} libre${place > 1 ? 's' : ''}` : 'Frigo plein'}</span></span></span>
      ${choix}${detail}
    </div>`;
}

// Le contenu de la fenêtre du frigo, posé : l'urgent, ce qui est au frais et sa case « + », le
// tiroir, puis `carte` (l'appareil : son courant, son niveau, son usure).
export function renderFrigoFenetre(carte) {
  if (!state.frigo.construit) return `<div class="cards">${carte}</div>${fridgeSlots()}`;
  return `${urgentHtml()}
    ${fridgeSlots(casePlus())}
    ${tiroirHtml()}
    <div class="cards">${carte}</div>`;
}

// Le curseur de quantité du tiroir : la quantité suit, sans redessiner la fenêtre.
document.addEventListener('input', (e) => {
  const c = e.target;
  if (!c || !c.classList || !c.classList.contains('frigo-curseur')) return;
  tiroir.qte = Math.max(1, Number(c.value) || 1);
  const box = c.closest('.frigo-tiroir');
  if (box) for (const n of box.querySelectorAll('.frigo-qte-n')) n.textContent = String(tiroir.qte);
});

/* ---------- actions de la fenêtre (voir ui/actions.js) ---------- */

registerActions({
  'frigo-tiroir': () => {
    tiroir.ouvert = !tiroir.ouvert;
    if (!tiroir.ouvert) tiroir.item = null;
    refresh();
  },
  'frigo-choisir': (target) => {
    const item = target.dataset.item;
    tiroir.item = tiroir.item === item ? null : item;
    // (par défaut : tout ce qui périt cette nuit, sinon tout ce qui tient)
    const soon = Math.floor(expiringTonight(state, item));
    tiroir.qte = soon > 0 ? Math.min(soon, maxi(item)) : maxi(item);
    refresh();
  },
  'frigo-qte': (target) => {
    if (!tiroir.item) return;
    const max = maxi(tiroir.item);
    tiroir.qte = target.dataset.qte === 'tout' ? max : Math.max(1, Math.min(max, tiroir.qte + Number(target.dataset.delta || 0)));
    refresh();
  },
  'frigo-ranger': (target) => {
    const item = target.dataset.item;
    const result = applyResult(moveToFridge(state, item, tiroir.qte));
    if (!result.ok) return;
    persistState();
    notify(`🧊 Rangé au frigo : ${formatQty(result.moved)} ${DATA.OBJETS[item].icone}${result.reste ? ` · frigo plein, ${formatQty(result.reste)} restent dehors` : ''}`);
    if (maxi(item) < 1) tiroir.item = null;
    tiroir.qte = 1;
    refresh();
  },
  'fridge-in-urgent': () => {
    const result = applyResult(moveExpiringToFridge(state));
    if (!result.ok) return;
    persistState();
    notify(`🧊 Mis au frais : ${itemsText(result.items)}${result.reste ? ` · frigo plein, ${formatQty(result.reste)} restent dehors` : ''}`);
    refresh();
  },
});
