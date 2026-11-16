/* ==========================================================================
   La charrette du village (le chantier « l'île à bâtir », fiche I2b ; docs/ile.md, D17). Les réglages :
   data/village.json (CHARRETTE). La scène : js/carte/ferme/charrette-village.js ; la fenêtre : l'onglet « La charrette du
   village » du port (js/ui/port.js) ; les dessins : scripts/carte/charrette_village.py.

   Une seule charrette, au village, pas au joueur (celle du joueur, I2, portage.js, reste à part). Elle naît au premier
   villageois mis à la tournée du port (taches.js attribuer : naitreCharrette), aux paliers 1 des deux branches.

   state.charrette = {
     capacite (1 à 5 : le palier de la capacité, CHARRETTE.CAPACITES), vitesse (1 à 5 : celui de la vitesse, VITESSES),
     cheval (null, ou { arrive (le jour du passage du bac qui l'amène), nourri (il a mangé sa ration la nuit d'avant) }),
     wagonnet (le palier du wagonnet acheté), jour, faits (les voyages vendus ce jour-là), vendu ({ objet: n }), gain,
     volumes (ce que les voyages du jour ont porté) }.

   Les charretiers (D17) : les villageois de la tournée (TACHES.LISTE.navette) qui travaillent aujourd'hui (ni au repos,
   ni à l'accueil, ni au chantier : taches.js travailleAujourdhui), par ordre d'id. Un seul mène la charrette à la fois ;
   le voyage k est à celui de rang k modulo leur nombre : au retour, elle passe au suivant.

   Tout se déduit de l'heure (comme la journée des villageois, I9d) : la route (trajetCharrette : du coffre, ou du quai de
   chargement, au comptoir), les voyages du jour (voyagesDuJour : leurs heures de départ, d'arrivée, de vente, de retour),
   où est la charrette (ouEstLaCharrette). La vente d'un voyage se fait à l'heure de son arrivée (taches.js
   avancerCharrette, à chaque pas de la ferme ; la nuit fait ce qui reste) : chaque joueur d'un monde la voit au même
   endroit sans aucun message, et le monde seul fait compter la vente.

   La route : le plus court de la case de départ au devant du comptoir (huit voisins), au pas de la vitesse sur les
   chemins possédés, sur la ferme et dans les abords du port (ABORDS cases autour du comptoir), à HORS_CHEMIN % ailleurs
   (un chemin coupé : à travers champs). Elle ne lit que la partie (ni le sol du monde, ni l'heure de la page) : le monde
   et chaque joueur trouvent la même. Le wagonnet (son palier, la voie complète) va au pas de son palier sur les rails.

   La voie (voieDe) : des rails voisins (quatre voisins) de la gare (une case de rails contre le quai de chargement, à
   défaut contre le bord de la ferme) au bord de l'emprise du port. Ce qui manque : le moins de cases à poser pour
   l'achever (des rails déjà posés n'y comptent pas), et la première d'entre elles (« ici »).
   ========================================================================== */

import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { fail, NO_COINS, pay } from './devices.js';
import { farmTerrain } from './terrain.js';
import { comptoirDuPort } from './port.js';
import { cadrePort, cheminsDehors, horsFerme, railsPoses } from './dehors.js';
import { quaiDeChargement } from './production.js';
import { etatEcurie } from './blocs.js';
import { chevalPossede } from './cheval.js';
import { passageSuivant } from './bac.js';
import { villageoisDe } from './villageois.js';
import { postesDe, travailleAujourdhui } from './taches.js';
import { lieuxDuVillage } from './villageois-journee.js';

const CH = () => DATA.CHARRETTE || {};
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));
const borne = (n, a, b) => Math.max(a, Math.min(b, n));
export const BRANCHES = ['capacite', 'vitesse'];

/* ---------- la charrette ---------- */

// La charrette du village, ou null (pas encore de tournée).
export function charretteDu(state) {
  if (!objet(state && state.charrette)) return null;
  return state.charrette;
}

// Une charrette neuve (aux paliers 1).
export function nouvelleCharrette() {
  return { capacite: 1, vitesse: 1, cheval: null, wagonnet: false };
}

