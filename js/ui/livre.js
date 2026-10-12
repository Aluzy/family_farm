import { DATA } from '../engine/catalog.js';
import { recipeStatus } from '../engine/kitchen.js';
import { recipeTime } from '../engine/techtree.js';
import { formatNumber, formatQty } from '../engine/format.js';
import { state } from './store.js';
import { tel } from './consent.js';
import { morph } from './render.js';
import { familyLabelHtml } from './depart.js';
import { bookStations, recipeMeta } from './cuisine.js';
import { registerActions } from './actions.js';
import { REDUCED_MOTION } from './animations.js';

/* ---------- Essai : le Livre de recette comme un vrai livre ----------
   Une page à la fois, dans une couverture de cuir ; on tourne les pages avec ‹ ›, en
   glissant le doigt, ou avec les flèches du clavier. Page 1 : le sommaire (un lien par
   recette) ; ensuite une recette par page, avec ses ingrédients et « Préparer » (la même
   action que la liste du Livre de recette). Le livre se met à jour à chaque rendu
   (renderRecipeBook, appelé par render()).
   Plus tard, il s'ouvrira depuis la bibliothèque d'une vue en pixel art de la maison. */

const FLIP_MS = 450;
let page = 0; // page affichée (0 : sommaire)
let flipping = false;

function bookRecipes() {
  const ids = bookStations();
  return Object.keys(DATA.recipes)
    .filter((id) => !DATA.recipes[id].horsLivre)
    .sort((a, b) => ids.indexOf(DATA.recipes[a].station) - ids.indexOf(DATA.recipes[b].station));
}

function pageCount() {
  return bookRecipes().length + 1;
}

function summaryHtml() {
  const recipes = bookRecipes();
  const parts = bookStations().map((sid) => {
    const def = DATA.STATIONS[sid];
    const items = recipes
      .map((id, i) => ({ id, n: i + 1 }))
      .filter((x) => DATA.recipes[x.id].station === sid)
      .map((x) => `<li><button type="button" class="book-toc-link" data-action="book-goto" data-page="${x.n}"><span>${DATA.recipes[x.id].icone} ${DATA.recipes[x.id].nom}</span><span class="book-toc-dots" aria-hidden="true"></span><span class="num">${x.n + 1}</span></button></li>`)
      .join('');
    return items ? `<h3 class="book-h3">${def.icone} ${def.nom}</h3><ul class="book-toc">${items}</ul>` : '';
  }).join('');
  return `
    <h2 class="book-title">Livre de recette</h2>
    <p class="book-sub">de ${familyLabelHtml()}</p>
    ${parts}`;
}

function recipePageHtml(id) {
  const r = DATA.recipes[id];
  const sdef = DATA.STATIONS[r.station];
  const status = recipeStatus(state, id);
  const lines = status.lignes
    .map((l) => {
      const what = l.eau
        ? `${formatQty(l.qte)} L d'eau`
        : `${formatQty(l.qte)} ${l.options.map((it) => `${DATA.items[it].icone} ${DATA.items[it].nom.toLowerCase()}`).join(' ou ')}`;
      const have = l.eau ? `${formatNumber(l.have)} L` : `${formatQty(l.have)} en stock`;
      return `<li class="${l.ok ? 'ok' : 'missing'}"><span aria-hidden="true">${l.ok ? '✅' : '❌'}</span> <span>${what}</span> <span class="book-note">(${have})</span></li>`;
    })
    .join('');
  let reason = '';
  if (status.code === 'verrouillee') {
    const n = DATA.techtree.noeuds[status.noeud];
    reason = `🔒 À débloquer dans l'Arbre des technologies${n ? ` : ${n.icone} ${n.nom}` : ''}.`;
  } else if (status.code === 'absente') reason = `Construis d'abord ${sdef.article} ${sdef.nom}.`;
  else if (status.code === 'occupee') reason = `${sdef.nom} : ${sdef.article === 'la' ? 'occupée' : 'occupé'}, attends la fin de la préparation.`;
  else if (status.code === 'manque') reason = 'Il manque des ingrédients.';
  return `
    <div class="book-dish" aria-hidden="true">${r.icone}</div>
    <h2 class="book-title">${r.nom}</h2>
    <p class="book-sub">${sdef.icone} ${sdef.nom} · ${formatNumber(recipeTime(state, id))} s${sdef.electrique ? ' · électrique' : ''}</p>
    <p class="book-meta">${recipeMeta(id)}</p>
    <h3 class="book-h3">Ingrédients</h3>
    <ul class="book-ingredients">${lines}</ul>
    ${reason ? `<p class="book-reason">${reason}</p>` : ''}
    <button type="button" class="btn${status.ok ? ' primary' : ''} book-prepare" data-action="start-recipe" data-recipe="${id}"${status.ok ? '' : ' disabled'}>Préparer</button>`;
}

