/* ==========================================================================
   Tests du chantier « l'île à bâtir » : les objectifs sans récit, les paliers de l'île (docs/ile.md,
   fiche I7a ; js/engine/paliers.js, data/village.json VILLAGE.PALIERS). Comme tous les fichiers
   tests/engine/village-*.test.mjs, il tourne avec VILLAGE.ACTIF forcé à true (tests/engine/aide.mjs).
   Lancer seul : node --test tests/engine/village-paliers.test.mjs (ou node tests/run-tests.mjs village-paliers).

   Le port, les villageois, leurs tâches, les commerces et l'amitié avec eux n'existent pas encore (fiches
   I1a à I6a) : les objectifs qui les comptent sont posés en état fabriqué (les champs que ces fiches
   rempliront : paliers.js), les autres se font par les gestes du jeu.
   ========================================================================== */

import {
  addItem, bumpCounter, buyAnimal, carnetDuJour, chapterCount, chapterProgress, chapterReached, commencerObjectifs,
  completeChapter, compterObjectifIle, countItem, createNewGame, DATA, farmTerrain, feedAllHens, findPlot, harvest, hoe,
  listeDesChapitres, listeTiree, maxStage, migrate, OBJECTIFS_ILE, objectifsPossibles, objectiveValue, paliersSuivis,
  plant, semaineDe, shear, SI_OBJECTIFS, startRecipe, techPoints, testAddWheat, testBatir, testGoToChapter, testSetLevel,
  testWoolReady, updateChapters, water, zoneTile,
} from '../../js/engine/index.js';
import { allumerEssaiVillage } from '../../js/engine/village.js';
import {
  affamer, assert, assertEqual, atChapter, atelier, avecVillage, boite, fillSheep, ml, partie, pature, plantRipe, reach,
  runFor, setInv, sleepOnce, test, tireless,
} from './aide.mjs';

const P = () => DATA.VILLAGE.PALIERS;
const oks = (s) => chapterProgress(s).objectifs.map((o) => o.ok);
const okDe = (s, type) => chapterProgress(s).objectifs.filter((o) => o.type === type).every((o) => o.ok);

// Les types de campaign.js (objectiveValue) que les paliers reprennent.
const TYPES_REPRIS = ['maison', 'houe', 'labours', 'semis', 'arrosees', 'recoltes', 'niveau', 'cultures', 'silo', 'siloBle', 'objet', 'pontes', 'laines', 'pains', 'plats', 'styles'];
// Les types qui ne servent plus : la calèche, les hameaux, la confiance (et les amis, les projets, les achats des hameaux).
const TYPES_RETIRES = ['caleche', 'achatsHameaux', 'hameaux', 'amis', 'projets', 'confiance'];

// Les villageois fabriqués (la forme de state.villageois, fiche I3a ; la tâche, I3c).
function villageois(s, n, { taches = 0 } = {}) {
  s.villageois = Array.from({ length: n }, (_, i) => ({ id: `v${i + 1}`, prenom: `V${i + 1}`, maison: `maison${i + 1}`, tache: i < taches ? 'champs' : null }));
  return s;
}
// L'amitié fabriquée avec les `n` premiers villageois (state.amitie.pnj, amitie.js : I6a).
function amis(s, n, points) {
  for (let i = 0; i < n; i++) s.amitie.pnj[`v${i + 1}`] = { pts: points, gouts: {} };
  return s;
}

