/* carte/ferme/abeilles.js — la scène de la ferme : les abeilles des ruches.
 *
 * Chaque ruche posée (un bloc « ruche », js/engine/ruches.js) a ses abeilles (ABEILLES.parRuche) :
 * quelques pixels (ABEILLES : 4 de corps, rayé, et 2 d'ailes qui battent). Le jour, chacune sort
 * par le trou de vol, vole vers une fleur à portée (modèle.fleurs : les cases fleuries de
 * l'herbe et les bacs à fleurs, ABEILLES.bac px au-dessus du pied de leur case ; et les touffes d'herbe haute fleuries encore debout), y butine
 * un moment en tournant autour, puis rentre à la ruche, y reste un peu et repart. Sans fleur à
 * portée, elle tourne autour de la ruche. La nuit, dans un intérieur, ou avec « animations
 * réduites », on ne les voit pas (elles sont dans la ruche).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T, ABEILLES } = F.C;
  const { reducedMotion } = F;

  const rand = (a, b) => a + Math.random() * (b - a);

  F.partie({

    // L'image d'une abeille (2 images de 4 × 3 : les ailes en haut, puis en bas), faite une fois.
    abeilleTexture() {
      const key = ABEILLES.key;
      if (this.textures.exists(key)) return key;
      const A = ABEILLES.dessin, h = A[0].length, w = A[0][0].length;
      const tex = this.textures.createCanvas(key, w * A.length, h);
      const c = tex.getContext();
      A.forEach((rangs, k) => rangs.forEach((rang, y) => [...rang].forEach((ch, x) => {
        if (!ABEILLES.couleurs[ch]) return;
        c.fillStyle = ABEILLES.couleurs[ch];
        c.fillRect(k * w + x, y, 1, 1);
      })));
      tex.refresh();
      A.forEach((_, k) => tex.add(k, 0, k * w, 0, w, h));
      return key;
    },

    // Les ruches du modèle (ses blocs « ruche ») : chacune a ses abeilles ; les fleurs à butiner.
    syncAbeilles(model) {
      if (!this.ruchesAbeilles) this.ruchesAbeilles = new Map();
      const R = this.ruchesAbeilles, cols = this.grid.cols, seen = new Set();
      for (const b of (model && model.blocs) || []) {
        if (b.sorte !== 'ruche') continue;
        seen.add(b.case);
        if (R.has(b.case)) continue;
        // (le trou de vol : en bas de la ruche, ABEILLES.trou px au-dessus du pied de sa case)
        const x = (b.case % cols) * T + T / 2, y = (Math.floor(b.case / cols) + 1) * T - ABEILLES.trou;
        const key = this.abeilleTexture();
        const abeilles = [];
        for (let k = 0; k < ABEILLES.parRuche; k++) {
          const img = this.add.image(x, y, key, 0).setOrigin(0.5, 1).setVisible(false);
          // (elles ne sortent pas toutes en même temps)
          abeilles.push({ img, etat: 'dedans', t: rand(0, ABEILLES.dedans[1] * 2), x, y, cx: 0, cy: 0, phase: rand(0, 7), vers: null });
        }
        R.set(b.case, { x, y, abeilles });
      }
      for (const [c, r] of R) if (!seen.has(c)) { r.abeilles.forEach((a) => a.img.destroy()); R.delete(c); }
      // les fleurs : le milieu de chaque case fleurie (le modèle ne change de liste qu'avec la ferme)
      const cle = model && model.fleurs ? model.fleurs.join(',') : '';
      if (cle !== this.fleursCle) {
        this.fleursCle = cle;
        // (une case avec un bloc : un bac à fleurs, ses fleurs dépassent au-dessus de lui)
        const bac = new Set(((model && model.blocs) || []).map((b) => b.case));
        this.fleursCases = ((model && model.fleurs) || []).map((t) => ({ x: (t % cols) * T + T / 2, y: (Math.floor(t / cols) + 1) * T - (bac.has(t) ? ABEILLES.bac : T / 2 - 2) }));
      }
    },

    // Une fleur à portée de la ruche `r` (au hasard), ou null. L'herbe haute fleurie encore debout
    // compte aussi (decor.js : this.tallGrass).
    fleurPour(r) {
      const P = ABEILLES.portee * ABEILLES.portee;
      const pres = (p) => (p.x - r.x) * (p.x - r.x) + (p.y - r.y) * (p.y - r.y) <= P;
      const list = (this.fleursCases || []).filter(pres);
      for (const g of this.tallGrass || []) if (g.fleurie && g.img && g.img.visible && pres(g)) list.push({ x: g.x, y: g.y - 5 });
      return list.length ? list[Math.floor(Math.random() * list.length)] : null;
    },

    stepAbeilles(dt) {
      const R = this.ruchesAbeilles;
      if (!R || !R.size) return;
      const M = this.ctx.lastModel;
      const h = M ? M.heure : 12;
      const dehors = !this.room && !(M && M.nuit) && h >= ABEILLES.heures[0] && h < ABEILLES.heures[1] && !reducedMotion();
      const now = performance.now() / 1000, A = ABEILLES;
      for (const r of R.values()) {
        for (const a of r.abeilles) {
          // la nuit (ou pas visibles) : toutes dans la ruche
          if (!dehors) { if (a.etat !== 'dedans') { a.etat = 'dedans'; a.t = rand(0, A.dedans[1]); } a.img.setVisible(false); continue; }
          a.t -= dt;
          if (a.etat === 'dedans') {
            a.img.setVisible(false);
            if (a.t > 0) continue;
            // elle sort : vers une fleur, sinon autour de la ruche
            const f = this.fleurPour(r);
            a.x = r.x; a.y = r.y;
            a.vers = f || { x: r.x + rand(-1.5, 1.5) * T, y: r.y + rand(-1.5, 0.8) * T };
            a.fleur = !!f;
            a.etat = 'aller';
          }
          if (a.etat === 'butine') {
            // elle tourne autour de la fleur
            a.x = a.vers.x + Math.cos(now * 2.3 + a.phase) * 2.5;
            a.y = a.vers.y + Math.sin(now * 3.1 + a.phase) * 1.5 - 2;
            if (a.t <= 0) { a.etat = 'retour'; a.vers = { x: r.x, y: r.y }; }
          } else if (a.etat === 'aller' || a.etat === 'retour') {
            const dx = a.vers.x - a.x, dy = a.vers.y - a.y, l = Math.hypot(dx, dy), st = A.vitesse * dt;
            if (l <= st) {
              a.x = a.vers.x; a.y = a.vers.y;
              if (a.etat === 'aller') { a.etat = 'butine'; a.t = a.fleur ? rand(A.butine[0], A.butine[1]) : rand(0.5, 1.5); }
              else { a.etat = 'dedans'; a.t = rand(A.dedans[0], A.dedans[1]); a.img.setVisible(false); continue; }
            } else {
              a.x += (dx / l) * st;
              a.y += (dy / l) * st;
              a.nx = -dy / l; a.ny = dx / l;   // (de côté : son vol zigzague, au dessin)
            }
          }
          // (en vol, elle monte un peu au-dessus du sol, puis redescend vers la fleur, la ruche)
          const haut = a.etat === 'butine' ? 0 : A.vol * Math.min(1, Math.hypot(a.vers.x - a.x, a.vers.y - a.y) / T);
          const z = a.etat === 'butine' ? 0 : Math.sin(now * 7 + a.phase) * A.zigzag;
          const vx = a.vers.x - a.x;
          if (Math.abs(vx) > 0.5) a.img.setFlipX(vx < 0);
          a.img.setFrame(Math.floor(now * A.battements + a.phase) % 2)
            .setPosition(Math.round(a.x + (a.nx || 0) * z), Math.round(a.y - haut + (a.ny || 0) * z))
            .setDepth(a.y + A.dessus).setVisible(true);
        }
      }
    },
  });
})(window);
