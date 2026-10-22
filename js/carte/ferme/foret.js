/* carte/ferme/foret.js — la scène de la ferme : les arbres plantés d'une graine.
 *
 * Sur la ferme générée, une pomme de pin ou un gland se plante sur n'importe quelle case d'herbe
 * libre (js/engine/outils.js, planterGraine). Jeune pousse d'abord (cueillette.js, syncPousses),
 * c'est ensuite un arbre (modèle.foret : [{ id, espece, case }]) : un sapin ou un arbre clair de
 * la planche de la carte (CHOP_TREES.pin_clair, arbre_clair : leur `box`), son pied au milieu
 * du bas de sa case. Comme ceux de la carte, il a son image rangée selon son pied (un
 * « occluder », decor.js), s'efface un peu quand on passe derrière, porte une ombre, ferme sa
 * case au passage (blockCells) et se coupe à la hache (il entre dans mapTrees : hache.js) ;
 * abattu, il quitte le modèle une fois tombé.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T, MAP, CHOP_TREES } = F.C;

  const SORTE = { pin: 'pin_clair', arbre: 'arbre_clair' };
  // (la chute d'un arbre, du coup au fondu : CarteKit.NATURE.chute, avec de la marge)
  const C = global.CarteKit.NATURE.chute, FIN_CHUTE = C.ms + 2 * C.rebondMs + C.repos + C.fondu + 1000;

  F.partie({

    // Les arbres plantés grands du modèle : créés (image, place dans les arbres de la carte),
    // ôtés quand le jeu ne les a plus (une fois tombés sous la hache).
    syncForet(list) {
      if (!this.foret) this.foret = new Map();
      if (!this.has(MAP.tiles) || !this.occluders) return;
      const seen = new Set();
      let change = false;
      for (const a of list || []) {
        seen.add(a.id);
        if (this.foret.has(a.id)) continue;
        this.foret.set(a.id, this.planteArbre(a));
        change = true;
      }
      for (const [id, t] of this.foret) {
        if (seen.has(id) || t.falling) continue;
        const o = t.occ;
        if (o.img) o.img.destroy();
        // (sa texture sert encore à la copie qui tombe, hache.js fellTree : ôtée plus tard ; les
        // clés ne resservent pas, chaque arbre planté a son numéro)
        this.time.delayedCall(FIN_CHUTE, () => { if (this.textures.exists(o.key)) this.textures.remove(o.key); });
        this.occluders = this.occluders.filter((x) => x !== o);
        this.treeList = this.mapTrees().filter((x) => x !== t);
        this.foret.delete(id);
        change = true;
      }
      if (change) this.felledChanged();
    },

    // L'arbre planté `a` : son image (dans un canevas, peinte depuis la planche de la carte),
    // son occluder et son entrée dans mapTrees.
    planteArbre(a) {
      const kind = SORTE[a.espece] || SORTE.arbre, d = CHOP_TREES[kind];
      const [, , bw, bh] = d.box, w = bw * T, h = bh * T, cols = this.grid.cols;
      const c = a.case % cols, r = Math.floor(a.case / cols);
      const fx = c * T + T / 2, bas = (r + 1) * T, x = fx - w / 2, y = bas - h;
      const layer = { name: 'foret:' + a.id };
      const o = { layer, cells: new Set([a.case]), x, y, w, h, foot: bas - 3, img: null, alpha: 1, key: 'foret_' + a.id, plante: true };
      o.peindre = () => {
        const ctx = o.tex.getContext(), src = this.textures.get(MAP.tiles).getSourceImage();
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(src, d.box[0] * T, d.box[1] * T, w, h, 0, 0, w, h);
        o.tex.refresh();
        o.probe = this.probeOf(o.tex, w, h, o);
      };
      if (this.textures.exists(o.key)) this.textures.remove(o.key);
      o.tex = this.textures.createCanvas(o.key, w, h);
      o.peindre();
      o.img = this.add.image(x, y, o.key).setOrigin(0).setDepth(o.foot);
      this.occluders.push(o);
      const t = {
        id: a.id, layer, cells: o.cells, x0: x, y0: y, x1: x + w, y1: bas,
        foot: { x: fx, y: bas - 3 }, kind, ox: x, oy: y, buisson: false, plante: true, case: a.case, occ: o,
      };
      this.mapTrees().push(t);
      return t;
    },

    // Les cases que les arbres plantés ferment au passage (leur pied), sauf ceux abattus.
    foretCells() {
      return [...(this.foret || new Map()).values()].filter((t) => !t.gone && !t.falling).map((t) => t.case);
    },
  });
})(window);
