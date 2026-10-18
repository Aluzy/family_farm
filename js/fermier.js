/* fermier.js — le personnage de la carte (version provisoire).
 *
 * Il habite la maison : le jour il en sort, se tient devant, et fait sur la carte ce que le
 * joueur vient de faire (labourer, planter, arroser, récolter). Dans l'intérieur de la maison,
 * il cuisine quand une préparation est en cours et ouvre le réfrigérateur quand son contenu
 * change.
 *
 * Il ne dort que dans son lit. Le soir, il reste dehors jusqu'à ce que le joueur appuie sur
 * « Dormir » (modèle.coucher) : il marche alors jusqu'à la porte de la maison (goHome), entre,
 * va à son lit (la place lit_1 de l'intérieur : le premier lit d'adulte, sinon une paillasse)
 * et s'y couche, debout entre le lit et sa couverture (meuble_<lit>_drap posé par-dessus lui),
 * des « Z » au-dessus de la tête. Quand il dort, o.asleep() : la nuit défile en accéléré
 * (modèle.dort) ; il reste couché, même si le joueur sort regarder la carte, jusqu'au réveil.
 *
 * Le repas de 19 h (startMeal) : dans la maison, il va à sa chaise autour de la table, les
 * autres membres de la famille (leur planche) arrivent aussi, tous s'assoient et mangent ;
 * la carte pose une bulle au-dessus de leur tête (mealHeads) s'ils ont bien mangé. Puis les
 * autres s'en vont, il se lève. Sans chaise à sa place, un convive mange debout.
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
 * ramasse au geste même ; le reste, il va le chercher quand le joueur appuie sur sa bulle
 * (fetch). Il ne bouge jamais de lui-même : ni flânerie, ni promenade dans un intérieur. À chaque prise, une bulle
 * « +6 🥕 » monte au-dessus de lui (o.gain) ; des prises rapprochées s'y additionnent.
 *
 * Comme le reste de la carte, il ne lit jamais l'état du jeu : il compare deux modèles de vue
 * qui se suivent (filter). Une parcelle qui change le même jour (une case labourée, une graine,
 * un arrosage, une récolte) est un geste du joueur. Le jeu, lui, a déjà changé : la carte garde
 * l'ancien dessin de la case (« retenue ») jusqu'au coup de houe ou au geste de la main, puis
 * montre le nouveau. Une retenue ne dure jamais plus de HOLD_MS.
 *
 * Le triporteur (acheté au Marché, modèle.triporteur : il est en selle) : dehors, quand il
 * marche ou attend, il y est assis (js/carte/triporteur.js) et va TRIPORTEUR.vitesse fois plus
 * vite ; pendant un geste ou dans un intérieur, il en descend.
 *
 * Image : assets/fermier.png (cases de 16 × 32), noms des cases dans assets/fermier.json
 * (scripts/personnage/fermier.py). Sans elles, pas de personnage : rien d'autre ne change.
 * Animations réduites : pas de marche ni de retenue ; il se pose directement où il travaille.
 *
 * API : Fermier.attach(scène, { sheet, frames, world, objects, ground, reduced, resync, pickup, gain })
 *       → { filter(modèle), update(delta, intérieur), fetch(id), goTo(x, y), steer(dir), goHome(done), startMeal(o), gather(pied, coup),
 *           mealHeads(), focus(), pos(), info(), destroy() }
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const T = K.T;
  const SPEED = K.VITESSES.fermier;   // px de carte par seconde
  const STRIDE = 4;              // px par image de marche : les pieds suivent la distance
  const BREATH_S = 0.8;          // debout : secondes par souffle
  const HOLD_MS = 9000;          // une case n'est jamais retenue plus longtemps
  const MAX_VISITS = 4;          // cases d'un même geste où il va lui-même ; les autres suivent en cascade
  const CASCADE_MS = 90;         // entre deux cases de la cascade
  const TELEPORT = 24 * T;       // chemin plus long : il apparaît directement sur place
  const TELEPORT_FAR = 70 * T;   // le matin, il traverse la ferme jusqu'au Poulailler
  const OUT = [6, 21.5];         // heures où il est dehors
  const FADE_S = 0.25;
  const HOME_MAX = 30 * T;       // « Dormir » : il arrive à la porte de moins loin que ça (il se presse)
  const ASLEEP_S = 2.4;          // couché depuis ce temps, il dort : la nuit passe
  const BED_FEET = 27;           // couché : ses pieds à cette hauteur sous le haut du lit (le visage au-dessus de la couverture)
  const Z_S = 1.8;               // un « Z » monte pendant ce temps ; trois à la fois
  // Le repas (startMeal) : les chaises dans l'ordre où l'on s'assoit (celles derrière la table
  // d'abord, de face ; puis les bouts, de profil ; puis devant, de dos), la vue et le sens de
  // chacune. `seat` : les pieds d'un convive assis sont à tant de px au-dessus du bas de la chaise.
  const CHAISES = [['chaise_5', 'bas', false], ['chaise_6', 'bas', false], ['chaise_1', 'cote', false], ['chaise_2', 'cote', true], ['chaise_3', 'haut', false], ['chaise_4', 'haut', false]];
  const MEAL = { seat: 5, arriveMax: 14, eatS: 6, bite: [0.5, 0.35], bubble: [1, 5.5], stagger: 0.7, leaveS: 1.6 };
  // Gestes : images (suffixe de la vue), durée de chacune (s), image du coup (la case change).
  const ACTS = {
    labourer: { anim: 'houe', frames: [0, 1, 2, 3, 3], dur: [0.14, 0.16, 0.08, 0.12, 0.18], hit: 3 },
    couper: { anim: 'hache', frames: [0, 1, 1, 2, 3, 3], dur: [0.12, 0.16, 0.1, 0.06, 0.1, 0.24], hit: 4 },
    lancer: { anim: 'peche', frames: [0, 1, 1, 2], dur: [0.25, 0.22, 0.1, 0.2], hit: 3 },
    ferrer: { anim: 'peche', frames: [3, 3, 0], dur: [0.12, 0.4, 0.25], hit: 1 },
    piocher: { anim: 'pioche', frames: [0, 1, 1, 2, 3, 3], dur: [0.12, 0.18, 0.1, 0.06, 0.12, 0.26], hit: 4 },
    planter: { anim: 'plante', frames: [0, 1, 2, 2], dur: [0.14, 0.16, 0.18, 0.14], hit: 2 },
    arroser: { anim: 'arrose', frames: [0, 1, 2, 1, 2], dur: [0.14, 0.14, 0.2, 0.1, 0.24], hit: 2 },
    recolter: { anim: 'plante', frames: [1, 2, 1, 0], dur: [0.14, 0.2, 0.14, 0.12], hit: 2 },
    ramasse: { anim: 'ramasse', frames: [0, 1, 2, 1, 2, 0], dur: [0.2, 0.2, 0.3, 0.2, 0.3, 0.2], hit: -1 },
    cueille: { anim: 'ramasse', frames: [0, 1, 2, 1, 0], dur: [0.16, 0.18, 0.26, 0.16, 0.16], hit: 3 },
    frigo: { anim: 'frigo', frames: [0, 1, 2, 2, 1, 0], dur: [0.2, 0.25, 0.9, 0.3, 0.25, 0.2], hit: -1 },
  };

  // Le bout de la canne à pêche dans chaque image peche_<vue>_<n> (x, y dans la case de
  // 16 × 32, voir scripts/personnage/fermier.py) : le fil part de là.
  const PECHE_BOUT = {
    cote: [[15, 8], [1, 3], [15, 13], [13, 2]],
    bas: [[14, 9], [13, 1], [15, 27], [15, 4]],
    haut: [[14, 8], [13, 29], [15, 5], [14, 1]],
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
    // et l'herbe restent libres : il marche dans ses parcelles. Les passages (vers_la_…) aussi : on y va.
    let blocked = null;
    function buildGrid() {
      blocked = new Uint8Array(cols * rows);
      const mark = (x0, y0, x1, y1) => {
        for (let r = Math.max(0, Math.floor(y0 / T)); r <= Math.min(rows - 1, Math.floor((y1 - 1) / T)); r++) {
          for (let c = Math.max(0, Math.floor(x0 / T)); c <= Math.min(cols - 1, Math.floor((x1 - 1) / T)); c++) blocked[r * cols + c] = 1;
        }
      };
      for (const [name, r] of Object.entries(o.objects || {})) {
        if (!r || !r.width || !r.height || /^zone_culture|^verger$|^vers_la_/.test(name)) continue;
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
      // la ferme générée : les murs et l'Atelier posés (leurs cases)
      if (o.blocks) for (const c of o.blocks()) blocked[c] = 1;
    }
    const free = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows && !blocked[r * cols + c];
    const cellOf = (x, y) => [Math.floor(x / T), Math.floor((y - 1) / T)];
    const freeAt = (x, y) => { const [c, r] = cellOf(x, y); return free(c, r); };
    function lineFree(x0, y0, x1, y1) {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4));
      for (let i = 1; i < n; i++) if (!freeAt(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n)) return false;
      return true;
    }
    // Le chemin le plus court sur les cases (CarteKit.chemin : A*, 8 directions, sans couper
    // les coins), puis tendu : il va tout droit tant que rien ne le gêne. null : pas de chemin.
    let grid = null;
    function findPath(x0, y0, x1, y1) {
      if (!blocked) buildGrid();
      if (lineFree(x0, y0, x1, y1)) return [{ x: x1, y: y1 }];
      const [sc, sr] = cellOf(x0, y0);
      const [gc, gr] = cellOf(x1, y1);
      if (!free(gc, gr)) return null;
      if (!grid) grid = { cols, rows, libre: (i) => !blocked[i] };
      const cells = K.chemin(grid, sr * cols + sc, gr * cols + gc, { max: Math.round(cols * rows * 1.5) });
      if (!cells) return null;
      const pts = cells.map((i) => ({ x: (i % cols) * T + T / 2, y: ((i / cols) | 0) * T + T - 2 }));
      pts[pts.length - 1] = { x: x1, y: y1 };
      return K.tendre(pts, x0, y0, lineFree);
    }
    const pathLength = (x, y, path) => path.reduce((s, p) => { const d = Math.hypot(p.x - x, p.y - y); x = p.x; y = p.y; return s + d; }, 0);

    /* ---------- l'image ---------- */

    const s = scene.add.sprite(0, 0, o.sheet, 0).setOrigin(0.5, 1).setVisible(false);
    let x = 0, y = 0, face = 'bas', flip = false, shown = false, alpha = 0, fade = 0;
    let lastPos = null;             // dernière position donnée par pos()
    let basket = false;
    function frame(name) {
      const k = F[name];
      if (k !== undefined) s.setFrame(k);
    }
    // le triporteur (js/carte/triporteur.js) : dehors, quand il marche ou attend, il y est
    // assis et roule plus vite (ctx.triporteur : le modèle dit qu'il est en selle) ; pendant un
    // geste, dans un intérieur, il en descend
    const selle = K.triporteur ? K.triporteur(scene) : null;
    const ROULE = /^(marche|panier|idle)_(bas|haut|cote)_\d$/;
    let roule = 0, rx = 0, ry = 0;
    const enSelle = () => !!(selle && ctx.triporteur && shown && !home && !where);
    const vitesse = () => (enSelle() ? K.TRIPORTEUR.vitesse : 1);
    let drawn = '';
    function draw(name) {
      drawn = name;
      if (enSelle() && ROULE.test(name)) {
        roule += Math.hypot(x - rx, y - ry);
        const r = selle.place(x, y, face, flip, roule, alpha);
        frame(r.image);
        s.setPosition(Math.round(x + r.dx), Math.round(y - r.dy)).setFlipX(flip).setDepth(y).setAlpha(alpha);
      } else {
        if (selle) selle.cache();
        frame(name);
        s.setPosition(Math.round(x), Math.round(y)).setFlipX(flip).setDepth(y).setAlpha(alpha);
      }
      rx = x; ry = y;
    }
    function look(dx, dy) {
      ({ face, flip } = K.regard(dx, dy));
    }

    /* ---------- dehors : la maison, le Poulailler ---------- */

    const sprite = (id) => { const e = scene.buildings && scene.buildings.get(id); return e && !e.ruine ? e.sprite : null; };
    function door() {
      const h = sprite('maison') || (scene.buildings && scene.buildings.get('maison') && scene.buildings.get('maison').sprite);
      if (h) return { x: Math.round(h.x + h.width * 0.5), y: Math.round(h.y + 6) };
      // la ferme générée : la porte de son foyer (la pièce où il dort), sans maison
      const f = o.foyer ? o.foyer() : null;
      if (f) return f;
      const r = (o.objects || {}).maison;
      return r ? { x: r.x + r.width / 2, y: r.y + r.height + 6 } : { x: world.w / 2, y: world.h / 2 };
    }
    function coopSpot() {
      const c = sprite('poulailler');
      // la ferme générée : devant le nichoir
      if (!c && o.cle) return o.cle('poulailler');
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
        walk: true,
        start() {
          // Rentré dans la maison : il en ressort par la porte.
          if (!shown) { const d = door(); x = d.x; y = d.y; face = 'bas'; flip = false; appear(); }
          path = findPath(x, y, tx, ty);
          const len = path ? pathLength(x, y, path) : 0;
          if (path && opts && opts.max && len > opts.max && !reduced()) skipAlong(path, len - opts.max);
          else if (!path || reduced() || len > (opts && opts.far ? TELEPORT_FAR : TELEPORT)) { x = tx; y = ty; path = []; }
        },
        step(dt) {
          age += dt;
          if (!path.length) return true;
          const p = path[0];
          const dx = p.x - x, dy = p.y - y, left = Math.hypot(dx, dy);
          const v = SPEED * vitesse() * (opts && opts.hurry ? 2 : 1) * Math.min(1, 0.4 + age * 3);
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
    // Il saute `d` px du chemin (hors de la vue : il arrive de moins loin).
    function skipAlong(path, d) {
      while (path.length && d > 0) {
        const p = path[0], left = Math.hypot(p.x - x, p.y - y);
        if (left <= d) { x = p.x; y = p.y; d -= left; path.shift(); continue; }
        x += ((p.x - x) / left) * d; y += ((p.y - y) / left) * d; d = 0;
      }
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
      // Il laisse tomber ce qu'il faisait en attendant (souffler).
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
      // ce qu'a fait le robot ou un asperseur : pas un geste du personnage
      const auto = new Set(next.parAuto || []);
      const add = (type, c, view) => {
        if (auto.has(`${type}:${c}`)) return;
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
      ctx.triporteur = !!raw.triporteur;
      ctx.coucher = !!raw.coucher;
      ctx.dort = !!raw.dort;
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
      // la ferme générée : devant la mangeoire
      if (!b && o.cle) return o.cle('etable');
      if (!b || b.texture.key.indexOf('ph_') === 0) return null;
      return { x: Math.round(b.x + b.width * 0.5), y: Math.round(b.y + 6) };
    }
    function treeSpot(c) {
      // (la ferme générée : l'arbre planté sur la case c de la carte)
      const r = (o.objects || {})['arbre_verger_' + (c + 1)] || (o.arbre ? o.arbre(c) : null);
      return r ? { x: Math.round(r.x + r.width / 2 - 12), y: Math.round(r.y + r.height + 2), face: 'cote', flip: false } : null;
    }
    // Version 1.19 : le Poulailler et l'Étable ne se vident pas d'eux-mêmes ; le joueur l'y
    // envoie (double appui sur le bâtiment, ou appui sur sa bulle). Il y va, remplit son panier
    // (o.collect : les œufs ; le lait, et il tond les moutons prêts) et le rapporte devant la
    // maison.
    const isBuilding = (lieu) => lieu === 'poulailler' || lieu === 'etable';
    function fillBasket(lieu) {
      claimed.delete(lieu);
      pilesNow.delete(lieu);
      if (o.collect) o.collect(lieu, (items) => { if (items && o.gain) o.gain(items); });
    }
    function collect(lieu) {
      if (!isBuilding(lieu) || !pilesNow.has(lieu) || claimed.has(lieu)) return false;
      const spot = lieu === 'poulailler' ? coopSpot() : barnSpot();
      if (reduced() || !spot) { fillBasket(lieu); return true; }
      claimed.add(lieu);
      const d = door();
      const list = [
        walkTo(spot.x, spot.y, { far: true }),
        act('ramasse', { face: 'cote', flip: false }),
        once(() => { fillBasket(lieu); basket = true; }),
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
    function schedule() {
      const outHours = ctx.hour >= OUT[0] && ctx.hour < OUT[1];
      // Il dort, et la ferme générée lui a une paillasse : il va s'y coucher.
      const lit = ctx.dort && !home && shown && o.couchage ? o.couchage() : null;
      if (lit) {
        jobs.push(walkTo(lit.x, lit.y, { far: true }));
        jobs.push(once(() => { couche = { lit, t: 0, slept: true }; }));
        return;
      }
      // Il dort (sans passer par l'intérieur : maison en ruine) : il rentre se coucher.
      if (ctx.dort && !home && shown) {
        const d = door();
        jobs.push(walkTo(d.x, d.y));
        jobs.push(once(() => { face = 'haut'; vanish(); home = true; where = 'maison'; }));
        jobs.push(wait(FADE_S));
        return;
      }
      if (outHours && home) {
        const d = door();
        x = d.x; y = d.y; face = 'bas'; flip = false;
        appear();
        jobs.push(walkTo(d.x, d.y + T));
        return;
      }
      // Libre : il reste où il est (il ne bouge que pour le joueur : ses gestes, le doigt,
      // le double appui, une bulle de tas).
      if (shown) { idleAge = 0; idleLen = rand(5, 12); }
    }

    // Le point libre le plus proche de (tx, ty) (6 cases au plus, CarteKit.plusProche), null
    // s'il n'y en a pas.
    function nearestFree(tx, ty) {
      if (!blocked) buildGrid();
      if (freeAt(tx, ty)) return { x: tx, y: ty };
      const [c0, r0] = cellOf(tx, ty);
      const at = (i, j) => ({ x: (c0 + i) * T + T / 2, y: (r0 + j) * T + T - 2 });
      const best = K.plusProche((i, j) => free(c0 + i, r0 + j), 6, { dist: (i, j) => { const p = at(i, j); return Math.hypot(p.x - tx, p.y - ty); } });
      return best ? at(best.i, best.j) : null;
    }

    // Version 1.19 : le joueur l'envoie en (tx, ty) (double appui sur la carte). Il y va avant
    // le reste (ses gestes en attente suivent), puis y reste.
    // Renvoie le point où il va, ou null.
    function goTo(tx, ty) {
      const spot = nearestFree(Math.max(0, Math.min(world.w - 1, tx)), Math.max(1, Math.min(world.h - 1, ty)));
      if (!spot) return null;
      if (job && job.idle) job = null;
      const w = walkTo(spot.x, spot.y, { far: true });
      w.joueur = true;               // (le doigt qui le dirige l'annule : steer)
      jobs = [w, wait(rand(3, 5))].concat(jobs.filter((j) => !j.idle));
      idleAge = 0;
      return spot;
    }

    // Le joueur le dirige au doigt (CarteKit.manette) : steer({ x, y }), il marche dans cette
    // direction (de longueur 1) et glisse le long de ce qui le gêne ; steer(null), il s'arrête,
    // et reste là. Le geste qu'il fait finit d'abord ; ceux qui attendent
    // reprennent après (le chemin vers un geste repart d'où il est). Au lit (ou en y allant) : rien.
    let steer = null, steerWalked = 0;
    function steerTo(dir) {
      if (dir && !ctx.coucher && !ctx.dort) { steer = dir; return; }
      if (!steer) return;
      steer = null;
      idleAge = 0;
      jobs.unshift(wait(rand(3, 5)));
    }
    function stepSteer(dt) {
      if (!blocked) buildGrid();
      if (!shown) { const d = door(); x = d.x; y = d.y; appear(); }
      const v = SPEED * vitesse() * dt;
      const nx = Math.max(0, Math.min(world.w - 1, x + steer.x * v)), ny = Math.max(1, Math.min(world.h - 1, y + steer.y * v));
      // (coincé là où il ne devrait pas être : il en sort dans n'importe quelle direction)
      const libre = (px, py) => freeAt(px, py) || !freeAt(x, y);
      let mx = x, my = y;
      if (libre(nx, ny)) { mx = nx; my = ny; } else if (libre(nx, y)) mx = nx; else if (libre(x, ny)) my = ny;
      const d = Math.hypot(mx - x, my - y);
      x = mx; y = my;
      look(steer.x, steer.y);
      steerWalked += d;
      draw(d > 0.01 ? `${basket ? 'panier' : 'marche'}_${face}_${Math.floor(steerWalked / STRIDE) % 4}` : `idle_${face}_0`);
    }

    // Il arrive d'une autre carte (la carte de transition) : il apparaît en (tx, ty) (la case
    // libre la plus proche) et reste là, au lieu de sortir de la maison.
    function arrive(tx, ty) {
      const spot = nearestFree(Math.max(0, Math.min(world.w - 1, tx)), Math.max(1, Math.min(world.h - 1, ty)));
      if (!spot) return null;
      x = spot.x; y = spot.y; face = 'cote'; flip = true;
      appear();
      job = null;
      jobs = [wait(rand(3, 5))];
      idleAge = 0;
      draw(`idle_${face}_0`);
      return spot;
    }

    // « Dormir » : il laisse tout, marche (vite) jusqu'à la porte de la maison et entre ; `done`
    // quand il est dedans. Déjà dans la maison (ou pas sur la carte) : `done` tout de suite.
    let arriving = false;            // il vient d'entrer : il apparaîtra à l'entrée de l'intérieur
    function goHome(done) {
      // la ferme générée : il va se coucher sur sa paillasse, dehors (couchage)
      const lit = o.couchage ? o.couchage() : null;
      if (lit) {
        releaseAll(); claimed.clear(); basket = false; job = null;
        // déjà rentré (la maison, provisoire) : il ressort par la porte
        if (!shown || home) { const d = door(); x = d.x; y = d.y + 4; face = 'bas'; flip = false; home = false; where = null; appear(); }
        if (reduced()) { jobs = []; x = lit.x; y = lit.y; couche = { lit, t: 0, slept: false }; setTimeout(done, 0); return; }
        jobs = [walkTo(lit.x, lit.y, { far: true, hurry: true }), once(() => { couche = { lit, t: 0, slept: false }; }), once(done)];
        idleAge = 0;
        return;
      }
      if (!shown || home) { setTimeout(done, 0); return; }
      const d = door();
      const inside = () => { face = 'haut'; vanish(); home = true; where = 'maison'; arriving = true; };
      releaseAll(); claimed.clear(); basket = false; job = null;
      if (reduced()) { jobs = []; inside(); setTimeout(done, 0); return; }
      jobs = [walkTo(d.x, d.y, { far: true, hurry: true, max: HOME_MAX }), once(inside), wait(FADE_S), once(done)];
      idleAge = 0;
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
    // La ferme générée : prendre à la main ce qui est au sol en `foot` (une pierre, un bout de
    // bois, une herbe) ; il se baisse à côté.
    function gather(foot, onHit) {
      return strike('cueille', foot, 9, onHit);
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

    // La canne à pêche en main, le joueur a touché l'eau : il va sur la rive en `spot`, tourné
    // vers l'eau (`face`, `flip`), lance (hooks.cast), attend la touche `wait` secondes
    // (hooks.bite), puis ferre (hooks.reel). Renvoie false s'il ne peut pas y aller.
    function fish(spot, face, flip, sec, hooks) {
      if (!blocked) buildGrid();
      if (!freeAt(spot.x, spot.y)) return false;
      if (job && job.idle) job = null;
      let t = 0;
      const hold = {
        start() {},
        step(dt) {
          t += dt;
          draw(`peche_${face}_2`);
          if (t < sec) return false;
          if (hooks.bite) hooks.bite();
          return true;
        },
      };
      jobs = [walkTo(spot.x, spot.y), act('lancer', { face, flip, onHit: hooks.cast }), hold, act('ferrer', { face, flip, onHit: hooks.reel }), wait(rand(0.6, 1.2))]
        .concat(jobs.filter((j) => !j.idle));
      idleAge = 0;
      return true;
    }
    // Le bout de la canne, en px de carte, s'il pêche (image peche_…), sinon null.
    function rodTip() {
      const m = /^peche_(cote|bas|haut)_(\d)$/.exec(drawn);
      if (!m || !shown || home) return null;
      const [fx, fy] = PECHE_BOUT[m[1]][+m[2]];
      return { x: flip ? Math.round(x) + 8 - fx - 0.5 : Math.round(x) - 8 + fx + 0.5, y: Math.round(y) - 32 + fy + 0.5, face: m[1] };
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
    const inside = { s: null, x: 0, y: 0, face: 'bas', at: null, t: 0, wait: 0, alpha: 0, path: [], goal: null };
    let cooking = null, frigoDue = false;
    let viewing = null;              // l'intérieur que le joueur regarde
    // Le point où il peut se tenir le plus près de (tx, ty) dans `room`. `clear` : sans meuble
    // contre lui (pour s'y tenir : il ne se plante pas devant une chaise).
    function roomSpot(room, tx, ty, clear) {
      const ok = clear ? (px, py) => room.walk(px, py) && !(room.props || []).some((p) => p.sprite && p.sprite.depth > 1
        && px + 8 > p.x && px - 8 < p.x + p.w && py - 26 < p.y + p.h && py > p.y - 4) : room.walk;
      if (ok(tx, ty)) return { x: tx, y: ty };
      // sur une grille de IN_STEP px autour du point, jusqu'à 92 px
      const best = K.plusProche((i, j) => ok(tx + i * IN_STEP, ty + j * IN_STEP), Math.floor(95 / IN_STEP), { de: 1 });
      return best ? { x: tx + best.i * IN_STEP, y: ty + best.j * IN_STEP } : { x: tx, y: ty };
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
    // Chemin dans un intérieur : sur une grille de IN_STEP px (CarteKit.chemin), puis tendu.
    function roomPath(room, x0, y0, x1, y1) {
      if (roomLineFree(room, x0, y0, x1, y1)) return [{ x: x1, y: y1 }];
      const ox = room.x, cols = Math.ceil(room.w / IN_STEP), rows = Math.ceil(room.h / IN_STEP);
      const cell = (x, y) => Math.max(0, Math.min(rows - 1, Math.round(y / IN_STEP))) * cols + Math.max(0, Math.min(cols - 1, Math.round((x - ox) / IN_STEP)));
      const at = (i) => ({ x: ox + (i % cols) * IN_STEP, y: ((i / cols) | 0) * IN_STEP });
      const ok = new Map();
      const libre = (i) => { if (!ok.has(i)) { const p = at(i); ok.set(i, room.walk(p.x, p.y)); } return ok.get(i); };
      const cells = K.chemin({ cols, rows, libre }, cell(x0, y0), cell(x1, y1), { max: 8000 });
      if (!cells) return [{ x: x1, y: y1 }];   // pas de chemin : tout droit (cas d'un meuble posé sur lui)
      if (!cells.length) return [];             // déjà sur place
      const pts = cells.map(at);
      pts[pts.length - 1] = { x: x1, y: y1 };
      return K.tendre(pts, x0, y0, (ax, ay, bx, by) => roomLineFree(room, ax, ay, bx, by));
    }

    // Le joueur entre dans `room` : il y est déjà, ou il y va (il quitte le dehors tout de suite).
    function enterView(room) {
      viewing = room.id;
      const rest = roomSpot(room, Math.round(room.view.x + room.view.w * 0.5), Math.round(room.view.y + room.view.h * 0.7), true);
      if (where === room.id && arriving) {
        // il vient d'entrer par la porte : il apparaît à l'entrée
        inside.x = room.entree.x; inside.y = room.entree.y; inside.wait = 0; inside.alpha = 0;
      } else if (where === room.id) {
        if (inside.at !== room.id) { inside.x = rest.x; inside.y = rest.y; }
        inside.wait = 0; inside.alpha = 1;
      } else {
        const from = where ? doorOf(where) : { x, y };
        const to = doorOf(room.id);
        inside.wait = reduced() ? 0 : Math.min(ARRIVE_MAX, Math.hypot(to.x - from.x, to.y - from.y) / (SPEED * 2));
        inside.x = room.entree.x; inside.y = room.entree.y; inside.alpha = 0;
        // dehors : il est parti (ce qu'il allait faire attendra)
        jobs = []; job = null; claimed.clear(); basket = false;
        shown = false; fade = 0; alpha = 0; s.setVisible(false);
        x = to.x; y = to.y;
        where = room.id; home = room.id === 'maison';
      }
      inside.at = room.id; inside.path = []; inside.goal = null; inside.mode = 'idle'; inside.t = 0;
      inside.rest = rest;
      arriving = false;
      frigoDue = false;
    }
    // Le joueur ressort : il ressort aussi par la porte, sauf la nuit dans la maison.
    function leaveView() {
      const id = viewing;
      viewing = null;
      if (inside.s) inside.s.setVisible(false);
      getUp();
      endMeal();
      if (where !== id) return;
      if (id === 'maison' && (ctx.hour < OUT[0] || ctx.hour >= OUT[1])) return;
      const d = doorOf(id);
      x = d.x; y = d.y; face = 'bas'; flip = false;
      appear();
      jobs = [walkTo(d.x, d.y + T)].concat(jobs);
    }
    // Son lit dans `room` : la place lit_1 (le premier lit d'adulte, sinon la paillasse), si
    // son dessin et sa couverture sont là. side = où il se tient avant de s'y coucher (au pied
    // du lit), at = ses pieds une fois couché (la tête sur l'oreiller).
    function bedOf(room) {
      const p = (room.props || []).find((q) => q.name === 'lit_1');
      const b = p && p.sprite;
      if (!b || !b.visible || !o.has || !o.has(`meuble_${p.dessin}_drap`)) return null;
      const top = b.y - b.height;
      return {
        key: `${p.dessin}@${b.x},${b.y}`, sprite: b, drap: `meuble_${p.dessin}_drap`,
        side: roomSpot(room, Math.round(b.x), Math.round(b.y + 6)),
        at: { x: Math.round(b.x), y: Math.min(top + BED_FEET, b.y - 1) },
      };
    }
    // Il se couche : debout entre le lit et sa couverture, tourné vers nous.
    function lieDown(S, bed) {
      inside.mode = 'lit'; inside.bed = bed.key; inside.sleep = 0; inside.slept = false;
      inside.x = bed.at.x; inside.y = bed.at.y; inside.face = 'bas'; inside.flip = false;
      if (!inside.drap) inside.drap = scene.add.image(0, 0, bed.drap).setOrigin(0.5, 1);
      inside.drap.setTexture(bed.drap).setPosition(bed.sprite.x, bed.sprite.y).setDepth(bed.sprite.depth + 0.2).setVisible(true);
      sleepInBed(S, bed, 0);
    }
    function sleepInBed(S, bed, dt) {
      inside.sleep += dt;
      // un souffle lent ; les « Z » montent
      const k = F[`idle_bas_${Math.floor(inside.sleep / (BREATH_S * 2)) % 2}`];
      if (k !== undefined) S.setFrame(k);
      S.setVisible(true).setAlpha(inside.alpha).setFlipX(false).setPosition(inside.x, inside.y).setDepth(bed.sprite.depth + 0.1);
      if (inside.drap) inside.drap.setAlpha(1);
      stepZ(inside.x, inside.y - 32 + 5, inside.sleep);
      if (!inside.slept && inside.sleep >= (reduced() ? 0.8 : ASLEEP_S)) {
        inside.slept = true;
        if (o.asleep && !ctx.dort) o.asleep();   // il s'endort : la nuit défile en accéléré
      }
    }
    // Il se lève : au pied du lit, sans couverture ni « Z ».
    function getUp() {
      if (inside.mode !== 'lit') return;
      inside.mode = 'idle';
      inside.bed = null;
      if (inside.drap) inside.drap.setVisible(false);
      stepZ(0, 0, -1);
      const room = viewing && scene.rooms ? scene.rooms[viewing] : null;
      const p = room && (room.props || []).find((q) => q.name === 'lit_1');
      if (p && p.sprite) {
        const side = roomSpot(room, Math.round(p.sprite.x), Math.round(p.sprite.y + 6));
        inside.x = side.x; inside.y = side.y;
      }
      inside.path = []; inside.goal = null; inside.t = 0;
    }
    // Les « Z » au-dessus de sa tête (en `hx`, `hy`), qui grandissent en montant et
    // s'effacent ; `t` < 0 : ils disparaissent. Dessinés en pixels (4, 5, puis 6 de côté).
    const zs = [];
    function zTexture(n) {
      const key = `fermier_z${n}`;
      if (scene.textures.exists(key)) return key;
      const c = scene.textures.createCanvas(key, n + 2, n + 2);
      const g = c.getContext();
      const dot = (px, py, col) => { g.fillStyle = col; g.fillRect(px, py, 1, 1); };
      const on = new Set();
      for (let i = 0; i < n; i++) { on.add(`${i},0`); on.add(`${i},${n - 1}`); }
      for (let r = 1; r < n - 1; r++) on.add(`${Math.round((n - 1) * (1 - r / (n - 1)))},${r}`);
      for (const k of on) { const [a, b] = k.split(',').map(Number); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) dot(a + 1 + dx, b + 1 + dy, '#22314a'); }
      for (const k of on) { const [a, b] = k.split(',').map(Number); dot(a + 1, b + 1, '#f4f1e6'); }
      c.refresh();
      return key;
    }
    function stepZ(hx, hy, t) {
      if (t < 0 || reduced()) { for (const z of zs) z.setVisible(false); if (t >= 0 && reduced()) showZStill(hx, hy); return; }
      for (let i = 0; i < 3; i++) {
        if (!zs[i]) zs[i] = scene.add.image(0, 0, zTexture(4)).setOrigin(0.5, 1);
        const p = ((t + (i * Z_S) / 3) % Z_S) / Z_S;            // 0 → 1 en montant
        const z = zs[i];
        z.setTexture(zTexture(p < 0.33 ? 4 : p < 0.66 ? 5 : 6));
        z.setPosition(Math.round(hx + 4 + p * 12 + Math.sin(p * Math.PI * 2) * 1.5), Math.round(hy - 1 - p * 24))
          .setAlpha(t < (i * Z_S) / 3 ? 0 : Math.min(1, p * 5, (1 - p) * 3)).setDepth(1e6).setVisible(true);
      }
    }
    // Animations réduites : un seul « Z », immobile.
    function showZStill(hx, hy) {
      if (!zs[0]) zs[0] = scene.add.image(0, 0, zTexture(6)).setOrigin(0.5, 1);
      zs[0].setTexture(zTexture(6)).setPosition(Math.round(hx + 8), Math.round(hy - 6)).setAlpha(1).setDepth(1e6).setVisible(true);
    }

    /* ---------- le repas ---------- */

    let meal = null;
    // Le repas commence : il ira à table dès qu'il est dans la maison. o : { convives: [{ key
    // (planche), scale }…] (les autres membres), heureux (bulle de bonheur), done() (fini ou
    // annulé) }.
    function startMeal(opts) {
      endMeal();
      meal = { convives: (opts && opts.convives) || [], heureux: !!(opts && opts.heureux), done: opts && opts.done, phase: 'attente', t: 0, eaters: null };
    }
    // Fin du repas (ou annulation) : les autres membres disparaissent.
    function endMeal() {
      if (!meal) return;
      const m = meal;
      meal = null;
      for (const e of m.eaters || []) if (!e.main && e.s) e.s.destroy();
      if (inside.mode === 'repas') { inside.mode = 'idle'; inside.path = []; inside.goal = null; inside.t = 0; }
      if (m.done) m.done();
    }
    // Les places autour de la table : la chaise (si elle est achetée) ou sa place, puis, s'il
    // y a plus de monde que de places, debout devant la table.
    function mealSeats(room, n) {
      const props = room.props || [];
      const seats = [];
      for (const [name, vue, flip] of CHAISES) {
        const p = props.find((q) => q.name === name);
        if (!p) continue;
        const cx = Math.round(p.x + p.w / 2), bas = p.y + p.h;
        const chaise = !!(p.sprite && p.sprite.visible);
        seats.push({
          vue, flip, chaise, x: cx, y: chaise ? bas - MEAL.seat : bas,
          depth: (chaise ? p.sprite.depth : bas) + 0.1,
          approach: roomSpot(room, cx, vue === 'bas' ? p.y - 2 : bas + 4),
        });
      }
      // les chaises achetées d'abord (dans l'ordre de CHAISES), puis les places sans chaise
      seats.sort((a, b) => b.chaise - a.chaise);
      const table = props.find((q) => q.name === 'table');
      for (let k = 0; seats.length < n && k < 12; k++) {
        const tx = table ? table.x + table.w / 2 : room.view.x + room.view.w / 2, ty = table ? table.y + table.h + 30 : room.view.y + room.view.h * 0.7;
        const sp = roomSpot(room, Math.round(tx + (k % 2 ? 1 : -1) * (10 + 12 * (k >> 1))), Math.round(ty), true);
        seats.push({ vue: 'haut', flip: false, chaise: false, x: sp.x, y: sp.y, depth: sp.y, approach: sp });
      }
      return seats;
    }
    function mealInit(room) {
      const n = meal.convives.length + 1;
      const seats = mealSeats(room, n);
      const v = room.view;
      meal.eaters = [];
      meal.eaters.push({ main: true, s: inside.s, x: inside.x, y: inside.y, seat: seats[0], state: 'walk', path: null, walked: 0, delay: 0, alpha: inside.alpha, phase: 0 });
      meal.convives.forEach((c, i) => {
        // ils arrivent d'un peu partout dans la maison (la chambre, le salon)
        const from = roomSpot(room, Math.round(room.full.x + rand(0.1, 0.9) * room.full.w), Math.round(v.y + rand(0.35, 0.95) * v.h), true);
        const s = scene.add.sprite(from.x, from.y, c.key, 0).setOrigin(0.5, 1).setScale(c.scale || 1).setVisible(false);
        meal.eaters.push({ main: false, s, x: from.x, y: from.y, seat: seats[i + 1] || seats[seats.length - 1], state: 'walk', path: null, walked: 0, delay: reduced() ? 0 : (i + 1) * MEAL.stagger * rand(0.6, 1.2), alpha: 0, phase: rand(0, 0.8) });
      });
      meal.phase = 'arrive';
      meal.t = 0;
      inside.mode = 'repas';
    }
    // Un convive : il marche vers sa place, s'assoit, mange, puis (les autres) s'en va.
    function stepEater(room, e, dt) {
      const S = e.s;
      if (e.delay > 0) { e.delay -= dt; S.setVisible(false); return; }
      if (e.state !== 'parti') e.alpha = Math.min(1, e.alpha + dt / FADE_S);
      let name;
      const walk = (tx, ty) => {
        if (!e.path) e.path = reduced() ? [] : roomPath(room, e.x, e.y, tx, ty);
        if (!e.path.length) { e.x = tx; e.y = ty; return true; }
        const p = e.path[0];
        const dx = p.x - e.x, dy = p.y - e.y, left = Math.hypot(dx, dy);
        const d = Math.min(left, SPEED * dt);
        if (left > 0.01) { e.x += (dx / left) * d; e.y += (dy / left) * d; }
        if (left - d <= 0.3) e.path.shift();
        e.walked += d;
        ({ face: e.face, flip: e.flip } = K.regard(dx, dy));
        name = `marche_${e.face}_${Math.floor(e.walked / STRIDE) % 4}`;
        return false;
      };
      const seat = e.seat;
      if (e.state === 'walk') {
        if (walk(seat.approach.x, seat.approach.y) || meal.phase !== 'arrive') { e.state = 'assis'; e.path = null; e.x = seat.x; e.y = seat.y; }
      }
      if (e.state === 'part') {
        if (walk(e.goal.x, e.goal.y)) e.state = 'parti';
      }
      if (e.state === 'parti') { e.alpha = Math.max(0, e.alpha - dt / FADE_S); name = `idle_${e.face || 'bas'}_0`; }
      let depth = e.y;
      if (e.state === 'assis') {
        e.face = seat.vue; e.flip = seat.flip;
        depth = seat.depth;
        if (seat.chaise) {
          const mange = meal.phase === 'mange';
          const cycle = MEAL.bite[0] + MEAL.bite[1];
          const k = mange && ((meal.t + e.phase) % cycle) >= MEAL.bite[0] ? 1 : 0;
          name = `assis_${seat.vue}_${k}`;
        } else name = `idle_${seat.vue}_${Math.floor((meal.t + e.phase) / BREATH_S) % 2}`;
      }
      const k = F[name];
      if (k !== undefined) S.setFrame(k);
      S.setVisible(true).setAlpha(e.alpha).setPosition(Math.round(e.x), Math.round(e.y)).setFlipX(!!e.flip && name.indexOf('_cote_') > 0).setDepth(depth);
    }
    function stepMeal(room, dt) {
      if (!meal.eaters) mealInit(room);
      meal.t += dt;
      const E = meal.eaters;
      for (const e of E) stepEater(room, e, dt);
      const main = E[0];
      inside.x = main.x; inside.y = main.y; inside.alpha = main.alpha;
      if (meal.phase === 'arrive' && (E.every((e) => e.state === 'assis') || meal.t > MEAL.arriveMax)) { meal.phase = 'mange'; meal.t = 0; }
      else if (meal.phase === 'mange' && meal.t >= MEAL.eatS) {
        meal.phase = 'fin'; meal.t = 0;
        const v = room.view;
        for (const e of E) {
          e.path = null;
          if (e.main) { e.x = e.seat.approach.x; e.y = e.seat.approach.y; e.state = 'debout'; e.face = 'bas'; continue; }
          e.state = 'part';
          e.goal = roomSpot(room, Math.round(room.full.x + rand(0.1, 0.9) * room.full.w), Math.round(v.y + rand(0.35, 0.95) * v.h), true);
        }
      } else if (meal.phase === 'fin') {
        if (main.state === 'debout') {
          const k = F[`idle_bas_${Math.floor(meal.t / BREATH_S) % 2}`];
          if (k !== undefined) main.s.setFrame(k);
          main.s.setPosition(Math.round(main.x), Math.round(main.y)).setDepth(main.y);
        }
        if (E.every((e) => e.main || e.alpha <= 0) || meal.t > MEAL.leaveS + 6) {
          inside.x = main.x; inside.y = main.y; inside.face = 'bas';
          endMeal();
        }
      }
    }
    // Les têtes des convives, pour les bulles de bonheur (pendant le repas, s'ils ont bien mangé).
    function mealHeads() {
      if (!meal || !meal.eaters || meal.phase !== 'mange' || !meal.heureux) return [];
      if (meal.t < MEAL.bubble[0] || meal.t > MEAL.bubble[1]) return [];
      return meal.eaters.filter((e) => e.state === 'assis' && e.s.visible).map((e) => ({ x: Math.round(e.x), y: Math.round(e.y) - Math.round(26 * (e.s.scaleY || 1)) }));
    }

    function stepInside(room, dt) {
      if (!inside.s) inside.s = scene.add.sprite(0, 0, o.sheet, 0).setOrigin(0.5, 1);
      const S = inside.s;
      if (inside.wait > 0) { inside.wait -= dt; S.setVisible(false); return; }   // il est en chemin
      inside.alpha = Math.min(1, inside.alpha + dt / FADE_S);
      inside.t += dt;
      // le repas : à table, avec la famille
      if (meal && room.id === 'maison' && !ctx.coucher) { stepMeal(room, dt); return; }
      // Où il doit être : au réfrigérateur juste après un changement, à la cuisine pendant une
      // préparation ; sinon il se tient au milieu, sans bouger.
      let want = null;
      // « Dormir » : son lit. Couché, il y reste tant que le coucher dure.
      const bed = ctx.coucher && room.id === 'maison' ? bedOf(room) : null;
      if (inside.mode === 'lit') {
        if (bed && bed.key === inside.bed) { sleepInBed(S, bed, dt); return; }
        getUp();
      }
      if (bed) { want = bed.side; frigoDue = false; if (inside.mode === 'frigo') inside.mode = 'idle'; }
      // il dort déjà (on revient dans la maison, ou deuxième appui sur « Dormir ») : au lit tout de suite
      if (bed && ctx.dort && inside.mode !== 'lit') { inside.x = bed.side.x; inside.y = bed.side.y; inside.path = []; inside.goal = { x: bed.side.x, y: bed.side.y }; inside.alpha = 1; }
      else if (frigoDue) { want = propSpot(room, 'frigo'); if (want) { inside.mode = 'frigo'; inside.t = 0; } frigoDue = false; }
      if (bed) { /* il va au lit */ }
      else if (inside.mode === 'frigo') want = propSpot(room, 'frigo');
      else if (cooking && room.id === 'maison') want = propSpot(room, cooking) || propSpot(room, 'cuisine');
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
        ({ face: inside.face, flip: inside.flip } = K.regard(dx, dy));
        name = `marche_${inside.face}_${Math.floor(inside.walked / STRIDE) % 4}`;
        inside.t = 0;
      } else if (inside.mode === 'frigo') {
        const A = ACTS.frigo;
        let t = inside.t, i = 0;
        while (i < A.frames.length && t >= A.dur[i]) { t -= A.dur[i]; i++; }
        if (i >= A.frames.length) { inside.mode = 'idle'; name = 'idle_haut_0'; } else name = `frigo_${A.frames[i]}`;
      } else if (bed) { lieDown(S, bed); return; }
      else if (want) name = `cuisine_${Math.floor(inside.t / 0.16) % 4}`;
      else name = `idle_${inside.face === 'haut' ? 'haut' : 'bas'}_${Math.floor(inside.t / BREATH_S) % 2}`;
      const k = F[name];
      if (k !== undefined) S.setFrame(k);
      S.setVisible(true).setAlpha(inside.alpha).setPosition(Math.round(inside.x), Math.round(inside.y)).setFlipX(!!inside.flip && name.indexOf('_cote_') > 0).setDepth(inside.y);
    }

    /* ---------- couché dehors, sur une paillasse (la ferme générée) ---------- */

    // couche = { lit: { x, y (ses pieds), depth, drap: { key, frame, x, y } }, t, slept } : il
    // dort debout entre la paillasse et sa couverture, tourné vers nous, comme dans son lit de
    // la maison ; endormi (ASLEEP_S), la nuit défile.
    let couche = null, drapDehors = null;
    function sleepOutside(dt) {
      const L = couche.lit;
      couche.t += dt;
      x = L.x; y = L.y; face = 'bas'; flip = false;
      if (!shown) appear();
      const k = F[`idle_bas_${Math.floor(couche.t / (BREATH_S * 2)) % 2}`];
      if (k !== undefined) s.setFrame(k);
      s.setVisible(true).setAlpha(alpha).setFlipX(false).setPosition(L.x, L.y).setDepth(L.depth + 0.1);
      if (!drapDehors) drapDehors = scene.add.image(0, 0, L.drap.key, L.drap.frame).setOrigin(0.5, 1);
      drapDehors.setPosition(L.drap.x, L.drap.y).setDepth(L.depth + 0.2).setVisible(true);
      stepZ(L.x, L.y - 32 + 5, couche.t);
      if (!couche.slept && couche.t >= (reduced() ? 0.8 : ASLEEP_S)) {
        couche.slept = true;
        if (o.asleep && !ctx.dort) o.asleep();
      }
    }
    // Il se lève : à côté de la paillasse, sans couverture ni « Z ».
    function getUpOutside() {
      couche = null;
      if (drapDehors) drapDehors.setVisible(false);
      stepZ(0, 0, -1);
      y += 4;
      idleAge = 0;
    }

    /* ---------- par image ---------- */

    function update(delta, roomId) {
      const dt = Math.min(delta, 50) / 1000;
      // (rentré, caché, descendu : plus de triporteur sous lui ; draw le repose s'il roule)
      if (selle && (!enSelle() || !s.visible || !ROULE.test(drawn))) selle.cache();
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
      if (couche) {
        if (ctx.coucher || ctx.dort) { sleepOutside(dt); return; }
        getUpOutside();
      }
      if (steer && (ctx.coucher || ctx.dort)) steerTo(null);
      if (steer && (!job || job.idle || job.walk)) {
        // une marche vers un geste reprendra au relâchement ; double appui : oublié
        if (job && !job.idle && !job.joueur) jobs.unshift(job);
        job = null;
        jobs = jobs.filter((j) => !j.idle && !j.joueur);
        stepSteer(dt);
        return;
      }
      if (!job && jobs.length) { job = jobs.shift(); job.start(); }
      if (job) {
        if (job.step(dt)) job = null;
        return;
      }
      if (!shown) { schedule(); return; }
      idleAge += dt;
      draw(`idle_${face}_${Math.floor(idleAge / BREATH_S) % 2}`);
      if (idleAge >= idleLen || ctx.dort) schedule();
    }

    return {
      filter,
      update,
      info: () => ({ x: Math.round(x), y: Math.round(y), face, shown, home, ou: where, couche: inside.mode === 'lit' || !!couche, dedans: viewing && inside.wait <= 0 ? { x: Math.round(inside.x), y: Math.round(inside.y) } : null, jobs: jobs.length + (job ? 1 : 0), dirige: !!steer, retenues: [...holds.keys()], cuisson: cooking, aRamasser: [...pilesNow.keys()], prevus: [...claimed] }),
      // Le joueur a appuyé sur la bulle d'un tas : il va le chercher tout de suite.
      fetch: (id) => fetch(id, true),
      goTo,
      // Au doigt : il marche dans la direction { x, y } ; null : il s'arrête.
      steer: steerTo,
      // Il arrive d'une autre carte, en (x, y).
      arrive,
      // Un chemin par les cases libres, de (x0, y0) à (x1, y1) : [{ x, y }…] ou null (pour
      // les autres membres de la famille, js/famille-ferme.js).
      path: (x0, y0, x1, y1) => findPath(x0, y0, x1, y1),
      // « Dormir » : il rentre dans la maison (done : il est dedans).
      goHome,
      // Où la vue de l'intérieur doit être (x), pendant qu'il va se coucher ; null sinon.
      focus: () => ((ctx.coucher || (meal && meal.phase === 'arrive')) && viewing === 'maison' && where === 'maison' && inside.wait <= 0 && inside.s ? inside.x : null),
      // Le repas : commencer, et les têtes des convives (bulles).
      startMeal,
      mealHeads,
      inMeal: () => !!meal,
      // La hache : couper l'arbre dont le pied est en `foot` ({ x, y }).
      chop,
      // La pioche : casser le rocher dont le pied est en `foot`, de demi-largeur `half`.
      mine,
      // À la main : prendre ce qui est au sol en `foot` (la ferme générée).
      gather,
      // La canne à pêche : pêcher depuis `spot`, et où est le bout de la canne.
      fish,
      rodTip,
      // Peut-il se tenir en (x, y) (ses pieds) ?
      standable: (px, py) => { if (!blocked) buildGrid(); return freeAt(px, py); },
      // Le sol a changé (un rocher cassé) : la grille des cases libres est refaite.
      regrid() { buildGrid(); },
      // Double appui sur le Poulailler ou l'Étable : il va y ramasser (false : rien à prendre).
      collect,
      // Où il est (pour la bulle « +x ») : ses pieds, ou null s'il n'est pas sur la carte.
      // Le même objet tant qu'il n'a pas bougé (demandé plusieurs fois par image) ; un nouveau
      // dès qu'il bouge : celui qu'un appelant a gardé ne change jamais sous lui.
      pos: () => {
        if (!shown || home) return null;
        if (!lastPos || lastPos.x !== x || lastPos.y !== y) lastPos = { x, y };
        return lastPos;
      },
      destroy() { endMeal(); s.destroy(); if (selle) selle.destroy(); if (inside.s) inside.s.destroy(); if (inside.drap) inside.drap.destroy(); zs.forEach((z) => z.destroy()); holds.clear(); },
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
