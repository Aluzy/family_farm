/* ==========================================================================
   Tests du chantier « l'île à bâtir » : la part, la bourse et l'étal (docs/ile.md, fiche I4 ; js/engine/bourse.js).
   Comme tous les fichiers tests/engine/village-*.test.mjs, il tourne avec VILLAGE.ACTIF forcé à true.
   - la part : prise sur le produit, jamais sur la caisse (B-1 : pas de dette) ; ce qui ne se mange pas d'abord, les
     graines en dernier ; le reste attend le lendemain ; la tournée du port ne prend rien ; la nuit l'écrit (J.part) ;
   - le bac : le panier se vend pour lui (sa bourse), part dans les caisses ; l'import à lui (l'argent quitte l'île),
     livré au passage suivant ; ce qui se mange, il le mange ;
   - l'étal : poser, mettre en vente, reprendre, les refus ; qui y va (ses goûts, ce qui lui manque, sa bourse), son
     créneau devant l'étal, l'achat au milieu de son créneau, puis la nuit ; un achat par jour ; jamais ce qu'il
     déteste ; son plaisir ; des entiers partout ;
   - le joueur automatique pose un étal et le garnit ; la sauvegarde (92 → 93) et les commandes ; éteint, rien.
   Lancer seul : node tests/run-tests.mjs village-bourse.
   ========================================================================== */

import {
  achatsDuJour, achatsNuit, addItem, arriverVillageois, attribuer, avancerAchats, avancerBac, donnerOutil, awakeMsAtHour, bilanJour, botEtal,
  caseEtal, countItem, DATA, devantEtal, enVenteAlEtal, envieDe, executerCommande, farmSeed, journeeDuVillage, mangerSesProvisions,
  mettreALEtal, migrate, partDue, poserEtalLibre, portDe, portDuMonde, prendreAvisEtal, prendrePart, prixIle, prixImport,
  reparerBourse, reprendreDeLEtal, runNight, STATE_VERSION, testMaisonVillageois, valeurIle, vendrePaniers, villageoisDe,
} from '../../js/engine/index.js';
import { assert, assertEqual, avecVillage, boite, partie, test } from './aide.mjs';

const copie = (o) => JSON.parse(JSON.stringify(o));
const BO = DATA.VILLAGE.BOURSE;

// La partie de test : le port, `n` maisons de villageois et leurs villageois, la boîte pleine.
function ile(n = 1, seed = 1) {
  const s = partie(seed);
  portDuMonde(farmSeed(s));
  boite(s, { pain: 80 });
  for (let k = 0; k < n; k++) assert(testMaisonVillageois(s).ok, 'la maison');
  const V = [];
  for (let k = 0; k < n; k++) {
    const r = arriverVillageois(s, { direct: true });
    assert(r.ok, 'il arrive');
    V.push(r.villageois);
  }
  return { s, V };
}

// Ses goûts, écrits à la main.
function gouts(v, g) {
  v.gouts = { ...g };
}

/* ---------- la part ---------- */

test('la part : PART % de ce qu\'il a produit, prise sur le produit (ce qui ne se mange pas d\'abord), jamais sur la caisse', () => {
  const { s, V: [v] } = ile();
  assertEqual(DATA.VILLAGE.PART, 30, 'la part proposée : 30 %');
  addItem(s, 'laine', 3); addItem(s, 'tomate', 20); addItem(s, 'graine_tomate', 10);
  const J = { jour: s.day, produit: { laine: 3, tomate: 20, graine_tomate: 10, pieces: 50 } };
  const { net, du } = partDue(J);
  assertEqual(net, 3 * valeurIle('laine') + 20 * valeurIle('tomate') + 10 * valeurIle('graine_tomate'), 'sa valeur : le produit (pas les pièces de la tournée)');
  assertEqual(du, Math.floor((net * 30) / 100));
  const caisse = s.pieces, avant = { laine: countItem(s, 'laine'), tomate: countItem(s, 'tomate'), graine: countItem(s, 'graine_tomate') };
  const p = prendrePart(s, v, J);
  assertEqual(s.pieces, caisse, 'la caisse du joueur n\'est pas touchée');
  assert(Number.isInteger(p) && p > 0 && p <= du, `la part prise : ${p} (due ${du})`);
  assert(v.panier.laine >= 1, `la laine d'abord (elle ne se mange pas) : ${JSON.stringify(v.panier)}`);
  assertEqual(countItem(s, 'laine'), avant.laine - (v.panier.laine || 0), 'prise sur le coffre');
  assertEqual(countItem(s, 'graine_tomate'), avant.graine, 'pas les graines : il faut ressemer');
  assertEqual(Object.entries(v.panier).reduce((t, [o, n]) => t + n * valeurIle(o), 0), p, 'le panier vaut la part prise');
  assert(v.reste >= 0 && v.reste < Math.max(valeurIle('laine'), valeurIle('tomate')), `un reste plus petit qu'un objet : ${v.reste}`);
});

