/* ==========================================================================
   Tests du chantier « l'île à bâtir » : le garde-manger commun et la cuisine du village (docs/ile.md, fiche I3e ;
   js/engine/garde-manger.js). Comme tous les fichiers tests/engine/village-*.test.mjs, il tourne avec VILLAGE.ACTIF
   forcé à true.
   - le garde-manger : rendu commun (la boîte, le réfrigérateur), les refus, la réserve visée ;
   - les dépôts du travail : ce qui se mange, jusqu'à la réserve, le reste au coffre ; rien à 0 ;
   - la boîte commune reste celle du village le réfrigérateur acheté : la famille au réfrigérateur, le village à la boîte ;
     la fraîcheur : la boîte vieillit, le réfrigérateur alimenté conserve ;
   - la cuisine du village : la cuisinière désignée, ses postes, les plats du garde-manger rangés au garde-manger, la
     farine au coffre, la file du joueur libre ; deux cuisiniers font deux fois plus de plats ; le menu, ce qui manque ;
   - la tablée : un plat partagé nourrit plusieurs villageois, chacun goûte à tous ; ce qui n'est pas entamé revient ;
   - le tableau (sa ligne), la vapeur, la journée (la table commune d'abord) ;
   - la sauvegarde v102 → v103 ; les commandes ; le joueur automatique ; éteint, rien.
   Lancer seul : node tests/run-tests.mjs village-garde-manger.
   ========================================================================== */

import {
  addItem, arriverVillageois, attribuer, awakeMsAtHour, besoinDuVillage, caseBatissable, farmTerrain, meteoDuJour, poserBloc, positionVillageois, boiteCounts, botVillageois, contenuGardeManger, countItem, cuisineDuVillage,
  cuisinesDuVillage, cuisineVillageAllumee, DATA, deposerDuTravail, designerCuisine, designerGardeManger, energieGardeManger,
  etatGardeManger, executerCommande, farmSeed, fridgeCounts, gardeManger, journeeDuVillage, lieuxDuVillage, ligneGardeManger, migrate,
  moveToFridge, platDuVillage, portDuMonde, postesDe, prochainPlat, reglerReserve, reparerGardeManger, runNight, sourceRepas,
  STATE_VERSION, tableauVillage, tachesNuit, tachesPour, testBatir, testMaisonVillageois, villageoisDe, villageoisNuit,
} from '../../js/engine/index.js';
import { assert, assertEqual, avecVillage, boite, partie, reach, test } from './aide.mjs';

const copie = (o) => JSON.parse(JSON.stringify(o));
const GM = DATA.VILLAGE.GARDE_MANGER;
const AJ = DATA.FAMILLE.AJ.adulte;

// La partie de test : le foyer, le port, `n` maisons de villageois et leurs villageois ; la boîte posée (vide, ou
// `dedans`), la cuisinière et le four bâtis.
function ile(n = 2, dedans = {}) {
  const s = reach(reach(partie(1), 'four'), 'frigo');
  portDuMonde(farmSeed(s));
  boite(s, dedans);
  for (let k = 0; k < n; k++) assert(testMaisonVillageois(s).ok, 'la maison');
  const V = [];
  for (let k = 0; k < n; k++) {
    const r = arriverVillageois(s, { direct: true });
    assert(r.ok, 'il arrive');
    V.push(r.villageois);
  }
  return { s, V };
}

const caseDe = (s, sorte) => Number(Object.keys(s.blocs).find((t) => s.blocs[t] === sorte));

// La cuisine du village : la boîte commune, la cuisinière désignée (le foyer de test n'a pas la place du four).
function cuisine(s) {
  assert(testBatir(s, 'cuisine').ok, 'la cuisinière');
  assert(designerGardeManger(s, true).ok, 'la boîte commune');
  assert(designerCuisine(s, caseDe(s, 'cuisiniere')).ok, 'la cuisinière du village');
  assert(cuisineDuVillage(s), 'la cuisine du village tourne');
}

/* ---------- les réglages ---------- */

