/* ==========================================================================
   Tests du chantier « l'île à bâtir » : le bac, ses commandes, le catalogue d'import et les niveaux du port
   (docs/ile.md, fiche I1c ; js/engine/bac.js). Comme tous les fichiers tests/engine/village-*.test.mjs, ils
   tournent avec VILLAGE.ACTIF forcé à true (tests/engine/aide.mjs).
   Lancer seul : node tests/run-tests.mjs village-bac
   ========================================================================== */

import {
  acheterAuPort, agrandirPort, apporterAuChantier, articleDe, avancerBac, awakeMsAtHour, bacAQuai, caissesAQuai,
  catalogueImport, chargerPortage, choisirVehicule, commanderImport, commandesDuBac, comptoirDuPort, contenuPort, countItem, createNewGame, DATA,
  enVenteAuPort, etalPort, etatBac, executerCommande, farmSeed, honorerCommande, importsAttendus, inscrireSauvage, jourDeBac,
  migrate, niveauPort, paiementCommande, plafondVillageois, planConnu, portDe, portDuMonde, prendreAvisBac, prochainBac,
  prochainNiveau, runNight, savoirProduire, sellPrice, STATE_VERSION, testBatir, tirerCommandes, unlockLevel, vendreAuPort,
} from '../../js/engine/index.js';
import { jourDeBac as jourDuVillageois } from '../../js/engine/villageois.js';
import { assert, assertEqual, avecVillage, reach, setInv, test } from './aide.mjs';

const B = DATA.PORT.BAC;
const copie = (o) => JSON.parse(JSON.stringify(o));

// Une partie neuve avec son port (le lieu calculé d'après le plan), au niveau du commerce, le jour `jour` à `h` h ;
// la case devant le comptoir.
function auPort(seed = 'bac', jour = 1, h = 10) {
  const s = reach(createNewGame(seed), 'marche');
  portDuMonde(farmSeed(s));
  s.day = jour;
  s.awakeMs = awakeMsAtHour(h);
  return { s, ou: comptoirDuPort(s).devant };
}

// Charger `inv` (posé dans l'inventaire), sur la ferme.
function charger(s, inv) {
  setInv(s, { ...inv, brouette: 1 });
  assert(choisirVehicule(s, 'brouette', null, { sansPresence: true }).ok, 'la brouette');
  for (const [k, n] of Object.entries(inv)) assert(chargerPortage(s, k, n, null, { sansPresence: true }).ok, `${k} chargé`);
}

// Aller au jour `jour`, à `h` h (sans nuit : le bac se déduit du jour).
function aller(s, jour, h = 10) {
  s.day = jour;
  s.awakeMs = awakeMsAtHour(h);
}

/* ---------- les jours du bac ---------- */

test('les jours du bac : tous les PERIODE jours, à quai de HEURES[0] à HEURES[1] h ; le même bac amène les villageois', () => {
  const { s } = auPort();
  const P = B.PERIODE;
  for (let j = 1; j <= 4 * P; j++) {
    assertEqual(jourDeBac(s, j), j % P === 0, `jour ${j}`);
    assertEqual(jourDuVillageois(s, j), jourDeBac(s, j), 'une seule notion du jour de bac');
  }
  assertEqual(prochainBac(s, 1), P);
  assertEqual(prochainBac(s, P), P, 'aujourd\'hui compris');
  assertEqual(prochainBac(s, P + 1), 2 * P);
  aller(s, P, B.HEURES[0] - 1);
  assertEqual(bacAQuai(s), false, 'avant son heure');
  aller(s, P, B.HEURES[0]);
  assertEqual(bacAQuai(s), true, 'à quai');
  aller(s, P, B.HEURES[1]);
  assertEqual(bacAQuai(s), false, 'reparti');
  aller(s, P + 1, 12);
  assertEqual(bacAQuai(s), false, 'pas un jour de bac');
  const e = etatBac(s);
  assertEqual(e.prochain, 2 * P, 'le prochain passage');
});

test('une partie neuve a son port au niveau de départ ; elle ne rattrape pas les bacs d\'avant elle', () => {
  const { s } = auPort();
  assertEqual(s.port.niveau, DATA.PORT.NIVEAU_DEPART);
  assertEqual(niveauPort(s), 1);
  assertEqual(s.port.passe, 0);
  // (une partie d'essai d'avant la fiche, sans port, au jour 10 : il naît au premier besoin, le jour 9 compté passé)
  delete s.port;
  aller(s, 10);
  const p = portDe(s);
  assertEqual(p.passe, 9, 'le dernier bac d\'avant compté passé');
  assertEqual(avancerBac(s).arrivees, [], 'rien à rattraper');
});

