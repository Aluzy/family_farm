/* ==========================================================================
   Tests du moteur : la calèche (fiche 7c : js/engine/caleche.js), le Marché devenu voyageur.
   - la tournée : déterministe, la même que celle du Web Worker (les éléments du sol), sur les
     chemins à toute heure, à la ferme chaque jour à FERME h, à chaque hameau une fois par jour, au
     gîte la nuit ; les retenues (hélée, retenue par le commerce) la décalent, dans la limite du jour ;
   - le commerce : vendre une récolte et acheter des semences quand elle est arrêtée à côté ; pas
     quand elle est loin, qu'elle roule (sans la héler) ou qu'elle dort ; elle ne vend que les
     semences et ce que son coffre porte des hameaux ;
   - les arrêts aux hameaux : la réserve achetée, les bourses des foyers payées, le coffre rempli
     puis écoulé chaque matin ; le rattrapage après une absence ;
   - l'Atelier : chaque objet que vendait le Marché (outils, animaux, cheval, meubles, la ruche, le
     bac à fleurs) a sa recette ; une poule et un meuble se fabriquent ;
   - le joueur automatique sur quelques semaines ; la migration v56 → v57.
   Lancer seul : node --test tests/engine/caleche.test.mjs (ou node tests/run-tests.mjs caleche).
   ========================================================================== */

import {
  absoluteHours, craft, DATA, elementsSol, genererMonde, migrate, simulateGame, solDirect, STATE_VERSION,
} from '../../js/engine/index.js';
import {
  acheterCaleche, acheterReserve, CALECHE, calecheIci, etalCaleche, etatCaleche, heler, horaireCaleche, majCaleche,
  ouEstCaleche, poserTournee, prixCoffre, retenir, tourneeDe, tourneeDuMonde, tourneeDuPlan, vendreCaleche,
} from '../../js/engine/caleche.js';
import { peuplerHameau, habitantsDe } from '../../js/engine/habitants.js';
import { voirHameau } from '../../js/engine/monde-hameaux.js';
import { addItem, countItem } from '../../js/engine/inventory.js';
import { assert, assertEqual, garden, ranch, reach, setInv, test, tireless } from './aide.mjs';

const GRAINES = ['1', 'caleche-2'];
const copie = (x) => JSON.parse(JSON.stringify(x));
// L'heure `h` du jour en cours (l'éveil commence à 6 h).
const aLHeure = (s, h) => { s.awakeMs = Math.round((h - DATA.TEMPS.HEURE_REVEIL) * DATA.TEMPS.SECONDES_PAR_HEURE * 1000); return s; };
// La case du monde la plus proche du point (x, y) en tuiles.
const caseDe = (tour, x, y) => Math.floor(y) * tour.W + Math.floor(x);
const ferme = (tour) => tour.arrets[0];
const pointDe = (tour, a) => ({ x: tour.x[a.k], y: tour.y[a.k] });

/* ---------- la tournée ---------- */

test('la tournée : déterministe, la même que celle du Web Worker, sur les chemins du plan', () => {
  for (const g of GRAINES) {
    const a = tourneeDuMonde(g);
    const sol = solDirect(genererMonde(g).terrain), el = elementsSol(sol.ctx), cadre = sol.ctx.cadre;
    const b = tourneeDuPlan({ W: cadre.LARGEUR, chemins: el.chemins, hameaux: el.lieux.hameaux, sortie: cadre.SORTIE, ferme: cadre.FERME });
    assertEqual(copie(b), copie(a), `${g} : le Worker et le moteur tirent la même tournée`);
    assertEqual(a.arrets.length, el.lieux.hameaux.length + 1, 'un arrêt par hameau, et la ferme');
    assertEqual([a.arrets[0].sorte, a.arrets[0].arrivee], ['ferme', 0], 'le tour part de la ferme');
    assert(a.v >= CALECHE.VITESSE - 1e-9, 'au moins VITESSE tuiles par heure');
    assert(a.D - CALECHE.ARRET <= CALECHE.JOURNEE + 1e-6 || a.v === CALECHE.VITESSE, 'le tour tient dans la journée');
    // chaque point du tour est à deux tuiles au plus d'une case d'un chemin (le fil lissé)
    const W = cadre.LARGEUR, sur = new Set(el.chemins.flat());
    let loin = 0;
    for (let k = 0; k < a.x.length; k += 3) {
      const c = Math.floor(a.x[k]), r = Math.floor(a.y[k]);
      let ok = false;
      for (let dy = -2; dy <= 2 && !ok; dy++) for (let dx = -2; dx <= 2 && !ok; dx++) ok = sur.has((r + dy) * W + c + dx);
      if (!ok) loin++;
    }
    assert(loin <= a.x.length / 3 * 0.01, `${g} : ${loin} points loin des chemins`);
    // la ferme : son arrêt, devant la sortie
    const f = pointDe(a, ferme(a)), sx = cadre.SORTIE % W, sy = Math.floor(cadre.SORTIE / W);
    assert(Math.hypot(f.x - sx, f.y - sy) < 4, 'l\'arrêt de la ferme est devant sa sortie');
  }
});

