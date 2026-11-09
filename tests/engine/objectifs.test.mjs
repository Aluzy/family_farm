/* ==========================================================================
   Tests du moteur : les objectifs du jour (la refonte du didacticiel, lot 2 ; js/engine/objectifs.js).
   - les données : la première semaine, sept jours, chaque tâche lit un état connu ou un compte noté ;
   - une nouvelle partie : l'abri, les pièces, le premier jour et ses graines ; pas d'ancien didacticiel ;
   - le premier jour, fait geste par geste : sa récompense ; le suivant le lendemain matin, ses compteurs à zéro ;
   - un jour pas fini reste ; un état atteint le reste ; le sac du cinquième jour ;
   - après la semaine (lot 3) : les objectifs tirés chaque jour, selon ce qu'on peut faire et le niveau ; un se change.
   Lancer seul : node tests/run-tests.mjs objectifs.
   ========================================================================== */

import {
  allerAuJourObjectifs, buildAtelier, carnetDuJour, commencerObjectifs, countItem, craft, DATA, etapeDidacticiel, ETATS_OBJECTIFS,
  changerObjectif, hoe, hoeableTiles, majObjectifs, noterObjectif, objectifsActifs, objectifsPossibles, piecesCloses, plant, SI_OBJECTIFS,
  ramassables, ramasser, tacheAFaire, testFarmMap,
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

test('le quatrième jour : cueillir les baies d\'un buisson de la ferme coche « Cueillir des baies »', () => {
  const s = nouvelle('objectifs-baies');
  allerAuJourObjectifs(s, 4);
  const avant = carnetDuJour(s).objectifs.find((b) => b.id === 'cueillir');
  assertEqual(avant.fait, false);
  const baie = ramassables(s).find((q) => q.sorte === 'baies');
  assert(baie, 'un buisson porte des baies');
  assert(ramasser(s, baie.id).ok);
  assertEqual(carnetDuJour(s).objectifs.find((b) => b.id === 'cueillir').fait, true, 'cueilli');
  // (une pierre ramassée n'est pas une cueillette)
  const t = nouvelle('objectifs-baies-2');
  allerAuJourObjectifs(t, 4);
  const pierre = ramassables(t).find((q) => q.sorte !== 'baies');
  assert(ramasser(t, pierre.id).ok);
  assertEqual(carnetDuJour(t).objectifs.find((b) => b.id === 'cueillir').fait, false, 'pas une pierre');
});

test('le cinquième jour offre le sac ; la semaine faite, le jour 8 tire ses objectifs', () => {
  const s = nouvelle('objectifs-fin');
  assertEqual(sacPorte(s), null);
  allerAuJourObjectifs(s, 5);
  assertEqual(sacPorte(s), DATA.DIDACTICIEL.SAC.objet, 'le sac à provisions, avant de sortir de la ferme');
  allerAuJourObjectifs(s, 7);
  s.objectifs.recu = s.day;
  s.day += 1;
  assertEqual(majObjectifs(s), { nouveau: 8 });
  const c = carnetDuJour(s);
  assertEqual([objectifsActifs(s), c.jour, c.titre, c.tire, c.total], [true, 8, 'Les objectifs du jour', true, DATA.OBJECTIFS.TIRES.NOMBRE]);
});

// Une partie qui a fini sa semaine : au jour 8, ses objectifs tirés.
function apresLaSemaine(graine) {
  const s = nouvelle(graine);
  allerAuJourObjectifs(s, 8);
  return s;
}

test('les objectifs tirés : la liste, chacun un compte connu ; seulement ce que la partie peut faire', () => {
  const T = DATA.OBJECTIFS.TIRES;
  assertEqual([T.NOMBRE, T.CHANGER], [3, 1]);
  for (const d of T.LISTE) {
    assert(d.id && d.icone && d.libelle.includes('{n}') && d.guide, d.id);
    assert(COMPTES.includes(d.quoi) || ['pecher', 'oeuf', 'lait', 'cuisiner'].includes(d.quoi), `${d.id} : le compte ${d.quoi}`);
    assert(!d.si || SI_OBJECTIFS.includes(d.si), `${d.id} : si ${d.si}`);
  }
  const s = apresLaSemaine('tires-1');
  // (une partie neuve : ni houe, ni outils, ni puits : ce qui ne demande rien, et la calèche si elle commerce déjà)
  assertEqual(objectifsPossibles(s).map((d) => d.id).filter((id) => id !== 'vendre').sort(), ['cueillir', 'recolter']);
  s.outils = { ...s.outils, hache: true, pioche: true, faux: true };
  const ids = objectifsPossibles(s).map((d) => d.id);
  for (const id of ['abattre', 'casser', 'faucher']) assert(ids.includes(id), id);
  assert(!ids.includes('pecher') && !ids.includes('lait'), 'ni canne, ni vaches');
});

test('les objectifs tirés : le même tirage pour la même partie le même jour ; le nombre et la récompense suivent le niveau', () => {
  const tire = (graine, niveauJoueur) => {
    const s = nouvelle(graine);
    s.outils = { ...s.outils, hache: true, pioche: true, faux: true, houe: true };
    s.progression.niveau = niveauJoueur;
    allerAuJourObjectifs(s, 8);
    return carnetDuJour(s);
  };
  const a = tire('tires-2', 1), b = tire('tires-2', 1);
  assertEqual(a.objectifs.map((o) => o.id), b.objectifs.map((o) => o.id), 'le même tirage');
  assertEqual(new Set(a.objectifs.map((o) => o.id)).size, 3, 'trois objectifs différents');
  const T = DATA.OBJECTIFS.TIRES, R = T.RECOMPENSE;
  assertEqual(a.recompense, { xp: R.xp[0], pieces: R.pieces[0] });
  const haut = tire('tires-2', 6);
  assertEqual(haut.recompense, { xp: R.xp[0] + 5 * R.xp[1], pieces: R.pieces[0] + 5 * R.pieces[1] });
  // (le nombre demandé : base + parNiveau × (niveau − 1), au plus max)
  for (const o of haut.objectifs) {
    const d = T.LISTE.find((x) => x.id === o.id);
    assertEqual(o.taches[0].besoin, Math.max(1, Math.min(d.n[2], Math.round(d.n[0] + d.n[1] * 5))), o.id);
    assert(o.libelle.includes(String(o.taches[0].besoin)) && !o.libelle.includes('{'), `${o.id} : ${o.libelle}`);
    if (o.taches[0].besoin === 1) assert(!/ 1 \S+s\b/.test(o.libelle) || /fois/.test(o.libelle), `${o.id} : au singulier (${o.libelle})`);
  }
});

test('les objectifs tirés : un se change par jour ; le jour fait, sa récompense, et le lendemain un nouveau tirage', () => {
  const s = apresLaSemaine('tires-3');
  s.outils = { ...s.outils, hache: true, pioche: true, faux: true };
  allerAuJourObjectifs(s, 8);
  const avant = carnetDuJour(s).objectifs.map((o) => o.id);
  assert(carnetDuJour(s).changer);
  const r = changerObjectif(s, avant[0]);
  assert(r.ok, r.error);
  const apres = carnetDuJour(s).objectifs.map((o) => o.id);
  assert(apres[0] !== avant[0] && !avant.includes(apres[0]), 'un autre, pas un des autres du jour');
  assertEqual([changerObjectif(s, apres[1]).error, carnetDuJour(s).changer], ['Tu as déjà changé un objectif aujourd\'hui.', false]);
  // tout faire : la récompense, puis le jour 9
  for (const o of carnetDuJour(s).objectifs) noterObjectif(s, o.taches[0].quoi, o.taches[0].besoin);
  const xp = s.progression.xp, pieces = s.pieces, R = carnetDuJour(s).recompense;
  assertEqual(majObjectifs(s).recompense, R);
  assertEqual([s.progression.xp - xp, s.pieces - pieces], [R.xp, R.pieces]);
  s.day += 1;
  assertEqual(majObjectifs(s), { nouveau: 9 });
  assertEqual([carnetDuJour(s).jour, carnetDuJour(s).faits, carnetDuJour(s).changer], [9, 0, true]);
});

test('une partie du lot 2 qui avait fini sa semaine : le lendemain, ses objectifs tirés', () => {
  const s = nouvelle('tires-4');
  allerAuJourObjectifs(s, 7);
  s.objectifs.fini = true;
  s.objectifs.recu = s.day;
  s.day += 1;
  assertEqual(majObjectifs(s), { nouveau: 8 });
  assertEqual(carnetDuJour(s).tire, true);
});
