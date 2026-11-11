import { DATA } from './catalog.js';
import { randomInt } from './base.js';
import { fail } from './devices.js';
import { addItem } from './inventory.js';
import { gainActionXp } from './levels.js';
import { canAfford, spendEnergy, TIRED } from './stamina.js';

/* ---------- les massifs de fleurs semés dans l'herbe de la ferme ----------
   Une graine de fleur (les espèces des bacs, DATA.BACS.FLEURS) se plante depuis sa fiche de l'Inventaire, comme une
   graine d'arbre (js/engine/plantation.js, js/ui/plantation.js) : sur n'importe quelle case d'herbe libre, dehors
   (ATELIER.BLOCS.massif_<espèce>, js/engine/blocs.js poseStatus). Un petit massif de trois pieds y pousse : il fleurit
   en DATA.MASSIFS.NUITS nuits, sans arrosage ; un appui le cueille à la main (CUEILLETTE fleurs, une graine GRAINE fois
   sur cent), puis il repart de ses pousses et refleurit en autant de nuits, sans resemer (une vivace). En fleurs, il
   attire les abeilles des ruches (js/engine/ruches.js). Sur la carte : les fleurs sauvages du grand monde
   (DATA.MASSIFS.DESSIN ; js/carte/ferme/cueillette.js, syncMassifs).

   state.massifs = { [case]: { fleur, nuits, cueilli? } } : l'espèce, les nuits passées depuis le semis ou la dernière
   cueillette (au plus NUITS), cueilli : déjà cueilli une fois (il repart de ses pousses). */

function massifsEtat(state) {
  if (!state.massifs || typeof state.massifs !== 'object' || Array.isArray(state.massifs)) state.massifs = {};
  return state.massifs;
}

// Le massif de la case `tile` : { fleur, nuits, cueilli } ou null.
export function massifSurCase(state, tile) {
  const p = state.massifs && state.massifs[tile];
  if (!p || !DATA.BACS.FLEURS[p.fleur]) return null;
  return { fleur: p.fleur, nuits: Math.min(DATA.MASSIFS.NUITS, p.nuits | 0), cueilli: !!p.cueilli };
}

// Les cases des massifs.
export function casesMassifs(state) {
  return Object.keys(state.massifs && typeof state.massifs === 'object' ? state.massifs : {}).map(Number);
}

// L'étape du massif de `tile` : null (pas de massif), 0 (semé), 1 (les pousses), 2 (les boutons), 3 (en fleurs).
export function etapeMassif(state, tile) {
  const p = massifSurCase(state, tile);
  if (!p) return null;
  const N = DATA.MASSIFS.NUITS;
  if (p.nuits >= N) return 3;
  const e = Math.floor((p.nuits * 3) / N);
  return p.cueilli ? Math.max(1, e) : e;
}

// Semer l'espèce `fleur` sur `tile` (blocs.js, poserBloc, a vérifié la place et pris la graine ; comme une graine
// d'arbre, sans énergie).
export function semerMassif(state, tile, fleur) {
  massifsEtat(state)[tile] = { fleur, nuits: 0 };
  return { fleur, case: tile };
}

// Cueillir le massif en fleurs de `tile` : CUEILLETTE fleurs, parfois une graine ; il repart de ses pousses.
export function cueillirMassif(state, tile) {
  const p = massifSurCase(state, tile);
  if (!p) return fail('Il n\'y a pas de fleurs semées ici.');
  const F = DATA.BACS.FLEURS[p.fleur], M = DATA.MASSIFS;
  if (p.nuits < M.NUITS) return fail(`${F.nom} : pas encore en fleurs (${M.NUITS - p.nuits} nuit${M.NUITS - p.nuits > 1 ? 's' : ''}).`);
  if (!canAfford(state, 'ramasser')) return fail(TIRED);
  const items = { [F.fleur]: randomInt(state, M.CUEILLETTE[0], M.CUEILLETTE[1]) };
  if (randomInt(state, 1, 100) <= M.GRAINE) items[F.graine] = 1;
  for (const [k, n] of Object.entries(items)) addItem(state, k, n);
  massifsEtat(state)[tile] = { fleur: p.fleur, nuits: 0, cueilli: true };
  spendEnergy(state, 'ramasser');
  gainActionXp(state, 'ramasser');
  return { ok: true, case: tile, fleur: p.fleur, items };
}

// Étape nocturne : chaque massif avance d'une nuit (en fleurs, il attend d'être cueilli).
export function pousserMassifs(state) {
  const E = massifsEtat(state);
  for (const t of Object.keys(E)) {
    if (!E[t] || !DATA.BACS.FLEURS[E[t].fleur]) { delete E[t]; continue; }
    E[t].nuits = Math.min(DATA.MASSIFS.NUITS, (E[t].nuits | 0) + 1);
  }
}

// Les massifs en fleurs (leurs cases), pour les abeilles.
export function massifsFleuris(state) {
  return casesMassifs(state).filter((t) => etapeMassif(state, t) === 3);
}

// Pour la carte : [{ case, fleur, etape, dessin }] (dessin : la fleur sauvage du grand monde qui le dessine).
export function massifsCarte(state) {
  return casesMassifs(state).map((t) => ({ case: t, fleur: state.massifs[t].fleur, etape: etapeMassif(state, t), dessin: DATA.MASSIFS.DESSIN[state.massifs[t].fleur] })).filter((m) => m.etape !== null);
}
