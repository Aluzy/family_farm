/* ---------- F0-6 : les mesures de performance, dans le mode test (docs/perf.md) ----------
   Un volet du mode test (jeu.html, « 📏 Mesures ») pour mesurer le jeu sur le téléphone de référence :
     - « Bâtir la ferme d'essai » : le scénario « ferme construite » (js/engine/testmode.js,
       testFermeConstruite), puis la page se recharge (la carte relit ses blocs) ;
     - « Mesurer 30 s » : pendant 30 s, la durée de chaque image affichée (requestAnimationFrame), puis
       le rapport : images par seconde, images lentes, la plus longue, la mémoire, le chargement, la
       sauvegarde (taille, durée : js/ui/storage.js, statsSauvegarde), l'appareil et la partie ; chaque
       budget de docs/perf.md marqué ✅ ou ❌ ;
     - « Copier le rapport » : le texte, à coller dans un message ou dans docs/perf.md.
   Rien ne part de l'appareil : le rapport reste à l'écran jusqu'à ce qu'on le copie. */

import { DATA } from '../engine/catalog.js';
import { blocsPoses } from '../engine/blocs.js';
import { etageBlocs } from '../engine/etage.js';
import { testFermeConstruite } from '../engine/testmode.js';
import { GAME_VERSION } from '../engine/base.js';
import { state } from './store.js';
import { persistState, statsSauvegarde } from './storage.js';
import { notify } from './toasts.js';
import { fermeVenue } from './ferme-gardee.js';
import { registerActions } from './actions.js';

// Les budgets (docs/perf.md, « cosy standard ») sur le téléphone de référence (Redmi Note 13).
export const BUDGETS = {
  IMAGES_MIN: 30,        // images par seconde : au moins 30 (60 visées)…
  PART_LENTES_MAX: 5,    // … soit au plus 5 % d'images de plus de 1000/30 ms
  PRETE_MS: 5000,        // le jeu affiché (l'écran de chargement retiré) moins de 5 s après l'ouverture de la page
  SAUVEGARDE_MS: 16,     // une sauvegarde : moins de 16 ms (une image)
};
const DUREE_S = 30;

// Le moment où le jeu est jouable, mesuré depuis l'ouverture de la page : l'écran de chargement retiré
// (jeu.html, Chargement.fini : la vue sous la caméra entièrement dessinée, js/farm-stage.js). Relevé
// une fois, à son premier appel (ces modules sont lus avant que la carte ne le demande).
let cartePrete = null;
if (typeof window !== 'undefined' && window.Chargement && typeof window.Chargement.fini === 'function') {
  const fini = window.Chargement.fini;
  window.Chargement.fini = function (...a) {
    if (cartePrete === null) cartePrete = Math.round(performance.now());
    return fini.apply(this, a);
  };
}

// La mesure en cours : la date de chaque image.
let mesure = null;
let rapport = '';

function quantile(tri, q) {
  return tri.length ? tri[Math.min(tri.length - 1, Math.floor(q * tri.length))] : 0;
}

function appareil() {
  const n = navigator, K = window.CarteKit;
  return [
    `Navigateur : ${n.userAgent}`,
    `Écran : ${screen.width} × ${screen.height} (fenêtre ${innerWidth} × ${innerHeight}, densité ${devicePixelRatio})`,
    `Processeurs : ${n.hardwareConcurrency || '?'} · mémoire de l'appareil : ${n.deviceMemory ? n.deviceMemory + ' Go' : '?'}`,
    `Qualité de l'affichage : ${K && K.qualite ? K.qualite() : '?'}`,
  ];
}

function partie() {
  const B = blocsPoses(state), sortes = Object.values(B), A = DATA.ATELIER.BLOCS;
  const meubles = sortes.filter((s) => A[s] && A[s].meuble).length;
  const s = statsSauvegarde();
  return [
    `Jeu ${GAME_VERSION}, sauvegarde v${state.version} · graine ${state.carte && state.carte.graine}`,
    `Blocs posés : ${sortes.length} (dont ${meubles} meubles) · sols : ${Object.keys(state.sols || {}).length} · étage : ${Object.keys(etageBlocs(state)).length}`,
    `Sauvegarde : ${s.taille ? Math.round(s.taille / 1024) + ' Ko' : '?'} · ${s.n} écritures depuis l'ouverture`,
    `Ferme générée : ${fermeVenue() === 'appareil' ? 'relue de l\'appareil' : 'tirée de la graine'} à l'ouverture`,
  ];
}

const coche = (ok) => (ok ? '✅' : '❌');

