/* carte/ferme/portes.js — la scène de la ferme : les portes qui s'ouvrent quand on passe.
 *
 * Une porte percée dans un mur horizontal (à la ferme : la porte de planches, ses modèles, dans chaque
 * matière de mur, au rez-de-chaussée et à l'étage ; dans les hameaux : leurs portes) s'ouvre quand
 * quelqu'un arrive sur sa case ou juste devant (le personnage, sa famille, les habitants, les invités,
 * le cheval monté : ceux que suivent les traces de pas, traces.js), en deux temps (entrouverte, ouverte :
 * CRAN s chacun), et se referme derrière lui (après ATTENTE s sans personne). Son battant tourne vers
 * l'intérieur : on le voit de chant contre le montant de gauche, de plus en plus étroit et sombre ;
 * derrière lui, l'intérieur, sombre. Le personnage qui l'ouvre ou la ferme l'entend (js/son.js :
 * porte_ouvre, porte_ferme). Les portes des murs verticaux sont déjà dessinées ouvertes (vues de
 * dessus) ; celle de la serre, vitrée, reste comme elle est.
 *
 * Les images ouvertes sont faites une fois par image de porte fermée (sa texture et sa case), d'après
 * elle : le battant (x de X0 à X1, de 22 px au-dessus du bas à 3 px au-dessus : scripts/carte/blocs.py,
 * porte_haute) remplacé par l'intérieur, le battant resserré à gauche. Une porte ouverte est une image
 * posée par-dessus la porte fermée (même place, même transparence quand on passe derrière le mur) : le
 * reste du jeu ne voit pas la différence. Les portes de la scène sont relevées une fois par seconde, dans
 * le même passage que qui marche (traces.js, releveMarcheurs). Avec « animations réduites », elles restent fermées.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T, BLOCS_CARTE } = F.C;
  const { reducedMotion } = F;

  const PORTES = {
    CRAN: 0.09, ATTENTE: 0.5,
    // le battant dans l'image de la porte (px) : ses colonnes, sa première et sa dernière rangée comptées depuis le bas
    // de l'image (le seuil dessous)
    X0: 2, X1: 13, HAUT: 22, BAS: 3,
    // l'intérieur, du haut au bas ; l'ombre du battant ; le battant assombri (entrouvert, ouvert)
    DEDANS: [[14, 10, 10], [40, 30, 26]], OMBRE: [20, 14, 12], SOMBRE: [0.25, 0.4], LARGEUR: [6, 2],
    // qui l'ouvre : à moins de PRES px de son milieu, de DEVANT px sous son pied à DERRIERE px au-dessus
    PRES: 10, DEVANT: 14, DERRIERE: 26,
  };

  F.partie({

    // Les images de porte de la ferme (murs_hauts) et des hameaux (leur planche) : { cle → true }.
    imagesDePortes() {
      if (this.portesImages) return this.portesImages;
      const H = BLOCS_CARTE.hauts, out = new Set();
      if (H) {
        out.add(H.key + ':' + H.porte);
        for (const f of Object.values(H.portes || {})) out.add(H.key + ':' + f);
        for (const f of Object.values(H.modelesPortes || {})) for (let k = 0; k < (H.matieresPortes || []).length; k++) out.add(H.key + ':' + (f + k));
      }
      const pl = this.veg && this.veg.planches ? this.veg.planches.find((p) => p.cle === 'hameaux') : null;
      if (pl) pl.sortes.forEach((s, j) => { if (/^porte_/.test(s.nom) && s.nom !== 'porte_cote') for (const n of pl.images[j]) out.add('hameaux:' + n); });
      // (les hameaux pas encore là : la liste sera refaite)
      if (pl || !this.ctx.monde) this.portesImages = out;
      return out;
    },

    // Les deux images ouvertes (entrouverte, ouverte) d'une image de porte fermée : leurs clés de texture.
    portesOuvertes(key, frame) {
      const id = key + ':' + frame, C = this.portesTex || (this.portesTex = new Map());
      if (C.has(id)) return C.get(id);
      const fr = this.textures.getFrame(key, frame);
      if (!fr) return null;
      const w = fr.cutWidth, h = fr.cutHeight, P = PORTES;
      const y0 = h - P.HAUT, y1 = h - P.BAS;
      if (w < P.X1 + 2 || y0 < 0) { C.set(id, null); return null; }
      const cv = global.document.createElement('canvas');
      cv.width = w; cv.height = h;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.drawImage(fr.source.image, fr.cutX, fr.cutY, w, h, 0, 0, w, h);
      const ferme = g.getImageData(0, 0, w, h);
      const cles = [1, 2].map((cran) => {
        const im = new ImageData(new Uint8ClampedArray(ferme.data), w, h), d = im.data, s = ferme.data;
        const put = (x, y, c, a = 255) => { const q = (y * w + x) * 4; d[q] = c[0]; d[q + 1] = c[1]; d[q + 2] = c[2]; d[q + 3] = a; };
        const lit = (x, y) => { const q = (y * w + x) * 4; return [s[q], s[q + 1], s[q + 2]]; };
        // l'intérieur, sous le cintre (ses coins et son contour gardés : les deux rangées du haut, sauf le milieu)
        for (let y = y0; y <= y1; y++) {
          const k = (y - y0) / (y1 - y0);
          for (let x = P.X0; x <= P.X1; x++) {
            if (y === y0 && (x <= 4 || x >= 11 || (x >= 5 && x <= 10))) continue;
            if (y === y0 + 1 && (x <= 3 || x >= 12)) continue;
            put(x, y, P.DEDANS[0].map((v, i) => Math.round(v + (P.DEDANS[1][i] - v) * k)));
          }
        }
        // le battant de chant contre le montant de gauche : ses colonnes resserrées, assombri, son ombre
        const lw = P.LARGEUR[cran - 1], sombre = P.SOMBRE[cran - 1];
        for (let y = y0 + 2; y <= y1; y++) {
          for (let i = 0; i < lw; i++) {
            const sx = P.X0 + Math.round((i * (P.X1 - P.X0)) / Math.max(1, lw - 1));
            put(P.X0 + i, y, lit(sx, y).map((v) => Math.round(v * (1 - sombre))));
          }
          put(P.X0 + lw, y, P.OMBRE);
        }
        g.putImageData(im, 0, 0);
        this.portesN = (this.portesN || 0) + 1;
        const cle = 'porte_ouverte_' + this.portesN;
        const c2 = global.document.createElement('canvas');
        c2.width = w; c2.height = h;
        c2.getContext('2d').drawImage(cv, 0, 0);
        this.textures.addCanvas(cle, c2);
        return cle;
      });
      C.set(id, cles);
      return cles;
    },

    // À chaque image : qui est devant chaque porte ; elle s'ouvre, ou se referme, d'un cran à la fois.
    stepPortes(time, dt) {
      if (!this.tracesMarcheurs || !this.portesVues) return;
      if (this.portesListe === undefined || this.portesRelevees !== this.portesVues) this.relevePortes();
      const P = PORTES, gens = this.tracesMarcheurs.filter((o) => o.active && o.visible && o.alpha >= 0.5);
      for (const p of this.portesListe) {
        const b = p.img;
        if (!b.active) { if (p.ouverte) p.ouverte.setVisible(false); continue; }
        // (qui est devant : le premier trouvé ; le personnage s'entend)
        let qui = null;
        if (!reducedMotion()) {
          for (const o of gens) {
            if (Math.abs(o.x - b.x) <= P.PRES && o.y >= b.y - P.DERRIERE && o.y <= b.y + P.DEVANT) { qui = o; break; }
          }
        }
        if (qui) p.attente = P.ATTENTE; else p.attente = Math.max(0, (p.attente || 0) - dt);
        const but = p.attente > 0 ? 2 : 0;
        p.t = (p.t || 0) + dt;
        if (p.cran !== but && p.t >= P.CRAN) {
          p.t = 0;
          const avant = p.cran || 0;
          p.cran = avant + (but > avant ? 1 : -1);
          // (le son, quand le personnage l'a ouverte (son image a un nom de case : js/fermier.js) : elle
          // commence à s'ouvrir, elle finit de se fermer)
          if (avant === 0) p.joueur = !!qui && 'caseNom' in qui;
          const S = global.FermeSon;
          if (S && p.joueur && (avant === 0 || p.cran === 0)) S.joue(p.cran ? 'porte_ouvre' : 'porte_ferme', { x: b.x, y: b.y });
        }
        // l'image ouverte, par-dessus la fermée (sa place, sa transparence, sa profondeur)
        if (!p.cran) { if (p.ouverte) p.ouverte.setVisible(false); continue; }
        const cles = this.portesOuvertes(b.texture.key, b.frame.name);
        if (!cles) continue;
        if (!p.ouverte) p.ouverte = this.add.image(0, 0, cles[0]);
        p.ouverte.setTexture(cles[p.cran - 1]).setOrigin(b.originX, b.originY).setPosition(b.x, b.y).setFlipX(b.flipX)
          .setDepth(b.depth + 0.001).setAlpha(b.alpha).setVisible(b.visible);
      }
    },

    // Les portes de la scène (leurs images fermées, relevées avec qui marche : traces.js releveMarcheurs, une fois
    // par seconde) ; celles qui ont disparu, retirées.
    relevePortes() {
      this.portesRelevees = this.portesVues;
      const avant = new Map((this.portesListe || []).map((p) => [p.img, p]));
      const out = [];
      for (const o of this.portesVues) {
        out.push(avant.get(o) || { img: o, cran: 0, attente: 0, t: 0, ouverte: null });
        avant.delete(o);
      }
      for (const p of avant.values()) if (p.ouverte) p.ouverte.destroy();
      this.portesListe = out;
    },
  });
})(window);
