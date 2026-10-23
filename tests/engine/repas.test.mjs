/* ==========================================================================
   Tests du moteur : la boîte à nourriture et la faim de la famille (js/engine/repas.js).
   Lancer seul : node --test tests/engine/repas.test.mjs (ou node tests/run-tests.mjs repas).
   ========================================================================== */

import {
  aidant, aideBetes, awakeMsAtHour, boiteCount, boiteCounts, boitePosee, buildAtelier, buildFridge,
  countItem, craft, DATA, depenserMembre, deposerBoite, farmTerrain, findMember, jaugeFamille,
  jaugeMembre, mainCharacter, mangeurs, marcherMembre, placeBoite, poserBloc, poseStatus,
  repasStep, reprendreBloc, reprendreBoite, sleepTarget, snackEnergy, sourceRepas, spoil,
  startNight, testAddHens, testAddWheat, testBatir, testFarmMap, tick, valeurAliment, wakeEnergy,
} from '../../js/engine/index.js';
import {
  affamer, assert, assertEqual, AVANT_DEMENAGEMENT, boite, garden, migreAvant, reach, setInv,
  sleepOnce, test, tireless,
} from './aide.mjs';

// Une ferme générée, l'Atelier construit, un foyer clos (murs, porte, paillasses) et la boîte à
// nourriture posée dedans. Renvoie { s, boite } (la case de la boîte).
function foyerAvecBoite(graine = 'boite') {
  const s = garden();
  tireless(s);
  testFarmMap(s, graine);
  setInv(s, { bois: 3, pierre: 3 });
  assert(buildAtelier(s).ok, 'Atelier');
  setInv(s, { mur_pierre: 40, porte: 2, paillasse: 4, planche: 3 });
  assertEqual(craft(s, 'boite_nourriture').items, { boite_nourriture: 1 }, 'la boîte se fabrique à l\'Atelier (3 planches)');
  const T = farmTerrain(s), W = T.LARGEUR;
  let z = null;
  for (let r = 4; r < T.HAUTEUR - 10 && !z; r++) {
    for (let c = 4; c < W - 10 && !z; c++) {
      let ok = true;
      for (let dr = 0; dr < 5 && ok; dr++) for (let dc = 0; dc < 6 && ok; dc++) ok = T.LIGNES[r + dr][c + dc] === '#' && !s.potager.parcelles.some((p) => p.case === (r + dr) * W + c + dc) && !(T.HERBES && T.HERBES[(r + dr) * W + c + dc]);
      if (ok) z = { c, r };
    }
  }
  const porte = (z.r + 4) * W + z.c + 3;
  for (let dr = 0; dr < 5; dr++) {
    for (let dc = 0; dc < 6; dc++) {
      const t = (z.r + dr) * W + z.c + dc;
      if ((dr === 0 || dc === 0 || dr === 4 || dc === 5) && t !== porte) assert(poserBloc(s, 'mur_pierre', t).ok, `mur ${t}`);
    }
  }
  poserBloc(s, 'mur_pierre', porte);
  assert(poserBloc(s, 'porte', porte).ok, 'porte');
  for (let k = 0; k < 4; k++) assert(poserBloc(s, 'paillasse', (z.r + 1) * W + z.c + 1 + k).ok, `paillasse ${k}`);
  const boite = (z.r + 2) * W + z.c + 1;
  return { s, boite };
}

test('valeur d\'un aliment : la même pour l\'en-cas du personnage et pour la famille', () => {
  assertEqual(DATA.PERSONNAGE.MANGER_BONUS, 10);
  for (const item of ['carotte', 'patate', 'baies', 'conserve', 'pain', 'gratin_patates']) {
    assertEqual(valeurAliment(item), Math.ceil((DATA.OBJETS[item].energie * 110) / 500), item);
    assertEqual(snackEnergy(garden(), item), valeurAliment(item) * 1000, `${item} : l'en-cas`);
  }
});

