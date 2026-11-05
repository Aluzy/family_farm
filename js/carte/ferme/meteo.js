/* carte/ferme/meteo.js — la scène de la ferme : le temps qu'il fait (G-1, docs/phase-4.md).
 *
 * Le modèle (js/ui/stage.js, stageModel) dit le temps du moment, tiré par le moteur (js/engine/meteo.js) :
 * { pluie: vrai pendant une averse, brume: 0 à 1 (la brume du matin, qui se lève) }. Ici, il se dessine :
 *   - la pluie : des traits fins qui tombent en biais dans la vue (PLUIE.N gouttes, une seule Graphics
 *     redessinée à chaque image), et un voile gris-bleu léger ; elle arrive et s'en va en fondu ;
 *   - la brume : un voile blanc sur toute la vue, de plus en plus léger à mesure qu'elle se lève.
 * Tout est au-dessus du décor et des toits (PROFONDEUR), dans la vue seulement (rien hors de l'écran).
 * Animations réduites (préférence du système) : la pluie ne tombe pas, seul son voile reste.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const PLUIE = { ABRI: 0.25, N: 140, VITESSE: 420, PENTE: 0.28, LONG: 9, COULEUR: 0xc9d8ec, ALPHA: 0.55, VOILE: 0x506478, VOILE_ALPHA: 0.16, FONDU_MS: 2500 };
  const BRUME = { COULEUR: 0xeef1f2, ALPHA: 0.42 };
  const PROFONDEUR = 1e5 - 20;

  F.partie({

    // Le personnage est-il à l'abri (dans une pièce close, son toit effacé : js/carte/ferme/toits.js) ?
    meteoAbri() {
      if (!this.fermier || !this.toits || !this.tileAtPoint) return false;
      const i = this.fermier.info ? this.fermier.info() : null;
      if (!i) return false;
      const t = this.tileAtPoint(i.x, i.y - 1);
      return this.toits.some((r) => r.dedans && r.dedans.has(t));
    },

    // À chaque image : la pluie et la brume du modèle, en fondu.
    syncMeteo(delta) {
      const m = this.ctx.lastModel && this.ctx.lastModel.meteo;
      const veut = m && m.pluie ? 1 : 0, brume = m ? Math.max(0, Math.min(1, Number(m.brume) || 0)) : 0;
      const M = this.meteo || (this.meteo = { force: 0, gouttes: null, g: null, voile: null, brume: null });
      const dt = Math.max(0, Number(delta) || 16);
      M.force += Math.sign(veut - M.force) * Math.min(Math.abs(veut - M.force), dt / PLUIE.FONDU_MS);
      if (M.force <= 0.001 && brume <= 0.001) {
        if (M.g) M.g.setVisible(false);
        if (M.voile) M.voile.setVisible(false);
        if (M.brume) M.brume.setVisible(false);
        return;
      }
      const v = this.cameras.main.worldView;
      // (le personnage à l'abri, dans une pièce dont le toit s'efface : la pluie se voit à peine, comme elle
      // s'entend à peine : js/son.js)
      const abri = this.meteoAbri() ? PLUIE.ABRI : 1;
      // la brume, puis le voile de la pluie
      if (brume > 0.001) {
        if (!M.brume) M.brume = this.add.rectangle(0, 0, 10, 10, BRUME.COULEUR, 1).setOrigin(0, 0).setDepth(PROFONDEUR);
        M.brume.setPosition(v.x, v.y).setSize(v.width, v.height).setAlpha(BRUME.ALPHA * brume).setVisible(true);
      } else if (M.brume) M.brume.setVisible(false);
      if (!M.voile) M.voile = this.add.rectangle(0, 0, 10, 10, PLUIE.VOILE, 1).setOrigin(0, 0).setDepth(PROFONDEUR + 1);
      M.voile.setPosition(v.x, v.y).setSize(v.width, v.height).setAlpha(PLUIE.VOILE_ALPHA * M.force * abri).setVisible(M.force > 0.001);
      if (F.reducedMotion && F.reducedMotion()) { if (M.g) M.g.setVisible(false); return; }
      // les gouttes : en coordonnées de la vue (0 à 1), elles tombent, et repartent d'en haut
      if (!M.gouttes) {
        let graine = 12345;
        const hasard = () => ((graine = (graine * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
        M.gouttes = Array.from({ length: PLUIE.N }, () => ({ x: hasard(), y: hasard(), v: 0.75 + hasard() * 0.5 }));
      }
      if (!M.g) M.g = this.add.graphics().setDepth(PROFONDEUR + 2);
      const g = M.g;
      g.clear();
      g.setVisible(M.force > 0.001);
      g.lineStyle(1, PLUIE.COULEUR, PLUIE.ALPHA * M.force * abri);
      const n = Math.round(PLUIE.N * M.force), dy = (PLUIE.VITESSE * dt) / 1000 / Math.max(1, v.height);
      for (let i = 0; i < PLUIE.N; i++) {
        const d = M.gouttes[i];
        d.y += dy * d.v;
        d.x += dy * d.v * PLUIE.PENTE * (v.height / Math.max(1, v.width));
        if (d.y > 1) { d.y -= 1; d.x = (d.x + 0.37) % 1; }
        if (d.x > 1) d.x -= 1;
        if (i >= n) continue;
        const x = v.x + d.x * v.width, y = v.y + d.y * v.height;
        g.lineBetween(x, y, x - PLUIE.LONG * PLUIE.PENTE, y - PLUIE.LONG);
      }
    },
  });
})(window);
