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
import { focusModal, openModal } from './modal.js';

/* ---------- Essai : le Livre de recette comme un vrai livre ----------
   Une page à la fois, dans une couverture de cuir ; on tourne les pages avec ‹ ›, en
   glissant le doigt, ou avec les flèches du clavier. Page 1 : le sommaire (un lien par
   recette) ; ensuite une recette par page, avec ses ingrédients et « Préparer » (la même
   action que la liste du Livre de recette). Le livre se met à jour à chaque rendu
   (renderRecipeBook, appelé par render()).
   Plus tard, il s'ouvrira depuis la bibliothèque d'une vue en pixel art de la maison. */

const FLIP_MS = 450;
const LIVRES = {}; // les livres, par id (le livre ouvert : livreOuvert)

function bookRecipes() {
  const ids = bookStations();
  return Object.keys(DATA.RECETTES)
    .filter((id) => !DATA.RECETTES[id].horsLivre)
    .sort((a, b) => ids.indexOf(DATA.RECETTES[a].station) - ids.indexOf(DATA.RECETTES[b].station));
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
      .filter((x) => DATA.RECETTES[x.id].station === sid)
      .map((x) => `<li><button type="button" class="book-toc-link" data-action="book-goto" data-page="${x.n}"><span>${DATA.RECETTES[x.id].icone} ${DATA.RECETTES[x.id].nom}</span><span class="book-toc-dots" aria-hidden="true"></span><span class="num">${x.n + 1}</span></button></li>`)
      .join('');
    return items ? `<h3 class="book-h3">${def.icone} ${def.nom}</h3><ul class="book-toc">${items}</ul>` : '';
  }).join('');
  return `
    <h2 class="book-title">Livre de recette</h2>
    <p class="book-sub">de ${familyLabelHtml()}</p>
    ${parts}`;
}

