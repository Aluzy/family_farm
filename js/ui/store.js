/* ==========================================================================
   APP — sauvegarde, interface et boucle. Seul bloc à toucher au DOM, à
   window, au stockage ou à l'horloge.
   ========================================================================== */

import { DATA } from '../engine/catalog.js';
import { isUnlocked } from '../engine/campaign.js';
import { marcheOuvert } from '../engine/devices.js';

export const SAVE_KEY = 'ferme-save';
export const TICK_MS = 200;
export const MAX_FRAME_MS = 1000;
export const AUTOSAVE_MS = 10000;
export const RENDER_THROTTLE_MS = 200; // ~5 fois par seconde

export const TABS = [
  { id: 'ferme', label: 'Ferme', icon: '🏠' },
  { id: 'installations', label: 'Installations', icon: '🏗️' }, // fenêtre de la carte (ouverte depuis la carte)
  { id: 'commerce', label: 'Commerce', icon: '🏪' }, // version 1.14 : fenêtre de la carte (menu latéral), au niveau du commerce
  { id: 'famille', label: 'Famille', icon: '👨‍👩‍👧‍👦' },
  { id: 'inventaire', label: 'Inventaire', icon: '📦' },
  { id: 'atelier', label: 'Construire', icon: '🔨' }, // la ferme générée : le menu Construire (l'Atelier : touché sur la carte)
  { id: 'recettes', label: 'Livre de recette', icon: '📖' },
  { id: 'techno', label: 'Arbre des technologies', icon: '🌳' },
  { id: 'comptoir', label: 'Marché', icon: '🧺' },
  { id: 'ville', label: 'Ville', icon: '🏙️' }, // version 1.5 : sorties, voyages, marché de la ville
  { id: 'notifications', label: 'Notifications', icon: '✉️' },
];

// Menu latéral : les destinations, les unes au-dessus des autres (l'Arbre des technologies
// n'y apparaît qu'au premier point de technologie, FLU-28 ; le Commerce, au niveau qui le
// débloque). Les Installations n'y sont plus : tout ce qu'elles contiennent s'ouvre depuis la carte.
export const NAV_TABS = ['ferme', 'commerce', 'inventaire', 'atelier', 'comptoir', 'techno', 'notifications'];

// Écrans ouverts depuis la Ferme (raccourcis en haut de l'écran Ferme). Ils
// restent des onglets pour le moteur et le suivi, mais n'ont pas d'icône en bas :
// la barre garde alors « Ferme » allumé.
export const FERME_LINKS = ['famille', 'recettes', 'techno', 'ville'];

// Onglets toujours disponibles, sans passer par state.unlockedTabs (aucune migration).
const ALWAYS_TABS = ['notifications', 'ville', 'installations'];
export function tabAvailable(id) {
  // FLU-28 : l'Arbre des technologies se montre au premier point de technologie gagné
  if (id === 'techno' && !techTreeShown()) return false;
  if (id === 'commerce') return isUnlocked(state, 'commerce');
  if (id === 'atelier') return true;
  // le Marché ouvre à son niveau (devices.js, marcheOuvert)
  if (id === 'comptoir') return marcheOuvert(state);
  return ALWAYS_TABS.includes(id) || state.unlockedTabs.includes(id);
}

export function techTreeShown() {
  const pt = state.pointsTech;
  return !!((pt && pt.gagnes > 0) || (Array.isArray(state.technologies) && state.technologies.length));
}

