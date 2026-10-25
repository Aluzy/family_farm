import { DATA } from '../engine/catalog.js';
import { escapeHtml } from '../engine/format.js';
import { setupPending } from '../engine/depart.js';
import {
  CATEGORIES, entreeEncyclopedie, lirePage, majEncyclopedie, nombreEntrees, noterEncyclopedie,
  nouveautesEncyclopedie, pageConnue, pageNouvelle, pagesConnues,
} from '../engine/encyclopedie.js';
import { state } from './store.js';
import { tel } from './consent.js';
import { persistState } from './storage.js';
import { showToast } from './toasts.js';
import { registerActions } from './actions.js';
import { livre } from './livre.js';
import { familyLabelHtml } from './depart.js';
import { HAMEAUX, hameauxVus } from '../engine/monde-hameaux.js';

/* ---------- l'Encyclopédie, un livre qui se remplit au fil de la partie ----------
   Comme le Livre de recette (js/ui/livre.js) : une couverture, une page à la fois. Les pages,
   dans l'ordre : le sommaire (les catégories, ce qui est découvert, les nouvelles pages), puis
   pour chaque catégorie sa page (la liste de ses entrées, « ? ? ? » pour celles qui restent à
   découvrir) suivie d'une page par entrée découverte, avec ses liens « Voir aussi », comme un
   wiki. Une page se découvre quand une de ses conditions est remplie (js/engine/encyclopedie.js) :
   un message le dit, et elle reste « Nouveau » tant qu'elle n'a pas été lue. */

const MAJ_MS = 500; // au plus une mise à jour des découvertes par demi-seconde
let derniereMaj = 0;

// Les pages du livre : { sorte: 'sommaire' | 'categorie' | 'entree', id }.
function pagesLivre() {
  const out = [{ sorte: 'sommaire' }];
  for (const c of CATEGORIES) {
    out.push({ sorte: 'categorie', id: c.id });
    for (const id of pagesConnues(state, c.id)) out.push({ sorte: 'entree', id });
  }
  return out;
}

const numero = (sorte, id) => pagesLivre().findIndex((p) => p.sorte === sorte && p.id === id);

// Un lien vers une entrée : la page si elle est découverte, sinon « ? ? ? ».
function lien(id, classe = 'chip') {
  const e = entreeEncyclopedie(id);
  if (!e) return '';
  if (!pageConnue(state, id)) return `<span class="${classe} encyclo-inconnue" title="Pas encore découvert">? ? ?</span>`;
  const neuf = pageNouvelle(state, id) ? ' <span class="encyclo-neuf">Nouveau</span>' : '';
  return `<button type="button" class="${classe} encyclo-lien" data-action="encyclo-page" data-entree="${id}">${escapeHtml(e.terme)}${neuf}</button>`;
}

function sommaireHtml() {
  const total = nombreEntrees();
  const connues = pagesConnues(state).length;
  const nouvelles = nouveautesEncyclopedie(state);
  const cats = CATEGORIES.map((c) => {
    const n = pagesConnues(state, c.id).length;
    return `<li><button type="button" class="book-toc-link" data-action="book-goto" data-page="${numero('categorie', c.id)}"><span>${c.icone} ${escapeHtml(c.nom)}</span><span class="book-toc-dots" aria-hidden="true"></span><span class="num">${n} / ${c.entrees.length}</span></button></li>`;
  }).join('');
  return `
    <h2 class="book-title">Encyclopédie</h2>
    <p class="book-sub">de ${familyLabelHtml()}</p>
    <div class="encyclo-jauge" role="img" aria-label="${connues} pages découvertes sur ${total}"><span style="width:${Math.round((connues / total) * 100)}%"></span></div>
    <p class="encyclo-total num">${connues} / ${total} pages découvertes</p>
    <h3 class="book-h3">Sommaire</h3>
    <ul class="book-toc">${cats}</ul>
    ${nouvelles.length ? `<h3 class="book-h3">✨ Nouvelles pages</h3><div class="encyclo-liens">${nouvelles.map((id) => lien(id)).join('')}</div>` : ''}
    <p class="encyclo-astuce">Les pages se découvrent en jouant : un objet obtenu, un outil, un bâtiment, une carte visitée…</p>`;
}

function categorieHtml(id) {
  const c = CATEGORIES.find((x) => x.id === id);
  const n = pagesConnues(state, id).length;
  // les pages découvertes d'abord, puis celles qui restent à découvrir
  const ids = c.entrees.map((e) => e.id);
  const items = [...ids.filter((x) => pageConnue(state, x)), ...ids.filter((x) => !pageConnue(state, x))]
    .map((x) => `<li>${lien(x, 'encyclo-item')}</li>`).join('');
  return `
    <div class="book-dish" aria-hidden="true">${c.icone}</div>
    <h2 class="book-title">${escapeHtml(c.nom)}</h2>
    <p class="book-sub num">${n} / ${c.entrees.length} découvertes</p>
    <ul class="encyclo-liste">${items}</ul>
    <p class="encyclo-retour"><button type="button" class="encyclo-lien-texte" data-action="book-goto" data-page="0">↩ Sommaire</button></p>`;
}

