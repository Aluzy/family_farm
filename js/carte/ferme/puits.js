/* carte/ferme/puits.js — la scène de la ferme : aller remplir la cruche au puits (fiche 17).
 *
 * Un appui sur le puits posé (ou sur la case de la cruche, dans la barre d'outils : js/ui/outils.js),
 * la cruche pas pleine : la page demande à la scène d'y envoyer le personnage (FarmStage.allerAuPuits).
 * Il y va par un vrai chemin (js/fermier.js puiser : la même recherche que ses autres trajets, qui
 * passe par les portes et contourne les murs, les meubles et les blocs ; jamais sauté), se place à
 * côté du puits, tourné vers lui (dessous d'abord : on le voit de dos ; puis à gauche, à droite, au-
 * dessus), plonge la cruche et la remonte : alors seulement le jeu la remplit (le pont :
 * ctx.bridge.puiser(case du puits), js/engine/cruche.js remplirCruche, qui ne remplit que sur la case
 * d'un puits). Un puits qu'on ne peut pas rejoindre (enfermé, le personnage dans une pièce sans
 * porte) ou trop loin (plus de PUITS_MAX cases de chemin, ou hors de portée de la recherche : dans le
 * grand monde, loin de la ferme) : rien ne bouge, la page le dit.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T } = F.C;
  // Au-delà de tant de cases de chemin, le puits est trop loin : on ne traverse pas la ferme
  // pour une cruche (la ferme fait 144 cases de large).
  const PUITS_MAX = 90;

  F.partie({

    // Les places d'où puiser : à côté de chaque puits posé, sur une case libre ; { x, y (les
    // pieds), face, flip, puits (sa case) }.
    placesPuits() {
      const cols = this.grid.cols, out = [];
      const pied = (k) => ({ x: (k % cols) * T + T / 2, y: (Math.floor(k / cols) + 1) * T - 2 });
      for (const e of (this.blocks || new Map()).values()) {
        if (e.sorte !== 'puits') continue;
        const k = e.case, c = k % cols;
        const cotes = [
          { k: k + cols, face: 'haut', flip: false },                 // dessous, de dos
          c > 0 ? { k: k - 1, face: 'cote', flip: false } : null,      // à gauche, tourné vers la droite
          c < cols - 1 ? { k: k + 1, face: 'cote', flip: true } : null, // à droite, vers la gauche
          { k: k - cols, face: 'bas', flip: false },                  // dessus, de face
        ];
        for (const q of cotes) if (q && q.k >= 0) out.push({ ...pied(q.k), face: q.face, flip: q.flip, puits: k });
      }
      return out;
    },

    // Fiche 17 : le personnage va remplir la cruche au puits le plus proche par le chemin.
    // { ok: true } : il y va (le jeu remplit la cruche quand il puise) ; sinon { ok: false,
    // raison } : 'sans' (pas de personnage sur la carte, ou pas de puits posé), 'ferme' (aucun
    // chemin ne mène à un puits), 'loin' (trop loin).
    allerAuPuits() {
      const f = this.fermier;
      if (!f || !f.puiser || this.niveau) return { ok: false, raison: 'sans' };
      const places = this.placesPuits().filter((p) => f.standable(p.x, p.y));
      if (!this.placesPuits().length) return { ok: false, raison: 'sans' };
      if (!places.length) return { ok: false, raison: 'ferme' };
      const de = f.pos() || (this.homeDoor ? this.homeDoor() : null);
      if (!de) return { ok: false, raison: 'sans' };
      let best = null, loin = false;
      for (const p of places) {
        const info = {};
        const path = f.path(de.x, de.y, p.x, p.y, info);
        // (trop loin pour la recherche : un chemin « tout droit », ou pas de chemin sans que le
        // but soit enfermé)
        if (!path) { if (!info.impossible) loin = true; continue; }
        if (path.droit) { loin = true; continue; }
        let n = 0, x = de.x, y = de.y;
        for (const q of path) { n += Math.hypot(q.x - x, q.y - y); x = q.x; y = q.y; }
        if (n > PUITS_MAX * T) { loin = true; continue; }
        if (!best || n < best.n) best = { p, n };
      }
      if (!best) return { ok: false, raison: loin ? 'loin' : 'ferme' };
      const p = best.p, bridge = this.ctx.bridge;
      const ok = f.puiser(p, p.face, p.flip, (arrive) => {
        if (bridge && bridge.puiser) bridge.puiser(arrive ? p.puits : null);
      });
      return ok ? { ok: true, puits: p.puits } : { ok: false, raison: 'ferme' };
    },
  });
})(window);