test('jauges : chaque membre sauf le personnage, pleines au départ ; la marche et l\'aide les vident', () => {
  const s = garden();
  const F = DATA.FAMILLE.FAIM;
  assertEqual([F.MAX, F.SEUIL, F.PX_PAR_POINT, F.ECOLE.NIVEAU], [100, 20, 100, 80]);
  assertEqual(mangeurs(s).map((m) => m.id), ['adulte-2', 'enfant-1', 'enfant-2'], 'pas le personnage principal');
  assertEqual([mangeurs(s).every((m) => jaugeMembre(m) === 100), jaugeFamille(s)], [true, 100]);
  // 1 point tous les 100 pixels de marche
  assertEqual(marcherMembre(s, 'enfant-1', 250), 97.5);
  assertEqual(marcherMembre(s, mainCharacter(s).id, 1000), 0, 'le personnage a son énergie à lui');
  // l'aide aux bêtes : AIDE points par tâche faite
  assert(testBatir(reach(s, 'poulailler'), 'poulailler').ok);
  testAddHens(s, 2);
  testAddWheat(s, 10);
  const a = aidant(s);
  assert(aideBetes(s, 'poulailler').ok, 'il nourrit les poules');
  assertEqual(jaugeMembre(a), 100 - F.AIDE);
});

test('au seuil, le membre mange jusqu\'à rassasié ; sans rien à manger, il a faim une fois', () => {
  const s = boite(garden(), { carotte: 10 });
  const m = findMember(s, 'enfant-2');
  depenserMembre(s, m.id, 79);
  repasStep(s);
  assertEqual([jaugeMembre(m), boiteCount(s, 'carotte')], [21, 10], 'au-dessus du seuil : il ne mange pas');
  depenserMembre(s, m.id, 1);
  repasStep(s);
  assertEqual([jaugeMembre(m), boiteCount(s, 'carotte'), !!m.affame], [40, 0, false], 'il mange tout ce qu\'il trouve');
  depenserMembre(s, m.id, 30);
  repasStep(s);
  assertEqual(m.affame, true, 'plus rien : il a faim');
  sleepOnce(s);
  assertEqual([s.nuit.affames, 'affame' in m], [['enfant-2'], false], 'la nuit le note, et le jour suivant repart');
});

test('l\'école : les jours d\'école, les enfants rentrent à 17 h 30 avec 80 au plus ; au coucher, ils mangent jusqu\'à 100', () => {
  const s = boite(garden(), { conserve: 100 });
  assertEqual(s.day, 1, 'un lundi');
  s.awakeMs = awakeMsAtHour(17);
  tick(s, 1);
  assertEqual(mangeurs(s).map(jaugeMembre), [100, 100, 100]);
  s.awakeMs = awakeMsAtHour(DATA.FAMILLE.FAIM.ECOLE.RETOUR_H);
  tick(s, 1);
  assertEqual(mangeurs(s).map(jaugeMembre), [100, 80, 80], 'seuls les enfants');
  s.awakeMs = awakeMsAtHour(DATA.TEMPS.HEURE_NUIT);
  assert(startNight(s), 'la famille se couche');
  assertEqual(mangeurs(s).map(jaugeMembre), [100, 100, 100], 'les enfants ont mangé avant de dormir (4 conserves chacun, la jauge plafonne à 100)');
  assertEqual(boiteCount(s, 'conserve'), 92);
  // un mercredi : pas d'école
  const t = garden();
  t.day = 3;
  t.awakeMs = awakeMsAtHour(18);
  tick(t, 1);
  assertEqual(mangeurs(t).map(jaugeMembre), [100, 100, 100]);
});

test('réveil : 60 + 40 × la jauge moyenne de la famille au coucher', () => {
  const s = garden();
  setInv(s, {});
  for (const m of mangeurs(s)) depenserMembre(s, m.id, 50);
  assertEqual([jaugeFamille(s), sleepTarget(s), wakeEnergy(s, 50)], [50, 80000, 80000]);
  s.energie = 0;
  const r = sleepOnce(s);
  assertEqual([r.couverture, r.energieReveil], [50, 80000]);
});

test('la boîte à nourriture : un bloc de l\'Atelier, posé dans le foyer ; la famille y mange', () => {
  const { s, boite } = foyerAvecBoite();
  assertEqual(sourceRepas(s), null, 'sans boîte, la famille n\'a nulle part où manger');
  assertEqual(poseStatus(s, 'boite_nourriture', boite - 2 * farmTerrain(s).LARGEUR - 3).ok, false, 'pas dehors');
  assert(poserBloc(s, 'boite_nourriture', boite).ok, 'posée dans le foyer');
  assertEqual([boitePosee(s), sourceRepas(s), countItem(s, 'boite_nourriture')], [true, 'boite', 0]);
  // la famille ne mange plus dans l'inventaire : la boîte vide, elle a faim
  setInv(s, { carotte: 30, conserve: 20 });
  affamer(s);
  assertEqual([countItem(s, 'carotte'), s.famille.membres.filter((m) => m.affame).length], [30, 3]);
});

