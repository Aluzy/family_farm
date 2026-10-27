/* carte/ferme/compagnon.js — la scène de la ferme : où le compagnon fait ses initiatives (fiche 19).
 *
 * Le compagnon (le second adulte du foyer, js/famille-ferme.js) a, en plus des bêtes, des tâches à
 * lui (js/engine/compagnon.js tachesCompagnon) : « arroser:<case> » (un légume qui a soif),
 * « puits:<case> » (remplir sa cruche), « cuisiner » (à la cuisinière posée), « ramasser:<id> » (un
 * morceau de bois ou une petite pierre posés ce matin, js/carte/ferme/cueillette.js). Pour chacune,
 * lieuCompagnon donne où il se tient et le geste qu'il y fait :
 *
 *   { x, y (ses pieds), face, flip (tourné vers ce qu'il travaille), geste }
 *
 * geste : 'arroser' (la cruche penchée, les images arrose_<vue>_<n>), 'puiser' (penché sur la
 * margelle, plante_<vue>_<n>, comme le personnage), 'cuisiner' (à la cuisinière, cuisine_<n>),
 * 'ramasser' (il se baisse, ramasse_<n>). Le dessin des gestes est dans js/famille-ferme.js
 * (GESTES) ; le chemin, celui du personnage (fermier.path : par les portes, jamais au travers d'un
 * mur). null : pas de place libre à côté (il n'y va pas, il fera autre chose).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T } = F.C;

  F.partie({

    // Les places à côté de la case `k` (dessous, à gauche, à droite, dessus), tourné vers elle,
    // celles où l'on peut se tenir.
    placesAutour(k) {
      const cols = this.grid.cols, c = k % cols, f = this.fermier;
      const pied = (q) => ({ x: (q % cols) * T + T / 2, y: (Math.floor(q / cols) + 1) * T - 2 });
      const cotes = [
        { k: k + cols, face: 'haut', flip: false },
        c > 0 ? { k: k - 1, face: 'cote', flip: false } : null,
        c < cols - 1 ? { k: k + 1, face: 'cote', flip: true } : null,
        k - cols >= 0 ? { k: k - cols, face: 'bas', flip: false } : null,
      ];
      return cotes.filter(Boolean).map((q) => ({ ...pied(q.k), face: q.face, flip: q.flip }))
        .filter((p) => !f || !f.standable || f.standable(p.x, p.y));
    },

    // Où le compagnon fait la tâche `lieu` (voir plus haut), ou null.
    lieuCompagnon(lieu) {
      const s = String(lieu), i = s.indexOf(':');
      const sorte = i < 0 ? s : s.slice(0, i), ref = i < 0 ? '' : s.slice(i + 1);
      const cols = this.grid.cols, f = this.fermier;
      const libre = (x, y) => !f || !f.standable || f.standable(x, y);
      if (sorte === 'arroser') {
        // (à gauche du légume, tourné vers lui, sinon à droite : comme le personnage)
        const k = Number(ref);
        if (!Number.isInteger(k)) return null;
        const x0 = (k % cols) * T, y = Math.floor(k / cols) * T + 14;
        const g = { x: x0 - 2, y, face: 'cote', flip: false, geste: 'arroser' };
        const d = { x: x0 + T + 2, y, face: 'cote', flip: true, geste: 'arroser' };
        return libre(g.x, g.y) ? g : libre(d.x, d.y) ? d : null;
      }
      if (sorte === 'puits') {
        const k = Number(ref);
        const p = (this.placesPuits ? this.placesPuits() : []).find((q) => q.puits === k && libre(q.x, q.y));
        return p ? { x: p.x, y: p.y, face: p.face, flip: p.flip, geste: 'puiser' } : null;
      }
      if (sorte === 'cuisiner') {
        for (const e of (this.blocks || new Map()).values()) {
          if (e.sorte !== 'cuisiniere') continue;
          const p = this.placesAutour(e.case)[0];
          if (p) return { ...p, geste: 'cuisiner' };
        }
        return null;
      }
      if (sorte === 'ramasser') {
        // (l'identifiant : « <sorte>:<case> », js/engine/atelier.js ramassables)
        const k = Number(ref.slice(ref.lastIndexOf(':') + 1));
        if (!Number.isInteger(k)) return null;
        const x = (k % cols) * T + T / 2, y = (Math.floor(k / cols) + 1) * T - 3;
        const p = libre(x, y) ? { x, y } : (f && f.librePres ? f.librePres(x, y) : null);
        return p ? { x: p.x, y: p.y, face: 'bas', flip: false, geste: 'ramasser' } : null;
      }
      return null;
    },
  });
})(window);
