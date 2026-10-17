/* carte/ville/ecole.js — la scène de la ville : le bus de l'école.
 *
 * L'heure du jeu (HorlogeSortie, donnée par js/ui/excursion.js). Les jours d'école, le bus
 * de l'école (couche « bus » : ses trajets, ses arrêts, le chemin des enfants) passe le matin et
 * le soir : il roule avec les autres voitures et s'arrête le temps que les enfants de la
 * famille montent ou descendent (BUS.scenes : l'heure de chaque scène, carte par carte).
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const V = global.CarteVille;
  const { BUS } = V.C;
  const { sheetKey, reduced } = V;
  const etat = V.etat;

  V.partie({

    // ---------- le bus de l'école ----------

    makeSchool(objs) {
      this.kids = [];
      this.school = null;
      this.schoolDone = new Set();
      this.busStops = {};
      this.kidPaths = {};
      for (const o of objs) {
        if (o.point) this.busStops[o.name] = { x: o.x, y: o.y };
        else if (o.polyline && /^enfants_/.test(o.name)) this.kidPaths[o.name] = o.polyline.map((p) => ({ x: o.x + p.x, y: o.y + p.y }));
      }
      const noms = (this.cache.json.get('perso_cases') || {}).frames || [];
      this.kidFrame = K.cases(noms);
    },

    // Le bus sur son trajet, depuis l'entrée ; il s'arrêtera au point du trajet le plus proche de l'arrêt.
    // L'abscisse (au sol) de l'arrêt sur un trajet du bus.
    stopOn(routeName, stop) {
      const route = this.routes.find((r) => r.name === routeName);
      let best = null;
      for (const p of route ? route.pts : []) { const d = Math.hypot(p.x - stop.x, p.y - stop.y); if (!best || d < best.d) best = { d, s: p.s }; }
      return best ? best.s : null;
    },

    addBus(routeName, stop, lead = BUS.lead) {
      const route = this.routes.find((r) => r.name === routeName);
      if (!route || !this.textures.exists(BUS.key)) return null;
      const meta = this.cache.json.get(BUS.key + '_meta') || { anchor: { x: 56, y: 70 }, frameWidth: 112, frameHeight: 112 };
      const stopS = this.stopOn(routeName, stop);
      const s0 = stopS === null ? 0 : Math.max(0, stopS - lead);
      const car = { route, s: s0, i: 0, v: BUS.speed, color: 0, held: new Set(), bus: true, atStop: false, stopAt: stopS, alpha: s0 > 0 ? 0 : 1 };
      this.pointAt(route, car, car);
      car.sprite = this.add.sprite(0, 0, BUS.key, 0).setOrigin(meta.anchor.x / meta.frameWidth, meta.anchor.y / meta.frameHeight).setAlpha(car.alpha);
      this.cars.push(car);
      this.placeCar(car);
      return car;
    },

    // Un enfant qui marche le long de `pts` (il paraît au premier point, en fondu) ; `bout` : il
    // s'efface au bout du chemin (descendu du bus, il arrive à la porte ou au bord de la carte).
    addKid(perso, pts, k, bout) {
      const key = sheetKey(perso, true);
      if (!this.textures.exists(key) || !pts || pts.length < 2) return null;
      const dx = (k % 2 ? 1 : -1) * 5 * Math.ceil(k / 2);
      const kid = {
        s: this.add.sprite(pts[0].x + dx, pts[0].y, key, this.kidFrame('idle_bas_0')).setOrigin(0.5, 30 / 32).setAlpha(0),
        pts: pts.map((p, i) => ({ x: p.x + (i ? dx : dx), y: p.y })), i: 1, x: pts[0].x + dx, y: pts[0].y, alpha: 0, fade: 1, walked: 0, face: 'bas', arrived: false,
        wait: k * 0.6, bout: !!bout,
      };
      this.kids.push(kid);
      return kid;
    },

    stepKids(dt, time) {
      // (sans copie de la liste : un enfant effacé est retiré sur place, le suivant prend son rang)
      for (let n = 0; n < this.kids.length; n++) {
        const kid = this.kids[n];
        let moving = false;
        if (kid.wait > 0) kid.wait -= dt;
        else if (!kid.arrived) {
          const to = kid.pts[kid.i];
          const dx = to.x - kid.x, dy = to.y - kid.y, l = Math.hypot(dx, dy), st = BUS.kid.speed * dt;
          const r = K.regard(dx, dy);
          kid.face = r.face; kid.s.setFlipX(r.flip);
          if (l <= st) { kid.x = to.x; kid.y = to.y; kid.i++; if (kid.i >= kid.pts.length) kid.arrived = true; } else { kid.x += (dx / l) * st; kid.y += (dy / l) * st; }
          kid.walked += Math.min(l, st);
          moving = true;
        }
        if (kid.arrived && kid.bout && kid.fade >= 0) kid.fade = -1;
        if (kid.fade) {
          kid.alpha = Math.max(0, Math.min(1, kid.alpha + (kid.fade * dt) / BUS.kid.fade));
          if (kid.alpha >= 1 && kid.fade > 0) kid.fade = 0;
          if (kid.alpha <= 0 && kid.fade < 0) { kid.s.destroy(); this.kids.splice(n, 1); n--; continue; }
        }
        kid.s.setFrame(moving ? this.kidFrame.de('marche', kid.face, Math.floor(kid.walked / 4) % 4) : this.kidFrame.de('idle', kid.face, Math.floor(time / 600) % 2));
        kid.s.setPosition(Math.round(kid.x), Math.round(kid.y)).setDepth(kid.y).setAlpha(kid.alpha);
      }
    },

    // Les jours d'école, aux heures de la scène : le bus arrive ; les enfants montent (ils sont
    // venus à pied jusqu'à l'arrêt) ou descendent (et vont à pied jusqu'au bout de leur chemin,
    // où ils s'effacent) ; puis le bus repart. Une scène par jour, matin et soir.
    stepSchool(time, dt) {
      this.stepKids(dt, time);
      const t = this.heure, list = BUS.scenes[etat.nom] || [];
      const sc = this.school;
      if (!sc) {
        if (!t || t.nuit || !window.HorlogeSortie.JOURS_ECOLE.includes(t.semaine) || !t.enfants.length || reduced()) return;
        const def = list.find((d) => t.heure >= d.debut && t.heure < d.fin && !this.schoolDone.has(t.jour + ':' + d.nom));
        if (!def) return;
        const stop = this.busStops[def.arret], pts = this.kidPaths[def.enfants];
        if (!stop || !pts) return;
        this.schoolDone.add(t.jour + ':' + def.nom);
        // ils montent : les enfants viennent à pied jusqu'à l'arrêt ; le premier des deux à
        // partir (eux ou le bus) part tout de suite, l'autre de façon à arriver en même temps
        const stopS = this.stopOn(def.bus, stop);
        const tBus = stopS === null ? 0 : Math.min(stopS, BUS.lead) / BUS.speed;
        let len = 0;
        for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        const tKids = def.monter ? len / BUS.kid.speed + 0.6 * t.enfants.length : 0;
        this.school = { def, bus: null, phase: 'attente', kids: [], wait: 0, busIn: Math.max(0, tKids - tBus), kidsIn: Math.max(0, tBus - tKids) };
        return;
      }
      const { def } = sc;
      if (sc.phase === 'attente') {
        sc.busIn -= dt; sc.kidsIn -= dt;
        if (def.monter && !sc.kids.length && sc.kidsIn <= 0) sc.kids = t.enfants.map((e, k) => this.addKid(e.perso, this.kidPaths[def.enfants], k)).filter(Boolean);
        if (!sc.bus && sc.busIn <= 0) { sc.bus = this.addBus(def.bus, this.busStops[def.arret]); if (!sc.bus) { this.school = null; return; } }
        if (sc.bus && (!def.monter || sc.kids.length)) sc.phase = 'arrivee';
        if (sc.phase === 'attente') return;
      }
      const bus = sc.bus;
      if (!this.cars.includes(bus)) { this.school = null; return; }      // il est sorti de la carte
      if (sc.phase === 'arrivee' && bus.atStop) {
        sc.phase = 'arret';
        if (!def.monter) sc.kids = t.enfants.map((e, k) => this.addKid(e.perso, this.kidPaths[def.enfants], k, true)).filter(Boolean);
        sc.wait = BUS.resume;
      }
      if (sc.phase === 'arret') {
        if (def.monter) {
          // tous à l'arrêt : ils montent (s'effacent), puis le bus repart
          if (sc.kids.every((k) => k.arrived || !this.kids.includes(k))) {
            for (const k of sc.kids) if (k.fade >= 0) k.fade = -1;
            sc.wait -= dt;
            if (sc.wait <= 0) { bus.stopAt = null; sc.phase = 'depart'; }
          }
        } else {
          sc.wait -= dt;
          if (sc.wait <= 0) { bus.stopAt = null; sc.phase = 'depart'; }
        }
      }
    },
  });
})(window);