test('VILLAGE.PALIERS : sept paliers, comme les chapitres, sans texte d\'introduction', () => {
  assertEqual(P().length, DATA.CHAPITRES.liste.length, 'autant que de chapitres');
  assertEqual(P().length, 7);
  for (const [i, p] of P().entries()) {
    const nom = `palier ${i + 1}`;
    assert(typeof p.titre === 'string' && p.titre.length > 0 && p.titre.split(' ').length <= 6, `${nom} : un titre de quelques mots`);
    assert(typeof p.icone === 'string' && p.icone.length > 0, `${nom} : une icône`);
    assert(p.recompense && ((p.recompense.plans || []).length || Object.keys(p.recompense.objets || {}).length), `${nom} : une récompense`);
    for (const k of ['intro', 'introSauvage', 'etape']) assert(!(k in p), `${nom} : pas de ${k}`);
    assert(p.objectifs.length >= 3, `${nom} : des objectifs`);
    for (const o of p.objectifs) {
      assert([...TYPES_REPRIS, ...OBJECTIFS_ILE].includes(o.type), `${nom} : le type ${o.type} est connu`);
      assert(!TYPES_RETIRES.includes(o.type), `${nom} : le type ${o.type} n'est pas repris`);
      assert(Number.isInteger(o.cible) && o.cible > 0 && o.libelle, `${nom} : ${o.type}, une cible et un libellé`);
      if (o.type === 'objet') assert(DATA.OBJETS[o.item], `${nom} : l'objet ${o.item}`);
    }
    for (const id of Object.keys(p.recompense.objets || {})) assert(DATA.OBJETS[id] || DATA.ATELIER.BLOCS[id], `${nom} : l'objet ${id}`);
    for (const id of p.recompense.plans || []) assert(DATA.OBJETS[id] || DATA.ATELIER.BLOCS[id], `${nom} : le plan ${id}`);
  }
  // les types du chantier sont tous dans un palier
  for (const t of OBJECTIFS_ILE) assert(P().some((p) => p.objectifs.some((o) => o.type === t)), `le type ${t} sert`);
  // les plans et le décor des chapitres sont tous repris, au même rang
  DATA.CHAPITRES.liste.forEach((ch, i) => {
    assertEqual(P()[i].recompense.plans || [], (ch.recompense || {}).plans || [], `palier ${i + 1} : les plans du chapitre`);
    for (const [id, n] of Object.entries((ch.recompense || {}).objets || {})) assertEqual(P()[i].recompense.objets[id], n, `palier ${i + 1} : ${id}`);
  });
  // ce que le courrier offrait (les objets de ses lettres, hors souvenirs du récit) est dans un palier
  for (const l of Object.values(DATA.COURRIER)) {
    for (const id of Object.keys(l.cadeaux || {})) {
      if (DATA.OBJETS[id] && DATA.OBJETS[id].categorie === 'souvenir') continue;
      assert(P().some((p) => (p.recompense.objets || {})[id] > 0), `le cadeau ${id} du courrier`);
    }
  }
});

test('une partie neuve suit les paliers : state.palier, la forme de state.campagne.chapitre', () => {
  const s = createNewGame(5);
  assertEqual([s.palier, s.campagne.chapitre, paliersSuivis(s)], [1, 1, true]);
  assertEqual(chapterCount(s), 7);
  const p = chapterProgress(s);
  assertEqual([p.palier, p.titre, p.icone, p.intro], [true, P()[0].titre, P()[0].icone, '']);
  // éteint : pas de palier (la partie d'avant, au pixel près : reglage-village.test.mjs)
  const avant = avecVillage(() => createNewGame(5), false);
  assertEqual(['palier' in avant, paliersSuivis(avant)], [false, false]);
  // la partie d'essai (jeu.html?village=1) : allumée après coup, elle suit les paliers aussi
  const essai = avecVillage(() => allumerEssaiVillage(createNewGame(6)), false);
  assertEqual(essai.palier, 1);
  avecVillage(() => assertEqual([paliersSuivis(essai), chapterProgress(essai).titre], [true, P()[0].titre]), false);
  // une partie d'avant, rouverte le réglage allumé, garde ses chapitres (sa migration : fiche I7f)
  assertEqual([paliersSuivis(avant), chapterProgress(avant).titre], [false, DATA.CHAPITRES.liste[0].titre]);
  // rechargée, la partie garde son palier (pas de nouveau format : le champ n'existe que dans une partie neuve)
  const relue = migrate(JSON.parse(JSON.stringify(s)));
  assertEqual([relue.palier, paliersSuivis(relue)], [1, true]);
  const vieille = migrate(JSON.parse(JSON.stringify(avant)));
  assertEqual('palier' in vieille, false, 'la réparation n\'ajoute pas de palier à une partie d\'avant');
  assertEqual(allumerEssaiVillage(avant).palier, 1, '(une partie neuve rendue d\'essai, elle, les suit)');
});

