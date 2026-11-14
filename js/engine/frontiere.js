import { farmTerrain } from './terrain.js';
import { villageActif } from './village.js';

/* ---------- la frontière d'un monde en ligne (docs/monde-partage.md) ----------

   E-8 : le monde partagé était la ferme ; le monde refuse une commande qui vise une case hors d'elle. Ce
   contrôle était au serveur (worker/src/monde.mjs) ; il est ici depuis la fiche I9a, pour que le jeu le
   fasse aussi avant d'envoyer (le geste refusé tout de suite, sans aller-retour) : le même code des deux
   côtés.

   I9a (l'île partagée, le chantier allumé : villageActif) : le monde partagé devient l'île entière. Le
   personnage en sort et la vue le suit ; chacun voit le relief de l'île, tiré chez lui de la graine. Mais
   rien d'autre n'est encore synchronisé hors de la ferme : ces commandes restent refusées, avec un autre
   mot (I9b les ouvrira, région par région). Le chantier éteint, tout est comme avant. */

// La case `c` est-elle dans le rectangle de la ferme ? (Un terrain sans ferme : oui.)
export function caseDansLaFerme(state, c) {
  const T = farmTerrain(state), F = T && T.FERME;
  if (!F) return true;
  const x = c % T.LARGEUR, y = Math.floor(c / T.LARGEUR);
  return x >= F.X && y >= F.Y && x < F.X + F.LARGEUR && y < F.Y + F.HAUTEUR;
}

// Une commande qui vise une case hors de la ferme (`args` : ceux de la commande) : ses arguments case, de,
// vers (une case) ; E-9 : arbre, rocher (« col,rang ») ; touffe, touffes (« x,y » en px) ; eau (celles du
// grand monde : lac, rivière, mer) ; E-13 : une cueillette (« sorte:case »).
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
  return EAUX_DU_MONDE.has(args.eau);
}

// I9a : le monde partagé est-il l'île entière (le chantier allumé pour la partie du monde) ? Sinon, la ferme
// seule (E-8).
export function ilePartagee(state) {
  return villageActif(state);
}

// Le mot d'un refus à la frontière (la commande vise hors de la ferme).
export const HORS_FERME = 'Hors de la ferme : en ligne, le monde partagé, c\'est la ferme.';
export const HORS_FERME_ILE = 'Hors de la ferme, rien d\'autre n\'est encore synchronisé : ce geste viendra bientôt en ligne.';
export function refusFrontiere(state, args) {
  if (!commandeHorsDeLaFerme(state, args)) return null;
  return ilePartagee(state) ? HORS_FERME_ILE : HORS_FERME;
}
