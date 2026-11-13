/* ==========================================================================
   Tests du chantier « l'île à bâtir » : les tâches attribuées (docs/ile.md, fiche I3c ; js/engine/taches.js).
   Comme tous les fichiers tests/engine/village-*.test.mjs, il tourne avec VILLAGE.ACTIF forcé à true.
   - chaque tâche produit ce que dit TACHES (ses ACTIONS, par les fonctions du joueur), dans les bornes du monde
     (l'arbre tombe et repousse, le quota de pêche du jour est celui du joueur) ; sans énergie, XP ni objectif du jour
     du joueur ;
   - sans outil, rien (la tâche attend et le dit) ; en repos, rien ; donner et reprendre un outil ;
   - les automatisations : pas de double récolte avec le robot, pas de double arrosage ;
   - la journée : les créneaux de travail, la pause, les repas ; deux camarades côte à côte, la même clé ;
   - le travail au fil de la journée, à l'heure, puis la nuit finit le reste ; le journal du villageois ;
   - la sauvegarde : v88 → v89 ; les commandes ; le joueur automatique loge un villageois et lui confie une tâche ;
   - éteint, rien.
   Lancer seul : node tests/run-tests.mjs village-taches.
   ========================================================================== */

import {
  actionsDues, addItem, arriverVillageois, attribuer, avancerTaches, botVillageois, chopsLeft, clockHours, countItem, createNewGame,
  DATA, donnerOutil, executerCommande, farmSeed, farmTerrain, fishLeft, harvestAll, isMature, journeeDuVillage, listeTaches, migrate,
  maxStage, paroleVillageois, portDuMonde, postesDe, quiFaitQuoi, reprendreOutil, runNight, STATE_VERSION, tacheAttente, tacheDef,
  tacheManque, tachesDuPoste, tachesNuit, tachesPour, testBatir, testMaisonVillageois, tick, treeGone, villageoisDe, waterPlot,
} from '../../js/engine/index.js';
import { assert, assertEqual, avecVillage, boite, partie, test } from './aide.mjs';

const copie = (o) => JSON.parse(JSON.stringify(o));
const TA = DATA.TACHES;

// La partie de test : le foyer, le port, `n` maisons de villageois et leurs villageois, la boîte pleine ; tous les
// outils au joueur.
function ile(n = 1, seed = 1) {
  const s = partie(seed);
  portDuMonde(farmSeed(s));
  boite(s, { pain: 60 });
  for (let k = 0; k < n; k++) assert(testMaisonVillageois(s).ok, 'la maison');
  const V = [];
  for (let k = 0; k < n; k++) {
    const r = arriverVillageois(s, { direct: true });
    assert(r.ok, 'il arrive');
    V.push(r.villageois);
  }
  s.outils = { hache: true, pioche: true, faux: true, canne: true, choisi: 'hache' };
  return { s, V };
}

// Ce que le joueur a de son côté (l'énergie, l'XP, les objectifs du jour), pour vérifier que rien ne bouge.
const cote = (s) => JSON.stringify([s.energie, s.progression, s.objectifs && s.objectifs.faits]);

// Toutes les actions du jour d'un coup (la nuit les finit : tachesNuit), sans passer la nuit.
function journee(s) {
  return tachesNuit(s);
}

/* ---------- les tâches ---------- */

test('TACHES : chaque tâche a ses ACTIONS, un nom, son lieu, son geste ; les outils sont ceux de l\'Atelier', () => {
  assert(listeTaches().length >= 10, 'au moins dix tâches');
  for (const id of ['champs', 'betes', 'verger', 'bois', 'pierre', 'peche', 'cueillette', 'fauchage', 'cuisine', 'navette']) {
    const d = tacheDef(id);
    assert(d && d.ACTIONS > 0 && d.nom && d.lieu && d.geste && d.SANS && d.PHRASES.length, id);
    if (d.outil) assert(['hache', 'pioche', 'faux', 'canne'].includes(d.outil), `${id} : un outil de l'Atelier`);
  }
});

