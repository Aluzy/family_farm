/* ==========================================================================
   Tests du chantier « l'île à bâtir » : les traits de personnalité des villageois (fiche I6c ; docs/ile.md ;
   js/engine/traits.js). Comme tous les fichiers tests/engine/village-*.test.mjs, il tourne avec VILLAGE.ACTIF forcé.
   - le tirage : deux ou trois traits, jamais deux opposés, jamais deux villageois avec la même liste, déterministe ;
   - chaque effet lu dans les réglages (TRAITS) : l'horaire (le matinal dehors avant les autres, le couche-tard au
     souper après eux, le gourmand à table le premier), la flânerie, le casanier chez lui, la plage de travail du
     travailleur ; la parole (la part des sujets, leur poids, ses phrases, ses répliques, la bulle courte du réservé) ;
     la scène (le facteur de causerie) ; les postes (le bonheur à la tâche aimée, boudée, l'ami proche ; le rendement
     ne change pas) ; les affinités (les paires accordées) ;
   - la découverte (vu trois jours, entendu deux fois ; la fiche et ses « ? » ; le tableau) ;
   - la sauvegarde (v93 → v94 : les villageois d'avant reçoivent leurs traits) ; éteint : rien.
   Lancer seul : node tests/run-tests.mjs village-traits.
   ========================================================================== */

import {
  actionsDuJour, addItem, affiniteGardee, caseBatissable, farmTerrain, poserBloc, arriverVillageois, attribuer, bilanVillageois, bonheurDesTraits, causeDesTraits, DATA,
  direSujet, echangeVillageois, gainAccords, goutTache, horaireDesTraits, journeeDuVillage, liensNuit, liensPourLaCarte,
  meteoDuJour, migrate, noterIndice, observerTraits, opposes, paroleVillageois, parlerVillageois, partDesTraits, phraseTrait,
  poserAffinite, positionVillageois, reparerTraits, STATE_VERSION, testMaisonVillageois, tirerTraits, traitsConnus,
  traitsPourFiche, traitsValides, villageoisNuit, ajouterAmitie,
} from '../../js/engine/index.js';
import { assert, assertEqual, avecVillage, boite, partie, test } from './aide.mjs';

const copie = (o) => JSON.parse(JSON.stringify(o));
const TR = DATA.TRAITS, LISTE = TR.LISTE;
// (la tâche qu'un trait aime, celle qu'il boude : son réglage POSTE)
const poste = (t, g) => Object.keys(LISTE[t].POSTE).find((k) => LISTE[t].POSTE[k] === g);
const cle = (l) => [...l].sort().join('+');

