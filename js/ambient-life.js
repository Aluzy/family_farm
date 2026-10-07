/* ambient-life.js — la vie d'ambiance de la carte (prototype).
 *
 * But : donner l'impression d'un monde vivant pour presque rien en calcul.
 *   - Micro-mouvements procéduraux : ombres de nuages, et un champ de
 *     vent qui pousse les feuilles qui tombent et les papillons. Les arbres ne bougent pas.
 *   - Événements rares, tirés au sort : papillon, oiseau qui picore puis s'envole,
 *     feuille qui tombe, écureuil qui change d'arbre, lucioles au crépuscule.
 *   - Un habitant : le chat, qui enchaîne ses activités au hasard (tirage pondéré) et dort
 *     la nuit sur son toit.
 *   - Le troupeau de l'Étable : les portes s'ouvrent à 7 h, les bêtes sortent dans l'enclos,
 *     broutent, se couchent, et rentrent à 20 h.
 *
 * Règles (voir docs/vie-ambiance.md) :
 *   1. Ce fichier est facultatif : sans lui, farm-stage.js affiche la même carte, immobile.
 *   2. Il ne lit ni l'état du jeu ni le modèle de vue : la scène lui donne l'heure, la
 *      saison, les arbres du Verger, l'image de l'Étable et le nombre de bêtes du troupeau
 *      (setContext). Il ne déclenche aucune action du jeu.
 *   3. Budget fixe : MAX_ACTORS bêtes à la fois, décisions à 10 Hz, rien hors de la vue,
 *      rien du tout si le joueur a demandé moins d'animations.
 *   4. Aucun tirage au sort par image : la date du prochain événement de chaque type est
 *      tirée une fois, puis seulement comparée à l'horloge.
 *
 * Les bêtes de passage sont dessinées ici, pixel par pixel (aucune image à charger) : ce
 * sont des dessins provisoires, à remplacer par de vraies planches quand elles existeront.
 * Le chat et la vache ont déjà la leur (assets/chat.png, assets/vache.png, chargées par
 * farm-stage.js).
 *
 * API : AmbientLife.attach(scène, { world, map, tiles, objects, lightDepth, reduced, cat, herd })
 *       → { update(dt), setContext({ hour, season, trees, barn, herd }), scare(x, y),
 *           spawn(type), stats(), chat(activité) }
 */
