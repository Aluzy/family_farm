/* ==========================================================================
   Tests du moteur : l'abri de départ d'une nouvelle partie (la refonte du didacticiel, lot 1 ;
   js/engine/abri-depart.js).
   - une nouvelle partie commence avec l'abri bâti : des murs en bois autour de 6 × 3 cases, un plancher, une
     porte, une paillasse par membre (de 1 à 6) ; une pièce close, le foyer ;
   - le four (2 cases) et la cuisinière s'y posent sans agrandir, la case derrière la porte restant libre ;
   - il ne couvre ni la case de départ, ni la Zone de culture, ni ce qu'il y a à ramasser ;
   - le didacticiel : les étapes de l'abri passent d'elles-mêmes ; les fibres ne comptent plus les paillasses.
   Lancer seul : node tests/run-tests.mjs abri-depart.
   ========================================================================== */

import {
  addItem, blocAt, caseDepart, commencerDidacticiel, couchages, DATA, ETAPES, etapeDidacticiel, farmTerrain, majDidacticiel,
  objectifDidacticiel, piecesCloses, poseStatus, ramassables, solAt, testFarmMap,
} from '../../js/engine/index.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

// Une nouvelle partie sur la ferme générée `graine`, sa famille de `n` membres.
function nouvelle(graine, n = 4) {
  const s = garden();
  testFarmMap(s, graine);
  const M = s.famille.membres;
  while (M.length > n) M.pop();
  while (M.length < n) M.push({ ...M[M.length - 1], id: `m${M.length}`, prenom: `Membre ${M.length}` });
  commencerDidacticiel(s);
  return s;
}

test('une nouvelle partie : l\'abri bâti (murs en bois, plancher, porte, une paillasse par membre)', () => {
  const A = DATA.DIDACTICIEL.ABRI;
  assertEqual([A.LARGEUR, A.PROFONDEUR, A.MATIERE, A.SOL], [6, 3, 'mur_bois', 'plancher']);
  for (const graine of ['abri-1', 'abri-2', 'abri-3']) {
    const s = nouvelle(graine);
    const p = s.abriDepart;
    assert(p, `${graine} : un abri`);
    assertEqual([p.murs.length, p.sols.length, p.paillasses.length], [2 * (A.LARGEUR + 2) + 2 * A.PROFONDEUR - 1, 18, 4], graine);
    assert(p.murs.every((t) => blocAt(s, t) === 'mur_bois'), 'des murs en bois');
    assertEqual(blocAt(s, p.porte), 'porte');
    assert(p.sols.every((t) => solAt(s, t) === 'plancher'), 'un plancher partout dedans');
    assert(p.paillasses.every((t) => blocAt(s, t) === 'paillasse'));
    const pieces = piecesCloses(s);
    assertEqual([pieces.length, couchages(s).length], [1, 4], 'une pièce close, une paillasse par membre');
    assertEqual(Object.keys(s.inventaire || {}).filter((k) => ['mur_bois', 'porte', 'plancher', 'paillasse'].includes(k) && s.inventaire[k].length), [], 'rien de reste dans l\'inventaire');
  }
});

test('de 1 à 6 membres : une paillasse chacun, sur la rangée du haut', () => {
  for (const n of [1, 2, 3, 5, 6]) {
    const s = nouvelle('abri-n', n);
    assertEqual([s.abriDepart.paillasses.length, couchages(s).length], [n, n], `${n} membres`);
  }
});

test('le four et la cuisinière s\'y posent sans agrandir ; la case derrière la porte reste libre', () => {
  const s = nouvelle('abri-four', 6);
  const W = farmTerrain(s).LARGEUR, p = s.abriDepart, bas = (p.r + DATA.DIDACTICIEL.ABRI.PROFONDEUR) * W + p.c + 1;
  const passage = p.porte - W;
  addItem(s, DATA.ATELIER.BLOCS.four.objet, 1);
  addItem(s, 'cuisiniere', 1);
  assertEqual(poseStatus(s, 'four', bas).ok, true, 'le four (2 cases), en bas à gauche');
  assertEqual(poseStatus(s, 'cuisiniere', bas + 4).ok, true, 'la cuisinière, à droite de la porte');
  assert(passage !== bas && passage !== bas + 1 && passage !== bas + 4, 'le passage derrière la porte n\'est pas pris');
});

test('l\'emplacement : ni la case de départ, ni la Zone de culture, ni ce qu\'il y a à ramasser', () => {
  for (const graine of ['abri-1', 'abri-2', 'abri-3', 'abri-4']) {
    const s = nouvelle(graine);
    const T = farmTerrain(s), W = T.LARGEUR, d0 = caseDepart(T), p = s.abriDepart;
    const cases = p.murs.concat(p.sols, [p.porte]);
    assert(!cases.includes(d0), 'pas sur la case de départ');
    const Z = T.ZONES[1];
    assert(!cases.some((t) => { const r = Math.floor(t / W), c = t % W; return r >= Z.Y && r < Z.Y + 2 && c >= Z.X && c < Z.X + Z.COLONNES; }), 'hors de la Zone de culture');
    const pierres = ramassables(s).filter((q) => q.sorte === 'petite_pierre').length, bois = ramassables(s).filter((q) => q.sorte === 'morceau_bois').length;
    assert(pierres >= DATA.ATELIER.CONSTRUCTION.pierre && bois >= DATA.ATELIER.CONSTRUCTION.bois, `${graine} : de quoi poser l'Atelier (${pierres} pierres, ${bois} bois)`);
  }
});

test('le didacticiel : les étapes de l\'abri passent d\'elles-mêmes ; les fibres ne comptent plus les paillasses', () => {
  const s = nouvelle('abri-didac');
  s.didacticiel.etape = ETAPES.indexOf('fibres');
  const R = DATA.ATELIER.RECETTES;
  assertEqual(objectifDidacticiel(s).compteurs[0].besoin, R.hache.entrees.fibre + R.pioche.entrees.fibre, 'les fibres de la hache et de la pioche seulement');
  s.didacticiel.etape = ETAPES.indexOf('abri_ressources');
  assert(majDidacticiel(s));
  assertEqual(etapeDidacticiel(s), 'houe', 'des ressources de l\'abri à la houe, d\'un coup');
});
