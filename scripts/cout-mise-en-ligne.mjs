#!/usr/bin/env node
// Ce que coûte la mise en ligne d'une île et la migration d'un monde d'avant (fiche I9f ; docs/ile.md, « Mettre son île
// en ligne »). Le vrai monde (worker/src/monde.mjs, MondeRegistre et le Durable Object Monde sur node:sqlite, un bucket
// R2 en mémoire), le moteur du jeu.
//
//   1. L'île du joueur automatique (le chantier allumé, « applique », graine 1) aux nuits demandées : mise en ligne (son
//      temps, le poids de la copie, l'île hors de la ferme, le plafond), puis une sauvegarde du monde (son poids, gzip)
//      et sa restauration (son temps) ; ce que pèsent les SAUVEGARDES.GARDER sauvegardes gardées.
//   2. Un monde d'avant : la partie récente avancée de tests/engine/anciennes-parties.json (45 nuits, le chapitre 7)
//      mise en ligne le chantier éteint (une ferme seule), sa partie ramenée au format 103 (d'avant I9a2), puis ouverte
//      par le serveur d'aujourd'hui : le temps de la migration, le poids avant et après, la sauvegarde d'avant.
//
//   node scripts/cout-mise-en-ligne.mjs                    # graine 1, nuits 40 et 80
//   node scripts/cout-mise-en-ligne.mjs --nuits 40,80,160

import { gzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, engineUrl } from './lib/engine-source.mjs';

