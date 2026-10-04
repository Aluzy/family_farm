#!/usr/bin/env node
// Vérifie ce que jeu.html charge :
//
//   1. chaque fichier cité par la page existe et porte « ?v=<version du jeu> »
//      (sinon un joueur peut recevoir la nouvelle page avec un ancien script
//      resté en cache) ;
//   2. les modules se tiennent : chaque import mène à un fichier qui existe et
//      qui exporte bien le nom demandé (une faute de frappe dans un import
//      empêcherait toute la page de démarrer) ;
//   3. aucun module de js/ n'est oublié (jamais importé).
//
// Usage : node scripts/check-page.mjs

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { ROOT } from './lib/engine-source.mjs';

const errors = [];
const html = readFileSync(join(ROOT, 'jeu.html'), 'utf8');
const version = (readFileSync(join(ROOT, 'js/engine/base.js'), 'utf8').match(/const GAME_VERSION = '([^']+)'/) || [])[1];
if (!version) errors.push('GAME_VERSION introuvable dans js/engine/base.js');

/* 1. les fichiers de la page */
const refs = [...html.matchAll(/<(?:script[^>]*\bsrc|link[^>]*\bhref)="([^"]+)"/g)].map((m) => m[1]);
for (const ref of refs) {
  if (/^[a-z]+:\/\//i.test(ref)) continue;
  const [path, query = ''] = ref.split('?');
  if (!existsSync(join(ROOT, path))) errors.push(`${path} : fichier introuvable`);
  // vendor/ ne change pas avec le jeu : pas de suffixe.
  if (!path.startsWith('vendor/') && query !== `v=${version}`) errors.push(`${ref} : attendu « ${path}?v=${version} »`);
}
const entry = (html.match(/<script type="module" src="([^"?]+)/) || [])[1];
if (!entry) errors.push('jeu.html : pas de <script type="module">');

/* 2. les modules */
const seen = new Map(); // chemin → { exports, stars }
function load(path) {
  if (seen.has(path)) return seen.get(path);
  const info = { exports: new Set(), stars: [], imports: [] };
  seen.set(path, info);
  let src;
  try {
    src = readFileSync(path, 'utf8');
  } catch (err) {
    errors.push(`${relative(ROOT, path)} : fichier introuvable`);
    return info;
  }
  for (const m of src.matchAll(/^export (?:async )?(?:function\*?|const|let|class) ([A-Za-z_$][\w$]*)/gm)) info.exports.add(m[1]);
  for (const m of src.matchAll(/^export \{([^}]*)\}(?: from '([^']+)')?/gm)) {
    for (const n of m[1].split(',')) { const name = n.trim().split(/\s+as\s+/).pop(); if (name) info.exports.add(name); }
    if (m[2]) info.imports.push({ names: [], from: resolve(dirname(path), m[2]) });
  }
  for (const m of src.matchAll(/^export \* from '([^']+)'/gm)) info.stars.push(resolve(dirname(path), m[1]));
  for (const m of src.matchAll(/^import (?:\{([^}]*)\}|\* as [\w$]+) from '([^']+)'/gm)) {
    const names = (m[1] || '').split(',').map((n) => n.trim().split(/\s+as\s+/)[0]).filter(Boolean);
    info.imports.push({ names, from: resolve(dirname(path), m[2]) });
  }
  for (const m of src.matchAll(/^import '([^']+)'/gm)) info.imports.push({ names: [], from: resolve(dirname(path), m[1]) });
  for (const dep of [...info.imports.map((i) => i.from), ...info.stars]) load(dep);
  return info;
}
const provides = (path, name, trail = new Set()) => {
  if (trail.has(path)) return false;
  trail.add(path);
  const info = seen.get(path);
  return !!info && (info.exports.has(name) || info.stars.some((s) => provides(s, name, trail)));
};
if (entry) {
  load(join(ROOT, entry));
  for (const [path, info] of seen) {
    for (const imp of info.imports) {
      for (const name of imp.names) {
        if (!provides(imp.from, name)) errors.push(`${relative(ROOT, path)} : importe « ${name} », que ${relative(ROOT, imp.from)} n'exporte pas`);
      }
    }
  }
  /* 3. aucun module oublié */
  for (const dir of ['js/engine', 'js/ui']) {
    for (const f of readdirSync(join(ROOT, dir))) {
      if (f.endsWith('.js') && !seen.has(join(ROOT, dir, f))) errors.push(`${dir}/${f} : module jamais importé`);
    }
  }
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log(`jeu.html : ${refs.length} fichiers chargés, ${seen.size} modules reliés, version ${version}.`);
