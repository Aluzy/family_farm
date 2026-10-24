import { mulberry32 } from './base.js';
import { DATA } from './catalog.js';
import { hache } from './ferme-generee.js';

/* ---------- le générateur du grand monde : le plan (docs/grand-monde.md, étape 4) ---------- */

// Le plan du monde d'une partie, tiré d'après sa graine autour de la ferme posée au centre
// (monde.js) : le relief, l'humidité et le biome de chaque tuile, les rivières, les lacs, les
// chemins et les lieux (hameaux, entrées de grotte, coins de pêche). Ce ne sont que des données :
// monde-sol.js en fait le sol du monde (les tuiles de chaque case, où l'on marche). Les réglages
// sont dans data/monde.json (DATA.BIOMES, DATA.PLAN_MONDE).
//
// Le générateur a son fichier (et pas une place dans monde.js, qui pose la ferme et fait la carte)
// parce qu'il se découpe en trois parts, que monde-sol.js fait travailler dans un Web Worker
// (js/monde-worker.js) :
//   - les champs (champsDuMonde) : le relief, l'humidité et le biome « naturel » d'une tuile ne
//     dépendent que de bruits de la graine et de la place de la ferme, tuile par tuile, sans rien
//     garder d'une tuile à l'autre : n'importe quelle région se calcule seule ;
//   - les éléments (elementsDuMonde) : ce qui traverse le monde (rivières, lacs, chemins, lieux),
//     tiré une fois pour tout le monde. Ils ne lisent les champs que là où ils passent (un relevé
//     des tuiles déjà lues : releve) et pèsent peu : des listes de cases, et `eaux` (une valeur
//     par tuile : le biome posé par-dessus, lac ou rivière ; AUCUNE_EAU : rien) ;
//   - une région (biomesDeRegion) : ses tuiles, les champs plus les eaux posées.
// fairePlan assemble le tout pour le monde entier (planDuMonde, monde.js : à la première demande).
//
// Le monde est fermé : la montagne au nord et à l'ouest, la mer au sud et à l'est. Le relief
// descend en pente douce des bords nord et ouest vers les bords sud et est ; la montagne s'y
// ajoute près des premiers, la mer se creuse près des seconds (des bords décalés par un bruit :
// la côte est découpée, la montagne avance et recule) ; tout contre le bord même, les sommets ou
// la mer sont forcés ; dans les coins nord-est et sud-ouest, où la montagne rencontre la mer, le
// bord le plus proche l'emporte et des falaises font le partage. La ferme et une marge autour
// sont forcées en prairie (un relief et une humidité fixes : un plateau que les rivières
// contournent), avec une transition douce.
//
// Un tirage par usage (comme ferme-generee.js) : chaque bruit et chaque suite au hasard a sa clé
// (« <graine>:monde:<usage> ») ; changer l'un ne déplace pas les autres.
//
// Le cadre (`cadre`) : { LARGEUR, HAUTEUR (du monde, en tuiles), FERME: { X, Y, LARGEUR, HAUTEUR },
// SORTIE (la case du monde juste à l'est de la sortie de la ferme, au bout de son chemin) }.

export const BIOMES = DATA.BIOMES;
// le code de chaque biome (BIOME.mer : 0…)
export const BIOME = Object.fromEntries(BIOMES.map((b, i) => [b, i]));
export const AUCUNE_EAU = 255;

const cle = (graine, usage) => String(graine) + ':monde:' + usage;
const lisse = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const borne = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const entre = (r, [a, b]) => a + Math.floor(r() * (b - a + 1));

// La distance (en tuiles) de la tuile (x, y) au rectangle de la ferme (0 dedans).
function distanceFerme(F, x, y) {
  const dx = Math.max(F.X - x, 0, x - (F.X + F.LARGEUR - 1)), dy = Math.max(F.Y - y, 0, y - (F.Y + F.HAUTEUR - 1));
  return Math.sqrt(dx * dx + dy * dy);
}

// Un bruit lisse entre 0 et 1, comme celui de ferme-generee.js (bruit : des valeurs sur une grille
// de `pas` tuiles, interpolées, plusieurs octaves), sur un monde de W × H tuiles : les valeurs de
// la grille de chaque octave sont tirées une fois, au départ (le monde a 328 440 tuiles, la
// grille de la plus fine octave quelques milliers de points).
export function bruitDuMonde(graine, pas, octaves, W, H) {
  const g0 = hache(graine), grilles = [];
  for (let o = 0, p = pas; o < octaves; o++, p /= 2) {
    const nx = Math.floor((W - 1) / p) + 2, ny = Math.floor((H - 1) / p) + 2, v = new Float32Array(nx * ny);
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        let h = (g0 ^ Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(o + 1, 2147483647)) >>> 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        v[iy * nx + ix] = (((h ^ (h >>> 16)) >>> 0) & 0xffff) / 0xffff;
      }
    }
    grilles.push({ p, nx, v, a: 1 / 2 ** o });
  }
  const total = grilles.reduce((s, g) => s + g.a, 0);
  return (x, y) => {
    x = x < 0 ? 0 : x > W - 1 ? W - 1 : x;
    y = y < 0 ? 0 : y > H - 1 ? H - 1 : y;
    let s = 0;
    for (const { p, nx, v, a } of grilles) {
      const fx = x / p, fy = y / p, ix = Math.floor(fx), iy = Math.floor(fy), k = iy * nx + ix;
      const tx = lisse(fx - ix), ty = lisse(fy - iy);
      s += a * ((v[k] * (1 - tx) + v[k + 1] * tx) * (1 - ty) + (v[k + nx] * (1 - tx) + v[k + nx + 1] * tx) * ty);
    }
    return s / total;
  };
}

// Un champ lent (un bruit de grand pas) lu sur une grille de `pas` tuiles, tirée une fois, et
// interpolé entre ses points : quatre lectures au lieu de toutes ses octaves. Pour un bruit dont
// la plus fine octave fait plusieurs fois `pas`, l'écart ne se voit pas.
function grilleLente(f, pas, W, H) {
  const nx = Math.ceil((W - 1) / pas) + 2, ny = Math.ceil((H - 1) / pas) + 2, v = new Float32Array(nx * ny);
  for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) v[iy * nx + ix] = f(ix * pas, iy * pas);
  return (x, y) => {
    const fx = x / pas, fy = y / pas, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, k = iy * nx + ix;
    return (v[k] * (1 - tx) + v[k + 1] * tx) * (1 - ty) + (v[k + nx] * (1 - tx) + v[k + nx + 1] * tx) * ty;
  };
}

