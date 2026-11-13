/* ==========================================================================
   Tests du chantier « l'île à bâtir » : les vocations, et la vocation « village » (fiche I8a ; docs/ile.md ;
   js/engine/vocations.js, vocation-village.js, fetes-village.js, projets-village.js).
   Comme tous les fichiers tests/engine/village-*.test.mjs, il tourne avec VILLAGE.ACTIF forcé à true.
   - le socle : une vocation enregistrée (une troisième, sans toucher au moteur), son score, ses paliers, notés la
     nuit et jamais perdus, ce qu'ils débloquent ;
   - la convivialité et chacune de ses causes (le bonheur, les amis, les proches, les fêtes, les projets, les repas
     partagés, le décor de la place, plafonnées) ;
   - les paliers : un plan d'Atelier, un projet, une seconde fête, l'arrivée d'un villageois lié ;
   - une fête : la fixer (les plats, les refus), l'annuler, le jour dit (les villageois sur la place, attablés,
     ils causent), la nuit (tenue, l'affinité de chaque paire, le bonheur) ; la veillée de pleine lune ;
   - un projet : le kiosque bâti en trois journées de villageois (le chantier posé, les matériaux, ceux qu'on y
     envoie travaillent à la place de leur tâche, le journal et le tableau le montrent) ; la place et son décor ;
   - la sauvegarde (v96 → v97) ; éteint : rien.
   Lancer seul : node tests/run-tests.mjs village-vocations.
   ========================================================================== */

import {
  addItem, affiniteGardee, apporterAuProjetVillage, annulerFete, arriverVillageois, attribuer, bilanVillageois, caseBatissable,
  centreDeLaPlace, countItem, craftStatus, DATA, debloque, decorDeLaPlace, dessinProjet, donneesVocation, enregistrerVocation,
  envoyerAuChantier, farmTerrain, feteDuJourVillage, feteRefus, fetesDuJourVillage, fetesTenues, fetesVillageNuit, fixerFete,
  idsVocations, journeeDuVillage, jourVeillee, lancerProjet, lancerRefus, listeVocations, liensNuit, meteoDuJour, migrate, palierVocation,
  paroleVillageois, poserAffinite, poserBloc, projetEnCours, projetFini, projetsVillageNuit, quiFaitQuoi, recetteDebloquee, runNight,
  scoreVocation, STATE_VERSION, testMaisonVillageois, travailleAujourdhui, villageoisNuit, vocationsNuit,
} from '../../js/engine/index.js';
import { assert, assertEqual, avecVillage, boite, partie, test } from './aide.mjs';

const copie = (o) => JSON.parse(JSON.stringify(o));
const VV = DATA.VOCATIONS.village;
const cause = (s, id) => scoreVocation(s, 'village').causes.find((c) => c.id === id).valeur;

// Un coin libre de w × h cases (tout bâtissable, une case de marge) près du milieu de la ferme, à partir du rang
// `depuis` des coins trouvés : sa case haut-gauche.
function coin(s, w, h, eviter = new Set()) {
  const T = farmTerrain(s), W = T.LARGEUR, F = T.FERME;
  const cx = F.X + (F.LARGEUR >> 1), cy = F.Y + (F.HAUTEUR >> 1);
  for (let d = 0; d < 60; d++) {
    for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
      const c = cx + dx, r = cy + dy;
      let ok = true;
      for (let y = -1; y <= h && ok; y++) for (let x = -1; x <= w && ok; x++) ok = caseBatissable(s, (r + y) * W + c + x) && !eviter.has((r + y) * W + c + x);
      if (ok) return r * W + c;
    }
  }
  return null;
}

const poser = (s, sorte, t, sens = 0) => {
  addItem(s, DATA.ATELIER.BLOCS[sorte].objet, 1);
  const r = poserBloc(s, sorte, t, sens);
  assert(r.ok, `${sorte} en ${t} : ${r.error || ''}`);
};

