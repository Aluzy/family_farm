/* carte/ville/transition.js — la scène de la ville : l'ouest de la carte de transition, tiré
 * pour chaque partie, et les familles des voisins qui y ramassent des ressources.
 *
 * Le plan vient du moteur (js/engine/transition.js, par FermeHote.transition) : le chemin, deux
 * ou trois maisons bâties en blocs, les tampons du kit (la mare, le puits, le tonneau, le banc,
 * les barrières, les buissons), les arbres, les rochers, l'herbe haute, les fleurs, et les
 * ressources du jour. La carte de Tiled (assets/transition.json, scripts/ville/transition.py)
 * n'a que de l'herbe à l'ouest et le kit (sa propriété « kit ») : V.transitionCarte en fait la
 * carte de la partie avant que la scène ne la crée (les tuiles du sol et des tampons, les
 * objets : arbres, rochers, herbe).
 *
 * Les maisons sont posées bloc par bloc avec les images de la ferme générée (assets/blocs.png),
 * rangées selon leur pied comme le personnage, sans toit : on voit dedans, et on y entre à pied
 * par la porte (leurs murs et leurs meubles arrêtent la marche). Dans chacune vit une famille
 * (V.voisins), qu'on voit aller et venir chez elle : le jour (TRANSITION_VIE.jour), ses membres
 * sortent par la porte ; les parents vont chercher la ressource libre la plus proche, la
 * ramassent, et en rapportent quelques-unes à la maison avant de repartir ; les enfants, et les
 * parents quand il n'en reste plus, flânent autour de chez eux. La nuit, ils restent à la
 * maison. Ce qui est ramassé le reste jusqu'au lendemain (localStorage).
 *
 * Le joueur ramasse aussi : un toucher sur une ressource y envoie le personnage, qui la prend
 * en arrivant (FermeHote.ramasserTransition : l'objet entre dans l'inventaire, contre l'énergie
 * du geste « ramasser »). Une ressource qu'il vise, les voisins la laissent ; ce qu'il a pris
 * (le moteur s'en souvient : FermeHote.transition().pris) ne revient pas avant le lendemain.
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const V = global.CarteVille;
  const { T, BLOCS, RAMASSABLES, TRANSITION_VIE, VOISINS } = V.C;
  const { hote, reduced, sheetKey } = V;

  // Le plan de la partie (FermeHote.transition), lu une fois par visite de la carte.
  function planDuJour() {
    const H = hote();
    return H && H.transition ? H.transition() : null;
  }
  V.planTransition = planDuJour;

  // Ce qui a été ramassé aujourd'hui : { graine, jour, ids: [...], panier: { maison: n } }.
  function ramasses(graine, jour) {
    let r = null;
    try { r = JSON.parse(global.localStorage.getItem(TRANSITION_VIE.store) || 'null'); } catch (e) { r = null; }
    if (!r || r.graine !== graine || r.jour !== jour) r = { graine, jour, ids: [], panier: {} };
    return r;
  }
  function garde(r) {
    try { global.localStorage.setItem(TRANSITION_VIE.store, JSON.stringify(r)); } catch (e) { /* gardé le temps de la visite */ }
  }

  // La carte de la partie : une copie de la carte de Tiled (`base`, telle qu'elle a été chargée)
  // où l'ouest est rempli d'après le plan `P` et le kit de la carte.
  V.transitionCarte = function (base, P) {
    const data = JSON.parse(JSON.stringify(base));
    const kitProp = (data.properties || []).find((q) => q.name === 'kit');
    if (!kitProp || !P) return data;
    const kit = JSON.parse(kitProp.value);
    const W = data.width, X = kit.ouest;
    const couche = (n) => data.layers.find((l) => l.name === n);
    const pose = (n, x, y, gid) => { const l = couche(n); if (l && gid && x >= 0 && y >= 0 && x < W && y < data.height) l.data[y * W + x] = gid; };
    // le sol : chaque tuile d'après ses quatre coins (herbe ou chemin)
    const c = P.coins, sol = couche('sol');
    const varie = (x, y, n) => ((x * 7349 + y * 1931 + 17) >>> 0) % n;
    for (let y = 0; y < data.height; y++) {
      for (let x = 0; x < X; x++) {
        const n = (c[y][x] ? 8 : 0) | (c[y][x + 1] ? 4 : 0) | (c[y + 1][x] ? 2 : 0) | (c[y + 1][x + 1] ? 1 : 0);
        sol.data[y * W + x] = n === 0 ? kit.sol.herbe[varie(x, y, kit.sol.herbe.length)] : n === 15 ? kit.sol.chemin[varie(x, y, kit.sol.chemin.length)] : kit.sol.raccords[n];
      }
    }
    for (const f of P.fleurs) pose('fleurs', f.x, f.y, kit.fleurs[f.v % kit.fleurs.length]);
    for (const t of P.tampons) {
      const d = kit.tampons[t.nom];
      if (!d) continue;
      for (const [n, g] of Object.entries(d.couches)) g.forEach((gid, i) => pose(n, t.x + (i % d.w), t.y + Math.floor(i / d.w), gid));
    }
    // les objets
    let id = data.nextobjectid || 1000;
    const objets = (n) => (couche(n) || { objects: [] }).objects;
    const point = (name, type, x, y, props) => ({ id: id++, name, type, point: true, rotation: 0, visible: true, x, y, width: 0, height: 0, ...(props ? { properties: props } : {}) });
    // (les maisons n'ont ni passage ni emprise : on y entre à pied, voir poseMaison)
    for (const a of P.arbres) objets('arbres').push(point(`arbre_${a.x}_${a.y}`, a.genre, a.x, a.y));
    const images = ['rocher_a', 'rocher_b', 'rocher_c', 'caillou_0', 'caillou_1'];
    for (const r of P.rochers) {
      const gros = r.genre.startsWith('rocher');
      objets('rochers').push(point(`rocher_${r.x}_${r.y}`, r.genre.split('_')[0], r.x, r.y, [
        { name: 'image', type: 'int', value: images.indexOf(r.genre) }, { name: 'demi', type: 'int', value: gros ? 13 : 7 }, { name: 'haut', type: 'int', value: gros ? 24 : 12 }]));
    }
    for (const h of P.herbes) objets('herbe_haute').push(point('', String(h.v), h.x, h.y));
    // les enfants vont au bus par le chemin : leur trajet suit son milieu jusqu'à la route
    const pts = [];
    for (let x = 0; x <= X; x += 3) pts.push([Math.max(8, x * T), P.milieu[x] * T + 14]);
    for (const o of objets('bus')) {
      if (!o.polyline || !/^enfants_/.test(o.name)) continue;
      const abs = o.polyline.map((q) => [o.x + q.x, o.y + q.y]);
      const soir = o.name === 'enfants_soir';
      const est = (soir ? abs.slice().reverse() : abs).filter((q) => q[0] >= X * T);
      const tout = pts.concat(est);
      const l = soir ? tout.reverse() : tout;
      o.x = l[0][0]; o.y = l[0][1];
      o.polyline = l.map(([x, y]) => ({ x: x - o.x, y: y - o.y }));
    }
    data.nextobjectid = id;
    return data;
  };

  V.partie({

    // L'ouest de la carte de transition : les maisons en blocs, les ressources du jour, les
    // familles dehors.
    makeVoisinsDehors() {
      this.dehors = [];
      this.ressources = new Map();
      const D = this.transition;
      if (!D || !D.plan || !this.textures.exists(BLOCS.key)) return;
      const P = D.plan;
      for (const m of P.maisons) this.poseMaison(m);
      // les ressources du jour encore là
      this.ramasses = ramasses(P.graine, D.jour);
      for (const r of D.ressources) {
        if (this.ramasses.ids.includes(r.id) || (D.pris || []).includes(r.id) || !this.textures.exists(RAMASSABLES.key)) continue;
        const img = this.add.image(r.x, r.y, RAMASSABLES.key, RAMASSABLES.frames[r.sorte] || 0).setOrigin(0.5, 1).setDepth(r.y - 1);
        this.ressources.set(r.id, { ...r, img, prise: null });
      }
      // les familles : chacun chez soi pour commencer (on le voit), il sort un peu plus tard
      const noms = (this.cache.json.get('perso_cases') || {}).frames || [];
      this.npcFrame = this.npcFrame || K.cases(noms);
      for (const m of P.maisons) {
        const f = V.voisins(m.nom);
        // (devant la porte : en dessous, ou au-dessus pour une maison au sud du chemin)
        const porte = { x: m.porte.x * T + T / 2, y: (m.porte.y + (m.sens === 'haut' ? -1 : 1)) * T + T - 3 };
        f.membres.forEach((mb, i) => {
          const key = sheetKey(mb.perso, mb.enfant);
          if (!this.textures.exists(key)) return;
          const c = this.caseDedans(m);
          const s = this.add.sprite(c.x, c.y, key, this.npcFrame('idle_bas_0')).setOrigin(0.5, 30 / 32);
          const shadow = this.add.ellipse(c.x, c.y, mb.enfant ? 9 : 11, 4, 0x1e1a18, 0.3);
          const n = { m: mb, f, maison: m, porte, s, shadow, x: c.x, y: c.y, path: [], face: 'bas', walked: 0,
            speed: mb.enfant ? VOISINS.kidSpeed : VOISINS.speed, etat: 'dedans', t: Math.random() * 2, sortie: 0.5 + i * 1.6 + Math.random() * 2, porte_: 0, talk: 0 };
          this.dehors.push(n);
          this.placeVoisin(n, 0, false);
        });
      }
    },

    // Une case libre du plancher de la maison `m`, au hasard : son point (px), où poser les pieds.
    caseDedans(m) {
      const l = m.libres.length ? m.libres : [{ x: m.porte.x, y: m.porte.y - 1 }];
      const c = l[Math.floor(Math.random() * l.length)];
      return { x: c.x * T + T / 2, y: c.y * T + T - 2 };
    },

    // Une maison : son plancher, ses murs (raccordés à leurs voisins), sa porte, ses meubles.
    // On marche sur le plancher et par la porte ; les murs et les meubles arrêtent (m.libres :
    // les cases du plancher où l'on peut aller, pour la famille).
    poseMaison(m) {
      const g = m.plan, h = g.length, w = g[0].length;
      const a = (x, y) => (y >= 0 && y < h && x >= 0 && x < w ? g[y][x] : ' ');
      const sol = (x, y) => !' MP'.includes(a(x, y));
      const img = (frame, x, y, plat) => {
        const px = (m.x + x) * T + T / 2, py = (m.y + y + 1) * T;
        return this.add.image(px, py, BLOCS.key, frame).setOrigin(0.5, 1).setDepth(plat ? py - T - 200 : py);
      };
      m.libres = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const c = a(x, y), gx = m.x + x, gy = m.y + y;
          if (this.walk[gy] && gx >= 0 && gx < this.walk[gy].length) this.walk[gy][gx] = c === '.' || c === 'P';
          if (c === '.') m.libres.push({ x: gx, y: gy });
          if (sol(x, y)) img(BLOCS.sols + (sol(x, y - 1) ? 1 : 0) + (sol(x + 1, y) ? 2 : 0) + (sol(x, y + 1) ? 4 : 0) + (sol(x - 1, y) ? 8 : 0), x, y, true);
          if (c === 'M') {
            const mur = (dx, dy, porte) => a(x + dx, y + dy) === 'M' || (porte && a(x + dx, y + dy) === 'P');
            img(BLOCS.murs + (mur(0, -1) ? 1 : 0) + (mur(1, 0, true) ? 2 : 0) + (mur(0, 1) ? 4 : 0) + (mur(-1, 0, true) ? 8 : 0), x, y);
          } else if (c === 'P') img(BLOCS.porte, x, y);
          else if (BLOCS.meubles[c] !== undefined) {
            const plat = c === 'p' || c === 'd';
            const i = img(BLOCS.meubles[c], x, y, false);
            if (plat) i.setDepth(i.y - T / 2);
            if (c === 'd') img(BLOCS.drap, x, y).setDepth(i.depth + 0.1);
          }
        }
      }
    },

    // La ressource libre la plus proche de `n` (null : il n'y en a plus).
    ressourceProche(n) {
      let best = null, d = Infinity;
      for (const r of this.ressources.values()) {
        if (r.prise) continue;
        const e = Math.hypot(r.x - n.x, r.y - n.y);
        if (e < d) { d = e; best = r; }
      }
      return best;
    },

    // Un membre de la famille fait le prochain pas de sa journée.
    stepVoisinsDehors(time, dt) {
      if (!this.dehors || !this.dehors.length) return;
      const H = global.HorlogeSortie ? global.HorlogeSortie.maintenant() : null;
      const jour = !H || (H.heure >= TRANSITION_VIE.jour[0] && H.heure < TRANSITION_VIE.jour[1] && !H.nuit);
      for (const n of this.dehors) {
        let marche = false;
        if (n.etat === 'dedans') n.sortie -= dt;
        if (n.talk > 0) { n.talk -= dt; this.placeVoisin(n, time, false); continue; }
        if (n.path.length) {
          const to = n.path[0], dx = to.x - n.x, dy = to.y - n.y, l = Math.hypot(dx, dy), st = n.speed * dt;
          const r = K.regard(dx, dy);
          n.face = r.face; n.s.setFlipX(r.flip);
          if (l <= st) { n.x = to.x; n.y = to.y; n.path.shift(); } else { n.x += (dx / l) * st; n.y += (dy / l) * st; }
          n.walked += Math.min(l, st);
          marche = true;
        } else if ((n.t -= dt) <= 0) this.decideVoisin(n, jour);
        this.placeVoisin(n, time, marche);
      }
    },

    // Arrivé au bout de son chemin (ou fini d'attendre) : que faire maintenant ?
    decideVoisin(n, jour) {
      // (dedans, sortir, rentrer : à pied, par la porte)
      const va = (x, y) => { n.path = this.findPath(n.x, n.y, x, y) || []; n.t = n.path.length ? 0 : 0.01; };
      const rentrer = () => { n.etat = 'rentre'; const c = this.caseDedans(n.maison); va(c.x, c.y); };
      switch (n.etat) {
        case 'dedans': {
          // chez lui : le jour, il ressort au bout d'un moment ; sinon il va et vient dans la maison
          if (jour && n.sortie <= 0) { n.etat = 'sort'; va(n.porte.x, n.porte.y); return; }
          const c = this.caseDedans(n.maison);
          va(c.x, c.y);
          n.t = VOISINS.wait[0] + Math.random() * (VOISINS.wait[1] - VOISINS.wait[0]) * (jour ? 1 : 3);
          return;
        }
        case 'sort':
          // devant la porte
          n.etat = 'cherche';
          n.t = 0;
          return;
        case 'cherche': {
          // (les enfants ne ramassent pas : ils jouent autour de la maison)
          const r = jour && !n.m.enfant && n.porte_ < TRANSITION_VIE.panier ? this.ressourceProche(n) : null;
          if (!r) { if (n.porte_ > 0 || !jour) { rentrer(); return; } n.etat = 'flane'; n.t = 0; return; }
          const path = this.findPath(n.x, n.y, r.x, r.y);
          if (!path) { r.prise = 'loin'; n.t = 0.2; return; }
          r.prise = n;
          n.cible = r;
          n.path = path;
          n.etat = 'va';
          return;
        }
        case 'va':
          // arrivé : il se penche, ramasse
          n.etat = 'ramasse';
          n.t = TRANSITION_VIE.ramasse;
          return;
        case 'ramasse': {
          const r = n.cible;
          n.cible = null;
          if (r && this.ressources.has(r.id) && r.prise === n) {
            r.img.destroy();
            this.ressources.delete(r.id);
            this.ramasses.ids.push(r.id);
            this.ramasses.panier[n.maison.nom] = (this.ramasses.panier[n.maison.nom] || 0) + 1;
            garde(this.ramasses);
            n.porte_++;
          }
          n.etat = 'cherche';
          n.t = TRANSITION_VIE.souffle[0] + Math.random() * (TRANSITION_VIE.souffle[1] - TRANSITION_VIE.souffle[0]);
          return;
        }
        case 'rentre':
          // chez lui : il pose ce qu'il porte, ressort un peu plus tard
          n.etat = 'dedans';
          n.porte_ = 0;
          n.sortie = TRANSITION_VIE.pause[0] + Math.random() * (TRANSITION_VIE.pause[1] - TRANSITION_VIE.pause[0]);
          n.t = VOISINS.wait[0] + Math.random() * (VOISINS.wait[1] - VOISINS.wait[0]);
          return;
        case 'flane': {
          // plus rien à ramasser : il va et vient autour de chez lui, et finit par rentrer
          if (!jour || Math.random() < (n.m.enfant ? 0.05 : 0.15)) { rentrer(); return; }
          for (let k = 0; k < 15 && !n.path.length; k++) {
            const tx = Math.floor((n.porte.x + (Math.random() - 0.5) * 12 * T) / T), ty = Math.floor((n.porte.y + (n.maison.sens === 'haut' ? -1 : 1) * Math.random() * 6 * T) / T);
            if (this.canWalk(tx, ty)) n.path = this.findPath(n.x, n.y, tx * T + T / 2, ty * T + T - 2) || [];
          }
          n.t = VOISINS.wait[0] + Math.random() * (VOISINS.wait[1] - VOISINS.wait[0]);
          return;
        }
        default:
          n.etat = 'cherche';
      }
    },

    placeVoisin(n, time, marche) {
      const F = this.npcFrame;
      let frame;
      if (n.etat === 'ramasse' && !marche) frame = F('ramasse_' + Math.min(2, Math.floor((1 - n.t / TRANSITION_VIE.ramasse) * 3)));
      else if (marche) frame = F.de(n.porte_ > 0 ? 'panier' : 'marche', n.face, Math.floor(n.walked / 4) % 4);
      else frame = F.de('idle', n.face, Math.floor(time / 600 + n.m.perso) % 2);
      n.s.setFrame(frame);
      n.s.setPosition(Math.round(n.x), Math.round(n.y)).setDepth(n.y);
      n.shadow.setPosition(Math.round(n.x), Math.round(n.y)).setDepth(n.y - 0.5);
    },

    // Un toucher sur une ressource : le personnage y va (s'il n'y est pas déjà) et la prend en
    // arrivant (stepCueillette). Les voisins la laissent.
    tapRessource(w) {
      let r = null;
      for (const q of (this.ressources || new Map()).values()) if (Math.abs(w.x - q.x) <= 9 && w.y >= q.y - 14 && w.y <= q.y + 4) { r = q; break; }
      if (!r) return false;
      if (r.prise && r.prise !== 'joueur' && r.prise !== 'loin') {
        // un voisin y allait : il cherchera autre chose
        const n = r.prise;
        n.cible = null; n.path = []; n.etat = 'cherche'; n.t = 0.3;
      }
      r.prise = 'joueur';
      this.cueille = r;
      if (Math.hypot(this.heroPos.x - r.x, this.heroPos.y - r.y) > RAMASSABLES.reach) this.goTo(r.x, r.y + 2);
      return true;
    },

    // La ressource visée, une fois le personnage arrivé : dans l'inventaire.
    stepCueillette() {
      const r = this.cueille;
      if (!r) return;
      if (!this.ressources.has(r.id)) { this.cueille = null; return; }
      const d = Math.hypot(this.heroPos.x - r.x, this.heroPos.y - r.y);
      if (d > RAMASSABLES.reach || this.path.length) return;
      this.cueille = null;
      const H = hote();
      if (!H || !H.ramasserTransition) { r.prise = null; this.say('Il faut une partie en cours pour ramasser.'); return; }
      const res = H.ramasserTransition(r.id);
      if (!res || !res.ok) { r.prise = null; return; }   // (refusée : la nuit, trop fatigué ; le message est dit)
      this.ressources.delete(r.id);
      this.ramasses.ids.push(r.id);
      garde(this.ramasses);
      this.tweens.add({ targets: r.img, y: r.img.y - 10, alpha: 0, duration: reduced() ? 0 : 400, onComplete: () => r.img.destroy() });
      this.popGain({ [res.item]: res.n });
    },

    // Un toucher sur un voisin (dehors ou chez lui) : il s'arrête et parle de ce que sa famille a ramassé.
    tapVoisinDehors(w) {
      const n = (this.dehors || []).find((q) => Math.abs(w.x - q.x) <= 8 && w.y <= q.y + 3 && w.y >= q.y - (q.m.enfant ? 24 : 30));
      if (!n) return false;
      n.talk = 3;
      n.face = 'cote';
      n.s.setFlipX(this.heroPos.x < n.x);
      const k = (this.ramasses && this.ramasses.panier[n.maison.nom]) || 0;
      const l = TRANSITION_VIE.paroles[n.m.enfant ? 'enfant' : 'adulte'];
      const dit = k ? l.compte.replace('{n}', k).replace('{s}', k > 1 ? 's' : '') : l.rien;
      this.say(`👋 ${n.m.prenom} ${n.f.nom} : « ${dit} »`);
      return true;
    },
  });
})(window);
