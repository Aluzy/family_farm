/* ---------- l'icône d'un bloc (le menu Construire, l'Atelier) ----------
   Celle de son objet ; un meuble : son dessin ; une machine des chaînes de production : son dessin de
   la carte ; l'Atelier : la sienne. Le menu Construire (js/ui/chantier.js) et l'Atelier
   (js/ui/atelier.js, les recettes qui donnent un bloc) montrent la même. */
import { DATA } from '../engine/catalog.js';
import { meubleSrc } from './caleche.js';

// Une machine des chaînes de production (l'onglet Machines, sauf l'Atelier) : son dessin de la carte (une
// case de 16 × 24 de assets/blocs.png, à l'arrêt : BLOCS_CARTE de js/carte/ferme/config.js), plutôt que son
// icône (deux émojis collés, qui débordaient sur les cases voisines). '' : pas une machine, ou la carte absente.
function dessinMachine(sorte) {
  const cat = DATA.ATELIER.CATEGORIES && DATA.ATELIER.CATEGORIES.machines;
  if (sorte === 'atelier' || !cat || !(cat.blocs || []).includes(sorte)) return '';
  const C = typeof window !== 'undefined' && window.FermeCarte && window.FermeCarte.C;
  const f = C && C.BLOCS_CARTE && C.BLOCS_CARTE.frames[sorte];
  if (typeof f !== 'number') return '';
  const v = window.FERME_ASSET_VERSIONS && window.FERME_ASSET_VERSIONS['blocs.png'];
  return `<span class="build-slot-dessin" style="--f:${f};background-image:url('assets/blocs.png${v ? `?v=${v}` : ''}')"></span>`;
}

// L'icône du bloc `sorte` (du HTML).
export function iconeBloc(sorte) {
  const b = DATA.ATELIER.BLOCS[sorte];
  const machine = dessinMachine(sorte);
  if (machine) return machine;
  if (b.meuble) return `<img class="build-slot-img" src="${meubleSrc(b.meuble)}" alt="" draggable="false">`;
  // (le four redessiné : son dessin, éteint)
  if (b.dessin === 'four') return `<img class="build-slot-img" src="${meubleSrc('four')}" alt="" draggable="false">`;
  return b.objet ? DATA.OBJETS[b.objet].icone : DATA.ATELIER.ICONE;
}