/* ---------- la vente sans limite, les caisses ---------- */

test('la vente reste libre : tout se vend sous la halle, sans quota ; les caisses attendent le bac et partent avec lui', () => {
  const { s, ou } = auPort('vente', B.PERIODE + 1, 10);
  avancerBac(s);
  let vendus = 0;
  for (let k = 0; k < 40; k++) {
    charger(s, { carotte: 12 });
    const r = vendreAuPort(s, 'carotte', 12, ou);
    assert(r.ok, r.error);
    assertEqual(r.gain, 12 * sellPrice('carotte'), 'toujours le prix de vente');
    vendus += r.sold;
  }
  assertEqual(vendus, 480, 'pas de borne');
  assertEqual(s.port.vendu.carotte, 480, 'ce qui attend le bac');
  assertEqual(caissesAQuai(s), B.CAISSES_MAX, 'les caisses, CAISSES_MAX au plus');
  // le bac suivant accoste : elles sont toujours là ; il repart : elles partent avec lui
  aller(s, 2 * B.PERIODE, B.HEURES[0] + 1);
  avancerBac(s);
  assert(caissesAQuai(s) > 0, 'à quai : chargées');
  aller(s, 2 * B.PERIODE, B.HEURES[1]);
  assertEqual(avancerBac(s).depart, true, 'il repart');
  assertEqual(caissesAQuai(s), 0, 'parties avec lui');
  assertEqual(s.port.vendu, {});
});

/* ---------- les commandes ---------- */

test('les commandes : tirées de la graine et du jour parmi ce que le joueur sait produire', () => {
  const { s } = auPort('commandes');
  assertEqual(savoirProduire(s), [], 'rien encore');
  s.campagne.compteurs.cultures = ['carotte', 'tomate', 'tournesol'];
  s.campagne.compteurs.plats = ['pain'];
  s.poulailler.poules = 2;
  const sait = savoirProduire(s);
  for (const it of ['carotte', 'tomate', 'graine_tournesol', 'pain', 'oeuf']) assert(sait.includes(it), `${it} : il sait le produire`);
  const a = tirerCommandes(s, 6), b = tirerCommandes(copie(s), 6), c = tirerCommandes(s, 9);
  assertEqual(a, b, 'la même graine, le même jour : les mêmes commandes');
  assert(JSON.stringify(a) !== JSON.stringify(c), 'un autre passage : d\'autres');
  assertEqual(a.length, DATA.PORT.NIVEAUX[0].commandes, 'NIVEAUX[0].commandes');
  const C = DATA.PORT.COMMANDES;
  for (const x of a) {
    assert(sait.includes(x.objet), 'un objet qu\'il sait produire');
    assert(x.quantite >= C.QUANTITE[0] && x.quantite <= C.QUANTITE[1], 'la quantité bornée');
    assert(x.prime >= C.PRIME[0] && x.prime <= C.PRIME[1] && x.prime % 5 === 0, 'la prime, par pas de 5');
  }
  assertEqual(new Set(a.map((x) => x.objet)).size, a.length, 'des objets différents');
});

