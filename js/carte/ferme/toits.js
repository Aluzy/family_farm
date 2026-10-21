/* carte/ferme/toits.js — la scène de la ferme : les toits des bâtiments.
 *
 * Chaque bâtiment bâti en blocs (une pièce close) a un toit de tuiles, posé sur son dernier
 * niveau (modèle.toits : [{ niveau, cases, dedans }], voir toits() dans js/engine/etage.js) :
 * sur ses murs (niveau 0), ou sur les murs de son étage (niveau 1), remonté comme l'étage de
 * ETAGE.dy px par niveau. Il couvre les cases du bâtiment, murs compris : un toit à croupes vu
 * de 3/4, comme ceux des immeubles de la ville (le dessin : CarteKit.toit, js/carte/toit.js).
 *
 * La Serre (la pièce du bac à semis) a un toit de verre : on voit ses cultures au travers.
 *
 * Un toit s'efface (stepToits) quand le personnage est dans son bâtiment (en bas ou à l'étage)
 * et en mode Construire ; à moitié quand le personnage passe derrière lui.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T, BLOCS_CARTE } = F.C;
  const R = BLOCS_CARTE.toits;
  // (le dessin d'un toit : CarteKit.toit, js/carte/toit.js)

  const dessine = (cases, cols, verre) => global.CarteKit.toit(cases, cols, verre);

  F.partie({

    // Les toits du modèle : dessinés (un canevas par toit), ou ôtés.
    syncToits(toits) {
      const cle = toits && toits.length && !this.room ? JSON.stringify(toits) : '';
      if (cle === (this.toitsCle || '')) return;
      this.toitsCle = cle;
      for (const t of this.toits || []) { t.img.destroy(); this.textures.remove(t.key); }
      this.toits = [];
      this.sunDirty = true;
      if (!cle) return;
      const cols = this.grid.cols, dy = BLOCS_CARTE.etage.dy;
      this.toitsN = (this.toitsN || 0) + 1;
      toits.forEach((t, i) => {
        const { cv, c0, r0, r1, dx } = dessine(t.cases, cols, !!t.verre), key = `toit_${this.toitsN}_${i}`;
        this.textures.addCanvas(key, cv);
        const lift = dy * (t.niveau + 1), x = c0 * T - dx, y = r0 * T - lift;
        const img = this.add.image(x, y, key).setOrigin(0, 0).setDepth((r1 + 1) * T + R.z);
        // (son ombre, js/carte/ferme/soleil.js : posé à `lift` px sur l'emprise, son faîtage
        // plus haut de ce que le dessin dépasse de l'emprise remontée)
        const c1 = Math.max(...t.cases.map((k) => k % cols));
        const ombre = { x0: c0 * T, x1: (c1 + 1) * T, y0: r0 * T, y1: (r1 + 1) * T, v: lift, faite: Math.max(0, cv.height - (r1 + 1 - r0) * T) };
        this.toits.push({ key, img, ombre, dedans: new Set(t.dedans), maison: !!t.maison, x0: x, x1: x + cv.width, y0: y, y1: y + cv.height, pied: (r1 + 1) * T });
      });
      this.sunDirty = true;
    },

    // Un toit s'efface quand le personnage est dans son bâtiment, ou en mode Construire ; à
    // moitié quand il passe derrière.
    stepToits(dt) {
      if (!this.toits || !this.toits.length) return;
      const p = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      const cols = this.grid.cols, bati = !!this.bati;
      const ici = p ? Math.floor((p.y - 1) / T) * cols + Math.floor(p.x / T) : -1;
      const pas = R.vitesse * dt;
      for (const t of this.toits) {
        let but = 1;
        if (bati || t.dedans.has(ici)) but = 0;
        else if (p && p.x > t.x0 - 6 && p.x < t.x1 + 6 && p.y > t.y0 && p.y - 24 < t.y1 && p.y < t.pied) but = R.derriere;   // (derrière : au-dessus du pied de la façade)
        const a = t.img.alpha;
        if (a !== but) t.img.setAlpha(a < but ? Math.min(but, a + pas) : Math.max(but, a - pas));
      }
    },
  });
})(window);