test('la part : ce qui est parti du coffre ne se reprend pas (B-1 : pas de dette) ; le reste attend le lendemain', () => {
  const { s, V: [v] } = ile();
  // il a produit 10 laines, mais le joueur les a déjà vendues : rien à prendre, rien de dû
  const p = prendrePart(s, v, { jour: s.day, produit: { laine: 10 } });
  assertEqual([p, Object.keys(v.panier).length], [0, 0], 'rien de pris');
  assert(v.reste <= valeurIle('laine'), `le reste ne dépasse pas un objet : ${v.reste}`);
  // un jour d'une laine : la part (30 % d'une laine) attend ; la journée suivante, elle est prise
  v.reste = 0;
  addItem(s, 'laine', 4);
  assertEqual(prendrePart(s, v, { jour: s.day, produit: { laine: 1 } }), 0, 'moins qu\'une laine : rien encore');
  assertEqual(v.reste, Math.floor((valeurIle('laine') * 30) / 100), 'le reste attend');
  let pris = 0;
  for (let k = 0; k < 4; k++) pris += prendrePart(s, v, { jour: s.day, produit: { laine: 1 } });
  assertEqual(pris, valeurIle('laine'), 'au bout de quelques jours, une laine');
  // la cuisine : la part sur ce qu'elle ajoute (le plat moins ses ingrédients)
  assertEqual(partDue({ produit: { omelette: 1 }, utilise: { oeuf: 3, huile: 1 } }).net, Math.max(0, valeurIle('omelette') - 3 * valeurIle('oeuf') - valeurIle('huile')));
});

test('la nuit : le travail du jour, puis la part (J.part, que le tableau compte dans le coût)', () => {
  const { s, V: [v] } = ile();
  s.outils = { ...s.outils, hache: true };
  assert(donnerOutil(s, v.id, 'hache').ok, 'sa hache');
  attribuer(s, v.id, 'bois');
  runNight(s);
  const J = v.journal[v.journal.length - 1];
  assert(J.actions > 0 && J.produit.bois > 0, `il a coupé du bois : ${JSON.stringify(J.produit)}`);
  assert(J.part > 0, `sa part : ${J.part}`);
  const b = bilanJour(J);
  assertEqual(b.part, J.part || 0, 'le tableau lit la part');
  assertEqual(b.cout, b.repas + b.part + b.matieres, 'dans le coût');
  assertEqual(Object.entries(v.panier).reduce((t, [o, n]) => t + n * valeurIle(o), 0), J.part || 0, 'son panier');
});

/* ---------- le bac ---------- */

