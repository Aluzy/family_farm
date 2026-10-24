/* carte/toit.js — le toit de tuiles d'un bâtiment bâti en blocs, sur toutes les cartes.
 *
 * La ferme (js/carte/ferme/toits.js : un toit sur le dernier niveau de chaque pièce close) pose
 * ce toit, dessiné comme ceux des immeubles de l'ancienne ville vus de 3/4 : un toit
 * à croupes, dont l'emprise est celle du bâtiment, murs compris :
 *   - le pan de devant, face à nous ; celui de derrière vu en raccourci, une bande fine et claire en
 *     haut (TOIT.haut de la profondeur, ou en px) ; aux deux bouts, les croupes en triangle (la
 *     gauche dans la lumière), dont les arêtiers vont des bouts du faîtage aux angles du toit ;
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
  // de derrière et la croupe gauche dans la lumière, la croupe droite à l'ombre), l'épaisseur du
  // pan de derrière (une part de la profondeur, ou des px), le débord sur les côtés (px), la planche de rive sous l'égout,
  // l'ombre que le toit porte sur la façade
  const R = K.TOIT = {
    tuile: [134, 78, 56], claire: [166, 102, 72], sombre: [88, 50, 38], joint: [104, 60, 44], contour: [40, 31, 31],
    ombrage: { bas: 1, haut: 1.14, gauche: 1.1, droite: 0.78 }, haut: 4, debord: 3,
    planche: [[122, 80, 52], [98, 64, 42]], ombre: 0.35,
  };
  const teinte = (c, f) => (f <= 1 ? c.map((v) => Math.round(v * f)) : c.map((v) => Math.round(v + (255 - v) * (f - 1))));
  const mel = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

  // Le toit de verre (la Serre) : des vitres claires, presque transparentes, entre des
  // montants de bois tous les 8 px (des reflets en biais sur les vitres), le faîtage et le bord
  // en bois, comme ses murs (scripts/carte/blocs.py verre_serre).
  const VERRE = { vitre: [196, 232, 226], alpha: 70, reflet: [236, 250, 246], refletAlpha: 150, bois: [138, 96, 58], boisClair: [176, 128, 80], boisSombre: [76, 52, 32] };

  // La couleur et l'opacité du pixel (x, y) d'un pan de verre dont l'égout est du côté `sens`.
  function vitre(x, y, sens) {
    const [a, b] = sens === 'bas' || sens === 'haut' ? [x, y] : [y, x];
    const ta = ((a % 8) + 8) % 8, tb = ((b % 8) + 8) % 8;
    if (ta === 0 || tb === 0) return [teinte(ta === 0 && tb === 0 ? VERRE.boisSombre : VERRE.bois, R.ombrage[sens]), 235];
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
    // le pan de derrière : une bande fine en haut (TOIT.haut : une part de la profondeur, ou des px)
    const faite = Math.max(2, Math.round(R.haut < 1 ? E * R.haut : R.haut)), devant = E - faite;
    const x0 = -D, x1 = Wc + D;
    const rentre = Math.min(Math.floor(E / 2), Math.floor((x1 - x0) / 2));
    // le pan sous le pixel : 'bas' (devant), 'haut' (derrière), 'gauche', 'droite' (les croupes, en
    // triangle : leurs arêtes vont des bouts du faîtage aux quatre angles du toit ; celles du haut,
    // presque à plat, bordent la bande fine du pan de derrière)
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
          if (k < 4) met(px, py, verre ? (k === 1 ? VERRE.boisClair : VERRE.boisSombre) : k === 0 ? R.sombre : k === 3 || x === x0 || x === x1 - 1 ? R.contour : R.planche[k - 1]);
          else met(px, py, [0, 0, 0], Math.round(255 * R.ombre * (7 - k) / 3));
          continue;
        }
        const z = zone(x, y);
        let [c, a] = verre ? vitre(x, y, z) : [tuile(x, y, z), 255];
        // les arêtiers (là où le pan change), le bord
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([u, v]) => zone(x + u, y + v) !== z)) { c = verre ? (z === 'gauche' || z === 'haut' ? VERRE.boisClair : VERRE.boisSombre) : z === 'gauche' || z === 'haut' ? R.claire : R.contour; a = 255; }
        if (x === x0 || x === x1 - 1 || y === 0 || !dedans(x, y - 1) || !dedans(x - 1, y) || !dedans(x + 1, y)) { c = verre ? VERRE.boisSombre : R.contour; a = 255; }
        met(px, py, c, a);
      }
    }
    // le faîtage : une ligne de tuiles rondes entre les deux croupes
    // (de verre : une poutre de bois, plus fine)
    const rangs = verre ? [VERRE.boisSombre, VERRE.boisClair, VERRE.bois, VERRE.boisSombre] : [R.contour, R.claire, teinte(R.claire, 1.08), R.tuile, R.sombre, R.contour];
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
