/* carte/ferme/coupfort.js — la scène de la ferme : le coup fort.
 *
 * Un appui maintenu sur le personnage qui tient un outil (la houe, la hache, la pioche ou la
 * faux) : passé COUP_FORT.arme ms, il tient l'outil prêt et tremble, de plus en plus fort ;
 * relâché une fois la charge pleine (COUP_FORT.plein ms), il frappe fort (DATA.COUP_FORT) :
 *   - la hache, sur l'arbre le plus proche : le coup compte pour plusieurs ;
 *   - la pioche, sur le rocher le plus proche : de même ;
 *   - la faux : il tournoie, la lame balaie un cercle et fauche toutes les touffes autour de lui ;
 *   - la houe : les tuiles labourables autour de lui sont labourées d'un coup.
 * Relâché avant la charge pleine : rien (avant qu'il tremble : un appui ordinaire). Le doigt
 * qui glisse annule la charge (il marche).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T, COUP_FORT } = F.C;
  const { pixelRatio, reducedMotion } = F;
  const C = COUP_FORT;

  F.partie({

    // L'outil en main, s'il y en a un qui frappe fort : 'houe', 'hache', 'pioche', 'faux' ou null.
    outilFort() {
      const m = this.ctx.lastModel;
      if (!m || this.room) return null;
      return m.houe ? 'houe' : m.hache ? 'hache' : m.pioche ? 'pioche' : m.faux ? 'faux' : null;
    },

    // L'appui commence en (wx, wy) : sur le personnage, un outil en main, la charge commence
    // (renvoie { outil, t0 }), sinon null.
    chargeStart(wx, wy) {
      const outil = this.outilFort();
      const p = outil && this.fermier && this.fermier.pos();
      if (!p) return null;
      const min = (C.doigt * pixelRatio()) / this.cameras.main.zoom / 2;
      const hx = Math.max(7, min), haut = Math.max(28, min * 2), bas = Math.max(3, min / 2);
      if (Math.abs(wx - p.x) > hx || wy < p.y - haut || wy > p.y + bas) return null;
      return { outil, t0: performance.now(), plein: false };
    },

    // Chaque image, l'appui tenu : la charge monte, il tremble.
    stepCharge() {
      const d = this.drag, f = d && d.fort;
      if (!f || !this.fermier) return;
      const t = performance.now() - f.t0;
      if (t < C.arme) return;
      const k = Math.min(1, (t - C.arme) / (C.plein - C.arme));
      this.fermier.charge(Math.max(0.01, k), C.poses[f.outil]);
      if (k >= 1 && !f.plein) { f.plein = true; K.vibre('houe'); }
    },

    // Le doigt a glissé : la charge s'arrête.
    chargeCancel(d) {
      if (!d || !d.fort) return;
      d.fort = null;
      if (this.fermier) this.fermier.charge(0);
    },

    // Le doigt se relève : charge pleine, le coup fort ; commencée, rien ; pas encore
    // commencée, false (l'appui est un appui ordinaire).
    chargeEnd(d) {
      const f = d.fort;
      d.fort = null;
      const t = performance.now() - f.t0;
      if (t < C.arme) return false;
      if (this.fermier) this.fermier.charge(0);
      if (f.plein) this.coupFort(f.outil);
      return true;
    },

    coupFort(outil) {
      const p = this.fermier && this.fermier.pos();
      if (!p) return;
      if (outil === 'hache') {
        const t = this.nearest((this.mapTrees() || []).filter((a) => !a.gone && !a.falling), (a) => a.foot, p);
        if (t) this.chop(t, true);
        else this.fermier.actHere('couper', () => K.secousse(this, 'fort'));
        return;
      }
      if (outil === 'pioche') {
        const r = this.nearest((this.rocks || []).filter((q) => !q.gone && !q.breaking && q.box), (q) => ({ x: (q.box.x0 + q.box.x1) / 2, y: q.foot }), p);
        if (r) this.mine(r, true);
        else this.fermier.actHere('piocher', () => K.secousse(this, 'fort'));
        return;
      }
      if (outil === 'faux') { this.spinScythe(p); return; }
      if (outil === 'houe') this.hoeAround(p);
    },

    // Le plus proche de `p` dans `list` (pied : `pied(e)`), à moins de C.portee px, ou null.
    nearest(list, pied, p) {
      let best = null, bd = C.portee;
      for (const e of list) {
        const q = pied(e), dd = Math.hypot(q.x - p.x, q.y - p.y);
        if (dd <= bd) { best = e; bd = dd; }
      }
      return best;
    },

    // La faux : il tournoie ; un cercle balayé autour de ses pieds, les touffes à moins de
    // C.rayonFaux px se couchent et s'effacent, leur paille tombe à leur pied.
    spinScythe(p) {
      const prises = (this.tallGrass || []).filter((g) => g.img && g.img.visible && !g.cut && !g.tombe && Math.hypot(g.x - p.x, g.y - p.y) <= C.rayonFaux);
      const points = {};
      for (const g of prises) points[g.id] = [{ x: g.x, y: Math.round(g.y) }];
      const got = prises.length
        ? this.holdPieces(() => (this.ctx.bridge && this.ctx.bridge.scytheAround ? this.ctx.bridge.scytheAround(prises.map((g) => g.id), { carte: 'ferme', points }) : null))
        : null;
      const fauchees = new Set(got ? got.fauchees : []);
      const touffes = prises.filter((g) => fauchees.has(g.id));
      const M2 = (got && got.morceaux) || { coup: [], fin: [] };
      for (const g of touffes) g.tombe = true;
      const fin = () => {
        for (const g of touffes) {
          if (!g.tombe) continue;
          g.tombe = false;
          g.cut = true;
          this.showGrass(g);
        }
        this.revealPieces(M2.coup);
      };
      this.time.delayedCall(9000, fin);           // (filet : le geste n'a pas eu lieu)
      const hit = () => {
        K.vibre('fort');
        K.secousse(this, 'fort');
        this.swoosh(p);
        const imgs = touffes.flatMap((g) => [g.img, g.fleurs]).filter(Boolean);
        if (!imgs.length || reducedMotion()) { fin(); return; }
        this.tweens.add({ targets: imgs, scaleY: 0.2, alpha: 0, duration: 220, ease: 'Quad.easeIn',
          onComplete: () => { for (const i of imgs) i.setScale(1).setAlpha(1); fin(); } });
      };
      this.fermier.spin(hit);
    },

    // Le cercle que la lame balaie : un arc clair qui fait le tour de ses pieds et s'efface.
    swoosh(p) {
      if (reducedMotion()) return;
      const g = this.add.graphics().setDepth(p.y + 1);
      const R = C.rayonFaux - 2, cx = p.x, cy = p.y - 3;
      const o = { a: 0 };
      this.tweens.add({
        targets: o, a: 1, duration: 320, ease: 'Sine.easeOut',
        onUpdate: () => {
          g.clear();
          const fin = -Math.PI / 2 + o.a * Math.PI * 2;
          g.lineStyle(2, 0xf4f8fb, 0.75 * (1 - o.a * 0.6));
          g.beginPath();
          g.arc(cx, cy, R, fin - Math.PI * 0.9, fin, false);
          g.strokePath();
        },
        onComplete: () => g.destroy(),
      });
    },

    // La houe : les tuiles labourables (modèle.labourables) à C.rayonHoue tuile(s) autour de la
    // sienne, labourées d'un coup au coup de houe.
    hoeAround(p) {
      const m = this.ctx.lastModel;
      const W = this.grid.cols, H = (this.mapRaw && this.mapRaw.height) || Infinity;
      const ok = new Set((m && m.labourables) || []);
      const c0 = Math.floor(p.x / T), r0 = Math.floor((p.y - 1) / T);
      const cases = [];
      for (let r = r0 - C.rayonHoue; r <= r0 + C.rayonHoue; r++) {
        for (let c = c0 - C.rayonHoue; c <= c0 + C.rayonHoue; c++) {
          if (c < 0 || r < 0 || c >= W || r >= H) continue;
          if (ok.has(r * W + c)) cases.push(r * W + c);
        }
      }
      this.fermier.actHere('labourer', () => {
        K.vibre('fort');
        K.secousse(this, 'fort');
        if (cases.length) this.ctx.bridge.act('hoe-many', { cases: cases.join(',') });
      });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
