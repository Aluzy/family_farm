/* ==========================================================================
   Tests du moteur : couper, casser, cueillir et ramasser dans le grand monde
   (js/engine/monde-recolte.js, fiche 6a). Les identifiants des pièces (« sorte:x,y », le pied en
   px) ne dépendent ni de l'ordre des régions ni du Worker ; chaque sorte qui se prend a sa règle
   (data/monde.json, RECOLTE) et son butin existe ; les gestes vérifient l'outil, la distance et
   l'énergie, comme sur la ferme ; ce qui est pris ouvre sa case à la marche, ne revient pas avant
   son jour, revient ensuite, dans une région vue, pas sous le personnage ; la migration v53 → v54 ;
   la ferme et ses identifiants ne changent pas.
   Lancer seul : node --test tests/engine/monde-recolte.test.mjs (ou node tests/run-tests.mjs monde-recolte).
   ========================================================================== */

import {
  caseMarchable, casesOuvertesMonde, casserMonde, chopTree, contexteSol, countItem, couperMonde, cueillirMonde, DATA,
  faucherMonde, farmTerrain, fellenTrees, genererMonde, idObjetMonde, lireIdMonde, migrate, MONDE, mondeCueillis,
  mondePris, morceauxDe, noterIci, objetPris, objetsDeRegion, ramasserMonde, ramasserMorceau, RECOLTE, recolterMonde,
  regionDeCase, regionsVues, repousseMonde, solDeRegion, solDirect, STATE_VERSION, testSetEnergyZero, TIRED,
} from '../../js/engine/index.js';
import { SORTES_ROCHES } from '../../js/engine/monde-roches.js';
import { SORTES } from '../../js/engine/monde-vegetation.js';
import { assert, assertEqual, garden, sleepOnce, test } from './aide.mjs';

const W = MONDE.LARGEUR, N = MONDE.REGION;

// Une partie de test, ses outils, toute son énergie.
function partie() {
  const s = garden();
  s.outils = { hache: true, pioche: true, faux: true, choisi: 'hache' };
  s.energie = DATA.PERSONNAGE.MAX * 1000;
  return s;
}

// La première pièce de la sorte `nom` (grande ou petite, `test` en plus) dans les régions du monde
// de la partie, des plus proches de la ferme aux plus loin : { …objetsDeRegion, cle, case }.
const toutes = new Map();
function trouve(s, nom, test = () => true) {
  const T = farmTerrain(s), sol = solDirect(T);
  if (!toutes.has(T)) {
    const liste = [];
    for (let ry = 0; ry * N < MONDE.HAUTEUR; ry++) for (let rx = 0; rx * N < W; rx++) liste.push([rx, ry]);
    liste.sort((a, b) => Math.hypot(a[0] - 5, a[1] - 4) - Math.hypot(b[0] - 5, b[1] - 4));
    toutes.set(T, liste);
  }
  for (const [rx, ry] of toutes.get(T)) {
    for (const o of objetsDeRegion(sol.region(rx, ry))) {
      const X = Math.floor(o.x / 16), Y = Math.floor((o.y - 1) / 16);
      if (o.nom === nom && Math.floor(X / N) === rx && Math.floor(Y / N) === ry && test(o)) return { ...o, cle: rx + ',' + ry, case: Y * W + X };
    }
  }
  throw new Error('pas de ' + nom);
}

