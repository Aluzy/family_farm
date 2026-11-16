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

function eq(a, b) { assertEqual(a, b); }
