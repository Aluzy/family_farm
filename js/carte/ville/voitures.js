/* carte/ville/voitures.js — la scène de la ville : les voitures des habitants.
 *
 * Une part des adultes de la ville (VOITURES.part : ceux qui ont le plus long chemin jusqu'à leur
 * travail, js/carte/ville/habitants.js) a une voiture. Pour un trajet où elle fait gagner du temps
 * (planVoiture), l'habitant va au bord de la rue la plus proche ; sa voiture paraît sur la file
 * de droite, il monte (on ne le voit plus), elle roule par les rues dans la circulation
 * (js/carte/ville/circulation.js : un trajet fait pour elle, trajetVoiture), s'arrête au bord de
 * la rue la plus proche de là où il va, il descend et finit à pied ; elle s'en va (se garer).
 *
 * Le chemin par les rues : les chaussées de VOITURES.rues (celles de scripts/ville/plan.py), un
 * nœud à chaque carrefour ; le plus court chemin, puis la file de droite de chaque rue prise
 * (VOITURES.ecart px du milieu), un coin là où la file d'arrivée croise celle de départ.
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const V = global.CarteVille;
  const { T, VOITURES, CARS, IMMEUBLE } = V.C;
  const { reduced } = V;
  const VIE = IMMEUBLE.vie;

  // Les rues : { nom, v (nord-sud ?), m (l'axe, px), a0, a1 (le long de l'axe, px) }.
  const RUES = [
    ...VOITURES.rues.v.map(([nom, x0, x1, y0, y1]) => ({ nom, v: true, m: ((x0 + x1) / 2) * T, a0: y0 * T, a1: y1 * T, r: [x0 * T, x1 * T, y0 * T, y1 * T] })),
    ...VOITURES.rues.h.map(([nom, x0, x1, y0, y1]) => ({ nom, v: false, m: ((y0 + y1) / 2) * T, a0: x0 * T, a1: x1 * T, r: [x0 * T, x1 * T, y0 * T, y1 * T] })),
  ];
  // Les carrefours : { x, y, v, h (les deux rues) }.
  const NOEUDS = [];
  for (const v of RUES.filter((q) => q.v)) {
    for (const h of RUES.filter((q) => !q.v)) {
      if (v.m >= h.a0 && v.m <= h.a1 && h.m >= v.a0 && h.m <= v.a1) NOEUDS.push({ x: v.m, y: h.m, v, h });
    }
  }
  // La place sur la rue la plus proche du point `p` : { rue, x, y } (sur l'axe).
  const surRue = (p) => {
    let best = null;
    for (const r of RUES) {
      const [x0, x1, y0, y1] = r.r;
      const d = Math.hypot(Math.max(x0 - p.x, 0, p.x - x1), Math.max(y0 - p.y, 0, p.y - y1));
      if (!best || d < best.d) {
        const a = Math.max(r.a0 + 8, Math.min(r.a1 - 8, r.v ? p.y : p.x));
        best = { d, rue: r, x: r.v ? r.m : a, y: r.v ? a : r.m };
      }
    }
    return best;
  };

  V.partie({

    // Le chemin d'une voiture du point `a` au point `b` par les rues : la polyligne (px) sur la
    // file de droite ; null : pas de chemin (ou trop court).
    trajetVoiture(a, b) {
      const S = surRue(a), E = surRue(b);
      if (!S || !E || Math.hypot(S.x - E.x, S.y - E.y) < 6 * T) return null;
      // (Dijkstra : le départ, les carrefours, l'arrivée ; on va d'un point à un autre de la même rue)
      const pts = [{ x: S.x, y: S.y, rues: [S.rue] }, ...NOEUDS.map((q) => ({ x: q.x, y: q.y, rues: [q.v, q.h] })), { x: E.x, y: E.y, rues: [E.rue] }];
      const fin = pts.length - 1, dist = pts.map(() => Infinity), prec = pts.map(() => -1), vu = pts.map(() => false);
      dist[0] = 0;
      for (;;) {
        let u = -1;
        for (let i = 0; i < pts.length; i++) if (!vu[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
        if (u < 0 || u === fin) break;
        vu[u] = true;
        for (let w = 0; w < pts.length; w++) {
          if (vu[w] || !pts[w].rues.some((r) => pts[u].rues.includes(r))) continue;
          const d = dist[u] + Math.abs(pts[w].x - pts[u].x) + Math.abs(pts[w].y - pts[u].y);
          if (d < dist[w]) { dist[w] = d; prec[w] = u; }
        }
      }
      if (dist[fin] === Infinity) return null;
      const chemin = [];
      for (let i = fin; i >= 0; i = prec[i]) chemin.unshift(pts[i]);
      // les tronçons : leur sens (nord-sud ?), leur file ; ceux d'une même file fusionnés
      const E2 = VOITURES.ecart, tr = [];
      for (let i = 1; i < chemin.length; i++) {
        const a0 = chemin[i - 1], b0 = chemin[i], dx = b0.x - a0.x, dy = b0.y - a0.y;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
        const v = Math.abs(dy) > Math.abs(dx), sens = v ? Math.sign(dy) : Math.sign(dx);
        // (vers le bas : à gauche de l'écran ; vers la droite : en bas)
        const file = v ? a0.x - sens * E2 : a0.y + sens * E2;
        const t = { v, sens, file };
        const p = tr[tr.length - 1];
        if (p && p.v === v && p.sens === sens) continue;
        if (p && p.v === v) return null;          // (un demi-tour : pas de chemin)
        tr.push(t);
      }
      if (!tr.length) return null;
      const out = [];
      const t0 = tr[0], tn = tr[tr.length - 1];
      out.push(t0.v ? { x: t0.file, y: S.y } : { x: S.x, y: t0.file });
      for (let i = 1; i < tr.length; i++) {
        const a0 = tr[i - 1], b0 = tr[i];
        out.push(a0.v ? { x: a0.file, y: b0.file } : { x: b0.file, y: a0.file });
      }
      out.push(tn.v ? { x: tn.file, y: E.y } : { x: E.x, y: tn.file });
      return out;
    },

    // Le trajet en voiture de `a` à `b` : { pts (trajetVoiture), duree (h : les chemins à pied
    // jusqu'à la rue et depuis, estimés comme ceux du bus, la route à 70 % de la vitesse des
    // voitures, une minute pour monter et descendre) } ; null : pas de chemin.
    planVoiture(a, b) {
      const pts = this.trajetVoiture(a, b);
      if (!pts) return null;
      const sph = VIE.sParHeure, est = (p, q) => {
        const dx = Math.abs(p.x - q.x), dy = Math.abs(p.y - q.y);
        return ((Math.max(dx, dy) + 0.414 * Math.min(dx, dy)) * 1.15) / VIE.vitesse / sph;
      };
      let L = 0;
      for (let i = 1; i < pts.length; i++) L += Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y);
      return { pts, duree: est(a, pts[0]) + L / (CARS.speed * 0.7) / sph + est(pts[pts.length - 1], b) + 2 / 60 };
    },

    // Le point du trottoir le plus proche du point `p` de la chaussée (une case où l'on marche).
    trottoirDe(p) {
      const gx = Math.floor(p.x / T), gy = Math.floor(p.y / T);
      const q = global.CarteKit.plusProche((i, j) => this.canWalk(gx + i, gy + j), 8);
      return q ? { x: (gx + q.i) * T + T / 2, y: (gy + q.j) * T + T - 2 } : null;
    },

    // `n` part en voiture vers le point `p` (du niveau `niv`) ; arrivé, il prend l'état `etat`.
    // `plan` : planVoiture. false : pas de voiture (il ira autrement).
    voyageVoiture(n, p, niv, etat, plan) {
      if (!plan || reduced() || !this.textures.exists(CARS.key)) return false;
      const depart = this.trottoirDe(plan.pts[0]), arrivee = this.trottoirDe(plan.pts[plan.pts.length - 1]);
      if (!depart || !arrivee) return false;
      const avant = n.etat;
      n.etat = 'versVoiture';
      n.auto = { plan, p, niv, etat, depart, arrivee, essais: 0 };
      if (!this.allerImm(n, depart, 0)) { n.etat = avant; n.auto = null; return false; }
      return true;
    },

    // Arrivé au bord de la rue : sa voiture paraît (si la place est libre ; sinon, un peu plus
    // tard), il monte.
    monteVoiture(n) {
      const A = n.auto;
      const cle = A.plan.pts.map((q) => `${Math.round(q.x)},${Math.round(q.y)}`).join(';');
      this.routesVoit = this.routesVoit || new Map();
      let r = this.routesVoit.get(cle);
      if (!r) { r = this.ajouteRoute(this.routeDe('voiture_' + this.routesVoit.size, A.plan.pts)); this.routesVoit.set(cle, r); }
      const car = this.addCar(r, 0);
      if (!car) {
        // (la place est prise : il attend, puis finit à pied)
        if (++A.essais > 6) { n.etat = A.etat; n.auto = null; if (!this.allerImm(n, A.p, A.niv)) { n.path = []; n.t = 0.01; } return; }
        n.t = 0.5;
        return;
      }
      car.perso = n;
      car.alpha = 0;
      car.sprite.setAlpha(0);
      car.stopAt = r.length - 2;
      n.etat = 'enVoiture';
      n.autoCar = car;
      n.cache = true;
    },

    // Dans sa voiture : il la suit ; arrivée (ou disparue), il descend au bord de la rue et finit
    // à pied ; elle repart et s'efface.
    stepVoitureHabitant(n, H) {
      const A = n.auto, car = n.autoCar;
      if (!A || this.dortImm(H, n)) {
        if (car) car.partir = true;
        n.auto = null; n.autoCar = null;
        this.rentreHabitant(n); this.coucheHabitant(n);
        return;
      }
      const roule = car && this.cars.includes(car);
      if (roule && !car.atStop) { n.x = car.x; n.y = car.y; return; }
      if (roule) car.partir = true;
      n.x = A.arrivee.x; n.y = A.arrivee.y; n.niv = 0;
      n.cache = false;
      this.montreHabitant(n);
      n.etat = A.etat;
      n.auto = null; n.autoCar = null;
      if (!this.allerImm(n, A.p, A.niv)) { n.path = []; n.t = 0.01; }
    },

    // Les voitures des habitants qui ont déposé leur conducteur : elles s'effacent.
    stepVoitures(dt) {
      if (!this.cars) return;
      for (let i = 0; i < this.cars.length; i++) {
        const c = this.cars[i];
        if (!c.partir) continue;
        c.alpha = Math.max(0, (c.alpha === undefined ? 1 : c.alpha) - dt * 2);
        c.fondu = true;
        c.sprite.setAlpha(c.alpha);
        if (c.alpha > 0) continue;
        for (const k of c.held) this.crossings[k].held.delete(c);
        c.sprite.destroy();
        this.cars.splice(i, 1);
        i--;
      }
    },
  });
})(window);