function recipePageHtml(id) {
  const r = DATA.RECETTES[id];
  const sdef = DATA.STATIONS[r.station];
  const status = recipeStatus(state, id);
  const lines = status.lignes
    .map((l) => {
      const what = l.eau
        ? `${formatQty(l.qte)} L d'eau`
        : `${formatQty(l.qte)} ${l.options.map((it) => `${DATA.OBJETS[it].icone} ${DATA.OBJETS[it].nom.toLowerCase()}`).join(' ou ')}`;
      const have = l.eau ? `${formatNumber(l.have)} L` : `${formatQty(l.have)} en stock`;
      return `<li class="${l.ok ? 'ok' : 'missing'}"><span aria-hidden="true">${l.ok ? '✅' : '❌'}</span> <span>${what}</span> <span class="book-note">(${have})</span></li>`;
    })
    .join('');
  let reason = '';
  if (status.code === 'verrouillee') {
    const n = DATA.ARBRE.noeuds[status.noeud];
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

// Le Livre de recette : le sommaire, puis une recette par page.
const recettes = livre({
  id: 'recettes',
  label: 'Livre de recette',
  pages: pageCount,
  pageHtml: (n) => (n === 0 ? summaryHtml() : recipePageHtml(bookRecipes()[n - 1])),
});

export function openRecipeBook() {
  tel('modal', 'book');
  recettes.ouvrir();
}

// Appelé à chaque rendu : la page affichée suit le jeu (stocks, atelier occupé…).
export function renderRecipeBook() {
  recettes.rendu();
}

/* ---------- un livre : pages tournées, glissées, au clavier ----------
   livre({ id, label, className, pages(), pageHtml(n), aLaPage(n) }) : un livre ouvert dans
   #modal-root (une seule fenêtre à la fois), `pages()` pages, la page n écrite par pageHtml(n) ;
   aLaPage(n) est appelé quand la page n s'affiche (l'encyclopédie y marque la page lue).
   Renvoie { ouvrir, rendu, tourner, page, aller }. */
export function livre({ id, label, className = '', pages, pageHtml, aLaPage = null }) {
  let page = 0; // page affichée (0 : sommaire)
  let flipping = false;
  const el = () => document.querySelector(`#modal-root .book[data-livre="${id}"]`);
  const html = (n) => `${pageHtml(n)}<span class="book-folio num" aria-hidden="true">${n + 1}</span>`;
  const nav = () => {
    const total = pages();
    return `
    <button type="button" class="btn book-turn" data-action="book-prev" aria-label="Page précédente"${page === 0 ? ' disabled' : ''}>‹</button>
    <span class="book-count num" aria-live="polite">Page ${page + 1} / ${total}</span>
    <button type="button" class="btn book-turn" data-action="book-next" aria-label="Page suivante"${page >= total - 1 ? ' disabled' : ''}>›</button>`;
  };
  const vu = () => { if (aLaPage) aLaPage(page); };

  function rendu() {
    const box = el();
    if (!box) return;
    if (page > pages() - 1) page = pages() - 1;
    if (!flipping) morph(box.querySelector('#book-page'), html(page));
    morph(box.querySelector('.book-nav'), nav());
  }

  function ouvrir(n = page) {
    page = Math.max(0, Math.min(n, pages() - 1));
    flipping = false;
    openModal(`
    <button type="button" class="book-close" data-action="close-modal" aria-label="Fermer" title="Fermer">✕</button>
    <div class="book-pages">
      <section class="book-page" id="book-page"></section>
    </div>
    <div class="book-nav"></div>`, { label, className: `book${className ? ` ${className}` : ''}`, backdropClass: 'book-backdrop', focus: false }).dataset.livre = id;
    bindSwipe(document.querySelector('#modal-root .book-pages'), (d) => tourner(page + d));
    vu();
    rendu();
    focusModal('.book-turn:not([disabled])');
  }

  // Tourne la page : la page qui part pivote autour de la reliure (à gauche) et laisse voir la
  // suivante ; en arrière, la page précédente revient se poser par-dessus.
  function tourner(n) {
    const box = el();
    if (!box || flipping || n === page || n < 0 || n > pages() - 1) return;
    const forward = n > page;
    const base = box.querySelector('#book-page');
    const old = html(page);
    page = n;
    vu();
    if (REDUCED_MOTION && REDUCED_MOTION.matches) {
      rendu();
      base.scrollTop = 0;
      return;
    }
    flipping = true;
    const leaf = document.createElement('section');
    leaf.className = `book-page book-leaf ${forward ? 'turn-next' : 'turn-prev'}`;
    leaf.setAttribute('aria-hidden', 'true');
    if (forward) {
      // la nouvelle page est dessous, l'ancienne s'envole par-dessus
      morph(base, html(page));
      morph(leaf, old);
    } else {
      // l'ancienne reste dessous, la précédente revient par-dessus
      morph(leaf, html(page));
    }
    base.scrollTop = 0;
    box.querySelector('.book-pages').appendChild(leaf);
    morph(box.querySelector('.book-nav'), nav());
    setTimeout(() => {
      leaf.remove();
      flipping = false;
      rendu();
    }, FLIP_MS);
  }

  const l = { ouvrir, rendu, tourner, page: () => page, ouvert: () => !!el() };
  LIVRES[id] = l;
  return l;
}

// Le livre ouvert, ou null.
function livreOuvert() {
  const box = document.querySelector('#modal-root .book[data-livre]');
  return box ? LIVRES[box.dataset.livre] || null : null;
}

// Glisser le doigt vers la gauche : page suivante ; vers la droite : page précédente.
function bindSwipe(zone, tourne) {
  let x0 = null;
  let y0 = 0;
  zone.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; });
  zone.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    const dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    tourne(dx < 0 ? 1 : -1);
  });
  zone.addEventListener('pointercancel', () => { x0 = null; });
}

document.addEventListener('keydown', (e) => {
  const l = livreOuvert();
  if (!l || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
  e.preventDefault();
  l.tourner(l.page() + (e.key === 'ArrowRight' ? 1 : -1));
});

registerActions({
  'book-open': () => {
    openRecipeBook();
  },
  'book-next': () => {
    const l = livreOuvert();
    if (l) l.tourner(l.page() + 1);
  },
  'book-prev': () => {
    const l = livreOuvert();
    if (l) l.tourner(l.page() - 1);
  },
  'book-goto': (target) => {
    const l = livreOuvert();
    if (l) l.tourner(Number(target.dataset.page));
  },
});
