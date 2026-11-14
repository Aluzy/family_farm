/* ==========================================================================
   Tests du moteur : l'horloge commune d'un monde de l'île (fiche I9a2 ; js/engine/temps-monde.js ; la note :
   docs/fiches/ile/I9a2-note-horloge.md). Le pas du monde (5 s d'horloge, joué toujours un après l'autre) donne la
   même partie à qui le joue ; un pas plus gros ne la donne pas ; la nuit vient seule à 22 h ; une préparation finit
   à son heure (celle qui cuit encore à minuit finit à minuit) ; l'énergie est celle de chaque joueur, rendue la nuit
   à tous ; la sauvegarde passe au format 104.
   Lancer seul : node tests/engine/village-temps-monde.test.mjs (ou node tests/run-tests.mjs temps-monde).
   ========================================================================== */

import {
  addItem, avancerJusqua, clockHours, createNewGame, DATA, dureeDuPas, empreintePartie, energieDe, energyMax, executerCommande,
  farmStep, horlogeVivante, migrate, nightActive, pasDe, pasDuMonde, STATE_VERSION, testBatir, testSetLevel,
} from '../../js/engine/index.js';
import { assert, assertEqual, avecVillage, farm, sansPenalite, test } from './aide.mjs';

const cloner = (v) => JSON.parse(JSON.stringify(v));
const PAS_PAR_HEURE = (DATA.TEMPS.SECONDES_PAR_HEURE * 1000) / DATA.VILLAGE.EN_LIGNE.PAS_MS;   // 6

// La partie d'un monde de l'île (comme MondeRegistre.creer la garde : mondePartage), la Cuisine, le Four et le foyer
// bâtis (une paillasse dans une pièce close : la nuit rend l'énergie), de quoi cuisiner.
function ileDuMonde(graine = '17') {
  const s = createNewGame(graine, { nom: 'Île' });
  s.essais = { ...(s.essais || {}), village: true };
  testSetLevel(s, 5);
  for (const st of ['foyer', 'four', 'cuisine']) assert(testBatir(s, st).ok, `bâtir ${st}`);
  s.mondePartage = true;
  s.eauMl = 50000;
  for (const ing of DATA.RECETTES.omelette.ingredients) addItem(s, ing.item || ing.objet || (ing.options && ing.options[0]), (ing.qte || 1) * 10);
  return s;
}

test('I9a2 : une île en ligne a une horloge vivante ; une ferme d\'avant (F.2) ou une partie solo, non', () => {
  const s = ileDuMonde();
  assertEqual([horlogeVivante(s), horlogeVivante({ ...s, mondePartage: false }), pasDe(s)], [true, false, 0]);
  const ferme = farm();
  ferme.mondePartage = true;
  assertEqual(avecVillage(() => horlogeVivante(ferme), false), false, 'une ferme d\'avant (le chantier éteint) garde l\'horloge figée');
  assertEqual(DATA.VILLAGE.EN_LIGNE.PAS_MS, 5000, 'le pas du protocole : 5 s d\'horloge');
});

test('I9a2 : les mêmes pas, joués deux fois (la partie passée par JSON au milieu), donnent la même partie ; avancerJusqua ne joue que les pas dus', () => {
  const a = ileDuMonde(), b = cloner(a);
  assertEqual(avancerJusqua(a, 300), 300);
  avancerJusqua(b, 120);
  const c = cloner(b);   // (un joueur qui arrive : la partie du monde, par le réseau)
  avancerJusqua(c, 300);
  avancerJusqua(b, 300);
  assertEqual([pasDe(a), empreintePartie(a) === empreintePartie(b), empreintePartie(a) === empreintePartie(c)], [300, true, true]);
  assertEqual(avancerJusqua(a, 200), 0, 'un pas passé ne se rejoue pas');
});

test('I9a2 : un pas de 60 s ne donne pas la même partie que 12 pas de 5 s (la raison du pas fixe) ; 12 pas de 5 s, deux fois, si', () => {
  const s = farm({ pump: true });
  s.awakeMs = (18.75 - DATA.TEMPS.HEURE_REVEIL) * DATA.TEMPS.SECONDES_PAR_HEURE * 1000;   // (18 h 45 : le soleil se couche à 19 h)
  const gros = cloner(s), petits = cloner(s), encore = cloner(s);
  farmStep(gros, 60000, { horloge: true });
  for (let i = 0; i < 12; i++) { farmStep(petits, 5000, { horloge: true }); farmStep(encore, 5000, { horloge: true }); }
  assertEqual(gros.awakeMs, petits.awakeMs, 'la même heure');
  assert(empreintePartie(gros) !== empreintePartie(petits), 'un gros pas diverge (l\'énergie au coucher du soleil)');
  assertEqual(empreintePartie(petits), empreintePartie(encore));
});

