/* carte/ferme/moulin.js — la scène de la ferme : la voilure du Moulin bâti en blocs.
 *
 * Sur la ferme générée (version 1.25), le Moulin est une tour : une pièce close aux murs hauts
 * de 3 blocs, la meule au centre (js/engine/blocs.js, etatMoulin). Bâtie, une voilure paraît
 * dehors, sur la façade (le mur du bas), au milieu, en haut de la tour : quatre ailes de
 * toile tendue sur un treillis de bois, autour d'un moyeu. Elle tourne quand la meule moud
 * (modèle.moulinTour.enMarche), s'arrête doucement sinon.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T, BLOCS_CARTE } = F.C;
  const { reducedMotion } = F;

  // La voilure : `r` px de rayon, son moyeu à `haut` px au-dessus du pied de la façade ; elle
  // tourne à `vitesse` tours par seconde en marche, ralentit en `arret` s.
  const V = { key: 'voilure_moulin', r: 30, haut: 94, vitesse: 0.35, arret: 1.5 };

  // Le dessin de la voilure (un canevas, une fois) : quatre ailes, chacune un longeron de bois
  // et, d'un côté, une toile claire tendue sur un treillis (lattes de bois), un moyeu sombre.
  function dessiner(textures) {
    if (textures.exists(V.key)) return;
    const n = V.r * 2 + 2, c = V.r + 1;
    const cv = document.createElement('canvas');
    cv.width = cv.height = n;
    const g = cv.getContext('2d');
    const px = (x, y, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
    const BOIS = '#6a4426', BOIS2 = '#8a5a34', TOILE = '#efe6cf', TOILE2 = '#d8c9a6', LATTE = '#7a5030';
    for (let a = 0; a < 4; a++) {
      const ang = a * Math.PI / 2 - Math.PI / 4, ux = Math.cos(ang), uy = Math.sin(ang);
      const vx = -uy, vy = ux;                      // le côté de la toile
      // la toile : de 7 px à r du moyeu, 7 px de large, un treillis toutes les 5 px
      for (let d = 7; d <= V.r - 1; d += 0.5) {
        for (let w = 1; w <= 7; w += 0.5) {
          const x = c + ux * d + vx * w, y = c + uy * d + vy * w;
          const latte = Math.round(d) % 5 === 0 || w >= 6.5;
          px(x, y, latte ? LATTE : (Math.round(w) % 3 === 0 ? TOILE2 : TOILE));
        }
      }
      // le longeron
      for (let d = 0; d <= V.r; d += 0.5) { px(c + ux * d, c + uy * d, BOIS); px(c + ux * d - vx * 0.8, c + uy * d - vy * 0.8, BOIS2); }
    }
    g.fillStyle = '#3a2414';
    g.fillRect(c - 2, c - 2, 5, 5);
    g.fillStyle = '#b07a48';
    g.fillRect(c - 1, c - 1, 2, 2);
    textures.addCanvas(V.key, cv);
  }

  F.partie({

    // La voilure du Moulin (modèle.moulinTour : { c0, c1, r0, r1 } les cases de la pièce, et
    // enMarche ; null : pas de Moulin bâti) : posée, déplacée ou ôtée.
    syncVoilure(tour) {
      if (!tour || this.room) {
        if (this.voilure) { this.voilure.img.destroy(); this.voilure = null; }
        return;
      }
      dessiner(this.textures);
      const x = Math.round(((tour.c0 + tour.c1 + 1) / 2) * T);
      const pied = (tour.r1 + 2) * T;               // le pied de la façade (le mur du bas)
      const y = pied - V.haut;
      if (!this.voilure) {
        const img = this.add.image(x, y, V.key).setOrigin(0.5, 0.5);
        this.voilure = { img, vitesse: 0 };
      }
      const v = this.voilure;
      v.img.setPosition(x, y).setDepth(pied + BLOCS_CARTE.toits.z + 0.5);
      v.enMarche = !!tour.enMarche;
    },

    // Chaque image : elle tourne en marche, ralentit et s'arrête sinon.
    stepVoilure(dt) {
      const v = this.voilure;
      if (!v) return;
      const but = v.enMarche ? V.vitesse : 0;
      if (reducedMotion()) { v.vitesse = 0; return; }
      const pas = (V.vitesse / V.arret) * dt;
      v.vitesse = v.vitesse < but ? Math.min(but, v.vitesse + pas) : Math.max(but, v.vitesse - pas);
      if (v.vitesse > 0) v.img.rotation = (v.img.rotation + v.vitesse * Math.PI * 2 * dt) % (Math.PI * 2);
    },
  });
})(window);
