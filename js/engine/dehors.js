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
import { farmTerrain } from './terrain.js';
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

// Le dehors de la partie, ou null (une partie d'avant qui n'a encore rien posé dehors).
export function dehorsDe(state) {
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

/* ---------- les rails (fiche I2b, la charrette du village) ----------
   Les rails sont une couche à part, sur la ferme comme dehors : state.dehors.rails, des segments (encoderSegments),
   comme les chemins possédés (une voie de 400 cases tient en quelques centaines d'octets). Ils se posent sur l'herbe,
   sur un chemin (le passage planchéié : la case reste un chemin), sur un pont de planches ; ils ne gênent pas la marche.
   Le bloc « rails » de l'Atelier (ATELIER.BLOCS.rails) les pose : blocs.js poseStatus, poser, reprendreBloc. */

const railsSets = new WeakMap();   // les segments → leurs cases (un Set, à ne pas changer)

// Les cases des rails posés : un Set (à lire seulement).
export function railsPoses(state) {
  const d = dehorsDe(state);
  if (!d || !Array.isArray(d.rails)) return VIDE;
  let s = railsSets.get(d.rails);
  if (!s) { s = decoderSegments(d.rails); railsSets.set(d.rails, s); }
  return s;
}

// Des rails sur la case `t` ?
export function railsSur(state, t) {
  return railsPoses(state).has(t);
}

function garderRails(state, set) {
  const d = dehorsCree(state);
  d.rails = encoderSegments(set);
  railsSets.set(d.rails, set);
}

// Pose (ou retire) les rails de la case `t`. → vrai si la partie a changé.
export function poserRails(state, t) {
  if (railsSur(state, t)) return false;
  const s = new Set(railsPoses(state));
  s.add(t);
  garderRails(state, s);
  return true;
}
export function retirerRails(state, t) {
  const s = new Set(railsPoses(state));
  if (!s.delete(t)) return false;
  garderRails(state, s);
  return true;
}

// L'image des rails de la case `t` (scripts/carte/charrette_village.py, assets/rails.png) d'après ses voisins : droit
// ('ns', 'eo'), courbe d'un quart de cercle ('ne', 'no', 'se', 'so' : les deux voisins qu'elle relie), et, posé sur un
// chemin, le passage planchéié ('ns_chemin', 'eo_chemin'). Seul ou au bout d'une voie : droit, dans le sens du voisin.
// Une voie posée en escalier (une case vers l'est, une vers le sud…) se lit comme une voie diagonale : un coin dont le
// voisin d'un côté est lui aussi un coin de l'escalier (ses deux voisins à l'opposé des siens : un Z) prend la diagonale
// de ce côté-là : '<coin>_d' (des deux côtés : la corde, tout droit d'un milieu de côté à l'autre), '<coin>_d<côté>' (de
// ce côté seulement : la demi-courbe, qui rejoint un tronçon droit ou une courbe de l'autre côté). Voir courbeRails.
export const COINS_RAILS = ['ne', 'no', 'se', 'so'];
export const IMAGES_RAILS = ['ns', 'eo', 'ne', 'no', 'se', 'so', 'ns_chemin', 'eo_chemin',
  ...COINS_RAILS.flatMap((c) => [`${c}_d`, `${c}_d${c[0]}`, `${c}_d${c[1]}`])];
export function imageRails(state, t, T = farmTerrain(state)) {
  const forme = formeRails(railsPoses(state), T.LARGEUR, t);
  return (forme === 'ns' || forme === 'eo') && surChemin(state, t, T) ? `${forme}_chemin` : forme;
}

// (les côtés d'une case : le pas vers le voisin, en cases ; l'opposé)
const COTES = { n: [0, -1], s: [0, 1], e: [1, 0], o: [-1, 0] };
const OPPOSE = { n: 's', s: 'n', e: 'o', o: 'e' };
const voisinRails = (R, W, t, c) => {
  const x = t % W;
  if ((c === 'e' && x >= W - 1) || (c === 'o' && x <= 0)) return null;
  const v = t + COTES[c][0] + COTES[c][1] * W;
  return v >= 0 && R.has(v) ? v : null;
};

// Le coin de la case `t` des rails `R` (un Set, W la largeur de la carte) : 'ne', 'no', 'se', 'so' si elle a exactement
// deux voisins de rails, l'un au nord ou au sud, l'autre à l'est ou à l'ouest ; sinon null.
export function coinRails(R, W, t) {
  const n = voisinRails(R, W, t, 'n') !== null, s = voisinRails(R, W, t, 's') !== null;
  const e = voisinRails(R, W, t, 'e') !== null, o = voisinRails(R, W, t, 'o') !== null;
  if (n + s + e + o !== 2 || n === s || e === o) return null;
  return (n ? 'n' : 's') + (e ? 'e' : 'o');
}

// La forme des rails de la case `t` (sans le passage planchéié) : une des IMAGES_RAILS, d'après les voisins et, pour un
// coin, les voisins de ses voisins (la diagonale).
export function formeRails(R, W, t) {
  const coin = coinRails(R, W, t);
  if (coin) {
    const [a, b] = coin;
    // (le côté `x` est en diagonale si son voisin est un coin de l'escalier : ses côtés, l'opposé de x et l'opposé de y)
    const diag = (x, y) => {
      const v = voisinRails(R, W, t, x), k = v === null ? null : coinRails(R, W, v);
      return !!k && k.includes(OPPOSE[x]) && k.includes(OPPOSE[y]);
    };
    const da = diag(a, b), db = diag(b, a);
    return coin + (da && db ? '_d' : da ? `_d${a}` : db ? `_d${b}` : '');
  }
  const n = voisinRails(R, W, t, 'n') !== null, s = voisinRails(R, W, t, 's') !== null;
  const e = voisinRails(R, W, t, 'e') !== null, o = voisinRails(R, W, t, 'o') !== null;
  if ((n || s) && !(e || o)) return 'ns';
  if ((e || o) && !(n || s)) return 'eo';
  return n && s ? 'ns' : e && o ? 'eo' : 'ns';
}

// Le tracé des rails d'une forme : { cotes: [a, b] (du premier côté au second), p: les quatre points d'une courbe de
// Bézier (en cases, depuis le coin nord-ouest de la case) }. Les deux bouts sont au milieu de leur côté ; la tangente y
// est droite (perpendiculaire au côté) ou, du côté d'une diagonale, à 45° (vers l'autre côté). POIGNEES : la longueur
// des poignées (un quart de cercle ; la corde ; la demi-courbe, du côté droit et du côté diagonal) ; les mêmes que
// scripts/carte/charrette_village.py (H_ARC, H_CORDE, H_AXE, H_DIAG), qui dessine d'après elles.
export const POIGNEES = { ARC: 0.2761, CORDE: 0.2357, AXE: 0.32, DIAG: 0.23 };
export function courbeRails(forme) {
  const [base, suf = ''] = String(forme).split('_');
  const a = base[0], b = base[1];
  const mil = (c) => [0.5 + COTES[c][0] / 2, 0.5 + COTES[c][1] / 2];
  const P0 = mil(a), P3 = mil(b);
  if (base === 'ns' || base === 'eo') {
    return { cotes: [a, b], p: [P0, [P0[0] + (P3[0] - P0[0]) / 3, P0[1] + (P3[1] - P0[1]) / 3], [P0[0] + 2 * (P3[0] - P0[0]) / 3, P0[1] + 2 * (P3[1] - P0[1]) / 3], P3] };
  }
  const da = suf === 'd' || suf === `d${a}`, db = suf === 'd' || suf === `d${b}`;
  const ina = [-COTES[a][0], -COTES[a][1]], outb = COTES[b], r = Math.SQRT1_2;
  const dg = [(ina[0] + outb[0]) * r, (ina[1] + outb[1]) * r];
  const t0 = da ? dg : ina, t3 = db ? dg : outb, P = POIGNEES;
  const h0 = da && db ? P.CORDE : !(da || db) ? P.ARC : da ? P.DIAG : P.AXE;
  const h3 = da && db ? P.CORDE : !(da || db) ? P.ARC : db ? P.DIAG : P.AXE;
  return { cotes: [a, b], p: [P0, [P0[0] + h0 * t0[0], P0[1] + h0 * t0[1]], [P3[0] - h3 * t3[0], P3[1] - h3 * t3[1]], P3] };
}

const bezier = (p, u) => {
  const v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
  return [a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]];
};

