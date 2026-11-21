/* ==========================================================================
   Les réglages de l'île (DATA.ILE, data/ile.json), les types et les constantes : la taille, les biomes, les sols.
   Une partie de l'île de 300 × 300 (js/engine/ile.js, docs/ile-300.md).
   ========================================================================== */

import { DATA } from '../catalog.js';

export const REGLAGES = DATA.ILE;

/** Les dimensions de l'île et le point d'apparition. */
export const ILE = Object.freeze({
  TAILLE: REGLAGES.TAILLE,
  CASES: REGLAGES.TAILLE * REGLAGES.TAILLE,
  BORD_MER: REGLAGES.BORD_MER,
  REGION: REGLAGES.REGION,
  APPARITION: Object.freeze({ ...REGLAGES.APPARITION }),
});

/** Les biomes, dans l'ordre de leur numéro ; BIOME[nom] → numéro. */
export const BIOMES = Object.freeze([...REGLAGES.BIOMES]);

export const BIOME = Object.freeze(Object.fromEntries(BIOMES.map((nom, i) => [nom, i])));

/** Les sols, dans l'ordre de leur numéro ; SOL[nom] → numéro ; SOL_BIOME et SOL_EAU, rangés par numéro. */
export const SOLS = Object.freeze(
  BIOMES.flatMap((biome) =>
    Object.entries(REGLAGES.SOLS[biome] ?? {}).map(([nom, r]) => Object.freeze({ nom, biome, eau: r.eau === true })),
  ),
);

export const SOL = Object.freeze(Object.fromEntries(SOLS.map((s, i) => [s.nom, i])));

export const SOL_BIOME = Uint8Array.from(SOLS, (s) => BIOME[s.biome]);

export const SOL_EAU = Uint8Array.from(SOLS, (s) => (s.eau ? 1 : 0));

/** Les genres d'une plante ou d'une roche (monde.json VEGETATION.SORTES, ROCHES.SORTES), dans l'ordre de leur numéro. */
export const GENRES = Object.freeze(['arbre', 'buisson', 'haute', 'basse', 'bloc']);
