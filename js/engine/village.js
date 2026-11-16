/* ==========================================================================
   L'île à bâtir (docs/ile.md) : ce qu'une partie neuve reçoit de l'île (le dehors, le port) et les textes
   qui ne disent plus le jeu d'avant (VILLAGE.SANS_RECIT). Le réglage de bascule (VILLAGE.ACTIF, I0a) et la
   partie d'essai (jeu.html?village=1) sont retirés depuis la bascule (fiche I9h) : toute partie est une île.
   ========================================================================== */

import { DATA } from './catalog.js';

// Le dehors d'une partie neuve (fiche I2, js/engine/dehors.js) : le tronçon du port est à convertir en
// chemins du joueur (le Web Worker du sol le fait, ou dehors.js assurerTroncon dans Node).
export function nouveauDehors() {
  return { troncon: 'a_poser', chemins: [] };
}

// La ferme de la partie est-elle une terre vierge (fiche I7b) ? Une partie commencée par le nouveau départ
// (depart-ile.js commencerNouveauDepart pose state.dehors.ferme : 'vierge' ; une partie d'avant passée sur l'île garde le
// chemin peint de sa ferme).
export function fermeVierge(state) {
  return !!(state && state.dehors && state.dehors.ferme === 'vierge');
}

// Le port d'une partie neuve (fiche I1c, js/engine/bac.js : state.port) : son niveau de départ, le dernier
// bac d'avant le jour `jour` compté pour passé (une partie ne rattrape pas les bacs d'avant elle).
export function nouveauPort(jour = 1) {
  const per = Math.max(1, Math.floor(Number(DATA.PORT && DATA.PORT.BAC && DATA.PORT.BAC.PERIODE) || 1));
  const passe = Math.floor((Math.max(1, jour) - 1) / per) * per;
  return { niveau: DATA.PORT.NIVEAU_DEPART, passe, parti: passe, commandes: [], honorees: 0, imports: [], vendu: {}, chantier: {}, sauvages: [], avis: [] };
}

/* ---------- le récit retiré de ce que voit le joueur (fiche I7d, VILLAGE.SANS_RECIT) ---------- */

const SR = () => (DATA.VILLAGE && DATA.VILLAGE.SANS_RECIT) || {};

// Le premier nom du récit (SANS_RECIT.NOMS) ou mot qu'il ne dit plus (SANS_RECIT.MOTS) que contient `texte`, ou null.
// Un nom se lit sans son article (« Le Gué » : « Gué », aussi dans « du Gué » ; « Les Mouettes » : « Mouettes »), en
// mot entier et avec sa majuscule (le gué d'une rivière, les mouettes du ciel ne sont pas le récit) ; un mot, sans
// majuscule et au pluriel aussi (« hameaux »). Le contrôle des textes de l'île (tests/engine/village-textes.test.mjs)
// et les noms proposés (noms.js) le lisent.
let MOTIFS = null;
export function texteDuRecit(texte) {
  if (!MOTIFS) {
    const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const noms = (SR().NOMS || []).map((n) => [n, new RegExp(`(?<!\\p{L})${esc(String(n).replace(/^(Le |La |Les |L')/, ''))}(?!\\p{L})`, 'u')]);
    const mots = (SR().MOTS || []).map((m) => [m, new RegExp(`(?<!\\p{L})${esc(String(m))}`, 'iu')]);
    MOTIFS = [...noms, ...mots];
  }
  const t = String(texte == null ? '' : texte);
  for (const [n, re] of MOTIFS) if (re.test(t)) return n;
  return null;
}

// Les prénoms qu'une personne tirée de la partie peut porter (HABITANTS.PRENOMS[genre]), sans les noms du récit d'avant
// (SANS_RECIT.NOMS : Odile, Achille, Théo… ne sont ni villageois, ni enfants, ni le joueur « seul »).
export function prenomsDuJeu(state, genre) {
  const P = (DATA.HABITANTS && DATA.HABITANTS.PRENOMS) || {};
  const L = Array.isArray(P[genre]) ? P[genre] : Array.isArray(P.m) ? P.m : [];
  const noms = new Set((SR().NOMS || []).map((n) => String(n).toLowerCase()));
  const reste = L.filter((p) => !noms.has(String(p).toLowerCase()));
  return reste.length ? reste : L;
}

// L'élément `id` d'un niveau, tel que l'écran du niveau le montre (NIVEAUX.ELEMENTS) : celui de
// SANS_RECIT.NIVEAUX.ELEMENTS s'il y est (null : l'élément n'est pas montré) et le port à la place de la calèche
// (PORT.ELEMENT, fiche I1b).
export function elementDuNiveau(state, id) {
  const E = (DATA.NIVEAUX && DATA.NIVEAUX.ELEMENTS) || {};
  if (id === 'marche' && DATA.PORT && DATA.PORT.ELEMENT) return DATA.PORT.ELEMENT;
  const I = (SR().NIVEAUX && SR().NIVEAUX.ELEMENTS) || {};
  return Object.prototype.hasOwnProperty.call(I, id) ? I[id] : E[id] || null;
}

// La note de l'écran du niveau `niveau` (la sienne, `note`) : celle de SANS_RECIT.NIVEAUX.NOTES s'il y en
// a une (une chaîne vide : pas de note).
export function noteDuNiveau(state, niveau, note) {
  const N = (SR().NIVEAUX && SR().NIVEAUX.NOTES) || {};
  return Object.prototype.hasOwnProperty.call(N, String(niveau)) ? N[String(niveau)] || null : note || null;
}
