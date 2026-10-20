/* carte/ferme/pioche.js — la scène de la ferme : la pioche et les rochers de la carte.
 *
 * Les rochers de la carte (chacun son image), un coup de pioche (les éclats sautent), le
 * dernier coup (le rocher se brise : CarteKit.NATURE.eclats), les rochers qui reviennent.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { MAP, ZONE_TILES, ROCKS, MIN_TAP } = F.C;
  const { pixelRatio, reducedMotion } = F;

  F.partie({

    /* ---------- la pioche : les rochers de la carte ---------- */

    // Les rochers, lus une fois dans la couche des plantes et des pierres : { id, cells, x, y,
    // w, h (bornes des cases, en px), foot, img }. id : « colonne,rangée » de la case en bas à
    // gauche (ce que le jeu enregistre pour compter les coups). Leurs cases quittent le fond.
    findRocks() {
      this.rocks = [];
      const raw = this.mapRaw;
      const layer = raw && raw.layers.find((l) => l.type === 'tilelayer' && l.name === ZONE_TILES.plantes && Array.isArray(l.data));
      if (!layer) return;
      const W = raw.width, H = raw.height, T = raw.tilewidth;
      const rock = (i) => ROCKS.gids.has(layer.data[i] & 0x0fffffff);
      const seen = new Uint8Array(W * H);
      const all = this.occluded.get(layer) || new Set();
      for (let i0 = 0; i0 < W * H; i0++) {
        if (seen[i0] || !rock(i0)) continue;
        const cells = [], stack = [i0];
        seen[i0] = 1;
        let c0 = W, c1 = 0, r0 = H, r1 = 0;
        while (stack.length) {
          const i = stack.pop(), c = i % W, r = (i / W) | 0;
          cells.push(i);
          all.add(i);
          c0 = Math.min(c0, c); c1 = Math.max(c1, c); r0 = Math.min(r0, r); r1 = Math.max(r1, r);
          for (const j of [c > 0 ? i - 1 : -1, c < W - 1 ? i + 1 : -1, i - W, i + W]) {
            if (j >= 0 && j < W * H && !seen[j] && rock(j)) { seen[j] = 1; stack.push(j); }
          }
        }
        this.rocks.push({
          id: c0 + ',' + r1, layer, cells: new Set(cells), neuf: cells.some((i) => (layer.data[i] & 0x0fffffff) >= ROCKS.neufs),
          x: c0 * T, y: r0 * T, w: (c1 - c0 + 1) * T, h: (r1 - r0 + 1) * T, foot: (r1 + 1) * T - 2, img: null,
        });
      }
      this.occluded.set(layer, all);
    },

    // Les images des rochers, et la place qu'occupent vraiment leurs pixels (box : x0, y0,
    // x1, y1 en px de carte) : un caillou ne remplit pas sa case.
    makeRocks() {
      const raw = this.mapRaw;
      if (!raw || !this.has(MAP.tiles) || !this.rocks) return;
      const set = (raw.tilesets || []).find((t) => t.image && String(t.image).split('/').pop() === MAP.image);
      if (!set) return;
      const img = this.textures.get(MAP.tiles).getSourceImage();
      this.rocks.forEach((r, k) => {
        const key = 'rocher_' + k;
        if (r.img) r.img.destroy();
        if (this.textures.exists(key)) this.textures.remove(key);
        r.tex = this.textures.createCanvas(key, r.w, r.h);
        this.paintOccluder(r, raw, set, img);
        r.box = { x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h };
        try {
          const d = r.tex.getContext().getImageData(0, 0, r.w, r.h).data;
          let x0 = r.w, y0 = r.h, x1 = -1, y1 = -1;
          for (let y = 0; y < r.h; y++) {
            for (let x = 0; x < r.w; x++) {
              if (d[(y * r.w + x) * 4 + 3] < 128) continue;
              x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            }
          }
          if (x1 >= 0) r.box = { x0: r.x + x0, y0: r.y + y0, x1: r.x + x1 + 1, y1: r.y + y1 + 1 };
        } catch (e) { /* la boîte des cases suffit */ }
        r.img = this.add.image(r.x, r.y, key).setOrigin(0).setDepth(r.foot);
        r.img.setVisible(!r.gone);
      });
    },

    // Les rochers cassés (modèle.rochers : leurs identifiants) ne sont plus sur la carte ; un
    // rocher qui se brise sous la pioche attend son dernier coup (breaking). Un rocher qui
    // revient (quelques jours plus tard, au réveil) apparaît en fondu.
    syncRocks(ids) {
      if (!this.rocks) return;
      const broken = new Set(ids || []);
      const first = !this.rocksSynced;
      this.rocksSynced = true;
      let changed = false;
      for (const r of this.rocks) {
        const gone = broken.has(r.id);
        if (gone === !!r.gone || (gone && r.breaking)) continue;
        r.gone = gone;
        changed = true;
        if (!r.img) continue;
        this.tweens.killTweensOf(r.img);
        r.img.setVisible(!gone).setAlpha(1).setScale(1).setOrigin(0).setPosition(r.x, r.y);
        if (!gone && !first && !reducedMotion()) {
          r.img.setAlpha(0);
          this.tweens.add({ targets: r.img, alpha: 1, duration: ROCKS.backMs });
        }
      }
      if (changed && this.fermier && this.fermier.regrid) this.fermier.regrid();
    },

    // Le rocher sous le point (wx, wy) : le plus en avant dont l'image contient le point (la
    // zone d'appui d'un caillou est agrandie, comme celle d'un bâtiment).
    rockAt(wx, wy) {
      const min = (MIN_TAP * pixelRatio()) / this.cameras.main.zoom / 2;
      let best = null;
      for (const r of this.rocks || []) {
        if (r.gone || r.breaking || !r.box) continue;
        const b = r.box, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
        const hw = Math.max((b.x1 - b.x0) / 2, min * 0.6), hh = Math.max((b.y1 - b.y0) / 2, min * 0.6);
        if (Math.abs(wx - cx) > hw || Math.abs(wy - cy) > hh) continue;
        if (!best || r.foot > best.foot) best = r;
      }
      return best;
    },

    // Les pieds des rochers encore debout, pour le personnage (il les contourne).
    rockFeet() {
      return (this.rocks || []).filter((r) => !r.gone && r.box && r.box.x1 - r.box.x0 > 12)
        .map((r) => ({ x0: r.box.x0, x1: r.box.x1, base: r.foot }));
    },

    // Un coup de pioche sur le rocher `r` : le jeu compte le coup tout de suite (this.ctx.bridge.mine)
    // et pose sa pierre au sol ; le personnage va au rocher et frappe ; au coup, des éclats
    // sautent et la pierre tombe à son pied (à ramasser en marchant dessus). Au dernier coup, le
    // rocher se brise en une gerbe d'éclats, lâche ses pierres autour de lui et disparaît.
    // `fort` : le coup fort (coupfort.js : il compte plusieurs coups, la vue tremble plus).
    mine(r, fort) {
      const b0 = r.box || { x0: r.x, x1: r.x + r.w };
      const pied = { x: Math.round((b0.x0 + b0.x1) / 2), y: r.foot };
      const ou = this.piecePoints(pied, this.strikeSide(pied, Math.max(8, (b0.x1 - b0.x0) / 2 + 5)), null);
      const got = this.holdPieces(() => (this.ctx.bridge && this.ctx.bridge.mine ? this.ctx.bridge.mine(r.id, ou, !!fort) : null));
      if (!got) return;
      const M2 = got.morceaux || { coup: [], fin: [] };
      this.time.delayedCall(9000, () => this.revealPieces(M2.coup));   // (filet : le coup n'a pas été donné)
      if (got.casse) r.finPieces = M2.fin;
      r.queued = (r.queued || 0) + 1;
      if (got.casse) {
        r.breaking = true;
        // filet de sécurité : le personnage n'a pas donné le coup (la nuit, un autre lieu…)
        if (r.breakTimer) r.breakTimer.remove();
        r.breakTimer = this.time.delayedCall(9000, () => { if (r.breaking) this.breakRock(r, false); });
      }
      const hit = () => {
        r.queued = Math.max(0, r.queued - 1);
        this.revealPieces(M2.coup);
        K.secousse(this, fort ? 'fort' : 'coup');
        K.vibre(fort ? 'fort' : 'pioche');
        if (r.breaking && !r.queued) { this.breakRock(r, true); return; }
        this.shakeRock(r);
        const p = this.fermier && this.fermier.pos();
        this.spawnShards(r, ROCKS.shards, false, p ? p.x : null);
      };
      const b = r.box || { x0: r.x, x1: r.x + r.w };
      const foot = { x: Math.round((b.x0 + b.x1) / 2), y: r.foot };
      if (!this.fermier || !this.fermier.mine(foot, (b.x1 - b.x0) / 2, hit)) hit();
    },

    // Le rocher tressaute d'un pixel sous le coup.
    shakeRock(r) {
      if (!r.img || reducedMotion() || r.shaking) return;
      r.shaking = true;
      const xs = [1, -1, 1, 0];
      let k = 0;
      const timer = this.time.addEvent({
        delay: 50, repeat: xs.length - 1,
        callback: () => {
          if (r.img) r.img.x = r.x + xs[k];
          k += 1;
          if (k >= xs.length) { r.shaking = false; timer.remove(); }
        },
      });
    },

    // Le dernier coup : une gerbe d'éclats, le rocher s'affaisse et s'efface.
    breakRock(r, anim) {
      if (r.breakTimer) { r.breakTimer.remove(); r.breakTimer = null; }
      this.revealPieces(r.finPieces);            // ses pierres, autour de lui
      r.finPieces = null;
      r.breaking = false;
      r.gone = true;
      if (this.fermier && this.fermier.regrid) this.fermier.regrid();
      if (!r.img) return;
      if (!anim || reducedMotion()) { r.img.setVisible(false); return; }
      this.spawnShards(r, ROCKS.burst, true);
      const img = r.img;
      img.setOrigin(0.5, 1).setPosition(r.x + r.w / 2, r.y + r.h);
      this.tweens.add({
        targets: img, scaleY: 0.35, scaleX: 1.15, alpha: 0, duration: ROCKS.breakMs, ease: 'Quad.easeIn',
        onComplete: () => { img.setVisible(false).setOrigin(0).setScale(1).setAlpha(1).setPosition(r.x, r.y); },
      });
    },

    // Des éclats de pierre sautent du rocher (du côté où la pioche frappe, celui du
    // personnage en `fromX` ; de toute sa forme quand il se brise), retombent au sol autour
    // de lui, roulent un instant puis s'effacent.
    spawnShards(r, n, burst, fromX, palette) {
      if (reducedMotion()) return;
      const b = r.box || { x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h };
      const rnd = (a) => a[0] + Math.random() * (a[1] - a[0]);
      if (!this.shards) this.shards = [];
      for (let k = 0; k < n; k++) {
        const cx = (b.x0 + b.x1) / 2, side = fromX == null ? 0 : (fromX < cx ? -1 : 1);
        const hx = side ? cx + side * (b.x1 - b.x0) * 0.3 : cx;      // le point d'impact
        const x = burst ? b.x0 + Math.random() * (b.x1 - b.x0) : hx + (Math.random() - 0.5) * 4;
        const y = burst ? b.y0 + Math.random() * (b.y1 - b.y0) : b.y0 + (b.y1 - b.y0) * 0.35 + (Math.random() - 0.5) * 3;
        const sizes = burst ? ROCKS.burstSizes : ROCKS.sizes;
        const size = sizes[(Math.random() * sizes.length) | 0];
        const E = r.neuf ? ROCKS.eclats : K.NATURE.eclats;
        const colors = palette || (burst ? E.couleurs : E.coup);
        const color = colors[(Math.random() * colors.length) | 0];
        const obj = this.add.rectangle(Math.round(x), Math.round(y), size, Math.max(1, size - (Math.random() < 0.5 ? 1 : 0)), color).setOrigin(0.5, 1);
        // un coup : les éclats sautent surtout vers le personnage (hors du rocher, sur l'herbe)
        const dir = side && Math.random() < 0.75 ? side : (Math.random() < 0.5 ? -1 : 1);
        const floor = Math.max(y, b.y1) - 1 + rnd(ROCKS.fall) * (burst ? 1.4 : 1);
        this.shards.push({
          obj, x, y, floor, vx: dir * rnd(ROCKS.speed) * (burst ? 1.2 : 1), vy: -rnd(ROCKS.lift),
          t: 0, life: rnd(ROCKS.life) * (burst ? 1.2 : 1), landed: false,
        });
      }
    },

    stepShards(delta) {
      const list = this.shards;
      if (!list || !list.length) return;
      const dt = Math.min(delta, 50) / 1000;
      for (let k = list.length - 1; k >= 0; k--) {
        const s = list[k];
        s.t += dt * 1000;
        if (!s.landed) {
          s.vy += ROCKS.gravity * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          if (s.vy > 0 && s.y >= s.floor) {
            s.y = s.floor;
            if (Math.abs(s.vy) > 50) { s.vy *= -0.3; s.vx *= 0.5; }   // un petit rebond
            else { s.landed = true; }
          }
        } else {
          s.vx *= Math.pow(0.02, dt);                                  // il roule et s'arrête
          s.x += s.vx * dt;
        }
        s.obj.setPosition(Math.round(s.x), Math.round(s.y)).setDepth(s.floor + 0.5);
        const left = s.life - s.t;
        if (left < ROCKS.fade) s.obj.setAlpha(Math.max(0, left / ROCKS.fade));
        if (left <= 0) { s.obj.destroy(); list.splice(k, 1); }
      }
    },
  });
})(window);
