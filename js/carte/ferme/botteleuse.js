/* carte/ferme/botteleuse.js — la scène de la ferme : la botteleuse.
 *
 * Trois sortes de blocs posés côte à côte (js/engine/botteleuse.js) : l'entonnoir, la machine,
 * puis les segments du convoyeur (modèle.botteleuses : [{ case, entonnoir, convoyeurs, bout,
 * fibres, pleine, ok }] ; leurs images : chantier.js, comme les autres blocs). Un appui sur une
 * de ses pièces : le personnage va devant l'entonnoir et y jette ses fibres au-dessus de sa tête
 * (geste « jeter », js/fermier.js) ; des brins volent jusqu'à la bouche de l'entonnoir et le jeu
 * les compte (le pont : ctx.bridge.verser). Quand la machine a reçu toutes ses fibres
 * (modèle : pleine), elle vibre DATA.BOTTELEUSE.VIBRE_S secondes, son voyant allumé, la bande du
 * convoyeur tourne ; puis la botte de paille sort à droite, avance sur la bande et tombe au sol,
 * au bout : le jeu en fait un morceau de paille (ctx.bridge.botte), que le personnage ramasse en
 * marchant dessus (cueillette.js, stepPieces). Une machine pleine au chargement de la carte
 * recommence son cycle.
 *
 * Le distributeur de grain du Poulailler (js/engine/distributeur.js) se sert du même geste :
 * l'entonnoir, le distributeur, la mangeoire (modèle.distributeurs : [{ case, entonnoir,
 * mangeoire, cases, grain, capacite, plein, ok }] ; leurs images : chantier.js, syncMeuble). Un
 * appui sur une de ses pièces : le personnage va devant l'entonnoir et y jette son blé (le
 * pont : ctx.bridge.verserGrain) ; des grains volent jusqu'à la bouche.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const F = global.FermeCarte;
  const { T, BLOCS_CARTE, RAMASSABLES, BOTTELEUSE: B } = F.C;
  const reduit = () => K.reduit();

  F.partie({

    // Les botteleuses du modèle ; une machine pleine (et raccordée) commence son cycle.
    // `vibre` : sa durée (s, DATA.BOTTELEUSE.VIBRE_S) ; `fibres` : celles de l'inventaire.
    syncBotteleuses(list, vibre, fibres) {
      if (!this.botteleuses) { this.botteleuses = new Map(); this.botteCycles = new Map(); }
      this.botteVibre = (vibre || 3) * 1000;
      this.fibresEnMain = fibres | 0;
      const seen = new Set();
      for (const b of list || []) {
        seen.add(b.case);
        this.botteleuses.set(b.case, b);
        if (b.ok && b.pleine && !this.botteCycles.has(b.case)) {
          this.botteCycles.set(b.case, { phase: 'vibre', t: 0, img: null });
          const cols = this.grid && this.grid.cols;   // la machine se met en marche (js/son.js)
          if (global.FermeSon && cols) global.FermeSon.joue('botteleuse', { x: (b.case % cols) * T + T / 2, y: (Math.floor(b.case / cols) + 1) * T, portee: 16 });
        }
      }
      for (const c of [...this.botteleuses.keys()]) if (!seen.has(c)) { this.botteleuses.delete(c); this.finCycle(c); }
    },

    // La botteleuse dont une pièce est sous le doigt (la case de sa machine), ou -1. (Les images
    // des blocs dépassent d'une demi-case au-dessus de la leur.)
    botteleuseAt(wx, wy) {
      if (!this.botteleuses || !this.botteleuses.size) return -1;
      const cols = this.grid.cols, c = Math.floor(wx / T);
      for (const b of this.botteleuses.values()) {
        for (const t of [b.entonnoir, b.case, ...b.convoyeurs]) {
          const r = Math.floor(t / cols);
          if (t % cols === c && wy >= r * T - T / 2 && wy < (r + 1) * T) return b.case;
        }
      }
      return -1;
    },

    // Les distributeurs de grain du modèle ; `grain` : le blé du joueur (inventaire et Silo).
    syncDistributeurs(list, grain) {
      this.distributeurs = new Map((list || []).map((d) => [d.case, d]));
      this.grainEnMain = grain | 0;
    },

    // Le distributeur dont une pièce est sous le doigt (la case du distributeur), ou -1. (Son
    // image dépasse d'une case et demie au-dessus de la sienne, celle de l'entonnoir d'une demie.)
    distributeurAt(wx, wy) {
      if (!this.distributeurs || !this.distributeurs.size) return -1;
      const cols = this.grid.cols, c = Math.floor(wx / T);
      for (const d of this.distributeurs.values()) {
        for (const t of d.cases) {
          const r = Math.floor(t / cols), haut = t === d.case ? 1.5 * T : T / 2;
          if (t % cols === c && wy >= r * T - haut && wy < (r + 1) * T) return d.case;
        }
      }
      return -1;
    },

    // Un appui sur le distributeur `m` : le personnage va devant l'entonnoir et y jette son blé
    // (comme les fibres dans la botteleuse). Ce qui l'empêche : le jeu le dit, sans qu'il bouge.
    jeterGrain(m) {
      const d = this.distributeurs && this.distributeurs.get(m), bridge = this.ctx.bridge;
      if (!d || !bridge || !bridge.verserGrain) return;
      if (this.ctx.lastModel && this.ctx.lastModel.coucher) return;
      this.jeterDans(d.entonnoir, () => bridge.verserGrain(m), !d.ok || d.plein || this.grainEnMain < 1, RAMASSABLES.frames.paille);
    },

    // Le personnage va devant l'entonnoir `e` et y jette (`verser` : le jeu compte ce qui est
    // versé) ; des brins (l'image `frame` de la planche des ramassables) volent jusqu'à la bouche.
    // `refus` : rien ne peut y aller, le jeu le dit sans qu'il bouge.
    jeterDans(e, verser, refus, frame) {
      if (refus || !this.fermier) { verser(); return; }
      const p = this.devantEntonnoir(e);
      if (!p) { verser(); return; }
      const jeter = () => {
        const r = verser();
        if (r && r.ok) this.volerBrins(p.bouche, frame);
      };
      this.geste({
        cle: 'entonnoir:' + e, seul: true, images: () => this.imagesEntonnoir(e), coup: jeter,
        lance: (opts) => this.fermier.jeter(p, p.face, p.flip, jeter, opts),
      });
    },

    // Où se tenir pour jeter dans l'entonnoir `e` : à sa gauche (de profil, tourné vers lui : on
    // le voit), sinon devant (sous lui, de dos), sinon derrière (de face) ; { x, y, face, flip,
    // bouche } ou null.
    devantEntonnoir(e) {
      const cols = this.grid.cols, ex = (e % cols) * T + T / 2, bas = (Math.floor(e / cols) + 1) * T;
      const ok = (x, y) => this.fermier.standable(x, y);
      const places = [
        { x: ex - T + 2, y: bas - 2, face: 'cote', flip: false },
        { x: ex, y: bas + B.devant, face: 'haut', flip: false },
        { x: ex, y: bas - T - 2, face: 'bas', flip: false },
      ];
      const p = places.find((q) => ok(q.x, q.y));
      return p ? Object.assign({ bouche: { x: ex, y: bas - B.bouche } }, p) : null;
    },

    // L'entonnoir `e` (son bloc) : ses images, pour le reflet de la file des gestes (file.js).
    imagesEntonnoir(e) {
      const bloc = this.blocks && this.blocks.get(e);
      return bloc && bloc.img ? [bloc.img] : [];
    },

    // Un appui sur la botteleuse `m` (la case de sa machine) : l'entonnoir scintille (la file des
    // gestes, file.js), le personnage y va et y jette ses fibres. Rien de raccordé : le jeu le dit
    // tout de suite, sans qu'il bouge. Ce qui l'empêche à l'arrivée (elle travaille, elle est
    // pleine, pas de fibres en main) : le jeu le dit là-bas, sans geste.
    jeterFibres(m) {
      const b = this.botteleuses && this.botteleuses.get(m), bridge = this.ctx.bridge;
      if (!b || !bridge || !bridge.verser) return;
      if (this.ctx.lastModel && this.ctx.lastModel.coucher) return;   // au lit (ou en y allant) : rien
      const prete = () => b.ok && !b.pleine && !this.botteCycles.has(m) && this.fibresEnMain >= 1;
      if (!b.ok || !this.fermier) { bridge.verser(m); return; }
      const p = this.devantEntonnoir(b.entonnoir);
      if (!p) { bridge.verser(m); return; }
      const jeter = () => {
        const r = bridge.verser(m);
        if (r && r.ok) this.volerBrins(p.bouche);
      };
      this.geste({
        cle: 'entonnoir:' + b.entonnoir, seul: true, images: () => this.imagesEntonnoir(b.entonnoir),
        faire: () => { if (prete()) return true; bridge.verser(m); return false; }, coup: jeter,
        lance: (opts) => this.fermier.jeter(p, p.face, p.flip, jeter, opts),
      });
    },

    // Des brins (des fibres, ou `frame`) volent des mains du personnage à la bouche de l'entonnoir.
    volerBrins(bouche, frame = RAMASSABLES.frames.fibre) {
      const pos = this.fermier && this.fermier.pos();
      if (!pos || reduit() || !this.has(RAMASSABLES.key)) return;
      for (let k = 0; k < 3; k++) {
        const img = this.add.image(pos.x + (k - 1) * 3, pos.y - 30, RAMASSABLES.key, frame).setOrigin(0.5, 1).setScale(0.6).setDepth(bouche.y + 40);
        this.tweens.add({
          targets: img, x: bouche.x + (k - 1) * 2, y: bouche.y, scale: 0.35, delay: k * 60, duration: B.volMs, ease: 'Quad.easeIn',
          onComplete: () => img.destroy(),
        });
      }
    },

    // Chaque image : les cycles en cours (la machine vibre, la botte avance, puis tombe).
    stepBotteleuses(dt) {
      if (!this.botteCycles || !this.botteCycles.size || !this.blocks) return;
      const cols = this.grid.cols;
      for (const [m, cy] of [...this.botteCycles]) {
        const b = this.botteleuses.get(m), machine = this.blocks.get(m);
        if (!b || !machine || !machine.img.active) { this.finCycle(m); continue; }
        if (reduit()) { this.sortirBotte(m, b); continue; }
        cy.t += dt;
        const bande = Math.floor(cy.t / B.bandeMs) % 2;
        this.tournerBande(b, bande);
        const ligne = (Math.floor(m / cols) + 1) * T;
        if (cy.phase === 'vibre') {
          machine.img.setFrame(BLOCS_CARTE.frames.botteleuse_marche);
          machine.img.x = machine.x + (Math.floor(cy.t / B.secousseMs) % 2 ? B.secousse : -B.secousse);
          if (cy.t < this.botteVibre) continue;
          machine.img.x = machine.x;
          cy.phase = 'tapis';
          cy.t = 0;
          const x = (m % cols) * T + T - 4, y = ligne - B.bande;
          cy.img = this.add.image(x, y, RAMASSABLES.key, RAMASSABLES.frames.botte).setOrigin(0.5, 1).setDepth(ligne + 1);
          cy.fin = (b.bout % cols) * T - 6;
        } else if (cy.phase === 'tapis') {
          cy.img.x = Math.min(cy.fin, cy.img.x + (B.vitesse * dt) / 1000);
          if (cy.img.x < cy.fin) continue;
          cy.phase = 'chute';
          const point = { x: (b.bout % cols) * T + T / 2, y: Math.floor(b.bout / cols) * T + B.pose };
          cy.point = point;
          this.tweens.add({
            targets: cy.img, x: point.x, y: point.y, duration: B.chuteMs, ease: 'Bounce.easeOut',
            onUpdate: () => cy.img.setDepth(cy.img.y),
            onComplete: () => this.sortirBotte(m, b, point),
          });
        }
      }
    },

    // La bande des convoyeurs de `b` : l'image `k` (0 ou 1) de chacun, ou la première (à l'arrêt).
    tournerBande(b, k) {
      for (const t of b.convoyeurs) {
        const e = this.blocks.get(t);
        if (!e || !e.img.active) continue;
        const bout = t === b.convoyeurs[b.convoyeurs.length - 1];
        const f = BLOCS_CARTE.frames[bout ? 'convoyeur_bout' : 'convoyeur'] + k;
        if (e.img.frame.name !== f) e.img.setFrame(f);
      }
    },

    // La botte a touché le sol (ou, sans animation, tout de suite) : le jeu en fait un morceau de
    // paille au bout du convoyeur ; la machine s'arrête.
    sortirBotte(m, b, point) {
      const cols = this.grid.cols;
      const p = point || { x: (b.bout % cols) * T + T / 2, y: Math.floor(b.bout / cols) * T + B.pose };
      const bridge = this.ctx.bridge;
      if (bridge && bridge.botte) bridge.botte(m, { carte: 'ferme', point: p });
      this.finCycle(m);
    },

    finCycle(m) {
      const cy = this.botteCycles && this.botteCycles.get(m);
      if (!cy) return;
      if (cy.img) cy.img.destroy();
      this.botteCycles.delete(m);
      const machine = this.blocks && this.blocks.get(m), b = this.botteleuses && this.botteleuses.get(m);
      if (machine && machine.img.active) machine.img.setFrame(BLOCS_CARTE.frames.botteleuse).setX(machine.x);
      if (b) this.tournerBande(b, 0);
    },
  });
})(window);
