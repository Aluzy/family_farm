#!/usr/bin/env node
// Le poids d'une île en ligne (fiche I9a ; docs/monde-partage.md, « L'île partagée » ; docs/ile.md).
//
// Le joueur automatique (le chantier « l'île à bâtir » allumé, la stratégie « applique ») joue une partie neuve ; on
// la pèse à trois moments (début, milieu, avancée) : la partie complète, la copie que le monde en garde (worker/src/
// monde.mjs, MondeRegistre.creer), ce que pèse l'île hors de la ferme, le village, et ce qui se recalcule de la graine
// au lieu de se garder. Puis on compare au plafond (data/village.json, VILLAGE.EN_LIGNE).
//
//   node scripts/poids-ile.mjs                     # graine 1, aux nuits 10, 40 et 80
//   node scripts/poids-ile.mjs --graine 7 --nuits 10,40,120
//
// Code de sortie : 0 si chaque partie tient le plafond, 1 sinon.

import { gzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { ROOT, engineUrl } from './lib/engine-source.mjs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const args = process.argv.slice(2);
const option = (nom, defaut) => { const i = args.indexOf(`--${nom}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : defaut; };
const graine = Math.floor(Number(option('graine', 1)));
const moments = String(option('nuits', '10,40,80')).split(',').map(Number).filter((n) => n > 0).sort((a, b) => a - b);
const NOMS = ['début', 'milieu', 'avancée'];

const E = await import(engineUrl(ROOT));
const { MondeRegistre } = await import(pathToFileURL(join(ROOT, 'worker', 'src', 'monde.mjs')).href);
const MS = await import(pathToFileURL(join(ROOT, 'js', 'engine', 'monde-sol.js')).href);
E.DATA.VILLAGE.ACTIF = true;
const PLAFOND = E.DATA.VILLAGE.EN_LIGNE;
const ko = (n) => (n / 1024).toFixed(1);
const taille = (v) => (v === undefined ? 0 : JSON.stringify(v).length);

// La copie que le monde garde d'une partie mise en ligne (la base du Durable Object : node:sqlite).
function copieDuMonde(s) {
  const db = new DatabaseSync(':memory:');
  const r = new MondeRegistre({ exec(q, ...v) { const x = db.prepare(q).all(...v); return { toArray: () => x }; } });
  const c = r.creer({ proprietaire: 'poids', partie: { v: s.version, t: 0, s: JSON.parse(JSON.stringify(s)) } });
  if (!c.ok) throw new Error(c.erreur);
  return r.charger();
}

// Ce que pèse l'île hors de la ferme dans la partie `s` : [[quoi, octets]].
function dehors(s) {
  const T = E.farmTerrain(s);
  const dansLaFerme = (c) => E.caseDansLaFerme(s, c);
  const out = [['le monde (vu, régions vues, pris, case, boussole)', taille(s.monde)]];
  for (const k of ['blocs', 'sols', 'hauteurs', 'blocsDessus', 'rehausses', 'sens', 'solsEtage']) {
    const h = Object.fromEntries(Object.entries(s[k] || {}).filter(([c]) => /^\d+$/.test(c) && !dansLaFerme(Number(c))));
    if (Object.keys(h).length) out.push([`${k} dehors (${Object.keys(h).length} cases)`, taille(h)]);
  }
  const W = T.LARGEUR, herbes = Object.fromEntries(Object.entries((s.outils && s.outils.herbes) || {}).filter(([id]) => { const [x, y] = id.split(',').map(Number); return !dansLaFerme(Math.floor((y - 1) / 16) * W + Math.floor(x / 16)); }));
  out.push([`herbes fauchées dehors (${Object.keys(herbes).length})`, taille(herbes)]);
  const pris = ((s.cueillette && s.cueillette.pris) || []).filter((id) => !dansLaFerme(Number(String(id).split(':').pop())));
  out.push([`cueillette prise dehors (${pris.length})`, taille(pris)]);
  out.push(['les chemins posés (dehors)', taille(s.dehors)]);
  return out;
}

const VILLAGE = ['villageois', 'voisins', 'commerces', 'chronique', 'port', 'etal', 'gardeManger', 'vocations', 'amitie', 'demandes', 'noms', 'fetes', 'projets'];
const s = E.createNewGame(graine, { nom: 'Simulation' });
E.commencerObjectifs(s);
let fait = 0, ok = true;
console.log(`Le poids d'une île en ligne : graine ${graine}, le joueur automatique (applique), plafond ${PLAFOND.PARTIE_KO} Ko la partie, ${PLAFOND.DEHORS_KO} Ko l'île hors de la ferme`);
for (const [k, n] of moments.entries()) {
  E.simulatePlay(s, 'applique', n - fait);
  fait = n;
  const txt = JSON.stringify(s), copie = JSON.stringify(copieDuMonde(s));
  const d = dehors(s), dTotal = d.reduce((a, [, o]) => a + o, 0);
  const v = VILLAGE.map((c) => [c, taille(s[c])]).filter(([, o]) => o > 2), vTotal = v.reduce((a, [, o]) => a + o, 0);
  const journaux = (s.villageois || []).reduce((a, x) => a + taille(x.journal), 0);
  const tires = (s.villageois || []).reduce((a, x) => a + taille({ p: x.prenom, g: x.genre, k: x.perso, a: x.apparence, go: x.gouts, t: x.traits }), 0);
  console.log(`\n${NOMS[k] || `nuit ${n}`} (nuit ${n}, jour ${s.day}, ${(s.villageois || []).length} villageois)`);
  console.log(`  la partie complète : ${ko(txt.length)} Ko (gzip ${ko(gzipSync(txt).length)} Ko) ; la copie du monde : ${ko(copie.length)} Ko (gzip ${ko(gzipSync(copie).length)} Ko)`);
  console.log(`  l'île hors de la ferme : ${ko(dTotal)} Ko (${(100 * dTotal / txt.length).toFixed(1)} %) — ${d.map(([q, o]) => `${q} ${o} o`).join(' ; ')}`);
  console.log(`  le village et le port : ${ko(vTotal)} Ko — ${v.map(([q, o]) => `${q} ${ko(o)}`).join(', ')} ; dont les journaux des villageois ${ko(journaux)} Ko, et leur tirage (prénom, allure, goûts, traits : de la graine, mais gardé) ${ko(tires)} Ko`);
  const tient = copie.length <= PLAFOND.PARTIE_KO * 1024 && dTotal <= PLAFOND.DEHORS_KO * 1024;
  console.log(`  ${tient ? '✓' : '✗'} le plafond`);
  ok = ok && tient;
}

// Ce qui ne se garde pas : l'île tirée de la graine (le Worker du sol ; la carte).
let t = performance.now();
const T = E.farmTerrain(s), M = T.MONDE;
const ctx = MS.contexteSol(M.graine, M.cadre, M.ferme, M.taille);
MS.elementsSol(ctx);
const tCtx = performance.now() - t;
const N = M.taille;
let pieces = 0, faune = 0, n = 0;
t = performance.now();
for (let ry = 0; ry < Math.ceil(T.HAUTEUR / N); ry++) for (let rx = 0; rx < Math.ceil(T.LARGEUR / N); rx++) {
  const r = MS.solDeRegion(ctx, rx, ry);
  n += 1;
  for (const o of [r.vegetation, r.roches]) if (o) pieces += ((o.images || []).length + (o.basses || []).length) / 4;
  faune += r.faune ? r.faune.length : 0;
}
const tRegions = performance.now() - t;
console.log(`\nCe qui se recalcule de la graine (jamais envoyé) : l'île de ${T.LARGEUR} × ${T.HAUTEUR} cases, ${n} régions`);
console.log(`  ${pieces} arbres, plantes et rochers (≈ ${ko(pieces * 22)} Ko s'il fallait les nommer) ; la carte, ${ko(taille(E.farmMap(s)))} Ko ; le terrain, ${ko(taille(T.LIGNES))} Ko`);
console.log(`  le contexte du sol : ${tCtx.toFixed(0)} ms ; toutes les régions : ${tRegions.toFixed(0)} ms (≈ ${(tRegions / n).toFixed(0)} ms chacune)`);
console.log(`\n${ok ? 'Le plafond tient.' : 'Le plafond est dépassé.'}`);
process.exit(ok ? 0 : 1);