test('le bac : le panier se vend pour lui (sa bourse), part dans les caisses ; l\'import à lui quitte l\'île', () => {
  const { s, V: [v] } = ile();
  v.panier = { laine: 2, tomate: 5 };
  v.bourse = 0;
  const caisse = s.pieces, vendu = {};
  const r = vendrePaniers(s, 3, vendu);
  const valeur = 2 * valeurIle('laine') + 5 * valeurIle('tomate');
  assertEqual([v.bourse, r.ventes[v.id], v.vente.pieces], [valeur, valeur, valeur], 'sa bourse');
  assertEqual(vendu, { laine: 2, tomate: 5 }, 'dans les caisses du bac');
  assertEqual([s.pieces, Object.keys(v.panier).length], [caisse, 0], 'la caisse du joueur ne bouge pas ; le panier est vide');
  // l'import : il adore la tarte aux pommes ; sa bourse passe le seuil
  gouts(v, { tarte_pommes: 'adore' });
  v.bourse = BO.IMPORT.SEUIL + 200;
  const avant = v.bourse;
  vendrePaniers(s, 6, {});
  const c = v.commande;
  assert(c && c.objet === 'tarte_pommes' && c.n >= 1 && c.n <= BO.IMPORT.MAX, `sa commande : ${JSON.stringify(c)}`);
  assertEqual(c.prix, c.n * prixImport('tarte_pommes'));
  assertEqual(v.bourse, avant - c.prix, 'payée de sa bourse');
  assert(v.bourse >= BO.IMPORT.GARDE, 'il garde de quoi aller à l\'étal');
  assertEqual(s.pieces, caisse, 'l\'argent quitte l\'île (pas pour le joueur)');
  // le passage suivant : elle arrive ; une tarte se mange : ses provisions ; son plaisir
  vendrePaniers(s, 6 + DATA.PORT.BAC.PERIODE, {});
  assertEqual(v.provisions.tarte_pommes, c.n, 'ses provisions');
  assertEqual(v.plaisir, { jour: 6 + DATA.PORT.BAC.PERIODE, bonheur: BO.IMPORT.BONHEUR }, 'son plaisir');
  assertEqual(v.achats[v.achats.length - 1].ou, 'bac');
  // à son repas, il mange d'abord ses provisions
  const m = mangerSesProvisions(v, 1000);
  assertEqual(m.mange.tarte_pommes, c.n, 'il les mange');
});

test('le bac du moteur : à son arrivée, avancerBac vend les paniers', () => {
  const { s, V: [v] } = ile();
  v.panier = { laine: 1 };
  v.bourse = 0;
  const p = portDe(s);
  s.day = p.passe + DATA.PORT.BAC.PERIODE;
  s.awakeMs = awakeMsAtHour(DATA.PORT.BAC.HEURES[0] + 1);
  avancerBac(s);
  assertEqual(v.bourse, valeurIle('laine'), 'vendue au passage du bac');
});

/* ---------- l'étal ---------- */

test('l\'étal : posé dehors, deux cases ; mettre en vente, reprendre ; les refus', () => {
  const { s } = ile();
  addItem(s, 'tomate', 30); addItem(s, 'lingot_fer', 2);
  assert(!mettreALEtal(s, 'tomate', 1).ok, 'sans étal posé : refusé');
  const r = poserEtalLibre(s, true);
  assert(r.ok, r.error);
  assertEqual(caseEtal(s), r.case);
  assertEqual(devantEtal(s).length, 2, 'deux cases devant');
  assert(mettreALEtal(s, 'tomate', 5).ok);
  assertEqual([countItem(s, 'tomate'), enVenteAlEtal(s)[0].n, enVenteAlEtal(s)[0].prix], [25, 5, prixIle('tomate')], 'de l\'inventaire à l\'étal, au prix de l\'île');
  assert(!mettreALEtal(s, 'lingot_fer', 1).ok, 'ce qui ne se vend pas');
  assert(!mettreALEtal(s, 'tomate', BO.ETAL.QUANTITE).ok || enVenteAlEtal(s)[0].n <= BO.ETAL.QUANTITE, 'pas plus de QUANTITE');
  assert(reprendreDeLEtal(s, 'tomate', 2).ok);
  assertEqual(countItem(s, 'tomate'), 30 - enVenteAlEtal(s)[0].n, 'reprises');
  // les commandes
  assert(executerCommande(s, { type: 'etal.mettre', args: { objet: 'tomate', quantite: 1 } }).ok);
  assert(executerCommande(s, { type: 'etal.reprendre', args: { objet: 'tomate', quantite: 1 } }).ok);
});

