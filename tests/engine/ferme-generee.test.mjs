/* ==========================================================================
   Tests du moteur : la ferme générée d'après une graine (docs/carte-generee.md, étape 2) et
   le terrain d'une carte (terrain-carte.js).
   Lancer seul : node --test tests/engine/ferme-generee.test.mjs (ou node tests/run-tests.mjs ferme-generee).
   ========================================================================== */

import {
  assert, assertEqual, AVANT_DEMENAGEMENT, garden, migreAvant, reach, setInv, sleepOnce, test,
  tireless,
} from './aide.mjs';
import { readFileSync } from 'node:fs';
import { blocGid, MINE, TRONC_CREUX } from '../../js/engine/planche.js';
import {
  isArable as arable,
  arbresPlantes, asleep, atelierConstruit, atelierStatus, blocAt, blocBloque, blocDessus,
  blocsDidacticiel, blocsEnMain, blocsPoses, botteleuses, buildAtelier, buildStation, bushCut,
  bushOf, buyDehors, buyFurniture, buyHoe, buyItem, buyPasture, buyRuche, caseDepart,
  casesAbriAPoser, casesBuissonsCoupes, chopTree, commencerDidacticiel, coopCapacity, couchages,
  couchagesEtage, countItem, craft, craftStatus, createInitialState, createNewGame, cutBushes,
  dansPiece, DATA, eatSnack, eauCruche, escaliers, especeArbre, ETAGE_BLOCS, etageBlocs, fenetresEtage, fenetresPosees,
  etageCouvertes, etageEmprise, etapeDidacticiel, etatBotteleuse, etatEtable, etatMoulin,
  etatPoulailler, etatSilo, farmMap, farmOpen, farmPoint, farmSeed, farmTerrain, faucherSousBati,
  feedLivestock, fellenTrees, FERME_GENEREE, fleursPourAbeilles, freeSheepPlaces, genererFerme,
  genrePiece, goToSleep, grantTech, grassCut, harvestTree, hauteurMur, hauteurSilo, herbesSur, hoe,
  awakeMsAtHour, buyCheval, chevalMonte, chevalNuit, chevalOu, chevalRefus, descendreCheval, etatEcurie, monterCheval, rentrerCheval, toggleCheval, toggleTriporteur, vitesseCheval, vitesseDeplacement, hoeableTiles, houseRepaired, etatDistributeur, distributeurs, verserGrain, distribuerGrain, grainDans, isArable, isOwned, layEggs, machineDe, mainCharacter,
  majDidacticiel, makeCow, makeSheep, marcheOuvert, morceauxDe, nuitCouchee, nuitSansCouchage,
  objectifDidacticiel, passerDidacticiel, pickUp, piecesCloses, planAbri, planAbriCases, plant,
  poserBloc, blocDebloque, categorieBloc, addItem, poserEtage, poussesArbres, ramassables, ramasser, ramasserMorceau,
  recettesDidacticiel, regrowGrass, removeStarter, remplirCruche, remplirRuches, reprendreBloc,
  reprendreEtage, respawnBushes, respawnRocks, respawnTrees, robotBattery, robotCapacity,
  robotStation, robotTrip, ruchePleine, ruchesARecolter, runRobotCharge, sellItem, serreMurs,
  serrePlaces, setFarmSeed, siloCapacity, simulateOffline, skipNight, solAt, sortirBotte,
  stableHoused, stablePlaces, starterOf, STATE_VERSION, suivantDidacticiel, migrate, ETAPES, terrainOfMap,
  TEST_RESSOURCES, testAddBlocs, testAddItem, testAddMetaux, testAddRessources, testAllTools,
  testBuildAtelier, testFarmMap, testSetLevel, toits, tuilesChemins, unlockLevel,
  upgradePoulailler, verserFibres, water,
} from '../../js/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL('../../' + f, import.meta.url), 'utf8'));

test('le terrain d\'une carte, calculé par le jeu, est celui que scripts/carte/terres.py écrit pour la carte de Tiled', () => {
  // (le puits et la citerne ne sont pas dans la carte de Tiled : la scène les pose, DEFAULT_OBJECTS)
  const t = terrainOfMap(lire('assets/carte_printemps.json'), {
    puits: { x: 596, y: 390, width: 34, height: 38 }, citerne: { x: 629, y: 394, width: 24, height: 34 },
  });
  for (const k of ['LARGEUR', 'HAUTEUR', 'ZONES', 'LIGNES', 'ROCHERS', 'ARBRES']) assertEqual(t[k], DATA.TERRAIN[k], k);
});

// Les cases d'une carte où la couche `nom` a une tuile du bloc de lignes [r0, r1] de herbe_chemin
// (rangées 45 et suivantes de la planche, 16 colonnes) : 4 à 12 sont le chemin et ses raccords.
function chemin(carte) {
  const sol = carte.layers.find((l) => l.name === 'ground').data;
  return sol.map((g) => { const n = g - 1, c = n % 75, r = Math.floor(n / 75) - 45; return c < 16 && r >= 4 && r <= 12; });
}

test('ferme générée : la même graine donne la même carte, une autre graine une autre', () => {
  const a = genererFerme('test-1'), b = genererFerme('test-1'), c = genererFerme('test-2');
  assert(a === b, 'gardée une fois faite');
  assert(JSON.stringify(c.carte) !== JSON.stringify(a.carte), 'une autre graine, une autre carte');
  // d'une fois sur l'autre (pas seulement dans la même page) : toujours la même ferme pour
  // « test-1 » (à mettre à jour si le générateur change, ce qui change les fermes des parties)
  assertEqual([a.terrain.DECALAGE, Object.keys(a.terrain.ARBRES).length, a.terrain.LIGNES.join('').split('#').length - 1], [[25, 29], 255, 12010]);
  assertEqual([a.carte.width, a.carte.height, a.terrain.LARGEUR, a.terrain.HAUTEUR], [FERME_GENEREE.LARGEUR, FERME_GENEREE.HAUTEUR, 144, 114]);
});