test('chaque objectif du chantier se compte, et un champ absent compte 0', () => {
  const s = createNewGame(8);
  const n = (type, extra = {}) => compterObjectifIle(s, { type, cible: 1, ...extra });
  for (const t of OBJECTIFS_ILE) assertEqual(n(t, { palier: 2 }), 0, `${t} : rien encore`);
  assertEqual(compterObjectifIle(s, { type: 'recoltes' }), null, 'un type de campaign.js : pas ici');
  // ventesPort : state.campagne.compteurs.ventesPort (I1b)
  bumpCounter(s, 'ventesPort', 37);
  assertEqual([n('ventesPort'), objectiveValue(s, { type: 'ventesPort' })], [37, 37]);
  // portNiveau : state.port.niveau (I1c)
  s.port = { niveau: 3 };
  assertEqual(n('portNiveau'), 3);
  s.port = 'abîmé';
  assertEqual(n('portNiveau'), 0);
  s.port = { niveau: 'x' };
  assertEqual(n('portNiveau'), 0);
  // villageois installés : ceux de state.villageois qui ont une maison (I3a)
  villageois(s, 4, { taches: 2 });
  s.villageois.push(null, 'pas un villageois', { id: 'v9', maison: null });
  assertEqual(n('villageois'), 4);
  // tâches attribuées : v.tache (I3c)
  assertEqual(n('taches'), 2);
  s.villageois = 'abîmé';
  assertEqual([n('villageois'), n('taches')], [0, 0]);
  // commerces ouverts : state.commerces, tableau ou objet (I5a)
  s.commerces = [{ id: 'forge' }, { id: 'mercerie', ouvert: false }, null];
  assertEqual(n('commerces'), 1);
  s.commerces = { forge: { ouvert: true }, scierie: {} };
  assertEqual(n('commerces'), 2);
  // l'amitié avec les villageois : palierAmitie(state, v.id) (I6a), au palier demandé ou plus
  villageois(s, 3);
  amis(s, 1, 30); // cordial
  s.amitie.pnj.v2 = { pts: 50, gouts: {} }; // proche
  assertEqual([n('amitieVillageois', { palier: 2 }), n('amitieVillageois', { palier: 3 }), n('amitieVillageois', { palier: 4 })], [2, 1, 0]);
  delete s.amitie;
  assertEqual(n('amitieVillageois', { palier: 2 }), 0);
  assertEqual('amitie' in s, false, 'compter ne crée rien');
});

test('palier 1 « S\'installer » par les gestes : foyer, houe, labour, semis, arrosage, première récolte', () => {
  const s = createNewGame(1, { nom: 'Martin' });
  assertEqual([s.palier, oks(s)], [1, [false, false, false, false, false, false]]);
  assert(testBatir(s, 'foyer').ok);
  s.potager.houe = true; // (fabriquée à l'Atelier)
  tireless(s);
  testSetLevel(s, 1);
  const T = farmTerrain(s);
  for (let c = 0, n = 0; n < 6; c++) if (hoe(s, zoneTile(1, c, T)).ok) n += 1;
  addItem(s, 'graine_carotte', 6);
  const ids = s.potager.parcelles.map((p) => p.id);
  for (const id of ids) assert(plant(s, id, 'carotte').ok, `semis ${id}`);
  s.eauMl = ml(1000);
  for (const id of ids) assert(water(s, id).ok, `arrosage ${id}`);
  assertEqual(oks(s), [true, true, true, true, true, false]);
  updateChapters(s);
  assertEqual(s.palier, 1, 'il manque la récolte');
  findPlot(s, ids[0]).stade = maxStage(findPlot(s, ids[0]));
  assert(harvest(s, ids[0]).ok);
  const pt = techPoints(s).gagnes, xp = s.progression.xp;
  updateChapters(s);
  assertEqual([s.palier, s.campagne.chapitre, chapterReached(s)], [2, 2, 2], 'le palier 2 s\'ouvre');
  assertEqual(s.campagne.annonces.map((a) => a.chapitre), [1], 'l\'annonce (la notification)');
  assertEqual(techPoints(s).gagnes - pt, DATA.ARBRE.POINTS.CHAPITRES[0], 'les points de technologie du chapitre 1');
  assert(s.progression.xp >= xp + DATA.NIVEAUX.CHAPITRES_XP[0], 'l\'XP du chapitre 1');
  assertEqual(countItem(s, 'bac_carre'), 2, 'la récompense');
  assertEqual(s.courrier, [], 'pas de courrier');
});

