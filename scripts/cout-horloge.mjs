#!/usr/bin/env node
// I9a2 (l'horloge commune, docs/fiches/ile/I9a2-note-horloge.md) : le coût de l'horloge d'un monde de l'île pour le
// serveur, par heure réelle passée en ligne, mesuré sur le vrai code : le Durable Object (worker/src/monde.mjs, sa base
// SQLite simulée par node:sqlite, comme tests/test-monde.mjs), ses WebSockets simulées, son alarme, le moteur du jeu.
//
// La partie : l'île avancée (graine 1, le joueur automatique « applique », 80 nuits : celle d'I9a et de la note), mise
// en ligne ; avec --plafond, la même lestée jusqu'au plafond de VILLAGE.EN_LIGNE.PARTIE_KO (un lest inerte : il pèse
// dans chaque instantané, chaque envoi de la partie). --partie <fichier.json> : une partie déjà faite (la fabriquer
// prend une minute ou deux ; --garder <fichier.json> la garde).
//
// Ce qui est mesuré, à 1 et à 4 joueurs connectés (chacun fait --gestes gestes par minute : allumer ou éteindre la
// pompe ; 0 : le temps seul) : les pas joués par le serveur, les révisions du journal, les octets écrits (ce qui part
// dans les INSERT et UPDATE : journal, instantanés, méta), les octets diffusés (chaque message × chaque joueur), les
// instantanés, les réveils d'alarme, le calcul du serveur (le temps passé dans le Durable Object), et ce que couvre
// le journal (le rattrapage). --dorment : tous se couchent à 22 h (la nuit à la cadence du sommeil).
//
// Usage : node scripts/cout-horloge.mjs [--minutes 60] [--gestes 4] [--dorment] [--plafond] [--partie f.json] [--garder f.json]

import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { allDevices, commencerObjectifs, createNewGame, DATA, GAME_VERSION, nightActive, pasDe, pasDuMonde, simulatePlay } from '../js/engine/index.js';
import { Monde, MONDE } from '../worker/src/monde.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const MINUTES = Number(opt('minutes', 60));
const GESTES = Number(opt('gestes', 4));
const DORMENT = args.includes('--dorment');
const PLAFOND = args.includes('--plafond');
DATA.VILLAGE.ACTIF = true;   // (le chantier allumé : la partie est une île, son monde a l'horloge vivante)

