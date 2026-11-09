/* carte/ferme/didacticiel.js — la scène de la ferme : ce que le didacticiel montre sur la carte.
 *
 * Le didacticiel d'une nouvelle partie (js/ui/didacticiel.js) et « Montre-moi » des objectifs du jour
 * (js/ui/objectifs.js) désignent ce qu'il faut toucher : dans la page, le bouton brille (.didac-ring, une
 * lueur blanche qui respire) ; sur la carte, l'objet lui-même brille de la même lueur blanche : sa
 * silhouette, blanche, un peu plus grande (de quelques px), juste derrière lui, deux couches pour une lueur douce, qui
 * respire lentement (modèle.surbrillance : { ramassables: sorte } les pierres ou le bois à ramasser, les
 * plus proches du personnage ; { blocs: [sortes] } l'Atelier, le puits) ; et les cases où poser
 * l'abri ({ cases: [{ case, sorte }] } : une case allumée qui pulse, dorée pour un mur, blanche
 * pour la porte, verte pour une paillasse). Fiche 9b : { caleche: true } entoure aussi la calèche, d'un
 * grand cercle (son attelage, quand il est fait près de la vue : js/carte/ferme/caleche.js). Fiche 14b :
 * rien n'est entouré sous le brouillard (la ferme y est aussi) ; les cases à bâtir, la page les dégage.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { reducedMotion } = F;

  // `max` objets qui brillent au plus (les plus proches du personnage) ; leur lueur : `couches` [px de lueur
  // autour de la silhouette, opacité au plus bas, au plus haut], qui respire en `periode` ms ; sa couleur.
  // (`couleur` : celle des cases à bâtir sans sorte connue.)
  const S = { max: 6, periode: 2000, lueur: 0xffffff, couches: [[1.5, 0.6, 1], [3.5, 0.2, 0.5]], couleur: 0xffd23f };
  // Les cases à bâtir : leur couleur selon ce qui s'y pose ; le fond et le bord pulsent.
  const CASES = { mur_bois: 0xffd23f, porte: 0xffffff, paillasse: 0x8be36a, fond: 0.22, bord: 0.55 };
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
        for (const g of this.gatherables.values()) if (g.sorte === s.ramassables && !g.busy) out.push({ x: g.x, y: g.y - 5, imgs: g.imgs || [] });
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

    // Les lueurs des images `imgs` : une silhouette blanche par couche, derrière chacune, à sa place et à son
    // image ; celles des images qui ne brillent plus sont retirées. `k` : la respiration (0 à 1).
    lueurs(imgs, k = 0.5) {
      if (!this.halos) this.halos = new Map();
      const H = this.halos, vues = new Set(imgs);
      for (const [img, hs] of H) if (!vues.has(img) || !img.active) { hs.forEach((h) => h.destroy()); H.delete(img); }
      for (const img of imgs) {
        if (!img.active || !img.visible) continue;
        let hs = H.get(img);
        if (!hs) {
          hs = S.couches.map(() => blanche(this.add.image(0, 0, img.texture.key, img.frame.name).setOrigin(0.5)));
          H.set(img, hs);
        }
        const c = img.getCenter();
        hs.forEach((h, i) => {
          const [e, a0, a1] = S.couches[i];
          if (h.frame.name !== img.frame.name || h.texture.key !== img.texture.key) blanche(h.setTexture(img.texture.key, img.frame.name));
          const w = Math.max(1, img.displayWidth), hh = Math.max(1, img.displayHeight);
          h.setPosition(c.x, c.y).setScale(img.scaleX * (w + 2 * e) / w, img.scaleY * (hh + 2 * e) / hh).setFlipX(img.flipX).setDepth(img.depth - 0.002 - 0.001 * i)
            .setAlpha((a0 + (a1 - a0) * k) * img.alpha);
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
      this.lueurs(this.pointsSurbrillance().flatMap((q) => q.imgs), k);
    },
  });
})(window);
