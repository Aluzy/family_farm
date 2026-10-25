/* carte/ferme/vegetation.js — la scène de la ferme : la végétation du grand monde (fiche 5b), ses
 * rochers, ses falaises et sa côte (fiche 5c).
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
 * Les rochers (fiche 5c, js/engine/monde-roches.js : reg.roches, { images, basses }, de même forme)
 * suivent le même chemin avec leur planche, assets/roches.png (scripts/carte/roches.py, découpée
 * d'après assets/roches.json) : les galets, pierres, coquillages, algues et congères sont peints
 * dans le sol (après les petites plantes) ; les gros blocs, pitons, éboulis, rochers et sapins
 * enneigés, l'épave et les colonnes des falaises sont des images rangées selon leur pied, dans les
 * mêmes blocs, transparentes quand le personnage passe derrière ; tous portent leur ombre, sauf les
 * falaises (leur face regarde le soleil). Autour d'un rocher dans l'eau, l'écume bat : une image
 * sous lui, sur l'eau, dont les quatre dessins tournent (ECUME ms chacun ; immobile avec
 * « animations réduites »).
 *
 * Les lieux du plan qui ont leur dessin (fiche 6b, js/engine/monde-lieux.js : reg.lieux, de même
 * forme) suivent encore le même chemin, avec leur planche (assets/lieux_monde.png,
 * scripts/carte/lieux.py) : la bouche des grottes de la montagne, rangée selon son pied ; le ponton
 * d'un coin de pêche, posé sur l'eau sous tout le reste (le personnage y marche) ; les piquets. Et
 * les hameaux bâtis (fiche 7a, js/engine/monde-hameaux.js : reg.hameau ; assets/hameaux.png) : leurs
 * murs, portes, meubles, clôtures, objets et arbres en images ; leurs planchers, pavés et potagers
 * peints dans le sol (leurs toits : hameaux.js).
 *
 * Ce qui se prend (fiche 6a, recolte-monde.js) : chaque image d'une pièce qui se prend porte son
 * identifiant (« sorte:x,y », ctx.monde.idObjet) et sa règle (RECOLTE.SORTES) ; une pièce prise a
 * son image cachée, une plante cueillie son dessin sans fruits (modèle.monde) ; une petite pièce
 * prise n'est pas peinte. Une région refaite (sortie de la vue puis revenue) se dessine d'après eux.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T, OCCLUDER_ALPHA } = F.C;
  const { reducedMotion } = F;
  // les deux planches : la végétation (fiche 5b), les rochers (fiche 5c) ; leurs sortes (ctx.monde)
  const PLANCHES = [
    { cle: 'vegetation', json: 'vegetation_cases', donnees: 'vegetation', sortes: 'sortes' },
    { cle: 'roches', json: 'roches_cases', donnees: 'roches', sortes: 'roches' },
    // les lieux qui ont leur dessin (fiche 6b, js/engine/monde-lieux.js : l'entrée des grottes, le
    // ponton et les piquets des coins de pêche ; scripts/carte/lieux.py)
    { cle: 'lieux_monde', json: 'lieux_monde_cases', donnees: 'lieux', sortes: 'lieuxSortes' },
    // les hameaux bâtis (fiche 7a, js/engine/monde-hameaux.js : leurs murs, leurs meubles, leurs
    // clôtures, leurs objets ; scripts/carte/hameaux.py) ; leurs toits : hameaux.js
    { cle: 'hameaux', json: 'hameaux_cases', donnees: 'hameau', sortes: 'hameauSortes' },
  ];
  // (PRES et LOIN : 96 et 384 px, ou 32 et 192 en qualité « économie » : CarteKit.reglages, fiche 9a)
  const BLOC = 16, MASQUE = 4, ECUME = 240;
  const CORPS = { l: 5, h: 26, pied: 2 };

  F.partie({

    // Les planches découpées : chaque image a un numéro dans sa texture (CarteKit.herbe change
    // l'image d'une plante qui penche par son numéro) ; this.veg : { planches: [{ cle, sortes,
    // images: [sorte][k] → numéro, cadres }], ecume (les numéros des images de l'écume) }.
    vegetationPrete() {
      if (this.veg !== undefined) return this.veg;
      this.veg = null;
      const M = this.ctx.monde;
      if (!M || !M.sortes) return null;
      const planches = [];
      for (const P of PLANCHES) {
        const table = this.cache.json.get(P.json);
        if (!table || !this.has(P.cle) || !M[P.sortes]) return null;
        const tex = this.textures.get(P.cle), src = tex.getSourceImage();
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
        const decoupe = (liste, x, y, w, h, px, py) => {
          tex.add(n, 0, x, y, w, h);
          let mask = null;
          if (d) {
            const mw = Math.ceil(w / MASQUE), mh = Math.ceil(h / MASQUE), c = new Uint16Array(mw * mh);
            for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (d[((y + yy) * src.width + x + xx) * 4 + 3] > 128) c[((yy / MASQUE) | 0) * mw + ((xx / MASQUE) | 0)]++;
            mask = { M: MASQUE, mw, mh, cases: c.map((k) => (k * 2 >= MASQUE * MASQUE ? 1 : 0)) };
          }
          cadres[n] = { w, h, px, py, mask };
          liste.push(n++);
        };
        for (const s of M[P.sortes]) {
          const liste = [];
          for (const [x, y, w, h, px, py] of table[s.nom] || []) decoupe(liste, x, y, w, h, px, py);
          images.push(liste);
        }
        const ecume = [];
        for (const [x, y, w, h, px, py] of table.ecume || []) decoupe(ecume, x, y, w, h, px, py);
        // (ce que donne chaque sorte, par son code : RECOLTE.SORTES, ou rien, du décor)
        const regles = M[P.sortes].map((s) => (M.regles && M.regles[s.nom]) || null);
        planches.push({ cle: P.cle, donnees: P.donnees, sortes: M[P.sortes], images, cadres, ecume, regles });
      }
      this.veg = { planches };
      this.vegListe = [];        // les arbres, les buissons, les rochers qui ont leur image
      this.vegHerbes = [];       // les plantes hautes qui penchent, qui ont leur image
      this.vegEcumes = [];       // l'écume autour des rochers dans l'eau
      this.mondeOccupe = this.mondeOccupe || new Set();   // celles dont le geste est en cours
      this.mondeObjets = new Map();   // les pièces qui se prennent et ont leur image, par identifiant (recolte-monde.js)
      return this.veg;
    },

    // Peint les petites plantes et les petites pièces (galets, coquillages…) de la région du monde
    // `reg` dans `ctx` (déjà décalé en px de la carte) : toutes, ou, `seules` (un Set de cases :
    // une repeinture, ctx déjà limité à elles, sol.js paintMonde), celles dont le dessin les touche
    // (celles des cases voisines qui y débordent aussi). Pas celles qui sont prises (modèle.monde).
    peintVegetation(ctx, reg, seules) {
      const V = this.vegetationPrete();
      if (!V) return;
      const W = this.grid.cols;
      let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
      if (seules) {
        for (const i of seules) { const c = i % W, r = (i / W) | 0; bx0 = Math.min(bx0, c * T); by0 = Math.min(by0, r * T); bx1 = Math.max(bx1, (c + 1) * T); by1 = Math.max(by1, (r + 1) * T); }
      }
      const pris = this.mondeEtat && this.mondeEtat.pris.size ? this.mondeEtat.pris : null, M = this.ctx.monde;
      for (const P of V.planches) {
        if (!reg[P.donnees]) continue;
        const b = reg[P.donnees].basses, tex = this.textures.get(P.cle), src = tex.getSourceImage();
        for (let k = 0; k < b.length; k += 4) {
          const x = b[k + 1], y = b[k + 2];
          const n = P.images[b[k]][b[k + 3]], c = P.cadres[n], f = tex.get(n);
          if (!f) continue;
          if (seules && (x - c.px >= bx1 || x - c.px + c.w <= bx0 || y - c.py >= by1 || y - c.py + c.h <= by0)) continue;
          if (pris && P.regles[b[k]] && pris.has(M.idObjet(P.sortes[b[k]].nom, x, y))) continue;
          ctx.drawImage(src, f.cutX, f.cutY, c.w, c.h, x - c.px, y - c.py, c.w, c.h);
        }
      }
    },

    // Les blocs d'une région dessinée (r.vegBlocs), dès que son sol est fait : ses arbres,
    // buissons et plantes hautes, rangés par bloc.
    vegetationRegion(r) {
      if (r.vegBlocs || !this.vegetationPrete()) return;
      const M = this.ctx.monde, reg = M.region(r.rx, r.ry);
      if (!reg || !reg.vegetation) return;
      const blocs = new Map(), P = BLOC * T;
      this.veg.planches.forEach((pl, j) => {
        const im = reg[pl.donnees] ? reg[pl.donnees].images : [];
        for (let k = 0; k < im.length; k += 4) {
          const cle = Math.floor(im[k + 1] / P) + ',' + Math.floor((im[k + 2] - 1) / P);
          if (!blocs.has(cle)) blocs.set(cle, { x: Math.floor(im[k + 1] / P) * P, y: Math.floor((im[k + 2] - 1) / P) * P, items: [], objets: null });
          blocs.get(cle).items.push(j, k);
        }
      });
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
      const P = BLOC * T, Q = K.reglages(), PRES = Q.vegetationPres, LOIN = Q.vegetationLoin;
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
        this.vegEcumes = [];
        for (const r of this.shownRegions()) {
          for (const b of r.vegBlocs || []) {
            for (const o of b.objets || []) {
              (o.herbe ? this.vegHerbes : this.vegListe).push(o.herbe || o);
              if (o.ecume) this.vegEcumes.push(o.ecume);
            }
          }
        }
        this.sunDirty = true;
        this.cullKey = '';          // (les nouvelles images, hors de la vue : pas dessinées, decor.js cullDecor)
      }
    },

    vegBlocOn(b, reg) {
      const V = this.veg, M = this.ctx.monde, E = this.mondeEtat;
      b.objets = [];
      for (let q = 0; q < b.items.length; q += 2) {
        const pl = V.planches[b.items[q]], k = b.items[q + 1], im = reg[pl.donnees].images;
        const s = pl.sortes[im[k]], x = im[k + 1], y = im[k + 2], v = im[k + 3];
        // (une pièce qui se prend : son identifiant ; cueillie, son dessin sans fruits)
        const regle = pl.regles[im[k]], id = regle ? M.idObjet(s.nom, x, y) : null;
        const vu = id && E && E.cueillis.has(id) && regle.apres != null ? regle.apres : v;
        const penche = !!s.penche, n = pl.images[im[k]][penche ? vu * 5 : vu], c = pl.cadres[n];
        if (n == null || !c) continue;
        // (un ponton : sur l'eau, sous tout ce qui marche dessus ; il ne cache rien)
        const ponton = s.genre === 'ponton';
        const img = this.add.image(x, y, pl.cle, n).setOrigin(c.px / c.w, c.py / c.h).setDepth(ponton ? 0.3 : y);
        // (pas d'ombre : les plantes hautes ; les falaises, dont la face regarde le soleil ; le ponton)
        const o = { img, x: x - c.px, y: y - c.py, w: c.w, h: c.h, foot: ponton ? -Infinity : y, mask: c.mask, alpha: 1, ombre: s.genre !== 'haute' && s.genre !== 'paroi' && !ponton };
        if (penche) o.herbe = { img, fleurs: null, x, y, base: n, t: -1, dir: 1, inside: false };
        // (un arbre d'un jardin de hameau : la hache le dit, hameaux.js)
        if (pl.cle === 'hameaux' && s.genre === 'arbre') o.nomHameau = s.nom;
        if (s.genre === 'mer' && pl.ecume.length) {
          // l'écume autour, sur l'eau (sous le rocher), chaque rocher à son moment
          const e = pl.ecume[0], ce = pl.cadres[e];
          o.ecume = { img: this.add.image(x, y, pl.cle, e).setOrigin(ce.px / ce.w, ce.py / ce.h).setDepth(0.2), images: pl.ecume, k: (x + y) % pl.ecume.length };
        }
        if (id) {
          Object.assign(o, { id, regle, nom: s.nom, genre: s.genre, pl, code: im[k], v, fx: x, fy: y });
          this.mondeObjets.set(id, o);
          if (E && E.pris.has(id)) img.setVisible(false);
        }
        b.objets.push(o);
      }
    },

    vegBlocOff(b) {
      for (const o of b.objets || []) {
        if (o.id && this.mondeObjets.get(o.id) === o) this.mondeObjets.delete(o.id);
        // (une pièce qui tombe ou se brise : son geste finit sans elle)
        if (o.anim || o.tombe || o.brise) { this.tweens.killTweensOf(o.img); if (this.mondeOccupe) this.mondeOccupe.delete(o.id); }
        o.img.destroy();
        if (o.ecume) o.ecume.img.destroy();
      }
      b.objets = null;
    },

    // À chaque image : un arbre ou un buisson devant le personnage, qui le cache, devient
    // transparent (comme ceux de la ferme : decor.js stepOccluders) ; les roseaux et les massettes
    // qu'il traverse penchent.
    stepVegetation(dt) {
      if (!this.vegListe) return;
      const p = this.fermier ? this.fermier.pos() : null;
      for (const o of this.vegListe) {
        if (o.anim) continue;      // (une pièce qui tombe, se brise ou repousse : recolte-monde.js)
        // (seulement ceux qui pourraient le cacher : à côté de lui, le pied plus bas que le sien)
        const derriere = !!p && p.y < o.foot && p.x + CORPS.l > o.x && p.x - CORPS.l < o.x + o.w && p.y - CORPS.h < o.y + o.h
          && this.couvre(o, p.x - CORPS.l, p.y - CORPS.h, p.x + CORPS.l, p.y - CORPS.pied);
        const want = derriere ? OCCLUDER_ALPHA : 1;
        if (o.alpha === want) continue;
        o.alpha = K.fondu(o.alpha, want, dt);
        o.img.setAlpha(o.alpha);
      }
      if (this.vegHerbes.length) this.vegPrev = K.herbe(this.vegHerbes, p, this.vegPrev, dt);
      // l'écume qui bat autour des rochers dans l'eau (immobile avec « animations réduites »)
      if (this.vegEcumes.length && !reducedMotion()) {
        const pas = Math.floor(performance.now() / ECUME);
        if (pas !== this.vegEcumePas) {
          this.vegEcumePas = pas;
          for (const e of this.vegEcumes) e.img.setFrame(e.images[(pas + e.k) % e.images.length]);
        }
      }
    },

    // Les arbres, les buissons et les rochers du monde qui portent une ombre (soleil.js sunCasters).
    vegetationOmbres() {
      return (this.vegListe || []).filter((o) => o.ombre);
    },
  });
})(window);