test('le monde : les identifiants des pièces ne dépendent ni de l\'ordre des régions, ni du Worker', async () => {
  const M = genererMonde('recolte-1').terrain.MONDE;
  const a = contexteSol(M.graine, M.cadre, M.ferme, M.taille), b = contexteSol(M.graine, M.cadre, M.ferme, M.taille);
  const liste = [[1, 1], [2, 1], [1, 2], [8, 6], [9, 6], [8, 7]];
  const ra = new Map(), rb = new Map();
  for (const [rx, ry] of liste) ra.set(rx + ',' + ry, objetsDeRegion(solDeRegion(a, rx, ry)).map((o) => o.id));
  for (const [rx, ry] of liste.slice().reverse()) rb.set(rx + ',' + ry, objetsDeRegion(solDeRegion(b, rx, ry)).map((o) => o.id));
  let n = 0;
  for (const [cle, ids] of ra) {
    assertEqual(ids, rb.get(cle), 'les pièces de ' + cle);
    assertEqual(new Set(ids).size, ids.length, 'chacune une fois dans ' + cle);
    for (const id of ids) { const o = lireIdMonde(id); assert(o && o.regle && idObjetMonde(o.nom, o.x, o.y) === id, id); }
    n += ids.length;
  }
  assert(n > 500, `des pièces à prendre (${n})`);
  // une petite pièce du bord commun de deux régions voisines : le même identifiant dans les deux
  const g = new Set(ra.get('1,1')), d = ra.get('2,1').filter((id) => g.has(id));
  assert(d.length > 0 && d.every((id) => Math.abs(lireIdMonde(id).X - 2 * N) <= 2), 'les pièces du bord, les mêmes');
  // le Web Worker (js/monde-worker.js) : les mêmes pièces, donc les mêmes identifiants
  const recus = [];
  globalThis.self = { postMessage: (msg) => recus.push(msg) };
  try {
    await import('../../js/monde-worker.js?recolte');
    self.onmessage({ data: { type: 'init', graine: M.graine, cadre: M.cadre, ferme: M.ferme, taille: M.taille } });
    self.onmessage({ data: { type: 'region', rx: 8, ry: 6 } });
    for (let k = 0; k < 400 && !recus.some((r) => r.type === 'region'); k++) await new Promise((ok) => setTimeout(ok, 10));
    const r = recus.find((x) => x.type === 'region');
    assertEqual(objetsDeRegion(r.region).map((o) => o.id), ra.get('8,6'), 'le Worker et le calcul direct');
  } finally {
    delete globalThis.self;
  }
});

test('le monde : chaque sorte qui se prend a sa règle, son butin existe ; le décor reste du décor', () => {
  const noms = new Set([...SORTES, ...SORTES_ROCHES].map((s) => s.nom));
  for (const [nom, r] of Object.entries(RECOLTE.SORTES)) {
    assert(noms.has(nom), nom + ' : une sorte du monde');
    for (const item of [...Object.keys(r.coup || {}), ...Object.keys(r.fin), ...Object.keys(r.chance || {})]) assert(DATA.OBJETS[item], `${nom} → ${item}`);
  }
  for (const nom of ['feuillu', 'sapin', 'bouleau', 'saule', 'pin_tordu', 'souche', 'tronc_couche', 'bois_flotte', 'ronces', 'champignons', 'fougere', 'roseaux', 'jonc', 'oyat', 'rocher', 'bloc', 'eboulis', 'coquillages', 'etoile_mer', 'algues']) assert(RECOLTE.SORTES[nom], nom + ' se prend');
  for (const nom of ['paroi', 'paroi_herbe', 'paroi_neige', 'piton', 'piton_neige', 'rocher_mer', 'epave']) assert(!RECOLTE.SORTES[nom], nom + ' reste du décor');
  // les objets nouveaux : vendables, pas rachetables
  for (const id of ['mures', 'etoile_mer', 'algues']) assert(DATA.OBJETS[id] && DATA.OBJETS[id].prix > 0 && DATA.OBJETS[id].rachetable === false, id);
});

