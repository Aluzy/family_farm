/* ambient-life.js — la vie d'ambiance de la carte (prototype).
 *
 * But : donner l'impression d'un monde vivant pour presque rien en calcul.
 *   - Micro-mouvements procéduraux : ombres de nuages, reflets sur l'eau, et un champ de
 *     vent qui pousse les feuilles qui tombent et les papillons. Les arbres ne bougent pas.
 *   - Événements rares, tirés au sort : papillon, oiseau qui picore puis s'envole,
 *     feuille qui tombe, écureuil qui change d'arbre, lucioles au crépuscule.
 *
 * Règles (voir docs/vie-ambiance.md) :
 *   1. Ce fichier est facultatif : sans lui, farm-stage.js affiche la même carte, immobile.
 *   2. Il ne lit ni l'état du jeu ni le modèle de vue : la scène lui donne l'heure, la
 *      saison et les arbres du Verger (setContext). Il ne déclenche aucune action du jeu.
 *   3. Budget fixe : MAX_ACTORS bêtes à la fois, décisions à 10 Hz, rien hors de la vue,
 *      rien du tout si le joueur a demandé moins d'animations.
 *   4. Aucun tirage au sort par image : la date du prochain événement de chaque type est
 *      tirée une fois, puis seulement comparée à l'horloge.
 *
 * Les bêtes sont dessinées ici, pixel par pixel (aucune image à charger) : ce sont des
 * dessins provisoires, à remplacer par de vraies planches quand elles existeront.
 *
 * API : AmbientLife.attach(scène, { world, map, tiles, objects, lightDepth, reduced })
 *       → { update(dt), setContext({ hour, season, trees }), scare(x, y), spawn(type), stats() }
 */
