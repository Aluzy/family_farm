/* ==========================================================================
   Tests du moteur : les gisements de minerai (docs/gisements.md ; js/engine/outils.js gisementsFerme,
   js/engine/monde-recolte.js, data/monde.json ROCHES et RECOLTE).
   - les données : quatre sortes de gisements (fer, cuivre, or, platine), leur règle, leurs dessins ;
   - dans le grand monde : on en trouve ; ils se cassent à la pioche (plus de coups qu'un rocher), le minerai à la
     fin ; l'or et le platine demandent leur niveau de pioche ;
   - sur la ferme : quelques gros rochers sont des gisements de fer et de cuivre, toujours les mêmes ; la pioche
     les casse, leur minerai tombe ; ils reviennent après leur retour.
   Lancer seul : node tests/run-tests.mjs gisements.
   ========================================================================== */

import {
  casserMonde, countItem, DATA, farmTerrain, gisementsFerme, migrate, MONDE, mineRock, objetsDeRegion, ramasserMonde, RECOLTE, rockGone,
  genererFerme, planDuMonde, solDirect, STATE_VERSION, testFarmMap,
} from '../../js/engine/index.js';
import { SORTES_ROCHES } from '../../js/engine/monde-roches.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

const METAUX = ['fer', 'cuivre', 'or', 'platine'];
const W = MONDE.LARGEUR, N = MONDE.REGION;

function partie() {
  const s = garden();
  s.outils = { hache: true, pioche: true, faux: true, choisi: 'pioche' };
  s.energie = DATA.PERSONNAGE.MAX * 1000;
  return s;
}

// La première pièce de la sorte `nom` dans les régions du monde, des plus proches de la ferme aux plus loin.
function trouve(s, nom) {
  const T = farmTerrain(s), sol = solDirect(T), liste = [];
  for (let ry = 0; ry * N < MONDE.HAUTEUR; ry++) for (let rx = 0; rx * N < W; rx++) liste.push([rx, ry]);
  liste.sort((a, b) => Math.hypot(a[0] - 5, a[1] - 4) - Math.hypot(b[0] - 5, b[1] - 4));
  for (const [rx, ry] of liste) {
    for (const o of objetsDeRegion(sol.region(rx, ry))) {
      const X = Math.floor(o.x / 16), Y = Math.floor((o.y - 1) / 16);
      if (o.nom === nom && Math.floor(X / N) === rx && Math.floor(Y / N) === ry) return o;
    }
  }
  return null;
}

test('les données : quatre gisements, leur règle (casser, le minerai à la fin), leur dessin', () => {
  for (const m of METAUX) {
    const s = SORTES_ROCHES.find((x) => x.nom === 'gisement_' + m), r = RECOLTE.SORTES['gisement_' + m];
    assert(s && s.genre === 'bloc', m);
    assertEqual([r.geste, r.minerai, Object.keys(r.fin)], ['casser', m, ['minerai_' + m]], m);
    assert(r.coups > RECOLTE.SORTES.rocher.coups, `${m} : plus dur qu'un rocher`);
  }
  assertEqual(DATA.PIOCHE.GISEMENTS, { fer: 3, cuivre: 2 });
});

test('le grand monde : un gisement de fer se casse à la pioche, son minerai à la fin', () => {
  const s = partie();
  const g = trouve(s, 'gisement_fer');
  assert(g, 'un gisement de fer dans le monde');
  const n = RECOLTE.SORTES.gisement_fer.coups;
  let r = null;
  for (let k = 0; k < n; k++) { r = casserMonde(s, g.id); assert(r.ok, r.error); }
  assert(r.fini, `cassé au ${n}e coup`);
  assert(countItem(s, 'minerai_fer') >= 3, 'son minerai dans l\'inventaire (sans carte)');
  assert(!casserMonde(s, g.id).ok, 'pris : il repoussera');
});

test('le grand monde : l\'or et le platine demandent leur niveau de pioche', () => {
  const s = partie();
  for (const [m, niveau] of [['or', DATA.PIOCHE.MINERAIS.or], ['platine', DATA.PIOCHE.MINERAIS.platine]]) {
    const g = trouve(s, 'gisement_' + m);
    assert(g, `un gisement d'${m} dans le monde`);
    s.outils.niveauPioche = niveau - 1;
    const r = casserMonde(s, g.id);
    assert(!r.ok && /pioche/.test(r.error), `${m} : refusé avec une pioche trop faible`);
    s.outils.niveauPioche = niveau;
    assert(casserMonde(s, g.id).ok, `${m} : accepté au niveau ${niveau}`);
  }
});

test('la ferme : quelques gros rochers sont des gisements de fer et de cuivre, toujours les mêmes', () => {
  for (const graine of ['gis-1', 'gis-2']) {
    const s = partie();
    testFarmMap(s, graine);
    const G = gisementsFerme(s), T = farmTerrain(s);
    const n = Object.values(G).reduce((o, m) => ({ ...o, [m]: (o[m] || 0) + 1 }), {});
    assertEqual(n, { fer: 3, cuivre: 2 }, graine);
    assert(Object.keys(G).every((id) => T.ROCHERS[id].length === 4), 'de gros rochers (deux cases sur deux)');
    const t = partie();
    testFarmMap(t, graine);
    assertEqual(gisementsFerme(t), G, 'les mêmes');
  }
});

