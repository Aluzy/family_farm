// didacticiel-ile.js — le didacticiel de l'île (le chantier « l'île à bâtir », fiche I7b ; le moteur :
// js/engine/didacticiel-ile.js).
//
// Par gestes et flèches, sans discours : une bulle d'une ligne en bas de l'écran (l'icône de l'étape, ce qu'il faut
// faire, le rang « 3 / 15 », « Passer » et ✕), une flèche qui montre ce qu'il faut toucher (et la lueur blanche du
// didacticiel, .didac-ring), et sur la carte ce qui brille (modèle.surbrillance : les pierres, le bois, l'Atelier, le
// puits). La ligne suit ce que fait le joueur (le menu ouvert, l'outil pris, la fenêtre ouverte…), toujours en une
// ligne. Une étape faite passe d'elle-même (majDidacticielIle, à chaque rendu) ; « Passer » laisse l'étape, ✕ arrête
// tout : rien ne bloque. Les cibles reprennent celles du didacticiel (js/ui/didacticiel.js : le menu, Construire,
// l'Atelier, la barre d'outils). Pendant ce didacticiel, le carnet des objectifs du jour se tait (js/ui/objectifs.js).

import { DATA } from '../engine/catalog.js';
import { escapeHtml } from '../engine/format.js';
import { countItem } from '../engine/inventory.js';
import { aCruche, eauCruche } from '../engine/cruche.js';
import { etapeIle, majDidacticielIle, passerDidacticielIle, passerEtapeIle } from '../engine/didacticiel-ile.js';
import { distanceAuComptoir, PORT } from '../engine/port.js';
import { chargeDe } from '../engine/portage.js';
import { marcheOuvert } from '../engine/devices.js';
import { unlockLevel } from '../engine/levels.js';
import { buildMode, comptoirTab, hoeMode, state } from './store.js';
import { menuOpen, stageWindow } from './stage-windows.js';
import { toolbarOpen } from './outils.js';
import { persistState } from './storage.js';
import { morph, refresh } from './render.js';
import { registerActions } from './actions.js';
import { notify } from './toasts.js';
import { son } from './son.js';
import {
  affichable, atelierOuvertFenetre, carteOuverte, construire, element, ETAPES_UI, fabricable, fabriquer, menu, outil, tenu, visibleSel,
} from './didacticiel.js';

// Prendre l'outil `id` (son nom `nom`) : la ligne et la cible.
function prendre(id, nom) {
  if (stageWindow) return { texte: 'Ferme la fenêtre (✕).', cible: '#stage-window-close' };
  if (!toolbarOpen) return { texte: 'Sors la barre d\'outils, en bas.', cible: '.tool-bar-tab' };
  return { texte: `Prends la ${nom}, en bas.`, cible: outil(id) };
}
// Fabriquer à l'Atelier les recettes `ids` (`nom` : ce que c'est).
function aLAtelier(ids, nom) {
  const f = fabriquer(ids);
  if (buildMode) return { texte: 'Range le menu Construire (✕).', cible: '.build-bar-close' };
  if (!atelierOuvertFenetre()) return { texte: 'Touche l\'Atelier.', carte: f.carte || { blocs: ['atelier'] } };
  return { texte: ids.some(fabricable) ? `Fabrique ${nom}.` : 'Il te manque du bois ou des pierres.', cible: f.cible || null };
}
// La fenêtre du port, sur l'onglet `onglet` (`texte` : la ligne pour le toucher) ; null quand elle y est.
const ouvrirPort = (onglet, texte) => {
  if (stageWindow !== 'comptoir') return { texte: menuOpen ? 'Touche ⚓ le port, dans le menu.' : 'Ouvre le menu (la flèche).', cible: menu('comptoir') };
  if (comptoirTab !== onglet) return { texte, cible: `.inv-tab[data-tab="${onglet}"]` };
  return null;
};
const persoCase = () => { const S = window.FarmStage; return S && S.persoCase ? S.persoCase() : -1; };
const compte = (icone, n, besoin) => ({ icone, n: Math.min(n, besoin), besoin });

