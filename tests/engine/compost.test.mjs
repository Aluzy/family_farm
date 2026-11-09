/* ==========================================================================
   Tests du moteur : le bac à compost et l'engrais (docs/compost.md ; js/engine/compost.js).
   - les données : le bac (Atelier, un bloc du dehors), l'engrais ; 10 aliments périmés pour un engrais ;
   - la nuit, ce qui périme va dans les bacs posés, jusqu'à ce qu'ils soient pleins ; l'engrais attend qu'on
     le prenne (une bulle, un tas « compost:<case> ») ; la reprise du bac rend ses engrais ;
   - l'engrais sur une culture arrosée : elle gagne un cycle tout de suite, une fois par arrosage ;
   - la péremption coupée : on y jette soi-même des aliments ; les commandes compost.jeter, potager.engrais,
     ramassage.prendre.
   Lancer seul : node tests/run-tests.mjs compost.
   ========================================================================== */

import {
  absoluteHours, addItem, aJeterAuCompost, allPlots, buildAtelier, casesEngraissables, composter, compostsARecolter, countItem, DATA, engraisser, etatCompost,
  executerCommande, farmTerrain, growDue, heuresPousse, jeterAuCompost, maxStage, pickUp, plant, poserBloc, reprendreBloc, testFarmMap, water,
} from '../../js/engine/index.js';
import { assert, assertEqual, garden, setInv, sleepOnce, test, tireless } from './aide.mjs';

const CP = DATA.COMPOST;

// Une ferme générée, l'Atelier construit ; `n` bacs à compost posés sur une rangée d'herbe libre : { s, cases }.
function ferme(graine, n = 1) {
  const s = garden();
  tireless(s);
  testFarmMap(s, graine);
  setInv(s, { bois: 3, pierre: 3 });
  assert(buildAtelier(s).ok);
  const T = farmTerrain(s), W = T.LARGEUR;
  for (let r = 5; r < T.HAUTEUR - 5; r++) {
    for (let c = 4; c < W - n - 4; c++) {
      let ok = true;
      for (let dr = -1; dr <= 1 && ok; dr++) {
        for (let dc = 0; dc < n && ok; dc++) {
          const k = (r + dr) * W + c + dc;
          ok = T.LIGNES[r + dr][c + dc] === '#' && !(s.blocs || {})[k] && !s.potager.parcelles.some((p) => p.case === k) && !(T.HERBES && T.HERBES[k]);
        }
      }
      if (!ok) continue;
      const cases = [];
      for (let k = 0; k < n; k++) {
        addItem(s, 'bac_compost', 1);
        const t = r * W + c + k;
        const rp = poserBloc(s, 'compost', t);
        assert(rp.ok, `poser le bac : ${rp.error}`);
        cases.push(t);
      }
      return { s, cases };
    }
  }
  throw new Error('pas de place');
}

test('les données : le bac à compost, l\'engrais ; 10 aliments périmés pour un engrais', () => {
  assertEqual([CP.OBJET, CP.ENGRAIS, CP.PAR_ENGRAIS], ['compost', 'engrais', 10]);
  assertEqual(DATA.ATELIER.RECETTES.bac_compost.entrees, { planche: 4, fibre: 2 });
  const B = DATA.ATELIER.BLOCS.compost;
  assertEqual([B.objet, B.dehors, B.bloque, B.compost], ['bac_compost', true, true, true]);
  assert(DATA.ATELIER.CATEGORIES.elevage.blocs.includes('compost'));
  assert(DATA.OBJETS.engrais && DATA.OBJETS.bac_compost);
});

test('la nuit : ce qui périme va au bac ; 10 font un engrais, une bulle à prendre ; le reste attend', () => {
  const { s, cases: [t] } = ferme('compost-1');
  assertEqual(etatCompost(s, t), { matiere: 0, engrais: 0, reste: 10, niveau: 0, plein: false }, 'posé : vide');
  // (la tomme d'alpage ne se mange pas : la famille n'y touche pas ; 13 périment cette nuit)
  s.inventaire.tomme_alpage = [{ qty: 13, nightsLeft: 1, origin: 'produit' }];
  sleepOnce(s);
  assertEqual(countItem(s, 'tomme_alpage'), 0, 'périmées');
  assertEqual(s.report.composte, 13, 'le rapport du matin : 13 au compost');
  assertEqual(etatCompost(s, t), { matiere: 13, engrais: 1, reste: 7, niveau: 2, plein: false });
  assertEqual(compostsARecolter(s), [{ id: `compost:${t}`, lieu: 'compost', ref: t, items: { engrais: 1 } }], 'une bulle : un engrais');
  const r = pickUp(s, `compost:${t}`);
  assertEqual([r.ok, r.items], [true, { engrais: 1 }]);
  assertEqual(countItem(s, 'engrais'), 1);
  assertEqual(etatCompost(s, t).matiere, 3, 'les 3 de trop restent dans le bac');
  assertEqual(etatCompost(s, t).niveau, 1);
  assertEqual(compostsARecolter(s), [], 'plus de bulle');
  assert(!pickUp(s, `compost:${t}`).ok, 'pas encore d\'engrais');
});

