/* ==========================================================================
   Tests du moteur : énergie du personnage (1.8), houe (1.9, 1.15), pioche, hache, canne à pêche.
   Lancer seul : node --test tests/engine/outils.test.mjs (ou node tests/run-tests.mjs outils).
   ========================================================================== */

import {
  actionCost, actionsLeft, actionXp, borderMask, brokenRocks, buyHoe, buyTool, canBorder, castLine,
  chopsLeft, chopTree, countItem, cutGrass, grassCut, scytheGrass, createInitialState, DATA, eatSnack, enduranceReduction,
  energyLevel, energyMax, farmOpen, fellenTrees, findPlot, fishLeft, happinessCostPct, hasHoe,
  hasTool, hoe, hoeableTiles, hoeStatus, isArable, isBuyable, makePlot, makePlots, migrate,
  migrateEnergy, migrateHoe, mineRock, OUTILS, ownedTools, plant, plantAll, plotAtTile,
  farmTerrain, respawnRocks, respawnTrees, restoreEnergy, rockGone, runNight, selectedTool, selectTool,
  snackEnergy, soilCap, soilCount, STATE_VERSION, terrainLines, testFillEnergy, morceauxDe, ramasserMorceau, testSetEnergyZero,
  testSetLevel, TIRED, toolDef, wakeEnergy, water, zoneTile, enSelle, toggleTriporteur, vitesseDeplacement,
} from '../../js/engine/index.js';
import {
  assert, assertEqual, champ, garden, growZone, setInv, sleepOnce, test, tireless,
} from './aide.mjs';

// run-tests.mjs importe ce fichier et lit `results`.
/* ---------- version 1.8 (v2, lot 4) : l'énergie du personnage ---------- */

test('version 1.8 : le coût d\'une action dépend du bonheur et de l\'endurance', () => {
  const s = garden();
  assertEqual([energyMax(), energyLevel(s), happinessCostPct(s), enduranceReduction(s)], [100000, 100, 70, 0], 'bonheur 60 : −30 %');
  assertEqual(actionCost(s, 'planter'), 2100);
  assertEqual(actionCost(s, 'moudre', 4), 2800, 'moudre : par blé');
  assertEqual(actionCost(s, 'acheter'), 0, 'ce qui n\'est pas une action au clic ne coûte rien');
  for (const m of s.famille.membres) m.bonheur = 0;
  assertEqual(actionCost(s, 'planter'), 3000, 'bonheur 0 : plein tarif');
  for (const m of s.famille.membres) m.bonheur = 100;
  assertEqual(actionCost(s, 'planter'), 1500, 'bonheur 100 : moitié prix');
  testSetLevel(s, 10);
  assertEqual(enduranceReduction(s), 27, '−3 % par niveau');
  assertEqual(actionCost(s, 'planter'), Math.ceil((3000 * 50 * 73) / 10000));
  assertEqual(actionsLeft(s, 'recolter'), Math.floor(100000 / actionCost(s, 'recolter')));
});

test('version 1.8 : sans énergie, plus d\'action au clic ; les automatisations restent gratuites', () => {
  const s = garden();
  const avant = s.energie;
  assert(plant(s, 'potager-1', 'carotte').ok);
  assertEqual(s.energie, avant - actionCost(s, 'planter'));
  testSetEnergyZero(s);
  const r = water(s, 'potager-1');
  assertEqual([r.ok, r.error || r.message || r.texte || ''].map(String)[0], 'false');
  assertEqual(findPlot(s, 'potager-1').arrose, false, 'rien n\'est fait');
  assert(water(s, 'potager-1', true).ok, 'l\'arrosage automatique ne demande pas d\'énergie');
  assertEqual(s.energie, 0);
  assert(plant(s, 'potager-2', 'carotte', true).ok);
  testFillEnergy(s);
  assertEqual(s.energie, energyMax());
});

test('version 1.8 : manger un aliment dans la journée rend ses calories ÷ 5', () => {
  const s = garden();
  assertEqual(eatSnack(s, 'carotte').ok, false, 'énergie pleine');
  s.energie = 10000;
  setInv(s, { carotte: 2 });
  assertEqual(snackEnergy(s, 'carotte'), DATA.OBJETS.carotte.energie * 200);
  const r = eatSnack(s, 'carotte');
  assertEqual([r.ok, s.energie, countItem(s, 'carotte')], [true, 10000 + snackEnergy(s, 'carotte'), 1]);
  assertEqual(eatSnack(s, 'graine_carotte').ok, false, 'ne se mange pas');
  setInv(s, {});
  assertEqual(eatSnack(s, 'carotte').ok, false, 'plus rien');
  s.energie = energyMax() - 1;
  setInv(s, { conserve: 1 });
  assert(eatSnack(s, 'conserve').ok);
  assertEqual(s.energie, energyMax(), 'jamais au-delà du maximum');
});

test('version 1.8 : le réveil remonte l\'énergie selon le repas du soir', () => {
  const s = garden();
  assertEqual([wakeEnergy(s, 100), wakeEnergy(s, 50), wakeEnergy(s, 0)], [100000, 80000, 60000]);
  s.energie = 90000;
  assertEqual(restoreEnergy(s, 0), 90000, 'une énergie plus haute est gardée');
  s.technologies = [...(s.technologies || []), 'fa_sommeil'];
  assertEqual(wakeEnergy(s, 0), 70000, 'Bon sommeil : +10');
  assertEqual(wakeEnergy(s, 100), 100000, 'plafonné au maximum');
});

