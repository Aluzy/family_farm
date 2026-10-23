import { DATA } from '../engine/catalog.js';
import { clockHours, nightActive } from '../engine/clock.js';
import { weekdayIndex } from '../engine/format.js';
import { mainCharacter, setupPending } from '../engine/depart.js';
import { memberPerso } from '../engine/family.js';
import { depositOreNotebook, enSelle, hasTool, hitsNeeded, mineOre, morceauxDe } from '../engine/outils.js';
import { techFlag } from '../engine/techtree.js';
import { rockGone, treeGone } from '../engine/crops.js';
import { addItem } from '../engine/inventory.js';
import { buyInShop, negoceOffres, sellToNegoce, shopView } from '../engine/ville.js';
import { economie, economieVue } from '../engine/economie.js';
import { buyCompany, companyIds, companyPlan, sellInTown, setCompanyQuota, townSellList } from '../engine/entreprises.js';
import { axeMode, cartesOuvertes, godMode, hoeMode, pickMode, rodMode, state } from './store.js';
import { chopFromStage, fishFromStage, mineFromStage, morceauFromStage } from './outils.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { showToast } from './toasts.js';
import { closeModal, openModal } from './modal.js';
import { SOMMEIL_BLOQUEES, SOMMEIL_MESSAGE } from './actions.js';
import { asleep } from '../engine/night.js';
import { LIVREUR, ramasserTransition, ressourcesDuJour, transitionPlan, transitionPris, transitionSeed } from '../engine/transition.js';
import { assigneEmplois, immeubleFoyer, immeubleVue, livraison, voisinAbat, voisinFoyer, voisinsVue } from '../engine/voisins.js';
import { encyclopedieCarte } from './encyclopedie.js';

/* ---------- les autres cartes, dans la page du jeu ---------- */