/* ---------- 1. les champs : le relief, l'humidité, le biome naturel d'une tuile ---------- */

// champsDuMonde(graine, cadre) → { valeurs(x, y[, sortie]) : [relief, humidité, biome] } (relief
// et humidité entre 0 et 1 ; le biome naturel : son code, sans les eaux que posent les éléments ;
// `sortie` : le tableau à remplir, pour n'en pas faire un par tuile). Les bruits lents (les bords,
// l'humidité, les crêtes, la découpe de la côte, les falaises) sont lus sur une grille de LENT
// tuiles.
export function champsDuMonde(graine, cadre) {
  const P = DATA.PLAN_MONDE, R = P.RELIEF, B = P.BORDS, S = P.SEUILS, Hu = P.HUMIDITE, PF = P.FERME;
  const W = cadre.LARGEUR, H = cadre.HAUTEUR, F = cadre.FERME;
  const b = (usage, pas, octaves) => bruitDuMonde(cle(graine, usage), pas, octaves, W, H);
  const lent = (usage, pas, octaves) => grilleLente(b(usage, pas, octaves), P.LENT, W, H);
  const ondX = lent('ondulation_x', B.PAS_ONDULATION, 3), ondY = lent('ondulation_y', B.PAS_ONDULATION, 3);
  const bosses = b('relief', R.PAS, 4), cretes = lent('cretes', R.PAS_CRETES, 3), decoupe = lent('decoupe', R.PAS_DECOUPE, 2);
  const humide = lent('humidite', Hu.PAS, 3), rocheux = lent('falaises', S.PAS_FALAISE, 2);
  const rampe = (d, L) => lisse(1 - d / L);   // 1 au bord (d = 0), 0 à L tuiles
  const { mer, plage, falaise, prairie, foret, marais, lande, montagne, sommet } = BIOME;
  return {
    valeurs(x, y, sortie = [0, 0, 0]) {
      // les bords décalés : a, la distance aux bords de la montagne (nord, ouest), bm à ceux de la mer
      const wx = x + (ondX(x, y) - 0.5) * 2 * B.ONDULATION, wy = y + (ondY(x, y) - 0.5) * 2 * B.ONDULATION;
      const a = Math.max(0, Math.min(wx, wy)), bm = Math.max(0, Math.min(W - 1 - wx, H - 1 - wy));
      // (tout contre le bord vrai, la fermeture : les sommets ou la mer)
      const m = Math.max(rampe(a, B.MONTAGNE), rampe(Math.min(x, y), B.FERMETURE));
      const s = Math.max(rampe(bm, B.MER), rampe(Math.min(W - 1 - x, H - 1 - y), B.FERMETURE));
      // dans les coins, le bord le plus proche l'emporte (p : 1 du côté de la mer)
      const p = lisse((a / B.MONTAGNE - bm / B.MER) * B.COIN + 0.5);
      const mont = m * (1 - p), cote = s * p;
      const ride = 1 - Math.abs(2 * cretes(x, y) - 1);
      let e = R.HAUT - (R.HAUT - R.BAS) * (a / (a + bm + 1e-6))
        + R.MONTAGNE * mont ** R.FORME * (1 + R.CRETES * ride) - R.MER * cote
        + R.BRUIT * (bosses(x, y) - 0.5) * 2 * (1 - 0.6 * Math.max(m, s)) + R.DECOUPE * (decoupe(x, y) - 0.5) * 2 * s;
      let h = borne(0.5 + (humide(x, y) - 0.5) * Hu.CONTRASTE + Hu.MER * cote);
      // la ferme et sa marge : la prairie, puis une transition douce
      const w = lisse((distanceFerme(F, x, y) - PF.MARGE) / PF.TRANSITION);
      e = borne(PF.RELIEF + (e - PF.RELIEF) * w);
      h = PF.HUMIDITE + (h - PF.HUMIDITE) * w;
      let bi;
      if (e < S.MER) bi = mer;
      else if (m > 0.5 && s > 0.5 && p > 0.1 && p < 0.9) bi = falaise;            // le partage des coins
      else if (e < S.MER + S.COTE) bi = rocheux(x, y) > S.FALAISE || mont > 0.3 ? falaise : plage;
      else if (e >= S.SOMMET) bi = sommet;
      else if (e >= S.MONTAGNE) bi = montagne;
      else if (h >= S.MARAIS && e < S.MARAIS_RELIEF) bi = marais;
      else if (h >= S.FORET) bi = foret;
      else if (h <= S.LANDE || e >= S.LANDE_HAUTE) bi = lande;
      else bi = prairie;
      // (tout contre le bord, dans les coins où la montagne et la mer se partagent : ni l'une ni
      // l'autre ne l'a fermé ; le bord le plus proche le ferme)
      const bordM = Math.min(x, y), bordS = Math.min(W - 1 - x, H - 1 - y);
      if (Math.min(bordM, bordS) < B.FERMETURE / 2 && bi !== mer && bi !== sommet && bi !== falaise) bi = bordS < bordM ? mer : sommet;
      sortie[0] = e; sortie[1] = h; sortie[2] = bi;
      return sortie;
    },
  };
}

// Le relevé des champs : le relief, l'humidité et le biome naturel de chaque tuile, calculés à la
// première lecture et gardés (les éléments relisent souvent les mêmes tuiles). → { relief(i),
// humidite(i), biome(i), tout() : les trois tableaux, toutes les tuiles calculées }.
export function releve(champs, cadre) {
  const W = cadre.LARGEUR, N = W * cadre.HAUTEUR;
  const rel = new Float32Array(N), hum = new Float32Array(N), bio = new Uint8Array(N).fill(255), v = [0, 0, 0];
  const lis = (i) => {
    if (bio[i] === 255) { champs.valeurs(i % W, Math.floor(i / W), v); rel[i] = v[0]; hum[i] = v[1]; bio[i] = v[2]; }
  };
  return {
    relief: (i) => { lis(i); return rel[i]; },
    humidite: (i) => { lis(i); return hum[i]; },
    biome: (i) => { lis(i); return bio[i]; },
    tout() { for (let i = 0; i < N; i++) lis(i); return { relief: rel, humidite: hum, biome: bio }; },
  };
}

