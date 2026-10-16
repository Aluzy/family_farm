import { DATA } from '../engine/catalog.js';
import { clockHours, nightActive } from '../engine/clock.js';
import { weekdayIndex } from '../engine/format.js';
import { mainCharacter, setupPending } from '../engine/depart.js';
import { memberPerso } from '../engine/family.js';
import { hasTool } from '../engine/outils.js';
import { rockGone, treeGone } from '../engine/crops.js';
import { buyCompany, companyIds, companyPlan, sellInTown, setCompanyQuota, townSellList } from '../engine/entreprises.js';
import { axeMode, godMode, hoeMode, pickMode, rodMode, state } from './store.js';
import { chopFromStage, mineFromStage } from './outils.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { showToast } from './toasts.js';

/* ---------- les autres cartes, dans la page du jeu ---------- */

// La carte de transition, la ville, la montagne, la plage, les grottes (js/ville-carte.js) et
// l'infra-monde (js/infra-monde.js) s'affichent ici, dans #map-stage, à la place de la carte de
// la ferme : la carte du joueur, la date et l'argent, le menu latéral, la barre d'outils et les
// fenêtres restent là, et le jeu continue de tourner (le temps passe, les entreprises
// produisent, le repas, la nuit). C'est le personnage principal de la partie qui s'y promène.
//
// Les cartes passent par FermeHote (ci-dessous) : l'heure, le personnage, le marché, les
// entreprises, les outils (la hache et la pioche en main : couper, piocher), les messages, et go(cible) pour changer de carte (« jeu.html… » : la
// ferme ; « ville-carte.html?carte=… », « infra-monde.html » : une autre carte). L'adresse de la
// page suit (jeu.html?carte=…) : recharger la page y ramène.

const CARTES = {
  'ville-carte.html': () => window.VilleCarte,
  'infra-monde.html': () => window.InfraMonde,
};
let active = null;          // { page, search } de la carte affichée, ou null (la ferme)

export function excursionActive() {
  return !!active;
}

function mapEl() {
  return document.getElementById('map-stage');
}

// L'heure du jeu pour les cartes : { jour, semaine (0 : lundi), heure, nuit, enfants }.
function maintenant() {
  const enfants = state.famille.membres.filter((m) => m.enfant).map((m) => ({ id: m.id, perso: memberPerso(m) }));
  return { jour: state.day, semaine: weekdayIndex(state.day), heure: clockHours(state), nuit: nightActive(state), enfants };
}

const JOURS = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'];
function texte(m) {
  if (!m) return '';
  const h = Math.floor(m.heure), min = Math.floor((m.heure - h) * 4) * 15;
  return `${JOURS[m.semaine]} ${h} h ${String(min).padStart(2, '0')}${m.nuit ? ' · nuit' : ''}`;
}

// Ce que la ferme peut vendre en ville (et à quel prix), ses pièces, ses entreprises.
function vitrine() {
  const owned = (state.ville && state.ville.entreprises) || {};
  return {
    pieces: Math.floor(state.pieces),
    vente: townSellList(state).map((r) => ({ ...r, nom: DATA.items[r.item].nom, icone: DATA.items[r.item].icone })),
    entreprises: companyIds().map((id) => {
      const d = DATA.VILLE.ENTREPRISES.LISTE[id], c = owned[id];
      return {
        id, nom: d.nom, icone: d.icone, prix: d.prix, texte: d.texte, par: d.par, intrantNom: d.intrantNom,
        produit: d.produit, prixProduit: d.prixProduit, quotaMax: d.quotaMax, heure: DATA.VILLE.ENTREPRISES.HEURE,
        achetee: !!c, quota: c ? c.quota : d.quota, dispo: c ? companyPlan(state, id).dispo : null, bilan: c ? c.bilan : null,
      };
    }),
  };
}

// Une action du joueur sur une carte : passée au moteur, sauvegardée, l'écran rafraîchi.
function joue(r) {
  if (r && !r.ok && r.error) showToast(r.error);
  persistState();
  refresh();
  return r;
}

