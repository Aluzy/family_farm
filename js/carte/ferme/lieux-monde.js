/* carte/ferme/lieux-monde.js — la scène de la ferme : les lieux du grand monde (fiche 6b).
 *
 * (Les entrées des grottes de la montagne ne sont plus : docs/gisements.md, lot 4.)
 * Les lieux du récit qui sont un dessin (lieux.recit : l'épave, la cale du bac aux Mouettes ; la cabane et
 * l'atelier sont bâtis, comme les maisons des hameaux : hameaux.js) : un appui sur le dessin (pour la cale : le
 * bac) le dit à la page (ctx.bridge.lieuRecit : ce qu'on y lit, js/ui/stage.js).
 * Les secrets du monde (D-2 : lieux.secrets, la ruine, le cairn, l'arbre ancien, le belvédère, la pierre levée) :
 * un appui sur le dessin le dit à la page (ctx.bridge.secret : js/engine/secrets.js) ; tant qu'il n'est pas ouvert
 * (le modèle : secretsOuverts), une petite étoile y scintille de temps en temps (pas avec « animations réduites »).
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
  // les remous d'un coin de pêche : un toutes les `remous` ms (au hasard autour), à `vue` px de la vue
  const COINS = { remous: [1400, 3200], vue: 160 };
  // l'étoile d'un secret pas encore ouvert : une toutes les `tous` ms (au hasard), à `vue` px de la vue
  const ETOILE = { tous: [1800, 4200], vue: 120, couleur: 0xfff3b0 };

  F.partie({

    // À chaque image : les remous des coins de pêche, l'étoile des secrets.
    stepLieuxMonde(time) {
      if (!this.ctx.monde) return;
      this.stepRemous(time);
      this.stepSecrets();
    },

    /* ---------- les lieux du récit ---------- */

    // Les lieux du récit du plan : [{ id, sorte, x, y (le pied, px), l, h (la boîte d'appui : demi-largeur,
    // hauteur ; LIEUX.SORTES, ctx.monde.lieuxSortes) }], ou [].
    lieuxRecit() {
      if (this.lieuxRecitListe) return this.lieuxRecitListe;
      const M = this.ctx.monde, L = M && M.lieux ? M.lieux() : null;
      if (!L) return [];
      const W = this.grid.cols, sortes = (M && M.lieuxSortes) || [];
      const secrets = (L.secrets || []).map((l) => ({ ...l, secret: true }));
      this.lieuxRecitListe = [...(L.recit || []), ...secrets].filter((l) => sortes.some((x) => x.nom === l.sorte)).map((l) => {
        const S = sortes.find((x) => x.nom === l.sorte), [bl, bh] = S.boite || [20, 36];
        // (la cale du bac : on touche le bac, amarré le long du bout de la jetée, à l'est d'une jetée nord ou
        // sud, au sud d'une jetée ouest ou est ; le pied de sa boîte au bas de sa troisième case de jetée)
        if (S.genre === 'ponton') {
          const [dx, dy] = [[0, -1], [0, 1], [-1, 0], [1, 0]][l.sens] || [0, -1], [bx, by] = l.sens < 2 ? [1, 0] : [0, 1];
          const c = (l.case % W) + dx * 3.5 + bx * 1.5, r = Math.floor(l.case / W) + dy * 3.5 + by * 1.5;
          return { id: l.id, sorte: l.sorte, x: c * T + T / 2, y: r * T + T / 2 + bh / 2, l: bl, h: bh };
        }
        return { id: l.id, sorte: l.sorte, case: l.case, secret: !!l.secret, x: (l.case % W) * T + T / 2, y: Math.floor(l.case / W) * T + T - 2, l: bl, h: bh, prochain: 0 };
      });
      return this.lieuxRecitListe;
    },

    // Le lieu du récit sous le point (wx, wy) (son dessin), ou null.
    lieuRecitAt(wx, wy) {
      for (const q of this.lieuxRecit()) if (Math.abs(wx - q.x) <= q.l && wy <= q.y + 3 && wy >= q.y - q.h) return q;
      return null;
    },

    lieuRecitTouche(q) {
      if (q && q.secret) { if (this.ctx.bridge && this.ctx.bridge.secret) this.ctx.bridge.secret({ id: q.id, sorte: q.sorte, case: q.case }); return; }
      if (q && this.ctx.bridge && this.ctx.bridge.lieuRecit) this.ctx.bridge.lieuRecit({ id: q.id, sorte: q.sorte });
    },

    // D-2 : sur un secret pas encore ouvert, dans la vue, une petite étoile scintille de temps en temps.
    stepSecrets() {
      if (reducedMotion()) return;
      const md = this.ctx.lastModel;
      if (!md || !Array.isArray(md.secretsOuverts)) return;
      const v = this.cameras.main.worldView, now = performance.now();
      for (const q of this.lieuxRecit()) {
        if (!q.secret || now < q.prochain || md.secretsOuverts.includes(q.id)) continue;
        if (q.x < v.x - ETOILE.vue || q.x > v.right + ETOILE.vue || q.y < v.y - ETOILE.vue || q.y > v.bottom + ETOILE.vue) continue;
        q.prochain = now + ETOILE.tous[0] + Math.random() * (ETOILE.tous[1] - ETOILE.tous[0]);
        const x = q.x + (Math.random() - 0.5) * q.l, y = q.y - 4 - Math.random() * q.h * 0.8;
        const g = this.add.graphics().setDepth(q.y + 1), o = { r: 0.5, a: 1 };
        this.tweens.add({
          targets: o, r: 3.5, a: 0, duration: 900, ease: 'Sine.easeOut',
          onUpdate: () => { g.clear(); g.fillStyle(ETOILE.couleur, o.a); g.fillRect(x - o.r, y - 0.5, o.r * 2, 1); g.fillRect(x - 0.5, y - o.r, 1, o.r * 2); },
          onComplete: () => g.destroy(),
        });
      }
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
