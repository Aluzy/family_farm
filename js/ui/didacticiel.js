// didacticiel.js — le didacticiel d'une nouvelle partie (le moteur : js/engine/didacticiel.js).
//
// Une bulle de texte, en bas de l'écran (en haut quand ce qu'elle montre est en bas), dit quoi
// faire ; ce qu'il faut toucher porte un anneau qui pulse (.didac-ring) : une jauge, la flèche du
// menu latéral, une entrée du menu, une case du menu Construire, une recette de l'Atelier, un outil
// de la barre d'outils. Sur la carte, la scène entoure d'un cercle les objets à toucher (modèle :
// surbrillance, js/carte/ferme/didacticiel.js) : les pierres, le bois, l'Atelier, le puits. En
// haut à droite, sous le cadran, les compteurs (« 🪨 2 / 3 ») de ce qu'il reste à réunir. Les
// étapes à lire ont un bouton « Suivant » ; les autres passent d'elles-mêmes quand leur objectif
// est atteint (majDidacticiel, à chaque rendu). « Passer » arrête le didacticiel.

import { DATA } from '../engine/catalog.js';
import { countItem } from '../engine/inventory.js';
import { craftStatus } from '../engine/atelier.js';
import { eauCruche, aCruche } from '../engine/cruche.js';
import {
  etapeDidacticiel, ETAPES, majDidacticiel, objectifDidacticiel, passerDidacticiel, planAbri, suivantDidacticiel,
} from '../engine/didacticiel.js';
import { buildMode, hoeMode, scytheMode, state } from './store.js';
import { menuOpen, stageWindow } from './stage-windows.js';
import { toolbarOpen } from './outils.js';
import { persistState } from './storage.js';
import { morph, refresh } from './render.js';
import { registerActions } from './actions.js';
import { stageUsable } from './stage.js';
import { setupPending } from '../engine/depart.js';
import { consentBannerPending, consentBannerShown, storyOpen } from './calme.js';

const nomObjet = (o) => (DATA.OBJETS[o] ? DATA.OBJETS[o].nom.toLowerCase() : o);
const fabricable = (id) => craftStatus(state, id).ok;
const atelierOuvertFenetre = () => stageWindow === 'atelier';
const tenu = (outil) => !!document.querySelector(`.tool-slot.active[data-outil="${outil}"]`);

// La première recette de `ids` qu'on peut fabriquer maintenant, sinon la première de la liste.
function recette(ids) {
  return ids.find(fabricable) || ids[0];
}

// L'entrée `tab` du menu latéral (d'abord la flèche, s'il est fermé).
const menu = (tab) => (menuOpen ? `.nav-btn[data-tab="${tab}"]` : '#side-tab');

// Le menu Construire, ouvert sur le bloc `sorte` : d'abord l'entrée 🔨 du menu, puis la case du
// bloc ; null quand il est en main (on touche alors la carte).
function construire(sorte) {
  if (!buildMode) return menu('atelier');
  return buildMode === sorte ? null : `[data-action="build-pick"][data-sorte="${sorte}"]`;
}

// Un outil de la barre d'outils : d'abord la languette, si la barre est rangée.
const outil = (id) => (tenu(id) ? null : toolbarOpen ? `.tool-slot[data-outil="${id}"]` : '.tool-bar-tab');

// Une recette de l'Atelier : sa fenêtre ouverte, le bouton Fabriquer ; sinon l'Atelier de la carte.
function fabriquer(ids) {
  if (buildMode) return { cible: '.build-bar-close' };
  if (!atelierOuvertFenetre()) return { carte: { blocs: ['atelier'] } };
  const id = recette(ids);
  return { cible: fabricable(id) ? `[data-action="atelier-fabriquer"][data-recette="${id}"]` : null };
}
// (pour une étape : sa cible et sa surbrillance, d'après la liste de recettes `ids()`)
const fabrique = (ids) => ({ cible: () => fabriquer(ids()).cible || null, carte: () => fabriquer(ids()).carte || null });