test('palier 2 « La première vente au port » : niveau, quatre cultures, le Silo ; la vente au port (fabriquée)', () => {
  const s = atChapter(2);
  assertEqual([s.palier, chapterProgress(s).titre], [2, P()[1].titre]);
  tireless(s);
  testSetLevel(s, 3);
  for (const g of ['graine_carotte', 'graine_tomate', 'graine_courgette']) addItem(s, g, 1);
  addItem(s, 'patate', 1);
  ['carotte', 'patate', 'tomate', 'courgette'].forEach((c, i) => { plantRipe(s, `potager-${i + 1}`, c); assert(harvest(s, `potager-${i + 1}`).ok, c); });
  assert(testBatir(reach(s, 'silo'), 'silo').ok);
  updateChapters(s);
  assertEqual([s.palier, oks(s)], [2, [true, true, true, false]], 'il manque la vente au port');
  bumpCounter(s, 'ventesPort', 50); // (fiche I1b : vendreAuPort)
  updateChapters(s);
  assertEqual(s.palier, 3);
});

test('palier 3 « Le premier villageois » : 50 blés au Silo, le minerai ; le villageois (fabriqué)', () => {
  const s = atChapter(3);
  assert(testBatir(reach(s, 'silo'), 'silo').ok);
  testAddWheat(s, 50);
  addItem(s, 'minerai_fer', 4);
  updateChapters(s);
  assertEqual([s.palier, okDe(s, 'villageois')], [3, false]);
  villageois(s, 1); // (fiche I3a)
  updateChapters(s);
  assertEqual(s.palier, 4);
});

test('palier 4 « Les bêtes » : sept nuits de ponte, dix laines ; le port agrandi (fabriqué)', () => {
  // les pontes, nuit après nuit
  const s = boite(atChapter(4), { carotte: 200 });
  setInv(s, {});
  s.pieces = 5000;
  assert(testBatir(reach(s, 'silo'), 'silo').ok);
  assert(testBatir(reach(s, 'poulailler'), 'poulailler').ok);
  for (let i = 0; i < 4; i++) assert(buyAnimal(s, 'poule').ok);
  testAddWheat(s, 50);
  for (let nuit = 1; nuit <= 7; nuit++) {
    assert(feedAllHens(s).ok);
    affamer(s);
    sleepOnce(s);
  }
  assertEqual([s.campagne.compteurs.serieOeufs, okDe(s, 'pontes'), s.palier], [7, true, 4]);
  // les laines, tondues (une autre ferme : l'Étable)
  const t = pature();
  testGoToChapter(t, 4);
  fillSheep(t, 5);
  for (let tour = 0; tour < 2; tour++) {
    testWoolReady(t);
    for (const m of t.paturage.moutons) assert(shear(t, m.id).ok);
  }
  assertEqual([t.campagne.compteurs.laines, okDe(t, 'laines')], [10, true]);
  // le port au niveau 2 (fiche I1c) : le palier est franchi
  s.campagne.compteurs.laines = 10;
  s.port = { niveau: 2 };
  updateChapters(s);
  assertEqual(s.palier, 5);
});