test('le bois : ACTIONS coups de hache, par chopTree ; l\'arbre tombe au COUPES-ième et repousse ; rien pour le joueur', () => {
  const { s, V: [v] } = ile();
  assert(donnerOutil(s, v.id, 'hache').ok && attribuer(s, v.id, 'bois').ok, 'la hache et la tâche');
  assertEqual(tacheAttente(s, v), null, 'rien ne manque');
  const avant = countItem(s, 'bois'), moi = cote(s);
  const r = journee(s)[v.id];
  assertEqual(r.actions, tacheDef('bois').ACTIONS, 'ACTIONS coups');
  const H = DATA.HACHE, tombes = Math.floor(r.actions / H.COUPES);
  assertEqual(countItem(s, 'bois') - avant, r.actions * H.BOIS + tombes * H.CHUTE, 'le bois des coups et des arbres tombés');
  assertEqual(r.produit.bois, countItem(s, 'bois') - avant, 'son produit : ce qui est entré au coffre');
  const abattus = Object.keys(s.outils.arbres || {}).filter((id) => treeGone(s, id));
  assertEqual(abattus.length, tombes, 'les arbres abattus');
  for (const id of abattus) assert(s.outils.arbres[id].retour > s.day || s.outils.arbres[id].espece, 'il repousse (ou laisse sa graine), comme ceux du joueur');
  assertEqual(cote(s), moi, 'ni énergie, ni XP, ni objectif du jour pour le joueur');
  assertEqual(s.outils.hache, false, 'la hache est chez lui');
});

test('la pierre, le fauchage, la cueillette : les fonctions du joueur (mineRock, scytheGrass, ramasser)', () => {
  const { s, V: [a, b, c] } = ile(3);
  donnerOutil(s, a.id, 'pioche'); attribuer(s, a.id, 'pierre');
  donnerOutil(s, b.id, 'faux'); attribuer(s, b.id, 'fauchage');
  attribuer(s, c.id, 'cueillette');
  const avant = { pierre: countItem(s, 'pierre'), fibre: countItem(s, 'fibre') };
  const r = journee(s);
  assertEqual(r[a.id].actions, tacheDef('pierre').ACTIONS, 'la pierre : ACTIONS coups');
  assert(countItem(s, 'pierre') - avant.pierre >= r[a.id].actions * DATA.PIOCHE.PIERRE, 'la pierre au coffre');
  assertEqual(r[b.id].actions, tacheDef('fauchage').ACTIONS, 'le fauchage : ACTIONS touffes');
  assertEqual(countItem(s, 'fibre') - avant.fibre, r[b.id].actions * DATA.FAUX.FIBRE, 'la fibre');
  assertEqual(Object.keys(s.outils.herbes).length, r[b.id].actions, 'les touffes fauchées (elles repoussent)');
  assert(r[c.id].actions > 0 && r[c.id].actions <= tacheDef('cueillette').ACTIONS, 'la cueillette : ce que la ferme offre');
  assertEqual(s.cueillette.pris.length, r[c.id].actions, 'pris comme par le joueur : plus à ramasser');
});

test('la pêche : le quota du jour est celui du joueur', () => {
  const { s, V: [v] } = ile();
  donnerOutil(s, v.id, 'canne'); attribuer(s, v.id, 'peche');
  assertEqual(tacheAttente(s, v), null, 'la ferme a son étang');
  const eau = ['etang', 'mare'].find((e) => fishLeft(s, e) > 0);
  const quota = fishLeft(s, 'etang') + fishLeft(s, 'mare');
  const r = journee(s)[v.id];
  assert(r.actions > 0, 'il pêche');
  const prises = Object.values(r.produit).reduce((t, n) => t + n, 0);
  assertEqual(fishLeft(s, 'etang') + fishLeft(s, 'mare'), quota - prises, 'chaque prise compte dans le quota du jour');
  assert(eau, 'une eau');
});

