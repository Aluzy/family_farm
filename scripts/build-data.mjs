#!/usr/bin/env node
// Données du jeu : data/*.json → js/data.generated.js.
//
// Les fichiers JSON font foi. Ce script les vérifie (chaque ingrédient, graine,
// station ou recette citée existe ; aucun plat n'écrase un objet ; pas de
// recette en boucle…), puis écrit le fichier que la page charge avant le
// moteur. Comme build-encyclopedie.mjs : on modifie le JSON, on relance.
//
// Usage : node scripts/build-data.mjs          (vérifie, puis réécrit js/data.generated.js)
//         node scripts/build-data.mjs --check  (vérifie, et vérifie que le fichier est à jour, sans écrire)

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/engine-source.mjs';
import { GENERATED_FILE, compileData, generatedSource, loadData, validateData } from './lib/data.mjs';

const check = process.argv.includes('--check');

let data;
try {
  data = loadData();
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}

const { errors, warnings } = validateData(data);
for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`\n${errors.length} erreur(s) dans data/ : ${GENERATED_FILE} n'a pas été écrit.`);
  process.exit(1);
}

const source = generatedSource(compileData(data));
const path = join(ROOT, GENERATED_FILE);
let current = null;
try {
  current = readFileSync(path, 'utf8');
} catch (err) {
  // pas encore généré
}

const bilan = `${Object.keys(data.items).length} objets, ${Object.keys(data.recipes).length} recettes, ${Object.keys(data.crops).length} cultures, ${Object.keys(data.techtree.noeuds).length} technologies`;
if (current === source) {
  console.log(`${GENERATED_FILE} est à jour (${bilan}).`);
} else if (check) {
  console.error(`✗ ${GENERATED_FILE} n'est pas à jour avec data/*.json : lancer « node scripts/build-data.mjs ».`);
  process.exit(1);
} else {
  writeFileSync(path, source);
  console.log(`${GENERATED_FILE} réécrit (${bilan}).`);
}
