/* ==========================================================================
   Tests du chantier « l'île à bâtir » : la mercerie (docs/ile.md, fiche I5b ; js/engine/artisans.js, la sorte
   « mercerie » de data/village.json ARTISANS.COMMERCES). Comme tous les fichiers tests/engine/village-*.test.mjs, il
   tourne avec VILLAGE.ACTIF forcé à true.
   - la filière de bout en bout : la laine de la tonte devient fil, tissu, puis un manteau (teint s'il y a un colorant),
     en trois jours d'artisan ; chaque étape vaut plus que la précédente, chaque recette dans la fourchette d'I4 ;
   - la teinture : un colorant existant, la pièce teinte gardée avec sa couleur, son prix ; le joueur achète les pièces
     sans teinte ; les tons des écheveaux et des tenues existent ;
   - l'achat d'un vêtement par un villageois (ce qui lui manque) et son effet : il le porte (sa tenue), habillé chaud il
     ne s'abrite plus sous la pluie ;
   - ce qu'elle garde pour son travail (le fil, le tissu) : le bac ne l'emporte pas ;
   - les deux artisans : quand le village a grandi, un second la rejoint ; chacun ses lots (le double), ses étapes ;
   - l'Atelier : sans mercerie, le joueur tisse et coud lui-même ; une mercerie qui sait le faire le remplace ;
   - la sauvegarde (100 → 101) ; la commande du moteur ; le joueur automatique (la mercerie après la forge) ; éteint, rien.
   Lancer seul : node tests/run-tests.mjs village-mercerie.
   ========================================================================== */

import {
  achatsCommercesDuJour, acheterAuCommerce, acheterAuComptoir, actionsDuJour, addItem, arriverVillageois, attribuer, botCommerce,
  commercesAuBac, commercesDe, conditionsSecond, couleursTeinture, countItem, craftStatus, createNewGame, DATA, donnerOutil,
  enVenteAuCommerce, etapesDe, executerCommande, farmSeed, journeeDuVillage, lotCommerce, lotsDuJour, meteoDuJour, migrate,
  ouvrirCommerce, portDuMonde, postesDe, prixArtisan, prixIle, prixTeint, recettesDe, rejoindreCommerce, runNight,
  STATE_VERSION, teintesDe, testMaisonVillageois, trouverVillageois,
} from '../../js/engine/index.js';
import { ajouterAmitie } from '../../js/engine/amitie.js';
import { testLocalCommerce } from '../../js/engine/testmode.js';
import { auChaud } from '../../js/engine/villageois-journee.js';
import { assert, assertEqual, avecVillage, boite, partie, test } from './aide.mjs';

const copie = (o) => JSON.parse(JSON.stringify(o));
const AR = DATA.ARTISANS, M = AR.COMMERCES.mercerie;
const SEUIL = DATA.RECIT.PALIERS[AR.AMITIE];

// L'île de test : le port, `n` villageois dans leurs maisons, la boîte pleine, les outils du joueur.
function ile(n = 2, seed = 1) {
  const s = partie(seed);
  portDuMonde(farmSeed(s));
  boite(s, { pain: 400 });
  s.outils = { hache: true, pioche: true, faux: true, canne: true, choisi: 'hache' };
  for (let k = 0; k < n; k++) assert(testMaisonVillageois(s).ok, 'la maison');
  const V = [];
  for (let k = 0; k < n; k++) V.push(arriverVillageois(s, { direct: true }).villageois);
  return { s, V };
}

// Une bergère qui a l'envie, amie du joueur, et le local bâti : la mercerie ouverte. → { s, V, v, c, local }.
function mercerie(n = 2, seed = 1) {
  const { s, V } = ile(n, seed);
  const v = V[0];
  attribuer(s, v.id, 'betes');
  v.envies = { mercerie: s.day };
  ajouterAmitie(s, v.id, SEUIL);
  const local = testLocalCommerce(s, 'mercerie', true);
  assert(local.ok, 'le local');
  const r = ouvrirCommerce(s, v.id, 'mercerie');
  assert(r.ok, `ouverte : ${r.error || ''}`);
  v.bourse = 2000;
  return { s, V, v, c: r.commerce, local };
}

