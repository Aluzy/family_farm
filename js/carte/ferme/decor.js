/* carte/ferme/decor.js — la scène de la ferme : les arbres, les barrières, les ombres et l'herbe haute.
 *
 * Les arbres et les buissons de la carte (chacun son image, rangée selon son pied : le
 * personnage passe derrière, l'arbre devient un peu transparent), les barrières, les ombres
 * portées, l'herbe haute qui penche quand on la traverse (CarteKit.herbe).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T, MAP, FELL, OCCLUDER_ALPHA, TALL_GRASS, SHADOWS, SPRITE_CHECKS, CAST } = F.C;

  F.partie({

    /* ---------- les arbres et les buissons, devant ou derrière le personnage ---------- */

    // Chaque arbre ou buisson de la carte (un groupe de cases voisines d'une couche d'arbres,
    // sauf layer_tree_top) n'est pas dessiné dans le fond : il a sa propre image, rangée selon
    // son pied comme le personnage et les bêtes (profondeur = y du pied). Qui passe derrière
    // est donc caché par lui ; l'arbre devient alors un peu transparent (OCCLUDER_ALPHA) pour
    // qu'on le voie passer. this.occluded : couche -> cases retirées du fond.
    // Les barrières (couches « barrieres… ») aussi, mais rangée par rangée : un morceau de
    // barrière = des cases voisines d'une même rangée, avec son pied au bas de la rangée. Le
    // fond d'un enclos passe ainsi derrière les bêtes, le devant devant elles, et chaque
    // tronçon de côté selon sa rangée.
    findOccluders() {
      this.occluders = [];
      this.occluded = new Map();
      const raw = this.mapRaw;
      if (!raw) return;
      const W = raw.width, H = raw.height, T = raw.tilewidth;
      for (const layer of raw.layers) {
        if (layer.type !== 'tilelayer' || !Array.isArray(layer.data) || layer.visible === false) continue;
        const fence = /barri/i.test(layer.name || '');
        if (!fence && (!/tree|arbre/i.test(layer.name || '') || /top|haut/i.test(layer.name || ''))) continue;
        const gidAt = (i) => layer.data[i] & 0x0fffffff;
        const seen = new Uint8Array(W * H);
        const all = new Set();
        for (let i0 = 0; i0 < W * H; i0++) {
          if (seen[i0] || !gidAt(i0)) continue;
          const cells = [], stack = [i0];
          seen[i0] = 1;
          let c0 = W, c1 = 0, r0 = H, r1 = 0;
          while (stack.length) {
            const i = stack.pop(), c = i % W, r = (i / W) | 0;
            cells.push(i);
            all.add(i);
            c0 = Math.min(c0, c); c1 = Math.max(c1, c); r0 = Math.min(r0, r); r1 = Math.max(r1, r);
            for (const j of fence ? [c > 0 ? i - 1 : -1, c < W - 1 ? i + 1 : -1] : [c > 0 ? i - 1 : -1, c < W - 1 ? i + 1 : -1, i - W, i + W]) {
              if (j >= 0 && j < W * H && !seen[j] && gidAt(j)) { seen[j] = 1; stack.push(j); }
            }
          }
          this.occluders.push({ layer, cells: new Set(cells), x: c0 * T, y: r0 * T, w: (c1 - c0 + 1) * T, h: (r1 - r0 + 1) * T, foot: (r1 + 1) * T - (fence ? 2 : 3), img: null });
        }
        this.occluded.set(layer, all);
      }
    },

    // Les images des arbres et des buissons (après le fond : la planche est chargée).
    makeOccluders() {
      const raw = this.mapRaw;
      if (!raw || !this.has(MAP.tiles)) return;
      const set = (raw.tilesets || []).find((t) => t.image && String(t.image).split('/').pop() === MAP.image);
      if (!set) return;
      const img = this.textures.get(MAP.tiles).getSourceImage();
      this.occluders.forEach((o, k) => {
        const key = 'arbre_occ_' + k;
        if (this.textures.exists(key)) this.textures.remove(key);
        o.tex = this.textures.createCanvas(key, o.w, o.h);
        this.paintOccluder(o, raw, set, img);
        o.img = this.add.image(o.x, o.y, key).setOrigin(0).setDepth(o.foot);
        o.alpha = 1;
        if (/barri/i.test(o.layer.name || '')) { if (o.shadow) o.shadow.destroy(); o.shadow = this.castShadow(o.img, CAST.fence); }
      });
    },

    paintOccluder(o, raw, set, img) {
      const ctx = o.tex.getContext();
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, o.w, o.h);
      ctx.save();
      ctx.translate(-o.x, -o.y);
      this.drawLayer(ctx, raw, o.layer, set, img, o.cells, null, true);
      ctx.restore();
      o.tex.refresh();
      o.probe = this.probeOf(o.tex, o.w, o.h);
    },

    // Un point opaque d'une image dessinée dans un canevas (null s'il n'y en a pas) : s'il
    // redevient transparent, le navigateur a vidé le canevas (voir spritesWiped).
    probeOf(tex, w, h) {
      try {
        const d = tex.getContext().getImageData(0, 0, w, h).data;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 200) { const k = (i - 3) / 4; return { x: k % w, y: (k / w) | 0 }; }
      } catch (e) { /* pas de vérification pour cette image */ }
      return null;
    },

    // Les arbres, les barrières et les rochers de la carte sont dessinés chacun dans son
    // canevas : comme le fond, le navigateur peut les vider quand la page reste en
    // arrière-plan. Vrai si l'un d'eux l'a été. `few` : quelques-uns seulement, à tour de rôle
    // (la vérification régulière ; au retour sur la page, tous sont vérifiés).
    spritesWiped(few) {
      const all = (this.occluders || []).concat(this.rocks || []);
      if (this.shadowTex && this.shadowProbe) all.push({ tex: this.shadowTex, probe: this.shadowProbe });
      let list = all;
      if (few && all.length > SPRITE_CHECKS) {
        const k0 = this.spriteCheckAt = ((this.spriteCheckAt || 0) + SPRITE_CHECKS) % all.length;
        list = Array.from({ length: SPRITE_CHECKS }, (_, i) => all[(k0 + i) % all.length]);
      }
      for (const o of list) {
        if (!o.tex || !o.probe) continue;
        try {
          const ctx = o.tex.getContext();
          if (ctx.isContextLost && ctx.isContextLost()) continue;   // pas encore rendu : on réessaiera
          if (ctx.getImageData(o.probe.x, o.probe.y, 1, 1).data[3] === 0) return true;
        } catch (e) { /* on ne sait pas : rien */ }
      }
      return false;
    },

    // Les ombres portées des arbres de la carte : une copie de ombres_arbres.png dans un
    // canevas, d'où paintShadows ôte celles des arbres abattus.
    makeShadows() {
      if (!this.has(SHADOWS.key)) return;
      const src = this.textures.get(SHADOWS.key).getSourceImage();
      if (this.textures.exists('ombres_vives')) this.textures.remove('ombres_vives');
      this.shadowTex = this.textures.createCanvas('ombres_vives', src.width, src.height);
      this.add.image(0, 0, 'ombres_vives').setOrigin(0).setDepth(SHADOWS.depth);
      this.paintShadows();
    },

    // L'ovale de l'ombre de l'arbre `t` (comme scripts/carte/carte_v2.py).
    treeShadow(t) {
      const rx = /sapin|pin/.test(t.kind || '') ? FELL.rx.pin : FELL.rx.arbre;
      return { cx: t.foot.x + rx * 0.22, cy: t.foot.y, rx, ry: Math.max(3, Math.round(rx * 0.27)) };
    },

    paintShadows() {
      if (!this.shadowTex) return;
      const src = this.textures.get(SHADOWS.key).getSourceImage();
      const ctx = this.shadowTex.getContext();
      const W = this.shadowTex.width, H = this.shadowTex.height;
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(src, 0, 0);
      const trees = this.mapTrees();
      const down = trees.filter((t) => t.gone);
      if (down.length) {
        const ovals = down.map((t) => this.treeShadow(t));
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        for (const e of ovals) { ctx.moveTo(e.cx + e.rx + 2, e.cy); ctx.ellipse(e.cx, e.cy, e.rx + 2, e.ry + 2, 0, 0, Math.PI * 2); }
        ctx.fill();
        ctx.restore();
        // les ombres des arbres debout qui chevauchaient les leurs reviennent
        const near = trees.filter((t) => !t.gone).map((t) => this.treeShadow(t))
          .filter((e) => ovals.some((d) => Math.abs(d.cx - e.cx) < d.rx + e.rx + 4 && Math.abs(d.cy - e.cy) < d.ry + e.ry + 4));
        if (near.length) {
          ctx.save();
          ctx.beginPath();
          for (const e of near) { ctx.moveTo(e.cx + e.rx + 1, e.cy); ctx.ellipse(e.cx, e.cy, e.rx + 1, e.ry + 1, 0, 0, Math.PI * 2); }
          ctx.clip();
          ctx.drawImage(src, 0, 0);
          ctx.restore();
        }
      }
      this.shadowTex.refresh();
      this.shadowProbe = this.probeOf(this.shadowTex, W, H);
    },

    // Redessine les arbres, les barrières et les rochers de la carte dans leurs canevas.
    paintSprites() {
      const raw = this.mapRaw;
      if (!raw || !this.has(MAP.tiles)) return;
      const set = (raw.tilesets || []).find((t) => t.image && String(t.image).split('/').pop() === MAP.image);
      if (!set) return;
      const img = this.textures.get(MAP.tiles).getSourceImage();
      for (const o of (this.occluders || []).concat(this.rocks || [])) if (o.tex) this.paintOccluder(o, raw, set, img);
      this.paintShadows();
    },

    // À chaque image : l'arbre devant le personnage (son pied plus bas que celui du
    // personnage) et qui le recouvre devient transparent, doucement ; les autres redeviennent
    // opaques.
    stepOccluders(dt) {
      if (!this.occluders || !this.occluders.length) return;
      const p = this.fermier && !this.room ? this.fermier.pos() : null;
      for (const o of this.occluders) {
        if (!o.img || o.regrowing) continue;
        const derriere = p && p.y < o.foot && p.x + 6 > o.x && p.x - 6 < o.x + o.w && p.y > o.y + 4 && p.y - 28 < o.y + o.h;
        const want = derriere ? OCCLUDER_ALPHA : 1;
        if (o.alpha === want) continue;
        o.alpha = K.fondu(o.alpha, want, dt);
        o.img.setAlpha(o.alpha);
        if (o.shake) o.shake.setAlpha(o.alpha);
      }
    },

    /* ---------- l'herbe haute ---------- */

    makeTallGrass() {
      for (const g of this.tallGrass || []) g.img.destroy();
      this.tallGrass = [];
      const raw = this.mapRaw;
      if (!raw || !this.has(TALL_GRASS.key)) return;
      const layer = raw.layers.find((l) => l.type === 'objectgroup' && l.name === 'herbe_haute');
      const rows = Math.floor(this.textures.get(TALL_GRASS.key).frameTotal / TALL_GRASS.frames) || 1;
      for (const o of (layer && layer.objects) || []) {
        const base = (Math.max(0, Number(o.type) | 0) % rows) * TALL_GRASS.frames;
        const img = this.add.image(Math.round(o.x), Math.round(o.y), TALL_GRASS.key, base).setOrigin(0.5, 1).setDepth(o.y);
        this.tallGrass.push({ img, x: o.x, y: o.y, base, cell: Math.floor(o.y / T - 0.01) * raw.width + Math.floor(o.x / T), t: -1, dir: 1, inside: false });
      }
      this.tintTallGrass();
    },

    // La teinte de chaque touffe : la couleur moyenne du fond autour de son pied, divisée par
    // celle de l'herbe la plus claire (sur laquelle les touffes sont dessinées).
    tintTallGrass() {
      let ctx = null;
      try { ctx = this.textures.get('ground').getContext(); } catch (e) { return; }
      if (!ctx) return;
      const under = [];
      for (const g of this.tallGrass) {
        let r = 0, v = 0, b = 0, n = 0;
        try {
          const d = ctx.getImageData(Math.round(g.x) - 8, Math.round(g.y) - 4, 16, 6).data;
          for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { r += d[i]; v += d[i + 1]; b += d[i + 2]; n++; }
        } catch (e) { return; }
        under.push(n ? [r / n, v / n, b / n] : null);
      }
      const lum = (c) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
      const seen = under.filter(Boolean).sort((a, b) => lum(a) - lum(b));
      if (!seen.length) return;
      const ref = seen[Math.floor((seen.length - 1) * 0.9)];        // l'herbe claire (sans les reflets isolés)
      this.tallGrass.forEach((g, k) => {
        const c = under[k];
        if (!c) return;
        // nuance propre à la touffe (toujours la même : tirée de sa position)
        const n = Math.sin(g.x * 12.9898 + g.y * 78.233) * 43758.5453;
        const own = 1 - TALL_GRASS.shade * (n - Math.floor(n));
        const ch = (i) => Math.round(255 * own * Math.pow(Math.min(1, c[i] / Math.max(1, ref[i])), TALL_GRASS.contrast));
        g.img.setTint((ch(0) << 16) | (ch(1) << 8) | ch(2));
      });
      this.grassCheck = 0;
      this.grassPrev = null;
    },

    // À chaque image : le personnage entre dans une touffe en marchant : elle penche dans le
    // sens de sa marche (vers la droite s'il va à droite) et revient en se balançant.
    stepTallGrass(dt) {
      const list = this.tallGrass;
      if (!list || !list.length) return;
      this.grassCheck -= dt;
      if (this.grassCheck <= 0) {                  // les cases labourées : plus d'herbe haute
        this.grassCheck = 500;
        for (const g of list) g.img.setVisible(!(this.dirt && this.dirt.has(g.cell)));
      }
      const p = this.fermier && !this.room ? this.fermier.pos() : null;
      this.grassPrev = K.herbe(list, p, this.grassPrev, dt);
    },

    // L'image de l'arbre `t` (mapTrees) : celle qui contient sa première case.
    occluderOf(t) {
      if (!this.occluders) return null;
      const i = t.cells.values().next().value;
      return this.occluders.find((o) => o.layer === t.layer && o.cells.has(i)) || null;
    },

    // L'ombre d'une image posée au sol (bâtiment, barrière) : sa silhouette noire, décalée de
    // `off` ({ dx, dy }), sous tout ce qui est debout. stepShadows lui fait suivre l'image.
    castShadow(img, off) {
      if (!img || !img.texture || img.texture.key.indexOf('ph_') === 0) return null;
      const sh = this.add.image(img.x + off.dx, img.y + off.dy, img.texture.key, img.frame ? img.frame.name : undefined)
        .setOrigin(img.originX, img.originY).setFlipX(img.flipX).setTintFill(0x000000).setAlpha(CAST.alpha).setDepth(CAST.depth);
      sh.setData('ombre', off);
      return sh;
    },

    // À chaque image : l'ombre d'un bâtiment animé (le Moulin) prend l'image du moment.
    stepShadows() {
      for (const e of this.buildings.values()) {
        if (!e.shadow || !e.sprite.anims || !e.sprite.frame) continue;
        if (e.shadow.frame.name !== e.sprite.frame.name) e.shadow.setFrame(e.sprite.frame.name);
      }
    },
  });
})(window);
