// synchro.js — E-2 : la partie d'un monde en ligne, tenue à jour chez le joueur (sans DOM ni réseau :
// tests/test-synchro.mjs).
//
// Deux parties :
//   - `confirmee` : celle du monde, à la révision `rev` (le serveur : worker/src/monde.mjs) : l'instantané
//     reçu, puis chaque événement { rev, cmd } joué dans l'ordre ;
//   - `locale` : celle qu'on voit et où l'on joue (le `state` du jeu) : la confirmée, plus les commandes du
//     joueur envoyées mais pas encore revenues (`enAttente`), jouées par-dessus.
// Un geste du joueur est joué tout de suite sur la locale (jouer) puis envoyé. Quand le monde renvoie
// l'événement d'une de ses commandes, elle passe dans la confirmée ; quand c'est celle d'un autre, ou
// qu'une commande est refusée, la locale est refaite : la confirmée, puis les commandes en attente
// rejouées (celles qui ne passent plus sont oubliées). Le moteur est déterministe (F0-4) : tous les
// joueurs ont la même partie confirmée.

const cloner = (v) => JSON.parse(JSON.stringify(v));

export class Synchro {
  // `executerCommande` : celle du moteur (js/engine/commandes.js) ; `quandRefaite(locale)` : la partie
  // locale a été remplacée (le jeu la reprend : setState, rendu).
  constructor({ partie, rev, executerCommande, quandRefaite = () => {} }) {
    this.executerCommande = executerCommande;
    this.quandRefaite = quandRefaite;
    this.confirmee = cloner(partie);
    this.rev = rev;
    this.enAttente = [];
    this.locale = cloner(partie);
  }

  // Un geste du joueur : joué sur la partie locale ; réussi, il attend l'accord du monde (à envoyer).
  jouer(cmd) {
    const r = this.executerCommande(this.locale, cmd);
    if (r.ok) this.enAttente.push({ id: cmd.id, type: cmd.type, args: cmd.args });
    return r;
  }

  // Un événement du monde (une commande acceptée, d'un joueur ou de soi) : dans la partie confirmée. Un
  // événement déjà connu (rev ≤ la nôtre) est ignoré ; un trou (rev plus loin que la suivante) : false,
  // il faut tout redemander (l'instantané).
  evenement({ rev, cmd }) {
    if (rev <= this.rev) return true;
    if (rev !== this.rev + 1) return false;
    const r = this.executerCommande(this.confirmee, cmd);
    if (!r.ok) return false;   // (ne devrait pas arriver : le monde l'a acceptée ; on redemandera tout)
    this.rev = rev;
    const k = this.enAttente.findIndex((c) => c.id === cmd.id);
    if (k === 0) { this.enAttente.shift(); return true; }   // (la nôtre, la plus ancienne : la locale l'avait déjà)
    if (k > 0) this.enAttente.splice(k, 1);
    this.refaire();
    return true;
  }

  // Une commande refusée par le monde : oubliée, et la partie locale refaite sans elle.
  refusee(id) {
    const k = this.enAttente.findIndex((c) => c.id === id);
    if (k < 0) return;
    this.enAttente.splice(k, 1);
    this.refaire();
  }

  // L'instantané du monde (à l'arrivée, ou après un trou) : la partie confirmée remplacée.
  instantane({ rev, partie }) {
    this.confirmee = cloner(partie);
    this.rev = rev;
    this.refaire();
  }

  // La partie locale : la confirmée, puis les commandes en attente rejouées (celles qui ne passent plus
  // sont oubliées : le monde les refusera de toute façon).
  refaire() {
    const locale = cloner(this.confirmee);
    this.enAttente = this.enAttente.filter((c) => this.executerCommande(locale, c).ok);
    this.locale = locale;
    this.quandRefaite(locale);
  }
}