// La charrette réparée (une sauvegarde) : des paliers dans leurs bornes, un cheval lisible.
export function reparerCharrette(c) {
  if (!objet(c)) return null;
  const n = (CH().CAPACITES || [0]).length, m = (CH().VITESSES || [0]).length;
  const out = { capacite: borne(Number.isInteger(c.capacite) ? c.capacite : 1, 1, n), vitesse: borne(Number.isInteger(c.vitesse) ? c.vitesse : 1, 1, m), cheval: null, wagonnet: c.wagonnet === true };
  if (objet(c.cheval) && Number.isInteger(c.cheval.arrive)) out.cheval = { arrive: c.cheval.arrive, nourri: c.cheval.nourri !== false };
  if (Number.isInteger(c.jour) && c.jour > 0) {
    out.jour = c.jour;
    out.faits = Number.isInteger(c.faits) && c.faits >= 0 ? c.faits : 0;
    out.vendu = objet(c.vendu) ? Object.fromEntries(Object.entries(c.vendu).filter(([k, v]) => DATA.OBJETS[k] && Number.isInteger(v) && v > 0)) : {};
    out.gain = Number.isFinite(c.gain) ? Math.max(0, Math.round(c.gain)) : 0;
    out.volumes = Number.isInteger(c.volumes) && c.volumes >= 0 ? c.volumes : 0;
  }
  return out;
}

// La charrette naît (le premier villageois mis à la tournée du port). → la charrette.
export function naitreCharrette(state) {
  if (!charretteDu(state)) state.charrette = nouvelleCharrette();
  return state.charrette;
}

// Sa capacité (en volumes par voyage).
export function capaciteCharrette(state) {
  const c = charretteDu(state), L = CH().CAPACITES || [20];
  return c ? L[c.capacite - 1] : L[0];
}

// Le cheval du village est-il arrivé (le bac de son passage est venu) ?
export function chevalDuVillage(state) {
  const c = charretteDu(state);
  if (!c || !c.cheval) return null;
  const passe = state.port && Number.isInteger(state.port.passe) ? state.port.passe : 0;
  return { arrive: passe >= c.cheval.arrive, jour: c.cheval.arrive, nourri: c.cheval.nourri !== false };
}

// Le palier de vitesse qui roule vraiment : celui acheté, sauf que sans le cheval arrivé la charrette va au pas d'avant
// (CHEVAL.SANS_CHEVAL), et sans la voie complète le wagonnet ne roule pas (le palier d'avant, sur le chemin).
export function palierRoulant(state) {
  const c = charretteDu(state);
  if (!c) return 1;
  let p = c.vitesse;
  const C = CH().CHEVAL || {}, wagon = CH().WAGONNET || 5;
  if (p >= (C.PALIER || 3) && !(chevalDuVillage(state) || {}).arrive) p = Math.min(p, C.SANS_CHEVAL || 2);
  if (p >= wagon && !voieDe(state).complete) p = Math.min(p, wagon - 1);
  return p;
}

// Ce qu'on voit : 'bras' (tirée à bras), 'cheval' (attelée), 'wagonnet' (sur la voie).
export function modeCharrette(state, p = palierRoulant(state)) {
  const C = CH().CHEVAL || {};
  return p >= (CH().WAGONNET || 5) ? 'wagonnet' : p >= (C.PALIER || 3) ? 'cheval' : 'bras';
}

// Sa vitesse (en fois la marche sur le chemin).
export function vitesseCharrette(state, p = palierRoulant(state)) {
  const V = CH().VITESSES || [1];
  return V[borne(p, 1, V.length) - 1];
}

/* ---------- les paliers ---------- */

const PRIX = (b) => (b === 'capacite' ? CH().PRIX_CAPACITE : CH().PRIX_VITESSE) || [];
const NOMS = (b) => (b === 'capacite' ? CH().NOMS_CAPACITE : CH().NOMS_VITESSE) || [];
const VALEURS = (b) => (b === 'capacite' ? CH().CAPACITES : CH().VITESSES) || [];