// La place : un puits, une table de jardin et ses quatre chaises, deux bancs côte à côte, un chemin. → { z, at, cases }
function place(s) {
  const W = farmTerrain(s).LARGEUR, z = coin(s, 11, 8);
  assert(z !== null, 'un coin pour la place');
  const at = (x, y) => z + y * W + x;
  poser(s, 'puits', at(4, 1));
  poser(s, 'table_jardin', at(4, 5));
  poser(s, 'chaise_jardin', at(3, 5), 1); poser(s, 'chaise_jardin', at(5, 5), 3); poser(s, 'chaise_jardin', at(4, 6), 0); poser(s, 'chaise_jardin', at(4, 4), 2);
  poser(s, 'banc_jardin', at(8, 2)); poser(s, 'banc_jardin', at(9, 2));
  for (let x = 0; x < 11; x++) poser(s, 'chemin', at(x, 7));
  const cases = new Set();
  for (let y = -1; y <= 9; y++) for (let x = -1; x <= 12; x++) cases.add(at(x, y));
  return { z, at, cases };
}

// La partie d'essai : n maisons, la place, n villageois arrivés.
function ile(seed = 1, n = 4, o = {}) {
  const s = partie(seed);
  if (!s.blocs) s.blocs = {};
  for (let k = 0; k < n; k++) assert(testMaisonVillageois(s, 1).ok, `maison ${k + 1}`);
  const P = o.place !== false ? place(s) : null;
  boite(s, { pain: 400 });
  for (let k = 0; k < n; k++) assert(arriverVillageois(s, { direct: true }).ok, `villageois ${k + 1}`);
  for (const v of s.villageois) v.avis = [];
  return { s, V: s.villageois, P };
}

function jourSec(s, depuis = s.day) {
  for (let d = depuis; d < depuis + 120; d++) if (meteoDuJour(s, d).sorte !== 'pluie') { s.day = d; return d; }
  throw new Error('pas de jour sec');
}

// La convivialité au palier `n` (les paliers gardés : comme si les nuits l'avaient noté).
function auPalier(s, n) {
  if (!s.vocations) s.vocations = { paliers: {} };
  s.vocations.paliers.village = n;
}

/* ---------- le socle ---------- */

test('le socle : une vocation enregistrée, son score, ses paliers notés la nuit et jamais perdus', () => {
  const { s } = ile(1, 2);
  assert(idsVocations().includes('village'), 'la vocation « village » est enregistrée');
  // une troisième vocation : une entrée de données, un calcul enregistré, rien d'autre
  const avant = DATA.VOCATIONS.essai;
  let points = 7;
  DATA.VOCATIONS.essai = { nom: 'Une île d\'essai', icone: '🧪', PALIERS: [{ score: 5, debloque: ['essai:un'] }, { score: 10, debloque: ['essai:deux'] }] };
  enregistrerVocation('essai', () => ({ score: points, causes: [{ id: 'tout', nom: 'Tout', valeur: points }] }));
  try {
    assert(idsVocations().includes('essai'), 'une troisième vocation, sans toucher au socle');
    assertEqual(scoreVocation(s, 'essai'), { score: 7, causes: [{ id: 'tout', nom: 'Tout', valeur: 7 }] });
    const p0 = palierVocation(s, 'essai');
    assertEqual([p0.palier, p0.atteint, p0.suivant.rang, p0.suivant.manque, p0.debloque], [0, 1, 1, 0, []], 'atteint, pas encore noté');
    assertEqual(debloque(s, 'essai:un'), false, 'rien de débloqué avant la nuit');
    const n = vocationsNuit(s);
    assert(n.some((x) => x.id === 'essai' && x.palier === 1), 'la nuit note le palier 1');
    assertEqual(debloque(s, 'essai:un'), true, 'débloqué au réveil');
    assertEqual(debloque(s, 'essai:deux'), false);
    points = 0;
    vocationsNuit(s);
    assertEqual(palierVocation(s, 'essai').palier, 1, 'un palier atteint ne se perd pas');
    assertEqual(debloque(s, 'essai:un'), true);
    points = 12;
    assertEqual(vocationsNuit(s).filter((x) => x.id === 'essai').map((x) => x.palier), [2]);
    const L = listeVocations(s);
    assertEqual(L.map((v) => v.id), ['village', 'essai'], 'deux vocations ensemble, dans l\'ordre des données');
    assertEqual(L[1].paliers.map((p) => p.atteint), [true, true]);
    assertEqual(L[1].suivant, null, 'le dernier palier atteint');
  } finally {
    if (avant === undefined) delete DATA.VOCATIONS.essai; else DATA.VOCATIONS.essai = avant;
  }
  assertEqual(listeVocations(s).map((v) => v.id), ['village'], 'sans ses données, la vocation n\'est pas listée');
});