(function (global) {
  'use strict';

  const T = 16;
  const TICK_MS = 100;      // décisions (événements, reflets) : 10 fois par seconde
  const MAX_ACTORS = 8;     // bêtes et feuilles affichées en même temps, tous types confondus
  const MARGIN = 24;        // px de carte : les bêtes naissent et disparaissent hors de la vue
  const RETRY_S = [2, 5];   // un événement qui n'a pas pu naître est retenté après ce délai
  const SCARE_R = 48;       // px de carte : un appui plus près fait s'envoler les oiseaux

  // Événements : `gap` = secondes entre deux naissances (tirées une fois, voir arm()),
  // `max` = nombre à la fois, `when` = conditions (c = contexte : heure, saison, jour…),
  // `rate` = facteur sur `gap` selon le contexte. Ajouter un événement = une ligne ici et
  // une fonction dans MAKERS.
  const EVENTS = {
    papillon: { gap: [7, 20], max: 3, when: (c) => c.day && c.season !== 'hiver' },
    oiseau: { gap: [14, 38], max: 2, when: (c) => c.day },
    feuille: { gap: [6, 16], max: 3, when: (c) => c.season !== 'hiver', rate: (c) => (c.season === 'automne' ? 0.3 : 1) },
    ecureuil: { gap: [45, 120], max: 1, when: (c) => c.day && c.season !== 'hiver' },
    lucioles: { gap: [8, 22], max: 2, when: (c) => c.dusk && (c.season === 'printemps' || c.season === 'ete') },
  };

  // Dessins : une lettre = un pixel (voir PALETTE), « . » = vide.
  const PALETTE = { w: '#ffffff', k: '#2a1c14', b: '#7a5637', d: '#4f3622', c: '#e2cfa8', y: '#e8a531', r: '#a9572b', t: '#cf8443' };
  const ART = {
    pap0: ['w.k.w', 'wwkww', '.wkw.'],
    pap1: ['..k..', '.wkw.', '..k..'],
    ois_sol: ['....bb.', '...bkby', '.bbbbc.', 'dbbbcc.', '.dbcc..', '..k.k..'],
    ois_pic: ['.......', '.bbb...', 'dbbbbb.', '.dbccbb', '..ccbky', '..k.k..'],
    ois_vol0: ['.d...d.', '.dd.bb.', '..dbkby', '.bbbbc.', 'dbbcc..', '.......'],
    ois_vol1: ['....bb.', '...bkby', '.bbbbc.', 'dbdcc..', '.ddd...', '..d....'],
    ecu0: ['tt......', 'ttt..rr.', '.ttrrrkr', '..rrrrr.', '..rccr..', '.r...r..'],
    ecu1: ['........', 'tt...rr.', 'ttttrrkr', '.trrrrr.', '..rcc...', 'r.....r.'],
    feu0: ['.w.', 'ww.'],
    feu1: ['ww.', '.w.'],
    eclat: ['.w.', 'www', '.w.'],
    luc: ['w'],
  };
  const BUTTERFLY_TINTS = [0xffffff, 0xffe680, 0xffb86b, 0xbfe3ff, 0xf7b6d2];
  const LEAF_TINTS = {
    printemps: [0x8fc46a, 0xb5d67a], ete: [0x7fb85e, 0xa9cf6c], automne: [0xe0a13a, 0xc9662a, 0xb5482a], hiver: [0x9a8f7a],
  };

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[(Math.random() * list.length) | 0];
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  // Vent : deux ondes qui traversent la carte d'ouest en est, modulées par une rafale lente.
  // Renvoie -1…1 ; les feuilles qui tombent et les papillons lisent tous ce même vent.
  function windAt(x, y, t) {
    const gust = 0.5 + 0.5 * Math.sin(t * 0.13 + 1.7) * Math.sin(t * 0.071);
    const wave = 0.6 * Math.sin(x * 0.012 + y * 0.004 - t * 0.9) + 0.4 * Math.sin(x * 0.031 - t * 1.7 + 2.1);
    return wave * (0.35 + 0.65 * gust);
  }

  function attach(scene, options) {
    const P = global.Phaser;
    const o = options || {};
    const world = o.world || { w: 1152, h: 912 };
    const reduced = o.reduced || (() => false);
    const LIGHT = o.lightDepth || 1e6;
    const SHADOW_DEPTH = LIGHT - 3;   // ombres de nuages : sur tout, sous ce qui vole
    const FLY_DEPTH = LIGHT - 2;      // ce qui vole passe devant les bâtiments, sous le voile de lumière

    const ctx = { hour: null, season: 'printemps', day: true, dusk: false };
    const actors = [];
    const next = {};                  // type d'événement → date (s) de la prochaine naissance
    let t = 0;                        // horloge de l'ambiance, en secondes (s'arrête avec la scène)
    let acc = 0;
    let on = false;
    let trees = [];                   // images des arbres du Verger (immobiles) : feuilles et écureuils en partent
    let clouds = [];
    let sparks = [];

    /* ---------- textures : dessinées ici, redessinées si le navigateur les vide ---------- */

    const painters = [];
    function canvasTexture(key, w, h, draw) {
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const tex = scene.textures.createCanvas(key, w, h);
      const paint = () => { const c = tex.getContext(); c.clearRect(0, 0, w, h); draw(c); tex.refresh(); };
      paint();
      painters.push(paint);
      const el = tex.getSourceImage();
      if (el && el.addEventListener) el.addEventListener('contextrestored', paint);
      return tex;
    }
    const repaint = () => painters.forEach((p) => p());
    // Même précaution que pour le fond de la carte (voir repairGround dans farm-stage.js).
    const R = scene.game.renderer;
    const RE = P.Renderer && P.Renderer.Events;
    if (R && R.on) R.on((RE && RE.RESTORE_WEBGL) || 'restorewebgl', repaint);

    // Une seule planche pour toutes les bêtes : un seul lot de dessin pour la carte graphique.
    const slots = {};
    let sx = 1, sy = 1, rowH = 0;
    for (const [name, rows] of Object.entries(ART)) {
      const w = rows[0].length, h = rows.length;
      if (sx + w + 1 > 64) { sx = 1; sy += rowH + 1; rowH = 0; }
      slots[name] = { x: sx, y: sy, w, h, rows };
      sx += w + 1; rowH = Math.max(rowH, h);
    }
    const sheet = canvasTexture('amb', 64, 32, (c) => {
      for (const s of Object.values(slots)) {
        s.rows.forEach((row, j) => {
          for (let i = 0; i < row.length; i++) {
            if (row[i] === '.') continue;
            c.fillStyle = PALETTE[row[i]];
            c.fillRect(s.x + i, s.y + j, 1, 1);
          }
        });
      }
    });
    for (const [name, s] of Object.entries(slots)) sheet.add(name, 0, s.x, s.y, s.w, s.h);
    // Ombre de nuage : quelques ovales fondus, agrandis ensuite en gros pixels.
    canvasTexture('amb_nuage', 48, 28, (c) => {
      c.fillStyle = '#ffffff';
      for (const e of [[16, 15, 13, 8], [28, 12, 14, 9], [34, 17, 11, 7], [22, 19, 12, 6]]) {
        c.beginPath(); c.ellipse(e[0], e[1], e[2], e[3], 0, 0, Math.PI * 2); c.fill();
      }
    });

    const sprite = (x, y, frame) => scene.add.image(x, y, 'amb', frame);

    /* ---------- lecture de la carte : eau, arbres, endroits occupés ---------- */

    // Cases d'eau : la tuile la plus haute de la case est bleue (couleur moyenne de la tuile
    // dans la planche). Arbres isolés : dans les couches dont le nom contient « tree » ou
    // « arbre », un groupe de tuiles de 3 à 5 de large et 4 à 6 de haut. Rien n'est écrit en
    // dur : redessiner la carte dans Tiled suffit.
    const water = [];
    const mapTrees = [];              // { x, base (y du pied), top (y du haut du feuillage), r }
    (function readMap() {
      const raw = o.map;
      if (!raw || !Array.isArray(raw.layers)) return;
      const W = raw.width, H = raw.height;
      const layers = raw.layers.filter((l) => l.type === 'tilelayer' && l.visible !== false && Array.isArray(l.data));
      const set = (raw.tilesets || [])[0];
      const img = o.tiles && scene.textures.exists(o.tiles) ? scene.textures.get(o.tiles).getSourceImage() : null;
      if (set && img) {
        try {
          const cols = set.columns || Math.floor(img.width / T);
          const c = document.createElement('canvas');
          c.width = img.width; c.height = img.height;
          const g = c.getContext('2d', { willReadFrequently: true });
          g.drawImage(img, 0, 0);
          const px = g.getImageData(0, 0, img.width, img.height).data;
          const blue = new Map();     // numéro de tuile → 1 (eau), 0 (autre chose, opaque), -1 (trop transparente pour compter)
          const kind = (gid) => {
            if (blue.has(gid)) return blue.get(gid);
            const n = gid - set.firstgid, x0 = (n % cols) * T, y0 = Math.floor(n / cols) * T;
            let r = 0, b = 0, count = 0;
            for (let y = y0; y < y0 + T; y += 2) {
              for (let x = x0; x < x0 + T; x += 2) {
                const i = (y * img.width + x) * 4;
                if (px[i + 3] > 200) { r += px[i]; b += px[i + 2]; count++; }
              }
            }
            const k = count < 50 ? -1 : (b / count >= 120 && b / count > r / count + 40 ? 1 : 0);
            blue.set(gid, k);
            return k;
          };
          for (let i = 0; i < W * H; i++) {
            let top = 0;
            for (const l of layers) { const gid = l.data[i] & 0x0fffffff; if (gid) { const k = kind(gid); if (k >= 0) top = k; } }
            if (top === 1) water.push({ x: (i % W) * T, y: Math.floor(i / W) * T });
          }
        } catch (e) { /* planche illisible : pas de reflets, rien d'autre ne change */ }
      }
      for (const l of layers) {
        if (!/tree|arbre/i.test(l.name || '') || /top|haut/i.test(l.name || '')) continue;
        const seen = new Uint8Array(W * H);
        for (let i = 0; i < W * H; i++) {
          if (seen[i] || !(l.data[i] & 0x0fffffff)) continue;
          let x0 = W, x1 = 0, y0 = H, y1 = 0;
          const stack = [i], cells = [];
          seen[i] = 1;
          while (stack.length) {
            const j = stack.pop(), x = j % W, y = (j / W) | 0;
            cells.push(j);
            if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
            for (const k of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, j - W, j + W]) {
              if (k >= 0 && k < W * H && !seen[k] && (l.data[k] & 0x0fffffff)) { seen[k] = 1; stack.push(k); }
            }
          }
          const w = x1 - x0 + 1, h = y1 - y0 + 1;
          if (w < 3 || w > 5 || h < 4 || h > 6) continue;
          // Pied du tronc : milieu des tuiles de la rangée du bas.
          const foot = cells.filter((j) => ((j / W) | 0) === y1).map((j) => j % W);
          const fx = (Math.min(...foot) + Math.max(...foot) + 1) / 2 * T;
          mapTrees.push({ x: fx, base: (y1 + 1) * T - 3, top: y0 * T, r: w * T * 0.3 });
        }
      }
    })();

    // Rectangles nommés de la carte (bâtiments, zones de culture, arbres du Verger) : un
    // oiseau ne se pose pas dedans.
    const blocked = Object.values(o.objects || {}).filter((r) => r && r.width && r.height);
    const waterSet = new Set(water.map((c) => c.x + ',' + c.y));
    function freeAt(x, y) {
      if (x < 8 || y < 8 || x > world.w - 8 || y > world.h - 8) return false;
      if (waterSet.has(Math.floor(x / T) * T + ',' + Math.floor(y / T) * T)) return false;
      for (const r of blocked) if (x > r.x - 8 && x < r.x + r.width + 8 && y > r.y - 8 && y < r.y + r.height + 8) return false;
      for (const m of mapTrees) if (Math.abs(x - m.x) < m.r + 10 && y > m.top && y < m.base + 4) return false;
      return true;
    }

    /* ---------- vue ---------- */

    const view = () => {
      const v = scene.cameras.main.worldView;
      return v.width ? v : { x: 0, y: 0, width: world.w, height: world.h };
    };
    const inView = (x, y, pad) => {
      const v = view();
      return x >= v.x - pad && x <= v.x + v.width + pad && y >= v.y - pad && y <= v.y + v.height + pad;
    };
    function freeSpot() {
      const v = view();
      for (let i = 0; i < 10; i++) {
        const x = v.x + rand(0.1, 0.9) * v.width, y = v.y + rand(0.25, 0.9) * v.height;
        if (freeAt(x, y)) return { x, y };
      }
      return null;
    }
    // Arbres visibles où une bête peut grimper ou d'où une feuille peut tomber : ceux de la
    // carte et les arbres adultes du Verger.
    function trunks() {
      const list = mapTrees.slice();
      for (const s of trees) {
        if (s.active && s.scaleX >= 1) list.push({ x: s.x, base: s.y - 2, top: s.y - s.displayHeight * 0.92, r: s.displayWidth * 0.27 });
      }
      return list.filter((m) => inView(m.x, (m.base + m.top) / 2, -8));
    }

    /* ---------- les bêtes : chacune est une petite machine à états ---------- */
    // Une bête = { type, sprites, step(dt) } ; step renvoie false quand elle a fini.

    const MAKERS = {
      // Traverse la vue en zigzaguant, poussé par le vent ; se pose une fois en chemin.
      papillon() {
        const v = view();
        const dir = Math.random() < 0.5 ? 1 : -1;
        let x = dir > 0 ? v.x - MARGIN : v.x + v.width + MARGIN;
        let base = v.y + rand(0.15, 0.85) * v.height;
        const s = sprite(x, base, 'pap0').setDepth(FLY_DEPTH).setTint(pick(BUTTERFLY_TINTS)).setFlipX(dir < 0);
        const speed = rand(14, 24), f = rand(1.1, 1.9), amp = rand(8, 18), ph = rand(0, 6.28), drift = rand(-4, 4);
        let age = 0, restAt = rand(3, 9), rest = 0;
        return {
          sprites: [s],
          step(dt) {
            age += dt;
            if (rest > 0) {                      // posé : les ailes battent lentement
              rest -= dt;
              s.setFrame(((age * 2.5) | 0) % 2 ? 'pap1' : 'pap0');
              return true;
            }
            if (restAt > 0 && age > restAt) {
              if (freeAt(x, s.y)) { rest = rand(1.2, 2.6); restAt = -1; s.setDepth(s.y); return true; }
              restAt += 1;                       // au-dessus de l'eau ou d'un toit : il continue
            }
            s.setDepth(FLY_DEPTH);
            x += (dir * speed + windAt(x, base, t) * 10) * dt;
            base += drift * dt;
            s.setPosition(x, base + Math.sin(age * f + ph) * amp + Math.sin(age * 5.3) * 2);
            s.setFrame(((age * 9) | 0) % 2 ? 'pap1' : 'pap0');
            return inView(x, s.y, MARGIN * 2);
          },
        };
      },

      // Arrive en vol, se pose, picore et sautille, puis repart ; s'envole si on appuie près de lui.
      oiseau() {
        const spot = freeSpot();
        if (!spot) return null;
        const v = view();
        const dir = Math.random() < 0.5 ? 1 : -1;
        const from = { x: dir > 0 ? v.x - MARGIN : v.x + v.width + MARGIN, y: Math.max(v.y - MARGIN, spot.y - rand(70, 130)) };
        const s = sprite(from.x, from.y, 'ois_vol0').setOrigin(0.5, 1).setDepth(FLY_DEPTH).setFlipX(dir < 0);
        let state = 'arrive', age = 0, x = from.x, y = from.y, face = dir;
        let stay = rand(6, 14), wait = rand(0.4, 1), hop = null, pecks = 0;
        const leave = () => { if (state === 'part') return; state = 'part'; age = 0; face = Math.random() < 0.5 ? 1 : -1; s.setDepth(FLY_DEPTH); };
        return {
          sprites: [s],
          scare(px, py) { if (state !== 'part' && Math.hypot(px - x, py - y) < SCARE_R) leave(); },
          step(dt) {
            age += dt;
            if (state === 'arrive') {
              const k = clamp01(age / 1.4), e = 1 - (1 - k) * (1 - k);
              x = from.x + (spot.x - from.x) * e; y = from.y + (spot.y - from.y) * e;
              s.setFrame(((age * 10) | 0) % 2 ? 'ois_vol1' : 'ois_vol0');
              if (k >= 1) { state = 'sol'; age = 0; s.setFrame('ois_sol').setDepth(y); }
            } else if (state === 'sol') {
              if (hop) {                          // petit saut en cloche
                hop.k += dt / 0.22;
                const k = clamp01(hop.k);
                x = hop.x0 + hop.dx * k; y = hop.y0 + hop.dy * k;
                s.setPosition(x, y - Math.sin(k * Math.PI) * 3);
                if (k >= 1) { hop = null; s.setDepth(y); }
                return true;
              }
              wait -= dt;
              if (pecks > 0 && wait <= 0) { pecks--; wait = 0.16; s.setFrame(s.frame.name === 'ois_pic' ? 'ois_sol' : 'ois_pic'); }
              else if (wait <= 0) {
                s.setFrame('ois_sol');
                if (age > stay || !inView(x, y, MARGIN)) leave();
                else if (Math.random() < 0.45) {
                  const dx = rand(5, 11) * (Math.random() < 0.5 ? -1 : 1), dy = rand(-4, 4);
                  if (freeAt(x + dx, y + dy)) { hop = { x0: x, y0: y, dx, dy, k: 0 }; face = dx > 0 ? 1 : -1; s.setFlipX(face < 0); }
                  wait = rand(0.3, 0.9);
                } else { pecks = 2 * ((rand(1, 4)) | 0); wait = 0.1; }
              }
            } else {                              // 'part' : monte en accélérant
              const sp = 40 + age * 140;
              x += face * sp * dt; y -= sp * 0.75 * dt;
              s.setFlipX(face < 0).setFrame(((age * 12) | 0) % 2 ? 'ois_vol1' : 'ois_vol0');
              if (!inView(x, y, MARGIN * 2)) return false;
            }
            s.setPosition(x, y);
            return true;
          },
        };
      },

      // Tombe d'un feuillage en se balançant, poussée par le vent, puis s'efface au sol.
      feuille() {
        const list = trunks();
        if (!list.length) return null;
        const tree = pick(list);
        let x = tree.x + rand(-1, 1) * tree.r, y = tree.top + (tree.base - tree.top) * rand(0.25, 0.5);
        const ground = tree.base + rand(-2, 8);
        const s = sprite(x, y, 'feu0').setDepth(ground + 1).setTint(pick(LEAF_TINTS[ctx.season] || LEAF_TINTS.printemps)).setAlpha(0);
        const fall = rand(9, 14), ph = rand(0, 6.28);
        let age = 0, landed = 0;
        return {
          sprites: [s],
          step(dt) {
            age += dt;
            if (landed) { landed += dt; s.setAlpha(clamp01(2.4 - landed)); return landed < 2.4; }
            y += fall * dt;
            x += (windAt(x, y, t) * 9 + Math.cos(age * 3 + ph) * 7) * dt;
            s.setPosition(x, y).setAlpha(clamp01(age * 4)).setFrame(((age * 3 + ph) | 0) % 2 ? 'feu1' : 'feu0');
            if (y >= ground) landed = 0.001;
            return true;
          },
        };
      },

      // Descend d'un arbre, court jusqu'à un autre en s'arrêtant une fois, y grimpe.
      ecureuil() {
        const list = trunks();
        if (list.length < 2) return null;
        const a = pick(list);
        const others = list.filter((m) => m !== a && Math.hypot(m.x - a.x, m.base - a.base) > 30 && Math.hypot(m.x - a.x, m.base - a.base) < 260);
        if (!others.length) return null;
        const b = pick(others);
        const CLIMB = 20;                         // px de tronc parcourus avant de disparaître dans le feuillage
        const s = sprite(a.x, a.base - CLIMB, 'ecu0').setDepth(a.base + 1).setAngle(90).setAlpha(0);
        const dist = Math.hypot(b.x - a.x, b.base - a.base), speed = rand(50, 65);
        let state = 'descend', age = 0, run = 0, pauseAt = rand(0.3, 0.7), pause = 0;
        return {
          sprites: [s],
          step(dt) {
            age += dt;
            if (state === 'descend') {
              const k = clamp01(age / 0.8);
              s.setPosition(a.x, a.base - CLIMB * (1 - k)).setAlpha(clamp01(k * 3)).setFrame(((age * 10) | 0) % 2 ? 'ecu1' : 'ecu0');
              if (k >= 1) { state = 'court'; age = 0; s.setAngle(0).setFlipX(b.x < a.x); }
            } else if (state === 'court') {
              if (pause > 0) { pause -= dt; s.setFrame('ecu0'); return true; }   // aux aguets
              run += (speed * dt) / dist;
              if (pauseAt > 0 && run >= pauseAt) { pause = rand(0.5, 1.1); pauseAt = -1; }
              const k = clamp01(run);
              const x = a.x + (b.x - a.x) * k, y = a.base + (b.base - a.base) * k;
              s.setPosition(x, y - Math.abs(Math.sin(age * 11)) * 2).setDepth(y + 1).setFrame(((age * 11) | 0) % 2 ? 'ecu1' : 'ecu0');
              if (k >= 1) { state = 'grimpe'; age = 0; s.setFlipX(false).setAngle(-90).setDepth(b.base + 1); }
            } else {
              const k = clamp01(age / 0.7);
              s.setPosition(b.x, b.base - CLIMB * k).setAlpha(clamp01((1 - k) * 3)).setFrame(((age * 10) | 0) % 2 ? 'ecu1' : 'ecu0');
              if (k >= 1) return false;
            }
            return true;
          },
        };
      },

      // Quelques points lumineux qui tournent et clignotent, au-dessus du voile de lumière.
      lucioles() {
        const c = freeSpot();
        if (!c) return null;
        const flies = [];
        for (let i = 0; i < 5; i++) {
          flies.push({
            s: sprite(c.x, c.y, 'luc').setDepth(LIGHT + 1).setBlendMode(P.BlendModes.ADD).setTint(0xe6ff7a).setScale(i % 2 ? 1 : 1.5).setAlpha(0),
            rx: rand(10, 30), ry: rand(6, 18), fx: rand(0.25, 0.6), fy: rand(0.3, 0.7), fb: rand(1.2, 2.4), ph: rand(0, 6.28),
          });
        }
        const life = rand(14, 24);
        let age = 0;
        return {
          sprites: flies.map((f) => f.s),
          step(dt) {
            age += dt;
            const env = clamp01(Math.min(age, life - age) / 1.5);
            for (const f of flies) {
              const blink = Math.max(0, Math.sin(age * f.fb + f.ph));
              f.s.setPosition(c.x + Math.sin(age * f.fx + f.ph) * f.rx, c.y - 6 + Math.cos(age * f.fy + f.ph * 2) * f.ry).setAlpha(env * blink * blink);
            }
            return age < life && ctx.dusk;
          },
        };
      },
    };

    /* ---------- ordonnanceur ---------- */

    // Tire la date de la prochaine naissance d'un type (une seule fois, pas à chaque image).
    function arm(type, soon) {
      const e = EVENTS[type];
      const k = (e.rate ? e.rate(ctx) : 1) * (soon ? 0.35 : 1);
      next[type] = t + rand(e.gap[0], e.gap[1]) * k;
    }
    const count = (type) => actors.reduce((n, a) => n + (a.type === type ? 1 : 0), 0);

    function spawn(type, force) {
      const e = EVENTS[type];
      if (!e || !MAKERS[type]) return false;
      if (!force && (actors.length >= MAX_ACTORS || count(type) >= e.max || !e.when(ctx))) return false;
      const a = MAKERS[type]();
      if (!a) return false;                       // pas d'endroit convenable dans la vue
      a.type = type;
      actors.push(a);
      return true;
    }

    function tick(dt) {
      for (const type in EVENTS) {
        if (t < next[type]) continue;
        if (spawn(type)) arm(type); else next[type] = t + rand(RETRY_S[0], RETRY_S[1]);
      }
      // Rien hors de la vue : une bête que le joueur a laissée derrière lui en faisant glisser
      // la carte est retirée, et rend sa place dans le budget.
      for (let i = actors.length - 1; i >= 0; i--) {
        const s = actors[i].sprites[0];
        if (!inView(s.x, s.y, MARGIN * 3)) { actors[i].sprites.forEach((q) => q.destroy()); actors.splice(i, 1); }
      }
      // Reflets sur l'eau : chacun s'allume un instant sur une case d'eau visible.
      for (const k of sparks) {
        if (k.life > 0) {
          k.life -= dt;
          k.s.setAlpha(k.life > 0 ? Math.sin(Math.PI * clamp01(k.life / k.span)) * 0.85 : 0);
        } else if (t >= k.next) {
          k.next = t + rand(0.5, 2.4);
          for (let i = 0; i < 6; i++) {
            const c = pick(water);
            if (!inView(c.x, c.y, 0)) continue;
            k.s.setPosition(c.x + 2 + ((Math.random() * 12) | 0), c.y + 2 + ((Math.random() * 12) | 0));
            k.life = k.span = rand(0.5, 0.9);
            break;
          }
        }
      }
      // Ombres de nuages : seulement en plein jour, et elles s'effacent doucement.
      const want = ctx.day ? 0.12 : 0;
      for (const c of clouds) { if (c.s.alpha !== want) c.s.setAlpha(Math.abs(c.s.alpha - want) < 0.01 ? want : c.s.alpha + (want - c.s.alpha) * 0.08); }
    }

    function start() {
      on = true;
      for (const type in EVENTS) arm(type, true);
      for (let i = 0; i < 3; i++) {
        const s = scene.add.image(rand(0, world.w), rand(0, world.h), 'amb_nuage').setDepth(SHADOW_DEPTH).setTint(0x0b1d2e).setAlpha(0).setScale(rand(4, 6.5), rand(4, 6));
        clouds.push({ s, v: rand(7, 12) });
      }
      for (let i = 0; water.length && i < 4; i++) sparks.push({ s: sprite(0, 0, 'eclat').setDepth(1).setAlpha(0), life: 0, span: 1, next: rand(0, 2) });
    }

    // Tout enlever (le joueur vient de demander moins d'animations).
    function stop() {
      on = false;
      for (const a of actors) a.sprites.forEach((s) => s.destroy());
      actors.length = 0;
      clouds.forEach((c) => c.s.destroy()); clouds = [];
      sparks.forEach((k) => k.s.destroy()); sparks = [];
    }

    /* ---------- API ---------- */

    function update(delta) {
      if (reduced()) { if (on) stop(); return; }
      if (!on) start();
      const dt = Math.min(delta, 50) / 1000;
      t += dt;
      acc += dt * 1000;
      if (acc >= TICK_MS) { tick(acc / 1000); acc = 0; }
      // Par image : seulement ce qui se déplace (8 bêtes au plus, 3 ombres).
      for (let i = actors.length - 1; i >= 0; i--) {
        const a = actors[i];
        if (a.step(dt) === false) { a.sprites.forEach((s) => s.destroy()); actors.splice(i, 1); }
      }
      for (const c of clouds) {
        const half = c.s.displayWidth / 2;
        let x = c.s.x + c.v * dt;
        if (x - half > world.w) { x = -half; c.s.y = rand(0, world.h); }
        c.s.x = x;
      }
    }

    // La scène dit l'heure (0 à 24), la saison et les images des arbres du Verger.
    function setContext(c) {
      if (c.season) ctx.season = c.season;
      if ('hour' in c) {
        ctx.hour = c.hour;
        const h = c.hour == null ? 12 : c.hour;
        ctx.day = h >= 6.5 && h < 19.5;
        ctx.dusk = h >= 19.75 || h < 5;
      }
      if (c.trees) trees = c.trees.slice();
    }

    function scare(x, y) { for (const a of actors) if (a.scare) a.scare(x, y); }

    function stats() {
      const by = {};
      for (const a of actors) by[a.type] = (by[a.type] || 0) + 1;
      return { on, actors: actors.length, by, water: water.length, mapTrees: mapTrees.length, orchard: trees.length, clock: t, next: Object.assign({}, next) };
    }

    return { update, setContext, scare, stats, spawn: (type) => spawn(type, true), wind: (x, y) => windAt(x, y, t), repaint };
  }

  global.AmbientLife = { attach, EVENTS };
})(window);
