/* ==========================================================================
   Tests du moteur : les habitants des hameaux (fiche 7b : js/engine/habitants.js).
   - les familles : déterministes (la graine du monde, le hameau, la maison), jamais plus de
     membres que de lits, un foyer par maison, des prénoms et des personnages qui ne se répètent
     pas dans un hameau, le métier du hameau pour le premier adulte ;
   - la naissance à la découverte (pas avant), une fois ;
   - la journée d'un foyer : le métier produit, la famille mange (le bonheur de bonheur.js), le
     reste va à la réserve du hameau ; un hameau loin du joueur vit quand même ; le rattrapage ;
   - ce que fait un habitant sous les yeux du joueur compte une fois (le quota, l'arbre pris et
     qui repousse comme les autres) ;
   - la parole, la fiche du hameau ; le coût d'une nuit ;
   - la migration v55 → v56 ; la ferme et la famille du joueur inchangées.
   Lancer seul : node --test tests/engine/habitants.test.mjs (ou node tests/run-tests.mjs habitants).
   ========================================================================== */

import {
  DATA, elementsSol, genererMonde, idObjetMonde, mealHappinessDelta, migrate, objetPris, repousseMonde, runNight, solDirect,
  STATE_VERSION,
} from '../../js/engine/index.js';
import {
  ficheHameau, HABITANTS, habitantAgit, habitantReste, habitantsDe, habitantsNuit, habitantsPourLaCarte, paroleHabitant,
  peuplerHameau,
} from '../../js/engine/habitants.js';
import { voirHameau } from '../../js/engine/monde-hameaux.js';
import { assert, assertEqual, garden, test } from './aide.mjs';

// (la première : celle de garden(), la partie des essais ; une autre, pour comparer)
const GRAINES = ['1', 'habitants-2'];
const plansDe = new Map();
function plans(graine) {
  if (!plansDe.has(graine)) {
    const sol = solDirect(genererMonde(graine).terrain);
    elementsSol(sol.ctx);
    plansDe.set(graine, sol.ctx.hameaux.plans);
  }
  return plansDe.get(graine);
}
// Une partie sur le monde de `graine` (celui de garden(), ou un autre : sa ferme ne sert pas).
function partieSur(graine) {
  const s = garden();
  s.carte.graine = graine;
  return s;
}
// Un petit hameau fait à la main : `lits` lits par maison, un métier.
function hameauEssai(metier, lits = [['lit_adulte']], o = {}) {
  return {
    id: 'hameau_essai', nom: 'Le Hameau d\'Essai', metier, style: o.style || 'prairie', case: 0,
    maisons: lits.map((l, k) => ({ id: `hameau_essai_maison_${k + 1}`, lits: l.map((sorte, q) => ({ case: q, sorte })) })),
    jardins: o.jardins || [], travail: o.travail || [], place: { cases: [] },
  };
}
const copie = (x) => JSON.parse(JSON.stringify(x));

/* ---------- les familles ---------- */

test('les habitants : des familles déterministes, pas plus nombreuses que les lits, un foyer par maison', () => {
  for (const graine of GRAINES) {
    const a = partieSur(graine), b = partieSur(graine);
    for (const p of plans(graine)) { peuplerHameau(a, p); peuplerHameau(b, p); }
    assertEqual(copie(habitantsDe(a)), copie(habitantsDe(b)), `${graine} : le même tirage`);
    for (const p of plans(graine)) {
      const h = habitantsDe(a)[p.id];
      assertEqual(h.foyers.map((f) => f.maison), p.maisons.map((m) => m.id), 'un foyer par maison, dans l\'ordre');
      assertEqual(h.metier, p.metier);
      const prenoms = new Set(), persos = new Set();
      for (const f of h.foyers) {
        const mz = p.maisons.find((m) => m.id === f.maison);
        const adultes = f.membres.filter((m) => !m.enfant), enfants = f.membres.filter((m) => m.enfant);
        assert(f.membres.length <= Math.max(1, mz.lits.length), `${f.maison} : ${f.membres.length} membres pour ${mz.lits.length} lits`);
        assert(adultes.length >= HABITANTS.ADULTES[0] && adultes.length <= HABITANTS.ADULTES[1], 'un ou deux adultes');
        assert(enfants.length <= HABITANTS.ENFANTS[1], 'trois enfants au plus');
        assertEqual(adultes[0].metier, p.metier, 'le premier adulte fait le métier du hameau');
        assert(!adultes[1] || adultes[1].metier === null || HABITANTS.METIERS[adultes[1].metier], 'le second : un métier ou le jardin');
        const litsPris = f.membres.map((m) => m.lit).filter((l) => l !== null);
        assertEqual(new Set(litsPris).size, litsPris.length, 'chacun son lit');
        for (const m of adultes) if (m.lit !== null && mz.lits.filter((l) => l.sorte === 'lit_adulte').length >= adultes.length) assertEqual(mz.lits[m.lit].sorte, 'lit_adulte', 'un adulte dans un lit d\'adulte');
        for (const m of f.membres) {
          assert(!prenoms.has(m.prenom), `${p.id} : ${m.prenom} deux fois`);
          prenoms.add(m.prenom);
          const cle = (m.enfant ? 'e' : 'a') + m.perso;
          assert(!persos.has(cle), `${p.id} : le personnage ${cle} deux fois`);
          persos.add(cle);
          assert(HABITANTS.PERSOS[m.enfant ? 'enfant' : 'adulte'][m.genre].includes(m.perso), 'un personnage de son âge et de son genre');
        }
      }
    }
  }
  // deux mondes, d'autres familles
  const a = partieSur(GRAINES[0]), b = partieSur(GRAINES[1]);
  peuplerHameau(a, plans(GRAINES[0])[0]);
  peuplerHameau(b, plans(GRAINES[1])[0]);
  assert(JSON.stringify(habitantsDe(a).hameau_1.foyers) !== JSON.stringify(habitantsDe(b).hameau_1.foyers), 'deux mondes, deux tirages');
});