test('plusieurs bacs : le premier d\'abord, jusqu\'à ce qu\'il soit plein ; au-delà de tous, c\'est perdu', () => {
  const { s, cases: [a, b] } = ferme('compost-2', 2);
  const cap = CP.PAR_ENGRAIS * CP.MAX_ENGRAIS;
  s.nuit.perdus = { carotte: cap - 5, pomme: 12 };
  assertEqual(composter(s), cap + 7);
  assertEqual([etatCompost(s, a).matiere, etatCompost(s, a).plein, etatCompost(s, b).matiere], [cap, true, 7]);
  s.nuit.perdus = { carotte: 2 * cap };
  assertEqual(composter(s), cap - 7, 'le second se remplit ; le reste est perdu');
  assertEqual(compostsARecolter(s).map((x) => x.items.engrais), [CP.MAX_ENGRAIS, CP.MAX_ENGRAIS]);
});

test('sans bac, rien n\'est composté ; un bac repris rend ses engrais (le reste est perdu)', () => {
  const s = garden();
  s.nuit.perdus = { carotte: 30 };
  assertEqual(composter(s), 0);
  const { s: s2, cases: [t] } = ferme('compost-3');
  s2.nuit.perdus = { carotte: 25 };
  composter(s2);
  const r = reprendreBloc(s2, t);
  assert(r.ok, r.error);
  assertEqual(countItem(s2, 'engrais'), 2, 'deux engrais');
  assertEqual(countItem(s2, 'bac_compost'), 1, 'le bac revient');
  assertEqual(s2.composts[t], undefined);
});

test('l\'engrais : une culture arrosée gagne un cycle tout de suite, une fois par arrosage', () => {
  const s = garden();
  tireless(s);
  const p = allPlots(s)[0];
  plant(s, p.id, 'carotte');
  assert(!engraisser(s, p.id).ok, 'sans engrais');
  addItem(s, 'engrais', 3);
  const r0 = engraisser(s, p.id);
  assert(!r0.ok && /Arrose/.test(r0.error), 'pas arrosée : refusé');
  assertEqual(casesEngraissables(s), [], 'pas arrosée : pas de case violette');
  assert(water(s, p.id).ok);
  const avant = p.stade;
  const r = engraisser(s, p.id);
  assert(r.ok, r.error);
  assertEqual([p.stade, p.arrose, countItem(s, 'engrais')], [avant + 1, true, 2], 'un stade de plus ; le cycle en cours continue');
  assert(!engraisser(s, p.id).ok, 'une fois par arrosage');
  // le cycle s'achève : un stade de plus (l'eau), et l'engrais peut revenir au prochain arrosage
  p.arroseH = absoluteHours(s) - heuresPousse(s) - 1;
  assertEqual(growDue(s), 1);
  assert(!p.arrose && !p.engrais, 'le cycle fini : ni eau, ni engrais');
  assert(p.stade >= avant + 2, 'le cycle de l\'eau a compté aussi');
});

test('l\'engrais qui rend une culture mûre : l\'eau du cycle n\'a plus d\'usage ; mûre, plus d\'engrais', () => {
  const s = garden();
  tireless(s);
  const p = allPlots(s)[0];
  plant(s, p.id, 'carotte');
  p.stade = maxStage(p) - 1;
  addItem(s, 'engrais', 2);
  assert(water(s, p.id).ok);
  assertEqual(casesEngraissables(s), Number.isInteger(p.case) ? [p.case] : []);
  const r = engraisser(s, p.id);
  assertEqual([r.ok, r.mure, p.arrose, p.stade], [true, true, false, maxStage(p)]);
  assert(!engraisser(s, p.id).ok, 'mûre : récolte-la');
});

test('les commandes : potager.engrais, ramassage.prendre d\'un bac', () => {
  const { s, cases: [t] } = ferme('compost-4');
  const p = allPlots(s)[0];
  addItem(s, 'graine_carotte', 1);
  assert(plant(s, p.id, 'carotte').ok);
  assert(water(s, p.id).ok);
  addItem(s, 'engrais', 1);
  assert(executerCommande(s, { id: 'c1', type: 'potager.engrais', args: { parcelle: p.id } }).ok);
  assertEqual(countItem(s, 'engrais'), 0);
  s.nuit.perdus = { carotte: 10 };
  composter(s);
  assert(executerCommande(s, { id: 'c2', type: 'ramassage.prendre', args: { tas: `compost:${t}` } }).ok);
  assertEqual(countItem(s, 'engrais'), 1);
});

test('jeter au compost (la péremption coupée) : des aliments de l\'inventaire, autant que la place ; pas de graine', () => {
  const { s, cases: [t] } = ferme('compost-5');
  addItem(s, 'carotte', 60);
  addItem(s, 'graine_carotte', 5);
  assert(!jeterAuCompost(s, t, 'graine_carotte', 1).ok, 'pas une graine');
  assert(!jeterAuCompost(s, t, 'planche', 1).ok, 'pas une planche');
  assertEqual(aJeterAuCompost(s).graine_carotte, undefined);
  const r = jeterAuCompost(s, t, 'carotte', 12);
  assertEqual([r.ok, r.mis, r.etat.engrais, countItem(s, 'carotte')], [true, 12, 1, 48]);
  const cap = CP.PAR_ENGRAIS * CP.MAX_ENGRAIS;
  assertEqual(jeterAuCompost(s, t, 'carotte', 999).mis, cap - 12, 'jusqu\'à ce qu\'il soit plein');
  assert(!jeterAuCompost(s, t, 'carotte', 1).ok, 'plein');
  assert(executerCommande(s, { id: 'c3', type: 'ramassage.prendre', args: { tas: `compost:${t}` } }).ok);
  assert(executerCommande(s, { id: 'c4', type: 'compost.jeter', args: { case: t, objet: 'carotte', quantite: 10 } }).ok);
  assertEqual(etatCompost(s, t).engrais, 1);
});
