/* carte/ferme/file.js — la scène de la ferme : la file des gestes du joueur.
 *
 * Chaque appui sur une cible (une touffe à faucher, un arbre à couper, un rocher, une pierre à
 * ramasser, l'entonnoir de la botteleuse…) est une intention : le jeu ne fait rien tout de suite.
 * Le personnage y va, à pied, dans l'ordre des appuis ; c'est quand il arrive et lève l'outil
 * que le jeu joue l'action (l'énergie, la fibre, le bois…). Un geste qui n'a plus lieu d'être
 * (la touffe déjà fauchée, l'arbre tombé) est sauté ; un geste oublié (« Dormir », la manette
 * qui le dirige, une autre carte) ne coûte rien.
 *
 * Tant qu'elle attend son geste, la cible scintille : un reflet irisé (bleu, violet, rose, or)
 * qui ondule sur son dessin. Le reflet s'éteint quand le geste commence.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { reducedMotion } = F;

  // Les teintes du reflet, dans l'ordre où elles défilent.
  const IRIS = [0x4796e3, 0x6f86d6, 0x9177c7, 0xb26bb0, 0xca6673, 0xe08a5b, 0xe8b65a, 0x7cc8c8];
  const REFLET = {
    tour: 2200,        // ms : les teintes font le tour
    ondule: 1100,      // ms : l'éclat monte et redescend
    alpha: [0.6, 1],   // l'éclat, du plus faible au plus fort
    calme: 0.7,        // l'éclat fixe (mouvements réduits)
    verifie: 300,      // ms : on regarde si les gestes marqués sont encore prévus
  };
  // Le geste refusé à l'arrivée : pas de chemin jusqu'à la cible.
  const SANS_CHEMIN = 'Je ne peux pas aller jusque-là.';

  const iris = (u) => {
    u = ((u % 1) + 1) % 1;
    const f = u * IRIS.length, i = Math.floor(f), k = f - i;
    const a = IRIS[i], b = IRIS[(i + 1) % IRIS.length];
    const m = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * k);
    return (m(16) << 16) | (m(8) << 8) | m(0);
  };

  F.partie({

    // Un geste demandé par le joueur. `e` :
    //   cle         ce qu'il vise (« herbe:x,y », « arbre:id »…) : le reflet est sur elle tant
    //               qu'un geste l'attend ;
    //   seul        un seul geste à la fois sur elle (une touffe, une pierre) : un second appui
    //               pendant qu'elle attend ne fait rien ;
    //   images()    ses images (le reflet les recouvre) ;
    //   action      l'action qui coûte de l'énergie ('couper', 'piocher', 'faucher'), ou rien ;
    //   valide()    quand vient son tour : a-t-elle encore lieu d'être ? (sinon : sautée) ;
    //   faire()     le jeu joue l'action, à l'arrivée (false : refusée, un message) ;
    //   coup        ce qui se passe au coup (l'onHit du geste) ;
    //   lance(opts) le personnage y va (js/fermier.js : chop, mine, scythe, gather, jeter…, avec
    //               `opts`) ; false : il ne peut pas (le geste se fait alors sur place).
    //   lache()     plus aucun geste ne l'attend (le reflet s'en va) : ce que images() a créé
    //               pour lui s'en va aussi ;
    //   immediat    le jeu joue l'action tout de suite, sans file (le coup fort).
    geste(e) {
      if (this.ctx.lastModel && this.ctx.lastModel.coucher) return;   // au lit (ou en y allant) : rien
      const B = this.ctx.bridge;
      if (e.immediat) {
        if (e.faire && e.faire() === false) return;
        if (!this.fermier || !e.lance({})) e.coup();
        return;
      }
      if (e.seul && this.fileA(e.cle)) return;
      // (assez d'énergie pour ce geste et ceux du même genre qui attendent ? sinon : le message)
      if (B && B.gestePossible && !B.gestePossible(e.action || null, this.fileCompte(e.action) + 1)) return;
      const m = this.marquer(e);
      const opts = {
        valide: () => {
          if (!m.vivant) return false;
          if (e.valide && !e.valide()) { this.demarquer(m); return false; }
          return true;
        },
        avant: (arrive) => {
          this.demarquer(m);
          if (!arrive) { this.refusGeste(e); return false; }
          return !e.faire || e.faire() !== false;
        },
      };
      if (this.fermier && e.lance(opts)) return;
      this.demarquer(m);
      if (!e.faire || e.faire() !== false) e.coup();
    },

    // Un geste attend-il la cible `cle` ?
    fileA(cle) {
      return !!(this.file && this.file.some((m) => m.cle === cle));
    },
    // Combien de gestes en attente coûtent l'énergie de `action` ?
    fileCompte(action) {
      if (!action || !this.file) return 0;
      return this.file.filter((m) => m.action === action).length;
    },

    // Le reflet sur la cible du geste `e` (une marque de la file).
    marquer(e) {
      if (!this.file) this.file = [];
      const m = { cle: e.cle, action: e.action || null, coup: e.coup, images: e.images, lache: e.lache, vivant: true, t0: this.time.now };
      this.file.push(m);
      this.refletsCible(e.cle);
      return m;
    },
    demarquer(m) {
      if (!m.vivant) return;
      m.vivant = false;
      this.file = this.file.filter((q) => q !== m);
      this.refletsCible(m.cle);
    },

    // Les reflets de la cible `cle` : une copie de chacune de ses images, peinte d'un dégradé
    // irisé et ajoutée par-dessus (mode « ADD ») ; ôtés quand plus aucun geste ne l'attend.
    refletsCible(cle) {
      if (!this.reflets) this.reflets = new Map();
      const m = this.file.find((q) => q.cle === cle);
      const r = this.reflets.get(cle);
      if (!m) {
        if (r) { for (const c of r.copies) c.img.destroy(); this.reflets.delete(cle); if (r.lache) r.lache(); }
        return;
      }
      if (r) return;
      const P = global.Phaser;
      const copies = [];
      for (const src of (m.images && m.images()) || []) {
        if (!src || !src.active || !src.texture) continue;
        const img = this.add.image(src.x, src.y, src.texture.key, src.frame.name)
          .setTintMode(P.TintModes.FILL).setBlendMode(P.BlendModes.ADD);
        copies.push({ src, img });
      }
      this.reflets.set(cle, { copies, lache: m.lache, decale: (this.reflets.size * 0.17) % 1 });
      this.stepFile(0);
    },

    // Le pas de la file (chaque image) : les reflets suivent leur image (elle tremble, change
    // d'image) et ondulent ; de temps en temps, les gestes que le personnage n'a plus prévus
    // (oubliés : la manette, « Dormir »…) perdent leur reflet.
    stepFile(dt) {
      if (!this.reflets || !this.reflets.size) { if (this.file && this.file.length) this.verifieFile(dt); return; }
      this.verifieFile(dt);
      const now = this.time.now, calme = reducedMotion();
      for (const [, r] of this.reflets) {
        const u = calme ? r.decale : now / REFLET.tour + r.decale;
        const a = calme ? REFLET.calme : REFLET.alpha[0] + (REFLET.alpha[1] - REFLET.alpha[0]) * (0.5 + 0.5 * Math.sin((now / REFLET.ondule + r.decale) * Math.PI * 2));
        for (const c of r.copies) {
          const s = c.src, img = c.img;
          if (!s.active) { img.setVisible(false); continue; }
          if (img.frame.name !== s.frame.name || img.texture.key !== s.texture.key) img.setTexture(s.texture.key, s.frame.name);
          img.setPosition(s.x, s.y).setOrigin(s.originX, s.originY).setScale(s.scaleX, s.scaleY).setAngle(s.angle)
            .setFlip(s.flipX, s.flipY).setDepth(s.depth + 0.01).setVisible(s.visible && s.alpha > 0.05).setAlpha(a * s.alpha)
            .setTint(iris(u), iris(u + 0.15), iris(u + 0.3), iris(u + 0.45));
        }
      }
    },
    verifieFile(dt) {
      this.fileVerifie = (this.fileVerifie || 0) - (dt || 0);
      if (this.fileVerifie > 0 || !this.file || !this.file.length) return;
      this.fileVerifie = REFLET.verifie;
      const f = this.fermier;
      for (const m of this.file.slice()) {
        if (this.time.now - m.t0 < REFLET.verifie) continue;      // (il vient d'être demandé)
        if (!f || !f.attend || !f.attend(m.coup)) this.demarquer(m);
      }
    },

    // Plus de file (une autre carte, « Dormir »…) : les reflets s'en vont.
    viderFile() {
      for (const m of (this.file || []).slice()) this.demarquer(m);
    },

    // Arrivé sans pouvoir atteindre la cible : une petite bulle le dit, au-dessus de lui.
    refusGeste() {
      const p = this.fermier && this.fermier.pos();
      if (p && this.showCaseTip) this.showCaseTip(SANS_CHEMIN, p.x, p.y - 26);
    },
  });
})(window);