/* ---------- la convivialité ---------- */

test('la convivialité : chacune de ses causes, plafonnée', () => {
  const { s, V, P } = ile(2, 4);
  const C = VV.CAUSES;
  // le bonheur moyen au-dessus de BASE, un point par PAR
  for (const v of V) v.bonheur = 70;
  assertEqual(cause(s, 'bonheur'), Math.floor((70 - C.bonheur.BASE) / C.bonheur.PAR));
  for (const v of V) v.bonheur = 100;
  assertEqual(cause(s, 'bonheur'), Math.min(C.bonheur.MAX, Math.floor((100 - C.bonheur.BASE) / C.bonheur.PAR)), 'plafonné');
  for (const v of V) v.bonheur = 20;
  assertEqual(cause(s, 'bonheur'), 0, 'jamais négatif');
  // les liens : deux paires d'amis, une de proches
  for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) poserAffinite(s, V[i].id, V[j].id, 5);
  assertEqual([cause(s, 'ami'), cause(s, 'proche')], [0, 0]);
  poserAffinite(s, V[0].id, V[1].id, 50); poserAffinite(s, V[2].id, V[3].id, 60); poserAffinite(s, V[0].id, V[2].id, 80);
  assertEqual([cause(s, 'ami'), cause(s, 'proche')], [2 * C.ami.POINTS, C.proche.POINTS]);
  // les fêtes tenues, les projets finis, les repas partagés
  if (!s.vocations) s.vocations = { paliers: {} };
  s.vocations.village = { ...(s.vocations.village || {}), tenues: 3, repas: 2, projets: { encours: null, faits: [{ sorte: 'place', jour: 1 }] } };
  assertEqual([cause(s, 'fete'), cause(s, 'projet'), cause(s, 'repas')], [3 * C.fete.POINTS, C.projet.POINTS, 2 * C.repas.POINTS]);
  s.vocations.village.tenues = 99;
  assertEqual(cause(s, 'fete'), C.fete.MAX, 'plafonné');
  // le décor de la place : autour du puits, dans le rayon (la table, ses chaises, les bancs ; le chemin ne compte pas)
  assertEqual(centreDeLaPlace(s), P.at(4, 1), 'le centre : le puits (sans panneau du village)');
  const D = decorDeLaPlace(s);
  assertEqual(D.blocs.map((b) => b.sorte).sort(), ['banc_jardin', 'banc_jardin', 'chaise_jardin', 'chaise_jardin', 'chaise_jardin', 'chaise_jardin', 'table_jardin']);
  assertEqual(cause(s, 'decor'), D.points * C.decor.POINTS);
  const d0 = cause(s, 'decor');
  poser(s, 'lanterne', P.at(1, 3));
  assertEqual(cause(s, 'decor'), d0 + VV.DECOR.SORTES.lanterne, 'une lanterne de plus');
  // le score : la somme
  const r = scoreVocation(s, 'village');
  assertEqual(r.score, r.causes.reduce((t, c) => t + c.valeur, 0));
  assertEqual(r.causes.map((c) => c.id), ['bonheur', 'ami', 'proche', 'fete', 'projet', 'repas', 'decor']);
});

test('les paliers : un plan d\'Atelier, un projet, une seconde fête ; notés la nuit', () => {
  const { s, V } = ile(3, 2);
  assertEqual(palierVocation(s, 'village').palier, 0);
  assertEqual(recetteDebloquee(s, 'banc_pierre'), false, 'le banc de pierre : son plan manque');
  assert(/palier 1/.test(craftStatus(s, 'banc_pierre').raison), `la raison dit le palier : ${craftStatus(s, 'banc_pierre').raison}`);
  assert(lancerRefus(s, 'kiosque'), 'le kiosque fermé');
  assertEqual(fetesParMoisVillage(s), 1);
  // le score passe le premier palier : la nuit le note
  for (const v of V) v.bonheur = 40 + 2 * VV.PALIERS[0].score;
  assert(scoreVocation(s, 'village').score >= VV.PALIERS[0].score, 'le score atteint le palier 1');
  const n = vocationsNuit(s);
  assertEqual(n.map((x) => [x.id, x.palier]), [['village', 1]]);
  assertEqual(n[0].debloque, VV.PALIERS[0].debloque);
  assertEqual(recetteDebloquee(s, 'banc_pierre'), true, 'un décor se débloque à l\'Atelier');
  assertEqual(lancerRefus(s, 'kiosque'), null, 'le kiosque s\'ouvre');
  // le bonheur retombe : le palier reste
  for (const v of V) v.bonheur = 40;
  vocationsNuit(s);
  assertEqual(palierVocation(s, 'village').palier, 1);
  assertEqual(recetteDebloquee(s, 'banc_pierre'), true);
  auPalier(s, 2);
  assertEqual(fetesParMoisVillage(s), 2, 'une seconde fête par mois');
});

