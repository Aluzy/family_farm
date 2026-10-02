/* farm-stage.js — la carte de la ferme, dessinée avec Phaser 3.
 *
 * Règles d'architecture (voir docs/architecture-phaser.md) :
 *   1. Ce fichier ne lit JAMAIS l'état du jeu. Il reçoit un « modèle de vue »
 *      (objet simple, voir stageModel() dans jeu.html) et l'affiche.
 *   2. Il n'écrit JAMAIS dans le jeu. Un appui sur la carte appelle
 *      bridge.act(action, données) : la page déclenche alors la même
 *      action `data-action` qu'un bouton du DOM (même code, mêmes fenêtres,
 *      même suivi de session).
 *   3. sync(modèle) est idempotent : appelé 5 fois par seconde avec le même
 *      modèle, il ne fait rien ; appelé avec un modèle différent, il crée,
 *      met à jour ou détruit exactement ce qui a changé.
 *
 * La carte (Tiled, 36×19 tuiles de 16 px) fait trois écrans de large : le zoom
 * montre toute sa hauteur et le doigt (ou la souris) la fait glisser.
 *
 * API publique : FarmStage.mount(element, { act, base }) puis
 *                FarmStage.update(modèle), FarmStage.show(), FarmStage.hide(),
 *                FarmStage.ready() (la scène est-elle affichable ?).
 */
