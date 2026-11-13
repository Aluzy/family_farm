/* ==========================================================================
   Tests du chantier « l'île à bâtir » : les commerces d'artisans et la forge (docs/ile.md, fiche I5a ;
   js/engine/artisans.js). Comme tous les fichiers tests/engine/village-*.test.mjs, il tourne avec VILLAGE.ACTIF forcé
   à true.
   - l'envie : JOURS jours à la tâche de la filière (comptés la nuit), une ligne de la chronique, sa bulle ; elle ne
     s'éteint pas ; l'affinité (le palier d'amitié) ; le local (l'établi et le comptoir dans une pièce close, l'enseigne
     dehors près de la porte) ; la décision du joueur, ce qui manque dit sans détour ; à l'ouverture, le nom, la
     chronique, la fête, la tâche du commerce ;
   - le travail : le poste devant l'établi ; LOTS lots par jour, un de plus avec l'ancienneté, jamais avec l'argent ;
     les matières achetées au coffre de sa bourse (les pièces au joueur), son stock d'abord ; bourse vide : rien que
     les commandes ; l'amitié lui apprend des pièces ;
   - la vente : au joueur, aux villageois (leur créneau au comptoir, ce dont ils ont besoin), au bac ; le travail à
     façon ; les commandes payées ;
   - l'Atelier du joueur : ce que la forge fait, il ne le fait plus, seulement si une forge est ouverte ;
   - le journal et le tableau ; la sauvegarde (98 → 99) ; les commandes du moteur ; le joueur automatique ; éteint,
     rien.
   Lancer seul : node tests/run-tests.mjs village-artisans.
   ========================================================================== */

import {
  achatsCommercesDuJour, acheterAuCommerce, acheterAuComptoir, actionsDuJour, addItem, arriverVillageois, attribuer, avancerBac,
  awakeMsAtHour, bilanCommerce, botCommerce, chroniqueDe, commanderAuCommerce, commercesAuBac, commercesDe,
  conditionsCommerce, countItem, craftStatus, createNewGame, DATA, donnerOutil, executerCommande, farmSeed, farmTerrain, journeeDuVillage,
  locaux, lotCommerce, lotsDuJour, migrate, nomDe, ouvrirCommerce, parlerVillageois, paroleVillageois, portDuMonde, postesDe,
  prixArtisan, recetteDebloquee, recettesConnues, runNight, STATE_VERSION, tableauVillage, tacheDef, testMaisonVillageois,
  lettresCommerce, travailleAujourdhui, trouverVillageois, villageoisDe,
} from '../../js/engine/index.js';
import { ajouterAmitie, palierAmitie } from '../../js/engine/amitie.js';
import { testLocalCommerce } from '../../js/engine/testmode.js';
import { feteDuJourVillage, villageVocation } from '../../js/engine/fetes-village.js';
import { assert, assertEqual, avecVillage, boite, partie, test } from './aide.mjs';

const copie = (o) => JSON.parse(JSON.stringify(o));
const AR = DATA.ARTISANS;
const SEUIL = DATA.RECIT.PALIERS[AR.AMITIE];

// L'île de test : le port, `n` villageois dans leurs maisons, la boîte pleine, les outils du joueur.
function ile(n = 2, seed = 1) {
  const s = partie(seed);
  portDuMonde(farmSeed(s));
  boite(s, { pain: 200 });
  s.outils = { hache: true, pioche: true, faux: true, canne: true, choisi: 'hache' };
  for (let k = 0; k < n; k++) assert(testMaisonVillageois(s).ok, 'la maison');
  const V = [];
  for (let k = 0; k < n; k++) V.push(arriverVillageois(s, { direct: true }).villageois);
  return { s, V };
}

