import { DATA } from './catalog.js';
import { BIOME } from './monde-gen.js';

/* ---------- les lieux du grand monde qui ont leur dessin (docs/grand-monde.md : fiche 6b) ----------

   Les coins de pêche du plan (monde-gen.js, lieux.peche : une case chacun) ont leur dessin dans le monde, posé
   région par région avec la végétation et les rochers (monde-sol.js, solDeRegion : dans le Web Worker sur le site),
   du plan seul (pas de hasard). Les réglages : data/monde.json (LIEUX) ; les dessins : scripts/carte/lieux.py
   (assets/lieux_monde.png, lieux_monde.json). (Les entrées de grotte, lieux.grottes, ne sont plus dessinées : la
   mine et les grottes de la montagne ne sont plus, docs/gisements.md ; leur place reste dans le plan.)

     - Un coin de pêche (la case de la rive, au bord de son eau) : un ponton qui avance de PONTON
       cases sur un lac ou la mer, droit depuis la rive, si l'eau est là assez loin (et continue
       au-delà, pour y lancer) ; ses cases s'ouvrent à la marche (on va pêcher au bout). Sinon (une
       rivière, une eau trop étroite) : des piquets, une nasse et un filet sur la rive, à côté de la
       case (ils ne ferment rien).

     - Les lieux du récit (lieux.recit : l'observatoire de Maurice (la « cabane »), l'atelier de Frida, l'épave ; docs/recit/) :
       leur dessin posé sur leur case, leurs cases `bloque` fermées (data/monde.json, LIEUX.SORTES).
     - Les secrets du monde (D-2, lieux.secrets : la ruine, le cairn, l'arbre ancien, le belvédère, la pierre levée) :
       posés comme les lieux du récit (la ruine de la forêt : sa variante moussue) ; les toucher : secrets.js.
     - La cale du bac aux Mouettes (lieux.recit, sorte « cale », son sens : monde-gen.js calePossible) :
       posée comme un ponton, le pied au bord de la case de la rive ; ses LIEUX.CALE cases s'ouvrent à la
       marche (on va au bout, voir le bac).

   Une image appartient à la région de la case de son lieu ; un ponton à cheval sur deux régions
   ouvre ses cases dans chacune (le même calcul, du plan seul). */

export const LIEUX = DATA.LIEUX;
export const SORTES_LIEUX = LIEUX.SORTES;
export const SORTE_LIEU = Object.fromEntries(SORTES_LIEUX.map((s, k) => [s.nom, k]));
const EAUX = { lac: BIOME.lac, riviere: BIOME.riviere, mer: BIOME.mer };
// les quatre sens d'un ponton, dans l'ordre de ses variantes : nord, sud, ouest, est
const SENS = [[0, -1], [0, 1], [-1, 0], [1, 0]];

// Le ponton du coin de pêche `p` ({ case, eau }) : { sens (0 à 3), cases (celles qu'il couvre, de la
// rive vers le large) }, ou null (des piquets). `biome(i)` : le biome de la case i (eaux comprises).
export function pontonDe(p, biome, W, H) {
  if (p.eau === 'riviere') return null;
  const eau = EAUX[p.eau], c = p.case % W, r = Math.floor(p.case / W), L = LIEUX.PONTON;
  let best = null;
  SENS.forEach(([dx, dy], sens) => {
    if (best) return;
    const cases = [];
    for (let k = 1; k <= L + 1; k++) {
      const x = c + dx * k, y = r + dy * k;
      if (x < 0 || y < 0 || x >= W || y >= H || biome(y * W + x) !== eau) return;
      if (k <= L) cases.push(y * W + x);
    }
    // (de l'eau aussi de part et d'autre du bout : il avance dans l'eau, pas le long d'une rive)
    const bx = c + dx * L, by = r + dy * L;
    for (const [ex, ey] of [[dy, dx], [-dy, -dx]]) if (biome((by + ey) * W + bx + ex) !== eau) return;
    best = { sens, cases };
  });
  return best;
}

// Les piquets d'un coin sans ponton : sur une case de terre voisine de la rive, de côté par rapport
// à l'eau (sinon la case du coin elle-même). → la case.
function placePiquets(p, biome, marche, W) {
  const c = p.case % W, r = Math.floor(p.case / W), eau = EAUX[p.eau];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const j = (r + dy) * W + c + dx;
    if (biome(j) === eau || !marche(j)) continue;
    // (pas du côté de l'eau, ni juste derrière la rive)
    if (biome(p.case - dx - dy * W) === eau) continue;
    return j;
  }
  return p.case;
}

