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
//
// I9a2, l'horloge commune d'un monde de l'île (horlogeVivante, js/engine/temps-monde.js ; la note :
// docs/fiches/ile/I9a2-note-horloge.md). Le temps passe par pas de 5 s d'horloge, joués un à un, que le serveur
// déduit de son heure ; ils ne sont pas des événements :
//   - chaque événement porte le pas de sa commande (cmd.pas) : la confirmée avance jusqu'à ce pas, puis joue la
//     commande (avec l'énergie de son acteur) ;
//   - la locale avance d'elle-même, à l'heure du serveur (avancer(t) : t, l'heure du serveur estimée ; `reel`,
//     l'heure réelle du pas où elle est), et la confirmée la suit de MARGE pas en arrière (un événement arrive
//     toujours à un pas que la confirmée n'a pas dépassé : sinon, tout est redemandé) ;
//   - quand la locale est refaite, elle repart de la confirmée : ses commandes en attente rejouées chacune à son
//     pas, puis les pas jusqu'à l'heure ; une commande confirmée au pas où la locale l'avait jouée ne la refait pas.
// `moi` : son compte (ses gestes se jouent avec son énergie ; la locale montre la sienne dans state.energie).

import { avancerJusqua, dureeDuPas, energieDe, horlogeVivante, pasDe } from '../engine/temps-monde.js';

const cloner = (v) => JSON.parse(JSON.stringify(v));
export const MARGE = 2;   // pas : la confirmée suit la locale d'aussi loin

export class Synchro {
  // `executerCommande` : celle du moteur (js/engine/commandes.js) ; `quandRefaite(locale)` : la partie
  // locale a été remplacée (le jeu la reprend : setState, rendu). I9a2 : `moi`, son compte ; `horloge`, celle que
  // le monde a donnée à l'accueil ({ pas, reel }).
  constructor({ partie, rev, executerCommande, quandRefaite = () => {}, moi = null, horloge = null }) {
    this.executerCommande = executerCommande;
    this.quandRefaite = quandRefaite;
    this.moi = moi;
    this.confirmee = cloner(partie);
    this.rev = rev;
    this.enAttente = [];
    this.vivante = horlogeVivante(this.confirmee);
    this.reelConfirmee = horloge && Number.isFinite(horloge.reel) ? horloge.reel : null;
    this.locale = cloner(partie);
    this.reel = this.reelConfirmee;
    this.energieDuMonde = null;
    this.montrer(this.locale);
  }

  // Un geste du joueur : joué sur la partie locale ; réussi, il attend l'accord du monde (à envoyer).
  jouer(cmd) {
    this.cacher(this.locale);
    const r = this.executerCommande(this.locale, cmd, this.acteur(this.moi));
    if (r.ok) this.enAttente.push({ id: cmd.id, type: cmd.type, args: cmd.args, ...(this.vivante ? { pas: pasDe(this.locale) } : {}) });
    this.montrer(this.locale);
    return r;
  }

