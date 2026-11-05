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

test('V-2 : pas de demande sans hameau visité ; au plus MAX ouvertes ; un besoin de son métier ; il la dit', () => {
  const sans = partie(false);
  eq(nuits(sans, 20).length, 0, 'aucun hameau visité');
  const s = partie();
  const faites = nuits(s, 30);
  assert(faites.length >= D.MAX, `${faites.length} demandes en 30 nuits`);
  assert(demandesOuvertes(s).length <= D.MAX, 'au plus MAX ouvertes');
  for (const d of faites) {
    assert(D.BESOINS[d.metier].some(([it]) => it === d.objet), `${d.objet} : un besoin de ${d.metier}`);
    eq(d.fin - d.jour + 1, D.DUREE);
  }
  const d = demandesOuvertes(s)[0];
  const r = paroleHabitant(s, d.hameau, d.membre, { heure: 10, activite: 'maison', n: 0 });
  eq(r.demande, d.id);
  assert(r.texte.includes(String(d.n)) && r.texte.includes(DATA.OBJETS[d.objet].nom) && !/[{}]/.test(r.texte), r.texte);
  // le même tirage dans la même partie
  const a = partie(), b = partie();
  eq(nuits(a, 15).map((x) => [x.membre, x.objet, x.n]), nuits(b, 15).map((x) => [x.membre, x.objet, x.n]));
});
function eq(x, y, m) { assertEqual(x, y, m); }

test('V-2 : rendre une demande : les objets partent, l\'amitié monte, un présent de son métier ; pas deux fois', () => {
  const s = partie();
  nuits(s, 30);
  const d = demandesOuvertes(s)[0];
  const t = trouverPnj(s, d.hameau, d.membre), cle = cleDe(t.m);
  s.inventaire = {};
  eq(rendreDemande(s, d.id).ok, false, 'sans les objets');
  addItem(s, d.objet, d.n + 2);
  const avant = pointsAmitie(s, cle), inv = copie(s.inventaire);
  const r = rendreDemande(s, d.id);
  assert(r.ok, r.error);
  eq(pointsAmitie(s, cle) - avant, D.AMITIE);
  if (r.cadeau) assert(Object.keys(DATA.AMITIE.RETOUR.PRESENTS[d.metier]).includes(r.cadeau.item), 'un présent de son métier');
  assert(countItem(s, d.objet) <= 2 + (r.cadeau && r.cadeau.item === d.objet ? r.cadeau.n : 0), 'les objets donnés');
  assert(!/[{}]/.test(r.merci), r.merci);
  eq([demandeDe(s, d.membre), demandesDe(s).faites, rendreDemande(s, d.id).ok], [null, 1, false]);
  assert(JSON.stringify(inv) !== JSON.stringify(s.inventaire));
});

test('V-2 : une demande pas faite s\'oublie, sans rien coûter ; rien dans un monde partagé', () => {
  const s = partie();
  nuits(s, 30);
  const d = demandesOuvertes(s)[0];
  const cle = cleDe(trouverPnj(s, d.hameau, d.membre).m), pts = pointsAmitie(s, cle);
  s.day = d.fin + 1;
  demandesNuit(s);
  eq([demandesDe(s).liste.some((x) => x.id === d.id), pointsAmitie(s, cle)], [false, pts], 'oubliée, l\'amitié intacte');
  const m = partie();
  m.mondePartage = true;
  eq(nuits(m, 20).length, 0);
});
