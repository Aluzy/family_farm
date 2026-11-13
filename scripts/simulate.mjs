#!/usr/bin/env node
// Simulation et équilibrage (Lot 10, conception sections 8.10 et 8.11).
//
// Comme les tests du moteur (tests/engine/), ce script importe le moteur (js/engine/) et joue des
// parties complètes avec lui, sans interface.
// Le joueur automatique et ses réglages vivent dans le moteur
// (DATA.SIMULATION et fonctions bot*/simulate*) : le script ne fait que lancer
// les parties, écrire le CSV, le graphique du bonheur, et faire les vérifications.
//
//   node scripts/simulate.mjs                       # les deux stratégies, 80 nuits
//   node scripts/simulate.mjs --nuits 60 --graine 7
//   node scripts/simulate.mjs --strategie applique  # ou minimal, ou toutes
//   node scripts/simulate.mjs --village             # le chantier « l'île à bâtir » allumé (VILLAGE.ACTIF)
//
// Options : --nuits N (80), --graine N (1), --strategie applique|minimal|toutes,
//           --csv fichier (simulation.csv), --svg fichier (simulation-bonheur.svg),
//           --racine dossier/du/jeu (une autre copie du dépôt), --lissage N (nuits de la moyenne mobile),
//           --village (fiche I1b : le réglage VILLAGE.ACTIF allumé ; le joueur simulé commerce au port, la
//           partie suit les paliers de l'île ; le chapitre 7 et le dépannage n'y sont que des constats).
// Code de sortie : 0 si toutes les vérifications sont OK, 1 sinon ; « l'argent qui s'empile » n'est qu'un
// constat (fiche I0b) : son échec est dit, sans changer le code de sortie.
// Le CSV porte aussi les comptes de chaque nuit, par poste (gain_*, depense_* : fiche I0b) ; la fin de la
// sortie les résume (le revenu moyen par jour par tranche de nuits, les premiers postes).

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, engineUrl } from './lib/engine-source.mjs';

/* ---------- arguments ---------- */

const args = process.argv.slice(2);
function option(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
}
if (args.includes('--aide') || args.includes('--help')) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 23).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}

/* ---------- le moteur ---------- */

const racine = resolve(option('racine', ROOT));
let E;
try {
  E = await import(engineUrl(racine));
} catch (err) {
  console.error(`Moteur introuvable dans ${racine} : ${err.message}`);
  process.exit(2);
}
const S = E.DATA.SIMULATION;
// I1b : --village allume le chantier « l'île à bâtir » (le port remplace la calèche, les paliers les chapitres)
const village = args.includes('--village');
if (village) E.DATA.VILLAGE.ACTIF = true;

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

// I0b : les comptes de chaque nuit, par poste (bot.js posteSimulation) : les pièces gagnées (gain_*) et
// dépensées (depense_*) dans la journée, leurs totaux, et les matériaux bruts fournis au joueur simulé.
const GAINS = ['vente_cultures', 'vente_plats', 'vente_produits', 'vente_autres', 'courrier', 'objectifs_du_jour'];
const DEPENSES = ['graines', 'arbres', 'achats_hameaux', 'achats_autres', 'commandes', 'appareils', 'technologies', 'batiments', 'entretien'];
const autres = (o, connus) => Object.entries(o).filter(([k]) => !connus.includes(k)).reduce((t, [, v]) => t + v, 0);
const somme = (o) => Object.values(o).reduce((t, v) => t + v, 0);
const entete = ['strategie', 'nuit', 'chapitre', 'energie', 'bonheur', 'niveau', 'pieces', 'conserves', 'couverture_pct', 'tuiles',
  ...GAINS.map((k) => 'gain_' + k), 'gain_autres', 'gains_total', ...DEPENSES.map((k) => 'depense_' + k), 'depense_autres', 'depenses_total', 'materiaux_fournis'];
