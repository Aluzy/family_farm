/* ==========================================================================
   Bâtir hors de la ferme et le chemin du port possédé (le chantier « l'île à bâtir », fiche I2 ; docs/ile.md, D8).
   Les réglages : data/village.json (VILLAGE.DEHORS, VILLAGE.CHEMIN).

   - Le chemin possédé : dans une partie neuve du chantier, le tronçon généré de la sortie de la ferme au port
     (monde-gen.js, lieux.port.chemin) devient des blocs de chemin du joueur. state.dehors = { troncon, chemins } :
       · chemins : les cases de chemin possédées hors de la ferme, sous une forme compacte (encoderSegments : des
         segments [écart depuis la fin du précédent, longueur], à plat, dans l'ordre des cases ; une rangée de
         chemin, un segment) ;
       · troncon : 'a_poser' (une partie neuve : le tronçon n'est pas encore converti ; la page le reçoit du
         Web Worker du sol, js/ui/monde-sol.js, et le pose ici : poserTroncon ; dans Node, assurerTroncon le calcule
         d'après le plan), 'pose' (converti : le sol du monde ne le peint plus de lui-même), 'genere' (une partie
         d'avant : son tronçon généré reste peint tel quel, la fiche I7f le convertira ; les chemins qu'on pose
         dehors s'y ajoutent).
     Le sol du monde peint les chemins possédés (js/engine/monde-sol.js : poserCheminsSol, majCheminsSol) : une case
     possédée sur une rivière est un gué.
   - Bâtir dehors (poseDehorsStatus, que blocs.js poseStatus demande pour une case hors de la ferme, le chantier
     allumé) : les blocs de VILLAGE.DEHORS seulement ; ni dans l'eau (le pont de planches sur une rivière, lui
     seul), ni sur une falaise, ni sur le pied d'un arbre ou d'un rocher, ni dans l'emprise du port ou d'un hameau,
     ni sur une région que la page n'a pas encore. Les autres blocs (le pont, une lanterne, un banc…) vont dans
     state.blocs et state.sols comme sur la ferme (leurs cases sont celles du monde).
   - Le sol du monde, pour ces questions : celui que la page donne (poserSolDehors : js/ui/monde-sol.js, les régions
     du Web Worker), sinon le calcul direct (monde-sol.js, solDirect : Node, les tests).
   - L'effet du chemin : sur une case de chemin (surChemin : un chemin possédé, un chemin posé sur la ferme, le
     chemin de la ferme), on va VILLAGE.CHEMIN.VITESSE % plus vite (bonusChemin ; la page : js/ui/stage.js).
   ========================================================================== */

import { DATA } from './catalog.js';
import { villageActif } from './village.js';
import { farmSeed, farmTerrain } from './terrain.js';
import { BIOMES } from './monde-gen.js';
import { elementsSol, solDirect, tronconDuPort } from './monde-sol.js';
import { casesOuvertesMonde } from './monde-recolte.js';
import { HAMEAUX } from './monde-hameaux.js';

const VIDE = new Set();

/* ---------- la forme compacte : des segments ---------- */

// Des cases (des entiers) → [écart, longueur, écart, longueur…] : chaque suite de cases qui se suivent est un
// segment, son écart compté depuis la fin du segment d'avant (le premier, depuis 0).
export function encoderSegments(cases) {
  const t = [...new Set(cases)].filter((c) => Number.isInteger(c) && c >= 0).sort((a, b) => a - b), out = [];
  let fin = 0;
  for (let i = 0; i < t.length;) {
    let n = 1;
    while (i + n < t.length && t[i + n] === t[i] + n) n++;
    out.push(t[i] - fin, n);
    fin = t[i] + n;
    i += n;
  }
  return out;
}

// L'inverse : les segments → les cases (un Set). Une forme abîmée s'arrête au premier segment illisible ;
// `max` : la dernière case possible (exclue).
export function decoderSegments(segs, max = Infinity) {
  const out = new Set();
  if (!Array.isArray(segs)) return out;
  let fin = 0;
  for (let k = 0; k + 1 < segs.length; k += 2) {
    const d = segs[k], n = segs[k + 1];
    if (!Number.isInteger(d) || !Number.isInteger(n) || d < 0 || n < 1 || fin + d + n > max) break;
    for (let c = fin + d; c < fin + d + n; c++) out.add(c);
    fin += d + n;
  }
  return out;
}

