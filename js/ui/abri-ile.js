/* ui/abri-ile.js — l'abri sur l'île de 300 × 300 (docs/ile-300.md) : là où l'on dort, que montrent la boussole
 * (js/ui/stage.js, js/carte/ferme/boussole.js) et la carte de l'île (js/ui/carte-monde.js).
 *
 * La maison (la porte d'une pièce close qui a des paillasses), sinon la tente posée, sinon le point d'apparition.
 */
import { blocsPoses, piecesCloses } from '../engine/blocs.js';
import { DATA } from '../engine/catalog.js';
import { ileDeLaPartie } from '../engine/ile/jeu.js';

/**
 * @param {object} state
 * @returns {{ case: number, nom: string, icone: string } | null}
 */
export function abriDeLIle(state) {
  const ile = ileDeLaPartie(state);
  if (!ile) return null;
  const maison = piecesCloses(state).find((q) => q.paillasses.length && q.portes.length);
  if (maison) return { case: maison.portes[0], nom: 'La maison', icone: '🏠' };
  const B = DATA.ATELIER.BLOCS;
  const tente = Object.entries(blocsPoses(state)).find(([, s]) => B[s] && B[s].tente);
  if (tente) return { case: Number(tente[0]), nom: 'La tente', icone: '⛺' };
  const A = ile.apparition;
  return A ? { case: A.y * ile.n + A.x, nom: 'Le point d’arrivée', icone: '🚩' } : null;
}