// (vide un objet de l'inventaire)
const vider = (s, o) => { if (s.inventaire && s.inventaire[o]) s.inventaire[o] = []; };

/* ---------- la sorte, ses recettes, leurs prix ---------- */

test('la mercerie : la tâche des bêtes, le rouet et le métier, son enseigne ; trois étapes, LOTS par jour, dans la fourchette d\'I4', () => {
  assertEqual([M.tache, M.etabli, M.enseigne, M.geste], ['betes', 'rouet_metier', 'enseigne_mercerie', 'filer']);
  assertEqual(DATA.ATELIER.BLOCS.rouet_metier.commerce, 'mercerie', 'son établi');
  assertEqual(DATA.ATELIER.BLOCS.enseigne_mercerie.enseigneCommerce, 'mercerie', 'son enseigne');
  assert(DATA.ATELIER.CATEGORIES.commerces.blocs.includes('rouet_metier') && DATA.ATELIER.CATEGORIES.commerces.blocs.includes('enseigne_mercerie'), 'la catégorie « Commerces »');
  assertEqual(AR.LOTS, 3, 'trois lots par jour, toutes étapes confondues');
  const R = recettesDe('mercerie'), etapes = new Set(R.map((r) => r.etape));
  assertEqual([...etapes].sort(), ['coudre', 'filer', 'tisser'], 'filer, tisser, coudre');
  // (chaque recette rend dans la fourchette, au prix de l'île ; une teinte aussi)
  const [min, max] = DATA.VILLAGE.PRIX.FOURCHETTE;
  for (const r of R) {
    const cout = Object.entries(r.entrees).reduce((t, [o, n]) => t + prixIle(o) * n, 0), valeur = prixIle(r.sortie) * r.qte;
    assert(valeur * 100 >= min * cout && valeur * 100 <= max * cout, `${r.id} : ${cout} → ${valeur}`);
    if (r.teinte) {
      const c2 = cout + prixIle('colorant_rouge'), v2 = prixTeint(r.sortie, 'rouge') * r.qte;
      assert(v2 * 100 >= min * c2 && v2 * 100 <= max * c2, `${r.id} teint : ${c2} → ${v2}`);
    }
  }
  // (la filière vaut plus à chaque étape : la laine, le fil, le tissu, le manteau)
  const p = prixIle;
  assert(2 * p('fil') > 2 * p('laine') && p('tissu') > 2 * p('fil') && p('manteau_chaud') > 3 * p('tissu'), `${p('laine')} → ${p('fil')} → ${p('tissu')} → ${p('manteau_chaud')}`);
  // (les vêtements de l'équipement ; les tapis teints)
  for (const o of ['gants_travail', 'manteau_chaud', 'salopette', 'tablier', 'meuble_tapis_2', 'meuble_tapis_3']) assert(R.some((r) => r.sortie === o), o);
});

/* ---------- la filière de bout en bout ---------- */

test('de bout en bout : la laine de la tonte devient fil, tissu, puis un manteau teint, en trois jours d\'artisan', () => {
  const { s, v, c } = mercerie();
  addItem(s, 'laine', 6 + AR.GARDE);
  addItem(s, 'colorant_rouge', 1 + AR.GARDE);
  const pieces = s.pieces, debut = s.day;
  // (trois journées d'artisan : la nuit fait ses lots, LOTS chacune)
  for (let jour = 0; jour < 3; jour++) runNight(s);
  const J = (d) => (c.journal.find((x) => x.jour === debut + d) || { fait: {}, lots: 0 });
  assertEqual([J(0).lots, J(1).lots], [AR.LOTS, AR.LOTS], 'LOTS par jour (le troisième, la laine finie, un lot : le manteau)');
  assertEqual(J(0).fait, { fil: 4, tissu: 1 }, 'le premier jour : il file, il tisse');
  assertEqual(J(1).fait, { tissu: 2, fil: 2 }, 'le deuxième : il tisse d\'abord');
  assertEqual(J(2).fait.manteau_chaud, 1, 'le troisième : il coud le manteau');
  assertEqual(teintesDe(c, 'manteau_chaud'), { rouge: 1 }, 'teint en rouge, gardé avec sa couleur');
  assert(s.pieces > pieces, 'la laine et le colorant payés au joueur');
  assertEqual(countItem(s, 'laine'), AR.GARDE, 'GARDE laissé au coffre');
  assertEqual(v.journal[v.journal.length - 1].tache, 'mercerie', 'son journal');
});