test('palier 5 « Trois villageois au travail » : cinq pains, trois plats ; les villageois et leurs tâches (fabriqués)', () => {
  const s = atelier();
  testGoToChapter(s, 5);
  for (let i = 0; i < 5; i++) {
    addItem(s, 'farine', 2);
    s.eauMl = ml(40);
    assert(startRecipe(s, 'pain').ok);
    runFor(s, 25);
  }
  const plats = [['omelette', { oeuf: 3, huile: 1 }, 20], ['gratin_patates', { patate: 3, oeuf: 1 }, 35], ['ratatouille', { tomate: 1, courgette: 1, aubergine: 1, huile: 1 }, 35]];
  for (const [id, ing, secs] of plats) {
    for (const [item, n] of Object.entries(ing)) addItem(s, item, n);
    assert(startRecipe(s, id).ok, id);
    runFor(s, secs);
  }
  assertEqual([s.campagne.compteurs.pains, s.campagne.compteurs.plats.length, s.palier], [5, 3, 5]);
  villageois(s, 3, { taches: 2 });
  updateChapters(s);
  assertEqual([s.palier, okDe(s, 'taches')], [5, false], 'deux tâches sur trois');
  s.villageois[2].tache = 'bois'; // (fiche I3c)
  updateChapters(s);
  assertEqual(s.palier, 6);
});

test('palier 6 « Le premier commerce » : un lingot fondu ; le commerce, l\'ami, le port (fabriqués)', () => {
  const s = atelier();
  testGoToChapter(s, 6);
  addItem(s, 'minerai_fer', 4);
  addItem(s, 'bois', 3);
  assert(startRecipe(s, 'lingot_fer').ok, 'fondre un lingot de fer');
  runFor(s, 25);
  assertEqual([countItem(s, 'lingot_fer'), okDe(s, 'objet'), s.palier], [1, true, 6]);
  villageois(s, 1);
  amis(s, 1, DATA.RECIT.PALIERS[2]);
  s.commerces = [{ id: 'forge' }]; // (fiche I5a)
  s.port = { niveau: 3 };
  const avant = countItem(s, 'cacao');
  updateChapters(s);
  assertEqual(s.palier, 7);
  assertEqual(countItem(s, 'cacao') - avant, 1, 'les graines de la serre, que le courrier offrait');
});

test('palier 7 « Un village de dix » : trois styles mêlés ; dix villageois, deux commerces, trois proches (fabriqués) : le jeu libre', () => {
  const s = atChapter(7);
  s.sols = { 3: 'plancher', 4: 'sol_chevrons', 5: 'sol_carrelage', 6: 'sol_mosaique' };
  assertEqual(okDe(s, 'styles'), true, 'trois styles mêlés');
  villageois(s, 10);
  amis(s, 3, DATA.RECIT.PALIERS[3]);
  s.commerces = { forge: {}, mercerie: {} };
  updateChapters(s);
  assertEqual([s.campagne.fini, s.palier, chapterReached(s)], [true, 7, 8]);
  assertEqual(completeChapter(s).ok, false, 'fini, rien ne se recompte');
});

test('les points de technologie, l\'XP et les plans tombent comme avec les chapitres', () => {
  const finir = (s) => { for (let i = 0; i < 7; i++) assert(completeChapter(s).ok, `palier ${i + 1}`); return s; };
  const ile = finir(partie(4));
  const chap = avecVillage(() => finir(partie(4)), false);
  assertEqual([paliersSuivis(ile), paliersSuivis(chap)], [true, false]);
  assertEqual(techPoints(ile).gagnes, techPoints(chap).gagnes, 'les points de technologie');
  assertEqual(ile.progression.xp, chap.progression.xp, 'l\'XP');
  assertEqual(Object.keys(ile.plans.connus).sort(), Object.keys(chap.plans.connus).sort(), 'les plans');
  assertEqual(ile.campagne.annonces.map((a) => a.recompense.plans), chap.campagne.annonces.map((a) => a.recompense.plans), 'les plans, palier par palier');
  assertEqual([ile.campagne.fini, chapterReached(ile)], [true, 8]);
});