// Le chemin que suit le wagonnet sur la route `cases` (de case en case, huit voisins : charrette.js trajetCharrette),
// `heures` l'heure où il atteint chaque case : sur les rails, il suit leur tracé (courbeRails), d'un milieu de tracé au
// suivant, par la case de coin qu'un pas en diagonale saute ; ailleurs, d'un milieu de case à l'autre. → { x, y, h }
// (Float64Array : en cases, x vers l'est, y vers le sud, depuis le coin nord-ouest de la carte ; l'heure de chaque
// point, répartie dans chaque pas selon la longueur parcourue), ou null.
export function traceSurRails(R, W, cases, heures, PAS = 6) {
  if (!Array.isArray(cases) || !cases.length) return null;
  const formes = new Map();
  const forme = (t) => { if (!formes.has(t)) formes.set(t, R.has(t) ? formeRails(R, W, t) : null); return formes.get(t); };
  const cote = (t, v) => { const d = v - t; return d === -W ? 'n' : d === W ? 's' : d === 1 ? 'e' : d === -1 ? 'o' : null; };
  const relie = (t, c) => { const f = forme(t); return !!f && courbeRails(f).cotes.includes(c); };
  const lie = (t, v) => { const c = cote(t, v); return !!c && R.has(t) && R.has(v) && relie(t, c) && relie(v, OPPOSE[c]); };
  const coin = (t) => [t % W, Math.floor(t / W)];
  // (des points du tracé de `t`, de son milieu jusqu'à son côté `c` ; versCote = false : du côté `c` jusqu'à son milieu)
  const demi = (t, c, versCote) => {
    const k = courbeRails(forme(t)), [x, y] = coin(t), u1 = k.cotes[0] === c ? 0 : 1, out = [];
    for (let i = 1; i <= PAS; i++) { const f = versCote ? i / PAS : 1 - i / PAS; const q = bezier(k.p, 0.5 + (u1 - 0.5) * f); out.push([x + q[0], y + q[1]]); }
    return out;
  };
  // (tout le tracé de `t`, depuis son côté `de`)
  const entier = (t, de) => {
    const k = courbeRails(forme(t)), [x, y] = coin(t), sens = k.cotes[0] === de, out = [];
    for (let i = 1; i <= 2 * PAS; i++) { const q = bezier(k.p, sens ? i / (2 * PAS) : 1 - i / (2 * PAS)); out.push([x + q[0], y + q[1]]); }
    return out;
  };
  const pos = (t) => {
    const f = forme(t), [x, y] = coin(t);
    if (!f) return [x + 0.5, y + 0.5];
    const q = bezier(courbeRails(f).p, 0.5);
    return [x + q[0], y + q[1]];
  };
  const X = [], Y = [], H = [];
  const p0 = pos(cases[0]);
  X.push(p0[0]); Y.push(p0[1]); H.push(heures ? heures[0] : 0);
  for (let k = 1; k < cases.length; k++) {
    const a = cases[k - 1], b = cases[k];
    let pts = null;
    if (lie(a, b)) pts = [...demi(a, cote(a, b), true), ...demi(b, cote(b, a), false)];
    else {
      const dx = (b % W) - (a % W), dy = Math.floor(b / W) - Math.floor(a / W);
      if (Math.abs(dx) === 1 && Math.abs(dy) === 1) {
        for (const m of [a + dx, a + dy * W]) {
          if (lie(a, m) && lie(m, b)) { pts = [...demi(a, cote(a, m), true), ...entier(m, cote(m, a)), ...demi(b, cote(b, m), false)]; break; }
        }
      }
    }
    if (!pts) pts = [pos(b)];
    // (les heures : de celle de a à celle de b, selon la longueur parcourue)
    const L = [0];
    let px = X[X.length - 1], py = Y[Y.length - 1];
    for (const [x, y] of pts) { L.push(L[L.length - 1] + Math.hypot(x - px, y - py)); px = x; py = y; }
    const h0 = heures ? heures[k - 1] : k - 1, h1 = heures ? heures[k] : k, tot = L[L.length - 1] || 1;
    pts.forEach(([x, y], i) => { X.push(x); Y.push(y); H.push(h0 + (h1 - h0) * (L[i + 1] / tot)); });
  }
  return { x: Float64Array.from(X), y: Float64Array.from(Y), h: Float64Array.from(H) };
}

