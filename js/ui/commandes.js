/* ---------- l'exécuteur local des commandes (js/engine/commandes.js) ----------
   La partie solo joue ses commandes ici, sur l'appareil. Chaque commande reçoit un identifiant unique
   (l'heure et un compteur : l'interface a le droit de lire l'horloge, pas le moteur). Plus tard, un
   exécuteur distant enverra les mêmes commandes au serveur du monde partagé, avec la même forme. */

import { executerCommande } from '../engine/commandes.js';
import { state } from './store.js';

let compteur = 0;
const session = Date.now().toString(36);

// Joue la commande `type` (arguments `args`) sur la partie : le résultat du moteur, avec ses `inverses`.
export function executer(type, args) {
  compteur += 1;
  return executerCommande(state, { id: `c-${session}-${compteur}`, type, args });
}
