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
 * Un commerce : au rez-de-chaussée, la boutique (la salle des clients devant, le comptoir et la
 * place du vendeur derrière lui, l'atelier ou la cuisine au fond) ; à l'étage, la réserve et le bureau. Les services et les
 * loisirs : la mairie (l'accueil, la salle des mariages, les bureaux ; la salle du conseil et le
 * bureau du maire), le musée (deux salles d'exposition), le cinéma (la salle et ses fauteuils,
 * le hall et la billetterie ; la cabine de projection), les écoles (une classe par niveau), le
 * bureau de négoce (la salle des marchés ; la salle de réunion). Une fabrique : l'atelier et ses
 * machines au rez-de-chaussée, les bureaux et la réserve à l'étage.
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

  // une rangée de pupitres d'élèves, à la ligne y
  const pupitres = (y) => [2, 4, 6, 9, 11, 13].map((x) => m('pupitre_eleve', x, y));
  // une classe : le tableau noir, le bureau du maître, l'étagère à livres, le globe, trois rangées
  // de pupitres
  const classe = () => ({
    meubles: [
      m('etagere_livres', 1, 1, 2), m('globe', 4, 1), m('tableau_noir', 6, 1, 3), m('chaise', 11, 1), m('table', 10, 2, 3),
      ...pupitres(5), ...pupitres(7), ...pupitres(9), m('plante', 1, 10),
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
            m('comptoir', 1, 7, 3), m('chaise', 4, 7), m('table', 5, 7, 3), m('chaise', 8, 7, 1, 1, true),
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
            m('comptoir', 1, 6, 3), m('comptoir', 4, 6, 3),
            m('chaise', 1, 8), m('table', 2, 8, 3), m('chaise', 5, 8, 1, 1, true),
            m('chaise', 6, 10), m('table', 7, 10, 3),
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
            m('comptoir', 1, 6, 3), m('etagere_info', 5, 5, 2), m('etagere_info', 7, 5, 2),
            m('presentoir', 2, 8, 2), m('presentoir', 6, 8, 2), m('presentoir', 8, 10, 2), m('plante', 1, 11), m('plante', 10, 11),
          ],
        },
        reserve(12),
      ],
    },
    // la mairie (19 cases) : l'accueil au milieu (le comptoir, un banc), la salle des mariages à
    // gauche (le pupitre entre deux drapeaux, deux bancs), les bureaux à droite ; à l'étage, la
    // salle du conseil et le bureau du maire
    mairie: {
      escalier: [11, 1], porte: 9, fenetres: { devant: [2, 3, 5, 6, 12, 13, 15, 16], derriere: [2, 3, 8, 10, 15, 16] },
      niveaux: [
        {
          murs: [[6, 1, 6, 7], [12, 1, 12, 7]], portes: [[6, 5], [12, 5]],
          meubles: [
            m('comptoir', 8, 2, 3), m('banc', 8, 5, 3),
            m('drapeau', 1, 1), m('pupitre', 3, 1), m('drapeau', 5, 1), m('banc', 1, 3, 3), m('banc', 1, 5, 3),
            m('classeur', 13, 1), m('bureau_ordi', 14, 1, 2), m('chaise', 15, 2), m('classeur', 17, 1),
            m('bureau_ordi', 15, 4, 2), m('chaise', 16, 5), m('plante', 17, 7),
          ],
        },
        {
          meubles: [
            m('drapeau', 1, 1), m('bureau_ordi', 2, 1, 2), m('chaise', 3, 2), m('drapeau', 5, 1),
            m('chaise', 6, 4), m('table', 7, 4, 3), m('chaise', 10, 4, 1, 1, true), m('chaise', 6, 6), m('table', 7, 6, 3), m('chaise', 10, 6, 1, 1, true),
            m('classeur', 13, 1), m('etagere_livres', 14, 1, 2), m('classeur', 17, 1), m('plante', 1, 7), m('plante', 17, 7),
          ],
        },
      ],
    },
    // le musée (8 cases) : le squelette de dinosaure, un buste, deux vitrines, deux tableaux,
    // l'accueil ; à l'étage, la galerie des tableaux et des statues
    musee: {
      escalier: [1, 1], porte: 3, fenetres: { devant: [1, 6], derriere: [3, 4] },
      niveaux: [
        {
          meubles: [
            m('dinosaure', 2, 2, 3, 2), m('statue', 6, 1), m('vitrine_musee', 1, 5, 2), m('vitrine_musee', 5, 5, 2),
            m('chevalet', 1, 7), m('chevalet', 6, 7), m('comptoir', 4, 9, 3), m('plante', 1, 10),
          ],
        },
        {
          meubles: [
            m('chevalet', 3, 1), m('chevalet', 5, 1), m('statue', 6, 3), m('vitrine_musee', 1, 4, 2), m('vitrine_musee', 4, 5, 2),
            m('banc', 2, 7, 3), m('statue', 1, 9), m('chevalet', 6, 9),
          ],
        },
      ],
    },
    // le cinéma (16 cases) : la salle (l'écran, trois rangées de fauteuils de part et d'autre de
    // l'allée), le hall (la billetterie, la machine à pop-corn, un banc) ; à l'étage, la cabine
    // de projection
    cinema: {
      escalier: [14, 10], porte: 7, fenetres: { devant: [2, 3, 12, 13], derriere: [] },
      niveaux: [
        {
          murs: [[1, 9, 14, 9]], portes: [[8, 9]],
          meubles: [
            m('ecran_cinema', 5, 1, 6),
            ...[4, 6, 8].flatMap((y) => [2, 5, 9, 12].map((x) => m('fauteuils', x, y, 3))),
            m('comptoir', 1, 10, 3), m('popcorn', 4, 10), m('banc', 10, 11, 3), m('plante', 14, 12),
          ],
        },
        {
          meubles: [
            m('etagere_info', 1, 1, 2), m('etagere_info', 3, 1, 2), m('bureau_ordi', 6, 1, 2), m('chaise', 7, 2), m('classeur', 9, 1),
            m('projecteur', 5, 6), m('projecteur', 9, 6), m('chaise', 1, 9), m('table', 2, 9, 3), m('chaise', 5, 9, 1, 1, true), m('plante', 12, 12),
          ],
        },
      ],
    },
    // l'école (16 cases) : une classe par niveau
    ecole: {
      escalier: [14, 1], porte: 7, fenetres: { devant: [2, 3, 5, 10, 12, 13], derriere: [3, 4, 11, 12] },
      niveaux: [classe(), classe()],
    },
    // le bureau de négoce (11 cases) : la salle des marchés (le tableau des cours, six bureaux, le
    // coffre, l'accueil) ; à l'étage, le bureau du directeur et la salle de réunion
    negoce: {
      escalier: [1, 1], porte: 4, fenetres: { devant: [1, 2, 7, 8], derriere: [3, 4, 6, 7] },
      niveaux: [
        {
          meubles: [
            m('tableau_cours', 3, 1, 3), m('coffre', 8, 1), m('classeur', 9, 1),
            ...[4, 7].flatMap((y) => [1, 4, 7].flatMap((x) => [m('bureau_ordi', x, y, 2), m('chaise', x + 1, y + 1)])),
            m('banc', 1, 11, 3), m('comptoir', 6, 10, 3), m('plante', 9, 12),
          ],
        },
        {
          meubles: [
            m('classeur', 4, 1), m('bureau_ordi', 6, 1, 2), m('chaise', 7, 2), m('coffre', 9, 1),
            m('chaise', 2, 5), m('table', 3, 5, 3), m('chaise', 6, 5, 1, 1, true), m('chaise', 2, 8), m('table', 3, 8, 3), m('chaise', 6, 8, 1, 1, true),
            m('etagere_livres', 8, 10, 2), m('plante', 1, 12),
          ],
        },
      ],
    },
    // la minoterie (13 cases) : le silo à grain, deux moulins à cylindres, les sacs de farine,
    // une palette, le chariot élévateur
    minoterie: {
      escalier: [11, 1], porte: 5, fenetres: { devant: [1, 2, 9, 10], derriere: [] },
      niveaux: [
        {
          meubles: [
            m('silo_grain', 1, 1, 2, 2), m('moulin', 4, 1, 2, 2), m('moulin', 7, 1, 2, 2),
            m('sacs_farine', 1, 5, 2), m('sacs_farine', 3, 5, 2), m('sacs_farine', 8, 6, 2), m('palette', 1, 8, 2), m('chariot', 8, 9, 2),
          ],
        },
        reserve(13),
      ],
    },
    // la fabrique textile (11 cases) : deux métiers à tisser, les bobines, deux machines à
    // coudre et leur table, les rouleaux de tissu
    textile: {
      escalier: [9, 1], porte: 4, fenetres: { devant: [1, 2, 7, 8], derriere: [] },
      niveaux: [
        {
          meubles: [
            m('metier_tisser', 1, 1, 2, 2), m('metier_tisser', 4, 1, 2, 2), m('bobines', 7, 1, 2),
            m('machine_coudre', 1, 5), m('machine_coudre', 2, 5), m('table', 5, 5, 3), m('rouleaux_tissu', 1, 7, 2), m('rouleaux_tissu', 7, 7, 2),
          ],
        },
        reserve(11),
      ],
    },
    // la fabrique de mayonnaise (11 cases) : deux cuves de mélange, les caisses d'œufs, la chaîne
    // de remplissage, les palettes de pots, le chariot
    mayonnaise: {
      escalier: [9, 1], porte: 4, fenetres: { devant: [1, 2, 7, 8], derriere: [] },
      niveaux: [
        {
          meubles: [
            m('cuve', 1, 1, 2, 2), m('cuve', 4, 1, 2, 2), m('caisse_oeufs', 7, 1), m('caisse_oeufs', 8, 1),
            m('remplisseuse', 1, 4, 3), m('palette_pots', 5, 4, 2), m('palette_pots', 1, 7, 2), m('chariot', 7, 7, 2),
          ],
        },
        reserve(11),
      ],
    },
    // la fabrique de matériaux (13 cases) : la bétonnière, la presse à briques, les sacs de
    // ciment, les palettes de briques, le chariot
    materiaux: {
      escalier: [11, 1], porte: 5, fenetres: { devant: [1, 2, 9, 10], derriere: [] },
      niveaux: [
        {
          meubles: [
            m('betonniere', 1, 1, 2, 2), m('presse_briques', 4, 1, 2, 2), m('sacs_ciment', 7, 1, 2),
            m('palette_briques', 1, 5, 2), m('palette_briques', 3, 5, 2), m('palette_briques', 8, 5, 2), m('chariot', 9, 7, 2),
          ],
        },
        reserve(13),
      ],
    },
    // l'usine électronique (11 cases) : les armoires à composants, l'établi de soudure, deux
    // chaînes de montage et leur bras robot, une palette, le chariot
    electronique: {
      escalier: [9, 1], porte: 4, fenetres: { devant: [1, 2, 7, 8], derriere: [3, 4, 6, 7] },
      niveaux: [
        {
          meubles: [
            m('armoire_composants', 1, 1), m('armoire_composants', 2, 1), m('etabli_soudure', 4, 1, 2),
            m('chaine_montage', 1, 4, 3), m('chaine_montage', 4, 4, 3), m('robot_bras', 7, 4), m('palette', 1, 7, 2), m('chariot', 7, 7, 2),
          ],
        },
        reserve(11),
      ],
    },
    // l'usine informatique (14 cases) : les baies de serveurs, les étagères de cartons, la
    // chaîne de montage et ses bras robots, les bancs de test, une palette, le chariot
    usine_info: {
      escalier: [12, 1], porte: 6, fenetres: { devant: [1, 2, 10, 11], derriere: [4, 5, 8, 9] },
      niveaux: [
        {
          meubles: [
            m('serveur', 1, 1), m('serveur', 2, 1), m('serveur', 3, 1), m('etagere_info', 5, 1, 2), m('etagere_info', 7, 1, 2),
            m('chaine_montage', 1, 4, 3), m('chaine_montage', 4, 4, 3), m('robot_bras', 7, 4), m('chaine_montage', 8, 4, 3),
            ...[1, 4, 7].flatMap((x) => [m('bureau_ordi', x, 7, 2), m('chaise', x + 1, 8)]),
            m('palette', 1, 11, 2), m('chariot', 10, 11, 2),
          ],
        },
        reserve(14),
      ],
    },
    // la menuiserie (7 cases, tout en longueur) : les planches, les établis, la scie
    // circulaire, les meubles finis ; à l'étage, le bureau et le stock de bois
    menuiserie: {
      escalier: [5, 1], porte: 2, fenetres: { devant: [1, 4], derriere: [2, 3] },
      niveaux: [
        {
          meubles: [
            m('planches', 1, 1, 3), m('etabli', 1, 4, 3), m('scie', 1, 7, 2), m('etabli', 1, 10, 3), m('planches', 1, 13, 3),
            m('chaise', 1, 16), m('table', 2, 16, 3), m('armoire', 5, 10), m('armoire', 5, 13), m('palette', 1, 19, 2),
          ],
        },
        {
          meubles: [
            m('planches', 1, 1, 3), m('bureau_ordi', 1, 4, 2), m('chaise', 2, 5), m('planches', 1, 8, 3), m('planches', 1, 11, 3),
            m('etagere_info', 1, 14, 2), m('armoire', 5, 14), m('plante', 5, 19),
          ],
        },
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
