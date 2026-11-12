/* carte/ferme/villageois.js — la scène de la ferme : l'arrivée d'un villageois et son sommeil (le chantier
 * « l'île à bâtir », fiche I3a).
 *
 * Le moteur tient les villageois (js/engine/villageois.js) ; le modèle de la carte en donne ce qu'il faut
 * (modèle.villageois : [{ id, prenom, genre, perso, apparence, accueil ('en_route' : il arrive ; null : il est
 * chez lui), porte (une case d'une porte de sa maison, ou null), lit (son couchage, ou null), depart (la case
 * d'où il arrive : le port, sinon le bout du chemin de la ferme), toc, phrase }], ou null le chantier éteint).
 * Ici, comme la visite de bienvenue (visite.js) :
 *
 *   - en route, il paraît du côté du port (au plus près de sa case, sur une case libre d'où un chemin mène à sa
 *     porte : fermier.path) et marche jusqu'à sa porte (frontDoor) ; loin de la vue, il y est d'un coup ;
 *   - à la porte, il frappe (sa bulle : « Toc, toc ! »), puis dit sa ligne (une bulle d'une ligne) : la page
 *     l'apprend (ctx.bridge.villageois('accueilli', id) : la notification) ; il entre chez lui (il s'efface sur
 *     sa porte) ;
 *   - la nuit, il dort dans son lit, sous la couverture (comme la famille : bedSpotOf) ; on l'y voit quand le
 *     toit de sa maison se lève ;
 *   - un appui sur lui (villageoisAt, appelé par hitAt) : sa fiche (ctx.bridge.villageois('fiche', id)).
 * Sa présence dans la journée (sortir, flâner, manger) viendra avec la fiche I3b.
 * Avec « animations réduites », il va d'un point à l'autre sans marcher.
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
  const VU = 48;                               // px hors de la vue : son image n'est pas dessinée
  const TOC_MS = 2600;                         // la bulle « Toc, toc ! »
  const PAROLE_MS = 6500;                      // sa ligne
  const DEPART = [0, 1, 2, 3, 4, 6, 8];        // cases autour de sa case de départ (la première libre et reliée)
  const BOITE = { l: 8, h: 30, bas: 3 };       // l'appui sur lui, autour de ses pieds

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  F.partie({

    // À chaque image : ceux qui arrivent (le chemin du port à la porte) et ceux qui dorment.
    stepVillageois(dt) {
      const md = this.ctx.lastModel, L = (md && md.villageois) || [];
      if (!this.villageoisVus) this.villageoisVus = new Map();
      const vus = this.villageoisVus, ids = new Set();
      const C = this.casesPerso ? this.casesPerso() : null;
      for (const v of L) {
        ids.add(v.id);
        let m = vus.get(v.id);
        // (accueilli : la page le sait, le modèle suivra ; il ne revient pas du port)
        const arrive = v.accueil === 'en_route' && !md.nuit && !(this.villageoisAccueillis && this.villageoisAccueillis.has(v.id));
        const dort = !arrive && md.nuit && v.lit !== null && v.lit !== undefined;
        if (!m && !arrive && !dort) continue;
        if (!m) { m = this.nouveauVillageois(v); if (!m) continue; vus.set(v.id, m); }
        m.v = v;
        if (!C || !this.textures.exists(m.key)) continue;
        if (!m.s) { m.s = this.add.sprite(0, 0, m.key, C('idle_bas_0')).setOrigin(0.5, 1).setVisible(false); m.s.personnage = true; }
        if (m.phase === 'lit' && !dort) { this.villageoisLeve(m); m.phase = 'fini'; }
        if (dort && m.phase !== 'lit' && m.phase !== 'vient' && m.phase !== 'porte' && m.phase !== 'parle') this.villageoisCouche(m, v.lit);
        if (m.phase === 'lit') { this.villageoisDort(m, C); continue; }
        if (m.phase === 'fini') { this.villageoisFin(v.id); continue; }
        this.villageoisMarche(m, dt, C);
      }
      for (const id of [...vus.keys()]) if (!ids.has(id)) this.villageoisFin(id);
    },

    // Le villageois du modèle `v` : sa planche, où il paraît (son chemin vers la porte) ; null sans porte.
    nouveauVillageois(v) {
      const d = { perso: v.perso, enfant: false, apparence: v.apparence || null };
      const key = this.clePerso ? this.clePerso(d) : 'perso_' + v.perso;
      if (this.chargePerso) this.chargePerso(key, d);
      const m = { id: v.id, v, key, s: null, drap: null, bulle: null, x: 0, y: 0, face: 'bas', flip: false, marche: 0, alpha: 0, fade: 1, phase: 'debut', chemin: [], until: 0 };
      if (v.accueil !== 'en_route') { m.phase = 'attente'; return m; }
      const porte = Number.isInteger(v.porte) && this.frontDoor ? this.frontDoor(v.porte) : null;
      if (!porte || !this.fermier) {
        // (pas de porte où aller : il est chez lui d'un coup)
        this.villageoisAccueilli(v.id);
        m.phase = 'fini';
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

    // Un pas de son arrivée : il marche, frappe, dit sa ligne, entre.
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
        if (m.alpha <= 0) { m.phase = 'fini'; if (m.s) m.s.setVisible(false); this.villageoisBulleOff(m); return; }
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

    // Il se couche dans son lit `lit` (un couchage, comme modèle.couchages l'écrit) : sous la couverture, comme la
    // famille (famille-ferme.js, coucher). Sans place de lit sur la carte : rien.
    villageoisCouche(m, lit) {
      const L = this.bedSpotOf ? this.bedSpotOf(lit) : null;
      if (!L || !m.s) return;
      this.villageoisBulleOff(m);
      m.phase = 'lit';
      m.lit = L;
      m.x = L.x; m.y = L.y; m.face = 'bas'; m.flip = false; m.alpha = 1;
      m.s.setAngle(L.angle || 0).setAlpha(1).setFlipX(false).setPosition(Math.round(L.x), Math.round(L.y)).setDepth(L.depth + 0.1).setVisible(true);
      if (!m.drap) m.drap = this.add.image(0, 0, L.drap.key, L.drap.frame).setOrigin(0.5, 1);
      m.drap.setTexture(L.drap.key, L.drap.frame).setPosition(L.drap.x, L.drap.y).setFlipX(!!L.drap.flip).setDepth(L.depth + 0.2).setVisible(true);
      m.drap.personnage = true;
    },

    // Au lit : il respire (deux images d'attente), son visage suit.
    villageoisDort(m, C) {
      m.s.setFrame(C(`idle_bas_${Math.floor(performance.now() / 1400) % 2}`));
      if (global.CarteVisages) global.CarteVisages.suivre(this, m.s);
    },

    // Le jour venu : il quitte le lit (la journée sur la ferme : fiche I3b ; ici, il s'efface).
    villageoisLeve(m) {
      if (m.s) m.s.setAngle(0).setVisible(false);
      if (m.drap) m.drap.setVisible(false);
      m.lit = null;
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

    // Sa bulle au-dessus de lui (dans l'écran : près d'un bord, elle se décale).
    villageoisBullePlace(m) {
      const b = m.bulle;
      if (!b) return;
      if (performance.now() >= b.until) { this.villageoisBulleOff(m); return; }
      const f = this.screenFrame ? this.screenFrame() : null;
      if (!f) return;
      if (!b.w) { b.w = b.el.offsetWidth; b.h = b.el.offsetHeight; }
      const Lw = this.ctx.labelLayer.clientWidth || Infinity;
      const x = Math.max(4, Math.min(Lw - b.w - 4, (m.x - f.left) * f.k - b.w / 2));
      b.el.style.transform = `translate(${Math.round(x)}px,${Math.round((m.y - 30 - f.top) * f.k - b.h)}px)`;
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
      this.villageoisVus.delete(id);
    },

    // Le villageois sous le doigt en (wx, wy) : son id, ou null. Au lit : seulement quand on le voit (le toit levé).
    villageoisAt(wx, wy) {
      if (!this.villageoisVus) return null;
      for (const m of this.villageoisVus.values()) {
        if (!m.s || !m.s.visible || m.alpha <= 0) continue;
        if (m.phase === 'lit') {
          const k = this.tileAtPoint ? this.tileAtPoint(m.x, m.y - 4) : -1;
          if ((this.toits || []).some((t) => t.dedans.has(k) && t.img.alpha > 0.5)) continue;
        }
        if (Math.abs(wx - m.x) > BOITE.l || wy > m.y + BOITE.bas || wy < m.y - BOITE.h) continue;
        return m.id;
      }
      return null;
    },

    // (les essais : où ils sont, ce qu'ils font)
    villageoisInfo() {
      return [...(this.villageoisVus || new Map()).values()].map((m) => ({ id: m.id, phase: m.phase, x: Math.round(m.x), y: Math.round(m.y), visible: !!(m.s && m.s.visible), alpha: m.alpha, bulle: m.bulle ? m.bulle.el.textContent : null, chemin: m.chemin ? m.chemin.length : 0 }));
    },
  });
})(window);