test('version 1.8 : migration v25 → v26 : santé, soins et nœuds retirés', () => {
  const s = createInitialState(1);
  const old = JSON.parse(JSON.stringify(s));
  old.version = 25;
  delete old.energie;
  old.famille.soinsPayes = 3;
  for (const m of old.famille.membres) { m.sante = 40; m.malade = true; }
  old.technologies = ['fa_remedes', 'fa_menus'];
  old.pieces = 10;
  old.pointsTech = { ...old.pointsTech, solde: 0 };
  old.nuit = { ...(old.nuit || {}), bonusPlats: 2, santeAvant: 50 };
  const m = migrateEnergy(old);
  assertEqual([m.version, m.energie, 'soinsPayes' in m.famille], [26, 100000, false]);
  assertEqual(m.famille.membres.some((x) => 'sante' in x || 'malade' in x), false);
  assertEqual([m.technologies, m.pieces, m.pointsTech.solde], [[], 410, 2], 'nœuds retirés remboursés');
  assertEqual(['bonusPlats' in m.nuit, 'santeAvant' in m.nuit], [false, false]);
  assertEqual(migrate({ v: 25, t: 0, s: old }).energie, 100000, 'chargement d\'une ancienne partie');
});

/* ---------- version 1.9 (v2, lot 5) : la houe ---------- */

test('version 1.9 : la houe s\'achète une fois au Marché', () => {
  const s = garden();
  assertEqual([hasHoe(s), DATA.HOUE.PRIX], [false, 40]);
  s.pieces = 39;
  assertEqual(buyHoe(s).ok, false, 'pas assez de pièces');
  s.pieces = 100;
  assertEqual([buyHoe(s).cost, s.pieces, hasHoe(s)], [40, 60, true]);
  assertEqual([buyHoe(s).ok, s.pieces], [false, 60], 'une seule houe');
});

/* ---------- les outils : pioche, hache, canne à pêche et outil choisi ---------- */

test('outils : la hache et la pioche s\'achètent une fois au Marché ; l\'outil choisi va sur le bouton', () => {
  const s = garden();
  assertEqual([selectedTool(s), ownedTools(s), 'outils' in s], [null, [], false], 'au départ : aucun outil, rien d\'enregistré');
  assertEqual(selectTool(s, 'hache').ok, false, 'pas de hache : on ne la choisit pas');
  s.pieces = DATA.HACHE.PRIX - 1;
  assertEqual(buyTool(s, 'hache').ok, false, 'pas assez de pièces');
  s.pieces = 1000;
  assertEqual([buyTool(s, 'hache').cost, s.pieces, hasTool(s, 'hache'), selectedTool(s)], [DATA.HACHE.PRIX, 1000 - DATA.HACHE.PRIX, true, 'hache'], 'le premier outil va sur le bouton');
  assertEqual(buyTool(s, 'hache').ok, false, 'une seule hache');
  assertEqual([buyTool(s, 'houe').ok, hasHoe(s), selectedTool(s)], [true, true, 'hache'], 'la houe passe par buyHoe ; le choix ne change pas');
  assertEqual([buyTool(s, 'pioche').ok, ownedTools(s)], [true, ['houe', 'pioche', 'hache']], 'dans l\'ordre de la barre d\'outils');
  assertEqual([buyTool(s, 'canne').ok, hasTool(s, 'canne'), ownedTools(s)], [true, true, ['houe', 'pioche', 'hache', 'canne']], 'la canne à pêche, quatrième outil');
  assertEqual([selectTool(s, 'pioche').ok, selectedTool(s)], [true, 'pioche']);
  assertEqual(selectTool(s, 'marteau').ok, false, 'outil inconnu');
  assertEqual(OUTILS.map((id) => toolDef(id).ICONE), ['⛏️', '⚒️', '🪓', '🌾‍🔪', '🎣']);
});

test('outils : une partie avec la houe seule l\'a sur le bouton ; le Marché fermé ne vend pas la hache', () => {
  const s = garden();
  s.potager.houe = true;
  assertEqual(selectedTool(s), 'houe');
  s.outils = { hache: false, pioche: false, choisi: 'pioche' };
  assertEqual(selectedTool(s), 'houe', 'un outil choisi qu\'on n\'a pas revient à la houe');
  const t = createInitialState(1);
  t.pieces = 1000;
  assertEqual(buyTool(t, 'hache').ok, farmOpen(t), 'le Marché ouvre avec le panneau et la pompe');
});

