/* ==========================================================================
   Tests du chantier « l'île à bâtir » : la scierie, la boulangerie, la fromagerie (docs/ile.md, fiche I5c ;
   js/engine/artisans.js, data/village.json ARTISANS). Comme tous les fichiers tests/engine/village-*.test.mjs, il tourne
   avec VILLAGE.ACTIF forcé à true.
   - les trois sortes sur le socle d'I5a (leurs données, leurs blocs, leurs noms) ; leurs recettes dans la fourchette
     d'I4 ;
   - la scierie : des planches, les 36 meubles au menuisier (sur commande ou au comptoir), un meuble commandé entre
     dans la maison du joueur, un villageois achète un meuble pour la sienne ; l'Atelier jamais bloqué ;
   - la boulangerie : le pain au four à bois, acheté par un villageois sans provisions, mangé à son repas (ses plats,
     son bonheur) ;
   - la fromagerie : la faisselle, la tomme en cave (des nuits d'affinage), au comptoir ou au joueur qui l'a commandée ;
   - le plafond : le nombre de commerces suit les villageois et le port ; trois commerces dans un village de huit, trois
     lignes au tableau ;
   - la sauvegarde (99 → 100 : la cave) ; éteint, rien.
   Lancer seul : node tests/run-tests.mjs village-commerces
   ========================================================================== */

import {
  acheterAuCommerce, acheterAuComptoir, achatsCommercesDuJour, addItem, arriverVillageois, commanderAuCommerce,
  commercesDe, conditionsCommerce, countItem, craftStatus, createNewGame, DATA, etatCommerce, farmSeed, lotCommerce, migrate,
  ouvrirCommerce, plafondCommerces, portDuMonde, prixArtisan, recetteDebloquee, recettesConnues, recettesDe, runNight,
  STATE_VERSION, tableauVillage, tacheDef, testMaisonVillageois,
} from '../../js/engine/index.js';
import { ajouterAmitie } from '../../js/engine/amitie.js';
import { platsBonheur } from '../../js/engine/bonheur.js';
import { testLocalCommerce } from '../../js/engine/testmode.js';
import { assert, assertEqual, avecVillage, boite, partie, test } from './aide.mjs';

const copie = (o) => JSON.parse(JSON.stringify(o));
const AR = DATA.ARTISANS;
const SEUIL = DATA.RECIT.PALIERS[AR.AMITIE];
const SORTES = ['scierie', 'boulangerie', 'fromagerie'];

// L'île de test : le port au niveau `port`, `n` villageois dans leurs maisons, la boîte pleine.
function ile(n = 2, port = 1, seed = 1) {
  const s = partie(seed);
  portDuMonde(farmSeed(s));
  boite(s, { pain: 200 });
  s.outils = { hache: true, pioche: true, faux: true, canne: true, choisi: 'hache' };
  s.port = { ...(s.port || {}), niveau: port };
  const V = [];
  for (let k = 0; k < n; k++) {
    assert(testMaisonVillageois(s).ok, `la maison ${k + 1}`);
    V.push(arriverVillageois(s, { direct: true }).villageois);
  }
  return { s, V };
}

// Le villageois `v` ouvre le commerce `sorte` (son envie, l'amitié, le local bâti). → le commerce.
function ouvrir(s, v, sorte) {
  v.envies = { ...(v.envies || {}), [sorte]: s.day };
  ajouterAmitie(s, v.id, SEUIL);
  assert(testLocalCommerce(s, sorte, true).ok, `le local de ${sorte}`);
  const r = ouvrirCommerce(s, v.id, sorte);
  assert(r.ok, `${sorte} ouverte : ${r.error || ''}`);
  return r.commerce;
}

/* ---------- les trois sortes, leurs prix ---------- */

