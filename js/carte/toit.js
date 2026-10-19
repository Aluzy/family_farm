/* carte/toit.js — le toit de tuiles d'un bâtiment bâti en blocs, sur toutes les cartes.
 *
 * La ferme (js/carte/ferme/toits.js : un toit sur le dernier niveau de chaque pièce close) et la
 * ville (js/carte/ville/immeuble.js : l'immeuble en blocs) posent le même toit : un canevas qui
 * couvre les cases du bâtiment, murs compris, avec un faîtage au milieu de chaque colonne (le
 * versant sud, face à nous, et le versant nord, plus sombre), un bord sombre et une rive sous le
 * bas du versant sud (CarteKit.TOIT : les couleurs).
 *
 *   const { cv, c0, r0, r1 } = CarteKit.toit(cases, cols)   // cases : les tuiles couvertes
 *   textures.addCanvas(clé, cv) ; image en (c0 * T, r0 * T − hauteur), origine en haut à gauche
 *
 * Script classique, chargé après le kit (js/carte/kit.js). Voir docs/architecture-phaser.md.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const T = K.T;
  // les tuiles du versant sud et du versant nord (base, clair, sombre), le faîtage, le bord, la
  // rive sous le versant sud (une couleur par rangée de pixels)
  const R = K.TOIT = {
    sud: [[178, 84, 58], [206, 112, 78], [130, 57, 41]], nord: [[138, 61, 44], [158, 75, 53], [101, 43, 31]],
    faite: [[98, 41, 29], [192, 98, 68]], bord: [72, 31, 23], rive: [[94, 61, 41], [75, 49, 33], [56, 37, 25]],
  };

  // Une valeur de 0 à 1 qui dépend du pixel (le grain des tuiles).
  const bruit = (x, y) => {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // L'image d'un toit : un canevas qui couvre les cases `cases` (de la grille à `cols`
  // colonnes) ; { cv, c0, r0, r1 }.
  function toit(cases, cols) {
    const S = new Set(cases);
    let c0 = Infinity, c1 = -Infinity, r0 = Infinity, r1 = -Infinity;
    for (const t of cases) {
      const c = t % cols, r = Math.floor(t / cols);
      c0 = Math.min(c0, c); c1 = Math.max(c1, c); r0 = Math.min(r0, r); r1 = Math.max(r1, r);
    }
    const w = (c1 - c0 + 1) * T, h = (r1 - r0 + 1) * T + R.rive.length;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d'), img = g.createImageData(w, h), d = img.data;
    const met = (x, y, [r, v, b], k = 0) => {
      const i = (y * w + x) * 4;
      d[i] = Math.max(0, Math.min(255, r + k)); d[i + 1] = Math.max(0, Math.min(255, v + k)); d[i + 2] = Math.max(0, Math.min(255, b + k)); d[i + 3] = 255;
    };
    const dans = (c, r) => S.has(r * cols + c);
    // le faîtage de chaque colonne : au milieu de ses cases
    const faite = new Map();
    for (let c = c0; c <= c1; c++) {
      let a = Infinity, b = -Infinity;
      for (let r = r0; r <= r1; r++) if (dans(c, r)) { a = Math.min(a, r); b = Math.max(b, r); }
      if (a !== Infinity) faite.set(c, Math.round(((a + b + 1) * T) / 2) - r0 * T);
    }
    for (const t of cases) {
      const c = t % cols, r = Math.floor(t / cols), fy = faite.get(c);
      const ox = (c - c0) * T, oy = (r - r0) * T;
      const n = !dans(c, r - 1), e = !dans(c + 1, r), s = !dans(c, r + 1), o = !dans(c - 1, r);
      for (let py = 0; py < T; py++) {
        for (let px = 0; px < T; px++) {
          const x = ox + px, y = oy + py, k = Math.round((bruit(x, y) - 0.5) * 10);
          // le bord du toit
          if ((n && py === 0) || (e && px === T - 1) || (s && py === T - 1) || (o && px === 0)) { met(x, y, R.bord); continue; }
          const dy = y - fy;
          // le faîtage
          if (dy >= -2 && dy <= 0) { met(x, y, dy === -2 ? R.faite[1] : R.faite[0], k); continue; }
          const sud = dy > 0, P = sud ? R.sud : R.nord, haut = sud ? 5 : 3;
          const l = sud ? dy - 1 : -dy - 1, rang = Math.floor(l / haut), u = l % haut;
          // les rangs de tuiles : le haut éclairé, le bas sombre, une rainure toutes les 4 px
          const rainure = (x + (rang % 2) * 2) % 4 === 0;
          const teinte = sud ? (u === 0 ? P[1] : u === haut - 1 ? P[2] : P[0]) : (u === haut - 1 ? P[1] : u === 0 ? P[2] : P[0]);
          met(x, y, rainure && u !== (sud ? 0 : haut - 1) ? P[2] : teinte, k);
        }
      }
      // la rive : sous le bas du versant sud
      if (s) for (let i = 0; i < R.rive.length; i++) for (let px = 0; px < T; px++) met(ox + px, oy + T + i, R.rive[i]);
    }
    g.putImageData(img, 0, 0);
    return { cv, c0, r0, r1 };
  }

  K.toit = toit;
})(window);