function faireRapport(images) {
  const durees = [];
  for (let i = 1; i < images.length; i++) durees.push(images[i] - images[i - 1]);
  const tri = durees.slice().sort((a, b) => a - b);
  const total = (images[images.length - 1] - images[0]) / 1000;
  const fps = total > 0 ? durees.length / total : 0;
  const lent = 1000 / BUDGETS.IMAGES_MIN + 0.5;
  const lentes = durees.filter((d) => d > lent).length, partLentes = durees.length ? (100 * lentes) / durees.length : 0;
  const s = statsSauvegarde();
  const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
  const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  const lignes = [
    `📏 Family Farm — mesures (${new Date().toLocaleString('fr-FR')})`,
    '',
    '— Budgets (docs/perf.md) —',
    `${coche(fps >= BUDGETS.IMAGES_MIN && partLentes <= BUDGETS.PART_LENTES_MAX)} Images : ${fps.toFixed(1)} par seconde en moyenne, ${partLentes.toFixed(1)} % de plus de ${Math.round(lent)} ms (budget : ≥ ${BUDGETS.IMAGES_MIN}/s, ≤ ${BUDGETS.PART_LENTES_MAX} % lentes)`,
    `${cartePrete !== null ? coche(cartePrete < BUDGETS.PRETE_MS) : '❔'} Jeu affiché (écran de chargement retiré) : ${cartePrete !== null ? cartePrete + ' ms après l\'ouverture de la page' : 'pas relevé'} (budget : < ${BUDGETS.PRETE_MS} ms)`,
    `${s.n ? coche(s.max < BUDGETS.SAUVEGARDE_MS) : '❔'} Sauvegarde : ${s.n ? `${s.derniere.toFixed(1)} ms la dernière, ${s.max.toFixed(1)} ms au plus` : 'aucune encore'} (budget : < ${BUDGETS.SAUVEGARDE_MS} ms)`,
    '',
    '— Détail —',
    `Mesuré pendant ${total.toFixed(1)} s : ${durees.length} images · médiane ${quantile(tri, 0.5).toFixed(1)} ms · 95 % sous ${quantile(tri, 0.95).toFixed(1)} ms · 99 % sous ${quantile(tri, 0.99).toFixed(1)} ms · la plus longue ${(tri[tri.length - 1] || 0).toFixed(0)} ms`,
    `Mémoire du jeu : ${mem !== null ? mem + ' Mo' : 'non disponible dans ce navigateur'}`,
    nav ? `Page : HTML lu en ${Math.round(nav.responseEnd)} ms, scripts prêts en ${Math.round(nav.domContentLoadedEventEnd)} ms, chargée en ${Math.round(nav.loadEventEnd)} ms` : 'Page : temps de chargement non disponibles',
    '',
    '— Appareil —',
    ...appareil(),
    '',
    '— Partie —',
    ...partie(),
  ];
  return lignes.join('\n');
}

function afficher() {
  const box = document.getElementById('perf-rapport');
  if (!box) return;
  box.hidden = !rapport;
  box.textContent = rapport;
  const copier = document.querySelector('[data-action="test-perf-copier"]');
  if (copier) copier.disabled = !rapport;
}

function mesurer() {
  if (mesure) return;
  mesure = { images: [], fin: performance.now() + DUREE_S * 1000 };
  notify(`📏 Mesure de ${DUREE_S} s : joue normalement (marche, construis, tourne la vue).`, { duree: 4000 });
  const bouton = document.querySelector('[data-action="test-perf-mesurer"]');
  const image = (t) => {
    if (!mesure) return;
    mesure.images.push(t);
    if (bouton) bouton.textContent = `Mesure en cours… ${Math.max(0, Math.ceil((mesure.fin - t) / 1000))} s`;
    if (t < mesure.fin) { requestAnimationFrame(image); return; }
    rapport = faireRapport(mesure.images);
    mesure = null;
    if (bouton) bouton.textContent = `Mesurer ${DUREE_S} s`;
    afficher();
    notify('📏 Mesure terminée : le rapport est dans le mode test (📏 Mesures).');
  };
  requestAnimationFrame(image);
}

async function copier() {
  if (!rapport) return;
  try {
    await navigator.clipboard.writeText(rapport);
    notify('📋 Rapport copié.');
  } catch (e) {
    // (sans presse-papiers : le texte sélectionné, à copier à la main)
    const box = document.getElementById('perf-rapport');
    const r = document.createRange();
    r.selectNodeContents(box);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    notify('Le rapport est sélectionné : copie-le (appui long › Copier).');
  }
}

registerActions({
  'test-ferme-construite': () => {
    const r = testFermeConstruite(state);
    persistState();
    notify(`🏡 Ferme d'essai bâtie : ${r.poses} blocs. La page se recharge.`);
    setTimeout(() => location.reload(), 600);
  },
  'test-perf-mesurer': () => mesurer(),
  'test-perf-copier': () => { copier(); },
});
