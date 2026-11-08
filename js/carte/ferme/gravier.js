/* carte/ferme/gravier.js — la scène de la ferme : le chemin, ses cailloux, et ceux qui sautent sous les pas.
 *
 *   - Le décor du chemin : sur chaque case de chemin plein (la tuile du chemin entière, à la ferme comme dans le
 *     grand monde), quelques petites choses peintes dans le sol (sol.js, peindreSol et paintMonde) : des
 *     gravillons (DECOR.CAILLOUX par case, au hasard), parfois un petit creux (DECOR.CREUX), une touffe d'herbe
 *     (DECOR.TOUFFE), plus rarement une pierre plate claire (DECOR.PIERRE). Leurs tirages sont fixes, d'après la
 *     case : le chemin est le même à chaque visite. Rien ne déborde de sa case (une case se repeint seule).
 *   - Sous les pas, sur un chemin (plein ou son bord : traces.js, poseTrace) : quelques gravillons sautent en
 *     arrière du pied (PAR_PAS ; PAR_FER pour un fer du cheval monté), leur ombre sur le sol pendant qu'ils
 *     volent, retombent et s'effacent (VIE s) ; un petit nuage de poussière claire s'écarte du pied et s'efface
 *     (POUSSIERE). Chaque gravillon et chaque grain de poussière est une petite image (faite une fois), prise
 *     dans une réserve (« économie » : la moitié ; la plus vieille resservant). Rien avec « animations réduites ».
 *
 * Quelle case est un chemin ? Ses tuiles le disent (sans lire le sol peint, qui coûte cher sur un téléphone) :
 * la ferme, la tuile de son sol (la couche du sol, un chemin posé, js/carte/ferme/chantier.js syncPaths) prise
 * dans le bloc herbe_chemin de la planche (js/engine/planche.js : le chemin plein, sa rangée HERBE_CHEMIN.plein ;
 * ses bords sur l'herbe, les rangées suivantes) ; le grand monde, la dernière tuile de la case (js/engine/
 * monde-sol.js) : la même, ou le chemin posé sur un autre sol (ses rangées de assets/sols_monde.png).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const K = global.CarteKit;
  const { T, ZONE_TILES } = F.C;
  const { reducedMotion } = F;

  // le bloc herbe_chemin de la planche de la ferme (js/engine/planche.js : BLOCS, COLONNES) : sa colonne, sa
  // rangée, sa largeur ; dans le bloc, la rangée du chemin plein (8 variantes), puis celles de ses bords
  const HERBE_CHEMIN = { col: 0, row: 45, w: 16, colonnes: 75, plein: 4, bords: [5, 12], variantes: 8 };
  const gidHC = (k) => 1 + (HERBE_CHEMIN.row + Math.floor(k / HERBE_CHEMIN.w)) * HERBE_CHEMIN.colonnes + HERBE_CHEMIN.col + (k % HERBE_CHEMIN.w);
  const PLEIN0 = gidHC(HERBE_CHEMIN.plein * 16), BORD0 = gidHC(HERBE_CHEMIN.bords[0] * 16), BORD1 = gidHC(HERBE_CHEMIN.bords[1] * 16 + 15);

  // Le décor d'une case de chemin plein : les chances (par case) d'une pierre plate, d'un creux, d'une touffe ;
  // le nombre de gravillons (selon les seuils de CAILLOUX : 0, 1, 2). Les couleurs : les gravillons et les
  // pierres opaques ; les ombres, les creux, leur lèvre, translucides (ils suivent le sol dessous).
  const DECOR = {
    PIERRE: 0.022, CREUX: 0.22, TOUFFE: 0.08, CAILLOUX: [0.35, 0.78],
    CLAIR: '#e0b688', MOYEN: '#c49468', OMBRE: 'rgba(60,30,12,0.45)', OMBRE_LEGERE: 'rgba(60,30,12,0.25)',
    PIERRE_C: '#d6be96', PIERRE_H: '#ecdab4',
    CREUX_C: 'rgba(40,16,4,0.5)', CREUX_F: 'rgba(30,10,2,0.6)', LEVRE: 'rgba(255,214,160,0.35)', LEVRE_L: 'rgba(255,214,160,0.2)',
    HERBES: ['#407622', '#60962c', '#80b03a'],
  };

  const GRAVILLONS = {
    PAR_PAS: 3, PAR_FER: 2, MAX: 36, VIE: 0.42, FONDU: 0.12,
    // l'élan (px/s) : vers l'arrière, de côté, vers le haut ; la pesanteur (px/s²)
    ARRIERE: [6, 16], COTE: 4, MONTE: [30, 44], PESANTEUR: 160,
    // les gravillons : un point clair sur son dessous sombre (1 × 2), ou deux clairs (2 × 2)
    CLAIRS: ['#e2ba8c', '#c8986c'], DESSOUS: '#80502e', OMBRE: 'rgba(60,30,12,0.45)',
    // la poussière : ses grains (dx, dy au départ, en px ; ils s'écartent), sa couleur, sa vie
    POUSSIERE: { GRAINS: [[-2, 0], [-3, -1], [-1, -1], [-4, 0], [0, 0], [-2, -2], [1, -1]], COULEUR: '#debe96', ALPHA: 0.8, VIE: 0.35, MAX: 42 },
  };

  // un tirage fixe par case (bien mêlé : comme flaques.js)
  const hasard = (x, y, k) => {
    let h = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(k + 1, 83492791);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  // Les dessins du décor : [dx, dy, couleur] depuis leur coin, et leur emprise (l, h) dans la case.
  const PIXELS = {
    pierre: {
      l: 5, h: 4,
      px: [[1, 0, 'PIERRE_H'], [2, 0, 'PIERRE_H'], [3, 0, 'PIERRE_H'], [0, 1, 'PIERRE_C'], [1, 1, 'PIERRE_C'], [2, 1, 'PIERRE_C'], [3, 1, 'PIERRE_C'], [4, 1, 'PIERRE_C'],
        [1, 2, 'PIERRE_C'], [2, 2, 'PIERRE_C'], [3, 2, 'PIERRE_C'], [0, 2, 'OMBRE'], [4, 2, 'OMBRE'], [1, 3, 'OMBRE'], [2, 3, 'OMBRE'], [3, 3, 'OMBRE']],
    },
    creux: {
      l: 4, h: 3,
      px: [[1, 0, 'CREUX_C'], [2, 0, 'CREUX_C'], [0, 1, 'CREUX_C'], [1, 1, 'CREUX_F'], [2, 1, 'CREUX_F'], [3, 1, 'CREUX_C'],
        [1, 2, 'LEVRE'], [2, 2, 'LEVRE'], [0, 2, 'LEVRE_L'], [3, 2, 'LEVRE_L']],
    },
    // (la touffe en éventail : sa base sombre en bas, des brins plus clairs au-dessus, son ombre)
    touffe: {
      l: 5, h: 5,
      px: [[1, 3, 'H0'], [2, 3, 'H0'], [3, 3, 'H0'], [1, 2, 'H1'], [3, 2, 'H1'], [2, 2, 'H2'], [0, 1, 'H2'], [4, 1, 'H2'], [2, 1, 'H1'],
        [1, 4, 'OMBRE_LEGERE'], [2, 4, 'OMBRE_LEGERE'], [3, 4, 'OMBRE_LEGERE']],
      grand: [[2, 0, 'H2'], [0, 2, 'H1'], [4, 2, 'H1']],
    },
    petit: { l: 1, h: 2, px: [[0, 0, 'CLAIR'], [0, 1, 'OMBRE']] },
    caillou: { l: 2, h: 3, px: [[0, 0, 'CLAIR'], [1, 0, 'MOYEN'], [0, 1, 'MOYEN'], [1, 1, 'MOYEN'], [0, 2, 'OMBRE'], [1, 2, 'OMBRE']] },
  };
  const couleur = (n) => (n[0] === 'H' && n.length === 2 ? DECOR.HERBES[+n[1]] : DECOR[n]);

  F.partie({

    // La case `i` (rangée × cols + colonne) est-elle un chemin ? 2 : plein ; 1 : son bord ; 0 : non.
    // `reg` : la région du grand monde qui la tient (sinon cherchée), quand elle est hors de la ferme.
    cheminDeCase(i, reg) {
      const W = this.grid.cols, M = this.ctx.monde;
      if (M && this.regionParts) {
        const c = i % W, y = (i / W) | 0, Fe = M.ferme;
        if (!(c >= Fe.X && y >= Fe.Y && c < Fe.X + Fe.LARGEUR && y < Fe.Y + Fe.HAUTEUR)) {
          const R = reg || (K.REGION.tuiles ? M.region(Math.floor(c / K.REGION.tuiles), Math.floor(y / K.REGION.tuiles)) : null);
          if (!R) return 0;
          const x = c - R.x0, yy = y - R.y0;
          if (x < 0 || yy < 0 || x >= R.l || yy >= R.h) return 0;
          const S = M.tuiles, KC = S.COUCHES, o = (yy * R.l + x) * KC;
          let v = 0;
          for (let k = 0; k < KC; k++) { const w = R.couches[o + k]; if (!w) break; v = w; }
          if (v >= S.DECALAGE) {
            const n = v - S.DECALAGE, rang = Math.floor(n / S.colonnes), r0 = (1 + S.BORDS + S.RIVES) * S.sols.length;
            if (rang < r0 || rang >= r0 + S.CHEMINS) return 0;
            return n % S.colonnes === 15 ? 2 : 1;
          }
          return this.cheminDeGid(v);
        }
      }
      const raw = this.mapRaw;
      if (!raw) return 0;
      if (this.gravierRaw !== raw) { this.gravierRaw = raw; this.gravierCouches = raw.layers.filter((l) => l.type === 'tilelayer' && l.visible !== false && Array.isArray(l.data)); }
      const couches = this.gravierCouches;
      if (!couches.length) return 0;
      // (la tuile du sol : un chemin posé, le sol des anciennes zones, celle de la carte)
      let cell = couches[0].data[i];
      if (this.pathOver && this.pathOver.has(i)) cell = this.pathOver.get(i);
      else if (this.zoneOver && this.zoneOver.has(i)) cell = this.zoneOver.get(i);
      const n = this.cheminDeGid(cell & 0x0fffffff);
      if (n !== 2) return n;
      // (une tuile posée dessus, une fleur, une pierre de la carte : pas de décor sous elle)
      for (let k = 1; k < couches.length; k++) {
        const L = couches[k];
        if (ZONE_TILES && L.name === ZONE_TILES.couche) continue;
        if (L.data[i] & 0x0fffffff) return 1;
      }
      return 2;
    },

    // Une tuile de la planche de la ferme (gid) : 2, le chemin plein ; 1, son bord sur l'herbe ; 0, autre chose.
    cheminDeGid(g) {
      if (g >= PLEIN0 && g < PLEIN0 + HERBE_CHEMIN.variantes) return 2;
      if (g >= BORD0 && g <= BORD1 && (g - 1) % HERBE_CHEMIN.colonnes < HERBE_CHEMIN.col + HERBE_CHEMIN.w) return 1;
      return 0;
    },

    // Le décor des cases de chemin plein parmi `cells`, dans `ctx` (en px de carte : sol.js peindreSol) ; `reg`,
    // la région du grand monde (paintMonde), ou rien (les cases de la ferme).
    peintGravier(ctx, cells, reg) {
      const W = this.grid.cols;
      for (const i of cells) {
        if (this.cheminDeCase(i, reg) !== 2) continue;
        const X = i % W, Y = (i / W) | 0;
        this.peintDecorCase(ctx, X, Y);
      }
    },

    // Le décor d'une case de chemin plein (X, Y) : ses tirages, posés sans se toucher, dans la case.
    peintDecorCase(ctx, X, Y) {
      const pris = [], D = DECOR;
      let k = 10;
      // (une place libre pour un dessin de l × h, à 1 px du bord de la case et des autres : quelques essais)
      const place = (l, h) => {
        for (let e = 0; e < 4; e++) {
          const x = 1 + Math.floor(hasard(X, Y, k++) * (T - 1 - l)), y = 1 + Math.floor(hasard(X, Y, k++) * (T - 1 - h));
          if (!pris.some((p) => x < p.x + p.l + 1 && x + l + 1 > p.x && y < p.y + p.h + 1 && y + h + 1 > p.y)) { pris.push({ x, y, l, h }); return { x, y }; }
        }
        return null;
      };
      const dessine = (d, at, plus) => {
        const x0 = X * T + at.x, y0 = Y * T + at.y;
        for (const [dx, dy, c] of plus ? d.px.concat(plus) : d.px) { ctx.fillStyle = couleur(c); ctx.fillRect(x0 + dx, y0 + dy, 1, 1); }
      };
      if (hasard(X, Y, 1) < D.PIERRE) { const at = place(PIXELS.pierre.l, PIXELS.pierre.h); if (at) dessine(PIXELS.pierre, at); }
      if (hasard(X, Y, 2) < D.CREUX) { const at = place(PIXELS.creux.l, PIXELS.creux.h); if (at) dessine(PIXELS.creux, at); }
      if (hasard(X, Y, 3) < D.TOUFFE) { const at = place(PIXELS.touffe.l, PIXELS.touffe.h); if (at) dessine(PIXELS.touffe, at, hasard(X, Y, 4) < 0.5 ? PIXELS.touffe.grand : null); }
      const h = hasard(X, Y, 5), n = h < D.CAILLOUX[0] ? 0 : h < D.CAILLOUX[1] ? 1 : 2;
      for (let j = 0; j < n; j++) {
        const d = hasard(X, Y, 6 + j) < 0.5 ? PIXELS.petit : PIXELS.caillou, at = place(d.l, d.h);
        if (at) dessine(d, at);
      }
    },

    // Le pas en (x, y) (traces.js) est-il sur un chemin (plein ou son bord) ?
    cheminSous(x, y) {
      const W = this.grid.cols, c = Math.floor(x / T), r = Math.floor((y - 1) / T);
      if (c < 0 || r < 0 || c >= W || r >= this.grid.rows) return false;
      return this.cheminDeCase(r * W + c) > 0;
    },

    // Les textures des gravillons et de la poussière (une fois).
    gravillonsTextures() {
      if (this.gravillonsPrets) return;
      const G = GRAVILLONS, fait = (cle, w, h, px) => {
        if (this.textures.exists(cle)) return;
        const cv = global.document.createElement('canvas');
        cv.width = w; cv.height = h;
        const g = cv.getContext('2d');
        for (const [x, y, c] of px) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }
        this.textures.addCanvas(cle, cv);
      };
      fait('gravillon_0', 1, 2, [[0, 0, G.CLAIRS[0]], [0, 1, G.DESSOUS]]);
      fait('gravillon_1', 2, 2, [[0, 0, G.CLAIRS[0]], [1, 0, G.CLAIRS[1]], [0, 1, G.DESSOUS], [1, 1, G.DESSOUS]]);
      fait('gravillon_ombre', 1, 1, [[0, 0, G.OMBRE]]);
      fait('gravillon_poussiere', 1, 1, [[0, 0, G.POUSSIERE.COULEUR]]);
      this.gravillonsPrets = true;
    },

    // Un pas sur un chemin en (x, y), dans la vue `vue` (traces.js) : ses gravillons, sa poussière ('fer' : un
    // fer du cheval, moins de gravillons).
    gravillonsPas(x, y, vue, forme) {
      if (reducedMotion()) return;
      this.gravillonsTextures();
      const G = GRAVILLONS, eco = K.reglages && K.reglages().demiDensite;
      const R = this.gravillons || (this.gravillons = { cailloux: [], poussiere: [] });
      // (l'arrière du pas : à l'opposé de la marche)
      const ax = vue === 'droite' ? -1 : vue === 'gauche' ? 1 : 0, ay = vue === 'bas' ? -1 : vue === 'haut' ? 1 : 0;
      const tire = (a, b) => a + Math.random() * (b - a);
      const prend = (L, max, fait) => {
        if (L.length < max) { const o = fait(); L.push(o); return o; }
        return L.reduce((p, q) => (q.vie < p.vie ? q : p));
      };
      const n = forme === 'fer' ? G.PAR_FER : G.PAR_PAS, max = eco ? G.MAX / 2 : G.MAX;
      for (let k = 0; k < n; k++) {
        const g = prend(R.cailloux, max, () => ({
          img: this.add.image(0, 0, 'gravillon_0').setOrigin(0.5, 1),
          ombre: this.add.image(0, 0, 'gravillon_ombre').setOrigin(0.5, 1),
          vie: 0,
        }));
        const arriere = tire(G.ARRIERE[0], G.ARRIERE[1]), cote = tire(-G.COTE, G.COTE);
        Object.assign(g, {
          x, y, z: 0, vie: G.VIE, pose: false,
          vx: ax * arriere + (ay ? cote : 0), vy: ay * arriere * 0.6 + (ax ? cote : 0), vz: tire(G.MONTE[0], G.MONTE[1]),
        });
        g.img.setTexture(k === 0 ? 'gravillon_1' : 'gravillon_0').setDepth(y + 0.4).setAlpha(1).setVisible(true);
        g.ombre.setDepth(y + 0.3).setAlpha(1).setVisible(true);
      }
      // la poussière : ses grains, du côté de l'arrière (dans le sens de la marche, retournée)
      const P = G.POUSSIERE, maxP = eco ? Math.ceil(P.MAX / 2) : P.MAX, sx = ax || 1;
      const grains = forme === 'fer' ? P.GRAINS.slice(0, 4) : P.GRAINS;
      for (const [dx, dy] of grains) {
        const p = prend(R.poussiere, maxP, () => ({ img: this.add.image(0, 0, 'gravillon_poussiere').setOrigin(0, 1), vie: 0 }));
        // (marchant vers le haut ou le bas, la poussière s'étale de côté)
        const gx = ax ? dx * -sx : dy, gy = ax ? dy : dx * 0.5;
        Object.assign(p, { x0: x, y0: y, dx: gx, dy: gy, vie: P.VIE });
        p.img.setDepth(y + 0.35).setVisible(true);
      }
    },

    // À chaque image : les gravillons volent, retombent, s'effacent ; la poussière s'écarte et s'efface.
    stepGravillons(dt) {
      const R = this.gravillons;
      if (!R) return;
      const G = GRAVILLONS, P = G.POUSSIERE;
      for (const g of R.cailloux) {
        if (g.vie <= 0) { if (g.img.visible) { g.img.setVisible(false); g.ombre.setVisible(false); } continue; }
        g.vie -= dt;
        if (!g.pose) {
          g.vz -= G.PESANTEUR * dt;
          g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt;
          if (g.z <= 0) { g.z = 0; g.pose = true; }
        }
        const a = Math.max(0, Math.min(1, g.vie / G.FONDU));
        g.img.setPosition(Math.round(g.x), Math.round(g.y - g.z)).setDepth(g.y + 0.4).setAlpha(a);
        // (son ombre, sur le sol, tant qu'il vole)
        g.ombre.setPosition(Math.round(g.x), Math.round(g.y) + 1).setVisible(g.z > 0.5).setAlpha(a);
        if (g.vie <= 0) { g.img.setVisible(false); g.ombre.setVisible(false); }
      }
      for (const p of R.poussiere) {
        if (p.vie <= 0) { if (p.img.visible) p.img.setVisible(false); continue; }
        p.vie -= dt;
        const u = 1 - Math.max(0, p.vie) / P.VIE;
        p.img.setPosition(Math.round(p.x0 + p.dx * (0.6 + u * 1.4)), Math.round(p.y0 + p.dy * (1 + u * 2))).setAlpha(P.ALPHA * (1 - u));
        if (p.vie <= 0) p.img.setVisible(false);
      }
    },
  });
})(window);
