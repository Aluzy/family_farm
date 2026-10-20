// etage.js — un essai : l'escalier et le deuxième niveau (l'étage) au-dessus d'une pièce close.
//
// L'escalier (BLOCS escalier, fabriqué à l'Atelier) se pose dans une pièce close. Au-dessus de
// cette pièce et de ses murs (l'emprise : etageEmprise), il y a un étage : un plancher sur toute
// l'emprise, où l'on monte par l'escalier (la carte : js/carte/ferme/etage.js) et où l'on pose
// d'autres blocs (ETAGE_BLOCS : des murs, des portes, une paillasse, une lanterne, une
// barrière ; ils n'ont pas d'autre effet que d'être là et d'arrêter le passage). Une case de
// l'emprise est libre : celle de l'escalier (on y redescend).
//
// state.etage = { [tuile]: sorte } : les blocs posés à l'étage. Une pièce qui perd son escalier
// (ou qui s'ouvre) perd son étage : ses blocs reviennent dans l'inventaire (rangerEtage).

import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { addItem, takeItem } from './inventory.js';
import { blocsEnMain, blocsPoses, changeMur, genreBloc, hauteurMur, piecesCloses, solsPoses } from './blocs.js';
import { atelierOuvert } from './atelier.js';
import { farmTerrain } from './terrain.js';

// Les blocs qui se posent à l'étage.
export const ETAGE_BLOCS = ['mur_pierre', 'mur_fenetre', 'pierre_angle', 'paroi_vitree', 'mur_brique_rouge', 'mur_brique_orange', 'mur_brique_ocre', 'mur_brique_bleue', 'mur_pierre_taille', 'porte', 'paillasse', 'lanterne', 'barriere'];

// Les blocs posés à l'étage : { [tuile]: sorte }.
export function etageBlocs(state) {
  return state.etage && typeof state.etage === 'object' ? state.etage : {};
}

// Les escaliers posés (leurs cases).
export function escaliers(state) {
  return Object.entries(blocsPoses(state)).filter(([, s]) => s === 'escalier').map(([t]) => Number(t));
}

// Une pièce close et les blocs qui ferment autour d'elle (les huit voisines) : un Set de tuiles.
function avecMurs(state, cases) {
  const out = new Set(), B = blocsPoses(state), W = farmTerrain(state).LARGEUR;
  for (const t of cases) {
    out.add(t);
    const c = t % W;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (c + dx < 0 || c + dx >= W) continue;
        const j = t + dy * W + dx, s = DATA.ATELIER.BLOCS[B[j]];
        if (s && s.ferme) out.add(j);
      }
    }
  }
  return out;
}

// L'emprise de l'étage : les cases des pièces closes où un escalier est posé, et les murs et
// les portes qui les bordent (les huit voisines). Un Set de tuiles.
export function etageEmprise(state) {
  const out = new Set();
  if (!atelierOuvert(state)) return out;
  const B = blocsPoses(state);
  for (const p of piecesCloses(state)) {
    if (!p.cases.some((t) => B[t] === 'escalier')) continue;
    for (const t of avecMurs(state, p.cases)) out.add(t);
  }
  return out;
}

