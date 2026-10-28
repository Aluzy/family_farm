/* carte/ferme/herbes.js — la scène de la ferme : les touffes d'herbe au pied de ce qui est posé.
 *
 * Là où un mur, un poteau de barrière ou un sol posé dehors touche l'herbe, la ligne était
 * nette. De petites touffes en éventail (HERBES) l'adoucissent : le long du bas des murs (pas
 * devant les portes : on y passe), une petite sous chaque poteau, au bas d'un sol posé dehors,
 * et quelques brins penchés sur ses côtés. Pas sur le haut d'un sol : vue de dessus, l'herbe
 * de derrière ne passe pas devant lui.
 *
 * Leurs couleurs sont celles de l'herbe juste dessous, lues dans le sol peint (les régions,
 * js/carte/ferme/sol.js) : elles suivent la prairie, la forêt, la montagne. Là où il n'y a pas
 * d'herbe (de la terre, un chemin, du sable, un autre bloc), rien.
 *
 * Les touffes sont refaites quand un bloc ou un sol change, ou qu'une région du sol est peinte :
 * un canevas par rangée, posé juste devant les murs de la rangée (ou sur les sols, à plat).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T, BLOCS_CARTE, HERBES } = F.C;
  const H = BLOCS_CARTE.hauts;
  const estPorte = (s) => s === 'porte' || H.modelesPortes[s] !== undefined;
  // un pixel d'herbe : opaque, nettement plus vert que rouge et que bleu
  const vert = (d, i) => d[i + 3] > 0 && d[i + 1] > d[i] + 6 && d[i + 1] > d[i + 2] + 10;
  const lum = (c) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;

  // Des nombres au hasard, toujours les mêmes pour une même graine (les touffes ne bougent pas
  // d'un dessin à l'autre).
  function hasard(graine) {
    let s = (graine >>> 0) || 1;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  }

  F.partie({

    // Refait les touffes si un bloc, un sol ou le sol peint a changé.
    syncHerbes() {
      if (!this.blocks && !this.floors) return;
      const cle = (this.blocsN || 0) + ',' + (this.floorsN || 0) + ',' + (this.solPeint || 0);
      if (cle === this.herbesCle) return;
      this.herbesCle = cle;
      for (const o of this.herbes || []) { o.img.destroy(); this.textures.remove(o.key); }
      this.herbes = [];
      const cols = this.grid.cols, B = this.blocks || new Map(), S = this.floors || new Map();
      const pris = (c) => B.has(c) || S.has(c);
      const couches = new Map();         // rangée et sorte -> { profondeur, pixels: [[x, y, couleur]] }
      const couche = (k, profondeur) => couches.get(k) || couches.set(k, { profondeur, pixels: [] }).get(k);

      // le bas des murs (pas des portes) et le pied des poteaux
      for (const e of B.values()) {
        const poteau = e.sorte === 'barriere';
        if (!e.img || !e.img.active || (!poteau && (e.img.texture.key !== H.key || estPorte(e.sorte)))) continue;
        if (pris(e.case + cols)) continue;
        const p = this.profilHerbe(e.img.texture.key, e.img.frame.name);
        if (!p) continue;
        const y = e.y - p.h + p.bas + 1, x0 = e.x - p.w / 2;
        const fond = this.fondHerbe(x0 - HERBES.fenetre, y, p.w + 2 * HERBES.fenetre, HERBES.fenetre + 2);
        if (!fond) continue;
        const pieds = p.colonnes.map((c) => x0 + c).filter((x) => fond.vert(x, y));
        const C = couche('d' + Math.floor(e.case / cols), e.y + HERBES.dessus);
        const rng = hasard(e.case * 7919 + 13);
        if (poteau) {
          // (une petite touffe au milieu de chaque poteau : ses colonnes qui se suivent)
          for (const g of groupes(pieds)) touffe(C.pixels, g[g.length >> 1], y, fond.teintes, HERBES.petite, rng);
        } else {
          for (let i = Math.floor(rng() * HERBES.pas[0]); i < pieds.length; i += pas(rng)) touffe(C.pixels, pieds[i], y, fond.teintes, HERBES.touffe, rng);
        }
      }

      // les sols posés dehors : leur bas, leurs côtés
      for (const c of S.keys()) {
        const col = c % cols, r = Math.floor(c / cols), x0 = col * T, y0 = r * T;
        const C = couche('s' + r, HERBES.plat);
        const rng = hasard(c * 104729 + 7);
        if (!pris(c + cols)) {
          const y = y0 + T, fond = this.fondHerbe(x0 - HERBES.fenetre, y, T + 2 * HERBES.fenetre, HERBES.fenetre + 2);
          if (fond) {
            const pieds = [];
            for (let x = x0; x < x0 + T; x++) if (fond.vert(x, y)) pieds.push(x);
            for (let i = Math.floor(rng() * HERBES.pas[0]); i < pieds.length; i += pas(rng)) touffe(C.pixels, pieds[i], y, fond.teintes, HERBES.touffe, rng);
          }
        }
        for (const [voisin, x, sens] of [[col > 0 && c - 1, x0 - 1, 1], [col < cols - 1 && c + 1, x0 + T, -1]]) {
          if (voisin === false || pris(voisin)) continue;
          const fond = this.fondHerbe(sens > 0 ? x - HERBES.fenetre + 1 : x, y0, HERBES.fenetre, T);
          if (!fond) continue;
          for (let y = y0; y < y0 + T - 1; y++) {
            if (rng() >= HERBES.cotes || !fond.vert(x, y)) continue;
            brin(C.pixels, x, y + 1, rng() < 0.5 ? 2 : 3, fond.teintes, 0, sens);
            y += 2;                                    // (pas deux brins collés : pas de trait)
          }
        }
      }

      // un canevas par couche, juste à la taille de ses touffes
      for (const [k, C] of couches) {
        if (!C.pixels.length) continue;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const [x, y] of C.pixels) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
        this.herbesN = (this.herbesN || 0) + 1;
        const key = 'herbes_' + k + '_' + this.herbesN;
        const cv = this.textures.createCanvas(key, x1 - x0 + 1, y1 - y0 + 1), g = cv.context;
        for (const [x, y, c] of C.pixels) { g.fillStyle = c; g.fillRect(x - x0, y - y0, 1, 1); }
        cv.refresh();
        this.herbes.push({ key, img: this.add.image(x0, y0, key).setOrigin(0).setDepth(C.profondeur) });
      }
    },

    // Le bas d'une image (clé, image) : sa largeur `w`, sa hauteur `h`, sa rangée la plus basse
    // `bas`, et les colonnes qui y descendent (tout le mur ; les poteaux d'une barrière, plus
    // bas que ses lisses). Calculé une fois par image.
    profilHerbe(key, frame) {
      const cache = this.herbesProfils || (this.herbesProfils = new Map()), k = key + '/' + frame;
      if (cache.has(k)) return cache.get(k);
      const f = this.textures.getFrame(key, frame);
      let p = null;
      if (f && f.source && f.source.image) {
        const w = f.cutWidth, h = f.cutHeight, cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const g = cv.getContext('2d');
        g.drawImage(f.source.image, f.cutX, f.cutY, w, h, 0, 0, w, h);
        const d = g.getImageData(0, 0, w, h).data, bas = [];
        for (let x = 0; x < w; x++) {
          let b = -1;
          for (let y = h - 1; y >= 0 && b < 0; y--) if (d[(y * w + x) * 4 + 3] > 0) b = y;
          bas.push(b);
        }
        const m = Math.max(...bas);
        if (m >= 0) p = { w, h, bas: m, colonnes: bas.map((b, x) => (b === m ? x : -1)).filter((x) => x >= 0) };
      }
      cache.set(k, p);
      return p;
    },

    // Le sol peint sur ce rectangle (px de carte), lu dans la région dessinée qui le contient :
    // vert(x, y) (de l'herbe ?) et ses teintes [sombre, moyenne, claire] ; null sans région
    // dessinée, ou sans assez d'herbe (HERBES.herbeMin).
    fondHerbe(x, y, w, h) {
      x = Math.round(x); y = Math.round(y);
      const r = [...(this.regions || new Map()).values()].find((q) => q.tex && x >= q.x && y >= q.y && x + w <= q.x + q.w && y + h <= q.y + q.h);
      if (!r) return null;
      const d = r.tex.getContext().getImageData(x - r.x, y - r.y, w, h).data, verts = [];
      for (let i = 0; i < d.length; i += 4) if (vert(d, i)) verts.push([d[i], d[i + 1], d[i + 2]]);
      if (verts.length < HERBES.herbeMin * w * h) return null;
      verts.sort((a, b) => lum(a) - lum(b));
      const teintes = HERBES.teintes.map((q) => { const c = verts[Math.min(verts.length - 1, Math.floor(q * verts.length))]; return 'rgb(' + c.join(',') + ')'; });
      return {
        teintes,
        vert: (px, py) => px >= x && py >= y && px < x + w && py < y + h && vert(d, ((py - y) * w + (px - x)) * 4),
      };
    },
  });

  // L'écart jusqu'à la touffe suivante (HERBES.pas).
  function pas(rng) {
    return HERBES.pas[0] + Math.floor(rng() * (HERBES.pas[1] - HERBES.pas[0] + 1));
  }

  // Les suites de x qui se suivent (les colonnes d'un même poteau).
  function groupes(xs) {
    const out = [];
    for (const x of xs) {
      const g = out[out.length - 1];
      if (g && x - g[g.length - 1] <= 1) g.push(x); else out.push([x]);
    }
    return out;
  }

  // Une touffe en éventail, plantée en (x, y) : ses brins (forme : [décalage, hauteur, penchant]),
  // chacun un peu plus ou moins haut au hasard.
  function touffe(pixels, x, y, teintes, forme, rng) {
    for (const [dx, h, p] of forme) brin(pixels, x + dx, y, Math.max(1, h - (rng() < 0.34 ? 1 : 0)), teintes, p, 0);
  }

  // Un brin qui monte de h px depuis (x, y) : sombre au pied, clair à la pointe ; sa pointe penche
  // de `pointe` px ; sur le côté d'un sol (`cote` : 1 vers la droite, -1 vers la gauche), tout le
  // brin au-dessus du pied penche vers lui.
  function brin(pixels, x, y, h, teintes, pointe, cote) {
    for (let k = 0; k < h; k++) {
      const px = x + (cote && k >= 1 ? cote : k === h - 1 && h > 1 ? pointe : 0);
      pixels.push([px, y - k, teintes[k === 0 ? 0 : k === h - 1 ? 2 : 1]]);
    }
  }
})(window);
