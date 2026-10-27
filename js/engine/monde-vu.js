import { DATA } from './catalog.js';
import { MONDE } from './monde.js';
import { farmTerrain, regionsFerme, regionsVues } from './terrain.js';
import { vueNuitPct } from './equipement.js';

/* ---------- s'orienter : ce qui a été vu du grand monde, la boussole (fiche 8) ----------

   Le monde est caché au départ (docs/grand-monde.md, « Découverte ») : un brouillard couvre ce que le
   personnage n'a pas encore vu et se lève autour de lui à mesure qu'il marche (la scène :
   js/carte/ferme/brouillard.js) ; la carte du monde ne montre que ce qui a été vu (js/ui/carte-monde.js) ;
   la boussole mène à la ferme ou au lieu choisi sur la carte (js/carte/ferme/boussole.js).

   Le vu : le monde se découpe en cellules de CELLULE × CELLULE cases (DATA.DECOUVERTE, data/monde.json :
   8 × 8, soit 81 × 64 cellules pour un monde de 644 × 510 cases), vues ou non. La sauvegarde les garde
   dans state.monde.vu : un bit par cellule (la cellule cx, cy est le bit cy × L + cx, L cellules par
   rangée ; le bit k est le bit k % 8 de l'octet k >> 3), en base64 — 864 caractères, quel que soit le
   voyage. La ferme et sa prairie (MARGE_FERME cases autour d'elle) sont vues d'office : leurs bits sont
   posés au départ et relus comme posés quoi qu'il arrive (cellulesFerme).

   Le personnage voit autour de lui (voirAutour, appelé par la page à chaque case où il passe, avec le
   biome de sa case et l'heure) : chaque cellule qui touche le cercle de vue, d'un rayon de RAYONS[biome]
   cases (RAYON pour un biome qui n'y est pas ; NUIT fois moins la nuit, RAYON_MIN au moins). Une cellule
   qui devient vue rend vue sa région (state.monde.vues, terrain.js : ce que le moteur lit pour borner ses
   revues de cases, la nuit, les repousses ; tenu à côté du vu, plus grossier). La prairie vue d'office ne
   rend pas vues ses régions : autour de la ferme, le moteur garde les régions qu'il avait (celles de la
   ferme), comme avant.

   Rien ici ne lit le hasard ni l'horloge : le vu ne dépend que des cases passées, des biomes et de la
   nuit (testé : déterministe). */

export const DECOUVERTE = DATA.DECOUVERTE;

// La grille des cellules du terrain T : { C (cases par côté), L, H (cellules par rangée, par colonne) }.
export function grilleVu(T) {
  const C = DECOUVERTE.CELLULE;
  return { C, L: Math.ceil(T.LARGEUR / C), H: Math.ceil(T.HAUTEUR / C) };
}

/* ---------- base64 (sans btoa ni Buffer : le même dans la page, le Worker et Node) ---------- */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const DE_B64 = new Int16Array(128).fill(-1);
for (let k = 0; k < 64; k++) DE_B64[B64.charCodeAt(k)] = k;

export function versBase64(octets) {
  let s = '';
  for (let i = 0; i < octets.length; i += 3) {
    const a = octets[i], b = i + 1 < octets.length ? octets[i + 1] : 0, c = i + 2 < octets.length ? octets[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < octets.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < octets.length ? B64[n & 63] : '=');
  }
  return s;
}

// Une chaîne base64 → `n` octets (ce qui manque reste à 0 ; un caractère inconnu compte pour 0).
export function deBase64(s, n) {
  const out = new Uint8Array(n), str = typeof s === 'string' ? s : '';
  const v = (i) => { const c = str.charCodeAt(i); return c < 128 && DE_B64[c] >= 0 ? DE_B64[c] : 0; };
  let o = 0;
  for (let i = 0; i < str.length && o < n; i += 4) {
    const q = (v(i) << 18) | (v(i + 1) << 12) | (v(i + 2) << 6) | v(i + 3);
    out[o++] = (q >> 16) & 255;
    if (o < n && i + 2 < str.length && str[i + 2] !== '=') out[o++] = (q >> 8) & 255;
    if (o < n && i + 3 < str.length && str[i + 3] !== '=') out[o++] = q & 255;
  }
  return out;
}

