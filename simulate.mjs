#!/usr/bin/env node
// Simulation et équilibrage (Lot 10, conception sections 8.10 et 8.11).
//
// Comme run-tests.mjs, ce script extrait le bloc <script id="core"> de
// index.html et joue des parties complètes avec le vrai moteur, sans interface.
// Le joueur automatique et ses réglages vivent dans le bloc core
// (DATA.SIMULATION et fonctions bot*/simulate*) : le script ne fait que lancer
// les parties, écrire le CSV, le graphique, et vérifier la courbe cible.
//
//   node scripts/simulate.mjs                       # les deux stratégies, 80 nuits
//   node scripts/simulate.mjs --nuits 60 --graine 7
//   node scripts/simulate.mjs --strategie applique  # ou minimal, ou toutes
//
// Options : --nuits N (80), --graine N (1), --strategie applique|minimal|toutes,
//           --csv fichier (simulation.csv), --svg fichier (simulation-autonomie.svg),
//           --index chemin/vers/index.html, --lissage N (nuits de la moyenne mobile).
// Code de sortie : 0 si toutes les vérifications sont OK, 1 sinon.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ---------- arguments ---------- */

const args = process.argv.slice(2);
function option(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
}
if (args.includes('--aide') || args.includes('--help')) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 20).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}

const here = dirname(fileURLToPath(import.meta.url));
const indexPath = resolve(option('index', resolve(here, '..', 'index.html')));

/* ---------- le moteur, extrait de index.html ---------- */

const html = readFileSync(indexPath, 'utf8');
const match = html.match(/<script id="core">([\s\S]*?)<\/script>/);
if (!match) {
  console.error(`Bloc <script id="core"> introuvable dans ${indexPath}`);
  process.exit(2);
}
const E = new Function(`${match[1]}\nreturn { DATA, simulateGame, simulationReach };`)();
const S = E.DATA.SIMULATION;

const nuits = Math.max(1, Math.floor(Number(option('nuits', S.NUITS))));
const graine = Math.floor(Number(option('graine', S.GRAINE)));
const choix = option('strategie', 'toutes');
if (option('lissage')) S.LISSAGE = Math.max(1, Math.floor(Number(option('lissage'))));
const ids = choix === 'toutes' ? Object.keys(S.STRATEGIES) : [choix === 'appliquee' ? 'applique' : choix === 'minimale' ? 'minimal' : choix];
for (const id of ids) {
  if (!S.STRATEGIES[id]) {
    console.error(`Stratégie inconnue : ${id} (applique, minimal ou toutes)`);
    process.exit(2);
  }
}

/* ---------- parties ---------- */

const parties = {};
for (const id of ids) parties[id] = E.simulateGame(id, nuits, graine);

/* ---------- CSV ---------- */

const entete = ['strategie', 'nuit', 'chapitre', 'autonomie_pct', 'sante_moyenne', 'sante_min', 'pieces', 'conserves', 'soins_payes', 'couverture_pct', 'potager_niveau'];
const num = (x, d = 2) => String(Math.round(x * 10 ** d) / 10 ** d);
const lignes = [entete.join(',')];
for (const id of ids) {
  for (const r of parties[id]) {
    lignes.push([id, r.nuit, r.chapitre, num(r.autonomie), num(r.santeMoyenne), r.santeMin, num(r.pieces), r.conserves, r.soinsPayes, num(r.couverture * 100), r.potager].join(','));
  }
}
const csvPath = resolve(option('csv', 'simulation.csv'));
writeFileSync(csvPath, lignes.join('\n') + '\n');

/* ---------- graphique SVG (autonomie des stratégies) ---------- */

