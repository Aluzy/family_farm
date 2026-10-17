/* carte/lumiere.js — le jour et la nuit sur les cartes (CarteKit.lumiere, CarteKit.voile).
 *
 * Un voile de la taille de la carte, posé au-dessus de tout ce qui est dessiné (le sol, les
 * bâtiments, les personnages), multiplie leurs couleurs par celle de l'heure : blanc en plein
 * jour (le voile est alors caché), doré le soir, bleu et sombre la nuit (on distingue encore
 * les formes). Ce qui est en DOM (étiquettes, bulles, boutons) reste au-dessus, en couleurs.
 *
 * La ferme le règle sur l'heure de son modèle (js/ui/stage.js) ; la ville, la carte de
 * transition, la montagne et la plage sur l'horloge du jeu (HorlogeSortie, js/ui/excursion.js).
 * La grotte a sa propre obscurité (la lumière autour du personnage), les intérieurs restent
 * éclairés, l'infra-monde garde sa lumière à lui.
 *
 * Des lumières (voile.eclaire(sources) : les réverbères et les phares, js/carte/ville/
 * eclairage.js) : le voile devient une carte de lumière, une texture de la taille de la vue
 * (en px de carte : la lumière a les mêmes gros pixels que le dessin), remplie de la couleur
 * de l'heure, où chaque lumière est ajoutée (une tache dégradée, teintée) avant que la
 * texture multiplie la carte. Sous une lumière, la carte garde ses couleurs (ou prend sa
 * teinte) ; ailleurs, la nuit. En plein jour, ni texture ni rectangle.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;

  // Lumière selon l'heure : couleur par laquelle la carte est multipliée (blanc = plein jour).
  // Aube chaude à 6 h, plein jour de 9 h à 16 h, lumière dorée de 17 h à 19 h, crépuscule
  // vers 20-21 h, nuit bleue et sombre de 22 h à 5 h.
  const LIGHT_KEYS = [
    [0, 0x3a4782], [5, 0x3a4782], [6, 0xd8b496], [7.5, 0xfff0dc], [9, 0xffffff], [16, 0xffffff],
    [17.5, 0xffe2b0], [19, 0xf2b67e], [20, 0xb48a9a], [21, 0x6c6aa6], [22, 0x3a4782], [24, 0x3a4782],
  ];
  const LIGHT_MS = 1200;
  const NUIT_L = (0x3a + 0x47 + 0x82) / 765;   // la clarté de la lumière de la nuit       // fondu entre deux lumières (un quart d'heure de jeu dure à peu près autant)

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // Couleur de la lumière à une heure donnée (0 à 24, fractionnaire) : [r, v, b] de 0 à 255,
  // interpolée entre les deux repères voisins de LIGHT_KEYS.
  function lumiere(hour) {
    const h = ((Number(hour) % 24) + 24) % 24;
    let i = 0;
    while (i < LIGHT_KEYS.length - 2 && h >= LIGHT_KEYS[i + 1][0]) i++;
    const a = LIGHT_KEYS[i], b = LIGHT_KEYS[i + 1];
    const t = clamp((h - a[0]) / (b[0] - a[0]), 0, 1);
    return [16, 8, 0].map((s) => ((a[1] >> s) & 255) + (((b[1] >> s) & 255) - ((a[1] >> s) & 255)) * t);
  }

  // Le voile d'une scène : un rectangle (w × h px de carte, à la profondeur `depth`) en mode
  // « multiplier ». voile.set(heure, tout de suite ?) : passe à la lumière de cette heure (null :
  // plein jour), en fondu, ou tout de suite (premier affichage, animations réduites) ;
  // voile.step() à chaque image ; voile.rect : le rectangle. voile.eclaire(sources) : sources()
  // donne, à chaque image, les lumières à ajouter ([{ key, x, y, tint, alpha, scaleX, scaleY,
  // rotation, originX, originY }…], px de carte ; une image de la texture key, en mode « ajouter »).
  // voile.nuit : 0 en plein jour, 1 au cœur de la nuit (d'après la lumière affichée).
  const MARGE = 16;            // px de carte autour de la vue (la caméra a pu bouger depuis)
  function voile(scene, w, h, depth) {
    const Ph = global.Phaser;
    const rect = scene.add.rectangle(0, 0, w, h, 0xffffff)
      .setOrigin(0).setDepth(depth).setBlendMode(Ph.BlendModes.MULTIPLY).setVisible(false);
    let now = [255, 255, 255], fade = null, hour, color = 0xffffff;
    let sources = null, rt = null;
    const apply = (rgb) => {
      now = rgb;
      const c = rgb.map((x) => clamp(Math.round(x), 0, 255));
      color = (c[0] << 16) | (c[1] << 8) | c[2];
      rect.setFillStyle(color, 1).setVisible(color !== 0xffffff && !sources);
    };
    // la carte de lumière : la vue (et sa marge), la couleur de l'heure, puis chaque lumière
    function carteDeLumiere() {
      const nuit = color !== 0xffffff;
      if (rt) rt.setVisible(nuit);
      if (!nuit) return;
      const v = scene.cameras.main.worldView;
      const W = Math.ceil(v.width) + 2 * MARGE, H = Math.ceil(v.height) + 2 * MARGE;
      if (!rt) rt = scene.add.renderTexture(0, 0, W, H).setOrigin(0).setDepth(depth).setBlendMode(Ph.BlendModes.MULTIPLY);
      else if (rt.width !== W || rt.height !== H) rt.setSize(W, H);
      const x0 = Math.floor(v.x) - MARGE, y0 = Math.floor(v.y) - MARGE;
      rt.setPosition(x0, y0).setVisible(true);
      rt.fill(color, 1);
      for (const s of sources()) {
        if (s.x < x0 - 96 || s.y < y0 - 96 || s.x > x0 + W + 96 || s.y > y0 + H + 96) continue;
        rt.stamp(s.key, null, s.x - x0, s.y - y0, {
          tint: s.tint, alpha: s.alpha, scaleX: s.scaleX || 1, scaleY: s.scaleY || 1, rotation: s.rotation || 0,
          originX: s.originX == null ? 0.5 : s.originX, originY: s.originY == null ? 0.5 : s.originY, blendMode: Ph.BlendModes.ADD,
        });
      }
      if (rt.render) rt.render();
    }
    return {
      rect,
      get depth() { return rect.depth; },
      // 0 en plein jour, 1 au plus noir de la nuit (LIGHT_KEYS : 0x3a4782)
      get nuit() { const l = (now[0] + now[1] + now[2]) / 765; return clamp((1 - l) / (1 - NUIT_L), 0, 1); },
      eclaire(f) { sources = f; rect.setVisible(false); },
      set(heure, tout) {
        if (!tout && heure === hour) return;
        hour = heure;
        const to = heure == null ? [255, 255, 255] : lumiere(heure);
        if (tout || K.reduit()) { fade = null; apply(to); return; }
        fade = { from: now.slice(), to, t0: performance.now() };
      },
      step() {
        if (fade) {
          const t = Math.min(1, (performance.now() - fade.t0) / LIGHT_MS);
          apply(fade.from.map((c, i) => c + (fade.to[i] - c) * t));
          if (t >= 1) fade = null;
        }
        if (sources) carteDeLumiere();
      },
      // la taille de la carte a changé
      resize(w2, h2) { rect.setSize(w2, h2); },
      destroy() { rect.destroy(); if (rt) rt.destroy(); },
    };
  }

  Object.assign(K, { LIGHT_KEYS, LIGHT_MS, lumiere, voile });
})(window);
