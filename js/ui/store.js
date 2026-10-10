/* ==========================================================================
   APP — sauvegarde, interface et boucle. Seul bloc à toucher au DOM, à
   window, au stockage ou à l'horloge.
   ========================================================================== */

export const SAVE_KEY = 'ferme-save';
export const TICK_MS = 200;
export const MAX_FRAME_MS = 1000;
export const AUTOSAVE_MS = 10000;
export const RENDER_THROTTLE_MS = 200; // ~5 fois par seconde

export const TABS = [
  { id: 'ferme', label: 'Ferme', icon: '🏠' },
  { id: 'famille', label: 'Famille', icon: '👨‍👩‍👧‍👦' },
  { id: 'inventaire', label: 'Inventaire', icon: '📦' },
  { id: 'recettes', label: 'Livre de recette', icon: '📖' },
  { id: 'techno', label: 'Arbre des technologies', icon: '🌳' },
  { id: 'comptoir', label: 'Marché', icon: '🧺' },
  { id: 'ville', label: 'Ville', icon: '🏙️' }, // version 1.5 : sorties, voyages, marché de la ville
  { id: 'notifications', label: 'Notifications', icon: '✉️' },
];

// Barre de menu du bas : quatre destinations, côte à côte.
export const NAV_TABS = ['ferme', 'inventaire', 'comptoir', 'notifications'];

// Écrans ouverts depuis la Ferme (raccourcis en haut de l'écran Ferme). Ils
// restent des onglets pour le moteur et le suivi, mais n'ont pas d'icône en bas :
// la barre garde alors « Ferme » allumé.
export const FERME_LINKS = ['famille', 'recettes', 'techno', 'ville'];

// Onglets toujours disponibles, sans passer par state.unlockedTabs (aucune migration).
const ALWAYS_TABS = ['notifications', 'ville'];
export function tabAvailable(id) {
  return ALWAYS_TABS.includes(id) || state.unlockedTabs.includes(id);
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
// Version 1.9 : mode houe (Zone de culture et Champ) : un appui sur une case laboure ou rebouche.
export let hoeMode = false;
export function setHoeMode(value) {
  hoeMode = value;
  return value;
}
export let testMode = false;
export function setTestMode(value) {
  testMode = value;
  return value;
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
export const sellQuantities = {}; // quantité choisie par item dans l'onglet Vendre
export const buyQuantities = {}; // quantité choisie par item dans les onglets Acheter et Graines
export const animalQuantities = {}; // quantité choisie par espèce dans l'onglet Animaux
export const BUY_MAX = 99; // plus grande quantité qu'on peut choisir d'acheter en une fois