/* ---------- la teinture ---------- */

test('la teinture : un colorant existant, la pièce teinte et son prix ; le joueur achète les pièces sans teinte', () => {
  const T = couleursTeinture();
  assertEqual(T.map((x) => x.colorant), ['colorant_rouge', 'colorant_orange', 'colorant_jaune', 'colorant_vert', 'colorant_bleu', 'colorant_violet'], 'les six colorants du mortier : pas de nouvelle matière');
  for (const x of T) {
    assert(DATA.FAMILLE.PROFIL.APPARENCE.TISSU[x.tissu], `${x.id} : une couleur des tenues`);
    if (x.palette) assert(DATA.PALETTES[x.palette] && DATA.PALETTES[x.palette].length === 9, `${x.id} : les tons exacts de ${x.palette}`);
  }
  assertEqual(prixTeint('manteau_chaud', 'vert'), prixArtisan('manteau_chaud') + Math.round((prixArtisan('colorant_vert') * AR.TEINTURE.COEF) / 100), 'le prix d\'une teinte');
  const { s, c } = mercerie();
  c.stock = { manteau_chaud: 3, tissu: 2 };
  c.teintes = { manteau_chaud: { bleu: 1, rouge: 1 } };
  const V = enVenteAuCommerce(s, c);
  assertEqual(V.map((x) => [x.objet, x.teinte, x.n]), [['manteau_chaud', null, 1], ['manteau_chaud', 'rouge', 1], ['manteau_chaud', 'bleu', 1], ['tissu', null, 2]], 'pièce par pièce');
  s.pieces = 5000;
  assert(acheterAuCommerce(s, c.id, 'manteau_chaud', 1).ok, 'le manteau sans teinte');
  const r = acheterAuCommerce(s, c.id, 'manteau_chaud', 1);
  assert(!r.ok && /villageois/.test(r.error), `les teintes sont pour les villageois : ${r.error}`);
  // (sans colorant, la pièce reste sans teinte ; le colorant le plus fourni d'abord)
  const { s: s2, v: v2, c: c2 } = mercerie();
  addItem(s2, 'tissu', 3 + AR.GARDE);
  const r2 = lotCommerce(s2, v2);
  assert(r2.ok && r2.lot.recette === 'manteau_chaud' && !r2.lot.teinte, 'sans colorant : sans teinte');
  addItem(s2, 'tissu', 3); addItem(s2, 'colorant_bleu', 2 + AR.GARDE); addItem(s2, 'colorant_jaune', 1 + AR.GARDE);
  const r3 = lotCommerce(s2, v2);
  assertEqual([r3.lot.recette, r3.lot.teinte], ['manteau_chaud', 'bleu'], 'le colorant qu\'il a le plus');
  assertEqual(teintesDe(c2, 'manteau_chaud'), { bleu: 1 });
});

/* ---------- les villageois achètent ---------- */