for (const graine of ['1', '2', '7', 'abc', '12345']) {
  test(`ferme générée « ${graine} » : l'entrée de la mine, dans les bois, la porte dégagée`, () => {
    const { carte, terrain } = genererFerme(graine);
    const W = carte.width, T = carte.tilewidth;
    const o = carte.layers.find((l) => l.name === 'batiment').objects.find((x) => x.name === 'mine');
    assert(o, 'le rectangle de la mine');
    assertEqual([o.width, o.height, o.x % T, o.y % T], [3 * T, 3 * T, 0, 0], '3 × 3 tuiles');
    const c0 = o.x / T, r0 = o.y / T;
    const plantes = carte.layers.find((l) => l.name === 'plantes_pierres').data;
    for (let k = 0; k < 9; k++) {
      const i = (r0 + Math.floor(k / 3)) * W + c0 + (k % 3);
      assertEqual(plantes[i], MINE[k], 'les tuiles du tas');
      assertEqual(terrain.LIGNES[Math.floor(i / W)][i % W], '.', 'on ne bâtit pas sur la mine');
    }
    // devant la porte : deux rangées d'herbe, sans arbre (on y arrive en remontant)
    const arbres = carte.layers.filter((l) => l.name.startsWith('layer_tree'));
    for (const r of [r0 + 3, r0 + 4]) {
      for (let c = c0; c < c0 + 3; c++) {
        assertEqual(terrain.LIGNES[r][c], '#', 'de l\'herbe devant la porte');
        assert(arbres.every((l) => !l.data[r * W + c]), 'aucun arbre devant la porte');
      }
    }
  });

  test(`ferme générée « ${graine} » : un chemin mène de la maison à la sortie vers la transition`, () => {
    const { carte, terrain } = genererFerme(graine);
    const W = carte.width, T = carte.tilewidth;
    const objets = Object.fromEntries(carte.layers.filter((l) => l.type === 'objectgroup').flatMap((l) => l.objects).filter((o) => o.name).map((o) => [o.name, o]));
    const sortie = objets.vers_la_transition;
    assert(sortie, 'le rectangle de la sortie');
    assertEqual([sortie.x + sortie.width, sortie.height], [W * T, 3 * T], 'au bord est, 3 tuiles de haut');
    // de la sortie, en suivant le chemin, on arrive devant la maison
    const est = chemin(carte);
    const r0 = Math.floor((sortie.y + sortie.height / 2) / T);
    const vus = new Set([r0 * W + W - 1]), pile = [r0 * W + W - 1];
    assert(est[r0 * W + W - 1], 'la sortie est sur le chemin');
    while (pile.length) {
      const i = pile.pop(), c = i % W;
      for (const j of [c ? i - 1 : -1, c < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < est.length && est[j] && !vus.has(j)) { vus.add(j); pile.push(j); }
    }
    // (la place de la maison de la carte de Tiled, 513.5, 239, 94 × 95.6 px, décalée avec la cour)
    const [dx, dy] = terrain.DECALAGE, porte = (Math.ceil((239 + 95.6) / T) + 1 + dy) * W + Math.round((513.5 + 47) / T) + dx;
    assert(vus.has(porte), 'le chemin passe devant la place de la maison');
    assert(!objets.maison, 'pas de maison : le foyer se bâtit');
    // les bâtiments de la cour (provisoires) et les rochers, les arbres
    for (const n of ['ville', 'zone_culture_1', 'zone_culture_2']) assert(objets[n], n);
    assert(!objets.poulailler && !objets.grange && !objets.serre && !objets.silo && !objets.moulin, 'le Poulailler, l\'Étable, la Serre, le Silo et le Moulin se bâtissent');
    assert(!objets.verger && !objets.arbre_verger_1, 'pas de Verger : les arbres se plantent dans le sol');
    assert(!objets.puits && !objets.citerne, 'le puits et la citerne se bâtissent');
    assertEqual(Object.keys(terrain.ROCHERS).length, FERME_GENEREE.ROCHERS, 'les rochers');
    assert(Object.keys(terrain.ARBRES).length > 150, 'des bois');
    // un étang assez grand pour la pêche (FISHING.etang : 30 cases), et le tronc creux à son bord
    const sol = carte.layers.find((l) => l.name === 'ground').data;
    const eau = sol.map((g) => { const n = g - 1; return n % 75 >= 32 && n % 75 < 48 && Math.floor(n / 75) >= 45; });
    let plus = 0;
    const vu = new Uint8Array(eau.length);
    for (let i0 = 0; i0 < eau.length; i0++) {
      if (!eau[i0] || vu[i0]) continue;
      let n = 0;
      const p = [i0];
      vu[i0] = 1;
      while (p.length) {
        const i = p.pop(), c = i % W;
        n++;
        for (const j of [c ? i - 1 : -1, c < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < eau.length && eau[j] && !vu[j]) { vu[j] = 1; p.push(j); }
      }
      plus = Math.max(plus, n);
    }
    assert(plus >= 30, 'un étang de 30 cases au moins : ' + plus);
    const pp = carte.layers.find((l) => l.name === 'plantes_pierres').data;
    assert(pp.includes(TRONC_CREUX[0]) && pp.includes(TRONC_CREUX[1]) && !pp.includes(539), 'le tronc creux (le nouveau dessin, pas celui du pack)');
    // des milliers de tuiles labourables, dont les parcelles de départ
    assert(terrain.LIGNES.join('').split('#').length - 1 > 8000, 'de l\'herbe à labourer');
  });
}

test('ferme générée : une partie change de ferme en mode test (une autre graine)', () => {
  const s = garden();
  assertEqual([farmSeed(s), farmTerrain(s).LARGEUR, farmMap(s).width], ['1', 144, 144], 'sa ferme : celle de sa graine');
  s.outils = { arbres: { '14,25': { retour: 9 } }, rochers: { '25,13': 2 } };
  assertEqual(testFarmMap(s, 42), { ok: true, graine: '42' });
  const T = farmTerrain(s);
  assertEqual([T.LARGEUR, farmMap(s).width, s.outils.arbres, s.outils.rochers], [144, 144, {}, {}]);
  assert(s.potager.parcelles.length === DATA.POTAGER.DEPART.length && s.potager.parcelles.every((p) => isArable(p.case, s)), 'les parcelles de départ, sur la nouvelle carte');
  assert(hoeableTiles(s).length > 5000, 'la houe y laboure');
  // le robot : sa base et la Serre suivent la cour
  const [dx, dy] = T.DECALAGE;
  assertEqual(farmPoint(s, DATA.ROBOT.BASE), [DATA.ROBOT.BASE[0] + dx, DATA.ROBOT.BASE[1] + dy]);
  s.robot = { taches: [{ t: 'recolter', id: s.potager.parcelles[0].id }], i: 0, base: -1 };
  assert(robotTrip(s, s.robot, 0).route < 1, 'de sa base à une parcelle de départ : un court trajet');
  // la graine est sauvegardée
  const m = migreAvant({ v: STATE_VERSION, t: 0, s: JSON.parse(JSON.stringify(s)) });
  assertEqual(m.carte, { graine: '42' });
  assertEqual([testFarmMap(s, null).ok, testFarmMap(s, ' ').ok, farmSeed(s)], [false, false, '42'], 'il faut une graine');
  assertEqual([blocsPoses(s), houseRepaired(s)], [{}, false], 'les blocs de l\'autre ferme n\'y sont plus');
  assertEqual(createInitialState(1).carte, { graine: '1' }, 'une partie neuve : sa ferme générée');
});

/* ---------- étape 3 : ramasser à la main, l'Atelier ---------- */

test('ferme générée : chaque matin, des pierres et du bois à ramasser à la main (plus d\'herbes : la fibre vient de la faux)', () => {
  const s = garden();
  testFarmMap(s, 'r1');
  const R = DATA.ATELIER.RAMASSAGE, D = DATA.ATELIER.RAMASSAGE_DEPART, liste = ramassables(s);
  const base = Object.values(R).reduce((a, d) => a + d.nombre, 0);
  assertEqual(liste.length, base + D.petite_pierre + D.morceau_bois, 'le premier jour, de quoi commencer en plus');
  // le premier jour : des pierres et du bois tout près de l'endroit où le personnage apparaît
  const T0 = farmTerrain(s), W = T0.LARGEUR, d0 = caseDepart(T0);
  const pres = (sorte) => liste.filter((p) => p.sorte === sorte && Math.max(Math.abs(Math.floor(p.case / W) - Math.floor(d0 / W)), Math.abs((p.case % W) - (d0 % W))) <= D.RAYON[1]).length;
  assert(pres('petite_pierre') >= D.petite_pierre && pres('morceau_bois') >= D.morceau_bois, 'autour du départ');
  assert(liste.filter((p) => !p.buisson).every((p) => isArable(p.case, s)), 'sur l\'herbe');
  assertEqual(new Set(liste.map((p) => p.case)).size, liste.length, 'deux jamais sur la même tuile');
  assertEqual(ramassables(s), liste, 'les mêmes toute la journée');
  assertEqual(liste.some((p) => p.objet === 'fibre'), false, 'plus d\'herbes à ramasser');
  const avant = countItem(s, 'pierre'), e0 = s.energie;
  const h = liste.find((p) => p.sorte === 'petite_pierre');
  assertEqual(ramasser(s, h.id), { ok: true, sorte: 'petite_pierre', items: { pierre: 1 } });
  assertEqual([countItem(s, 'pierre'), s.energie < e0, ramassables(s).length], [avant + 1, true, liste.length - 1]);
  assertEqual(ramasser(s, h.id).ok, false, 'déjà ramassée');
  s.energie = 0;
  assertEqual(ramasser(s, liste[1].id).ok, false, 'à bout de forces');
  // les baies, sur les buissons : trois d'un coup, même à bout de forces, et elles se mangent
  const b = liste.find((p) => p.sorte === 'baies'), T = farmTerrain(s);
  assert(T.BUISSONS.some(([c0, r1, w]) => b.case === r1 * T.LARGEUR + c0 + Math.floor(w / 2)), 'au pied d\'un buisson');
  assertEqual([ramasser(s, b.id), s.energie], [{ ok: true, sorte: 'baies', items: { baies: 3 } }, 0]);
  assert(eatSnack(s, 'baies').ok && s.energie > 0, 'de quoi reprendre des forces');
  // le lendemain, d'autres places, et tout est revenu
  s.day += 1;
  const demain = ramassables(s);
  assertEqual(demain.length, base, 'le lendemain, plus de supplément');
  assert(demain.map((p) => p.case).join() !== liste.map((p) => p.case).join(), 'ailleurs');
});

test('ferme générée : la hache coupe un buisson d\'un coup (grand : 2 bois, petit : 1), ses baies avec', () => {
  const s = garden();
  testFarmMap(s, 'r1');
  s.outils = { hache: true, pioche: false, choisi: 'hache' };
  const T = farmTerrain(s), B = DATA.HACHE.BUISSONS;
  assertEqual([B.grand, B.petit], [2, 1]);
  const id = ([c0, r1, w]) => (c0 + Math.floor(w / 2)) + ',' + r1;
  const grand = T.BUISSONS.find((b) => b[4] === 'grand'), petit = T.BUISSONS.find((b) => b[4] === 'petit');
  assert(grand && petit, 'des grands et des petits buissons');
  assertEqual(bushOf(s, id(grand)).taille, 'grand');
  // les baies du jour sur un buisson : coupé, elles s'en vont avec lui
  const baie = ramassables(s).find((p) => p.buisson), b = T.BUISSONS.find((q) => baie.case === q[1] * T.LARGEUR + q[0] + Math.floor(q[2] / 2));
  const bois0 = countItem(s, 'bois'), e0 = s.energie;
  const r = chopTree(s, id(b));
  assertEqual([r.ok, r.tombe, r.bois, countItem(s, 'bois') - bois0, s.energie < e0], [true, true, B[b[4]], B[b[4]], true]);
  assert(!ramassables(s).some((p) => p.id === baie.id), 'ses baies sont parties');
  assertEqual(chopTree(s, id(b)).error, 'Ce buisson est déjà coupé.');
  const autre = b === grand ? petit : grand, bois1 = countItem(s, 'bois');
  assertEqual([chopTree(s, id(autre)).bois, countItem(s, 'bois') - bois1], [B[autre[4]], B[autre[4]]], 'l\'autre taille');
  assertEqual(cutBushes(s).sort(), [id(b), id(autre)].sort());
  // il repousse au bout de RETOUR jours
  s.day += B.RETOUR[1];
  respawnBushes(s);
  assertEqual([bushCut(s, id(b)), cutBushes(s)], [false, []]);
});

test('ferme générée : l\'Atelier se construit avec 3 bois et 3 pierres, puis fabrique', () => {
  const s = garden();
  tireless(s);
  assertEqual(buildAtelier(s).ok, false, 'pas sur la carte de Tiled');
  testFarmMap(s, 'r2');
  setInv(s, {});
  const st = atelierStatus(s);
  assertEqual([st.ok, st.manque], [false, { bois: 3, pierre: 3 }]);
  setInv(s, { bois: 11, pierre: 9, fibre: 5 });
  assertEqual(craft(s, 'planche').ok, false, 'pas d\'Atelier');
  const pieces = s.pieces;
  assertEqual(buildAtelier(s), { ok: true });
  assertEqual([atelierConstruit(s), countItem(s, 'bois'), countItem(s, 'pierre'), s.pieces], [true, 8, 6, pieces], 'payé en matériaux, sans pièces');
  assertEqual(buildAtelier(s).ok, false, 'une seule fois');
  // 2 bois → 1 planche ; 4 pierres → 1 mur ; 3 planches → 1 porte ; 2 fibres → 1 paillasse
  for (let k = 0; k < 3; k++) assertEqual(craft(s, 'planche').items, { planche: 1 });
  assertEqual([countItem(s, 'bois'), countItem(s, 'planche')], [2, 3]);
  assertEqual(craft(s, 'porte').items, { porte: 1 });
  assertEqual(craft(s, 'mur_pierre').items, { mur_pierre: 1 });
  assertEqual(craft(s, 'paillasse').items, { paillasse: 1 });
  assertEqual([countItem(s, 'planche'), countItem(s, 'pierre'), countItem(s, 'fibre'), countItem(s, 'porte'), countItem(s, 'mur_pierre'), countItem(s, 'paillasse')], [0, 2, 5 - DATA.ATELIER.RECETTES.paillasse.entrees.fibre, 1, 1, 1]);
  const m = craftStatus(s, 'mur_pierre');
  assertEqual([m.ok, m.manque], [false, { pierre: 2 }]);
  // les outils de pierre
  s.outils = { hache: false, pioche: false, canne: false, choisi: 'houe' };
  setInv(s, { bois: 2, pierre: 2, fibre: 1 });
  assertEqual(craft(s, 'hache').outil, 'hache');
  assertEqual([s.outils.hache, countItem(s, 'bois')], [true, 0]);
  setInv(s, { bois: 2, pierre: 2, fibre: 1 });
  assertEqual(craft(s, 'hache').ok, false, 'déjà une hache');
});

/* ---------- étape 4 : construire bloc par bloc ---------- */

// Une ferme générée, l'Atelier construit, et `n` de chaque matériau en main.
function chantier(graine, n = 40) {
  const s = garden();
  tireless(s);
  testFarmMap(s, graine);
  setInv(s, { bois: 3, pierre: 3 });
  assert(buildAtelier(s).ok);
  setInv(s, { mur_pierre: n, porte: n, paillasse: n });
  return s;
}

// Une case d'herbe libre de `w` × `h` cases (coin haut-gauche), loin des bords.
// (de l'herbe, sans herbe haute : elle se fauche avant de bâtir)
function terrainLibre(s, w, h) {
  const T = farmTerrain(s), W = T.LARGEUR;
  for (let r = 4; r < T.HAUTEUR - h - 4; r++) {
    for (let c = 4; c < W - w - 4; c++) {
      let ok = true;
      for (let dr = 0; dr < h && ok; dr++) for (let dc = 0; dc < w && ok; dc++) ok = T.LIGNES[r + dr][c + dc] === '#' && !s.potager.parcelles.some((p) => p.case === (r + dr) * W + c + dc) && !(T.HERBES && T.HERBES[(r + dr) * W + c + dc]);
      if (ok) return { c, r, W };
    }
  }
  return null;
}

// Une porte se pose sur un mur (elle prend sa place) : le mur, puis la porte.
function poserPorte(s, t) {
  poserBloc(s, 'mur_pierre', t);
  return poserBloc(s, 'porte', t);
}

// Les murs d'une pièce de w × h cases (murs compris), la porte au milieu du bas.
function murs({ c, r, W }, w, h) {
  const out = [];
  for (let dr = 0; dr < h; dr++) for (let dc = 0; dc < w; dc++) if (dr === 0 || dc === 0 || dr === h - 1 || dc === w - 1) out.push((r + dr) * W + c + dc);
  return { murs: out.filter((t) => t !== (r + h - 1) * W + c + Math.floor(w / 2)), porte: (r + h - 1) * W + c + Math.floor(w / 2), dedans: (r + 1) * W + c + 1 };
}

test('ruches : achetées au Marché, posées dehors, pleines au bout de NUITS nuits, récoltées', () => {
  const R = DATA.RUCHE;
  const s = chantier('ruche');
  s.pieces = R.PRIX + 5;
  assertEqual(buyRuche(s), { ok: true, cost: R.PRIX });
  assertEqual([s.pieces, countItem(s, 'ruche')], [5, 1]);
  assertEqual(buyRuche(s).ok, false, 'plus assez de pièces');
  const z = terrainLibre(s, 6, 5);
  const t = z.r * z.W + z.c;
  assertEqual(poserBloc(s, 'ruche', t).ok, true);
  assertEqual([blocAt(s, t), countItem(s, 'ruche'), blocBloque(s, t), ruchePleine(s, t)], ['ruche', 0, true, false]);
  assertEqual(poserBloc(s, 'ruche', t + 2).error, 'Plus de ruche : achète-en au Marché (rayon Animaux).');
  // (une vraie nuit de jeu la fait avancer, js/engine/night.js)
  sleepOnce(s);
  assertEqual(s.ruches[t].nuits, 1);
  for (let n = 2; n < R.NUITS; n++) remplirRuches(s);
  assertEqual([ruchePleine(s, t), ruchesARecolter(s)], [false, []]);
  remplirRuches(s);
  assertEqual(ruchesARecolter(s), [{ id: `ruche:${t}`, lieu: 'ruche', ref: t, items: { miel: R.MIEL } }]);
  // le personnage récolte (comme un tas à ramasser) : le miel entre, la ruche repart à vide
  const miel = countItem(s, 'miel');
  assertEqual(pickUp(s, `ruche:${t}`), { ok: true, lieu: 'ruche', items: { miel: R.MIEL } });
  assertEqual([countItem(s, 'miel') - miel, ruchePleine(s, t), pickUp(s, `ruche:${t}`).ok], [R.MIEL, false, false]);
  // reprise pleine : la ruche et son miel reviennent dans l'inventaire
  for (let n = 0; n < R.NUITS; n++) remplirRuches(s);
  assertEqual(reprendreBloc(s, t).ok, true);
  assertEqual([countItem(s, 'ruche'), countItem(s, 'miel') - miel, s.ruches[t]], [1, 2 * R.MIEL, undefined]);
  // dans une pièce close : non (elle se pose dehors)
  const m = murs(terrainLibre(s, 5, 5), 5, 5);
  for (const w of m.murs) poserBloc(s, 'mur_pierre', w);
  poserPorte(s, m.porte);
  assertEqual(poserBloc(s, 'ruche', m.dedans).ok, false);
});

test('botteleuse : entonnoir, machine et convoyeur côte à côte ; 10 fibres jetées, une botte de paille au bout', () => {
  const B = DATA.BOTTELEUSE;
  const s = chantier('botte');
  setInv(s, { planche: 20, pierre: 20, fibre: 30 });
  for (const r of ['entonnoir', 'botteleuse', 'convoyeur']) assert(craft(s, r).ok, `l'Atelier fabrique : ${r}`);
  assertEqual([countItem(s, 'entonnoir'), countItem(s, 'botteleuse'), countItem(s, 'convoyeur')], [1, 1, 2]);
  const z = terrainLibre(s, 7, 3), t = (z.r + 1) * z.W + z.c + 1;     // la case de l'entonnoir
  assert(poserBloc(s, 'entonnoir', t).ok && poserBloc(s, 'botteleuse', t + 1).ok);
  assertEqual(etatBotteleuse(s, t + 1).ok, false, 'pas encore de convoyeur');
  assertEqual(verserFibres(s, t).error, `Pose ${B.CONVOYEUR} convoyeurs à la suite, juste à droite de la botteleuse.`);
  assert(poserBloc(s, 'convoyeur', t + 2).ok && poserBloc(s, 'convoyeur', t + 3).ok);
  assertEqual([machineDe(s, t), machineDe(s, t + 1), machineDe(s, t + 3), machineDe(s, t + 4)], [t + 1, t + 1, t + 1, null]);
  const e = botteleuses(s)[0];
  assertEqual([e.ok, e.case, e.convoyeurs, e.bout, e.fibres], [true, t + 1, [t + 2, t + 3], t + 4, 0]);
  // les fibres jetées : par l'entonnoir (ou un appui sur une autre pièce), jusqu'à FIBRES
  setInv(s, { fibre: 4 });
  assertEqual(verserFibres(s, t), { ok: true, case: t + 1, versees: 4, fibres: 4, pleine: false });
  assertEqual(sortirBotte(s, t + 1).ok, false, 'pas encore ses fibres');
  setInv(s, { fibre: 15 });
  assertEqual(verserFibres(s, t + 3), { ok: true, case: t + 1, versees: B.FIBRES - 4, fibres: B.FIBRES, pleine: true });
  assertEqual([countItem(s, 'fibre'), verserFibres(s, t).ok], [15 - (B.FIBRES - 4), false], 'pleine : elle travaille');
  // la botte sort et tombe au bout du convoyeur : un morceau de PAILLE paille, ramassé d'un coup
  const r = sortirBotte(s, t + 1, { carte: 'ferme', point: { x: 100, y: 200 } });
  assertEqual([r.ok, r.paille, r.morceau.item, r.morceau.qte, r.morceau.image, etatBotteleuse(s, t + 1).fibres], [true, B.PAILLE, 'paille', B.PAILLE, 'botte', 0]);
  assertEqual(morceauxDe(s, 'ferme').length, 1);
  assertEqual([ramasserMorceau(s, r.morceau.n).n, countItem(s, 'paille')], [B.PAILLE, B.PAILLE]);
  // reprise de la machine : ses fibres reviennent
  setInv(s, { fibre: 3 });
  assert(verserFibres(s, t).ok);
  assertEqual(reprendreBloc(s, t + 1).ok, true);
  assertEqual([countItem(s, 'fibre'), countItem(s, 'botteleuse'), s.botteleuses[t + 1]], [3, 1, undefined]);
  // la case au bout doit rester libre
  assert(poserBloc(s, 'botteleuse', t + 1).ok);
  setInv(s, { mur_pierre: 1 });
  assert(poserBloc(s, 'mur_pierre', t + 4).ok);
  assertEqual(etatBotteleuse(s, t + 1).raison, 'La case au bout du convoyeur doit rester libre : la botte de paille y tombe.');
});

test('bac à fleurs : acheté au Marché, posé comme un bloc, ses fleurs attirent les abeilles', () => {
  const s = chantier('bac');
  const prix = DATA.DEHORS.bac_fleurs.prix;
  s.pieces = prix + DATA.RUCHE.PRIX;
  assertEqual(buyDehors(s, 'bac_fleurs'), { ok: true, cost: prix });
  assertEqual([s.pieces, countItem(s, 'bac_fleurs')], [DATA.RUCHE.PRIX, 1]);
  const z = terrainLibre(s, 6, 5);
  const t = z.r * z.W + z.c;
  assertEqual(poserBloc(s, 'bac_fleurs', t).ok, true);
  assertEqual([blocAt(s, t), blocBloque(s, t)], ['bac_fleurs', true]);
  assertEqual(poserBloc(s, 'bac_fleurs', t + 2).error, 'Plus de bac à fleurs : achète-en au Marché (rayon Meubles).');
  // sans ruche, pas d'abeilles (rien à butiner) ; avec une ruche, le bac est une fleur
  assertEqual(fleursPourAbeilles(s), []);
  buyRuche(s);
  poserBloc(s, 'ruche', t + 3);
  const f = fleursPourAbeilles(s);
  assert(f.includes(t), 'le bac');
  assert(!f.includes(t + 3), 'pas la ruche');
  assert(f.length > 1, 'et les fleurs de l\'herbe');
  assertEqual(reprendreBloc(s, t).ok, true);
  assertEqual([countItem(s, 'bac_fleurs'), fleursPourAbeilles(s).includes(t)], [1, false]);
});

test('ferme générée : sous un buisson coupé, on bâtit (et il ne repousse pas sous ce qui est bâti)', () => {
  const s = chantier('bu1');
  s.outils = { ...s.outils, hache: true };
  const T = farmTerrain(s), id = ([c0, r1, w]) => (c0 + Math.floor(w / 2)) + ',' + r1;
  const b = T.BUISSONS.find((q) => (T.BUISSONS_CASES[id(q)] || []).length);
  const cs = T.BUISSONS_CASES[id(b)], t = cs[0];
  assertEqual(T.LIGNES[Math.floor(t / T.LARGEUR)][t % T.LARGEUR], '.');
  assertEqual(poserBloc(s, 'mur_pierre', t).ok, false, 'sous le buisson : non');
  assert(chopTree(s, id(b)).ok);
  assertEqual(cs.every((c) => casesBuissonsCoupes(s).has(c)), true);
  const r = poserBloc(s, 'mur_pierre', t);
  assert(r.ok, r.error);
  // le jour de sa repousse venu, il reste coupé : une case est bâtie
  s.day += DATA.HACHE.BUISSONS.RETOUR[1];
  assertEqual([respawnBushes(s), bushCut(s, id(b))], [[], true]);
  reprendreBloc(s, t);
  assertEqual(respawnBushes(s), [id(b)]);
  assertEqual(casesBuissonsCoupes(s).has(t), false);
});

test('ferme générée : un sapin abattu laisse une pomme de pin, un arbre un gland ; ils se plantent sur l\'herbe libre', () => {
  const s = chantier('graines1');
  s.outils = { ...s.outils, hache: true };
  const T = farmTerrain(s), ids = Object.keys(T.ARBRES);
  const pin = ids.find((id) => especeArbre(s, id) === 'pin'), arbre = ids.find((id) => especeArbre(s, id) === 'arbre');
  assert(pin && arbre, 'des sapins et des arbres');
  const abattre = (id) => { let r; for (let k = 0; k < DATA.HACHE.COUPES; k++) r = chopTree(s, id); return r; };
  const r = abattre(pin);
  assertEqual([r.tombe, r.graine, countItem(s, 'pomme_de_pin')], [true, 'pomme_de_pin', 1]);
  assertEqual([abattre(arbre).graine, countItem(s, 'gland')], ['gland', 1]);
  // sans graine plantée, il ne repousse pas
  s.day += 30;
  assertEqual([respawnTrees(s), fellenTrees(s).sort()], [[], [pin, arbre].sort()]);
  // la graine : sur n'importe quelle case d'herbe libre, dehors
  const z = terrainLibre(s, 8, 5), t = (z.r + 4) * z.W + z.c + 1;
  assertEqual(poserBloc(s, 'pomme_de_pin', T.LIGNES.join('').indexOf('.')).ok, false, 'pas hors de l\'herbe');
  const p = poserBloc(s, 'pomme_de_pin', t);
  assert(p.ok, p.error);
  assertEqual([countItem(s, 'pomme_de_pin'), blocAt(s, t), poussesArbres(s).map((q) => [q.id, q.espece, q.case])], [0, null, [[p.arbre, 'pin', t]]]);
  assertEqual(poserBloc(s, 'mur_pierre', t).error, 'Un arbre pousse ici.');
  assert(/Trop près/.test(poserBloc(s, 'gland', t + 1).error), 'loin des autres arbres plantés');
  // jeune pousse : on ne la coupe pas ; elle grandit en HACHE.POUSSE jours
  assert(/jeune pousse/.test(chopTree(s, p.arbre).error));
  s.day = s.foret.arbres[0].pousse;
  assertEqual([poussesArbres(s), arbresPlantes(s).map((q) => q.id)], [[], [p.arbre]]);
  // grand, il se coupe comme les autres et laisse sa graine ; sa case se libère
  const b = abattre(p.arbre);
  assertEqual([b.tombe, b.graine, countItem(s, 'pomme_de_pin'), arbresPlantes(s), fellenTrees(s).includes(p.arbre)], [true, 'pomme_de_pin', 1, [], false]);
  assert(poserBloc(s, 'gland', t + 1).ok, 'la place est libre');
  // hors de la ferme générée (une autre carte) : pas de graine, il repousse de lui-même
  assertEqual(especeArbre(s, 'transition:3,4'), null);
});

test('menu Construire : chaque bloc dans une catégorie ; seuls les blocs débloqués se montrent', () => {
  const B = DATA.ATELIER.BLOCS;
  assertEqual(Object.keys(B).filter((k) => !B[k].semis && !B[k].arbre && !categorieBloc(k)), [], 'chaque bloc posable a son onglet');
  assertEqual([categorieBloc('mur_brique_bleue'), categorieBloc('porte'), categorieBloc('refrigerateur'), categorieBloc('meuble_canape'), categorieBloc('meuble_tableau_1'), categorieBloc('nichoir'), categorieBloc('citerne'), categorieBloc('atelier')],
    ['batir', 'batir', 'maison', 'meubles', 'meubles', 'elevage', 'energie', 'machines']);
  const s = chantier('menu');
  setInv(s, {});
  // au départ : ce que l'Atelier fabrique déjà ; pas encore le nichoir (le Poulailler), le bloc
  // de silo, le panneau, la station du robot, ni un meuble
  assertEqual(['mur_bois', 'porte', 'paillasse', 'atelier'].map((k) => blocDebloque(s, k)), [true, true, true, true]);
  s.progression.niveau = 1;
  assertEqual(['nichoir', 'bloc_silo', 'panneau', 'station_robot', 'meuble_chaise', 'refrigerateur'].map((k) => blocDebloque(s, k)), [false, false, false, false, false, false]);
  // en main : il se montre (un meuble acheté)
  addItem(s, 'meuble_chaise', 1);
  assertEqual(blocDebloque(s, 'meuble_chaise'), true);
  // son niveau atteint : le nichoir se fabrique, il se montre
  s.progression.niveau = unlockLevel('poulailler');
  assertEqual(blocDebloque(s, 'nichoir'), true);
});

test('ferme générée : poser et reprendre des blocs, sur l\'herbe seulement', () => {
  const s = chantier('b1');
  const z = terrainLibre(s, 6, 5);
  const t = z.r * z.W + z.c;
  assertEqual(poserBloc(s, 'mur_pierre', t), { ok: true, sorte: 'mur_pierre', case: t });
  assertEqual([blocAt(s, t), countItem(s, 'mur_pierre'), isArable(t, s), blocBloque(s, t)], ['mur_pierre', 39, false, true]);
  assertEqual([poserBloc(s, 'porte', t + 2).ok, blocAt(s, t + 2)], [true, 'porte'], 'la porte : directement sur une case libre');
  assert(reprendreBloc(s, t + 2).ok);
  assertEqual(poserBloc(s, 'paillasse', t).ok, false, 'déjà un bloc');
  const route = farmTerrain(s).LIGNES.join('').indexOf('.');
  assertEqual(poserBloc(s, 'mur_pierre', route).ok, false, 'pas hors de l\'herbe');
  assertEqual(poserBloc(s, 'paillasse', t + 2).ok, false, 'la paillasse : dans une pièce close');
  assertEqual(reprendreBloc(s, t), { ok: true, sorte: 'mur_pierre', case: t });
  assertEqual([blocAt(s, t), countItem(s, 'mur_pierre')], [null, 40]);
  // l'Atelier se pose une fois
  assertEqual(blocsEnMain(s, 'atelier'), 1);
  assert(poserBloc(s, 'atelier', t).ok);
  assertEqual([blocsEnMain(s, 'atelier'), poserBloc(s, 'atelier', t + 1).ok], [0, false]);
  reprendreBloc(s, t);
  assertEqual(blocsEnMain(s, 'atelier'), 1, 'repris : à poser de nouveau');
  setInv(s, {});
  assertEqual(poserBloc(s, 'mur_pierre', t).ok, false, 'plus de murs en main');
});

test('ferme générée : des murs tout autour et une porte font une pièce close, où l\'on dort sur une paillasse', () => {
  const s = chantier('b2');
  const z = terrainLibre(s, 5, 5);
  const p = murs(z, 5, 5);
  for (const t of p.murs) assert(poserBloc(s, 'mur_pierre', t).ok);
  assertEqual(piecesCloses(s), [], 'sans porte : pas de pièce close');
  assertEqual(nuitCouchee(s), false, 'pas de paillasse : on ne dort pas');
  assert(poserPorte(s, p.porte).ok);
  const pc = piecesCloses(s);
  assertEqual([pc.length, pc[0].cases.length, pc[0].portes], [1, 9, [p.porte]]);
  assert(dansPiece(s, p.dedans));
  assert(poserBloc(s, 'paillasse', p.dedans).ok);
  assertEqual([couchages(s), nuitCouchee(s)], [[p.dedans], true]);
  // la nuit : l'énergie revient
  s.energie = 0;
  assert(sleepOnce(s) !== null);
  assert(s.energie > 0, 'couché : l\'énergie du réveil');
  // (un coin repris : la pièce reste close, on ne passe pas en diagonale)
  reprendreBloc(s, p.murs[0]);
  assertEqual(nuitCouchee(s), true);
  // un mur repris : la pièce s'ouvre, la paillasse reste mais on n'y dort plus
  reprendreBloc(s, p.murs[1]);
  assertEqual([piecesCloses(s), blocAt(s, p.dedans), nuitCouchee(s)], [[], 'paillasse', false]);
  s.energie = 0;
  assert(sleepOnce(s) !== null);
  assertEqual(s.energie, 0, 'sans pièce close : la nuit ne rend rien');
  // la carte de Tiled : on dort comme avant
  const t = garden();
  t.energie = 0;
  assertEqual(nuitCouchee(t), true);
});

test('ferme générée : le plancher se pose à plat, sous les blocs, et se reprend en dernier', () => {
  const s = chantier('b3');
  setInv(s, { planche: 2 });
  assertEqual(craft(s, 'plancher').items, { plancher: 1 }, '2 planches : un plancher');
  setInv(s, { mur_pierre: 40, porte: 2, paillasse: 1, plancher: 3 });
  const z = terrainLibre(s, 5, 5), p = murs(z, 5, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, p.porte);
  assertEqual(poserBloc(s, 'plancher', p.murs[0]).ok, false, 'pas sous un mur');
  assert(poserBloc(s, 'plancher', p.dedans).ok);
  assertEqual([solAt(s, p.dedans), blocAt(s, p.dedans), countItem(s, 'plancher'), isArable(p.dedans, s)], ['plancher', null, 2, false]);
  assertEqual(poserBloc(s, 'plancher', p.dedans).ok, false, 'déjà un plancher');
  assertEqual(piecesCloses(s)[0].cases.length, 9, 'la pièce reste close');
  // une paillasse dessus : on y dort
  assert(poserBloc(s, 'paillasse', p.dedans).ok);
  assertEqual(couchages(s), [p.dedans]);
  // dehors aussi (une terrasse), mais pas de mur dessus
  const dehors = p.porte + z.W;
  assert(poserBloc(s, 'plancher', dehors).ok);
  assertEqual(poserBloc(s, 'mur_pierre', dehors).ok, false, 'pas de mur sur un plancher');
  // repris : la paillasse d'abord, puis le plancher
  assertEqual(reprendreBloc(s, p.dedans).sorte, 'paillasse');
  assertEqual(reprendreBloc(s, p.dedans).sorte, 'plancher');
  assertEqual([solAt(s, p.dedans), countItem(s, 'plancher')], [null, 2]);
});

test('ferme générée : 7 modèles de portes et 7 de sols, qui se fabriquent, se posent et s\'échangent', () => {
  const B = DATA.ATELIER.BLOCS;
  const portes = Object.keys(B).filter((k) => B[k].porte && k !== 'porte'), sols = Object.keys(B).filter((k) => B[k].sol && !B[k].dehors && k !== 'plancher');
  assertEqual([portes.length, sols.length], [7, 7]);
  // chacun : un objet de l'inventaire, une recette de l'Atelier, l'onglet Bâtir, une icône à lui
  for (const k of [...portes, ...sols]) {
    assert(DATA.OBJETS[B[k].objet] && DATA.ATELIER.RECETTES[k] && DATA.ATELIER.RECETTES[k].sortie[k], k);
    assertEqual(categorieBloc(k), 'batir', k);
  }
  const icones = [...portes, ...sols, 'porte', 'plancher'].map((k) => DATA.OBJETS[k].icone);
  assertEqual(new Set(icones).size, icones.length, 'une icône chacun');
  const s = chantier('modeles');
  setInv(s, { planche: 4 });
  assertEqual(craft(s, 'porte_chene').items, { porte_chene: 1 });
  assertEqual(blocDebloque(s, 'sol_marbre'), true, 'débloqués avec l\'Atelier');
  setInv(s, { mur_pierre: 40, porte: 1, porte_chene: 1, porte_fer: 1, plancher: 2, sol_marbre: 1, sol_dalles: 1 });
  const z = terrainLibre(s, 5, 5), p = murs(z, 5, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  // une porte de chêne ferme la pièce comme la porte de planches
  assert(poserBloc(s, 'porte_chene', p.porte).ok);
  assertEqual(piecesCloses(s).length, 1, 'la pièce est close');
  // une porte en fer sur la porte de chêne : elle prend sa place, l'autre revient
  const r = poserBloc(s, 'porte_fer', p.porte);
  assertEqual([r.ok, r.remplace, blocAt(s, p.porte), countItem(s, 'porte_chene'), piecesCloses(s).length], [true, 'porte_chene', 'porte_fer', 1, 1]);
  // un sol de marbre, puis des dalles à sa place (le marbre revient), puis repris
  assert(poserBloc(s, 'sol_marbre', p.dedans).ok);
  const rs = poserBloc(s, 'sol_dalles', p.dedans);
  assertEqual([rs.ok, rs.remplace, solAt(s, p.dedans), countItem(s, 'sol_marbre'), countItem(s, 'sol_dalles')], [true, 'sol_marbre', 'sol_dalles', 1, 0]);
  assertEqual(poserBloc(s, 'sol_dalles', p.dedans).ok, false, 'déjà ce sol');
  assertEqual(reprendreBloc(s, p.dedans).sorte, 'sol_dalles');
  // le chemin, du dehors, ne s'échange pas avec un sol
  setInv(s, { chemin: 1, plancher: 1 });
  const dehors = p.porte + z.W;
  assert(poserBloc(s, 'chemin', dehors).ok);
  assertEqual(poserBloc(s, 'plancher', dehors).error, 'Il y a déjà un chemin ici.');
});

/* ---------- étape 5 : la nouvelle partie, le bonheur sans couchage ---------- */

test('nouvelle partie sur une ferme générée : la graine, sans terre au départ', () => {
  const s = createNewGame(5);
  assertEqual(s.potager.parcelles, []);
  assertEqual(setFarmSeed(s, 'neuve'), { ok: true, graine: 'neuve' });
  assertEqual([farmTerrain(s).LARGEUR, s.potager.parcelles], [144, []]);
});

test('ferme générée : chaque nuit, qui n\'a pas de paillasse dans une pièce close perd du bonheur', () => {
  const s = chantier('b3');
  const B = DATA.ATELIER.BONHEUR_SANS_COUCHAGE;
  const membres = s.famille.membres;
  assert(membres.length >= 2, 'une famille de plusieurs');
  for (const m of membres) m.bonheur = 50;
  // (sans repas : le bonheur du repas ne compte pas ici)
  const avant = membres.map((m) => m.bonheur);
  const sans = nuitSansCouchage(s);
  assertEqual([sans.length, membres.map((m) => m.bonheur)], [membres.length, avant.map((b) => b + B)], 'personne n\'a de couchage');
  // une pièce, une paillasse : le personnage principal dort, les autres non
  const z = terrainLibre(s, 5, 5), p = murs(z, 5, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, p.porte);
  poserBloc(s, 'paillasse', p.dedans);
  for (const m of membres) m.bonheur = 50;
  const sans2 = nuitSansCouchage(s);
  assertEqual([sans2.includes(mainCharacter(s)), sans2.length], [false, membres.length - 1]);
  assertEqual(mainCharacter(s).bonheur, 50);
  // une paillasse par membre (la partie de test) : personne
  assertEqual(nuitSansCouchage(garden()), []);
  // et la nuit le note pour le réveil
  const r = sleepOnce(s);
  assertEqual(r.sansCouchage.length, membres.length - 1);
});

/* ---------- étape 5b : la maison en blocs ---------- */

test('ferme générée : pas de maison à réparer, le foyer est une pièce close avec une paillasse', () => {
  const s = chantier('m1');
  assertEqual(houseRepaired(s), false, 'rien à réparer : à bâtir');
  const z = terrainLibre(s, 5, 5), p = murs(z, 5, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, p.porte);
  assertEqual(houseRepaired(s), false, 'une pièce sans paillasse');
  poserBloc(s, 'paillasse', p.dedans);
  assertEqual(houseRepaired(s), true, 'le foyer');
  // un meuble acheté : dans l'inventaire, à poser
  s.pieces = 1000;
  const id = Object.keys(DATA.MEUBLES)[0];
  assertEqual([buyFurniture(s, id).aPoser, countItem(s, 'meuble_' + id)], [true, 1], 'le meuble arrive dans l\'inventaire');
});

test('ferme générée : les meubles du Marché se posent dans la maison (plusieurs cases, lits, tableaux)', () => {
  const s = chantier('m9');
  s.pieces = 10000;
  assertEqual(buyFurniture(s, 'table').ok, false, 'pas de foyer : pas de meuble');
  const z = terrainLibre(s, 8, 7), p = murs(z, 8, 7), W = z.W, at = (dc, dr) => (z.r + dr) * W + z.c + dc;
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, p.porte);
  poserBloc(s, 'paillasse', p.dedans);
  for (const id of ['table', 'chaise', 'lit_adulte', 'tableau_1', 'tapis_1']) assert(buyFurniture(s, id).ok, id);
  // pas dehors
  assertEqual(poserBloc(s, 'meuble_chaise', at(-2, 3)).ok, false, 'dehors');
  // la table : trois cases vers la droite, toutes libres dans la pièce
  assertEqual(poserBloc(s, 'meuble_table', at(5, 3)).ok, false, 'elle dépasse sur le mur');
  assert(poserBloc(s, 'meuble_table', at(2, 3)).ok);
  assertEqual(poserBloc(s, 'meuble_chaise', at(3, 3)).error, 'Un meuble occupe cette case.');
  assert(poserBloc(s, 'meuble_chaise', at(3, 4)).ok);
  // le lit : deux cases vers le haut ; on y dort comme sur une paillasse
  assert(poserBloc(s, 'meuble_lit_adulte', at(6, 2)).ok);
  assertEqual(couchages(s).length, 2);
  // le tableau : sur un mur dont on voit la face, pas par terre
  assertEqual(poserBloc(s, 'meuble_tableau_1', at(3, 2)).ok, false, 'par terre');
  assertEqual(poserBloc(s, 'meuble_tableau_1', at(0, 3)).ok, false, 'un mur sous un autre : on ne voit pas sa face');
  assert(poserBloc(s, 'meuble_tableau_1', at(3, 0)).ok, 'le mur du haut, face à la pièce');
  assertEqual([blocDessus(s, at(3, 0)), blocAt(s, at(3, 0))], ['meuble_tableau_1', 'mur_pierre']);
  // reprendre une case couverte : le meuble revient dans l'inventaire
  assertEqual(reprendreBloc(s, at(4, 3)).sorte, 'meuble_table');
  assertEqual([countItem(s, 'meuble_table'), blocAt(s, at(2, 3))], [1, null]);
  // le tapis : à plat, on passe dessus
  assert(poserBloc(s, 'meuble_tapis_1', at(2, 5)).ok);
  assertEqual(blocBloque(s, at(2, 5)), false);
  // un ancien meuble n'entre pas dans un bâtiment
  assertEqual(genrePiece(s, at(2, 5)), 'maison');
});

test('ferme générée : le four et la cuisinière se posent dans une pièce close et tiennent lieu des stations', () => {
  const s = chantier('m2');
  s.pieces = 10000;
  assertEqual(buildStation(s, 'four').ok, false, 'pas en pièces');
  setInv(s, { mur_pierre: 40, porte: 2, four_pierre: 1, cuisiniere: 1 });
  const z = terrainLibre(s, 6, 5), p = murs(z, 6, 5);
  assertEqual(poserBloc(s, 'four', p.dedans).ok, false, 'hors d\'une pièce close');
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, p.porte);
  assert(poserBloc(s, 'four', p.dedans).ok);
  assert(poserBloc(s, 'cuisiniere', p.dedans + 1).ok);
  assertEqual([s.stations.four.construit, s.stations.cuisine.construit, blocBloque(s, p.dedans)], [true, true, true]);
  assert(s.unlockedTabs.includes('recettes'), 'le Livre de recette s\'ouvre');
  reprendreBloc(s, p.dedans);
  assertEqual([s.stations.four.construit, countItem(s, 'four_pierre')], [false, 1], 'repris : plus de four');
});

/* ---------- étape 5b-2 : l'énergie et l'eau en blocs ---------- */

test('ferme générée : le puits, la pompe dessus, le panneau, la citerne et la batterie se posent et installent les appareils', () => {
  const s = reach(chantier('e1'), 'energie');
  s.pieces = 100000;
  for (const t of ['panneau', 'pompe', 'reservoir', 'batterie']) removeStarter(s, t);   // (une partie neuve : rien d'installé)
  // le foyer d'abord (et, deux rangées sous lui, de quoi poser dehors)
  const z = terrainLibre(s, 7, 8), p = murs(z, 5, 5);
  setInv(s, { mur_pierre: 30, porte: 2, paillasse: 2, puits_pierre: 1, pompe: 1, panneau_solaire: 2, citerne: 1, batterie: 1 });
  const dehors = (k) => (z.r + 7) * z.W + z.c + k;
  assertEqual(poserBloc(s, 'panneau', dehors(0)).ok, false, 'sans foyer : rien ne s\'installe');
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, p.porte);
  poserBloc(s, 'paillasse', p.dedans);
  assertEqual(poserBloc(s, 'panneau', p.dedans + 1).ok, false, 'pas dans une pièce close');
  assert(poserBloc(s, 'panneau', dehors(0)).ok);
  assertEqual([isOwned(starterOf(s, 'panneau')), poserBloc(s, 'panneau', dehors(1)).ok], [true, false], 'un seul panneau');
  assertEqual(poserBloc(s, 'pompe', dehors(2)).ok, false, 'la pompe : sur un puits');
  assertEqual(poserBloc(s, 'citerne', dehors(4)).ok, false, 'la citerne attend la pompe');
  assert(poserBloc(s, 'puits', dehors(2)).ok);
  assert(poserBloc(s, 'pompe', dehors(2)).ok);
  assertEqual([blocAt(s, dehors(2)), blocDessus(s, dehors(2)), isOwned(starterOf(s, 'pompe')), farmOpen(s)], ['puits', 'pompe', true, true]);
  assert(poserBloc(s, 'citerne', dehors(4)).ok);
  assert(poserBloc(s, 'batterie', dehors(6)).ok);
  assertEqual(['reservoir', 'batterie'].map((t) => isOwned(starterOf(s, t))), [true, true]);
  // reprendre : la pompe d'abord, puis le puits
  reprendreBloc(s, dehors(2));
  assertEqual([blocAt(s, dehors(2)), isOwned(starterOf(s, 'pompe')), countItem(s, 'pompe')], ['puits', false, 1]);
  reprendreBloc(s, dehors(2));
  assertEqual([blocAt(s, dehors(2)), countItem(s, 'puits_pierre')], [null, 1]);
});

