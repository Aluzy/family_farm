import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { hache } from './ferme-generee.js';
import { farmTerrain } from './terrain.js';

/* ---------- les styles d'aménagement (data/styles.json, STYLES) ----------

   Chaque bloc, sol ou meuble décoratif a un style (champêtre, forestier, côtier, fleuri ; une machine n'en a
   pas). Aucun n'est plus « beau » qu'un autre : ce sont des goûts.
     - les habitants ont chacun leur style préféré (stylePrefere) : invités à un repas, ils regardent le coin
       de la table (decorAutour, RAYON cases) ; leur style y est (ADMIRE sortes de blocs au moins) : ils l'admirent
       (js/engine/invitations.js) ;
     - la famille : la ferme aménagée élève sa cible de bonheur (styleBonheur, js/engine/bonheur.js), par la
       variété (VARIETE styles d'au moins PIECES sortes de blocs) ou par un style complet (COMPLET sortes d'un
       style). On compte les sortes différentes, pas les blocs : vingt murs de pierre font une seule pièce.
   Ce module ne lit que la partie (state.blocs, state.sols, state.blocsDessus ; pour le style de la ferme,
   l'étage aussi : state.etage, state.dessusEtage, state.solsEtage, state.solsHauts) : il ne dépend d'aucun autre
   module de la ferme (bonheur.js l'importe). */

export const STYLES = DATA.STYLES;

// bloc → style (fait une fois)
let parBloc = null;
function table() {
  if (!parBloc) {
    parBloc = new Map();
    for (const [id, st] of Object.entries((STYLES && STYLES.LISTE) || {})) for (const b of st.blocs || []) parBloc.set(b, id);
  }
  return parBloc;
}

// Le style du bloc `sorte`, ou null.
export function styleDe(sorte) {
  return table().get(sorte) || null;
}
// Le style `id` : { id, nom, icone, adj } ou null.
export function styleInfo(id) {
  const st = id && STYLES && STYLES.LISTE[id];
  return st ? { id, nom: st.nom, icone: st.icone, adj: st.adj || st.nom } : null;
}

const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
// Ce qui est posé : [[case, sorte]] (les blocs, ce qui est posé dessus : les tableaux ; les sols) ; `etage` :
// et ce qui est posé à l'étage (ses blocs, ses tableaux, ses sols), qui compte dans le style de la ferme.
function poses(state, etage = false) {
  const out = [];
  const sources = [state.blocs, state.blocsDessus, state.sols];
  if (etage) {
    sources.push(state.etage, state.dessusEtage, state.solsEtage);
    if (objet(state.solsHauts)) for (const o of Object.values(state.solsHauts)) sources.push(o);
  }
  for (const o of sources) if (objet(o)) for (const [k, s] of Object.entries(o)) out.push([Number(k), s]);
  return out;
}

// Ce qui compte, c'est la diversité des pièces d'un style, pas leur nombre : vingt murs de pierre font une
// seule pièce (une maison de pierre n'est pas encore un style complet). → { style: nombre de sortes }.
function sortesParStyle(liste) {
  const vus = {};
  for (const sorte of liste) {
    const st = styleDe(sorte);
    if (st) (vus[st] = vus[st] || new Set()).add(sorte);
  }
  return Object.fromEntries(Object.entries(vus).map(([st, S]) => [st, S.size]));
}

// Les styles des blocs posés à RAYON cases au plus de `tile` (un carré) : { style: nombre de sortes }.
export function decorAutour(state, tile, rayon = STYLES.RAYON) {
  const W = farmTerrain(state).LARGEUR, c0 = tile % W, r0 = Math.floor(tile / W);
  return sortesParStyle(poses(state).filter(([k]) => Math.abs((k % W) - c0) <= rayon && Math.abs(Math.floor(k / W) - r0) <= rayon).map(([, s]) => s));
}

// Les styles de toute la ferme : { style: nombre de sortes }.
export function decorFerme(state) {
  return sortesParStyle(poses(state, true).map(([, s]) => s));
}