test('une commande honorée paie le prix de vente, la prime et l\'XP ; manquée, elle s\'efface sans rien coûter', () => {
  const { s, ou } = auPort('honorer', 2, 10);
  s.campagne.compteurs.cultures = ['carotte', 'tomate', 'patate'];
  aller(s, B.PERIODE, B.HEURES[0]);
  const L = commandesDuBac(s);
  assertEqual(L.length, DATA.PORT.NIVEAUX[0].commandes, 'le bac les a apportées');
  assertEqual(prendreAvisBac(s)[0].commandes, L.length, 'l\'avis de son arrivée');
  const c = L[0];
  assertEqual(c.jusqua, 2 * B.PERIODE, 'valable jusqu\'au passage suivant');
  // sans l'avoir portée : refusée
  const non = honorerCommande(s, c.id, ou);
  assert(!non.ok && /portés au port/.test(non.error), non.error);
  charger(s, { [c.objet]: c.quantite });
  const avant = s.pieces, xp = s.progression.xp, pay = paiementCommande(c);
  const r = honorerCommande(s, c.id, ou);
  assert(r.ok, r.error);
  assertEqual(s.pieces - avant, pay.base + pay.prime, 'le prix plus la prime');
  assertEqual(pay.prime, Math.round((pay.base * c.prime) / 100));
  assert(s.progression.xp - xp >= pay.base + DATA.PORT.COMMANDES.XP, 'l\'XP de la vente et celle de la commande');
  assertEqual(s.port.vendu[c.objet], c.quantite, 'elle part avec le bac');
  assertEqual(commandesDuBac(s).length, L.length - 1, 'honorée : retirée');
  assertEqual(s.port.honorees, 1);
  assert(!honorerCommande(s, c.id, ou).ok, 'une seule fois');
  // le passage suivant : celles qui restent s'effacent, sans rien coûter, d'autres arrivent
  const pieces = s.pieces;
  aller(s, 2 * B.PERIODE, B.HEURES[0] + 1);
  const L2 = commandesDuBac(s);
  assertEqual(s.pieces, pieces, 'manquées : rien ne coûte');
  assert(L2.every((x) => x.jour === 2 * B.PERIODE), 'celles du nouveau passage');
  assertEqual(prendreAvisBac(s).pop().manquees, L.length - 1, 'l\'avis compte celles qui se sont effacées');
  // (la commande du moteur)
  const d = L2[0];
  charger(s, { [d.objet]: d.quantite });
  assert(executerCommande(s, { id: 'h', type: 'port.honorer', args: { commande: d.id, case: ou } }).ok, 'port.honorer');
});

/* ---------- le catalogue d'import ---------- */

test('le catalogue : un rang par niveau du port ; ce que le joueur débloquait le reste ; plus en vente tout de suite', () => {
  const { s, ou } = auPort('catalogue');
  const cat = catalogueImport(s);
  const pommier = cat.find((a) => a.cle === 'objet:jeune_pommier'), cacao = cat.find((a) => a.cle === 'objet:cacao');
  assertEqual(pommier.rang, 1);
  assert(/Verger/.test(pommier.refus), 'le Verger d\'abord');
  assert(/niveau 2/.test(cacao.refus), 'le rang 2 : le port de niveau 2');
  s.progression.niveau = 40;
  s.verger.ouvert = true;
  const arbre = catalogueImport(s).find((a) => a.cle === 'objet:jeune_pommier');
  assert(!arbre.refus || /Verger/.test(arbre.refus), arbre.refus);
  assertEqual(enVenteAuPort(s, 'jeune_pommier'), false, 'un jeune arbre ne s\'achète plus au comptoir');
  assertEqual(enVenteAuPort(s, 'plant_vigne'), false, 'un plant de vigne non plus');
  assert(!etalPort(s).some((o) => o.item === 'cacao'), 'ni le cacao');
  assert(enVenteAuPort(s, 'graine_carotte'), 'les graines du potager, si');
  const r = acheterAuPort(s, 'jeune_pommier', 1, ou);
  assert(!r.ok && /bac/.test(r.error), r.error);
});

