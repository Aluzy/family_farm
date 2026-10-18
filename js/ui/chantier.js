// chantier.js — la ferme générée (docs/carte-generee.md, étape 4) : le mode « Construire ».
//
// Une case de la barre d'outils (🔨, dès que l'Atelier est construit) ouvre le mode : un menu
// sur le côté droit de l'écran (deux colonnes de cases qui défilent, comme celles de la barre
// d'outils) montre les blocs qu'on peut poser (murs, portes, paillasses, l'Atelier) et combien
// il en reste ; on en choisit un, un appui sur une case de la carte l'y pose, un appui
// sur un bloc le reprend. Les pièces closes sont teintées de vert sur la carte. Le moteur :
// js/engine/blocs.js ; la carte : js/carte/ferme/chantier.js.

import { DATA } from '../engine/catalog.js';
import { atelierConstruit, atelierOuvert } from '../engine/atelier.js';
import { blocAt, blocDessus, blocsEnMain, couchages, poserBloc, reprendreBloc, solAt } from '../engine/blocs.js';
import { asleep } from '../engine/night.js';
import { buildMode, setBuildMode, state } from './store.js';
import { persistState } from './storage.js';
import { refresh } from './render.js';
import { notify } from './toasts.js';
import { registerActions, SOMMEIL_MESSAGE } from './actions.js';

const SORTES = () => Object.keys(DATA.ATELIER.BLOCS);
const CONSEIL_MS = 2000;   // le rappel à l'ouverture du mode

// Le mode Construire est-il possible ? (la ferme générée, l'Atelier construit)
export function chantierOuvert() {
  return atelierOuvert(state) && atelierConstruit(state);
}

// L'icône d'un bloc (celle de son objet ; l'Atelier : la sienne).
function icone(sorte) {
  const b = DATA.ATELIER.BLOCS[sorte];
  return b.objet ? DATA.OBJETS[b.objet].icone : DATA.ATELIER.ICONE;
}

// La case de la barre d'outils.
export function buildSlotHtml() {
  if (!chantierOuvert()) return '';
  const on = !!buildMode;
  const label = on ? 'Construire : ranger' : 'Construire (poser des blocs)';
  return `<button type="button" class="tool-slot${on ? ' active' : ''}" data-action="build-toggle" aria-pressed="${on}" aria-label="${label}" title="${label}">${DATA.ATELIER.ICONE}</button>`;
}

// Le menu de construction, sur le côté droit de l'écran : en haut, les paillasses d'une pièce
// close et ✕ ; puis une case par bloc (son icône, ce qui reste), sur deux colonnes qui défilent.
export function buildChipHtml() {
  if (!buildMode || !chantierOuvert()) return '';
  const blocs = SORTES().map((s) => {
    const n = blocsEnMain(state, s), on = s === buildMode, nom = DATA.ATELIER.BLOCS[s].nom;
    return `<button type="button" class="tool-slot build-slot${on ? ' active' : ''}${n ? '' : ' epuise'}" data-action="build-pick" data-sorte="${s}" aria-pressed="${on}" aria-label="${nom} : ${n}" title="${nom} : ${n}"><span aria-hidden="true">${icone(s)}</span><span class="build-slot-n num" aria-hidden="true">${n}</span></button>`;
  }).join('');
  const dodo = couchages(state).length;
  return `<div class="build-bar" role="group" aria-label="Construire : touche une case pour y poser le bloc choisi, un bloc pour le reprendre"><div class="build-bar-head"><span class="num" title="Paillasses dans une pièce close">🛏 ${dodo}</span><button type="button" class="build-bar-close" data-action="build-toggle" aria-label="Ranger : fin de la construction" title="Ranger">✕</button></div><div class="build-bar-grid">${blocs}</div></div>`;
}

registerActions({
  'build-toggle': () => {
    if (buildMode) { setBuildMode(null); refresh(); return; }
    if (!chantierOuvert()) return;
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    setBuildMode(SORTES().find((s) => blocsEnMain(state, s) > 0) || SORTES()[0]);
    // (un rappel bref, à chaque ouverture : il ne cache pas longtemps la puce des blocs)
    notify(`${DATA.ATELIER.ICONE} Touche une case pour poser, un bloc pour le reprendre.`, { duree: CONSEIL_MS });
    refresh();
  },
  'build-pick': (target) => {
    if (!buildMode) return;
    setBuildMode(target.dataset.sorte);
    refresh();
  },
  // La carte : un appui sur la case `case` en mode Construire.
  'bloc': (target) => {
    if (!buildMode) return;
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    const c = Number(target.dataset.case);
    // (la pompe se pose sur le puits : un appui sur un puits libre la pose, ne reprend pas le puits)
    const sur = DATA.ATELIER.BLOCS[buildMode] && DATA.ATELIER.BLOCS[buildMode].sur;
    const surLibre = sur && blocAt(state, c) === sur && !blocDessus(state, c);
    // (le plancher en main : un appui sur un plancher sans rien dessus le reprend ; un autre
    // bloc se pose dessus)
    const sol = DATA.ATELIER.BLOCS[buildMode] && DATA.ATELIER.BLOCS[buildMode].sol;
    const reprend = blocAt(state, c) ? !surLibre : sol && solAt(state, c);
    const r = reprend ? reprendreBloc(state, c) : poserBloc(state, buildMode, c);
    if (!r.ok) { notify(r.error); return; }
    persistState();
    refresh();
  },
});
