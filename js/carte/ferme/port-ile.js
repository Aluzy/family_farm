/* carte/ferme/port-ile.js — la scène de la ferme : le port de l'île, son ponton et sa halle (docs/ile-300.md).
 *
 * Le moteur choisit sa place (js/engine/ile/port-ile.js : le sens du ponton, le côté de la halle) ; le modèle la
 * donne (model.portIle : { racine, sens, cote, halle: { x0, y0 }, poteaux, comptoir, bloquees }). Ici, ses images
 * (la planche assets/port_ile.png, port_ile.json : scripts/carte/port_ile.py) :
 *   - le ponton, d'une pièce, à plat sur l'eau (sous le personnage : on y marche) ; ses potelets, sa face et ses
 *     pieux font partie de son image ;
 *   - le plancher de la halle, à plat ; ses quatre poteaux et son comptoir, rangés selon leur pied (on passe devant
 *     et derrière) ;
 *   - son toit, au-dessus de tout : il s'efface quand le personnage est sous la halle, à moitié quand il passe
 *     derrière (comme celui d'une maison, toits.js) ;
 *   - un appui sur le comptoir (ou la case du dessus, où monte son dessin) : le personnage va devant lui, la fenêtre
 *     du port s'ouvre (hameaux.js comptoirTouche) ; les poteaux et le comptoir ferment la marche (blockCells).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T, BLOCS_CARTE } = F.C;
  const R = BLOCS_CARTE.toits;
  // le toit : posé HAUT px au-dessus du pied des poteaux de devant (leur haut, moins son débord : port_ile.py)
  const TOIT = { haut: 44 - 5 };

  F.partie({
    // Les images de la planche : la texture (ses cadres ajoutés une fois) et la table.
    portIleTexture() {
      if (this.portIleTex !== undefined) return this.portIleTex;
      this.portIleTex = null;
      if (!this.textures.exists('port_ile')) return null;
      const table = this.cache.json.get('port_ile_cases');
      if (!table) return null;
      const tex = this.textures.get('port_ile');
      for (const [nom, [x, y, w, h]] of Object.entries(table)) if (!tex.has(nom)) tex.add(nom, 0, x, y, w, h);
      this.portIleTex = { table };
      return this.portIleTex;
    },

    // Le port du modèle, posé (ou ôté) : ses images refaites quand il change.
    syncPortIle(p) {
      const cle = p ? `${p.racine},${p.sens},${p.cote}` : '';
      if (cle === this.portIleCle) return;
      this.portIleCle = cle;
      const e = this.portIleVu;
      if (e) for (const i of e.images) i.destroy();
      this.portIleVu = null;
      const P = p && this.portIleTexture();
      if (!P) return;
      const W = this.grid.cols, tb = P.table, images = [];
      const pose = (nom, x, y, depth) => {
        const [, , , , px, py] = tb[nom];
        const img = this.add.image(x - px, y - py, 'port_ile', nom).setOrigin(0, 0).setDepth(depth);
        images.push(img);
        return img;
      };
      // le ponton : son ancrage, le coin haut gauche de sa culée ; à plat (on y marche)
      const rx = (p.racine % W) * T, ry = Math.floor(p.racine / W) * T;
      pose(`ponton_${p.sens}`, rx, ry, 0.3);   // (au-dessus de l'eau animée, eau-monde.js : 0.1)
      // la halle : son plancher, puis ses poteaux et son comptoir rangés selon leur pied
      const hx = p.halle.x0 * T, hy = p.halle.y0 * T;
      pose('halle_sol', hx + 24, hy + 3 * T + 2, 0.31);
      for (const c of p.poteaux) {
        const x = (c % W) * T + T / 2, y = (Math.floor(c / W) + 1) * T;
        pose('halle_poteau', x, y, y);
      }
      const cy = hy + 2 * T;
      pose('halle_comptoir', hx + 24, cy, cy);
      // le toit : au-dessus de tout ce qui est sous lui
      const pied = hy + 3 * T;
      const toit = pose('halle_toit', hx + 24, pied - TOIT.haut, pied + R.z);
      const dedans = new Set();
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) dedans.add((p.halle.y0 + r) * W + p.halle.x0 + c);
      this.portIleVu = { images, toit, dedans, x0: toit.x, x1: toit.x + toit.width, y0: toit.y, y1: pied, cases: p.comptoir };
    },

    // Chaque image : le toit s'efface sous la halle, à moitié quand le personnage passe derrière.
    stepPortIle() {
      const e = this.portIleVu;
      if (!e || !this.fermier) return;
      const p = this.fermier.info ? this.fermier.info() : null;
      if (!p) return;
      const W = this.grid.cols, ici = Math.floor((p.y - 1) / T) * W + Math.floor(p.x / T);
      let but = 1;
      if (e.dedans.has(ici)) but = 0;
      else if (p.x > e.x0 - 6 && p.x < e.x1 + 6 && p.y > e.y0 && p.y < e.y1 - 2 * T) but = R.derriere;
      const a = e.toit.alpha;
      if (Math.abs(a - but) > 0.01) e.toit.setAlpha(a + (but - a) * 0.2);
    },

    // Les cases que le port ferme à la marche (ses poteaux, son comptoir).
    portIleCells() {
      const m = this.ctx.lastModel;
      return (m && m.portIle && m.portIle.bloquees) || [];
    },

    // Un appui sur le comptoir du port de l'île (ou la case du dessus) → { comptoir } (hitAt), ou null.
    portIleComptoirAt(t) {
      const m = this.ctx.lastModel;
      if (!m || !m.portIle || m.bati) return null;
      const W = this.grid.cols, c = m.portIle.comptoir;
      return c.includes(t) || c.includes(t + W) ? { comptoir: { comptoir: c } } : null;
    },
  });
})(window);
