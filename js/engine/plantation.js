import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { countItem } from './inventory.js';
import { poserBloc, poseStatus } from './blocs.js';
import { farmTerrain, tileCount } from './terrain.js';

/* ---------- planter un arbre depuis l'Inventaire ----------
   Une graine d'arbre (la pomme de pin, le gland) ou un jeune arbre fruitier se plante depuis
   sa fiche de l'Inventaire (« Planter ») : la carte montre en surbrillance les cases où il peut
   aller (casesAPlanter, autour du personnage), le joueur en touche une, confirme, et l'arbre y
   est planté (planterIci : comme un bloc posé, js/engine/blocs.js, qui ne reste pas un bloc). */

// La sorte de bloc à planter pour l'objet `item` (une graine d'arbre, un jeune arbre), ou null.
export function sorteAPlanter(item) {
  const B = DATA.ATELIER.BLOCS;
  return Object.keys(B).find((s) => B[s].objet === item && (B[s].semis || B[s].arbre)) || null;
}

// Les sortes à planter (elles ne sont plus dans le menu Construire).
export function sortesAPlanter() {
  const B = DATA.ATELIER.BLOCS;
  return Object.keys(B).filter((s) => B[s].semis || B[s].arbre);
}

// Les cases où planter `sorte`, à au plus `rayon` cases de `centre` (en ligne ou en colonne).
export function casesAPlanter(state, sorte, centre, rayon) {
  const T = farmTerrain(state), W = T.LARGEUR, n = tileCount(T);
  if (!Number.isInteger(centre) || centre < 0 || centre >= n) return [];
  const r0 = Math.floor(centre / W), c0 = centre % W, out = [];
  for (let r = Math.max(0, r0 - rayon); r <= Math.min(T.HAUTEUR - 1, r0 + rayon); r++) {
    for (let c = Math.max(0, c0 - rayon); c <= Math.min(W - 1, c0 + rayon); c++) {
      if (poseStatus(state, sorte, r * W + c).ok) out.push(r * W + c);
    }
  }
  return out;
}

// Plante `sorte` sur la case `tile` (la graine ou le jeune arbre quitte l'inventaire).
export function planterIci(state, sorte, tile) {
  const s = DATA.ATELIER.BLOCS[sorte];
  if (!s || !(s.semis || s.arbre)) return fail('Ce n\'est pas un arbre à planter.');
  if (countItem(state, s.objet) < 1) return fail(`Plus de ${DATA.OBJETS[s.objet].nom.toLowerCase()} dans l'inventaire.`);
  return poserBloc(state, sorte, tile);
}
