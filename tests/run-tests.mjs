#!/usr/bin/env node
// Lanceur de tests pour Ferme Familiale, posé sur node:test (le lanceur intégré de Node).
//
// Les tests du moteur sont rangés par thème dans tests/engine/*.test.mjs (aide commune :
// tests/engine/aide.mjs). Les autres suites : tests/test-data.mjs (données),
// tests/test-telemetry.mjs (suivi de session), tests/test-report.mjs (rapport quotidien).
// Chaque fichier tourne dans son propre processus : un fichier qui plante (erreur au
// chargement, exception hors test) est compté en échec sans arrêter les autres.
//
// Usage :
//   node tests/run-tests.mjs                  tests du moteur (tous les fichiers de tests/engine/)
//   node tests/run-tests.mjs --tous           toutes les suites (moteur, données, suivi, rapport)
//   node tests/run-tests.mjs cuisine nuit     seulement les fichiers dont le nom contient « cuisine » ou « nuit »
//   node tests/run-tests.mjs --grep "Moulin"  seulement les tests dont le nom correspond (expression régulière)
//   node tests/run-tests.mjs --lent           affiche aussi la durée de chaque test de plus de 50 ms
// Un fichier se lance aussi seul : node --test tests/engine/cuisine.test.mjs (ou node tests/engine/cuisine.test.mjs).
// Code de sortie non nul en cas d'échec (ou si aucun test ne correspond).

import { run } from 'node:test';
import { readdirSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..');

// Suites, dans l'ordre d'affichage.
const SUITES = [
  { nom: 'moteur', titre: 'tests du moteur', fichiers: readdirSync(join(ICI, 'engine')).filter((f) => f.endsWith('.test.mjs')).sort().map((f) => join(ICI, 'engine', f)) },
  { nom: 'données', titre: 'tests des données', fichiers: [join(ICI, 'test-data.mjs')] },
  { nom: 'suivi', titre: 'tests du suivi de session', fichiers: [join(ICI, 'test-telemetry.mjs')] },
  { nom: 'rapport', titre: 'tests du rapport quotidien', fichiers: [join(ICI, 'test-report.mjs')] },
];

const args = process.argv.slice(2);
let tous = false;
let lent = false;
const motifs = [];
const filtres = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--tous' || a === '--all') tous = true;
  else if (a === '--lent') lent = true;
  else if (a === '--grep' || a === '-g') motifs.push(args[++i]);
  else if (a.startsWith('--grep=')) motifs.push(a.slice(7));
  else if (a === '--help' || a === '-h') {
    console.log('Usage : node tests/run-tests.mjs [--tous] [--grep motif] [--lent] [nom de fichier…]');
    process.exit(0);
  } else filtres.push(a);
}
if (motifs.some((m) => !m)) {
  console.error('--grep : motif manquant.');
  process.exit(2);
}

// Un nom de fichier donné cherche dans toutes les suites ; sinon le moteur seul (ou tout avec --tous).
const nomCourt = (f) => basename(f).replace(/\.test\.mjs$|\.mjs$/, '').replace(/^test-/, '');
const choisis = SUITES.map((s) => ({
  ...s,
  fichiers: s.fichiers.filter((f) => (filtres.length ? filtres.some((m) => nomCourt(f).includes(m)) : tous || s.nom === 'moteur')),
})).filter((s) => s.fichiers.length);
if (!choisis.length) {
  console.error(`Aucun fichier de tests ne correspond à : ${filtres.join(', ')}.`);
  process.exit(1);
}

const parFichier = new Map(choisis.flatMap((s) => s.fichiers.map((f) => [f, { passes: 0, echecs: [], lents: [], ms: 0 }])));
const fichiers = [...parFichier.keys()];
const debut = performance.now();

