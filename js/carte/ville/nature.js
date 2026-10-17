/* carte/ville/nature.js — la scène de la ville : les arbres, les rochers et l'herbe haute.
 *
 * La carte de transition est comme la ferme : ses barrières, son herbe haute qui penche quand on
 * la traverse, ses arbres qu'on coupe la hache en main et ses rochers qu'on casse la pioche en
 * main (le moteur du jeu compte les coups, donne le bois et la pierre, les fait revenir quelques
 * jours plus tard). Les réglages communs avec la ferme : CarteKit.NATURE.
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const V = global.CarteVille;
  const { T, NATURE, HERO } = V.C;
  const { hote, reduced } = V;
  const etat = V.etat;

  const OMBRE = K.NATURE.ombre;

  V.partie({

    // ---------- les arbres, les rochers, l'herbe haute (comme à la ferme) ----------

    // Les cases sous le pied d'un arbre ou d'un rocher : on ne les traverse pas tant qu'il est là.
    blockUnder(o, dxs) {
      o.cells = [];
      const ty = Math.floor((o.y - 1) / T);
      for (const dx of dxs) {
        const tx = Math.floor((o.x + dx) / T);
        if (!this.walk[ty] || tx < 0 || tx >= this.walk[ty].length || o.cells.some((c) => c[0] === tx)) continue;
        o.cells.push([tx, ty, this.walk[ty][tx]]);
        this.walk[ty][tx] = false;
      }
    },

    unblock(o) {
      for (const [tx, ty, was] of o.cells || []) if (this.walk[ty]) this.walk[ty][tx] = was;
      o.cells = [];
    },

    makeNature(objects) {
      this.trees = [];
      this.rocks = [];
      this.grass = [];
      this.work = null;
      const H = hote();
      const id = (o) => etat.nom + ':' + Math.round(o.x) + ',' + Math.round(o.y);
      for (const o of objects('arbres')) {
        const d = NATURE.arbres[o.type];
        if (!d || !this.textures.exists(d.key) || (H && H.abattu && H.abattu(id(o)))) continue;
        const t = { id: id(o), kind: 'arbre', def: d, x: o.x, y: o.y, alpha: 1, shake: -1 };
        if (this.textures.exists(OMBRE.key)) t.shadow = this.add.image(Math.round(o.x + OMBRE.dx), Math.round(o.y + OMBRE.dy), OMBRE.key).setOrigin(0).setDepth(-60);
        t.img = this.add.image(Math.round(o.x), Math.round(o.y), d.key, 0).setOrigin(0.5, 1).setDepth(o.y);
        this.blockUnder(t, d.tronc);
        this.trees.push(t);
      }
      for (const o of objects('rochers')) {
        const prop = (n) => Number(((o.properties || []).find((q) => q.name === n) || {}).value) || 0;
        if (!this.rochersKey || !this.textures.exists(this.rochersKey) || (H && H.casse && H.casse(id(o)))) continue;
        const half = prop('demi') || 12, d = { half, h: prop('haut') || 20, reach: half + 8 };
        const tronc = [];
        for (let dx = -Math.max(0, half - 6); dx <= Math.max(0, half - 6); dx += 8) tronc.push(dx);
        if (!tronc.length) tronc.push(0);
        const r = { id: id(o), kind: 'rocher', def: d, x: o.x, y: o.y };
        r.img = this.add.image(Math.round(o.x), Math.round(o.y), this.rochersKey, prop('image')).setOrigin(0.5, 1).setDepth(o.y);
        this.blockUnder(r, tronc);
        this.rocks.push(r);
      }
      const G = K.NATURE.herbe;
      if (this.textures.exists(G.key)) {
        const rows = Math.floor((this.textures.get(G.key).frameTotal - 1) / G.frames) || 1;
        for (const o of objects('herbe_haute')) {
          const base = (Math.max(0, Number(o.type) | 0) % rows) * G.frames;
          const img = this.add.image(Math.round(o.x), Math.round(o.y), G.key, base).setOrigin(0.5, 1).setDepth(o.y - 1);
          // une nuance propre à chaque touffe (deux voisines ne se confondent pas)
          const n = Math.sin(o.x * 12.9898 + o.y * 78.233) * 43758.5453;
          const c = Math.round(255 * (1 - G.shade * (n - Math.floor(n))));
          img.setTint((c << 16) | (c << 8) | c);
          this.grass.push({ img, x: o.x, y: o.y, base, t: -1, dir: 1, inside: false });
        }
      }
      this.grassPrev = null;
    },

    // Un toucher sur un arbre (la hache en main) ou un rocher (la pioche en main) : on y va, puis
    // un coup. Sans l'outil, le toucher fait marcher, comme ailleurs.
    tapNature(w) {
      if (!this.trees || (!this.trees.length && !this.rocks.length)) return false;
      const H = hote(), outil = H && H.enMain ? H.enMain() : null;
      let list = [];
      if (outil === 'hache') list = this.trees.filter((t) => !t.down && Math.abs(w.x - t.x) <= t.def.w / 2 - 8 && w.y <= t.y + 3 && w.y >= t.y - t.def.h + 4);
      else if (outil === 'pioche') list = this.rocks.filter((r) => !r.down && Math.abs(w.x - r.x) <= r.def.half + 3 && w.y <= r.y + 4 && w.y >= r.y - r.def.h - 3);
      if (!list.length) return false;
      const o = list.sort((a, b) => b.y - a.y)[0];
      const P = this.heroPos, side = P.x < o.x ? -1 : 1;
      const spots = [side, -side].map((k) => ({ x: o.x + k * o.def.reach, y: o.y + 1 }));
      const spot = spots.find((q) => this.canWalk(Math.floor(q.x / T), Math.floor(q.y / T))) || spots[0];
      this.work = { o, outil, spot, started: false };
      this.path = [];
      if (Math.hypot(spot.x - P.x, spot.y - P.y) > 3) this.goTo(spot.x, spot.y);
      return true;
    },

    // Arrivé près de l'arbre ou du rocher : le geste (hache_cote, pioche_cote), le coup porte à la
    // troisième image (le moteur compte), puis le geste finit. Un coup par toucher.
    stepWork(dt) {
      const w = this.work;
      if (!w) return;
      const P = this.heroPos;
      if (!w.started) {
        if (this.path.length) return;
        if (Math.hypot(w.spot.x - P.x, w.spot.y - P.y) > 12 || w.o.down) { this.work = null; return; }
        w.started = true;
        w.t = 0;
        w.hit = false;
        this.hero.setFlipX(w.o.x < P.x);
        this.face = 'cote';
        this.mining = { frame: w.outil + '_cote_0' };
      }
      w.t += dt;
      const k = Math.min(3, Math.floor((w.t / NATURE.swing) * 4));
      this.mining.frame = w.outil + '_cote_' + k;
      if (k >= 2 && !w.hit) {
        w.hit = true;
        if (!this.hitNature(w)) { this.work = null; this.mining = null; return; }
      }
      if (w.t >= NATURE.swing) { this.work = null; this.mining = null; }
    },

    // Le coup : le moteur du jeu (le bois ou la pierre entre dans l'inventaire), puis ce qu'on
    // voit. false : rien (pas de partie, la nuit, plus d'énergie : un message l'a dit).
    hitNature(w) {
      const H = hote(), o = w.o;
      if (!H || !H.couper) { this.say('Il faut une partie en cours pour couper du bois ou casser des pierres.'); return false; }
      if (o.kind === 'arbre') {
        const r = H.couper(o.id);
        if (!r) return false;
        this.popGain({ bois: r.bois });
        K.vibre('hache');
        if (r.tombe) this.fellTree(o); else o.shake = 0;
        this.leaves(o, 5);
      } else {
        const r = H.piocher(o.id);
        if (!r) return false;
        this.popGain(r.items || { pierre: 1 });
        K.vibre('pioche');
        this.shards(o, r.casse ? 14 : 5);
        if (r.casse) this.breakRock(o);
        else if (!reduced()) this.tweens.add({ targets: o.img, x: o.img.x + (w.o.x < this.heroPos.x ? -1 : 1), duration: 50, yoyo: true });
      }
      return true;
    },

    // L'arbre abattu bascule autour de son pied, du côté opposé au personnage, puis s'efface.
    fellTree(t) {
      t.down = true;
      this.ombresSales = true;
      t.shake = -1;
      t.img.setFrame(0).setAlpha(1);
      this.unblock(t);
      const F = K.NATURE.chute, dir = t.x >= this.heroPos.x ? 1 : -1;
      const gone = () => { t.img.destroy(); if (t.shadow) t.shadow.destroy(); this.trees.splice(this.trees.indexOf(t), 1); };
      if (reduced()) { this.tweens.add({ targets: [t.img, t.shadow].filter(Boolean), alpha: 0, duration: 300, onComplete: gone }); return; }
      if (t.shadow) this.tweens.add({ targets: t.shadow, alpha: 0, duration: F.ms });
      this.tweens.add({
        targets: t.img, angle: dir * F.angle, duration: F.ms, ease: 'Quad.easeIn',
        onComplete: () => {
          K.secousse(this, 'chute');
          this.leaves(t, F.feuilles, dir);
          this.tweens.add({ targets: t.img, alpha: 0, delay: F.repos, duration: F.fondu, onComplete: gone });
        },
      });
    },

    breakRock(r) {
      r.down = true;
      this.ombresSales = true;
      this.unblock(r);
      this.tweens.add({ targets: r.img, alpha: 0, scaleX: 1.15, scaleY: 0.7, duration: reduced() ? 120 : 260, onComplete: () => { r.img.destroy(); this.rocks.splice(this.rocks.indexOf(r), 1); } });
    },

    // Des feuilles et des copeaux (un coup de hache ; l'arbre tombé : là où sa cime touche le sol).
    leaves(t, n, dir = 0) {
      if (reduced()) return;
      const F = K.NATURE.chute;
      for (let i = 0; i < n; i++) {
        const x0 = dir ? t.x + dir * (20 + Math.random() * 36) : t.x + (Math.random() - 0.5) * 30;
        const y0 = dir ? t.y - 4 - Math.random() * 10 : t.y - 30 - Math.random() * 26;
        const p = this.add.rectangle(x0, y0, 2, 2, F.couleurs[i % F.couleurs.length]).setDepth(t.y + 1);
        this.tweens.add({ targets: p, x: x0 + (Math.random() - 0.5) * 26, y: y0 + 10 + Math.random() * 16, alpha: 0, angle: 180, duration: 600 + Math.random() * 500, onComplete: () => p.destroy() });
      }
    },

    shards(r, n) {
      K.secousse(this, 'coup');
      if (reduced()) return;
      const C = K.NATURE.eclats.couleurs, side = r.x < this.heroPos.x ? 1 : -1;
      for (let i = 0; i < n; i++) {
        const s = this.add.rectangle(r.x + (Math.random() - 0.5) * 10, r.y - 8 - Math.random() * 8, i % 3 ? 2 : 3, 2, C[i % C.length]).setDepth(r.y + 1);
        this.tweens.add({ targets: s, x: s.x + side * (4 + Math.random() * 18) + (Math.random() - 0.5) * 12, y: s.y + 8 + Math.random() * 10, alpha: 0, duration: 380 + Math.random() * 300, onComplete: () => s.destroy() });
      }
    },

    // Ce que le personnage prend ({ objet: qté } : bois, pierre, minerai, poisson, trouvaille) :
    // la bulle « +1 🪵 » au-dessus de lui (CarteKit.bulleGain, la même qu'à la ferme), dans une
    // couche posée sur la carte (#map-stage), retirée avec la scène.
    popGain(items) {
      if (!this.gain) {
        const zone = this.game.canvas && this.game.canvas.parentNode;
        if (!zone) return;
        const couche = document.createElement('div');
        couche.className = 'stage-labels';
        zone.appendChild(couche);
        const H = hote();
        this.gain = K.bulleGain(couche, (id) => { const o = H && H.objet ? H.objet(id) : null; return o ? o.icone : id; });
        this.events.once('destroy', () => { couche.remove(); this.gain = null; });
      }
      this.gain.montre(items);
      this.placeGain();
    },

    // Chaque image : la bulle suit le personnage, sa pointe HERO.bulle px au-dessus de ses pieds
    // (px CSS dans la couche : le canvas est rendu à la densité de l'écran, CarteKit.ratio).
    placeGain() {
      if (!this.gain || !this.gain.visible()) return;
      const cam = this.cameras.main, k = cam.zoom / K.ratio(), P = this.heroPos;
      this.gain.place((P.x - cam.worldView.x) * k, (P.y - HERO.bulle - cam.worldView.y) * k);
    },

    // Chaque image : l'arbre qui vient d'être frappé tremble ; l'arbre devant le personnage
    // s'éclaircit ; l'herbe haute qu'il traverse penche.
    stepNature(dt) {
      if (!this.trees) return;
      const P = this.heroPos;
      for (const t of this.trees) {
        if (t.down) continue;
        if (t.shake >= 0) {
          t.shake += dt;
          const i = Math.floor(t.shake * NATURE.shakeFps);
          if (i >= NATURE.shake.length || reduced()) { t.shake = -1; t.img.setFrame(0); } else t.img.setFrame(NATURE.shake[i]);
        }
        const derriere = P.y < t.y - 1 && Math.abs(P.x - t.x) < t.def.w / 2 - 2 && P.y > t.y - t.def.h + 8;
        const want = derriere ? K.NATURE.devant : 1;
        if (t.alpha !== want) {
          t.alpha = K.fondu(t.alpha, want, dt * 1000);
          t.img.setAlpha(t.alpha);
        }
      }
      this.grassPrev = K.herbe(this.grass, P, this.grassPrev, dt * 1000);
    },
  });
})(window);