/* ---------- étape 5b : le Poulailler (pièce close + nichoir) ---------- */

// Un poulailler (ou une étable) complet : une enceinte de 5 × 5 (porte sur le dehors en bas, porte à droite
// vers l'enclos), un enclos de barrières de 3 × 3 cases à droite, appuyé sur le mur.
function enceinteEtEnclos(s, z) {
  const p = murs(z, 5, 5), W = z.W, at = (x, y) => (z.r + y) * W + z.c + x;
  const porteEnclos = at(4, 2);
  for (const t of p.murs) if (t !== porteEnclos) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, p.porte);
  poserPorte(s, porteEnclos);
  const barrieres = [];
  for (let x = 5; x <= 8; x++) barrieres.push(at(x, 0), at(x, 4));
  for (let y = 1; y <= 3; y++) barrieres.push(at(8, y));
  return { ...p, porteEnclos, barrieres, enclos: at(6, 2) };
}

test('ferme générée : le Poulailler, une enceinte avec une porte dehors, un nichoir et un enclos de barrières', () => {
  const s = reach(chantier('p1'), 'poulailler');
  s.pieces = 100000;
  s.poulailler.construit = false;
  setInv(s, { mur_pierre: 30, porte: 3, nichoir: 2, barriere: 20 });
  const z = terrainLibre(s, 9, 6), p = enceinteEtEnclos(s, z);
  assertEqual(poserBloc(s, 'nichoir', p.dedans + 50).ok, false, 'hors d\'une pièce close');
  assert(poserBloc(s, 'nichoir', p.dedans).ok);
  // sans enclos : pas de Poulailler
  const sans = etatPoulailler(s);
  assertEqual(sans.conditions.map((c) => [c.id, c.ok]), [['enceinte', true], ['cle', true], ['dehors', true], ['enclos', false], ['place', false]]);
  assertEqual([s.poulailler.construit, coopCapacity(s)], [false, 0]);
  // l'enclos fermé : le Poulailler est là ; 8 cases libres dedans, 9 dans l'enclos
  for (const t of p.barrieres) assert(poserBloc(s, 'barriere', t).ok);
  const e = etatPoulailler(s);
  assertEqual([e.ok, e.libresPiece.length, e.libresEnclos.length, e.places, e.porteEnclos, e.porteDehors], [true, 8, 9, 8, p.porteEnclos, p.porte]);
  assertEqual([s.poulailler.construit, s.poulailler.niveau > 0, coopCapacity(s)], [true, true, DATA.POULAILLER.CAPACITE[0]]);
  assertEqual(poserBloc(s, 'nichoir', p.dedans + 1).ok, false, 'un seul nichoir');
  // une barrière reprise : l'enclos s'ouvre, plus de Poulailler (niveau et poules gardés)
  s.poulailler.poules = 3;
  reprendreBloc(s, p.barrieres[0]);
  assertEqual([s.poulailler.construit, s.poulailler.poules, coopCapacity(s)], [false, 3, 0]);
  poserBloc(s, 'barriere', p.barrieres[0]);
  assert(s.poulailler.construit);
  // pas de porte sur le dehors : pas de Poulailler
  reprendreBloc(s, p.porte); poserBloc(s, 'mur_pierre', p.porte);
  assertEqual([etatPoulailler(s).conditions.find((c) => c.id === 'dehors').ok, s.poulailler.construit], [false, false]);
  reprendreBloc(s, p.porte); poserPorte(s, p.porte);
  // le nichoir repris : plus de Poulailler
  reprendreBloc(s, p.dedans);
  assertEqual([s.poulailler.construit, coopCapacity(s)], [false, 0], 'repris : plus de Poulailler');
});

