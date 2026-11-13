/* ==========================================================================
   Tests du chantier « l'île à bâtir » : la vocation « ferme productive » (docs/ile.md, fiche I8b ;
   js/engine/vocation-production.js, contrats.js, production.js, taches.js « Conduire les machines », le socle minimal
   des vocations : vocations.js). Comme tous les fichiers tests/engine/village-*.test.mjs, il tourne avec
   VILLAGE.ACTIF forcé à true.
   - le score et chacune de ses causes ; les paliers notés la nuit, ce qu'ils débloquent ;
   - un contrat d'export proposé, accepté, livré en trois passages du bac, sa prime ; un contrat manqué s'efface sans
     pénalité ; la taille suit le niveau du port ;
   - la tâche « Conduire les machines » : une chaîne vidée, alimentée, relancée ; le Moulin ; le four ; le courant
     dans le coût du tableau ;
   - la tournée du port en volume : les contrats d'abord, la brouette, le quai de chargement ;
   - les paliers : les contrats gros, le réservoir double, le vrac de plein champ, le second robot ;
   - la sauvegarde v97 → v98 ; les commandes ; éteint, rien.
   Lancer seul : node tests/run-tests.mjs village-production
   ========================================================================== */

import {
  accepterContrat, addItem, arriverVillageois, attribuer, avancerContrats, awakeMsAtHour, bilanJour, buildAtelier, calculProduction,
  catalogueImport, chargerPortage, choisirVehicule, commanderImport, comptoirDuPort, contratsDuPort, countItem, craftStatus,
  createNewGame, DATA, debloque, etatChaine, executerCommande, farmSeed, farmTerrain, listeVocations, livrerContrat,
  machinesDeLaFerme, migrate, palierVocation, paiementContrat, porteeNavette, portDuMonde, poserBloc, postesDe,
  prendreAvisContrats, productionNuit, prixIle, robotTrip, runNight, scoreVocation, sellPrice, STATE_VERSION, tacheDef, tacheManque, tachesDuPoste,
  tachesNuit, testBatir, testFillBatteries, testFillTank, testMaisonVillageois, tirerContrats, valeurContrat, vocationsNuit,
} from '../../js/engine/index.js';
import { assert, assertEqual, avecVillage, boite, partie, runFor, setInv, test } from './aide.mjs';

const copie = (o) => JSON.parse(JSON.stringify(o));
const PER = DATA.PORT.BAC.PERIODE;
const CC = DATA.PRODUCTION.CONTRATS;

// La partie de test : le foyer, le port (au niveau `niveau`), `n` villageois logés, la boîte pleine, l'Atelier ; de
// jour (10 h).
function ile(n = 1, seed = 1, niveau = 2) {
  const s = partie(seed);
  portDuMonde(farmSeed(s));
  boite(s, { pain: 80 });
  setInv(s, { bois: 3, pierre: 3 });
  assert(buildAtelier(s).ok, 'l\'Atelier');
  for (let k = 0; k < n; k++) assert(testMaisonVillageois(s).ok, 'la maison');
  const V = [];
  for (let k = 0; k < n; k++) {
    const r = arriverVillageois(s, { direct: true });
    assert(r.ok, 'il arrive');
    V.push(r.villageois);
  }
  s.port.niveau = niveau;
  s.progression.niveau = Math.max(s.progression.niveau, 30);   // (le Moulin, le four, les chaînes)
  s.awakeMs = awakeMsAtHour(10);
  return { s, V, ou: comptoirDuPort(s).devant };
}

// Une rangée d'herbe libre de `w` cases, sans bloc ni parcelle autour : la case de son début.
function rangee(s, w) {
  const T = farmTerrain(s), W = T.LARGEUR;
  for (let r = 5; r < T.HAUTEUR - 5; r++) {
    for (let c = 4; c < W - w - 4; c++) {
      let ok = true;
      for (let dr = -1; dr <= 1 && ok; dr++) {
        for (let dc = -1; dc <= w && ok; dc++) {
          const t = (r + dr) * W + c + dc;
          ok = T.LIGNES[r + dr][c + dc] === '#' && !(s.blocs || {})[t] && !s.potager.parcelles.some((p) => p.case === t) && !(T.HERBES && T.HERBES[t]);
        }
      }
      if (ok) return r * W + c;
    }
  }
  return null;
}