// Ce que l'aménagement de la ferme ajoute à la cible de bonheur de la famille : MAISON.BONUS par la variété
// (VARIETE styles d'au moins PIECES sortes chacun) ou par un style complet (COMPLET sortes d'un même style) ;
// sinon 0. → { bonus, varies (les styles assez présents), complet (le style complet, ou null) }.
export function styleMaison(state) {
  const M = STYLES.MAISON, D = decorFerme(state);
  const varies = Object.keys(D).filter((s) => D[s] >= M.PIECES);
  const complet = Object.keys(D).find((s) => D[s] >= M.COMPLET) || null;
  return { bonus: varies.length >= M.VARIETE || complet ? M.BONUS : 0, varies, complet, decor: D };
}
export function styleBonheur(state) {
  return styleMaison(state).bonus;
}

// Le style préféré d'une personne : celui de son personnage écrit (ECRITS[cle]), sinon tiré de son id parmi
// ceux du style de son hameau (BIOMES ; un hameau sans style connu : tous).
export function stylePrefere(cle, membreId, styleHameau) {
  if (STYLES.ECRITS[cle]) return STYLES.ECRITS[cle];
  const L = STYLES.BIOMES[styleHameau] || Object.keys(STYLES.LISTE);
  const rnd = mulberry32(hache(`style:${membreId}`));
  return L[Math.floor(rnd() * L.length)];
}

// Ce qu'elle dit en admirant un coin de son style (sa phrase n, tournée parmi ADMIRE_PAROLES).
export function phraseAdmire(style, n = 0) {
  const L = STYLES.ADMIRE_PAROLES, info = styleInfo(style);
  return info ? L[((n % L.length) + L.length) % L.length].replace('{adj}', info.adj) : '';
}

// Les tables et les sièges (js/carte/ferme/invites.js placesTable fait de même pour la carte).
const TABLES = new Set(['table_jardin', 'table_rondins', 'meuble_table']);
const SIEGES = new Set(['chaise_jardin', 'banc_jardin', 'meuble_chaise', 'banc_rondins', 'chaise_peinte', 'banc_pierre']);

// La table d'un repas avec des invités : une table de jardin qui a au moins un siège qui la touche (la
// terrasse) d'abord, sinon celle qui en a le plus. → { case (sa case d'ancrage), terrasse } ou null.
export function tableDuRepas(state) {
  const W = farmTerrain(state).LARGEUR, B = objet(state.blocs) ? state.blocs : {};
  const D = DATA.ATELIER.BLOCS;
  // (les cases de chaque bloc : un meuble large en couvre plusieurs, vers la droite et le haut)
  const sur = new Map();
  for (const [k, sorte] of Object.entries(B)) {
    const t = Number(k), d = D[sorte] || {};
    const sens = objet(state.sens) ? Number(state.sens[k]) || 0 : 0;
    const l = d.tourne === true && sens % 2 ? d.hauteur || 1 : d.largeur || 1, h = d.tourne === true && sens % 2 ? d.largeur || 1 : d.hauteur || 1;
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < l; dx++) sur.set(t - dy * W + dx, { case: t, sorte });
  }
  let mieux = null;
  for (const [k, sorte] of Object.entries(B)) {
    if (!TABLES.has(sorte)) continue;
    const t = Number(k), cases = [...sur.entries()].filter(([, v]) => v.case === t).map(([j]) => j);
    const sieges = new Set();
    for (const c of cases) for (const j of [c - W, c + W, c - 1, c + 1]) { const v = sur.get(j); if (v && SIEGES.has(v.sorte)) sieges.add(v.case); }
    const cand = { case: t, terrasse: sorte !== 'meuble_table', sieges: sieges.size };
    const score = (x) => (x.terrasse && x.sieges ? 100 : 0) + x.sieges;
    if (!mieux || score(cand) > score(mieux)) mieux = cand;
  }
  return mieux ? { case: mieux.case, terrasse: mieux.terrasse } : null;
}

// Le coin du repas plaît-il à quelqu'un dont le style préféré est `style` ? (ADMIRE sortes de son style au
// moins, autour de la table ; sans table, autour de la porte du foyer : `repli`.)
export function admireLeCoin(state, style, repli = null) {
  const T = tableDuRepas(state), ici = T ? T.case : repli;
  if (!Number.isInteger(ici)) return false;
  return (decorAutour(state, ici)[style] || 0) >= STYLES.ADMIRE;
}
