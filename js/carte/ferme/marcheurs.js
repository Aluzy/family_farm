/* carte/ferme/marcheurs.js — la scène de la ferme : qui marche, pour l'herbe qui penche.
 *
 * L'herbe haute de la ferme (decor.js stepTallGrass), les roseaux, les massettes et les petites plantes du grand
 * monde (vegetation.js stepVegetation), les massifs de fleurs semés (massifs.js) penchent quand quelqu'un les
 * traverse (CarteKit.herbes) : le personnage (à pied ou à cheval), sa famille, son compagnon, les habitants des
 * hameaux, les invités, la visite, les autres joueurs (leurs images : personnage), les bêtes de la ferme et les
 * chats et les chiens (ambient-life.js : marcheur), les bêtes du grand monde qui vont à terre (faune-monde.js :
 * marcheur).
 *
 *   - marcheurs() : à chaque image, une fois : [{ x, y, dx, bouge }] (leurs pieds ; dx : de combien ils ont
 *     avancé vers la droite depuis l'image d'avant ; bouge : ils ont avancé). Les images qui en montrent un sont
 *     celles que relèvent les traces de pas, une fois par seconde, dans leur passage sur les images de la scène
 *     (traces.js releveMarcheurs : tracesMarcheurs, tracesBetes ; un second passage faisait des pointes,
 *     docs/perf.md) ; le personnage, lui, par ses pieds (fermier.pos), à chaque image. Avec « animations
 *     réduites », pas de relevé : l'herbe ne penche pas non plus.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const SAUT = 24;              // (plus d'un saut de tant de px : une porte, une arrivée ; il ne bouge pas)

  F.partie({

    marcheurs() {
      const now = this.time.now;
      if (this.herbeMarcheurs && this.herbeT === now) return this.herbeMarcheurs;
      this.herbeT = now;
      const out = this.herbeMarcheurs || (this.herbeMarcheurs = []);
      let n = 0;
      const pose = (cle, x, y, vu) => {
        const e = cle.herbeEtat || (cle.herbeEtat = { x, y });
        let dx = x - e.x;
        const d = Math.hypot(dx, y - e.y);
        e.x = x; e.y = y;
        if (!vu) return;
        const bouge = d > 0.05 && d < SAUT;
        if (!bouge) dx = 0;
        const w = out[n] || (out[n] = {});
        w.x = x; w.y = y; w.dx = dx; w.bouge = bouge;
        n++;
      };
      const p = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      if (p) pose(this.fermier, p.x, p.y, true);
      for (const L of [this.tracesMarcheurs, this.tracesBetes]) {
        for (const o of L || []) if (!o.moi) pose(o, o.x, o.y, o.active && o.visible && o.alpha > 0.3);
      }
      out.length = n;
      return out;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
