/* carte/ferme/bassins.js — la scène de la ferme : les bassins (le lot 3 des évolutions du crafting).
 *
 * Un bassin est fait de cases (le bloc « bassin », data/recipes.json) : celles qui se touchent par un côté forment
 * un seul bassin. Chacun est peint dans une image à lui (peindreBassin) : la margelle de pierre taillée tout
 * autour (BASSIN.larg px, à angles vifs : la distance de Tchebychev, rien d'arrondi ; des dalles biseautées, une
 * dalle entière à chaque coin), sa face au sud et le contour sombre des blocs, la paroi de pierre sous la margelle
 * du nord, l'eau (les couleurs de l'eau de la carte : claire au bord, plus sombre au large) et ses nénuphars,
 * posés tout seuls (un tirage par case, d'après sa place : ils ne bougent pas d'une partie à l'autre).
 *
 * Son eau est l'eau vivante de la carte (js/carte/eau.js, par js/carte/ferme/eau.js eauEtendues) : le même
 * shader, les mêmes vaguelettes, scintillements, reflets et ombres que les étangs ; la margelle et les nénuphars
 * (ni bleus ni blancs) y sont la rive, qui ne bouge pas (pas de berge de terre : `bassin`). Sans WebGL, ou si le
 * joueur a demandé moins d'animations : l'image seule.
 *
 * Le bloc lui-même ne se dessine pas (BLOCS_CARTE.ailleurs) ; il ferme le passage (BLOCS_CARTE.bloquent).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T } = F.C;
  const BASSIN = {
    larg: 4,                                   // la margelle, en px
    face: 2,                                   // sa face au sud, en px (sous elle, le contour)
    paroi: 2,                                  // la paroi de pierre sous la margelle du nord, dans l'eau
    // la pierre (scripts/carte/blocs.py PIERRE : le joint, puis cinq tons) et le contour des blocs
    pierre: [[72, 64, 52], [100, 92, 78], [125, 116, 99], [150, 140, 120], [173, 163, 143], [196, 186, 166]],
    contour: [36, 30, 20],
    // l'eau de la carte (assets/eau.png) : du bord au large ; ses points clairs
    eau: [[76, 172, 214], [76, 172, 214], [68, 162, 208], [60, 146, 200], [46, 120, 184], [40, 104, 178], [34, 96, 170]],
    point: [133, 199, 227],
    // les nénuphars : une chance sur `chance` par case ; leurs verts, leur fleur
    chance: 2,
    vert: [[30, 78, 40], [52, 104, 48], [88, 150, 64], [146, 196, 92]],
    fleur: [[250, 230, 240], [246, 170, 200], [255, 236, 170], [226, 130, 170], [250, 200, 220], [250, 214, 228]],
  };
  F.BASSIN = BASSIN;

  const hache = (...a) => {
    let h = 2166136261;
    for (const v of a) h = Math.imul(h ^ (v >>> 0), 16777619) >>> 0;
    return h;
  };

  F.partie({

    // Les bassins du modèle (ses blocs « bassin ») : une image par bassin (un groupe de cases qui se touchent),
    // refaite quand ses cases changent. this.bassinsAreas : les étendues d'eau (eau.js), une liste neuve à chaque
    // changement.
    syncBassins(blocs) {
      const cols = this.grid.cols;
      const cases = new Set((blocs || []).filter((b) => b.sorte === 'bassin').map((b) => b.case));
      const cle = [...cases].sort((a, b) => a - b).join(',');
      if (cle === (this.bassinsCle || '')) return;
      this.bassinsCle = cle;
      // les groupes : les cases qui se touchent par un côté
      const vu = new Set(), groupes = [];
      for (const c0 of cases) {
        if (vu.has(c0)) continue;
        const g = [c0];
        vu.add(c0);
        for (let i = 0; i < g.length; i++) {
          const c = g[i], x = c % cols;
          for (const n of [x > 0 ? c - 1 : -1, x < cols - 1 ? c + 1 : -1, c - cols, c + cols]) if (n >= 0 && cases.has(n) && !vu.has(n)) { vu.add(n); g.push(n); }
        }
        groupes.push(g.sort((a, b) => a - b));
      }
      const avant = new Map((this.bassinsAreas || []).map((a) => [a.cle, a]));
      const liste = [];
      for (const g of groupes) {
        const k = g.join(',');
        if (avant.has(k)) { liste.push(avant.get(k)); avant.delete(k); continue; }
        liste.push(this.bassinFait(g));
      }
      for (const a of avant.values()) this.bassinDefait(a);
      this.bassinsAreas = liste;
    },

    bassinFait(g) {
      const cols = this.grid.cols, B = BASSIN;
      const cs = g.map((c) => c % cols), rs = g.map((c) => Math.floor(c / cols));
      const c0 = Math.min(...cs), c1 = Math.max(...cs), r0 = Math.min(...rs), r1 = Math.max(...rs);
      this.bassinsN = (this.bassinsN || 0) + 1;
      const key = 'bassin_' + this.bassinsN;
      const w = (c1 - c0 + 1) * T, h = (r1 - r0 + 1) * T + B.face + 1;
      const tex = this.textures.createCanvas(key, w, h);
      const sprite = this.add.image(c0 * T, r0 * T, key).setOrigin(0).setDepth(0.1);
      const a = { cle: g.join(','), cells: new Set(g), x: c0 * T, y: r0 * T, tex, sprite, bassin: true };
      this.peindreBassin(a);
      return a;
    },

    bassinDefait(a) {
      // (son eau vivante d'abord : son shader lit la texture du bassin, qui s'en va ; eau-monde.js eauBlocOff)
      const v = this.eauVive ? this.eauVive.find((e) => e.a === a) : null;
      if (v) { this.eauDefait(v); this.eauVive = this.eauVive.filter((e) => e !== v); }
      if (a.sprite) a.sprite.destroy();
      if (a.tex) this.textures.remove(a.tex.key);
      a.tex = a.sprite = null;
    },

    // L'image d'un bassin (voir l'en-tête).
    peindreBassin(a) {
      if (!a.tex) return;
      const B = BASSIN, P = B.pierre, L = B.larg, cols = this.grid.cols;
      const w = a.tex.width, h = a.tex.height, x0 = a.x, y0 = a.y;
      // (dedans : une case du bassin ; en px de l'image)
      const dedans = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a.cells.has(Math.floor((y0 + y) / T) * cols + Math.floor((x0 + x) / T));
      // la distance (de Tchebychev) au dehors : deux passes
      const n = w * h, D = new Float32Array(n);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) D[y * w + x] = dedans(x, y) ? 1e6 : 0;
      const passe = (x, y, voisins) => {
        const p = y * w + x;
        if (!D[p]) return;
        for (const [dx, dy] of voisins) {
          const xx = x + dx, yy = y + dy;
          const d = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : D[yy * w + xx];
          if (d + 1 < D[p]) D[p] = d + 1;
        }
      };
      const AV = [[-1, 0], [-1, -1], [0, -1], [1, -1]], AR = [[1, 0], [1, 1], [0, 1], [-1, 1]];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) passe(x, y, AV);
      for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) passe(x, y, AR);
      const bord = (x, y) => dedans(x, y) && D[y * w + x] <= L;
      const eau = (x, y) => dedans(x, y) && D[y * w + x] > L;
      const ctx = a.tex.getContext(), im = ctx.createImageData(w, h), d = im.data;
      const put = (x, y, c) => { const o = (y * w + x) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; };
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!dedans(x, y)) continue;
          const k = D[y * w + x], X = x0 + x, Y = y0 + y;
          if (k <= L) {
            // la margelle : des dalles le long du bord, une dalle entière à chaque coin
            const hz = !dedans(x, y - L - 1) || !dedans(x, y + L + 1), vt = !dedans(x - L - 1, y) || !dedans(x + L + 1, y);
            let c;
            if (hz && vt) {
              const i = Math.min(X % T, T - 1 - (X % T)), j = Math.min(Y % T, T - 1 - (Y % T));
              c = P[4];
              if (i === 0 || j === 0) c = (X % T < T / 2 && i === 0) || (Y % T < T / 2 && j === 0) ? P[5] : P[2];
              if (i === L - 1 || j === L - 1) c = P[2];
            } else {
              const u = hz ? X : Y, l = 8, i = (u + (hz ? 3 : 5)) % l;
              c = i === 0 ? P[0] : k === 1 || i === 1 ? P[5] : k === L || i === l - 1 ? P[2] : Math.floor((u + 3) / l) % 3 ? P[4] : P[3];
            }
            put(x, y, c);
            continue;
          }
          // la paroi de pierre, sous la margelle du nord
          if (bord(x, y - 1)) { put(x, y, P[2]); continue; }
          if (B.paroi > 1 && bord(x, y - 2)) { put(x, y, P[1]); continue; }
          // l'eau : claire au bord, plus sombre au large ; quelques points clairs
          const e = B.eau[Math.min(B.eau.length - 1, Math.floor(k - L - 1 - B.paroi))] || B.eau[0];
          put(x, y, hache(X, Y, 7) % 53 === 0 && k - L > 2 ? B.point : e);
        }
      }
      // sa face au sud et le contour sombre (au sud, sous la face)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (dedans(x, y)) continue;
          if (dedans(x, y - 1)) { put(x, y, P[1]); continue; }
          if (B.face > 1 && dedans(x, y - 2)) { put(x, y, P[0]); continue; }
          if (dedans(x, y - B.face - 1)) { put(x, y, B.contour); continue; }
          const a8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(([dx, dy]) => dedans(x + dx, y + dy));
          if (a8 && !dedans(x, y - 2) && !dedans(x, y - 3)) put(x, y, B.contour);
        }
      }
      // les nénuphars, posés tout seuls : une chance par case ; un grand s'il tient dans l'eau, sinon un petit
      for (const c of [...a.cells].sort((p, q) => p - q)) {
        const cx0 = (c % cols) * T, cy0 = Math.floor(c / cols) * T, hh = hache(c % cols, Math.floor(c / cols), 11);
        if (hh % B.chance) continue;
        const fleur = (hh >> 11) % 3 !== 0;
        for (const grand of [true, false]) {
          const rx = grand ? 4 : 2, ry = grand ? 3 : 1;
          const cx = cx0 + 4 + ((hh >> 3) % 8) - x0, cy = cy0 + 5 + ((hh >> 7) % 7) - y0;
          const pad = [];
          for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) {
            const e = (dx * dx) / (rx * rx + 1) + (dy * dy) / (ry * ry + 1);
            if (e <= 1 && !(dy === 0 && dx > 0)) pad.push([dx, dy, e]);
          }
          if (!pad.every(([dx, dy]) => eau(cx + dx, cy + dy) && D[(cy + dy) * w + cx + dx] > L + 1)) continue;
          for (const [dx, dy, e] of pad) put(cx + dx, cy + dy, e > 0.72 ? B.vert[0] : dy < 0 && dx < 0 ? B.vert[3] : dy < 1 ? B.vert[2] : B.vert[1]);
          if (fleur && grand) {
            const Fl = B.fleur;
            for (const [dx, dy, k] of [[0, -2, 0], [-1, -1, 1], [1, -1, 1], [0, -1, 2], [-2, 0, 3], [2, 0, 3], [-1, 0, 4], [1, 0, 4], [0, 0, 5]]) put(cx + dx, cy + dy, Fl[k]);
          } else if (fleur) put(cx, cy - 1, B.fleur[1]);
          break;
        }
      }
      ctx.putImageData(im, 0, 0);
      a.tex.refresh();
      // (l'eau vivante : la rive, qui ne bouge pas, js/carte/eau.js)
      const v = this.eauVive && this.eauVive.find((e) => e.a === a);
      if (v) this.eauRive(v);
    },
  });
})(window);
