/* carte/ferme/brins.js — la scène de la ferme : les brins d'herbe qui sautent sous les pas.
 *
 * À chaque pas posé sur l'herbe (traces.js, poseTrace : le sol peint franchement vert), quelques brins légers
 * jaillissent derrière le talon (PAR_PAS ; un par fer du cheval monté), montent de quelques px, retombent et
 * s'effacent (VIE s). Chaque brin est une image d'un ou deux pixels (trois verts, faits une fois), prise dans
 * une réserve de MAX images (« économie » : MAX_ECO ; la plus vieille resservant), rangée selon le pied qui l'a
 * levé. Rien avec « animations réduites » (les traces non plus).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const K = global.CarteKit;
  const { reducedMotion } = F;

  const BRINS = {
    PAR_PAS: 2, PAR_FER: 1, MAX: 30, MAX_ECO: 16, VIE: 0.45,
    // l'élan (px/s) : vers l'arrière et de côté, vers le haut ; la pesanteur (px/s²)
    ARRIERE: [8, 18], COTE: 12, MONTE: [34, 50], PESANTEUR: 170,
    // les brins : leurs verts (plus clairs que l'herbe, pour qu'ils se voient), leur forme (deux pixels debout,
    // deux couchés, trois debout)
    VERTS: ['#5a9a2a', '#a8d444', '#e2f68a'], FORMES: [[1, 2], [2, 1], [1, 3]],
  };

  F.partie({

    // Les textures des brins (une fois) : brin_<vert>_<forme>.
    brinsTextures() {
      if (this.brinsPrets) return;
      BRINS.VERTS.forEach((c, i) => BRINS.FORMES.forEach(([w, h], j) => {
        const cle = `brin_${i}_${j}`;
        if (this.textures.exists(cle)) return;
        const cv = global.document.createElement('canvas');
        cv.width = w; cv.height = h;
        const g = cv.getContext('2d');
        g.fillStyle = c;
        g.fillRect(0, 0, w, h);
        this.textures.addCanvas(cle, cv);
      }));
      this.brinsPrets = true;
    },

    // Un pas sur l'herbe en (x, y), dans la vue `vue` (traces.js) : ses brins ('fer' : un seul, pour un fer).
    brinsPas(x, y, vue, forme) {
      if (reducedMotion()) return;
      this.brinsTextures();
      const R = this.brinsReserve || (this.brinsReserve = []);
      const max = K.reglages && K.reglages().demiDensite ? BRINS.MAX_ECO : BRINS.MAX;
      // (l'arrière du pas : à l'opposé de la marche)
      const ax = vue === 'droite' ? -1 : vue === 'gauche' ? 1 : 0, ay = vue === 'bas' ? -1 : vue === 'haut' ? 1 : 0;
      const n = forme === 'fer' ? BRINS.PAR_FER : BRINS.PAR_PAS;
      const tire = (a, b) => a + Math.random() * (b - a);
      for (let k = 0; k < n; k++) {
        let b;
        if (R.length < max) { b = { img: this.add.image(0, 0, 'brin_0_0').setOrigin(0.5, 1), t: 0, vie: 0 }; R.push(b); }
        else b = R.reduce((p, q) => (q.vie < p.vie ? q : p));
        const arriere = tire(BRINS.ARRIERE[0], BRINS.ARRIERE[1]), cote = tire(-BRINS.COTE, BRINS.COTE);
        Object.assign(b, {
          x, y, z: 0, vie: BRINS.VIE,
          vx: ax * arriere + (ay ? cote : cote * 0.4), vy: ay * arriere * 0.5 + (ax ? cote * 0.3 : 0), vz: tire(BRINS.MONTE[0], BRINS.MONTE[1]),
        });
        b.img.setTexture(`brin_${Math.floor(Math.random() * BRINS.VERTS.length)}_${Math.floor(Math.random() * BRINS.FORMES.length)}`)
          .setDepth(y + 0.4).setAlpha(1).setVisible(true);
      }
    },

    // À chaque image : les brins volent, retombent, s'effacent.
    stepBrins(dt) {
      const R = this.brinsReserve;
      if (!R) return;
      for (const b of R) {
        if (b.vie <= 0) { if (b.img.visible) b.img.setVisible(false); continue; }
        b.vie -= dt;
        b.vz -= BRINS.PESANTEUR * dt;
        b.x += b.vx * dt; b.y += b.vy * dt; b.z = Math.max(0, b.z + b.vz * dt);
        b.img.setPosition(Math.round(b.x), Math.round(b.y - b.z)).setDepth(b.y + 0.4).setAlpha(Math.min(1, b.vie / (BRINS.VIE * 0.4)));
        if (b.vie <= 0) b.img.setVisible(false);
      }
    },
  });
})(window);
