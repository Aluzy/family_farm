/* carte/ferme/eau-monde.js — la scène de la ferme : l'eau du grand monde qui bouge (fiche 5a).
 *
 * La mer, les lacs et les rivières du monde s'animent comme les étangs de la ferme : les mêmes
 * tuiles animées (l'eau de la planche de la ferme, ses images de Tiled : sol.js stepTileAnims) et la
 * même eau vivante (CarteKit.eauVive, js/carte/eau.js : le shader des lacs, celui de la mer, sa
 * houle et son ressac le long des plages), mais par blocs : chaque région du monde dessinée
 * (sol.js showRegion) se découpe en blocs de BLOC × BLOC cases ; un bloc qui a de l'eau est une
 * « étendue » comme un étang de la ferme ({ monde: true, cells, ordre, x, y, tex, sprite, mer… }),
 * dans this.animAreas avec elles. Seuls les blocs près de la vue ont leur image (à moins de
 * PRES px ; ôtée au-delà de LOIN px), et donc leurs tuiles animées ; seuls ceux dans la vue (à VUE
 * px près) ont l'eau vivante (this.eauListe, eauEtendues ; une de plus par image au plus, eau.js
 * syncEau) : on ne paie que l'eau que l'on voit.
 *
 * Les blocs sont posés sur la grille des multiples de BLOC cases (256 px) : les vaguelettes de
 * l'eau vivante (un carreau de 64 px) et ses bruits (pris en px de la carte, uOrigine) se suivent
 * d'un bloc à l'autre ; la distance à la terre d'un bloc voit celle de ses voisins (eauMarge) :
 * ni la houle ni l'écume ne font de couture. Le bloc d'eau vivante peint son eau à la place des
 * tuiles animées, qui ne sont alors plus repeintes (le shader bouge déjà). Avec « animations
 * réduites », rien de tout cela : l'eau reste la première image des tuiles, celle du sol de la
 * région.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T } = F.C;
  const FOND = '#6a8157';
  const BLOC = 16, PRES = 256, LOIN = 640, MARGE = 64, VUE = 96;

  F.partie({

    // Les blocs d'eau d'une région dessinée (r.blocs), dès que son sol est fait (sinon, à son
    // arrivée : sol.js makeRegions). Leur image ne se fait que près de la vue (syncEauMonde).
    eauMondeRegion(r) {
      const M = this.ctx.monde;
      if (!M || r.blocs) return;
      const reg = M.region(r.rx, r.ry), P = this.planche();
      if (!reg || !P) return;
      const anims = this.tileFrames(P.set), first = P.set.firstgid, KC = M.tuiles.COUCHES, D = M.tuiles.DECALAGE, W = this.grid.cols;
      const mer = M.biomes ? M.biomes.indexOf('mer') : -1;
      r.blocs = [];
      for (let by = reg.cy0; by < reg.cy0 + reg.ch; by += BLOC) {
        for (let bx = reg.cx0; bx < reg.cx0 + reg.cl; bx += BLOC) {
          const cells = new Set(), groups = new Set();
          let estMer = false;
          const bw = Math.min(BLOC, reg.cx0 + reg.cl - bx), bh = Math.min(BLOC, reg.cy0 + reg.ch - by);
          for (let y = by; y < by + bh; y++) {
            for (let x = bx; x < bx + bw; x++) {
              const o = ((y - reg.y0) * reg.l + x - reg.x0) * KC, v = reg.couches[o];
              // (une case d'eau : sa première tuile est une tuile animée de la planche)
              if (!v || v >= D || !anims.has(v - first)) continue;
              cells.add(y * W + x);
              for (let k = 0; k < KC; k++) {
                const t = reg.couches[o + k];
                if (!t) break;
                if (t < D && anims.has(t - first)) groups.add(t - first);
              }
              if (reg.biome[(y - reg.cy0) * reg.cl + x - reg.cx0] === mer) estMer = true;
            }
          }
          if (!cells.size) continue;
          for (const n of groups) this.groupeAnime(n, anims.get(n));
          r.blocs.push({
            monde: true, cells, ordre: [...cells].sort((a, b) => a - b), cols: W, groups, mer: estMer,
            x: bx * T, y: by * T, w: bw * T, h: bh * T, tex: null, sprite: null, stale: false, vive: false,
          });
        }
      }
      this.eauMondeCle = null;
    },

    // Le groupe des tuiles animées de numéro n (this.tileAnims : toutes les tuiles d'un même
    // numéro changent ensemble) : celui de la ferme, ou un nouveau.
    groupeAnime(n, anim) {
      if (!this.animParN) {
        this.animParN = new Map();
        for (const g of this.tileAnims) this.animParN.set(g.n, g);
      }
      if (this.animParN.has(n) || !anim) return;
      const g = Object.assign(K.cycle(anim), { n, cur: 0 });
      this.tileAnims.push(g);
      this.animParN.set(n, g);
    },

    // La région s'en va : ses blocs avec elle.
    dropEauMonde(r) {
      if (!r.blocs) return;
      for (const b of r.blocs) this.eauBlocOff(b);
      r.blocs = null;
      this.eauMondeListe();
    },

    // À chaque image (avant les tuiles animées) : les blocs près de la vue prennent leur image,
    // ceux qui s'en éloignent la perdent. Revu quand la vue change de case de 128 px.
    syncEauMonde() {
      if (!this.ctx.monde || !this.regions) return;
      const c = this.cameras.main, vw = c.width / c.zoom, vh = c.height / c.zoom;
      const mx = c.scrollX + c.width * c.originX, my = c.scrollY + c.height * c.originY;
      const v = { x: mx - vw / 2, y: my - vh / 2, right: mx + vw / 2, bottom: my + vh / 2 };
      const cle = Math.floor(v.x / 128) + ',' + Math.floor(v.y / 128) + ',' + Math.ceil(v.right / 128) + ',' + Math.ceil(v.bottom / 128);
      if (cle === this.eauMondeCle) return;
      this.eauMondeCle = cle;
      const loin = (b, m) => b.x > v.right + m || b.x + b.w < v.x - m || b.y > v.bottom + m || b.y + b.h < v.y - m;
      let change = false;
      for (const r of this.shownRegions()) {
        if (!r.blocs) this.eauMondeRegion(r);
        for (const b of r.blocs || []) {
          if (!b.tex && !loin(b, PRES)) { this.eauBlocOn(b); change = true; } else if (b.tex && loin(b, LOIN)) { this.eauBlocOff(b); change = true; }
        }
      }
      if (change || !this.animFerme) this.eauMondeListe();
      // l'eau vivante : seulement les blocs dans la vue (à VUE px près) ; les autres, hors de la
      // vue, gardent leurs tuiles animées (une liste neuve quand elle change : eau.js syncEau)
      const vives = this.animFerme.concat(this.animAreas.filter((a) => a.monde && !loin(a, VUE))), avant = this.eauListe || [];
      if (vives.length !== avant.length || vives.some((a, i) => a !== avant[i])) this.eauListe = vives;
    },

    // Les étendues animées : celles de la ferme, puis les blocs du monde qui ont leur image (une
    // nouvelle liste quand elle change : l'eau vivante la compare, eau.js syncEau).
    eauMondeListe() {
      if (!this.animFerme) this.animFerme = (this.animAreas || []).slice();
      const blocs = [];
      for (const r of this.shownRegions()) for (const b of r.blocs || []) if (b.tex) blocs.push(b);
      const liste = this.animFerme.concat(blocs), avant = this.animAreas || [];
      if (liste.length === avant.length && liste.every((a, i) => a === avant[i])) return;
      this.animAreas = liste;
      this.tileSprites = liste.map((a) => a.sprite);
      if (this.eauListe) this.eauListe = this.eauListe.filter((a) => !a.monde || a.tex);
    },

    eauBlocOn(b) {
      // (une clé neuve à chaque fois : voir sol.js showRegion, fiche 9a)
      this.eauMondeN = (this.eauMondeN || 0) + 1;
      const key = 'eau_monde_' + b.x + '_' + b.y + '_' + this.eauMondeN;
      b.tex = this.textures.createCanvas(key, b.w, b.h);
      b.sprite = this.add.image(b.x, b.y, key).setOrigin(0).setDepth(0.1).setVisible(!this.tilesStill);
      this.paintMondeArea(b);
    },

    eauBlocOff(b) {
      // (son eau vivante d'abord : son shader lit la texture du bloc, qui s'en va ; la laisser
      // jusqu'au prochain syncEau faisait planter le rendu de l'image, quand la vue sautait loin
      // de l'eau)
      const v = this.eauVive ? this.eauVive.find((e) => e.a === b) : null;
      if (v) { this.eauDefait(v); this.eauVive = this.eauVive.filter((e) => e !== v); }
      if (b.sprite) b.sprite.destroy();
      if (b.tex) this.textures.remove(b.tex.key);
      b.tex = b.sprite = null;
      b.vive = false;
    },

    // Peint un bloc : ses cases d'eau, toutes leurs couches, chaque tuile animée à son image du
    // moment (comme paintAnimArea pour un étang de la ferme), puis sa rive (l'eau vivante).
    paintMondeArea(a) {
      if (!a.tex) return;
      const P = this.planche(), M = this.ctx.monde;
      if (!P || !M) return;
      const cur = this.animCur || (this.animCur = new Map());
      cur.clear();
      for (const g of this.tileAnims) cur.set(g.n, g.ids[g.cur]);
      const ctx = a.tex.getContext();
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, a.tex.width, a.tex.height);
      ctx.save();
      ctx.translate(-a.x, -a.y);
      this.peintCasesMonde(ctx, a.ordre, cur, true);
      ctx.restore();
      a.tex.refresh();
      const v = this.eauVive && this.eauVive.find((e) => e.a === a);
      if (v) this.eauRive(v);
    },

    // Peint ces cases du monde (numéros de cases), le fond puis leurs couches ; `cur` : l'image du
    // moment des tuiles animées (sinon la première). → les cases dont la région n'est pas faite.
    peintCasesMonde(ctx, cases, cur, fond) {
      const P = this.planche(), M = this.ctx.monde, W = this.grid.cols, N = M.taille;
      const S = M.tuiles, D = S.DECALAGE, KC = S.COUCHES, set = P.set, img = P.img;
      const cols = set.columns || Math.floor(img.width / T), first = set.firstgid, anims = this.tileFrames(set);
      const sols = this.has('sols_monde') ? this.textures.get('sols_monde').getSourceImage() : null;
      const manque = [];
      ctx.fillStyle = FOND;
      for (const i of cases) {
        const c = i % W, y = (i / W) | 0, reg = M.region(Math.floor(c / N), Math.floor(y / N));
        if (!reg) { manque.push(i); continue; }
        const o = ((y - reg.y0) * reg.l + c - reg.x0) * KC, dx = c * T, dy = y * T;
        if (fond) ctx.fillRect(dx, dy, T, T);
        for (let k = 0; k < KC; k++) {
          const v = reg.couches[o + k];
          if (!v) break;
          if (v >= D) {
            if (!sols) continue;
            const n = v - D;
            ctx.drawImage(sols, (n % S.colonnes) * T, ((n / S.colonnes) | 0) * T, T, T, dx, dy, T, T);
          } else {
            const n0 = v - first, an = anims.get(n0);
            const n = an ? (cur && cur.has(n0) ? cur.get(n0) : an[0].tileid) : n0;
            ctx.drawImage(img, (n % cols) * T, ((n / cols) | 0) * T, T, T, dx, dy, T, T);
          }
        }
      }
      return manque;
    },

    // La terre autour d'un bloc, MARGE px de chaque côté (eau.js eauRive : sa distance à la
    // terre) : `eau` (ses propres pixels d'eau) au milieu ; autour, les cases voisines peintes à
    // leur première image et lues comme dans eauRive (un pixel bleu ou blanc d'une case d'eau :
    // de l'eau) ; une case d'une région pas encore faite, ou hors du monde, compte pour de l'eau.
    eauMarge(a, eau) {
      const M = this.ctx.monde, P = this.planche();
      if (!M || !P) return null;
      const m = MARGE, w = a.tex.width, h = a.tex.height, w2 = w + 2 * m, h2 = h + 2 * m;
      const W = this.grid.cols, H = Math.ceil(this.world.h / T), N = M.taille, KC = M.tuiles.COUCHES, D = M.tuiles.DECALAGE;
      const anims = this.tileFrames(P.set), first = P.set.firstgid;
      const cv = this.eauMargeCv || (this.eauMargeCv = document.createElement('canvas'));
      if (cv.width !== w2 || cv.height !== h2) { cv.width = w2; cv.height = h2; }
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, w2, h2);
      // l'état de chaque case du cadre : 0 la terre, 1 de l'eau (ses pixels lus), 2 de l'eau sûre
      const c0 = a.x / T - m / T, r0 = a.y / T - m / T, cw = w2 / T, chh = h2 / T, etat = new Uint8Array(cw * chh), eauCases = [];
      for (let ry = 0; ry < chh; ry++) {
        for (let rx = 0; rx < cw; rx++) {
          const c = c0 + rx, r = r0 + ry;
          if (c < 0 || r < 0 || c >= W || r >= H) { etat[ry * cw + rx] = 2; continue; }
          const reg = M.region(Math.floor(c / N), Math.floor(r / N));
          if (!reg) { etat[ry * cw + rx] = 2; continue; }
          const v = reg.couches[((r - reg.y0) * reg.l + c - reg.x0) * KC];
          if (v && v < D && anims.has(v - first)) { etat[ry * cw + rx] = 1; eauCases.push(r * W + c); }
        }
      }
      g.save();
      g.translate(-(a.x - m), -(a.y - m));
      this.peintCasesMonde(g, eauCases, null, false);
      g.restore();
      const d = g.getImageData(0, 0, w2, h2).data, out = new Uint8Array(w2 * h2);
      for (let y = 0; y < h2; y++) {
        for (let x = 0; x < w2; x++) {
          const p = y * w2 + x, ix = x - m, iy = y - m;
          if (ix >= 0 && iy >= 0 && ix < w && iy < h) { out[p] = eau[iy * w + ix]; continue; }
          const e = etat[Math.floor(y / T) * cw + Math.floor(x / T)];
          if (e === 2) { out[p] = 1; continue; }
          if (!e) continue;
          const o = p * 4, R = d[o], G = d[o + 1], B = d[o + 2];
          if (!d[o + 3]) continue;
          out[p] = (B >= R + 40 && B >= G) || (Math.min(R, G, B) >= 190 && B >= R && B >= G - 8) ? 1 : 0;
        }
      }
      return { eau: out, w: w2, h: h2, m };
    },
  });
})(window);