// Les toits : chaque bâtiment (une pièce close aménagée : un bloc qui en fait une maison ou un
// bâtiment, un plancher ou un escalier) a le sien, posé sur son dernier niveau. Une pièce close
// sans rien de tout ça reste à ciel ouvert : une cour, un passage enfermé entre les murs de
// bâtiments voisins.
//   - une pièce sans escalier : sur ses murs (niveau 0 ; ses murs rehaussés, version 1.25 : un
//     niveau de plus par bloc du plus bas d'entre eux, la tour du Moulin) ;
//   - une pièce à escalier : sur les murs de l'étage, au-dessus de ce qu'ils ferment dans
//     l'emprise (niveau 1) ; un étage sans murs tout autour reste à ciel ouvert (une terrasse).
// [{ niveau, cases: [tuiles couvertes], dedans: [tuiles d'où l'on est dans le bâtiment], verre (la Serre) }]
export function toits(state) {
  if (!atelierOuvert(state)) return [];
  const B = blocsPoses(state), E = etageBlocs(state), W = farmTerrain(state).LARGEUR;
  const ferme = (t) => { const s = DATA.ATELIER.BLOCS[E[t]]; return !!(s && s.ferme); };
  const out = [], S = solsPoses(state);
  for (const p of piecesCloses(state)) {
    if (!p.cases.some((t) => genreBloc(B[t]) || S[t] || B[t] === 'escalier')) continue;   // (une cour)
    const emprise = avecMurs(state, p.cases), tri = (a) => [...a].sort((x, y) => x - y);
    // (la Serre, la pièce du bac à semis : un toit de verre, on voit ce qui pousse dessous)
    const verre = p.cases.some((t) => B[t] === 'bac_semis');
    if (!p.cases.some((t) => B[t] === 'escalier')) {
      const hauts = [...emprise].map((t) => hauteurMur(state, t)).filter((h) => h > 0);
      out.push({ niveau: hauts.length ? Math.min(...hauts) - 1 : 0, cases: tri(emprise), dedans: tri(emprise), verre });
      continue;
    }
    // à l'étage : les cases libres de l'emprise qu'on ne rejoint pas depuis son bord
    const voisins = (t) => { const c = t % W; return [c > 0 ? t - 1 : -1, c < W - 1 ? t + 1 : -1, t - W, t + W]; };
    const libre = (t) => emprise.has(t) && !ferme(t);
    const ouvert = new Set(), pile = [];
    for (const t of emprise) if (libre(t) && voisins(t).some((j) => !emprise.has(j))) { ouvert.add(t); pile.push(t); }
    while (pile.length) for (const j of voisins(pile.pop())) if (libre(j) && !ouvert.has(j)) { ouvert.add(j); pile.push(j); }
    const vus = new Set();
    for (const t of emprise) {
      if (!libre(t) || ouvert.has(t) || vus.has(t)) continue;
      const zone = [t], cases = new Set();
      vus.add(t);
      for (let i = 0; i < zone.length; i++) {
        const k = zone[i], c = k % W;
        cases.add(k);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (c + dx < 0 || c + dx >= W) continue;
            const j = k + dy * W + dx;
            if (ferme(j) && emprise.has(j)) cases.add(j);
          }
        }
        for (const j of voisins(k)) if (libre(j) && !vus.has(j)) { vus.add(j); zone.push(j); }
      }
      out.push({ niveau: 1, cases: tri(cases), dedans: tri(emprise), verre });
    }
  }
  return out;
}

// Peut-on poser `sorte` à l'étage, sur `tile` ? { ok, raison }
export function poseEtageStatus(state, sorte, tile) {
  const s = DATA.ATELIER.BLOCS[sorte];
  if (!s || !ETAGE_BLOCS.includes(sorte)) return { ok: false, raison: `${s ? s.nom : 'Ce bloc'} : ne se pose pas à l'étage.` };
  if (!etageEmprise(state).has(tile)) return { ok: false, raison: 'À l\'étage, on ne bâtit qu\'au-dessus d\'une pièce close qui a un escalier.' };
  if (blocsPoses(state)[tile] === 'escalier') return { ok: false, raison: 'Ici, c\'est le haut de l\'escalier.' };
  if (etageBlocs(state)[tile] && !changeMur(etageBlocs(state)[tile], sorte)) return { ok: false, raison: 'Il y a déjà un bloc ici.' };
  if (blocsEnMain(state, sorte) < 1) return { ok: false, raison: `Plus de ${s.nom.toLowerCase()} : fabrique-en à l'Atelier.` };
  return { ok: true };
}

export function poserEtage(state, sorte, tile) {
  const st = poseEtageStatus(state, sorte, tile);
  if (!st.ok) return fail(st.raison);
  takeItem(state, DATA.ATELIER.BLOCS[sorte].objet, 1);
  // un mur changé (une fenêtre à la place d'un mur en pierre) : l'ancien revient
  const ancien = etageBlocs(state)[tile];
  if (ancien) addItem(state, DATA.ATELIER.BLOCS[ancien].objet, 1);
  if (!state.etage || typeof state.etage !== 'object') state.etage = {};
  state.etage[tile] = sorte;
  return ancien ? { ok: true, sorte, case: tile, etage: true, remplace: ancien } : { ok: true, sorte, case: tile, etage: true };
}

// Reprend le bloc de l'étage posé sur `tile` : son objet revient dans l'inventaire.
export function reprendreEtage(state, tile) {
  const sorte = etageBlocs(state)[tile];
  if (!sorte) return fail('Il n\'y a pas de bloc ici.');
  delete state.etage[tile];
  addItem(state, DATA.ATELIER.BLOCS[sorte].objet, 1);
  return { ok: true, sorte, case: tile, etage: true };
}

// Les blocs de l'étage qui ne sont plus au-dessus d'une pièce à escalier reviennent dans
// l'inventaire. Renvoie leur nombre.
export function rangerEtage(state) {
  const E = etageBlocs(state);
  const tiles = Object.keys(E);
  if (!tiles.length) return 0;
  const emprise = etageEmprise(state);
  let n = 0;
  for (const k of tiles) {
    if (emprise.has(Number(k)) && blocsPoses(state)[k] !== 'escalier') continue;
    addItem(state, DATA.ATELIER.BLOCS[E[k]].objet, 1);
    delete E[k];
    n += 1;
  }
  return n;
}
