// Le moteur du jeu, tel que la page le charge : les mêmes fichiers, dans le même
// ordre que les balises <script> de jeu.html. run-tests.mjs et simulate.mjs
// l'exécutent avec Node, sans DOM (le moteur n'en a pas besoin).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Fichiers du moteur, dans l'ordre de chargement de la page.
export const ENGINE_FILES = ['js/engine.js'];

export function engineSource(root = ROOT) {
  return ENGINE_FILES.map((f) => readFileSync(join(root, f), 'utf8')).join('\n');
}