// Le prochain palier de la branche `b` : { branche, palier, prix, valeur, nom }, ou null (au plus haut).
export function prochainPalier(state, b) {
  const c = charretteDu(state);
  if (!c || !BRANCHES.includes(b)) return null;
  const p = c[b] + 1, L = VALEURS(b);
  if (p > L.length) return null;
  return { branche: b, palier: p, prix: PRIX(b)[p - 1] || 0, valeur: L[p - 1], nom: NOMS(b)[p - 1] || '' };
}

// Ce qui manque pour acheter le prochain palier de la branche `b` : null, ou la raison. Les deux branches sont libres
// (aucun palier de l'une n'en demande un de l'autre) ; le cheval demande une place à l'Écurie, le wagonnet la voie.
export function refusPalier(state, b) {
  if (!BRANCHES.includes(b)) return 'Branche inconnue.';
  if (!charretteDu(state)) return 'Le village n\'a pas encore de charrette : mets un villageois à la tournée du port.';
  const nx = prochainPalier(state, b);
  if (!nx) return b === 'capacite' ? 'La charrette porte déjà tout ce qu\'elle peut.' : 'La charrette va déjà aussi vite qu\'elle peut.';
  if (b === 'vitesse' && nx.palier === ((CH().CHEVAL || {}).PALIER || 3)) {
    const e = etatEcurie(state);
    if (!e.ok) return 'Le cheval de trait loge à l\'Écurie : construis-la d\'abord (une enceinte de murs avec une porte sur le dehors, son râtelier).';
    const places = Math.min((DATA.CHEVAL && DATA.CHEVAL.PLACES) || 2, e.places);
    if ((chevalPossede(state) ? 1 : 0) + 1 > places) return 'Il n\'y a plus de place à l\'Écurie pour le cheval de trait : agrandis-la.';
  }
  if (b === 'vitesse' && nx.palier === (CH().WAGONNET || 5)) {
    const v = voieDe(state);
    if (!v.complete) return v.manque > 0 ? `Le wagonnet roule sur une voie complète, du quai au port : il manque ${v.manque} case${v.manque > 1 ? 's' : ''} de rails.` : 'Le wagonnet roule sur une voie complète, du quai au port : pose des rails (l\'Atelier).';
  }
  if (state.pieces + EPS < nx.prix) return NO_COINS;
  return null;
}

// Le joueur (le propriétaire de l'île, en ligne) achète le prochain palier de la branche `b` (« capacite » ou
// « vitesse »), payé en pièces (« Charrette du village : … » aux Comptes). Le palier du cheval : il arrive par le bac,
// au passage suivant. → { ok, branche, palier, prix, nom, cheval? (le jour de son passage) } ou le refus.
export function acheterPalier(state, b) {
  const refus = refusPalier(state, b);
  if (refus) return fail(refus);
  const c = charretteDu(state), nx = prochainPalier(state, b);
  if (nx.prix > 0 && !pay(state, nx.prix, `Charrette du village : ${nx.nom}`)) return fail(NO_COINS);
  c[b] = nx.palier;
  const out = { ok: true, branche: b, palier: nx.palier, prix: nx.prix, nom: nx.nom };
  if (b === 'vitesse' && nx.palier === ((CH().CHEVAL || {}).PALIER || 3) && !c.cheval) {
    c.cheval = { arrive: passageSuivant(state), nourri: true };
    out.cheval = c.cheval.arrive;
  }
  if (b === 'vitesse' && nx.palier >= (CH().WAGONNET || 5)) c.wagonnet = true;
  return out;
}

/* ---------- la route ---------- */

const distC = (W, a, b) => Math.max(Math.abs((a % W) - (b % W)), Math.abs(Math.floor(a / W) - Math.floor(b / W)));

// La case d'où part la charrette (et où elle se range) : devant le quai de chargement s'il est posé, sinon devant le
// coffre (le premier poste de la tournée du port, taches.js) ; null sans port.
export function departCharrette(state) {
  const p = postesDe(state, 'navette');
  if (!p.length) return null;
  // (le coffre est dans l'abri de la famille : la charrette attend dehors, sous sa porte)
  let t = p[0].case;
  if (p[0].dedans) {
    const L = lieuxDuVillage(state), abri = new Set(L.abri || []), W = L.W;
    for (let k = 0; k < 12 && abri.has(t); k++) t += W;
    if (L.libre && !L.libre(t)) t += W;
  }
  return t;
}

