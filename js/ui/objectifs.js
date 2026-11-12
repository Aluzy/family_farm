// objectifs.js — les objectifs du jour (la refonte du didacticiel, lot 2 ; le moteur : js/engine/objectifs.js).
//
// Une pastille sous l'horloge (sous la boussole quand elle est là) : « 📜 Jour 1 · 1/2 ». Touchée, le carnet
// s'ouvre : le titre du jour, ses objectifs (une case cochée quand c'est fait, leur compte), la récompense et
// « Montre-moi ». Montre-moi ferme le carnet et guide la première tâche à faire : une bulle en bas de l'écran
// (celle du didacticiel : .didac-bulle) dit quoi faire, ce qu'il faut toucher brille d'une lueur blanche
// (.didac-ring) et la carte fait briller ce qu'il faut toucher (surbrillanceObjectifs). Le guide passe de lui-même à
// la tâche suivante ; « Arrêter » le range. Les bulles des étapes viennent du didacticiel (ETAPES_UI : les
// mêmes gestes, les mêmes cibles) ; celles qui manquent sont ici (GUIDES).
//
// À chaque rendu, majObjectifs : le jour fini, sa récompense (une notification) ; le lendemain matin, le
// suivant (une notification aussi).

import { DATA } from '../engine/catalog.js';
import { countItem } from '../engine/inventory.js';
import { carnetDuJour, changerObjectif, majObjectifs, objectifsActifs, semaineDe, tacheAFaire } from '../engine/objectifs.js';
import { villageActif } from '../engine/village.js';
import { applyResult } from './game-actions.js';
import { montrerLieu } from '../engine/monde-vu.js';
import { state } from './store.js';
import { menuOpen } from './stage-windows.js';
import { persistState } from './storage.js';
import { morph, refresh } from './render.js';
import { registerActions } from './actions.js';
import { notify } from './toasts.js';
import {
  affichable, carteOuverte, construire, element, ETAPES_UI, fabriquer, menuCarte, montrerHameauVoisin, outil, prendreOutil, tenu,
} from './didacticiel.js';

let ouvert = false;      // le carnet est ouvert
let guide = false;       // « Montre-moi » : le guide de la tâche à faire
let anneau = null;       // l'élément qui porte l'anneau
let degagees = '';       // les cases de la carte déjà dégagées du brouillard

const nombre = (n) => `<span class="num">${n}</span>`;

// Les bulles que le didacticiel n'a pas (ou qu'il faut adapter) : { texte, cible, carte }.
const GUIDES = {
  // l'Atelier : d'abord les pierres, puis le bois, puis le poser
  atelier: () => {
    const C = DATA.ATELIER.CONSTRUCTION;
    if (countItem(state, 'pierre') < C.pierre) return ETAPES_UI.pierres;
    if (countItem(state, 'bois') < C.bois) return ETAPES_UI.bois;
    return ETAPES_UI.atelier;
  },
  couper: () => ({
    texte: () => (tenu('hache') ? 'Touche un <b>arbre</b> : quelques coups de hache, et il tombe.' : prendreOutil('<b>hache</b>')),
    cible: () => outil('hache'),
  }),
  casser: () => ({
    texte: () => (tenu('pioche') ? 'Touche un <b>rocher</b> : quelques coups de pioche, et il se brise.' : prendreOutil('<b>pioche</b>')),
    cible: () => outil('pioche'),
  }),
  cuisiniere: () => (countItem(state, 'cuisiniere') > 0
    ? { texte: () => 'Pose la <b>cuisinière</b> dans ton abri, sur la rangée du bas : 🔨 Construire.', cible: () => construire('cuisiniere') }
    : { texte: () => 'Fabrique la <b>cuisinière</b> à l\'Atelier : 6 pierres et 4 planches.', cible: () => fabriquer(['cuisiniere']).cible || null, carte: () => fabriquer(['cuisiniere']).carte || null }),
  cueillir: () => ({ texte: () => 'Chaque matin, des <b>buissons</b> portent des baies : touche-en un pour les cueillir.' }),
  recolter: () => ({ texte: () => 'Touche une plante <b>mûre</b> pour la récolter. (Touche une plante : une bulle te dit quand elle sera mûre.)' }),
  carte: () => ({
    texte: () => (carteOuverte() ? 'Voici le <b>grand monde</b> : ta ferme au milieu, le reste sous le brouillard.' : menuOpen ? 'Touche 🧭 <b>Carte du monde</b>.' : 'Ouvre la <b>carte du monde</b> : le menu (la flèche), puis 🧭 Carte du monde.'),
    cible: () => (carteOuverte() ? null : menuCarte()),
  }),
  parler: () => ({ texte: () => 'Au hameau, touche un <b>habitant</b> pour lui parler.' }),
  // (les objectifs tirés après la première semaine)
  cuisiner: () => ({ texte: () => 'Touche la <b>cuisinière</b> dans ta maison, puis choisis un plat dont tu as les ingrédients.', carte: () => ({ blocs: ['cuisiniere'] }) }),
  pecher: () => ({
    texte: () => (tenu('canne') ? 'Touche l\'<b>eau</b> (une rivière, un lac, la mer) pour lancer ta ligne.' : prendreOutil('<b>canne à pêche</b>')),
    cible: () => outil('canne'),
  }),
  oeufs: () => ({ texte: () => 'Au <b>Poulailler</b>, les poules ont pondu : touche-le, ton personnage va prendre les œufs.' }),
  lait: () => ({ texte: () => 'À l\'<b>Étable</b>, les vaches ont du lait : touche-la, ton personnage va les traire.' }),
};