test('triporteur : acheté une fois au Marché, il fait rouler plus vite ; on en descend et on y remonte', () => {
  const s = garden();
  const T = DATA.TRIPORTEUR;
  assertEqual([enSelle(s), vitesseDeplacement(s)], [false, 1], 'à pied sans triporteur');
  assertEqual(toggleTriporteur(s).error, `Il te faut un triporteur (Marché, ${T.PRIX} 💰).`);
  s.pieces = T.PRIX - 1;
  assertEqual(buyTool(s, 'triporteur').ok, false, 'trop cher');
  s.pieces = T.PRIX + 10;
  const choisi = selectedTool(s);
  assertEqual(buyTool(s, 'triporteur').ok, true);
  assertEqual([s.pieces, enSelle(s), vitesseDeplacement(s), selectedTool(s)], [10, true, T.VITESSE, choisi], 'en selle tout de suite, sans changer d\'outil en main');
  assert(!OUTILS.includes('triporteur') && !ownedTools(s).includes('triporteur'), 'il ne se prend pas en main');
  assertEqual(buyTool(s, 'triporteur').error, 'Tu as déjà un triporteur.');
  assertEqual(toggleTriporteur(s).enSelle, false);
  assertEqual(vitesseDeplacement(s), 1, 'descendu : à pied');
  assertEqual(toggleTriporteur(s).enSelle, true);
  assertEqual(T.VITESSE, 3, 'trois fois plus vite');
});

test('hache : chaque coup sur un arbre donne du bois, de l\'XP, coûte de l\'énergie ; au COUPES-ième, il tombe', () => {
  const s = garden();
  assertEqual(chopTree(s, '14,25').error, `Il te faut une hache (Marché, ${DATA.HACHE.PRIX} 💰).`);
  s.outils = { hache: true, pioche: false, choisi: 'hache' };
  const [e, xp] = [s.energie, s.progression.xp];
  const r = chopTree(s, '14,25');
  assertEqual([r.ok, r.bois, r.tombe, r.reste, countItem(s, 'bois'), s.energie, s.progression.xp - xp],
    [true, DATA.HACHE.BOIS, false, DATA.HACHE.COUPES - 1, DATA.HACHE.BOIS, e - actionCost(s, 'couper'), DATA.NIVEAUX.XP.couper]);
  let last = null;
  for (let k = 1; k < DATA.HACHE.COUPES; k++) last = chopTree(s, '14,25');
  assertEqual([last.tombe, chopsLeft(s, '14,25'), fellenTrees(s)], [true, 0, ['14,25']], 'au dernier coup, il tombe');
  assertEqual([chopTree(s, '14,25').error, chopTree(s, '20,30').ok], ['Cet arbre est déjà abattu.', true], 'un autre arbre se coupe');
  s.day += 1;
  assertEqual(chopsLeft(s, '20,30'), DATA.HACHE.COUPES - 1, 'les coups reçus restent d\'un jour à l\'autre');
  s.energie = 0;
  assertEqual(chopTree(s, '20,30').error, TIRED);
  assertEqual([DATA.OBJETS.bois.categorie, isBuyable('bois')], ['produit', false], 'le bois se vend, ne se rachète pas');
});

test('hache : un arbre abattu repousse au bout de RETOUR jours, sauf si une parcelle occupe une de ses tuiles', () => {
  const [lo, hi] = DATA.HACHE.RETOUR;
  const A = DATA.TERRAIN.ARBRES;
  assert(Object.keys(A).length > 50, 'les arbres de la carte ont leurs tuiles');
  // un arbre et une de ses tuiles qu'il est seul à couvrir
  const seul = (t) => !Object.entries(A).some(([k, l]) => l.includes(t) && k !== id) && !Object.values(DATA.TERRAIN.ROCHERS).some((l) => l.includes(t));
  const etat = () => {
    const x = garden();
    x.outils = { hache: true, pioche: false, choisi: 'hache' };
    x.potager.houe = true;
    x.potager.parcelles = [];
    return x;
  };
  // (une tuile qui se laboure une fois l'arbre tombé : pas au bord de la carte ni d'un chemin)
  let id = null, tuile;
  for (const [k, l] of Object.entries(A)) {
    id = k;
    const x = etat();
    for (let n = 0; n < DATA.HACHE.COUPES; n++) chopTree(x, k);
    tuile = l.find((t) => seul(t) && hoeStatus(x, t).ok);
    if (tuile !== undefined) break;
  }
  assert(tuile !== undefined, 'un arbre seul sur une tuile labourable');
  const s = etat();
  assertEqual([isArable(tuile), isArable(tuile, s)], [false, false], 'sous l\'arbre : pas de labour');
  for (let k = 0; k < DATA.HACHE.COUPES; k++) chopTree(s, id);
  const retour = s.outils.arbres[id].retour;
  assert(retour >= s.day + lo && retour <= s.day + hi, `repousse entre ${lo} et ${hi} jours (${retour - s.day})`);
  assertEqual(isArable(tuile, s), true, 'la tuile libérée se laboure');
  assert(hoe(s, tuile).ok, 'labour de la tuile libérée');
  s.day = retour;
  assertEqual([respawnTrees(s), fellenTrees(s)], [[], [id]], 'une parcelle sur sa tuile : il attend');
  assert(hoe(s, tuile).ok, 'reboucher');
  s.day = retour + 2;
  assertEqual([respawnTrees(s), fellenTrees(s), chopsLeft(s, id)], [[id], [], DATA.HACHE.COUPES], 'la tuile libre : il repousse, entier');
  for (let k = 0; k < DATA.HACHE.COUPES; k++) chopTree(s, id);
  s.outils.arbres[id].retour = s.day + 1;
  runNight(s);
  assertEqual(fellenTrees(s), [], 'repoussé au réveil');
  // une tuile sous deux arbres ne se laboure que quand les deux sont tombés
  const double = Object.entries(A).flatMap(([k, l]) => l.map((t) => [t, k])).find(([t, k]) => Object.entries(A).some(([k2, l2]) => k2 !== k && l2.includes(t)));
  if (double) {
    const [t, k] = double;
    const autre = Object.entries(A).find(([k2, l2]) => k2 !== k && l2.includes(t))[0];
    const u = garden();
    u.outils = { hache: true, choisi: 'hache' };
    for (let n = 0; n < DATA.HACHE.COUPES; n++) chopTree(u, k);
    assertEqual(isArable(t, u), false, 'l\'autre arbre la couvre encore');
    for (let n = 0; n < DATA.HACHE.COUPES; n++) chopTree(u, autre);
    assertEqual(isArable(t, u), true);
  }
});

