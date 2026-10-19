/* carte/ville/lieux.js — la scène de la ville : les plans des lieux bâtis en blocs.
 *
 * Les lieux de la ville (docs/plan-ville.md, étape 4 : les commerces d'abord) sont bâtis en blocs
 * comme les immeubles d'habitation (js/carte/ville/immeuble.js : IMMEUBLE.batiments, au plan
 * qui porte le nom du lieu) : on y entre par la porte double de la façade, sous l'enseigne, et on
 * monte à l'étage par l'escalier. Chaque plan (V.plansLieux) donne, niveau par niveau :
 *   - `murs` : les cloisons, des segments [x0, y0, x1, y1] (horizontaux ou verticaux) ;
 *   - `portes` : les portes des cloisons, [x, y] ;
 *   - `meubles` : { nom, x, y, w, h, flip, plat } (assets/meuble_<nom>.png : scripts/ville/
 *     commerces.py, scripts/batiments/meubles.py) ;
 * et pour tout le lieu : `escalier` [x, y] (il monte du rez-de-chaussée à l'étage), `porte` (la
 * case de gauche de la porte d'entrée), `fenetres` { devant, derriere } (les colonnes des murs
 * à fenêtre ; devant, au rez-de-chaussée, la porte prend sa place).
 *
 * Le rez-de-chaussée est la boutique : la salle des clients devant, le comptoir, l'atelier ou la
 * cuisine derrière ; l'étage, la réserve et le bureau.
 */
