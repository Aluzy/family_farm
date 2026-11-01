// Les chaînes de production (js/engine/chaines.js) : un entonnoir, un réservoir (facultatif), des
// outils et des convoyeurs posés à la suite ; la suite des outils fait la recette, le courant les
// fait tourner, les produits tombent en tas au bout.
import {
  addItem, buildAtelier, chaineDe, chaines, chainesSansCarte, countItem, craft, DATA, etatChaine, farmTerrain,
  grantTech, migrate, morceauxDe, poserBloc, PRESSE_RENDU, STATE_VERSION, ramasserMorceau, recetteDesOutils, reprendreBloc, startRecipe, TAS_PLACES,
  testFarmMap, testFillBatteries, testSetLevel, verserChaine,
} from '../../js/engine/index.js';
import { assert, assertEqual, garden, runFor, setInv, test, tireless } from './aide.mjs';

const C = DATA.CHAINES;

// Une ferme générée, l'Atelier construit, les chaînes débloquées, les batteries pleines.
function usine(graine) {
  const s = garden();
  tireless(s);
  testFarmMap(s, graine);
  setInv(s, { bois: 3, pierre: 3 });
  assert(buildAtelier(s).ok);
  testSetLevel(s, 10);
  testFillBatteries(s);
  return s;
}

// Une rangée d'herbe libre de `w` cases (et une rangée libre au-dessus et au-dessous) : la case
// de son début.
function rangee(s, w) {
  const T = farmTerrain(s), W = T.LARGEUR;
  for (let r = 5; r < T.HAUTEUR - 5; r++) {
    for (let c = 4; c < W - w - 4; c++) {
      let ok = true;
      for (let dr = -1; dr <= 1 && ok; dr++) {
        for (let dc = 0; dc < w && ok; dc++) {
          const t = (r + dr) * W + c + dc;
          ok = T.LIGNES[r + dr][c + dc] === '#' && !s.potager.parcelles.some((p) => p.case === t) && !(T.HERBES && T.HERBES[t]);
        }
      }
      if (ok) return r * W + c;
    }
  }
  return null;
}

// Pose `sortes` à la suite, depuis la case `t` (les blocs dans l'inventaire d'abord).
function poser(s, t, sortes) {
  sortes.forEach((sorte, k) => {
    addItem(s, sorte, 1);
    const r = poserBloc(s, sorte, t + k);
    assert(r.ok, `poser ${sorte} : ${r.error}`);
  });
}

test('chaînes : les données (outils, recettes, une suite par recette, les plats retirés de la cuisine)', () => {
  assertEqual(Object.keys(C.OUTILS), ['pressoir', 'centrifugeuse', 'mixeur', 'chaudron', 'tonneau', 'ensacheuse']);
  assertEqual(C.RECETTES.huile, ['pressoir']);
  assertEqual(C.RECETTES.jus_fruits, ['mixeur', 'pressoir']);
  assertEqual(C.RECETTES.fromage_frais, ['centrifugeuse', 'pressoir']);
  for (const id of Object.keys(C.RECETTES)) {
    assertEqual(DATA.RECETTES[id].station, 'chaine', id);
    assertEqual(recetteDesOutils(C.RECETTES[id]), id, `${id} : sa suite d'outils`);
  }
  assertEqual(recetteDesOutils(['pressoir', 'mixeur']), null, 'l\'ordre compte');
  assertEqual(DATA.STATIONS.presse, undefined, 'la Presse a laissé la place aux chaînes');
  assertEqual(DATA.RECETTES.farine.station, 'moulin', 'la farine reste au Moulin');
  assertEqual([DATA.OBJETS.jus_fruits.nom, DATA.OBJETS.jus_fruits.plat], ['Jus de fruits', true]);
  assertEqual(TAS_PLACES.length, C.TAS);
});