  // Un événement du monde (une commande acceptée, d'un joueur ou de soi) : dans la partie confirmée. Un
  // événement déjà connu (rev ≤ la nôtre) est ignoré ; un trou (rev plus loin que la suivante) : false,
  // il faut tout redemander (l'instantané). I9a2 : un événement à un pas que la confirmée a déjà dépassé, aussi.
  evenement({ rev, cmd, acteur, reel }) {
    if (rev <= this.rev) return true;
    if (rev !== this.rev + 1) return false;
    if (this.vivante && cmd && Number.isInteger(cmd.pas)) {
      if (cmd.pas < pasDe(this.confirmee)) return false;
      this.avancerConfirmee(cmd.pas);
      if (Number.isFinite(reel)) this.reelConfirmee = reel;
    }
    const r = this.executerCommande(this.confirmee, cmd, this.acteur(acteur));
    if (!r.ok) return false;   // (ne devrait pas arriver : le monde l'a acceptée ; on redemandera tout)
    this.rev = rev;
    const k = this.enAttente.findIndex((c) => c.id === cmd.id);
    // (la nôtre, la plus ancienne, confirmée au pas où la locale l'avait jouée : la locale l'avait déjà)
    if (k === 0 && (!this.vivante || this.enAttente[0].pas === cmd.pas)) { this.enAttente.shift(); return true; }
    if (k >= 0) this.enAttente.splice(k, 1);
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

  // L'instantané du monde (à l'arrivée, ou après un trou) : la partie confirmée remplacée. I9a2 : `horloge`, celle
  // de l'accueil ({ pas, reel } : l'heure réelle du pas de la partie).
  instantane({ rev, partie, horloge = null }) {
    this.confirmee = cloner(partie);
    this.rev = rev;
    this.vivante = horlogeVivante(this.confirmee);
    if (horloge && Number.isFinite(horloge.reel)) this.reelConfirmee = horloge.reel;
    this.refaire();
  }

  // I9a2 : l'horloge du monde à l'accueil (après le rattrapage : la confirmée est au pas du dernier événement) : la
  // confirmée avance jusqu'au pas du monde, dont c'est l'heure réelle.
  ancrer({ pas, reel }) {
    if (!this.vivante || !Number.isInteger(pas)) return;
    if (pas >= pasDe(this.confirmee)) {
      this.avancerConfirmee(pas);
      if (Number.isFinite(reel)) this.reelConfirmee = reel;
    }
    this.refaire();
  }

  // La partie locale : la confirmée, puis les commandes en attente rejouées (celles qui ne passent plus
  // sont oubliées : le monde les refusera de toute façon). I9a2 : chacune à son pas, l'heure suivie.
  refaire() {
    const locale = cloner(this.confirmee);
    let reel = this.reelConfirmee;
    const suivre = (ev, d) => { if (Number.isFinite(reel)) reel += d; };
    this.enAttente = this.enAttente.filter((c) => {
      if (this.vivante && Number.isInteger(c.pas)) avancerJusqua(locale, c.pas, suivre);
      const r = this.executerCommande(locale, c, this.acteur(this.moi));
      if (r.ok && this.vivante) c.pas = pasDe(locale);
      return r.ok;
    });
    this.locale = locale;
    this.reel = reel;
    this.montrer(locale);
    this.quandRefaite(locale);
  }

  /* -- I9a2 : le temps qui passe -- */

  // La locale avance jusqu'à l'heure `t` (celle du serveur, estimée), pas à pas ; la confirmée la suit de MARGE pas
  // en arrière. Rend { pas (joués sur la locale), evts (ce qu'ils ont fait : la nuit, minuit, le réveil, le bac…) }.
  avancer(t) {
    const out = { pas: 0, evts: [] };
    if (!this.vivante || !Number.isFinite(t)) return out;
    if (!Number.isFinite(this.reel)) this.reel = t;
    if (this.reel + dureeDuPas(this.locale) <= t) this.cacher(this.locale);
    while (this.reel + dureeDuPas(this.locale) <= t) {
      const d = dureeDuPas(this.locale);
      avancerJusqua(this.locale, pasDe(this.locale) + 1, (ev) => out.evts.push(ev));
      this.reel += d;
      out.pas += 1;
    }
    if (out.pas) {
      this.avancerConfirmee(pasDe(this.locale) - MARGE);
      this.montrer(this.locale);
    }
    return out;
  }
  // Combien de pas la locale a de retard sur l'heure `t` (une estimation : la durée d'un pas d'à présent).
  retard(t) {
    if (!this.vivante || !Number.isFinite(t) || !Number.isFinite(this.reel)) return 0;
    return Math.max(0, Math.floor((t - this.reel) / dureeDuPas(this.locale)));
  }
  // La part du pas en cours déjà écoulée, de 0 à 1 (l'heure affichée entre deux pas : js/ui/stage.js).
  fraction(t) {
    if (!this.vivante || !Number.isFinite(t) || !Number.isFinite(this.reel)) return 0;
    return Math.max(0, Math.min(1, (t - this.reel) / dureeDuPas(this.locale)));
  }
  avancerConfirmee(pas) {
    let reel = this.reelConfirmee;
    avancerJusqua(this.confirmee, pas, (ev, d) => { if (Number.isFinite(reel)) reel += d; });
    this.reelConfirmee = reel;
  }

  // (l'acteur d'une commande, pour le moteur : son énergie ; le monde lui-même n'en a pas)
  acteur(compte) {
    return this.vivante && compte && compte !== 'monde' ? { acteur: compte } : {};
  }
  // La locale montre l'énergie du joueur dans state.energie (ce que lit la page) ; celle de la partie (à personne, mais
  // le moteur la lit et l'écrit : le rapport du matin la note) est gardée à côté, et remise avant chaque pas ou geste
  // joué sur la locale (cacher) : la locale reste la confirmée, plus ses gestes en attente.
  montrer(locale) {
    if (!this.vivante || !this.moi) return;
    this.energieDuMonde = locale.energie;
    locale.energie = energieDe(locale, this.moi);
  }
  cacher(locale) {
    if (this.vivante && this.moi && this.energieDuMonde !== null) locale.energie = this.energieDuMonde;
  }
}
