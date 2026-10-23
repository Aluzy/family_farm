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

// La nuit (de 22 h à 6 h) n'empêche rien : seul le sommeil du personnage (« Dormir » : il est
// dans son lit, la nuit défile en accéléré) arrête ces actions de jeu jusqu'au réveil ; on peut
// toujours regarder (fenêtres, onglets, inventaire). SOMMEIL_PERMISES : les actions de jeu qui
// restent possibles pendant qu'il dort (la famille, qui ne touche pas à la ferme). scripts/check-actions.mjs vérifie que chaque action de jeu du rapport est
// dans l'une des deux listes.
export const SOMMEIL_MESSAGE = '💤 Tu dors : attends le réveil.';
export const SOMMEIL_PERMISES = new Set([
  'sleep', 'member-save', 'member-add', 'member-remove', 'main-character', 'setup-start',
  'pet-add', 'pet-save', 'pet-remove', 'tool-use', 'entreprise-quota', 'meuble-annule', 'meuble-place',
]);
export const SOMMEIL_BLOQUEES = new Set([
  'plant', 'boite-deposer', 'boite-reprendre', 'water', 'water-all', 'harvest', 'harvest-all', 'feed-hen', 'feed-all', 'shear', 'start-recipe',
  'sell-item', 'buy-item', 'buy-animal', 'buy-meuble', 'buy-ruche', 'buy-dehors', 'plant-all', 'hoe-many', 'commerce-choose',
  'commerce-upgrade', 'commerce-quota-dec', 'commerce-quota-inc', 'commerce-quota-max', 'harvest-tree', 'ville-go',
  'ville-market', 'ville-buy', 'buy-pasture', 'mill-start', 'mill-cancel',
  'buy-tech', 'build-fridge',
  'build-station', 'atelier-fabriquer', 'bloc', 'arbre-planter', 'arbre-case', 'arbre-oui', 'build-toggle', 'silo-agrandir', 'build-pick', 'build-tab', 'build-groupe', 'meuble-ok', 'build-level-menu', 'build-level', 'etage-toggle', 'upgrade', 'upgrade-serre', 'upgrade-poulailler', 'buy-hoe', 'buy-tool', 'axe-toggle', 'pick-toggle', 'rod-toggle', 'scythe-toggle',
  'hoe', 'hoe-toggle', 'hoe-take', 'upgrade-tank', 'robot-autonomie', 'upgrade-fridge', 'maintain', 'repair', 'eat', 'fridge-in',
  'fridge-in-all', 'fridge-out', 'toggle', 'semis-set', 'cow-herbs',
]);

// Plusieurs actions, une même fonction (elle reçoit le nom de l'action en 3e argument).
export function sameHandler(names, fn) {
  return Object.fromEntries(names.map((name) => [name, fn]));
}