// La bulle de la tâche `t` : { texte, cible, carte }.
function bulleDe(t) {
  if (!t) return null;
  if (GUIDES[t.guide]) return GUIDES[t.guide]();
  return ETAPES_UI[t.guide] || null;
}

// La tâche guidée (Montre-moi), ou null.
function guidee() {
  if (!guide || !affichable() || !objectifsActifs(state)) return null;
  const a = tacheAFaire(state);
  return a ? a.tache : null;
}

// Pour la carte (modèle.surbrillance, js/ui/stage.js) : ce que la scène fait briller, ou null.
export function surbrillanceObjectifs() {
  const b = bulleDe(guidee());
  return b && b.carte ? b.carte() : null;
}

function recompenseTexte(R) {
  const p = [];
  if (R.xp) p.push(`+${R.xp} XP`);
  if (R.pieces) p.push(`${R.pieces} pièces`);
  for (const [item, n] of Object.entries(R.objets || {})) p.push(`${n} ${DATA.OBJETS[item] ? DATA.OBJETS[item].icone : ''}`);
  return p.join(', ');
}

// (sous la boussole quand elle est là : le haut de la pastille, en px, ou null pour celui du CSS)
function hautPastille() {
  const bo = element('.boussole');
  return bo ? Math.round(bo.getBoundingClientRect().bottom + 6) : null;
}

function pastille(c) {
  const h = hautPastille(), sous = h !== null ? ` style="top:${h}px"` : '';
  const etat = c.attente ? '✓' : `${c.faits}/${c.total}`;
  return `<button type="button" class="obj-pastille${c.attente ? ' fini' : ''}" data-action="objectifs-carnet" aria-expanded="${ouvert}"${sous}
      aria-label="Objectifs du jour ${c.jour} : ${c.titre}, ${c.faits} sur ${c.total}">📜 Jour ${nombre(c.jour)} · ${etat}</button>`;
}