// Les étapes : leur texte (HTML sûr : rien de ce que tape le joueur), et ce qu'elles montrent
// ({ cible: sélecteur, carte: surbrillance de la scène }).
const ETAPES_UI = {
  sante: { texte: () => 'Bienvenue sur ta ferme ! Voici tes jauges. Le cœur, c\'est ta <b>santé</b> : ton énergie. Chaque action en coûte un peu ; elle remonte en dormant et en mangeant.', cible: () => '.player-gauge:nth-child(1)' },
  endurance: { texte: () => 'L\'éclair, c\'est ton <b>endurance</b> : plus tu montes de niveau, moins tes actions te fatiguent.', cible: () => '.player-gauge:nth-child(2)' },
  bonheur: { texte: () => 'Le sourire, c\'est le <b>bonheur</b> de ta famille : de bons repas, un lit pour chacun, et il grimpe.', cible: () => '.player-gauge:nth-child(3)' },
  xp: { texte: () => 'L\'étoile, c\'est ton <b>expérience</b> (XP) : chaque action t\'en rapporte. Barre pleine, tu passes au niveau suivant et de nouvelles choses se débloquent.', cible: () => '.player-level' },
  autonomie: { texte: () => 'La pousse, c\'est l\'<b>autonomie</b> de ta ferme : la part de ce que mange ta famille que tu as produit toi-même. Le but du jeu : 100 % !', cible: () => '.player-auto' },
  argent: { texte: () => 'Et voici ton <b>argent</b>, pour acheter au Marché quand il ouvrira.', cible: () => '.player-money' },
  deplacement: { texte: () => 'Pour <b>te déplacer</b>, pose ton doigt sur la carte et fais-le glisser : ton personnage marche dans cette direction tant que ton doigt reste posé, et la carte le suit.' },
  pierres: { texte: () => 'Pour <b>ramasser</b>, touche simplement l\'objet : ton personnage va le chercher. Commence par les <b>petites pierres</b> (entourées sur la carte) : il en faut pour l\'Atelier.', carte: () => ({ ramassables: 'petite_pierre' }) },
  bois: { texte: () => 'Parfait ! Maintenant, ramasse des <b>morceaux de bois</b>.', carte: () => ({ ramassables: 'morceau_bois' }) },
  atelier: {
    texte: () => (buildMode === 'atelier' ? 'Touche une case d\'herbe libre de la carte pour y <b>poser l\'Atelier</b>.' : buildMode ? 'Choisis l\'<b>Atelier</b> dans le menu Construire.' : menuOpen ? 'Touche 🔨 <b>Construire</b>.' : 'Tu as de quoi bâtir ton <b>Atelier</b> ! Ouvre le menu sur le côté (la flèche).'),
    cible: () => construire('atelier'),
  },
  atelier_ouvrir: {
    texte: () => (buildMode ? 'L\'Atelier est posé ! Range le menu Construire (✕).' : 'Touche l\'<b>Atelier</b> sur la carte : c\'est là que tu fabriqueras tout.'),
    cible: () => (buildMode ? '.build-bar-close' : null),
    carte: () => (buildMode ? null : { blocs: ['atelier'] }),
    bouton: () => false,   // (elle passe quand la fenêtre de l'Atelier s'ouvre)
  },
  faux: { texte: () => (atelierOuvertFenetre() ? (fabricable('faux') ? 'Fabrique ta première <b>faux</b> : elle coupe l\'herbe haute.' : 'Il te faut de quoi fabriquer la <b>faux</b> : ramasse encore du bois et des pierres.') : 'Ton premier outil sera une <b>faux</b> : touche l\'Atelier.'), ...fabrique(() => ['faux']) },
  fibres: { texte: () => (tenu('faux') || scytheMode ? 'Touche les touffes d\'<b>herbe haute</b> pour les faucher, puis marche sur les <b>fibres</b> tombées pour les ramasser.' : 'Prends la <b>faux</b> dans ta barre d\'outils.'), cible: () => outil('faux') },
  outils: { texte: () => (atelierOuvertFenetre() ? 'Fabrique la <b>hache</b> (pour le bois des arbres) et la <b>pioche</b> (pour les rochers).' : 'À l\'Atelier, fabrique maintenant la <b>hache</b> et la <b>pioche</b>. Il te faut du bois, des pierres et des fibres.'), ...fabrique(() => ['hache', 'pioche']) },
  abri_ressources: { texte: () => `Ta famille a besoin d'un <b>abri</b> : des murs en bois, une porte, et une paillasse pour chacun (${planAbri(state).paillasses}). Coupe des arbres à la <b>hache</b> pour le bois, fauche pour les fibres.` },
  abri_fabriquer: {
    texte: () => (atelierOuvertFenetre() ? 'Fabrique les <b>murs en bois</b>, des <b>planches</b> pour la <b>porte</b>, et les <b>paillasses</b>.' : 'Tout est réuni ! À l\'Atelier, fabrique les murs, la porte et les paillasses.'),
    ...fabriquerAbri(),
  },
  abri_construire: {
    texte: () => (buildMode && ['mur_bois', 'porte'].includes(buildMode) ? 'Pose les <b>murs</b> en rectangle autour d\'une rangée de cases libres (une par paillasse), puis la <b>porte</b> sur l\'un des murs : elle prend sa place.' : buildMode ? 'Choisis le <b>mur en bois</b>.' : menuOpen ? 'Touche 🔨 <b>Construire</b>.' : 'Bâtis l\'abri : ouvre le menu (la flèche), puis 🔨 Construire.'),
    cible: () => (buildMode && buildMode === 'porte' ? null : buildMode && buildMode !== 'mur_bois' && countItem(state, 'mur_bois') > 0 ? '[data-action="build-pick"][data-sorte="mur_bois"]' : buildMode ? (countItem(state, 'mur_bois') === 0 && countItem(state, 'porte') > 0 && buildMode !== 'porte' ? '[data-action="build-pick"][data-sorte="porte"]' : null) : menu('atelier')),
  },
  paillasses: { texte: () => (buildMode === 'paillasse' ? 'Pose les <b>paillasses</b> dans l\'abri, une par case.' : buildMode ? 'Choisis la <b>paillasse</b>.' : 'Il reste les <b>paillasses</b> : 🔨 Construire.'), cible: () => construire('paillasse') },
  houe: { texte: () => (atelierOuvertFenetre() ? 'Fabrique la <b>houe</b> : elle change l\'herbe en terre à cultiver.' : 'L\'abri est prêt, ta famille dormira au chaud ! Place au potager : fabrique une <b>houe</b> à l\'Atelier.'), ...fabrique(() => ['houe']) },
  graines: {
    texte: () => (stageWindow === 'inventaire' ? `Voici ton <b>inventaire</b> : tout ce que tu as ramassé et fabriqué, rangé par onglets. On t'offre ${Object.entries(DATA.DIDACTICIEL.GRAINES).map(([o, n]) => `${n} ${nomObjet(o)}`).join(', ')} pour ton premier potager : regarde l'onglet des <b>graines</b> !` : 'Un cadeau t\'attend dans ton <b>inventaire</b> : ouvre le menu, puis l\'Inventaire.'),
    // (l'inventaire ouvert : l'onglet des graines, s'il n'est pas déjà choisi)
    cible: () => (stageWindow === 'inventaire' ? '.inv-tab[data-tab="graines"]:not(.active)' : menu('inventaire')),
    bouton: () => stageWindow === 'inventaire',
  },
  labour: { texte: () => (hoeMode || tenu('houe') ? 'Touche des cases d\'herbe pour les <b>labourer</b>.' : 'Prends la <b>houe</b> dans ta barre d\'outils.'), cible: () => (hoeMode ? null : outil('houe')) },
  semis: { texte: () => (document.querySelector('#modal-root [data-action="plant"]') ? 'Choisis la <b>carotte</b>.' : hoeMode ? 'Range la houe (touche-la), puis touche une terre labourée pour <b>semer</b>.' : 'Touche une terre labourée pour y <b>semer</b> tes graines.'), cible: () => (document.querySelector('#modal-root [data-action="plant"]') ? '#modal-root [data-action="plant"]' : hoeMode ? outil('houe') || '.tool-slot[data-outil="houe"]' : null) },
  puits: {
    texte: () => (countItem(state, 'puits_pierre') > 0 ? (buildMode === 'puits' ? 'Touche une case d\'herbe pour poser le <b>puits</b>.' : 'Pose le <b>puits</b> dehors : 🔨 Construire.') : atelierOuvertFenetre() ? 'Fabrique le <b>puits</b> et une <b>cruche</b> : pour arroser, tu y rempliras la cruche.' : 'Tes graines ont besoin d\'eau : fabrique un <b>puits</b> et une <b>cruche</b> à l\'Atelier.'),
    ...puits(),
  },
  arroser: {
    texte: () => (eauCruche(state) > 0 ? 'Touche ta plante pour l\'<b>arroser</b> avec la cruche.' : 'Touche le <b>puits</b> pour remplir ta cruche.'),
    carte: () => (eauCruche(state) > 0 ? null : { blocs: ['puits'] }),
  },
  fin: { texte: () => 'Bravo, ta ferme est lancée ! Ta plante poussera une fois arrosée ; récolte-la quand elle sera mûre. La suite est à toi : élevage, cuisine, et bien plus encore.' },
};

