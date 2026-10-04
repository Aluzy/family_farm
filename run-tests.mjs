#!/usr/bin/env node
// Lanceur de tests pour Ferme Familiale.
// Importe tests/engine.test.js, qui importe le moteur (js/engine/) et lance
// ses tests à l'import (sans DOM, puisque le moteur n'en a pas besoin), puis
// affiche le nombre de tests passés et échoués. Code de sortie non nul en cas
// d'échec.
//
// Usage : node run-tests.mjs

let results;
try {
  ({ results } = await import('./tests/engine.test.js'));
} catch (err) {
  console.error('Erreur pendant le chargement du moteur ou des tests :');
  console.error(err.stack || err.message || err);
  process.exit(1);
}

if (!results) {
  console.error('Aucun résultat de test trouvé (tests/engine.test.js n\'exporte pas `results`).');
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
