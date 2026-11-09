/* carte/ferme/didacticiel.js — la scène de la ferme : ce que le didacticiel montre sur la carte.
 *
 * Le didacticiel d'une nouvelle partie (js/ui/didacticiel.js) et « Montre-moi » des objectifs du jour
 * (js/ui/objectifs.js) désignent ce qu'il faut toucher : dans la page, le bouton brille (.didac-ring, une
 * lueur blanche qui respire) ; sur la carte, l'objet lui-même brille : une tache de lumière blanche, ronde,
 * plus large que lui, son liseré blanc, au-dessus du voile de l'heure (blanche de jour comme de nuit), qui
 * respire lentement (modèle.surbrillance : { ramassables: sorte } les pierres ou le bois à ramasser, les
 * plus proches du personnage ; { blocs: [sortes] } l'Atelier, le puits) ; et les cases où poser
 * l'abri ({ cases: [{ case, sorte }] } : une case allumée qui pulse, dorée pour un mur, blanche
 * pour la porte, verte pour une paillasse). Fiche 9b : { caleche: true } fait aussi briller la calèche (son
 * attelage, quand il est fait près de la vue : js/carte/ferme/caleche.js). Fiche 14b :
 * rien ne brille sous le brouillard (la ferme y est aussi) ; les cases à bâtir, la page les dégage.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { reducedMotion } = F;

  // `max` objets qui brillent au plus (les plus proches du personnage) ; leur lueur : une tache blanche d'au
  // moins `tache` px de rayon (plus large que l'objet), son opacité de `alpha[0]` à `alpha[1]`, qui respire en
  // `periode` ms ; le liseré blanc de l'objet : `lisere` px. (`couleur` : celle des cases à bâtir sans sorte connue.)
  const S = { max: 6, periode: 2000, lueur: 0xffffff, tache: 14, alpha: [0.55, 0.9], lisere: 1, couleur: 0xffd23f };
  const { T } = F.C;

  // Une image toute blanche (Phaser 4 : la teinte pleine, comme amis.js, file.js).
  const blanche = (im) => {
    im.setTint(S.lueur);
    if (im.setTintMode && global.Phaser && global.Phaser.TintModes) im.setTintMode(global.Phaser.TintModes.FILL);
    return im;
  };

  F.partie({

    syncSurbrillance(s) {
      this.surbrillance = s || null;
      if (!this.surbrillanceG) this.surbrillanceG = this.add.graphics().setDepth(1e7);
      if (!s) { this.surbrillanceG.clear(); this.lueurs([]); }
    },

    // Les objets qui brillent : { x, y (px de carte, pour les trier et le brouillard), imgs : leurs images }.
    pointsSurbrillance() {
      const s = this.surbrillance, out = [];
      if (!s) return out;
      if (s.blocs && this.blocks) for (const e of this.blocks.values()) if (s.blocs.includes(e.sorte) && e.img) out.push({ x: e.x, y: e.y - 8, imgs: [e.img] });
      if (s.ramassables && this.gatherables) {
        for (const g of this.gatherables.values()) if (g.sorte === s.ramassables && !g.busy) out.push({ x: g.x, y: g.y - 3, imgs: g.imgs || [] });
      }
      // (la calèche : son attelage brille)
      if (s.caleche && this.calecheSprite && this.calecheVue) out.push({ x: this.calecheVue.x, y: this.calecheVue.y - 22, imgs: [this.calecheSprite] });
      // (fiche 14b : rien sous le brouillard du grand monde, la ferme comprise : un cercle n'y trahit rien ;
      // brouillard.js)
      const vus = this.sousBrume ? out.filter((q) => !this.sousBrume(q.x, q.y + 5)) : out;
      out.length = 0;
      out.push(...vus);
      const p = this.fermier && this.fermier.pos();
      if (p && out.length > S.max) out.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      return out.slice(0, S.max);
    },

    // Les lueurs des objets `cibles` ({ x, y, imgs }) : pour chacun, une tache de lumière blanche, ronde, plus
    // large que lui (la texture « lueur », chantier.js), puis, devant elle, son liseré blanc (sa silhouette,
    // élargie de LISERE px) et une copie de ses images : le tout au-dessus du voile de l'heure (this.light), pour
    // rester blanc de jour comme de nuit. Celles des objets qui ne brillent plus sont retirées. `k` : la
    // respiration (0 à 1).
    lueurs(cibles, k = 0.5) {
      if (!this.halos) this.halos = new Map();
      const H = this.halos, vues = new Set(cibles.map((q) => q.imgs[0]).filter(Boolean));
      for (const [img, h] of H) if (!vues.has(img) || !img.active) { h.objets.forEach((o) => o.destroy()); H.delete(img); }
      const haut = (this.light ? this.light.depth : 1e6) + 1;
      if (!this.textures.exists('lueur')) return;
      for (const q of cibles) {
        const img = q.imgs[0];
        if (!img || !img.active || !img.visible) continue;
        let h = H.get(img);
        if (!h) {
          const tache = this.add.image(0, 0, 'lueur').setOrigin(0.5);
          const liseres = q.imgs.map((im) => blanche(this.add.image(0, 0, im.texture.key, im.frame.name).setOrigin(0.5)));
          const copies = q.imgs.map((im) => this.add.image(0, 0, im.texture.key, im.frame.name).setOrigin(im.originX, im.originY));
          h = { tache, liseres, copies, objets: [tache, ...liseres, ...copies] };
          H.set(img, h);
        }
        // la tache : au milieu de l'objet, son rayon au moins TACHE px, plus large que lui
        const r = Math.max(S.tache, 0.75 * Math.max(...q.imgs.map((im) => Math.max(im.displayWidth, im.displayHeight) * 0.6)));
        h.tache.setPosition(q.x, q.y).setScale((r * (1 + 0.12 * k)) / 32).setDepth(haut).setAlpha(S.alpha[0] + (S.alpha[1] - S.alpha[0]) * k);
        q.imgs.forEach((im, n) => {
          const l = h.liseres[n], c = h.copies[n], ct = im.getCenter();
          if (c.frame.name !== im.frame.name || c.texture.key !== im.texture.key) { c.setTexture(im.texture.key, im.frame.name); blanche(l.setTexture(im.texture.key, im.frame.name)); }
          const w = Math.max(1, im.displayWidth), hh = Math.max(1, im.displayHeight);
          l.setPosition(ct.x, ct.y).setScale(im.scaleX * (w + 2 * S.lisere) / w, im.scaleY * (hh + 2 * S.lisere) / hh).setFlipX(im.flipX).setDepth(haut + 0.1).setAlpha(0.6 + 0.4 * k);
          c.setPosition(im.x, im.y).setScale(im.scaleX, im.scaleY).setFlipX(im.flipX).setDepth(haut + 0.2).setAlpha(im.alpha);
        });
      }
    },

    // Chaque image : les objets brillent, leur lueur respire ; les cases à bâtir pulsent.
    stepSurbrillance(time) {
      const g = this.surbrillanceG;
      if (!g) return;
      g.clear();
      if (!this.surbrillance) { if (this.halos && this.halos.size) this.lueurs([]); return; }
      const k = reducedMotion() ? 0.5 : (Math.sin((time / S.periode) * Math.PI * 2) + 1) / 2;
      if (Array.isArray(this.surbrillance.cases)) {
        const cols = this.grid.cols, v = this.cameras.main.worldView;
        for (const q of this.surbrillance.cases) {
          const x = (q.case % cols) * T, y = Math.floor(q.case / cols) * T;
          if (x + T < v.x || x > v.right || y + T < v.y || y > v.bottom) continue;
          const c = CASES[q.sorte] || S.couleur;
          g.fillStyle(c, CASES.fond + 0.18 * k).fillRect(x + 1, y + 1, T - 2, T - 2);
          g.lineStyle(1.5, 0x2a2018, 0.45).strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
          g.lineStyle(1, c, CASES.bord + 0.4 * k).strokeRect(x + 1.5, y + 1.5, T - 3, T - 3);
        }
      }
      this.lueurs(this.pointsSurbrillance(), k);
    },
  });
})(window);