test('un import se paie d\'avance et arrive au passage suivant du bac (à la ferme)', () => {
  const { s, ou } = auPort('import', 2, 10);
  s.progression.niveau = 40;
  s.pieces = 1000;
  s.campagne.compteurs.cultures = ['carotte'];
  const vigne = articleDe('objet:plant_vigne');
  assertEqual(catalogueImport(s).find((a) => a.cle === vigne.cle).refus, null, 'le plant de vigne : ouvert');
  const r = commanderImport(s, vigne.cle, 2, ou);
  assert(r.ok, r.error);
  assertEqual(r.cout, 2 * vigne.prix, 'payé d\'avance');
  assertEqual(s.pieces, 1000 - r.cout);
  assertEqual(r.arrive, B.PERIODE, 'le passage suivant');
  assertEqual(importsAttendus(s), [{ cle: vigne.cle, nom: DATA.OBJETS.plant_vigne.nom, icone: DATA.OBJETS.plant_vigne.icone, quantite: 2 * vigne.lot, arrive: B.PERIODE }]);
  assertEqual(countItem(s, 'plant_vigne'), 0, 'pas encore là');
  aller(s, B.PERIODE, B.HEURES[0] - 1);
  avancerBac(s);
  assertEqual(countItem(s, 'plant_vigne'), 0, 'le bac n\'a pas encore accosté');
  aller(s, B.PERIODE, B.HEURES[0]);
  avancerBac(s);
  assertEqual(countItem(s, 'plant_vigne'), 2 * vigne.lot, 'livré à son arrivée');
  assertEqual(importsAttendus(s), []);
  const avis = prendreAvisBac(s).pop();
  assertEqual(avis.livres, [{ cle: vigne.cle, quantite: 2, raison: null }], 'l\'avis de la livraison');
  // commandé un jour de bac après son arrivée : le passage d'après
  assertEqual(commanderImport(s, vigne.cle, 1, ou).arrive, 2 * B.PERIODE);
  // (la commande du moteur)
  assert(executerCommande(s, { id: 'i', type: 'port.importer', args: { article: vigne.cle, quantite: 1, case: ou } }).ok, 'port.importer');
  // un plan : appris à la livraison ; une bête sans place : son prix rendu
  s.port.niveau = 4;
  s.pieces = 2000;
  const plan = DATA.PORT.IMPORT.RANGS[3][0].plan;
  assert(commanderImport(s, `plan:${plan}`, 3, ou).quantite === 1, 'un plan : une fois');
  assert(!commanderImport(s, `plan:${plan}`, 1, ou).ok, 'déjà commandé');
  assert(testBatir(s, 'poulailler').ok, 'le Poulailler');
  s.poulailler.poules = 0;
  assert(commanderImport(s, 'bete:poule', 1, ou).ok, 'une poule');
  s.poulailler.construit = false;
  const avant = s.pieces;
  aller(s, 2 * B.PERIODE, B.HEURES[0]);
  avancerBac(s);
  assert(planConnu(s, plan), 'le plan appris');
  assertEqual(s.pieces, avant + articleDe('bete:poule').prix, 'la poule sans poulailler : son prix rendu');
});

test('les plants sauvages (fiche I7e) s\'inscrivent au catalogue', () => {
  const { s } = auPort('sauvage');
  assert(inscrireSauvage(s, 'baies'), 'inscrit');
  assert(!inscrireSauvage(s, 'baies'), 'une fois');
  const a = catalogueImport(s).find((x) => x.cle === 'sauvage:baies');
  assert(a && a.rang === DATA.PORT.IMPORT.SAUVAGES.RANG, 'au rang des sauvages');
});

/* ---------- le rattrapage ---------- */

test('une absence rattrape les passages manqués, RATTRAPAGE au plus ; la nuit fait passer le bac du jour', () => {
  const { s, ou } = auPort('absence', 2, 10);
  s.progression.niveau = 40;
  s.pieces = 500;
  s.campagne.compteurs.cultures = ['carotte', 'tomate'];
  assert(commanderImport(s, 'objet:plant_vigne', 1, ou).ok);
  aller(s, 2 + 10 * B.PERIODE, 8);
  const r = avancerBac(s);
  assertEqual(r.arrivees.length, B.RATTRAPAGE, 'RATTRAPAGE passages au plus');
  assertEqual(r.arrivees[r.arrivees.length - 1], 10 * B.PERIODE, 'les plus récents');
  assertEqual(countItem(s, 'plant_vigne'), DATA.PORT.IMPORT.RANGS[0].find((a) => a.objet === 'plant_vigne').lot, 'l\'import livré au premier');
  assertEqual(prendreAvisBac(s).length, B.RATTRAPAGE);
  assert(s.port.commandes.every((c) => c.jour === 10 * B.PERIODE), 'seules les commandes du dernier');
  assertEqual(avancerBac(s).arrivees, [], 'rien deux fois');
  // la nuit d'un jour de bac (la journée finie avant son heure) : il est passé
  aller(s, 11 * B.PERIODE, 7);
  runNight(s);
  assertEqual(s.port.passe, 11 * B.PERIODE, 'la nuit l\'a fait passer');
  assertEqual(s.port.parti, 11 * B.PERIODE, 'et repartir');
});

/* ---------- les niveaux ---------- */

