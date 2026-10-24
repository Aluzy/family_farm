/* carte/ferme/sol.js — la scène de la ferme : les textures de secours et le sol de la carte.
 *
 * Les textures (images du pack, dessins de secours, découpes), le sol cuit en une image
 * (bakeGround : toutes les couches de tuiles de la carte Tiled), la terre labourée, la grille
 * de la houe, les tuiles animées (l'eau) et la réparation du fond quand le navigateur l'a vidé.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T, MAP, ZONE_TILES, ZONE_OBJECTS } = F.C;
  const { reducedMotion } = F;

  F.partie({

    /* ---------- textures ---------- */

    has(key) { return this.textures.exists(key) && !this.missing.has(key); },
    tex(key, fallback) { return this.has(key) ? key : fallback; },

    // Dessins de secours (formes simples) quand une image du pack manque : la carte
    // reste lisible et utilisable, même sans les assets.
    makePlaceholders() {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const bake = (key, w, h, draw) => { g.clear(); draw(g); g.generateTexture(key, w, h); };
      const shed = (wall, roof, w, h) => (d) => {
        const r = Math.round(h * 0.42);
        d.fillStyle(wall).fillRect(Math.round(w * 0.08), r, Math.round(w * 0.84), h - r);
        d.fillStyle(roof).fillTriangle(0, r + 4, w / 2, 0, w, r + 4);
        d.fillStyle(0x5a3a1a).fillRect(Math.round(w / 2) - 7, h - 30, 14, 30);
      };
      bake('ph_dry', 16, 16, (d) => { d.fillStyle(0x8b5a2b).fillRect(0, 0, 16, 16); d.fillStyle(0x7a4d24).fillRect(0, 5, 16, 2).fillRect(0, 11, 16, 2); });
      // arrosée : la terre sèche, avec une tache sombre en ellipse au pied de la plante (comme
      // assets/soil_wet.png, scripts/carte/terre_arrosee.py)
      bake('ph_wet', 16, 16, (d) => { d.fillStyle(0x8b5a2b).fillRect(0, 0, 16, 16); d.fillStyle(0x7a4d24).fillRect(0, 5, 16, 2).fillRect(0, 11, 16, 2); d.fillStyle(0x4a2e15).fillEllipse(8, 11.8, 13.6, 8.2); });
      bake('ph_maison', 93, 97, shed(0xc9a26b, 0xa8472f, 93, 97));
      bake('ph_etable', 104, 93, shed(0x8a5a34, 0x5a3a1a, 104, 93));
      bake('ph_moulin', 96, 128, shed(0xd8c7a3, 0x6b4423, 96, 128));
      bake('ph_serre', 96, 80, shed(0x9fd3c7, 0x4f8a7a, 96, 80));
      bake('ph_poulailler', 44, 55, shed(0xb07a4a, 0x5c2f40, 44, 55));
      bake('ph_silo', 28, 62, shed(0x9a6040, 0x5e3a4e, 28, 62));
      bake('ph_arbre', 80, 80, (d) => { d.fillStyle(0x6b4423).fillRect(36, 48, 8, 32); d.fillStyle(0x4f8a4a).fillCircle(40, 32, 28); });
      g.destroy();
    },

    // Découpes : crops.png, une image « culture:phase » par case (table reçue au
    // montage).
    defineFrames() {
      if (this.has('crops')) {
        const t = this.textures.get('crops');
        for (const [name, sp] of Object.entries(this.ctx.crops)) {
          sp.c.forEach((col, phase) => t.add(name + ':' + phase, 0, col * T, (sp.r + 1) * T - sp.h, T, sp.h));
        }
      }
    },


    /* ---------- carte Tiled ---------- */

    // Toutes les couches de tuiles sont dessinées une fois dans une seule image (texture
    // « ground ») : pas de liseré entre les tuiles quand le zoom n'est pas entier. Les
    // rectangles nommés de la couche d'objets (maison, grange, zone_culture…) sont relevés.
    bakeGround() {
      const ok = this.cache.tilemap.exists(MAP.key) && !this.missing.has(MAP.key);
      let raw = ok ? this.cache.tilemap.get(MAP.key).data : null;
      // la ferme générée (ctx.carte, js/engine/ferme-generee.js) : à la place de la carte de
      // Tiled, avec ses jeux de tuiles
      if (raw && this.ctx.carte) raw = Object.assign({}, this.ctx.carte, { tilesets: raw.tilesets });
      const valid = !!(raw && raw.width && raw.height && raw.tilewidth && Array.isArray(raw.layers));
      if (valid) {
        this.world = { w: raw.width * raw.tilewidth, h: raw.height * raw.tileheight };
        this.grid.cols = raw.width;
      }
      this.mapRaw = valid ? raw : null;
      if (valid) {
        const named = {};
        for (const layer of raw.layers) {
          if (layer.type === 'objectgroup') for (const o of layer.objects || []) if (o.name) named[o.name] = o;
        }
        Object.assign(this.objects, named);
        // la ferme générée : les rectangles par défaut qu'elle n'a pas (la maison, qui se bâtit)
        // n'y sont pas
        if (this.ctx.carte) for (const k of Object.keys(this.objects)) if (!(k in named)) delete this.objects[k];
        const zone = ZONE_OBJECTS.find((n) => named[n]);
        if (zone) this.objects.zone_culture = named[zone];
        else console.warn('[FarmStage] rectangle ' + ZONE_OBJECTS[0] + ' introuvable dans la carte : zone de culture à sa place par défaut');
        const set = (raw.tilesets || []).find((t) => t.image && String(t.image).split('/').pop() === MAP.image);
        if (!set) console.warn('[FarmStage] jeu de tuiles ' + MAP.image + ' introuvable dans la carte (est-il intégré ?)');
      }
      this.findOccluders();                 // les arbres et les buissons : des images à part (voir plus bas)
      this.findRocks();                     // les rochers aussi (la pioche les casse)
      this.zoneOver = this.zoneGround();   // version 1.9 : les anciennes zones commencent en herbe
      this.dirt = new Set();                // version 1.15 : tuiles labourées de la carte
      this.zoneKey = '';
      this.textures.createCanvas('ground', this.world.w, this.world.h);
      this.paintGround();
      this.makeOccluders();
      this.makeRocks();
      this.makeTallGrass();
    },

    // Dessine (ou redessine) une carte Tiled dans sa texture, puis l'envoie à la carte
    // graphique : toutes ses couches de tuiles, sur un fond uni.
    paintMap(key, raw, w, h, bg, image) {
      const tex = this.textures.get(key);
      const ctx = tex.getContext();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 1;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      if (raw) {
        const img = this.has(MAP.tiles) ? this.textures.get(MAP.tiles).getSourceImage() : null;
        // Jeu de tuiles : celui dont l'image est la planche chargée (intégré dans le JSON).
        const set = (raw.tilesets || []).find((t) => t.image && String(t.image).split('/').pop() === MAP.image);
        for (const layer of raw.layers) {
          if (layer.type === 'tilelayer' && layer.visible !== false && img && set && Array.isArray(layer.data)) {
            this.drawLayer(ctx, raw, layer, set, img);
          }
        }
      }
      if (image && this.has(image)) ctx.drawImage(this.textures.get(image).getSourceImage(), 0, 0);
      tex.refresh();
    },

    // Le fond de la carte. Appelée au démarrage et chaque fois que le
    // navigateur a vidé ces images.
    paintGround() {
      this.paintMap('ground', this.mapRaw, this.world.w, this.world.h, '#6a8157');
      for (const a of this.animAreas || []) this.paintAnimArea(a);
    },

    // Le fond a-t-il été vidé ? Il est entièrement opaque quand il est dessiné : un point
    // transparent veut dire que le navigateur a jeté son contenu (page restée en
    // arrière-plan sur un téléphone, mémoire graphique reprise).
    groundWiped() {
      try {
        const tex = this.textures.get('ground');
        const ctx = tex.getContext();
        if (ctx.isContextLost && ctx.isContextLost()) return false;   // pas encore rendu : on réessaiera
        const w = this.world.w, h = this.world.h;
        return [[0, 0], [w >> 1, h >> 1], [w - 1, h - 1]].some((p) => ctx.getImageData(p[0], p[1], 1, 1).data[3] === 0);
      } catch (e) {
        return false;
      }
    },

    // Redessine le fond s'il a été vidé (ou d'office avec `force`). Sans cela, au retour
    // d'une absence, la carte n'affichait plus qu'un vert uni sous les bâtiments. Les arbres,
    // les barrières et les rochers (leurs canevas) aussi : sinon il ne restait que leurs
    // ombres. Et les images de la vie d'ambiance (bêtes, nuages, feuilles).
    repairGround(force, few) {
      if (!this.textures.exists('ground')) return false;
      if (!force && !this.groundWiped() && !this.spritesWiped(few)) return false;
      this.paintGround();
      this.paintSprites();
      if (this.ambient && this.ambient.repaint) this.ambient.repaint();
      return true;
    },

    // Tout ce qui peut annoncer que la mémoire graphique a été reprise puis rendue.
    watchGround() {
      const R = this.game.renderer;
      const E = global.Phaser.Renderer && global.Phaser.Renderer.Events;
      // Contexte WebGL rendu : Phaser recrée ses textures, puis on renvoie le fond.
      if (R && R.on) R.on((E && E.RESTORE_WEBGL) || 'restorewebgl', () => this.repairGround(true));
      // Canvas du fond rendu par le navigateur (il revient vide).
      const c = this.textures.get('ground').getSourceImage();
      if (c && c.addEventListener) c.addEventListener('contextrestored', () => this.repairGround(true));
      this.groundCheckAt = 0;
    },

    // Animations de tuiles d'un jeu de tuiles (Tiled les range dans `tiles`) : numéro de
    // tuile dans la planche -> ses images [{ tileid, duration (ms) }].
    // Lue une fois par jeu de tuiles (drawLayer la demande à chaque couche repeinte).
    tileFrames(set) {
      if (!this.tileFramesOf) this.tileFramesOf = new WeakMap();
      if (set && this.tileFramesOf.has(set)) return this.tileFramesOf.get(set);
      const out = new Map();
      for (const t of (set && set.tiles) || []) {
        if (Array.isArray(t.animation) && t.animation.length > 1) out.set(t.id, t.animation);
      }
      if (set) this.tileFramesOf.set(set, out);
      return out;
    },

    // Une tuile animée est dessinée dans le fond avec sa première image, comme dans Tiled
    // à l'arrêt : c'est ce qui reste visible quand les animations sont réduites.
    // Sol des anciennes zones de culture : leur terre d'origine (dans les rectangles et
    // autour, la seule terre du sol de la carte) redevient de l'herbe ; la terre labourée se
    // pose par-dessus (voir drawZoneDirt). Table index -> tuile de sol.
    zoneGround() {
      const raw = this.mapRaw;
      if (!raw) return null;
      const over = new Map();
      const sol = raw.layers.find((l) => l.type === 'tilelayer');
      if (!sol) return over;
      sol.data.forEach((g, i) => { if ((g & 0x0fffffff) === ZONE_TILES.terre) over.set(i, ZONE_TILES.herbe); });
      return over;
    },

    // Version 1.15 : en mode houe, une grille vert clair transparente sur les tuiles que la
    // houe peut labourer ; rien hors du mode houe (l'image est détruite).
    syncHoeGrid(tiles) {
      const key = tiles ? tiles.join() : '';
      if (key === this.hoeGridKey) return;
      this.hoeGridKey = key;
      if (this.hoeGrid) { this.hoeGrid.destroy(); this.hoeGrid = null; }
      if (!tiles || !tiles.length) return;
      const W = this.grid.cols;
      const g = this.add.graphics().setDepth(1.5);       // sur le sol, sous les parcelles (2)
      g.fillStyle(0xb6f08c, 0.28);
      g.lineStyle(1, 0xd8ffbe, 0.55);
      for (const t of tiles) {
        const x = (t % W) * T, y = Math.floor(t / W) * T;
        g.fillRect(x + 1, y + 1, T - 2, T - 2);
        g.strokeRect(x + 1.5, y + 1.5, T - 3, T - 3);
      }
      this.hoeGrid = g;
    },

    // Version 1.15 : la terre suit les parcelles (leur tuile), celles de la Serre comprises (sur
    // les cases de sa pièce : la même terre, les mêmes bordures qu'au-dehors) ; seules les
    // tuiles qui changent, et leurs voisines (leur bordure), sont repeintes.
    syncZoneGround(model) {
      const raw = this.mapRaw;
      if (!raw) return;
      const W = raw.width;
      const serre = new Set(model.serreCases || []);
      const now = new Set((model.plots || []).map((p) => p.case).filter((c) => typeof c === 'number')
        .concat((model.serre || []).map((p) => p.case).filter((c) => serre.has(c))));
      const key = [...now].sort((a, b) => a - b).join();
      if (key === this.zoneKey) return;
      this.zoneKey = key;
      const changed = [];
      for (const t of now) if (!this.dirt.has(t)) changed.push(t);
      for (const t of this.dirt) if (!now.has(t)) changed.push(t);
      this.dirt = now;
      const cells = new Set();
      for (const t of changed) {
        const c = t % W, r = Math.floor(t / W);
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const cc = c + dc, rr = r + dr;
            if (cc >= 0 && rr >= 0 && cc < W && rr < raw.height) cells.add(rr * W + cc);
          }
        }
      }
      if (cells.size) this.repaintCells(cells);
    },

    repaintCells(cells) {
      const raw = this.mapRaw;
      if (!raw || !this.has(MAP.tiles)) return;
      const set = (raw.tilesets || []).find((t) => t.image && String(t.image).split('/').pop() === MAP.image);
      if (!set) return;
      const tex = this.textures.get('ground');
      const ctx = tex.getContext();
      const img = this.textures.get(MAP.tiles).getSourceImage();
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#6a8157';
      for (const i of cells) ctx.fillRect((i % raw.width) * raw.tilewidth, Math.floor(i / raw.width) * raw.tileheight, raw.tilewidth, raw.tileheight);
      for (const layer of raw.layers) {
        if (layer.type === 'tilelayer' && layer.visible !== false && Array.isArray(layer.data)) this.drawLayer(ctx, raw, layer, set, img, cells);
      }
      tex.refresh();
      for (const a of this.animAreas || []) {           // une étendue d'eau animée touchée
        for (const i of cells) if (a.cells.has(i)) { this.paintAnimArea(a); break; }
      }
    },

    // `only` : seulement ces cases (repeinture partielle : un Set, ou un tableau déjà trié) ; `cur` : l'image du moment des
    // tuiles animées (numéro -> image), sinon leur première ; `arbre` : dessiner aussi les
    // cases des arbres (l'image d'un arbre, voir findOccluders). Sur la carte de la ferme, les
    // cases des zones de culture suivent zoneOver (voir zoneGround).
    drawLayer(ctx, raw, layer, set, img, only, cur, arbre) {
      const tw = raw.tilewidth, th = raw.tileheight;
      const cols = set.columns || Math.floor(img.width / tw);
      const last = set.firstgid + (set.tilecount || cols * Math.floor(img.height / th));
      const anims = this.tileFrames(set);
      const ferme = raw === this.mapRaw;
      const over = ferme && this.zoneOver ? this.zoneOver : null;
      const sol = layer === raw.layers.find((l) => l.type === 'tilelayer');
      if (ferme && layer.name === ZONE_TILES.couche) return;              // l'ancienne bordure des zones
      const dirt = ferme && layer.name === ZONE_TILES.plantes ? this.dirt : null;
      const paths = ferme && this.pathOver && this.pathOver.size ? this.pathOver : null;
      const onPath = dirt && this.pathCells && this.pathCells.size ? this.pathCells : null;
      // les arbres et buissons ont leur image (findOccluders) : pas dans le fond
      const hid = !arbre && ferme && this.occluded ? this.occluded.get(layer) : null;
      ctx.globalAlpha = layer.opacity == null ? 1 : layer.opacity;
      const draw = (orig, i) => {
        if (dirt && dirt.has(i)) return;                                  // les fleurs labourées
        if (onPath && onPath.has(i)) return;                              // et celles d'un chemin posé
        if (hid && hid.has(i)) return;
        let cell = orig;
        if (sol && paths && paths.has(i)) cell = paths.get(i);           // un chemin posé (syncPaths)
        else if (sol && over && over.has(i)) cell = over.get(i);          // le sol des anciennes zones
        else if (ferme && !sol && ZONE_TILES.bordures.has(cell & 0x0fffffff)) return; // leur bordure
        const gid = cell & 0x0fffffff;                   // les bits de poids fort sont des retournements
        if (!gid || gid < set.firstgid || gid >= last) return; // 0 = case vide, ou tuile d'une autre planche
        const a = anims.get(gid - set.firstgid);
        const n = a ? (cur && cur.has(gid - set.firstgid) ? cur.get(gid - set.firstgid) : a[0].tileid) : gid - set.firstgid;
        const sx = (n % cols) * tw, sy = Math.floor(n / cols) * th;
        const dx = (i % layer.width) * tw, dy = Math.floor(i / layer.width) * th;
        const fh = cell & 0x80000000, fv = cell & 0x40000000, fd = cell & 0x20000000;
        if (!fh && !fv && !fd) { ctx.drawImage(img, sx, sy, tw, th, dx, dy, tw, th); return; }
        ctx.save();
        ctx.translate(dx + tw / 2, dy + th / 2);
        if (fh) ctx.scale(-1, 1);
        if (fv) ctx.scale(1, -1);
        if (fd) { ctx.rotate(Math.PI / 2); ctx.scale(1, -1); }
        ctx.drawImage(img, sx, sy, tw, th, -tw / 2, -th / 2, tw, th);
        ctx.restore();
      };
      // Repeinture partielle : seulement les cases demandées, dans l'ordre (et non toute la
      // couche, 4 104 cases, pour une mare de quelques dizaines toutes les 400 ms).
      if (!only) layer.data.forEach(draw);
      else {
        const n = layer.data.length;
        for (const i of Array.isArray(only) ? only : [...only].sort((a, b) => a - b)) if (i >= 0 && i < n) draw(layer.data[i], i);
      }
      ctx.globalAlpha = 1;
      if (ferme && sol) this.drawZoneDirt(ctx, raw, only);
    },

    // La terre labourée (voir ZONE_TILES), sur le sol et sous les couches du dessus : une
    // tuile labourée est toute en terre, une tuile d'herbe voisine porte la bordure de ses
    // coins. `only` : repeinture partielle (ces tuiles seulement).
    drawZoneDirt(ctx, raw, only) {
      if (!this.dirt || !this.dirt.size || !this.has('terre_bords')) return;
      const W = raw.width, H = raw.height, tw = raw.tilewidth, th = raw.tileheight;
      const img = this.textures.get('terre_bords').getSourceImage();
      const dirt = this.dirt;
      const at = (c, r) => c >= 0 && r >= 0 && c < W && r < H && dirt.has(r * W + c);
      let cells = only;
      if (!cells) {
        cells = new Set();
        for (const t of dirt) {
          const c = t % W, r = Math.floor(t / W);
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (c + dc >= 0 && c + dc < W && r + dr >= 0 && r + dr < H) cells.add(t + dr * W + dc);
        }
      }
      for (const t of cells) {
        const c = t % W, r = Math.floor(t / W);
        const m = dirt.has(t) ? 15
          : ((at(c - 1, r - 1) || at(c, r - 1) || at(c - 1, r)) ? 8 : 0)
          | ((at(c, r - 1) || at(c + 1, r - 1) || at(c + 1, r)) ? 4 : 0)
          | ((at(c - 1, r) || at(c - 1, r + 1) || at(c, r + 1)) ? 2 : 0)
          | ((at(c + 1, r) || at(c, r + 1) || at(c + 1, r + 1)) ? 1 : 0);
        if (m) ctx.drawImage(img, m * tw, 0, tw, th, c * tw, r * th, tw, th);
      }
    },

    // Tuiles animées de la carte (l'eau) : les animations sont celles de Tiled, lues dans
    // le jeu de tuiles. Le fond reste une seule image fixe ; par-dessus, chaque étendue de
    // cases animées (une mare, avec ses rives) a sa propre image, repeinte case par case
    // avec toutes ses couches (un roseau reste devant l'eau) quand une de ses tuiles change
    // d'image. Une seule image par étendue, et non une par case : au zoom non entier (sur
    // un téléphone), des images de tuiles voisines laissaient voir des filets d'un pixel
    // entre elles. Toutes les tuiles d'un même numéro changent ensemble, comme dans Tiled.
    makeTileAnims() {
      const raw = this.mapRaw;
      if (!raw || !this.has(MAP.tiles)) return;
      const set = (raw.tilesets || []).find((t) => t.image && String(t.image).split('/').pop() === MAP.image);
      const anims = set ? this.tileFrames(set) : new Map();
      if (!anims.size) return;
      const W = raw.width, H = raw.height, tw = raw.tilewidth, th = raw.tileheight;
      const img = this.textures.get(MAP.tiles).getSourceImage();
      const cols = set.columns || Math.floor(img.width / tw);
      const last = set.firstgid + (set.tilecount || cols * Math.floor(img.height / th));
      const layers = raw.layers.filter((l) => l.type === 'tilelayer' && l.visible !== false && Array.isArray(l.data));
      const groups = new Map();           // numéro de tuile animée -> { ends, total, cur, ids }
      const cellGroups = new Map();       // case -> numéros des tuiles animées qu'elle porte
      for (let i = 0; i < W * H; i++) {
        for (const layer of layers) {
          const gid = layer.data[i] & 0x0fffffff;
          if (!gid || gid < set.firstgid || gid >= last) continue;
          const n = gid - set.firstgid;
          const a = anims.get(n);
          if (!a) continue;
          if (!groups.has(n)) {
            groups.set(n, Object.assign(K.cycle(a), { n, cur: 0 }));
          }
          if (!cellGroups.has(i)) cellGroups.set(i, new Set());
          cellGroups.get(i).add(n);
        }
      }
      // les étendues : cases animées voisines (en comptant les diagonales)
      const seen = new Set();
      const areas = [];
      for (const i0 of cellGroups.keys()) {
        if (seen.has(i0)) continue;
        const cells = new Set(), stack = [i0], ns = new Set();
        seen.add(i0);
        let c0 = W, c1 = 0, r0 = H, r1 = 0;
        while (stack.length) {
          const i = stack.pop(), c = i % W, r = (i / W) | 0;
          cells.add(i);
          for (const n of cellGroups.get(i)) ns.add(n);
          c0 = Math.min(c0, c); c1 = Math.max(c1, c); r0 = Math.min(r0, r); r1 = Math.max(r1, r);
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const cc = c + dc, rr = r + dr, j = rr * W + cc;
              if (cc >= 0 && rr >= 0 && cc < W && rr < H && !seen.has(j) && cellGroups.has(j)) { seen.add(j); stack.push(j); }
            }
          }
        }
        const key = 'eau_anim_' + areas.length;
        if (this.textures.exists(key)) this.textures.remove(key);
        const tex = this.textures.createCanvas(key, (c1 - c0 + 1) * tw, (r1 - r0 + 1) * th);
        const sprite = this.add.image(c0 * tw, r0 * th, key).setOrigin(0).setDepth(0.1);
        // `ordre` : ses cases triées, pour drawLayer (calculé une fois)
        areas.push({ cells, ordre: [...cells].sort((a, b) => a - b), groups: ns, x: c0 * tw, y: r0 * th, tex, sprite });
      }
      this.tileAnims = [...groups.values()];
      this.animAreas = areas;
      this.tileSprites = areas.map((a) => a.sprite);
      for (const a of areas) this.paintAnimArea(a);
    },

    // Repeint une étendue de cases animées : chaque case, toutes ses couches, chaque tuile
    // animée à son image du moment.
    paintAnimArea(area) {
      const raw = this.mapRaw;
      const set = (raw.tilesets || []).find((t) => t.image && String(t.image).split('/').pop() === MAP.image);
      if (!set) return;
      const img = this.textures.get(MAP.tiles).getSourceImage();
      const cur = this.animCur || (this.animCur = new Map());   // la même table à chaque fois
      cur.clear();
      for (const g of this.tileAnims) cur.set(g.n, g.ids[g.cur]);
      const ctx = area.tex.getContext();
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, area.tex.width, area.tex.height);
      ctx.save();
      ctx.translate(-area.x, -area.y);
      ctx.fillStyle = '#6a8157';
      for (const i of area.cells) ctx.fillRect((i % raw.width) * raw.tilewidth, Math.floor(i / raw.width) * raw.tileheight, raw.tilewidth, raw.tileheight);
      for (const layer of raw.layers) {
        if (layer.type === 'tilelayer' && layer.visible !== false && Array.isArray(layer.data)) this.drawLayer(ctx, raw, layer, set, img, area.ordre, cur);
      }
      ctx.restore();
      area.tex.refresh();
      // (l'eau vivante : la rive, qui ne bouge pas, js/carte/ferme/eau.js)
      const v = this.eauVive && this.eauVive.find((e) => e.a === area);
      if (v) this.eauRive(v);
    },

    // Fait avancer les tuiles animées : une comparaison par tuile animée et par image ; une
    // étendue n'est repeinte que si l'une de ses tuiles a changé d'image, et si elle est dans la
    // vue (hors de la vue, elle est repeinte en y revenant : la ferme générée a plusieurs
    // étangs). Rien si le joueur a demandé moins d'animations : les images sont masquées, le
    // fond montre la première.
    stepTileAnims(time) {
      const still = reducedMotion();
      if (still !== this.tilesStill) {
        this.tilesStill = still;
        for (const s of this.tileSprites) s.setVisible(!still);
      }
      if (still) return;
      const changed = new Set();
      for (const g of this.tileAnims) {
        const k = K.imageA(g, time);
        if (k === g.cur) continue;
        g.cur = k;
        changed.add(g.n);
      }
      // (une étendue restée hors de la vue garde `stale` : repeinte dès qu'elle y revient)
      const v = this.cameras.main.worldView;
      for (const a of this.animAreas || []) {
        if (!a.stale) for (const n of a.groups) if (changed.has(n)) { a.stale = true; break; }
        if (!a.stale || a.x > v.right || a.y > v.bottom || a.x + a.tex.width < v.x || a.y + a.tex.height < v.y) continue;
        a.stale = false;
        this.paintAnimArea(a);
      }
    },
  });
})(window);
