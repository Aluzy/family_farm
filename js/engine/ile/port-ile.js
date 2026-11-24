/* js/engine/ile/port-ile.js — le port de l'île : un ponton et sa halle (docs/ile-300.md, « Le port »).

   Le bloc du port (ILE.VILLAGE.PORT, « Comptoir du port ») se pose sur une case de la rive : elle devient la culée
   d'un ponton de 2 cases de large et LONG de long, qui part vers la mer (le jeu choisit le sens : là où il y a de
   l'eau), et d'une halle ouverte de 3 × 3 cases, sur la terre, accolée au pied du ponton (d'un côté ou de l'autre :
   celui où elle tient). Dans la halle, au milieu, le comptoir (3 cases) ; ses quatre poteaux aux coins.
     - le sens : 'S', 'N', 'E' ou 'O' ; le côté de la halle : -1 (à gauche ou au-dessus du ponton) ou 1 ;
       state.portIle = { case, sens, cote } (posé avec le bloc, ôté avec lui) ;
     - les cases du ponton sur l'eau s'ouvrent à la marche ; les poteaux et le comptoir la ferment ; toutes ses
       cases sont prises (rien d'autre ne s'y pose, rien n'y pousse : blocs.js casesCouvertes) ;
     - le dessin : js/carte/ferme/port-ile.js (assets/port_ile.png, scripts/carte/port_ile.py). */

import { BIOMES, SOL_BIOME } from './reglages.js';
import { ileDeLaPartie, estPartieIle } from './jeu.js';
import { DATA } from '../catalog.js';

export const LONG_PONTON = 8;
const SENS = { S: [0, 1], N: [0, -1], E: [1, 0], O: [-1, 0] };
const ORDRE = ['S', 'E', 'O', 'N'];

/**
 * Les cases du port dont la culée (la case gauche, ou du haut, du pied du ponton) est en `racine`, sur une île de
 * `n` de côté. → { ponton: [[k, case, case]…] (k : 0 la culée … LONG-1 le bout), halle: { x0, y0 }, halleCases,
 * poteaux, comptoir (ses 3 cases), devant (la case devant le comptoir), cases (toutes) } ou null (hors de l'île).
 * @param {number} n
 * @param {number} racine
 * @param {string} sens
 * @param {number} cote
 */
export function dispositionPortIle(n, racine, sens, cote) {
  const x = racine % n,
    y = Math.floor(racine / n),
    [dx, dy] = SENS[sens] || SENS.S;
  const vertical = dx === 0;
  const ix = (cx, cy) => (cx >= 0 && cy >= 0 && cx < n && cy < n ? cy * n + cx : -1);
  const ponton = [];
  for (let k = 0; k < LONG_PONTON; k++) {
    const a = ix(x + dx * k, y + dy * k),
      b = vertical ? ix(x + 1 + dx * k, y + dy * k) : ix(x + dx * k, y + 1 + dy * k);
    ponton.push([k, a, b]);
  }
  // la halle : à côté du pied, sur la terre (vers le sud : sa rangée du bas sur la rangée de la culée ; vers le
  // nord : sa rangée du haut ; vers l'est, sa colonne de droite sur celle de la culée ; vers l'ouest, sa gauche)
  let x0, y0;
  if (vertical) {
    x0 = cote < 0 ? x - 3 : x + 2;
    y0 = sens === 'S' ? y - 2 : y;
  } else {
    y0 = cote < 0 ? y - 3 : y + 2;
    x0 = sens === 'E' ? x - 2 : x;
  }
  const halleCases = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) halleCases.push(ix(x0 + c, y0 + r));
  const poteaux = [ix(x0, y0), ix(x0 + 2, y0), ix(x0, y0 + 2), ix(x0 + 2, y0 + 2)];
  const comptoir = [ix(x0, y0 + 1), ix(x0 + 1, y0 + 1), ix(x0 + 2, y0 + 1)];
  const cases = [...ponton.flatMap(([, a, b]) => [a, b]), ...halleCases];
  if (cases.some((t) => t < 0)) return null;
  return {
    sens,
    cote,
    racine,
    ponton,
    halle: { x0, y0 },
    halleCases,
    poteaux,
    comptoir,
    devant: ix(x0 + 1, y0 + 2),
    cases,
  };
}

