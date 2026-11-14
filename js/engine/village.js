/* ==========================================================================
   Le réglage de bascule du chantier « l'île à bâtir » (docs/ile.md, fiche I0a).
   Tout le code du chantier demande villageActif(state) avant de se montrer :
   - DATA.VILLAGE.ACTIF (data/village.json) : false tant que le chantier dure, le
     jeu publié ne change pas ; la fiche I9h le passe à true ;
   - state.essais.village : une partie d'essai (jeu.html?village=1, js/ui/village.js)
     l'allume pour elle seule ; le jeu publié ne le pose jamais. Une partie d'avant
     ouverte avec jeu.html?village=1 le devient, et passe sur l'île (fiche I7f :
     js/engine/migration-ile.js, js/ui/storage.js).
   ========================================================================== */

import { DATA } from './catalog.js';
import { commencerPaliers } from './paliers.js';
import { nouveauxNoms } from './noms.js';
import { nouvelleChronique } from './chronique.js';

// Le dehors d'une partie neuve du chantier (fiche I2, js/engine/dehors.js) : le tronçon du port est à convertir en
// chemins du joueur (le Web Worker du sol le fait, ou dehors.js assurerTroncon dans Node).
export function nouveauDehors() {
  return { troncon: 'a_poser', chemins: [] };
}

// La ferme de la partie est-elle une terre vierge (fiche I7b) ? Le chantier allumé, une partie commencée par le nouveau
// départ (depart-ile.js commencerNouveauDepart pose state.dehors.ferme : 'vierge' ; une partie d'essai d'avant garde le
// chemin peint de sa ferme).
export function fermeVierge(state) {
  return villageActif(state) && !!(state && state.dehors && state.dehors.ferme === 'vierge');
}

// Le port d'une partie neuve du chantier (fiche I1c, js/engine/bac.js : state.port) : son niveau de départ, le dernier
// bac d'avant le jour `jour` compté pour passé (une partie ne rattrape pas les bacs d'avant elle).
export function nouveauPort(jour = 1) {
  const per = Math.max(1, Math.floor(Number(DATA.PORT && DATA.PORT.BAC && DATA.PORT.BAC.PERIODE) || 1));
  const passe = Math.floor((Math.max(1, jour) - 1) / per) * per;
  return { niveau: DATA.PORT.NIVEAU_DEPART, passe, parti: passe, commandes: [], honorees: 0, imports: [], vendu: {}, chantier: {}, sauvages: [], avis: [] };
}

// Le chantier est-il allumé pour cette partie ?
export function villageActif(state) {
  if (DATA.VILLAGE && DATA.VILLAGE.ACTIF === true) return true;
  return !!(state && state.essais && state.essais.village === true);
}

// L'essai : la partie (neuve) devient une partie d'essai du chantier ; elle suit les paliers de l'île
// (paliers.js, fiche I7a : state.palier).
export function allumerEssaiVillage(state) {
  state.essais = { ...(state.essais || {}), village: true };
  if (!state.dehors) state.dehors = nouveauDehors();
  if (!state.port) state.port = nouveauPort(state.day);
  // (fiche I7g : les noms de l'île, js/engine/noms.js, et sa chronique, js/engine/chronique.js)
  if (!state.noms) state.noms = nouveauxNoms(state);
  if (!state.chronique) state.chronique = nouvelleChronique();
  return commencerPaliers(state);
}

// La partie l'est-elle par l'essai (et non par le réglage) ? (le bandeau de l'essai)
export function essaiVillage(state) {
  return !(DATA.VILLAGE && DATA.VILLAGE.ACTIF === true) && villageActif(state);
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

// Les prénoms qu'une personne tirée de la partie peut porter (HABITANTS.PRENOMS[genre]) : sur l'île, sans les noms du
// récit (SANS_RECIT.NOMS : Odile, Achille, Théo… ne sont ni villageois, ni enfants, ni le joueur « seul », ni habitants
// d'un hameau). Éteint, la liste telle quelle (le jeu d'avant ne bouge pas).
export function prenomsDuJeu(state, genre) {
  const P = (DATA.HABITANTS && DATA.HABITANTS.PRENOMS) || {};
  const L = Array.isArray(P[genre]) ? P[genre] : Array.isArray(P.m) ? P.m : [];
  if (!villageActif(state)) return L;
  const noms = new Set((SR().NOMS || []).map((n) => String(n).toLowerCase()));
  const reste = L.filter((p) => !noms.has(String(p).toLowerCase()));
  return reste.length ? reste : L;
}

// L'élément `id` d'un niveau, tel que l'écran du niveau le montre (NIVEAUX.ELEMENTS) ; sur l'île, celui de
// SANS_RECIT.NIVEAUX.ELEMENTS s'il y est (null : l'élément n'est pas montré) et le port à la place de la calèche
// (PORT.ELEMENT, fiche I1b).
export function elementDuNiveau(state, id) {
  const E = (DATA.NIVEAUX && DATA.NIVEAUX.ELEMENTS) || {};
  if (!villageActif(state)) return E[id] || null;
  if (id === 'marche' && DATA.PORT && DATA.PORT.ELEMENT) return DATA.PORT.ELEMENT;
  const I = (SR().NIVEAUX && SR().NIVEAUX.ELEMENTS) || {};
  return Object.prototype.hasOwnProperty.call(I, id) ? I[id] : E[id] || null;
}

// La note de l'écran du niveau `niveau` (la sienne, `note`) ; sur l'île, celle de SANS_RECIT.NIVEAUX.NOTES s'il y en
// a une (une chaîne vide : pas de note).
export function noteDuNiveau(state, niveau, note) {
  if (!villageActif(state)) return note || null;
  const N = (SR().NIVEAUX && SR().NIVEAUX.NOTES) || {};
  return Object.prototype.hasOwnProperty.call(N, String(niveau)) ? N[String(niveau)] || null : note || null;
}