test('aucun texte des chapitres ni du courrier n\'est lu avec ACTIF', () => {
  const lus = [];
  const L = DATA.CHAPITRES.liste;
  const avant = L.map((ch) => ({ ...ch }));
  L.forEach((ch, i) => {
    for (const k of ['intro', 'introSauvage', 'etape']) {
      if (!(k in ch)) continue;
      Object.defineProperty(ch, k, { configurable: true, enumerable: true, get: () => { lus.push(`${i + 1}.${k}`); return ''; } });
    }
  });
  try {
    const s = createNewGame(2, { nom: 'Martin' });
    for (let n = 1; n <= 8; n++) {
      chapterProgress(s);
      updateChapters(s);
      if (n <= 7) completeChapter(s);
    }
    assertEqual(s.campagne.fini, true);
    testGoToChapter(s, 3);
    chapterProgress(s);
    assertEqual(lus, [], 'aucune intro lue');
    assertEqual(s.courrier, [], 'aucune lettre, aucune carte postale');
    // (éteint, la même partie lit ses chapitres et reçoit ses lettres)
    const t = avecVillage(() => { const x = createNewGame(2, { nom: 'Martin' }); updateChapters(x); chapterProgress(x); return x; }, false);
    assert(lus.length > 0 && t.courrier.length > 0, 'éteint : les chapitres et le courrier d\'avant');
  } finally {
    L.forEach((ch, i) => { for (const k of ['intro', 'introSauvage', 'etape']) if (k in avant[i]) Object.defineProperty(ch, k, { configurable: true, enumerable: true, writable: true, value: avant[i][k] }); });
  }
});

test('les objectifs du jour : la semaine du nouveau départ, sans phrase d\'ambiance ; le port et le village tirés', () => {
  const S = DATA.VILLAGE.OBJECTIFS.SEMAINE;
  const s = createNewGame(3, { nom: 'Martin' });
  assertEqual(semaineDe(s), S);
  assertEqual(avecVillage(() => semaineDe(createNewGame(3)), false), DATA.OBJECTIFS.SEMAINE, 'éteint : la semaine d\'avant');
  for (const J of S) {
    assert(!J.intro, `${J.titre} : pas d'intro`);
    for (const b of J.objectifs) for (const t of b.taches) assert(!['caleche', 'hameau', 'boussole_hameau', 'parler'].includes(t.quoi), `${J.titre} : ${t.quoi}`);
  }
  commencerObjectifs(s);
  const c = carnetDuJour(s);
  assertEqual([c.titre, c.intro], [S[0].titre, '']);
  // les objectifs tirés : la vente au port, et ce qui demande un villageois ou une commande du bac
  const L = listeTiree(s);
  for (const d of DATA.VILLAGE.OBJECTIFS.TIRES.LISTE) {
    assert(L.includes(d), `${d.id} : dans la liste`);
    assert(!d.si || SI_OBJECTIFS.includes(d.si), `${d.id} : si ${d.si}`);
  }
  assertEqual(L.filter((d) => d.id === 'vendre').map((d) => d.libelle), ['Gagner {n} pièce{s} au port'], 'la vente : au port, une fois');
  assertEqual(avecVillage(() => listeTiree(createNewGame(3)), false), DATA.OBJECTIFS.TIRES.LISTE, 'éteint : la liste d\'avant');
  const ids = () => objectifsPossibles(s).map((d) => d.id);
  assert(!ids().includes('parler') && !ids().includes('cadeau') && !ids().includes('commande'), 'sans villageois ni bac');
  villageois(s, 1);
  s.port = { niveau: 1, commandes: [{ item: 'carotte', n: 5 }] };
  assert(ids().includes('parler') && ids().includes('cadeau') && ids().includes('commande'), 'avec un villageois et une commande du bac');
  // (la semaine du chantier n'a que des états connus du moteur)
  assertEqual(listeDesChapitres(s), P());
  assertEqual(countItem(s, 'graine_carotte') >= S[0].offre.graine_carotte, true, 'les graines du premier potager');
});