// Pose `sortes` à la suite depuis la case `t`.
function poser(s, t, sortes) {
  sortes.forEach((sorte, k) => {
    addItem(s, sorte, 1);
    const r = poserBloc(s, sorte, t + k);
    assert(r.ok, `poser ${sorte} : ${r.error}`);
  });
}

// Une chaîne d'huile (l'entonnoir, la presse, un convoyeur) : la case de son entonnoir.
function chaineHuile(s) {
  const t = rangee(s, 5);
  assert(t !== null, 'une rangée libre');
  poser(s, t, ['entonnoir', 'pressoir', 'convoyeur']);
  assert(etatChaine(s, t).ok, 'la chaîne est prête');
  testFillBatteries(s);
  return t;
}

// Aller au jour `jour`, à `h` h (sans nuit : le bac se déduit du jour).
function aller(s, jour, h = 10) {
  s.day = jour;
  s.awakeMs = awakeMsAtHour(h);
}

// Charger `n` unités de `item` (posées à la ferme), à la brouette.
function charger(s, item, n) {
  addItem(s, item, n);
  addItem(s, 'brouette', 1);
  choisirVehicule(s, 'brouette', null, { sansPresence: true });
  assert(chargerPortage(s, item, n, null, { sansPresence: true }).ok, `${item} chargé`);
}

/* ---------- le score ---------- */

test('le score de la ferme productive : la valeur exportée, les machines, l\'énergie, les contrats ; des entiers', () => {
  const { s, ou } = ile(0);
  const K = DATA.VOCATIONS.production.CAUSES;
  const zero = calculProduction(s);
  assertEqual(zero.causes.map((c) => c.id), ['export', 'machines', 'energie', 'contrats']);
  // (la valeur exportée : une vente au port, au prix de vente)
  charger(s, 'carotte', 30);
  assert(executerCommande(s, { id: 'd', type: 'port.decharger', args: { case: ou } }).ok, 'déchargé, vendu');
  const vendu = 30 * prixIle('carotte');
  const c1 = Object.fromEntries(calculProduction(s).causes.map((c) => [c.id, c.valeur]));
  assertEqual(c1.export, Math.floor(vendu / K.export.PIECES), 'un point par PIECES pièces exportées');
  // (une chaîne prête et le Moulin : deux machines)
  chaineHuile(s);
  assert(testBatir(s, 'moulin').ok, 'le Moulin');
  const c2 = Object.fromEntries(calculProduction(s).causes.map((c) => [c.id, c.valeur]));
  assertEqual(c2.machines, (c1.machines / K.machines.POINTS + 2) * K.machines.POINTS, 'deux machines de plus');
  // (l'énergie produite, notée la nuit ; les contrats honorés)
  s.jour.produite = 12 * K.energie.WH * 1000;
  assertEqual(productionNuit(s).energie, 12 * K.energie.WH);
  s.production.contrats.honores = 2;
  const r = scoreVocation(s, 'production');
  const c3 = Object.fromEntries(r.causes.map((c) => [c.id, c.valeur]));
  assertEqual(c3.energie, 12, 'un point par WH Wh');
  assertEqual(c3.contrats, 2 * K.contrats.POINTS, 'POINTS par contrat');
  assertEqual(r.score, r.causes.reduce((t, c) => t + c.valeur, 0), 'la somme des causes');
  assert(r.causes.every((c) => Number.isInteger(c.valeur)) && Number.isInteger(r.score), 'des entiers');
  // (un mois de lune plus tard, la valeur exportée et l'énergie s'effacent ; les contrats honorés restent)
  s.day += DATA.LUNE.JOURS_MOIS;
  s.jour.produite = 0;
  const c4 = Object.fromEntries(calculProduction(s).causes.map((c) => [c.id, c.valeur]));
  assertEqual([c4.export, c4.energie, c4.contrats], [0, 0, 2 * K.contrats.POINTS], 'le mois de lune glisse');
  // (elle se liste parmi les vocations)
  const L = listeVocations(s);
  assert(L.some((v) => v.id === 'production' && v.nom === DATA.VOCATIONS.production.nom), 'listée');
});

