/* carte/ferme/moulin.js — la scène de la ferme : la voilure du Moulin bâti en blocs.
 *
 * Sur la ferme générée (version 1.25), le Moulin est une tour : une pièce close aux murs hauts
 * de 3 blocs, la meule au centre (js/engine/blocs.js, etatMoulin). Bâtie, une voilure paraît
 * dehors, sur la façade (le mur du bas), au milieu de son 3ᵉ rang de mur : quatre ailes de
 * toile tendue sur un châssis de bois, autour d'un moyeu, dessinées image par image. Elle tourne quand la meule moud
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

  // La voilure : `r` px de rayon, son moyeu au milieu du 3ᵉ rang de mur de la façade (`haut`
  // px au-dessus de son pied : les rangs font BLOCS_CARTE.etage.dy px) ; `images` images de
  // son quart de tour (elle a quatre ailes : un quart de tour la ramène à elle-même) ; elle
  // tourne à `vitesse` tours par seconde en marche, ralentit en `arret` s.
  const V = { key: 'voilure_moulin', r: 32, haut: 75, images: 24, vitesse: 0.3, arret: 1.5 };

  // Les couleurs : le bois (ombre, moyen, clair), la toile (ombre, moyen, clair), le contour.
  const C = {
    bois: [[74, 44, 22], [122, 80, 44], [168, 118, 70]],
    toile: [[214, 196, 160], [238, 226, 198], [252, 246, 228]],
    contour: [43, 29, 20],
  };

  // La couleur du point (x, y) (relatif au moyeu) de la voilure tournée de `rot` (radians), ou
  // null. Chaque aile : un longeron de bois (2 px, éclairé d'un côté) jusqu'au bout, une planche
  // étroite du côté d'attaque ; de l'autre côté, un châssis de bois (un montant, un barreau
  // tous les 6 px) tendu de toile, plus claire près du longeron, plus sombre au bord (la toile
  // suit le longeron : elle tourne dans le sens inverse des aiguilles d'une montre) ; le moyeu :
  // un disque de bois cerclé, un clou.
  function couleur(x, y, rot) {
    const R = V.r, d = Math.hypot(x, y);
    if (d <= 2.2) return d <= 0.8 ? C.bois[2] : C.bois[1];
    if (d <= 4.2) return C.bois[0];
    for (let a = 0; a < 4; a++) {
      const ang = rot + a * Math.PI / 2 - Math.PI / 4;
      const ux = Math.cos(ang), uy = Math.sin(ang);
      const u = x * ux + y * uy, v = -x * uy + y * ux;   // le long de l'aile, et en travers
      if (u < 3 || u > R) continue;
      // le longeron
      if (Math.abs(v) <= 1.05) return v < 0 ? C.bois[0] : C.bois[1];
      // du côté d'attaque, une planche étroite le long du longeron
      if (v < -1.05 && v >= -2.6 && u >= 8 && u <= R - 1) return C.bois[2];
      // le châssis et sa toile, du côté v > 0, de 8 px au bout : deux montants, un barreau
      // tous les 6 px, la toile entre eux, éclairée près du longeron
      if (v > 1.05 && v <= 10 && u >= 8 && u <= R - 0.5) {
        if (v > 9 || u < 9 || u > R - 1.5) return C.bois[1];
        if ((u - 9) % 6 < 1 || Math.abs(v - 5.5) < 0.5) return C.bois[0];
        return v < 3.5 ? C.toile[2] : v < 7.5 ? C.toile[1] : C.toile[0];
      }
    }
    return null;
  }

  // Les images de la voilure (une planche, une fois) : V.images images d'un quart de tour,
  // chacune dessinée point par point (pas de flou de rotation), avec un contour sombre.
  function dessiner(textures) {
    if (textures.exists(V.key)) return;
    const n = V.r * 2 + 5, c = (n - 1) / 2;
    const cv = document.createElement('canvas');
    cv.width = n * V.images;
    cv.height = n;
    const g = cv.getContext('2d');
    const img = g.createImageData(cv.width, n), D = img.data;
    const met = (X, Y, col) => { const k = (Y * cv.width + X) * 4; D[k] = col[0]; D[k + 1] = col[1]; D[k + 2] = col[2]; D[k + 3] = 255; };
    for (let f = 0; f < V.images; f++) {
      const rot = -(f / V.images) * (Math.PI / 2), plein = new Uint8Array(n * n);
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const col = couleur(x - c, y - c, rot);
          if (col) { plein[y * n + x] = 1; met(f * n + x, y, col); }
        }
      }
      // le contour : les cases vides qui touchent la voilure
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          if (plein[y * n + x]) continue;
          const pres = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < n && Y < n && plein[Y * n + X]; });
          if (pres) met(f * n + x, y, C.contour);
        }
      }
    }
    g.putImageData(img, 0, 0);
    const tex = textures.addCanvas(V.key, cv);
    for (let f = 0; f < V.images; f++) tex.add(f, 0, f * n, 0, n, n);
  }

  F.partie({

    // La voilure du Moulin (modèle.moulinTour : { c0, c1, r0, r1 } les cases de la pièce, et
    // enMarche ; null : pas de Moulin bâti) : posée, déplacée ou ôtée.
    syncVoilure(tour) {
      if (!tour) {
        if (this.voilure) { this.voilure.img.destroy(); this.voilure = null; }
        return;
      }
      dessiner(this.textures);
      const x = Math.round(((tour.c0 + tour.c1 + 1) / 2) * T);
      const pied = (tour.r1 + 2) * T;               // le pied de la façade (le mur du bas)
      const y = pied - V.haut;
      if (!this.voilure) {
        const img = this.add.image(x, y, V.key, 0).setOrigin(0.5, 0.5);
        this.voilure = { img, vitesse: 0, tour: 0 };
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
      if (v.vitesse <= 0) return;
      // (un quart de tour : V.images images ; le sens inverse des aiguilles d'une montre)
      v.tour = (v.tour + v.vitesse * 4 * dt) % 1;
      v.img.setFrame(Math.floor(v.tour * V.images) % V.images);
    },
  });
})(window);