/* ---------- un tas binaire (le plus petit d'abord) et un A* sur les tuiles du monde ---------- */

function tas() {
  const cles = [], cases = [];
  return {
    get taille() { return cases.length; },
    pousse(k, i) {
      cles.push(k); cases.push(i);
      let n = cases.length - 1;
      while (n > 0) {
        const p = (n - 1) >> 1;
        if (cles[p] <= cles[n]) break;
        [cles[p], cles[n]] = [cles[n], cles[p]]; [cases[p], cases[n]] = [cases[n], cases[p]]; n = p;
      }
    },
    tire() {
      const i = cases[0], k = cles.pop(), c = cases.pop();
      if (cases.length) {
        cles[0] = k; cases[0] = c;
        let n = 0;
        for (;;) {
          const g = 2 * n + 1, d = g + 1;
          let m = n;
          if (g < cases.length && cles[g] < cles[m]) m = g;
          if (d < cases.length && cles[d] < cles[m]) m = d;
          if (m === n) break;
          [cles[m], cles[n]] = [cles[n], cles[m]]; [cases[m], cases[n]] = [cases[n], cases[m]]; n = m;
        }
      }
      return i;
    },
  };
}

// Un chercheur de chemin (A*) sur les N tuiles d'un monde de W de large, ses tables faites une fois
// pour toutes les recherches (celui du moteur, chemin.js, refait les siennes à chaque appel et n'a
// qu'un but). cherche(depart, { but(i), pas(i, j) : le prix du pas de i à j (< 0 : interdit ;
// en diagonale, il compte √2 fois), estime(j) : ce qui reste jusqu'au but, max }) → les cases du
// départ au but compris, ou null. `diag` : les pas en diagonale aussi (sinon de côté seulement).
function chercheur(N, W, diag = false) {
  const g = new Float32Array(N), de = new Int32Array(N), vu = new Uint32Array(N), fini = new Uint32Array(N);
  let tour = 0;
  return (depart, { but, pas, estime, max = N }) => {
    tour++;
    const t = tas();
    g[depart] = 0; de[depart] = -1; vu[depart] = tour;
    t.pousse(estime(depart), depart);
    for (let n = 0; t.taille && n < max; n++) {
      const i = t.tire();
      if (fini[i] === tour) continue;
      fini[i] = tour;
      if (but(i)) {
        const out = [];
        for (let k = i; k >= 0; k = de[k]) out.push(k);
        return out.reverse();
      }
      const c = i % W, gauche = c > 0, droite = c < W - 1;
      const vs = [gauche ? i - 1 : -1, droite ? i + 1 : -1, i - W, i + W];
      if (diag) vs.push(gauche ? i - W - 1 : -1, droite ? i - W + 1 : -1, gauche ? i + W - 1 : -1, droite ? i + W + 1 : -1);
      for (let n2 = 0; n2 < vs.length; n2++) {
        const j = vs[n2];
        if (j < 0 || j >= N || fini[j] === tour) continue;
        const p = pas(i, j);
        if (p < 0) continue;
        const v = g[i] + (n2 < 4 ? p : p * Math.SQRT2);
        if (vu[j] !== tour || v < g[j]) { vu[j] = tour; g[j] = v; de[j] = i; t.pousse(v + estime(j), j); }
      }
    }
    return null;
  };
}

/* ---------- 2. les éléments : rivières, lacs, chemins, lieux (une fois pour tout le monde) ---------- */

