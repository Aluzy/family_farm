/* carte/ville/faune.js — la scène de la ville : les animaux de la montagne et de la plage.
 *
 * Des animaux à regarder (couche « animaux » : une zone par espèce, FAUNE) : la marmotte qui
 * rentre dans son terrier, le bouquetin, l'aigle qui tourne haut dans le ciel ; la mouette qui
 * s'envole, le crabe qui file de côté, le dauphin qui saute au large.
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const V = global.CarteVille;
  const { VOL, FAUNE } = V.C;
  const { reduced } = V;

  V.partie({

    // ---------- les animaux ----------

    makeFauna(zones) {
      this.animals = [];
      const meta = (this.cache.json.get('faune') || {}).especes || {};
      const rnd = (a, b) => a + Math.random() * (b - a);
      for (const z of zones) {
        const esp = ((z.properties || []).find((q) => q.name === 'espece') || {}).value || z.name;
        const def = FAUNE.especes[esp], m = meta[esp];
        if (!def || !m || !this.textures.exists('faune_' + esp)) continue;
        const frames = {};
        m.frames.forEach((n, i) => { frames[n] = i; });
        for (let i = 0; i < def.n; i++) {
          const x = rnd(z.x, z.x + z.width), y = rnd(z.y, z.y + z.height);
          const s = this.add.sprite(Math.round(x), Math.round(y), 'faune_' + esp, 0).setOrigin(m.anchor.x / m.frameWidth, m.anchor.y / m.frameHeight);
          const a = { esp, def, nom: m.nom, zone: z, frames, s, x, y, tx: x, ty: y, state: 'repos', wait: rnd(0.5, 4), walked: 0, alt: 0, alpha: 1, t: 0 };
          if (esp === 'aigle') Object.assign(a, { cx: x, cy: y, ang: rnd(0, 6.3), shadow: this.add.ellipse(0, 0, 16, 5, 0x1e1a18, 0.18).setDepth(0) });
          if (esp === 'mouette') a.shadow = this.add.ellipse(0, 0, 8, 3, 0x1e1a18, 0.25).setVisible(false);
          if (esp === 'dauphin') { a.state = 'attente'; a.wait = rnd(2, 6); s.setVisible(false); }
          this.animals.push(a);
        }
      }
    },

    tapAnimal(w) {
      const a = (this.animals || []).find((q) => q.s.visible && q.alpha > 0.5 && Math.abs(w.x - q.s.x) <= (q.def.size > 16 ? 16 : 10)
        && w.y >= q.s.y - (q.def.size > 16 ? 30 : 16) && w.y <= q.s.y + 6);
      if (!a) return false;
      this.say(a.def.texte);
      return true;
    },

    stepFauna(time, dt) {
      if (!this.animals || !this.animals.length) return;
      const P = this.heroPos, still = reduced();
      const rnd = (a, b) => a + Math.random() * (b - a);
      const inZone = (z) => ({ x: rnd(z.x, z.x + z.width), y: rnd(z.y, z.y + z.height) });
      const frame = (a, n) => { if (a.frames[n] !== undefined) a.s.setFrame(a.frames[n]); };
      for (const a of this.animals) {
        const z = a.zone;
        if (a.esp === 'aigle') {
          // il tourne en grands cercles, son centre dérive lentement d'un bout à l'autre de la carte
          if (!still) {
            a.ang += dt * 0.32;
            if (Math.hypot(a.tx - a.cx, a.ty - a.cy) < 8) { const p = inZone(z); a.tx = p.x; a.ty = p.y; }
            const l = Math.hypot(a.tx - a.cx, a.ty - a.cy) || 1;
            a.cx += (a.tx - a.cx) / l * 10 * dt;
            a.cy += (a.ty - a.cy) / l * 10 * dt;
          }
          const x = a.cx + Math.cos(a.ang) * 96, y = a.cy + Math.sin(a.ang) * 54;
          a.s.setPosition(Math.round(x), Math.round(y)).setDepth(VOL).setRotation(a.ang + Math.PI);
          frame(a, Math.floor(time / 900) % 5 === 0 ? 'vol_1' : 'vol_0');
          a.shadow.setPosition(Math.round(x + 34), Math.round(y + 70));
          continue;
        }
        if (a.esp === 'dauphin') {
          // de temps en temps, un saut au large : la gerbe, le saut, la gerbe
          const seq = ['gerbe', 'saut_0', 'saut_1', 'saut_2', 'saut_3', 'gerbe'];
          if (a.state === 'attente') {
            a.wait -= dt;
            if (a.wait <= 0 && !still) { const p = inZone(z); Object.assign(a, { x: p.x, y: p.y, state: 'saut', t: 0, sens: Math.random() < 0.5 ? -1 : 1 }); }
          } else {
            a.t += dt;
            const k = Math.floor(a.t / 0.17);
            if (k >= seq.length) { a.state = 'attente'; a.wait = rnd(4, 11); a.s.setVisible(false); continue; }
            frame(a, seq[k]);
            a.s.setVisible(true).setFlipX(a.sens < 0).setPosition(Math.round(a.x + a.sens * k * 5), Math.round(a.y)).setDepth(a.y);
          }
          continue;
        }
        const dHero = Math.hypot(P.x - a.x, P.y - a.y);
        // dérangé : la marmotte rentre dans son terrier, le crabe file, la mouette s'envole
        if (a.def.peur && dHero < a.def.peur && ['repos', 'marche'].includes(a.state) && !still) {
          if (a.esp === 'marmotte') { a.state = 'cache'; a.wait = rnd(6, 11); }
          else if (a.esp === 'crabe') {
            const l = dHero || 1;
            a.tx = Math.max(z.x, Math.min(z.x + z.width, a.x + (a.x - P.x) / l * 56));
            a.ty = Math.max(z.y, Math.min(z.y + z.height, a.y + (a.y - P.y) / l * 20));
            a.state = 'fuite';
          } else if (a.esp === 'mouette') {
            let p = inZone(z);
            for (let i = 0; i < 6 && Math.hypot(p.x - P.x, p.y - P.y) < 90; i++) p = inZone(z);
            Object.assign(a, { tx: p.x, ty: p.y, state: 'vol', t: 0, x0: a.x, y0: a.y });
          }
        }
        let moving = false;
        if (a.state === 'cache') {
          a.alpha = Math.max(0, a.alpha - dt / 0.3);
          a.wait -= dt;
          if (a.wait <= 0) { const p = inZone(z); Object.assign(a, { x: p.x, y: p.y, state: 'sort' }); }
        } else if (a.state === 'sort') {
          a.alpha = Math.min(1, a.alpha + dt / 0.5);
          if (a.alpha >= 1) { a.state = 'repos'; a.wait = rnd(1, 3); }
        } else if (a.state === 'vol') {
          const l = Math.hypot(a.tx - a.x0, a.ty - a.y0) || 1, dur = Math.max(1.2, l / 70);
          a.t += dt;
          const q = Math.min(1, a.t / dur);
          a.x = a.x0 + (a.tx - a.x0) * q;
          a.y = a.y0 + (a.ty - a.y0) * q;
          a.alt = Math.sin(q * Math.PI) * 26;
          if (q >= 1) { a.state = 'repos'; a.wait = rnd(2, 6); a.alt = 0; }
        } else if (a.state === 'repos') {
          a.wait -= dt;
          if (a.wait <= 0 && !still) {
            const p = inZone(z);
            // la mouette s'envole parfois d'elle-même
            if (a.esp === 'mouette' && Math.random() < 0.3) Object.assign(a, { tx: p.x, ty: p.y, state: 'vol', t: 0, x0: a.x, y0: a.y });
            else Object.assign(a, { tx: p.x, ty: p.y, state: 'marche' });
          }
        } else if (a.state === 'marche' || a.state === 'fuite') {
          const dx = a.tx - a.x, dy = a.ty - a.y, l = Math.hypot(dx, dy), st = a.def.speed * (a.state === 'fuite' ? 3 : 1) * dt;
          if (a.esp !== 'crabe' && Math.abs(dx) > 0.5) a.s.setFlipX(dx < 0);
          if (l <= st) { a.x = a.tx; a.y = a.ty; a.state = 'repos'; a.wait = rnd(1.5, 5); } else { a.x += dx / l * st; a.y += dy / l * st; }
          a.walked += Math.min(l, st);
          moving = true;
        }
        // les images
        if (a.state === 'vol') {
          frame(a, Math.floor(time / 140) % 2 ? 'vol_1' : 'vol_0');
          if (a.tx !== a.x) a.s.setFlipX(a.tx < a.x);
        } else if (moving) {
          const n = a.esp === 'mouette' ? ['debout_0', 'debout_1'] : a.esp === 'bouquetin' ? ['marche_0', 'marche_1', 'marche_2', 'marche_3'] : ['marche_0', 'marche_1'];
          frame(a, n[Math.floor(a.walked / 3) % n.length]);
        } else {
          const n = { marmotte: ['assise_0', 'assise_1'], bouquetin: ['debout_0', 'debout_1'], mouette: ['debout_0', 'debout_1'], crabe: ['marche_0', 'marche_0'] }[a.esp];
          frame(a, n[Math.floor(time / 1300 + a.x) % 2]);
        }
        a.s.setPosition(Math.round(a.x), Math.round(a.y - a.alt)).setDepth(a.state === 'vol' ? VOL : a.y).setAlpha(a.alpha).setVisible(a.alpha > 0);
        if (a.shadow) a.shadow.setVisible(a.state === 'vol').setPosition(Math.round(a.x), Math.round(a.y)).setDepth(a.y - 1);
      }
    },
  });
})(window);
