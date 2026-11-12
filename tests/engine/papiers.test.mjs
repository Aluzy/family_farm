// Les papiers peints (js/engine/papiers.js) : achetés avec des gemmes, débloqués pour toujours ; l'outil 🧻 de
// Construire les pose sur les faces des murs du fond d'une pièce close (en bas, à l'étage), les retire ;
// Annuler remet ceux d'avant ; la carte ne montre que ceux qui ont encore une face vers une pièce.
import {
  addItem, AUCUN, countItem, DATA, executerCommande, facesPiece, farmTerrain, motifsPapier, papierDebloque,
  papiersPoses, papiersVisibles, pieceTapissable, piecesCloses, piecesNiveau, reprendreBloc, roleDemande,
  testFarmMap, testFermeConstruite,
} from '../../js/engine/index.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

// La ferme de test construite (sa maison, ses pièces, son étage).
function maison() {
  const s = garden();
  testFarmMap(s, '42');
  testFermeConstruite(s);
  return s;
}
const tapisser = (s, c, motif, niveau = 0) => executerCommande(s, { type: 'piece.tapisser', args: { case: c, motif, niveau } });
const premiere = (s, n = 0) => (n ? piecesNiveau(s, n) : piecesCloses(s)).find((p) => facesPiece(s, p, n).length);

test('papiers peints : huit motifs, chacun son objet de la boutique (40 💎), qui ne se vend ni ne se rachète', () => {
  assertEqual(motifsPapier(), ['fleurettes', 'rayures', 'vichy', 'damas', 'feuillages', 'etoiles', 'lambris', 'roses']);
  for (const m of motifsPapier()) {
    const o = DATA.OBJETS[DATA.PAPIERS_PEINTS[m].objet];
    assert(o && o.boutique && o.invendable && !o.rachetable, `${m} : un objet de la boutique`);
    assertEqual(o.papier, m, `${m} : l'objet dit son motif`);
  }
});

test('papiers peints : pas de pose sans le motif acheté ; acheté, il tapisse les faces des murs du fond de la pièce', () => {
  const s = maison(), p = premiere(s);
  assert(p, 'une pièce close avec un mur plein au fond');
  const r0 = tapisser(s, p.cases[0], 'damas');
  assert(!r0.ok && /gemmes/.test(r0.error), 'refusé : il s\'achète avec des gemmes');
  addItem(s, 'papier_peint_damas', 1);
  assert(papierDebloque(s, 'damas'), 'débloqué');
  const r = tapisser(s, p.cases[0], 'damas');
  assert(r.ok, r.error);
  const W = farmTerrain(s).LARGEUR;
  assertEqual(r.murs, facesPiece(s, p, 0), 'les faces de la pièce');
  for (const m of r.murs) assert(p.cases.includes(m + W), `${m} : juste au-dessus d'une case de la pièce`);
  assertEqual(Object.values(papiersPoses(s, 0)).every((v) => v === 'damas'), true);
  assertEqual(papiersVisibles(s, 0).map((v) => v.case), r.murs, 'la carte les montre');
  assertEqual(papiersVisibles(s, 0)[0].frame, 3, 'l\'image du damas (quatrième motif)');
  assertEqual(countItem(s, 'papier_peint_damas'), 1, 'le motif n\'est pas consommé');
  const r2 = tapisser(s, p.cases[0], 'damas');
  assert(!r2.ok, 'déjà ce papier');
});

test('papiers peints : changer de motif, le retirer ; Annuler remet ceux d\'avant', () => {
  const s = maison(), p = premiere(s);
  addItem(s, 'papier_peint_vichy', 1); addItem(s, 'papier_peint_etoiles', 1);
  const a = tapisser(s, p.cases[0], 'vichy');
  const b = tapisser(s, p.cases[0], 'etoiles');
  assert(a.ok && b.ok);
  assert(Object.values(papiersPoses(s, 0)).every((v) => v === 'etoiles'), 'les étoiles');
  const u = executerCommande(s, b.inverses[0]);
  assert(u.ok, u.error);
  assert(Object.values(papiersPoses(s, 0)).every((v) => v === 'vichy'), 'Annuler : le vichy revient');
  const c = tapisser(s, p.cases[0], AUCUN);
  assert(c.ok, c.error);
  assertEqual(papiersPoses(s, 0), {}, 'retiré');
  assert(!tapisser(s, p.cases[0], AUCUN).ok, 'rien à retirer');
  assert(executerCommande(s, c.inverses[0]).ok);
  assert(Object.values(papiersPoses(s, 0)).every((v) => v === 'vichy'), 'Annuler le retrait');
});

test('papiers peints : hors d\'une pièce close, refusé ; un mur repris ne se voit plus tapissé, Annuler le retrouve', () => {
  const s = maison(), p = premiere(s);
  addItem(s, 'papier_peint_rayures', 1);
  const dehors = [...Array(farmTerrain(s).LARGEUR * 4).keys()].find((c) => !pieceTapissable(s, c, 0));
  assert(!tapisser(s, dehors, 'rayures').ok, 'dehors : refusé');
  const r = tapisser(s, p.cases[0], 'rayures');
  assert(r.ok);
  const mur = r.murs[0], sorte = s.blocs[mur];
  const q = reprendreBloc(s, mur);
  if (q.ok) {
    assert(!papiersVisibles(s, 0).some((v) => v.case === mur), 'le mur repris ne se voit plus tapissé');
    addItem(s, DATA.ATELIER.BLOCS[sorte].objet, 1);
    s.blocs[mur] = sorte;
    assert(papiersVisibles(s, 0).some((v) => v.case === mur), 'reposé, il retrouve son papier');
  }
});

test('papiers peints : à l\'étage, sur les murs rehaussés d\'une pièce de l\'étage, à part de ceux d\'en bas', () => {
  const s = maison(), p = premiere(s, 1);
  if (!p) return;   // (la ferme de test sans pièce à l'étage : rien à vérifier)
  addItem(s, 'papier_peint_feuillages', 1);
  const r = tapisser(s, p.cases[0], 'feuillages', 1);
  assert(r.ok, r.error);
  assertEqual(papiersVisibles(s, 1).length, r.murs.length);
  assertEqual(papiersPoses(s, 0), {}, 'en bas : rien');
});

test('papiers peints : les commandes sont vérifiées (motif, niveau, murs) et réservées aux bâtisseurs en ligne', () => {
  const s = maison(), p = premiere(s);
  assert(!tapisser(s, p.cases[0], 'paillettes').ok, 'motif inconnu');
  assert(!tapisser(s, p.cases[0], 'damas', 2).ok, 'niveau 2 : non');
  assert(!executerCommande(s, { type: 'murs.tapisser', args: { murs: { abc: 'damas' }, niveau: 0 } }).ok, 'murs mal formés');
  assertEqual(roleDemande(s, { type: 'piece.tapisser', args: {} }), 'batisseur');
  assertEqual(roleDemande(s, { type: 'murs.tapisser', args: {} }), 'batisseur');
});
