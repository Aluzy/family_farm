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
 * « Dormir » : le personnage va à la première paillasse (ou au premier lit) d'une pièce close
 * (bedSpot), s'y couche sous sa couverture (js/fermier.js, couchage).
 *
 * Un mur rehaussé (version 1.25, modèle.blocs : b.hauteur) : son image répétée au-dessus de
 * lui, BLOCS_CARTE.etage.dy px plus haut par bloc (syncHauts) ; il s'efface avec lui. Au-dessus
 * d'une porte entre deux murs rehaussés, le mur continue (un linteau, aussi haut que le plus
 * bas des deux).
 *
 * Les meubles achetés au Marché (modèle.blocs : b.meuble) ont leur propre dessin et couvrent
 * parfois plusieurs cases (syncMeuble) ; les tableaux s'accrochent à la face des murs
 * (syncTableaux).
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

    // Les images des blocs : celles du modèle, créées, changées ou ôtées. Les murs et la porte
    // de l'enceinte de la Serre (`serre` : leurs cases) sont en verre et en bois.
    syncBlocks(list, bati, pieces, serre) {
      if (!this.blocks) this.blocks = new Map();
      const B = this.blocks, seen = new Set(), cols = this.grid.cols, H = BLOCS_CARTE.hauts;
      let changed = false;
      if (this.has(BLOCS_CARTE.key)) {
        // (au-dessus d'une porte entre deux murs rehaussés : le mur continue, horizontal ou vertical)
        const haut = new Map((list || []).filter((b) => b.hauteur > 1).map((b) => [b.case, b.hauteur]));
        const linteau = (b) => {
          if (b.sorte !== 'porte' || !haut.size) return null;
          const h = (k) => haut.get(k) || 0;
          const hz = Math.min(h(b.case - 1), h(b.case + 1)), vt = Math.min(h(b.case - cols), h(b.case + cols));
          if (hz > 1) return { h: hz, frame: this.hautFrame(BLOCS_CARTE.murs + 2 + 8) };
          if (vt > 1) return { h: vt, frame: this.hautFrame(BLOCS_CARTE.murs + 1 + 4) };
          return null;
        };
        const verre = new Set(serre || []);
        const at = new Map((list || []).map((b) => [b.case, verre.has(b.case) && H.variantes[b.sorte] !== undefined ? 'mur_serre' : b.sorte]));
        for (const b of list || []) {
          seen.add(b.case);
          // (un meuble acheté au Marché : son propre dessin, assets/meuble_<dessin>.png)
          if (b.meuble) { if (this.syncMeuble(b)) changed = true; continue; }
          let [key, f] = this.blocImage({ case: b.case, sorte: at.get(b.case), pleine: b.pleine }, at, cols);
          if (verre.has(b.case) && key === H.key && f === H.porte) f = H.porteSerre;
          const e = B.get(b.case);
          if (e && e.sorte === b.sorte) {
            // (les flammes du four, la lanterne allumée : stepFires, stepLanterns choisissent leur image)
            if ((e.img.frame.name !== f || e.img.texture.key !== key) && b.sorte !== BLOCS_CARTE.feu.sorte && b.sorte !== 'lanterne') { e.img.setTexture(key, f); changed = true; }
            const li = linteau(b);
            if (this.syncHauts(e, li ? li.h : b.hauteur || 1, li && li.frame)) changed = true;
            continue;
          }
          if (e) { e.img.destroy(); this.syncHauts(e, 0); }
          const x = (b.case % cols) * T + T / 2, y = (Math.floor(b.case / cols) + 1) * T;
          const plat = BLOCS_CARTE.plats.includes(b.sorte);
          // (le puits et la citerne : leurs propres images, posées par syncWell et syncTank)
          const img = this.add.image(x, y, key, f).setOrigin(0.5, 1).setDepth(plat ? y - T : y).setVisible(!BLOCS_CARTE.ailleurs.includes(b.sorte));
          const ne = { case: b.case, sorte: b.sorte, x, y, img };
          B.set(b.case, ne);
          const li = linteau(b);
          this.syncHauts(ne, li ? li.h : b.hauteur || 1, li && li.frame);
          changed = true;
        }
      }
      for (const [c, e] of B) if (!seen.has(c)) { e.img.destroy(); this.syncHauts(e, 0); B.delete(c); changed = true; }
      if (changed) {
        this.sunDirty = true;
        if (this.fermier && this.fermier.regrid) this.fermier.regrid();
      }
      this.bati = !!bati;
      this.drawRooms(bati ? pieces : null);
      this.syncRang(bati && bati.rang ? bati.rang : 0, pieces, changed);
      this.syncPoseMeuble(bati && bati.meuble);
      this.syncLitsDoubles();
    },

    // Deux lits adulte posés côte à côte (la même rangée, l'un juste à droite de l'autre) : un
    // lit deux places (BLOCS_CARTE.litDouble), dessiné par l'image de celui de gauche sur les deux
    // cases ; celle de droite se cache. Ils restent deux lits (deux couchages) ; seul, chacun
    // reprend son dessin.
    syncLitsDoubles() {
      const B = this.blocks, D = BLOCS_CARTE.litDouble, cols = this.grid.cols;
      if (!B || !this.textures.exists('meuble_' + D.double)) return;
      const est = (e) => e && e.lit && e.dessin === D.seul && e.img && e.img.active;
      const lits = [...B.values()].filter(est).sort((a, b) => a.case - b.case);
      const pris = new Set();
      for (const e of lits) e.paire = null;
      for (const e of lits) {
        const v = B.get(e.case + 1);
        if (pris.has(e.case) || e.case % cols === cols - 1 || !est(v) || pris.has(v.case)) continue;
        pris.add(e.case); pris.add(v.case);
        e.paire = { gauche: true, autre: v };
        v.paire = { gauche: false, autre: e };
      }
      let change = false;
      for (const e of lits) {
        const [key, x, vu] = !e.paire ? ['meuble_' + D.seul, e.x, true] : e.paire.gauche ? ['meuble_' + D.double, e.x + T / 2, true] : ['meuble_' + D.seul, e.x, false];
        if (e.img.texture.key !== key || e.img.x !== x || e.img.visible !== vu) { e.img.setTexture(key).setX(x).setVisible(vu); change = true; }
      }
      if (change) this.sunDirty = true;
    },

    // La pose d'un meuble (modèle.bati.meuble : { grille, etage, apercu: { case, dessin, largeur,
    // hauteur, plat, ok } | null }, js/ui/chantier.js ; etage : à l'étage) : un quadrillage sur la carte, et
    // l'aperçu du meuble calé sur la grille (son dessin, transparent ; ses cases encadrées),
    // vert s'il tient là, rouge sinon. null : rien.
    syncPoseMeuble(m) {
      const P = BLOCS_CARTE.poseMeuble, cols = this.grid.cols;
      if (!this.grilleGfx) {
        const g = this.grilleGfx = this.add.graphics().setDepth(BLOCS_CARTE.voileDepth + 0.01).setVisible(false);
        g.lineStyle(P.trait, P.grille, P.grilleAlpha);
        for (let c = 0; c <= cols; c++) g.lineBetween(c * T, 0, c * T, this.world.h);
        for (let r = 0; r <= Math.ceil(this.world.h / T); r++) g.lineBetween(0, r * T, this.world.w, r * T);
      }
      // (à l'étage : la grille et l'aperçu remontés comme lui, BLOCS_CARTE.etage.dy)
      const lift = m && m.etage ? BLOCS_CARTE.etage.dy : 0;
      this.grilleGfx.setVisible(!!(m && m.grille)).setY(-lift).setDepth(lift ? this.etageZ(9997) : BLOCS_CARTE.voileDepth + 0.01);
      const a = m && m.apercu, cle = a ? JSON.stringify(a) + lift : '';
      if (cle === (this.apercuCle || '')) return;
      this.apercuCle = cle;
      if (this.apercu) { this.apercu.img && this.apercu.img.destroy(); this.apercu.cadre.destroy(); this.apercu = null; }
      if (!a) return;
      const col = a.case % cols, row = Math.floor(a.case / cols), couleur = a.ok ? P.ok : P.non;
      const x0 = col * T, y1 = (row + 1) * T - lift, w = a.largeur * T, h = a.hauteur * T;
      const cadre = this.add.graphics().setDepth(this.etageZ(9998));
      cadre.fillStyle(couleur, P.fond).fillRect(x0, y1 - h, w, h);
      cadre.lineStyle(1, couleur, 1).strokeRect(x0 + 0.5, y1 - h + 0.5, w - 1, h - 1);
      const key = 'meuble_' + a.dessin;
      const img = this.textures.exists(key)
        ? this.add.image(Math.round((col + a.largeur / 2) * T), y1 - 1, key).setOrigin(0.5, 1).setAlpha(P.alpha).setTint(a.ok ? 0xffffff : P.non).setDepth(this.etageZ(9998.5))
        : null;
      // (ce que le doigt attrape pour le faire glisser : ses cases et son dessin, meubleSous)
      const b = img ? img.getBounds() : null;
      this.apercu = { img, cadre, case: a.case, x0: Math.min(x0, b ? b.x : x0), y0: Math.min(y1 - h, b ? b.y : y1 - h), x1: Math.max(x0 + w, b ? b.right : x0), y1 };
    },

    // L'aperçu du meuble sous ce point (sa case), ou null : un glissement parti de lui le
    // déplace (js/farm-stage.js, drag.meuble).
    meubleSous(wx, wy) {
      const a = this.apercu;
      return a && !this.room && wx >= a.x0 && wx <= a.x1 && wy >= a.y0 && wy <= a.y1 ? a.case : null;
    },

    // En mode Construire, au niveau `n` où l'on rehausse les murs (0 : aucun) : un voile sombre
    // sur la ferme ; devant lui, le rang n des murs (leur bloc à cette hauteur), le rang n - 1
    // plus pâle, les autres presque invisibles (BLOCS_CARTE.rang) ; les cases où poser le bloc
    // suivant (le dessus des murs hauts de n blocs) et les pièces closes, remontées à la hauteur
    // du niveau. Un appui vise cette hauteur (etagePoint).
    syncRang(n, pieces, changed) {
      const R = BLOCS_CARTE.rang, dy = BLOCS_CARTE.etage.dy, cols = this.grid.cols;
      if (n === (this.rang || 0) && !changed && (!n || this.rangCle === JSON.stringify(pieces))) return;
      const avant = this.rangImgs || [];
      for (const i of avant) if (i.active) i.setDepth(i.rangZ).setAlpha(1);
      this.rangImgs = [];
      this.rang = n;
      this.rangCle = n ? JSON.stringify(pieces) : '';
      if (this.rangGfx) this.rangGfx.clear();
      if (this.rangManque) this.rangManque.clear();
      if (this.rangVoile) this.rangVoile.setVisible(!!n);
      if (!n) return;
      if (!this.rangVoile) this.rangVoile = this.add.rectangle(0, 0, this.world.w, this.world.h, BLOCS_CARTE.etage.voile, R.voile).setOrigin(0);
      this.rangVoile.setDepth(this.etageVoileZ()).setVisible(true);
      if (!this.rangGfx) this.rangGfx = this.add.graphics();
      const g = this.rangGfx.setDepth(this.etageZ(0));
      g.fillStyle(BLOCS_CARTE.voile, BLOCS_CARTE.voileAlpha * 0.6);
      for (const p of pieces || []) for (const c of p) g.fillRect((c % cols) * T, Math.floor(c / cols) * T - n * dy, T, T);
      g.fillStyle(R.place, R.placeAlpha);
      for (const e of (this.blocks || new Map()).values()) {
        if (e.cases) continue;
        const rangs = [e.img, ...(e.hauts || [])];
        const z0 = e.img.depth;              // (remis : les blocs du dessus juste devant lui)
        rangs.forEach((i, k) => {
          i.rangZ = z0 + 0.01 * k;
          i.setDepth(i.rangZ);
          this.rangImgs.push(i);
          if (k === n || k === n - 1) i.setDepth(this.etageZ(i.rangZ)).setAlpha(k === n ? 1 : R.dessous);
          else i.setAlpha(R.autres);
        });
        // (un mur haut de n blocs : la place du bloc suivant)
        if (e.img.texture.key === BLOCS_CARTE.hauts.key && rangs.length === n && e.sorte !== 'porte') g.fillRect(e.x - T / 2, e.y - T - n * dy, T, T);
      }
      // un mur pas plus haut que le niveau, à côté d'un mur plus haut que lui (un trou dans un
      // mur rehaussé : vu de 3/4, les blocs de ses voisins le cachent) : en rouge, à la place de
      // son bloc suivant
      const B = this.blocks || new Map();
      const mur = (e) => e && !e.cases && e.sorte !== 'porte' && e.img.texture.key === BLOCS_CARTE.hauts.key;
      const h = (e) => 1 + (e.hauts || []).length;
      // (devant les murs : les blocs des voisins ne le cachent pas)
      if (!this.rangManque) this.rangManque = this.add.graphics();
      const gm = this.rangManque.setDepth(this.etageZ(9999)).clear();
      gm.fillStyle(R.manque, R.manqueAlpha);
      for (const e of B.values()) {
        if (!mur(e) || h(e) > n) continue;
        let haut = false;
        for (let dr = -1; dr <= 1 && !haut; dr++) for (let dc = -1; dc <= 1; dc++) { const v = B.get(e.case + dr * cols + dc); if (v !== e && mur(v) && h(v) > h(e)) { haut = true; break; } }
        if (haut) gm.fillRect(e.x - T / 2, e.y - T - h(e) * dy, T, T);
      }
    },

    // Les blocs du dessus d'un mur rehaussé (`h` blocs de haut ; 0 : tous ôtés) : son image,
    // BLOCS_CARTE.etage.dy px plus haut par bloc, devant celle du dessous (`image` : [clé, image]
    // à la place de la sienne : le linteau d'une porte). Renvoie vrai s'ils ont changé.
    syncHauts(e, h, image) {
      const L = e.hauts || [], dy = BLOCS_CARTE.etage.dy, want = Math.max(0, h - 1);
      const [key, f] = image || [e.img.texture.key, e.img.frame.name];
      let changed = false;
      while (L.length > want) { L.pop().destroy(); changed = true; }
      while (L.length < want) {
        const k = L.length + 1;
        L.push(this.add.image(e.x, e.y - dy * k, key, f).setOrigin(0.5, 1).setDepth(e.img.depth + 0.01 * k));
        changed = true;
      }
      for (const i of L) if (i.frame.name !== f || i.texture.key !== key) i.setTexture(key, f);
      e.hauts = L;
      e.hauteur = h;
      e.img.hauts = L;
      return changed;
    },

    // Un meuble posé (modèle.blocs : b.meuble = { dessin, largeur, hauteur, bloque, plat, lit }) :
    // son dessin (assets/meuble_<dessin>.png) en bas au milieu des cases qu'il couvre (sa case,
    // puis vers la droite et vers le haut) ; un tapis à plat sous le reste, un lit un peu plus bas
    // que ce qui est debout (le dormeur passe devant sa tête). Renvoie vrai s'il a changé.
    syncMeuble(b) {
      const B = this.blocks, M = b.meuble, key = 'meuble_' + M.dessin, e = B.get(b.case);
      if (e && e.sorte === b.sorte) return false;
      if (e) e.img.destroy();
      B.delete(b.case);
      if (!this.textures.exists(key)) return !!e;
      const cols = this.grid.cols, col = b.case % cols, row = Math.floor(b.case / cols);
      const x = Math.round((col + M.largeur / 2) * T), y = (row + 1) * T;
      const depth = M.plat ? y - T * M.hauteur - 0.5 : M.lit ? y - T / 2 : y;
      const img = this.add.image(x, y - 1, key).setOrigin(0.5, 1).setDepth(depth);
      const cases = [];
      for (let dy = 0; dy < M.hauteur; dy++) for (let dx = 0; dx < M.largeur; dx++) cases.push(b.case - dy * cols + dx);
      B.set(b.case, { case: b.case, sorte: b.sorte, x, y, img, cases, bloque: M.bloque, plat: M.plat, lit: M.lit, dessin: M.dessin });
      return true;
    },

    // Les tableaux accrochés aux murs (modèle.tableaux : [{ case, dessin }]) : sur la face du mur
    // (BLOCS_CARTE.tableau.dy px au-dessus du bas de sa case), juste devant lui ; ils s'effacent
    // avec lui (stepMurs : img.tableau).
    syncTableaux(list) {
      if (!this.tableaux) this.tableaux = new Map();
      const M = this.tableaux, cols = this.grid.cols, seen = new Set();
      for (const t of list || []) {
        const key = 'meuble_' + t.dessin;
        if (!this.textures.exists(key)) continue;
        seen.add(t.case);
        let e = M.get(t.case);
        if (e && e.key !== key) { e.img.destroy(); e = null; }
        if (!e) {
          const x = (t.case % cols) * T + T / 2, y = (Math.floor(t.case / cols) + 1) * T;
          e = { key, img: this.add.image(x, y - BLOCS_CARTE.tableau.dy, key).setOrigin(0.5, 1).setDepth(y + 0.5) };
          M.set(t.case, e);
        }
        const mur = this.blocks && this.blocks.get(t.case);
        if (mur) mur.img.tableau = e.img;
      }
      for (const [c, e] of M) if (!seen.has(c)) { e.img.destroy(); M.delete(c); }
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
      // (et la lumière des maisons, js/carte/ferme/fenetres.js ; les reflets dans l'eau, eau.js)
      if (!list.length && !this.lanternLights && !(this.toits || []).some((t) => t.maison) && !this.eauVive) return;
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
      this.stepFenetres(out, nuit, dt);
      this.stepEauLumiere(out, nuit, time);
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
            // (la vue du trajet, choisie à son départ : de face, de dos pour qui en a — la poule, la vache —,
            // sinon de profil retourné)
            if (!e.vue) e.vue = d.face && Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 'face' : 'dos') : 'marche';
            e.img.setFlipX(e.vue === 'marche' ? dx < 0 || (Math.abs(dx) <= 0.5 && e.img.flipX) : false);
            if (l <= st) { e.x = e.to.x; e.y = e.to.y; e.to = null; e.t = d.pause[0] + Math.random() * (d.pause[1] - d.pause[0]); e.pose = d.poses[Math.floor(Math.random() * d.poses.length)]; e.age = 0; } else { e.x += (dx / l) * st; e.y += (dy / l) * st; }
          } else if ((e.t -= dt) <= 0) {
            e.to = this.beastSpot(cases[Math.floor(Math.random() * cases.length)]);
            e.vue = null; e.age = 0;
          }
        }
        let f;
        if (e.lieu === 'piece') f = Fr[d.nuit[((e.age / 1.6) | 0) % d.nuit.length]];
        else if (e.to) { const m = d[e.vue || 'marche'] || d.marche; f = Fr[m[((e.age / d.pas) | 0) % m.length]]; }
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

    // L'image du bloc b, raccordé à ses voisins (at : case -> sorte) : [clé, image]. Un mur, une
    // fenêtre, des pierres d'angle : leur version haute (BLOCS_CARTE.hauts.variantes), sinon
    // celle du mur de blocs.png.
    blocImage(b, at, cols) {
      const f = this.wallFrame(b, at, cols), H = BLOCS_CARTE.hauts;
      // (une fenêtre, une paroi vitrée : prolongée par sa voisine de même sorte, à gauche, à
      // droite, si leurs faces se voient toutes deux)
      const J = H.joints[b.sorte], face = (k) => H.variantes[at.get(k + cols)] === undefined;
      const prolonge = (k) => at.get(k) === b.sorte && face(k) && Math.floor(k / cols) === Math.floor(b.case / cols);
      const v = J && face(b.case) ? J[(prolonge(b.case - 1) ? 1 : 0) + (prolonge(b.case + 1) ? 2 : 0)] : H.variantes[b.sorte];
      if (v !== undefined && this.has(H.key) && f >= BLOCS_CARTE.murs && f < BLOCS_CARTE.murs + 16) return [H.key, H.murs + v + f - BLOCS_CARTE.murs];
      return this.hautFrame(f);
    },

    // L'image d'un bloc de blocs.png, ou celle de sa version haute (un mur, la porte d'un mur
    // horizontal : BLOCS_CARTE.hauts, si la planche est là) : [clé, image].
    hautFrame(frame) {
      const H = BLOCS_CARTE.hauts;
      if (!this.has(H.key)) return [BLOCS_CARTE.key, frame];
      if (frame >= BLOCS_CARTE.murs && frame < BLOCS_CARTE.murs + 16) return [H.key, H.murs + frame - BLOCS_CARTE.murs];
      if (frame === BLOCS_CARTE.frames.porte) return [H.key, H.porte];
      return [BLOCS_CARTE.key, frame];
    },

    // Les murs hauts devant quelqu'un (le personnage, la famille : derrière eux, à une ou deux
    // cases au-dessus de leur pied) s'effacent un peu, pour qu'on le voie (devant le personnage :
    // presque tout, BLOCS_CARTE.hauts.joueur) ; les autres reviennent. Dans un bâtiment (en bas,
    // hors du mode Construire), on n'en voit que le niveau où l'on est : les rangs du dessus de
    // ses murs rehaussés s'effacent tout à fait. En mode Construire, tous s'effacent (on voit les
    // cases qu'ils cachent). Dans un intérieur, rien (la carte est cachée).
    stepMurs(dt) {
      const B = this.blocks, H = BLOCS_CARTE.hauts;
      if (!B || !B.size || this.room || this.rang) return;        // (au niveau où l'on rehausse : syncRang)
      const cols = this.grid.cols, but = new Map();
      const vise = (i, a) => { if (i && i.active && !(but.get(i) <= a)) but.set(i, a); };
      const p = this.fermier && this.fermier.pos ? this.fermier.pos() : null;
      // (le bâtiment où il est : celui de son toit, js/carte/ferme/toits.js)
      const ici = p && !this.bati && !this.niveau ? Math.floor((p.y - 1) / T) * cols + Math.floor(p.x / T) : -1;
      const bat = ici >= 0 ? (this.toits || []).find((t) => t.dedans.has(ici)) : null;
      const dedans = (e) => !!bat && bat.dedans.has(e.case);
      if (bat) for (const e of B.values()) if (e.hauts && dedans(e)) for (const h of e.hauts) vise(h, 0);
      const cache = (x, y, a) => {
        const gx = Math.floor(x / T), gy = Math.floor((y - 1) / T);
        for (let dy = 1; dy <= 6; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const e = B.get((gy + dy) * cols + gx + dx);
            // (le personnage fait ±6 px de large ; un mur rehaussé, s'il se voit, cache plus loin derrière lui)
            const h = dedans(e || {}) ? 1 : (e && e.hauteur) || 1;
            if (e && e.img.texture.key === H.key && dy <= 2 + 2 * (h - 1) && Math.abs(e.x - x) < T / 2 + 6) {
              vise(e.img, a);
              for (const i of e.hauts || []) vise(i, a);
            }
          }
        }
      };
      if (p) cache(p.x, p.y, H.joueur);
      if (this.family) for (const m of this.family.info()) if (m.visible) cache(m.x, m.y, H.alpha);
      if (this.bati) for (const e of B.values()) if (e.img.texture.key === H.key) { vise(e.img, H.alpha); for (const i of e.hauts || []) vise(i, H.alpha); }
      if (!this.mursEfface) this.mursEfface = new Set();
      for (const i of but.keys()) this.mursEfface.add(i);
      const pas = H.vitesse * dt;
      for (const i of this.mursEfface) {
        if (!i.active) { this.mursEfface.delete(i); continue; }
        // (sous l'étage, quand on y est : sa transparence à lui, js/carte/ferme/etage.js)
        const base = i.etageA || 1, cible = but.has(i) ? Math.min(base, but.get(i)) : base;
        const a = i.alpha < cible ? Math.min(cible, i.alpha + pas) : Math.max(cible, i.alpha - pas);
        i.setAlpha(a);
        if (i.tableau && i.tableau.active) i.tableau.setAlpha(a);
        if (a === base && !but.has(i)) this.mursEfface.delete(i);
      }
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
      // (la fenêtre et les pierres d'angle se raccordent comme le mur en pierre)
      const V = BLOCS_CARTE.hauts.variantes;
      const mur = V[b.sorte] !== undefined;
      // (une ruche : vide, ou pleine, le miel se devine, js/engine/ruches.js)
      if (b.sorte === 'ruche') return BLOCS_CARTE.frames[b.pleine ? 'ruche_pleine' : 'ruche'];
      if (!mur && b.sorte !== 'porte') return BLOCS_CARTE.frames[b.sorte] || 0;
      const c = b.case % cols;
      const is = (k, porte) => { const s = at.get(k); return V[s] !== undefined || (porte && s === 'porte'); };
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
      // (à l'étage : seule l'emprise, sans ses murs ; js/carte/ferme/etage.js)
      const haut = this.etageCells ? this.etageCells() : null;
      if (haut) return haut;
      const out = [];
      for (const e of (this.blocks || new Map()).values()) {
        if (e.cases) { if (e.bloque) out.push(...e.cases); }      // (un meuble : toutes ses cases)
        else if (BLOCS_CARTE.bloquent.includes(e.sorte)) out.push(e.case);
      }
      // les arbres plantés dans le sol : leur tronc (ceux du Verger, ceux d'une graine : foret.js)
      for (const e of (this.trees || new Map()).values()) if (e.a && e.a.sol) out.push(e.a.case);
      out.push(...this.foretCells());
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

    // Où il se couche : la première paillasse (ou le premier lit) d'une pièce close (modèle.couchages), ou null.
    bedSpot() {
      return this.bedSpots()[0] || null;
    },

    // Les couchages, dans l'ordre (modèle.couchages ; le moteur : un par personne, le personnage
    // principal d'abord, puis la famille, js/engine/blocs.js nuitSansCouchage) : où l'on s'y
    // couche, { x, y (les pieds), depth, drap: { key, frame, x, y } }.
    bedSpots() {
      const m = this.ctx.lastModel, list = (m && m.couchages) || [], out = [];
      for (const c of list) {
        const s = this.bedSpotOf(c);
        if (s) out.push(s);
      }
      return out;
    },
    bedSpotOf(c) {
      // un couchage de l'étage (« etage:<tuile> ») : js/carte/ferme/etage.js
      if (typeof c === 'string') return c.startsWith('etage:') && this.etageBedSpot ? this.etageBedSpot(Number(c.slice(6))) : null;
      {
        const e = this.blocks && this.blocks.get(c);
        if (e && e.sorte === 'paillasse') return { x: e.x, y: e.y - BLOCS_CARTE.coucheY, depth: e.img.depth, drap: { key: BLOCS_CARTE.key, frame: BLOCS_CARTE.frames.drap, x: e.x, y: e.y } };
        // un lit acheté au Marché : les pieds sous la couverture, la tête sur l'oreiller
        if (e && e.lit && this.has('meuble_' + e.dessin + '_drap')) {
          const top = e.img.y - e.img.height;
          // (un lit double, syncLitsDoubles : sa moitié, sous la couverture des deux places)
          const g = e.paire ? (e.paire.gauche ? e : e.paire.autre) : null, dd = 'meuble_' + BLOCS_CARTE.litDouble.double + '_drap';
          const drap = g && this.has(dd) ? { key: dd, frame: undefined, x: g.img.x, y: g.img.y } : { key: 'meuble_' + e.dessin + '_drap', frame: undefined, x: e.x, y: e.img.y };
          return { x: e.x, y: Math.min(top + BLOCS_CARTE.litPieds, e.img.y - 1), depth: e.img.depth, drap };
        }
      }
      return null;
    },
  });
})(window);
