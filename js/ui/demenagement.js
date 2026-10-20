// demenagement.js — une ancienne partie (la carte de Tiled) déménage sur une terre sauvage
// (docs/carte-generee.md, « Les anciennes parties », étape 2) : la fenêtre qui le propose au
// chargement (une fois par visite, puis tous les DEMENAGEMENT_DELAI jours après « plus tard »),
// avec l'aperçu de la nouvelle terre ; on la rouvre depuis les Options.

import { DATA } from '../engine/catalog.js';
import { setupPending } from '../engine/depart.js';
import {
  apercuDemenagement, convertirPartie, demenagementPossible, demenagementPropose,
  graineDemenagement, reporterDemenagement,
} from '../engine/demenagement.js';
import { escapeHtml } from '../engine/format.js';
import { SAVE_KEY, state } from './store.js';
import { persistState, safeStorageGet, safeStorageSet } from './storage.js';
import { registerActions } from './actions.js';
import { closeModal, openModal } from './modal.js';
import { storyOpen, tutorialShown } from './calme.js';
import { tel } from './consent.js';

// La sauvegarde d'avant le déménagement, gardée sur l'appareil (au cas où).
export const SAVE_AVANT_DEMENAGEMENT = 'ferme-save-avant-demenagement';

const BATIS = {
  maison: '🏠 le foyer (une paillasse par membre, le four et la cuisinière)',
  poulailler: '🐔 le Poulailler et son enclos',
  paturage: '🐑 l\'Étable et son enclos',
  serre: '🌱 la Serre',
  silo: '🌾 le Silo',
  moulin: '⚙️ le Moulin',
  appareils: '💧 le puits, le panneau, la citerne et la batterie',
  station_robot: '🤖 la station du robot',
};

// Les couleurs de l'aperçu (une case : un carré).
const COULEURS = {
  h: '#7aa64a', a: '#3f6b2c', e: '#4f86b8', c: '#c9a46a',
  mur: '#6d5a48', porte: '#a0703c', barriere: '#8b6a3e', bloc: '#e4c27a', parcelle: '#7a4f2c', arbre: '#d9483b',
};

let proposeeCetteVisite = false;
let graineChoisie = null;

// Appelée à chaque image (ui/loop.js) : la proposition s'ouvre une fois par visite, quand rien
// d'autre n'est à l'écran.
export function watchDemenagement() {
  if (proposeeCetteVisite || !state || setupPending(state) || !demenagementPropose(state)) return;
  if (document.getElementById('modal-root').childElementCount > 0 || storyOpen() || tutorialShown()) return;
  proposeeCetteVisite = true;
  openDemenagementModal();
}

function listeRendus(rendus) {
  const total = {};
  for (const objets of Object.values(rendus)) for (const [o, n] of Object.entries(objets)) total[o] = (total[o] || 0) + n;
  return Object.entries(total).map(([o, n]) => `${n} × ${escapeHtml((DATA.OBJETS[o] && DATA.OBJETS[o].nom) || o)}`).join(', ');
}

export function openDemenagementModal() {
  if (!demenagementPossible(state)) return;
  tel('modal', 'demenagement');
  if (graineChoisie === null) graineChoisie = graineDemenagement(state);
  openModal(`
    <h2 id="demenagement-title">🚚 Une terre sauvage</h2>
    <p>La ferme peut déménager sur une terre sauvage, quatre fois plus grande : on y ramasse, on fabrique à l'Atelier et on bâtit bloc par bloc.</p>
    <p class="muted">Rien ne se perd : l'argent, l'inventaire, le niveau, la famille, les bêtes et les cultures suivent. Tes bâtiments sont rebâtis en blocs, à leur place dans la cour, et l'Atelier est déjà construit.</p>
    <div class="demenagement-apercu">
      <canvas id="demenagement-carte" width="1" height="1" aria-label="Aperçu de la nouvelle terre"></canvas>
      <p class="muted demenagement-legende">
        <span style="color:${COULEURS.mur}">■</span> murs ·
        <span style="color:${COULEURS.barriere}">■</span> barrières ·
        <span style="color:${COULEURS.bloc}">■</span> blocs ·
        <span style="color:${COULEURS.parcelle}">■</span> cultures ·
        <span style="color:${COULEURS.arbre}">●</span> arbres fruitiers ·
        <span style="color:${COULEURS.e}">■</span> eau
      </p>
    </div>
    <div class="stack" id="demenagement-detail"></div>
    <label class="setup-graine" for="demenagement-graine">Graine <span class="muted">(la même graine, la même terre)</span></label>
    <div class="row">
      <input type="text" id="demenagement-graine" class="member-input" inputmode="numeric" maxlength="12" autocomplete="off" value="${escapeHtml(graineChoisie)}">
      <button type="button" class="btn" data-action="demenagement-hasard">🎲 Une autre terre</button>
    </div>
    <p class="muted">On ne revient pas sur la ferme du grand-père : la partie d'avant reste gardée sur cet appareil, au cas où.</p>
    <div class="row">
      <button type="button" class="btn primary" data-action="demenagement-ok">🚚 Déménager</button>
      <button type="button" class="btn" data-action="demenagement-plus-tard">Plus tard</button>
    </div>`, { labelledBy: 'demenagement-title', className: 'modal demenagement-modal', id: 'demenagement-modal', dismiss: false });
  const champ = document.getElementById('demenagement-graine');
  champ.addEventListener('change', () => { graineChoisie = champ.value.trim() || graineDemenagement(state); dessiner(); });
  dessiner();
}

