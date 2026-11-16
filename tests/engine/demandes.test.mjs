/* ==========================================================================
   Tests du moteur : V-2, les petites demandes des habitants (js/engine/demandes.js, docs/phase-4.md).
   - pas de demande avant d'avoir visité un hameau, ni avant DEPUIS jours ; au plus MAX ouvertes ;
   - une demande porte sur un besoin de son métier ; il la dit quand on lui parle ;
   - la rendre : les objets partent, l'amitié monte, un présent de son métier vient ; pas deux fois ;
   - une demande qu'on ne fait pas s'oublie, sans rien coûter ;
   - le même tirage dans la même partie ; rien dans un monde partagé.
   Lancer seul : node --test tests/engine/demandes.test.mjs (ou node tests/run-tests.mjs demandes).
   ========================================================================== */

import { addItem, countItem, DATA, demandeDe, demandesDe, demandesNuit, demandesOuvertes, elementsSol, genererMonde, pointsAmitie, rendreDemande, solDirect } from '../../js/engine/index.js';
import { paroleHabitant, peuplerHameau } from '../../js/engine/habitants.js';
import { amitieDe, cleDe, trouverPnj } from '../../js/engine/amitie.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

const D = DATA.DEMANDES;
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
// Une partie, deux hameaux peuplés ; `visite` : ils ont été visités.
function partie(visite = true) {
  const s = garden();
  s.carte.graine = '1';
  const P = plans().slice(0, 2);
  for (const p of P) { peuplerHameau(s, p); if (visite) amitieDe(s).visites[p.id] = 1; }
  return s;
}
// `n` nuits de demandes (le jour avance).
function nuits(s, n) {
  const faites = [];
  for (let k = 0; k < n; k++) { s.day += 1; const d = demandesNuit(s); if (d) faites.push(d); }
  return faites;
}

test('V-2 : les données (au moins une demande par métier, des motifs, des phrases)', () => {
  for (const m of ['bucheron', 'pecheur', 'mineur', 'berger', 'cueilleur', 'jardinier']) {
    assert(D.BESOINS[m].length >= 3, m);
    for (const [it, a, b, motif] of D.BESOINS[m]) assert(DATA.OBJETS[it] && a >= 1 && b >= a && motif.length > 5, `${m} : ${it}`);
  }
  assert(D.MAX >= 1 && D.DUREE >= 3 && D.CHANCE > 0 && D.CHANCE <= 1 && D.AMITIE > 0);
});

function eq(x, y, m) { assertEqual(x, y, m); }