test('un villageois achète un manteau (il lui manquait) : il le porte, teint ; habillé chaud, il ne s\'abrite plus sous la pluie', () => {
  const { s, V: [, w], c } = mercerie();
  c.stock = { manteau_chaud: 1 };
  c.teintes = { manteau_chaud: { vert: 1 } };
  w.bourse = 1000;
  w.gouts = {};
  const a = achatsCommercesDuJour(s).get(w.id);
  assert(a && a.objet === 'manteau_chaud' && a.teinte === 'vert', `il va le chercher : ${JSON.stringify(a)}`);
  // (sa journée : un créneau au comptoir de la mercerie ; ce qu'il y dit)
  const seg = journeeDuVillage(s).get(w.id).find((x) => x.but && x.but.sorte === 'commerce');
  assert(seg && seg.but.commerce === c.id && seg.but.dit, 'son créneau au comptoir');
  const r = acheterAuComptoir(s, w.id, c.id, 'manteau_chaud', 'vert');
  assert(r.ok && r.envie === 'besoin', `acheté : ${r.error || r.envie}`);
  assertEqual([r.prix, w.affaires.manteau_chaud, w.apparence.tenue.haut.tissu], [prixTeint('manteau_chaud', 'vert'), 1, 'vert'], 'à ses affaires ; le haut de sa tenue, vert');
  assertEqual([c.stock.manteau_chaud, c.teintes], [undefined, undefined], 'parti du comptoir');
  assert(auChaud(w), 'habillé chaud');
  // (un autre jour, il n'en rachète pas : il l'a)
  assert(!achatsCommercesDuJour(s, s.day + 1).has(w.id) || achatsCommercesDuJour(s, s.day + 1).get(w.id).objet !== 'manteau_chaud', 'une fois');
  // (sous la pluie : son travail dehors reste à son poste ; sans manteau, il s'abrite)
  assert(donnerOutil(s, w.id, 'hache').ok && attribuer(s, w.id, 'bois').ok, 'au bois');
  let jour = s.day + 1;
  for (; jour < s.day + 400; jour++) { const m = meteoDuJour(s, jour); if (m.sorte === 'pluie' && m.debut <= 10 && m.fin >= 15) break; }
  const m = meteoDuJour(s, jour);
  assertEqual(m.sorte, 'pluie', 'un jour de pluie');
  const dehors = (L) => L.filter((x) => x.etat === 'travail' && x.a > m.debut && x.de < m.fin).length;
  const avec = journeeDuVillage(s, jour).get(w.id);
  w.affaires = {};
  const sans = journeeDuVillage(s, jour).get(w.id);
  assert(dehors(avec) > 0, 'avec son manteau : au travail sous l\'averse');
  assertEqual(dehors(sans), 0, 'sans : à l\'abri');
  assert(sans.some((x) => x.etat === 'abri'), 'il s\'abrite');
});

/* ---------- ce qu'elle garde pour son travail ---------- */

test('le bac : il emporte ce qui dépasse, pas le fil ni le tissu qu\'elle garde pour son travail ; une teinte à son prix', () => {
  const { s, v, c } = mercerie();
  c.stock = { fil: 4, tissu: 4, gants_travail: 3 };
  c.teintes = { gants_travail: { rouge: 2 } };
  const bourse = v.bourse, vendu = {};
  const out = commercesAuBac(s, s.day, vendu);
  assertEqual([c.stock.fil, c.stock.tissu, c.stock.gants_travail], [4, 4, 1], 'le fil et le tissu restent');
  assertEqual(vendu, { gants_travail: 2 });
  assertEqual(out[c.id], prixIle('gants_travail') + prixTeint('gants_travail', 'rouge'), 'une sans teinte, puis une teinte');
  assertEqual(v.bourse - bourse, out[c.id]);
  assertEqual(teintesDe(c, 'gants_travail'), { rouge: 1 }, 'une teinte reste');
});

/* ---------- les deux artisans ---------- */