(function (global) {
  'use strict';

  const T = 16;
  // Une seule carte pour l'instant (printemps), utilisée aux quatre saisons.
  const MAP = { key: 'map_sp', json: 'carte_printemps.json', tiles: 'tiles_sp', image: 'farm_spring_summer.png' };
  const SEASON_SUFFIX = { printemps: 'sp', ete: 'sp', automne: 'au', hiver: 'wi' };
  const SUFFIXES = ['sp', 'au', 'wi'];
  // Sans carte : mêmes dimensions et mêmes rectangles que carte_printemps.json.
  const DEFAULT_W = 36 * T;
  const DEFAULT_H = 19 * T;
  const DEFAULT_OBJECTS = {
    maison: { x: 241.5, y: 47, width: 94, height: 95.6 },
    grange: { x: 33, y: 61.8, width: 126, height: 81.6 },
    zone_culture: { x: 193.7, y: 177.2, width: 61, height: 94 },
    moulin: { x: 352, y: 159.1, width: 95.6, height: 127 },
    serre: { x: 464.1, y: 81.6, width: 94, height: 78.3 },
    verger: { x: 353.1, y: 111.7, width: 12.8, height: 15.9 },
  };
  // serre_*.png : deux découpes possibles (largeur × hauteur depuis le coin haut-gauche).
  //   « batiment » : la verrière seule, de la taille du rectangle `serre` de la carte ;
  //   « cour »     : la verrière et sa cour pavée (tout le haut de la planche, au-dessus des bacs).
  const SERRE_FRAMES = {
    batiment: { sp: [94, 83], au: [93, 83], wi: [94, 83] },
    cour: { sp: [177, 144], au: [176, 145], wi: [177, 144] },
  };
  const SERRE_FRAME = 'batiment';
  // Bâtiments : `object` = rectangle nommé de la carte (le bas-centre de l'image se pose sur
  // le bas-centre du rectangle), `window` = fenêtre ouverte par un appui. La maison est
  // toujours là ; les autres n'apparaissent que si modèle.batiments[id] est vrai.
  const BUILDINGS = [
    { id: 'maison', object: 'maison', tex: 'house', seasonal: true, window: 'maison' },
    { id: 'etable', object: 'grange', tex: 'barn', seasonal: true, window: 'etable' },
    { id: 'moulin', object: 'moulin', tex: 'windmill', seasonal: true, window: 'moulin', anim: true },
    { id: 'serre', object: 'serre', tex: 'serre', seasonal: true, window: 'serre', frame: SERRE_FRAME },
    { id: 'verger', object: 'verger', tex: 'sign', seasonal: false, window: 'verger' },
  ];
  const MILL_FRAME = { frameWidth: 96, frameHeight: 128 };

  const TAP_SLOP = 8;          // px CSS : au-delà, le geste est un glissement, pas un appui
  const MIN_TAP = 44;          // px CSS : taille minimale de la zone d'appui d'un bâtiment
  const INERTIA_MS = 260;      // constante de temps de l'élan après un glissement
  const MAX_SPEED = 1.5;       // px de carte par ms

  // Cases de crops.png : r = rangée de la base de la plante, h = hauteur du dessin
  // (16 ou 32), c = colonnes des 4 phases.
  const CROP_SP = {
    carotte:   { r: 1,  h: 32, c: [0, 1, 2, 3] },
    patate:    { r: 3,  h: 32, c: [0, 1, 2, 3] },
    tomate:    { r: 9,  h: 32, c: [9, 10, 12, 13] },
    courgette: { r: 11, h: 16, c: [0, 1, 3, 4] },
    aubergine: { r: 7,  h: 16, c: [9, 10, 11, 12] },
    poivron:   { r: 11, h: 32, c: [9, 10, 12, 13] },
    oignon:    { r: 3,  h: 32, c: [9, 10, 11, 12] },
    ail:       { r: 3,  h: 32, c: [9, 10, 11, 12] },
    epinard:   { r: 6,  h: 16, c: [0, 1, 2, 4] },
    fraise:    { r: 4,  h: 16, c: [9, 10, 12, 13] },
    ble:       { r: 6,  h: 32, c: [9, 10, 11, 12] },
    tournesol: { r: 13, h: 32, c: [0, 1, 2, 3] },
    riz:       { r: 6,  h: 32, c: [9, 10, 11, 12] },
    houblon:   { r: 1,  h: 32, c: [9, 10, 11, 13] },
    cacao:     { r: 11, h: 32, c: [9, 10, 12, 13] },
    vanille:   { r: 11, h: 32, c: [9, 10, 12, 13] },
    cafe:      { r: 11, h: 32, c: [9, 10, 12, 13] },
  };

  let game = null;
  let scene = null;
  let host = null;
  let bridge = null;
  let lastModel = null;     // dernier modèle reçu (appliqué dès que la scène est prête)
  let lastKey = '';
  let visible = false;
  let awake = false;        // la boucle Phaser tourne et la taille est à jour

  const clamp = (v, lo, hi) => (hi < lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));

  // Le canvas est rendu à la densité de l'écran (plafonnée à 3) : avec un zoom non entier,
  // les pixels de la carte restent réguliers.
  function pixelRatio() { return Math.min(3, Math.max(1, global.devicePixelRatio || 1)); }

  function reducedMotion() {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function mount(element, options) {
    if (!global.Phaser) return false;      // pas de Phaser : la page garde son affichage classique
    if (game) return true;
    host = element;
    bridge = options;
    const base = (options && options.base) || 'assets/';

    class FarmScene extends global.Phaser.Scene {
      constructor() {
        super('farm');
        this.plots = new Map();          // id de parcelle -> { soil, crop, key, tween }
        this.buildings = new Map();      // id de bâtiment -> { def, sprite }
        this.world = { w: DEFAULT_W, h: DEFAULT_H };
        this.objects = Object.assign({}, DEFAULT_OBJECTS);
        this.grid = { x: 192, y: 176, cols: 2 };
        this.cx = DEFAULT_W / 2;         // centre de la vue, en px de carte
        this.cy = DEFAULT_H / 2;
        this.drag = null;                // glissement en cours
        this.vx = 0;                     // élan (px de carte par ms)
        this.vy = 0;
        this.sfx = null;
        this.missing = new Set();
      }

      preload() {
        const L = this.load;
        L.setPath(base);
        L.on('loaderror', (file) => this.missing.add(file.key));
        L.image('crops', 'crops.png');
        L.image('soil_dry', 'soil_dry.png');
        L.image('soil_wet', 'soil_wet.png');
        L.image('sign', 'sign.png');
        L.tilemapTiledJSON(MAP.key, MAP.json);
        L.image(MAP.tiles, MAP.image);
        for (const a of SUFFIXES) {
          L.image('house_' + a, 'house_' + a + '.png');
          L.image('barn_' + a, 'barn_' + a + '.png');
          L.image('serre_' + a, 'serre_' + a + '.png');
          L.spritesheet('windmill_' + a, 'windmill_' + a + '.png', MILL_FRAME);
        }
      }

      create() {
        this.cameras.main.setBackgroundColor('#699654'); // vert de l'herbe de la carte
        this.cameras.main.roundPixels = false;
        this.makePlaceholders();
        this.defineFrames();
        this.defineAnims();
        this.bakeGround();
        this.add.image(0, 0, 'ground').setOrigin(0).setDepth(0);

        const z = this.objects.zone_culture;
        this.grid.x = Math.round(z.x / T) * T;
        this.grid.y = Math.round(z.y / T) * T;
        this.cx = this.world.w / 2;      // départ : l'écran du milieu (maison + zone de culture)
        this.cy = this.world.h / 2;

        const I = this.input;
        I.on('pointerdown', this.onDown, this);
        I.on('pointermove', this.onMove, this);
        I.on('pointerup', (p) => this.onUp(p, true));
        I.on('pointerupoutside', (p) => this.onUp(p, false));
        I.on('wheel', (p, over, dx, dy) => { this.vx = this.vy = 0; this.setCentre(this.cx + ((dx || dy) * pixelRatio()) / this.cameras.main.zoom, this.cy); });
        this.scale.on('resize', () => this.fit());
        this.fit();
        this.ready = true;
        if (lastModel) this.sync(lastModel, true);
      }

      /* ---------- textures ---------- */

      has(key) { return this.textures.exists(key) && !this.missing.has(key); }
      tex(key, fallback) { return this.has(key) ? key : fallback; }

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
        bake('ph_wet', 16, 16, (d) => { d.fillStyle(0x5b3a1c).fillRect(0, 0, 16, 16); d.fillStyle(0x4a2f16).fillRect(0, 5, 16, 2).fillRect(0, 11, 16, 2); });
        bake('ph_maison', 93, 97, shed(0xc9a26b, 0xa8472f, 93, 97));
        bake('ph_etable', 104, 93, shed(0x8a5a34, 0x5a3a1a, 104, 93));
        bake('ph_moulin', 96, 128, shed(0xd8c7a3, 0x6b4423, 96, 128));
        bake('ph_serre', 96, 80, shed(0x9fd3c7, 0x4f8a7a, 96, 80));
        bake('ph_verger', 17, 16, (d) => { d.fillStyle(0x6b4423).fillRect(7, 8, 3, 8); d.fillStyle(0xb98a4e).fillRect(1, 1, 15, 8); });
        g.destroy();
      }

      // Découpes définies ici, dans le code (pas de fichier JSON à charger) :
      // crops.png, une image « culture:phase » par case ; serre_*.png, le bâtiment seul.
      defineFrames() {
        if (this.has('crops')) {
          const t = this.textures.get('crops');
          for (const [name, sp] of Object.entries(CROP_SP)) {
            sp.c.forEach((col, phase) => t.add(name + ':' + phase, 0, col * T, (sp.r + 1) * T - sp.h, T, sp.h));
          }
        }
        for (const a of SUFFIXES) {
          if (!this.has('serre_' + a)) continue;
          const t = this.textures.get('serre_' + a);
          const img = t.getSourceImage();
          for (const [name, sizes] of Object.entries(SERRE_FRAMES)) {
            t.add(name, 0, 0, 0, Math.min(sizes[a][0], img.width), Math.min(sizes[a][1], img.height));
          }
        }
      }

      defineAnims() {
        for (const a of SUFFIXES) {
          const key = 'windmill_' + a;
          if (this.has(key) && !this.anims.exists(key)) {
            this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, { start: 0, end: 3 }), frameRate: 5, repeat: -1 });
          }
        }
      }

      /* ---------- carte Tiled ---------- */

      // Toutes les couches de tuiles sont dessinées une fois dans une seule image (texture
      // « ground ») : pas de liseré entre les tuiles quand le zoom n'est pas entier. Les
      // rectangles nommés de la couche d'objets (maison, grange, zone_culture…) sont relevés.
      bakeGround() {
        const ok = this.cache.tilemap.exists(MAP.key) && !this.missing.has(MAP.key);
        const raw = ok ? this.cache.tilemap.get(MAP.key).data : null;
        const valid = !!(raw && raw.width && raw.height && raw.tilewidth && Array.isArray(raw.layers));
        if (valid) this.world = { w: raw.width * raw.tilewidth, h: raw.height * raw.tileheight };
        const tex = this.textures.createCanvas('ground', this.world.w, this.world.h);
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#699654';
        ctx.fillRect(0, 0, this.world.w, this.world.h);
        if (valid) {
          const img = this.has(MAP.tiles) ? this.textures.get(MAP.tiles).getSourceImage() : null;
          // Jeu de tuiles : celui dont l'image est la planche chargée (intégré dans le JSON).
          const set = (raw.tilesets || []).find((s) => s.image && String(s.image).split('/').pop() === MAP.image);
          if (!set) console.warn('[FarmStage] jeu de tuiles ' + MAP.image + ' introuvable dans la carte (est-il intégré ?)');
          for (const layer of raw.layers) {
            if (layer.type === 'objectgroup') {
              for (const o of layer.objects || []) if (o.name) this.objects[o.name] = o;
            } else if (layer.type === 'tilelayer' && layer.visible !== false && img && set && Array.isArray(layer.data)) {
              this.drawLayer(ctx, raw, layer, set, img);
            }
          }
        }
        tex.refresh();
      }

      drawLayer(ctx, raw, layer, set, img) {
        const tw = raw.tilewidth, th = raw.tileheight;
        const cols = set.columns || Math.floor(img.width / tw);
        const last = set.firstgid + (set.tilecount || cols * Math.floor(img.height / th));
        ctx.globalAlpha = layer.opacity == null ? 1 : layer.opacity;
        layer.data.forEach((cell, i) => {
          const gid = cell & 0x0fffffff;                   // les bits de poids fort sont des retournements
          if (!gid || gid < set.firstgid || gid >= last) return; // 0 = case vide
          const n = gid - set.firstgid;
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
        });
        ctx.globalAlpha = 1;
      }

      /* ---------- caméra : zoom, glissement, élan ---------- */

      // Zoom : toute la hauteur de la carte est visible et la zone est entièrement couverte
      // (jamais de bande, jamais rien hors de la carte). Le centre courant est conservé.
      fit() {
        const w = this.scale.width, h = this.scale.height;
        if (!w || !h) return;
        const cam = this.cameras.main;
        cam.setSize(w, h);
        cam.setZoom(Math.max(h / this.world.h, w / this.world.w));
        cam.setBounds(0, 0, this.world.w, this.world.h);
        this.setCentre(this.cx, this.cy);
      }

      // Centre la vue sur (cx, cy) sans jamais sortir de la carte. Renvoie false si la
      // position demandée a été bornée (bord atteint).
      setCentre(cx, cy) {
        const cam = this.cameras.main;
        const vw = this.scale.width / cam.zoom, vh = this.scale.height / cam.zoom;
        this.cx = clamp(cx, vw / 2, this.world.w - vw / 2);
        this.cy = clamp(cy, vh / 2, this.world.h - vh / 2);
        cam.centerOn(this.cx, this.cy);
        return Math.abs(this.cx - cx) < 0.01 && Math.abs(this.cy - cy) < 0.01;
      }

      onDown(pointer) {
        if (this.drag) return;
        this.vx = this.vy = 0;
        const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.drag = {
          id: pointer.id, x: pointer.x, y: pointer.y, cx: this.cx, cy: this.cy,
          wx: wp.x, wy: wp.y, moved: false, vx: 0, vy: 0,
          lastX: pointer.x, lastY: pointer.y, lastT: performance.now(),
        };
      }

      onMove(pointer) {
        const d = this.drag;
        if (!d) {
          // Souris : main sur ce qui se touche, poignée ailleurs.
          if (!pointer.wasTouch) {
            const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            this.game.canvas.style.cursor = this.hitAt(wp.x, wp.y) ? 'pointer' : 'grab';
          }
          return;
        }
        if (d.id !== pointer.id) return;
        if (!pointer.isDown) { this.drag = null; return; }   // relâché hors de la page
        const zoom = this.cameras.main.zoom;
        const dx = pointer.x - d.x, dy = pointer.y - d.y;
        if (!d.moved && Math.hypot(dx, dy) >= TAP_SLOP * pixelRatio()) {
          d.moved = true;
          this.game.canvas.style.cursor = 'grabbing';
        }
        this.setCentre(d.cx - dx / zoom, d.cy - dy / zoom);
        const now = performance.now();
        const dt = now - d.lastT;
        if (dt > 0) {
          d.vx = 0.7 * (-(pointer.x - d.lastX) / zoom / dt) + 0.3 * d.vx;
          d.vy = 0.7 * (-(pointer.y - d.lastY) / zoom / dt) + 0.3 * d.vy;
          d.lastX = pointer.x; d.lastY = pointer.y; d.lastT = now;
        }
      }

      onUp(pointer, inside) {
        const d = this.drag;
        if (!d || d.id !== pointer.id) return;
        this.drag = null;
        this.game.canvas.style.cursor = '';
        if (!d.moved) {
          // Appui : la vue revient où elle était (elle a pu bouger de quelques pixels).
          this.setCentre(d.cx, d.cy);
          if (inside) this.tap(d.wx, d.wy);
          return;
        }
        // Élan léger, seulement si le doigt bougeait encore au moment du relâchement.
        if (reducedMotion() || performance.now() - d.lastT > 80) return;
        this.vx = clamp(d.vx, -MAX_SPEED, MAX_SPEED);
        this.vy = clamp(d.vy, -MAX_SPEED, MAX_SPEED);
      }

      update(time, delta) {
        if (!this.vx && !this.vy) return;
        if (this.drag) { this.vx = this.vy = 0; return; }
        const dt = Math.min(delta, 50);
        const free = this.setCentre(this.cx + this.vx * dt, this.cy + this.vy * dt);
        const k = Math.exp(-dt / INERTIA_MS);
        this.vx *= k; this.vy *= k;
        if (!free || Math.hypot(this.vx, this.vy) < 0.01) this.vx = this.vy = 0;
      }

      /* ---------- appuis ---------- */

      // Ce qui se trouve sous un point de la carte : une parcelle (exactement sa tuile),
      // sinon le bâtiment le plus en avant.
      hitAt(wx, wy) {
        const m = lastModel;
        const g = this.grid;
        if (m) {
          const col = Math.floor((wx - g.x) / T), row = Math.floor((wy - g.y) / T);
          if (col >= 0 && col < g.cols && row >= 0) {
            const p = m.plots[row * g.cols + col];
            if (p) return { plot: p };
          }
        }
        const min = (MIN_TAP * pixelRatio()) / this.cameras.main.zoom;
        let best = null;
        for (const e of this.buildings.values()) {
          const s = e.sprite;
          const padX = Math.max(0, (min - s.width) / 2), padY = Math.max(0, (min - s.height) / 2);
          if (wx < s.x - padX || wx > s.x + s.width + padX || wy < s.y - s.height - padY || wy > s.y + padY) continue;
          if (!best || s.depth > best.sprite.depth) best = e;
        }
        return best ? { building: best.def } : null;
      }

      tap(wx, wy) {
        const hit = this.hitAt(wx, wy);
        if (!hit) return;
        if (hit.building) { bridge.act('stage-open', { window: hit.building.window }); return; }
        const p = hit.plot;
        if (!p.culture) bridge.act('plant-open', { id: p.id });
        else if (p.mature) bridge.act('harvest', { id: p.id });
        else if (!p.arrosee) bridge.act('water', { id: p.id });
        else bridge.act('stage-open', { window: 'zone' });   // rien à faire sur la carte : la fenêtre de la zone
      }

      /* ---------- synchronisation avec le jeu ---------- */

      sync(model, force) {
        if (!this.ready) return;
        const sfx = SEASON_SUFFIX[model.season] || 'sp';
        const seasonChanged = force || this.sfx !== sfx;
        this.sfx = sfx;

        // Bâtiments : présents seulement si le jeu les a débloqués ; image de la saison.
        const shown = model.batiments || {};
        for (const def of BUILDINGS) {
          const want = def.id === 'maison' || !!shown[def.id];
          const e = this.buildings.get(def.id);
          if (e && (!want || seasonChanged)) { e.sprite.destroy(); this.buildings.delete(def.id); }
          if (want && !this.buildings.has(def.id)) this.buildings.set(def.id, { def, sprite: this.makeBuilding(def, sfx) });
        }

        // Parcelles : on crée, met à jour, détruit. Tuiles jointives depuis le coin de zone_culture.
        const g = this.grid;
        g.cols = Math.max(1, model.cols | 0);
        const seen = new Set();
        model.plots.forEach((p, i) => {
          seen.add(p.id);
          const x = g.x + (i % g.cols) * T + T / 2;
          const y = g.y + Math.floor(i / g.cols) * T + T / 2;
          let e = this.plots.get(p.id);
          if (!e) {
            e = { soil: this.add.image(x, y, 'ph_dry').setDepth(2), crop: null, key: '', tween: null };
            this.plots.set(p.id, e);
          }
          e.soil.setPosition(x, y).setTexture(p.arrosee ? this.tex('soil_wet', 'ph_wet') : this.tex('soil_dry', 'ph_dry'));
          this.syncCrop(e, p, x, y);
        });
        for (const [id, e] of this.plots) {
          if (!seen.has(id)) { this.destroyPlot(e); this.plots.delete(id); }
        }
      }

      // Pose le bas-centre de l'image sur le bas-centre du rectangle de la carte, sans sortir
      // de la carte. Profondeur = y du pied : ce qui est plus bas passe devant.
      makeBuilding(def, sfx) {
        const o = this.objects[def.object] || DEFAULT_OBJECTS[def.object];
        const wanted = def.seasonal ? def.tex + '_' + sfx : def.tex;
        const key = this.tex(wanted, this.tex(def.seasonal ? def.tex + '_sp' : def.tex, 'ph_' + def.id));
        const real = key.indexOf('ph_') !== 0;
        let s;
        if (def.anim && real) {
          s = this.add.sprite(0, 0, key, 0);
          if (this.anims.exists(key) && !reducedMotion()) s.play(key);
        } else {
          s = this.add.image(0, 0, key, real && def.frame ? def.frame : undefined);
        }
        s.setOrigin(0, 1);
        const x = clamp(Math.round(o.x + o.width / 2 - s.width / 2), 0, this.world.w - s.width);
        const y = clamp(Math.round(o.y + o.height), s.height, this.world.h);
        s.setPosition(Math.round(x), Math.round(y)).setDepth(Math.round(y));
        return s;
      }

      syncCrop(e, p, x, y) {
        const key = p.culture ? p.culture + ':' + p.phase : '';
        if (key !== e.key) {
          if (e.crop) { if (e.tween) e.tween.stop(); e.crop.destroy(); e.crop = null; e.tween = null; }
          e.key = key;
          if (p.culture) {
            const framed = this.has('crops') && CROP_SP[p.culture];
            if (framed) {
              e.crop = this.add.image(x, y + T / 2, 'crops', key).setOrigin(0.5, 1);
            } else {
              // Sans image : l'emoji de la culture, grossit avec les phases.
              e.crop = this.add.text(x, y + 6, p.icone, { fontSize: '12px' }).setOrigin(0.5, 1).setScale(0.45 + 0.18 * Math.max(0, p.phase));
            }
            e.crop.setDepth(y + 1);
            // Petite apparition : la case « change » sous les yeux du joueur.
            e.crop.setAlpha(0);
            this.tweens.add({ targets: e.crop, alpha: 1, duration: 250 });
          }
        }
        if (e.crop) e.crop.setPosition(x, e.crop.type === 'Text' ? y + 6 : y + T / 2);
        // Mûre : la plante se balance doucement pour attirer l'appui.
        if (e.crop && p.mature && !e.tween && !reducedMotion()) {
          e.tween = this.tweens.add({ targets: e.crop, angle: { from: -4, to: 4 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        }
        if (e.crop && !p.mature && e.tween) { e.tween.stop(); e.tween = null; e.crop.setAngle(0); }
      }

      destroyPlot(e) {
        if (e.tween) e.tween.stop();
        if (e.crop) e.crop.destroy();
        e.soil.destroy();
      }
    }

    const dpr = pixelRatio();
    game = new global.Phaser.Game({
      type: global.Phaser.AUTO,
      parent: element,
      // Pixels nets sans arrondi des positions : le zoom n'est pas entier, et des sommets
      // arrondis un par un ouvriraient des fentes entre parcelles voisines.
      render: { antialias: false, antialiasGL: false, roundPixels: false },
      transparent: false,
      backgroundColor: '#699654',
      // Taille du jeu = taille de la zone × densité de l'écran ; resize() la tient à jour.
      scale: {
        mode: global.Phaser.Scale.NONE,
        width: Math.max(1, Math.round((element.clientWidth || 320) * dpr)),
        height: Math.max(1, Math.round((element.clientHeight || 480) * dpr)),
        zoom: 1 / dpr,
        expandParent: false,
        autoRound: false,
      },
      // Le toucher est capturé (pas de défilement de page ni de clic fantôme après un appui).
      input: { keyboard: false, gamepad: false, touch: { capture: true } },
      audio: { noAudio: true },
      banner: false,
      scene: [FarmScene],
    });
    game.events.once('ready', () => {
      scene = game.scene.getScene('farm');
      if (visible) { awake = false; show(); } else game.loop.sleep();
    });

    if (global.ResizeObserver) new global.ResizeObserver(resize).observe(element);
    global.addEventListener('resize', resize);
    // Avant chaque geste, Phaser doit connaître la position exacte du canvas dans la page
    // (le bandeau peut changer de hauteur sans que la fenêtre soit redimensionnée).
    const refreshBounds = () => { if (game && game.isBooted) game.scale.updateBounds(); };
    element.addEventListener('touchstart', refreshBounds, { capture: true, passive: true });
    element.addEventListener('mousedown', refreshBounds, true);
    // Un clic sur le canvas est déjà traité par la scène : il ne remonte pas à la page.
    element.addEventListener('click', (e) => { if (game && e.target === game.canvas) e.stopPropagation(); });
    return true;
  }

  // Aligne la taille du jeu sur celle de la zone (× densité de l'écran).
  function resize() {
    if (!game || !game.isBooted || !host) return;
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;                  // zone masquée
    const dpr = pixelRatio();
    const gw = Math.round(w * dpr), gh = Math.round(h * dpr);
    game.scale.zoom = 1 / dpr;
    if (gw !== game.scale.width || gh !== game.scale.height) game.scale.resize(gw, gh);
    else game.scale.updateBounds();
  }

  function getScene() { return game && (scene || (scene = game.scene.getScene('farm'))); }

  function ready() { const s = getScene(); return !!(s && s.ready); }

  function update(model) {
    lastModel = model;
    if (!game || !visible) return;
    const key = JSON.stringify(model);
    if (key === lastKey) return;
    lastKey = key;
    const s = getScene();
    if (s && s.ready) s.sync(model);
  }

  function show() {
    visible = true;
    if (!game) return;
    // Phaser démarre seulement quand la page a fini de charger : avant, rien à rafraîchir.
    // La scène appliquera elle-même le dernier modèle reçu dans create().
    if (!game.isBooted || awake) return;
    awake = true;
    game.loop.wake();
    resize();
    lastKey = '';
    if (lastModel) update(lastModel);
  }

  function hide() {
    visible = false;
    awake = false;
    if (game && game.isBooted) game.loop.sleep();
  }

  global.FarmStage = { mount, update, show, hide, ready, scene: getScene }; // scene() : pour le débogage et les tests
})(window);
