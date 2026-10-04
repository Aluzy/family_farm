// Où trouver le dépôt et le moteur du jeu, pour les scripts (tests, simulation,
// vérifications). Le moteur est un ensemble de modules ES (js/engine/) : Node les
// importe tels que le navigateur les charge.

import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Adresse du point d'entrée du moteur, à passer à import().
export function engineUrl(root = ROOT) {
  return pathToFileURL(join(root, 'js', 'engine', 'index.js')).href;
}