test('à deux : quand le village a grandi, un second la rejoint (le joueur le décide) ; deux fois LOTS, l\'un file et tisse, l\'autre coud', () => {
  const { s, V, v, c } = mercerie(3);
  const w = V[1];
  assertEqual(conditionsSecond(s, w.id, c.id), null, 'sans l\'envie, rien à proposer');
  w.envies = { mercerie: s.day };
  ajouterAmitie(s, w.id, SEUIL);
  let C = conditionsSecond(s, w.id, c.id);
  assertEqual([C.ok, C.village.ok, C.envie.ok, C.amitie.ok, C.poste.ok], [false, false, true, true, true], `le village est petit : ${C.village.texte}`);
  assert(!rejoindreCommerce(s, w.id, c.id).ok, 'refusé');
  for (let k = V.length; k < M.DEUX.VILLAGEOIS; k++) { assert(testMaisonVillageois(s).ok); arriverVillageois(s, { direct: true }); }
  C = conditionsSecond(s, w.id, c.id);
  assert(C.ok, `tout y est : ${JSON.stringify(C)}`);
  const r = executerCommande(s, { id: 'r', type: 'commerce.rejoindre', args: { id: w.id, commerce: c.id } });
  assert(r.ok, `rejoint : ${r.error || ''}`);
  assertEqual([c.second, w.tache, w.commerce], [w.id, 'mercerie', c.id], 'le second');
  assert(!rejoindreCommerce(s, V[2].id, c.id).ok, 'pas de troisième');
  assertEqual([actionsDuJour(s, v), actionsDuJour(s, w)], [lotsDuJour(c), lotsDuJour(c)], 'chacun ses lots : le double, sans machine');
  assertEqual([[...etapesDe(c, v)].sort(), [...etapesDe(c, w)]], [['filer', 'tisser'], ['coudre']], 'les étapes');
  // (deux postes devant l'établi)
  const P1 = postesDe(s, 'mercerie', v), P2 = postesDe(s, 'mercerie', w);
  assert(P1.length && P2.length && P1[0].case !== P2[0].case, 'deux postes');
  // (leur journée : à l'établi aux mêmes heures, chacun à son poste)
  const J = journeeDuVillage(s), tv = J.get(v.id).filter((x) => x.etat === 'travail'), tw = J.get(w.id).filter((x) => x.etat === 'travail');
  assert(tw.length >= tv.length - 1 && tv.some((a) => tw.some((b) => b.de < a.a && a.de < b.a && b.lieu.case !== a.lieu.case)), 'ensemble, chacun son poste');
  // (le second coud ; le titulaire file et tisse ; la bourse du titulaire paie)
  addItem(s, 'laine', 4 + AR.GARDE); addItem(s, 'tissu', 3 + AR.GARDE);
  const bv = v.bourse, bw = w.bourse;
  const lw = lotCommerce(s, w), lv = lotCommerce(s, v);
  assertEqual([lw.lot.recette, lv.lot.recette], ['manteau_chaud', 'fil'], 'chacun son étape');
  assert(v.bourse < bv && w.bourse === bw, 'la caisse : la bourse du titulaire');
  // (la forge, elle, se tient seule)
  assertEqual(AR.COMMERCES.forge.DEUX, undefined);
});

/* ---------- l'Atelier ---------- */

test('l\'Atelier : sans mercerie, le joueur tisse et coud lui-même ; une mercerie qui le sait le fait désormais', () => {
  const { s, V } = ile();
  s.atelier = { construit: true, niveau: DATA.ATELIER.NIVEAU };
  addItem(s, 'laine', 10); addItem(s, 'tissu', 5);
  assert(craftStatus(s, 'tissu').ok && craftStatus(s, 'manteau_chaud').ok, 'jamais bloqué');
  const v = V[0];
  v.envies = { mercerie: s.day };
  ajouterAmitie(s, v.id, SEUIL);
  testLocalCommerce(s, 'mercerie', true);
  assert(ouvrirCommerce(s, v.id, 'mercerie').ok);
  const st = craftStatus(s, 'manteau_chaud');
  assert(!st.ok && /mercerie/.test(st.raison), st.raison);
  assert(!craftStatus(s, 'salopette').ok || !commercesDe(s)[0].connues.includes('salopette'), 'la salopette : quand elle la sait');
  avecVillage(() => assert(!craftStatus(createNewGame(3), 'manteau_chaud').ok, 'éteint : pas à l\'Atelier (le jeu d\'avant)'), false);
});

/* ---------- la sauvegarde, le joueur automatique, éteint ---------- */