test('pioche : chaque coup sur un rocher donne de la pierre ; au COUPS-ième, il est cassé', () => {
  const s = garden();
  assertEqual(mineRock(s, '25,13').error, `Il te faut une pioche (Marché, ${DATA.PIOCHE.PRIX} 💰).`);
  s.outils = { hache: false, pioche: true, choisi: 'pioche' };
  const [e, xp] = [s.energie, s.progression.xp];
  const r = mineRock(s, '25,13');
  assertEqual([r.ok, r.pierre, r.casse, countItem(s, 'pierre'), s.energie, s.progression.xp - xp],
    [true, DATA.PIOCHE.PIERRE, false, DATA.PIOCHE.PIERRE, e - actionCost(s, 'piocher'), DATA.NIVEAUX.XP.piocher]);
  let last = r;
  for (let k = 1; k < DATA.PIOCHE.COUPS; k++) last = mineRock(s, '25,13');
  assertEqual([last.casse, rockGone(s, '25,13'), brokenRocks(s), countItem(s, 'pierre')], [true, true, ['25,13'], DATA.PIOCHE.PIERRE * DATA.PIOCHE.COUPS + DATA.PIOCHE.BRIS]);
  assertEqual(mineRock(s, '25,13').ok, false, 'un rocher cassé ne se casse plus');
  assertEqual(mineRock(s, '44,16').ok, true, 'un autre rocher se casse');
  s.energie = 0;
  assertEqual(mineRock(s, '44,16').error, TIRED);
  assertEqual([DATA.OBJETS.pierre.categorie, isBuyable('pierre')], ['produit', false], 'la pierre se vend, ne se rachète pas');
});

test('hache et pioche sur une carte : chaque coup lâche un morceau au sol, la chute et le bris deux de plus ; on les ramasse', () => {
  const s = garden();
  s.outils = { hache: true, pioche: true, choisi: 'hache' };
  const ou = { carte: 'ferme', coup: [{ x: 10, y: 20 }, { x: 12, y: 22 }], fin: [{ x: 40, y: 20 }, { x: 52, y: 24 }] };
  const coups = [];
  for (let k = 0; k < DATA.HACHE.COUPES; k++) { testFillEnergy(s); coups.push(chopTree(s, '14,25', ou)); }
  assertEqual(coups.map((r) => [r.morceaux.coup.length, r.morceaux.fin.length]), [[1, 0], [1, 0], [1, 2]], '1 par coup, 2 de plus à la chute');
  assertEqual([countItem(s, 'bois'), morceauxDe(s, 'ferme').length, morceauxDe(s, 'ville').length], [0, 5, 0], 'au sol, pas dans l\'inventaire');
  assertEqual(coups[2].morceaux.fin.map((m) => [m.item, m.x, m.y]), [['bois', 40, 20], ['bois', 52, 24]], 'là où la cime touche le sol');
  // la pioche : pareil, 1 + 1 + 3 pierres
  for (let k = 0; k < DATA.PIOCHE.COUPS; k++) { testFillEnergy(s); mineRock(s, '25,13', ou); }
  const L = morceauxDe(s, 'ferme');
  assertEqual([L.length, L.filter((m) => m.item === 'pierre').length, new Set(L.map((m) => m.n)).size], [10, 5, 10]);
  // ramassés un à un (une fois chacun)
  for (const m of L) assert(ramasserMorceau(s, m.n).ok);
  assertEqual([countItem(s, 'bois'), countItem(s, 'pierre'), morceauxDe(s, 'ferme').length, ramasserMorceau(s, L[0].n).ok], [5, 5, 0, false]);
});

test('faux : faucher une touffe donne de la paille au sol, de l\'XP, coûte de l\'énergie ; elle repousse au bout de RETOUR jours', () => {
  const s = tireless(garden());
  const X = DATA.FAUX;
  assertEqual(scytheGrass(s, '40,60').ok, false, 'sans faux');
  s.pieces = 1000;
  assert(buyTool(s, 'faux').ok);
  assertEqual(ownedTools(s), ['faux']);
  const xp = s.progression.xp, e0 = energyLevel(s);
  const r = scytheGrass(s, '40,60', { carte: 'ferme', coup: [{ x: 40, y: 60 }] });
  assertEqual([r.ok, r.paille, r.morceaux.coup.map((m) => [m.item, m.x, m.y]), countItem(s, 'paille')], [true, X.PAILLE, [['paille', 40, 60]], 0], 'la paille tombe au sol');
  assertEqual(ramasserMorceau(s, r.morceaux.coup[0].n).ok, true);
  assertEqual(countItem(s, 'paille'), 1);
  assertEqual([s.progression.xp - xp, e0 - energyLevel(s) > 0], [actionXp('faucher'), true]);
  assertEqual([grassCut(s, '40,60'), cutGrass(s), scytheGrass(s, '40,60').ok], [true, ['40,60'], false], 'une touffe fauchée ne se refauche pas');
  const retour = s.outils.herbes['40,60'].retour;
  assert(retour >= s.day + X.RETOUR[0] && retour <= s.day + X.RETOUR[1]);
  while (s.day < retour - 1) sleepOnce(s);
  assertEqual(grassCut(s, '40,60'), true);
  sleepOnce(s);
  assertEqual([grassCut(s, '40,60'), cutGrass(s)], [false, []], 'elle a repoussé');
});