/* ---------- les chemins possédés ---------- */

// Le dehors de la partie, ou null (le chantier éteint, ou une partie d'avant qui n'a encore rien posé dehors).
export function dehorsDe(state) {
  if (!villageActif(state)) return null;
  const d = state && state.dehors;
  return d && typeof d === 'object' && !Array.isArray(d) ? d : null;
}

// Le dehors de la partie, créé s'il manque (une partie d'avant : son tronçon reste généré).
function dehorsCree(state) {
  if (!dehorsDe(state)) state.dehors = { troncon: 'genere', chemins: [] };
  return state.dehors;
}

// Où en est le tronçon du port : 'a_poser', 'pose', 'genere' (une partie d'avant, ou rien posé), ou null (éteint).
export function etatTroncon(state) {
  if (!villageActif(state)) return null;
  const d = dehorsDe(state);
  return d && ['a_poser', 'pose', 'genere'].includes(d.troncon) ? d.troncon : 'genere';
}

const sets = new WeakMap();   // les segments d'une partie → leurs cases (un Set, à ne pas changer)

// Les cases de chemin possédées hors de la ferme : un Set (à lire seulement).
export function cheminsDehors(state) {
  const d = dehorsDe(state);
  if (!d || !Array.isArray(d.chemins)) return VIDE;
  let s = sets.get(d.chemins);
  if (!s) { s = decoderSegments(d.chemins); sets.set(d.chemins, s); }
  return s;
}

// La case `t` est-elle un chemin possédé hors de la ferme ?
export function cheminDehorsSur(state, t) {
  return cheminsDehors(state).has(t);
}

// Les cases possédées deviennent `set` (un Set neuf) : les segments refaits.
function garderChemins(state, set) {
  const d = dehorsCree(state);
  d.chemins = encoderSegments(set);
  sets.set(d.chemins, set);
}

// Ajoute ou retire la case `t` des chemins possédés.
export function poserCheminDehors(state, t) {
  const s = new Set(cheminsDehors(state));
  s.add(t);
  garderChemins(state, s);
}
export function retirerCheminDehors(state, t) {
  const s = new Set(cheminsDehors(state));
  if (!s.delete(t)) return false;
  garderChemins(state, s);
  return true;
}

// Le tronçon converti (ses cases : monde-sol.js, tronconDuPort, tiré dans le Web Worker ou ici) devient les
// chemins du joueur, s'il était à poser. → vrai si la partie a changé.
export function poserTroncon(state, cases) {
  if (etatTroncon(state) !== 'a_poser' || !Array.isArray(cases)) return false;
  const s = new Set(cheminsDehors(state));
  for (const c of cases) if (Number.isInteger(c) && c >= 0) s.add(c);
  garderChemins(state, s);
  state.dehors.troncon = 'pose';
  return true;
}

// Dans Node (les tests, le joueur automatique) : le tronçon converti d'après le plan, s'il est à poser.
export function assurerTroncon(state) {
  if (etatTroncon(state) !== 'a_poser') return false;
  const sol = solDirect(farmTerrain(state));
  return !!sol && poserTroncon(state, tronconDuPort(sol.ctx));
}

// Ce que le sol du monde doit savoir des chemins de la partie (js/ui/monde-sol.js, monde-sol.js poserCheminsSol) :
// { troncon, cases }, ou null (le chantier éteint, ou une partie d'avant qui n'a rien posé dehors : le sol d'avant).
export function cheminsPourLeSol(state) {
  const e = etatTroncon(state);
  if (!e || (e === 'genere' && !cheminsDehors(state).size)) return null;
  return { troncon: e, cases: [...cheminsDehors(state)] };
}

/* ---------- le sol du monde, pour bâtir dehors ---------- */

