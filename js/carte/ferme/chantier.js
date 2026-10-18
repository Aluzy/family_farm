/* carte/ferme/chantier.js — la scène de la ferme : les blocs posés et le mode « Construire ».
 *
 * Sur la ferme générée (docs/carte-generee.md, étape 4), le joueur pose des blocs sur les cases
 * de la carte (js/engine/blocs.js) : murs en pierre, portes, paillasses, l'Atelier. Le modèle les
 * donne (modèle.blocs : [{ case, sorte }]) ; chacun a son image (assets/blocs.png,
 * scripts/carte/blocs.py), le bas sur le bas de sa case, rangée selon son pied (la paillasse,
 * à plat, sous ce qui est debout). Un mur prend l'image qui le raccorde à ses voisins, une
 * porte celle de son mur, horizontal ou vertical (wallFrame). Le plancher (modèle.sols) est à
 * plat sous tout le reste (syncFloors). Une barrière prend l'image raccordée à ses voisines
 * (wallFrame) ; un chemin change les tuiles du sol (syncPaths). Le four qui cuit fait bouger ses flammes (stepFires). Les murs et l'Atelier arrêtent le personnage (blockCells) ;
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
  const { T, BLOCS_CARTE, POULES } = F.C;

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

    // Les poules du Poulailler de la ferme générée (modèle.poulailler : { piece, enclos (les
    // cases libres), n (les poules qui y ont leur place) }, js/engine/blocs.js, etatPoulailler) :
    // une image par poule. Le jour (POULES.jour), elles vont et viennent dans l'enclos, picorent
    // et grattent ; la nuit, chacune couve sur sa case du poulailler. Au changement, elles
    // passent de l'un à l'autre en s'effaçant.
    syncHens(P, heure) {
      if (!this.hens) this.hens = [];
      const H = this.hens, n = P && this.has(POULES.key) ? P.n | 0 : 0;
      this.henPlan = P;
      this.henDay = heure >= POULES.jour[0] && heure < POULES.jour[1];
      while (H.length > n) H.pop().img.destroy();
      while (H.length < n) H.push({ img: this.add.image(0, 0, POULES.key, 0).setOrigin(0.5, 1).setAlpha(0), k: H.length, lieu: null, x: 0, y: 0, to: null, t: 0, age: 0, pose: 'idle' });
      const cle = P ? JSON.stringify([P.piece, P.enclos]) : '';
      if (cle !== this.henKey) { this.henKey = cle; for (const h of H) h.lieu = null; }
    },

    // Le point (pieds) d'une case, un peu au hasard dans la case si `jeu`.
    henSpot(c, jeu) {
      const cols = this.grid.cols;
      return { x: (c % cols) * T + T / 2 + (jeu ? Math.round((Math.random() - 0.5) * 8) : 0), y: Math.floor(c / cols) * T + T - 2 - (jeu ? Math.round(Math.random() * 4) : 0) };
    },

    stepHens(time, dt) {
      const H = this.hens, P = this.henPlan;
      if (!H || !H.length || !P) return;
      const lieu = this.henDay ? 'enclos' : 'piece', cases = P[lieu] || [];
      if (!cases.length) return;
      const Fr = POULES.frames, still = F.reducedMotion && F.reducedMotion();
      for (const h of H) {
        if (h.lieu !== lieu) {
          // (de l'enclos au poulailler, ou l'inverse : elle s'efface, puis apparaît là-bas)
          if (h.lieu && h.img.alpha > 0) { h.img.setAlpha(Math.max(0, h.img.alpha - dt * 3)); continue; }
          h.lieu = lieu;
          const p = this.henSpot(lieu === 'piece' ? cases[h.k % cases.length] : cases[Math.floor(Math.random() * cases.length)], lieu === 'enclos');
          h.x = p.x; h.y = p.y; h.to = null; h.t = 0.5 + Math.random() * 2; h.pose = lieu === 'piece' ? 'couvee' : 'idle';
        }
        if (h.img.alpha < 1) h.img.setAlpha(Math.min(1, h.img.alpha + dt * 3));
        h.age += dt;
        if (lieu === 'enclos' && !still) {
          if (h.to) {
            const dx = h.to.x - h.x, dy = h.to.y - h.y, l = Math.hypot(dx, dy), st = POULES.vitesse * dt;
            if (Math.abs(dx) > 0.5) h.img.setFlipX(dx < 0);
            if (l <= st) { h.x = h.to.x; h.y = h.to.y; h.to = null; h.t = 1 + Math.random() * 3; h.pose = Math.random() < 0.6 ? 'picore' : 'gratte'; h.age = 0; } else { h.x += (dx / l) * st; h.y += (dy / l) * st; }
          } else if ((h.t -= dt) <= 0) {
            h.to = this.henSpot(cases[Math.floor(Math.random() * cases.length)], true);
            h.pose = 'marche';
          }
        }
        let f;
        if (h.lieu === 'piece') f = Fr.couvee;
        else if (h.to) f = ((h.age / 0.15) | 0) % 2 ? Fr.marche1 : Fr.marche0;
        else if (h.pose === 'picore') f = h.age % 1.2 < 0.5 ? (((h.age / 0.12) | 0) % 2 ? Fr.picore1 : Fr.picore0) : Fr.idle;
        else if (h.pose === 'gratte') f = ((h.age / 0.18) | 0) % 2 ? Fr.gratte : Fr.idle;
        else f = Fr.idle;
        h.img.setFrame(f).setPosition(Math.round(h.x), Math.round(h.y)).setDepth(h.y);
      }
    },

    // Les chemins posés (modèle.chemins : { cases, tuiles: [[case, tuile]] }) : des tuiles du
    // chemin de la carte à la place du sol (sol.js, drawLayer), raccordées à l'herbe autour ;
    // les fleurs de leurs cases disparaissent. Seules les cases qui changent sont repeintes.
    syncPaths(chemins) {
      const tuiles = new Map((chemins && chemins.tuiles) || []), cases = new Set((chemins && chemins.cases) || []);
      const avant = this.pathOver || new Map(), avantCases = this.pathCells || new Set();
      const changees = new Set();
      for (const [c, g] of tuiles) if (avant.get(c) !== g) changees.add(c);
      for (const c of avant.keys()) if (!tuiles.has(c)) changees.add(c);
      for (const c of cases) if (!avantCases.has(c)) changees.add(c);
      for (const c of avantCases) if (!cases.has(c)) changees.add(c);
      this.pathOver = tuiles;
      this.pathCells = cases;
      if (changees.size && this.mapRaw) this.repaintCells(changees);
    },

    // L'image du bloc b (at : case -> sorte de tous les blocs). Un mur : celle de ses voisins
    // (BLOCS_CARTE.murs + masque : 1 un mur au-dessus, 2 à droite, 4 au-dessous, 8 à gauche ;
    // une porte compte à gauche et à droite seulement). Une porte entre deux murs, l'un
    // au-dessus, l'autre au-dessous, et sans voisin à côté : celle d'un mur vertical.
    wallFrame(b, at, cols) {
      if (b.sorte === 'barriere') {
        // (une barrière : celles de ses voisines, BLOCS_CARTE.barrieres + masque)
        const c = b.case % cols, is = (k) => at.get(k) === 'barriere';
        return BLOCS_CARTE.barrieres + (is(b.case - cols) ? 1 : 0) + (c < cols - 1 && is(b.case + 1) ? 2 : 0) + (is(b.case + cols) ? 4 : 0) + (c > 0 && is(b.case - 1) ? 8 : 0);
      }
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
