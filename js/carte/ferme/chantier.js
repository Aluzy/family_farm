/* carte/ferme/chantier.js — la scène de la ferme : les blocs posés et le mode « Construire ».
 *
 * Sur la ferme générée (docs/carte-generee.md, étape 4), le joueur pose des blocs sur les cases
 * de la carte (js/engine/blocs.js) : murs en pierre, portes, paillasses, l'Atelier. Le modèle les
 * donne (modèle.blocs : [{ case, sorte }]) ; chacun a son image (assets/blocs.png,
 * scripts/carte/blocs.py), le bas sur le bas de sa case, rangée selon son pied (la paillasse,
 * à plat, sous ce qui est debout). Un mur prend l'image qui le raccorde à ses voisins, une
 * porte celle de son mur, horizontal ou vertical (wallFrame). Le plancher (modèle.sols) est à
 * plat sous tout le reste (syncFloors). Une barrière prend l'image raccordée à ses voisines
 * (wallFrame) ; un chemin change les tuiles du sol (syncPaths). La lanterne s'allume la nuit et
 * éclaire autour d'elle (stepLanterns). Le four qui cuit fait bouger ses flammes (stepFires). Les murs et l'Atelier arrêtent le personnage (blockCells) ;
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
  const { T, BLOCS_CARTE, BETES } = F.C;

  // La tache de lumière des lanternes : un disque blanc qui s'estompe vers son bord (R px de
  // rayon), teinté et agrandi dans le voile (la même que les réverbères de la ville).
  const R = 32;
  function lueur(textures) {
    if (textures.exists('lueur')) return;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 2 * R;
    const g = cv.getContext('2d');
    const grad = g.createRadialGradient(R, R, 0, R, R, R);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.45, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 2 * R, 2 * R);
    textures.addCanvas('lueur', cv);
  }

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
            // (les flammes du four, la lanterne allumée : stepFires, stepLanterns choisissent leur image)
            if (e.img.frame.name !== frame && b.sorte !== BLOCS_CARTE.feu.sorte && b.sorte !== 'lanterne') { e.img.setFrame(frame); changed = true; }
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

    // Les lanternes scintillantes (BLOCS_CARTE.lanterne) : éteintes le jour ; quand la nuit tombe,
    // elles s'allument, leurs deux images alternent au hasard et chacune pose sa lumière dans le
    // voile de l'heure (CarteKit.voile, eclaire : une flaque cyan sur l'herbe et la vitre), qui
    // vacille un peu ; un petit halo par-dessus (WebGL).
    stepLanterns(time, dt) {
      const L = BLOCS_CARTE.lanterne, V = this.lumiere;
      const list = [];
      for (const e of (this.blocks || new Map()).values()) if (e.sorte === 'lanterne') list.push(e);
      if (!list.length && !this.lanternLights) return;
      if (!this.lanternLights) {
        this.lanternLights = [];
        lueur(this.textures);
        V.eclaire(() => this.lanternLights);
      }
      const out = this.lanternLights;
      out.length = 0;
      const nuit = this.room ? 0 : V.nuit, on = nuit > L.allume, calme = global.CarteKit.reduit();
      const Ph = global.Phaser, webgl = this.sys.renderer.type === (Ph && Ph.WEBGL);
      for (const e of list) {
        if (e.phase == null) { e.phase = Math.random() * 7; e.flip = 0; e.k = 1; }
        if (!on) {
          if (e.img.frame.name !== BLOCS_CARTE.frames.lanterne) e.img.setFrame(BLOCS_CARTE.frames.lanterne);
          if (e.halo) e.halo.setVisible(false);
          continue;
        }
        // elle scintille : une image ou l'autre, et une lumière qui vacille
        if (!calme && (e.flip -= dt) <= 0) {
          e.flip = (0.4 + Math.random()) / L.fps;
          e.frame = L.allumee[Math.random() < 0.5 ? 0 : 1];
          e.k = 1 - L.vacille + Math.random() * L.vacille * 2;
        }
        const frame = calme ? L.allumee[0] : e.frame || L.allumee[0];
        if (e.img.frame.name !== frame) e.img.setFrame(frame);
        const k = (calme ? 1 : e.k * (0.92 + 0.08 * Math.sin(time / 300 + e.phase))) * Math.min(1, nuit / 0.4);
        const S = L.sol, W = L.vitre;
        out.push({ key: 'lueur', x: e.x + S.dx, y: e.y + S.dy, tint: S.teinte, alpha: S.alpha * k, scaleX: S.rayon / R, scaleY: (S.rayon * S.aplati) / R });
        out.push({ key: 'lueur', x: e.x + W.dx, y: e.y + W.dy, tint: W.teinte, alpha: W.alpha * k, scaleX: W.rayon / R, scaleY: W.rayon / R });
        if (webgl && !e.halo) {
          const H = L.halo;
          e.halo = this.add.pointlight(e.x + W.dx, e.y + W.dy, H.couleur, H.rayon, H.intensite, H.attenuation).setDepth(V.depth + 1);
          e.img.once('destroy', () => { if (e.halo) e.halo.destroy(); });
        }
        if (e.halo) e.halo.setVisible(true).setAlpha(k);
      }
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

    // Les bêtes du Poulailler et de l'Étable de la ferme générée (modèle.enclos : [{ id, piece,
    // enclos (les cases libres), betes: [espèce…] (celles qui y ont leur place) }],
    // js/engine/blocs.js, etatEnclos) : une image par bête. Le jour (BETES.jour), elles vont et
    // viennent dans l'enclos (les poules picorent et grattent, les moutons et les vaches broutent) ;
    // la nuit, elles dorment dans le bâtiment, où elles veulent (à plusieurs sur une case s'il le
    // faut : la place compte une case par bête, pas leur sommeil). Au changement, elles passent de
    // l'un à l'autre en s'effaçant.
    syncBeasts(list, heure) {
      if (!this.beasts) this.beasts = new Map();
      const M = this.beasts, seen = new Set();
      this.beastDay = heure >= BETES.jour[0] && heure < BETES.jour[1];
      for (const b of list || []) {
        const cle = JSON.stringify([b.piece, b.enclos]);
        b.betes.forEach((kind, k) => {
          const def = BETES.especes[kind];
          if (!def || !this.has(def.key)) return;
          const id = b.id + ':' + k;
          seen.add(id);
          let e = M.get(id);
          if (e && e.kind !== kind) { e.img.destroy(); e = null; }
          if (!e) {
            e = { kind, def, img: this.add.image(0, 0, def.key, 0).setOrigin(0.5, 1).setAlpha(0), lieu: null, x: 0, y: 0, to: null, t: 0, age: 0, pose: null };
            M.set(id, e);
          }
          if (e.cle !== cle) { e.cle = cle; e.lieu = null; }
          e.plan = b;
        });
      }
      for (const [id, e] of M) if (!seen.has(id)) { e.img.destroy(); M.delete(id); }
    },

    // Le point (pieds) d'une case, un peu au hasard dans la case.
    beastSpot(c) {
      const cols = this.grid.cols;
      return { x: (c % cols) * T + T / 2 + Math.round((Math.random() - 0.5) * 8), y: Math.floor(c / cols) * T + T - 2 - Math.round(Math.random() * 4) };
    },

    stepBeasts(time, dt) {
      if (!this.beasts || !this.beasts.size) return;
      const lieu = this.beastDay ? 'enclos' : 'piece', still = F.reducedMotion && F.reducedMotion();
      for (const e of this.beasts.values()) {
        const cases = (e.plan && e.plan[lieu]) || [];
        if (!cases.length) continue;
        const d = e.def, Fr = d.frames;
        if (e.lieu !== lieu) {
          // (de l'enclos au bâtiment, ou l'inverse : elle s'efface, puis apparaît là-bas)
          if (e.lieu && e.img.alpha > 0) { e.img.setAlpha(Math.max(0, e.img.alpha - dt * 3)); continue; }
          e.lieu = lieu;
          const p = this.beastSpot(cases[Math.floor(Math.random() * cases.length)]);
          e.x = p.x; e.y = p.y; e.to = null; e.t = 0.5 + Math.random() * 2; e.pose = null; e.age = Math.random() * 3;
        }
        if (e.img.alpha < 1) e.img.setAlpha(Math.min(1, e.img.alpha + dt * 3));
        e.age += dt;
        if (lieu === 'enclos' && !still) {
          if (e.to) {
            const dx = e.to.x - e.x, dy = e.to.y - e.y, l = Math.hypot(dx, dy), st = d.vitesse * dt;
            if (Math.abs(dx) > 0.5) e.img.setFlipX(dx < 0);
            if (l <= st) { e.x = e.to.x; e.y = e.to.y; e.to = null; e.t = d.pause[0] + Math.random() * (d.pause[1] - d.pause[0]); e.pose = d.poses[Math.floor(Math.random() * d.poses.length)]; e.age = 0; } else { e.x += (dx / l) * st; e.y += (dy / l) * st; }
          } else if ((e.t -= dt) <= 0) {
            e.to = this.beastSpot(cases[Math.floor(Math.random() * cases.length)]);
          }
        }
        let f;
        if (e.lieu === 'piece') f = Fr[d.nuit[((e.age / 1.6) | 0) % d.nuit.length]];
        else if (e.to) f = Fr[d.marche[((e.age / d.pas) | 0) % d.marche.length]];
        else if (e.pose) { const [noms, periode, actif] = d.anims[e.pose]; f = (e.age % (periode * noms.length * 2)) < periode * noms.length * actif ? Fr[noms[((e.age / periode) | 0) % noms.length]] : Fr.idle; }
        else f = Fr.idle;
        e.img.setFrame(f).setPosition(Math.round(e.x), Math.round(e.y)).setDepth(e.y);
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