// elementsDuMonde(graine, cadre[, lire]) → { rivieres: [[cases…]…] (le fil de chaque rivière, de
// sa source à son embouchure, en cases voisines), finRivieres: ['mer' | 'lac' | 'riviere'…] (où
// chacune se jette : la case après sa dernière), lacs: [[cases…]…], eaux (Uint8Array, une valeur
// par tuile : BIOME.lac, BIOME.riviere ou AUCUNE_EAU), chemins: [[cases…]…] (en cases voisines),
// lieux: { hameaux: [{ id, case, nom }], grottes: [{ id, case }], peche: [{ id, case, eau }] } }.
// `lire` : le relevé des champs (releve), à partager avec qui le complétera ; sans lui, il s'en
// fait un.
export function elementsDuMonde(graine, cadre, lire = releve(champsDuMonde(graine, cadre), cadre)) {
  const P = DATA.PLAN_MONDE;
  const W = cadre.LARGEUR, H = cadre.HAUTEUR, N = W * H, F = cadre.FERME;
  const { relief, biome } = lire;
  const eaux = new Uint8Array(N).fill(AUCUNE_EAU);
  const { mer, plage, prairie, foret, marais, lande, montagne, sommet, lac, riviere } = BIOME;
  const hasard = (usage) => mulberry32(hache(cle(graine, usage)));
  const bruit = (usage, pas, octaves) => bruitDuMonde(cle(graine, usage), pas, octaves, W, H);
  const cherche = chercheur(N, W);
  const col = (i) => i % W, rang = (i) => Math.floor(i / W);
  const voisins = (i) => {
    const c = col(i), out = [];
    if (c > 0) out.push(i - 1);
    if (c < W - 1) out.push(i + 1);
    if (i >= W) out.push(i - W);
    if (i < N - W) out.push(i + W);
    return out;
  };
  const auBord = (i, n = 1) => { const c = col(i), r = rang(i); return c < n || r < n || c >= W - n || r >= H - n; };
  const distFerme = (i) => distanceFerme(F, col(i), rang(i));
  const dansFerme = (i) => distFerme(i) === 0;
  const loin = (liste, i, d) => liste.every((j) => Math.hypot(col(i) - col(j), rang(i) - rang(j)) >= d);
  const melange = (r, t) => { for (let k = t.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [t[k], t[j]] = [t[j], t[k]]; } return t; };
  // le biome d'une tuile, les eaux posées comprises
  const bio = (i) => (eaux[i] !== AUCUNE_EAU ? eaux[i] : biome(i));
  const estMer = (i) => biome(i) === mer;

  // ---- les tracés (rivières, chemins) : un A* sur une grille grossière (des cases de GRILLE ×
  // GRILLE tuiles, lues en leur centre : rapide sur un si grand monde), puis une courbe lissée par
  // les centres trouvés (un peu décalés au hasard), posée en cases voisines. Un A* tuile par tuile
  // ferait des traits droits et des angles droits ; la courbe serpente.
  const K = P.GRILLE, CW = Math.ceil(W / K), CH = Math.ceil(H / K);
  const chercheGros = chercheur(CW * CH, CW, true);
  const centre = (u) => Math.min(H - 1, Math.floor(u / CW) * K + (K >> 1)) * W + Math.min(W - 1, (u % CW) * K + (K >> 1));
  const gros = (i) => Math.floor(rang(i) / K) * CW + Math.floor(col(i) / K);
  const distGros = (u, v) => {
    const dx = Math.abs((u % CW) - (v % CW)), dy = Math.abs(Math.floor(u / CW) - Math.floor(v / CW));
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };
  // les centres d'une route de la grille grossière, un sur SAUT (la courbe en sera plus souple)
  const jalons = (route) => route.slice(1, -1).filter((u, n) => n % P.SAUT === P.SAUT - 1).map(centre);
  // une liste de cases voisines, sans boucle (une case qui revient : la boucle est ôtée)
  const sansBoucle = (cases) => {
    const out = [], ou = new Map();
    for (const i of cases) {
      if (ou.has(i)) { for (const j of out.splice(ou.get(i) + 1)) ou.delete(j); continue; }
      ou.set(i, out.length); out.push(i);
    }
    return out;
  };
  // la courbe par les cases `points` (la première et la dernière tenues, les autres décalées de
  // `decalage` tuiles au plus : DECALAGE × GRILLE × SAUT), lissée deux fois (Chaikin), en cases
  // voisines
  const courbe = (points, r, decalage = K * P.SAUT * P.DECALAGE) => {
    let pts = points.map((i, n) => {
      const bouge = n > 0 && n < points.length - 1 ? decalage : 0;
      return [col(i) + (r() - 0.5) * 2 * bouge, rang(i) + (r() - 0.5) * 2 * bouge];
    });
    // un long trait droit entre deux points (une route courte, peu de jalons) ondule : un point
    // tous les ONDULE.PAS tuiles, écarté de côté (ONDULE.AMPLITUDE fois l'écart entre deux points,
    // au hasard) ; sans quoi une rivière courte ou deux qui se rejoignent font des angles droits
    if (decalage > 0) {
      const O = P.ONDULE, out = [pts[0]];
      for (let k = 0; k < pts.length - 1; k++) {
        const [ax, ay] = pts[k], [bx, by] = pts[k + 1], L = Math.hypot(bx - ax, by - ay), n = Math.floor(L / O.PAS);
        for (let j = 1; j < n; j++) {
          const t = j / n, e = (r() - 0.5) * 2 * O.AMPLITUDE * (L / n);
          out.push([ax + (bx - ax) * t - ((by - ay) / L) * e, ay + (by - ay) * t + ((bx - ax) / L) * e]);
        }
        out.push(pts[k + 1]);
      }
      pts = out;
    }
    for (let n = 0; n < 2; n++) {
      const out = [pts[0]];
      for (let k = 0; k < pts.length - 1; k++) {
        const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
        out.push([0.75 * ax + 0.25 * bx, 0.75 * ay + 0.25 * by], [0.25 * ax + 0.75 * bx, 0.25 * ay + 0.75 * by]);
      }
      out.push(pts[pts.length - 1]);
      pts = out;
    }
    const pose = (v, n) => Math.max(1, Math.min(n - 2, Math.round(v)));
    let x = col(points[0]), y = rang(points[0]);
    const cases = [points[0]];
    pts.slice(1).forEach(([px, py], n) => {
      const fin = n === pts.length - 2;
      const tx = fin ? col(points[points.length - 1]) : pose(px, W), ty = fin ? rang(points[points.length - 1]) : pose(py, H);
      while (x !== tx || y !== ty) {
        if (Math.abs(tx - x) >= Math.abs(ty - y)) x += Math.sign(tx - x); else y += Math.sign(ty - y);
        cases.push(y * W + x);
      }
    });
    return sansBoucle(cases);
  };

  /* -- les rivières et leurs lacs -- */
  // Une rivière part d'une source en montagne et cherche (sur la grille grossière) le chemin le
  // moins coûteux jusqu'à la mer, une autre rivière ou un lac : un pas coûte peu, plus s'il est
  // haut (elle suit les vallées), beaucoup s'il monte (MONTEE par unité de relief gagnée) ; un
  // bruit la fait serpenter. Elle descend donc le relief tant qu'elle peut ; là où son fil ne peut
  // plus (une cuvette), elle creuse son lit au plus court, et la cuvette devient un lac (rempli
  // jusqu'à la hauteur qu'elle franchit, de LAC_MIN à LAC_MAX tuiles). Son fil est la courbe par
  // la route trouvée, arrêtée à la première case de la mer, d'une autre rivière ou d'un lac :
  // jamais dans la marge de la ferme (la route s'en tient loin), jamais deux fois par la même
  // case (sansBoucle).
  const R = P.RIVIERES;
  const interditEau = (i) => auBord(i) || distFerme(i) <= P.FERME.MARGE + 2;
  const fil = new Int16Array(N);       // k + 1 : sur le fil de la rivière k
  const lacs = [], rivieres = [], finRivieres = [];
  const rr = hasard('rivieres'), serpente = bruit('serpente', R.PAS_MEANDRE, 2);
  // les sources : en montagne (pas sur les sommets)
  const sources = [];
  for (let y = 4; y < H - 4; y += 6) {
    for (let x = 4; x < W - 4; x += 6) {
      const i = y * W + x;
      if (biome(i) === montagne && relief(i) > P.SEUILS.MONTAGNE + 0.03) sources.push(i);
    }
  }
  melange(rr, sources);
  // la mer la plus proche droit au sud ou droit à l'est (l'estimation de l'A* vise elle)
  const versMer = (s) => {
    let best = -1, bd = Infinity;
    for (const d of [1, W]) {
      let i = s, n = 0;
      while (!estMer(i) && i + d < N && !(d === 1 && col(i) === W - 1)) { i += d; n++; }
      if (estMer(i) && n < bd) { bd = n; best = i; }
    }
    return best;
  };
  const filGros = new Int16Array(CW * CH), lacGros = new Uint8Array(CW * CH);
  const couler = (s, k) => {
    const cible = versMer(s);
    if (cible < 0) return null;
    const su = gros(s), cu = gros(cible);
    const interditGros = (u) => { const c = centre(u); return auBord(c, K) || distFerme(c) <= P.FERME.MARGE + 2 + K; };
    const but = (u) => u !== su && (estMer(centre(u)) || (filGros[u] && filGros[u] !== k + 1) || lacGros[u] > 0);
    const route = chercheGros(su, {
      but,
      pas: (u, v) => {
        const c = centre(v);
        if (!estMer(c) && interditGros(v)) return -1;
        return 1 + R.MEANDRE * serpente(col(c), rang(c)) + R.VALLEE * relief(c) + R.MONTEE * Math.max(0, relief(c) - relief(centre(u)));
      },
      estime: (v) => distGros(v, cu),
    });
    if (!route) return null;
    // le dernier point : la mer (le centre de la case), ou la case de l'autre rivière (du lac) la
    // plus proche de son centre
    const u = route[route.length - 1], c0 = centre(u);
    let dernier = c0;
    if (!estMer(c0)) {
      let best = Infinity;
      for (let y = Math.floor(u / CW) * K; y < Math.min(H, Math.floor(u / CW) * K + K); y++) {
        for (let x = (u % CW) * K; x < Math.min(W, (u % CW) * K + K); x++) {
          const i = y * W + x, d = Math.abs(x - col(c0)) + Math.abs(y - rang(c0));
          if (((fil[i] && fil[i] !== k + 1) || eaux[i] === lac) && d < best) { best = d; dernier = i; }
        }
      }
    }
    const cases = courbe([s].concat(jalons(route), [dernier]), rr);
    // la rivière s'arrête à la première case de la mer, d'une autre rivière ou d'un lac
    for (let j = 1; j < cases.length; j++) {
      const i = cases[j];
      const fin = estMer(i) ? 'mer' : fil[i] && fil[i] !== k + 1 ? 'riviere' : eaux[i] === lac ? 'lac' : null;
      if (fin) return cases.slice(0, j).every((t) => !interditEau(t)) ? { fil: cases.slice(0, j), fin } : null;
    }
    return null;
  };
  // Les cuvettes d'un fil : une case d'où il remonte avant de redescendre plus bas qu'elle ; la
  // hauteur qu'il franchit (au plus LAC_PROFONDEUR). → [[indice dans le fil, hauteur]…], les plus
  // hautes d'abord.
  const cuvettes = (fl) => {
    const out = [];
    for (let j = 1; j < fl.length - 1; j++) {
      const e = relief(fl[j]);
      if (!(relief(fl[j - 1]) >= e && relief(fl[j + 1]) > e)) continue;
      let haut = e;
      for (let n = j + 1; n < fl.length && relief(fl[n]) >= e; n++) haut = Math.max(haut, relief(fl[n]));
      if (haut - e >= R.LAC_SEUIL) out.push([j, Math.min(haut - e, R.LAC_PROFONDEUR)]);
    }
    return out.sort((a, b) => b[1] - a[1]);
  };
  // remplir la cuvette de la case `depart` jusqu'au niveau `niveau` : les tuiles les plus basses
  // d'abord, `max` au plus, sans la mer, les autres eaux ni la marge de la ferme
  // (une tuile se prend d'autant plus tard qu'elle est loin du départ : LAC_ROND par tuile ;
  // sans quoi, sur une pente régulière, le lac s'étirait en un trait le long de la rangée la plus
  // basse ; une tuile au-dessus du niveau n'est pas prise, mais les autres continuent). Rien si
  // le lac est trop maigre.
  const remplir = (depart, niveau, max, ok = () => true) => {
    const t = tas(), vus = new Set([depart]), cases = [];
    const cx = col(depart), cy = rang(depart), cle = (j) => relief(j) + R.LAC_ROND * Math.hypot(col(j) - cx, rang(j) - cy);
    t.pousse(cle(depart), depart);
    while (t.taille && cases.length < max) {
      const j = t.tire();
      if (relief(j) > niveau || !ok(j)) continue;
      cases.push(j);
      for (const v of voisins(j)) {
        if (vus.has(v) || interditEau(v) || estMer(v) || eaux[v] !== AUCUNE_EAU) continue;
        vus.add(v); t.pousse(cle(v), v);
      }
    }
    // un lac trop maigre (le fond d'une vallée en V, entre deux crêtes : un trait d'eau) n'en est
    // pas un : sa surface doit faire LAC_PLEIN au moins du disque qui le contient
    let r2 = 0;
    for (const j of cases) r2 = Math.max(r2, (col(j) - cx) ** 2 + (rang(j) - cy) ** 2);
    return cases.length >= R.LAC_PLEIN * Math.PI * (Math.sqrt(r2) + 0.5) ** 2 ? cases : [];
  };
  const voulues = entre(rr, R.NOMBRE), choisies = [];
  for (const s of sources) {
    if (choisies.length >= voulues) break;
    if (!loin(choisies, s, R.ECART) || fil[s] || eaux[s] !== AUCUNE_EAU) continue;
    const k = rivieres.length, r = couler(s, k);
    if (!r || r.fil.length < R.LONGUEUR_MIN) continue;
    for (const i of r.fil) { fil[i] = k + 1; filGros[gros(i)] = k + 1; }
    rivieres.push(r.fil); finRivieres.push(r.fin); choisies.push(s);
    // ses lacs : dans ses plus grandes cuvettes
    let n = 0;
    for (const [j, h] of cuvettes(r.fil)) {
      if (n >= R.LACS_PAR_RIVIERE) break;
      const cs = remplir(r.fil[j], relief(r.fil[j]) + h, R.LAC_MAX);
      if (cs.length < R.LAC_MIN) continue;
      for (const i of cs) { eaux[i] = lac; lacGros[gros(i)] = 1; }
      lacs.push(cs); n++;
    }
  }
  // la largeur : 1, 2 puis 3 tuiles de la source à l'embouchure (posée sur les tuiles qui ne sont
  // ni la mer, ni un lac, ni la marge de la ferme ; pas sur les sommets, hors du fil)
  for (const fl of rivieres) {
    const n = fl.length;
    fl.forEach((i, j) => {
      const l = 1 + (j >= n * R.LARGEUR[0] ? 1 : 0) + (j >= n * R.LARGEUR[1] && n >= R.LONGUE ? 1 : 0);
      const c = col(i), r = rang(i), d0 = l === 3 ? -1 : 0, d1 = l === 1 ? 0 : 1;
      for (let dy = d0; dy <= d1; dy++) {
        for (let dx = d0; dx <= d1; dx++) {
          const x = c + dx, y = r + dy, t = y * W + x;
          if (x < 0 || y < 0 || x >= W || y >= H || estMer(t) || eaux[t] === lac || interditEau(t)) continue;
          if ((dx === 0 && dy === 0) || biome(t) !== sommet) eaux[t] = riviere;
        }
      }
    });
  }

  /* -- les lacs à part : dans les terres basses, loin des autres eaux -- */
  const rl = hasard('lacs');
  const voulus = entre(rl, P.LACS.NOMBRE), places = [];
  const bassesTerres = (i) => [prairie, foret, lande, marais].includes(biome(i));
  for (let y = 20; y < H - 20; y += 9) for (let x = 20; x < W - 20; x += 9) {
    const i = y * W + x;
    if (bassesTerres(i) && distFerme(i) > P.FERME.MARGE + 20) places.push(i);
  }
  melange(rl, places);
  for (let n = 0, k = 0; n < voulus && k < places.length; k++) {
    let i = places[k];
    // descendre jusqu'au creux
    for (let pas = 0; pas < 80; pas++) {
      let bas = i;
      for (const j of voisins(i)) if (!interditEau(j) && relief(j) < relief(bas)) bas = j;
      if (bas === i) break;
      i = bas;
    }
    if (interditEau(i) || !bassesTerres(i) || eaux[i] !== AUCUNE_EAU || !lacs.every((cs) => loin([cs[0]], i, P.LACS.ECART))) continue;
    let pres = false;
    for (let dy = -8; dy <= 8 && !pres; dy++) {
      for (let dx = -8; dx <= 8; dx++) {
        const x = col(i) + dx, y = rang(i) + dy;
        if (x >= 0 && y >= 0 && x < W && y < H && (eaux[y * W + x] !== AUCUNE_EAU || estMer(y * W + x))) { pres = true; break; }
      }
    }
    if (pres) continue;
    const cs = remplir(i, 1, entre(rl, P.LACS.TAILLE), bassesTerres);
    if (cs.length < R.LAC_MIN) continue;
    for (const j of cs) { eaux[j] = lac; lacGros[gros(j)] = 1; }
    lacs.push(cs); n++;
  }

  /* -- les hameaux : dans les biomes habitables, loin les uns des autres, tout autour de la ferme -- */
  const PH = P.HAMEAUX, rh = hasard('hameaux');
  const ouvert = (i) => [prairie, lande, plage].includes(bio(i));
  const terre = (i) => ouvert(i) || bio(i) === foret;
  const lisiere = (i) => bio(i) === foret && [-PH.LISIERE, PH.LISIERE].some((d) => {
    const c = col(i), r = rang(i);
    return (c + d >= 0 && c + d < W && ouvert(i + d)) || (r + d >= 0 && r + d < H && ouvert(i + d * W));
  });
  const habitable = (i) => ouvert(i) || lisiere(i);
  const fx = F.X + F.LARGEUR / 2, fy = F.Y + F.HAUTEUR / 2;
  const angle = (i) => Math.atan2(rang(i) - fy, col(i) - fx);
  const candidats = [];
  for (let y = 12; y < H - 12; y += 5) {
    for (let x = 12; x < W - 12; x += 5) {
      const i = y * W + x, d = PH.PLACE, df = distFerme(i);
      if (!habitable(i) || df < PH.FERME) continue;
      let ok = true;
      for (let dy = -d; dy <= d && ok; dy += d) for (let dx = -d; dx <= d; dx += d) if (!terre(i + dy * W + dx)) { ok = false; break; }
      if (ok) candidats.push({ i, note: rh() + (ouvert(i) ? PH.OUVERT : 0) + Math.min(df, PH.LOIN) / PH.LOIN * PH.LOIN_BONUS });
    }
  }
  // un secteur (autour du centre de la ferme) par hameau voulu : le meilleur candidat de chacun ;
  // puis, s'il en manque, les meilleurs qui restent
  const voulusHameaux = entre(rh, PH.NOMBRE), hameauxCases = [];
  const secteur = (i) => Math.floor(((angle(i) + Math.PI) / (2 * Math.PI)) * voulusHameaux) % voulusHameaux;
  candidats.sort((a, b) => b.note - a.note);
  for (const sct of melange(rh, [...Array(voulusHameaux).keys()])) {
    const c = candidats.find((o) => secteur(o.i) === sct && loin(hameauxCases, o.i, PH.ECART));
    if (c) hameauxCases.push(c.i);
  }
  for (const c of candidats) {
    if (hameauxCases.length >= PH.NOMBRE[0]) break;
    if (loin(hameauxCases, c.i, PH.ECART * 0.7)) hameauxCases.push(c.i);
  }
  const noms = PH.NOMS.slice();
  const hameaux = hameauxCases.sort((a, b) => angle(a) - angle(b)).map((i, n) => ({
    id: 'hameau_' + (n + 1), case: i, nom: noms.length ? noms.splice(Math.floor(rh() * noms.length), 1)[0] : 'Hameau ' + (n + 1),
  }));

  /* -- les chemins : la sortie de la ferme et les hameaux, en un tour du monde -- */
  // Les hameaux et la sortie de la ferme, dans l'ordre de leur angle autour du centre de la ferme,
  // chacun relié au suivant (le dernier au premier) : une boucle que la calèche suivra. Un pas
  // coûte selon le biome (COUTS : cher en montagne et dans les marais, un pont sur une rivière ;
  // impossible sur la mer, les lacs, les falaises et les sommets), un peu plus ou moins selon un
  // bruit (MEANDRE : le chemin serpente), plus près de la ferme (PRES_FERME : il ne longe pas sa
  // clôture), et presque rien sur un chemin déjà posé (les chemins se rejoignent).
  const PC = P.CHEMINS, meandre = bruit('meandre', PC.PAS_MEANDRE, 2);
  const surChemin = new Uint8Array(N);
  const coutDe = BIOMES.map((nom) => (nom in PC.COUTS ? PC.COUTS[nom] : -1));
  // (`longe` : pour rejoindre un chemin posé, qui coûte alors LONGE_COUT ; sinon COUTS.chemin, à
  // peine moins que la prairie : un chemin qui ferait le grand tour par les chemins déjà posés
  // n'est pas moins cher qu'un chemin neuf, et la boucle se ferme)
  const cout = (i, longe = false) => {
    if (auBord(i, 2) || dansFerme(i)) return -1;
    if (surChemin[i]) return longe ? PC.LONGE_COUT : PC.COUTS.chemin;
    const c = coutDe[bio(i)];
    if (c < 0) return -1;
    return c * (1 + PC.MEANDRE * meandre(col(i), rang(i))) * (distFerme(i) < P.FERME.MARGE + PC.PRES_FERME ? PC.PRES_FERME_COUT : 1);
  };
  const cheminGros = new Uint8Array(CW * CH), rc = hasard('chemins');
  // (une case de la grille grossière : le prix en son centre, si elle n'a pas de lac et si l'on passe
  // aussi à deux tuiles de son centre de chaque côté ; sinon elle est fermée)
  const coutGros = (v) => {
    if (lacGros[v]) return -1;
    if (cheminGros[v]) return PC.COUTS.chemin;
    const c = centre(v);
    for (const d of [-2, 2, -2 * W, 2 * W]) if (c + d < 0 || c + d >= N || cout(c + d) < 0) return -1;
    return cout(c);
  };
  // au plus juste, tuile par tuile (entre deux cases proches, ou si la grille grossière échoue)
  const fin = (a, b, max) => {
    const bx = col(b), by = rang(b);
    return cherche(a, { but: (i) => i === b, pas: (i, j) => cout(j), estime: (j) => PC.POIDS * (Math.abs(col(j) - bx) + Math.abs(rang(j) - by)), max });
  };
  // Relier a à b : la route sur la grille grossière, la courbe, puis les cases où l'on ne passe
  // pas (la courbe a coupé un coin de lac, de sommet…) refaites au plus juste entre les cases
  // bonnes de part et d'autre. Si ce raccord ne se trouve pas (l'obstacle est grand), les cases
  // grossières de l'obstacle sont fermées et la route recherchée (ESSAIS fois au plus) ; en
  // dernier recours, tout le chemin au plus juste.
  // les cases où l'on ne passe pas (la courbe a coupé un coin de lac, de sommet…) : refaites au
  // plus juste entre les cases bonnes de part et d'autre. → { cases } ; ou { rate: les cases où
  // le raccord ne s'est pas trouvé (l'obstacle est grand) }.
  const reparer = (cases) => {
    const out = [cases[0]];
    for (let j = 1; j < cases.length;) {
      if (cout(cases[j]) >= 0 || j === cases.length - 1) { out.push(cases[j++]); continue; }
      let k = j;
      while (k < cases.length - 1 && cout(cases[k]) < 0) k++;
      const pont = fin(out[out.length - 1], cases[k], PC.REPRISE_MAX);
      if (!pont) return { rate: cases.slice(j, k) };
      out.push(...pont.slice(1));
      j = k + 1;
    }
    return { cases: sansBoucle(out) };
  };
  // Relier a à b : la route sur la grille grossière, la courbe, réparée. Si la réparation échoue,
  // les cases grossières de l'obstacle sont fermées et la route recherchée de nouveau (ESSAIS fois
  // au plus) ; en dernier recours (un passage plus étroit que la grille), le chemin au plus juste,
  // lissé lui aussi (une case sur LISSE pour la courbe) s'il se répare.
  const relier = (a, b) => {
    const ua = gros(a), ub = gros(b), fermees = new Set();
    for (let essai = 0; essai < PC.ESSAIS; essai++) {
      const route = chercheGros(ua, {
        but: (u) => u === ub, pas: (u, v) => (v === ub ? 1 : fermees.has(v) ? -1 : coutGros(v)), estime: (v) => PC.POIDS * distGros(v, ub),
      });
      if (!route) break;
      const r = reparer(courbe([a].concat(jalons(route), [b]), rc));
      if (r.cases) return rejoindre(r.cases);
      for (const t of r.rate) if (gros(t) !== ua && gros(t) !== ub) fermees.add(gros(t));
    }
    const brut = fin(a, b);
    if (!brut) return null;
    const r = reparer(courbe(brut.filter((t, n) => n % PC.LISSE === 0).concat([b]), rc, 0));
    return rejoindre(r.cases || brut);
  };
  // Là où le nouveau chemin longe un chemin déjà posé (à RAPPROCHE tuiles au plus, sur LONGE
  // cases au moins), il le rejoint : ce bout est refait au plus juste, où les chemins posés ne
  // coûtent presque rien (pas deux chemins côte à côte).
  const pres = (i) => {
    const c = col(i), r = rang(i), d = PC.RAPPROCHE;
    for (let y = Math.max(0, r - d); y <= Math.min(H - 1, r + d); y++) for (let x = Math.max(0, c - d); x <= Math.min(W - 1, c + d); x++) if (surChemin[y * W + x]) return true;
    return false;
  };
  const rejoindre = (cases) => {
    const out = [cases[0]];
    for (let j = 1; j < cases.length;) {
      let k = j;
      while (k < cases.length - 1 && pres(cases[k])) k++;
      if (k - j >= PC.LONGE) {
        const bx = col(cases[k]), by = rang(cases[k]);
        const pont = cherche(out[out.length - 1], {
          but: (i) => i === cases[k], pas: (i, t) => cout(t, true), estime: (t) => PC.LONGE_COUT * (Math.abs(col(t) - bx) + Math.abs(rang(t) - by)), max: PC.REPRISE_MAX,
        });
        if (pont) { out.push(...pont.slice(1)); j = k + 1; continue; }
      }
      out.push(cases[j++]);
    }
    return sansBoucle(out);
  };
  const noeuds = hameaux.map((h) => h.case).concat([cadre.SORTIE]).sort((a, b) => angle(a) - angle(b));
  const chemins = [];
  for (let n = 0; noeuds.length > 1 && n < (noeuds.length === 2 ? 1 : noeuds.length); n++) {
    const pas = relier(noeuds[n], noeuds[(n + 1) % noeuds.length]);
    if (!pas) continue;
    for (const i of pas) { surChemin[i] = 1; cheminGros[gros(i)] = 1; }
    chemins.push(pas);
  }

  /* -- les entrées de grotte : au pied de la montagne -- */
  const PG = P.GROTTES, rg = hasard('grottes'), pieds = [];
  const bas = (i) => [prairie, lande, foret].includes(bio(i));
  for (let y = 8; y < H - 8; y += 4) {
    for (let x = 8; x < W - 8; x += 4) {
      const i = y * W + x;
      if (bio(i) !== montagne || distFerme(i) < PG.FERME) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (bas((y + dy * PG.PIED) * W + x + dx * PG.PIED)) { pieds.push(i); break; }
      }
    }
  }
  const grottesCases = [];
  const voulues2 = entre(rg, PG.NOMBRE);
  for (const i of melange(rg, pieds)) {
    if (grottesCases.length >= voulues2) break;
    if (loin(grottesCases, i, PG.ECART)) grottesCases.push(i);
  }
  const grottes = grottesCases.map((i, n) => ({ id: 'grotte_' + (n + 1), case: i }));

  /* -- les coins de pêche : sur les rives d'un lac, d'une rivière, de la mer -- */
  const PP = P.PECHE, rp = hasard('peche'), peche = [];
  const rive = (i, eau) => terre(i) && !auBord(i, 2) && !dansFerme(i) && voisins(i).some((j) => bio(j) === eau);
  const ajoute = (i, eau) => peche.push({ id: 'peche_' + (peche.length + 1), case: i, eau });
  // un par lac
  for (const cs of lacs) {
    const rives = new Set();
    for (const i of cs) for (const j of voisins(i)) if (rive(j, lac)) rives.add(j);
    if (rives.size) ajoute([...rives][Math.floor(rp() * rives.size)], 'lac');
  }
  // un par rivière, dans son cours moyen ou bas
  for (const fl of rivieres) {
    let mis = false;
    for (let essai = 0; essai < 12 && !mis; essai++) {
      const c = fl[Math.floor(fl.length * (0.35 + 0.5 * rp()))];
      for (let dy = -3; dy <= 3 && !mis; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const x = col(c) + dx, y = rang(c) + dy;
          if (x < 0 || y < 0 || x >= W || y >= H || !rive(y * W + x, riviere)) continue;
          ajoute(y * W + x, 'riviere'); mis = true; break;
        }
      }
    }
  }
  // MER sur le rivage (le sable au bord de l'eau), espacés
  const rivages = [];
  for (let y = 6; y < H - 6; y += 4) {
    for (let x = 6; x < W - 6; x += 4) {
      const i = y * W + x;
      if (bio(i) !== plage) continue;
      for (const d of [1, -1, W, -W]) {
        let j = i;
        for (let k = 0; k < 6 && bio(j + d) === plage; k++) j += d;
        if (bio(j + d) === mer && rive(j, mer)) { rivages.push(j); break; }
      }
    }
  }
  const surMer = [];
  for (const i of melange(rp, rivages)) {
    if (surMer.length >= PP.MER) break;
    if (loin(surMer, i, PP.ECART)) surMer.push(i);
  }
  for (const i of surMer) ajoute(i, 'mer');

  return { rivieres, finRivieres, lacs, eaux, chemins, lieux: { hameaux, grottes, peche } };
}

