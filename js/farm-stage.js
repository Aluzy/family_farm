/* farm-stage.js — la carte de la ferme, dessinée avec Phaser 4.
 *
 * Règles d'architecture (voir docs/architecture-phaser.md) :
 *   1. Ce fichier ne lit JAMAIS l'état du jeu. Il reçoit un « modèle de vue »
 *      (objet simple, voir stageModel() dans js/app.js) et l'affiche.
 *   2. Il n'écrit JAMAIS dans le jeu. Un appui sur la carte appelle
 *      bridge.act(action, données) : la page déclenche alors la même
 *      action `data-action` qu'un bouton du DOM (même code, mêmes fenêtres,
 *      même suivi de session).
 *   3. sync(modèle) est idempotent : appelé 5 fois par seconde avec le même
 *      modèle, il ne fait rien ; appelé avec un modèle différent, il crée,
 *      met à jour ou détruit exactement ce qui a changé.
 *
 * La carte (Tiled, 72×57 tuiles de 16 px ; la scène lit sa taille dans la carte) est plus
 * grande que l'écran : le zoom en montre 21 rangées, et le doigt (ou la souris) la fait glisser dans les deux sens. Trois repères
 * (l'étable, la maison, le moulin et la serre) servent de points d'arrêt. Elle porte deux
 * zones de parcelles (la Zone de culture et le Champ) et les arbres du Verger.
 *
 * Par-dessus la carte, la scène pose des étiquettes en DOM (nom du bâtiment et pastille
 * « à faire », données par le modèle) qu'elle replace à chaque image, et un voile de
 * lumière qui suit l'heure du modèle (aube, plein jour, soir, nuit : CarteKit.voile).
 *
 * Ce fichier : le montage, la scène (création, boucle d'image, appuis et gestes : tout ce qui
 * passe par le pont d'actions) et l'API. Les autres méthodes de la scène sont dans
 * js/carte/ferme/ (le sol, le décor, les intérieurs, la caméra, les étiquettes, la hache, la
 * pioche, la pêche, les passages, les machines, la synchronisation avec le modèle), ses
 * réglages dans js/carte/ferme/config.js (FermeCarte), ce que toutes les cartes partagent dans
 * js/carte/ (CarteKit). La scène reçoit au montage un contexte (scène.ctx : le pont, le dossier
 * des images, les découpes des cultures, le calque des étiquettes, le dernier modèle).
 *
 * API publique : FarmStage.mount(element, { act, onView, pickup, icone, base, crops, carte }) puis
 *                FarmStage.update(modèle), FarmStage.show(), FarmStage.hide(),
 *                FarmStage.ready() (la scène est-elle affichable ?),
 *                FarmStage.view() (où en est la vue : repère 0, 1 ou 2, bornes),
 *                FarmStage.hasRoom(id) (l'intérieur d'un bâtiment peut-il être affiché ?),
 *                FarmStage.hasFermier() (le personnage est-il là pour ramasser ?),
 *                FarmStage.panTo(x, point { x, y } ou id de bâtiment) (glisse jusque-là),
 *                FarmStage.goHome(done) (le personnage rentre dans la maison ; la vue le suit),
 *                FarmStage.mealScene({ convives, heureux }) (le repas : la famille va à table).
 *                onView(vue) est appelé quand l'écran courant change, quand un bord est
 *                atteint ou quitté, et au premier glissement du joueur.
 *                Version 1.18 : pickup(id) met un tas « à ramasser » dans l'inventaire et
 *                renvoie son contenu ({ item: qté }) ; icone(item) donne son emoji.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T, MAP, SFX, TREE_FRAME, TREE_BODY, SPRINKLER, ROBOT, EXIT, TALL_GRASS, DEFAULT_W, DEFAULT_H, DEFAULT_OBJECTS, MILL_FRAME, ROOF_PANELS, WELL, TANK, RUINES, CAT_FRAME, FERMIER_FRAME, PERSONNAGE, HERD_SHEETS, COOP_FRAME, ROOMS, MEUBLES, LITS, TAP_SLOP, DOUBLE_TAP_MS, DOUBLE_TAP_PX, MIN_TAP, MAX_SPEED, FOLLOW_MS, FOLLOW_UP, LABEL_HOLD_MS, LONG_PRESS_MS, GROUND_CHECK_MS } = F.C;
  const { clamp, pixelRatio, reducedMotion, v } = F;

  let game = null;          // le jeu Phaser de toutes les cartes (js/carte/jeu.js)
  let mounted = false;
  let scene = null;
  let host = null;
  let lastModel = null;     // le dernier modèle reçu (comparé au suivant, voir pareil())
  let awake = false;        // la boucle Phaser tourne et la taille est à jour

  // Ce que la scène reçoit au montage (scene.ctx) : le pont vers la page, le dossier des
  // images, la table des découpes de crops.png, le calque DOM des étiquettes, le dernier
  // modèle reçu (appliqué dès que la scène est prête) et si la carte est affichée.
  const ctx = { bridge: null, base: 'assets/', crops: {}, carte: null, labelLayer: null, lastModel: null, visible: false };

  // La scène de la ferme : la classe est faite une fois (il faut Phaser), puis reçoit les
  // méthodes des fichiers de js/carte/ferme/ (FermeCarte.partie) ; ici, sa création, sa
  // boucle d'image, les appuis et les gestes (labourer, ouvrir une fenêtre, envoyer le
  // personnage) : tout ce qui passe par le pont d'actions (ctx.bridge.act).
  let FarmScene = null;
  function sceneClass() {
    if (FarmScene) return FarmScene;
    FarmScene = class FarmScene extends global.Phaser.Scene {
      constructor(ctx) {
        super('farm');
        this.ctx = ctx;                  // ce que la page a donné au montage (voir mount)
        this.plots = new Map();          // id de parcelle -> { soil, crop, key, tween }
        this.buildings = new Map();      // id de bâtiment -> { def, sprite }
        this.roofPanels = null;          // panneaux solaires sur le toit de la maison (image)
        this.well = null;                // le puits (image)
        this.pump = null;                // la pompe, une fois achetée (image), et sa vibration :
        this.pumpShake = null;           //   minuterie qui la décale d'un pixel quand elle tourne
        this.tank = null;                // la citerne, une fois achetée (image)
        this.trees = new Map();          // case du Verger -> { sprite, key, a } (arbre ou emplacement libre)
        this.labels = new Map();         // id de lieu -> étiquette DOM et son point d'ancrage
        this.hoverId = null;             // lieu survolé (souris) ou touché (doigt) : son nom s'affiche
        this.hoverUntil = 0;             // au doigt : heure à laquelle le nom s'efface
        this.pan = null;                 // déplacement demandé par panTo() : { from, to, t0 }
        this.dragged = false;            // le joueur a-t-il déjà fait glisser la carte ?
        this.viewKey = '';               // dernière vue signalée à la page
        this.lumiere = null;             // la lumière de l'heure (CarteKit.voile)
        this.light = null;               //   et son rectangle, en mode « multiplier »
        this.world = { w: DEFAULT_W, h: DEFAULT_H };
        this.objects = Object.assign({}, DEFAULT_OBJECTS);
        this.grid = { x: 0, y: 0, cols: DEFAULT_W / T };  // version 1.15 : la carte entière (tuile = rangée × colonnes + colonne)
        this.screens = [];               // repères de la carte : gauche, milieu, droite (voir makeScreens)
        this.tileAnims = [];             // tuiles animées de la carte, par tuile (voir makeTileAnims)
        this.tileSprites = [];           // les images des étendues de cases animées (voir makeTileAnims)
        this.tilesStill = false;         // animations réduites : ces images sont masquées
        this.rooms = {};                 // intérieurs disponibles (voir bakeRooms) : id -> image, zones, emplacements
        this.room = null;                // intérieur affiché à la place de la carte (null : dehors)
        this.roomShade = null;           // voile sur les emplacements pas encore achetés
        this.shadeKey = '';
        this.cx = DEFAULT_W / 2;         // centre de la vue, en px de carte
        this.cy = DEFAULT_H / 2;
        this.drag = null;                // glissement en cours
        this.vx = 0;                     // élan (px de carte par ms)
        this.vy = 0;
        this.missing = new Set();
      }

      preload() {
        const L = this.load;
        L.setPath(this.ctx.base);
        L.on('loaderror', (file) => this.missing.add(file.key));
        L.image('crops', v('crops.png'));
        L.image('soil_dry', v('soil_dry.png'));
        L.image('soil_wet', v('soil_wet.png'));
        L.spritesheet(K.FLECHE.key, v(K.FLECHE.file), { frameWidth: K.FLECHE.size, frameHeight: K.FLECHE.size });
        L.image('silo', v('silo.png'));
        L.spritesheet(F.C.RAMASSABLES.key, v(F.C.RAMASSABLES.file), F.C.RAMASSABLES.frame);
        L.spritesheet(F.C.BLOCS_CARTE.key, v(F.C.BLOCS_CARTE.file), F.C.BLOCS_CARTE.frame);
        L.spritesheet(F.C.BLOCS_CARTE.hauts.key, v(F.C.BLOCS_CARTE.hauts.file), F.C.BLOCS_CARTE.hauts.frame);
        L.spritesheet('chat', v('chat.png'), CAT_FRAME);
        L.spritesheet(K.TRIPORTEUR.key, v(K.TRIPORTEUR.file), { frameWidth: K.TRIPORTEUR.w, frameHeight: K.TRIPORTEUR.h });
        L.spritesheet('fermier', v(PERSONNAGE + '.png'), FERMIER_FRAME);
        L.json('fermier_cases', v(PERSONNAGE + '.json'));
        L.json('perso_cases', v('personnages/cases.json'));
        for (const [kind, [file, size]] of Object.entries(HERD_SHEETS)) L.spritesheet(kind, v(file), size);
        L.spritesheet(TALL_GRASS.key, v(TALL_GRASS.file), TALL_GRASS.frame);
        L.spritesheet(TALL_GRASS.fleurs.key, v(TALL_GRASS.fleurs.file), TALL_GRASS.frame);
        L.spritesheet(ROOF_PANELS.key, v(ROOF_PANELS.file), ROOF_PANELS.frame);
        L.spritesheet(WELL.key, v(WELL.file), WELL.frame);
        L.spritesheet(TANK.key, v(TANK.file), TANK.frame);
        for (const r of Object.values(RUINES)) {
          if (r.sheet) L.spritesheet(r.key, v(r.file), r.sheet === 'mill' ? MILL_FRAME : COOP_FRAME);
          else L.image(r.key, v(r.file));
        }
        L.tilemapTiledJSON(MAP.key, v(MAP.json));
        for (const r of Object.values(ROOMS)) {
          L.tilemapTiledJSON(r.key, v(r.json));
          if (r.image) L.image(r.image, v(r.image + '.png'));
        }
        L.spritesheet(SPRINKLER.key, v(SPRINKLER.file), SPRINKLER.frame);
        L.spritesheet(ROBOT.key, v(ROBOT.file), ROBOT.frame);
        L.spritesheet(ROBOT.station.key, v(ROBOT.station.file), ROBOT.station.frame);
        for (const name of MEUBLES) L.image('meuble_' + name, v('meuble_' + name + '.png'));
        for (const name of LITS) L.image('meuble_' + name + '_drap', v('meuble_' + name + '_drap.png'));
        L.image(MAP.tiles, v(MAP.image));
        L.image('house_' + SFX, v('house_' + SFX + '.png'));
        L.image('serre_' + SFX, v('serre_' + SFX + '.png'));
        L.spritesheet('verger', v('verger.png'), TREE_FRAME);
        L.spritesheet('arbre_clair_sp', v('arbre_clair_sp.png'), { frameWidth: 56, frameHeight: 64 });
        L.spritesheet('pin_clair_sp', v('pin_clair_sp.png'), { frameWidth: 72, frameHeight: 64 });
        L.image('terre_bords', v('terre_bords.png'));
      }

      create() {
        this.cameras.main.setBackgroundColor('#6a8157'); // vert de l'herbe de la carte
        this.cameras.main.roundPixels = false;
        this.makePlaceholders();
        this.defineFrames();
        this.defineAnims();
        this.bakeGround();
        this.add.image(0, 0, 'ground').setOrigin(0).setDepth(0);
        this.makeSun();                       // les ombres portées, qui suivent le soleil (js/carte/ferme/soleil.js)
        this.watchGround();
        this.makeTileAnims();
        this.bakeRooms();
        // Voile de lumière : il couvre toute la carte, au-dessus des bâtiments et des
        // plantes, et multiplie leurs couleurs (blanc = aucun effet). Les étiquettes et les
        // boutons, en DOM, restent au-dessus et gardent leurs couleurs.
        this.lumiere = K.voile(this, this.world.w, this.world.h, 1e6);
        this.light = this.lumiere.rect;

        this.makeScreens();
        this.cx = this.screens[1].x;     // départ : le repère du milieu (maison + zone de culture)
        this.cy = this.screens[1].y;

        const I = this.input;
        I.on('pointerdown', this.onDown, this);
        I.on('pointermove', this.onMove, this);
        I.on('pointerup', (p) => this.onUp(p, true));
        I.on('pointerupoutside', (p) => this.onUp(p, false));
        // Dehors, le doigt posé puis glissé : le personnage marche dans sa direction tant qu'il
        // reste posé (CarteKit.manette) ; pas quand la houe laboure, ni la bulle de la citerne,
        // ni pendant la pêche, ni au lit.
        this.manette = K.manette(this, () => this.suitPerso() && !!this.drag && !this.drag.labour && !this.drag.held && !this.drag.meuble
          && !this.fishing && !(this.ctx.lastModel && this.ctx.lastModel.coucher));
        I.on('gameout', () => { if (!this.drag) this.setHover(null); });
        I.on('wheel', (p, over, dx, dy) => { if (this.suitPerso()) return; this.vx = this.vy = 0; this.pan = null; this.setCentre(this.cx + ((dx || dy) * pixelRatio()) / this.cameras.main.zoom, this.cy); });
        this.scale.on('resize', () => this.fit());
        this.fit();
        // Vie d'ambiance (js/ambient-life.js, facultatif) : ombres de nuages, petites bêtes de
        // passage, et le chat. Voir docs/vie-ambiance.md.
        this.ambient = null;
        if (global.AmbientLife) {
          try {
            this.ambient = global.AmbientLife.attach(this, {
              world: this.world, map: this.mapRaw, tiles: this.has(MAP.tiles) ? MAP.tiles : null,
              objects: this.objects, lightDepth: this.light.depth, reduced: reducedMotion,
              cat: this.has('chat') ? 'chat' : null,
              herd: Object.fromEntries(Object.keys(HERD_SHEETS).filter((kind) => this.has(kind)).map((kind) => [kind, kind])),
            });
          } catch (e) { console.warn('[FarmStage] vie d\'ambiance indisponible', e); }
        }
        // Le personnage (js/fermier.js, facultatif) : il refait sur la carte les gestes du joueur.
        this.fermier = null;
        const cases = this.cache.json.get('fermier_cases');
        if (global.Fermier && this.has('fermier') && cases && Array.isArray(cases.frames)) {
          try {
            this.fermier = global.Fermier.attach(this, {
              sheet: 'fermier', frames: cases.frames, world: this.world, objects: this.objects, reduced: reducedMotion,
              ground: () => {
                const g = this.ambient && this.ambient.ground ? this.ambient.ground() : null;
                const debout = (m) => !(this.felledFeet && this.felledFeet.has(m.x + ',' + m.base));
                const pousse = (b) => !(this.felledBushes && this.felledBushes.has(b.x0 + ',' + b.base));
                return g ? Object.assign({}, g, { trees: (g.trees || []).filter(debout), bushes: (g.bushes || []).filter(pousse), rocks: this.rockFeet() }) : { rocks: this.rockFeet() };
              },
              cols: () => this.grid.cols,
              outside: () => !this.room,
              resync: () => { if (this.rawModel) this.sync(this.rawModel); },
              // Version 1.18 : il prend un tas (le jeu le met dans l'inventaire), hors de sa
              // boucle d'image ; puis la bulle « +x » monte au-dessus de lui.
              pickup: (id, done) => setTimeout(() => done(this.ctx.bridge && this.ctx.bridge.pickup ? this.ctx.bridge.pickup(id) : null), 0),
              gain: (items) => this.showGain(items),
              // Version 1.19 : au Poulailler ou à l'Étable, il prend ce qui l'attend.
              collect: (lieu, done) => setTimeout(() => done(this.ctx.bridge && this.ctx.bridge.collect ? this.ctx.bridge.collect(lieu) : null), 0),
              // Il dort dans son lit : la nuit peut passer.
              asleep: () => setTimeout(() => { if (this.ctx.bridge && this.ctx.bridge.asleep) this.ctx.bridge.asleep(); }, 0),
              has: (key) => this.has(key),
              // la ferme générée : les blocs où l'on ne passe pas, et la paillasse où il dort
              blocks: () => this.blockCells(),
              // à l'étage, il passe devant son voile
              depth: (y) => (this.etageDepth ? this.etageDepth(y) : y),
              lift: () => (this.etageLift ? this.etageLift() : 0),
              couchage: () => this.bedSpot(),
              foyer: () => this.homeDoor(),
              cle: (lieu) => { const k = this.keyBlockOf(lieu); return k ? { x: k.x, y: k.y + 6 } : null; },
              arbre: (c) => (this.ctx.carte ? this.treeRect(c) : null),
            });
          } catch (e) { console.warn('[FarmStage] personnage indisponible', e); }
        }
        // Les autres membres de la famille (js/famille-ferme.js, facultatif) : leur journée sur
        // la carte, l'école des enfants (ils partent par le bout est du chemin).
        this.family = null;
        if (global.FamilleFerme && this.fermier) {
          try {
            this.family = global.FamilleFerme.attach(this, {
              fermier: this.fermier, frames: (this.cache.json.get('perso_cases') || cases || {}).frames, reduced: reducedMotion,
              exit: { x: this.exitAt().x - 12, y: this.exitAt().y },
              // le second adulte a fini au Poulailler ou à l'Étable : ce qu'il a pris, sa bulle
              aide: (lieu, done) => setTimeout(() => done(this.ctx.bridge && this.ctx.bridge.aide ? this.ctx.bridge.aide(lieu) : null), 0),
              gain: (items) => this.showGainAide(items),
              // la nuit, le k-ième membre dort dans le (k + 2)-ième couchage (le premier : le personnage)
              lit: (k) => (this.bedSpots ? this.bedSpots()[k + 1] || null : null),
              file: (perso, enfant) => v(K.planche(perso, enfant)),
            });
          } catch (e) { console.warn('[FarmStage] famille indisponible', e); }
        }
        this.ready = true;
        this.followSnap = true;          // la vue part centrée sur le personnage
        if (this.ctx.lastModel) this.sync(this.ctx.lastModel, true);
        this.makeExit();
        // (cachée pendant le chargement, une autre carte affichée : js/carte/jeu.js l'endort)
      }

      onDown(pointer) {
        // Un deuxième doigt est ignoré ; le même pointeur qui rappuie repart de zéro (cas d'un
        // relâchement perdu, par exemple hors de la fenêtre).
        if (this.drag && this.drag.id !== pointer.id) return;
        this.vx = this.vy = 0;
        this.pan = null;
        const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.setHover(this.placeAt(wp.x, wp.y));   // le nom du lieu touché s'affiche
        this.drag = {
          id: pointer.id, x: pointer.x, y: pointer.y, cx: this.cx, cy: this.cy,
          wx: wp.x, wy: wp.y, moved: false, vx: 0, vy: 0,
          lastX: pointer.x, lastY: pointer.y, lastT: performance.now(),
          // version 1.24 : un appui maintenu sur le personnage, un outil en main : le coup fort
          fort: this.chargeStart(wp.x, wp.y),
          // FLU-12 : houe en main, un glissement parti d'une case verte laboure les cases traversées
          labour: null,
          // la pose d'un meuble : un glissement parti de son aperçu le déplace, case par case
          meuble: null,
        };
        const mc = this.meubleSous ? this.meubleSous(wp.x, wp.y) : null;
        if (mc !== null) { this.drag.meuble = { case: mc, c: Math.floor(wp.x / T), r: Math.floor(wp.y / T), dernier: mc }; return; }
        if (!this.drag.fort) this.drag.labour = this.labourStart(wp.x, wp.y);
        // Appui maintenu sur la citerne : une bulle dit combien de litres elle contient.
        if (!this.drag.labour && this.onTank(wp.x, wp.y)) {
          const d = this.drag;
          d.holdTimer = setTimeout(() => {
            if (this.drag !== d || d.moved) return;
            d.held = true;
            this.setHover(null);
            this.showTankTip(true);
          }, LONG_PRESS_MS);
        }
      }

      onMove(pointer) {
        const d = this.drag;
        if (!d) {
          // Souris : main sur ce qui se touche, poignée ailleurs.
          if (!pointer.wasTouch) {
            const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            const hit = this.hitAt(wp.x, wp.y);
            this.game.canvas.style.cursor = hit ? 'pointer' : this.room || this.suitPerso() ? 'default' : 'grab';
            this.setHover(this.placeOf(hit));       // survol : le nom du lieu s'affiche
          }
          return;
        }
        if (d.id !== pointer.id) return;
        if (!pointer.isDown) { this.chargeCancel(d); this.drag = null; return; }   // relâché hors de la page
        const zoom = this.cameras.main.zoom;
        const dx = pointer.x - d.x, dy = pointer.y - d.y;
        if (d.fort && Math.hypot(dx, dy) >= TAP_SLOP * pixelRatio()) this.chargeCancel(d);   // il marche
        if (d.meuble) {
          // l'aperçu du meuble suit le doigt, calé sur la grille (la page le replace : meuble-place)
          if (!d.moved && Math.hypot(dx, dy) >= TAP_SLOP * pixelRatio()) { d.moved = true; this.setHover(null); }
          if (!d.moved) return;
          const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y), m = d.meuble, cols = this.grid.cols;
          const col = (m.case % cols) + Math.floor(wp.x / T) - m.c, row = Math.floor(m.case / cols) + Math.floor(wp.y / T) - m.r;
          const nc = row * cols + col;
          if (col < 0 || col >= cols || row < 0 || row * T >= this.world.h || nc === m.dernier) return;
          m.dernier = nc;
          this.ctx.bridge.act('meuble-place', { case: nc });
          return;
        }
        if (d.labour) {
          if (!d.moved && Math.hypot(dx, dy) >= TAP_SLOP * pixelRatio()) { d.moved = true; this.setHover(null); }
          if (d.moved) this.labourTo(d, this.cameras.main.getWorldPoint(pointer.x, pointer.y));
          return;
        }
        if (d.held) return;              // bulle de la citerne : la carte ne bouge pas
        // Dehors, la vue suit le personnage (comme sur les autres cartes) : un glissement ne la
        // déplace pas, il annule seulement l'appui.
        if (this.suitPerso()) {
          if (!d.moved && Math.hypot(dx, dy) >= TAP_SLOP * pixelRatio()) { d.moved = true; clearTimeout(d.holdTimer); this.setHover(null); }
          return;
        }
        if (!d.moved && Math.hypot(dx, dy) >= TAP_SLOP * pixelRatio()) {
          d.moved = true;
          clearTimeout(d.holdTimer);
          this.setHover(null);           // on fait glisser la carte : plus de nom affiché
          if (!this.room) this.dragged = true;   // signalé à la page par reportView()
          else this.roomPanned = true;           // l'intérieur garde où le joueur l'a fait glisser
          if (!this.room) this.game.canvas.style.cursor = 'grabbing';
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
        clearTimeout(d.holdTimer);
        if (d.fort && this.chargeEnd(d)) return;     // le coup fort (ou une charge lâchée trop tôt)
        if (d.held) {
          // La bulle reste un instant après le relâchement ; l'appui n'ouvre rien.
          this.tankTipUntil = performance.now() + LABEL_HOLD_MS;
          return;
        }
        // Au doigt, rien ne « survole » : le nom reste un instant, puis s'efface.
        if (pointer.wasTouch && this.hoverId) this.hoverUntil = performance.now() + LABEL_HOLD_MS;
        if (d.meuble && d.moved) return;           // l'aperçu du meuble a glissé : il reste où il est
        if (d.labour && d.moved) {
          this.clearLabourMarks();
          if (d.labour.tiles.length) this.ctx.bridge.act('hoe-many', { cases: d.labour.tiles.join(',') });
          return;
        }
        if (!d.moved) {
          // Appui : la vue revient où elle était (elle a pu bouger de quelques pixels).
          if (!this.suitPerso()) this.setCentre(d.cx, d.cy);
          if (inside) this.tap(d.wx, d.wy);
          return;
        }
        if (this.suitPerso()) return;
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
        this.stepLanterns(time, dt / 1000);      // (avant le voile : leurs lumières y sont posées)
        this.lumiere.step();
        if (this.tileAnims.length && !this.room) this.stepTileAnims(time);
        this.stepEau(time, dt / 1000);           // (l'eau vivante, js/carte/ferme/eau.js)
        if (this.hoverUntil && !this.drag && performance.now() >= this.hoverUntil) this.setHover(null);
        if (this.tankTipUntil && performance.now() >= this.tankTipUntil) this.showTankTip(false);
        this.syncTankTip();
        // Filet de sécurité : le fond est vérifié toutes les quelques secondes.
        if (time >= this.groundCheckAt) { this.groundCheckAt = time + GROUND_CHECK_MS; this.repairGround(false, true); }
        // Dans un intérieur : ni bêtes ni nuages, ni étiquettes de bâtiments.
        if (this.ambient && !this.room) this.ambient.update(delta);
        this.stepCharge();
        if (this.fermier) {
          this.fermier.steer(this.room ? null : this.manette.dir());
          this.fermier.update(delta, this.room ? this.room.id : null);
        }
        this.stepExit(time);
        if (this.family) this.family.update(delta, this.room ? this.room.id : null);
        // Dehors, la vue suit le personnage, centrée sur lui (comme sur les autres cartes) ; elle
        // s'arrête quand il est dans la maison.
        if (this.suitPerso()) {
          const p = this.fermier.pos();
          if (p) {
            this.pan = null;
            const k = this.followSnap ? 1 : Math.min(1, dt / FOLLOW_MS);
            this.followSnap = false;
            this.setCentre(this.cx + (p.x - this.cx) * k, this.cy + (p.y - FOLLOW_UP - this.cy) * k);
          }
        }
        this.placeMealBubbles();
        // Dans la maison, la vue suit le personnage qui va se coucher (la chambre est à droite).
        const suivi = this.room && this.fermier && !this.drag && this.fermier.focus ? this.fermier.focus() : null;
        if (suivi != null) this.setCentre(this.cx + (suivi - this.cx) * Math.min(1, dt / 300), this.cy);
        this.cullDecor();
        this.stepOccluders(delta);
        this.stepTallGrass(delta);
        this.stepShards(delta);
        this.stepSprinklers();
        this.stepFires(time);
        this.stepSurbrillance(time);
        this.stepMurs(dt / 1000);
        this.stepEtage(dt / 1000);
        this.stepToits(dt / 1000);
        this.stepVoilure(dt / 1000);
        this.stepPieces();
        this.stepBeasts(time, delta / 1000);
        this.stepAbeilles(delta / 1000);
        this.stepBotteleuses(dt);
        this.stepRobot(dt);
        this.placeDialog();
        this.stepFishing(delta);
        this.stepSun();
        if (!this.room) this.placeLabels();
        this.placePiles();
        this.placeGain();
        this.placeGainAide();
        this.stepMatin();
        this.reportView();
      }

      // La vue suit-elle le personnage ? Dehors, dès qu'il est sur la carte (sans lui, la vue
      // glisse au doigt, comme avant).
      suitPerso() {
        return !this.room && !!this.fermier;
      }

      /* ---------- appuis ---------- */

      // Les zones de parcelles : la Zone de culture ('zone'), le Champ ('zone2') et les
      // emplacements de chaque intérieur. `pos(i)` = coin haut-gauche de la i-ième parcelle
      // (null s'il n'y a plus d'emplacement), `at(x, y)` = rang de la parcelle sous un point
      // (-1 : aucune), `place` = lieu dont le nom s'affiche au survol, `window` = fenêtre
      // ouverte par une parcelle où il n'y a rien à faire.
      zones(model) {
        const m = model || this.ctx.lastModel;
        // Version 1.9 : chaque parcelle a sa case (p.case) dans une grille fixe de `cases`
        // cases ; une case sans parcelle est de l'herbe, que la houe peut labourer.
        const grid = (id, g, plots, zone, cases) => ({
          id, place: id, window: id, plots, zone, cases,
          slot: (p, i) => (typeof p.case === 'number' ? p.case : i),
          pos: (i) => ({ x: g.x + (i % g.cols) * T, y: g.y + Math.floor(i / g.cols) * T }),
          at: (wx, wy) => {
            const col = Math.floor((wx - g.x) / T), row = Math.floor((wy - g.y) / T);
            const i = col >= 0 && col < g.cols && row >= 0 ? row * g.cols + col : -1;
            return i < cases ? i : -1;
          },
        });
        const list = [
          grid('zone', this.grid, m ? m.plots : [], 1, m ? m.cases || 0 : 0),
        ];
        // la ferme générée : les parcelles de la Serre sur les cases de sa pièce (modèle.serreCases),
        // pas dans l'intérieur
        const sc = m && m.serreCases;
        if (sc) {
          const cols = this.grid.cols, rang = new Map(sc.map((c, i) => [c, i]));
          list.push({
            id: 'serre', place: null, window: 'serre', plots: m.serre || [], bac: true,
            slot: (p, i) => i,
            pos: (i) => (i < sc.length ? { x: (sc[i] % cols) * T, y: Math.floor(sc[i] / cols) * T } : null),
            at: (wx, wy) => {
              const i = rang.get(Math.floor(wy / T) * cols + Math.floor(wx / T));
              return i === undefined || i >= (m.serre || []).length ? -1 : i;
            },
          });
        }
        for (const r of Object.values(this.rooms)) {
          if (!r.def.plots || (sc && r.id === 'serre')) continue;   // un intérieur sans parcelles (la maison)
          list.push({
            id: 'interieur-' + r.id, place: null, window: r.def.window, plots: m ? m[r.def.plots] || [] : [],
            slot: (p, i) => i,
            pos: (i) => r.slots[i] || null,
            at: (wx, wy) => {
              const i = r.slotAt.get(Math.floor(wx / T) * T + ',' + Math.floor(wy / T) * T);
              return i === undefined ? -1 : i;
            },
          });
        }
        return list;
      }

      // FLU-12 : un glissement qui part d'une case verte (labourable maintenant) laboure les
      // cases vertes traversées : elles sont marquées pendant le geste, puis envoyées toutes
      // ensemble au relâchement (un seul rendu, une seule sauvegarde).
      labourStart(wx, wy) {
        const m = this.ctx.lastModel;
        if (!m || !m.houe || this.room || !m.labourables) return null;
        const W = this.grid.cols;
        const t = Math.floor(wy / T) * W + Math.floor(wx / T);
        const ok = new Set(m.labourables);
        if (!ok.has(t)) return null;
        return { ok, tiles: [], seen: new Set(), last: { x: wx, y: wy }, marks: [] };
      }

      labourTo(d, wp) {
        const L = d.labour, W = this.grid.cols;
        const steps = Math.max(1, Math.ceil(Math.hypot(wp.x - L.last.x, wp.y - L.last.y) / 4));
        for (let k = 0; k <= steps; k++) {
          const x = L.last.x + ((wp.x - L.last.x) * k) / steps, y = L.last.y + ((wp.y - L.last.y) * k) / steps;
          const t = Math.floor(y / T) * W + Math.floor(x / T);
          if (L.seen.has(t)) continue;
          L.seen.add(t);
          if (!L.ok.has(t)) continue;
          L.tiles.push(t);
          K.vibre('houe');
          L.marks.push(this.add.rectangle((t % W) * T + T / 2, Math.floor(t / W) * T + T / 2, T - 2, T - 2, 0x8a5a2b, 0.55).setDepth(1.6));
        }
        L.last = { x: wp.x, y: wp.y };
        this.labourMarks = L.marks;
      }

      clearLabourMarks() {
        for (const r of this.labourMarks || []) r.destroy();
        this.labourMarks = null;
      }

      // Version 1.15 : la tuile peut-elle être labourée (modèle.terrain, une chaîne par rangée) ?
      arable(i) {
        const t = this.ctx.lastModel && this.ctx.lastModel.terrain;
        const W = this.grid.cols;
        const row = t && t[Math.floor(i / W)];
        return !!row && row[i % W] === '#';
      }

      // Ce qui se trouve sous un point de la carte : une parcelle (exactement sa tuile),
      // sinon une étiquette, sinon le bâtiment ou l'arbre le plus en avant.
      hitAt(wx, wy) {
        const hoeing = !!(this.ctx.lastModel && this.ctx.lastModel.houe);
        let refus = null;                            // en mode houe : une tuile qui ne se laboure pas
        // Version 1.18 : la bulle d'un tas à ramasser passe devant tout.
        // la ferme générée, en mode Construire : la case touchée (poser, reprendre), rien d'autre
        if (!this.room && this.ctx.lastModel && this.ctx.lastModel.bati) { const q = this.etagePoint ? this.etagePoint(wx, wy) : { x: wx, y: wy }, c = this.tileAtPoint(q.x, q.y); return c >= 0 ? { bati: c } : null; }
        // un escalier (un essai, js/carte/ferme/etage.js) : monter, descendre ; à l'étage, rien d'autre
        if (this.escalierAt && this.escalierAt(wx, wy) >= 0) return { etage: true };
        if (this.niveau) return null;
        const pile = !this.room && !hoeing ? this.pileAt(wx, wy) : null;
        if (pile) return { pile: pile.id };
        // la ferme générée : une pierre, un bout de bois à ramasser à la main
        const brin = !this.room && !hoeing ? this.gatherAt(wx, wy) : null;
        if (brin) return { gather: brin };
        // un caillou (un rocher d'une seule tuile) se ramasse à la main, sauf la pioche en main
        if (!this.room && !hoeing && !(this.ctx.lastModel && this.ctx.lastModel.pioche)) {
          const caillou = this.rockAt(wx, wy);
          if (caillou && caillou.cells.size === 1) return { caillou };
        }
        // la botteleuse (une de ses pièces) : il va jeter ses fibres dans l'entonnoir
        const botte = !this.room && !hoeing ? this.botteleuseAt(wx, wy) : -1;
        if (botte >= 0) return { botteleuse: botte };
        // un four, une cuisinière posés (la ferme générée) : la fenêtre de sa station
        const station = !this.room && !hoeing ? this.stationAt(wx, wy) : null;
        if (station) return { window: station };
        for (const z of this.zones()) {
          const i = z.at(wx, wy);
          if (i < 0) continue;
          if (hoeing && z.zone) refus = { hoe: { zone: z.zone, case: i }, place: z.place };
          const p = z.plots.find((q, k) => z.slot(q, k) === i) || null;
          // version 1.15 : en mode houe, toute tuile labourable (ou terre) se laboure ou se rebouche
          if (hoeing && z.zone && (p || this.arable(i))) return { hoe: { zone: z.zone, case: i }, place: z.place };
          if (p) return { plot: p, place: z.place, open: z.window };
        }
        if (this.room) return this.propAt(wx, wy);   // dans un intérieur : ses meubles, rien d'autre
        // la canne à pêche en main : l'eau de l'étang ou de la mare sous le doigt s'y pêche
        if (this.ctx.lastModel && this.ctx.lastModel.canne) {
          const eau = this.waterAt(wx, wy);
          if (eau) return { fish: eau };
        }
        // la pioche en main : un rocher de la carte sous le doigt se casse
        if (this.ctx.lastModel && this.ctx.lastModel.pioche) {
          const rocher = this.rockAt(wx, wy);
          if (rocher) return { mine: rocher };
        }
        // la faux en main : une touffe d'herbe haute sous le doigt se fauche
        if (this.ctx.lastModel && this.ctx.lastModel.faux) {
          const touffe = this.grassAt(wx, wy);
          if (touffe) return { scythe: touffe };
        }
        // la hache en main : un arbre de la carte sous le doigt se coupe
        if (this.ctx.lastModel && this.ctx.lastModel.hache) {
          const arbre = this.mapTreeAt(wx, wy);
          if (arbre) return { chop: arbre };
        }
        const label = this.labelAt(wx, wy);
        if (label) return { window: label.window };
        const min = (MIN_TAP * pixelRatio()) / this.cameras.main.zoom;
        let best = null;
        // (x, y) = coin bas-gauche de la zone touchée ; w, h = sa taille.
        const test = (x, y, w, h, depth, win) => {
          const padX = Math.max(0, (min - w) / 2), padY = Math.max(0, (min - h) / 2);
          if (wx < x - padX || wx > x + w + padX || wy < y - h - padY || wy > y + padY) return;
          if (!best || depth > best.depth) best = { depth, window: win };
        };
        for (const e of this.buildings.values()) test(e.sprite.x, e.sprite.y, e.sprite.width, e.sprite.height, e.sprite.depth, e.def.window);
        // Les panneaux solaires du toit ouvrent la fenêtre Énergie ; la pompe du puits et la
        // citerne, la fenêtre Eau (devant la maison et les autres bâtiments : profondeur +1).
        if (this.roofPanels) {
          const r = this.roofPanels;
          test(r.x, r.y + r.height, r.width, r.height, r.depth + 1, 'energie');
        }
        if (this.pump && this.well) test(this.well.x, this.well.y, this.well.width, this.well.height, this.well.depth + 1, 'eau');
        // le robot et sa station de charge : sa fenêtre (batterie, autonomie)
        if (this.bot) {
          const b = this.bot.img;
          test(b.x - b.width / 2, b.y, b.width, b.height, b.depth + 1, 'robot');
          const st = this.bot.station;
          if (st && st.visible) test(st.x - st.width / 2, st.y, st.width, st.height, st.depth + 1, 'robot');
        }
        if (this.tank) test(this.tank.x, this.tank.y, this.tank.width, this.tank.height, this.tank.depth + 1, 'eau');
        // Version 1.13 : un arbre en fruits se cueille, un emplacement libre propose de
        // planter ; un autre arbre ouvre la fenêtre du Verger.
        for (const e of this.trees.values()) {
          const s = e.sprite, w = s.displayWidth * TREE_BODY;
          const b = e.key === 'verger' ? this.orchardBox(e) : { w, h: s.displayHeight };
          const before = best;
          test(s.x - b.w / 2, s.y, b.w, b.h, s.depth, 'verger');
          if (best !== before) best.tree = e.a;
        }
        if (best && best.tree) {
          if (best.tree.fruits) return { treeHarvest: best.tree.id };
          if (best.tree.libre) return { treeSlot: best.tree.case };
        }
        // L'herbe (même labourable) n'ouvre rien : la fenêtre de la Zone de culture s'ouvre par
        // une parcelle déjà labourée, ou en mode houe. En mode houe, une tuile qui ne se laboure
        // pas dit pourquoi (le moteur refuse).
        return best ? { window: best.window } : refus;
      }

      tap(wx, wy) {
        if (this.tapExit(wx, wy)) return;
        if (this.ambient) this.ambient.scare(wx, wy);   // un appui tout près fait s'envoler les oiseaux
        const hit = this.hitAt(wx, wy);
        // Version 1.19 : dehors, un double appui sur l'herbe ou un chemin y envoie le personnage ;
        // sur le Poulailler ou l'Étable, il va y ramasser (œufs ; lait et laine). L'appui simple
        // sur ces bâtiments (leur fenêtre) attend donc DOUBLE_TAP_MS de voir s'il n'est pas
        // suivi d'un second.
        const farmyard = hit && (hit.window === 'poulailler' || hit.window === 'etable') ? hit.window : null;
        if (!this.room && (!hit || farmyard)) {
          if (!hit) K.astuceMarche(this.input.activePointer);   // un essai de marche : le geste s'explique, une fois
          const now = performance.now(), prev = this.lastTap;
          const near = prev && Math.hypot(wx - prev.x, wy - prev.y) <= (DOUBLE_TAP_PX * pixelRatio()) / this.cameras.main.zoom;
          if (prev && now - prev.t <= DOUBLE_TAP_MS && near) {
            clearTimeout(prev.timer);
            this.lastTap = null;
            if (farmyard) this.goCollect(farmyard, hit.window);
            else if (!this.askMine(wx, wy) && !this.askHollow(wx, wy)) this.goHere(wx, wy);
            return;
          }
          if (prev) clearTimeout(prev.timer);
          const tapNow = { t: now, x: wx, y: wy, timer: 0 };
          if (hit) tapNow.timer = setTimeout(() => { if (this.lastTap === tapNow) this.lastTap = null; this.ctx.bridge.act('stage-open', { window: hit.window }); }, DOUBLE_TAP_MS);
          this.lastTap = tapNow;
          return;
        }
        if (!hit) return;
        if (hit.pile) { if (this.fermier && !(this.ctx.lastModel && this.ctx.lastModel.coucher)) this.fermier.fetch(hit.pile); return; }   // il va au lit ou il dort : rien
        if (hit.window) { this.ctx.bridge.act('stage-open', { window: hit.window }); return; }
        if (hit.hoe) { K.vibre('houe'); this.ctx.bridge.act('hoe', { zone: hit.hoe.zone, case: hit.hoe.case }); return; }
        if (hit.bati !== undefined) { this.ctx.bridge.act('bloc', { case: hit.bati }); return; }
        if (hit.etage) { this.ctx.bridge.act('etage-toggle', {}); return; }
        if (hit.gather) { this.gather(hit.gather); return; }
        if (hit.caillou) { this.pickRock(hit.caillou); return; }
        if (hit.botteleuse !== undefined) { this.jeterFibres(hit.botteleuse); return; }
        if (hit.chop) { this.chop(hit.chop); return; }
        if (hit.mine) { this.mine(hit.mine); return; }
        if (hit.scythe) { this.scythe(hit.scythe); return; }
        if (hit.fish) { this.goFish(hit.fish, wx, wy); return; }
        if (hit.treeHarvest) { this.ctx.bridge.act('harvest-tree', { id: hit.treeHarvest }); return; }
        if (hit.treeSlot !== undefined) { this.ctx.bridge.act('tree-slot', { case: hit.treeSlot }); return; }
        const p = hit.plot;
        if (!p.culture) this.ctx.bridge.act('plant-open', { id: p.id });
        else if (p.mature) this.ctx.bridge.act('harvest', { id: p.id });
        else if (!p.arrosee) this.ctx.bridge.act('water', { id: p.id });
        else this.ctx.bridge.act('stage-open', { window: hit.open });   // rien à faire sur la carte : la fenêtre de sa zone
      }

      // Version 1.19 : le personnage va ramasser au Poulailler ou à l'Étable. Rien à y prendre :
      // la fenêtre du bâtiment s'ouvre, comme un appui simple. Au lit (ou en y allant) : rien.
      goCollect(lieu, win) {
        if (this.ctx.lastModel && this.ctx.lastModel.coucher) return;
        if (this.fermier && this.fermier.collect(lieu)) return;
        this.ctx.bridge.act('stage-open', { window: win });
      }

      // Le personnage va au point (wx, wy) de la carte.
      // Au lit (ou en y allant) : rien. La nuit seule n'empêche pas de marcher.
      goHere(wx, wy) {
        if (!this.fermier || (this.ctx.lastModel && this.ctx.lastModel.coucher)) return;
        // vers le tronc creux : il s'arrête à côté, à sa droite, pas dessus
        const b = this.hollow();
        if (b && wx >= b.x0 - 2 && wx <= b.x1 + 2 && wy >= b.y0 - 4 && wy <= b.y1 + 2) { wx = b.x1 + 8; wy = b.y1 - 3; }
        // (à l'étage : le point touché est sur le plancher, remonté)
        const q = this.etagePoint && !this.rang ? this.etagePoint(wx, wy) : { x: wx, y: wy };
        this.fermier.goTo(q.x, q.y);
      }
    };
    for (const p of F.parties) {
      for (const [name, fn] of Object.entries(p)) {
        if (Object.prototype.hasOwnProperty.call(FarmScene.prototype, name)) console.warn('[FarmStage] méthode en double : ' + name);
        FarmScene.prototype[name] = fn;
      }
    }
    return FarmScene;
  }

  function mount(element, options) {
    if (!global.Phaser || !global.CarteJeu) return false;   // pas de Phaser : la page garde son affichage classique
    if (mounted) return true;
    host = element;
    ctx.bridge = options;
    ctx.base = (options && options.base) || 'assets/';
    ctx.crops = (options && options.crops) || {};
    ctx.carte = (options && options.carte) || null;
    ctx.labelLayer = document.createElement('div');
    ctx.labelLayer.className = 'stage-labels';
    element.appendChild(ctx.labelLayer);
    // Le jeu Phaser est celui de toutes les cartes (js/carte/jeu.js) : la ferme en est une
    // scène, gardée (endormie, pas retirée) quand une autre carte passe devant. Cachée, elle se
    // crée quand même : elle est prête quand la page la montre.
    game = global.CarteJeu.jeu(element);
    if (!game) return false;
    mounted = true;
    if (ctx.visible) { awake = false; show(); } else global.CarteJeu.prepare(element, 'farm', () => new (sceneClass())(ctx));

    // Retour sur la page (onglet réaffiché, téléphone rallumé) : le fond est vérifié tout de
    // suite, puis encore un peu plus tard, le temps que le navigateur rende la mémoire graphique.
    const checkGround = () => {
      const s = getScene();
      if (!s || !s.ready || !ctx.visible) return;
      s.repairGround(false);
      s.groundCheckAt = 0;
    };
    const onBack = () => { if (!document.hidden) { checkGround(); setTimeout(checkGround, 400); setTimeout(checkGround, 1500); } };
    document.addEventListener('visibilitychange', onBack);
    global.addEventListener('pageshow', onBack);
    global.addEventListener('focus', onBack);
    // Un clic sur le canvas est déjà traité par la scène : il ne remonte pas à la page.
    element.addEventListener('click', (e) => { if (game && e.target === game.canvas) e.stopPropagation(); });
    return true;
  }

  function getScene() { return game && (scene || (scene = game.scene.getScene('farm'))); }

  // La ferme à l'écran : sa scène devant (réveillée telle qu'on l'a laissée), dans sa zone.
  function montre() {
    global.CarteJeu.montre(host, 'farm', { cree: () => new (sceneClass())(ctx), garde: true });
  }

  function ready() { const s = getScene(); return !!(s && s.ready); }

  // Deux modèles de vue ont-ils le même contenu ? (comparaison de valeur, sans fabriquer de
  // texte : le modèle arrive environ 5 fois par seconde et ne change presque jamais.) Plus
  // stricte que l'ancienne comparaison des clés JSON : un modèle « différent » de plus ne fait
  // qu'un sync() de plus, qui est idempotent.
  function pareil(a, b) {
    if (a === b) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return a !== a && b !== b; // NaN
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (!pareil(a[i], b[i])) return false;
      return true;
    }
    let n = 0;
    for (const k in a) {
      if (!Object.prototype.hasOwnProperty.call(a, k)) continue;
      if (!Object.prototype.hasOwnProperty.call(b, k) || !pareil(a[k], b[k])) return false;
      n++;
    }
    for (const k in b) if (Object.prototype.hasOwnProperty.call(b, k)) n--;
    return n === 0;
  }

  function update(model) {
    ctx.lastModel = model;
    if (!mounted || !ctx.visible) return;
    if (lastModel && pareil(model, lastModel)) return;
    lastModel = model;
    const s = getScene();
    if (s && s.ready) s.sync(model);
  }

  function show() {
    ctx.visible = true;
    if (!mounted || awake) return;
    awake = true;
    // (le jeu pas encore démarré : la scène appliquera elle-même le dernier modèle dans create())
    montre();
    lastModel = null;
    if (ctx.lastModel) update(ctx.lastModel);
    const s = getScene();
    if (s && s.ready) s.repairGround(false);
  }

  function hide() {
    ctx.visible = false;
    awake = false;
    if (mounted) global.CarteJeu.cache('farm');   // une autre carte affichée : rien ne change pour elle
  }

  // L'intérieur `id` ('serre') peut-il être affiché ? Faux tant que la scène n'est pas prête,
  // ou si sa carte n'a pas pu être chargée.
  function hasRoom(id) { const s = getScene(); return !!(s && s.ready && s.rooms[id]); }
  // Version 1.18 : la carte a-t-elle son personnage (c'est lui qui ramasse) ?
  function hasFermier() { const s = getScene(); return !!(s && s.ready && s.fermier); }

  // « Dormir » : sur la carte, le personnage marche jusqu'à la porte de la maison (la vue le
  // suit) et entre ; `done` est appelé quand il est dedans (tout de suite s'il y est déjà).
  function goHome(done) {
    const s = getScene();
    if (!s || !s.ready || !s.fermier || s.room) { setTimeout(done, 0); return; }
    s.fermier.goHome(done);
  }

  // Le repas de 19 h : le personnage (et la famille) iront à table dans la maison.
  // opts : { convives: [{ perso, enfant }], heureux }. false : pas de personnage.
  function mealScene(opts) {
    const s = getScene();
    return !!(s && s.ready && s.startMeal(opts || {}));
  }

  // Où en est la vue (voir viewInfo()) ; null tant que la scène n'est pas prête.
  function view() { const s = getScene(); return s && s.ready ? s.viewInfo() : null; }

  // Glisse jusqu'à x (px de carte), un point { x, y } ou un lieu ; false si ce n'est pas possible.
  function panTo(target, now) { const s = getScene(); return !!(s && s.ready && s.panTo(target, now)); }

  // FLU-06 : si aucune de ces tuiles (numéros de tuile de la carte) n'est à l'écran, glisse
  // jusqu'à la plus proche du centre. Renvoie true si la vue bouge.
  function showTiles(tiles) {
    const s = getScene();
    if (!s || !s.ready || s.room || !tiles || !tiles.length) return false;
    const v = s.cameras.main.worldView, W = s.grid.cols;
    const centre = (t) => ({ x: (t % W) * T + T / 2, y: Math.floor(t / W) * T + T / 2 });
    if (tiles.some((t) => { const p = centre(t); return v.contains(p.x, p.y); })) return false;
    let best = null;
    for (const t of tiles) {
      const p = centre(t);
      const d = Math.hypot(p.x - v.centerX, p.y - v.centerY);
      if (!best || d < best.d) best = { d, p };
    }
    return s.panTo(best.p, false);
  }

  // Revenu d'une autre carte (js/ui/excursion.js) : le personnage au bout du chemin de l'est
  // (`est`) ou devant la porte de la mine (`mine`) ; la scène pas encore prête, elle le fera en
  // se créant (?arrivee=…).
  function arrive(ou) { const s = getScene(); if (s && s.ready) s.arrive(ou); }
  global.FarmStage = { mount, update, show, hide, ready, view, panTo, showTiles, hasRoom, hasFermier, goHome, mealScene, arrive, scene: getScene }; // scene() : pour le débogage et les tests
})(window);
