/* carte/ferme/villageois.js — la scène de la ferme : les villageois (le chantier « l'île à bâtir », fiches I3a et
 * I3b).
 *
 * Le moteur tient les villageois (js/engine/villageois.js) et leur journée (js/engine/villageois-journee.js : où est
 * chacun à chaque heure, et ce qu'il y fait) ; le modèle de la carte en donne ce qu'il faut (modèle.villageois :
 * [{ id, prenom, genre, perso, apparence, accueil ('en_route' : il arrive ; null : il est chez lui), porte (une case
 * d'une porte de sa maison, ou null), lit (son couchage, ou null), piece (une case de sa maison), depart (la case
 * d'où il arrive), toc, phrase, journee ([{ de, a, etat, lieu: { genre, case, table? } }] : de 0 à 24 h) }], ou
 * null le chantier éteint ; modèle.villageoisHeure : { h, t, s, nuit, chemins, vitesse, chemin } : l'heure du jeu,
 * avancée ici entre deux modèles, les chemins posés et deux réglages de VILLAGE.HORAIRE).
 *
 * L'arrivée (fiche I3a), comme la visite de bienvenue (visite.js) : en route, il paraît du côté du port et marche
 * jusqu'à sa porte, frappe (« Toc, toc ! »), dit sa ligne (la page l'apprend : ctx.bridge.villageois('accueilli',
 * id)) et entre chez lui ; il s'y installe un moment (INSTALLE s), puis sa journée commence.
 *
 * La journée (fiche I3b), sur le socle des comportements (js/carte/comportement.js, CarteKit.machine) : un état par
 * état de la fiche (lever, dehors, repas, flaner, rentrer, dormir, repos, abri) ; une transition, revue quatre fois
 * par seconde, le fait passer au segment de sa journée que dit l'heure (villageoisCommence : où aller, ce qu'il y
 * fera) ; l'état dit sa posture une fois arrivé (couché dans son lit, assis sur un siège à table ou sur un banc, et
 * il y mange au repas ; debout chez lui, sur la place, sur un chemin, où il regarde autour de lui). Il marche par
 * les cases libres (fermier.path : les murs fermés, les portes ouvertes à son passage, portes.js), de préférence par
 * les chemins posés (HORAIRE.CHEMIN : le prix d'un pas hors d'eux), contourne le personnage, la famille, les autres
 * villageois et les bêtes de la ferme (la grille de l'image, CarteKit.perception, et le pas des habitants :
 * habitants.js habAvancer). Les recherches de chemin attendent leur tour (TRAJETS par image). Un trajet impossible :
 * hors de la vue, il y est d'un coup ; dans la vue, il renonce et flâne où il est jusqu'au segment suivant.
 *
 * Loin de la vue (LOIN px au-delà), aucun trajet ni image : il est posé où son horaire le veut (le principe de la
 * calèche : la position se déduit de l'heure). Un appui sur lui (villageoisAt, appelé par hitAt) : il s'arrête, se
 * tourne vers le personnage, et sa bulle dit son prénom, le salut de l'heure, ce qu'il fait et son humeur
 * (ctx.bridge.villageois('parle', id, { activite, n }) : paroleVillageois), avec un bouton pour sa fiche. La nuit, il
 * dort dans son lit, sous la couverture (comme la famille : bedSpotOf) ; on l'y voit quand le toit de sa maison se
 * lève ; ses fenêtres s'éclairent le soir tant qu'il est chez lui, éveillé (villageoisLumiere, fenetres.js).
 * Avec « animations réduites », il va d'un point à l'autre sans marcher.
 *
 * I3b+ (la vie sociale, villageois-social.js) : un segment peut avoir un but (seg.but : une visite, un rendez-vous,
 * une promenade à deux, puiser de l'eau, voir le jardin, les bêtes, un ouvrage) et un lieu « devant » (tourné vers ce
 * qu'il vient voir) ou « groupe » (une place d'un petit cercle) ; villageoisCommence, villageoisArrive et
 * villageoisVit passent la main à la vie sociale (villageoisDebutBut, villageoisAuBut, villageoisSocialPas), et
 * stepVillageois finit par villageoisSocial (causeries, croisements, saluts).
 *
 * I3c (les tâches, villageois-travail.js) : l'état « travail » ; à son poste, il fait le geste de sa tâche
 * (villageoisAuTravail, villageoisGesteImage) ; une action du moteur vue, son emoji (villageoisTravailPas).
 *
 * I6c (les traits, js/engine/traits.js) : une fois par seconde, la page apprend qui est dans la vue
 * (ctx.bridge.villageois('vus', null, { ids })) : ce qu'on le voit faire (le matinal dehors avant les autres)
 * révèle ses traits ; aucune animation nouvelle. Le bavard s'attarde quand il salue (villageois-social.js).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T } = F.C;
  const { reducedMotion } = F;
  const VITESSE = K.VITESSES.famille.adulte;   // px/s
  const FADE_S = 0.5;
  const LOIN = 320;                            // px hors de la vue : il saute au but, sans trajet ni image
  const VU = 48;                               // px hors de la vue : son image n'est pas dessinée
  const TOC_MS = 2600;                         // la bulle « Toc, toc ! »
  const PAROLE_MS = 6500;                      // sa ligne, sa bulle quand on le touche
  const INSTALLE_S = 12;                       // s : il s'installe chez lui avant de commencer sa journée
  const TRAJETS = { n: 2, ms: 4 };             // recherches de chemin par image : au plus n, ou ms
  const REGARD = [3, 8];                       // s entre deux coups d'œil, debout dehors
  const DEPART = [0, 1, 2, 3, 4, 6, 8];        // cases autour de sa case de départ (la première libre et reliée)
  const BOITE = { l: 8, h: 30, bas: 3 };       // l'appui sur lui, autour de ses pieds
  const DEHORS = new Set(['dehors', 'flaner']);
  const JOIE = { reaction: 'joie' };              // (I3b+ : il sourit quand il salue)
  const EMOTION_MS = 2600;                        // (I6a : une réaction, un cadeau, le temps qu'elle dure)
  const VUS_MS = 1000;                            // (I6c : la page apprend qui est dans la vue, une fois par seconde)

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // (le hasard à graine de chacun : son id ; les mêmes coups d'œil pour le même villageois)
  const entre = (h, a, b) => a + h() * (b - a);

  /* ---------- la machine : un état par état de la fiche ---------- */

  // Chaque état : marcher jusqu'à son lieu, puis sa posture ; debout dehors, il regarde autour de lui de temps en
  // temps. Les états ne diffèrent que par la posture, que villageoisArrive pose à l'arrivée (villageoisBut la choisit).
  const vivre = { pas(m, dt, c) { c.scene.villageoisVit(m, dt, c); } };
  const ETATS = { lever: vivre, dehors: vivre, repas: vivre, flaner: vivre, rentrer: vivre, dormir: vivre, repos: vivre, abri: vivre, recoit: vivre, travail: vivre };
  const VIE = K.machine(ETATS, [
    // l'heure a tourné : le segment suivant de sa journée (pas pendant qu'il parle)
    { si: (m, c) => !!c.seg && c.seg !== m.seg && !m.parle, fait: (m, c) => c.scene.villageoisCommence(m, c.seg, c) },
  ], { cadence: 0.25 });

  F.partie({

    // L'heure du jeu (0 à 24), avancée depuis le dernier modèle (au plus d'un quart d'heure).
    villageoisHeure() {
      const Hh = this.ctx.lastModel && this.ctx.lastModel.villageoisHeure;
      if (!Hh) return null;
      const h = Hh.h + Math.min(0.25, Math.max(0, (performance.now() - Hh.t) / 1000 / (Hh.s || 30)));
      return h >= 24 ? h - 24 : h;
    },

    // À chaque image : ceux qui arrivent (le chemin du port à la porte), puis la journée de chacun.
    stepVillageois(dt) {
      const md = this.ctx.lastModel, L = (md && md.villageois) || [];
      if (!this.villageoisVus) this.villageoisVus = new Map();
      const vus = this.villageoisVus, ids = new Set();
      const C = this.casesPerso ? this.casesPerso() : null;
      const heure = this.villageoisHeure();
      const vue = this.cameras.main.worldView, joueur = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      const c = this.villageoisCtx || (this.villageoisCtx = { scene: this, seg: null, vue: null, joueur: null, P: null, heure: 0, trajets: 0, t0: 0, now: 0, C: null });
      c.vue = vue; c.joueur = joueur; c.heure = heure; c.trajets = 0; c.now = c.t0 = performance.now(); c.C = C;
      c.P = this.villageoisGrille(dt, vue);
      for (const v of L) {
        ids.add(v.id);
        let m = vus.get(v.id);
        // (accueilli : la page le sait, le modèle suivra ; il ne revient pas du port)
        const arrive = v.accueil === 'en_route' && !md.nuit && !(this.villageoisAccueillis && this.villageoisAccueillis.has(v.id));
        if (!m) { m = this.nouveauVillageois(v, arrive); if (!m) continue; vus.set(v.id, m); }
        m.v = v;
        if (!C || !this.textures.exists(m.key)) continue;
        if (!m.s) { m.s = this.add.sprite(0, 0, m.key, C('idle_bas_0')).setOrigin(0.5, 1).setVisible(false); m.s.personnage = true; }
        if (m.phase !== 'vie') {
          if (m.phase === 'fini') { if (c.now >= m.installe) { m.phase = 'vie'; m.seg = null; } continue; }
          this.villageoisMarche(m, dt, C);
          continue;
        }
        // la journée : le segment de l'heure, la machine, l'image (sa marche : HORAIRE.VITESSE fois celle d'un adulte)
        // (I6a : invité à un repas, il est à table ; invites.js le montre, puis lui rend sa journée)
        if (m.invite) {
          m.s.setVisible(false);
          if (m.bulle) this.villageoisBulleOff(m);
          if (m.emoji && this.emojiOff) this.emojiOff(m);
          continue;
        }
        m.vite = (md.villageoisHeure && Number(md.villageoisHeure.vitesse)) || 1;
        const J = v.journee;
        c.seg = J && heure !== null ? J.find((s) => heure >= s.de && heure < s.a) || J[J.length - 1] : null;
        VIE.pas(m, dt, c);
        this.villageoisImage(m, dt, c);
      }
      for (const id of [...vus.keys()]) if (!ids.has(id)) this.villageoisFin(id);
      // (I6c : une fois par seconde, la page apprend qui est dans la vue : ce qu'on le voit faire révèle ses traits)
      if (c.now >= (this.villageoisVusT || 0)) {
        this.villageoisVusT = c.now + VUS_MS;
        const B = this.ctx.bridge, l = [];
        for (const m of vus.values()) if (m.phase === 'vie' && !m.invite && m.x > vue.x && m.x < vue.right && m.y > vue.y && m.y < vue.bottom) l.push(m.id);
        if (l.length && B && B.villageois) B.villageois('vus', null, { ids: l });
      }
      // (I3c : une action du moteur vue, son emoji ; villageois-travail.js)
      if (this.villageoisTravailPas) this.villageoisTravailPas();
      // (I3b+ : la vie sociale, dans la vue : causeries, croisements, saluts ; villageois-social.js)
      if (this.villageoisSocial) this.villageoisSocial(c);
    },

    // La grille de l'image (le socle, CarteKit.perception) : les villageois debout, la famille, les bêtes de la ferme
    // dehors, près de la vue ; le personnage est à part (habAvancer le contourne du côté le plus loin de lui).
    villageoisGrille(dt, vue) {
      const P = this.villageoisP || (this.villageoisP = K.perception(64));
      P.vide();
      const M = 64, dans = (x, y) => x > vue.x - M && x < vue.right + M && y > vue.y - M && y < vue.bottom + M;
      for (const m of (this.villageoisVus || new Map()).values()) if (m.phase === 'vie' && !m.couche && !m.assis && m.alpha > 0 && dans(m.x, m.y)) P.ajoute(m.x, m.y, 'villageois', m, dt);
      if (this.family && this.family.info) for (const f of this.family.info()) if (f.visible && !f.lit && !f.assis && dans(f.x, f.y)) P.ajoute(f.x, f.y, 'famille', 'f:' + f.id, dt);
      if (this.beasts) for (const e of this.beasts.values()) if (e.lieu === 'enclos' && e.img && e.img.alpha > 0.5 && dans(e.x, e.y)) P.ajoute(e.x, e.y, 'bete', e, dt);
      return P;
    },

    // Le villageois du modèle `v` : sa planche, où il paraît. En route (`arrive`) : son chemin du port à sa porte ;
    // sinon, sa journée commence là où l'heure le veut.
    nouveauVillageois(v, arrive) {
      // (fiche I6b : l'enfant d'un foyer a la planche d'un enfant)
      const d = { perso: v.perso, enfant: !!v.enfant, apparence: v.apparence || null };
      const key = this.clePerso ? this.clePerso(d) : 'perso_' + v.perso;
      if (this.chargePerso) this.chargePerso(key, d);
      const h = K.hasard(K.graine('villageois:' + v.id));
      const m = {
        id: v.id, v, key, s: null, drap: null, bulle: null, x: 0, y: 0, face: 'bas', flip: false, marche: 0, alpha: 0, fade: 1,
        phase: 'vie', chemin: [], until: 0, installe: 0, h, def: { enfant: !!v.enfant, genre: v.genre }, vite: 1,
        etat: 'repos', seg: null, but: null, demande: null, puis: null, pause: 0, evite: 0, gene: 0, couche: null, assis: null,
        regard: entre(h, REGARD[0], REGARD[1]), dec: Math.floor(entre(h, 0, 1400)), parle: null, n: 0, renonce: false, saut: null, premier: true,
      };
      if (!arrive) return m;
      m.phase = 'debut';
      const porte = Number.isInteger(v.porte) && this.frontDoor ? this.frontDoor(v.porte) : null;
      if (!porte || !this.fermier) {
        // (pas de porte où aller : il est chez lui d'un coup)
        this.villageoisAccueilli(v.id);
        m.phase = 'vie';
        return m;
      }
      const dep = this.villageoisDepart(v, porte);
      Object.assign(m, { porte, x: dep.x, y: dep.y, aller: dep.chemin });
      return m;
    },

    // D'où il vient : une case libre au plus près de sa case de départ (le port), d'où un chemin mène à sa porte
    // (sans traverser de mur) ; sinon, juste devant la porte. → { x, y, chemin }.
    villageoisDepart(v, porte) {
      const W = this.grid.cols, fm = this.fermier;
      if (Number.isInteger(v.depart)) {
        const x0 = (v.depart % W) * T + T / 2, y0 = Math.floor(v.depart / W) * T + T / 2;
        const ang = Math.atan2(porte.y - y0, porte.x - x0);
        for (const n of DEPART) {
          const q = fm.librePres ? fm.librePres(x0 + Math.cos(ang) * n * T, y0 + Math.sin(ang) * n * T) : null;
          // (sous le brouillard du monde, il en sort : le port n'est pas forcément exploré)
          if (!q) continue;
          const p = fm.path(q.x, q.y, porte.x, porte.y, {});
          if (p && p.length && !p.droit) return { x: q.x, y: q.y, chemin: p.slice() };
        }
      }
      return { x: porte.x, y: porte.y, chemin: [] };
    },

    /* ---------- l'arrivée (fiche I3a) ---------- */

    // Un pas de son arrivée : il marche, frappe, dit sa ligne, entre (puis s'installe : sa journée commence).
    villageoisMarche(m, dt, C) {
      const vue = this.cameras.main.worldView, now = performance.now(), calme = reducedMotion();
      const loin = (q) => q.x < vue.x - LOIN || q.x > vue.right + LOIN || q.y < vue.y - LOIN || q.y > vue.bottom + LOIN;
      if (m.phase === 'debut') {
        m.phase = 'vient';
        if (calme || (loin(m) && loin(m.porte))) { m.x = m.porte.x; m.y = m.porte.y; m.chemin = []; } else m.chemin = m.aller.slice();
        m.fade = 1;
      }
      let marche = false;
      if (m.chemin.length) {
        if (calme || (loin(m) && loin(m.chemin[m.chemin.length - 1]))) {
          const b = m.chemin[m.chemin.length - 1];
          m.x = b.x; m.y = b.y; m.chemin = [];
        } else {
          const to = m.chemin[0], dx = to.x - m.x, dy = to.y - m.y, l = Math.hypot(dx, dy), st = VITESSE * dt;
          ({ face: m.face, flip: m.flip } = (m.allure || (m.allure = K.allure())).pas(dx, dy, Math.min(l, st), m));
          if (l <= st) { m.x = to.x; m.y = to.y; m.chemin.shift(); } else { m.x += (dx / l) * st; m.y += (dy / l) * st; }
          m.marche += Math.min(l, st);
          marche = true;
        }
      }
      if (!marche) m.marche = 0;
      if (m.phase === 'vient' && !m.chemin.length) {
        // à sa porte : il frappe, tourné vers elle
        m.phase = 'porte';
        m.until = now + TOC_MS;
        this.villageoisRegardePorte(m);
        this.villageoisBulle(m, `<span class="habitant-bulle-texte">${esc(m.v.toc)}</span>`, TOC_MS);
      } else if (m.phase === 'porte' && now >= m.until) {
        // sa ligne (son prénom, ce qu'il dit) ; la page l'apprend : la notification
        m.phase = 'parle';
        m.until = now + PAROLE_MS;
        const joueur = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
        if (joueur) ({ face: m.face, flip: m.flip } = K.regard(joueur.x - m.x, joueur.y - m.y));
        this.villageoisBulle(m, `<strong>${esc(m.v.prenom)}</strong><span class="habitant-bulle-texte">${esc(m.v.phrase)}</span>`, PAROLE_MS);
        this.villageoisAccueilli(m.id);
      } else if (m.phase === 'parle' && now >= m.until) {
        // il entre chez lui : il s'efface sur sa porte
        m.phase = 'entre';
        this.villageoisRegardePorte(m);
      }
      if (m.phase === 'entre') {
        m.alpha = calme ? 0 : Math.max(0, m.alpha - dt / FADE_S);
        if (m.alpha <= 0) {
          // (chez lui : il s'installe un moment, puis sa journée commence, de là où il est)
          m.phase = 'fini'; m.installe = now + INSTALLE_S * 1000; m.premier = false; m.fade = 1;
          if (m.s) m.s.setVisible(false);
          this.villageoisBulleOff(m);
          return;
        }
      } else if (m.fade > 0) {
        m.alpha = Math.min(1, m.alpha + dt / FADE_S);
        if (m.alpha >= 1 || calme) { m.alpha = 1; m.fade = 0; }
      }
      const s = m.s, dedans = m.x > vue.x - VU && m.x < vue.right + VU && m.y > vue.y - VU && m.y < vue.bottom + VU + 32;
      s.setVisible(dedans && m.alpha > 0);
      if (!dedans) { if (m.bulle) this.villageoisBulleOff(m); return; }
      const nom = marche ? `marche_${m.face}_${K.imageMarche(m.marche)}` : `idle_${m.face}_${Math.floor(now / 600) % 2}`;
      s.setFrame(C(nom)).setPosition(Math.round(m.x), Math.round(m.y)).setFlipX(m.flip).setAlpha(m.alpha).setAngle(0).setDepth(m.y);
      if (global.CarteVisages) global.CarteVisages.suivre(this, s);
      this.villageoisBullePlace(m);
    },

    /* ---------- la journée (fiche I3b) ---------- */

    // Hors de la vue (de plus de LOIN px) ?
    villageoisLoin(q, vue) {
      return q.x < vue.x - LOIN || q.x > vue.right + LOIN || q.y < vue.y - LOIN || q.y > vue.bottom + LOIN;
    },

    // Les pieds au milieu de la case `t` (un peu décalés, tirés de son hasard : deux villageois sur deux cases
    // voisines ne sont pas alignés au pixel).
    villageoisPied(t, m) {
      const W = this.grid.cols;
      return { x: (t % W) * T + T / 2 + Math.round(entre(m.h, -3, 3)), y: (Math.floor(t / W) + 1) * T - 2 };
    },

    // Le but du lieu `lieu` : { x, y (où il marche), pose (sa posture une fois là : { genre: 'lit', L } ; { genre:
    // 'assis', q (sieges.js placeSiege) } ; { genre: 'debout', face?, flip? }) }, ou null (le lieu n'est plus sur la
    // carte).
    villageoisBut(m, lieu) {
      if (!lieu || !Number.isInteger(lieu.case)) return null;
      const libre = (p) => p && (!this.fermier || !this.fermier.standable || this.fermier.standable(p.x, p.y));
      if (lieu.genre === 'lit') {
        const L = this.bedSpotOf ? this.bedSpotOf(lieu.case) : null;
        if (!L) return null;
        // (il marche jusqu'à côté de son lit, puis s'y couche)
        const p = this.pres ? this.pres(lieu.case, 2) : null;
        return { x: p ? p.x : L.x, y: p ? p.y : L.y, pose: { genre: 'lit', L } };
      }
      if (lieu.genre === 'siege') {
        const e = this.blocks && this.blocks.get(lieu.case);
        const q = e && this.placeSiege ? this.placeSiege(e) : null;
        // (le siège pris : le personnage y est assis, ou un invité : debout à côté, tourné vers la table)
        const moi = this.fermier && this.fermier.assis ? this.fermier.assis() : null;
        const pris = (moi && moi.siege === lieu.case) || (this.siegePris && this.siegePris(lieu.case));
        if (q && !pris) return { x: q.pied.x, y: q.pied.y, pose: { genre: 'assis', q } };
        const p = q ? q.pied : this.pres ? this.pres(lieu.case, 2) : null;
        if (!p) return null;
        const W = this.grid.cols, t = Number.isInteger(lieu.table) ? lieu.table : lieu.case;
        const g = K.regard((t % W) * T + T / 2 - p.x, Math.floor(t / W) * T + T / 2 - p.y);
        return { x: p.x, y: p.y, pose: { genre: 'debout', face: g.face, flip: g.flip } };
      }
      const W = this.grid.cols, vers = Number.isInteger(lieu.vers) ? lieu.vers : null;
      // (I3b+ : devant ce qu'il vient voir, ou dans un petit cercle : au milieu de la case, un peu vers le centre)
      const vise = lieu.genre === 'devant' || lieu.genre === 'groupe';
      let p = vise ? { x: (lieu.case % W) * T + T / 2, y: (Math.floor(lieu.case / W) + 1) * T - 2 } : this.villageoisPied(lieu.case, m);
      if (lieu.genre === 'groupe' && vers !== null) {
        const q = { x: p.x + ((vers % W) * T + T / 2 - p.x) * 0.38, y: p.y + ((Math.floor(vers / W) + 1) * T - 2 - p.y) * 0.38 };
        if (libre(q)) p = q;
      }
      if (!libre(p)) p = this.pres ? this.pres(lieu.case, 2) : null;
      if (!p) return null;
      if (vers !== null) {
        const g = K.regard((vers % W) * T + T / 2 - p.x, (Math.floor(vers / W) + 1) * T - 2 - p.y);
        return { x: p.x, y: p.y, pose: { genre: 'debout', face: g.face, flip: g.flip } };
      }
      // (chez lui, sous la pluie, le soir : tourné vers nous ; dehors : où il regarde, au hasard)
      return { x: p.x, y: p.y, pose: { genre: 'debout', face: DEHORS.has(m.etat) && !vise ? null : 'bas', flip: false } };
    },

    // Le segment `seg` de sa journée commence : il quitte sa posture (il se lève, se relève), puis va à son lieu.
    // Loin de la vue (lui et son but), avec « animations réduites », ou au premier pas : il y est d'un coup.
    villageoisCommence(m, seg, c) {
      // (le même lieu pour le même état : une journée recalculée, minuit passé ; il ne bouge pas)
      const a = m.seg, l0 = a && a.lieu, l1 = seg.lieu;
      m.seg = seg;
      if (a && a.etat === seg.etat && l0 && l1 && l0.genre === l1.genre && l0.case === l1.case && !m.renonce) return;
      m.etat = seg.etat;
      m.renonce = false;
      const b = this.villageoisBut(m, seg.lieu);
      if (m.couche && !(b && b.pose.genre === 'lit' && b.pose.L === m.couche)) this.villageoisLeve(m);
      if (m.assis) this.villageoisRelever(m);
      m.chemin = []; m.puis = null; m.demande = null; m.suit = null; m.attend = null; m.auBut = false; m.toque = 0; m.geste = null; m.travail = null;
      if (!b) { m.but = null; return; }
      m.but = b;
      if (m.premier || reducedMotion() || (this.villageoisLoin(m, c.vue) && this.villageoisLoin(b, c.vue))) {
        m.premier = false;
        m.x = b.x; m.y = b.y; m.alpha = 1; m.fade = 0;
        this.villageoisArrive(m);
        return;
      }
      if (Math.hypot(b.x - m.x, b.y - m.y) < 2) { this.villageoisArrive(m); return; }
      m.demande = { x: b.x, y: b.y };
      // (I3b+ : l'hôte attend qu'on frappe, le meneur attend son ami, l'ami marche à son côté)
      if (this.villageoisDebutBut) this.villageoisDebutBut(m, seg, c);
    },

    // Le prix d'un pas vers la case `i` (fermier.path, info.cout) : 1 sur un chemin posé, HORAIRE.CHEMIN ailleurs.
    villageoisCout() {
      const Hh = this.ctx.lastModel && this.ctx.lastModel.villageoisHeure, k = (Hh && Number(Hh.chemin)) || 1;
      if (!Hh || !Hh.chemins || !Hh.chemins.length || k <= 1) return null;
      if (this.villageoisChemins !== Hh.chemins) {
        this.villageoisChemins = Hh.chemins;
        const S = new Set(Hh.chemins);
        this.villageoisCoutF = (i) => (S.has(i) ? 1 : k);
      }
      return this.villageoisCoutF;
    },

    // Sa recherche de chemin (son tour venu). Sans chemin : hors de la vue, il y est d'un coup ; dans la vue, il
    // renonce et flâne où il est (jusqu'au segment suivant).
    villageoisTrajet(m, c) {
      const d = m.demande;
      m.demande = null;
      if (!this.fermier || this.villageoisLoin(m, c.vue) && this.villageoisLoin(d, c.vue)) { m.x = d.x; m.y = d.y; this.villageoisArrive(m); return; }
      const info = { cout: this.villageoisCout() };
      const p = this.fermier.path(m.x, m.y, d.x, d.y, info);
      if (p && !p.length && !p.droit) { m.chemin = [{ x: d.x, y: d.y }]; m.puis = () => this.villageoisArrive(m); return; }
      if (!p || !p.length || p.droit) {
        const vu = !this.villageoisLoin(m, c.vue) && m.s && m.s.visible;
        if (!vu) { m.x = d.x; m.y = d.y; this.villageoisArrive(m); return; }
        m.renonce = true;
        m.but = null;
        return;
      }
      m.chemin = p.slice();
      m.puis = () => this.villageoisArrive(m);
    },

    // Arrivé : sa posture (couché, assis, debout).
    villageoisArrive(m) {
      const b = m.but;
      m.chemin = []; m.puis = null;
      if (!b) return;
      const P = b.pose;
      if (P.genre === 'lit') { this.villageoisCouche(m, P.L); return; }
      if (P.genre === 'assis') {
        // (le siège pris entre-temps : debout à côté)
        const moi = this.fermier && this.fermier.assis ? this.fermier.assis() : null;
        if ((moi && moi.siege === P.q.siege) || (this.siegePris && this.siegePris(P.q.siege))) return;
        m.assis = P.q;
        m.x = P.q.x; m.y = P.q.y; m.face = P.q.face; m.flip = P.q.flip;
        return;
      }
      if (P.face) { m.face = P.face; m.flip = !!P.flip; }
      // (I3b+ : ce qu'il fait à son but : villageois-social.js)
      if (this.villageoisAuBut) this.villageoisAuBut(m);
    },

    // Il se relève de son siège : sur la case libre d'où il s'y est assis.
    villageoisRelever(m) {
      const q = m.assis;
      m.assis = null;
      if (q && q.pied) { m.x = q.pied.x; m.y = q.pied.y; }
    },

    // Un pas de sa journée (l'état de la machine) : sa recherche de chemin (à son tour), sa marche, ou, arrivé, ce
    // qu'il fait là (il regarde autour de lui).
    villageoisVit(m, dt, c) {
      m.marchait = false;
      if (m.parle) {
        if (c.now < m.parle.until) { const j = c.joueur; if (j && !m.couche && !m.assis) ({ face: m.face, flip: m.flip } = K.regard(j.x - m.x, j.y - m.y)); return; }
        m.parle = null;
        this.villageoisBulleOff(m);
      }
      // (I3b+ : il salue, il attend un ami, il marche à son côté : villageois-social.js)
      if (this.villageoisSocialPas && this.villageoisSocialPas(m, dt, c)) return;
      if (m.demande) {
        if (c.trajets < TRAJETS.n && (!c.trajets || performance.now() - c.t0 < TRAJETS.ms)) { c.trajets++; this.villageoisTrajet(m, c); }
        return;
      }
      if (m.chemin.length) {
        // (loin de la vue en marchant : il y est)
        if (reducedMotion() || (this.villageoisLoin(m, c.vue) && this.villageoisLoin(m.chemin[m.chemin.length - 1], c.vue))) {
          const b = m.chemin[m.chemin.length - 1];
          m.x = b.x; m.y = b.y;
          this.villageoisArrive(m);
          return;
        }
        m.marchait = this.habAvancer(m, dt, c.joueur, c.P);
        return;
      }
      if (m.puis) { const f = m.puis; m.puis = null; f(); return; }
      // sur place, debout dehors (ou qui a renoncé) : un coup d'œil de temps en temps
      if (!m.couche && !m.assis && (DEHORS.has(m.etat) || m.renonce) && !(m.seg && m.seg.but && !m.renonce)) {
        m.regard -= dt;
        if (m.regard <= 0) {
          m.regard = entre(m.h, REGARD[0], REGARD[1]);
          const r = m.h();
          ({ face: m.face, flip: m.flip } = r < 0.3 ? { face: 'bas', flip: false } : r < 0.6 ? { face: 'cote', flip: r < 0.45 } : K.regard(m.h() - 0.5, m.h() - 0.3));
        }
      }
    },

    // Son image : marche, assis (il mange au repas), couché, debout ; ni image ni visage loin de la vue.
    villageoisImage(m, dt, c) {
      const s = m.s, vue = c.vue, now = c.now;
      if (m.fade > 0) { m.alpha = Math.min(1, m.alpha + dt / FADE_S); if (m.alpha >= 1 || reducedMotion()) { m.alpha = 1; m.fade = 0; } }
      const dedans = m.x > vue.x - VU && m.x < vue.right + VU && m.y > vue.y - VU && m.y < vue.bottom + VU + 32;
      s.setVisible(dedans && m.alpha > 0);
      if (m.drap) m.drap.setVisible(!!m.couche && dedans);
      if (!dedans) { if (m.bulle) { this.villageoisBulleOff(m); m.parle = null; } return; }
      if (m.couche) { this.villageoisDort(m, c.C); this.villageoisBullePlace(m); return; }
      if (!m.marchait) m.marche = 0;
      let nom;
      if (m.marchait) nom = `marche_${m.face}_${K.imageMarche(m.marche)}`;
      else if (m.assis) nom = `assis_${m.face}_${m.etat === 'repas' && !m.parle ? Math.floor((now + m.dec) / 700) % 2 : 0}`;
      // (I3b+ : il puise au puits)
      else if (m.geste) nom = `ramasse_${[0, 1, 2, 2, 1, 0][Math.min(5, Math.floor(((now - m.geste.t0) / 1800) * 6))]}`;
      // (I3c : au travail, le geste de sa tâche ; villageois-travail.js)
      else if (m.travail && this.villageoisGesteImage && (nom = this.villageoisGesteImage(m, dt))) { /* le geste */ }
      else nom = `idle_${m.face}_${Math.floor((now + m.dec) / 600) % 2}`;
      s.setFrame(c.C(nom)).setPosition(Math.round(m.x), Math.round(m.y)).setFlipX(m.flip).setAlpha(m.alpha).setAngle(0).setDepth(m.assis ? m.assis.depth : m.y);
      // (un salut : il sourit ; I6a : une réaction, un cadeau, le temps qu'elle dure)
      if (m.reaction && now >= m.reaction.fin) m.reaction = null;
      if (global.CarteVisages) global.CarteVisages.suivre(this, s, m.salut ? JOIE : m.reaction || undefined);
      this.villageoisBullePlace(m);
    },

    // Il se couche dans son lit (L : bedSpotOf) : sous la couverture, comme la famille (famille-ferme.js, coucher).
    villageoisCouche(m, L) {
      if (!L || !m.s) return;
      this.villageoisBulleOff(m);
      m.couche = L;
      m.assis = null;
      m.x = L.x; m.y = L.y; m.face = 'bas'; m.flip = false; m.alpha = 1; m.fade = 0;
      m.s.setAngle(L.angle || 0).setAlpha(1).setFlipX(false).setPosition(Math.round(L.x), Math.round(L.y)).setDepth(L.depth + 0.1);
      if (!m.drap) m.drap = this.add.image(0, 0, L.drap.key, L.drap.frame).setOrigin(0.5, 1);
      m.drap.setTexture(L.drap.key, L.drap.frame).setPosition(L.drap.x, L.drap.y).setFlipX(!!L.drap.flip).setDepth(L.depth + 0.2);
      m.drap.personnage = true;
    },

    // Au lit : il respire (deux images d'attente), son visage suit.
    villageoisDort(m, C) {
      m.s.setFrame(C(`idle_bas_${Math.floor(performance.now() / 1400) % 2}`)).setPosition(Math.round(m.couche.x), Math.round(m.couche.y)).setAngle(m.couche.angle || 0).setDepth(m.couche.depth + 0.1).setAlpha(1);
      if (global.CarteVisages) global.CarteVisages.suivre(this, m.s);
    },

    // Le jour venu : il quitte le lit, debout à côté (une case libre près de lui).
    villageoisLeve(m) {
      if (m.s) m.s.setAngle(0);
      if (m.drap) m.drap.setVisible(false);
      m.couche = null;
      const p = this.libre && this.libre(m.x, m.y + 6) ? { x: m.x, y: m.y + 6 } : this.fermier && this.fermier.librePres ? this.fermier.librePres(m.x, m.y + 6) : null;
      if (p) { m.x = p.x; m.y = p.y; }
    },

    villageoisAccueilli(id) {
      (this.villageoisAccueillis || (this.villageoisAccueillis = new Set())).add(id);
      const B = this.ctx.bridge;
      if (B && B.villageois) B.villageois('accueilli', id);
    },

    // Tourné vers sa porte (la case de la porte), sinon de dos.
    villageoisRegardePorte(m) {
      const W = this.grid.cols, d = m.v && m.v.porte;
      if (Number.isInteger(d)) {
        const g = K.regard((d % W) * T + T / 2 - m.x, Math.floor(d / W) * T + T / 2 - m.y);
        m.face = g.face; m.flip = g.flip;
      } else { m.face = 'haut'; m.flip = false; }
    },

    /* ---------- parler ---------- */

    // Un appui sur lui : il s'arrête, se tourne vers le personnage ; sa bulle (le pont : paroleVillageois) dit son
    // prénom, le salut de l'heure, ce qu'il fait, son humeur, et un bouton ouvre sa fiche.
    villageoisParle(id) {
      const m = this.villageoisVus && this.villageoisVus.get(id), B = this.ctx.bridge;
      if (!m || !B || !B.villageois) return;
      const activite = m.phase !== 'vie' ? 'dehors' : m.couche ? 'dormir' : m.renonce ? 'flaner' : m.etat;
      const r = B.villageois('parle', id, { activite, n: m.n++, but: m.seg && m.seg.but ? m.seg.but.sorte : null });
      if (!r || !r.prenom) return;
      const humeur = r.humeurTexte ? `<span class="habitant-bulle-metier">${esc(r.humeurTexte)}</span>` : '';      const texte = [r.salut, r.texte].filter(Boolean).join(' ');
      // (I6a : l'amitié, comme chez les habitants : son palier, sa jauge, ce que la conversation a donné, « Offrir »)
      const A = r.amitie;
      const ami = A ? `<span class="habitant-bulle-ami"><span class="ami-coeur" aria-hidden="true">💛</span> ${esc(A.nom)}<span class="ami-jauge" role="img" aria-label="Amitié : ${A.pts} sur ${A.max}"><span style="width:${Math.round((A.pts * 100) / A.max)}%"></span></span>${A.gain > 0 ? `<span class="ami-gain">+${A.gain}</span>` : ''}</span>`
        + `<button type="button" class="habitant-bulle-offrir" data-action="ami-offrir-open" data-hameau="village" data-id="${esc(id)}">🎁 Offrir</button>` : '';
      this.villageoisBulle(m, `<strong>${esc(r.prenom)}</strong><span class="habitant-bulle-texte">${esc(texte)}</span>${humeur}${ami}`
        + `<button type="button" class="habitant-bulle-offrir" data-action="villageois-fiche" data-id="${esc(id)}">📋 Sa fiche</button>`, PAROLE_MS);
      // (sa joie de te voir, de te retrouver ; le présent qu'il te tend)
      if (r.present) this.villageoisEmotion(id, 'present');
      else if (r.emotion) this.villageoisEmotion(id, r.emotion);
      if (m.phase === 'vie' && !m.couche) m.parle = { until: performance.now() + PAROLE_MS };
      if (m.s && !m.couche && !m.assis) { const j = this.fermier && this.fermier.pos ? this.fermier.pos() : null; if (j) ({ face: m.face, flip: m.flip } = K.regard(j.x - m.x, j.y - m.y)); }
      // (sa voix : le babil des habitants, js/son.js)
      if (this.habitantBabil && !m.couche) this.habitantBabil(m, texte);
    },

    // I6a : une réaction du villageois `id` (un cadeau reçu, la joie de te voir, un présent qu'il te tend) : un emoji
    // au-dessus de sa tête, son visage (la joie, ou les yeux plissés du dégoût), le temps EMOTION_MS. → true s'il est là.
    villageoisEmotion(id, emotion) {
      const m = this.villageoisVus && this.villageoisVus.get(id);
      if (!m || !m.s || m.invite) return false;
      const E = { joie: ['😊', 'joie'], present: ['🎁', 'joie'], degout: ['🤢', 'degout'], tristesse: ['😔', 'tristesse'], surprise: ['😮', 'surprise'] }[emotion];
      if (!E) return false;
      if (this.villageoisEmoji) this.villageoisEmoji(m, E[0], EMOTION_MS);
      m.reaction = { reaction: E[1], fort: emotion !== 'degout', fin: performance.now() + EMOTION_MS };
      return true;
    },
    // I6a : il dit `texte` (sa réaction à un cadeau, un goût qu'il confie), tourné vers le personnage. → true s'il est là.
    villageoisDitParId(id, texte, ms = PAROLE_MS) {
      const m = this.villageoisVus && this.villageoisVus.get(id);
      if (!m || !m.s || m.invite || !texte) return false;
      const v = m.v || {};
      this.villageoisBulle(m, `<strong>${esc(v.prenom || '')}</strong><span class="habitant-bulle-texte">${esc(texte)}</span>`, ms);
      if (m.phase === 'vie' && !m.couche) m.parle = { until: performance.now() + ms };
      const j = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      if (j && !m.couche && !m.assis) ({ face: m.face, flip: m.flip } = K.regard(j.x - m.x, j.y - m.y));
      if (this.habitantBabil && !m.couche) this.habitantBabil(m, texte);
      return true;
    },

    villageoisBulle(m, html, ms) {
      if (!this.ctx.labelLayer) return;
      if (!m.bulle) {
        const el = document.createElement('div');
        el.className = 'habitant-bulle visite-bulle';
        el.setAttribute('role', 'status');
        this.ctx.labelLayer.appendChild(el);
        m.bulle = { el, w: 0, h: 0, until: 0 };
      }
      m.bulle.el.innerHTML = html;
      m.bulle.w = 0;
      m.bulle.until = performance.now() + ms;
    },

    // Sa bulle au-dessus de lui (dans l'écran : près d'un bord, elle se décale). Le cadre de l'écran et la largeur du
    // calque sont relevés une fois par image (villageoisCadre) ; la place n'est écrite que si elle change (I3b+ : les
    // bulles sont plus nombreuses, chaque lecture ou écriture de la page coûte).
    villageoisBullePlace(m) {
      const b = m.bulle;
      if (!b) return;
      if (performance.now() >= b.until) { this.villageoisBulleOff(m); return; }
      const F = this.villageoisCadre();
      if (!F) return;
      const f = F.f;
      if (!b.w) { b.w = b.el.offsetWidth; b.h = b.el.offsetHeight; }
      const x = Math.max(4, Math.min(F.Lw - b.w - 4, (m.x - f.left) * f.k - b.w / 2));
      const haut = m.couche ? 18 : m.assis ? 26 : (m.def && m.def.enfant) ? 22 : 30;
      // (près du haut de l'écran : elle reste dedans)
      let y = Math.max(4, (m.y - haut - f.top) * f.k - b.h);
      // (I6b : plusieurs qui parlent ensemble — un salut à trois, une causerie, une table — : les bulles ne se
      // recouvrent pas ; celle qui en chevauche une déjà placée cette image monte au-dessus, sinon passe dessous)
      const R = F.bulles;
      for (let k = 0; k < 4; k++) {
        const o = R.find((r) => x < r.x + r.w + 2 && x + b.w + 2 > r.x && y < r.y + r.h + 2 && y + b.h + 2 > r.y);
        if (!o) break;
        y = o.y - b.h - 3 >= 4 ? o.y - b.h - 3 : o.y + o.h + 3;
      }
      R.push({ x, y, w: b.w, h: b.h });
      const t = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
      if (t !== b.t) { b.t = t; b.el.style.transform = t; }
    },

    // Le cadre de l'écran (screenFrame) et la largeur du calque des étiquettes, relevés une fois par image : { f, Lw },
    // ou null.
    villageoisCadre() {
      const now = this.game && this.game.loop ? this.game.loop.frame : performance.now();
      const C = this.villageoisCadreMemo || (this.villageoisCadreMemo = { image: -1, f: null, Lw: Infinity, lu: -Infinity, bulles: [] });
      if (C.image !== now) {
        C.image = now;
        C.bulles = [];
        C.f = this.screenFrame ? this.screenFrame() : null;
        // (la largeur du calque : une fois par seconde, elle ne change qu'avec la fenêtre)
        const t = performance.now();
        if (t - C.lu > 1000) { C.lu = t; C.Lw = (this.ctx.labelLayer && this.ctx.labelLayer.clientWidth) || Infinity; }
      }
      return C.f ? C : null;
    },

    villageoisBulleOff(m) {
      if (m.bulle) { m.bulle.el.remove(); m.bulle = null; }
    },

    villageoisFin(id) {
      const m = this.villageoisVus && this.villageoisVus.get(id);
      if (!m) return;
      if (m.s) m.s.destroy();
      if (m.drap) m.drap.destroy();
      this.villageoisBulleOff(m);
      if (m.emoji && this.emojiOff) this.emojiOff(m);
      this.villageoisVus.delete(id);
    },

    // Le villageois sous le doigt en (wx, wy) : son id, ou null (le plus en avant). Au lit, dans sa maison : seulement
    // quand on le voit (le toit levé).
    villageoisAt(wx, wy) {
      if (!this.villageoisVus) return null;
      let best = null;
      for (const m of this.villageoisVus.values()) {
        if (!m.s || !m.s.visible || m.alpha <= 0) continue;
        const k = this.tileAtPoint ? this.tileAtPoint(m.x, m.y - 4) : -1;
        if ((this.toits || []).some((t) => t.dedans.has(k) && t.img.alpha > 0.5)) continue;
        if (Math.abs(wx - m.x) > BOITE.l || wy > m.y + BOITE.bas || wy < m.y - BOITE.h) continue;
        if (!best || m.s.depth > best.s.depth) best = m;
      }
      return best ? best.id : null;
    },

    // Fiche I3b : la lumière de la maison du toit `t` (fenetres.js) : null si ce n'est la maison d'aucun villageois ;
    // sinon true tant que l'un d'eux y est éveillé (le soir, chez lui), false quand ils dorment ou sont dehors.
    villageoisLumiere(t) {
      const L = this.ctx.lastModel && this.ctx.lastModel.villageois;
      if (!L || !L.length) return null;
      let a = null;
      for (const v of L) {
        if (!Number.isInteger(v.piece) || !t.dedans.has(v.piece)) continue;
        if (a === null) a = false;
        const m = this.villageoisVus && this.villageoisVus.get(v.id);
        if (m && m.phase === 'vie' && !m.couche && m.etat !== 'dormir' && m.but && m.but.pose && m.seg && m.seg.lieu
          && (m.seg.lieu.genre === 'maison' || m.seg.lieu.genre === 'abri' || (m.seg.lieu.genre === 'siege' && !m.seg.lieu.dehors))) a = true;
      }
      return a;
    },

    // (les essais : où ils sont, ce qu'ils font)
    villageoisInfo() {
      return [...(this.villageoisVus || new Map()).values()].map((m) => ({
        id: m.id, phase: m.phase, etat: m.etat, lieu: m.seg && m.seg.lieu ? m.seg.lieu.genre : null, x: Math.round(m.x), y: Math.round(m.y),
        visible: !!(m.s && m.s.visible), alpha: m.alpha, bulle: m.bulle ? m.bulle.el.textContent : null, chemin: m.chemin ? m.chemin.length : 0,
        lit: !!m.couche, assis: !!m.assis, renonce: !!m.renonce, demande: !!m.demande,
        but: m.seg && m.seg.but ? m.seg.but.sorte : null, role: m.seg && m.seg.but ? m.seg.but.role || null : null, cle: m.seg && m.seg.but ? m.seg.but.cle : null,
        auBut: !!m.auBut, salut: m.salut ? (m.salut.joueur ? 'joueur' : m.salut.o.id) : null, suit: m.suit ? m.suit.o.id : null, attend: !!m.attend,
        emoji: m.emoji ? m.emoji.el.textContent : null, face: m.face, travail: m.travail ? m.travail.geste : null,
        geste: m.travail && m.travail.seq ? m.travail.seq[Math.min(m.travail.k, m.travail.seq.length - 1)][0] : null,
      }));
    },
  });
})(window);