test('ferme générée : l\'enclos du Poulailler ou de l\'Étable peut être grand ; sinon, la fenêtre dit pourquoi', () => {
  const s = reach(chantier('enclos', 120), 'paturage');
  setInv(s, { mur_pierre: 40, porte: 4, mangeoire: 1, barriere: 120 });
  const z = terrainLibre(s, 22, 16), W = z.W, t = (x, y) => (z.r + y) * W + z.c + x;
  // l'enceinte : 6 × 5 (murs compris), une porte en bas (dehors), une à droite (l'enclos)
  for (let x = 0; x <= 5; x++) for (let y = 0; y <= 4; y++) if (x === 0 || y === 0 || x === 5 || y === 4) poserBloc(s, 'mur_pierre', t(x, y));
  poserBloc(s, 'porte', t(2, 4)); poserBloc(s, 'porte', t(5, 2));
  assert(poserBloc(s, 'mangeoire', t(1, 1)).ok);
  const enclos = () => etatEtable(s).conditions.find((c) => c.id === 'enclos');
  // une barrière juste devant la porte : elle ne mène nulle part
  poserBloc(s, 'barriere', t(6, 2));
  assertEqual([enclos().ok, enclos().texte.includes('donne sur une barrière')], [false, true]);
  reprendreBloc(s, t(6, 2));
  // un grand enclos (13 × 15 cases dedans, plus que les 120 d'avant) avec un trou contre le mur
  for (let x = 7; x <= 19; x++) poserBloc(s, 'barriere', t(x, 0));
  for (let x = 5; x <= 19; x++) poserBloc(s, 'barriere', t(x, 14));
  for (let y = 1; y < 14; y++) poserBloc(s, 'barriere', t(19, y));
  for (let y = 5; y < 14; y++) poserBloc(s, 'barriere', t(5, y));
  assertEqual([enclos().ok, enclos().texte.includes('pas fermé')], [false, true], 'un trou entre la barrière et le mur');
  poserBloc(s, 'barriere', t(6, 0));
  assert(etatEtable(s).ok, 'fermé : l\'Étable est là');
  assertEqual([etatEtable(s).enclos.length > 120, s.paturage.construit], [true, true]);
});

test('ferme générée : le distributeur de grain, raccordé dans l\'enclos, nourrit les poules chaque matin', () => {
  const D = DATA.DISTRIBUTEUR;
  const s = reach(chantier('distrib', 80), 'poulailler');
  setInv(s, { mur_pierre: 30, porte: 2, barriere: 40, nichoir: 1, entonnoir: 1, distributeur: 1, mangeoire_grain: 1 });
  const z = terrainLibre(s, 16, 12), W = z.W, t = (x, y) => (z.r + y) * W + z.c + x;
  for (let x = 0; x <= 5; x++) for (let y = 0; y <= 4; y++) if (x === 0 || y === 0 || x === 5 || y === 4) poserBloc(s, 'mur_pierre', t(x, y));
  poserBloc(s, 'porte', t(2, 4)); poserBloc(s, 'porte', t(5, 2));
  for (let x = 6; x <= 13; x++) { poserBloc(s, 'barriere', t(x, 0)); poserBloc(s, 'barriere', t(x, 8)); }
  for (let y = 1; y < 8; y++) poserBloc(s, 'barriere', t(13, y));
  for (let y = 5; y < 8; y++) poserBloc(s, 'barriere', t(5, y));
  assert(poserBloc(s, 'nichoir', t(1, 1)).ok);
  assert(s.poulailler.construit, 'le Poulailler');
  // la mangeoire : deux cases de large ; une case couverte ne se prend pas
  assert(poserBloc(s, 'distributeur', t(8, 5)).ok);
  assertEqual(etatDistributeur(s, t(8, 5)).raison.includes('entonnoir'), true);
  assert(poserBloc(s, 'entonnoir', t(7, 5)).ok);
  assertEqual(etatDistributeur(s, t(8, 5)).raison.includes('mangeoire'), true);
  assert(poserBloc(s, 'mangeoire_grain', t(9, 5)).ok);
  assertEqual(poserBloc(s, 'barriere', t(10, 5)).ok, false, 'la deuxième case de la mangeoire');
  assertEqual(distributeurs(s).map((d) => d.ok), [true]);
  // on y jette le blé (au plus CAPACITE), par n'importe laquelle de ses pièces
  setInv(s, { ble: D.CAPACITE + 10 });
  const r = verserGrain(s, t(10, 5));
  assertEqual([r.ok, r.versees, r.grain, r.plein, countItem(s, 'ble')], [true, D.CAPACITE, D.CAPACITE, true, 10]);
  assertEqual(verserGrain(s, t(7, 5)).ok, false, 'plein');
  // chaque jour à HEURE h : les poules pas encore nourries le sont (1 blé pour 2 poules)
  s.poulailler.poules = 4; s.poulailler.nourries = 1; s.poulailler.restes = 0;
  s.awakeMs = awakeMsAtHour(D.HEURE - 1);
  assertEqual(distribuerGrain(s), 0, 'pas avant l\'heure');
  s.awakeMs = awakeMsAtHour(D.HEURE + 0.1);
  assertEqual([distribuerGrain(s), s.poulailler.nourries, grainDans(s, t(8, 5))], [3, 4, D.CAPACITE - 2]);
  // repris : son blé revient
  reprendreBloc(s, t(8, 5));
  assertEqual(countItem(s, 'ble') + (s.silo && s.silo.ble ? s.silo.ble : 0) >= 10 + D.CAPACITE - 2, true);
});

test('ferme générée : le cheval vit à l\'Écurie, on le monte, on l\'attache à un poteau hors de la ferme', () => {
  const C = DATA.CHEVAL;
  const s = reach(chantier('cheval', 80), 'ecurie');
  s.pieces = 100000;
  setInv(s, { mur_pierre: 30, porte: 2, ratelier: 1 });
  assertEqual(chevalRefus(s).includes('Écurie'), true, 'pas d\'Écurie, pas de cheval');
  // l'Écurie : une enceinte de 3 × 2 cases, le râtelier, une porte sur le dehors
  const z = terrainLibre(s, 8, 6), W = z.W, t = (x, y) => (z.r + y) * W + z.c + x;
  for (let x = 0; x <= 4; x++) for (let y = 0; y <= 3; y++) if (x === 0 || y === 0 || x === 4 || y === 3) poserBloc(s, 'mur_pierre', t(x, y));
  assertEqual(etatEcurie(s).conditions.find((c) => c.id === 'dehors').ok, false, 'sans porte');
  assert(poserBloc(s, 'porte', t(2, 3)).ok);
  assert(poserBloc(s, 'ratelier', t(1, 1)).ok);
  const e = etatEcurie(s);
  assert(e.ok, JSON.stringify(e.conditions));
  assertEqual(e.places, 5);
  // acheté au Marché : il est à l'Écurie, nourri
  assert(buyCheval(s).ok);
  assertEqual([chevalOu(s), buyCheval(s).ok], ['ecurie', false]);
  // monté à la ferme : plus vite ; le triporteur reste au garage
  assert(toggleCheval(s, { carte: 'ferme' }).ok);
  assertEqual([chevalMonte(s), vitesseDeplacement(s)], [true, C.VITESSE]);
  assertEqual(toggleTriporteur(s).ok, false);
  // hors de la ferme : pas de poteau ni de corde, il faut rester en selle
  setInv(s, { corde: 1 });
  const refus = descendreCheval(s, { carte: 'ville', x: 100, y: 200 });
  assertEqual([refus.ok, refus.error.includes('poteau'), chevalMonte(s)], [false, true, true]);
  setInv(s, { corde: 1, poteau_attache: 1 });
  assert(descendreCheval(s, { carte: 'ville', x: 100, y: 200 }).ok);
  assertEqual([chevalOu(s), s.cheval.attache, countItem(s, 'corde'), countItem(s, 'poteau_attache')], ['attache', { carte: 'ville', x: 100, y: 200 }, 0, 0]);
  // on le reprend à côté de lui, sur la même carte seulement ; le poteau et la corde reviennent
  assertEqual(monterCheval(s, { carte: 'plage', proche: true }).ok, false);
  assertEqual(monterCheval(s, { carte: 'ville', proche: false }).ok, false);
  assert(monterCheval(s, { carte: 'ville', proche: true }).ok);
  assertEqual([chevalMonte(s), countItem(s, 'corde'), countItem(s, 'poteau_attache')], [true, 1, 1]);
  // laissé attaché, puis rentré à la ferme : il retrouve l'Écurie
  descendreCheval(s, { carte: 'montagne', x: 5, y: 6 });
  assert(rentrerCheval(s));
  assertEqual([chevalOu(s), countItem(s, 'corde'), countItem(s, 'poteau_attache')], ['ecurie', 1, 1]);
  // à la ferme, il descend sans rien : il rentre à l'Écurie
  monterCheval(s, { carte: 'ferme' });
  assert(descendreCheval(s, { carte: 'ferme' }).ok);
  assertEqual(chevalOu(s), 'ecurie');
  // la nuit, sa paille ; sans paille, il va moins vite le lendemain
  setInv(s, { [DATA.PATURAGE.NOURRITURE]: C.RATION });
  chevalNuit(s);
  assertEqual([s.cheval.nourri, countItem(s, DATA.PATURAGE.NOURRITURE)], [true, 0]);
  chevalNuit(s);
  monterCheval(s, { carte: 'ferme' });
  assertEqual([s.cheval.nourri, vitesseCheval(s)], [false, C.VITESSE_FAIM]);
});

