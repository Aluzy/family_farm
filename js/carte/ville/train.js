/* carte/ville/train.js — la scène de la ville : le train.
 *
 * La gare (le bâtiment « gare », couche « gare » : où s'arrête le train, où l'on monte) : on va
 * jusqu'au quai, le train arrive, on monte, il repart et la caméra le suit jusqu'à la carte
 * d'arrivée (?carte=montagne ou plage, &train=nord ou sud : le sens où il roule) ; là, on le voit
 * arriver, et quand il s'arrête on paraît devant la gare. La montagne et la plage sont des
 * terminus : le train y reste à quai ; en ville, il repart.
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const V = global.CarteVille;
  const { T, TRAIN } = V.C;
  const { reduced } = V;
  const etat = V.etat;

  V.partie({

    // ---------- le train ----------

    makeGare(objs) {
      const pt = (n) => objs.find((o) => o.name === n);
      const arret = pt('arret'), quai = pt('quai');
      this.train = null;
      this.trip = null;
      this.arrival = null;
      this.trainMeta = this.cache.json.get(TRAIN.key + '_meta') || null;
      this.gare = arret && this.trainMeta && this.textures.exists(TRAIN.key)
        ? { x: arret.x, stopY: arret.y, quai: quai ? { x: quai.x, y: quai.y } : { x: arret.x + 26, y: arret.y } } : null;
      if (!this.gare) return;
      const sens = etat.params.get('train'), terminus = !!TRAIN.terminus[etat.nom];
      if (sens === 'nord' || sens === 'sud') this.arriveByTrain(sens === 'nord' ? -1 : 1, terminus);
      else if (terminus) this.addTrain(this.gare.stopY, 0);          // à quai : il attend le retour
    },

    // La rame : ses trois voitures, `y` le milieu de celle du milieu ; dir : -1 vers le nord, 1 vers le sud.
    addTrain(y, dir) {
      const m = this.trainMeta;
      if (this.train) for (const s of this.train.parts) s.destroy();
      const parts = m.pieces.map((_, k) => this.add.sprite(this.gare.x, y, TRAIN.key, k).setOrigin(m.anchor.x / m.frameWidth, m.anchor.y / m.frameHeight));
      this.train = { y, v: 0, dir, parts, alpha: 1, mode: 'arret', gone: 0, fadeIn: false, fadeOut: false };
      this.placeTrain();
      return this.train;
    },

    // Il arrive : il paraît à TRAIN.lead px de l'arrêt, en fondu, et freine pour s'arrêter pile.
    trainIn(dir) {
      const t = this.addTrain(this.gare.stopY - dir * TRAIN.lead, dir);
      Object.assign(t, { mode: 'approche', v: TRAIN.speed, alpha: 0, fadeIn: true });
      this.placeTrain();
      return t;
    },

    placeTrain() {
      const t = this.train, m = this.trainMeta, n = t.parts.length;
      t.parts.forEach((s, k) => {
        const y = t.y + (k - (n - 1) / 2) * m.pas;
        s.setPosition(Math.round(this.gare.x), Math.round(y)).setDepth(y).setAlpha(t.alpha);
      });
    },

    stepTrain(dt) {
      const t = this.train;
      if (!t) return;
      if (t.mode === 'approche') {
        const rest = (this.gare.stopY - t.y) * t.dir;
        const target = rest <= 0 ? 0 : Math.min(TRAIN.speed, Math.max(12, Math.sqrt(2 * TRAIN.decel * rest)));
        t.v = target < t.v ? target : Math.min(target, t.v + TRAIN.accel * dt);
        t.y += t.dir * Math.min(t.v * dt, Math.max(0, rest));
        if ((this.gare.stopY - t.y) * t.dir <= 0.5) { t.y = this.gare.stopY; t.v = 0; t.mode = 'arret'; }
      } else if (t.mode === 'depart') {
        t.v = Math.min(TRAIN.speed, t.v + TRAIN.accel * dt);
        t.y += t.dir * t.v * dt;
        t.gone += t.v * dt;
        if (t.fadeOut) {
          t.alpha = Math.max(0, Math.min(t.alpha, (TRAIN.lead - t.gone) / 200));
          if (t.gone >= TRAIN.lead) { for (const s of t.parts) s.destroy(); this.train = null; return; }
        }
      }
      if (t.fadeIn) { t.alpha = Math.min(1, t.alpha + dt * 2.5); if (t.alpha >= 1) t.fadeIn = false; }
      this.placeTrain();
    },

    // Un départ choisi : la promeneuse va au quai, le train arrive (ou attend à quai), elle
    // monte, il part ; la caméra le suit, puis la carte d'arrivée.
    startTrip(dest) {
      this.closeGare();
      if (!this.gare || this.trip) return;
      const dir = dest.sens === 'nord' ? -1 : 1;
      const cible = `ville-carte.html?carte=${dest.carte}&arrivee=gare&train=${dest.sens}`;
      this.locked = true;
      if (reduced()) { this.leave({ cible }); return; }
      this.trip = { cible, dir, phase: 'quai', wait: 0 };
      this.path = [];
      this.goTo(this.gare.quai.x, this.gare.quai.y);
      if (this.train && this.train.mode === 'arret') this.train.dir = dir;       // à quai : il repartira dans l'autre sens
      else this.trainIn(dir);
    },

    stepTrip(dt) {
      const tr = this.trip, t = this.train;
      if (!tr || !t) return;
      const P = this.heroPos, q = this.gare.quai;
      if (tr.phase === 'quai') {
        // (pas de chemin jusqu'au quai : elle y est portée)
        if (!this.path.length && Math.hypot(P.x - q.x, P.y - q.y) > 4) { P.x = q.x; P.y = q.y; }
        if (!this.path.length && t.mode === 'arret') {
          this.face = 'cote';
          this.hero.setFlipX(q.x > this.gare.x);
          tr.phase = 'montee';
          tr.wait = TRAIN.board;
        }
      } else if (tr.phase === 'montee') {
        this.heroAlpha = Math.max(0, this.heroAlpha - dt / 0.4);
        tr.wait -= dt;
        if (tr.wait <= 0) {
          Object.assign(t, { mode: 'depart', v: 0, gone: 0 });
          this.cameras.main.startFollow(t.parts[1], true, 0.1, 0.1);
          tr.phase = 'depart';
          tr.wait = TRAIN.leaveAfter;
        }
      } else if (tr.phase === 'depart') {
        tr.wait -= dt;
        if (tr.wait <= 0) { tr.phase = 'fin'; this.leave({ cible: tr.cible }); }
      }
    },

    // Arrivée en train (?train=nord|sud) : on voit le train arriver ; à l'arrêt, la promeneuse
    // paraît devant la gare. Hors d'un terminus, le train repart.
    arriveByTrain(dir, terminus) {
      this.toGareDoor();
      if (reduced()) { if (terminus) this.addTrain(this.gare.stopY, 0); return; }
      this.locked = true;
      this.heroAlpha = 0;
      const t = this.trainIn(dir);
      const cam = this.cameras.main;
      cam.startFollow(t.parts[1], true, 0.12, 0.12);
      cam.centerOn(this.gare.x, this.gare.stopY);
      this.arrival = { phase: 'train', wait: 0, terminus };
    },

    // Descendu du train, on paraît devant la porte de la gare (le bas du bâtiment « gare », au
    // milieu), sur la case libre la plus proche.
    toGareDoor() {
      const b = (this.buildings || []).find((q) => q.name === 'gare');
      if (!b) return;
      const x = (b.x0 + b.x1) / 2, y = b.base + 10;
      let gx = Math.floor(x / T), gy = Math.floor(y / T), best = null;
      for (let r = 0; r < 6 && !best; r++) {
        for (let dy = 0; dy <= r && !best; dy++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), dy) === r && this.canWalk(gx + dx, gy + dy)) { best = { x: gx + dx, y: gy + dy }; break; }
        }
      }
      if (!best) return;
      this.heroPos.x = best.x === gx ? x : best.x * T + T / 2;
      this.heroPos.y = best.y * T + T - 2;
      this.face = 'bas';
      this.hero.setPosition(Math.round(this.heroPos.x), Math.round(this.heroPos.y)).setFlipX(false);
    },

    stepArrival(dt) {
      const a = this.arrival, t = this.train;
      if (!a) return;
      if (a.phase === 'train') {
        if (!t || t.mode === 'arret') { a.phase = 'descente'; a.wait = TRAIN.alight; }
      } else if (a.phase === 'descente') {
        a.wait -= dt;
        if (a.wait <= 0) { a.phase = 'paraît'; this.cameras.main.startFollow(this.hero, true, 0.08, 0.08); }
      } else if (a.phase === 'paraît') {
        this.heroAlpha = Math.min(1, this.heroAlpha + dt / 0.5);
        if (this.heroAlpha >= 1) {
          this.locked = false;
          this.cameras.main.startFollow(this.hero, true, 0.12, 0.12);
          a.phase = a.terminus ? 'fin' : 'repart';
          a.wait = TRAIN.resume;
        }
      } else if (a.phase === 'repart') {
        a.wait -= dt;
        if (a.wait <= 0) {
          if (t) Object.assign(t, { mode: 'depart', v: 0, gone: 0, fadeOut: true });
          a.phase = 'fin';
        }
      }
      if (a.phase === 'fin') this.arrival = null;
    },
  });
})(window);