test('les habitants : ils naissent à la découverte du hameau, une fois, sans toucher au hasard de la partie', () => {
  const s = partieSur(GRAINES[0]), p = plans(GRAINES[0])[0];
  assertEqual(habitantsDe(s), {}, 'pas d\'habitants avant');
  assertEqual(s.monde.habitants, {}, 'une partie neuve : state.monde.habitants');
  voirHameau(s, p);
  const graine = s.rngSeed;
  const h = peuplerHameau(s, p);
  assert(h && h.foyers.length === p.maisons.length, 'nés');
  assertEqual(h.jour, s.day);
  h.foyers[0].bourse = 7;
  assert(peuplerHameau(s, p) === h && h.foyers[0].bourse === 7, 'une seconde fois : les mêmes, rien n\'est retiré');
  assertEqual(s.rngSeed, graine, 'le hasard de la partie ne bouge pas');
  // le modèle de la carte
  const c = habitantsPourLaCarte(s)[p.id];
  assertEqual(c.foyers.length, p.maisons.length);
  assert(c.foyers.every((f) => f.membres.every((m) => Number.isInteger(m.perso) && 'lit' in m)), 'leur personnage, leur lit');
});

/* ---------- la journée ---------- */

test('les habitants : la journée d\'un foyer (le métier, le jardin, le repas, le bonheur, la réserve)', () => {
  const s = garden(), g0 = s.rngSeed;
  const h = peuplerHameau(s, hameauEssai('pecheur', [['lit_adulte', 'lit_adulte', 'lit_enfant', 'lit_enfant']], { jardins: [{ genre: 'potager' }, { genre: 'verger' }], travail: [{ genre: 'poulailler', case: 1 }] }));
  const f = h.foyers[0];
  const r = habitantsNuit(s);
  assertEqual(r.foyers, 1, 'un foyer a vécu');
  const J = f.journal[0];
  assertEqual(J.jour, s.day);
  assertEqual(f.jour, s.day);
  const poissons = Object.keys(HABITANTS.METIERS.pecheur.une_de.riviere);
  assert(Object.keys(J.produit).some((x) => poissons.includes(x)), `le pêcheur a pêché (${JSON.stringify(J.produit)})`);
  assert(Object.keys(J.jardin).some((x) => HABITANTS.JARDIN.LEGUMES[x]), 'le jardin a donné');
  assert(J.couverture >= 0 && J.couverture <= 100);
  assertEqual(J.bonheur, mealHappinessDelta({ mange: J.mange, couverture: J.couverture }), 'le bonheur suit les règles de la famille');
  assertEqual(f.bonheur, Math.max(0, Math.min(DATA.BONHEUR.MAX, DATA.BONHEUR.DEPART + J.bonheur)));
  for (const [it, n] of Object.entries(f.garde)) assert(n <= HABITANTS.GARDE && DATA.OBJETS[it].mangeable, `le garde-manger garde ${HABITANTS.GARDE} aliments (${it} : ${n})`);
  for (const [it, n] of Object.entries(J.reserve)) assertEqual(h.reserve[it], n, `${it} : à la réserve`);
  assertEqual(s.rngSeed, g0, 'le hasard de la partie ne bouge pas');
  // la même journée, ailleurs : le même résultat
  const s2 = garden();
  peuplerHameau(s2, hameauEssai('pecheur', [['lit_adulte', 'lit_adulte', 'lit_enfant', 'lit_enfant']], { jardins: [{ genre: 'potager' }, { genre: 'verger' }], travail: [{ genre: 'poulailler', case: 1 }] }));
  habitantsNuit(s2);
  assertEqual(copie(habitantsDe(s2)), copie(habitantsDe(s)), 'déterministe');
  // une seconde fois la même nuit : rien
  assertEqual(habitantsNuit(s).foyers, 0, 'une journée par jour');
  // un métier qui ne se mange pas (le bûcheron) : son bois va à la réserve
  const s3 = garden();
  const h3 = peuplerHameau(s3, hameauEssai('bucheron'));
  habitantsNuit(s3);
  assert(h3.reserve.bois > 0 && !h3.foyers[0].garde.bois, `le bois à la réserve (${JSON.stringify(h3.reserve)})`);
  // la réserve grandit d'un jour à l'autre
  const avant = h3.reserve.bois;
  s3.day++;
  habitantsNuit(s3);
  assert(h3.reserve.bois > avant, 'elle grandit');
});

