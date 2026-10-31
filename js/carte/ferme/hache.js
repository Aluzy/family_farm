/* carte/ferme/hache.js — la scène de la ferme : la hache, les arbres et les buissons de la carte.
 *
 * Les arbres de la carte (lus dans ses couches d'arbres), un coup de hache (le jeu compte, le
 * personnage frappe, l'arbre tremble), le dernier coup (l'arbre bascule : CarteKit.NATURE.chute),
 * les arbres abattus et ceux qui repoussent. Les buissons de la ferme générée tombent d'un coup.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { MAP, CHOP_TREES, CHOP_FPS } = F.C;
  const { reducedMotion } = F;

  const CHUTE = K.NATURE.chute;

  F.partie({

    /* ---------- la hache : les arbres de la carte ---------- */

    // Les arbres de la carte, lus une fois dans ses couches d'arbres : { id, layer, cells,
    // x0, y0, x1, y1 (bornes en px), foot: { x, y }, kind, buisson }. id : « colonne,rangée » de la
    // case du pied (ce que le jeu enregistre pour compter les coups du jour). buisson : un groupe
    // de 2 à 4 cases de large sur 2 de haut (le jeu ne le coupe que sur la ferme générée).
    // (lus dans les régions qui ont quelque chose, CarteKit.casesPleines, comme findOccluders)
    mapTrees() {
      if (this.treeList) return this.treeList;
      const list = [];
      const raw = this.mapRaw;
      if (!raw) return (this.treeList = list);
      const W = raw.width, H = raw.height, T = raw.tilewidth;
      const set = (raw.tilesets || []).find((t) => t.image && String(t.image).split('/').pop() === MAP.image);
      const cols = set ? set.columns || 75 : 75;
      const first = set ? set.firstgid : 1;
      const kindOf = (n) => {
        const c = n % cols, r = Math.floor(n / cols);
        for (const [k, d] of Object.entries(CHOP_TREES)) {
          const [bc, br, bw, bh] = d.box;
          if (c >= bc && c < bc + bw && r >= br && r < br + bh) return { kind: k, c: c - bc, r: r - br };
        }
        return null;
      };
      for (const layer of raw.layers) {
        if (layer.type !== 'tilelayer' || !Array.isArray(layer.data) || !/tree|arbre/i.test(layer.name || '') || /top|haut/i.test(layer.name || '')) continue;
        const seen = new Uint8Array(W * H);
        const gidAt = (i) => layer.data[i] & 0x0fffffff;
        for (const i0 of K.casesPleines(raw)) {
          if (seen[i0] || !gidAt(i0)) continue;
          const cells = [], stack = [i0];
          seen[i0] = 1;
          let c0 = W, c1 = 0, r0 = H, r1 = 0;
          while (stack.length) {
            const i = stack.pop(), c = i % W, r = (i / W) | 0;
            cells.push(i);
            c0 = Math.min(c0, c); c1 = Math.max(c1, c); r0 = Math.min(r0, r); r1 = Math.max(r1, r);
            for (const j of [c > 0 ? i - 1 : -1, c < W - 1 ? i + 1 : -1, i - W, i + W]) {
              if (j >= 0 && j < W * H && !seen[j] && gidAt(j)) { seen[j] = 1; stack.push(j); }
            }
          }
          const w = c1 - c0 + 1, h = r1 - r0 + 1;
          const buisson = w >= 2 && w <= 4 && h === 2;
          if (!buisson && (w < 2 || w > 6 || h < 3 || h > 7)) continue;   // souches, forêts soudées
          const foot = cells.filter((i) => ((i / W) | 0) === r1).map((i) => i % W);
          const fx = (Math.min(...foot) + Math.max(...foot) + 1) / 2 * T;
          // l'arbre du pack (feuillu, sapin) : son coin haut-gauche, d'après une de ses tuiles
          let kind = null, ox = 0, oy = 0;
          for (const i of cells) {
            const k = kindOf(gidAt(i) - first);
            if (k) { kind = k.kind; ox = ((i % W) - k.c) * T; oy = (((i / W) | 0) - k.r) * T; break; }
          }
          list.push({
            id: Math.floor(fx / T) + ',' + r1, layer, cells: new Set(cells),
            x0: c0 * T, y0: r0 * T, x1: (c1 + 1) * T, y1: (r1 + 1) * T,
            foot: { x: fx, y: (r1 + 1) * T - 3 }, kind: buisson ? null : kind, ox, oy, buisson,
          });
        }
      }
      return (this.treeList = list);
    },

    // L'arbre (ou le buisson) peut-il recevoir un coup de hache ? Pas tombé, pas en train de
    // tomber ; un buisson, seulement sur la ferme générée (modèle.buissons).
    choppable(t) {
      return !t.gone && !t.falling && (!t.buisson || !!(this.ctx.lastModel && this.ctx.lastModel.buissons));
    },

    // L'arbre sous le point (wx, wy) : le plus en avant (pied le plus bas) dont le houppier
    // ou le tronc contient le point.
    mapTreeAt(wx, wy) {
      let best = null;
      for (const t of this.mapTrees()) {
        if (!this.choppable(t)) continue;
        if (wx < t.x0 + 4 || wx > t.x1 - 4 || wy < t.y0 + 4 || wy > t.y1) continue;
        if (!best || t.foot.y > best.foot.y) best = t;
      }
      return best;
    },

    // Un coup de hache sur l'arbre `t` (la file des gestes, file.js) : il scintille ; le personnage
    // va au tronc ; arrivé, le jeu compte le coup (this.ctx.bridge.chop) et pose son bois au sol ;
    // il frappe, et au coup l'arbre tremble et le morceau tombe à son pied (à ramasser en marchant
    // dessus). Au dernier coup (got.tombe), l'arbre tombe (fellTree) et lâche les siens là où sa
    // cime touche le sol. `fort` : le coup fort (coupfort.js : tout de suite, il compte plusieurs
    // coups, la vue tremble plus).
    chop(t, fort) {
      // (l'arbre tombera du côté opposé au personnage, comme fellTree ; ses morceaux aussi)
      // (devant un buisson, il se place au bout de son pied : il ne marche pas dedans)
      const dx = t.buisson ? (t.x1 - t.x0) / 2 + 2 : 11;
      let M2 = null;
      const faire = () => {
        const p = this.strikeSide(t.foot, dx);
        const ou = this.piecePoints(t.foot, p, p.x > t.foot.x ? -1 : 1);
        const got = this.holdPieces(() => (this.ctx.bridge && this.ctx.bridge.chop ? this.ctx.bridge.chop(t.id, ou, !!fort) : null));
        if (!got) return false;
        M2 = got.morceaux || { coup: [], fin: [] };
        const M = M2;
        this.time.delayedCall(9000, () => this.revealPieces(M.coup));   // (filet : le coup n'a pas été donné)
        if (got.tombe) t.finPieces = M2.fin;
        t.queued = (t.queued || 0) + 1;
        if (got.tombe) {
          t.falling = true;
          // filet de sécurité : le personnage n'a pas donné le coup (la nuit, un autre lieu…)
          if (t.fallTimer) t.fallTimer.remove();
          t.fallTimer = this.time.delayedCall(9000, () => { if (t.falling) this.fellTree(t, false); });
        }
        return true;
      };
      const hit = () => {
        if (!M2) return;
        t.queued = Math.max(0, t.queued - 1);
        this.revealPieces(M2.coup);
        K.vibre(fort ? 'fort' : 'hache');
        if (fort) K.secousse(this, 'fort');
        // le coup (le fichier commence par l'élan : on part à l'impact)
        if (global.FermeSon) global.FermeSon.joue(t.buisson ? 'recolte' : 'hache', { x: t.foot.x, y: t.foot.y, depuis: t.buisson ? 0 : 0.16, gain: fort ? 1.25 : 1, vitesse: fort ? 0.9 : 1, ecart: 0 });
        if (t.falling && !t.queued) { this.fellTree(t, true); return; }
        this.shakeTree(t);
      };
      this.geste({
        cle: 'arbre:' + t.id, immediat: !!fort, action: 'couper',
        images: () => { const o = this.occluderOf(t); return o ? [o.img] : []; },
        valide: () => !t.gone && !t.falling, faire, coup: hit,
        lance: (opts) => this.fermier.chop(t.foot, hit, dx, opts),
      });
    },

    // Le dernier coup de hache : l'arbre bascule autour de son pied, du côté opposé au
    // personnage, rebondit au sol en lâchant feuilles et copeaux, puis s'efface. Son ombre
    // s'en va, sa place se libère (le personnage y passe).
    fellTree(t, anim) {
      if (t.fallTimer) { t.fallTimer.remove(); t.fallTimer = null; }
      const o = this.occluderOf(t);
      // ses morceaux, quand il touche le sol (tout de suite, sans animation)
      const lache = () => { this.revealPieces(t.finPieces); t.finPieces = null; };
      const done = () => {
        t.falling = false;
        t.gone = true;
        if (o && o.img) o.img.setVisible(false);
        this.felledChanged();
        // (un arbre planté : le jeu ne l'a plus, il quitte la scène ; foret.js)
        if (t.plante && this.ctx.lastModel) this.syncForet(this.ctx.lastModel.foret);
      };
      // le son de la chute : le craquement pendant qu'il bascule (CHUTE.ms), le fracas quand il touche
      // le sol ; un buisson : un froissement
      if (anim && global.FermeSon) global.FermeSon.joue(t.buisson ? 'arracher' : 'arbre_tombe', { x: t.foot.x, y: t.foot.y, depuis: t.buisson || reducedMotion() ? 0 : 1.7 - CHUTE.ms / 1000 });
      if (!o || !o.img || !anim || reducedMotion() || !this.textures.exists(o.img.texture.key)) { done(); lache(); return; }
      if (t.buisson) {
        // un buisson ne bascule pas : il part en feuilles et en brindilles
        if (o.shake) { o.shake.destroy(); o.shake = null; t.shaking = false; }
        this.spawnShards({ box: { x0: t.x0 + 4, x1: t.x1 - 4, y0: t.y0 + 4, y1: t.foot.y } }, CHUTE.feuilles, true, null, CHUTE.couleurs);
        done();
        lache();
        return;
      }
      if (o.shake) { o.shake.destroy(); o.shake = null; t.shaking = false; }
      const p = this.fermier && this.fermier.pos();
      const dir = p && p.x > t.foot.x ? -1 : 1;
      // une copie de l'image de l'arbre, qui tourne autour de son pied
      const img = this.add.image(t.foot.x, t.foot.y, o.img.texture.key)
        .setOrigin((t.foot.x - o.x) / o.w, (t.foot.y - o.y) / o.h).setDepth(o.foot).setAlpha(o.alpha == null ? 1 : o.alpha);
      o.img.setVisible(false);
      this.tweens.add({
        targets: img, angle: dir * CHUTE.angle, duration: CHUTE.ms, ease: 'Quad.easeIn',
        onComplete: () => {
          // il touche le sol : feuilles et copeaux, un petit rebond, puis il s'efface
          const len = t.foot.y - o.y;
          const x0 = dir > 0 ? t.foot.x + len * 0.25 : t.foot.x - len;
          this.spawnShards({ box: { x0, x1: x0 + len * 0.75, y0: t.foot.y - 10, y1: t.foot.y + 2 } }, CHUTE.feuilles, true, null, CHUTE.couleurs);
          K.secousse(this, 'chute');
          done();
          lache();
          this.tweens.add({
            targets: img, angle: dir * (CHUTE.angle - CHUTE.rebond), duration: CHUTE.rebondMs, yoyo: true, ease: 'Sine.easeOut',
            onComplete: () => this.tweens.add({ targets: img, alpha: 0, delay: CHUTE.repos, duration: CHUTE.fondu, onComplete: () => img.destroy() }),
          });
        },
      });
    },

    // Les arbres abattus (modèle.abattus : leurs identifiants) ne sont plus sur la carte ; un
    // arbre qui tombe sous la hache attend son dernier coup (falling). Un arbre qui repousse
    // (quelques jours plus tard, au réveil) apparaît en fondu.
    syncFelled(ids) {
      const down = new Set(ids || []);
      const first = !this.felledSynced;
      this.felledSynced = true;
      let changed = false;
      for (const t of this.mapTrees()) {
        if (t.plante) continue;   // (un arbre planté : foret.js)
        const gone = down.has(t.id);
        if (gone === !!t.gone || (gone && t.falling)) continue;
        t.gone = gone;
        changed = true;
        const o = this.occluderOf(t);
        if (o) o.vu = !gone;                 // (pour son image, si elle se refait : decor.js showObj)
        if (!o || !o.img) continue;
        this.tweens.killTweensOf(o.img);
        o.regrowing = false;
        o.img.setVisible(!gone).setAlpha(1);
        o.alpha = 1;
        if (!gone && !first && !reducedMotion()) {
          o.regrowing = true;
          o.img.setAlpha(0);
          this.tweens.add({ targets: o.img, alpha: 1, duration: CHUTE.repousse, onComplete: () => { o.regrowing = false; } });
        }
      }
      if (changed) this.felledChanged();
    },

    // Les arbres abattus ont changé : leurs ombres, et les cases où le personnage passe.
    felledChanged() {
      this.arbresCases = null;          // (les rayons des fenêtres : fenetres.js casesArbres)
      this.felledFeet = new Set(this.mapTrees().filter((t) => t.gone && !t.buisson).map((t) => t.foot.x + ',' + t.foot.y));
      // les buissons coupés (« x0,pied », comme ambient-life.js les relève) : on y passe
      this.felledBushes = new Set(this.mapTrees().filter((t) => t.gone && t.buisson).map((t) => t.x0 + ',' + (t.y1 - 2)));
      this.sunDirty = true;
      if (this.ambient && this.ambient.setContext) this.ambient.setContext({ felled: this.felledFeet });
      if (this.fermier && this.fermier.regrid) this.fermier.regrid();
    },

    // L'arbre tremble : celui qui a une feuille de sprites la joue (l'image de l'arbre est
    // masquée le temps de l'animation), les autres bougent d'un pixel de gauche à droite.
    shakeTree(t) {
      if (t.shaking) return;
      const d = t.kind ? CHOP_TREES[t.kind] : null;
      const o = this.occluderOf(t);
      if (!o || !o.img || reducedMotion()) return;
      if (d && this.has(d.key)) {
        // l'image de l'arbre laisse la place à sa feuille, à la même profondeur
        t.shaking = true;
        o.img.setVisible(false);
        const s = this.add.sprite(t.ox + d.dx, t.oy + d.dy, d.key, d.frames[0]).setOrigin(0).setDepth(o.foot).setAlpha(o.alpha);
        o.shake = s;
        let k = 0;
        const timer = this.time.addEvent({
          delay: 1000 / (d.fps || CHOP_FPS), repeat: d.frames.length - 1,
          callback: () => {
            k += 1;
            if (k < d.frames.length) { s.setFrame(d.frames[k]); return; }
            s.destroy();
            o.shake = null;
            o.img.setVisible(true);
            t.shaking = false;
            timer.remove();
          },
        });
        return;
      }
      // sans feuille de sprites : l'image de l'arbre bouge d'un pixel de gauche à droite
      t.shaking = true;
      const xs = [1, -1, 1, -1, 0];
      let k = 0;
      const timer = this.time.addEvent({
        delay: 70, repeat: xs.length - 1,
        callback: () => {
          o.img.x = o.x + xs[k];
          k += 1;
          if (k >= xs.length) { t.shaking = false; timer.remove(); }
        },
      });
    },
  });
})(window);