test('trois sortes de plus sur le socle : leur établi, leur enseigne, leur tâche, leur nom', () => {
  for (const sorte of SORTES) {
    const d = AR.COMMERCES[sorte];
    assert(d && DATA.ATELIER.BLOCS[d.etabli].commerce === sorte && DATA.ATELIER.BLOCS[d.enseigne].enseigneCommerce === sorte, sorte);
    assert(DATA.ATELIER.RECETTES[d.etabli] && DATA.ATELIER.RECETTES[d.enseigne], `${sorte} : à l'Atelier`);
    assert(DATA.ATELIER.CATEGORIES.commerces.blocs.includes(d.etabli) && DATA.ATELIER.CATEGORIES.commerces.blocs.includes(d.enseigne), 'la catégorie « Commerces »');
    assertEqual(tacheDef(sorte).lieu, 'commerce', `${sorte} : la tâche du commerce`);
    assert(DATA.VILLAGE.NOMS.COMMERCES[sorte], `${sorte} : son nom`);
  }
  assertEqual([AR.COMMERCES.scierie.tache, AR.COMMERCES.boulangerie.tache, AR.COMMERCES.fromagerie.tache], ['bois', 'champs', 'betes'], 'les filières');
  // (le four du boulanger s'allume comme la forge ; la scie et la cave n'ont pas de feu)
  assertEqual([DATA.ATELIER.BLOCS.four_boulanger.allume, DATA.ATELIER.BLOCS.enclume_foyer.allume, DATA.ATELIER.BLOCS.scie_long.allume], ['feu', 'braise', undefined]);
});

test('les trois filières dans la fourchette d\'I4 : chaque recette rend entre 130 et 160 % de ses matières', () => {
  const [min, max] = DATA.VILLAGE.PRIX.FOURCHETTE, hors = [];
  for (const sorte of [...SORTES, 'forge']) {
    for (const r of recettesDe(sorte)) {
      const cout = Object.entries(r.entrees).reduce((t, [o, n]) => t + n * prixArtisan(o), 0), valeur = r.qte * prixArtisan(r.sortie);
      if (!(valeur * 100 >= min * cout && valeur * 100 <= max * cout)) hors.push(`${sorte}.${r.id} : ${cout} → ${valeur}`);
    }
  }
  assertEqual(hors, []);
  // (la scierie : des planches, puis les 36 meubles ; la boulangerie : du pain d'abord ; la fromagerie : faisselle, tomme)
  const sc = recettesDe('scierie');
  assertEqual(sc[0].id, 'planches');
  assertEqual(sc.filter((r) => r.sortie.startsWith('meuble_')).length, Object.keys(DATA.MEUBLES).length, 'les 36 meubles');
  assertEqual(Object.keys(DATA.MEUBLES).length, 36);
  assertEqual(recettesDe('boulangerie')[0].sortie, 'pain');
  assertEqual(recettesDe('fromagerie').map((r) => [r.sortie, r.cave]), [['faisselle', 0], ['tomme_cave', 4]]);
});

/* ---------- la scierie ---------- */

test('la scierie : des planches au comptoir, des meubles pour les maisons ; les autres seulement commandés', () => {
  const { s, V: [v] } = ile(1);
  const c = ouvrir(s, v, 'scierie');
  addItem(s, 'bois', 60); addItem(s, 'planche', 40);
  v.bourse = 1000;
  const faits = [];
  for (let k = 0; k < 8; k++) { const r = lotCommerce(s, v); if (r.ok) faits.push(r.lot.recette); }
  assertEqual(faits[0], 'planches', 'il scie d\'abord');
  const connues = recettesConnues(s, c);
  assert(faits.every((id) => { const r = connues.find((x) => x.id === id); return r && !r.commande; }), `rien que pour le comptoir : ${faits}`);
  assert(!faits.includes('meuble_table') && faits.includes('meuble_chaise'), 'la chaise au comptoir, pas la table');
  assert(c.stock.meuble_chaise === 1, 'un de chaque meuble au comptoir (stock 1)');
  // (l'Atelier du joueur scie toujours : un commerce ne retire rien au joueur)
  s.atelier = { construit: true, niveau: DATA.ATELIER.NIVEAU };
  assert(recetteDebloquee(s, 'planche') && craftStatus(s, 'planche').ok, 'le joueur scie lui-même');
});

