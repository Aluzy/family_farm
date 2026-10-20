/* carte/ferme/soleil.js — la scène de la ferme : les ombres portées qui suivent le soleil.
 *
 * Le soleil (CarteKit.SOLEIL, js/carte/lumiere.js) se lève à l'est (à droite) et se couche à
 * l'ouest (à gauche) ; il passe au sud, du côté d'où l'on regarde la carte. Les ombres partent
 * donc vers le haut de la carte, derrière ce qui les porte, et penchent : vers la gauche le
 * matin, vers la droite le soir, longues quand le soleil est bas, courtes à midi (presque
 * cachées derrière). Elles s'estompent à l'aube et au crépuscule ; la nuit, il n'y en a pas.
 *
 * Ce qui porte une ombre : les bâtiments, le puits, la citerne, les arbres du verger, et les
 * arbres, buissons, barrières et rochers de la carte (leurs images, js/carte/ferme/decor.js,
 * pioche.js). Chaque ombre est la silhouette de son image, posée sur son pied et inclinée
 * (une transformation du canevas : cisaillement et écrasement). Les murs bâtis en blocs et les
 * toits, eux, sont des volumes (sunPrisms) : chaque mur, un pilier de sa case haut de ses
 * blocs ; chaque toit, posé sur ses murs, monte jusqu'à son faîtage. Leur ombre est celle du
 * volume (l'enveloppe de sa base et de son sommet projeté) : celles de deux murs voisins se
 * raccordent, un mur continu porte une ombre continue. Toutes sont peintes, opaques,
 * dans un seul canevas, rendu noir puis posé avec une seule transparence : deux ombres qui se
 * croisent ne font pas une tache plus sombre.
 *
 * Le canevas couvre la vue et une marge (SOLEIL.marge px), comme en ville (la ferme générée est
 * grande : js/engine/ferme-generee.js). Il n'est repeint que quand la vue en approche du bord,
 * quand l'heure avance de SOLEIL.pas heure ou qu'un bâtiment, un arbre change (this.sunDirty).
 * Il remplace les anciennes ombres fixes (copies décalées des bâtiments, ovales des arbres :
 * assets/ombres_arbres.png, ombre_arbre.png).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { SOLEIL, T, BLOCS_CARTE } = F.C;

  // L'enveloppe convexe de points [x, y] (la chaîne monotone).
  function enveloppe(pts) {
    const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const x = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const bas = [], haut = [];
    for (const p of P) { while (bas.length >= 2 && x(bas[bas.length - 2], bas[bas.length - 1], p) <= 0) bas.pop(); bas.push(p); }
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (haut.length >= 2 && x(haut[haut.length - 2], haut[haut.length - 1], p) <= 0) haut.pop(); haut.push(p); }
    return bas.slice(0, -1).concat(haut.slice(0, -1));
  }

  F.partie({

    /* ---------- les ombres du soleil ---------- */

    makeSun() {
      this.sunTex = null;
      this.sunImg = null;
      this.sunAt = { x: 0, y: 0 };      // le coin du canevas, en px de carte
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
      // (les murs et les portes hautes : des volumes, sunPrisms)
      for (const e of (this.blocks || new Map()).values()) if (e.sorte !== 'paillasse' && !e.plat && e.img.texture.key !== BLOCS_CARTE.hauts.key) sprite(e.img);
      return out;
    },

    // Les volumes qui portent une ombre : [{ base: [[x, y]…] (au sol), sommets: [[x, y, v]…]
    // (v : leur hauteur, px) }]. Un mur (ou une porte haute) : sa case, haute de ses blocs
    // (ETAGE.dy px par bloc) ; un toit : posé sur ses murs, son faîtage au milieu.
    sunPrisms() {
      const out = [], dy = BLOCS_CARTE.etage.dy;
      const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      for (const e of (this.blocks || new Map()).values()) {
        if (e.img.texture.key !== BLOCS_CARTE.hauts.key || !e.img.active) continue;
        const r = rect(e.x - T / 2, e.y - T, e.x + T / 2, e.y - SOLEIL.base), v = dy * (e.hauteur || 1);
        out.push({ base: r, sommets: r.map(([x, y]) => [x, y, v]) });
      }
      for (const t of this.toits || []) {
        if (!t.ombre) continue;
        const { x0, y0, x1, y1, v, faite } = t.ombre;
        const r = rect(x0, y0, x1, y1), ym = (y0 + y1) / 2, d = (y1 - y0) / 2;
        const fx0 = Math.min(x0 + d, (x0 + x1) / 2), fx1 = Math.max(x1 - d, (x0 + x1) / 2);
        out.push({ base: r, sommets: r.map(([x, y]) => [x, y, v]).concat([[fx0, ym, v + faite], [fx1, ym, v + faite]]) });
      }
      return out;
    },

    // À chaque image (dehors) : la vue approche du bord du canevas, l'heure a avancé d'un pas,
    // ou quelque chose a changé ? On repeint.
    stepSun() {
      const m = this.ctx.lastModel;
      const s = K.soleil(m ? m.heure : null);
      if (!s) { if (this.sunImg) this.sunImg.setVisible(false); this.sunKey = null; return; }
      const v = this.cameras.main.worldView, M = SOLEIL.marge;
      // (pas plus grand que la carte : la ferme dessinée tient dans un seul canevas)
      const W = Math.min(this.world.w, Math.ceil(v.width) + 2 * M), H = Math.min(this.world.h, Math.ceil(v.height) + 2 * M);
      if (!this.sunTex || this.sunTex.width !== W || this.sunTex.height !== H) {
        const key = 'ombres_soleil';
        if (this.sunImg) this.sunImg.destroy();
        if (this.textures.exists(key)) this.textures.remove(key);
        this.sunTex = this.textures.createCanvas(key, W, H);
        this.sunImg = this.add.image(0, 0, key).setOrigin(0).setDepth(SOLEIL.depth);
        this.sunDirty = true;
      }
      this.sunImg.setVisible(true).setAlpha(s.alpha);
      const A = this.sunAt;
      // la vue s'approche du bord du canevas ? (moins de la moitié de la marge, sauf au bord de la carte)
      const loin = (v.x - A.x < M / 2 && A.x > 0) || (v.y - A.y < M / 2 && A.y > 0)
        || (A.x + W - v.right < M / 2 && A.x + W < this.world.w) || (A.y + H - v.bottom < M / 2 && A.y + H < this.world.h);
      const key = Math.round(m.heure / SOLEIL.pas);
      if (!loin && key === this.sunKey && !this.sunDirty) return;
      this.sunKey = key;
      this.sunDirty = false;
      A.x = Math.max(0, Math.min(this.world.w - W, Math.floor(v.x) - M));
      A.y = Math.max(0, Math.min(this.world.h - H, Math.floor(v.y) - M));
      this.sunImg.setPosition(A.x, A.y);
      this.paintSun(s);
    },

    paintSun(s) {
      const ctx = this.sunTex.getContext(), W = this.sunTex.width, H = this.sunTex.height;
      const ox = this.sunAt.x, oy = this.sunAt.y, R = SOLEIL.portee;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = false;
      for (const c of this.sunCasters()) {
        // une ombre porte jusqu'à `portee` px de son pied : on prend ce qui est un peu hors du canevas
        if (c.x + c.w + R < ox || c.x - R > ox + W || c.y > oy + H + R || c.pied < oy - 8) continue;
        K.ombrePortee(ctx, s, c.src, c.sx, c.sy, c.sw, c.shh, c.x - ox, c.y - oy, c.w, c.h, c.pied - oy, c.flip);
      }
      // les volumes : l'enveloppe de leur base et de leurs sommets projetés (un point à v px de
      // haut va à sh·v à côté et k·v plus haut)
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000';
      for (const q of this.sunPrisms()) {
        const pts = q.base.concat(q.sommets.map(([x, y, v]) => [x + s.sh * v, y - s.k * v]));
        if (pts.every(([x]) => x < ox - 1) || pts.every(([x]) => x > ox + W + 1) || pts.every(([, y]) => y < oy - 1) || pts.every(([, y]) => y > oy + H + 1)) continue;
        const h = enveloppe(pts);
        ctx.beginPath();
        h.forEach(([x, y], i) => (i ? ctx.lineTo(x - ox, y - oy) : ctx.moveTo(x - ox, y - oy)));
        ctx.closePath();
        ctx.fill();
      }
      K.noircir(ctx, W, H);
      this.sunTex.refresh();
    },
  });
})(window);