let solPage = null, repli = null;
// La page donne le sol du monde de la partie (js/ui/monde-sol.js : region(rx, ry), hameaux()) ; null : le calcul direct.
// I9b : `o.repli` (une fonction : vrai en ligne) : une région, ou les plans, que la page n'a pas encore se tirent ici, en
// direct (solDirect), plutôt que d'être refusés : un bloc posé dehors par un autre joueur, loin de soi, se rejoue chez
// chacun comme le monde l'a joué (sinon la partie confirmée divergerait, et tout serait redemandé). En solo, comme avant.
export function poserSolDehors(sol, o = {}) {
  solPage = sol || null;
  repli = typeof o.repli === 'function' ? o.repli : null;
}
const enRepli = () => !!(repli && repli());

function solDe(T) {
  return solPage || solDirect(T);
}

// La région (rx, ry) du sol (celui de la page, ou le calcul direct), ou null si elle n'est pas encore faite.
function regionDe(T, rx, ry) {
  const reg = solDe(T) ? solDe(T).region(rx, ry) : null;
  if (reg || !solPage || !enRepli()) return reg;
  const d = solDirect(T);
  return d ? d.region(rx, ry) : null;
}

// La région de la case t (son biome, si l'on y marche), ou null si elle n'est pas encore faite.
function infoCase(T, t) {
  if (!solDe(T) || !T.MONDE) return null;
  const W = T.LARGEUR, N = T.MONDE.taille, c = t % W, r = Math.floor(t / W);
  const reg = regionDe(T, Math.floor(c / N), Math.floor(r / N));
  if (!reg) return null;
  const k = (r - reg.cy0) * reg.cl + c - reg.cx0;
  return { biome: BIOMES[reg.biome[k]], marche: reg.marche[k] === 1 };
}

// Les plans des hameaux et du port (monde-hameaux.js : leur cadre), ou null tant qu'ils ne sont pas là.
function plansDe(T) {
  if (solPage) {
    const p = solPage.hameaux ? solPage.hameaux() : null;
    if (p || !enRepli()) return p;
  }
  const s = solDirect(T);
  if (!s) return null;
  elementsSol(s.ctx);
  return s.ctx.hameaux.plans;
}

// La case t est-elle dans l'emprise du port (son cadre et HAMEAUX.RESERVE cases autour) ou d'un hameau (son
// cadre) ? → 'port', 'hameau' ou null ; undefined tant que les plans ne sont pas là.
export function empriseDe(T, t) {
  const plans = plansDe(T);
  if (!plans) return undefined;
  const W = T.LARGEUR, c = t % W, r = Math.floor(t / W), R = (HAMEAUX && HAMEAUX.RESERVE) || 2;
  for (const p of plans) {
    const m = p.batisse === 'port' ? R : 0, k = p.cadre;
    if (c >= k.x0 - m && c <= k.x1 + m && r >= k.y0 - m && r <= k.y1 + m) return p.batisse === 'port' ? 'port' : 'hameau';
  }
  return null;
}

// La case t est-elle hors de la ferme (sur le monde de la partie) ?
export function horsFerme(T, t) {
  const F = T && T.FERME;
  if (!F) return false;
  const W = T.LARGEUR, c = t % W, r = Math.floor(t / W);
  return !(c >= F.X && r >= F.Y && c < F.X + F.LARGEUR && r < F.Y + F.HAUTEUR);
}

// Le bloc `sorte` se pose-t-il hors de la ferme (VILLAGE.DEHORS) ?
export function blocDuDehors(sorte) {
  const L = DATA.VILLAGE && DATA.VILLAGE.DEHORS;
  return Array.isArray(L) && L.includes(sorte);
}

