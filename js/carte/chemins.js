/* carte/chemins.js — le chemin le plus court sur une grille, et la case libre la plus proche
 * (CarteKit.chemin, CarteKit.tendre, CarteKit.plusProche).
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
  //   o = { diag (coût d'un pas en diagonale, 1,414 par défaut), max (cases examinées au plus) }
  // Renvoie les cases du chemin, sans le départ, jusqu'au but compris ([] : on y est déjà), ou
  // null s'il n'y a pas de chemin. La case de départ n'a pas besoin d'être libre.
  function chemin(g, depart, but, o) {
    const cols = g.cols, rows = g.rows, libre = g.libre;
    const diag = (o && o.diag) || 1.414, max = (o && o.max) || Infinity;
    if (depart === but) return [];
    const n = cols * rows;
    const cout = new Float64Array(n).fill(Infinity);
    const from = new Int32Array(n).fill(-1);
    const gc = but % cols, gr = (but / cols) | 0;
    const h = (i) => { const dc = Math.abs((i % cols) - gc), dr = Math.abs(((i / cols) | 0) - gr); return Math.max(dc, dr) + (diag - 1) * Math.min(dc, dr); };
    // le tas : [f, case], le plus petit f en haut (une case peut y être plusieurs fois : on
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
    const ok = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows && libre(r * cols + c);
    cout[depart] = 0;
    push(depart, h(depart));
    let steps = 0;
    while (heap.length && steps++ < max) {
      const [f, i] = pop();
      if (i === but) break;
      if (f > cout[i] + h(i) + 1e-9) continue;          // une entrée dépassée
      const c = i % cols, r = (i / cols) | 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dc && !dr) continue;
          const nc = c + dc, nr = r + dr;
          if (!ok(nc, nr)) continue;
          if (dc && dr && (!ok(c + dc, r) || !ok(c, r + dr))) continue;
          const j = nr * cols + nc, ng = cout[i] + (dc && dr ? diag : 1);
          if (ng < cout[j]) { cout[j] = ng; from[j] = i; push(j, ng + h(j)); }
        }
      }
    }
    if (from[but] < 0) return null;
    const cells = [];
    for (let i = but; i !== depart; i = from[i]) cells.push(i);
    return cells.reverse();
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

  global.CarteKit = Object.assign(global.CarteKit || {}, { chemin, tendre, plusProche });
})(window);
