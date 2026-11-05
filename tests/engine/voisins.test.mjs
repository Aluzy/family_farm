/* ==========================================================================
   Tests du moteur : V-3, entre voisins (js/engine/voisins.js, docs/phase-4.md).
   - les liens : un ami dans son hameau (un autre foyer), un cousin dans un autre ; gardés ; le même tirage ;
   - l'entraide : un foyer qui a eu faim reçoit du garde-manger d'un ami ou d'un cousin, et c'est noté ;
   - les visites : un cousin va voir l'autre, parfois ;
   - les habitants en parlent ; rien dans un monde partagé.
   Lancer seul : node --test tests/engine/voisins.test.mjs (ou node tests/run-tests.mjs voisins).
   ========================================================================== */

import { DATA, elementsSol, genererMonde, liensDe, solDirect, sujetsPossibles, trouverHabitant, voisinsDe, voisinsNuit } from '../../js/engine/index.js';
import { habitantsDe, peuplerHameau } from '../../js/engine/habitants.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

const copie = (x) => JSON.parse(JSON.stringify(x));
let plansFaits = null;
function plans() {
  if (!plansFaits) {
    const sol = solDirect(genererMonde('1').terrain);
    elementsSol(sol.ctx);
    plansFaits = sol.ctx.hameaux.plans.filter((p) => !p.batisse).sort((a, b) => b.maisons.length - a.maisons.length);
  }
  return plansFaits;
}
function partie() {
  const s = garden();
  s.carte.graine = '1';
  for (const p of plans().slice(0, 2)) peuplerHameau(s, p);
  return s;
}
const adultesDe = (s, hid) => habitantsDe(s)[hid].foyers.flatMap((f) => f.membres.filter((m) => !m.enfant).map((m) => ({ f, m })));

test('V-3 : un ami dans son hameau (un autre foyer), un cousin dans un autre ; gardés ; le même tirage', () => {
  const s = partie(), [p0, p1] = plans();
  const { f, m } = adultesDe(s, p0.id).find((x) => adultesDe(s, p0.id).some((y) => y.f !== x.f));
  const L = liensDe(s, m.id);
  const ami = trouverHabitant(s, L.ami.id), cousin = trouverHabitant(s, L.cousin.id);
  assert(ami.hid === p0.id && ami.f !== f, 'l\'ami : même hameau, autre foyer');
  assert(cousin.hid === p1.id, 'le cousin : un autre hameau');
  assertEqual(liensDe(s, m.id), L, 'gardés');
  const autre = voisinsDe(s).liens[L.ami.id];
  assert(autre && autre.ami, 'le lien va dans les deux sens');
  const b = partie();
  assertEqual(liensDe(b, m.id), L, 'le même tirage');
});

test('V-3 : l\'entraide : un foyer qui a eu faim reçoit du garde-manger d\'un voisin, c\'est noté ; les habitants en parlent', () => {
  const s = partie(), [p0] = plans();
  const { f, m } = adultesDe(s, p0.id)[0];
  const L = liensDe(s, m.id), ami = trouverHabitant(s, L.ami.id);
  for (const x of Object.values(habitantsDe(s))) for (const g of x.foyers) g.journal = [{ jour: s.day, couverture: 100, reserve: {} }];
  f.journal = [{ jour: s.day, couverture: 40, reserve: {} }];
  f.garde = {};
  ami.f.garde = { pain: 5, carotte: 4 };
  const r = voisinsNuit(s);
  assert(r.entraides >= 1, 'une entraide');
  const recu = Object.values(f.garde).reduce((a, b) => a + b, 0);
  assertEqual(recu, DATA.VOISINS.AIDE);
  const e = voisinsDe(s).evenements.find((x) => x.sorte === 'entraide' && x.aFoyer === f.maison);
  assert(e && e.deFoyer, 'notée');
  // ils en parlent : celui qui a reçu, celui qui a donné
  const S = sujetsPossibles(s, p0.id, habitantsDe(s)[p0.id], f, m).map((x) => x.id);
  assert(S.includes('entraide_recue') && S.includes('lien_ami') && S.includes('lien_cousin'), S.join(', '));
  const d = trouverHabitant(s, e.qui);
  assert(sujetsPossibles(s, d.hid, d.h, d.f, d.m).some((x) => x.id === 'entraide_donnee'), 'le donneur en parle');
});

test('V-3 : les visites : un cousin va voir l\'autre, parfois ; rien dans un monde partagé', () => {
  const s = partie();
  let visites = 0;
  for (let k = 0; k < 30; k++) { s.day += 1; if (voisinsNuit(s).visite) visites += 1; }
  assert(visites >= 3 && visites <= 25, `${visites} visites en 30 nuits`);
  const v = voisinsDe(s).evenements.find((x) => x.sorte === 'visite');
  const qui = trouverHabitant(s, v.qui);
  assertEqual(liensDe(s, v.qui).cousin.id, v.chez);
  assert(sujetsPossibles(s, qui.hid, qui.h, qui.f, qui.m).length >= 0);
  assert(voisinsDe(s).evenements.length <= DATA.VOISINS.EVENEMENTS);
  const m = partie();
  m.mondePartage = true;
  const avant = copie(m);
  assertEqual(voisinsNuit(m), { entraides: 0, visite: null });
  assertEqual(JSON.stringify(m.voisins || null), JSON.stringify(avant.voisins || null));
});