test('les paliers : atteints, notés la nuit, ils le restent ; ce qu\'ils débloquent', () => {
  const { s } = ile(0);
  const P = DATA.VOCATIONS.production.PALIERS;
  assertEqual(palierVocation(s, 'production').palier, 0);
  assertEqual(debloque(s, 'contrats_gros'), false);
  s.production = s.production || { ventes: {}, energie: {}, contrats: { tire: 0, proposes: [], acceptes: [], honores: 0, primes: 0, avis: [] } };
  s.production.contrats.honores = Math.ceil(P[1].score / DATA.VOCATIONS.production.CAUSES.contrats.POINTS);
  // (le socle d'I8a : palier, celui qui est gardé, passé la nuit ; atteint, celui que le score atteint maintenant)
  const p = palierVocation(s, 'production');
  assertEqual(p.atteint >= 2, true, 'deux paliers par le score');
  assertEqual(p.palier, 0, 'passés la nuit seulement');
  assertEqual(p.suivant.score, P[p.palier].score, 'le suivant');
  assertEqual(debloque(s, 'contrats_gros'), false, 'débloqué à la nuit seulement');
  const nuit = (vocationsNuit(s) || []).filter((x) => x.id === 'production').map((x) => x.palier);
  assertEqual(Math.max(...nuit), p.atteint, 'la nuit note les paliers');
  assertEqual([debloque(s, 'contrats_gros'), debloque(s, 'machines_grandes'), debloque(s, 'robot_second')], [true, true, false]);
  s.production.contrats.honores = 0;
  assertEqual(palierVocation(s, 'production').palier, p.atteint, 'un palier atteint le reste');
  assertEqual((vocationsNuit(s) || []).filter((x) => x.id === 'production').length, 0, 'rien de nouveau');
});

/* ---------- les contrats d'export ---------- */

test('un contrat d\'export : proposé au bac, accepté, livré en trois passages, sa prime ; la taille suit le niveau', () => {
  const { s, ou } = ile(0, 2);
  s.campagne.compteurs.pains = 5;   // (il sait faire du pain)
  aller(s, PER);
  const d = contratsDuPort(s);
  assert(d.ouvert, 'le port de niveau 2 ouvre les contrats');
  assertEqual(d.proposes.length, CC.PROPOSES[1], 'PROPOSES[1] proposés');
  // (un contrat de pain, posé à la main pour la mesure : 100 pains)
  s.production.contrats.proposes = [{ id: 'kp', objet: 'pain', quantite: 100, prime: 40, jour: PER, fin: PER + (CC.PASSAGES - 1) * PER }];
  assert(accepterContrat(s, 'kp', ou).ok, 'accepté');
  assertEqual(contratsDuPort(s).acceptes[0].passagesRestants, CC.PASSAGES, 'trois passages');
  const pieces = s.pieces, xp = s.progression.xp;
  // (premier passage : 40 pains)
  charger(s, 'pain', 40);
  let r = livrerContrat(s, 'kp', ou);
  assertEqual([r.ok, r.n, r.complet, r.gain], [true, 40, false, 40 * prixIle('pain')]);
  // (deuxième passage : 30)
  aller(s, 2 * PER);
  charger(s, 'pain', 30);
  assert(livrerContrat(s, 'kp', ou).ok);
  assertEqual(contratsDuPort(s).acceptes[0].livre, 70);
  // (troisième passage : 30 de plus, il est complet : la prime)
  aller(s, 3 * PER);
  charger(s, 'pain', 45);
  r = livrerContrat(s, 'kp', ou);
  assertEqual([r.n, r.complet, r.prime], [30, true, paiementContrat({ objet: 'pain', quantite: 100, prime: 40 }).prime], 'il ne prend que ce qui reste');
  assertEqual(s.pieces - pieces, 100 * prixIle('pain') + r.prime, 'le prix de vente de tout, plus la prime');
  assert(s.progression.xp > xp, 'de l\'expérience');
  assertEqual([s.production.contrats.honores, contratsDuPort(s).acceptes.length], [1, 0]);
  assert(prendreAvisContrats(s).some((a) => a.quoi === 'honore'), 'la page le dira');
  assertEqual(countItem(s, 'pain') >= 0, true);
  // (la taille suit le niveau du port)
  assert(valeurContrat(s, 3) > valeurContrat(s, 2), 'plus gros au niveau 3');
  const t2 = tirerContrats(s, 30);
  s.port.niveau = 4;
  const t4 = tirerContrats(s, 30);
  assert(t4.length >= t2.length && t4[0].quantite > t2[0].quantite, 'plus de contrats, plus gros, au niveau 4');
  assertEqual(copie(tirerContrats(s, 30)), copie(t4), 'tirés de la graine et du jour');
});

