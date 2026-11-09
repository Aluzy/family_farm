/* ==========================================================================
   Tests du moteur : les colorants (le mortier et son pilon, les fleurs sauvages).
   - le mortier : sa recette d'Atelier (4 pierres + 1 planche), son bloc (dans la maison, une station) ;
   - la station : 3 fleurs (3 épinards pour le vert) → 1 colorant en 10 s ; le violet de la lavande ou du lupin ;
   - les recettes de l'Atelier qui prenaient du bois (les briques) ou des baies : un colorant à la place ;
   - les fleurs du grand monde : leur cueillette (RECOLTE), le coquelicot dans la prairie autour de la ferme ;
   - la migration 77 → 78 : le mortier, le générateur 3.
   Lancer seul : node --test tests/engine/colorants.test.mjs (ou node tests/run-tests.mjs colorants).
   ========================================================================== */

import { buildAtelier, contexteSol, craft, DATA, genererMonde, migrate, solDeRegion, STATE_VERSION } from '../../js/engine/index.js';
import { openStation, recipeStatus, startRecipe } from '../../js/engine/kitchen.js';
import { countItem } from '../../js/engine/inventory.js';
import { assert, assertEqual, atelier, runFor, setInv, test } from './aide.mjs';

// Une partie avec ses stations (le four, la cuisine, le moulin) et l'Atelier construit.
function partieAtelier() {
  const s = atelier();
  setInv(s, { bois: 3, pierre: 3 });
  assert(buildAtelier(s).ok, 'l\'Atelier');
  return s;
}

const COLORANTS = { rouge: 'fleur_coquelicot', orange: 'fleur_pavot', jaune: 'fleur_tournesol', vert: 'epinard', bleu: 'fleur_myosotis' };

test('le mortier : sa recette d\'Atelier, son bloc posé dans la maison, une station sans électricité', () => {
  assertEqual(DATA.ATELIER.RECETTES.mortier, { entrees: { pierre: 4, planche: 1 }, sortie: { mortier: 1 } });
  const b = DATA.ATELIER.BLOCS.mortier;
  assertEqual([b.objet, b.dedans, b.bloque, b.station], ['mortier', true, true, 'mortier']);
  assertEqual([DATA.STATIONS.mortier.electrique, DATA.STATIONS.mortier.action], [false, 'broyer']);
  assert(DATA.ATELIER.CATEGORIES.maison.blocs.includes('mortier'), 'dans l\'onglet Maison du mode Construire');
  const s = partieAtelier();
  setInv(s, { pierre: 4, planche: 1 });
  assert(craft(s, 'mortier').ok, 'fabriqué dès le début');
  assertEqual([countItem(s, 'mortier'), countItem(s, 'pierre'), countItem(s, 'planche')], [1, 0, 0]);
});

test('la station : 3 fleurs (ou 3 épinards) → 1 colorant en 10 s ; le violet de la lavande ou du lupin', () => {
  const s = atelier();
  assertEqual(recipeStatus(s, 'colorant_rouge').ok, false, 'le mortier pas posé');
  openStation(s, 'mortier');
  for (const [c, fleur] of Object.entries(COLORANTS)) {
    const r = DATA.RECETTES[`colorant_${c}`];
    assertEqual([r.station, r.temps, r.ingredients, r.sortie, r.qteSortie], ['mortier', 10, [{ item: fleur, qte: 3 }], `colorant_${c}`, 1], c);
    setInv(s, { [fleur]: 3 });
    assert(startRecipe(s, `colorant_${c}`).ok, `${c} : lancé`);
    assertEqual(countItem(s, fleur), 0, `${c} : les fleurs prises`);
    runFor(s, 4);
    assertEqual(countItem(s, `colorant_${c}`), 0, `${c} : pas encore`);
    runFor(s, 7);
    assertEqual(countItem(s, `colorant_${c}`), 1, `${c} : broyé`);
  }
  for (const fleur of ['fleur_lavande', 'fleur_lupin']) {
    setInv(s, { [fleur]: 3 });
    assert(startRecipe(s, 'colorant_violet').ok, fleur);
    runFor(s, 11);
    assertEqual(countItem(s, 'colorant_violet'), 1, `violet de ${fleur}`);
  }
  setInv(s, { fleur_coquelicot: 2 });
  assertEqual(startRecipe(s, 'colorant_rouge').ok, false, 'il faut 3 fleurs');
});