// Un mineur qui a son envie, ami du joueur, et le local bâti : la forge ouverte. → { s, V, v (l'artisan), c, local }.
function forge(n = 2, seed = 1) {
  const { s, V } = ile(n, seed);
  const v = V[0];
  assert(donnerOutil(s, v.id, 'pioche').ok && attribuer(s, v.id, 'pierre').ok, 'à la pierre');
  v.pratique = { pierre: AR.JOURS };
  runNight(s);
  ajouterAmitie(s, v.id, SEUIL);
  const local = testLocalCommerce(s, 'forge', true);
  assert(local.ok, 'le local');
  const r = ouvrirCommerce(s, v.id, 'forge');
  assert(r.ok, `ouvert : ${r.error || ''}`);
  return { s, V, v, c: r.commerce, local, r };
}

/* ---------- l'envie, les conditions, la décision ---------- */

test('l\'envie : JOURS jours à la tâche de la filière, comptés la nuit ; une ligne de la chronique, sa bulle ; elle ne s\'éteint pas', () => {
  assertEqual([AR.JOURS, AR.LOTS, AR.AMITIE], [10, 3, 2], 'les réglages proposés');
  const { s, V: [v, w] } = ile();
  assert(donnerOutil(s, v.id, 'pioche').ok && attribuer(s, v.id, 'pierre').ok, 'à la pierre');
  // (une journée de travail compte un jour de pratique ; sans travail, rien)
  s.awakeMs = awakeMsAtHour(12);
  v.travail = { jour: s.day, tache: 'pierre', actions: 2, produit: {}, utilise: {}, essai: 0 };
  runNight(s);
  assertEqual(v.pratique.pierre, 1, 'un jour');
  assertEqual(w.pratique, undefined, 'sans tâche, rien');
  v.pratique.pierre = AR.JOURS - 1;
  // (une nuit sans tâche : pas de jour de pratique, pas d'envie)
  attribuer(s, v.id, null);
  runNight(s);
  assertEqual([v.pratique.pierre, v.envies], [AR.JOURS - 1, undefined], 'pas encore');
  attribuer(s, v.id, 'pierre');
  v.travail ={ jour: s.day, tache: 'pierre', actions: 1, produit: {}, utilise: {}, essai: 0 };
  runNight(s);
  assertEqual(v.envies, { forge: s.day - 1 }, 'l\'envie est née');
  assertEqual(s.nuit.artisans.envies, [{ id: v.id, sorte: 'forge' }], 'la nuit le dit (la page en fait une notification)');
  const l = chroniqueDe(s).lignes.find((x) => x.type === 'envie');
  assert(l && l.d.qui === v.id && l.d.quoi === 'une forge', 'la chronique : « … rêve d\'ouvrir une forge. »');
  // (sa bulle : il la dit à la première conversation du jour)
  const r = parlerVillageois(s, v.id, paroleVillageois(s, v.id, { heure: 17 }));
  assertEqual(r.envie, 'forge', 'il en parle');
  assert(AR.COMMERCES.forge.ENVIE.includes(r.texte), `« ${r.texte} »`);
  // (elle ne s'éteint pas : une autre tâche, des nuits passent)
  attribuer(s, v.id, 'bois');
  for (let k = 0; k < 3; k++) runNight(s);
  assert(Number.isInteger(v.envies.forge), 'toujours là');
  assertEqual(chroniqueDe(s).lignes.filter((x) => x.type === 'envie').length, 1, 'une seule ligne');
});