const args = process.argv.slice(2);
const option = (nom, defaut) => { const i = args.indexOf(`--${nom}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : defaut; };
const graine = Math.floor(Number(option('graine', 1)));
const moments = String(option('nuits', '40,80')).split(',').map(Number).filter((n) => n > 0).sort((a, b) => a - b);

const E = await import(engineUrl(ROOT));
const { MondeRegistre, Monde, SAUVEGARDES } = await import(pathToFileURL(join(ROOT, 'worker', 'src', 'monde.mjs')).href);
const P = E.DATA.VILLAGE.EN_LIGNE;
const ko = (n) => (n / 1024).toFixed(1);
const baseSql = () => { const db = new DatabaseSync(':memory:'); return { db, exec(q, ...v) { const x = db.prepare(q).all(...v); return { toArray: () => x }; } }; };
const bucket = () => {
  const m = new Map();
  return { m, async put(k, v, o = {}) { m.set(k, { v, o }); }, async get(k) { const x = m.get(k); return x ? { text: async () => x.v } : null; }, async delete(k) { m.delete(k); }, async list({ prefix }) { return { objects: [...m.keys()].filter((k) => k.startsWith(prefix)).map((k) => ({ key: k, size: m.get(k).v.length, customMetadata: m.get(k).o.customMetadata })), truncated: false }; } };
};
const chrono = (f) => { const t = performance.now(); const r = f(); return [r, performance.now() - t]; };
let ok = true;

// 1. l'île du joueur automatique
const s = E.createNewGame(graine, { nom: 'Simulation' });
E.commencerObjectifs(s);
let fait = 0;
console.log(`La mise en ligne d'une île : graine ${graine}, le joueur automatique (applique) ; plafond ${P.PARTIE_KO} Ko la partie, ${P.DEHORS_KO} Ko l'île hors de la ferme ; ${SAUVEGARDES.GARDER} sauvegardes gardées`);
for (const n of moments) {
  E.simulatePlay(s, 'applique', n - fait);
  fait = n;
  const d = new Monde({ storage: { sql: baseSql() }, id: { toString: () => `ile-${n}` }, getWebSockets: () => [], getTags: () => [], waitUntil: (p) => p }, { SESSIONS: bucket() });
  const envoi = JSON.stringify({ v: s.version, t: 0, s });
  const [c, msCreer] = chrono(() => d.registre.creer({ proprietaire: 'proprio', nom: 'Alex', partie: JSON.parse(envoi) }));
  if (!c.ok) { console.log(`\nnuit ${n} : refusée (${c.erreur})`); ok = false; continue; }
  const w = d.registre.charger(), p = E.poidsDuMonde(w), copie = JSON.stringify(w);
  const sv = await d.sauvegarder('main');
  const L = await d.sauvegardes().liste(), taille = L[0].taille, gz = gzipSync(JSON.stringify((await d.sauvegardes().lire(sv.cle)))).length;
  d.registre.ajouterMembre('ami', 'Sam', 'jardinier');
  const save = await d.sauvegardes().lire(sv.cle);
  const [rr, msRestaurer] = chrono(() => d.registre.restaurer('proprio', save));
  const tient = p.partie <= P.PARTIE_KO * 1024 && p.dehors <= P.DEHORS_KO * 1024;
  ok = ok && tient && rr.ok;
  console.log(`\nnuit ${n} (jour ${s.day}, ${(s.villageois || []).length} villageois, palier ${s.palier || 1})`);
  console.log(`  envoyée : ${ko(envoi.length)} Ko (le brouillard compris) ; la copie du monde : ${ko(copie.length)} Ko (gzip ${ko(gzipSync(copie).length)} Ko), dont ${ko(p.dehors)} Ko hors de la ferme ; ${tient ? '✓' : '✗'} le plafond`);
  console.log(`  la mise en ligne : ${msCreer.toFixed(0)} ms (le lieu du port, déjà dans la partie solo : sinon tiré du plan de la graine, ≈ 0,7 s)`);
  console.log(`  une sauvegarde du monde : ${ko(taille)} Ko (gzip ${ko(gz)} Ko) ; ${SAUVEGARDES.GARDER} gardées : ${(taille * SAUVEGARDES.GARDER / 1024 / 1024).toFixed(2)} Mo (au plafond : ${(P.PARTIE_KO * SAUVEGARDES.GARDER / 1024).toFixed(1)} Mo)`);
  console.log(`  sa restauration : ${msRestaurer.toFixed(0)} ms (${rr.ok ? 'la partie revient' : rr.erreur})`);
}

// 2. un monde d'avant : la partie récente avancée, mise en ligne, ramenée à une ferme seule (sans port) au format 103,
// puis migrée
const vieille = JSON.parse(readFileSync(join(ROOT, 'tests', 'engine', 'anciennes-parties.json'), 'utf8')).recente_avancee;
const sql = baseSql();
const r = new MondeRegistre(sql);
const c = r.creer({ proprietaire: 'proprio', nom: 'Alex', partie: vieille });
if (!c.ok) { console.log(`le monde d'avant : ${c.erreur}`); process.exit(1); }
const brute = JSON.parse(r.un('SELECT json FROM instantane WHERE rev = 0').json);
for (const k of ['charges', 'amities', 'sacs', 'energies', 'horloge', 'port', 'dehors', 'palier', 'noms', 'chronique']) delete brute[k];
brute.version = 103;
r.faire('UPDATE instantane SET json = ? WHERE rev = 0', JSON.stringify(brute));
r.faire('DELETE FROM meta WHERE cle = ?', 'format');
const b = bucket();
const d = new Monde({ storage: { sql }, id: { toString: () => 'vieux' }, getWebSockets: () => [], getTags: () => [], waitUntil: (p) => p }, { SESSIONS: b });
const t0 = performance.now();
await d.charger();
const msMigrer = performance.now() - t0;
const w = d.registre.charger(), p = E.poidsDuMonde(w);
const L = await d.sauvegardes().liste();
const avant = JSON.stringify(brute).length;
console.log(`\nUn monde d'avant (anciennes-parties.json, recente_avancee : jour ${w.day}, une ferme seule au format 103), ouvert par le serveur d'aujourd'hui`);
console.log(`  la migration : ${msMigrer.toFixed(0)} ms (le format, la ferme sur l'île, le lieu du port, le tronçon posé, la sauvegarde d'avant)`);
console.log(`  la partie : ${ko(avant)} Ko avant, ${ko(p.partie)} Ko après (dont ${ko(p.dehors)} Ko hors de la ferme : le tronçon) ; une île : ${!!w.mondePartage}, son port : ${!!(w.port && w.port.lieu)}, villageois : ${(w.villageois || []).length}`);
console.log(`  les sauvegardes du monde : ${L.map((x) => `${x.raison} (${ko(x.taille)} Ko)`).join(', ')}`);
ok = ok && !!(w.port && w.port.lieu) && L.some((x) => x.raison === 'avant-ile');
console.log(`\n${ok ? 'Tout tient.' : 'Quelque chose ne tient pas.'}`);
process.exit(ok ? 0 : 1);