/* ---------- les cellules vues ---------- */

// Les cellules de la ferme et de sa prairie (MARGE_FERME cases autour), vues d'office : [indices].
const fermes = new WeakMap();
export function cellulesFerme(T) {
  if (!T || !T.FERME) return [];
  if (fermes.has(T)) return fermes.get(T);
  const { C, L, H } = grilleVu(T), F = T.FERME, M = DECOUVERTE.MARGE_FERME, out = [];
  const x0 = Math.max(0, Math.floor((F.X - M) / C)), x1 = Math.min(L - 1, Math.floor((F.X + F.LARGEUR + M - 1) / C));
  const y0 = Math.max(0, Math.floor((F.Y - M) / C)), y1 = Math.min(H - 1, Math.floor((F.Y + F.HAUTEUR + M - 1) / C));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push(y * L + x);
  fermes.set(T, out);
  return out;
}

const pose = (bits, i) => { bits[i >> 3] |= 1 << (i & 7); };
const lu = (bits, i) => (bits[i >> 3] >> (i & 7)) & 1;

// (la dernière grille décodée : la chaîne de la sauvegarde ne change qu'avec le vu ; lue à chaque case)
let memo = { s: null, n: 0, T: null, bits: null };
function bitsDe(state, T) {
  const { L, H } = grilleVu(T), n = Math.ceil((L * H) / 8);
  const s = state && state.monde && typeof state.monde.vu === 'string' ? state.monde.vu : '';
  if (memo.s === s && memo.n === n && memo.T === T) return memo.bits;
  const bits = deBase64(s, n);
  for (const i of cellulesFerme(T)) pose(bits, i);
  memo = { s, n, T, bits };
  return bits;
}

// Le vu de la partie : { C, L, H, bits (un Uint8Array : à lire, pas à changer), vu (la chaîne) }, ou
// null (un terrain sans monde : tout est vu).
export function vuDe(state, T = farmTerrain(state)) {
  if (!T || !T.FERME) return null;
  const g = grilleVu(T), bits = bitsDe(state, T);
  return { ...g, bits, vu: versBase64(bits) };
}

// La cellule (cx, cy) est-elle vue ?
export function celluleVue(state, cx, cy, T = farmTerrain(state)) {
  if (!T || !T.FERME) return true;
  const { L, H } = grilleVu(T);
  if (cx < 0 || cy < 0 || cx >= L || cy >= H) return false;
  return lu(bitsDe(state, T), cy * L + cx) === 1;
}

// La case t est-elle vue ?
export function caseVue(state, t, T = farmTerrain(state)) {
  if (!T || !T.FERME) return true;
  if (!Number.isInteger(t) || t < 0 || t >= T.LARGEUR * T.HAUTEUR) return false;
  const C = DECOUVERTE.CELLULE;
  return celluleVue(state, Math.floor((t % T.LARGEUR) / C), Math.floor(Math.floor(t / T.LARGEUR) / C), T);
}

// La part du monde vue (de 0 à 1).
export function partVue(state, T = farmTerrain(state)) {
  if (!T || !T.FERME) return 1;
  const { L, H } = grilleVu(T), bits = bitsDe(state, T);
  let n = 0;
  for (let i = 0; i < L * H; i++) n += lu(bits, i);
  return n / (L * H);
}

// Le rayon de vue (en cases) dans le biome `biome` (son nom), la nuit ou non.
export function rayonVue(biome, nuit = false) {
  const D = DECOUVERTE, r = (D.RAYONS && D.RAYONS[biome]) || D.RAYON;
  return nuit ? Math.max(D.RAYON_MIN, r * D.NUIT) : r;
}