test('un contrat manqué s\'efface sans pénalité ; on n\'en accepte que MAX ; avant le niveau 2, aucun', () => {
  const { s, ou } = ile(0, 3, 1);
  s.campagne.compteurs.pains = 5;
  aller(s, PER);
  assertEqual(contratsDuPort(s).proposes.length, 0, 'le port de niveau 1 : pas de contrat');
  s.port.niveau = 2;
  aller(s, 2 * PER);
  avancerContrats(s);
  s.production.contrats.proposes = [1, 2, 3].map((k) => ({ id: `k${k}`, objet: 'pain', quantite: 50, prime: 30, jour: 2 * PER, fin: 2 * PER + 2 * PER }));
  for (let k = 1; k <= CC.MAX; k++) assert(accepterContrat(s, `k${k}`, ou).ok);
  assert(!accepterContrat(s, `k${CC.MAX + 1}`, ou).ok, 'MAX à la fois');
  charger(s, 'pain', 10);
  assert(livrerContrat(s, 'k1', ou).ok, 'une livraison payée');
  const pieces = s.pieces, pain = countItem(s, 'pain');
  // (le bac du dernier passage reparti : ils s'effacent)
  aller(s, 4 * PER, DATA.PORT.BAC.HEURES[1] + 1);
  assertEqual(contratsDuPort(s).acceptes.length, 0, 'effacés');
  assertEqual([s.pieces, countItem(s, 'pain')], [pieces, pain], 'rien de repris, rien à payer');
  assert(prendreAvisContrats(s).some((a) => a.quoi === 'manque'), 'la page le dira');
});

/* ---------- les villageois et les machines ---------- */

test('« Conduire les machines » : il vide la chaîne, l\'alimente, la relance ; le courant compte dans son coût', () => {
  const { s, V: [v] } = ile(1, 4);
  const t = chaineHuile(s);
  assertEqual(tacheDef('chaine').lieu, 'machine');
  assert(/chaîne de production/.test(tacheManque(s, { ...v, tache: 'chaine' }, 'chaine')) === false, 'une chaîne : un poste');
  assert(attribuer(s, v.id, 'chaine').ok);
  assert(postesDe(s, 'chaine', v).some((p) => p.vers === t), 'son poste : devant l\'entonnoir');
  assert(tachesDuPoste(s, t + 1).includes('chaine'), 'un appui long sur la presse propose la tâche');
  assert(machinesDeLaFerme(s).some((m) => m.sorte === 'chaine' && m.case === t));
  setInv(s, { graine_tournesol: 30 });
  // (la journée : à chaque tour, il ramasse le tas et verse ; la chaîne tourne entre deux tours)
  let huile = 0;
  for (let k = 0; k < 6; k++) {
    tachesNuit(s);   // (les actions du jour d'un coup : un seul tour verse, les suivants n'ont rien à faire)
    runFor(s, DATA.CHAINES.OUTILS.pressoir.secondes + 1);
    s.villageois[0].travail.actions = 0;   // (un nouveau tour, comme une heure plus tard)
    huile = countItem(s, 'huile');
  }
  assert(huile >= 4, `il a ramassé l'huile au coffre (${huile})`);
  assert(countItem(s, 'graine_tournesol') <= 30 - 3 * huile, 'les graines versées');
  const T = s.villageois[0].travail;
  assert(T.courant > 0, 'le courant des cycles');
  // (le tableau : le courant dans le coût)
  const J = bilanJour({ jour: 1, tache: 'chaine', actions: 3, mange: {}, utilise: { graine_tournesol: 9 }, produit: { huile: 3 }, courant: 1000 });
  assertEqual(J.electricite, Math.round(1000 / DATA.PRODUCTION.COURANT.WH_PAR_PIECE));
  assertEqual(J.cout, J.matieres + J.electricite);
  // (sans chaîne, ni Moulin, ni four : la tâche attend et le dit)
  const { s: s2, V: [w] } = ile(1, 5);
  attribuer(s2, w.id, 'chaine');
  assertEqual(tacheManque(s2, w, 'chaine'), tacheDef('chaine').SANS);
});

