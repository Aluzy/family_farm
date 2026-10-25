/* carte/cheval.js — le cheval du personnage, sur toutes les cartes.
 *
 * Venu à l'Atelier (un licol et des friandises ; le moteur : DATA.CHEVAL, js/engine/cheval.js), il vit à l'Écurie de la ferme
 * (js/carte/ferme/chantier.js, syncBeasts : assets/cheval.png). Un appui dans la barre d'outils
 * fait monter le personnage en selle ou en descendre. En selle, il va plus vite (le moteur dit
 * combien), assis (ses cases assis_<vue>) sur le cheval sellé (assets/cheval_monte.png,
 * scripts/personnage/cheval.py : par vue et par temps du pas, une couche derrière lui et une
 * devant). Comme le triporteur (js/carte/triporteur.js), dont il a la même façon de faire.
 * Hors de la ferme, descendu, il attend attaché à son poteau (attache) : il broute, la corde va
 * de l'anneau du poteau à son licol ; un toucher dessus le fait monter.
 *
 *   const selle = CarteKit.cheval(scène)            // null sans l'image
 *   const r = selle.place(x, y, face, flip, roule, alpha)   // le personnage aux pieds (x, y), qui a parcouru `roule` px
 *   personnage.setFrame(cases(r.image)).setPosition(x + r.dx, y - r.dy)
 *   selle.cache()                                   // à pied
 *   const a = CarteKit.chevalAttache(scène, x, y)   // le poteau planté en (x, y), le cheval attaché
 *   a.step(time) ; a.touche(wx, wy) → vrai sur lui ; a.destroy()
 *
 * Script classique, chargé après le kit (js/carte/kit.js). Voir docs/architecture-phaser.md.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;

  // Les images (cases de w × h, les sabots au bas) ; monte : de combien de px le personnage est
  // assis plus haut que ses pieds, par vue ; recul : de combien il est en arrière du milieu, de
  // profil (sur la selle) ; foulee : px parcourus par temps du pas ; arret : images (appels de
  // place) sans avancer avant de le montrer à l'arrêt. Le cheval seul (cases de cheval.png) ;
  // le poteau d'attache (son anneau : ANNEAU de scripts/personnage/cheval.py) ; le cheval attaché
  // à `ecart` px à droite du poteau, tourné vers lui, son licol (de profil, tourné vers la droite :
  // licol, tête haute ; licolBas, il broute) ; la corde (couleur, mou en px) ; il broute une part
  // `broute` du temps, par périodes de `periode` s ; proche : à moins de `proche` px de lui, on le monte.
  const CHEVAL = {
    key: 'cheval_monte', file: 'cheval_monte.png', w: 48, h: 40,
    monte: { bas: 31, haut: 22, cote: 22 }, recul: 2, foulee: 7, arret: 3,
    seul: { key: 'cheval', file: 'cheval.png', idle: 0, broute: 5 },
    poteau: { key: 'poteau_attache', file: 'poteau_attache.png', w: 16, h: 32, anneau: [11, 17] },
    ecart: 30, licol: [36, 10], licolBas: [41, 32], corde: { couleur: 0xb89448, ombre: 0x5a4020, mou: 5 },
    broute: 0.6, periode: 5, proche: 40,
  };
  const VUES = ['bas', 'haut', 'cote'];

  // La case de la vue `face`, du temps `k` (0..3, 4 : à l'arrêt), de la couche `c` (0 : derrière, 1 : devant).
  const caseDe = (face, k, c) => (VUES.indexOf(face) * 5 + k) * 2 + c;

  // Les planches à charger (preload d'une scène) : le cheval sellé, seul, et le poteau.
  function charge(scene, v) {
    const L = scene.load, u = v || ((f) => 'assets/' + f);
    if (!scene.textures.exists(CHEVAL.key)) L.spritesheet(CHEVAL.key, u(CHEVAL.file), { frameWidth: CHEVAL.w, frameHeight: CHEVAL.h });
    if (!scene.textures.exists(CHEVAL.seul.key)) L.spritesheet(CHEVAL.seul.key, u(CHEVAL.seul.file), { frameWidth: CHEVAL.w, frameHeight: CHEVAL.h });
    if (!scene.textures.exists(CHEVAL.poteau.key)) L.image(CHEVAL.poteau.key, u(CHEVAL.poteau.file));
  }

  function cheval(scene) {
    if (!scene.textures.exists(CHEVAL.key)) return null;
    const sous = scene.add.image(0, 0, CHEVAL.key, 0).setOrigin(0.5, 1).setVisible(false);
    const sur = scene.add.image(0, 0, CHEVAL.key, 1).setOrigin(0.5, 1).setVisible(false);
    let dernier = null, immobile = 0;
    return {
      place(x, y, face, flip, roule, alpha = 1) {
        const v = VUES.includes(face) ? face : 'bas';
        // (il avance : les quatre temps du pas ; quelques images sans avancer : à l'arrêt)
        immobile = dernier !== null && Math.abs((roule || 0) - dernier) < 0.01 ? immobile + 1 : 0;
        dernier = roule || 0;
        const k = immobile >= CHEVAL.arret ? 4 : Math.floor(dernier / CHEVAL.foulee) % 4;
        const leve = k === 1 || k === 3 ? 1 : 0;        // (le corps monte d'un px entre deux pas)
        const px = Math.round(x), py = Math.round(y) + 1;
        sous.setFrame(caseDe(v, k, 0)).setPosition(px, py).setFlipX(!!flip).setDepth(y - 0.5).setAlpha(alpha).setVisible(true);
        sur.setFrame(caseDe(v, k, 1)).setPosition(px, py).setFlipX(!!flip).setDepth(y + 0.5).setAlpha(alpha).setVisible(true);
        const dx = v === 'cote' ? (flip ? CHEVAL.recul : -CHEVAL.recul) : 0;
        return { image: `assis_${v}_0`, dx, dy: CHEVAL.monte[v] + leve };
      },
      cache() { sous.setVisible(false); sur.setVisible(false); },
      destroy() { sous.destroy(); sur.destroy(); },
    };
  }

  // Le cheval attaché à son poteau, planté en (x, y) (le pied du poteau, px de la carte).
  function chevalAttache(scene, x, y) {
    const S = CHEVAL.seul, P = CHEVAL.poteau;
    if (!scene.textures.exists(S.key)) return null;
    const poteau = scene.textures.exists(P.key) ? scene.add.image(Math.round(x), Math.round(y), P.key).setOrigin(0.5, 1).setDepth(y) : null;
    const hx = Math.round(x + CHEVAL.ecart), hy = Math.round(y + 2);
    const bete = scene.add.image(hx, hy, S.key, S.idle).setOrigin(0.5, 1).setFlipX(true).setDepth(hy);
    const corde = scene.add.graphics().setDepth(y + 0.5);
    const ax = Math.round(x) - P.w / 2 + P.anneau[0], ay = Math.round(y) - P.h + P.anneau[1];
    const decalage = Math.random() * CHEVAL.periode;
    let tete = null;
    function dessineCorde(bas) {
      // (de profil retourné : le licol à w - 1 - lx)
      const [lx, ly] = bas ? CHEVAL.licolBas : CHEVAL.licol;
      const tx = hx - CHEVAL.w / 2 + (CHEVAL.w - 1 - lx), ty = hy - CHEVAL.h + ly;
      corde.clear();
      const n = 12;
      for (const [c, d] of [[CHEVAL.corde.ombre, 1], [CHEVAL.corde.couleur, 0]]) {
        corde.fillStyle(c, 1);
        for (let i = 0; i <= n; i++) {
          const s = i / n;
          const px = ax + (tx - ax) * s, py = ay + (ty - ay) * s + CHEVAL.corde.mou * 4 * s * (1 - s);
          corde.fillRect(Math.round(px), Math.round(py) + d, 1, 1);
        }
      }
    }
    return {
      step(time) {
        // (il broute une part du temps, puis relève la tête)
        const t = ((time / 1000 + decalage) % CHEVAL.periode) / CHEVAL.periode;
        const bas = t < CHEVAL.broute;
        if (bas !== tete) { tete = bas; bete.setFrame(bas ? S.broute : S.idle); dessineCorde(bas); }
      },
      // Un toucher sur le cheval ou son poteau ?
      touche(wx, wy) {
        const dansCheval = Math.abs(wx - hx) <= 18 && wy <= hy && wy >= hy - 30;
        const dansPoteau = Math.abs(wx - x) <= 6 && wy <= y && wy >= y - 24;
        return dansCheval || dansPoteau;
      },
      // Le point où monter (à côté de lui, sur le chemin du personnage).
      point() { return { x: hx, y: hy + 2 }; },
      destroy() { if (poteau) poteau.destroy(); bete.destroy(); corde.destroy(); },
    };
  }

  K.CHEVAL = CHEVAL;
  K.cheval = cheval;
  K.chevalAttache = chevalAttache;
  K.chargeCheval = charge;
})(window);