// Un coin libre de w × h cases (tout bâtissable, une case de marge) près du milieu de la ferme : sa case haut-gauche.
function coin(s, w, h) {
  const T = farmTerrain(s), W = T.LARGEUR, F = T.FERME;
  const cx = F.X + (F.LARGEUR >> 1), cy = F.Y + (F.HAUTEUR >> 1);
  for (let d = 0; d < 60; d++) {
    for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
      const c = cx + dx, r = cy + dy;
      let ok = true;
      for (let y = -1; y <= h && ok; y++) for (let x = -1; x <= w && ok; x++) ok = caseBatissable(s, (r + y) * W + c + x);
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

// La place : un puits, une table de jardin et ses quatre chaises, deux bancs, un chemin (comme village-liens).
function place(s) {
  const W = farmTerrain(s).LARGEUR, z = coin(s, 11, 8);
  assert(z !== null, 'un coin pour la place');
  const at = (x, y) => z + y * W + x;
  poser(s, 'puits', at(4, 1));
  poser(s, 'table_jardin', at(4, 5));
  poser(s, 'chaise_jardin', at(3, 5), 1); poser(s, 'chaise_jardin', at(5, 5), 3); poser(s, 'chaise_jardin', at(4, 6), 0); poser(s, 'chaise_jardin', at(4, 4), 2);
  poser(s, 'banc_jardin', at(8, 2)); poser(s, 'banc_jardin', at(9, 2));
  for (let x = 0; x < 11; x++) poser(s, 'chemin', at(x, 7));
}

// La partie d'essai : n maisons, la place, de quoi manger, n villageois arrivés aujourd'hui.
function ile(seed = 1, n = 3) {
  const s = partie(seed);
  if (!s.blocs) s.blocs = {};
  for (let k = 0; k < n; k++) assert(testMaisonVillageois(s, 1).ok, `maison ${k + 1}`);
  place(s);
  boite(s, { pain: 300 });
  for (let k = 0; k < n; k++) assert(arriverVillageois(s, { direct: true }).ok, `villageois ${k + 1}`);
  for (const v of s.villageois) v.avis = [];
  return { s, V: s.villageois };
}

function jourSec(s) {
  for (let d = s.day; d < s.day + 120; d++) if (meteoDuJour(s, d).sorte !== 'pluie') { s.day = d; return; }
  throw new Error('pas de jour sec');
}

// Un réglage de TRAITS changé le temps de `fn`.
function avecReglage(chemin, valeur, fn) {
  const cles = chemin.split('.'), dernier = cles.pop();
  const o = cles.reduce((x, k) => x[k], TR), avant = o[dernier];
  o[dernier] = valeur;
  try { return fn(); } finally { o[dernier] = avant; }
}

/* ---------- le tirage ---------- */

test('le tirage : deux ou trois traits, jamais deux opposés, pas deux fois la même liste, déterministe', () => {
  // (une longue liste de villageois, d'une graine à l'autre)
  for (const g of ['a', 'b', 'c', 7]) {
    const pris = [];
    for (let r = 1; r <= 30; r++) {
      const l = tirerTraits(`${g}:villageois:${r}`, pris);
      assert(traitsValides(l), `${g}/${r} : ${l}`);
      assert(l.length >= TR.NOMBRE[0] && l.length <= TR.NOMBRE[1], 'deux ou trois');
      for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) assert(!opposes(l[i], l[j]), `pas d'opposés : ${l}`);
      assert(!pris.some((p) => cle(p) === cle(l)), `pas la même liste qu'un autre : ${l}`);
      assertEqual(tirerTraits(`${g}:villageois:${r}`, pris), l, 'déterministe');
      pris.push(l);
    }
    assert(new Set(pris.map((l) => l.length)).size === 2, 'des listes de deux et de trois');
  }
  // (les opposés de la fiche)
  for (const [a, b] of [['matinal', 'couche_tard'], ['bavard', 'reserve'], ['travailleur', 'flaneur'], ['casanier', 'curieux']]) assert(opposes(a, b) && opposes(b, a), `${a} / ${b}`);
  assertEqual(Object.keys(LISTE).length >= 10, true, 'une dizaine de traits');
  // (à l'arrivée : tirés de la graine et du rang, gardés, aucun connu)
  const A = ile(3, 6), B = ile(3, 6);
  assertEqual(A.V.map((v) => v.traits), B.V.map((v) => v.traits), 'la même partie, les mêmes traits');
  assertEqual(new Set(A.V.map((v) => cle(v.traits))).size, 6, 'six villageois, six listes');
  for (const v of A.V) assertEqual([traitsValides(v.traits), v.traitsConnus, v.indices], [true, [], {}]);
  assert(JSON.stringify(ile(4, 6).V.map((v) => v.traits)) !== JSON.stringify(A.V.map((v) => v.traits)), 'une autre graine, d\'autres traits');
});

/* ---------- l'horaire ---------- */

test('l\'horaire : le matinal dehors avant les autres, le couche-tard au souper après eux, le gourmand à table le premier', () => {
  const { s, V: [a, b, c] } = ile(1, 3);
  jourSec(s);
  a.traits = ['matinal', 'bavard']; b.traits = ['couche_tard', 'reserve']; c.traits = ['gourmand', 'soigneux'];
  const etat = (v, h) => positionVillageois(s, v.id, h).etat;
  // (le matin : seul le matinal est sorti à 7 h 05 ; les autres se lèvent ou dorment)
  assert(['dehors', 'flaner'].includes(etat(a, 7.05)), `le matinal est dehors à 7 h 05 (${etat(a, 7.05)})`);
  assert(['lever', 'dormir'].includes(etat(b, 7.05)) && ['lever', 'dormir'].includes(etat(c, 7.05)), 'les autres pas encore');
  assertEqual(etat(b, 6.7), 'dormir', 'le couche-tard dort encore à 6 h 40');
  // (le gourmand à table avant midi ; le couche-tard au souper quand les autres sont rentrés)
  assertEqual(etat(c, 11.9), 'repas', 'le gourmand à table à 11 h 54');
  assert(etat(a, 11.9) !== 'repas', 'pas le matinal');
  assertEqual(etat(b, 20.1), 'repas', 'le couche-tard encore au souper à 20 h 06');
  assert(etat(a, 20.1) !== 'repas' && etat(c, 20.1) !== 'repas', 'les autres sont rentrés');
  // (le matinal se couche avant les autres, le couche-tard après)
  const coucher = (v) => journeeDuVillage(s).get(v.id).filter((x) => x.etat === 'dormir').pop().de;
  assert(coucher(a) < coucher(c) && coucher(c) < coucher(b), `les couchers : ${coucher(a)}, ${coucher(c)}, ${coucher(b)}`);
  // (lu dans les réglages : sans décalage de sortie, le matinal ne sort plus avant 7 h 30)
  avecReglage('LISTE.matinal.HORAIRE', { LEVER: 0, SORTIE: 0 }, () => {
    s.day += 7; jourSec(s);
    assert(!['dehors', 'flaner'].includes(etat(a, 7.05)), 'le réglage compte');
    assertEqual(horaireDesTraits(a).SORTIE, 0);
  });
  // (sans trait, l'horaire commun)
  assertEqual(horaireDesTraits({ traits: [] }), { FLANER: [0, 0], CHEZ_LUI: 0, DEBUT: 0, FIN: 0, PAUSE: 0, LEVER: 0, SORTIE: 0, MIDI: 0, REPRISE: 0, SOUPER: 0, VEILLEE: 0, COUCHER: 0 });
});

test('la flânerie, le casanier chez lui, le travailleur à son poste avant les autres', () => {
  const { s, V: [a, b] } = ile(2, 2);
  jourSec(s);
  const compte = (v, f, jours = 20) => {
    let n = 0;
    for (let d = 0; d < jours; d++) { s.day += 1; n += journeeDuVillage(s).get(v.id).filter(f).reduce((t, x) => t + (x.a - x.de), 0); }
    s.day -= jours;
    return n;
  };
  // (le flâneur flâne plus que le travailleur : FLANER, BUTS.banc)
  a.traits = ['flaneur', 'reveur']; b.traits = ['travailleur', 'soigneux'];
  const fa = compte(a, (x) => x.etat === 'flaner'), fb = compte(b, (x) => x.etat === 'flaner');
  assert(fa > fb * 1.5, `le flâneur flâne (${fa.toFixed(1)} h) plus que le travailleur (${fb.toFixed(1)} h)`);
  // (le casanier reste chez lui à certains créneaux du jour : CHEZ_LUI)
  a.traits = ['casanier', 'gourmand'];
  const chez = compte(a, (x) => x.etat === 'rentrer' && x.de >= 8 && x.a <= 18);
  assert(chez > 2, `le casanier chez lui en journée (${chez.toFixed(1)} h)`);
  assertEqual(compte(b, (x) => x.etat === 'rentrer' && x.de >= 8 && x.a <= 18), 0, 'pas les autres');
  avecReglage('LISTE.casanier.CHEZ_LUI', 0, () => assertEqual(compte(a, (x) => x.etat === 'rentrer' && x.de >= 8 && x.a <= 18), 0, 'le réglage compte'));
  // (le travailleur, avec une tâche, est à son poste dès 7 h 30 et jusqu'à 17 h ; l'autre de 8 h à 16 h 30)
  a.traits = ['bavard', 'gourmand'];
  s.outils = { hache: true, pioche: true, faux: true, canne: true, choisi: 'hache' };
  for (const v of [a, b]) { v.outil = 'faux'; assert(attribuer(s, v.id, 'fauchage').ok, 'la tâche'); }
  const t = (v, h) => positionVillageois(s, v.id, h).etat;
  assertEqual(t(b, 7.75), 'travail', 'le travailleur au travail à 7 h 45');
  assert(t(a, 7.75) !== 'travail', 'pas l\'autre');
  assertEqual(t(b, 16.75), 'travail', 'encore à 16 h 45');
  // (le rendement ne change pas : le même nombre d'actions par jour)
  assertEqual(actionsDuJour(s, a), actionsDuJour(s, b), 'les mêmes actions');
});

/* ---------- la parole ---------- */

test('la parole : le bavard en dit plus, le réservé moins et court ; le poids des sujets ; ses phrases ; ses répliques', () => {
  const { s, V: [a, b, c] } = ile(5, 3);
  jourSec(s);
  a.traits = ['bavard', 'gourmand']; b.traits = ['reserve', 'reveur']; c.traits = ['soigneux', 'casanier'];
  assertEqual([partDesTraits(a), partDesTraits(b), partDesTraits(c)], [LISTE.bavard.PAROLE.PART, LISTE.reserve.PAROLE.PART, 1]);
  assertEqual([causeDesTraits(a), causeDesTraits(b), causeDesTraits(c)], [LISTE.bavard.SCENE.CAUSE, LISTE.reserve.SCENE.CAUSE, 1]);
  assertEqual(liensPourLaCarte(s).cause, { [a.id]: LISTE.bavard.SCENE.CAUSE, [b.id]: LISTE.reserve.SCENE.CAUSE }, 'la scène reçoit les facteurs');
  // (le réservé ne dit pas son humeur ; les autres, si)
  const pa = paroleVillageois(s, a.id, { heure: 10, activite: 'dehors' }), pb = paroleVillageois(s, b.id, { heure: 10, activite: 'dehors' });
  assert(pa.humeurTexte && !pb.humeurTexte, 'la bulle du réservé est courte');
  // (au même moment, ils ne disent pas la même chose : le bavard parle de ses amis ou de lui, plus souvent)
  let propos = { a: 0, b: 0 };
  for (let n = 0; n < 80; n++) {
    s.propos = {};
    if (parlerVillageois(s, a.id, paroleVillageois(s, a.id, { heure: 10, activite: 'dehors', n }), { n }).propos) propos.a++;
    if (parlerVillageois(s, b.id, paroleVillageois(s, b.id, { heure: 10, activite: 'dehors', n }), { n }).propos) propos.b++;
  }
  assert(propos.a > propos.b * 2, `le bavard dit plus de sujets du moment (${propos.a} contre ${propos.b})`);
  // (le poids des sujets : direSujet au poids, le même tirage)
  const S = [{ id: 'x', mots: {} }, { id: 'lune_pleine', mots: {} }], ph = { x: ['X'], lune_pleine: ['L'] };
  let lune = 0;
  for (let k = 0; k < 200; k++) { s.propos = {}; const u = (k + 0.5) / 200; if (direSujet(s, 'q', S, ph, () => u, (id) => (id.startsWith('lune_') ? 3 : 1)).id === 'lune_pleine') lune++; }
  assertEqual(lune, 150, 'trois fois plus de lune pour le rêveur');
  s.propos = {};
  assertEqual(direSujet(s, 'q', S, ph, () => 0.25).id, 'x', 'sans poids : comme avant');
  // (ses phrases : un trait à découvrir d'abord ; {plat} : un plat)
  const vu = new Set();
  for (let k = 0; k < 40; k++) { const u = ((k * 37) % 100) / 100; const p = phraseTrait(a, () => u); vu.add(p.trait); assert(!/\{/.test(p.texte), p.texte); assert(p.texte.length <= 96, p.texte); }
  assertEqual([...vu].sort(), ['bavard', 'gourmand'], 'ses deux traits');
  a.traitsConnus = ['bavard'];
  for (let k = 0; k < 10; k++) assertEqual(phraseTrait(a, () => k / 10).trait, 'gourmand', 'celui qu\'on ne connaît pas');
  a.traitsConnus = [];
  // (toutes les phrases de traits tiennent en une bulle)
  for (const [id, d] of Object.entries(LISTE)) for (const p of d.PHRASES || []) assert(p.length <= 96, `${id} : ${p}`);
  // (ses répliques : une fois sur PAROLE.REPLIQUE, en croisant un autre)
  let dites = 0;
  const lignes = new Set();
  for (let n = 0; n < 100; n++) {
    const r = echangeVillageois(s, a.id, c.id, { n, sorte: 'croise', heure: 10 });
    if (r && r.trait) { dites++; lignes.add(r.lignes[0]); assert(LISTE[r.trait].REPLIQUES.some((p) => r.lignes[0].startsWith(p[0].split('{')[0].slice(0, 6))), r.lignes[0]); }
  }
  assert(dites > 10 && dites < 60, `des répliques de trait (${dites} sur 100)`);
  assertEqual(echangeVillageois(s, c.id, a.id, { n: 3, sorte: 'croise', heure: 10 }).trait, undefined, 'le soigneux n\'en a pas');
  avecReglage('PAROLE.REPLIQUE', 0, () => {
    for (let n = 0; n < 30; n++) assertEqual(echangeVillageois(s, a.id, c.id, { n, sorte: 'croise', heure: 10 }).trait, undefined, 'le réglage compte');
  });
});

/* ---------- les postes, les affinités ---------- */

test('les postes : plus heureux à la tâche qu\'il aime, un peu moins à celle qu\'il boude ; un ami proche ne boude pas', () => {
  const { s, V: [a, b] } = ile(6, 2);
  a.traits = ['matinal', 'bavard']; b.traits = ['matinal', 'reveur'];
  const P = TR.POSTES, aime = poste('matinal', 'aime'), boude = poste('matinal', 'boude');
  assertEqual([goutTache(a, aime), goutTache(a, boude), goutTache(a, 'pierre')], ['aime', 'boude', null]);
  // (une tâche qu'un trait aime et qu'un autre boude ne compte pas)
  assertEqual(goutTache({ traits: ['couche_tard', 'reserve'] }, 'peche'), 'aime');
  assertEqual(goutTache({ traits: ['bavard', 'reveur'] }, 'peche'), 'boude');
  assertEqual(goutTache({ traits: ['reserve', 'bavard', 'soigneux'] }, 'navette'), null, 'aimée et boudée : rien');
  const auPoste = (v, tache, actions = 3) => { v.tache = tache; v.travail = { jour: s.day, tache, actions, produit: {}, essai: 0 }; };
  auPoste(a, aime);
  assertEqual(bonheurDesTraits(s, a), P.AIME, 'à la tâche qu\'il aime');
  auPoste(a, boude);
  assertEqual(bonheurDesTraits(s, a), -P.BOUDE, 'à celle qu\'il boude');
  auPoste(a, boude, 0);
  assertEqual(bonheurDesTraits(s, a), 0, 'sans y avoir travaillé : rien');
  // (dès « proche », il accepte la tâche qu'il boude sans perdre d'humeur)
  auPoste(a, boude);
  ajouterAmitie(s, a.id, 400);
  assertEqual(bonheurDesTraits(s, a), 0, 'un ami proche');
  // (la nuit : la cible de bonheur suit ; le bonheur ne baisse jamais)
  const t = copie(s);
  const A = t.villageois[0], B = t.villageois[1];
  A.bonheur = B.bonheur = 50; A.traits = B.traits = ['matinal', 'bavard'];
  B.traits = ['matinal', 'reveur'];
  for (const v of [A, B]) { v.tache = aime; v.travail = { jour: t.day, tache: aime, actions: 3, produit: {}, essai: 0 }; }
  B.travail.tache = B.tache = 'pierre';
  villageoisNuit(t);
  assert(A.bonheur > B.bonheur, `plus heureux à la tâche qu'il aime (${A.bonheur} contre ${B.bonheur})`);
  avecReglage('POSTES.AIME', 0, () => assertEqual(bonheurDesTraits(t, { ...A, travail: { jour: t.day, tache: aime, actions: 3 } }), 0, 'le réglage compte'));
});

test('les affinités : des traits qui s\'accordent font monter l\'affinité plus vite ; aucun ne la fait baisser', () => {
  const { s, V: [a, b, c, d] } = ile(7, 4);
  a.traits = ['matinal', 'bavard']; b.traits = ['matinal', 'taquin'];       // deux accords : matinal + matinal, bavard + taquin
  c.traits = ['couche_tard', 'reserve']; d.traits = ['curieux', 'travailleur']; // aucun
  assertEqual([gainAccords(a, b), gainAccords(c, d)], [2 * TR.ACCORD.GAIN, 0]);
  assertEqual(gainAccords(a, { traits: ['matinal', 'travailleur', 'taquin'] }), TR.ACCORD.MAX * TR.ACCORD.GAIN, 'ACCORD.MAX au plus');
  for (const [x, y] of [[a, b], [c, d]]) poserAffinite(s, x.id, y.id, 20);
  liensNuit(s);
  const da = affiniteGardee(s, a.id, b.id) - 20, dc = affiniteGardee(s, c.id, d.id) - 20;
  assertEqual(da - dc, 2 * TR.ACCORD.GAIN, `les accords en plus (${da} contre ${dc})`);
  // (aucune paire ne baisse : même des opposés)
  const avant = affiniteGardee(s, a.id, c.id);
  s.day += 1; liensNuit(s);
  assert(affiniteGardee(s, a.id, c.id) >= avant, 'un matinal et un couche-tard : jamais de baisse');
});

/* ---------- la découverte ---------- */

test('la découverte : vu trois matins dehors avant les autres, il est « matinal » ; entendu deux fois ; la fiche dit « ? »', () => {
  const { s, V: [a, b] } = ile(8, 2);
  jourSec(s);
  a.traits = ['matinal', 'bavard']; b.traits = ['couche_tard', 'reveur'];
  // (la fiche : deux « ? »)
  assertEqual(traitsPourFiche(a).traits.map((t) => t.nom), ['?', '?']);
  // (vu dehors à 7 h 05, trois jours : révélé ; une fois par jour seulement)
  assertEqual(observerTraits(s, [a.id, b.id], 7.05), [], 'un premier matin');
  assertEqual(observerTraits(s, [a.id], 7.1), [], 'le même matin ne compte pas deux fois');
  assertEqual(a.indices.matinal[0], 1);
  assertEqual(observerTraits(s, [b.id], 7.05), [], 'le couche-tard n\'est pas dehors');
  s.day += 1; jourSec(s);
  assertEqual(observerTraits(s, [a.id], 7.05), [], 'un deuxième matin');
  s.day += 1; jourSec(s);
  assertEqual(observerTraits(s, [a.id], 7.05), [{ id: a.id, trait: 'matinal' }], 'le troisième : révélé');
  assertEqual(traitsConnus(a), ['matinal']);
  assert(a.avis.includes('trait:matinal'), 'la page le dira');
  const F = traitsPourFiche(a);
  assertEqual(F.traits.map((t) => t.nom), [LISTE.matinal.nom[a.genre === 'm' ? 1 : 0], '?'], 'noté dans la fiche, l\'autre reste « ? »');
  assertEqual([F.aime, F.boude], [[poste('matinal', 'aime')], [poste('matinal', 'boude')]], 'sa tâche préférée, celle qu\'il boude');
  // (le couche-tard, vu au souper après 20 h)
  for (let k = 0; k < 3; k++) { s.day += 1; jourSec(s); observerTraits(s, [b.id], 20.1); }
  assertEqual(traitsConnus(b), ['couche_tard']);
  // (entendu : DIT fois)
  assert(!noterIndice(s, a, 'bavard', 'dit'), 'une première fois');
  assert(noterIndice(s, a, 'bavard', 'dit'), 'la deuxième : révélé');
  assertEqual(traitsConnus(a), ['matinal', 'bavard']);
  assert(!noterIndice(s, a, 'reveur', 'dit'), 'pas un de ses traits');
  // (en lui parlant : une fois sur PAROLE.CHANCE, une phrase d'un trait à découvrir)
  avecReglage('PAROLE.CHANCE', 1, () => {
    const r = parlerVillageois(s, b.id, paroleVillageois(s, b.id, { heure: 10, activite: 'dehors', n: 1 }), { n: 1 });
    assertEqual(r.trait, 'reveur', 'il parle du trait qu\'on ne connaît pas');
    assert(LISTE.reveur.PHRASES.includes(r.texte), r.texte);
  });
  // (le tableau : la marque « à son goût » une fois le trait connu)
  a.tache = poste('matinal', 'aime');
  assertEqual(bilanVillageois(s, a.id).gout, 'aime');
  b.tache = poste('reveur', 'aime');
  assertEqual(bilanVillageois(s, b.id).gout, null, 'le rêveur n\'est pas encore connu');
});

/* ---------- la sauvegarde ---------- */

test('la sauvegarde : v93 → v94, les villageois d\'avant reçoivent leurs traits ; réparés ; éteint, rien', () => {
  const { s, V } = ile(9, 4);
  assertEqual(s.version, STATE_VERSION);
  const vieille = copie(s);
  vieille.version = 92;
  for (const v of vieille.villageois) { delete v.traits; delete v.traitsConnus; delete v.indices; }
  vieille.villageois[3].enfant = true;
  const m = migrate({ v: 1, t: 0, s: vieille });
  assertEqual(m.version, STATE_VERSION);
  const W = m.villageois.slice(0, 3);
  for (const v of W) assertEqual([traitsValides(v.traits), v.traitsConnus, v.indices], [true, [], {}]);
  assertEqual(new Set(W.map((v) => cle(v.traits))).size, 3, 'pas deux fois la même liste');
  assertEqual(m.villageois[3].traits, undefined, 'un enfant n\'en a pas');
  assertEqual(copie(migrate({ v: 1, t: 0, s: copie(vieille) }).villageois), copie(m.villageois), 'déterministe');
  // (tirés de sa graine et de son rang : les mêmes qu'à l'arrivée, s'il était le premier)
  assertEqual(W[0].traits, V[0].traits, 'le premier : les mêmes traits');
  // (abîmés : réparés)
  const abime = copie(s);
  abime.villageois[0].traits = ['matinal', 'couche_tard'];
  abime.villageois[2].traits = [...abime.villageois[1].traits];
  abime.villageois[2].traitsConnus = 'bavard';
  abime.villageois[3].traitsConnus = ['inconnu', abime.villageois[3].traits[0], abime.villageois[3].traits[0]];
  abime.villageois[3].indices = { [abime.villageois[3].traits[1]]: [2, 4], zzz: [1, 1], [`${abime.villageois[3].traits[1]}:dit`]: 'x' };
  const R = reparerTraits(abime).villageois;
  for (const v of R) assert(traitsValides(v.traits), `${v.id} : ${v.traits}`);
  assertEqual(new Set(R.map((v) => cle(v.traits))).size, 4, 'quatre listes');
  assertEqual(R[3].traitsConnus, [s.villageois[3].traits[0]]);
  assertEqual(R[3].indices, { [s.villageois[3].traits[1]]: [2, 4] });
  // (une partie neuve, sans villageois : rien)
  const sans = copie(partie(12));
  sans.version = 92;
  assert(!('villageois' in migrate({ v: 1, t: 0, s: sans })), 'rien sans villageois');
});

test('éteint : ni traits, ni observation, ni bonheur des traits', () => {
  const { s, V: [a] } = ile(10, 1);
  avecVillage(() => {
    assertEqual(observerTraits(s, [a.id], 7.05), []);
    assertEqual(bonheurDesTraits(s, a), 0);
  }, false);
});
