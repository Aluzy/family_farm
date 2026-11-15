#!/usr/bin/env node
// I9g (les performances, docs/fiches/ile/I9g-performances.md) : le protocole des mesures du moteur, sur le vrai code (le
// moteur, et le Durable Object sur node:sqlite pour le serveur), à refaire avant et après une optimisation. Avec
// --racine <dossier>, le moteur et le serveur d'une autre copie du dépôt (la base d'une comparaison) : les mêmes parties,
// le même travail, et l'empreinte de chaque état final pour prouver que rien du jeu n'a changé (octet pour octet : le
// JSON de la partie, pas seulement l'empreinte triée).
//
// Les trois parties de référence (graine 1, le joueur automatique « applique ») : le village de 5 (jour ≈ 41), de 10
// (jour ≈ 161) et de 15 (celle de 10, plus cinq maisons bâties et leurs villageois, une tâche et son outil à chacun ;
// comme scripts/cout-villageois.mjs). --parties <dossier> les garde (ile-5.json, ile-10.json) : les fabriquer prend une
// minute ou deux.
//
// Ce qui est mesuré, pour chacune :
//   - en ligne : 720 pas du monde (cinq journées) : un pas de jour, de nuit, minuit ; le plus gros rattrapage du serveur
//     (une alarme de 120 pas) ; la copie remise à jour (le serveur : `remplacer` ; chez chaque joueur : l'instantané reçu,
//     la confirmée et la locale refaites, sans la scène) ;
//   - en solo : la journée de la page (`tick` chaque seconde, de 6 h à 22 h) et la nuit (`advanceNight` jusqu'au
//     réveil : minuit, `runNight`) ;
//   - le contrôle des rôles d'un `bloc.reprendre` sur une case d'une maison habitée (`roleDemande`) ;
//   - un monde d'avant mis à jour à son premier réveil (la partie récente avancée de tests/engine/anciennes-parties.json,
//     comme scripts/cout-mise-en-ligne.mjs).
//
// Usage : node scripts/cout-performances.mjs [--racine <dossier>] [--parties <dossier>] [--json <fichier>] [--seul 15]

import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, engineUrl } from './lib/engine-source.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const RACINE = resolve(opt('racine', ROOT));
const PARTIES = opt('parties', null);
const SEUL = opt('seul', null);
const E = await import(engineUrl(RACINE));
const { MondeRegistre, Monde } = await import(pathToFileURL(join(RACINE, 'worker', 'src', 'monde.mjs')).href);
const { Synchro } = await import(pathToFileURL(join(RACINE, 'js', 'ui', 'synchro.js')).href);
E.DATA.VILLAGE.ACTIF = true;
const cloner = (v) => JSON.parse(JSON.stringify(v));
const hache = (s) => createHash('sha1').update(JSON.stringify(s)).digest('hex').slice(0, 12);
const st = (L) => {
  const t = [...L].sort((a, b) => a - b), m = t.reduce((a, b) => a + b, 0) / Math.max(1, t.length);
  return { n: t.length, moy: +m.toFixed(2), p99: +(t[Math.floor(t.length * 0.99)] || 0).toFixed(1), max: +(t[t.length - 1] || 0).toFixed(1) };
};
const chrono = (f) => { const t = performance.now(); const r = f(); return [r, performance.now() - t]; };

/* ---------- les parties ---------- */

