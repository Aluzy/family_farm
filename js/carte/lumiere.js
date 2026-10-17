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
  const LIGHT_MS = 1200;       // fondu entre deux lumières (un quart d'heure de jeu dure à peu près autant)

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
  // voile.step() à chaque image ; voile.rect : le rectangle.
  function voile(scene, w, h, depth) {
    const rect = scene.add.rectangle(0, 0, w, h, 0xffffff)
      .setOrigin(0).setDepth(depth).setBlendMode(global.Phaser.BlendModes.MULTIPLY).setVisible(false);
    let now = [255, 255, 255], fade = null, hour;
    const apply = (rgb) => {
      now = rgb;
      const c = rgb.map((x) => clamp(Math.round(x), 0, 255));
      const color = (c[0] << 16) | (c[1] << 8) | c[2];
      rect.setFillStyle(color, 1).setVisible(color !== 0xffffff);
    };
    return {
      rect,
      get depth() { return rect.depth; },
      set(heure, tout) {
        if (!tout && heure === hour) return;
        hour = heure;
        const to = heure == null ? [255, 255, 255] : lumiere(heure);
        if (tout || K.reduit()) { fade = null; apply(to); return; }
        fade = { from: now.slice(), to, t0: performance.now() };
      },
      step() {
        if (!fade) return;
        const t = Math.min(1, (performance.now() - fade.t0) / LIGHT_MS);
        apply(fade.from.map((c, i) => c + (fade.to[i] - c) * t));
        if (t >= 1) fade = null;
      },
      // la taille de la carte a changé
      resize(w2, h2) { rect.setSize(w2, h2); },
      destroy() { rect.destroy(); },
    };
  }

  Object.assign(K, { LIGHT_KEYS, LIGHT_MS, lumiere, voile });
})(window);
