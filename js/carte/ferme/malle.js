/* carte/ferme/malle.js — la scène de la ferme : la malle de la calèche, au bout du chemin.
 *
 * Le moteur choisit sa place (js/engine/monde.js placeMalle : trois cases d'herbe libre le long du chemin, près de la
 * sortie de la ferme ; elles sont réservées, on n'y bâtit pas) et dit ce qu'elle contient (js/engine/caleche.js, « la
 * malle ») ; la page le donne à la scène (le pont : ctx.bridge.malle → { x, y (px : le bord gauche et le bas de ses
 * cases), cases, pleine }). Ici :
 *   - son image (assets/malle.png, scripts/carte/malle.py) : fermée quand elle est vide, ouverte quand elle contient
 *     quelque chose (à vendre, ou livré : on voit les produits) ; ses trois cases arrêtent le personnage (blockCells) ;
 *   - un appui sur elle (malleAt, appelé par hitAt) : le personnage y va (devant elle), puis la fenêtre s'ouvre
 *     (ctx.bridge.malleTouchee : la fenêtre de la calèche, js/ui/caleche.js) ; tout près, elle s'ouvre tout de suite.
 *     Le doigt qui le dirige ailleurs, ou trop longtemps en route (MALLE.attente s) : rien ne s'ouvre.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;

  // L'image : deux cases de w × h (0 fermée, 1 ouverte), le bas de ses cases sur la rangée `sol` ; l'appui : la boîte
  // de l'image ; `proche` px : assez près pour l'ouvrir sans marcher ; `arrive` px : arrivé devant elle ; `devant` px :
  // la place où il se tient, sous le milieu de la malle ; `releve` ms entre deux lectures du pont.
  const MALLE = {
    key: 'malle', file: 'malle.png', w: 50, h: 44, sol: 42,
    proche: 28, arrive: 10, devant: 9, attente: 30, releve: 400,
  };

  F.partie({

    // Ce que le pont dit de la malle (relu toutes les MALLE.releve ms), ou null (pas de malle).
    malleEtat(force) {
      const B = this.ctx.bridge, now = this.time ? this.time.now : 0;
      if (!force && this.malleLu && now - this.malleLu.t < MALLE.releve) return this.malleLu.e;
      const e = B && B.malle ? B.malle() : null;
      this.malleLu = { t: now, e };
      return e;
    },

    // Les cases de la malle (le personnage n'y passe pas : chantier.js blockCells).
    malleCells() {
      const e = this.malleEtat(true);
      return e && Array.isArray(e.cases) ? e.cases : [];
    },

    // À chaque image : son image (fermée, ouverte), et le personnage qui va l'ouvrir.
    stepMalle() {
      const e = this.malleEtat();
      if (!e || !this.textures.exists(MALLE.key)) {
        if (this.malleImg) { this.malleImg.destroy(); this.malleImg = null; }
        return;
      }
      if (!this.malleImg) {
        this.malleImg = this.add.image(e.x, e.y, MALLE.key, 0).setOrigin(0, MALLE.sol / MALLE.h).setDepth(e.y);
      }
      const frame = e.pleine ? 1 : 0;
      if (this.malleImg.frame.name !== frame) this.malleImg.setFrame(frame);
      // il y va : arrivé devant elle, la fenêtre s'ouvre
      const V = this.malleVoulue;
      if (V) {
        const p = this.fermier && this.fermier.pos ? this.fermier.pos() : null, d = this.malleDevantReel || this.malleDevant(e);
        const dir = this.manette && this.manette.dir ? this.manette.dir() : null;
        if (dir && (dir.x || dir.y)) this.malleVoulue = null;            // (le doigt le mène ailleurs)
        else if (this.time.now - V.t > MALLE.attente * 1000) this.malleVoulue = null;
        else if (p && Math.hypot(p.x - d.x, p.y - d.y) <= MALLE.arrive) {
          this.malleVoulue = null;
          if (this.ctx.bridge.malleTouchee) this.ctx.bridge.malleTouchee();
        }
      }
    },

    // La place devant la malle (où le personnage se tient pour l'ouvrir) : sous le milieu de ses cases.
    malleDevant(e) {
      return { x: e.x + 24, y: e.y + MALLE.devant };
    },

    // Un appui sur la malle ?
    malleAt(wx, wy) {
      const s = this.malleImg;
      if (!s || !s.visible) return false;
      return wx >= s.x && wx <= s.x + MALLE.w && wy <= s.y + (MALLE.h - MALLE.sol) && wy >= s.y - MALLE.sol;
    },

    // Un appui sur elle : tout près, sa fenêtre ; sinon, il y va d'abord.
    malleTouchee() {
      const e = this.malleEtat(true), B = this.ctx.bridge;
      if (!e || !B || !B.malleTouchee) return;
      const p = this.fermier && this.fermier.pos ? this.fermier.pos() : null, d = this.malleDevant(e);
      if (!p || !this.fermier.goTo || Math.hypot(p.x - d.x, p.y - d.y) <= MALLE.proche || (K.reduit && K.reduit())) { B.malleTouchee(); return; }
      const spot = this.fermier.goTo(d.x, d.y);
      if (!spot) { B.malleTouchee(); return; }
      this.malleVoulue = { t: this.time.now };
      // (la place libre la plus proche de celle voulue : c'est là qu'il arrivera)
      this.malleDevantReel = spot;
    },

    // (les essais : où elle est, ce qu'elle montre)
    malleInfo() {
      const s = this.malleImg;
      return s ? { x: Math.round(s.x), y: Math.round(s.y), frame: s.frame.name, depth: s.depth, voulue: !!this.malleVoulue } : null;
    },
  });

  K.MALLE = MALLE;
})(window);
