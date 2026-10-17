/* carte/ferme/interieurs.js — la carte de la ferme : les intérieurs (la Serre, la maison) et le repas.
 *
 * Les petites cartes Tiled des intérieurs, posées à droite de la carte : leurs emplacements de
 * parcelles, leurs meubles, où le personnage marche ; l'entrée et la sortie (fondu) ; le repas
 * de 19 h dans la maison et les bulles de bonheur des convives.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T, FERMIER_FRAME, ROOMS, MEUBLE_PLAT, MEUBLE_GHOST, ROOM_GAP, ROOM_SHADE, ROOM_FADE_MS, MIN_TAP, BUBBLE_TIP_X, BUBBLE_TIP_Y, JOIE } = F.C;
  const { pixelRatio, reducedMotion, v } = F;

  F.partie({

    // Intérieurs (ROOMS) : chaque petite carte est dessinée dans sa propre image, posée à
    // droite de la carte. Les rectangles de ses couches d'objets (`serre_zone_1`,
    // `serre_zone_2`…) donnent les emplacements des parcelles, calés sur la grille de 16 px
    // et pris rangée par rangée à travers toutes les zones : la première rangée de chaque
    // zone, puis la deuxième… Sans le fichier, pas d'intérieur : la page garde la fenêtre
    // du bâtiment (FarmStage.hasRoom).
    bakeRooms() {
      let x = Math.ceil(this.world.w / T) * T + ROOM_GAP;
      for (const [id, def] of Object.entries(ROOMS)) {
        const ok = this.cache.tilemap.exists(def.key) && !this.missing.has(def.key);
        const raw = ok ? this.cache.tilemap.get(def.key).data : null;
        if (!(raw && raw.width && raw.height && raw.tilewidth && Array.isArray(raw.layers))) continue;
        const zones = [];
        const props = [];
        let vue = null;                            // rectangle « vue » : ce que la vue cadre
        const floor = [];                          // rectangles « sol » (passages)
        let entree = null;
        for (const layer of raw.layers) {
          for (const o of layer.type === 'objectgroup' ? layer.objects || [] : []) {
            if (o.name === 'vue' && o.width && o.height) vue = { x: x + o.x, y: o.y, w: o.width, h: o.height };
            if (layer.name === 'passages' && o.name === 'sol' && o.width && o.height) floor.push({ x: x + o.x, y: o.y, w: o.width, h: o.height });
            if (layer.name === 'passages' && o.name === 'entree') entree = { x: x + o.x, y: o.y };
          }
          if (def.props && layer.type === 'objectgroup' && layer.name === def.props) {
            for (const o of layer.objects || []) {
              if (o.name && o.name !== 'vue' && o.width && o.height) props.push({ name: o.name, x: x + o.x, y: o.y, w: o.width, h: o.height, sprite: null });
            }
          }
          const m = def.zones && layer.type === 'objectgroup' ? def.zones.exec(layer.name || '') : null;
          const o = m ? (layer.objects || []).find((r) => r.width && r.height) : null;
          if (o) {
            zones.push({
              n: Number(m[1]), x: x + Math.round(o.x / T) * T, y: Math.round(o.y / T) * T,
              cols: Math.max(1, Math.round(o.width / T)), rows: Math.max(1, Math.round(o.height / T)),
            });
          }
        }
        if (def.zones && !zones.length) { console.warn('[FarmStage] ' + def.json + ' : aucune zone de culture, intérieur ignoré'); continue; }
        if (def.props && !props.length) { console.warn('[FarmStage] ' + def.json + ' : aucun meuble, intérieur ignoré'); continue; }
        zones.sort((a, b) => a.n - b.n);
        const slots = [];
        const slotAt = new Map();
        const rows = Math.max(...zones.map((z) => z.rows));
        for (let r = 0; r < rows; r++) {
          for (const z of zones) {
            for (let c = 0; r < z.rows && c < z.cols; c++) {
              const sx = z.x + c * T, sy = z.y + r * T;
              slotAt.set(sx + ',' + sy, slots.length);
              slots.push({ x: sx, y: sy });
            }
          }
        }
        const w = raw.width * raw.tilewidth, h = raw.height * raw.tileheight;
        // Ce que la vue cadre : la carte sans sa marge unie (les tuiles du coin haut-gauche).
        let c0 = raw.width, c1 = -1, r0 = raw.height, r1 = -1;
        for (const layer of raw.layers) {
          if (layer.type !== 'tilelayer' || !Array.isArray(layer.data)) continue;
          const edge = layer.data[0];
          layer.data.forEach((cell, i) => {
            if (!cell || cell === edge) return;
            const c = i % raw.width, r = Math.floor(i / raw.width);
            if (c < c0) c0 = c; if (c > c1) c1 = c; if (r < r0) r0 = r; if (r > r1) r1 = r;
          });
        }
        const full = c1 >= c0
          ? { x: x + c0 * raw.tilewidth, y: r0 * raw.tileheight, w: (c1 - c0 + 1) * raw.tilewidth, h: (r1 - r0 + 1) * raw.tileheight }
          : { x, y: 0, w, h };
        // `vue` cadre l'entrée ; si la carte est plus large, la vue y glisse de gauche à droite.
        const view = vue || full;
        const room = { id, def, raw, tex: 'room_' + id, x, y: 0, w, h, view, centre: { x: x + w / 2, y: h / 2 }, full, slots, slotAt, props, zones, bg: '#06182a' };
        room.walk = this.roomWalk(room, floor);
        room.entree = entree || this.roomEntry(room);
        this.textures.createCanvas(room.tex, w, h);
        this.paintMap(room.tex, raw, w, h, room.bg, def.image);
        // Autour de l'intérieur, l'écran prend la couleur du coin de sa carte.
        try {
          const px = this.textures.get(room.tex).getContext().getImageData(0, 0, 1, 1).data;
          room.bg = '#' + [px[0], px[1], px[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
        } catch (e) { /* couleur par défaut */ }
        this.rooms[id] = room;
        this.add.image(x, 0, room.tex).setOrigin(0).setDepth(0);
        const c = this.textures.get(room.tex).getSourceImage();
        if (c && c.addEventListener) c.addEventListener('contextrestored', () => this.repairGround(true));
        x += w + ROOM_GAP;
      }
      this.roomShade = this.add.graphics().setDepth(3);
    },

    // Où le personnage peut poser les pieds dans un intérieur : walk(x, y). Sur le sol (les
    // rectangles « sol », sinon les cases du sol de la carte : la tuile la plus fréquente),
    // hors des bacs de culture et des meubles posés (sauf les tapis, les tableaux, la fenêtre).
    roomWalk(room, floor) {
      const raw = room.raw, tw = raw.tilewidth;
      let onFloor;
      if (floor.length) onFloor = (x, y) => floor.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
      else {
        const layer = raw.layers.find((l) => l.type === 'tilelayer' && Array.isArray(l.data));
        const count = new Map();
        if (layer) for (const g of layer.data) if (g && g !== layer.data[0]) count.set(g, (count.get(g) || 0) + 1);
        let sol = 0, best = 0;
        for (const [g, n] of count) if (n > best) { best = n; sol = g; }
        onFloor = (x, y) => {
          const c = Math.floor((x - room.x) / tw), r = Math.floor(y / tw);
          return !!layer && c >= 0 && r >= 0 && c < raw.width && r < raw.height && layer.data[r * raw.width + c] === sol;
        };
      }
      const PAD = 3;            // les pieds restent à quelques pixels des bords
      const SIDE = 7;           // et le corps ne se glisse pas entre deux chaises
      return (x, y) => {
        if (![[-PAD, 0], [PAD, 0], [0, -PAD], [0, 1]].every(([dx, dy]) => onFloor(x + dx, y + dy))) return false;
        for (const z of room.zones || []) if (x > z.x - PAD && x < z.x + z.cols * T + PAD && y > z.y - 1 && y < z.y + z.rows * T + PAD + 2) return false;
        for (const p of room.props || []) {
          if (!p.sprite || MEUBLE_PLAT.test(p.dessin || p.name)) continue;
          if (x > p.x - SIDE && x < p.x + p.w + SIDE && y > p.y && y < p.y + p.h + PAD + 2) return false;
        }
        return true;
      };
    },

    // L'entrée d'un intérieur sans point « entree » : le bas du sol, au milieu de la vue.
    roomEntry(room) {
      const x = Math.round(room.view.x + room.view.w / 2);
      for (let y = room.h - 2; y > 0; y -= 2) if (room.walk(x, y)) return { x, y };
      return { x, y: Math.round(room.view.y + room.view.h * 0.7) };
    },

    // Le repas (FarmStage.mealScene) : les planches des autres membres sont chargées, puis
    // le personnage reçoit le repas (js/fermier.js). opts : { convives: [{ perso, enfant }],
    // heureux } ; un enfant a sa planche d'enfant (assets/personnages/enfant_NN.png).
    startMeal(opts) {
      if (!this.fermier || !this.fermier.startMeal) return false;
      const convives = (opts.convives || []).map((c) => ({ key: (c.enfant ? 'enfant_' : 'perso_') + c.perso, file: K.planche(c.perso, c.enfant), scale: 1 }));
      const go = () => this.fermier.startMeal({ convives: convives.filter((c) => this.has(c.key)), heureux: !!opts.heureux, done: () => { this.mealOn = false; } });
      this.mealOn = true;
      const manque = convives.filter((c) => !this.textures.exists(c.key));
      if (!manque.length) { go(); return true; }
      for (const c of manque) this.load.spritesheet(c.key, v(c.file), FERMIER_FRAME);
      this.load.once('complete', go);
      this.load.start();
      return true;
    },

    // Les bulles de bonheur au-dessus des convives (fermier.mealHeads), dans le calque des
    // étiquettes (caché dans un intérieur : elles restent visibles).
    placeMealBubbles() {
      const heads = this.room && this.fermier && this.fermier.mealHeads ? this.fermier.mealHeads() : [];
      if (!this.joie) this.joie = [];
      while (this.joie.length < heads.length) {
        const el = document.createElement('div');
        el.className = 'stage-gain stage-joie';
        el.setAttribute('aria-hidden', 'true');
        el.textContent = JOIE;
        el.style.visibility = 'visible';
        this.ctx.labelLayer.appendChild(el);
        this.joie.push({ el, w: 0, h: 0 });
      }
      const f = heads.length ? this.screenFrame() : null;
      this.joie.forEach((b, i) => {
        const h = heads[i];
        if (!h) { b.el.hidden = true; return; }
        b.el.hidden = false;
        if (!b.w) { b.w = b.el.offsetWidth; b.h = b.el.offsetHeight; }
        const x = Math.round((h.x - f.left) * f.k - BUBBLE_TIP_X);
        const y = Math.round((h.y - f.top) * f.k - b.h + BUBBLE_TIP_Y);
        b.el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      });
    },

    // Meuble d'un intérieur sous le doigt (zone d'appui élargie à 44 px CSS) : sa fenêtre.
    propAt(wx, wy) {
      const min = (MIN_TAP * pixelRatio()) / this.cameras.main.zoom;
      let best = null;
      for (const p of this.room.props || []) {
        const s = p.sprite;
        if (!s || !s.visible || !p.clic) continue;
        const w = Math.max(s.width, min), h = Math.max(s.height, min);
        const cx = s.x, cy = s.y - s.height / 2;
        if (Math.abs(wx - cx) <= w / 2 && Math.abs(wy - cy) <= h / 2 && (!best || s.depth > best.depth)) best = s;
      }
      return best ? { window: best.getData('meuble') } : null;
    },

    // Meubles des intérieurs : absents, en filigrane ou construits (modèle.meubles).
    syncFurniture(meubles) {
      for (const r of Object.values(this.rooms)) {
        for (const p of r.props || []) {
          const m = meubles ? meubles[p.name] : null;
          const objet = m && typeof m === 'object';
          const st = objet ? 2 : m | 0;
          const dessin = objet ? m.dessin : p.name;
          const key = 'meuble_' + dessin;
          if (!st || !this.has(key) || (p.sprite && p.dessin !== dessin)) {
            if (p.sprite) { p.sprite.destroy(); p.sprite = null; }
            if (!st || !this.has(key)) continue;
          }
          if (!p.sprite) {
            const flat = MEUBLE_PLAT.test(dessin);
            p.sprite = this.add.image(Math.round(p.x + p.w / 2), p.y + p.h, key).setOrigin(0.5, 1).setDepth(flat ? 1 : p.y + p.h);
            p.sprite.setData('meuble', p.name);
            p.dessin = dessin;
          }
          p.clic = !objet;                       // four, cuisine, frigo : leur fenêtre
          p.sprite.setAlpha(st === 1 ? MEUBLE_GHOST : 1);
        }
      }
    },

    // Intérieurs : les emplacements que le joueur n'a pas encore sont assombris (sinon rien
    // ne distingue une parcelle vide de la terre du bac), puis la vue entre ou sort selon
    // modèle.interieur.
    syncRooms(model, force) {
      const rooms = Object.values(this.rooms);
      const key = rooms.map((r) => (model[r.def.plots] || []).length).join();
      if (key !== this.shadeKey && this.roomShade) {
        this.shadeKey = key;
        this.roomShade.clear();
        for (const r of rooms) {
          this.roomShade.fillStyle(global.Phaser.Display.Color.HexStringToColor(r.bg).color, ROOM_SHADE);
          for (let i = (model[r.def.plots] || []).length; i < r.slots.length; i++) this.roomShade.fillRect(r.slots[i].x, r.slots[i].y, T, T);
        }
      }
      this.syncFurniture(model.meubles);
      const want = model.interieur && this.rooms[model.interieur] ? this.rooms[model.interieur] : null;
      if (want !== this.room) this.setRoom(want, force);
    },

    // Entre dans un intérieur (ou en sort, `room` nul) : la vue saute, avec un court fondu.
    // À la sortie, elle revient devant le bâtiment.
    setRoom(room, now) {
      const cam = this.cameras.main;
      const left = this.room;
      this.vx = this.vy = 0;
      this.pan = null;
      this.drag = null;
      this.setHover(null);
      if (room && !left) this.outside = { x: this.cx, y: this.cy };
      this.room = room;
      this.roomPanned = false;
      const back = !room && left ? this.place(left.def.building) || this.outside : null;
      if (back) { this.cx = back.x; this.cy = back.y; }
      cam.setBackgroundColor(room ? room.bg : '#6a8157');
      this.ctx.labelLayer.style.visibility = room ? 'hidden' : '';
      this.game.canvas.style.cursor = '';
      this.fit();
      if (!now && !reducedMotion()) {
        const c = global.Phaser.Display.Color.HexStringToColor((room || left || { bg: '#06182a' }).bg);
        cam.fadeIn(ROOM_FADE_MS, c.red, c.green, c.blue);
      }
    },
  });
})(window);