const num = (x, d = 2) => String(Math.round(x * 10 ** d) / 10 ** d);
const lignes = [entete.join(',')];
for (const id of ids) {
  for (const r of parties[id]) {
    lignes.push([id, r.nuit, r.chapitre, r.energie, num(r.bonheur), r.niveau, num(r.pieces), r.conserves, num(r.couverture * 100), r.tuiles,
      ...GAINS.map((k) => num(r.gains[k] || 0)), num(autres(r.gains, GAINS)), num(somme(r.gains)),
      ...DEPENSES.map((k) => num(r.depenses[k] || 0)), num(autres(r.depenses, DEPENSES)), num(somme(r.depenses)), somme(r.fournis)].join(','));
  }
}
const csvPath = resolve(option('csv', 'simulation.csv'));
writeFileSync(csvPath, lignes.join('\n') + '\n');

/* ---------- graphique SVG (bonheur de la famille, par stratégie) ---------- */

function svgBonheur(series) {
  const W = 760, H = 360, m = { g: 48, d: 170, h: 24, b: 40 };
  const x = (n) => m.g + ((n - 1) / Math.max(1, nuits - 1)) * (W - m.g - m.d);
  const y = (p) => H - m.b - (p / 100) * (H - m.b - m.h);
  const couleurs = { applique: '#2a78d6', minimal: '#eb6834' };
  const traits = { applique: '', minimal: ' stroke-dasharray="6 4"' };
  let g = '';
  for (const p of [0, 25, 50, 75, 100]) {
    g += `<line x1="${m.g}" x2="${W - m.d}" y1="${y(p)}" y2="${y(p)}" stroke="#d9d8d2" stroke-width="1"/><text x="${m.g - 8}" y="${y(p) + 4}" text-anchor="end" fill="#52514e" font-size="11">${p}</text>`;
  }
  const pas = nuits > 40 ? 10 : 5;
  for (let n = pas; n <= nuits; n += pas) g += `<text x="${x(n)}" y="${H - m.b + 18}" text-anchor="middle" fill="#52514e" font-size="11">${n}</text>`;
  g += `<text x="${(m.g + W - m.d) / 2}" y="${H - 6}" text-anchor="middle" fill="#52514e" font-size="12">Nuit</text>`;
  for (const [id, rows] of Object.entries(series)) {
    // moyenne mobile
    const k = S.LISSAGE;
    const pts = rows.map((r, i) => {
      const w = rows.slice(Math.max(0, i - k + 1), i + 1);
      return `${x(r.nuit)},${y(w.reduce((t, q) => t + q.bonheur, 0) / w.length)}`;
    });
    g += `<polyline points="${pts.join(' ')}" fill="none" stroke="${couleurs[id]}" stroke-width="2.5" stroke-linejoin="round"${traits[id]}/>`;
    // légende (les deux courbes finissent au même endroit : pas d'étiquette en bout de ligne)
    const lx = W - m.d + 8, ly = m.h + 30 + Object.keys(series).indexOf(id) * 20;
    g += `<line x1="${lx}" x2="${lx + 24}" y1="${ly}" y2="${ly}" stroke="${couleurs[id]}" stroke-width="2.5"${traits[id]}/><text x="${lx + 30}" y="${ly + 4}" fill="#0b0b0b" font-size="12">${S.STRATEGIES[id].nom}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="system-ui, sans-serif"><rect width="${W}" height="${H}" fill="#fcfcfb"/><text x="${m.g}" y="16" fill="#0b0b0b" font-size="14" font-weight="600">Bonheur de la famille (moyenne mobile sur ${S.LISSAGE} nuits), graine ${graine}</text>${g}</svg>\n`;
}
const svgPath = resolve(option('svg', 'simulation-bonheur.svg'));
writeFileSync(svgPath, svgBonheur(parties));

/* ---------- résumé console ---------- */

const pad = (v, n) => String(v).padStart(n);
const affiche = [1, 5, 8, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80].filter((n) => n <= nuits);
console.log(`Simulation : ${nuits} nuits, graine ${graine}, moteur de ${racine}${village ? ', le chantier « l\'île à bâtir » allumé (--village)' : ''}`);
for (const id of ids) {
  const rows = parties[id];
  console.log(`\n== ${S.STRATEGIES[id].nom} (${S.STRATEGIES[id].eveilS} s d'éveil par jour) ==`);
  console.log(' nuit  chap  énergie  bonheur  niveau  pièces  conserves');
  for (const n of affiche) {
    const r = rows[n - 1];
    console.log(`${pad(r.nuit, 5)}${pad(r.chapitre, 6)}${pad(r.energie, 9)}${pad(num(r.bonheur, 0), 9)}${pad(r.niveau, 8)}${pad(num(r.pieces, 0), 8)}${pad(r.conserves, 11)}`);
  }
  const debutChap = [];
  for (let c = 2; c <= 8; c++) {
    const r = rows.find((q) => q.chapitre >= c);
    if (r) debutChap.push(`${c === 8 ? 'libre' : 'ch' + c}@${r.nuit}`);
  }
  const zero = rows.filter((r) => r.couverture <= 0);
  const fin = rows.find((r) => r.conserves === 0);
  console.log(`Chapitres atteints : ${debutChap.length ? debutChap.join(' ') : 'aucun au-delà du 1'}`);
  console.log(`Conserves épuisées : ${fin ? 'nuit ' + fin.nuit : 'jamais'} · nuits sans repas : ${zero.length ? zero.length + ', dès la nuit ' + zero[0].nuit : 'aucune'} · bonheur final : ${num(rows[rows.length - 1].bonheur, 0)}`);
}

/* ---------- vérifications (joueur appliqué) ---------- */

const resultats = [];
// `constat` : une vérification qui ne fait que constater (son échec ne change pas le code de sortie).
function verifie(nom, ok, detail, { constat = false } = {}) {
  resultats.push({ nom, ok, constat });
  console.log(`${ok ? '[OK]     ' : constat ? '[CONSTAT]' : '[ÉCHEC]  '} ${nom}\n          ${detail}`);
}

console.log('\n== Vérifications (joueur appliqué, sections 8.10 et 8.11, fiche I0b) ==');
if (!parties.applique) {
  console.log('Stratégie « applique » non jouée : vérifications ignorées.');
} else {
  const rows = parties.applique;

  // 1. Version 1.9 : 12 tuiles de terre (le plafond du niveau 2) avant la fin des conserves
  const p2 = rows.find((r) => r.tuiles >= E.DATA.NIVEAUX.TUILES[1]);
  const finConserves = rows.find((r) => r.conserves === 0);
  verifie(
    `${E.DATA.NIVEAUX.TUILES[1]} tuiles de terre avant la fin des conserves`,
    !!p2 && (!finConserves || p2.nuit <= finConserves.nuit),
    `${E.DATA.NIVEAUX.TUILES[1]} tuiles labourées : ${p2 ? 'nuit ' + p2.nuit : 'jamais'} ; conserves épuisées : ${finConserves ? 'nuit ' + finConserves.nuit : 'jamais'}.`,
  );

  // 2. Aucune nuit sans repas (version 1.8 : à la place de « aucune santé à 0 »)
  const zero = rows.filter((r) => r.couverture <= 0);
  verifie(
    'Aucune nuit sans repas pour le joueur appliqué',
    zero.length === 0,
    zero.length ? `La famille ne mange rien dès la nuit ${zero[0].nuit} (${zero.length} nuit(s) sur ${rows.length}).` : `Bonheur mini sur la partie : ${num(Math.min(...rows.map((r) => r.bonheur)), 0)}.`,
  );

  // 3. Dépannage : une unité de nourriture achetée chaque nuit, encore payable à la nuit N
  const D = S.DEPANNAGE;
  const dep = E.simulateGame('applique', Math.max(nuits, D.nuit), graine, { depannage: { item: D.item, dernier: null } });
  const r30 = dep[D.nuit - 1];
  verifie(
    `Un joueur qui achète 1 ${D.item} par nuit peut encore se la payer à la nuit ${D.nuit}`,
    !!r30 && !!r30.depannage && r30.depannage.possible,
    r30 && r30.depannage ? `Nuit ${D.nuit} : prochaine unité à ${num(r30.depannage.prix)} 💰, le joueur avait de quoi l'acheter : ${r30.depannage.possible ? 'oui' : 'non'} (pièces au réveil : ${num(r30.pieces)}).` : `Pas de donnée${village ? ' (au port, il n\'achète que les jours où il y va)' : ''}.`,
    { constat: village },
  );

  // 4. I0b : le chapitre 7 atteint avant la nuit N (SIMULATION.VERIFS.CHAPITRE_7_AVANT)
  const N = S.VERIFS.CHAPITRE_7_AVANT;
  const ch7 = rows.find((r) => r.chapitre >= 7);
  verifie(
    `Chapitre 7 atteint avant la nuit ${N}`,
    !!ch7 && ch7.nuit < N,
    ch7 ? `Chapitre 7 en cours dès la nuit ${ch7.nuit}.` : `Chapitre ${rows[rows.length - 1].chapitre} à la dernière nuit (${rows[rows.length - 1].nuit})${village ? ' (les paliers de l\'île demandent des villageois, que le joueur simulé ne loge pas encore)' : ''}.`,
    { constat: village },
  );

  // 5. I0b : l'argent qui s'empile (un constat : n'entraîne pas de code de sortie non nul) : les pièces en
  // caisse à la dernière nuit, sous M fois la dépense des 20 dernières nuits (SIMULATION.VERIFS)
  const M = S.VERIFS.CAISSE_FOIS_DEPENSE, K = S.VERIFS.NUITS_DEPENSE;
  const fin = rows[rows.length - 1], depense = rows.slice(-K).reduce((t, r) => t + somme(r.depenses), 0);
  verifie(
    `Pièces en caisse à la nuit ${fin.nuit} sous ${M} fois la dépense des ${K} dernières nuits (l'argent qui s'empile)`,
    fin.pieces < M * depense,
    `En caisse : ${num(fin.pieces, 0)} 💰 ; dépensé sur les nuits ${rows[Math.max(0, rows.length - K)].nuit} à ${fin.nuit} : ${num(depense, 0)} 💰 (seuil : ${num(M * depense, 0)}).`,
    { constat: true },
  );
}

/* ---------- résumé : le revenu par tranche de nuits, les postes ---------- */

console.log('\n== Résumé des comptes ==');
const T = S.VERIFS.NUITS_DEPENSE;
for (const id of ids) {
  const rows = parties[id];
  console.log(`${S.STRATEGIES[id].nom} : revenu moyen par jour (gagné − dépensé = net), par tranche de ${T} nuits`);
  for (let k = 0; k < rows.length; k += T) {
    const t = rows.slice(k, k + T), g = t.reduce((a, r) => a + somme(r.gains), 0) / t.length, d = t.reduce((a, r) => a + somme(r.depenses), 0) / t.length;
    console.log(`  nuits ${pad(t[0].nuit, 2)} à ${pad(t[t.length - 1].nuit, 2)} : ${pad(num(g, 0), 5)} − ${pad(num(d, 0), 5)} = ${pad(num(g - d, 0), 5)} 💰/jour`);
  }
  const cumul = (cle) => {
    const o = {};
    for (const r of rows) for (const [p, v] of Object.entries(r[cle])) o[p] = (o[p] || 0) + v;
    const total = somme(o);
    return Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p, v]) => `${p} ${num(v, 0)} (${total ? Math.round((v * 100) / total) : 0} %)`).join(', ') || 'aucun';
  };
  console.log(`  premiers postes de gain : ${cumul('gains')}`);
  console.log(`  premiers postes de dépense : ${cumul('depenses')}`);
  const fournis = {};
  for (const r of rows) for (const [p, v] of Object.entries(r.fournis)) fournis[p] = (fournis[p] || 0) + v;
  console.log(`  matériaux bruts fournis (hors ce que la ferme offre) : ${Object.entries(fournis).sort((a, b) => b[1] - a[1]).map(([p, v]) => `${p} ${v}`).join(', ') || 'aucun'}`);
}

const echecs = resultats.filter((r) => !r.ok && !r.constat).length;
const constats = resultats.filter((r) => !r.ok && r.constat);
console.log(`\nRapport : ${resultats.filter((r) => r.ok).length} OK, ${echecs} ÉCHEC, ${constats.length} constat(s) sur ${resultats.length} vérifications.`);
for (const c of constats) console.log(`Constat (n'entraîne pas d'échec) : ${c.nom} : non.`);
console.log(`CSV : ${csvPath}\nGraphique : ${svgPath}`);
process.exit(echecs ? 1 : 0);
