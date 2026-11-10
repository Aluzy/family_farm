/* carte/ferme/rougegorges.js — la scène de la ferme : les rouges-gorges posés sur les barrières.
 *
 * Une barrière sur 64 (son détail « oiseau », chantier.js detailCloture) a un rouge-gorge sur son poteau. Il n'est
 * pas dans le dessin de la barrière (elle est dessinée sans lui) : c'est une petite image à part, qui vit. Posé, il
 * se retourne de temps en temps. Quand le personnage ou quelqu'un de la famille s'approche à moins de
 * ROUGEGORGE.peur px, il s'envole, à l'opposé, en battant des ailes, monte et disparaît ; il revient se poser sur son
 * poteau ROUGEGORGE.absence s plus tard, quand plus personne n'est près de lui (à plus de ROUGEGORGE.retour px).
 * Avec « animations réduites », il reste posé.
 *
 * Méthodes de la scène de la ferme (js/farm-stage.js), posées sur son prototype : `this` est la
 * scène, `this.ctx` ce que la page lui a donné au montage (voir docs/architecture-phaser.md).
 */
(function (global) {
  'use strict';

  const F = global.FermeCarte;
  const { reducedMotion } = F;

  // Le rouge-gorge : posé (le poteau, son dos, sa gorge orange, le bec), puis en vol, les ailes levées, puis
  // baissées. Ses images (lettres ; `couleurs`) ; son coin haut gauche, posé, dans l'image de 16 × 24 de la
  // barrière (`pose`) ; en vol : `vitesse` px/s, `monte` px/s, `battements` par seconde ; il s'efface en `efface` s.
  const ROUGEGORGE = {
    key: 'rougegorge',
    dessins: [
      ['.kkkk..', 'kbbbbkY', 'kooobk.', '.kkkk..'],
      ['k.....k', 'kb...bk', '.kbbbkY', '..kook.'],
      ['.......', '.kbbbk.', 'kbooobY', 'k.kkk.k'],
    ],
    couleurs: { k: '#241e14', b: '#6e503a', o: '#c85a3c', Y: '#e6962a' },
    pose: [4, 4], peur: 40, retour: 72, absence: [12, 25], vitesse: 60, monte: 26, battements: 12, efface: 1.6,
    tourne: [2.5, 7],
  };
  // (h : le hasard de l'oiseau, à graine : fiche 33)
  const entre = (a, b, h = Math.random) => a + h() * (b - a);

  F.partie({

    // Ses images (3 : posé, ailes levées, ailes baissées), faites une fois.
    rougegorgeTexture() {
      const R = ROUGEGORGE;
      if (this.textures.exists(R.key)) return R.key;
      const h = R.dessins[0].length, w = R.dessins[0][0].length;
      const tex = this.textures.createCanvas(R.key, w * R.dessins.length, h);
      const c = tex.getContext();
      R.dessins.forEach((rangs, k) => rangs.forEach((rang, y) => [...rang].forEach((ch, x) => {
        if (!R.couleurs[ch]) return;
        c.fillStyle = R.couleurs[ch];
        c.fillRect(k * w + x, y, 1, 1);
      })));
      tex.refresh();
      R.dessins.forEach((_, k) => tex.add(k, 0, k * w, 0, w, h));
      return R.key;
    },

    // Chaque image : les rouges-gorges des barrières posées (un par barrière au détail « oiseau »), posés,
    // envolés, partis, revenus.
    stepRougegorges(dt) {
      const R = ROUGEGORGE, B = this.blocks;
      if (!this.rougegorges) this.rougegorges = new Map();
      const G = this.rougegorges, vus = new Set();
      // (fiche 33 : les perchoirs ne sont revus que quand les blocs ont changé : le modèle, modele.js)
      if (B && F.estPerchoir && !this.perchoirsRevus) {
        this.perchoirsRevus = true;
        for (const e of B.values()) {
          if (!F.estPerchoir(e)) continue;
          vus.add(e.case);
          if (G.has(e.case)) continue;
          const img = this.add.image(0, 0, this.rougegorgeTexture(), 0).setOrigin(0, 0);
          // (posé : le haut de son image dans celle de la barrière, 16 × 24, posée par le milieu du bas de la case)
          const x = e.x - 8 + R.pose[0], y = e.y - 24 + R.pose[1];
          const h = this.hasardDe('rouge-gorge:' + e.case);
          G.set(e.case, { img, x, y, hx: x, hy: y, etat: 'pose', t: entre(R.tourne[0], R.tourne[1], h), flip: h() < 0.5, pied: e.y, h });
        }
        for (const [c, o] of G) if (!vus.has(c)) { o.img.destroy(); G.delete(c); }
      }
      if (!G.size) return;
      // qui peut l'effrayer : le personnage, la famille
      const gens = [];
      if (this.fermier) gens.push(this.fermier.pos());
      if (this.family) for (const m of this.family.info()) if (m.visible) gens.push(m);
      const proche = (o, r) => gens.some((p) => p && Math.hypot(p.x - (o.hx + 3), p.y - (o.pied - 2)) < r);
      for (const o of G.values()) {
        const img = o.img;
        if (reducedMotion()) {
          img.setPosition(o.hx, o.hy).setFrame(0).setAlpha(1).setVisible(true).setFlipX(o.flip).setDepth(o.pied + 0.6);
          continue;
        }
        o.t -= dt;
        if (o.etat === 'pose') {
          if (proche(o, R.peur)) {
            // il s'envole à l'opposé de qui s'approche (le plus proche), en montant
            const p = gens.reduce((a, q) => (!a || Math.hypot(q.x - o.hx, q.y - o.hy) < Math.hypot(a.x - o.hx, a.y - o.hy) ? q : a), null);
            const dx = o.hx - p.x, dy = o.hy - p.y, n = Math.hypot(dx, dy) || 1;
            o.vx = (dx / n) * R.vitesse; o.vy = Math.min(0, (dy / n) * R.vitesse) - R.monte;
            o.flip = o.vx < 0;
            o.etat = 'envol'; o.t = R.efface; o.age = 0;
          } else if (o.t <= 0) {
            o.flip = !o.flip;                     // (il se retourne)
            o.t = entre(R.tourne[0], R.tourne[1], o.h);
          }
          img.setPosition(o.hx, o.hy).setFrame(0).setAlpha(1).setVisible(true).setFlipX(o.flip).setDepth(o.pied + 0.6);
        } else if (o.etat === 'envol') {
          o.age += dt;
          o.x += o.vx * dt; o.y += o.vy * dt;
          const k = 1 + (Math.floor(o.age * R.battements) % 2);
          img.setPosition(Math.round(o.x), Math.round(o.y)).setFrame(k).setFlipX(o.flip)
            .setAlpha(Math.max(0, Math.min(1, o.t / (R.efface * 0.5)))).setDepth(9e5);
          if (o.t <= 0) { o.etat = 'parti'; o.t = entre(R.absence[0], R.absence[1], o.h); img.setVisible(false); }
        } else if (o.etat === 'parti') {
          // il revient quand personne n'est près de son poteau
          if (o.t <= 0 && !proche(o, R.retour)) { o.etat = 'pose'; o.x = o.hx; o.y = o.hy; o.t = entre(R.tourne[0], R.tourne[1], o.h); }
        }
        if (o.etat !== 'envol') { o.x = o.hx; o.y = o.hy; }
      }
    },
  });
})(window);