test('l\'achat : ce qu\'il adore, ce qui lui manque, ce qu\'il aime ; jamais ce qu\'il déteste ; sa bourse', () => {
  const { s, V: [v] } = ile();
  gouts(v, { tarte_pommes: 'adore', fraise: 'aime', tomate: 'deteste' });
  assertEqual([envieDe(v, 'tarte_pommes'), envieDe(v, 'fraise'), envieDe(v, 'tomate'), envieDe(v, 'carotte')], ['adore', 'aime', null, null]);
  assertEqual(envieDe(v, 'manteau_chaud'), 'besoin', 'un vêtement qui lui manque');
  v.affaires = { manteau_chaud: 1 };
  assertEqual(envieDe(v, 'manteau_chaud'), null, 'une fois');
  assert(poserEtalLibre(s, true).ok);
  addItem(s, 'tomate', 5); addItem(s, 'fraise', 5); addItem(s, 'tarte_pommes', 2);
  mettreALEtal(s, 'tomate', 5); mettreALEtal(s, 'fraise', 5);
  v.bourse = 0;
  assertEqual(achatsDuJour(s).size, 0, 'sans le sou : il ne vient pas');
  v.bourse = 100;
  assertEqual(achatsDuJour(s).get(v.id).objet, 'fraise', 'ce qu\'il aime (jamais ce qu\'il déteste)');
  mettreALEtal(s, 'tarte_pommes', 2);
  assertEqual(achatsDuJour(s).get(v.id).objet, 'tarte_pommes', 'ce qu\'il adore d\'abord');
  v.bourse = prixIle('tarte_pommes') - 1;
  assertEqual(achatsDuJour(s).get(v.id).objet, 'fraise', 'ce qu\'il peut payer');
});

test('l\'achat dans la journée : son créneau devant l\'étal après le travail, l\'achat au milieu ; ses pièces au joueur ; un par jour', () => {
  const { s, V: [v, w] } = ile(2);
  gouts(v, { fraise: 'adore' }); gouts(w, { fraise: 'aime' });
  assert(poserEtalLibre(s, true).ok);
  addItem(s, 'fraise', 1);
  mettreALEtal(s, 'fraise', 1);
  v.bourse = 50; w.bourse = 50;
  const A = achatsDuJour(s);
  assertEqual([A.has(v.id), A.has(w.id)], [true, false], 'une fraise : le premier (dans l\'ordre des id) la prend');
  const seg = journeeDuVillage(s).get(v.id).find((x) => x.but && x.but.sorte === 'etal');
  assert(seg, 'son créneau devant l\'étal');
  assert(seg.de >= 16.5 - 1e-9 || seg.de >= 13, `l'après-midi (${seg.de})`);
  assert(devantEtal(s).includes(seg.lieu.case) && seg.lieu.vers === caseEtal(s), 'devant l\'étal, tourné vers lui');
  assert(seg.but.dit && seg.but.dit.toLowerCase().includes('fraise'), `ce qu'il dit : ${seg.but.dit}`);
  // avant le milieu : rien ; après : l'achat
  s.awakeMs = awakeMsAtHour(seg.de);
  assertEqual(avancerAchats(s), 0, 'pas encore');
  const caisse = s.pieces;
  s.awakeMs = awakeMsAtHour((seg.de + seg.a) / 2 + 0.01);
  assertEqual(avancerAchats(s), 1, 'il achète');
  assertEqual([s.pieces - caisse, v.bourse, enVenteAlEtal(s).length], [prixIle('fraise'), 50 - prixIle('fraise'), 0], 'ses pièces au joueur ; l\'étal se vide');
  assert(Number.isInteger(s.pieces) && Number.isInteger(v.bourse), 'des entiers');
  assertEqual(v.plaisir, { jour: s.day, bonheur: BO.BONHEUR.adore }, 'son plaisir');
  assertEqual(v.provisions.fraise, 1, 'une fraise se mange : ses provisions');
  const avis = prendreAvisEtal(s);
  assertEqual(avis.map((a) => [a.id, a.objet, a.prix]), [[v.id, 'fraise', prixIle('fraise')]], 'la page le dira');
  // le même jour, son créneau reste (il est allé à l'étal) ; pas d'autre achat
  assert(journeeDuVillage(s).get(v.id).some((x) => x.but && x.but.sorte === 'etal'), 'son créneau reste');
  addItem(s, 'fraise', 1);
  mettreALEtal(s, 'fraise', 1);
  s.awakeMs = awakeMsAtHour(18);
  avancerAchats(s);
  assertEqual(v.achats.length, 1, 'un achat par jour pour lui');
  assertEqual([w.achats && w.achats.length, enVenteAlEtal(s).length], [1, 0], 'la fraise remise en vente : l\'autre, qui l\'aime, en profite');
});

