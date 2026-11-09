/* ==========================================================================
   Tests du moteur : les bacs à fleurs (le lot 2 des évolutions du crafting ; js/engine/bacs.js).
   - les recettes (rond, carré, long), leurs blocs (dehors, le long sur deux cases) ;
   - semer : une graine prise, une espèce par bac ; la pousse en 3 nuits, sans arrosage ;
   - la faux : 2 à 3 fleurs, puis il refleurit en 3 nuits, sans resemer ;
   - la peinture : le bois naturel et les six couleurs, gratuite ; reprendre, déplacer ;
   - les graines : une chance en cueillant les fleurs sauvages ; les abeilles ; la migration 78 → 79.
   Lancer seul : node tests/run-tests.mjs bacs.
   ========================================================================== */

import {
  bacsFleuris, blocAt, buildAtelier, buyRuche, couleursVariante, countItem, craft, DATA, deplacerBloc, dessinBac, etapeBac,
  executerCommande, farmTerrain, fleursPourAbeilles, migrate, nuitsAvantFleurs, peindreBloc, plantBac, poserBloc,
  pousserBacs, recolterBac, reprendreBloc, semerBac, STATE_VERSION, testFarmMap, varianteBloc, variantesBloc,
} from '../../js/engine/index.js';
import { assert, assertEqual, garden, setInv, sleepOnce, tireless, test } from './aide.mjs';

// Une ferme générée, l'Atelier construit, une case d'herbe libre de 6 × 3 cases (sa case du coin) ; la faux.
function jardin() {
  const s = garden();
  tireless(s);
  testFarmMap(s, 'bacs');
  setInv(s, { bois: 3, pierre: 3 });
  assert(buildAtelier(s).ok);
  s.outils = { ...s.outils, faux: true };
  const T = farmTerrain(s), W = T.LARGEUR;
  for (let r = 4; r < T.HAUTEUR - 8; r++) {
    for (let c = 4; c < W - 10; c++) {
      let ok = true;
      for (let dr = 0; dr < 3 && ok; dr++) for (let dc = 0; dc < 6 && ok; dc++) {
        const k = (r + dr) * W + c + dc;
        ok = T.LIGNES[r + dr][c + dc] === '#' && !s.potager.parcelles.some((p) => p.case === k) && !(T.HERBES && T.HERBES[k]);
      }
      if (ok) return { s, t: r * W + c, W };
    }
  }
  throw new Error('pas de place');
}

test('les recettes : bac rond, carré, long ; posés dehors, le long sur deux cases', () => {
  const R = DATA.ATELIER.RECETTES, B = DATA.ATELIER.BLOCS;
  assertEqual(R.bac_carre.entrees, { planche: 3, pierre: 2, fibre: 1 });
  assertEqual(R.bac_rond.entrees, { planche: 3, fibre: 1 });
  assertEqual(R.bac_long.entrees, { planche: 5, pierre: 3, fibre: 1 });
  assert(!R.bac_fleurs && !R.bac_lavande, 'les anciens bacs ne se fabriquent plus');
  assertEqual([B.bac_rond.bac, B.bac_carre.bac, B.bac_long.bac, B.bac_long.largeur], ['rond', 'carre', 'long', 2]);
  for (const id of ['bac_rond', 'bac_carre', 'bac_long']) assert(DATA.ATELIER.CATEGORIES.jardin.blocs.includes(id), id);
  const { s, t } = jardin();
  setInv(s, { planche: 11, pierre: 5, fibre: 3 });
  for (const id of ['bac_rond', 'bac_carre', 'bac_long']) assert(craft(s, id).ok, id);
  assert(poserBloc(s, 'bac_long', t).ok);
  assertEqual(reprendreBloc(s, t + 1).sorte, 'bac_long', 'sa case de droite : le même bac');
  assert(poserBloc(s, 'bac_rond', t).ok && poserBloc(s, 'bac_carre', t + 2).ok);
  assertEqual([etapeBac(s, t), dessinBac(s, t), dessinBac(s, t + 2)], [null, 'bac_rond_vide', 'bac_carre_vide']);
});

