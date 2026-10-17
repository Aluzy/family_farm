/* carte/ville/ombres.js — la scène de la ville : les ombres portées qui suivent le soleil.
 *
 * Sur les cartes où le jour et la nuit passent (la ville, la carte de transition, la montagne,
 * la plage), comme à la ferme (js/carte/ferme/soleil.js) : le soleil (CarteKit.soleil) fait
 * pencher les ombres vers la gauche le matin, vers la droite le soir, longues quand il est bas,
 * courtes à midi ; elles s'estompent à l'aube et au crépuscule. La couche « ombres » de la carte
 * (les ombres des arbres, fixes) est cachée.
 *
 * Ce qui porte une ombre : les bâtiments (leurs couches de tuiles, BATI), ce qui est debout dans
 * les couches OMBRES.couches (arbres et buissons, mobilier, réverbères, abri de bus…), et les
 * arbres et rochers qu'on abat ou qu'on casse (leurs images, js/carte/ville/nature.js). Les
 * tuiles sont prises par colonnes : une suite de tuiles d'une même colonne (toutes les couches
 * des bâtiments ensemble, chaque autre couche à part) a son pied sous sa dernière tuile, et son
 * ombre y est posée, inclinée (CarteKit.ombrePortee). Toutes les ombres sont peintes dans un
 * seul canevas, rendu noir et posé avec une seule transparence.
 *
 * La grande ville est trop grande pour un canevas : celui-ci couvre la vue et une marge
 * (OMBRES.marge px), et il est repeint quand la vue en approche du bord, quand l'heure avance
 * d'un pas (OMBRES.pas h) ou quand un arbre tombe, un rocher se brise (this.ombresSales).
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const V = global.CarteVille;
  const { T, BATI, OMBRES } = V.C;

  // Les suites de tuiles d'une même colonne : { x, y0, y1 (rangées), couches } pour chaque
  // groupe de couches (une case compte si l'une des couches du groupe y a une tuile).
  function suites(map, groupes) {
    const out = [];
    for (const couches of groupes) {
      const ls = couches.filter(Boolean);
      if (!ls.length) continue;
      const plein = (x, y) => ls.some((l) => { const t = l.getTileAt(x, y); return t && t.index >= 0; });
      for (let x = 0; x < map.width; x++) {
        let y0 = -1;
        for (let y = 0; y <= map.height; y++) {
          const p = y < map.height && plein(x, y);
          if (p && y0 < 0) y0 = y;
          else if (!p && y0 >= 0) { out.push({ x, y0, y1: y - 1, couches: ls }); y0 = -1; }
        }
      }
    }
    return out;
  }

  V.partie({

    // ---------- les ombres du soleil ----------

    makeShadows() {
      this.ombres = null;
      if (!this.voile || !this.map) return;
      if (this.layers.ombres) this.layers.ombres.setVisible(false);
      // (les ombres fixes des arbres qu'on abat : remplacées)
      for (const t of this.trees || []) if (t.shadow) { t.shadow.destroy(); t.shadow = null; }
      const groupes = [BATI.map((n) => this.layers[n])].concat(OMBRES.couches.map((n) => [this.layers[n]]));
      // rangées par colonne : on ne parcourt que celles de la vue
      const parColonne = Array.from({ length: this.map.width }, () => []);
      for (const s of suites(this.map, groupes)) parColonne[s.x].push(s);
      const fond = this.layers.ombres ? this.layers.ombres.depth + 0.5 : -99;
      this.ombres = { parColonne, tex: null, img: null, ox: 0, oy: 0, cle: null, fond };
      this.ombresSales = true;
    },

    stepShadows() {
      const O = this.ombres;
      if (!O) return;
      const h = this.heure ? this.heure.heure : OMBRES.sansHeure;
      const s = K.soleil(h);
      if (!s) { if (O.img) O.img.setVisible(false); O.cle = null; return; }
      const v = this.cameras.main.worldView, M = OMBRES.marge;
      const W = Math.ceil(v.width) + 2 * M, H = Math.ceil(v.height) + 2 * M;
      if (!O.tex || O.tex.width !== W || O.tex.height !== H) {
        const key = 'ombres_soleil_ville';
        if (O.img) O.img.destroy();
        if (this.textures.exists(key)) this.textures.remove(key);
        O.tex = this.textures.createCanvas(key, W, H);
        O.img = this.add.image(0, 0, key).setOrigin(0).setDepth(O.fond);
        this.ombresSales = true;
      }
      O.img.setVisible(true).setAlpha(s.alpha);
      // la vue s'approche du bord du canevas ? (moins de la moitié de la marge)
      const loin = v.x - O.ox < M / 2 || v.y - O.oy < M / 2 || O.ox + W - v.right < M / 2 || O.oy + H - v.bottom < M / 2;
      const cle = Math.round(h / OMBRES.pas);
      if (!loin && cle === O.cle && !this.ombresSales) return;
      O.cle = cle;
      this.ombresSales = false;
      O.ox = Math.floor(v.x) - M; O.oy = Math.floor(v.y) - M;
      O.img.setPosition(O.ox, O.oy);
      this.paintShadows(s, W, H);
    },

    paintShadows(s, W, H) {
      const O = this.ombres, ox = O.ox, oy = O.oy;
      const ctx = O.tex.getContext();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = false;
      // une ombre porte jusqu'à `portee` px de son pied : on prend ce qui est un peu hors du canevas
      const R = OMBRES.portee;
      const c0 = Math.max(0, Math.floor((ox - R) / T)), c1 = Math.min(this.map.width - 1, Math.floor((ox + W + R) / T));
      for (let x = c0; x <= c1; x++) {
        for (const r of O.parColonne[x]) {
          if ((r.y1 + 1) * T < oy - 8 || r.y0 * T > oy + H + R) continue;
          const pied = (r.y1 + 1) * T - OMBRES.base - oy;
          for (let y = r.y0; y <= r.y1; y++) {
            for (const l of r.couches) {
              const t = l.getTileAt(x, y);
              if (!t || t.index < 0 || !t.tileset) continue;
              const q = t.tileset.getTileTextureCoordinates(t.index);
              if (!q) continue;
              K.ombrePortee(ctx, s, t.tileset.image.getSourceImage(), q.x, q.y, T, T, x * T - ox, y * T - oy, T, T, pied, false);
            }
          }
        }
      }
      // les arbres et les rochers de la carte (leurs images)
      for (const o of (this.trees || []).concat(this.rocks || [])) {
        const im = o.img;
        if (o.down || !im || !im.active || !im.frame) continue;
        const f = im.frame, w = im.displayWidth, h = im.displayHeight;
        const x = im.x - im.originX * w, y = im.y - im.originY * h;
        if (x + w + R < ox || x - R > ox + W || y > oy + H + R || im.y < oy - 8) continue;
        K.ombrePortee(ctx, s, f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, x - ox, y - oy, w, h, o.y - oy, im.flipX);
      }
      K.noircir(ctx, W, H);
      O.tex.refresh();
    },
  });
})(window);
