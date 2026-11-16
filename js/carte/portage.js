/* carte/portage.js — la brouette et la charrette attelée (le chantier « l'île à bâtir », fiche I2 : le portage,
 * js/engine/portage.js ; les dessins : scripts/carte/portage.py).
 *
 * Quand quelque chose est chargé pour le port (modèle.portage : { vehicule }), le personnage :
 *   - à pied, avec la brouette, la pousse devant lui (assets/brouette.png : trois vues, quatre temps de la roue) ;
 *   - en selle, avec la charrette, la mène assis sur son banc, le cheval attelé (assets/charrette.png, d'après la
 *     calèche : trois vues, cinq temps, deux couches : derrière et devant lui). La charrette prend la place du cheval
 *     sellé (js/fermier.js : ses « selles »), avec la même façon de se placer.
 *
 *   const c = CarteKit.charrette(scène)                   // null sans l'image
 *   const r = c.place(x, y, face, flip, roule, alpha)      // comme CarteKit.cheval : { image, dx, dy }
 *   const b = CarteKit.brouette(scène)
 *   b.place(x, y, face, flip, roule, alpha, profondeur) ; b.cache()
 *
 * Script classique, chargé après js/carte/cheval.js. Voir docs/architecture-phaser.md.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;
  const VUES = ['cote', 'bas', 'haut'];

  // La charrette : cases de w × h, le sol à la rangée `sol` ; place : le coin haut-gauche de la case du personnage
  // assis (16 × 32) dans chaque vue (scripts/carte/portage.py, PLACE) ; foulee : px par temps du pas (celle du cheval).
  const CHARRETTE = { key: 'charrette', file: 'charrette.png', w: 96, h: 64, sol: 60, place: { cote: [36, 3], bas: [40, -2], haut: [40, 0] }, foulee: 12, arret: 3 };
  // La brouette : cases de w × h, le sol en bas ; devant : où est le bas de sa case par rapport aux pieds du
  // personnage, par vue (de profil vers la droite : retourné pour la gauche) ; foulee : px par temps de la roue.
  const BROUETTE = { key: 'brouette', file: 'brouette.png', w: 32, h: 24, devant: { cote: [15, 1], bas: [0, 12], haut: [0, -7] }, foulee: 5 };

  function charge(scene, v) {
    const A = K.atlas;
    if (!scene.textures.exists(CHARRETTE.key)) A.feuille(scene, CHARRETTE.key, CHARRETTE.file, { frameWidth: CHARRETTE.w, frameHeight: CHARRETTE.h }, v);
    if (!scene.textures.exists(BROUETTE.key)) A.feuille(scene, BROUETTE.key, BROUETTE.file, { frameWidth: BROUETTE.w, frameHeight: BROUETTE.h }, v);
  }

  function charrette(scene) {
    if (!scene.textures.exists(CHARRETTE.key)) return null;
    const C = CHARRETTE;
    const sous = scene.add.image(0, 0, C.key, 0).setOrigin(0.5, 1).setVisible(false);
    const sur = scene.add.image(0, 0, C.key, 15).setOrigin(0.5, 1).setVisible(false);
    let dernier = null, immobile = 0;
    return {
      place(x, y, face, flip, roule, alpha = 1) {
        const v = VUES.includes(face) ? face : 'bas', iv = VUES.indexOf(v);
        immobile = dernier !== null && Math.abs((roule || 0) - dernier) < 0.01 ? immobile + 1 : 0;
        dernier = roule || 0;
        const k = immobile >= C.arret ? 4 : Math.floor(dernier / C.foulee) % 4;
        const px = Math.round(x), py = Math.round(y) + (C.h - C.sol);
        const f = iv * 5 + k;
        sous.setFrame(f).setPosition(px, py).setFlipX(!!flip).setDepth(y - 0.5).setAlpha(alpha).setVisible(true);
        sur.setFrame(15 + f).setPosition(px, py).setFlipX(!!flip).setDepth(y + 0.5).setAlpha(alpha).setVisible(true);
        // (le personnage assis sur le banc : sa case, le milieu de son bas par rapport aux pieds de l'attelage)
        const [ox, oy] = C.place[v], dx = ox + 8 - C.w / 2;
        return { image: `assis_${v}_0`, dx: flip ? -dx : dx, dy: C.sol - 32 - oy };
      },
      cache() { sous.setVisible(false); sur.setVisible(false); },
      destroy() { sous.destroy(); sur.destroy(); },
    };
  }

  function brouette(scene) {
    if (!scene.textures.exists(BROUETTE.key)) return null;
    const B = BROUETTE;
    const img = scene.add.image(0, 0, B.key, 0).setOrigin(0.5, 1).setVisible(false);
    return {
      // (x, y) : les pieds du personnage ; profondeur : la sienne (la brouette devant lui, sauf de dos)
      place(x, y, face, flip, roule, alpha = 1, profondeur = y) {
        const v = VUES.includes(face) ? face : 'bas', iv = VUES.indexOf(v), [dx, dy] = B.devant[v];
        const k = Math.floor((roule || 0) / B.foulee) % 4;
        img.setFrame(iv * 4 + k).setPosition(Math.round(x + (flip ? -dx : dx)), Math.round(y + dy)).setFlipX(!!flip)
          .setDepth(profondeur + (v === 'haut' ? -0.5 : 0.5)).setAlpha(alpha).setVisible(true);
      },
      cache() { img.setVisible(false); },
      destroy() { img.destroy(); },
    };
  }

  K.CHARRETTE = CHARRETTE;
  K.BROUETTE = BROUETTE;
  K.charrette = charrette;
  K.brouette = brouette;
  K.chargePortage = charge;
})(window);