test('les conditions : l\'envie, l\'affinité, le local ; la fiche dit ce qui manque ; le joueur décide (ou pas)', () => {
  const { s, V: [v] } = ile();
  let C = conditionsCommerce(s, v.id, 'forge');
  assertEqual([C.ok, C.envie.ok, C.amitie.ok, C.local.ok], [false, false, false, false], 'rien encore');
  assert(/10 jours/.test(C.envie.texte) && /cordial/.test(C.amitie.texte) && /enclume/.test(C.local.texte), `dit : ${C.envie.texte} / ${C.amitie.texte} / ${C.local.texte}`);
  assert(!ouvrirCommerce(s, v.id, 'forge').ok, 'refusé');
  v.envies = { forge: s.day };
  ajouterAmitie(s, v.id, SEUIL);
  C = conditionsCommerce(s, v.id, 'forge');
  assertEqual([C.envie.ok, C.amitie.ok, C.local.ok], [true, true, false], 'le local manque');
  // (le local : l'établi seul, puis le comptoir, puis l'enseigne)
  const L = testLocalCommerce(s, 'forge', true);
  const B = s.blocs, ens = B[L.enseigne], comp = B[L.comptoir];
  delete B[L.enseigne]; delete B[L.comptoir];
  assert(/comptoir/.test(conditionsCommerce(s, v.id, 'forge').local.texte), 'il manque le comptoir');
  B[L.comptoir] = comp;
  assert(/enseigne/.test(conditionsCommerce(s, v.id, 'forge').local.texte), 'il manque l\'enseigne');
  B[L.enseigne] = ens;
  assertEqual(locaux(s, 'forge').map((l) => l.complet), [true], 'le local est bâti');
  assert(conditionsCommerce(s, v.id, 'forge').ok, 'tout y est');
  // (le joueur laisse l'envie sans suite : rien ne change, rien n'est compté)
  for (let k = 0; k < 2; k++) runNight(s);
  assertEqual([commercesDe(s).length, v.tache], [0, null], 'pas de minuterie cachée');
  // (il décide)
  const r = ouvrirCommerce(s, v.id, 'forge');
  assert(r.ok, 'ouvert');
  assertEqual([v.tache, v.commerce, r.commerce.qui, r.commerce.etabli], ['forge', r.commerce.id, v.id, L.etabli], 'l\'artisan, son établi');
  assertEqual(nomDe(s, 'commerce', r.commerce.id), r.nom, 'I7g : son nom');
  assert(chroniqueDe(s).lignes.some((x) => x.type === 'commerce' && x.d.qui === v.id), 'la chronique');
  assert(villageVocation(s).fetes.some((f) => f.sorte === 'ouverture' && f.commerce === r.commerce.id), 'I8a : la fête de l\'ouverture');
  assert(feteDuJourVillage(s, r.fete.jour), 'fixée');
  // (le palier 6 le compte ; un seul commerce par artisan ; le local est pris)
  assert(!ouvrirCommerce(s, v.id, 'forge').ok, 'déjà ouvert');
  assert(!attribuer(s, v.id, 'bois').ok, 'l\'artisan garde sa tâche');
  const autre = arriverVillageois(s, { direct: true });
  assert(!autre.ok || !attribuer(s, autre.villageois.id, 'forge').ok, 'la tâche d\'un commerce ne se confie pas');
});

/* ---------- le travail ---------- */

test('le travail : à l\'établi, LOTS lots par jour ; un de plus avec l\'ancienneté ; jamais plus avec l\'argent', () => {
  const { s, v, c, local } = forge();
  assertEqual(tacheDef('forge').lieu, 'commerce');
  const P = postesDe(s, 'forge', v);
  assert(P.length === 1 && P[0].dedans && s.blocs[P[0].case] === undefined, 'un poste dans la pièce');
  assertEqual([P[0].case, P[0].vers], [local.etabli + 1 + farmTerrain(s).LARGEUR, local.etabli + 1], 'devant l\'enclume (la moitié droite de l\'établi)');
  assert(travailleAujourdhui(s, v), 'il travaille');
  assertEqual([lotsDuJour(c), actionsDuJour(s, v)], [AR.LOTS, AR.LOTS], 'LOTS');
  v.bourse = 100000;
  addItem(s, 'minerai_fer', 200); addItem(s, 'bois', 200);
  assertEqual(actionsDuJour(s, v), AR.LOTS, 'l\'argent ne change rien');
  c.jours = AR.ANCIENNETE;
  assertEqual(lotsDuJour(c), AR.LOTS + 1, 'l\'ancienneté : un lot de plus');
  c.jours = 100 * AR.ANCIENNETE;
  assertEqual(lotsDuJour(c), AR.LOTS_MAX, 'LOTS_MAX au plus');
  c.jours = 0;
  // (la journée : ses créneaux de travail sont devant l'établi)
  const segs = journeeDuVillage(s).get(v.id).filter((x) => x.etat === 'travail');
  assert(segs.length && segs.every((x) => x.lieu.case === P[0].case && x.lieu.dedans), 'à son poste');
  // (la nuit : il fait ses lots, l'ancienneté monte)
  runNight(s);
  const J = v.journal[v.journal.length - 1];
  assertEqual([J.tache, J.actions], ['forge', AR.LOTS], 'son journal');
  assertEqual(c.jours, 1, 'un jour d\'ancienneté');
  assertEqual(c.journal.find((x) => x.jour === s.day - 1).lots, AR.LOTS, 'le journal du commerce');
});

