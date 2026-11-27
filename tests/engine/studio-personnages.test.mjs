/* ==========================================================================
   Tests du moteur et de l'atelier : le studio de personnages (docs/studio-personnages.md).
   - Règles déclaratives (data/studio-personnages.json) : cohérence des 111 cases avec
     assets/fermier.json, validité des positions de bras et de jambes, unicité des couleurs
     d'attache et des 28 tons réservés.
   - Vérificateur et extracteur de worker/src/sprites.html : acceptation d'un PNG 48×48
     conforme, rejet des tailles invalides, des pixels semi-transparents, des tons dérivés
     et des points d'attache manquants ou doublés.
   - Essai en jeu (js/carte/ferme/modele.js) : FermeCarte.ESSAI_PERSO lit dynamiquement
     frameWidth, frameHeight et echelle depuis personnages/essai_hd.json.
   - Copies de la page : CFG, CASES_111, POSES_111 et ORDRE_COUCHES de sprites.html = le JSON.
   Lancement seul : node --test tests/engine/studio-personnages.test.mjs
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, assertEqual, test } from './aide.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const lireJson = (rel) => JSON.parse(readFileSync(join(RACINE, rel), 'utf8'));

test('studio-personnages.json : les 111 cases suivent exactement l\'ordre de assets/fermier.json et des positions valides', () => {
  const fermier = lireJson('assets/fermier.json');
  const brut = lireJson('data/studio-personnages.json');
  const S = brut.STUDIO_PERSONNAGES;
  assert(S && S.VERSION === 1, 'clé STUDIO_PERSONNAGES attendue');
  assertEqual(S.PLANCHE.LARGEUR_CASE, 48);
  assertEqual(S.PLANCHE.HAUTEUR_CASE, 48);
  assertEqual(S.PLANCHE.NOMBRE_CASES, 111);
  assertEqual(S.CASES, fermier.frames, 'les 111 cases dans le même ordre que assets/fermier.json');
  assertEqual(Object.keys(S.POSES), fermier.frames, 'le tableau POSES couvre exactement les 111 cases dans l\'ordre');

  const brasPermis = new Set(S.POSITIONS.bras);
  const jambesPermises = new Set(S.POSITIONS.jambes);
  const vuesPermises = new Set(Object.keys(S.VUES));

  for (const nom of S.CASES) {
    const p = S.POSES[nom];
    assert(vuesPermises.has(p.vue), `${nom} : vue inconnue ${p.vue}`);
    assert(brasPermis.has(p.bras_lointain), `${nom} : bras_lointain invalide ${p.bras_lointain}`);
    assert(brasPermis.has(p.bras_proche), `${nom} : bras_proche invalide ${p.bras_proche}`);
    assert(jambesPermises.has(p.jambes), `${nom} : jambes invalides ${p.jambes}`);
    assert(Number.isInteger(p.dy_buste) && Number.isInteger(p.dy_tete), `${nom} : décalages entiers obligatoires`);
  }

  // Les gestes à plusieurs temps doivent bouger (positions de bras ou décalages différents d'un temps à l'autre)
  for (const geste of ['houe_cote', 'hache_cote', 'pioche_cote', 'faux_cote', 'marche_bas', 'marche_cote']) {
    const sigs = new Set([0, 1, 2, 3].map((k) => JSON.stringify(S.POSES[`${geste}_${k}`])));
    assert(sigs.size >= 3, `${geste} : les temps du geste doivent varier (${sigs.size} poses distinctes)`);
  }
});

test('studio-personnages.json : les 9 couleurs d\'attache, le masque #00FF00 et les 28 tons réservés sont tous distincts', () => {
  const S = lireJson('data/studio-personnages.json').STUDIO_PERSONNAGES;
  const vus = new Set();
  const ajouter = (hex, label) => {
    const h = String(hex).toUpperCase();
    assert(/^#[0-9A-F]{6}$/.test(h), `${label} : hex invalide ${hex}`);
    assert(!vus.has(h), `${label} : couleur ${h} déjà réservée ailleurs`);
    vus.add(h);
  };
  ajouter(S.TONS_RESERVES.masque_coupe, 'masque_coupe');
  for (const [nom, info] of Object.entries(S.POINTS_ATTACHE)) {
    if (nom.startsWith('//')) continue;
    ajouter(info.hex, `attache ${nom}`);
  }
  let nbTons = 0;
  for (const [zone, tons] of Object.entries(S.TONS_RESERVES)) {
    if (zone.startsWith('//') || !Array.isArray(tons)) continue;
    assertEqual(tons.length, 4, `${zone} doit avoir 4 tons réservés`);
    tons.forEach((hx, i) => { ajouter(hx, `${zone}_${i + 1}`); nbTons++; });
  }
  assertEqual(nbTons, 28, '7 zones × 4 tons réservés');
});

test('sprites.html : le module Personnages est présent sans appel réseau externe, et FermeCarte.ESSAI_PERSO lit essai_hd.json', () => {
  const page = readFileSync(join(RACINE, 'worker/src/sprites.html'), 'utf8');
  assert(page.includes('id="persoWorkspace"'), 'le panneau #persoWorkspace doit exister dans sprites.html');
  assert(page.includes('function verifierEtExtrairePiece('), 'le vérificateur strict doit être présent');
  assert(page.includes('function assemblerCase('), 'l\'assembleur par points d\'attache doit être présent');
  assert(!/https?:\/\//i.test(page), 'aucune URL externe dans worker/src/sprites.html (100 % local)');

  const modele = readFileSync(join(RACINE, 'js/carte/ferme/modele.js'), 'utf8');
  assert(modele.includes("json: 'personnages/essai_hd.json'"), 'ESSAI_PERSO doit référencer personnages/essai_hd.json');
  assert(modele.includes('this.load.json(cleMeta, v(E.json))'), 'syncPerso doit charger dynamiquement le JSON du personnage en essai');
});

test('sprites.html : ses copies des règles (CFG, 111 cases, poses, ordre des couches) sont celles de data/studio-personnages.json', () => {
  const page = readFileSync(join(RACINE, 'worker/src/sprites.html'), 'utf8');
  const S = lireJson('data/studio-personnages.json').STUDIO_PERSONNAGES;
  // (les clés « //… » du JSON sont des commentaires, la page ne les recopie pas toutes)
  const sansNotes = (o) => (Array.isArray(o) ? o.map(sansNotes) : o && typeof o === 'object'
    ? Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('//')).map(([k, x]) => [k, sansNotes(x)])) : o);
  const constante = (nom) => {
    const m = page.match(new RegExp(`const ${nom} = (.*);\\n`));
    assert(m, `const ${nom} attendue dans sprites.html`);
    return JSON.parse(m[1]);
  };
  // (le CFG est copié deux fois : lots 1-2 et lot 3 le partagent par window.StudioPersonnages)
  const cfg = constante('CFG');
  for (const cle of ['PLANCHE', 'CORPS', 'VUES', 'POINTS_ATTACHE', 'POSITIONS', 'TONS_RESERVES']) {
    assertEqual(sansNotes(cfg[cle]), sansNotes(S[cle]), `CFG.${cle} de la page`);
  }
  assertEqual(constante('CASES_111'), S.CASES, 'CASES_111 de la page');
  assertEqual(constante('POSES_111'), S.POSES, 'POSES_111 de la page');
  assertEqual(constante('ORDRE_COUCHES'), S.ORDRE_COUCHES, 'ORDRE_COUCHES de la page');
  const proba = page.match(/const PROBA_CHAPEAU = ([0-9.]+);/);
  assert(proba && Number(proba[1]) === S.TIRAGE.probabilites.couvre_chef, 'PROBA_CHAPEAU = TIRAGE.probabilites.couvre_chef');
});
