/* carte/ferme/soleil.js — la scène de la ferme : les ombres portées qui suivent le soleil.
 *
 * Le soleil se lève à l'est (à droite) à SOLEIL.lever heures et se couche à l'ouest (à gauche)
 * à SOLEIL.coucher ; il passe au sud, du côté d'où l'on regarde la carte. Les ombres partent
 * donc vers le haut de la carte, derrière ce qui les porte, et penchent : vers la gauche le
 * matin, vers la droite le soir, longues quand le soleil est bas, courtes à midi (presque
 * cachées derrière). Elles s'estompent à l'aube et au crépuscule ; la nuit, il n'y en a pas.
 *
 * Ce qui porte une ombre : les bâtiments, le puits, la citerne, les arbres du verger, et les
 * arbres, buissons, barrières et rochers de la carte (leurs images, js/carte/ferme/decor.js,
 * pioche.js). Chaque ombre est la silhouette de son image, posée sur son pied et inclinée
 * (une transformation du canevas : cisaillement et écrasement). Toutes sont peintes, opaques,
 * dans un seul canevas de la taille de la carte, rendu noir puis posé avec une seule
 * transparence : deux ombres qui se croisent ne font pas une tache plus sombre.
 *
 * Le canevas n'est repeint que quand l'heure avance de SOLEIL.pas heure (ou qu'un bâtiment,
 * un arbre change : this.sunDirty). Il remplace les anciennes ombres fixes (copies décalées
 * des bâtiments, ovales des arbres : assets/ombres_arbres.png, ombre_arbre.png).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { SOLEIL } = F.C;

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  // Le soleil à l'heure h : { sh, k, alpha } (null : il est couché). sh : le cisaillement (de
  // combien le haut de l'ombre glisse sur le côté, pour un px de hauteur : négatif à gauche) ;
  // k : l'écrasement (la hauteur de l'ombre, pour un px de hauteur de l'objet).
  function soleil(h) {
    const S = SOLEIL;
    if (h == null || h <= S.lever || h >= S.coucher) return null;
    const t = Math.PI * (h - S.lever) / (S.coucher - S.lever);
    const haut = Math.sin(t);                    // 0 à l'horizon, 1 à midi
    return {
      sh: -Math.cos(t) * S.penche,
      k: S.longueur[1] - (S.longueur[1] - S.longueur[0]) * haut,
      alpha: S.alpha * clamp01(Math.min(h - S.lever, S.coucher - h) / S.fondu),
    };
  }

  F.partie({

    /* ---------- les ombres du soleil ---------- */

    makeSun() {
      const key = 'ombres_soleil';
      if (this.textures.exists(key)) this.textures.remove(key);
      this.sunTex = this.textures.createCanvas(key, this.world.w, this.world.h);
      this.sunImg = this.add.image(0, 0, key).setOrigin(0).setDepth(SOLEIL.depth).setVisible(false);
      this.sunKey = null;
      this.sunDirty = true;
    },

    // Ce qui porte une ombre : { src, sx, sy, w, h, x, y, flip } (l'image source, la partie à
    // prendre, où elle est posée sur la carte, retournée ?) et `pied` (y du sol sous elle).
    sunCasters() {
      const out = [];
      const sprite = (s, pied) => {
        if (!s || !s.visible || !s.active || !s.frame || !s.texture || s.texture.key.indexOf('ph_') === 0 || s.angle) return;
        const f = s.frame, w = s.displayWidth, h = s.displayHeight;
        const x = s.x - s.originX * w, y = s.y - s.originY * h;
        out.push({ src: f.source.image, sx: f.cutX, sy: f.cutY, sw: f.cutWidth, shh: f.cutHeight, x, y, w, h, flip: s.flipX, pied: pied == null ? y + h - SOLEIL.base : pied });
      };
      for (const e of (this.buildings || new Map()).values()) sprite(e.sprite);
      sprite(this.well);
      sprite(this.tank);
      for (const e of (this.trees || new Map()).values()) sprite(e.sprite);
      for (const o of (this.occluders || []).concat(this.rocks || [])) if (o.img && o.tex && !o.gone) sprite(o.img, o.foot);
      return out;
    },

    // À chaque image (dehors) : l'heure a avancé d'un pas, ou quelque chose a changé ? On repeint.
    stepSun() {
      if (!this.sunTex) return;
      const m = this.ctx.lastModel;
      const s = soleil(m ? m.heure : null);
      if (!s) { this.sunImg.setVisible(false); this.sunKey = null; return; }
      this.sunImg.setVisible(true).setAlpha(s.alpha);
      const key = Math.round(m.heure / SOLEIL.pas);
      if (key === this.sunKey && !this.sunDirty) return;
      this.sunKey = key;
      this.sunDirty = false;
      this.paintSun(s);
    },

    paintSun(s) {
      const ctx = this.sunTex.getContext();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.sunTex.width, this.sunTex.height);
      ctx.imageSmoothingEnabled = false;
      for (const c of this.sunCasters()) {
        // un point de l'image à `v` px au-dessus du pied va à sh × v à côté, k × v au-dessus
        // du pied : (u, v') de l'image → (x + u + sh·(pied − y − v'), pied − k·(pied − y − v'))
        const top = c.pied - c.y;
        ctx.setTransform(1, 0, -s.sh, s.k, c.x + s.sh * top, c.pied - s.k * top);
        if (c.flip) { ctx.translate(c.w, 0); ctx.scale(-1, 1); }
        try { ctx.drawImage(c.src, c.sx, c.sy, c.sw, c.shh, 0, 0, c.w, c.h); } catch (e) { /* image pas prête */ }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // tout ce qui est peint devient noir (sa transparence est gardée)
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, this.sunTex.width, this.sunTex.height);
      ctx.globalCompositeOperation = 'source-over';
      this.sunTex.refresh();
    },
  });
})(window);
