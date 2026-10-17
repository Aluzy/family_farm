import { HERBE, PLANTES_OK, ROCHERS, TUILES_VIDES } from './planche.js';

/* ---------- le terrain d'une carte de la ferme ---------- */

// Le terrain (comme DATA.TERRAIN : LARGEUR, HAUTEUR, ZONES, LIGNES, ROCHERS, ARBRES) d'une
// carte de la ferme au format de Tiled (`raw` : width, height, tilewidth, layers). Les mêmes
// règles que scripts/carte/terres.py, qui écrit data/terrain.json pour la carte de Tiled : le
// jeu s'en sert pour une carte générée (ferme-generee.js), et un test vérifie que les deux
// donnent le même terrain pour la carte de Tiled.
//
// Une tuile est labourable (« # ») si son sol (« ground ») est de l'herbe foncée, si aucune
// couche de décor ne la couvre (COUVRANTES et toutes les couches d'arbres), si « plantes_pierres »
// n'y pose ni pierre ni arbuste, et si elle n'est ni sous un bâtiment ni dans ses abords
// (BATIMENTS), ni près d'un arbre du Verger, ni sous le puits et la citerne. « + » : herbe des
// abords (elle porte une bordure sans se labourer). « o » : sous un rocher ou un arbre
// abattable (labourable une fois tombé). « . » : rien de tout ça.
//
// `objets` : des rectangles nommés à ajouter à ceux de la carte (ceux que la scène pose sans
// la carte, comme le puits et la citerne : DEFAULT_OBJECTS dans js/carte/ferme/config.js).

const COUVRANTES = ['decor', 'barrieres', 'barrieres_portail', 'contour_herbe', 'animation_eau', 'water_shine', 'layer_tree_4', 'layer_tree_3',
  'layer_tree_2', 'layer_tree_1', 'layer_tree_top', 'falling_leaves'];
// Bordures de terre des anciennes zones de culture : le jeu ne les dessine plus, elles ne
// couvrent rien (hors du sol).
const BORDURES = new Set([1612, 1613, 1614, 1687, 1688, 1689, 1762, 1763, 1764]);
// Bâtiments : leur rectangle est interdit, plus `marge` tuiles autour (distance du centre de la
// case au rectangle).
const BATIMENTS = { poulailler: 8, grange: 3, moulin: 3, serre: 3, maison: 1, silo: 1, verger: 2 };
// Le puits et la citerne : les cases que couvrent leurs rectangles sont interdites (« + »).
const ENCLOS = ['puits', 'citerne'];
// Les anciennes zones de culture : leur rectangle et leur nombre de colonnes.
const ZONES = { 1: ['zone_culture_1', 5], 2: ['zone_culture_2', 8] };

