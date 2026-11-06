/* carte/ferme/rencontre.js — la scène de la ferme : une scène du récit jouée sur la carte (l'arrivée de Fernand).
 *
 * La page tient la scène (js/ui/scene.js : ses répliques, celle qui est dite) ; le modèle de la carte en donne
 * ce qu'il faut (modèle.sceneCarte : { phase (vient, parle, part), qui, nom, perso, depart (la case du monde
 * au bout du chemin de la ferme, ou null), ligne : { qui, nom, texte } pendant qu'ils parlent, i, n }, ou null).
 * Ici :
 *
 *   - il vient : le personnage de la scène (sa planche, comme les habitants) paraît au bord de la vue, du côté
 *     du bout du chemin, et marche jusqu'à côté du personnage du joueur (les cases libres, comme le visiteur
 *     de bienvenue : visite.js visiteDepart) ; arrivé, il le dit à la page (ctx.bridge.sceneCarte('la')) ;
 *   - ils parlent : les deux se regardent ; la réplique dite est une bulle au-dessus de qui parle (lui, ou le
 *     personnage du joueur : « joueur ») ; un appui sur la carte passe à la suivante (rencontreTap, appelé par
 *     tap : ctx.bridge.sceneCarte('suite')) ; la première bulle le dit (« Touche pour la suite ») ;
 *   - il part : il repart d'où il est venu et s'efface au loin ; effacé, il le dit (ctx.bridge.sceneCarte('fini')).
 * Tant qu'il vient et qu'ils parlent, le personnage du joueur ne bouge pas (rencontreRetient). Avec
 * « animations réduites », il va d'un point à l'autre sans marcher.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { reducedMotion } = F;
  const VITESSE = 52;                          // px/s : il presse le pas, on l'attend
  const FADE_S = 0.5;
  const LOIN = 320;                            // px hors de la vue : il saute au but
  const COTE = 22;                             // px : il s'arrête à côté du personnage
  const BOITE_HAUT = 30;                       // px : la bulle, au-dessus des pieds

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  F.partie({

    // À chaque image : le personnage de la scène (s'il vient, parle ou repart) et la bulle.
    stepRencontre(dt) {
      const md = this.ctx.lastModel, S = md && md.sceneCarte;
      let m = this.rencontre;
      if (!S) { if (m) this.rencontreFin(); return; }
      if (!m) {
        if (S.phase === 'part') { this.rencontreDit('fini'); return; }
        m = this.rencontre = this.nouvelleRencontre(S);
        if (!m) return;
      }
      const C = this.casesPerso ? this.casesPerso() : null;
      if (!C || !this.textures.exists(m.key)) return;
      if (!m.s) { m.s = this.add.sprite(0, 0, m.key, C('idle_bas_0')).setOrigin(0.5, 1).setVisible(false); m.s.personnage = true; }
      const vue = this.cameras.main.worldView, now = performance.now(), calme = reducedMotion();
      const joueur = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      const loin = (q) => q.x < vue.x - LOIN || q.x > vue.right + LOIN || q.y < vue.y - LOIN || q.y > vue.bottom + LOIN;
      if (S.phase === 'part' && m.phase !== 'repart' && m.phase !== 'efface') this.rencontreRepart(m);
      // marcher
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
        m.phase = 'parle';
        this.rencontreDit('la');
      }
      if (m.phase === 'parle' && joueur) {
        // ils se regardent
        ({ face: m.face, flip: m.flip } = K.regard(joueur.x - m.x, joueur.y - m.y));
        const g = K.regard(m.x - joueur.x, m.y - joueur.y);
        if (this.fermier.tourne) this.fermier.tourne(g.face, g.flip);
      }
      if (m.phase === 'repart' && (!m.chemin.length || loin(m))) m.phase = 'efface';
      if (m.phase === 'efface') {
        m.alpha = calme ? 0 : Math.max(0, m.alpha - dt / FADE_S);
        if (m.alpha <= 0) { this.rencontreFin(); this.rencontreDit('fini'); return; }
      } else if (m.alpha < 1) m.alpha = calme ? 1 : Math.min(1, m.alpha + dt / FADE_S);
      // l'image
      const s = m.s;
      s.setVisible(m.alpha > 0);
      const nom = marche ? `marche_${m.face}_${K.imageMarche(m.marche)}` : `idle_${m.face}_${Math.floor(now / 600) % 2}`;
      s.setFrame(C(nom)).setPosition(Math.round(m.x), Math.round(m.y)).setFlipX(m.flip).setAlpha(m.alpha).setDepth(m.y);
      if (global.CarteVisages) global.CarteVisages.suivre(this, s);   // (son visage)
      // la bulle : la réplique dite, au-dessus de qui parle
      const l = m.phase === 'parle' ? S.ligne : null;
      if (!l) { this.rencontreBulleOff(m); return; }
      const ou = l.qui === 'joueur' ? joueur : m;
      if (!ou) { this.rencontreBulleOff(m); return; }
      const cle = `${S.i}`;
      if (!m.bulle || m.bulle.cle !== cle) {
        const derniere = S.i >= S.n - 1;
        this.rencontreBulle(m, cle, `<strong>${esc(l.nom)}</strong><span class="habitant-bulle-texte">${esc(l.texte)}</span>${S.i === 0 ? '<span class="rencontre-aide">Touche pour la suite</span>' : ''}<span class="rencontre-suite" aria-hidden="true">${derniere ? '✓' : '▸'}</span>`, l.qui === 'joueur');
      }
      const f = this.screenFrame ? this.screenFrame() : null, b = m.bulle;
      if (f && b) {
        if (!b.w) { b.w = b.el.offsetWidth; b.h = b.el.offsetHeight; }
        // (la bulle reste dans l'écran : près d'un bord, elle se décale)
        const L = this.ctx.labelLayer.clientWidth || Infinity;
        const x = Math.max(4, Math.min(L - b.w - 4, (ou.x - f.left) * f.k - b.w / 2));
        b.el.style.transform = `translate(${Math.round(x)}px,${Math.round((ou.y - BOITE_HAUT - f.top) * f.k - b.h)}px)`;
      }
    },

    // Le personnage de la scène `S` : où il paraît (au bord de la vue, du côté du bout du chemin), où il
    // s'arrête (à côté du personnage du joueur), son chemin ; null sans personnage du joueur sur la carte.
    nouvelleRencontre(S) {
      const fm = this.fermier, joueur = fm && fm.pos ? fm.pos() : null;
      if (!joueur || !this.visiteDepart) return null;
      const d = { perso: S.perso, enfant: false, apparence: null };
      const key = this.clePerso ? this.clePerso(d) : 'perso_' + S.perso;
      if (this.chargePerso) this.chargePerso(key, d);
      // (à côté de lui, du côté d'où il vient : à droite si le bout du chemin est à l'est)
      const W = this.grid.cols, T = F.C.T;
      const est = Number.isInteger(S.depart) ? (S.depart % W) * T + T / 2 >= joueur.x : true;
      const cote = est ? COTE : -COTE;
      const cible = (fm.librePres && (fm.librePres(joueur.x + cote, joueur.y) || fm.librePres(joueur.x - cote, joueur.y))) || { x: joueur.x + cote, y: joueur.y };
      const dep = this.visiteDepart({ depart: S.depart }, cible);
      return {
        key, s: null, bulle: null, x: dep.x, y: dep.y, depart: { x: dep.x, y: dep.y }, chemin: dep.chemin.slice(),
        face: 'bas', flip: false, marche: 0, alpha: 0, phase: 'vient',
      };
    },

    // Il repart d'où il est venu.
    rencontreRepart(m) {
      this.rencontreBulleOff(m);
      m.phase = 'repart';
      const p = this.fermier && !reducedMotion() ? this.fermier.path(m.x, m.y, m.depart.x, m.depart.y, {}) : null;
      m.chemin = p && p.length && !p.droit ? p.slice() : [];
    },

    rencontreBulle(m, cle, html, joueur) {
      if (!this.ctx.labelLayer) return;
      if (!m.bulle) {
        const el = document.createElement('div');
        el.className = 'habitant-bulle rencontre-bulle';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        this.ctx.labelLayer.appendChild(el);
        m.bulle = { el, w: 0, h: 0, cle: null };
      }
      m.bulle.el.innerHTML = html;
      m.bulle.el.classList.toggle('joueur', !!joueur);
      m.bulle.cle = cle;
      m.bulle.w = 0;
    },

    rencontreBulleOff(m) {
      if (m && m.bulle) { m.bulle.el.remove(); m.bulle = null; }
    },

    rencontreFin() {
      const m = this.rencontre;
      if (!m) return;
      if (m.s) m.s.destroy();
      this.rencontreBulleOff(m);
      this.rencontre = null;
    },

    rencontreDit(quoi) {
      const B = this.ctx.bridge;
      if (B && B.sceneCarte) B.sceneCarte(quoi);
    },

    // Tant qu'il vient et qu'ils parlent, le personnage du joueur reste là.
    rencontreRetient() {
      const S = this.ctx.lastModel && this.ctx.lastModel.sceneCarte;
      return !!S && S.phase !== 'part';
    },

    // Un appui sur la carte pendant la scène : la réplique suivante (→ true : l'appui est pris).
    rencontreTap() {
      const S = this.ctx.lastModel && this.ctx.lastModel.sceneCarte;
      if (!S || S.phase === 'part') return false;
      if (S.phase === 'parle' && this.rencontre && this.rencontre.phase === 'parle') this.rencontreDit('suite');
      return true;
    },

    // (les essais : où il est, ce qu'il fait)
    rencontreInfo() {
      const m = this.rencontre;
      return m ? { phase: m.phase, x: Math.round(m.x), y: Math.round(m.y), chemin: m.chemin.length, visible: !!(m.s && m.s.visible), alpha: m.alpha, bulle: m.bulle ? m.bulle.el.textContent : null } : null;
    },
  });
})(window);
