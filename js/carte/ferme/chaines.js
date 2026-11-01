/* carte/ferme/chaines.js — la scène de la ferme : les chaînes de production.
 *
 * Des blocs posés côte à côte sur une rangée (js/engine/chaines.js) : un entonnoir, un réservoir
 * (facultatif), des outils (la presse, la centrifugeuse, le mixeur, le chaudron, le tonneau,
 * l'ensacheuse), puis des convoyeurs ; leurs images : chantier.js, comme les autres blocs
 * (modèle.chaines : [{ case, reservoir, outils, sortes, convoyeurs, bout, ok, recette, enStock,
 * capacite, marche }]).
 *
 * Un appui sur un de ses blocs : le personnage va devant l'entonnoir (la file des gestes,
 * file.js : l'entonnoir scintille) et y jette les ingrédients de la recette qu'il a (le pont :
 * ctx.bridge.verserChaine) ; des brins volent jusqu'à la bouche. Le jeu fait tourner la chaîne
 * avec le courant (js/engine/chaines.js) : quand elle travaille (modèle : marche), ses outils
 * prennent leur image « en marche » et tremblent d'un pixel, la bande des convoyeurs tourne ; la
 * jauge du réservoir suit ce qu'il garde. Les produits tombent en tas au bout (des morceaux au
 * sol, cueillette.js).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T, BLOCS_CARTE, BOTTELEUSE: B } = F.C;
  const reduit = () => global.CarteKit.reduit();

  const NIVEAUX = 5;            // les images de la jauge du réservoir (scripts/carte/blocs.py CH_NIVEAUX)
  const SECOUSSE_MS = 90;       // un outil en marche tremble d'un pixel, toutes les SECOUSSE_MS ms

  F.partie({

    // Les chaînes du modèle (après les blocs : leurs images).
    syncChaines(list) {
      this.chaines = new Map((list || []).map((c) => [c.case, c]));
      this.chaineT = this.chaineT || 0;
      this.peindreChaines(true);
    },

    // La chaîne dont un bloc est sous le doigt (la case de son entonnoir), ou -1. (Les images des
    // blocs dépassent d'une demi-case au-dessus de la leur ; le réservoir d'une case.)
    chaineAt(wx, wy) {
      if (!this.chaines || !this.chaines.size) return -1;
      const cols = this.grid.cols, c = Math.floor(wx / T);
      for (const ch of this.chaines.values()) {
        for (const t of [ch.case, ch.reservoir, ...ch.outils, ...ch.convoyeurs]) {
          if (t === null || t === undefined) continue;
          const r = Math.floor(t / cols), haut = t === ch.reservoir ? T : T / 2;
          if (t % cols === c && wy >= r * T - haut && wy < (r + 1) * T) return ch.case;
        }
      }
      return -1;
    },

    // Un appui sur la chaîne de l'entonnoir `e` : le personnage y va et jette ce qu'il a (la file
    // des gestes : l'entonnoir scintille). Ce qui l'empêche (elle n'est pas complète, des outils
    // qui ne vont pas ensemble) : le jeu le dit tout de suite, sans qu'il bouge ; ce qui manque à
    // l'arrivée (ses ingrédients, la place) : le jeu le dit là-bas, sans geste.
    jeterChaine(e) {
      const ch = this.chaines && this.chaines.get(e), bridge = this.ctx.bridge;
      if (!ch || !bridge || !bridge.verserChaine) return;
      if (this.ctx.lastModel && this.ctx.lastModel.coucher) return;   // au lit (ou en y allant) : rien
      if (!ch.ok || !this.fermier) { bridge.verserChaine(e); return; }
      const p = this.devantEntonnoir(e);
      if (!p) { bridge.verserChaine(e); return; }
      const jeter = () => {
        const r = bridge.verserChaine(e);
        if (r && r.ok) this.volerBrins(p.bouche);
      };
      this.geste({
        cle: 'entonnoir:' + e, seul: true, images: () => this.imagesEntonnoir(e), coup: jeter,
        lance: (opts) => this.fermier.jeter(p, p.face, p.flip, jeter, opts),
      });
    },

    // Chaque image : les chaînes qui travaillent font trembler leurs outils et tourner leur bande.
    stepChaines(dt) {
      if (!this.chaines || !this.chaines.size || !this.blocks) return;
      this.chaineT = (this.chaineT || 0) + dt;
      this.peindreChaines(false);
    },

    // Les images des blocs des chaînes : chaque outil à l'arrêt ou en marche (et son tremblement),
    // la jauge du réservoir, la bande des convoyeurs. `tout` : aussi celles qui ne tournent pas
    // (au changement de modèle).
    peindreChaines(tout) {
      if (!this.blocks) return;
      const t = this.chaineT || 0, calme = reduit();
      for (const ch of this.chaines.values()) {
        const marche = !!(ch.ok && ch.marche);
        if (!marche && !tout) continue;
        ch.outils.forEach((c, k) => {
          const e = this.blocks.get(c), base = BLOCS_CARTE.frames[ch.sortes[k]];
          if (!e || !e.img || !e.img.active || base === undefined) return;
          const f = base + (marche ? 1 : 0);
          if (e.img.frame.name !== f) e.img.setFrame(f);
          const dx = marche && !calme ? (Math.floor(t / SECOUSSE_MS + k) % 2 ? 1 : 0) : 0;
          if (e.img.x !== e.x + dx) e.img.x = e.x + dx;
        });
        if (ch.reservoir !== null && ch.reservoir !== undefined) {
          const e = this.blocks.get(ch.reservoir);
          if (e && e.img && e.img.active) {
            const niv = ch.capacite > 0 ? Math.round((Math.min(ch.enStock, ch.capacite) / ch.capacite) * (NIVEAUX - 1)) : 0;
            const f = BLOCS_CARTE.frames.reservoir + niv;
            if (e.img.frame.name !== f) e.img.setFrame(f);
          }
        }
        if (ch.convoyeurs.length) {
          const k = marche && !calme ? Math.floor(t / B.bandeMs) % 2 : 0;
          ch.convoyeurs.forEach((c, i) => {
            const e = this.blocks.get(c);
            if (!e || !e.img || !e.img.active) return;
            const bout = i === ch.convoyeurs.length - 1;
            const f = BLOCS_CARTE.frames[bout ? 'convoyeur_bout' : 'convoyeur'] + k;
            if (e.img.frame.name !== f) e.img.setFrame(f);
          });
        }
      }
    },
  });
})(window);
