/* carte/ferme/passages.js — la scène de la ferme : la sortie vers la ville et le tronc creux.
 *
 * La flèche bleue au bout du chemin de l'est (CarteKit.FLECHE : vers la carte de transition),
 * l'arrivée d'une autre carte, et le tronc creux au bord de l'étang (la bulle « veux-tu aller
 * voir ? » qui mène à l'infra-monde).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { EXIT, HOLLOW, BUBBLE_TIP_X, BUBBLE_TIP_Y } = F.C;

  F.partie({

    /* ---------- la sortie vers la ville ---------- */

    makeExit() {
      this.exit = this.has(K.FLECHE.key) ? this.add.image(this.world.w - EXIT.inset, EXIT.y, K.FLECHE.key, 0).setDepth(1e6).setVisible(false) : null;
      // revenu de la carte de transition : au bout du chemin, la vue sur lui
      const params = new URLSearchParams(global.location.search);
      if (params.get('arrivee') !== 'est') return;
      this.arriveEast();
    },

    // Revenu d'une autre carte : au bout du chemin, la vue sur lui (l'adresse perd ?arrivee=est).
    arriveEast() {
      const params = new URLSearchParams(global.location.search);
      params.delete('arrivee');
      const q = params.toString();
      global.history.replaceState(null, '', global.location.pathname + (q ? '?' + q : '') + global.location.hash);
      const at = this.fermier && this.fermier.arrive ? this.fermier.arrive(this.world.w - EXIT.arrive, EXIT.y) : null;
      if (at) this.setCentre(at.x, at.y);
    },

    // La flèche paraît quand le personnage est tout près du bout du chemin.
    stepExit(time) {
      const a = this.exit;
      if (!a) return;
      const at = !this.room && this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      const show = !!at && Math.hypot(this.world.w - at.x, EXIT.y - at.y) <= K.FLECHE.near + EXIT.inset;
      a.setVisible(show);
      if (show) a.setPosition(Math.round(this.world.w - EXIT.inset + K.balance(time)), EXIT.y);
    },

    // Un appui sur la flèche : vers la carte de transition (true : l'appui est pris).
    tapExit(wx, wy) {
      const a = this.exit;
      if (!a || !a.visible || Math.abs(wx - a.x) > 18 || Math.abs(wy - a.y) > 18) return false;
      // (dans la page du jeu : js/ui/excursion.js ; le jeu continue de tourner)
      if (global.FermeHote) global.FermeHote.go(EXIT.page);
      else global.location.href = EXIT.page;
      return true;
    },

    /* ---------- le tronc creux : le passage vers l'infra-monde ---------- */

    // Le rectangle du tronc creux sur la carte (px), lu une fois dans ses tuiles ; null
    // s'il n'y est pas.
    hollow() {
      if (this.hollowBox !== undefined) return this.hollowBox;
      this.hollowBox = null;
      const raw = this.mapRaw;
      const layer = raw && raw.layers.find((l) => l.name === HOLLOW.layer && Array.isArray(l.data));
      if (!layer) return null;
      const T = raw.tilewidth;
      let box = null;
      layer.data.forEach((g, i) => {
        if (!HOLLOW.gids.includes(g & 0x0fffffff)) return;
        const x = (i % raw.width) * T, y = Math.floor(i / raw.width) * T;
        box = box ? { x0: Math.min(box.x0, x), y0: Math.min(box.y0, y), x1: Math.max(box.x1, x + T), y1: Math.max(box.y1, y + T) } : { x0: x, y0: y, x1: x + T, y1: y + T };
      });
      return (this.hollowBox = box);
    },

    // Un double appui en (wx, wy) : sur le tronc creux, le personnage tout près, la bulle
    // s'ouvre (renvoie true) ; sinon rien (false : le personnage y va).
    askHollow(wx, wy) {
      const b = this.hollow();
      if (!b || this.room || wx < b.x0 - 2 || wx > b.x1 + 2 || wy < b.y0 - 4 || wy > b.y1 + 2) return false;
      const at = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      if (!at) return false;
      const dx = Math.max(b.x0 - at.x, 0, at.x - b.x1), dy = Math.max(b.y0 - at.y, 0, at.y - b.y1);
      if (Math.hypot(dx, dy) > HOLLOW.near) return false;
      this.openHollowDialog();
      return true;
    },

    // La bulle de dialogue au-dessus du personnage : le texte, puis « Oui » et « Non ».
    openHollowDialog() {
      if (this.dialog) return;
      const el = document.createElement('div');
      el.className = 'stage-dialogue';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', 'Le tronc creux');
      el.innerHTML = '<p></p><div class="stage-dialogue-choix"><button type="button" data-choix="oui">Oui</button><button type="button" data-choix="non">Non</button></div>';
      el.querySelector('p').textContent = HOLLOW.text;
      // ses appuis ne vont pas à la carte
      for (const ev of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'wheel']) el.addEventListener(ev, (e) => e.stopPropagation());
      el.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.choix === 'oui') { if (global.FermeHote) global.FermeHote.go(HOLLOW.page); else global.location.href = HOLLOW.page; }
        this.closeDialog();
      });
      this.ctx.labelLayer.appendChild(el);
      this.dialog = { el, w: 0, h: 0 };
      el.querySelector('button').focus({ preventScroll: true });
    },

    closeDialog() {
      if (!this.dialog) return;
      this.dialog.el.remove();
      this.dialog = null;
    },

    // Chaque image : la bulle suit le personnage ; elle se ferme s'il s'éloigne du tronc ou
    // si la vue entre dans un bâtiment.
    placeDialog() {
      const D = this.dialog;
      if (!D) return;
      const at = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      const b = this.hollow();
      if (!at || this.room || !b || Math.hypot(Math.max(b.x0 - at.x, 0, at.x - b.x1), Math.max(b.y0 - at.y, 0, at.y - b.y1)) > HOLLOW.near * 2) { this.closeDialog(); return; }
      if (!D.w) { D.w = D.el.offsetWidth; D.h = D.el.offsetHeight; }
      const f = this.screenFrame();
      const x = Math.round((at.x - f.left) * f.k - BUBBLE_TIP_X);
      const y = Math.round((at.y - 32 - f.top) * f.k - D.h + BUBBLE_TIP_Y);
      D.el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    },
  });
})(window);
