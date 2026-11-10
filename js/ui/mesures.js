/* ---------- F0-6 : les mesures de performance, dans le mode test (docs/perf.md) ----------
   Un volet du mode test (jeu.html, « 📏 Mesures ») pour mesurer le jeu sur le téléphone de référence :
     - « Bâtir la ferme d'essai » : le scénario « ferme construite » (js/engine/testmode.js,
       testFermeConstruite), puis la page se recharge (la carte relit ses blocs) ;
     - « Mesurer 30 s » : pendant 30 s, la durée de chaque image affichée (requestAnimationFrame), puis
       le rapport : images par seconde, images lentes, la plus longue, la mémoire, le chargement, la
       sauvegarde (taille, durée : js/ui/storage.js, statsSauvegarde), l'appareil et la partie ; chaque
       budget de docs/perf.md marqué ✅ ou ❌ ;
     - « Mesurer Construire » : le jeu fait seul les gestes du mode Construire (l'ouvrir, attendre,
       poser un bloc près du centre de l'écran, prendre la gomme, l'effacer, fermer) ; pour chacun, le
       délai jusqu'à l'image affichée après lui, les images des secondes qui suivent, les tâches longues,
       et où le temps est passé (js/ui/chrono.js : l'interface, le moteur, chaque méthode de la carte,
       le dessin de Phaser) ;
     - « Copier le rapport » : le texte, à coller dans un message ou dans docs/perf.md.
   Rien ne part de l'appareil : le rapport reste à l'écran jusqu'à ce qu'on le copie. */

import { DATA } from '../engine/catalog.js';
import { blocsPoses } from '../engine/blocs.js';
import { etageBlocs } from '../engine/etage.js';
import { testFermeConstruite } from '../engine/testmode.js';
import { GAME_VERSION } from '../engine/base.js';
import { buildMode, state } from './store.js';
import { persistState, statsSauvegarde } from './storage.js';
import { notify } from './toasts.js';
import { fermeVenue } from './ferme-gardee.js';
import { registerActions } from './actions.js';
import { runAction } from './events.js';
import { demarrer, noter, postes } from './chrono.js';

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
    `Essai sol GPU (fiche 34) : ${ESSAI_SOL[essaiSol()]}${regionsGPU()}`,
  ];
}

// Fiche 35, la mesure sur le téléphone : l'essai du sol en objets GPU (js/carte/ferme/sol-gpu.js), éteint ('0'),
// le sol ('1'), le sol et le menu décor ('2') ; gardé dans l'appareil, lu au chargement de la carte.
const ESSAI_SOL = { 0: 'éteint', 1: 'le sol', 2: 'le sol et le décor' };
const CLE_ESSAI_SOL = 'ferme-essai-sol-gpu';
function essaiSol() {
  try { const v = localStorage.getItem(CLE_ESSAI_SOL); return v === '1' || v === '2' ? Number(v) : 0; } catch (e) { return 0; }
}
// (les régions de la vue dessinées en GPU / toutes celles dessinées)
function regionsGPU() {
  const sc = window.FarmStage && FarmStage.scene && FarmStage.scene();
  if (!sc || !sc.regions) return '';
  const R = [...sc.regions.values()].filter((r) => r.tex);
  return ` · régions dessinées : ${R.length}, dont ${R.filter((r) => r.gpu).length} en GPU`;
}
function boutonEssaiSol() {
  const b = document.querySelector('[data-action="test-essai-sol"]');
  if (b) b.textContent = `Essai sol GPU : ${ESSAI_SOL[essaiSol()]}`;
}
if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boutonEssaiSol); else boutonEssaiSol(); }

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
    `📏 Moon Bloom Village — mesures (${new Date().toLocaleString('fr-FR')})`,
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

/* ---------- « Mesurer Construire » ---------- */

const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
const deuxImages = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));

// Le temps de chaque méthode de la scène de la carte (son prototype, jusqu'à Phaser.Scene) et du dessin
// de Phaser, notés dans le chronomètre. → une fonction qui remet tout comme avant.
function espionnerCarte() {
  const sc = window.FarmStage && FarmStage.scene && FarmStage.scene();
  if (!sc) return () => {};
  const remis = [], base = window.Phaser && Phaser.Scene && Phaser.Scene.prototype;
  for (let P = Object.getPrototypeOf(sc); P && P !== base && P !== Object.prototype; P = Object.getPrototypeOf(P)) {
    for (const nom of Object.getOwnPropertyNames(P)) {
      const d = Object.getOwnPropertyDescriptor(P, nom);
      if (nom === 'constructor' || !d || typeof d.value !== 'function') continue;
      const f = d.value;
      P[nom] = function (...a) { const t = performance.now(); try { return f.apply(this, a); } finally { noter('carte : ' + nom, performance.now() - t); } };
      remis.push(() => { P[nom] = f; });
    }
  }
  let t0 = 0;
  const avant = () => { t0 = performance.now(); }, apres = () => { if (t0) noter('Phaser : dessin de l\'image (JS)', performance.now() - t0); };
  sc.game.events.on('prerender', avant);
  sc.game.events.on('postrender', apres);
  remis.push(() => { sc.game.events.off('prerender', avant); sc.game.events.off('postrender', apres); });
  return () => remis.forEach((f) => f());
}