test('ferme générée : le Poulailler monte de niveau s\'il a la place ; les poules en trop ne pondent pas', () => {
  const s = reach(chantier('p2'), 'poulailler');
  s.pieces = 100000;
  setInv(s, { mur_pierre: 30, porte: 3, nichoir: 1, barriere: 20, plancher: 9 });
  const z = terrainLibre(s, 9, 6), p = enceinteEtEnclos(s, z);
  poserBloc(s, 'nichoir', p.dedans);
  for (const t of p.barrieres) poserBloc(s, 'barriere', t);
  assert(s.poulailler.construit);
  // niveau 2 : 8 poules, 8 cases libres de chaque côté → oui ; niveau 3 : 12 → non
  assert(upgradePoulailler(s).ok);
  assertEqual(coopCapacity(s), 8);
  const r = upgradePoulailler(s);
  assertEqual([r.ok, s.poulailler.niveau], [false, 2]);
  assert(/il faut 12 cases libres/.test(r.error), r.error);
  // un plancher ne prend pas de place ; une barrière posée dans l'enclos, si
  assert(poserBloc(s, 'plancher', p.enclos).ok);
  assertEqual(etatPoulailler(s).libresEnclos.length, 9);
  poserBloc(s, 'barriere', p.enclos);
  assertEqual([etatPoulailler(s).libresEnclos.length, coopCapacity(s)], [8, 8]);
  // 8 poules nourries, 2 cases de moins dans l'enclos : 6 pondent
  s.poulailler.poules = 8; s.poulailler.nourries = 8;
  poserBloc(s, 'barriere', p.enclos - z.W + 1);
  poserBloc(s, 'barriere', p.enclos - z.W);
  assertEqual(coopCapacity(s), 6);
  assertEqual(layEggs(s), 6 * DATA.ANIMAUX.poule.oeufsParNuit);
});
test('ferme générée : l\'Étable, une enceinte avec une porte dehors, une mangeoire et un enclos ; une place par case libre', () => {
  const s = reach(chantier('e1'), 'paturage');
  s.pieces = 100000;
  s.paturage.construit = false;
  s.paturage.places = 0;
  setInv(s, { mur_pierre: 30, porte: 3, mangeoire: 1, barriere: 20 });
  const z = terrainLibre(s, 9, 6), p = enceinteEtEnclos(s, z);
  assertEqual(poserBloc(s, 'mangeoire', p.dedans + 50).ok, false, 'hors d\'une pièce close');
  assert(poserBloc(s, 'mangeoire', p.dedans).ok);
  assertEqual([s.paturage.construit, etatEtable(s).conditions.find((c) => c.id === 'enclos').ok], [false, false], 'sans enclos : pas d\'Étable');
  for (const t of p.barrieres) poserBloc(s, 'barriere', t);
  // 10 places de départ, mais 8 cases libres dans l'étable (9 dans l'enclos) : 8 places
  assertEqual([s.paturage.construit, s.paturage.places, stablePlaces(s), freeSheepPlaces(s)], [true, DATA.PATURAGE.PLACES_DEPART, 8, 8]);
  // une place de plus : il faut 11 cases libres de chaque côté
  const r = buyPasture(s);
  assertEqual(r.ok, false);
  assert(/il faut 11 cases libres/.test(r.error), r.error);
  // 2 vaches (3 places chacune) et 3 moutons : 9 places pour 8 → la seconde vache ne donne rien
  s.paturage.moutons = [makeSheep(s), makeSheep(s), makeSheep(s)];
  s.paturage.vaches = [makeCow(s), makeCow(s)];
  const l = stableHoused(s);
  assertEqual([l.moutons.size, l.vaches.size], [3, 1]);
  setInv(s, { paille: 100 });
  feedLivestock(s);
  assertEqual([s.nuit.etable.moutonsNourris, s.nuit.etable.vachesNourries], [3, 1]);
  // la mangeoire reprise : plus d'Étable (places et bêtes gardées)
  s.paturage.places += 2;
  reprendreBloc(s, p.dedans);
  assertEqual([s.paturage.construit, freeSheepPlaces(s), countItem(s, 'mangeoire'), s.paturage.moutons.length], [false, 0, 1, 3], 'repris : plus d\'Étable');
  poserBloc(s, 'mangeoire', p.dedans);
  assertEqual([s.paturage.construit, s.paturage.places], [true, DATA.PATURAGE.PLACES_DEPART + 2]);
});

/* ---------- étape 5b : la Serre (pièce close + bac à semis) ---------- */

test('ferme générée : un bac à semis posé dans une pièce close construit la Serre', () => {
  const s = chantier('s1');
  s.pieces = 100000;
  s.serre = createInitialState(1).serre;   // comme une partie neuve
  setInv(s, { mur_pierre: 30, porte: 2, bac_semis: 1 });
  const z = terrainLibre(s, 5, 5), p = murs(z, 5, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, p.porte);
  s.progression.niveau = 1;
  assertEqual(poserBloc(s, 'bac_semis', p.dedans).ok, false, 'pas avant le niveau de la Serre');
  reach(s, 'serre');
  assert(poserBloc(s, 'bac_semis', p.dedans).ok);
  // rien de labouré d'office : ses cases se labourent à la houe
  assertEqual([s.serre.construit, s.serre.niveau, s.serre.parcelles.length], [true, 1, 0]);
  s.potager.houe = true;
  const W0 = z.W, a = p.dedans + 1, b = p.dedans + W0;
  assert(hoeableTiles(s).includes(a) && hoeableTiles(s).includes(b), 'les cases de la Serre se labourent');
  const r1 = hoe(s, a);
  assertEqual([r1.ok, r1.action, r1.plot.lieu, r1.plot.case, r1.plot.id], [true, 'labourer', 'serre', a, 'serre-1']);
  assert(hoe(s, b).ok);
  assertEqual([s.serre.parcelles.length, s.potager.parcelles.some((q) => q.case === a), hoeableTiles(s).includes(a)], [2, false, false]);
  assertEqual(poserBloc(s, 'mur_pierre', a).ok, false, 'pas de bloc sur une terre labourée');
  assertEqual(hoe(s, b).action, 'reboucher', 'une terre vide se rebouche');
  assertEqual(s.serre.parcelles.length, 1);
  // au plus DATA.SERRE.PARCELLES[niveau - 1] parcelles
  s.serre.niveau = 1;
  const cap = DATA.SERRE.PARCELLES[0];
  for (let i = s.serre.parcelles.length; i < cap; i++) s.serre.parcelles.push({ id: `x-${i}`, lieu: 'serre', case: -i, culture: null });
  const plein = hoe(s, b);
  assertEqual([plein.ok, plein.error.includes(`${cap} parcelles`)], [false, true]);
  s.serre.parcelles = s.serre.parcelles.filter((q) => q.case >= 0);
  s.serre.parcelles[0].culture = 'tomate';   // ce qui pousse reste là si on la reprend puis la repose
  reprendreBloc(s, p.dedans);
  assertEqual(s.serre.construit, false, 'reprise : plus de Serre');
  poserBloc(s, 'bac_semis', p.dedans);
  assertEqual([s.serre.construit, s.serre.parcelles[0].culture, s.serre.parcelles[0].case], [true, 'tomate', a]);
  // sur la carte : ses parcelles sur les cases libres de la pièce (ni le bac, ni la case
  // derrière la porte) ; un toit de verre
  const W = z.W, places = serrePlaces(s);
  assertEqual(places.length, 9 - 2);
  assert(!places.includes(p.dedans) && !places.includes(p.porte - W), 'ni le bac, ni le passage');
  assertEqual(toits(s).map((t) => t.verre), [true]);
  // ses murs et sa porte (dessinés en verre) : toute l'enceinte
  assertEqual(serreMurs(s), [...p.murs, p.porte].sort((a, b) => a - b));
});

test('ferme générée : une grande Serre (12 × 12 cases dedans) est une pièce close, sous son toit de verre', () => {
  const s = reach(chantier('grande', 80), 'serre');
  setInv(s, { mur_pierre: 80, porte: 2, bac_semis: 1 });
  const z = terrainLibre(s, 14, 14), p = murs(z, 14, 14);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, p.porte);
  assertEqual(piecesCloses(s).map((q) => q.cases.length), [144], 'fermée par sa porte');
  assert(poserBloc(s, 'bac_semis', p.dedans).ok);
  assertEqual(toits(s).map((t) => t.verre), [true]);
  assert(DATA.ATELIER.PIECE_MAX >= 400, 'jusqu\'à 20 × 20 cases dedans');
});

/* ---------- le Silo : des blocs de silo empilés, dehors ---------- */

test('ferme générée : des blocs de silo, 2 colonnes de 3, font le Silo ; il s\'agrandit en largeur et en hauteur', () => {
  const S = DATA.ATELIER.SILO;
  const s = reach(chantier('g1'), 'silo');
  s.silo = createInitialState(1).silo;
  // la recette, à l'Atelier : débloquée avec le Silo
  setInv(s, { planche: 3, pierre: 1 });
  assert(craftStatus(s, 'bloc_silo').ok, 'débloquée');
  assert(craft(s, 'bloc_silo').ok);
  assertEqual(countItem(s, 'bloc_silo'), 1);
  setInv(s, { bloc_silo: 12, ble: 5 });
  const z = terrainLibre(s, 5, 2), a = z.r * z.W + z.c;
  assert(poserBloc(s, 'bloc_silo', a).ok, 'le premier bloc');
  // un seul silo : à côté de ses colonnes, sur la même rangée
  assertEqual(poserBloc(s, 'bloc_silo', a + 3).ok, false, 'pas ailleurs');
  assertEqual(poserBloc(s, 'bloc_silo', a + z.W).ok, false, 'pas sous lui');
  assert(poserBloc(s, 'bloc_silo', a + 1).ok, 'la deuxième colonne');
  // chaque bloc posé sur une colonne la rehausse
  for (let k = 0; k < 2; k++) { assert(poserBloc(s, 'bloc_silo', a).ok); }
  assertEqual([etatSilo(s).ok, s.silo.construit], [false, false], 'une colonne encore basse');
  for (let k = 0; k < 2; k++) assert(poserBloc(s, 'bloc_silo', a + 1).ok);
  assertEqual([hauteurSilo(s, a), hauteurSilo(s, a + 1), etatSilo(s).blocs], [3, 3, 6]);
  assertEqual([s.silo.construit, siloCapacity(s), s.silo.ble, countItem(s, 'ble')], [true, 6 * S.BLES_PAR_BLOC, 5, 0], 'le blé y entre');
  // plus grand : une colonne de plus (comptée une fois haute de 3 blocs), un bloc de plus en hauteur
  assert(poserBloc(s, 'bloc_silo', a + 2).ok);
  assertEqual([s.silo.construit, siloCapacity(s)], [true, 6 * S.BLES_PAR_BLOC], 'une colonne en construction : le silo reste, elle ne compte pas encore');
  for (let k = 0; k < 2; k++) assert(poserBloc(s, 'bloc_silo', a + 2).ok);
  assertEqual(siloCapacity(s), 9 * S.BLES_PAR_BLOC, 'chaque bloc compte');
  assert(poserBloc(s, 'bloc_silo', a).ok);
  assertEqual([hauteurSilo(s, a), siloCapacity(s)], [4, 10 * S.BLES_PAR_BLOC]);
  // jusqu'à HAUTEUR_MAX
  for (let h = 4; h < S.HAUTEUR_MAX; h++) assert(poserBloc(s, 'bloc_silo', a).ok);
  assertEqual(poserBloc(s, 'bloc_silo', a).ok, false, 'déjà au plus haut');
  // repris : le bloc du dessus d'abord ; pas la colonne du milieu ; trop petit, plus de silo
  const avant = countItem(s, 'bloc_silo');
  assert(reprendreBloc(s, a).ok);
  assertEqual([hauteurSilo(s, a), countItem(s, 'bloc_silo')], [S.HAUTEUR_MAX - 1, avant + 1]);
  s.silo.ble = siloCapacity(s);
  assert(reprendreBloc(s, a + 2).ok);
  assertEqual([s.silo.ble, countItem(s, 'ble')], [siloCapacity(s), 3 * S.BLES_PAR_BLOC], 'la colonne trop basse ne compte plus : ce qui ne tient plus revient dans l\'inventaire');
  for (let h = hauteurSilo(s, a + 1); h > 1; h--) assert(reprendreBloc(s, a + 1).ok);
  assertEqual(s.silo.construit, false, 'une seule colonne assez haute : plus de silo');
  assertEqual(reprendreBloc(s, a + 1).ok, false, 'son dernier bloc couperait le silo en deux');
});

test('ferme générée : le bloc de silo se pose dehors, et sa recette attend le niveau du Silo', () => {
  const s = chantier('g2');
  s.progression.niveau = 1;
  setInv(s, { planche: 3, pierre: 1, bloc_silo: 1, mur_pierre: 30, porte: 2 });
  assertEqual(craftStatus(s, 'bloc_silo').ok, false, 'pas encore débloquée');
  const z = terrainLibre(s, 2, 1);
  assertEqual(poserBloc(s, 'bloc_silo', z.r * z.W + z.c).ok, false, 'pas encore débloqué');
  reach(s, 'silo');
  const p = murs(terrainLibre(s, 5, 5), 5, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, p.porte);
  assertEqual(poserBloc(s, 'bloc_silo', p.dedans).ok, false, 'pas dans une pièce close');
});

test('migration v45 : le coffre à grain est remboursé, posé ou dans l\'inventaire', () => {
  const s = chantier('g3');
  setInv(s, { ble: 1 });
  s.blocs = { ...s.blocs, 1234: 'coffre_grain' };
  s.inventaire.coffre_grain = [{ qty: 2, nightsLeft: null, origin: 'produit' }];
  s.silo = { ...s.silo, construit: true, niveau: 2, ble: 12 };
  s.version = 44;
  const m = migreAvant({ v: 44, t: 0, s });
  assertEqual([m.version, m.blocs[1234], m.inventaire.coffre_grain], [AVANT_DEMENAGEMENT, undefined, undefined]);
  assertEqual([countItem(m, 'planche'), countItem(m, 'fibre')], [18, 6], '3 coffres : 6 planches et 2 fibres chacun');
  assertEqual([m.silo.construit, m.silo.ble], [false, 12], 'le blé du Silo reste');
});

/* ---------- version 1.26 : les ressources de la carte avant de bâtir ---------- */

test('ferme générée : on bâtit sur l\'herbe haute une fois fauchée, sur un rocher une fois cassé ; rien ne repousse sous ce qui est bâti', () => {
  const s = chantier('r1');
  const T = farmTerrain(s), W = T.LARGEUR;
  // l'herbe haute : une case d'herbe où pousse une touffe
  const t = Number(Object.keys(T.HERBES).find((k) => T.LIGNES[Math.floor(k / W)][k % W] === '#' && !s.potager.parcelles.some((p) => p.case === Number(k))));
  const ids = herbesSur(s, t);
  assert(ids.length > 0);
  assertEqual(poserBloc(s, 'mur_pierre', t).ok, false, 'pas sur l\'herbe haute');
  if (!s.outils) s.outils = {};
  if (!s.outils.herbes) s.outils.herbes = {};
  for (const id of ids) s.outils.herbes[id] = { retour: s.day };   // (fauchées : elles repousseraient ce matin)
  assertEqual(herbesSur(s, t), []);
  assert(poserBloc(s, 'mur_pierre', t).ok, 'fauchée : on bâtit');
  assertEqual(regrowGrass(s), [], 'rien ne repousse sous le mur');
  assert(ids.every((id) => grassCut(s, id)));
  reprendreBloc(s, t);
  const revenues = regrowGrass(s);
  assert(ids.every((id) => revenues.includes(id)), 'le mur repris : elle repousse');
  // un rocher : pas tant qu'il est là ; cassé, sa case se bâtit ; il ne revient pas dessous
  const [id, cases] = Object.entries(T.ROCHERS).find(([, cs]) => cs.length === 1 && !Object.values(T.ARBRES).some((a) => a.includes(cs[0])));
  const r = cases[0];
  assertEqual(poserBloc(s, 'mur_pierre', r).ok, false, 'pas sur un rocher');
  if (!s.outils.rochers) s.outils.rochers = {};
  s.outils.rochers[id] = { retour: s.day };
  assert(poserBloc(s, 'mur_pierre', r).ok, 'cassé : on bâtit');
  assertEqual(respawnRocks(s), [], 'il ne revient pas sous le mur');
  reprendreBloc(s, r);
  assertEqual(respawnRocks(s), [id]);
  // une partie d'avant : les touffes sous un bloc sont fauchées, sans paille
  const t2 = Number(Object.keys(T.HERBES).find((k) => Number(k) !== t && herbesSur(s, Number(k)).length));
  s.blocs[t2] = 'mur_pierre';
  const avant = countItem(s, 'paille');
  assert(faucherSousBati(s) >= T.HERBES[t2].length);
  assertEqual([herbesSur(s, t2), countItem(s, 'paille')], [[], avant]);
});

test('ferme générée : l\'herbe haute d\'une case voisine qui déborde sur un chemin est foulée et ne repousse pas dessus', () => {
  const s = chantier('foule1');
  setInv(s, { chemin: 10 });
  const T = farmTerrain(s), W = T.LARGEUR, H = T.HERBES;
  // une case d'herbe libre, sans touffe, dont la voisine de droite a une touffe tout à sa gauche
  const t = Number(Object.keys(H).map(Number).map((k) => k - 1).find((j) => T.LIGNES[Math.floor(j / W)][j % W] === '#' && !(H[j] || []).length
    && H[j + 1].some((id) => Number(id.split(',')[0]) - ((j + 1) % W) * 16 < 7)));
  const ids = H[t + 1].filter((id) => Number(id.split(',')[0]) - ((t + 1) % W) * 16 < 7);
  assert(ids.length && herbesSur(s, t).length === 0);
  assert(poserBloc(s, 'chemin', t).ok, 'le chemin se pose à côté de la touffe');
  assert(ids.every((id) => grassCut(s, id)), 'ses brins couvraient le chemin : foulée');
  s.day += 5;
  assert(!regrowGrass(s).some((id) => ids.includes(id)), 'elle ne repousse pas sur le chemin');
  reprendreBloc(s, t);
  assert(ids.every((id) => regrowGrass(s).includes(id) || !grassCut(s, id)), 'le chemin repris : elle repousse');
});

/* ---------- étape 5b : le Moulin (pièce close + meule) ---------- */

