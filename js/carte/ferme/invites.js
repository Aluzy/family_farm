/* carte/ferme/invites.js — la scène de la ferme : les invités d'un repas (js/engine/invitations.js).
 *
 * Le moteur tient les invitations ; le modèle de la carte en donne l'invitation du moment (modèle.invites :
 * { id, moment, nom, etat ('repondue' : on les attend ; 'servie' : le repas est servi), invites: [{ id,
 * hameau, hameauNom, prenom, perso, enfant, metier, depart (la case de la place de leur hameau, ou null) }],
 * paroles: { arrive, table, merci, seul } }, ou null). Ici :
 *
 *   - la table (placesTable) : une table de jardin et les chaises ou les bancs qui la touchent (la terrasse),
 *     chacun regardant où regarde son siège (tourné de profil : on le voit de profil),
 *     sinon la table de la maison et ses chaises ; chaque place : où s'asseoir, tourné vers la table, et la
 *     case libre d'où l'on s'y assoit. Sans table, ils attendent debout devant la porte ;
 *   - un invité qui trouve le coin de la table à son goût (modèle : invites[].admire, js/engine/styles.js) le
 *     dit en arrivant, avec joie ;
 *   - chacun paraît au bord de la vue, du côté de son hameau (comme le visiteur de la bienvenue,
 *     visite.js visiteDepart), marche jusqu'à sa place, s'assoit (les cases assis_<vue> des planches) et dit
 *     un mot en arrivant ; à table, ils bavardent (une bulle de temps en temps) ;
 *   - la famille (ceux qui sont dehors à cette heure) s'assoit aux places qui restent dès que le premier
 *     invité est assis (js/famille-ferme.js attabler), mange avec eux et se lève quand ils s'en vont ;
 *   - un appui sur la table (sieges.js tableRepasAt) : la fenêtre « Servir le repas » (le pont :
 *     ctx.bridge.invites('table', { terrasse })) ; servi, ils mangent (la fourchette à la bouche), le
 *     temps REPAS_S, remercient et repartent ; le personnage assis à l'une des places (un appui sur la
 *     chaise, sieges.js) mange avec eux ;
 *   - le moment passé sans repas : ils le disent gentiment et repartent (rien n'est perdu) ;
 *   - leur émotion (une réaction : la joie d'un bon repas, le dégoût d'un plat détesté) : comme les habitants
 *     (amis.js teinteHabitant).
 * Avec « animations réduites », ils vont d'un point à l'autre sans marcher.
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
  const LOIN = 320;                            // px hors de la vue : il saute au but
  const VU = 48;
  const ECART_S = 2.5;                         // s entre deux départs
  const REPAS_S = 18;                          // s : ils mangent, puis remercient
  const MERCI_S = 4;
  const BAVARDE = [7, 13];                     // s entre deux mots à table
  const BULLE_MS = 4500;
  const BOITE = { l: 8, h: 30, bas: 3 };

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const un = (L) => (L && L.length ? L[Math.floor(Math.random() * L.length)] : '');
  const TABLES = new Set(['table_jardin', 'table_rondins', 'meuble_table']);   // (les mêmes que sieges.js)
  const SIEGES = new Set(['chaise_jardin', 'banc_jardin', 'meuble_chaise', 'banc_rondins', 'chaise_peinte', 'banc_pierre']);

  F.partie({

    // La table du repas : { terrasse, x, y (son milieu), places: [{ x, y (les pieds, assis), face, flip, depth,
    // pied: { x, y } }] }, ou null (pas de table). Une table de jardin qui a au moins une place passe d'abord ;
    // sinon celle qui en a le plus.
    placesTable() {
      const B = this.blocks || new Map(), cols = this.grid.cols, pris = new Map();
      for (const e of B.values()) for (const k of e.cases || [e.case]) pris.set(k, e);
      let mieux = null;
      for (const t of B.values()) {
        if (!TABLES.has(t.sorte)) continue;
        const cases = t.cases || [t.case], places = [], vus = new Set();
        for (const c of cases) {
          for (const k of [c - cols, c + cols, c - 1, c + 1]) {
            const s = pris.get(k);
            if (!s || !SIEGES.has(s.sorte) || vus.has(s.case) || cases.includes(k)) continue;
            vus.add(s.case);
            // (où l'on s'assoit : sieges.js placeSiege)
            const q = this.placeSiege(s);
            if (q) places.push(q);
          }
        }
        const xs = cases.map((k) => (k % cols) * T + T / 2), y = (Math.floor(cases[0] / cols) + 1) * T - T / 2;
        const cand = { terrasse: t.sorte !== 'meuble_table', x: xs.reduce((a, b) => a + b, 0) / xs.length, y, places, cases };
        const score = (c) => (c.terrasse && c.places.length ? 100 : 0) + c.places.length;
        if (!mieux || score(cand) > score(mieux)) mieux = cand;
      }
      return mieux;
    },

    // À chaque image : les invités du moment (ils viennent, s'assoient, bavardent, mangent, repartent).
    stepInvites(dt) {
      const md = this.ctx.lastModel, V = md && md.invites;
      let G = this.invitesVus;
      if (!G) {
        if (!V || md.nuit) return;
        G = this.nouveauxInvites(V);
        if (!G) return;
      }
      const C = this.casesPerso ? this.casesPerso() : null;
      if (!C) return;
      const now = performance.now(), calme = reducedMotion();
      const vue = this.cameras.main.worldView;
      const loin = (q) => q.x < vue.x - LOIN || q.x > vue.right + LOIN || q.y < vue.y - LOIN || q.y > vue.bottom + LOIN;
      const f = this.screenFrame ? this.screenFrame() : null;
      // (le moment passé, la nuit, une autre invitation : ils s'en vont ; servi : ils mangent)
      const fini = !V || V.id !== G.id || md.nuit;
      if (V && V.id === G.id && V.etat === 'servie' && !G.servi) { G.servi = now; G.bavarde = Infinity; }
      let restent = 0;
      for (const g of G.gens.values()) {
        if (fini && g.phase !== 'repart' && g.phase !== 'efface' && g.phase !== 'merci') {
          this.inviteBulle(g, G.servi ? un(G.paroles.merci) : un(G.paroles.seul), BULLE_MS);
          this.inviteRepart(g);
        }
        if (g.phase === 'efface' && g.alpha <= 0) continue;
        restent += 1;
        if (!this.textures.exists(g.key)) continue;
        if (!g.s) { g.s = this.add.sprite(0, 0, g.key, C('idle_bas_0')).setOrigin(0.5, 1).setVisible(false); g.s.personnage = true; }
        // le départ, l'un après l'autre
        if (g.phase === 'debut') {
          if (now < g.part) continue;
          g.phase = 'vient';
          const but = g.place ? g.place.pied : g.debout;
          const p = this.fermier ? this.fermier.path(g.x, g.y, but.x, but.y, {}) : null;
          g.chemin = !calme && p && p.length && !p.droit && !(loin(g) && loin(but)) ? p.slice() : [];
          if (!g.chemin.length) { g.x = but.x; g.y = but.y; }
        }
        // marcher
        let marche = false;
        if (g.chemin.length) {
          if (calme || (loin(g) && loin(g.chemin[g.chemin.length - 1]))) {
            const b = g.chemin[g.chemin.length - 1];
            g.x = b.x; g.y = b.y; g.chemin = [];
          } else {
            const to = g.chemin[0], dx = to.x - g.x, dy = to.y - g.y, l = Math.hypot(dx, dy), st = VITESSE * dt;
            ({ face: g.face, flip: g.flip } = (g.allure || (g.allure = K.allure())).pas(dx, dy, Math.min(l, st), g));
            if (l <= st) { g.x = to.x; g.y = to.y; g.chemin.shift(); } else { g.x += (dx / l) * st; g.y += (dy / l) * st; }
            g.marche += Math.min(l, st);
            marche = true;
          }
        }
        if (!marche) g.marche = 0;
        if (g.phase === 'vient' && !g.chemin.length) {
          // à sa place : il s'assoit (ou se tient debout, tourné vers la table, la porte)
          g.phase = 'table';
          if (g.place) { g.x = g.place.x; g.y = g.place.y; g.face = g.place.face; g.flip = g.place.flip; }
          else if (G.table) ({ face: g.face, flip: g.flip } = K.regard(G.table.x - g.x, G.table.y - g.y));
          else { g.face = 'haut'; g.flip = false; }
          // (le coin est de son style : il l'admire, avec joie ; js/engine/styles.js)
          this.inviteBulle(g, g.admire || un(G.paroles.arrive), BULLE_MS);
          if (g.admire && this.emouvoir) this.emouvoir(g, 'joie', true);
          if (!G.bavardeA) G.bavardeA = now + 1000 * (BAVARDE[0] + Math.random() * (BAVARDE[1] - BAVARDE[0]));
        } else if (g.phase === 'table' && G.servi && now - G.servi > REPAS_S * 1000) {
          g.phase = 'merci';
          g.until = now + MERCI_S * 1000;
          this.inviteBulle(g, un(G.paroles.merci), MERCI_S * 1000);
        } else if (g.phase === 'merci' && now >= g.until) {
          this.inviteRepart(g);
        } else if (g.phase === 'repart' && !g.chemin.length) g.phase = 'efface';
        if (g.phase === 'repart' && (loin(g) || (calme && !g.chemin.length))) g.phase = 'efface';
        if (g.phase === 'efface') g.alpha = calme ? 0 : Math.max(0, g.alpha - dt / FADE_S);
        else if (g.fade > 0) { g.alpha = Math.min(1, g.alpha + dt / FADE_S); if (g.alpha >= 1 || calme) { g.alpha = 1; g.fade = 0; } }
        // l'image
        const s = g.s, dedans = g.x > vue.x - VU && g.x < vue.right + VU && g.y > vue.y - VU && g.y < vue.bottom + VU + 32;
        s.setVisible(dedans && g.alpha > 0);
        const assis = (g.phase === 'table' || g.phase === 'merci') && g.place;
        const mange = assis && G.servi && g.phase === 'table';
        const nom = marche ? `marche_${g.face}_${K.imageMarche(g.marche)}`
          : assis ? `assis_${g.face}_${mange ? Math.floor(now / 700) % 2 : 0}`
            : `idle_${g.face}_${Math.floor(now / 600) % 2}`;
        s.setFrame(C(nom)).setPosition(Math.round(g.x), Math.round(g.y)).setFlipX(g.flip).setAlpha(g.alpha).setDepth(assis ? g.place.depth : g.y);
        if (this.teinteHabitant) this.teinteHabitant(g, now, f);
        this.inviteBulleSuit(g, now, f, dedans);
      }
      // ils bavardent à table
      if (!fini && !G.servi && G.bavardeA && now >= G.bavardeA) {
        const L = [...G.gens.values()].filter((g) => g.phase === 'table' && !g.bulle);
        if (L.length) this.inviteBulle(un(L), un(G.paroles.table), BULLE_MS);
        G.bavardeA = now + 1000 * (BAVARDE[0] + Math.random() * (BAVARDE[1] - BAVARDE[0]));
      }
      // la famille se met à table avec eux (les places qui restent ; js/famille-ferme.js attabler) dès que le
      // premier est assis, mange quand ils mangent, et se lève quand ils s'en vont
      if (this.family && this.family.attabler) {
        const L = [...G.gens.values()];
        const la = !fini && G.table && L.some((g) => g.phase === 'table') && L.every((g) => g.phase !== 'merci' && g.phase !== 'repart');
        // (pas la place où le personnage est assis)
        const moi = this.fermier && this.fermier.assis ? this.fermier.assis() : null;
        const libres = la ? G.table.places.filter((q) => !L.some((g) => g.place === q) && !(moi && q.siege === moi.siege)) : null;
        this.family.attabler(libres, !!G.servi);
      }
      // le personnage assis à l'une des places de la table : il mange avec eux, le repas servi (la fenêtre
      // « Servir le repas » : un appui sur la table, sieges.js tableRepasAt)
      if (this.fermier && this.fermier.aTable) {
        const moi = this.fermier.assis && this.fermier.assis();
        this.fermier.aTable(!fini && !!G.servi && !!moi && !!G.table && G.table.places.some((q) => q.siege === moi.siege));
      }
      if (!restent) this.invitesFin();
    },

    // Les invités du modèle `V` : où chacun paraît, sa place à table ; null sans porte ni table.
    nouveauxInvites(V) {
      const porte = this.homeDoor ? this.homeDoor() : null;
      const table = this.placesTable();
      if ((!porte && !table) || !this.fermier) return null;
      const G = { id: V.id, table, paroles: V.paroles || {}, gens: new Map(), servi: 0, bavardeA: 0 };
      const now = performance.now();
      // (pas la chaise où le personnage est déjà assis)
      const moi = this.fermier.assis ? this.fermier.assis() : null;
      const places = table ? table.places.filter((q) => !(moi && q.siege === moi.siege)) : [];
      const autour = table || porte;
      V.invites.forEach((q, k) => {
        const d = { perso: q.perso, enfant: !!q.enfant, apparence: q.apparence || null };
        const key = this.clePerso ? this.clePerso(d) : (d.enfant ? 'enfant_' : 'perso_') + d.perso;
        if (this.chargePerso) this.chargePerso(key, d);
        const dep = this.visiteDepart ? this.visiteDepart({ depart: q.depart }, porte || { x: autour.x, y: autour.y }) : { x: autour.x, y: autour.y };
        const place = places.shift() || null;
        // (sans place : debout, près de la table ou devant la porte)
        const debout = place ? null : (this.fermier.librePres && this.fermier.librePres(autour.x + (k % 2 ? 1 : -1) * T * (1 + (k >> 1)), autour.y + T)) || { x: autour.x, y: autour.y + T };
        G.gens.set(q.id, {
          id: q.id, key, def: d, s: null, bulle: null, x: dep.x, y: dep.y, face: 'bas', flip: false, marche: 0, alpha: 0, fade: 1,
          phase: 'debut', part: now + k * ECART_S * 1000, chemin: [], place, debout, depart: { x: dep.x, y: dep.y }, until: 0, prenom: q.prenom, admire: q.admire || null,
        });
      });
      this.invitesVus = G;
      return G;
    },

    // Il repart d'où il est venu (assis : il se lève d'abord, sur la case libre à côté de sa chaise).
    inviteRepart(g) {
      if (g.place && (g.phase === 'table' || g.phase === 'merci')) { g.x = g.place.pied.x; g.y = g.place.pied.y; }
      g.phase = 'repart';
      const p = this.fermier && !reducedMotion() ? this.fermier.path(g.x, g.y, g.depart.x, g.depart.y, {}) : null;
      g.chemin = p && p.length && !p.droit ? p.slice() : [];
    },

    inviteBulle(g, texte, ms) {
      if (!g || !texte || !this.ctx.labelLayer) return;
      if (!g.bulle) {
        const el = document.createElement('div');
        el.className = 'habitant-bulle visite-bulle';
        el.setAttribute('role', 'status');
        this.ctx.labelLayer.appendChild(el);
        g.bulle = { el, w: 0, h: 0, until: 0 };
      }
      g.bulle.el.innerHTML = `<strong>${esc(g.prenom)}</strong><span class="habitant-bulle-texte">${esc(texte)}</span>`;
      g.bulle.w = 0;
      g.bulle.until = performance.now() + ms;
    },

    inviteBulleSuit(g, now, f, dedans) {
      const b = g.bulle;
      if (!b) return;
      if (now >= b.until || !dedans) { b.el.remove(); g.bulle = null; return; }
      if (!f) return;
      if (!b.w) { b.w = b.el.offsetWidth; b.h = b.el.offsetHeight; }
      const L = this.ctx.labelLayer.clientWidth || Infinity;
      const x = Math.max(4, Math.min(L - b.w - 4, (g.x - f.left) * f.k - b.w / 2));
      b.el.style.transform = `translate(${Math.round(x)}px,${Math.round((g.y - 30 - f.top) * f.k - b.h)}px)`;
    },

    invitesFin() {
      const G = this.invitesVus;
      if (!G) return;
      for (const g of G.gens.values()) {
        if (g.s) g.s.destroy();
        if (g.bulle) g.bulle.el.remove();
        if (this.emojiOff) this.emojiOff(g);
        if (this.voileOff) this.voileOff(g);
      }
      this.invitesVus = null;
      if (this.family && this.family.attabler) this.family.attabler(null);
    },

    // L'invité sous le doigt en (wx, wy), ou null.
    inviteAt(wx, wy) {
      const G = this.invitesVus;
      if (!G) return null;
      for (const g of G.gens.values()) {
        if (!g.s || !g.s.visible || g.phase === 'efface') continue;
        if (Math.abs(wx - g.x) <= BOITE.l && wy <= g.y + BOITE.bas && wy >= g.y - BOITE.h) return g;
      }
      return null;
    },

    // L'invité `id`, ou null (pour une réaction : amis.js habitantParId).
    inviteParId(id) {
      const G = this.invitesVus;
      return G ? G.gens.get(id) || null : null;
    },

    // (les essais : où ils sont, ce qu'ils font)
    invitesInfo() {
      const G = this.invitesVus;
      if (!G) return null;
      return { id: G.id, terrasse: !!(G.table && G.table.terrasse), places: G.table ? G.table.places.length : 0, servi: !!G.servi, gens: [...G.gens.values()].map((g) => ({ id: g.id, phase: g.phase, x: Math.round(g.x), y: Math.round(g.y), assis: !!g.place && (g.phase === 'table' || g.phase === 'merci'), visible: !!(g.s && g.s.visible), bulle: g.bulle ? g.bulle.el.textContent : null })) };
    },
  });
})(window);
