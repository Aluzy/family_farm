/* carte/ferme/brouillard.js — la scène de la ferme : le brouillard du grand monde (fiche 8).
 *
 * Le moteur retient ce qui a été vu (js/engine/monde-vu.js : un bit par cellule de 8 × 8 cases) ; la
 * page le donne à la scène dans son modèle (modèle.brouillard : { vu (la chaîne base64 de la
 * sauvegarde), C, L, H }). Ici, sur ce qui n'a pas été vu :
 *
 *   - un brouillard dans le style du jeu : de gros pixels (BR.px px de carte chacun, sans lissage,
 *     comme le voile de la nuit), en nappes de deux tons qui dérivent lentement (deux bruits qui
 *     glissent au vent ; immobiles avec « animations réduites »). Il est opaque sur toute cellule pas
 *     vue (rien ne s'y devine) et s'éclaircit sur le vu, de BR.deborde - BR.flou à BR.deborde + BR.flou
 *     cases du bord (un champ par case : la cellule de chaque case, étendue de BR.deborde cases sur le
 *     vu, puis floutée de BR.flou cases ; un bruit défait le bord : des nappes, pas des cases dures). Il
 *     se dessine dans une seule texture, de la taille de la vue (et d'une marge), posée au-dessus de
 *     tout (au-dessus du voile de la nuit : il prend lui-même la couleur de l'heure) ; refaite quand la
 *     vue a glissé, pendant un fondu, et quelques fois par seconde pour la dérive ; rien quand la vue
 *     est loin de tout brouillard (la ferme) ;
 *   - une cellule qui devient vue se dégage en fondu (BR.fondu ms) ;
 *   - ce qui se dresse (un arbre, un rocher, une falaise, un toit, une bête, un habitant, la calèche…)
 *     dont le pied est sur une cellule pas vue n'est pas dessiné du tout (le filtre de la caméra :
 *     ni son visible ni son alpha ne changent, ses propres règles restent) : sa cime ne dépasse pas
 *     du brouillard ; il ne porte pas d'ombre, ne se touche pas (hitAt : un appui sur le brouillard
 *     y fait marcher), et la calèche n'y a ni icône au bord de l'écran ni bouton Héler (caleche.js).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T } = F.C;
  const { reducedMotion } = F;

  // px : px de carte par point du brouillard (un diviseur de 32 : le rectangle bouge de deux cases) ; deborde, flou : en cases (voir plus haut) ; marge : px
  // de carte autour de la vue ; ondule : le bord lu jusqu'à tant de px à côté (au plus une case : les
  // cellules pas vues restent opaques) ; fondu : ms ; depth : au-dessus de tout (le voile de la nuit : 1e6, les
  // flèches des passages : 2e6) ; tons : les deux tons des nappes et l'ombre du bord ; nappes : la
  // taille des deux bruits (px de carte) et leur vent (px de carte par seconde) ; images : refait au
  // plus toutes les tant d'images quand rien ne bouge (la dérive) ; revue : ce qui se dresse est revu
  // toutes les tant d'images (et dès que le vu change) ; paliers : les niveaux d'opacité
  // (des aplats, comme le dessin).
  const BR = {
    px: 2, deborde: 3, flou: 2, ondule: 12, marge: 64, fondu: 1400, depth: 5e6,
    tons: [[205, 211, 219], [232, 235, 238], [168, 178, 192]],
    nappes: [{ pas: 46, vent: [7, 2.5] }, { pas: 19, vent: [-4, 3.5] }],
    images: 4, revue: 3, paliers: 10,
  };

  // Le bruit des nappes : une grille de 64 × 64 valeurs fixes, qui se répète, lue en douceur.
  const NB = 64;
  const GRILLE = (() => {
    const g = new Float32Array(NB * NB);
    let h = 0x9e3779b9;
    for (let i = 0; i < g.length; i++) {
      h = Math.imul(h ^ (h >>> 15), 2246822519) ^ (i * 374761393);
      h = Math.imul(h ^ (h >>> 13), 3266489917);
      g[i] = ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }
    return g;
  })();
  function bruit(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const x0 = xi & (NB - 1), y0 = yi & (NB - 1), x1 = (x0 + 1) & (NB - 1), y1 = (y0 + 1) & (NB - 1);
    const a = GRILLE[y0 * NB + x0], b = GRILLE[y0 * NB + x1], c = GRILLE[y1 * NB + x0], d = GRILLE[y1 * NB + x1];
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  // Une chaîne base64 → ses octets (comme js/engine/monde-vu.js : la scène ne lit pas le moteur).
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  function octets(s, n) {
    const out = new Uint8Array(n);
    const v = (i) => { const k = B64.indexOf(s[i]); return k < 0 ? 0 : k; };
    let o = 0;
    for (let i = 0; i < s.length && o < n; i += 4) {
      const q = (v(i) << 18) | (v(i + 1) << 12) | (v(i + 2) << 6) | v(i + 3);
      out[o++] = (q >> 16) & 255;
      if (o < n && i + 2 < s.length && s[i + 2] !== '=') out[o++] = (q >> 8) & 255;
      if (o < n && i + 3 < s.length && s[i + 3] !== '=') out[o++] = q & 255;
    }
    return out;
  }

  F.partie({

    // Le modèle du brouillard (modèle.brouillard), ou null : pas de brouillard (pas de grand monde).
    // Une cellule qui change se dégage (ou se couvre) en fondu ; au premier modèle, tout de suite.
    syncBrouillard(m) {
      if (!m || !(m.L > 0 && m.H > 0)) { this.brouillardOff(); return; }
      let B = this.brume;
      if (B && (B.L !== m.L || B.H !== m.H || B.C !== m.C)) { this.brouillardOff(); B = null; }
      const premier = !B;
      if (!B) {
        const n = m.L * m.H;
        B = this.brume = { L: m.L, H: m.H, C: m.C, vu: null, bits: new Uint8Array(n), aff: new Float32Array(n).fill(1), fondus: new Set(), tex: null, img: null, data: null, cle: '', image: 0, champ: null };
      }
      if (m.vu === B.vu) return;
      B.vu = m.vu;
      const o = octets(m.vu, Math.ceil((B.L * B.H) / 8));
      for (let i = 0; i < B.L * B.H; i++) {
        const b = (o[i >> 3] >> (i & 7)) & 1;
        if (b === B.bits[i] && !premier) continue;
        B.bits[i] = b;
        if (premier) B.aff[i] = b ? 0 : 1;
        else B.fondus.add(i);
      }
      B.cle = '';
      B.objets = true;
    },

    brouillardOff() {
      const B = this.brume;
      if (!B) return;
      if (B.img) B.img.destroy();
      if (B.tex && this.textures.exists(B.tex.key)) this.textures.remove(B.tex.key);
      this.brume = null;
      // (ce qui était caché se montre)
      const id = this.cameras.main.id;
      for (const o of this.children.list) if (o.brume) { o.brume = false; o.cameraFilter &= ~id; }
    },

    // Le point (x, y) (px de carte) est-il sous le brouillard (une cellule pas vue, ou hors du monde) ?
    sousBrume(x, y) {
      const B = this.brume;
      if (!B) return false;
      const k = T * B.C, cx = Math.floor(x / k), cy = Math.floor(y / k);
      if (cx < 0 || cy < 0 || cx >= B.L || cy >= B.H) return true;
      return !B.bits[cy * B.L + cx];
    },

    // À chaque image : les fondus, ce qui se dresse sous le brouillard, la texture.
    stepBrouillard(time, delta) {
      const B = this.brume;
      if (!B) return;
      if (B.fondus.size) {
        const pas = delta / BR.fondu;
        for (const i of B.fondus) {
          const but = B.bits[i] ? 0 : 1, a = B.aff[i];
          B.aff[i] = a < but ? Math.min(but, a + pas) : Math.max(but, a - pas);
          if (B.aff[i] === but) B.fondus.delete(i);
        }
        if (!B.fondus.size) B.cle = '';         // (le dernier pas du fondu : dessiné)
      }
      // (ce qui se dresse : toutes les BR.revue images, ou tout de suite quand le vu change)
      B.image++;
      if (B.objets || B.image % BR.revue === 0) { B.objets = false; this.brumeObjets(); }
      this.dessineBrouillard(time);
    },

    // Ce qui se dresse sur une cellule pas vue n'est pas dessiné par la caméra (son pied : le bas de
    // son image, au milieu). Le plancher (profondeur < 2 : le sol, l'eau, les ombres) est sous le
    // brouillard, qui le couvre ; ce qui est au-dessus de tout (le brouillard, les repères) n'est pas
    // regardé.
    brumeObjets() {
      const B = this.brume, id = this.cameras.main.id, k = T * B.C;
      let change = false;
      for (const o of this.children.list) {
        if (o === B.img || (o.type !== 'Image' && o.type !== 'Sprite')) continue;
        const d = o.depth;
        if (d < 2 || d >= 4e6 || o.scrollFactorX !== 1) { if (o.brume) { o.brume = false; o.cameraFilter &= ~id; } continue; }
        const x = o.x + (0.5 - o.originX) * o.displayWidth, y = o.y + (1 - o.originY) * o.displayHeight - 1;
        const cx = Math.floor(x / k), cy = Math.floor(y / k);
        const cache = cx < 0 || cy < 0 || cx >= B.L || cy >= B.H || !B.bits[cy * B.L + cx];
        if (cache === !!o.brume) continue;
        o.brume = cache;
        if (cache) o.cameraFilter |= id; else o.cameraFilter &= ~id;
        change = true;
      }
      if (change) this.sunDirty = true;          // (les ombres du soleil : soleil.js, sans ceux qui sont cachés)
    },

    // La texture du brouillard : la vue et sa marge, en gros pixels.
    dessineBrouillard(time) {
      const B = this.brume, S = BR.px, C = B.C;
      const c = this.cameras.main, vw = c.width / c.zoom, vh = c.height / c.zoom;
      const mx = c.scrollX + c.width * c.originX, my = c.scrollY + c.height * c.originY;
      // (le rectangle, calé sur une grille de deux cases : il ne bouge que de deux cases à la fois)
      const P2 = 2 * T, x0 = Math.floor((mx - vw / 2 - BR.marge) / P2) * P2, y0 = Math.floor((my - vh / 2 - BR.marge) / P2) * P2;
      const w = Math.ceil((vw + 2 * BR.marge) / P2 + 1) * P2, h = Math.ceil((vh + 2 * BR.marge) / P2 + 1) * P2;
      const cle = x0 + ',' + y0 + ',' + w + ',' + h;
      const calme = reducedMotion();
      // (refaite quand la vue a glissé de deux cases, pendant un fondu une image sur deux, sinon toutes
      // les BR.images images pour la dérive)
      if (cle === B.cle && (calme || B.image % (B.fondus.size ? 2 : BR.images))) return;
      // les cases du champ : le rectangle et ce qu'il faut autour pour le débord et le flou
      const R = BR.deborde + BR.flou + 1;
      const tx0 = x0 / T - R, ty0 = y0 / T - R, nx = w / T + 2 * R, ny = h / T + 2 * R;
      const kC = 1 / C;
      // 1. le champ par case : la cellule de chaque case (hors du monde : couvert) ; rien de couvert
      // près de la vue : pas de texture
      const n = nx * ny;
      if (!B.champ || B.champ.length < n) B.champ = { a: new Float32Array(n), b: new Float32Array(n), length: n };
      const A = B.champ.a, Bb = B.champ.b;
      let couvert = false;
      for (let j = 0; j < ny; j++) {
        const cy = Math.floor((ty0 + j) * kC);
        for (let i = 0; i < nx; i++) {
          const cx = Math.floor((tx0 + i) * kC);
          const a = cx < 0 || cy < 0 || cx >= B.L || cy >= B.H ? 1 : B.aff[cy * B.L + cx];
          A[j * nx + i] = a;
          if (a > 0) couvert = true;
        }
      }
      B.cle = cle;
      if (!couvert) { if (B.img) B.img.setVisible(false); return; }
      // 2. le débord (le plus fort à BR.deborde cases), puis le flou (la moyenne à BR.flou cases),
      // chacun en deux passes (les rangées, puis les colonnes)
      const passe = (src, dst, r, rangees, plusFort) => {
        const [lon, lar, pasI, pasJ] = rangees ? [nx, ny, 1, nx] : [ny, nx, nx, 1];
        for (let j = 0; j < lar; j++) {
          for (let i = 0; i < lon; i++) {
            let v = 0;
            for (let d = -r; d <= r; d++) {
              const x = src[j * pasJ + Math.min(lon - 1, Math.max(0, i + d)) * pasI];
              if (plusFort) { if (x > v) v = x; } else v += x;
            }
            dst[j * pasJ + i * pasI] = plusFort ? v : v / (2 * r + 1);
          }
        }
      };
      passe(A, Bb, BR.deborde, true, true); passe(Bb, A, BR.deborde, false, true);
      passe(A, Bb, BR.flou, true, false); passe(Bb, A, BR.flou, false, false);
      // (le plus fort à une case : là où il est nul, rien à calculer, même en ondulant)
      if (!B.champ.m || B.champ.m.length < n) B.champ.m = new Float32Array(n);
      const Mx = B.champ.m;
      passe(A, Bb, 1, true, true); passe(Bb, Mx, 1, false, true);
      // 3. la texture
      const tw = w / S, th = h / S;
      if (!B.tex || B.tex.width !== tw || B.tex.height !== th) {
        if (B.img) B.img.destroy();
        if (B.tex && this.textures.exists(B.tex.key)) this.textures.remove(B.tex.key);
        this.brumeN = (this.brumeN || 0) + 1;
        B.tex = this.textures.createCanvas('brouillard_' + this.brumeN, tw, th);
        if (B.tex.setFilter && global.Phaser.Textures) B.tex.setFilter(global.Phaser.Textures.FilterMode.NEAREST);
        B.img = this.add.image(0, 0, B.tex.key).setOrigin(0).setDepth(BR.depth).setScale(S);
        B.data = B.tex.getContext().createImageData(tw, th);
      }
      const px = B.data.data, t = calme ? 0 : time / 1000;
      const [n1, n2] = BR.nappes, [t0, t1, t2] = BR.tons;
      const o1x = t * n1.vent[0], o1y = t * n1.vent[1], o2x = t * n2.vent[0], o2y = t * n2.vent[1];
      // la couleur de l'heure (le brouillard est au-dessus du voile de la nuit : il la prend lui-même)
      const L = this.lumiere && this.lumiere.rgb ? this.lumiere.rgb : [255, 255, 255];
      const lr = L[0] / 255, lg = L[1] / 255, lb = L[2] / 255, P = BR.paliers;
      const champ = (sx, sy) => {
        // (le champ aux milieux des cases, lu en douceur entre eux)
        const fx = sx / T - 0.5 - tx0, fy = sy / T - 0.5 - ty0;
        const ix = Math.max(0, Math.min(nx - 2, Math.floor(fx))), jy = Math.max(0, Math.min(ny - 2, Math.floor(fy)));
        let ux = Math.max(0, Math.min(1, fx - ix)), uy = Math.max(0, Math.min(1, fy - jy));
        ux = ux * ux * (3 - 2 * ux); uy = uy * uy * (3 - 2 * uy);
        const q = jy * nx + ix;
        return (A[q] * (1 - ux) + A[q + 1] * ux) * (1 - uy) + (A[q + nx] * (1 - ux) + A[q + nx + 1] * ux) * uy;
      };
      const O = BR.ondule;
      // (le rectangle de ce qui n'est pas transparent : seul lui est dessiné, le reste ne coûte rien à
      // la carte graphique)
      let i0 = tw, i1 = -1, j0 = th, j1 = -1;
      for (let j = 0; j < th; j++) {
        const wy = y0 + (j + 0.5) * S;
        for (let i = 0; i < tw; i++) {
          const wx = x0 + (i + 0.5) * S, o = (j * tw + i) * 4;
          // loin du brouillard (rien à une case) : rien à calculer
          const ti = Math.floor(wx / T) - tx0, tj = Math.floor(wy / T) - ty0;
          if (Mx[tj * nx + ti] <= 0.001) { px[o + 3] = 0; continue; }
          const f0 = champ(wx, wy);
          const b1 = bruit((wx + o1x) / n1.pas, (wy + o1y) / n1.pas), b2 = bruit((wx + o2x) / n2.pas, (wy + o2y) / n2.pas);
          // le bord ondule (le champ lu un peu à côté, BR.ondule px au plus : le cœur reste opaque) et
          // s'effiloche (le bruit s'ajoute là où le champ n'est ni plein ni vide)
          const f = f0 >= 0.999 ? 1 : champ(wx + (b1 - 0.5) * 2 * O, wy + (b2 - 0.5) * 2 * O);
          if (f <= 0.001) { px[o + 3] = 0; continue; }
          const nb = b1 * 0.6 + b2 * 0.4, e = 4 * f * (1 - f);
          let a = f + (nb - 0.5) * 0.9 * e;
          a = a <= 0.05 ? 0 : a >= 0.95 ? 1 : (a - 0.05) / 0.9;
          a = f >= 0.999 ? 1 : Math.round(a * a * (3 - 2 * a) * P) / P;
          // deux tons en nappes, l'ombre au bord
          const m = b1 * 0.7 + b2 * 0.3, ombre = (1 - f) * 0.45;
          const r = (t0[0] + (t1[0] - t0[0]) * m) * (1 - ombre) + t2[0] * ombre;
          const g = (t0[1] + (t1[1] - t0[1]) * m) * (1 - ombre) + t2[1] * ombre;
          const bl = (t0[2] + (t1[2] - t0[2]) * m) * (1 - ombre) + t2[2] * ombre;
          px[o] = r * lr; px[o + 1] = g * lg; px[o + 2] = bl * lb; px[o + 3] = a * 255;
          if (a > 0) { if (i < i0) i0 = i; if (i > i1) i1 = i; if (j < j0) j0 = j; if (j > j1) j1 = j; }
        }
      }
      if (i1 < 0) { B.img.setVisible(false); return; }
      B.tex.getContext().putImageData(B.data, 0, 0);
      B.tex.refresh();
      B.img.setPosition(x0, y0).setCrop(i0, j0, i1 - i0 + 1, j1 - j0 + 1).setVisible(true);
    },

    // (les mesures, les essais : la part de la vue sous le brouillard, ce qui est caché)
    brouillardInfo() {
      const B = this.brume;
      if (!B) return null;
      let caches = 0;
      for (const o of this.children.list) if (o.brume) caches++;
      return { vu: B.vu ? B.vu.length : 0, fondus: B.fondus.size, texture: B.tex ? [B.tex.width, B.tex.height] : null, visible: !!(B.img && B.img.visible), caches };
    },
  });
})(window);
