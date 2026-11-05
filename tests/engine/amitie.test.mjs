/* ==========================================================================
   Tests du moteur : l'amitié avec les habitants des hameaux (js/engine/amitie.js, data/amitie.json).
   - la jauge : la conversation du jour, le passage dans le hameau, les cadeaux (selon les goûts, un par
     jour), les retrouvailles (jamais de perte avec l'absence) ; les paliers du récit ;
   - un personnage écrit garde sa relation du récit ;
   - les goûts : déterministes, sans doublon, découverts en offrant ;
   - l'humeur (la teinte sur la carte) ;
   - ce que l'amitié apporte : les présents devant la porte, la confiance du hameau, la remise et le délai
     des commandes aux ateliers des hameaux.
   Lancer seul : node tests/run-tests.mjs amitie.
   ========================================================================== */

import { addItem, countItem, DATA, RECIT, relation } from '../../js/engine/index.js';
import {
  AMITIE, ajouterAmitie, amitieAvec, amitieNuit, cadeauxPossibles, goutPour, goutsDe, humeurPnj, offrable, offrir,
  palierAmitie, parlerAmitie, pointsAmitie, prixAmitie, ramasserPresents, remiseAmitie, delaiAmitie, trouverPnj,
  visiterHameau,
} from '../../js/engine/amitie.js';
import { habitantsDe, peuplerHameau } from '../../js/engine/habitants.js';
import { confiance } from '../../js/engine/recit.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

// Un petit hameau fait à la main : deux maisons (un adulte et un enfant, puis un adulte).
function partie(metier = 'pecheur') {
  const s = garden();
  const plan = {
    id: 'h_ami', nom: 'Le Hameau Ami', metier, style: 'prairie', case: 0,
    maisons: [
      { id: 'h_ami_maison_1', lits: [{ case: 0, sorte: 'lit_adulte' }, { case: 1, sorte: 'lit_enfant' }] },
      { id: 'h_ami_maison_2', lits: [{ case: 2, sorte: 'lit_adulte' }] },
    ],
    jardins: [], travail: [], place: { cases: [] },
  };
  assert(peuplerHameau(s, plan), 'le hameau est peuplé');
  const membres = habitantsDe(s).h_ami.foyers.flatMap((f) => f.membres);
  return { s, membres, adulte: membres.find((m) => !m.enfant), hameau: 'h_ami' };
}

test('amitié : la conversation du jour (une fois), le passage dans le hameau (une fois par jour)', () => {
  const { s, adulte, membres, hameau } = partie();
  assertEqual(pointsAmitie(s, adulte.id), 0);
  const g = parlerAmitie(s, hameau, adulte.id);
  assertEqual([g.gain, g.premiere, pointsAmitie(s, adulte.id)], [AMITIE.PAROLE, true, AMITIE.PAROLE]);
  assertEqual(parlerAmitie(s, hameau, adulte.id).gain, 0, 'une seule fois par jour');
  assert(visiterHameau(s, hameau));
  assertEqual(visiterHameau(s, hameau), false, 'un passage par jour');
  for (const m of membres) assert(pointsAmitie(s, m.id) >= AMITIE.VISITE, `${m.prenom} : la visite compte`);
  s.day += 1;
  assertEqual(parlerAmitie(s, hameau, adulte.id).gain, AMITIE.PAROLE, 'le lendemain, encore');
});

test('amitié : les goûts sont déterministes, sans doublon, et le cadeau suit le goût (un par jour)', () => {
  const { s, adulte, hameau } = partie();
  const g = goutsDe(adulte);
  assertEqual(goutsDe(adulte), g, 'déterministes');
  const par = (k) => Object.keys(g).filter((it) => g[it] === k);
  assertEqual([par('adore').length, par('aime').length, par('deteste').length], [AMITIE.GOUTS.adore, AMITIE.GOUTS.aime, AMITIE.GOUTS.deteste]);
  const adore = par('adore')[0], deteste = par('deteste')[0];
  addItem(s, adore, 2);
  addItem(s, deteste, 1);
  assert(cadeauxPossibles(s).includes(adore));
  const r = offrir(s, hameau, adulte.id, adore);
  assertEqual([r.ok, r.gout, r.points, r.emotion, countItem(s, adore)], [true, 'adore', AMITIE.CADEAU.adore, 'joie', 1]);
  assertEqual(amitieAvec(s, hameau, adulte.id).gouts[adore], 'adore', 'le goût est découvert');
  assertEqual(offrir(s, hameau, adulte.id, adore).ok, false, 'un cadeau par jour');
  s.day += 1;
  const d = offrir(s, hameau, adulte.id, deteste);
  assertEqual([d.ok, d.gout, d.emotion, pointsAmitie(s, adulte.id)], [true, 'deteste', 'degout', AMITIE.CADEAU.adore + AMITIE.CADEAU.deteste]);
  // ce qui ne s'offre pas
  assertEqual(offrable('planche'), false);
  addItem(s, 'planche', 1);
  s.day += 1;
  assertEqual(offrir(s, hameau, adulte.id, 'planche').ok, false);
  assertEqual(goutPour(adulte, 'pomme_de_pin'), 'neutre');
});

