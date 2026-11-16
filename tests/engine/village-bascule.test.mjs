/* ==========================================================================
   Tests de la bascule (fiche I9h : la répétition, l'allumage, le retrait ; docs/ile.md) :
   - la version 2.0.0 ;
   - une partie de main (le jeu d'avant tel qu'il est publié, format 86, version 1.22.0 : tests/engine/parties-main.json),
     avec une maison au niveau 2 meublée (l'étage, le niveau 2, sa cuisinière, sa paillasse, sa fenêtre haute, son
     tableau, son papier peint), passe sur l'île à son ouverture : sa ferme identique à celle de la même partie mise au
     format sans passer sur l'île (migrate, ile: false), l'étage et les niveaux du dessus compris, la station du niveau 2 toujours là ; puis elle joue
     trois nuits du joueur automatique, s'enregistre et se relit à l'identique ;
   - le script de la répétition (scripts/repetition-bascule.mjs) passe sur les parties gardées.
   Lancer seul : node tests/run-tests.mjs village-bascule
   ========================================================================== */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  assurerTroncon, couchages, DATA, etageBlocs, fermerRetourIle, GAME_VERSION, lignesRetour, migrate, migrationIleDue, partieDAvant,
  simulatePlay, STATE_VERSION,
} from '../../js/engine/index.js';
import { assert, assertEqual, test } from './aide.mjs';

const MAIN = JSON.parse(readFileSync(new URL('./parties-main.json', import.meta.url), 'utf8'));
const copie = (o) => structuredClone(o);
const ouvrir = (p) => migrate({ v: p.v, t: p.t, s: copie(p.s) });
const FERME = ['blocs', 'sols', 'hauteurs', 'rehausses', 'fenetres', 'blocsDessus', 'meubles', 'etage', 'niveauxHauts', 'papiersNiveau2', 'litPrincipal'];
const empreinte = (s) => JSON.stringify(FERME.map((k) => s[k] ?? null).concat([(s.potager && s.potager.parcelles) || []]));

test('la bascule : la version 2.0.0', () => {
  assertEqual(GAME_VERSION, '2.0.0');
});

test('une partie de main avec un niveau 2 meublé passe sur l\'île, sa maison intacte, puis se joue', () => {
  for (const [nom, p] of Object.entries(MAIN)) {
    if (nom.startsWith('/')) continue;
    assertEqual([p.jeu, p.v], ['1.22.0', 86], `${nom} : une sauvegarde de main`);
    assert(p.s.niveauxHauts && p.s.niveauxHauts[2] && Object.keys(p.s.niveauxHauts[2].blocs).length >= 2, `${nom} : un niveau 2 meublé`);
    const off = migrate({ v: p.v, t: p.t, s: copie(p.s) }, STATE_VERSION, { ile: false }), m = ouvrir(p);
    assert(partieDAvant(off) && !partieDAvant(m) && !migrationIleDue(m), `${nom} : passée sur l'île, une fois`);
    assertEqual(m.version, STATE_VERSION, `${nom} : le format`);
    assertEqual(empreinte(m), empreinte(off), `${nom} : la ferme, l'étage et le niveau 2`);
    assertEqual(etageBlocs(m, 2), etageBlocs(off, 2), `${nom} : ce qui est posé au niveau 2`);
    assertEqual([m.stations.cuisine.construit, couchages(m).filter((c) => String(c).startsWith('etage2:')).length], [off.stations.cuisine.construit, 1], `${nom} : la cuisinière et la paillasse du niveau 2`);
    assert(m.pieces >= off.pieces && m.port && m.port.niveau === DATA.PORT.NIVEAU_DEPART, `${nom} : le port ; les pièces`);
    assertEqual(lignesRetour(m).lignes.length, 5, `${nom} : la fenêtre du retour`);
    // (une seconde ouverture ne change rien)
    assertEqual(migrate({ v: m.version, t: 0, s: copie(m) }), m, `${nom} : une seule fois`);
    assertTrois(nom, m);
  }
});

function assertTrois(nom, m) {
  assert(assurerTroncon(m), `${nom} : le tronçon posé`);
  fermerRetourIle(m);
  const niveau2 = JSON.stringify(m.niveauxHauts);
  const rows = simulatePlay(m, 'applique', 3);
  assertEqual(rows.length, 3, `${nom} : trois nuits`);
  assert(rows.every((r) => Number.isFinite(r.pieces) && r.pieces >= 0), `${nom} : l'argent`);
  assertEqual(JSON.stringify(m.niveauxHauts), niveau2, `${nom} : le niveau 2 reste`);
  assertEqual(migrate(JSON.parse(JSON.stringify({ v: m.version, t: 0, s: m }))), JSON.parse(JSON.stringify(m)), `${nom} : enregistrée et relue à l'identique`);
}

test('la répétition (scripts/repetition-bascule.mjs) : toutes les parties gardées passent', () => {
  const script = fileURLToPath(new URL('../../scripts/repetition-bascule.mjs', import.meta.url));
  const r = spawnSync(process.execPath, [script, '--nuits', '2'], { encoding: 'utf8' });
  assertEqual(r.status, 0, `${r.stdout.split('\n').filter((l) => /ÉCHEC|✗/.test(l)).join(' | ')} ${r.stderr}`);
  assert(/Toutes les parties passent sur 11\./.test(r.stdout), r.stdout.slice(-300));
});
