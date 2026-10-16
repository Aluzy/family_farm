/*
 * La ville (ville-carte.html), où l'on va depuis la fenêtre de la ville (« Se promener en
 * ville », tout en bas) : ses rues, son parc et ses fontaines, et la fermière qui s'y promène.
 *
 * La carte : assets/ville.json (scripts/ville/carte.py, puis scripts/build-map.mjs) ; ses
 * couches de tuiles (le sol, puis une couche par matière, de bas en haut) et son point
 * « depart ». La fermière : assets/fermiere.png, cases de 16 × 32 nommées dans
 * assets/fermiere.json (scripts/personnage/), la même que sur la carte de la ferme.
 *
 * Les bâtiments sont en 3/4 (scripts/ville/immeubles.py) : la couche d'objets « batiments »
 * donne l'emprise au sol de chacun (on n'y marche pas) et le haut de son dessin (propriété
 * « haut »). Tout ce qui est dessiné au-dessus de l'emprise cache le sol de derrière, où l'on
 * passe : les couches des bâtiments existent en deux exemplaires, l'un sous les personnages,
 * l'autre (« …_devant ») par-dessus ; autour de chaque personnage, l'exemplaire du dessus
 * s'efface si elle est devant le bâtiment (on la voit devant le mur), et devient transparent
 * si elle est derrière (on la voit à travers le toit, comme sous les arbres).
 *
 * Elle marche sur le sol (chaussée, trottoirs, herbe, pavés), pas à travers un bâtiment,
 * une fontaine, une voiture, une palissade ou un banc : un toucher (ou un clic) l'envoie au
 * plus court jusque-là ; les flèches ou ZQSD la dirigent aussi. Sous un arbre, le feuillage
 * s'efface un peu pour la laisser voir. Avec « animations réduites », l'eau reste immobile.
 *
 * La circulation : des voitures (assets/ville_voitures.png et .json, scripts/ville/voitures.py :
 * cinq couleurs, huit directions) arrivent par un bout de rue au bord de la carte, suivent un
 * trajet de la couche « routes » (une polyligne « entrée>sortie », coins arrondis à la volée) et
 * disparaissent là où la rue touche un autre bord. Elles gardent leurs distances, s'arrêtent
 * devant la promeneuse, et n'entrent dans un carrefour (couche « carrefours ») que si aucune
 * voiture qui s'y trouve ne croise leur trajet. Les longueurs se comptent au sol : la carte est
 * vue de 3/4, une distance verticale à l'écran vaut 1 / KY au sol. Les voitures garées sont des
 * tuiles (couche « vehicules ») ; leur emprise au sol (couche « garees ») arrête la promeneuse.
 * Avec « animations réduites », pas de circulation.
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
  const MAP = { key: 'ville', file: 'assets/ville.json' };
  const HERO = { key: 'fermiere', file: 'assets/fermiere.png', names: 'assets/fermiere.json', w: 16, h: 32, foot: 30, speed: 48, stride: 4 };
  // Les couches qu'on ne traverse pas, et celle qui passe devant la promeneuse (le feuillage).
  // (les bâtiments et les voitures garées : par leur emprise au sol, couches « batiments » et « garees »)
  const OBSTACLES = ['fontaines', 'mobilier'];
  // les couches des bâtiments, doublées d'un exemplaire « _devant » au-dessus des personnages
  const BATI = ['murs', 'pierre_de_taille', 'vitrages', 'charpente', 'toits', 'menuiserie'];
  const BATI_ALPHA = 0.45;
  const DEVANT = 'vegetation';
  const FEUILLAGE_ALPHA = 0.45;
  // La circulation : vitesses en px au sol par seconde, distances au sol.
  const CARS = {
    key: 'voitures', file: 'assets/ville_voitures.png', meta: 'assets/ville_voitures.json',
    max: 6, speed: 46, accel: 40, decel: 90,
    gap: 70,          // d'un centre à l'autre, derrière une voiture (une longueur et un peu plus)
    lane: 16,         // l'écart de côté au-delà duquel ce n'est plus la même file
    hero: 44,         // la distance où elles s'arrêtent devant la promeneuse
    corner: 28,       // le rayon des virages
    cross: 22,        // deux trajets se croisent dans un carrefour s'ils passent à moins de ça
    stop: 34,         // on attend un carrefour le centre à ça de son bord (le nez dehors)
    spawn: [1800, 5200],
  };
  const KY = 0.7;
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  class VilleScene extends Phaser.Scene {
    constructor() { super('ville'); }

    preload() {
      this.load.tilemapTiledJSON(MAP.key, v(MAP.file));
      this.load.spritesheet(HERO.key, v(HERO.file), { frameWidth: HERO.w, frameHeight: HERO.h });
      this.load.json(HERO.key + '_noms', v(HERO.names));
      this.load.spritesheet(CARS.key, v(CARS.file), { frameWidth: 64, frameHeight: 64 });
      this.load.json(CARS.key + '_meta', v(CARS.meta));
      // les planches des jeux de tuiles : lues dans la carte une fois chargée
      this.load.once('filecomplete-tilemapJSON-' + MAP.key, () => {
        const data = this.cache.tilemap.get(MAP.key).data;
        for (const set of data.tilesets) this.load.image(set.name, v('assets/' + set.image));
        // l'exemplaire du dessus de chaque couche de bâtiment
        for (const name of BATI) {
          const l = data.layers.find((x) => x.name === name);
          if (l && !data.layers.some((x) => x.name === name + '_devant')) data.layers.push({ ...l, name: name + '_devant', data: l.data.slice() });
        }
      });
    }

    create() {
      const map = this.make.tilemap({ key: MAP.key });
      this.map = map;
      const sets = map.tilesets.map((s) => map.addTilesetImage(s.name, s.name));
      this.layers = {};
      map.layers.forEach((l, i) => {
        const depth = l.name === DEVANT ? 1e6 : l.name.endsWith('_devant') ? 5e5 + i : -100 + i;
        this.layers[l.name] = map.createLayer(l.name, sets, 0, 0).setDepth(depth);
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
      // les bâtiments et les voitures garées : les tuiles dont le centre est sous leur emprise
      const objects = (name) => ((map.getObjectLayer(name) || {}).objects) || [];
      this.makeBuildings(objects('batiments'));
      for (const r of [...objects('garees'), ...objects('batiments')]) {
        for (let y = Math.floor(r.y / T); y <= Math.floor((r.y + r.height) / T); y++) {
          for (let x = Math.floor(r.x / T); x <= Math.floor((r.x + r.width) / T); x++) {
            const cx = x * T + T / 2, cy = y * T + T / 2;
            if (this.walk[y] && cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height) this.walk[y][x] = false;
          }
        }
      }

      // la fermière : ses images par nom (marche_bas_0…, idle_cote_0…)
      const noms = (this.cache.json.get(HERO.key + '_noms') || {}).frames || [];
      this.frame = (name) => Math.max(0, noms.indexOf(name));
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
      this.makeTraffic(objects('routes'), objects('carrefours'));
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

    // ---------- les bâtiments ----------

    // Chaque tuile de bâtiment appartient au bâtiment dont le dessin la couvre (de son « haut »
    // à sa base, un peu plus large pour les débords de toit) ; celles de l'exemplaire du dessus
    // qui n'appartiennent à aucun (les marches, posées au sol) en sont retirées.
    makeBuildings(objs) {
      this.buildings = objs.map((o) => {
        const p = (o.properties || []).find((q) => q.name === 'haut');
        return { name: o.name, x0: o.x - 8, x1: o.x + o.width + 8, top: p ? p.value : o.y, base: o.y + o.height };
      });
      this.covered = [];
      this.owner = (x, y) => this.buildings.find((b) => x >= b.x0 && x < b.x1 && y >= b.top && y < b.base) || null;
      for (const name of BATI) {
        const up = this.layers[name + '_devant'], down = this.layers[name];
        if (!up) continue;
        up.forEachTile((t) => {
          if (t.index < 0) return;
          const b = this.owner(t.pixelX + T / 2, t.pixelY + T / 2);
          if (!b) { up.removeTileAt(t.x, t.y); return; }
          t.bat = b;
          t.down = down.getTileAt(t.x, t.y);
        });
      }
    }

    // Autour de chaque personnage (sa boîte, en px) : devant un bâtiment, l'exemplaire du
    // dessus s'efface (on la voit devant le mur) ; derrière, il devient transparent et celui du
    // dessous s'efface (on la voit à travers) — pour la promeneuse seulement, les voitures
    // passent simplement derrière.
    uncover(boxes) {
      for (const t of this.covered) { t.alpha = 1; if (t.down) t.down.alpha = 1; }
      this.covered = [];
      for (const { x, y, w, h, foot, see } of boxes) {
        for (const name of BATI) {
          const up = this.layers[name + '_devant'];
          if (!up) continue;
          for (const t of up.getTilesWithinWorldXY(x, y, w, h) || []) {
            if (!t.bat) continue;
            if (foot >= t.bat.base) t.alpha = 0;
            else if (see) { t.alpha = BATI_ALPHA; if (t.down) t.down.alpha = 0; } else continue;
            this.covered.push(t);
          }
        }
      }
    }

    // ---------- la circulation ----------

    // Les trajets : chaque polyligne de « routes », ses coins arrondis (une courbe de Bézier
    // entre les deux points à CARS.corner du coin), puis des points tous les ~2 px avec leur
    // abscisse au sol ; et, pour chaque carrefour, où le trajet y entre et en sort.
    makeTraffic(routes, crossings) {
      this.cars = [];
      this.carMeta = this.cache.json.get(CARS.key + '_meta') || { couleurs: ['rouge'], directions: { droite: 0 } };
      this.crossings = crossings.map((r) => ({ name: r.name, x0: r.x - 8, y0: r.y - 8, x1: r.x + r.width + 8, y1: r.y + r.height + 8, held: new Set() }));
      this.routes = routes.filter((o) => o.polyline && o.polyline.length > 1).map((o) => {
        const pts = o.polyline.map((p) => ({ x: o.x + p.x, y: o.y + p.y }));
        const out = [pts[0]];
        const line = (a, b) => {
          const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
          for (let i = 1; i <= n; i++) out.push({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n });
        };
        let cur = pts[0];
        for (let i = 1; i < pts.length - 1; i++) {
          const a = pts[i - 1], p = pts[i], b = pts[i + 1];
          const la = Math.hypot(a.x - p.x, a.y - p.y), lb = Math.hypot(b.x - p.x, b.y - p.y);
          const r = Math.min(CARS.corner, la / 2, lb / 2);
          const p1 = { x: p.x + (a.x - p.x) / la * r, y: p.y + (a.y - p.y) / la * r };
          const p2 = { x: p.x + (b.x - p.x) / lb * r, y: p.y + (b.y - p.y) / lb * r };
          line(cur, p1);
          for (let k = 1; k <= 16; k++) {
            const t = k / 16, u = 1 - t;
            out.push({ x: u * u * p1.x + 2 * u * t * p.x + t * t * p2.x, y: u * u * p1.y + 2 * u * t * p.y + t * t * p2.y });
          }
          cur = p2;
        }
        line(cur, pts[pts.length - 1]);
        let s = 0;
        out.forEach((p, i) => { if (i) s += Math.hypot(p.x - out[i - 1].x, (p.y - out[i - 1].y) / KY); p.s = s; });
        const spans = this.crossings.map((c) => {
          const inside = out.filter((p) => p.x >= c.x0 && p.x <= c.x1 && p.y >= c.y0 && p.y <= c.y1);
          return inside.length ? { enter: inside[0].s, exit: inside[inside.length - 1].s, pts: inside } : null;
        });
        return { name: o.name, pts: out, length: s, spans };
      });
      // deux trajets se gênent dans un carrefour s'ils y passent tout près l'un de l'autre
      this.conflict = this.crossings.map((c, k) => this.routes.map((a) => this.routes.map((b) => {
        const sa = a.spans[k], sb = b.spans[k];
        if (!sa || !sb) return false;
        for (const p of sa.pts) for (const q of sb.pts) if (Math.hypot(p.x - q.x, (p.y - q.y) / KY) < CARS.cross) return true;
        return false;
      })));
      this.routes.forEach((r, i) => { r.index = i; });
      this.nextSpawn = 600;
      if (reduced() || !this.routes.length || !this.textures.exists(CARS.key)) return;
      // quelques voitures déjà en route, hors des carrefours
      for (let n = 0; n < 3; n++) {
        const r = Phaser.Utils.Array.GetRandom(this.routes);
        const s = 120 + Math.random() * (r.length - 240);
        if (r.spans.some((sp) => sp && s > sp.enter - 40 && s < sp.exit + 10)) continue;
        this.addCar(r, s);
      }
    }

    // Le point du trajet à l'abscisse s, et la direction (au sol) où l'on roule.
    pointAt(r, car) {
      const pts = r.pts;
      while (car.i < pts.length - 2 && pts[car.i + 1].s < car.s) car.i++;
      const a = pts[car.i], b = pts[car.i + 1] || a;
      const t = b.s > a.s ? Math.min(1, Math.max(0, (car.s - a.s) / (b.s - a.s))) : 0;
      const c = pts[Math.min(pts.length - 1, car.i + 3)], p = pts[Math.max(0, car.i - 2)];
      const dx = c.x - p.x, dy = (c.y - p.y) / KY, l = Math.hypot(dx, dy) || 1;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: dx / l, dy: dy / l };
    }

    // Une voiture sur ce trajet, à l'abscisse s (0 : à l'entrée, hors de la carte), si la place
    // est libre.
    addCar(route, s = 0) {
      const m = this.carMeta;
      const car = { route, s, i: 0, v: s ? CARS.speed : CARS.speed * 0.8, color: Math.floor(Math.random() * m.couleurs.length), held: new Set() };
      Object.assign(car, this.pointAt(route, car));
      if (this.cars.some((o) => Math.hypot(o.x - car.x, (o.y - car.y) / KY) < CARS.gap * 1.3)) return null;
      const anchor = m.anchor || { x: 32, y: 40 };
      car.sprite = this.add.sprite(0, 0, CARS.key, 0).setOrigin(anchor.x / (m.frameWidth || 64), anchor.y / (m.frameHeight || 64));
      this.cars.push(car);
      this.placeCar(car);
      return car;
    }

    placeCar(car) {
      const dirs = Object.keys(this.carMeta.directions).length || 8;
      let a = Math.atan2(car.dy, car.dx) * 180 / Math.PI;
      if (a < 0) a += 360;
      const k = Math.round(a / (360 / dirs)) % dirs;
      car.sprite.setFrame(car.color * dirs + k).setPosition(Math.round(car.x), Math.round(car.y)).setDepth(car.y);
    }

    stepTraffic(time, dt) {
      if (!this.routes || !this.routes.length || reduced()) return;
      this.nextSpawn -= dt * 1000;
      if (this.nextSpawn <= 0) {
        this.nextSpawn = CARS.spawn[0] + Math.random() * (CARS.spawn[1] - CARS.spawn[0]);
        if (this.cars.length < CARS.max && this.textures.exists(CARS.key)) this.addCar(Phaser.Utils.Array.GetRandom(this.routes));
      }
      const hero = this.heroPos;
      for (const car of [...this.cars]) {
        const r = car.route;
        // la place devant : la voiture de devant, la promeneuse, un carrefour occupé
        let room = Infinity;
        const ahead = (x, y) => {
          const ex = x - car.x, ey = (y - car.y) / KY;
          return { along: ex * car.dx + ey * car.dy, side: Math.abs(ex * car.dy - ey * car.dx) };
        };
        for (const o of this.cars) {
          // (celles d'en face ou qui croisent en sens contraire : affaire des carrefours)
          if (o === car || o.dx * car.dx + o.dy * car.dy < -0.3) continue;
          const d = ahead(o.x, o.y);
          if (d.along > 0 && d.side < CARS.lane) room = Math.min(room, d.along - CARS.gap);
        }
        const h = ahead(hero.x, hero.y);
        if (h.along > 0 && h.side < CARS.lane) room = Math.min(room, h.along - CARS.hero);
        this.crossings.forEach((c, k) => {
          const sp = r.spans[k];
          if (!sp || car.held.has(k) || car.s > sp.exit) return;
          const before = sp.enter - car.s;
          if (before > CARS.stop + 30) return;
          const blocked = [...c.held].some((o) => o !== car && this.conflict[k][r.index][o.route.index]);
          if (blocked) room = Math.min(room, before - CARS.stop);
          else if (before < CARS.stop + 6) { c.held.add(car); car.held.add(k); }
        });
        // la vitesse : freiner pour s'arrêter à temps, sinon reprendre de la vitesse
        const target = room <= 0 ? 0 : Math.min(CARS.speed, Math.sqrt(2 * CARS.decel * room));
        car.v = target < car.v ? target : Math.min(target, car.v + CARS.accel * dt);
        car.s += car.v * dt;
        // sortie d'un carrefour
        for (const k of [...car.held]) {
          if (car.s > r.spans[k].exit) { car.held.delete(k); this.crossings[k].held.delete(car); }
        }
        if (car.s >= r.length) {
          for (const k of car.held) this.crossings[k].held.delete(car);
          car.sprite.destroy();
          this.cars.splice(this.cars.indexOf(car), 1);
          continue;
        }
        Object.assign(car, this.pointAt(r, car));
        this.placeCar(car);
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
      this.stepTraffic(time, dt);
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
      // les bâtiments autour des voitures, puis de la promeneuse
      const boxes = (this.cars || []).map((c) => ({ x: c.x - 30, y: c.y - 38, w: 60, h: 56, foot: c.y, see: false }));
      boxes.push({ x: P.x - HERO.w / 2, y: P.y - HERO.foot, w: HERO.w, h: HERO.h, foot: P.y, see: true });
      this.uncover(boxes);
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
