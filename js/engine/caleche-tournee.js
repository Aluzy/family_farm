import { DATA } from './catalog.js';

/* ---------- la tournée de la calèche (fiche 7c) : son tour et sa position ----------

   La part de la calèche qui ne dépend que du plan du monde et de l'heure (aucun état de partie) :
   le Web Worker du sol la calcule avec les éléments (js/monde-worker.js), le moteur et la scène en
   lisent la position. Le reste (le commerce, les arrêts aux hameaux, la sauvegarde) : caleche.js. */

const CALECHE = DATA.CALECHE;
const EPS = 1e-9;

// La tournée du plan : `W` (la largeur du monde), `chemins` (les chemins du plan : [[cases…]…]),
// `hameaux` ([{ id, nom, case }] : leur place), `sortie` (la case au bout de la sortie de la ferme),
// `ferme` ({ X, Y, LARGEUR, HAUTEUR }). → { x, y (Float32Array : les points, en tuiles, le milieu d'une
// case à +0,5), d (Float64Array : la distance depuis la ferme, en tuiles), L (la longueur du tour), v
// (tuiles par heure), D (la durée du tour, h), arrets: [{ id, nom, sorte: 'ferme' | 'hameau', k (son
// point), d, arrivee, depart (h, depuis l'arrivée à la ferme) }], gite (le rang de son arrêt), matin (h :
// le départ du gîte, depuis l'arrivée à la ferme : négatif), soir (l'arrivée au gîte) }.
export function tourneeDuPlan({ W, chemins, hameaux, sortie, ferme }) {
  const C = CALECHE;
  const fx = ferme.X + ferme.LARGEUR / 2, fy = ferme.Y + ferme.HAUTEUR / 2;
  const angle = (i) => Math.atan2(Math.floor(i / W) - fy, (i % W) - fx);
  // les nœuds de la boucle, comme monde-gen.js les relie : dans l'ordre de leur angle, la ferme en tête
  const noeuds = (hameaux || []).map((h) => ({ id: h.id, nom: h.nom, sorte: 'hameau', case: h.case }))
    .concat([{ id: 'ferme', nom: 'la ferme', sorte: 'ferme', case: sortie }])
    .sort((a, b) => angle(a.case) - angle(b.case));
  const f = noeuds.findIndex((n) => n.sorte === 'ferme');
  const ordre = noeuds.slice(f).concat(noeuds.slice(0, f));
  // un bout de chemin de a à b : celui du plan (dans un sens ou dans l'autre), sinon tout droit
  const bout = (a, b) => {
    for (const c of chemins || []) {
      if (c[0] === a && c[c.length - 1] === b) return c;
      if (c[0] === b && c[c.length - 1] === a) return c.slice().reverse();
    }
    const out = [], ax = a % W, ay = Math.floor(a / W), bx = b % W, by = Math.floor(b / W);
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
    for (let k = 0; k <= n; k++) out.push(Math.round(ay + ((by - ay) * k) / n) * W + Math.round(ax + ((bx - ax) * k) / n));
    return out;
  };
  const cases = [], ks = [];
  if (ordre.length < 2) {
    cases.push(sortie, sortie);
    ks.push(0);
  } else {
    for (let n = 0; n < ordre.length; n++) {
      const c = bout(ordre[n].case, ordre[(n + 1) % ordre.length].case);
      ks.push(cases.length ? cases.length - 1 : 0);
      for (let j = cases.length ? 1 : 0; j < c.length; j++) cases.push(c[j]);
    }
  }
  // le fil lissé (une moyenne glissante sur sept cases, comme le chemin dessiné : monde-sol.js), le tour
  // fermé (le dernier point est le premier)
  const N = cases.length, x = new Float32Array(N), y = new Float32Array(N), d = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    let sx = 0, sy = 0;
    for (let j = -3; j <= 3; j++) {
      const q = cases[(((k + j) % (N - 1)) + (N - 1)) % (N - 1)];
      sx += q % W; sy += Math.floor(q / W);
    }
    x[k] = sx / 7 + 0.5; y[k] = sy / 7 + 0.5;
  }
  x[N - 1] = x[0]; y[N - 1] = y[0];
  for (let k = 1; k < N; k++) d[k] = d[k - 1] + Math.hypot(x[k] - x[k - 1], y[k] - y[k - 1]);
  const L = d[N - 1];
  // l'horaire : la vitesse qui fait tenir le tour (sans l'arrêt du gîte) en JOURNEE heures
  const nH = ordre.length - 1;
  const route = Math.max(1, C.JOURNEE + C.ARRET - C.ARRET_FERME - nH * C.ARRET);
  const v = Math.max(C.VITESSE, L / route);
  const arrets = [];
  let t = 0;
  for (let n = 0; n < ordre.length; n++) {
    const o = ordre[n], dk = d[ks[n]];
    if (n > 0) t += (dk - arrets[n - 1].d) / v;
    const dure = o.sorte === 'ferme' ? C.ARRET_FERME : C.ARRET;
    arrets.push({ id: o.id, nom: o.nom, sorte: o.sorte, k: ks[n], d: dk, arrivee: t, depart: t + dure });
    t += dure;
  }
  const D = nH ? t + (L - arrets[arrets.length - 1].d) / v : 24;
  // le gîte : le hameau d'où elle part le plus près de DEPART h pour être à la ferme à FERME h
  let gite = 0, ecart = Infinity;
  for (let n = 1; n < arrets.length; n++) {
    const e = Math.abs(C.FERME + arrets[n].depart - D - C.DEPART);
    if (e < ecart) { ecart = e; gite = n; }
  }
  const matin = nH ? arrets[gite].depart - D : 0, soir = nH ? arrets[gite].arrivee : C.ARRET_FERME;
  return { W, x, y, d, L, v, D, arrets, gite, matin, soir };
}

