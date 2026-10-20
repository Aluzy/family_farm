/* carte/ville/lignes.js — la scène de la ville : les lignes de bus.
 *
 * Deux lignes (LIGNES, js/carte/ville/config.js ; docs/plan-ville.md, étape 6), chacune dans les
 * deux sens : leurs bus (assets/ville_bus_lignes.png, à la couleur de la ligne) partent du bord
 * de la carte à heure fixe (un toutes les LIGNES.intervalle minutes du jeu, de heures[0] à
 * heures[1] h), roulent dans la circulation comme les voitures (js/carte/ville/circulation.js)
 * et s'arrêtent LIGNES.arret s à chacun de leurs arrêts. Chaque arrêt a son poteau sur le
 * trottoir de droite (assets/ville_arret_bus.png ; à la gare, l'abri de la navette).
 *
 * Le joueur touche un poteau : la liste des arrêts où aller (les lignes qui s'y arrêtent, dans
 * chaque sens) ; il paie son ticket (FermeHote.ticketBus : ECONOMIE.BUS, à la caisse de la
 * ville), attend à côté du poteau, monte dans le prochain bus de sa ligne, la caméra le suit, et
 * il descend à son arrêt.
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const V = global.CarteVille;
  const { T, LIGNES, NAVETTE, IMMEUBLE } = V.C;
  const { hote, reduced } = V;
  const etat = V.etat;

  const heureDe = (H) => (H ? ((H.heure % 24) + 24) % 24 : 12);

  V.partie({

    // Les trajets des lignes (`trajets` : { 'ligne:sens' : la route de la circulation }), leurs
    // arrêts sur chaque trajet (l'abscisse s où le bus s'arrête, le point du trottoir où l'on
    // attend), les poteaux, et les bus déjà en route quand la carte s'ouvre.
    makeLignes(routesBus) {
      this.lignes = [];
      this.poteaux = [];
      this.trajetBus = null;
      if (etat.nom !== IMMEUBLE.carte) return;
      const H = global.HorlogeSortie ? global.HorlogeSortie.maintenant() : null, h = heureDe(H);
      for (const L of LIGNES.lignes) {
        for (const [sens, t] of Object.entries(L.trajets)) {
          const route = routesBus[`ligne_${L.id}:${sens}`];
          if (!route) continue;
          const arrets = t.arrets.map((id) => this.arretSur(route, id)).filter(Boolean);
          const tr = { ligne: L, sens, route, arrets, decalage: (L.decalage || 0) / 60 };
          tr.prochain = this.prochainDepart(h, tr);
          this.lignes.push(tr);
        }
      }
      // les poteaux : un par arrêt et par côté de la rue (ceux des deux lignes ensemble)
      const cotes = {};
      for (const tr of this.lignes) for (const a of tr.arrets) {
        const k = `${a.id}:${Math.round(a.attente.x / 40)}:${Math.round(a.attente.y / 40)}`;
        (cotes[k] = cotes[k] || { id: a.id, attente: a.attente, lignes: new Set(), trajets: [] }).lignes.add(tr.ligne.id);
        cotes[k].trajets.push(tr);
      }
      const N = NAVETTE.arrets[etat.nom], abri = N && N.abri;
      for (const c of Object.values(cotes)) {
        const p = { ...c, lignes: [...c.lignes].sort() };
        // (à la gare, du côté de l'abri de la navette : l'abri sert de poteau)
        if (abri && this.abri && Math.hypot(abri.x - c.attente.x, abri.pied - c.attente.y) < 60) {
          p.boite = this.abri;
          p.navette = true;
        } else if (this.textures.exists(LIGNES.poteau.key)) {
          const P = LIGNES.poteau, x = c.attente.x + 12, y = c.attente.y - 2;
          const frame = p.lignes.length > 1 ? 2 : p.lignes[0] - 1;
          p.image = this.add.image(x, y, P.key, frame).setOrigin(0.5, P.pied / P.h).setDepth(y);
          p.boite = { x0: x - 10, x1: x + 10, y0: y - P.pied - 2, y1: y + 6 };
        }
        this.poteaux.push(p);
      }
      if (reduced() || !this.textures.exists(LIGNES.key)) return;
      // les bus partis avant l'ouverture de la carte : où ils en sont (à peu près)
      const sParHeure = (IMMEUBLE.vie && IMMEUBLE.vie.sParHeure) || 30;
      for (const tr of this.lignes) {
        for (let d = tr.prochain - LIGNES.intervalle / 60; d >= LIGNES.heures[0] + tr.decalage; d -= LIGNES.intervalle / 60) {
          const s = (h - d) * sParHeure * LIGNES.vitesse * 0.8;
          if (s >= tr.route.length - 60) break;
          if (s > 40) this.addBusLigne(tr, s);
        }
      }
    },

    // L'heure du prochain départ du trajet `tr` (à heure fixe depuis heures[0], plus son
    // décalage) après l'heure `h`.
    prochainDepart(h, tr) {
      const I = LIGNES.intervalle / 60, h0 = LIGNES.heures[0] + tr.decalage;
      return h <= h0 ? h0 : h0 + Math.ceil((h - h0) / I - 1e-9) * I;
    },

    // L'arrêt `id` sur la route `route` : { id, nom, k (son rang), s, attente (le point du
    // trottoir de droite, sur une case où l'on marche) }.
    arretSur(route, id) {
      const A = LIGNES.arrets[id], R = A && LIGNES.rues[A.rue];
      if (!A || !R) return null;
      let best = null;
      for (const p of route.pts) {
        const sur = R.x ? p.x >= R.x[0] && p.x <= R.x[1] : p.y >= R.y[0] && p.y <= R.y[1];
        if (!sur) continue;
        const d = R.x ? Math.abs(p.y - A.y) : Math.abs(p.x - A.x);
        if (!best || d < best.d) best = { d, p };
      }
      if (!best) return null;
      const pt = this.pointAt(route, { s: best.p.s, i: 0 });
      // (à droite du sens de la marche : (-dy, dx), l'écran ayant ses y vers le bas)
      let x = pt.x - pt.dy * R.trottoir, y = pt.y + pt.dx * R.trottoir * (R.x ? 1 : 0.8);
      const gx = Math.floor(x / T), gy = Math.floor(y / T);
      const q = global.CarteKit.plusProche((i, j) => this.canWalk(gx + i, gy + j), 4);
      if (q && (q.i || q.j)) { x = (gx + q.i) * T + T / 2; y = (gy + q.j) * T + T - 2; }
      return { id, nom: A.nom, s: best.p.s, attente: { x: Math.round(x), y: Math.round(y) } };
    },

    // Un bus de la ligne du trajet `tr`, à l'abscisse s : il s'arrêtera au premier de ses arrêts
    // devant lui.
    addBusLigne(tr, s = 0) {
      const car = this.addCar(tr.route, s, false, { ligne: tr });
      if (!car) return null;
      car.k = tr.arrets.findIndex((a) => a.s > s + 2);
      if (car.k < 0) car.k = tr.arrets.length;
      car.stopAt = car.k < tr.arrets.length ? tr.arrets[car.k].s : null;
      car.attente = 0;
      return car;
    },

    // Chaque image : les départs à l'heure, l'attente aux arrêts, le voyage du joueur.
    stepLignes(dt) {
      if (!this.lignes || !this.lignes.length) return;
      const H = global.HorlogeSortie ? global.HorlogeSortie.maintenant() : null, h = heureDe(H);
      const service = !H || (!H.nuit && h >= LIGNES.heures[0] && h < LIGNES.heures[1]);
      for (const tr of this.lignes) {
        // (l'heure avance, ou revient au matin après la nuit : le départ suivant)
        if (h + 1e-6 < tr.prochain - LIGNES.intervalle / 60 || h - tr.prochain > 1) tr.prochain = this.prochainDepart(h, tr);
        if (h >= tr.prochain) {
          tr.prochain += LIGNES.intervalle / 60;
          if (service && !reduced() && this.textures.exists(LIGNES.key)) this.addBusLigne(tr, 0);
        }
      }
      for (const car of this.cars) {
        if (!car.ligne || !car.atStop) continue;
        // (on attend que le joueur soit monté ou descendu)
        const j = this.trajetBus;
        if (j && j.bus === car && (j.phase === 'montee' || j.phase === 'descente')) continue;
        car.attente += dt;
        if (car.attente >= LIGNES.arret) {
          car.attente = 0;
          car.k++;
          car.stopAt = car.k < car.ligne.arrets.length ? car.ligne.arrets[car.k].s : null;
          car.atStop = false;
        }
      }
      this.stepTrajetBus(dt);
    },

    // Un toucher sur un poteau d'arrêt : où aller (les arrêts suivants de chaque ligne qui s'y
    // arrête, dans le sens de ce côté de la rue).
    tapArret(w) {
      const p = (this.poteaux || []).find((q) => q.boite && w.x >= q.boite.x0 && w.x <= q.boite.x1 && w.y >= q.boite.y0 && w.y <= q.boite.y1);
      if (!p || this.trajetBus || this.navette) return false;
      const H = global.HorlogeSortie ? global.HorlogeSortie.maintenant() : null, h = heureDe(H);
      const nom = LIGNES.arrets[p.id].nom, prix = (hote() && hote().prixTicket) ? hote().prixTicket() : 1;
      const choix = [];
      if (H && (H.nuit || h < LIGNES.heures[0] || h >= LIGNES.heures[1])) {
        if (!p.navette) { this.say(`🚏 ${nom} : plus de bus à cette heure. Le premier passe à ${LIGNES.heures[0]} h.`); return true; }
      } else {
        for (const tr of p.trajets) {
          const k = tr.arrets.findIndex((a) => a.id === p.id);
          for (let d = k + 1; d < tr.arrets.length; d++) {
            choix.push({ label: `🚌 Ligne ${tr.ligne.id} → ${tr.arrets[d].nom}`, go: () => this.startTrajetBus(tr, k, d) });
          }
        }
      }
      // (à la gare : la navette vers la campagne aussi)
      if (p.navette && this.navetteOuverte()) choix.push({ label: NAVETTE.arrets[etat.nom].choix, go: () => this.startNavette() });
      if (!choix.length) { this.say(`🚏 ${nom} : c'est le terminus.`); return true; }
      const lignes = p.lignes.map((l) => `ligne ${l} (${LIGNES.lignes.find((q) => q.id === l).couleur})`).join(' et ');
      this.openChoix(`🚏 Arrêt ${nom}`, `Ici passe la ${lignes}. Le ticket : ${prix} 💰 le trajet. Où veux-tu aller ?`, choix);
      return true;
    },

    // Le départ : on paie, on va à côté du poteau et on attend le prochain bus de la ligne.
    startTrajetBus(tr, k, dest) {
      this.closeGare();
      const H = hote();
      const r = H && H.ticketBus ? H.ticketBus() : { ok: true };
      if (!r || !r.ok) return;
      const a = tr.arrets[k];
      this.locked = true;
      this.path = [];
      this.work = null;
      this.goTo(a.attente.x, a.attente.y);
      this.trajetBus = { tr, k, dest, phase: 'attente', bus: null, wait: 0 };
      this.say(`🎫 Ticket payé (${r.cost || 1} 💰) : tu attends le bus de la ligne ${tr.ligne.id} vers ${tr.arrets[dest].nom}.`);
    },

    stepTrajetBus(dt) {
      const j = this.trajetBus;
      if (!j) return;
      const P = this.heroPos, A = j.tr.arrets[j.k].attente, D = j.tr.arrets[j.dest].attente;
      const cam = this.cameras.main;
      if (j.phase === 'attente') {
        // (pas de chemin jusqu'au poteau : on y est porté)
        if (!this.path.length && Math.hypot(P.x - A.x, P.y - A.y) > 4) { P.x = A.x; P.y = A.y; }
        const bus = this.cars.find((c) => c.ligne === j.tr && c.k === j.k && c.atStop);
        if (!this.path.length && bus) { j.bus = bus; j.phase = 'montee'; j.wait = 0.6; this.face = 'bas'; }
        // (plus aucun bus ne viendra : remboursé de son attente, il reste là)
        else if (!this.cars.some((c) => c.ligne === j.tr && c.k <= j.k) && !this.busAVenir(j.tr)) this.finTrajetBus(A, '🚏 Plus de bus aujourd\'hui sur cette ligne.');
      } else if (j.phase === 'montee') {
        this.heroAlpha = Math.max(0, this.heroAlpha - dt / 0.4);
        j.wait -= dt;
        if (j.wait <= 0) { j.phase = 'bord'; cam.startFollow(j.bus.sprite, true, 0.1, 0.1); }
      } else if (j.phase === 'bord') {
        const roule = this.cars.includes(j.bus);
        if (roule) { P.x = j.bus.x; P.y = j.bus.y; }
        if (!roule || (j.bus.k === j.dest && j.bus.atStop)) {
          P.x = D.x; P.y = D.y;
          j.phase = 'descente';
          j.wait = 0.5;
          cam.startFollow(this.hero, true, 0.12, 0.12);
        }
      } else if (j.phase === 'descente') {
        this.heroAlpha = Math.min(1, this.heroAlpha + dt / 0.5);
        j.wait -= dt;
        if (j.wait <= 0 && this.heroAlpha >= 1) this.finTrajetBus(D, `🚏 Arrêt ${j.tr.arrets[j.dest].nom}.`);
      }
    },

    // Un départ de la ligne du trajet `tr` est-il encore à venir aujourd'hui ?
    busAVenir(tr) {
      return tr.prochain < LIGNES.heures[1];
    },

    finTrajetBus(p, msg) {
      this.trajetBus = null;
      this.heroAlpha = 1;
      this.locked = false;
      this.teleport(p.x, p.y);
      this.cameras.main.startFollow(this.hero, true, 0.12, 0.12);
      if (msg) this.say(msg);
    },
  });
})(window);