test('les recettes : un colorant à la place du bois des briques et des baies', () => {
  const R = DATA.ATELIER.RECETTES;
  assertEqual(R.mur_brique_rouge.entrees, { pierre: 3, colorant_rouge: 1 });
  assertEqual(R.mur_brique_orange.entrees, { pierre: 3, colorant_orange: 1 });
  assertEqual(R.mur_brique_ocre.entrees, { pierre: 3, colorant_jaune: 1 });
  assertEqual(R.mur_brique_bleue.entrees, { pierre: 3, colorant_bleu: 1 });
  assertEqual(R.porte_bleue.entrees, { planche: 3, colorant_bleu: 1 });
  assertEqual(R.chaise_peinte.entrees, { planche: 2, colorant_bleu: 1 });
  assertEqual(R.lanterne_papier.entrees, { planche: 1, fibre: 3, colorant_rouge: 1 });
  assertEqual(R.fenetre_volets.entrees, { planche: 3, pierre: 1, colorant_vert: 1 });
  assertEqual(R.fenetre_vitrail.entrees, { pierre: 3, lingot_cuivre: 1, colorant_bleu: 1, colorant_jaune: 1 });
  for (const [id, r] of Object.entries(R)) assert(!('baies' in r.entrees), `${id} : plus de baies`);
  // un mur de briques rouges : les pierres et le colorant pris
  const s = partieAtelier();
  setInv(s, { pierre: 3, colorant_rouge: 1 });
  assert(craft(s, 'mur_brique_rouge').ok);
  assertEqual([countItem(s, 'mur_brique_rouge'), countItem(s, 'colorant_rouge'), countItem(s, 'pierre')], [1, 0, 0]);
  setInv(s, { pierre: 3, bois: 1 });
  assertEqual(craft(s, 'mur_brique_rouge').ok, false, 'le bois ne suffit plus');
});

test('les fleurs sauvages : on les cueille dans le monde ; le coquelicot pousse dans la prairie autour de la ferme', () => {
  const noms = DATA.VEGETATION.SORTES.map((x) => x.nom);
  const fleurs = { coquelicot: 'fleur_coquelicot', pavot_californie: 'fleur_pavot', tournesol_sauvage: 'fleur_tournesol', myosotis: 'fleur_myosotis', lavande: 'fleur_lavande', lupin: 'fleur_lupin' };
  for (const [sorte, item] of Object.entries(fleurs)) {
    assert(noms.includes(sorte), `${sorte} : une sorte du monde`);
    assertEqual(DATA.RECOLTE.SORTES[sorte], { geste: 'ramasser', fin: { [item]: [2, 3] }, chance: { [item.replace('fleur_', 'graine_')]: 25 }, retour: [4, 7] }, sorte);
  }
  // le coquelicot dans la région de la ferme (la prairie autour), pour trois mondes
  for (const g of ['1', 'abc', 'colorants-3']) {
    const M = genererMonde(g).terrain.MONDE, ctx = contexteSol(M.graine, M.cadre, M.ferme, M.taille);
    const F = M.cadre.FERME, R = M.taille;
    let n = 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1]]) {
      const r = solDeRegion(ctx, Math.floor((F.X + F.LARGEUR / 2) / R) + dx, Math.floor((F.Y + F.HAUTEUR / 2) / R) + dy);
      const b = r.vegetation.basses;
      for (let i = 0; i < b.length; i += 4) if (noms[b[i]] === 'coquelicot') n++;
    }
    assert(n >= 5, `${g} : ${n} coquelicots autour de la ferme`);
  }
});

test('migration 77 → 78 : le mortier (à construire), le générateur 3 (les fleurs)', () => {
  const s = atelier();
  const v77 = JSON.parse(JSON.stringify({ ...s, version: 77 }));
  delete v77.stations.mortier;
  v77.carte = { ...v77.carte, generateur: 2 };
  const m = migrate(v77);
  assertEqual(m.version, STATE_VERSION);
  assertEqual(m.stations.mortier, { construit: false, tache: null, appareil: null });
  assertEqual(m.stations.four.construit, true, 'les autres stations restent');
  assertEqual(m.carte.generateur, 4, 'puis le 4 (le châtaignier)');
});
