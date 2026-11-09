/* ==========================================================================
   Tests du moteur : les objectifs du jour (la refonte du didacticiel, lot 2 ; js/engine/objectifs.js).
   - les données : la première semaine, sept jours, chaque tâche lit un état connu ou un compte noté ;
   - une nouvelle partie : l'abri, les pièces, le premier jour et ses graines ; pas d'ancien didacticiel ;
   - le premier jour, fait geste par geste : sa récompense ; le suivant le lendemain matin, ses compteurs à zéro ;
   - un jour pas fini reste ; un état atteint le reste ; le sac du cinquième jour ; la fin de la semaine.
   Lancer seul : node tests/run-tests.mjs objectifs.
   ========================================================================== */

import {
  allerAuJourObjectifs, buildAtelier, carnetDuJour, commencerObjectifs, countItem, craft, DATA, etapeDidacticiel, ETATS_OBJECTIFS,
  hoe, hoeableTiles, majObjectifs, noterObjectif, objectifsActifs, piecesCloses, plant, tacheAFaire, testFarmMap,
} from '../../js/engine/index.js';
import { sacPorte } from '../../js/engine/equipement.js';
import { assert, assertEqual, garden, setInv, test, tireless } from './aide.mjs';

// Les comptes que les gestes notent (objectifs-compte.js) : les actions qui rapportent de l'XP et les événements.
const COMPTES = ['labourer', 'planter', 'arroser', 'faucher', 'couper', 'piocher', 'recolter', 'cueillir', 'vendre', 'abattu', 'casse', 'carte', 'caleche', 'parler'];

function nouvelle(graine = 'objectifs') {
  const s = garden();
  tireless(s);
  testFarmMap(s, graine);
  setInv(s, {});
  commencerObjectifs(s);
  return s;
}

test('les données : sept jours, chaque tâche lit un état connu ou un compte noté', () => {
  const S = DATA.OBJECTIFS.SEMAINE;
  assertEqual(S.length, 7);
  for (const [k, J] of S.entries()) {
    assert(J.titre && J.objectifs.length >= 2 && J.objectifs.length <= 3, `jour ${k + 1} : 2 ou 3 objectifs`);
    assert(J.recompense && J.recompense.xp > 0, `jour ${k + 1} : une récompense`);
    for (const b of J.objectifs) {
      assert(b.id && b.icone && b.libelle && b.taches.length, `${b.id}`);
      for (const t of b.taches) {
        assert(t.guide, `${b.id} : un guide pour Montre-moi`);
        if (t.type === 'etat') assert(ETATS_OBJECTIFS.includes(t.quoi), `${b.id} : l'état ${t.quoi}`);
        else assert(t.type === 'compte' && COMPTES.includes(t.quoi) && t.n >= 1, `${b.id} : le compte ${t.quoi}`);
      }
    }
  }
});

test('une nouvelle partie : l\'abri, les pièces, le premier jour et ses graines ; pas d\'ancien didacticiel', () => {
  const s = nouvelle();
  assert(objectifsActifs(s));
  assertEqual([piecesCloses(s).length, s.pieces, etapeDidacticiel(s)], [1, DATA.DEPART.PIECES_SAUVAGE, null]);
  assertEqual(countItem(s, 'graine_carotte'), DATA.OBJECTIFS.SEMAINE[0].offre.graine_carotte, 'les graines du premier potager');
  const c = carnetDuJour(s);
  assertEqual([c.jour, c.titre, c.faits, c.total, c.fait, c.attente], [1, 'S\'installer', 0, 2, false, false]);
  assertEqual(tacheAFaire(s).tache.quoi, 'atelier', 'Montre-moi : d\'abord l\'Atelier');
});

test('le premier jour, geste par geste : la récompense ; le jour suivant le lendemain matin, ses compteurs à zéro', () => {
  const s = nouvelle('objectifs-j1');
  setInv(s, { pierre: 3, bois: 3, graine_carotte: 6 });
  assert(buildAtelier(s).ok);
  assertEqual(majObjectifs(s), null);
  assertEqual(carnetDuJour(s).faits, 1, 'l\'Atelier');
  setInv(s, { ...DATA.ATELIER.RECETTES.houe.entrees, graine_carotte: 6 });
  assert(craft(s, 'houe').ok);
  const cases = hoeableTiles(s).slice(0, 3);
  for (const t of cases) assert(hoe(s, t).ok);
  assertEqual(carnetDuJour(s).objectifs[1].taches.map((t) => [t.quoi, t.n, t.besoin, t.fait]), [['houe', 1, 1, true], ['labourer', 3, 3, true], ['planter', 0, 1, false]]);
  assert(plant(s, s.potager.parcelles[0].id, 'carotte').ok);
  const xp = s.progression.xp, pieces = s.pieces;
  const R = DATA.OBJECTIFS.SEMAINE[0].recompense;
  assertEqual(majObjectifs(s), { recompense: R, jour: 1, titre: 'S\'installer' });
  assertEqual([s.progression.xp - xp, s.pieces - pieces, carnetDuJour(s).attente, tacheAFaire(s)], [R.xp, R.pieces, true, null]);
  assertEqual(majObjectifs(s), null, 'le même jour : rien de plus');
  // le lendemain matin : le deuxième jour, ses compteurs repartent de zéro
  s.day += 1;
  assertEqual(majObjectifs(s), { nouveau: 2 }, 'le jour 2');
  const c = carnetDuJour(s);
  assertEqual([c.jour, c.titre, c.faits, s.objectifs.faits], [2, 'L\'eau', 0, {}]);
});

test('un jour pas fini reste ; un état atteint le reste', () => {
  const s = nouvelle('objectifs-reste');
  s.day += 3;
  assertEqual([majObjectifs(s), carnetDuJour(s).jour], [null, 1], 'pas fini : le même jour, quelques jours plus tard');
  setInv(s, { pierre: 3, bois: 3 });
  assert(buildAtelier(s).ok);
  majObjectifs(s);
  assert(s.objectifs.atteints.includes('atelier'));
  s.atelier.construit = false;   // (même si l'Atelier n'était plus là)
  assertEqual(carnetDuJour(s).objectifs[0].fait, true);
});

test('les comptes : les gestes qui rapportent de l\'XP, et les événements notés', () => {
  const s = nouvelle('objectifs-compte');
  allerAuJourObjectifs(s, 3);
  noterObjectif(s, 'abattu');
  noterObjectif(s, 'casse');
  const c = carnetDuJour(s);
  assertEqual(c.objectifs.slice(1).map((b) => b.fait), [true, true], 'l\'arbre, le rocher');
  noterObjectif(s, 'vendre', 12);
  assertEqual([s.objectifs.faits.vendre, s.objectifs.faits.caleche], [12, 1], 'vendre, c\'est aussi rencontrer la calèche');
});

test('le cinquième jour offre le sac ; la semaine faite, les objectifs s\'arrêtent', () => {
  const s = nouvelle('objectifs-fin');
  assertEqual(sacPorte(s), null);
  allerAuJourObjectifs(s, 5);
  assertEqual(sacPorte(s), DATA.DIDACTICIEL.SAC.objet, 'le sac à provisions, avant de sortir de la ferme');
  allerAuJourObjectifs(s, 7);
  s.objectifs.recu = s.day;
  s.day += 1;
  assertEqual(majObjectifs(s), { fin: true });
  assertEqual([objectifsActifs(s), carnetDuJour(s)], [false, null]);
});
