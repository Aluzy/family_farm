/* ==========================================================================
   Tests du chantier « l'île à bâtir » : les plants sauvages de l'île (docs/ile.md, fiche I7e : « une raison
   d'explorer » ; data/village.json VILLAGE.SAUVAGES, js/engine/sauvages.js). Comme tous les fichiers
   tests/engine/village-*.test.mjs, ils tournent avec VILLAGE.ACTIF forcé à true.
   - le monde de l'île porte l'ail des ours dans ses sous-bois et la salicorne sur ses plages, loin de la ferme ;
     le monde d'avant n'en a aucun ; ils ne déplacent rien d'autre (sans eux, la même végétation) ;
   - on ramasse un plant, on le repique, il pousse, on le récolte : il entre au catalogue d'import du port, une fois ;
   - il ne s'achète pas au comptoir ; éteint, il n'est pas proposé aux semis.
   Lancer seul : node tests/run-tests.mjs village-sauvages
   ========================================================================== */

import {
  BIOME, catalogueImport, contexteSol, countItem, createNewGame, culturesSauvages, DATA, elementsSol, farmTerrain, findPlot, genererMonde,
  harvest, isBuyable, MONDE, plant, objetsDeRegion, poserCheminsSol, ramasserMonde, solDeRegion, solDirect,
} from '../../js/engine/index.js';
import { plantableCropsFor } from '../../js/engine/campaign.js';
import { SORTES } from '../../js/engine/monde-vegetation.js';
import { assert, assertEqual, avecVillage, garden, plantRipe, test } from './aide.mjs';

const W = MONDE.LARGEUR, N = MONDE.REGION;
const GRAINE = 'sauvages-1';
const SV = DATA.VILLAGE.SAUVAGES;
const NOMS = Object.keys(SV.PLANTS);

// Les régions du monde, des plus proches de la ferme aux plus loin.
const REGIONS = [];
for (let ry = 0; ry * N < MONDE.HAUTEUR; ry++) for (let rx = 0; rx * N < W; rx++) REGIONS.push([rx, ry]);
REGIONS.sort((a, b) => Math.hypot(a[0] - 4.5, a[1] - 3.5) - Math.hypot(b[0] - 4.5, b[1] - 3.5));

// Les plants sauvages (et ce qui les entoure) d'un contexte, sur toutes ses régions : { [sorte]: [{ X, Y, region }] }.
function plantsDe(ctx) {
  const out = Object.fromEntries(NOMS.map((n) => [n, []]));
  for (const [rx, ry] of REGIONS) {
    const r = solDeRegion(ctx, rx, ry), b = r.vegetation.basses;
    for (let k = 0; k < b.length; k += 4) {
      const so = SORTES[b[k]], X = Math.floor(b[k + 1] / 16), Y = Math.floor((b[k + 2] - 1) / 16);
      if (out[so.nom] && Math.floor(X / N) === rx && Math.floor(Y / N) === ry) out[so.nom].push({ X, Y, region: r });
    }
  }
  return out;
}

const contexte = (port) => {
  const M = genererMonde(GRAINE, port).terrain.MONDE;
  const ctx = contexteSol(M.graine, M.cadre, M.ferme, M.taille);
  poserCheminsSol(ctx, null);
  elementsSol(ctx);
  return ctx;
};

test('les plants sauvages : dans le monde de l\'île, chacun dans son biome et sur son sol, loin de la ferme ; aucun dans le monde d\'avant', () => {
  const ile = contexte(1), P = plantsDe(ile), F = ile.cadre.FERME;
  for (const nom of NOMS) {
    const d = SV.PLANTS[nom];
    assert(P[nom].length >= 5, `${nom} : quelques-uns sur l'île (${P[nom].length})`);
    for (const { X, Y } of P[nom]) {
      const i = Y * W + X, b = ile.elements.eaux[i] !== 255 ? ile.elements.eaux[i] : ile.lire.biome(i);
      assertEqual(b, BIOME[d.biome], `${nom} : dans son biome (${X}, ${Y})`);
      const dx = Math.max(0, F.X - X, X - (F.X + F.LARGEUR - 1)), dy = Math.max(0, F.Y - Y, Y - (F.Y + F.HAUTEUR - 1));
      assert(Math.hypot(dx, dy) >= SV.LOIN, `${nom} : loin de la ferme`);
    }
  }
  // (le monde d'avant, la même graine : aucun)
  const avant = plantsDe(contexte(0));
  for (const nom of NOMS) assertEqual(avant[nom].length, 0, `${nom} : aucun dans le monde d'avant`);
  // (chaque plant sauvage a sa culture, son plant ramassé, sa règle)
  for (const c of culturesSauvages()) {
    assert(DATA.CULTURES[c.culture].sauvage === c.biome, `${c.culture} : son biome`);
    assertEqual(Object.keys(DATA.RECOLTE.SORTES[c.sorte].fin), [c.plant], `${c.sorte} : on y ramasse son plant`);
    assertEqual(DATA.OBJETS[c.plant].rachetable, false, `${c.plant} : pas au comptoir`);
    assertEqual(isBuyable(c.plant), false, `${c.plant} : ne s'achète pas`);
  }
});

