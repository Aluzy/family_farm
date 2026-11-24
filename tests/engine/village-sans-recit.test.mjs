/* ==========================================================================
   Tests de la bascule (fiche I9h, docs/ile.md D16) : le récit, les hameaux et la calèche retirés du jeu.
   - les fichiers : les modules du récit, des hameaux et de la calèche n'existent plus, et aucun fichier du jeu
     (js/, worker/src/) ne les importe ; les données n'ont plus leurs sections ;
   - une partie neuve de l'île, 30 nuits du joueur automatique : sans erreur, rien du récit (ni fait, ni courrier),
     la pousse de toujours (plus de pierre de lune), l'amitié des seuls villageois, à son échelle.
   Ce qui reste du jeu d'avant pour les anciennes parties est dans js/engine/migration-avant.js et
   js/engine/migration-ile.js.
   Lancer seul : node tests/run-tests.mjs village-sans-recit
   ========================================================================== */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commencerObjectifs, composeFamily, createNewGame, DATA, familleSeule, finishSetup, moonPhase, simulatePlay } from '../../js/engine/index.js';
import { palierAmitieNom, pointsAmitie } from '../../js/engine/amitie.js';
import { relationsInvitables } from '../../js/engine/invitations.js';
import { heuresPousse } from '../../js/engine/crops.js';
import { assert, assertEqual, test } from './aide.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..', '..');

// Les modules retirés à la bascule. (engine/ile.js, le récit de l'île, retiré lui aussi : le nom sert de nouveau à la
// carte de l'île de 300 × 300, docs/ile-300.md ; de même la clé ILE des données.)
const RETIRES = [
  'engine/recit.js', 'engine/recit-aiguillage.js', 'engine/recit-ancien.js', 'engine/recit-muet.js', 'engine/fil-lune.js',
  'engine/secrets.js', 'engine/bienvenue.js', 'engine/usure.js', 'engine/habitants.js', 'engine/caleche.js',
  'engine/caleche-tournee.js', 'engine/projets.js', 'engine/fetes.js',
  'ui/caleche.js', 'ui/habitants.js', 'ui/bienvenue.js', 'ui/carnet.js', 'ui/scene.js', 'ui/fetes.js', 'ui/village.js',
  'carte/ferme/caleche.js', 'carte/ferme/malle.js', 'carte/ferme/visite.js', 'carte/ferme/rencontre.js',
];

// Tous les fichiers .js et .mjs de `dossier` (récursivement, sans les générés).
function fichiers(dossier, out = []) {
  for (const e of readdirSync(dossier, { withFileTypes: true })) {
    const p = join(dossier, e.name);
    if (e.isDirectory()) fichiers(p, out);
    else if (/\.m?js$/.test(e.name) && !e.name.endsWith('.generated.js')) out.push(p);
  }
  return out;
}

test('les modules du récit, des hameaux et de la calèche sont retirés, et rien ne les importe', () => {
  for (const f of RETIRES) assert(!existsSync(join(RACINE, 'js', f)), `js/${f} existe encore`);
  const fautifs = [];
  const L = [...fichiers(join(RACINE, 'js')), ...fichiers(join(RACINE, 'worker', 'src'))];
  assert(L.length > 150, `les fichiers du jeu (${L.length})`);
  const retires = new Set(RETIRES.map((r) => join(RACINE, 'js', r)));
  for (const f of L) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.[^'"]+)['"]/g)) if (retires.has(join(dirname(f), m[1]))) fautifs.push(`${f} → ${m[1]}`);
  }
  assertEqual(fautifs, [], 'un fichier importe un module retiré');
  for (const s of ['<script src="js/carte/ferme/caleche.js"', '<script src="js/carte/ferme/malle.js"', '<script src="js/carte/ferme/visite.js"', '<script src="js/carte/ferme/rencontre.js"']) {
    assert(!readFileSync(join(RACINE, 'jeu.html'), 'utf8').includes(s), `jeu.html charge encore ${s}`);
  }
});

test('les données n\'ont plus le récit, le courrier, les hameaux d\'avant ni la calèche', () => {
  for (const k of ['RECIT', 'SECRETS', 'COURRIER', 'CALECHE', 'BIENVENUE', 'PROJETS', 'FETES']) assertEqual(DATA[k], undefined, k);
  for (const o of ['enveloppe_maurice', 'cloche_maurice', 'pierre_lune']) assertEqual(DATA.OBJETS[o], undefined, o);
  assertEqual(DATA.AMITIE.ECRITS, undefined, 'les goûts des personnages écrits');
  assertEqual(DATA.STYLES.ECRITS, undefined, 'les styles des personnages écrits');
  assertEqual(DATA.VILLAGE.ACTIF, undefined, 'le réglage de bascule');
});

test('une partie neuve de l\'île : 30 nuits du joueur automatique, sans rien du récit', () => {
  const s = createNewGame(4);
  assert(composeFamily(s, familleSeule(s)).ok, 'la famille');
  assert(finishSetup(s).ok, 'installée');
  commencerObjectifs(s);
  const rows = simulatePlay(s, 'applique', 30);
  assertEqual(rows.length, 30, '30 nuits');
  let pleine = false;
  for (let j = 1; j <= s.day; j++) if (moonPhase(j).id === 'pleine') pleine = true;
  assert(pleine, 'une pleine lune passée');
  assertEqual((s.courrier || []).length, 0, 'aucun courrier');
  assertEqual(Object.keys((s.recit && s.recit.faits) || {}), [], 'aucun fait du récit');
  assertEqual(heuresPousse(s), DATA.TEMPS.POUSSE_HEURES, 'la pousse de toujours (pas de pierre de lune)');
  assert(s.day >= 31 && s.palier >= 3, `la partie avance (jour ${s.day}, palier ${s.palier})`);
  // (l'amitié a son échelle : data/amitie.json ECHELLE ; les villageois seuls)
  const v = (s.villageois || [])[0];
  if (v) assert(DATA.AMITIE.ECHELLE.NOMS.includes(palierAmitieNom(s, v.id)) && pointsAmitie(s, v.id) <= DATA.AMITIE.ECHELLE.MAX, 'le palier d\'amitié d\'un villageois');
  assert(relationsInvitables(s).every((r) => r.villageois), 'on n\'invite que des villageois');
  assert(relationsInvitables(s).every((r) => DATA.AMITIE.ECHELLE.NOMS.includes(r.nomPalier)), 'les noms des paliers d\'amitié');
});