test('les niveaux : les matériaux apportés au chantier, les pièces payées ; le quai s\'allonge, le catalogue, les commandes et les villageois suivent', () => {
  const { s, ou } = auPort('niveaux', 2, 10);
  const nx = prochainNiveau(s);
  assertEqual(nx.niveau, 2);
  const prix = DATA.PORT.NIVEAUX[1].prix;
  assertEqual(nx.pieces, prix.pieces);
  assert(!agrandirPort(s, ou).ok, 'sans les matériaux : refusé');
  assert(!apporterAuChantier(s, ou).ok, 'rien de porté');
  // en deux fois : la moitié des planches, puis le reste
  charger(s, { planche: 4 });
  const a = apporterAuChantier(s, ou);
  assert(a.ok, a.error);
  assertEqual(a.apporte, { planche: 4 });
  assertEqual(s.port.chantier.planche, 4);
  const mats = Object.fromEntries(Object.entries(prix).filter(([k]) => k !== 'pieces'));
  for (const [k, n] of Object.entries(mats)) {
    let reste = n - (s.port.chantier[k] || 0);
    while (reste > 0) {
      s.portage.vehicule = 'mains';
      setInv(s, { [k]: reste });
      const c = chargerPortage(s, k, reste, null, { sansPresence: true });
      assert(c.ok, c.error);
      assert(apporterAuChantier(s, ou).ok, 'apporté');
      reste = n - (s.port.chantier[k] || 0);
    }
  }
  assert(prochainNiveau(s).pret, 'tout apporté');
  s.pieces = prix.pieces - 1;
  assert(!agrandirPort(s, ou).ok, 'pas assez de pièces');
  s.pieces = prix.pieces + 10;
  const plafond = plafondVillageois(s), quai = contenuPort(niveauPort(s)).quai;
  const r = executerCommande(s, { id: 'a', type: 'port.agrandir', args: { case: ou } });
  assert(r.ok, r.error);
  assertEqual(r.niveau, 2);
  assertEqual(s.pieces, 10, 'payé');
  assertEqual(niveauPort(s), 2);
  assertEqual(s.port.chantier, {}, 'le chantier vidé');
  assert(contenuPort(2).quai > quai, 'le quai s\'allonge');
  assert(plafondVillageois(s) > plafond, 'plus de villageois accueillis');
  assertEqual(tirerCommandes({ ...s, campagne: { compteurs: { cultures: ['carotte', 'tomate', 'patate', 'oignon'] } } }, 99).length, DATA.PORT.NIVEAUX[1].commandes, 'plus de commandes par passage');
  assert(!/niveau 2/.test(catalogueImport(s).find((x) => x.cle === 'objet:cacao').refus || ''), 'le rang 2 ouvert');
  assertEqual(prochainNiveau(s).niveau, 3);
  s.port.niveau = DATA.PORT.NIVEAUX.length;
  assertEqual(prochainNiveau(s), null, 'le dernier niveau');
});

/* ---------- la sauvegarde, le réglage éteint ---------- */

test('la sauvegarde : v89 → v90 ; le port gardé, un port abîmé réparé, une partie d\'avant sans port laissée telle quelle', () => {
  assertEqual(STATE_VERSION, 90);
  const { s, ou } = auPort('sauvegarde', 2, 10);
  s.progression.niveau = 40;
  s.pieces = 300;
  assert(commanderImport(s, 'objet:plant_vigne', 1, ou).ok);
  s.port.vendu = { carotte: 7 };
  s.port.chantier = { planche: 3 };
  const m = migrate({ ...copie(s), version: 89 });
  assertEqual(m.version, 90);
  assertEqual([m.port.niveau, m.port.imports.length, m.port.vendu, m.port.chantier], [1, 1, { carotte: 7 }, { planche: 3 }], 'gardé');
  const abime = migrate({ ...copie(s), version: 89, port: { niveau: 'x', commandes: 'non', imports: [{ cle: 'objet:licorne', quantite: 1 }], vendu: { carotte: -2, inconnu: 4 } } });
  assertEqual([abime.port.niveau, abime.port.commandes, abime.port.imports, abime.port.vendu], [1, [], [], {}], 'réparé');
  const avant = avecVillage(() => createNewGame(5), false);
  assert(!('port' in avant), 'le réglage éteint : pas de port');
  const v = migrate({ ...copie(avant), version: 89 });
  assert(!('port' in v), 'une partie d\'avant : rien d\'ajouté');
});

test('le réglage éteint : rien ne se lit ni ne s\'écrit', () => {
  avecVillage(() => {
    const s = createNewGame(5);
    assertEqual(avancerBac(s), null);
    assertEqual(portDe(s), null);
    assertEqual(commandesDuBac(s), []);
    assertEqual(etatBac(s), null);
    assertEqual(bacAQuai(s), false);
    runNight(s);
    assert(!('port' in s), 'la nuit n\'ajoute rien');
  }, false);
});