test('un meuble commandé au menuisier entre dans la maison du joueur (son bonheur), jamais plus que la maison n\'en prend', () => {
  const { s, V: [v] } = ile(1);
  const c = ouvrir(s, v, 'scierie');
  addItem(s, 'planche', 20);
  s.pieces = 1000; v.bourse = 0;
  const avant = (s.meubles || {}).table || 0;
  const k = commanderAuCommerce(s, c.id, 'meuble_table');
  assert(k.ok, `commandée : ${k.error || ''}`);
  assertEqual(k.commande.prix, prixArtisan('meuble_table'), 'au prix de l\'île');
  assert(!commanderAuCommerce(s, c.id, 'meuble_table').ok, 'une table de plus : la maison n\'en prend qu\'une, commande comprise');
  assert(/assez/.test(etatCommerce(s, c.id).recettes.find((r) => r.id === 'meuble_table').refus), 'la fenêtre le dit');
  const r = lotCommerce(s, v);
  assert(r.ok && r.lot.recette === 'meuble_table', 'au lot suivant, sur la bourse de la commande');
  assertEqual([s.meubles.table, countItem(s, 'meuble_table')], [avant + 1, 1], 'dans la maison (à poser) : compté comme un meuble acheté');
  assert(!commanderAuCommerce(s, c.id, 'meuble_armoire_chene').ok, 'l\'armoire : votre amitié la lui apprendra');
  // (au comptoir aussi : un meuble en vente)
  c.stock = { meuble_chevet: 1 };
  const a = acheterAuCommerce(s, c.id, 'meuble_chevet', 1);
  assert(a.ok && s.meubles.chevet >= 1, 'le chevet entre dans la maison');
});

test('un villageois achète au menuisier le meuble qui manque à sa maison ; il le range dans ses affaires', () => {
  const { s, V: [v, w] } = ile(2);
  const c = ouvrir(s, v, 'scierie');
  c.stock = { meuble_chevet: 1 };
  w.bourse = 200; w.gouts = {};
  const A = achatsCommercesDuJour(s);
  assertEqual(A.get(w.id), { commerce: c.id, objet: 'meuble_chevet', fait: false }, 'il ira au comptoir');
  const r = acheterAuComptoir(s, w.id, c.id, 'meuble_chevet');
  assert(r.ok && r.envie === 'besoin' && r.pour === 'maison', 'pour sa maison');
  assertEqual(w.affaires.meuble_chevet, 1, 'ses affaires');
});

/* ---------- la boulangerie ---------- */

test('la boulangerie : le pain au four à bois ; un villageois sans provisions l\'achète et le mange à son repas', () => {
  const { s, V: [v, w] } = ile(2);
  const c = ouvrir(s, v, 'boulangerie');
  addItem(s, 'farine', 40);
  v.bourse = 200;
  const r = lotCommerce(s, v);
  assert(r.ok && r.lot.recette === 'pain', 'une fournée');
  assertEqual(c.stock.pain, 2, 'deux pains au comptoir');
  assertEqual(r.produit.pieces, 5 * prixArtisan('farine'), 'la farine payée au joueur');
  // (un villageois sans provisions vient chercher son pain : pour son repas)
  w.bourse = 50; w.gouts = {}; w.provisions = {};
  assertEqual(achatsCommercesDuJour(s).get(w.id).objet, 'pain', 'il ira chercher son pain');
  const a = acheterAuComptoir(s, w.id, c.id, 'pain');
  assert(a.ok && a.pour === 'repas', 'pour son repas');
  assertEqual(w.provisions.pain, 1, 'dans ses provisions');
  assertEqual(achatsCommercesDuJour(s).has(w.id), true, 'déjà acheté aujourd\'hui (fait)');
  runNight(s);
  const J = w.journal[w.journal.length - 1];
  assertEqual(J.siens && J.siens.pain, 1, 'il a mangé le pain du boulanger à son repas');
  assert(platsBonheur(J.siens) > 0, 'un plat du four : il compte dans son bonheur (villageois.js nuitDe, ses plats et ce qu\'il s\'est acheté)');
  // (il en a encore : il ne rachète pas)
  w.provisions = { pain: 1 };
  c.stock = { pain: 3 };
  assert(!achatsCommercesDuJour(s).has(w.id), 'des provisions : pas de besoin');
});

