/* carte/ferme/sol-gpu.js — l'essai des objets GPU de Phaser 4 pour le sol du grand monde (fiche 34).
 *
 * Éteint par défaut. Allumé (CarteKit.essaiSolGPU() : localStorage['ferme-essai-sol-gpu'] = '1' pour le sol,
 * '2' pour le sol et le menu décor), une région du grand monde entièrement hors de la ferme ne
 * peint plus son sol dans des morceaux de canevas (sol.js) : chacune de ses couches de tuiles devient un
 * TilemapGPULayer (un seul quad, dessiné par un shader qui lit les tuiles dans une texture de données), sur
 * la planche réunie et extrudée assets/sol_gpu.png (scripts/carte/planche_sol_gpu.py) ;
 * avec '2', ses petites plantes et petites pierres (vegetation.js peintVegetation) deviennent un
 * SpriteGPULayer par planche (un appel de dessin pour toutes) ; avec '1', elles ne sont pas dessinées. Ce qui n'y est pas : le décor des chemins (gravier.js), la
 * lecture du sol par les touffes d'herbe (herbes.js : lireSol rend null sur ces régions), les petites
 * pièces prises (la région est refaite quand le monde change : quandRegion).
 *
 * L'essai mesure et regarde ; la décision est écrite dans docs/architecture-phaser.md (« Les objets GPU »).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T } = F.C;
  const FOND = 0x6a8157;              // le vert de l'herbe, sous les tuiles (comme sol.js)
  const PLANCHE = 'sol_gpu';           // assets/sol_gpu.png : la ferme (75 colonnes) en haut, les sols dessous
  const COLS_SOLS = 16;                // les colonnes de assets/sols_monde.png

  let essai = null;
  K.essaiSolGPU = function () {
    if (essai !== null) return essai;
    try {
      const v = global.localStorage.getItem('ferme-essai-sol-gpu');
      essai = v === '1' || v === '2' ? Number(v) : 0;
    } catch (e) { essai = 0; }
    return essai;
  };

  F.partie({

    // Cette région a-t-elle son sol en objets GPU ? (l'essai allumé, le grand monde, rien de la ferme)
    solGPU(r) {
      if (!K.essaiSolGPU() || !this.ctx.monde || !this.has(PLANCHE) || !this.planche()) return false;
      return this.regionParts(r).ferme.length === 0;
    },

    // Le sol de la région en couches GPU (refait en entier : la région est arrivée ou a changé).
    solGPUFaire(r) {
      this.solGPUDefaire(r);
      const G = r.gpu = { fond: this.add.rectangle(r.x, r.y, r.w, r.h, FOND).setOrigin(0).setDepth(0), couches: [], deco: [] };
      const M = this.ctx.monde, reg = M.region(r.rx, r.ry), P = this.planche();
      if (!reg || !P) return;
      const t0 = performance.now();
      const S = M.tuiles, D = S.DECALAGE, NK = S.COUCHES, couches = reg.couches;
      const set = P.set, colsF = set.columns || Math.floor(P.img.width / T), rf = Math.floor(P.img.height / T);
      // (la planche est déjà extrudée par son script : marge 1, espacement 2)
      const colsC = Math.floor(this.textures.get(PLANCHE).getSourceImage().width / (T + 2));
      const w = r.c1 - r.c0, h = r.r1 - r.r0;
      for (let k = 0; k < NK; k++) {
        const data = [];
        let rien = true;
        for (let y = 0; y < h; y++) {
          const ligne = new Array(w).fill(-1);
          const yy = r.r0 + y - reg.y0;
          if (yy >= 0 && yy < reg.h) {
            for (let x = 0; x < w; x++) {
              const xx = r.c0 + x - reg.x0;
              if (xx < 0 || xx >= reg.l) continue;
              const o = (yy * reg.l + xx) * NK;
              // (les couches d'une case sont contiguës : une couche vide, celles du dessus aussi)
              let vide = false;
              for (let j = 0; j <= k; j++) if (!couches[o + j]) { vide = true; break; }
              if (vide) continue;
              const v = couches[o + k];
              let n;
              if (v >= D) { const s = v - D; n = (rf + ((s / COLS_SOLS) | 0)) * colsC + (s % COLS_SOLS); } else { const f = v - set.firstgid; n = ((f / colsF) | 0) * colsC + (f % colsF); }
              ligne[x] = n;
              rien = false;
            }
          }
          data.push(ligne);
        }
        if (rien) break;
        const carte = this.make.tilemap({ data, tileWidth: T, tileHeight: T });
        const jeu = carte.addTilesetImage(PLANCHE, PLANCHE, T, T, 1, 2);
        const couche = carte.createLayer(0, jeu, r.x, r.y, true);
        if (!couche) continue;
        couche.setDepth(0);
        G.couches.push({ carte, couche });
      }
      if (K.essaiSolGPU() === 2) this.solGPUDeco(r, reg);
      G.ms = performance.now() - t0;
      this.solGPUFaits = (this.solGPUFaits || 0) + 1;
    },

    // Ses petites plantes et petites pierres : un SpriteGPULayer par planche (vegetation.js : les mêmes que
    // peintVegetation peint dans le sol).
    solGPUDeco(r, reg) {
      const V = this.vegetationPrete ? this.vegetationPrete() : null;
      if (!V) return;
      const pris = this.mondeEtat && this.mondeEtat.pris.size ? this.mondeEtat.pris : null, M = this.ctx.monde;
      for (const P of V.planches) {
        if (!reg[P.donnees]) continue;
        const b = reg[P.donnees].basses, tex = this.textures.get(P.cle);
        const n = b.length / 4;
        if (!n) continue;
        const couche = this.add.spriteGPULayer(P.cle, n).setDepth(0);
        for (let k = 0; k < b.length; k += 4) {
          const x = b[k + 1], y = b[k + 2];
          const f = P.images[b[k]][b[k + 3]], c = P.cadres[f];
          if (!tex.get(f)) continue;
          if (pris && P.regles[b[k]] && pris.has(M.idObjet(P.sortes[b[k]].nom, x, y))) continue;
          couche.addMember({ x: x - c.px, y: y - c.py, frame: f, originX: 0, originY: 0 });
        }
        r.gpu.deco.push(couche);
      }
    },

    solGPUDefaire(r) {
      const G = r.gpu;
      if (!G) return;
      if (G.fond) G.fond.destroy();
      for (const c of G.couches) { c.couche.destroy(); c.carte.destroy(); }
      for (const d of G.deco) d.destroy();
      r.gpu = null;
    },
  });
})(window);