test('la nuit fait l\'achat qu\'on n\'a pas vu ; son plaisir monte sa cible ; ce qu\'il a acheté le nourrit', () => {
  const { s, V: [v] } = ile();
  gouts(v, { tarte_pommes: 'adore' });
  assert(poserEtalLibre(s, true).ok);
  addItem(s, 'tarte_pommes', 1);
  mettreALEtal(s, 'tarte_pommes', 1);
  v.bourse = 100;
  const t = copie(s), u = copie(s);
  assertEqual(achatsNuit(t), 1, 'la nuit : l\'achat');
  // runNight : l'achat, puis il mange sa tarte d'abord (pas à la boîte : le tableau ne la compte pas)
  runNight(u);
  const w = villageoisDe(u)[0], J = w.journal[w.journal.length - 1];
  assertEqual(J.siens, { tarte_pommes: 1 }, 'il a mangé sa tarte');
  assert(!(J.mange && J.mange.tarte_pommes), 'pas comptée dans son repas de la boîte');
  // sans l'achat, la même nuit : sa cible de bonheur est plus basse
  const sans = copie(s);
  sans.etal.objets = {};
  runNight(sans);
  assert(villageoisDe(u)[0].bonheur >= villageoisDe(sans)[0].bonheur, 'le plaisir d\'un achat');
});

/* ---------- le joueur automatique, la sauvegarde, éteint ---------- */

test('le joueur automatique pose un étal et y met ce que les villageois aiment', () => {
  const { s, V: [v] } = ile();
  gouts(v, { fraise: 'adore' });
  addItem(s, 'etal', 1);
  addItem(s, 'fraise', DATA.SIMULATION.VIVRES_GARDES * 2 + 5);
  assert(botEtal(s), 'l\'étal');
  assert(caseEtal(s) !== null, 'posé');
  assertEqual(enVenteAlEtal(s).map((x) => [x.objet, x.n]), [['fraise', DATA.SIMULATION.VILLAGEOIS.ETAL.PAR_OBJET]], 'garni');
});

test('la sauvegarde : v92 → v93 (la bourse et l\'étal réparés ; sans villageois, rien)', () => {
  assert(STATE_VERSION >= 93, 'le format 93 ou plus');
  const { s, V: [v] } = ile();
  const vieille = copie(s);
  vieille.version = 92;
  delete vieille.villageois[0].panier;
  vieille.villageois[0].bourse = 12.7;
  vieille.etal = { objets: { tomate: 3, inconnu: 2, fraise: -1 }, avis: [{ id: 'x' }] };
  const m = migrate({ v: 1, t: 0, s: vieille });
  assertEqual(m.version, STATE_VERSION);
  const w = m.villageois[0];
  assertEqual([w.bourse, w.panier, w.reste, w.achat, w.achats, w.affaires, w.provisions, w.commande], [13, {}, 0, null, [], {}, {}, null], 'une bourse neuve, lisible');
  assertEqual(m.etal, { objets: { tomate: 3 }, avis: [] }, 'l\'étal : ce qui est lisible');
  const abime = reparerBourse({ ...v, panier: { laine: 'x', tomate: 2 }, commande: { objet: 'tarte_pommes', prix: 40, arrive: 9, n: 0 }, achats: [{ jour: 2, objet: 'fraise', prix: 3, ou: 'etal' }, 'x'] });
  assertEqual([abime.panier, abime.commande.n, abime.achats.length], [{ tomate: 2 }, 1, 1]);
  const sans = copie(partie(12));
  sans.version = 92;
  const m2 = migrate({ v: 1, t: 0, s: sans });
  assert(!('etal' in m2) && !('villageois' in m2), 'rien sans villageois ni étal');
});

test('éteint : ni part, ni étal, ni achat ; les prix écrits', () => {
  avecVillage(() => {
    const s = partie(5);
    addItem(s, 'laine', 5);
    const v = { id: 'vg-1', gouts: {}, bourse: 0 };
    assertEqual(prendrePart(s, v, { jour: 1, produit: { laine: 5 } }), 0, 'pas de part');
    assertEqual(countItem(s, 'laine'), 5);
    assert(!mettreALEtal(s, 'laine', 1).ok, 'pas d\'étal');
    assertEqual(achatsDuJour(s).size, 0);
    assertEqual(achatsNuit(s), 0);
    assert(!('etal' in s), 'rien d\'écrit');
  }, false);
});