test('les champs : récolter ce qui est mûr, arroser ce qui a soif, ressemer ; pas deux fois ce que le robot a pris', () => {
  const { s, V: [v] } = ile();
  attribuer(s, v.id, 'champs');
  s.eauMl = 400000;
  addItem(s, 'graine_carotte', 10);
  const P = s.potager.parcelles;
  for (const p of P.slice(0, 3)) { p.culture = 'carotte'; p.stade = maxStage(p); }
  for (const p of P.slice(3, 5)) { p.culture = 'carotte'; p.stade = 0; p.arrose = false; }
  // (le robot, une automatisation, passe d'abord sur la première : elle n'est plus mûre)
  const p0 = P[0];
  const avant = countItem(s, 'carotte');
  assert(harvestAll(s, 'potager').ok || !isMature(p0), 'récolte tout');
  const recolte = countItem(s, 'carotte') - avant;
  for (const p of P.slice(0, 3)) assert(!isMature(p), 'plus rien de mûr');
  // (puis il passe : rien à récolter, il arrose et ressème)
  const moi = cote(s);
  const r = journee(s)[v.id];
  assertEqual(countItem(s, 'carotte') - avant, recolte, 'pas de double récolte');
  assert(P.slice(3, 5).every((p) => p.arrose), 'il arrose ce qui a soif');
  assertEqual(cote(s), moi, 'rien pour le joueur');
  assert(r.actions >= 2, 'ses actions');
  // (une parcelle déjà arrosée (l'asperseur, l'averse) : il ne l'arrose pas deux fois)
  const p5 = P[5];
  p5.culture = 'carotte'; p5.stade = 0;
  assert(waterPlot(s, p5, true).ok, 'arrosée par une automatisation');
  const eau = s.eauMl;
  v.travail = null;
  journee(s);
  assertEqual(s.eauMl, eau, 'pas d\'eau de plus : tout était arrosé');
  // (il récolte une carotte mûre, puis la ressème (ses graines de carotte))
  P[1].culture = 'carotte'; P[1].stade = maxStage(P[1]);
  P[1].arrose = false;
  v.travail = null;
  const g = countItem(s, 'graine_carotte');
  journee(s);
  assertEqual(P[1].culture, 'carotte', 'ressemée de sa culture');
  assert(countItem(s, 'graine_carotte') <= g + 5, 'les graines de l\'inventaire');
});

test('les bêtes : nourrir les poules ; le verger ; la cuisine ; la navette au port', () => {
  const { s, V: [a, b, c, d] } = ile(4);
  // les bêtes
  assert(testBatir(s, 'poulailler').ok, 'le poulailler');
  s.poulailler.poules = 3;
  addItem(s, 'ble', 20);
  attribuer(s, a.id, 'betes');
  assertEqual(tacheManque(s, a, 'betes'), null, 'des bêtes');
  // la cuisine
  assert(testBatir(s, 'cuisine').ok, 'la cuisinière');
  attribuer(s, b.id, 'cuisine');
  addItem(s, 'oeuf', 6); addItem(s, 'huile', 2);
  // la navette
  addItem(s, 'carotte', 30);
  attribuer(s, c.id, 'navette');
  assert(/à vendre/.test(tacheAttente(s, c)), 'rien de marqué : elle attend');
  assert(executerCommande(s, { id: 'v', type: 'villageois.vendre', args: { id: c.id, objets: ['carotte'] } }).ok, 'la commande');
  assertEqual(tacheAttente(s, c), null, 'marqué : elle part');
  // le verger : un arbre qui a ses fruits
  attribuer(s, d.id, 'verger');
  assert(/arbre fruitier/.test(tacheManque(s, d, 'verger')), 'sans arbre ni ruche : le dit');
  const pieces = s.pieces, carottes = countItem(s, 'carotte');
  s.awakeMs = 4 * 3600 * 1000 / DATA.TEMPS.SECONDES_PAR_HEURE * DATA.TEMPS.SECONDES_PAR_HEURE;   // (de jour : le comptoir est ouvert)
  const r = journee(s);
  assert(r[a.id].actions >= 1 && s.poulailler.poules > 0, 'les poules nourries');
  assert(r[b.id].actions >= 1, 'une préparation lancée');
  assert(s.stations.cuisine.tache, 'la cuisinière travaille');
  const portee = tacheDef('navette').PORTEE;
  assertEqual(carottes - countItem(s, 'carotte'), Math.min(30, portee * r[c.id].actions), 'les carottes portées au port');
  assert(s.pieces > pieces, 'l\'argent au joueur');
  assert(s.campagne.compteurs.ventesPort > 0, 'des ventes au port (les paliers)');
  assertEqual(r[d.id].actions, 0, 'le verger attend');
});

