/* carte/ville/navette.js — la scène de la ville : le bus de ligne.
 *
 * Entre l'abri de bus de la carte de transition et celui de la gare, en ville (NAVETTE) : on
 * touche l'abri, on attend, le bus arrive, on monte, il part ; on descend à l'arrêt de l'autre
 * carte (?bus=1).
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const V = global.CarteVille;
  const { T, NAVETTE } = V.C;
  const { reduced } = V;
  const etat = V.etat;

  V.partie({

    // ---------- le bus de ligne (NAVETTE) ----------

    makeNavette(map) {
      this.navette = null;
      this.abri = null;
      const c = NAVETTE.arrets[etat.nom];
      if (!c) return;
      if (c.abri && this.textures.exists('abri_profil')) {
        // l'abri vu de profil : son image, rangée comme les personnages ; on ne marche pas dessus
        const im = this.add.image(c.abri.x, c.abri.pied, 'abri_profil');
        im.setOrigin(0.5, c.abri.ancre / im.height).setDepth(c.abri.pied);
        const b = im.getBounds();
        this.abri = { x0: b.x - 4, x1: b.right + 4, y0: b.y, y1: b.bottom + 4 };
        for (const [tx, ty] of c.abri.bloque) if (this.walk[ty] && tx < this.walk[ty].length) this.walk[ty][tx] = false;
      } else {
        // l'abri de la carte (couche « abri ») : le rectangle de ses tuiles
        const layer = map && map.getLayer('abri');
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        if (layer) layer.data.forEach((row, y) => row.forEach((tile, x) => {
          if (!tile || tile.index < 0) return;
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }));
        if (x1 >= x0) this.abri = { x0: x0 * T - 4, x1: (x1 + 1) * T + 4, y0: y0 * T, y1: (y1 + 1) * T + 8 };
      }
      if (etat.params.get('bus')) this.arriveByBus(c);
    },

    // L'arrêt de la carte : un point de la couche « bus », ou { x, y }.
    navetteStop(c) {
      return typeof c.arret === 'string' ? this.busStops && this.busStops[c.arret] : c.arret;
    },

    // Le bus roule-t-il à cette heure ? (sans horloge : toujours)
    navetteOuverte() {
      const t = this.heure;
      return !t || (!t.nuit && t.heure >= NAVETTE.heures[0] && t.heure < NAVETTE.heures[1]);
    },

    tapAbri(w) {
      const a = this.abri, c = NAVETTE.arrets[etat.nom];
      if (!a || !c || this.navette || w.x < a.x0 || w.x > a.x1 || w.y < a.y0 || w.y > a.y1) return false;
      if (!this.navetteOuverte()) { this.say(`🚌 Plus de bus à cette heure : le premier passe à ${NAVETTE.heures[0]} h.`); return true; }
      if (this.school) { this.say('🚌 Le bus de l\'école est en route : le bus de ligne passe juste après.'); return true; }
      this.openChoix('🚌 L\'arrêt de bus', `Le bus de ligne passe dans un instant. Il va ${c.vers}.`, [{ label: c.choix, go: () => this.startNavette() }]);
      return true;
    },

    // Le départ : on attend à côté de l'abri, le bus arrive et s'arrête, on monte, il part.
    startNavette() {
      this.closeGare();
      const c = NAVETTE.arrets[etat.nom];
      if (!c || this.navette) return;
      this.locked = true;
      if (reduced()) { this.leave({ cible: c.cible }); return; }
      const stop = this.navetteStop(c);
      const bus = stop && this.addBus(c.route, stop, c.lead);
      if (!bus) { this.leave({ cible: c.cible }); return; }
      this.navette = { c, bus, phase: 'attente', wait: 0 };
      this.work = null;
      this.goTo(c.attente.x, c.attente.y);
    },

    // L'arrivée (?bus=1) : le bus vient à l'arrêt et s'arrête ; on paraît à côté de l'abri.
    arriveByBus(c) {
      this.teleport(c.attente.x, c.attente.y);
      if (reduced()) return;
      const stop = this.navetteStop(c);
      const bus = stop && this.addBus(c.route, stop, c.lead);
      if (!bus) return;
      this.locked = true;
      this.heroAlpha = 0;
      const cam = this.cameras.main;
      cam.startFollow(bus.sprite, true, 0.12, 0.12);
      cam.centerOn(stop.x, stop.y);
      this.navette = { c, bus, phase: 'arrivee', wait: 0 };
    },

    stepNavette(dt) {
      const n = this.navette;
      if (!n) return;
      const bus = n.bus, roule = this.cars.includes(bus);
      if (n.phase === 'attente') {
        // (pas de chemin jusqu'à l'abri : on y est porté)
        const P = this.heroPos, A = n.c.attente;
        if (!this.path.length && Math.hypot(P.x - A.x, P.y - A.y) > 4) { P.x = A.x; P.y = A.y; }
        if (!this.path.length && (!roule || bus.atStop)) { this.face = 'bas'; this.hero.setFlipX(false); n.phase = 'montee'; n.wait = NAVETTE.monte; }
      } else if (n.phase === 'montee') {
        this.heroAlpha = Math.max(0, this.heroAlpha - dt / 0.4);
        n.wait -= dt;
        if (n.wait <= 0) {
          bus.stopAt = null;
          if (roule) this.cameras.main.startFollow(bus.sprite, true, 0.1, 0.1);
          n.phase = 'depart';
          n.wait = NAVETTE.part;
        }
      } else if (n.phase === 'depart') {
        n.wait -= dt;
        if (n.wait <= 0 || !roule) { n.phase = 'fin'; this.leave({ cible: n.c.cible }); }
      } else if (n.phase === 'arrivee') {
        if (!roule || bus.atStop) { n.phase = 'descente'; n.wait = NAVETTE.descend; }
      } else if (n.phase === 'descente') {
        n.wait -= dt;
        if (n.wait <= 0) { n.phase = 'paraît'; this.cameras.main.startFollow(this.hero, true, 0.08, 0.08); }
      } else if (n.phase === 'paraît') {
        this.heroAlpha = Math.min(1, this.heroAlpha + dt / 0.5);
        if (this.heroAlpha >= 1) {
          this.locked = false;
          this.cameras.main.startFollow(this.hero, true, 0.12, 0.12);
          n.phase = 'repart';
          n.wait = NAVETTE.repart;
        }
      } else if (n.phase === 'repart') {
        n.wait -= dt;
        if (n.wait <= 0) { bus.stopAt = null; this.navette = null; }
      }
    },
  });
})(window);
