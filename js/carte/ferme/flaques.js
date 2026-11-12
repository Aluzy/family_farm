/* carte/ferme/flaques.js — la scène de la ferme : le sol mouillé et les flaques sous la pluie (G-1,
 * meteo.js).
 *
 *   - Le sol mouillé : dès que la pluie tombe, le sol fonce un peu (un voile sombre sur le sol seul, sous les
 *     planchers, l'eau et tout ce qui a un pied : PROFONDEUR_SOL) ; il sèche quand elle s'arrête.
 *   - Les flaques : après ATTENTE s de pluie, elles se forment (MONTE s) sur la terre et les chemins (le sol
 *     peint brun : ni l'herbe, ni la lande, ni l'eau), loin de leurs bords (la case, ses huit voisines et les
 *     deux d'après, à gauche et à droite, sont brunes : jamais le long de la bordure chemin-herbe), sur une case où l'on marche (pas sous un buisson, un
 *     rocher), ni sur un plancher, ni sous un toit, ni sur la terre labourée ; elles sèchent après la pluie
 *     (SECHE s). Elles sont éparses : la flaque d'une case est la sienne si son tirage (fixe, d'après la
 *     case) est le plus fort des cases possibles à moins de ECART cases, et de celles de sa rangée et de sa
 *     colonne à moins de LIGNE cases : jamais deux à moins de 5 cases, ni deux alignées de près. Leurs
 *     tailles varient (RX, RY) ; chacune a sa forme (deux ou trois ovales mêlés), l'eau grise du ciel, un
 *     bord sombre en haut, clair en bas, le sol mouillé autour.
 *   - Les ronds de pluie : dans chaque flaque, des cercles qui s'élargissent et s'effacent, tant qu'il pleut
 *     (coupés avec « animations réduites »).
 *
 * Seules les cases près de la vue sont regardées : leur sol est lu d'un coup (un pixel par case), quand la vue
 * a bougé de PAS cases (un pixel par case, au milieu : solDesCases) ; une image par flaque (sa forme dessinée
 * une fois, IMAGES au plus par image du jeu).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T } = F.C;
  const { reducedMotion } = F;

  const FLAQUES = {
    ATTENTE: 10, MONTE: 20, SECHE: 90, MOUILLE_MONTE: 6, MOUILLE_SECHE: 60,
    ECART: 5, LIGNE: 10, RX: [3, 11], RY: [2, 5], PAS: 4, IMAGES: 2,
    MOUILLE: { couleur: 0x1e140a, alpha: 0.2 }, PROFONDEUR_SOL: 0.04, PROFONDEUR: 0.55,
    // l'eau (rgba) : le bord haut, le bord bas, le reflet, le fond ; le liseré du sol mouillé
    EAU: { haut: [46, 58, 74, 0.72], bas: [214, 226, 238, 0.72], reflet: [200, 216, 232, 0.7], fond: [118, 144, 170, 0.7], lisere: [30, 22, 14, 0.32] },
    RONDS: { n: 2, vie: 0.7, rayon: 4, couleur: 0xe2ecf6, alpha: 0.75 },
  };

  // un tirage fixe par case (bien mêlé : deux cases voisines n'ont pas des tirages proches)
  const hasard = (x, y, k) => {
    let h = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(k + 1, 83492791);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  // La forme d'une flaque (case X, Y) : ses ovales [dx, dy, rx, ry] autour de son milieu.
  function forme(X, Y) {
    const rx = FLAQUES.RX[0] + Math.floor(hasard(X, Y, 5) * (FLAQUES.RX[1] - FLAQUES.RX[0] + 1));
    const ry = FLAQUES.RY[0] + Math.floor(hasard(X, Y, 6) * (FLAQUES.RY[1] - FLAQUES.RY[0] + 1));
    const ov = [[0, 0, rx, ry], [Math.round((hasard(X, Y, 1) - 0.5) * rx), Math.round((hasard(X, Y, 2) - 0.5) * ry), Math.max(2, Math.round(rx * 0.7)), Math.max(1, Math.round(ry * 0.8))]];
    if (rx >= 5) ov.push([Math.round((hasard(X, Y, 3) - 0.5) * rx * 1.4), Math.round((hasard(X, Y, 4) - 0.3) * ry), Math.max(2, Math.round(rx * 0.55)), Math.max(1, Math.round(ry * 0.6))]);
    return { rx, ry, ov, dedans: (x, y) => ov.some(([ox, oy, a, b]) => ((x - ox) / a) ** 2 + ((y - oy) / b) ** 2 <= 1) };
  }

  F.partie({

    // Le sol mouillé des étendues d'eau animées (les étangs de la ferme, les blocs d'eau du monde : sol.js, eau-monde.js).
    // Leur image (ou leur eau vivante) est au-dessus du voile du sol mouillé ; elle porte aussi le sable, les
    // galets ou l'herbe de leur rive, qui restaient clairs sous la pluie. Chacune près de la vue reçoit un voile
    // sur ses pixels de terre seulement (l'eau, elle, ne fonce pas) : fait une fois par étendue (sa terre : la rive
    // de l'eau vivante, eau.js eauRive, ou à défaut ce qui n'est pas une eau franchement bleue ou blanc bleuté),
    // au-dessus d'elle.
    mouilleRives(alpha, v) {
      const faits = this.mouilleFaits || (this.mouilleFaits = new Map());
      const vus = new Set();
      if (alpha > 0) {
        for (const a of this.animAreas || []) {
          if (!a.tex || !a.sprite || a.x > v.right || a.y > v.bottom || a.x + a.tex.width < v.x || a.y + a.tex.height < v.y) continue;
          const vive = this.eauVive && this.eauVive.find((e) => e.a === a && e.eauPx);
          if (!a.sprite.visible && !vive) continue;
          let f = faits.get(a);
          // (refait si l'étendue a une autre texture, ou si son eau vivante est arrivée depuis)
          if (f && (f.tex !== a.tex || (vive && !f.vive))) { f.img.destroy(); this.textures.remove(f.key); f = null; }
          if (!f) { f = this.voileRive(a, vive); if (!f) continue; faits.set(a, f); }
          f.img.setAlpha(alpha).setVisible(true);
          vus.add(a);
        }
      }
      for (const [a, f] of faits) {
        if (vus.has(a)) continue;
        // (loin de la vue ou au sec : caché ; l'étendue partie : défait)
        if (!a.tex || f.tex !== a.tex) { f.img.destroy(); this.textures.remove(f.key); faits.delete(a); } else f.img.setVisible(false);
      }
    },

    // Le voile de la rive de l'étendue `a` : ses pixels de terre, de la couleur du sol mouillé.
    voileRive(a, vive) {
      const w = a.tex.width, h = a.tex.height;
      // (l'eau vivante dessine sa rive elle-même, d'après son image de terre (eau.js eauRive : v.rive) ; sans
      // elle, l'image de l'étendue, où l'on reconnaît l'eau à sa couleur)
      const rive = vive && vive.rive && vive.rive.getContext ? vive.rive : null;
      let d;
      try { d = (rive || a.tex).getContext().getImageData(0, 0, w, h).data; } catch (e) { return null; }
      this.mouilleN = (this.mouilleN || 0) + 1;
      const key = 'mouille_rive_' + this.mouilleN;
      const cv = this.textures.createCanvas(key, w, h), g = cv.getContext(), im = g.createImageData(w, h), o = im.data;
      const c = FLAQUES.MOUILLE.couleur, cr = (c >> 16) & 255, cg = (c >> 8) & 255, cb = c & 255;
      let n = 0;
      for (let p = 0; p < w * h; p++) {
        const k = p * 4;
        if (!d[k + 3]) continue;
        let eau;
        if (rive) eau = false;
        else if (vive) eau = !!vive.eauPx[p];
        else { const r = d[k], gg = d[k + 1], b = d[k + 2]; eau = (b >= r + 40 && b >= gg) || (Math.min(r, gg, b) >= 190 && b >= r && b >= gg - 8); }
        if (eau) continue;
        o[k] = cr; o[k + 1] = cg; o[k + 2] = cb; o[k + 3] = 255;
        n++;
      }
      g.putImageData(im, 0, 0);
      cv.refresh();
      const img = this.add.image(a.x, a.y, key).setOrigin(0).setDepth(a.sprite.depth + 0.001).setVisible(false);
      img.toujours = true;
      return { key, img, tex: a.tex, vive: !!vive, n };
    },

    // À chaque image : la pluie depuis quand, le sol mouillé, les flaques, leurs ronds.
    stepFlaques(time, dt) {
      const m = this.ctx.lastModel && this.ctx.lastModel.meteo, pleut = !!(m && m.pluie);
      const E = this.flaques || (this.flaques = { pluie: 0, mouille: 0, niveau: 0, cases: null, vue: '', images: new Map(), ronds: null, sol: null });
      E.pluie = pleut ? E.pluie + dt : 0;
      const vers = (v, but, monte, seche) => (but > v ? Math.min(but, v + dt / monte) : Math.max(but, v - dt / seche));
      E.mouille = vers(E.mouille, pleut ? 1 : 0, FLAQUES.MOUILLE_MONTE, FLAQUES.MOUILLE_SECHE);
      E.niveau = vers(E.niveau, pleut && E.pluie >= FLAQUES.ATTENTE ? 1 : 0, FLAQUES.MONTE, FLAQUES.SECHE);
      const v = this.cameras.main.worldView;
      // le sol mouillé : un voile sombre sur toute la vue, sous les planchers et l'eau
      if (E.mouille > 0.001) {
        if (!E.sol) { E.sol = this.add.rectangle(0, 0, 10, 10, FLAQUES.MOUILLE.couleur, 1).setOrigin(0, 0).setDepth(FLAQUES.PROFONDEUR_SOL); E.sol.toujours = true; }
        E.sol.setPosition(v.x, v.y).setSize(v.width, v.height).setAlpha(FLAQUES.MOUILLE.alpha * E.mouille).setVisible(true);
      } else if (E.sol) E.sol.setVisible(false);
      this.mouilleRives(E.mouille > 0.001 ? FLAQUES.MOUILLE.alpha * E.mouille : 0, v);
      if (E.niveau <= 0.001) {
        for (const im of E.images.values()) im.setVisible(false);
        if (E.ronds) E.ronds.setVisible(false);
        return;
      }
      // les flaques près de la vue (revues quand la vue a bougé de PAS cases)
      const c0 = Math.floor(v.x / T) - 2, r0 = Math.floor(v.y / T) - 2, c1 = Math.ceil(v.right / T) + 2, r1 = Math.ceil(v.bottom / T) + 2;
      const cle = Math.floor(c0 / FLAQUES.PAS) + ',' + Math.floor(r0 / FLAQUES.PAS) + ',' + Math.floor(c1 / FLAQUES.PAS) + ',' + Math.floor(r1 / FLAQUES.PAS);
      // (le sol pas encore tout peint : réessayé deux fois par seconde)
      if (cle !== E.vue && time - (E.essai || 0) > 500) {
        E.essai = time;
        if (this.flaquesPres(c0 - FLAQUES.PAS, r0 - FLAQUES.PAS, c1 + FLAQUES.PAS, r1 + FLAQUES.PAS)) E.vue = cle;
      }
      for (let n = 0; n < FLAQUES.IMAGES && E.aFaire && E.aFaire.length; n++) {
        const q = E.aFaire.shift();
        if (!E.images.has(q.k)) E.images.set(q.k, this.imageFlaque(q.forme, q.x, q.y));
      }
      const a = E.niveau;
      for (const [k, im] of E.images) im.setAlpha(a).setVisible(true);
      // les ronds de pluie, tant qu'il pleut
      if (!pleut || reducedMotion()) { if (E.ronds) E.ronds.setVisible(false); return; }
      if (!E.ronds) { E.ronds = this.add.graphics().setDepth(FLAQUES.PROFONDEUR + 0.001); E.ronds.toujours = true; }
      const g = E.ronds.clear().setVisible(true), R = FLAQUES.RONDS, t = time / 1000;
      for (const f of E.liste || []) {
        if (f.x < v.x - 16 || f.x > v.right + 16 || f.y < v.y - 16 || f.y > v.bottom + 16) continue;
        for (let i = 0; i < R.n; i++) {
          // (chaque rond : sa place et son âge, tirés de nouveau à chaque cycle)
          const cycle = t / R.vie + hasard(f.X, f.Y, 40 + i), n = Math.floor(cycle), age = cycle - n;
          const ox = Math.round((hasard(f.X + n, f.Y, 10 + i) - 0.5) * f.forme.rx), oy = Math.round((hasard(f.X, f.Y + n, 20 + i) - 0.5) * f.forme.ry);
          const r = 1 + age * (R.rayon - 1);
          g.fillStyle(R.couleur, R.alpha * (1 - age) * a);
          for (let s = 0; s < 12; s++) {
            const px = Math.round(ox + Math.cos((s / 12) * 6.283) * r), py = Math.round(oy + Math.sin((s / 12) * 6.283) * r * 0.6);
            if (f.forme.dedans(px, py)) g.fillRect(f.x + px, f.y + py, 1, 1);
          }
        }
      }
    },

    // Les flaques des cases (c0..c1, r0..r1) : celles qui y sont, leurs images (faites une fois) ; les autres,
    // retirées. → false si le sol n'y est pas encore tout peint (on réessaiera).
    flaquesPres(c0, r0, c1, r1) {
      const E = this.flaques, W = this.grid.cols, M = FLAQUES.LIGNE;
      // (le sol au milieu de chaque case du rectangle et de la marge où l'on compare les tirages)
      const ca = c0 - M - 2, ra = r0 - M - 1, nc = c1 - c0 + 2 * M + 5, nr = r1 - r0 + 2 * M + 3;
      const lu = this.solDesCases(ca, ra, nc, nr);
      if (!lu) return false;
      const brun = (X, Y) => {
        const x = X - ca, y = Y - ra;
        if (x < 0 || y < 0 || x >= nc || y >= nr) return false;
        const q = (y * nc + x) * 4, r = lu.data[q], g = lu.data[q + 1], b = lu.data[q + 2];
        return lu.data[q + 3] > 0 && r > g + 12 && g > b;
      };
      const loinDuBord = (X, Y) => {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!brun(X + dx, Y + dy)) return false;
        return brun(X - 2, Y) && brun(X + 2, Y);
      };
      // (sous un toit : les maisons de la ferme et des hameaux ; leurs cases, réunies)
      const toits = [...(this.toits || [])];
      for (const e of (this.hameauxVus ? this.hameauxVus.values() : [])) toits.push(...(e.toits || []));
      const sous = new Set();
      for (const t of toits) if (t.dedans) for (const c of t.dedans) sous.add(c);
      // les cases où une flaque peut être, et leurs tirages : une fois chacune, dans deux tableaux
      const f = this.fermier, possible = new Uint8Array(nc * nr), tirage = new Float32Array(nc * nr);
      for (let y = 1; y < nr - 1; y++) {
        for (let x = 2; x < nc - 2; x++) {
          const X = ca + x, Y = ra + y, k = Y * W + X;
          // (loin des bords du chemin : la case, ses huit voisines et les deux d'après, à gauche et à droite, sont
          // du chemin ; la flaque, plus large que haute, ne déborde jamais sur la bordure chemin-herbe)
          if (!loinDuBord(X, Y) || sous.has(k) || (this.floors && this.floors.has(k))) continue;
          if (this.dirt && (this.dirt.has(k) || this.dirt.has(k - 1) || this.dirt.has(k + 1))) continue;
          const px = X * T + 8, py = Y * T + 14, l = f && f.librePres ? f.librePres(px, py) : null;
          if (!l || l.x !== px || l.y !== py) continue;
          possible[y * nc + x] = 1;
          tirage[y * nc + x] = hasard(X, Y, 0);
        }
      }
      const liste = [], gardees = new Set();
      for (let Y = r0; Y <= r1; Y++) {
        for (let X = c0; X <= c1; X++) {
          const i0 = (Y - ra) * nc + X - ca;
          if (!possible[i0]) continue;
          const h0 = tirage[i0];
          let max = true;
          for (let dy = -M; dy <= M && max; dy++) {
            const ligne = (Y + dy - ra) * nc + X - ca;
            for (let dx = -M; dx <= M; dx++) {
              if ((!dx && !dy) || (dx !== 0 && dy !== 0 && (dx > FLAQUES.ECART || dx < -FLAQUES.ECART || dy > FLAQUES.ECART || dy < -FLAQUES.ECART))) continue;
              const i = ligne + dx;
              if (possible[i] && tirage[i] > h0) { max = false; break; }
            }
          }
          if (!max) continue;
          const k = Y * W + X;
          gardees.add(k);
          const px = X * T + 4 + Math.floor(hasard(X, Y, 7) * 9), py = Y * T + 4 + Math.floor(hasard(X, Y, 8) * 9);
          const fo = forme(X, Y);
          liste.push({ X, Y, k, x: px, y: py, forme: fo });
        }
      }
      for (const [k, im] of E.images) if (!gardees.has(k)) { this.textures.remove(im.texture.key); im.destroy(); E.images.delete(k); }
      E.liste = liste;
      // (leurs images : faites quelques-unes par image, stepFlaques)
      E.aFaire = liste.filter((q) => !E.images.has(q.k));
      // (tout le rectangle était-il peint ?)
      for (let Y = r0; Y <= r1; Y++) for (let X = c0; X <= c1; X++) if (!lu.data[((Y - ra) * nc + X - ca) * 4 + 3]) return false;
      return true;
    },

    // Le sol peint au milieu de chaque case de (c0, r0) sur nc × nr cases : un ImageData d'un pixel par case
    // (transparent là où aucun morceau peint ne la couvre), lu dans les morceaux du sol (sol.js) réduits au plus
    // proche (chaque pixel prend celui du milieu de sa case) ; null si aucun n'y est peint.
    solDesCases(c0, r0, nc, nr) {
      const cv = this.flaquesSol || (this.flaquesSol = global.document.createElement('canvas'));
      cv.width = nc; cv.height = nr;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, nc, nr);
      let n = 0;
      const x0 = c0 * T, y0 = r0 * T, x1 = (c0 + nc) * T, y1 = (r0 + nr) * T;
      for (const r of (this.regions || new Map()).values()) {
        if (!r.tex) continue;
        for (const m of r.morceaux) {
          if (!m.tex || m.x >= x1 || m.x + m.w <= x0 || m.y >= y1 || m.y + m.h <= y0) continue;
          // (les cases entières du morceau dans le rectangle, chacune son pixel du milieu)
          const ca = Math.max(c0, Math.ceil(m.x / T)), cb = Math.min(c0 + nc, Math.floor((m.x + m.w) / T));
          const rA = Math.max(r0, Math.ceil(m.y / T)), rb = Math.min(r0 + nr, Math.floor((m.y + m.h) / T));
          if (cb <= ca || rb <= rA) continue;
          g.drawImage(m.tex.getSourceImage(), ca * T - m.x, rA * T - m.y, (cb - ca) * T, (rb - rA) * T, ca - c0, rA - r0, cb - ca, rb - rA);
          n++;
        }
      }
      return n ? g.getImageData(0, 0, nc, nr) : null;
    },

    // L'image d'une flaque (sa forme), son milieu en (x, y).
    imageFlaque(fo, x, y) {
      const P = FLAQUES.EAU, R = fo.rx * 2 + 2, Rr = fo.ry * 2 + 2;
      const cv = global.document.createElement('canvas');
      cv.width = 2 * R + 1; cv.height = 2 * Rr + 1;
      const g = cv.getContext('2d');
      const rgba = (c) => `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`;
      for (let yy = -Rr; yy <= Rr; yy++) {
        for (let xx = -R; xx <= R; xx++) {
          let c = null;
          if (fo.dedans(xx, yy)) {
            const haut = !fo.dedans(xx, yy - 1), bas = !fo.dedans(xx, yy + 1);
            c = haut ? P.haut : bas ? P.bas : (xx - yy * 2) % 9 === 0 && yy < 0 ? P.reflet : P.fond;
          } else if (fo.dedans(xx, yy - 1) || fo.dedans(xx - 1, yy) || fo.dedans(xx + 1, yy) || fo.dedans(xx, yy + 1)) c = P.lisere;
          if (c) { g.fillStyle = rgba(c); g.fillRect(xx + R, yy + Rr, 1, 1); }
        }
      }
      this.flaquesN = (this.flaquesN || 0) + 1;
      const cle = 'flaque_' + this.flaquesN;
      this.textures.addCanvas(cle, cv);
      const im = this.add.image(x - R, y - Rr, cle).setOrigin(0).setDepth(FLAQUES.PROFONDEUR).setAlpha(0);
      im.toujours = true;
      return im;
    },
  });
})(window);