function parse(cible) {
  const [page, query = ''] = String(cible || '').split('?');
  return { page: page.replace(/^.*\//, ''), search: query ? '?' + query : '' };
}

// Montre la carte `page` (search : ses paramètres), à la place de celle de la ferme.
function ouvre(page, search) {
  const lib = CARTES[page] && CARTES[page]();
  const el = mapEl();
  if (!lib || !el) return false;
  for (const p of Object.keys(CARTES)) if (p !== page && CARTES[p]() && CARTES[p]().stop) CARTES[p]().stop();
  el.querySelectorAll('.map-retour').forEach((b) => b.remove());
  active = { page, search };
  el.hidden = false;
  el.dataset.carte = page === 'infra-monde.html' ? 'infra' : (new URLSearchParams(search).get('carte') || 'ville');
  document.body.classList.add('en-excursion');
  history.replaceState(null, '', page === 'infra-monde.html' ? 'jeu.html?carte=infra' : 'jeu.html' + search);
  refresh();
  lib.start(el, search);
  // l'infra-monde n'a pas de chemin de retour : un bouton
  if (page === 'infra-monde.html') {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn map-retour';
    b.textContent = '🌳 Retour à la ferme';
    b.onclick = () => rentre(false);
    el.appendChild(b);
  }
  return true;
}

// Retour à la ferme : `est` : le personnage arrive au bout du chemin de l'est.
function rentre(est = true) {
  for (const p of Object.keys(CARTES)) { const lib = CARTES[p](); if (lib && lib.stop) lib.stop(); }
  active = null;
  const el = mapEl();
  if (el) { el.hidden = true; delete el.dataset.carte; el.querySelectorAll('.map-retour').forEach((b) => b.remove()); }
  document.body.classList.remove('en-excursion');
  history.replaceState(null, '', 'jeu.html' + (est ? '?arrivee=est' : ''));
  refresh();
  if (est && window.FarmStage && window.FarmStage.arriveEast) window.FarmStage.arriveEast();
}

// Changer de carte (une flèche, le train, un lien) : « jeu.html… » ramène à la ferme.
export function go(cible) {
  const { page, search } = parse(cible);
  if (page === 'jeu.html' || page === '') { rentre(new URLSearchParams(search).get('arrivee') === 'est'); return; }
  if (!ouvre(page, search)) window.location.href = cible;
}

window.FermeHote = {
  maintenant,
  perso: () => memberPerso(mainCharacter(state)),
  go,
  vitrine,
  vendre: (item, n) => joue(sellInTown(state, item, n)),
  acheter: (id) => joue(buyCompany(state, id)),
  quota: (id, q) => joue(setCompanyQuota(state, id, q)),
  outil: (id) => hasTool(state, id),
  // l'outil en main (barre d'outils) : 'hache', 'pioche', 'houe', 'canne' ou null
  enMain: () => (axeMode ? 'hache' : pickMode ? 'pioche' : hoeMode ? 'houe' : rodMode ? 'canne' : null),
  // les arbres et les rochers des autres cartes (identifiants « <carte>:x,y ») : comme ceux de
  // la ferme, abattus ou cassés en trois coups, ils reviennent quelques jours plus tard
  abattu: (id) => treeGone(state, id),
  casse: (id) => rockGone(state, id),
  couper: (id) => chopFromStage(id),
  piocher: (id) => mineFromStage(id),
  say: (t) => showToast(t),
  // le god mode : les cartes ne font plus marcher le personnage (un toucher l'y pose)
  god: () => godMode,
};

/* ---------- le god mode : un menu des cartes ---------- */

// Toutes les cartes (et quelques endroits), pour y aller d'un coup (Options : god mode).
const DESTINATIONS = [
  ['🌾 La ferme', 'jeu.html'],
  ['🛤️ Le chemin vers la ville', 'ville-carte.html?carte=transition&arrivee=ferme'],
  ['🏠 La maison rouge (voisins)', 'ville-carte.html?carte=interieur&maison=maison_rouge'],
  ['🏠 La maison grise (voisins)', 'ville-carte.html?carte=interieur&maison=maison_ardoise'],
  ['🏙️ La ville (route de la ferme)', 'ville-carte.html?carte=ville&arrivee=ferme'],
  ['🚉 La ville (la gare)', 'ville-carte.html?carte=ville&arrivee=gare'],
  ['⛰️ La montagne', 'ville-carte.html?carte=montagne&arrivee=gare'],
  ['⛏️ La grotte, niveau 1', 'ville-carte.html?carte=grotte&grotte=30&niveau=1&arrivee=haut'],
  ['⛏️ La grotte, niveau 4', 'ville-carte.html?carte=grotte&grotte=30&niveau=4&arrivee=haut'],
  ['⛏️ La grotte, niveau 8', 'ville-carte.html?carte=grotte&grotte=30&niveau=8&arrivee=haut'],
  ['🏖️ La plage', 'ville-carte.html?carte=plage&arrivee=gare'],
  ['🌈 L\'infra-monde', 'infra-monde.html'],
];

// La barre du god mode (en haut de l'écran) : le menu des cartes ; rien sans le god mode.
export function syncGodBar() {
  let bar = document.getElementById('god-bar');
  if (!godMode) { if (bar) bar.remove(); return; }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'god-bar';
    bar.innerHTML = '<label><span aria-hidden="true">⚡</span><select aria-label="God mode : aller à une carte"></select></label>';
    const sel = bar.querySelector('select');
    sel.innerHTML = '<option value="">God mode : aller à…</option>' + DESTINATIONS.map(([t, c]) => `<option value="${c}">${t}</option>`).join('');
    sel.addEventListener('change', () => {
      const c = sel.value;
      sel.value = '';
      sel.blur();
      if (!c) return;
      if (nightActive(state)) { showToast('🌙 La nuit, la famille reste à la maison.'); return; }
      go(c);
    });
    document.body.appendChild(bar);
  }
}
window.HorlogeSortie = { maintenant, texte, JOURS_ECOLE: [0, 1, 3, 4] };

// Les liens vers une autre carte (« Se promener en ville ») : dans la page.
document.addEventListener('click', (e) => {
  const a = e.target && e.target.closest ? e.target.closest('a[href^="ville-carte.html"], a[href^="infra-monde.html"]') : null;
  if (!a || !CARTES[parse(a.getAttribute('href')).page]()) return;
  e.preventDefault();
  go(a.getAttribute('href'));
}, true);

// La nuit (22 h, ou « Dormir ») se passe à la maison : retour à la ferme.
setInterval(() => {
  if (!active) return;
  if (nightActive(state)) { rentre(false); showToast('🌙 La nuit tombe : retour à la maison.'); }
}, 500);

// Au chargement, l'adresse jeu.html?carte=… rouvre cette carte (après la mise en place).
export function resumeExcursion() {
  syncGodBar();
  const p = new URLSearchParams(window.location.search);
  const carte = p.get('carte');
  if (!carte || setupPending(state) || nightActive(state)) {
    if (carte) history.replaceState(null, '', 'jeu.html');
    return;
  }
  if (carte === 'infra') { p.delete('carte'); go('infra-monde.html' + (p.toString() ? '?' + p : '')); } else go('ville-carte.html' + window.location.search);
}
