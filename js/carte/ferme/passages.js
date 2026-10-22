/* carte/ferme/passages.js — la scène de la ferme : la sortie vers la ville, la mine et le tronc creux.
 *
 * La flèche bleue au bout du chemin de l'est (CarteKit.FLECHE : vers la carte de transition),
 * l'entrée de la mine (sa flèche au-dessus de la porte : vers les niveaux de la grotte),
 * l'arrivée d'une autre carte, et le tronc creux au bord de l'étang (la fenêtre « veux-tu aller
 * voir ? » qui mène à l'infra-monde).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { EXIT, MINE, HOLLOW } = F.C;

  F.partie({

    /* ---------- la sortie vers la ville ---------- */

    // Le bout du chemin : le milieu du bord droit du rectangle de la sortie (px de carte).
    exitAt() {
      const o = this.objects[EXIT.object];
      return o ? { x: o.x + o.width, y: o.y + o.height / 2 } : { x: this.world.w, y: this.world.h / 2 };
    },

    makeExit() {
      const e = this.exitAt();
      this.exit = this.has(K.FLECHE.key) ? this.add.image(e.x - EXIT.inset, e.y, K.FLECHE.key, 0).setDepth(1e6).setVisible(false) : null;
      const m = this.mineDoor();
      this.mineArrow = m && this.has(K.FLECHE.key) ? this.add.image(m.x, m.y - 58, K.FLECHE.key, K.FLECHE.sens.indexOf('haut')).setDepth(1e6).setVisible(false) : null;
      // revenu d'une autre carte (la transition, la mine) : à son arrivée, la vue sur lui
      const params = new URLSearchParams(global.location.search);
      if (['est', 'mine'].includes(params.get('arrivee'))) this.arrive(params.get('arrivee'));
    },

    // Revenu d'une autre carte : au bout du chemin (`est`) ou devant la porte de la mine
    // (`mine`), la vue sur lui (l'adresse perd ?arrivee=…).
    arrive(ou) {
      const params = new URLSearchParams(global.location.search);
      params.delete('arrivee');
      const q = params.toString();
      global.history.replaceState(null, '', global.location.pathname + (q ? '?' + q : '') + global.location.hash);
      const e = this.exitAt(), m = this.mineDoor();
      const p = ou === 'mine' && m ? { x: m.x, y: m.y + MINE.arrive } : { x: e.x - EXIT.arrive, y: e.y };
      const at = this.fermier && this.fermier.arrive ? this.fermier.arrive(p.x, p.y) : null;
      if (at) this.setCentre(at.x, at.y);
    },

    // Les flèches paraissent quand le personnage est tout près du bout du chemin, de la porte de
    // la mine.
    stepExit(time) {
      const at = !this.room && this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      const a = this.exit;
      if (a) {
        const e = this.exitAt();
        const show = !!at && Math.hypot(e.x - at.x, e.y - at.y) <= K.FLECHE.near + EXIT.inset;
        a.setVisible(show);
        if (show) a.setPosition(Math.round(e.x - EXIT.inset + K.balance(time)), e.y);
      }
      const b = this.mineArrow, m = b && this.mineDoor();
      if (m) {
        const show = !!at && this.nearMine(at);
        b.setVisible(show);
        if (show) b.setPosition(m.x, Math.round(m.y - 58 - K.balance(time)));   // (au-dessus du tas)
      }
    },

    // Un appui sur une flèche : vers la carte de transition, dans la mine (true : l'appui est pris).
    tapExit(wx, wy) {
      const touche = (a) => a && a.visible && Math.abs(wx - a.x) <= 18 && Math.abs(wy - a.y) <= 18;
      if (touche(this.mineArrow)) { this.goMine(); return true; }
      if (!touche(this.exit)) return false;
      // (dans la page du jeu : js/ui/excursion.js ; le jeu continue de tourner)
      if (global.FermeHote) global.FermeHote.go(EXIT.page);
      else global.location.href = EXIT.page;
      return true;
    },

    /* ---------- l'entrée de la mine ---------- */

    // Le pied de la porte de la mine (le milieu du bas de son rectangle, px), ou null (pas de
    // mine sur cette carte).
    mineDoor() {
      const o = this.objects && this.objects[MINE.object];
      return o ? { x: o.x + o.width / 2, y: o.y + o.height } : null;
    },

    // Le personnage en `at` est-il devant la porte ?
    nearMine(at) {
      const m = this.mineDoor();
      return !!m && Math.abs(at.x - m.x) <= MINE.near && at.y >= m.y - 4 && at.y - m.y <= MINE.near;
    },

    goMine() {
      if (global.FermeHote) global.FermeHote.go(MINE.page);
      else global.location.href = MINE.page;
    },

    // Un double appui en (wx, wy) sur le tas de la mine : le personnage devant la porte, il y
    // entre ; plus loin, il va devant la porte (true : l'appui est pris ; false : pas sur la mine).
    askMine(wx, wy) {
      const o = this.objects && this.objects[MINE.object];
      if (!o || this.room || wx < o.x || wx > o.x + o.width || wy < o.y || wy > o.y + o.height) return false;
      const at = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      if (at && this.nearMine(at)) { this.goMine(); return true; }
      const m = this.mineDoor();
      this.goHere(m.x, m.y + MINE.arrive);
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

    // La question, dans une fenêtre du jeu (FermeHote.modal, js/ui/modal.js : cadre bois, focus
    // gardé par Tab, Échap) : le texte, puis « Oui » et « Non ».
    openHollowDialog() {
      const H = global.FermeHote;
      if (this.dialog && this.dialog.isConnected) return;
      if (!H || !H.modal) return;
      const dlg = H.modal(`<h2 id="tronc-titre"><span aria-hidden="true">🌳</span> Le tronc creux</h2><p></p>
        <div class="row tronc-choix"><button type="button" class="btn primary" data-choix="oui">Oui</button><button type="button" class="btn" data-action="close-modal">Non</button></div>`,
      { labelledBy: 'tronc-titre', className: 'modal bois item-modal', focus: '[data-choix="oui"]', preventScroll: true });
      dlg.querySelector('p').textContent = HOLLOW.text;
      dlg.querySelector('[data-choix="oui"]').addEventListener('click', () => { H.closeModal(); H.go(HOLLOW.page); });
      this.dialog = dlg;
    },

    closeDialog() {
      const d = this.dialog;
      this.dialog = null;
      if (d && d.isConnected && global.FermeHote && global.FermeHote.closeModal) global.FermeHote.closeModal();
    },

    // Chaque image : la fenêtre se ferme si le personnage s'éloigne du tronc ou si la vue entre
    // dans un bâtiment.
    placeDialog() {
      const D = this.dialog;
      if (!D) return;
      if (!D.isConnected) { this.dialog = null; return; }
      const at = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      const b = this.hollow();
      if (!at || this.room || !b || Math.hypot(Math.max(b.x0 - at.x, 0, at.x - b.x1), Math.max(b.y0 - at.y, 0, at.y - b.y1)) > HOLLOW.near * 2) this.closeDialog();
    },
  });
})(window);