// Une case près du centre de l'écran où le bloc en main se pose, ou null.
function caseLibre() {
  const sc = FarmStage.scene(), T0 = sc.ctx.bridge.trace, W = sc.grid.cols, v = sc.cameras.main.worldView;
  const cx = Math.floor((v.x + v.width / 2) / 16), cy = Math.floor((v.y + v.height / 2) / 16);
  for (let d = 0; d < 10; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
    const t = (cy + dy) * W + cx + dx;
    if (T0.posable(t) === 'ok') return t;
  }
  return null;
}

let enCours = false;
async function mesurerConstruire() {
  if (enCours) return;
  if (!window.FarmStage || !FarmStage.scene || !FarmStage.scene()) { notify('📏 La carte n\'est pas là : ouvre la Ferme d\'abord.'); return; }
  enCours = true;
  const bouton = document.querySelector('[data-action="test-perf-construire"]');
  const etat = (t) => { if (bouton) bouton.textContent = t; };
  document.getElementById('test-panel').hidden = true;   // (le panneau caché : la carte comme en jouant)
  const longues = [];
  let obs = null;
  try { obs = new PerformanceObserver((l) => { for (const e of l.getEntries()) longues.push(e.duration); }); obs.observe({ entryTypes: ['longtask'] }); } catch (e) { obs = null; }
  const remettre = espionnerCarte();
  const lignes = [`📏 Moon Bloom Village — Construire mesuré sur l'appareil (${new Date().toLocaleString('fr-FR')})`, ''];
  let tuile = null;
  const geste = async (nom, faire, apres = 3000) => {
    etat(`Mesure : ${nom}…`);
    await attendre(800);
    demarrer(true);
    longues.length = 0;
    const images = [];
    let fin = false;
    const image = (t) => { images.push(t); if (!fin) requestAnimationFrame(image); };
    requestAnimationFrame(image);
    const t0 = performance.now();
    let erreur = null;
    try { faire(); } catch (e) { erreur = e.message; }
    await deuxImages();
    const reponse = performance.now() - t0;
    await attendre(apres);
    fin = true;
    const P = postes();
    demarrer(false);
    const d = []; for (let i = 1; i < images.length; i++) d.push(images[i] - images[i - 1]);
    const tri = d.slice().sort((a, b) => a - b);
    lignes.push(`— ${nom} —${erreur ? ` (erreur : ${erreur})` : ''}`);
    lignes.push(`Image affichée après le geste : ${Math.round(reponse)} ms · puis ${d.length} images en ${(apres / 1000).toFixed(0)} s (médiane ${Math.round(quantile(tri, 0.5))} ms, la plus longue ${Math.round(tri[tri.length - 1] || 0)} ms)`);
    lignes.push(obs ? `Tâches longues : ${longues.length}, ${Math.round(longues.reduce((a, x) => a + x, 0))} ms en tout, la plus longue ${Math.round(Math.max(0, ...longues))} ms` : 'Tâches longues : non mesurables dans ce navigateur');
    lignes.push('Temps passé (inclus ; les plus lourds) :');
    for (const p of P.slice(0, 14)) lignes.push(`  ${String(Math.round(p.ms)).padStart(6)} ms  ${p.nom} (${p.n} fois, ${Math.round(p.max)} ms au plus)`);
    lignes.push('');
  };
  try {
    const construire = () => document.querySelector('[data-action="build-toggle"]');
    if (buildMode) construire().click();   // (déjà ouvert : refermé d'abord)
    await attendre(1500);
    await geste('Ouvrir Construire', () => construire().click());
    await geste('Au repos dans Construire', () => {});
    tuile = caseLibre();
    if (tuile === null) lignes.push('(pas de case où poser le bloc en main près du centre de l\'écran : pose et gomme pas mesurées)', '');
    else {
      await geste('Poser un bloc', () => runAction('bloc', { dataset: { case: String(tuile) } }));
      await geste('Prendre la gomme', () => document.querySelector('[data-action="build-gomme"]').click());
      await geste('Effacer le bloc', () => runAction('bloc', { dataset: { case: String(tuile) } }));
      await geste('Reposer la gomme', () => document.querySelector('[data-action="build-gomme"]').click(), 1500);
    }
    await geste('Fermer Construire', () => construire().click());
  } finally {
    remettre();
    if (obs) obs.disconnect();
    demarrer(false);
    enCours = false;
    etat('Mesurer Construire');
    document.getElementById('test-panel').hidden = false;
  }
  lignes.push('— Appareil —', ...appareil(), '', '— Partie —', ...partie());
  rapport = lignes.join('\n');
  afficher();
  notify('📏 Construire mesuré : le rapport est dans le mode test (📏 Mesures).');
}

registerActions({
  'test-perf-construire': () => { mesurerConstruire(); },
  'test-ferme-construite': () => {
    const r = testFermeConstruite(state);
    persistState();
    notify(`🏡 Ferme d'essai bâtie : ${r.poses} blocs. La page se recharge.`);
    setTimeout(() => location.reload(), 600);
  },
  'test-perf-mesurer': () => mesurer(),
  'test-essai-sol': () => {
    const v = (essaiSol() + 1) % 3;
    try { if (v) localStorage.setItem(CLE_ESSAI_SOL, String(v)); else localStorage.removeItem(CLE_ESSAI_SOL); } catch (e) { /* le temps de la visite */ }
    persistState();
    notify(`🧪 Essai sol GPU : ${ESSAI_SOL[v]}. La page se recharge.`);
    setTimeout(() => location.reload(), 600);
  },
  'test-perf-copier': () => { copier(); },
});