const cloner = (v) => JSON.parse(JSON.stringify(v));
function ileAvancee() {
  const f = opt('partie', null);
  if (f && existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'));
  const s = createNewGame(1, { nom: 'Simulation' });
  commencerObjectifs(s);
  simulatePlay(s, 'applique', 80);
  const g = opt('garder', null);
  if (g) writeFileSync(g, JSON.stringify(s));
  return s;
}
function lester(s, ko) {
  const t = cloner(s), L = (t.monde.lest = []);
  for (let k = 0; JSON.stringify(t).length < ko * 1024; k += 200) for (let i = 0; i < 200; i++) L.push(`arbre:${100000 + k + i}:j${80 + ((k + i) % 9)}`);
  return t;
}

// Un Durable Object Monde, sa base comptée, ses WebSockets simulées (ce qu'elles reçoivent, compté), son alarme.
function nouveauMonde(partie, comptes) {
  const db = new DatabaseSync(':memory:'), ecrits = { n: 0, octets: 0 };
  const sql = { db, exec(q, ...v) {
    if (/^\s*(INSERT|UPDATE)/i.test(q)) { ecrits.n += 1; for (const x of v) ecrits.octets += typeof x === 'string' ? Buffer.byteLength(x) : 8; }
    const rows = db.prepare(q).all(...v);
    return { toArray: () => rows };
  } };
  const h = { t: 1_700_000_000_000, alarme: null, alarmes: 0 };
  const sockets = [], diffuse = { n: 0, octets: 0 };
  const ctx = {
    storage: { sql, setAlarm: (t) => { h.alarme = t; }, deleteAlarm: () => { h.alarme = null; } },
    id: { toString: () => 'mesure' }, getWebSockets: (tag) => sockets.filter((w) => !tag || w.c === tag), getTags: (w) => [w.c], waitUntil: () => {},
  };
  const d = new Monde(ctx, {});
  d.registre.maintenant = () => h.t;
  const c = d.registre.creer({ proprietaire: comptes[0], partie: { v: partie.version, t: 0, s: cloner(partie) } });
  if (!c.ok) throw new Error(c.erreur);
  for (const j of comptes.slice(1)) d.registre.ajouterMembre(j, j, 'batisseur');
  const ws = (cpt) => { let att = null; return { c: cpt, send: (m) => { diffuse.n += 1; diffuse.octets += Buffer.byteLength(m); }, close() {}, serializeAttachment: (a) => { att = a; }, deserializeAttachment: () => att }; };
  for (const j of comptes) { const w = ws(j); sockets.push(w); d.webSocketMessage(w, JSON.stringify({ t: 'hello', version: GAME_VERSION })); }
  // (on ne compte que l'heure de jeu : pas l'arrivée, qui envoie la partie entière à chacun)
  ecrits.n = 0; ecrits.octets = 0; diffuse.n = 0; diffuse.octets = 0;
  return { d, sql, ecrits, h, sockets, diffuse };
}

let nGeste = 0;
function mesurer(nom, partie, nJoueurs) {
  const comptes = ['c-p', 'c-2', 'c-3', 'c-4'].slice(0, nJoueurs);
  const { d, sql, ecrits, h, sockets, diffuse } = nouveauMonde(partie, comptes);
  const r = d.registre, debut = h.t, fin = debut + MINUTES * 60000, pas0 = pasDe(r.charger()), rev0 = r.rev;
  const copieKo = +(JSON.stringify(r.charger()).length / 1024).toFixed(1);
  const pompe = allDevices(r.charger()).find((x) => x.type === 'pompe');
  // l'agenda : les gestes de chacun (décalés), l'alarme (programmée par le Durable Object), la fin
  const agenda = [];
  if (GESTES > 0 && pompe) for (const [j, cpt] of comptes.entries()) for (let t = debut + 7000 + j * 3100; t <= fin; t += 60000 / GESTES) agenda.push([t, 'geste', cpt]);
  agenda.sort((a, b) => a[0] - b[0]);
  let calcul = 0, max = 0, refus = 0, instantanes = 0;
  const inst = r.instantane.bind(r);
  r.instantane = () => { instantanes += 1; inst(); };
  const chrono = (f) => { const t0 = performance.now(); f(); const x = performance.now() - t0; calcul += x; max = Math.max(max, x); };
  let i = 0;
  const couches = new Set();
  for (;;) {
    // le prochain événement : un geste, ou l'alarme (si elle vient avant)
    const prochain = i < agenda.length ? agenda[i][0] : Infinity;
    const alarme = h.alarme !== null && h.alarme <= fin ? h.alarme : Infinity;
    // (--dorment : chacun se couche dès que la nuit est là ; on regarde toutes les 5 s)
    const veille = DORMENT ? Math.min(fin, h.t + 5000) : Infinity;
    const t = Math.min(prochain, alarme, veille, fin);
    h.t = t;
    if (t === alarme) { h.alarme = null; h.alarmes += 1; chrono(() => d.alarm()); continue; }
    if (t === prochain) {
      const cpt = agenda[i++][2], w = sockets.find((x) => x.c === cpt);
      chrono(() => d.webSocketMessage(w, JSON.stringify({ t: 'cmd', id: `g-${++nGeste}-mesure`, type: 'appareil.basculer', args: { appareil: pompe.id } })));
      continue;
    }
    if (DORMENT) {
      const s = r.charger();
      chrono(() => r.avancer());
      const nuit = !!s.nuitEnCours;
      if (!nuit) couches.clear();
      for (const w of sockets) if (nuit && !couches.has(w.c)) { couches.add(w.c); chrono(() => d.webSocketMessage(w, JSON.stringify({ t: 'coucher', oui: true }))); }
    }
    if (t >= fin) break;
  }
  chrono(() => r.avancer(fin));
  const s = r.charger();
  const j = sql.db.prepare('SELECT MIN(ts) AS a, MAX(ts) AS b, COUNT(*) AS n FROM journal').get();
  return {
    nom, joueurs: nJoueurs, partieKo: copieKo, jour: s.day,
    pas: pasDe(s) - pas0, revisions: r.rev - rev0, refus,
    ecritKo: Math.round(ecrits.octets / 1024), ecritures: ecrits.n, instantanes,
    diffuseKo: +(diffuse.octets / 1024).toFixed(1), messages: diffuse.n,
    alarmes: h.alarmes, calculMs: Math.round(calcul), maxMs: +max.toFixed(1),
    journal: j.n, journalMin: j.n > 1 ? +((j.b - j.a) / 60000).toFixed(1) : 0,
  };
}

const ile = ileAvancee();
const parties = [['île avancée', ile]];
if (PLAFOND) parties.push(['plafond', lester(ile, DATA.VILLAGE.EN_LIGNE.PARTIE_KO)]);
const lignes = [];
for (const [nom, p] of parties) for (const n of [1, 4]) {
  const x = mesurer(nom, p, n);
  lignes.push(x);
  console.log(JSON.stringify(x));
}
console.log(`\n(${MINUTES} min réelles ; ${GESTES} gestes par minute et par joueur ; ${DORMENT ? 'tous couchés chaque nuit' : 'personne ne se couche'} ; instantané tous les ${MONDE.INSTANTANE_PAS} pas ou ${MONDE.INSTANTANE_GESTES} gestes ; alarme toutes les ${MONDE.ALARME_MS / 60000} min)`);
console.table(lignes.map((x) => ({ partie: `${x.nom} ${x.partieKo} Ko`, joueurs: x.joueurs, pas: x.pas, rév: x.revisions, 'écrit Ko': x.ecritKo, inst: x.instantanes, 'diffusé Ko': x.diffuseKo, alarmes: x.alarmes, 'calcul ms': x.calculMs, 'max ms': x.maxMs, 'journal min': x.journalMin, jour: x.jour })));

// Le prix d'un pas (ce que paie aussi chaque joueur) : 720 pas de la copie du monde, de jour, de nuit, à minuit.
{
  const { d } = nouveauMonde(ile, ['c-p']);
  const s = cloner(d.registre.charger()), jour = [], nuit = [], minuit = [];
  for (let i = 0; i < 720; i++) {
    const avant = nightActive(s), m0 = avant && s.nuitEnCours.minuit;
    const t0 = performance.now();
    pasDuMonde(s);
    const x = performance.now() - t0;
    if (avant && !m0 && (!s.nuitEnCours || s.nuitEnCours.minuit)) minuit.push(x); else (avant ? nuit : jour).push(x);
  }
  const st = (L) => { const t = [...L].sort((a, b) => a - b), m = t.reduce((a, b) => a + b, 0) / t.length; return `${t.length} pas : moyenne ${m.toFixed(2)} ms, p99 ${t[Math.floor(t.length * 0.99)].toFixed(1)} ms, max ${t[t.length - 1].toFixed(1)} ms`; };
  console.log(`\nLe pas du monde (la copie, ${(JSON.stringify(d.registre.charger()).length / 1024).toFixed(1)} Ko) :`);
  console.log(`  de jour   ${st(jour)}`);
  console.log(`  de nuit   ${st(nuit)}`);
  console.log(`  de minuit ${st(minuit)} (la première, à froid, comprise)`);
}
