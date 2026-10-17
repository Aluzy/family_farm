/*
 * L'infra-monde (infra-monde.html) : une île d'herbe pâle sur une eau étoilée, des arbres
 * tordus qui se balancent, et son habitant que le joueur promène.
 *
 * La carte : assets/infra_monde.json (scripts/infra/carte.py, puis scripts/build-map.mjs) ;
 * ses couches de tuiles « eau », « sol » et « rive », ses points « arbres » et « depart ».
 * Les images : scripts/infra/*.py (tuiles, arbre, habitant), dérivées des modèles de
 * scripts/infra/originaux/.
 *
 * Le personnage principal de la partie (assets/personnages/perso_NN.png, comme sur la ferme)
 * marche sur le sol plein (les tuiles de la couche « sol »), pas dans l'eau ni à travers un
 * tronc : un toucher (ou un clic) l'envoie au plus court jusque-là ; les flèches ou ZQSD le
 * dirigent aussi. L'habitant de l'île y flâne de son côté. Avec « animations réduites », les
 * arbres et l'eau restent immobiles, l'habitant ne bouge pas.
 *
 * La carte s'affiche dans la page du jeu (js/ui/excursion.js : InfraMonde.start, stop), à la
 * place de celle de la ferme : c'est une scène du jeu Phaser de toutes les cartes (js/carte/jeu.js) ;
 * le jeu continue de tourner.
 */
