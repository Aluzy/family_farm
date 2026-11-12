/* carte/ferme/semis.js — la scène de la ferme : semer, avec la file des gestes.
 *
 * Comme ramasser une pierre (file.js) : choisir une graine pour une terre labourée vide (un appui,
 * ou un tracé : js/ui/elevage.js) ne la sème pas tout de suite. Une graine est posée sur chaque
 * terre et scintille (le reflet irisé de la file) ; le personnage y va, dans l'ordre, se penche et
 * sème : c'est à ce moment que le jeu prend la graine et l'énergie (bridge.semer). La graine posée
 * laisse alors la place à la vraie (le modèle). Une terre qui n'est plus vide quand vient son tour
 * est sautée ; refusée à l'arrivée (plus de graine, plus d'énergie), le jeu le dit.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T } = F.C;

  F.partie({

    // Sème `culture` sur les terres `cases` (dans cet ordre), par la file des gestes. `groupe` : un
    // tracé de plusieurs cases (la réduction de groupe, js/engine/automation.js). Renvoie le nombre
    // de terres prévues (0 : la carte ne peut pas, la page sème alors elle-même).
    semerFile(cases, culture, groupe) {
      if (!this.fermier || !this.ctx.bridge || !this.ctx.bridge.semer) return 0;
      if (this.ctx.lastModel && (this.ctx.lastModel.interieur || this.ctx.lastModel.coucher)) return 0;   // (dans une pièce, au lit)
      let n = 0;
      for (const c of cases) if (this.semerCase(c, culture, !!groupe)) n += 1;
      return n;
    },

    // Combien de graines de `culture` (sans culture : de toutes) attendent déjà d'être semées.
    semisEnAttente(culture) {
      return (this.file || []).filter((m) => m.semis && (!culture || m.semis === culture)).length;
    },

    semerCase(c, culture, groupe) {
      const cle = 'semis:' + c;
      if (this.fileA(cle)) return false;
      const cols = this.grid.cols;
      const x = (c % cols) * T + T / 2, y = Math.floor(c / cols) * T + T / 2;
      // la graine posée : la plante du jour du semis (sa première image), ou son emoji
      let img = null;
      const graine = () => {
        if (img) return img;
        if (this.has('crops') && this.ctx.crops && this.ctx.crops[culture]) img = this.add.image(x, y + T / 2 - this.cultureMonte(culture), 'crops', culture + ':0').setOrigin(0.5, 1);
        else img = this.add.text(x, y + 6, this.ctx.bridge.icone ? this.ctx.bridge.icone(culture) || '🌱' : '🌱', { fontSize: '12px' }).setOrigin(0.5, 1).setScale(0.45);
        img.setDepth(y + 1);
        return img;
      };
      const vide = () => {
        const m = this.ctx.lastModel;
        const p = m && (m.plots || []).concat(m.serre || []).find((q) => q.case === c);   // (dehors ou dans la Serre)
        return !!p && !p.culture;
      };
      const coup = () => {
        const ok = this.ctx.bridge.semer(c, culture, groupe);
        if (ok) {
          K.vibre('ramasse');
          // (la graine semée : son éclat de lumière verte, eclats.js)
          if (this.eclatSemis) this.eclatSemis(x, y + T / 2);
        }
        return ok;
      };
      this.geste({
        cle, seul: true, action: 'planter', semis: culture, images: () => [graine()],
        lache: () => { if (img) { img.destroy(); img = null; } },
        valide: vide, coup,
        lance: (opts) => this.fermier.semer(c, coup, opts),
      });
      return this.fileA(cle);
    },
  });
})(window);
