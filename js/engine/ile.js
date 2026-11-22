/* ==========================================================================
   L'île de 300 × 300 (docs/ile-300.md) : la carte entière, générée une fois en début de partie puis
   enregistrée ; le joueur la modifie partout. Moteur pur : ni la page, ni le stockage, ni l'horloge ;
   le hasard vient d'une graine. Les réglages sont dans data/ile.json (DATA.ILE).

   Ce fichier est l'entrée : ce que le reste du jeu importe vient d'ici. Le code est rangé dans js/engine/ile/ :
     reglages.js   les types et les constantes (la taille, les biomes, les sols) ;
     hasard.js     hacher, prng, bruit2D, fbm ;
     catalogue.js  le catalogue des espèces, fait des données du jeu ;
     grille.js     les outils de la grille (voisines, distances, flous, limiteur de pente, file de priorité) ;
     forme.js      la terre et la mer, le relief, l'humidité ;
     lacs.js       les lacs (creux naturels, lacs dessinés) ;
     biomes.js     les biomes et les sols, les plages, la prairie du départ ;
     pousse.js     la végétation, les roches, les quotas d'espèces.
     vie.js        l'île en jeu (plate) : sa lecture, ses modifications (le sol, les plantes, la récolte), ses
                   nuits (la pousse, la repousse), les régions à repeindre ;
     sauvegarde.js l'île entière ou ses régions changées, et l'île relue ;
     controle.js   les règles qu'une île ne respecte pas (verifierIle).
   Ici : l'ordre des étapes (ETAPES), genererChantier et creerIle. Viendra la scène (l'étape 7 du chantier).

   Les performances (60 images par seconde, docs/ile-300.md) : rien ici ne tourne à chaque image ; les
   fonctions appelées dans les boucles sur les cases (bruit2D, fbm, les tables du catalogue) n'allouent rien.
   ========================================================================== */

import { biomes, plages, pointApparition } from './ile/biomes.js';
import { formeIle, humidite, relief } from './ile/forme.js';
import { lacs } from './ile/lacs.js';
import { quotasEspeces, roches, vegetation } from './ile/pousse.js';
import { REGLAGES } from './ile/reglages.js';
import { ileDuChantier } from './ile/vie.js';

export { BIOME, BIOMES, GENRES, ILE, SOL, SOL_BIOME, SOL_EAU, SOLS } from './ile/reglages.js';
export { bruit2D, entre, fbm, hacher, prng } from './ile/hasard.js';
export { catalogue, construireCatalogue, renumerotation, tableDesNumeros, verifierCatalogue } from './ile/catalogue.js';
export { compterEspeces } from './ile/pousse.js';
export {
  auLarge,
  changerSol,
  estEau,
  ficheA,
  indice,
  labourable,
  marchable,
  nuit,
  poserObjet,
  recolter,
  regionDe,
  REGIONS,
  regionsModifiees,
  retirerObjet,
} from './ile/vie.js';
export {
  coder,
  decoder,
  depuisSauvegarde,
  fusionnerRegions,
  versSauvegarde,
  versSauvegardeRegions,
} from './ile/sauvegarde.js';
export { verifierIle } from './ile/controle.js';

/**
 * Le chantier de la génération : ce que les étapes se passent, dans l'ordre d'ETAPES. Seuls le sol, les objets et leur
 * état restent dans l'île (plate en jeu) ; le reste, le relief compris, ne sert qu'à générer.
 * @typedef {object} Chantier
 * @property {string} graine
 * @property {number} n                 le côté de l'île (cases)
 * @property {Uint8Array} terre         1 : la terre, 0 : la mer (formeIle)
 * @property {Float32Array} cote        la distance au rivage (cases) : positive sur la terre, négative en mer (formeIle)
 * @property {Float32Array} hauteur     de 0 au rivage à 1 au plus haut ; 0 en mer (relief)
 * @property {Float32Array} humidite    de 0 (sec) à 1 (humide) ; 1 en mer (humidite, puis lacs)
 * @property {Uint8Array} lac           1 : une case de lac (lacs ; sa hauteur est celle de l'eau, plate)
 * @property {{ x: number, y: number, aire: number, origine: string }[]} lacs   le centre, l'aire et l'origine
 *           (creux, dessin) de chaque lac (lacs)
 * @property {Uint8Array} biome         le numéro du biome de chaque case (BIOME ; biomes, plages, pointApparition)
 * @property {Uint8Array} sol           le numéro du sol de chaque case (SOL ; biomes, plages, pointApparition)
 * @property {{ x: number, y: number, rayon: number }} apparition   la prairie plate du départ (pointApparition)
 * @property {Uint16Array} objet        le numéro de l'espèce (ou de la roche) dont le pied est sur la case, 0 : rien
 *                                      (catalogue ; vegetation, roches, quotasEspeces)
 * @property {Uint8Array} etat          le stade de pousse de ce pied (0 : le premier ; stades - 1 : mûr)
 */

/** Les étapes de la génération, dans l'ordre (docs/ile-300.md, « Le code »). */
export const ETAPES = Object.freeze([
  'forme',
  'relief',
  'humidite',
  'lacs',
  'biomes',
  'plages',
  'pointApparition',
  'roches',
  'vegetation',
  'quotasEspeces',
]);

const FAIRE = {
  forme: formeIle,
  relief,
  humidite,
  lacs,
  biomes,
  plages,
  pointApparition,
  vegetation,
  roches,
  quotasEspeces,
};

/**
 * Le chantier d'une graine, mené jusqu'à une étape (comprise) : pour les tests, l'aperçu, et creerIle.
 * @param {string | number} graine
 * @param {string} [jusqua]   une étape d'ETAPES (par défaut la dernière)
 * @returns {Chantier}
 */
export function genererChantier(graine, jusqua = ETAPES[ETAPES.length - 1]) {
  const fin = ETAPES.indexOf(jusqua);
  if (fin < 0) throw new Error(`étape inconnue : « ${jusqua} » (${ETAPES.join(', ')})`);
  const ch = { graine: String(graine), n: REGLAGES.TAILLE };
  for (const etape of ETAPES.slice(0, fin + 1)) FAIRE[etape](ch);
  return ch;
}

/**
 * L'île d'une graine, prête à jouer : générée jusqu'au bout, puis faite île (docs/ile-300.md, étape 6). Une fois en
 * début de partie ; ensuite, l'île se sauve et se relit (versSauvegarde, depuisSauvegarde).
 * @param {string | number} graine
 * @returns {import('./ile/vie.js').Ile}
 */
export function creerIle(graine) {
  return ileDuChantier(genererChantier(graine));
}
