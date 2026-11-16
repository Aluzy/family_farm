#!/usr/bin/env node
// La répétition de la bascule (fiche I9h, point 1 ; docs/ile.md) : des parties d'avant ouvertes sur l'île, de bout en
// bout, comme la page les ouvre (js/ui/storage.js : migrate, avec le passage sur l'île), puis jouées quelques nuits par le
// joueur automatique. Pour chacune :
//   1. la lecture du fichier (une sauvegarde exportée depuis ⚙️ Options, .json ou le texte copié, ou la partie seule) ;
//   2. la partie d'avant mise au format sans passer sur l'île (migrate, `ile: false`) : la ferme d'où elle part, pour
//      comparer ;
//   3. l'île : le format du jeu, le passage sur l'île (une fois), la ferme identique
//      (blocs, sols, hauteurs, fenêtres, l'étage et les niveaux du dessus, les papiers peints, les meubles, les parcelles),
//      les pièces jamais en baisse, le port, le tronçon à poser, la fenêtre du retour (ses lignes), une seconde ouverture
//      qui ne change rien ;
//   4. le jeu : le tronçon posé, la fenêtre fermée (le cadeau), N nuits du joueur automatique, sans erreur.
//
// Usage :
//   node scripts/repetition-bascule.mjs                       les parties gardées dans tests/engine/ (anciennes-parties.json,
//                                                             temoins.json, parties-main.json)
//   node scripts/repetition-bascule.mjs partie1.json partie2.txt …   des parties exportées par des joueurs (le mainteneur)
//   --nuits N (5)  : les nuits jouées après l'ouverture ;  --detail : les lignes de la fenêtre du retour
// Code de sortie : 0 si toutes passent, 1 sinon (le détail de chaque échec est écrit).

import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { ROOT, engineUrl } from './lib/engine-source.mjs';

const E = await import(engineUrl(ROOT));
const { DATA, STATE_VERSION } = E;

const args = process.argv.slice(2);
const option = (nom, def) => { const i = args.indexOf(`--${nom}`); return i >= 0 ? args[i + 1] : def; };
const nuits = Math.max(0, Math.floor(Number(option('nuits', 5))));
const detail = args.includes('--detail');
const fichiers = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--nuits');

// Une sauvegarde : { v, t, s } (l'export de ⚙️ Options, avec `jeu` et `exporteLe`, ou la sauvegarde de l'appareil), son
// texte en base64 (« Copier »), ou la partie seule (les fichiers de tests/engine/).
function lire(texte) {
  const t = String(texte).trim();
  const o = JSON.parse(t.startsWith('{') ? t : Buffer.from(t, 'base64').toString('utf8'));
  if (o && typeof o === 'object' && o.s && typeof o.s === 'object') return { v: o.v ?? o.s.version, t: o.t ?? 0, s: o.s, jeu: o.jeu };
  if (o && typeof o === 'object' && Number.isInteger(o.version)) return { v: o.version, t: 0, s: o };
  throw new Error('ce n\'est pas une sauvegarde du jeu');
}

const parties = [];
if (fichiers.length) {
  for (const f of fichiers) {
    try { parties.push({ nom: basename(f), ...lire(readFileSync(f, 'utf8')) }); } catch (e) { parties.push({ nom: basename(f), erreur: `illisible : ${e.message}` }); }
  }
} else {
  const json = (f) => JSON.parse(readFileSync(join(ROOT, 'tests', 'engine', f), 'utf8'));
  const anciennes = json('anciennes-parties.json'), temoins = json('temoins.json'), main = json('parties-main.json');
  for (const [k, s] of Object.entries(anciennes)) parties.push({ nom: `anciennes-parties › ${k}`, v: s.version, t: 0, s });
  for (const [k, p] of Object.entries(temoins)) if (p && p.s) parties.push({ nom: `temoins › ${k}`, v: p.s.version, t: 0, s: p.s });
  for (const [k, p] of Object.entries(main)) if (k[0] !== '/' && p && p.s) parties.push({ nom: `parties-main › ${k}`, v: p.v, t: p.t, s: p.s, jeu: p.jeu });
}

const copie = (o) => structuredClone(o);
// (ce que le joueur a bâti : le bas, l'étage, les niveaux du dessus, les papiers peints, les meubles, les parcelles, le lit)
const FERME = ['blocs', 'sols', 'hauteurs', 'rehausses', 'fenetres', 'blocsDessus', 'meubles', 'sens', 'teintes', 'etage', 'fenetresEtage', 'sensEtage', 'teintesEtage', 'dessusEtage', 'solsEtage', 'fenetresHautes', 'niveauxHauts', 'solsHauts', 'litPrincipal'];
function empreinte(s) {
  const cles = FERME.concat(Object.keys(s).filter((k) => /^papiers/.test(k)).sort());
  return JSON.stringify(cles.map((k) => [k, s[k] ?? null]).concat([['parcelles', ((s.potager && s.potager.parcelles) || []).map((p) => [p.case, p.culture || null])]]));
}

