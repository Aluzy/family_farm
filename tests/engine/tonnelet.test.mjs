/* ==========================================================================
   Tests du moteur : le tonnelet d'affinage et de fermentation (le lot 6 des évolutions du crafting ;
   js/engine/tonnelets.js).
   - les données : le tonnelet (Atelier, un bloc du dehors), la tomme d'alpage et le moût de houblon ;
   - les chaînes du fromage d'alpage et de la bière donnent leur tomme, leur moût ;
   - au tonnelet : un produit à la fois, 2 nuits, puis une bulle (un tas à ramasser, comme la ruche) ;
   - la reprise du tonnelet rend ce qu'il contient ; la commande tonnelet.remplir.
   Lancer seul : node tests/run-tests.mjs tonnelet.
   ========================================================================== */

import {
  addItem, aideAFaire, buildAtelier, chainesSansCarte, countItem, craft, DATA, etatChaine, etatTonnelet, executerCommande,
  farmTerrain, grantTech, morceauxDe, pickUp, poserBloc, remplirTonnelet, reprendreBloc, testFarmMap, testFillBatteries,
  testSetLevel, tonneletActif, tonneletsARecolter, verserChaine,
} from '../../js/engine/index.js';
import { assert, assertEqual, garden, runFor, setInv, sleepOnce, test, tireless } from './aide.mjs';

const TN = DATA.TONNELET;

// Une ferme générée, l'Atelier construit, les chaînes et la laiterie débloquées, les batteries pleines ; une
// rangée d'herbe libre de `w` cases (et les rangées autour) : { s, t } (sa première case).
function ferme(graine, w = 6) {
  const s = garden();
  tireless(s);
  testFarmMap(s, graine);
  setInv(s, { bois: 3, pierre: 3 });
  assert(buildAtelier(s).ok);
  testSetLevel(s, 10);
  testFillBatteries(s);
  const T = farmTerrain(s), W = T.LARGEUR;
  for (let r = 5; r < T.HAUTEUR - 5; r++) {
    for (let c = 4; c < W - w - 4; c++) {
      let ok = true;
      for (let dr = -1; dr <= 1 && ok; dr++) {
        for (let dc = 0; dc < w && ok; dc++) {
          const k = (r + dr) * W + c + dc;
          ok = T.LIGNES[r + dr][c + dc] === '#' && !(s.blocs || {})[k] && !s.potager.parcelles.some((p) => p.case === k) && !(T.HERBES && T.HERBES[k]);
        }
      }
      if (ok) return { s, t: r * W + c };
    }
  }
  throw new Error('pas de place');
}

function poser(s, t, sortes) {
  sortes.forEach((sorte, k) => {
    addItem(s, sorte, 1);
    const r = poserBloc(s, sorte, t + k);
    assert(r.ok, `poser ${sorte} : ${r.error}`);
  });
}

test('les données : le tonnelet, la tomme d\'alpage, le moût de houblon ; 2 nuits, un produit', () => {
  assertEqual([TN.OBJET, TN.NUITS, TN.AFFINE], ['tonnelet', 2, { tomme_alpage: 'fromage_alpage', mout_houblon: 'biere_artisanale' }]);
  assertEqual(DATA.ATELIER.RECETTES.tonnelet.entrees, { planche: 3, lingot_fer: 1 });
  const B = DATA.ATELIER.BLOCS.tonnelet;
  assertEqual([B.dehors, B.bloque, B.tonnelet], [true, true, true]);
  assert(DATA.ATELIER.CATEGORIES.machines.blocs.includes('tonnelet'));
  assertEqual([DATA.RECETTES.fromage_alpage.cave, DATA.RECETTES.biere_artisanale.cave], ['tomme_alpage', 'mout_houblon']);
  assertEqual(DATA.RECETTES.biere_artisanale.ingredients, [{ item: 'houblon', qte: 2 }], 'le moût : 2 houblons, comme la bière d\'avant');
  // leur prix : celui de leurs ingrédients ; le produit fini vaut plus
  assertEqual([DATA.OBJETS.tomme_alpage.prix, DATA.OBJETS.mout_houblon.prix], [3 * DATA.OBJETS.lait_alpage.prix, 13]);
  assert(DATA.OBJETS.fromage_alpage.prix > DATA.OBJETS.tomme_alpage.prix && DATA.OBJETS.biere_artisanale.prix > DATA.OBJETS.mout_houblon.prix);
});

