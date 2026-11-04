/* ==========================================================================
   Tests du catalogue du menu Construire (A-2, js/ui/catalogue.js) : les filtres (ce que j'ai, la pièce
   des meubles, le style), l'onglet ⭐ (les favoris puis les récents), les favoris gardés sur l'appareil.
   Ses fonctions sont pures, sauf le stockage (localStorage, simulé ici).
   Lancer seul : node --test tests/engine/catalogue.test.mjs (ou node tests/run-tests.mjs catalogue).
   ========================================================================== */

import { DATA } from '../../js/engine/index.js';
import {
  _oublie, ajouteRecent, basculerFavori, estFavori, filtrer, filtresPossibles, noterRecent, pieceDe, RECENTS_MAX,
  sortesEtoile,
} from '../../js/ui/catalogue.js';
import { assert, assertEqual, test } from './aide.mjs';

const B = DATA.ATELIER.BLOCS;
const MEUBLES = Object.keys(B).filter((k) => B[k].meuble);

// un stockage simulé (localStorage)
function stockage() {
  const m = new Map();
  globalThis.localStorage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  _oublie();
  return m;
}

test('catalogue : chaque meuble a sa pièce (cuisine, salon, chambre), le filtre de pièce les répartit', () => {
  for (const m of MEUBLES) assert(['cuisine', 'salon', 'chambre'].includes(pieceDe(m)), `${m} : ${pieceDe(m)}`);
  const parPiece = ['cuisine', 'salon', 'chambre'].map((p) => filtrer(MEUBLES, { piece: p }, () => 1));
  assertEqual(parPiece.reduce((n, l) => n + l.length, 0), MEUBLES.length, 'chaque meuble dans une seule pièce');
  assert(parPiece.every((l) => l.length >= 5), 'au moins 5 meubles par pièce');
  assertEqual(filtrer(['mur_pierre', 'meuble_chaise'], { piece: 'cuisine' }, () => 1), ['meuble_chaise'], 'un mur n\'a pas de pièce');
});

test('catalogue : « ce que j\'ai » cache les épuisés ; le style garde ses blocs ; les filtres se combinent', () => {
  const n = { meuble_chaise: 2, meuble_table: 0, meuble_lit_adulte: 1 };
  assertEqual(filtrer(Object.keys(n), { possede: true }, (s) => n[s]), ['meuble_chaise', 'meuble_lit_adulte']);
  const champetre = new Set(DATA.STYLES.LISTE.champetre.blocs);
  const vus = filtrer(MEUBLES, { style: 'champetre' }, () => 1);
  assert(vus.length > 3 && vus.every((s) => champetre.has(s)), vus.join(' '));
  assertEqual(filtrer(MEUBLES, { style: 'champetre', piece: 'cuisine', possede: true }, (s) => (s === 'meuble_table' ? 1 : 0)), ['meuble_table']);
  assertEqual(filtrer(MEUBLES, {}, () => 0).length, MEUBLES.length, 'sans filtre : tout');
  // les filtres proposés : ceux qui ont un sens pour l'onglet
  const p = filtresPossibles(MEUBLES);
  assertEqual(p.pieces.map((x) => x.id), ['cuisine', 'salon', 'chambre']);
  assert(p.styles.length >= 2);
  assertEqual(filtresPossibles(['mur_pierre', 'porte']).pieces, [], 'pas de pièce pour les murs');
});

test('catalogue : les récents (en tête, sans doublon, 6 au plus) ; l\'onglet ⭐ : favoris puis récents, disponibles', () => {
  let r = [];
  for (const s of ['mur_pierre', 'porte', 'meuble_chaise', 'porte']) r = ajouteRecent(r, s);
  assertEqual(r, ['porte', 'meuble_chaise', 'mur_pierre']);
  for (const s of MEUBLES.slice(0, 10)) r = ajouteRecent(r, s);
  assertEqual(r.length, RECENTS_MAX);
  assertEqual(sortesEtoile(['a', 'b', 'c', 'd'], ['c', 'x'], ['d', 'c', 'a']), ['c', 'd', 'a'], 'un favori indisponible ne se montre pas ; un favori n\'est pas répété');
  assertEqual(sortesEtoile(['a'], [], []), []);
});

test('catalogue : les favoris et les récents sont gardés sur l\'appareil ; un stockage abîmé ou absent ne gêne pas', () => {
  const m = stockage();
  assertEqual([estFavori('meuble_chaise'), basculerFavori('meuble_chaise'), estFavori('meuble_chaise')], [false, true, true]);
  basculerFavori('porte');
  noterRecent('mur_pierre');
  _oublie();   // (une nouvelle visite : relus du stockage)
  assertEqual(sortesEtoile(['porte', 'meuble_chaise', 'mur_pierre', 'plancher']), ['meuble_chaise', 'porte', 'mur_pierre']);
  assertEqual(basculerFavori('meuble_chaise'), false, 'retiré');
  assertEqual(JSON.parse(m.get('ferme-construire-favoris')), ['porte']);
  assertEqual(basculerFavori('pas_un_bloc'), false, 'un bloc inconnu n\'entre pas');
  m.set('ferme-construire-favoris', 'pas du json');
  m.set('ferme-construire-recents', JSON.stringify(['inconnu', 'porte', 42]));
  _oublie();
  assertEqual(sortesEtoile(['porte', 'mur_pierre']), ['porte'], 'abîmé : vide ; les inconnus sont ignorés');
  globalThis.localStorage = { getItem: () => { throw new Error('refusé'); }, setItem: () => { throw new Error('refusé'); } };
  _oublie();
  assertEqual([basculerFavori('porte'), estFavori('porte')], [true, true], 'stockage refusé : pour cette visite');
  delete globalThis.localStorage;
});
