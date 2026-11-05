/* ==========================================================================
   Tests du moteur : V-1, ce que disent les habitants de ce qu'ils voient (js/engine/propos.js,
   docs/phase-4.md).
   - chaque sujet a ses phrases ; une phrase dite n'a plus d'accolade ;
   - un sujet n'est dit que s'il est vrai dans la partie (ta ferme, la lune, un cadeau, un goût, les voisins…) ;
   - un enfant ne dit que les sujets d'un enfant ;
   - un habitant ne redit pas l'un de ses derniers sujets ; le même tirage dans la même partie ;
   - la parole d'un habitant mêle les sujets et les phrases d'avant ; pas de sujet quand il a faim.
   Lancer seul : node --test tests/engine/propos.test.mjs (ou node tests/run-tests.mjs propos).
   ========================================================================== */

import { DATA, elementsSol, genererMonde, plant, solDirect } from '../../js/engine/index.js';
import { habitantsDe, paroleHabitant, peuplerHameau } from '../../js/engine/habitants.js';
import { cleDe, fiche } from '../../js/engine/amitie.js';
import { proposDuMoment, sujetsPossibles, SUJETS_PROPOS } from '../../js/engine/propos.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

const P = DATA.HABITANTS.PROPOS;
const copie = (x) => JSON.parse(JSON.stringify(x));
let plansFaits = null;
function plans() {
  if (!plansFaits) {
    const sol = solDirect(genererMonde('1').terrain);
    elementsSol(sol.ctx);
    plansFaits = sol.ctx.hameaux.plans.filter((p) => !p.batisse);
  }
  return plansFaits;
}
// Une partie avec un hameau peuplé (le plus grand) : { s, p, h, adulte, enfant, foyer }.
function partie() {
  const s = garden();
  s.carte.graine = '1';
  const p = [...plans()].sort((a, b) => b.maisons.length - a.maisons.length)[0];
  const h = peuplerHameau(s, p);
  const foyer = h.foyers.find((f) => f.membres.some((m) => m.enfant)) || h.foyers[0];
  return { s, p, h, foyer, adulte: foyer.membres.find((m) => !m.enfant), enfant: foyer.membres.find((m) => m.enfant) };
}
const ids = (L) => L.map((x) => x.id);
const toujours = (v) => () => v;

test('V-1 : chaque sujet a ses phrases, les sujets d\'un enfant en font partie, plus de cent phrases', () => {
  for (const id of SUJETS_PROPOS) assert(Array.isArray(P[id]) && P[id].length >= 2, `${id} : ses phrases`);
  for (const id of P.ENFANTS) assert(SUJETS_PROPOS.includes(id), `${id} : un sujet`);
  const n = SUJETS_PROPOS.reduce((t, id) => t + P[id].length, 0);
  assert(n >= 100, `${n} phrases`);
  assert(P.PART > 0 && P.PART < 1 && P.MEMOIRE >= 2);
});

test('V-1 : un sujet n\'est dit que s\'il est vrai dans la partie ; un enfant, les siens seulement', () => {
  const { s, p, h, foyer, adulte, enfant } = partie();
  s.day = 6;   // (la pleine lune : jours 6 et 7 du mois)
  s.poulailler.poules = 0;
  let A = ids(sujetsPossibles(s, p.id, h, foyer, adulte));
  assert(A.includes('lune_pleine') && !A.includes('lune_nouvelle'), 'la pleine lune');
  assert(!A.includes('ferme_poules') && !A.includes('cadeau_merci') && !A.includes('gout_connu') && !A.includes('jours'), 'pas de poules, pas de cadeau, pas encore 7 jours');
  s.poulailler.poules = 3;
  s.day = 12;
  assert(plant(s, 'potager-1', 'carotte').ok);
  const S = sujetsPossibles(s, p.id, h, foyer, adulte);
  A = ids(S);
  for (const x of ['ferme_poules', 'ferme_cultures', 'jours']) assert(A.includes(x), x);
  eq(S.find((x) => x.id === 'ferme_poules').mots.n, 3);
  eq(S.find((x) => x.id === 'ferme_cultures').mots.culture, 'carotte');
  if (enfant) {
    const E = ids(sujetsPossibles(s, p.id, h, foyer, enfant));
    assert(E.length && E.every((x) => P.ENFANTS.includes(x)), `un enfant : ${E}`);
    assert(E.includes('famille_enfant') && E.includes('ferme_poules_enfant'), 'sa famille, les poules');
  }
  // un cadeau d'hier, un goût découvert
  const f = fiche(s, cleDe(adulte));   // (un personnage écrit, Garance par exemple, a la clé de son récit)
  f.cadeau = s.day - 1;
  f.gouts = { myrtille: 'adore' };
  const C = sujetsPossibles(s, p.id, h, foyer, adulte);
  assert(ids(C).includes('cadeau_merci'), 'le cadeau d\'hier');
  eq(C.find((x) => x.id === 'gout_connu').mots.objet, DATA.OBJETS.myrtille.nom);
});
function eq(a, b) { assertEqual(a, b); }

test('V-1 : un habitant ne redit pas ses derniers sujets ; le même tirage dans la même partie ; plus d\'accolade', () => {
  const { s, p, h, foyer, adulte } = partie();
  s.day = 12;
  s.poulailler.poules = 2;
  const vus = [];
  for (let k = 0; k < P.MEMOIRE; k++) {
    const r = proposDuMoment(s, p.id, h, foyer, adulte, toujours(0));
    assert(r && !/[{}]/.test(r.texte), `une phrase complète : ${r && r.texte}`);
    vus.push(r.id);
  }
  eq(new Set(vus).size, P.MEMOIRE);
  eq(s.propos[adulte.id], vus);
  // (le même habitant, la même partie : la même parole)
  const a = copie(s), b = copie(s);
  const ha = habitantsDe(a)[p.id], hb = habitantsDe(b)[p.id];
  const fa = ha.foyers.find((f) => f.maison === foyer.maison), fb = hb.foyers.find((f) => f.maison === foyer.maison);
  eq(paroleHabitant(a, p.id, adulte.id, { heure: 10, activite: 'maison', n: 3 }), paroleHabitant(b, p.id, adulte.id, { heure: 10, activite: 'maison', n: 3 }));
  assert(fa && fb);
});

test('V-1 : la parole mêle les sujets du moment et les phrases d\'avant ; pas de sujet quand il a faim', () => {
  const { s, p, adulte, foyer } = partie();
  s.day = 12;
  s.poulailler.poules = 2;
  let sujets = 0, autres = 0;
  for (let n = 0; n < 40; n++) {
    s.propos = {};
    const r = paroleHabitant(s, p.id, adulte.id, { heure: 10, activite: 'maison', n });
    if (r.propos) sujets += 1; else autres += 1;
    assert(!/[{}]/.test(r.texte), r.texte);
  }
  assert(sujets > 10 && autres > 5, `${sujets} sujets, ${autres} phrases d'avant`);
  // il a faim : il le dit, pas de sujet
  foyer.journal = [{ jour: s.day - 1, couverture: 40, reserve: {} }];
  for (let n = 0; n < 10; n++) assert(!paroleHabitant(s, p.id, adulte.id, { heure: 10, activite: 'maison', n }).propos, 'il a faim');
});
