/* carte/nature.js — ce qui pousse, tombe et se pêche, pareil sur toutes les cartes
 * (CarteKit.NATURE, CarteKit.PECHE, CarteKit.herbe, CarteKit.fondu).
 *
 * La ferme (js/carte/ferme/) et la carte de transition, la montagne, la plage
 * (js/carte/ville/nature.js, peche.js) ont la même herbe haute, les mêmes arbres qui
 * s'éclaircissent devant le personnage, les mêmes arbres qui tombent sous la hache et les
 * mêmes rochers qui éclatent sous la pioche, la même ligne de pêche : un seul réglage ici.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;

  const NATURE = {
    // L'herbe haute (scripts/carte/herbe_haute.py, assets/herbe_haute.png : 5 images de 22×16
    // par rangée, une rangée par variante). Quand le personnage la traverse, la touffe penche
    // dans le sens de sa marche puis revient (images de `swing`, `step` ms chacune : 0 droite,
    // 1 et 2 à droite, 3 et 4 à gauche). On est dans la touffe à moins de `reach` px de son pied.
    // Chaque touffe a sa nuance (± `shade`) : deux touffes voisines ne se confondent pas.
    herbe: { key: 'herbe_haute', file: 'herbe_haute.png', frame: { frameWidth: 22, frameHeight: 16 }, frames: 5,
      swing: [2, 1, 0, 3, 0, 1, 0], step: 75, reach: { x: 9, up: 6, down: 4 }, shade: 0.12 },
    // Un arbre devant le personnage, qui le cache : son opacité.
    devant: 0.6,
    // L'ombre portée d'un arbre adulte (assets/ombre_arbre.png, scripts/carte/arbres_3d.py),
    // posée sur le sol : son coin haut-gauche, (dx, dy) px du pied de l'arbre.
    ombre: { key: 'ombre_arbre', file: 'ombre_arbre.png', dx: -16, dy: -8 },
    // La hache : au dernier coup, l'arbre bascule de `angle` degrés autour de son pied (du côté
    // opposé au personnage) en `ms`, rebondit de `rebond` degrés (`rebondMs`), lâche `feuilles`
    // feuilles et copeaux (`couleurs`), reste couché `repos` ms puis s'efface en `fondu` ms. Un
    // arbre qui repousse (quelques jours plus tard) paraît en `repousse` ms.
    chute: {
      ms: 700, angle: 86, rebond: 5, rebondMs: 140, repos: 600, fondu: 700, repousse: 1200, feuilles: 26,
      couleurs: [0x2f6b3a, 0x4e8f43, 0x77ad4f, 0x9cc36a, 0x6b4a2b, 0x8a6337],
    },
    // La pioche : les éclats de pierre, gris (`couleurs`) quand le rocher se brise, plus clairs
    // (`coup`) à chaque coup : ils partent devant le rocher, qui est gris lui aussi.
    eclats: {
      couleurs: [0x5d5a63, 0x8a8790, 0xa9a6ad, 0xc9c5c6, 0x6f6a6c],
      coup: [0xe4e0dc, 0xc9c5c6, 0xa9a6ad, 0xe4e0dc, 0x5d5a63],
    },
  };

  // La pêche : la touche se fait attendre `attente` secondes (au hasard entre les deux) ; le
  // bouchon (haut rouge, bas blanc) et le fil.
  const PECHE = {
    attente: [2.2, 4.8],
    bouchon: { haut: 0xd8483a, bas: 0xf4efe6, fil: 0xe8e4dc },
  };

  // Chaque image : l'herbe haute que le personnage traverse penche dans le sens de sa marche
  // (vers la droite s'il va à droite) et revient en se balançant. `list` : les touffes
  // ({ img, x, y, base (première image de sa rangée), t, dir, inside }) ; `P` : les pieds du
  // personnage (null : il n'est pas là) ; `prev` : ses pieds à l'image d'avant ; `dt` en ms.
  // Renvoie la position à garder pour l'image suivante (`prev` lui-même, mis à jour, quand il
  // existe : rien n'est alloué à chaque image).
  function herbe(list, P, prev, dt) {
    const G = NATURE.herbe;
    const dx = P && prev ? P.x - prev.x : 0;
    const moving = !!(P && prev && Math.hypot(dx, P.y - prev.y) > 0.05);
    const R = G.reach;
    for (const g of list) {
      const inside = !!P && Math.abs(P.x - g.x) < R.x && P.y > g.y - R.up && P.y < g.y + R.down;
      if (inside && moving && (!g.inside || g.t < 0) && g.img.visible && !K.reduit()) {
        g.t = 0;
        g.dir = Math.abs(dx) > 0.05 ? Math.sign(dx) : (P.x < g.x ? 1 : -1);
      }
      g.inside = inside;
      if (g.t < 0) continue;
      g.t += dt;
      const k = Math.floor(g.t / G.step);
      if (k >= G.swing.length) { g.t = -1; g.img.setFrame(g.base); continue; }
      let f = G.swing[k];
      if (g.dir < 0) f = f === 1 ? 3 : f === 2 ? 4 : f === 3 ? 1 : f === 4 ? 2 : 0;
      g.img.setFrame(g.base + f);
    }
    if (!P) return null;
    if (!prev) return { x: P.x, y: P.y };
    prev.x = P.x; prev.y = P.y;
    return prev;
  }

  // L'opacité d'un arbre qui passe de `cur` à `want` (NATURE.devant derrière lui, 1 sinon)
  // doucement : un peu plus à chaque image (`dt` en ms).
  function fondu(cur, want, dt) {
    const k = Math.min(1, dt / 120);
    return Math.abs(want - cur) < 0.02 ? want : cur + (want - cur) * k;
  }

  Object.assign(K, { NATURE, PECHE, herbe, fondu });
})(window);