(function (global) {
  'use strict';

  const V = global.CarteVille;

  // un meuble : son nom, sa case (x, y), sa taille en cases (w × h), retourné (flip)
  const m = (nom, x, y, w = 1, h = 1, flip = false) => ({ nom, x, y, w, h, flip });
  // l'étage de réserve et de bureau, pour un lieu de W cases de large : le bureau et sa chaise,
  // les étagères de cartons contre le mur du fond, une table et ses chaises, une plante
  const reserve = (W) => ({
    meubles: [
      m('bureau_ordi', 1, 1, 2), m('chaise', 2, 2), ...Array.from({ length: Math.max(1, Math.floor((W - 7) / 2)) }, (_, i) => m('etagere_info', 4 + 2 * i, 1, 2)),
      m('chaise', 1, 6), m('table', 2, 6, 3), m('chaise', 5, 6, 1, 1, true), m('plante', W - 2, 8),
    ],
  });

  V.plansLieux = {
    // la boulangerie (5 cases de large) : le fournil derrière (le four, le pétrin), la vitrine
    // devant la salle ; à l'étage, la réserve de pain
    boulangerie: {
      escalier: [3, 1], porte: 1, fenetres: { devant: [3], derriere: [1, 2] },
      niveaux: [
        { meubles: [m('four_boulanger', 1, 1, 2, 2), m('petrin', 1, 3), m('vitrine_pain', 1, 5, 2)] },
        { meubles: [m('etagere_pain', 1, 1, 2), m('etagere_pain', 1, 4, 2), m('chaise', 3, 6), m('plante', 1, 7)] },
      ],
    },
    // la pizzeria (11 cases) : la cuisine derrière (le four à bois, le plan de travail, le frigo,
    // le fourneau), le comptoir et la salle, ses deux tables
    pizzeria: {
      escalier: [9, 1], porte: 4, fenetres: { devant: [1, 2, 8, 9], derriere: [3, 4, 6, 7] },
      niveaux: [
        {
          murs: [[1, 5, 9, 5]], portes: [[8, 5]],
          meubles: [
            m('four_pizza', 1, 1, 2, 2), m('plan', 3, 1, 2), m('frigo', 5, 1), m('cuisine', 6, 1, 2, 2),
            m('comptoir', 1, 6, 3), m('chaise', 4, 7), m('table', 5, 7, 3), m('chaise', 8, 7, 1, 1, true),
            m('chaise', 4, 9), m('table', 5, 9, 3), m('chaise', 8, 9, 1, 1, true), m('plante', 9, 10),
          ],
        },
        reserve(11),
      ],
    },
    // le fast-food de burgers (11 cases) : la cuisine derrière (le grill, deux friteuses, le
    // plan de travail, le frigo), le long comptoir, la salle et ses deux tables
    burger: {
      escalier: [9, 1], porte: 4, fenetres: { devant: [1, 2, 8, 9], derriere: [3, 4, 6, 7] },
      niveaux: [
        {
          murs: [[1, 4, 9, 4]], portes: [[8, 4]],
          meubles: [
            m('grill', 1, 1, 2), m('friteuse', 3, 1), m('friteuse', 4, 1), m('plan', 5, 1, 2), m('frigo', 7, 1),
            m('comptoir', 1, 5, 3), m('comptoir', 4, 5, 3),
            m('chaise', 1, 7), m('table', 2, 7, 3), m('chaise', 5, 7, 1, 1, true),
            m('chaise', 5, 9), m('table', 6, 9, 3), m('chaise', 9, 9, 1, 1, true),
          ],
        },
        reserve(11),
      ],
    },
    // la poissonnerie (21 cases) : la préparation derrière (les plans de travail, l'évier, les
    // frigos), le long étal sur la glace, le comptoir et la caisse, le bac à homards
    poissonnerie: {
      escalier: [19, 1], porte: 9, fenetres: { devant: [2, 3, 5, 6, 13, 14, 16, 17], derriere: [3, 4, 8, 9, 12, 13] },
      niveaux: [
        {
          murs: [[1, 4, 19, 4]], portes: [[17, 4]],
          meubles: [
            m('plan', 1, 1, 2), m('plan', 3, 1, 2), m('evier', 5, 1, 2), m('frigo', 7, 1), m('frigo', 8, 1), m('plan', 10, 1, 2),
            m('etal_poisson', 2, 6, 3), m('etal_poisson', 5, 6, 3), m('etal_poisson', 8, 6, 3), m('comptoir', 12, 6, 3),
            m('bac_homards', 16, 9), m('bac_homards', 17, 9), m('plante', 1, 12), m('plante', 19, 12),
          ],
        },
        reserve(21),
      ],
    },
    // le magasin d'informatique (12 cases) : l'atelier de réparation derrière (deux bureaux,
    // une étagère), le comptoir, les étagères de cartons et les présentoirs
    informatique: {
      escalier: [10, 1], porte: 5, fenetres: { devant: [1, 2, 9, 10], derriere: [3, 4, 6, 7] },
      niveaux: [
        {
          murs: [[1, 4, 10, 4]], portes: [[9, 4]],
          meubles: [
            m('bureau_ordi', 1, 1, 2), m('chaise', 2, 2), m('bureau_ordi', 4, 1, 2), m('chaise', 5, 2), m('etagere_info', 7, 1, 2),
            m('comptoir', 1, 5, 3), m('etagere_info', 5, 5, 2), m('etagere_info', 7, 5, 2),
            m('presentoir', 2, 8, 2), m('presentoir', 6, 8, 2), m('presentoir', 8, 10, 2), m('plante', 1, 11), m('plante', 10, 11),
          ],
        },
        reserve(12),
      ],
    },
  };

  // Le plan du niveau n (sur N) du lieu `b` (son plan : V.plansLieux[b.plan]), au format de
  // V.planImmeuble ; un lieu n'a pas de logement.
  V.planLieu = function (b, n, N) {
    const P = V.plansLieux[b.plan], niv = P.niveaux[n] || {}, W = b.w, H = b.h;
    const g = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (__, x) => (!x || !y || x === W - 1 || y === H - 1 ? 'M' : '.')));
    for (const [x0, y0, x1, y1] of niv.murs || []) {
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) g[y][x] = 'M';
    }
    for (const [x, y] of niv.portes || []) g[y][x] = 'P';
    for (const x of P.fenetres.devant || []) g[H - 1][x] = 'F';
    for (const x of P.fenetres.derriere || []) g[0][x] = 'F';
    g[H - 1][P.porte] = g[H - 1][P.porte + 1] = n ? 'F' : 'P';
    const [ex, ey] = P.escalier;
    if (n < N - 1) g[ey][ex] = 'U';
    else if (n > 0) g[ey][ex] = 'D';
    return { grille: g.map((l) => l.join('')), meubles: (niv.meubles || []).map((q) => ({ ...q })), porte: P.porte, logements: [] };
  };
})(window);