// Peut-on poser `sorte` sur la case `t`, hors de la ferme (le chantier allumé) ? { ok, raison }. Ce qui est en main
// est vu avant (blocs.js, poseStatus).
export function poseDehorsStatus(state, sorte, t) {
  const T = farmTerrain(state), s = DATA.ATELIER.BLOCS[sorte];
  if (!s) return { ok: false, raison: 'Bloc inconnu.' };
  if (!blocDuDehors(sorte)) return { ok: false, raison: `${s.nom} : pas hors de la ferme. Dehors, on pose des chemins, des pas japonais, des lanternes, des réverbères, des ponts, des barrières et des bancs.` };
  const e = empriseDe(T, t);
  if (e === undefined) return { ok: false, raison: 'Cette partie de l\'île n\'est pas encore dessinée : approche-toi.' };
  if (e === 'port') return { ok: false, raison: 'Pas dans les abords du port : ils restent libres.' };
  if (e === 'hameau') return { ok: false, raison: 'Pas dans un hameau.' };
  const ici = infoCase(T, t);
  if (!ici) return { ok: false, raison: 'Cette partie de l\'île n\'est pas encore dessinée : approche-toi.' };
  const b = ici.biome;
  if (b === 'mer' || b === 'lac') return { ok: false, raison: 'Pas dans l\'eau profonde.' };
  if (b === 'falaise' || b === 'sommet') return { ok: false, raison: 'Pas sur une falaise.' };
  const occupe = blocAtDehors(state, t), sol = solDehors(state, t);
  if (s.pont) {
    if (b !== 'riviere') return { ok: false, raison: `${s.nom} : il se pose sur une rivière.` };
    if (occupe || sol) return { ok: false, raison: 'Il y a déjà quelque chose ici.' };
    return { ok: true };
  }
  if (b === 'riviere') return { ok: false, raison: sol === 'chemin' ? 'Il y a déjà un gué ici.' : 'Une rivière : un pont de planches s\'y pose, pas autre chose.' };
  const ouvertes = casesOuvertesMonde(state);
  if (!ici.marche && !(ouvertes && ouvertes.has(t))) return { ok: false, raison: 'Un arbre, un buisson ou un rocher est là : abats-le ou casse-le d\'abord.' };
  if (s.sol) {
    if (sol) return { ok: false, raison: `Il y a déjà ${sol === sorte ? 'ce sol' : `un ${(DATA.ATELIER.BLOCS[sol] || {}).nom ? DATA.ATELIER.BLOCS[sol].nom.toLowerCase() : 'sol'}`} ici.` };
    return { ok: true };
  }
  if (occupe) return { ok: false, raison: 'Il y a déjà un bloc ici.' };
  return { ok: true };
}

// Le bloc et le sol posés dehors (state.blocs, state.sols ; le chemin possédé : « chemin »).
function blocAtDehors(state, t) {
  return (state.blocs && state.blocs[t]) || null;
}
function solDehors(state, t) {
  return (state.sols && state.sols[t]) || (cheminDehorsSur(state, t) ? 'chemin' : null);
}

/* ---------- les ponts ---------- */

// Les cases des ponts de planches posés (on y passe : la page les ajoute aux cases ouvertes à la marche).
export function casesPonts(state) {
  const out = [];
  for (const [k, sorte] of Object.entries((state && state.blocs) || {})) { const s = DATA.ATELIER.BLOCS[sorte]; if (s && s.pont) out.push(Number(k)); }
  return out;
}

/* ---------- l'effet du chemin : on y va plus vite ---------- */

// Combien de fois plus vite sur un chemin (1 + VILLAGE.CHEMIN.VITESSE %), 1 le chantier éteint.
export function bonusChemin(state) {
  if (!villageActif(state)) return 1;
  const C = DATA.VILLAGE && DATA.VILLAGE.CHEMIN;
  return 1 + Math.max(0, (C && C.VITESSE) || 0) / 100;
}

// La case `t` est-elle un chemin (un chemin possédé hors de la ferme, un chemin posé sur la ferme, le chemin de la
// ferme : trois de ses quatre coins au moins en sont, ses SOMMETS) ? Faux le chantier éteint.
export function surChemin(state, t, T = farmTerrain(state)) {
  if (!villageActif(state) || !Number.isInteger(t) || t < 0) return false;
  if (cheminDehorsSur(state, t) || (state.sols && state.sols[t] === 'chemin')) return true;
  if (horsFerme(T, t)) return false;
  const S = T.SOMMETS, W = T.LARGEUR, V = W + 1, c = t % W, r = Math.floor(t / W);
  if (!S) return false;
  const n = (S[r * V + c] === 1) + (S[r * V + c + 1] === 1) + (S[(r + 1) * V + c] === 1) + (S[(r + 1) * V + c + 1] === 1);
  return n >= 3;
}

// La vitesse sur la case `t` (le bonus du chemin, ou 1).
export function vitesseSurCase(state, t) {
  return surChemin(state, t) ? bonusChemin(state) : 1;
}

