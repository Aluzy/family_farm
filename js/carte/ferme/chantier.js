/* carte/ferme/chantier.js — la scène de la ferme : les blocs posés et le mode « Construire ».
 *
 * Sur la ferme générée (docs/carte-generee.md, étape 4), le joueur pose des blocs sur les cases
 * de la carte (js/engine/blocs.js) : murs en pierre, portes, paillasses, l'Atelier. Le modèle les
 * donne (modèle.blocs : [{ case, sorte }]) ; chacun a son image (assets/blocs.png,
 * scripts/carte/blocs.py), le bas sur le bas de sa case, rangée selon son pied (la paillasse,
 * à plat, sous ce qui est debout). Un mur prend l'image qui le raccorde à ses voisins, une
 * porte celle de son mur, horizontal ou vertical (wallFrame). Le plancher (modèle.sols) est à
 * plat sous tout le reste (syncFloors). Le four qui cuit fait bouger ses flammes (stepFires). Les murs et l'Atelier arrêtent le personnage (blockCells) ;
 * les portes et les paillasses se traversent. Ils portent une ombre (soleil.js).
 *
 * Le mode « Construire » (modèle.bati = { sorte }) : un appui sur une case y pose le bloc choisi,
 * un appui sur un bloc le reprend (le pont : ctx.bridge.act('bloc')). Les pièces closes
 * (modèle.pieces : leurs cases) sont teintées de vert.
 *
 * « Dormir » : le personnage va à la première paillasse d'une pièce close (bedSpot), s'y
 * couche sous sa couverture (js/fermier.js, couchage).
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { T, BLOCS_CARTE } = F.C;

  F.partie({

    // Les images des blocs : celles du modèle, créées, changées ou ôtées.
    syncBlocks(list, bati, pieces) {
      if (!this.blocks) this.blocks = new Map();
      const B = this.blocks, seen = new Set(), cols = this.grid.cols;
      let changed = false;
      if (this.has(BLOCS_CARTE.key)) {
        const at = new Map((list || []).map((b) => [b.case, b.sorte]));
        for (const b of list || []) {
          seen.add(b.case);
          const e = B.get(b.case), frame = this.wallFrame(b, at, cols);
          if (e && e.sorte === b.sorte) {
            // (les flammes du four : stepFires choisit son image)
            if (e.img.frame.name !== frame && b.sorte !== BLOCS_CARTE.feu.sorte) { e.img.setFrame(frame); changed = true; }
            continue;
          }
          if (e) e.img.destroy();
          const x = (b.case % cols) * T + T / 2, y = (Math.floor(b.case / cols) + 1) * T;
          const plat = BLOCS_CARTE.plats.includes(b.sorte);
          // (le puits et la citerne : leurs propres images, posées par syncWell et syncTank)
          const img = this.add.image(x, y, BLOCS_CARTE.key, frame).setOrigin(0.5, 1).setDepth(plat ? y - T : y).setVisible(!BLOCS_CARTE.ailleurs.includes(b.sorte));
          B.set(b.case, { case: b.case, sorte: b.sorte, x, y, img });
          changed = true;
        }
      }
      for (const [c, e] of B) if (!seen.has(c)) { e.img.destroy(); B.delete(c); changed = true; }
      if (changed) {
        this.sunDirty = true;
        if (this.fermier && this.fermier.regrid) this.fermier.regrid();
      }
      this.drawRooms(bati ? pieces : null);
    },

    // Le four qui cuit (modèle.fourAllume) : ses flammes bougent, une image de
    // BLOCS_CARTE.feu après l'autre ; éteint, il reprend son image.
    stepFires(time) {
      if (!this.blocks) return;
      const F = BLOCS_CARTE.feu;
      const frame = this.fireOn ? F.frames[Math.floor(time * F.fps / 1000) % F.frames.length] : BLOCS_CARTE.frames[F.sorte];
      for (const e of this.blocks.values()) if (e.sorte === F.sorte && e.img.frame.name !== frame) e.img.setFrame(frame);
    },

    // Les planchers posés (modèle.sols : leurs cases), à plat sous les blocs : chacun prend
    // l'image raccordée aux planchers voisins.
    syncFloors(list) {
      if (!this.floors) this.floors = new Map();
      const S = this.floors, cols = this.grid.cols, at = new Set(list || []);
      if (!this.has(BLOCS_CARTE.key)) return;
      for (const c of at) {
        const col = c % cols;
        const m = (at.has(c - cols) ? 1 : 0) + (col < cols - 1 && at.has(c + 1) ? 2 : 0) + (at.has(c + cols) ? 4 : 0) + (col > 0 && at.has(c - 1) ? 8 : 0);
        const frame = BLOCS_CARTE.sols + m, img = S.get(c);
        if (img) { if (img.frame.name !== frame) img.setFrame(frame); continue; }
        const x = col * T + T / 2, y = (Math.floor(c / cols) + 1) * T;
        S.set(c, this.add.image(x, y, BLOCS_CARTE.key, frame).setOrigin(0.5, 1).setDepth(BLOCS_CARTE.solDepth));
      }
      for (const [c, img] of S) if (!at.has(c)) { img.destroy(); S.delete(c); }
    },

    // L'image du bloc b (at : case -> sorte de tous les blocs). Un mur : celle de ses voisins
    // (BLOCS_CARTE.murs + masque : 1 un mur au-dessus, 2 à droite, 4 au-dessous, 8 à gauche ;
    // une porte compte à gauche et à droite seulement). Une porte entre deux murs, l'un
    // au-dessus, l'autre au-dessous, et sans voisin à côté : celle d'un mur vertical.
    wallFrame(b, at, cols) {
      const mur = b.sorte === 'mur_pierre';
      if (!mur && b.sorte !== 'porte') return BLOCS_CARTE.frames[b.sorte] || 0;
      const c = b.case % cols;
      const is = (k, porte) => { const s = at.get(k); return s === 'mur_pierre' || (porte && s === 'porte'); };
      const n = is(b.case - cols), s = is(b.case + cols);
      const e = c < cols - 1 && is(b.case + 1, true), w = c > 0 && is(b.case - 1, true);
      if (!mur) return (n || s) && !(e || w) ? BLOCS_CARTE.porteVerticale : BLOCS_CARTE.frames.porte;
      return BLOCS_CARTE.murs + (n ? 1 : 0) + (e ? 2 : 0) + (s ? 4 : 0) + (w ? 8 : 0);
    },

    // Le rectangle (px) de la case du premier bloc `sorte` posé, ou null : le puits et la
    // citerne de la ferme générée y posent leurs images (modele.js, syncWell, syncTank).
    blockRect(sorte) {
      for (const e of (this.blocks || new Map()).values()) if (e.sorte === sorte) return { x: e.x - T / 2, y: e.y - T, width: T, height: T };
      return null;
    },

    // Le bloc clé du bâtiment `lieu` (le nichoir du Poulailler), posé : { x, y } (le bas de sa
    // case), ou null.
    keyBlockOf(lieu) {
      const sorte = BLOCS_CARTE.cles[lieu];
      if (!sorte) return null;
      for (const e of (this.blocks || new Map()).values()) if (e.sorte === sorte) return e;
      return null;
    },

    // Les cases que les blocs ferment au passage (murs, Atelier), et les arbres plantés.
    blockCells() {
      const out = [];
      for (const e of (this.blocks || new Map()).values()) if (BLOCS_CARTE.bloquent.includes(e.sorte)) out.push(e.case);
      // les arbres plantés dans le sol : leur tronc
      for (const e of (this.trees || new Map()).values()) if (e.a && e.a.sol) out.push(e.a.case);
      return out;
    },

    // En mode Construire : les pièces closes, teintées de vert (null : rien).
    drawRooms(pieces) {
      const cle = pieces ? JSON.stringify(pieces) : '';
      if (cle === this.roomsKey) return;
      this.roomsKey = cle;
      if (!this.roomsGfx) this.roomsGfx = this.add.graphics().setDepth(BLOCS_CARTE.voileDepth);
      const g = this.roomsGfx, cols = this.grid.cols;
      g.clear();
      if (!pieces) return;
      g.fillStyle(BLOCS_CARTE.voile, BLOCS_CARTE.voileAlpha);
      for (const p of pieces) for (const c of p) g.fillRect((c % cols) * T, Math.floor(c / cols) * T, T, T);
    },

    // La case sous le doigt (son numéro), ou -1 hors de la carte.
    tileAtPoint(wx, wy) {
      const cols = this.grid.cols, c = Math.floor(wx / T), r = Math.floor(wy / T);
      return c >= 0 && r >= 0 && c < cols && wy < this.world.h ? r * cols + c : -1;
    },

    // Le foyer : devant la porte de la pièce où l'on dort (modèle.foyer : sa case), sinon devant
    // l'Atelier, sinon (ferme générée) la place de l'ancienne maison ; null sur la ferme dessinée. Le personnage, la famille et le robot s'y rendent comme à la porte
    // de la maison (la ferme générée n'en a pas).
    homeDoor() {
      const m = this.ctx.lastModel, cols = this.grid.cols;
      const c = m && Number.isInteger(m.foyer) ? m.foyer : null;
      if (c !== null) return { x: (c % cols) * T + T / 2, y: (Math.floor(c / cols) + 1) * T + 6 };
      for (const e of (this.blocks || new Map()).values()) if (e.sorte === 'atelier') return { x: e.x, y: e.y + 8 };
      // rien de bâti : au bord de la Zone de culture, sur la place de l'ancienne maison
      const z = this.ctx.carte && this.objects.zone_culture;
      return z ? { x: Math.round(z.x + z.width / 2), y: Math.round(z.y - 20) } : null;
    },

    // Le four ou la cuisinière sous le doigt : la fenêtre de sa station, ou null.
    stationAt(wx, wy) {
      for (const e of (this.blocks || new Map()).values()) {
        const win = BLOCS_CARTE.fenetres[e.sorte];
        if (win && Math.abs(wx - e.x) <= T / 2 + 2 && wy <= e.y + 2 && wy >= e.y - 24) return win;
      }
      return null;
    },

    // Où il se couche : la première paillasse d'une pièce close (modèle.couchages), ou null.
    bedSpot() {
      const m = this.ctx.lastModel, list = (m && m.couchages) || [];
      for (const c of list) {
        const e = this.blocks && this.blocks.get(c);
        if (e && e.sorte === 'paillasse') return { x: e.x, y: e.y - BLOCS_CARTE.coucheY, depth: e.img.depth, drap: { key: BLOCS_CARTE.key, frame: BLOCS_CARTE.frames.drap, x: e.x, y: e.y } };
      }
      return null;
    },
  });
})(window);
