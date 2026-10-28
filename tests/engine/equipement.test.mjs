/* ==========================================================================
   Tests du moteur : l'équipement de la famille et le sac à provisions (fiche 11).
   - équiper et retirer : l'inventaire est juste, pas de doublon, une pièce par place, un enfant
     seulement à sa taille ; un membre qui part rend ses pièces ;
   - chaque effet s'applique, et seulement quand la pièce est portée (par le personnage principal,
     ou pour la faim d'un autre membre) ;
   - le sac : le remplir (inventaire, réfrigérateur), loin de la ferme on ne mange que lui, le sac
     vide refuse, sur la ferme rien ne change ; il périme ; les alertes ;
   - la migration v59 → v60, la réparation d'une partie ;
   - le joueur automatique, équipé, tient la route.
   Lancer seul : node --test tests/engine/equipement.test.mjs (ou node tests/run-tests.mjs equipement).
   ========================================================================== */

import {
  actionCost, addItem, addMember, alerteFaim, alerteSortie, capaciteSac, casesMembre, choixPieces, countItem,
  createInitialState, DATA, eatSnack, economiePct, enExpedition, equiper, farmTerrain, getNotifications,
  lumiereGrotte, mainCharacter, marcherMembre, migrate, portionsSac, poserSac, refusPiece, remplirSac, removeMember,
  reparerPartie, reprendreSac, retirerPiece, retirerSac, sacCounts, sacPorte, spoil, STATE_VERSION, vitessePied,
  voirAutour, vueNuitPct, aiderMembre, jaugeMembre, botDay, energyMax, craft, craftStatus,
} from '../../js/engine/index.js';
import { assert, assertEqual, partie, reach, setInv, test } from './aide.mjs';

const copie = (x) => JSON.parse(JSON.stringify(x));
const aLHeure = (s, h) => { s.awakeMs = Math.round((h - DATA.TEMPS.HEURE_REVEIL) * DATA.TEMPS.SECONDES_PAR_HEURE * 1000); return s; };
const principal = (s) => mainCharacter(s).id;
const autreAdulte = (s) => s.famille.membres.find((m) => !m.enfant && m.id !== principal(s)).id;
const enfant = (s) => s.famille.membres.find((m) => m.enfant).id;
// Le personnage dans le monde (la sortie de la ferme : hors de son rectangle), ou sur la ferme.
const dehors = (s) => { s.monde.ici = farmTerrain(s).MONDE.cadre.SORTIE; return s; };
const dedans = (s) => { const F = farmTerrain(s).FERME; s.monde.ici = (F.Y + 10) * farmTerrain(s).LARGEUR + F.X + 10; return s; };

/* ---------- équiper et retirer ---------- */

test('équipement : les données (8 pièces, la lanterne-tempête comprise, deux sacs, chacune un objet fabriqué à l\'Atelier ou cousu aux Genêts)', () => {
  const Q = DATA.EQUIPEMENT;
  assertEqual(Object.keys(Q.PIECES).length, 8);
  assertEqual(Object.keys(Q.SACS), ['sac_petit', 'sac_grand']);
  for (const id of [...Object.keys(Q.PIECES), ...Object.keys(Q.SACS)]) {
    assertEqual(DATA.OBJETS[id].categorie, 'équipement', id);
    // (le récit, lot 7 : les vêtements de laine se cousent aux Genêts, data/ile.json)
    const couture = Object.values(DATA.ILE.ATELIERS.couture.recettes).some((r) => r.sortie[id] === 1);
    assert((DATA.ATELIER.RECETTES[id] && DATA.ATELIER.RECETTES[id].sortie[id] === 1) || couture, `${id} : sa recette`);
  }
});