// Chaque étape : sa ligne (courte : elle tient sur une ligne d'un téléphone), sa cible (un sélecteur), ce qui brille sur la
// carte, son compteur. → { texte, cible, carte, compteur: { icone, n, besoin } }.
const UI = {
  ramasser: () => {
    const C = DATA.ATELIER.CONSTRUCTION, p = countItem(state, 'pierre') < C.pierre;
    return p ? { texte: 'Ramasse les pierres qui brillent.', carte: { ramassables: 'petite_pierre' }, compteur: compte('🪨', countItem(state, 'pierre'), C.pierre) }
      : { texte: 'Ramasse le bois qui brille.', carte: { ramassables: 'morceau_bois' }, compteur: compte('🪵', countItem(state, 'bois'), C.bois) };
  },
  atelier: () => ({
    texte: buildMode === 'atelier' ? 'Pose l\'Atelier sur l\'herbe.' : buildMode ? 'Choisis l\'Atelier.' : menuOpen ? 'Touche 🔨 Construire.' : 'Ouvre le menu (la flèche).',
    cible: construire('atelier'),
  }),
  houe: () => aLAtelier(['houe'], 'la houe'),
  labour: () => {
    const L = DATA.DIDACTICIEL.LABOURS, c = compte('🟫', (state.campagne && state.campagne.compteurs.labours) || 0, L);
    return hoeMode || tenu('houe') ? { texte: 'Touche l\'herbe pour la labourer.', compteur: c } : { ...prendre('houe', 'houe'), compteur: c };
  },
  semis: () => ({
    texte: document.querySelector('#modal-root [data-action="plant"]') ? 'Choisis la carotte.' : hoeMode ? 'Range la houe (touche-la).' : 'Touche la terre pour semer.',
    cible: ETAPES_UI.semis.cible(),
  }),
  cruche: () => {
    if (countItem(state, 'puits_pierre') > 0 && !atelierOuvertFenetre()) return { texte: buildMode === 'puits' ? 'Pose le puits sur l\'herbe.' : 'Pose le puits : 🔨 Construire.', cible: construire('puits') };
    return aLAtelier(['puits_pierre', 'cruche'].filter((id) => (id === 'cruche' ? !aCruche(state) : countItem(state, 'puits_pierre') < 1)), 'le puits et la cruche');
  },
  arroser: () => ({
    texte: buildMode ? 'Range le menu Construire (✕).' : eauCruche(state) > 0 ? 'Touche ta plante pour l\'arroser.' : 'Remplis la cruche au puits.',
    cible: ETAPES_UI.arroser.cible(), carte: ETAPES_UI.arroser.carte(),
  }),
  recolte: () => ({ texte: 'Ta plante mûrit : récolte-la.' }),
  charger: () => {
    if (!marcheOuvert(state)) return { texte: `Le port t'attend au niveau ${unlockLevel('marche')}.` };
    return ouvrirPort('porter', 'Touche 🧺 Porter.') || { texte: 'Touche « Charger les récoltes ».', cible: visibleSel('[data-action="portage-recoltes"]') };
  },
  port: () => (carteOuverte() ? { texte: 'Ferme la carte, suis la boussole.' }
    : stageWindow ? { texte: 'Ferme la fenêtre (✕).', cible: '#stage-window-close' }
      : { texte: 'Suis le chemin jusqu\'au port.', cible: visibleSel('.boussole') }),
  vendre: () => {
    if (distanceAuComptoir(state, persoCase()) > PORT.PORTEE && stageWindow !== 'comptoir') return { texte: 'Touche le comptoir, sous la halle.' };
    if (!Object.keys(chargeDe(state)).length) return { texte: 'Charge d\'abord une récolte.' };
    return ouvrirPort('vendre', 'Touche 💰 Vendre.') || { texte: 'Touche « Tout décharger ».', cible: visibleSel('[data-action="port-decharger"]') };
  },
  graines: () => ouvrirPort('acheter', 'Touche 🛒 Acheter.') || { texte: 'Achète des graines.', cible: visibleSel('.port-modal [data-action="port-acheter"]') || visibleSel('[data-action="port-fiche"][data-mode="acheter"]') },
  maison: () => ({
    texte: buildMode ? 'Murs, porte, lit, boîte aux lettres.' : menuOpen ? 'Touche 🔨 Construire.' : 'Bâtis une maison libre.',
    cible: buildMode ? null : menu('atelier'),
  }),
  villageois: () => ({ texte: 'Le bac amène ton premier villageois.' }),
  tache: () => ({
    texte: visibleSel('[data-action="villageois-attribuer"]') ? 'Choisis sa tâche.' : visibleSel('#villageois-tache') ? 'Touche « Tâche ».' : 'Touche 🏝️ : ton villageois.',
    cible: visibleSel('[data-action="villageois-attribuer"]') || visibleSel('#villageois-tache') || visibleSel('[data-action="villageois-fiche"]') || visibleSel('.player-villageois'),
  }),
};