test('la ferme : la pioche casse un gisement (plus de coups), la pierre à chaque coup, le minerai à la fin', () => {
  const s = partie();
  testFarmMap(s, 'gis-3');
  const [id, metal] = Object.entries(gisementsFerme(s))[0];
  const regle = RECOLTE.SORTES['gisement_' + metal];
  let r = null;
  for (let k = 0; k < regle.coups; k++) { r = mineRock(s, id); assert(r.ok, r.error); assertEqual(r.casse, k === regle.coups - 1, `coup ${k + 1}`); }
  assert(r.minerai['minerai_' + metal] >= regle.fin['minerai_' + metal][0], 'le minerai');
  assert(countItem(s, 'minerai_' + metal) >= regle.fin['minerai_' + metal][0], 'dans l\'inventaire (sans carte)');
  assert(countItem(s, 'pierre') >= regle.coups, 'une pierre par coup');
  assert(rockGone(s, id), 'brisé');
  const retour = s.outils.rochers[id].retour - s.day;
  assert(retour >= regle.retour[0] && retour <= regle.retour[1], 'il revient après son retour');
  // un rocher ordinaire : comme avant
  const autre = Object.keys(farmTerrain(s).ROCHERS).find((k) => !gisementsFerme(s)[k] && farmTerrain(s).ROCHERS[k].length > 1);
  assertEqual(mineRock(s, autre).minerai, undefined, 'un rocher ordinaire ne donne pas de minerai');
});

test('migration 81 → 82 : le générateur 5 (les gisements)', () => {
  const s = garden();
  const v81 = JSON.parse(JSON.stringify({ ...s, version: 81 }));
  v81.carte = { ...(v81.carte || {}), graine: '7', generateur: 4 };
  const m = migrate(v81);
  assertEqual([m.version, m.carte.generateur], [STATE_VERSION, 8], 'puis le 6, le 7, le 8');
});

/* ---------- le lot 2 : ce qui brille la nuit ---------- */

test('les données : les champignons lumineux (forêt, à la main), les cristaux (montagne, à la pioche)', () => {
  assertEqual(RECOLTE.SORTES.champignons_lumineux.geste, 'ramasser');
  assertEqual(Object.keys(RECOLTE.SORTES.champignons_lumineux.fin), ['champignon_lumineux']);
  assertEqual([RECOLTE.SORTES.cristaux_quartz.geste, Object.keys(RECOLTE.SORTES.cristaux_quartz.fin)], ['casser', ['quartz']]);
  assertEqual([RECOLTE.SORTES.cristaux_amethyste.geste, Object.keys(RECOLTE.SORTES.cristaux_amethyste.fin)], ['casser', ['amethyste']]);
});

test('le grand monde : on ramasse des champignons lumineux en forêt, on casse des cristaux en montagne', () => {
  const s = partie();
  const c = trouve(s, 'champignons_lumineux');
  assert(c, 'des champignons lumineux dans le monde');
  const r = ramasserMonde(s, c.id);
  assert(r.ok, r.error);
  assert(countItem(s, 'champignon_lumineux') >= 1, 'dans l\'inventaire');
  for (const [nom, item] of [['cristaux_quartz', 'quartz'], ['cristaux_amethyste', 'amethyste']]) {
    const g = trouve(s, nom);
    assert(g, `des ${nom} dans le monde`);
    let q = null;
    for (let k = 0; k < RECOLTE.SORTES[nom].coups; k++) { q = casserMonde(s, g.id); assert(q.ok, q.error); }
    assert(q.fini && countItem(s, item) >= 1, `${item} dans l'inventaire`);
  }
});

test('migration 82 → 83 : le générateur 6 (ce qui brille la nuit)', () => {
  const s = garden();
  const v82 = JSON.parse(JSON.stringify({ ...s, version: 82 }));
  v82.carte = { ...(v82.carte || {}), graine: '7', generateur: 5 };
  const m = migrate(v82);
  assertEqual([m.version, m.carte.generateur], [STATE_VERSION, 8], 'puis le 7, le 8');
});

/* ---------- le lot 4 : la fin de la mine ---------- */

test('migration 84 → 85 : le générateur 8 (la fin de la mine) ; la ferme n\'a plus son tas, le monde plus d\'entrées dessinées', () => {
  const s = garden();
  const v84 = JSON.parse(JSON.stringify({ ...s, version: 84 }));
  v84.carte = { ...(v84.carte || {}), graine: '7', generateur: 7 };
  const m = migrate(v84);
  assertEqual([m.version, m.carte.generateur], [STATE_VERSION, 8]);
  // la ferme : ni l'objet de la mine, ni ses tuiles
  const f = genererFerme('gis-mine');
  const objets = f.carte.layers.filter((l) => l.type === 'objectgroup').flatMap((l) => l.objects || []);
  assert(!objets.some((o) => o.name === 'mine' || o.type === 'mine'), 'pas d\'entrée de mine');
  // le monde : l'entrée des grottes n'est plus dessinée, même là où le plan garde leur place
  const p = planDuMonde('gis-mine');
  assert(p.lieux.grottes.length > 0, 'le plan garde leur place (les autres lieux ne bougent pas)');
  assertEqual(DATA.GROTTE, undefined, 'plus de réglages de la mine');
});