test('GARDE_MANGER : la réserve, ses choix, la cuisine du village (ses plats existent, à la cuisinière ou au four)', () => {
  assert(GM && GM.RESERVES.includes(GM.RESERVE), 'la réserve par défaut est un des choix');
  assert(GM.CUISINE.ACTIONS > DATA.TACHES.LISTE.cuisine.ACTIONS, 'la cuisine du village fait plus de plats que la cuisine d\'I3c');
  for (const r of GM.CUISINE.RECETTES) assert(DATA.RECETTES[r] && ['cuisine', 'four'].includes(DATA.RECETTES[r].station), r);
  assert(GM.CUISINE.PHRASES.length && GM.CUISINE.NOM && GM.CUISINE.SANS, 'ses textes');
});

/* ---------- le garde-manger ---------- */

test('le garde-manger : rendu commun d\'un appui, sa réserve ; les refus', () => {
  const { s } = ile(1);
  assertEqual(gardeManger(s), null, 'pas encore commun');
  const r = designerGardeManger(s, true);
  assert(r.ok && r.sorte === 'boite', 'la boîte posée');
  assertEqual(gardeManger(s).sorte, 'boite');
  assert(!designerGardeManger(s, true, 'frigo').ok, 'pas de réfrigérateur : refusé');
  assertEqual(reglerReserve(s, 5).reserve, 5);
  assert(!reglerReserve(s, -1).ok && !reglerReserve(s, 11).ok, 'une réserve de 0 à 10 jours');
  assert(designerGardeManger(s, false).ok && gardeManger(s) === null, 'repris');
  const vide = partie(2);
  assert(!designerGardeManger(vide, true).ok, 'sans boîte ni réfrigérateur : refusé');
});

test('les dépôts du travail : ce qui se mange, jusqu\'à la réserve visée ; le reste au coffre ; rien à 0', () => {
  const { s } = ile(2);
  designerGardeManger(s, true);
  reglerReserve(s, 1);
  const vise = besoinDuVillage(s);
  assertEqual(vise, 2 * AJ, 'deux adultes');
  const patates = countItem(s, 'patate');
  addItem(s, 'patate', 20); addItem(s, 'bois', 5);
  const d = deposerDuTravail(s, { patate: 20, bois: 5 });
  assert(!d.bois, 'le bois reste au coffre');
  const e = energieGardeManger(s);
  assert(e >= vise && e < vise + DATA.OBJETS.patate.energie, 'jusqu\'à la réserve, pas au-delà');
  assertEqual(countItem(s, 'patate'), patates + 20 - d.patate, 'le reste au coffre');
  assertEqual(etatGardeManger(s).aujourdhui.depose.patate, d.patate, 'le journal du jour');
  reglerReserve(s, 0);
  addItem(s, 'oeuf', 5);
  assertEqual(Object.keys(deposerDuTravail(s, { oeuf: 5 })).length, 0, 'à 0 jour : rien');
});

test('le travail d\'un villageois aux champs remplit le garde-manger au fil de ses actions', () => {
  const { s, V: [v] } = ile(1);
  designerGardeManger(s, true);
  // des parcelles mûres
  for (const p of s.potager.parcelles.slice(0, 6)) { p.culture = 'patate'; p.stade = 99; }
  attribuer(s, v.id, 'champs');
  const r = tachesNuit(s)[v.id];
  assert(r.actions >= 1, 'il récolte');
  assert((contenuGardeManger(s).patate || 0) > 0, 'ses patates au garde-manger');
});

test('le réfrigérateur acheté : la boîte commune reste celle du village ; la famille mange au réfrigérateur', () => {
  const { s, V } = ile(2, { pain: 10 });
  designerGardeManger(s, true);
  assert(testBatir(s, 'frigo').ok, 'le réfrigérateur');
  assertEqual(sourceRepas(s), 'frigo', 'la famille mange au réfrigérateur');
  assertEqual(gardeManger(s).sorte, 'boite', 'la boîte reste le garde-manger du village');
  assertEqual(boiteCounts(s).pain, 10, 'avec ce qu\'elle contient');
  addItem(s, 'carotte', 5);
  assert(moveToFridge(s, 'carotte', 5).ok, 'la famille range au frais');
  villageoisNuit(s);
  assert(boiteCounts(s).pain < 10, 'les villageois ont mangé à la boîte');
  assertEqual(fridgeCounts(s).carotte, 5, 'pas au réfrigérateur');
  for (const v of V) assert(!v.repos, `${v.prenom} a mangé à sa faim`);
  // le réfrigérateur rendu commun : la boîte n'est plus le garde-manger
  assert(designerGardeManger(s, true, 'frigo').ok && gardeManger(s).sorte === 'frigo', 'le réfrigérateur commun');
});