// L'abri à fabriquer : la recette dont il manque encore des objets.
function fabriquerAbri() {
  const prochaine = () => {
    const p = planAbri(state), compte = (o) => countItem(state, o);
    if (compte('mur_bois') < p.murs) return ['mur_bois'];
    if (compte('porte') < p.porte) return compte('planche') >= DATA.ATELIER.RECETTES.porte.entrees.planche ? ['porte'] : ['planche'];
    return ['paillasse'];
  };
  return fabrique(prochaine);
}

// Le puits et la cruche : les fabriquer, puis poser le puits.
function puits() {
  const aFaire = () => {
    const ids = [];
    if (countItem(state, 'puits_pierre') < 1) ids.push('puits_pierre');
    if (!aCruche(state)) ids.push('cruche');
    return ids;
  };
  const poser = () => countItem(state, 'puits_pierre') > 0 && (aCruche(state) || !fabricable('cruche'));
  return {
    cible: () => (poser() && !atelierOuvertFenetre() ? construire('puits') : aFaire().length ? fabriquer(aFaire()).cible || null : construire('puits')),
    carte: () => (poser() ? null : aFaire().length ? fabriquer(aFaire()).carte || null : null),
  };
}

// La cible `sel` : son élément visible, ou null.
function element(sel) {
  if (!sel) return null;
  const el = [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length > 0);
  return el || null;
}

