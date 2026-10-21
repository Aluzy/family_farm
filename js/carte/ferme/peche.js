/* carte/ferme/peche.js — la scène de la ferme : la canne à pêche, l'étang et la mare.
 *
 * Les eaux de la carte, la rive d'où pêcher, le lancer, le bouchon (CarteKit.PECHE), la touche,
 * le poisson qui saute jusqu'au personnage.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T, FISHING } = F.C;
  const { reducedMotion } = F;

  F.partie({

    /* ---------- la canne à pêche : l'étang et la mare ---------- */

    // Les eaux de la carte (cases d'eau voisines, lues par la vie d'ambiance), une fois :
    // case « x,y » (px) → { eau: 'etang' | 'mare', cells }.
    waters() {
      if (this.waterMap) return this.waterMap;
      const g = this.ambient && this.ambient.ground ? this.ambient.ground() : null;
      const set = g && g.water;
      if (!set || !set.size) return new Map();
      const map = new Map();
      for (const k0 of set) {
        if (map.has(k0)) continue;
        const cells = [], stack = [k0], seen = new Set([k0]);
        while (stack.length) {
          const k = stack.pop();
          cells.push(k);
          const [x, y] = k.split(',').map(Number);
          for (const n of [(x - T) + ',' + y, (x + T) + ',' + y, x + ',' + (y - T), x + ',' + (y + T)]) {
            if (set.has(n) && !seen.has(n)) { seen.add(n); stack.push(n); }
          }
        }
        const eau = cells.length >= FISHING.etang ? 'etang' : cells.length >= FISHING.mare ? 'mare' : null;
        const w = { eau, cells: new Set(cells) };
        for (const k of cells) map.set(k, w);
      }
      return (this.waterMap = map);
    },

    // L'eau qui se pêche sous le point (wx, wy), ou null.
    waterAt(wx, wy) {
      const w = this.waters().get(Math.floor(wx / T) * T + ',' + Math.floor(wy / T) * T);
      return w && w.eau ? w : null;
    },

    // La rive d'où pêcher vers (wx, wy) : la case libre la plus proche qui touche (côtés)
    // cette eau ; le personnage s'y tient tourné vers la case d'eau voisine la plus proche du
    // point. Le bouchon se pose quelques cases d'eau plus loin dans ce sens.
    shoreFor(w, wx, wy) {
      if (!this.fermier || !this.fermier.standable) return null;
      const c0 = Math.floor(wx / T), r0 = Math.floor(wy / T);
      const isW = (c, r) => w.cells.has(c * T + ',' + r * T);
      let best = null;
      for (let r = r0 - 7; r <= r0 + 7; r++) {
        for (let c = c0 - 7; c <= c0 + 7; c++) {
          if (isW(c, r)) continue;
          const px = c * T + T / 2, py = r * T + T - 2;
          for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            if (!isW(c + dc, r + dr)) continue;
            const d = Math.hypot((c + dc) * T + T / 2 - wx, (r + dr) * T + T / 2 - wy) + Math.hypot(px - wx, py - wy) * 0.35;
            if (best && d >= best.d) continue;
            if (!this.fermier.standable(px, py)) break;
            best = { d, c, r, dc, dr, spot: { x: px, y: py } };
          }
        }
      }
      if (!best) return null;
      const { c, r, dc, dr } = best;
      let n = 1;
      while (n < FISHING.reach[1] && isW(c + dc * (n + 1), r + dr * (n + 1))) n++;
      n = Math.max(FISHING.reach[0], Math.min(n, FISHING.reach[0] + Math.floor(Math.random() * (FISHING.reach[1] - FISHING.reach[0] + 1))));
      const tc = c + dc * n, tr = r + dr * n;
      const jitter = () => (Math.random() - 0.5) * 6;
      return {
        spot: best.spot,
        face: dc ? 'cote' : dr > 0 ? 'bas' : 'haut', flip: dc < 0,
        target: { x: tc * T + T / 2 + (dc ? 0 : jitter()), y: tr * T + T / 2 + (dr ? 0 : jitter()) },
      };
    },

    // Pêcher dans l'eau `w` vers (wx, wy) : le jeu tire la prise tout de suite (this.ctx.bridge.fish) ;
    // le personnage va sur la rive, lance, le bouchon flotte ; à la touche il plonge, le
    // personnage ferre et le poisson saute jusqu'à lui (« +1 »).
    goFish(w, wx, wy) {
      if (this.fishing) return;                    // une ligne à la fois
      const rive = this.shoreFor(w, wx, wy);
      if (!rive && this.fermier) return;
      const got = this.ctx.bridge && this.ctx.bridge.fish ? this.ctx.bridge.fish(w.eau) : null;
      if (!got) return;
      const F = { got, target: rive ? rive.target : { x: wx, y: wy }, face: rive ? rive.face : 'bas', bob: null, line: null, t: 0, phase: 'go', reeled: 0 };
      this.fishing = F;
      const sec = K.PECHE.attente[0] + Math.random() * (K.PECHE.attente[1] - K.PECHE.attente[0]);
      const hooks = {
        cast: () => this.castBobber(F),
        bite: () => this.biteBobber(F),
        reel: () => this.reelLine(F),
      };
      if (!this.fermier || !this.fermier.fish(rive.spot, rive.face, rive.flip, sec, hooks)) {
        this.fishing = null;
        this.landCatch(F, null);
        return;
      }
      // filet de sécurité : la ligne ne reste pas posée si le personnage est parti ailleurs
      F.timer = this.time.delayedCall(30000, () => { if (this.fishing === F) this.endFishing(F); });
    },

    castBobber(F) {
      const tip = this.fermier && this.fermier.rodTip();
      const from = tip || { x: F.target.x, y: F.target.y - 20 };
      const g = this.add.graphics();
      g.fillStyle(K.PECHE.bouchon.haut, 1).fillRect(-1, -2, 3, 2);
      g.fillStyle(K.PECHE.bouchon.bas, 1).fillRect(-1, 0, 3, 1);
      g.setPosition(from.x, from.y).setDepth(F.target.y + 0.4);
      F.bob = g;
      F.line = this.add.graphics();
      F.phase = 'cast';
      const t0 = { k: 0 };
      this.tweens.add({
        targets: t0, k: 1, duration: reducedMotion() ? 1 : FISHING.castMs, ease: 'Sine.easeOut',
        onUpdate: () => {
          const k = t0.k;
          g.setPosition(from.x + (F.target.x - from.x) * k, from.y + (F.target.y - from.y) * k - Math.sin(k * Math.PI) * 14);
        },
        onComplete: () => { F.phase = 'wait'; F.t = 0; this.ripple(F.target.x, F.target.y + 1); },
      });
    },

    biteBobber(F) {
      if (!F.bob || !F.got.poisson) return;
      F.phase = 'bite';
      F.t = 0;
      this.ripple(F.target.x, F.target.y + 1);
      K.vibre('touche');
      const p = this.fermier && this.fermier.pos();
      if (p) {
        const mark = K.texte(this, p.x, p.y - 36, '!', 12).setDepth(p.y + 50);
        this.tweens.add({ targets: mark, y: mark.y - 5, alpha: 0, delay: 350, duration: 400, onComplete: () => mark.destroy() });
      }
    },

    reelLine(F) {
      F.phase = 'reel';
      const tip = (this.fermier && this.fermier.rodTip()) || { x: F.target.x, y: F.target.y - 20 };
      if (F.bob) {
        this.tweens.add({ targets: F.bob, x: tip.x, y: tip.y, duration: FISHING.reelMs, ease: 'Quad.easeIn', onComplete: () => this.endFishing(F) });
      } else this.endFishing(F);
      this.landCatch(F, tip);
    },

    // Le poisson pris saute de l'eau jusqu'au personnage (« +1 ») ; rien n'a mordu : « … ».
    landCatch(F, tip) {
      const poisson = F.got.poisson;
      const p = this.fermier && this.fermier.pos();
      if (!poisson) {
        if (!p) return;
        const t = K.texte(this, p.x, p.y - 34, '…', 10).setDepth(p.y + 50);
        this.tweens.add({ targets: t, y: t.y - 6, alpha: 0, delay: 500, duration: 500, onComplete: () => t.destroy() });
        return;
      }
      const key = this.fishTexture(poisson);
      if (!key || !p || reducedMotion()) { this.showGain({ [poisson]: 1 }); return; }
      this.ripple(F.target.x, F.target.y + 1);
      const img = this.add.image(F.target.x, F.target.y, key).setDepth(p.y + 40).setFlipX(p.x < F.target.x);
      const from = { x: F.target.x, y: F.target.y }, to = { x: p.x, y: p.y - 16 };
      const t0 = { k: 0 };
      this.tweens.add({
        targets: t0, k: 1, duration: FISHING.jumpMs, ease: 'Sine.easeInOut',
        onUpdate: () => {
          const k = t0.k;
          img.setPosition(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 18);
          img.setAngle(Math.sin(k * Math.PI * 4) * 25);
        },
        onComplete: () => {
          this.showGain({ [poisson]: 1 });
          this.tweens.add({ targets: img, alpha: 0, scale: 0.6, duration: 220, onComplete: () => img.destroy() });
        },
      });
    },

    endFishing(F) {
      if (F.timer) { F.timer.remove(); F.timer = null; }
      if (F.bob) { F.bob.destroy(); F.bob = null; }
      if (F.line) { F.line.destroy(); F.line = null; }
      if (this.fishing === F) this.fishing = null;
    },

    // Un rond qui s'élargit sur l'eau (avec l'eau vivante : le sien, eau.js rond).
    ripple(x, y) {
      if (reducedMotion() || (this.rond && this.rond(x, y, true))) return;
      const g = this.add.graphics().setDepth(y - 1);
      const o = { r: 1.5, a: 0.8 };
      this.tweens.add({
        targets: o, r: 7, a: 0, duration: 650, ease: 'Sine.easeOut',
        onUpdate: () => { g.clear(); g.lineStyle(1, 0xeaf6ff, o.a).strokeEllipse(x, y, o.r * 2, o.r); },
        onComplete: () => g.destroy(),
      });
    },

    // À chaque image : le fil va du bout de la canne au bouchon ; le bouchon flotte, plonge à
    // la touche.
    stepFishing(delta) {
      const F = this.fishing;
      if (!F || !F.bob) return;
      F.t += delta / 1000;
      if (F.phase === 'wait' && !reducedMotion()) F.bob.y = F.target.y + Math.round(Math.sin(F.t * 3) * 0.6);
      if (F.phase === 'bite') F.bob.y = F.target.y + (Math.floor(F.t * 10) % 2 ? 2 : 0);
      const tip = this.fermier && this.fermier.rodTip();
      const L = F.line;
      L.clear();
      if (!tip) return;
      const bx = F.bob.x, by = F.bob.y - 1;
      const sag = F.phase === 'wait' ? 5 : F.phase === 'bite' ? 1 : 2;
      L.lineStyle(1, K.PECHE.bouchon.fil, 0.85).beginPath().moveTo(tip.x, tip.y);
      for (let k = 1; k <= 10; k++) {
        const u = k / 10;
        L.lineTo(tip.x + (bx - tip.x) * u, tip.y + (by - tip.y) * u + Math.sin(u * Math.PI) * sag);
      }
      L.strokePath();
      const p = this.fermier.pos();
      L.setDepth(p ? (tip.face === 'haut' ? p.y - 0.5 : p.y + 0.5) : by);
    },

    // L'image d'un poisson (FISHING.fish), faite une fois.
    fishTexture(id) {
      const rows = FISHING.fish[id];
      if (!rows) return null;
      const key = 'poisson_' + id;
      if (this.textures.exists(key)) return key;
      const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
      const tex = this.textures.createCanvas(key, w, h);
      const ctx = tex.getContext();
      rows.forEach((row, y) => [...row].forEach((ch, x) => {
        const c = FISHING.fishColors[ch];
        if (!c) return;
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
      }));
      tex.refresh();
      return key;
    },
  });
})(window);
