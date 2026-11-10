/* carte/atlas.js — les atlas de la carte (piste 4 du chantier « allègement », docs/chantier-allegement.md).
 *
 * Environ 160 petites images (les meubles, les bêtes, les compagnons, le puits…) étaient chacune une requête,
 * un décodage et un envoi à la carte graphique. scripts/carte/atlas.py les recopie dans deux planches
 * (assets/atlas_ferme.png, assets/atlas_meubles.png ; la table : js/carte/atlas.generated.js, CarteAtlas).
 * Le reste du jeu ne change pas : chaque image garde sa clé de texture, ses cases numérotées et sa taille.
 *
 *   K.atlas.image(scene, cle, fichier, v)           comme scene.load.image(cle, v(fichier))
 *   K.atlas.feuille(scene, cle, fichier, cases, v)  comme scene.load.spritesheet(cle, v(fichier), cases)
 *     Une image d'un atlas : l'atlas est chargé (une fois), et la clé est créée dès qu'il arrive, avant la
 *     fin du chargement : une texture qui partage l'image de l'atlas (pas d'envoi de plus à la carte
 *     graphique), son cadre « __BASE » sur sa case, ses cases (0, 1, 2…) découpées comme le fait Phaser
 *     (marge, espacement, début et fin compris). L'atlas manque : ses clés vont dans scene.missing (les
 *     dessins de secours, comme une image manquante). Une image hors des atlas : chargée seule, comme avant.
 *   K.atlas.decoupe(textures, cle) → { img, x, y, w, h } : l'image source et la case d'une clé (une image
 *     d'atlas, ou toute l'image d'une texture seule) : pour qui lit ses pixels (drawImage).
 *
 * Script classique, chargé après le kit (js/carte/kit.js) et la table (js/carte/atlas.generated.js).
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const table = () => global.CarteAtlas || { atlas: {}, cases: {} };
  const attentes = new Map();   // scène → Map(atlas → [{ cle, case, cases }])

  // La clé `cle`, découpée dans l'atlas `atlas` (déjà chargé) : une texture qui partage sa source.
  function creer(textures, atlas, cle, [x, y, w, h], cases) {
    if (textures.exists(cle) || !textures.exists(atlas)) return;
    const src = textures.get(atlas).source[0];
    const tex = textures.create(cle, [], w, h);
    if (!tex) return;
    tex.source.push(src);
    tex.add('__BASE', 0, x, y, w, h);
    if (cases) {
      // (Phaser.Textures.Parsers.SpriteSheet, sur la case de l'atlas au lieu de toute l'image)
      const fw = cases.frameWidth, fh = cases.frameHeight || fw, marge = cases.margin || 0, esp = cases.spacing || 0;
      const n = Math.floor((w - marge + esp) / (fw + esp)) * Math.floor((h - marge + esp) / (fh + esp));
      let debut = cases.startFrame || 0, fin = cases.endFrame === undefined ? -1 : cases.endFrame;
      if (debut > n || debut < -n) debut = 0;
      if (debut < 0) debut = n + debut;
      if (fin === -1 || fin > n || fin < debut) fin = n;
      for (let i = 0, cx = marge, cy = marge, k = 0; i < n; i++) {
        const dx = Math.max(0, cx + fw - w), dy = Math.max(0, cy + fh - h);
        if (i >= debut && i <= fin) tex.add(k++, 0, x + cx, y + cy, fw - dx, fh - dy);
        cx += fw + esp;
        if (cx + fw > w) { cx = marge; cy += fh + esp; }
      }
    }
    textures.emit('addtexture', cle, tex);
    textures.emit('addtexture-' + cle, tex);
  }

  function charger(scene, cle, fichier, cases, v) {
    const T = table(), c = T.cases[fichier], L = scene.load;
    const u = v || ((f) => 'assets/' + f);
    if (!c) {
      if (cases) L.spritesheet(cle, u(fichier), cases); else L.image(cle, u(fichier));
      return false;
    }
    if (scene.textures.exists(cle)) return true;
    const [atlas, ...r] = c;
    if (scene.textures.exists(atlas)) { creer(scene.textures, atlas, cle, r, cases); return true; }
    let parScene = attentes.get(scene);
    if (!parScene) attentes.set(scene, parScene = new Map());
    let liste = parScene.get(atlas);
    if (!liste) {
      parScene.set(atlas, liste = []);
      const fini = () => {
        L.off('filecomplete-image-' + atlas, fini);
        L.off('loaderror', rate);
        parScene.delete(atlas);
        for (const a of liste) creer(scene.textures, atlas, a.cle, a.r, a.cases);
      };
      const rate = (file) => {
        if (file.key !== atlas) return;
        L.off('filecomplete-image-' + atlas, fini);
        L.off('loaderror', rate);
        parScene.delete(atlas);
        if (scene.missing) for (const a of liste) scene.missing.add(a.cle);
      };
      L.on('filecomplete-image-' + atlas, fini);
      L.on('loaderror', rate);
      L.image(atlas, u(T.atlas[atlas].fichier));
    }
    liste.push({ cle, r, cases });
    return true;
  }

  function decoupe(textures, cle) {
    if (!textures.exists(cle)) return null;
    const tex = textures.get(cle), f = tex.has('__BASE') ? tex.get('__BASE') : tex.get();
    return { img: f.source.image, x: f.cutX, y: f.cutY, w: f.cutWidth, h: f.cutHeight };
  }

  K.atlas = {
    image: (scene, cle, fichier, v) => charger(scene, cle, fichier, null, v),
    feuille: (scene, cle, fichier, cases, v) => charger(scene, cle, fichier, cases, v),
    decoupe,
  };
})(window);
