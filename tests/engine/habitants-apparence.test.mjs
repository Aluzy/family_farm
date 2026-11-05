/* ==========================================================================
   Tests de l'apparence des habitants des hameaux (chantier « couches », étape E7 :
   docs/personnage-couches.md ; js/engine/apparence.js, tirerApparence ; js/engine/habitants.js) :
   - chaque habitant tiré (pas les personnages écrits du récit) a une apparence valide, la même pour la même
     graine ; deux habitants d'un hameau ne se ressemblent pas (peau, cheveux, coupe, haut) ;
   - pas de barbe pour un enfant ni pour une femme ; des choix variés sur l'ensemble des hameaux ;
   - la carte, la fiche du hameau, les invités et le visiteur reçoivent l'apparence.
   Lancer seul : node --test tests/engine/habitants-apparence.test.mjs
   ========================================================================== */

import { cleDiversite, DATA, elementsSol, genererMonde, mulberry32, solDirect, tirerApparence, validApparence } from '../../js/engine/index.js';
import { ficheHameau, habitantsDe, habitantsPourLaCarte, peuplerHameau } from '../../js/engine/habitants.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

const GRAINES = ['1', 'habitants-2', 'apparence-3'];
const partie = (graine) => {
  const s = garden();
  s.carte.graine = graine;
  const sol = solDirect(genererMonde(graine).terrain);
  elementsSol(sol.ctx);
  for (const p of sol.ctx.hameaux.plans.filter((q) => !q.batisse)) peuplerHameau(s, p);
  return s;
};
const membres = (s) => Object.values(habitantsDe(s)).flatMap((h) => h.foyers.flatMap((f) => f.membres));

test('apparence des habitants : valide, la même pour la même graine, pas deux pareils dans un hameau', () => {
  for (const graine of GRAINES) {
    const a = partie(graine), b = partie(graine);
    assertEqual(JSON.stringify(habitantsDe(a)), JSON.stringify(habitantsDe(b)), `${graine} : le même tirage`);
    for (const [id, h] of Object.entries(habitantsDe(a))) {
      const vus = new Set();
      for (const m of h.foyers.flatMap((f) => f.membres)) {
        if (m.recit) { assertEqual(m.apparence, undefined, `${m.prenom} : un personnage écrit garde le sien`); continue; }
        assertEqual(validApparence(m.apparence, !!m.enfant), m.apparence, `${id} ${m.id} : apparence valide`);
        assert(!vus.has(cleDiversite(m.apparence)), `${id} ${m.id} : deux habitants pareils`);
        vus.add(cleDiversite(m.apparence));
        if (m.enfant || m.genre === 'f') assertEqual(m.apparence.identite.pilosite, null, `${m.id} : pas de barbe`);
      }
    }
  }
});

test('apparence des habitants : des choix variés, et les probabilités tenues (sur 2000 tirages)', () => {
  const rnd = mulberry32(42), A = DATA.FAMILLE.PROFIL.APPARENCE, P = DATA.HABITANTS.APPARENCE;
  const n = { peau: new Set(), cheveux: new Set(), coupe: new Set(), tissu: new Set(), couvre: 0, rares: 0, barbe: 0, hommes: 0 };
  for (let k = 0; k < 2000; k++) {
    const enfant = k % 3 === 2, genre = k % 2 ? 'm' : 'f';
    const a = tirerApparence(rnd, { enfant, genre });
    assert(validApparence(a, enfant), `tirage ${k} invalide`);
    n.peau.add(a.identite.peau); n.cheveux.add(a.identite.cheveux); n.coupe.add(a.identite.coupe); n.tissu.add(a.tenue.haut.tissu);
    if (a.tenue.couvre_chef) n.couvre++;
    if (P.CHEVEUX_RARES.includes(a.identite.cheveux)) n.rares++;
    if (!enfant && genre === 'm') { n.hommes++; if (a.identite.pilosite) n.barbe++; }
  }
  assertEqual(n.peau.size, Object.keys(A.PEAU).length, 'toutes les peaux');
  assertEqual(n.cheveux.size, Object.keys(A.CHEVEUX).length, 'toutes les couleurs de cheveux');
  assertEqual(n.tissu.size, Object.keys(A.TISSU).length, 'tous les tissus');
  assert(n.coupe.size >= Object.keys(A.COUPE.adulte).length, 'les coupes');
  const prche = (x, p, total) => Math.abs((100 * x) / total - p) < 4;
  assert(prche(n.couvre, P.COUVRE_CHEF, 2000), `couvre-chefs : ${n.couvre}`);
  assert(prche(n.rares, P.RARES, 2000), `cheveux de fantaisie : ${n.rares}`);
  assert(prche(n.barbe, P.PILOSITE, n.hommes), `barbes : ${n.barbe} / ${n.hommes}`);
});

test('apparence des habitants : la carte et la fiche du hameau la reçoivent', () => {
  const s = partie('1');
  const carte = habitantsPourLaCarte(s);
  for (const [id, h] of Object.entries(habitantsDe(s))) {
    const M = h.foyers.flatMap((f) => f.membres), C = carte[id].foyers.flatMap((f) => f.membres);
    M.forEach((m, k) => assertEqual(C[k].apparence, m.recit ? null : m.apparence, `${id} ${m.id} : la carte`));
    const F = ficheHameau(s, id);
    if (F) F.familles.flatMap((f) => f.membres).forEach((m, k) => assertEqual(m.apparence, M[k].recit ? null : M[k].apparence, `${id} : la fiche`));
  }
  assert(membres(s).some((m) => m.apparence), 'des habitants à apparence');
});