test('équipement : équiper prend la pièce de l\'inventaire, retirer l\'y rend ; une pièce par place, pas de doublon', () => {
  const s = partie(1), p = principal(s);
  setInv(s, { casque_lampe: 1, chapeau_paille: 2, bottes: 1, tablier: 1, salopette: 1 });
  assertEqual(casesMembre(s, p), [null, null, null]);
  assert(equiper(s, p, 'casque_lampe').ok);
  assertEqual([casesMembre(s, p), countItem(s, 'casque_lampe')], [['casque_lampe', null, null], 0], 'portée : plus dans l\'inventaire');
  assertEqual(equiper(s, p, 'casque_lampe').error, 'Plus de casque à lampe dans l\'inventaire.');
  assertEqual(equiper(s, p, 'chapeau_paille').ok, false, 'deux pièces de tête');
  assertEqual(refusPiece(s, p, 'chapeau_paille'), 'Tête : déjà casque à lampe.');
  assert(equiper(s, p, 'tablier', 2).ok, 'dans la case choisie');
  assertEqual(equiper(s, p, 'salopette').ok, false, 'un tablier et une salopette : le corps deux fois');
  assert(equiper(s, p, 'bottes').ok);
  assertEqual(casesMembre(s, p), ['casque_lampe', 'bottes', 'tablier']);
  assertEqual(equiper(s, p, 'chapeau_paille').error, 'Ses cases sont pleines : retire d\'abord une pièce.');
  // le choix d'une case : les pièces de l'inventaire, avec ce qui les refuse
  const choix = choixPieces(s, autreAdulte(s), 0);
  assertEqual(choix.map((c) => [c.item, c.n, c.refus]), [['chapeau_paille', 2, ''], ['salopette', 1, '']]);
  // retirer : la pièce revient, la case se vide
  assert(retirerPiece(s, p, 0).ok);
  assertEqual([casesMembre(s, p), countItem(s, 'casque_lampe')], [[null, 'bottes', 'tablier'], 1]);
  assertEqual(retirerPiece(s, p, 0).ok, false, 'une case vide');
  // un autre membre s'équipe à part : chacun ses pièces
  assert(equiper(s, autreAdulte(s), 'chapeau_paille').ok && equiper(s, p, 'chapeau_paille').ok);
  assertEqual([countItem(s, 'chapeau_paille'), casesMembre(s, autreAdulte(s))[0], casesMembre(s, p)[0]], [0, 'chapeau_paille', 'chapeau_paille']);
  // rien ne se perd ni ne se double : inventaire + porté = ce qu'il y avait
  const total = (item) => countItem(s, item) + s.famille.membres.reduce((t, m) => t + casesMembre(s, m.id).filter((x) => x === item).length, 0);
  assertEqual(['casque_lampe', 'chapeau_paille', 'bottes', 'tablier', 'salopette'].map(total), [1, 2, 1, 1, 1]);
  // un sac n'est pas une pièce
  addItem(s, 'sac_petit', 1);
  assertEqual(equiper(s, p, 'sac_petit').ok, false);
});

test('équipement : un enfant porte seulement les tailles enfant ; un membre qui part rend ses pièces', () => {
  const s = partie(1), e = enfant(s);
  setInv(s, { casque_lampe: 1, gants_travail: 1, salopette: 1, chapeau_paille: 1, bottes: 1 });
  for (const item of ['casque_lampe', 'gants_travail', 'salopette']) assertEqual(equiper(s, e, item).error, `${DATA.OBJETS[item].nom} : pas de taille enfant.`);
  assert(equiper(s, e, 'chapeau_paille').ok && equiper(s, e, 'bottes').ok);
  assert(removeMember(s, e).ok);
  assertEqual([countItem(s, 'chapeau_paille'), countItem(s, 'bottes'), s.equipement.membres[e]], [1, 1, undefined], 'ses pièces reviennent');
});

test('équipement : le casque à lampe se fabrique à l\'Atelier (au niveau du Four), se porte, éclaire ; retiré, plus rien', () => {
  const s = partie(1), p = principal(s);
  s.atelier = { construit: true, niveau: 1 };
  setInv(s, DATA.ATELIER.RECETTES.casque_lampe.entrees);
  if (s.progression.niveau < 5) assertEqual(craftStatus(s, 'casque_lampe').ok, false, 'avant le niveau du Four');
  reach(s, 'four');
  assert(craft(s, 'casque_lampe').ok);
  assertEqual([countItem(s, 'casque_lampe'), countItem(s, 'lingot_fer')], [1, 0]);
  assert(equiper(s, p, 'casque_lampe').ok);
  assertEqual(lumiereGrotte(s), 140);
  assert(retirerPiece(s, p, 0).ok);
  assertEqual([lumiereGrotte(s), countItem(s, 'casque_lampe')], [100, 1]);
});

/* ---------- les effets ---------- */

