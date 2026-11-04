/* ---------- l'exécuteur local des commandes (js/engine/commandes.js) ----------
   La partie solo joue ses commandes ici, sur l'appareil. Chaque commande reçoit un identifiant unique
   (l'heure et un compteur : l'interface a le droit de lire l'horloge, pas le moteur). Plus tard, un
   exécuteur distant enverra les mêmes commandes au serveur du monde partagé, avec la même forme.

   F0-5 : une commande réussie est sauvegardée tout de suite, sans attendre la sauvegarde de toutes les
   AUTOSAVE_MS (10 s) : un meuble posé puis l'onglet fermé, le meuble est là au retour. Les commandes
   d'un même geste (un tracé de murs, un « Fabriquer et poser » : plusieurs commandes de suite, sans
   rendre la main) ne font qu'une sauvegarde, juste après lui (une micro-tâche).

   F0-7 : une commande réussie est aussi vue par le suivi de session (avec le consentement du joueur :
   js/ui/consent.js, telCommande) : les objets posés, les décorations, les meubles tournés. */

import { executerCommande } from '../engine/commandes.js';
import { enLigne, state } from './store.js';
import { defaire as defaireMoteur } from '../engine/index.js';
import { persistState } from './storage.js';
import { telCommande } from './consent.js';
import { mesurer } from './chrono.js';

let compteur = 0;
// (combien de commandes ont été jouées : un cache de l'interface sait ainsi que la partie a pu changer)
export const commandesJouees = () => compteur;
// (l'onglet : ses commandes ont des id uniques, aussi dans un monde en ligne où d'autres joueurs en envoient)
const session = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

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
  // E-2 : en ligne, la commande est jouée sur la partie du monde et envoyée (js/ui/en-ligne.js)
  if (enLigne) return enLigneJouer({ id: `c-${session}-${compteur}`, type, args });
  const r = mesurer('moteur : commande', () => executerCommande(state, { id: `c-${session}-${compteur}`, type, args }));
  if (r.ok) { sauvegarderApres(); telCommande(type, args, r); }
  return r;
}

// Défait une opération (ses commandes inverses, de la dernière à la première), par executer : en ligne,
// chacune passe aussi par le monde. Combien ont réussi.
export function defaireCommandes(inverses) {
  if (!enLigne) return defaireMoteur(state, inverses);
  let n = 0;
  for (const c of [...inverses].reverse()) if (executer(c.type, c.args).ok) n += 1;
  return n;
}

// (posée par en-ligne.js, qui importe ce module : pas d'import circulaire au chargement)
let enLigneJouer = () => ({ ok: false, error: 'Pas en ligne.' });
export function brancherEnLigne(f) {
  enLigneJouer = f;
}