test('la fraîcheur (la péremption rétablie, B-1 la coupe) : dans la boîte commune, ce qui périt vieillit ; au réfrigérateur, non', () => {
  const avant = DATA.PENALITES.PEREMPTION;
  DATA.PENALITES.PEREMPTION = true;
  try {
    for (const sorte of ['boite', 'frigo']) {
      const { s } = ile(1);
      if (sorte === 'frigo') {
        // (alimenté : une batterie chargée, le réfrigérateur allumé)
        assert(testBatir(s, 'frigo').ok, 'le réfrigérateur');
        assert(s.batteries.length, 'une batterie');
        for (const b of s.batteries) { b.allume = true; b.chargeMwh = 1e9; }
        s.frigo.appareil.allume = true;
      }
      assert(designerGardeManger(s, true, sorte).ok, sorte);
      addItem(s, 'tomate', 3);
      deposerDuTravail(s, { tomate: 3 });
      const lots = () => (sorte === 'frigo' ? s.frigo.items : s.boite.items).tomate;
      const n0 = lots()[0].nightsLeft;
      assert(n0 > 1, 'la tomate périt');
      s.villageois = [];   // (personne ne la mange)
      runNight(s);
      if (sorte === 'boite') assertEqual(lots()[0].nightsLeft, n0 - 1, 'la boîte : une nuit de moins');
      else assertEqual(lots()[0].nightsLeft, n0, 'le réfrigérateur : rien ne bouge');
    }
  } finally {
    DATA.PENALITES.PEREMPTION = avant;
  }
});

/* ---------- la cuisine du village ---------- */

test('la cuisine du village : désignée d\'un appui, une cuisinière ou un four seulement ; ses postes, deux par bloc', () => {
  const { s, V: [a] } = ile(1);
  assert(testBatir(s, 'cuisine').ok, 'la cuisinière');
  assert(!designerCuisine(s, caseDe(s, 'boite_nourriture')).ok, 'la boîte n\'est pas une cuisine');
  const t = caseDe(s, 'cuisiniere');
  assert(designerCuisine(s, t).ok, 'la cuisinière');
  assert(!cuisineDuVillage(s), 'sans garde-manger commun, pas encore');
  designerGardeManger(s, true);
  assert(cuisineDuVillage(s), 'avec lui, elle tourne');
  assertEqual(cuisinesDuVillage(s).map((c) => c.case), [t]);
  const P = postesDe(s, 'cuisine', a);
  assert(P.length >= 1 && P.length <= 2 && P.every((p) => p.vers === t), 'devant elle, deux postes au plus');
  const L = tachesPour(s, a.id).find((x) => x.id === 'cuisine');
  assertEqual(L.nom, GM.CUISINE.NOM, 'la tâche dit la cuisine du village');
  assert(designerCuisine(s, t, false).ok && !cuisineDuVillage(s), 'reprise');
});

test('un cuisinier : ACTIONS plats par jour, du garde-manger au garde-manger, l\'huile au coffre ; la file du joueur libre', () => {
  const { s, V: [a] } = ile(1, { oeuf: 10 });
  cuisine(s);
  const huile = countItem(s, 'huile');
  addItem(s, 'huile', 4);
  attribuer(s, a.id, 'cuisine');
  const r = tachesNuit(s)[a.id];
  assertEqual(r.actions, Math.min(GM.CUISINE.ACTIONS, 3), 'trois plats : dix œufs, trois par plat');
  const plats = etatGardeManger(s).aujourdhui.plats, n = Object.values(plats).reduce((t, x) => t + x, 0);
  assertEqual(n, r.actions, 'autant de plats, rangés au garde-manger');
  assert(plats.omelette >= 1 && plats.mayonnaise >= 1, 'l\'omelette et la mayonnaise : la variété');
  for (const [o, k] of Object.entries(plats)) assert((contenuGardeManger(s)[o] || 0) >= k, `${o} au garde-manger`);
  assertEqual(contenuGardeManger(s).oeuf || 0, 10 - 3 * n, 'les œufs pris au garde-manger');
  assertEqual(countItem(s, 'huile'), huile + 4 - (plats.omelette || 0), 'l\'huile prise au coffre');
  assertEqual(s.stations.cuisine.tache, null, 'la cuisinière du joueur reste libre');
  assert(a.travail.utilise.oeuf >= 3, 'ce qu\'il a pris compte dans son coût (le tableau)');
});

