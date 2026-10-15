/* fermier.js — le personnage de la carte (version provisoire).
 *
 * Il habite la maison : le jour il en sort, flâne devant, et fait sur la carte ce que le
 * joueur vient de faire (labourer, planter, arroser, récolter). Le soir il rentre. Dans
 * l'intérieur de la maison, il cuisine quand une préparation est en cours et ouvre le
 * réfrigérateur quand son contenu change.
 *
 * Il n'est jamais à deux endroits à la fois : dehors, dans la maison ou dans la Serre (where).
 * Quand le joueur entre dans un intérieur, il y va : ce qu'il faisait dehors s'arrête, il
 * entre par la porte du bâtiment et apparaît à l'entrée de l'intérieur après le temps de la
 * marche. Quand le joueur ressort, il ressort par la même porte (la nuit, il reste dans la
 * maison). Dedans, il contourne les meubles et les bacs (room.walk, voir farm-stage.js).
 *
 * Version 1.18 : il ramasse. Ce qui est produit attend à sa place (modèle.ramasser : une
 * récolte sur sa case, un arbre cueilli, les œufs au Poulailler, le lait et la laine à
 * l'Étable) et n'entre dans l'inventaire que quand il le prend (o.pickup). Une récolte se
 * ramasse au geste même ; le reste, il va le chercher dès qu'il est libre et dehors, ou
 * tout de suite quand le joueur appuie sur sa bulle (fetch). À chaque prise, une bulle
 * « +6 🥕 » monte au-dessus de lui (o.gain) ; des prises rapprochées s'y additionnent.
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
 * API : Fermier.attach(scène, { sheet, frames, world, objects, ground, reduced, resync, pickup, gain })
 *       → { filter(modèle), update(delta, intérieur), fetch(id), pos(), info(), destroy() }
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
    couper: { anim: 'hache', frames: [0, 1, 1, 2, 3, 3], dur: [0.12, 0.16, 0.1, 0.06, 0.1, 0.24], hit: 4 },
    piocher: { anim: 'pioche', frames: [0, 1, 1, 2, 3, 3], dur: [0.12, 0.18, 0.1, 0.06, 0.12, 0.26], hit: 4 },
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
    // Bâtiments (rectangles nommés de la carte), eau, pieds des arbres et des buissons, barrières ; les zones de culture
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
        // les buissons : leur pied, sur presque toute leur largeur (on passe derrière, pas dedans)
        for (const b of g.bushes || []) mark(b.x0 + 6, b.base - 12, b.x1 - 6, b.base);
        // les barrières : leurs cases, sauf l'ouverture des portails (il les passe)
        for (const f of g.fences || []) mark(f.x, f.y, f.x + T, f.y + T);
        // les rochers encore debout (sauf les cailloux) : leur pied
        for (const k of g.rocks || []) mark(k.x0 + 3, k.base - 8, k.x1 - 3, k.base);
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
    let where = 'maison';           // où il est : null (dehors), 'maison' ou 'serre'

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
    function appear() { if (!shown) { shown = true; home = false; where = null; fade = 1; s.setVisible(true); } }
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

    /* ---------- ce qu'il ramasse ---------- */

    let pilesNow = new Map();       // tas à ramasser du dernier modèle : id → { id, lieu, ref }
    const claimed = new Set();      // tas qu'il a déjà prévu d'aller prendre
    // Il prend le tas `id` : le jeu le met dans l'inventaire, la bulle « +x » monte.
    function take(id) {
      claimed.delete(id);
      if (!pilesNow.has(id) || !o.pickup) return;
      pilesNow.delete(id);
      o.pickup(id, (items) => { if (items && o.gain) o.gain(items); });
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
      if (type === 'recolter') order.forEach((c) => claimed.add(`parcelle:${c}`));
      visits.forEach((c, n) => {
        const st = standFor(c);
        jobs.push(walkTo(st.x, st.y));
        jobs.push(act(type, {
          face: st.face, flip: st.flip,
          onHit: () => {
            release(c);
            if (type === 'recolter') take(`parcelle:${c}`);
            // Après le dernier geste, les autres cases changent une à une autour de lui.
            if (n === visits.length - 1) {
              rest.forEach((r, k) => setTimeout(() => { release(r); if (type === 'recolter') take(`parcelle:${r}`); }, (k + 1) * CASCADE_MS));
            }
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
      pilesNow = new Map((raw.ramasser || []).map((p) => [p.id, p]));
      for (const id of [...claimed]) if (!pilesNow.has(id)) claimed.delete(id);
      if (prevRaw && raw.jour === prevRaw.jour && o.outside()) {
        const found = diff(prevRaw, raw);
        if (reduced()) holds.clear();
        else {
          // Trop de retard : ce qui attend encore se montre tout de suite.
          if (jobs.length > 3 * MAX_VISITS * 2) { jobs = []; claimed.clear(); holds.forEach((h, c) => { if (!Object.values(found).some((l) => l.includes(c))) holds.delete(c); }); }
          for (const type of ['labourer', 'planter', 'arroser', 'recolter']) if (found[type]) queueGeste(type, found[type]);
        }
        if (reduced()) for (const type of Object.keys(found)) { const st = standFor(found[type][0]); x = st.x; y = st.y; face = st.face; flip = st.flip; appear(); }
        if (reduced() && found.recolter) found.recolter.forEach((c) => take(`parcelle:${c}`));
      }
      if (prevRaw && raw.frigo !== prevRaw.frigo && raw.jour === prevRaw.jour) frigoDue = true;
      cooking = raw.cuisson || null;
      prevRaw = raw;
      // Une récolte qu'il va prendre au geste (case retenue ou prévue) n'a pas de bulle.
      const shownPiles = (raw.ramasser || []).filter((p) => !(p.lieu === 'parcelle' && (holds.has(p.ref) || claimed.has(p.id))));
      if (!holds.size) return shownPiles.length === (raw.ramasser || []).length ? raw : Object.assign({}, raw, { ramasser: shownPiles });
      const plots = [];
      const seen = new Set();
      for (const p of raw.plots || []) {
        seen.add(p.case);
        const h = holds.get(p.case);
        if (!h) plots.push(p);
        else if (!h.view.none) plots.push(h.view);
      }
      for (const [c, h] of holds) if (!seen.has(c) && !h.view.none) plots.push(h.view);
      return Object.assign({}, raw, { plots, ramasser: shownPiles });
    }

    /* ---------- la journée ---------- */

    // Où se tenir pour prendre un tas, et le geste : au Poulailler et à l'Étable, il remplit
    // son panier et le rapporte devant la maison ; à un arbre ou sur une case, il se baisse.
    function barnSpot() {
      const b = sprite('etable');
      if (!b || b.texture.key.indexOf('ph_') === 0) return null;
      return { x: Math.round(b.x + b.width * 0.5), y: Math.round(b.y + 6) };
    }
    function treeSpot(c) {
      const r = (o.objects || {})['arbre_verger_' + (c + 1)];
      return r ? { x: Math.round(r.x + r.width / 2 - 12), y: Math.round(r.y + r.height + 2), face: 'cote', flip: false } : null;
    }
    // Version 1.19 : le Poulailler et l'Étable ne se vident pas d'eux-mêmes ; le joueur l'y
    // envoie (double appui sur le bâtiment, ou appui sur sa bulle). Il y va, remplit son panier
    // (o.collect : les œufs ; le lait, et il tond les moutons prêts) et le rapporte devant la
    // maison.
    const isBuilding = (lieu) => lieu === 'poulailler' || lieu === 'etable';
    function gather(lieu) {
      claimed.delete(lieu);
      pilesNow.delete(lieu);
      if (o.collect) o.collect(lieu, (items) => { if (items && o.gain) o.gain(items); });
    }
    function collect(lieu) {
      if (!isBuilding(lieu) || !pilesNow.has(lieu) || claimed.has(lieu)) return false;
      const spot = lieu === 'poulailler' ? coopSpot() : barnSpot();
      if (reduced() || !spot) { gather(lieu); return true; }
      claimed.add(lieu);
      const d = door();
      const list = [
        walkTo(spot.x, spot.y, { far: true }),
        act('ramasse', { face: 'cote', flip: false }),
        once(() => { gather(lieu); basket = true; }),
        walkTo(d.x, d.y + 4, { basket: true, far: true }),
        once(() => { basket = false; }),
        wait(0.6),
      ];
      if (job && job.idle) job = null;
      jobs = list.concat(jobs.filter((j) => !j.idle));
      return true;
    }
    // Les tâches pour aller prendre le tas `p` d'une case ou d'un arbre (false : on ne sait
    // pas où il est).
    function fetchJobs(p) {
      const st = p.lieu === 'arbre' ? treeSpot(p.ref) : Number.isInteger(p.ref) ? standFor(p.ref) : null;
      if (!st) return false;
      return [
        walkTo(st.x, st.y),
        act('recolter', { face: st.face, flip: st.flip, onHit: () => take(p.id) }),
        once(() => take(p.id)),
        wait(0.6),
      ];
    }
    // Va chercher le tas `id`. `now` : le joueur a appuyé sur sa bulle, il y va avant le reste.
    function fetch(id, now) {
      const p = pilesNow.get(id);
      if (!p || claimed.has(id)) return false;
      if (isBuilding(p.lieu)) return collect(p.lieu);
      if (reduced()) { take(id); return true; }
      const list = fetchJobs(p);
      if (!list) { take(id); return true; }   // pas d'endroit où aller : il le prend de loin
      claimed.add(id);
      if (now) {
        if (job && job.idle) job = null;
        jobs = list.concat(jobs.filter((j) => !j.idle));
      } else jobs.push(...list);
      return true;
    }
    // Le tas le plus proche qu'il n'a pas encore prévu d'aller prendre.
    function nextPile() {
      let best = null, bd = Infinity;
      for (const p of pilesNow.values()) {
        if (claimed.has(p.id) || isBuilding(p.lieu)) continue;   // le Poulailler et l'Étable : sur demande
        const at = p.lieu === 'poulailler' ? coopSpot() : p.lieu === 'etable' ? barnSpot() : p.lieu === 'arbre' ? treeSpot(p.ref) : Number.isInteger(p.ref) ? tileXY(p.ref) : null;
        const d = at ? Math.hypot(at.x - x, at.y - y) : 0;
        if (d < bd) { bd = d; best = p; }
      }
      return best;
    }
    // Version 1.19 : envoyé quelque part par le joueur (double appui), il flâne là-bas
    // plutôt que devant la porte, jusqu'à ce qu'il rentre le soir.
    let roamAt = null;
    function roam() {
      const d = roamAt || door();
      for (let i = 0; i < 8; i++) {
        const tx = d.x + rand(-ROAM, ROAM), ty = d.y + (roamAt ? rand(-ROAM, ROAM) : rand(T, ROAM));
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
        return;
      }
      if (!outHours && !home && shown) {
        roamAt = null;
        const d = door();
        jobs.push(walkTo(d.x, d.y));
        jobs.push(once(() => { face = 'haut'; vanish(); home = true; where = 'maison'; }));
        jobs.push(wait(FADE_S));
        return;
      }
      // Libre et dehors : il va chercher ce qui attend.
      if (shown && outHours) { const p = nextPile(); if (p && fetch(p.id)) return; }
      if (shown) {
        idleAge = 0; idleLen = rand(5, 12);
        if (Math.random() < 0.5 && !reduced()) roam();   // animations réduites : il ne se déplace pas pour rien
        else jobs.push(wait(rand(2, 5)));
      }
    }

    // Le point libre le plus proche de (tx, ty) (6 cases au plus), null s'il n'y en a pas.
    function nearestFree(tx, ty) {
      if (!blocked) buildGrid();
      if (freeAt(tx, ty)) return { x: tx, y: ty };
      const [c0, r0] = cellOf(tx, ty);
      let best = null, bd = Infinity;
      for (let r = r0 - 6; r <= r0 + 6; r++) {
        for (let c = c0 - 6; c <= c0 + 6; c++) {
          if (!free(c, r)) continue;
          const px = c * T + T / 2, py = r * T + T - 2, dd = Math.hypot(px - tx, py - ty);
          if (dd < bd) { bd = dd; best = { x: px, y: py }; }
        }
      }
      return best;
    }

    // Version 1.19 : le joueur l'envoie en (tx, ty) (double appui sur la carte). Il y va avant
    // le reste (ses gestes en attente suivent), y souffle un instant, puis flâne autour.
    // Renvoie le point où il va, ou null.
    function goTo(tx, ty) {
      const spot = nearestFree(Math.max(0, Math.min(world.w - 1, tx)), Math.max(1, Math.min(world.h - 1, ty)));
      if (!spot) return null;
      if (job && job.idle) job = null;
      jobs = [walkTo(spot.x, spot.y, { far: true }), wait(rand(3, 5))].concat(jobs.filter((j) => !j.idle));
      roamAt = spot;
      idleAge = 0;
      return spot;
    }

    // La hache en main, le joueur a touché un arbre : il va se placer à côté du tronc (à
    // gauche, sinon à droite), tourné vers lui, et donne un coup de hache. onHit : au coup.
    // Renvoie false s'il n'y a pas de place près du tronc (onHit est alors appelé tout de suite).
    function chop(foot, onHit) {
      return strike('couper', foot, 11, onHit);
    }
    // La pioche en main, le joueur a touché un rocher (son pied en `foot`, sa demi-largeur
    // `half`) : il se place à côté, le fer de la pioche tombe sur le rocher.
    function mine(foot, half, onHit) {
      return strike('piocher', foot, Math.max(8, half + 5), onHit);
    }
    function strike(name, foot, dx, onHit) {
      if (!blocked) buildGrid();
      const sides = [{ x: foot.x - dx, flip: false }, { x: foot.x + dx, flip: true }];
      let spot = null, side = sides[0];
      for (const sd of sides) { if (freeAt(sd.x, foot.y + 1)) { spot = { x: sd.x, y: foot.y + 1 }; side = sd; break; } }
      if (!spot) {
        spot = nearestFree(foot.x - dx, foot.y + 1);
        if (spot) side = spot.x <= foot.x ? sides[0] : sides[1];
      }
      if (!spot) { if (onHit) onHit(); return false; }
      if (job && job.idle) job = null;
      jobs = [walkTo(spot.x, spot.y), act(name, { face: 'cote', flip: side.flip, onHit }), wait(rand(0.4, 1))].concat(jobs.filter((j) => !j.idle));
      idleAge = 0;
      return true;
    }

    /* ---------- dans un intérieur ---------- */

    // La porte (dehors) d'un bâtiment qui a un intérieur.
    function doorOf(id) {
      if (id === 'maison') return door();
      const b = sprite(id);
      if (b) return { x: Math.round(b.x + b.width * 0.5), y: Math.round(b.y + 6) };
      const r = (o.objects || {})[id];
      return r ? { x: r.x + r.width / 2, y: r.y + r.height + 6 } : door();
    }

    const IN_STEP = 4;               // px : la grille des chemins dans un intérieur
    const ARRIVE_MAX = 3;            // s : il arrive au plus tard ce temps après le joueur (il se presse)
    const inside = { s: null, x: 0, y: 0, face: 'bas', at: null, t: 0, wait: 0, alpha: 0, path: [], goal: null, roam: 0 };
    let cooking = null, frigoDue = false;
    let viewing = null;              // l'intérieur que le joueur regarde
    // Le point où il peut se tenir le plus près de (tx, ty) dans `room`. `clear` : sans meuble
    // contre lui (pour flâner : il ne se plante pas devant une chaise).
    function roomSpot(room, tx, ty, clear) {
      const ok = clear ? (px, py) => room.walk(px, py) && !(room.props || []).some((p) => p.sprite && p.sprite.depth > 1
        && px + 8 > p.x && px - 8 < p.x + p.w && py - 26 < p.y + p.h && py > p.y - 4) : room.walk;
      if (ok(tx, ty)) return { x: tx, y: ty };
      for (let d = IN_STEP; d < 96; d += IN_STEP) {
        let best = null, bd = Infinity;
        for (let k = -d; k <= d; k += IN_STEP) {
          for (const [px, py] of [[tx + k, ty - d], [tx + k, ty + d], [tx - d, ty + k], [tx + d, ty + k]]) {
            const dd = Math.hypot(px - tx, py - ty);
            if (dd < bd && ok(px, py)) { bd = dd; best = { x: px, y: py }; }
          }
        }
        if (best) return best;
      }
      return { x: tx, y: ty };
    }
    function propSpot(room, name) {
      const p = (room.props || []).find((q) => q.name === name);
      return p ? roomSpot(room, Math.round(p.x + p.w / 2), Math.round(p.y + p.h + 6)) : null;
    }
    function roomLineFree(room, x0, y0, x1, y1) {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2));
      for (let i = 1; i <= n; i++) if (!room.walk(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n)) return false;
      return true;
    }
    // Chemin dans un intérieur : A* sur une grille de IN_STEP px (8 directions), puis tendu.
    function roomPath(room, x0, y0, x1, y1) {
      if (roomLineFree(room, x0, y0, x1, y1)) return [{ x: x1, y: y1 }];
      const ox = room.x, cols = Math.ceil(room.w / IN_STEP), rows = Math.ceil(room.h / IN_STEP);
      const cell = (x, y) => Math.max(0, Math.min(rows - 1, Math.round(y / IN_STEP))) * cols + Math.max(0, Math.min(cols - 1, Math.round((x - ox) / IN_STEP)));
      const at = (i) => ({ x: ox + (i % cols) * IN_STEP, y: ((i / cols) | 0) * IN_STEP });
      const ok = new Map();
      const free = (i) => { if (!ok.has(i)) { const p = at(i); ok.set(i, room.walk(p.x, p.y)); } return ok.get(i); };
      const start = cell(x0, y0), goal = cell(x1, y1);
      const g = new Map([[start, 0]]), from = new Map();
      const open = [[0, start]];
      const gc = goal % cols, gr = (goal / cols) | 0;
      const h = (i) => { const dc = Math.abs((i % cols) - gc), dr = Math.abs(((i / cols) | 0) - gr); return Math.max(dc, dr) + 0.414 * Math.min(dc, dr); };
      let steps = 0, found = false;
      while (open.length && steps++ < 8000) {
        let m = 0;
        for (let k = 1; k < open.length; k++) if (open[k][0] < open[m][0]) m = k;
        const i = open.splice(m, 1)[0][1];
        if (i === goal) { found = true; break; }
        const c = i % cols, r = (i / cols) | 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (!dc && !dr) continue;
            const nc = c + dc, nr = r + dr;
            if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
            const j = nr * cols + nc;
            if (!free(j) || (dc && dr && (!free(r * cols + nc) || !free(nr * cols + c)))) continue;
            const ng = g.get(i) + (dc && dr ? 1.414 : 1);
            if (ng < (g.has(j) ? g.get(j) : Infinity)) { g.set(j, ng); from.set(j, i); open.push([ng + h(j), j]); }
          }
        }
      }
      if (!found) return [{ x: x1, y: y1 }];       // pas de chemin : tout droit (cas d'un meuble posé sur lui)
      const pts = [];
      for (let i = goal; i !== start; i = from.get(i)) pts.unshift(at(i));
      pts[pts.length - 1] = { x: x1, y: y1 };
      const out = [];
      let ax = x0, ay = y0, k = 0;
      while (k < pts.length) {
        let far = k;
        while (far + 1 < pts.length && roomLineFree(room, ax, ay, pts[far + 1].x, pts[far + 1].y)) far++;
        out.push(pts[far]); ax = pts[far].x; ay = pts[far].y; k = far + 1;
      }
      return out;
    }

    // Le joueur entre dans `room` : il y est déjà, ou il y va (il quitte le dehors tout de suite).
    function enterView(room) {
      viewing = room.id;
      const rest = roomSpot(room, Math.round(room.view.x + room.view.w * 0.5), Math.round(room.view.y + room.view.h * 0.7), true);
      if (where === room.id) {
        if (inside.at !== room.id) { inside.x = rest.x; inside.y = rest.y; }
        inside.wait = 0; inside.alpha = 1;
      } else {
        const from = where ? doorOf(where) : { x, y };
        const to = doorOf(room.id);
        inside.wait = reduced() ? 0 : Math.min(ARRIVE_MAX, Math.hypot(to.x - from.x, to.y - from.y) / (SPEED * 2));
        inside.x = room.entree.x; inside.y = room.entree.y; inside.alpha = 0;
        // dehors : il est parti (ce qu'il allait faire attendra)
        jobs = []; job = null; claimed.clear(); basket = false; roamAt = null;
        shown = false; fade = 0; alpha = 0; s.setVisible(false);
        x = to.x; y = to.y;
        where = room.id; home = room.id === 'maison';
      }
      inside.at = room.id; inside.path = []; inside.goal = null; inside.mode = 'idle'; inside.t = 0; inside.roam = rand(3, 7);
      inside.rest = rest;
      frigoDue = false;
    }
    // Le joueur ressort : il ressort aussi par la porte, sauf la nuit dans la maison.
    function leaveView() {
      const id = viewing;
      viewing = null;
      if (inside.s) inside.s.setVisible(false);
      if (where !== id) return;
      if (id === 'maison' && (ctx.hour < OUT[0] || ctx.hour >= OUT[1])) return;
      const d = doorOf(id);
      x = d.x; y = d.y; face = 'bas'; flip = false;
      appear();
      jobs = [walkTo(d.x, d.y + T)].concat(jobs);
    }
    function stepInside(room, dt) {
      if (!inside.s) inside.s = scene.add.sprite(0, 0, o.sheet, 0).setOrigin(0.5, 1);
      const S = inside.s;
      if (inside.wait > 0) { inside.wait -= dt; S.setVisible(false); return; }   // il est en chemin
      inside.alpha = Math.min(1, inside.alpha + dt / FADE_S);
      inside.t += dt;
      // Où il doit être : au réfrigérateur juste après un changement, à la cuisine pendant une
      // préparation ; sinon il se tient au milieu, et de temps en temps fait quelques pas.
      let want = null, busy = false;
      if (frigoDue) { want = propSpot(room, 'frigo'); if (want) { inside.mode = 'frigo'; inside.t = 0; } frigoDue = false; }
      if (inside.mode === 'frigo') { want = propSpot(room, 'frigo'); busy = !!want; }
      else if (cooking && room.id === 'maison') { want = propSpot(room, cooking) || propSpot(room, 'cuisine'); busy = !!want; }
      if (!busy && !reduced()) {
        inside.roam -= dt;
        if (inside.roam <= 0) {
          inside.roam = rand(4, 9);
          const v = room.view;
          inside.rest = Math.random() < 0.4 ? roomSpot(room, Math.round(v.x + v.w * 0.5), Math.round(v.y + v.h * 0.7), true)
            : roomSpot(room, Math.round(v.x + rand(0.15, 0.85) * v.w), Math.round(v.y + rand(0.3, 0.95) * v.h), true);
        }
      }
      const target = want || inside.rest;
      if (!inside.goal || inside.goal.x !== target.x || inside.goal.y !== target.y) {
        inside.goal = target;
        inside.path = reduced() ? [] : roomPath(room, inside.x, inside.y, target.x, target.y);
        if (reduced()) { inside.x = target.x; inside.y = target.y; }
      }
      let name;
      if (inside.path.length) {
        const p = inside.path[0];
        const dx = p.x - inside.x, dy = p.y - inside.y, left = Math.hypot(dx, dy);
        const d = Math.min(left, SPEED * dt);
        if (left > 0.01) { inside.x += (dx / left) * d; inside.y += (dy / left) * d; }
        if (left - d <= 0.3) inside.path.shift();
        inside.walked = (inside.walked || 0) + d;
        let f = 'bas', fl = false;
        if (Math.abs(dx) > Math.abs(dy) * 0.8) { f = 'cote'; fl = dx < 0; } else f = dy > 0 ? 'bas' : 'haut';
        inside.face = f; inside.flip = fl;
        name = `marche_${f}_${Math.floor(inside.walked / STRIDE) % 4}`;
        inside.t = 0;
      } else if (inside.mode === 'frigo') {
        const A = ACTS.frigo;
        let t = inside.t, i = 0;
        while (i < A.frames.length && t >= A.dur[i]) { t -= A.dur[i]; i++; }
        if (i >= A.frames.length) { inside.mode = 'idle'; name = 'idle_haut_0'; } else name = `frigo_${A.frames[i]}`;
      } else if (want) name = `cuisine_${Math.floor(inside.t / 0.16) % 4}`;
      else name = `idle_${inside.face === 'haut' ? 'haut' : 'bas'}_${Math.floor(inside.t / BREATH_S) % 2}`;
      const k = F[name];
      if (k !== undefined) S.setFrame(k);
      S.setVisible(true).setAlpha(inside.alpha).setPosition(Math.round(inside.x), Math.round(inside.y)).setFlipX(!!inside.flip && name.indexOf('_cote_') > 0).setDepth(inside.y);
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
        if (viewing !== room.id) { if (viewing) leaveView(); enterView(room); }
        s.setVisible(false);
        stepInside(room, dt);
        releaseAll();
        return;
      }
      if (viewing) leaveView();
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
      if (idleAge >= idleLen || ctx.hour < OUT[0] || ctx.hour >= OUT[1] || nextPile()) schedule();
    }

    return {
      filter,
      update,
      info: () => ({ x: Math.round(x), y: Math.round(y), face, shown, home, ou: where, dedans: viewing && inside.wait <= 0 ? { x: Math.round(inside.x), y: Math.round(inside.y) } : null, jobs: jobs.length + (job ? 1 : 0), retenues: [...holds.keys()], cuisson: cooking, aRamasser: [...pilesNow.keys()], prevus: [...claimed] }),
      // Le joueur a appuyé sur la bulle d'un tas : il va le chercher tout de suite.
      fetch: (id) => fetch(id, true),
      goTo,
      // La hache : couper l'arbre dont le pied est en `foot` ({ x, y }).
      chop,
      // La pioche : casser le rocher dont le pied est en `foot`, de demi-largeur `half`.
      mine,
      // Le sol a changé (un rocher cassé) : la grille des cases libres est refaite.
      regrid() { buildGrid(); },
      // Double appui sur le Poulailler ou l'Étable : il va y ramasser (false : rien à prendre).
      collect,
      // Où il est (pour la bulle « +x ») : ses pieds, ou null s'il n'est pas sur la carte.
      pos: () => (shown && !home ? { x, y } : null),
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