test('les matières : son stock d\'abord, puis le coffre, achetées de sa bourse au prix de vente (les pièces au joueur) ; bourse vide, rien', () => {
  const { s, v, c } = forge();
  addItem(s, 'minerai_fer', 8); addItem(s, 'bois', 8);
  v.bourse = 30;
  const pieces = s.pieces, minerai = countItem(s, 'minerai_fer');
  const r = lotCommerce(s, v);
  assert(r.ok && r.lot.recette === 'lingot_fer', 'un lingot d\'abord (rien en vente)');
  const cout = 4 * prixArtisan('minerai_fer') + 3 * prixArtisan('bois');
  assertEqual([s.pieces - pieces, 30 - v.bourse, minerai - countItem(s, 'minerai_fer')], [cout, cout, 4], 'payé au joueur, de sa bourse');
  assertEqual(r.produit, { pieces: cout }, 'son produit pour le tableau : ce qu\'il a payé à la ferme');
  assertEqual(c.stock, { lingot_fer: 1 }, 'au comptoir');
  // (il fond d'abord, jusqu'à STOCK lingots ; puis des clous : de son lingot, rien acheté)
  c.stock.lingot_fer = AR.STOCK;
  const p2 = s.pieces;
  const r2 = lotCommerce(s, v);
  assert(r2.ok && r2.lot.recette === 'clous' && s.pieces === p2, 'son stock d\'abord');
  assertEqual(c.stock, { lingot_fer: AR.STOCK - 1, clous: 4 });
  // (GARDE : il laisse au coffre de quoi au joueur)
  for (const o of ['minerai_fer', 'bois']) { const n = countItem(s, o); if (n) s.inventaire[o] = []; }
  addItem(s, 'minerai_fer', 4); addItem(s, 'bois', 3 + AR.GARDE - 1);
  v.bourse = 1000;
  const r3 = lotCommerce(s, v);
  assert(!r3.ok || r3.lot.recette !== 'lingot_fer', 'pas sous GARDE');
  // (bourse vide : rien à son compte)
  addItem(s, 'bois', 10); addItem(s, 'minerai_fer', 10);
  c.stock = {};
  v.bourse = 0;
  assert(!lotCommerce(s, v).ok, 'bourse vide : il attend les commandes');
  // (l'amitié lui apprend des pièces)
  assertEqual(recettesConnues(s, c).map((x) => x.id), ['lingot_fer', 'clous', 'lame'], 'cordial');
  ajouterAmitie(s, v.id, DATA.RECIT.PALIERS[3]);
  assert(recettesConnues(s, c).some((x) => x.id === 'charniere') && palierAmitie(s, v.id) >= 3, 'proche : les charnières, le cuivre');
});

/* ---------- la vente, la façon ---------- */