test('la sauvegarde : v100 → v101 ; le second et les teintes gardés, réparés ; une partie d\'avant laissée telle quelle', () => {
  assertEqual(STATE_VERSION >= 101, true, 'le format 101 (ou après)');
  const { s, V, c } = mercerie(3);
  c.second = V[1].id;
  V[1].tache = 'mercerie'; V[1].commerce = c.id;
  c.stock = { manteau_chaud: 2 };
  c.teintes = { manteau_chaud: { rouge: 1, licorne: 4 } };
  const m = migrate({ ...copie(s), version: 100 });
  assertEqual(m.version, STATE_VERSION);
  const mc = m.commerces[0];
  assertEqual([mc.second, mc.teintes], [V[1].id, { manteau_chaud: { rouge: 1 } }], 'gardé, la couleur inconnue ôtée');
  const abime = copie(s);
  abime.commerces[0].second = 'personne';
  abime.commerces[0].teintes = { manteau_chaud: { rouge: 9 }, fil: { bleu: 2 } };
  const a = migrate({ ...abime, version: 100 });
  assertEqual([a.commerces[0].second, a.commerces[0].teintes], [undefined, { manteau_chaud: { rouge: 2 } }], 'réparé : borné par le stock');
  assertEqual([a.villageois[1].tache, a.villageois[1].commerce], [null, undefined], 'un second sans commerce reprend sans tâche');
  const avant = avecVillage(() => createNewGame(5), false);
  const x = migrate({ ...copie(avant), version: 100 });
  assert(!('commerces' in x), 'une partie d\'avant : rien d\'ajouté');
});

test('le joueur automatique : la forge ouverte, il prépare la mercerie (la bergère, le local, les clous de la forge), puis l\'ouvre', () => {
  // (I5c : le plafond, un 2e commerce attend quatre villageois et le port au niveau 2)
  const { s, V } = ile(4);
  s.port = { ...(s.port || {}), niveau: 2 };
  const S = DATA.SIMULATION.VILLAGEOIS.COMMERCES;
  assertEqual(S.map((x) => x.SORTE), ['forge', 'mercerie'], 'la forge, puis la mercerie');
  // (la forge, ouverte d'abord)
  const f = V[2];
  f.envies = { forge: s.day };
  ajouterAmitie(s, f.id, SEUIL);
  testLocalCommerce(s, 'forge', true);
  assert(ouvrirCommerce(s, f.id, 'forge').ok, 'la forge');
  s.palier = S[1].PALIER;
  botCommerce(s);
  const b = V.find((x) => x.tache === 'betes');
  assert(b && b.id !== f.id, 'une bergère, pas le forgeron');
  b.envies = { mercerie: s.day };
  ajouterAmitie(s, b.id, SEUIL);
  s.pieces = 5000;
  addItem(s, 'planche', 40); addItem(s, 'bois', 20); addItem(s, 'fibre', 20);
  let id = null;
  for (let k = 0; k < 6 && !id; k++) {
    id = botCommerce(s);
    // (la forge fait ses lots : les clous et charnières que le bot lui commande ou lui achète)
    const forge = commercesDe(s).find((c) => c.sorte === 'forge'), fv = trouverVillageois(s, forge.qui);
    fv.bourse = 1000; addItem(s, 'minerai_fer', 20); addItem(s, 'bois', 20);
    for (let n = 0; n < 3; n++) lotCommerce(s, fv);
  }
  const mc = commercesDe(s).find((c) => c.sorte === 'mercerie');
  assert(mc && mc.qui === b.id && id === mc.id, `la mercerie ouverte : ${id}`);
});

test('éteint : pas de mercerie, la page et les nuits d\'avant', () => {
  avecVillage(() => {
    const s = createNewGame(2);
    s.commerces = [{ id: 'mercerie-1', sorte: 'mercerie', qui: 'x', second: 'y' }];
    assertEqual(commercesDe(s), [], 'rien ne se lit');
    runNight(s);
    assert(!ouvrirCommerce(s, 'x', 'mercerie').ok && !rejoindreCommerce(s, 'y', 'mercerie-1').ok, 'refusé');
  }, false);
});
