/* carte/ferme/etage.js — la scène de la ferme : l'étage (un essai).
 *
 * Un escalier posé dans une pièce close ouvre un étage au-dessus d'elle et de ses murs
 * (modèle.etage : { emprise: [tuiles], blocs: [{ case, sorte }], escaliers: [tuiles] }, voir
 * js/engine/etage.js). Un appui sur l'escalier y monte, un appui sur son haut en redescend
 * (le pont : ctx.bridge.act('etage-toggle')) ; modèle.niveau dit où l'on est (0 : en bas).
 *
 * L'étage est dessiné au sommet des murs du bas : tout y est remonté de ETAGE.dy px (le haut
 * des murs hauts). Son plancher couvre l'emprise, avec le haut de l'escalier et les blocs posés
 * à l'étage. Ce qu'on voit dépend d'où est le personnage (stepEtage) :
 *   - dehors : tous les niveaux, l'un sur l'autre (le bâtiment et son étage) ;
 *   - dans le bâtiment, en bas : l'étage s'efface (ETAGE.transparent) ;
 *   - à l'étage : les blocs du bas sous l'emprise s'effacent (on voit en transparence les murs
 *     juste en dessous) ; le personnage est dessiné remonté, ne marche que sur l'emprise sans
 *     traverser les murs de l'étage (blockCells), et un mur de l'étage devant lui s'efface.
 * En mode Construire, à l'étage, un appui pose ou reprend un bloc de l'étage.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T, BLOCS_CARTE } = F.C;
  const E = BLOCS_CARTE.etage;

  F.partie({

    // L'étage du modèle, et le niveau où l'on est : dessiné (remonté de ETAGE.dy), ou ôté.
    syncEtage(etage, niveau) {
      const on = !!(etage && etage.emprise.length);
      const n = on && niveau ? 1 : 0;
      const cle = on ? JSON.stringify(etage) : '';
      if (cle === this.etageCle && n === (this.niveau || 0)) return;
      const change = n !== (this.niveau || 0);
      this.niveau = n;
      if (cle !== this.etageCle) {
        this.etageCle = cle;
        if (this.etageObjs) this.etageObjs.forEach((o) => o.destroy());
        this.etageObjs = [];
        this.etageMurs = new Map();
        this.etageEmprise = on ? new Set(etage.emprise) : null;
        this.etageBloque = new Set();
        if (on && this.has(BLOCS_CARTE.key)) {
          const cols = this.grid.cols, dy = E.dy, add = (o) => { this.etageObjs.push(o); return o; };
          const dans = (t) => this.etageEmprise.has(t);
          const pos = (t) => ({ x: (t % cols) * T + T / 2, y: (Math.floor(t / cols) + 1) * T });
          // le plancher, raccordé sur toute l'emprise, au sommet des murs du bas
          for (const t of etage.emprise) {
            const c = t % cols;
            const m = (dans(t - cols) ? 1 : 0) + (c < cols - 1 && dans(t + 1) ? 2 : 0) + (dans(t + cols) ? 4 : 0) + (c > 0 && dans(t - 1) ? 8 : 0);
            const p = pos(t);
            add(this.add.image(p.x, p.y - dy, BLOCS_CARTE.key, BLOCS_CARTE.sols + m).setOrigin(0.5, 1).setDepth(p.y + 0.5));
          }
          for (const t of etage.escaliers) {
            if (!dans(t)) continue;
            const p = pos(t);
            add(this.add.image(p.x, p.y - dy, BLOCS_CARTE.key, E.haut).setOrigin(0.5, 1).setDepth(p.y + 0.6));
          }
          // les blocs de l'étage (les murs raccordés entre eux, hauts comme en bas)
          const at = new Map(etage.blocs.map((b) => [b.case, b.sorte]));
          for (const b of etage.blocs) {
            const [key, f] = this.hautFrame(this.wallFrame(b, at, cols)), p = pos(b.case);
            const plat = BLOCS_CARTE.plats.includes(b.sorte);
            const img = add(this.add.image(p.x, p.y - dy, key, f).setOrigin(0.5, 1).setDepth(p.y + (plat ? 0.7 : 1)));
            if (BLOCS_CARTE.bloquent.includes(b.sorte)) this.etageBloque.add(b.case);
            if (key === BLOCS_CARTE.hauts.key) this.etageMurs.set(b.case, { img, x: p.x });
          }
        }
        this.etageVue = null;          // (stepEtage refait les transparences)
      }
      if (change) {
        if (this.fermier && this.fermier.regrid) this.fermier.regrid();
        // on arrive en haut (ou en bas) de l'escalier le plus proche
        if (this.fermier && this.fermier.arrive && etage) {
          const p = this.fermier.pos(), cols = this.grid.cols;
          const d = (t) => (p ? Math.hypot((t % cols) * T + T / 2 - p.x, (Math.floor(t / cols) + 1) * T - p.y) : 0);
          const pres = etage.escaliers.slice().sort((a, b) => d(a) - d(b))[0];
          if (pres !== undefined) this.fermier.arrive((pres % cols) * T + T / 2, (Math.floor(pres / cols) + 1) * T - 2);
        }
        this.etageVue = null;
      } else if (on && !n && this.fermier && this.fermier.regrid && cle) this.fermier.regrid();
    },

    // Où est le personnage : 'haut' (à l'étage), 'bas' (dans le bâtiment de l'étage, en bas) ou
    // 'dehors' ; les transparences suivent (ETAGE.transparent), et un mur de l'étage devant lui
    // s'efface (comme stepMurs en bas).
    stepEtage(dt) {
      if (!this.etageEmprise) return;
      const p = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      const cols = this.grid.cols;
      const dedans = p && this.etageEmprise.has(Math.floor((p.y - 1) / T) * cols + Math.floor(p.x / T));
      const vue = this.niveau ? 'haut' : dedans ? 'bas' : 'dehors';
      if (vue !== this.etageVue) {
        this.etageVue = vue;
        const haut = vue === 'bas' ? E.transparent : 1;
        for (const o of this.etageObjs || []) { o.setAlpha(haut); o.etageA = haut; }
        // (à l'étage : les blocs du bas, sous l'emprise, en transparence)
        for (const e of (this.blocks || new Map()).values()) {
          const sous = vue === 'haut' && this.etageEmprise.has(e.case);
          e.img.etageA = sous ? E.transparent : undefined;
          e.img.setAlpha(sous ? E.transparent : 1);
        }
      }
      // à l'étage : un mur de l'étage devant lui (une ou deux cases plus bas) s'efface
      if (vue !== 'haut' || !p || !this.etageMurs.size) return;
      const H = BLOCS_CARTE.hauts, devant = new Set();
      const gx = Math.floor(p.x / T), gy = Math.floor((p.y - 1) / T);
      for (let dy = 1; dy <= 2; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const m = this.etageMurs.get((gy + dy) * cols + gx + dx);
          if (m && Math.abs(m.x - p.x) < T / 2 + 6) devant.add(m.img);
        }
      }
      const pas = H.vitesse * dt;
      for (const m of this.etageMurs.values()) {
        const i = m.img, but = devant.has(i) ? H.alpha : 1;
        if (i.alpha !== but) i.setAlpha(i.alpha < but ? Math.min(but, i.alpha + pas) : Math.max(but, i.alpha - pas));
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

    // À l'étage, le personnage est dessiné remonté (ETAGE.dy), un peu devant le plancher.
    etageLift() {
      return this.niveau ? E.dy : 0;
    },
    // (à l'étage : devant le plancher et le haut de l'escalier de sa rangée, et une paillasse,
    // derrière les murs de l'étage de sa rangée et de celles d'en dessous)
    etageDepth(y) {
      return this.niveau ? (Math.floor((y - 1) / T) + 1) * T + 0.8 : y;
    },

    // Un point touché, ramené au sol de l'étage où l'on est (à l'étage : ETAGE.dy plus bas).
    etagePoint(wx, wy) {
      return { x: wx, y: this.niveau ? wy + E.dy : wy };
    },

    // Un escalier sous ce point (son bas, ou son haut à l'étage) : sa case, ou -1.
    escalierAt(wx, wy) {
      const e = this.ctx.lastModel && this.ctx.lastModel.etage;
      if (!e || this.room) return -1;
      const q = this.etagePoint(wx, wy), c = this.tileAtPoint(q.x, q.y);
      return e.escaliers.includes(c) ? c : -1;
    },
  });
})(window);