test('« Conduire les machines » : le Moulin et la fournée ; plus qu\'un joueur seul', () => {
  const { s, V: [v] } = ile(1, 6);
  assert(testBatir(s, 'moulin').ok && testBatir(s, 'four').ok, 'le Moulin et le four');
  testFillBatteries(s);
  testFillTank(s);
  addItem(s, 'ble', 40);
  addItem(s, 'farine', 4);
  attribuer(s, v.id, 'chaine');
  assertEqual(tacheManque(s, v, 'chaine'), null);
  const r = tachesNuit(s)[v.id];
  assert(r.actions >= 1, 'un tour');
  assert(s.stations.moulin.tache, 'le Moulin moud');
  assert(s.stations.four.tache && s.stations.four.tache.recette === 'pain', 'la fournée au four');
  assertEqual(r.produit.farine, tacheDef('chaine').MOULIN, 'la farine comptée au lancement');
  assertEqual(r.produit.pain, 1, 'le pain compté au lancement');
  assert(s.villageois[0].travail.courant >= tacheDef('chaine').MOULIN * DATA.RECETTES.farine.temps * DATA.STATIONS.moulin.whParS, 'le courant du Moulin');
});

test('la tournée du port en volume : les contrats d\'abord ; la brouette, le quai de chargement', () => {
  const { s, V: [v], ou } = ile(1, 7);
  const base = tacheDef('navette').PORTEE, N = DATA.PRODUCTION.NAVETTE;
  assertEqual(porteeNavette(s), base);
  addItem(s, 'brouette', 1);
  assertEqual(porteeNavette(s), N.BROUETTE, 'avec une brouette');
  // (le quai de chargement : à partir du port de niveau 2)
  s.port.niveau = 1;
  setInv(s, { planche: 20, pierre: 10, lingot_fer: 4, brouette: 1 });
  assert(/port de niveau/.test(craftStatus(s, 'quai_chargement').raison), 'le port de niveau 2 l\'ouvre');
  s.port.niveau = 2;
  assert(craftStatus(s, 'quai_chargement').ok, 'il se fabrique');
  const t = rangee(s, 4);
  addItem(s, 'quai_chargement', 1);
  assert(poserBloc(s, 'quai_chargement', t + 1).ok, 'posé');
  assertEqual(porteeNavette(s), Math.round((N.BROUETTE * N.QUAI) / 100), 'le quai regroupe les envois');
  assert(postesDe(s, 'navette', v).some((p) => p.quai), 'la tournée part du quai');
  // (un contrat accepté : la tournée le livre d'abord, sans rien de marqué)
  s.campagne.compteurs.pains = 1;
  aller(s, PER);
  avancerContrats(s);
  s.production.contrats.proposes = [{ id: 'kn', objet: 'pain', quantite: 40, prime: 40, jour: PER, fin: PER + 2 * PER }];
  assert(accepterContrat(s, 'kn', ou).ok);
  addItem(s, 'pain', 60);
  attribuer(s, v.id, 'navette');
  assertEqual(tacheManque(s, v, 'navette'), null, 'un contrat suffit');
  const pieces = s.pieces;
  tachesNuit(s);
  assertEqual(s.production.contrats.honores, 1, 'le contrat livré par la tournée');
  assert(s.pieces > pieces, 'payé, avec la prime');
});

test('deux navettes, un boulanger, une chaîne : un contrat de 100 pains honoré en trois passages', () => {
  const { s, V: [cuisinier, conducteur, n1, n2], ou } = ile(4, 8);
  assert(testBatir(s, 'moulin').ok && testBatir(s, 'four').ok, 'le Moulin et le four');
  s.campagne.compteurs.pains = 1;
  aller(s, PER);
  avancerContrats(s);
  s.production.contrats.proposes = [{ id: 'k100', objet: 'pain', quantite: 100, prime: 40, jour: PER, fin: PER + 2 * PER }];
  assert(accepterContrat(s, 'k100', ou).ok);
  attribuer(s, cuisinier.id, 'cuisine');
  attribuer(s, conducteur.id, 'chaine');
  attribuer(s, n1.id, 'navette');
  attribuer(s, n2.id, 'navette');
  // (neuf jours : le blé arrive des champs, ici donné chaque matin ; le pain se cuit, la tournée le porte)
  for (let j = PER; j < PER + 3 * PER && s.production.contrats.honores === 0; j++) {
    aller(s, j, 8);
    addItem(s, 'ble', 30);
    testFillBatteries(s);
    testFillTank(s);
    for (let h = 8; h < 17; h += 0.5) { aller(s, j, h); for (const x of s.villageois) if (x.travail) x.travail.essai = 0; tachesNuit(s); runFor(s, 15); for (const x of s.villageois) if (x.travail) x.travail.actions = 0; }
  }
  assertEqual(s.production.contrats.honores, 1, 'honoré avant le départ du troisième bac');
});

/* ---------- les paliers débloquent ---------- */