test('le monde : abattre un arbre (la hache, l\'énergie, ses coups, son bois au sol), puis on passe là où il était', () => {
  const s = partie(), T = farmTerrain(s), a = trouve(s, 'feuillu');
  const sol = solDirect(T);
  assert(!caseMarchable(T, a.case, sol, casesOuvertesMonde(s)), 'son pied ne se traverse pas');
  // sans hache, rien
  s.outils.hache = false;
  assertEqual(couperMonde(s, a.id).ok, false);
  s.outils.hache = true;
  // la mauvaise main : un arbre ne se ramasse pas, une pioche ne le coupe pas
  assertEqual(ramasserMonde(s, a.id).error, 'Il faut la hache pour couper ça.');
  assertEqual(casserMonde(s, a.id).ok, false);
  // trop loin du personnage
  assertEqual(couperMonde(s, a.id, null, false, a.case + 60).error, 'C\'est trop loin : approche-toi.');
  const bois0 = countItem(s, 'bois'), e0 = s.energie;
  const ou = { carte: 'ferme', coup: [{ x: a.x - 10, y: a.y }], fin: [{ x: a.x + 30, y: a.y }] };
  const r1 = couperMonde(s, a.id, ou, false, a.case + 1);
  assert(r1.ok && !r1.tombe && r1.reste === 2 && s.energie < e0, 'un coup');
  assertEqual(r1.morceaux.coup.length, 1, 'son bois tombe au sol');
  assertEqual(s.monde.pris[a.id], 1, 'les coups reçus, par son identifiant');
  couperMonde(s, a.id, ou);
  const r3 = couperMonde(s, a.id, ou);
  assert(r3.ok && r3.tombe, 'il tombe au troisième coup');
  assert(r3.morceaux.fin.length >= 2, 'son bois là où il touche le sol');
  assert(objetPris(s, a.id) && mondePris(s).includes(a.id), 'pris');
  assertEqual(couperMonde(s, a.id, ou).ok, false, 'déjà abattu');
  for (const m of morceauxDe(s, 'ferme')) ramasserMorceau(s, m.n);
  assert(countItem(s, 'bois') >= bois0 + 4, 'le bois ramassé');
  // sa case s'ouvre
  assert(caseMarchable(T, a.case, sol, casesOuvertesMonde(s)), 'on passe là où était l\'arbre');
  assert(casesOuvertesMonde(s) === casesOuvertesMonde(s), 'gardées tant que rien ne change (lues à chaque case d\'un trajet)');
  assertEqual(fellenTrees(s), [], 'la ferme n\'en sait rien');
});

test('le monde : casser un rocher, faucher une fougère, cueillir des mûres, ramasser un coquillage', () => {
  const s = partie(), T = farmTerrain(s), sol = solDirect(T);
  // un rocher : la pioche, ses coups, sa pierre
  const r = trouve(s, 'rocher');
  s.outils.pioche = false;
  assertEqual(casserMonde(s, r.id).ok, false, 'sans pioche');
  s.outils.pioche = true;
  let fin = null;
  for (let k = 0; k < 3; k++) fin = casserMonde(s, r.id);
  assert(fin.ok && fin.casse && fin.items.pierre >= 3, 'cassé au troisième coup, sa pierre dans l\'inventaire (sans carte)');
  assert(caseMarchable(T, r.case, sol, casesOuvertesMonde(s)), 'sa case s\'ouvre');
  // une fougère : la faux
  const f = trouve(s, 'fougere');
  s.outils.faux = false;
  assertEqual(faucherMonde(s, f.id).ok, false, 'sans faux');
  s.outils.faux = true;
  const fibre = countItem(s, 'fibre');
  assert(faucherMonde(s, f.id).ok && countItem(s, 'fibre') === fibre + 1, 'sa fibre');
  // un roncier en fleur, puis un roncier en fruits
  const fleur = trouve(s, 'ronces', (o) => o.variante === 2), mur = trouve(s, 'ronces', (o) => o.variante !== 2);
  assertEqual(cueillirMonde(s, fleur.id, fleur.variante).error, 'Ce roncier est en fleur : pas encore de mûres.');
  const c = cueillirMonde(s, mur.id, mur.variante);
  assert(c.ok && c.items.mures >= 2 && countItem(s, 'mures') === c.items.mures, 'les mûres dans l\'inventaire');
  assert(mondeCueillis(s).includes(mur.id) && !mondePris(s).includes(mur.id), 'le roncier reste, sans mûres');
  assert(!caseMarchable(T, mur.case, sol, casesOuvertesMonde(s)), 'et ne se traverse toujours pas');
  assertEqual(cueillirMonde(s, mur.id, mur.variante).ok, false, 'une fois');
  // un coquillage, à la main (recolterMonde choisit le geste)
  const q = trouve(s, 'coquillages');
  const avant = countItem(s, 'coquille');
  const g = recolterMonde(s, q.id, {});
  assert(g.ok && countItem(s, 'coquille') === avant + 1, 'la coquille');
  assert(objetPris(s, q.id), 'il n\'est plus sur la plage');
  // sans énergie, rien
  const h = trouve(s, 'champignons');
  testSetEnergyZero(s);
  assertEqual(ramasserMonde(s, h.id).error, TIRED);
  assert(!objetPris(s, h.id));
  // les régions des pièces prises sont vues (elles repousseront)
  for (const o of [r, f, mur, q]) assert(regionsVues(s).has(regionDeCase(o.case)), 'vue : ' + o.cle);
});