test('équipement : les gants, le tablier et la salopette font économiser l\'énergie du principal, seulement portés', () => {
  const s = partie(1), p = principal(s);
  setInv(s, { gants_travail: 1, tablier: 1, salopette: 1 });
  const avant = Object.fromEntries(Object.keys(DATA.PERSONNAGE.COUTS).map((a) => [a, actionCost(s, a)]));
  // portés par un autre membre : rien ne change pour le principal
  assert(equiper(s, autreAdulte(s), 'gants_travail').ok);
  assertEqual(actionCost(s, 'couper'), avant.couper);
  assert(retirerPiece(s, autreAdulte(s), 0).ok && equiper(s, p, 'gants_travail').ok);
  assertEqual([economiePct(s, 'couper'), economiePct(s, 'piocher'), economiePct(s, 'planter')], [80, 80, 100]);
  assertEqual(actionCost(s, 'couper'), Math.ceil(avant.couper * 0.8 - 1e-9));
  assertEqual(actionCost(s, 'planter'), avant.planter, 'les gants ne font rien pour planter');
  assert(equiper(s, p, 'tablier').ok);
  for (const a of ['labourer', 'planter', 'arroser', 'recolter', 'cueillir']) assertEqual(economiePct(s, a), 85, a);
  assert(retirerPiece(s, p, 1).ok && equiper(s, p, 'salopette').ok);
  for (const a of Object.keys(DATA.PERSONNAGE.COUTS)) assertEqual(economiePct(s, a), a === 'couper' || a === 'piocher' ? (80 * 92) / 100 : 92, a);
  // retirés : les coûts d'avant
  for (let k = 0; k < 3; k++) if (casesMembre(s, p)[k]) retirerPiece(s, p, k);
  for (const a of Object.keys(avant)) assertEqual(actionCost(s, a), avant[a], a);
});

test('équipement : le chapeau au soleil seulement, le manteau loin de la ferme seulement', () => {
  const s = partie(1), p = principal(s);
  setInv(s, { chapeau_paille: 1, manteau_chaud: 1 });
  assert(equiper(s, p, 'chapeau_paille').ok);
  aLHeure(s, 8);
  assertEqual(economiePct(s, 'arroser'), 100, '8 h : pas encore le grand soleil');
  aLHeure(s, 13);
  assertEqual([economiePct(s, 'arroser'), economiePct(s, 'couper')], [90, 100], '13 h : au soleil, pour les gestes des champs');
  assert(equiper(s, p, 'manteau_chaud').ok);
  dedans(s);
  assertEqual(economiePct(s, 'couper'), 100, 'sur la ferme');
  dehors(s);
  assertEqual(economiePct(s, 'couper'), 85, 'loin de la ferme');
});

test('équipement : le casque éclaire la grotte et voit plus loin la nuit ; les bottes vont plus vite dans le marais', () => {
  const s = partie(1), p = principal(s), t = createInitialState(1);
  setInv(s, { casque_lampe: 1, bottes: 1 });
  assertEqual([lumiereGrotte(s), vueNuitPct(s), vitessePied(s, 'marais')], [100, 100, 1]);
  assert(equiper(s, p, 'casque_lampe').ok && equiper(s, p, 'bottes').ok);
  assertEqual([lumiereGrotte(s), vueNuitPct(s)], [140, 150]);
  assertEqual([vitessePied(s, 'marais'), vitessePied(s, 'montagne'), vitessePied(s, 'prairie'), vitessePied(s, null)], [1.3, 1.2, 1, 1]);
  // la nuit, dans le monde : plus de cellules vues avec le casque ; de jour, autant
  const T = farmTerrain(s), loin = T.MONDE.cadre.SORTIE + 40;
  const vuesNuit = [voirAutour(t, loin, { biome: 'prairie', nuit: true }), voirAutour(s, loin, { biome: 'prairie', nuit: true })];
  assert(vuesNuit[1] > vuesNuit[0], `la nuit : ${vuesNuit}`);
  const s2 = partie(1), t2 = createInitialState(1);
  setInv(s2, { casque_lampe: 1 });
  equiper(s2, principal(s2), 'casque_lampe');
  assertEqual(voirAutour(s2, loin, { biome: 'prairie' }), voirAutour(t2, loin, { biome: 'prairie' }), 'de jour, pareil');
});

