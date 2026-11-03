/* ==========================================================================
   Tests du moteur : la version du générateur de la ferme et du grand monde (base.js,
   GENERATEUR_VERSION ; state.carte.generateur). Une partie la note à côté de sa graine ; l'empreinte
   du monde d'une graine (la ferme, le plan, quelques régions de sol) est relevée pour chaque version :
   si le générateur change sans que GENERATEUR_VERSION change, ce test échoue.
   Lancer seul : node --test tests/engine/generateur.test.mjs (ou node tests/run-tests.mjs generateur).
   ========================================================================== */

import {
  contexteSol, createInitialState, GENERATEUR_VERSION, genererFerme, genererMonde, migrate, MONDE,
  planDuMonde, reparerPartie, setFarmSeed, solDeRegion, STATE_VERSION,
} from '../../js/engine/index.js';
import { assert, assertEqual, test } from './aide.mjs';

// L'empreinte du monde de la graine EMPREINTE_GRAINE, pour chaque version du générateur.
//
// Ce test échoue ? Le monde d'une graine a changé (le code ou les réglages du générateur). Si c'est
// voulu : augmente GENERATEUR_VERSION (js/engine/base.js), ajoute une migration qui décide du sort des
// parties faites avec l'ancien générateur (js/engine/state.js), puis ajoute ici l'empreinte de la
// nouvelle version (le message d'échec la donne). Ne réécris jamais l'empreinte d'une version passée :
// les parties qui portent son numéro ont été faites avec ce monde-là.
const EMPREINTE_GRAINE = 'empreinte-1';
const EMPREINTES = {
  1: { ferme: '4e86e112', plan: '311f63df', regions: { '3,3': '0971c50b', '0,0': '313201a6', '8,6': 'd2232693', '5,1': '0424fc2d', '1,1': 'b8b121e2' } },
};

// Une empreinte FNV-1a (32 bits) d'une valeur : nombres, textes, listes, tableaux typés, objets (clés
// triées : l'ordre d'écriture n'y change rien).
function empreinte(v) {
  let h = 0x811c9dc5;
  const mix = (s) => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } };
  const marche = (x) => {
    if (ArrayBuffer.isView(x)) { mix('['); for (const n of x) mix(String(n) + ','); mix(']'); return; }
    if (Array.isArray(x)) { mix('['); for (const e of x) { marche(e); mix(','); } mix(']'); return; }
    if (x && typeof x === 'object') { mix('{'); for (const k of Object.keys(x).sort()) { mix(k + ':'); marche(x[k]); mix(','); } mix('}'); return; }
    mix(typeof x === 'string' ? JSON.stringify(x) : String(x));
  };
  marche(v);
  return (h >>> 0).toString(16).padStart(8, '0');
}

// L'empreinte du monde d'une graine : la ferme générée, le plan du monde, et le sol de quelques régions
// (celle de la ferme, un coin, le sud-est, le nord, celle du premier hameau). La durée d'une région
// (`ms`) n'en fait pas partie.
function empreinteDuMonde(graine) {
  const ferme = empreinte(genererFerme(graine));
  const { biome, relief, humidite, rivieres, finRivieres, lacs, chemins, lieux } = planDuMonde(graine);
  const plan = empreinte({ biome, relief, humidite, rivieres, finRivieres, lacs, chemins, lieux });
  const M = genererMonde(graine).terrain.MONDE;
  const ctx = contexteSol(M.graine, M.cadre, M.ferme, M.taille);
  const h = lieux.hameaux[0].case, R = MONDE.REGION;
  const cles = ['3,3', '0,0', '8,6', '5,1', Math.floor((h % MONDE.LARGEUR) / R) + ',' + Math.floor(Math.floor(h / MONDE.LARGEUR) / R)];
  const regions = {};
  for (const cle of cles) {
    const [rx, ry] = cle.split(',').map(Number);
    const { ms, ...r } = solDeRegion(ctx, rx, ry);
    regions[cle] = empreinte(r);
  }
  return { ferme, plan, regions };
}

test('le générateur : le monde d\'une graine est celui qu\'a relevé sa version (GENERATEUR_VERSION)', () => {
  const vu = empreinteDuMonde(EMPREINTE_GRAINE);
  const attendu = EMPREINTES[GENERATEUR_VERSION];
  assert(attendu, `aucune empreinte pour la version ${GENERATEUR_VERSION} du générateur : ajoute ${GENERATEUR_VERSION}: ${JSON.stringify(vu)} à EMPREINTES`);
  assertEqual(vu, attendu, `le monde de la graine « ${EMPREINTE_GRAINE} » a changé sans que GENERATEUR_VERSION change (js/engine/base.js) : voir l'en-tête de EMPREINTES (obtenu ${JSON.stringify(vu)})`);
});

test('le générateur : une partie neuve et une partie qui change de ferme notent sa version', () => {
  const s = createInitialState(7);
  assertEqual(s.carte.generateur, GENERATEUR_VERSION);
  assertEqual(Object.keys(s.carte), ['graine', 'generateur']);
  setFarmSeed(s, 'autre');
  assertEqual(s.carte, { graine: 'autre', generateur: GENERATEUR_VERSION });
});

test('le générateur : une partie d\'avant (v69) reçoit le premier numéro, rien d\'autre ne change', () => {
  const neuve = createInitialState(7);
  const { generateur, ...carte69 } = neuve.carte;
  const v69 = { ...JSON.parse(JSON.stringify(neuve)), version: 69, carte: carte69 };
  const m = migrate(v69);
  assertEqual([m.version, m.carte], [STATE_VERSION, { graine: carte69.graine, generateur: 1 }]);
  const { carte: a, version: va, ...resteA } = m, { carte: b, version: vb, ...resteB } = JSON.parse(JSON.stringify(neuve));
  assertEqual(resteA, resteB, 'le reste de la partie est intact');
  // (sans carte : la migration n'en invente pas ; la réparation lui en donne une, du générateur actuel)
  const sansCarte = { ...JSON.parse(JSON.stringify(neuve)), version: 69 };
  delete sansCarte.carte;
  assertEqual(migrate(sansCarte).carte.generateur, GENERATEUR_VERSION);
});

test('le générateur : une partie réparée retrouve un numéro valide', () => {
  for (const faux of [undefined, null, 0, -1, 1.5, '1']) {
    const s = createInitialState(7);
    if (faux === undefined) delete s.carte.generateur; else s.carte.generateur = faux;
    assertEqual(reparerPartie(s).carte, { graine: s.carte.graine, generateur: 1 }, `generateur ${JSON.stringify(faux)}`);
  }
  const ok = createInitialState(7);
  assertEqual(reparerPartie(ok).carte.generateur, GENERATEUR_VERSION, 'un numéro valide est gardé');
});