/* ---------- 3. une région ---------- */

// Les biomes de la région « rx,ry » (taille × taille tuiles, bornée au monde) : un Uint8Array,
// rangée par rangée, les eaux des éléments posées sur les champs. (Le sol d'une région,
// monde-sol.js, lit de même les champs et les eaux posées, case par case.)
export function biomesDeRegion(champs, elements, cadre, rx, ry, taille) {
  const W = cadre.LARGEUR, H = cadre.HAUTEUR;
  const x0 = rx * taille, y0 = ry * taille, l = Math.max(0, Math.min(taille, W - x0)), h = Math.max(0, Math.min(taille, H - y0));
  const out = new Uint8Array(l * h), v = [0, 0, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < l; x++) {
      const e = elements.eaux[(y0 + y) * W + x0 + x];
      out[y * l + x] = e !== AUCUNE_EAU ? e : champs.valeurs(x0 + x, y0 + y, v)[2];
    }
  }
  return out;
}

/* ---------- le plan entier ---------- */

// fairePlan(graine, cadre) → { LARGEUR, HAUTEUR, BIOMES (les noms, dans l'ordre des codes), FERME,
// SORTIE, biome (Uint8Array, une valeur par tuile : le code de son biome, les eaux comprises),
// relief, humidite (Uint8Array, de 0 à 255), rivieres, finRivieres, lacs, chemins, lieux } (voir
// elementsDuMonde).
export function fairePlan(graine, cadre) {
  const lire = releve(champsDuMonde(graine, cadre), cadre);
  const el = elementsDuMonde(graine, cadre, lire);
  const t = lire.tout(), N = cadre.LARGEUR * cadre.HAUTEUR;
  const biome = new Uint8Array(N), relief = new Uint8Array(N), humidite = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    biome[i] = el.eaux[i] !== AUCUNE_EAU ? el.eaux[i] : t.biome[i];
    relief[i] = Math.round(t.relief[i] * 255);
    humidite[i] = Math.round(t.humidite[i] * 255);
  }
  return {
    LARGEUR: cadre.LARGEUR, HAUTEUR: cadre.HAUTEUR, BIOMES, FERME: cadre.FERME, SORTIE: cadre.SORTIE,
    biome, relief, humidite,
    rivieres: el.rivieres, finRivieres: el.finRivieres, lacs: el.lacs, chemins: el.chemins, lieux: el.lieux,
  };
}