test('canne à pêche : un lancer coûte de l\'énergie ; une prise (truite, brochet) donne le poisson et de l\'XP ; JOUR prises par eau et par jour', () => {
  const s = garden();
  assertEqual(castLine(s, 'etang').error, `Il te faut une canne à pêche (Marché, ${DATA.CANNE.PRIX} 💰).`);
  s.outils = { canne: true, choisi: 'canne' };
  assertEqual(castLine(s, 'riviere').ok, false, 'eau inconnue');
  const vus = new Set();
  let lancers = 0, rien = 0;
  const J = DATA.CANNE.JOUR.etang;
  while (fishLeft(s, 'etang') > 0 && lancers < 200) {
    s.energie = energyMax(s);
    const [e, xp] = [s.energie, s.progression.xp];
    const r = castLine(s, 'etang');
    lancers += 1;
    assert(r.ok, 'lancer');
    assertEqual(s.energie, e - actionCost(s, 'pecher'), 'énergie à chaque lancer');
    if (r.poisson) { vus.add(r.poisson); assertEqual(s.progression.xp - xp, DATA.NIVEAUX.XP.pecher); } else { rien += 1; assertEqual(s.progression.xp, xp, 'pas d\'XP sans prise'); }
  }
  assertEqual(countItem(s, 'truite') + countItem(s, 'brochet'), J, `${J} prises dans l'étang`);
  assert(vus.has('truite') && lancers === J + rien, 'des truites ; les lancers vides ne comptent pas');
  assertEqual(castLine(s, 'etang').ok, false, 'l\'étang ne donne plus aujourd\'hui');
  assertEqual(fishLeft(s, 'mare'), DATA.CANNE.JOUR.mare, 'la mare, si');
  s.day += 1;
  assertEqual(fishLeft(s, 'etang'), J, 'le lendemain, l\'étang redonne');
  s.energie = 0;
  assertEqual(castLine(s, 'etang').error, TIRED);
  // sur beaucoup de lancers, le brochet sort (plus rare que la truite)
  const t = garden();
  t.outils = { canne: true };
  const n = { truite: 0, brochet: 0, rien: 0 };
  for (let k = 0; k < 400; k++) { t.day = k; t.energie = energyMax(t); n[castLine(t, 'etang').poisson || 'rien'] += 1; }
  assert(n.brochet > 40 && n.truite > n.brochet && n.rien > 40, `répartition ${JSON.stringify(n)}`);
  assertEqual([DATA.OBJETS.truite.mangeable, DATA.OBJETS.brochet.mangeable, isBuyable('truite'), isBuyable('brochet')], [true, true, false, false]);
});

test('pioche : un rocher cassé revient au bout de RETOUR jours, sauf si une parcelle occupe une de ses tuiles', () => {
  const [lo, hi] = DATA.PIOCHE.RETOUR;
  const tuile = DATA.TERRAIN.ROCHERS['18,27'][0];
  const s = garden();
  s.outils = { hache: false, pioche: true, choisi: 'pioche' };
  s.potager.houe = true;
  s.potager.parcelles = [];                       // sous le plafond de tuiles de terre
  assertEqual([isArable(tuile), isArable(tuile, s), hoeStatus(s, tuile).action], [false, false, null], 'sous le rocher : pas de labour');
  for (let k = 0; k < DATA.PIOCHE.COUPS; k++) mineRock(s, '18,27');
  const retour = s.outils.rochers['18,27'].retour;
  assert(retour >= s.day + lo && retour <= s.day + hi, `retour entre ${lo} et ${hi} jours (${retour - s.day})`);
  assertEqual([isArable(tuile, s), terrainLines(s)[Math.floor(tuile / DATA.TERRAIN.LARGEUR)][tuile % DATA.TERRAIN.LARGEUR]], [true, '#'], 'la tuile libérée se laboure');
  assert(hoe(s, tuile).ok, 'labour de la tuile libérée');
  s.day = retour;
  assertEqual([respawnRocks(s), rockGone(s, '18,27')], [[], true], 'une parcelle sur sa tuile : il attend');
  assert(hoe(s, tuile).ok, 'reboucher');
  s.day = retour + 4;
  assertEqual([respawnRocks(s), rockGone(s, '18,27'), mineRock(s, '18,27').coups], [['18,27'], false, 1], 'la tuile libre : il revient, entier');
  // au réveil (runNight), le jour venu
  for (let k = 1; k < DATA.PIOCHE.COUPS; k++) mineRock(s, '18,27');
  s.outils.rochers['18,27'].retour = s.day + 1;
  runNight(s);
  assertEqual(rockGone(s, '18,27'), false, 'revenu au réveil');
  const t = garden();
  t.outils = { pioche: true, rochers: { '18,27': 2 } };
  assertEqual(respawnRocks(t), [], 'un rocher entamé reste entamé');
});

