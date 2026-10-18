/*
 * L'infra-monde (infra-monde.html) : une île d'herbe pâle sur une eau étoilée, des arbres
 * tordus qui se balancent, et son habitant que le joueur promène.
 *
 * La carte : assets/infra_monde.json (scripts/infra/carte.py, puis scripts/build-map.mjs) ;
 * ses couches de tuiles « eau », « sol » et « rive », ses points « arbres » et « depart ».
 * Les images : scripts/infra/*.py (tuiles, arbre, habitant), dérivées des modèles de
 * scripts/infra/originaux/.
 *
 * Le personnage principal de la partie (assets/personnages/perso_NN.png, comme sur la ferme)
 * marche sur le sol plein (les tuiles de la couche « sol »), pas dans l'eau ni à travers un
 * tronc : un toucher (ou un clic) l'envoie au plus court jusque-là ; les flèches ou ZQSD le
 * dirigent aussi. L'habitant de l'île y flâne de son côté. La hache en main, un appui
 * sur un arbre : un coup de hache ; au troisième, l'arbre tombe et lâche deux morceaux qu'on
 * ramasse en marchant dessus (la lanterne scintillante, à l'Atelier) ; il repousse le lendemain. Avec « animations réduites », les
 * arbres et l'eau restent immobiles, l'habitant ne bouge pas.
 *
 * La carte s'affiche dans la page du jeu (js/ui/excursion.js : InfraMonde.start, stop), à la
 * place de celle de la ferme : c'est une scène du jeu Phaser de toutes les cartes (js/carte/jeu.js) ;
 * le jeu continue de tourner.
 */