test('semer : une graine prise, une espèce par bac ; il fleurit en 3 nuits, sans arrosage', () => {
  const { s, t } = jardin();
  setInv(s, { bac_carre: 1, graine_coquelicot: 2, graine_lupin: 1 });
  assertEqual(semerBac(s, t, 'coquelicot').ok, false, 'pas de bac');
  poserBloc(s, 'bac_carre', t);
  assertEqual(semerBac(s, t, 'myosotis').error, 'Il te faut des graines de myosotis : on en trouve en cueillant les fleurs sauvages.');
  const r = executerCommande(s, { id: 'x', type: 'bac.semer', args: { case: t, fleur: 'coquelicot' } });
  assert(r.ok, r.error);
  assertEqual([countItem(s, 'graine_coquelicot'), plantBac(s, t), etapeBac(s, t), dessinBac(s, t)], [1, { fleur: 'coquelicot', nuits: 0, coupe: false }, 0, 'bac_carre_semis']);
  assertEqual(semerBac(s, t, 'lupin').ok, false, 'une espèce par bac');
  assertEqual(recolterBac(s, t).error, 'Coquelicots : pas encore en fleurs.');
  const etapes = [];
  for (let n = 0; n < 3; n++) { sleepOnce(s); etapes.push([etapeBac(s, t), dessinBac(s, t), nuitsAvantFleurs(s, t)]); }
  assertEqual(etapes, [[1, 'bac_carre_coquelicot_1', 2], [2, 'bac_carre_coquelicot_2', 1], [3, 'bac_carre_coquelicot', 0]]);
  sleepOnce(s);
  assertEqual(etapeBac(s, t), 3, 'en fleurs, il attend la faux');
});

test('la faux : 2 à 3 fleurs ; puis il refleurit en 3 nuits, sans resemer', () => {
  const { s, t } = jardin();
  setInv(s, { bac_long: 1 });
  poserBloc(s, 'bac_long', t);
  s.bacs = { [t]: { fleur: 'lavande', nuits: 3 } };
  s.outils.faux = false;
  assertEqual(recolterBac(s, t).ok, false, 'sans faux');
  s.outils.faux = true;
  const r = executerCommande(s, { id: 'y', type: 'bac.recolter', args: { case: t } });
  assert(r.ok, r.error);
  const n = countItem(s, 'fleur_lavande');
  assert(n >= 2 && n <= 3, `${n} lavandes`);
  assertEqual(r.items, { fleur_lavande: n });
  assertEqual([etapeBac(s, t), dessinBac(s, t)], [1, 'bac_long_lavande_1'], 'il repart de ses pousses');
  assertEqual(recolterBac(s, t).ok, false, 'pas deux fois');
  for (let k = 0; k < 3; k++) sleepOnce(s);
  assertEqual([etapeBac(s, t), countItem(s, 'graine_lavande')], [3, 0], 'refleuri, sans graine');
});