export let state = null;
export function setState(value) {
  state = value;
  return value;
}
export let activeTab = 'ferme';
export function setActiveTab(value) {
  activeTab = value;
  return value;
}
export let ecranFerme = null; // écran de détail ouvert dans la Ferme : null, 'panneaux' ou 'batteries'
export function setEcranFerme(value) {
  ecranFerme = value;
  return value;
}
// Version 1.9 : mode houe ; version 1.15 : un appui sur une tuile d'herbe de la carte laboure, sur une terre vide rebouche.
export let hoeMode = false;
export function setHoeMode(value) {
  hoeMode = value;
  if (value) { axeMode = false; pickMode = false; rodMode = false; scytheMode = false; buildMode = null; } // un seul outil en main
  return value;
}
// La hache en main : un appui sur un arbre de la carte le fait couper (du bois).
export let axeMode = false;
export function setAxeMode(value) {
  axeMode = value;
  if (value) { hoeMode = false; pickMode = false; rodMode = false; scytheMode = false; buildMode = null; }
  return value;
}
// La pioche en main : un appui sur un rocher de la carte le fait casser (de la pierre).
export let pickMode = false;
export function setPickMode(value) {
  pickMode = value;
  if (value) { hoeMode = false; axeMode = false; rodMode = false; scytheMode = false; buildMode = null; }
  return value;
}
// La canne à pêche en main : un appui sur l'eau de la carte y fait pêcher (truite, brochet).
export let rodMode = false;
export function setRodMode(value) {
  rodMode = value;
  if (value) { hoeMode = false; axeMode = false; pickMode = false; scytheMode = false; buildMode = null; }
  return value;
}
// La faux en main : un appui sur une touffe d'herbe haute de la carte la fauche (de la fibre).
export let scytheMode = false;
export function setScytheMode(value) {
  scytheMode = value;
  if (value) { hoeMode = false; axeMode = false; pickMode = false; rodMode = false; buildMode = null; }
  return value;
}
// La ferme générée, le mode « Construire » : la sorte de bloc qu'un appui sur une case pose
// (null : le mode est fermé). Un seul outil ou mode à la fois.
export let buildMode = null;
export function setBuildMode(value) {
  buildMode = value || null;
  if (buildMode) { hoeMode = false; axeMode = false; pickMode = false; rodMode = false; scytheMode = false; }
  return buildMode;
}
// Le niveau où l'on construit, en mode Construire (0 : le sol, 1 : l'étage ; js/ui/chantier.js).
export let buildLevel = 0;
export function setBuildLevel(value) {
  buildLevel = Math.max(0, Math.floor(Number(value) || 0));
  return buildLevel;
}
// L'étage (un essai, js/engine/etage.js) : le personnage est-il monté par l'escalier ?
export let etageVue = false;
export function setEtageVue(value) {
  etageVue = !!value;
  return etageVue;
}
// Le coucher : le joueur a appuyé sur « Dormir », le personnage va à son lit (la carte le
// montre : la porte de la maison, l'intérieur, le lit). La nuit passe quand il y dort.
export let coucher = false;
export function setCoucher(value) {
  coucher = value;
  return value;
}
// Version 1.13 : case du Verger dont on choisit l'arbre (null : aucun choix ouvert).
export let vergerCase = null;
export function setVergerCase(value) {
  vergerCase = value;
  return value;
}
// Le mode test (Options) : gardé sur l'appareil. Son panneau s'ouvre par le menu latéral
// (« 🧪 Test ») et se ferme par son ✕ (testOpen).
const TEST_KEY = 'ferme-mode-test';
export let testMode = (() => { try { return window.localStorage.getItem(TEST_KEY) === '1'; } catch (e) { return false; } })();
export let testOpen = false;
export function setTestMode(value) {
  testMode = !!value;
  testOpen = testMode;
  try { if (testMode) window.localStorage.setItem(TEST_KEY, '1'); else window.localStorage.removeItem(TEST_KEY); } catch (e) { /* le temps de la visite */ }
  return testMode;
}
export function setTestOpen(value) {
  testOpen = !!value && testMode;
  return testOpen;
}
// Le « god mode » (Options, sous le mode test) : on passe d'une carte à l'autre par un menu,
// sans y mener le personnage (js/ui/excursion.js). Gardé sur l'appareil.
const GOD_KEY = 'ferme-god-mode';
export let godMode = (() => { try { return window.localStorage.getItem(GOD_KEY) === '1'; } catch (e) { return false; } })();
export function setGodMode(value) {
  godMode = !!value;
  try { if (godMode) window.localStorage.setItem(GOD_KEY, '1'); else window.localStorage.removeItem(GOD_KEY); } catch (e) { /* le temps de la visite */ }
  return godMode;
}
// Les autres cartes que la ferme et sa mine (la transition, la ville, la montagne, la plage,
// leurs grottes, l'infra-monde) : ouvertes si les données le disent (DATA.CARTES.AUTRES), et
// toujours en god mode.
export function cartesOuvertes() {
  return !!(DATA.CARTES && DATA.CARTES.AUTRES) || godMode;
}
export let invTab = 'frais'; // Inventaire : 'frais', 'graines' ou 'produits'
export function setInvTab(value) {
  invTab = value;
  return value;
}
export let comptoirTab = 'vendre'; // Marché : 'vendre', 'acheter', 'graines' ou 'animaux'
export function setComptoirTab(value) {
  comptoirTab = value;
  return value;
}
export let comptoirTabChoisi = 'vendre'; // FLU-13 : le dernier onglet du Marché choisi par le joueur
export function setComptoirTabChoisi(value) {
  comptoirTabChoisi = value;
  return value;
}
export const BUY_MAX = 99; // plus grande quantité qu'on peut choisir d'acheter en une fois