test('ferme générée (version 1.25) : le Moulin, une tour aux murs hauts de 3 blocs avec la meule au centre', () => {
  const s = chantier('m1');
  s.pieces = 100000;
  assertEqual(buildStation(s, 'moulin').ok, false, 'pas en pièces');
  setInv(s, { mur_pierre: 60, porte: 2, meule: 1 });
  const z = terrainLibre(s, 5, 5), p = murs(z, 5, 5), W = z.W;
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, p.porte);
  const centre = (z.r + 2) * W + z.c + 2;
  s.progression.niveau = 1;
  assertEqual(poserBloc(s, 'meule', centre).ok, false, 'pas avant le niveau du Moulin');
  reach(s, 'moulin');
  // la meule dans un coin : pas au centre
  assert(poserBloc(s, 'meule', p.dedans).ok);
  let e = etatMoulin(s);
  assertEqual([e.ok, e.conditions.map((c) => c.ok), s.stations.moulin.construit], [false, [true, false, false], false]);
  reprendreBloc(s, p.dedans);
  assert(poserBloc(s, 'meule', centre).ok);
  e = etatMoulin(s);
  assertEqual([e.conditions.map((c) => c.ok), e.murs], [[true, true, false], { hauts: 0, total: 15 }], 'les murs, pas la porte');
  // rehausser : le même mur posé sur un mur, jusqu'à 3 blocs
  const m = p.murs[0];
  assertEqual(poserBloc(s, 'mur_pierre', m), { ok: true, sorte: 'mur_pierre', case: m, hauteur: 2 });
  assertEqual([hauteurMur(s, m), countItem(s, 'mur_pierre')], [2, 60 - 15 - 1]);
  assert(poserBloc(s, 'mur_pierre', m).ok);
  assertEqual([hauteurMur(s, m), poserBloc(s, 'mur_pierre', m).ok], [3, false], 'pas plus de 3');
  assertEqual(poserBloc(s, 'mur_fenetre', m).ok, false, 'un mur rehaussé ne se change pas');
  for (const t of p.murs.slice(1)) { poserBloc(s, 'mur_pierre', t); poserBloc(s, 'mur_pierre', t); }
  // un mur du côté gauche resté à 2 blocs (vu de 3/4, ses voisins le cachent) : dit, marqué
  const g = (z.r + 2) * W + z.c;
  reprendreBloc(s, g);
  e = etatMoulin(s);
  assertEqual(e.murs, { hauts: 14, total: 15 });
  assert(/à rehausser : 1 à gauche \(2 blocs\)/.test(e.conditions[2].texte), e.conditions[2].texte);
  poserBloc(s, 'mur_pierre', g);
  e = etatMoulin(s);
  assertEqual([e.ok, e.murs, s.stations.moulin.construit, !!s.stations.moulin.appareil], [true, { hauts: 15, total: 15 }, true, true]);
  // reprendre : le bloc du dessus d'abord ; le Moulin n'est plus là
  assertEqual(reprendreBloc(s, m), { ok: true, sorte: 'mur_pierre', case: m, hauteur: 2 });
  assertEqual([s.stations.moulin.construit, blocAt(s, m)], [false, 'mur_pierre']);
  assert(poserBloc(s, 'mur_pierre', m).ok);
  assertEqual(s.stations.moulin.construit, true);
  // la meule reprise : plus de Moulin
  reprendreBloc(s, centre);
  assertEqual([s.stations.moulin.construit, countItem(s, 'meule')], [false, 1]);
  // un mur repris entièrement : ses blocs reviennent tous
  const avant = countItem(s, 'mur_pierre');
  for (let k = 0; k < 3; k++) assert(reprendreBloc(s, m).ok);
  assertEqual([blocAt(s, m), hauteurMur(s, m), countItem(s, 'mur_pierre')], [null, 0, avant + 3]);
});

test('migration v41 → v42 : une meule seule ne fait plus le Moulin', () => {
  const s = chantier('m2');
  setInv(s, { mur_pierre: 30, porte: 2, meule: 1 });
  reach(s, 'moulin');
  const z = terrainLibre(s, 5, 5), p = murs(z, 5, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, p.porte);
  poserBloc(s, 'meule', (z.r + 2) * z.W + z.c + 2);
  // une partie d'avant : la meule posée avait ouvert la station
  s.stations.moulin.construit = true;
  const m = migreAvant({ v: 41, t: 0, s: { ...s, version: 41 } });
  assertEqual([m.version, m.stations.moulin.construit], [AVANT_DEMENAGEMENT, false]);
});

/* ---------- étape 5b-8 : les arbres fruitiers, plantés dans le sol ---------- */

test('ferme générée : un jeune arbre se plante dans le sol, dehors, et donne ses fruits', () => {
  const s = reach(chantier('v1'), 'verger');
  s.pieces = 100000;
  setInv(s, { mur_pierre: 30, porte: 2, jeune_pommier: 3 });
  const z = terrainLibre(s, 8, 5), p = murs(z, 5, 5), W = z.W;
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, p.porte);
  assertEqual(poserBloc(s, 'pommier', p.dedans).ok, false, 'dehors, pas dans une pièce');
  const ici = (z.r + 1) * W + z.c + 7;
  s.progression.niveau = 1;
  assertEqual(poserBloc(s, 'pommier', ici).ok, false, 'pas avant le niveau du Verger');
  reach(s, 'verger');
  assert(poserBloc(s, 'pommier', ici).ok);
  assertEqual([s.verger.construit, s.verger.arbres.length, s.verger.arbres[0].case, blocAt(s, ici), countItem(s, 'jeune_pommier')], [true, 1, ici, null, 2]);
  assertEqual(arable(ici, s), false, 'on ne laboure pas sous un arbre');
  assertEqual(poserBloc(s, 'pommier', ici + 1).ok, false, 'trop près');
  assertEqual(poserBloc(s, 'mur_pierre', ici).ok, false, 'pas de bloc sur un arbre');
  // il pousse, puis donne ses fruits
  const t = s.verger.arbres[0];
  for (let i = 0; i < DATA.VERGER.MATURITE + 1; i++) sleepOnce(s);
  assert(t.fruits, 'en fruits');
  assert(harvestTree(s, t.id).ok);
});

test('mode test : les ressources, les blocs, les outils et l\'Atelier en un appui', () => {
  const s = createNewGame(77);
  setFarmSeed(s, '77');
  assert(testAddRessources(s).ok);
  for (const id of TEST_RESSOURCES) assertEqual(countItem(s, id) >= 20, true, id);
  assert(testAddMetaux(s).ok);
  assertEqual(countItem(s, 'lingot_fer') >= 10 && countItem(s, 'minerai_cuivre') >= 10, true);
  assert(testAddBlocs(s).ok);
  for (const b of Object.values(DATA.ATELIER.BLOCS)) if (b.objet) assert(countItem(s, b.objet) >= 5, b.objet);
  assert(testAllTools(s).ok);
  assert(s.potager.houe && s.outils.hache && s.outils.pioche && s.outils.canne);
  assert(testBuildAtelier(s).ok);
  assert(atelierConstruit(s));
  const avant = countItem(s, 'panneau_solaire');
  assertEqual(testAddItem(s, 'panneau_solaire', '3').items, { panneau_solaire: 3 });
  assertEqual(countItem(s, 'panneau_solaire'), avant + 3);
  assertEqual(testAddItem(s, 'licorne', 1).ok, false);
});

test('ferme générée : une enceinte est une maison ou un bâtiment, le premier bloc décide', () => {
  const s = reach(reach(chantier('g1'), 'poulailler'), 'energie');
  setInv(s, { mur_pierre: 40, porte: 4, paillasse: 2, four_pierre: 1, nichoir: 1, plancher: 2, batterie: 1 });
  removeStarter(s, 'batterie');   // (une partie neuve : pas de batterie installée)
  // deux enceintes côte à côte, un mur en commun
  const z = terrainLibre(s, 9, 5), a = murs(z, 5, 5), b = murs({ ...z, c: z.c + 4 }, 5, 5);
  for (const t of new Set([...a.murs, ...b.murs])) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, a.porte); poserPorte(s, b.porte);
  // la maison : un lit, puis un four ; pas de nichoir
  assert(poserBloc(s, 'paillasse', a.dedans).ok);
  assertEqual([genrePiece(s, a.dedans), genrePiece(s, b.dedans)], ['maison', null]);
  assert(poserBloc(s, 'four', a.dedans + 1).ok, 'un four dans la maison');
  assertEqual(poserBloc(s, 'nichoir', a.dedans + 2).ok, false, 'pas de nichoir dans la maison');
  // le Poulailler : son nichoir, un plancher ; ni lit ni batterie
  assert(poserBloc(s, 'plancher', b.dedans + 1).ok, 'un plancher, oui');
  assert(poserBloc(s, 'nichoir', b.dedans).ok);
  assertEqual(genrePiece(s, b.dedans), 'poulailler');
  assertEqual(poserBloc(s, 'paillasse', b.dedans + 2).ok, false, 'pas de lit au Poulailler');
  assertEqual(poserBloc(s, 'batterie', b.dedans + 2).error, 'Cette enceinte est le Poulailler : on n\'y pose que son bloc (et un plancher). Batterie : dans une autre enceinte.');
  // le mur entre les deux ne se reprend pas (il mêlerait la maison et le Poulailler)
  const commun = (z.r + 2) * z.W + z.c + 4;
  assertEqual([reprendreBloc(s, commun).ok, blocAt(s, commun)], [false, 'mur_pierre']);
  // un bloc clé dans une enceinte qui a déjà autre chose : refusé
  reprendreBloc(s, b.dedans);
  assert(poserBloc(s, 'batterie', b.dedans + 2).ok, 'une enceinte vide prend une batterie');
  assertEqual(poserBloc(s, 'nichoir', b.dedans).ok, false, 'un bâtiment se bâtit dans une enceinte vide');
});

test('migration v37 → v38 : une enceinte qui mêle une maison et un bâtiment rend les blocs en trop', () => {
  const s = reach(chantier('g2'), 'poulailler');
  const z = terrainLibre(s, 5, 5), p = murs(z, 5, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, p.porte);
  assert(poserBloc(s, 'paillasse', p.dedans).ok);
  // (une partie d'avant la règle : le nichoir posé à côté du lit)
  s.blocs[p.dedans + 1] = 'nichoir';
  s.poulailler.construit = true;
  setInv(s, {});
  const m = migreAvant({ ...s, version: 37 });
  assertEqual([m.version, m.blocs[p.dedans], m.blocs[p.dedans + 1], countItem(m, 'nichoir'), m.poulailler.construit], [AVANT_DEMENAGEMENT, 'paillasse', undefined, 1, false]);
});

test('ferme générée : la barrière arrête le passage sans fermer de pièce ; le chemin se pose dehors, comme celui de la carte', () => {
  const s = reach(chantier('h1'), 'poulailler');
  setInv(s, { mur_pierre: 30, porte: 2, barriere: 30, chemin: 10, plancher: 2, nichoir: 1 });
  // une enceinte de barrières : pas une pièce close
  const z = terrainLibre(s, 12, 5), p = murs(z, 5, 5);
  for (const t of p.murs) assert(poserBloc(s, 'barriere', t).ok);
  assert(poserPorte(s, p.porte).ok);
  assertEqual([blocBloque(s, p.murs[0]), dansPiece(s, p.dedans), piecesCloses(s).length], [true, false, 0]);
  // un chemin : sur l'herbe, dehors ; ses tuiles sont celles du chemin de la carte
  const c = (z.r + 2) * z.W + z.c + 8;
  assert(poserBloc(s, 'chemin', c).ok);
  assert(poserBloc(s, 'chemin', c + 1).ok);
  assertEqual([solAt(s, c), isArable(c, s)], ['chemin', false]);
  const T = farmTerrain(s), tuiles = tuilesChemins(T, new Set([c, c + 1]));
  assert(tuiles.some(([i]) => i === c) && tuiles.length >= 6, 'le chemin et ses raccords');
  assert(tuiles.every(([, g]) => g >= blocGid('herbe_chemin', 0) && g <= blocGid('herbe_chemin', 255)), 'les tuiles herbe / chemin de la planche');
  assertEqual(poserBloc(s, 'plancher', c).error, 'Il y a déjà un chemin ici.');
  // pas dans une pièce close ; le plancher, lui, entre au Poulailler même après le nichoir
  reprendreBloc(s, c); reprendreBloc(s, c + 1);
  for (const k of p.murs) reprendreBloc(s, k);
  for (const k of p.murs) poserBloc(s, 'mur_pierre', k);
  assert(poserBloc(s, 'nichoir', p.dedans).ok);
  assertEqual(poserBloc(s, 'chemin', p.dedans + 1).ok, false, 'le chemin : dehors');
  assert(poserBloc(s, 'plancher', p.dedans + 1).ok, 'un plancher au Poulailler, après le nichoir');
});

test('ferme générée : la lanterne scintillante (un champignon lumineux de la mine et du bois) éclaire, dehors ou dans la maison', () => {
  const s = reach(chantier('l1'), 'poulailler');
  // le champignon se cueille dans la mine ; la recette de l'Atelier
  assertEqual(DATA.OBJETS.champignon_lumineux.cueillette, 'grotte');
  setInv(s, { champignon_lumineux: 2, bois: 2, mur_pierre: 30, porte: 2, nichoir: 1 });
  assert(craft(s, 'lanterne').ok);
  assertEqual([countItem(s, 'lanterne'), countItem(s, 'champignon_lumineux'), countItem(s, 'bois')], [1, 1, 0]);
  assertEqual(craft(s, 'lanterne').ok, false, 'plus de bois');
  assert(DATA.ATELIER.BLOCS.lanterne.lumiere);
  // posée dehors : elle arrête le passage ; reprise, elle revient dans l'inventaire
  const z = terrainLibre(s, 12, 5), dehors = (z.r + 2) * z.W + z.c + 8;
  assert(poserBloc(s, 'lanterne', dehors).ok);
  assertEqual([blocAt(s, dehors), blocBloque(s, dehors), countItem(s, 'lanterne')], ['lanterne', true, 0]);
  reprendreBloc(s, dehors);
  assertEqual([blocAt(s, dehors), countItem(s, 'lanterne')], [null, 1]);
  // dans une enceinte vide : oui ; dans un bâtiment (le Poulailler) : non
  const p = murs(z, 5, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, p.porte);
  assert(poserBloc(s, 'lanterne', p.dedans + 1).ok, 'dans une enceinte vide');
  reprendreBloc(s, p.dedans + 1);
  assert(poserBloc(s, 'nichoir', p.dedans).ok);
  assertEqual(poserBloc(s, 'lanterne', p.dedans + 1).ok, false, 'pas dans un bâtiment');
});

test('ferme générée : la station du robot est un bloc à poser dehors ; sans elle, il ne se recharge pas', () => {
  const s = chantier('robot1');
  setInv(s, { station_robot: 1 });
  const z = terrainLibre(s, 3, 3), t = (z.r + 1) * z.W + z.c + 1;
  assertEqual(poserBloc(s, 'station_robot', t).ok, false, 'pas sans le robot');
  grantTech(s, 'cu_recolte_auto');
  assertEqual(robotStation(s), null, 'pas encore posée');
  const b = robotBattery(s);
  b.mwh = 0;
  runRobotCharge(s, 1000);
  assertEqual(b.mwh, 0, 'sans station : pas de charge');
  const base = robotTrip(s, { taches: [{ t: 'recolter', id: 'x' }], base: 0 }, 0);
  assert(poserBloc(s, 'station_robot', t).ok);
  assertEqual([robotStation(s), blocBloque(s, t), countItem(s, 'station_robot')], [t, true, 0], 'posée : elle arrête le passage');
  assert(base.route >= 0);
  setInv(s, { station_robot: 1 });
  assertEqual(poserBloc(s, 'station_robot', t + 2).ok, false, 'une seule station');
  reprendreBloc(s, t);
  assertEqual([robotStation(s), countItem(s, 'station_robot')], [null, 2], 'reprise : dans l\'inventaire');
  // (une ancienne partie qui a le robot reçoit sa station)
  const v = migreAvant({ ...JSON.parse(JSON.stringify(s)), version: 40, inventaire: JSON.parse(JSON.stringify(s.inventaire)) });
  assertEqual(countItem(v, 'station_robot'), 2, 'elle en a déjà : rien de plus');
  setInv(s, {});
  const w = migreAvant({ ...JSON.parse(JSON.stringify(s)), version: 40 });
  assertEqual([w.version, countItem(w, 'station_robot')], [AVANT_DEMENAGEMENT, 1]);
  void robotCapacity;
});

