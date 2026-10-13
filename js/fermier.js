/* fermier.js — le personnage de la carte (version provisoire).
 *
 * Il habite la maison : le jour il en sort, flâne devant, et fait sur la carte ce que le
 * joueur vient de faire (labourer, planter, arroser, récolter). Le soir il rentre. Le matin,
 * s'il y a eu des œufs, il va les chercher au Poulailler et revient avec son panier. Dans
 * l'intérieur de la maison, il cuisine quand une préparation est en cours et ouvre le
 * réfrigérateur quand son contenu change.
 *
 * Comme le reste de la carte, il ne lit jamais l'état du jeu : il compare deux modèles de vue
 * qui se suivent (filter). Une parcelle qui change le même jour (une case labourée, une graine,
 * un arrosage, une récolte) est un geste du joueur. Le jeu, lui, a déjà changé : la carte garde
 * l'ancien dessin de la case (« retenue ») jusqu'au coup de houe ou au geste de la main, puis
 * montre le nouveau. Une retenue ne dure jamais plus de HOLD_MS.
 *
 * Image : assets/fermier.png (cases de 16 × 32), noms des cases dans assets/fermier.json
 * (scripts/personnage/fermier.py). Sans elles, pas de personnage : rien d'autre ne change.
 * Animations réduites : pas de marche ni de retenue ; il se pose directement où il travaille.
 *
 * API : Fermier.attach(scène, { sheet, frames, world, objects, ground, reduced, resync })
 *       → { filter(modèle), update(delta, intérieur), info(), destroy() }
 */
