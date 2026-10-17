/* carte/ville/voisins.js — la ville et les cartes qu'on rejoint par elle : les maisons des voisins.
 *
 * Les deux maisons des voisins de la carte de transition s'ouvrent (?carte=interieur&maison=
 * <nom>) : l'intérieur de la maison de la ferme (assets/maison_interieur.json), meublé pour la
 * famille qui y vit, tirée au hasard à la première visite (deux parents, un à trois enfants :
 * VOISINS) ; elle va et vient dans la maison, on lui parle en la touchant.
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const V = global.CarteVille;
  const { T, VOISINS } = V.C;
  const { hote, sheetKey } = V;

  // La famille qui vit dans la maison `maison` : tirée au hasard la première fois, puis gardée.
  // { nom, membres: [{ prenom, perso, enfant }], deco: { tableaux, plante, salon } }.
  function voisins(maison) {
    let all = {};
    try { all = JSON.parse(global.localStorage.getItem(VOISINS.store) || '{}') || {}; } catch (e) { all = {}; }
    if (all[maison] && Array.isArray(all[maison].membres) && all[maison].membres.length) return all[maison];
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    // des personnages (d'adulte, d'enfant) que la partie et les autres voisins n'ont pas
    const pris = { adulte: new Set(), enfant: new Set() };
    const H = hote(), h = global.HorlogeSortie ? global.HorlogeSortie.maintenant() : null;
    if (H && H.perso) pris.adulte.add(H.perso());
    for (const e of (h && h.enfants) || []) pris.enfant.add(e.perso);
    const autres = Object.values(all).filter((f) => f && Array.isArray(f.membres));
    for (const f of autres) for (const m of f.membres) pris[m.enfant ? 'enfant' : 'adulte'].add(m.perso);
    const perso = (enfant) => {
      const p = pris[enfant ? 'enfant' : 'adulte'], libres = [];
      for (let n = 1; n <= VOISINS.persos; n++) if (!p.has(n)) libres.push(n);
      const n = libres.length ? pick(libres) : 1 + Math.floor(Math.random() * VOISINS.persos);
      p.add(n);
      return n;
    };
    const dits = new Set();
    const prenom = (liste) => { const l = liste.filter((p) => !dits.has(p)); const p = pick(l.length ? l : liste); dits.add(p); return p; };
    const noms = VOISINS.noms.filter((n) => !autres.some((f) => f.nom === n));
    const n = 1 + Math.floor(Math.random() * VOISINS.enfantsMax);
    const membres = [0, 1].map(() => ({ prenom: prenom(VOISINS.prenoms), perso: perso(false), enfant: false }));
    for (let i = 0; i < n; i++) membres.push({ prenom: prenom(VOISINS.enfants), perso: perso(true), enfant: true });
    const f = {
      nom: pick(noms.length ? noms : VOISINS.noms), membres,
      deco: { tableaux: [1, 2, 3].filter(() => Math.random() < 0.7), plante: Math.random() < 0.6, salon: Math.random() < 0.75 },
    };
    all[maison] = f;
    try { global.localStorage.setItem(VOISINS.store, JSON.stringify(all)); } catch (e) { /* gardée le temps de la visite */ }
    return f;
  }

  // Le dessin posé à la place `place` de la couche « meubles » pour la famille `f` (null : rien).
  function meubleDe(place, f) {
    const enfants = f.membres.filter((m) => m.enfant).length;
    let m;
    if ((m = /^chaise_(\d+)$/.exec(place))) return Number(m[1]) <= Math.min(6, f.membres.length) ? 'chaise' : null;
    if ((m = /^lit_(\d+)$/.exec(place))) {
      const k = Number(m[1]);
      return k <= 2 ? 'lit_adulte' : k >= 4 && k - 3 <= enfants ? 'lit_enfant' : null;
    }
    if ((m = /^tableau_(\d+)$/.exec(place))) return f.deco.tableaux.includes(Number(m[1])) ? place : null;
    if (place === 'plante') return f.deco.plante ? place : null;
    if (place === 'tapis_1' || place === 'table_basse') return f.deco.salon ? place : null;
    return VOISINS.meubles.includes(place) ? place : null;
  }
  // (pour preload, js/ville-carte.js : la famille, avant de charger ses planches)
  V.voisins = voisins;

  V.partie({

    // ---------- les maisons des voisins ----------

    // Un toucher sur une maison qui a une porte (un passage de même nom) : on va jusqu'à la
    // porte, et on entre.
    tapMaison(w) {
      const b = (this.buildings || []).find((q) => w.x >= q.x0 && w.x <= q.x1 && w.y >= q.top && w.y <= q.base + 8 && this.passages.some((p) => p.name === q.name));
      if (!b) return false;
      const q = this.passages.find((p) => p.name === b.name), r = q.rect;
      this.entering = { q, x: r.x + r.width / 2, y: r.y + r.height - 3 };
      this.goTo(this.entering.x, this.entering.y);
      return true;
    },

    stepEntering() {
      const e = this.entering;
      if (!e || this.path.length) return;
      this.entering = null;
      if (Math.hypot(e.x - this.heroPos.x, e.y - this.heroPos.y) < 14) this.leave(e.q);
    },

    // L'intérieur (?carte=interieur) : la maison de la ferme (assets/maison_interieur.json), son
    // plancher (la tuile la plus fréquente), les meubles de la famille, la famille.
    makeInterior(map) {
      this.npcs = [];
      const f = this.famille;
      if (!f) return;
      const layer = this.layers.architecture;
      const count = new Map();
      const edge = layer.getTileAt(0, 0, true);
      layer.forEachTile((t) => { if (t.index >= 0 && (!edge || t.index !== edge.index)) count.set(t.index, (count.get(t.index) || 0) + 1); });
      let sol = -1, best = 0;
      for (const [i, n] of count) if (n > best) { best = n; sol = i; }
      this.walk = [];
      for (let y = 0; y < map.height; y++) {
        const row = [];
        for (let x = 0; x < map.width; x++) { const t = layer.getTileAt(x, y); row.push(!!t && t.index === sol); }
        this.walk.push(row);
      }
      // les meubles : posés en bas au centre de leur place ; ceux qui ne sont pas à plat arrêtent
      // le personnage (les cases dont le centre est sous leur bas)
      for (const o of ((map.getObjectLayer('meubles') || {}).objects) || []) {
        const dessin = meubleDe(o.name, f);
        if (!dessin || !this.textures.exists('meuble_' + dessin)) continue;
        const plat = VOISINS.plats.test(dessin);
        this.add.image(Math.round(o.x + o.width / 2), Math.round(o.y + o.height), 'meuble_' + dessin).setOrigin(0.5, 1).setDepth(plat ? -50 : o.y + o.height - 2);
        if (plat) continue;
        for (let ty = Math.floor(o.y / T); ty <= Math.floor((o.y + o.height) / T); ty++) {
          for (let tx = Math.floor(o.x / T); tx <= Math.floor((o.x + o.width) / T); tx++) {
            const cx = tx * T + T / 2, cy = ty * T + T / 2;
            if (this.walk[ty] && cx >= o.x && cx <= o.x + o.width && cy >= o.y + o.height - 14 && cy <= o.y + o.height) this.walk[ty][tx] = false;
          }
        }
      }
      this.cameras.main.setBackgroundColor(VOISINS.fond);
      // la famille, chacun sur une case libre du plancher
      const libres = [];
      this.walk.forEach((row, y) => row.forEach((ok, x) => { if (ok) libres.push({ x, y }); }));
      const noms = (this.cache.json.get('perso_cases') || {}).frames || [];
      this.npcFrame = (name) => Math.max(0, noms.indexOf(name));
      for (const m of f.membres) {
        const key = sheetKey(m.perso, m.enfant);
        if (!this.textures.exists(key) || !libres.length) continue;
        const c = libres.splice(Math.floor(Math.random() * libres.length), 1)[0];
        const x = c.x * T + T / 2, y = c.y * T + T - 2;
        const s = this.add.sprite(x, y, key, this.npcFrame('idle_bas_0')).setOrigin(0.5, 30 / 32);
        const shadow = this.add.ellipse(x, y, m.enfant ? 9 : 11, 4, 0x1e1a18, 0.3);
        this.npcs.push({ m, s, shadow, x, y, path: [], wait: 0.5 + Math.random() * 3, face: 'bas', walked: 0, speed: m.enfant ? VOISINS.kidSpeed : VOISINS.speed, talk: 0 });
      }
      const parents = f.membres.filter((m) => !m.enfant).map((m) => m.prenom), enfants = f.membres.filter((m) => m.enfant).map((m) => m.prenom);
      const liste = (l) => (l.length > 1 ? l.slice(0, -1).join(', ') + ' et ' + l[l.length - 1] : l[0]);
      this.say(`🏠 Chez les ${f.nom} : ${liste(parents)}, et ${enfants.length > 1 ? 'leurs enfants' : 'leur enfant'} ${liste(enfants)}.`);
    },

    // La porte de la maison (en bas de la pièce du milieu) : ramène devant la maison.
    interiorExit() {
      const r = VOISINS.sortie;
      return {
        name: 'sortie', x: r.x, y: r.y, width: r.w, height: r.h,
        properties: [{ name: 'cible', value: 'ville-carte.html?carte=transition&arrivee=' + this.maison }, { name: 'sens', value: 'bas' }, { name: 'proche', value: 40 }],
      };
    },

    // Un toucher sur un membre de la famille : il se tourne vers le personnage et lui parle.
    tapVoisin(w) {
      const n = (this.npcs || []).find((q) => Math.abs(w.x - q.x) <= 8 && w.y <= q.y + 3 && w.y >= q.y - (q.m.enfant ? 24 : 30));
      if (!n) return false;
      const f = this.famille, l = VOISINS.paroles[n.m.enfant ? 'enfant' : 'adulte'];
      n.path = [];
      n.talk = 3;
      n.face = 'cote';
      n.s.setFlipX(this.heroPos.x < n.x);
      this.say(`👋 ${n.m.prenom} ${f.nom} : « ${l[Math.floor(Math.random() * l.length)]} »`);
      return true;
    },

    // La famille va et vient : une case libre au hasard, on y va, on attend un peu.
    stepFamily(time, dt) {
      for (const n of this.npcs || []) {
        let moving = false;
        if (n.talk > 0) n.talk -= dt;
        else if (n.path.length) {
          const to = n.path[0], dx = to.x - n.x, dy = to.y - n.y, l = Math.hypot(dx, dy), st = n.speed * dt;
          const r = K.regard(dx, dy);
          n.face = r.face; n.s.setFlipX(r.flip);
          if (l <= st) { n.x = to.x; n.y = to.y; n.path.shift(); } else { n.x += (dx / l) * st; n.y += (dy / l) * st; }
          n.walked += Math.min(l, st);
          moving = true;
          if (!n.path.length) n.wait = VOISINS.wait[0] + Math.random() * (VOISINS.wait[1] - VOISINS.wait[0]);
        } else if ((n.wait -= dt) <= 0) {
          const H = this.map.height, W = this.map.width;
          for (let k = 0; k < 20 && !n.path.length; k++) {
            const tx = Math.floor(Math.random() * W), ty = Math.floor(Math.random() * H);
            if (!this.canWalk(tx, ty) || Math.hypot(tx * T - n.x, ty * T - n.y) > 9 * T) continue;
            n.path = this.findPath(n.x, n.y, tx * T + T / 2, ty * T + T - 2) || [];
          }
          if (!n.path.length) n.wait = 1;
        }
        n.s.setFrame(this.npcFrame(moving ? `marche_${n.face}_${Math.floor(n.walked / 4) % 4}` : `idle_${n.face}_${Math.floor(time / 600 + n.m.perso) % 2}`));
        n.s.setPosition(Math.round(n.x), Math.round(n.y)).setDepth(n.y);
        n.shadow.setPosition(Math.round(n.x), Math.round(n.y)).setDepth(n.y - 0.5);
      }
    },
  });
})(window);
