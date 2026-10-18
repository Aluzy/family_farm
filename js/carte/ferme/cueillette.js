/* carte/ferme/cueillette.js — la scène de la ferme : ce qu'on ramasse à la main.
 *
 * Sur la ferme générée (docs/carte-generee.md, étape 3), le moteur pose chaque matin des petites
 * pierres, des morceaux de bois et des herbes sur l'herbe (js/engine/atelier.js, ramassables) :
 * le modèle les donne (modèle.ramassables : [{ id, sorte, case }]), chacun a son image
 * (assets/ramassables.png, scripts/carte/ramassables.py), rangée selon son pied. Les baies :
 * des grappes posées sur un buisson (modèle : la case du milieu de son pied ; RAMASSABLES.grappes),
 * juste devant lui. Un appui
 * dessus : le personnage va à côté, se baisse et le prend (le pont : ctx.bridge.ramasser) ; la
 * bulle « +1 » monte et l'image s'efface.
 *
 * Le bois et la pierre que la hache et la pioche lâchent (modèle.morceaux, js/engine/outils.js :
 * state.morceaux) : le personnage les prend en marchant dessus (stepPieces) ; ceux d'un coup
 * paraissent quand il porte, ceux de l'arbre qui tombe quand il touche le sol (holdPieces,
 * revealPieces ; où ils tombent : CarteKit.pointsMorceaux).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T, RAMASSABLES } = F.C;

  const M = K.MORCEAUX;
  const reduit = () => K.reduit();

  F.partie({

    /* ---------- les morceaux de bois et de pierre lâchés par la hache et la pioche ---------- */

    // Les morceaux au sol (modèle.morceaux : [{ n, item, x, y }]) : leurs images, créées ou
    // ôtées. Ceux d'un coup qui n'a pas encore porté (le personnage va frapper, l'arbre tombe)
    // attendent (piecesWait) : ils paraissent au coup (revealPieces).
    syncPieces(list) {
      if (!this.pieces) { this.pieces = new Map(); this.piecesWait = new Map(); }
      if (!this.has(RAMASSABLES.key)) return;
      const seen = new Set();
      for (const m of list || []) {
        seen.add(m.n);
        if (this.pieces.has(m.n) || this.piecesWait.has(m.n)) continue;
        if (this.piecesHold) { this.piecesWait.set(m.n, m); continue; }
        this.showPiece(m, false);
      }
      for (const [n, e] of this.pieces) if (!seen.has(n) && !e.pris) { e.img.destroy(); this.pieces.delete(n); }
      for (const n of [...this.piecesWait.keys()]) if (!seen.has(n)) this.piecesWait.delete(n);
    },

    showPiece(m, saute) {
      const img = this.add.image(m.x, m.y, RAMASSABLES.key, M.images[m.item] || 0).setOrigin(0.5, 1).setDepth(m.y - 1);
      this.pieces.set(m.n, { n: m.n, item: m.item, x: m.x, y: m.y, img });
      if (saute && !reduit()) this.tweens.add({ targets: img, y: { from: m.y - M.saut, to: m.y }, duration: M.sautMs, ease: 'Bounce.easeOut' });
    },

    // Un coup de hache ou de pioche : `appel` demande le coup au jeu (le pont) ; les morceaux
    // qu'il pose attendent. Renvoie ce que le jeu a répondu.
    holdPieces(appel) {
      if (!this.pieces) { this.pieces = new Map(); this.piecesWait = new Map(); }
      this.piecesHold = true;
      let got = null;
      try { got = appel(); } finally { this.piecesHold = false; }
      const garde = new Set();
      const M2 = got && got.morceaux;
      if (M2) for (const m of [...M2.coup, ...M2.fin]) { garde.add(m.n); if (!this.pieces.has(m.n)) this.piecesWait.set(m.n, m); }
      // (d'autres, posés entre-temps : tout de suite)
      for (const [n, m] of [...this.piecesWait]) if (!garde.has(n)) { this.piecesWait.delete(n); this.showPiece(m, false); }
      return got;
    },

    // Les morceaux `list` ([{ n }…]) tombent : ils paraissent, en rebondissant.
    revealPieces(list) {
      for (const q of list || []) {
        const m = this.piecesWait && this.piecesWait.get(q.n);
        if (!m) continue;
        this.piecesWait.delete(q.n);
        this.showPiece(m, true);
      }
    },

    // Où le personnage se placera pour frapper l'arbre ou le rocher dont le pied est en `pied`
    // (comme js/fermier.js, strike : à `dx` px à gauche s'il peut s'y tenir, sinon à droite).
    strikeSide(pied, dx) {
      const ok = this.fermier && this.fermier.standable ? this.fermier.standable(pied.x - dx, pied.y + 1) : true;
      return { x: ok ? pied.x - dx : pied.x + dx, y: pied.y + 1 };
    },

    // Les points où tombent les morceaux d'un coup sur l'arbre ou le rocher dont le pied est en
    // `pied`, le personnage frappant depuis `joueur` (chute : le sens de la chute de l'arbre ;
    // null : un rocher).
    piecePoints(pied, joueur, chute) {
      const libre = this.fermier && this.fermier.standable ? (x, y) => this.fermier.standable(x, y) : null;
      return Object.assign({ carte: 'ferme' }, K.pointsMorceaux(pied, joueur, chute, libre));
    },

    // Chaque image : le morceau sous les pieds du personnage est ramassé (le pont :
    // ctx.bridge.morceau) ; la bulle « +1 » monte. Refusé (il dort) : il reste là.
    stepPieces() {
      if (!this.pieces || !this.pieces.size || this.room) return;
      const p = this.fermier && this.fermier.pos();
      if (!p) return;
      for (const e of this.pieces.values()) {
        if (e.pris || Math.abs(p.x - e.x) > M.prise || Math.abs(p.y - e.y) > M.prise) continue;
        const got = this.ctx.bridge && this.ctx.bridge.morceau ? this.ctx.bridge.morceau(e.n) : null;
        if (!got) continue;
        e.pris = true;
        this.showGain({ [got.item]: got.n });
        K.vibre('ramasse');
        this.tweens.add({ targets: e.img, y: e.img.y - 8, alpha: 0, duration: reduit() ? 0 : 260, ease: 'Sine.easeOut', onComplete: () => { e.img.destroy(); this.pieces.delete(e.n); } });
      }
    },

    // Les images de ce qui est à ramasser : celles du modèle, créées ou ôtées.
    syncGatherables(list) {
      if (!this.gatherables) this.gatherables = new Map();
      const G = this.gatherables, seen = new Set();
      if (!this.has(RAMASSABLES.key)) return;
      const cols = this.grid.cols;
      for (const r of list || []) {
        seen.add(r.id);
        if (G.has(r.id)) continue;
        const frame = RAMASSABLES.frames[r.sorte] || 0;
        if (r.buisson) {
          // sur le buisson : le bas de son pied, ses grappes devant lui (decor.js : pied − 3)
          const bx = (r.case % cols) * T + T / 2, by = (Math.floor(r.case / cols) + 1) * T;
          const imgs = RAMASSABLES.grappes.map(([dx, dy]) => this.add.image(bx + dx, by + dy, RAMASSABLES.key, frame).setOrigin(0.5, 1).setDepth(by - 2));
          G.set(r.id, { id: r.id, sorte: r.sorte, x: bx, y: by - 8, foot: { x: bx, y: by }, imgs, busy: false });
          continue;
        }
        const x = (r.case % cols) * T + T / 2, y = Math.floor(r.case / cols) * T + RAMASSABLES.pied;
        const img = this.add.image(x, y, RAMASSABLES.key, frame).setOrigin(0.5, 1).setDepth(y);
        G.set(r.id, { id: r.id, sorte: r.sorte, x, y, imgs: [img], busy: false });
      }
      for (const [id, g] of G) if (!seen.has(id) && !g.busy) { g.imgs.forEach((i) => i.destroy()); G.delete(id); }
    },

    // Ce qu'il y a à ramasser sous le doigt (un peu plus large que l'image), ou null.
    gatherAt(wx, wy) {
      if (!this.gatherables) return null;
      const r = Math.max(10, (RAMASSABLES.doigt / this.cameras.main.zoom));
      let best = null, bd = Infinity;
      for (const g of this.gatherables.values()) {
        if (g.busy) continue;
        const d = Math.hypot(wx - g.x, wy - (g.y - 6));
        if (d <= (g.foot ? r + 10 : r) && d < bd) { best = g; bd = d; }
      }
      return best;
    },

    // Le personnage va le prendre : le moteur le met dans l'inventaire au moment du geste.
    gather(g) {
      if (this.ctx.lastModel && this.ctx.lastModel.coucher) return;   // au lit (ou en y allant) : rien
      g.busy = true;
      const prendre = () => {
        const got = this.ctx.bridge && this.ctx.bridge.ramasser ? this.ctx.bridge.ramasser(g.id) : null;
        if (!got || !got.ok) { g.busy = false; return; }
        this.showGain(got.items);
        K.vibre('ramasse');
        for (const img of g.imgs) this.tweens.add({ targets: img, y: img.y - 6, alpha: 0, duration: 260, ease: 'Sine.easeOut', onComplete: () => img.destroy() });
        this.gatherables.delete(g.id);
      };
      if (!this.fermier || !this.fermier.gather(g.foot || { x: g.x, y: g.y }, prendre)) prendre();
    },
  });
})(window);
