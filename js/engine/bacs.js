import { DATA } from './catalog.js';
import { randomInt } from './base.js';
import { fail } from './devices.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { gainActionXp } from './levels.js';
import { canAfford, spendEnergy, TIRED } from './stamina.js';
import { hasTool } from './outils.js';

/* ---------- les bacs à fleurs (le lot 2 des évolutions du crafting) ----------
   Trois formes, fabriquées à l'Atelier et posées dehors comme des blocs (data/recipes.json,
   ATELIER.BLOCS.<id>.bac : « rond », « carre », « long » sur deux cases ; leur image : dessin, assets/bacs.png).
   Une espèce de fleur par bac (DATA.BACS.FLEURS) : une graine semée fleurit en DATA.BACS.NUITS nuits, sans
   arrosage ; la faux y coupe DATA.BACS.RECOLTE fleurs, puis le bac refleurit en autant de nuits, sans resemer
   (des vivaces). Repeindre un bac : ses couleurs (ATELIER.BLOCS.<id>.peinture, data/meubles.json PEINTURES ;
   js/engine/blocs.js, peindreBloc), gratuites.

   state.bacs = { [case d'ancrage]: { fleur, nuits, coupe? } } : l'espèce semée, les nuits passées depuis le
   semis ou la dernière coupe (au plus NUITS), coupe : déjà coupé une fois (il repousse de ses tiges, sans
   repasser par la graine). Un bac vide n'y est pas. */

function bacsEtat(state) {
  if (!state.bacs || typeof state.bacs !== 'object' || Array.isArray(state.bacs)) state.bacs = {};
  return state.bacs;
}

// La forme du bac `sorte` (« rond », « carre », « long »), ou null : ce n'est pas un bac.
export function formeBac(sorte) {
  const b = DATA.ATELIER.BLOCS[sorte];
  return (b && b.bac) || null;
}

// Les cases d'ancrage des bacs posés.
export function bacsPoses(state) {
  const B = state.blocs && typeof state.blocs === 'object' ? state.blocs : {};
  return Object.keys(B).filter((t) => formeBac(B[t])).map(Number);
}

// Ce qui pousse dans le bac de `tile` : { fleur, nuits, coupe } ou null (vide, ou pas de bac).
export function plantBac(state, tile) {
  const B = state.blocs || {}, p = state.bacs && state.bacs[tile];
  if (!formeBac(B[tile]) || !p || !DATA.BACS.FLEURS[p.fleur]) return null;
  return { fleur: p.fleur, nuits: Math.min(DATA.BACS.NUITS, p.nuits | 0), coupe: !!p.coupe };
}

// L'étape du bac de `tile` : null (vide), 0 (semé), 1 (les pousses), 2 (les boutons), 3 (en fleurs).
export function etapeBac(state, tile) {
  const p = plantBac(state, tile);
  if (!p) return null;
  const N = DATA.BACS.NUITS;
  if (p.nuits >= N) return 3;
  // (trois nuits : semé, pousses, boutons ; coupé, il repart de ses pousses)
  const e = Math.floor((p.nuits * 3) / N);
  return p.coupe ? Math.max(1, e) : e;
}

export function bacFleuri(state, tile) {
  return etapeBac(state, tile) === 3;
}

// Les nuits qu'il reste avant que le bac de `tile` fleurisse (0 : en fleurs), ou null (vide).
export function nuitsAvantFleurs(state, tile) {
  const p = plantBac(state, tile);
  return p ? Math.max(0, DATA.BACS.NUITS - p.nuits) : null;
}

// Les graines de fleurs que le joueur a : [{ fleur, graine, nom, n }] (toutes les espèces, n = 0 compris).
export function grainesDeFleurs(state) {
  return Object.entries(DATA.BACS.FLEURS).map(([fleur, f]) => ({ fleur, graine: f.graine, nom: f.nom, n: countItem(state, f.graine) }));
}