test('les paliers débloquent : des contrats plus gros, un réservoir double, le vrac de plein champ, un second robot', () => {
  const { s } = ile(0, 9);
  const v0 = valeurContrat(s, 2);
  const t = rangee(s, 6);
  poser(s, t, ['entonnoir', 'reservoir', 'pressoir', 'convoyeur']);
  const cap0 = etatChaine(s, t).capacite;
  assert(!catalogueImport(s).some((a) => a.sorte === 'vrac'), 'pas de vrac');
  const r = { taches: [{ t: 'recolter', id: 'x' }], i: 0 };
  s.vocations = { paliers: { production: DATA.VOCATIONS.production.PALIERS.length } };
  assertEqual(valeurContrat(s, 2), Math.round((v0 * CC.GROS) / 100), 'contrats_gros');
  assertEqual(etatChaine(s, t).capacite, Math.round((cap0 * DATA.PRODUCTION.MACHINES.RESERVOIR) / 100), 'machines_grandes');
  const vrac = catalogueImport(s).filter((a) => a.sorte === 'vrac');
  assert(vrac.some((a) => a.id === 'ble') && vrac.every((a) => a.lot === DATA.PRODUCTION.IMPORT.LOT), 'import_plein_champ');
  s.pieces = 5000;
  s.progression.niveau = 40;
  assert(commanderImport(s, 'vrac:ble', 1, comptoirDuPort(s).devant).ok, 'commandé');
  const avec = robotTrip(s, r, 0);
  delete s.vocations;
  const sans = robotTrip(s, r, 0);
  assert(Math.abs(avec.travail * DATA.PRODUCTION.ROBOT.VITESSE / 100 - sans.travail) < 1e-9, 'robot_second : la tournée à deux');
});

/* ---------- la sauvegarde, les commandes, éteint ---------- */

test('la sauvegarde : v97 → v98 ; la production et les paliers gardés, réparés ; une partie d\'avant laissée telle quelle', () => {
  assert(STATE_VERSION >= 98, 'le format 98 ou plus');
  const { s, ou } = ile(0, 10);
  s.campagne.compteurs.pains = 1;
  aller(s, PER);
  avancerContrats(s);
  s.production.contrats.proposes = [{ id: 'ks', objet: 'pain', quantite: 40, prime: 40, jour: PER, fin: PER + 2 * PER }];
  assert(executerCommande(s, { id: 'c', type: 'port.contrat', args: { contrat: 'ks', case: ou } }).ok, 'port.contrat');
  charger(s, 'pain', 10);
  assert(executerCommande(s, { id: 'l', type: 'port.livrer', args: { contrat: 'ks', case: ou } }).ok, 'port.livrer');
  s.production.ventes = { [s.day]: 120 };
  s.vocations = { paliers: { production: 1 } };
  const m = migrate({ ...copie(s), version: 92 });
  assertEqual(m.version, STATE_VERSION);
  assertEqual([m.production.contrats.acceptes[0].livre, m.production.ventes[s.day], m.vocations.paliers.production], [10, 120, 1], 'gardé');
  const abime = migrate({ ...copie(s), version: 92, production: { ventes: { 3: -4 }, contrats: { acceptes: [{ objet: 'licorne', quantite: 3 }], honores: 'x' } }, vocations: { paliers: { production: -2 } } });
  assertEqual([abime.production.ventes, abime.production.contrats.acceptes, abime.production.contrats.honores, abime.vocations.paliers], [{}, [], 0, {}], 'réparé');
  const avant = avecVillage(() => createNewGame(5), false);
  const v = migrate({ ...copie(avant), version: 92 });
  assert(!('production' in v) && !('vocations' in v), 'une partie d\'avant : rien d\'ajouté');
});

test('éteint : ni score, ni contrat, ni machine conduite, ni nuit qui change', () => {
  avecVillage(() => {
    const s = createNewGame(5);
    assertEqual(scoreVocation(s, 'production'), { score: 0, causes: [] });
    assertEqual(listeVocations(s), []);
    assertEqual(debloque(s, 'contrats_gros'), false);
    assertEqual(contratsDuPort(s), null);
    assertEqual(productionNuit(s), null);
    assertEqual(vocationsNuit(s), null);
    runNight(s);
    assert(!('production' in s) && !('vocations' in s), 'rien d\'écrit');
    assertEqual(recetteQuai(s), false, 'pas de quai de chargement');
  }, false);
});

function recetteQuai(s) {
  return craftStatus(s, 'quai_chargement').ok;
}

