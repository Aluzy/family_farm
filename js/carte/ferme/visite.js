/* carte/ferme/visite.js — la scène de la ferme : la visite de bienvenue (fiche 18).
 *
 * Le moteur tient la visite (js/engine/bienvenue.js) ; le modèle de la carte en donne ce qu'il faut
 * (modèle.visite : { etat (en_route : il vient ; posee : son plat attend devant la porte), prenom,
 * perso, metier, hameau, depart (la case de la place de son hameau, ou null), plat: { id, nom,
 * icone }, phrase, toc, absent, attente (s), proche (px) }, ou null). Ici :
 *
 *   - en route, le visiteur (un habitant du hameau le plus proche : la planche de son personnage,
 *     comme les habitants, js/carte/ferme/habitants.js) paraît au bord de la vue, du côté de son
 *     hameau, et marche jusqu'à la porte du foyer (homeDoor, js/carte/ferme/chantier.js) par les
 *     cases libres (fermier.path : les murs fermés ; un départ d'où l'on n'atteint pas la porte est
 *     écarté) ; loin de la vue, il y est d'un coup (ni recherche ni image) ;
 *   - à la porte, il frappe (sa bulle : « Toc, toc ! ») et attend `attente` s, tourné vers elle ; le
 *     personnage à `proche` px de lui : il se tourne vers lui, sa bulle dit sa phrase d'accueil et il
 *     donne le plat (le pont : ctx.bridge.visite('donne') → bienvenueDonne, +1 à l'inventaire et une
 *     notification) ; personne : il pose le plat devant la porte (ctx.bridge.visite('pose')) ;
 *   - puis il repart d'où il est venu et s'efface au loin (hors de la vue, ou au bout du chemin) ;
 *   - le plat posé : son icône devant la porte (le calque des étiquettes) ; le personnage qui y
 *     revient (à `proche` px de la porte) le prend (ctx.bridge.visite('retour')) ;
 *   - un appui sur lui (visiteurAt, appelé par hitAt) : il redit sa phrase.
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
  const PAS = 4;                               // px par image de marche
  const FADE_S = 0.5;
  const LOIN = 320;                            // px hors de la vue : il saute au but
  const VU = 48;                               // px hors de la vue : son image n'est pas dessinée
  const DEPART = { min: 8, max: 32, essais: [0, 0.35, -0.35, 0.7, -0.7, 1.2, -1.2] };   // cases ; écarts d'angle (rad)
  const TOC_MS = 3000;                         // la bulle « Toc, toc ! »
  const PAROLE_MS = 7000;                      // sa phrase d'accueil
  const ABSENT_MS = 3500;                      // « Personne… »
  const BOITE = { l: 8, h: 30, bas: 3 };       // l'appui sur lui, autour de ses pieds

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  F.partie({

    // À chaque image : le visiteur (s'il vient, attend, parle ou repart) et le plat posé.
    stepVisite(dt) {
      const md = this.ctx.lastModel, V = md && md.visite;
      this.stepPlatPose(V);
      let m = this.visiteur;
      if (!m) {
        if (!V || V.etat !== 'en_route' || md.nuit) return;
        m = this.visiteur = this.nouveauVisiteur(V);
        if (!m) return;
      }
      // (la visite finie ailleurs, la nuit tombée, le plat posé par le moteur : il s'en va)
      if ((!V || V.etat !== 'en_route') && (m.phase === 'vient' || m.phase === 'porte')) this.visiteRepart(m);
      const C = this.casesPerso ? this.casesPerso() : null;
      if (!C || !this.textures.exists(m.key)) return;
      if (!m.s) m.s = this.add.sprite(0, 0, m.key, C('idle_bas_0')).setOrigin(0.5, 1).setVisible(false);
      const vue = this.cameras.main.worldView, now = performance.now(), calme = reducedMotion();
      const joueur = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      const loin = (q) => q.x < vue.x - LOIN || q.x > vue.right + LOIN || q.y < vue.y - LOIN || q.y > vue.bottom + LOIN;
      // le premier pas : le chemin vers la porte (ou il y est, loin de la vue)
      if (m.phase === 'debut') {
        m.phase = 'vient';
        if (calme || (loin(m) && loin(m.porte))) { m.x = m.porte.x; m.y = m.porte.y; m.chemin = []; } else m.chemin = m.aller.slice();
        m.fade = 1;
      }
      // marcher
      let marche = false;
      if (m.chemin.length) {
        if (calme || (loin(m) && loin(m.chemin[m.chemin.length - 1]))) {
          const b = m.chemin[m.chemin.length - 1];
          m.x = b.x; m.y = b.y; m.chemin = [];
        } else {
          const to = m.chemin[0], dx = to.x - m.x, dy = to.y - m.y, l = Math.hypot(dx, dy), st = VITESSE * dt;
          ({ face: m.face, flip: m.flip } = K.regard(dx, dy));
          if (l <= st) { m.x = to.x; m.y = to.y; m.chemin.shift(); } else { m.x += (dx / l) * st; m.y += (dy / l) * st; }
          m.marche += Math.min(l, st);
          marche = true;
        }
      }
      const pres = joueur && Math.hypot(joueur.x - m.x, joueur.y - m.y) <= m.proche;
      if (m.phase === 'vient' && !m.chemin.length) {
        // à la porte : il frappe, tourné vers elle
        m.phase = 'porte';
        m.attente = m.duree;
        this.visiteRegardePorte(m);
        this.visiteBulle(m, `<span class="habitant-bulle-texte">${esc(m.toc)}</span>`, TOC_MS);
      } else if (m.phase === 'porte') {
        m.attente -= dt;
        if (pres) {
          // le personnage est là : la phrase d'accueil, le plat donné
          m.phase = 'parle';
          m.until = now + PAROLE_MS;
          this.visiteParle(m);
          const B = this.ctx.bridge;
          if (B && B.visite) B.visite('donne');
        } else if (m.attente <= 0) {
          // personne : le plat devant la porte
          const B = this.ctx.bridge;
          if (B && B.visite) B.visite('pose');
          this.visiteBulle(m, `<span class="habitant-bulle-texte">${esc(m.absent)}</span>`, ABSENT_MS);
          m.phase = 'pose';
          m.until = now + ABSENT_MS;
        } else if (!m.bulle) this.visiteRegardePorte(m);
      } else if (m.phase === 'parle' || m.phase === 'pose') {
        if (joueur && m.phase === 'parle') ({ face: m.face, flip: m.flip } = K.regard(joueur.x - m.x, joueur.y - m.y));
        if (now >= m.until) this.visiteRepart(m);
      } else if (m.phase === 'repart' && !m.chemin.length) {
        // au bout du chemin du retour, ou hors de la vue : il s'efface
        m.phase = 'efface';
      }
      if (m.phase === 'repart' && (loin(m) || (calme && !m.chemin.length))) m.phase = 'efface';
      if (m.phase === 'efface') {
        m.alpha = calme ? 0 : Math.max(0, m.alpha - dt / FADE_S);
        if (m.alpha <= 0) { this.visiteFin(); return; }
      } else if (m.fade > 0) {
        m.alpha = Math.min(1, m.alpha + dt / FADE_S);
        if (m.alpha >= 1 || calme) { m.alpha = 1; m.fade = 0; }
      }
      // l'image
      const s = m.s, dedans = m.x > vue.x - VU && m.x < vue.right + VU && m.y > vue.y - VU && m.y < vue.bottom + VU + 32;
      s.setVisible(dedans && m.alpha > 0);
      if (!dedans) { if (m.bulle) this.visiteBulleOff(m); return; }
      const nom = marche ? `marche_${m.face}_${Math.floor(m.marche / PAS) % 4}` : `idle_${m.face}_${Math.floor(now / 600) % 2}`;
      s.setFrame(C(nom)).setPosition(Math.round(m.x), Math.round(m.y)).setFlipX(m.flip).setAlpha(m.alpha).setDepth(m.y);
      // sa bulle
      if (m.bulle) {
        if (now >= m.bulle.until) { this.visiteBulleOff(m); return; }
        const f = this.screenFrame ? this.screenFrame() : null, b = m.bulle;
        if (f) {
          if (!b.w) { b.w = b.el.offsetWidth; b.h = b.el.offsetHeight; }
          // (la bulle reste dans l'écran : près d'un bord, elle se décale)
          const L = this.ctx.labelLayer.clientWidth || Infinity;
          const x = Math.max(4, Math.min(L - b.w - 4, (m.x - f.left) * f.k - b.w / 2));
          b.el.style.transform = `translate(${Math.round(x)}px,${Math.round((m.y - 30 - f.top) * f.k - b.h)}px)`;
        }
      }
    },

    // Le visiteur du modèle `V` : où il paraît, son chemin vers la porte ; null sans porte.
    nouveauVisiteur(V) {
      const porte = this.homeDoor ? this.homeDoor() : null;
      if (!porte || !this.fermier) return null;
      const key = 'perso_' + V.perso, d = { perso: V.perso, enfant: false };
      if (this.chargePerso) this.chargePerso(key, d);
      const dep = this.visiteDepart(V, porte);
      return {
        key, s: null, bulle: null, porte, x: dep.x, y: dep.y, depart: { x: dep.x, y: dep.y }, aller: dep.chemin,
        face: 'bas', flip: false, marche: 0, alpha: 0, fade: 1, phase: 'debut', chemin: [], attente: 0, until: 0,
        prenom: V.prenom, metier: V.metier, hameau: V.hameau, phrase: V.phrase, toc: V.toc, absent: V.absent,
        duree: Number(V.attente) || 45, proche: Number(V.proche) || 64,
      };
    },

    // D'où il vient : juste hors de la vue (DEPART.min à DEPART.max cases de la porte), du côté de son hameau, une case
    // libre d'où un chemin mène à la porte (sans traverser de mur). Sinon, juste devant la porte.
    // → { x, y, chemin }.
    visiteDepart(V, porte) {
      const W = this.grid.cols, fm = this.fermier;
      let ang = Math.random() * Math.PI * 2;
      if (Number.isInteger(V.depart)) ang = Math.atan2(Math.floor(V.depart / W) * T + T / 2 - porte.y, (V.depart % W) * T + T / 2 - porte.x);
      const vue = this.cameras.main.worldView;
      const horsVue = (q) => q.x < vue.x - 8 || q.x > vue.right + 8 || q.y < vue.y - 8 || q.y > vue.bottom + 40;
      // (d'abord hors de la vue, au plus près ; sinon plus près, dans la vue : il y paraît en fondu)
      let repli = null;
      for (const da of DEPART.essais) {
        for (let n = DEPART.min; n <= DEPART.max; n += 3) {
          const a = ang + da, r = n * T;
          const q = fm.librePres ? fm.librePres(porte.x + Math.cos(a) * r, porte.y + Math.sin(a) * r) : null;
          if (!q || (this.sousBrume && this.sousBrume(q.x, q.y - 1))) continue;
          const dehors = horsVue(q);
          if (!dehors && repli) continue;
          const info = {}, p = fm.path(q.x, q.y, porte.x, porte.y, info);
          if (!p || !p.length || p.droit) continue;
          if (dehors) return { x: q.x, y: q.y, chemin: p.slice() };
          repli = { x: q.x, y: q.y, chemin: p.slice() };
        }
      }
      return repli || { x: porte.x, y: porte.y, chemin: [] };
    },

    // Tourné vers la porte du foyer (la case de la porte, modèle.foyer), sinon de dos.
    visiteRegardePorte(m) {
      const md = this.ctx.lastModel, W = this.grid.cols;
      if (md && Number.isInteger(md.foyer)) {
        const g = K.regard((md.foyer % W) * T + T / 2 - m.x, Math.floor(md.foyer / W) * T + T / 2 - m.y);
        m.face = g.face; m.flip = g.flip;
      } else { m.face = 'haut'; m.flip = false; }
    },

    // Il repart d'où il est venu (le chemin de l'aller, à l'envers).
    visiteRepart(m) {
      m.phase = 'repart';
      const p = this.fermier && !reducedMotion() ? this.fermier.path(m.x, m.y, m.depart.x, m.depart.y, {}) : null;
      m.chemin = p && p.length && !p.droit ? p.slice() : [];
    },

    // Sa phrase d'accueil (son prénom, ce qu'il est, sa phrase).
    visiteParle(m) {
      const qui = m.metier && m.hameau ? `${m.metier} · ${m.hameau}` : m.hameau || m.metier || '';
      this.visiteBulle(m, `<strong>${esc(m.prenom)}</strong>${qui ? `<span class="habitant-bulle-metier">${esc(qui)}</span>` : ''}<span class="habitant-bulle-texte">${esc(m.phrase)}</span>`, PAROLE_MS);
    },

    visiteBulle(m, html, ms) {
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

    visiteBulleOff(m) {
      if (m.bulle) { m.bulle.el.remove(); m.bulle = null; }
    },

    visiteFin() {
      const m = this.visiteur;
      if (!m) return;
      if (m.s) m.s.destroy();
      this.visiteBulleOff(m);
      this.visiteur = null;
    },

    // Le plat posé devant la porte : son icône (le calque des étiquettes) ; le personnage qui revient
    // à la porte le prend.
    stepPlatPose(V) {
      // (le plat pris : rien jusqu'au modèle suivant, qui n'a plus de visite)
      if (!V || V.etat !== 'posee') this.visitePrise = false;
      const pose = V && V.etat === 'posee' && !this.visitePrise ? V : null;
      const porte = pose && this.homeDoor ? this.homeDoor() : null;
      let P = this.visitePlat;
      if (!porte || !this.ctx.labelLayer) { if (P) { P.el.remove(); this.visitePlat = null; } return; }
      if (!P) {
        const el = document.createElement('div');
        el.className = 'visite-plat';
        el.setAttribute('aria-label', `Un plat t'attend devant la porte : ${pose.plat.nom}`);
        el.setAttribute('role', 'img');
        const B = this.ctx.bridge;
        el.textContent = (B && B.icone ? B.icone(pose.plat.id) : '') || pose.plat.icone || '🍲';
        this.ctx.labelLayer.appendChild(el);
        P = this.visitePlat = { el, w: 0, h: 0 };
      }
      const f = this.screenFrame ? this.screenFrame() : null;
      if (f) {
        if (!P.w) { P.w = P.el.offsetWidth; P.h = P.el.offsetHeight; }
        P.el.style.transform = `translate(${Math.round((porte.x + 10 - f.left) * f.k - P.w / 2)}px,${Math.round((porte.y - f.top) * f.k - P.h)}px)`;
      }
      const joueur = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      if (joueur && Math.hypot(joueur.x - porte.x, joueur.y - porte.y) <= (Number(pose.proche) || 64)) {
        const B = this.ctx.bridge;
        if (B && B.visite) B.visite('retour');
        P.el.remove();
        this.visitePlat = null;
        this.visitePrise = true;
      }
    },

    // Le visiteur sous le doigt en (wx, wy), ou null.
    visiteurAt(wx, wy) {
      const m = this.visiteur;
      if (!m || !m.s || !m.s.visible || m.phase === 'efface') return null;
      if (Math.abs(wx - m.x) > BOITE.l || wy > m.y + BOITE.bas || wy < m.y - BOITE.h) return null;
      return m;
    },

    // (les essais : où il est, ce qu'il fait)
    visiteInfo() {
      const m = this.visiteur;
      return m ? { phase: m.phase, x: Math.round(m.x), y: Math.round(m.y), porte: m.porte, depart: m.depart, chemin: m.chemin.length, aller: m.aller.length, visible: !!(m.s && m.s.visible), alpha: m.alpha, bulle: m.bulle ? m.bulle.el.textContent : null } : null;
    },
  });
})(window);
