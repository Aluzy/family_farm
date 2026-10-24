/* fermier.js — le personnage de la carte (version provisoire).
 *
 * Il vit dans le foyer (une pièce close de la ferme générée) : le jour il en sort, se tient
 * devant, et fait sur la carte ce que le joueur vient de faire (labourer, planter, arroser,
 * récolter).
 *
 * Il ne dort que dans son lit. Le soir, il reste dehors jusqu'à ce que le joueur appuie sur
 * « Dormir » (modèle.coucher) : il marche alors jusqu'à son couchage (goHome : une paillasse ou
 * un lit d'une pièce close) et s'y couche, debout entre lui et sa couverture, des « Z » au-dessus
 * de la tête. Quand il dort, o.asleep() : la nuit défile en accéléré (modèle.dort) ; il reste
 * couché jusqu'au réveil.
 *
 * Version 1.18 : il ramasse. Ce qui est produit attend à sa place (modèle.ramasser : une
 * récolte sur sa case, un arbre cueilli, les œufs au Poulailler, le lait et la laine à
 * l'Étable) et n'entre dans l'inventaire que quand il le prend (o.pickup). Une récolte se
 * ramasse au geste même ; le reste, il va le chercher quand le joueur appuie sur sa bulle
 * (fetch). Il ne bouge jamais de lui-même : ni flânerie, ni promenade. À chaque prise, une bulle
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
 * vite ; pendant un geste ou dans un intérieur, il en descend. De même son cheval (modèle.cheval,
 * modèle.chevalVitesse : js/carte/cheval.js), qui passe avant le triporteur.
 *
 * Image : assets/fermier.png (cases de 16 × 32), noms des cases dans assets/fermier.json
 * (scripts/personnage/fermier.py). Sans elles, pas de personnage : rien d'autre ne change.
 * Animations réduites : pas de marche ni de retenue ; il se pose directement où il travaille.
 *
 * API : Fermier.attach(scène, { sheet, frames, world, objects, ground, reduced, resync, pickup, gain })
 *       → { filter(modèle), update(delta, intérieur), fetch(id), goTo(x, y), steer(dir), goHome(done), gather(pied, coup),
 *           pos(), info(), destroy() }
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
  const Z_S = 1.8;               // un « Z » monte pendant ce temps ; trois à la fois
  // Gestes : images (suffixe de la vue), durée de chacune (s), image du coup (la case change).
  const ACTS = {
    labourer: { anim: 'houe', frames: [0, 1, 2, 3, 3], dur: [0.14, 0.16, 0.08, 0.12, 0.18], hit: 3 },
    couper: { anim: 'hache', frames: [0, 1, 1, 2, 3, 3], dur: [0.12, 0.16, 0.1, 0.06, 0.1, 0.24], hit: 4 },
    lancer: { anim: 'peche', frames: [0, 1, 1, 2], dur: [0.25, 0.22, 0.1, 0.2], hit: 3 },
    ferrer: { anim: 'peche', frames: [3, 3, 0], dur: [0.12, 0.4, 0.25], hit: 1 },
    piocher: { anim: 'pioche', frames: [0, 1, 1, 2, 3, 3], dur: [0.12, 0.18, 0.1, 0.06, 0.12, 0.26], hit: 4 },
    faucher: { anim: 'faux', frames: [0, 1, 1, 2, 3, 3], dur: [0.1, 0.16, 0.08, 0.08, 0.12, 0.22], hit: 3 },
    planter: { anim: 'plante', frames: [0, 1, 2, 2], dur: [0.14, 0.16, 0.18, 0.14], hit: 2 },
    arroser: { anim: 'arrose', frames: [0, 1, 2, 1, 2], dur: [0.14, 0.14, 0.2, 0.1, 0.24], hit: 2 },
    recolter: { anim: 'plante', frames: [1, 2, 1, 0], dur: [0.14, 0.2, 0.14, 0.12], hit: 2 },
    ramasse: { anim: 'ramasse', frames: [0, 1, 2, 1, 2, 0], dur: [0.2, 0.2, 0.3, 0.2, 0.3, 0.2], hit: -1 },
    cueille: { anim: 'ramasse', frames: [0, 1, 2, 1, 0], dur: [0.16, 0.18, 0.26, 0.16, 0.16], hit: 3 },
    frigo: { anim: 'frigo', frames: [0, 1, 2, 2, 1, 0], dur: [0.2, 0.25, 0.9, 0.3, 0.25, 0.2], hit: -1 },
    // jeter des fibres dans l'entonnoir de la botteleuse : la brassée contre lui, au-dessus de
    // sa tête, lancée (hit : les brins partent)
    jeter: { anim: 'jette', frames: [0, 1, 1, 2, 2], dur: [0.22, 0.3, 0.18, 0.1, 0.3], hit: 3 },
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
    // Bâtiments (rectangles nommés de la carte), eau, troncs des arbres, pieds des buissons, barrières ; les zones de culture
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
        // les arbres : la case de leur tronc seulement (on passe derrière et à côté, sous le
        // feuillage ; un tronc à cheval sur deux cases, celle de gauche)
        for (const m of g.trees || []) mark(m.x - 1, m.base - 6, m.x, m.base);
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
    let tremble = 0;                // le coup fort qui se charge (0 à 1, voir charge)
    let lastPos = null;             // dernière position donnée par pos()
    const dz = (yy) => (o.depth ? o.depth(yy) : yy);   // sa profondeur (à l'étage : devant son plancher)
    const lift = () => (o.lift ? o.lift() : 0);   // à l'étage : dessiné remonté (au sommet des murs)
    function frame(name) {
      const k = F[name];
      if (k !== undefined) s.setFrame(k);
    }
    // le triporteur (js/carte/triporteur.js) ou le cheval (js/carte/cheval.js) : dehors, quand
    // il marche ou attend, il y est assis et va plus vite (ctx.triporteur, ctx.cheval : le
    // modèle dit qu'il est en selle, et sur quoi) ; pendant un geste, dans un intérieur, il en descend
    const selles = { triporteur: K.triporteur ? K.triporteur(scene) : null, cheval: K.cheval ? K.cheval(scene) : null };
    const monture = () => (ctx.cheval ? 'cheval' : ctx.triporteur ? 'triporteur' : null);
    const cacheSelles = () => { for (const k in selles) if (selles[k]) selles[k].cache(); };
    const ROULE = /^(marche|panier|idle)_(bas|haut|cote)_\d$/;
    let roule = 0, rx = 0, ry = 0;
    const enSelle = () => !!(monture() && selles[monture()] && shown && !home && !where);
    const vitesse = () => (!enSelle() ? 1 : monture() === 'cheval' ? ctx.chevalVitesse || 1 : K.TRIPORTEUR.vitesse);
    let drawn = '';
    function draw(name) {
      drawn = name;
      if (enSelle() && ROULE.test(name)) {
        roule += Math.hypot(x - rx, y - ry);
        for (const k in selles) if (k !== monture() && selles[k]) selles[k].cache();
        const r = selles[monture()].place(x, y, face, flip, roule, alpha);
        frame(r.image);
        s.setPosition(Math.round(x + r.dx), Math.round(y - r.dy - lift())).setFlipX(flip).setDepth(dz(y)).setAlpha(alpha);
      } else {
        cacheSelles();
        frame(name);
        s.setPosition(Math.round(x), Math.round(y - lift())).setFlipX(flip).setDepth(dz(y)).setAlpha(alpha);
        // le coup fort qui se charge : il tremble (d'autant plus que la charge monte)
        if (tremble > 0 && !reduced()) s.x += Math.round((Math.random() * 2 - 1) * (0.6 + tremble));
      }
      rx = x; ry = y;
    }
    function look(dx, dy) {
      ({ face, flip } = K.regard(dx, dy));
    }

    /* ---------- dehors : le foyer, le Poulailler ---------- */

    function door() {
      // la porte de son foyer (la pièce où il dort)
      const f = o.foyer ? o.foyer() : null;
      if (f) return f;
      const r = (o.objects || {}).maison;
      return r ? { x: r.x + r.width / 2, y: r.y + r.height + 6 } : { x: world.w / 2, y: world.h / 2 };
    }
    // Devant le nichoir du Poulailler.
    function coopSpot() {
      return o.cle ? o.cle('poulailler') : null;
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
          // (à l'étage, sans chemin : il ne saute pas hors de l'étage, il reste où il est)
          else if (!path && lift() > 0) path = [];
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
          draw(`marche_${face}_${k}`);
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

    /* ---------- le coup fort (appui maintenu sur lui, un outil en main) ---------- */

    // La charge, de 0 (rien) à 1 (pleine) : il s'arrête, tient l'outil prêt (`pose` : l'image ;
    // une vue de profil seulement : il se tourne de profil) et tremble. 0 : il se relâche.
    function charge(level, pose) {
      tremble = Math.max(0, Math.min(1, level));
      if (tremble <= 0 || (job && job.charge)) return;
      const vue = /_cote_\d$/.test(pose || '') ? 'cote' : face;
      if (vue !== face) { face = vue; }
      job = { charge: true, joueur: true, start() {}, step() { draw(pose ? pose.replace('{vue}', face) : `idle_${face}_0`); return tremble <= 0; } };
      jobs = [];
      idleAge = 0;
    }
    // Un geste sur place (le coup fort de la houe, de la hache sans arbre…), tourné vers `vers`
    // ({ x } : de profil, vers ce point ; rien : comme il est). onHit : au coup.
    function actHere(name, onHit, vers) {
      tremble = 0;
      const prof = vers ? { face: 'cote', flip: vers.x < x } : { face, flip };
      job = null;
      jobs = [act(name, Object.assign(prof, { onHit })), wait(rand(0.4, 0.8))];
      idleAge = 0;
    }
    // Le coup fort de la faux : il tournoie sur lui-même, la lame balaie tout autour (gauche,
    // droite, deux fois). onHit : au milieu du tour.
    function spin(onHit) {
      tremble = 0;
      const pas = [['faux_cote_1', false], ['faux_cote_2', false], ['idle_bas_0', false], ['faux_cote_2', true], ['idle_haut_0', false], ['faux_cote_2', false], ['faux_cote_2', true], ['faux_cote_3', true]];
      let i = 0, t = 0, frappe = false;
      job = null;
      jobs = [{
        joueur: true,
        start() { if (reduced()) { if (onHit) onHit(); i = pas.length; } },
        step(dt) {
          t += dt;
          if (t >= 0.07) { t -= 0.07; i++; }
          if (!frappe && i >= 3) { frappe = true; if (onHit) onHit(); }
          if (i >= pas.length) { face = 'cote'; draw(`idle_${face}_0`); return true; }
          const [n, fl] = pas[i];
          flip = fl;
          face = n.indexOf('_bas_') >= 0 ? 'bas' : n.indexOf('_haut_') >= 0 ? 'haut' : 'cote';
          draw(n);
          return false;
        },
      }, wait(rand(0.4, 0.8))];
      idleAge = 0;
    }

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
      ctx.cheval = !!raw.cheval;
      ctx.chevalVitesse = raw.chevalVitesse || 1;
      ctx.coucher = !!raw.coucher;
      ctx.dort = !!raw.dort;
      pilesNow = new Map((raw.ramasser || []).map((p) => [p.id, p]));
      for (const id of [...claimed]) if (!pilesNow.has(id)) claimed.delete(id);
      if (prevRaw && raw.jour === prevRaw.jour) {
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
    // Devant la mangeoire de l'Étable.
    function barnSpot() {
      return o.cle ? o.cle('etable') : null;
    }
    function treeSpot(c) {
      // (la ferme générée : l'arbre planté sur la case c de la carte)
      const r = (o.objects || {})['arbre_verger_' + (c + 1)] || (o.arbre ? o.arbre(c) : null);
      return r ? { x: Math.round(r.x + r.width / 2 - 12), y: Math.round(r.y + r.height + 2), face: 'cote', flip: false } : null;
    }
    // Version 1.19 : le Poulailler et l'Étable ne se vident pas d'eux-mêmes ; le joueur l'y
    // envoie (double appui sur le bâtiment, ou appui sur sa bulle). Il y va, remplit son panier
    // (o.collect : les œufs ; le lait, et il tond les moutons prêts) : tout entre aussitôt dans
    // l'inventaire (la bulle « +x » monte au-dessus de lui), sans le rapporter à la maison.
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
      const list = [
        walkTo(spot.x, spot.y, { far: true }),
        act('ramasse', { face: 'cote', flip: false }),
        once(() => fillBasket(lieu)),
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
        const v = litVers(lit);
        jobs.push(walkTo(v.x, v.y, { far: true }));
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
      if (passe) return null;
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
      if (passe) return;
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
      draw(d > 0.01 ? `marche_${face}_${Math.floor(steerWalked / STRIDE) % 4}` : `idle_${face}_0`);
    }

    // Il arrive d'une autre carte : il apparaît en (tx, ty) (la case
    // libre la plus proche) et reste là, au lieu de sortir de la maison. `porte` ({ x, y }) : il
    // sort d'une porte (la mine) : il y apparaît, s'éclaire et descend jusqu'en (tx, ty).
    function arrive(tx, ty, porte) {
      const spot = nearestFree(Math.max(0, Math.min(world.w - 1, tx)), Math.max(1, Math.min(world.h - 1, ty)));
      if (!spot) return null;
      passe = false;
      job = null;
      idleAge = 0;
      if (porte && !reduced()) {
        x = porte.x; y = porte.y; face = 'bas'; flip = false;
        shown = false; alpha = 0;
        appear();
        jobs = [glisse(spot.x, spot.y), wait(rand(3, 5))];
        draw(`idle_${face}_0`);
        return spot;
      }
      x = spot.x; y = spot.y; face = porte ? 'bas' : 'cote'; flip = !porte;
      appear();
      jobs = [wait(rand(3, 5))];
      draw(`idle_${face}_0`);
      return spot;
    }

    // Une marche tout droit jusqu'en (tx, ty), sans chercher de chemin : le seuil d'une porte
    // (la mine), qu'il passe en y entrant ou en en sortant.
    function glisse(tx, ty) {
      let walked = 0;
      return {
        start() {},
        step(dt) {
          const dx = tx - x, dy = ty - y, left = Math.hypot(dx, dy);
          const d = Math.min(left, SPEED * 0.6 * dt);
          if (left > 0.01) { x += (dx / left) * d; y += (dy / left) * d; look(dx, dy); }
          walked += d;
          draw(`marche_${face}_${Math.floor(walked / STRIDE) % 4}`);
          return left - d <= 0.3;
        },
      };
    }

    // Il entre par une porte (la mine) : il va devant (`devant`), puis monte jusqu'à la porte
    // (`porte`) en s'effaçant ; `done` quand il a disparu. Pendant ce temps, le doigt ne le
    // dirige plus (passe).
    let passe = false;
    function entre(devant, porte, done) {
      releaseAll(); claimed.clear(); job = null; steer = null;
      passe = true;
      if (reduced()) { x = porte.x; y = porte.y; jobs = []; vanish(); setTimeout(done, 0); return; }
      if (!shown || home) { const d = door(); x = d.x; y = d.y; face = 'bas'; flip = false; appear(); }
      const w = walkTo(devant.x, devant.y, { far: true });
      w.joueur = true;
      jobs = [w, glisse(devant.x, devant.y), once(() => { face = 'haut'; flip = false; vanish(); }), glisse(porte.x, porte.y), wait(FADE_S / 2), once(done)];
      idleAge = 0;
    }

    // « Dormir » : il laisse tout et marche (vite) jusqu'à son couchage (o.couchage : une paillasse,
    // un lit) ; sans couchage, jusqu'à la porte du foyer, où il s'efface. `done` quand il y est.
    function goHome(done) {
      // la ferme générée : il va se coucher sur sa paillasse, dehors (couchage)
      const lit = o.couchage ? o.couchage() : null;
      if (lit) {
        releaseAll(); claimed.clear(); job = null;
        // déjà rentré : il ressort par la porte
        if (!shown || home) { const d = door(); x = d.x; y = d.y + 4; face = 'bas'; flip = false; home = false; where = null; appear(); }
        if (reduced()) { jobs = []; x = lit.x; y = lit.y; couche = { lit, t: 0, slept: false }; setTimeout(done, 0); return; }
        const v = litVers(lit);
        jobs = [walkTo(v.x, v.y, { far: true, hurry: true }), once(() => { couche = { lit, t: 0, slept: false }; }), once(done)];
        idleAge = 0;
        return;
      }
      if (!shown || home) { setTimeout(done, 0); return; }
      const d = door();
      const inside = () => { face = 'haut'; vanish(); home = true; where = 'maison'; };
      releaseAll(); claimed.clear(); job = null;
      if (reduced()) { jobs = []; inside(); setTimeout(done, 0); return; }
      jobs = [walkTo(d.x, d.y, { far: true, hurry: true, max: HOME_MAX }), once(inside), wait(FADE_S), once(done)];
      idleAge = 0;
    }

    // La hache en main, le joueur a touché un arbre : il va se placer à côté du tronc (à
    // gauche, sinon à droite), tourné vers lui, et donne un coup de hache. onHit : au coup.
    // Renvoie false s'il n'y a pas de place près du tronc (onHit est alors appelé tout de suite).
    // `dx` : à quelle distance du pied il se place (un buisson est plus large qu'un tronc).
    function chop(foot, onHit, dx) {
      return strike('couper', foot, dx || 11, onHit);
    }
    // La pioche en main, le joueur a touché un rocher (son pied en `foot`, sa demi-largeur
    // `half`) : il se place à côté, le fer de la pioche tombe sur le rocher.
    function mine(foot, half, onHit) {
      return strike('piocher', foot, Math.max(8, half + 5), onHit);
    }
    // La faux en main, le joueur a touché une touffe d'herbe haute (son pied en `foot`) : il se
    // place à côté, la lame balaie l'herbe à ses pieds.
    function scythe(foot, onHit) {
      return strike('faucher', foot, 7, onHit);
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

    // La botteleuse : il va en `spot` (devant l'entonnoir), tourné vers lui (`face`, `flip`), et
    // y jette ses fibres (onHit : quand elles partent). Renvoie false s'il ne peut pas y aller.
    function jeter(spot, face, flip, onHit) {
      if (!blocked) buildGrid();
      if (!freeAt(spot.x, spot.y)) return false;
      if (job && job.idle) job = null;
      jobs = [walkTo(spot.x, spot.y), act('jeter', { face, flip, onHit }), wait(rand(0.4, 0.8))].concat(jobs.filter((j) => !j.idle));
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

    /* ---------- endormi : le souffle et les « Z » ---------- */

    // La case de celui qui dort depuis `t` s : les yeux fermés (dort_bas_*, les planches
    // d'avant : debout), un souffle lent.
    function dortCase(t) {
      const n = Math.floor(t / (BREATH_S * 2)) % 2;
      return F[`dort_bas_${n}`] !== undefined ? `dort_bas_${n}` : `idle_bas_${n}`;
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

    /* ---------- couché dehors, sur une paillasse (la ferme générée) ---------- */

    // couche = { lit: { x, y (ses pieds), depth, drap: { key, frame, x, y } }, t, slept } : il
    // dort debout entre la paillasse et sa couverture, tourné vers nous, comme dans son lit de
    // la maison ; endormi (ASLEEP_S), la nuit défile.
    let couche = null, drapDehors = null;
    // Où il marche pour aller à son couchage : le couchage lui-même ; à l'étage (lit.via), le pied
    // de l'escalier (il y monte), ou sa case s'il est déjà à l'étage (lit.etage).
    function litVers(lit) {
      if (!lit.via) return lit;
      return lift() > 0 && lit.etage ? lit.etage : lit.via;
    }
    function sleepOutside(dt) {
      const L = couche.lit;
      couche.t += dt;
      x = L.x; y = L.y; face = 'bas'; flip = false;
      if (!shown) appear();
      const k = F[dortCase(couche.t)];
      if (k !== undefined) s.setFrame(k);
      // (L.z : un couchage de l'étage, dont la profondeur a sa propre échelle)
      const z = (k) => (L.z ? L.z(k) : L.depth + k);
      s.setVisible(true).setAlpha(alpha).setFlipX(false).setPosition(L.x, L.y).setDepth(z(0.1));
      if (!drapDehors) drapDehors = scene.add.image(0, 0, L.drap.key, L.drap.frame).setOrigin(0.5, 1);
      if (drapDehors.texture.key !== L.drap.key) drapDehors.setTexture(L.drap.key, L.drap.frame);
      drapDehors.setPosition(L.drap.x, L.drap.y).setDepth(z(0.2)).setVisible(true);
      stepZ(L.x, L.y - 32 + 5, couche.t);
      if (!couche.slept && couche.t >= (reduced() ? 0.8 : ASLEEP_S)) {
        couche.slept = true;
        if (o.asleep && !ctx.dort) o.asleep();
      }
    }
    // Il se lève : à côté de la paillasse, sans couverture ni « Z ».
    function getUpOutside() {
      // (un couchage de l'étage : il se lève en bas de l'escalier, ou sur sa case s'il y est resté)
      const L = couche && couche.lit;
      if (L && L.via) { const v = litVers(L); x = v.x; y = v.y - 4; }
      couche = null;
      if (drapDehors) drapDehors.setVisible(false);
      stepZ(0, 0, -1);
      y += 4;
      idleAge = 0;
    }

    /* ---------- par image ---------- */

    function update(delta) {
      const dt = Math.min(delta, 50) / 1000;
      // (rentré, caché, descendu : plus de triporteur sous lui ; draw le repose s'il roule)
      if (!enSelle() || !s.visible || !ROULE.test(drawn)) cacheSelles();
      // Retenues trop longues (onglet caché, chemin bloqué) : la case se montre.
      if (holds.size) {
        const now = performance.now();
        let changed = false;
        for (const [c, h] of holds) if (now - h.t0 > HOLD_MS) { holds.delete(c); changed = true; }
        if (changed && o.resync) o.resync();
      }
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
      // Le couchage où il est couché (dehors : une paillasse, un lit, à l'étage peut-être), ou null.
      lit: () => (couche ? couche.lit : null),
      info: () => ({ x: Math.round(x), y: Math.round(y), face, shown, home, ou: where, couche: !!couche, jobs: jobs.length + (job ? 1 : 0), dirige: !!steer, retenues: [...holds.keys()], aRamasser: [...pilesNow.keys()], prevus: [...claimed] }),
      // Le joueur a appuyé sur la bulle d'un tas : il va le chercher tout de suite.
      fetch: (id) => fetch(id, true),
      goTo,
      // Au doigt : il marche dans la direction { x, y } ; null : il s'arrête.
      steer: steerTo,
      // Il arrive d'une autre carte, en (x, y) (sorti d'une porte : arrive(x, y, porte)).
      arrive,
      // Il entre par une porte (la mine) : entre(devant, porte, done).
      entre,
      // Il est en train de passer une porte.
      passe: () => passe,
      // Un chemin par les cases libres, de (x0, y0) à (x1, y1) : [{ x, y }…] ou null (pour
      // les autres membres de la famille, js/famille-ferme.js).
      path: (x0, y0, x1, y1) => findPath(x0, y0, x1, y1),
      // Où se tenir pour prendre ce qui attend au Poulailler ou à l'Étable ({ x, y }, ou null).
      lieu: (l) => (l === 'poulailler' ? coopSpot() : l === 'etable' ? barnSpot() : String(l).startsWith('ruche:') && o.cle ? o.cle(l) : null),
      // « Dormir » : il rentre dans la maison (done : il est dedans).
      goHome,
      // La hache : couper l'arbre dont le pied est en `foot` ({ x, y }).
      chop,
      // La pioche : casser le rocher dont le pied est en `foot`, de demi-largeur `half`.
      mine,
      // La faux : faucher la touffe d'herbe haute dont le pied est en `foot`.
      scythe,
      // Le coup fort : la charge (il tremble), un geste sur place, le tournoiement de la faux.
      charge,
      actHere,
      spin,
      // Sa vue et son sens (pour tenir l'outil prêt pendant la charge).
      regard: () => ({ face, flip }),
      // À la main : prendre ce qui est au sol en `foot` (la ferme générée).
      gather,
      // La botteleuse : jeter ses fibres dans l'entonnoir, depuis `spot`.
      jeter,
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
      destroy() { s.destroy(); for (const k in selles) if (selles[k]) selles[k].destroy(); if (drapDehors) drapDehors.destroy(); zs.forEach((z) => z.destroy()); holds.clear(); },
      // Autre planche (le personnage du joueur a changé) : mêmes cases, dans le même ordre.
      setSheet(key) {
        o.sheet = key;
        s.setTexture(key, s.frame ? s.frame.name : 0);
      },
    };
  }

  global.Fermier = { attach };
})(window);