test('amitié : les paliers du récit ; un personnage écrit garde sa relation', () => {
  const { s, adulte } = partie();
  ajouterAmitie(s, adulte.id, RECIT.PALIERS[3]);
  assertEqual(palierAmitie(s, adulte.id), 3);
  ajouterAmitie(s, adulte.id, 1000);
  assertEqual(pointsAmitie(s, adulte.id), RECIT.RELATION_MAX, 'borné');
  // un habitant qui est un personnage écrit (Odile) : sa relation du récit
  adulte.recit = 'odile';
  const t = trouverPnj(s, 'h_ami', adulte.id);
  assertEqual(t.cle, 'odile');
  const avant = relation(s, 'odile');
  parlerAmitie(s, 'h_ami', adulte.id);
  assertEqual(relation(s, 'odile'), avant + AMITIE.PAROLE);
  assertEqual(goutsDe(adulte).tarte_pommes, 'adore', 'ses goûts écrits');
});

test('amitié : jamais de perte avec l\'absence, la joie des retrouvailles ; la tristesse d\'un foyer, la joie, la colère', () => {
  const { s, adulte, hameau } = partie();
  ajouterAmitie(s, adulte.id, 30);
  parlerAmitie(s, hameau, adulte.id);
  assertEqual(humeurPnj(s, hameau, adulte), null, 'cordial : rien de particulier');
  s.day += AMITIE.RETROUVAILLES.JOURS + 5;
  const avant = pointsAmitie(s, adulte.id);
  for (let k = 0; k < 5; k++) amitieNuit(s);
  assertEqual(pointsAmitie(s, adulte.id), avant, 'l\'absence ne fait rien perdre');
  assertEqual(humeurPnj(s, hameau, adulte), null, 'ni triste de ton absence');
  const g = parlerAmitie(s, hameau, adulte.id);
  assertEqual([g.retrouvailles, g.gain], [true, AMITIE.PAROLE + AMITIE.RETROUVAILLES.BONUS], 'les retrouvailles');
  s.day += 1;
  const h = parlerAmitie(s, hameau, adulte.id);
  assertEqual([h.retrouvailles, h.gain], [false, AMITIE.PAROLE], 'le lendemain, une conversation ordinaire');
  // un inconnu revu longtemps après : pas de retrouvailles
  const { s: t, membres, hameau: h2 } = partie();
  const autre = membres[membres.length - 1];
  parlerAmitie(t, h2, autre.id);
  t.day += AMITIE.RETROUVAILLES.JOURS;
  assertEqual(parlerAmitie(t, h2, autre.id).retrouvailles, false, 'il ne te connaît pas encore');
  // la tristesse : son foyer est malheureux
  const foyer = habitantsDe(s)[hameau].foyers.find((f) => f.membres.includes(adulte));
  foyer.bonheur = DATA.HABITANTS.TRISTE - 1;
  assertEqual(humeurPnj(s, hameau, adulte), 'tristesse', 'un foyer malheureux');
  foyer.bonheur = DATA.HABITANTS.TRISTE + 20;
  ajouterAmitie(s, adulte.id, 100);
  assertEqual(humeurPnj(s, hameau, adulte), 'joie');
  // (jamais de colère, même un hameau qui ne te connaît pas encore : le récit cosy)
  s.recit.confiance[hameau] = 0;
  assertEqual(humeurPnj(s, hameau, adulte), 'joie');
});

test('amitié : les présents des amis devant la porte, la confiance du hameau qui monte', () => {
  const { s, adulte, hameau } = partie('bucheron');
  ajouterAmitie(s, adulte.id, 100);
  s.recit.confiance[hameau] = 40;
  let presents = [];
  for (let k = 0; k < 60 && !presents.length; k++) { s.day += 1; parlerAmitie(s, hameau, adulte.id); presents = amitieNuit(s).presents; }
  assert(presents.length >= 1, 'un ami intime laisse un jour un présent');
  const x = presents[0];
  assert(Object.keys(AMITIE.RETOUR.PRESENTS.bucheron).includes(x.objet), `un présent de bûcheron (${x.objet})`);
  const avant = countItem(s, x.objet);
  assert(ramasserPresents(s).length >= 1);
  assertEqual(countItem(s, x.objet) >= avant + x.n, true, 'il est dans l\'inventaire');
  assertEqual(ramasserPresents(s), [], 'une seule fois');
  assert(confiance(s, hameau) > 40, 'la confiance monte vers l\'amitié de ses habitants');
});

test('amitié : la remise et le délai des commandes aux ateliers', () => {
  const s = garden();
  assertEqual([remiseAmitie(s, 'basile'), delaiAmitie(s, 'basile'), prixAmitie(s, 'basile', 20)], [0, 0, 20]);
  s.recit.relations.basile = RECIT.PALIERS[4];
  assertEqual(remiseAmitie(s, 'basile'), AMITIE.REMISE[4]);
  assertEqual(prixAmitie(s, 'basile', 20), Math.ceil((20 * (100 - AMITIE.REMISE[4])) / 100));
  assertEqual(delaiAmitie(s, 'basile'), AMITIE.DELAI[4]);
  assertEqual(remiseAmitie(s, null), 0, 'personne : pas de remise');
  assert(DATA.AMITIE && DATA.ILE.ATELIERS.scierie.qui === 'basile');
});
