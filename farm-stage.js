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
 * Par-dessus la carte, la scène pose des étiquettes en DOM (nom du bâtiment et pastille
 * « à faire », données par le modèle) qu'elle replace à chaque image, et un voile de
 * lumière qui suit l'heure du modèle (aube, plein jour, soir, nuit).
 *
 * API publique : FarmStage.mount(element, { act, onView, base }) puis
 *                FarmStage.update(modèle), FarmStage.show(), FarmStage.hide(),
 *                FarmStage.ready() (la scène est-elle affichable ?),
 *                FarmStage.view() (où en est la vue : écran 0, 1 ou 2, bornes),
 *                FarmStage.panTo(x ou id de bâtiment) (glisse jusque-là).
 *                onView(vue) est appelé quand l'écran courant change, quand un bord est
 *                atteint ou quitté, et au premier glissement du joueur.
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
  // toujours là ; les autres n'apparaissent que si modèle.batiments[id].visible est vrai.
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
  const PAN_MS = 380;          // durée d'un déplacement demandé par panTo()
  const SCREENS = 3;           // la carte fait trois écrans : gauche, milieu, droite
  const LABEL_GAP = 3;         // px CSS entre l'étiquette et ce qu'elle nomme
  const ZONE_LABEL_UP = 14;    // px de carte : l'étiquette de la zone passe au-dessus de la barrière
  const LIGHT_MS = 1200;       // fondu entre deux lumières (un quart d'heure de jeu dure à peu près autant)

  // Lumière selon l'heure : couleur par laquelle la carte est multipliée (blanc = plein jour).
  // Aube chaude à 6 h, plein jour de 9 h à 16 h, lumière dorée de 17 h à 19 h, crépuscule
  // vers 20-21 h, nuit bleue de 22 h à 5 h. La nuit reste claire : la carte doit rester jouable.
  const LIGHT_KEYS = [
    [0, 0x8494d0], [5, 0x8494d0], [6, 0xf0d2b4], [7.5, 0xfff0dc], [9, 0xffffff], [16, 0xffffff],
    [17.5, 0xffe2b0], [19, 0xfac48e], [20, 0xcfa0a8], [21, 0xa490c2], [22, 0x8494d0], [24, 0x8494d0],
  ];

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

  let labelLayer = null;     // calque DOM des étiquettes, par-dessus le canvas

  const clamp = (v, lo, hi) => (hi < lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));

  // Couleur de la lumière à une heure donnée (0 à 24, fractionnaire) : [r, v, b] de 0 à 255,
  // interpolée entre les deux repères voisins de LIGHT_KEYS.
  function lightAt(hour) {
    const h = ((Number(hour) % 24) + 24) % 24;
    let i = 0;
    while (i < LIGHT_KEYS.length - 2 && h >= LIGHT_KEYS[i + 1][0]) i++;
    const a = LIGHT_KEYS[i], b = LIGHT_KEYS[i + 1];
    const t = clamp((h - a[0]) / (b[0] - a[0]), 0, 1);
    return [16, 8, 0].map((s) => ((a[1] >> s) & 255) + (((b[1] >> s) & 255) - ((a[1] >> s) & 255)) * t);
  }

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
    labelLayer = document.createElement('div');
    labelLayer.className = 'stage-labels';
    element.appendChild(labelLayer);

    class FarmScene extends global.Phaser.Scene {
      constructor() {
        super('farm');
        this.plots = new Map();          // id de parcelle -> { soil, crop, key, tween }
        this.buildings = new Map();      // id de bâtiment -> { def, sprite }
        this.labels = new Map();         // id de lieu -> étiquette DOM et son point d'ancrage
        this.pan = null;                 // déplacement demandé par panTo() : { from, to, t0 }
        this.dragged = false;            // le joueur a-t-il déjà fait glisser la carte ?
        this.viewKey = '';               // dernière vue signalée à la page
        this.light = null;               // voile de lumière (rectangle en mode « multiplier »)
        this.lightNow = [255, 255, 255]; // couleur affichée
        this.lightFade = null;           // fondu en cours : { from, to, t0 }
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
        // Voile de lumière : il couvre toute la carte, au-dessus des bâtiments et des
        // plantes, et multiplie leurs couleurs (blanc = aucun effet). Les étiquettes et les
        // boutons, en DOM, restent au-dessus et gardent leurs couleurs.
        this.light = this.add.rectangle(0, 0, this.world.w, this.world.h, 0xffffff)
          .setOrigin(0).setDepth(1e6).setBlendMode(global.Phaser.BlendModes.MULTIPLY).setVisible(false);

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
        I.on('wheel', (p, over, dx, dy) => { this.vx = this.vy = 0; this.pan = null; this.setCentre(this.cx + ((dx || dy) * pixelRatio()) / this.cameras.main.zoom, this.cy); });
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
        // Un deuxième doigt est ignoré ; le même pointeur qui rappuie repart de zéro (cas d'un
        // relâchement perdu, par exemple hors de la fenêtre).
        if (this.drag && this.drag.id !== pointer.id) return;
        this.vx = this.vy = 0;
        this.pan = null;
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
          this.dragged = true;           // signalé à la page par reportView()
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
        const dt = Math.min(delta, 50);
        // Déplacement et fondu suivent l'horloge réelle : ils durent le même temps même
        // si les images sont lentes (Phaser plafonne `delta`).
        if (this.pan) this.stepPan();
        else if (this.vx || this.vy) this.stepInertia(dt);
        if (this.lightFade) this.stepLight();
        this.placeLabels();
        this.reportView();
      }

      stepInertia(dt) {
        if (this.drag) { this.vx = this.vy = 0; return; }
        const free = this.setCentre(this.cx + this.vx * dt, this.cy + this.vy * dt);
        const k = Math.exp(-dt / INERTIA_MS);
        this.vx *= k; this.vy *= k;
        if (!free || Math.hypot(this.vx, this.vy) < 0.01) this.vx = this.vy = 0;
      }

      /* ---------- vue : écran courant, déplacement demandé ---------- */

      // Où en est la vue, pour la page : `ecran` = 0 (gauche), 1 (milieu) ou 2 (droite) ;
      // `min` et `max` = bornes du centre ; `mobile` = la carte dépasse-t-elle de la zone ?
      viewInfo() {
        const vw = this.scale.width / this.cameras.main.zoom;
        const min = vw / 2, max = this.world.w - vw / 2;
        const mobile = max - min > 1;
        const f = mobile ? (this.cx - min) / (max - min) : 0.5;
        return {
          x: this.cx, min, max, mobile, ecrans: SCREENS,
          ecran: mobile ? Math.round(f * (SCREENS - 1)) : 1,
          gauche: mobile && this.cx > min + 1,     // il reste de la carte à gauche
          droite: mobile && this.cx < max - 1,     // il reste de la carte à droite
          glisse: this.dragged,
        };
      }

      // Prévient la page quand quelque chose qu'elle affiche a changé (pas à chaque image).
      reportView() {
        if (!bridge || !bridge.onView) return;
        const v = this.viewInfo();
        const key = [v.ecran, v.mobile, v.gauche, v.droite, v.glisse].join();
        if (key === this.viewKey) return;
        this.viewKey = key;
        bridge.onView(v);
      }

      // Centre horizontal d'un lieu de la carte (bâtiment affiché ou zone de culture).
      placeX(id) {
        if (id === 'zone') return this.grid.x + (this.grid.cols * T) / 2;
        const e = this.buildings.get(id);
        return e ? e.sprite.x + e.sprite.width / 2 : null;
      }

      // Glisse jusqu'à x (px de carte) ou jusqu'à un lieu ('maison', 'etable', 'zone'…).
      // `now` : sans animation. Renvoie false si le lieu n'est pas sur la carte.
      panTo(target, now) {
        const x = typeof target === 'number' ? target : this.placeX(target);
        if (x === null || !Number.isFinite(x)) return false;
        this.vx = this.vy = 0;
        if (now || reducedMotion()) { this.pan = null; this.setCentre(x, this.cy); return true; }
        const v = this.viewInfo();
        this.pan = { from: this.cx, to: clamp(x, v.min, v.max), t0: performance.now() };
        return true;
      }

      stepPan() {
        const p = this.pan;
        const t = Math.min(1, (performance.now() - p.t0) / PAN_MS);
        const k = 1 - Math.pow(1 - t, 3);            // départ vif, arrivée douce
        this.setCentre(p.from + (p.to - p.from) * k, this.cy);
        if (t >= 1) this.pan = null;
      }

      /* ---------- lumière du jour ---------- */

      // Passe à la lumière de l'heure donnée : en fondu, ou tout de suite (`now`, premier
      // affichage, animations réduites).
      setLight(hour, now) {
        const to = hour == null ? [255, 255, 255] : lightAt(hour);
        if (now || reducedMotion()) { this.lightFade = null; this.applyLight(to); return; }
        this.lightFade = { from: this.lightNow.slice(), to, t0: performance.now() };
      }

      stepLight() {
        const f = this.lightFade;
        const t = Math.min(1, (performance.now() - f.t0) / LIGHT_MS);
        this.applyLight(f.from.map((c, i) => c + (f.to[i] - c) * t));
        if (t >= 1) this.lightFade = null;
      }

      applyLight(rgb) {
        this.lightNow = rgb;
        const c = rgb.map((v) => clamp(Math.round(v), 0, 255));
        const color = (c[0] << 16) | (c[1] << 8) | c[2];
        this.light.setFillStyle(color, 1).setVisible(color !== 0xffffff);
      }

      /* ---------- étiquettes (DOM) ---------- */

      // Une étiquette par lieu affiché : un bouton DOM qui ne reçoit pas les appuis (ils
      // traversent jusqu'à la carte, qui teste elle-même la zone de l'étiquette), mais qui
      // reste accessible au clavier : Entrée y déclenche `stage-open`, comme tout bouton.
      syncLabel(id, info, win, ax, ay, align) {
        let L = this.labels.get(id);
        if (!info) {
          if (L) { L.el.remove(); this.labels.delete(id); }
          return;
        }
        if (!L) {
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'stage-label';
          el.dataset.action = 'stage-open';
          el.dataset.window = win;
          el.innerHTML = '<span class="stage-label-name"></span><span class="stage-label-badge" hidden></span>';
          labelLayer.appendChild(el);
          L = { el, id, window: win, name: null, badge: null, w: 0, h: 0, tr: '', off: false };
          this.labels.set(id, L);
        }
        const name = String(info.nom || id), badge = Math.max(0, info.badge | 0);
        if (name !== L.name || badge !== L.badge) {
          L.name = name; L.badge = badge;
          L.el.firstChild.textContent = name;
          const b = L.el.lastChild;
          b.hidden = !badge;
          b.textContent = badge > 9 ? '9+' : String(badge);
          L.el.setAttribute('aria-label', badge ? name + ' : ' + badge + ' à faire' : name);
          L.el.classList.toggle('todo', !!badge);
          L.w = 0;                               // à remesurer
        }
        L.ax = ax; L.ay = ay; L.align = align || 'centre';
      }

      // Replace chaque étiquette au-dessus de son lieu (positions entières en pixels de
      // l'écran : le texte reste net, même avec un zoom non entier).
      placeLabels() {
        if (!this.labels.size) return;
        const dpr = pixelRatio();
        const k = this.cameras.main.zoom / dpr;                    // px CSS par px de carte
        const left = this.cx - this.scale.width / this.cameras.main.zoom / 2;
        const top = this.cy - this.scale.height / this.cameras.main.zoom / 2;
        const snap = (v) => Math.round(v * dpr) / dpr;
        for (const L of this.labels.values()) {
          if (!L.w) { L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; if (!L.w) continue; }
          const x = (L.ax - left) * k - (L.align === 'gauche' ? 0 : L.w / 2);
          const y = Math.max(0, (L.ay - top) * k - L.h - LABEL_GAP);
          const tr = 'translate(' + snap(x) + 'px,' + snap(y) + 'px)';
          if (tr !== L.tr) { L.tr = tr; L.el.style.transform = tr; }
          // Une étiquette dont il ne reste qu'un bout au bord de l'écran est masquée.
          const seen = Math.min(x + L.w, this.scale.width / dpr) - Math.max(x, 0);
          const off = seen < L.w * 0.6;
          if (off !== L.off) { L.off = off; L.el.style.visibility = off ? 'hidden' : ''; }
        }
      }

      // Étiquette sous un point de la carte : sa boîte, élargie à 44 px CSS au besoin.
      labelAt(wx, wy) {
        const k = this.cameras.main.zoom / pixelRatio();
        const top = this.cy - this.scale.height / this.cameras.main.zoom / 2;
        for (const L of this.labels.values()) {
          if (!L.w || L.off) continue;
          const w = Math.max(L.w, MIN_TAP) / k, h = Math.max(L.h, MIN_TAP) / k;
          const cx = L.align === 'gauche' ? L.ax + L.w / k / 2 : L.ax;
          const cy = Math.max(top + L.h / k / 2, L.ay - (LABEL_GAP + L.h / 2) / k);
          if (Math.abs(wx - cx) <= w / 2 && Math.abs(wy - cy) <= h / 2) return L;
        }
        return null;
      }

      /* ---------- appuis ---------- */

      // Ce qui se trouve sous un point de la carte : une parcelle (exactement sa tuile),
      // sinon une étiquette, sinon le bâtiment le plus en avant.
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
        const label = this.labelAt(wx, wy);
        if (label) return { window: label.window };
        const min = (MIN_TAP * pixelRatio()) / this.cameras.main.zoom;
        let best = null;
        for (const e of this.buildings.values()) {
          const s = e.sprite;
          const padX = Math.max(0, (min - s.width) / 2), padY = Math.max(0, (min - s.height) / 2);
          if (wx < s.x - padX || wx > s.x + s.width + padX || wy < s.y - s.height - padY || wy > s.y + padY) continue;
          if (!best || s.depth > best.sprite.depth) best = e;
        }
        return best ? { window: best.def.window } : null;
      }

      tap(wx, wy) {
        const hit = this.hitAt(wx, wy);
        if (!hit) return;
        if (hit.window) { bridge.act('stage-open', { window: hit.window }); return; }
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

        // Lumière de l'heure : en fondu, sauf au premier affichage.
        if (force || model.heure !== this.hour) { this.hour = model.heure; this.setLight(model.heure, force); }

        // Bâtiments : présents seulement si le jeu les a débloqués ; image de la saison.
        // modèle.batiments[id] = { visible, nom, badge } (ou un simple booléen).
        const shown = model.batiments || {};
        const info = (id) => {
          const v = shown[id];
          const o = v && typeof v === 'object' ? v : { visible: !!v };
          return (id === 'maison' || id === 'zone' || o.visible) ? o : null;
        };
        for (const def of BUILDINGS) {
          const want = info(def.id);
          const e = this.buildings.get(def.id);
          if (e && (!want || seasonChanged)) { e.sprite.destroy(); this.buildings.delete(def.id); }
          if (want && !this.buildings.has(def.id)) this.buildings.set(def.id, { def, sprite: this.makeBuilding(def, sfx) });
          // Étiquette : centrée au-dessus de l'image.
          const s = want ? this.buildings.get(def.id).sprite : null;
          this.syncLabel(def.id, want, def.window, s ? s.x + s.width / 2 : 0, s ? s.y - s.height + (def.labelDown || 0) : 0);
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
        // Étiquette de la zone de culture : calée à gauche sur les parcelles, au-dessus de la barrière.
        this.syncLabel('zone', info('zone'), 'zone', g.x, g.y - ZONE_LABEL_UP, 'gauche');
        this.placeLabels();
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

  // Où en est la vue (voir viewInfo()) ; null tant que la scène n'est pas prête.
  function view() { const s = getScene(); return s && s.ready ? s.viewInfo() : null; }

  // Glisse jusqu'à x (px de carte) ou jusqu'à un lieu ; false si ce n'est pas possible.
  function panTo(target, now) { const s = getScene(); return !!(s && s.ready && s.panTo(target, now)); }

  global.FarmStage = { mount, update, show, hide, ready, view, panTo, scene: getScene }; // scene() : pour le débogage et les tests
})(window);