/* ---------- la fromagerie ---------- */

test('la fromagerie : la faisselle, puis la tomme en cave ; ses nuits d\'affinage ; une tomme commandée sort de cave pour le joueur', () => {
  const { s, V: [v] } = ile(1);
  const c = ouvrir(s, v, 'fromagerie');
  addItem(s, 'lait', 30);
  v.bourse = 500;
  // (il garnit d'abord son comptoir de faisselles, STOCK ; puis il en met deux en cave : une tomme)
  for (let k = 0; k < AR.STOCK; k++) assertEqual(lotCommerce(s, v).lot.recette, 'faisselle');
  const r = lotCommerce(s, v);
  assertEqual(r.lot.recette, 'tomme_cave', 'deux faisselles : une tomme');
  assertEqual([c.stock.faisselle || 0, c.cave.length, c.cave[0].objet], [AR.STOCK - 2, 1, 'tomme_cave'], 'deux de ses faisselles prises, la tomme en cave');
  assertEqual(etatCommerce(s, c.id).cave[0].reste, 4, 'quatre nuits');
  // (les nuits passent : elle s'affine, puis passe au comptoir)
  const cave = c.cave[0];
  for (let k = 0; k < 3; k++) { runNight(s); assert(c.cave.includes(cave) || c.cave.some((x) => x.objet === 'tomme_cave'), `nuit ${k + 1} : encore en cave`); }
  const tommes = (c.stock.tomme_cave || 0);
  c.cave = [{ ...cave, nuits: 3 }];
  runNight(s);
  assert((c.stock.tomme_cave || 0) >= tommes + 1, 'affinée : au comptoir');
  assert(s.nuit.artisans && s.nuit.artisans.caves.length >= 1, 'la nuit le dit');
  // (commandée : elle passe par la cave, puis va au joueur)
  c.cave = []; c.commandes = [];
  c.stock = { faisselle: 2 };
  s.pieces = 500;
  assert(commanderAuCommerce(s, c.id, 'tomme_cave').ok, 'commandée');
  const l = lotCommerce(s, v);
  assert(l.ok && l.lot.commande, 'faite avant le reste');
  assertEqual(c.cave[0].pour, 'joueur', 'en cave, pour toi');
  const n0 = countItem(s, 'tomme_cave');
  c.cave[0].nuits = 3;
  runNight(s);
  assertEqual(countItem(s, 'tomme_cave'), n0 + 1, 'sortie de cave : dans l\'inventaire');
  // (la cave a ses places : ARTISANS.CAVE)
  c.cave = Array.from({ length: AR.CAVE }, () => ({ objet: 'tomme_cave', n: 1, nuits: 0, recette: 'tomme_cave', pour: null }));
  c.stock = { faisselle: 4 };
  const p = lotCommerce(s, v);
  assert(!p.ok || p.lot.recette !== 'tomme_cave', 'la cave est pleine');
});

/* ---------- le plafond, trois commerces ---------- */

