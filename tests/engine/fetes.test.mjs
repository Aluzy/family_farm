/* ==========================================================================
   Tests du moteur : V-4, la fête du hameau (js/engine/fetes.js, docs/phase-4.md).
   - le calendrier : PAR_MOIS fêtes par mois, des hameaux et des jours différents, le même tirage ;
   - y aller : pendant la fête seulement, une fois ; l'amitié avec chaque adulte, un plat de fête ;
   - les habitants en parlent (avant, le jour même, après) ; rien dans un monde partagé.
   Lancer seul : node --test tests/engine/fetes.test.mjs (ou node tests/run-tests.mjs fetes).
   ========================================================================== */

import { allerALaFete, amitieAvec, countItem, DATA, elementsSol, feteEnCours, fetesAVenir, fetesDuJour, fetesDuMois, genererMonde, nomFete, solDirect, sujetsPossibles, venuALaFete } from '../../js/engine/index.js';
import { habitantsDe, peuplerHameau } from '../../js/engine/habitants.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

let plansFaits = null;
function plans() {
  if (!plansFaits) {
    const sol = solDirect(genererMonde('1').terrain);
    elementsSol(sol.ctx);
    plansFaits = sol.ctx.hameaux.plans.filter((p) => !p.batisse).sort((a, b) => b.maisons.length - a.maisons.length);
  }
  return plansFaits;
}
function partie(n = 3) {
  const s = garden();
  s.carte.graine = '1';
  for (const p of plans().slice(0, n)) peuplerHameau(s, p);
  return s;
}
const M = () => DATA.LUNE.JOURS_MOIS;

test('V-4 : le calendrier : PAR_MOIS fêtes par mois, des hameaux et des jours différents, le même tirage', () => {
  const s = partie();
  for (let mois = 0; mois < 6; mois++) {
    const L = fetesDuMois(s, mois * M() + 1);
    assertEqual(L.length, DATA.FETES.PAR_MOIS);
    assertEqual(new Set(L.map((f) => f.hameau)).size, L.length, 'des hameaux différents');
    assertEqual(new Set(L.map((f) => f.jour)).size, L.length, 'des jours différents');
    for (const f of L) {
      assert(f.jour >= mois * M() + DATA.FETES.JOUR_MIN && f.jour <= (mois + 1) * M(), `jour ${f.jour} dans le mois ${mois}`);
      assert(habitantsDe(s)[f.hameau], 'un hameau peuplé');
      assertEqual(fetesDuMois(s, f.jour), L, 'le même mois, vu de n\'importe quel jour');
    }
  }
  assertEqual(fetesDuMois(partie(), 20), fetesDuMois(s, 20), 'le même tirage');
  const seul = partie(1);
  assertEqual(fetesDuMois(seul, 1).length, 1, 'un seul hameau : une fête');
  assertEqual(fetesDuMois(garden(), 1), [], 'aucun hameau : pas de fête');
  const h = habitantsDe(s)[plans()[0].id];
  assert(nomFete(h).nom && nomFete(h).icone, 'un nom, une icône');
  assertEqual(nomFete({ metier: 'pecheur' }).nom, 'la fête de la pêche');
});

test('V-4 : y aller : pendant la fête seulement, une fois ; l\'amitié avec chaque adulte, un plat de fête', () => {
  const s = partie();
  const f = fetesDuMois(s, 1)[0];
  s.day = f.jour;
  assertEqual(fetesDuJour(s).map((x) => x.hameau), [f.hameau]);
  assert(fetesAVenir(s).some((x) => x.hameau === f.hameau), 'annoncée');
  assertEqual(allerALaFete(s, f.hameau, f.debut - 1).ok, false, 'avant : pas encore');
  assertEqual(feteEnCours(s, f.hameau, f.fin), null, 'après : finie');
  const autre = Object.keys(habitantsDe(s)).find((x) => x !== f.hameau);
  assertEqual(allerALaFete(s, autre, f.debut + 1).ok, false, 'pas chez les autres');
  const h = habitantsDe(s)[f.hameau];
  const adultes = h.foyers.flatMap((x) => x.membres.filter((m) => !m.enfant));
  const avant = adultes.map((m) => (amitieAvec(s, f.hameau, m.id) || { pts: 0 }).pts);
  const plat = (DATA.BIENVENUE.PLATS[h.metier] || DATA.BIENVENUE.PLATS['*']);
  const platAvant = countItem(s, plat);
  const r = allerALaFete(s, f.hameau, f.debut + 1);
  assert(r.ok, 'on y est');
  assertEqual(r.amis, adultes.length);
  adultes.forEach((m, k) => assert(amitieAvec(s, f.hameau, m.id).pts > avant[k], `${m.prenom} : plus d'amitié`));
  assertEqual(countItem(s, plat), platAvant + 1, 'un plat de fête');
  assertEqual(allerALaFete(s, f.hameau, f.debut + 2).ok, false, 'une fois');
  assert(venuALaFete(s, f.hameau), 'noté');
  s.day += 30;
  assertEqual(venuALaFete(s, f.hameau), false, 'oublié avec le temps');
});

test('V-4 : les habitants en parlent (avant, le jour même, après) ; rien dans un monde partagé', () => {
  const s = partie();
  const f = fetesDuMois(s, 1).find((x) => x.jour > 3) || fetesDuMois(s, 1)[0];
  const h = habitantsDe(s)[f.hameau], fo = h.foyers[0], m = fo.membres.find((x) => !x.enfant);
  const sujets = () => sujetsPossibles(s, f.hameau, h, fo, m).map((x) => x.id);
  s.day = f.jour - 2;
  s.awakeMs = 0;
  assert(sujets().includes('fete_bientot'), 'avant : elle vient');
  s.day = f.jour;
  assert(sujets().includes('fete_aujourdhui'), 'le matin : ce soir');
  allerALaFete(s, f.hameau, f.debut + 1);
  s.day = f.jour + 1;
  assert(sujets().includes('fete_souvenir'), 'après : le souvenir');
  const p = partie();
  p.mondePartage = true;
  p.day = f.jour;
  assertEqual(allerALaFete(p, f.hameau, f.debut + 1).ok, false, 'monde partagé : rien');
  assertEqual(p.fetes, undefined);
});
