/* carte/ville/circulation.js — la scène de la ville : les bâtiments et la circulation.
 *
 * Les bâtiments sont en 3/4 (scripts/ville/immeubles.py) : la couche d'objets « batiments »
 * donne l'emprise au sol de chacun (on n'y marche pas) et le haut de son dessin (propriété
 * « haut »). Tout ce qui est dessiné au-dessus de l'emprise cache le sol de derrière, où l'on
 * passe : les couches des bâtiments existent en deux exemplaires, l'un sous les personnages,
 * l'autre (« …_devant ») par-dessus ; autour de chaque personnage, l'exemplaire du dessus
 * s'efface s'il est devant le bâtiment (on le voit devant le mur), et devient transparent
 * s'il est derrière (on le voit à travers le toit, comme sous les arbres).
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
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const V = global.CarteVille;
  const { T, BATI, BATI_ALPHA, CARS, KY, BUS } = V.C;
  const { reduced } = V;

  V.partie({
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
      // la tuile appartient au bâtiment le plus en avant (le plus bas) qui la recouvre : le
      // toit d'un bâtiment de devant passe sur le pied de celui de derrière
      this.owner = (x, y) => {
        let best = null;
        for (const b of this.buildings) if (x >= b.x0 && x < b.x1 && y >= b.top && y < b.base && (!best || b.base > best.base)) best = b;
        return best;
      };
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
    },

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
    },


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
        return { name: o.name, pts: out, length: s, spans, bus: !!o.bus };
      });
      this.carRoutes = this.routes.filter((r) => !r.bus);
      // deux trajets se gênent dans un carrefour s'ils y passent tout près l'un de l'autre
      this.conflict = this.crossings.map((c, k) => this.routes.map((a) => this.routes.map((b) => {
        const sa = a.spans[k], sb = b.spans[k];
        if (!sa || !sb) return false;
        // (un point sur trois : ils sont à ~2 px les uns des autres)
        for (let i = 0; i < sa.pts.length; i += 3) {
          const p = sa.pts[i];
          for (let j = 0; j < sb.pts.length; j += 3) if (Math.hypot(p.x - sb.pts[j].x, (p.y - sb.pts[j].y) / KY) < CARS.cross) return true;
        }
        return false;
      })));
      this.routes.forEach((r, i) => { r.index = i; });
      this.nextSpawn = 600;
      if (reduced() || !this.carRoutes.length || !this.textures.exists(CARS.key)) return;
      // quelques voitures déjà en route, hors des carrefours
      for (let n = 0; n < 10; n++) {
        const r = Phaser.Utils.Array.GetRandom(this.carRoutes);
        const s = 120 + Math.random() * (r.length - 240);
        if (r.spans.some((sp) => sp && s > sp.enter - 40 && s < sp.exit + 10)) continue;
        this.addCar(r, s);
      }
    },

    // Le point du trajet à l'abscisse s, et la direction (au sol) où l'on roule.
    pointAt(r, car) {
      const pts = r.pts;
      while (car.i < pts.length - 2 && pts[car.i + 1].s < car.s) car.i++;
      const a = pts[car.i], b = pts[car.i + 1] || a;
      const t = b.s > a.s ? Math.min(1, Math.max(0, (car.s - a.s) / (b.s - a.s))) : 0;
      const c = pts[Math.min(pts.length - 1, car.i + 3)], p = pts[Math.max(0, car.i - 2)];
      const dx = c.x - p.x, dy = (c.y - p.y) / KY, l = Math.hypot(dx, dy) || 1;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: dx / l, dy: dy / l };
    },

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
    },

    placeCar(car) {
      const dirs = Object.keys(this.carMeta.directions).length || 8;
      let a = Math.atan2(car.dy, car.dx) * 180 / Math.PI;
      if (a < 0) a += 360;
      const k = Math.round(a / (360 / dirs)) % dirs;
      car.sprite.setFrame(car.bus ? k : car.color * dirs + k).setPosition(Math.round(car.x), Math.round(car.y)).setDepth(car.y);
    },

    stepTraffic(time, dt) {
      if (!this.routes || !this.routes.length || reduced()) return;
      this.nextSpawn -= dt * 1000;
      if (this.nextSpawn <= 0) {
        this.nextSpawn = CARS.spawn[0] + Math.random() * (CARS.spawn[1] - CARS.spawn[0]);
        if (this.carRoutes.length && this.cars.length < CARS.max && this.textures.exists(CARS.key)) this.addCar(Phaser.Utils.Array.GetRandom(this.carRoutes));
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
          // (un bus est plus long : on le suit de plus loin)
          const gap = CARS.gap + (car.bus ? BUS.half - BUS.carHalf : 0) + (o.bus ? BUS.half - BUS.carHalf : 0);
          if (d.along > 0 && d.side < CARS.lane) room = Math.min(room, d.along - gap);
        }
        // le bus de l'école s'arrête à son arrêt, le temps que les enfants montent ou descendent
        if (car.stopAt !== undefined && car.stopAt !== null) {
          room = Math.min(room, car.stopAt - car.s);
          car.atStop = car.stopAt - car.s < 3 && car.v < 2;
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
        const top = car.bus ? BUS.speed : CARS.speed;
        const target = room <= 0 ? 0 : Math.min(top, Math.sqrt(2 * CARS.decel * room));
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
        if (car.alpha !== undefined && car.alpha < 1) { car.alpha = Math.min(1, car.alpha + dt * 2); car.sprite.setAlpha(car.alpha); }
      }
    },
  });
})(window);