test('les habitants : un hameau loin du joueur vit quand même ; les journées manquées se rattrapent (au plus RATTRAPAGE)', () => {
  const s = partieSur(GRAINES[0]), p = plans(GRAINES[0])[0];
  peuplerHameau(s, p);
  // (le personnage reste à la ferme, loin du hameau : aucune carte ne le montre)
  const jour = s.day;
  runNight(s);
  const h = habitantsDe(s)[p.id];
  assert(h.foyers.every((f) => f.journal.length === 1 && f.journal[0].jour === jour), 'chaque foyer a vécu sa journée');
  // dix jours sans nuit (une partie rouverte) : RATTRAPAGE journées au plus
  for (const f of h.foyers) f.jour = s.day - 11;
  habitantsNuit(s);
  assert(h.foyers.every((f) => f.jour === s.day), 'à jour');
  assertEqual(h.foyers[0].journal.length, Math.min(HABITANTS.JOURNAL, 1 + HABITANTS.RATTRAPAGE), 'le journal garde les derniers jours');
});

/* ---------- sous les yeux du joueur ---------- */

test('les habitants : un geste fait sous les yeux du joueur compte une fois ; l\'arbre abattu suit les règles de la 6a', () => {
  const s = garden();
  const h = peuplerHameau(s, hameauEssai('bucheron'));
  const f = h.foyers[0], m = f.membres[0];
  const quota = HABITANTS.METIERS.bucheron.ACTIONS;
  assertEqual(habitantReste(s, 'hameau_essai', m.id), quota);
  // un arbre du monde (son identifiant : sa sorte, son pied)
  const arbre = idObjetMonde('sapin', 4100, 3300);
  const r1 = habitantAgit(s, 'hameau_essai', m.id, 'couper', arbre);
  assert(r1.ok && r1.items.bois > 0, 'abattu : du bois au garde-manger');
  assert(objetPris(s, arbre), 'l\'arbre est pris');
  const retour = s.monde.pris[arbre].retour;
  const r2 = habitantAgit(s, 'hameau_essai', m.id, 'couper', arbre);
  assert(!r2.ok, 'le même arbre ne compte pas deux fois');
  assert(!habitantAgit(s, 'hameau_essai', m.id, 'pecher').ok, 'pas un geste de son métier');
  for (let k = 1; k < quota; k++) assert(habitantAgit(s, 'hameau_essai', m.id, 'couper').ok, `action ${k + 1}`);
  const fin = habitantAgit(s, 'hameau_essai', m.id, 'couper');
  assert(!fin.ok && fin.fini, 'sa journée est faite');
  assertEqual(habitantReste(s, 'hameau_essai', m.id), 0);
  const vus = copie(f.vus.items);
  habitantsNuit(s);
  assertEqual(f.journal[0].produit, vus, 'la nuit ne refait pas ce qu\'il a fait sous les yeux du joueur');
  assertEqual(f.journal[0].vus, quota);
  assertEqual(f.vus, null, 'oublié après la nuit');
  // l'arbre repousse comme les autres (sa région vue, son jour venu)
  s.day = retour;
  s.monde.ici = -1;
  assert(repousseMonde(s).includes(arbre), 'il repousse');
  // un enfant ne travaille pas
  const s2 = garden();
  const h2 = peuplerHameau(s2, hameauEssai('mineur', [['lit_adulte', 'lit_enfant', 'lit_enfant', 'lit_enfant']]));
  const enfant = h2.foyers[0].membres.find((x) => x.enfant);
  if (enfant) assert(!habitantAgit(s2, 'hameau_essai', enfant.id, 'piocher').ok, 'pas un enfant');
});

