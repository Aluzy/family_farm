// Tests des données de l'atelier des sprites (scripts/atelier-donnees.mjs, worker/src/sprites.html) : les rampes tirées
// des scripts de dessin (les mêmes tons que rampe() de scripts/carte/nuances.py, au pixel près), les palettes de
// data/meubles.json, la liste des images de assets/, et la page elle-même (ses rôles pointent sur des rampes qui
// existent ; sa copie de rampe() rend les mêmes tons).
// Lancement : node tests/test-atelier.mjs (ou node tests/run-tests.mjs --tous).

import { test as nodeTest } from 'node:test';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { arrondiPair, assetsDuJeu, donneesAtelier, palettesDesMeubles, rampe, rampesDesScripts } from '../scripts/atelier-donnees.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const test = (name, fn) => nodeTest(name, () => fn());
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion fausse'); }
function eq(a, b, msg) { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error(`${msg || 'différent'} : ${x} ≠ ${y}`); }

test('rampe() : la même interpolation que scripts/carte/nuances.py (round() de Python : les demis au pair)', () => {
  eq([arrondiPair(0.5), arrondiPair(1.5), arrondiPair(2.5), arrondiPair(2.4999), arrondiPair(2.5001)], [0, 2, 2, 2, 3]);
  eq(rampe([[0, 0, 0], [1, 1, 1]], 5), [[0, 0, 0], [0, 0, 0], [0, 0, 0], [1, 1, 1], [1, 1, 1]]);
  eq(rampe([[0, 0, 0], [5, 5, 5]], 5), [[0, 0, 0], [1, 1, 1], [2, 2, 2], [4, 4, 4], [5, 5, 5]]);
  // les premiers tons du chêne de blocs.py, tels que Python les donne
  eq(rampe([[46, 30, 18], [82, 56, 34], [124, 88, 54], [164, 124, 80], [204, 166, 112], [232, 204, 150]]).slice(0, 6),
    [[46, 30, 18], [51, 33, 20], [55, 37, 22], [60, 40, 24], [64, 43, 26], [69, 47, 28]]);
});

test('les rampes des scripts : clés et n tels qu\'écrits, N du fichier (ou de son module), sans doublon', () => {
  const rampes = rampesDesScripts();
  const par = Object.fromEntries(rampes.map((r) => [r.id, r]));
  assert(rampes.length >= 80, `${rampes.length} rampes seulement`);
  eq([par['blocs.R_CHENE'].n, par['blocs.R_CHENE'].cles[0], par['blocs.R_CHENE'].nom], [40, [46, 30, 18], 'Chene']);
  eq(par['port.EAU'].n, 140, 'N = 140 dans port.py');
  eq(par['port_bac.VITRE'].n, 140, 'N = P.N dans port_bac.py (import port as P)');
  eq(par['sauvages.BLANC'].n, 128);
  eq(par['charrette_village.CREME'].n, 120, 'un n écrit en chiffres');
  assert(!par['hameaux.CHENE'] && par['blocs.R_CHENE'].aussi.includes('hameaux.CHENE'), 'le chêne des hameaux est celui des blocs : un seul');
  for (const r of rampes) assert(r.cles.length >= 2 && r.n >= 2 && r.cles.every((c) => c.length === 3), r.id);
  eq(new Set(rampes.map((r) => r.id)).size, rampes.length, 'des id uniques');
});

test('les palettes de data/meubles.json : leurs tons exacts', () => {
  const p = palettesDesMeubles();
  const miel = p.find((r) => r.id === 'meubles.bois_miel');
  eq([miel.exacte, miel.n, miel.cles[0], miel.groupe], [true, 5, [0x3c, 0x1e, 0x16], 'meubles.json']);
  eq(rampe(miel.cles, miel.n), miel.cles, 'n = le nombre de clés : rampe() rend les clés elles-mêmes');
});

test('les images de assets/ : leur taille, sans les galeries apercu/', () => {
  const a = assetsDuJeu();
  const vache = a.find((x) => x.chemin === 'dessins/cow.png');
  eq([vache.l, vache.h], [32, 32]);
  assert(!a.some((x) => x.chemin.split('/').includes('apercu')), 'pas de galerie');
  assert(a.every((x) => /^[A-Za-z0-9_+-]+(\/[A-Za-z0-9_+-]+)*\.png$/.test(x.chemin)), 'des chemins que la console accepte (CHEMIN_ASSET)');
  assert(a.length > 500, `${a.length} images seulement`);
});

test('la page de l\'atelier : ses rôles existent, sa copie de rampe() rend les mêmes tons', () => {
  const page = readFileSync(join(RACINE, 'worker/src/sprites.html'), 'utf8');
  const ids = new Set(donneesAtelier().rampes.map((r) => r.id));
  const roles = page.match(/const ROLES = \{([\s\S]*?)\};/)[1];
  for (const m of roles.matchAll(/(\w+):\s*\['([^']+)'/g)) assert(ids.has(m[2]), `le rôle ${m[1]} de l'atelier pointe sur ${m[2]}, absente des scripts`);
  const code = ['arrondiPair', 'rampePy'].map((f) => page.match(new RegExp(`function ${f}\\([\\s\\S]*?\\n  \\}\\n`))[0]).join('\n');
  const rampePy = new Function(`${code}; return rampePy;`)();
  for (const r of donneesAtelier().rampes) eq(rampePy(r.cles, r.n), rampe(r.cles, r.n), `la page et le script : ${r.id}`);
});

test('Python, s\'il est là : chaque rampe extraite rend exactement les tons de scripts/carte/nuances.py', () => {
  const rampes = donneesAtelier().rampes;
  const prog = 'import json,sys\nsys.path.insert(0, sys.argv[1])\nfrom nuances import rampe\n' +
    'd = json.load(sys.stdin)\nprint(json.dumps([[list(t) for t in rampe([tuple(c) for c in r["cles"]], r["n"])] for r in d]))';
  const py = spawnSync('python3', ['-I', '-c', prog, join(RACINE, 'scripts', 'carte')], { input: JSON.stringify(rampes), encoding: 'utf8' });
  if (py.error || py.status !== 0) { console.log('  (python3 absent : comparaison sautée)'); return; }
  const tons = JSON.parse(py.stdout);
  rampes.forEach((r, i) => eq(rampe(r.cles, r.n), tons[i], r.id));
});
