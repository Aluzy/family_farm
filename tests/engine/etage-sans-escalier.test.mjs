/* ==========================================================================
   Tests du moteur : on bâtit à l'étage d'une pièce dont tout le pourtour monte au niveau 1, même sans
   escalier (le créateur, novembre 2026 : « le joueur peut vouloir mettre l'escalier à la fin ; après
   avoir posé les meubles, il ne faut pas que ça soit bloquant »). Les stations (four, cuisinière,
   réfrigérateur, boîte…) s'y posent comme en bas, et y fonctionnent.
   Lancer seul : node --test tests/engine/etage-sans-escalier.test.mjs
   ========================================================================== */

import {
  addItem, blocsPoses, buildAtelier, countItem, DATA, empriseNiveau, etageBlocs, etageEmprise, executerCommande, farmTerrain, fenetresHautes,
  hauteurPile, poserBloc, poseEtageStatus, poserEtage, rehausser, reprendreBloc, reprendreEtage, testFarmMap,
} from '../../js/engine/index.js';
import { assert, assertEqual, garden, setInv, test, tireless } from './aide.mjs';

const obj = (sorte) => DATA.ATELIER.BLOCS[sorte].objet;
function chantier(graine) {
  const s = garden();
  tireless(s);
  testFarmMap(s, graine);
  setInv(s, { bois: 3, pierre: 3 });
  assert(buildAtelier(s).ok);
  return s;
}
function terrainLibre(s, w, h) {
  const T = farmTerrain(s), W = T.LARGEUR;
  for (let r = 4; r < T.HAUTEUR - h - 4; r++) {
    for (let c = 4; c < W - w - 4; c++) {
      let ok = true;
      for (let dr = 0; dr < h && ok; dr++) for (let dc = 0; dc < w && ok; dc++) ok = T.LIGNES[r + dr][c + dc] === '#' && !s.potager.parcelles.some((p) => p.case === (r + dr) * W + c + dc) && !(T.HERBES && T.HERBES[(r + dr) * W + c + dc]);
      if (ok) return { c, r, W };
    }
  }
  return null;
}
// Une pièce close de w × h cases (murs compris), la porte au milieu du bas ; `haut` : tout son
// pourtour rehaussé d'un bloc (la porte aussi : un mur plein au-dessus).
function piece(s, w, h, haut = true, rangs = 1) {
  const { c, r, W } = terrainLibre(s, w, h), bord = [];
  for (let dr = 0; dr < h; dr++) for (let dc = 0; dc < w; dc++) if (dr === 0 || dc === 0 || dr === h - 1 || dc === w - 1) bord.push((r + dr) * W + c + dc);
  const porte = (r + h - 1) * W + c + Math.floor(w / 2);
  addItem(s, obj('mur_pierre'), bord.length * 2 + 2);
  addItem(s, obj('porte'), 1);
  for (const t of bord) assert(poserBloc(s, 'mur_pierre', t).ok);
  assert(poserBloc(s, 'porte', porte).ok);
  addItem(s, obj('mur_pierre'), bord.length * rangs);
  if (haut) for (let k = 0; k < rangs; k++) for (const t of bord) assert(rehausser(s, 'mur_pierre', t).ok, `rehausser ${t}`);
  const dedans = [];
  for (let dr = 1; dr < h - 1; dr++) for (let dc = 1; dc < w - 1; dc++) dedans.push((r + dr) * W + c + dc);
  return { bord, porte, dedans, W };
}

test('étage sans escalier : on y bâtit dès que tout le pourtour monte à l\'étage', () => {
  const s = chantier('sansesc');
  const p = piece(s, 6, 5, false);
  assert(!etageEmprise(s).has(p.dedans[0]), 'des murs d\'un bloc : pas d\'étage');
  for (const t of p.bord) assert(rehausser(s, 'mur_pierre', t).ok);
  assert(p.dedans.every((t) => etageEmprise(s).has(t)), 'tout le pourtour rehaussé : l\'étage est là, sans escalier');
  addItem(s, obj('lanterne'), 1);
  const r = poserEtage(s, 'lanterne', p.dedans[0]);
  assert(r.ok, r.error);
  assertEqual(etageBlocs(s)[p.dedans[0]], 'lanterne');
});

test('étage sans escalier : les stations s\'y posent et fonctionnent ; reprises, elles s\'en vont', () => {
  const s = chantier('stations');
  const p = piece(s, 7, 5);
  s.stations.cuisine.construit = false;
  addItem(s, obj('cuisiniere'), 1);
  const t = p.dedans.find((k) => poseEtageStatus(s, 'cuisiniere', k).ok);
  assert(t !== undefined, poseEtageStatus(s, 'cuisiniere', p.dedans[0]).raison);
  assert(poserEtage(s, 'cuisiniere', t).ok);
  assert(s.stations.cuisine.construit, 'la cuisinière de l\'étage : la station est là');
  assert(reprendreEtage(s, t).ok);
  assert(!s.stations.cuisine.construit, 'reprise : la station s\'en va');
  assertEqual(countItem(s, obj('cuisiniere')), 1);
  // le réfrigérateur
  addItem(s, obj('refrigerateur'), 1);
  const f = p.dedans.find((k) => poseEtageStatus(s, 'refrigerateur', k).ok);
  assert(f !== undefined, poseEtageStatus(s, 'refrigerateur', p.dedans[0]).raison);
  assert(poserEtage(s, 'refrigerateur', f).ok);
  assert(s.frigo.construit, 'le réfrigérateur de l\'étage : construit');
  assert(reprendreEtage(s, f).ok);
  assert(!s.frigo.construit);
});