test('la tournée : à toute heure sur le tour ; à la ferme chaque jour à FERME h ; au gîte la nuit ; chaque hameau une fois', () => {
  for (const g of GRAINES) {
    const T = tourneeDuMonde(g), F = ferme(T);
    for (const jour of [1, 2, 7]) {
      const j0 = (jour - 1) * 24;
      // à la ferme de FERME à FERME + ARRET_FERME
      for (const h of [CALECHE.FERME, CALECHE.FERME + CALECHE.ARRET_FERME / 2, CALECHE.FERME + CALECHE.ARRET_FERME - 0.01]) {
        const e = etatCaleche(T, j0 + h);
        assertEqual([e.etat, e.arret.id], ['arret', 'ferme'], `${g}, jour ${jour}, ${h} h`);
        assert(Math.hypot(e.x - T.x[F.k], e.y - T.y[F.k]) < 1e-6);
      }
      assertEqual(etatCaleche(T, j0 + CALECHE.FERME - 0.05).etat, 'route', 'elle arrive');
      assertEqual(etatCaleche(T, j0 + CALECHE.FERME + CALECHE.ARRET_FERME + 0.05).etat, 'route', 'elle repart');
      // la nuit, au gîte
      for (const h of [1, 4, 23.9]) {
        const e = etatCaleche(T, j0 + h);
        assertEqual([e.etat, e.arret.id], ['gite', T.arrets[T.gite].id], `${g} à ${h} h : au gîte`);
      }
      // chaque hameau : une fois par jour
      const vus = new Map();
      for (let m = 0; m < 24 * 60; m += 5) {
        const e = etatCaleche(T, j0 + m / 60);
        assert(Number.isFinite(e.x) && Number.isFinite(e.y), 'une position');
        // (le gîte : elle y arrive le soir et y dort)
        if ((e.etat === 'arret' || e.etat === 'gite') && e.arret.sorte === 'hameau') vus.set(e.arret.id, (vus.get(e.arret.id) || new Set()).add(Math.floor(m / 60 / 0.5)));
      }
      assertEqual(vus.size, T.arrets.length - 1, `${g} : tous les hameaux dans la journée`);
    }
    // le même endroit à la même heure, d'un jour à l'autre (rien n'est simulé pas à pas)
    const ici = (e) => [e.etat, e.vue, Math.round(e.x * 1000), Math.round(e.y * 1000)];
    assertEqual(ici(etatCaleche(T, 15.3)), ici(etatCaleche(T, 24 * 9 + 15.3)));
  }
  assertEqual(horaireCaleche(), `La calèche passe à la ferme vers ${CALECHE.FERME} h et y reste une heure.`);
});

test('la tournée : une retenue la décale, dans la limite du jour', () => {
  const T = tourneeDuMonde('1');
  const H = 12.2, avant = etatCaleche(T, H);
  assertEqual(avant.etat, 'route');
  const haltes = [{ debut: H, fin: H + 1 }];
  const pendant = etatCaleche(T, H + 0.5, haltes);
  assertEqual([pendant.etat, pendant.x, pendant.y], ['halte', avant.x, avant.y], 'elle attend où on l\'a hélée');
  assertEqual(copie(etatCaleche(T, H + 2, haltes)).dist, copie(etatCaleche(T, H + 1)).dist, 'puis repart avec une heure de retard');
  assertEqual(copie(etatCaleche(T, 24 + H, haltes)), copie(etatCaleche(T, 24 + H)), 'le lendemain, à l\'heure');
});

/* ---------- le commerce ---------- */

// Une partie sur le monde `g`, au niveau du Marché, sa tournée posée.
function partieSur(g = '1') {
  const s = reach(garden(), 'marche');
  s.carte.graine = g;
  tireless(s);
  tourneeDuMonde(g);
  return s;
}

