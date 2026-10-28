/* ==========================================================================
   Tests du moteur : le monde du récit (docs/recit/bible.md, lot 3a).
   - le Gué : dans chaque monde, le hameau le plus proche de la ferme s'appelle Le Gué (et lui seul) ;
     les autres noms ne se répètent pas ; les tirages du monde ne changent pas (au plus deux noms
     échangés) ;
   - la maison de Maurice : la première maison du plan du Gué, marquée dans le plan ; personne n'y vit
     (peuplerHameau ne lui donne pas de foyer) ; les autres hameaux n'en ont pas.
   La vérification sur 100 mondes se fait hors des tests (0,5 s par monde) : ici, 8 graines.
   Lancer seul : node --test tests/engine/recit-monde.test.mjs (ou node tests/run-tests.mjs recit-monde).
   ========================================================================== */

import { createNewGame, DATA, elementsSol, genererMonde, solDirect } from '../../js/engine/index.js';
import { habitantsDe, peuplerHameau } from '../../js/engine/habitants.js';
import { assert, assertEqual, test } from './aide.mjs';

const GUE = DATA.PLAN_MONDE.HAMEAUX.GUE;
const GRAINES = ['1', '7', '42', '2026', 'ceron', 'maurice', '31337', 'terres'];

test('le Gué : dans chaque monde, le hameau le plus proche de la ferme, et lui seul', () => {
  assertEqual(GUE, 'Le Gué');
  for (const g of GRAINES) {
    const m = genererMonde(g);
    const H = m.plan.lieux.hameaux;
    // (la distance au rectangle de la ferme, en cases, comme distanceFerme dans monde-gen.js)
    const W = m.terrain.LARGEUR, F = m.terrain.FERME;
    const dist = (h) => {
      const x = h.case % W, y = Math.floor(h.case / W);
      return Math.hypot(Math.max(F.X - x, 0, x - (F.X + F.LARGEUR - 1)), Math.max(F.Y - y, 0, y - (F.Y + F.HAUTEUR - 1)));
    };
    const gues = H.filter((h) => h.nom === GUE);
    assertEqual(gues.length, 1, `${g} : un seul Gué`);
    assert(gues[0].gue === true, `${g} : marqué gue`);
    assert(H.every((h) => dist(h) >= dist(gues[0])), `${g} : le plus proche de la ferme`);
    assertEqual(new Set(H.map((h) => h.nom)).size, H.length, `${g} : aucun nom en double`);
    assert(H.filter((h) => h.gue).length === 1, `${g} : un seul hameau marqué`);
  }
});

test('la maison de Maurice : la première maison du Gué, sans foyer', () => {
  const s = createNewGame(5);
  const sol = solDirect(genererMonde(s.carte.graine).terrain);
  elementsSol(sol.ctx);
  const plans = sol.ctx.hameaux.plans;
  const gue = plans.find((p) => p.nom === GUE);
  assert(gue && gue.gue === true, 'le plan du Gué est marqué');
  assertEqual(gue.maisonMaurice, gue.maisons[0].id);
  assert(plans.filter((p) => p !== gue).every((p) => p.maisonMaurice === undefined && !p.gue), 'les autres hameaux n\'en ont pas');
  const h = peuplerHameau(s, gue);
  assertEqual(h.foyers.length, gue.maisons.length - 1, 'une maison de moins habitée');
  assert(!h.foyers.some((f) => f.maison === gue.maisonMaurice), 'personne ne vit chez Maurice');
  assertEqual(habitantsDe(s)[gue.id], h);
  // un autre hameau garde un foyer par maison
  const autre = plans.find((p) => p !== gue);
  assertEqual(peuplerHameau(s, autre).foyers.length, autre.maisons.length);
});

/* ---------- lot 4 : les personnages écrits sur la carte ---------- */

import { noterFait as noter } from '../../js/engine/recit.js';
import { nomCocher, paroleHameau, RECIT as R4 } from '../../js/engine/recit.js';

