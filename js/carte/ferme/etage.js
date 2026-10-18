/* carte/ferme/etage.js — la scène de la ferme : l'étage (un essai).
 *
 * Un escalier posé dans une pièce close ouvre un étage au-dessus d'elle et de ses murs
 * (modèle.etage : { emprise: [tuiles], blocs: [{ case, sorte }], escaliers: [tuiles] }, voir
 * js/engine/etage.js). Un appui sur l'escalier y monte, un appui sur son haut en redescend
 * (le pont : ctx.bridge.act('etage-toggle')) ; modèle.niveau dit où l'on est (0 : en bas).
 *
 * À l'étage (ETAGE) : un voile sombre couvre toute la ferme ; au-dessus, le plancher de
 * l'étage sur toute l'emprise, le haut de l'escalier, et les blocs posés à l'étage (les murs
 * hauts comme en bas). Le personnage passe devant le voile et ne marche que sur l'emprise,
 * sans traverser les murs de l'étage (blockCells) ; les blocs d'en bas sous l'emprise sont
 * cachés (ils sont sous le plancher). En mode Construire, un appui pose ou reprend un bloc de
 * l'étage.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T, BLOCS_CARTE } = F.C;
  const E = BLOCS_CARTE.etage;

  F.partie({

    // L'étage du modèle, et le niveau où l'on est : dessiné, ou ôté.
    syncEtage(etage, niveau) {
      const n = etage && etage.emprise.length && niveau ? 1 : 0;
      const cle = n ? JSON.stringify(etage) : '';
      if (cle === this.etageCle && n === (this.niveau || 0)) return;
      const change = n !== (this.niveau || 0);
      this.etageCle = cle;
      this.niveau = n;
      if (this.etageObjs) this.etageObjs.forEach((o) => o.destroy());
      this.etageObjs = [];
      this.etageEmprise = n ? new Set(etage.emprise) : null;
      this.etageBloque = new Set();
      // (les blocs d'en bas, sous le plancher de l'étage : cachés)
      for (const e of (this.blocks || new Map()).values()) {
        const sous = n && this.etageEmprise.has(e.case);
        if (sous) { e.img.setVisible(false); e.sousEtage = true; }
        else if (e.sousEtage) { e.img.setVisible(!BLOCS_CARTE.ailleurs.includes(e.sorte)); e.sousEtage = false; }
      }
      if (n && this.has(BLOCS_CARTE.key)) {
        const cols = this.grid.cols, D = E.depth, add = (o) => { this.etageObjs.push(o); return o; };
        add(this.add.rectangle(0, 0, this.world.w, this.world.h, E.voile, E.alpha).setOrigin(0).setDepth(D));
        const dans = (t) => this.etageEmprise.has(t);
        const pos = (t) => ({ x: (t % cols) * T + T / 2, y: (Math.floor(t / cols) + 1) * T });
        // le plancher, raccordé sur toute l'emprise
        for (const t of etage.emprise) {
          const c = t % cols;
          const m = (dans(t - cols) ? 1 : 0) + (c < cols - 1 && dans(t + 1) ? 2 : 0) + (dans(t + cols) ? 4 : 0) + (c > 0 && dans(t - 1) ? 8 : 0);
          const p = pos(t);
          add(this.add.image(p.x, p.y, BLOCS_CARTE.key, BLOCS_CARTE.sols + m).setOrigin(0.5, 1).setDepth(D + 1));
        }
        for (const t of etage.escaliers) {
          if (!dans(t)) continue;
          const p = pos(t);
          add(this.add.image(p.x, p.y, BLOCS_CARTE.key, E.haut).setOrigin(0.5, 1).setDepth(D + 2));
        }
        // les blocs de l'étage (les murs raccordés entre eux, hauts comme en bas)
        const at = new Map(etage.blocs.map((b) => [b.case, b.sorte]));
        for (const b of etage.blocs) {
          const [key, f] = this.hautFrame(this.wallFrame(b, at, cols)), p = pos(b.case);
          const plat = BLOCS_CARTE.plats.includes(b.sorte);
          add(this.add.image(p.x, p.y, key, f).setOrigin(0.5, 1).setDepth(D + (plat ? 3 : 10 + p.y)));
          if (BLOCS_CARTE.bloquent.includes(b.sorte)) this.etageBloque.add(b.case);
        }
      }
      if (change || n) {
        if (this.fermier && this.fermier.regrid) this.fermier.regrid();
        // on arrive en haut (ou en bas) de l'escalier le plus proche
        if (change && this.fermier && this.fermier.arrive && etage) {
          const p = this.fermier.pos(), cols = this.grid.cols;
          const pres = etage.escaliers.slice().sort((a, b) => {
            const d = (t) => (p ? Math.hypot((t % cols) * T + T / 2 - p.x, (Math.floor(t / cols) + 1) * T - p.y) : 0);
            return d(a) - d(b);
          })[0];
          if (pres !== undefined) this.fermier.arrive((pres % cols) * T + T / 2, (Math.floor(pres / cols) + 1) * T - 2);
        }
      }
    },

    // Les cases où l'on ne passe pas à l'étage : tout ce qui est hors de l'emprise, et les blocs
    // de l'étage qui arrêtent (null : on est en bas).
    etageCells() {
      if (!this.niveau || !this.etageEmprise) return null;
      const out = [], n = this.grid.cols * Math.ceil(this.world.h / T);
      for (let i = 0; i < n; i++) if (!this.etageEmprise.has(i) || this.etageBloque.has(i)) out.push(i);
      return out;
    },

    // Le personnage, à l'étage, passe devant le voile (sa profondeur + ETAGE.depth).
    etageDepth() {
      return this.niveau ? E.depth + 10 : 0;
    },

    // Un escalier sous ce point (en bas comme en haut) : sa case, ou -1.
    escalierAt(wx, wy) {
      const e = this.ctx.lastModel && this.ctx.lastModel.etage;
      if (!e || this.room) return -1;
      const c = this.tileAtPoint(wx, wy);
      return e.escaliers.includes(c) ? c : -1;
    },
  });
})(window);
