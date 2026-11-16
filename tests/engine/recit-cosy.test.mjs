/* ==========================================================================
   Tests du moteur : le récit cosy (la réécriture de novembre 2026 ; le récit est retiré à la bascule, I9h).
   - aucun texte qui reste (les phrases et les propos, les demandes, les paliers) ne parle de Johnny, du notaire,
     d'un deuil, de l'hiver, ni de partir de l'île ;
   - la migration 72 → 73 (une ancienne partie la passe encore) : les faits, les pages du carnet, les scènes dites et
     les lettres reçues prennent leurs nouveaux noms ; Théo revient à Bois-Joli ; Odile tutoie.
   Lancer seul : node --test tests/engine/recit-cosy.test.mjs (ou node tests/run-tests.mjs recit-cosy).
   ========================================================================== */

import { createInitialState, DATA, migrate, RECIT_RENOMMAGES, STATE_VERSION } from '../../js/engine/index.js';
import { assert, assertEqual, test } from './aide.mjs';

// Toutes les chaînes d'une valeur (sans les commentaires « // »).
function textes(v, out = [], cle = '') {
  if (typeof v === 'string') { if (!cle.startsWith('//')) out.push(v); }
  else if (Array.isArray(v)) v.forEach((x) => textes(x, out, cle));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) textes(x, out, k.startsWith('//') ? k : cle);
  return out;
}

test('récit cosy : ni Johnny, ni notaire, ni deuil, ni hiver, ni départ', () => {
  const T = [
    ...textes(DATA.HABITANTS.PHRASES), ...textes(DATA.HABITANTS.PROPOS), ...textes(DATA.DEMANDES), ...textes(DATA.CHAPITRES),
    ...textes(DATA.VILLAGE),
  ];
  assert(T.length > 300, `${T.length} textes`);
  const interdits = [/Johnny/, /notaire/i, /\bmort\b|décéd|deuil|veuf/i, /hiver/i, /je vais partir|il prend le bac demain|quitter l'île/i, /vieux fou/i];
  for (const t of T) for (const re of interdits) assert(!re.test(t), `« ${t} » (${re})`);
});

test('récit cosy : la migration 72 → 73 renomme ce que la partie garde ; Théo revient ; Odile tutoie', () => {
  const neuve = createInitialState(7);
  const v72 = JSON.parse(JSON.stringify({ ...neuve, version: 72 }));
  v72.recit = {
    faits: { 'odile.rencontre': [3, 3, 1], 'theo.part': [20, 20, 1], 'theo.parti': [21, 21, 1], 'fin.riche': [40, 40, 1], 'johnny.repas': [10, 12, 3], 'johnny.visite': [10, 12, 4], 'johnny.pierre': [30, 30, 1] },
    relations: {}, confiance: {}, promesses: {},
    dites: { maurice_fortune: 22, note_j: 25, 'odile.vous': 4, 'basile.theo_parti': 23, fete_riche: 40 },
    carnet: ['carnet_promesses', 'note_j', 'page_bord', 'johnny_croissante', 'johnny_pleine', 'johnny_noire'],
  };
  v72.courrier = [{ id: 'notaire_heritage', nuit: 1, lu: true }, { id: 'theo_cadolon', nuit: 25, lu: false }, { id: 'notaire_legs', nuit: 30, lu: true }, { id: 'adele_fete_riche', nuit: 41, lu: false }];
  const m = migrate(v72);
  assertEqual(m.version, STATE_VERSION);
  const F = m.recit.faits;
  assertEqual([F['theo.frida'], F['fin.genereuse'], F['observatoire.nuit'], F['observatoire.pierre'], F['odile.tutoie']], [[20, 20, 1], [40, 40, 1], [10, 12, 3], [30, 30, 1], [3, 3, 1]]);
  for (const ancien of ['theo.part', 'theo.parti', 'fin.riche', 'johnny.repas', 'johnny.visite', 'johnny.pierre']) assertEqual(F[ancien], undefined, ancien);
  assertEqual(m.recit.carnet, ['carnet_promesses', 'note_etoile', 'journal_bord', 'ciel_croissante', 'ciel_pleine', 'ciel_noire']);
  const trie = (o) => Object.fromEntries(Object.entries(o).sort((x, y) => (x[0] < y[0] ? -1 : 1)));
  assertEqual(trie(m.recit.dites), trie({ maurice_tournee: 22, note_etoile: 25, 'odile.bonjour': 4, 'basile.theo_frida': 23, fete_genereuse: 40 }));
  assertEqual(m.courrier.map((l) => l.id), ['maurice_terre', 'maurice_enveloppe', 'adele_fete_genereuse']);
  // (les renommages, figés dans la migration : les nouveaux noms sont ceux qu'elle a écrits)
  assertEqual([RECIT_RENOMMAGES.pages.note_j, RECIT_RENOMMAGES.lettres.adele_fete_riche, RECIT_RENOMMAGES.dites.fete_riche], ['note_etoile', 'adele_fete_genereuse', 'fete_genereuse']);
  // une partie neuve n'y perd rien
  const { version: a, ...ra } = migrate({ ...JSON.parse(JSON.stringify(neuve)), version: 72 }), { version: b, ...rb } = JSON.parse(JSON.stringify(neuve));
  assertEqual(ra, rb);
});