const fetesParMoisVillage = (s) => {
  const jour = s.day + 1, n = [];
  // (combien de fêtes le joueur peut fixer dans un même mois de lune, d'après les refus)
  const t = copie(s);
  addItem(t, 'pain', 99);
  for (let d = jour; d < jour + DATA.LUNE.JOURS_MOIS && Math.floor((d - 1) / DATA.LUNE.JOURS_MOIS) === Math.floor((jour - 1) / DATA.LUNE.JOURS_MOIS); d++) if (fixerFete(t, d).ok) n.push(d);
  return n.length;
};

test('l\'arrivée d\'un villageois lié (« arrivee:lien ») : un ami ou un parent déjà là', () => {
  const { s, V } = ile(4, 2);
  assert(testMaisonVillageois(s, 1).ok);
  const t = copie(s);
  assert(arriverVillageois(t, { direct: true }).ok);
  assertEqual(t.villageois[2].lienArrivee, undefined, 'sans le palier : un inconnu');
  auPalier(s, 3);
  const r = arriverVillageois(s, { direct: true });
  assert(r.ok);
  const L = r.villageois.lienArrivee;
  assert(L && V.some((v) => v.id === L.id) && ['ami', 'parent'].includes(L.sorte), `un lien : ${JSON.stringify(L)}`);
  assertEqual(affiniteGardee(s, r.villageois.id, L.id), L.sorte === 'parent' ? VV.ARRIVEE_LIEN.PROCHE : VV.ARRIVEE_LIEN.AMI);
  assert(r.villageois.avis.includes(`lien_arrivee:${L.id}`), 'la page le dira');
});

/* ---------- une fête ---------- */

test('une fête : la fixer (les plats, les refus), l\'annuler', () => {
  const { s } = ile(5, 4);
  s.inventaire = {};
  const jour = s.day + 2;
  assert(/à venir/.test(feteRefus(s, s.day)), 'pas aujourd\'hui');
  const n = Math.max(VV.FETES.PLATS.MIN, Math.ceil(4 / VV.FETES.PLATS.PAR));
  assert(/plats/.test(fixerFete(s, jour).error), 'sans plats : refusée');
  addItem(s, 'pain', 1); addItem(s, 'omelette', 5);
  const r = fixerFete(s, jour);
  assert(r.ok, r.error);
  assertEqual(Object.values(r.fete.plats).reduce((a, b) => a + b, 0), n, 'un plat par deux villageois');
  assertEqual(Object.keys(r.fete.plats).sort(), ['omelette', 'pain'], 'variés');
  assertEqual(countItem(s, 'pain') + countItem(s, 'omelette'), 6 - n, 'mis de côté');
  assert(/déjà une fête/.test(feteRefus(s, jour)));
  const meme = Math.floor((jour - 1) / DATA.LUNE.JOURS_MOIS) === Math.floor(jour / DATA.LUNE.JOURS_MOIS) ? jour + 1 : null;
  if (meme) assert(/mois de lune/.test(feteRefus(s, meme)), 'une par mois de lune');
  assertEqual(feteDuJourVillage(s, jour).nom, VV.FETES.NOMS.mois[1]);
  const a = annulerFete(s, jour);
  assert(a.ok);
  assertEqual(countItem(s, 'pain') + countItem(s, 'omelette'), 6, 'les plats reviennent');
  assertEqual(!!feteDuJourVillage(s, jour) && feteDuJourVillage(s, jour).sorte === 'mois', false, 'plus de fête ce jour-là');
});