(function (global) {
  'use strict';

  const T = 16;
  const TICK_MS = 100;      // décisions (événements) : 10 fois par seconde
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
    luc: ['w'],
  };
  const BUTTERFLY_TINTS = [0xffffff, 0xffe680, 0xffb86b, 0xbfe3ff, 0xf7b6d2];
  const LEAF_TINTS = {
    printemps: [0x8fc46a, 0xb5d67a], ete: [0x7fb85e, 0xa9cf6c], automne: [0xe0a13a, 0xc9662a, 0xb5482a], hiver: [0x9a8f7a],
  };

  // Le chat. Ce n'est pas un événement : il habite la carte, de jour comme de nuit, et il a sa
  // vraie planche (assets/chat.png, chargée par farm-stage.js). Voir docs/vie-ambiance.md.
  // CAT_FRAMES = ordre des cases de 16×16 de la planche (profil droit, pattes sur la dernière
  // rangée ; le profil gauche est le même, retourné).
  const CAT_FRAMES = ['idle', 'marche0', 'marche1', 'assis', 'leche', 'couche', 'boule0', 'boule1'];
  // Ce qu'il peut faire après chaque activité, avec un poids : la suite est tirée une fois, à
  // la fin de l'activité. Ajouter une activité = une ligne ici, une durée dans CAT_TIME (ou
  // une allure dans CAT_WALK) et son image dans step().
  const CAT_NEXT = {
    debout: { marche: 6, assis: 2, couche: 1, course: 1 },
    marche: { debout: 3, marche: 3, assis: 2, course: 1 },
    course: { debout: 3, marche: 1 },
    assis: { toilette: 3, debout: 4, couche: 2 },
    toilette: { debout: 3, assis: 2, couche: 1 },
    couche: { debout: 3, assis: 2, sieste: 2 },
    sieste: { couche: 1 },
  };
  // Durée d'une activité sur place, en secondes, tirée à son début (une heure du jeu dure 18 s).
  const CAT_TIME = { debout: [0.6, 2.4], assis: [3, 9], toilette: [2.5, 6], couche: [5, 14], sieste: [10, 25] };
  // Déplacements : vitesse (px par seconde), longueur (en tuiles), pas (px parcourus par image).
  const CAT_WALK = {
    marche: { speed: [13, 19], tiles: [2, 6], stride: 3.2 },
    course: { speed: [50, 70], tiles: [5, 10], stride: 6 },
    rentre: { speed: [26, 34], stride: 4 },
  };
  const CAT_AGAIN = 0.3;        // poids de ce qu'il faisait juste avant : il n'y revient pas tout de suite
  const CAT_RANGE = 14 * T;     // son territoire : rayon autour du pied de son toit
  const CAT_ROOF = 'chat_toit'; // objet de la carte (point ou rectangle) où il dort ; sinon le toit de la maison
  const CAT_JUMP_S = 0.55;      // durée du saut sur le toit

  // Le troupeau de l'Étable. Le jeu dit seulement combien de bêtes il y a (setContext) ;
  // l'ambiance ouvre les portes le matin, fait sortir les bêtes dans l'enclos, les fait
  // brouter, et les rentre le soir. Une espèce = une ligne ici et une planche de cases de
  // 32×24 (profil droit, sabots sur la dernière rangée), dans l'ordre de `frames`.
  const HERD = {
    vache: { max: 5, frames: ['idle', 'queue', 'marche0', 'marche1', 'broute0', 'broute1', 'couchee0', 'couchee1'], speed: [7, 10], stride: 2.4, half: 14 },
  };
  // Ce qu'une bête peut faire après chaque activité, avec un poids (comme CAT_NEXT).
  const HERD_NEXT = {
    debout: { broute: 6, marche: 3, couche: 1 },
    marche: { broute: 5, debout: 2 },
    broute: { marche: 3, debout: 2, couche: 1 },
    couche: { debout: 1 },
  };
  const HERD_TIME = { debout: [1.5, 4], broute: [4, 10], couche: [8, 16] };   // secondes
  const HERD_OUT = 7;           // heure à laquelle les portes s'ouvrent et les bêtes sortent
  const HERD_IN = 20;           // heure à laquelle elles rentrent ; les portes se ferment derrière la dernière
  const HERD_PEN = 'enclos';    // rectangle de la carte où elles vivent ; sinon : devant l'Étable
  const HERD_GAP = [1.2, 2.6];  // secondes entre deux bêtes qui passent la porte
  // La porte de l'Étable dans barn_*.png (px de l'image) : deux battants qui coulissent vers
  // l'extérieur et découvrent l'intérieur. Les images de porte entrouverte et ouverte sont
  // fabriquées ici à partir de l'image de l'Étable : aucune image de plus à dessiner.
  const BARN_DOOR = { x: 20, y: 58, w: 64, h: 32, left: 36, right: 52, leaf: 16, top: 59, rows: 30, slide: 14, dark: [28, 70], lintel: [28, 60], step: 0.3 };

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[(Math.random() * list.length) | 0];
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  // Tirage pondéré : { marche: 5, assis: 3 } rend « marche » cinq fois sur huit.
  function pickWeighted(weights) {
    let total = 0;
    for (const k in weights) total += weights[k];
    let r = Math.random() * total;
    for (const k in weights) { r -= weights[k]; if (r < 0) return k; }
    return Object.keys(weights)[0];
  }

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

    /* ---------- textures : dessinées ici, redessinées si le navigateur les vide ---------- */

    const painters = [];
    function canvasTexture(key, w, h, draw) {
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const tex = scene.textures.createCanvas(key, w, h);
      const paint = () => {
        if (!scene.textures.exists(key) || scene.textures.get(key) !== tex) return;   // planche refaite depuis
        const c = tex.getContext(); c.clearRect(0, 0, w, h); draw(c); tex.refresh();
      };
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
    // dans la planche). Elles servent seulement à ce qu'aucune bête ne se pose sur l'eau :
    // l'eau elle-même n'est pas animée ici (la carte aura ses propres images). Arbres isolés : dans les couches dont le nom contient « tree » ou
    // « arbre », un groupe de tuiles de 3 à 5 de large et 4 à 6 de haut. Rien n'est écrit en
    // dur : redessiner la carte dans Tiled suffit.
    const water = [];
    const mapTrees = [];              // { x, base (y du pied), top (y du haut du feuillage), r }
    const wood = new Set();           // cases des couches d'arbres (arbres de toutes tailles, buissons) : le chat les contourne
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
          // Une tuile animée (l'eau de la carte) est jugée sur sa première image.
          const first = new Map();
          for (const tile of set.tiles || []) if (Array.isArray(tile.animation) && tile.animation.length) first.set(tile.id, tile.animation[0].tileid);
          const count0 = set.tilecount || cols * Math.floor(img.height / T);
          const kind = (gid) => {
            if (blue.has(gid)) return blue.get(gid);
            let n = gid - set.firstgid;
            if (n < 0 || n >= count0) { blue.set(gid, -1); return -1; }   // tuile d'une autre planche
            if (first.has(n)) n = first.get(n);
            const x0 = (n % cols) * T, y0 = Math.floor(n / cols) * T;
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
        } catch (e) { /* planche illisible : l'eau n'est pas reconnue, rien d'autre ne change */ }
      }
      for (const l of layers) {
        if (!/tree|arbre/i.test(l.name || '')) continue;
        for (let i = 0; i < W * H; i++) if (l.data[i] & 0x0fffffff) wood.add((i % W) * T + ',' + Math.floor(i / W) * T);
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
    const blocked = Object.entries(o.objects || {}).filter(([name, r]) => name !== CAT_ROOF && r && r.width && r.height).map((e) => e[1]);
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

    /* ---------- le chat : il habite la carte ---------- */
    // Les autres bêtes passent ; lui reste. Le jour, il enchaîne ses activités au hasard
    // (CAT_NEXT) ; à la tombée de la nuit il rentre, saute sur son toit et y dort en boule
    // jusqu'au matin. Comme pour les autres bêtes, tout est tiré au début de chaque activité
    // (durée, destination, vitesse) : rien n'est tiré au sort par image.

    // Son toit : l'objet `chat_toit` de la carte s'il existe, sinon l'appentis de la maison.
    // `foot` = d'où il saute, `depth` = profondeur qui le fait passer devant le bâtiment.
    const catHome = (function () {
      const objs = o.objects || {};
      const spot = objs[CAT_ROOF], house = objs.maison;
      const roof = spot ? { x: spot.x + (spot.width || 0) / 2, y: spot.y + (spot.height || 0) / 2 }
        : house ? { x: house.x + house.width * 0.86, y: house.y + house.height * 0.52 } : null;
      if (!roof) return null;
      const under = blocked.find((r) => roof.x >= r.x && roof.x <= r.x + r.width && roof.y >= r.y && roof.y <= r.y + r.height);
      if (under) {
        const fx = Math.min(under.x + under.width - 6, Math.max(under.x + 6, roof.x));
        return { roof, foot: { x: fx, y: under.y + under.height + 9 }, depth: under.y + under.height + 2 };
      }
      // Toit dessiné dans les tuiles de la carte : il saute du premier endroit libre en dessous.
      for (let y = roof.y + 8; y < roof.y + 6 * T; y += 4) if (freeAt(roof.x, y)) return { roof, foot: { x: roof.x, y }, depth: y };
      return null;
    })();

    // Le trajet en ligne droite est-il libre (ni eau, ni bâtiment, ni arbre, ni buisson) ?
    const catFree = (x, y) => freeAt(x, y) && !wood.has(Math.floor(x / T) * T + ',' + Math.floor(y / T) * T);
    function clearWay(x0, y0, x1, y1) {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8));
      for (let i = 1; i <= n; i++) if (!catFree(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n)) return false;
      return true;
    }
    // Chemin jusqu'à un point : tout droit, sinon en deux temps (d'abord de côté, ou d'abord
    // en hauteur). Faute de mieux, tout droit quand même : il passera derrière ce qui le gêne.
    function wayTo(x0, y0, x1, y1) {
      if (clearWay(x0, y0, x1, y1)) return [{ x: x1, y: y1 }];
      for (const c of [{ x: x1, y: y0 }, { x: x0, y: y1 }]) {
        if (clearWay(x0, y0, c.x, c.y) && clearWay(c.x, c.y, x1, y1)) return [c, { x: x1, y: y1 }];
      }
      return [{ x: x1, y: y1 }];
    }

    let cat = null;
    let catAt = null;                  // où il était quand l'ambiance a été retirée (animations réduites)
    function makeCat() {
      if (!o.cat || !scene.textures.exists(o.cat)) return null;   // pas de planche : pas de chat
      const F = {};
      CAT_FRAMES.forEach((name, i) => { F[name] = i; });
      const centre = catHome ? catHome.foot : { x: world.w / 2, y: world.h / 2 };
      let x = catAt ? catAt.x : centre.x, y = catAt ? catAt.y : centre.y;
      let face = Math.random() < 0.5 ? 1 : -1;
      let st = 'debout', before = null, age = 0, len = rand(0.5, 1.5);   // activité, celle d'avant, son âge, sa durée
      let rise = 0;                    // secondes de la pose de passage (assis) entre couché et debout
      let path = null, speed = 0, stride = 3, walked = 0;
      let night = false;               // il est rentré pour la nuit (ou en chemin)
      let jump = null;                 // saut en cours : { x0, y0, x1, y1 }
      let stirAt = 0, stir = 0;        // sommeil : date du prochain demi-réveil, et ce qu'il en reste
      const breath = rand(1.1, 1.6);   // sommeil : secondes par souffle
      const s = scene.add.image(x, y, o.cat, 0).setOrigin(0.5, 1);
      // Le jeu s'ouvre de nuit ou avant le lever du jour : il dort déjà sur son toit.
      if (catHome && ctx.hour != null && !ctx.day && (ctx.dusk || ctx.hour < 12)) {
        night = true; st = 'dort'; x = catHome.roof.x; y = catHome.roof.y; stirAt = rand(15, 35);
      }

      const low = (n) => n === 'couche' || n === 'sieste';
      const upright = (n) => n === 'debout' || !!CAT_WALK[n];

      function draw(frame, dy, angle) {
        const up = st === 'saute' || st === 'descend' || st === 'dort' || st === 'reveil';
        s.setFrame(F[frame]).setPosition(x, y + (dy || 0)).setFlipX(face < 0).setAngle(angle || 0).setDepth(up ? catHome.depth : y);
      }

      function enter(name) {
        // Entre couché et debout, il passe un instant par la pose assise.
        rise = (low(st) && upright(name)) || (upright(st) && low(name)) ? rand(0.25, 0.45) : 0;
        before = st; st = name; age = 0; walked = 0;
        if (CAT_TIME[name]) len = rand(CAT_TIME[name][0], CAT_TIME[name][1]);
      }

      // Tire une destination à quelques tuiles : libre, atteignable en ligne droite et sur son
      // territoire. `away` (angle) : la direction dans laquelle il fuit.
      function roam(kind, away) {
        const W = CAT_WALK[kind];
        const here = Math.hypot(x - centre.x, y - centre.y);
        for (let i = 0; i < 8; i++) {
          const d = rand(W.tiles[0], W.tiles[1]) * T;
          const a = away == null ? rand(0, 6.283) : away + rand(-0.6, 0.6);
          // Il est dessiné de profil : il se déplace surtout de côté.
          const tx = x + Math.cos(a) * d, ty = y + Math.sin(a) * d * 0.5;
          const there = Math.hypot(tx - centre.x, ty - centre.y);
          if (there > CAT_RANGE && there > here) continue;         // il reste sur son territoire, ou il y revient
          if (!clearWay(x, y, tx, ty)) continue;
          path = [{ x: tx, y: ty }]; speed = rand(W.speed[0], W.speed[1]); stride = W.stride;
          return true;
        }
        return false;
      }

      // Commence une activité ; un déplacement sans destination libre devient une pause.
      function begin(name, away) {
        if ((name === 'marche' || name === 'course') && !roam(name, away)) name = 'debout';
        enter(name);
      }

      // La suite : tirage pondéré dans CAT_NEXT, où ce qu'il faisait juste avant pèse moins.
      function next() {
        if (!catHome && ctx.dusk) { enter('sieste'); return; }     // pas de toit : il dort sur place
        const w = Object.assign({}, CAT_NEXT[st]);
        if (before && w[before]) w[before] *= CAT_AGAIN;
        begin(pickWeighted(w));
      }

      function goToBed() {
        night = true;
        path = wayTo(x, y, catHome.foot.x, catHome.foot.y);
        speed = rand(CAT_WALK.rentre.speed[0], CAT_WALK.rentre.speed[1]); stride = CAT_WALK.rentre.stride;
        enter('rentre');
      }

      // Avance le long du chemin, avec un départ et un arrêt progressifs. Renvoie true à l'arrivée.
      function advance(dt) {
        const p = path[0];
        const dx = p.x - x, dy = p.y - y, left = Math.hypot(dx, dy);
        const v = speed * Math.min(1, 0.3 + age * 2.5, path.length > 1 ? 1 : 0.3 + left / 12);
        const d = Math.min(left, v * dt);
        if (left > 0.001) { x += (dx / left) * d; y += (dy / left) * d; }
        if (Math.abs(dx) > 1) face = dx > 0 ? 1 : -1;
        walked += d;
        if (left - d > 0.3) return false;
        path.shift();
        return !path.length;
      }

      function step(dt) {
        age += dt;
        if (catHome && !night && ctx.dusk && CAT_NEXT[st]) goToBed();   // la nuit tombe : il rentre
        if (rise > 0) { rise -= dt; age = 0; draw('assis'); return; }
        if (CAT_WALK[st]) {
          // L'image suit la distance parcourue, pas l'horloge : les pattes ne patinent pas.
          const done = advance(dt);
          const k = Math.floor(walked / stride);
          if (st === 'course') draw(k % 2 ? 'marche1' : 'marche0', -Math.abs(Math.sin((walked / stride) * Math.PI)) * 2);
          else draw(['marche0', 'idle', 'marche1', 'idle'][k % 4]);
          if (done && st === 'rentre') { enter('vise'); len = rand(0.5, 0.9); }
          else if (done) next();
        } else if (st === 'vise') {                  // ramassé au pied du mur, il vise le toit
          draw('assis');
          if (age >= len) { jump = { x0: x, y0: y, x1: catHome.roof.x, y1: catHome.roof.y }; enter('saute'); }
        } else if (st === 'saute' || st === 'descend') {
          const k = clamp01(age / CAT_JUMP_S), e = k * k * (3 - 2 * k);
          x = jump.x0 + (jump.x1 - jump.x0) * e; y = jump.y0 + (jump.y1 - jump.y0) * e;
          draw('marche0', -Math.sin(k * Math.PI) * 5, (st === 'saute' ? -1 : 1) * face * 28 * (1 - k));
          if (k >= 1 && st === 'saute') { enter('dort'); stirAt = rand(15, 35); }
          else if (k >= 1) { night = false; enter('debout'); }
        } else if (st === 'dort') {                  // en boule : il respire, et lève parfois la tête
          if (stir <= 0 && age >= stirAt) { stir = rand(1.5, 3); stirAt = age + stir + rand(15, 35); }
          if (stir > 0) { stir -= dt; draw('couche'); } else draw(((age / breath) | 0) % 2 ? 'boule1' : 'boule0');
          if (ctx.day && age > 2) { enter('reveil'); len = rand(2, 4); }
        } else if (st === 'reveil') {                // il lève la tête, s'assoit, puis saute à terre
          draw(age < len * 0.6 ? 'couche' : 'assis');
          if (age >= len) { jump = { x0: x, y0: y, x1: catHome.foot.x, y1: catHome.foot.y }; enter('descend'); }
        } else {                                     // sur place : debout, assis, toilette, couché, sieste
          if (st === 'toilette') draw(((age / 0.28) | 0) % 2 ? 'assis' : 'leche');
          else if (st === 'sieste') draw(((age / breath) | 0) % 2 ? 'boule1' : 'boule0');
          else draw(st === 'assis' ? 'assis' : st === 'couche' ? 'couche' : 'idle');
          // Sans toit, la sieste du soir dure jusqu'au matin.
          if (age >= len && (st !== 'sieste' || catHome || ctx.day)) next();
        }
      }

      return {
        step,
        // Un appui tout près : il détale à l'opposé ; endormi sur son toit, il lève juste la tête.
        scare(px, py) {
          const d = Math.hypot(px - x, py - y);
          if (st === 'dort') { if (d < SCARE_R / 2 && stir <= 0) stir = rand(1.5, 3); return; }
          if (d < SCARE_R && CAT_NEXT[st] && st !== 'course') begin('course', Math.atan2(y - py, x - px));
        },
        // Pour les essais : chat('toilette') lance une activité de CAT_NEXT, chat('nuit') l'envoie se coucher.
        force(name) {
          if (name === 'nuit' && catHome && CAT_NEXT[st]) goToBed();
          else if (CAT_NEXT[name] && CAT_NEXT[st]) begin(name);
          return this.info();
        },
        info: () => ({ etat: st, avant: before, x: Math.round(x), y: Math.round(y), nuit: night, toit: catHome ? catHome.roof : null }),
        destroy() { catAt = CAT_NEXT[st] ? { x, y } : null; s.destroy(); },
      };
    }

    /* ---------- le troupeau : il sort de l'Étable le matin ---------- */
    // Le nombre de bêtes vient du jeu, par la scène (setContext) ; tout le reste se passe ici.
    // Avant HERD_OUT les bêtes sont dans l'Étable, portes fermées. À HERD_OUT les portes
    // coulissent, les bêtes sortent une à une et vivent dans l'enclos (HERD_NEXT). À HERD_IN
    // elles rentrent une à une, et les portes se ferment derrière la dernière.

    let barn = null;                   // image de l'Étable (null : pas débloquée, ou image de secours)
    let herdWant = {};                 // espèce → nombre de bêtes, donné par la scène
    let herdFresh = true;              // premier peuplement : les bêtes sont déjà à leur place
    let herdTurn = 0;                  // date à partir de laquelle la prochaine bête peut passer la porte
    const herd = [];
    const door = { s: null, key: '', k: 0, t: 0 };   // k : 0 fermée, 1 entrouverte, 2 ouverte
    const pen = (function () {
      const objs = o.objects || {};
      const r = objs[HERD_PEN], g = objs.grange;
      if (r && r.width && r.height) return { x: r.x, y: r.y, w: r.width, h: r.height };
      return g ? { x: g.x + 8, y: g.y + g.height + 8, w: g.width - 16, h: 52 } : null;
    })();
    const herdOut = () => ctx.hour == null || (ctx.hour >= HERD_OUT && ctx.hour < HERD_IN);
    // Le seuil : au milieu de la porte, dans l'ouverture. Une bête qui s'y tient reste dessinée
    // devant l'Étable (voir draw()).
    const sill = () => ({ x: barn.x + BARN_DOOR.x + BARN_DOOR.w / 2, y: barn.y - 2 });

    // Fabrique les deux images de la porte (entrouverte, ouverte) dans une planche, à partir
    // de l'image de l'Étable affichée, et pose l'image de la porte par-dessus le bâtiment.
    function syncDoor() {
      const D = BARN_DOOR;
      if (!barn || !barn.active) {
        if (door.s) { door.s.destroy(); door.s = null; }
        door.k = 0;
        return;
      }
      if (door.key !== barn.texture.key) {
        const key = barn.texture.key;
        if (door.s) { door.s.destroy(); door.s = null; }
        const tex = canvasTexture('amb_porte', D.w * 2, D.h, (c) => {
          const img = scene.textures.exists(key) ? scene.textures.get(key).getSourceImage() : null;
          if (!img) return;
          c.imageSmoothingEnabled = false;
          let inside = '#4a2433', shade = '#1f1418';
          try {
            const g = document.createElement('canvas');
            g.width = img.width; g.height = img.height;
            const q = g.getContext('2d', { willReadFrequently: true });
            q.drawImage(img, 0, 0);
            const hex = (p) => { const d = q.getImageData(p[0], p[1], 1, 1).data; return 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')'; };
            inside = hex(D.dark); shade = hex(D.lintel);
          } catch (e) { /* image illisible : couleurs par défaut */ }
          [D.slide / 2, D.slide].forEach((slide, n) => {
            const ox = n * D.w - D.x, oy = -D.y;
            c.drawImage(img, D.x, D.y, D.w, D.h, n * D.w, 0, D.w, D.h);
            c.fillStyle = inside; c.fillRect(ox + D.left, oy + D.top, D.leaf * 2, D.rows);
            c.fillStyle = shade; c.fillRect(ox + D.left, oy + D.top, D.leaf * 2, 2);
            c.drawImage(img, D.left, D.top, D.leaf, D.rows, ox + D.left - slide, oy + D.top, D.leaf, D.rows);
            c.drawImage(img, D.right, D.top, D.leaf, D.rows, ox + D.right + slide, oy + D.top, D.leaf, D.rows);
          });
        });
        tex.add('p1', 0, 0, 0, D.w, D.h);
        tex.add('p2', 0, D.w, 0, D.w, D.h);
        door.key = key;
      }
      if (!door.s || !door.s.active) door.s = scene.add.image(0, 0, 'amb_porte', 'p2').setOrigin(0);
      door.s.setPosition(barn.x + D.x, barn.y - barn.height + D.y).setDepth(barn.depth + 0.5)
        .setVisible(door.k > 0).setFrame(door.k === 1 ? 'p1' : 'p2');
    }

    // Un endroit de l'enclos où poser ses sabots, à l'écart des autres bêtes (là où elles
    // sont et là où elles vont). `near` : pas plus loin que cette distance.
    function penSpot(self, half, near) {
      let best = null;
      for (let i = 0; i < 8; i++) {
        let x = pen.x + half + Math.random() * Math.max(0, pen.w - 2 * half);
        let y = pen.y + Math.random() * pen.h;
        if (near) {
          x = Math.min(pen.x + pen.w - half, Math.max(pen.x + half, self.x + rand(-near, near)));
          y = Math.min(pen.y + pen.h, Math.max(pen.y, self.y + rand(-near, near) * 0.4));
        }
        best = { x, y };
        if (!herd.some((b) => b !== self && b.near(x, y))) return best;
      }
      return best;
    }

    function makeBeast(kind, placed) {
      const H = HERD[kind];
      const F = {};
      H.frames.forEach((name, i) => { F[name] = i; });
      const me = { kind, x: 0, y: 0 };
      let face = Math.random() < 0.5 ? 1 : -1;
      let st = 'dedans', age = 0, len = 0, before = null;
      let to = null, speed = 0, walked = 0;      // déplacement en cours
      let swish = -1, nod = 1.3;                 // coup de queue (date dans l'activité), cadence quand elle broute
      const s = scene.add.image(0, 0, o.herd[kind], 0).setOrigin(0.5, 1).setVisible(false);

      function enter(name) {
        before = st; st = name; age = 0; walked = 0;
        if (HERD_TIME[name]) len = rand(HERD_TIME[name][0], HERD_TIME[name][1]);
        if (name === 'debout') swish = Math.random() < 0.7 ? rand(0.2, Math.max(0.3, len - 0.8)) : -1;
        if (name === 'broute') nod = rand(1.1, 1.7);
      }
      function walkTo(spot, name) { to = spot; speed = rand(H.speed[0], H.speed[1]); enter(name); }
      function next() {
        const w = Object.assign({}, HERD_NEXT[st] || HERD_NEXT.debout);
        if (before && w[before]) w[before] *= CAT_AGAIN;
        const name = pickWeighted(w);
        if (name === 'marche') walkTo(penSpot(me, H.half, 3 * T), 'marche'); else enter(name);
      }
      function draw(frame, alpha) {
        const front = barn && barn.active ? barn.depth + 0.6 : 0;
        s.setFrame(F[frame]).setPosition(me.x, me.y).setFlipX(face < 0).setDepth(Math.max(me.y, front)).setAlpha(alpha == null ? 1 : alpha).setVisible(true);
      }
      function advance(dt) {
        const dx = to.x - me.x, dy = to.y - me.y, left = Math.hypot(dx, dy), d = Math.min(left, speed * dt);
        if (left > 0.001) { me.x += (dx / left) * d; me.y += (dy / left) * d; }
        if (Math.abs(dx) > 1) face = dx > 0 ? 1 : -1;
        walked += d;
        return left - d;                         // distance restante
      }
      const walkFrame = () => ['marche0', 'idle', 'marche1', 'idle'][Math.floor(walked / H.stride) % 4];

      if (placed) {                              // elle est déjà dans l'enclos (le jeu s'ouvre en journée)
        const spot = penSpot(me, H.half);
        me.x = spot.x; me.y = spot.y;
        enter(pickWeighted({ debout: 1, broute: 3, couche: 1 }));
        age = rand(0, len * 0.6);
      }

      me.inside = () => st === 'dedans';
      me.state = () => st;
      me.near = (x, y) => {
        const hit = (p) => Math.abs(p.x - x) < H.half * 1.5 && Math.abs(p.y - y) < 7;
        return st !== 'dedans' && (hit(me) || (to && (st === 'marche' || st === 'sort') && hit(to)));
      };
      me.destroy = () => s.destroy();
      me.step = (dt, out, doorOpen) => {
        age += dt;
        if (st === 'dedans') {
          // Elle attend son tour derrière la porte ouverte.
          if (out && doorOpen && t >= herdTurn) {
            herdTurn = t + rand(HERD_GAP[0], HERD_GAP[1]);
            const d = sill();
            me.x = d.x + rand(-5, 5); me.y = d.y;
            walkTo(penSpot(me, H.half), 'sort');
            draw('idle', 0);
          }
          return;
        }
        // Le soir, chacune rentre à son tour (une bête couchée se lève d'abord).
        if (!out && st !== 'rentre' && t >= herdTurn) {
          herdTurn = t + rand(HERD_GAP[0], HERD_GAP[1]);
          walkTo(sill(), 'rentre');
        }
        if (st === 'sort') {                     // elle apparaît sur le seuil et gagne sa place
          const left = advance(dt);
          draw(walkFrame(), clamp01(age / 0.5));
          if (left < 0.3) next();
        } else if (st === 'rentre') {            // elle regagne le seuil et disparaît dans l'ombre
          const left = advance(dt);
          draw(walkFrame(), clamp01(left / 6));
          if (left < 0.3) { st = 'dedans'; s.setVisible(false); }
        } else if (st === 'marche') {
          const left = advance(dt);
          draw(walkFrame());
          if (left < 0.3) next();
        } else if (st === 'broute') {            // la tête au sol, relevée un instant à chaque bouchée
          draw((age % nod) < 0.28 ? 'broute1' : 'broute0');
          if (age >= len) next();
        } else if (st === 'couche') {            // elle rumine : trois secondes de mâchonnement, une pause
          draw((age % 4.5) < 3 && ((age / 0.42) | 0) % 2 ? 'couchee1' : 'couchee0');
          if (age >= len) next();
        } else {                                 // debout, avec parfois deux coups de queue
          const q = age - swish;
          draw(swish >= 0 && ((q > 0 && q < 0.22) || (q > 0.44 && q < 0.66)) ? 'queue' : 'idle');
          if (age >= len) next();
        }
      };
      return me;
    }

    // Accorde les bêtes au nombre voulu, puis fait vivre la porte et le troupeau.
    function stepHerd(dt) {
      if (!pen) return;
      const out = herdOut();
      for (const kind in HERD) {
        const able = barn && barn.active && o.herd && o.herd[kind] && scene.textures.exists(o.herd[kind]);
        const want = able ? Math.min(HERD[kind].max, Math.max(0, herdWant[kind] | 0)) : 0;
        let have = 0;
        for (let i = herd.length - 1; i >= 0; i--) {
          if (herd[i].kind !== kind) continue;
          if (++have > want) { herd[i].destroy(); herd.splice(i, 1); have--; }
        }
        // Une bête achetée en journée sort de l'Étable comme les autres le matin.
        for (; have < want; have++) herd.push(makeBeast(kind, herdFresh && out));
      }
      if (!barn || !barn.active) return;
      const roaming = herd.some((b) => !b.inside());
      if (herdFresh) { herdFresh = false; door.k = out && herd.length ? 2 : 0; syncDoor(); }
      // La porte : ouverte tant qu'une bête est dehors ou doit sortir ; un cran toutes les 0,3 s.
      const goal = roaming || (out && herd.length) ? 2 : 0;
      if (door.k !== goal) {
        door.t += dt;
        if (door.t >= BARN_DOOR.step) { door.t = 0; door.k += goal > door.k ? 1 : -1; syncDoor(); }
      } else door.t = 0;
      for (const b of herd) b.step(dt, out, door.k === 2);
    }

    function clearHerd() {
      for (const b of herd) b.destroy();
      herd.length = 0;
      if (door.s) { door.s.destroy(); door.s = null; }
      door.k = 0; door.t = 0;
      herdFresh = true; herdTurn = 0;
    }

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

    function tick() {
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
      // Ombres de nuages : seulement en plein jour, et elles s'effacent doucement.
      const want = ctx.day ? 0.12 : 0;
      for (const c of clouds) { if (c.s.alpha !== want) c.s.setAlpha(Math.abs(c.s.alpha - want) < 0.01 ? want : c.s.alpha + (want - c.s.alpha) * 0.08); }
    }

    function start() {
      on = true;
      for (const type in EVENTS) arm(type, true);
      cat = makeCat();
      for (let i = 0; i < 3; i++) {
        const s = scene.add.image(rand(0, world.w), rand(0, world.h), 'amb_nuage').setDepth(SHADOW_DEPTH).setTint(0x0b1d2e).setAlpha(0).setScale(rand(4, 6.5), rand(4, 6));
        clouds.push({ s, v: rand(7, 12) });
      }
    }

    // Tout enlever (le joueur vient de demander moins d'animations).
    function stop() {
      on = false;
      for (const a of actors) a.sprites.forEach((s) => s.destroy());
      actors.length = 0;
      if (cat) { cat.destroy(); cat = null; }
      clearHerd();
      clouds.forEach((c) => c.s.destroy()); clouds = [];
    }

    /* ---------- API ---------- */

    function update(delta) {
      if (reduced()) { if (on) stop(); return; }
      if (!on) start();
      const dt = Math.min(delta, 50) / 1000;
      t += dt;
      acc += dt * 1000;
      if (acc >= TICK_MS) { tick(); acc = 0; }
      // Par image : seulement ce qui se déplace (8 bêtes au plus, le chat, 3 ombres).
      for (let i = actors.length - 1; i >= 0; i--) {
        const a = actors[i];
        if (a.step(dt) === false) { a.sprites.forEach((s) => s.destroy()); actors.splice(i, 1); }
      }
      if (cat) cat.step(dt);
      stepHerd(dt);
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
      // L'Étable (son image, ou rien tant qu'elle n'est pas affichée) et le nombre de bêtes.
      if ('barn' in c && c.barn !== barn) { barn = c.barn || null; if (on) syncDoor(); }
      if (c.herd) herdWant = c.herd;
    }

    function scare(x, y) {
      for (const a of actors) if (a.scare) a.scare(x, y);
      if (cat) cat.scare(x, y);
    }

    function stats() {
      const by = {};
      for (const a of actors) by[a.type] = (by[a.type] || 0) + 1;
      return { on, actors: actors.length, by, water: water.length, mapTrees: mapTrees.length, wood: wood.size, orchard: trees.length, chat: cat ? cat.info() : null, troupeau: herd.map((b) => b.kind + ' ' + b.state() + ' ' + Math.round(b.x) + ',' + Math.round(b.y)), porte: door.k, clock: t, next: Object.assign({}, next) };
    }

    return {
      update, setContext, scare, stats, spawn: (type) => spawn(type, true), wind: (x, y) => windAt(x, y, t), repaint,
      chat: (name) => (cat ? cat.force(name) : null),
    };
  }

  global.AmbientLife = { attach, EVENTS };
})(window);