test('équipement : pour un autre membre, les bottes et le tablier lui donnent moins faim', () => {
  const s = partie(1), a = autreAdulte(s);
  setInv(s, { bottes: 1, tablier: 1 });
  const F = DATA.FAMILLE.FAIM;
  marcherMembre(s, a, F.PX_PAR_POINT * 8);
  assertEqual(jaugeMembre(s.famille.membres.find((m) => m.id === a)), F.MAX - 8);
  assert(equiper(s, a, 'bottes').ok && equiper(s, a, 'tablier').ok);
  marcherMembre(s, a, F.PX_PAR_POINT * 8);
  assertEqual(jaugeMembre(s.famille.membres.find((m) => m.id === a)), F.MAX - 8 - 6, '−25 % en marchant');
  const avant = jaugeMembre(s.famille.membres.find((m) => m.id === a));
  aiderMembre(s, a, 4);
  assertEqual(jaugeMembre(s.famille.membres.find((m) => m.id === a)), avant - 3, '−25 % en aidant');
});

/* ---------- le sac à provisions ---------- */

test('sac : le poser, le remplir depuis l\'inventaire et le réfrigérateur, à sa capacité, le reprendre, le retirer', () => {
  const s = partie(1);
  dedans(s);
  setInv(s, { sac_petit: 1, sac_grand: 1, carotte: 5, baies: 4, bois: 3 });
  assertEqual(remplirSac(s, 'carotte').error, 'Mets d\'abord un sac dans la quatrième case.');
  assert(poserSac(s, 'sac_petit').ok);
  assertEqual([sacPorte(s), capaciteSac(s), countItem(s, 'sac_petit')], ['sac_petit', 6, 0]);
  assertEqual(remplirSac(s, 'bois').ok, false, 'pas un aliment');
  assert(remplirSac(s, 'carotte', 4).ok);
  // le réfrigérateur
  s.frigo.construit = true;
  s.frigo.items = { pomme: [{ qty: 3, nightsLeft: 10, origin: 'produit' }] };
  const r = remplirSac(s, 'pomme', 5, 'frigo');
  assertEqual([r.moved, s.frigo.items.pomme[0].qty, portionsSac(s)], [2, 1, 6], 'jusqu\'à la capacité');
  assertEqual(remplirSac(s, 'baies').error, 'Le sac est plein : 6 portions.');
  assertEqual(sacCounts(s), { carotte: 4, pomme: 2 });
  assert(reprendreSac(s, 'carotte', 2).ok);
  assertEqual([sacCounts(s).carotte, countItem(s, 'carotte')], [2, 3]);
  // un plus grand sac : le contenu y passe, le petit revient dans l'inventaire
  assert(poserSac(s, 'sac_grand').ok);
  assertEqual([sacPorte(s), capaciteSac(s), countItem(s, 'sac_petit'), sacCounts(s)], ['sac_grand', 12, 1, { carotte: 2, pomme: 2 }]);
  // loin de la ferme, il ne se remplit pas
  dehors(s);
  assertEqual(remplirSac(s, 'baies').error, 'Le sac se remplit à la ferme.');
  dedans(s);
  const r2 = retirerSac(s);
  assert(r2.ok);
  assertEqual([sacPorte(s), countItem(s, 'sac_grand'), countItem(s, 'carotte'), countItem(s, 'pomme')], [null, 1, 5, 2], 'le sac et son contenu dans l\'inventaire');
});

test('sac : loin de la ferme, on ne mange que ce qu\'il contient ; vide, « Manger » refuse ; sur la ferme, rien ne change', () => {
  const s = partie(1);
  setInv(s, { sac_petit: 1, carotte: 10 });
  s.energie = 0;
  dedans(s);
  // sur la ferme : l'inventaire, comme avant
  const e = eatSnack(s, 'carotte');
  assert(e.ok);
  assertEqual(countItem(s, 'carotte'), 9);
  // loin, sans sac
  dehors(s);
  assertEqual(eatSnack(s, 'carotte').error, 'Loin de la ferme, tu ne manges que ce qu\'il y a dans ton sac à provisions, et tu n\'en as pas.');
  dedans(s);
  assert(poserSac(s, 'sac_petit').ok && remplirSac(s, 'carotte', 2).ok);
  dehors(s);
  assert(enExpedition(s));
  const avant = countItem(s, 'carotte');
  const m1 = eatSnack(s, 'carotte'), m2 = eatSnack(s, null);
  assert(m1.ok && m2.ok);
  assertEqual([countItem(s, 'carotte'), portionsSac(s), m2.sac], [avant, 0, 0], 'l\'inventaire n\'a pas bougé : le sac seul');
  assertEqual(eatSnack(s, 'carotte').error, 'Ton sac à provisions est vide : rentre à la ferme pour manger.');
  assertEqual(s.energie, 3 * e.gain, 'trois carottes mangées');
  // de retour sur la ferme : l'inventaire de nouveau
  dedans(s);
  assert(eatSnack(s, 'carotte').ok);
  assertEqual(countItem(s, 'carotte'), avant - 1);
});

