/* carte/ordonnanceur.js — l'ordonnanceur de la scène (fiche 33).
 *
 * La scène de la carte (js/farm-stage.js, update) faisait ses ≈ 65 étapes à chaque image. Elles sont
 * désormais une table de systèmes, dans le même ordre, chacun à sa cadence :
 *
 *   CarteKit.ordonnanceur(systemes) → { pas(time, delta, dt), systemes }
 *     systemes : [{ nom, cadence, actif(I), pas(I) }]
 *       - cadence : 'image' (à chaque image : ce qui se voit bouger) ou un nombre de pas par seconde
 *         (10 : ce qui décide ; 2 : ce qui relève) ;
 *       - actif(I) (facultatif) : faux, le système ne fait rien cette fois (et son temps ne s'accumule
 *         pas : il repart du présent quand il revient) ;
 *       - pas(I) : I = { time, delta, dt, s } : l'heure de Phaser, puis le temps écoulé depuis son
 *         dernier pas (delta : brut, en ms ; dt : borné à 50 ms par image, en ms ; s : dt en secondes).
 *         Un système lent reçoit le temps cumulé depuis son dernier pas.
 *   Les systèmes lents sont décalés les uns des autres (pas tous à la même image).
 *   Pendant une mesure (📏, js/ui/chrono.js : window.Chrono), le temps de chaque système est noté sous
 *   « système : <nom> ».
 *
 * Script classique, chargé après le kit (js/carte/kit.js). Voir docs/architecture-phaser.md.
 */
(function (global) {
  'use strict';

  const K = global.CarteKit;

  function ordonnanceur(liste) {
    const S = liste.map((s, i) => {
      const periode = s.cadence === 'image' || !s.cadence ? 0 : 1000 / s.cadence;
      // (le décalage : une fraction de la période, différente pour chacun ; 0,618… : le nombre d'or)
      return { nom: s.nom, cadence: s.cadence || 'image', actif: s.actif || null, faire: s.pas, periode, reste: periode * ((i * 0.6180339) % 1), delta: 0, dt: 0, I: { time: 0, delta: 0, dt: 0, s: 0 } };
    });
    return {
      systemes: S,
      pas(time, delta, dt) {
        const C = global.Chrono, mesure = !!(C && C.chrono && C.chrono.actif);
        for (let i = 0; i < S.length; i++) {
          const s = S[i];
          s.delta += delta; s.dt += dt;
          if (s.periode) {
            s.reste -= delta;
            if (s.reste > 0) continue;
            // (en retard de plus d'une période : il reprend au présent, sans rattraper)
            s.reste = Math.max(0, s.reste + s.periode);
          }
          const I = s.I;
          I.time = time; I.delta = s.delta; I.dt = Math.min(s.dt, Math.max(50, 2 * s.periode)); I.s = I.dt / 1000;
          s.delta = 0; s.dt = 0;
          if (s.actif && !s.actif(I)) continue;
          if (!mesure) { s.faire(I); continue; }
          const t0 = performance.now();
          try { s.faire(I); } finally { C.noter('système : ' + s.nom, performance.now() - t0); }
        }
      },
    };
  }

  K.ordonnanceur = ordonnanceur;
})(window);
