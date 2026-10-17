/* carte/ville/peche.js — la scène de la ville : la pêche.
 *
 * La canne en main, un toucher sur l'eau (le lac de la montagne, la mer depuis le ponton ou le
 * rivage) : on va sur la rive, on lance, la touche, on ferre (CarteKit.PECHE : comme à la
 * ferme).
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const V = global.CarteVille;
  const { T, PECHE } = V.C;
  const { hote, reduced } = V;
  const etat = V.etat;

  V.partie({

    // ---------- la pêche ----------

    // Un toucher sur l'eau, la canne en main : on va sur la rive la plus proche, puis on lance.
    tapWater(w) {
      const eau = PECHE.eaux[etat.nom], H = hote();
      if (!eau || !H || !H.enMain || H.enMain() !== 'canne' || this.fishing) return false;
      const gx = Math.floor(w.x / T), gy = Math.floor(w.y / T);
      const eauL = this.layers[PECHE.couches[etat.nom]];
      if (!eauL || !eauL.getTileAt(gx, gy) || (this.layers.ponton && this.layers.ponton.getTileAt(gx, gy))) return false;
      this.peche = { eau, cible: { x: w.x, y: w.y } };
      this.work = null;
      this.goTo(w.x, w.y);         // (la case libre la plus proche : la rive)
      return true;
    },

    // Arrivé sur la rive : le lancer (le moteur dit tout de suite s'il y a une prise), l'attente,
    // la touche, puis on ferre et la prise paraît.
    stepFish(dt) {
      const f = this.peche;
      if (!f) return;
      const P = this.heroPos;
      if (!f.phase) {
        if (this.path.length) return;
        let dx = f.cible.x - P.x, dy = f.cible.y - P.y;
        const d = Math.hypot(dx, dy);
        if (d > 6 * T) { this.peche = null; return; }
        const r = hote().pecher(f.eau);
        if (!r) { this.peche = null; return; }
        f.poisson = r.poisson;
        // le bouchon : vers l'eau touchée, à portée de canne
        const k = Math.min(1, PECHE.portee / Math.max(1, d));
        f.bouchon = { x: P.x + dx * k, y: P.y + dy * k };
        f.vue = K.regard(dx, dy).face;
        this.hero.setFlipX(f.vue === 'cote' && dx < 0);
        this.face = f.vue;
        f.phase = 'lancer';
        f.t = 0;
        f.attente = K.PECHE.attente[0] + Math.random() * (K.PECHE.attente[1] - K.PECHE.attente[0]);
        this.fishing = true;
        this.mining = { frame: `peche_${f.vue}_1` };
        f.g = this.add.graphics().setDepth(Math.max(P.y, f.bouchon.y) + 1);
      }
      f.t += dt;
      const B = K.PECHE.bouchon, g = f.g;
      let bob = 0, fil = true;
      if (f.phase === 'lancer') {
        this.mining.frame = `peche_${f.vue}_${f.t < PECHE.lancer / 2 ? 1 : 2}`;
        fil = f.t >= PECHE.lancer / 2;
        if (f.t >= PECHE.lancer) { f.phase = 'attente'; f.t = 0; }
      } else if (f.phase === 'attente') {
        bob = reduced() ? 0 : Math.round(Math.sin(f.t * 3) * 0.6);
        if (f.t >= f.attente) {
          f.phase = f.poisson ? 'touche' : 'ferrer';
          f.t = 0;
          if (f.poisson) K.vibre('touche');
        }
      } else if (f.phase === 'touche') {
        bob = 2;                                      // le bouchon plonge
        if (f.t >= PECHE.touche) { f.phase = 'ferrer'; f.t = 0; }
      } else if (f.phase === 'ferrer') {
        this.mining.frame = `peche_${f.vue}_3`;
        fil = false;
        if (f.t >= PECHE.ferrer) {
          g.destroy();
          const o = f.poisson && hote().objet ? hote().objet(f.poisson) : null;
          // la prise : la bulle « +1 » ; rien n'a mordu : « … » (comme à la ferme)
          if (o) this.popGain({ [f.poisson]: 1 });
          else {
            const t = K.texte(this, P.x, P.y - 34, '…', 10).setDepth(2e6);
            this.tweens.add({ targets: t, y: t.y - 6, alpha: 0, delay: 500, duration: 500, onComplete: () => t.destroy() });
          }
          this.peche = null;
          this.fishing = false;
          this.mining = null;
          return;
        }
      }
      g.clear();
      if (!fil) return;
      const bx = Math.round(f.bouchon.x), by = Math.round(f.bouchon.y) + bob;
      const tip = { x: P.x + (f.vue === 'cote' ? (this.hero.flipX ? -8 : 8) : 6), y: P.y - (f.vue === 'haut' ? 30 : 24) };
      g.lineStyle(1, B.fil, 0.8).lineBetween(tip.x, tip.y, bx, by - 1);
      if (f.phase !== 'lancer' || f.t >= PECHE.lancer * 0.75) {
        g.fillStyle(B.bas, 1).fillRect(bx - 1, by - 1, 3, 2);
        if (f.phase !== 'touche') g.fillStyle(B.haut, 1).fillRect(bx - 1, by - 3, 3, 2);
        if (f.phase === 'touche' && !reduced()) g.lineStyle(1, 0xffffff, 0.7).strokeEllipse(bx, by, 10 + f.t * 12, 4 + f.t * 4);
      }
    },
  });
})(window);
