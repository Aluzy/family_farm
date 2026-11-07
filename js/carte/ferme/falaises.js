/* carte/ferme/falaises.js — la scène de la ferme : le flanc des falaises du grand monde (fiche 5c).
 *
 * Une bande de falaise (ou de sommets : des cases « hautes », où l'on ne marche pas) a sa face au
 * sud (js/engine/monde-roches.js : une colonne par case, au bas de la bande ; vegetation.js) ; ses
 * côtés est et ouest n'en avaient pas : un seul trait entre le plateau et le sol d'en bas, et le
 * personnage qui longe le pied du plateau passait par-dessus lui. Ici, pour chaque côté :
 *
 *   - Le flanc : une bande de roche de LARGEUR px le long du bord du plateau, dans le plateau (sa
 *     roche, celle de la face : bleutée sous la neige, brune sous la falaise ; son contour sombre
 *     dehors, son arête claire contre le plateau, le côté est un peu plus sombre), des glaçons ici
 *     et là sous la neige ; la neige (ou la roche claire) sur le haut d'une bande qui commence sous
 *     un coin. Elle s'arrête au rebord de la face du bas : celle-ci ne se recouvre pas.
 *   - Le plateau près du bord : son sol (les cases à côté du flanc) redessiné au-dessus des
 *     personnages qui sont au pied de la falaise, rangé selon le bas de la bande (comme une colonne
 *     de la face) : la tête d'un cheval qui longe le flanc passe derrière le plateau, plus devant.
 *
 * Une image par côté et par colonne de cases (les cases du côté qui se suivent), sur trois cases
 * de large (la case du bord et ses deux voisines : le bord du sol peint ne suit pas la grille) :
 * le sol de ces cases peint comme dans le canevas de la région (sol.js peindreSol), gardé là où le
 * plateau est peint (les couches de son sol, la falaise ou la neige : leur forme seule), le flanc
 * par-dessus. Faites quand la région arrive, refaites quand ses cases se repeignent (une petite
 * pièce prise), retirées avec elle.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T } = F.C;
  // la largeur du flanc (px) ; le haut de l'image d'une face sous le bas de sa case du bas (son pied
  // à 14 px dans la case, 14 px de face par case, le rebord de 6 px : scripts/carte/roches.py, PAROIS
  // de data/monde.json), moins ce que le flanc garde sous ce rebord
  const LARGEUR = 6, FACE = { PIED: 14, CASE: 14, REBORD: 6, SOUS: 2 };
  // la roche du flanc, du contour à l'arête ; la neige
  const ROCHES = {
    neige: [[52, 48, 58], [86, 82, 92], [112, 108, 118], [140, 136, 146], [168, 166, 174]],
    falaise: [[44, 38, 34], [76, 68, 62], [92, 83, 76], [124, 114, 104], [170, 160, 146]],
  };
  const NEIGE = [[236, 241, 248], [208, 218, 232], [180, 194, 214]];
  const HAUTS = ['falaise', 'sommet'];

  // un hasard fixe par pixel
  const hasard = (x, y, k) => {
    let t = Math.imul(x * 374761393 + y * 668265263 + k * 2246822519, 1274126177);
    t ^= t >>> 13;
    return (Math.imul(t, 1103515245) >>> 0) / 4294967296;
  };

  F.partie({

    // Le biome d'une case du monde (son numéro dans ctx.monde.biomes), lu dans sa région, ou -1 si
    // celle-ci n'est pas encore faite (elle est alors demandée).
    biomeMonde(X, Y) {
      const M = this.ctx.monde, N = global.CarteKit.REGION.tuiles;
      if (X < 0 || Y < 0 || X >= this.grid.cols || Y * T >= this.world.h || !N) return -1;
      const reg = M.region(Math.floor(X / N), Math.floor(Y / N));
      if (!reg || !reg.biome) return -1;
      const x = X - reg.cx0, y = Y - reg.cy0;
      return x >= 0 && y >= 0 && x < reg.cl && y < reg.ch ? reg.biome[y * reg.cl + x] : -1;
    },

    // Les côtés des bandes hautes de la région `r` (dès que son sol est fait) : r.falaises, un côté par
    // colonne { X, Y0, Y1 (les cases du flanc, Y1 exclue), est (le plateau à l'ouest), rive (la sorte
    // de roche), image } ; leurs images faites.
    falaisesRegion(r) {
      if (r.falaises || !this.ctx.monde) return;
      const M = this.ctx.monde, reg = M.region(r.rx, r.ry);
      if (!reg || !reg.biome) return;
      const hauts = new Set(HAUTS.map((n) => M.biomes.indexOf(n)));
      // (une case voisine pas encore faite : comptée haute, pas de flanc là en attendant)
      const haut = (X, Y) => { const b = this.biomeMonde(X, Y); return b < 0 || hauts.has(b); };
      const ici = (X, Y) => X >= reg.cx0 && Y >= reg.cy0 && X < reg.cx0 + reg.cl && Y < reg.cy0 + reg.ch && hauts.has(reg.biome[(Y - reg.cy0) * reg.cl + X - reg.cx0]);
      const out = [];
      for (let X = reg.cx0; X < reg.cx0 + reg.cl; X++) {
        for (const est of [true, false]) {
          const dx = est ? 1 : -1;
          let seg = null;
          for (let Y = reg.cy0; Y <= reg.cy0 + reg.ch; Y++) {
            const cote = Y < reg.cy0 + reg.ch && ici(X, Y) && haut(X, Y + 1) && haut(X - dx, Y) && this.biomeMonde(X + dx, Y) >= 0 && !haut(X + dx, Y);
            if (cote && !seg) seg = { X, Y0: Y, Y1: Y + 1, est };
            else if (cote) seg.Y1 = Y + 1;
            else if (seg) { out.push(seg); seg = null; }
          }
        }
      }
      // le bas de chaque bande, la hauteur de sa face, le début du flanc sous un coin
      for (const s of out) {
        let Yb = s.Y1;
        while (haut(s.X, Yb + 1) && Yb - s.Y1 < 64) Yb++;
        let n = 1;
        while (n < 3 && haut(s.X, Yb - n)) n++;
        s.Yb = Yb;
        s.haut = Yb * T + FACE.PIED - FACE.CASE * n - FACE.REBORD + FACE.SOUS;
        const dx = s.est ? 1 : -1;
        s.debut = !(haut(s.X, s.Y0 - 1) && haut(s.X - dx, s.Y0 - 1) && !haut(s.X + dx, s.Y0 - 1));
        s.roche = this.biomeMonde(s.X, s.Y0) === M.biomes.indexOf('sommet') ? 'neige' : 'falaise';
      }
      r.falaises = out.filter((s) => s.Y0 * T < s.haut);
      for (const s of r.falaises) this.flancFait(r, reg, s);
    },

    // L'image d'un côté : le plateau près du bord (son sol peint, sa forme d'après les couches de son
    // sol) et le flanc.
    flancFait(r, reg, s) {
      if (s.image) { s.image.destroy(); this.textures.remove(s.cle); s.image = null; }
      const W2 = 3 * T, x0 = (s.X - 1) * T, y0 = s.Y0 * T, H = Math.min(s.Y1 * T, s.haut) - y0;
      if (H <= 0) return;
      const doc = global.document, W = this.grid.cols;
      const cases = [];
      for (let Y = s.Y0; Y * T < y0 + H; Y++) for (let X = s.X - 1; X <= s.X + 1; X++) cases.push(Y * W + X);
      // le sol peint de ces cases, et la forme du plateau (les couches de la falaise ou de la neige)
      const sol = doc.createElement('canvas');
      sol.width = W2; sol.height = H;
      const cs = sol.getContext('2d', { willReadFrequently: true });
      this.peindreSol(r, cs, x0, y0, cases, true);
      const forme = doc.createElement('canvas');
      forme.width = W2; forme.height = H;
      const cf = forme.getContext('2d', { willReadFrequently: true });
      if (!this.formePlateau(cf, reg, cases, x0, y0)) return;
      const S = cs.getImageData(0, 0, W2, H).data, A = cf.getImageData(0, 0, W2, H).data;
      const im = cs.createImageData(W2, H), D = im.data;
      const ROC = ROCHES[s.roche], neige = s.roche === 'neige';
      // (k : depuis le plateau ; l'est, le plateau à gauche)
      const q = (k, y) => (y * W2 + (s.est ? k : W2 - 1 - k)) * 4;
      const set = (k, y, c) => { const p = q(k, y); D[p] = c[0]; D[p + 1] = c[1]; D[p + 2] = c[2]; D[p + 3] = 255; };
      for (let y = 0; y < H; y++) {
        const yg = y0 + y;
        let e = 0;
        while (e < W2 && A[q(e, y) + 3] > 127) e++;
        if (e === 0 || e >= W2) continue;
        for (let k = 0; k < e; k++) { const p = q(k, y); set(k, y, [S[p], S[p + 1], S[p + 2]]); }
        const w = Math.min(LARGEUR, e);
        for (let j = 0; j < w; j++) {
          const k = e - 1 - j, xg = x0 + (s.est ? k : W2 - 1 - k);
          let t = j === 0 ? 0 : j === 1 ? 1 : j === w - 1 ? 4 : 2 + (hasard(xg, Math.floor(yg / 3), 1) < 0.25 ? 1 : 0) - (hasard(xg, yg, 2) < 0.12 ? 1 : 0);
          if (s.est && j >= 3) t = Math.max(0, t - 1);
          let c = ROC[t];
          // (le haut d'une bande qui commence sous un coin : la neige, ou la roche claire)
          if (s.debut && y < 2) c = neige ? (y === 0 || j === w - 1 ? NEIGE[0] : NEIGE[1]) : ROC[y === 0 ? 4 : 3];
          set(k, y, c);
        }
        // (des glaçons qui pendent sous la neige, ici et là)
        if (neige && w > 2 && hasard(x0, yg, 3) < 0.15) set(e - w + 1, y, NEIGE[2]);
      }
      cs.putImageData(im, 0, 0);
      this.flancsN = (this.flancsN || 0) + 1;
      s.cle = 'flanc_' + this.flancsN;
      this.textures.addCanvas(s.cle, sol);
      // (rangée selon le bas de la bande : devant qui est au pied de son flanc, derrière qui est au sud)
      s.image = this.add.image(x0, y0, s.cle).setOrigin(0).setDepth((s.Yb + 1) * T - 1);
    },

    // La forme du plateau sur ces cases : les tuiles de leurs couches de falaise ou de neige (les
    // sols les plus hauts de assets/sols_monde.png), dessinées dans `ctx` (coin en x0, y0). → false
    // si la planche n'est pas là.
    formePlateau(ctx, reg, cases, x0, y0) {
      const M = this.ctx.monde, S = M.tuiles, D = S.DECALAGE, K = S.COUCHES, W = this.grid.cols;
      if (!this.has('sols_monde')) return false;
      const img = this.textures.get('sols_monde').getSourceImage();
      // (une tuile de la planche des sols : son sol, d'après sa rangée ; RS rangées par sol)
      const RS = 1 + S.BORDS + S.RIVES, bas = S.sols.indexOf('falaise'), NS = S.sols.length;
      for (const i of cases) {
        const X = i % W, Y = (i / W) | 0, x = X - reg.x0, y = Y - reg.y0;
        if (x < 0 || y < 0 || x >= reg.l || y >= reg.h) continue;
        const o = (y * reg.l + x) * K;
        for (let k = 0; k < K; k++) {
          const v = reg.couches[o + k];
          if (!v) break;
          if (v < D) continue;
          const n = v - D, sol = Math.floor(n / 16 / RS);
          if (sol < bas || sol >= NS) continue;
          ctx.drawImage(img, (n % S.colonnes) * T, ((n / S.colonnes) | 0) * T, T, T, X * T - x0, Y * T - y0, T, T);
        }
      }
      return true;
    },

    // Des cases de la région repeintes (une petite pièce prise) : les côtés qui les touchent, refaits.
    falaisesRepeintes(r, cases) {
      if (!r.falaises || !r.falaises.length) return;
      const reg = this.ctx.monde.region(r.rx, r.ry), W = this.grid.cols;
      if (!reg) return;
      for (const s of r.falaises) {
        if (cases.some((i) => { const X = i % W, Y = (i / W) | 0; return X >= s.X - 1 && X <= s.X + 1 && Y >= s.Y0 && Y < s.Y1; })) this.flancFait(r, reg, s);
      }
    },

    // La région s'en va : ses côtés avec elle.
    dropFalaises(r) {
      for (const s of r.falaises || []) if (s.image) { s.image.destroy(); this.textures.remove(s.cle); }
      r.falaises = null;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
