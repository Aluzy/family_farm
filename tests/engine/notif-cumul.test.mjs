/* ==========================================================================
   Tests des notifications qui se cumulent (fiche 10) : le compte de js/ui/notif-cumul.js,
   que notify (js/ui/toasts.js, option `cumul`) applique à la notification affichée.
   Lancer seul : node --test tests/engine/notif-cumul.test.mjs (ou node tests/run-tests.mjs notif-cumul).
   ========================================================================== */

import { additionner, cumulSuivant } from '../../js/ui/notif-cumul.js';
import { assertEqual, test } from './aide.mjs';

// Rejoue des appuis { cle, quantites, t } comme notify : une notification par clé, qui reste
// `duree` ms après son dernier appui. Renvoie, pour chaque appui, [nouvelle, totaux].
function rejouer(appuis, duree = 2600) {
  const affichees = new Map();
  return appuis.map(({ cle, quantites, t }) => {
    const r = cumulSuivant(affichees.get(cle) || null, quantites, t);
    affichees.set(cle, { totaux: r.totaux, finA: t + duree });
    return [r.nouvelle, r.totaux];
  });
}

test('cumul : additionner somme chaque clé à part, sans toucher aux objets donnés', () => {
  const a = { planche: 2 };
  const b = { planche: 1, clou: 1 };
  assertEqual(additionner(a, b), { planche: 3, clou: 1 });
  assertEqual([a, b], [{ planche: 2 }, { planche: 1, clou: 1 }], 'les objets donnés restent tels quels');
  assertEqual(Object.keys(additionner({ b: 1 }, { a: 1, b: 1 })), ['b', 'a'], 'les clés déjà là gardent leur place');
  assertEqual(additionner(null, { x: 0.1 }), { x: 0.1 });
  assertEqual(additionner({ x: 0.1 }, { x: 0.2 }), { x: 0.3 }, 'pas de 0,30000000000000004');
  assertEqual(additionner({ n: 3, prix: -30 }, { n: 1, prix: -10 }), { n: 4, prix: -40 }, 'une dépense reste juste');
});

test('cumul : même clé → une seule notification dont la quantité monte', () => {
  const appuis = [0, 200, 400, 600, 800].map((t) => ({ cle: 'atelier:mur', quantites: { mur_bois: 1 }, t }));
  const r = rejouer(appuis);
  assertEqual(r.map(([nouvelle]) => nouvelle), [true, false, false, false, false]);
  assertEqual(r.map(([, t]) => t.mur_bois), [1, 2, 3, 4, 5], '+1, +2, … +5');
  // un appui qui fabrique plusieurs objets d'un coup fait monter d'autant, chaque objet à part
  const p = rejouer([
    { cle: 'atelier:caisse', quantites: { planche: 2 }, t: 0 },
    { cle: 'atelier:caisse', quantites: { planche: 2, clou: 1 }, t: 100 },
  ]);
  assertEqual(p[1], [false, { planche: 4, clou: 1 }]);
  // l'argent : « +30 » puis « +60 »
  const v = rejouer([
    { cle: 'vente:carotte', quantites: { n: 1, gain: 30 }, t: 0 },
    { cle: 'vente:carotte', quantites: { n: 1, gain: 30 }, t: 500 },
  ]);
  assertEqual(v.map(([, t]) => t.gain), [30, 60]);
});

test('cumul : clé différente → une autre notification, et chacune garde son compte', () => {
  const r = rejouer([
    { cle: 'atelier:mur', quantites: { mur_bois: 1 }, t: 0 },
    { cle: 'atelier:mur', quantites: { mur_bois: 1 }, t: 100 },
    { cle: 'atelier:porte', quantites: { porte: 1 }, t: 200 },
    { cle: 'atelier:mur', quantites: { mur_bois: 1 }, t: 300 },
  ]);
  assertEqual(r, [
    [true, { mur_bois: 1 }],
    [false, { mur_bois: 2 }],
    [true, { porte: 1 }],
    [false, { mur_bois: 3 }],
  ]);
});

test('cumul : après expiration, une nouvelle notification repart de la quantité de l\'appui', () => {
  const r = rejouer([
    { cle: 'atelier:mur', quantites: { mur_bois: 1 }, t: 0 },
    { cle: 'atelier:mur', quantites: { mur_bois: 1 }, t: 2000 },
    // la durée repart à chaque appui : 2000 + 2600 = 4600, encore affichée à 4500
    { cle: 'atelier:mur', quantites: { mur_bois: 1 }, t: 4500 },
    // plus rien jusqu'à 4500 + 2600 = 7100 : à 7100, elle a disparu
    { cle: 'atelier:mur', quantites: { mur_bois: 2 }, t: 7100 },
  ]);
  assertEqual(r.map(([nouvelle, t]) => [nouvelle, t.mur_bois]), [[true, 1], [false, 2], [false, 3], [true, 2]]);
  assertEqual(cumulSuivant(null, { a: 1 }, 0), { totaux: { a: 1 }, nouvelle: true }, 'sans notification affichée');
});
