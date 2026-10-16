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
 * place de celle de la ferme ; le jeu continue de tourner.
 */
(function () {
  'use strict';

  const T = 16;
  // l'adresse d'un fichier de assets/, suivie sur le site en ligne de « ?v=<empreinte de son
  // contenu> » (js/assets-versions.js, écrit par scripts/build-site.mjs) : un fichier modifié
  // change d'adresse, le téléphone le recharge au lieu de mélanger l'ancien et le nouveau.
  const v = (file) => {
    const t = window.FERME_ASSET_VERSIONS, k = file.replace(/^assets\//, '');
    return t && t[k] ? file + '?v=' + t[k] : file;
  };
  const MAP = { key: 'infra', file: 'assets/infra_monde.json' };
  const TREE = { key: 'infra_arbre', file: 'assets/infra_arbre.png', w: 32, h: 64, frames: 8, fps: 6, foot: 59 };
  // L'habitant (scripts/infra/habitant.py) : marche de face 0-3, de dos 4-7, de profil 8-11 ;
  // debout de face 12 (13 : l'œil fermé), de dos 14, de profil 15 (16 : l'œil fermé).
  const HERO = {
    key: 'infra_habitant', file: 'assets/infra_habitant.png', w: 15, h: 40,
    speed: 44, fps: 7, blink: { every: [2200, 4200], ms: 140 },
  };
  // Le personnage du joueur : ses cases nommées (assets/personnages/cases.json) ; sans partie, la fermière.
  const PLAYER = { key: 'heros_infra', w: 16, h: 32, foot: 30, speed: 46, stride: 4 };
  function playerSheet() {
    const n = window.FermeHote && window.FermeHote.perso ? window.FermeHote.perso() : null;
    return n ? { file: 'assets/personnages/perso_' + String(n).padStart(2, '0') + '.png', names: 'assets/personnages/cases.json' } : { file: 'assets/fermiere.png', names: 'assets/fermiere.json' };
  }
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Les planches de tuiles « extrudées » : chaque tuile recopiée avec un bord d'un pixel qui
  // répète son propre bord (marge 1, espacement 2). Quand la caméra tombe entre deux pixels
  // (zoom, écran à densité non entière), le GPU qui lit juste à côté d'une tuile retombe sur
  // sa propre couleur, et non sur la tuile voisine de la planche : plus de fines lignes sombres
  // aux jointures. Les numéros des tuiles ne changent pas.
  function extrude(textures, key, t) {
    const src = textures.get(key).getSourceImage();
    const cols = Math.floor(src.width / t), rows = Math.floor(src.height / t);
    const canvas = document.createElement('canvas');
    canvas.width = cols * (t + 2);
    canvas.height = rows * (t + 2);
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const sx = c * t, sy = r * t, dx = c * (t + 2) + 1, dy = r * (t + 2) + 1;
        g.drawImage(src, sx, sy, t, t, dx, dy, t, t);
        g.drawImage(src, sx, sy, t, 1, dx, dy - 1, t, 1);                 // haut
        g.drawImage(src, sx, sy + t - 1, t, 1, dx, dy + t, t, 1);         // bas
        g.drawImage(src, sx, sy, 1, t, dx - 1, dy, 1, t);                 // gauche
        g.drawImage(src, sx + t - 1, sy, 1, t, dx + t, dy, 1, t);         // droite
        g.drawImage(src, sx, sy, 1, 1, dx - 1, dy - 1, 1, 1);             // les coins
        g.drawImage(src, sx + t - 1, sy, 1, 1, dx + t, dy - 1, 1, 1);
        g.drawImage(src, sx, sy + t - 1, 1, 1, dx - 1, dy + t, 1, 1);
        g.drawImage(src, sx + t - 1, sy + t - 1, 1, 1, dx + t, dy + t, 1, 1);
      }
    }
    const out = key + '_extrude';
    if (textures.exists(out)) textures.remove(out);
    textures.addCanvas(out, canvas);
    return out;
  }

  class InfraScene extends Phaser.Scene {
    constructor() { super('infra'); }

    preload() {
      this.load.tilemapTiledJSON(MAP.key, v(MAP.file));
      this.load.spritesheet(TREE.key, v(TREE.file), { frameWidth: TREE.w, frameHeight: TREE.h });
      this.load.spritesheet(HERO.key, v(HERO.file), { frameWidth: HERO.w, frameHeight: HERO.h });
      const sheet = playerSheet();
      this.load.spritesheet(PLAYER.key, v(sheet.file), { frameWidth: PLAYER.w, frameHeight: PLAYER.h });
      this.load.json(PLAYER.key + '_noms', v(sheet.names));
      // les planches des jeux de tuiles : lues dans la carte une fois chargée
      this.load.once('filecomplete-tilemapJSON-' + MAP.key, () => {
        const data = this.cache.tilemap.get(MAP.key).data;
        for (const set of data.tilesets) this.load.image(set.name, v('assets/' + set.image));
      });
    }

    create() {
      const map = this.make.tilemap({ key: MAP.key });
      this.map = map;
      const sets = map.tilesets.map((s) => map.addTilesetImage(s.name, extrude(this.textures, s.name, s.tileWidth), s.tileWidth, s.tileHeight, 1, 2));
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

      // l'habitant
      const walkAnim = (key, start) => {
        if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(HERO.key, { start, end: start + 3 }), frameRate: HERO.fps, repeat: -1 });
      };
      walkAnim('marche_face', 0); walkAnim('marche_dos', 4); walkAnim('marche_profil', 8);
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
      const noms = (this.cache.json.get(PLAYER.key + '_noms') || {}).frames || [];
      this.frame = (name) => Math.max(0, noms.indexOf(name));
      this.hero = this.add.sprite(Math.round(d.x), Math.round(d.y), PLAYER.key, this.frame('idle_bas_0')).setOrigin(0.5, PLAYER.foot / PLAYER.h);
      this.shadow = this.add.ellipse(0, 0, 11, 4, 0x281e36, 0.45);
      this.heroPos = { x: d.x, y: d.y };
      this.face = 'bas';
      this.walked = 0;
      this.path = [];

      // la caméra suit l'habitant, au pixel près, sans sortir de la carte
      const cam = this.cameras.main;
      cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
      cam.startFollow(this.hero, true, 0.12, 0.12);
      cam.setRoundPixels(true);
      this.fitZoom();
      this.scale.on('resize', () => this.fitZoom());

      // un toucher : y aller
      this.input.on('pointerup', (p) => {
        if (p.getDistance() > 8) return;
        const w = cam.getWorldPoint(p.x, p.y);
        if (Math.abs(w.x - this.npcPos.x) <= 10 && w.y >= this.npcPos.y - 38 && w.y <= this.npcPos.y + 4) {
          if (window.FermeHote && window.FermeHote.say) window.FermeHote.say('👁️ L\u2019habitant de l\u2019île vous regarde passer, sans un mot.');
          return;
        }
        this.goTo(w.x, w.y);
      });
      this.keys = this.input.keyboard ? this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,Z,Q,S,D,W,A') : null;
      window.InfraMonde.scene = this;
    }

    fitZoom() {
      const { width, height } = this.scale;
      this.cameras.main.setZoom(Math.max(2, Math.min(5, Math.floor(Math.min(width, height) / 170))));
    }

    // Tuiles animées : les animations des jeux de tuiles (Tiled), jouées en changeant l'index
    // des tuiles posées, toutes au même rythme que l'horloge.
    makeTileAnims() {
      this.tileAnims = [];
      const groups = new Map();
      for (const set of this.map.tilesets) {
        for (const [id, def] of Object.entries(set.tileData || {})) {
          if (!def.animation || def.animation.length < 2) continue;
          const gid = set.firstgid + Number(id);
          groups.set(gid, { frames: def.animation.map((f) => set.firstgid + f.tileid), ms: def.animation[0].duration, tiles: [] });
        }
      }
      if (!groups.size) return;
      for (const layer of Object.values(this.layers)) {
        layer.forEachTile((t) => { const g = groups.get(t.index); if (g) g.tiles.push(t); });
      }
      this.tileAnims = [...groups.values()].filter((g) => g.tiles.length);
    }

    stepTileAnims(time) {
      if (reduced()) return;
      for (const g of this.tileAnims) {
        const k = Math.floor(time / g.ms) % g.frames.length;
        if (k === g.cur) continue;
        g.cur = k;
        for (const t of g.tiles) t.index = g.frames[k];
      }
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

    // La case marchable la plus proche de (x, y), en px (son milieu, au pied).
    nearWalk(x, y) {
      const gx = Math.floor(x / T), gy = Math.floor(y / T);
      for (let r = 0; r < 12; r++) {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) === r && this.canWalk(gx + dx, gy + dy)) return { x: (gx + dx) * T + T / 2, y: (gy + dy) * T + T - 2 };
        }
      }
      return { x, y };
    }

    pathFrom(from, x, y) {
      const W = this.map.width, H = this.map.height;
      let gx = Math.floor(x / T), gy = Math.floor(y / T);
      if (!this.canWalk(gx, gy)) {
        let best = null;
        for (let r = 1; r < 8 && !best; r++) {
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !this.canWalk(gx + dx, gy + dy)) continue;
            const d = Math.hypot(dx, dy);
            if (!best || d < best.d) best = { x: gx + dx, y: gy + dy, d };
          }
        }
        if (!best) return null;
        gx = best.x; gy = best.y; x = gx * T + T / 2; y = gy * T + T - 2;
      }
      const sx = Math.floor(from.x / T), sy = Math.floor(from.y / T);
      const prev = new Map([[sy * W + sx, -1]]);
      const queue = [sy * W + sx];
      const goal = gy * W + gx;
      while (queue.length && !prev.has(goal)) {
        const c = queue.shift(), cx = c % W, cy = (c - cx) / W;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const nx = cx + dx, ny = cy + dy, n = ny * W + nx;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev.has(n) || !this.canWalk(nx, ny)) continue;
          if (dx && dy && (!this.canWalk(cx + dx, cy) || !this.canWalk(cx, cy + dy))) continue;
          prev.set(n, c);
          queue.push(n);
        }
      }
      if (!prev.has(goal)) return null;
      const steps = [];
      for (let c = goal; prev.get(c) !== -1; c = prev.get(c)) steps.push({ x: (c % W) * T + T / 2, y: Math.floor(c / W) * T + T - 2 });
      steps.reverse();
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
        const key = 'marche_' + this.npcFace;
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
      const k = this.keys;
      if (k) {
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
        if (Math.abs(vx) > Math.abs(vy) * 0.8) { this.face = 'cote'; H.setFlipX(vx < 0); } else { this.face = vy > 0 ? 'bas' : 'haut'; H.setFlipX(false); }
        this.walked += PLAYER.speed * dt;
        H.setFrame(this.frame(`marche_${this.face}_${Math.floor(this.walked / PLAYER.stride) % 4}`));
      } else {
        H.setFrame(this.frame(`idle_${this.face}_${Math.floor(time / 600) % 2}`));
      }
      H.setPosition(Math.round(P.x), Math.round(P.y)).setDepth(P.y);
      this.shadow.setPosition(Math.round(P.x), Math.round(P.y)).setDepth(P.y - 0.5);
    }
  }

  // Une carte à la fois (js/ui/excursion.js) : start la montre dans `parent`, stop l'enlève.
  let game = null;
  function stop() {
    if (game) { game.destroy(true); game = null; }
    window.InfraMonde.scene = null;
  }
  function start(parent) {
    stop();
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      backgroundColor: '#1f2943',
      pixelArt: true,
      roundPixels: true,     // la caméra et les sprites calés sur des pixels entiers
      scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
      scene: [InfraScene],
    });
    return game;
  }
  window.InfraMonde = { start, stop, scene: null };
})();