// Les cellules (indices) qui touchent le cercle de rayon R (cases) autour du milieu de la case t.
export function cellulesAutour(T, t, R) {
  const { C, L, H } = grilleVu(T), W = T.LARGEUR, px = (t % W) + 0.5, py = Math.floor(t / W) + 0.5, out = [];
  for (let cy = Math.max(0, Math.floor((py - R) / C)); cy <= Math.min(H - 1, Math.floor((py + R) / C)); cy++) {
    const dy = Math.max(cy * C - py, 0, py - (cy + 1) * C);
    for (let cx = Math.max(0, Math.floor((px - R) / C)); cx <= Math.min(L - 1, Math.floor((px + R) / C)); cx++) {
      const dx = Math.max(cx * C - px, 0, px - (cx + 1) * C);
      if (dx * dx + dy * dy <= R * R) out.push(cy * L + cx);
    }
  }
  return out;
}

// Pose les bits `cellules` dans le vu de la partie ; leurs régions deviennent vues. → le nombre de
// cellules nouvelles (la partie a changé : à sauvegarder s'il n'est pas nul).
function voirCellules(state, T, cellules) {
  const bits = bitsDe(state, T), nouvelles = [];
  for (const i of cellules) if (!lu(bits, i)) { pose(bits, i); nouvelles.push(i); }
  if (!nouvelles.length) return 0;
  if (!state.monde || typeof state.monde !== 'object') state.monde = { vues: [] };
  const s = versBase64(bits);
  state.monde.vu = s;
  memo.s = s;
  // (les régions : celles des cellules nouvelles, une fois chacune)
  const { C, L } = grilleVu(T), N = MONDE.REGION, vues = regionsVues(state, T);
  if (!Array.isArray(state.monde.vues)) state.monde.vues = [];
  const plus = new Set();
  for (const i of nouvelles) {
    const cle = Math.floor(((i % L) * C) / N) + ',' + Math.floor((Math.floor(i / L) * C) / N);
    if (!vues.has(cle) && !plus.has(cle)) { plus.add(cle); state.monde.vues.push(cle); }
  }
  return nouvelles.length;
}

// Le personnage est sur la case t (le biome de sa case, son nom ; la nuit ou non) : ce qu'il voit
// devient vu (fiche 11 : la nuit, le casque à lampe voit plus loin, equipement.js vueNuitPct). → le
// nombre de cellules nouvelles.
export function voirAutour(state, t, { biome = null, nuit = false } = {}) {
  const T = farmTerrain(state);
  if (!T.FERME || !Number.isInteger(t) || t < 0 || t >= T.LARGEUR * T.HAUTEUR) return 0;
  const lampe = nuit ? vueNuitPct(state) : 100;
  return voirCellules(state, T, cellulesAutour(T, t, lampe === 100 ? rayonVue(biome, nuit) : (rayonVue(biome, nuit) * lampe) / 100));
}

// Un lieu montré de loin (le didacticiel, fiche 9b : le cocher parle du hameau voisin) : les cellules à
// R cases autour de la case t deviennent vues, comme si on y était passé. → le nombre de cellules nouvelles.
export function montrerLieu(state, t, R = DECOUVERTE.RAYON) {
  const T = farmTerrain(state);
  if (!T.FERME || !Number.isInteger(t) || t < 0 || t >= T.LARGEUR * T.HAUTEUR) return 0;
  return voirCellules(state, T, cellulesAutour(T, t, R));
}

// Le vu d'une nouvelle partie : la ferme et sa prairie.
export function vuInitial(T) {
  if (!T || !T.FERME) return '';
  const { L, H } = grilleVu(T), bits = new Uint8Array(Math.ceil((L * H) / 8));
  for (const i of cellulesFerme(T)) pose(bits, i);
  return versBase64(bits);
}

