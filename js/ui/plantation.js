import { DATA } from '../engine/catalog.js';
import { poseStatus } from '../engine/blocs.js';
import { countItem } from '../engine/inventory.js';
import { asleep } from '../engine/night.js';
import { farmTerrain } from '../engine/terrain.js';
import { casesAPlanter, planterIci, sorteAPlanter } from '../engine/plantation.js';
import { axeMode, buildMode, hoeMode, pickMode, rodMode, scytheMode, setAxeMode, setBuildMode, setHoeMode, setPickMode, setRodMode, setScytheMode, state } from './store.js';
import { setStageWindow } from './stage-windows.js';
import { persistState } from './storage.js';
import { morph, refresh } from './render.js';
import { notify } from './toasts.js';
import { registerActions, SOMMEIL_MESSAGE } from './actions.js';
import { closeModal, openModal } from './modal.js';

/* ---------- planter un arbre depuis l'Inventaire ----------
   La fiche d'une graine d'arbre (pomme de pin, gland) ou d'un jeune arbre fruitier a un bouton
   « Planter » : la fiche se ferme, les cases où il peut aller (autour du personnage) sont en
   surbrillance sur la carte (js/carte/ferme/plantation.js) ; un appui sur l'une d'elles demande
   « Voulez-vous planter un arbre ici ? », et « Oui » le plante. Tant qu'il en reste dans
   l'inventaire, on continue : les cases se rallument (sans celle qui vient d'être plantée, ni
   celles trop proches), et un appui sur l'une d'elles y plante aussitôt le suivant (la question
   n'est posée que pour le premier). Un bandeau, en bas, rappelle quoi
   faire et combien il en reste, et permet de s'arrêter. */

const RAYON = 10;      // les cases proposées : à au plus tant de cases du personnage
const BOUGE = 3;       // le personnage a bougé de tant de cases : les cases se recalculent

let plante = null;     // { sorte } : l'arbre à planter, ou null
let cache = null;      // { centre, cases } : les cases proposées autour de `centre`

export function sortePlantee() {
  return plante ? plante.sorte : null;
}

function fermer() {
  plante = null;
  cache = null;
}

// Un autre outil ou mode en main : on ne plante plus.
function autreMode() {
  return hoeMode || axeMode || pickMode || rodMode || scytheMode || !!buildMode;
}

function persoCase() {
  const S = window.FarmStage;
  return S && S.persoCase ? S.persoCase() : -1;
}

// Ce que la carte met en surbrillance : { cases }, ou null.
export function plantationModele() {
  if (!plante) return null;
  if (autreMode()) { fermer(); return null; }
  const c = persoCase();
  if (c < 0) return cache ? { cases: cache.cases } : { cases: [] };
  const W = farmTerrain(state).LARGEUR;
  const loin = !cache || Math.max(Math.abs((c % W) - (cache.centre % W)), Math.abs(Math.floor(c / W) - Math.floor(cache.centre / W))) >= BOUGE;
  if (loin) cache = { centre: c, cases: casesAPlanter(state, plante.sorte, c, RAYON) };
  return { cases: cache.cases };
}

// Le bandeau du bas : ce qu'on plante, quoi faire, « Annuler ».
export function renderPlantation() {
  const root = document.getElementById('plantation-root');
  if (!root) return;
  if (plante && autreMode()) fermer();
  if (!plante) { if (root.childElementCount) morph(root, ''); return; }
  const b = DATA.ATELIER.BLOCS[plante.sorte], o = DATA.OBJETS[b.objet], n = countItem(state, b.objet);
  morph(root, `<div class="plantation-bandeau" role="status">
    <span>${o.icone} Touche une case en surbrillance pour y planter ${b.semis ? 'une graine' : `un ${b.nom.toLowerCase()}`} (<span class="num">${n}</span> ${n > 1 ? 'restent' : 'reste'}).</span>
    <button type="button" class="btn" data-action="arbre-annuler">${plante.plantes ? 'Terminer' : 'Annuler'}</button>
  </div>`);
}

registerActions({
  // La fiche de l'Inventaire : « Planter ».
  'arbre-planter': (target) => {
    const sorte = sorteAPlanter(target.dataset.item);
    if (!sorte) return;
    if (asleep(state)) { notify(SOMMEIL_MESSAGE); return; }
    closeModal();
    setStageWindow(null);
    setBuildMode(null); setHoeMode(false); setAxeMode(false); setPickMode(false); setRodMode(false); setScytheMode(false);
    plante = { sorte, plantes: 0 };
    cache = null;
    refresh();
  },
  'arbre-annuler': () => {
    fermer();
    refresh();
  },
  // La carte : un appui sur une case.
  'arbre-case': (target) => {
    if (!plante) return;
    const c = Number(target.dataset.case);
    const st = poseStatus(state, plante.sorte, c);
    if (!st.ok) { notify(st.raison); return; }
    // (déjà un de planté : les suivants, sans redemander)
    if (plante.plantes) { planter(c); return; }
    openModal(`
      <p class="plantation-question" id="plantation-question">Voulez-vous planter un arbre ici ?</p>
      <div class="row plantation-choix">
        <button type="button" class="btn primary" data-action="arbre-oui" data-case="${c}">Oui</button>
        <button type="button" class="btn" data-action="close-modal">Non</button>
      </div>`, { labelledBy: 'plantation-question', className: 'modal bois plantation-modal', focus: '[data-action="arbre-oui"]' });
  },
  'arbre-oui': (target) => {
    closeModal();
    if (plante) planter(Number(target.dataset.case));
  },
});

// Plante l'arbre en cours sur la case `c` ; il en reste : on continue, sinon c'est fini.
function planter(c) {
  const b = DATA.ATELIER.BLOCS[plante.sorte];
  const r = planterIci(state, plante.sorte, c);
  if (!r.ok) { notify(r.error); refresh(); return; }
  // il en reste : on continue (les cases se recalculent) ; sinon, c'est fini
  plante.plantes += 1;
  cache = null;
  const reste = countItem(state, b.objet);
  if (!reste) fermer();
  persistState();
  notify(`🌱 ${b.semis ? 'Graine plantée : un arbre poussera ici.' : `${b.nom} planté.`}${reste ? ' Touche une autre case pour continuer.' : ''}`);
  refresh();
}
