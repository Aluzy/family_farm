/* ==========================================================================
   Le didacticiel de l'île (le chantier « l'île à bâtir », fiche I7b ; docs/ile.md). Les étapes : VILLAGE.DEPART.ETAPES
   (data/village.json), dans l'ordre : ramasser des pierres et du bois, bâtir l'Atelier, la houe, labourer, semer, le
   puits et la cruche, arroser, la première récolte, la charger (le portage), suivre le chemin jusqu'au port, vendre au comptoir, acheter des
   graines, bâtir une maison libre, accueillir le premier villageois, lui donner une tâche. Une ligne chacune, sans
   discours : la bulle et la flèche sont dans js/ui/didacticiel-ile.js.

   Chaque étape a son but (BUTS : ce qui doit être vrai, lu dans la partie : un état ou un compteur qui ne redescend
   pas) ; une étape dont le but est atteint, maintenant ou avant, passe d'elle-même (majDidacticielIle, à chaque rendu
   de la page et à chaque nuit). Chacune se passe (passerEtapeIle), le tout aussi (passerDidacticielIle) : rien ne
   bloque, et rien n'empêche de jouer pendant qu'une étape attend (la récolte qui mûrit, le bac qui passe tous les
   trois jours). En arrivant à l'étape du chemin, la boussole montre le port (si elle ne montre rien d'autre).

   state.didacticielIle = { etape (l'indice dans ETAPES), fini, passees ([les id des étapes passées sans être faites]) } ;
   une partie d'avant n'en a pas (elle garde ses objectifs du jour seuls).
   ========================================================================== */

import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { countItem } from './inventory.js';
import { atelierConstruit } from './atelier.js';
import { hasHoe, soilCount } from './crops.js';
import { aCruche, puitsPose } from './cruche.js';
import { butBoussole, choisirBut } from './monde-vu.js';
import { distanceAuComptoir } from './port.js';
import { chargeDe } from './portage.js';
import { maisonsLibres, villageoisDe } from './villageois.js';
import { villageActif } from './village.js';

const D = () => DATA.VILLAGE.DEPART;
export const ETAPES_ILE = () => D().ETAPES.map((e) => e.id);
const compteurs = (s) => (s.campagne && s.campagne.compteurs) || {};
const loges = (s) => villageoisDe(s).filter((v) => v && v.maison !== null && v.maison !== undefined);

// Le but de chaque étape : vrai quand il est atteint (et il le reste).
const BUTS = {
  ramasser: (s) => atelierConstruit(s) || (countItem(s, 'pierre') >= DATA.ATELIER.CONSTRUCTION.pierre && countItem(s, 'bois') >= DATA.ATELIER.CONSTRUCTION.bois),
  atelier: (s) => atelierConstruit(s),
  houe: (s) => hasHoe(s),
  labour: (s) => (compteurs(s).labours || 0) >= DATA.DIDACTICIEL.LABOURS || soilCount(s) >= DATA.DIDACTICIEL.LABOURS,
  semis: (s) => (compteurs(s).semis || 0) >= 1 || s.potager.parcelles.some((p) => p.culture),
  cruche: (s) => puitsPose(s) && aCruche(s),
  arroser: (s) => (compteurs(s).arroseesMax || 0) >= 1 || s.potager.parcelles.some((p) => p.culture && p.arrose),
  recolte: (s) => (compteurs(s).recoltes || 0) >= 1,
  charger: (s) => (compteurs(s).ventesPort || 0) > 0 || Object.keys(chargeDe(s)).length > 0,
  port: (s) => (compteurs(s).ventesPort || 0) > 0 || distanceAuComptoir(s, s.monde && s.monde.ici) <= D().PORT,
  vendre: (s) => (compteurs(s).ventesPort || 0) > 0,
  graines: (s) => (compteurs(s).achatsPort || 0) > 0,
  maison: (s) => maisonsLibres(s).length > 0 || loges(s).length > 0,
  villageois: (s) => loges(s).length > 0,
  tache: (s) => villageoisDe(s).some((v) => v && v.tache),
};
export const BUTS_ILE = Object.keys(BUTS);

export function didacticielIleActif(state) {
  const d = state && state.didacticielIle;
  return !!(d && !d.fini && villageActif(state));
}

// L'étape en cours : { id, icone, ligne, n (1, 2…), total }, ou null.
export function etapeIle(state) {
  if (!didacticielIleActif(state)) return null;
  const L = D().ETAPES, k = state.didacticielIle.etape, e = L[k];
  return e ? { ...e, n: k + 1, total: L.length } : null;
}

// Le but de l'étape `id` est-il atteint ?
export function butIleAtteint(state, id) {
  return !!(BUTS[id] && BUTS[id](state));
}

// Une partie neuve du chantier : le didacticiel commence à la première étape.
export function commencerDidacticielIle(state) {
  state.didacticielIle = { etape: 0, fini: false, passees: [] };
  majDidacticielIle(state);
  return { ok: true };
}

// Arriver à l'étape en cours : l'étape du chemin mène la boussole au port (si elle ne montre rien d'autre).
function entrer(state) {
  const e = etapeIle(state);
  if (e && e.id === 'port' && state.monde && !butBoussole(state)) choisirBut(state, { sorte: 'port', id: 'port' });
}

function avancer(state) {
  const d = state.didacticielIle;
  d.etape += 1;
  if (d.etape >= D().ETAPES.length) { d.fini = true; return; }
  entrer(state);
}

// Après chaque changement : tant que le but de l'étape en cours est atteint, la suivante. → les étapes faites ([id]).
export function majDidacticielIle(state) {
  const faites = [];
  for (let k = 0; k <= D().ETAPES.length && didacticielIleActif(state); k++) {
    const e = etapeIle(state);
    if (!e || !butIleAtteint(state, e.id)) break;
    faites.push(e.id);
    avancer(state);
  }
  return faites;
}

// « Passer » : l'étape en cours est laissée (elle ne bloque jamais).
export function passerEtapeIle(state) {
  const e = etapeIle(state);
  if (!e) return fail('Le didacticiel est terminé.');
  state.didacticielIle.passees = [...(state.didacticielIle.passees || []), e.id];
  avancer(state);
  majDidacticielIle(state);
  return { ok: true, etape: etapeIle(state) };
}

// « Passer le didacticiel » : tout s'arrête.
export function passerDidacticielIle(state) {
  if (!didacticielIleActif(state)) return fail('Le didacticiel est terminé.');
  state.didacticielIle.fini = true;
  return { ok: true };
}
