/* carte/ferme/fete.js — la scène de la ferme : la fête du village (le chantier « l'île à bâtir », fiche I8a ; le
 * moteur : js/engine/fetes-village.js, la journée de chacun : js/engine/villageois-journee.js planDeFete).
 *
 * Le modèle (modèle.villageoisHeure.fete, js/ui/villageois.js) dit la fête du jour : ses heures, les tables où l'on
 * s'attable, les groupes debout (leurs cases). Ici, ce qu'on en voit :
 *   - une guirlande de lampions (assets/fete_lampions.png, scripts/batiments/projets_village.py : deux mâts, six
 *     lampions de papier), derrière chaque table de la fête, de peu avant le début jusqu'à peu après la fin ;
 *   - le soir (le voile de la nuit plus sombre que BLOCS_CARTE.lanterne.allume), les lampions s'allument (leur image
 *     allumée) et posent dans le voile leur lueur chaude, qui respire doucement ; une flaque de lumière dorée sur
 *     chaque table et chaque groupe (LUMIERES : la teinte, l'intensité, le rayon).
 * Les villageois eux-mêmes (attablés, assis, debout, qui causent) sont ceux de leur scène (villageois.js,
 * villageois-social.js). Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype ; chantier.js
 * (stepLanterns) appelle stepFete avec les autres lumières du voile.
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T, BLOCS_CARTE } = F.C;
  const R = 32;                                  // le rayon de l'image « lueur » (chantier.js)
  const CLE = 'fete_lampions';
  const CASE = { frameWidth: 48, frameHeight: 40 };
  const AVANT = 0.6, APRES = 0.4;                // h : la guirlande paraît un peu avant, s'en va un peu après
  // (les lampions de l'image, px depuis le pied de l'image, au milieu en bas : leur lueur)
  const LAMPIONS = [-14.6, -8.8, -2.9, 2.9, 8.8, 14.6].map((dx, i) => ({ dx, dy: -(30.6 - 9.5 * 4 * ((i + 0.5) / 6) * (1 - (i + 0.5) / 6)) * 0.875 - 5 }));

  F.partie({

    // La fête du modèle, si elle est à l'heure (h : l'heure de la scène), ou null.
    feteDuModele() {
      const H = this.ctx.lastModel && this.ctx.lastModel.villageoisHeure, f = H && H.fete;
      if (!f || H.nuit) return null;
      const h = Number(H.h) || 0;
      return h >= f.debut - AVANT && h < f.fin + APRES ? f : null;
    },

    // Y a-t-il une fête à éclairer ? (chantier.js : sans aucune lumière, le voile n'en calcule pas)
    feteLumieres() {
      return !!this.feteDuModele() || !!(this.feteSprites && this.feteSprites.size);
    },

    // Les guirlandes (créées, ôtées) et leurs lueurs (à ajouter à `out`, les lumières du voile).
    stepFete(out, nuit, time) {
      const f = this.feteDuModele();
      const S = this.feteSprites || (this.feteSprites = new Map());
      const voulues = new Set(f ? f.tables : []);
      for (const [c, img] of S) if (!voulues.has(c)) { img.destroy(); S.delete(c); }
      if (!f) return;
      if (!this.textures.exists(CLE)) {
        if (!this.feteCharge) {
          this.feteCharge = true;
          this.load.spritesheet(CLE, F.v('fete_lampions.png'), CASE);
          if (!this.load.isLoading()) this.load.start();
        }
      }
      const cols = this.grid.cols, allumee = nuit > BLOCS_CARTE.lanterne.allume, calme = global.CarteKit.reduit();
      const k = Math.min(1, Math.max(0, (nuit - BLOCS_CARTE.lanterne.allume) / 0.3));
      for (const c of f.tables) {
        const x = (c % cols) * T + T / 2, y = Math.floor(c / cols) * T;
        let img = S.get(c);
        if (!img && this.textures.exists(CLE)) {
          img = this.add.image(x, y, CLE, 0).setOrigin(0.5, 1).setDepth(y - 0.5);
          S.set(c, img);
        }
        if (img && img.frame.name !== (allumee ? 1 : 0)) img.setFrame(allumee ? 1 : 0);
        if (!allumee) continue;
        const L = f.lumieres || {};
        for (const [i, p] of LAMPIONS.entries()) {
          const a = (calme ? 1 : 0.85 + 0.15 * Math.sin(time / 600 + i * 1.7 + c)) * k;
          out.push({ key: 'lueur', x: x + p.dx, y: y + p.dy, tint: [0xff8a5a, 0xffd36a, 0x9cc4ff, 0xa6f0a0, 0xffb060, 0xf0a0f0][i], alpha: 0.85 * a, scaleX: 9 / R, scaleY: 9 / R });
        }
        out.push({ key: 'lueur', x, y: y + T * 0.7, tint: L.teinte || 0xffb366, alpha: (L.alpha || 0.85) * k, scaleX: (L.rayon || 40) / R, scaleY: ((L.rayon || 40) * 0.7) / R });
      }
      if (!allumee) return;
      for (const c of f.groupes || []) {
        const x = (c % cols) * T + T / 2, y = Math.floor(c / cols) * T + T * 0.7;
        out.push({ key: 'lueur', x, y, tint: (f.lumieres && f.lumieres.teinte) || 0xffb366, alpha: 0.55 * k * (calme ? 1 : 0.9 + 0.1 * Math.sin(time / 800 + c)), scaleX: 30 / R, scaleY: 21 / R });
      }
    },
  });
})(window);
