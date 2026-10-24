/* carte/ferme/vegetation.js — la scène de la ferme : la végétation du grand monde (fiche 5b).
 *
 * Chaque région du monde arrive du Worker avec sa végétation (js/engine/monde-vegetation.js :
 * reg.vegetation, { images, basses }, [sorte, x, y, variante] par plante, le pied en px). Les
 * dessins sont ceux de assets/vegetation.png (scripts/carte/vegetation.py), découpés d'après
 * assets/vegetation.json : une image par variante (cinq pour une plante qui penche), chacune son
 * pied.
 *
 *   - Les petites plantes (genre « basse » : fleurs, herbes, bruyère, fougères basses…) sont
 *     peintes dans le canevas de la région, sur son sol (sol.js paintMonde → peintVegetation) :
 *     aucune image de plus. La région en a aussi pour son bord peint (les mêmes que sa voisine).
 *   - Les arbres, les buissons et les plantes hautes ont chacun leur image (une découpe de la
 *     planche : pas de canevas), rangée selon son pied comme le personnage et les arbres de la
 *     ferme. Ils sont nombreux (une forêt dense : quelques centaines par région) : une région
 *     dessinée se découpe en blocs de BLOC × BLOC cases ; seuls les blocs près de la vue (à PRES
 *     px) ont leurs images, retirées au-delà de LOIN px (syncVegetation : quelques centaines à la
 *     fois). Un arbre ou un buisson devant le personnage, qui le cache (son masque, lu une fois par
 *     image de la planche), devient transparent comme ceux de la ferme (stepVegetation) ; il porte
 *     son ombre au soleil (soleil.js sunCasters). Les roseaux et les massettes penchent quand on
 *     les traverse (CarteKit.herbe, comme l'herbe haute de la ferme).
 *   - Marcher : les pieds des arbres et des buissons sont fermés dans la marche de la région
 *     (monde-sol.js), que le personnage lit déjà (caseMarchable) : rien à faire ici.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T, OCCLUDER_ALPHA } = F.C;
  const CLE = 'vegetation';
  const BLOC = 16, PRES = 96, LOIN = 384, MASQUE = 4;
  const CORPS = { l: 5, h: 26, pied: 2 };

  F.partie({

    // La planche découpée : chaque image a un numéro (CarteKit.herbe change l'image d'une plante
    // qui penche par son numéro) ; this.veg : { sortes, images: [sorte][k] → numéro, pieds, masques }.
    vegetationPrete() {
      if (this.veg !== undefined) return this.veg;
      this.veg = null;
      const M = this.ctx.monde;
      const table = this.cache.json.get('vegetation_cases');
      if (!M || !M.sortes || !table || !this.has(CLE)) return null;
      const tex = this.textures.get(CLE), src = tex.getSourceImage();
      let d = null;
      try {
        const cv = global.document.createElement('canvas');
        cv.width = src.width; cv.height = src.height;
        const g = cv.getContext('2d', { willReadFrequently: true });
        g.drawImage(src, 0, 0);
        d = g.getImageData(0, 0, src.width, src.height).data;
      } catch (e) { /* sans masques : le rectangle de l'image */ }
      const images = [], cadres = [];
      let n = 0;
      for (const s of M.sortes) {
        const liste = [];
        for (const [x, y, w, h, px, py] of table[s.nom] || []) {
          tex.add(n, 0, x, y, w, h);
          let mask = null;
          if (d) {
            const mw = Math.ceil(w / MASQUE), mh = Math.ceil(h / MASQUE), c = new Uint16Array(mw * mh);
            for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (d[((y + yy) * src.width + x + xx) * 4 + 3] > 128) c[((yy / MASQUE) | 0) * mw + ((xx / MASQUE) | 0)]++;
            mask = { M: MASQUE, mw, mh, cases: c.map((k) => (k * 2 >= MASQUE * MASQUE ? 1 : 0)) };
          }
          cadres[n] = { w, h, px, py, mask };
          liste.push(n++);
        }
        images.push(liste);
      }
      this.veg = { sortes: M.sortes, images, cadres };
      this.vegListe = [];        // les arbres et les buissons qui ont leur image
      this.vegHerbes = [];       // les plantes hautes qui penchent, qui ont leur image
      return this.veg;
    },

    // Peint les petites plantes de la région du monde `reg` dans `ctx` (déjà décalé en px de la
    // carte), celles des cases `seules` (un Set ; null : toutes).
    peintVegetation(ctx, reg, seules) {
      const V = this.vegetationPrete();
      if (!V || !reg.vegetation) return;
      const b = reg.vegetation.basses, src = this.textures.get(CLE).getSourceImage(), W = this.grid.cols;
      for (let k = 0; k < b.length; k += 4) {
        const x = b[k + 1], y = b[k + 2];
        if (seules && !seules.has(Math.floor((y - 1) / T) * W + Math.floor(x / T))) continue;
        const n = V.images[b[k]][b[k + 3]], c = V.cadres[n], f = this.textures.get(CLE).get(n);
        if (!f) continue;
        ctx.drawImage(src, f.cutX, f.cutY, c.w, c.h, x - c.px, y - c.py, c.w, c.h);
      }
    },

    // Les blocs d'une région dessinée (r.vegBlocs), dès que son sol est fait : ses arbres,
    // buissons et plantes hautes, rangés par bloc.
    vegetationRegion(r) {
      if (r.vegBlocs || !this.vegetationPrete()) return;
      const M = this.ctx.monde, reg = M.region(r.rx, r.ry);
      if (!reg || !reg.vegetation) return;
      const im = reg.vegetation.images, blocs = new Map(), P = BLOC * T;
      for (let k = 0; k < im.length; k += 4) {
        const cle = Math.floor(im[k + 1] / P) + ',' + Math.floor((im[k + 2] - 1) / P);
        if (!blocs.has(cle)) blocs.set(cle, { x: Math.floor(im[k + 1] / P) * P, y: Math.floor((im[k + 2] - 1) / P) * P, items: [], objets: null });
        blocs.get(cle).items.push(k);
      }
      r.vegReg = reg;
      r.vegBlocs = [...blocs.values()];
      this.vegCle = null;
    },

    // La région s'en va : les images de ses blocs avec elle.
    dropVegetation(r) {
      for (const b of r.vegBlocs || []) this.vegBlocOff(b);
      r.vegBlocs = r.vegReg = null;
    },

    // À chaque image : les blocs près de la vue prennent leurs images, ceux qui s'en éloignent
    // les perdent. Revu quand la vue change de case de 64 px.
    syncVegetation() {
      if (!this.ctx.monde || !this.regions || !this.vegetationPrete()) return;
      const c = this.cameras.main, vw = c.width / c.zoom, vh = c.height / c.zoom;
      const mx = c.scrollX + c.width * c.originX, my = c.scrollY + c.height * c.originY;
      const v = { x: mx - vw / 2, y: my - vh / 2, right: mx + vw / 2, bottom: my + vh / 2 };
      const cle = Math.floor(v.x / 64) + ',' + Math.floor(v.y / 64) + ',' + Math.ceil(v.right / 64) + ',' + Math.ceil(v.bottom / 64);
      if (cle === this.vegCle) return;
      this.vegCle = cle;
      const P = BLOC * T;
      // (un arbre déborde de son bloc : sa cime, au-dessus, jusqu'à 80 px)
      const loin = (b, m) => b.x > v.right + m || b.x + P < v.x - m || b.y - 80 > v.bottom + m || b.y + P < v.y - m;
      let change = false;
      for (const r of this.shownRegions()) {
        if (!r.vegBlocs) this.vegetationRegion(r);
        for (const b of r.vegBlocs || []) {
          if (!b.objets && !loin(b, PRES)) { this.vegBlocOn(b, r.vegReg); change = true; } else if (b.objets && loin(b, LOIN)) { this.vegBlocOff(b); change = true; }
        }
      }
      if (change) {
        this.vegListe = [];
        this.vegHerbes = [];
        for (const r of this.shownRegions()) {
          for (const b of r.vegBlocs || []) for (const o of b.objets || []) (o.herbe ? this.vegHerbes : this.vegListe).push(o.herbe || o);
        }
        this.sunDirty = true;
        this.cullKey = '';          // (les nouvelles images, hors de la vue : pas dessinées, decor.js cullDecor)
      }
    },

    vegBlocOn(b, reg) {
      const V = this.veg, im = reg.vegetation.images;
      b.objets = [];
      for (const k of b.items) {
        const s = V.sortes[im[k]], x = im[k + 1], y = im[k + 2], v = im[k + 3];
        const penche = !!s.penche, n = V.images[im[k]][penche ? v * 5 : v], c = V.cadres[n];
        if (n == null || !c) continue;
        const img = this.add.image(x, y, CLE, n).setOrigin(c.px / c.w, c.py / c.h).setDepth(y);
        const o = { img, x: x - c.px, y: y - c.py, w: c.w, h: c.h, foot: y, mask: c.mask, alpha: 1, ombre: s.genre !== 'haute' };
        if (penche) o.herbe = { img, fleurs: null, x, y, base: n, t: -1, dir: 1, inside: false };
        b.objets.push(o);
      }
    },

    vegBlocOff(b) {
      for (const o of b.objets || []) o.img.destroy();
      b.objets = null;
    },

    // À chaque image : un arbre ou un buisson devant le personnage, qui le cache, devient
    // transparent (comme ceux de la ferme : decor.js stepOccluders) ; les roseaux et les massettes
    // qu'il traverse penchent.
    stepVegetation(dt) {
      if (!this.vegListe) return;
      const p = this.fermier ? this.fermier.pos() : null;
      for (const o of this.vegListe) {
        // (seulement ceux qui pourraient le cacher : à côté de lui, le pied plus bas que le sien)
        const derriere = !!p && p.y < o.foot && p.x + CORPS.l > o.x && p.x - CORPS.l < o.x + o.w && p.y - CORPS.h < o.y + o.h
          && this.couvre(o, p.x - CORPS.l, p.y - CORPS.h, p.x + CORPS.l, p.y - CORPS.pied);
        const want = derriere ? OCCLUDER_ALPHA : 1;
        if (o.alpha === want) continue;
        o.alpha = K.fondu(o.alpha, want, dt);
        o.img.setAlpha(o.alpha);
      }
      if (this.vegHerbes.length) this.vegPrev = K.herbe(this.vegHerbes, p, this.vegPrev, dt);
    },

    // Les arbres et les buissons du monde qui portent une ombre (soleil.js sunCasters).
    vegetationOmbres() {
      return (this.vegListe || []).filter((o) => o.ombre);
    },
  });
})(window);
