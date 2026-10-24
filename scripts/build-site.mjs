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
//   - js/assets-versions.js : l'empreinte de chaque fichier de assets/ (images,
//     cartes), que js/farm-stage.js ajoute à leurs adresses (« ?v=… »). Une image
//     ou une carte modifiée est donc rechargée, même sur un téléphone qui l'a en cache ;
//   - js/monde-worker.js : le Web Worker du sol du grand monde, regroupé avec les modules du moteur
//     qu'il demande, un Worker classique ; jeu.bundle.js le charge à l'adresse versionnée ;
//   - les scripts classiques de la page (SCRIPTS) : minifiés un à un (esbuild), sans
//     changer leur forme (toujours des scripts classiques, mêmes noms globaux) ;
//   - les autres pages, le style, les images et Phaser, copiés tels quels.
//
// Les tests, les scripts, les données sources (data/) et les modules eux-mêmes
// ne sont pas mis en ligne. Dans assets/, les fichiers de travail ne le sont pas non
// plus (ASSETS_HORS_SITE) : cartes et jeux de tuiles Tiled (.tmj, .tsx), images que
// seuls les générateurs Python lisent. Une carte publiée qui demanderait l'une de ces
// images arrête la construction.
//
// La carte des sources de jeu.bundle.js (.map) n'est pas publiée ; pour l'avoir en
// local : node scripts/build-site.mjs --sourcemap
//
// L'action GitHub (.github/workflows/site.yml) lance ce script à chaque push sur
// main, après les tests, puis publie _site/. En local : npm install, puis
//   node scripts/build-site.mjs      (ou : npm run build)
//   python3 -m http.server -d _site  (pour voir le résultat)

import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
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
// Fichiers de assets/ jamais mis en ligne : le jeu ne les charge pas.
const ASSETS_HORS_SITE = [
  /\.(tmj|tsx)$/,                     // cartes et jeux de tuiles de travail Tiled (scripts/build-map.mjs en tire les .json)
  // images lues seulement par les générateurs (scripts/carte/*.py) ou par Tiled, dont aucune
  // carte construite ne pose de tuile (la vérification plus bas le garantit)
  /^(arbre_clair|pin_clair|barrieres|bordure_eau|bordure_eau_herbe|eau|herbe_chemin|herbe_deco)\.png$/,
];
const SOURCEMAP = process.argv.includes('--sourcemap');
// scripts classiques, hors du regroupement : le kit commun des cartes (js/carte/), la ferme
// (js/carte/ferme/ et js/farm-stage.js), la mine (js/grotte.js)
const CARTE_KIT = ['kit', 'chemins', 'nature', 'gestes', 'lumiere', 'eau', 'triporteur', 'cheval', 'toit', 'jeu'].map((n) => `js/carte/${n}.js`);
const CARTE_FERME = ['config', 'sol', 'decor', 'soleil', 'camera', 'etiquettes', 'hache', 'pioche', 'coupfort', 'moulin', 'cueillette', 'chantier', 'etage', 'toits', 'fenetres', 'eau', 'eau-monde', 'peche', 'didacticiel', 'plantation', 'passages', 'machines', 'abeilles', 'botteleuse', 'silo', 'foret', 'modele'].map((n) => `js/carte/ferme/${n}.js`);
const SCRIPTS = ['js/telemetry.js', ...CARTE_KIT, 'js/ambient-life.js', 'js/fermier.js', 'js/famille-ferme.js', ...CARTE_FERME, 'js/farm-stage.js', 'js/grotte.js'];
const ENTRY = 'js/main.js';
const BUNDLE = 'js/jeu.bundle.js';
const WORKER = 'js/monde-worker.js';

rmSync(OUT, { recursive: true, force: true });
for (const f of PAGES) {
  mkdirSync(dirname(join(OUT, f)), { recursive: true });
  cpSync(join(ROOT, f), join(OUT, f));
}
const assetsDir = join(ROOT, 'assets') + sep;
const published = (src) => {
  if (src.endsWith('.DS_Store')) return false;
  if (!src.startsWith(assetsDir)) return true;
  const name = src.slice(assetsDir.length).split(sep).join('/');
  return !ASSETS_HORS_SITE.some((re) => re.test(name));
};
for (const d of FOLDERS) {
  cpSync(join(ROOT, d), join(OUT, d), { recursive: true, filter: published });
}

/* les scripts classiques : minifiés sur place, sans regroupement ni changement de forme
   (pas de « format » : les noms globaux comme Telemetry restent tels quels) */
for (const f of SCRIPTS) {
  const { code } = await esbuild.transform(readFileSync(join(ROOT, f), 'utf8'), {
    loader: 'js', minify: true, charset: 'utf8', legalComments: 'none', sourcefile: f, logLevel: 'warning',
  });
  mkdirSync(dirname(join(OUT, f)), { recursive: true });
  writeFileSync(join(OUT, f), code);
}