// La carte de transition, la ville, la montagne, la plage, les grottes (js/ville-carte.js) et
// l'infra-monde (js/infra-monde.js) s'affichent ici, dans #map-stage, à la place de la carte de
// la ferme : la carte du joueur, la date et l'argent, le menu latéral, la barre d'outils et les
// fenêtres restent là, et le jeu continue de tourner (le temps passe, les entreprises
// produisent, le repas, la nuit). C'est le personnage principal de la partie qui s'y promène.
// Toutes ces cartes, et celle de la ferme, sont des scènes d'un seul jeu Phaser (js/carte/jeu.js) :
// le canvas passe de #farm-stage à #map-stage, la ferme s'endort et se réveille telle qu'on
// l'a laissée.
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
    vente: townSellList(state).map((r) => ({ ...r, nom: DATA.OBJETS[r.item].nom, icone: DATA.OBJETS[r.item].icone })),
    entreprises: companyIds().map((id) => {
      const d = DATA.VILLE.ENTREPRISES.LISTE[id], c = owned[id];
      return {
        id, nom: d.nom, icone: d.icone, prix: d.prix, texte: d.texte, par: d.par, intrantNom: d.intrantNom,
        produit: d.produit, prixProduit: d.prixProduit, quotaMax: d.quotaMax, heure: DATA.VILLE.ENTREPRISES.HEURE,
        achetee: !!c, quota: c ? c.quota : d.quota, dispo: c ? companyPlan(state, id).dispo : null, bilan: c ? c.bilan : null,
        // (ses comptes d'hier dans l'économie de la ville, js/engine/economie.js ; ta part)
        eco: (economie(state).bilan && economie(state).bilan.comptes[id]) || null, part: DATA.ECONOMIE.ENTREPRISES.PART,
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

// Le personnage dort : les actions de jeu des cartes suivent la même règle que les boutons de
// la ferme (SOMMEIL_BLOQUEES, js/ui/actions.js ; js/ui/events.js). La nuit seule n'empêche rien.
// `action` : le nom de l'action de la ferme qui fait la même chose (sans nom : refusée pendant
// le sommeil, comme couper, piocher et pêcher, js/ui/outils.js). Renvoie un refus, ou null.
function nuit(action) {
  if (!asleep(state) || (action && !SOMMEIL_BLOQUEES.has(action))) return null;
  const r = { ok: false, error: SOMMEIL_MESSAGE };
  showToast(r.error);
  return r;
}

// Les trouvailles de la montagne et de la plage (js/ville-carte.js, assets/faune.json) : chacune
// est un objet de l'inventaire du même nom (data/items.json, champ « trouvaille »), qui se garde
// et se vend. Les cueillettes (champ « cueillette ») se prennent de même : le champignon lumineux
// de la grotte, le morceau d'arbre de l'infra-monde (js/infra-monde.js).
const TROUVAILLES = Object.keys(DATA.OBJETS).filter((id) => DATA.OBJETS[id].trouvaille || DATA.OBJETS[id].cueillette);

// Une trouvaille ramassée : dans l'inventaire ({ ok, item, n } ou { ok: false }).
function ramasse(sorte) {
  const refus = nuit();
  if (refus) return refus;
  if (!TROUVAILLES.includes(sorte) || !DATA.OBJETS[sorte]) return joue({ ok: false, error: 'Trouvaille inconnue.' });
  addItem(state, sorte, 1);
  return joue({ ok: true, item: sorte, n: 1 });
}

// Le carnet des trouvailles d'avant (localStorage « ferme-trouvailles », quand rien n'entrait
// dans l'inventaire) : ce qu'il comptait y entre, une fois. { ammonite: 2, … }.
function verseTrouvailles(carnet) {
  const items = {};
  for (const sorte of TROUVAILLES) {
    const n = Math.floor(Number(carnet && carnet[sorte]) || 0);
    if (n > 0 && DATA.OBJETS[sorte]) { addItem(state, sorte, n); items[sorte] = n; }
  }
  return joue({ ok: true, items });
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
  if (lib.start(el, search) === false) { rentre(null); return false; }
  encyclopedieCarte(el.dataset.carte); // ses pages de l'Encyclopédie se découvrent
  // l'infra-monde n'a pas de chemin de retour : un bouton
  if (page === 'infra-monde.html') {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn map-retour';
    b.textContent = '🌳 Retour à la ferme';
    b.onclick = () => rentre(null);
    el.appendChild(b);
  }
  return true;
}

// Retour à la ferme : `arrivee` : le personnage arrive au bout du chemin de l'est (« est »),
// devant la porte de la mine (« mine »), ou là où il était (null).
function rentre(arrivee = null) {
  for (const p of Object.keys(CARTES)) { const lib = CARTES[p](); if (lib && lib.stop) lib.stop(); }
  active = null;
  const el = mapEl();
  if (el) { el.hidden = true; delete el.dataset.carte; el.querySelectorAll('.map-retour').forEach((b) => b.remove()); }
  document.body.classList.remove('en-excursion');
  const ou = ['est', 'mine'].includes(arrivee) ? arrivee : null;
  history.replaceState(null, '', 'jeu.html' + (ou ? '?arrivee=' + ou : ''));
  refresh();
  if (ou && window.FarmStage && window.FarmStage.arrive) window.FarmStage.arrive(ou);
}

// La carte `page` (search : ses paramètres) s'ouvre-t-elle ? Les autres cartes fermées
// (cartesOuvertes, DATA.CARTES.AUTRES) : seulement la mine de la ferme (la grotte « ferme »).
function permise(page, search) {
  if (!CARTES[page] || cartesOuvertes()) return true;
  const p = new URLSearchParams(search);
  return page === 'ville-carte.html' && p.get('carte') === 'grotte' && p.get('grotte') === 'ferme';
}

// Changer de carte (une flèche, le train, un lien) : « jeu.html… » ramène à la ferme.
// Sans Phaser (ou sans la carte), le joueur reste où il est, avec un message (les pages
// ville-carte.html et infra-monde.html ne font que ramener ici).
export function go(cible) {
  const { page, search } = parse(cible);
  if (page === 'jeu.html' || page === '') { rentre(new URLSearchParams(search).get('arrivee')); return; }
  if (!permise(page, search)) {
    if (!active) history.replaceState(null, '', 'jeu.html');
    showToast('🗺️ Cette carte n\'est pas encore ouverte.');
    return;
  }
  if (ouvre(page, search)) return;
  if (!CARTES[page]) { window.location.href = cible; return; }
  if (active) rentre(null);
  else history.replaceState(null, '', 'jeu.html');
  showToast('🗺️ Cette carte ne peut pas s\'afficher sur cet appareil.');
}

window.FermeHote = {
  maintenant,
  perso: () => memberPerso(mainCharacter(state)),
  go,
  // les autres cartes que la ferme et sa mine sont-elles ouvertes (la flèche du chemin, le tronc
  // creux) ?
  autresCartes: cartesOuvertes,
  vitrine,
  // (la nuit : comme les boutons de la ferme, SOMMEIL_BLOQUEES ; le quota reste réglable)
  vendre: (item, n) => nuit('sell-item') || joue(sellInTown(state, item, n)),
  acheter: (id) => nuit('ville-buy') || joue(buyCompany(state, id)),
  // les boutiques de la ville (VILLE.BOUTIQUES) : ce que vend la boutique `id` et les pièces de
  // la ferme ; un achat au comptoir (la carte ne l'ouvre que quand un employé y travaille)
  boutique: (id) => { const v = shopView(id, state); return v && { ...v, pieces: state.pieces }; },
  acheterBoutique: (id, item, n) => nuit('ville-buy') || joue(buyInShop(state, id, item, n)),
  // la mairie : le tableau de bord de l'économie (economieVue), les noms des lieux, les
  // habitants de la ville (foyers, bonheur et argent moyens)
  mairie: () => {
    const F = Object.values(immeubleVue(state)), moy = (k) => (F.length ? Math.round(F.reduce((t, f) => t + f[k], 0) / F.length) : 0);
    return { ...economieVue(state), lieux: DATA.VOISINS.LIEUX, habitants: { foyers: F.length, bonheur: moy('bonheur'), argent: moy('argent') }, pieces: Math.floor(state.pieces) };
  },
  // le bureau de négoce : ce qu'il rachète (les pénuries) et ce que la ferme en a ; une vente
  negoce: () => ({ offres: negoceOffres(state), pieces: Math.floor(state.pieces) }),
  vendreNegoce: (item, n) => nuit('sell-item') || joue(sellToNegoce(state, item, n)),
  // la logistique d'hier (les camions de la carte) : { camions, transport, principaux (les
  // trois produits les plus fabriqués) } ; null avant la première nuit
  logistique: () => {
    const b = economie(state).bilan, P = DATA.ECONOMIE.PRODUITS;
    if (!b) return null;
    const principaux = Object.entries(b.production).filter(([p]) => !DATA.ECONOMIE.MATIERES[p]).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([p]) => P[p].nom.toLowerCase());
    return { camions: b.camions, transport: b.transport, principaux };
  },
  quota: (id, q) => nuit('entreprise-quota') || joue(setCompanyQuota(state, id, q)),
  outil: (id) => hasTool(state, id),
  // l'outil en main (barre d'outils) : 'hache', 'pioche', 'houe', 'canne' ou null
  enMain: () => (axeMode ? 'hache' : pickMode ? 'pioche' : hoeMode ? 'houe' : rodMode ? 'canne' : null),
  // les arbres et les rochers des autres cartes (identifiants « <carte>:x,y ») : comme ceux de
  // la ferme, abattus ou cassés en trois coups, ils reviennent quelques jours plus tard
  abattu: (id) => treeGone(state, id),
  casse: (id) => rockGone(state, id),
  // (ou : la carte et les points où tombent les morceaux, voir chopTree)
  couper: (id, ou) => chopFromStage(id, ou),
  piocher: (id, ou) => mineFromStage(id, ou),
  // les morceaux de bois et de pierre au sol de la carte `carte` ([{ n, item, x, y }]) ; celui
  // sur lequel le personnage marche ({ ok, item, n } ou null)
  morceaux: (carte) => morceauxDe(state, carte).map((m) => ({ n: m.n, item: m.item, x: m.x, y: m.y })),
  ramasserMorceau: (n) => morceauFromStage(n),
  // la canne en main : un lancer dans l'eau `eau` (« lac » : la montagne) ; { poisson } ou null
  pecher: (eau) => fishFromStage(eau),
  objet: (item) => (DATA.OBJETS[item] ? { nom: DATA.OBJETS[item].nom, icone: DATA.OBJETS[item].icone } : null),
  // la grotte : un minerai pris (« fer », « cuivre »…) va dans l'inventaire ({ ok, item, n } ou
  // { ok: false }) ; le carnet d'avant y est versé une fois ; les coups qu'il faut (Lames
  // affûtées) ; un réglage de l'arbre des technologies (la Lampe de mineur : tech('grotte'))
  miner: (sorte) => nuit() || joue(mineOre(state, sorte)),
  verser: (carnet) => joue(depositOreNotebook(state, carnet)),
  // la montagne et la plage : une trouvaille ramassée (« ammonite », « perle »…) va dans
  // l'inventaire ({ ok, item, n } ou { ok: false }) ; le carnet d'avant y est versé une fois
  ramasser: ramasse,
  verserTrouvailles: verseTrouvailles,
  coups: (base) => hitsNeeded(state, base),
  tech: (cle) => techFlag(state, cle),
  // les réglages de jeu des cartes, écrits dans data/ville.json (GROTTE : les niveaux, le
  // minerai, les coups de pioche ; NAVETTE : les horaires et les temps du bus de ligne) : lus
  // par js/carte/ville/config.js ; une autre section de DATA n'est pas donnée aux cartes
  donnees: (cle) => (cle === 'GROTTE' || cle === 'NAVETTE' ? DATA[cle] : null),
  say: (t) => showToast(t),
  // les fenêtres des cartes (la gare, l'arrêt de bus, un étal, une entreprise, le tronc creux) :
  // celles du jeu (js/ui/modal.js : cadre bois, focus gardé par Tab, Échap, focus rendu) ;
  // modal(html, options d'openModal) renvoie la boîte de dialogue
  modal: (html, opts) => openModal(html, opts),
  closeModal: () => closeModal(),
  // le god mode : les cartes ne font plus marcher le personnage (un toucher l'y pose)
  god: () => godMode,
  // le personnage est en selle sur son triporteur (js/carte/triporteur.js) : il roule plus vite
  triporteur: () => enSelle(state),
  // la carte de transition de la partie (js/engine/transition.js) : son plan (l'ouest, tiré
  // d'après la graine), les ressources du jour, celles que le joueur a déjà prises (pris) et le jour.
  transition: () => {
    const g = transitionSeed(state);
    return { plan: transitionPlan(g), ressources: ressourcesDuJour(g, state.day), pris: transitionPris(state), jour: state.day, livreur: LIVREUR };
  },
  // le joueur y ramasse une ressource du jour (son id) : { ok, item, n } ou { ok: false }
  ramasserTransition: (id) => nuit() || joue(ramasserTransition(state, id)),
  // les voisins de la transition (js/engine/voisins.js) : la page dit leurs familles (tirées par
  // elle : [{ maison, adultes, enfants }]) ; renvoie ce que la carte en montre (voisinsVue), le
  // nom des plats, des légumes (« 🥔 patate ») et des étapes de leurs maisons (« maison:<id> »),
  // et les images des cultures de leurs champs
  voisins: (familles) => {
    for (const f of familles || []) voisinFoyer(state, f.maison, f);
    persistState();
    const noms = {}, cultures = {};
    const nom = (id) => { const o = DATA.OBJETS[id]; if (o) noms[id] = `${o.icone} ${o.nom.toLowerCase()}`; };
    for (const l of Object.values(DATA.VOISINS.RECETTES)) l.forEach(nom);
    for (const c of DATA.VOISINS.AGRICULTEUR.CULTURES) { nom(c); if (DATA.CULTURES[c].sprite) cultures[c] = DATA.CULTURES[c].sprite; }
    for (const e of DATA.VOISINS.MAISON.ETAPES) noms['maison:' + e.id] = e.nom;
    return { foyers: voisinsVue(state), noms, cultures };
  },
  // les familles des immeubles de la ville (js/engine/voisins.js) : la page dit leurs familles
  // ([{ logement, adultes, enfants }]) et chaque adulte reçoit son poste (assigneEmplois) ;
  // renvoie ce que la carte en montre (immeubleVue), les postes de la ville (VOISINS.EMPLOIS,
  // METIERS, LIEUX), et le nom des plats et des ingrédients
  immeuble: (familles) => {
    for (const f of familles || []) immeubleFoyer(state, f.logement, f);
    assigneEmplois(state);
    persistState();
    const noms = {};
    const nom = (id) => { const o = DATA.OBJETS[id]; if (o) noms[id] = `${o.icone} ${o.nom.toLowerCase()}`; };
    DATA.VOISINS.RECETTES.citadin.forEach(nom);
    Object.values(DATA.ECONOMIE.REPAS).forEach(nom);
    for (const f of Object.values(immeubleVue(state))) if (f.hier) Object.keys(f.hier.achats || {}).forEach(nom);
    const V = DATA.VOISINS;
    return { foyers: immeubleVue(state), noms, emplois: V.EMPLOIS, metiers: V.METIERS, lieux: V.LIEUX };
  },
  // le livreur arrive au marché : la caisse de chaque famille vendue, son prix crédité
  // ({ total, foyers: { <maison>: gain } })
  livraison: () => {
    const r = livraison(state);
    if (r.total) persistState();
    return r;
  },
  // sous les yeux du joueur, le bûcheron de `maison` abat l'arbre `id` : { ok, bois, reste }
  voisinAbat: (maison, id) => {
    const r = voisinAbat(state, maison, id);
    if (r.ok) persistState();
    return r;
  },
};

/* ---------- le god mode : un menu des cartes ---------- */

// Toutes les cartes (et quelques endroits), pour y aller d'un coup (Options : god mode).
const DESTINATIONS = [
  ['🌾 La ferme', 'jeu.html'],
  ['🛤️ Le chemin vers la ville', 'ville-carte.html?carte=transition&arrivee=ferme'],
  ['🏙️ La ville (route de la ferme)', 'ville-carte.html?carte=ville&arrivee=ferme'],
  ['🚉 La ville (la gare)', 'ville-carte.html?carte=ville&arrivee=gare'],
  ['⛰️ La montagne', 'ville-carte.html?carte=montagne&arrivee=gare'],
  ['⛏️ La mine de la ferme', 'ville-carte.html?carte=grotte&grotte=ferme&niveau=1&arrivee=haut'],
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
      if (asleep(state)) { showToast(SOMMEIL_MESSAGE); return; }
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

// Le sommeil (« Dormir », ou la nuit passée hors du jeu) se passe à la maison : retour à la
// ferme. La nuit seule n'y oblige pas.
setInterval(() => {
  if (!active) return;
  if (asleep(state)) { rentre(null); showToast('💤 Tu dors : retour à la maison.'); }
}, 500);

// Au chargement, l'adresse jeu.html?carte=… rouvre cette carte (après la mise en place).
export function resumeExcursion() {
  syncGodBar();
  const p = new URLSearchParams(window.location.search);
  const carte = p.get('carte');
  if (!carte || setupPending(state) || asleep(state)) {
    if (carte) history.replaceState(null, '', 'jeu.html');
    return;
  }
  if (carte === 'infra') { p.delete('carte'); go('infra-monde.html' + (p.toString() ? '?' + p : '')); } else go('ville-carte.html' + window.location.search);
}