test('I9a2 : la nuit vient seule à 22 h (pas 96), le jour change à minuit (pas 108), le réveil à 6 h (pas 144) ; tous couchés, un pas de nuit dure 0,5 s', () => {
  const s = ileDuMonde();
  const vu = {};
  for (let i = 1; i <= 150; i++) {
    const ev = pasDuMonde(s);
    for (const k of ['nuit', 'minuit', 'reveil']) if (ev[k] && !vu[k]) vu[k] = [i, s.day, Math.round(clockHours(s) * 100) / 100];
    if (i === 100) {
      assert(executerCommande(s, { id: 'c-sommeil', type: 'temps.sommeil', args: { oui: true } }).ok);
      assertEqual([nightActive(s), dureeDuPas(s)], [true, 500], 'tous couchés : dix fois plus vite');
    }
  }
  assertEqual(vu, { nuit: [96, 1, 22], minuit: [108, 2, 0], reveil: [144, 2, 6] });
  assertEqual([s.horloge.sommeil, s.horloge.reveils, s.reveil, dureeDuPas(s)], [false, 1, false, 5000], 'au réveil, la cadence revient seule');
  // (le jour, se coucher ne presse rien : la cadence est celle de la nuit)
  assert(executerCommande(s, { id: 'c-sommeil-2', type: 'temps.sommeil', args: { oui: true } }).ok);
  assertEqual(dureeDuPas(s), 5000);
  const ferme = farm();
  ferme.mondePartage = true;
  assertEqual(avecVillage(() => executerCommande(ferme, { id: 'c-sommeil-3', type: 'temps.sommeil', args: { oui: true } }).ok, false), false, 'pas dans une ferme d\'avant');
});

test('I9a2 : une préparation finit à son heure, dans les pas (pas à la nuit) ; celle qui cuit encore à 22 h finit à minuit, comme en solo', () => {
  const s = ileDuMonde();
  const r = executerCommande(s, { id: 'c-omelette', type: 'cuisine.lancer', args: { recette: 'omelette' } }, { acteur: 'A' });
  assert(r.ok, r.error);
  const temps = DATA.RECETTES.omelette.temps * 1000, pas = Math.ceil(temps / DATA.VILLAGE.EN_LIGNE.PAS_MS);
  avancerJusqua(s, pas - 1);
  assert(s.stations.cuisine.tache, 'pas encore prête');
  pasDuMonde(s);
  assertEqual([s.stations.cuisine.tache, s.day], [null, 1], `prête au pas ${pas}, le jour même`);
  // 21 h 55 : lancée, elle cuit 5 s (un pas), puis la nuit vient ; elle finit à minuit (finishPreparations)
  const t = ileDuMonde();
  t.awakeMs = (DATA.TEMPS.HEURE_NUIT - DATA.TEMPS.HEURE_REVEIL) * DATA.TEMPS.SECONDES_PAR_HEURE * 1000 - 5000;
  assert(executerCommande(t, { id: 'c-omelette-2', type: 'cuisine.lancer', args: { recette: 'omelette' } }, { acteur: 'A' }).ok);
  const ev = pasDuMonde(t);
  assert(ev.nuit && t.stations.cuisine.tache, 'la nuit est venue, l\'omelette cuit encore');
  for (let i = 0; i < PAS_PAR_HEURE * 2 - 1; i++) pasDuMonde(t);
  assert(t.stations.cuisine.tache, 'à 23 h 50, elle cuit toujours (la nuit, rien ne tourne)');
  assert(pasDuMonde(t).minuit && !t.stations.cuisine.tache, 'à minuit, elle est prête');
});

