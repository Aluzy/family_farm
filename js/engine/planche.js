/* ---------- la planche de la carte de la ferme : où sont les tuiles ---------- */

// La planche de la ferme (assets/farm_spring_summer.png, 75 colonnes de tuiles de 16 px) : les
// 45 premières rangées sont la planche d'origine, les suivantes les blocs du décor version 2
// (scripts/carte/planche_v2.py, BLOCS : mêmes noms, mêmes places). Le terrain d'une carte
// (terrain-carte.js) et la ferme générée (ferme-generee.js) s'en servent.
export const COLONNES = 75;

// nom -> [colonne, rangée, largeur, hauteur] en tuiles
export const BLOCS = {
  herbe_chemin: [0, 45, 16, 16],
  herbe_deco: [16, 45, 16, 10],
  eau: [32, 45, 16, 16],
  rive_sable: [48, 45, 4, 4],
  rive_herbe: [52, 45, 16, 4],
  arbre: [48, 50, 3, 4],
  pin: [52, 50, 4, 4],
  buisson_rond: [57, 50, 3, 2],
  buisson_large: [61, 50, 3, 2],
  rochers: [16, 55, 8, 2],
  tronc_creux: [24, 55, 2, 1],
  mine: [16, 57, 3, 3],
};

// Numéro de tuile (gid, à partir de 1) de la k-ième tuile d'un bloc (rangée par rangée).
export function blocGid(bloc, k) {
  const [c, r, w] = BLOCS[bloc];
  return 1 + (r + Math.floor(k / w)) * COLONNES + c + (k % w);
}

// Les tuiles entièrement transparentes de la planche que les cartes emploient (relevées dans
// l'image) : elles ne couvrent rien. Les coins du pin (0 et 3) en sont.
export const TUILES_VIDES = new Set([313, 316, 2354, 2357, 2579, 2582, 2583, blocGid('pin', 0), blocGid('pin', 3)]);

// Sol d'herbe foncée : celui de la planche d'origine (et la terre des anciennes zones de
// culture), puis l'herbe de herbe_chemin (rangées 0 à 3, pleine ; 13 à 15, raccords entre
// deux teintes d'herbe). Comme HERBE dans scripts/carte/terres.py.
export const HERBE = new Set([2415, 101, 579, 563, 102, 100, 259, 260, 261, 334, 335, 336, 409, 410, 411, 1167]);
for (const r of [0, 1, 2, 3, 13, 14, 15]) for (let k = 0; k < 16; k++) HERBE.add(blocGid('herbe_chemin', r * 16 + k));

// Couche « plantes_pierres » : ce qui reste labourable (fleurs, touffes d'herbe, brindilles,
// et tout herbe_deco : herbes hautes, fleurs, mauvaises herbes).
export const PLANTES_OK = new Set([399, 177, 175, 394, 400, 396, 397, 398, 322, 1509, 1508, 1433, 247, 100, 101, 102, 320]);
for (let k = 0; k < 16 * 10; k++) PLANTES_OK.add(blocGid('herbe_deco', k));

// Les rochers que la pioche casse (comme ROCKS.gids dans js/carte/ferme/config.js) : ceux de
// la planche d'origine (la carte de Tiled), puis ceux du bloc « rochers » (scripts/carte/
// rochers.py : la ferme générée).
const R = (k) => blocGid('rochers', k);
export const ROCHERS = new Set([466, 467, 541, 542, 616, 617, 691, 692, 764, 765, 766, 767]);
for (let k = 0; k < 16; k++) ROCHERS.add(R(k));
// Les rochers de la ferme générée : pour chaque forme, son emprise (les cases qu'elle réserve
// au tirage : [dc, dr] depuis le coin haut-gauche) et ses dessins ([dc, dr, gid], un au
// choix), dans l'emprise :
//   - gros : 2 × 2 cases ;
//   - haut : 1 × 2 (debout, la colonne de droite) ou 2 × 1 (couché, la rangée du bas), dans
//     l'emprise d'avant (un coin), pour que les rochers des parties déjà commencées restent où
//     ils étaient ;
//   - moyen, caillou, caillou2 : une case.
export const DESSINS_ROCHERS = {
  gros: {
    emprise: [[0, 0], [1, 0], [0, 1], [1, 1]],
    dessins: [
      [[0, 0, R(0)], [1, 0, R(1)], [0, 1, R(8)], [1, 1, R(9)]],
      [[0, 0, R(2)], [1, 0, R(3)], [0, 1, R(10)], [1, 1, R(11)]],
    ],
  },
  haut: {
    emprise: [[1, 0], [0, 1], [1, 1]],
    dessins: [
      [[1, 0, R(4)], [1, 1, R(12)]],
      [[0, 1, R(5)], [1, 1, R(6)]],
      [[0, 1, R(13)], [1, 1, R(14)]],
    ],
  },
  moyen: { emprise: [[0, 0]], dessins: [[[0, 0, R(7)]]] },
  caillou: { emprise: [[0, 0]], dessins: [[[0, 0, R(15)]]] },
  caillou2: { emprise: [[0, 0]], dessins: [[[0, 0, R(7)]], [[0, 0, R(15)]]] },
};

// Le tronc creux au bord de l'étang (un décor : il menait à l'infra-monde, retiré du
// jeu), deux tuiles côte à côte de « plantes_pierres » : celles du bloc
// « tronc_creux » (scripts/carte/tronc_creux.py). La carte de Tiled garde celui du pack (539, 540).
export const TRONC_CREUX = [blocGid('tronc_creux', 0), blocGid('tronc_creux', 1)];

// L'entrée de la mine (le passage vers les niveaux de la grotte : MINE dans
// js/carte/ferme/config.js), un tas de terre de 3 × 3 tuiles de « plantes_pierres », la porte au
// milieu de la rangée du bas : le bloc « mine » (scripts/carte/mine.py).
export const MINE = Array.from({ length: 9 }, (_, k) => blocGid('mine', k));
