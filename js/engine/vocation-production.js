/* ==========================================================================
   La vocation « ferme productive » (le chantier « l'île à bâtir », docs/ile.md, fiche I8b ; les réglages :
   data/village.json VOCATIONS.production ; le socle : js/engine/vocations.js, où son calcul s'enregistre).

   Une grosse économie, une ferme presque industrielle et automatisée : le score monte avec
     - la valeur exportée au port sur le mois de lune (production.js exporteDuMois : un point par CAUSES.export.PIECES),
     - les machines en état de marche (les chaînes de production prêtes, le Moulin bâti, le robot, le quai de
       chargement : CAUSES.machines.POINTS chacune),
     - l'énergie produite sur le mois de lune (production.js energieDuMois : un point par CAUSES.energie.WH Wh),
     - les contrats d'export honorés (contrats.js : CAUSES.contrats.POINTS chacun, depuis le début).
   Pur : rien n'est écrit ici. Rien ne pollue, rien ne retire de bonheur : c'est un autre goût de jeu, pas une faute.
   ========================================================================== */

import { DATA } from './catalog.js';
import { enregistrerVocation } from './vocations.js';
import { energieDuMois, exporteDuMois, quaiDeChargement } from './production.js';
import { chaines } from './chaines.js';
import { robotOn } from './automation.js';

const CAUSES = () => DATA.VOCATIONS.production.CAUSES;

// Les machines de la ferme en état de marche : { chaines, moulin, robot, quai, total }.
export function machinesEnMarche(state) {
  const n = {
    chaines: chaines(state).filter((c) => c.ok).length,
    moulin: state.stations && state.stations.moulin && state.stations.moulin.construit ? 1 : 0,
    robot: robotOn(state) ? 1 : 0,
    quai: quaiDeChargement(state) !== null ? 1 : 0,
  };
  return { ...n, total: n.chaines + n.moulin + n.robot + n.quai };
}

// Le score et ses causes : { score, causes: [{ id, nom, valeur }] } (des entiers).
export function calculProduction(state) {
  const K = CAUSES();
  const honores = (state.production && state.production.contrats && state.production.contrats.honores) || 0;
  const causes = [
    { id: 'export', nom: K.export.nom, valeur: Math.floor(exporteDuMois(state) / Math.max(1, K.export.PIECES)) },
    { id: 'machines', nom: K.machines.nom, valeur: machinesEnMarche(state).total * K.machines.POINTS },
    { id: 'energie', nom: K.energie.nom, valeur: Math.floor(energieDuMois(state) / Math.max(1, K.energie.WH)) },
    { id: 'contrats', nom: K.contrats.nom, valeur: honores * K.contrats.POINTS },
  ];
  return { score: causes.reduce((t, c) => t + c.valeur, 0), causes };
}

enregistrerVocation('production', calculProduction);
