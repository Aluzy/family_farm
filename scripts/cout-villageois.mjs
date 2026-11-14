#!/usr/bin/env node
// I9d (les villageois en ligne, docs/fiches/ile/I9d-villageois-en-ligne.md) : le prix d'un pas du monde selon le nombre de
// villageois, mesuré sur le vrai code (le moteur, et le Durable Object sur node:sqlite pour le rattrapage).
//
// Les parties : une île jouée par le joueur automatique (graine 1, « applique ») jusqu'à 5 villageois, puis jusqu'à 10
// (il n'en fait pas venir plus : les maisons) ; 15 : celle de 10, plus 5 maisons bâties sur la ferme et leurs villageois,
// une tâche et son outil à chacun. Chacune mise en ligne (MondeRegistre.creer :
// la copie du monde), puis 720 pas (5 journées) : le prix d'un pas de jour, de nuit, de minuit ; et le plus gros
// rattrapage du serveur (une alarme qui rejoue 120 pas d'un coup).
//
// Usage : node scripts/cout-villageois.mjs [--partie5 f.json] [--partie10 f.json] [--garder <dossier>]

import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { arriverVillageois, attribuer, commencerObjectifs, createNewGame, DATA, donnerOutil, nightActive, pasDuMonde, simulatePlay, testMaisonVillageois } from '../js/engine/index.js';
import { MondeRegistre } from '../worker/src/monde.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
DATA.VILLAGE.ACTIF = true;
const cloner = (v) => JSON.parse(JSON.stringify(v));
const travailleurs = (s) => (s.villageois || []).filter((v) => !v.enfant && v.tache).length;

// L'île du joueur automatique, jouée jusqu'à `n` villageois (au plus `nuits` nuits).
function ileA(n, nuits = 260) {
  const f = opt(`partie${n}`, null);
  if (f && existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'));
  const s = createNewGame(1, { nom: 'Simulation' });
  commencerObjectifs(s);
  for (let k = 0; k < nuits && (s.villageois || []).length < n; k += 5) simulatePlay(s, 'applique', 5);
  const g = opt('garder', null);
  if (g) writeFileSync(join(g, `ile-${n}.json`), JSON.stringify(s));
  return s;
}
// `s` plus `n` villageois de plus : `n` maisons bâties sur la ferme (testMaisonVillageois), leurs villageois arrivés, une
// tâche à chacun (le bois, la pierre, le fauchage, la cueillette, la pêche) avec son outil.
function avecArrivees(s, n) {
  const t = cloner(s), T = [['bois', 'hache'], ['pierre', 'pioche'], ['fauchage', 'faux'], ['cueillette', null], ['peche', 'canne']];
  for (let k = 0; k < n; k++) {
    if (!testMaisonVillageois(t).ok) throw new Error('plus de place pour une maison');
    const r = arriverVillageois(t, { direct: true });
    if (!r.ok) throw new Error(r.error);
    const [tache, o] = T[k % T.length];
    if (o) { t.outils[o] = true; donnerOutil(t, r.villageois.id, o); }
    attribuer(t, r.villageois.id, tache);
  }
  return t;
}
// La copie du monde (comme à la mise en ligne).
function enLigne(s) {
  const db = new DatabaseSync(':memory:');
  const sql = { exec(q, ...v) { const r = db.prepare(q).all(...v); return { toArray: () => r }; } };
  let t = 1_700_000_000_000;
  const reg = new MondeRegistre(sql, () => t);
  const c = reg.creer({ proprietaire: 'c-p', partie: { v: s.version, t: 0, s: cloner(s) } });
  if (!c.ok) throw new Error(c.erreur);
  return { reg, avance: (ms) => { t += ms; } };
}

const st = (L) => {
  const t = [...L].sort((a, b) => a - b), m = t.reduce((a, b) => a + b, 0) / Math.max(1, t.length);
  return { n: t.length, moyenne: +m.toFixed(2), p99: +(t[Math.floor(t.length * 0.99)] || 0).toFixed(1), max: +(t[t.length - 1] || 0).toFixed(1) };
};

const s5 = ileA(5), s10 = ileA(10), s15 = avecArrivees(s10, 15 - s10.villageois.length);
const lignes = [];
for (const [nom, s] of [['5', s5], ['10', s10], ['15', s15]]) {
  const { reg, avance } = enLigne(s);
  const p = cloner(reg.charger()), jour = [], nuit = [], minuit = [];
  let actions = 0;
  for (let i = 0; i < 720; i++) {
    const avant = nightActive(p), m0 = avant && p.nuitEnCours.minuit;
    const a0 = (p.villageois || []).reduce((n, v) => n + ((v.travail && v.travail.actions) || 0), 0);
    const t0 = performance.now();
    pasDuMonde(p);
    const x = performance.now() - t0;
    const a1 = (p.villageois || []).reduce((n, v) => n + ((v.travail && v.travail.actions) || 0), 0);
    if (a1 > a0) actions += a1 - a0;
    if (avant && !m0 && (!p.nuitEnCours || p.nuitEnCours.minuit)) minuit.push(x); else (avant ? nuit : jour).push(x);
  }
  // le plus gros rattrapage du serveur : une alarme de 120 pas (10 minutes), le monde éveillé
  reg.reprendre();
  avance(120 * DATA.VILLAGE.EN_LIGNE.PAS_MS);
  const t0 = performance.now();
  reg.avancer();
  const alarme = performance.now() - t0;
  const L = { villageois: s.villageois.length, travailleurs: travailleurs(s), jour: st(jour), nuit: st(nuit), minuit: st(minuit), actionsDeJour: actions, alarme120: +alarme.toFixed(0), ko: +(JSON.stringify(reg.charger()).length / 1024).toFixed(1) };
  lignes.push(L);
  console.log(JSON.stringify(L));
}
console.table(lignes.map((x) => ({ villageois: x.villageois, 'au travail': x.travailleurs, 'jour moy ms': x.jour.moyenne, 'jour p99': x.jour.p99, 'jour max': x.jour.max, 'nuit moy': x.nuit.moyenne, 'minuit moy': x.minuit.moyenne, 'minuit max': x.minuit.max, 'actions (5 j)': x.actionsDeJour, '120 pas ms': x.alarme120, 'partie Ko': x.ko })));
