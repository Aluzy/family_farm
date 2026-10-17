#!/usr/bin/env node
// Point d'entrée de « npm test » : enchaîne, dans cet ordre,
//   1. les fichiers générés (données, encyclopédie, cartes) : régénérés ou vérifiés à jour ;
//      à la moindre erreur, on s'arrête là (les tests liraient des données fausses) ;
//   2. les suites de tests (node tests/run-tests.mjs --tous : moteur, données, suivi, rapport) ;
//   3. les vérifications de la page (actions de l'interface, modules chargés).
// Les étapes 2 et 3 tournent toutes, même après un échec, puis le bilan dit lesquelles ont échoué.
//
// Usage : node tests/all.mjs   (ou npm test)

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

const GENERATION = [
  ['Données du jeu', 'scripts/build-data.mjs'],
  ['Encyclopédie', 'scripts/build-encyclopedie.mjs'],
  ['Cartes (à jour avec Tiled)', 'scripts/build-map.mjs', '--check'],
];
const VERIFICATIONS = [
  ['Tests (moteur, données, suivi, rapport)', 'tests/run-tests.mjs', '--tous'],
  ['Actions de l\'interface', 'scripts/check-actions.mjs'],
  ['Modules et fichiers de la page', 'scripts/check-page.mjs'],
];

const bilan = [];
function etape([nom, script, ...args]) {
  const debut = performance.now();
  const r = spawnSync(process.execPath, [join(RACINE, script), ...args], { cwd: RACINE, stdio: 'inherit' });
  const ok = r.status === 0;
  bilan.push({ nom, ok, s: (performance.now() - debut) / 1000 });
  return ok;
}

const debut = performance.now();
let ok = GENERATION.every(etape);
if (ok) for (const e of VERIFICATIONS) ok = etape(e) && ok;

console.log('');
console.log('Bilan de npm test');
console.log('-----------------');
for (const b of bilan) console.log(`${b.ok ? '✓' : '✗'} ${b.nom.padEnd(42)} ${b.s.toFixed(1).padStart(5)} s`);
if (bilan.length < GENERATION.length + VERIFICATIONS.length) console.log('  (arrêt après l\'échec d\'une étape de génération)');
console.log(`${ok ? 'Tout est vert' : 'ÉCHEC'} en ${((performance.now() - debut) / 1000).toFixed(1)} s.`);
process.exit(ok ? 0 : 1);
