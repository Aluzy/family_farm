/*
 * La ville (ville-carte.html), où l'on va depuis la fenêtre de la ville (« Se promener en
 * ville », tout en bas) : ses rues, son parc et ses fontaines, et la fermière qui s'y promène.
 *
 * La carte : assets/ville.json (scripts/ville/carte.py, puis scripts/build-map.mjs) ; ses
 * couches de tuiles (le sol, puis une couche par matière, de bas en haut) et son point
 * « depart ». La fermière : assets/fermiere.png, cases de 16 × 32 nommées dans
 * assets/fermiere.json (scripts/personnage/), la même que sur la carte de la ferme.
 *
 * Elle marche sur le sol (chaussée, trottoirs, herbe, pavés), pas à travers un mur, un toit,
 * une fontaine, une voiture, une palissade ou un banc : un toucher (ou un clic) l'envoie au
 * plus court jusque-là ; les flèches ou ZQSD la dirigent aussi. Sous un arbre, le feuillage
 * s'efface un peu pour la laisser voir. Avec « animations réduites », l'eau reste immobile.
 */
(function () {
  'use strict';

  const T = 16;
  const MAP = { key: 'ville', file: 'assets/ville.json' };
  const HERO = { key: 'fermiere', file: 'assets/fermiere.png', names: 'assets/fermiere.json', w: 16, h: 32, foot: 30, speed: 48, stride: 4 };
  // Les couches qu'on ne traverse pas, et celle qui passe devant la promeneuse (le feuillage).
  const OBSTACLES = ['murs', 'pierre_de_taille', 'vitrages', 'charpente', 'toits', 'fontaines', 'vehicules', 'mobilier'];
  const DEVANT = 'vegetation';
  const FEUILLAGE_ALPHA = 0.45;
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  class VilleScene extends Phaser.Scene {
    constructor() { super('ville'); }

    preload() {
      this.load.tilemapTiledJSON(MAP.key, MAP.file);
      this.load.spritesheet(HERO.key, HERO.file, { frameWidth: HERO.w, frameHeight: HERO.h });
      this.load.json(HERO.key + '_noms', HERO.names);
      // les planches des jeux de tuiles : lues dans la carte une fois chargée
      this.load.once('filecomplete-tilemapJSON-' + MAP.key, () => {
        const data = this.cache.tilemap.get(MAP.key).data;
        for (const set of data.tilesets) this.load.image(set.name, 'assets/' + set.image);
      });
    }

    create() {
      const map = this.make.tilemap({ key: MAP.key });
      this.map = map;
      const sets = map.tilesets.map((s) => map.addTilesetImage(s.name, s.name));
      this.layers = {};
      map.layers.forEach((l, i) => {
        this.layers[l.name] = map.createLayer(l.name, sets, 0, 0).setDepth(l.name === DEVANT ? 1e6 : -100 + i);
      });
      this.makeTileAnims();

      // où l'on marche : là où il y a du sol et rien de ce qu'on ne traverse pas
      this.walk = [];
      for (let y = 0; y < map.height; y++) {
        const row = [];
        for (let x = 0; x < map.width; x++) {
          row.push(!!this.layers.sol.getTileAt(x, y) && !OBSTACLES.some((n) => this.layers[n] && this.layers[n].getTileAt(x, y)));
        }
        this.walk.push(row);
      }

      // la fermière : ses images par nom (marche_bas_0…, idle_cote_0…)
      const noms = (this.cache.json.get(HERO.key + '_noms') || {}).frames || [];
      this.frame = (name) => Math.max(0, noms.indexOf(name));
      const objects = (name) => ((map.getObjectLayer(name) || {}).objects) || [];
      const d = objects('depart')[0] || { x: map.widthInPixels / 2, y: map.heightInPixels / 2 };
      this.hero = this.add.sprite(Math.round(d.x), Math.round(d.y), HERO.key, this.frame('idle_bas_0')).setOrigin(0.5, HERO.foot / HERO.h);
      this.shadow = this.add.ellipse(0, 0, 11, 4, 0x1e1a18, 0.35);
      this.heroPos = { x: d.x, y: d.y };
      this.face = 'bas';
      this.walked = 0;
      this.path = [];
      this.faded = [];

      // la caméra suit la promeneuse, au pixel près, sans sortir de la carte
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
        this.goTo(w.x, w.y);
      });
      this.keys = this.input.keyboard ? this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,Z,Q,S,D,W,A') : null;
      window.Ville = { scene: this };
    }

    fitZoom() {
      const { width, height } = this.scale;
      this.cameras.main.setZoom(Math.max(2, Math.min(5, Math.floor(Math.min(width, height) / 170))));
    }

    // Tuiles animées (l'eau des fontaines) : les animations des jeux de tuiles (Tiled), jouées
    // en changeant l'index des tuiles posées, toutes au même rythme que l'horloge.
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
        if (!best) return;
        gx = best.x; gy = best.y; x = gx * T + T / 2; y = gy * T + T - 2;
      }
      const sx = Math.floor(this.heroPos.x / T), sy = Math.floor(this.heroPos.y / T);
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
      if (!prev.has(goal)) return;
      const steps = [];
      for (let c = goal; prev.get(c) !== -1; c = prev.get(c)) steps.push({ x: (c % W) * T + T / 2, y: Math.floor(c / W) * T + T - 2 });
      steps.reverse();
      if (steps.length) steps[steps.length - 1] = { x: Math.round(x), y: Math.round(y) };
      this.path = steps;
    }

    // Le feuillage devant la promeneuse s'efface un peu ; celui qu'elle a quitté revient.
    fadeFoliage(x, y) {
      for (const t of this.faded) t.alpha = 1;
      this.faded = this.layers[DEVANT].getTilesWithinWorldXY(x - HERO.w / 2, y - HERO.foot, HERO.w, HERO.h - 2) || [];
      for (const t of this.faded) t.alpha = FEUILLAGE_ALPHA;
    }

    update(time, delta) {
      this.stepTileAnims(time);
      const dt = Math.min(delta, 100) / 1000;
      const P = this.heroPos;
      const x0 = P.x, y0 = P.y;
      let vx = 0, vy = 0;
      const k = this.keys;
      if (k) {
        vx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.Q.isDown || k.A.isDown ? 1 : 0);
        vy = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.Z.isDown || k.W.isDown ? 1 : 0);
      }
      if (vx || vy) {
        this.path = [];
        const l = Math.hypot(vx, vy), st = HERO.speed * dt;
        const nx = P.x + (vx / l) * st, ny = P.y + (vy / l) * st;
        // glisse le long d'un bord : chaque axe séparément
        if (this.canWalk(Math.floor(nx / T), Math.floor(P.y / T))) P.x = nx;
        if (this.canWalk(Math.floor(P.x / T), Math.floor(ny / T))) P.y = ny;
      } else if (this.path.length) {
        const to = this.path[0];
        const dx = to.x - P.x, dy = to.y - P.y, l = Math.hypot(dx, dy), st = HERO.speed * dt;
        if (l <= st) { P.x = to.x; P.y = to.y; this.path.shift(); } else { P.x += (dx / l) * st; P.y += (dy / l) * st; }
        vx = dx; vy = dy;
      }
      const H = this.hero;
      const moved = Math.hypot(P.x - x0, P.y - y0);
      if (moved > 0) {
        if (Math.abs(vx) > Math.abs(vy) * 0.8) { this.face = 'cote'; H.setFlipX(vx < 0); } else { this.face = vy > 0 ? 'bas' : 'haut'; H.setFlipX(false); }
        this.walked += moved;
        H.setFrame(this.frame(`marche_${this.face}_${Math.floor(this.walked / HERO.stride) % 4}`));
      } else {
        // debout : elle respire (deux images, lentement)
        H.setFrame(this.frame(`idle_${this.face}_${Math.floor(time / 600) % 2}`));
      }
      H.setPosition(Math.round(P.x), Math.round(P.y)).setDepth(P.y);
      this.shadow.setPosition(Math.round(P.x), Math.round(P.y)).setDepth(P.y - 0.5);
      this.fadeFoliage(Math.round(P.x), Math.round(P.y));
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    const parent = document.getElementById('ville');
    new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      backgroundColor: '#665951',
      pixelArt: true,
      scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
      scene: [VilleScene],
    });
  });
})();