/**
 * Où va le port posé en `racine` ? Le premier sens (sud, est, ouest, nord) où sa culée est sur la terre, les sept
 * autres travées du ponton sur la mer, et la halle sur la terre libre d'un côté ou de l'autre. → { sens, cote, d }
 * ou { raison }.
 * @param {object} ile
 * @param {number} racine
 * @param {(t: number) => boolean} libre une case de terre où bâtir (sans bloc, ni arbre, ni rocher)
 */
export function choisirPortIle(ile, racine, libre) {
  const n = ile.n,
    biome = (t) => BIOMES[SOL_BIOME[ile.sol[t]]];
  const terre = (t) => t >= 0 && biome(t) !== 'mer' && biome(t) !== 'lac';
  let raison =
    'Le port se pose au bord de la mer : la case touchée sur la rive, le ponton (2 × 8 cases) part vers le large.';
  for (const sens of ORDRE) {
    for (const cote of [-1, 1]) {
      const d = dispositionPortIle(n, racine, sens, cote);
      if (!d) continue;
      const pied = d.ponton[0];
      if (!terre(pied[1]) || !terre(pied[2])) continue;
      if (!d.ponton.slice(1).every(([, a, b]) => biome(a) === 'mer' && biome(b) === 'mer')) continue;
      if (!libre(pied[1]) || !libre(pied[2])) {
        raison = 'Le pied du ponton doit être libre : abats ou casse ce qui y est.';
        continue;
      }
      if (!d.halleCases.every((t) => terre(t) && libre(t))) {
        raison = 'La halle du port (3 × 3 cases) se pose sur la terre, à côté du pied du ponton : dégage la place.';
        continue;
      }
      return { sens, cote, d };
    }
  }
  return { raison };
}

/**
 * Le port posé de la partie : sa disposition, ou null.
 * @param {object} state
 */
export function portIle(state) {
  if (state && !state.portIle && !state.portIleRevu && estPartieIle(state)) rattraperPort(state);
  const p = state && state.portIle;
  if (!p || !estPartieIle(state) || !Number.isInteger(p.case)) return null;
  // (le bloc repris : plus de port)
  if (!state.blocs || state.blocs[p.case] !== DATA.ILE.VILLAGE.PORT) return null;
  const ile = ileDeLaPartie(state);
  return ile ? dispositionPortIle(ile.n, p.case, p.sens, p.cote) : null;
}

// Une partie d'avant le ponton (le comptoir seul, deux cases sur la rive) : son port prend la place qu'il trouve à
// sa case (ou à côté : la culée à sa droite, en dessous) ; sinon le comptoir reste tel quel. Une fois (portIleRevu).
function rattraperPort(state) {
  state.portIleRevu = true;
  const B = state.blocs || {},
    PORT = DATA.ILE.VILLAGE.PORT;
  const k = Object.keys(B).find((c) => B[c] === PORT);
  if (k === undefined) return;
  const ile = ileDeLaPartie(state);
  if (!ile) return;
  const t = Number(k),
    n = ile.n;
  const libre = (j) => !ile.bloque[j] && (j === t || (!B[j] && !(state.sols && state.sols[j])));
  for (const r of [t, t + 1, t - 1, t + n, t - n]) {
    const c = choisirPortIle(ile, r, libre);
    if (!c.d) continue;
    if (r !== t) {
      delete B[t];
      B[r] = PORT;
    }
    state.portIle = { case: r, sens: c.sens, cote: c.cote };
    return;
  }
}

/**
 * Les cases du port de l'île pour la marche : { ouvertes (le ponton sur l'eau), bloquees (les poteaux, le
 * comptoir), prises (toutes, la culée exceptée : celle du bloc) }, vides sans port.
 * @param {object} state
 */
export function casesPortIle(state) {
  const d = portIle(state);
  if (!d) return { ouvertes: [], bloquees: [], prises: [] };
  return {
    ouvertes: d.ponton.slice(1).flatMap(([, a, b]) => [a, b]),
    bloquees: [...d.poteaux, ...d.comptoir],
    prises: d.cases.filter((t) => t !== d.racine),
  };
}
