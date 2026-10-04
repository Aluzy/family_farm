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

// Plusieurs actions, une même fonction (elle reçoit le nom de l'action en 3e argument).
export function sameHandler(names, fn) {
  return Object.fromEntries(names.map((name) => [name, fn]));
}