test('la chaîne du fromage d\'alpage donne une tomme ; le joueur automatique, une tomme et un moût', () => {
  const { s, t } = ferme('tomme');
  grantTech(s, 'cui_laiterie', false);
  poser(s, t, ['entonnoir', 'centrifugeuse', 'pressoir', 'tonneau', 'convoyeur']);
  assertEqual([etatChaine(s, t).ok, etatChaine(s, t).recette], [true, 'fromage_alpage']);
  setInv(s, { lait_alpage: 3 });
  assert(verserChaine(s, t).ok);
  runFor(s, DATA.CHAINES.OUTILS.centrifugeuse.secondes + DATA.CHAINES.OUTILS.pressoir.secondes + DATA.CHAINES.OUTILS.tonneau.secondes + 2);
  const m = morceauxDe(s, 'ferme');
  assertEqual([m.length, m[0] && m[0].item], [1, 'tomme_alpage'], 'une tomme d\'alpage tombe au bout');
  setInv(s, { lait_alpage: 3, houblon: 2 });
  assertEqual(chainesSansCarte(s, ['fromage_alpage', 'biere_artisanale']), 2);
  assertEqual([countItem(s, 'tomme_alpage'), countItem(s, 'mout_houblon'), countItem(s, 'fromage_alpage')], [1, 1, 0]);
});

test('au tonnelet : un produit, 2 nuits, puis une bulle ; le personnage le prend, le tonnelet est vide', () => {
  const { s, t } = ferme('tonnelet');
  setInv(s, { planche: 3, lingot_fer: 1 });
  assert(craft(s, 'tonnelet').ok);
  assert(poserBloc(s, 'tonnelet', t).ok);
  assertEqual(etatTonnelet(s, t), { vide: true });
  assertEqual(etatTonnelet(s, t + 1), null);
  assertEqual(remplirTonnelet(s, t, 'tomme_alpage').error, 'Il te faut tomme d\'alpage (une chaîne de production).');
  setInv(s, { tomme_alpage: 2, lait: 1 });
  assertEqual(remplirTonnelet(s, t, 'lait').error, 'Cela ne s\'affine pas au tonnelet.');
  assert(remplirTonnelet(s, t, 'tomme_alpage').ok);
  assertEqual([countItem(s, 'tomme_alpage'), tonneletActif(s, t)], [1, true]);
  assertEqual(remplirTonnelet(s, t, 'tomme_alpage').error, 'Ce tonnelet travaille déjà.', 'un produit à la fois');
  // (une vraie nuit de jeu le fait avancer, js/engine/night.js)
  sleepOnce(s);
  assertEqual([etatTonnelet(s, t).reste, tonneletsARecolter(s)], [1, []]);
  sleepOnce(s);
  assertEqual([etatTonnelet(s, t).pret, tonneletActif(s, t)], [true, false]);
  assertEqual(tonneletsARecolter(s), [{ id: `tonnelet:${t}`, lieu: 'tonnelet', ref: t, items: { fromage_alpage: 1 } }]);
  assertEqual(remplirTonnelet(s, t, 'tomme_alpage').ok, false, 'plein : on le vide d\'abord');
  // le personnage le prend (comme le miel d'une ruche) : le fromage entre, le tonnelet est vide
  assertEqual(pickUp(s, `tonnelet:${t}`), { ok: true, lieu: 'tonnelet', items: { fromage_alpage: 1 } });
  assertEqual([countItem(s, 'fromage_alpage'), etatTonnelet(s, t), pickUp(s, `tonnelet:${t}`).ok], [1, { vide: true }, false]);
  // le moût, par la commande ; une nuit de plus ne le dépasse pas
  setInv(s, { mout_houblon: 1 });
  assert(executerCommande(s, { id: 'c1', type: 'tonnelet.remplir', args: { case: t, objet: 'mout_houblon' } }).ok);
  sleepOnce(s); sleepOnce(s); sleepOnce(s);
  assertEqual([etatTonnelet(s, t).nuits, tonneletsARecolter(s)[0].items], [2, { biere_artisanale: 1 }]);
});

test('reprendre le tonnelet : ce qu\'il contient revient, fini ou non ', () => {
  const { s, t } = ferme('reprise');
  setInv(s, { tonnelet: 2, tomme_alpage: 1, mout_houblon: 1 });
  assert(poserBloc(s, 'tonnelet', t).ok && poserBloc(s, 'tonnelet', t + 2).ok);
  assert(remplirTonnelet(s, t, 'tomme_alpage').ok && remplirTonnelet(s, t + 2, 'mout_houblon').ok);
  sleepOnce(s);
  assert(reprendreBloc(s, t).ok);
  assertEqual([countItem(s, 'tonnelet'), countItem(s, 'tomme_alpage'), s.tonnelets[t]], [1, 1, undefined], 'pas fini : la tomme revient');
  sleepOnce(s);
  assert(reprendreBloc(s, t + 2).ok);
  assertEqual([countItem(s, 'biere_artisanale'), countItem(s, 'mout_houblon')], [1, 0], 'fini : la bière');
  // posé de nouveau : vide
  assert(poserBloc(s, 'tonnelet', t).ok);
  assertEqual(etatTonnelet(s, t), { vide: true });
  assert(remplirTonnelet(s, t, 'tomme_alpage').ok);
  sleepOnce(s); sleepOnce(s);
  // le second adulte du foyer, s'il y en a un, a ce tonnelet à vider (comme une ruche pleine)
  assertEqual(tonneletsARecolter(s).map((r) => r.id), [`tonnelet:${t}`]);
  if (aideAFaire(s).length) assert(aideAFaire(s).includes(`tonnelet:${t}`));
});
