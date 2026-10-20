/* carte/triporteur.js — le triporteur du personnage, sur toutes les cartes.
 *
 * Acheté au Marché (le moteur : DATA.TRIPORTEUR, enSelle), il va dans la barre d'outils, où un
 * appui fait monter le personnage dessus ou en descendre. En selle, il roule TRIPORTEUR.vitesse
 * fois plus vite qu'à pied, assis (ses cases assis_<vue>) sur le tricycle (assets/triporteur.png,
 * scripts/personnage/triporteur.py : par vue et par coup de pédale, une couche derrière lui et
 * une devant). Pendant un geste (la hache, la houe…), il en descend : le triporteur se cache.
 *
 *   const selle = CarteKit.triporteur(scène)      // null sans l'image
 *   const r = selle.place(x, y, face, flip, roule, alpha)   // le personnage aux pieds (x, y), qui a roulé `roule` px
 *   personnage.setFrame(cases(r.image)).setPosition(x + r.dx, y - r.dy)
 *   selle.cache()                                 // à pied, ou pendant un geste
 *
 * Script classique, chargé après le kit (js/carte/kit.js). Voir docs/architecture-phaser.md.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;

  // L'image (cases de w × h, les pieds au milieu du bas) ; vitesse : combien de fois plus vite
  // qu'à pied ; monte : de combien de px le personnage est assis plus haut que ses pieds, par
  // vue ; recul : de combien il est en arrière du milieu, de profil (sur la selle) ; pedale : px
  // roulés par coup de pédale (les rayons tournent).
  const TRIPORTEUR = {
    key: 'triporteur', file: 'triporteur.png', w: 40, h: 32, vitesse: 3,
    monte: { bas: 3, haut: 4, cote: 4 }, recul: 6, pedale: 6,
  };
  const VUES = ['bas', 'haut', 'cote'];

  // La case de la vue `face`, du coup de pédale `p`, de la couche `c` (0 : derrière, 1 : devant).
  const caseDe = (face, p, c) => (VUES.indexOf(face) * 2 + p) * 2 + c;

  // (`key` : une autre planche aux mêmes cases, le triporteur électrique du livreur ou le vélo des
  // habitants de la ville ; `cfg` : ses mesures, comme TRIPORTEUR)
  function triporteur(scene, key = TRIPORTEUR.key, cfg = TRIPORTEUR) {
    if (!scene.textures.exists(key)) return null;
    const sous = scene.add.image(0, 0, key, 0).setOrigin(0.5, 1).setVisible(false);
    const sur = scene.add.image(0, 0, key, 1).setOrigin(0.5, 1).setVisible(false);
    return {
      place(x, y, face, flip, roule, alpha = 1) {
        const v = VUES.includes(face) ? face : 'bas';
        const p = Math.floor((roule || 0) / cfg.pedale) % 2;
        const px = Math.round(x), py = Math.round(y) + 1;
        sous.setFrame(caseDe(v, p, 0)).setPosition(px, py).setFlipX(!!flip).setDepth(y - 0.5).setAlpha(alpha).setVisible(true);
        sur.setFrame(caseDe(v, p, 1)).setPosition(px, py).setFlipX(!!flip).setDepth(y + 0.5).setAlpha(alpha).setVisible(true);
        const dx = v === 'cote' ? (flip ? cfg.recul : -cfg.recul) : 0;
        return { image: `assis_${v}_${p}`, dx, dy: cfg.monte[v] };
      },
      cache() { sous.setVisible(false); sur.setVisible(false); },
      destroy() { sous.destroy(); sur.destroy(); },
    };
  }

  K.TRIPORTEUR = TRIPORTEUR;
  K.triporteur = triporteur;
})(window);
