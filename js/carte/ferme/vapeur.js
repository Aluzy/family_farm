/* carte/ferme/vapeur.js — la scène de la ferme : la vapeur de la cuisinière qui cuit.
 *
 * Quand la Cuisine prépare un plat (modèle.cuisineAllumee : this.cuisineOn, modele.js), de petites bouffées de vapeur
 * sortent du couvercle de la marmite de chaque cuisinière posée (BLOCS_CARTE.cuisine.marmite) : elles montent en
 * ondulant, grossissent et s'effacent. Elles sont juste devant la cuisinière (le toit de la maison, posé, les
 * cache comme le reste de l'intérieur). Éteinte, les dernières finissent de monter. Avec « animations réduites » :
 * pas de vapeur (le feu, lui, reste pris : chantier.js stepFires).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { BLOCS_CARTE } = F.C;
  const { reducedMotion } = F;

  // Les bouffées : leurs images (de la plus petite à la plus grande ; lettres : o le cœur, . le bord), leurs
  // couleurs ; une toutes les `toutes` s (± `hasard`), `vie` s, elles montent de `monte` px/s, ondulent de
  // `ondule` px ; au plus `max` par cuisinière.
  const VAPEUR = {
    key: 'vapeur',
    dessins: [
      ['oo', 'oo'],
      ['.o.', 'ooo', '.o.'],
      ['.oo.', 'oooo', 'oooo', '.oo.'],
      ['..o..', '.ooo.', 'ooooo', '.ooo.', '..o..'],
    ],
    couleur: '#f4f1ea',
    toutes: 0.42, hasard: 0.18, vie: 1.9, monte: 9, ondule: 1.6, max: 7,
  };
  const TAILLE = 5;   // (chaque image : une case de 5 × 5, le dessin au milieu)

  F.partie({

    vapeurTexture() {
      const V = VAPEUR;
      if (this.textures.exists(V.key)) return V.key;
      const tex = this.textures.createCanvas(V.key, TAILLE * V.dessins.length, TAILLE);
      const c = tex.getContext();
      V.dessins.forEach((rangs, k) => {
        const d = Math.floor((TAILLE - rangs.length) / 2);
        rangs.forEach((rang, y) => [...rang].forEach((ch, x) => {
          if (ch === ' ') return;
          c.globalAlpha = ch === 'o' ? 1 : 0.55;
          c.fillStyle = V.couleur;
          c.fillRect(k * TAILLE + d + x, d + y, 1, 1);
        }));
      });
      c.globalAlpha = 1;
      tex.refresh();
      V.dessins.forEach((_, k) => tex.add(k, 0, k * TAILLE, 0, TAILLE, TAILLE));
      return V.key;
    },

    // Chaque image : de nouvelles bouffées au-dessus des marmites (la cuisinière cuit), et celles qui montent.
    stepVapeur(dt) {
      const V = VAPEUR, Cu = BLOCS_CARTE.cuisine;
      if (!this.vapeurs) this.vapeurs = { bouffees: [], prochaine: new Map() };
      const W = this.vapeurs;
      const on = !!this.cuisineOn && !reducedMotion();
      if (on && this.blocks) {
        for (const e of this.blocks.values()) {
          if (e.sorte !== Cu.sorte || !e.img || !e.img.visible) continue;
          const t = (W.prochaine.get(e.case) || 0) - dt;
          if (t > 0) { W.prochaine.set(e.case, t); continue; }
          W.prochaine.set(e.case, V.toutes + (Math.random() * 2 - 1) * V.hasard);
          if (W.bouffees.filter((b) => b.case === e.case).length >= V.max) continue;
          const x = e.x - 8 + Cu.marmite[0] + (Math.random() * 2 - 1), y = e.y - 24 + Cu.marmite[1];
          const img = this.add.image(x, y, this.vapeurTexture(), 0).setOrigin(0.5, 0.5);
          W.bouffees.push({ case: e.case, img, x, y, age: 0, phase: Math.random() * Math.PI * 2, depth: e.img.depth + 0.4 });
        }
      } else if (!on) W.prochaine.clear();
      if (!W.bouffees.length) return;
      for (const b of W.bouffees) {
        b.age += dt;
        const u = b.age / V.vie;
        const k = Math.min(V.dessins.length - 1, Math.floor(u * V.dessins.length));
        const x = b.x + Math.sin(b.phase + b.age * 3) * V.ondule * Math.min(1, u * 2);
        b.img.setFrame(k).setPosition(Math.round(x), Math.round(b.y - b.age * V.monte))
          .setAlpha(Math.max(0, Math.pow(1 - u, 0.7))).setDepth(b.depth);
      }
      W.bouffees = W.bouffees.filter((b) => {
        if (b.age < V.vie) return true;
        b.img.destroy();
        return false;
      });
    },
  });
})(window);
