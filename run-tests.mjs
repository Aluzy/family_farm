#!/usr/bin/env node
// Lanceur de tests pour Ferme Familiale.
// Lit index.html, extrait les blocs <script id="core"> et
// <script id="tests" type="text/plain">, les exécute avec Node (sans DOM,
// puisque le bloc core n'en a pas besoin), et affiche le nombre de tests
// passés et échoués. Code de sortie non nul en cas d'échec.
//
// Usage : node run-tests.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexPath = join(__dirname, 'index.html');

let html;
try {
  html = readFileSync(indexPath, 'utf8');
} catch (err) {
  console.error(`Impossible de lire ${indexPath} : ${err.message}`);
  process.exit(1);
}

function extractScript(html, id) {
  // Capture le contenu d'une balise <script id="..." ...> ... </script>,
  // quel que soit l'ordre ou la présence d'autres attributs (ex. type="text/plain").
  const re = new RegExp(`<script[^>]*\\bid=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i');
  const match = html.match(re);
  if (!match) {
    console.error(`Bloc <script id="${id}"> introuvable dans index.html`);
    process.exit(1);
  }
  return match[1];
}

const coreSource = extractScript(html, 'core');
const testsSource = extractScript(html, 'tests');

// Les deux blocs sont concaténés et exécutés comme un seul script : c'est
// exactement ce qui se passe dans le navigateur, où les déclarations
// top-level (const/let/function) de plusieurs <script> partagent la même
// portée globale au sein d'une page.
const combined = `${coreSource}\n${testsSource}\n`;

const sandbox = { console, module: {}, globalThis: undefined };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

try {
  vm.runInContext(combined, sandbox, { filename: 'index.html (core+tests)' });
} catch (err) {
  console.error('Erreur pendant l\'exécution des blocs core/tests :');
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
