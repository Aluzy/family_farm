/* carte/chemins.js — le chemin le plus court sur une grille, et la case libre la plus proche
 * (CarteKit.chemin, CarteKit.boite, CarteKit.tendre, CarteKit.plusProche).
 *
 * Toutes les cartes cherchent leurs chemins ici : le personnage de la ferme dehors (cases de
 * 16 px) et dans les intérieurs (grille de 4 px), la famille, la mine. Une seule recherche, A* avec un tas binaire : 8 directions,
 * sans couper un coin (un pas en diagonale demande ses deux cases de côté libres).
 *
 * Le coût d'un pas en diagonale (`diag`) dépend de la carte : 1,414 à la ferme (le chemin le
 * plus court à l'œil), ou 1 : on compte les pas (le chemin le plus court en nombre de cases).
 */
(function (global) {
  'use strict';

  // Le chemin de la case `depart` à la case `but` (numéros de case : rangée × cols + colonne).
  //   g = { cols, rows, libre(i) → la case i se traverse-t-elle ? }
  //   o = { diag (coût d'un pas en diagonale, 1,414 par défaut), max (cases examinées au plus),
  //         boite ({ c0, r0, c1, r1 } : la recherche ne sort pas des colonnes c0 à c1 - 1 ni des
  //         rangées r0 à r1 - 1 ; par défaut toute la grille) }
  // Renvoie les cases du chemin, sans le départ, jusqu'au but compris ([] : on y est déjà), ou
  // null s'il n'y a pas de chemin (dans la boîte). La case de départ n'a pas besoin d'être libre.
  // Le grand monde (644 × 510 cases) ne se parcourt pas en entier pour un trajet : la boîte, autour
  // du départ et du but (CarteKit.boite), borne ce que la recherche regarde et la mémoire qu'elle
  // prend (ses tables ont la taille de la boîte).
  function chemin(g, depart, but, o) {
    const cols = g.cols, rows = g.rows, libre = g.libre;
    const diag = (o && o.diag) || 1.414, max = (o && o.max) || Infinity, b = o && o.boite;
    if (depart === but) return [];
    const bc0 = b ? Math.max(0, b.c0) : 0, br0 = b ? Math.max(0, b.r0) : 0;
    const bc1 = b ? Math.min(cols, b.c1) : cols, br1 = b ? Math.min(rows, b.r1) : rows;
    const bw = bc1 - bc0, bh = br1 - br0;
    const dans = (c, r) => c >= bc0 && r >= br0 && c < bc1 && r < br1;
    const sc = depart % cols, sr = (depart / cols) | 0, gc = but % cols, gr = (but / cols) | 0;
    if (bw <= 0 || bh <= 0 || !dans(sc, sr) || !dans(gc, gr)) return null;
    // (les tables sont à la taille de la boîte : la case locale k = (r - br0) × bw + c - bc0)
    const n = bw * bh;
    const cout = new Float64Array(n).fill(Infinity);
    const from = new Int32Array(n).fill(-1);
    const loc = (c, r) => (r - br0) * bw + c - bc0;
    const h = (c, r) => { const dc = Math.abs(c - gc), dr = Math.abs(r - gr); return Math.max(dc, dr) + (diag - 1) * Math.min(dc, dr); };
    // le tas : [f, case locale], le plus petit f en haut (une case peut y être plusieurs fois : on
    // garde la meilleure, les autres sont passées)
    const heap = [];
    const push = (i, f) => {
      heap.push([f, i]);
      let k = heap.length - 1;
      while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; }
    };
    const pop = () => {
      const top = heap[0], last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let k = 0;
        for (;;) {
          const l = 2 * k + 1, r = l + 1;
          let m = k;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === k) break;
          [heap[m], heap[k]] = [heap[k], heap[m]];
          k = m;
        }
      }
      return top;
    };
    const ok = (c, r) => dans(c, r) && libre(r * cols + c);
    const s0 = loc(sc, sr), g0 = loc(gc, gr);
    cout[s0] = 0;
    push(s0, h(sc, sr));
    let steps = 0;
    while (heap.length && steps++ < max) {
      const [f, i] = pop();
      if (i === g0) break;
      const c = bc0 + (i % bw), r = br0 + ((i / bw) | 0);
      if (f > cout[i] + h(c, r) + 1e-9) continue;          // une entrée dépassée
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dc && !dr) continue;
          const nc = c + dc, nr = r + dr;
          if (!ok(nc, nr)) continue;
          if (dc && dr && (!ok(c + dc, r) || !ok(c, r + dr))) continue;
          const j = loc(nc, nr), ng = cout[i] + (dc && dr ? diag : 1);
          if (ng < cout[j]) { cout[j] = ng; from[j] = i; push(j, ng + h(nc, nr)); }
        }
      }
    }
    if (from[g0] < 0) return null;
    const cells = [];
    for (let i = g0; i !== s0; i = from[i]) cells.push((br0 + ((i / bw) | 0)) * cols + bc0 + (i % bw));
    return cells.reverse();
  }

  // La boîte de recherche d'un trajet de la case (c0, r0) à la case (c1, r1) : les deux, plus
  // `marge` cases tout autour (pour contourner ce qui gêne), bornée à la grille (cols × rows).
  function boite(c0, r0, c1, r1, marge, cols, rows) {
    return {
      c0: Math.max(0, Math.min(c0, c1) - marge), r0: Math.max(0, Math.min(r0, r1) - marge),
      c1: Math.min(cols, Math.max(c0, c1) + marge + 1), r1: Math.min(rows, Math.max(r0, r1) + marge + 1),
    };
  }

  // Le chemin « tendu » : depuis (x0, y0), on va tout droit jusqu'au point le plus loin de
  // `pts` que la ligne droite atteint sans rien heurter (`libre(xa, ya, xb, yb)`), et ainsi de
  // suite. Le personnage ne fait plus de zigzags d'une case à l'autre.
  function tendre(pts, x0, y0, libre) {
    const out = [];
    let ax = x0, ay = y0, k = 0;
    while (k < pts.length) {
      let far = k;
      while (far + 1 < pts.length && libre(ax, ay, pts[far + 1].x, pts[far + 1].y)) far++;
      out.push(pts[far]); ax = pts[far].x; ay = pts[far].y; k = far + 1;
    }
    return out;
  }

  // La place libre la plus proche autour de (0, 0) : anneau par anneau (les places à `r` pas
  // en tous sens, r de `de` à `jusqua`), et dans le premier anneau qui en a une, la plus proche
  // selon `dist(i, j)` (par défaut la distance à vol d'oiseau, en pas ; à égalité, la première
  // trouvée, de haut en bas puis de gauche à droite). `ok(i, j)` : la place décalée de (i, j)
  // est-elle libre ? Renvoie { i, j } ou null.
  function plusProche(ok, jusqua, o) {
    const de = (o && o.de) || 0, dist = (o && o.dist) || ((i, j) => Math.hypot(i, j));
    for (let r = de; r <= jusqua; r++) {
      let best = null, bd = Infinity;
      for (let j = -r; j <= r; j++) {
        for (let i = -r; i <= r; i++) {
          if (Math.max(Math.abs(i), Math.abs(j)) !== r || !ok(i, j)) continue;
          const d = dist(i, j);
          if (d < bd) { bd = d; best = { i, j }; }
        }
      }
      if (best) return best;
    }
    return null;
  }

  global.CarteKit = Object.assign(global.CarteKit || {}, { chemin, boite, tendre, plusProche });
})(window);