function repeter(p) {
  const r = { nom: p.nom, de: `${p.jeu ? `${p.jeu}, ` : ''}format ${p.v}, jour ${p.s.day}`, ok: true, notes: [], echecs: [] };
  const echec = (m) => { r.ok = false; r.echecs.push(m); };
  const t0 = performance.now();
  // 2. la partie d'avant au format du jeu, sans passer sur l'île
  const off = E.migrate({ v: p.v, t: p.t, s: copie(p.s) }, STATE_VERSION, { ile: false });
  const avant = E.partieDAvant(off);
  // 3. l'île
  let m;
  try { m = E.migrate({ v: p.v, t: p.t, s: copie(p.s) }); } catch (e) { echec(`l'ouverture lève : ${e.message}`); return r; }
  r.ms = Math.round(performance.now() - t0);
  if (m.version !== STATE_VERSION) echec(`le format : ${m.version} au lieu de ${STATE_VERSION}`);
  if (avant) {
    if (!m.port || E.partieDAvant(m) || E.migrationIleDue(m)) echec('la partie n\'est pas passée sur l\'île');
    if (!E.retourIle(m)) echec('pas de fenêtre du retour');
    if (empreinte(m) !== empreinte(off)) {
      const diff = FERME.filter((k) => JSON.stringify(m[k] ?? null) !== JSON.stringify(off[k] ?? null));
      echec(`la ferme a changé : ${diff.join(', ') || 'parcelles ou papiers'}`);
    }
    if (!(m.pieces >= off.pieces)) echec(`les pièces baissent : ${off.pieces} → ${m.pieces}`);
    r.notes.push(`passée sur l'île : port niveau ${m.port.niveau}, palier ${m.palier}, ${(m.candidats || []).length} ami(s) candidat(s), ${off.pieces} → ${m.pieces} pièces`);
    const L = E.lignesRetour(m);
    if (!L || L.lignes.length !== 5) echec('la fenêtre du retour n\'a pas ses cinq lignes');
    else if (detail) r.notes.push(...L.lignes.map((l) => `  ${l.icone} ${l.texte}`), `  🎁 ${L.cadeau}`);
  } else r.notes.push('déjà une partie de l\'île : rien à faire passer');
  const encore = E.migrate({ v: m.version, t: 0, s: copie(m) });
  if (JSON.stringify(encore) !== JSON.stringify(m)) echec('une seconde ouverture change la partie');
  // 4. le jeu
  try {
    {
      const blocs = Object.keys(m.blocs || {}).length;
      E.assurerTroncon(m);
      E.fermerRetourIle(m);
      const rows = nuits ? E.simulatePlay(m, 'applique', nuits) : [];
      if (rows.length !== nuits) echec(`${rows.length} nuits jouées sur ${nuits}`);
      if (!rows.every((x) => Number.isFinite(x.pieces) && x.pieces >= 0)) echec('l\'argent n\'est plus un nombre');
      if (Object.keys(m.blocs || {}).length < blocs * 0.9) echec('la ferme a fondu en jouant');
      if (Object.keys((m.monde && m.monde.hameaux) || {}).length) echec('un voisinage d\'avant renaît');
      const last = rows[rows.length - 1];
      r.notes.push(`${nuits} nuits jouées : jour ${m.day}, ${m.pieces} pièces, ${E.villageoisDe(m).length} villageois${last ? `, palier ${m.palier}` : ''}`);
      // (la partie jouée s'enregistre et se relit)
      const relue = E.migrate(JSON.parse(JSON.stringify({ v: m.version, t: 0, s: m })));
      if (JSON.stringify(relue) !== JSON.stringify(m)) echec('la partie jouée ne se relit pas à l\'identique');
    }
  } catch (e) { echec(`le jeu lève : ${e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message}`); }
  return r;
}

console.log(`La répétition de la bascule : ${parties.length} partie(s), format ${STATE_VERSION}, ${nuits} nuit(s) jouée(s).`);
let echecs = 0;
for (const p of parties) {
  if (p.erreur) { echecs += 1; console.log(`\n✗ ${p.nom} : ${p.erreur}`); continue; }
  const r = repeter(p);
  if (!r.ok) echecs += 1;
  console.log(`\n${r.ok ? '✓' : '✗'} ${r.nom} (${r.de}) : ouverte en ${r.ms ?? '?'} ms`);
  for (const n of r.notes) console.log(`    ${n}`);
  for (const e of r.echecs) console.log(`    ÉCHEC : ${e}`);
}
console.log(`\n${echecs ? `${echecs} partie(s) en échec` : 'Toutes les parties passent'} sur ${parties.length}.`);
process.exit(echecs ? 1 : 0);
