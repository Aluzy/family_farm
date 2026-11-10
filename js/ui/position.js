/* ---------- où était le personnage (la carte de la ferme) ----------
   Quand on quitte la partie et qu'on la reprend, ou qu'on recharge la page, le personnage réapparaît là où il
   était, et non plus devant sa porte. La carte note sa position (js/carte/ferme/passages.js stepPosition :
   ses pieds, en px de la carte ; au plus une fois par seconde, quand il bouge), ici, sur l'appareil, avec la
   graine de la partie ; elle l'y remet en se créant (makeRetour). Rien de noté (null) : il est rentré chez lui,
   ou à l'étage ; il repart alors de sa porte, comme avant. Une autre partie (une autre graine) ne le reprend
   pas. */
import { farmSeed } from '../engine/terrain.js';
import { state } from './store.js';
import { safeStorageGet, safeStorageSet } from './storage.js';

const CLE = 'ferme-position';
let derniere = null;   // (la dernière valeur écrite : on n'écrit que ce qui change)

// La position notée pour cette partie : { x, y }, ou null.
export function positionGardee() {
  try {
    const p = JSON.parse(safeStorageGet(CLE) || 'null');
    const g = state ? farmSeed(state) : null;
    if (!p || g === null || p.graine !== g || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
    return { x: p.x, y: p.y };
  } catch (e) {
    return null;
  }
}

// Noter la position `p` ({ x, y } en px de la carte, ou null : rien à reprendre).
export function positionNoter(p) {
  const g = state ? farmSeed(state) : null;
  if (g === null) return;
  const v = JSON.stringify(p ? { graine: g, x: Math.round(p.x), y: Math.round(p.y) } : { graine: g, x: null, y: null });
  if (v === derniere) return;
  derniere = v;
  safeStorageSet(CLE, v);
}
