/* ==========================================================================
   Tests du moteur : D-3, les personnages qui manquaient (docs/phase-4.md ; data/recit.json PERSONNAGES).
   - où ils vivent : Fernand aux Mouettes (pêcheur), Garance et Lise aux Genêts (le même foyer), Frida au Gué
     (son foyer à elle, son atelier restant son lieu de travail) ;
   - les rencontres : les toucher la première fois (garance_rencontre, lise_rencontre, frida_gue) ; puis leurs
     répliques ; le secret de Lise (une amie : le souvenir des lucioles, au carnet) ;
   - Frida rencontrée au Gué : à la ferme, sa scène des machines vient quand même, sans se présenter deux fois.
   Lancer seul : node --test tests/engine/recit-d3.test.mjs (ou node tests/run-tests.mjs recit-d3).
   ========================================================================== */

import { awakeMsAtHour, composeFamily, createNewGame, DATA, elementsSol, finishSetup, genererMonde, migrate, solDirect, STATE_VERSION } from '../../js/engine/index.js';
import { habitantsDe, peuplerHameau } from '../../js/engine/habitants.js';
import { aFait, ajouterRelation, jouerScene, noterFait, recitDe, repliquesPossibles, scenesPossibles } from '../../js/engine/recit.js';
import { assert, assertEqual, test } from './aide.mjs';

let modele = null;
function partie() {
  if (!modele) {
    // (graine 5 : une maison des Genêts a la place de Garance et de Lise ; un hameau sans maison de deux lits
    // n'a pas Lise, comme Théo : installerEcrits)
    const s = createNewGame(5);
    assert(composeFamily(s, { perso: 3, prenom: 'Léa', nom: 'Martin', compagnon: { perso: 4, prenom: 'Hugo' } }).ok && finishSetup(s).ok);
    const sol = solDirect(genererMonde(s.carte.graine).terrain);
    elementsSol(sol.ctx);
    const plans = sol.ctx.hameaux.plans.filter((p) => !p.batisse);
    s.monde.hameaux = {};
    for (const g of ['gue', 'genets', 'mouettes', 'bois_joli']) {
      const p = plans.find((x) => x.garanti === g);
      peuplerHameau(s, p);
      s.monde.hameaux[p.id] = { nom: p.nom, style: p.style, jour: 2 };
    }
    modele = JSON.stringify(s);
  }
  const s = JSON.parse(modele);
  s.campagne.chapitre = 5;
  s.day = 30;
  s.awakeMs = awakeMsAtHour(14);
  noterFait(s, ['arrivee', 'achille.cle', 'odile.rencontre', 'odile.tutoie']);
  return s;
}
const idDe = (s, g) => Object.keys(habitantsDe(s)).find((id) => habitantsDe(s)[id].garanti === g);
const foyerDe = (s, rid) => { for (const h of Object.values(habitantsDe(s))) for (const f of h.foyers) if (f.membres.some((m) => m.recit === rid)) return { h, f }; return null; };

test('D-3 : Fernand aux Mouettes, Garance et Lise aux Genêts (un foyer), Frida au Gué (le sien)', () => {
  const s = partie();
  const fe = foyerDe(s, 'fernand'), ga = foyerDe(s, 'garance'), li = foyerDe(s, 'lise'), fr = foyerDe(s, 'frida'), od = foyerDe(s, 'odile');
  assert(fe && fe.h === habitantsDe(s)[idDe(s, 'mouettes')], 'Fernand aux Mouettes');
  assertEqual(fe.f.membres.find((m) => m.recit === 'fernand').metier, 'pecheur');
  assert(ga && ga.h === habitantsDe(s)[idDe(s, 'genets')], 'Garance aux Genêts');
  assert(li && li.f === ga.f, 'Lise avec sa mère');
  assert(li.f.membres.find((m) => m.recit === 'lise').enfant, 'Lise est une enfant');
  assert(fr && fr.h === habitantsDe(s)[idDe(s, 'gue')] && fr.f !== od.f, 'Frida au Gué, chez elle');
  for (const rid of ['fernand', 'garance', 'lise', 'frida']) assertEqual(foyerDe(s, rid).f.membres.find((m) => m.recit === rid).perso, DATA.RECIT.PERSONNAGES[rid].perso, `${rid} : son apparence`);
});