// L'étape montrée, ou null (rien à montrer : fini, l'accueil, une scène…).
function etapeMontree() {
  if (!state || !affichable()) return null;
  return etapeIle(state);
}
function bulleDe(e) {
  if (!e || !UI[e.id]) return null;
  const b = UI[e.id]() || {};
  return { texte: b.texte || e.ligne, cible: b.cible || null, carte: b.carte || null, compteur: b.compteur || null };
}

// Pour la carte (modèle.surbrillance, js/ui/stage.js) : ce que la scène fait briller, ou null.
export function surbrillanceIle() {
  const b = bulleDe(etapeMontree());
  return b ? b.carte : null;
}

// Le didacticiel de l'île se montre-t-il ? (le carnet des objectifs du jour se tait pendant ce temps)
export function didacticielIleMontre() {
  return !!(state && etapeIle(state));
}

let anneau = null;
export function renderDidacticielIle() {
  const root = document.getElementById('ile-guide-root');
  if (!root) return;
  if (state && etapeIle(state)) {
    const faites = majDidacticielIle(state);
    if (faites.length) {
      persistState();
      son('reussite');
      if (!etapeIle(state)) notify('🏝️ L\'île est à toi.', { kind: 'succes' });
    }
  }
  const e = etapeMontree(), b = bulleDe(e);
  const el = b && b.cible ? element(b.cible) : null;
  if (anneau && anneau !== el) anneau.classList.remove('didac-ring');
  if (el && el !== anneau) el.classList.add('didac-ring');
  anneau = el;
  document.body.classList.toggle('didacticiel-ile', !!e);
  if (!e) { morph(root, ''); return; }
  // la flèche : au-dessus de ce qu'il faut toucher (en dessous s'il est en haut de l'écran)
  let fleche = '';
  if (el) {
    const r = el.getBoundingClientRect(), bas = r.top < 70, x = Math.round(r.left + r.width / 2), y = Math.round(bas ? r.bottom + 4 : r.top - 4);
    fleche = `<span class="ile-fleche${bas ? ' vers-haut' : ''}" style="left:${x}px;top:${y}px" aria-hidden="true"></span>`;
  }
  const haut = el && el.getBoundingClientRect().top > window.innerHeight * 0.55;
  const c = b.compteur ? `<span class="ile-compte num${c0(b.compteur)}">${b.compteur.icone} ${b.compteur.n} / ${b.compteur.besoin}</span>` : '';
  morph(root, `${fleche}<section class="didac-bulle ile-bulle${haut ? ' haut' : ''}" aria-live="polite" aria-label="Didacticiel de l'île">
      <p class="ile-ligne"><span class="ile-icone" aria-hidden="true">${e.icone}</span> ${escapeHtml(b.texte)}</p>
      <div class="ile-pied">
        <span class="ile-rang muted num">${e.n} / ${e.total}</span>${c}
        <button type="button" class="ile-passer" data-action="ile-passer" title="Passer cette étape">Passer ›</button>
        <button type="button" class="ile-arreter" data-action="ile-arreter" title="Arrêter le didacticiel" aria-label="Arrêter le didacticiel">✕</button>
      </div>
    </section>`);
}
const c0 = (k) => (k.n >= k.besoin ? ' ok' : '');

registerActions({
  'ile-passer': () => { if (passerEtapeIle(state).ok) { persistState(); refresh(); } },
  'ile-arreter': () => { if (passerDidacticielIle(state).ok) { persistState(); refresh(); } },
});
