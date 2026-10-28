/* carte/ferme/faune-monde.js — la scène de la ferme : les bêtes du grand monde (fiche 6b).
 *
 * Chaque région du monde arrive du Worker avec ses bêtes (js/engine/monde-faune.js : reg.faune,
 * [espèce, x, y, variante] par bête, posées d'après le plan : marmottes et bouquetins en montagne,
 * aigles au-dessus des sommets, mouettes et crabes sur la plage, dauphins au large, canards et
 * cygnes sur les lacs et le marais, chevreuils, renards, lapins et écureuils en forêt, lièvres et
 * perdrix sur la lande ; rien sur la ferme). Elles vivent seulement près de la vue : une bête a son
 * image à moins de FAUNE.PRES px de la vue, la perd au-delà de FAUNE.LOIN px, et s'en va avec sa
 * région (dropFaune) ; quelques dizaines à la fois au plus.
 *
 * Ce qu'elles font (stepFaune, à chaque image) :
 *   - au repos, elles respirent (deux images) ; de temps en temps, elles vont un peu plus loin, à
 *     FAUNE.RAYON cases au plus de leur place, sur une case permise à leur espèce (la terre où l'on
 *     marche, l'eau) ; un canard ou un cygne plonge la tête sous l'eau ; un canard sorti de l'eau
 *     (hors du marais) se tient sur ses pattes et y marche (fauneSurEau, fiche 14) ;
 *   - le personnage à moins de `fuite` px : elles fuient, chacune à sa façon (`fuit`) : « court »
 *     (le bouquetin, le chevreuil, le renard, le lièvre : loin de lui, vite), « terrier » (la
 *     marmotte, le lapin, l'écureuil, le crabe : une courte course, puis elles disparaissent un
 *     moment), « envol » (la mouette, la perdrix : elles s'envolent et s'en vont), « nage » (les
 *     canards, les cygnes : ils s'éloignent sur l'eau) ; revenues à leur place quand il est loin ;
 *   - l'aigle tourne en rond au-dessus des sommets, haut (son ombre court au sol, sous lui) ; le
 *     dauphin saute de temps en temps hors de l'eau, au large ;
 *   - la nuit (modèle.nuit), elles dorment (immobiles) ou se cachent (`nuit`) ;
 *   - avec « animations réduites », elles restent immobiles (leur première image, à leur place) ;
 *   - elles s'écrasent et s'étirent un peu (js/carte/ressort.js, fauneRessort) : à chaque pas, à
 *     chaque souffle au repos, quand elles détalent ou s'envolent ; pas l'aigle, qui tourne là-haut.
 * On ne les chasse pas : un appui sur une bête dit son nom et ouvre sa page de l'encyclopédie (le
 * pont : ctx.bridge.faune) ; la première fois qu'une espèce paraît dans la vue, sa page se découvre
 * (ctx.bridge.fauneVue). Rien sur la ferme.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T } = F.C;
  const { reducedMotion } = F;
  // l'aigle : sa hauteur au-dessus du sol (px), le rayon de ses cercles, l'opacité de son ombre, sa
  // taille (plus près de l'œil que le sol : un peu plus grand) ; le dauphin : l'attente
  // entre deux sauts (s), la durée d'une image du saut (ms) ; les images au repos (ms par image) ;
  // l'attente au repos avant d'aller plus loin (s) ; la fuite : sa durée (s), sa vitesse (× vitesse),
  // le temps caché (s), le retour quand le personnage est à plus de `retour` × fuite px ; la vitesse
  // d'un oiseau qui s'envole (px/s)
  const AIR = { haut: 84, rayon: [40, 80], ombre: 0.34, echelle: 1.5 };
  const SAUT = { attente: [4, 11], image: 130 };
  const REPOS = { image: 620, attente: [2.5, 7] };
  const FUITE = { court: [1.1, 1.8], vite: 3, cache: [6, 12], retour: 1.6, envol: 70 };
  const PROFONDEUR = { air: 9e5 };

  // Un nombre au hasard entre a et b.
  const entre = (a, b) => a + Math.random() * (b - a);

  F.partie({

    // Les espèces (ctx.monde.faune) et leurs planches découpées (faune.json : une image par nom, de
    // la taille de l'espèce) ; this.fauneEtat : { especes, betes (celles des régions dessinées),
    // vues (les espèces déjà signalées) } ; null sans le grand monde.
    fauneInit() {
      if (this.fauneEtat !== undefined) return this.fauneEtat;
      this.fauneEtat = null;
      const M = this.ctx.monde, meta = this.cache.json.get('faune_cases');
      if (!M || !M.faune || !meta || !meta.especes) return null;
      const especes = M.faune.especes.map((e) => {
        const m = meta.especes[e.cle], cle = 'faune_' + e.cle;
        if (!m || !this.has(cle)) return null;
        const tex = this.textures.get(cle);
        m.frames.forEach((nom, k) => { if (!tex.has(nom)) tex.add(nom, 0, k * m.frameWidth, 0, m.frameWidth, m.frameHeight); });
        // (les images de chaque variante : celles de l'espèce, une variante en remplace certaines)
        const variantes = (e.variantes && e.variantes.length ? e.variantes : [{}]).map((v) => Object.assign({}, e.images, v));
        return { ...e, tex: cle, w: m.frameWidth, h: m.frameHeight, ox: m.anchor.x / m.frameWidth, oy: m.anchor.y / m.frameHeight, variantes };
      });
      this.fauneEtat = { especes, betes: [], vues: new Set(), vivantes: 0, F: M.faune };
      return this.fauneEtat;
    },

    // Les bêtes d'une région dessinée (r.betes), dès que son sol est fait : sans image encore.
    fauneRegion(r) {
      if (r.betes || !this.fauneInit()) return;
      const reg = this.ctx.monde.region(r.rx, r.ry);
      if (!reg || !reg.faune) return;
      const E = this.fauneEtat, f = reg.faune;
      r.betes = [];
      for (let k = 0; k < f.length; k += 4) {
        const e = E.especes[f[k]];
        if (!e) continue;
        const x = f[k + 1], y = f[k + 2];
        r.betes.push({
          e, x, y, hx: x, hy: y, img: null, ombre: null, etat: e.lieu === 'air' ? 'vol' : e.images.saut ? 'sous' : 'repos',
          t: entre(0.5, REPOS.attente[1]), k: 0, flip: (x + y) % 2 === 0, imgs: e.variantes[f[k + 3]] || e.variantes[0],
          angle: ((x * 7 + y * 13) % 628) / 100, rayon: AIR.rayon[0] + ((x + y) % (AIR.rayon[1] - AIR.rayon[0])), alpha: 1, cache: false,
          phase: ((x * 31 + y * 17) % 1000) / 1000,
        });
      }
      E.betes = null;            // (la liste se refait : stepFaune)
    },

    // La région s'en va : ses bêtes avec elle.
    dropFaune(r) {
      for (const b of r.betes || []) this.fauneSansImage(b);
      r.betes = null;
      if (this.fauneEtat) this.fauneEtat.betes = null;
    },

    fauneImage(b) {
      const e = b.e;
      this.fauneTerre(b);
      b.img = this.add.sprite(Math.round(b.x), Math.round(b.y), e.tex, this.fauneCadre(b, 'repos', 0)).setOrigin(e.ox, e.oy);
      if (e.lieu === 'air') b.img.setScale(AIR.echelle);
      if (e.lieu === 'terre') b.ombre = this.add.ellipse(b.x, b.y, Math.max(6, e.w * 0.45), 3, 0x1e1a18, 0.22);
      // (l'ombre d'un oiseau en vol : sa silhouette, sombre, au sol sous lui)
      if (e.lieu === 'air') b.ombre = this.add.sprite(b.x, b.y, e.tex, this.fauneCadre(b, 'vol', 0)).setOrigin(e.ox, e.oy).setTint(0x1e1a18).setTintMode(global.Phaser.TintModes.FILL).setAlpha(AIR.ombre).setDepth(1.5);
      // (son ressort : écrasée, étirée ; l'aigle n'en a pas)
      b.res = e.lieu !== 'air' && K.ressort ? K.ressort() : null;
      b.vu = null;
      this.fauneEtat.vivantes++;
    },

    fauneSansImage(b) {
      if (!b.img) return;
      b.img.destroy();
      if (b.ombre) b.ombre.destroy();
      b.img = b.ombre = b.res = null;
      this.fauneEtat.vivantes--;
    },

    // Le nom de l'image `n` (au modulo) de la suite `suite` de la bête (ses images, ou celles du repos).
    // Une bête d'eau sur la terre (b.terre : le canard hors de l'eau et du marais, fiche 14) prend ses
    // images debout sur ses pattes (terre_repos, terre_marche), si elle en a.
    fauneCadre(b, suite, n) {
      if (b.terre && b.imgs.terre_repos) suite = suite === 'marche' || suite === 'fuite' ? 'terre_marche' : 'terre_repos';
      const l = b.imgs[suite] || b.imgs.repos || b.imgs.vol || b.imgs.saut;
      return l[((n % l.length) + l.length) % l.length];
    },

    // Peut-elle aller en (x, y) ? Sa sorte de case : la terre où l'on marche, l'eau (ou le marais
    // d'un canard), dans ses biomes ; pas sur la ferme.
    faunePeut(b, x, y) {
      const M = this.ctx.monde, c = Math.floor(x / T), r = Math.floor(y / T), N = K.REGION.tuiles, F = M.ferme;
      if (c >= F.X - 2 && r >= F.Y - 2 && c < F.X + F.LARGEUR + 2 && r < F.Y + F.HAUTEUR + 2) return false;
      const reg = M.region(Math.floor(c / N), Math.floor(r / N));
      if (!reg) return false;
      const k = (r - reg.cy0) * reg.cl + c - reg.cx0;
      if (k < 0 || k >= reg.biome.length) return false;
      const bio = M.biomes[reg.biome[k]], e = b.e;
      if (!e.biomes.includes(bio)) return false;
      if (e.lieu === 'terre') return reg.marche[k] === 1;
      if (e.lieu === 'eau') return reg.marche[k] === 0 || bio === 'marais';
      return true;
    },

    // (fiche 14) Le point (x, y) est-il sur l'eau, pour une bête d'eau ? Une case d'eau dessinée (sa
    // première tuile est une tuile animée de la planche, comme pour l'eau qui bouge : eau-monde.js) ou une
    // case du marais (son eau basse, ses herbes : le canard y nage). Ailleurs (une rive, l'herbe d'un
    // bord de lac), elle est sur la terre. Sans de quoi le dire (la région, la planche) : sur l'eau.
    fauneSurEau(x, y) {
      const M = this.ctx.monde, c = Math.floor(x / T), r = Math.floor(y / T), N = K.REGION.tuiles;
      const reg = M.region(Math.floor(c / N), Math.floor(r / N));
      if (!reg) return true;
      const k = (r - reg.cy0) * reg.cl + c - reg.cx0;
      if (k < 0 || k >= reg.biome.length || M.biomes[reg.biome[k]] === 'marais') return true;
      const P = this.planche();
      if (!P || !reg.couches || !M.tuiles) return true;
      const v = reg.couches[((r - reg.y0) * reg.l + c - reg.x0) * M.tuiles.COUCHES];
      return !!v && v < M.tuiles.DECALAGE && this.tileFrames(P.set).has(v - P.set.firstgid);
    },

    // Une bête d'eau qui a des images sur ses pattes (le canard) : est-elle sur la terre ? (b.terre)
    fauneTerre(b) {
      b.terre = b.e.lieu === 'eau' && !!b.imgs.terre_repos && !this.fauneSurEau(b.x, b.y);
    },

    // Un pas vers (tx, ty), `v` px/s : false si la case d'après ne lui est pas permise (il s'arrête).
    fauneAvance(b, tx, ty, v, dt) {
      const dx = tx - b.x, dy = ty - b.y, l = Math.hypot(dx, dy);
      if (l < 0.5) return false;
      const s = Math.min(l, v * dt), nx = b.x + (dx / l) * s, ny = b.y + (dy / l) * s;
      if (!this.faunePeut(b, nx, ny)) return false;
      b.x = nx; b.y = ny;
      if (Math.abs(dx) > 0.3) b.flip = dx < 0;
      return true;
    },

    // À chaque image : les bêtes des régions dessinées (images faites près de la vue, retirées loin),
    // ce qu'elles font, leurs images.
    stepFaune(time, dtMs) {
      const E = this.fauneEtat;
      if (!E || !this.regions) return;
      if (!E.betes) {
        E.betes = [];
        for (const r of this.shownRegions()) if (r.betes) E.betes.push(...r.betes);
      }
      if (!E.betes.length) return;
      const dt = Math.min(dtMs, 100) / 1000, c = this.cameras.main;
      const vw = c.width / c.zoom, vh = c.height / c.zoom, mx = c.scrollX + c.width * c.originX, my = c.scrollY + c.height * c.originY;
      const v = { x: mx - vw / 2, y: my - vh / 2, r: mx + vw / 2, b: my + vh / 2 };
      const p = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      const m = this.ctx.lastModel, nuit = !!(m && m.nuit), calme = reducedMotion();
      const loin = (b, d) => b.x < v.x - d || b.x > v.r + d || b.y < v.y - d - 80 || b.y > v.b + d;
      for (const b of E.betes) {
        if (!b.img && !loin(b, E.F.PRES)) this.fauneImage(b);
        else if (b.img && loin(b, E.F.LOIN)) { this.fauneSansImage(b); continue; }
        if (!b.img) continue;
        this.fauneVit(b, time, dt, p, nuit, calme);
        // la première fois qu'une espèce paraît dans la vue, de jour : sa page se découvre
        if (!E.vues.has(b.e.cle) && b.img.visible && !b.img.brume && b.img.alpha > 0.5 && !nuit && b.x > v.x && b.x < v.r && b.y > v.y && b.y < v.b) {
          E.vues.add(b.e.cle);
          if (this.ctx.bridge && this.ctx.bridge.fauneVue) this.ctx.bridge.fauneVue(b.e.cle);
        }
      }
    },

    // Ce que fait la bête `b` à cette image, et son image.
    fauneVit(b, time, dt, p, nuit, calme) {
      const e = b.e, img = b.img;
      this.fauneTerre(b);         // (le canard : sur l'eau, ou sur ses pattes)
      // la nuit : cachée, ou endormie (sa première image, immobile)
      const cachee = nuit && e.nuit === 'cache';
      if (calme || (nuit && e.nuit === 'dort') || cachee) {
        if (e.images.saut) { img.setVisible(false); return; }
        if (b.etat !== 'repos' && b.etat !== 'vol') { b.x = b.hx; b.y = b.hy; b.etat = e.lieu === 'air' ? 'vol' : 'repos'; }
        b.alpha = 1;
        if (b.res) { b.res.calme(img); b.vu = null; }
        if (b.ombre && e.lieu === 'terre') b.ombre.setScale(1);
        img.setFrame(this.fauneCadre(b, e.lieu === 'air' ? 'vol' : 'repos', 0)).setAlpha(1).setVisible(!cachee);
        this.faunePlace(b, e.lieu === 'air' ? b.hx + b.rayon : b.x, e.lieu === 'air' ? b.hy : b.y);
        if (b.ombre) b.ombre.setVisible(!cachee);
        return;
      }
      const d = p ? Math.hypot(p.x - b.x, p.y - b.y) : Infinity;
      if (e.fuite && d < e.fuite && ['repos', 'marche', 'plonge'].includes(b.etat)) this.fauneFuit(b, p);
      b.t -= dt;
      let suite = 'repos', n = Math.floor((time + b.phase * 1000) / REPOS.image);
      switch (b.etat) {
        case 'vol': {        // l'aigle : des cercles, haut au-dessus de sa place
          b.angle += (dt * e.vitesse) / b.rayon;
          b.x = b.hx + Math.cos(b.angle) * b.rayon;
          b.y = b.hy + Math.sin(b.angle) * b.rayon * 0.6;
          suite = 'vol';
          n = Math.sin(time / 900 + b.phase * 6) > 0.6 ? Math.floor(time / 160) : 0;     // (il bat des ailes, de temps en temps)
          img.setRotation(b.angle + Math.PI);
          if (b.ombre) b.ombre.setRotation(b.angle + Math.PI).setFrame(this.fauneCadre(b, 'vol', n));
          break;
        }
        case 'sous': {       // le dauphin sous l'eau : il attend, puis saute un peu plus loin
          img.setVisible(false);
          if (b.t <= 0) {
            const a = Math.random() * Math.PI * 2, R = this.ctx.monde.faune.RAYON * T;
            const x = b.hx + Math.cos(a) * R * Math.random(), y = b.hy + Math.sin(a) * R * Math.random();
            if (this.faunePeut(b, x, y)) { b.x = x; b.y = y; }
            b.etat = 'saut'; b.t = 0; b.flip = Math.random() < 0.5;
            img.setVisible(true);
          }
          this.faunePlace(b, b.x, b.y);
          return;
        }
        case 'saut': {
          b.t += dt;
          const k = Math.floor((b.t * 1000) / SAUT.image), l = b.imgs.saut.length;
          if (k >= l) { b.etat = 'sous'; b.t = entre(...SAUT.attente); img.setVisible(false); return; }
          img.setVisible(true).setFrame(b.imgs.saut[k]).setFlipX(b.flip);
          this.faunePlace(b, b.x, b.y);
          return;
        }
        case 'repos': {
          if (b.t <= 0) {
            // plus loin, autour de sa place ; un canard, un cygne plonge parfois la tête
            if (b.imgs.plonge && !b.terre && Math.random() < 0.3) { b.etat = 'plonge'; b.t = entre(1, 2.2); break; }
            const R = this.ctx.monde.faune.RAYON * T, a = Math.random() * Math.PI * 2, r = Math.random() * R;
            const x = b.hx + Math.cos(a) * r, y = b.hy + Math.sin(a) * r;
            if (this.faunePeut(b, x, y)) { b.etat = 'marche'; b.tx = x; b.ty = y; b.t = 8; } else b.t = entre(...REPOS.attente);
          }
          break;
        }
        case 'plonge':
          suite = 'plonge';
          n = Math.floor(time / 300);
          if (b.t <= 0) { b.etat = 'repos'; b.t = entre(...REPOS.attente); }
          break;
        case 'marche': {
          suite = 'marche';
          n = Math.floor(time / 160);
          if (!this.fauneAvance(b, b.tx, b.ty, e.vitesse, dt) || b.t <= 0) { b.etat = 'repos'; b.t = entre(...REPOS.attente); }
          break;
        }
        case 'fuite': {      // court, nage, ou file vers son terrier
          suite = b.imgs.fuite ? 'fuite' : 'marche';
          n = Math.floor(time / 110);
          const ok = this.fauneAvance(b, b.tx, b.ty, e.vitesse * FUITE.vite, dt);
          if (b.t <= 0 || !ok) {
            if (e.fuit === 'terrier') { b.etat = 'cache'; b.t = entre(...FUITE.cache); } else { b.etat = 'repos'; b.t = entre(...REPOS.attente); }
          }
          break;
        }
        case 'envol': {      // il s'envole, monte et s'en va en s'effaçant
          suite = 'vol';
          n = Math.floor(time / 120);
          const l = Math.hypot(b.tx - b.x, b.ty - b.y) || 1;
          b.x += ((b.tx - b.x) / l) * FUITE.envol * dt;
          b.y += ((b.ty - b.y) / l) * FUITE.envol * dt;
          b.haut = (b.haut || 0) + 24 * dt;
          b.alpha = Math.max(0, b.alpha - dt / 1.6);
          if (b.alpha <= 0) { b.etat = 'cache'; b.t = entre(...FUITE.cache) + 4; }
          break;
        }
        case 'cache': {      // disparu ; revenu à sa place quand le personnage est loin
          b.alpha = Math.max(0, b.alpha - dt * 3);
          const dh = p ? Math.hypot(p.x - b.hx, p.y - b.hy) : Infinity;
          if (b.t <= 0 && dh > e.fuite * FUITE.retour) { b.x = b.hx; b.y = b.hy; b.haut = 0; b.etat = 'revient'; }
          break;
        }
        case 'revient':
          b.alpha = Math.min(1, b.alpha + dt * 1.5);
          if (b.alpha >= 1) { b.etat = 'repos'; b.t = entre(...REPOS.attente); }
          break;
        default: break;
      }
      const cadre = this.fauneCadre(b, suite, n);
      img.setVisible(b.alpha > 0.02).setAlpha(b.alpha).setFrame(cadre);
      if (e.lieu !== 'air') img.setFlipX(b.flip);
      if (b.res) this.fauneRessort(b, suite, n, cadre, dt);
      this.faunePlace(b, b.x, b.y);
    },

    // Son ressort (js/carte/ressort.js), quand son image change : un pas (les images paires d'une
    // marche, d'une fuite, d'une nage : une patte se pose ; les impaires : entre deux pas), un souffle
    // au repos, la tête sous l'eau, un battement d'ailes ; étirée tant qu'elle s'envole.
    fauneRessort(b, suite, n, cadre, dt) {
      const C = K.RESSORT.COUPS, R = b.res;
      if (cadre !== b.vu) {
        if (b.vu != null) {
          if (suite === 'marche' || suite === 'fuite') R.pousse(n % 2 ? C.passage : C.pas);
          else if (suite === 'repos') R.pousse(n % 2 ? C.souffle : -C.souffle);
          else if (suite === 'plonge') R.pousse(C.bouchee);
          else if (suite === 'vol') R.pousse(C.ailes * 0.5);
        }
        b.vu = cadre;
      }
      R.maj(dt, b.etat === 'envol' ? K.RESSORT.TENU.air : 0).applique(b.img);
      // (l'ombre au sol s'élargit avec elle quand elle s'écrase)
      if (b.ombre && b.e.lieu === 'terre') b.ombre.setScale(b.img.scaleX, 1);
    },

    // Elle fuit le personnage (en p) : chacune à sa façon (`fuit`).
    fauneFuit(b, p) {
      const e = b.e, a = Math.atan2(b.y - p.y, b.x - p.x);
      if (global.FermeSon) global.FermeSon.cri(e.cle, b.x, b.y, 0.7);
      // (elle part d'un bond ; sur l'eau, d'un simple coup de pattes)
      if (b.res) b.res.pousse(K.RESSORT.COUPS.elan * (e.fuit === 'nage' ? 0.3 : e.fuit === 'envol' ? 1 : 0.6));
      if (e.fuit === 'envol') {
        b.etat = 'envol'; b.haut = 0;
        b.tx = b.x + Math.cos(a) * 400; b.ty = b.y + Math.sin(a) * 400;
        b.flip = Math.cos(a) < 0;
        return;
      }
      // (loin de lui, en tournant un peu si c'est fermé devant)
      const R = e.fuit === 'terrier' ? 28 : e.vitesse * FUITE.vite * FUITE.court[1];
      for (const da of [0, 0.6, -0.6, 1.2, -1.2]) {
        const x = b.x + Math.cos(a + da) * R, y = b.y + Math.sin(a + da) * R;
        if (!this.faunePeut(b, b.x + Math.cos(a + da) * 8, b.y + Math.sin(a + da) * 8)) continue;
        b.etat = 'fuite'; b.tx = x; b.ty = y;
        b.t = e.fuit === 'terrier' ? 0.5 : entre(...FUITE.court);
        return;
      }
      if (e.fuit === 'terrier') { b.etat = 'cache'; b.t = entre(...FUITE.cache); }
    },

    // L'image de la bête posée en (x, y) (le pied ; un oiseau en vol, plus haut), rangée selon son
    // pied ; son ombre au sol.
    faunePlace(b, x, y) {
      const air = b.e.lieu === 'air', haut = air ? AIR.haut : b.haut || 0;
      b.img.setPosition(Math.round(x), Math.round(y - haut)).setDepth(air || b.etat === 'envol' ? PROFONDEUR.air : y);
      if (b.ombre) {
        b.ombre.setPosition(Math.round(x), Math.round(y)).setAlpha(b.alpha * (air ? AIR.ombre : 0.22));
        if (!air) b.ombre.setDepth(y - 0.5).setVisible(b.img.visible && b.etat !== 'envol');
      }
    },

    // La bête sous le point (wx, wy) (une image visible), ou null.
    fauneAt(wx, wy) {
      const E = this.fauneEtat;
      if (!E || !E.betes) return null;
      let best = null;
      for (const b of E.betes) {
        if (!b.img || !b.img.visible || b.alpha < 0.5) continue;
        const e = b.e, x = b.img.x, y = b.img.y, l = Math.max(10, e.w * 0.4), h = Math.max(14, e.h * 0.8);
        if (Math.abs(wx - x) > l || wy > y + 4 || wy < y - h) continue;
        if (!best || b.img.depth > best.img.depth) best = b;
      }
      return best;
    },

    // Un appui sur une bête : son nom et sa page de l'encyclopédie (la page) ; elle ne fuit pas pour
    // autant.
    fauneTouchee(b) {
      if (global.FermeSon) global.FermeSon.cri(b.e.cle, b.x, b.y);   // son cri (js/son.js)
      if (this.ctx.bridge && this.ctx.bridge.faune) this.ctx.bridge.faune(b.e.cle);
    },

    // (les mesures : les bêtes qui ont leur image en ce moment)
    fauneVivantes() {
      return this.fauneEtat ? this.fauneEtat.vivantes : 0;
    },
  });
})(window);