test('la vente : au joueur (ses pièces à l\'artisan), aux villageois (leur créneau au comptoir), au bac', () => {
  const { s, V: [v, w], c, local } = forge();
  c.stock = { lingot_fer: 2, lame: 3, clous: 6 };
  // (au joueur)
  s.pieces = 500;
  const b0 = v.bourse;
  const r = acheterAuCommerce(s, c.id, 'lingot_fer', 1);
  assert(r.ok && r.prix === prixArtisan('lingot_fer'), 'acheté');
  assertEqual([s.pieces, v.bourse - b0, countItem(s, 'lingot_fer') >= 1, c.stock.lingot_fer], [500 - r.prix, r.prix, true, 1], 'ses pièces vont à l\'artisan');
  assert(!acheterAuCommerce(s, c.id, 'lingot_fer', 5).ok, 'pas plus qu\'il n\'en a');
  // (aux villageois : celui qui tient un outil a besoin d'une lame, tous les ENTRETIEN jours)
  w.outil = 'hache'; w.bourse = 100; w.gouts = {};
  const A = achatsCommercesDuJour(s);
  assertEqual(A.get(w.id), { commerce: c.id, objet: 'lame', fait: false }, 'il ira au comptoir');
  assert(!A.has(v.id), 'pas chez lui');
  const seg = journeeDuVillage(s).get(w.id).find((x) => x.but && x.but.sorte === 'commerce');
  assert(seg && seg.lieu.dedans && seg.lieu.vers === local.comptoir, 'son créneau, devant le comptoir');
  assert(seg.de >= DATA.TACHES.TRAVAIL[1][1] - 1, 'après le travail');
  const vb = v.bourse;
  const a = acheterAuComptoir(s, w.id, c.id, 'lame');
  assert(a.ok && a.envie === 'besoin', 'acheté');
  assertEqual([w.bourse, v.bourse - vb, w.entretien, c.stock.lame], [100 - prixArtisan('lame'), prixArtisan('lame'), s.day, 2], 'de sa bourse à celle de l\'artisan');
  assert(!acheterAuComptoir(s, w.id, c.id, 'lame').ok, 'un achat par jour');
  runNight(s);
  assertEqual(achatsCommercesDuJour(s).has(w.id), false, 'pas avant ENTRETIEN jours');
  // (au bac : ce qui dépasse BAC de chaque pièce qui se vend au port ; les lingots restent)
  c.stock = { lingot_fer: 3, clous: 6, lame: 2 };
  const vb2 = v.bourse, vendu = {};
  const out = commercesAuBac(s, s.day, vendu);
  assertEqual(c.stock, { lingot_fer: 3, clous: AR.BAC, lame: AR.BAC }, 'le reste au bac');
  assertEqual(vendu, { clous: 6 - AR.BAC, lame: 2 - AR.BAC }, 'dans ses caisses');
  assertEqual(v.bourse - vb2, out[c.id], 'pour sa bourse');
});

test('le travail à façon : le joueur apporte la matière et paie la façon ; la pièce lui revient, même bourse vide', () => {
  const { s, v, c } = forge();
  s.pieces = 300; v.bourse = 0;
  assert(!commanderAuCommerce(s, c.id, 'clous', { facon: true }).ok, 'sans la matière');
  addItem(s, 'lingot_fer', 1);
  const k = commanderAuCommerce(s, c.id, 'clous', { facon: true });
  assert(k.ok, 'commandé');
  const facon = Math.max(AR.FACON_MIN, Math.floor((4 * prixArtisan('clous') * AR.FACON) / 100));
  assertEqual([k.commande.prix, s.pieces, v.bourse, countItem(s, 'lingot_fer')], [facon, 300 - facon, facon, 0], 'la façon, la matière apportée');
  const avant = countItem(s, 'clous');
  const r = lotCommerce(s, v);
  assert(r.ok && r.lot.commande && r.lot.commande.facon, 'au lot suivant, avant le reste');
  assertEqual([countItem(s, 'clous') - avant, c.commandes.length], [4, 0], 'les clous dans l\'inventaire');
  // (payée d'avance : le prix de la pièce ; il achète la matière comme pour lui)
  addItem(s, 'minerai_fer', 8); addItem(s, 'bois', 8);
  const k2 = commanderAuCommerce(s, c.id, 'lingot_fer');
  assert(k2.ok && k2.commande.prix === prixArtisan('lingot_fer'), 'payée');
  const l0 = countItem(s, 'lingot_fer');
  assert(lotCommerce(s, v).ok && countItem(s, 'lingot_fer') === l0 + 1, 'livrée');
  // (COMMANDES au plus ; ce qu'il ne sait pas encore)
  for (let i = 0; i < AR.COMMANDES; i++) assert(commanderAuCommerce(s, c.id, 'lingot_fer').ok, 'en attente');
  assert(!commanderAuCommerce(s, c.id, 'lingot_fer').ok, 'COMMANDES au plus');
  c.commandes = [];
  assert(/amitié/.test(commanderAuCommerce(s, c.id, 'lingot_or').error), 'l\'or : votre amitié le lui apprendra');
});