test('le monde : ce qui est pris ne revient pas avant son jour, revient ensuite ; jamais sous le personnage ni dans une région pas vue', () => {
  const s = partie();
  const a = trouve(s, 'sapin'), q = trouve(s, 'galets'), m = trouve(s, 'ronces', (o) => o.variante === 0);
  for (let k = 0; k < 3; k++) couperMonde(s, a.id);
  ramasserMonde(s, q.id);
  cueillirMonde(s, m.id, 0);
  couperMonde(s, trouve(s, 'bouleau').id);      // un seul coup : il s'oublie la nuit
  const retour = (id) => s.monde.pris[id].retour;
  assert(retour(a.id) >= s.day + RECOLTE.SORTES.sapin.retour[0] && retour(a.id) <= s.day + RECOLTE.SORTES.sapin.retour[1], 'le jour de son retour');
  sleepOnce(s);
  assertEqual(Object.keys(s.monde.pris).sort(), [a.id, q.id, m.id].sort(), 'la nuit : les coups reçus s\'oublient, le reste attend son jour');
  const ra = retour(a.id), rq = retour(q.id), rm = retour(m.id);
  while (s.day < ra - 1) {
    sleepOnce(s);
    assert(objetPris(s, a.id), `jour ${s.day} : pas avant le jour ${ra}`);
    assertEqual([s.day >= rq, s.day >= rm], [!s.monde.pris[q.id], !s.monde.pris[m.id]], 'les autres, à leur jour');
  }
  // le personnage est au pied du sapin : il ne repousse pas sous lui
  noterIci(s, a.case);
  sleepOnce(s);
  assert(s.day >= ra && objetPris(s, a.id), 'son jour est venu, mais pas sous le personnage');
  noterIci(s, a.case + 5);
  sleepOnce(s);
  assert(!s.monde.pris[a.id], 'il s\'en va : le sapin repousse');
  for (let k = 0; k < 12; k++) sleepOnce(s);
  assertEqual(s.monde.pris, {}, 'tout est revenu : la sauvegarde ne grossit pas');
  // une région pas vue : rien ne bouge
  const loin = trouve(s, 'rocher', (o) => !regionsVues(s).has(regionDeCase(Math.floor((o.y - 1) / 16) * W + Math.floor(o.x / 16))));
  s.monde.pris[loin.id] = { retour: s.day };
  assertEqual(repousseMonde(s), [], 'pas vue : il attend');
  s.monde.vues.push(loin.cle);
  assertEqual(repousseMonde(s), [loin.id], 'vue : il revient');
});

test('migration v53 → v54 : rien de pris dans le monde, rien d\'autre ne change', () => {
  const s = partie();
  const { pris, ...monde } = s.monde;
  const v53 = JSON.parse(JSON.stringify({ ...s, monde, version: 53 }));
  const m = migrate({ v: 53, t: 0, s: v53 });
  assertEqual(m.version, STATE_VERSION);
  assertEqual(m.monde, { ...monde, pris: {} });
  assertEqual({ ...m, monde: undefined }, { ...JSON.parse(JSON.stringify(s)), monde: undefined });
  assert(sleepOnce(m) !== null, 'la partie continue');
  // ce qui est pris passe la sauvegarde
  const a = trouve(m, 'feuillu');
  for (let k = 0; k < 3; k++) couperMonde(m, a.id);
  const relue = migrate({ v: STATE_VERSION, t: 0, s: JSON.parse(JSON.stringify(m)) });
  assert(objetPris(relue, a.id), 'toujours abattu');
});

test('la ferme : ses arbres, ses rochers et leurs identifiants ne changent pas', () => {
  const s = partie(), T = farmTerrain(s);
  const [arbre] = Object.keys(T.ARBRES);
  for (let k = 0; k < DATA.HACHE.COUPES; k++) assert(chopTree(s, arbre).ok);
  assertEqual(fellenTrees(s), [arbre], 'un arbre de la ferme : comme avant');
  assertEqual(s.monde.pris, {}, 'le monde n\'en sait rien');
  assertEqual(recolterMonde(s, arbre).ok, false, 'un identifiant de la ferme n\'est pas une pièce du monde');
  assertEqual(lireIdMonde(arbre), null);
  // la marche sur la ferme : rien ne change
  const F = T.FERME;
  assert(caseMarchable(T, F.Y * W + F.X, solDirect(T), casesOuvertesMonde(s)));
});