test('ferme générée (essai) : l\'escalier ouvre un étage au-dessus de sa pièce close ; on y pose des blocs', () => {
  const s = chantier('etage1');
  setInv(s, { mur_pierre: 40, porte: 4, escalier: 1, paillasse: 2 });
  const z = terrainLibre(s, 6, 5), p = murs(z, 6, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, p.porte);
  assertEqual(etageEmprise(s).size, 0, 'pas d\'escalier : pas d\'étage');
  assert(poserBloc(s, 'escalier', p.dedans).ok, 'l\'escalier, dans la pièce close');
  assertEqual([escaliers(s), blocBloque(s, p.dedans)], [[p.dedans], false], 'il se traverse');
  const E = etageEmprise(s);
  assertEqual(E.size, 6 * 5, 'la pièce et ses murs');
  const coin = (z.r) * z.W + z.c;
  assertEqual(poserEtage(s, 'mur_pierre', p.dedans).ok, false, 'pas sur le haut de l\'escalier');
  assertEqual(poserEtage(s, 'four', p.dedans + 1).ok, false, 'pas n\'importe quel bloc');
  assertEqual(poserEtage(s, 'mur_pierre', coin - 1).ok, false, 'pas hors de l\'emprise');
  assert(poserEtage(s, 'mur_pierre', coin).ok, 'au-dessus d\'un mur');
  assert(poserEtage(s, 'paillasse', p.dedans + 2).ok);
  assertEqual(poserEtage(s, 'mur_pierre', coin).ok, false, 'déjà un bloc');
  assertEqual([Object.keys(etageBlocs(s)).length, countItem(s, 'paillasse')], [2, 1]);
  // un mur du bas qui porte l'étage (ou la porte) : il reste, l'étage garde ce qui y est posé
  const r = reprendreBloc(s, p.murs[3]);
  assertEqual([r.ok, blocAt(s, p.murs[3]), Object.keys(etageBlocs(s)).length], [false, 'mur_pierre', 2]);
  assert(/porte l'étage/.test(r.error), r.error);
  assertEqual(reprendreBloc(s, p.porte).ok, false, 'la porte aussi');
  // un mur qui couperait la pièce de l'escalier (la paillasse de l'étage serait dehors) : non
  const col = (dr) => (z.r + dr) * z.W + z.c + 2;
  assert(poserBloc(s, 'mur_pierre', col(1)).ok && poserBloc(s, 'mur_pierre', col(2)).ok, 'tant que la pièce reste entière');
  assert(/couperait la pièce de l'escalier/.test(poserBloc(s, 'mur_pierre', col(3)).error));
  assertEqual(Object.keys(etageBlocs(s)).length, 2);
  reprendreBloc(s, col(1)); reprendreBloc(s, col(2));
  assert(reprendreEtage(s, coin).ok);
  // l'escalier repris : l'étage s'en va, ses blocs reviennent
  reprendreBloc(s, p.dedans);
  assertEqual([Object.keys(etageBlocs(s)).length, countItem(s, 'paillasse'), countItem(s, 'escalier')], [0, 2, 1]);
});

test('ferme générée : les meubles du Marché se posent à l\'étage, sur toutes leurs cases', () => {
  const s = chantier('etage2');
  setInv(s, { mur_pierre: 40, porte: 4, escalier: 1, meuble_table: 1, meuble_chaise: 1, meuble_tapis_2: 1, meuble_tableau_1: 1 });
  const z = terrainLibre(s, 7, 6), p = murs(z, 7, 6), W = z.W;
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, p.porte);
  assert(poserBloc(s, 'escalier', p.dedans).ok);
  assert(!ETAGE_BLOCS.includes('meuble_tableau_1') && ETAGE_BLOCS.includes('meuble_table'), 'les meubles du sol, pas les tableaux');
  const t = (z.r + 3) * W + z.c + 1;                       // (la table : 3 cases vers la droite)
  const r = poserEtage(s, 'meuble_table', t);
  assert(r.ok, r.error);
  assertEqual([...etageCouvertes(s).keys()], [t + 1, t + 2]);
  assertEqual(poserEtage(s, 'meuble_chaise', t + 2).ok, false, 'une case de la table');
  assert(poserEtage(s, 'meuble_chaise', t + 3).ok, 'à côté');
  assertEqual(poserEtage(s, 'meuble_chaise', t + 4).error.includes('Marché'), true, 'plus de chaise : au Marché');
  assertEqual(poserEtage(s, 'meuble_tapis_2', (z.r + 5) * W + z.c + 5).ok, false, 'pas hors de l\'étage');
  assertEqual(poserEtage(s, 'meuble_tapis_2', (z.r + 4) * W + z.c + 2).ok, false, 'pas sur la table');
  assert(poserEtage(s, 'meuble_tapis_2', (z.r + 2) * W + z.c + 2).ok, 'au-dessus d\'elle');
  // reprendre la table par une de ses cases
  assert(reprendreEtage(s, t + 1).ok);
  assertEqual([etageBlocs(s)[t], countItem(s, 'meuble_table'), etageCouvertes(s).size], [undefined, 1, 5], 'le tapis reste');
});

test('ferme générée : on dort dans les lits et sur les paillasses d\'une pièce close de l\'étage', () => {
  const s = chantier('etage3');
  setInv(s, { mur_pierre: 60, porte: 4, escalier: 1, meuble_lit_adulte: 1, paillasse: 2 });
  const z = terrainLibre(s, 7, 6), p = murs(z, 7, 6), W = z.W;
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, p.porte);
  assert(poserBloc(s, 'escalier', p.dedans).ok);
  const lit = (z.r + 3) * W + z.c + 2, paille = (z.r + 3) * W + z.c + 4;
  assert(poserEtage(s, 'meuble_lit_adulte', lit).ok);
  assert(poserEtage(s, 'paillasse', paille).ok);
  assertEqual(couchagesEtage(s), [], 'un étage à ciel ouvert : on n\'y dort pas');
  // des murs tout autour, à l'étage
  for (const t of p.murs.concat([p.porte])) assert(poserEtage(s, 'mur_pierre', t).ok);
  assertEqual(couchagesEtage(s), ['etage:' + lit, 'etage:' + paille]);
  assertEqual(couchages(s), ['etage:' + lit, 'etage:' + paille], 'pas de couchage en bas : ceux de l\'étage');
  assert(nuitCouchee(s), 'la famille dort');
  assertEqual(nuitSansCouchage(s).length, Math.max(0, s.famille.membres.length - 2));
});

test('ferme générée : les fenêtres et les pierres d\'angle ferment une pièce comme des murs', () => {
  const s = chantier('deco1');
  setInv(s, { mur_pierre: 20, mur_fenetre: 4, pierre_angle: 4, porte: 1 });
  const z = terrainLibre(s, 5, 4), p = murs(z, 5, 4);
  const coins = [p.murs[0], p.murs[4], p.murs[p.murs.length - 1], p.murs[p.murs.length - 4]];
  const fenetres = [p.murs[2], p.murs[p.murs.length - 2]];
  for (const t of p.murs) assert(poserBloc(s, coins.includes(t) ? 'pierre_angle' : fenetres.includes(t) ? 'mur_fenetre' : 'mur_pierre', t).ok, `bloc ${t}`);
  poserPorte(s, p.porte);
  assertEqual(piecesCloses(s).length, 1, 'une pièce close');
  assertEqual([blocBloque(s, coins[0]), blocBloque(s, fenetres[0])], [true, true], 'on ne passe pas');
  assertEqual([countItem(s, 'pierre_angle'), countItem(s, 'mur_fenetre')], [0, 2]);
});

test('ferme générée : une fenêtre, une porte changent un mur sans l\'enlever (au sol et à l\'étage)', () => {
  const s = chantier('deco2');
  setInv(s, { mur_pierre: 20, mur_fenetre: 2, pierre_angle: 1, porte: 3, escalier: 1 });
  const z = terrainLibre(s, 5, 4), p = murs(z, 5, 4);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, p.porte);
  const m = p.murs[2], avant = countItem(s, 'mur_pierre');
  const r = poserBloc(s, 'mur_fenetre', m);
  assert(r.ok, r.error);
  assertEqual([blocAt(s, m), r.perce, countItem(s, 'mur_pierre'), countItem(s, 'mur_fenetre'), fenetresPosees(s)[m]], ['mur_fenetre', 'mur_pierre', avant, 1, 'mur_pierre'], 'percée dans le mur, qui reste');
  assertEqual(piecesCloses(s).length, 1, 'la pièce reste close');
  assert(poserBloc(s, 'pierre_angle', m).ok, 'une pierre d\'angle à la place de la fenêtre');
  assertEqual([blocAt(s, m), countItem(s, 'mur_fenetre'), countItem(s, 'mur_pierre'), fenetresPosees(s)[m]], ['pierre_angle', 2, avant + 1, undefined], 'la fenêtre et son mur reviennent');
  // la porte : sur un mur, à sa place (le mur revient dans l'inventaire), la pièce reste close
  const m2 = p.murs[3], murs2 = countItem(s, 'mur_pierre');
  const rp = poserBloc(s, 'porte', m2);
  assertEqual([rp.ok, rp.remplace, blocAt(s, m2), countItem(s, 'mur_pierre')], [true, 'mur_pierre', 'porte', murs2 + 1]);
  assertEqual(piecesCloses(s).length, 1, 'la pièce reste close');
  assertEqual(reprendreBloc(s, m2).ok, true);
  assertEqual(blocAt(s, m2), null, 'reprise, la porte laisse la case vide (comme une fenêtre)');
  poserBloc(s, 'mur_pierre', m2);
  // à l'étage
  poserBloc(s, 'escalier', p.dedans);
  const coin = p.murs[0];
  assert(poserEtage(s, 'mur_pierre', coin).ok);
  assert(poserEtage(s, 'mur_fenetre', coin).ok, 'une fenêtre sur le mur de l\'étage');
  assertEqual([etageBlocs(s)[coin], countItem(s, 'mur_fenetre'), fenetresEtage(s)[coin]], ['mur_fenetre', 1, 'mur_pierre']);
  assertEqual([reprendreEtage(s, coin).reste, etageBlocs(s)[coin], countItem(s, 'mur_fenetre')], ['mur_pierre', 'mur_pierre', 2], 'reprise, la fenêtre laisse son mur');
  assert(poserEtage(s, 'porte', p.murs[1]).ok, 'à l\'étage aussi, la porte directement sur une case libre');
  assert(poserEtage(s, 'mur_pierre', p.murs[2]).ok);
  assert(poserEtage(s, 'porte', p.murs[2]).ok, 'une porte sur le mur de l\'étage');
});

test('ferme générée : une fenêtre, de chaque modèle, se perce dans un mur de chaque matière', () => {
  const s = chantier('fen1');
  const modeles = Object.keys(DATA.ATELIER.BLOCS).filter((k) => DATA.ATELIER.BLOCS[k].fenetre);
  assertEqual(modeles, ['mur_fenetre', 'fenetre_ronde', 'fenetre_cintree', 'fenetre_volets', 'fenetre_vitrail']);
  const matieres = ['mur_pierre', 'mur_brique_rouge', 'mur_brique_orange', 'mur_brique_ocre', 'mur_brique_bleue', 'mur_pierre_taille', 'mur_bois'];
  setInv(s, { ...Object.fromEntries(matieres.map((k) => [k, 30])), ...Object.fromEntries(modeles.map((k) => [k, 10])), porte: 2 });
  const z = terrainLibre(s, 9, 4), p = murs(z, 9, 4);
  for (const [i, t] of p.murs.entries()) poserBloc(s, matieres[i % matieres.length], t);
  poserPorte(s, p.porte);
  assertEqual(piecesCloses(s).length, 1);
  for (const [i, t] of p.murs.entries()) {
    const mur = blocAt(s, t), f = modeles[i % modeles.length];
    const r = poserBloc(s, f, t);
    assert(r.ok, `${f} dans ${mur} : ${r.error}`);
    assertEqual([blocAt(s, t), fenetresPosees(s)[t], r.perce], [f, mur, mur], `${f} dans ${mur}`);
  }
  assertEqual(piecesCloses(s).length, 1, 'la pièce reste close');
  assertEqual(matieres.map((k) => countItem(s, k)), matieres.map((k) => 30 - p.murs.filter((_, i) => matieres[i % matieres.length] === k).length), 'les murs restent posés');
  // un autre modèle dans la même fenêtre : le mur reste, l'ancienne fenêtre revient
  const t = p.murs[1], mur = fenetresPosees(s)[t], avant = blocAt(s, t);
  const autre = modeles.find((k) => k !== avant);
  const n = countItem(s, avant);
  { const q = poserBloc(s, autre, t); assert(q.ok, `autre modèle : ${q.error}`); }
  assertEqual([blocAt(s, t), fenetresPosees(s)[t], countItem(s, avant)], [autre, mur, n + 1]);
  // reprise : la fenêtre revient, son mur reste
  const r = reprendreBloc(s, t);
  assertEqual([r.ok, r.reste, blocAt(s, t), fenetresPosees(s)[t]], [true, mur, mur, undefined]);
  // une porte à la place d'une fenêtre : la fenêtre et son mur reviennent
  const t2 = p.murs[2], mur2 = fenetresPosees(s)[t2], f2 = blocAt(s, t2), m2 = countItem(s, mur2);
  { const q = poserBloc(s, 'porte', t2); assert(q.ok, `porte : ${q.error}`); }
  assertEqual([blocAt(s, t2), fenetresPosees(s)[t2], countItem(s, mur2), countItem(s, f2) > 0], ['porte', undefined, m2 + 1, true]);
  // une fenêtre posée seule (pas sur un mur) : dans un mur en pierre, rien à rendre
  const libre = p.dedans + 2;
  { const q = poserBloc(s, 'fenetre_ronde', libre); assert(q.ok, `seule : ${q.error}`); }
  assertEqual([fenetresPosees(s)[libre], reprendreBloc(s, libre).reste, blocAt(s, libre)], [undefined, undefined, null]);
});

test('ferme générée : des bouts de murs qui ne se touchent pas ne font pas de pièce close', () => {
  // (une grande étendue ouverte, arrêtée à PIECE_MAX cases, ne doit pas faire un faux mur
  // pour une autre : chaque pièce trouvée est vraiment fermée)
  const s = chantier('pc1'), T = farmTerrain(s), W = T.LARGEUR, H = T.HAUTEUR;
  let x = 7;
  const R = () => (x = (x * 9301 + 49297) % 233280) / 233280;
  s.blocs = {};
  for (let k = 0; k < 40; k++) {
    const c = 10 + Math.floor(R() * (W - 30)), r = 10 + Math.floor(R() * (H - 30)), v = R() < 0.5, n = 3 + Math.floor(R() * 8);
    for (let i = 0; i < n; i++) s.blocs[v ? (r + i) * W + c : r * W + c + i] = i === 1 ? 'porte' : 'mur_pierre';
  }
  for (const p of piecesCloses(s)) {
    const vu = new Set([p.cases[0]]), pile = [p.cases[0]];
    let bord = false;
    while (pile.length && vu.size <= p.cases.length) {
      const i = pile.pop(), c = i % W, r = Math.floor(i / W);
      if (c === 0 || r === 0 || c === W - 1 || r === H - 1) bord = true;
      for (const j of [i - 1, i + 1, i - W, i + W]) if (!s.blocs[j] && !vu.has(j)) { vu.add(j); pile.push(j); }
    }
    assertEqual([bord, vu.size], [false, p.cases.length], 'une pièce vraiment fermée');
  }
});