test('une fête : le jour dit, les villageois sur la place, attablés ; la nuit, l\'affinité et le bonheur', () => {
  const { s, V, P } = ile(6, 4);
  const jour = jourSec(s, s.day + 3);
  // (pas le jour de la veillée de pleine lune : la fête du joueur ce jour-là, de toute façon)
  s.day = jour - 1;
  addItem(s, 'pain', 4);
  assert(fixerFete(s, jour).ok);
  s.day = jour;
  const J = journeeDuVillage(s), F = VV.FETES;
  const a18 = V.map((v) => (J.get(v.id) || []).find((x) => 18.5 >= x.de && 18.5 < x.a));
  assert(a18.every((x) => x && x.but && x.but.sorte === 'fete'), `tous à la fête à 18 h 30 : ${JSON.stringify(a18.map((x) => x && [x.etat, x.but && x.but.sorte]))}`);
  const table = a18.filter((x) => x.etat === 'repas' && x.lieu.table === P.at(4, 5));
  assertEqual(table.length, 4, 'attablés à la table commune');
  assert(table.every((x) => x.but.avec.length === 3), 'ils causent ensemble');
  const avant = V.map((v) => (J.get(v.id) || []).find((x) => 14 >= x.de && 14 < x.a));
  assert(avant.every((x) => !x.but || x.but.sorte !== 'fete'), 'pas encore à 14 h');
  const fin = V.map((v) => (J.get(v.id) || []).find((x) => F.FIN + 0.1 >= x.de && F.FIN + 0.1 < x.a));
  assert(fin.every((x) => !x.but || x.but.sorte !== 'fete'), 'la fête finie, ils rentrent');
  assertEqual(paroleVillageois(s, V[0].id, { heure: 18.5, activite: 'repas', but: 'fete' }).texte.length > 0, true);
  assert(DATA.VILLAGE.SOCIAL.ACTIVITE.fete.includes(paroleVillageois(s, V[0].id, { heure: 18.5, activite: 'repas', but: 'fete' }).texte), 'il parle de la fête');
  // la nuit : l'affinité de chaque paire monte de FETE de plus qu'un jour sans fête
  const t = copie(s);
  t.vocations.village.fetes = [];
  for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) { poserAffinite(s, V[i].id, V[j].id, 10); poserAffinite(t, V[i].id, V[j].id, 10); }
  liensNuit(s); liensNuit(t);
  for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) {
    const g = affiniteGardee(s, V[i].id, V[j].id) - affiniteGardee(t, V[i].id, V[j].id);
    assert(g >= DATA.VILLAGE.LIENS.GAINS.FETE, `${V[i].id}–${V[j].id} : +${g}`);
  }
  for (const v of [...V, ...t.villageois]) v.bonheur = 50;
  villageoisNuit(s); villageoisNuit(t);
  assert(V.every((v, i) => v.bonheur > t.villageois[i].bonheur), 'leur bonheur vise plus haut');
  const r = fetesVillageNuit(s);
  assertEqual([r.sorte, r.venus], ['mois', 4]);
  assertEqual(fetesTenues(s), 1);
  assertEqual(fetesVillageNuit(s), null, 'tenue une fois');
  assertEqual(cause(s, 'fete'), VV.CAUSES.fete.POINTS);
});

test('la veillée de pleine lune : d\'elle-même, le soir, sans plats', () => {
  const { s, V } = ile(7, 3);
  const d = jourVeillee(s.day + DATA.LUNE.JOURS_MOIS);
  assert(d, 'un jour de pleine lune');
  const f = fetesDuJourVillage(s, d);
  assertEqual(f.map((x) => [x.sorte, x.debut, x.fin]), [['pleine_lune', VV.FETES.VEILLEE[0], VV.FETES.VEILLEE[1]]]);
  s.day = d;
  const J = journeeDuVillage(s);
  const h = (VV.FETES.VEILLEE[0] + VV.FETES.VEILLEE[1]) / 2 + 0.2;
  assert(V.every((v) => { const x = (J.get(v.id) || []).find((y) => h >= y.de && h < y.a); return x && x.but && x.but.sorte === 'fete'; }), 'tous à la veillée');
  assertEqual(fetesVillageNuit(s).sorte, 'pleine_lune');
  assertEqual(fetesTenues(s), 1);
  // seul au village : pas de veillée
  const { s: s2 } = ile(7, 1);
  assertEqual(fetesDuJourVillage(s2, jourVeillee(s2.day + DATA.LUNE.JOURS_MOIS)), []);
});