test('sac : ce qu\'il contient périme comme l\'inventaire ; les alertes de l\'expédition', () => {
  const s = partie(1);
  dedans(s);
  setInv(s, { sac_petit: 1, baies: 5 });
  assertEqual(alerteSortie(s), 'Tu pars sans sac à provisions : loin de la ferme, tu ne pourras rien manger.');
  assert(poserSac(s, 'sac_petit').ok);
  assertEqual(alerteSortie(s), 'Ton sac à provisions est vide : loin de la ferme, tu ne pourras rien manger.');
  assert(remplirSac(s, 'baies', 2).ok);
  assertEqual(alerteSortie(s), 'Ton sac à provisions est presque vide (2 portions).');
  assert(remplirSac(s, 'baies', 3).ok);
  assertEqual(alerteSortie(s), '');
  // la nuit : les baies se gardent deux nuits, au sac comme ailleurs
  s.nuit.perdus = {};
  spoil(s);
  assertEqual(sacCounts(s), { baies: 5 });
  spoil(s);
  assertEqual([sacCounts(s), s.nuit.perdus.baies], [{}, 5], 'périmées dans le sac');
  // loin de la ferme, le sac vide : l'énergie basse alerte, et une notification le dit
  dehors(s);
  s.energie = energyMax();
  assertEqual(alerteFaim(s), false);
  s.energie = (DATA.EQUIPEMENT.ALERTE.ENERGIE - 1) * 1000;
  assert(alerteFaim(s));
  assert(getNotifications(s).some((n) => n.type === 'sacVide'));
  dedans(s);
  assertEqual([alerteFaim(s), getNotifications(s).some((n) => n.type === 'sacVide')], [false, false], 'sur la ferme : rien');
});

/* ---------- la sauvegarde ---------- */

test('migration v59 → v60 : personne n\'est équipé, pas de sac ; la partie se répare et se relit', () => {
  assert(STATE_VERSION >= 60);
  const neuve = createInitialState(4);
  assertEqual(neuve.equipement, { membres: {}, sac: null });
  const { equipement, ...v59 } = copie(neuve);
  const m = migrate({ v: 59, t: 0, s: { ...v59, version: 59 } }, 60);
  assertEqual([m.version, m.equipement], [60, { membres: {}, sac: null }]);
  // une partie équipée se sauvegarde et se relit telle quelle
  const s = partie(1);
  setInv(s, { casque_lampe: 1, sac_petit: 1, carotte: 3 });
  equiper(s, principal(s), 'casque_lampe');
  poserSac(s, 'sac_petit');
  remplirSac(s, 'carotte', 3);
  const relue = migrate({ v: s.version, t: 0, s: copie(s) });
  assertEqual(relue.equipement, s.equipement);
  // abîmée : l'équipement en texte reprend la forme de départ
  const b = copie(s);
  b.equipement = 'casque';
  assertEqual(reparerPartie(b).equipement, { membres: {}, sac: null });
  assertEqual(casesMembre({ ...b, equipement: { membres: { x: 'y' } } }, 'x'), [null, null, null]);
});

/* ---------- le joueur automatique ---------- */

test('le joueur automatique, équipé (gants, tablier), joue ses journées : moins d\'énergie, rien ne casse', () => {
  const s = partie(2), p = principal(s);
  addItem(s, 'gants_travail', 1);
  addItem(s, 'tablier', 1);
  assert(equiper(s, p, 'gants_travail').ok && equiper(s, p, 'tablier').ok);
  const coutAvant = actionCost(createInitialState(2), 'recolter');
  assert(actionCost(s, 'recolter') <= coutAvant);
  for (let j = 0; j < 4; j++) botDay(s, { eveilS: 600 }, {});
  assertEqual(casesMembre(s, p), ['gants_travail', 'tablier', null], 'toujours équipé');
  assert(Number.isFinite(s.energie) && s.day >= 5, `jour ${s.day}`);
});