test('ferme générée : un toit sur le dernier niveau de chaque bâtiment', () => {
  const s = chantier('toit1');
  setInv(s, { mur_pierre: 40, porte: 4, escalier: 1, paillasse: 1 });
  const z = terrainLibre(s, 6, 5), p = murs(z, 6, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  assertEqual(toits(s).length, 0, 'pas de pièce close : pas de toit');
  poserPorte(s, p.porte);
  assertEqual(toits(s).length, 0, 'une pièce close vide : une cour, à ciel ouvert');
  poserBloc(s, 'paillasse', p.dedans + 1);
  assertEqual(toits(s).map((t) => [t.niveau, t.cases.length]), [[0, 30]], 'aménagée : sur les murs du bas, murs compris');
  assertEqual(toits(s).map((t) => t.maison), [true], 'une paillasse : une pièce de la maison (allumée la nuit)');
  // l'escalier : l'étage, à ciel ouvert tant que ses murs ne le ferment pas
  poserBloc(s, 'escalier', p.dedans);
  assertEqual(toits(s).length, 0, 'une terrasse');
  const tour = [...p.murs, p.porte];
  for (const t of tour) assert(poserEtage(s, 'mur_pierre', t).ok, `étage ${t}`);
  assertEqual(toits(s).map((t) => [t.niveau, t.cases.length, t.dedans.length]), [[1, 30, 30]], 'sur les murs de l\'étage');
  reprendreEtage(s, tour[3]);
  assertEqual(toits(s).length, 0, 'un mur de l\'étage en moins : ouvert');
});

test('ferme générée : des pièces séparées par un mur et une porte, sous un seul toit', () => {
  const s = chantier('toit2');
  setInv(s, { mur_pierre: 60, porte: 4, paillasse: 2 });
  const z = terrainLibre(s, 9, 5), at = (dc, dr) => (z.r + dr) * z.W + z.c + dc;
  // le tour (9 × 5), et le mur du milieu (colonne 4), percé d'une porte
  for (let dr = 0; dr < 5; dr++) for (let dc = 0; dc < 9; dc++) if (dr === 0 || dr === 4 || dc === 0 || dc === 8 || dc === 4) poserBloc(s, 'mur_pierre', at(dc, dr));
  assert(poserBloc(s, 'porte', at(2, 4)).ok, 'la porte de dehors');
  assert(poserBloc(s, 'porte', at(4, 2)).ok, 'la porte entre les deux pièces');
  poserBloc(s, 'paillasse', at(1, 1));
  assertEqual(toits(s).map((t) => t.cases.length), [25], 'une seule pièce aménagée : son toit');
  poserBloc(s, 'paillasse', at(7, 1));
  assertEqual(toits(s).map((t) => [t.niveau, t.cases.length, t.dedans.length]), [[0, 45, 45]], 'deux pièces voisines : un seul toit sur tout le bâtiment');
});

test('ferme générée : la paroi vitrée se pose comme un mur ou à la place d\'un mur', () => {
  const s = chantier('vitre1');
  setInv(s, { mur_pierre: 20, paroi_vitree: 4, porte: 1 });
  const z = terrainLibre(s, 5, 4), p = murs(z, 5, 4);
  for (const [i, t] of p.murs.entries()) assert(poserBloc(s, i === 1 ? 'paroi_vitree' : 'mur_pierre', t).ok, `bloc ${t}`);
  poserPorte(s, p.porte);
  assertEqual(piecesCloses(s).length, 1, 'elle ferme la pièce');
  assert(poserBloc(s, 'paroi_vitree', p.murs[2]).ok, 'à la place d\'un mur');
  assertEqual([blocAt(s, p.murs[2]), blocBloque(s, p.murs[2]), countItem(s, 'paroi_vitree'), piecesCloses(s).length], ['paroi_vitree', true, 2, 1]);
});

test('ferme générée : les murs aux matières de la ville ferment une pièce et changent un mur', () => {
  const sortes = ['mur_brique_rouge', 'mur_brique_orange', 'mur_brique_ocre', 'mur_brique_bleue', 'mur_pierre_taille', 'mur_bois'];
  for (const sorte of sortes) {
    assertEqual([DATA.ATELIER.BLOCS[sorte].mur, DATA.ATELIER.RECETTES[sorte].sortie[sorte]], [true, 1], sorte);
    const s = chantier('mv_' + sorte);
    setInv(s, { [sorte]: 20, porte: 1 });
    const z = terrainLibre(s, 5, 4), p = murs(z, 5, 4);
    for (const t of p.murs.concat(p.porte)) assert(poserBloc(s, sorte, t).ok, `${sorte} ${t}`);
    assert(poserBloc(s, 'porte', p.porte).ok, `${sorte} : la porte sur le mur`);
    assertEqual(piecesCloses(s).length, 1, `${sorte} : une pièce close`);
    setInv(s, { mur_pierre: 1 });
    assert(poserBloc(s, 'mur_pierre', p.murs[1]).ok, `${sorte} : changé en mur en pierre`);
  }
});

test("ferme générée : l'herbe haute en quinconce, au plus 2 touffes par case", () => {
  for (const graine of ['1', 'abc', '12345']) {
    const { carte, terrain } = genererFerme(graine);
    const objets = carte.layers.find((l) => l.name === 'herbe_haute').objects;
    const parCase = Object.values(terrain.HERBES).map((l) => l.length);
    assert(objets.length > 2000 && objets.length < 8000, `${graine} : ${objets.length} touffes`);
    assert(Math.max(...parCase) <= 2, `${graine} : au plus 2 touffes par case`);
    assertEqual(parCase.reduce((a, b) => a + b, 0), objets.length, `${graine} : chaque touffe dans sa case`);
  }
});

test('didacticiel : des jauges à l\'arrosage, chaque étape débloque ce qu\'il faut, l\'Atelier se construit en le posant', () => {
  const s = garden();
  tireless(s);
  testFarmMap(s, 'didacticiel');
  setInv(s, {});
  s.eauMl = 0;   // (une nouvelle partie : pas de citerne)
  commencerDidacticiel(s);
  const R = DATA.ATELIER.RECETTES;
  assertEqual([etapeDidacticiel(s), [...recettesDidacticiel(s)], [...blocsDidacticiel(s)]], ['sante', [], []]);
  assertEqual(suivantDidacticiel(s, 'pierres').ok, false, 'pas l\'étape en cours');
  for (let k = 0; k < 7; k++) assert(suivantDidacticiel(s).ok);
  assertEqual([etapeDidacticiel(s), objectifDidacticiel(s).compteurs], ['pierres', [{ objet: 'pierre', n: 0, besoin: DATA.ATELIER.CONSTRUCTION.pierre }]]);
  assertEqual(suivantDidacticiel(s).ok, false, 'une étape à objectif ne se passe pas');
  setInv(s, { pierre: 3 });
  assert(majDidacticiel(s));
  assertEqual(etapeDidacticiel(s), 'bois');
  setInv(s, { pierre: 3, bois: 3 });
  majDidacticiel(s);
  assertEqual([etapeDidacticiel(s), [...blocsDidacticiel(s)]], ['atelier', ['atelier']]);
  // l'Atelier : posé, il se construit (ses matériaux quittent l'inventaire)
  const N = planAbri(s).paillasses, z = terrainLibre(s, N + 6, 8);
  assert(poserBloc(s, 'atelier', z.r * z.W + z.c + N + 4).ok);
  assertEqual([atelierConstruit(s), countItem(s, 'pierre'), countItem(s, 'bois')], [true, 0, 0]);
  majDidacticiel(s);
  assertEqual(etapeDidacticiel(s), 'atelier_ouvrir');
  assert(suivantDidacticiel(s, 'atelier_ouvrir').ok);
  assertEqual([etapeDidacticiel(s), [...recettesDidacticiel(s)]], ['faux', ['faux']]);
  setInv(s, R.faux.entrees);
  assert(craft(s, 'faux').ok);
  majDidacticiel(s);
  const fibres = 2 + R.paillasse.entrees.fibre * N;
  assertEqual([etapeDidacticiel(s), objectifDidacticiel(s).compteurs], ['fibres', [{ objet: 'fibre', n: 0, besoin: fibres }]]);
  setInv(s, { fibre: fibres, bois: 4, pierre: 5 });
  majDidacticiel(s);
  assertEqual(etapeDidacticiel(s), 'outils', 'les fibres, puis la hache et la pioche');
  assert(craft(s, 'hache').ok && craft(s, 'pioche').ok);
  majDidacticiel(s);
  const p = planAbri(s);
  assertEqual([etapeDidacticiel(s), p], ['abri_ressources', { murs: 2 * N + 5, porte: 1, paillasses: N }]);
  const RC = DATA.ATELIER.RECETTES, bois = p.murs * RC.mur_bois.entrees.bois + 6, fib = RC.paillasse.entrees.fibre * N;
  assertEqual(objectifDidacticiel(s).compteurs, [{ objet: 'bois', n: 0, besoin: bois }, { objet: 'fibre', n: fib, besoin: fib }]);
  setInv(s, { bois, fibre: fib });
  majDidacticiel(s);
  // (une étape à lire : un arbre abattu ne repousse pas, il faut planter sa graine)
  assertEqual(etapeDidacticiel(s), 'arbres');
  assert(suivantDidacticiel(s, 'arbres').ok);
  assertEqual([etapeDidacticiel(s), recettesDidacticiel(s).has('mur_bois')], ['abri_fabriquer', true]);
  for (let k = 0; k < p.murs; k++) assert(craft(s, 'mur_bois').ok);
  for (let k = 0; k < 3; k++) assert(craft(s, 'planche').ok);
  assert(craft(s, 'porte').ok);
  for (let k = 0; k < N; k++) assert(craft(s, 'paillasse').ok);
  majDidacticiel(s);
  assertEqual([etapeDidacticiel(s), [...blocsDidacticiel(s)].sort()], ['abri_construire', ['atelier', 'mur_bois', 'porte']]);
  // l'abri : une rangée de N cases entourée de murs, la porte au milieu du bas
  const m = murs(z, N + 2, 3);
  // (la porte se pose directement sur sa case)
  assert(poserBloc(s, 'porte', m.porte).ok);
  for (const t of m.murs) { const q = poserBloc(s, 'mur_bois', t); assert(q.ok, `mur ${t} : ${q.error}`); }
  majDidacticiel(s);
  assertEqual(etapeDidacticiel(s), 'paillasses');
  for (let k = 0; k < N; k++) assert(poserBloc(s, 'paillasse', (z.r + 1) * z.W + z.c + 1 + k).ok);
  majDidacticiel(s);
  assertEqual([etapeDidacticiel(s), houseRepaired(s)], ['houe', true]);
  setInv(s, R.houe.entrees);
  assert(craft(s, 'houe').ok);
  majDidacticiel(s);
  assertEqual([etapeDidacticiel(s), countItem(s, 'graine_carotte')], ['graines', DATA.DIDACTICIEL.GRAINES.graine_carotte], 'les graines offertes');
  assert(suivantDidacticiel(s).ok);
  const libres = hoeableTiles(s).slice(0, DATA.DIDACTICIEL.LABOURS);
  for (const t of libres) assert(hoe(s, t).ok);
  majDidacticiel(s);
  assertEqual(etapeDidacticiel(s), 'semis');
  assert(plant(s, s.potager.parcelles[0].id, 'carotte').ok);
  majDidacticiel(s);
  assertEqual([etapeDidacticiel(s), [...blocsDidacticiel(s)].includes('puits')], ['puits', true]);
  assertEqual(water(s, s.potager.parcelles[0].id).ok, false, 'ni citerne ni cruche');
  setInv(s, { pierre: 8, planche: 2, bois: 3 });
  assert(craft(s, 'puits_pierre').ok && craft(s, 'cruche').ok);
  assertEqual(remplirCruche(s).ok, false, 'pas de puits posé');
  assert(poserBloc(s, 'puits', z.r * z.W + z.c + N + 4 + 2).ok);
  majDidacticiel(s);
  assertEqual(etapeDidacticiel(s), 'arroser');
  assertEqual(water(s, s.potager.parcelles[0].id).error, 'La cruche est vide : remplis-la au puits (touche-le).');
  assert(remplirCruche(s).ok);
  assertEqual(eauCruche(s), DATA.CRUCHE.LITRES * 1000);
  const r = water(s, s.potager.parcelles[0].id);
  assert(r.ok);
  assertEqual(eauCruche(s), (DATA.CRUCHE.LITRES - r.litres) * 1000, 'l\'eau vient de la cruche');
  majDidacticiel(s);
  assertEqual(etapeDidacticiel(s), 'fin');
  assert(suivantDidacticiel(s).ok);
  assertEqual([etapeDidacticiel(s), recettesDidacticiel(s), blocsDidacticiel(s)], [null, null, null], 'fini : tout est débloqué');
});

test('migration v48 → v49 : l\'étape « arbres » s\'ajoute au didacticiel, une partie plus loin avance d\'un cran', () => {
  const vieille = (etape) => ({ ...createInitialState(3), version: 48, didacticiel: { etape, fini: false } });
  const i = ETAPES.indexOf('arbres');
  assertEqual(ETAPES.slice(i - 1, i + 2), ['abri_ressources', 'arbres', 'abri_fabriquer']);
  assertEqual(migrate({ v: 48, t: 0, s: vieille(i - 1) }).didacticiel.etape, i - 1, 'avant : la même étape');
  assertEqual(ETAPES[migrate({ v: 48, t: 0, s: vieille(i) }).didacticiel.etape], 'abri_fabriquer', 'l\'ancienne étape d\'après garde son nom');
  assertEqual(migrate({ v: 48, t: 0, s: { ...vieille(20), didacticiel: { etape: 20, fini: true } } }).didacticiel.etape, 20, 'fini : rien ne change');
});

test('didacticiel : passé, tout est débloqué et les graines sont offertes ; une ancienne partie n\'en a pas', () => {
  const s = garden();
  testFarmMap(s, 'didacticiel2');
  setInv(s, {});
  commencerDidacticiel(s);
  assert(passerDidacticiel(s).ok);
  assertEqual([etapeDidacticiel(s), recettesDidacticiel(s), countItem(s, 'graine_carotte')], [null, null, DATA.DIDACTICIEL.GRAINES.graine_carotte]);
  const t = garden();
  testFarmMap(t, 'didacticiel3');
  assertEqual([etapeDidacticiel(t), blocsDidacticiel(t)], [null, null]);
});

test('ferme générée : le Marché ouvre au niveau 3 ; le panneau, la pompe, la citerne et la batterie arrivent au niveau 7', () => {
  assertEqual([unlockLevel('marche'), unlockLevel('energie')], [3, 7]);
  const s = chantier('m1');
  s.pieces = 1000;
  testSetLevel(s, 2);
  for (const t of ['panneau', 'pompe', 'reservoir', 'batterie']) removeStarter(s, t);   // (une partie neuve)
  // avant le niveau 3 : le Marché est fermé, sans panneau ni pompe ou avec
  assertEqual(marcheOuvert(s), false);
  assertEqual(buyItem(s, 'graine_carotte', 1).error, 'Le Marché ouvre au niveau 3.');
  assertEqual(sellItem(s, 'conserve', 1).ok, false);
  assertEqual(buyHoe(s).ok, false);
  // au niveau 3 : il ouvre, sans panneau ni pompe
  s.progression.niveau = 3;
  assert(marcheOuvert(s) && !farmOpen(s));
  assert(buyItem(s, 'graine_carotte', 1).ok);
  // les appareils : ni leur recette ni leur bloc avant le niveau 7
  setInv(s, { mur_pierre: 30, porte: 2, paillasse: 2, lingot_fer: 20, lingot_cuivre: 20, planche: 20, panneau_solaire: 1 });
  for (const id of ['pompe', 'panneau_solaire', 'citerne', 'batterie']) assertEqual(craftStatus(s, id).raison, 'Se débloque au niveau 7.', id);
  const z = terrainLibre(s, 7, 8), p = murs(z, 5, 5);
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, p.porte);
  poserBloc(s, 'paillasse', p.dedans);
  const dehors = (z.r + 7) * z.W + z.c;
  assertEqual(poserBloc(s, 'panneau', dehors).error, 'Panneau solaire : se pose à partir du niveau 7.');
  s.progression.niveau = 7;
  assert(craftStatus(s, 'pompe').ok);
  assert(poserBloc(s, 'panneau', dehors).ok);
});

test('terre sauvage : une nouvelle partie commence avec 300 pièces', () => {
  const s = createNewGame(1, { nom: 'Essai' });
  setFarmSeed(s, '5');
  commencerDidacticiel(s);
  assertEqual(s.pieces, 300);
  assertEqual(DATA.DEPART.PIECES_SAUVAGE, 300);
});

test('ferme générée : 32 buissons portent des baies chaque matin, 3 sur un petit, 5 sur un grand ; hache et pioche à 3 d\'énergie', () => {
  assertEqual([DATA.PERSONNAGE.COUTS.couper, DATA.PERSONNAGE.COUTS.piocher], [3, 3]);
  const s = chantier('b1');
  const baies = ramassables(s).filter((p) => p.sorte === 'baies');
  assertEqual(baies.length, Math.min(DATA.ATELIER.RAMASSAGE.baies.nombre, farmTerrain(s).BUISSONS.length));
  for (const taille of ['petit', 'grand']) {
    const p = baies.find((q) => q.taille === taille);
    if (!p) continue;
    const avant = countItem(s, 'baies');
    assert(ramasser(s, p.id).ok);
    assertEqual(countItem(s, 'baies') - avant, taille === 'grand' ? 5 : 3, taille);
  }
});

test('ferme générée : sans paillasse dans une pièce close, on ne dort pas (ni au bouton, ni au retour sur le jeu, ni en sautant la nuit)', () => {
  const s = chantier('z1');
  s.energie = 5000;
  s.nuitEnCours = { ms: 0, minuit: false };
  const r = goToSleep(s);
  assertEqual([r.ok, asleep(s)], [false, false]);
  assert(/paillasse/.test(r.error));
  // le jeu revient d'une absence en pleine nuit : il ne s'est pas endormi, l'énergie n'est pas revenue
  s.nuitEnCours = { ms: 0, minuit: false };
  simulateOffline(s, 60);
  assertEqual(asleep(s), false);
  s.nuitEnCours = { ms: 0, minuit: false };
  skipNight(s);
  assertEqual(s.energie <= 5000, true, 'sans paillasse : rien ne revient');
  // avec un abri et une paillasse : il dort
  const z = terrainLibre(s, 7, 8), p = murs(z, 5, 5);
  setInv(s, { mur_pierre: 30, porte: 2, paillasse: 2 });
  for (const t of p.murs) poserBloc(s, 'mur_pierre', t);
  poserPorte(s, p.porte);
  assert(poserBloc(s, 'paillasse', p.dedans).ok);
  s.nuitEnCours = { ms: 0, minuit: false };
  assertEqual([goToSleep(s).ok, asleep(s)], [true, true]);
});

test('didacticiel : les cases de l\'abri s\'allument, à la taille de la famille ; posées, elles forment l\'abri', () => {
  for (const n of [1, 6]) {
    const s = chantier('abri' + n);
    commencerDidacticiel(s);
    s.famille.membres = s.famille.membres.slice(0, 1);
    while (s.famille.membres.length < n) s.famille.membres.push({ ...s.famille.membres[0], id: 'm' + s.famille.membres.length });
    const p = planAbriCases(s);
    assert(p, 'un emplacement');
    assertEqual([p.murs.length, p.dedans.length], [planAbri(s).murs, n], 'murs et paillasses selon la famille');
    assertEqual(planAbriCases(s), p, 'le même emplacement, gardé');
    assertEqual(casesAbriAPoser(s, 'abri_construire').length, p.murs.length + 1);
    setInv(s, { mur_bois: p.murs.length, porte: 1, paillasse: n });
    for (const t of p.murs) assert(poserBloc(s, 'mur_bois', t).ok, 'un mur sur sa case allumée');
    assertEqual(casesAbriAPoser(s, 'abri_construire').map((c) => c.sorte), ['porte'], 'il reste la porte');
    // la porte se pose sur un mur : un mur d'abord, puis la porte à sa place
    setInv(s, { mur_bois: 1, porte: 1, paillasse: n });
    assert(poserBloc(s, 'mur_bois', p.porte).ok);
    assert(poserBloc(s, 'porte', p.porte).ok);
    assertEqual([casesAbriAPoser(s, 'abri_construire'), piecesCloses(s).length], [[], 1], 'l\'abri est clos');
    assertEqual(casesAbriAPoser(s, 'paillasses').length, n);
    for (const t of p.dedans) assert(poserBloc(s, 'paillasse', t).ok);
    assertEqual([casesAbriAPoser(s, 'paillasses'), couchages(s).length], [[], n]);
  }
});
