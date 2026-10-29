/* carte/ferme/camera.js — la scène de la ferme : la caméra (zoom, glissement, repères).
 *
 * Le zoom (VIEW_ROWS rangées en hauteur ; sur téléphone, deux doigts pincés le réduisent
 * jusqu'à ZOOM.min : pincement), le centre de la vue borné à la carte, l'élan après un
 * glissement, les trois repères et ce que la page en sait (onView), panTo().
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const K = global.CarteKit;
  const { T, VIEW_ROWS, ZOOM, INERTIA_MS, PAN_MS } = F.C;
  const { clamp, reducedMotion } = F;

  F.partie({

    /* ---------- caméra : zoom, glissement, élan ---------- */

    // Zoom : VIEW_ROWS rangées sont visibles en hauteur (toute la carte si elle est plus
    // petite), fois le dézoom du pincement (zoomK, de ZOOM.min à 1), et la zone est
    // entièrement couverte (jamais de bande, jamais rien hors de la carte). Le centre courant
    // est conservé.
    fit() {
      const w = this.scale.width, h = this.scale.height;
      if (!w || !h) return;
      const cam = this.cameras.main;
      cam.setSize(w, h);
      const plein = Math.max(h / this.world.h, w / this.world.w);
      cam.setZoom(Math.max(plein, Math.max(h / Math.min(this.world.h, VIEW_ROWS * T), w / this.world.w) * (this.zoomK || 1)));
      cam.setBounds(0, 0, this.world.w, this.world.h);
      this.setCentre(this.cx, this.cy);
    },

    // Centre la vue sur (cx, cy) sans jamais sortir de la carte. Renvoie false si la
    // position demandée a été bornée (bord atteint).
    setCentre(cx, cy) {
      const cam = this.cameras.main;
      const vw = this.scale.width / cam.zoom, vh = this.scale.height / cam.zoom;
      this.cx = clamp(cx, vw / 2, this.world.w - vw / 2);
      this.cy = clamp(cy, vh / 2, this.world.h - vh / 2);
      cam.centerOn(this.cx, this.cy);
      return Math.abs(this.cx - cx) < 0.01 && Math.abs(this.cy - cy) < 0.01;
    },

    // Sur téléphone et tablette : deux doigts pincés ou écartés sur la carte règlent le zoom,
    // du zoom de départ (le plus proche) à ZOOM.min fois lui ; le point entre les deux doigts
    // reste sous eux. Les doigts sont lus sur le canvas lui-même (Phaser ne suit qu'un doigt) :
    // le deuxième posé annule ce que faisait le premier (glissement, marche, appui maintenu,
    // labour, coup fort) ; ensuite, jusqu'à ce que les doigts soient levés, ils ne font rien
    // d'autre. Rien à la souris, rien sur ordinateur.
    makePincement() {
      const cv = this.game.canvas;
      if (!cv || !K.appareilMobile() || cv.dataset.pincement) return;
      cv.dataset.pincement = '1';
      const ecart = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
      const milieu = (t) => {
        const r = cv.getBoundingClientRect();
        return { x: (((t[0].clientX + t[1].clientX) / 2 - r.left) * this.scale.width) / r.width, y: (((t[0].clientY + t[1].clientY) / 2 - r.top) * this.scale.height) / r.height };
      };
      cv.addEventListener('touchstart', (e) => {
        if (e.touches.length < 2 || !this.scene.isActive()) return;
        const d = this.drag;
        if (d) {
          clearTimeout(d.holdTimer);
          if (d.fort) this.chargeCancel(d);
          if (d.labour) this.clearLabourMarks();
          this.drag = null;
        }
        if (this.manette) this.manette.stop();
        this.vx = this.vy = 0;
        this.pan = null;
        this.setHover(null);
        this.pince = { d: ecart(e.touches) || 1, k: this.zoomK || 1 };
      }, { passive: true });
      cv.addEventListener('touchmove', (e) => {
        const P = this.pince;
        if (!P || e.touches.length < 2) return;
        if (this.manette) this.manette.stop();
        this.zoomer(P.k * (ecart(e.touches) / P.d), milieu(e.touches));
      }, { passive: true });
      const fin = (e) => { if (!e.touches.length) this.pince = null; };
      cv.addEventListener('touchend', fin, { passive: true });
      cv.addEventListener('touchcancel', fin, { passive: true });
    },

    // Le dézoom `k` (borné à ZOOM.min…1), le point `a` de l'écran (px du canvas) gardé sous
    // le doigt.
    zoomer(k, a) {
      const cam = this.cameras.main, z0 = cam.zoom;
      k = clamp(k, ZOOM.min, 1);
      if (k === this.zoomK) return;
      const w = this.scale.width, h = this.scale.height;
      const px = this.cx + (a.x - w / 2) / z0, py = this.cy + (a.y - h / 2) / z0;
      this.zoomK = k;
      this.fit();
      const z = cam.zoom;
      // (dehors, la vue reste sur le personnage : seul le zoom change)
      if (!this.suitPerso()) this.setCentre(px - (a.x - w / 2) / z, py - (a.y - h / 2) / z);
    },

    stepInertia(dt) {
      if (this.drag) { this.vx = this.vy = 0; return; }
      const free = this.setCentre(this.cx + this.vx * dt, this.cy + this.vy * dt);
      const k = Math.exp(-dt / INERTIA_MS);
      this.vx *= k; this.vy *= k;
      if (!free || Math.hypot(this.vx, this.vy) < 0.01) this.vx = this.vy = 0;
    },

    /* ---------- vue : repère courant, déplacement demandé ---------- */

    // Les trois repères de la carte, de gauche à droite : l'étable, la maison avec la zone de
    // culture, le moulin avec la serre. Chacun est le centre des rectangles qu'il réunit : ils
    // suivent la carte, où que les bâtiments y soient posés.
    makeScreens() {
      const centre = (...names) => {
        const r = names.map((n) => this.objects[n]).filter(Boolean);
        if (!r.length) return { x: this.world.w / 2, y: this.world.h / 2 };
        const x0 = Math.min(...r.map((o) => o.x)), x1 = Math.max(...r.map((o) => o.x + o.width));
        const y0 = Math.min(...r.map((o) => o.y)), y1 = Math.max(...r.map((o) => o.y + o.height));
        return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
      };
      // (la ferme générée n'a ni grange, ni moulin, ni serre : ils s'y bâtissent ; les zones de
      // culture les remplacent)
      const ou = (nom, autre) => (this.objects[nom] ? nom : autre);
      this.screens = [centre(ou('grange', 'zone_culture')), centre('maison', 'zone_culture'), this.objects.moulin || this.objects.serre ? centre('moulin', 'serre') : centre(ou('zone_culture_2', 'zone_culture'))];
    },

    // Bornes du centre de la vue : elle ne sort jamais de la carte.
    bounds() {
      const cam = this.cameras.main;
      const vw = this.scale.width / cam.zoom, vh = this.scale.height / cam.zoom;
      return { minX: vw / 2, maxX: this.world.w - vw / 2, minY: vh / 2, maxY: this.world.h - vh / 2 };
    },

    // Où en est la vue, pour la page : `ecran` = repère le plus proche, 0 (gauche), 1 (milieu)
    // ou 2 (droite) ; `points` = centre de chaque repère ; `min` et `max` = bornes du centre ;
    // `mobile` = la carte dépasse-t-elle de la zone ?
    viewInfo() {
      const b = this.bounds();
      const min = b.minX, max = b.maxX;
      // la vue qui suit le personnage ne glisse pas au doigt : pas de flèches sur les bords
      const mobile = !this.suitPerso() && (max - min > 1 || b.maxY - b.minY > 1);
      const xs = this.screens.map((p) => clamp(p.x, min, max));
      let ecran = 0;
      xs.forEach((x, i) => { if (Math.abs(this.cx - x) < Math.abs(this.cx - xs[ecran])) ecran = i; });
      return {
        x: this.cx, min, max, mobile, ecrans: xs.length, points: this.screens.map((p) => ({ x: p.x, y: p.y })),
        ecran: mobile ? ecran : 1,
        gauche: mobile && this.cx > xs[0] + 1,               // il reste un repère à gauche
        droite: mobile && this.cx < xs[xs.length - 1] - 1,   // il reste un repère à droite
        glisse: this.dragged,
        bas: mobile && this.cy < b.maxY - 1,                // FLU-07 : la carte continue vers le bas
      };
    },

    // Prévient la page quand quelque chose qu'elle affiche a changé (pas à chaque image).
    // viewInfo() n'est refaite que si ce dont elle dépend a bougé (centre, taille, zoom,
    // repères, glissement) : à l'arrêt, rien n'est alloué à chaque image.
    reportView() {
      if (!this.ctx.bridge || !this.ctx.bridge.onView) return;
      const cam = this.cameras.main;
      const I = this.viewIn || (this.viewIn = {});
      if (I.cx === this.cx && I.cy === this.cy && I.zoom === cam.zoom && I.w === this.scale.width && I.h === this.scale.height
        && I.screens === this.screens && I.dragged === this.dragged) return;
      I.cx = this.cx; I.cy = this.cy; I.zoom = cam.zoom; I.w = this.scale.width; I.h = this.scale.height;
      I.screens = this.screens; I.dragged = this.dragged;
      const v = this.viewInfo();
      const key = [v.ecran, v.mobile, v.gauche, v.droite, v.bas, v.glisse].join();
      if (key === this.viewKey) return;
      this.viewKey = key;
      this.ctx.bridge.onView(v);
    },

    // Centre d'un lieu de la carte (bâtiment affiché, Zone de culture ou Champ), en px de carte.
    place(id) {
      // version 1.15 : la Zone de culture couvre toute la carte ; son repère reste
      // l'ancienne zone (rectangle zone_culture_1), près de la maison
      if (id === 'zone') {
        const z = this.objects.zone_culture;
        return z ? { x: z.x + z.width / 2, y: z.y + z.height / 2 } : null;
      }
      return null;
    },

    // Glisse jusqu'à x (px de carte, sans changer de hauteur), jusqu'à un point { x, y } ou
    // jusqu'à un lieu ('maison', 'etable', 'zone'…). `now` : sans animation. Renvoie false si
    // le lieu n'est pas sur la carte.
    panTo(target, now) {
      if (this.suitPerso()) return true;           // dehors, elle reste sur le personnage
      const p = typeof target === 'number' ? { x: target, y: this.cy }
        : target && typeof target === 'object' ? target : this.place(target);
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
      this.vx = this.vy = 0;
      if (now || reducedMotion()) { this.pan = null; this.setCentre(p.x, p.y); return true; }
      const b = this.bounds();
      this.pan = { x0: this.cx, y0: this.cy, x1: clamp(p.x, b.minX, b.maxX), y1: clamp(p.y, b.minY, b.maxY), t0: performance.now() };
      return true;
    },

    stepPan() {
      const p = this.pan;
      const t = Math.min(1, (performance.now() - p.t0) / PAN_MS);
      const k = 1 - Math.pow(1 - t, 3);            // départ vif, arrivée douce
      this.setCentre(p.x0 + (p.x1 - p.x0) * k, p.y0 + (p.y1 - p.y0) * k);
      if (t >= 1) this.pan = null;
    },

  });
})(window);