test('étage sans escalier : l\'escalier posé à la fin ne bloque rien (ce qui est au-dessus revient dans l\'inventaire)', () => {
  const s = chantier('finesc');
  const p = piece(s, 6, 5);
  addItem(s, obj('lanterne'), 2);
  addItem(s, obj('escalier'), 1);
  const [a, b] = p.dedans;
  assert(poserEtage(s, 'lanterne', a).ok);
  assert(poserEtage(s, 'lanterne', b).ok);
  const r = executerCommande(s, { type: 'bloc.poser', args: { sorte: 'escalier', case: a } });
  assert(r.ok, r.error);
  assertEqual(blocsPoses(s)[a], 'escalier');
  assertEqual([etageBlocs(s)[a], etageBlocs(s)[b], countItem(s, obj('lanterne'))], [undefined, 'lanterne', 1], 'la lanterne au-dessus de l\'escalier revient ; l\'autre reste');
  assert(p.dedans.every((t) => etageEmprise(s).has(t)));
});

test('niveau 2 : les mêmes mécaniques qu\'à l\'étage, avec ou sans escalier', () => {
  const s = chantier('niveau2');
  const p = piece(s, 7, 6, true, 2);
  assert(p.dedans.every((t) => empriseNiveau(s, 2).has(t)), 'les murs montent au niveau 2 : on y bâtit');
  for (const k of ['lanterne', 'cuisiniere', 'mur_fenetre', 'meuble_tableau_1', 'escalier']) addItem(s, obj(k), 2);
  // un bloc, une station (qui fonctionne), une fenêtre dans le haut d'un mur, un tableau
  const [a, b] = p.dedans;
  let r = executerCommande(s, { type: 'etage.poser', args: { sorte: 'lanterne', case: a, niveau: 2 } });
  assert(r.ok, r.error);
  assertEqual([etageBlocs(s, 2)[a], etageBlocs(s, 1)[a]], ['lanterne', undefined], 'rangée au niveau 2, pas à l\'étage');
  s.stations.cuisine.construit = false;
  const c = p.dedans.slice().reverse().find((k) => poseEtageStatus(s, 'cuisiniere', k, 0, 2).ok);
  assert(poserEtage(s, 'cuisiniere', c, 0, null, 2).ok);
  assert(s.stations.cuisine.construit, 'la cuisinière du niveau 2 sert');
  const m = p.bord.find((t) => t !== p.porte);
  assertEqual(hauteurPile(s, m), 3);
  assert(poserEtage(s, 'mur_fenetre', m, 0, null, 2).ok, 'une fenêtre dans le haut d\'un mur de 3 blocs');
  assertEqual([fenetresHautes(s, 2)[m], fenetresHautes(s, 1)[m], hauteurPile(s, m)], ['mur_fenetre', undefined, 3]);
  assert(!reprendreBloc(s, m).ok, 'le mur ne s\'abaisse pas sous la fenêtre');
  const m2 = p.bord.find((t) => t !== p.porte && t !== m);
  assert(poserEtage(s, 'meuble_tableau_1', m2, 0, null, 2).ok, 'un tableau sur un mur du niveau 2');
  // Annuler : la lanterne revient dans l'inventaire
  for (const inv of r.inverses) assert(executerCommande(s, inv).ok);
  assertEqual([etageBlocs(s, 2)[a], countItem(s, obj('lanterne'))], [undefined, 2]);
  // l'escalier vient à la fin : en bas puis à l'étage ; ce qui était au-dessus revient
  assert(poserEtage(s, 'lanterne', b, 0, null, 2).ok);
  assert(poserBloc(s, 'escalier', a).ok, 'l\'escalier du bas');
  const e1 = p.dedans.find((k) => k !== a && poseEtageStatus(s, 'escalier', k).ok);
  assert(e1 !== undefined, poseEtageStatus(s, 'escalier', b).raison);
  r = executerCommande(s, { type: 'etage.poser', args: { sorte: 'escalier', case: b } });
  assert(r.ok, r.error);
  assertEqual([etageBlocs(s, 2)[b], countItem(s, obj('lanterne'))], [undefined, 2], 'la lanterne au-dessus de l\'escalier de l\'étage revient');
  // pas d'escalier au dernier niveau
  assert(!poseEtageStatus(s, 'escalier', p.dedans[3], 0, 2).ok);
});
