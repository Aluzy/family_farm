/* carte/toit.js — le toit de tuiles d'un bâtiment bâti en blocs, sur toutes les cartes.
 *
 * La ferme (js/carte/ferme/toits.js : un toit sur le dernier niveau de chaque pièce close) et la
 * ville (js/carte/ville/immeuble.js : l'immeuble en blocs) posent le même toit, dessiné comme
 * ceux des immeubles de la ville vus de 3/4 (scripts/ville/immeubles.py toit_croupe) : un toit
 * à croupes, dont l'emprise est celle du bâtiment, murs compris :
 *   - le pan de devant, grand (TOIT.devant de la profondeur), face à nous ; celui de derrière vu
 *     en raccourci, plus clair ; aux deux bouts, les croupes en triangle (la gauche dans la
 *     lumière), séparées des pans par leurs arêtiers ;
 *   - des rangs de tuiles de 8 px, décalés d'un rang à l'autre (batiments.py tuile) ;
 *   - le faîtage, une ligne de tuiles rondes, entre les deux croupes ;
 *   - le bord sombre, un débord de TOIT.debord px sur les côtés ; sous le pan de devant, l'égout,
 *     la planche de rive et l'ombre du toit sur le haut de la façade.
 *
 *   const { cv, c0, r0, r1, dx } = CarteKit.toit(cases, cols)   // cases : les tuiles couvertes
 *   CarteKit.toit(cases, cols, true)                             // un toit de verre (la Serre)
 *   textures.addCanvas(clé, cv) ; image en (c0 * T − dx, r0 * T − hauteur), origine en haut à gauche
 *
 * Script classique, chargé après le kit (js/carte/kit.js). Voir docs/architecture-phaser.md.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const T = K.T;
  // la couverture (batiments.py COUVERTURES['tuile'] : la tuile, son arête claire, le rang
  // sombre, le joint), le contour, l'ombrage de chaque pan (le soleil en haut à gauche : le pan
  // de derrière et la croupe gauche dans la lumière, la croupe droite à l'ombre), la part du pan
  // de devant dans la profondeur, le débord sur les côtés (px), la planche de rive sous l'égout,
  // l'ombre que le toit porte sur la façade
  const R = K.TOIT = {
    tuile: [134, 78, 56], claire: [166, 102, 72], sombre: [88, 50, 38], joint: [104, 60, 44], contour: [40, 31, 31],
    ombrage: { bas: 1, haut: 1.14, gauche: 1.1, droite: 0.78 }, devant: 0.75, debord: 3,
    planche: [[122, 80, 52], [98, 64, 42]], ombre: 0.35,
  };
  const teinte = (c, f) => (f <= 1 ? c.map((v) => Math.round(v * f)) : c.map((v) => Math.round(v + (255 - v) * (f - 1))));
  const mel = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

  // Le toit de verre (la Serre) : des vitres claires, presque transparentes, entre des
  // montants de fer tous les 8 px (des reflets en biais sur les vitres), le faîtage et le bord
  // en fer.
  const VERRE = { vitre: [196, 232, 226], alpha: 70, reflet: [236, 250, 246], refletAlpha: 150, fer: [150, 164, 160], ferClair: [204, 216, 212], ferSombre: [82, 92, 92] };

  // La couleur et l'opacité du pixel (x, y) d'un pan de verre dont l'égout est du côté `sens`.
  function vitre(x, y, sens) {
    const [a, b] = sens === 'bas' || sens === 'haut' ? [x, y] : [y, x];
    const ta = ((a % 8) + 8) % 8, tb = ((b % 8) + 8) % 8;
    if (ta === 0 || tb === 0) return [teinte(ta === 0 && tb === 0 ? VERRE.ferSombre : VERRE.fer, R.ombrage[sens]), 235];
    if ((ta + tb) % 8 === 3 && ta < 5) return [VERRE.reflet, VERRE.refletAlpha];
    return [teinte(VERRE.vitre, R.ombrage[sens]), VERRE.alpha];
  }

  // La tuile du pixel (x, y) d'un pan dont l'égout est du côté `sens` (batiments.py tuile).
  function tuile(x, y, sens) {
    const [a, b] = sens === 'bas' || sens === 'haut' ? [x, y] : [y, x];
    const rang = Math.floor(b / 8), ta = (a + 4 * (rang % 2)) % 8;
    let tb = ((b % 8) + 8) % 8;
    if (sens === 'haut' || sens === 'gauche') tb = 7 - tb;
    const c = tb <= 1 ? R.sombre : tb === 7 ? R.claire : ta === 0 ? R.joint : mel(R.tuile, R.claire, (tb - 2) / 10);
    return teinte(c, R.ombrage[sens]);
  }

  // L'image d'un toit : un canevas qui couvre les cases `cases` (de la grille à `cols`
  // colonnes) et le débord ; { cv, c0, r0, r1, dx } (dx : le débord, à gauche des cases).
  // `verre` : un toit de verre (la Serre), on voit au travers.
  function toit(cases, cols, verre = false) {
    const S = new Set(cases);
    let c0 = Infinity, c1 = -Infinity, r0 = Infinity, r1 = -Infinity;
    for (const t of cases) {
      const c = t % cols, r = Math.floor(t / cols);
      c0 = Math.min(c0, c); c1 = Math.max(c1, c); r0 = Math.min(r0, r); r1 = Math.max(r1, r);
    }
    const D = R.debord, Wc = (c1 - c0 + 1) * T, E = (r1 - r0 + 1) * T;
    const w = Wc + 2 * D, h = E + 7;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d'), img = g.createImageData(w, h), d = img.data;
    const met = (px, py, c, a = 255) => { const i = (py * w + px) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a; };
    // (x, y : dans le repère des cases, le débord en x < 0 et x >= Wc)
    const dedans = (x, y) => {
      const c = c0 + Math.min(c1 - c0, Math.max(0, Math.floor(x / T))), r = r0 + Math.min(r1 - r0, Math.floor(y / T));
      return S.has(r * cols + c);
    };
    const x0 = -D, x1 = Wc + D, devant = Math.round(E * R.devant), faite = E - devant;
    const rentre = Math.min(Math.floor(E / 2), Math.floor((x1 - x0) / 2));
    // le pan sous le pixel : 'bas' (devant), 'haut' (derrière), 'gauche', 'droite' (les croupes)
    const zone = (x, y) => {
      if (x < x0 + rentre && (y >= faite ? (x - x0) < rentre * (E - y) / devant : (x - x0) < rentre * y / faite)) return 'gauche';
      if (x >= x1 - rentre && (y >= faite ? (x1 - 1 - x) < rentre * (E - y) / devant : (x1 - 1 - x) < rentre * y / faite)) return 'droite';
      return y >= faite ? 'bas' : 'haut';
    };
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const x = px - D, y = py;
        if (!dedans(x, Math.min(y, E - 1))) continue;
        // l'égout sous le pan de devant : le rang sombre, la planche de rive, son ombre sur la façade
        if (y >= E) {
          const k = y - E;
          if (k < 4) met(px, py, verre ? (k === 1 ? VERRE.ferClair : VERRE.ferSombre) : k === 0 ? R.sombre : k === 3 || x === x0 || x === x1 - 1 ? R.contour : R.planche[k - 1]);
          else met(px, py, [0, 0, 0], Math.round(255 * R.ombre * (7 - k) / 3));
          continue;
        }
        const z = zone(x, y);
        let [c, a] = verre ? vitre(x, y, z) : [tuile(x, y, z), 255];
        // les arêtiers (là où le pan change), le bord
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([u, v]) => zone(x + u, y + v) !== z)) { c = verre ? (z === 'gauche' || z === 'haut' ? VERRE.ferClair : VERRE.ferSombre) : z === 'gauche' || z === 'haut' ? R.claire : R.contour; a = 255; }
        if (x === x0 || x === x1 - 1 || y === 0 || !dedans(x, y - 1) || !dedans(x - 1, y) || !dedans(x + 1, y)) { c = verre ? VERRE.ferSombre : R.contour; a = 255; }
        met(px, py, c, a);
      }
    }
    // le faîtage : une ligne de tuiles rondes entre les deux croupes
    // (de verre : une poutre de fer, plus fine)
    const rangs = verre ? [VERRE.ferSombre, VERRE.ferClair, VERRE.fer, VERRE.ferSombre] : [R.contour, R.claire, teinte(R.claire, 1.08), R.tuile, R.sombre, R.contour];
    for (let x = x0 + rentre; x < x1 - rentre; x++) {
      for (let k = 0; k < rangs.length; k++) {
        const y = faite - (verre ? 2 : 3) + k;
        if (y < 0 || y >= E || !dedans(x, y)) continue;
        met(x + D, y, !verre && (x - x0) % 6 === 0 && k > 0 && k < 5 ? R.sombre : rangs[k]);
      }
    }
    g.putImageData(img, 0, 0);
    return { cv, c0, r0, r1, dx: D };
  }

  K.toit = toit;
})(window);
