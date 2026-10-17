/* carte/ferme/machines.js — la carte de la ferme : les asperseurs et le robot.
 *
 * Les asperseurs rotatifs (leurs gouttes, calculées à partir de l'instant) et le robot de la
 * ferme (sa route, son bras, sa station de charge, sa bulle).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T, SPRINKLER, ROBOT, BUBBLE_TIP_X, BUBBLE_TIP_Y } = F.C;
  const { reducedMotion } = F;

  F.partie({

    // Les asperseurs (modèle.asperseurs : [{ x, y, on }]) : leur image, et quand ils se
    // mettent à tourner (on), l'instant où le jet commence ; quand ils s'arrêtent, les gouttes
    // déjà en l'air finissent de retomber.
    syncSprinklers(list) {
      if (!this.sprinklers) this.sprinklers = new Map();
      const seen = new Set();
      const now = performance.now() / 1000;
      for (const a of list || []) {
        const key = a.x + ',' + a.y;
        seen.add(key);
        let e = this.sprinklers.get(key);
        if (!e) {
          const img = this.has(SPRINKLER.key) ? this.add.sprite(a.x + 0.5, a.y + 1, SPRINKLER.key, 0).setOrigin(0.5, 1).setDepth(a.y + 1) : null;
          e = { x: a.x, y: a.y, img, on: false, start: 0, stop: 0, phase: ((a.x * 7 + a.y * 13) % 100) / 100 * Math.PI * 2 };
          this.sprinklers.set(key, e);
        }
        if (a.on && !e.on) { e.on = true; e.start = now; e.stop = Infinity; }
        if (!a.on && e.on) { e.on = false; e.stop = now; }
      }
      for (const [key, e] of this.sprinklers) {
        if (seen.has(key)) continue;
        if (e.img) e.img.destroy();
        this.sprinklers.delete(key);
      }
    },

    // Le robot : le modèle (robotModel dans js/ui/stage.js), et l'instant où il est arrivé (la
    // tâche avance entre deux modèles au rythme de l'horloge).
    syncRobot(m) {
      if (!m) {
        if (this.bot) { this.bot.img.destroy(); if (this.bot.station) this.bot.station.destroy(); this.bot.el.remove(); this.bot = null; }
        return;
      }
      if (!this.bot) {
        if (!this.has(ROBOT.key)) return;
        const d = this.robotDock();
        const img = this.add.sprite(d.x, d.y, ROBOT.key, 5).setOrigin(0.5, 1).setDepth(d.y);
        const S = ROBOT.station;
        const station = this.has(S.key) ? this.add.sprite(d.x + S.dx, d.y + S.dy, S.key, 0).setOrigin(0.5, 1).setDepth(d.y + S.dy) : null;
        const el = document.createElement('div');
        el.className = 'stage-gain stage-robot';
        el.setAttribute('aria-hidden', 'true');
        el.hidden = true;
        this.ctx.labelLayer.appendChild(el);
        this.bot = { img, station, el, x: d.x, y: d.y, m: null, at: 0, n: 0, roll: 0, w: 0, h: 0, txt: '' };
      }
      const B = this.bot;
      B.m = m;
      B.at = performance.now();
    },

    // Sa base, à côté de la porte de la maison.
    robotDock() {
      const e = this.buildings && this.buildings.get('maison');
      const s = e && e.sprite;
      const door = s ? { x: s.x + s.width * 0.5, y: s.y + 6 } : { x: this.world.w / 2, y: this.world.h / 2 };
      return { x: Math.round(door.x + ROBOT.dock.dx), y: Math.round(door.y + ROBOT.dock.dy) };
    },

    // Où il se tient pour travailler la case `a` : juste à gauche, le bras vers elle ; la
    // Serre : devant sa porte.
    robotSpot(a) {
      if (a === 'serre') {
        const e = this.buildings && this.buildings.get('serre');
        const s = e && e.sprite;
        return s ? { x: Math.round(s.x + s.width * 0.5), y: Math.round(s.y + 8) } : this.robotDock();
      }
      const W = this.grid.cols;
      return { x: (a % W) * T - 3, y: Math.floor(a / W) * T + T - 1 };
    },

    stepRobot(dt) {
      const B = this.bot;
      if (!B) return;
      const m = B.m;
      let frame = 5, move = null;
      // il roule à vitesse constante (m.vitesse px/s) : le moteur compte le trajet dans la
      // durée de la tâche (part `route`) ; en retard (page cachée), il rattrape plus vite
      const v = (m && m.vitesse) || ROBOT.speed;
      const toward = (to, t) => {
        const dx = to.x - B.x, dy = to.y - B.y, l = Math.hypot(dx, dy);
        if (l <= 0.5) return null;
        const st = Math.min(l, Math.max(v, l / Math.max(ROBOT.catchUp, t)) * dt / 1000);
        return { x: B.x + (dx / l) * st, y: B.y + (dy / l) * st };
      };
      if (m && m.etat === 'travail') {
        const prog = Math.min(1, m.prog + (performance.now() - B.at) / 1000 / Math.max(0.1, m.dureeS));
        const route = m.route == null ? 0.5 : m.route;
        move = toward(this.robotSpot(m.a), (route - prog) * m.dureeS);
        if (!move && prog >= route) {
          const w = (prog - route) / Math.max(0.01, 1 - route);    // le bras : descend, serre, remonte
          frame = [2, 3, 4, 4, 3, 2][Math.min(5, Math.floor(w * 6))];
        }
        const txt = ROBOT.icone[m.t] + ' ' + m.n + '/' + m.total;
        if (txt !== B.txt) { B.txt = txt; B.el.textContent = txt; B.w = 0; }
      } else {
        // la liste est faite, ou sa batterie est vide : il rentre à sa station
        move = toward(this.robotDock(), Infinity);
      }
      // à sa station : elle le recharge (la jauge monte, la lumière clignote) ; sa bulle, sa batterie
      const dock = this.robotDock();
      const docked = !move || Math.hypot(dock.x - B.x, dock.y - B.y) < 1;
      const charging = !!(m && m.enCharge && docked && m.etat !== 'travail');
      const empty = !!(m && m.etat === 'charge' && docked);      // batterie vide : sa bulle, même sans courant
      if (B.station) {
        const sf = charging ? 1 + (reducedMotion() ? 3 : Math.floor(performance.now() / 1000 / ROBOT.station.period) % 4) : 0;
        B.station.setFrame(sf).setPosition(dock.x + ROBOT.station.dx, dock.y + ROBOT.station.dy).setDepth(dock.y + ROBOT.station.dy).setVisible(!this.room);
      }
      if (charging || empty) {
        const txt = (charging ? '⚡ ' : '🔋 ') + m.batterie + ' %';
        if (txt !== B.txt) { B.txt = txt; B.el.textContent = txt; B.w = 0; }
      }
      if (move) {
        const moved = Math.hypot(move.x - B.x, move.y - B.y);
        if (moved > 0.01) { B.roll += moved; if (move.x !== B.x) B.img.setFlipX(move.x < B.x); }
        if (moved > 0.01 && frame === 5) frame = Math.floor(B.roll / 3) % 2;
        B.x = move.x; B.y = move.y;
      }
      if (m && m.etat === 'travail' && frame === 5) frame = Math.floor(B.roll / 3) % 2;
      if (frame >= 2 && frame <= 4) B.img.setFlipX(false);   // le bras vers la parcelle, à sa droite
      B.img.setFrame(frame).setPosition(Math.round(B.x), Math.round(B.y)).setDepth(B.y).setVisible(!this.room);
      // la bulle de sa tâche
      const show = !this.room && m && (m.etat === 'travail' || charging || empty);
      B.el.hidden = !show;
      if (!show) return;
      if (!B.w) { B.w = B.el.offsetWidth; B.h = B.el.offsetHeight; }
      const f = this.screenFrame();
      const x = Math.round((B.x - f.left) * f.k - BUBBLE_TIP_X);
      const y = Math.round((B.y - 18 - f.top) * f.k - B.h + BUBBLE_TIP_Y);
      B.el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    },

    // Les gouttes des asperseurs qui tournent, à cet instant (voir SPRINKLER) : en l'air
    // (au-dessus des plantes), leurs ombres et les éclaboussures (sur la terre).
    stepSprinklers() {
      const S = SPRINKLER;
      if (!this.sprinklers || !this.sprinklers.size) return;
      if (!this.sprayAir) {
        this.sprayAir = this.add.graphics().setDepth(this.light ? this.light.depth - 1 : 1e5);
        this.sprayGround = this.add.graphics().setDepth(1.5);
      }
      const air = this.sprayAir.clear(), sol = this.sprayGround.clear();
      if (this.room || reducedMotion()) return;
      const now = performance.now() / 1000;
      const n = Math.round(S.period / S.de);
      const hash = (k, m) => { const x = Math.sin(k * 12.9898 + m * 78.233) * 43758.5453; return x - Math.floor(x); };
      const dot = (g, x, y, c, a) => { g.fillStyle(c, a); g.fillRect(Math.round(x), Math.round(y), 1, 1); };
      for (const e of this.sprinklers.values()) {
        const t = now - e.start, fin = e.stop - e.start;
        if (!e.start || t > fin + S.life) { if (e.img && e.img.frame.name !== 0) e.img.setFrame(0); continue; }
        if (e.img && t <= fin) e.img.setFrame(((Math.round((2 * Math.PI * t / S.period + e.phase) / (Math.PI / 4)) % S.frames) + S.frames) % S.frames);
        const vol = [];
        for (let k = Math.max(0, Math.floor((t - S.life) / S.de)); k <= Math.floor(Math.min(t, fin) / S.de); k++) {
          const em = k * S.de, age = t - em, kk = k % n;
          const ang = 2 * Math.PI * em / S.period + e.phase + (hash(kk, 1) - 0.5) * S.jitter;
          const v = S.v[0] + (S.v[1] - S.v[0]) * hash(kk, 2), vz = S.vz[0] + (S.vz[1] - S.vz[0]) * hash(kk, 4);
          const h = S.h0 + vz * age - S.g * age * age / 2;
          if (h > 0) {
            vol.push([e.x + Math.cos(ang) * v * age, e.y + Math.sin(ang) * v * age, h, kk, vz - S.g * age]);
            continue;
          }
          const ta = (vz + Math.sqrt(vz * vz + 2 * S.g * S.h0)) / S.g, a = age - ta;
          if (a >= S.splash) continue;
          const x = e.x + Math.cos(ang) * v * ta, y = e.y + Math.sin(ang) * v * ta;
          if (a < 0.07) { dot(sol, x, y, S.water[0], 1); dot(sol, x - 1, y, S.water[1], 0.8); dot(sol, x + 1, y, S.water[1], 0.8); }
          else if (a < 0.14) { dot(sol, x - 1, y - 1, S.water[0], 0.85); dot(sol, x + 1, y - 1, S.water[0], 0.85); dot(sol, x, y, S.water[2], 0.55); }
          else { dot(sol, x - 2, y, S.water[1], 0.5); dot(sol, x + 2, y, S.water[1], 0.5); }
        }
        for (const [x, y, h, kk, vzz] of vol) {
          dot(sol, x, y, S.shadow, 0.27);
          dot(air, x, y - h, hash(kk, 3) < 0.45 ? S.water[0] : S.water[1], 1);
          dot(air, x, y - h + (vzz > 0 ? 1 : -1), S.water[2], 0.6);
        }
      }
    },
  });
})(window);
