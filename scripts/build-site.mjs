#!/usr/bin/env node
// Construit le site à mettre en ligne, dans _site/.
//
// Le dépôt contient le jeu tel qu'on le développe : des modules ES (js/engine/,
// js/ui/) que jeu.html charge un par un. Le site en ligne, lui, reçoit :
//
//   - js/jeu.bundle.js : tous les modules regroupés en un seul fichier, minifié
//     (esbuild). Un fichier au lieu d'une cinquantaine, et une version du jeu
//     toujours entière : pas de mélange d'anciens et de nouveaux modules ;
//   - jeu.html : la même page, qui charge ce fichier, chaque fichier local suivi
//     de « ?v=<empreinte de son contenu> ». Un fichier modifié change d'adresse,
//     le navigateur le recharge ; un fichier inchangé reste en cache ;
//   - les autres pages, le style, les images et Phaser, copiés tels quels.
//
// Les tests, les scripts, les données sources (data/) et les modules eux-mêmes
// ne sont pas mis en ligne.
//
// L'action GitHub (.github/workflows/site.yml) lance ce script à chaque push sur
// main, après les tests, puis publie _site/. En local : npm install, puis
//   node scripts/build-site.mjs      (ou : npm run build)
//   python3 -m http.server -d _site  (pour voir le résultat)

import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ROOT } from './lib/engine-source.mjs';

let esbuild;
try {
  esbuild = await import('esbuild');
} catch (err) {
  console.error('✗ esbuild est introuvable : lancer « npm install » une fois, puis recommencer.');
  process.exit(1);
}

const OUT = join(ROOT, '_site');
const PAGES = ['index.html', 'jeu.html', 'encyclopedie.html', 'cookies.html'];
const FOLDERS = ['css', 'assets', 'vendor'];
const SCRIPTS = ['js/telemetry.js', 'js/ambient-life.js', 'js/farm-stage.js']; // scripts classiques, hors du regroupement
const ENTRY = 'js/main.js';
const BUNDLE = 'js/jeu.bundle.js';

rmSync(OUT, { recursive: true, force: true });
for (const f of [...PAGES, ...SCRIPTS]) {
  mkdirSync(dirname(join(OUT, f)), { recursive: true });
  cpSync(join(ROOT, f), join(OUT, f));
}
for (const d of FOLDERS) {
  cpSync(join(ROOT, d), join(OUT, d), { recursive: true, filter: (src) => !src.endsWith('.DS_Store') });
}

/* les modules, regroupés */
await esbuild.build({
  entryPoints: [join(ROOT, ENTRY)],
  outfile: join(OUT, BUNDLE),
  bundle: true,
  format: 'iife',       // un script classique : s'exécute en fin de page, comme avant les modules
  target: ['es2020'],
  minify: true,
  sourcemap: true,      // jeu.bundle.js.map : le navigateur ne le charge que si les outils de développement sont ouverts
  charset: 'utf8',      // les accents et les émojis restent tels quels
  legalComments: 'none',
  logLevel: 'warning',
});

const fingerprint = (path) => createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 10);

/* les autres pages : leurs icônes en pixel art (js/icones-page.js), regroupées aussi */
const PAGE_ENTRY = 'js/icones-page.js';
const PAGE_BUNDLE = 'js/icones.bundle.js';
await esbuild.build({
  entryPoints: [join(ROOT, PAGE_ENTRY)],
  outfile: join(OUT, PAGE_BUNDLE),
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  minify: true,
  charset: 'utf8',
  legalComments: 'none',
  logLevel: 'warning',
});
const PAGE_TAG = `<script type="module" src="${PAGE_ENTRY}"></script>`;
for (const page of PAGES.filter((p) => p !== 'jeu.html')) {
  const src = readFileSync(join(OUT, page), 'utf8');
  if (!src.includes(PAGE_TAG)) continue;
  writeFileSync(join(OUT, page), src.replace(PAGE_TAG, `<script src="${PAGE_BUNDLE}?v=${fingerprint(join(OUT, PAGE_BUNDLE))}" defer></script>`));
}

/* la page du jeu */
const MODULE_TAG = `<script type="module" src="${ENTRY}"></script>`;
let html = readFileSync(join(OUT, 'jeu.html'), 'utf8');
if (html.split(MODULE_TAG).length !== 2) {
  console.error(`✗ jeu.html : la balise ${MODULE_TAG} est attendue une fois, exactement sous cette forme.`);
  process.exit(1);
}
html = html.replace(MODULE_TAG, `<script src="${BUNDLE}"></script>`);

const errors = [];
let count = 0;
html = html.replace(/(<(?:script[^>]*\bsrc|link[^>]*\bhref)=")([^"]+)(")/g, (tag, before, ref, after) => {
  if (/^[a-z]+:\/\//i.test(ref)) return tag; // adresse externe
  if (ref.includes('?')) { errors.push(`${ref} : pas de « ?… » dans jeu.html, le suffixe est ajouté ici`); return tag; }
  const file = join(OUT, ref);
  if (!existsSync(file)) { errors.push(`${ref} : fichier absent du site construit`); return tag; }
  count++;
  return `${before}${ref}?v=${fingerprint(file)}${after}`;
});
if (/type="module"/.test(html)) errors.push('jeu.html : il reste un <script type="module"> après le regroupement');
if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
writeFileSync(join(OUT, 'jeu.html'), html);

const ko = (f) => Math.round(statSync(join(OUT, f)).size / 1024);
console.log(`_site/ construit : ${BUNDLE} ${ko(BUNDLE)} Ko, jeu.html ${ko('jeu.html')} Ko, ${count} fichiers suivis d'une empreinte.`);
