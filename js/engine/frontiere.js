import { farmTerrain } from './terrain.js';
import { villageActif } from './village.js';

/* ---------- la frontière d'un monde en ligne (docs/monde-partage.md) ----------

   E-8 : le monde partagé était la ferme ; le monde refuse une commande qui vise une case hors d'elle. Ce
   contrôle était au serveur (worker/src/monde.mjs) ; il est ici depuis la fiche I9a, pour que le jeu le
   fasse aussi avant d'envoyer (le geste refusé tout de suite, sans aller-retour) : le même code des deux
   côtés.

   I9a (l'île partagée, le chantier allumé : villageActif) : le monde partagé devient l'île entière. Le
   personnage en sort et la vue le suit ; chacun voit le relief de l'île, tiré chez lui de la graine.

   I9b (les changements du monde) : sur une île, les gestes du dehors passent (COMMANDES_DEHORS : récolter une
   pièce du monde, pêcher dans ses eaux, poser, reprendre, déplacer, tourner un bloc du dehors) ; les autres
   gestes qui visent une case hors de la ferme (un arbre de la ferme, un labour, un mur…) n'ont pas de sens
   dehors : refusés, avec leur mot. Le chantier éteint, tout est comme avant (E-8).

   I9c (le port et la caisse en ligne) : les commandes du port (port.*) et du portage (portage.*) passent aussi ; elles
   portent la case du personnage (`case`, que la page donne), et le moteur vérifie ensuite la distance au comptoir
   (port.js portOuvert : PORT.PORTEE) ou la ferme (portage.js : on charge sur la ferme). */

// La case `c` est-elle dans le rectangle de la ferme ? (Un terrain sans ferme : oui.)
export function caseDansLaFerme(state, c) {
  const T = farmTerrain(state), F = T && T.FERME;
  if (!F) return true;
  const x = c % T.LARGEUR, y = Math.floor(c / T.LARGEUR);
  return x >= F.X && y >= F.Y && x < F.X + F.LARGEUR && y < F.Y + F.HAUTEUR;
}

// Une commande qui vise une case hors de la ferme (`args` : ceux de la commande) : ses arguments case, de,
// vers (une case) ; E-9 : arbre, rocher (« col,rang ») ; touffe, touffes (« x,y » en px) ; eau (celles du
// grand monde : lac, rivière, mer) ; E-13 : une cueillette (« sorte:case ») ; I9b : une pièce du monde
// (« sorte:x,y », son pied en px : monde.recolter).
const CASES = ['case', 'de', 'vers'];
const EAUX_DU_MONDE = new Set(['lac', 'riviere', 'mer']);
const PX = 16;
export function commandeHorsDeLaFerme(state, args) {
  if (!args) return false;
  if (CASES.some((k) => Number.isInteger(args[k]) && !caseDansLaFerme(state, args[k]))) return true;
  const W = farmTerrain(state).LARGEUR;
  const tuile = (v) => { const [c, r] = String(v).split(',').map(Number); return r * W + c; };
  const pixel = (v) => { const [x, y] = String(v).split(',').map(Number); return Math.floor((y - 1) / PX) * W + Math.floor(x / PX); };
  for (const k of ['arbre', 'rocher']) if (typeof args[k] === 'string' && /^\d+,\d+$/.test(args[k]) && !caseDansLaFerme(state, tuile(args[k]))) return true;
  if (typeof args.cueillette === 'string' && /:\d+$/.test(args.cueillette) && !caseDansLaFerme(state, Number(args.cueillette.split(':').pop()))) return true;
  const touffes = [].concat(args.touffe || [], args.touffes || []);
  if (touffes.some((t) => /^\d+,\d+$/.test(String(t)) && !caseDansLaFerme(state, pixel(t)))) return true;
  // (une pièce du monde : toujours dehors ; une pièce mal écrite aussi, le moteur la refusera)
  if (typeof args.piece === 'string') { const m = /:(\d+,\d+)$/.exec(args.piece); if (!m || !caseDansLaFerme(state, pixel(m[1]))) return true; }
  return EAUX_DU_MONDE.has(args.eau);
}

// I9a : le monde partagé est-il l'île entière (le chantier allumé pour la partie du monde) ? Sinon, la ferme
// seule (E-8).
export function ilePartagee(state) {
  return villageActif(state);
}

// I9c : les commandes du port et du portage (commandes.js ; elles portent toutes `case`).
export const COMMANDES_DU_PORT = Object.freeze([
  'port.vendre', 'port.acheter', 'port.honorer', 'port.importer', 'port.contrat', 'port.livrer', 'port.apporter', 'port.agrandir', 'port.decharger',
  'portage.charger', 'portage.reprendre', 'portage.vehicule',
]);
// I9b : les commandes qui se jouent hors de la ferme, sur une île partagée : prendre une pièce du monde (couper,
// casser, faucher, cueillir, ramasser : js/engine/monde-recolte.js), pêcher dans ses eaux, et les blocs du dehors
// (fiche I2 : un chemin, un pont, une barrière, un banc, une lumière ; blocs.js les vérifie, dehors.js
// poseDehorsStatus) ; I9c, le port et le portage.
export const COMMANDES_DEHORS = new Set([
  'monde.recolter', 'outil.pecher',
  'bloc.poser', 'bloc.reprendre', 'bloc.remettre', 'bloc.deplacer', 'bloc.tourner', 'bloc.orienter', 'bloc.peindre', 'portail.basculer',
  // (I9c : le port, au comptoir ; le portage, sur la ferme)
  ...COMMANDES_DU_PORT,
]);

// Le mot d'un refus à la frontière (la commande vise hors de la ferme).
export const HORS_FERME = 'Hors de la ferme : en ligne, le monde partagé, c\'est la ferme.';
export const HORS_FERME_ILE = 'Hors de la ferme, ce geste ne se fait pas : dehors, on récolte, on pêche, on commerce au port et l\'on pose des chemins, des ponts, des barrières, des bancs et des lumières.';
// `type` (I9b) : celui de la commande ; sur une île, une commande du dehors passe (le moteur la vérifie ensuite).
export function refusFrontiere(state, args, type = null) {
  if (!commandeHorsDeLaFerme(state, args)) return null;
  if (!ilePartagee(state)) return HORS_FERME;
  return type && COMMANDES_DEHORS.has(type) ? null : HORS_FERME_ILE;
}
