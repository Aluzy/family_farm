/* carte/ferme/massifs.js — la scène de la ferme : les fleurs semées dans l'herbe (js/engine/massifs.js).
 *
 * Le modèle (modèle.massifs : [{ case, fleur, etape, dessin }]) : chaque massif est un petit bouquet de trois pieds de
 * la fleur sauvage du grand monde qui le dessine (dessin : DATA.MASSIFS.DESSIN ; la planche « vegetation »,
 * vegetation.js), serrés sur sa case :
 *   - 0, semé : un peu de terre retournée (une petite image faite ici, « massif_semis ») ;
 *   - 1, les pousses : trois petites touffes vertes (touffe_pre) ;
 *   - 2, les boutons : les trois pieds, petits ;
 *   - 3, en fleurs : les trois pieds.
 *
 *   - stepMassifs(dt) : à chaque image, ses pieds penchent quand quelqu'un les traverse (marcheurs.js) ;
 *   - massifAt(wx, wy) : le massif sous le doigt (appelé par hitAt), sa case, ou -1 ;
 *   - massifTouche(c) : un appui sur lui. La page décide (ctx.bridge.massifTouche, js/ui/bacs.js) : en train de
 *     pousser, une bulle au-dessus ; en fleurs, le personnage y va et les cueille à la main (un geste de la file,
 *     comme ce qu'on ramasse : ctx.bridge.massifCueillir au moment du geste), ce qu'il donne s'affiche au-dessus.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T } = F.C;
  const SEMIS = 'massif_semis';
  // les trois pieds : leur décalage depuis le milieu du bas de la case (px), leur variante
  const PIEDS = [[-4, -4, 0], [4, -3, 1], [0, 0, 2]];
  // la taille des pieds à chaque étape (1 : les pousses, 2 : les boutons, 3 : en fleurs)
  const TAILLE = { 1: 0.5, 2: 0.55, 3: 0.75 };

  F.partie({

    // (la terre retournée d'un massif semé : 9 × 4 px, faite une fois)
    massifSemisTexture() {
      if (this.textures.exists(SEMIS)) return SEMIS;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x7a5232, 1).fillRect(1, 0, 7, 1).fillRect(0, 1, 9, 2).fillRect(1, 3, 7, 1);
      g.fillStyle(0x5c3b22, 1).fillRect(2, 1, 1, 1).fillRect(6, 2, 1, 1).fillRect(4, 3, 1, 1);
      g.generateTexture(SEMIS, 9, 4);
      g.destroy();
      return SEMIS;
    },

    // Les images du massif `m` ({ case, fleur, etape }), ou null (la planche pas encore prête).
    massifImages(m) {
      const veg = this.vegetationPrete ? this.vegetationPrete() : null;
      const P = veg && veg.planches && veg.planches.find((q) => q.cle === 'vegetation');
      const cols = this.grid.cols, x = (m.case % cols) * T + T / 2, y = (Math.floor(m.case / cols) + 1) * T - 2;
      if (m.etape === 0) return [this.add.image(x, y, this.massifSemisTexture()).setOrigin(0.5, 1).setDepth(y - 6)];
      if (!P) return null;
      const nom = m.etape === 1 ? 'touffe_pre' : m.dessin;
      const i = P.sortes.findIndex((s) => s.nom === nom);
      const liste = i >= 0 ? P.images[i] : null;
      if (!liste || !liste.length) return null;
      const k = TAILLE[m.etape] || 1;
      // (une plante qui penche : cinq images par variante, la première droite)
      const n5 = P.sortes[i].penche ? 5 : 1, nv = Math.max(1, Math.floor(liste.length / n5));
      return PIEDS.map(([dx, dy, v]) => {
        const f = liste[((v + m.case) % nv) * n5], c = P.cadres[f];
        const yy = y + dy;
        const img = this.add.image(x + dx, yy, P.cle, f).setOrigin(c.px / c.w, c.py / c.h).setScale(k).setDepth(yy);
        if (n5 === 5) img.herbe = { img, fleurs: null, x: x + dx, y: yy, base: f, t: -1, dir: 1, inside: false };
        return img;
      });
    },

    // Le modèle : les massifs créés, changés (une autre étape) ou ôtés.
    syncMassifs(list) {
      if (!this.massifs) this.massifs = new Map();
      const vus = new Set();
      for (const m of list || []) {
        vus.add(m.case);
        const e = this.massifs.get(m.case);
        if (e && e.etape === m.etape && e.fleur === m.fleur && !e.manque) continue;
        if (e && e.busy) continue;
        if (e) e.imgs.forEach((im) => im.destroy());
        const imgs = this.massifImages(m);
        this.massifs.set(m.case, { case: m.case, fleur: m.fleur, etape: m.etape, imgs: imgs || [], manque: !imgs, busy: false });
      }
      for (const [c, e] of this.massifs) if (!vus.has(c) && !e.busy) { e.imgs.forEach((im) => im.destroy()); this.massifs.delete(c); }
      this.massifHerbes = null;
    },

    // À chaque image : les pieds qu'on traverse penchent (comme l'herbe haute : marcheurs.js).
    stepMassifs(dt) {
      if (!this.massifs || !this.massifs.size) return;
      if (!this.massifHerbes) {
        this.massifHerbes = [];
        for (const e of this.massifs.values()) for (const im of e.imgs) if (im.herbe) this.massifHerbes.push(im.herbe);
      }
      if (this.massifHerbes.length) K.herbes(this.massifHerbes, this.marcheurs(), dt);
    },

    // Le massif sous le doigt : sa case, ou -1.
    massifAt(wx, wy) {
      if (!this.massifs || !this.massifs.size) return -1;
      const cols = this.grid.cols;
      const c = Math.floor(wx / T), r = Math.floor((wy + 3) / T);
      if (c < 0 || r < 0) return -1;
      const t = r * cols + c;
      return this.massifs.has(t) ? t : -1;
    },

    massifTouche(c) {
      const bridge = this.ctx.bridge;
      if (!bridge || !bridge.massifTouche || (this.ctx.lastModel && this.ctx.lastModel.coucher)) return;
      const e = this.massifs && this.massifs.get(c);
      if (!e || e.busy) return;
      const cols = this.grid.cols, x = (c % cols) * T + T / 2, y = (Math.floor(c / cols) + 1) * T - 2;
      const r = bridge.massifTouche(c);
      if (!r) return;
      if (r.bulle) { if (this.showCaseTip) this.showCaseTip(r.bulle, x, y - 16); return; }
      if (!r.cueillir) return;
      const prendre = () => {
        const got = bridge.massifCueillir ? bridge.massifCueillir(c) : null;
        if (!got) { e.busy = false; return; }
        this.showGain(got.items);
        K.vibre('ramasse');
        // (les fleurs cueillies montent et s'effacent ; le massif repart de ses pousses, au prochain modèle)
        const imgs = e.imgs;
        e.imgs = [];
        this.massifHerbes = null;
        e.manque = true;
        e.busy = false;
        for (const img of imgs) this.tweens.add({ targets: img, y: img.y - 6, alpha: 0, duration: K.reduit() ? 0 : 260, ease: 'Sine.easeOut', onComplete: () => img.destroy() });
        if (this.ctx.lastModel) this.syncMassifs(this.ctx.lastModel.massifs);
      };
      this.geste({
        cle: 'massif:' + c, seul: true, images: () => e.imgs,
        valide: () => !e.busy && this.massifs.get(c) === e && e.etape === 3,
        faire: () => { e.busy = true; },
        coup: prendre,
        lance: (opts) => this.fermier.gather({ x, y }, prendre, opts),
      });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
