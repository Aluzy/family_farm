/* carte/ferme/habitants.js — la scène de la ferme : les habitants des hameaux du grand monde (fiche 7b).
 *
 * Le moteur tient leurs foyers (js/engine/habitants.js : qui ils sont, leur métier, leur lit, leur
 * journée) ; le modèle de la carte en donne ce qu'il faut pour les dessiner (modèle.habitants :
 * { horaire (HABITANTS.HORAIRE), hameaux: { [id]: { foyers: [{ maison, membres: [{ id, perso,
 * enfant, metier, lit }] }] } } }). Ici, seulement près de la vue : les habitants d'un hameau sont
 * faits quand ses toits le sont (la région du hameau dessinée : hameaux.js, faireHameau) et s'en
 * vont avec eux. Chacun a la planche de son personnage (assets/personnages/, comme la famille du
 * joueur : js/famille-ferme.js) et suit l'horaire :
 *
 *   - la nuit (et avant LEVER, après COUCHER), il dort dans son lit, sous la couverture (le toit
 *     effacé montre la maison) ; au lever, il reste dedans jusqu'à TRAVAIL ;
 *   - le jour, un adulte va à son lieu de travail et y fait le geste de son métier (les gestes du
 *     personnage) : le bûcheron fend au billot et, de temps en temps, abat un arbre du monde tout
 *     près (il tremble, bascule et s'efface comme sous la hache du joueur : recolte-monde.js) ; le
 *     pêcheur pêche depuis la rive la plus proche de sa barque ; le mineur pioche devant l'entrée de
 *     grotte voisine (sinon au tas de minerai) ; le berger va et vient dans l'enclos, parmi ses
 *     moutons ; le cueilleur cueille dans les jardins et près des claies ; le jardinier plante et
 *     arrose ; chaque geste fini compte dans la journée de son foyer, une fois (le pont :
 *     ctx.bridge.habitantAgit → habitantAgit ; la bulle « +x » monte au-dessus de lui) ;
 *   - les enfants jouent sur la place ;
 *   - à MIDI et à RENTREE, tout le monde rentre manger (le premier adulte au foyer, qui cuisine) ;
 *     le soir, on reste à la maison ou devant la porte.
 *
 * Ils marchent par les ruelles et les chemins (fermier.path : les cases libres du monde, les murs
 * fermés), contournent le personnage du joueur, et, loin de la vue, sautent à leur but (ni
 * recherche ni image). Un appui sur un habitant (habitantAt, appelé en premier par hitAt) : il
 * s'arrête, se tourne vers le personnage, et sa bulle dit son prénom, son métier et une phrase
 * (le pont : ctx.bridge.habitantParle → paroleHabitant). Avec « animations réduites », ils vont
 * d'un point à l'autre sans marcher et font leurs gestes sur une image.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T, BLOCS_CARTE } = F.C;
  const { reducedMotion, v } = F;
  const VITESSE = K.VITESSES.famille;     // px/s : { adulte, enfant }
  const PAS = 4;                           // px par image de marche
  const FADE_S = 0.4;
  const TRAJETS = { n: 3, ms: 6 };         // recherches de chemin par image : au plus n, ou ms
  const LOIN = 320;                        // px hors de la vue : il saute au but
  const VU = 48;                           // px hors de la vue : son image n'est pas dessinée
  const BOITE = { l: 8, h: 30, bas: 3 };   // l'appui sur un habitant, autour de ses pieds
  const PAROLE_MS = 6000;                  // la bulle d'un habitant qu'on a touché
  // contourner le personnage : devant lui à moins de `loin` px, à moins de `pres` px de son chemin,
  // un pas de `cote` px ; `patience` s d'attente au plus, puis il passe (`passe` s sans l'éviter)
  const EVITE = { loin: 26, pres: 11, cote: 14, repos: 0.6, patience: 1.5, passe: 3 };
  const ENFANT_DY = 4;                     // px : un enfant couché est remonté d'autant
  const COURSE = 1.7;                      // un enfant qui court
  // les lieux de travail : à tant de cases au plus (la rive du pêcheur, la grotte du mineur, les
  // arbres du bûcheron) ; un arbre abattu toutes les COUPE s (au plus)
  const RAYONS = { rive: 30, grotte: 45, arbre: 20 };
  const COUPE = [30, 60];
  const rand = (a, b) => a + Math.random() * (b - a);

  // Les gestes (les cases des planches de personnages, assets/personnages/cases.json) : [case, s]
  // et, à un pas, le coup (« coup ») ; `vue` : de face, de dos ou de profil.
  const SEQ = {
    hache: () => [['hache_cote_0', 0.12], ['hache_cote_1', 0.16], ['hache_cote_1', 0.1], ['hache_cote_2', 0.06], ['hache_cote_3', 0.1, 'coup'], ['hache_cote_3', 0.4]],
    pioche: () => [['pioche_cote_0', 0.12], ['pioche_cote_1', 0.18], ['pioche_cote_1', 0.1], ['pioche_cote_2', 0.06], ['pioche_cote_3', 0.12, 'coup'], ['pioche_cote_3', 0.5]],
    peche: (vue) => [[`peche_${vue}_0`, 0.25], [`peche_${vue}_1`, 0.22], [`peche_${vue}_1`, 0.1], [`peche_${vue}_2`, rand(6, 14)], [`peche_${vue}_3`, 0.12], [`peche_${vue}_3`, 0.4, 'coup'], [`peche_${vue}_0`, 0.6]],
    ramasse: () => [['ramasse_0', 0.2], ['ramasse_1', 0.25], ['ramasse_2', 0.6], ['ramasse_1', 0.25], ['ramasse_2', 0.6, 'coup'], ['ramasse_0', 0.4]],
    plante: (vue) => [[`plante_${vue}_0`, 0.2], [`plante_${vue}_1`, 0.25], [`plante_${vue}_2`, 0.5], [`plante_${vue}_2`, 0.3, 'coup']],
    arrose: (vue) => [[`arrose_${vue}_0`, 0.3], [`arrose_${vue}_1`, 0.3], [`arrose_${vue}_2`, 0.9], [`arrose_${vue}_1`, 0.3, 'coup']],
    faux: () => [['faux_cote_0', 0.1], ['faux_cote_1', 0.16], ['faux_cote_1', 0.08], ['faux_cote_2', 0.08], ['faux_cote_3', 0.12, 'coup'], ['faux_cote_3', 0.6]],
    cuisine: () => [['cuisine_0', 0.35], ['cuisine_1', 0.35], ['cuisine_2', 0.35], ['cuisine_3', 0.35]],
  };
  // le geste de chaque métier (le moteur : HABITANTS.METIERS[m].geste) et ce qu'on y voit
  const GESTE_METIER = { bucheron: 'couper', pecheur: 'pecher', mineur: 'piocher', berger: 'traire', cueilleur: 'cueillir' };

  F.partie({

    // Les habitants du hameau dessiné `e` (hameaux.js : this.hameauxVus), faits à la première
    // image où le modèle les a (le hameau découvert, ses foyers nés) : e.gens = { membres: Map,
    // moutons, lieux }.
    habitantsDe(e) {
      const M = this.ctx.lastModel && this.ctx.lastModel.habitants;
      const H = M && M.hameaux && M.hameaux[e.plan.id];
      if (!H) { if (e.gens) this.defaireHabitants(e); return null; }
      if (!e.gens) e.gens = { membres: new Map(), moutons: [], lieux: {}, coupe: 0, cle: '' };
      // (le modèle a changé : un foyer de plus, de moins, un personnage autre)
      if (e.gens.ref !== H) {
        e.gens.ref = H;
        const cle = JSON.stringify(H.foyers);
        if (cle !== e.gens.cle) { e.gens.cle = cle; this.syncHabitants(e, H); }
      }
      return e.gens;
    },

    syncHabitants(e, H) {
      const G = e.gens, maisons = new Map(e.plan.maisons.map((mz) => [mz.id, mz])), vus = new Set();
      for (const f of H.foyers) {
        const mz = maisons.get(f.maison);
        if (!mz) continue;
        f.membres.forEach((d, rang) => {
          vus.add(d.id);
          const m = G.membres.get(d.id);
          if (m && m.key === this.clePerso(d)) { m.def = d; return; }
          if (m) this.defaireHabitant(m);
          G.membres.set(d.id, this.nouvelHabitant(e, d, mz, rang));
        });
      }
      for (const [id, m] of G.membres) if (!vus.has(id)) { this.defaireHabitant(m); G.membres.delete(id); }
      // (le rang de chacun parmi ceux de son métier : sa place au travail, pas tous au même endroit)
      const rangs = {};
      for (const m of G.membres.values()) { const k = m.def.enfant ? 'enfant' : m.def.metier || 'jardin'; m.poste = rangs[k] || 0; rangs[k] = m.poste + 1; }
      if (H.metier === 'berger' && !G.moutons.length) this.faireMoutons(e);
    },

    clePerso(d) { return (d.enfant ? 'enfant_' : 'perso_') + d.perso; },

    // Un habitant : son image attend sa planche (chargée à la demande, une fois).
    nouvelHabitant(e, d, mz, rang) {
      const key = this.clePerso(d);
      this.chargePerso(key, d);
      return {
        id: d.id, def: d, key, e, maison: mz, rang, s: null, drap: null,
        x: 0, y: 0, face: 'bas', flip: false, marche: 0, alpha: 0, fade: 0, place: false,
        act: null, chemin: [], demande: null, puis: null, vite: 1, pause: 0, evite: 0, attente: rand(0.5, 3),
        seq: null, couche: null, parle: null, gain: null, bulle: null, n: 0, poste: 0,
        // (chacun son retard sur l'horaire : ils ne partent pas tous à la même minute)
        decale: rand(0, 0.45) + (rang ? 0.1 : 0), prochaineCoupe: performance.now() + rand(6, 45) * 1000,
      };
    },

    chargePerso(key, d) {
      if (this.textures.exists(key)) return;
      if (!this.habCharges) this.habCharges = new Set();
      if (this.habCharges.has(key)) return;
      this.habCharges.add(key);
      this.load.spritesheet(key, v(K.planche(d.perso, d.enfant)), { frameWidth: 16, frameHeight: 32 });
      if (!this.load.isLoading()) this.load.start();
    },

    defaireHabitant(m) {
      if (m.s) m.s.destroy();
      if (m.drap) m.drap.destroy();
      if (m.gain) m.gain.detruit();
      if (m.bulle) m.bulle.el.remove();
      m.s = m.drap = m.gain = m.bulle = null;
    },

    defaireHabitants(e) {
      const G = e.gens;
      if (!G) return;
      for (const m of G.membres.values()) this.defaireHabitant(m);
      for (const b of G.moutons) b.s.destroy();
      e.gens = null;
    },

    // Les cases des planches de personnages par leur nom.
    casesPerso() {
      if (!this.habCases) {
        const j = this.cache.json.get('perso_cases');
        if (!j || !Array.isArray(j.frames)) return null;
        this.habCases = K.cases(j.frames);
      }
      return this.habCases;
    },

    /* ---------- les lieux ---------- */

    pied(t) { const W = this.grid.cols; return { x: (t % W) * T + T / 2, y: (Math.floor(t / W) + 1) * T - 2 }; },
    libre(x, y) { return !this.fermier || !this.fermier.standable || this.fermier.standable(x, y); },
    // La case libre la plus proche de la case t (à `r` cases au plus), ses pieds ; ou null.
    pres(t, r = 2) {
      const W = this.grid.cols, c = t % W, l = Math.floor(t / W);
      for (let d = 0; d <= r; d++) {
        for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
          const p = this.pied((l + dy) * W + c + dx);
          if (this.libre(p.x, p.y)) return p;
        }
      }
      return null;
    },
    // Une case libre au hasard parmi `cases`, ses pieds (quelques essais), ou null.
    auHasard(cases, essais = 8) {
      if (!cases || !cases.length) return null;
      for (let k = 0; k < essais; k++) {
        const p = this.pied(cases[Math.floor(Math.random() * cases.length)]);
        if (this.libre(p.x, p.y)) return { x: p.x + rand(-3, 3), y: p.y };
      }
      return null;
    },
    travailDe(e, genre) { return e.plan.travail.find((t) => t.genre === genre) || null; },

    // La rive du pêcheur : les cases libres qui touchent l'eau, les plus proches de sa barque (au
    // plus RAYONS.rive cases), cherchées une fois (une région pas encore faite : plus tard).
    rivesDe(e) {
      const L = e.gens.lieux;
      if (L.rives && L.rives.length) return L.rives;
      if (L.rivesT && performance.now() < L.rivesT) return [];
      L.rivesT = performance.now() + 5000;
      const W = this.grid.cols, b = this.travailDe(e, 'barque') || this.travailDe(e, 'sechoir');
      const depart = b ? b.case : e.plan.case, c0 = depart % W, r0 = Math.floor(depart / W), R = RAYONS.rive;
      const vus = new Set([depart]), file = [depart], out = [];
      // (des places de pêche à deux cases au moins l'une de l'autre : ils ne pêchent pas coude à coude)
      const loin = (x, y) => out.every((q) => Math.hypot(q.x - x, q.y - y) >= 2 * T);
      for (let k = 0; k < file.length && out.length < 8; k++) {
        const t = file[k], c = t % W, r = Math.floor(t / W);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const t2 = (r + dy) * W + c + dx;
          if (vus.has(t2) || Math.abs(c + dx - c0) > R || Math.abs(r + dy - r0) > R) continue;
          vus.add(t2);
          const p = this.pied(t2);
          if (this.libre(p.x, p.y)) { file.push(t2); continue; }
          // (une case d'eau à côté d'une case libre : la rive)
          const eau = this.eauMondeSous ? this.eauMondeSous((c + dx) * T + T / 2, (r + dy) * T + T / 2) : null;
          if (eau && k > 0 && loin(c * T + T / 2, (r + 1) * T - 2)) out.push({ x: (c * T) + T / 2, y: (r + 1) * T - 2, dx, dy });
        }
      }
      L.rives = out;
      return out;
    },

    // La grotte du mineur : l'entrée du monde la plus proche (au plus RAYONS.grotte cases), sinon
    // son tas de minerai.
    mineDe(e) {
      const L = e.gens.lieux;
      if (L.mine) return L.mine;
      const W = this.grid.cols, cx = (e.plan.case % W) * T, cy = Math.floor(e.plan.case / W) * T;
      let best = null;
      for (const g of (this.grottesMonde ? this.grottesMonde() : [])) {
        const d = Math.hypot(g.devant.x - cx, g.devant.y - cy);
        if (d <= RAYONS.grotte * T && (!best || d < best.d) && this.libre(g.devant.x, g.devant.y)) best = { d, x: g.devant.x, y: g.devant.y, grotte: true };
      }
      if (!best) {
        const t = this.travailDe(e, 'tas_minerai') || this.travailDe(e, 'wagonnet');
        const p = t ? this.pres(t.case + 1) || this.pres(t.case) : null;
        if (p) best = { x: p.x, y: p.y, grotte: false, vers: this.pied(t.case) };
      }
      L.mine = best;
      return best;
    },

    // Les cases du dedans de l'enclos du berger (HAMEAUX.ENCLOS, autour de son milieu).
    enclosDe(e) {
      const L = e.gens.lieux;
      if (L.enclos) return L.enclos;
      const t = this.travailDe(e, 'enclos'), E = (this.ctx.monde && this.ctx.monde.hameauEnclos) || [5, 4];
      if (!t) return (L.enclos = []);
      const W = this.grid.cols, cx = t.case % W, cy = Math.floor(t.case / W), x0 = cx - (E[0] >> 1), y0 = cy - (E[1] >> 1), out = [];
      for (let y = y0 + 1; y < y0 + E[1] - 1; y++) for (let x = x0 + 1; x < x0 + E[0] - 1; x++) out.push(y * W + x);
      return (L.enclos = out);
    },

    // Un arbre du monde près du billot, debout, que personne ne coupe : son objet (vegetation.js).
    arbrePres(e) {
      const b = this.travailDe(e, 'billot') || { case: e.plan.case }, p = this.pied(b.case), E = this.mondeEtat;
      let best = null;
      for (const o of (this.mondeObjets || new Map()).values()) {
        if (!o.regle || o.regle.geste !== 'couper' || o.genre !== 'arbre' || !o.img || !o.img.visible || o.anim || o.tombe) continue;
        if ((E && E.pris.has(o.id)) || (this.mondeOccupe && this.mondeOccupe.has(o.id))) continue;
        const d = Math.hypot(o.fx - p.x, o.fy - p.y);
        if (d <= RAYONS.arbre * T && (!best || d < best.d)) best = { d, o };
      }
      return best ? best.o : null;
    },

    // Les pieds du lit de l'habitant (son rang dans les lits de la maison) : { x, y, depth, drap }.
    litDe(m) {
      const L = m.def.lit !== null && m.def.lit !== undefined ? m.maison.lits[m.def.lit] : null;
      if (!L) return null;
      const W = this.grid.cols, bx = (L.case % W) * T + T / 2, by = (Math.floor(L.case / W) + 1) * T;
      const c = ((this.cache.json.get('hameaux_cases') || {})[L.sorte] || [])[0];
      if (!c) return null;
      const [, , w, h, px, py] = c, top = by - py;
      const y = Math.min(top + BLOCS_CARTE.litPieds, top + h - 1) - (m.def.enfant ? ENFANT_DY : 0);
      const drap = 'meuble_' + L.sorte + '_drap';
      return { x: bx, y, depth: by, drap: this.textures.exists(drap) ? { key: drap, x: bx, y: by, ox: px / w, oy: py / h } : null };
    },

    /* ---------- l'horaire ---------- */

    // Ce qu'il doit faire à cette heure : dort, maison, travail, joue, repas, soir.
    habitantVoulu(m) {
      const md = this.ctx.lastModel || {}, H = (md.habitants && md.habitants.horaire) || {};
      const h = (Number(md.heure) || 12) - m.decale;
      if (md.nuit || h < H.LEVER || h >= H.COUCHER) return 'dort';
      if (h < H.TRAVAIL) return 'maison';
      if (h >= H.MIDI && h < H.REPRISE) return 'repas';
      if (h >= H.RENTREE) return h < H.RENTREE + 1.5 ? 'repas' : 'soir';
      return m.def.enfant ? 'joue' : 'travail';
    },

    // Ce qu'il fait, pour sa phrase (le moteur : paroleHabitant) : dort, maison, chemin, travail,
    // joue, repas, rentre, soir.
    habitantFait(m) {
      if (m.couche) return 'dort';
      if (m.chemin.length || m.demande) return m.act === 'travail' ? 'chemin' : m.act === 'repas' || m.act === 'dort' ? 'rentre' : m.act || 'maison';
      return m.act || 'maison';
    },

    /* ---------- marcher ---------- */

    // Il va en (x, y) ; puis : puis(). La recherche du chemin attend son tour (TRAJETS par image).
    habAller(m, x, y, puis, vite = 1) {
      m.demande = { x, y, puis: puis || null, vite };
      m.chemin = [];
      m.puis = null;
    },

    habTrajet(m, vue) {
      const d = m.demande;
      m.demande = null;
      const loin = (q) => q.x < vue.x - LOIN || q.x > vue.right + LOIN || q.y < vue.y - LOIN || q.y > vue.bottom + LOIN;
      // (loin de la vue, ou sans marche : il y est)
      if (reducedMotion() || !this.fermier || (loin(m) && loin(d))) { m.x = d.x; m.y = d.y; if (d.puis) d.puis(); return; }
      const info = {};
      const p = this.fermier.path(m.x, m.y, d.x, d.y, info);
      // (déjà sur la case du but : il y va tout droit)
      if (p && !p.length && !p.droit) { m.chemin = [{ x: d.x, y: d.y }]; m.puis = d.puis; m.vite = d.vite; return; }
      if (!p || !p.length) {
        if (p && p.droit) { m.attente = rand(1, 3); return; }
        // (un but qu'on ne peut pas atteindre, enfermé : il reste où il est, sans passer au
        // travers d'un mur ni sauter, et l'heure suivante le mènera ailleurs (fiche 16))
        if (info.impossible) { m.attente = rand(2, 4); return; }
        // (trop loin pour la recherche : il s'efface et reparaît là-bas)
        m.saut = { x: d.x, y: d.y, puis: d.puis };
        m.fade = -1;
        return;
      }
      m.chemin = p.slice();
      m.puis = d.puis;
      m.vite = d.vite;
    },

    // Un pas sur son chemin ; il contourne le personnage du joueur. → true s'il a marché.
    habAvancer(m, dt, joueur) {
      if (!m.chemin.length) {
        if (m.puis) { const f = m.puis; m.puis = null; f(); }
        return false;
      }
      if (m.pause > 0) { m.pause -= dt; return false; }
      const to = m.chemin[0];
      let dx = to.x - m.x, dy = to.y - m.y;
      const l = Math.hypot(dx, dy);
      // (le personnage devant lui : un pas de côté, sinon il attend un peu ; s'il attend trop (le
      // personnage dans un passage étroit, sur son lit), il passe quand même)
      if (m.gene > EVITE.patience) { m.gene = 0; m.evite = EVITE.passe; }
      if (joueur && m.evite <= 0 && l > 1) {
        const jx = joueur.x - m.x, jy = joueur.y - m.y, dj = Math.hypot(jx, jy);
        if (dj < EVITE.loin && (jx * dx + jy * dy) / l > 0) {
          const ux = dx / l, uy = dy / l, ecart = Math.abs(jx * uy - jy * ux);
          if (ecart < EVITE.pres) {
            m.evite = EVITE.repos;
            const cotes = [1, -1].map((s) => ({ x: m.x - uy * EVITE.cote * s + ux * 6, y: m.y + ux * EVITE.cote * s + uy * 6 }))
              .sort((a, b) => Math.hypot(b.x - joueur.x, b.y - joueur.y) - Math.hypot(a.x - joueur.x, a.y - joueur.y));
            // (un pas de côté, s'il ne coupe pas un mur, ni pour y aller ni pour reprendre son chemin)
            const L = this.fermier && this.fermier.ligneLibre ? this.fermier.ligneLibre : () => true;
            const c = cotes.find((q) => this.libre(q.x, q.y) && L(m.x, m.y, q.x, q.y) && L(q.x, q.y, to.x, to.y));
            if (c) { m.chemin.unshift(c); dx = c.x - m.x; dy = c.y - m.y; } else { m.pause = 0.5; m.gene = (m.gene || 0) + 0.5; return false; }
          }
        }
      }
      if (m.evite > 0) m.evite -= dt;
      const ll = Math.hypot(dx, dy), st = (m.def.enfant ? VITESSE.enfant : VITESSE.adulte) * m.vite * dt, cible = m.chemin[0];
      ({ face: m.face, flip: m.flip } = K.regard(dx, dy));
      if (ll <= st) { m.x = cible.x; m.y = cible.y; m.chemin.shift(); } else { m.x += (dx / ll) * st; m.y += (dy / ll) * st; }
      m.marche += Math.min(ll, st);
      return true;
    },

    /* ---------- le lit ---------- */

    habCoucher(m, L) {
      m.couche = L;
      m.chemin = []; m.puis = null; m.seq = null;
      m.x = L.x; m.y = L.y; m.face = 'bas'; m.flip = false;
      if (L.drap) {
        if (!m.drap) m.drap = this.add.image(0, 0, L.drap.key);
        m.drap.setTexture(L.drap.key).setOrigin(L.drap.ox, L.drap.oy).setPosition(L.drap.x, L.drap.y).setDepth(L.depth + 0.2).setVisible(true);
      }
    },
    habLever(m) {
      m.couche = null;
      if (m.drap) m.drap.setVisible(false);
      if (this.libre(m.x, m.y + 4)) m.y += 4;
    },

    /* ---------- la journée ---------- */

    // Il commence (ou reprend) ce que l'heure veut : où aller, quoi y faire.
    habCommencer(e, m, voulu) {
      const mz = m.maison, W = this.grid.cols;
      if (m.couche && voulu !== 'dort') this.habLever(m);
      // (l'arbre qu'il allait abattre : un autre le pourra)
      if (m.arbre) { if (this.mondeOccupe) this.mondeOccupe.delete(m.arbre.id); m.arbre = null; m.coups = 0; }
      m.act = voulu;
      m.seq = null;
      m.geste = null;
      m.ici = null;
      if (voulu === 'dort') {
        const L = this.litDe(m);
        if (!L) { const q = this.auHasard(mz.dedans) || this.pied(mz.devant); this.habAller(m, q.x, q.y); return; }
        if (m.couche) return;
        this.habAller(m, L.x, L.y + (m.def.enfant ? ENFANT_DY : 0), () => this.habCoucher(m, this.litDe(m) || L));
        return;
      }
      if (voulu === 'repas' && m.rang === 0 && mz.foyer !== null && mz.foyer !== undefined) {
        // (le premier adulte cuisine, devant le foyer)
        const p = this.pied(mz.foyer + W);
        if (this.libre(p.x, p.y)) { this.habAller(m, p.x, p.y, () => { m.face = 'haut'; m.flip = false; m.ici = 'cuisine'; }); return; }
      }
      if (voulu === 'maison' || voulu === 'repas' || (voulu === 'soir' && (m.def.enfant || Math.random() < 0.6))) {
        const salle = (mz.pieces.find((p) => p.genre === 'salle') || {}).cases;
        const q = this.auHasard(voulu === 'repas' ? salle : mz.dedans) || this.pied(mz.devant);
        this.habAller(m, q.x, q.y, () => { m.ici = 'dedans'; m.attente = rand(4, 10); });
        return;
      }
      if (voulu === 'soir') {
        // (devant la porte, à prendre le frais)
        const p = this.pres(mz.devant + (Math.random() < 0.5 ? 1 : -1), 1) || this.pied(mz.devant);
        this.habAller(m, p.x, p.y, () => { m.ici = 'porte'; m.face = 'bas'; m.attente = rand(6, 14); });
        return;
      }
      if (voulu === 'joue') { this.habJouer(e, m); return; }
      this.habTravailler(e, m);
    },

    habJouer(e, m) {
      const q = this.auHasard(e.plan.place.cases) || this.pied(e.plan.case);
      this.habAller(m, q.x, q.y, () => { m.ici = 'joue'; m.attente = rand(1, 4); }, Math.random() < 0.4 ? COURSE : 1);
    },

    // Au travail : son lieu, selon son métier (le jardin, sans métier).
    habTravailler(e, m) {
      const mt = m.def.metier, W = this.grid.cols, now = performance.now();
      m.repli = false;
      const fait = (seq, vue, flip, coup) => () => { m.face = vue === 'cote' ? 'cote' : vue; m.flip = !!flip; m.ici = 'geste'; m.geste = { seq, vue, coup }; };
      if (mt === 'bucheron') {
        // un arbre du monde, de temps en temps ; sinon le billot
        // (un arbre à la fois dans le hameau, de temps en temps)
        const G = e.gens, o = now >= m.prochaineCoupe && now >= (G.coupe || 0) && m.fini !== this.habJour() ? this.arbrePres(e) : null;
        if (o) {
          m.prochaineCoupe = now + rand(COUPE[0], COUPE[1]) * 1000;
          G.coupe = now + rand(10, 25) * 1000;
          const s = this.strikeSide({ x: o.fx, y: o.fy }, 11);
          if (this.mondeOccupe) this.mondeOccupe.add(o.id);
          m.arbre = o;
          this.habAller(m, s.x, s.y, fait('hache', 'cote', s.x > o.fx, 'arbre'));
          return;
        }
        // (au billot, ou à côté d'un tas de bois : chacun sa place)
        const places = this.placesAtelier(e, ['billot', 'tas_bois']);
        if (places.length) {
          const p = places[m.poste % places.length];
          this.habAller(m, p.x + (m.poste >= places.length ? rand(-4, 4) : 0), p.y, fait('hache', 'cote', p.flip, null));
          return;
        }
      } else if (mt === 'pecheur') {
        const rives = this.rivesDe(e);
        if (rives.length) {
          const r = rives[m.poste % rives.length];
          const g = K.regard(r.dx, r.dy);
          this.habAller(m, r.x + rand(-2, 2), r.y, fait('peche', g.face, g.flip, 'compte'));
          return;
        }
      } else if (mt === 'mineur') {
        // (les premiers à l'entrée de la grotte, les autres au wagonnet et au tas de minerai)
        const mi = this.mineDe(e), places = this.placesAtelier(e, ['wagonnet', 'tas_minerai']);
        if (places.length && (!mi || !mi.grotte || m.poste >= 3)) {
          const p = places[m.poste % places.length];
          this.habAller(m, p.x, p.y, fait('pioche', 'cote', p.flip, 'compte'));
          return;
        }
        if (mi) {
          const flip = mi.vers ? mi.vers.x < mi.x : Math.random() < 0.5;
          const dx = mi.grotte ? ((m.poste % 2) ? 1 : -1) * (6 + 10 * Math.floor(m.poste / 2)) : 0;
          const x = this.libre(mi.x + dx, mi.y) ? mi.x + dx : mi.x;
          this.habAller(m, x, mi.y, fait('pioche', 'cote', mi.grotte ? x < mi.x : flip, 'compte'));
          return;
        }
      } else if (mt === 'berger') {
        // (deux dans l'enclos, avec les moutons ; les autres fauchent l'herbe autour, pour eux)
        const enclos = this.enclosDe(e);
        if (m.poste < 2) {
          const q = this.auHasard(enclos);
          if (q) { this.habAller(m, q.x, q.y, fait('ramasse', 'bas', false, 'compte')); return; }
        } else if (enclos.length) {
          const W2 = this.grid.cols, c = enclos[0], autour = [];
          for (let dy = -4; dy <= 5; dy++) for (let dx = -5; dx <= 6; dx++) if (Math.abs(dx) > 2 || dy < -2 || dy > 3) autour.push(c + dy * W2 + dx);
          const q = this.auHasard(autour, 12);
          if (q) { this.habAller(m, q.x, q.y, fait('faux', 'cote', Math.random() < 0.5, 'compte')); return; }
        }
      } else if (mt === 'cueilleur') {
        const jardins = e.plan.jardins.flatMap((j) => j.cases);
        const claie = this.travailDe(e, 'claie') || this.travailDe(e, 'paniers');
        const q = Math.random() < 0.6 ? this.auHasard(jardins) : claie ? this.pres(claie.case + W, 1) : null;
        if (q) { this.habAller(m, q.x, q.y, fait('ramasse', 'bas', false, 'compte')); return; }
      }
      // (le jardinier, ou un lieu qu'on ne trouve pas : au jardin, sinon sur la place ; il le
      // cherchera de nouveau)
      m.repli = !!mt;
      const jardins = e.plan.jardins.flatMap((j) => j.cases);
      const q = this.auHasard(jardins) || this.auHasard(e.plan.place.cases) || this.pied(e.plan.case);
      this.habAller(m, q.x, q.y, fait(Math.random() < 0.5 ? 'plante' : 'arrose', 'bas', false, null));
    },
    // Les places autour des pièces `genres` du lieu de travail (billot, tas de bois…) : les cases
    // libres à leur gauche et à leur droite, tournées vers elles ; une fois par hameau.
    placesAtelier(e, genres) {
      const L = e.gens.lieux, cle = 'atelier:' + genres.join();
      if (L[cle] && L[cle].length) return L[cle];
      const out = [];
      for (const t of e.plan.travail.filter((q) => genres.includes(q.genre))) {
        const c = this.pied(t.case);
        for (const d of [-1, 1]) { const p = this.pied(t.case + d); if (this.libre(p.x, p.y)) out.push({ x: p.x - d * 3, y: p.y, flip: d > 0 && c.x < p.x }); }
      }
      return (L[cle] = out);
    },
    habJour() { return (this.ctx.lastModel && this.ctx.lastModel.jour) || 0; },

    // Le geste fini : il compte (le moteur, une fois), la bulle « +x » ; l'arbre abattu tombe.
    habCoup(e, m, coup) {
      if (coup === 'arbre') {
        const o = m.arbre;
        // (l'arbre n'est plus là : la région s'en est allée, le joueur l'a pris)
        if (!o || !o.img || !o.img.active || !o.img.visible || (this.mondeEtat && this.mondeEtat.pris.has(o.id))) {
          if (o && this.mondeOccupe) this.mondeOccupe.delete(o.id);
          m.arbre = null; m.coups = 0; m.seq = null; m.geste = null; m.ici = null;
          return;
        }
        this.mondeTremble(o);
        if (global.FermeSon) global.FermeSon.joue('hache', { x: o.fx, y: o.fy, depuis: 0.16, portee: 28, ecart: 0 });   // le bûcheron (js/son.js)
        m.coups = (m.coups || 0) + 1;
        if (m.coups < 3) return;
        m.coups = 0;
        m.arbre = null;
        const r = this.ctx.bridge && this.ctx.bridge.habitantAgit ? this.ctx.bridge.habitantAgit(e.plan.id, m.id, 'couper', o.id) : null;
        if (r && r.ok) {
          this.mondeNote(o.id, false);
          o.tombe = { dir: m.x < o.fx ? 1 : -1, fin: [], arbre: true };
          this.mondeAbat(o, true, true);
          this.habGain(m, r.items);
        } else {
          if (this.mondeOccupe) this.mondeOccupe.delete(o.id);
          if (r && r.fini) m.fini = this.habJour();
        }
        m.seq = null; m.geste = null; m.ici = null;
        return;
      }
      if (coup !== 'compte' || m.fini === this.habJour()) return;
      const g = GESTE_METIER[m.def.metier];
      const r = g && this.ctx.bridge && this.ctx.bridge.habitantAgit ? this.ctx.bridge.habitantAgit(e.plan.id, m.id, g) : null;
      if (r && r.ok) this.habGain(m, r.items);
      else if (r && r.fini) m.fini = this.habJour();
    },

    habGain(m, items) {
      if (!items || !Object.keys(items).length || !this.ctx.labelLayer || !m.s || !m.s.visible) return;
      if (!m.gain) m.gain = K.bulleGain(this.ctx.labelLayer, (item) => ((this.ctx.bridge && this.ctx.bridge.icone) ? this.ctx.bridge.icone(item) : item));
      m.gain.montre(items);
      const f = this.screenFrame ? this.screenFrame() : null;
      if (f) m.gain.place((m.x - f.left) * f.k, (m.y - K.BULLE.dessus - f.top) * f.k);
    },

    /* ---------- à chaque image ---------- */

    // Les habitants de chaque hameau dessiné (stepHameaux) : l'horaire, la marche, les gestes, les
    // images, les bulles.
    stepHabitants(dt) {
      if (!this.hameauxVus || !this.hameauxVus.size) return;
      const C = this.casesPerso();
      if (!C) return;
      const vue = this.cameras.main.worldView, joueur = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      const calme = reducedMotion(), now = performance.now();
      let trajets = 0;
      const t0 = now;
      const f = this.screenFrame ? this.screenFrame() : null;
      this.habNombre = 0;
      for (const e of this.hameauxVus.values()) {
        const G = this.habitantsDe(e);
        if (!G) continue;
        for (const m of G.membres.values()) {
          // (sa planche n'est pas encore là : il attend)
          if (!m.s) {
            if (!this.textures.exists(m.key)) continue;
            m.s = this.add.sprite(0, 0, m.key, C('idle_bas_0')).setOrigin(0.5, 1).setVisible(false);
          }
          // au premier pas : il est déjà où l'heure le veut
          if (!m.place) { m.place = true; this.habPlacer(e, m); }
          const voulu = this.habitantVoulu(m);
          // (il parle : il s'arrête, tourné vers le personnage)
          const parle = m.parle && now < m.parle.until;
          if (m.parle && !parle) { m.parle = null; if (m.bulle) { m.bulle.el.remove(); m.bulle = null; } }
          if (m.saut) {
            // (il s'efface, puis reparaît à son but)
            m.alpha = Math.max(0, m.alpha - dt / FADE_S);
            if (m.alpha <= 0 || calme) { const s = m.saut; m.saut = null; m.x = s.x; m.y = s.y; m.fade = 1; if (s.puis) s.puis(); }
          } else if (parle) {
            if (joueur) ({ face: m.face, flip: m.flip } = K.regard(joueur.x - m.x, joueur.y - m.y));
          } else if (m.act !== voulu && !m.demande) {
            // (un geste en cours se finit d'abord, sauf pour aller dormir)
            if (!m.seq || voulu === 'dort') { m.geste = null; this.habCommencer(e, m, voulu); }
          } else if (m.demande) {
            if (trajets < TRAJETS.n && (!trajets || performance.now() - t0 < TRAJETS.ms)) { trajets++; this.habTrajet(m, vue); }
          } else if (!m.chemin.length && !m.puis && !m.seq && !m.couche) {
            // sur place : son geste, ou il attend puis va ailleurs
            if (m.geste) {
              const g = m.geste;
              if (m.repit > 0) m.repit -= dt;
              else m.seq = { pas: SEQ[g.seq](g.vue === 'cote' ? 'cote' : g.vue), k: 0, t: 0, coup: g.coup };
            } else if (m.ici === 'cuisine') {
              m.seq = { pas: SEQ.cuisine(), k: 0, t: 0, coup: null };
            } else {
              m.attente -= dt;
              if (m.attente <= 0) {
                m.attente = rand(3, 8);
                if (m.act === 'joue') this.habJouer(e, m);
                else if (m.act === 'travail') this.habTravailler(e, m);
                else if (m.act === 'maison' || m.act === 'repas' || m.act === 'soir') { if (m.ici === 'dedans' && Math.random() < 0.4) this.habCommencer(e, m, m.act); }
              }
            }
          }
          const marche = !parle && !m.saut && this.habAvancer(m, dt, joueur);
          if (m.fade > 0) { m.alpha = Math.min(1, m.alpha + dt / FADE_S); if (m.alpha >= 1) m.fade = 0; }
          if (calme) m.alpha = 1;
          // le geste : pas à pas ; au coup, il compte
          let image = null;
          if (m.seq && !parle) {
            const sq = m.seq, pasG = sq.pas[sq.k];
            image = pasG[0];
            sq.t += dt;
            if (calme || sq.t >= pasG[1]) {
              sq.t = 0;
              if (pasG[2] === 'coup' && sq.coup) this.habCoup(e, m, sq.coup);
              sq.k++;
              if (m.seq === sq && sq.k >= sq.pas.length) {
                m.seq = null;
                // (le bûcheron, le berger, le cueilleur, le jardinier : un autre geste, ailleurs, de temps en temps)
                const bouge = m.act === 'travail' && (m.def.metier === 'berger' || m.def.metier === 'cueilleur' || !m.def.metier || m.repli) && Math.random() < 0.35;
                const coupe = m.act === 'travail' && m.def.metier === 'bucheron' && now >= m.prochaineCoupe && Math.random() < 0.5;
                if (bouge || coupe) { m.geste = null; this.habTravailler(e, m); } else if (m.geste) m.repit = rand(0.2, 1.2);
              }
            }
          }
          // l'image
          const s = m.s, dedans = m.x > vue.x - VU && m.x < vue.right + VU && m.y > vue.y - VU && m.y < vue.bottom + VU + 32;
          s.setVisible(dedans && m.alpha > 0);
          if (m.drap) m.drap.setVisible(!!m.couche && dedans);
          if (!dedans) {
            if (m.gain && m.gain.visible()) m.gain.place(null);
            if (m.bulle) { m.bulle.el.remove(); m.bulle = null; m.parle = null; }
            continue;
          }
          this.habNombre++;
          let nom;
          if (m.couche) nom = `dort_bas_${Math.floor(now / 1600) % 2}`;
          else if (image) nom = image;
          else if (marche) nom = `marche_${m.face}_${Math.floor(m.marche / PAS) % 4}`;
          else nom = `idle_${m.face}_${Math.floor((now + m.rang * 300) / 600) % 2}`;
          s.setFrame(C(nom)).setPosition(Math.round(m.x), Math.round(m.y)).setFlipX(m.flip).setAlpha(m.alpha);
          s.setDepth(m.couche ? m.couche.depth + 0.1 : m.y);
          // les bulles : « +x » et la parole
          if (f && m.gain && m.gain.visible()) m.gain.place((m.x - f.left) * f.k, (m.y - K.BULLE.dessus - f.top) * f.k);
          if (f && m.bulle) {
            const b = m.bulle;
            if (!b.w) { b.w = b.el.offsetWidth; b.h = b.el.offsetHeight; }
            b.el.style.transform = `translate(${Math.round((m.x - f.left) * f.k - b.w / 2)}px,${Math.round((m.y - 30 - f.top) * f.k - b.h)}px)`;
          }
        }
        if (G.moutons.length) this.stepMoutons(e, dt, vue);
      }
    },

    // Au premier pas : là où l'heure le veut (au lit, au travail, sur la place, dedans), sans marcher.
    habPlacer(e, m) {
      const voulu = this.habitantVoulu(m);
      m.alpha = 1;
      if (voulu === 'dort') {
        const L = this.litDe(m);
        m.act = 'dort';
        if (L) { this.habCoucher(m, L); return; }
      }
      const q = voulu === 'joue' ? this.auHasard(e.plan.place.cases) : voulu === 'travail' ? null : this.auHasard(m.maison.dedans);
      const p = q || this.pied(m.maison.devant);
      m.x = p.x; m.y = p.y;
      if (voulu !== 'dort') this.habCommencer(e, m, voulu);
      // (il y saute : pas de chemin depuis la porte)
      if (m.demande) { m.x = m.demande.x; m.y = m.demande.y; const f = m.demande.puis; m.demande = null; if (f) f(); }
    },

    /* ---------- les moutons du berger ---------- */

    faireMoutons(e) {
      const cases = this.enclosDe(e);
      if (!cases.length || !this.textures.exists('mouton')) return;
      const n = Math.min(2, cases.length);
      for (let k = 0; k < n; k++) {
        const p = this.pied(cases[(k * 2) % cases.length]);
        const s = this.add.sprite(p.x, p.y + 2, 'mouton', 0).setOrigin(0.5, 1).setDepth(p.y + 2);
        e.gens.moutons.push({ s, x: p.x, y: p.y + 2, but: null, attente: rand(1, 6), t: rand(0, 2) });
      }
    },

    stepMoutons(e, dt, vue) {
      const nuit = !!(this.ctx.lastModel && this.ctx.lastModel.nuit), calme = reducedMotion(), cases = this.enclosDe(e), now = performance.now();
      for (const b of e.gens.moutons) {
        const vu = b.x > vue.x - VU && b.x < vue.right + VU && b.y > vue.y - VU && b.y < vue.bottom + VU;
        b.s.setVisible(vu);
        if (!vu) continue;
        if (nuit) { b.s.setFrame(6 + (Math.floor(now / 2400) % 2 ? 1 : 0)); continue; }
        if (b.but && !calme) {
          const dx = b.but.x - b.x, dy = b.but.y - b.y, l = Math.hypot(dx, dy), st = 6 * dt;
          if (l <= st) { b.x = b.but.x; b.y = b.but.y; b.but = null; } else { b.x += (dx / l) * st; b.y += (dy / l) * st; }
          if (Math.abs(dx) > 0.5) b.s.setFlipX(dx < 0);
          b.s.setFrame(2 + (Math.floor(now / 250) % 2)).setPosition(Math.round(b.x), Math.round(b.y)).setDepth(b.y);
          continue;
        }
        b.attente -= dt;
        if (b.attente <= 0) {
          b.attente = rand(3, 8);
          const p = this.pied(cases[Math.floor(Math.random() * cases.length)]);
          b.but = { x: p.x + rand(-4, 4), y: p.y + 2 };
        }
        b.s.setFrame(calme ? 0 : 4 + (Math.floor(now / 500) % 2));
      }
    },

    /* ---------- l'appui, la parole ---------- */

    // L'habitant sous le doigt en (wx, wy) (le plus en avant), ou null : { e, m }.
    habitantAt(wx, wy) {
      let best = null;
      for (const e of (this.hameauxVus || new Map()).values()) {
        if (!e.gens) continue;
        for (const m of e.gens.membres.values()) {
          if (!m.s || !m.s.visible) continue;
          const l = m.def.enfant ? BOITE.l - 1 : BOITE.l, h = m.def.enfant ? BOITE.h - 6 : BOITE.h;
          if (Math.abs(wx - m.x) > l || wy > m.y + BOITE.bas || wy < m.y - h) continue;
          if (!best || m.s.depth > best.m.s.depth) best = { e, m };
        }
      }
      return best;
    },

    // Il s'arrête, se tourne vers le personnage ; sa bulle : son prénom, son métier, une phrase.
    habitantParle(h) {
      const { e, m } = h, B = this.ctx.bridge;
      const r = B && B.habitantParle ? B.habitantParle({ hameau: e.plan.id, id: m.id, activite: this.habitantFait(m), n: m.n++ }) : null;
      if (!r || !this.ctx.labelLayer) return;
      if (!m.bulle) {
        const el = document.createElement('div');
        el.className = 'habitant-bulle';
        el.setAttribute('role', 'status');
        this.ctx.labelLayer.appendChild(el);
        m.bulle = { el, w: 0, h: 0 };
      }
      const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      m.bulle.el.innerHTML = `<strong>${esc(r.prenom)}</strong><span class="habitant-bulle-metier">${esc(r.metier)}</span><span class="habitant-bulle-texte">${esc(r.texte)}</span>`;
      m.bulle.w = 0;
      m.parle = { until: performance.now() + PAROLE_MS };
    },

    // (les mesures, les essais : où est chacun)
    habitantsInfo() {
      const out = [];
      for (const e of (this.hameauxVus || new Map()).values()) {
        if (!e.gens) continue;
        for (const m of e.gens.membres.values()) out.push({ hameau: e.plan.id, id: m.id, enfant: !!m.def.enfant, metier: m.def.metier, act: m.act, fait: this.habitantFait(m), lit: !!m.couche, arbre: m.arbre ? m.arbre.id : null, x: Math.round(m.x), y: Math.round(m.y), visible: !!(m.s && m.s.visible), geste: m.seq ? m.seq.pas[m.seq.k][0] : null });
      }
      return out;
    },
  });
})(window);
