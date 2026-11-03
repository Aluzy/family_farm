/* ---------- l'exécuteur local des commandes (js/engine/commandes.js) ----------
   La partie solo joue ses commandes ici, sur l'appareil. Chaque commande reçoit un identifiant unique
   (l'heure et un compteur : l'interface a le droit de lire l'horloge, pas le moteur). Plus tard, un
   exécuteur distant enverra les mêmes commandes au serveur du monde partagé, avec la même forme.

   F0-5 : une commande réussie est sauvegardée tout de suite, sans attendre la sauvegarde de toutes les
   AUTOSAVE_MS (10 s) : un meuble posé puis l'onglet fermé, le meuble est là au retour. Les commandes
   d'un même geste (un tracé de murs, un « Fabriquer et poser » : plusieurs commandes de suite, sans
   rendre la main) ne font qu'une sauvegarde, juste après lui (une micro-tâche). */

import { executerCommande } from '../engine/commandes.js';
import { state } from './store.js';
import { persistState } from './storage.js';

let compteur = 0;
const session = Date.now().toString(36);

// Une sauvegarde est-elle prévue juste après le geste en cours ?
let sauvegardePrevue = false;
function sauvegarderApres() {
  if (sauvegardePrevue) return;
  sauvegardePrevue = true;
  queueMicrotask(() => {
    sauvegardePrevue = false;
    persistState();
  });
}

// Joue la commande `type` (arguments `args`) sur la partie : le résultat du moteur, avec ses `inverses`.
// Réussie, la partie est sauvegardée juste après le geste.
export function executer(type, args) {
  compteur += 1;
  const r = executerCommande(state, { id: `c-${session}-${compteur}`, type, args });
  if (r.ok) sauvegarderApres();
  return r;
}
