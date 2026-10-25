/* carte/ferme/lieux-monde.js — la scène de la ferme : les lieux du grand monde (fiche 6b).
 *
 * Les entrées des grottes de la montagne (le plan : lieux.grottes, ctx.monde.lieux() ; leur bouche de
 * roche est une image de la végétation, vegetation.js, posée par js/engine/monde-lieux.js) :
 *   - la flèche bleue des passages (CarteKit.FLECHE, comme dans la mine) paraît au-dessus de la bouche
 *     quand le personnage s'en approche ; un appui sur la flèche ou sur la bouche, ou le personnage
 *     poussé vers elle quand il est juste devant, et il y entre : il va devant, passe dans l'arche en
 *     s'effaçant, puis la grotte s'ouvre (js/grotte.js : « grotte?grotte=grotte_<n>&niveau=1 ») ;
 *   - en remontant du premier niveau (jeu.html?arrivee=grotte_<n>, passages.js arrive), il ressort
 *     de l'arche et descend devant elle. La région de l'entrée peut ne pas être encore faite (la page
 *     rechargée dans la grotte) : il attend qu'elle arrive.
 * Les coins de pêche (lieux.peche : un ponton ou des piquets) : de petits remous montent de l'eau
 * devant eux, de temps en temps (pas avec « animations réduites ») ; la pêche y est meilleure
 * (peche.js : coinPeche).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T } = F.C;
  const { reducedMotion } = F;
  // la bouche : sa boîte d'appui autour du pied (px) ; le personnage s'y tient `devant` px sous le
  // pied, entre jusqu'à `seuil` px au-dessus ; poussé vers elle à `pres` px au plus, il y entre ;
  // les remous d'un coin de pêche : un toutes les `remous` ms (au hasard autour), à `vue` px de la vue
  const BOUCHE = { l: 22, h: 40, devant: 14, seuil: 8, pres: 14 };
  const COINS = { remous: [1400, 3200], vue: 160 };

  F.partie({

    // Les entrées des grottes du monde : [{ id, x, y (le pied de la bouche, px), devant { x, y } }],
    // faites une fois que les lieux du plan sont là (ctx.monde.lieux()), ou [].
    grottesMonde() {
      if (this.grottesListe) return this.grottesListe;
      const M = this.ctx.monde, L = M && M.lieux ? M.lieux() : null;
      if (!L) return [];
      const W = this.grid.cols;
      this.grottesListe = (L.grottes || []).map((g) => {
        const X = g.case % W, Y = Math.floor(g.case / W), x = X * T + T / 2, y = Y * T + T - 2;
        return { id: g.id, x, y, devant: { x, y: y + BOUCHE.devant }, fleche: null };
      });
      return this.grottesListe;
    },

    // L'entrée sous le point (wx, wy) (sa bouche, ou sa flèche visible), ou null.
    grotteMondeAt(wx, wy) {
      for (const g of this.grottesMonde()) {
        if (g.fleche && g.fleche.visible && Math.abs(wx - g.fleche.x) <= 18 && Math.abs(wy - g.fleche.y) <= 18) return g;
        if (Math.abs(wx - g.x) <= BOUCHE.l && wy <= g.y + 4 && wy >= g.y - BOUCHE.h) return g;
      }
      return null;
    },

    // Il entre dans la grotte `g` : il va devant, passe l'arche en s'effaçant, puis la grotte
    // s'ouvre. Une fois seulement (this.enGrotte) ; au lit, rien.
    enterGrotteMonde(g) {
      if (!g || this.enGrotte || !this.fermier || !this.fermier.entre) return;
      if (this.ctx.lastModel && this.ctx.lastModel.coucher) return;
      this.enGrotte = true;
      this.fermier.entre(g.devant, { x: g.x, y: g.y - BOUCHE.seuil }, () => {
        this.enGrotte = false;
        if (global.FermeHote) global.FermeHote.go(`grotte?grotte=${g.id}&niveau=1&arrivee=haut`);
        if (!global.document.body.classList.contains('en-excursion')) this.arriveGrotte(g.id);
      });
    },

    // Revenu de la grotte `id` : il ressort de l'arche, devant elle, la vue sur lui. Les lieux du
    // plan ou la région de l'entrée pas encore là : il attend (stepLieuxMonde réessaie).
    arriveGrotte(id) {
      const g = this.grottesMonde().find((q) => q.id === id);
      const M = this.ctx.monde, N = K.REGION.tuiles;
      if (g && M) M.region(Math.floor(g.devant.x / T / N), Math.floor(g.devant.y / T / N));
      if (!g || !M || !M.marchable(Math.floor(g.devant.y / T) * this.grid.cols + Math.floor(g.devant.x / T))) {
        this.arriveeGrotte = { id, t: performance.now() };
        return;
      }
      this.arriveeGrotte = null;
      const at = this.fermier && this.fermier.arrive ? this.fermier.arrive(g.devant.x, g.devant.y, { x: g.x, y: g.y - BOUCHE.seuil }) : null;
      if (at) { this.followSnap = true; this.setCentre(at.x, at.y); }
    },

    // À chaque image : l'arrivée qui attend ; la flèche de chaque entrée près du personnage, qui se
    // balance ; le personnage poussé vers une bouche, juste devant, y entre ; les remous des coins.
    stepLieuxMonde(time) {
      if (!this.ctx.monde) return;
      if (this.arriveeGrotte) {
        // (au plus 20 s d'attente : une entrée inconnue, il reste où il est)
        if (performance.now() - this.arriveeGrotte.t > 20000) this.arriveeGrotte = null;
        else this.arriveGrotte(this.arriveeGrotte.id);
      }
      const p = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      const grottes = this.grottesMonde();
      if (p && grottes.length) {
        const dir = this.manette ? this.manette.dir() : null;
        for (const g of grottes) {
          const d = Math.hypot(p.x - g.devant.x, p.y - g.devant.y);
          const voit = d <= K.FLECHE.near;
          if (voit && !g.fleche && this.textures.exists(K.FLECHE.key)) g.fleche = this.add.image(g.x, g.y - BOUCHE.h - 14, K.FLECHE.key, K.FLECHE.sens.indexOf('haut')).setDepth(2e6);
          if (g.fleche) {
            g.fleche.setVisible(voit);
            if (voit) g.fleche.setPosition(g.x, Math.round(g.y - BOUCHE.h - 14 - K.balance(time)));
          }
          if (dir && dir.y < -0.6 && Math.abs(dir.x) < 0.6 && Math.abs(p.x - g.x) <= BOUCHE.pres && p.y >= g.y && p.y - g.y <= BOUCHE.devant + BOUCHE.pres) this.enterGrotteMonde(g);
        }
      }
      this.stepRemous(time);
    },

    /* ---------- les coins de pêche ---------- */

    // Les coins de pêche du plan : [{ id, eau, case, x, y (le milieu de la case de la rive) }], ou [].
    coinsPeche() {
      if (this.coinsListe) return this.coinsListe;
      const M = this.ctx.monde, L = M && M.lieux ? M.lieux() : null;
      if (!L) return [];
      const W = this.grid.cols;
      this.coinsListe = (L.peche || []).map((p) => ({ id: p.id, eau: p.eau, case: p.case, x: (p.case % W) * T + T / 2, y: Math.floor(p.case / W) * T + T / 2, prochain: 0 }));
      return this.coinsListe;
    },

    // Le coin de pêche sur l'eau `eau` à moins de RAYON cases (ctx.monde.coins) de la case de la
    // rive (c, r) d'où il pêche, ou null.
    coinPeche(eau, c, r) {
      const R = (this.ctx.monde && this.ctx.monde.coins) || 0, W = this.grid.cols;
      if (!R) return null;
      for (const q of this.coinsPeche()) {
        if (q.eau !== eau) continue;
        if (Math.max(Math.abs((q.case % W) - c), Math.abs(Math.floor(q.case / W) - r)) <= R) return q;
      }
      return null;
    },

    // De temps en temps, un rond monte de l'eau près d'un coin de pêche dans la vue (ripple : peche.js).
    stepRemous() {
      if (reducedMotion()) return;
      const coins = this.coinsPeche();
      if (!coins.length) return;
      const v = this.cameras.main.worldView, now = performance.now();
      for (const q of coins) {
        if (q.x < v.x - COINS.vue || q.x > v.right + COINS.vue || q.y < v.y - COINS.vue || q.y > v.bottom + COINS.vue) continue;
        if (now < q.prochain) continue;
        q.prochain = now + COINS.remous[0] + Math.random() * (COINS.remous[1] - COINS.remous[0]);
        // une case d'eau à moins de 4 cases du coin, au hasard
        for (let essai = 0; essai < 6; essai++) {
          const x = q.x + Math.round((Math.random() - 0.5) * 8) * T, y = q.y + Math.round((Math.random() - 0.5) * 8) * T;
          if (this.eauMondeSous && this.eauMondeSous(x, y) === q.eau) { this.ripple(x, y + 3); break; }
        }
      }
    },
  });
})(window);