(function () {
  'use strict';

  const K = window.CarteKit;
  const T = K.T;
  const v = K.v;
  const MAP = { key: 'infra', file: 'assets/infra_monde.json' };
  const TREE = { key: 'infra_arbre', file: 'assets/infra_arbre.png', w: 32, h: 64, frames: 8, fps: 6, foot: 59 };
  // L'habitant (scripts/infra/habitant.py) : marche de face 0-3, de dos 4-7, de profil 8-11 ;
  // debout de face 12 (13 : l'œil fermé), de dos 14, de profil 15 (16 : l'œil fermé).
  const HERO = {
    key: 'infra_habitant', file: 'assets/infra_habitant.png', w: 15, h: 40,
    speed: K.VITESSES.habitant, fps: 7, blink: { every: [2200, 4200], ms: 140 },
  };
  // Le personnage du joueur (CarteKit.planchePerso) : ses cases nommées ; sans partie, la fermière.
  const PLAYER = { key: 'heros_infra', w: 16, h: 32, foot: 30, speed: K.VITESSES.infra, stride: 4 };
  const reduced = K.reduit;
  const saisie = K.saisie;

  class InfraScene extends Phaser.Scene {
    constructor() { super('infra'); }

    preload() {
      this.load.tilemapTiledJSON(MAP.key, v(MAP.file));
      this.load.spritesheet(TREE.key, v(TREE.file), { frameWidth: TREE.w, frameHeight: TREE.h });
      this.load.spritesheet(HERO.key, v(HERO.file), { frameWidth: HERO.w, frameHeight: HERO.h });
      // (la planche du personnage par son fichier : les textures restent d'une visite à l'autre)
      const sheet = K.planchePerso();
      this.playerKey = PLAYER.key + ':' + sheet.file;
      this.load.spritesheet(this.playerKey, v(sheet.file), { frameWidth: PLAYER.w, frameHeight: PLAYER.h });
      this.load.json(this.playerKey + '_noms', v(sheet.names));
      // les planches des jeux de tuiles : lues dans la carte une fois chargée (déjà là : rien à demander)
      const planches = () => {
        const data = this.cache.tilemap.get(MAP.key).data;
        for (const set of data.tilesets) this.load.image(set.name, v('assets/' + set.image));
      };
      if (this.cache.tilemap.exists(MAP.key)) planches();
      else this.load.once('filecomplete-tilemapJSON-' + MAP.key, planches);
    }

    create() {
      const map = this.make.tilemap({ key: MAP.key });
      this.map = map;
      const sets = map.tilesets.map((s) => map.addTilesetImage(s.name, K.extrude(this.textures, s.name, s.tileWidth), s.tileWidth, s.tileHeight, 1, 2));
      this.layers = {};
      map.layers.forEach((l, i) => { this.layers[l.name] = map.createLayer(l.name, sets, 0, 0).setDepth(-10 + i); });
      this.makeTileAnims();

      // où l'on marche : le sol plein, sans tronc
      this.walk = [];
      for (let y = 0; y < map.height; y++) {
        const row = [];
        for (let x = 0; x < map.width; x++) row.push(!!this.layers.sol.getTileAt(x, y));
        this.walk.push(row);
      }
      const objects = (name) => ((map.getObjectLayer(name) || {}).objects) || [];

      // les arbres, chacun à son moment de balancement
      if (!this.anims.exists(TREE.key)) {
        this.anims.create({ key: TREE.key, frames: this.anims.generateFrameNumbers(TREE.key, { start: 0, end: TREE.frames - 1 }), frameRate: TREE.fps, repeat: -1 });
      }
      this.trees = objects('arbres').map((o, i) => {
        const s = this.add.sprite(Math.round(o.x), Math.round(o.y), TREE.key, 0).setOrigin(0.5, TREE.foot / TREE.h).setDepth(o.y);
        if (!reduced()) s.play({ key: TREE.key, startFrame: (i * 3) % TREE.frames, frameRate: TREE.fps * (0.85 + ((i * 37) % 30) / 100) });
        const tx = Math.floor(o.x / T), ty = Math.floor(o.y / T);
        if (this.walk[ty]) this.walk[ty][tx] = false;
        return s;
      });

      // l'habitant (ses animations portent son nom : elles sont communes à toutes les cartes du jeu)
      const walkAnim = (key, start) => {
        if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(HERO.key, { start, end: start + 3 }), frameRate: HERO.fps, repeat: -1 });
      };
      walkAnim(HERO.key + '_marche_face', 0); walkAnim(HERO.key + '_marche_dos', 4); walkAnim(HERO.key + '_marche_profil', 8);
      const d = objects('depart')[0] || { x: map.widthInPixels / 2, y: map.heightInPixels / 2 };
      // l'habitant, un peu plus loin ; il flâne d'un coin de l'île à l'autre
      const n0 = this.nearWalk(d.x + 3 * T, d.y);
      this.npc = this.add.sprite(Math.round(n0.x), Math.round(n0.y), HERO.key, 12).setOrigin(0.5, 1);
      this.npcShadow = this.add.ellipse(0, 0, 13, 4, 0x281e36, 0.45);
      this.npcPos = { x: n0.x, y: n0.y };
      this.npcFace = 'face';
      this.npcPath = [];
      this.npcWait = 2;
      this.blinkAt = this.time.now + 1500;
      // le personnage du joueur : ses images par nom (marche_bas_0…, idle_cote_0…)
      const noms = (this.cache.json.get(this.playerKey + '_noms') || {}).frames || [];
      this.frame = (name) => Math.max(0, noms.indexOf(name));
      this.hero = this.add.sprite(Math.round(d.x), Math.round(d.y), this.playerKey, this.frame('idle_bas_0')).setOrigin(0.5, PLAYER.foot / PLAYER.h);
      this.shadow = this.add.ellipse(0, 0, 11, 4, 0x281e36, 0.45);
      this.heroPos = { x: d.x, y: d.y };
      this.face = 'bas';
      this.walked = 0;
      this.path = [];

      // la caméra suit l'habitant, au pixel près, sans sortir de la carte
      const cam = this.cameras.main;
      cam.setBackgroundColor('#1f2943');
      cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
      cam.startFollow(this.hero, true, 0.12, 0.12);
      cam.setRoundPixels(true);
      this.fitZoom();
      window.CarteJeu.suitTaille(this, () => this.fitZoom());

      // un appui (moins de CarteKit.APPUI.glisse px CSS entre l'appui et le relâchement) sur
      // l'habitant : ce qu'on en voit ; ailleurs, un double appui (comme sur les autres cartes) :
      // y aller, un rond marque l'arrivée
      const slop = K.APPUI.glisse * K.ratio();
      const dbl = K.doubleAppui();
      this.input.on('pointerup', (p) => {
        if (p.getDistance() > slop) return;
        const w = cam.getWorldPoint(p.x, p.y);
        if (Math.abs(w.x - this.npcPos.x) <= 10 && w.y >= this.npcPos.y - 38 && w.y <= this.npcPos.y + 4) {
          dbl.oublie();
          if (window.FermeHote && window.FermeHote.say) window.FermeHote.say('👁️ L\'habitant de l\'île te regarde passer, sans un mot.');
          return;
        }
        if (!dbl.appui(w.x, w.y, cam.zoom)) return;
        this.goTo(w.x, w.y);
        const fin = this.path[this.path.length - 1];
        if (fin) K.anneau(this, fin.x, fin.y);
      });
      // le doigt posé puis glissé : il marche dans sa direction tant qu'il reste posé (CarteKit.manette)
      this.manette = K.manette(this);
      // (sans capture : les touches tapées dans un champ de la page y restent ; saisie())
      this.keys = this.input.keyboard ? this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,Z,Q,S,D,W,A', false) : null;
      window.InfraMonde.scene = this;
      this.events.once('destroy', () => { if (window.InfraMonde.scene === this) window.InfraMonde.scene = null; });
    }

    // Un zoom entier en pixels de l'écran (CarteJeu.zoomEntier), comme en ville.
    fitZoom() {
      this.cameras.main.setZoom(window.CarteJeu.zoomEntier(this));
    }

    // Tuiles animées : les animations des jeux de tuiles (Tiled), jouées en changeant l'index
    // des tuiles posées, toutes au rythme de l'horloge (CarteKit).
    makeTileAnims() {
      this.tileAnims = K.animTuiles(this.map, this.layers);
    }

    stepTileAnims(time) {
      K.pasAnimTuiles(this.tileAnims, time);
    }

    canWalk(tx, ty) {
      return !!(this.walk[ty] && this.walk[ty][tx]);
    }

    // Le chemin le plus court (en tuiles, 8 directions sans couper un coin) jusqu'à la tuile
    // marchable la plus proche du point visé.
    goTo(x, y) {
      const steps = this.pathFrom(this.heroPos, x, y);
      if (steps) this.path = steps;
    }

    // La case marchable la plus proche de (x, y), en px (son milieu, au pied ; CarteKit.plusProche).
    nearWalk(x, y) {
      const gx = Math.floor(x / T), gy = Math.floor(y / T);
      const q = K.plusProche((i, j) => this.canWalk(gx + i, gy + j), 11);
      return q ? { x: (gx + q.i) * T + T / 2, y: (gy + q.j) * T + T - 2 } : { x, y };
    }

    // Le chemin le plus court en nombre de cases (CarteKit.chemin, un pas en diagonale compte
    // pour un), jusqu'à la case marchable la plus proche du point visé ; null s'il n'y en a pas.
    pathFrom(from, x, y) {
      const W = this.map.width, H = this.map.height;
      let gx = Math.floor(x / T), gy = Math.floor(y / T);
      if (!this.canWalk(gx, gy)) {
        const q = K.plusProche((i, j) => this.canWalk(gx + i, gy + j), 7, { de: 1 });
        if (!q) return null;
        gx += q.i; gy += q.j; x = gx * T + T / 2; y = gy * T + T - 2;
      }
      const sx = Math.floor(from.x / T), sy = Math.floor(from.y / T);
      const cells = K.chemin({ cols: W, rows: H, libre: (i) => this.canWalk(i % W, (i / W) | 0) }, sy * W + sx, gy * W + gx, { diag: 1 });
      if (!cells) return null;
      const steps = cells.map((c) => ({ x: (c % W) * T + T / 2, y: Math.floor(c / W) * T + T - 2 }));
      if (steps.length) steps[steps.length - 1] = { x: Math.round(x), y: Math.round(y) };
      return steps;
    }

    // L'habitant : une pause, puis un coin de l'île à quelques pas, au pas lent.
    stepNpc(time, dt) {
      const P = this.npcPos;
      let vx = 0, vy = 0;
      if (!this.npcPath.length) {
        this.npcWait -= dt;
        if (this.npcWait <= 0 && !reduced()) {
          this.npcWait = 2 + Math.random() * 4;
          const t = this.nearWalk(P.x + (Math.random() - 0.5) * 12 * T, P.y + (Math.random() - 0.5) * 8 * T);
          this.npcPath = this.pathFrom(P, t.x, t.y) || [];
        }
      } else {
        const to = this.npcPath[0];
        const dx = to.x - P.x, dy = to.y - P.y, l = Math.hypot(dx, dy), st = HERO.speed * 0.6 * dt;
        if (l <= st) { P.x = to.x; P.y = to.y; this.npcPath.shift(); } else { P.x += (dx / l) * st; P.y += (dy / l) * st; }
        vx = dx; vy = dy;
      }
      const N = this.npc;
      if (vx || vy) {
        this.npcFace = Math.abs(vx) > Math.abs(vy) * 1.1 ? 'profil' : vy > 0 ? 'face' : 'dos';
        if (this.npcFace === 'profil') N.setFlipX(vx < 0);
        const key = HERO.key + '_marche_' + this.npcFace;
        if (!N.anims.isPlaying || N.anims.currentAnim.key !== key) N.play(key);
      } else {
        if (N.anims.isPlaying) N.stop();
        // debout ; de temps en temps, il cligne de l'œil
        if (time > this.blinkAt + HERO.blink.ms) this.blinkAt = time + Phaser.Math.Between(...HERO.blink.every);
        const blink = time > this.blinkAt && this.npcFace !== 'dos';
        N.setFrame({ face: blink ? 13 : 12, dos: 14, profil: blink ? 16 : 15 }[this.npcFace]);
      }
      N.setPosition(Math.round(P.x), Math.round(P.y)).setDepth(P.y);
      this.npcShadow.setPosition(Math.round(P.x), Math.round(P.y) - 1).setDepth(P.y - 0.5);
    }

    update(time, delta) {
      this.stepTileAnims(time);
      const dt = Math.min(delta, 100) / 1000;
      this.stepNpc(time, dt);
      const P = this.heroPos;
      let vx = 0, vy = 0;
      const k = saisie() ? null : this.keys;
      const j = this.manette.dir();
      if (j) { vx = j.x; vy = j.y; }
      else if (k) {
        vx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.Q.isDown || k.A.isDown ? 1 : 0);
        vy = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.Z.isDown || k.W.isDown ? 1 : 0);
      }
      if (vx || vy) {
        this.path = [];
        const l = Math.hypot(vx, vy), st = PLAYER.speed * dt;
        const nx = P.x + (vx / l) * st, ny = P.y + (vy / l) * st;
        // glisse le long d'un bord : chaque axe séparément
        if (this.canWalk(Math.floor(nx / T), Math.floor(P.y / T))) P.x = nx;
        if (this.canWalk(Math.floor(P.x / T), Math.floor(ny / T))) P.y = ny;
      } else if (this.path.length) {
        const to = this.path[0];
        const dx = to.x - P.x, dy = to.y - P.y, l = Math.hypot(dx, dy), st = PLAYER.speed * dt;
        if (l <= st) { P.x = to.x; P.y = to.y; this.path.shift(); } else { P.x += (dx / l) * st; P.y += (dy / l) * st; }
        vx = dx; vy = dy;
      }
      const H = this.hero;
      const moved = Math.hypot(vx, vy) > 0;
      if (moved) {
        const r = K.regard(vx, vy);
        this.face = r.face; H.setFlipX(r.flip);
        this.walked += PLAYER.speed * dt;
        H.setFrame(this.frame(`marche_${this.face}_${Math.floor(this.walked / PLAYER.stride) % 4}`));
      } else {
        H.setFrame(this.frame(`idle_${this.face}_${Math.floor(time / 600) % 2}`));
      }
      H.setPosition(Math.round(P.x), Math.round(P.y)).setDepth(P.y);
      this.shadow.setPosition(Math.round(P.x), Math.round(P.y)).setDepth(P.y - 0.5);
    }
  }

  // Une carte à la fois (js/ui/excursion.js), scène du jeu de toutes les cartes (js/carte/jeu.js) :
  // start la montre dans `parent` (une scène neuve ; les images déjà chargées restent), stop
  // l'enlève. Sans Phaser : false.
  function start(parent) {
    if (!window.CarteJeu) return false;
    return !!window.CarteJeu.montre(parent, 'infra', { cree: () => new InfraScene(), neuve: true });
  }
  function stop() {
    if (window.CarteJeu && window.CarteJeu.affichee() === 'infra') window.CarteJeu.cache('infra');
    window.InfraMonde.scene = null;
  }
  window.InfraMonde = { start, stop, scene: null };
})();