test('version 1.9 : labourer une case d\'herbe coûte de l\'énergie et rapporte de l\'XP, dans le plafond', () => {
  const s = garden();
  testSetLevel(s, 2);
  assertEqual(hoe(s, champ(0, 0)).error, `Il te faut une houe (Marché, ${DATA.HOUE.PRIX} 💰).`);
  s.potager.houe = true;
  const [e, xp] = [s.energie, s.progression.xp];
  const r = hoe(s, champ(0, 0));
  assertEqual([r.ok, r.action, r.plot.id, r.plot.case, soilCount(s)], [true, 'labourer', 'potager-7', champ(0, 0), 7]);
  assertEqual([e - s.energie, s.progression.xp - xp], [actionCost(s, 'labourer'), actionXp('labourer')]);
  assertEqual(s.potager.parcelles.map((p) => p.case), [...[0, 1, 2, 5, 6, 7].map((c) => zoneTile(1, c)), champ(0, 0)], 'rangées par tuile');
  assert(plant(tireless(s), 'potager-7', 'carotte').ok, 'la nouvelle terre se plante');
  for (const [c, r2] of [[1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]) assert(hoe(s, champ(c, r2)).ok, `tuile ${c},${r2}`);
  const plein = hoeStatus(s, champ(3, 0));
  assertEqual([plein.ok, plein.raison], [false, 'Plafond atteint : 12 tuiles au niveau 2. Niveau suivant : +8 tuiles.']);
  assertEqual([hoe(s, 0).ok, hoe(s, -1).ok, hoe(s, 1e6).ok], [false, false, false], 'hors de l\'herbe ou de la carte');
  s.energie = 0;
  testSetLevel(s, 3);
  assertEqual(hoe(s, champ(3, 0)).error, TIRED);
});

test('version 1.9 : reboucher une terre vide est gratuit et rend la place ; une terre plantée reste', () => {
  const s = garden();
  s.potager.houe = true;
  const [e, xp] = [s.energie, s.progression.xp];
  assertEqual(hoeStatus(s, zoneTile(1, 0)).action, 'reboucher');
  const r = hoe(s, zoneTile(1, 0));
  assertEqual([r.ok, r.action, r.plot.id, soilCount(s), s.energie, s.progression.xp], [true, 'reboucher', 'potager-1', 5, e, xp]);
  assertEqual(findPlot(s, 'potager-1'), null);
  assert(hoe(s, champ(0, 0)).ok, 'la place rendue se laboure ailleurs');
  assertEqual(plotAtTile(s, champ(0, 0)).id, 'potager-7', 'jamais un identifiant déjà pris');
  plant(s, 'potager-2', 'carotte');
  assertEqual(hoe(s, zoneTile(1, 1)).ok, false, 'terre plantée');
});

test('version 1.9 : le plafond compte toutes les terres de la carte', () => {
  const s = garden();
  tireless(s);
  s.potager.houe = true;
  growZone(s, 30);
  testSetLevel(s, 4);
  assertEqual([soilCount(s), soilCap(s)], [30, 32]);
  assert(hoe(s, champ(0, 0)).ok && hoe(s, champ(1, 0)).ok);
  assertEqual([soilCount(s), hoeStatus(s, champ(2, 0)).ok], [32, false]);
});

test('version 1.9 : migration v26 → v27 : les parcelles prennent une case, la houe est offerte', () => {
  const s = createInitialState(1);
  const old = JSON.parse(JSON.stringify(s));
  old.version = 26;
  old.potager = { niveau: 2, parcelles: makePlots(12), zone2: [1, 2].map((n) => ({ ...makePlot(n), id: `zone2-${n}`, zone: 2 })) };
  old.potager.parcelles[3].culture = 'carotte';
  const m = migrateHoe(old);
  assertEqual([m.version, 'niveau' in m.potager, m.potager.houe], [27, false, true]);
  assertEqual(m.potager.parcelles.map((p) => p.case), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assertEqual([m.potager.parcelles[3].culture, m.potager.zone2.map((p) => p.case)], ['carotte', [0, 1]]);
  const full = migrate({ v: 26, t: 0, s: old });
  assertEqual([full.version, full.potager.parcelles.length, full.potager.zone2], [STATE_VERSION, 14, []], 'version 1.15 : le Champ rejoint la liste unique');
  assert(sleepOnce(full) !== null, 'la partie migrée passe la nuit');
});

/* ---------- version 1.15 : la houe sur toute la carte ---------- */

test('version 1.15 : la houe laboure n\'importe quelle tuile d\'herbe de la carte, dans le plafond', () => {
  const T = DATA.TERRAIN;
  assertEqual([T.LARGEUR, T.HAUTEUR, T.LIGNES.length], [72, 57, 57]);
  const arables = [];
  for (let t = 0; t < T.LARGEUR * T.HAUTEUR; t++) if (isArable(t)) arables.push(t);
  assert(arables.length > 800, 'des centaines de tuiles labourables');
  const s = garden();
  s.potager.houe = true;
  tireless(s);
  testSetLevel(s, 2);
  // tout en bas de la carte, loin de l'ancienne zone, avec de l'herbe tout autour
  const W = T.LARGEUR;
  const ouvert = (t) => [-W - 1, -W, -W + 1, -1, 1, W - 1, W, W + 1].every((d) => canBorder(t + d));
  const loin = arables.filter(ouvert).pop();
  const r = hoe(s, loin);
  assertEqual([r.ok, r.plot.case, plotAtTile(s, loin).id], [true, loin, 'potager-7']);
  assert(plant(s, 'potager-7', 'carotte').ok, 'elle se plante comme les autres');
  assertEqual(hoe(s, loin).ok, false, 'plantée : ne se rebouche pas');
});

test('version 1.15 : ni chemin, ni eau, ni forêt, ni abords du poulailler, du moulin ou du verger', () => {
  const s = garden();
  s.potager.houe = true;
  tireless(s);
  const W = DATA.TERRAIN.LARGEUR;
  const tuile = (x, y) => Math.floor(y / 16) * W + Math.floor(x / 16);
  assertEqual(hoe(s, 0).ok, false, 'la forêt du coin de la carte');
  assertEqual(hoe(s, tuile(160, 300)).ok, false, 'à côté du poulailler (rayon 8)');
  assertEqual(hoe(s, tuile(670, 560)).ok, false, 'au pied du moulin');
  assertEqual(hoe(s, tuile(980, 600)).ok, false, 'au milieu du verger');
  assertEqual(hoe(s, tuile(1000, 450)).ok, false, 'sur un chemin');
  assert(/herbe/.test(hoeStatus(s, 0).raison), 'la raison est donnée');
});

test('migration v31 → v32 : les terres de la Zone de culture et du Champ gardent leur place sur la carte', () => {
  const s = garden();
  const old = JSON.parse(JSON.stringify(s));
  old.version = 31;
  old.potager.parcelles = old.potager.parcelles.map((p, i) => ({ ...p, case: [0, 1, 2, 5, 6, 7][i] }));
  old.potager.zone2 = [{ ...makePlot(1), id: 'zone2-1', zone: 2, case: 9, culture: 'ble', stade: 2 }];
  const m = migrate({ v: 31, t: 0, s: old });
  assertEqual(m.version, STATE_VERSION);
  assertEqual(m.potager.parcelles.map((p) => p.case), [...[0, 1, 2, 5, 6, 7].map((c) => zoneTile(1, c)), zoneTile(2, 9)]);
  assertEqual([m.potager.zone2, findPlot(m, 'zone2-1').culture, 'zone' in findPlot(m, 'zone2-1')], [[], 'ble', false]);
  assert(m.potager.parcelles.every((p) => isArable(p.case)), 'toutes sur de l\'herbe labourable');
  assert(sleepOnce(m) !== null);
});

test('version 1.15 : la terre déborde en bordure sur les 8 tuiles voisines, qui doivent pouvoir la porter', () => {
  const s = garden();
  s.potager.houe = true;
  tireless(s);
  testSetLevel(s, 6);
  assert(hoe(s, champ(0, 0)).ok);
  const ecart = hoeStatus(s, champ(2, 0));
  assertEqual([ecart.ok, ecart.dessin], [false, true], 'une seule tuile d\'herbe entre deux terres : refusé');
  assert(/mi-herbe mi-terre/.test(ecart.raison));
  assert(hoe(s, champ(1, 1)).ok, 'en diagonale, collée : la bordure en coin existe');
  assert(hoe(s, champ(3, 3)).ok, 'en diagonale à une tuile : la tuile diagonale existe');
  assert(hoe(s, champ(1, 0)).ok, 'l\'écart se comble : une tuile de plus, pas de pont');
  const dirt = new Set(s.potager.parcelles.map((p) => p.case));
  assertEqual(borderMask(dirt, champ(2, 2)), 9, 'herbe entre deux terres en diagonale');
  // au bord d'un chemin : la bordure tomberait sur le chemin
  const W = DATA.TERRAIN.LARGEUR;
  let bord = -1;
  for (let t = 0; t < W * DATA.TERRAIN.HAUTEUR && bord < 0; t++) {
    if (isArable(t) && !canBorder(t + 1) && !plotAtTile(s, t)) bord = t;
  }
  assert(bord >= 0);
  const st = hoeStatus(s, bord);
  assertEqual([st.ok, st.dessin], [false, true], 'à côté d\'une tuile qui ne porte pas de bordure : refusé');
  // reboucher ne laisse pas de tuile d'herbe prise entre deux terres
  assert(hoe(s, champ(2, 0)).ok, 'la rangée 0,0 – 2,0');
  assertEqual(hoeStatus(s, champ(1, 0)).ok, false, 'reboucher le milieu laisserait une herbe entre deux terres');
  assertEqual(hoeStatus(s, champ(2, 0)).action, 'reboucher');
  assertEqual(hoeStatus(s, champ(2, 0)).ok, true, 'reboucher un bout : permis');
  // un écart de deux tuiles ne se comble pas (chaque labour laisserait une herbe seule)
  assert(hoe(s, champ(5, 0)).ok);
  assertEqual([hoeStatus(s, champ(3, 0)).ok, hoeStatus(s, champ(4, 0)).ok], [false, false]);
});

test('version 1.15 : la grille de la houe montre exactement les tuiles que la houe accepte', () => {
  const s = garden();
  s.potager.houe = true;
  tireless(s);
  testSetLevel(s, 6);
  assert(hoe(s, champ(0, 0)).ok);
  const tiles = hoeableTiles(s);
  assert(tiles.length > 100);
  assertEqual(tiles.includes(champ(0, 0)), false, 'pas une terre déjà labourée');
  assertEqual(tiles.includes(champ(2, 0)), false, 'pas une tuile qui laisserait une herbe seule');
  assertEqual(tiles.includes(champ(1, 0)), true, 'la voisine, oui');
  for (const t of tiles.slice(0, 40)) assertEqual(hoeStatus(s, t).ok, true, `tuile ${t}`);
});

test('carte générée (étape 1) : le moteur suit la taille du terrain de la ferme, pas 72 × 57', () => {
  // un petit terrain de 10 × 8 tuiles : de l'herbe labourable entourée de chemin, un rocher
  // de deux tuiles (« 4,3 ») au milieu
  const petit = {
    LARGEUR: 10, HAUTEUR: 8,
    LIGNES: ['..........', '.########.', '.########.', '.###oo###.', '.########.', '.########.', '.########.', '..........'],
    ROCHERS: { '4,3': [34, 35] }, ARBRES: {},
    ZONES: { 1: { X: 1, Y: 1, COLONNES: 4 }, 2: { X: 5, Y: 4, COLONNES: 4 } },
  };
  const avant = DATA.TERRAIN;
  DATA.TERRAIN = petit;
  try {
    const s = garden();
    s.potager.parcelles = [];
    s.potager.houe = true;
    tireless(s);
    testSetLevel(s, 6);
    assertEqual(farmTerrain(s), petit);
    assertEqual([isArable(22, s), isArable(34, s), isArable(80, s)], [true, false, false], 'herbe, rocher debout, hors du terrain');
    const libres = hoeableTiles(s);
    assert(libres.length > 0 && libres.every((t) => t < 80), 'la grille de la houe tient dans le terrain');
    assertEqual([libres.includes(22), libres.includes(25)], [true, false], 'à côté du rocher : sa bordure ne se dessinerait pas');
    // une rangée ne déborde pas sur la suivante : la tuile 29 (bout de la rangée 2) n'a pas
    // la 30 (début de la rangée 3) pour voisine
    assertEqual([borderMask(new Set([30]), 29), borderMask(new Set([28]), 29)], [0, 10]);
    assertEqual([hoe(s, 22).ok, plotAtTile(s, 22).case], [true, 22]);
    assertEqual(terrainLines(s)[3], '.###..###.', 'le rocher debout : pas de labour sous lui');
    s.outils = { rochers: { '4,3': { retour: s.day } } };
    assertEqual([isArable(34, s), hoeableTiles(s).includes(25), terrainLines(s)[3]], [true, true, '.########.'], 'cassé : sa place se laboure');
    assertEqual(respawnRocks(s), ['4,3'], 'il revient à sa place');
    assertEqual(zoneTile(2, 5), 5 * 10 + 6, 'les anciennes zones : en tuiles du terrain');
  } finally {
    DATA.TERRAIN = avant;
  }
});

test('migration v32 → v33 (FLU-06) : la bulle de la houe n\'est pas remontrée à qui a déjà labouré', () => {
  const s = garden();
  const old = JSON.parse(JSON.stringify(s));
  old.version = 32;
  delete old.potager.houeVue;
  old.potager.houe = true;
  assertEqual(migrate({ v: 32, t: 0, s: old }).potager.houeVue, true);
  const neuve = JSON.parse(JSON.stringify(old));
  neuve.potager.houe = false;
  assertEqual(migrate({ v: 32, t: 0, s: neuve }).potager.houeVue, false);
  assertEqual(createInitialState(1).potager.houeVue, false);
});

test('FLU-09 : « Planter partout » plante les parcelles vides dans la limite des graines, de l\'énergie et du niveau', () => {
  const s = garden();
  setInv(s, { conserve: 100, graine_carotte: 6 });
  const e = s.energie, xp = s.progression.xp;
  const r = plantAll(s, 'potager', 'carotte');
  assertEqual([r.ok, r.plantees, r.vides], [true, 6, 6]);
  assertEqual([e - s.energie, s.progression.xp - xp], [6 * actionCost(s, 'planter'), 6 * actionXp('planter')], 'comme 6 plantations à la main');
  assertEqual(plantAll(s, 'potager', 'carotte').ok, false, 'plus de parcelle vide');
  const peu = garden();
  setInv(peu, { conserve: 100, graine_carotte: 4 });
  const r2 = plantAll(peu, 'potager', 'carotte');
  assertEqual([r2.ok, r2.plantees, r2.vides, /graines/i.test(r2.raison)], [true, 4, 6, true], 'stock insuffisant');
  const las = garden();
  setInv(las, { conserve: 100, graine_carotte: 6 });
  las.energie = actionCost(las, 'planter') * 2;
  const r3 = plantAll(las, 'potager', 'carotte');
  assertEqual([r3.plantees, r3.raison], [2, TIRED], 'énergie insuffisante');
  const ver = garden();
  setInv(ver, { conserve: 100, graine_poivron: 6 });
  assertEqual(plantAll(ver, 'potager', 'poivron').ok, false, 'culture pas encore débloquée');
});