(function () {
  'use strict';

  const K = window.CarteKit;
  const T = K.T;
  const v = K.v;
  const MAP = { key: 'infra', file: 'assets/infra_monde.json' };
  const TREE = { key: 'infra_arbre', file: 'assets/infra_arbre.png', w: 32, h: 64, frames: 8, fps: 6, foot: 59 };
  // Les morceaux d'arbre (pour la lanterne scintillante, à l'Atelier) : la hache en main, un
  // appui sur un arbre, le personnage va à côté (à `cote` px de son pied) et donne un coup de
  // hache (hache_cote_0..3 en `swing` s, le coup porte à la 3e image ; un coup par appui). Au
  // `coups`-ième (moins avec l'Arbre : FermeHote.coups), l'arbre tombe (CarteKit.NATURE.chute)
  // et lâche `morceaux` morceaux là où sa cime touche le sol (à `loin` px de son pied) ; le
  // personnage les ramasse en marchant dessus (à moins de `prise` px : FermeHote.ramasser).
  // L'arbre repousse le lendemain. localStorage `store` : { jour, tombes : les numéros des arbres
  // tombés, morceaux : ceux qui restent au sol, [{ x, y }] }.
  const BOIS = {
    item: 'bois_infra', cote: 11, swing: 0.5, coups: 3, morceaux: 2, loin: [16, 30], prise: 8,
    store: 'ferme-infra', doigt: { x: 12, haut: 52, bas: 6 }, bulle: 26,
    eclats: [0xc8a0e8, 0x4ff0d2, 0xffb8e0, 0xfff0a0],
  };
  // L'habitant (scripts/infra/habitant.py) : marche de face 0-3, de dos 4-7, de profil 8-11 ;
  // debout de face 12 (13 : l'œil fermé), de dos 14, de profil 15 (16 : l'œil fermé).
  const HERO = {
    key: 'infra_habitant', file: 'assets/infra_habitant.png', w: 15, h: 40,
    speed: K.VITESSES.habitant, fps: 7, blink: { every: [2200, 4200], ms: 140 },
  };
  // Le personnage du joueur (CarteKit.planchePerso) : ses cases nommées ; sans partie, la fermière.
  const PLAYER = { key: 'heros_infra', w: 16, h: 32, foot: 30, speed: K.VITESSES.infra, stride: 4 };
  const reduced = K.reduit;
  const saisie = K.saisie;

  class InfraScene extends Phaser.Scene {
    constructor() { super('infra'); }

    preload() {
      this.load.tilemapTiledJSON(MAP.key, v(MAP.file));
      this.load.spritesheet(TREE.key, v(TREE.file), { frameWidth: TREE.w, frameHeight: TREE.h });
      this.load.spritesheet(HERO.key, v(HERO.file), { frameWidth: HERO.w, frameHeight: HERO.h });
      // (la planche du personnage par son fichier : les textures restent d'une visite à l'autre)
      const sheet = K.planchePerso();
      this.playerKey = PLAYER.key + ':' + sheet.file;
      this.load.spritesheet(this.playerKey, v(sheet.file), { frameWidth: PLAYER.w, frameHeight: PLAYER.h });
      // son triporteur (js/carte/triporteur.js)
      if (!this.textures.exists(K.TRIPORTEUR.key)) this.load.spritesheet(K.TRIPORTEUR.key, v('assets/' + K.TRIPORTEUR.file), { frameWidth: K.TRIPORTEUR.w, frameHeight: K.TRIPORTEUR.h });
      this.load.json(this.playerKey + '_noms', v(sheet.names));
      // les planches des jeux de tuiles : lues dans la carte une fois chargée (déjà là : rien à demander)
      const planches = () => {
        const data = this.cache.tilemap.get(MAP.key).data;
        for (const set of data.tilesets) this.load.image(set.name, v('assets/' + set.image));
      };
      if (this.cache.tilemap.exists(MAP.key)) planches();
      else this.load.once('filecomplete-tilemapJSON-' + MAP.key, planches);
    }

    create() {
      const map = this.make.tilemap({ key: MAP.key });
      this.map = map;
      const sets = map.tilesets.map((s) => map.addTilesetImage(s.name, K.extrude(this.textures, s.name, s.tileWidth), s.tileWidth, s.tileHeight, 1, 2));
      this.layers = {};
      map.layers.forEach((l, i) => { this.layers[l.name] = map.createLayer(l.name, sets, 0, 0).setDepth(-10 + i); });
      this.makeTileAnims();

      // où l'on marche : le sol plein, sans tronc
      this.walk = [];
      for (let y = 0; y < map.height; y++) {
        const row = [];
        for (let x = 0; x < map.width; x++) row.push(!!this.layers.sol.getTileAt(x, y));
        this.walk.push(row);
      }
      const objects = (name) => ((map.getObjectLayer(name) || {}).objects) || [];

      // les arbres, chacun à son moment de balancement
      if (!this.anims.exists(TREE.key)) {
        this.anims.create({ key: TREE.key, frames: this.anims.generateFrameNumbers(TREE.key, { start: 0, end: TREE.frames - 1 }), frameRate: TREE.fps, repeat: -1 });
      }
      this.trees = objects('arbres').map((o, i) => {
        const s = this.add.sprite(Math.round(o.x), Math.round(o.y), TREE.key, 0).setOrigin(0.5, TREE.foot / TREE.h).setDepth(o.y);
        if (!reduced()) s.play({ key: TREE.key, startFrame: (i * 3) % TREE.frames, frameRate: TREE.fps * (0.85 + ((i * 37) % 30) / 100) });
        const tx = Math.floor(o.x / T), ty = Math.floor(o.y / T);
        if (this.walk[ty]) this.walk[ty][tx] = false;
        s.n = i;
        s.coups = 0;
        return s;
      });
      this.boisRec = this.readBois();
      for (const t of this.trees.filter((q) => this.boisRec.tombes.includes(q.n))) this.removeTree(t);
      this.morceaux = [];
      for (const m of this.boisRec.morceaux) this.dropPiece(m.x, m.y, false);

      // l'habitant (ses animations portent son nom : elles sont communes à toutes les cartes du jeu)
      const walkAnim = (key, start) => {
        if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(HERO.key, { start, end: start + 3 }), frameRate: HERO.fps, repeat: -1 });
      };
      walkAnim(HERO.key + '_marche_face', 0); walkAnim(HERO.key + '_marche_dos', 4); walkAnim(HERO.key + '_marche_profil', 8);
      const d = objects('depart')[0] || { x: map.widthInPixels / 2, y: map.heightInPixels / 2 };
      // l'habitant, un peu plus loin ; il flâne d'un coin de l'île à l'autre
      const n0 = this.nearWalk(d.x + 3 * T, d.y);
      this.npc = this.add.sprite(Math.round(n0.x), Math.round(n0.y), HERO.key, 12).setOrigin(0.5, 1);
      this.npcShadow = this.add.ellipse(0, 0, 13, 4, 0x281e36, 0.45);
      this.npcPos = { x: n0.x, y: n0.y };
      this.npcFace = 'face';
      this.npcPath = [];
      this.npcWait = 2;
      this.blinkAt = this.time.now + 1500;
      // le personnage du joueur : ses images par nom (marche_bas_0…, idle_cote_0…)
      const noms = (this.cache.json.get(this.playerKey + '_noms') || {}).frames || [];
      this.frame = (name) => Math.max(0, noms.indexOf(name));
      this.hero = this.add.sprite(Math.round(d.x), Math.round(d.y), this.playerKey, this.frame('idle_bas_0')).setOrigin(0.5, PLAYER.foot / PLAYER.h);
      this.selle = K.triporteur(this);
      this.shadow = this.add.ellipse(0, 0, 11, 4, 0x281e36, 0.45);
      this.heroPos = { x: d.x, y: d.y };
      this.face = 'bas';
      this.walked = 0;
      this.path = [];

      // la caméra suit l'habitant, au pixel près, sans sortir de la carte
      const cam = this.cameras.main;
      cam.setBackgroundColor('#1f2943');
      cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
      cam.startFollow(this.hero, true, 0.12, 0.12);
      cam.setRoundPixels(true);
      this.fitZoom();
      window.CarteJeu.suitTaille(this, () => this.fitZoom());

      // un appui (moins de CarteKit.APPUI.glisse px CSS entre l'appui et le relâchement) sur
      // l'habitant : ce qu'on en voit ; ailleurs, un double appui (comme sur les autres cartes) :
      // y aller
      const slop = K.APPUI.glisse * K.ratio();
      const dbl = K.doubleAppui();
      this.input.on('pointerup', (p) => {
        if (p.getDistance() > slop) return;
        const w = cam.getWorldPoint(p.x, p.y);
        if (Math.abs(w.x - this.npcPos.x) <= 10 && w.y >= this.npcPos.y - 38 && w.y <= this.npcPos.y + 4) {
          dbl.oublie();
          if (window.FermeHote && window.FermeHote.say) window.FermeHote.say('👁️ L\'habitant de l\'île te regarde passer, sans un mot.');
          return;
        }
        if (this.tapTree(w)) { dbl.oublie(); return; }
        K.astuceMarche(p);           // un essai de marche : la marche au doigt s'explique, une fois
        if (dbl.appui(w.x, w.y, cam.zoom)) this.goTo(w.x, w.y);
      });
      // le doigt posé puis glissé : il marche dans sa direction tant qu'il reste posé (CarteKit.manette)
      this.manette = K.manette(this);
      // (sans capture : les touches tapées dans un champ de la page y restent ; saisie())
      this.keys = this.input.keyboard ? this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,Z,Q,S,D,W,A', false) : null;
      window.InfraMonde.scene = this;
      this.events.once('destroy', () => { if (window.InfraMonde.scene === this) window.InfraMonde.scene = null; });
    }

    // Les arbres tombés aujourd'hui et les morceaux restés au sol (le jour de l'horloge du jeu).
    readBois() {
      const h = window.HorlogeSortie ? window.HorlogeSortie.maintenant() : null;
      const jour = h ? h.jour : Math.floor(Date.now() / 864e5);
      let r = null;
      try { r = JSON.parse(window.localStorage.getItem(BOIS.store) || 'null'); } catch (e) { r = null; }
      if (!r || r.jour !== jour) return { jour, tombes: [], morceaux: [] };
      return { jour, tombes: r.tombes || r.pris || [], morceaux: Array.isArray(r.morceaux) ? r.morceaux : [] };
    }

    saveBois() {
      this.boisRec.morceaux = this.morceaux.map((m) => ({ x: m.x, y: m.y }));
      try { window.localStorage.setItem(BOIS.store, JSON.stringify(this.boisRec)); } catch (e) { /* ignoré */ }
    }

    // Un arbre de moins : son image, et sa case où l'on marche de nouveau.
    removeTree(t) {
      this.trees.splice(this.trees.indexOf(t), 1);
      const tx = Math.floor(t.x / T), ty = Math.floor(t.y / T);
      if (this.walk[ty] && this.layers.sol.getTileAt(tx, ty)) this.walk[ty][tx] = true;
      t.destroy();
    }

    // Un appui sur un arbre, la hache en main : y aller ; arrivé, un coup de hache (stepTree).
    // Sans la hache, l'appui fait marcher, comme ailleurs.
    tapTree(w) {
      const H = window.FermeHote;
      if (H && H.enMain && H.enMain() !== 'hache') return false;
      const D = BOIS.doigt;
      const t = this.trees.find((s) => !s.down && Math.abs(w.x - s.x) <= D.x && w.y >= s.y - D.haut && w.y <= s.y + D.bas);
      if (!t) return false;
      if (this.chop && this.chop.started) return true;
      // à côté du tronc, du côté où l'on est (sinon l'autre)
      const P = this.heroPos, k = P.x < t.x ? -1 : 1;
      const spots = [k, -k].map((c) => ({ x: t.x + c * BOIS.cote, y: t.y + 1 }));
      const spot = spots.find((q) => this.canWalk(Math.floor(q.x / T), Math.floor(q.y / T))) || this.nearWalk(t.x, t.y + T);
      this.chop = { arbre: t, spot, started: false };
      this.path = [];
      if (Math.hypot(spot.x - P.x, spot.y - P.y) > 3) this.goTo(spot.x, spot.y);
      return true;
    }

    // Arrivé à côté de l'arbre : le geste de la hache ; au coup, l'arbre tremble (ou tombe).
    stepTree(dt) {
      const c = this.chop;
      if (!c) return;
      const P = this.heroPos;
      if (!c.started) {
        if (this.path.length) return;
        if (Math.hypot(c.spot.x - P.x, c.spot.y - P.y) > 12 || c.arbre.down) { this.chop = null; return; }
        c.started = true;
        c.t = 0;
        this.face = 'cote';
        this.hero.setFlipX(c.arbre.x < P.x);
      }
      c.t += dt;
      const k = Math.min(3, Math.floor((c.t / BOIS.swing) * 4));
      c.frame = 'hache_cote_' + k;
      if (k >= 2 && !c.hit) { c.hit = true; this.hitTree(c.arbre); }
      if (c.t >= BOIS.swing) this.chop = null;
    }

    hitTree(t) {
      const H = window.FermeHote;
      K.vibre('hache');
      t.coups += 1;
      this.sparks(t, 4);
      const coups = H && H.coups ? H.coups(BOIS.coups) : BOIS.coups;
      if (t.coups >= coups) { this.fellTree(t); return; }
      if (!reduced()) this.tweens.add({ targets: t, angle: { from: -3, to: 3 }, duration: 60, yoyo: true, repeat: 1, onComplete: () => t.setAngle(0) });
    }

    // Quelques éclats de couleur qui s'échappent de l'arbre.
    sparks(t, n) {
      if (reduced()) return;
      for (let i = 0; i < n; i++) {
        const q = this.add.rectangle(t.x + (Math.random() - 0.5) * 16, t.y - 20 - Math.random() * 20, 2, 2, BOIS.eclats[i % BOIS.eclats.length]).setDepth(t.y + 1);
        this.tweens.add({ targets: q, y: q.y - 10 - Math.random() * 10, alpha: 0, duration: 500 + Math.random() * 300, onComplete: () => q.destroy() });
      }
    }

    // L'arbre bascule autour de son pied, du côté opposé au personnage ; sa cime touche le sol et
    // lâche les morceaux, puis il s'efface. (Gardé tout de suite : partir pendant la chute ne
    // perd rien.)
    fellTree(t) {
      t.down = true;
      t.stop();
      const dir = t.x >= this.heroPos.x ? 1 : -1, F = K.NATURE.chute;
      const spots = [];
      for (let i = 0; i < BOIS.morceaux; i++) {
        const d = BOIS.loin[0] + (BOIS.loin[1] - BOIS.loin[0]) * (BOIS.morceaux > 1 ? i / (BOIS.morceaux - 1) : 0.5);
        const q = this.nearWalk(t.x + dir * d, t.y - 2 + (i % 2 ? 4 : -2));
        spots.push({ x: q.x + (Math.random() - 0.5) * 4, y: q.y - 2 });
      }
      this.boisRec.tombes.push(t.n);
      for (const q of spots) this.boisRec.morceaux.push(q);
      try { window.localStorage.setItem(BOIS.store, JSON.stringify(this.boisRec)); } catch (e) { /* ignoré */ }
      const drop = () => { for (const q of spots) this.dropPiece(q.x, q.y, true); };
      const gone = () => this.removeTree(t);
      if (reduced()) { drop(); this.tweens.add({ targets: t, alpha: 0, duration: 300, onComplete: gone }); return; }
      this.tweens.add({
        targets: t, angle: dir * F.angle, duration: F.ms, ease: 'Quad.easeIn',
        onComplete: () => {
          K.secousse(this, 'chute');
          this.sparks(t, 10);
          drop();
          this.tweens.add({ targets: t, alpha: 0, delay: F.repos, duration: F.fondu, onComplete: gone });
        },
      });
    }

    // Un morceau d'arbre au sol (une petite bûche violette dont le cœur luit) ; `saute` : il
    // vient de tomber, il rebondit un peu.
    dropPiece(x, y, saute) {
      if (!this.textures.exists('infra_morceau')) {
        const cv = document.createElement('canvas');
        cv.width = 10; cv.height = 6;
        const g = cv.getContext('2d');
        const px = (c, x0, y0, w, h) => { g.fillStyle = c; g.fillRect(x0, y0, w, h); };
        px('#2a1838', 1, 0, 8, 6); px('#2a1838', 0, 1, 10, 4);
        px('#8a62b0', 1, 1, 7, 2); px('#5a3a78', 1, 3, 7, 2); px('#c8a0e8', 2, 1, 4, 1);
        px('#4ff0d2', 7, 2, 2, 2); px('#c8fff4', 8, 2, 1, 1);
        this.textures.addCanvas('infra_morceau', cv);
      }
      const img = this.add.image(Math.round(x), Math.round(y), 'infra_morceau').setOrigin(0.5, 1).setDepth(y - 1);
      const m = { x, y, img, refus: false };
      this.morceaux.push(m);
      if (saute && !reduced()) this.tweens.add({ targets: img, y: { from: img.y - 10, to: img.y }, duration: 380, ease: 'Bounce.easeOut' });
    }

    // Chaque image : un morceau sous les pieds du personnage est ramassé (refusé, la nuit : on
    // le retente après s'en être éloigné).
    stepPieces() {
      const P = this.heroPos;
      for (const m of [...this.morceaux]) {
        const d = Math.hypot(P.x - m.x, P.y - m.y);
        if (m.refus) { if (d > BOIS.prise * 2) m.refus = false; continue; }
        if (d > BOIS.prise) continue;
        const H = window.FermeHote;
        const r = H && H.ramasser ? H.ramasser(BOIS.item) : null;
        if (r && !r.ok) { m.refus = true; continue; }
        this.morceaux.splice(this.morceaux.indexOf(m), 1);
        this.tweens.add({ targets: m.img, y: m.img.y - 10, alpha: 0, duration: reduced() ? 0 : 350, onComplete: () => m.img.destroy() });
        this.saveBois();
        this.popGain({ [BOIS.item]: 1 });
      }
    }

    // La bulle « +1 » au-dessus du personnage (CarteKit.bulleGain, comme sur les autres cartes),
    // dans une couche posée sur la carte, retirée avec la scène ; placeGain la suit.
    popGain(items) {
      if (!this.gain) {
        const zone = this.game.canvas && this.game.canvas.parentNode;
        if (!zone) return;
        const couche = document.createElement('div');
        couche.className = 'stage-labels';
        zone.appendChild(couche);
        const H = window.FermeHote;
        this.gain = K.bulleGain(couche, (id) => { const o = H && H.objet ? H.objet(id) : null; return o ? o.icone : id; });
        this.events.once('destroy', () => { couche.remove(); this.gain = null; });
      }
      this.gain.montre(items);
      this.placeGain();
    }

    placeGain() {
      if (!this.gain || !this.gain.visible()) return;
      const cam = this.cameras.main, k = cam.zoom / K.ratio(), P = this.heroPos;
      this.gain.place((P.x - cam.worldView.x) * k, (P.y - BOIS.bulle - cam.worldView.y) * k);
    }

    // Un zoom entier en pixels de l'écran (CarteJeu.zoomEntier), comme en ville.
    fitZoom() {
      this.cameras.main.setZoom(window.CarteJeu.zoomEntier(this));
    }

    // Tuiles animées : les animations des jeux de tuiles (Tiled), jouées en changeant l'index
    // des tuiles posées, toutes au rythme de l'horloge (CarteKit).
    makeTileAnims() {
      this.tileAnims = K.animTuiles(this.map, this.layers);
    }

    stepTileAnims(time) {
      K.pasAnimTuiles(this.tileAnims, time);
    }

    canWalk(tx, ty) {
      return !!(this.walk[ty] && this.walk[ty][tx]);
    }

    // Le chemin le plus court (en tuiles, 8 directions sans couper un coin) jusqu'à la tuile
    // marchable la plus proche du point visé.
    goTo(x, y) {
      const steps = this.pathFrom(this.heroPos, x, y);
      if (steps) this.path = steps;
    }

    // La case marchable la plus proche de (x, y), en px (son milieu, au pied ; CarteKit.plusProche).
    nearWalk(x, y) {
      const gx = Math.floor(x / T), gy = Math.floor(y / T);
      const q = K.plusProche((i, j) => this.canWalk(gx + i, gy + j), 11);
      return q ? { x: (gx + q.i) * T + T / 2, y: (gy + q.j) * T + T - 2 } : { x, y };
    }

    // Le chemin le plus court en nombre de cases (CarteKit.chemin, un pas en diagonale compte
    // pour un), jusqu'à la case marchable la plus proche du point visé ; null s'il n'y en a pas.
    pathFrom(from, x, y) {
      const W = this.map.width, H = this.map.height;
      let gx = Math.floor(x / T), gy = Math.floor(y / T);
      if (!this.canWalk(gx, gy)) {
        const q = K.plusProche((i, j) => this.canWalk(gx + i, gy + j), 7, { de: 1 });
        if (!q) return null;
        gx += q.i; gy += q.j; x = gx * T + T / 2; y = gy * T + T - 2;
      }
      const sx = Math.floor(from.x / T), sy = Math.floor(from.y / T);
      const cells = K.chemin({ cols: W, rows: H, libre: (i) => this.canWalk(i % W, (i / W) | 0) }, sy * W + sx, gy * W + gx, { diag: 1 });
      if (!cells) return null;
      const steps = cells.map((c) => ({ x: (c % W) * T + T / 2, y: Math.floor(c / W) * T + T - 2 }));
      if (steps.length) steps[steps.length - 1] = { x: Math.round(x), y: Math.round(y) };
      return steps;
    }

    // L'habitant : une pause, puis un coin de l'île à quelques pas, au pas lent.
    stepNpc(time, dt) {
      const P = this.npcPos;
      let vx = 0, vy = 0;
      if (!this.npcPath.length) {
        this.npcWait -= dt;
        if (this.npcWait <= 0 && !reduced()) {
          this.npcWait = 2 + Math.random() * 4;
          const t = this.nearWalk(P.x + (Math.random() - 0.5) * 12 * T, P.y + (Math.random() - 0.5) * 8 * T);
          this.npcPath = this.pathFrom(P, t.x, t.y) || [];
        }
      } else {
        const to = this.npcPath[0];
        const dx = to.x - P.x, dy = to.y - P.y, l = Math.hypot(dx, dy), st = HERO.speed * 0.6 * dt;
        if (l <= st) { P.x = to.x; P.y = to.y; this.npcPath.shift(); } else { P.x += (dx / l) * st; P.y += (dy / l) * st; }
        vx = dx; vy = dy;
      }
      const N = this.npc;
      if (vx || vy) {
        this.npcFace = Math.abs(vx) > Math.abs(vy) * 1.1 ? 'profil' : vy > 0 ? 'face' : 'dos';
        if (this.npcFace === 'profil') N.setFlipX(vx < 0);
        const key = HERO.key + '_marche_' + this.npcFace;
        if (!N.anims.isPlaying || N.anims.currentAnim.key !== key) N.play(key);
      } else {
        if (N.anims.isPlaying) N.stop();
        // debout ; de temps en temps, il cligne de l'œil
        if (time > this.blinkAt + HERO.blink.ms) this.blinkAt = time + Phaser.Math.Between(...HERO.blink.every);
        const blink = time > this.blinkAt && this.npcFace !== 'dos';
        N.setFrame({ face: blink ? 13 : 12, dos: 14, profil: blink ? 16 : 15 }[this.npcFace]);
      }
      N.setPosition(Math.round(P.x), Math.round(P.y)).setDepth(P.y);
      this.npcShadow.setPosition(Math.round(P.x), Math.round(P.y) - 1).setDepth(P.y - 0.5);
    }

    update(time, delta) {
      this.stepTileAnims(time);
      const dt = Math.min(delta, 100) / 1000;
      this.stepNpc(time, dt);
      this.stepTree(dt);
      this.stepPieces();
      const P = this.heroPos;
      let vx = 0, vy = 0;
      const k = saisie() ? null : this.keys;
      const j = this.manette.dir();
      if (j) { vx = j.x; vy = j.y; }
      else if (k) {
        vx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.Q.isDown || k.A.isDown ? 1 : 0);
        vy = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.Z.isDown || k.W.isDown ? 1 : 0);
      }
      // en selle sur son triporteur (pas pendant un coup de hache) : plus vite
      const Ho = window.FermeHote;
      const selle = !!(this.selle && Ho && Ho.triporteur && Ho.triporteur() && !(this.chop && this.chop.frame));
      const vit = PLAYER.speed * (selle ? K.TRIPORTEUR.vitesse : 1);
      if (vx || vy) {
        this.path = [];
        this.chop = null;
        const l = Math.hypot(vx, vy), st = vit * dt;
        const nx = P.x + (vx / l) * st, ny = P.y + (vy / l) * st;
        // glisse le long d'un bord : chaque axe séparément
        if (this.canWalk(Math.floor(nx / T), Math.floor(P.y / T))) P.x = nx;
        if (this.canWalk(Math.floor(P.x / T), Math.floor(ny / T))) P.y = ny;
      } else if (this.path.length) {
        const to = this.path[0];
        const dx = to.x - P.x, dy = to.y - P.y, l = Math.hypot(dx, dy), st = vit * dt;
        if (l <= st) { P.x = to.x; P.y = to.y; this.path.shift(); } else { P.x += (dx / l) * st; P.y += (dy / l) * st; }
        vx = dx; vy = dy;
      }
      const H = this.hero;
      const moved = Math.hypot(vx, vy) > 0;
      if (this.chop && this.chop.frame) {
        H.setFrame(this.frame(this.chop.frame));
      } else if (moved) {
        const r = K.regard(vx, vy);
        this.face = r.face; H.setFlipX(r.flip);
        this.walked += vit * dt;
        H.setFrame(this.frame(`marche_${this.face}_${Math.floor(this.walked / PLAYER.stride) % 4}`));
      } else {
        H.setFrame(this.frame(`idle_${this.face}_${Math.floor(time / 600) % 2}`));
      }
      let hx = 0, hy = 0;
      if (selle) {
        const r = this.selle.place(P.x, P.y, this.face, H.flipX, this.walked);
        H.setFrame(this.frame(r.image));
        hx = r.dx; hy = r.dy;
      } else if (this.selle) this.selle.cache();
      H.setPosition(Math.round(P.x + hx), Math.round(P.y - hy)).setDepth(P.y);
      this.shadow.setPosition(Math.round(P.x), Math.round(P.y)).setDepth(P.y - 0.5);
      this.placeGain();
    }
  }

  // Une carte à la fois (js/ui/excursion.js), scène du jeu de toutes les cartes (js/carte/jeu.js) :
  // start la montre dans `parent` (une scène neuve ; les images déjà chargées restent), stop
  // l'enlève. Sans Phaser : false.
  function start(parent) {
    if (!window.CarteJeu) return false;
    return !!window.CarteJeu.montre(parent, 'infra', { cree: () => new InfraScene(), neuve: true });
  }
  function stop() {
    if (window.CarteJeu && window.CarteJeu.affichee() === 'infra') window.CarteJeu.cache('infra');
    window.InfraMonde.scene = null;
  }
  window.InfraMonde = { start, stop, scene: null };
})();
