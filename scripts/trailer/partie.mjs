// La partie du trailer : une ferme bâtie et vivante sur la graine 42, fabriquée par les aides du mode
// test du moteur (comme tests/deux-joueurs.mjs). `partieTrailer()` renvoie l'état ; `sauvegarde(s)` son texte.
import {
  addItem, awakeMsAtHour, DATA, farmTerrain, findPlot, maxStage, plant, poserBloc, takeItem, testAddCows, testAddEggs, testAddFlour, testAddFood,
  testAddHens, testAddOil, testAddSeeds, testAddSheep, testAllTools, testBatir, testFarmMap, testFillEnergy, testFillTank, hoe,
  testSetLevel, toutVoir,
} from '../../js/engine/index.js';
import { readFileSync } from 'node:fs';
import { levelCount } from '../../js/engine/levels.js';
import { garden, reglagesDuJeu } from '../../tests/engine/aide.mjs';

export const GRAINE = '42';
export const CHAMP = { x: 334, y: 262, w: 12, h: 6 };      // (cases du monde)
export const TERRASSE = { x: 333, y: 251 };

function donner(s, sorte, tile) {
  const B = DATA.ATELIER.BLOCS[sorte];
  if (B.objet) addItem(s, B.objet, 1);
  const r = poserBloc(s, sorte, tile);
  if (!r.ok && B.objet) takeItem(s, B.objet, 1);
  return r.ok;
}

export function partieTrailer() {
  const s = garden();
  reglagesDuJeu();
  testFarmMap(s, GRAINE);
  testSetLevel(s, levelCount());
  const coins = {};
  for (const id of ['foyer', 'four', 'cuisine', 'boite', 'poulailler', 'etable', 'serre', 'moulin', 'silo', 'puits']) { const r = testBatir(s, id); if (r.coin !== undefined) coins[id] = r.coin; }
  testAllTools(s); testAddSeeds(s); testAddFood(s); testFillTank(s); testFillEnergy(s);
  testAddEggs(s, 30); testAddFlour(s, 20); testAddOil(s, 20);
  testAddHens(s, 4); testAddSheep(s, 3); testAddCows(s, 2);
  // le champ : dans le pré à l'est des bâtiments, des rangs de cultures mûres ou en pousse ; les deux
  // derniers rangs restent en terre nue (à semer)
  const W = farmTerrain(s).LARGEUR, rangs = ['tomate', 'tournesol', 'carotte', 'fraise'];
  s.potager.houe = true;
  const rates = [];
  for (let y = 0; y < CHAMP.h; y++) for (let x = 0; x < CHAMP.w; x++) {
    testFillEnergy(s);
    const t = (CHAMP.y + y) * W + CHAMP.x + x, r = hoe(s, t);
    if (!r.ok) { rates.push([x, y, r.raison || r.message]); continue; }
    if (y >= CHAMP.h - 2) continue;
    if (!plant(s, r.plot.id, rangs[y % rangs.length]).ok) continue;
    const q = findPlot(s, r.plot.id);
    q.stade = y === 2 ? Math.max(1, maxStage(q) - 1) : maxStage(q);
    q.arrose = false;
  }
  testFillEnergy(s);
  // la terrasse : une table de jardin, ses chaises, des lanternes, des bacs
  const at = (x, y) => (TERRASSE.y + y) * W + TERRASSE.x + x;
  const pose = { rates, refus: [] };
  const mets = (sorte, x, y) => { if (!donner(s, sorte, at(x, y))) pose.refus.push([sorte, x, y]); };
  for (const [x, y] of [[2, 2], [3, 2]]) mets('table_jardin', x, y);
  for (const [x, y] of [[1, 2], [4, 2], [2, 1], [3, 1], [2, 3], [3, 3]]) mets('chaise_jardin', x, y);
  for (const [x, y] of [[0, 0], [5, 0], [0, 4], [5, 4]]) mets('lanterne', x, y);
  for (const [x, y] of [[1, 0], [4, 0]]) mets('bac_lavande', x, y);
  s.cheval = { monte: false, nourri: true, attache: null };
  toutVoir(s);
  const noms = { 'adulte-1': 'Camille', 'adulte-2': 'Hugo', 'enfant-1': 'Tom', 'enfant-2': 'Lou' };
  for (const m of s.famille.membres) { m.prenom = noms[m.id] || m.prenom; m.nom = m.prenom; }
  s.famille.nom = 'Lune';
  return { s, coins, pose };
}

// La même partie pour un autre joueur : son personnage du catalogue, son prénom.
export function partieDe(s, prenom, perso) {
  const c = JSON.parse(JSON.stringify(s));
  const m = c.famille.membres.find((x) => x.id === c.famille.principal) || c.famille.membres[0];
  Object.assign(m, { prenom, nom: prenom, perso, apparence: null });
  return c;
}

export const sauvegarde = (s) => JSON.stringify({ v: s.version, t: Date.now(), s });

// Une vraie partie exportée du jeu (⚙️ Options › Exporter) : son état, tel quel. Le tournage ne l'écrit
// jamais : il joue sur une copie, dans le navigateur du studio.
export function partieExportee(fichier) {
  const j = JSON.parse(readFileSync(fichier, 'utf8'));
  if (!j || !j.s) throw new Error('Ce fichier n\'est pas une partie exportée du jeu.');
  return j.s;
}

// La mise en scène du potager, sur une copie de la partie : au bas du plus grand champ, quatre rangs de
// LARGEUR cases prêts pour les quatre gestes (de haut en bas : à récolter, à arroser, à semer, à labourer),
// l'énergie et l'eau pleines, l'heure du matin. Renvoie { s, rangs: { recolte, eau, semis, houe } } (des
// cases du monde, de gauche à droite).
export function miseEnScene(s0, largeur = 5) {
  const s = JSON.parse(JSON.stringify(s0));
  const W = farmTerrain(s).LARGEUR, P = s.potager.parcelles;
  const par = new Map(P.map((p) => [p.case, p]));
  // le rang du bas le plus long, puis les trois au-dessus, sur les mêmes colonnes
  let best = null;
  for (const p of P) {
    let n = 0;
    while (n < 12 && [0, 1, 2, 3].every((k) => par.has(p.case + n - k * W))) n += 1;
    const dessous = par.has(p.case + W);
    if (n >= largeur && !dessous && (!best || n > best.n)) best = { t: p.case, n };
  }
  if (!best) return { s, rangs: null };
  const rang = (k) => Array.from({ length: largeur }, (_, i) => best.t + i - k * W);
  const rangs = { houe: rang(0), semis: rang(1), eau: rang(2), recolte: rang(3) };
  const culture = (par.get(rangs.recolte[0]).culture) || 'ble';
  for (const t of rangs.recolte) { const p = par.get(t); if (!p.culture) p.culture = culture; p.stade = maxStage(p); p.arrose = true; }
  for (const t of rangs.eau) { const p = par.get(t); if (!p.culture) p.culture = culture; p.stade = Math.max(1, maxStage(p) - 2); p.arrose = false; }
  for (const t of rangs.semis) { const p = par.get(t); p.culture = null; p.stade = 0; p.arrose = false; }
  s.potager.parcelles = P.filter((p) => !rangs.houe.includes(p.case));
  s.potager.houe = true;
  testAllTools(s); testFillEnergy(s); testFillTank(s); testAddSeeds(s);
  s.awakeMs = awakeMsAtHour(10);
  return { s, rangs };
}