test('deux cuisiniers font deux fois plus de plats ; sans ingrédient, la cuisine attend et le dit', () => {
  // (au réfrigérateur commun : pas de limite de sortes, ses unités)
  const { s, V: [a, b] } = ile(2);
  cuisine(s);
  assert(testBatir(s, 'frigo').ok && designerGardeManger(s, true, 'frigo').ok, 'le réfrigérateur commun');
  addItem(s, 'oeuf', 24); addItem(s, 'champignon', 10); addItem(s, 'huile', 10);
  assert(moveToFridge(s, 'oeuf', 24).ok && moveToFridge(s, 'champignon', 10).ok, 'rangés au frais');
  attribuer(s, a.id, 'cuisine'); attribuer(s, b.id, 'cuisine');
  const r = tachesNuit(s);
  assertEqual(r[a.id].actions + r[b.id].actions, 2 * GM.CUISINE.ACTIONS, 'deux fois plus');
  const vide = ile(1);
  cuisine(vide.s);
  assertEqual(prochainPlat(vide.s), null, 'rien à cuisiner');
  assert(!platDuVillage(vide.s).ok, 'un refus');
  assert(etatGardeManger(vide.s).manque.manquent.length > 0, 'la fenêtre dit ce qui manque');
});

test('le plat qui manque le plus passe devant (la variété) ; la boîte pleine de sortes rend au coffre ce qu\'on n\'attend pas', () => {
  const { s } = ile(1, { oeuf: 9, omelette: 5 });
  cuisine(s);
  addItem(s, 'huile', 5);
  assertEqual(prochainPlat(s).recette, 'mayonnaise', 'l\'omelette y est déjà : la mayonnaise');
  // la boîte pleine : six sortes, dont des fraises qu'aucun plat ne prend aujourd'hui
  const B = DATA.ATELIER.BOITE;
  s.boite.items = {};
  boite(s, { patate: 9, oeuf: 9, poivron: 5, fraise: 3, cerise: 4, poire: 4 });
  assertEqual(Object.keys(boiteCounts(s)).length, B.PLATS, 'six sortes');
  const p = platDuVillage(s);
  assert(p.ok, 'il cuisine quand même');
  assert(Object.keys(boiteCounts(s)).length <= B.PLATS, 'jamais plus de six sortes');
  assert((boiteCounts(s)[Object.keys(p.produit)[0]] || 0) >= 1, 'le plat est rangé');
});

/* ---------- la tablée ---------- */

test('la tablée : un gratin nourrit trois villageois ; chacun goûte à tous les plats ; le reste revient au garde-manger', () => {
  const { s, V } = ile(3, { gratin_patates: 1, pain: 4 });
  cuisine(s);
  villageoisNuit(s);
  for (const v of V) assert(!v.repos && v.faim === 0, `${v.prenom} a mangé à sa faim`);
  assertEqual(boiteCounts(s).gratin_patates || 0, 0, 'le gratin partagé');
  assert((boiteCounts(s).pain || 0) >= 3, 'les pains pas entamés reviennent');
  const tous = V.map((v) => v.journal[v.journal.length - 1]);
  assertEqual(tous.reduce((t, J) => t + (J.mange.gratin_patates || 0), 0), 1, 'le gratin compté une fois (à qui l\'entame)');
  for (const J of tous) assertEqual(J.energie, AJ, 'chacun son besoin');
  assertEqual(etatGardeManger(s).hier.mange.gratin_patates || etatGardeManger(s).aujourdhui.mange.gratin_patates, 1, 'le journal du garde-manger');
});

test('sans cuisine du village, chacun mange comme avant (pas de partage)', () => {
  const { s, V } = ile(3, { gratin_patates: 1, pain: 4 });
  designerGardeManger(s, true);
  villageoisNuit(s);
  const J = V.map((v) => v.journal[v.journal.length - 1]);
  assertEqual(J[0].mange.gratin_patates, 1, 'le premier mange le gratin entier');
  assert(J[1].mange.pain >= 1 || J[1].energie < AJ, 'le second, autre chose');
});