test('les plants sauvages ne déplacent rien : sans eux, la même végétation, les mêmes rochers, la même marche', () => {
  // (les régions où poussent des plants sauvages, et les dix plus proches de la ferme : avec eux, puis sans)
  const avec = contexte(1), plantes = DATA.VILLAGE.SAUVAGES.PLANTS;
  const ou = new Set([...Object.values(plantsDe(avec)).flat().map((p) => p.region.cle), ...REGIONS.slice(0, 10).map(([rx, ry]) => rx + ',' + ry)]);
  const cles = [...ou].map((cle) => cle.split(',').map(Number));
  const avecR = cles.map(([rx, ry]) => solDeRegion(avec, rx, ry));
  DATA.VILLAGE.SAUVAGES.PLANTS = {};
  let sansR;
  try {
    const sans = contexte(1);
    sansR = cles.map(([rx, ry]) => solDeRegion(sans, rx, ry));
  } finally {
    DATA.VILLAGE.SAUVAGES.PLANTS = plantes;
  }
  const regions = avecR.map((a, k) => [a, sansR[k]]);
  const codes = new Set(NOMS.map((n) => SORTES.findIndex((s) => s.nom === n)));
  let ajoutes = 0;
  for (const [a, s] of regions) {
    const garde = [];
    for (let k = 0; k < a.vegetation.basses.length; k += 4) {
      if (codes.has(a.vegetation.basses[k])) { ajoutes++; continue; }
      garde.push(...a.vegetation.basses.slice(k, k + 4));
    }
    // (les petites sont rangées de haut en bas : sans les plants sauvages, le même ordre)
    assertEqual(garde.join(), [...s.vegetation.basses].join(), `la région ${a.cle} : les mêmes petites plantes`);
    for (const k of ['images']) assertEqual([...a.vegetation[k]].join(), [...s.vegetation[k]].join(), `la région ${a.cle} : les mêmes arbres`);
    assertEqual([...a.roches.images].join(), [...s.roches.images].join(), `la région ${a.cle} : les mêmes rochers`);
    assertEqual([...a.marche].join(), [...s.marche].join(), `la région ${a.cle} : la même marche`);
  }
  assert(ajoutes > 0, 'des plants sauvages dans ces régions');
});

test('un plant sauvage trouvé, rapporté, repiqué, récolté : il entre au catalogue d\'import du port, une fois', () => {
  const s = garden();
  s.energie = DATA.PERSONNAGE.MAX * 1000;
  const T = farmTerrain(s), sol = solDirect(T);
  assert(T.MONDE.cadre.PORT, 'le monde de l\'île');
  // le premier ail des ours, en partant de la ferme
  let o = null;
  for (const [rx, ry] of REGIONS) {
    o = objetsDeRegion(sol.region(rx, ry)).find((x) => x.nom === 'ail_ours_sauvage');
    if (o) break;
  }
  assert(o, 'un ail des ours dans les sous-bois');
  const r = ramasserMonde(s, o.id);
  assert(r.ok && r.items.plant_ail_ours >= 1, 'son plant, ramassé à la main');
  assertEqual(countItem(s, 'plant_ail_ours'), r.items.plant_ail_ours, 'dans l\'inventaire');
  assert(plantableCropsFor(s, 'potager').includes('ail_ours'), 'il se repique dans la zone de culture');
  if (!s.port) s.port = { sauvages: [] };
  const avant = catalogueImport(s).filter((a) => a.sorte === 'sauvage').length;
  plantRipe(s, 'potager-1', 'ail_ours');
  const h = harvest(s, 'potager-1');
  assert(h.ok && h.items.ail_ours > 0, 'la récolte : de l\'ail des ours');
  assertEqual(h.sauvage, 'plant_ail_ours', 'la première récolte l\'inscrit');
  assert(s.port.sauvages.includes('plant_ail_ours'), 'au catalogue');
  const cat = catalogueImport(s).filter((a) => a.sorte === 'sauvage');
  assertEqual(cat.length, avant + 1, 'une ligne de plus au catalogue d\'import');
  const a = cat.find((x) => x.id === 'plant_ail_ours');
  assertEqual([a.rang, a.lot], [DATA.PORT.IMPORT.SAUVAGES.RANG, DATA.PORT.IMPORT.SAUVAGES.LOT], 'à son rang, par son lot');
  // une seconde récolte : rien de plus
  plantRipe(s, 'potager-2', 'ail_ours');
  assertEqual(harvest(s, 'potager-2').sauvage, undefined, 'une fois seulement');
  assertEqual(s.port.sauvages.filter((x) => x === 'plant_ail_ours').length, 1);
  assert(findPlot(s, 'potager-1').culture === null, 'la parcelle libérée');
});

test('éteint : ni plant sauvage aux semis, ni inscription', () => {
  avecVillage(() => {
    const s = createNewGame(5);
    assertEqual(plantableCropsFor(s, 'potager').filter((c) => DATA.CULTURES[c].sauvage), [], 'pas aux semis');
  }, false);
  avecVillage(() => {
    const s = garden();
    s.port = { sauvages: [] };
    assertEqual(plant(s, 'potager-1', 'salicorne').ok, false, 'ni ne se plante');
    assertEqual(s.port.sauvages.length, 0, 'rien ne s\'inscrit');
  }, false);
});