/* ---------- un projet ---------- */

test('un projet : le kiosque, bâti en trois journées de villageois, à la place de leur tâche', () => {
  const { s, V, P } = ile(8, 3);
  for (const v of V) assert(attribuer(s, v.id, 'cueillette').ok);
  assert(/convivial/.test(lancerRefus(s, 'kiosque')), 'fermé avant le palier');
  auPalier(s, 1);
  const r = lancerProjet(s, 'kiosque');
  assert(r.ok, r.error);
  assertEqual(countItem(s, 'kiosque'), 1, 'son chantier, à poser');
  assert(/déjà en cours/.test(lancerRefus(s, 'lavoir')), 'un projet à la fois');
  // le chantier posé (3 × 3 cases, hors de la place), les matériaux apportés
  const W = farmTerrain(s).LARGEUR, z = coin(s, 3, 3, P.cases);
  assert(z !== null, 'un coin pour le kiosque');
  assert(poserBloc(s, 'kiosque', z + 2 * W).ok, 'le chantier posé');
  assertEqual(dessinProjet(s, 'kiosque'), 'kiosque_chantier', 'la carte le montre en chantier');
  assert(/manque/.test(apporterAuProjetVillage(s).error), 'rien à apporter');
  for (const [it, n] of Object.entries(VV.PROJETS.SORTES.kiosque.besoin)) addItem(s, it, n);
  assert(apporterAuProjetVillage(s).pret, 'tout est là');
  // un villageois au chantier : il n'y fait pas sa tâche, la journée le met au travail autour du chantier
  assert(envoyerAuChantier(s, V[0].id).ok);
  s.day = jourSec(s);
  assertEqual(travailleAujourdhui(s, V[0]), false, 'pas sa tâche');
  assertEqual(travailleAujourdhui(s, V[1]), true, 'les autres font la leur');
  assertEqual(quiFaitQuoi(s).find((q) => q.id === V[0].id).etat, 'chantier');
  const seg = (journeeDuVillage(s).get(V[0].id) || []).find((x) => x.etat === 'travail');
  assert(seg && seg.but.chantier === 'kiosque' && seg.but.tache === 'chantier', 'au travail, au chantier');
  const emprise = new Set([0, 1, 2].flatMap((dy) => [0, 1, 2].map((dx) => z + 2 * W - dy * W + dx)));
  assert(emprise.has(seg.lieu.vers) && !emprise.has(seg.lieu.case), 'devant le kiosque, tourné vers lui');
  // la nuit : une journée
  runNight(s);
  assertEqual(projetEnCours(s).faites, 1);
  const J = V[0].journal[V[0].journal.length - 1];
  assertEqual([J.tache, J.chantier, J.repos || false], ['chantier', 'kiosque', false], 'le journal : au chantier');
  const B = bilanVillageois(s, V[0].id, 'hier');
  assertEqual([B.jours[0].chantier.nom, B.jours[0].tache, B.joursChantier, B.chantier.nom], ['Le kiosque', null, 1, 'Le kiosque'], 'le tableau le montre à la place de la tâche');
  assert(!(V[1].journal[V[1].journal.length - 1].chantier), 'les autres à leur tâche');
  // deux de plus : la troisième journée finit le kiosque
  assert(envoyerAuChantier(s, V[1].id).ok && envoyerAuChantier(s, V[2].id).ok);
  for (const v of V) v.repos = false;
  const n = projetsVillageNuit(s);
  assertEqual([n.faites, n.fini], [3, true], 'trois journées de villageois');
  assertEqual(projetFini(s, 'kiosque'), true);
  assertEqual(dessinProjet(s, 'kiosque'), 'kiosque', 'son dessin achevé');
  assertEqual(V.map((v) => v.chantier), [null, null, null], 'ils reprennent leur tâche');
  assertEqual(projetEnCours(s), null);
  assertEqual(cause(s, 'projet'), VV.CAUSES.projet.POINTS);
  assert(cause(s, 'decor') === 0 || decorDeLaPlace(s).blocs.every((b) => b.sorte !== 'kiosque'), 'hors du rayon de la place, il ne compte pas au décor');
});

