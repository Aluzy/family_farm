#!/usr/bin/env node
// Vérifie les fichiers que jeu.html charge : chacun existe, et chacun porte
// « ?v=<version du jeu> ». Depuis que la page est découpée en plusieurs
// fichiers, ce suffixe évite qu'un joueur reçoive, juste après une mise à jour,
// la nouvelle page avec un ancien script encore en cache.
//
// Usage : node scripts/check-page.mjs

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, ENGINE_FILES } from './lib/engine-source.mjs';

const html = readFileSync(join(ROOT, 'jeu.html'), 'utf8');
const version = (readFileSync(join(ROOT, 'js/engine.js'), 'utf8').match(/const GAME_VERSION = '([^']+)'/) || [])[1];
const errors = [];
if (!version) errors.push('GAME_VERSION introuvable dans js/engine.js');

const refs = [...html.matchAll(/<(?:script[^>]*\bsrc|link[^>]*\bhref)="([^"]+)"/g)].map((m) => m[1]);
for (const ref of refs) {
  if (/^[a-z]+:\/\//i.test(ref)) continue;
  const [path, query = ''] = ref.split('?');
  if (!existsSync(join(ROOT, path))) errors.push(`${path} : fichier introuvable`);
  // vendor/ ne change pas avec le jeu : pas de suffixe.
  if (!path.startsWith('vendor/') && query !== `v=${version}`) {
    errors.push(`${ref} : attendu « ${path}?v=${version} »`);
  }
}
const scripts = refs.map((r) => r.split('?')[0]);
let last = -1;
for (const f of ENGINE_FILES) {
  const i = scripts.indexOf(f);
  if (i < 0) errors.push(`${f} : fichier du moteur absent de jeu.html`);
  else if (i < last) errors.push(`${f} : pas dans le même ordre que ENGINE_FILES (scripts/lib/engine-source.mjs)`);
  last = Math.max(last, i);
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log(`jeu.html : ${refs.length} fichiers chargés, tous présents, version ${version}.`);
