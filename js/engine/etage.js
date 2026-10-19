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
import { blocsEnMain, blocsPoses, changeMur, piecesCloses } from './blocs.js';
import { atelierOuvert } from './atelier.js';
import { farmTerrain } from './terrain.js';

// Les blocs qui se posent à l'étage.
export const ETAGE_BLOCS = ['mur_pierre', 'mur_fenetre', 'pierre_angle', 'porte', 'paillasse', 'lanterne', 'barriere'];

// Les blocs posés à l'étage : { [tuile]: sorte }.
export function etageBlocs(state) {
  return state.etage && typeof state.etage === 'object' ? state.etage : {};
}

// Les escaliers posés (leurs cases).
export function escaliers(state) {
  return Object.entries(blocsPoses(state)).filter(([, s]) => s === 'escalier').map(([t]) => Number(t));
}

// L'emprise de l'étage : les cases des pièces closes où un escalier est posé, et les murs et
// les portes qui les bordent (les huit voisines). Un Set de tuiles.
export function etageEmprise(state) {
  const out = new Set();
  if (!atelierOuvert(state)) return out;
  const B = blocsPoses(state), W = farmTerrain(state).LARGEUR;
  for (const p of piecesCloses(state)) {
    if (!p.cases.some((t) => B[t] === 'escalier')) continue;
    for (const t of p.cases) {
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
