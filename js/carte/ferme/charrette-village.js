/* carte/ferme/charrette-village.js — la scène de la ferme : la charrette du village et les rails (le chantier « l'île
 * à bâtir », fiche I2b).
 *
 * Le moteur (js/engine/charrette.js) dit tout d'après l'heure : sa route (du coffre ou du quai au comptoir du port),
 * les voyages du jour (leurs heures de départ, d'arrivée, de vente, de retour, le charretier qui la mène) ; la page en
 * fait le modèle (modèle.charretteVillage, js/ui/port.js charretteModele : { rails, charrette }). Ici :
 *   - la charrette à sa place de l'heure (villageoisHeure : l'heure du jeu, avancée entre deux modèles) : rangée sur la
 *     ferme hors de ses voyages (sans charretier), chargée au départ, sur la route à l'aller (chargée) et au retour
 *     (vide), à quai devant le comptoir pendant la vente ; tournée selon son sens (de profil, de face, de dos) ; ses
 *     roues et le pas du cheval suivent le chemin parcouru ;
 *   - le charretier : sa propre planche (celle du villageois, villageois.js), entre les deux couches des images (ses
 *     cases marche_<vue>_<k> à bras, assis_<vue>_0 sur le siège ou le bord du wagonnet) ; le villageois lui-même est
 *     caché tant que sa journée le dit sur la charrette (un segment au lieu « charrette ») ;
 *   - les dessus de la caisse : les rehausses à claire-voie (le palier de capacité 3), la bâche (4 et plus), chargée ;
 *   - les rails posés, près de la vue (assets/rails.png : l'image d'après les voisins, choisie par le moteur).
 * Loin de la vue, rien n'est dessiné. Les images : scripts/carte/charrette_village.py (PLACE : où se pose le
 * charretier).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T } = F.C;
  const { reducedMotion } = F;
  // Les planches (scripts/carte/charrette_village.py) : la taille d'une case, le point de la route dans la case, les
  // temps de la roue (k) ; la case : (vue × 2 + chargée) × temps + k ; les dessus (rehausses, bâche) : deco + d × 3 + vue ;
  // la charrette seule (rangée) : seule ; n : les cases d'une couche (celle de devant : n + la case). foulee : px par temps.
  const VUES = ['cote', 'bas', 'haut'];
  const PL = {
    bras: { key: 'charrette_bras', file: 'charrette_bras.png', w: 96, h: 100, ax: 48, ay: 72, temps: 4, deco: 24, seule: 30, n: 31, foulee: 6 },
    cheval: { key: 'charrette_cheval', file: 'charrette_cheval.png', w: 144, h: 136, ax: 72, ay: 100, temps: 5, deco: 30, seule: null, n: 36, foulee: 10 },
    wagonnet: { key: 'charrette_wagonnet', file: 'charrette_wagonnet.png', w: 144, h: 136, ax: 72, ay: 100, temps: 5, deco: null, seule: 30, n: 31, foulee: 12 },
  };
  // où se pose le charretier : le milieu du bas de sa case, par rapport au point de la route (PLACE du script)
  const PLACE = {
    bras: { cote: [33, -5], bas: [0, 19], haut: [0, -29] },
    cheval: { cote: [10, -14], bas: [0, -1], haut: [0, -20] },
    wagonnet: { cote: [12, -8], bas: [0, 7], haut: [0, -13] },
  };
  const RAILS = { key: 'rails', file: 'rails.png', w: 16, h: 16, profondeur: 0.3 };
  const LOIN = 160;          // px hors de la vue : rien n'est dessiné
  const DEPLACE = 0.9;       // px parcourus de suite pour qu'elle ait l'air de rouler (sinon : à l'arrêt)

  function charge(scene, v) {
    const A = K.atlas;
    for (const P of Object.values(PL)) if (!scene.textures.exists(P.key)) A.feuille(scene, P.key, P.file, { frameWidth: P.w, frameHeight: P.h }, v);
    if (!scene.textures.exists(RAILS.key)) A.feuille(scene, RAILS.key, RAILS.file, { frameWidth: RAILS.w, frameHeight: RAILS.h }, v);
  }
  K.chargeCharretteVillage = charge;
  K.CHARRETTE_VILLAGE = { PL, PLACE, RAILS };

  // Le point de la route à `h` heures de son départ : { x, y (px : le pied, au milieu de la case), dx, dy }.
  // Au wagonnet, le tracé des rails (route.trace : dehors.js traceSurRails, en cases ; le point de la route est 6 px sous
  // l'axe de la voie, comme au milieu d'une case : (T / 2 - 2)).
  function point(route, h, W) {
    const tr = route.trace;
    if (tr && tr.h && tr.h.length > 1) {
      const H = tr.h, n = H.length, dy = T / 2 - 2;
      const px = (i) => ({ x: tr.x[i] * T, y: tr.y[i] * T + dy });
      if (h <= H[0]) return { ...px(0), dx: 0, dy: 0 };
      if (h >= H[n - 1]) return { ...px(n - 1), dx: 0, dy: 0 };
      let lo = 0, hi = n - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (H[m] <= h) lo = m; else hi = m; }
      const u = (h - H[lo]) / Math.max(1e-9, H[hi] - H[lo]), a = px(lo), b = px(hi);
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, dx: b.x - a.x, dy: b.y - a.y };
    }
    const C = route.cases, H = route.heures, n = C.length;
    const px = (t) => ({ x: (t % W) * T + T / 2, y: (Math.floor(t / W) + 1) * T - 2 });
    if (n < 2 || h <= 0) return { ...px(C[0]), dx: 0, dy: 0 };
    if (h >= H[n - 1]) return { ...px(C[n - 1]), dx: 0, dy: 0 };
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (H[m] <= h) lo = m; else hi = m; }
    const u = (h - H[lo]) / Math.max(1e-9, H[hi] - H[lo]), a = px(C[lo]), b = px(C[hi]);
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, dx: b.x - a.x, dy: b.y - a.y };
  }

  // Où elle est à l'heure `heure` : { x, y, dx, dy, phase, charge, charretier }.
  function ou(c, heure, W) {
    const r = c.route, n = r.cases.length;
    const v = c.voyages.find((x) => heure >= x.depart && heure < x.retour);
    if (!v) return { ...point(r, 0, W), phase: 'rangee', charge: false, charretier: null };
    if (heure < v.charge) return { ...point(r, 0, W), phase: 'charge', charge: true, charretier: v.charretier };
    if (heure < v.arrivee) return { ...point(r, heure - v.charge, W), phase: 'aller', charge: true, charretier: v.charretier };
    if (heure < v.vente) return { ...point(r, r.heures[n - 1], W), dx: 0, dy: 0, phase: 'vente', charge: true, charretier: v.charretier };
    const p = point(r, r.heures[n - 1] - (heure - v.vente), W);
    return { ...p, dx: -p.dx, dy: -p.dy, phase: 'retour', charge: false, charretier: v.charretier };
  }

  F.partie({

    // À chaque image : les rails près de la vue, puis la charrette.
    stepCharretteVillage() {
      const md = this.ctx.lastModel && this.ctx.lastModel.charretteVillage;
      const e = this.cvEtat || (this.cvEtat = { rails: new Map(), cle: null, x: null, y: null, roule: 0, face: 'cote', flip: false, charretier: null });
      const vue = this.cameras.main.worldView;
      this.cvRails(md, e, vue);
      const c = md && md.charrette;
      const P0 = c && PL[c.mode];
      const heure = this.villageoisHeure ? this.villageoisHeure() : null;
      if (!c || !P0 || heure === null || !this.textures.exists(P0.key)) { this.cvCacher(e); return; }
      const W = this.grid.cols;
      const o = ou(c, heure, W);
      e.charretier = o.charretier;
      // (loin de la vue : rien)
      if (o.x < vue.x - LOIN || o.x > vue.right + LOIN || o.y < vue.y - LOIN || o.y > vue.bottom + LOIN) { this.cvCacher(e); e.x = null; return; }
      // le sens : de profil (retournée vers la gauche), de face (elle descend), de dos (elle monte)
      const roule = o.phase === 'aller' || o.phase === 'retour';
      if (roule && (Math.abs(o.dx) > 0.01 || Math.abs(o.dy) > 0.01)) {
        const a = (e.allure || (e.allure = K.allure())).pas(o.dx, o.dy, 1, { face: e.face, flip: e.flip });
        e.face = a.face; e.flip = a.flip;
      } else if (o.phase === 'rangee') { e.face = 'cote'; e.flip = false; }
      const d = e.x === null ? 0 : Math.hypot(o.x - e.x, o.y - e.y);
      if (d < 80) e.roule += d;
      e.x = o.x; e.y = o.y;
      const bouge = roule && d > DEPLACE && !reducedMotion();
      // la rangée : la charrette seule (à bras et au cheval, la charrette ; au wagonnet, le wagonnet seul)
      const seule = o.phase === 'rangee';
      const P = seule && c.mode === 'cheval' ? PL.bras : P0;
      const mode = seule && c.mode === 'cheval' ? 'bras' : c.mode;
      const iv = VUES.indexOf(e.face);
      const k = bouge ? Math.floor(e.roule / P.foulee) % 4 : (P.temps === 5 ? 4 : 0);
      const f = seule && P.seule !== null ? P.seule : (iv * 2 + (o.charge ? 1 : 0)) * P.temps + k;
      const px = Math.round(o.x), py = Math.round(o.y) + (P.h - P.ay), prof = o.y;
      const s = this.cvSprites(e);
      for (const im of [s.sous, s.sur, s.deco]) if (im.texture.key !== P.key) im.setTexture(P.key, 0);
      s.sous.setFrame(f).setPosition(px, py).setFlipX(e.flip).setDepth(prof - 0.5).setVisible(true);
      // (la couche de devant : la même case, n plus loin dans la planche)
      const col = P.n;
      s.sur.setVisible(false);
      if (!seule) s.sur.setFrame(f + col).setPosition(px, py).setFlipX(e.flip).setDepth(prof + 0.5).setVisible(true);
      // les dessus : la caisse est derrière le charretier, sauf de dos
      const di = c.deco === 'bache' ? (o.charge ? 1 : 0) : c.deco === 'rehausses' ? 0 : -1;
      if (!seule && P.deco !== null && di >= 0) {
        const devant = e.face === 'haut';
        s.deco.setFrame(P.deco + di * 3 + iv + (devant ? col : 0)).setPosition(px, py).setFlipX(e.flip).setDepth(prof + (devant ? 0.51 : -0.49)).setVisible(true);
      } else s.deco.setVisible(false);
      // le charretier, de sa planche
      const vm = !seule && o.charretier && this.villageoisVus ? this.villageoisVus.get(o.charretier) : null;
      const C = this.casesPerso ? this.casesPerso() : null;
      if (vm && C && this.textures.exists(vm.key)) {
        const [dx, dy] = PLACE[mode][e.face];
        const nom = mode === 'bras' ? (bouge ? `marche_${e.face}_${K.imageMarche(e.roule)}` : `idle_${e.face}_0`) : `assis_${e.face}_0`;
        if (!s.perso || s.perso.texture.key !== vm.key) { if (s.perso) s.perso.destroy(); s.perso = this.add.sprite(0, 0, vm.key, C(nom)).setOrigin(0.5, 1); s.perso.personnage = true; }
        s.perso.setFrame(C(nom)).setPosition(Math.round(o.x + (e.flip ? -dx : dx)), Math.round(o.y + dy)).setFlipX(e.flip).setDepth(prof).setVisible(true);
        if (global.CarteVisages) global.CarteVisages.suivre(this, s.perso);
      } else if (s.perso) s.perso.setVisible(false);
    },

    // Les images de la charrette (créées une fois).
    cvSprites(e) {
      if (!e.s) {
        const k = PL.bras.key;
        e.s = { sous: this.add.image(0, 0, k, 0).setOrigin(0.5, 1), sur: this.add.image(0, 0, k, 0).setOrigin(0.5, 1), deco: this.add.image(0, 0, k, 0).setOrigin(0.5, 1), perso: null };
      }
      return e.s;
    },

    cvCacher(e) {
      if (!e.s) return;
      for (const im of [e.s.sous, e.s.sur, e.s.deco, e.s.perso]) if (im) im.setVisible(false);
    },

    // Les rails près de la vue : une image par case (réutilisées), refaites quand la vue ou les rails changent.
    cvRails(md, e, vue) {
      const L = (md && md.rails) || [];
      if (!this.textures.exists(RAILS.key)) return;
      const W = this.grid.cols, M = 64;
      const x0 = Math.floor((vue.x - M) / T), x1 = Math.ceil((vue.right + M) / T), y0 = Math.floor((vue.y - M) / T), y1 = Math.ceil((vue.bottom + M) / T);
      const cle = `${x0},${x1},${y0},${y1}`;
      if (e.railsL === L && e.railsCle === cle) return;
      e.railsL = L; e.railsCle = cle;
      const vus = new Set();
      for (const [t, im] of L) {
        const c = t % W, r = Math.floor(t / W);
        if (c < x0 || c > x1 || r < y0 || r > y1 || im < 0) continue;
        vus.add(t);
        let s = e.rails.get(t);
        if (!s) { s = this.add.image(c * T, r * T, RAILS.key, im).setOrigin(0, 0).setDepth(RAILS.profondeur); e.rails.set(t, s); }
        s.setFrame(im).setVisible(true);
      }
      for (const [t, s] of e.rails) if (!vus.has(t)) { s.destroy(); e.rails.delete(t); }
    },

    // Le villageois `id` est-il sur la charrette à cette heure (villageois.js le cache) ?
    charretteMene(id) {
      return !!(this.cvEtat && this.cvEtat.charretier === id && this.cvEtat.x !== null);
    },
  });
})(window);
