/* ---------- le plus court chemin sur une grille (A*) ---------- */

// Le chemin le moins coûteux de la case `depart` à la case `but` d'une grille { cols, rows,
// libre(i), cout(i) } (cases numérotées rangée × cols + colonne, pas de côté seulement) : la
// liste des cases, départ et but compris, ou null. cout(i) : le prix d'un pas vers la case i
// (au moins 1 ; 1 sans lui). Le moteur s'en sert pour tracer les chemins de la ferme générée
// (ferme-generee.js) ; les cartes ont le leur (js/carte/chemins.js).
export function chemin(g, depart, but, opts = {}) {
  const { cols, rows, libre } = g, cout = g.cout || (() => 1);
  const N = cols * rows, max = opts.max || N;
  if (!libre(depart) || !libre(but)) return null;
  const bx = but % cols, by = Math.floor(but / cols);
  const h = (i) => Math.abs((i % cols) - bx) + Math.abs(Math.floor(i / cols) - by);
  const gs = new Float64Array(N).fill(Infinity), de = new Int32Array(N).fill(-1), ferme = new Uint8Array(N);
  // un tas binaire de [f, case]
  const tas = [];
  const pousse = (f, i) => {
    tas.push([f, i]);
    let k = tas.length - 1;
    while (k > 0) { const p = (k - 1) >> 1; if (tas[p][0] <= tas[k][0]) break; [tas[p], tas[k]] = [tas[k], tas[p]]; k = p; }
  };
  const tire = () => {
    const haut = tas[0], bas = tas.pop();
    if (tas.length) {
      tas[0] = bas;
      let k = 0;
      for (;;) {
        const a = 2 * k + 1, b = a + 1;
        let m = k;
        if (a < tas.length && tas[a][0] < tas[m][0]) m = a;
        if (b < tas.length && tas[b][0] < tas[m][0]) m = b;
        if (m === k) break;
        [tas[m], tas[k]] = [tas[k], tas[m]]; k = m;
      }
    }
    return haut;
  };
  gs[depart] = 0;
  pousse(h(depart), depart);
  let vus = 0;
  while (tas.length && vus < max) {
    const [, i] = tire();
    if (ferme[i]) continue;
    if (i === but) {
      const out = [];
      for (let k = i; k >= 0; k = de[k]) out.push(k);
      return out.reverse();
    }
    ferme[i] = 1;
    vus++;
    const c = i % cols;
    for (const j of [c > 0 ? i - 1 : -1, c < cols - 1 ? i + 1 : -1, i - cols, i + cols]) {
      if (j < 0 || j >= N || ferme[j] || !libre(j)) continue;
      const v = gs[i] + Math.max(1, cout(j));
      if (v < gs[j]) { gs[j] = v; de[j] = i; pousse(v + h(j), j); }
    }
  }
  return null;
}