// Le vu d'une partie d'avant la fiche 8 (la migration 57 → 58, state.js) : la ferme et sa prairie, et
// chaque région déjà vue (« rx,ry »), en entier. Les régions de la ferme étaient vues d'office (pas
// parcourues : regionsFerme, terrain.js) : elles ne comptent que si le joueur est allé au-delà (une autre
// région vue : il les a traversées) ; sinon, la partie repart comme une nouvelle (la ferme et sa prairie).
export function vuDesRegions(T, vues) {
  if (!T || !T.FERME) return '';
  const { C, L, H } = grilleVu(T), N = MONDE.REGION, k = N / C, bits = deBase64(vuInitial(T), Math.ceil((L * H) / 8));
  const ferme = new Set(regionsFerme(T)), liste = Array.isArray(vues) ? vues : [];
  const parti = liste.some((cle) => !ferme.has(String(cle)));
  for (const cle of parti ? liste : []) {
    const [rx, ry] = String(cle).split(',').map(Number);
    if (!Number.isInteger(rx) || !Number.isInteger(ry)) continue;
    for (let cy = ry * k; cy < Math.min(H, (ry + 1) * k); cy++) for (let cx = rx * k; cx < Math.min(L, (rx + 1) * k); cx++) if (cx >= 0 && cy >= 0) pose(bits, cy * L + cx);
  }
  return versBase64(bits);
}

// Le mode test : tout le monde vu, ou plus rien que la ferme et sa prairie. Les régions du moteur n'y
// changent pas (state.monde.vues : tout voir d'un coup n'y met pas les 88 régions du monde, que le
// moteur passerait alors en revue chaque nuit).
export function toutVoir(state) {
  const T = farmTerrain(state);
  if (!T.FERME) return { ok: false };
  const { L, H } = grilleVu(T), bits = new Uint8Array(Math.ceil((L * H) / 8));
  for (let i = 0; i < L * H; i++) pose(bits, i);
  state.monde.vu = versBase64(bits);
  return { ok: true };
}
export function toutCacher(state) {
  const T = farmTerrain(state);
  if (!T.FERME) return { ok: false };
  state.monde.vu = vuInitial(T);
  return { ok: true };
}

/* ---------- ce que la carte du monde montre ---------- */

// Les lieux du plan (monde-gen.js : { hameaux: [{ id, case, nom }], grottes: [{ id, case }], peche:
// [{ id, case, eau }] }) que la carte du monde montre : ceux dont la case est vue, et rien d'autre. Un
// hameau vu de loin n'a pas de nom tant que le personnage n'y est pas allé (state.monde.hameaux).
// → { hameaux: [{ id, case, nom, connu }], grottes: [{ id, case, nom }], peche: [{ id, case, eau, nom }] }.
export function lieuxDeLaCarte(state, lieux, T = farmTerrain(state)) {
  const out = { hameaux: [], grottes: [], peche: [] };
  if (!lieux) return out;
  const connus = (state.monde && state.monde.hameaux) || {};
  for (const h of lieux.hameaux || []) {
    if (!caseVue(state, h.case, T)) continue;
    const c = connus[h.id];
    out.hameaux.push({ id: h.id, case: h.case, nom: c ? c.nom : 'Un hameau', connu: !!c });
  }
  for (const g of lieux.grottes || []) if (caseVue(state, g.case, T)) out.grottes.push({ id: g.id, case: g.case, nom: 'Une grotte' });
  const EAUX = { lac: 'au lac', riviere: 'à la rivière', mer: 'en mer' };
  for (const p of lieux.peche || []) if (caseVue(state, p.case, T)) out.peche.push({ id: p.id, case: p.case, eau: p.eau, nom: `Un coin de pêche ${EAUX[p.eau] || ''}`.trim() });
  return out;
}

/* ---------- la boussole ---------- */

export const SORTES_BUTS = ['hameau', 'grotte', 'peche'];

