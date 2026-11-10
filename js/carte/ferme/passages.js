/* carte/ferme/passages.js — la scène de la ferme : où reprend le personnage.
 *
 * La partie reprise, la page rechargée : il réapparaît là où il était (js/ui/position.js). (L'entrée de la mine et
 * le retour des grottes de la montagne, qui passaient ici, ne sont plus : docs/gisements.md, lot 4.)
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T } = F.C;

  F.partie({

    // À la création de la scène : là où il était quand on a quitté la partie ou rechargé la page (makeRetour).
    makeArrivee() {
      this.makeRetour();
      this.positionLue = true;
    },

    // La partie reprise, la page rechargée : il réapparaît là où il était (la position notée par stepPosition,
    // js/ui/position.js ; rien de noté : il sort de sa porte, comme avant), la vue sur lui. Dans le grand monde,
    // la région où il était n'est souvent pas encore faite (le Web Worker la calcule) : ses cases semblent
    // toutes fermées, et il serait ressorti de sa porte. Il y est posé quand même, exactement ; quand la région
    // arrive, sa case est vérifiée (stepRetour).
    makeRetour() {
      const B = this.ctx.bridge, p = B && B.positionGardee ? B.positionGardee() : null;
      if (!p || !this.fermier || !this.fermier.arrive) return;
      let at = this.fermier.arrive(p.x, p.y);
      if (!at) {
        at = this.fermier.arrive(p.x, p.y, null, true);
        if (at) this.retourAttendu = { t: global.performance.now() };
      }
      if (at) this.setCentre(at.x, at.y);
    },

    // La région où il a été posé à la reprise est-elle faite ? Alors, sa case libre (sinon la plus proche :
    // une pièce posée là depuis) ; au plus 20 s d'attente. → true tant qu'elle n'est pas là.
    stepRetour() {
      if (!this.retourAttendu) return false;
      const M = this.ctx.monde, p = this.fermier && this.fermier.pos ? this.fermier.pos() : null, N = global.CarteKit.REGION.tuiles;
      if (!M || !p || !N || global.performance.now() - this.retourAttendu.t > 20000) { this.retourAttendu = null; return false; }
      if (!M.region(Math.floor(p.x / T / N), Math.floor((p.y - 1) / T / N))) return true;
      this.retourAttendu = null;
      const libre = this.fermier.librePres ? this.fermier.librePres(p.x, p.y) : null;
      if (libre && (libre.x !== p.x || libre.y !== p.y)) this.fermier.arrive(libre.x, libre.y);
      return false;
    },

    // Chaque image : sa position notée (au plus une fois par seconde ; seulement ce qui change) : ses pieds,
    // ou null s'il est rentré chez lui ou monté à l'étage (il repartira alors de sa porte). Pas tant que sa
    // place de la reprise attend sa région (stepRetour).
    stepPosition(time) {
      const B = this.ctx.bridge;
      if (this.stepRetour()) return;
      if (!this.positionLue || !B || !B.positionNoter || !this.fermier || !this.fermier.pos) return;
      if (this.positionA && time - this.positionA < 1000) return;
      this.positionA = time;
      const p = this.fermier.pos(), haut = this.etageLift ? this.etageLift() > 0 : false;
      B.positionNoter(p && !haut ? { x: p.x, y: p.y } : null);
    },
  });
})(window);
