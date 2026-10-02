/* farm-stage.js — la carte de la ferme, dessinée avec Phaser 3.
 *
 * Règles d'architecture (voir ARCHITECTURE.md) :
 *   1. Ce fichier ne lit JAMAIS l'état du jeu. Il reçoit un « modèle de vue »
 *      (objet simple, voir stageModel() dans jeu.html) et l'affiche.
 *   2. Il n'écrit JAMAIS dans le jeu. Un clic sur la carte appelle
 *      bridge.act(action, données) : la page déclenche alors la même
 *      action `data-action` qu'un bouton du DOM (même code, mêmes fenêtres,
 *      même suivi de session).
 *   3. sync(modèle) est idempotent : appelé 5 fois par seconde avec le même
 *      modèle, il ne fait rien ; appelé avec un modèle différent, il crée,
 *      met à jour ou détruit exactement ce qui a changé.
 *
 * API publique : FarmStage.mount(element, { act, base }) puis
 *                FarmStage.update(modèle), FarmStage.show(), FarmStage.hide().
 *
 * Non testé contre un vrai Phaser (téléchargement impossible dans l'environnement
 * de rédaction) : à lancer une première fois avec la console ouverte.
 */
(function (global) {
  'use strict';

  const T = 16;
  const PITCH_FREE = 20;       // sans carte Tiled : pas entre deux parcelles (terre 16 px + 4 px d'allée)
  const PITCH_MAP = 16;        // avec carte Tiled : parcelles jointives sur la grille de 16 px
  // Cartes Tiled par jeu de tuiles saisonnier (la planche printemps/été sert aux deux).
  // Automne et hiver : pas de carte pour l'instant, la scène de secours est dessinée en code.
  const MAPS = { sp: { key: 'map_sp', json: 'ferme_printemps.json', tiles: 'tiles_sp', image: 'farm_spring_summer.png', tileset: 'farm_spring_summer' } };
  const WORLD_W = 12 * T;      // largeur logique de la carte : 192 px
  const SEASON_SUFFIX = { printemps: 'sp', ete: 'sp', automne: 'au', hiver: 'wi' };

  // Cases de crops.png (mêmes valeurs que le test jouable) : r = rangée de la
  // base de la plante, h = hauteur du dessin (16 ou 32), c = colonnes des 4 phases.
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

  function mount(element, options) {
    if (!global.Phaser) return false;      // pas de Phaser : la page garde son affichage classique
    if (game) return true;
    host = element;
    bridge = options;
    const base = (options && options.base) || 'assets/';

    class FarmScene extends global.Phaser.Scene {
      constructor() {
        super('farm');
        this.plots = new Map();          // id de parcelle -> { soil, zone, crop, key }
        this.world = { w: WORLD_W, h: 256 };
        this.maps = {};                  // sfx -> { layers, objects, w, h } quand la carte Tiled est chargée
        this.season = null;
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
        for (const m of Object.values(MAPS)) { L.tilemapTiledJSON(m.key, m.json); L.image(m.tiles, m.image); }
        for (const s of ['printemps', 'ete', 'automne', 'hiver']) L.image('grass_' + s, 'grass_' + s + '.png');
        for (const a of ['sp', 'au', 'wi']) {
          L.image('house_' + a, 'house_' + a + '.png');
          L.spritesheet('tree_' + a, 'basic_' + a + '.png', { frameWidth: 80, frameHeight: 80 });
          L.spritesheet('pine_' + a, 'pine_' + a + '.png', { frameWidth: 58, frameHeight: 64 });
        }
      }

      create() {
        this.cameras.main.setBackgroundColor('#699654'); // vert de l'herbe de la carte : les marges se fondent
        this.makePlaceholders();
        this.defineFrames();
        this.defineAnims();
        this.buildMaps();

        this.ground = this.add.tileSprite(0, 0, 10, 10, this.tex('grass_ete', 'ph_grass')).setOrigin(0).setDepth(0);
        this.house = this.add.image(0, 0, this.tex('house_sp', 'ph_house')).setOrigin(0.5, 1);
        this.fence = this.add.graphics().setDepth(1);
        this.trees = [];
        this.sceneryBuilt = false;

        this.houseZone = this.add.zone(0, 0, 10, 10).setInteractive({ useHandCursor: true });
        this.houseZone.on('pointerup', () => bridge.act('switch-tab', { tab: 'famille' }));

        this.scale.on('resize', () => this.fit());
        this.input.setTopOnly(true);
        this.ready = true;
        if (lastModel) this.sync(lastModel, true);
      }

      /* ---------- textures ---------- */

      tex(key, fallback) { return this.textures.exists(key) && !this.missing.has(key) ? key : fallback; }

      // Dessins de secours (formes simples) quand une image du pack manque : la carte
      // reste lisible et cliquable, même sans les assets.
      makePlaceholders() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const bake = (key, w, h, draw) => { g.clear(); draw(g); g.generateTexture(key, w, h); };
        bake('ph_grass', 16, 16, (d) => { d.fillStyle(0x5d8f3f).fillRect(0, 0, 16, 16); d.fillStyle(0x6ba24a).fillRect(3, 4, 2, 2).fillRect(10, 11, 2, 2); });
        bake('ph_dry', 16, 16, (d) => { d.fillStyle(0x8b5a2b).fillRect(0, 0, 16, 16); d.fillStyle(0x7a4d24).fillRect(0, 5, 16, 2).fillRect(0, 11, 16, 2); });
        bake('ph_wet', 16, 16, (d) => { d.fillStyle(0x5b3a1c).fillRect(0, 0, 16, 16); d.fillStyle(0x4a2f16).fillRect(0, 5, 16, 2).fillRect(0, 11, 16, 2); });
        bake('ph_house', 93, 97, (d) => { d.fillStyle(0xc9a26b).fillRect(8, 40, 77, 57); d.fillStyle(0xa8472f).fillTriangle(0, 44, 46, 0, 93, 44); d.fillStyle(0x5a3a1a).fillRect(40, 66, 14, 31); });
        bake('ph_tree', 80, 80, (d) => { d.fillStyle(0x6b4423).fillRect(36, 44, 8, 36); d.fillStyle(0x3f7a2f).fillCircle(40, 32, 26); });
        g.destroy();
      }

      // Découpe de crops.png : une image nommée « culture:phase » par case, définie
      // ici dans le code (pas de fichier JSON à charger).
      defineFrames() {
        if (!this.textures.exists('crops') || this.missing.has('crops')) return;
        const t = this.textures.get('crops');
        for (const [name, sp] of Object.entries(CROP_SP)) {
          sp.c.forEach((col, phase) => t.add(name + ':' + phase, 0, col * T, (sp.r + 1) * T - sp.h, T, sp.h));
        }
      }

      defineAnims() {
        for (const a of ['sp', 'au', 'wi']) {
          if (this.textures.exists('tree_' + a) && !this.anims.exists('tree_' + a)) {
            this.anims.create({ key: 'tree_' + a, frames: this.anims.generateFrameNumbers('tree_' + a, { start: 0, end: 7 }), frameRate: 7, repeat: -1 });
          }
          if (this.textures.exists('pine_' + a) && !this.anims.exists('pine_' + a)) {
            this.anims.create({ key: 'pine_' + a, frames: this.anims.generateFrameNumbers('pine_' + a, { start: 0, end: 7 }), frameRate: 7, repeat: -1 });
          }
        }
      }

      /* ---------- cartes Tiled ---------- */

      // Crée les couches de tuiles de chaque carte chargée (masquées tant que leur saison
      // n'est pas affichée) et relève les objets nommés (maison, zone_culture…).
      buildMaps() {
        for (const [sfx, m] of Object.entries(MAPS)) {
          if (this.missing.has(m.key) || this.missing.has(m.tiles) || !this.cache.tilemap.exists(m.key)) continue;
          try {
            const map = this.make.tilemap({ key: m.key });
            const ts = map.addTilesetImage(m.tileset, m.tiles);
            if (!ts) throw new Error('jeu de tuiles « ' + m.tileset + ' » introuvable dans la carte');
            const layers = map.layers.map((l, i) => {
              const layer = map.createLayer(l.name, ts, 0, 0);
              layer.setDepth(i).setVisible(false);
              return layer;
            });
            const objects = {};
            for (const og of map.objects) for (const o of og.objects) objects[o.name] = o;
            this.maps[sfx] = { layers, objects, w: map.widthInPixels, h: map.heightInPixels };
          } catch (err) {
            console.warn('[FarmStage] carte ' + m.key + ' ignorée :', err.message || err);
          }
        }
      }

      /* ---------- mise en page ---------- */

      // Positions (en pixels de la carte) selon le nombre de colonnes/rangées.
      layout(model, sfx) {
        const cols = model.cols;
        const rows = Math.ceil(model.plots.length / cols);
        const tm = this.maps[sfx];
        if (tm && tm.objects.maison && tm.objects.zone_culture) {
          // Carte Tiled : maison et zone de culture se placent d'après les objets de la carte.
          // La grille démarre dans le coin haut-gauche de `zone_culture` (calé sur la grille de 16 px).
          const h = tm.objects.maison, z = tm.objects.zone_culture;
          return {
            map: tm, cols, rows, pitch: PITCH_MAP,
            worldW: tm.w, worldH: tm.h,
            houseX: Math.round(h.x + h.width / 2), houseFootY: Math.round(h.y + h.height),
            houseW: Math.round(h.width), houseH: Math.round(h.height),
            gridX: Math.round(z.x / T) * T, gridY: Math.round(z.y / T) * T,
          };
        }
        const gridW = cols * PITCH_FREE;
        const L = {
          map: null, cols, rows, pitch: PITCH_FREE,
          worldW: WORLD_W,
          treeFootY: 64,
          houseX: WORLD_W / 2, houseFootY: 150, houseW: 86, houseH: 80,
          fenceY: 158,
          gridX: Math.round((WORLD_W - gridW) / 2),
          gridY: 172,
        };
        L.worldH = L.gridY + rows * PITCH_FREE + 12;
        return L;
      }

      // Zoom : entier dès que possible (pixels nets), sinon le plus grand zoom qui
      // fait tenir toute la carte. La carte est centrée dans la zone.
      fit() {
        if (!this.L) return;
        const w = this.scale.width, h = this.scale.height;
        if (!w || !h) return;
        const cam = this.cameras.main;
        let z = Math.min(w / this.L.worldW, h / this.L.worldH);
        if (z >= 2) z = Math.floor(z);
        else z = Math.max(0.5, Math.floor(z * 4) / 4);
        cam.setZoom(z);
        cam.centerOn(this.L.worldW / 2, this.L.worldH / 2);
        cam.roundPixels = true;
      }

      buildScenery(sfx) {
        for (const t of this.trees) t.destroy();
        this.trees = [];
        const spots = [[14, 'pine'], [44, 'tree'], [96, 'pine'], [148, 'tree'], [178, 'pine']];
        for (const [x, kind] of spots) {
          const key = kind + '_' + sfx;
          const ok = this.textures.exists(key) && !this.missing.has(key);
          const s = ok
            ? this.add.sprite(x, this.L.treeFootY + (kind === 'pine' ? 2 : 0), key, 0).setOrigin(0.5, 1)
            : this.add.image(x, this.L.treeFootY, 'ph_tree').setOrigin(0.5, 1).setScale(0.8);
          if (ok) s.play({ key, startFrame: (x / 7) % 8 | 0 });
          s.setDepth(s.y);
          this.trees.push(s);
        }
      }

      drawFence() {
        const g = this.fence, y = this.L.fenceY;
        g.clear();
        g.fillStyle(0x8a6035);
        const gate0 = WORLD_W / 2 - 12, gate1 = WORLD_W / 2 + 12;
        for (let x = 16; x <= WORLD_W - 16; x += 8) {
          if (x > gate0 && x < gate1) continue;
          g.fillRect(x, y - 8, 2, 10);
        }
        g.fillRect(16, y - 6, gate0 - 16, 1.5).fillRect(16, y - 2, gate0 - 16, 1.5);
        g.fillRect(gate1, y - 6, WORLD_W - 16 - gate1, 1.5).fillRect(gate1, y - 2, WORLD_W - 16 - gate1, 1.5);
        g.setDepth(y);
      }

      /* ---------- synchronisation avec le jeu ---------- */

      sync(model, force) {
        if (!this.ready) return;
        const sfx = SEASON_SUFFIX[model.season] || 'sp';
        const L = this.layout(model, sfx);
        const layoutChanged = !this.L || this.L.cols !== L.cols || this.L.rows !== L.rows || this.L.map !== L.map;
        this.L = L;

        // Saison : décor (carte Tiled si elle existe pour cette saison, sinon herbe + arbres + barrière
        // dessinés en code) et maison.
        if (force || this.season !== model.season) {
          this.season = model.season;
          for (const [k, m] of Object.entries(this.maps)) m.layers.forEach((l) => l.setVisible(m === L.map));
          this.ground.setTexture(this.tex('grass_' + model.season, 'ph_grass'));
          this.house.setTexture(this.tex('house_' + sfx, 'ph_house'));
          if (!L.map) this.buildScenery(sfx);
          else { for (const t of this.trees) t.destroy(); this.trees = []; }
        }
        if (force || layoutChanged) {
          this.ground.setVisible(!L.map);
          this.fence.setVisible(!L.map);
          this.ground.setSize(L.worldW + 64, L.worldH + 64).setPosition(-32, -32);
          this.house.setPosition(L.houseX, L.houseFootY).setDepth(L.houseFootY);
          this.houseZone.setPosition(L.houseX, L.houseFootY - L.houseH / 2).setSize(L.houseW, L.houseH);
          if (!L.map) this.drawFence();
          this.fit();
        }

        // Parcelles : on crée, met à jour, détruit.
        const seen = new Set();
        model.plots.forEach((p, i) => {
          seen.add(p.id);
          const x = L.gridX + (i % L.cols) * L.pitch + L.pitch / 2;
          const y = L.gridY + Math.floor(i / L.cols) * L.pitch + L.pitch / 2;
          let e = this.plots.get(p.id);
          if (!e) {
            e = { soil: this.add.image(x, y, 'ph_dry'), crop: null, key: '', mature: false };
            e.soil.setDepth(2);
            e.zone = this.add.zone(x, y, L.pitch, L.pitch).setInteractive({ useHandCursor: true });
            e.zone.on('pointerup', () => this.tapPlot(p.id));
            this.plots.set(p.id, e);
          }
          e.soil.setPosition(x, y).setTexture(p.arrosee ? this.tex('soil_wet', 'ph_wet') : this.tex('soil_dry', 'ph_dry'));
          e.zone.setPosition(x, y).setSize(L.pitch, L.pitch);
          this.syncCrop(e, p, x, y);
        });
        for (const [id, e] of this.plots) {
          if (!seen.has(id)) { this.destroyPlot(e); this.plots.delete(id); }
        }
        this.fit();
      }

      syncCrop(e, p, x, y) {
        const key = p.culture ? p.culture + ':' + p.phase : '';
        if (key !== e.key) {
          if (e.crop) { if (e.tween) e.tween.stop(); e.crop.destroy(); e.crop = null; e.tween = null; }
          e.key = key;
          if (p.culture) {
            const framed = this.textures.exists('crops') && !this.missing.has('crops') && CROP_SP[p.culture];
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
        // Mûre : la plante se balance doucement pour attirer le clic.
        if (e.crop && p.mature && !e.tween) {
          e.tween = this.tweens.add({ targets: e.crop, angle: { from: -4, to: 4 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        }
        if (e.crop && !p.mature && e.tween) { e.tween.stop(); e.tween = null; e.crop.setAngle(0); }
      }

      destroyPlot(e) {
        if (e.tween) e.tween.stop();
        if (e.crop) e.crop.destroy();
        e.soil.destroy();
        e.zone.destroy();
      }

      tapPlot(id) {
        const p = lastModel && lastModel.plots.find((q) => q.id === id);
        if (!p) return;
        // Provisoire : on appelle les actions existantes. La fenêtre « parcelle » du
        // chantier visuel remplacera ce choix (clic → fenêtre → planter/arroser/récolter).
        if (!p.culture) bridge.act('plant-open', { id });
        else if (p.mature) bridge.act('harvest', { id });
        else if (!p.arrosee) bridge.act('water', { id });
      }
    }

    game = new global.Phaser.Game({
      type: global.Phaser.AUTO,
      parent: element,
      pixelArt: true,
      roundPixels: true,
      antialias: false,
      transparent: false,
      backgroundColor: '#699654',
      scale: { mode: global.Phaser.Scale.RESIZE, width: '100%', height: '100%' },
      input: { touch: { capture: false } },
      audio: { noAudio: true },
      banner: false,
      scene: [FarmScene],
    });
    game.events.once('ready', () => { scene = game.scene.getScene('farm'); if (visible) show(); });
    return true;
  }

  function getScene() { return game && (scene || (scene = game.scene.getScene('farm'))); }

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
    if (!game.isBooted) return;
    game.loop.wake();
    game.scale.refresh();
    lastKey = '';
    if (lastModel) update(lastModel);
  }

  function hide() {
    visible = false;
    if (game) game.loop.sleep();
  }

  global.FarmStage = { mount, update, show, hide, scene: getScene }; // scene() : pour le débogage et les tests
})(window);