function svgAutonomie(series) {
  const W = 760, H = 360, m = { g: 48, d: 170, h: 24, b: 40 };
  const x = (n) => m.g + ((n - 1) / Math.max(1, nuits - 1)) * (W - m.g - m.d);
  const y = (p) => H - m.b - (p / 100) * (H - m.b - m.h);
  const couleurs = { applique: '#2a78d6', minimal: '#eb6834' };
  const traits = { applique: '', minimal: ' stroke-dasharray="6 4"' };
  let g = '';
  for (const p of [0, 25, 50, 75, 100]) {
    g += `<line x1="${m.g}" x2="${W - m.d}" y1="${y(p)}" y2="${y(p)}" stroke="#d9d8d2" stroke-width="1"/><text x="${m.g - 8}" y="${y(p) + 4}" text-anchor="end" fill="#52514e" font-size="11">${p} %</text>`;
  }
  const pas = nuits > 40 ? 10 : 5;
  for (let n = pas; n <= nuits; n += pas) g += `<text x="${x(n)}" y="${H - m.b + 18}" text-anchor="middle" fill="#52514e" font-size="11">${n}</text>`;
  g += `<text x="${(m.g + W - m.d) / 2}" y="${H - 6}" text-anchor="middle" fill="#52514e" font-size="12">Nuit</text>`;
  // courbe cible (section 8.10)
  const cible = S.JALONS.map((j) => `${x(j.nuit)},${y(j.pct)}`).join(' ');
  g += `<polyline points="${cible}" fill="none" stroke="#8b8a83" stroke-width="1.5" stroke-dasharray="2 4"/>`;
  g += `<text x="${W - m.d + 8}" y="${y(100) + 4}" fill="#52514e" font-size="11">cible (8.10)</text>`;
  for (const [id, rows] of Object.entries(series)) {
    // moyenne mobile : la courbe brute alterne 0 et 100 % au rythme des récoltes
    const k = S.LISSAGE;
    const pts = rows.map((r, i) => {
      const w = rows.slice(Math.max(0, i - k + 1), i + 1);
      return `${x(r.nuit)},${y(w.reduce((t, q) => t + q.autonomie, 0) / w.length)}`;
    });
    g += `<polyline points="${pts.join(' ')}" fill="none" stroke="${couleurs[id]}" stroke-width="2.5" stroke-linejoin="round"${traits[id]}/>`;
    // légende (les deux courbes finissent au même endroit : pas d'étiquette en bout de ligne)
    const lx = W - m.d + 8, ly = m.h + 30 + Object.keys(series).indexOf(id) * 20;
    g += `<line x1="${lx}" x2="${lx + 24}" y1="${ly}" y2="${ly}" stroke="${couleurs[id]}" stroke-width="2.5"${traits[id]}/><text x="${lx + 30}" y="${ly + 4}" fill="#0b0b0b" font-size="12">${S.STRATEGIES[id].nom}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="system-ui, sans-serif"><rect width="${W}" height="${H}" fill="#fcfcfb"/><text x="${m.g}" y="16" fill="#0b0b0b" font-size="14" font-weight="600">Autonomie alimentaire (moyenne mobile sur ${S.LISSAGE} nuits), graine ${graine}</text>${g}</svg>\n`;
}
const svgPath = resolve(option('svg', 'simulation-autonomie.svg'));
writeFileSync(svgPath, svgAutonomie(parties));

/* ---------- résumé console ---------- */

const pad = (v, n) => String(v).padStart(n);
const affiche = [1, 5, 8, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80].filter((n) => n <= nuits);
console.log(`Simulation : ${nuits} nuits, graine ${graine}, moteur de ${indexPath}`);
for (const id of ids) {
  const rows = parties[id];
  console.log(`\n== ${S.STRATEGIES[id].nom} (${S.STRATEGIES[id].eveilS} s d'éveil par jour) ==`);
  console.log(' nuit  chap  autonomie  santé(moy/min)  pièces  conserves  soins');
  for (const n of affiche) {
    const r = rows[n - 1];
    console.log(`${pad(r.nuit, 5)}${pad(r.chapitre, 6)}${pad(num(r.autonomie, 0) + ' %', 11)}${pad(num(r.santeMoyenne, 0) + '/' + r.santeMin, 16)}${pad(num(r.pieces, 0), 8)}${pad(r.conserves, 11)}${pad(r.soinsPayes, 7)}`);
  }
  const debutChap = [];
  for (let c = 2; c <= 8; c++) {
    const r = rows.find((q) => q.chapitre >= c);
    if (r) debutChap.push(`${c === 8 ? 'libre' : 'ch' + c}@${r.nuit}`);
  }
  const zero = rows.filter((r) => r.santeMin <= 0);
  const fin = rows.find((r) => r.conserves === 0);
  console.log(`Chapitres atteints : ${debutChap.length ? debutChap.join(' ') : 'aucun au-delà du 1'}`);
  console.log(`Conserves épuisées : ${fin ? 'nuit ' + fin.nuit : 'jamais'} · santé à 0 : ${zero.length ? zero.length + ' nuit(s), dès la nuit ' + zero[0].nuit : 'jamais'} · soins payés : ${rows[rows.length - 1].soinsPayes}`);
}

/* ---------- vérifications (joueur appliqué) ---------- */

const resultats = [];
function verifie(nom, ok, detail) {
  resultats.push({ nom, ok });
  console.log(`${ok ? '[OK]    ' : '[ÉCHEC] '}${nom}\n          ${detail}`);
}

console.log('\n== Vérifications (joueur appliqué, sections 8.10 et 8.11) ==');
if (!parties.applique) {
  console.log('Stratégie « applique » non jouée : vérifications ignorées.');
} else {
  const rows = parties.applique;

  // 1. Potager niveau 2 avant la fin des conserves
  const p2 = rows.find((r) => r.potager >= 2);
  const finConserves = rows.find((r) => r.conserves === 0);
  verifie(
    'Potager niveau 2 acheté avant la fin des conserves',
    !!p2 && (!finConserves || p2.nuit <= finConserves.nuit),
    `Potager niveau 2 : ${p2 ? 'nuit ' + p2.nuit : 'jamais acheté'} ; conserves épuisées : ${finConserves ? 'nuit ' + finConserves.nuit : 'jamais'}.`,
  );

  // 2. Aucune santé à 0
  const zero = rows.filter((r) => r.santeMin <= 0);
  verifie(
    'Aucune santé à 0 pour le joueur appliqué',
    zero.length === 0,
    zero.length ? `Un membre de la famille tombe à 0 dès la nuit ${zero[0].nuit} (${zero.length} nuit(s) sur ${rows.length}) ; santé mini ${Math.min(...rows.map((r) => r.santeMin))}.` : `Santé mini sur la partie : ${Math.min(...rows.map((r) => r.santeMin))}.`,
  );

  // 3. Courbe d'autonomie (jalons de la section 8.10)
  for (const j of S.JALONS) {
    const n = E.simulationReach(rows, j.pct);
    const k = S.LISSAGE;
    const fen = rows.slice(Math.max(0, j.nuit - k), j.nuit);
    const aLaNuit = fen.length ? fen.reduce((t, r) => t + r.autonomie, 0) / fen.length : 0;
    verifie(
      `Autonomie ${j.pct} % vers la nuit ${j.nuit} (± ${S.TOLERANCE_NUITS} nuits)`,
      n !== null && Math.abs(n - j.nuit) <= S.TOLERANCE_NUITS,
      `Atteinte à la nuit ${n === null ? 'jamais (dans ces ' + nuits + ' nuits)' : n} (moyenne sur ${k} nuits) ; à la nuit ${j.nuit} elle vaut ${num(aLaNuit, 0)} %.`,
    );
  }

  // 4. Dépannage : une unité de nourriture achetée chaque nuit, encore payable à la nuit N
  const D = S.DEPANNAGE;
  const dep = E.simulateGame('applique', Math.max(nuits, D.nuit), graine, { depannage: { item: D.item, dernier: null } });
  const r30 = dep[D.nuit - 1];
  verifie(
    `Un joueur qui achète 1 ${D.item} par nuit peut encore se la payer à la nuit ${D.nuit}`,
    !!r30 && !!r30.depannage && r30.depannage.possible,
    r30 && r30.depannage ? `Nuit ${D.nuit} : prochaine unité à ${num(r30.depannage.prix)} 💰, le joueur avait de quoi l'acheter : ${r30.depannage.possible ? 'oui' : 'non'} (pièces au réveil : ${num(r30.pieces)}).` : 'Pas de donnée.',
  );
}

const echecs = resultats.filter((r) => !r.ok).length;
console.log(`\nRapport : ${resultats.length - echecs} OK, ${echecs} ÉCHEC sur ${resultats.length} vérifications.`);
console.log(`CSV : ${csvPath}\nGraphique : ${svgPath}`);
process.exit(echecs ? 1 : 0);