test('I9a2 : l\'énergie est celle de chaque joueur (sa commande la dépense, pas celle de l\'autre) ; la nuit la rend à tous, présents ou non', () => {
  const s = ileDuMonde(), max = energyMax(s);
  const avant = s.energie;
  assertEqual([energieDe(s, 'A'), energieDe(s, 'B')], [max, max], 'un compte nouveau a l\'énergie pleine');
  assert(executerCommande(s, { id: 'c-a', type: 'cuisine.lancer', args: { recette: 'omelette' } }, { acteur: 'A' }).ok);
  const a1 = s.energies.A;
  assert(a1 < max, 'A a dépensé la sienne');
  assertEqual([s.energies.B, s.energie], [undefined, avant], 'celle de B n\'a pas bougé ; celle de la partie non plus');
  // A est épuisé ; B, qui a toute la sienne, peut encore lancer une recette
  s.energies.A = 0;
  assertEqual(executerCommande(s, { id: 'c-a2', type: 'cuisine.lancer', args: { recette: 'omelette' } }, { acteur: 'A' }).ok, false, 'A, sans énergie');
  assert(executerCommande(s, { id: 'c-b', type: 'cuisine.lancer', args: { recette: 'omelette' } }, { acteur: 'B' }).ok, 'B, avec la sienne');
  const b1 = s.energies.B;
  // une nuit entière, avec les réglages du jeu (B-1 : sans « Dormir » aussi) : les deux remontent, A comme B
  const t = cloner(s);
  sansPenalite(() => avancerJusqua(s, 24 * PAS_PAR_HEURE));
  assert(s.energies.A > 0 && s.energies.B > b1, `rendue à tous : ${JSON.stringify(s.energies)}`);
  // (les pénalités d'avant : seule une nuit où tous dorment la rend, à chacun)
  avancerJusqua(t, 100);
  assert(executerCommande(t, { id: 'c-dort', type: 'temps.sommeil', args: { oui: true } }).ok);
  avancerJusqua(t, 24 * PAS_PAR_HEURE);
  assert(t.energies.A > 0 && t.energies.B > b1, `tous couchés : ${JSON.stringify(t.energies)}`);
  // ailleurs (une partie solo, une ferme d'avant), l'acteur ne change rien
  const solo = ileDuMonde();
  solo.mondePartage = false;
  const e0 = solo.energie;
  assert(executerCommande(solo, { id: 'c-s', type: 'cuisine.lancer', args: { recette: 'omelette' } }, { acteur: 'A' }).ok);
  assert(solo.energie < e0 && !solo.energies, 'la partie solo dépense la sienne');
});

test('I9a2 : la sauvegarde passe au format 104 : la partie d\'un monde reçoit son horloge et les énergies (lisibles) ; une partie solo n\'y gagne rien', () => {
  assertEqual(STATE_VERSION, 104);
  const s = ileDuMonde();
  const v103 = { ...cloner(s), version: 103 };
  delete v103.horloge; delete v103.energies;
  const m = migrate({ v: 103, t: 0, s: v103 });
  assertEqual([m.version, m.horloge, m.energies], [104, { pas: 0, sommeil: false, reveils: 0 }, {}]);
  const abime = migrate({ v: 103, t: 0, s: { ...cloner(v103), horloge: { pas: -3, sommeil: 'oui', reveils: 2 }, energies: { A: 4000, B: 'x', C: -1 } } });
  assertEqual([abime.horloge, abime.energies], [{ pas: 0, sommeil: false, reveils: 2 }, { A: 4000 }]);
  const solo = { ...cloner(s), version: 103, mondePartage: false };
  delete solo.horloge; delete solo.energies;
  const ms = migrate({ v: 103, t: 0, s: solo });
  assertEqual([ms.version, 'horloge' in ms, 'energies' in ms], [104, false, false]);
});

test('I9a2 : le bac accoste dans le pas, à son heure (ce que faisait la page en solo : watchBac)', () => {
  const s = ileDuMonde();
  const bacs = [];
  for (let i = 0; i < 144 * 4; i++) if (pasDuMonde(s).bac) bacs.push([s.day, Math.round(clockHours(s) * 100) / 100]);
  assert(bacs.length >= 1, 'un bac en quatre jours');
  for (const [, h] of bacs) assertEqual(h, DATA.PORT.BAC.HEURES[0], 'à l\'heure de son arrivée');
  assertEqual(s.port.avis.filter((a) => a.quoi === 'bac').length, bacs.length, 'ses avis, pour la page de chacun');
});