test('le commerce : à la ferme à l\'heure, on vend une récolte et on achète des graines ; pas quand elle est loin', () => {
  const s = partieSur('1'), T = tourneeDe(s), F = ferme(T), ici = caseDe(T, T.x[F.k], T.y[F.k]);
  setInv(s, { carotte: 10 });
  s.pieces = 100;
  aLHeure(s, CALECHE.FERME + 0.3);
  assert(calecheIci(s, ici).ok, 'elle est là');
  assertEqual(ouEstCaleche(s), 'Elle est arrêtée à la ferme.');
  const v = vendreCaleche(s, 'carotte', 4, ici);
  assertEqual([v.ok, v.gain, countItem(s, 'carotte')], [true, 4 * DATA.OBJETS.carotte.prix, 6], 'au prix de vente du Marché');
  assertEqual(s.recit.faits['vente.caleche'][2], 1, 'le récit note la vente (Achille s\'en souvient)');
  const a = acheterCaleche(s, 'graine_carotte', 2, ici);
  assert(a.ok && countItem(s, 'graine_carotte') >= 2, 'des graines');
  assertEqual(acheterCaleche(s, 'carotte', 1, ici).ok, false, 'elle ne vend pas de carottes (son coffre n\'en a pas)');
  assertEqual(acheterCaleche(s, 'meuble_chaise', 1, ici).ok, false, 'ni de meubles');
  assertEqual(s.caleche.jour.vendu, v.gain);
  // le commerce la retient : elle attend
  assert(retenir(s, ici));
  assert(s.caleche.haltes.length === 1, 'une retenue');
  // loin d'elle (à l'autre bout de la ferme) : rien
  const loin = ici - 30;
  assertEqual(vendreCaleche(s, 'carotte', 1, loin).ok, false);
  assert(/n'est pas là/.test(calecheIci(s, loin).raison));
  // à une autre heure : elle n'est plus là
  aLHeure(s, CALECHE.FERME + 4);
  assertEqual(calecheIci(s, ici).ok, false, 'partie');
  // la nuit, au gîte : le cocher dort
  const G = T.arrets[T.gite], gite = caseDe(T, T.x[G.k], T.y[G.k]);
  aLHeure(s, 22.5);
  assert(/dort/.test(calecheIci(s, gite).raison));
  // avant le niveau du Marché : elle ne commerce pas
  const t = partieSur('1');
  t.progression.niveau = 1;
  aLHeure(t, CALECHE.FERME + 0.3);
  assertEqual(calecheIci(t, ici).ok, false);
});

test('héler : sur un chemin, à côté d\'elle, elle s\'arrête un moment ; trop loin, non', () => {
  const s = partieSur('1'), T = tourneeDe(s);
  setInv(s, { carotte: 5 });
  aLHeure(s, 13.1);
  const e = etatCaleche(T, absoluteHours(s), s.caleche.haltes);
  assertEqual(e.etat, 'route');
  const ici = caseDe(T, e.x + 1, e.y);
  assertEqual(vendreCaleche(s, 'carotte', 1, ici).ok, false, 'elle roule');
  assertEqual(heler(s, ici + 40).ok, false, 'trop loin');
  const r = heler(s, ici);
  assert(r.ok && !r.deja, 'hélée');
  assertEqual(r.e.etat, 'halte');
  assertEqual(vendreCaleche(s, 'carotte', 1, ici).ok, true, 'elle s\'est arrêtée');
  // elle repart après RETENUE h, prolongée par le commerce, au plus RETENUE_MAX par jour
  for (let k = 0; k < 20; k++) retenir(s, ici);
  const total = s.caleche.haltes.reduce((n, h) => n + h.fin - h.debut, 0);
  assert(total <= CALECHE.RETENUE_MAX + 1e-9, `${total} h de retenue au plus`);
  s.awakeMs += (CALECHE.RETENUE_MAX + 0.1) * DATA.TEMPS.SECONDES_PAR_HEURE * 1000;
  assertEqual(calecheMaintenantEtat(s), 'route', 'elle a repris la route');
});
const calecheMaintenantEtat = (s) => etatCaleche(tourneeDe(s), absoluteHours(s), s.caleche.haltes).etat;

/* ---------- les arrêts aux hameaux ---------- */

function plansDe(g) {
  const sol = solDirect(genererMonde(g).terrain);
  elementsSol(sol.ctx);
  return sol.ctx.hameaux.plans;
}

test('les hameaux : elle achète leur réserve à son arrêt, paie les foyers, et revend ce qu\'elle porte', () => {
  const s = partieSur('1'), T = tourneeDe(s);
  const plans = plansDe('1');
  for (const p of plans) { voirHameau(s, p); peuplerHameau(s, p); }
  const A = T.arrets.find((a) => a.sorte === 'hameau' && a.arrivee < T.soir);
  const h = habitantsDe(s)[A.id];
  h.reserve = { bois: 30, poisson: 5, carotte: 3 };
  const bourses = h.foyers.reduce((n, f) => n + f.bourse, 0);
  // avant son arrêt : rien
  aLHeure(s, CALECHE.FERME + A.arrivee - 0.2);
  majCaleche(s);
  assertEqual(h.reserve.bois, 30);
  aLHeure(s, CALECHE.FERME + A.arrivee + 0.1);
  s.monde.hameaux[A.id].nom = 'Les Saules';
  assertEqual(ouEstCaleche(s), 'Elle est arrêtée aux Saules.');
  s.monde.hameaux[A.id].nom = 'Le Gué';
  assertEqual(ouEstCaleche(s), 'Elle est arrêtée au Gué.');
  const faits = majCaleche(s);
  assertEqual(faits.map((f) => f.id), [A.id], 'son arrêt');
  const pris = Math.min(CALECHE.PRIS, 30);
  assertEqual([h.reserve.bois, h.reserve.poisson || 0, h.reserve.carotte || 0], [30 - pris, 0, 0], 'la réserve baisse');
  const paye = pris * Math.max(1, Math.floor(DATA.OBJETS.bois.prix * CALECHE.ACHAT_HAMEAU / 100))
    + 5 * Math.max(1, Math.floor(DATA.OBJETS.poisson.prix * CALECHE.ACHAT_HAMEAU / 100))
    + 3 * Math.max(1, Math.floor(DATA.OBJETS.carotte.prix * CALECHE.ACHAT_HAMEAU / 100));
  assertEqual(h.foyers.reduce((n, f) => n + f.bourse, 0), bourses + paye, 'les bourses montent');
  assertEqual(h.caleche.pieces, paye);
  assertEqual(s.caleche.coffre, { bois: pris, carotte: 3, poisson: 5 });
  assertEqual(majCaleche(s), [], 'pas deux fois');
  // elle ne vend que les semences et son coffre
  const etal = etalCaleche(s);
  assert(etal.every((o) => o.sorte === 'coffre' || DATA.OBJETS[o.item].categorie === 'graine' || o.item === 'ble' || DATA.CULTURES[o.item]), 'des semences et son coffre');
  assertEqual(etal.filter((o) => o.sorte === 'coffre').map((o) => o.item), ['bois', 'carotte', 'poisson']);
  // à la ferme le lendemain : du bois et du poisson d'un hameau (la moitié a été vendue en route)
  s.day += 1;
  aLHeure(s, CALECHE.FERME + 0.2);
  majCaleche(s);
  const F = ferme(T), ici = caseDe(T, T.x[F.k], T.y[F.k]);
  assertEqual(s.caleche.coffre.bois, Math.floor(pris * CALECHE.GARDE / 100), 'écoulé en route');
  s.pieces = 200;
  const avant = countItem(s, 'bois');
  const b = acheterCaleche(s, 'bois', 3, ici);
  assertEqual([b.ok, b.cost, countItem(s, 'bois') - avant], [true, 3 * prixCoffre('bois'), 3]);
  assert(prixCoffre('poisson') > DATA.OBJETS.poisson.prix, 'plus cher qu\'il ne s\'achète');
  assert(acheterCaleche(s, 'poisson', 1, ici).ok, 'du poisson du hameau');
  // un hameau pas encore peuplé : rien à acheter
  assertEqual(acheterReserve(s, 'hameau_inconnu'), null);
});

test('les hameaux : après une absence, au plus RATTRAPAGE jours d\'arrêts', () => {
  const s = partieSur('1');
  for (const p of plansDe('1')) { voirHameau(s, p); peuplerHameau(s, p); }
  for (const h of Object.values(habitantsDe(s))) h.reserve = { pierre: 200 };
  aLHeure(s, 8);
  majCaleche(s);
  s.day += 10;
  const faits = majCaleche(s);
  const n = tourneeDe(s).arrets.length - 1;
  assert(faits.length <= (CALECHE.RATTRAPAGE + 1) * n && faits.length >= CALECHE.RATTRAPAGE * n - n, `${faits.length} arrêts rattrapés`);
  assert(Object.values(s.caleche.coffre).every((k) => k <= CALECHE.COFFRE_MAX), 'le coffre plafonne');
});

/* ---------- l'Atelier ---------- */

test('l\'Atelier : chaque objet que vendait le Marché a sa recette (sauf les meubles)', () => {
  const R = Object.values(DATA.ATELIER.RECETTES);
  for (const o of ['houe', 'hache', 'pioche', 'faux', 'canne', 'triporteur']) assert(R.some((r) => r.outil === o), `l'outil ${o}`);
  for (const a of ['poule', 'mouton', 'vache']) assert(R.some((r) => r.animal === a), `l'animal ${a}`);
  assert(R.some((r) => r.cheval), 'le cheval');
  // (le récit, lot 7 : les meubles ne se fabriquent plus, ils s'achètent dans les hameaux, ile.test.mjs)
  for (const m of Object.keys(DATA.MEUBLES)) assert(!R.some((r) => r.meuble === m), `le meuble ${m} ne se fabrique plus`);
  for (const d of [...Object.keys(DATA.DEHORS || {}), DATA.RUCHE.OBJET]) assert(R.some((r) => r.sortie && r.sortie[d]), `${d}`);
  // les aliments ne s'achètent plus : ils se cultivent, se cuisinent, ou viennent des hameaux (le coffre)
  for (const [id, def] of Object.entries(DATA.OBJETS)) {
    if (def.categorie === 'plat' || def.categorie === 'légume' || def.categorie === 'fruit') {
      const s = partieSur('1');
      assert(etalCaleche(s).every((o) => o.item !== id) || DATA.CULTURES[id], `${id} n'est pas en vente`);
    }
  }
});

test('l\'Atelier : une poule s\'attire (sans pièces), un meuble ne se fabrique plus', () => {
  const s = ranch();
  s.carte.graine = '1';
  tireless(s);
  s.atelier = { construit: true, niveau: 1 };
  const pieces = s.pieces;
  setInv(s, DATA.ATELIER.RECETTES.nid_poule.entrees);
  const avant = s.poulailler.poules;
  const r = craft(s, 'nid_poule');
  assert(r.ok, r.error);
  assertEqual([s.poulailler.poules, s.pieces], [avant + 1, pieces]);
  assertEqual(craft(s, 'meuble_table').ok, false, 'plus de meuble à l\'Atelier (le récit, lot 7)');
  setInv(s, DATA.ATELIER.RECETTES.canne.entrees);
  assert(craft(s, 'canne').ok && s.outils.canne, 'la canne à pêche');
});

/* ---------- le joueur automatique, la sauvegarde ---------- */

test('le joueur automatique tient la route sans Marché : il cultive, vend et fait venir ses bêtes', () => {
  // (avant la fiche, la même partie : chapitre 2 à la nuit 5, chapitre 3 à la nuit 26, niveau 6 à la
  // nuit 40 ; la houe et les bêtes ne lui coûtent plus de pièces)
  const rows = simulateGame('applique', 40, 1);
  assertEqual(rows.length, 40, 'quarante nuits');
  assert(rows.every((r) => r.pieces >= 0), 'jamais à découvert');
  assert(rows.find((r) => r.nuit === 10).chapitre >= 2 && rows[rows.length - 1].chapitre >= 3, 'il avance dans la campagne');
  assert(rows[rows.length - 1].niveau >= 5, 'il gagne des niveaux');
});

test('migration v56 → v57 : la calèche ; l\'argent, l\'inventaire et les cours du Marché restent', () => {
  const s = partieSur('1');
  addItem(s, 'graine_tomate', 4);
  s.marche = { graine_carotte: 260 };
  s.pieces = 321;
  const vieille = copie({ ...s, version: 56 });
  delete vieille.caleche;
  const m = migrate({ v: 56, t: 0, s: vieille });
  assertEqual(m.version, STATE_VERSION);
  assertEqual(m.caleche, { coffre: {}, haltes: [], fait: null, jour: null });
  assertEqual([m.pieces, countItem(m, 'graine_tomate'), m.marche], [321, countItem(s, 'graine_tomate'), { graine_carotte: 260 }]);
});

// (la tournée posée à la main : une tournée sans hameau, la calèche reste à la ferme)
test('la tournée : sans hameau, elle reste à la ferme', () => {
  const T = tourneeDuPlan({ W: 10, chemins: [], hameaux: [], sortie: 55, ferme: { X: 0, Y: 0, LARGEUR: 4, HAUTEUR: 4 } });
  poserTournee('vide', T);
  assertEqual(etatCaleche(T, 10.5).arret.id, 'ferme');
});