/* ---------- les outils, l'attente, le repos ---------- */

test('sans outil, rien : la tâche attend et le dit ; donner, reprendre', () => {
  const { s, V: [v] } = ile();
  s.outils.hache = false;
  attribuer(s, v.id, 'bois');
  assert(/fabrique-la à l'Atelier/.test(tacheAttente(s, v)), 'il lui faut une hache (à fabriquer)');
  const segs = journeeDuVillage(s).get(v.id);
  assert(!segs.some((x) => x.etat === 'travail'), 'pas de créneau de travail : il vit sa journée');
  const p = paroleVillageois(s, v.id, { heure: 9, activite: 'dehors' });
  assert(/hache/.test(p.texte), `il le dit : « ${p.texte} »`);
  const bois = countItem(s, 'bois');
  assertEqual(journee(s)[v.id].actions, 0, 'aucune action');
  assertEqual(countItem(s, 'bois'), bois, 'pas de bois');
  // donner : il faut l'avoir
  assert(!donnerOutil(s, v.id, 'hache').ok, 'le joueur n\'en a pas');
  s.outils.hache = true;
  assert(/donne-lui la tienne/.test(tacheAttente(s, v)), 'le joueur en a une : la lui donner');
  assert(donnerOutil(s, v.id, 'hache').ok, 'donnée');
  assertEqual([s.outils.hache, v.outil], [false, 'hache'], 'elle passe chez lui');
  assert(journeeDuVillage(s).get(v.id).some((x) => x.etat === 'travail'), 'il travaille');
  assert(!reprendreOutil(s, 'personne').ok, 'personne');
  s.outils.hache = true;
  assert(!reprendreOutil(s, v.id).ok, 'le joueur en a déjà une : refus');
  s.outils.hache = false;
  assert(reprendreOutil(s, v.id).ok && s.outils.hache && v.outil === null, 'reprise');
  // la pioche améliorée lui profite : c'est le niveau de la ferme
  s.outils.pioche = true; s.outils.niveauPioche = 3;
  assert(donnerOutil(s, v.id, 'pioche').ok, 'la pioche de fer');
  attribuer(s, v.id, 'pierre');
  assertEqual(s.outils.niveauPioche, 3, 'son niveau reste');
});

test('en repos, rien ; la tâche « aucune » ; une tâche inconnue est refusée', () => {
  const { s, V: [v] } = ile();
  donnerOutil(s, v.id, 'hache'); attribuer(s, v.id, 'bois');
  v.repos = true;
  assert(!journeeDuVillage(s).get(v.id).some((x) => x.etat === 'travail'), 'pas de travail');
  assertEqual(journee(s)[v.id].actions, 0, 'rien');
  assertEqual(quiFaitQuoi(s)[0].etat, 'repos', 'qui fait quoi : au repos');
  v.repos = false;
  assert(!attribuer(s, v.id, 'danser').ok, 'inconnue');
  assert(executerCommande(s, { id: 'a', type: 'villageois.attribuer', args: { id: v.id, tache: 'aucune' } }).ok, 'aucune');
  assertEqual(v.tache, null, 'plus de tâche');
  assert(executerCommande(s, { id: 'b', type: 'villageois.attribuer', args: { id: v.id, tache: 'pierre' } }).ok, 'la pierre');
  assert(executerCommande(s, { id: 'c', type: 'villageois.outil', args: { id: v.id, outil: 'reprendre' } }).ok, 'reprendre');
  assert(executerCommande(s, { id: 'd', type: 'villageois.outil', args: { id: v.id, outil: 'pioche' } }).ok, 'donner');
  assertEqual(v.outil, 'pioche');
  assert(!executerCommande(s, { id: 'e', type: 'villageois.outil', args: { id: v.id, outil: 'marteau' } }).ok, 'pas un outil');
});

/* ---------- la journée ---------- */

test('la journée : les créneaux de travail, une pause par plage, les repas ; deux camarades côte à côte', () => {
  const { s, V: [a, b] } = ile(2);
  for (const v of [a, b]) { attribuer(s, v.id, 'cueillette'); }
  const J = journeeDuVillage(s);
  const [p1, p2] = TA.TRAVAIL;
  for (const v of [a, b]) {
    const segs = J.get(v.id), tr = segs.filter((x) => x.etat === 'travail');
    assert(tr.length > 0, 'du travail');
    for (const x of tr) {
      const m = (x.de + x.a) / 2;
      assert((m >= p1[0] - 0.5 && m < p1[1] + 0.5) || (m >= p2[0] - 0.5 && m < p2[1] + 0.5), 'aux heures de travail');
      assertEqual(x.but.sorte, 'travail');
      assertEqual(x.lieu.genre, 'devant');
    }
    assert(segs.some((x) => x.etat === 'repas' && x.de >= 11.5 && x.de < 13), 'le repas de midi');
    // (la pause : un créneau de la plage du matin qui n'est pas du travail)
    const matin = segs.filter((x) => (x.de + x.a) / 2 >= p1[0] && (x.de + x.a) / 2 < p1[1]);
    assert(matin.some((x) => x.etat !== 'travail'), 'une pause le matin');
    assert(segs.some((x) => x.de >= p2[1] && x.etat !== 'travail' && x.a <= 19), 'la fin d\'après-midi est libre');
  }
  // (les mêmes heures : postes voisins, la même clé, chacun avec l'autre)
  const ta = J.get(a.id).filter((x) => x.etat === 'travail'), tb = J.get(b.id).filter((x) => x.etat === 'travail');
  const W = farmTerrain(s).LARGEUR;
  const ensemble = ta.filter((x) => tb.some((y) => y.but.cle === x.but.cle && x.de < y.a && y.de < x.a));
  assert(ensemble.length > 0, 'au même poste, en même temps');
  for (const x of ensemble) {
    assert(x.but.avec.includes(b.id), 'avec son camarade');
    const y = tb.find((q) => q.but.cle === x.but.cle);
    const d = Math.max(Math.abs((x.lieu.case % W) - (y.lieu.case % W)), Math.abs(Math.floor(x.lieu.case / W) - Math.floor(y.lieu.case / W)));
    assert(d <= 4 && x.lieu.case !== y.lieu.case, 'côte à côte, pas sur la même case');
  }
  // (déterministe)
  const s2 = copie(s);
  assertEqual(JSON.stringify(journeeDuVillage(s2).get(a.id)), JSON.stringify(J.get(a.id)), 'la même journée');
});

test('au fil de la journée : les actions à l\'heure, à parts égales ; la nuit finit le reste, le journal', () => {
  const { s, V: [v] } = ile();
  donnerOutil(s, v.id, 'pioche'); attribuer(s, v.id, 'pierre');
  const A = tacheDef('pierre').ACTIONS;
  assertEqual(actionsDues(s, v, 7), 0, 'avant le travail : rien');
  assertEqual(actionsDues(s, v, 17), A, 'après : toutes');
  const midi = actionsDues(s, v, 12);
  assert(midi > 0 && midi < A, 'à midi : une partie');
  // (la journée qui avance : le moteur fait le travail à l'heure)
  while (clockHours(s) < 12) tick(s, 5);
  assertEqual(v.travail.actions, actionsDues(s, v), 'ce que l\'heure doit');
  assert(avancerTaches(s) === 0, 'rien de plus d\'ici la prochaine action');
  const moi = cote(s);
  runNight(s);
  const J = v.journal[v.journal.length - 1];
  assertEqual([J.tache, J.actions], ['pierre', A], 'le journal : la tâche, toutes ses actions');
  assert(J.produit.pierre > 0 && J.mange, 'ce qu\'il a produit, ce qu\'il a mangé');
  assertEqual(JSON.parse(cote(s))[1], JSON.parse(moi)[1], 'pas d\'XP pour le joueur');
  assert(v.journal.length <= DATA.VILLAGE.ARRIVEE.JOURNAL, 'sept jours au plus');
});

test('la fiche : les tâches, celles qu\'il peut faire, ce qui manque, qui l\'a déjà', () => {
  const { s, V: [a, b] } = ile(2);
  attribuer(s, a.id, 'cueillette');
  const L = tachesPour(s, b.id);
  assertEqual(L.map((t) => t.id), listeTaches(), 'toutes');
  const cu = L.find((t) => t.id === 'cueillette');
  assertEqual(cu.prise, [a.prenom], 'qui l\'a déjà');
  assert(L.find((t) => t.id === 'cuisine').manque, 'la cuisine : ce qui manque');
  assertEqual(L.find((t) => t.id === 'bois').manque, tacheManque(s, b, 'bois'), 'le bois : l\'outil');
  assert(postesDe(s, 'bois', b).length > 0, 'des arbres près de sa maison');
  // (un appui long sur un poste de la carte : « confier à… »)
  const T = farmTerrain(s);
  const arbre = Object.values(T.ARBRES)[0][0], rocher = Object.values(T.ROCHERS)[0][0];
  assertEqual(tachesDuPoste(s, arbre), ['bois'], 'un arbre : le bois');
  assertEqual(tachesDuPoste(s, rocher), ['pierre'], 'un rocher : la pierre');
  const rive = postesDe(s, 'peche', b)[0];
  assertEqual(tachesDuPoste(s, rive.vers), ['peche'], 'l\'eau de l\'étang : la pêche');
  assertEqual(tachesDuPoste(s, rive.case), [], 'l\'herbe de la rive : rien');
});

/* ---------- la sauvegarde, le joueur automatique, éteint ---------- */

test('la sauvegarde : v88 → v89 ; la tâche et l\'outil gardés, une valeur abîmée remise à vide', () => {
  assertEqual(STATE_VERSION, 89);
  const { s, V: [v] } = ile();
  donnerOutil(s, v.id, 'hache'); attribuer(s, v.id, 'bois');
  journee(s);
  const m = migrate(copie(s));
  assertEqual(m.version, 89);
  assertEqual([m.villageois[0].tache, m.villageois[0].outil], ['bois', 'hache'], 'gardés');
  assertEqual(m.villageois[0].travail.actions, v.travail.actions, 'sa journée de travail');
  const vieille = { ...copie(s), version: 88, villageois: [{ ...copie(v), tache: 'danser', outil: 'marteau', vendre: 'tout', semis: [], travail: 'oui' }] };
  delete vieille.villageois[0].vendre;
  const r = migrate(vieille).villageois[0];
  assertEqual([r.tache, r.outil, r.vendre, r.semis, r.travail], [null, null, [], {}, null], 'remis à vide');
  const sans = migrate({ ...copie(createNewGame(3)), version: 88 });
  assert(!('villageois' in sans), 'sans villageois : rien');
});

test('le joueur automatique loge un villageois, lui confie une tâche et son outil', () => {
  const { s } = ile(0);
  s.palier = DATA.SIMULATION.VILLAGEOIS.MAISON_PALIER;
  s.outils = { hache: false, pioche: false, choisi: 'houe' };
  addItem(s, 'fibre', 10); addItem(s, 'planche', 10); addItem(s, 'bois', 20); addItem(s, 'pierre', 20);
  botVillageois(s);
  assertEqual(villageoisDe(s).length, 0, 'la maison bâtie, il arrive au bac');
  for (let k = 0; k < 6 && !villageoisDe(s).length; k++) runNight(s);
  const [v] = villageoisDe(s);
  assert(v, 'il est arrivé');
  botVillageois(s);
  assert(v.tache, `une tâche : ${v.tache}`);
  assertEqual(tacheAttente(s, v), null, 'rien ne lui manque');
  if (tacheDef(v.tache).outil) assertEqual(v.outil, tacheDef(v.tache).outil, 'son outil');
});

test('éteint : ni tâche, ni travail, ni format qui change pour une partie neuve', () => {
  avecVillage(() => {
    const s = createNewGame(5);
    assertEqual(avancerTaches(s), 0, 'rien');
    assertEqual(tachesNuit(s), null, 'pas de nuit des tâches');
    assert(!attribuer(s, 'vg-1', 'bois').ok, 'refusé');
    assertEqual(chopsLeft(s, 'x') > 0, true);
    assert(!('villageois' in s), 'pas de villageois');
  }, false);
});
