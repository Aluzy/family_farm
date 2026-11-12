/* ==========================================================================
   Le port sur l'île (docs/ile.md, fiche I1a). Avec l'abri, le seul bâtiment de l'île au début d'une
   partie : un quai sur la mer, une cale, une halle ouverte, au bout de l'île, relié à la sortie de la
   ferme par un chemin. Les réglages : data/village.json (PORT).
   - Le plan le place (js/engine/monde-gen.js, elementsDuMonde : lieux.port, après les autres lieux, qui ne
     bougent pas), quand le cadre du monde porte PORT : le niveau du port (js/engine/monde.js, genererMonde ;
     terrain.js farmTerrain le demande pour une partie où le chantier est allumé).
   - Le bâti se fait avec les hameaux (js/engine/monde-hameaux.js, planPort : le quai, la halle et son toit,
     ses objets ; ce qui ferme et ce qui s'ouvre à la marche, ce qui est réservé), ses dessins à la suite des
     leurs (scripts/carte/port.py) ; la scène l'anime (js/carte/ferme/hameaux.js : les lanternes le soir).
   - Il est connu dès le départ : la carte du monde le montre, son chemin aussi, et la boussole y mène
     (js/engine/monde-vu.js, lieuxDeLaCarte).
   Le commerce viendra avec la fiche I1b, les niveaux payés avec I1c (state.port.niveau).
   ========================================================================== */

import { DATA } from './catalog.js';
import { villageActif } from './village.js';

export const PORT = DATA.PORT;
export const NIVEAUX_PORT = PORT.NIVEAUX.length;

// Le niveau du port de la partie (1 à NIVEAUX_PORT), ou 0 : pas de port (le chantier éteint).
export function niveauPort(state) {
  if (!villageActif(state)) return 0;
  const n = state && state.port && Number.isInteger(state.port.niveau) ? state.port.niveau : PORT.NIVEAU_DEPART;
  return Math.max(1, Math.min(NIVEAUX_PORT, n));
}

// Ce que le port a au niveau n : { quai (sa longueur, en cases), ajoute (Set : les noms de NIVEAUX[].ajoute
// jusqu'à n) }.
export function contenuPort(n) {
  const k = Math.max(1, Math.min(NIVEAUX_PORT, n | 0)), ajoute = new Set();
  for (let i = 0; i < k; i++) for (const a of PORT.NIVEAUX[i].ajoute) ajoute.add(a);
  return { quai: PORT.NIVEAUX[k - 1].quai, ajoute };
}