// Semer l'espèce `fleur` dans le bac vide de `tile` : une graine prise, de l'énergie et de l'XP (planter).
export function semerBac(state, tile, fleur) {
  const sorte = (state.blocs || {})[tile];
  if (!formeBac(sorte)) return fail('Il n\'y a pas de bac à fleurs ici.');
  const F = DATA.BACS.FLEURS[fleur];
  if (!F) return fail('Cette fleur ne se sème pas en bac.');
  if (plantBac(state, tile)) return fail('Ce bac est déjà semé : une seule espèce par bac.');
  if (countItem(state, F.graine) < 1) return fail(`Il te faut des ${DATA.OBJETS[F.graine].nom.toLowerCase()} : on en trouve en cueillant les fleurs sauvages.`);
  if (!canAfford(state, 'planter')) return fail(TIRED);
  takeItem(state, F.graine, 1);
  bacsEtat(state)[tile] = { fleur, nuits: 0 };
  spendEnergy(state, 'planter');
  gainActionXp(state, 'planter');
  return { ok: true, case: tile, fleur, sorte };
}

// Couper les fleurs du bac de `tile` à la faux : RECOLTE fleurs dans l'inventaire, de l'énergie et de
// l'XP (faucher) ; le bac repart de ses pousses et refleurit en NUITS nuits.
export function recolterBac(state, tile) {
  const p = plantBac(state, tile);
  if (!p) return fail('Ce bac est vide : sème-y une graine de fleur.');
  if (!hasTool(state, 'faux')) return fail('Il faut la faux pour couper les fleurs (à fabriquer à l\'Atelier).');
  if (p.nuits < DATA.BACS.NUITS) return fail(`${DATA.BACS.FLEURS[p.fleur].nom} : pas encore en fleurs.`);
  if (!canAfford(state, 'faucher')) return fail(TIRED);
  const [a, b] = DATA.BACS.RECOLTE, n = randomInt(state, a, b), item = DATA.BACS.FLEURS[p.fleur].fleur;
  addItem(state, item, n);
  bacsEtat(state)[tile] = { fleur: p.fleur, nuits: 0, coupe: true };
  spendEnergy(state, 'faucher');
  gainActionXp(state, 'faucher');
  return { ok: true, case: tile, fleur: p.fleur, items: { [item]: n } };
}

// Le bac de `tile` est repris (js/engine/blocs.js, reprendreBloc) : ce qui y poussait s'en va. Renvoie
// ce qui y poussait (deplacerBloc le remet là où il est reposé), ou null.
export function bacRepris(state, tile) {
  const p = state.bacs && state.bacs[tile];
  if (state.bacs) delete state.bacs[tile];
  return p && typeof p === 'object' ? { ...p } : null;
}

// (deplacerBloc : le bac reposé sur `tile` garde ce qui y poussait)
export function bacReplante(state, tile, p) {
  if (p && DATA.BACS.FLEURS[p.fleur]) bacsEtat(state)[tile] = { ...p };
}

// Étape nocturne : chaque bac semé avance d'une nuit (en fleurs, il attend la faux). Ce qui ne
// correspond plus à un bac posé s'en va.
export function pousserBacs(state) {
  const poses = new Set(bacsPoses(state)), E = bacsEtat(state);
  for (const t of Object.keys(E)) {
    if (!poses.has(Number(t)) || !E[t] || !DATA.BACS.FLEURS[E[t].fleur]) { delete E[t]; continue; }
    E[t].nuits = Math.min(DATA.BACS.NUITS, (E[t].nuits | 0) + 1);
  }
}

// Les bacs en fleurs, pour les abeilles (js/engine/ruches.js, fleursPourAbeilles) : leurs cases (le bac
// long : ses deux cases).
export function bacsFleuris(state) {
  const out = [];
  for (const t of bacsPoses(state)) {
    if (!bacFleuri(state, t)) continue;
    const l = DATA.ATELIER.BLOCS[state.blocs[t]].largeur || 1;
    for (let i = 0; i < l; i++) out.push(t + i);
  }
  return out;
}

// L'image du bac posé sur `tile` (assets/bacs.png, js/carte/ferme/config.js BACS) : « bac_<forme>_vide »,
// « _semis » (semé), « _<fleur>_1 » (pousses), « _<fleur>_2 » (boutons), « _<fleur> » (en fleurs).
export function dessinBac(state, tile) {
  const forme = formeBac((state.blocs || {})[tile]), e = etapeBac(state, tile);
  if (!forme) return null;
  if (e === null) return `bac_${forme}_vide`;
  if (e === 0) return `bac_${forme}_semis`;
  const f = plantBac(state, tile).fleur;
  return e === 3 ? `bac_${forme}_${f}` : `bac_${forme}_${f}_${e}`;
}
