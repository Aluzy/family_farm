/* ==========================================================================
   Tests du moteur : le châtaignier du grand monde (le lot 4 des évolutions du crafting).
   - un feuillu des forêts de feuilles et de mousse sur seize en devient un (VEGETATION.REMPLACE), à sa place ;
   - ses châtaignes se cueillent à la main (3 à 5 ; il revient en 4 à 7 jours) : son second geste (aussi) ;
   - la hache l'abat comme un feuillu (du bois), même cueilli ; un bûcheron de hameau aussi ;
   - la migration 80 → 81 : le générateur 4.
   Lancer seul : node tests/run-tests.mjs chataignier.
   ========================================================================== */

import {
  countItem, couperMonde, cueillirMonde, DATA, farmTerrain, migrate, MONDE, mondeCueillis, mondePris, objetsDeRegion,
  prendreParHabitant, recolterMonde, regleGeste, RECOLTE, solDirect, STATE_VERSION,
} from '../../js/engine/index.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

const W = MONDE.LARGEUR, N = MONDE.REGION;

function partie() {
  const s = garden();
  s.outils = { hache: true, pioche: true, faux: true, choisi: 'hache' };
  s.energie = DATA.PERSONNAGE.MAX * 1000;
  return s;
}

// Les pièces de la sorte `nom` des régions du monde de la partie, des plus proches de la ferme aux plus loin.
function pieces(s, nom, n = 50) {
  const T = farmTerrain(s), sol = solDirect(T), out = [];
  const liste = [];
  for (let ry = 0; ry * N < MONDE.HAUTEUR; ry++) for (let rx = 0; rx * N < W; rx++) liste.push([rx, ry]);
  liste.sort((a, b) => Math.hypot(a[0] - 5, a[1] - 4) - Math.hypot(b[0] - 5, b[1] - 4));
  for (const [rx, ry] of liste) {
    for (const o of objetsDeRegion(sol.region(rx, ry))) {
      const X = Math.floor(o.x / 16), Y = Math.floor((o.y - 1) / 16);
      if (o.nom === nom && Math.floor(X / N) === rx && Math.floor(Y / N) === ry) out.push(o);
      if (out.length >= n) return out;
    }
  }
  return out;
}

test('les données : une sorte de la forêt, un feuillu sur seize ; couper (comme un feuillu) et cueillir', () => {
  const so = DATA.VEGETATION.SORTES.find((x) => x.nom === 'chataignier'), fe = DATA.VEGETATION.SORTES.find((x) => x.nom === 'feuillu');
  assertEqual([so.genre, so.variantes, so.bloque, so.ecart], ['arbre', 3, fe.bloque, fe.ecart]);
  assertEqual(DATA.VEGETATION.REMPLACE, [{ biome: 'foret', sols: ['feuilles', 'mousse'], de: 'feuillu', vers: 'chataignier', part: 0.0625 }]);
  const r = RECOLTE.SORTES.chataignier, f = RECOLTE.SORTES.feuillu;
  assertEqual([r.geste, r.coups, r.coup, r.fin], ['couper', f.coups, f.coup, f.fin]);
  assertEqual(r.aussi, { geste: 'cueillir', variantes: [0, 1], apres: 2, fin: { chataigne: [3, 5] }, retour: [4, 7] });
  assertEqual([regleGeste(r, 'couper'), regleGeste(r, 'cueillir'), regleGeste(r, 'casser')], [r, r.aussi, null]);
});

test('le monde : des châtaigniers dans la forêt, de toutes les variantes', () => {
  const s = partie();
  const c = pieces(s, 'chataignier', 40);
  assert(c.length >= 20, `${c.length} châtaigniers trouvés`);
  assertEqual([...new Set(c.map((o) => o.variante))].sort(), [0, 1, 2]);
});

test('cueillir : 3 à 5 châtaignes, il reste là sans ses bogues ; la hache l\'abat encore (du bois)', () => {
  const s = partie();
  const [a, b] = pieces(s, 'chataignier').filter((o) => o.variante !== 2);
  const sans = pieces(s, 'chataignier').find((o) => o.variante === 2);
  assertEqual(cueillirMonde(s, sans.id, 2).error, 'Ce châtaignier n\'a pas encore de bogues.');
  // à la main (la carte demande le geste : cueillir)
  const r = recolterMonde(s, a.id, { geste: 'cueillir', variante: a.variante });
  assert(r.ok, r.error);
  const n = countItem(s, 'chataigne');
  assert(n >= 3 && n <= 5 && r.items.chataigne === n, `${n} châtaignes`);
  assert(mondeCueillis(s).includes(a.id) && !mondePris(s).includes(a.id), 'il reste, sans ses bogues');
  const retour = s.monde.pris[a.id].retour;
  assert(retour >= s.day + 4 && retour <= s.day + 7, 'il revient en 4 à 7 jours');
  assertEqual(recolterMonde(s, a.id, { geste: 'cueillir', variante: a.variante }).ok, false, 'une fois');
  // la hache : trois coups (sans geste demandé, celui de la sorte : couper), même cueilli
  const bois = countItem(s, 'bois');
  assert(recolterMonde(s, a.id, {}).ok);
  assert(mondeCueillis(s).includes(a.id), 'entamé, il reste cueilli (ses bogues ne reviennent pas)');
  couperMonde(s, a.id);
  const fin = couperMonde(s, a.id);
  assert(fin.ok && fin.tombe, 'abattu');
  assert(mondePris(s).includes(a.id) && countItem(s, 'bois') > bois, 'du bois, il est pris');
  // sans hache, on ne l'abat pas ; un bûcheron de hameau, si
  s.outils.hache = false;
  assertEqual(recolterMonde(s, b.id, {}).ok, false, 'sans hache');
  assert(prendreParHabitant(s, b.id), 'un bûcheron l\'abat');
});

test('migration 80 → 81 : le générateur 4 (le châtaignier)', () => {
  const s = garden();
  const v80 = JSON.parse(JSON.stringify({ ...s, version: 80 }));
  v80.carte = { ...(v80.carte || {}), graine: '7', generateur: 3 };
  const m = migrate(v80);
  assertEqual([m.version, m.carte.generateur], [STATE_VERSION, 4]);
});
