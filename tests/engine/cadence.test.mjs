/* ==========================================================================
   Tests de la cadence de la carte (fiche 25 : js/carte/jeu.js, js/carte/kit.js).
   - le pas plafonné (CarteJeu.pasLimite, à la place du stepLimitFPS de Phaser 4.2.1, qui comptait du
     temps deux fois) : le temps donné à la scène est le temps écoulé, à 60 et à 120 Hz, plafonné à 60
     ou à 30 images par seconde ;
   - le suivi de la vue (CarteKit.rattrape) : la même trajectoire à 30, 60 et 120 images par seconde.
   Lancer seul : node tests/run-tests.mjs cadence.
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { assert, assertEqual, test } from './aide.mjs';

// Le kit et le jeu, chargés dans une fausse fenêtre (des scripts classiques).
const fenetre = { addEventListener() {}, matchMedia: () => ({ matches: false }), devicePixelRatio: 1, localStorage: null, navigator: {} };
for (const f of ['kit.js', 'jeu.js']) new Function('window', readFileSync(new URL(`../../js/carte/${f}`, import.meta.url), 'utf8'))(fenetre);
const K = fenetre.CarteKit, J = fenetre.CarteJeu;

// Une boucle de Phaser réduite à ce que le pas plafonné lit et écrit, menée `secondes` à `hz` images par
// seconde de l'écran (une horloge qui tremble un peu : ±0,3 ms), plafonnée à `plafond`.
function boucle(hz, plafond, secondes = 3) {
  const L = {
    lastTime: 0, time: 0, delta: 0, frame: 0, framesThisSecond: 0, nextFpsUpdate: 1000, actualFps: 60,
    _limitRate: 1000 / plafond, smoothStep: true,
    updateFPS() { this.nextFpsUpdate += 1000; this.framesThisSecond = 0; },
    smoothDelta() { throw new Error('pas de lissage'); },
    appels: 0, somme: 0,
    callback(t, d) { this.appels++; this.somme += d; },
  };
  const pas = 1000 / hz;
  for (let k = 1, t = 0; t < secondes * 1000; k++) {
    t = k * pas + (k % 2 ? 0.3 : -0.3);
    J.pasLimite.call(L, t);
  }
  return { parSeconde: L.appels / secondes, somme: L.somme, reel: L.lastTime };
}

test('le pas plafonné : le temps donné à la scène est le temps écoulé (Phaser 4.2.1 le comptait deux fois)', () => {
  for (const [hz, plafond, attendu] of [[60, 60, 60], [120, 60, 60], [60, 30, 30], [120, 30, 30], [144, 60, 48], [90, 30, 30]]) {
    const r = boucle(hz, plafond);
    assert(Math.abs(r.parSeconde - attendu) <= 1, `${hz} Hz, plafond ${plafond} : ${r.parSeconde} images par seconde (≈ ${attendu})`);
    // le temps de la scène suit l'horloge : à une image près (ce qui reste après le dernier appel)
    assert(r.reel - r.somme >= 0 && r.reel - r.somme < 1000 / plafond + 1, `${hz} Hz, plafond ${plafond} : ${Math.round(r.somme)} ms donnés pour ${Math.round(r.reel)} ms`);
  }
});

test('la cadence : 60 au plus sur un écran rapide, 30 en économie une fois immobile, l\'écran sinon', () => {
  assertEqual([J.CADENCE.RAPIDE, J.CADENCE.PLAFOND, J.CADENCE.ECONOMIE, J.CADENCE.CALME_MS], [100, 60, 30, 1000]);
});

test('le suivi de la vue : la même trajectoire à 30, 60 et 120 images par seconde', () => {
  const FOLLOW_MS = 250;
  const apres = (hz, ms) => {
    let x = 0;
    const dt = 1000 / hz;
    for (let t = 0; t < ms - 1e-9; t += dt) x += (100 - x) * K.rattrape(dt, FOLLOW_MS);
    return x;
  };
  const r = [30, 60, 120].map((hz) => apres(hz, 1000));
  for (const x of r) assert(Math.abs(x - r[1]) < 1, `après 1 s : ${r.map((v) => v.toFixed(2)).join(', ')}`);
  // (l'ancienne formule, dt / FOLLOW_MS, ne le faisait pas : à 30 images par seconde, la vue arrivait plus tôt)
  assertEqual([K.rattrape(0, 250), K.rattrape(-5, 250)], [0, 0]);
  assert(Math.abs(K.rattrape(250, 250) - (1 - Math.exp(-1))) < 1e-12);
});