// Le didacticiel se montre-t-il ? (la carte est là, rien ne passe avant lui)
function visible() {
  if (!state || !etapeDidacticiel(state) || !stageUsable() || setupPending(state) || storyOpen()) return false;
  if (consentBannerShown() || consentBannerPending()) return false;
  return !document.querySelector('#modal-root .story-modal, #modal-root .setup-modal');
}

// Pour la carte (modèle.surbrillance) : ce que la scène entoure, ou null.
export function surbrillanceDidacticiel() {
  if (!visible()) return null;
  const e = ETAPES_UI[etapeDidacticiel(state)];
  return e && e.carte ? e.carte() : null;
}

// L'icône d'un compteur.
const icone = (o) => (o === 'terre' ? '🟫' : DATA.OBJETS[o] ? DATA.OBJETS[o].icone : '');
const libelle = (o) => (o === 'terre' ? 'terres labourées' : nomObjet(o));

let anneau = null;
export function renderDidacticiel() {
  const root = document.getElementById('didacticiel-root');
  if (!root) return;
  if (state && majDidacticiel(state)) persistState();
  // la fenêtre de l'Atelier s'ouvre : l'étape « touche l'Atelier » est faite
  if (state && etapeDidacticiel(state) === 'atelier_ouvrir' && stageWindow === 'atelier' && suivantDidacticiel(state, 'atelier_ouvrir').ok) persistState();
  const etape = visible() ? etapeDidacticiel(state) : null;
  document.body.classList.toggle('didacticiel', !!etape);
  const e = etape && ETAPES_UI[etape];
  const el = e && e.cible ? element(e.cible()) : null;
  if (anneau && anneau !== el) anneau.classList.remove('didac-ring');
  if (el && el !== anneau) el.classList.add('didac-ring');
  anneau = el;
  if (!e) { morph(root, ''); return; }
  const o = objectifDidacticiel(state);
  const n = ETAPES.indexOf(etape) + 1;
  const lire = !o && (!e.bouton || e.bouton());
  const compteurs = o && o.compteurs.length
    ? `<div class="didac-compteurs" aria-label="Ce qu'il te faut">${o.compteurs.map((c) => `<span class="didac-compteur${c.n >= c.besoin ? ' ok' : ''}" title="${libelle(c.objet)}"><span aria-hidden="true">${icone(c.objet)}</span> <span class="num">${Math.min(c.n, c.besoin)} / ${c.besoin}</span><span class="visually-hidden"> ${libelle(c.objet)}</span></span>`).join('')}</div>`
    : '';
  // la bulle en haut quand ce qu'elle montre est dans le bas de l'écran
  const haut = el && el.getBoundingClientRect().top > window.innerHeight * 0.55;
  morph(root, `${compteurs}
    <section class="didac-bulle${haut ? ' haut' : ''}" aria-live="polite" aria-labelledby="didac-texte">
      <p id="didac-texte">${e.texte()}</p>
      <div class="didac-pied">
        <button type="button" class="didac-passer" data-action="didacticiel-passer">Passer le didacticiel</button>
        <span class="muted num">${n} / ${ETAPES.length}</span>
        ${lire ? `<button type="button" class="btn primary" data-action="didacticiel-suivant">${etape === 'fin' ? 'Terminer' : 'Suivant'}</button>` : ''}
      </div>
    </section>`);
}

registerActions({
  'didacticiel-suivant': () => {
    const r = suivantDidacticiel(state);
    if (r.ok) { persistState(); refresh(); }
  },
  'didacticiel-passer': () => {
    const r = passerDidacticiel(state);
    if (r.ok) { persistState(); refresh(); }
  },
});
