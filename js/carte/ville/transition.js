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
 * sortent par la porte ; les parents font leur métier (bûcheron ou agriculteur : js/carte/ville/
 * metiers.js, l'économie de leur foyer : js/engine/voisins.js), les enfants flânent autour de
 * chez eux. Le soir, ils restent à la maison ; de TRANSITION_VIE.sommeil[0] h à sommeil[1] h, ils
 * dorment, chacun dans son lit (la maison en a un par membre : le plan, js/engine/transition.js).
 *
 * Les enfants vont à l'école comme ceux de la ferme (js/famille-ferme.js) : les jours d'école
 * (HorlogeSortie.JOURS_ECOLE), de TRANSITION_VIE.ecole[0] h à ecole[1] h. Le matin, ils vont à
 * pied jusqu'à l'abri de bus, où le bus de l'école (js/carte/ville/ecole.js) les attend ; le
 * soir, ils en descendent et rentrent à pied chez eux. Entre les deux, ils ne sont pas sur la
 * carte ; si le bus est déjà passé (ou sans animations), ils sont déjà partis, ou déjà rentrés.
 *
 * Les ressources du jour sont pour le joueur : un toucher sur l'une d'elles y envoie le
 * personnage, qui la prend en arrivant (FermeHote.ramasserTransition : l'objet entre dans
 * l'inventaire, contre l'énergie du geste « ramasser ») ; ce qu'il a pris (le moteur s'en
 * souvient : FermeHote.transition().pris) ne revient pas avant le lendemain.
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const V = global.CarteVille;
  const { T, BLOCS, BUS, RAMASSABLES, TRANSITION_VIE, VOISINS } = V.C;
  const { hote, reduced, sheetKey } = V;

  // Le plan de la partie (FermeHote.transition), lu une fois par visite de la carte.
  function planDuJour() {
    const H = hote();
    return H && H.transition ? H.transition() : null;
  }
  V.planTransition = planDuJour;

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
    // familles, leurs métiers (makeMetiers : les foyers, les champs).
    makeVoisinsDehors() {
      this.dehors = [];
      this.livreur = null;           // (la scène sert à toutes les cartes : js/carte/ville/livreur.js)
      this.caisses = [];
      this.ressources = new Map();
      const D = this.transition;
      if (!D || !D.plan || !this.textures.exists(BLOCS.key)) return;
      const P = D.plan;
      this.chargeVoisins();
      for (const m of P.maisons) this.poseMaison(m, this.eco && this.eco.foyers[m.nom] && this.eco.foyers[m.nom].maison);
      // les ressources du jour encore là
      for (const r of D.ressources) {
        if ((D.pris || []).includes(r.id) || !this.textures.exists(RAMASSABLES.key)) continue;
        const img = this.add.image(r.x, r.y, RAMASSABLES.key, RAMASSABLES.frames[r.sorte] || 0).setOrigin(0.5, 1).setDepth(r.y - 1);
        this.ressources.set(r.id, { ...r, img });
      }
      // les familles : chacun chez soi pour commencer (on le voit), il sort un peu plus tard
      const noms = (this.cache.json.get('perso_cases') || {}).frames || [];
      this.npcFrame = this.npcFrame || K.cases(noms);
      for (const m of P.maisons) {
        const f = V.voisins(m.nom, m.lits);
        // (devant la porte : en dessous, ou au-dessus pour une maison au sud du chemin)
        const porte = { x: m.porte.x * T + T / 2, y: (m.porte.y + (m.sens === 'haut' ? -1 : 1)) * T + T - 3 };
        f.membres.forEach((mb, i) => {
          const rang = f.membres.slice(0, i).filter((q) => q.enfant === mb.enfant).length;
          const key = sheetKey(mb.perso, mb.enfant);
          if (!this.textures.exists(key)) return;
          const c = this.caseDedans(m);
          const s = this.add.sprite(c.x, c.y, key, this.npcFrame('idle_bas_0')).setOrigin(0.5, 30 / 32);
          const shadow = this.add.ellipse(c.x, c.y, mb.enfant ? 9 : 11, 4, 0x1e1a18, 0.3);
          const n = { m: mb, f, maison: m, porte, s, shadow, x: c.x, y: c.y, path: [], face: 'bas', walked: 0, lit: i, dodo: null,
            speed: mb.enfant ? VOISINS.kidSpeed : VOISINS.speed, etat: 'dedans', t: Math.random() * 2, sortie: 0.5 + i * 1.6 + Math.random() * 2, porte_: 0, talk: 0, rang, geste: null };
          this.dehors.push(n);
          // (à l'école, le bus du matin passé : pas là)
          const H = global.HorlogeSortie ? global.HorlogeSortie.maintenant() : null;
          if (this.ecoleVoisin(n, H) && !this.busDuMatin(H)) this.monteVoisin(n, true);
          // (la nuit : déjà au lit)
          if (this.heureDeDormir(H) && m.litsCases[i]) this.coucheVoisin(n);
          this.placeVoisin(n, 0, false);
        });
      }
      this.makeMetiers();
      this.makeLivreur();
    },

    // Une case libre du plancher de la maison `m`, au hasard : son point (px), où poser les pieds.
    caseDedans(m) {
      const l = m.libres.length ? m.libres : [{ x: m.porte.x, y: m.porte.y - 1 }];
      const c = l[Math.floor(Math.random() * l.length)];
      return { x: c.x * T + T / 2, y: c.y * T + T - 2 };
    },

    // Une maison, à l'étape où sa famille l'a bâtie (`vue` : son plan, maisonPlan du moteur ; sans
    // partie, la première) : son plancher, ses murs (raccordés à leurs voisins), sa porte, ses
    // meubles (ceux des blocs, et les grands : table, chaises, canapé… assets/meuble_*.png). On
    // marche sur le plancher et par la porte ; les murs et les meubles arrêtent (m.libres : les
    // cases du plancher où l'on peut aller, pour la famille ; m.litsCases : un lit par membre).
    poseMaison(m, vue) {
      const plan = vue || { grille: m.plan, objets: [], lits: [] };
      if (!vue) m.plan.forEach((l, y) => [...l].forEach((c, x) => { if (c === 'd' || c === 'p') plan.lits.push([x, y]); }));
      const g = plan.grille, h = g.length, w = g[0].length;
      m.grille = g;
      const a = (x, y) => (y >= 0 && y < h && x >= 0 && x < w ? g[y][x] : ' ');
      const sol = (x, y) => !' MP'.includes(a(x, y));
      const img = (frame, x, y, plat) => {
        const px = (m.x + x) * T + T / 2, py = (m.y + y + 1) * T;
        return this.add.image(px, py, BLOCS.key, frame).setOrigin(0.5, 1).setDepth(plat ? py - T - 200 : py);
      };
      m.libres = [];
      m.litsCases = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const c = a(x, y), gx = m.x + x, gy = m.y + y;
          if (c === ' ') continue;          // (l'emprise pas encore bâtie : de l'herbe)
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
            if (plat) img(BLOCS.drap, x, y).setDepth(i.depth + 0.1);
          }
        }
      }
      // les lits, dans l'ordre du plan (ceux des adultes d'abord) : la couverture par-dessus le
      // dormeur ; on s'y couche depuis une case libre voisine
      for (const [x, y] of plan.lits) {
        const px = (m.x + x) * T + T / 2, py = (m.y + y + 1) * T;
        const v = [[0, 1], [0, -1], [-1, 0], [1, 0]].find(([dx, dy]) => a(x + dx, y + dy) === '.');
        m.litsCases.push({ x: px, y: py - 2, depth: py - T / 2 + 0.05, acces: v ? { x: (m.x + x + v[0]) * T + T / 2, y: (m.y + y + v[1] + 1) * T - 2 } : null });
      }
      // les grands meubles : posés en bas au milieu de leurs cases (le tapis à plat, sous les autres)
      for (const o of plan.objets) {
        const key = 'meuble_' + o.nom;
        if (!this.textures.exists(key)) continue;
        const px = (m.x + o.x + o.w / 2) * T, py = (m.y + o.y + 1) * T;
        this.add.image(Math.round(px), py - (o.plat ? 2 : 1), key).setOrigin(0.5, 1).setDepth(o.plat ? py - T - 199 : py - 3);
      }
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
        // (un geste du métier en cours : la hache, la houe, la cuisine)
        if (!n.path.length && this.stepMetier(n, dt, time, H)) { this.placeVoisin(n, time, false); continue; }
        if (n.path.length) {
          const to = n.path[0], dx = to.x - n.x, dy = to.y - n.y, l = Math.hypot(dx, dy), st = n.speed * dt;
          const r = K.regard(dx, dy);
          n.face = r.face; n.s.setFlipX(r.flip);
          if (l <= st) { n.x = to.x; n.y = to.y; n.path.shift(); } else { n.x += (dx / l) * st; n.y += (dy / l) * st; }
          n.walked += Math.min(l, st);
          marche = true;
        } else if ((n.t -= dt) <= 0) this.decideVoisin(n, jour, H);
        this.placeVoisin(n, time, marche);
      }
    },

    // Arrivé au bout de son chemin (ou fini d'attendre) : que faire maintenant ?
    decideVoisin(n, jour, H) {
      if (this.decideSommeil(n, H)) return;
      if (n.m.enfant && this.decideEcole(n, H)) return;
      if (!n.m.enfant && this.decideMetier(n, jour, H)) return;
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
        case 'cherche':
          // (le métier des parents : decideMetier ; les enfants jouent autour de la maison)
          if (!jour) { rentrer(); return; }
          n.etat = 'flane';
          n.t = 0;
          return;
        case 'rentre':
          // chez lui : il pose ce qu'il porte, ressort un peu plus tard
          n.etat = 'dedans';
          n.porte_ = 0;
          n.sortie = TRANSITION_VIE.pause[0] + Math.random() * (TRANSITION_VIE.pause[1] - TRANSITION_VIE.pause[0]);
          n.t = VOISINS.wait[0] + Math.random() * (VOISINS.wait[1] - VOISINS.wait[0]);
          return;
        case 'flane': {
          // il va et vient autour de chez lui, et finit par rentrer
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

    // ---------- la nuit : chacun dans son lit ----------

    // L'heure de dormir (TRANSITION_VIE.sommeil : de 22 h à 6 h ; la nuit du jeu compte ses
    // heures au-delà de 24).
    heureDeDormir(H) {
      if (!H) return false;
      const h = ((H.heure % 24) + 24) % 24, S = TRANSITION_VIE.sommeil;
      return h >= S[0] || h < S[1];
    },

    // Le sommeil décide de ce que fait `n` (true), ou le laisse à sa journée (false) : à
    // l'heure de dormir, il va à son lit et s'y couche ; à l'heure du lever, il se lève.
    decideSommeil(n, H) {
      const lit = n.maison.litsCases && n.maison.litsCases[n.lit];
      if (!lit) return false;
      const dort = this.heureDeDormir(H);
      if (n.etat === 'dort') {
        if (dort) n.t = 2;
        else this.leveVoisin(n);
        return true;
      }
      if (n.etat === 'versLit') { this.coucheVoisin(n); return true; }
      if (!dort || n.etat === 'ecole' || n.etat === 'enVille') return false;
      // (un geste en cours s'arrête là : l'arbre visé est libre pour un autre)
      if (n.arbre) { n.arbre.cible = null; n.arbre = null; }
      n.geste = null;
      n.porte_ = 0;
      n.etat = 'versLit';
      const p = lit.acces || this.caseDedans(n.maison);
      n.path = this.findPath(n.x, n.y, p.x, p.y) || [];
      n.t = n.path.length ? 0 : 0.01;
      return true;
    },

    coucheVoisin(n) {
      const lit = n.maison.litsCases[n.lit];
      n.etat = 'dort';
      n.path = [];
      n.x = lit.x; n.y = lit.y;
      n.face = 'bas';
      n.s.setFlipX(false);
      n.geste = 'idle_bas_0';
      n.dodo = lit.depth;
      n.shadow.setVisible(false);
      n.t = 2;
    },

    leveVoisin(n) {
      const lit = n.maison.litsCases[n.lit], p = lit.acces || this.caseDedans(n.maison);
      n.x = p.x; n.y = p.y;
      n.dodo = null;
      n.geste = null;
      n.shadow.setVisible(n.s.visible);
      n.etat = 'dedans';
      n.sortie = TRANSITION_VIE.pause[0] + Math.random() * (TRANSITION_VIE.pause[1] - TRANSITION_VIE.pause[0]);
      n.t = 0.5 + Math.random() * 2;
    },

    // ---------- l'école des enfants des voisins ----------

    // L'enfant `n` doit-il être à l'école (ou en chemin) à l'heure `H` ? (pas une fois rentré)
    ecoleVoisin(n, H) {
      const S = global.HorlogeSortie;
      if (!n.m.enfant || !H || H.nuit || !S || !S.JOURS_ECOLE.includes(H.semaine) || n.retour === H.jour) return false;
      return H.heure >= TRANSITION_VIE.ecole[0] && H.heure < TRANSITION_VIE.ecole[1];
    },

    // Le bus du matin passera-t-il encore (ou est-il à l'arrêt) ?
    busDuMatin(H) {
      const d = (BUS.scenes.transition || []).find((q) => q.monter);
      if (!d || !H || reduced()) return false;
      if (this.school) return this.school.def === d && this.school.phase !== 'depart';
      return H.heure < d.fin && !(this.schoolDone && this.schoolDone.has(H.jour + ':' + d.nom));
    },

    // Où l'enfant `n` attend le bus : à côté de ceux de la ferme, devant l'abri.
    arretVoisin(n) {
      const pts = (this.kidPaths || {}).enfants_matin, k = this.dehors.filter((q) => q.m.enfant).indexOf(n);
      const p = pts ? pts[pts.length - 1] : { x: n.x, y: n.y };
      return { x: p.x + 16 + (k % 6) * 8, y: p.y + Math.floor(k / 6) * 6 };
    },

    // L'école décide de ce que fait l'enfant `n` (true), ou le laisse à sa journée (false).
    decideEcole(n, H) {
      switch (n.etat) {
        case 'versBus':
          // à l'arrêt : il attend le bus
          n.etat = 'attendBus'; n.face = 'bas'; n.s.setFlipX(false); n.t = 1;
          return true;
        case 'attendBus':
          // (plus de bus du matin : il est parti autrement)
          if (!this.busDuMatin(H)) this.monteVoisin(n);
          else n.t = 1;
          return true;
        case 'ecole': {
          if (this.ecoleVoisin(n, H)) { n.t = 2; return true; }
          // le bus du soir est là : il en descendra (descendVoisins) ; sinon il est déjà rentré
          if (this.school && !this.school.def.monter && this.school.phase !== 'depart') { n.t = 1; return true; }
          const c = this.caseDedans(n.maison);
          n.x = c.x; n.y = c.y;
          this.montreVoisin(n);
          n.retour = H && H.jour;
          n.etat = 'dedans';
          n.sortie = TRANSITION_VIE.pause[0];
          n.t = 1;
          return true;
        }
        default:
      }
      if (!this.ecoleVoisin(n, H)) return false;
      // l'heure de l'école : au bus du matin s'il passe encore, sinon déjà parti
      if (this.busDuMatin(H)) {
        const p = this.arretVoisin(n);
        n.etat = 'versBus';
        n.path = this.findPath(n.x, n.y, p.x, p.y) || [];
        if (n.path.length) n.path[n.path.length - 1] = p;
        n.t = n.path.length ? 0 : 0.01;
      } else this.monteVoisin(n, true);
      return true;
    },

    // Les enfants des voisins encore en route vers l'arrêt (le bus les attend).
    voisinsVersBus() {
      return (this.dehors || []).some((n) => n.etat === 'versBus');
    },

    // Les enfants des voisins (pour le bus de l'école : il passe aussi pour eux).
    voisinsEcole() {
      return (this.dehors || []).filter((n) => n.m.enfant);
    },

    // L'enfant `n` monte dans le bus (il s'efface) ; `deja` : il est déjà parti (sans le voir).
    monteVoisin(n, deja) {
      n.etat = 'ecole';
      n.path = [];
      n.t = 2;
      n.geste = null;
      if (deja || reduced()) { n.s.setVisible(false); n.shadow.setVisible(false); return; }
      this.tweens.add({ targets: [n.s, n.shadow], alpha: 0, duration: BUS.kid.fade * 1000, onComplete: () => {
        if (n.etat !== 'ecole') return;
        n.s.setVisible(false).setAlpha(1); n.shadow.setVisible(false).setAlpha(0.3);
      } });
    },
    monteVoisins() {
      for (const n of this.dehors || []) if (n.etat === 'attendBus') this.monteVoisin(n);
    },

    montreVoisin(n) {
      this.tweens.killTweensOf([n.s, n.shadow]);
      n.s.setVisible(true).setAlpha(1);
      n.shadow.setVisible(true).setAlpha(0.3);
    },

    // Le bus du soir à l'arrêt : les enfants des voisins en descendent et rentrent chez eux.
    descendVoisins() {
      const H = global.HorlogeSortie ? global.HorlogeSortie.maintenant() : null;
      const pts = (this.kidPaths || {}).enfants_soir;
      if (!pts) return;
      let k = 0;
      for (const n of this.dehors || []) {
        if (n.etat !== 'ecole') continue;
        n.x = pts[0].x + 16 + (k % 6) * 8; n.y = pts[0].y + Math.floor(k / 6) * 6;
        k++;
        this.montreVoisin(n);
        n.retour = H && H.jour;
        n.porte_ = 0;
        n.etat = 'rentre';
        const c = this.caseDedans(n.maison);
        n.path = this.findPath(n.x, n.y, c.x, c.y) || [];
        n.t = 0.3 + k * 0.4;
      }
    },

    placeVoisin(n, time, marche) {
      const F = this.npcFrame;
      let frame;
      if (n.geste && !marche) frame = F(n.geste);
      else if (marche) frame = F.de(n.porte_ > 0 ? 'panier' : 'marche', n.face, Math.floor(n.walked / 4) % 4);
      else frame = F.de('idle', n.face, Math.floor(time / 600 + n.m.perso) % 2);
      n.s.setFrame(frame);
      n.s.setPosition(Math.round(n.x), Math.round(n.y)).setDepth(n.dodo != null ? n.dodo : n.y);
      n.shadow.setPosition(Math.round(n.x), Math.round(n.y)).setDepth(n.y - 0.5);
    },

    // Un toucher sur une ressource : le personnage y va (s'il n'y est pas déjà) et la prend en
    // arrivant (stepCueillette).
    tapRessource(w) {
      let r = null;
      for (const q of (this.ressources || new Map()).values()) if (Math.abs(w.x - q.x) <= 9 && w.y >= q.y - 14 && w.y <= q.y + 4) { r = q; break; }
      if (!r) return false;
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
      if (!H || !H.ramasserTransition) { this.say('Il faut une partie en cours pour ramasser.'); return; }
      const res = H.ramasserTransition(r.id);
      if (!res || !res.ok) return;   // (refusée : la nuit, trop fatigué ; le message est dit)
      this.ressources.delete(r.id);
      this.tweens.add({ targets: r.img, y: r.img.y - 10, alpha: 0, duration: reduced() ? 0 : 400, onComplete: () => r.img.destroy() });
      this.popGain({ [res.item]: res.n });
    },

    // Un toucher sur un voisin (dehors ou chez lui) : il s'arrête et parle de son métier et de sa
    // journée (paroleVoisin : js/carte/ville/metiers.js). (Un geste en cours, il le finit.)
    tapVoisinDehors(w) {
      const n = (this.dehors || []).find((q) => q.s.visible && Math.abs(w.x - q.x) <= 8 && w.y <= q.y + 3 && w.y >= q.y - (q.m.enfant ? 24 : 30));
      if (!n) return false;
      if (n.etat === 'dort') { this.say(`💤 ${n.m.prenom} ${n.f.nom} dort.`); return true; }
      if (!n.geste) {
        n.talk = 3;
        n.face = 'cote';
        n.s.setFlipX(this.heroPos.x < n.x);
      }
      this.say(this.paroleVoisin(n));
      return true;
    },
  });
})(window);
