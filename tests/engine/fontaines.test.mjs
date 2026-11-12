// Les fontaines de jardin de la boutique de gemmes : un bloc de deux cases sur deux, posé dehors (pas dans une
// pièce) ; elle arrête le passage ; reprise, elle revient dans l'inventaire.
import { addItem, blocBloque, blocsPoses, buildAtelier, casesCouvertes, countItem, DATA, empriseMeuble, farmTerrain, piecesCloses, poserBloc, poseStatus, reprendreBloc, testFarmMap, testFermeConstruite } from '../../js/engine/index.js';
import { assert, assertEqual, garden, setInv, test, tireless } from './aide.mjs';

// Une ferme avec de l'herbe libre (comme tests/engine/bassins.test.mjs) : la case en bas à gauche d'un carré de 3 × 3.
function jardin() {
  const s = garden();
  tireless(s);
  testFarmMap(s, 'bassins');
  setInv(s, { bois: 3, pierre: 3 });
  assert(buildAtelier(s).ok);
  const T = farmTerrain(s), W = T.LARGEUR;
  for (let r = 4; r < T.HAUTEUR - 8; r++) {
    for (let c = 4; c < W - 10; c++) {
      let ok = true;
      for (let dr = 0; dr < 3 && ok; dr++) for (let dc = 0; dc < 3 && ok; dc++) {
        const k = (r + dr) * W + c + dc;
        ok = T.LIGNES[r + dr][c + dc] === '#' && !s.potager.parcelles.some((p) => p.case === k) && !(T.HERBES && T.HERBES[k]);
      }
      if (ok) return { s, t: (r + 2) * W + c, W };
    }
  }
  throw new Error('pas de place');
}

const MODELES = ['pierre', 'marbre', 'grenouille', 'angelot'];

test('fontaines : quatre modèles de la boutique, un bloc dehors de deux cases sur deux, dans l\'onglet Jardin', () => {
  for (const m of MODELES) {
    const b = DATA.ATELIER.BLOCS['fontaine_' + m], o = DATA.OBJETS['fontaine_' + m];
    assert(b && b.dessin === 'fontaine_' + m && b.dehors && b.bloque && b.largeur === 2 && b.hauteur === 2 && b.fontaine, `${m} : le bloc`);
    assert(o && o.boutique && o.invendable && !o.rachetable, `${m} : l'objet de la boutique`);
    assert(DATA.ATELIER.CATEGORIES.jardin.blocs.includes('fontaine_' + m), `${m} : dans l'onglet Jardin`);
  }
});

test('fontaines : posée dehors sur deux cases sur deux, elle arrête le passage ; reprise, elle revient', () => {
  const { s, t, W } = jardin();
  assert(!poseStatus(s, 'fontaine_grenouille', t).ok, 'sans fontaine en main : refusé');
  addItem(s, 'fontaine_grenouille', 2);
  const r = poserBloc(s, 'fontaine_grenouille', t);
  assert(r.ok, r.error);
  const cases = empriseMeuble(s, 'fontaine_grenouille', t);
  assertEqual([...cases].sort((a, b) => a - b), [t - W, t - W + 1, t, t + 1], 'deux cases sur deux (vers le haut et la droite)');
  assertEqual(blocsPoses(s)[t], 'fontaine_grenouille');
  assert(blocBloque(s, t), 'le passage est arrêté');
  for (const c of cases) if (c !== t) assertEqual(casesCouvertes(s).get(c), t, `${c} : couverte par la fontaine`);
  assertEqual(countItem(s, 'fontaine_grenouille'), 1);
  assert(reprendreBloc(s, t).ok);
  assertEqual(countItem(s, 'fontaine_grenouille'), 2, 'reprise : elle revient');
});

test('fontaines : pas dans une pièce de la maison', () => {
  const s = garden();
  testFarmMap(s, '42');
  testFermeConstruite(s);
  addItem(s, 'fontaine_pierre', 1);
  for (const c of piecesCloses(s)[0].cases) assert(!poseStatus(s, 'fontaine_pierre', c).ok, `${c} : refusé`);
});
