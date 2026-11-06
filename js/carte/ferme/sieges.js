/* carte/ferme/sieges.js — la scène de la ferme : les sièges (chaises, bancs) et la table d'un repas.
 *
 *   - un appui sur un siège posé au sol (siegeAt, appelé par hitAt ; là où on le voit : sous un toit, le toit
 *     levé) : le personnage y va et s'y assoit (asseoirSur → fermier.asseoir), tourné où regarde le siège ;
 *     un appui ailleurs (ou le diriger, l'envoyer quelque part, aller dormir) le relève (farm-stage.js tap) ;
 *     un siège où un invité est assis : rien (quelqu'un de la famille, lui, lui laisse la place) ;
 *   - pendant un repas avec des invités (js/carte/ferme/invites.js), un appui sur la table (tableRepasAt) ouvre
 *     « Servir le repas » (ctx.bridge.invites('table', { terrasse })), une fois les invités à table ;
 *   - placeSiege(e) : où l'on s'assoit sur le siège `e` (le bloc de this.blocks) : { x, y (les pieds, assis),
 *     face, flip, depth, pied: { x, y } (la case libre d'où l'on s'y assoit) }, ou null (aucune case libre
 *     autour) ; invites.js placesTable s'en sert aussi pour les places autour d'une table.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T, BLOCS_CARTE } = F.C;
  const SIEGES = new Set(['chaise_jardin', 'banc_jardin', 'meuble_chaise', 'banc_rondins', 'chaise_peinte', 'banc_pierre']);
  const TABLES = new Set(['table_jardin', 'table_rondins', 'meuble_table']);
  F.SIEGES = SIEGES;
  F.TABLES = TABLES;

  F.partie({

    // Où l'on s'assoit sur le siège `e` (voir plus haut), ou null.
    placeSiege(e) {
      if (!e) return null;
      const B = this.blocks || new Map(), cols = this.grid.cols, pris = new Set();
      for (const b of B.values()) for (const k of b.cases || [b.case]) pris.add(k);
      const libre = (x, y) => !this.fermier || !this.fermier.standable || this.fermier.standable(x, y);
      const pied = (k) => ({ x: (k % cols) * T + T / 2, y: (Math.floor(k / cols) + 1) * T - 3 });
      const vide = (k) => !pris.has(k) && libre(pied(k).x, pied(k).y);
      const j = e.case;
      const cote = [j + cols, j - 1, j + 1, j - cols].find((q) => vide(q));
      if (cote === undefined) return null;
      // (assis, il regarde où regarde son siège : de face, vers la droite, de dos, vers la gauche ;
      // js/engine/blocs.js sensBloc ; toujours dessiné devant lui, même de dos : on le voit assis)
      const sens = e.sens || 0, V = [[0, 1], [1, 0], [0, -1], [-1, 0]][sens];
      const vers = K.regard(V[0], V[1]);
      const assis = BLOCS_CARTE.assisDy || 3, prof = e.img ? e.img.depth : e.y;
      return { x: e.x, y: e.y - assis, face: vers.face, flip: vers.flip, depth: prof + 0.1, pied: pied(cote), siege: j };
    },

    // Le bloc de sorte `sortes` sous le doigt, au sol, là où on le voit (sous un toit : le toit levé), ou null.
    blocSousLeDoigt(wx, wy, sortes) {
      if (this.niveau) return null;
      const k = this.tileAtPoint(wx, wy);
      if (k < 0) return null;
      const vu = !(this.toits || []).some((t) => t.dedans.has(k) && t.img.alpha > 0.5);
      if (!vu) return null;
      // (le dossier d'une chaise dépasse de sa case : la case du dessous la touche aussi)
      const cols = this.grid.cols;
      for (const e of (this.blocks || new Map()).values()) {
        if (!sortes.has(e.sorte)) continue;
        const cases = e.cases || [e.case];
        if (cases.includes(k) || cases.includes(k + cols)) return e;
      }
      return null;
    },

    siegeAt(wx, wy) {
      return this.blocSousLeDoigt(wx, wy, SIEGES);
    },

    // Pendant un repas (les invités à table, pas encore servis), la table du repas sous le doigt → true.
    tableRepasAt(wx, wy) {
      const G = this.invitesVus, V = this.ctx.lastModel && this.ctx.lastModel.invites;
      if (!G || !G.table || !V || V.etat !== 'repondue') return false;
      if (![...G.gens.values()].some((g) => g.phase === 'table')) return false;
      const e = this.blocSousLeDoigt(wx, wy, TABLES);
      return !!e && (G.table.cases || []).includes(e.case);
    },

    // Un appui sur le siège `e` : il y va et s'y assoit ; pris, il le dit (une bulle du compagnon, sinon rien).
    asseoirSur(e) {
      const fm = this.fermier;
      if (!fm || !fm.asseoir) return false;
      const deja = fm.assis && fm.assis();
      if (deja && deja.siege === e.case) return true;
      const q = this.placeSiege(e);
      if (!q || this.siegePris(e.case)) return false;
      return fm.asseoir(q);
    },

    // Le siège `c` est-il pris par un invité (qui y vient, y est assis) ? (Quelqu'un de la famille, lui, se lève
    // et va s'asseoir ailleurs : invites.js ne lui donne pas la place du personnage.)
    siegePris(c) {
      const G = this.invitesVus;
      if (G) for (const g of G.gens.values()) if (g.place && g.place.siege === c && (g.phase === 'vient' || g.phase === 'table' || g.phase === 'merci')) return true;
      return false;
    },
  });
})(window);