const routes = new WeakMap();   // la partie → { cle, refs, route }

// La route de la charrette au palier `p` (celui qui roule, par défaut) : { cases ([départ … devant du comptoir]),
// heures (Float64Array : l'heure, depuis le départ, où elle atteint chaque case), aller (h), longueur (cases),
// horsChemin (cases hors chemin), rails (cases sur les rails, au wagonnet), quai (elle part du quai) }, ou null (pas de
// port, pas de poste). Gardée tant que les chemins, les rails, le quai, le port et le palier ne changent pas.
export function trajetCharrette(state, p = palierRoulant(state)) {
  const dep = departCharrette(state), c = comptoirDuPort(state);
  if (dep === null || !c) return null;
  const d = state.dehors || {}, quai = quaiDeChargement(state);
  const cle = `${dep}:${c.devant}:${quai}:${p}:${modeCharrette(state, p)}`;
  const m = routes.get(state);
  if (m && m.cle === cle && m.chemins === d.chemins && m.rails === d.rails && m.sols === state.sols) return m.route;
  const route = calculerRoute(state, dep, c.devant, p);
  if (route) route.quai = quai !== null;
  routes.set(state, { cle, chemins: d.chemins, rails: d.rails, sols: state.sols, route });
  return route;
}

// Le plus court chemin (Dijkstra, huit voisins) de `dep` à `arr`, chaque pas payé au temps qu'il prend.
function calculerRoute(state, dep, arr, p) {
  const T = farmTerrain(state), W = T.LARGEUR, H = T.HAUTEUR, F = T.FERME;
  const C = CH(), M = Math.max(1, Number(C.MARCHE) || 217.5), hors = Math.max(1, Number(C.HORS_CHEMIN) || 50) / 100, ab = Math.max(0, Number(C.ABORDS) || 0);
  const chemins = cheminsDehors(state), rails = railsPoses(state), sols = state.sols || {};
  const wagon = modeCharrette(state, p) === 'wagonnet';
  const V = vitesseCharrette(state, wagon ? (C.WAGONNET || 5) - 1 : p), VW = vitesseCharrette(state, p);
  // (la boîte : la ferme, le départ, le comptoir, les chemins et les rails, une marge autour)
  let x0 = Math.min(dep % W, arr % W, F.X), x1 = Math.max(dep % W, arr % W, F.X + F.LARGEUR - 1);
  let y0 = Math.min(Math.floor(dep / W), Math.floor(arr / W), F.Y), y1 = Math.max(Math.floor(dep / W), Math.floor(arr / W), F.Y + F.HAUTEUR - 1);
  for (const S of [chemins, rails]) for (const t of S) { const x = t % W, y = Math.floor(t / W); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const MG = 6;
  x0 = Math.max(0, x0 - MG); y0 = Math.max(0, y0 - MG); x1 = Math.min(W - 1, x1 + MG); y1 = Math.min(H - 1, y1 + MG);
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, N = bw * bh;
  const ix = (t) => (Math.floor(t / W) - y0) * bw + (t % W) - x0;
  const tx = (i) => (Math.floor(i / bw) + y0) * W + (i % bw) + x0;
  // (le temps d'une case de long, en heures, selon ce qu'elle est)
  const vit = (t) => {
    if (wagon && rails.has(t)) return VW;
    if (!horsFerme(T, t) || chemins.has(t) || sols[t] === 'chemin' || distC(W, t, arr) <= ab) return V;
    return V * hors;
  };
  const dist = new Float64Array(N).fill(Infinity), de = new Int32Array(N).fill(-1), vu = new Uint8Array(N);
  const tasC = [], tasI = [];
  const pousse = (c, i) => {
    tasC.push(c); tasI.push(i);
    let k = tasC.length - 1;
    while (k > 0) {
      const q = (k - 1) >> 1;
      if (tasC[q] <= tasC[k]) break;
      [tasC[q], tasC[k]] = [tasC[k], tasC[q]]; [tasI[q], tasI[k]] = [tasI[k], tasI[q]]; k = q;
    }
  };
  const tire = () => {
    const i = tasI[0], c = tasC[0], bc = tasC.pop(), bi = tasI.pop();
    if (tasC.length) {
      tasC[0] = bc; tasI[0] = bi;
      let k = 0;
      for (;;) {
        const a = 2 * k + 1, b = a + 1;
        let mm = k;
        if (a < tasC.length && tasC[a] < tasC[mm]) mm = a;
        if (b < tasC.length && tasC[b] < tasC[mm]) mm = b;
        if (mm === k) break;
        [tasC[mm], tasC[k]] = [tasC[k], tasC[mm]]; [tasI[mm], tasI[k]] = [tasI[k], tasI[mm]]; k = mm;
      }
    }
    return [i, c];
  };
  const i0 = ix(dep), i1 = ix(arr);
  dist[i0] = 0;
  pousse(0, i0);
  const D2 = Math.SQRT2;
  while (tasC.length) {
    const [i, c] = tire();
    if (vu[i]) continue;
    vu[i] = 1;
    if (i === i1) break;
    const x = i % bw, y = Math.floor(i / bw);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue;
      const j = ny * bw + nx;
      if (vu[j]) continue;
      const t = tx(j), l = dx && dy ? D2 : 1;
      const v = c + l / (M * vit(t));
      if (v < dist[j] - 1e-12) { dist[j] = v; de[j] = i; pousse(v, j); }
    }
  }
  if (!Number.isFinite(dist[i1])) return null;
  const chemin = [];
  for (let k = i1; k >= 0; k = de[k]) chemin.push(k);
  chemin.reverse();
  const cases = chemin.map(tx), heures = new Float64Array(cases.length);
  let longueur = 0, horsC = 0, surRails = 0;
  for (let k = 1; k < cases.length; k++) {
    const a = cases[k - 1], b = cases[k], l = (a % W !== b % W) && Math.floor(a / W) !== Math.floor(b / W) ? D2 : 1;
    longueur += l;
    const v = vit(b);
    if (wagon && rails.has(b)) surRails++;
    else if (v < V - 1e-9) horsC++;
    heures[k] = heures[k - 1] + l / (M * v);
  }
  return { cases, heures, aller: heures[heures.length - 1], longueur: Math.round(longueur), horsChemin: horsC, rails: surRails };
}