function carnet(c) {
  const lignes = c.objectifs.map((b) => `<li class="obj-ligne${b.fait ? ' fait' : ''}">
      <span class="obj-case" aria-hidden="true">${b.fait ? '✓' : ''}</span>
      <span class="obj-icone" aria-hidden="true">${b.icone}</span>
      <span class="obj-texte"><span class="obj-libelle">${b.libelle}</span>${b.sous ? `<small>${b.sous}</small>` : ''}</span>
      ${b.besoin > 1 || !b.fait ? `<span class="obj-compte num">${b.fait ? '✓' : `${b.n}/${b.besoin}`}</span>` : ''}
      ${c.changer && !b.fait ? `<button type="button" class="obj-changer" data-action="objectifs-changer" data-id="${b.id}" title="Un autre objectif à la place (une fois par jour)" aria-label="Changer : ${b.libelle}">↻</button>` : ''}
      <span class="visually-hidden">${b.fait ? 'fait' : 'à faire'}</span>
    </li>`).join('');
  const R = recompenseTexte(c.recompense);
  const h = hautPastille();
  return `<section class="obj-carnet" aria-labelledby="obj-titre"${h !== null ? ` style="top:${h + 44}px"` : ''}>
      <h2 id="obj-titre">Jour ${nombre(c.jour)} — ${c.titre}</h2>
      ${c.intro ? `<p class="obj-intro">${c.intro}</p>` : ''}
      <ul class="obj-liste">${lignes}</ul>
      ${c.attente ? '<p class="obj-intro">Bravo, la journée est faite ! La suite demain matin.</p>' : ''}
      <div class="obj-pied">
        ${c.attente ? '' : '<button type="button" class="btn primary" data-action="objectifs-montrer">Montre-moi</button>'}
        ${R ? `<span class="obj-recompense">⭐ ${R}</span>` : ''}
        <button type="button" class="obj-fermer" data-action="objectifs-carnet" aria-label="Fermer le carnet">✕</button>
      </div>
    </section>`;
}

export function renderObjectifs() {
  const root = document.getElementById('objectifs-root');
  if (!root) return;
  if (state && objectifsActifs(state)) {
    const ev = majObjectifs(state);
    if (ev) {
      persistState();
      if (ev.recompense) { notify(`📜 Jour ${ev.jour} fait : ${ev.titre} ! ${recompenseTexte(ev.recompense)}. La suite demain matin.`, { kind: 'succes' }); guide = false; }
      else if (ev.nouveau !== undefined) { const c = carnetDuJour(state); if (c) notify(`📜 Jour ${c.jour} : ${c.titre}. Touche le carnet pour voir tes objectifs.`, { kind: 'info' }); }
    }
  }
  const c = state && affichable() ? carnetDuJour(state) : null;
  // (le septième jour, le hameau voisin : il est montré sur la carte du monde, comme le cocher en a parlé ; le
  // chantier « l'île à bâtir » allumé, la semaine n'a pas de hameau, fiche I7a)
  if (c && !villageActif(state) && c.jour === semaineDe(state).length && !c.attente && montrerHameauVoisin()) persistState();
  // (les cases qui brillent sur la carte, la sortie de la ferme, sortent du brouillard, comme au didacticiel)
  const sb = c ? surbrillanceObjectifs() : null, cases = sb && Array.isArray(sb.cases) ? sb.cases : [];
  const cle = cases.map((x) => x.case).join(',');
  if (cases.length && cle !== degagees) { degagees = cle; let n = 0; for (const x of cases) n += montrerLieu(state, x.case, 4); if (n) persistState(); }
  // l'anneau de Montre-moi
  const t = c && !ouvert ? guidee() : null, b = bulleDe(t);
  const el = b && b.cible ? element(b.cible()) : null;
  if (anneau && anneau !== el) anneau.classList.remove('didac-ring');
  if (el && el !== anneau) el.classList.add('didac-ring');
  anneau = el;
  if (!c) { morph(root, ''); return; }
  const bulle = b ? `<section class="didac-bulle obj-guide${el && el.getBoundingClientRect().top > window.innerHeight * 0.55 ? ' haut' : ''}" aria-live="polite" aria-labelledby="obj-guide-texte">
      <p id="obj-guide-texte">${b.texte()}</p>
      <div class="didac-pied">
        <button type="button" class="didac-passer" data-action="objectifs-arreter">Arrêter</button>
        <span class="muted">📜 Jour ${nombre(c.jour)} · ${c.faits}/${c.total}</span>
      </div>
    </section>` : '';
  morph(root, `${pastille(c)}${ouvert ? carnet(c) : ''}${bulle}`);
}

registerActions({
  'objectifs-carnet': () => { ouvert = !ouvert; refresh(); },
  'objectifs-montrer': () => { ouvert = false; guide = true; refresh(); },
  'objectifs-arreter': () => { guide = false; refresh(); },
  // (après la première semaine : un objectif tiré se change, une fois par jour)
  'objectifs-changer': (target) => {
    const r = applyResult(changerObjectif(state, target.dataset.id));
    if (r.ok) persistState();
    refresh();
  },
});
