/* carte/ferme/decor.js — la scène de la ferme : les arbres, les barrières, les ombres et l'herbe haute.
 *
 * Les arbres et les buissons de la carte (chacun son image, rangée selon son pied : le
 * personnage passe derrière, l'arbre devient un peu transparent), les barrières, les ombres
 * portées, l'herbe haute qui penche quand on la traverse (CarteKit.herbe) et que la faux fauche.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T, MAP, OCCLUDER_ALPHA, TALL_GRASS, SPRITE_CHECKS, MIN_TAP } = F.C;
  // Le masque d'un arbre : des carrés de MASQUE px. Le corps du personnage, qu'un arbre cache :
  // `l` px de chaque côté de ses pieds, de `h` px au-dessus d'eux à `pied` px au-dessus.
  const MASQUE = 4;
  const CORPS = { l: 5, h: 26, pied: 2 };
  const { pixelRatio, reducedMotion } = F;
  const DECOR_MARGE = 64;           // px autour de la vue : dessiné quand même (voir cullDecor)
  const HERBE_MORCEAU = 256;        // px : le côté d'un morceau d'herbe haute (voir makeTallGrass)

  F.partie({

    /* ---------- les arbres et les buissons, devant ou derrière le personnage ---------- */

    // Chaque arbre ou buisson de la carte (un groupe de cases voisines d'une couche d'arbres,
    // sauf layer_tree_top) n'est pas dessiné dans le fond : il a sa propre image, rangée selon
    // son pied comme le personnage et les bêtes (profondeur = y du pied). Qui passe derrière
    // est donc caché par lui ; l'arbre devient alors un peu transparent (OCCLUDER_ALPHA) pour
    // qu'on le voie passer. this.occluded : couche -> cases retirées du fond.
    // Les barrières (couches « barrieres… ») aussi, mais rangée par rangée : un morceau de
    // barrière = des cases voisines d'une même rangée, avec son pied au bas de la rangée. Le
    // fond d'un enclos passe ainsi derrière les bêtes, le devant devant elles, et chaque
    // tronçon de côté selon sa rangée.
    // Le relevé ne lit que les régions de la carte qui ont quelque chose (CarteKit.casesPleines :
    // la ferme, pas la prairie du monde autour), dans l'ordre des cases : les mêmes arbres, dans le
    // même ordre, qu'en parcourant toute la carte.
    findOccluders() {
      this.occluders = [];
      this.occluded = new Map();
      const raw = this.mapRaw;
      if (!raw) return;
      const W = raw.width, H = raw.height, T = raw.tilewidth;
      for (const layer of raw.layers) {
        if (layer.type !== 'tilelayer' || !Array.isArray(layer.data) || layer.visible === false) continue;
        const fence = /barri/i.test(layer.name || '');
        if (!fence && (!/tree|arbre/i.test(layer.name || '') || /top|haut/i.test(layer.name || ''))) continue;
        const gidAt = (i) => layer.data[i] & 0x0fffffff;
        const seen = new Uint8Array(W * H);
        const all = new Set();
        for (const i0 of K.casesPleines(raw)) {
          if (seen[i0] || !gidAt(i0)) continue;
          const cells = [], stack = [i0];
          seen[i0] = 1;
          let c0 = W, c1 = 0, r0 = H, r1 = 0;
          while (stack.length) {
            const i = stack.pop(), c = i % W, r = (i / W) | 0;
            cells.push(i);
            all.add(i);
            c0 = Math.min(c0, c); c1 = Math.max(c1, c); r0 = Math.min(r0, r); r1 = Math.max(r1, r);
            for (const j of fence ? [c > 0 ? i - 1 : -1, c < W - 1 ? i + 1 : -1] : [c > 0 ? i - 1 : -1, c < W - 1 ? i + 1 : -1, i - W, i + W]) {
              if (j >= 0 && j < W * H && !seen[j] && gidAt(j)) { seen[j] = 1; stack.push(j); }
            }
          }
          this.occluders.push({ layer, cells: new Set(cells), x: c0 * T, y: r0 * T, w: (c1 - c0 + 1) * T, h: (r1 - r0 + 1) * T, foot: (r1 + 1) * T - (fence ? 2 : 3), img: null });
        }
        this.occluded.set(layer, all);
      }
    },

    // Les arbres, les buissons et les barrières de la carte : leur image ne se fait que quand
    // leur région du sol est dessinée (showRegionObjs), et s'en va avec elle.
    makeOccluders() {
      this.occluders.forEach((o, k) => { o.key = 'arbre_occ_' + k; o.vu = true; this.placeInRegion(o); });
    },

    /* ---------- les images des arbres, des barrières et des rochers, par région ---------- */

    // `o` (un arbre, une barrière, un rocher) appartient à la région du sol (sol.js, makeRegions)
    // où est le milieu de son image : elle est créée et retirée avec la région.
    placeInRegion(o) {
      const N = K.REGION.tuiles * T;
      const r = this.regions && this.regions.get(Math.floor((o.x + o.w / 2) / N) + ',' + Math.floor((o.y + o.h / 2) / N));
      if (!r) return;
      (r.objets || (r.objets = [])).push(o);
      if (r.tex) this.showObj(o);
    },

    showRegionObjs(r) {
      for (const o of r.objets || []) this.showObj(o);
      if (r.objets && r.objets.length) this.sunDirty = true;   // (leurs ombres au soleil)
    },

    dropRegionObjs(r) {
      for (const o of r.objets || []) this.dropObj(o);
    },

    // Son image : un canevas peint depuis la planche de la carte, rangé selon son pied. Un rocher
    // y mesure aussi la place qu'occupent vraiment ses pixels (rockBox) ; un rocher cassé, un
    // arbre abattu (o.vu, hache.js syncFelled) restent cachés.
    showObj(o) {
      if (o.img) return;
      const P = this.planche();
      if (!P) return;
      if (this.textures.exists(o.key)) this.textures.remove(o.key);
      o.tex = this.textures.createCanvas(o.key, o.w, o.h);
      this.paintOccluder(o, this.mapRaw, P.set, P.img);
      if (o.rocher) this.rockBox(o);
      o.img = this.add.image(o.x, o.y, o.key).setOrigin(0).setDepth(o.foot);
      o.alpha = 1;
      o.img.setVisible(o.rocher ? !o.gone : o.vu !== false);
    },

    // Loin de la vue : son image et son canevas s'en vont (pas pendant qu'il tremble, tombe ou
    // se brise : le personnage est à côté).
    dropObj(o) {
      if (!o.img || o.shake || o.falling || o.breaking || o.regrowing) return;
      this.tweens.killTweensOf(o.img);
      o.img.destroy();
      if (this.textures.exists(o.key)) this.textures.remove(o.key);
      o.img = o.tex = o.probe = null;
    },

    paintOccluder(o, raw, set, img) {
      const ctx = o.tex.getContext();
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, o.w, o.h);
      ctx.save();
      ctx.translate(-o.x, -o.y);
      this.drawLayer(ctx, raw, o.layer, set, img, o.cells, null, true);
      ctx.restore();
      o.tex.refresh();
      o.probe = this.probeOf(o.tex, o.w, o.h, o);
    },

    // Un point opaque d'une image dessinée dans un canevas (null s'il n'y en a pas) : s'il
    // redevient transparent, le navigateur a vidé le canevas (voir spritesWiped). Avec `o` (un
    // arbre, un buisson) : son masque aussi, o.mask, une case par carré de MASQUE px, 1 là où
    // l'image est surtout opaque (le personnage n'est caché que derrière : stepOccluders).
    probeOf(tex, w, h, o) {
      try {
        const d = tex.getContext().getImageData(0, 0, w, h).data;
        if (o) {
          const M = MASQUE, mw = Math.ceil(w / M), mh = Math.ceil(h / M), n = new Uint16Array(mw * mh);
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 128) n[((y / M) | 0) * mw + ((x / M) | 0)]++;
          o.mask = { M, mw, mh, cases: n.map((k) => (k * 2 >= M * M ? 1 : 0)) };
        }
        for (let i = 3; i < d.length; i += 4) if (d[i] > 200) { const k = (i - 3) / 4; return { x: k % w, y: (k / w) | 0 }; }
      } catch (e) { /* pas de vérification pour cette image */ }
      return null;
    },

    // Le rectangle (x0, y0)–(x1, y1) (px de carte) touche-t-il une partie opaque de l'arbre `o` ?
    // (sans masque : son rectangle)
    couvre(o, x0, y0, x1, y1) {
      const a = Math.max(x0, o.x), b = Math.min(x1, o.x + o.w), c = Math.max(y0, o.y), e = Math.min(y1, o.y + o.h);
      if (a >= b || c >= e) return false;
      const m = o.mask;
      if (!m) return true;
      for (let cy = Math.floor((c - o.y) / m.M); cy <= Math.min(m.mh - 1, Math.floor((e - 1 - o.y) / m.M)); cy++) {
        for (let cx = Math.floor((a - o.x) / m.M); cx <= Math.min(m.mw - 1, Math.floor((b - 1 - o.x) / m.M)); cx++) if (m.cases[cy * m.mw + cx]) return true;
      }
      return false;
    },

    // Les arbres, les barrières et les rochers de la carte sont dessinés chacun dans son
    // canevas : comme le fond, le navigateur peut les vider quand la page reste en
    // arrière-plan. Vrai si l'un d'eux l'a été. `few` : quelques-uns seulement, à tour de rôle
    // (la vérification régulière ; au retour sur la page, tous sont vérifiés).
    spritesWiped(few) {
      const all = (this.occluders || []).concat(this.rocks || []);
      let list = all;
      if (few && all.length > SPRITE_CHECKS) {
        const k0 = this.spriteCheckAt = ((this.spriteCheckAt || 0) + SPRITE_CHECKS) % all.length;
        list = Array.from({ length: SPRITE_CHECKS }, (_, i) => all[(k0 + i) % all.length]);
      }
      for (const o of list) {
        if (!o.tex || !o.probe) continue;
        try {
          const ctx = o.tex.getContext();
          if (ctx.isContextLost && ctx.isContextLost()) continue;   // pas encore rendu : on réessaiera
          if (ctx.getImageData(o.probe.x, o.probe.y, 1, 1).data[3] === 0) return true;
        } catch (e) { /* on ne sait pas : rien */ }
      }
      return false;
    },

    // Redessine les arbres, les barrières et les rochers de la carte dans leurs canevas.
    paintSprites() {
      const raw = this.mapRaw;
      if (!raw || !this.has(MAP.tiles)) return;
      const set = (raw.tilesets || []).find((t) => t.image && String(t.image).split('/').pop() === MAP.image);
      if (!set) return;
      const img = this.textures.get(MAP.tiles).getSourceImage();
      for (const o of (this.occluders || []).concat(this.rocks || [])) if (o.tex) { if (o.peindre) o.peindre(); else this.paintOccluder(o, raw, set, img); }
      this.sunDirty = true;            // (les ombres du soleil en sont tirées)
    },

    // À chaque image : l'arbre devant le personnage (son pied plus bas que celui du
    // personnage) et qui le recouvre vraiment (son feuillage, son tronc : son masque, pas les
    // coins vides de son image) devient transparent, doucement ; les autres redeviennent
    // opaques.
    stepOccluders(dt) {
      if (!this.occluders || !this.occluders.length) return;
      const p = this.fermier ? this.fermier.pos() : null;
      for (const o of this.occluders) {
        if (!o.img || o.regrowing) continue;
        const derriere = p && p.y < o.foot && this.couvre(o, p.x - CORPS.l, p.y - CORPS.h, p.x + CORPS.l, p.y - CORPS.pied);
        const want = derriere ? OCCLUDER_ALPHA : 1;
        if (o.alpha === want) continue;
        o.alpha = K.fondu(o.alpha, want, dt);
        o.img.setAlpha(o.alpha);
        if (o.shake) o.shake.setAlpha(o.alpha);
      }
    },

    /* ---------- l'herbe haute ---------- */

    // Les touffes sont des milliers (js/engine/ferme-generee.js) : leurs images ne sont créées
    // que par morceaux de carte (HERBE_MORCEAU px de côté), quand un morceau approche de la vue
    // (cullDecor : à moins de HERBE_MORCEAU px), et détruites quand il s'en éloigne (au-delà du
    // double). `this.grassAll` : toutes les touffes (leur image quand leur morceau est là) ;
    // `this.tallGrass` : celles qui ont leur image.
    makeTallGrass() {
      for (const g of this.tallGrass || []) this.dropGrass(g);
      this.tallGrass = [];
      this.grassAll = [];
      this.grassChunks = new Map();
      this.grassKey = this.cullKey = '';
      this.cutKey = null;
      const raw = this.mapRaw;
      if (!raw || !this.has(TALL_GRASS.key)) return;
      const layer = raw.layers.find((l) => l.type === 'objectgroup' && l.name === 'herbe_haute');
      const rows = Math.floor(this.textures.get(TALL_GRASS.key).frameTotal / TALL_GRASS.frames) || 1;
      const fleurs = this.has(TALL_GRASS.fleurs.key);
      for (const o of (layer && layer.objects) || []) {
        const base = (Math.max(0, Number(o.type) | 0) % rows) * TALL_GRASS.frames;
        const g = { id: Math.round(o.x) + ',' + Math.round(o.y), img: null, fleurs: null, x: Math.round(o.x), y: o.y, base, fleurie: fleurs && Math.floor(base / TALL_GRASS.frames / 3) % 2 === 1,
          tint: 0xffffff, cell: Math.floor(o.y / T - 0.01) * raw.width + Math.floor(o.x / T), t: -1, dir: 1, inside: false };
        this.grassAll.push(g);
        const k = Math.floor(g.x / HERBE_MORCEAU) + ',' + Math.floor(g.y / HERBE_MORCEAU);
        if (!this.grassChunks.has(k)) this.grassChunks.set(k, { list: [], on: false });
        this.grassChunks.get(k).list.push(g);
      }
      this.tintTallGrass();
    },

    // La teinte de chaque touffe : la couleur moyenne du fond autour de son pied, divisée par
    // celle de l'herbe la plus claire (sur laquelle les touffes sont dessinées). Lue une fois,
    // région par région (CarteKit.REGION) : chacune dessinée dans un canevas de travail, qu'on
    // jette ensuite.
    tintTallGrass() {
      if (!this.grassAll.length || !this.regions || !this.planche()) return;
      const N = K.REGION.tuiles * T;
      const parRegion = new Map();
      this.grassAll.forEach((g, k) => {
        const cle = Math.floor(g.x / N) + ',' + Math.floor(g.y / N);
        if (!parRegion.has(cle)) parRegion.set(cle, []);
        parRegion.get(cle).push(k);
      });
      const under = new Array(this.grassAll.length).fill(null);
      const cv = global.document.createElement('canvas');
      for (const [cle, ks] of parRegion) {
        const r = this.regions.get(cle);
        if (!r) continue;
        cv.width = r.w; cv.height = r.h;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        let d;
        try { this.paintRegion(r, ctx); d = ctx.getImageData(0, 0, r.w, r.h).data; } catch (e) { continue; }
        for (const k of ks) {
          const g = this.grassAll[k];
          let rr = 0, v = 0, b = 0, n = 0;
          for (let y = Math.max(r.y, g.y - 4); y < Math.min(r.y + r.h, g.y + 2); y++) {
            for (let x = Math.max(r.x, g.x - 8); x < Math.min(r.x + r.w, g.x + 8); x++) {
              const i = (((y - r.y) | 0) * r.w + ((x - r.x) | 0)) * 4;
              if (d[i + 3] > 200) { rr += d[i]; v += d[i + 1]; b += d[i + 2]; n++; }
            }
          }
          under[k] = n ? [rr / n, v / n, b / n] : null;
        }
      }
      cv.width = cv.height = 0;
      const lum = (c) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
      const seen = under.filter(Boolean).sort((a, b) => lum(a) - lum(b));
      if (!seen.length) return;
      const ref = seen[Math.floor((seen.length - 1) * 0.9)];        // l'herbe claire (sans les reflets isolés)
      this.grassAll.forEach((g, k) => {
        const c = under[k];
        if (!c) return;
        // nuance propre à la touffe (toujours la même : tirée de sa position)
        const n = Math.sin(g.x * 12.9898 + g.y * 78.233) * 43758.5453;
        const own = 1 - TALL_GRASS.shade * (n - Math.floor(n));
        const ch = (i) => Math.round(255 * own * Math.pow(Math.min(1, c[i] / Math.max(1, ref[i])), TALL_GRASS.contrast));
        g.tint = (ch(0) << 16) | (ch(1) << 8) | ch(2);
        if (g.img) g.img.setTint(g.tint);
      });
      this.grassCheck = 0;
      this.grassPrev = null;
    },

    // Les morceaux d'herbe haute près de la vue : leurs images créées ; loin : détruites.
    syncTallGrass(v) {
      if (!this.grassChunks || !this.grassChunks.size) return;
      const C = HERBE_MORCEAU;
      const cle = Math.floor(v.x / C) + ',' + Math.floor(v.y / C) + ',' + Math.ceil(v.right / C) + ',' + Math.ceil(v.bottom / C);
      if (cle === this.grassKey) return;
      this.grassKey = cle;
      let change = false;
      for (const [k, ch] of this.grassChunks) {
        const [cx, cy] = k.split(',').map(Number);
        const x0 = cx * C, y0 = cy * C, x1 = x0 + C, y1 = y0 + C;
        const loin = (m) => x0 > v.right + m || x1 < v.x - m || y0 > v.bottom + m || y1 < v.y - m;
        if (!ch.on && !loin(C)) {
          ch.on = change = true;
          for (const g of ch.list) {
            g.img = this.add.image(g.x, g.y, TALL_GRASS.key, g.base).setOrigin(0.5, 1).setDepth(g.y).setTint(g.tint);
            if (g.fleurie) g.fleurs = this.add.image(g.x, g.y, TALL_GRASS.fleurs.key, g.base).setOrigin(0.5, 1).setDepth(g.y + 0.01);
            g.t = -1;
            this.showGrass(g);
          }
        } else if (ch.on && loin(2 * C)) {
          ch.on = false;
          change = true;
          for (const g of ch.list) this.dropGrass(g);
        }
      }
      if (change) {
        this.tallGrass = this.grassAll.filter((g) => g.img);
        this.grassCheck = 0;
      }
    },

    // Une touffe se voit sauf sur une case labourée, fauchée (elle repousse : modèle.fauchees) ou
    // pendant qu'elle tombe sous la faux.
    showGrass(g) {
      if (!g.img) return;
      const v = !g.cut && !g.tombe && !(this.dirt && this.dirt.has(g.cell));
      g.img.setVisible(v);
      if (g.fleurs) g.fleurs.setVisible(v);
    },

    // Les touffes fauchées (modèle.fauchees : leurs identifiants « x,y »). Une touffe qui
    // repousse paraît en fondu.
    syncCutGrass(ids) {
      if (!this.grassAll) return;
      const key = (ids || []).join(';');
      if (key === this.cutKey) return;
      const first = this.cutKey == null;
      this.cutKey = key;
      const cut = new Set(ids || []);
      for (const g of this.grassAll) {
        const c = cut.has(g.id);
        if (c === !!g.cut) continue;
        g.cut = c;
        this.showGrass(g);
        if (!c && !first && g.img && !reducedMotion()) {
          for (const i of [g.img, g.fleurs]) if (i) { i.setAlpha(0); this.tweens.add({ targets: i, alpha: 1, duration: 600 }); }
        }
      }
    },

    // La touffe d'herbe haute sous le doigt (la plus en avant), ou null : sa boîte, un peu
    // élargie (le doigt est gros, la touffe petite).
    grassAt(wx, wy) {
      const min = (MIN_TAP * pixelRatio()) / this.cameras.main.zoom / 2;
      const hx = Math.max(8, min * 0.6), haut = Math.max(14, min);
      let best = null;
      for (const g of this.tallGrass || []) {
        if (g.cut || g.tombe || !g.img || !g.img.visible) continue;
        if (Math.abs(wx - g.x) > hx || wy < g.y - haut || wy > g.y + 3) continue;
        if (!best || Math.abs(wx - g.x) + Math.abs(wy - g.y + 6) < Math.abs(wx - best.x) + Math.abs(wy - best.y + 6)) best = g;
      }
      return best;
    },

    // Un coup de faux sur la touffe `g` : le jeu le compte tout de suite (this.ctx.bridge.scythe)
    // et pose la fibre au sol ; le personnage va à côté et fauche ; au coup, la touffe se couche
    // et s'efface, la fibre paraît à son pied.
    scythe(g) {
      const pied = { x: g.x, y: Math.round(g.y) };
      const ou = { carte: 'ferme', coup: [{ x: pied.x, y: pied.y }] };
      const got = this.holdPieces(() => (this.ctx.bridge && this.ctx.bridge.scythe ? this.ctx.bridge.scythe(g.id, ou) : null));
      if (!got) return;
      const M2 = got.morceaux || { coup: [], fin: [] };
      g.tombe = true;
      const fin = () => {
        if (!g.tombe) return;
        g.tombe = false;
        g.cut = true;
        this.showGrass(g);
        this.revealPieces(M2.coup);
      };
      this.time.delayedCall(9000, fin);           // (filet : le coup n'a pas été donné)
      const hit = () => {
        K.vibre('pioche');
        const imgs = [g.img, g.fleurs].filter(Boolean);
        if (!imgs.length || reducedMotion()) { fin(); return; }
        this.tweens.add({ targets: imgs, scaleY: 0.2, alpha: 0, duration: 220, ease: 'Quad.easeIn',
          onComplete: () => { for (const i of imgs) i.setScale(1).setAlpha(1); fin(); } });
        this.revealPieces(M2.coup);
      };
      if (!this.fermier || !this.fermier.scythe || !this.fermier.scythe(pied, hit)) hit();
    },

    dropGrass(g) {
      if (g.img) g.img.destroy();
      if (g.fleurs) g.fleurs.destroy();
      g.img = g.fleurs = null;
      g.inside = false;
    },

    // À chaque image : le personnage entre dans une touffe en marchant : elle penche dans le
    // sens de sa marche (vers la droite s'il va à droite) et revient en se balançant.
    stepTallGrass(dt) {
      const list = this.tallGrass;
      if (!list || !list.length) return;
      this.grassCheck -= dt;
      if (this.grassCheck <= 0) {                  // les cases labourées : plus d'herbe haute
        this.grassCheck = 500;
        for (const g of list) this.showGrass(g);
      }
      const p = this.fermier ? this.fermier.pos() : null;
      this.grassPrev = K.herbe(list, p, this.grassPrev, dt);
    },

    /* ---------- hors de la vue : pas dessinés ---------- */

    // La ferme générée est grande (js/engine/ferme-generee.js : des centaines d'arbres, de
    // rochers et de touffes) : une image d'arbre, de barrière, de rocher ou de touffe hors de la
    // vue (à plus de DECOR_MARGE px) n'est pas dessinée. Sa visibilité ne change pas (un arbre
    // abattu, une touffe sur la terre restent cachés) : elle porte `horsVue`, que sa méthode
    // willRender consulte. Revu quand la vue a bougé de 8 px.
    cullDecor() {
      const v = this.cameras.main.worldView;
      const cle = Math.round(v.x / 8) + ',' + Math.round(v.y / 8) + ',' + Math.round(v.width) + ',' + Math.round(v.height);
      if (cle === this.cullKey) return;
      this.cullKey = cle;
      this.syncTallGrass(v);
      const M = DECOR_MARGE, x0 = v.x - M, y0 = v.y - M, x1 = v.right + M, y1 = v.bottom + M;
      const marque = (img) => {
        if (!img) return;
        if (!img.horsVuePose) {
          const rend = img.willRender;
          img.willRender = function (camera) { return !this.horsVue && rend.call(this, camera); };
          img.horsVuePose = true;
        }
        const w = img.displayWidth, h = img.displayHeight, x = img.x - img.originX * w, y = img.y - img.originY * h;
        img.horsVue = x > x1 || x + w < x0 || y > y1 || y + h < y0;
      };
      for (const o of this.occluders || []) { marque(o.img); marque(o.shake); }
      for (const o of this.rocks || []) marque(o.img);
      for (const g of this.tallGrass || []) { marque(g.img); marque(g.fleurs); }
      for (const g of (this.gatherables || new Map()).values()) g.imgs.forEach(marque);
      for (const e of (this.blocks || new Map()).values()) marque(e.img);
      // (les arbres et les plantes hautes du grand monde qui ont leur image : vegetation.js)
      for (const o of this.vegListe || []) marque(o.img);
      for (const g of this.vegHerbes || []) marque(g.img);
    },

    // L'image de l'arbre `t` (mapTrees) : celle qui contient sa première case.
    occluderOf(t) {
      if (!this.occluders) return null;
      const i = t.cells.values().next().value;
      return this.occluders.find((o) => o.layer === t.layer && o.cells.has(i)) || null;
    },
  });
})(window);