function pageHtml(n) {
  const recipes = bookRecipes();
  const body = n === 0 ? summaryHtml() : recipePageHtml(recipes[n - 1]);
  return `${body}<span class="book-folio num" aria-hidden="true">${n + 1}</span>`;
}

function navHtml() {
  const total = pageCount();
  return `
    <button type="button" class="btn book-turn" data-action="book-prev" aria-label="Page précédente"${page === 0 ? ' disabled' : ''}>‹</button>
    <span class="book-count num" aria-live="polite">Page ${page + 1} / ${total}</span>
    <button type="button" class="btn book-turn" data-action="book-next" aria-label="Page suivante"${page >= total - 1 ? ' disabled' : ''}>›</button>`;
}

function bookEl() {
  return document.querySelector('#modal-root .book');
}

export function openRecipeBook() {
  tel('modal', 'book');
  page = Math.min(page, pageCount() - 1);
  flipping = false;
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop book-backdrop" data-action="close-modal">
      <div class="book" role="dialog" aria-modal="true" aria-label="Livre de recette" data-stop-propagation>
        <button type="button" class="book-close" data-action="close-modal" aria-label="Fermer le livre" title="Fermer">✕</button>
        <div class="book-pages">
          <section class="book-page" id="book-page"></section>
        </div>
        <div class="book-nav"></div>
      </div>
    </div>`;
  bindSwipe(document.querySelector('#modal-root .book-pages'));
  renderRecipeBook();
  document.querySelector('#modal-root .book-turn:not([disabled])')?.focus();
}

// Appelé à chaque rendu : la page affichée suit le jeu (stocks, atelier occupé…).
export function renderRecipeBook() {
  const el = bookEl();
  if (!el) return;
  if (page > pageCount() - 1) page = pageCount() - 1;
  if (!flipping) morph(el.querySelector('#book-page'), pageHtml(page));
  morph(el.querySelector('.book-nav'), navHtml());
}

// Tourne la page : la page qui part pivote autour de la reliure (à gauche) et laisse voir la
// suivante ; en arrière, la page précédente revient se poser par-dessus.
function turnTo(n) {
  const el = bookEl();
  if (!el || flipping || n === page || n < 0 || n > pageCount() - 1) return;
  const forward = n > page;
  const base = el.querySelector('#book-page');
  const old = pageHtml(page);
  page = n;
  if (REDUCED_MOTION && REDUCED_MOTION.matches) {
    renderRecipeBook();
    return;
  }
  flipping = true;
  const leaf = document.createElement('section');
  leaf.className = `book-page book-leaf ${forward ? 'turn-next' : 'turn-prev'}`;
  leaf.setAttribute('aria-hidden', 'true');
  if (forward) {
    // la nouvelle page est dessous, l'ancienne s'envole par-dessus
    morph(base, pageHtml(page));
    morph(leaf, old);
  } else {
    // l'ancienne reste dessous, la précédente revient par-dessus
    morph(leaf, pageHtml(page));
  }
  el.querySelector('.book-pages').appendChild(leaf);
  morph(el.querySelector('.book-nav'), navHtml());
  setTimeout(() => {
    leaf.remove();
    flipping = false;
    renderRecipeBook();
  }, FLIP_MS);
}

// Glisser le doigt vers la gauche : page suivante ; vers la droite : page précédente.
function bindSwipe(zone) {
  let x0 = null;
  let y0 = 0;
  zone.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; });
  zone.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    const dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    turnTo(page + (dx < 0 ? 1 : -1));
  });
  zone.addEventListener('pointercancel', () => { x0 = null; });
}

document.addEventListener('keydown', (e) => {
  if (!bookEl() || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
  e.preventDefault();
  turnTo(page + (e.key === 'ArrowRight' ? 1 : -1));
});

registerActions({
  'book-open': () => {
    openRecipeBook();
  },
  'book-next': () => {
    turnTo(page + 1);
  },
  'book-prev': () => {
    turnTo(page - 1);
  },
  'book-goto': (target) => {
    turnTo(Number(target.dataset.page));
  },
});
