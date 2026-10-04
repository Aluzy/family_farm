#!/usr/bin/env node
// Lanceur de tests pour Ferme Familiale.
// Lit le moteur (les fichiers listés dans scripts/lib/engine-source.mjs, ceux
// que charge jeu.html) et les tests (tests/engine.test.js), les exécute avec
// Node (sans DOM, puisque le moteur n'en a pas besoin), et affiche le nombre de
// tests passés et échoués. Code de sortie non nul en cas d'échec.
//
// Usage : node run-tests.mjs

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { ROOT, engineSource } from './scripts/lib/engine-source.mjs';

function read(label, fn) {
  try {
    return fn();
  } catch (err) {
    console.error(`Impossible de lire ${label} : ${err.message}`);
    process.exit(1);
  }
}

const coreSource = read('le moteur', () => engineSource());
const testsSource = read('tests/engine.test.js', () => readFileSync(join(ROOT, 'tests', 'engine.test.js'), 'utf8'));

// Le moteur et les tests sont concaténés et exécutés comme un seul script :
// les tests appellent les fonctions du moteur par leur nom, comme le fait
// l'interface dans la page.
const combined = `${coreSource}\n${testsSource}\n`;

const sandbox = { console, module: {}, globalThis: undefined };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

try {
  vm.runInContext(combined, sandbox, { filename: 'moteur + tests/engine.test.js' });
} catch (err) {
  console.error('Erreur pendant l\'exécution du moteur et des tests :');
  console.error(err.stack || err.message || err);
  process.exit(1);
}

const results = sandbox.__testResults;

if (!results) {
  console.error('Aucun résultat de test trouvé (runTests() n\'a pas été appelé ou __testResults est absent).');
  process.exit(1);
}

console.log('');
console.log(`Ferme Familiale — tests du moteur`);
console.log(`${'-'.repeat(34)}`);

for (const failure of results.failed) {
  console.log(`✗ ${failure.name}`);
  console.log(`  ${failure.error}`);
}

const passedCount = results.passed;
const failedCount = results.failed.length;
const total = results.total;

console.log('');
console.log(`${passedCount}/${total} test(s) passé(s), ${failedCount} échec(s).`);

if (failedCount > 0 || passedCount !== total) {
  process.exit(1);
}

process.exit(0);
