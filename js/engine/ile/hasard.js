/* ==========================================================================
   Le hasard de l'île : un nombre tiré d'un texte, un tirage par étape, le bruit de valeur et le bruit fractal.
   Rien n'alloue dans les fonctions appelées sur chaque case.
   Une partie de l'île de 300 × 300 (js/engine/ile.js, docs/ile-300.md).
   ========================================================================== */

import { mulberry32 } from '../base.js';

/**
 * Un nombre de 32 bits tiré d'un texte (FNV-1a) : la même graine donne toujours le même nombre.
 * @param {string | number} texte
 * @returns {number}
 */
export function hacher(texte) {
  const s = String(texte);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Le tirage d'une étape de la génération : chaque étape a le sien, tiré de la graine de l'île et du nom de
 * l'étape. En changer une ne déplace rien dans les autres.
 * @param {string | number} graine
 * @param {string} etape
 * @returns {() => number} un nombre dans [0, 1) à chaque appel
 */
export function prng(graine, etape) {
  return mulberry32(hacher(`${graine}/${etape}`));
}

/**
 * Un entier tiré dans [min, max] (bornes comprises).
 * @param {() => number} alea
 * @param {number} min
 * @param {number} max
 */
export function entre(alea, min, max) {
  return min + Math.floor(alea() * (max - min + 1));
}

// Un nombre dans [0, 1) attaché à un point entier (x, y) et à une graine : le même point donne toujours le même.
function hasardDuPoint(x, y, graine) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ graine;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Le lissage des coins (la courbe de Perlin : nulle en pente aux bords, pas de cassure d'une maille à l'autre).
const lisser = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * Le bruit de valeur : un relief continu, dans [0, 1), des valeurs tirées aux points entiers et lissées entre
 * eux. N'alloue rien.
 * @param {number} x
 * @param {number} y
 * @param {number} graine   un entier (hacher)
 * @returns {number}
 */
export function bruit2D(x, y, graine) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const u = lisser(x - x0);
  const v = lisser(y - y0);
  const a = hasardDuPoint(x0, y0, graine);
  const b = hasardDuPoint(x0 + 1, y0, graine);
  const c = hasardDuPoint(x0, y0 + 1, graine);
  const d = hasardDuPoint(x0 + 1, y0 + 1, graine);
  const haut = a + (b - a) * u;
  const bas = c + (d - c) * u;
  return haut + (bas - haut) * v;
}

/**
 * Le bruit fractal : plusieurs octaves de bruit2D, de plus en plus fines et de moins en moins fortes, ramenées
 * dans [0, 1). N'alloue rien.
 * @param {number} x
 * @param {number} y
 * @param {number} graine        un entier (hacher)
 * @param {number} octaves
 * @param {number} persistance   la force d'une octave par rapport à la précédente (0,5 : moitié moins)
 * @param {number} lacunarite    la finesse d'une octave par rapport à la précédente (2 : deux fois plus fine)
 * @returns {number}
 */
export function fbm(x, y, graine, octaves = 4, persistance = 0.5, lacunarite = 2) {
  let somme = 0;
  let total = 0;
  let force = 1;
  let echelle = 1;
  for (let o = 0; o < octaves; o++) {
    somme += force * bruit2D(x * echelle, y * echelle, (graine + Math.imul(o + 1, 0x9e3779b9)) | 0);
    total += force;
    force *= persistance;
    echelle *= lacunarite;
  }
  return somme / total;
}