test('chaînes : l\'Atelier fabrique les blocs une fois les chaînes débloquées', () => {
  const s = usine('fab');
  setInv(s, { planche: 40, lingot_fer: 40, lingot_cuivre: 10, pierre: 10 });
  for (const b of ['reservoir', 'pressoir', 'centrifugeuse', 'mixeur', 'chaudron', 'tonneau', 'ensacheuse']) {
    assert(craft(s, b).ok, `l'Atelier fabrique : ${b}`);
    assertEqual(countItem(s, b), 1, b);
  }
});

test('chaîne d\'huile : entonnoir, presse, convoyeur ; 3 graines jetées, une huile au bout, avec le courant', () => {
  const s = usine('huile');
  const t = rangee(s, 5);
  poser(s, t, ['entonnoir', 'pressoir']);
  assertEqual(etatChaine(s, t).ok, false);
  assertEqual(verserChaine(s, t).error, 'Pose au moins un convoyeur juste à droite du dernier outil : le produit en sort.');
  poser(s, t + 2, ['convoyeur']);
  const c = etatChaine(s, t);
  assertEqual([c.ok, c.recette, c.reservoir, c.outils, c.convoyeurs, c.bout, c.capacite], [true, 'huile', null, [t + 1], [t + 2], t + 3, 3]);
  assertEqual([chaineDe(s, t + 1).case, chaineDe(s, t + 2).case, chaineDe(s, t + 3)], [t, t, null]);
  assertEqual(chaines(s).length, 1);
  // sans graines : le jeu dit ce qu'il faut
  setInv(s, {});
  assertEqual(verserChaine(s, t).error, 'Il faut 3 graines de tournesol pour : huile de tournesol.');
  // sans réservoir : de quoi faire une fois la recette
  setInv(s, { graine_tournesol: 7 });
  const v = verserChaine(s, t + 2);
  assertEqual([v.ok, v.versees, v.stock, countItem(s, 'graine_tournesol')], [true, { graine_tournesol: 3 }, { graine_tournesol: 3 }, 4]);
  assertEqual(verserChaine(s, t).ok, false, 'elle a déjà de quoi faire');
  // elle tourne la durée de sa presse, sur le courant des batteries
  const charge = s.batteries[0].chargeMwh, secondes = C.OUTILS.pressoir.secondes;
  runFor(s, secondes - 1);
  assertEqual([countItem(s, 'huile'), morceauxDe(s, 'ferme').length, etatChaine(s, t).enStock], [0, 0, 0], 'les graines sont dans la presse');
  runFor(s, 1.4);
  const m = morceauxDe(s, 'ferme');
  assertEqual([m.length, m[0].item, m[0].image], [1, 'huile', 'huile'], 'une huile tombe au bout du convoyeur');
  assert(s.batteries[0].chargeMwh < charge, 'elle a tiré du courant');
  assertEqual(etatChaine(s, t).tas, 1);
  assertEqual([ramasserMorceau(s, m[0].n).ok, countItem(s, 'huile')], [true, 1]);
  // sans courant : elle attend
  verserChaine(s, t);
  for (const b of s.batteries) b.chargeMwh = 0;
  s.panneaux.forEach((p) => { p.allume = false; });
  runFor(s, secondes * 2);
  assertEqual([morceauxDe(s, 'ferme').length, !!s.chaines[t].cycle], [0, true], 'pas de courant : rien ne sort');
  testFillBatteries(s);
  runFor(s, secondes + 1);
  assertEqual(morceauxDe(s, 'ferme').length, 1, 'le courant revenu, elle finit');
});