// Le Gué d'une partie, peuplé (et ses plans).
function gueDe(seed = 5) {
  const s = createNewGame(seed);
  const sol = solDirect(genererMonde(s.carte.graine).terrain);
  elementsSol(sol.ctx);
  const plans = sol.ctx.hameaux.plans;
  const plan = plans.find((p) => p.gue);
  const h = peuplerHameau(s, plan);
  return { s, plan, h, plans };
}

test('Odile vit seule dans le premier foyer du Gué, avec son prénom et son apparence', () => {
  for (const seed of [5, 11, 23]) {
    const { h } = gueDe(seed);
    const f = h.foyers[0], o = R4.PERSONNAGES.odile;
    assertEqual(f.membres.map((m) => [m.prenom, m.genre, m.enfant, m.perso, m.recit]), [[o.nom, 'f', false, o.perso, 'odile']], `${seed} : Odile`);
    const autres = h.foyers.slice(1).flatMap((x) => x.membres);
    assert(!autres.some((m) => m.prenom === o.nom), `${seed} : personne d'autre ne s'appelle Odile`);
    assert(!autres.some((m) => !m.enfant && m.perso === o.perso), `${seed} : personne d'autre n'a son apparence`);
    assertEqual(new Set(h.foyers.flatMap((x) => x.membres).map((m) => m.prenom)).size, h.foyers.flatMap((x) => x.membres).length, `${seed} : des prénoms tous différents`);
  }
});

test('les autres hameaux n\'ont pas de personnage écrit', () => {
  const { s, plans } = gueDe(5);
  for (const p of plans.filter((x) => !x.gue)) assert(!peuplerHameau(s, p).foyers.some((f) => f.membres.some((m) => m.recit)), p.id);
});

test('toucher Odile : la phrase des habitants avant de la connaître, puis ses répliques', () => {
  const { s, plan, h } = gueDe(5);
  const odile = h.foyers[0].membres[0];
  s.day = 4;
  const avant = paroleHameau(s, plan.id, odile.id, { heure: 10, activite: 'maison', n: 0 });
  assertEqual([avant.prenom, avant.recit], ['Odile', undefined], 'elle ne dit encore rien du récit');
  noter(s, 'odile.rencontre');
  const apres = paroleHameau(s, plan.id, odile.id, { heure: 10, activite: 'maison', n: 1 });
  assertEqual([apres.prenom, apres.recit, apres.texte], ['Odile', 'odile.vous', 'Bonjour. Vous tenez le coup, là-haut ?']);
  assert(typeof s.recit.dites['odile.vous'] === 'number', 'la réplique est notée');
  // endormie : jamais de réplique du récit
  assertEqual(paroleHameau(s, plan.id, odile.id, { heure: 23, activite: 'dort', n: 2 }).recit, undefined);
  // un habitant ordinaire garde sa phrase
  const autre = h.foyers[1].membres[0];
  assertEqual(paroleHameau(s, plan.id, autre.id, { heure: 10, activite: 'maison', n: 0 }).recit, undefined);
});

test('le cocher : « le cocher » avant de se présenter, Achille ensuite', () => {
  const s = createNewGame(5);
  assertEqual([nomCocher(s), nomCocher(s, false)], ['Le cocher', 'le cocher']);
  noter(s, 'achille.cle');
  assertEqual([nomCocher(s), nomCocher(s, false)], ['Achille', 'Achille']);
});

/* ---------- lot 5 : la première séquence jouable (docs/recit/plan.md) ---------- */

import { ajouterConfiance, deHameau, genreJoueur } from '../../js/engine/recit.js';
import { paroleHabitant } from '../../js/engine/habitants.js';
import { deliverMail, mailText } from '../../js/engine/campaign.js';
import { composeFamily, finishSetup } from '../../js/engine/depart.js';

