#!/usr/bin/env node
// Vérifie que les actions de l'interface se tiennent, de bout en bout :
//
//   1. chaque data-action écrit dans la page a une fonction dans le registre
//      (registerActions, js/app.js) — sinon le bouton ne fait rien ;
//   2. chaque fonction du registre est appelée par au moins un data-action ;
//   3. chaque action suivie par le suivi de session est classée dans le
//      rapport quotidien (worker/src/report.mjs : GAME_ACTIONS ou
//      INTERFACE_ACTIONS), et le rapport ne garde pas d'action disparue.
//
// Usage : node scripts/check-actions.mjs

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/engine-source.mjs';
import { GAME_ACTIONS, INTERFACE_ACTIONS } from '../worker/src/report.mjs';

const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const app = read('js/app.js');

/* le registre */
const registered = new Set();
for (const m of app.matchAll(/^ {2}'([a-z0-9-]+)': \(/gm)) registered.add(m[1]);
for (const m of app.matchAll(/^ {2}\.\.\.sameHandler\(\[([^\]]+)\]/gm)) {
  for (const n of m[1].matchAll(/'([a-z0-9-]+)'/g)) registered.add(n[1]);
}

/* ce que la page émet */
const used = new Set();
const sources = [app, read('jeu.html'), read('js/farm-stage.js')];
for (const src of sources) {
  for (const m of src.matchAll(/data-action="([a-z0-9-]+)"/g)) used.add(m[1]);
  for (const m of src.matchAll(/(?:bridge\.act|stageAct)\('([a-z0-9-]+)'/g)) used.add(m[1]);
  for (const m of src.matchAll(/dataset\.action = '([a-z0-9-]+)'/g)) used.add(m[1]);
}
// Noms composés dans un gabarit : data-action="${action}" ou "${action}-inc", où `action`
// est un texte passé par l'appelant ('inv-tab', 'buy'…). On retient les textes écrits
// ailleurs que dans le registre qui, seuls ou avec un de ces suffixes, nomment une action.
const suffixes = [...new Set([...app.matchAll(/data-action="\$\{[^}]+\}(-[a-z]+)?"/g)].map((m) => m[1] || ''))];
const start = app.indexOf('registerActions({');
const outside = app.slice(0, start) + app.slice(app.indexOf('\n});', start));
for (const m of outside.matchAll(/'([a-z0-9-]+)'/g)) {
  for (const suffix of suffixes) if (registered.has(m[1] + suffix)) used.add(m[1] + suffix);
}

const errors = [];
const warnings = [];
for (const a of [...used].sort()) if (!registered.has(a)) errors.push(`data-action="${a}" n'a pas de fonction dans le registre : le bouton ne fait rien`);
for (const a of [...registered].sort()) if (!used.has(a)) warnings.push(`« ${a} » est dans le registre mais aucun data-action ne l'appelle`);

/* le rapport quotidien */
const tracked = (a) => !a.startsWith('test-') && !a.startsWith('consent-'); // voir telClick()
const classified = new Set([...Object.keys(GAME_ACTIONS), ...INTERFACE_ACTIONS]);
for (const a of [...registered].filter(tracked).sort()) {
  if (!classified.has(a)) errors.push(`« ${a} » n'est pas classée dans worker/src/report.mjs (GAME_ACTIONS ou INTERFACE_ACTIONS) : elle sortirait « non répertoriée » dans le rapport`);
}
for (const a of [...classified].sort()) {
  if (!registered.has(a)) errors.push(`worker/src/report.mjs classe « ${a} », qui n'existe plus dans le jeu`);
}
for (const a of Object.keys(GAME_ACTIONS)) {
  if (INTERFACE_ACTIONS.has(a)) errors.push(`« ${a} » est à la fois dans GAME_ACTIONS et INTERFACE_ACTIONS`);
}

for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  console.error(`\n${errors.length} erreur(s).`);
  process.exit(1);
}
console.log(`${registered.size} actions dans le registre, ${used.size} émises par la page, ${classified.size} classées dans le rapport : tout concorde.`);