// Le lieu choisi sur la carte du monde (state.monde.but : { sorte, id }), ou null (la ferme).
export function butBoussole(state) {
  const b = state && state.monde && state.monde.but;
  return b && SORTES_BUTS.includes(b.sorte) && typeof b.id === 'string' ? b : null;
}

// Choisit le but de la boussole (null : la ferme). Un lieu qui n'est pas vu ne se choisit pas.
export function choisirBut(state, but, lieux = null) {
  if (!state.monde || typeof state.monde !== 'object') return { ok: false, error: 'Pas de grand monde.' };
  if (!but) { state.monde.but = null; return { ok: true }; }
  if (!SORTES_BUTS.includes(but.sorte) || typeof but.id !== 'string') return { ok: false, error: 'Lieu inconnu.' };
  if (lieux) {
    const liste = lieuxDeLaCarte(state, lieux)[but.sorte === 'hameau' ? 'hameaux' : but.sorte === 'grotte' ? 'grottes' : 'peche'];
    if (!liste.some((l) => l.id === but.id)) return { ok: false, error: 'Ce lieu n\'a pas encore été vu.' };
  }
  state.monde.but = { sorte: but.sorte, id: but.id };
  return { ok: true };
}

// La boussole est-elle montrée ? (les Options : state.monde.boussole, vrai par défaut)
export function boussoleMontree(state) {
  return !(state && state.monde && state.monde.boussole === false);
}
export function montrerBoussole(state, oui) {
  if (!state.monde || typeof state.monde !== 'object') return { ok: false };
  state.monde.boussole = !!oui;
  return { ok: true };
}

// La direction et la distance de (x, y) à (bx, by) (en cases) : { angle (radians : 0 vers l'est, π/2
// vers le sud, comme l'écran), distance (en cases, arrondie) }.
export function directionVers(x, y, bx, by) {
  return { angle: Math.atan2(by - y, bx - x), distance: Math.round(Math.hypot(bx - x, by - y)) };
}

// Ce que montre la boussole quand le personnage est en (x, y) (en cases) : { sorte, id, nom, x, y (le
// but, en cases : le milieu de sa case), angle, distance, arrive }, ou null quand elle se cache : sur la
// ferme sans but choisi (elle montrerait la ferme, où l'on est), ou dans les Options. Le but : le lieu
// choisi s'il est encore vu (lieux : ceux du plan), sinon la ferme (le milieu de sa sortie, au bout du
// chemin : `sortie`, une case). `arrive` : à ARRIVEE cases du lieu choisi.
export function etatBoussole(state, x, y, lieux, sortie, T = farmTerrain(state)) {
  if (!T || !T.FERME || !boussoleMontree(state)) return null;
  const W = T.LARGEUR, F = T.FERME, b = butBoussole(state);
  let but = null;
  if (b && lieux) {
    const l = lieuxDeLaCarte(state, lieux, T)[b.sorte === 'hameau' ? 'hameaux' : b.sorte === 'grotte' ? 'grottes' : 'peche'].find((q) => q.id === b.id);
    if (l) but = { sorte: b.sorte, id: l.id, nom: l.nom, x: (l.case % W) + 0.5, y: Math.floor(l.case / W) + 0.5 };
  }
  if (!but) {
    const surFerme = x >= F.X && y >= F.Y && x < F.X + F.LARGEUR && y < F.Y + F.HAUTEUR;
    if (surFerme) return null;
    const c = Number.isInteger(sortie) ? sortie : (F.Y + Math.floor(F.HAUTEUR / 2)) * W + F.X + Math.floor(F.LARGEUR / 2);
    but = { sorte: 'ferme', id: 'ferme', nom: 'La ferme', x: (c % W) + 0.5, y: Math.floor(c / W) + 0.5 };
  }
  const d = directionVers(x, y, but.x, but.y);
  return { ...but, ...d, arrive: but.sorte !== 'ferme' && Math.hypot(but.x - x, but.y - y) <= DECOUVERTE.ARRIVEE };
}
