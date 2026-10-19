/* carte/ferme/toits.js — la scène de la ferme : les toits des bâtiments.
 *
 * Chaque bâtiment bâti en blocs (une pièce close) a un toit de tuiles, posé sur son dernier
 * niveau (modèle.toits : [{ niveau, cases, dedans }], voir toits() dans js/engine/etage.js) :
 * sur ses murs (niveau 0), ou sur les murs de son étage (niveau 1), remonté comme l'étage de
 * ETAGE.dy px par niveau. Il couvre les cases du bâtiment, murs compris, avec un faîtage au
 * milieu de chaque colonne (le versant sud, face à nous, et le versant nord, plus sombre) et
 * une rive sombre au bas du versant sud.
 *
 * Un toit s'efface (stepToits) quand le personnage est dans son bâtiment (en bas ou à l'étage)
 * et en mode Construire ; à moitié quand le personnage passe derrière lui.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T, BLOCS_CARTE } = F.C;
  const R = BLOCS_CARTE.toits;

  // Une valeur de 0 à 1 qui dépend du pixel (le grain des tuiles).
  const bruit = (x, y) => {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // L'image d'un toit : un canevas qui couvre les cases `cases` (de la grille à `cols`
  // colonnes) ; { cv, c0, r0, r1 }.
  function dessine(cases, cols) {
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

  F.partie({

    // Les toits du modèle : dessinés (un canevas par toit), ou ôtés.
    syncToits(toits) {
      const cle = toits && toits.length && !this.room ? JSON.stringify(toits) : '';
      if (cle === (this.toitsCle || '')) return;
      this.toitsCle = cle;
      for (const t of this.toits || []) { t.img.destroy(); this.textures.remove(t.key); }
      this.toits = [];
      if (!cle) return;
      const cols = this.grid.cols, dy = BLOCS_CARTE.etage.dy;
      this.toitsN = (this.toitsN || 0) + 1;
      toits.forEach((t, i) => {
        const { cv, c0, r0, r1 } = dessine(t.cases, cols), key = `toit_${this.toitsN}_${i}`;
        this.textures.addCanvas(key, cv);
        const lift = dy * (t.niveau + 1), x = c0 * T, y = r0 * T - lift;
        const img = this.add.image(x, y, key).setOrigin(0, 0).setDepth((r1 + 1) * T + R.z);
        this.toits.push({ key, img, dedans: new Set(t.dedans), x0: x, x1: x + cv.width, y0: y, y1: y + cv.height });
      });
    },

    // Un toit s'efface quand le personnage est dans son bâtiment, ou en mode Construire ; à
    // moitié quand il passe derrière.
    stepToits(dt) {
      if (!this.toits || !this.toits.length) return;
      const p = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      const cols = this.grid.cols, bati = !!this.bati;
      const ici = p ? Math.floor((p.y - 1) / T) * cols + Math.floor(p.x / T) : -1;
      const pas = R.vitesse * dt;
      for (const t of this.toits) {
        let but = 1;
        if (bati || t.dedans.has(ici)) but = 0;
        else if (p && p.x > t.x0 - 6 && p.x < t.x1 + 6 && p.y > t.y0 && p.y - 24 < t.y1 && p.y < t.y1 + BLOCS_CARTE.etage.dy) but = R.derriere;
        const a = t.img.alpha;
        if (a !== but) t.img.setAlpha(a < but ? Math.min(but, a + pas) : Math.max(but, a - pas));
      }
    },
  });
})(window);
