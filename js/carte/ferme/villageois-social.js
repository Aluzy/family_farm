/* carte/ferme/villageois-social.js — la scène de la ferme : la vie sociale des villageois (le chantier « l'île à
 * bâtir », I3b+, après la fiche I3b ; la scène des villageois : villageois.js).
 *
 * Le moteur dit qui se connaît (js/engine/villageois-liens.js : connaissance) et donne à chaque sortie un but
 * (js/engine/villageois-journee.js : seg.but = { sorte, cle, avec, role, emoji }) ; le modèle de la carte en porte ce
 * qu'il faut (modèle.villageoisHeure.liens : { paires: { [a]: { [b]: degré } }, famille: { [a]: degré } }, 0 inconnu,
 * 1 connaissance, 2 ami ; modèle.villageoisHeure.social : VILLAGE.SOCIAL.CROISE). Ici, ce qu'on en voit, dans la vue
 * seulement (loin d'elle, rien ne s'anime : la position vient de l'heure) :
 *
 *   - au but d'une sortie (villageoisAuBut) : il est tourné vers ce qu'il est venu voir (le puits, une parcelle, une
 *     bête, un ouvrage) et le montre d'un emoji (💧 🌱 🐑 👀) ; au puits, il puise (le geste « ramasse ») ; à la porte
 *     d'un ami, il frappe (« Toc, toc ! ») ;
 *   - la visite : l'ami, chez lui, attend qu'on ait frappé (au plus quelques secondes), puis sort à côté de sa porte ;
 *   - la promenade à deux : le meneur attend son ami, puis ils marchent côte à côte (l'autre le suit, à son côté :
 *     villageoisSuivre) jusqu'au bout ;
 *   - les causeries (villageoisCauseries) : ceux qui ont le même but (la même `cle` : une visite, un rendez-vous sur
 *     la place ou au puits, la fin d'une promenade), arrivés, se font face (à trois, ils regardent qui parle) et
 *     échangent des répliques à tour de rôle (le pont : ctx.bridge.villageois('echange', id, { avec, n, sorte }) :
 *     echangeVillageois, tirées de la graine), une bulle d'émotion au début ;
 *   - se croiser (villageoisCroisements) : deux villageois qui se connaissent et passent à RAYON px s'arrêtent, se
 *     tournent l'un vers l'autre, montrent leur émotion et échangent deux répliques, l'une après l'autre (DUREE s) ;
 *     des amis font parfois un bout de chemin ensemble (ENSEMBLE, BOUT s) ; deux inconnus se font un signe de tête
 *     (SIGNE), sans un mot ; pas deux fois la même paire en ATTENTE s ;
 *   - debout, il tourne la tête vers un ami qui passe (REGARD px) ;
 *   - le personnage du joueur qui passe près d'un villageois qui le connaît (JOUEUR px) : il se tourne vers lui, le
 *     salue (un emoji, une bulle : SOCIAL.JOUEUR) ; une fois en JOUEUR_ATTENTE s. I6a : le salut suit l'amitié du
 *     joueur (le modèle : liens.amitie, le palier ; liens.present) : un ami proche salue de plus loin (JOUEUR_AMI) et
 *     plus chaleureusement ; celui qui garde un présent le donne en saluant (🎁, la page l'ajoute à l'inventaire).
 *   - I6b (les liens, js/engine/liens.js) : deux amis assis côte à côte sur deux bancs voisins (le but « banc »)
 *     causent comme à table ; la visite du soir (but.soir) et le repas apporté à un ami qui se repose (but.apporte :
 *     🍲) se jouent comme une visite (il frappe, l'ami sort), avec leurs répliques (« soiree », « apporte ») ; le
 *     degré monte à 3 (proche). Les bulles de ceux qui parlent ensemble ne se recouvrent plus (villageois.js,
 *     villageoisBullePlace).
 *
 * Les bulles sont celles des villageois (villageoisBulle) ; l'emoji, celui des habitants (amis.js, emojiHabitant) ;
 * le visage sourit le temps d'un salut (js/carte/visages.js, la réaction « joie »). Méthodes de la scène de la ferme
 * (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T } = F.C;
  const { reducedMotion } = F;
  const VITESSE = K.VITESSES.famille.adulte;   // px/s
  const TOC_MS = 1800;                         // « Toc, toc ! »
  const EMOJI_MS = 2200;                       // l'emoji d'un but, d'un salut
  const ACHAT_MS = 3200;                       // I4 : ce qu'il dit en arrivant à l'étal
  const PUISE_MS = 1800;                       // le geste au puits
  const BABIL = { px: 96, ms: 1500 };          // le babil : près du personnage, un à la fois
  const COTE = 12;                             // px : l'ami qui marche à côté
  const REPRISE_MS = 7000;                     // après un salut, il ne salue personne d'autre avant
  const SOCIAL_MS = 100;                       // les causeries et les croisements, revus tous les SOCIAL_MS
  const DEFAUT = { RAYON: 24, ATTENTE: 40, DUREE: [1.6, 2.5], SIGNE: 0.5, ENSEMBLE: 0.35, BOUT: 12, REGARD: 48, JOUEUR: 28, JOUEUR_ATTENTE: 60, TOUR: 3.2 };

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const paire = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  // (debout, libre de ses gestes : ni couché, ni assis, ni à parler au personnage)
  // (chez lui, arrivé : on ne le voit pas, sous son toit ; il ne salue personne)
  const CHEZ = new Set(['maison', 'abri', 'lit']);
  const dispo = (m) => m.phase === 'vie' && !m.couche && !m.assis && !m.parle && m.s && m.s.visible && m.alpha > 0.5
    && !(m.seg && m.seg.lieu && CHEZ.has(m.seg.lieu.genre) && !m.chemin.length && !m.demande);
  const marche = (m) => !!(m.chemin && m.chemin.length) || !!m.suit;

  F.partie({

    // Les réglages (VILLAGE.SOCIAL.CROISE, par le modèle) et le degré de deux villageois (b : 'famille').
    villageoisReglages() {
      const H = this.ctx.lastModel && this.ctx.lastModel.villageoisHeure;
      return (H && H.social) || DEFAUT;
    },
    // I6a : le palier d'amitié du joueur avec le villageois `a` (0 à 4), et s'il garde un présent pour lui.
    // I6c (les traits) : le facteur de ses traits sur la durée d'un salut et la cadence d'une causerie (1 : rien).
    villageoisCause(a) {
      const H = this.ctx.lastModel && this.ctx.lastModel.villageoisHeure, L = H && H.liens;
      const f = L && L.cause && Number(L.cause[a]);
      return f > 0 ? f : 1;
    },
    villageoisPalier(a) {
      const H = this.ctx.lastModel && this.ctx.lastModel.villageoisHeure, L = H && H.liens;
      return (L && L.amitie && L.amitie[a]) || 0;
    },
    villageoisPresent(a) {
      const H = this.ctx.lastModel && this.ctx.lastModel.villageoisHeure, L = H && H.liens;
      return !!(L && L.present && L.present[a]);
    },
    villageoisDegre(a, b) {
      const H = this.ctx.lastModel && this.ctx.lastModel.villageoisHeure, L = H && H.liens;
      if (!L) return 0;
      if (b === 'famille') return (L.famille && L.famille[a]) || 0;
      return (L.paires && L.paires[a] && L.paires[a][b]) || 0;
    },

    // Il dit `texte` (une bulle courte, `ms`) ; son babil près du personnage.
    villageoisDit(m, texte, ms, c) {
      // (I6a : il parle au personnage — sa bulle, un cadeau, un goût confié — : une causerie ne la recouvre pas)
      if (!texte || (m.parle && performance.now() < m.parle.until)) return;
      this.villageoisBulle(m, `<span class="habitant-bulle-texte">${esc(texte)}</span>`, ms);
      const j = c && c.joueur;
      const now = performance.now();
      if (j && this.habitantBabil && now >= (this.villageoisBabilT || 0) && Math.hypot(j.x - m.x, j.y - m.y) < BABIL.px) { this.villageoisBabilT = now + BABIL.ms; this.habitantBabil(m, texte); }
    },
    // Un emoji au-dessus de sa tête, `ms` (amis.js : emojiHabitant), et un sourire.
    villageoisEmoji(m, emoji, ms) {
      if (!emoji || !this.emojiHabitant) return;
      this.emojiHabitant(m, emoji);
      m.emojiFin = performance.now() + (ms || EMOJI_MS);
    },
    // (à chaque image : l'emoji suit sa tête, puis s'en va ; `f` : le cadre de l'écran)
    villageoisEmojiPlace(m, f, now) {
      if (!m.emoji) return;
      if (now >= (m.emojiFin || 0) || !m.s || !m.s.visible) { if (this.emojiOff) this.emojiOff(m); return; }
      if (!f) return;
      const b = m.emoji;
      // (sa taille suit le zoom : une tête de personnage, à peu près)
      // (sa taille connue, on ne la mesure pas : une mesure force la mise en page)
      const taille = Math.round(Math.max(16, Math.min(30, f.k * 8)));
      if (b.taille !== taille) { b.taille = taille; b.el.style.fontSize = taille + 'px'; }
      b.w = b.h = taille;
      const leve = reducedMotion() ? 0 : Math.min(1, (EMOJI_MS - (m.emojiFin - now)) / 300) * 3;
      // (au-dessus de sa tête ; une bulle de parole au-dessus de lui : à côté de sa tête, sous la bulle)
      const x = m.bulle ? (m.x + 8 - f.left) * f.k : (m.x - f.left) * f.k - b.w / 2;
      const y = m.bulle ? (m.y - (m.assis ? 22 : 26) - f.top) * f.k - b.h / 2 : (m.y - (m.assis ? 28 : 34) - leve - f.top) * f.k - b.h;
      const t = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
      if (t !== b.t) { b.t = t; b.el.style.transform = t; }
    },

    /* ---------- les buts ---------- */

    // Le segment `seg` commence (villageoisCommence, son but posé) : ce qui précède la marche. L'hôte d'une visite
    // attend qu'on ait frappé ; le meneur d'une promenade attend son ami ; l'ami qui suit marche à son côté.
    villageoisDebutBut(m, seg, c) {
      m.suit = null; m.attend = null; m.auBut = false; m.toque = 0; m.geste = null;
      const but = seg && seg.but;
      if (!but || !this.villageoisVus) return;
      const o = but.avec && but.avec.length ? this.villageoisVus.get(but.avec[0]) : null;
      if (!o || o.phase !== 'vie' || this.villageoisLoin(m, c.vue)) return;
      // (l'hôte attend chez lui, près de sa porte : s'il rentre de loin, il va droit à sa porte)
      if (but.role === 'hote' && o.s && o.s.visible && !o.toque && Math.hypot(m.but.x - m.x, m.but.y - m.y) < 4 * T) m.attend = { o, jusqua: c.now + 9000, quoi: 'toque' };
      else if (but.role === 'meneur' && o.s && o.s.visible && Math.hypot(o.x - m.x, o.y - m.y) > 40) m.attend = { o, jusqua: c.now + 7000, quoi: 'ami' };
      else if (but.role === 'suit' && !this.villageoisLoin(o, c.vue) && !reducedMotion()) {
        m.suit = { o, jusqua: c.now + 40000, cle: but.cle, cote: 0 };
        m.demande = null;
      }
    },

    // Arrivé à son but, debout (villageoisArrive) : ce qu'il y fait.
    villageoisAuBut(m) {
      const but = m.seg && m.seg.but;
      if (!but || m.auBut) return;
      m.auBut = true;
      // (I3c : à son poste de travail, il s'y met : villageois-travail.js)
      if (but.sorte === 'travail') { if (this.villageoisAuTravail) this.villageoisAuTravail(m); return; }
      if (!m.s || !m.s.visible) return;
      const now = performance.now();
      if (but.role === 'visiteur') {
        // (il frappe à la porte de son ami, tourné vers elle ; l'ami déjà dehors : il le salue)
        m.toque = now;
        this.villageoisDit(m, (m.v && m.v.toc) || 'Toc, toc !', TOC_MS);
        // (I6b : le repas qu'il apporte, 🍲 ; la visite du soir, 🌙)
        if (but.emoji) this.villageoisEmoji(m, but.emoji, EMOJI_MS + TOC_MS);
        return;
      }
      if (but.emoji && !(but.avec && but.avec.length)) this.villageoisEmoji(m, but.emoji, EMOJI_MS);
      // (I4 : à l'étal du joueur, ce qu'il vient y prendre ; le moteur fait l'achat, bourse.js)
      if (but.sorte === 'etal' && but.dit) this.villageoisDit(m, but.dit, ACHAT_MS);
      if (but.sorte === 'eau' && !reducedMotion()) m.geste = { fin: now + PUISE_MS, t0: now };
    },

    /* ---------- un pas : salut, attente, compagnie ---------- */

    // Ce qui passe avant sa marche (villageoisVit) : → true s'il ne marche pas cette image (il salue, il attend).
    villageoisSocialPas(m, dt, c) {
      const now = c.now;
      if (m.salut) {
        const S = m.salut;
        if (now < S.fin) {
          const o = S.joueur ? c.joueur : S.o;
          if (o && !m.assis) ({ face: m.face, flip: m.flip } = K.regard(o.x - m.x, o.y - m.y));
          // (sa réponse : la bulle de l'autre s'efface, chacun son tour)
          if (S.dit && now >= S.dit.t) { if (S.o && S.o.bulle) S.o.bulle.until = now; this.villageoisDit(m, S.dit.texte, S.dit.ms, c); S.dit = null; }
          m.marchait = false;
          return true;
        }
        m.salut = null;
      }
      if (m.attend) {
        const A = m.attend, o = A.o;
        const fini = now >= A.jusqua || !o || o.phase !== 'vie' || !o.s || !o.s.visible
          || (A.quoi === 'toque' ? !!o.toque : Math.hypot(o.x - m.x, o.y - m.y) < 26);
        if (!fini) {
          if (A.quoi === 'ami' && !m.couche && !m.assis) ({ face: m.face, flip: m.flip } = K.regard(o.x - m.x, o.y - m.y));
          m.marchait = false;
          return true;
        }
        m.attend = null;
      }
      if (m.suit) {
        // (un détour par un chemin : il le fait, puis reprend à son côté)
        if (m.suit.detour) {
          if (m.chemin.length || m.demande) return false;
          m.suit.detour = false; m.puis = null;
        }
        return this.villageoisSuivre(m, dt, c);
      }
      return false;
    },

    // Il marche au côté de `m.suit.o` (une promenade à deux, un bout de chemin après un salut) ; l'autre arrêté près
    // de lui, il s'arrête aussi (la promenade : c'est son but ; un bout de chemin : il reprend le sien). → true.
    villageoisSuivre(m, dt, c) {
      const S = m.suit, o = S.o, now = c.now;
      const lacher = () => {
        m.suit = null;
        // (il reprend son chemin vers son but)
        if (m.but && Math.hypot(m.but.x - m.x, m.but.y - m.y) > 2) m.demande = { x: m.but.x, y: m.but.y };
        else if (m.but) this.villageoisArrive(m);
        m.marchait = false;
        return true;
      };
      if (S.apres && now < S.apres) { m.marchait = false; return true; }
      if (now >= S.jusqua || !o || o.phase !== 'vie' || o.couche || o.assis || !o.s || !o.s.visible || this.villageoisLoin(m, c.vue)) return lacher();
      const oMarche = !!(o.chemin && o.chemin.length) || !!o.demande || !!o.attend || !!o.salut;
      const d = Math.hypot(o.x - m.x, o.y - m.y);
      if (!oMarche && d < 24) {
        // l'autre est arrivé : il s'arrête à son côté, tourné vers lui
        ({ face: m.face, flip: m.flip } = K.regard(o.x - m.x, o.y - m.y));
        if (S.bout) return lacher();
        m.suit = null;
        // (la promenade : il est à son but, ici, à côté de lui)
        m.chemin = []; m.puis = null; m.demande = null;
        m.but = { x: m.x, y: m.y, pose: { genre: 'debout', face: m.face, flip: m.flip } };
        this.villageoisAuBut(m);
        m.marchait = false;
        return true;
      }
      // où il va : à côté de l'autre (du côté où il est), un peu en retrait ; sinon dans ses pas
      const to = o.chemin && o.chemin.length ? o.chemin[0] : null;
      let ux = to ? to.x - o.x : m.x < o.x ? 1 : -1, uy = to ? to.y - o.y : 0;
      const l = Math.hypot(ux, uy) || 1;
      ux /= l; uy /= l;
      if (!S.cote) S.cote = ((m.x - o.x) * -uy + (m.y - o.y) * ux) >= 0 ? 1 : -1;
      let tx = o.x - uy * COTE * S.cote - ux * 3, ty = o.y + ux * COTE * S.cote - uy * 3;
      if (!this.libre(tx, ty)) { tx = o.x - ux * 14; ty = o.y - uy * 14; }
      const dx = tx - m.x, dy = ty - m.y, dd = Math.hypot(dx, dy);
      if (dd < 1.5) { m.marchait = false; if (to) ({ face: m.face, flip: m.flip } = K.regard(ux, uy)); return true; }
      const v = VITESSE * (m.vite || 1) * (dd > 28 ? 1.4 : dd > 10 ? 1.1 : 0.8), st = Math.min(dd, v * dt);
      const nx = m.x + (dx / dd) * st, ny = m.y + (dy / dd) * st;
      // (un mur entre eux : un détour par un chemin jusqu'à lui, deux fois au plus ; sinon il reprend le sien)
      if (!this.libre(nx, ny)) {
        if ((S.detours = (S.detours || 0) + 1) > 2) return lacher();
        S.detour = true;
        m.demande = { x: o.x, y: o.y };
        m.marchait = false;
        return true;
      }
      ({ face: m.face, flip: m.flip } = (m.allure || (m.allure = K.allure())).pas(dx, dy, st, m));
      m.x = nx; m.y = ny; m.marche += st;
      m.marchait = true;
      return true;
    },

    /* ---------- à chaque image : causeries, croisements, regards, le personnage ---------- */

    villageoisSocial(c) {
      const vus = this.villageoisVus;
      if (!vus || !vus.size || !this.ctx.lastModel || !this.ctx.lastModel.villageoisHeure) return;
      const now = c.now, F = this.villageoisCadre ? this.villageoisCadre() : null;
      // (les causeries et les croisements : dix fois par seconde, c'est assez pour des gens qui marchent au pas)
      if (now >= (this.villageoisSocialT || 0)) {
        this.villageoisSocialT = now + SOCIAL_MS;
        this.villageoisCauseries(c);
        this.villageoisCroisements(c);
      }
      for (const m of vus.values()) {
        if (m.emoji) this.villageoisEmojiPlace(m, F && F.f, now);
        if (m.geste && now >= m.geste.fin) m.geste = null;
      }
    },

    // Les causeries : ceux qui font la même chose ensemble (la même clé), arrivés, causent à tour de rôle.
    villageoisCauseries(c) {
      const now = c.now, R = this.villageoisReglages(), B = this.ctx.bridge;
      const C = this.villageoisCaus || (this.villageoisCaus = new Map());
      const ici = new Map();
      for (const m of this.villageoisVus.values()) {
        const but = m.seg && m.seg.but;
        let cle = null;
        // (à table, assis à la même table au même repas : on cause aussi)
        if (m.assis && m.seg && m.seg.etat === 'repas' && m.seg.lieu && Number.isInteger(m.seg.lieu.table) && !m.parle && m.s && m.s.visible) cle = `table:${m.seg.lieu.table}:${Math.floor(m.seg.de)}`;
        // (I6b : assis côte à côte sur deux bancs voisins, deux amis causent aussi)
        // (I8a : à la fête du village, assis sur un banc, ils causent aussi)
        else if (m.assis && but && (but.sorte === 'banc' || but.sorte === 'fete') && but.avec && but.avec.length && !m.parle && m.s && m.s.visible) cle = but.cle;
        else if (but && but.avec && but.avec.length && m.auBut && dispo(m) && !m.salut && !m.chemin.length && !m.demande && !m.suit) cle = but.cle;
        if (!cle) continue;
        let l = ici.get(cle);
        if (!l) ici.set(cle, (l = []));
        l.push(m);
      }
      for (const [cle, cs] of C) if (!ici.has(cle) && now - cs.vu > 4000) C.delete(cle);
      for (const [cle, l] of ici) {
        let cs = C.get(cle);
        // (I3c : au travail, on s'y met d'abord ; le premier mot vient un peu après)
        if (!cs) C.set(cle, (cs = { n: 0, tour: 0, prochain: now + (cle.startsWith('travail:') ? 9000 : 500), vu: now, parle: null, debut: true }));
        cs.vu = now;
        if (l.length < 2) continue;
        l.sort((a, b) => (a.id < b.id ? -1 : 1));
        // (ils se font face ; à trois, ils regardent qui parle, sinon le centre du cercle)
        const parle = cs.parle && now < cs.parle.fin ? cs.parle.m : null;
        for (const m of l) {
          if (m.assis) continue;
          let o = null;
          if (l.length === 2) o = l[0] === m ? l[1] : l[0];
          else if (parle && parle !== m) o = parle;
          if (o) ({ face: m.face, flip: m.flip } = K.regard(o.x - m.x, o.y - m.y));
          else if (m.seg.lieu && Number.isInteger(m.seg.lieu.vers)) {
            const W = this.grid.cols, v = m.seg.lieu.vers;
            ({ face: m.face, flip: m.flip } = K.regard((v % W) * T + T / 2 - m.x, (Math.floor(v / W) + 1) * T - 2 - m.y));
          }
        }
        if (now < cs.prochain || !B || !B.villageois) continue;
        // un échange : l'un dit, l'autre répond (à tour de rôle)
        const a = l[cs.tour % l.length], b = l[(cs.tour + 1) % l.length];
        // (I6b : la visite du soir, le repas apporté, le banc à deux ont leurs répliques)
        const ba = a.seg.but;
        // (I8a : au chantier du village, les répliques du chantier ; à la fête, celles de la fête)
        const sorte = !ba ? 'repas' : ba.sorte === 'rdv' ? 'groupe' : ba.apporte ? 'apporte' : ba.soir ? 'soiree' : ba.chantier ? 'chantier' : ba.sorte;
        const r = B.villageois('echange', a.id, { avec: b.id, n: cs.n++, sorte });
        cs.tour++;
        const tour = Math.max(1.2, Number(R.TOUR) || 3.2) * 1000;
        if (!r || !r.lignes || !r.lignes.length) { cs.prochain = now + tour; continue; }
        if (cs.debut) {
          cs.debut = false;
          // (I6b : celui qui apporte un repas, qui vient le soir, garde son emoji : 🍲, 🌙)
          for (const m of l) {
            const bm = m.seg && m.seg.but;
            this.villageoisEmoji(m, bm && bm.emoji && (bm.apporte || bm.soir) ? bm.emoji : m === b ? r.emoji[1] : r.emoji[0], EMOJI_MS);
          }
        }
        this.villageoisDit(a, r.lignes[0], tour * 0.9, c);
        cs.parle = { m: a, fin: now + tour * 0.5 };
        if (r.lignes[1]) {
          b.salut = null;
          // (la réponse, un peu après)
          const rep = r.lignes[1];
          if (this.time) this.time.delayedCall(tour * 0.5, () => {
            if (!b.s || !b.s.visible || b.parle || !(b.seg && (b.seg.but ? b.seg.but.cle === cle : b.assis))) return;
            // (chacun son tour : la bulle de l'autre s'efface)
            if (a.bulle && !a.parle) a.bulle.until = performance.now();
            this.villageoisDit(b, rep, tour * 0.9, c);
            cs.parle = { m: b, fin: performance.now() + tour * 0.5 };
          });
        }
        // (I6c : un bavard relance plus vite, un réservé laisse passer plus de temps : le plus grand facteur du groupe)
        const fc = Math.max(...l.map((m) => this.villageoisCause(m.id)));
        cs.prochain = now + (tour * 2 + 600 + (cs.n % 3) * 500) / fc;
        // (I3c : au travail, on cause un peu, puis on s'y remet : TACHES.CAUSE s entre deux échanges)
        if (sorte === 'travail') cs.prochain = now + (Number(R.CAUSE) || 26) * 1000 * (0.7 + (cs.n % 4) * 0.2);
      }
    },

    // Se croiser, tourner la tête, saluer le personnage.
    villageoisCroisements(c) {
      const now = c.now, R = this.villageoisReglages(), P = c.P, B = this.ctx.bridge, vue = c.vue;
      if (!P) return;
      const delais = this.villageoisPaires || (this.villageoisPaires = new Map());
      const rangs = this.villageoisRangs || (this.villageoisRangs = new Map());
      const vois = this.villageoisVois || (this.villageoisVois = []);
      const j = c.joueur;
      // (le personnage bouge-t-il ? il passe, il ne reste pas planté là)
      const jp = this.villageoisJoueurAvant;
      const jBouge = !!(j && jp && Math.hypot(j.x - jp.x, j.y - jp.y) > 0.3);
      this.villageoisJoueurAvant = j ? { x: j.x, y: j.y } : null;
      const dedans = (m) => m.x > vue.x && m.x < vue.right && m.y > vue.y && m.y < vue.bottom;
      for (const m of this.villageoisVus.values()) {
        if (!dispo(m) || m.salut || !dedans(m) || now < (m.salutApres || 0)) continue;
        // le personnage qui passe : un salut (s'il le connaît) ; I6a : un ami proche, ou qui garde un présent pour lui,
        // le salue de plus loin (JOUEUR_AMI), même arrêté s'il a un présent ; le salut dure un peu plus
        const cadeau = this.villageoisPresent(m.id), proche = cadeau || this.villageoisPalier(m.id) >= 3;
        const portee = proche ? (R.JOUEUR_AMI || 56) : (R.JOUEUR || 28);
        if (j && (jBouge || cadeau) && now >= (m.salueJoueur || 0) && Math.hypot(j.x - m.x, j.y - m.y) < portee && this.villageoisDegre(m.id, 'famille') >= 1 && B && B.villageois) {
          m.salueJoueur = now + (R.JOUEUR_ATTENTE || 60) * 1000;
          const r = B.villageois('echange', m.id, { avec: 'joueur', n: (m.nJoueur = (m.nJoueur || 0) + 1) });
          if (r && r.lignes && r.lignes[0]) {
            const ms = r.cadeau ? 3200 : proche ? 2400 : 1600;
            m.salut = { joueur: true, fin: now + ms, dit: null };
            this.villageoisEmoji(m, r.cadeau ? '🎁' : r.emoji[0], ms);
            this.villageoisDit(m, r.lignes[0], ms + 200, c);
            // (le présent donné : la page l'a mis dans l'inventaire ; il ne le redonne pas avant le prochain modèle)
            if (r.cadeau && this.ctx.lastModel && this.ctx.lastModel.villageoisHeure && this.ctx.lastModel.villageoisHeure.liens) delete (this.ctx.lastModel.villageoisHeure.liens.present || {})[m.id];
            continue;
          }
        }
        const enMarche = marche(m);
        const n = P.voisins(m.x, m.y, Math.max(R.RAYON || 24, R.REGARD || 48), vois, (e) => e.genre === 'villageois' && e.ref !== m);
        for (let i = 0; i < n; i++) {
          const o = vois[i].ref, d = Math.hypot(o.x - m.x, o.y - m.y);
          if (!dispo(o) || o.salut || now < (o.salutApres || 0)) continue;
          const deg = this.villageoisDegre(m.id, o.id);
          // debout, il tourne la tête vers un ami qui passe
          if (!enMarche && deg >= 1 && marche(o) && !(m.seg && m.seg.but && m.seg.but.avec && m.seg.but.avec.length && m.auBut)) {
            ({ face: m.face, flip: m.flip } = K.regard(o.x - m.x, o.y - m.y));
          }
          // se croiser : l'un marche au moins, à RAYON px ; pas ceux qui vont ensemble (la même clé, ou l'un suit l'autre)
          if (d > (R.RAYON || 24) || !(enMarche || marche(o))) continue;
          if ((m.suit && m.suit.o === o) || (o.suit && o.suit.o === m)) continue;
          const bm = m.seg && m.seg.but, bo = o.seg && o.seg.but;
          if (bm && bo && bm.cle === bo.cle) continue;
          // (au repos à son but, en pleine causerie : il ne quitte pas les siens pour un passant)
          if ((!enMarche && m.auBut && bm && bm.avec && bm.avec.length) || (!marche(o) && o.auBut && bo && bo.avec && bo.avec.length)) continue;
          const k = paire(m.id, o.id);
          if (now < (delais.get(k) || 0)) continue;
          const att = (R.ATTENTE || 40) * 1000;
          delais.set(k, now + att * (0.7 + ((rangs.get(k) || 0) % 5) * 0.15));
          this.villageoisSalue(m, o, deg, c, rangs, k, R);
          break;
        }
      }
    },

    // Le salut de `m` et `o` (degré `deg`) : ils s'arrêtent, se tournent l'un vers l'autre ; une émotion, deux
    // répliques (le pont : echangeVillageois) ; des amis font parfois un bout de chemin ensemble. Deux inconnus : un
    // signe de tête, parfois.
    villageoisSalue(m, o, deg, c, rangs, k, R) {
      const now = c.now, n = rangs.get(k) || 0, B = this.ctx.bridge;
      rangs.set(k, n + 1);
      // (le hasard du salut : la paire et son rang, le même spectacle pour la même partie)
      const h = K.hasard(K.graine(k + ':' + n));
      if (deg < 1) {
        if (h() >= (R.SIGNE || 0.5)) return;
        for (const [a, b] of [[m, o], [o, m]]) { a.salut = { o: b, fin: now + 650, dit: null }; a.salutApres = now + REPRISE_MS; }
        return;
      }
      // (I6c : un bavard s'attarde, un réservé passe vite : le plus grand facteur des deux)
      const D = R.DUREE || [1.4, 2.4], duree = (Number(D[Math.min(D.length - 1, deg - 1)]) || 1.6) * 1000 * Math.max(this.villageoisCause(m.id), this.villageoisCause(o.id));
      const r = B && B.villageois ? B.villageois('echange', m.id, { avec: o.id, n, sorte: 'croise' }) : null;
      const L = (r && r.lignes) || [];
      m.salut = { o, fin: now + duree, dit: null };
      o.salut = { o: m, fin: now + duree, dit: L[1] ? { t: now + duree * 0.45, texte: L[1], ms: Math.max(1600, duree * 0.8) } : null };
      // (chacun reprend sa route un moment avant d'en saluer un autre)
      m.salutApres = o.salutApres = now + duree + REPRISE_MS;
      if (r) { this.villageoisEmoji(m, r.emoji[0], duree); this.villageoisEmoji(o, r.emoji[1], duree); }
      if (L[0]) this.villageoisDit(m, L[0], duree * 0.5, c);
      // des amis : un bout de chemin ensemble (l'un suit l'autre, s'il n'a pas d'ami qui l'attend)
      if (deg >= 2 && h() < (R.ENSEMBLE || 0) && !reducedMotion()) {
        const seul = (x) => !(x.seg && x.seg.but && x.seg.but.avec && x.seg.but.avec.length);
        const [mene, suit] = m.chemin.length >= o.chemin.length ? [m, o] : [o, m];
        if (mene.chemin.length >= 4 && seul(suit) && !suit.suit) suit.suit = { o: mene, jusqua: now + duree + (R.BOUT || 12) * 1000, apres: now + duree, bout: true, cote: 0 };
      }
    },
  });
})(window);