/* ---------- la voie ---------- */

const voies = new WeakMap();   // la partie → { rails, quai, cadre, voie }

// La voie du wagonnet : { complete, gare (une case de rails de la gare, ou null), longueur (les rails de la voie, de la
// gare au port), manque (les cases de rails qui manquent pour l'achever, ou null : on ne sait pas encore, les plans du
// port ne sont pas là), ici (la première case où en poser), trace (incomplète : les cases d'une voie qui l'achèverait,
// de la gare au port, rails déjà posés compris ; elle ne regarde pas le sol : une case peut refuser les rails) }.
export function voieDe(state) {
  const d = state.dehors || {}, quai = quaiDeChargement(state), T = farmTerrain(state), k = cadrePort(T);
  const m = voies.get(state);
  if (m && m.rails === d.rails && m.quai === quai && m.k === JSON.stringify(k || null)) return m.voie;
  const voie = calculerVoie(state, T, quai, k);
  voies.set(state, { rails: d.rails, quai, k: JSON.stringify(k || null), voie });
  return voie;
}

function calculerVoie(state, T, quai, k) {
  const W = T.LARGEUR, H = T.HAUTEUR, F = T.FERME, R = railsPoses(state);
  if (!k) return { complete: false, gare: null, longueur: 0, manque: null, ici: null };
  const dansPort = (t) => { const x = t % W, y = Math.floor(t / W); return x >= k.x0 && x <= k.x1 && y >= k.y0 && y <= k.y1; };
  const voisins = (t) => { const x = t % W, l = [t - W, t + W]; if (x > 0) l.push(t - 1); if (x < W - 1) l.push(t + 1); return l.filter((q) => q >= 0 && q < W * H); };
  const auPort = (t) => !dansPort(t) && voisins(t).some(dansPort);
  // (la gare : les cases contre le quai, ou celles du bord de la ferme, dedans et dehors)
  const auBord = (t) => { const de = !horsFerme(T, t); return voisins(t).some((q) => !horsFerme(T, q) !== de); };
  let departs;
  if (quai !== null) {
    const q = new Set([quai, quai + 1]);
    departs = [...new Set([...q].flatMap(voisins))].filter((t) => !q.has(t));
  } else departs = null;
  const estGare = (t) => (departs ? departs.includes(t) : auBord(t));
  // 1. les rails reliés à la gare (quatre voisins) : atteignent-ils le bord du port ?
  const gares = [...R].filter(estGare).sort((a, b) => a - b);
  const vus = new Map(), file = [];
  for (const g of gares) { vus.set(g, -1); file.push(g); }
  let bout = null;
  for (let i = 0; i < file.length && bout === null; i++) {
    const t = file[i];
    if (auPort(t)) { bout = t; break; }
    for (const q of voisins(t)) if (R.has(q) && !vus.has(q)) { vus.set(q, t); file.push(q); }
  }
  if (bout !== null) {
    let n = 0, g = bout;
    for (let t = bout; t !== -1; t = vus.get(t)) { n++; g = t; }
    return { complete: true, gare: g, longueur: n, manque: 0, ici: null };
  }
  // 2. ce qui manque : le moins de cases sans rails d'une case de la gare au bord du port (0-1 : les rails ne coûtent
  // rien), dans la boîte de la ferme, du port et des rails
  const pr = [Math.floor(F.X), F.Y, F.X + F.LARGEUR - 1, F.Y + F.HAUTEUR - 1];
  let x0 = Math.min(pr[0], k.x0), y0 = Math.min(pr[1], k.y0), x1 = Math.max(pr[2], k.x1), y1 = Math.max(pr[3], k.y1);
  for (const t of R) { const x = t % W, y = Math.floor(t / W); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  x0 = Math.max(0, x0 - 4); y0 = Math.max(0, y0 - 4); x1 = Math.min(W - 1, x1 + 4); y1 = Math.min(H - 1, y1 + 4);
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, N = bw * bh;
  const ix = (t) => (Math.floor(t / W) - y0) * bw + (t % W) - x0, tx = (i) => (Math.floor(i / bw) + y0) * W + (i % bw) + x0;
  const dist = new Int32Array(N).fill(1 << 30), de = new Int32Array(N).fill(-1);
  // (sans quai : on part de la première rangée hors de la ferme, tout autour d'elle)
  const sources = departs || (() => {
    const l = [];
    for (let x = F.X; x < F.X + F.LARGEUR; x++) l.push((F.Y - 1) * W + x, (F.Y + F.HAUTEUR) * W + x);
    for (let y = F.Y; y < F.Y + F.HAUTEUR; y++) l.push(y * W + F.X - 1, y * W + F.X + F.LARGEUR);
    return l;
  })();
  // (par niveaux : `avant` les cases au coût du niveau, `apres` celles au coût suivant ; une case de rails ne coûte rien)
  let avant = [], apres = [], niveau = 0, fin = null;
  for (const t of sources) {
    const x = t % W, y = Math.floor(t / W);
    if (x < x0 || x > x1 || y < y0 || y > y1 || dansPort(t)) continue;
    const i = ix(t), c = R.has(t) ? 0 : 1;
    if (c < dist[i]) { dist[i] = c; (c ? apres : avant).push(i); }
  }
  const fait = new Uint8Array(N);
  while (avant.length || apres.length) {
    if (!avant.length) { avant = apres; apres = []; niveau++; }
    const i = avant.pop();
    if (fait[i] || dist[i] !== niveau) continue;
    fait[i] = 1;
    const t = tx(i);
    if (auPort(t)) { fin = i; break; }
    for (const q of voisins(t)) {
      const x = q % W, y = Math.floor(q / W);
      if (x < x0 || x > x1 || y < y0 || y > y1 || dansPort(q)) continue;
      const j = ix(q), c = dist[i] + (R.has(q) ? 0 : 1);
      if (c < dist[j]) { dist[j] = c; de[j] = i; (c === niveau ? avant : apres).push(j); }
    }
  }
  if (fin === null) return { complete: false, gare: gares[0] ?? null, longueur: 0, manque: null, ici: null };
  const chemin = [];
  for (let i = fin; i >= 0; i = de[i]) chemin.push(tx(i));
  chemin.reverse();
  const ici = chemin.find((t) => !R.has(t)) ?? null;
  return { complete: false, gare: gares[0] ?? null, longueur: 0, manque: dist[fin], ici, trace: chemin };
}

/* ---------- les voyages du jour ---------- */

// Les charretiers du jour : les villageois de la tournée du port qui travaillent aujourd'hui, par ordre d'id.
export function charretiersDuJour(state) {
  return villageoisDe(state).filter((v) => v.tache === 'navette' && travailleAujourdhui(state, v)).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

const journees = new WeakMap();   // la partie → { cle, route, j }

// Un voyage entier pour un aller de `aller` heures (`quai` : on charge au quai) : charger, aller, vendre, revenir (h).
export function dureeDuVoyage(aller, quai = false) {
  const C = CH();
  return (quai ? Number(C.QUAI) || 0.1 : Number(C.CHARGE) || 0.25) + 2 * aller + (Number(C.VENTE) || 0.25);
}

// Les voyages d'une journée (JOUR) pour un aller de `aller` heures : [{ k, depart, charge, arrivee, vente, retour }] ;
// un voyage ne part que s'il revient avant la fin de la journée (le nombre de voyages est entier).
export function horaireDesVoyages(aller, quai = false) {
  const C = CH(), [a, b] = C.JOUR || [7, 17];
  const charge = quai ? Number(C.QUAI) || 0.1 : Number(C.CHARGE) || 0.25, vente = Number(C.VENTE) || 0.25, duree = dureeDuVoyage(aller, quai);
  const out = [];
  if (!(aller > 0)) return out;
  for (let k = 0, t = a; t + duree <= b + 1e-9 && k < 64; k++, t += duree) {
    out.push({ k, depart: t, charge: t + charge, arrivee: t + charge + aller, vente: t + charge + aller + vente, retour: t + duree });
  }
  return out;
}

// Les voyages du jour : { voyages ([{ k, charretier (son id), depart, charge (fin du chargement), arrivee (au
// comptoir), vente (fin de la vente : la vente se fait à l'arrivée), retour (de retour au départ) }], en heures du
// jour), route (trajetCharrette), mode, capacite, vitesse, duree (un voyage) } ; voyages vide sans charretier, sans
// route, ou si un voyage ne tient pas dans la journée.
export function voyagesDuJour(state) {
  const c = charretteDu(state);
  if (!c) return { voyages: [], route: null, mode: 'bras', capacite: capaciteCharrette(state), vitesse: 1, duree: 0 };
  const route = trajetCharrette(state), gens = charretiersDuJour(state).map((v) => v.id);
  const cle = `${jourDe(state)}:${gens.join(',')}:${c.capacite}:${palierRoulant(state)}`;
  const m = journees.get(state);
  if (m && m.cle === cle && m.route === route) return m.j;
  const voyages = route && gens.length ? horaireDesVoyages(route.aller, route.quai).map((v) => ({ ...v, charretier: gens[v.k % gens.length] })) : [];
  const duree = route ? dureeDuVoyage(route.aller, route.quai) : 0;
  const j = { voyages, route, mode: modeCharrette(state), capacite: capaciteCharrette(state), vitesse: vitesseCharrette(state), duree };
  journees.set(state, { cle, route, j });
  return j;
}

// Le point de la route à `h` heures de son départ : { case, x, y (colonne, rangée, au fil de la route), vers ('cote',
// 'bas', 'haut') et flip (vers la gauche) }.
export function pointSurRoute(route, h, W) {
  const C = route.cases, Hh = route.heures, n = C.length;
  if (h <= 0 || n < 2) return { case: C[0], x: C[0] % W, y: Math.floor(C[0] / W), dx: 0, dy: 0 };
  if (h >= Hh[n - 1]) return { case: C[n - 1], x: C[n - 1] % W, y: Math.floor(C[n - 1] / W), dx: 0, dy: 0 };
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (Hh[mid] <= h) lo = mid; else hi = mid; }
  const u = (h - Hh[lo]) / Math.max(1e-9, Hh[hi] - Hh[lo]);
  const ax = C[lo] % W, ay = Math.floor(C[lo] / W), bx = C[hi] % W, by = Math.floor(C[hi] / W);
  return { case: u < 0.5 ? C[lo] : C[hi], x: ax + (bx - ax) * u, y: ay + (by - ay) * u, dx: bx - ax, dy: by - ay };
}

// Où est la charrette à l'heure `heure` (du jour) : { phase ('rangee', 'charge', 'aller', 'vente', 'retour'), case,
// x, y, dx, dy (son sens), charge (chargée), charretier (l'id de qui la mène, ou null), voyage (son rang) }, ou null
// (pas de charrette, pas de route).
export function ouEstLaCharrette(state, heure) {
  const j = voyagesDuJour(state);
  if (!j.route) return null;
  const W = farmTerrain(state).LARGEUR, r = j.route, dep = r.cases[0];
  const range = { phase: 'rangee', case: dep, x: dep % W, y: Math.floor(dep / W), dx: 0, dy: 0, charge: false, charretier: null, voyage: null };
  const v = j.voyages.find((x) => heure >= x.depart && heure < x.retour);
  if (!v) return range;
  const base = { charretier: v.charretier, voyage: v.k };
  if (heure < v.charge) return { ...range, ...base, phase: 'charge', charge: true };
  if (heure < v.arrivee) return { ...pointSurRoute(r, heure - v.charge, W), ...base, phase: 'aller', charge: true };
  if (heure < v.vente) { const a = r.cases[r.cases.length - 1]; return { case: a, x: a % W, y: Math.floor(a / W), dx: 0, dy: 0, ...base, phase: 'vente', charge: true }; }
  const p = pointSurRoute(r, r.aller - (heure - v.vente), W);
  return { ...p, dx: -p.dx, dy: -p.dy, ...base, phase: 'retour', charge: false };
}

// Ce que la fenêtre, la scène et le joueur automatique en lisent : null sans charrette, sinon { capacite, vitesse
// (paliers achetés), roulant (le palier qui roule), mode, volumes (capacité), fois (vitesse), cheval
// (chevalDuVillage), voie (voieDe), route ({ longueur, aller, horsChemin, rails, quai }), voyages (du jour), duree,
// faits, vendu, gain, prochains ({ capacite, vitesse } : prochainPalier et son refus) }.
export function etatCharrette(state) {
  const c = charretteDu(state);
  if (!c) return null;
  const j = voyagesDuJour(state), r = j.route, aujourdhui = c.jour === jourDe(state);
  const prochains = {};
  for (const b of BRANCHES) { const nx = prochainPalier(state, b); prochains[b] = nx ? { ...nx, refus: refusPalier(state, b) } : null; }
  return {
    capacite: c.capacite, vitesse: c.vitesse, roulant: palierRoulant(state), mode: j.mode, volumes: j.capacite, fois: j.vitesse,
    cheval: chevalDuVillage(state), voie: voieDe(state), wagonnet: !!c.wagonnet,
    route: r ? { longueur: r.longueur, aller: r.aller, horsChemin: r.horsChemin, rails: r.rails, quai: !!r.quai } : null,
    voyages: j.voyages, duree: j.duree, faits: aujourdhui ? c.faits || 0 : 0, vendu: aujourdhui ? { ...(c.vendu || {}) } : {},
    gain: aujourdhui ? c.gain || 0 : 0, porte: aujourdhui ? c.volumes || 0 : 0, prochains,
  };
}

// Le jour de la charrette remis à zéro un autre jour : → la charrette.
export function charretteDuJour(state) {
  const c = charretteDu(state);
  if (!c) return null;
  if (c.jour !== jourDe(state)) { c.jour = jourDe(state); c.faits = 0; c.vendu = {}; c.gain = 0; c.volumes = 0; }
  return c;
}

// La nuit (taches.js tachesNuit, après le cheval du joueur) : le cheval du village arrivé mange sa ration de paille au
// coffre, s'il y en a. → les pailles mangées (0 : rien, ou pas de cheval).
export function rationCheval(state, prendre) {
  const ch = chevalDuVillage(state);
  if (!ch || !ch.arrive) return 0;
  const n = Math.max(0, Math.floor(Number((CH().CHEVAL || {}).RATION) || 0));
  const ok = n > 0 && prendre(n);
  state.charrette.cheval.nourri = !!ok || n === 0;
  return ok ? n : 0;
}
