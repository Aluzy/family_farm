/* carte/ville/monture.js — la scène de la ville : le cheval du personnage.
 *
 * Monté (le moteur : js/engine/cheval.js, FermeHote.cheval), il va sous le personnage, plus
 * vite (js/ville-carte.js, update : CarteKit.cheval) ; pas dans la grotte. Descendu sur cette
 * carte (la barre d'outils : js/ui/outils.js, chevalLieu), il attend attaché à son poteau, là
 * où le personnage est descendu (CarteKit.chevalAttache) : un toucher dessus, et le personnage
 * y va puis remonte en selle (le poteau et la corde reviennent dans l'inventaire).
 *
 * Méthodes de la scène des cartes (js/ville-carte.js), posées sur son prototype : `this` est
 * la scène (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const V = global.CarteVille;
  const { hote } = V;

  V.partie({

    makeCheval() {
      this.chevalSelle = K.cheval ? K.cheval(this) : null;
      this.chevalIci = null;           // le cheval attaché sur cette carte (CarteKit.chevalAttache)
      this.chevalCle = null;
      this.chevalVa = false;           // le personnage va vers lui pour le monter
    },

    // Le cheval de la partie (FermeHote.cheval : { monte, attache, vitesse }), ou null.
    chevalEtat() {
      const H = hote();
      return H && H.cheval ? H.cheval() : null;
    },

    // Monté, ici (pas dans la grotte) : sa vitesse ; sinon 0.
    chevalVitesse() {
      const c = this.chevalEtat();
      return c && c.monte && this.chevalSelle && !this.cave ? c.vitesse : 0;
    },

    stepCheval(time) {
      const c = this.chevalEtat();
      const a = c && !c.monte && c.attache && c.attache.carte === this.nomCarte ? c.attache : null;
      const cle = a ? `${a.x},${a.y}` : null;
      if (cle !== this.chevalCle) {
        if (this.chevalIci) this.chevalIci.destroy();
        this.chevalIci = a && K.chevalAttache ? K.chevalAttache(this, a.x, a.y) : null;
        this.chevalCle = cle;
        this.chevalVa = false;
      }
      if (!this.chevalIci) return;
      this.chevalIci.step(time);
      // (allé vers lui après un toucher : arrivé, il remonte en selle)
      if (this.chevalVa && !this.path.length) {
        this.chevalVa = false;
        if (this.chevalProche()) this.monteCheval();
      }
    },

    chevalProche() {
      const p = this.chevalIci && this.chevalIci.point();
      return !!p && Math.hypot(p.x - this.heroPos.x, p.y - this.heroPos.y) <= K.CHEVAL.proche;
    },

    // Un toucher sur le cheval attaché (ou son poteau) : le monter, ou aller jusqu'à lui.
    tapCheval(w) {
      if (!this.chevalIci || !this.chevalIci.touche(w.x, w.y)) return false;
      if (this.chevalProche()) this.monteCheval();
      else {
        const p = this.chevalIci.point();
        this.goTo(p.x, p.y);
        this.chevalVa = true;
      }
      return true;
    },

    monteCheval() {
      const H = hote();
      if (H && H.monterCheval) H.monterCheval({ carte: this.nomCarte, proche: true });
    },

    // Où est le personnage (la barre d'outils : monter, descendre et attacher le cheval ici).
    chevalLieu() {
      return { carte: this.nomCarte, x: Math.round(this.heroPos.x), y: Math.round(this.heroPos.y), proche: this.chevalProche() };
    },
  });
})(window);