/* les cartes publiées : chaque planche qu'elles demandent est publiée aussi (une image de
   assets/ écartée par ASSETS_HORS_SITE ne doit manquer à aucune carte) */
const missing = [];
for (const name of readdirSync(join(OUT, 'assets'), { recursive: true })) {
  if (!String(name).endsWith('.json')) continue;
  let map;
  try { map = JSON.parse(readFileSync(join(OUT, 'assets', name), 'utf8')); } catch { continue; }
  for (const t of (map && Array.isArray(map.tilesets) ? map.tilesets : [])) {
    if (t.image && existsSync(join(ROOT, 'assets', t.image)) && !existsSync(join(OUT, 'assets', t.image))) {
      missing.push(`assets/${name} demande ${t.image}, écartée du site (ASSETS_HORS_SITE)`);
    }
  }
}
if (missing.length) {
  console.error(missing.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}

/* le Web Worker du sol du grand monde (js/monde-worker.js, docs/architecture-phaser.md) : ses
   modules regroupés en un Worker classique, à part ; son adresse (avec l'empreinte de son contenu)
   est écrite dans le regroupement des modules (MONDE_WORKER, lu par js/ui/monde-sol.js) */
await esbuild.build({
  entryPoints: [join(ROOT, WORKER)],
  outfile: join(OUT, WORKER),
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  minify: true,
  charset: 'utf8',
  legalComments: 'none',
  logLevel: 'warning',
});

/* les modules, regroupés */
await esbuild.build({
  define: { MONDE_WORKER: JSON.stringify(`${WORKER}?v=${createHash('sha256').update(readFileSync(join(OUT, WORKER))).digest('hex').slice(0, 10)}`) },
  entryPoints: [join(ROOT, ENTRY)],
  outfile: join(OUT, BUNDLE),
  bundle: true,
  format: 'iife',       // un script classique : s'exécute en fin de page, comme avant les modules
  target: ['es2020'],
  minify: true,
  sourcemap: SOURCEMAP, // jeu.bundle.js.map : seulement avec --sourcemap (en local), jamais publié
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

/* les fichiers de assets/ (images, cartes) : chargés par js/farm-stage.js, qui ajoute
   « ?v=<empreinte> » à chaque adresse d'après la table écrite ici. Ce fichier de table
   reçoit lui-même son empreinte plus bas, comme les autres scripts de la page. */
const ASSET_VERSIONS = 'js/assets-versions.js';
const STAGE_TAG = '<script src="js/farm-stage.js"></script>';
const assetVersions = {};
for (const name of readdirSync(join(OUT, 'assets'), { recursive: true })) {
  const file = join(OUT, 'assets', name);
  if (statSync(file).isFile()) assetVersions[String(name).split(sep).join('/')] = fingerprint(file);
}
writeFileSync(join(OUT, ASSET_VERSIONS),
  `// Généré par scripts/build-site.mjs : empreinte du contenu de chaque fichier de assets/.\n` +
  `window.FERME_ASSET_VERSIONS = ${JSON.stringify(assetVersions, null, 1)};\n`);
if (html.split(STAGE_TAG).length !== 2) {
  console.error(`✗ jeu.html : la balise ${STAGE_TAG} est attendue une fois, exactement sous cette forme.`);
  process.exit(1);
}
html = html.replace(STAGE_TAG, `<script src="${ASSET_VERSIONS}"></script>\n${STAGE_TAG}`);

const errors = [];
let count = 0;
/* chaque script et style local d'une page suivi de « ?v=<empreinte> » */
const stamp = (page, src) => src.replace(/(<(?:script[^>]*\bsrc|link[^>]*\bhref)=")([^"]+)(")/g, (tag, before, ref, after) => {
  if (/^[a-z]+:\/\//i.test(ref)) return tag; // adresse externe
  if (ref.includes('?')) { errors.push(`${ref} : pas de « ?… » dans ${page}, le suffixe est ajouté ici`); return tag; }
  const file = join(OUT, ref);
  if (!existsSync(file)) { errors.push(`${ref} : fichier absent du site construit (${page})`); return tag; }
  count++;
  return `${before}${ref}?v=${fingerprint(file)}${after}`;
});
html = stamp('jeu.html', html);
if (/type="module"/.test(html)) errors.push('jeu.html : il reste un <script type="module"> après le regroupement');
if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
writeFileSync(join(OUT, 'jeu.html'), html);

const ko = (f) => Math.round(statSync(join(OUT, f)).size / 1024);
let total = 0;
for (const name of readdirSync(OUT, { recursive: true })) {
  const st = statSync(join(OUT, name));
  if (st.isFile()) total += st.size;
}
console.log(`_site/ construit : ${BUNDLE} ${ko(BUNDLE)} Ko, jeu.html ${ko('jeu.html')} Ko, ${count} fichiers suivis d'une empreinte, ${Object.keys(assetVersions).length} fichiers de assets/ aussi ; ${(total / 1048576).toFixed(1)} Mo en tout.`);
