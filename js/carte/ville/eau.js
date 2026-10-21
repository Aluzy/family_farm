/* carte/ville/eau.js — la scène des cartes : l'eau vivante (CarteKit.eauVive, js/carte/eau.js).
 *
 * Les étendues d'eau des cartes : les cases voisines (diagonales comprises) d'une couche d'eau
 * de Tiled (COUCHES : les fontaines de la ville et de la transition, le lac de la montagne ;
 * la mer de la plage). Chacune est dessinée une fois dans un canevas (ses tuiles, telles
 * qu'elles sont posées), que l'eau vivante peint à sa façon ; ses tuiles sont cachées tant que
 * l'eau vivante est là (eauTuiles), et reviennent sinon (eauRepeint). L'heure du jeu ; le
 * personnage, qui longe l'eau. Pas dans la grotte.
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const V = global.CarteVille;
  const { T } = V.C;

  // les couches d'eau, et ce qu'elles sont (waters : `eau` ; `mer` : la houle et le ressac)
  const COUCHES = { fontaines: { eau: 'fontaine', mer: false }, mer: { eau: 'mer', mer: true } };

  V.partie(Object.assign({}, K.eauVive, {

    eauEtendues() {
      if (this.cave) return null;
      if (!this.eauListe) this.eauListe = this.eauConstruit();
      for (const a of this.eauListe) if (!a.cachees) { this.eauTuiles(a, 0); a.cachees = true; }
      return this.eauListe.length ? this.eauListe : null;
    },

    // Les étendues des couches d'eau : leurs cases, leur canevas, leur image (cachée : l'eau
    // vivante la peint), et les cases de toutes (waters).
    eauConstruit() {
      const out = [];
      this.eauCases = new Map();
      for (const [nom, sorte] of Object.entries(COUCHES)) {
        const L = this.layers[nom];
        if (!L) continue;
        const W = this.map.width, H = this.map.height, vu = new Uint8Array(W * H);
        const plein = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !!L.getTileAt(x, y);
        for (let y0 = 0; y0 < H; y0++) {
          for (let x0 = 0; x0 < W; x0++) {
            if (vu[y0 * W + x0] || !plein(x0, y0)) continue;
            const cells = [[x0, y0]];
            vu[y0 * W + x0] = 1;
            let c0 = x0, c1 = x0, r0 = y0, r1 = y0;
            for (let i = 0; i < cells.length; i++) {
              const [x, y] = cells[i];
              c0 = Math.min(c0, x); c1 = Math.max(c1, x); r0 = Math.min(r0, y); r1 = Math.max(r1, y);
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  if (plein(x + dx, y + dy) && !vu[(y + dy) * W + x + dx]) { vu[(y + dy) * W + x + dx] = 1; cells.push([x + dx, y + dy]); }
                }
              }
            }
            // (la mer : une case de plus tout autour, où le ressac monte sur le sable)
            if (sorte.mer) { c0 = Math.max(0, c0 - 1); r0 = Math.max(0, r0 - 1); c1 = Math.min(W - 1, c1 + 1); r1 = Math.min(H - 1, r1 + 1); }
            const key = `eau_ville_${out.length}`;
            if (this.textures.exists(key)) this.textures.remove(key);
            const tex = this.textures.createCanvas(key, (c1 - c0 + 1) * T, (r1 - r0 + 1) * T);
            const sprite = this.add.image(c0 * T, r0 * T, key).setOrigin(0).setDepth(L.depth).setAlpha(0);
            const a = { x: c0 * T, y: r0 * T, tex, sprite, layer: L, cells, mer: sorte.mer, cachees: false };
            const w = { eau: sorte.eau, cells: new Set() };
            for (const [x, y] of cells) { const k = x * T + ',' + y * T; w.cells.add(k); this.eauCases.set(k, w); }
            this.eauDessine(a);
            out.push(a);
          }
        }
      }
      return out;
    },

    // Le canevas d'une étendue : ses tuiles, telles qu'elles sont posées (retournées, tournées).
    eauDessine(a) {
      const ctx = a.tex.getContext();
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, a.tex.width, a.tex.height);
      for (const [x, y] of a.cells) {
        const t = a.layer.getTileAt(x, y);
        const ts = t && t.tileset, uv = ts && ts.getTileTextureCoordinates(t.index);
        if (!uv) continue;
        const src = ts.image.getSourceImage(), tw = ts.tileWidth, th = ts.tileHeight;
        ctx.save();
        ctx.translate(x * T - a.x + T / 2, y * T - a.y + T / 2);
        if (t.rotation) ctx.rotate(t.rotation);
        ctx.scale(t.flipX ? -1 : 1, t.flipY ? -1 : 1);
        ctx.drawImage(src, uv.x, uv.y, tw, th, -T / 2, -T / 2, T, T);
        ctx.restore();
      }
      a.tex.refresh();
    },

    // Les tuiles d'une étendue, cachées (0) ou montrées (1).
    eauTuiles(a, alpha) {
      for (const [x, y] of a.cells) { const t = a.layer.getTileAt(x, y); if (t) t.setAlpha(alpha); }
    },

    eauRepeint(a) {
      a.sprite.setAlpha(0);
      this.eauTuiles(a, 1);
      a.cachees = false;
      this.eauDessine(a);
    },

    waters() {
      if (!this.eauCases) this.eauEtendues();
      return this.eauCases || new Map();
    },

    eauHeure() {
      return this.heure ? this.heure.heure : null;
    },

    eauMarcheurs() {
      return this.heroPos ? [{ id: 'heros', x: this.heroPos.x, y: this.heroPos.y }] : [];
    },
  }));
})(window);