/* ---------- l'Atelier du joueur : jamais bloqué ---------- */

test('l\'Atelier : sans forge, le joueur fait ses clous, ses charnières, ses lames ; une forge ouverte qui les sait les lui retire', () => {
  const { s, V: [v] } = ile();
  s.atelier = { construit: true, niveau: DATA.ATELIER.NIVEAU };
  addItem(s, 'lingot_fer', 5); addItem(s, 'bois', 5);
  for (const r of ['clous', 'charniere', 'lame', 'comptoir', 'enseigne_forge', 'enclume_foyer']) assert(recetteDebloquee(s, r), `${r} à l'Atelier`);
  assert(craftStatus(s, 'clous').ok, 'il peut faire ses clous');
  v.envies = { forge: 1 };
  ajouterAmitie(s, v.id, SEUIL);
  testLocalCommerce(s, 'forge', true);
  assert(ouvrirCommerce(s, v.id, 'forge').ok, 'la forge ouverte');
  assert(!recetteDebloquee(s, 'clous') && !recetteDebloquee(s, 'lame'), 'la forge les fait désormais');
  assert(/forge/.test(craftStatus(s, 'clous').raison), craftStatus(s, 'clous').raison);
  assert(recetteDebloquee(s, 'charniere'), 'les charnières, tant qu\'il ne les sait pas : le joueur n\'est pas bloqué');
  assert(recetteDebloquee(s, 'comptoir') && recetteDebloquee(s, 'enseigne_forge'), 'ce qui n\'est pas à la forge reste');
  // (sans forge, rien ne change pour le jeu éteint)
  avecVillage(() => { const t = createNewGame(3); assert(!recetteDebloquee(t, 'clous'), 'éteint : pas de recette du chantier'); }, false);
});

/* ---------- le tableau, la sauvegarde, les commandes, le joueur automatique, éteint ---------- */

test('le tableau : une ligne par commerce ; l\'artisan rapporte ce qu\'il paie à la ferme', () => {
  const { s, v, c } = forge(2);
  addItem(s, 'minerai_fer', 40); addItem(s, 'bois', 40);
  v.bourse = 200;
  runNight(s);
  const T = tableauVillage(s, 'hier');
  assertEqual(T.commerces.length, 1);
  const L = T.commerces[0], B = bilanCommerce(s, c, 1);
  assertEqual([L.id, L.lots, L.prenom], [c.id, AR.LOTS, v.prenom], 'la ligne');
  assert(L.paye > 0 && L.paye === B.paye, `payé à la ferme : ${L.paye}`);
  const l = T.lignes.find((x) => x.id === v.id);
  assertEqual([l.tache, l.valeur], ['forge', L.paye], 'son produit : ce qu\'il a payé à la ferme');
  assertEqual(l.part, 0, 'pas de part : il est payé par son commerce');
});

test('la sauvegarde : v98 → v99 ; les commerces et les artisans gardés, réparés ; une partie d\'avant laissée telle quelle', () => {
  assertEqual(STATE_VERSION, 99, 'le format 99');
  const { s, v, c } = forge();
  c.stock = { lingot_fer: 2 };
  c.commandes = [{ n: 1, recette: 'clous', facon: true, prix: 7, jour: 2 }];
  const m = migrate({ ...copie(s), version: 98 });
  assertEqual(m.version, STATE_VERSION);
  const mc = m.commerces[0], mv = m.villageois.find((x) => x.id === v.id);
  assertEqual([mc.id, mc.stock, mc.commandes.length, mc.ouvert, mv.tache, mv.commerce], [c.id, { lingot_fer: 2 }, 1, true, 'forge', c.id], 'gardé');
  const abime = copie(s);
  abime.commerces = [{ id: 'x', sorte: 'licorne' }, { ...copie(c), stock: { lingot_fer: -3, rien: 2 }, commandes: [{ recette: 'nimporte' }], journal: 'x' }];
  abime.villageois[1].tache = 'forge';
  abime.villageois[1].envies = { forge: 'x', licorne: 3 };
  const a = migrate({ ...abime, version: 98 });
  assertEqual([a.commerces.length, a.commerces[0].stock, a.commerces[0].commandes, a.commerces[0].journal], [1, {}, [], []], 'réparé');
  assertEqual([a.villageois[1].tache, a.villageois[1].envies], [null, {}], 'pas d\'artisan sans commerce');
  const avant = avecVillage(() => createNewGame(5), false);
  const x = migrate({ ...copie(avant), version: 98 });
  assert(!('commerces' in x), 'une partie d\'avant : rien d\'ajouté');
});