/* ---------- la parole, la fiche, le coût ---------- */

test('les habitants : la parole et la fiche du hameau', () => {
  const s = partieSur(GRAINES[0]), p = plans(GRAINES[0])[0];
  const h = peuplerHameau(s, p);
  const m = h.foyers[0].membres[0];
  const r = paroleHabitant(s, p.id, m.id, { heure: 9, activite: 'travail', n: 0 });
  assertEqual(r.prenom, m.prenom);
  assertEqual(r.metier, HABITANTS.METIERS[p.metier].nom[m.genre]);
  assert(r.texte.length > 10, 'une phrase');
  assert(HABITANTS.PHRASES.salut.matin.some((x) => r.texte.startsWith(x)), 'le salut du matin');
  assert(paroleHabitant(s, p.id, m.id, { heure: 23, activite: 'dort' }).texte.startsWith('('), 'il dort');
  assertEqual(paroleHabitant(s, p.id, 'personne', {}), null);
  s.day++;
  habitantsNuit(s);
  const fi = ficheHameau(s, p.id);
  assertEqual(fi.familles.length, p.maisons.length);
  assertEqual(fi.familles.reduce((t, x) => t + x.membres.length, 0), h.foyers.reduce((t, x) => t + x.membres.length, 0));
  assert(fi.reserve.length > 0 && fi.reserve.every(([, n]) => n > 0), 'sa réserve');
  for (const [it, n] of Object.entries(fi.hier)) assert(n <= h.reserve[it], `${it} : entré la dernière nuit`);
  assertEqual(ficheHameau(s, 'nulle_part'), null);
});

test('les habitants : une nuit coûte peu (tous les hameaux d\'un monde peuplés)', () => {
  const s = partieSur(GRAINES[1]);
  for (const p of plans(GRAINES[1])) peuplerHameau(s, p);
  const n = Object.values(habitantsDe(s)).reduce((t, h) => t + h.foyers.length, 0);
  assert(n >= 15, `des dizaines de foyers (${n})`);
  habitantsNuit(s);
  const t0 = performance.now();
  for (let k = 0; k < 10; k++) { s.day++; habitantsNuit(s); }
  const ms = (performance.now() - t0) / 10;
  assert(ms < 25, `une nuit : ${ms.toFixed(2)} ms pour ${n} foyers`);
});

/* ---------- la sauvegarde, la ferme ---------- */

test('migration v55 → v56 : pas encore d\'habitants, rien d\'autre ne change', () => {
  // (puis v56 → v57 : la calèche, tests/engine/caleche.test.mjs)
  const s = garden();
  const { habitants, ...monde55 } = s.monde;
  const v55 = copie({ ...s, monde: { ...monde55, hameaux: { hameau_2: { nom: 'Les Saules', style: 'marais', jour: 1 } } }, version: 55 });
  const m = migrate({ v: 55, t: 0, s: v55 });
  assertEqual(m.version, STATE_VERSION);
  // (le vu : refait par la migration v57 → v58, la ferme et sa prairie d'une partie d'avant la fiche 8)
  assertEqual({ ...m.monde, vu: undefined }, { ...v55.monde, habitants: {}, vu: undefined });
  const { monde: a, version: va, ...ra } = m, { monde: b, version: vb, ...rb } = v55;
  assertEqual(ra, rb, 'le reste ne change pas');
  // la sauvegarde garde les habitants
  const s2 = partieSur(GRAINES[0]);
  peuplerHameau(s2, plans(GRAINES[0])[0]);
  habitantsNuit(s2);
  const m2 = migrate({ v: STATE_VERSION, t: 0, s: copie(s2) });
  assertEqual(m2.monde.habitants, copie(s2.monde.habitants));
});

test('les habitants : la ferme et la famille du joueur ne changent pas', () => {
  const a = partieSur(GRAINES[0]), b = partieSur(GRAINES[0]);
  for (const p of plans(GRAINES[0])) peuplerHameau(b, p);
  for (let k = 0; k < 3; k++) { runNight(a); runNight(b); }
  const sans = (s) => { const c = copie(s); delete c.monde.habitants; return c; };
  assertEqual(sans(b), sans(a), 'tout le reste est pareil');
  assert(Object.values(habitantsDe(b)).every((h) => h.foyers.every((f) => f.journal.length === 3)), 'les habitants ont vécu trois jours');
});
