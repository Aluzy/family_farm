// Les enseignes de ferme de la boutique de gemmes : pour chaque matière, un panneau de deux cases et sa boîte aux
// lettres (livrée avec lui : DATA.OBJETS[].avec), posés dehors ; cinq couleurs à la peinture (🎨, bloc.peindre),
// chacune avec la couleur du nom que la carte écrit sur la plaque (PEINTURES[].texte).
import { addItem, blocsPoses, buildAtelier, casesCouvertes, countItem, DATA, empriseMeuble, executerCommande, farmTerrain, poserBloc, poseStatus, reprendreBloc, testFarmMap, varianteBloc, variantesBloc } from '../../js/engine/index.js';
import { assert, assertEqual, garden, setInv, test, tireless } from './aide.mjs';

const MATIERES = ['bois', 'email', 'fer'];

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

test('enseignes : trois matières, chacune son panneau de deux cases et sa boîte aux lettres, cinq couleurs', () => {
  for (const m of MATIERES) {
    const p = DATA.ATELIER.BLOCS['enseigne_' + m], b = DATA.ATELIER.BLOCS['boite_lettres_' + m], o = DATA.OBJETS['enseigne_' + m];
    assert(p && p.dehors && p.largeur === 2 && p.enseigne === m && p.peinture === 'enseigne_' + m, `${m} : le panneau`);
    assert(b && b.dehors && b.peinture === p.peinture, `${m} : la boîte aux lettres, peinte comme lui`);
    assert(o && o.boutique && o.invendable && o.avec === 'boite_lettres_' + m && DATA.OBJETS[o.avec], `${m} : l'objet, livré avec la boîte`);
    const V = variantesBloc('enseigne_' + m);
    assertEqual(V.length, 5, `${m} : cinq couleurs`);
    for (const v of V) assert(/^#[0-9a-f]{6}$/.test(v.texte), `${m} ${v.id} : la couleur du nom`);
    for (const v of V.slice(1)) for (const [de, vers] of Object.entries(v.remplace)) assertEqual(DATA.PALETTES[de].length, DATA.PALETTES[vers].length, `${vers} : autant de tons`);
    assert(DATA.ATELIER.CATEGORIES.jardin.blocs.includes('enseigne_' + m) && DATA.ATELIER.CATEGORIES.jardin.blocs.includes('boite_lettres_' + m), `${m} : dans l'onglet Jardin`);
  }
});

test('enseignes : posées dehors (le panneau sur deux cases), repeintes, reprises', () => {
  const { s, t } = jardin();
  assert(!poseStatus(s, 'enseigne_email', t).ok, 'sans enseigne en main : refusé');
  addItem(s, 'enseigne_email', 1); addItem(s, 'boite_lettres_email', 1);
  const r = poserBloc(s, 'enseigne_email', t);
  assert(r.ok, r.error);
  assertEqual(empriseMeuble(s, 'enseigne_email', t).length, 2, 'deux cases');
  assertEqual(casesCouvertes(s).get(t + 1), t);
  const r2 = poserBloc(s, 'boite_lettres_email', t + 2);
  assert(r2.ok, r2.error);
  const p = executerCommande(s, { type: 'bloc.peindre', args: { case: t, variante: 'rouge' } });
  assert(p.ok, p.error);
  assertEqual(varianteBloc(s, t), 'rouge', 'repeinte en rouge');
  assert(reprendreBloc(s, t).ok && reprendreBloc(s, t + 2).ok);
  assertEqual([countItem(s, 'enseigne_email'), countItem(s, 'boite_lettres_email')], [1, 1], 'reprises, elles reviennent');
  assertEqual(blocsPoses(s)[t], undefined);
});