// Peut-on poser des rails sur la case `t` ? { ok, raison }. Sur la ferme : une case sans bloc qui la ferme (l'herbe, un
// sol, un chemin, un pont), hors d'une pièce close ; dehors : comme les blocs du dehors (ni l'eau profonde, ni la
// falaise, ni l'emprise du port, ni sous un arbre ou un rocher), et sur une rivière, sur un pont de planches seulement.
export function railsStatus(state, t, sur = {}) {
  const T = farmTerrain(state);
  if (railsSur(state, t)) return { ok: false, raison: 'Il y a déjà des rails ici.' };
  const B = DATA.ATELIER.BLOCS, b = state.blocs && state.blocs[t], sb = b && B[b];
  if (sb && !sb.pont) return { ok: false, raison: 'Il y a déjà un bloc ici.' };
  if (!horsFerme(T, t)) {
    if (sur.couverte) return { ok: false, raison: 'Un meuble occupe cette case.' };
    if (sur.piece) return { ok: false, raison: 'Les rails se posent dehors, pas dans une pièce close.' };
    const S = T.SOMMETS, W = T.LARGEUR, V = W + 1, c = t % W, r = Math.floor(t / W);
    if (S && [S[r * V + c], S[r * V + c + 1], S[(r + 1) * V + c], S[(r + 1) * V + c + 1]].every((x) => x === 2)) return { ok: false, raison: 'Pas dans l\'eau.' };
    if (sur.bloque) return { ok: false, raison: sur.bloque };
    return { ok: true };
  }
  const e = empriseDe(T, t);
  if (e === undefined) return { ok: false, raison: 'Cette partie de l\'île n\'est pas encore dessinée : approche-toi.' };
  if (e === 'port') return { ok: false, raison: 'Pas dans les abords du port : ils restent libres.' };
  if (e === 'hameau') return { ok: false, raison: 'Pas dans un hameau.' };
  const ici = infoCase(T, t);
  if (!ici) return { ok: false, raison: 'Cette partie de l\'île n\'est pas encore dessinée : approche-toi.' };
  const bi = ici.biome;
  if (bi === 'mer' || bi === 'lac') return { ok: false, raison: 'Pas dans l\'eau profonde.' };
  if (bi === 'falaise' || bi === 'sommet') return { ok: false, raison: 'Pas sur une falaise.' };
  if (bi === 'riviere') return sb && sb.pont ? { ok: true } : { ok: false, raison: 'Une rivière : pose d\'abord un pont de planches, les rails s\'y posent.' };
  const ouvertes = casesOuvertesMonde(state);
  if (!ici.marche && !(ouvertes && ouvertes.has(t)) && !cheminDehorsSur(state, t)) return { ok: false, raison: 'Un arbre, un buisson ou un rocher est là : abats-le ou casse-le d\'abord.' };
  return { ok: true };
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
// { troncon, cases }, ou null (une partie d'avant qui n'a rien posé dehors : le sol d'avant).
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

// Fiche I2b : l'emprise du port (son cadre et HAMEAUX.RESERVE cases autour) : { x0, y0, x1, y1 } (colonnes et rangées,
// bornes comprises), null sans port, undefined tant que les plans ne sont pas là.
export function cadrePort(T) {
  const plans = plansDe(T);
  if (!plans) return undefined;
  const R = (HAMEAUX && HAMEAUX.RESERVE) || 2, p = plans.find((q) => q.batisse === 'port');
  if (!p) return null;
  const k = p.cadre;
  return { x0: k.x0 - R, y0: k.y0 - R, x1: k.x1 + R, y1: k.y1 + R };
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

// Peut-on poser `sorte` sur la case `t`, hors de la ferme ? { ok, raison }. Ce qui est en main
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

// Combien de fois plus vite sur un chemin (1 + VILLAGE.CHEMIN.VITESSE %).
export function bonusChemin(state) {
  const C = DATA.VILLAGE && DATA.VILLAGE.CHEMIN;
  return 1 + Math.max(0, (C && C.VITESSE) || 0) / 100;
}

// La case `t` est-elle un chemin (un chemin possédé hors de la ferme, un chemin posé sur la ferme, le chemin de la
// ferme : trois de ses quatre coins au moins en sont, ses SOMMETS) ?
export function surChemin(state, t, T = farmTerrain(state)) {
  if (!Number.isInteger(t) || t < 0) return false;
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