/* ---------- la page, la journée, le tableau ---------- */

test('le tableau : la ligne du garde-manger (déposé, cuisiné, mangé, qui cuisine, ses jours)', () => {
  const { s, V: [a, b] } = ile(2, { oeuf: 9, pain: 6 });
  cuisine(s);
  attribuer(s, a.id, 'cuisine');
  tachesNuit(s);
  runNight(s);
  const T = tableauVillage(s, 'hier');
  assert(T.gardeManger, 'sa ligne');
  assertEqual(T.gardeManger.cuisiniers, [a.prenom], 'qui cuisine');
  assert(T.gardeManger.plats.length && T.gardeManger.valeurPlats > 0, 'les plats et leur valeur');
  assertEqual(ligneGardeManger(ile(1).s), null, 'sans garde-manger : pas de ligne');
  assert(b, 'deux villageois');
});

// (comme tests/engine/village-journee.test.mjs : un coin libre, poser un bloc, la place et une grande maison avec sa table)
function coin(s, w, h) {
  const T = farmTerrain(s), W = T.LARGEUR, F = T.FERME;
  const cx = F.X + (F.LARGEUR >> 1), cy = F.Y + (F.HAUTEUR >> 1);
  for (let d = 0; d < 60; d++) {
    for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
      const c = cx + dx, r = cy + dy;
      let ok = true;
      for (let y = -1; y <= h && ok; y++) for (let x = -1; x <= w && ok; x++) ok = caseBatissable(s, (r + y) * W + c + x);
      if (ok) return r * W + c;
    }
  }
  return null;
}
const poser = (s, sorte, t, sens = 0) => {
  addItem(s, DATA.ATELIER.BLOCS[sorte].objet, 1);
  assert(poserBloc(s, sorte, t, sens).ok, `${sorte} en ${t}`);
};

test('la journée : la cuisine du village tournant, on mange à la table commune (même qui a la sienne) ; la vapeur au travail', () => {
  const s = reach(partie(1), 'four');
  portDuMonde(farmSeed(s));
  boite(s, { oeuf: 9 });
  const W = farmTerrain(s).LARGEUR;
  // une grande maison avec sa table et deux chaises
  const z = coin(s, 7, 7), at = (x, y) => z + y * W + x;
  for (let y = 0; y < 6; y++) for (let x = 0; x < 7; x++) if (y === 0 || x === 0 || y === 5 || x === 6) s.blocs[at(x, y)] = 'mur_pierre';
  s.blocs[at(3, 5)] = 'porte';
  poser(s, 'paillasse', at(1, 1)); poser(s, 'meuble_table', at(2, 3)); poser(s, 'meuble_chaise', at(3, 2), 0); poser(s, 'meuble_chaise', at(3, 4), 2);
  poser(s, 'boite_aux_lettres', at(2, 6));
  // la table commune et ses quatre chaises
  const y = coin(s, 9, 7), au = (x, k) => y + k * W + x;
  poser(s, 'table_jardin', au(4, 4));
  poser(s, 'chaise_jardin', au(3, 4), 1); poser(s, 'chaise_jardin', au(5, 4), 3); poser(s, 'chaise_jardin', au(4, 5), 0); poser(s, 'chaise_jardin', au(4, 3), 2);
  const v = arriverVillageois(s, { direct: true }).villageois;
  for (let d = s.day; d < s.day + 120; d++) if (meteoDuJour(s, d).sorte !== 'pluie') { s.day = d; break; }
  const H = DATA.VILLAGE.HORAIRE, L = lieuxDuVillage(s);
  assert(L.commune, 'la table commune');
  const avant = positionVillageois(s, v.id, H.MIDI + 0.6);
  assertEqual([avant.etat, avant.lieu.dehors], ['repas', false], 'sans cuisine du village : à sa table');
  cuisine(s);
  const apres = positionVillageois(s, v.id, H.MIDI + 0.6);
  assertEqual([apres.etat, apres.lieu.table], ['repas', L.commune.table], 'avec elle : à la table commune');
  // la vapeur : à l'heure de son travail, la cuisinière fume ; la nuit, non
  attribuer(s, v.id, 'cuisine');
  const travail = journeeDuVillage(s).get(v.id).find((x) => x.etat === 'travail');
  assert(travail, 'des créneaux de travail');
  s.awakeMs = awakeMsAtHour((travail.de + travail.a) / 2);
  assertEqual(cuisineVillageAllumee(s), true, 'elle fume');
  s.awakeMs = awakeMsAtHour(H.MIDI + 0.6);
  assertEqual(cuisineVillageAllumee(s), false, 'au repas, non');
});