test('le plafond : le nombre de commerces suit les villageois et le niveau du port ; la fiche dit ce qui manque', () => {
  assertEqual(AR.PLAFOND, { VILLAGEOIS: [1, 4, 6, 8, 10, 12], PORT: [1, 2, 3, 3, 4, 5] }, 'les réglages proposés');
  const { s, V } = ile(3, 1);
  ouvrir(s, V[0], 'forge');
  assertEqual(plafondCommerces(s).max, 1, 'trois villageois, le port au niveau 1 : un commerce');
  V[1].envies = { scierie: s.day };
  ajouterAmitie(s, V[1].id, SEUIL);
  testLocalCommerce(s, 'scierie', true);
  let C = conditionsCommerce(s, V[1].id, 'scierie');
  assert(!C.ok && !C.plafond.ok && /4 villageois/.test(C.plafond.texte) && /port au niveau 2/.test(C.plafond.texte), C.plafond.texte);
  assert(!ouvrirCommerce(s, V[1].id, 'scierie').ok, 'refusé');
  s.port.niveau = 2;
  assert(/4 villageois/.test(conditionsCommerce(s, V[1].id, 'scierie').plafond.texte), 'les villageois manquent encore');
  assert(testMaisonVillageois(s).ok, 'une maison');
  arriverVillageois(s, { direct: true });
  C = conditionsCommerce(s, V[1].id, 'scierie');
  assert(C.plafond.ok && C.ok, `quatre villageois, le port au niveau 2 : ${C.plafond.texte}`);
  assert(ouvrirCommerce(s, V[1].id, 'scierie').ok, 'le deuxième commerce');
});

test('trois commerces ouverts dans un village de huit ; trois lignes « commerce » au tableau', () => {
  const { s, V } = ile(8, 4);
  for (const [k, sorte] of SORTES.entries()) ouvrir(s, V[k], sorte);
  assertEqual(commercesDe(s).map((c) => c.sorte), SORTES);
  assert(plafondCommerces(s).max >= 3, 'huit villageois, le port au niveau 4');
  addItem(s, 'bois', 40); addItem(s, 'farine', 40); addItem(s, 'lait', 40);
  for (const v of V.slice(0, 3)) v.bourse = 300;
  runNight(s);
  assertEqual(tableauVillage(s, 'hier').commerces.length, 3, 'trois lignes');
});

/* ---------- la sauvegarde, éteint ---------- */

test('la sauvegarde : v99 → v100 ; la cave gardée, réparée', () => {
  assertEqual(STATE_VERSION, 100, 'le format 100');
  const { s, V: [v] } = ile(1);
  const c = ouvrir(s, v, 'fromagerie');
  c.cave = [{ objet: 'tomme_cave', n: 1, nuits: 2, recette: 'tomme_cave', pour: 'joueur' }];
  const m = migrate({ ...copie(s), version: 99 });
  assertEqual(m.version, STATE_VERSION);
  assertEqual(m.commerces[0].cave, [{ objet: 'tomme_cave', n: 1, nuits: 2, recette: 'tomme_cave', pour: 'joueur' }], 'gardée');
  const abime = copie(s);
  abime.commerces[0].cave = [{ objet: 'licorne', n: 1, recette: 'x' }, { objet: 'tomme_cave', n: -2, recette: 'tomme_cave' }, 'x', { objet: 'tomme_cave', n: 1, nuits: 'a', recette: 'tomme_cave' }];
  assertEqual(migrate({ ...abime, version: 99 }).commerces[0].cave, [{ objet: 'tomme_cave', n: 1, nuits: 0, recette: 'tomme_cave', pour: null }], 'réparée');
  const avant = avecVillage(() => createNewGame(5), false);
  assert(!('commerces' in migrate({ ...copie(avant), version: 99 })), 'une partie d\'avant : rien d\'ajouté');
});

test('éteint : ni scierie, ni boulangerie, ni fromagerie', () => {
  avecVillage(() => {
    const s = createNewGame(2);
    s.commerces = [{ id: 'scierie-1', sorte: 'scierie', qui: 'x' }];
    assertEqual([commercesDe(s), achatsCommercesDuJour(s).size], [[], 0]);
    assert(!ouvrirCommerce(s, 'x', 'boulangerie').ok, 'refusé');
    runNight(s);
    assert(!s.nuit.artisans, 'rien la nuit');
  }, false);
});
