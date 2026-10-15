/* ---------- registre des actions (délégation d'événements) ---------- */

// Chaque valeur de data-action a sa fonction : (target, e, action) => { … }, où
// target est l'élément qui porte data-action. Un écran déclare les siennes avec
// registerActions({ … }) ; l'unique écouteur de clics de la page les appelle.
// Une action déclarée deux fois est une erreur (le second écran masquerait le premier).
export const ACTIONS = {};

export function registerActions(handlers) {
  for (const [name, fn] of Object.entries(handlers)) {
    if (ACTIONS[name]) throw new Error(`Action déclarée deux fois : ${name}`);
    ACTIONS[name] = fn;
  }
}

// Version 1.19 : la nuit (de 22 h à 6 h), la famille dort. Ces actions de jeu attendent le
// matin ; on peut toujours regarder (fenêtres, onglets, inventaire). NUIT_PERMISES : les
// actions de jeu qui restent possibles (passer la nuit ; la famille, qui ne touche pas à la
// ferme ; arroser depuis le résumé du réveil, qui s'ouvre au matin). scripts/check-actions.mjs
// vérifie que chaque action de jeu du rapport est dans l'une des deux listes.
export const NUIT_PERMISES = new Set([
  'sleep', 'wake-water', 'member-save', 'member-add', 'member-remove', 'main-character', 'setup-start',
  'pet-add', 'pet-save', 'pet-remove', 'tool-use',
]);
export const NUIT_BLOQUEES = new Set([
  'plant', 'water', 'water-all', 'harvest', 'harvest-all', 'feed-hen', 'feed-all', 'shear', 'start-recipe',
  'sell-item', 'buy-item', 'buy-animal', 'buy-meuble', 'plant-tree', 'plant-all', 'hoe-many', 'commerce-choose',
  'commerce-upgrade', 'commerce-quota-dec', 'commerce-quota-inc', 'commerce-quota-max', 'harvest-tree', 'ville-go',
  'ville-market', 'ville-buy', 'buy-pasture', 'mill-start', 'mill-cancel', 'repair-house', 'buy-starter',
  'buy-orchard-slot', 'buy-tech', 'build-serre', 'build-poulailler', 'build-fridge', 'build-verger', 'build-silo',
  'build-paturage', 'build-station', 'upgrade', 'upgrade-silo', 'upgrade-serre', 'upgrade-poulailler', 'buy-hoe', 'buy-tool', 'axe-toggle', 'pick-toggle',
  'hoe', 'hoe-toggle', 'hoe-take', 'upgrade-tank', 'upgrade-fridge', 'maintain', 'repair', 'eat', 'fridge-in',
  'fridge-in-all', 'fridge-out', 'toggle', 'semis-set',
]);

// Plusieurs actions, une même fonction (elle reçoit le nom de l'action en 3e argument).
export function sameHandler(names, fn) {
  return Object.fromEntries(names.map((name) => [name, fn]));
}