/* ---------- la sauvegarde, les commandes, le joueur automatique ---------- */

test('la sauvegarde : format 103 ; v102 → v103 répare un garde-manger abîmé, une partie d\'avant n\'est pas touchée', () => {
  assert(STATE_VERSION >= 103, 'le format 103 ou après');
  const { s } = ile(1);
  cuisine(s);
  const ok = migrate({ ...copie(s), version: 101 });
  assertEqual(ok.version, STATE_VERSION);
  assertEqual(ok.gardeManger, s.gardeManger, 'un garde-manger lisible ne change pas');
  const abime = { ...copie(s), version: 101, gardeManger: { commun: 'oui', sorte: 'placard', reserve: 99, cuisines: [1, 1, 'x', -2, 3, 4], journal: [{ jour: 'hier' }, { jour: 3, plats: { pain: 2, licorne: 1 } }] } };
  const m = migrate(abime);
  assertEqual(m.gardeManger.commun, false);
  assertEqual(m.gardeManger.sorte, null);
  assertEqual(m.gardeManger.reserve, 10);
  assert(m.gardeManger.cuisines.length <= GM.CUISINE.MAX && m.gardeManger.cuisines.every(Number.isInteger), 'des cases');
  assertEqual(m.gardeManger.journal, [{ jour: 3, depose: {}, plats: { pain: 2 }, mange: {} }]);
  assert(!('gardeManger' in migrate({ ...copie(s), version: 101, gardeManger: 'rien' })), 'illisible : retiré');
  const avant = copie(partie(3));
  delete avant.gardeManger;
  assert(!('gardeManger' in migrate({ ...avant, version: 101 })), 'une partie d\'avant : rien');
  assertEqual(reparerGardeManger(null), undefined);
});

test('les commandes : village.commun, village.reserve, village.cuisine', () => {
  const { s } = ile(1);
  assert(testBatir(s, 'cuisine').ok, 'la cuisinière');
  assert(executerCommande(s, { id: 'a', type: 'village.commun', args: { oui: true, sorte: 'boite' } }).ok, 'commun');
  assert(executerCommande(s, { id: 'b', type: 'village.reserve', args: { jours: 2 } }).ok && s.gardeManger.reserve === 2, 'la réserve');
  assert(executerCommande(s, { id: 'c', type: 'village.cuisine', args: { case: caseDe(s, 'cuisiniere'), oui: true } }).ok, 'la cuisine');
  assert(cuisineDuVillage(s), 'elle tourne');
  assert(executerCommande(s, { id: 'd', type: 'village.commun', args: { oui: false } }).ok && !cuisineDuVillage(s), 'repris');
});

test('le joueur automatique : la boîte commune, la cuisinière du village, un cuisinier dès trois villageois', () => {
  const { s, V } = ile(3, { pain: 30 });
  assert(testBatir(s, 'cuisine').ok, 'la cuisinière');
  botVillageois(s);
  assert(gardeManger(s), 'le garde-manger commun');
  assert(cuisineDuVillage(s), 'la cuisine du village');
  assertEqual(villageoisDe(s).filter((v) => v.tache === 'cuisine').length, 1, 'un cuisinier');
  assertEqual(V.length, 3);
});

/* ---------- éteint ---------- */

test('éteint : pas de garde-manger, rien ne change la nuit', () => avecVillage(() => {
  const s = partie(1);
  boite(s, { pain: 5 });
  assertEqual(gardeManger(s), null);
  assert(!designerGardeManger(s, true).ok, 'refusé');
  assertEqual(etatGardeManger(s), null);
  assertEqual(cuisineDuVillage(s), false);
}, false));