function ileA(n, nuits = 260) {
  const f = PARTIES && join(PARTIES, `ile-${n}.json`);
  if (f && existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'));
  const s = E.createNewGame(1, { nom: 'Simulation' });
  E.commencerObjectifs(s);
  for (let k = 0; k < nuits && (s.villageois || []).length < n; k += 5) E.simulatePlay(s, 'applique', 5);
  if (f) { mkdirSync(PARTIES, { recursive: true }); writeFileSync(f, JSON.stringify(s)); }
  return s;
}
function avecArrivees(s, n) {
  const t = cloner(s), T = [['bois', 'hache'], ['pierre', 'pioche'], ['fauchage', 'faux'], ['cueillette', null], ['peche', 'canne']];
  for (let k = 0; k < n; k++) {
    if (!E.testMaisonVillageois(t).ok) throw new Error('plus de place pour une maison');
    const r = E.arriverVillageois(t, { direct: true });
    if (!r.ok) throw new Error(r.error);
    const [tache, o] = T[k % T.length];
    if (o) { t.outils[o] = true; E.donnerOutil(t, r.villageois.id, o); }
    E.attribuer(t, r.villageois.id, tache);
  }
  return t;
}
const baseSql = () => { const db = new DatabaseSync(':memory:'); return { db, exec(q, ...v) { const x = db.prepare(q).all(...v); return { toArray: () => x }; } }; };
function enLigne(s) {
  let t = 1_700_000_000_000;
  const reg = new MondeRegistre(baseSql(), () => t);
  const c = reg.creer({ proprietaire: 'c-p', partie: { v: s.version, t: 0, s: cloner(s) } });
  if (!c.ok) throw new Error(c.erreur);
  return { reg, avance: (ms) => { t += ms; } };
}

/* ---------- les mesures ---------- */

// En ligne : 720 pas, puis une alarme de 120 pas, puis la copie remise à jour.
function mesurerEnLigne(s) {
  const { reg, avance } = enLigne(s);
  const p = cloner(reg.charger()), jour = [], nuit = [], minuit = [];
  for (let i = 0; i < 720; i++) {
    const avant = E.nightActive(p), m0 = avant && p.nuitEnCours.minuit;
    const [, x] = chrono(() => E.pasDuMonde(p));
    if (avant && !m0 && (!p.nuitEnCours || p.nuitEnCours.minuit)) minuit.push(x); else (avant ? nuit : jour).push(x);
  }
  reg.reprendre();
  avance(120 * E.DATA.VILLAGE.EN_LIGNE.PAS_MS);
  const [, alarme] = chrono(() => reg.avancer());
  const apresAlarme = hache(reg.charger());
  // la copie remise à jour : le serveur, puis chez un joueur (l'instantané reçu ; la locale avait deux gestes en attente)
  const [r, remplacer] = chrono(() => reg.remplacer('c-p', { v: s.version, t: 0, s: cloner(s) }));
  if (!r.ok) throw new Error(r.erreur);
  const w = reg.charger();
  const sy = new Synchro({ partie: p, rev: 1, executerCommande: E.executerCommande, moi: 'c-p', horloge: { pas: E.pasDe(p), reel: 0 } });
  const [, recue] = chrono(() => sy.instantane({ rev: reg.rev, partie: w, horloge: { pas: E.pasDe(w), reel: 0 } }));
  return { p, jour: st(jour), nuit: st(nuit), minuit: st(minuit), alarme, apresAlarme, remplacer, recue, ko: JSON.stringify(w).length / 1024 };
}

// En solo : la journée de la page (tick d'une seconde) puis la nuit jusqu'au réveil (le pas de la page : 1 s, ×
// nightSpeed couché).
function mesurerSolo(s) {
  const p = cloner(s);
  delete p.mondePartage;
  const jour = [], nuit = [];
  let minuit = 0;
  for (let k = 0; k < 3; k++) {
    while (!E.nightActive(p)) {
      const [, x] = chrono(() => E.tick(p, 1));
      jour.push(x);
      if (E.bedtimeDue(p)) E.startNight(p);
    }
    while (E.nightActive(p)) {
      const m0 = p.nuitEnCours.minuit;
      const [, x] = chrono(() => E.tick(p, 1));
      if (!m0 && (!p.nuitEnCours || p.nuitEnCours.minuit)) minuit = Math.max(minuit, x); else nuit.push(x);
      if (p.reveil) p.reveil = false;
    }
  }
  return { p, jour: st(jour), nuit: st(nuit), minuit };
}

// Le contrôle d'un bloc.reprendre sur une île (une case de mur d'une maison habitée, et une case quelconque).
function mesurerRoles(p) {
  const v = (p.villageois || []).find((x) => Number.isInteger(x.maison));
  if (!v) return null;
  const m = E.maisonsMarquees(p).find((x) => x.boite === v.maison);
  const W = E.farmTerrain(p).LARGEUR, dedans = new Set(m.piece.cases);
  let mur = null;
  for (const t of m.piece.cases) for (const d of [-1, 1, -W, W]) if (mur === null && !dedans.has(t + d)) mur = t + d;
  const T = [];
  let role = null;
  for (let i = 0; i < 50; i++) {
    const [r, x] = chrono(() => E.roleDemande(p, { type: 'bloc.reprendre', args: { case: mur } }));
    T.push(x); role = r;
  }
  return { mur: st(T), role };
}

// Un monde d'avant mis à jour à son premier réveil (comme scripts/cout-mise-en-ligne.mjs).
async function mesurerMiseAJour() {
  E.DATA.VILLAGE.ACTIF = false;
  const vieille = JSON.parse(readFileSync(join(RACINE, 'tests', 'engine', 'anciennes-parties.json'), 'utf8')).recente_avancee;
  const sql = baseSql();
  const r = new MondeRegistre(sql);
  const c = r.creer({ proprietaire: 'proprio', nom: 'Alex', partie: vieille });
  if (!c.ok) throw new Error(c.erreur);
  const brute = JSON.parse(r.un('SELECT json FROM instantane WHERE rev = 0').json);
  for (const k of ['charges', 'amities', 'sacs', 'energies', 'horloge']) delete brute[k];
  brute.version = 103;
  r.faire('UPDATE instantane SET json = ? WHERE rev = 0', JSON.stringify(brute));
  r.faire('DELETE FROM meta WHERE cle = ?', 'format');
  const m = new Map();
  const b = { async put(k, v, o = {}) { m.set(k, { v, o }); }, async get(k) { const x = m.get(k); return x ? { text: async () => x.v } : null; }, async delete(k) { m.delete(k); }, async list({ prefix }) { return { objects: [...m.keys()].filter((k) => k.startsWith(prefix)).map((k) => ({ key: k, size: m.get(k).v.length, customMetadata: m.get(k).o.customMetadata })), truncated: false }; } };
  const d = new Monde({ storage: { sql }, id: { toString: () => 'vieux' }, getWebSockets: () => [], getTags: () => [], waitUntil: (p) => p }, { SESSIONS: b, ILE_ESSAI: '1' });
  const t0 = performance.now();
  await d.charger();
  const ms = performance.now() - t0;
  E.DATA.VILLAGE.ACTIF = true;
  return { ms, empreinte: hache(d.registre.charger()) };
}

/* ---------- le protocole ---------- */

const s10 = ileA(10);
const ile15 = () => {
  const s = avecArrivees(s10, 15 - s10.villageois.length);
  if (PARTIES) writeFileSync(join(PARTIES, 'ile-15.json'), JSON.stringify(s));   // (pour scripts/mesure-scene-ile.mjs)
  return s;
};
const parties = [['5', () => ileA(5)], ['10', () => s10], ['15', ile15]].filter(([n]) => !SEUL || n === SEUL);
const sortie = { racine: RACINE, parties: {} };
for (const [nom, f] of parties) {
  const s = f();
  const L = mesurerEnLigne(s), S = mesurerSolo(s), R = mesurerRoles(L.p);
  const ligne = {
    villageois: s.villageois.length,
    pasJour: L.jour, pasNuit: L.nuit, minuit: L.minuit, alarme120: +L.alarme.toFixed(0), remplacer: +L.remplacer.toFixed(1), recue: +L.recue.toFixed(1), ko: +L.ko.toFixed(1),
    soloTick: S.jour, soloNuit: S.nuit, soloMinuit: +S.minuit.toFixed(1),
    roleReprendre: R && R.mur, role: R && R.role,
    empreintes: { enLigne: hache(L.p), alarme: L.apresAlarme, solo: hache(S.p) },
  };
  sortie.parties[nom] = ligne;
  console.log(`\n${nom} villageois (${ligne.villageois}) : ${JSON.stringify(ligne)}`);
}
if (!SEUL) {
  sortie.miseAJour = await mesurerMiseAJour();
  console.log(`\nun monde d'avant mis à jour : ${sortie.miseAJour.ms.toFixed(0)} ms (${sortie.miseAJour.empreinte})`);
}
console.table(Object.entries(sortie.parties).map(([n, x]) => ({
  villageois: n, 'pas jour moy': x.pasJour.moy, 'p99': x.pasJour.p99, 'nuit moy': x.pasNuit.moy, 'minuit moy': x.minuit.moy, 'minuit max': x.minuit.max,
  '120 pas': x.alarme120, 'solo tick moy': x.soloTick.moy, 'solo p99': x.soloTick.p99, 'solo minuit': x.soloMinuit, 'reprendre': x.roleReprendre && x.roleReprendre.moy,
  'remplacer': x.remplacer, 'reçue': x.recue,
})));
const j = opt('json', null);
if (j) writeFileSync(j, JSON.stringify(sortie, null, 1));