test('chaîne de jus avec un réservoir : elle travaille tant qu\'il reste des fruits, les jus s\'entassent au bout', () => {
  const s = usine('jus');
  const t = rangee(s, 7);
  poser(s, t, ['entonnoir', 'reservoir', 'mixeur', 'pressoir', 'convoyeur']);
  const c = etatChaine(s, t);
  assertEqual([c.recette, c.reservoir, c.capacite, c.secondes], ['jus_fruits', t + 1, C.RESERVOIR, C.OUTILS.mixeur.secondes + C.OUTILS.pressoir.secondes]);
  // une seule sorte de fruit par jus : celle dont il y a le plus
  setInv(s, { pomme: 10, poire: 2 });
  assertEqual(verserChaine(s, t).versees, { pomme: 10 });
  assertEqual(countItem(s, 'poire'), 2);
  runFor(s, c.secondes * 3 + 2);
  const tas = morceauxDe(s, 'ferme');
  assertEqual([tas.length, etatChaine(s, t).enStock], [3, 1], '3 jus, une pomme reste dans le réservoir');
  assertEqual(new Set(tas.map((m) => `${m.x},${m.y}`)).size, 3, 'en tas : chacun à sa place, pas l\'un sur l\'autre');
  // reprendre le réservoir : ce qu'il gardait revient
  assertEqual(reprendreBloc(s, t + 1).ok, true);
  assertEqual([countItem(s, 'pomme'), s.chaines[t]], [1, undefined]);
});

test('chaînes : des outils qui ne vont pas ensemble, une recette à débloquer, la case du bout', () => {
  const s = usine('refus');
  const t = rangee(s, 6);
  poser(s, t, ['entonnoir', 'pressoir', 'mixeur', 'convoyeur']);
  assertEqual(etatChaine(s, t).raison, 'Ces outils ne vont pas ensemble : presse, puis mixeur ne font rien.');
  assertEqual(reprendreBloc(s, t + 1).ok && reprendreBloc(s, t + 2).ok, true);
  poser(s, t + 1, ['centrifugeuse', 'pressoir']);   // (le convoyeur est resté en t + 3)
  assertEqual(etatChaine(s, t).recette, 'fromage_frais');
  // le fromage frais attend la Laiterie de l'Arbre des technologies
  assert(/à débloquer dans l'Arbre des technologies/.test(etatChaine(s, t).raison));
  grantTech(s, 'cui_laiterie', false);
  assertEqual(etatChaine(s, t).ok, true);
  // la case au bout doit rester libre
  poser(s, t + 5, ['mur_pierre']);
  assertEqual(etatChaine(s, t).ok, true, 'le mur n\'est pas au bout');
  poser(s, t + 4, ['convoyeur']);
  assertEqual(etatChaine(s, t).raison, 'La case au bout du convoyeur doit rester libre : les produits y tombent, en tas.');
});

test('chaînes : la cuisine ne fait plus ces recettes ; le joueur automatique les fait sans carte', () => {
  const s = usine('cuisine');
  setInv(s, { graine_tournesol: 7 });
  assertEqual(startRecipe(s, 'huile').ok, false);
  assertEqual(chainesSansCarte(s, ['huile']), 2);
  assertEqual([countItem(s, 'huile'), countItem(s, 'graine_tournesol')], [2, 1]);
});

test('migration 66 → 67 : la Presse construite rend son prix et un bloc de presse ; ce qui cuisait et se fait sur une chaîne est fini', () => {
  const s = usine('migre');
  s.version = 66;
  s.stations.presse = { construit: true, tache: { recette: 'huile', resteMs: 4000, dureeMs: 10000 }, appareil: null };
  s.stations.cuisine.construit = true;
  s.stations.cuisine.tache = { recette: 'compote', resteMs: 3000, dureeMs: 8000 };
  s.stations.cuisine.file = [{ recette: 'confiture_fraises', pris: [], eau: 0 }, { recette: 'omelette', pris: [], eau: 0 }];
  setInv(s, {});
  const avant = s.pieces;
  const m = migrate({ v: 66, t: 0, s: JSON.parse(JSON.stringify(s)) });
  assertEqual([m.version, 'presse' in m.stations, m.pieces, m.presseRendue], [STATE_VERSION, false, avant + PRESSE_RENDU, true]);
  assertEqual([countItem(m, 'pressoir'), countItem(m, 'huile'), countItem(m, 'compote'), countItem(m, 'confiture_fraises')], [1, 1, 1, 1]);
  assertEqual([m.stations.cuisine.tache.recette, m.stations.cuisine.file], ['omelette', []], 'l\'omelette qui attendait commence');
});
