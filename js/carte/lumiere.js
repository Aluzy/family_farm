/* carte/lumiere.js — le jour et la nuit sur les cartes (CarteKit.lumiere, CarteKit.voile).
 *
 * Un voile de la taille de la carte, posé au-dessus de tout ce qui est dessiné (le sol, les
 * bâtiments, les personnages), multiplie leurs couleurs par celle de l'heure : blanc en plein
 * jour (le voile est alors caché), doré le soir, bleu et sombre la nuit (on distingue encore
 * les formes). Ce qui est en DOM (étiquettes, bulles, boutons) reste au-dessus, en couleurs.
 *
 * La ferme le règle sur l'heure de son modèle (js/ui/stage.js). La grotte a sa propre
 * obscurité (la lumière autour du personnage).
 *
 * Des lumières (voile.eclaire(sources) : les fenêtres et les lanternes de la ferme) : le voile devient une carte de lumière, une texture de la taille de la vue
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
  // donne, à chaque image, les lumières à ajouter ([{ key, frame, x, y, tint, alpha, scaleX, scaleY,
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
      // (fiche 9a : en qualité « économie », des points de 2 px de carte : quatre fois moins de points à
      // remplir et à éclairer ; la lumière est une tache douce, la différence ne se voit pas)
      const p = (K.reglages && K.reglages().lumierePx) || 1;
      const v = scene.cameras.main.worldView;
      const W = Math.ceil((Math.ceil(v.width) + 2 * MARGE) / p), H = Math.ceil((Math.ceil(v.height) + 2 * MARGE) / p);
      if (!rt) rt = scene.add.renderTexture(0, 0, W, H).setOrigin(0).setDepth(depth).setBlendMode(Ph.BlendModes.MULTIPLY);
      // (resize : sa texture aussi ; setSize ne change que la taille de l'objet, et la carte de
      // lumière ne couvrirait plus la vue agrandie : le dézoom au doigt, l'écran tourné)
      else if (rt.width !== W || rt.height !== H) rt.resize(W, H);
      const x0 = Math.floor(v.x) - MARGE, y0 = Math.floor(v.y) - MARGE;
      rt.setPosition(x0, y0).setScale(p).setVisible(true);
      rt.fill(color, 1);
      for (const s of sources()) {
        if (s.x < x0 - 96 || s.y < y0 - 96 || s.x > x0 + W * p + 96 || s.y > y0 + H * p + 96) continue;
        rt.stamp(s.key, s.frame == null ? null : s.frame, (s.x - x0) / p, (s.y - y0) / p, {
          tint: s.tint, alpha: s.alpha, scaleX: (s.scaleX || 1) / p, scaleY: (s.scaleY || 1) / p, rotation: s.rotation || 0,
          originX: s.originX == null ? 0.5 : s.originX, originY: s.originY == null ? 0.5 : s.originY, blendMode: Ph.BlendModes.ADD,
        });
      }
      if (rt.render) rt.render();
    }
    return {
      rect,
      get depth() { return rect.depth; },
      // la couleur affichée ([r, v, b], de 0 à 255 : blanc en plein jour) : le brouillard du grand monde,
      // posé au-dessus du voile, la prend lui-même (js/carte/ferme/brouillard.js)
      get rgb() { return now; },
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

  // Le soleil (les ombres portées : js/carte/ferme/soleil.js). Il se
  // lève à l'est (à droite de la carte) à `lever` h, se couche à l'ouest à `coucher` h, en
  // passant au sud, du côté d'où l'on regarde : les ombres partent vers le haut de la carte et
  // penchent vers la gauche le matin, vers la droite le soir, de `penche` px par px de hauteur au
  // plus (soleil à l'horizon) ; leur longueur va de longueur[0] (midi) à longueur[1] (soleil bas)
  // fois la hauteur de ce qui les porte ; `alpha` en plein jour, atteint en `fondu` h après le
  // lever et perdu en autant avant le coucher.
  const SOLEIL = { lever: 6, coucher: 20, penche: 1, longueur: [0.3, 1], alpha: 0.38, fondu: 1 };

  // Le soleil à l'heure h : { sh, k, alpha } (null : il est couché). sh : le cisaillement (de
  // combien le haut de l'ombre glisse sur le côté, pour un px de hauteur : négatif à gauche) ;
  // k : l'écrasement (la hauteur de l'ombre, pour un px de hauteur de l'objet).
  function soleil(h) {
    const S = SOLEIL;
    if (h == null || h <= S.lever || h >= S.coucher) return null;
    const t = Math.PI * (h - S.lever) / (S.coucher - S.lever);
    const haut = Math.sin(t);                    // 0 à l'horizon, 1 à midi
    return {
      sh: -Math.cos(t) * S.penche,
      k: S.longueur[1] - (S.longueur[1] - S.longueur[0]) * haut,
      alpha: S.alpha * clamp(Math.min(h - S.lever, S.coucher - h) / S.fondu, 0, 1),
    };
  }

  // Une ombre portée dans le canevas `ctx` : l'image (ou la partie sx, sy, sw, sh0 de src, posée
  // en x, y, w × h px), son pied à `pied` px, le soleil `s`. Un point de l'image à v px au-dessus
  // du pied va à sh·v à côté et k·v au-dessus du pied. Peinte en couleur : à rendre noire
  // ensuite (noircir), comme tout le canevas.
  function ombrePortee(ctx, s, src, sx, sy, sw, sh0, x, y, w, h, pied, flip) {
    const top = pied - y;
    ctx.setTransform(1, 0, -s.sh, s.k, x + s.sh * top, pied - s.k * top);
    if (flip) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    try { ctx.drawImage(src, sx, sy, sw, sh0, 0, 0, w, h); } catch (e) { /* image pas prête */ }
  }
  // Tout ce qui est peint dans le canevas devient noir (sa transparence est gardée).
  function noircir(ctx, w, h) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  Object.assign(K, { LIGHT_KEYS, LIGHT_MS, lumiere, voile, SOLEIL, soleil, ombrePortee, noircir });
})(window);
