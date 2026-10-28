/* carte/ressort.js — l'écrasement et l'étirement des bêtes (en anglais : squash and stretch).
 *
 * Une bête pose la patte, se couche, picore, prend son élan ou retombe d'un saut : son image
 * s'écrase un instant vers le sol, ou s'étire vers le haut, puis revient à sa taille en oscillant
 * un peu. Ce n'est qu'une échelle (setScale) : aucune image de plus à dessiner.
 *
 * Chaque bête a son ressort : une valeur `s` (0 au repos ; négative : écrasée, positive : étirée)
 * qui revient vers 0. Un événement lui donne une impulsion (COUPS) ; une pose tenue (ramassé avant
 * de sauter, étiré en l'air) s'ajoute à `s` tant qu'elle dure (TENU). L'image prend
 * scaleY = 1 + s et scaleX = 1 / scaleY : le volume reste à peu près le même, c'est ce qui rend
 * l'effet crédible. L'origine de l'image doit être à ses pieds (setOrigin(x, 1), ou l'ancre de
 * faune.json) : elle s'écrase vers le sol au lieu de rapetisser vers son milieu.
 *
 * Seulement les bêtes (js/ambient-life.js : chats, chiens, vaches, moutons, poules, oiseaux,
 * écureuils ; js/carte/ferme/faune-monde.js : la faune du grand monde, sauf l'aigle) ; ni les
 * personnages, ni le cheval (le personnage est assis dessus).
 *
 *   const r = CarteKit.ressort()
 *   r.pousse(CarteKit.RESSORT.COUPS.pas)      // un événement
 *   r.maj(dt, tenu).applique(image, échelle)  // à chaque image, après le reste ; tenu : 0 sans pose
 *   r.calme(image, échelle)                   // tout de suite au repos (animations réduites)
 *
 * Avec « réduire les animations », rien ne bouge : la vie d'ambiance s'arrête tout entière et la
 * faune reste immobile (r.calme).
 *
 * Script classique, chargé après le kit (js/carte/kit.js). Voir docs/vie-ambiance.md.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;

  // Le ressort : sa raideur et son amorti (une oscillation et demie, un quart de seconde), les
  // bornes de `s` (une bête de 16 px s'écrase de 4 px au plus), et sous quel écart il est au repos.
  // `ampleur` multiplie tout : 0 coupe l'effet sans rien changer d'autre.
  const RESSORT = {
    raideur: 260, amorti: 13, min: -0.26, max: 0.3, repos: 0.002, ampleur: 1,
    // Les impulsions (en « s par seconde » : environ 0,05 × l'impulsion au plus fort).
    // Négatives : elle s'écrase ; positives : elle s'étire.
    COUPS: {
      pas: -1.4,          // une patte se pose (marche, course, nage)
      passage: 0.6,       // entre deux pas, les pattes passent l'une devant l'autre
      assoit: -1.8,       // elle s'assoit
      couche: -2.4,       // elle se couche
      releve: 2.2,        // elle se relève, debout
      souffle: 0.45,      // elle respire (deux images au repos)
      bouchee: -0.9,      // la tête baissée pour brouter, le bec qui pique le sol
      tete: 0.5,          // la tête qui se relève
      ailes: 2.6,         // un battement d'ailes
      elan: 4.5,          // elle part d'un bond (saut, envol, fuite)
      atterrit: -5.5,     // elle retombe d'un saut
      pose: -3.5,         // un oiseau qui se pose
    },
    // Les poses tenues, ajoutées à `s` tant qu'elles durent.
    TENU: {
      vise: -0.12,        // ramassée au pied du mur, avant de sauter sur le toit
      air: 0.1,           // étirée en l'air, au plus vite (au départ et à l'arrivée d'un saut)
      bond: 0.035,        // par px de hauteur d'un petit bond (la course)
    },
  };

  // Le plus long pas de calcul (s), et le plus long temps rattrapé d'un coup (une image très en
  // retard ne fait pas faire au ressort un bond de plusieurs secondes).
  const PAS_MAX = 1 / 60, DT_MAX = 0.1;

  const borne = (v) => (v < RESSORT.min ? RESSORT.min : v > RESSORT.max ? RESSORT.max : v);

  function ressort() {
    let s = 0, v = 0, tenu = 0;
    let vu = null;            // la dernière échelle posée sur l'image : rien à refaire quand elle est la même
    const r = {
      // Une impulsion : négative, elle s'écrase ; positive, elle s'étire.
      pousse(a) { v += a || 0; return r; },
      // Le ressort avance de dt secondes ; `t` : la pose tenue à cette image (0 sans pose).
      // Par pas d'au plus PAS_MAX s : à 10 images par seconde (un téléphone qui peine), un seul
      // grand pas ferait diverger le ressort au lieu de l'amortir.
      maj(dt, t) {
        tenu = t || 0;
        if (s === 0 && v === 0) return r;
        let reste = Math.min(dt, DT_MAX);
        while (reste > 0 && (s !== 0 || v !== 0)) {
          const h = Math.min(reste, PAS_MAX);
          v += (-RESSORT.raideur * s - RESSORT.amorti * v) * h;
          s += v * h;
          reste -= h;
          if (s < RESSORT.min) { s = RESSORT.min; if (v < 0) v = 0; }
          if (s > RESSORT.max) { s = RESSORT.max; if (v > 0) v = 0; }
          if (Math.abs(s) < RESSORT.repos && Math.abs(v) < RESSORT.repos * 20) { s = 0; v = 0; }
        }
        return r;
      },
      // L'écart à la taille de repos (0 : au repos ; -0,1 : écrasée d'un dixième).
      valeur() { return borne((s + tenu) * RESSORT.ampleur); },
      // L'échelle de l'image (`base` : sa taille sans le ressort, 1 par défaut).
      applique(img, base) {
        const b = base || 1, y = 1 + r.valeur();
        if (vu === y && img.scaleY === b * y) return r;
        vu = y;
        img.setScale(b / y, b * y);
        return r;
      },
      // Tout de suite au repos, l'image à sa taille.
      calme(img, base) {
        s = 0; v = 0; tenu = 0; vu = null;
        if (img) img.setScale(base || 1);
        return r;
      },
    };
    return r;
  }

  K.RESSORT = RESSORT;
  K.ressort = ressort;
})(window);
