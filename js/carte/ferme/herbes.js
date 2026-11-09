/* carte/ferme/herbes.js — la scène de la ferme : les touffes d'herbe au pied de ce qui est posé.
 *
 * Là où un mur, un poteau de barrière, un sol posé dehors, le puits ou le silo touche l'herbe, la ligne était
 * nette. Les murs et les sols : ceux posés sur la ferme (chantier.js), et ceux des hameaux de tout
 * le grand monde (js/engine/monde-hameaux.js) : les murs de leurs maisons (des images de la planche
 * « hameaux », vegetation.js), leurs dalles (planchers, dalles, tomettes, pavés de la place : peints
 * dans le sol de leur région). De petites touffes en éventail (HERBES) l'adoucissent : le long du bas des murs (pas
 * devant les portes : on y passe), une petite sous chaque poteau, deux au pied du réverbère (aux
 * bouts de son socle), au bas d'un sol posé dehors, le long du contour arrondi du pied du puits et du silo
 * (avec quelques fleurs : piedHerbe),
 * et quelques brins penchés sur ses côtés. Pas sur le haut d'un sol : vue de dessus, l'herbe
 * de derrière ne passe pas devant lui.
 *
 * Leurs couleurs sont celles de l'herbe juste dessous, lues dans le sol peint (les régions,
 * js/carte/ferme/sol.js) : elles suivent la prairie, la forêt, la montagne. Là où il n'y a pas
 * d'herbe (de la terre, un chemin, du sable, un autre bloc), rien.
 *
 * Les touffes sont refaites quand un bloc ou un sol change, ou qu'une région du sol est peinte :
 * un canevas par rangée, posé juste devant les murs de la rangée (ou sur les sols, à plat).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T, BLOCS_CARTE, HERBES } = F.C;
  const H = BLOCS_CARTE.hauts;
  const estPorte = (s) => s === 'porte' || H.modelesPortes[s] !== undefined;
  // un pixel d'herbe : opaque, nettement plus vert que rouge et que bleu
  const vert = (d, i) => d[i + 3] > 0 && d[i + 1] > d[i] + 6 && d[i + 1] > d[i + 2] + 10;
  const lum = (c) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
  // (le sol seul a changé : les touffes refaites au plus une fois par HERBES_MS)
  const HERBES_MS = 500;

  // Des nombres au hasard, toujours les mêmes pour une même graine (les touffes ne bougent pas
  // d'un dessin à l'autre).
  function hasard(graine) {
    let s = (graine >>> 0) || 1;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  }

  F.partie({

    // Refait les touffes si un bloc, un sol ou le sol peint a changé. Chaque source de touffes (le pied
    // d'un mur ou d'un poteau, d'un mur de hameau, un sol posé dehors) garde les siennes : elles ne sont
    // refaites que si la source est nouvelle, ou si un morceau du sol peint depuis (sol.js, solSale)
    // touche le rectangle d'herbe qu'elle lit. Une rangée (une couche, son canevas) n'est refaite que si
    // ses sources ont changé. Le sol seul a changé (on marche, des morceaux se peignent) : au plus une
    // fois par HERBES_MS.
    syncHerbes() {
      if (!this.blocks && !this.floors) return;
      const formes = (this.blocsN || 0) + ',' + (this.floorsN || 0);
      const cle = formes + ',' + (this.solPeint || 0);
      if (cle === this.herbesCle) return;
      const now = performance.now();
      if (formes === this.herbesFormes && now - (this.herbesT || 0) < HERBES_MS) return;
      this.herbesCle = cle;
      this.herbesFormes = formes;
      this.herbesT = now;
      const sales = this.solSale || [];
      this.solSale = [];
      const touche = (q) => q && sales.some((m) => m.x < q.x + q.w && m.x + m.w > q.x && m.y < q.y + q.h && m.y + m.h > q.y);
      const avant = this.herbesSources || new Map(), sources = new Map();
      // La source `id` (ses touffes faites par `faire`, qui renvoie { k, profondeur, pixels, rect }) :
      // gardée, ou refaite.
      const source = (id, faire) => {
        let r = avant.get(id);
        if (!r || touche(r.rect)) { this.herbesV = (this.herbesV || 0) + 1; r = faire(); r.v = this.herbesV; }
        sources.set(id, r);
      };
      const cols = this.grid.cols, B = this.blocks || new Map();
      const S = new Set([...(this.floors || new Map()).keys(), ...this.dallesHameaux()]);
      const pris = (c) => B.has(c) || S.has(c);

      // Le pied d'une image debout : son image (clé, numéro), son coin haut gauche (x0, y0), le bas
      // de sa case (pied), sa case ; un poteau (une petite touffe par poteau), un réverbère (`lampe` : une
      // petite touffe de chaque côté de son socle) ou un mur.
      const debout = (key, frame, x0, y0, pied, c, poteau, lampe) => {
        const out = { k: 'd' + Math.floor(c / cols), profondeur: pied + HERBES.dessus, pixels: [], rect: null };
        const p = this.profilHerbe(key, frame);
        if (!p) return out;
        const y = y0 + p.bas + 1;
        out.rect = { x: Math.round(x0 - HERBES.fenetre), y: Math.round(y), w: p.w + 2 * HERBES.fenetre, h: HERBES.fenetre + 2 };
        const fond = this.fondHerbe(x0 - HERBES.fenetre, y, p.w + 2 * HERBES.fenetre, HERBES.fenetre + 2);
        if (!fond) return out;
        const pieds = p.colonnes.map((k) => x0 + k).filter((x) => fond.vert(x, y));
        const rng = hasard(c * 7919 + 13);
        if (lampe) {
          // (au pied du réverbère, remonté dans sa case : une petite touffe sur chaque coin de son socle)
          if (pieds.length) for (const x of [pieds[0] + 1, pieds[pieds.length - 1] - 1]) touffe(out.pixels, x, y, fond.teintes, HERBES.petite, rng);
        } else if (poteau) {
          // (une petite touffe au milieu de chaque poteau : ses colonnes qui se suivent)
          for (const g of groupes(pieds)) touffe(out.pixels, g[g.length >> 1], y, fond.teintes, HERBES.petite, rng);
        } else {
          for (let i = Math.floor(rng() * HERBES.pas[0]); i < pieds.length; i += pas(rng)) touffe(out.pixels, pieds[i], y, fond.teintes, HERBES.touffe, rng);
        }
        return out;
      };

      // le bas des murs de la ferme (pas des portes) et le pied des poteaux
      for (const e of B.values()) {
        const poteau = BLOCS_CARTE.clotures.couleurs[e.sorte] !== undefined;   // (une barrière, de toute couleur)
        if (!e.img || !e.img.active || (!poteau && (e.img.texture.key !== H.key || estPorte(e.sorte)))) continue;
        // (un bloc remonté dans sa case, le réverbère : son pied est dans sa case, la case du dessous n'y fait rien)
        const lampe = e.img.y < e.y;
        if (!lampe && pris(e.case + cols)) continue;
        const f = e.img.frame, x0 = e.x - f.cutWidth / 2, y0 = e.img.y - f.cutHeight;
        source(`b${e.case}/${e.img.texture.key}/${f.name}/${x0},${y0}/${poteau ? 1 : 0}`, () => debout(e.img.texture.key, f.name, x0, y0, e.y, e.case, poteau, lampe));
      }

      // le pied du puits et du silo (leurs propres images : modele.js syncWell, silo.js) : touffes et fleurs
      const pieds = [];
      if (this.well && this.well.active) pieds.push(['puits', this.well]);
      if (this.silo && this.silo.img && this.silo.img.active) pieds.push(['silo', this.silo.img]);
      for (const [nom, im] of pieds) {
        const f = im.frame, x0 = Math.round(im.x - im.originX * f.cutWidth), y0 = Math.round(im.y - im.originY * f.cutHeight);
        source(`p${nom}/${im.texture.key}/${f.name}/${x0},${y0}`, () => this.piedHerbe(im.texture.key, f.name, x0, y0, im.depth, nom));
      }

      // le bas des murs des maisons des hameaux (HERBES.mursHameaux ; pas les portes)
      for (const m of this.mursHameaux()) source(`h${m.case}/${m.n}/${m.x},${m.y}`, () => debout('hameaux', m.n, m.x - m.c.px, m.y - m.c.py, m.y, m.case, false));

      // les sols posés dehors : leur bas, leurs côtés
      for (const c of S) {
        const col = c % cols, r = Math.floor(c / cols), x0 = col * T, y0 = r * T;
        const bas = !pris(c + cols), gauche = col > 0 && !pris(c - 1), droite = col < cols - 1 && !pris(c + 1);
        source(`s${c}/${bas ? 1 : 0}${gauche ? 1 : 0}${droite ? 1 : 0}`, () => {
          const out = { k: 's' + r, profondeur: HERBES.plat, pixels: [], rect: { x: x0 - HERBES.fenetre, y: y0, w: T + 2 * HERBES.fenetre, h: T + HERBES.fenetre + 2 } };
          const rng = hasard(c * 104729 + 7);
          if (bas) {
            const y = y0 + T, fond = this.fondHerbe(x0 - HERBES.fenetre, y, T + 2 * HERBES.fenetre, HERBES.fenetre + 2);
            if (fond) {
              const pieds = [];
              for (let x = x0; x < x0 + T; x++) if (fond.vert(x, y)) pieds.push(x);
              for (let i = Math.floor(rng() * HERBES.pas[0]); i < pieds.length; i += pas(rng)) touffe(out.pixels, pieds[i], y, fond.teintes, HERBES.touffe, rng);
            }
          }
          for (const [ici, x, sens] of [[gauche, x0 - 1, 1], [droite, x0 + T, -1]]) {
            if (!ici) continue;
            const fond = this.fondHerbe(sens > 0 ? x - HERBES.fenetre + 1 : x, y0, HERBES.fenetre, T);
            if (!fond) continue;
            for (let y = y0; y < y0 + T - 1; y++) {
              if (rng() >= HERBES.cotes || !fond.vert(x, y)) continue;
              brin(out.pixels, x, y + 1, rng() < 0.5 ? 2 : 3, fond.teintes, 0, sens);
              y += 2;                                    // (pas deux brins collés : pas de trait)
            }
          }
          return out;
        });
      }
      this.herbesSources = sources;

      // les couches (une par rangée et par genre) : leurs sources, dans l'ordre ; la première donne
      // la profondeur
      const couches = new Map();
      for (const [id, r] of sources) {
        const C = couches.get(r.k) || couches.set(r.k, { profondeur: r.profondeur, sig: '', pixels: [] }).get(r.k);
        if (!r.pixels.length) continue;
        C.sig += id + '#' + r.v + ';';
        for (const px of r.pixels) C.pixels.push(px);
      }
      // un canevas par couche, juste à la taille de ses touffes ; refait si ses sources ont changé
      const faites = this.herbesCouches || new Map(), gardees = new Map();
      for (const [k, C] of couches) {
        if (!C.pixels.length) continue;
        const f = faites.get(k);
        if (f && f.sig === C.sig) { gardees.set(k, f); continue; }
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const [x, y] of C.pixels) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
        this.herbesN = (this.herbesN || 0) + 1;
        const key = 'herbes_' + k + '_' + this.herbesN;
        const cv = this.textures.createCanvas(key, x1 - x0 + 1, y1 - y0 + 1), g = cv.context;
        for (const [x, y, c] of C.pixels) { g.fillStyle = c; g.fillRect(x - x0, y - y0, 1, 1); }
        cv.refresh();
        gardees.set(k, { sig: C.sig, key, img: this.add.image(x0, y0, key).setOrigin(0).setDepth(C.profondeur) });
      }
      for (const [k, f] of faites) if (gardees.get(k) !== f) { f.img.destroy(); this.textures.remove(f.key); }
      this.herbesCouches = gardees;
      this.herbes = [...gardees.values()];
    },

    // Les herbes au pied d'une grande image posée seule (le puits, le silo) : son image (clé, numéro), son coin haut
    // gauche, sa profondeur. Des touffes aux couleurs de l'herbe le long du contour de son pied (une image ronde :
    // il remonte vers les côtés), et quelques fleurs. → { k, profondeur, pixels, rect }.
    piedHerbe(key, frame, x0, y0, profondeur, nom) {
      const out = { k: 'p' + nom, profondeur: profondeur + HERBES.dessus, pixels: [], rect: null };
      const p = this.profilHerbe(key, frame);
      if (!p) return out;
      const Fe = HERBES.fenetre, yb = y0 + p.bas + 1;
      // le contour du bas : pour chaque colonne qui descend assez bas, son pied (x, y)
      const pts = [];
      p.parColonne.forEach((b, k) => { if (b >= 0 && b >= p.bas - HERBES.contour) pts.push([x0 + k, y0 + b + 1]); });
      if (!pts.length) return out;
      const yh = Math.min(...pts.map((q) => q[1]));
      out.rect = { x: x0 - Fe, y: yh - 8, w: p.w + 2 * Fe, h: yb - yh + Fe + 10 };
      const fond = this.fondHerbe(out.rect.x, out.rect.y, out.rect.w, out.rect.h);
      if (!fond) return out;
      const t = fond.teintes, ok = pts.filter(([x, y]) => fond.vert(x, y));
      if (!ok.length) return out;
      const rng = hasard((x0 * 31 + y0 * 17 + nom.length) >>> 0);
      // le long du contour (un peu plus serré que le long d'un mur)
      for (let i = Math.floor(rng() * 3); i < ok.length; i += Math.max(2, pas(rng) - 4)) touffe(out.pixels, ok[i][0], ok[i][1], t, rng() < 0.35 ? HERBES.petite : HERBES.touffe, rng);
      // quelques fleurs, comme les fleurs sauvages de la carte : une tige, quatre pétales autour d'un cœur jaune ;
      // pas deux côte à côte
      const posees = [];
      for (let k = 0; k < HERBES.fleurs * 3 && posees.length < HERBES.fleurs; k++) {
        const q = ok[Math.floor(rng() * ok.length)], x = q[0] + Math.floor(rng() * 7) - 3, yy = q[1] + 1 + Math.floor(rng() * 2);
        if (!fond.vert(x, yy) || posees.some((o) => Math.abs(o - x) < 5)) continue;
        posees.push(x);
        const c = HERBES.couleursFleurs[Math.floor(rng() * HERBES.couleursFleurs.length)];
        out.pixels.push([x, yy, t[0]], [x, yy - 1, t[1]], [x, yy - 3, c], [x - 1, yy - 2, c], [x + 1, yy - 2, c], [x, yy - 2, HERBES.coeurFleur]);
      }
      return out;
    },

    // Les murs des maisons des hameaux, dans les régions dessinées : les images de leur plan
    // (reg.hameau.images : [sorte, x, y, variante], le pied en px) dont la sorte est un mur ou une
    // fenêtre (HERBES.mursHameaux) : { n (son numéro dans la planche « hameaux »), c (son cadre), x,
    // y, case }.
    mursHameaux() {
      const M = this.ctx.monde, V = this.veg, out = [];
      const pl = M && V && V.planches.find((q) => q.cle === 'hameaux');
      if (!pl) return out;
      const W = this.grid.cols, murs = pl.sortes.map((s) => HERBES.mursHameaux.test(s.nom));
      for (const r of this.regions ? this.regions.values() : []) {
        const reg = r.tex && M.region(r.rx, r.ry), im = reg && reg.hameau && reg.hameau.images;
        if (!im) continue;
        for (let q = 0; q < im.length; q += 4) {
          if (!murs[im[q]]) continue;
          const n = pl.images[im[q]][im[q + 3]], c = n == null ? null : pl.cadres[n];
          if (c) out.push({ n, c, x: im[q + 1], y: im[q + 2], case: Math.floor((im[q + 2] - 1) / T) * W + Math.floor(im[q + 1] / T) });
        }
      }
      return out;
    },

    // Les cases des dalles des hameaux, dans les régions dessinées : les « basses » de leur plan
    // (reg.hameau.basses : [sorte, x, y, variante], le pied en px) dont la sorte est un sol
    // (HERBES.dallesHameaux).
    dallesHameaux() {
      const M = this.ctx.monde, out = [];
      if (!M || !M.hameauSortes) return out;
      const W = this.grid.cols, sortes = M.hameauSortes.map((s) => HERBES.dallesHameaux.test(s.nom));
      for (const r of this.regions ? this.regions.values() : []) {
        const reg = r.tex && M.region(r.rx, r.ry), b = reg && reg.hameau && reg.hameau.basses;
        if (!b) continue;
        for (let q = 0; q < b.length; q += 4) if (sortes[b[q]]) out.push(Math.floor((b[q + 2] - 1) / T) * W + Math.floor(b[q + 1] / T));
      }
      return out;
    },

    // Le bas d'une image (clé, image) : sa largeur `w`, sa hauteur `h`, sa rangée la plus basse
    // `bas`, et les colonnes qui y descendent (tout le mur ; les poteaux d'une barrière, plus
    // bas que ses lisses). Calculé une fois par image.
    profilHerbe(key, frame) {
      const cache = this.herbesProfils || (this.herbesProfils = new Map()), k = key + '/' + frame;
      if (cache.has(k)) return cache.get(k);
      const f = this.textures.getFrame(key, frame);
      let p = null;
      if (f && f.source && f.source.image) {
        const w = f.cutWidth, h = f.cutHeight, cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const g = cv.getContext('2d');
        g.drawImage(f.source.image, f.cutX, f.cutY, w, h, 0, 0, w, h);
        const d = g.getImageData(0, 0, w, h).data, bas = [];
        for (let x = 0; x < w; x++) {
          let b = -1;
          for (let y = h - 1; y >= 0 && b < 0; y--) if (d[(y * w + x) * 4 + 3] > 0) b = y;
          bas.push(b);
        }
        const m = Math.max(...bas);
        if (m >= 0) p = { w, h, bas: m, colonnes: bas.map((b, x) => (b === m ? x : -1)).filter((x) => x >= 0), parColonne: bas };
      }
      cache.set(k, p);
      return p;
    },

    // Le sol peint sur ce rectangle (px de carte), lu dans les morceaux du sol peints (sol.js, lireSol) :
    // vert(x, y) (de l'herbe ?) et ses teintes [sombre, moyenne, claire] ; null sans région
    // dessinée, ou sans assez d'herbe (HERBES.herbeMin).
    fondHerbe(x, y, w, h) {
      x = Math.round(x); y = Math.round(y);
      const lu = this.lireSol(x, y, w, h);
      if (!lu) return null;
      const d = lu.data, verts = [];
      for (let i = 0; i < d.length; i += 4) if (vert(d, i)) verts.push([d[i], d[i + 1], d[i + 2]]);
      if (verts.length < HERBES.herbeMin * w * h) return null;
      verts.sort((a, b) => lum(a) - lum(b));
      const teintes = HERBES.teintes.map((q) => { const c = verts[Math.min(verts.length - 1, Math.floor(q * verts.length))]; return 'rgb(' + c.join(',') + ')'; });
      return {
        teintes,
        vert: (px, py) => px >= x && py >= y && px < x + w && py < y + h && vert(d, ((py - y) * w + (px - x)) * 4),
      };
    },
  });

  // L'écart jusqu'à la touffe suivante (HERBES.pas).
  function pas(rng) {
    return HERBES.pas[0] + Math.floor(rng() * (HERBES.pas[1] - HERBES.pas[0] + 1));
  }

  // Les suites de x qui se suivent (les colonnes d'un même poteau).
  function groupes(xs) {
    const out = [];
    for (const x of xs) {
      const g = out[out.length - 1];
      if (g && x - g[g.length - 1] <= 1) g.push(x); else out.push([x]);
    }
    return out;
  }

  // Une touffe en éventail, plantée en (x, y) : ses brins (forme : [décalage, hauteur, penchant]),
  // chacun un peu plus ou moins haut au hasard.
  function touffe(pixels, x, y, teintes, forme, rng) {
    for (const [dx, h, p] of forme) brin(pixels, x + dx, y, Math.max(1, h - (rng() < 0.34 ? 1 : 0)), teintes, p, 0);
  }

  // Un brin qui monte de h px depuis (x, y) : sombre au pied, clair à la pointe ; sa pointe penche
  // de `pointe` px ; sur le côté d'un sol (`cote` : 1 vers la droite, -1 vers la gauche), tout le
  // brin au-dessus du pied penche vers lui.
  function brin(pixels, x, y, h, teintes, pointe, cote) {
    for (let k = 0; k < h; k++) {
      const px = x + (cote && k >= 1 ? cote : k === h - 1 && h > 1 ? pointe : 0);
      pixels.push([px, y - k, teintes[k === 0 ? 0 : k === h - 1 ? 2 : 1]]);
    }
  }
})(window);
