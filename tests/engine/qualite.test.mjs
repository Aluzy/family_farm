/* ==========================================================================
   Tests : la qualité de l'affichage (fiche 9a : CarteKit.qualite, js/carte/kit.js).
   - « auto » : économie sur un téléphone (un écran tactile sans souris, ou un navigateur qui se dit
     mobile), normale sur un ordinateur ; le choix gardé sur l'appareil (localStorage) l'emporte ;
   - l'économie dessine le canvas à la moitié de la densité de l'écran (au moins 1), la normale à la
     densité de l'écran (plafonnée à 3) : sur un ordinateur, rien ne change ;
   - le moteur ne la voit jamais : aucun fichier de js/engine/ ne la lit, la partie ne la garde pas, et
     une même partie jouée donne le même résultat.
   Lancer seul : node --test tests/engine/qualite.test.mjs (ou node tests/run-tests.mjs qualite).
   ========================================================================== */

import { readdirSync, readFileSync } from 'node:fs';
import { createInitialState, sleep, tick } from '../../js/engine/index.js';
import { assert, assertEqual, test } from './aide.mjs';

const KIT = readFileSync(new URL('../../js/carte/kit.js', import.meta.url), 'utf8');

// js/carte/kit.js (un script de la page) chargé dans une fenêtre d'essai : `ecran` (densité), `mobile`
// (un écran tactile sans souris), `garde` (ce que localStorage garde déjà).
function kit({ ecran = 1, mobile = false, garde = null, uaMobile } = {}) {
  const stock = new Map(garde ? [['ferme-qualite', garde]] : []);
  const fenetre = {
    devicePixelRatio: ecran,
    navigator: uaMobile === undefined ? {} : { userAgentData: { mobile: uaMobile } },
    matchMedia: (q) => ({ matches: q === '(pointer: coarse)' ? mobile : q === '(any-pointer: fine)' ? !mobile : false }),
    localStorage: { getItem: (k) => (stock.has(k) ? stock.get(k) : null), setItem: (k, v) => stock.set(k, String(v)) },
  };
  new Function('window', KIT)(fenetre);
  return { K: fenetre.CarteKit, stock };
}

test('la qualité : « auto » donne l\'économie sur un téléphone, la normale sur un ordinateur', () => {
  assertEqual(kit({ ecran: 1 }).K.qualite(), 'normale', 'un ordinateur');
  assertEqual(kit({ ecran: 2, mobile: false }).K.qualite(), 'normale', 'un ordinateur à écran dense');
  assertEqual(kit({ ecran: 3, mobile: true }).K.qualite(), 'economie', 'un téléphone');
  assertEqual(kit({ ecran: 2, uaMobile: true }).K.qualite(), 'economie', 'un navigateur qui se dit mobile');
  // le choix gardé l'emporte ; un choix inconnu vaut « auto »
  assertEqual(kit({ ecran: 3, mobile: true, garde: 'normale' }).K.qualite(), 'normale');
  assertEqual(kit({ ecran: 1, garde: 'economie' }).K.qualite(), 'economie');
  assertEqual(kit({ ecran: 1, garde: 'n\'importe' }).K.qualiteChoisie(), 'auto');
});

test('la qualité : l\'économie divise la densité du canvas par deux (au moins 1) ; la normale ne change rien', () => {
  for (const [ecran, normale, economie] of [[1, 1, 1], [1.5, 1.5, 1], [2, 2, 1], [2.75, 2.75, 1.375], [3, 3, 1.5], [4, 3, 1.5]]) {
    assertEqual(kit({ ecran, garde: 'normale' }).K.ratio(), normale, `densité ${ecran}, normale`);
    assertEqual(kit({ ecran, garde: 'economie' }).K.ratio(), economie, `densité ${ecran}, économie`);
  }
  // l'ancien calcul (avant la fiche 9a), sur un ordinateur : le même
  for (const ecran of [0.5, 1, 1.25, 2, 3, 5]) assertEqual(kit({ ecran }).K.ratio(), Math.min(3, Math.max(1, ecran)), `ordinateur ${ecran}`);
  const R = kit({ ecran: 1 }).K.QUALITE.reglages;
  assertEqual(Object.keys(R.normale).sort(), Object.keys(R.economie).sort(), 'les mêmes réglages des deux côtés');
  assertEqual([R.normale.brouillardPx, R.economie.brouillardPx, R.normale.lumierePx, R.economie.lumierePx, R.normale.merVivante, R.economie.merVivante], [2, 4, 1, 2, true, false]);
  for (const r of Object.values(R)) assertEqual(32 % r.brouillardPx, 0, 'un point du brouillard divise deux cases');
});

test('la qualité : reglerQualite la change et la garde sur l\'appareil', () => {
  const { K, stock } = kit({ ecran: 3, mobile: true });
  assertEqual([K.qualite(), K.ratio()], ['economie', 1.5]);
  assertEqual(K.reglerQualite('normale'), 'normale');
  assertEqual([K.qualite(), K.ratio(), stock.get('ferme-qualite')], ['normale', 3, 'normale']);
  assertEqual(K.reglerQualite('auto'), 'economie');
  assertEqual(K.reglerQualite('ultra'), 'economie', 'un choix inconnu ne change rien');
  assertEqual(stock.get('ferme-qualite'), 'auto');
});

test('la qualité : le moteur ne la voit jamais (ni ses fichiers, ni la partie) ; la même partie donne le même résultat', () => {
  const dossier = new URL('../../js/engine/', import.meta.url);
  for (const f of readdirSync(dossier).filter((x) => x.endsWith('.js'))) {
    const texte = readFileSync(new URL(f, dossier), 'utf8');
    assert(!/ferme-qualite|reglages\(\)|qualite\(|reglerQualite/.test(texte), `${f} ne lit pas la qualité`);
  }
  const jouer = () => { const s = createInitialState(9); tick(s, 30); s.awakeMs = 30000; sleep(s); return s; };
  const a = jouer();
  assert(!JSON.stringify(a).includes('qualite'), 'la sauvegarde ne la garde pas');
  for (const q of ['economie', 'normale']) { kit({ ecran: 3, mobile: true, garde: q }); assertEqual(jouer(), a, q); }
});