// lieuxDeRegion(ctx, g) → { images: Int32Array ([sorte, x, y, variante] : le pied en px), basses
// (vide) } ; ouvre dans g.marche les cases d'un ponton, ferme celles d'un lieu dessiné.
// `g` : la région (solDeRegion : cx0, cy0, cl, ch, marche, biomeDe).
export function lieuxDeRegion(ctx, g) {
  const el = ctx.elements, W = ctx.cadre.LARGEUR, H = ctx.cadre.HAUTEUR, T = 16;
  const { cx0, cy0, cl, ch, marche } = g;
  const dans = (X, Y) => X >= cx0 && Y >= cy0 && X < cx0 + cl && Y < cy0 + ch;
  const pose = (X, Y, v) => { if (dans(X, Y)) marche[(Y - cy0) * cl + X - cx0] = v; };
  const images = [];
  const lieux = (el && el.lieux) || { grottes: [], peche: [], recit: [], secrets: [] };
  // (les entrées de grotte ne sont plus dessinées : la mine et les grottes de la montagne ne sont plus,
  // docs/gisements.md, lot 4 ; lieux.grottes ne garde que leur place, qui écarte les autres lieux)
  const biome = (i) => g.biomeDe(i), libre = (i) => !g.biomeDe || ![BIOME.mer, BIOME.lac, BIOME.riviere, BIOME.falaise, BIOME.sommet].includes(g.biomeDe(i));
  for (const p of lieux.peche || []) {
    const X = p.case % W, Y = Math.floor(p.case / W);
    if (X < cx0 - 5 || Y < cy0 - 5 || X > cx0 + cl + 4 || Y > cy0 + ch + 4) continue;
    const pt = pontonDe(p, biome, W, H);
    if (pt) {
      for (const i of pt.cases) pose(i % W, Math.floor(i / W), 1);
      if (!dans(X, Y)) continue;
      const [x, y] = [[X * T + T / 2, Y * T], [X * T + T / 2, (Y + 1) * T], [X * T, Y * T + T / 2], [(X + 1) * T, Y * T + T / 2]][pt.sens];
      images.push(SORTE_LIEU.ponton, x, y, pt.sens);
    } else if (dans(X, Y)) {
      const j = placePiquets(p, biome, libre, W);
      images.push(SORTE_LIEU.piquets, (j % W) * T + T / 2, Math.floor(j / W) * T + 9, (X + Y) % 2);
    }
  }
  // les lieux du récit (l'observatoire de Maurice (la « cabane »), l'atelier de Frida, l'épave) : leur dessin sur leur case,
  // leurs cases fermées (bloque, data/monde.json)
  // (D-2 : les secrets du monde, posés de même : js/engine/secrets.js)
  for (const l of [...(lieux.recit || []), ...(lieux.secrets || [])]) {
    const S = SORTES_LIEUX[SORTE_LIEU[l.sorte]];
    if (!S) continue;
    const X = l.case % W, Y = Math.floor(l.case / W);
    if (S.genre === 'ponton') {
      // (la cale du bac : sa jetée ouverte à la marche, son dessin au bord de la rive, comme un ponton)
      if (X < cx0 - 8 || Y < cy0 - 8 || X > cx0 + cl + 7 || Y > cy0 + ch + 7) continue;
      const [dx, dy] = SENS[l.sens] || SENS[0];
      for (let k = 1; k <= LIEUX.CALE; k++) pose(X + dx * k, Y + dy * k, 1);
      if (dans(X, Y)) {
        const [x, y] = [[X * T + T / 2, Y * T], [X * T + T / 2, (Y + 1) * T], [X * T, Y * T + T / 2], [(X + 1) * T, Y * T + T / 2]][l.sens] || [X * T + T / 2, Y * T];
        images.push(SORTE_LIEU[l.sorte], x, y, l.sens || 0);
      }
      continue;
    }
    if (X < cx0 - 3 || Y < cy0 - 3 || X > cx0 + cl + 3 || Y > cy0 + ch + 3) continue;
    for (const [dx, dy] of S.bloque || []) pose(X + dx, Y + dy, 0);
    // (une ruine en forêt : la variante moussue)
    const v = S.variantes > 1 && g.biomeDe && g.biomeDe(l.case) === BIOME.foret ? 1 : 0;
    if (dans(X, Y)) images.push(SORTE_LIEU[l.sorte], X * T + T / 2, Y * T + T - 2, v);
  }
  return { images: Int32Array.from(images), basses: new Int32Array(0) };
}