test('les commandes du moteur : commerce.ouvrir, commerce.acheter, commerce.commander', () => {
  const { s, V: [v] } = ile();
  v.envies = { forge: 1 };
  ajouterAmitie(s, v.id, SEUIL);
  testLocalCommerce(s, 'forge', true);
  const o = executerCommande(s, { id: 'o', type: 'commerce.ouvrir', args: { id: v.id, sorte: 'forge' } });
  assert(o.ok, 'ouvert');
  const c = commercesDe(s)[0];
  c.stock = { clous: 4 };
  s.pieces = 100;
  assert(executerCommande(s, { id: 'a', type: 'commerce.acheter', args: { commerce: c.id, objet: 'clous', quantite: 2 } }).ok, 'acheté');
  addItem(s, 'lingot_fer', 1);
  assert(executerCommande(s, { id: 'c', type: 'commerce.commander', args: { commerce: c.id, recette: 'clous', facon: true } }).ok, 'commandé');
  assert(!executerCommande(s, { id: 'x', type: 'commerce.acheter', args: { commerce: c.id, objet: 'licorne', quantite: 1 } }).ok, 'mal formée');
  // (I8a : les lettres de l'enseigne, une fois débloquées par le village convivial)
  assert(!executerCommande(s, { id: 'l', type: 'commerce.lettres', args: { commerce: c.id, lettres: 'or' } }).ok, 'pas encore débloquées');
  s.vocations = { paliers: { village: DATA.VOCATIONS.village.PALIERS.length } };
  assert(executerCommande(s, { id: 'l2', type: 'commerce.lettres', args: { commerce: c.id, lettres: 'or' } }).ok, 'les lettres dorées');
  assertEqual(lettresCommerce(s, c), DATA.VOCATIONS.village.ENSEIGNES.find((x) => x.id === 'or').texte);
});

test('le joueur automatique : un mineur, une conversation par jour, le local, la décision ; puis il garde du minerai au coffre', () => {
  const { s, V } = ile(3);
  s.palier = DATA.SIMULATION.VILLAGEOIS.COMMERCE.PALIER;
  botCommerce(s);
  const v = V.find((x) => x.tache === 'pierre');
  assert(v, 'un villageois à la pierre');
  assertEqual(palierAmitie(s, v.id) >= 1, true);
  v.envies = { forge: s.day };
  ajouterAmitie(s, v.id, SEUIL);
  const id = botCommerce(s);
  assert(id && commercesDe(s)[0].qui === v.id, `ouvert : ${id}`);
  botCommerce(s);
  assert(countItem(s, 'minerai_fer') >= DATA.SIMULATION.VILLAGEOIS.COMMERCE.MATIERES.minerai_fer, 'du minerai au coffre');
});

test('éteint : ni envie, ni commerce, ni lot ; la nuit ne change rien', () => {
  avecVillage(() => {
    const s = createNewGame(2);
    assertEqual([commercesDe(s), tacheDef('forge') && tacheDef('forge').commerce, achatsCommercesDuJour(s).size], [[], 'forge', 0]);
    s.commerces = [{ id: 'forge-1', sorte: 'forge', qui: 'x' }];
    assertEqual(commercesDe(s), [], 'rien ne se lit');
    runNight(s);
    assert(!s.nuit.artisans, 'rien la nuit');
    assert(!ouvrirCommerce(s, 'x', 'forge').ok, 'refusé');
  }, false);
});
