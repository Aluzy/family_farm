/* carte/ferme/caleche.js — la scène de la ferme : la calèche du grand monde (fiche 7c).
 *
 * Le moteur tient sa tournée (js/engine/caleche-tournee.js : les chemins du plan, ses arrêts, son
 * horaire) et dit où elle est à toute heure ; la page le lui demande à chaque image (le pont :
 * ctx.bridge.caleche → { x, y (px : le milieu de l'attelage, au sol), vue, gauche, etat, roule (px
 * parcourus), ferme (garée à la ferme), helable, ici, proche, heler }). Ici :
 *
 *   - l'attelage (assets/caleche.png, scripts/carte/caleche.py : le cheval, la voiture couverte, le
 *     cocher, la lanterne ; de profil, de face, de dos, retourné pour la gauche) n'est fait que près de
 *     la vue (CALECHE.pres px autour) et défait quand il s'en éloigne : ailleurs, sa position seule.
 *     Il suit sa position en douceur (le moteur avance par pas de 0,2 s) ; les roues tournent et le
 *     cheval marche selon le chemin parcouru, il s'arrête aux arrêts, attend quand on le hèle ;
 *   - la nuit, sa lanterne s'allume (la rangée de nuit de la planche, et sa lueur dans le voile de
 *     l'heure, avec les lanternes de la ferme : chantier.js stepLanterns → lumiereCaleche) ;
 *   - quand elle arrive à la ferme, une bulle (« Ding, ding ! ») monte au-dessus d'elle (la page sonne
 *     aussi : un toast, js/ui/caleche.js) ;
 *   - quand elle est proche (proche px du personnage) et hors de la vue, une icône au bord de l'écran
 *     montre sa direction ; quand on peut la héler (heler px, sur un chemin), un bouton « Héler »
 *     (dans le calque des étiquettes) : au-dessus d'elle si on la voit, sinon sur l'icône du bord ;
 *   - un appui sur elle (calecheAt, appelé par hitAt) : ctx.bridge.calecheTouchee (sa fenêtre, ou on
 *     la hèle, ou où elle va).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { reducedMotion } = F;

  // La planche (cases de w × h ; le sol sur la rangée `sol`), ses vues (5 cases chacune : les quatre
  // temps du pas puis l'arrêt), la rangée de nuit (`nuit` cases plus loin) ; `pas` : px parcourus par
  // temps du pas ; `pres` : px autour de la vue où l'attelage est fait ; la lanterne de chaque vue
  // (px de la case, de profil vers la droite : LANTERNE de scripts/carte/caleche.py) et sa lueur ;
  // `allume` : la nuit du voile à partir de laquelle elle s'allume ; l'appui : une boîte autour de lui.
  const CALECHE = {
    key: 'caleche', file: 'caleche.png', w: 96, h: 64, sol: 60.5, vues: { cote: 0, bas: 1, haut: 2 }, nuit: 15,
    pas: 9, pres: 200, suivi: 0.12, saut: 96,
    lanterne: { cote: [55, 27], bas: [68, 20], haut: [25, 31] },
    lueur: { teinte: 0xffd28a, rayon: 13, alpha: 0.95, sol: { rayon: 46, aplati: 0.6, teinte: 0xffc070, alpha: 0.8 } },
    allume: 0.12,
    boite: { l: 40, h: 50, bas: 4 },
    bulle: 4500,
  };
  const R = 32;   // le rayon de la texture « lueur » (chantier.js)

  F.partie({

    // À chaque image : où est la calèche, son attelage près de la vue, l'icône du bord, le bouton Héler.
    stepCaleche(dt) {
      const B = this.ctx.bridge;
      const e = B && B.caleche && this.ctx.monde ? B.caleche() : null;
      if (!e) { this.calecheOff(); return; }
      let C = this.calecheVue;
      if (!C) C = this.calecheVue = { x: e.x, y: e.y, roule: e.roule, ferme: e.ferme, bulle: null };
      // (elle suit sa position en douceur ; un grand saut, après une absence ou la nuit : d'un coup)
      if (Math.hypot(e.x - C.x, e.y - C.y) > CALECHE.saut || reducedMotion()) { C.x = e.x; C.y = e.y; C.roule = e.roule; } else {
        const k = 1 - Math.exp(-dt / CALECHE.suivi);
        C.x += (e.x - C.x) * k; C.y += (e.y - C.y) * k;
        C.roule += (e.roule - C.roule) * k;
      }
      const cam = this.cameras.main, v = cam.worldView, P = CALECHE.pres;
      const pres = C.x > v.x - P && C.x < v.right + P && C.y > v.y - P && C.y < v.bottom + P + CALECHE.h;
      if (pres && this.textures.exists(CALECHE.key)) {
        if (!this.calecheSprite) this.calecheSprite = this.add.image(C.x, C.y, CALECHE.key, 0).setOrigin(0.5, CALECHE.sol / CALECHE.h);
        const nuit = this.lumiere && this.lumiere.nuit > CALECHE.allume;
        const bouge = e.etat === 'route' && !reducedMotion();
        const k = bouge ? Math.floor(C.roule / CALECHE.pas) % 4 : 4;
        const frame = (nuit ? CALECHE.nuit : 0) + (CALECHE.vues[e.vue] || 0) * 5 + k;
        const s = this.calecheSprite;
        if (s.frame.name !== frame) s.setFrame(frame);
        s.setPosition(Math.round(C.x), Math.round(C.y)).setFlipX(e.vue === 'cote' && e.gauche).setDepth(C.y);
        C.vue = e.vue; C.gauche = e.gauche; C.nuit = nuit;
      } else if (this.calecheSprite) {
        this.calecheSprite.destroy();
        this.calecheSprite = null;
      }
      // son arrivée à la ferme : une bulle au-dessus d'elle
      if (e.ferme && !C.ferme && this.calecheSprite) this.calecheBulle('🔔 Ding, ding ! La calèche !');
      C.ferme = e.ferme;
      this.calecheSignes(e, C, v);
    },

    // La bulle au-dessus de l'attelage (le calque des étiquettes), CALECHE.bulle ms.
    calecheBulle(texte) {
      const C = this.calecheVue;
      if (!C || !this.ctx.labelLayer) return;
      if (!C.bulle) {
        const el = document.createElement('div');
        el.className = 'habitant-bulle caleche-bulle';
        el.setAttribute('role', 'status');
        this.ctx.labelLayer.appendChild(el);
        C.bulle = { el, w: 0, h: 0, until: 0 };
      }
      C.bulle.el.textContent = texte;
      C.bulle.w = 0;
      C.bulle.until = performance.now() + CALECHE.bulle;
    },

    // L'icône du bord de l'écran (elle est proche, hors de la vue) et le bouton Héler.
    calecheSignes(e, C, v) {
      const layer = this.ctx.labelLayer;
      if (!layer) return;
      const f = this.screenFrame();
      const W = this.scale.width / (this.cameras.main.zoom), Hh = this.scale.height / (this.cameras.main.zoom);
      const p = this.fermier && this.fermier.pos ? this.fermier.pos() : { x: this.cx, y: this.cy };
      const loin = Math.hypot(C.x - p.x, C.y - p.y);
      const dedans = C.x > v.x + 8 && C.x < v.right - 8 && C.y - 40 > v.y && C.y < v.bottom;
      // (sous le brouillard du grand monde, rien ne la trahit : ni icône, ni bouton Héler, brouillard.js)
      const brume = !!(this.sousBrume && this.sousBrume(C.x, C.y - 1));
      // l'icône du bord : proche, hors de la vue
      let S = this.calecheSigne;
      const montre = !dedans && loin <= e.proche && !brume;
      if (montre && !S) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'caleche-signe';
        el.setAttribute('aria-label', 'La calèche est proche : héler, ou voir où elle va');
        el.innerHTML = '<span class="caleche-signe-ico" aria-hidden="true">🐴</span><span class="caleche-signe-fleche" aria-hidden="true">➤</span><span class="caleche-signe-heler">Héler</span>';
        el.addEventListener('click', (ev) => { ev.stopPropagation(); if (this.ctx.bridge.calecheTouchee) this.ctx.bridge.calecheTouchee(); });
        layer.appendChild(el);
        S = this.calecheSigne = { el, w: 0, h: 0 };
      }
      if (S) {
        if (!montre) S.el.hidden = true;
        else {
          S.el.hidden = false;
          if (!S.w) { S.w = S.el.offsetWidth; S.h = S.el.offsetHeight; }
          // (sur le bord de l'écran, dans la direction de la calèche depuis le milieu de la vue)
          const cx = f.left + W / 2, cy = f.top + Hh / 2, dx = C.x - cx, dy = C.y - 24 - cy;
          const mx = (W / 2) * f.k - S.w / 2 - 8, my = (Hh / 2) * f.k - S.h / 2 - 8;
          const t = Math.min(mx / Math.max(1e-6, Math.abs(dx * f.k)), my / Math.max(1e-6, Math.abs(dy * f.k)));
          const sx = (W / 2) * f.k + dx * f.k * t, sy = (Hh / 2) * f.k + dy * f.k * t;
          S.el.style.transform = `translate(${Math.round(sx - S.w / 2)}px,${Math.round(sy - S.h / 2)}px)`;
          S.el.style.setProperty('--angle', `${Math.atan2(dy, dx)}rad`);
          S.el.classList.toggle('helable', !!e.helable);
        }
      }
      // le bouton Héler, au-dessus d'elle (on la voit, elle passe tout près)
      let Hb = this.calecheHelerBtn;
      const heler = dedans && e.helable && !!this.calecheSprite && !brume;
      if (heler && !Hb) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'caleche-heler';
        el.textContent = '🔔 Héler';
        el.addEventListener('click', (ev) => { ev.stopPropagation(); if (this.ctx.bridge.calecheTouchee) this.ctx.bridge.calecheTouchee(); });
        layer.appendChild(el);
        Hb = this.calecheHelerBtn = { el, w: 0, h: 0 };
      }
      if (Hb) {
        Hb.el.hidden = !heler;
        if (heler) {
          if (!Hb.w) { Hb.w = Hb.el.offsetWidth; Hb.h = Hb.el.offsetHeight; }
          Hb.el.style.transform = `translate(${Math.round((C.x - f.left) * f.k - Hb.w / 2)}px,${Math.round((C.y - 58 - f.top) * f.k - Hb.h)}px)`;
        }
      }
      // la bulle de son arrivée
      const b = C.bulle;
      if (b) {
        if (performance.now() > b.until || !this.calecheSprite) { b.el.remove(); C.bulle = null; } else {
          if (!b.w) { b.w = b.el.offsetWidth; b.h = b.el.offsetHeight; }
          b.el.style.transform = `translate(${Math.round((C.x - f.left) * f.k - b.w / 2)}px,${Math.round((C.y - 62 - f.top) * f.k - b.h)}px)`;
        }
      }
    },

    // Plus de calèche (pas de tournée, une autre carte) : tout se défait.
    calecheOff() {
      if (this.calecheSprite) { this.calecheSprite.destroy(); this.calecheSprite = null; }
      if (this.calecheSigne) { this.calecheSigne.el.remove(); this.calecheSigne = null; }
      if (this.calecheHelerBtn) { this.calecheHelerBtn.el.remove(); this.calecheHelerBtn = null; }
      if (this.calecheVue && this.calecheVue.bulle) this.calecheVue.bulle.el.remove();
      this.calecheVue = null;
    },

    // La lueur de sa lanterne, la nuit (chantier.js stepLanterns : le voile de l'heure).
    lumiereCaleche(out, nuit) {
      const s = this.calecheSprite, C = this.calecheVue;
      if (!s || !C || !C.nuit || nuit <= CALECHE.allume) return;
      const L = CALECHE.lanterne[C.vue] || CALECHE.lanterne.cote, G = CALECHE.lueur;
      const dx = (L[0] - CALECHE.w / 2) * (C.vue === 'cote' && C.gauche ? -1 : 1), dy = L[1] - CALECHE.sol;
      const k = Math.min(1, nuit / 0.4) * (reducedMotion() ? 1 : 0.92 + 0.08 * Math.sin(performance.now() / 260));
      out.push({ key: 'lueur', x: s.x + dx, y: s.y + 6, tint: G.sol.teinte, alpha: G.sol.alpha * k, scaleX: G.sol.rayon / R, scaleY: (G.sol.rayon * G.sol.aplati) / R });
      out.push({ key: 'lueur', x: s.x + dx, y: s.y + dy, tint: G.teinte, alpha: G.alpha * k, scaleX: G.rayon / R, scaleY: G.rayon / R });
    },

    // Un appui sur l'attelage ?
    calecheAt(wx, wy) {
      const s = this.calecheSprite, B = CALECHE.boite;
      if (!s || !s.visible || s.brume) return false;
      return Math.abs(wx - s.x) <= B.l && wy <= s.y + B.bas && wy >= s.y - B.h;
    },

    // (les mesures, les essais : où elle est)
    calecheInfo() {
      const C = this.calecheVue;
      return C ? { x: Math.round(C.x), y: Math.round(C.y), faite: !!this.calecheSprite, vue: C.vue, gauche: !!C.gauche, nuit: !!C.nuit, signe: !!(this.calecheSigne && !this.calecheSigne.el.hidden), heler: !!(this.calecheHelerBtn && !this.calecheHelerBtn.el.hidden) } : null;
    },
  });

  K.CALECHE = CALECHE;
})(window);