test('la peinture : le bois naturel et les six couleurs, gratuite ; elle et ses fleurs suivent le bac déplacé', () => {
  const { s, t } = jardin();
  for (const [id, p] of [['bac_carre', 'bac_bandeau'], ['bac_long', 'bac_bandeau'], ['bac_rond', 'bac_cerclage']]) {
    const v = variantesBloc(id);
    assertEqual(v.map((x) => x.id), ['naturel', 'rouge', 'orange', 'jaune', 'vert', 'bleu', 'violet'], id);
    assertEqual(couleursVariante(id, 'naturel'), null);
    const c = couleursVariante(id, 'bleu');
    assertEqual(c.map(([de]) => de), DATA.PALETTES[p], `${id} : la rampe repeinte`);
  }
  setInv(s, { bac_carre: 1 });
  poserBloc(s, 'bac_carre', t);
  s.pieces = 5;
  assertEqual(peindreBloc(s, t, 'violet').ok, true);
  assertEqual([varianteBloc(s, t), s.pieces], ['violet', 5], 'gratuit');
  s.bacs = { [t]: { fleur: 'myosotis', nuits: 2 } };
  assert(deplacerBloc(s, t, t + 3).ok);
  assertEqual([blocAt(s, t + 3), varianteBloc(s, t + 3), plantBac(s, t + 3), plantBac(s, t)], ['bac_carre', 'violet', { fleur: 'myosotis', nuits: 2, coupe: false }, null]);
  // repris : ce qui y poussait s'en va
  assert(reprendreBloc(s, t + 3).ok);
  pousserBacs(s);
  assertEqual([countItem(s, 'bac_carre'), s.bacs], [1, {}]);
});

test('les abeilles butinent les bacs en fleurs ; les graines viennent des fleurs sauvages', () => {
  const { s, t } = jardin();
  setInv(s, { bac_long: 1, bac_rond: 1 });
  poserBloc(s, 'bac_long', t);
  poserBloc(s, 'bac_rond', t + 3);
  s.bacs = { [t]: { fleur: 'myosotis', nuits: 3 }, [t + 3]: { fleur: 'pavot', nuits: 1 } };
  assertEqual(bacsFleuris(s), [t, t + 1], 'le bac long : ses deux cases ; pas celui qui pousse');
  assertEqual(fleursPourAbeilles(s), [], 'sans ruche');
  buyRuche(s);
  poserBloc(s, 'ruche', t + 5 + 0);
  const f = fleursPourAbeilles(s);
  assert(f.includes(t) && f.includes(t + 1) && !f.includes(t + 3), 'les bacs en fleurs');
  for (const [sorte, fleur] of Object.entries({ coquelicot: 'coquelicot', pavot_californie: 'pavot', tournesol_sauvage: 'tournesol', myosotis: 'myosotis', lavande: 'lavande', lupin: 'lupin' })) {
    const g = DATA.BACS.FLEURS[fleur].graine;
    assertEqual(DATA.RECOLTE.SORTES[sorte].chance, { [g]: 25 }, sorte);
    assertEqual(DATA.OBJETS[g].categorie, 'graine', g);
  }
});

test('migration 78 → 79 : les anciens bacs deviennent des bacs carrés en fleurs ; ceux de l\'inventaire aussi', () => {
  const { s, t } = jardin();
  const v78 = JSON.parse(JSON.stringify({ ...s, version: 78 }));
  v78.blocs = { ...v78.blocs, [t]: 'bac_fleurs', [t + 2]: 'bac_lavande' };
  v78.sens = { [t + 2]: 2 };
  v78.inventaire.bac_fleurs = [{ qty: 2, nightsLeft: null, origin: 'ferme' }];
  v78.inventaire.bac_lavande = [{ qty: 1, nightsLeft: null, origin: 'ferme' }];
  v78.plans = { connus: { bac_lavande: { jour: 3, de: null }, pergola: { jour: 2, de: null } } };
  const m = migrate(v78);
  assertEqual(m.version, STATE_VERSION);
  assertEqual([m.blocs[t], m.blocs[t + 2], m.bacs[t], m.bacs[t + 2], m.sens[t + 2]], ['bac_carre', 'bac_carre', { fleur: 'coquelicot', nuits: 3 }, { fleur: 'lavande', nuits: 3 }, undefined]);
  assertEqual([etapeBac(m, t), etapeBac(m, t + 2)], [3, 3], 'déjà en fleurs');
  assertEqual([countItem(m, 'bac_carre'), countItem(m, 'bac_fleurs'), countItem(m, 'bac_lavande')], [3, 0, 0]);
  assertEqual(Object.keys(m.plans.connus), ['pergola']);
});