test('D-3 : les rencontres, puis leurs répliques ; le secret de Lise, une fois amie', () => {
  const s = partie();
  const gen = { lieu: 'genets', hameau: idDe(s, 'genets') };
  assertEqual(scenesPossibles(s, { ...gen, touche: 'garance' })[0], 'garance_rencontre');
  assert(jouerScene(s, 'garance_rencontre', { ...gen, touche: 'garance' }).ok);
  assert(repliquesPossibles(s, 'garance').length >= 3, 'Garance parle de ses couleurs');
  assertEqual(scenesPossibles(s, { ...gen, touche: 'lise' })[0], 'lise_rencontre');
  assert(jouerScene(s, 'lise_rencontre', { ...gen, touche: 'lise' }).ok);
  assert(repliquesPossibles(s, 'lise').some((r) => r.id === 'lise.renard'));
  assertEqual(scenesPossibles(s, { ...gen, touche: 'lise' }).includes('lise_lucioles'), false, 'pas encore amie');
  ajouterRelation(s, 'lise', DATA.RECIT.PALIERS[2]);
  assertEqual(scenesPossibles(s, { ...gen, touche: 'lise' })[0], 'lise_lucioles');
  const r = jouerScene(s, 'lise_lucioles', { ...gen, touche: 'lise' });
  assert(r.ok && recitDe(s).carnet.includes('souvenir_lise'), 'le souvenir des lucioles, au carnet');
  assertEqual(scenesPossibles(s, { ...gen, touche: 'lise' }).includes('lise_lucioles'), false, 'une fois');
  ajouterRelation(s, 'fernand', DATA.RECIT.PALIERS[1]);
  assert(repliquesPossibles(s, 'fernand').some((r) => r.id === 'fernand.histoire'), 'Fernand raconte');
});

test('D-3 : Frida rencontrée au Gué ; à la ferme, sa scène des machines vient sans se présenter deux fois', () => {
  const s = partie();
  const gue = { lieu: 'gue', hameau: idDe(s, 'gue') };
  assertEqual(scenesPossibles(s, { ...gue, touche: 'frida' })[0], 'frida_gue');
  assert(jouerScene(s, 'frida_gue', { ...gue, touche: 'frida' }).ok);
  assert(aFait(s, 'frida.rencontre') && !aFait(s, 'frida.ferme'));
  assert(repliquesPossibles(s, 'frida').some((r) => r.id === 'frida.herons'));
  const ferme = scenesPossibles(s, { lieu: 'ferme' });
  assert(ferme.includes('frida_ferme_amie') && !ferme.includes('frida_ferme'), ferme.join(', '));
  const r = jouerScene(s, 'frida_ferme_amie', { lieu: 'ferme' });
  assert(r.ok && !r.lignes.some((l) => /Une inconnue/.test(l.nom) || /panier/.test(l.texte)), 'elle ne se présente pas deux fois');
  assert(aFait(s, 'frida.ferme'));
  assertEqual(scenesPossibles(s, { lieu: 'ferme' }).some((id) => id.startsWith('frida_ferme')), false);
  // la rencontrer d'abord à la ferme : la scène d'avant, et plus celle du Gué
  const t = partie();
  assert(jouerScene(t, 'frida_ferme', { lieu: 'ferme' }).ok);
  assertEqual(scenesPossibles(t, { ...gue, touche: 'frida' }).includes('frida_gue'), false);
  assertEqual(scenesPossibles(t, { lieu: 'ferme' }).includes('frida_ferme_amie'), false);
});

test('D-3 : la migration 73 → 74 note la scène de Frida à la ferme déjà jouée', () => {
  const s = createNewGame(3);
  const v73 = { ...JSON.parse(JSON.stringify(s)), version: 73, recit: { faits: { 'frida.rencontre': [20, 20, 1] }, relations: {}, confiance: {}, dites: {}, carnet: [], promesses: {} } };
  const m = migrate(v73);
  assertEqual([m.version, m.recit.faits['frida.ferme']], [STATE_VERSION, [20, 20, 1]]);
});