// Les heures de retenue du jour de `H` passées à `H` (les haltes commencées ce jour-là).
function retenueA(haltes, H) {
  const j0 = Math.floor(H / 24) * 24;
  let r = 0;
  for (const h of haltes || []) if (h.debut >= j0 && h.debut < H) r += Math.max(0, Math.min(H, h.fin) - h.debut);
  return r;
}

// L'heure de la tournée à l'heure absolue H (depuis l'arrivée à la ferme du jour, retenues ôtées).
export function heureTournee(haltes, H) {
  return H - Math.floor(H / 24) * 24 - CALECHE.FERME - retenueA(haltes, H);
}

// Le point à la distance `dist` du tour : { x, y, dx, dy } (dx, dy : le sens de la marche).
function pointA(tour, dist) {
  const p = position(tour, dist);
  // le sens : d'un point à l'autre, SENS tuiles avant et après (le tour est fermé : à la ferme, d'où elle
  // vient et où elle va), pour ne pas tourner à chaque marche d'escalier du fil
  const av = position(tour, dist - SENS), ap = position(tour, dist + SENS);
  return { x: p.x, y: p.y, dx: ap.x - av.x, dy: ap.y - av.y };
}
const SENS = 2.5;

// Le point du tour à la distance `dist` (le tour est fermé : modulo sa longueur).
function position(tour, dist) {
  const d = tour.d, n = d.length;
  const s = ((dist % tour.L) + tour.L) % tour.L;
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (d[m] <= s) lo = m; else hi = m; }
  const l = d[hi] - d[lo] || 1, u = (s - d[lo]) / l;
  return { x: tour.x[lo] + (tour.x[hi] - tour.x[lo]) * u, y: tour.y[lo] + (tour.y[hi] - tour.y[lo]) * u };
}

// La vue (de face, de dos, de profil) et le miroir d'un sens de marche (dx, dy).
export function vueDeSens(dx, dy) {
  if (Math.abs(dx) >= Math.abs(dy) * 0.8) return { vue: 'cote', gauche: dx < 0 };
  return { vue: dy > 0 ? 'bas' : 'haut', gauche: false };
}

// Où est la calèche à l'heure absolue H : { x, y (en tuiles), case, vue, gauche, etat ('route', 'arret',
// 'halte' : hélée ou retenue en chemin, 'gite' : elle dort), arret (l'arrêt où elle est, ou null), vers
// (le prochain arrêt), dist (la distance parcourue sur le tour : les roues tournent), t (l'heure de la
// tournée) }. `haltes` : les retenues (state.caleche.haltes).
export function etatCaleche(tour, H, haltes = []) {
  const A = tour.arrets, W = tour.W;
  const t0 = heureTournee(haltes, H);
  const enHalte = (haltes || []).some((h) => h.debut <= H && H < h.fin);
  let t = t0, etat = 'route', arret = null, dist, vers = null;
  if (A.length < 2 || t0 < tour.matin || t0 > tour.soir) {
    // au gîte (ou à la ferme, sans hameau)
    const g = A[tour.gite];
    etat = 'gite'; arret = g; dist = g.d; vers = A[(tour.gite + 1) % A.length];
    t = t0 < tour.matin ? tour.matin : tour.soir;
  } else {
    if (t < 0) t += tour.D;
    // l'arrêt où elle est, ou celui qu'elle vient de quitter
    let n = A.length - 1;
    while (n > 0 && A[n].arrivee > t) n--;
    const o = A[n];
    if (t <= o.depart) { etat = 'arret'; arret = o; dist = o.d; vers = A[(n + 1) % A.length]; }
    else {
      dist = o.d + (t - o.depart) * tour.v;
      const fin = n + 1 < A.length ? A[n + 1].d : tour.L;
      if (dist > fin) dist = fin;
      vers = A[(n + 1) % A.length];
      if (enHalte) etat = 'halte';
    }
  }
  const p = pointA(tour, dist), s = vueDeSens(p.dx, p.dy);
  return { x: p.x, y: p.y, case: Math.floor(p.y) * W + Math.floor(p.x), vue: s.vue, gauche: s.gauche, etat, arret, vers, dist, t };
}