// L'aperçu : la nouvelle terre autour de la cour, ce qui y est rebâti et ce qui revient dans
// l'inventaire.
function dessiner() {
  const a = apercuDemenagement(state, graineChoisie);
  const detail = document.getElementById('demenagement-detail');
  const canvas = document.getElementById('demenagement-carte');
  if (!detail || !canvas) return;
  if (!a.ok) { detail.innerHTML = `<p class="alert">${escapeHtml(a.error || 'Impossible.')}</p>`; return; }
  // la cour et 12 cases autour
  const [c0, r0, c1, r1] = a.cour || [0, 0, a.largeur - 1, a.hauteur - 1];
  const x0 = Math.max(0, c0 - 12), y0 = Math.max(0, r0 - 12), x1 = Math.min(a.largeur - 1, c1 + 12), y1 = Math.min(a.hauteur - 1, r1 + 12);
  const k = 4, w = x1 - x0 + 1, h = y1 - y0 + 1;
  canvas.width = w * k;
  canvas.height = h * k;
  const g = canvas.getContext('2d');
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      g.fillStyle = COULEURS[a.sol[y * a.largeur + x]];
      g.fillRect((x - x0) * k, (y - y0) * k, k, k);
    }
  }
  const poser = (t, couleur, rond) => {
    const x = t % a.largeur, y = Math.floor(t / a.largeur);
    if (x < x0 || x > x1 || y < y0 || y > y1) return;
    g.fillStyle = couleur;
    if (rond) { g.beginPath(); g.arc((x - x0 + 0.5) * k, (y - y0 + 0.5) * k, k * 0.75, 0, Math.PI * 2); g.fill(); } else g.fillRect((x - x0) * k, (y - y0) * k, k, k);
  };
  for (const t of a.parcelles) poser(t, COULEURS.parcelle);
  for (const [t, sorte] of Object.entries(a.blocs)) {
    const s = DATA.ATELIER.BLOCS[sorte] || {};
    poser(Number(t), s.porte ? COULEURS.porte : s.mur ? COULEURS.mur : sorte === 'barriere' ? COULEURS.barriere : COULEURS.bloc);
  }
  for (const t of a.arbres) poser(t, COULEURS.arbre, true);
  const batis = a.batis.map((id) => `<li>${BATIS[id] || escapeHtml(id)}</li>`).join('');
  const rendus = listeRendus(a.rendus);
  detail.innerHTML = `
    ${batis ? `<strong>Rebâti dans la cour</strong><ul class="demenagement-liste">${batis}</ul>` : ''}
    ${rendus ? `<p class="muted">Dans l'inventaire, à poser : ${rendus}.</p>` : ''}`;
}

registerActions({
  'demenagement-hasard': () => {
    graineChoisie = String(Math.floor(Math.random() * 1e6));
    const champ = document.getElementById('demenagement-graine');
    if (champ) champ.value = graineChoisie;
    dessiner();
  },
  'demenagement-plus-tard': () => {
    reporterDemenagement(state);
    persistState();
    closeModal();
  },
  'demenagement-ok': () => {
    const champ = document.getElementById('demenagement-graine');
    const graine = (champ && champ.value.trim()) || graineChoisie;
    // la partie d'avant reste sur l'appareil
    const avant = safeStorageGet(SAVE_KEY);
    if (avant) safeStorageSet(SAVE_AVANT_DEMENAGEMENT, avant);
    const r = convertirPartie(state, graine);
    if (!r.ok) return;
    persistState();
    location.reload();
  },
  'open-demenagement': () => {
    closeModal();
    openDemenagementModal();
  },
});