// Les événements d'un fichier : test:pass / test:fail par test (nesting 0, type « test ») ; un
// échec sans test (fichier qui ne se charge pas, exception hors test) arrive au nom du fichier.
const flux = run({
  files: fichiers,
  concurrency: Math.max(1, availableParallelism() - 1),
  testNamePatterns: motifs.length ? motifs.map((m) => new RegExp(m)) : undefined,
});
// Durée d'un fichier : celle que mesure son processus (ses tests, hors démarrage de Node).
flux.on('test:summary', (d) => {
  const f = parFichier.get(d.file);
  if (!f) return;
  f.ms = d.duration_ms ?? 0;
  if (!d.success && !f.echecs.length) f.echecs.push({ nom: '(fichier)', erreur: 'le fichier a échoué hors des tests (voir sa sortie d\'erreur)' });
});
flux.on('test:pass', (d) => noter(d, true));
flux.on('test:fail', (d) => noter(d, false));
flux.on('test:stderr', (d) => {
  if (d.file && parFichier.has(d.file)) parFichier.get(d.file).stderr = (parFichier.get(d.file).stderr || '') + d.message;
});
function noter(d, ok) {
  const f = parFichier.get(d.file);
  if (!f) return;
  const ms = d.details?.duration_ms ?? 0;
  if (d.name === d.file || d.name === relative(process.cwd(), d.file)) {
    // Le fichier lui-même : il n'a pas pu tourner jusqu'au bout (erreur au chargement…).
    if (!ok) f.echecs.push({ nom: '(fichier)', erreur: messageDe(d.details?.error) });
    return;
  }
  if (d.nesting !== 0 || d.details?.type === 'suite') return;
  if (d.skip || d.todo) return;
  if (ok) f.passes++;
  else f.echecs.push({ nom: d.name, erreur: messageDe(d.details?.error) });
  if (ms > 50) f.lents.push({ nom: d.name, ms });
}
function messageDe(err) {
  if (!err) return 'échec';
  const cause = err.cause ?? err;
  return (cause && cause.message) || String(cause);
}

// Attend la fin du flux (on le lit pour qu'il s'écoule).
for await (const _ of flux); // eslint-disable-line no-unused-vars

const total = { passes: 0, echecs: 0 };
const fmtMs = (ms) => `${Math.round(ms)} ms`;
for (const s of choisis) {
  const titre = `Ferme Familiale — ${s.titre}${motifs.length ? ` (--grep ${motifs.join(' | ')})` : ''}`;
  console.log('');
  console.log(titre);
  console.log('-'.repeat(titre.length));
  let passes = 0;
  let echecs = 0;
  for (const fichier of s.fichiers) {
    const f = parFichier.get(fichier);
    passes += f.passes;
    echecs += f.echecs.length;
    if (motifs.length && !f.passes && !f.echecs.length) continue; // --grep : rien de retenu dans ce fichier
    const marque = f.echecs.length ? '✗' : '✓';
    const nom = relative(RACINE, fichier);
    console.log(`${marque} ${nom.padEnd(42)} ${String(f.passes + f.echecs.length).padStart(4)} test(s)  ${fmtMs(f.ms).padStart(7)}`);
    for (const e of f.echecs) {
      console.log(`    ✗ ${e.nom}`);
      console.log(`      ${String(e.erreur).split('\n').join('\n      ')}`);
    }
    if (f.echecs.some((e) => e.nom === '(fichier)') && f.stderr) console.log(`      ${f.stderr.trim().split('\n').slice(0, 12).join('\n      ')}`);
    if (lent) for (const l of f.lents) console.log(`    … ${fmtMs(l.ms).padStart(7)}  ${l.nom}`);
  }
  console.log(`${passes}/${passes + echecs} test(s) passé(s), ${echecs} échec(s).`);
  total.passes += passes;
  total.echecs += echecs;
}

const duree = ((performance.now() - debut) / 1000).toFixed(1);
console.log('');
if (choisis.length > 1) console.log(`Total : ${total.passes}/${total.passes + total.echecs} test(s) passé(s), ${total.echecs} échec(s), en ${duree} s.`);
else console.log(`Durée : ${duree} s.`);

if (total.echecs > 0) process.exit(1);
if (total.passes === 0) {
  console.error('Aucun test lancé.');
  process.exit(1);
}
process.exit(0);