test('les lettres du départ : le notaire nomme Maurice, puis la lettre d\'Adèle, au genre du joueur', () => {
  const s = createNewGame(5);
  assert(composeFamily(s, { perso: 3, prenom: 'Léa', nom: 'Martin' }).ok && finishSetup(s).ok, 'la famille installée');
  deliverMail(s);
  const ids = s.courrier.map((l) => l.id);
  assert(ids.includes('notaire_heritage') && ids.includes('adele_arrivee'), ids.join(', '));
  assert(ids.indexOf('notaire_heritage') < ids.indexOf('adele_arrivee'), 'le notaire d\'abord');
  const t = mailText(s, 'adele_arrivee');
  assert(t.every((l) => typeof l === 'string' && l), 'des lignes de texte, la variante choisie');
  assertEqual(t[0], genreJoueur(s) === 'f' ? 'Ma grande,' : 'Mon grand,');
  assert(t.some((l) => /Odile/.test(l)) && t.some((l) => /Gué/.test(l)), 'elle parle d\'Odile, au Gué');
  assertEqual(deliverMail(s), [], 'une seule fois');
});

test('deHameau : « du Gué », « des Genêts », « de la Combe », « de Brumeval », « d\'Orgeval »', () => {
  assertEqual(['Le Gué', 'Les Genêts', 'La Combe', 'Brumeval', 'Orgeval', "L'Anse"].map(deHameau),
    ['du Gué', 'des Genêts', 'de la Combe', 'de Brumeval', "d'Orgeval", "de l'Anse"]);
});

test('les bulles : la faim chasse la phrase du repas ; un salut donné remplace celui de l\'heure', () => {
  const { s, plan, h } = gueDe(5);
  const f = h.foyers[1], m = f.membres.find((x) => !x.enfant);
  const repas = DATA.HABITANTS.PHRASES.activite.repas;
  f.journal = [{ couverture: 50 }];
  for (let n = 0; n < 12; n++) {
    const r = paroleHabitant(s, plan.id, m.id, { heure: 12, activite: 'repas', n });
    assertEqual(r.humeur, 'faim');
    assert(!repas.some((x) => r.texte.includes(x)), r.texte);
  }
  const r = paroleHabitant(s, plan.id, m.id, { heure: 12, activite: 'maison', n: 0, salut: 'Bonjour.' });
  assert(r.texte.startsWith('Bonjour. '), r.texte);
});

test('les bulles : le salut suit la confiance du hameau, chez les adultes seulement', () => {
  const { s, plan, h } = gueDe(5);
  const adultes = h.foyers.slice(1).flatMap((f) => f.membres).filter((m) => !m.enfant);
  const enfants = h.foyers.slice(1).flatMap((f) => f.membres).filter((m) => m.enfant);
  const saluts = (niveau) => R4.SALUTS[niveau].map((t) => (typeof t === 'object' ? t[genreJoueur(s)] : t));
  const paroles = (liste) => liste.flatMap((m) => [...Array(10).keys()].map((n) => paroleHameau(s, plan.id, m.id, { heure: 12, activite: 'maison', n }).texte));
  ajouterConfiance(s, plan.id, -100);   // réservée
  const froid = paroles(adultes);
  assert(froid.some((t) => saluts('reservee').some((x) => t.startsWith(x + ' '))), 'un « Bonjour. » réservé, parfois');
  assert(froid.some((t) => !saluts('reservee').some((x) => t.startsWith(x + ' '))), 'et le salut de l\'heure, l\'autre fois');
  assert(!froid.some((t) => saluts('chaleureuse').some((x) => t.startsWith(x.replace('{prenom}', '').trim()))), 'jamais chaleureux');
  ajouterConfiance(s, plan.id, 100);    // chaleureuse
  assert(paroles(adultes).some((t) => /Tu restes manger \?|Entre donc\./.test(t)), 'chaleureux, parfois');
  if (enfants.length) assert(!paroles(enfants).some((t) => /Tu restes manger \?|Entre donc\./.test(t)), 'un enfant garde son salut');
  for (const t of [...froid, ...paroles(adultes)]) assert(t.length > 0 && !/\{/.test(t), t);
});
