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
 *                FarmStage.perso() (ses pieds et où il regarde : la carte du monde, fiche 8),
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
  const { T, MAP, TREE_FRAME, TREE_BODY, SPRINKLER, ROBOT, TALL_GRASS, DEFAULT_W, DEFAULT_H, DEFAULT_OBJECTS, WELL, TANK, CAT_FRAME, COMPAGNONS, FERMIER_FRAME, PERSONNAGE, HERD_SHEETS, MEUBLES, LITS, TAP_SLOP, DOUBLE_TAP_MS, DOUBLE_TAP_PX, MIN_TAP, MAX_SPEED, FOLLOW_MS, FOLLOW_UP, LABEL_HOLD_MS, LONG_PRESS_MS, GROUND_CHECK_MS } = F.C;
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
  const ctx = { bridge: null, base: 'assets/', crops: {}, carte: null, monde: null, labelLayer: null, lastModel: null, visible: false };

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
        // l'écran de chargement (jeu.html) : les images comptent pour 10 à 70 %
        L.on('progress', (p) => { if (global.Chargement) global.Chargement.avance(0.1 + 0.6 * p); });
        L.on('loaderror', (file) => this.missing.add(file.key));
        L.image('crops', v('crops.png'));
        L.image('soil_dry', v('soil_dry.png'));
        L.image('soil_wet', v('soil_wet.png'));
        L.spritesheet(F.C.RAMASSABLES.key, v(F.C.RAMASSABLES.file), F.C.RAMASSABLES.frame);
        L.spritesheet(F.C.BLOCS_CARTE.key, v(F.C.BLOCS_CARTE.file), F.C.BLOCS_CARTE.frame);
        L.spritesheet(F.C.BLOCS_CARTE.hauts.key, v(F.C.BLOCS_CARTE.hauts.file), F.C.BLOCS_CARTE.hauts.frame);
        // les animaux de compagnie de la famille (js/ambient-life.js) : trois robes de chat, trois de chien
        for (const k of COMPAGNONS) L.spritesheet(k, v(k + '.png'), CAT_FRAME);
        // la calèche du grand monde (js/carte/ferme/caleche.js, fiche 7c)
        if (K.CALECHE) L.spritesheet(K.CALECHE.key, v(K.CALECHE.file), { frameWidth: K.CALECHE.w, frameHeight: K.CALECHE.h });
        // le cheval : sellé, seul (à l'Écurie), son poteau (js/carte/cheval.js)
        if (K.chargeCheval) K.chargeCheval(this, v);
        L.spritesheet('fermier', v(PERSONNAGE + '.png'), FERMIER_FRAME);
        L.json('fermier_cases', v(PERSONNAGE + '.json'));
        L.json('perso_cases', v('personnages/cases.json'));
        for (const [kind, [file, size]] of Object.entries(HERD_SHEETS)) L.spritesheet(kind, v(file), size);
        L.spritesheet(TALL_GRASS.key, v(TALL_GRASS.file), TALL_GRASS.frame);
        L.spritesheet(TALL_GRASS.fleurs.key, v(TALL_GRASS.fleurs.file), TALL_GRASS.frame);
        L.spritesheet(WELL.key, v(WELL.file), WELL.frame);
        L.spritesheet(TANK.key, v(TANK.file), TANK.frame);
        L.tilemapTiledJSON(MAP.key, v(MAP.json));
        L.spritesheet(SPRINKLER.key, v(SPRINKLER.file), SPRINKLER.frame);
        L.spritesheet(ROBOT.key, v(ROBOT.file), ROBOT.frame);
        L.spritesheet(ROBOT.station.key, v(ROBOT.station.file), ROBOT.station.frame);
        for (const name of MEUBLES) L.image('meuble_' + name, v('meuble_' + name + '.png'));
        for (const name of LITS) L.image('meuble_' + name + '_drap', v('meuble_' + name + '_drap.png'));
        L.image(MAP.tiles, v(MAP.image));
        L.spritesheet('verger', v('verger.png'), TREE_FRAME);
        L.spritesheet('arbre_clair_sp', v('arbre_clair_sp.png'), { frameWidth: 56, frameHeight: 64 });
        L.spritesheet('pin_clair_sp', v('pin_clair_sp.png'), { frameWidth: 72, frameHeight: 64 });
        L.image('terre_bords', v('terre_bords.png'));
        L.image('terre_serre', v('terre_serre.png'));   // les bacs de la Serre (scripts/carte/terre_serre.py)
        L.image('soil_wet_serre', v('soil_wet_serre.png'));
        // les sols des biomes du grand monde (scripts/carte/sols_monde.py, js/carte/ferme/sol.js)
        if (this.ctx.monde) L.image('sols_monde', v(this.ctx.monde.tuiles.fichier));
        // la végétation du grand monde (scripts/carte/vegetation.py, js/carte/ferme/vegetation.js)
        if (this.ctx.monde) { L.image('vegetation', v('vegetation.png')); L.json('vegetation_cases', v('vegetation.json')); }
        // ses rochers, ses falaises, sa côte (scripts/carte/roches.py, js/carte/ferme/vegetation.js)
        if (this.ctx.monde) { L.image('roches', v('roches.png')); L.json('roches_cases', v('roches.json')); }
        // ses lieux (l'entrée des grottes, les coins de pêche : scripts/carte/lieux.py) et ses bêtes
        // (scripts/carte/faune.py : une planche par espèce, découpée d'après faune.json ;
        // js/carte/ferme/faune-monde.js)
        if (this.ctx.monde) {
          L.image('lieux_monde', v('lieux_monde.png'));
          L.image('tente', v('tente.png')); // le récit, lot 8 : la tente du bivouac (scripts/carte/tente.py)
          L.json('lieux_monde_cases', v('lieux_monde.json'));
          // les hameaux bâtis (scripts/carte/hameaux.py, js/carte/ferme/hameaux.js)
          L.image('hameaux', v('hameaux.png'));
          L.json('hameaux_cases', v('hameaux.json'));
          L.json('faune_cases', v('faune.json'));
          for (const e of this.ctx.monde.faune.especes) L.image('faune_' + e.cle, v('faune_' + e.cle + '.png'));
        }
      }

      create() {
        this.cameras.main.setBackgroundColor('#6a8157'); // vert de l'herbe de la carte
        this.cameras.main.roundPixels = false;
        this.makePlaceholders();
        this.defineFrames();
        this.bakeGround();                    // (le sol par régions : syncRegions, à chaque image)
        this.makeSun();                       // les ombres portées, qui suivent le soleil (js/carte/ferme/soleil.js)
        this.watchGround();
        this.makeTileAnims();
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
        if (I.mouse) I.mouse.disableContextMenu();   // (le bouton droit fait glisser la vue en mode Construire)
        I.on('pointermove', this.onMove, this);
        I.on('pointerup', (p) => this.onUp(p, true));
        I.on('pointerupoutside', (p) => this.onUp(p, false));
        // Dehors, le doigt posé puis glissé : le personnage marche dans sa direction tant qu'il
        // reste posé (CarteKit.manette) ; pas quand la houe laboure, ni la bulle de la citerne,
        // ni pendant la pêche, ni au lit.
        this.manette = K.manette(this, () => this.suitPerso() && !!this.drag && !this.drag.labour && !this.drag.trace && !this.drag.deplace && !this.drag.held && !this.drag.meuble
          && !this.fishing && !(this.ctx.lastModel && this.ctx.lastModel.coucher));
        I.on('gameout', () => { if (!this.drag) this.setHover(null); });
        this.makePincement();            // sur téléphone : deux doigts règlent le zoom (camera.js)
        I.on('wheel', (p, over, dx, dy) => { if (this.suitPerso()) return; this.vx = this.vy = 0; this.pan = null; this.setCentre(this.cx + ((dx || dy) * pixelRatio()) / this.cameras.main.zoom, this.cy); });
        this.scale.on('resize', () => this.fit());
        this.fit();
        // Vie d'ambiance (js/ambient-life.js, facultatif) : ombres de nuages, petites bêtes de
        // passage, et les animaux de compagnie de la famille. Voir docs/vie-ambiance.md.
        this.ambient = null;
        if (global.AmbientLife) {
          try {
            this.ambient = global.AmbientLife.attach(this, {
              world: this.world, map: this.mapRaw, tiles: this.has(MAP.tiles) ? MAP.tiles : null,
              objects: this.objects, lightDepth: this.light.depth, reduced: reducedMotion,
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
              // le grand monde : ni la mer, ni les lacs, les rivières (sauf à gué), les falaises, les
              // sommets (js/engine/monde-sol.js, caseMarchable ; une région pas encore faite non plus)
              marchable: this.ctx.monde ? (i) => this.ctx.monde.marchable(i) : null,
              // à l'étage, il passe devant son voile
              depth: (y) => (this.etageDepth ? this.etageDepth(y) : y),
              lift: () => (this.etageLift ? this.etageLift() : 0),
              couchage: () => this.bedSpot(),
              foyer: () => this.homeDoor(),
              // (une ruche pleine, « ruche:<case> » : juste devant elle, sous sa case)
              cle: (lieu) => {
                if (String(lieu).startsWith('ruche:')) { const c = Number(String(lieu).slice(6)), cols = this.grid.cols; return Number.isInteger(c) ? { x: (c % cols) * T + T / 2, y: (Math.floor(c / cols) + 1) * T + 6 } : null; }
                const k = this.keyBlockOf(lieu); return k ? { x: k.x, y: k.y + 6 } : null;
              },
              arbre: (c) => (this.ctx.carte ? this.treeRect(c) : null),
            });
          } catch (e) { console.warn('[FarmStage] personnage indisponible', e); }
        }
        // Les autres membres de la famille (js/famille-ferme.js, facultatif) : leur journée sur
        // la carte.
        this.family = null;
        if (global.FamilleFerme && this.fermier) {
          try {
            this.family = global.FamilleFerme.attach(this, {
              fermier: this.fermier, frames: (this.cache.json.get('perso_cases') || cases || {}).frames, reduced: reducedMotion,
              // le second adulte a fini au Poulailler ou à l'Étable : ce qu'il a pris, sa bulle
              aide: (lieu, done) => setTimeout(() => done(this.ctx.bridge && this.ctx.bridge.aide ? this.ctx.bridge.aide(lieu) : null), 0),
              gain: (items) => this.showGainAide(items),
              // fiche 19 : ses initiatives (arroser, puiser, cuisiner, ramasser) : où se tenir, son geste
              lieu: (l) => (this.lieuCompagnon ? this.lieuCompagnon(l) : null),
              // la marche donne faim (js/engine/repas.js) ; le réfrigérateur posé (sinon la boîte à
              // nourriture) : où s'y servir, devant lui
              marche: (id, px) => { if (this.ctx.bridge && this.ctx.bridge.marche) this.ctx.bridge.marche(id, px); },
              boite: () => {
                const B = [...(this.blocks || new Map()).values()];
                const e = B.find((b) => b.sorte === 'refrigerateur') || B.find((b) => b.sorte === 'boite_nourriture');
                return e ? { x: e.x, y: e.y + 8 } : null;
              },
              // la nuit, le k-ième membre dort dans le (k + 2)-ième couchage (le premier : le personnage)
              lit: (k) => (this.bedSpots ? this.bedSpots()[k + 1] || null : null),
              // l'intérieur de la maison du foyer : ses places (chantier.js, homeInside)
              maison: () => (this.homeInside ? this.homeInside() : null),
              file: (perso, enfant) => v(K.planche(perso, enfant)),
            });
          } catch (e) { console.warn('[FarmStage] famille indisponible', e); }
        }
        this.ready = true;
        this.chargement = !!global.Chargement;   // l'écran de chargement attend la vue dessinée (update)
        if (this.chargement) global.Chargement.avance(0.75);
        this.followSnap = true;          // la vue part centrée sur le personnage
        if (this.ctx.lastModel) this.sync(this.ctx.lastModel, true);
        this.makeArrivee();
        // (cachée pendant le chargement, une autre carte affichée : js/carte/jeu.js l'endort)
      }

      onDown(pointer) {
        // Un deuxième doigt est ignoré ; le même pointeur qui rappuie repart de zéro (cas d'un
        // relâchement perdu, par exemple hors de la fenêtre). Pendant un pincement, rien.
        if (this.pince || (this.drag && this.drag.id !== pointer.id)) return;
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
          // en mode Construire, un glissement parti d'une case où le bloc se pose : une ligne de blocs
          trace: null,
          // en mode Construire, un glissement parti d'un meuble ou d'un bloc seul : le déplacer
          deplace: null,
        };
        const mc = this.meubleSous ? this.meubleSous(wp.x, wp.y) : null;
        if (mc !== null) { this.drag.meuble = { case: mc, c: Math.floor(wp.x / T), r: Math.floor(wp.y / T), dernier: mc }; return; }
        // (en mode Construire, à la souris : le bouton droit ou du milieu fait seulement glisser la vue)
        if (this.fige && pointer.button > 0) { this.drag.panSeul = true; return; }
        if (!this.drag.fort) this.drag.labour = this.labourStart(wp.x, wp.y);
        if (!this.drag.fort && !this.drag.labour) this.drag.trace = this.traceStart(wp.x, wp.y);
        // La pipette (mode Construire, au sol) : un appui maintenu sans bouger sur un bloc posé le
        // prend en main (js/ui/chantier.js, bloc-pipette) ; le tracé qui en partait est oublié.
        const mb = this.ctx.lastModel && this.ctx.lastModel.bati;
        if (mb && !mb.rang && !mb.meuble && !this.drag.fort && !this.drag.labour) {
          const hb = this.hitAt(wp.x, wp.y);
          // déplacer : un glissement parti d'un meuble ou d'un bloc seul (js/ui/chantier.js, deplacable)
          const dp = !this.drag.trace && hb && hb.bati !== undefined && this.ctx.bridge.trace ? this.ctx.bridge.trace.deplacable(hb.bati) : null;
          if (dp) this.drag.deplace = { ...dp, prise: hb.bati, vers: dp.ancre, ok: true };
          if (hb && hb.bati !== undefined && this.ctx.bridge.trace && this.ctx.bridge.trace.pipette(hb.bati)) {
            const d = this.drag;
            d.holdTimer = setTimeout(() => {
              if (this.drag !== d || d.moved) return;
              d.held = true;
              d.trace = null;
              this.clearTraceMarks();
              this.setHover(null);
              K.vibre('houe');
              this.ctx.bridge.act('bloc-pipette', { case: hb.bati });
            }, LONG_PRESS_MS);
          }
        }
        // Appui maintenu sur le silo (hors du mode Construire) : le mode Construire, un bloc de
        // silo en main, pour l'agrandir (js/ui/chantier.js).
        if (!this.drag.labour && !this.drag.fort && !(this.ctx.lastModel && this.ctx.lastModel.bati) && this.siloAt(wp.x, wp.y)) {
          const d = this.drag;
          d.holdTimer = setTimeout(() => {
            if (this.drag !== d || d.moved) return;
            d.held = true;
            this.setHover(null);
            K.vibre('houe');
            this.ctx.bridge.act('silo-agrandir', {});
          }, LONG_PRESS_MS);
        }
        // Fiche 21 : appui maintenu sur une parcelle (sans outil en main) : la fenêtre de sa zone,
        // à la ligne de cette parcelle (toutes les parcelles, Planter partout, Arroser tout,
        // le semis automatique). L'appui simple, lui, n'ouvre plus de fenêtre (plotTap).
        if (!this.drag.labour && !this.drag.fort) {
          const h = this.hitAt(wp.x, wp.y);
          if (h && h.plot && h.open) {
            const d = this.drag;
            d.holdTimer = setTimeout(() => {
              if (this.drag !== d || d.moved) return;
              d.held = true;
              this.setHover(null);
              K.vibre('houe');
              this.ctx.bridge.act('aller', { window: h.open, anchor: `plot-${h.plot.id}` });
            }, LONG_PRESS_MS);
          }
        }
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
            this.game.canvas.style.cursor = hit ? 'pointer' : this.suitPerso() ? 'default' : 'grab';
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
        if (d.deplace && !d.held) {
          if (!d.moved && Math.hypot(dx, dy) >= TAP_SLOP * pixelRatio()) { d.moved = true; clearTimeout(d.holdTimer); this.setHover(null); }
          if (d.moved) this.deplaceTo(d, this.cameras.main.getWorldPoint(pointer.x, pointer.y));
          return;
        }
        if (d.trace) {
          if (!d.moved && Math.hypot(dx, dy) >= TAP_SLOP * pixelRatio()) { d.moved = true; this.setHover(null); }
          if (d.moved) this.traceTo(d, this.cameras.main.getWorldPoint(pointer.x, pointer.y));
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
          this.dragged = true;   // signalé à la page par reportView()
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
        clearTimeout(d.holdTimer);
        if (d.fort && this.chargeEnd(d)) return;     // le coup fort (ou une charge lâchée trop tôt)
        if (d.held) {
          // La bulle reste un instant après le relâchement ; l'appui n'ouvre rien.
          this.tankTipUntil = performance.now() + LABEL_HOLD_MS;
          return;
        }
        // Au doigt, rien ne « survole » : le nom reste un instant, puis s'efface.
        if (pointer.wasTouch && this.hoverId) this.hoverUntil = performance.now() + LABEL_HOLD_MS;
        if (d.panSeul && !d.moved) return;          // (le bouton droit, sans glisser : rien)
        if (d.meuble && d.moved) return;           // l'aperçu du meuble a glissé : il reste où il est
        if (d.deplace && d.moved) {
          this.clearTraceMarks();
          const D = d.deplace;
          if (D.ok && D.vers !== D.ancre) this.ctx.bridge.act('bloc-deplacer', { de: D.ancre, vers: D.vers });
          return;
        }
        if (d.trace && d.moved) {
          this.clearTraceMarks();
          // (toutes les cases où le bloc se pose, dans l'ordre : au-delà du stock, la page propose de
          // fabriquer ce qui manque, js/ui/chantier.js)
          const gomme = d.trace.info.gomme, poses = d.trace.cases.filter((c, i) => d.trace.etat[i] === (gomme ? 'fait' : 'ok'));
          if (poses.length) this.ctx.bridge.act('bloc-many', { cases: poses.join(','), gomme: gomme ? 1 : 0 });
          return;
        }
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
        // L'écran de chargement (jeu.html) s'efface quand la vue est entièrement dessinée (vueDessinee :
        // les régions sous la caméra, leur sol du grand monde arrivé), la carte affichée ; pas pendant
        // la configuration d'une nouvelle partie (l'écran y est caché, il attend la ferme qui suit).
        if (this.chargement && this.ctx.visible && !document.body.classList.contains('configuration')) {
          const part = this.vueDessinee();
          global.Chargement.avance(0.75 + 0.25 * part);
          if (part >= 1) { this.chargement = false; global.Chargement.fini(); }
        }
        // Déplacement et fondu suivent l'horloge réelle : ils durent le même temps même
        // si les images sont lentes (Phaser plafonne `delta`).
        if (this.pan) this.stepPan();
        else if (this.vx || this.vy) this.stepInertia(dt);
        this.stepLanterns(time, dt / 1000);      // (avant le voile : leurs lumières y sont posées)
        this.lumiere.step();
        this.syncEauMonde();                    // (les blocs d'eau du grand monde près de la vue : eau-monde.js)
        this.syncVegetation();                  // (les arbres du grand monde près de la vue : vegetation.js)
        if (this.tileAnims.length) this.stepTileAnims(time);
        this.stepEau(time, dt / 1000);           // (l'eau vivante, js/carte/ferme/eau.js)
        if (this.hoverUntil && !this.drag && performance.now() >= this.hoverUntil) this.setHover(null);
        if (this.tankTipUntil && performance.now() >= this.tankTipUntil) this.showTankTip(false);
        this.syncTankTip();
        this.syncCaseTip();                     // (fiche 21 : la bulle d'une case de culture)
        // Filet de sécurité : le fond est vérifié toutes les quelques secondes.
        if (time >= this.groundCheckAt) { this.groundCheckAt = time + GROUND_CHECK_MS; this.repairGround(false, true); }
        if (this.ambient) this.ambient.update(delta);
        // le mode Construire fige le monde : les personnages s'effacent et ne bougent plus
        const fige = !!(this.ctx.lastModel && this.ctx.lastModel.bati);
        this.figer(fige);
        this.syncConstructible();               // (en mode Construire : les cases où le bloc se pose, en blanc)
        this.stepCharge();
        if (this.fermier && !fige) {
          this.fermier.steer(this.manette.dir());
          this.fermier.update(delta);
          this.stepRegionPerso();            // (la région où il entre devient vue : js/carte/ferme/sol.js)
        }
        this.stepMine();
        this.stepLieuxMonde(time);              // (les entrées des grottes du monde, les coins de pêche : lieux-monde.js)
        if (!fige) {
          this.stepHameaux(dt / 1000);            // (les hameaux bâtis : leurs toits, leur fumée, l'arrivée : hameaux.js)
          if (this.stepCaleche) this.stepCaleche(dt / 1000);   // (la calèche : caleche.js)
          if (this.stepVisite) this.stepVisite(dt / 1000);     // (la visite de bienvenue : visite.js, fiche 18)
          if (this.family) this.family.update(delta);
        }
        // La vue suit le personnage, centrée sur lui (comme sur les autres cartes).
        if (this.suitPerso()) {
          const p = this.fermier.pos();
          if (p) {
            this.pan = null;
            const k = this.followSnap ? 1 : Math.min(1, dt / FOLLOW_MS);
            this.followSnap = false;
            this.setCentre(this.cx + (p.x - this.cx) * k, this.cy + (p.y - FOLLOW_UP - this.cy) * k);
          }
        }
        this.syncRegions();
        this.syncHerbes();                      // (les touffes au pied des murs et des sols : herbes.js)
        this.cullDecor();
        this.stepOccluders(delta);
        this.stepVegetation(delta);
        this.stepFaune(time, delta);            // (les bêtes du grand monde : faune-monde.js)
        this.stepTallGrass(delta);
        this.stepShards(delta);
        this.stepSprinklers();
        this.stepFires(time);
        this.stepSurbrillance(time);
        this.stepPlantation(time);
        this.stepSilo();
        this.stepMurs(dt / 1000);
        this.stepEtage(dt / 1000);
        this.stepToits(dt / 1000);
        this.stepVoilure(dt / 1000);
        this.stepPieces();
        this.stepFile(delta);                   // (la file des gestes du joueur, leurs reflets : file.js)
        this.stepBeasts(time, delta / 1000);
        this.stepAbeilles(delta / 1000);
        this.stepBotteleuses(dt);
        this.stepChaines(dt);                   // (les chaînes de production qui tournent : chaines.js)
        this.stepRobot(dt);
        this.stepFishing(delta);
        this.stepSun();
        if (this.stepBrouillard) this.stepBrouillard(time, delta);   // (le brouillard du grand monde : brouillard.js)
        if (this.stepBoussole) this.stepBoussole();                  // (la boussole : boussole.js)
        this.placeLabels();
        this.placePiles();
        this.placeGain();
        this.placeGainAide();
        this.stepMatin();
        this.reportView();
      }

      // La vue suit-elle le personnage ? Dehors, dès qu'il est sur la carte (sans lui, la vue
      // glisse au doigt, comme avant).
      suitPerso() {
        // (le mode Construire fige le monde : la vue est libre, le doigt la déplace)
        return !!this.fermier && !this.fige;
      }

      /* ---------- appuis ---------- */

      // Les zones de parcelles : la Zone de culture ('zone'), le Champ ('zone2') et les
      // emplacements de chaque intérieur. `pos(i)` = coin haut-gauche de la i-ième parcelle
      // (null s'il n'y a plus d'emplacement), `at(x, y)` = rang de la parcelle sous un point
      // (-1 : aucune), `place` = lieu dont le nom s'affiche au survol, `window` = fenêtre
      // ouverte par un appui long sur une de ses parcelles (fiche 21 : plus par un appui simple).
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
        // la ferme générée : les parcelles de la Serre, chacune sur sa case (labourée à la houe),
        // parmi les cases de sa pièce (modèle.serreCases) ; pas dans l'intérieur
        const sc = m && m.serreCases;
        if (sc) {
          const cols = this.grid.cols, places = new Set(sc);
          const labourees = new Set((m.serre || []).map((p) => p.case).filter((c) => places.has(c)));
          list.push({
            id: 'serre', place: null, window: 'serre', plots: m.serre || [],
            slot: (p) => p.case,
            pos: (c) => (places.has(c) ? { x: (c % cols) * T, y: Math.floor(c / cols) * T } : null),
            at: (wx, wy) => {
              const c = Math.floor(wy / T) * cols + Math.floor(wx / T);
              return labourees.has(c) ? c : -1;
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
        if (!m || !m.houe || !m.labourables) return null;
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

      // Construire en glissant (js/ui/chantier.js, traceInfo) : un glissement parti d'une case où
      // le bloc en main se pose (ou qui l'a déjà) trace ses cases ; les murs et les barrières, une
      // ligne droite (la rangée ou la colonne de départ, selon le sens dominant du doigt), les sols,
      // toutes les cases traversées ; l'outil pièce, le pourtour d'un rectangle d'un coin à l'autre. Chaque case est marquée, verte si le bloc s'y pose (tant qu'il en reste
      // en main), rouge sinon, et un compte suit le doigt ; au relâchement, les cases vertes sont
      // envoyées ensemble (bloc-many : une seule sauvegarde).
      traceStart(wx, wy) {
        const m = this.ctx.lastModel, T0 = this.ctx.bridge && this.ctx.bridge.trace;
        if (!m || !m.bati || m.bati.meuble || !T0) return null;
        const info = T0.info();
        if (!info) return null;
        // (à un niveau surélevé, les murs rehaussés et l'étage se voient plus haut : `dy` px, etage.js)
        const q = this.etagePoint ? this.etagePoint(wx, wy) : { x: wx, y: wy }, dy = q.y - wy;
        const c = this.tileAtPoint(q.x, q.y);
        // (la gomme part d'un bloc à reprendre ; sinon, d'une case où le bloc se pose, ou qui l'a déjà)
        const e = c < 0 ? false : T0.posable(c);
        if (!e || (info.gomme && e !== 'fait')) return null;
        return { info, depart: c, cases: [c], etat: [], ok: [], seen: new Set([c]), last: { x: q.x, y: q.y }, dy };
      }

      traceTo(d, p) {
        const L = d.trace, W = this.grid.cols, T0 = this.ctx.bridge.trace;
        const wp = { x: p.x, y: p.y + (L.dy || 0) }, dy = L.dy || 0;
        const c0 = L.depart % W, r0 = Math.floor(L.depart / W);
        const c1 = Math.floor(wp.x / T), r1 = Math.floor(wp.y / T);
        if (L.info.forme === 'piece') {
          // l'outil pièce : le pourtour du rectangle de coins (c0, r0) et (c1, r1), dans le sens
          // des aiguilles d'une montre depuis le coin haut-gauche (un stock trop court s'arrête
          // donc en chemin, pas au hasard)
          const xa = Math.min(c0, c1), xb = Math.max(c0, c1), ya = Math.min(r0, r1), yb = Math.max(r0, r1);
          const tour = [];
          for (let x = xa; x <= xb; x++) tour.push([x, ya]);
          for (let y = ya + 1; y <= yb; y++) tour.push([xb, y]);
          if (yb > ya) for (let x = xb - 1; x >= xa; x--) tour.push([x, yb]);
          if (xb > xa) for (let y = yb - 1; y > ya; y--) tour.push([xa, y]);
          L.cases = tour.filter(([x, y]) => x >= 0 && x < W && y >= 0).map(([x, y]) => y * W + x);
        } else if (L.info.forme === 'ligne') {
          // la ligne droite, du départ à la case sous le doigt, sur l'axe où le doigt est allé le plus loin
          const horiz = Math.abs(c1 - c0) >= Math.abs(r1 - r0), n = horiz ? c1 - c0 : r1 - r0, pas = Math.sign(n);
          L.cases = [];
          for (let k = 0; k <= Math.abs(n); k++) L.cases.push(horiz ? r0 * W + c0 + k * pas : (r0 + k * pas) * W + c0);
        } else {
          // les sols : toutes les cases traversées, dans l'ordre (comme la houe)
          const steps = Math.max(1, Math.ceil(Math.hypot(wp.x - L.last.x, wp.y - L.last.y) / 4));
          for (let k = 0; k <= steps; k++) {
            const x = L.last.x + ((wp.x - L.last.x) * k) / steps, y = L.last.y + ((wp.y - L.last.y) * k) / steps;
            const t = Math.floor(y / T) * W + Math.floor(x / T);
            if (L.seen.has(t)) continue;
            L.seen.add(t);
            L.cases.push(t);
          }
          L.last = { x: wp.x, y: wp.y };
        }
        // vertes tant qu'il reste des blocs en main ; rouges au-delà, ou là où le bloc ne se pose
        // pas ; cernées seulement là où il y a déjà ce qu'il faut (un mur pour un mur : 'fait')
        let reste = L.info.stock;
        const avant = L.ok.filter(Boolean).length;
        L.etat = L.cases.map((c) => T0.posable(c));
        // (la gomme : les cases qui ont ce bloc, sans limite de stock)
        L.ok = L.etat.map((e) => { if (L.info.gomme) return e === 'fait'; const ok = e === 'ok' && reste > 0; if (ok) reste -= 1; return ok; });
        const n = L.ok.filter(Boolean).length, besoin = L.etat.filter((e) => e === 'ok').length;
        L.manque = Math.max(0, besoin - L.info.stock);
        if (n > avant) K.vibre('houe');
        this.clearTraceMarks();
        // (comme la grille de la houe : un carré clair cerné, vert ou rouge, lisible sur l'herbe)
        this.traceMarks = L.cases.map((c, i) => {
          const fait = L.etat[i] === 'fait';
          // (la gomme : orangé là où un bloc sera repris, cerné de blanc ailleurs)
          if (L.info.gomme) return this.add.rectangle((c % W) * T + T / 2, Math.floor(c / W) * T + T / 2 - dy, T - 3, T - 3, 0xffb347, L.ok[i] ? 0.6 : 0).setStrokeStyle(1, 0xffffff, 0.95).setDepth(1e5);
          return this.add.rectangle((c % W) * T + T / 2, Math.floor(c / W) * T + T / 2 - dy, T - 3, T - 3, L.ok[i] ? 0xb6f08c : 0xff8a70, fait ? 0 : 0.55)
            .setStrokeStyle(1, fait ? 0xffffff : L.ok[i] ? 0xeaffd8 : 0xffe0d8, 0.95).setDepth(1e5);
        });
        // (le compte : au-dessus de la case sous le doigt ; pour une pièce, du coin qu'il tient)
        const fin = L.info.forme === 'piece' ? Math.max(0, r1) * W + Math.max(0, Math.min(W - 1, c1)) : L.cases[L.cases.length - 1];
        this.traceMarks.push(this.add.text((fin % W) * T + T / 2, Math.floor(fin / W) * T - 2 - dy, L.info.gomme ? `${n} à reprendre` : L.manque ? `${n} / ${besoin} · il en manque ${L.manque}` : `${n} / ${L.info.stock}`, {
          fontFamily: 'Ferme Dialogue, sans-serif', fontSize: '8px', color: '#4a2a10', backgroundColor: '#fff1d2', padding: { x: 2, y: 0 },
        }).setOrigin(0.5, 1).setDepth(1e5 + 1).setResolution(6));
      }

      // Déplacer un bloc posé : sa case d'ancrage suit le doigt (le décalage depuis la case prise),
      // son emprise marquée en vert s'il tient là, en rouge sinon (js/ui/chantier.js, deplacePossible,
      // calculé sur une copie de la partie, seulement quand la case visée change).
      deplaceTo(d, wp) {
        const D = d.deplace, W = this.grid.cols;
        const dc = Math.floor(wp.x / T) - (D.prise % W), dr = Math.floor(wp.y / T) - Math.floor(D.prise / W);
        const col = (D.ancre % W) + dc, row = Math.floor(D.ancre / W) + dr;
        if (col < 0 || col >= W || row < 0) return;
        const vers = row * W + col;
        if (vers === D.vers && this.traceMarks) return;
        D.vers = vers;
        const p = vers === D.ancre ? { ok: true, cases: [] } : this.ctx.bridge.trace.deplacePossible(D.ancre, vers);
        D.ok = p.ok;
        this.clearTraceMarks();
        this.traceMarks = (p.cases || []).map((c) => this.add.rectangle((c % W) * T + T / 2, Math.floor(c / W) * T + T / 2, T - 3, T - 3, p.ok ? 0xb6f08c : 0xff8a70, 0.55)
          .setStrokeStyle(1, p.ok ? 0xeaffd8 : 0xffe0d8, 0.95).setDepth(1e5));
      }

      clearTraceMarks() {
        for (const r of this.traceMarks || []) r.destroy();
        this.traceMarks = null;
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
        // le brouillard du grand monde (brouillard.js) : rien ne s'y touche (un appui y fait marcher)
        if (this.sousBrume && this.sousBrume(wx, wy)) return null;
        const hoeing = !!(this.ctx.lastModel && this.ctx.lastModel.houe);
        let refus = null;                            // en mode houe : une tuile qui ne se laboure pas
        // Version 1.18 : la bulle d'un tas à ramasser passe devant tout.
        // un hameau du grand monde (js/carte/ferme/hameaux.js) : son panneau ; un outil qui n'a rien
        // à y faire (il le dit)
        // un habitant d'un hameau (js/carte/ferme/habitants.js) : il parle
        // la calèche du grand monde (js/carte/ferme/caleche.js) : sa fenêtre, ou on la hèle
        if (!hoeing && this.calecheAt && !(this.ctx.lastModel && this.ctx.lastModel.bati) && this.calecheAt(wx, wy)) return { caleche: true };
        // le visiteur de la visite de bienvenue (js/carte/ferme/visite.js) : il redit sa phrase
        if (!hoeing && this.visiteurAt && !(this.ctx.lastModel && this.ctx.lastModel.bati) && this.visiteurAt(wx, wy)) return { visiteur: true };
        if (!hoeing && this.habitantAt && !(this.ctx.lastModel && this.ctx.lastModel.bati)) {
          const hab = this.habitantAt(wx, wy);
          if (hab) return { habitant: hab };
        }
        const ham = this.hameauOutil ? this.hameauOutil(wx, wy) : null;
        if (ham) return ham;
        // planter un arbre (js/carte/ferme/plantation.js) : la case touchée, rien d'autre
        if (this.plantation) { const c = this.tileAtPoint(wx, wy); return c >= 0 ? { plante: c } : null; }
        // la ferme générée, en mode Construire : la case touchée (poser, reprendre), rien d'autre
        // (sur l'image du silo, au sol : le pied de la colonne touchée, js/carte/ferme/silo.js)
        if (this.ctx.lastModel && this.ctx.lastModel.bati) {
          const sc = !this.niveau ? this.siloCaseAt(wx, wy) : -1;
          if (sc >= 0) return { bati: sc };
          const q = this.etagePoint ? this.etagePoint(wx, wy) : { x: wx, y: wy }, c = this.tileAtPoint(q.x, q.y);
          return c >= 0 ? { bati: c } : null;
        }
        // un escalier (un essai, js/carte/ferme/etage.js) : monter, descendre ; à l'étage, rien d'autre
        const vers = this.escalierVers ? this.escalierVers(wx, wy) : -1;
        if (vers >= 0) return { etage: true, vers };
        // un lit, une paillasse (là où on les voit : toit levé, ou à l'étage) : le choisir (fiche 17)
        if (!hoeing && this.litAt) {
          const lit = this.litAt(wx, wy);
          if (lit !== null) return { lit };
        }
        if (this.niveau) return null;
        const pile = !hoeing ? this.pileAt(wx, wy) : null;
        if (pile) return { pile: pile.id };
        // le grand monde : l'entrée d'une grotte de la montagne (sa bouche, sa flèche), une bête
        // (son nom, sa page de l'encyclopédie : js/carte/ferme/lieux-monde.js, faune-monde.js)
        if (!hoeing && this.ctx.monde) {
          const grotte = this.grotteMondeAt(wx, wy);
          if (grotte) return { grotteMonde: grotte };
          const lieu = this.lieuRecitAt(wx, wy);
          if (lieu) return { lieuRecit: lieu };
          const bete = this.fauneAt(wx, wy);
          if (bete) return { faune: bete };
        }
        // la ferme générée : une pierre, un bout de bois à ramasser à la main
        const brin = !hoeing ? this.gatherAt(wx, wy) : null;
        if (brin) return { gather: brin };
        // un caillou (un rocher d'une seule tuile) se ramasse à la main, sauf la pioche en main
        if (!hoeing && !(this.ctx.lastModel && this.ctx.lastModel.pioche)) {
          const caillou = this.rockAt(wx, wy);
          if (caillou && caillou.cells.size === 1) return { caillou };
        }
        // une chaîne de production (un de ses blocs) : il va jeter les ingrédients dans l'entonnoir
        const chaine = !hoeing ? this.chaineAt(wx, wy) : -1;
        if (chaine >= 0) return { chaine };
        // la botteleuse (une de ses pièces) : il va jeter ses fibres dans l'entonnoir
        const botte = !hoeing ? this.botteleuseAt(wx, wy) : -1;
        if (botte >= 0) return { botteleuse: botte };
        // le distributeur de grain (une de ses pièces) : il va jeter son blé dans l'entonnoir
        const distrib = !hoeing ? this.distributeurAt(wx, wy) : -1;
        if (distrib >= 0) return { distributeur: distrib };
        // le silo de la ferme générée (ses blocs) : la fenêtre du Silo
        if (!hoeing && this.siloAt(wx, wy)) return { window: 'silo' };
        // un four, une cuisinière posés (la ferme générée) : la fenêtre de sa station
        const station = !hoeing ? this.stationAt(wx, wy) : null;
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
        // la canne à pêche en main : l'eau de l'étang ou de la mare sous le doigt s'y pêche ; dans le
        // grand monde, celle d'un lac, d'une rivière, de la mer (peche.js)
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
        // le grand monde : un arbre, un rocher, une plante, un coquillage… qui se prend avec ce
        // qu'il a en main, ou à la main (js/carte/ferme/recolte-monde.js)
        if (!hoeing && this.ctx.monde && this.mondeObjetAt) {
          const piece = this.mondeObjetAt(wx, wy);
          if (piece) return { monde: piece };
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
        // La pompe du puits et la citerne : la fenêtre Eau.
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
        }
        // L'herbe (même labourable) n'ouvre rien, une parcelle non plus (fiche 21 : un geste ou
        // une bulle ; sa fenêtre, d'un appui long). En mode houe, une tuile qui ne se laboure
        // pas dit pourquoi (le moteur refuse).
        return best ? { window: best.window } : refus;
      }

      // Le mode Construire (`oui`) : les personnages (le fermier, la famille, les habitants, le
      // visiteur : leur image porte `personnage`) s'effacent ; ils reviennent tels qu'ils étaient.
      figer(oui) {
        if (oui === !!this.fige) return;
        this.fige = oui;
        for (const o of this.children.list) {
          if (!o.personnage) continue;
          if (oui) { o.avantFige = o.visible; o.setVisible(false); } else if (o.avantFige !== undefined) { o.setVisible(o.avantFige); delete o.avantFige; }
        }
      }

      // En mode Construire, les cases de la vue où le bloc en main se pose (au niveau où l'on
      // construit), en blanc, comme la grille de la houe ; la gomme : celles où elle reprend.
      // Recalculées quand la vue change de case, le bloc, le niveau ou la partie (un nouveau modèle).
      syncConstructible() {
        const m = this.ctx.lastModel, T0 = this.ctx.bridge && this.ctx.bridge.trace;
        const efface = () => { if (this.constructible) { this.constructible.destroy(); this.constructible = null; } this.constructibleCle = null; };
        if (!m || !m.bati || m.bati.meuble || !T0 || !this.grid) { efface(); return; }
        const now = performance.now();
        if (this.constructibleT && now - this.constructibleT < 120) return;
        const v = this.cameras.main.worldView, W = this.grid.cols, H = Math.ceil(this.world.h / T);
        const q = this.etagePoint ? this.etagePoint(0, 0) : { y: 0 }, dy = q.y;
        const c0 = Math.max(0, Math.floor(v.x / T) - 1), c1 = Math.min(W - 1, Math.floor(v.right / T) + 1);
        const r0 = Math.max(0, Math.floor((v.y + dy) / T) - 1), r1 = Math.min(H - 1, Math.floor((v.bottom + dy) / T) + 1);
        const info = T0.info();
        const cle = [c0, c1, r0, r1, m.bati.sorte, m.bati.rang, m.vueNiveau, info && info.gomme].join();
        if (cle === this.constructibleCle && m === this.constructibleModele) return;
        this.constructibleT = now;
        this.constructibleCle = cle;
        this.constructibleModele = m;
        if (this.constructible) { this.constructible.destroy(); this.constructible = null; }
        if ((c1 - c0 + 1) * (r1 - r0 + 1) > 6000) return;          // (trop dézoomé : rien)
        // (au niveau où l'on rehausse les murs : devant le voile de ce niveau et ses blocs)
        const g = this.add.graphics().setDepth(dy && this.etageZ ? this.etageZ(9999.5) : 1.5);
        // (sur le voile sombre d'un niveau : plus marquées)
        g.fillStyle(0xffffff, dy ? 0.4 : 0.24);
        g.lineStyle(1, 0xffffff, dy ? 0.85 : 0.6);
        const voulu = info && info.gomme ? 'fait' : 'ok';
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            if (T0.posable(r * W + c) !== voulu) continue;
            const x = c * T, y = r * T - dy;
            g.fillRect(x + 1, y + 1, T - 2, T - 2);
            g.strokeRect(x + 1.5, y + 1.5, T - 3, T - 3);
          }
        }
        this.constructible = g;
      }

      tap(wx, wy) {
        if (this.ambient) this.ambient.scare(wx, wy);   // un appui tout près fait s'envoler les oiseaux
        const hit = this.hitAt(wx, wy);
        // Version 1.19 : dehors, un double appui sur l'herbe ou un chemin y envoie le personnage ;
        // sur le Poulailler ou l'Étable, il va y ramasser (œufs ; lait et laine). L'appui simple
        // sur ces bâtiments (leur fenêtre) attend donc DOUBLE_TAP_MS de voir s'il n'est pas
        // suivi d'un second.
        const farmyard = hit && (hit.window === 'poulailler' || hit.window === 'etable') ? hit.window : null;
        // (un lit, fiche 17 : l'appui simple demande si on le choisit ; un double appui y marche)
        const lit = hit && hit.lit !== undefined ? hit.lit : null;
        if (!hit || farmyard || lit !== null) {
          if (!hit) K.astuceMarche(this.input.activePointer);   // un essai de marche : le geste s'explique, une fois
          const now = performance.now(), prev = this.lastTap;
          const near = prev && Math.hypot(wx - prev.x, wy - prev.y) <= (DOUBLE_TAP_PX * pixelRatio()) / this.cameras.main.zoom;
          if (prev && now - prev.t <= DOUBLE_TAP_MS && near) {
            clearTimeout(prev.timer);
            this.lastTap = null;
            if (farmyard) this.goCollect(farmyard, hit.window);
            else if (!this.askMine(wx, wy)) this.goHere(wx, wy);
            return;
          }
          if (prev) clearTimeout(prev.timer);
          const tapNow = { t: now, x: wx, y: wy, timer: 0 };
          if (hit) {
            tapNow.timer = setTimeout(() => {
              if (this.lastTap === tapNow) this.lastTap = null;
              if (lit !== null) this.ctx.bridge.act('lit-choisir', { lit: String(lit) });
              else this.ctx.bridge.act('stage-open', { window: hit.window });
            }, DOUBLE_TAP_MS);
          }
          this.lastTap = tapNow;
          return;
        }
        if (!hit) return;
        if (hit.caleche) { if (this.ctx.bridge.calecheTouchee) this.ctx.bridge.calecheTouchee(); return; }
        if (hit.habitant) { this.habitantParle(hit.habitant); return; }
        if (hit.visiteur) { if (this.visiteur) this.visiteParle(this.visiteur); return; }
        if (hit.panneau) { if (this.ctx.bridge.hameauPanneau) this.ctx.bridge.hameauPanneau({ id: hit.panneau.id, nom: hit.panneau.nom, style: hit.panneau.style }); return; }
        if (hit.hameauRefus) { if (this.ctx.bridge.hameauRefus) this.ctx.bridge.hameauRefus(hit.hameauRefus.outil, hit.hameauRefus.nom); return; }
        if (hit.pile) { if (this.fermier && !(this.ctx.lastModel && this.ctx.lastModel.coucher)) this.fermier.fetch(hit.pile); return; }   // il va au lit ou il dort : rien
        if (hit.window) { this.ctx.bridge.act('stage-open', { window: hit.window }); return; }
        if (hit.hoe) { K.vibre('houe'); this.ctx.bridge.act('hoe', { zone: hit.hoe.zone, case: hit.hoe.case }); return; }
        if (hit.plante !== undefined) { this.ctx.bridge.act('arbre-case', { case: hit.plante }); return; }
        if (hit.bati !== undefined) { this.ctx.bridge.act('bloc', { case: hit.bati }); return; }
        if (hit.etage) { this.ctx.bridge.act('etage-toggle', { niveau: hit.vers }); return; }
        if (hit.gather) { this.gather(hit.gather); return; }
        if (hit.caillou) { this.pickRock(hit.caillou); return; }
        if (hit.chaine !== undefined) { this.jeterChaine(hit.chaine); return; }
        if (hit.botteleuse !== undefined) { this.jeterFibres(hit.botteleuse); return; }
        if (hit.distributeur !== undefined) { this.jeterGrain(hit.distributeur); return; }
        if (hit.chop) { this.chop(hit.chop); return; }
        if (hit.mine) { this.mine(hit.mine); return; }
        if (hit.scythe) { this.scythe(hit.scythe); return; }
        if (hit.monde) { this.mondeAgir(hit.monde); return; }
        if (hit.grotteMonde) { this.enterGrotteMonde(hit.grotteMonde); return; }
        if (hit.lieuRecit) { this.lieuRecitTouche(hit.lieuRecit); return; }
        if (hit.faune) { this.fauneTouchee(hit.faune); return; }
        if (hit.fish) { this.goFish(hit.fish, wx, wy); return; }
        if (hit.treeHarvest) { this.ctx.bridge.act('harvest-tree', { id: hit.treeHarvest }); return; }
        this.plotTap(hit, wx, wy);
      }

      // Fiche 21 : un appui sur une parcelle y fait le geste possible (semer, récolter, arroser),
      // comme avant ; s'il n'y a rien à faire (déjà arrosée, en train de pousser, une terre sans
      // graine à semer), plus de fenêtre : la page (bridge.parcelle) donne le texte d'une petite
      // bulle au-dessus de la case. La fenêtre de la zone s'ouvre d'un appui long (onDown).
      plotTap(hit, wx, wy) {
        const p = hit.plot;
        const bulle = this.ctx.bridge.parcelle ? this.ctx.bridge.parcelle(p.id) : null;
        if (bulle) { this.showCaseTip(bulle, Math.floor(wx / T) * T + T / 2, Math.floor(wy / T) * T); return; }
        if (!p.culture) this.ctx.bridge.act('plant-open', { id: p.id });
        else if (p.mature) this.ctx.bridge.act('harvest', { id: p.id });
        else this.ctx.bridge.act('water', { id: p.id });
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
    // la taille des régions du monde, celle du moteur (MONDE.REGION, js/engine/monde.js) : la
    // scène découpe son sol et ses relevés sur la même grille (CarteKit.REGION)
    if (!(options && options.regionTuiles > 0)) { console.warn('[FarmStage] taille des régions inconnue (regionTuiles)'); return false; }
    K.REGION.tuiles = options.regionTuiles;
    host = element;
    ctx.bridge = options;
    ctx.base = (options && options.base) || 'assets/';
    ctx.crops = (options && options.crops) || {};
    ctx.carte = (options && options.carte) || null;
    // le sol du grand monde autour de la ferme (js/ui/monde-sol.js : ses régions, faites dans un
    // Web Worker ; où l'on marche), ou null : rien autour de la carte
    ctx.monde = (options && options.monde) || null;
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

  // Version 1.18 : la carte a-t-elle son personnage (c'est lui qui ramasse) ?
  function hasFermier() { const s = getScene(); return !!(s && s.ready && s.fermier); }
  // La case du personnage sur la carte de la ferme (son numéro), ou -1.
  function persoCase() { const s = getScene(); return s && s.ready && s.persoCase ? s.persoCase() : -1; }

  // « Dormir » : sur la carte, le personnage marche jusqu'à la porte de la maison (la vue le
  // suit) et entre ; `done` est appelé quand il est dedans (tout de suite s'il y est déjà).
  function goHome(done) {
    const s = getScene();
    if (!s || !s.ready || !s.fermier) { setTimeout(done, 0); return; }
    s.fermier.goHome(done);
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
  // (`est`), devant la porte de la mine (`mine`) ou devant l'entrée d'une grotte de la montagne
  // (`grotte_<n>`) ; la scène pas encore prête, elle le fera en se créant (?arrivee=…).
  function arrive(ou) { const s = getScene(); if (s && s.ready) s.arrive(ou); }
  // Un membre de la famille va manger à la boîte à nourriture (js/famille-ferme.js) ; false s'il
  // n'est pas dehors sur la carte.
  function allerManger(id) {
    const s = getScene();
    return !!(s && s.ready && s.family && s.family.allerManger(id));
  }
  // Fiche 8 : le personnage pour la carte du monde (js/ui/carte-monde.js) : ses pieds (px de carte) et où
  // il regarde ({ x, y, face : 'bas', 'haut' ou 'cote', flip : de côté vers la gauche }), ou null.
  function perso() {
    const s = getScene();
    const p = s && s.ready && s.fermier ? s.fermier.pos() : null;
    if (!p) return null;
    const r = s.fermier.regard ? s.fermier.regard() : {};
    return { x: p.x, y: p.y, face: r.face || 'bas', flip: !!r.flip };
  }
  // Fiche 17 : le personnage va remplir la cruche au puits (js/carte/ferme/puits.js) : { ok } ou
  // { ok: false, raison } ('sans' : pas de carte, de personnage ou de puits ; 'ferme' : aucun
  // chemin ; 'loin' : trop loin). Le jeu remplit la cruche quand il y puise (bridge.puiser).
  function allerAuPuits() {
    const s = getScene();
    return s && s.ready && s.allerAuPuits ? s.allerAuPuits() : { ok: false, raison: 'sans' };
  }
  global.FarmStage = { mount, update, show, hide, ready, view, panTo, showTiles, hasFermier, persoCase, perso, goHome, allerManger, allerAuPuits, arrive, scene: getScene }; // scene() : pour le débogage et les tests
})(window);