(function (global) {
  'use strict';

  const T = 16;
  const SPEED = 58;              // px de carte par seconde
  const STRIDE = 4;              // px par image de marche : les pieds suivent la distance
  const BREATH_S = 0.8;          // debout : secondes par souffle
  const HOLD_MS = 9000;          // une case n'est jamais retenue plus longtemps
  const MAX_VISITS = 4;          // cases d'un même geste où il va lui-même ; les autres suivent en cascade
  const CASCADE_MS = 90;         // entre deux cases de la cascade
  const TELEPORT = 24 * T;       // chemin plus long : il apparaît directement sur place
  const TELEPORT_FAR = 70 * T;   // le matin, il traverse la ferme jusqu'au Poulailler
  const ROAM = 7 * T;            // flânerie : rayon autour de la porte
  const OUT = [6, 21.5];         // heures où il est dehors
  const FADE_S = 0.25;
  // Gestes : images (suffixe de la vue), durée de chacune (s), image du coup (la case change).
  const ACTS = {
    labourer: { anim: 'houe', frames: [0, 1, 2, 3, 3], dur: [0.14, 0.16, 0.08, 0.12, 0.18], hit: 3 },
    planter: { anim: 'plante', frames: [0, 1, 2, 2], dur: [0.14, 0.16, 0.18, 0.14], hit: 2 },
    arroser: { anim: 'arrose', frames: [0, 1, 2, 1, 2], dur: [0.14, 0.14, 0.2, 0.1, 0.24], hit: 2 },
    recolter: { anim: 'plante', frames: [1, 2, 1, 0], dur: [0.14, 0.2, 0.14, 0.12], hit: 2 },
    ramasse: { anim: 'ramasse', frames: [0, 1, 2, 1, 2, 0], dur: [0.2, 0.2, 0.3, 0.2, 0.3, 0.2], hit: -1 },
    frigo: { anim: 'frigo', frames: [0, 1, 2, 2, 1, 0], dur: [0.2, 0.25, 0.9, 0.3, 0.25, 0.2], hit: -1 },
  };

  const rand = (a, b) => a + Math.random() * (b - a);

  function attach(scene, o) {
    const world = o.world;
    const F = {};
    (o.frames || []).forEach((name, i) => { F[name] = i; });
    const reduced = o.reduced || (() => false);
    const cols = Math.ceil(world.w / T), rows = Math.ceil(world.h / T);

    /* ---------- où il peut marcher ---------- */
    // Bâtiments (rectangles nommés de la carte), eau et pieds des arbres ; les zones de culture
    // et l'herbe restent libres : il marche dans ses parcelles.
    let blocked = null;
    function buildGrid() {
      blocked = new Uint8Array(cols * rows);
      const mark = (x0, y0, x1, y1) => {
        for (let r = Math.max(0, Math.floor(y0 / T)); r <= Math.min(rows - 1, Math.floor((y1 - 1) / T)); r++) {
          for (let c = Math.max(0, Math.floor(x0 / T)); c <= Math.min(cols - 1, Math.floor((x1 - 1) / T)); c++) blocked[r * cols + c] = 1;
        }
      };
      for (const [name, r] of Object.entries(o.objects || {})) {
        if (!r || !r.width || !r.height || /^zone_culture|^verger$/.test(name)) continue;
        if (/^arbre_verger_/.test(name)) { const cx = r.x + r.width / 2; mark(cx - 8, r.y + r.height - 20, cx + 8, r.y + r.height); continue; }
        mark(r.x, r.y, r.x + r.width, r.y + r.height);
      }
      const g = o.ground ? o.ground() : null;
      if (g) {
        for (const key of g.water || []) { const [x, y] = key.split(',').map(Number); mark(x, y, x + T, y + T); }
        for (const m of g.trees || []) mark(m.x - 8, m.base - 14, m.x + 8, m.base + 2);
      }
    }
    const free = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows && !blocked[r * cols + c];
    const cellOf = (x, y) => [Math.floor(x / T), Math.floor((y - 1) / T)];
    const freeAt = (x, y) => { const [c, r] = cellOf(x, y); return free(c, r); };
    function lineFree(x0, y0, x1, y1) {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4));
      for (let i = 1; i < n; i++) if (!freeAt(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n)) return false;
      return true;
    }
    // A* sur les cases (8 directions, sans couper les coins), puis le chemin est tendu : il va
    // tout droit tant que rien ne le gêne. null : pas de chemin.
    function findPath(x0, y0, x1, y1) {
      if (!blocked) buildGrid();
      if (lineFree(x0, y0, x1, y1)) return [{ x: x1, y: y1 }];
      const [sc, sr] = cellOf(x0, y0);
      let [gc, gr] = cellOf(x1, y1);
      if (!free(gc, gr)) return null;
      const start = sr * cols + sc, goal = gr * cols + gc;
      const g = new Float32Array(cols * rows).fill(Infinity);
      const from = new Int32Array(cols * rows).fill(-1);
      const heap = [];
      const push = (i, f) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top[1]; };
      const h = (i) => { const dc = Math.abs((i % cols) - gc), dr = Math.abs(((i / cols) | 0) - gr); return Math.max(dc, dr) + 0.414 * Math.min(dc, dr); };
      g[start] = 0; push(start, h(start));
      let steps = 0;
      while (heap.length && steps++ < 6000) {
        const i = pop();
        if (i === goal) break;
        const c = i % cols, r = (i / cols) | 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (!dc && !dr) continue;
            const nc = c + dc, nr = r + dr;
            if (!free(nc, nr)) continue;
            if (dc && dr && (!free(c + dc, r) || !free(c, r + dr))) continue;
            const j = nr * cols + nc, ng = g[i] + (dc && dr ? 1.414 : 1);
            if (ng < g[j]) { g[j] = ng; from[j] = i; push(j, ng + h(j)); }
          }
        }
      }
      if (from[goal] < 0 && goal !== start) return null;
      const cells = [];
      for (let i = goal; i !== start && i >= 0; i = from[i]) cells.unshift(i);
      const pts = cells.map((i) => ({ x: (i % cols) * T + T / 2, y: ((i / cols) | 0) * T + T - 2 }));
      pts[pts.length - 1] = { x: x1, y: y1 };
      // chemin tendu
      const out = [];
      let ax = x0, ay = y0, k = 0;
      while (k < pts.length) {
        let far = k;
        while (far + 1 < pts.length && lineFree(ax, ay, pts[far + 1].x, pts[far + 1].y)) far++;
        out.push(pts[far]); ax = pts[far].x; ay = pts[far].y; k = far + 1;
      }
      return out;
    }
    const pathLength = (x, y, path) => path.reduce((s, p) => { const d = Math.hypot(p.x - x, p.y - y); x = p.x; y = p.y; return s + d; }, 0);

    /* ---------- l'image ---------- */

    const s = scene.add.sprite(0, 0, o.sheet, 0).setOrigin(0.5, 1).setVisible(false);
    let x = 0, y = 0, face = 'bas', flip = false, shown = false, alpha = 0, fade = 0;
    let basket = false;
    function frame(name) {
      const k = F[name];
      if (k !== undefined) s.setFrame(k);
    }
    function draw(name) {
      frame(name);
      s.setPosition(Math.round(x), Math.round(y)).setFlipX(flip).setDepth(y).setAlpha(alpha);
    }
    function look(dx, dy) {
      if (Math.abs(dx) > Math.abs(dy) * 0.8) { face = 'cote'; flip = dx < 0; } else { face = dy > 0 ? 'bas' : 'haut'; flip = false; }
    }

    /* ---------- dehors : la maison, le Poulailler ---------- */

    const sprite = (id) => { const e = scene.buildings && scene.buildings.get(id); return e && !e.ruine ? e.sprite : null; };
    function door() {
      const h = sprite('maison') || (scene.buildings && scene.buildings.get('maison') && scene.buildings.get('maison').sprite);
      if (h) return { x: Math.round(h.x + h.width * 0.5), y: Math.round(h.y + 6) };
      const r = (o.objects || {}).maison;
      return r ? { x: r.x + r.width / 2, y: r.y + r.height + 6 } : { x: world.w / 2, y: world.h / 2 };
    }
    function coopSpot() {
      const c = sprite('poulailler');
      if (!c || c.texture.key.indexOf('ph_') === 0) return null;
      return { x: Math.round(c.x + 13), y: Math.round(c.y + 6) };
    }

    /* ---------- ce qu'il fait : une file de tâches ---------- */
    // Chaque tâche : { start(), step(dt) → true quand elle est finie }.
    let jobs = [];
    let job = null;
    let idleAge = 0, idleLen = rand(4, 9);
    let ctx = { hour: 12, jour: null, out: true };
    let home = true;                // il est dans la maison (dehors : caché)

    function walkTo(tx, ty, opts) {
      let path = null, walked = 0, age = 0;
      return {
        start() {
          // Rentré dans la maison : il en ressort par la porte.
          if (!shown) { const d = door(); x = d.x; y = d.y; face = 'bas'; flip = false; appear(); }
          path = findPath(x, y, tx, ty);
          if (!path || reduced() || pathLength(x, y, path) > (opts && opts.far ? TELEPORT_FAR : TELEPORT)) { x = tx; y = ty; path = []; }
        },
        step(dt) {
          age += dt;
          if (!path.length) return true;
          const p = path[0];
          const dx = p.x - x, dy = p.y - y, left = Math.hypot(dx, dy);
          const v = SPEED * Math.min(1, 0.4 + age * 3);
          const d = Math.min(left, v * dt);
          if (left > 0.01) { x += (dx / left) * d; y += (dy / left) * d; look(dx, dy); }
          walked += d;
          const k = Math.floor(walked / STRIDE) % 4;
          draw(`${basket || (opts && opts.basket) ? 'panier' : 'marche'}_${face}_${k}`);
          if (left - d > 0.3) return false;
          path.shift();
          return !path.length;
        },
      };
    }
    function act(name, opts) {
      const A = ACTS[name];
      let i = 0, t = 0;
      return {
        start() {
          if (opts && opts.face) { face = opts.face; flip = !!opts.flip; }
          if (reduced()) { if (opts && opts.onHit) opts.onHit(); i = A.frames.length; }
        },
        step(dt) {
          if (i >= A.frames.length) { draw(`idle_${face}_0`); return true; }
          t += dt;
          while (i < A.frames.length && t >= A.dur[i]) {
            t -= A.dur[i]; i++;
            if (i === A.hit && opts && opts.onHit) opts.onHit();
          }
          if (i >= A.frames.length) return true;
          const f = A.frames[i];
          draw(A.anim === 'ramasse' || A.anim === 'frigo' ? `${A.anim}_${f}` : `${A.anim}_${face}_${f}`);
          return false;
        },
      };
    }
    function wait(sec, then) {
      let t = 0;
      return { idle: !then, start() {}, step(dt) { t += dt; draw(`idle_${face}_${((t / BREATH_S) | 0) % 2}`); if (t >= sec) { if (then) then(); return true; } return false; } };
    }
    const once = (fn) => ({ start() { fn(); }, step() { return true; } });
    function appear() { if (!shown) { shown = true; home = false; fade = 1; s.setVisible(true); } }
    function vanish() { fade = -1; }

    /* ---------- les gestes du joueur (comparaison des modèles) ---------- */

    const NONE = { none: true };
    const holds = new Map();        // case → { view: parcelle d'avant (ou NONE), t0 }
    let prevRaw = null;
    const tileXY = (c) => ({ x: (c % o.cols()) * T, y: Math.floor(c / o.cols()) * T });

    function release(c) {
      if (!holds.delete(c)) return;
      if (o.resync) o.resync();
    }
    function releaseAll() {
      if (!holds.size) return;
      holds.clear();
      if (o.resync) o.resync();
    }

    // Où se tenir pour travailler la case c : à sa gauche (tourné vers la droite), sinon à sa droite.
    function standFor(c) {
      const p = tileXY(c);
      const left = { x: p.x - 2, y: p.y + 14, face: 'cote', flip: false };
      const right = { x: p.x + T + 2, y: p.y + 14, face: 'cote', flip: true };
      if (!blocked) buildGrid();
      return freeAt(left.x, left.y) ? left : freeAt(right.x, right.y) ? right : left;
    }

    function queueGeste(type, cases) {
      // Il laisse tomber ce qu'il faisait en attendant (flâner, souffler).
      if (job && job.idle) job = null;
      jobs = jobs.filter((j) => !j.idle);
      // Ordre de visite : la case la plus proche, puis la plus proche de celle-là…
      const left = cases.slice();
      const order = [];
      let px = x, py = y;
      while (left.length) {
        let best = 0, bd = Infinity;
        left.forEach((c, i) => { const p = tileXY(c); const d = Math.hypot(p.x - px, p.y - py); if (d < bd) { bd = d; best = i; } });
        const c = left.splice(best, 1)[0];
        order.push(c);
        const p = tileXY(c); px = p.x; py = p.y;
      }
      const visits = order.slice(0, MAX_VISITS), rest = order.slice(MAX_VISITS);
      visits.forEach((c, n) => {
        const st = standFor(c);
        jobs.push(walkTo(st.x, st.y));
        jobs.push(act(type, {
          face: st.face, flip: st.flip,
          onHit: () => {
            release(c);
            // Après le dernier geste, les autres cases changent une à une autour de lui.
            if (n === visits.length - 1) rest.forEach((r, k) => setTimeout(() => release(r), (k + 1) * CASCADE_MS));
          },
        }));
      });
      jobs.push(wait(rand(0.4, 1)));
    }

    function diff(prev, next) {
      const before = new Map(), after = new Map();
      for (const p of prev.plots || []) before.set(p.case, p);
      for (const p of next.plots || []) after.set(p.case, p);
      const found = {};
      const add = (type, c, view) => {
        (found[type] = found[type] || []).push(c);
        if (!holds.has(c)) holds.set(c, { view: view || NONE, t0: performance.now() });
      };
      for (const [c, p] of after) {
        const q = before.get(c);
        if (!q) add('labourer', c, null);
        else if (!q.culture && p.culture) add('planter', c, q);
        else if (q.culture && !p.culture) add('recolter', c, q);
        else if (!q.arrosee && p.arrosee) add('arroser', c, q);
      }
      for (const [c, q] of before) if (!after.has(c)) add('labourer', c, q);   // rebouchée
      return found;
    }

    function filter(model) {
      const raw = model;
      ctx.hour = raw.heure == null ? 12 : raw.heure;
      const morning = prevRaw && raw.jour != null && prevRaw.jour != null && raw.jour > prevRaw.jour;
      if (morning && raw.oeufs > 0 && raw.animaux && raw.animaux.poule > 0) eggsDue = true;
      if (prevRaw && raw.jour === prevRaw.jour && o.outside()) {
        const found = diff(prevRaw, raw);
        if (reduced()) holds.clear();
        else {
          // Trop de retard : ce qui attend encore se montre tout de suite.
          if (jobs.length > 3 * MAX_VISITS * 2) { jobs = []; holds.forEach((h, c) => { if (!Object.values(found).some((l) => l.includes(c))) holds.delete(c); }); }
          for (const type of ['labourer', 'planter', 'arroser', 'recolter']) if (found[type]) queueGeste(type, found[type]);
        }
        if (reduced()) for (const type of Object.keys(found)) { const st = standFor(found[type][0]); x = st.x; y = st.y; face = st.face; flip = st.flip; appear(); }
      }
      if (prevRaw && raw.frigo !== prevRaw.frigo && raw.jour === prevRaw.jour) frigoDue = true;
      cooking = raw.cuisson || null;
      prevRaw = raw;
      if (!holds.size) return raw;
      const plots = [];
      const seen = new Set();
      for (const p of raw.plots || []) {
        seen.add(p.case);
        const h = holds.get(p.case);
        if (!h) plots.push(p);
        else if (!h.view.none) plots.push(h.view);
      }
      for (const [c, h] of holds) if (!seen.has(c) && !h.view.none) plots.push(h.view);
      return Object.assign({}, raw, { plots });
    }

    /* ---------- la journée ---------- */

    let eggsDue = false;
    function morningEggs() {
      eggsDue = false;
      const spot = coopSpot();
      if (!spot) return;
      jobs.push(walkTo(spot.x, spot.y, { far: true }));
      jobs.push(act('ramasse', { face: 'cote', flip: false }));
      jobs.push(once(() => { basket = true; }));
      const d = door();
      jobs.push(walkTo(d.x, d.y + 4, { basket: true, far: true }));
      jobs.push(once(() => { basket = false; }));
      jobs.push(wait(0.6));
    }
    function roam() {
      const d = door();
      for (let i = 0; i < 8; i++) {
        const tx = d.x + rand(-ROAM, ROAM), ty = d.y + rand(T, ROAM);
        if (!freeAt(tx, ty)) continue;
        const w = walkTo(tx, ty);
        w.idle = true;
        jobs.push(w);
        jobs.push(wait(rand(2, 5)));
        return;
      }
    }
    function schedule() {
      const outHours = ctx.hour >= OUT[0] && ctx.hour < OUT[1];
      if (outHours && home) {
        const d = door();
        x = d.x; y = d.y; face = 'bas'; flip = false;
        appear();
        jobs.push(walkTo(d.x, d.y + T));
        if (eggsDue) morningEggs();
        return;
      }
      if (!outHours && !home && shown) {
        const d = door();
        jobs.push(walkTo(d.x, d.y));
        jobs.push(once(() => { face = 'haut'; vanish(); home = true; }));
        jobs.push(wait(FADE_S));
        return;
      }
      if (shown && eggsDue) { morningEggs(); return; }
      if (shown) {
        idleAge = 0; idleLen = rand(5, 12);
        if (Math.random() < 0.5 && !reduced()) roam();   // animations réduites : il ne se déplace pas pour rien
        else jobs.push(wait(rand(2, 5)));
      }
    }

    /* ---------- dans la maison ---------- */

    const inside = { s: null, x: 0, y: 0, face: 'bas', job: null, at: null, frigoT: 0, t: 0 };
    let cooking = null, frigoDue = false;
    function propSpot(room, name) {
      const p = (room.props || []).find((q) => q.name === name);
      return p ? { x: Math.round(p.x + p.w / 2), y: Math.round(p.y + p.h + 9) } : null;
    }
    function stepInside(room, dt) {
      if (!inside.s) inside.s = scene.add.sprite(0, 0, o.sheet, 0).setOrigin(0.5, 1);
      const S = inside.s;
      const rest = { x: Math.round(room.view.x + room.view.w * 0.5), y: Math.round(room.view.y + room.view.h * 0.7) };
      if (inside.at !== room.id) { inside.at = room.id; inside.x = rest.x; inside.y = rest.y; inside.mode = 'idle'; inside.t = 0; frigoDue = false; }
      inside.t += dt;
      // Où il doit être : au réfrigérateur juste après un changement, à la cuisine pendant une préparation.
      let want = null;
      if (frigoDue) { want = propSpot(room, 'frigo'); if (want) { inside.mode = 'frigo'; inside.t = 0; } frigoDue = false; }
      if (inside.mode === 'frigo') want = propSpot(room, 'frigo');
      else if (cooking) want = propSpot(room, cooking) || propSpot(room, 'cuisine');
      const target = want || rest;
      const dx = target.x - inside.x, dy = target.y - inside.y, left = Math.hypot(dx, dy);
      let name;
      if (left > 1 && !reduced()) {
        const d = Math.min(left, SPEED * dt);
        inside.x += (dx / left) * d; inside.y += (dy / left) * d;
        inside.walked = (inside.walked || 0) + d;
        let f = 'bas', fl = false;
        if (Math.abs(dx) > Math.abs(dy) * 0.8) { f = 'cote'; fl = dx < 0; } else f = dy > 0 ? 'bas' : 'haut';
        inside.face = f; inside.flip = fl;
        name = `marche_${f}_${Math.floor(inside.walked / STRIDE) % 4}`;
        inside.t = 0;
      } else {
        inside.x = target.x; inside.y = target.y;
        if (inside.mode === 'frigo') {
          const A = ACTS.frigo;
          let t = inside.t, i = 0;
          while (i < A.frames.length && t >= A.dur[i]) { t -= A.dur[i]; i++; }
          if (i >= A.frames.length) { inside.mode = 'idle'; name = 'idle_haut_0'; } else name = `frigo_${A.frames[i]}`;
        } else if (want) name = `cuisine_${Math.floor(inside.t / 0.16) % 4}`;
        else name = `idle_bas_${Math.floor(inside.t / BREATH_S) % 2}`;
      }
      const k = F[name];
      if (k !== undefined) S.setFrame(k);
      S.setVisible(true).setPosition(Math.round(inside.x), Math.round(inside.y)).setFlipX(!!inside.flip && name.indexOf('_cote_') > 0).setDepth(inside.y);
    }

    /* ---------- par image ---------- */

    function update(delta, roomId) {
      const dt = Math.min(delta, 50) / 1000;
      // Retenues trop longues (onglet caché, chemin bloqué) : la case se montre.
      if (holds.size) {
        const now = performance.now();
        let changed = false;
        for (const [c, h] of holds) if (now - h.t0 > HOLD_MS) { holds.delete(c); changed = true; }
        if (changed && o.resync) o.resync();
      }
      const room = roomId ? scene.rooms[roomId] : null;
      if (room) {
        s.setVisible(false);
        if (room.id === 'maison') stepInside(room, dt); else if (inside.s) inside.s.setVisible(false);
        releaseAll();
        return;
      }
      if (inside.s) { inside.s.setVisible(false); inside.at = null; }
      // Retour sur la carte : une pièce l'avait caché ; il réapparaît où il en était.
      if (shown && !s.visible) s.setVisible(true);
      if (fade) {
        alpha = Math.max(0, Math.min(1, alpha + (fade * dt) / FADE_S));
        if (alpha >= 1 && fade > 0) fade = 0;
        if (alpha <= 0 && fade < 0) { fade = 0; shown = false; s.setVisible(false); }
      }
      if (!job && jobs.length) { job = jobs.shift(); job.start(); }
      if (job) {
        if (job.step(dt)) job = null;
        return;
      }
      if (!shown) { schedule(); return; }
      idleAge += dt;
      draw(`idle_${face}_${Math.floor(idleAge / BREATH_S) % 2}`);
      if (idleAge >= idleLen || ctx.hour < OUT[0] || ctx.hour >= OUT[1] || eggsDue) schedule();
    }

    return {
      filter,
      update,
      info: () => ({ x: Math.round(x), y: Math.round(y), face, shown, home, jobs: jobs.length + (job ? 1 : 0), retenues: [...holds.keys()], cuisson: cooking }),
      // Pour les essais : fermier('oeufs') l'envoie au Poulailler.
      force(name) { if (name === 'oeufs') { eggsDue = true; } return this.info(); },
      destroy() { s.destroy(); if (inside.s) inside.s.destroy(); holds.clear(); },
      // Autre planche (le personnage du joueur a changé) : mêmes cases, dans le même ordre.
      setSheet(key) {
        o.sheet = key;
        s.setTexture(key, s.frame ? s.frame.name : 0);
        if (inside.s) inside.s.setTexture(key, inside.s.frame ? inside.s.frame.name : 0);
      },
    };
  }

  global.Fermier = { attach };
})(window);