export function terrainOfMap(raw, objets = {}) {
  const W = raw.width, H = raw.height, T = raw.tilewidth, N = W * H;
  const layers = {}, named = {};
  for (const l of raw.layers) {
    if (l.type === 'tilelayer') layers[l.name] = l;
    else if (l.type === 'objectgroup') for (const o of l.objects || []) if (o.name) named[o.name] = o;
  }
  Object.assign(named, objets);
  const vide = (g) => TUILES_VIDES.has(g);
  const gid = (name, i) => {
    const l = layers[name];
    const g = l ? l.data[i] & 0x0fffffff : 0;
    return g && (vide(g) || (name !== 'ground' && BORDURES.has(g))) ? 0 : g;
  };
  const distRect = (c, r, o) => {
    const cx = (c + 0.5) * T, cy = (r + 0.5) * T;
    const dx = Math.max(o.x - cx, 0, cx - (o.x + o.width));
    const dy = Math.max(o.y - cy, 0, cy - (o.y + o.height));
    return Math.hypot(dx, dy) / T;
  };
  // un groupe de cases voisines (côtés) où `dans(i)` est vrai, depuis i0
  const groupe = (i0, dans, vus) => {
    const cases = [], pile = [i0];
    vus[i0] = 1;
    while (pile.length) {
      const i = pile.pop(), c = i % W;
      cases.push(i);
      for (const j of [c > 0 ? i - 1 : -1, c < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (j >= 0 && j < N && !vus[j] && dans(j)) { vus[j] = 1; pile.push(j); }
      }
    }
    return cases;
  };

  // Les arbres que la hache abat : dans chaque couche d'arbres (sauf layer_tree_top), un groupe
  // de cases voisines de 2 à 6 cases de large et 3 à 7 de haut ; identifiant « colonne,rangée »
  // du milieu de son pied. arbreDe[couche][case] : son identifiant, ou null (buisson, forêt).
  const arbreDe = {};
  for (const [nom, l] of Object.entries(layers)) {
    if (!nom.startsWith('layer_tree') || nom.includes('top')) continue;
    const de = new Map(), vus = new Uint8Array(N), plein = (i) => !!(l.data[i] & 0x0fffffff);
    for (let i0 = 0; i0 < N; i0++) {
      if (vus[i0] || !plein(i0)) continue;
      const cases = groupe(i0, plein, vus);
      let c0 = W, c1 = -1, r0 = H, r1 = -1;
      for (const i of cases) { const c = i % W, r = Math.floor(i / W); c0 = Math.min(c0, c); c1 = Math.max(c1, c); r0 = Math.min(r0, r); r1 = Math.max(r1, r); }
      const w = c1 - c0 + 1, h = r1 - r0 + 1;
      let id = null;
      if (w >= 2 && w <= 6 && h >= 3 && h <= 7) {
        const pied = cases.filter((i) => Math.floor(i / W) === r1).map((i) => i % W);
        id = Math.floor((Math.min(...pied) + Math.max(...pied) + 1) / 2) + ',' + r1;
      }
      for (const i of cases) de.set(i, id);
    }
    arbreDe[nom] = de;
  }

  const verger = Object.entries(named).filter(([n]) => n.startsWith('arbre_verger_')).map((e) => e[1]);
  const couvrantes = COUVRANTES.concat(Object.keys(layers).filter((n) => n.startsWith('layer_tree') && !COUVRANTES.includes(n)));
  const enclos = ENCLOS.map((n) => named[n]).filter(Boolean)
    .map((o) => [Math.floor(o.x / T), Math.floor(o.y / T), Math.floor((o.x + o.width) / T), Math.floor((o.y + o.height) / T)]);
  const raison = new Array(N).fill(null);
  const arbres = {};
  for (let i = 0; i < N; i++) {
    const c = i % W, r = Math.floor(i / W);
    let why = null;
    const ab = new Set();
    for (const n of Object.keys(arbreDe)) if (gid(n, i)) ab.add(arbreDe[n].get(i));
    const pp = gid('plantes_pierres', i);
    if (!HERBE.has(gid('ground', i))) why = 'sol';
    else if (couvrantes.some((n) => !(n in arbreDe) && gid(n, i)) || ab.has(null)) why = 'decor';
    else if (pp && !PLANTES_OK.has(pp) && !ROCHERS.has(pp)) why = 'pierre';
    else {
      for (const [n, m] of Object.entries(BATIMENTS)) {
        if (named[n] && distRect(c, r, named[n]) <= m) { why = 'batiment'; break; }
      }
      if (!why && verger.some((o) => distRect(c, r, o) <= 1)) why = 'verger';
      if (!why && enclos.some(([x0, y0, x1, y1]) => x0 <= c && c <= x1 && y0 <= r && r <= y1)) why = 'enclos';
    }
    if (why === null && ROCHERS.has(pp)) why = 'rocher';
    if ((why === null || why === 'rocher') && ab.size) {
      why = 'rocher';                              // « o » : sous un objet qui s'enlève (rocher, arbre)
      for (const a of ab) (arbres[a] = arbres[a] || []).push(i);
    }
    raison[i] = why;
  }
  // les rochers : leurs cases (identifiant : la case en bas à gauche)
  const rochers = {};
  const vus = new Uint8Array(N), estRocher = (i) => ROCHERS.has(gid('plantes_pierres', i));
  for (let i0 = 0; i0 < N; i0++) {
    if (vus[i0] || !estRocher(i0)) continue;
    const cases = groupe(i0, estRocher, vus).sort((a, b) => a - b);
    const c0 = Math.min(...cases.map((i) => i % W)), r1 = Math.max(...cases.map((i) => Math.floor(i / W)));
    rochers[c0 + ',' + r1] = cases;
  }
  const zones = {};
  for (const [z, [nom, cols]] of Object.entries(ZONES)) {
    const o = named[nom];
    if (o) zones[z] = { X: Math.round(o.x / T), Y: Math.round(o.y / T), COLONNES: cols };
  }
  const car = (i) => (raison[i] === null ? '#' : raison[i] === 'rocher' ? 'o' : ['batiment', 'verger', 'enclos'].includes(raison[i]) ? '+' : '.');
  const lignes = [];
  for (let r = 0; r < H; r++) {
    let s = '';
    for (let c = 0; c < W; c++) s += car(r * W + c);
    lignes.push(s);
  }
  const ARBRES = {};
  for (const k of Object.keys(arbres).sort()) ARBRES[k] = arbres[k].sort((a, b) => a - b);
  return { LARGEUR: W, HAUTEUR: H, ZONES: zones, LIGNES: lignes, ROCHERS: rochers, ARBRES };
}