function entreeHtml(id) {
  const e = entreeEncyclopedie(id);
  const c = CATEGORIES.find((x) => x.id === e.categorie);
  const liens = e.liens.map((l) => lien(l)).join('');
  return `
    <div class="book-dish" aria-hidden="true">${iconeEntree(e) || c.icone}</div>
    <p class="encyclo-categorie"><button type="button" class="encyclo-lien-texte" data-action="book-goto" data-page="${numero('categorie', c.id)}">${c.icone} ${escapeHtml(c.nom)}</button></p>
    <h2 class="book-title">${escapeHtml(e.terme)}</h2>
    <p class="encyclo-texte">${escapeHtml(e.description)}</p>
    ${id === 'hameaux' ? hameauxHtml() : ''}
    ${liens ? `<h3 class="book-h3">Voir aussi</h3><div class="encyclo-liens">${liens}</div>` : ''}`;
}

// La page « Les hameaux » : ceux où l'on est allé (state.monde.hameaux), dans l'ordre de leur découverte.
function hameauxHtml() {
  const vus = Object.values(hameauxVus(state)).sort((a, b) => a.jour - b.jour);
  if (!vus.length) return '';
  const li = vus.map((h) => `<li><strong>${escapeHtml(h.nom)}</strong>, un hameau ${escapeHtml((HAMEAUX.STYLES[h.style] || HAMEAUX.STYLES.prairie).nom)} <span class="muted">(jour ${h.jour})</span></li>`).join('');
  return `<h3 class="book-h3">Ceux qu'on a vus</h3><ul class="encyclo-hameaux">${li}</ul>`;
}

// L'icône d'une entrée : celle du premier objet (ou de la première culture) qui la fait découvrir.
function iconeEntree(e) {
  for (const cond of e.decouverte) {
    const [sorte, v] = cond.split(':');
    const o = (sorte === 'objet' || sorte === 'culture' || sorte === 'recette') && DATA.OBJETS[v];
    if (o && o.icone) return o.icone;
  }
  return '';
}

function pageHtml(n) {
  const p = pagesLivre()[n] || { sorte: 'sommaire' };
  if (p.sorte === 'categorie') return categorieHtml(p.id);
  if (p.sorte === 'entree') return entreeHtml(p.id);
  return sommaireHtml();
}

// Le livre, fait au premier usage (les modules de l'interface se chargent l'un l'autre).
let livreEncyclo = null;
const encyclo = () => livreEncyclo || (livreEncyclo = livre({
  id: 'encyclopedie',
  label: 'Encyclopédie',
  className: 'encyclo',
  pages: () => pagesLivre().length,
  pageHtml,
  // une page d'entrée affichée est lue : elle n'est plus « Nouveau »
  aLaPage: (n) => {
    const p = pagesLivre()[n];
    if (p && p.sorte === 'entree' && pageNouvelle(state, p.id) && lirePage(state, p.id)) persistState();
  },
}));

export function openEncyclopedie(id = null) {
  tel('modal', 'encyclopedie');
  majDecouvertes(true);
  encyclo().ouvrir(id ? Math.max(0, numero('entree', id)) : 0);
}

// Les nouvelles découvertes : un message, la sauvegarde. Pas pendant l'écran d'accueil d'une
// nouvelle partie (la famille n'est pas encore là).
function majDecouvertes(force = false) {
  if (!state || setupPending(state)) return;
  const t = Date.now();
  if (!force && t - derniereMaj < MAJ_MS) return;
  derniereMaj = t;
  const neuves = majEncyclopedie(state);
  if (!neuves.length) return;
  persistState();
  const noms = neuves.map((id) => entreeEncyclopedie(id).terme);
  showToast(neuves.length === 1
    ? `📖 Nouvelle page dans l'Encyclopédie : ${noms[0]}`
    : `📖 ${neuves.length} nouvelles pages dans l'Encyclopédie : ${noms.slice(0, 3).join(', ')}${neuves.length > 3 ? '…' : ''}`);
}

// Le nombre de pages pas encore lues (le badge du menu).
export function encyclopedieNouveautes() {
  return state ? nouveautesEncyclopedie(state).length : 0;
}

// Une carte visitée (js/ui/excursion.js) : ses pages se découvrent.
export function encyclopedieCarte(carte) {
  if (!state) return;
  noterEncyclopedie(state, `carte:${carte}`);
  majDecouvertes(true);
}

// Une bête du grand monde vue pour la première fois (js/carte/ferme/faune-monde.js) : sa page se
// découvre (« faune:<espèce> »). Renvoie true si c'est nouveau.
export function encyclopedieFaune(espece) {
  if (!state) return false;
  const e = state.encyclopedie && state.encyclopedie.evenements;
  if (e && e[`faune:${espece}`]) return false;
  noterEncyclopedie(state, `faune:${espece}`);
  majDecouvertes(true);
  return true;
}

// Un hameau du grand monde vu pour la première fois (js/ui/stage.js) : la page « Les hameaux » se
// découvre (la condition « hameau » lit state.monde.hameaux), ou se complète.
export function encyclopedieHameau() {
  if (!state) return;
  majDecouvertes(true);
}

// Appelé à chaque rendu : les découvertes, puis la page ouverte.
export function renderEncyclopedie() {
  majDecouvertes();
  encyclo().rendu();
}

registerActions({
  'encyclo-open': () => {
    openEncyclopedie();
  },
  'encyclo-page': (target) => {
    const n = numero('entree', target.dataset.entree);
    if (n >= 0) encyclo().tourner(n);
  },
});