test('la boîte : 6 aliments différents au plus, 10 de chacun, les lots gardent leur origine', () => {
  const { s, boite } = foyerAvecBoite();
  poserBloc(s, 'boite_nourriture', boite);
  setInv(s, { carotte: 30, patate: 5, tomate: 5, courgette: 5, oeuf: 5, pain: 5, pomme: 5, graine_carotte: 5 });
  assertEqual(deposerBoite(s, 'carotte', 30), { ok: true, moved: 10 });
  assertEqual([boiteCount(s, 'carotte'), countItem(s, 'carotte'), placeBoite(s, 'carotte')], [10, 20, 0]);
  assertEqual(deposerBoite(s, 'carotte', 1).error, 'La boîte a déjà 10 carotte.');
  assertEqual(deposerBoite(s, 'graine_carotte', 1).ok, false, 'pas les graines');
  for (const item of ['patate', 'tomate', 'courgette', 'oeuf', 'pain']) assert(deposerBoite(s, item, 5).ok, item);
  assertEqual(deposerBoite(s, 'pomme', 1).error, 'La boîte a déjà 6 aliments différents.');
  assertEqual(reprendreBoite(s, 'pain', 5), { ok: true, moved: 5 });
  assert(deposerBoite(s, 'pomme', 2).ok, 'une place s\'est libérée');
  assertEqual(boiteCounts(s), { carotte: 10, patate: 5, tomate: 5, courgette: 5, oeuf: 5, pomme: 2 });
  // la famille y mange (ce qui périme le plus tôt d'abord) ; ce sont des aliments de la ferme
  affamer(s);
  assert(s.repasJour.energie > 0 && s.repasJour.produit === s.repasJour.energie, 'tout vient de la ferme');
  assertEqual(countItem(s, 'carotte'), 20, 'l\'inventaire n\'est pas touché');
  // reprise, la boîte rend son contenu
  setInv(s, {});
  deposerBoite(s, 'carotte', 0);
  const reste = boiteCounts(s);
  assert(reprendreBloc(s, boite).ok, 'reprise');
  assertEqual([countItem(s, 'boite_nourriture'), boiteCounts(s)], [1, {}]);
  for (const [item, n] of Object.entries(reste)) assertEqual(countItem(s, item), n, item);
});

test('la boîte ne garde pas au frais : son contenu périme comme l\'inventaire', () => {
  const { s, boite } = foyerAvecBoite();
  poserBloc(s, 'boite_nourriture', boite);
  setInv(s, { carotte: 4 });
  deposerBoite(s, 'carotte', 4);
  s.boite.items.carotte[0].nightsLeft = 1;
  s.nuit = { perdus: {} };
  assertEqual(spoil(s), { carotte: 4 });
  assertEqual(boiteCounts(s), {});
});

test('le réfrigérateur construit : la boîte et son contenu reviennent dans l\'inventaire, la famille mange au frigo', () => {
  const { s, boite } = foyerAvecBoite();
  poserBloc(s, 'boite_nourriture', boite);
  setInv(s, { carotte: 6 });
  deposerBoite(s, 'carotte', 6);
  s.pieces = 5000;
  assert(buildFridge(reach(s, 'frigo')).ok, 'frigo');
  assertEqual([boitePosee(s), countItem(s, 'boite_nourriture'), countItem(s, 'carotte'), boiteCounts(s), sourceRepas(s)], [false, 1, 6, {}, 'frigo']);
  assertEqual(poseStatus(s, 'boite_nourriture', boite).raison, 'La famille mange au réfrigérateur : la boîte à nourriture ne sert plus.');
  assertEqual(deposerBoite(s, 'carotte', 1).ok, false);
});

test('migration v45 → v46 : le repas du jour disparaît, la boîte arrive vide, la famille est rassasiée', () => {
  const v45 = JSON.parse(JSON.stringify(garden()));
  delete v45.boite;
  delete v45.repasJour;
  v45.version = 45;
  v45.repas = { heure: 19, besoin: 150, energie: 150, couverture: 100, mange: { conserve: 6 } };
  const m = migreAvant({ v: 45, t: 0, s: v45 });
  assertEqual([m.version, 'repas' in m, m.boite, m.repasJour, jaugeFamille(m)], [AVANT_DEMENAGEMENT, false, { items: {} }, null, 100]);
});