test('un projet sans bâtiment : la place, sur la place, et son décor dans l\'inventaire', () => {
  const { s, V } = ile(9, 2);
  assert(lancerProjet(s, 'place').ok);
  for (const [it, n] of Object.entries(VV.PROJETS.SORTES.place.besoin)) addItem(s, it, n);
  assert(apporterAuProjetVillage(s).pret);
  for (const v of V) assert(envoyerAuChantier(s, v.id).ok);
  s.day = jourSec(s);
  const seg = (journeeDuVillage(s).get(V[0].id) || []).find((x) => x.etat === 'travail');
  assert(seg && seg.but.chantier === 'place', 'ils travaillent sur la place');
  const avant = countItem(s, 'banc_jardin');
  const r = projetsVillageNuit(s);
  assertEqual(r.fini, true, 'deux villageois, deux journées');
  assertEqual(countItem(s, 'banc_jardin') - avant, VV.PROJETS.SORTES.place.donne.banc_jardin, 'le décor dans l\'inventaire');
  // un enfant ne va pas au chantier ; un projet fini ne se relance pas
  assert(/déjà fini/.test(lancerRefus(s, 'place')));
});

/* ---------- la sauvegarde, éteint ---------- */

test('la sauvegarde : v96 → v97 (les vocations réparées ; sans elles, rien)', () => {
  assert(STATE_VERSION >= 97, 'le format 97 ou plus');
  const { s, V } = ile(10, 2);
  s.version = 92;
  s.vocations = {
    paliers: { village: 9, inconnue: 2 },
    village: { fetes: [{ jour: 30, sorte: 'mois', plats: { pain: 2, rien: 1 } }, { jour: 30, sorte: 'mois' }, { jour: 'x' }, { jour: 31, sorte: 'bal' }], tenues: 2, repas: 1, projets: { encours: { sorte: 'kiosque', recu: { planche: 999, rien: 2 }, journees: 1 }, faits: [{ sorte: 'place', jour: 4 }, { sorte: 'inconnu' }] } },
  };
  V[0].chantier = 'kiosque'; V[1].chantier = 'lavoir';
  const m = migrate({ v: 1, t: 0, s: copie(s) });
  assertEqual(m.version, STATE_VERSION);
  assertEqual(m.vocations.paliers, { village: VV.PALIERS.length }, 'bornés, une vocation inconnue s\'en va');
  assertEqual(m.vocations.village.fetes, [{ jour: 30, sorte: 'mois', plats: { pain: 2 }, tenue: false }]);
  assertEqual([m.vocations.village.tenues, m.vocations.village.repas], [2, 1]);
  assertEqual(m.vocations.village.projets, { encours: { sorte: 'kiosque', recu: { planche: VV.PROJETS.SORTES.kiosque.besoin.planche }, journees: 1, debut: 1 }, faits: [{ sorte: 'place', jour: 4 }] });
  assertEqual(m.villageois.map((v) => v.chantier), ['kiosque', null], 'envoyé à un projet qui n\'est pas en cours : il reprend sa tâche');
  const sans = partie(10);
  sans.version = 92;
  const m2 = migrate({ v: 1, t: 0, s: copie(sans) });
  assert(!('vocations' in m2), 'rien sans vocations');
  assertEqual(donneesVocation('village').nom, VV.nom);
});

test('éteint : rien (ni score, ni palier, ni fête, ni projet)', () => {
  avecVillage(() => {
    const s = partie(11);
    assertEqual(listeVocations(s), []);
    assertEqual(scoreVocation(s, 'village'), { score: 0, causes: [] });
    assertEqual(vocationsNuit(s), null);
    assertEqual(fetesVillageNuit(s), null);
    assertEqual(projetsVillageNuit(s), null);
    s.vocations = { paliers: { village: 4 } };
    assertEqual(debloque(s, 'plan:banc_pierre'), false, 'même une partie qui en garde');
    assert(/pas allumé/.test(fixerFete(s, s.day + 2).error));
    assert(/pas allumé/.test(lancerProjet(s, 'place').error));
    delete s.vocations;
    runNight(s);
    assert(!('vocations' in s), 'la nuit n\'en crée pas');
  }, false);
});
