/* ==========================================================================
   Tests du chantier « l'île à bâtir » : la chronique et les noms (fiche I7g ; docs/ile.md ; js/engine/chronique.js,
   js/engine/noms.js, js/ui/chronique-html.js). Comme tous les fichiers tests/engine/village-*.test.mjs, il tourne avec
   VILLAGE.ACTIF forcé à true.
   - les noms : l'île nommée à la graine, bornés comme le nom de famille, proposés à la graine (« un autre nom »), le
     village nommé au troisième villageois, un commerce à son ouverture, une maison ;
   - chaque moment écrit sa ligne une seule fois : l'arrivée (une fois la famille configurée), la première récolte, la
     première vente au port, chaque villageois (et l'enfant), le nom du village, le dixième villageois, chaque palier,
     chaque niveau du port, un commerce ouvert, deux proches, un foyer, une fête, un projet ;
   - la borne et le résumé par mois (les lignes épinglées gardées ; une ligne résumée ne se réécrit pas) ;
   - renommer met à jour l'affichage, pas les lignes passées (le baptême du jour, lui, est corrigé) ;
   - les épingles et les notes (bornées, échappées à l'affichage) ;
   - les souvenirs des villageois (VILLAGE.PROPOS, souvenir_<type>) ;
   - la sauvegarde (v95 → v96) ; éteint : rien.
   Lancer seul : node tests/run-tests.mjs village-chronique.
   ========================================================================== */

import {
  agrandirPort, arriverVillageois, awakeMsAtHour, assurerArrivee, bornerChronique, chroniqueAEcrit, chroniqueArrivee, chroniqueDe, chroniqueParMois,
  chroniqueVente, commerceEnPhrase, commerceOuvert, completeChapter, DATA, epinglerLigne, lignesEpinglees, migrate, noteCropHarvested,
  nomAffiche, nomDe, nomRefus, nommerCommerce, nomsDe, noterChronique, noterLigne, proposerNom, renommer, renommerEtNoter,
  reparerChronique, runNight, souvenirsDe, STATE_VERSION, sujetsVillageois, testMaisonVillageois, texteLigne,
} from '../../js/engine/index.js';
import { chroniqueHtml, noteHtml, renommerHtml } from '../../js/ui/chronique-html.js';
import { assert, assertEqual, avecVillage, boite, partie, test } from './aide.mjs';

const copie = (o) => JSON.parse(JSON.stringify(o));
const CH = DATA.VILLAGE.CHRONIQUE;
const lignes = (s, type) => s.chronique.lignes.filter((l) => l.type === type);
const textes = (s) => s.chronique.lignes.map((l) => texteLigne(l).texte);

// La partie d'essai : n maisons, n villageois arrivés aujourd'hui.
function ile(seed = 1, n = 3) {
  const s = partie(seed);
  if (!s.blocs) s.blocs = {};
  for (let k = 0; k < n; k++) assert(testMaisonVillageois(s, 1).ok, `maison ${k + 1}`);
  boite(s, { pain: 300 });
  for (let k = 0; k < n; k++) assert(arriverVillageois(s, { direct: true }).ok, `villageois ${k + 1}`);
  return { s, V: s.villageois };
}

test('les noms : l\'île nommée à la graine, bornés comme le nom de famille, proposés à la graine', () => {
  const s = partie(1);
  assert(nomDe(s, 'ile'), 'une partie neuve du chantier a une île nommée');
  assertEqual(nomDe(s, 'village'), null, 'pas encore de village');
  assertEqual(nomDe(partie(1), 'ile'), nomDe(s, 'ile'), 'la même graine, le même nom');
  const autres = new Set([1, 2, 3, 4, 5, 6].map((g) => nomDe(partie(g), 'ile')));
  assert(autres.size >= 3, `des noms différents selon la graine (${[...autres].join(', ')})`);
  // (« un autre nom » : le rang suivant ; jamais au-delà de NOM_MAX)
  const props = new Set([0, 1, 2, 3, 4, 5].map((r) => proposerNom(s, 'village', null, r)));
  assert(props.size >= 3, 'un autre nom change le nom proposé');
  for (const t of [...props, ...autres]) assertEqual(nomRefus(t), null, `« ${t} » est dans les bornes`);
  // (les bornes de DEPART)
  const D = DATA.DEPART;
  assert(nomRefus('x'.repeat(D.NOM_MIN - 1)), 'trop court');
  assert(nomRefus('x'.repeat(D.NOM_MAX + 1)), 'trop long');
  assert(!renommer(s, 'village', 'x'.repeat(D.NOM_MAX + 1)).ok, 'refusé');
  assert(renommer(s, 'village', '  Pré   aux\nLoups ').ok);
  assertEqual(nomDe(s, 'village'), 'Pré aux Loups', 'nettoyé : les blancs repliés');
  assertEqual(nomAffiche(s), 'Pré aux Loups', 'le panneau et le titre suivent le village');
  // (une maison : nommée, puis le nom effacé)
  assert(renommer(s, 'maison', 'Les Glycines', 1234).ok);
  assertEqual(nomDe(s, 'maison', 1234), 'Les Glycines');
  assert(renommer(s, 'maison', '', 1234).ok);
  assertEqual(nomDe(s, 'maison', 1234), null);
  // (un commerce : un nom proposé à la graine, gardé, dans une phrase)
  const n1 = nommerCommerce(s, 'c-1', { sorte: 'forge' });
  assert(/^Forge /.test(n1), n1);
  assertEqual(nommerCommerce(s, 'c-1', { sorte: 'forge' }), n1, 'gardé');
  assertEqual(commerceEnPhrase('Forge du Vieux Chêne', 'forge'), 'la forge du Vieux Chêne');
  assertEqual(commerceEnPhrase('La Belle Enclume', 'forge'), 'la forge « La Belle Enclume »');
  assertEqual(commerceEnPhrase('Échoppe du Port', 'atelier_inconnu'), 'l\'échoppe du Port');
});

test('l\'arrivée : écrite une fois, quand la famille est configurée, datée du jour 1', () => {
  const s = partie(2);
  s.famille.configuree = false;
  assertEqual(assurerArrivee(s), null, 'pas avant le départ');
  assertEqual(s.chronique.lignes.length, 0);
  s.famille.configuree = true;
  s.day = 3;
  assert(assurerArrivee(s), 'la famille débarque');
  assertEqual(assurerArrivee(s), null, 'une seule fois');
  const [l] = lignes(s, 'arrivee');
  assertEqual(l.jour, 1, 'le jour 1');
  assert(texteLigne(l).texte.includes(nomDe(s, 'ile')), texteLigne(l).texte);
  assert(/^La famille (.+ )?débarque sur l'Île/.test(texteLigne(l).texte) || !/^Île/.test(nomDe(s, 'ile')), 'l\'Île, dans une phrase');
});

test('chaque moment écrit sa ligne une seule fois', () => {
  const { s, V } = ile(3, 3);
  // les villageois, puis le village nommé au troisième
  assertEqual(lignes(s, 'villageois').map((l) => l.d.qui), V.map((v) => v.id), 'une ligne par villageois');
  assertEqual(lignes(s, 'village').length, 1, 'le village prend un nom au troisième');
  assertEqual(lignes(s, 'village')[0].d.village, nomDe(s, 'village'));
  assert(s.noms.avis.includes('village'), 'la page proposera de le changer');
  assertEqual(chroniqueArrivee(s, V[0]).length, 0, 'pas deux fois le même villageois');
  // la première récolte, la première vente
  noteCropHarvested(s, 'carotte'); noteCropHarvested(s, 'patate');
  assertEqual(lignes(s, 'recolte').length, 1);
  assert(texteLigne(lignes(s, 'recolte')[0]).texte.includes('carotte'));
  chroniqueVente(s, 'carotte'); chroniqueVente(s, 'oeuf');
  assertEqual(lignes(s, 'vente').length, 1);
  // un palier (completeChapter), deux fois le même : une ligne
  completeChapter(s);
  const p = lignes(s, 'palier');
  assertEqual(p.length, 1);
  assertEqual(p[0].d.n, 1);
  assertEqual(noterChronique(s, 'palier', { n: 1, titre: 'x' }), null, 'le même palier ne se réécrit pas');
  // le port
  assert(noterChronique(s, 'port', { niveau: 2 }));
  assertEqual(noterChronique(s, 'port', { niveau: 2 }), null);
  // un commerce (la fiche I5a l'appellera)
  const c = commerceOuvert(s, { id: 'forge-1', sorte: 'forge', qui: V[0].id });
  assert(c, 'la ligne du commerce');
  assertEqual(texteLigne(c).texte, `${V[0].prenom} ouvre ${commerceEnPhrase(nomDe(s, 'commerce', 'forge-1'), 'forge')}.`);
  assert(/ouvre la forge /.test(texteLigne(c).texte), texteLigne(c).texte);
  assertEqual(commerceOuvert(s, { id: 'forge-1', sorte: 'forge', qui: V[0].id }), null);
  // deux proches, un foyer (dans les deux sens : la même paire)
  assert(noterChronique(s, 'proche', { a: V[0].id, b: V[1].id, pa: V[0].prenom, pb: V[1].prenom }));
  assertEqual(noterChronique(s, 'proche', { a: V[0].id, b: V[1].id, pa: V[0].prenom, pb: V[1].prenom }), null);
  assert(noterChronique(s, 'foyer', { id: 'fy-1', a: V[0].id, b: V[1].id, pa: V[0].prenom, pb: V[1].prenom }));
  assertEqual(noterChronique(s, 'foyer', { id: 'fy-1', a: V[0].id, b: V[1].id }), null);
  // une fête, un projet (I8a les appellera aussi)
  assert(noterChronique(s, 'fete', { id: 'place', jour: s.day, nom: 'la fête du village', lieu: 'sur la place' }));
  assertEqual(noterChronique(s, 'fete', { id: 'place', jour: s.day, nom: 'la fête du village' }), null);
  assertEqual(texteLigne(lignes(s, 'fete')[0]).texte, 'La fête du village sur la place.');
  assert(noterChronique(s, 'projet', { id: 'four', lieu: nomDe(s, 'village'), nom: 'le four à pain' }));
  assertEqual(noterChronique(s, 'projet', { id: 'four', lieu: 'x', nom: 'y' }), null);
  // le récit d'avant (I7f) : sa place, une ligne « avant »
  assert(noterChronique(s, 'avant', { id: 'recit', texte: 'Avant l\'île, la famille vivait à la ferme.' }));
  // le dixième villageois
  while (s.villageois.length < 9) s.villageois.push({ id: `vg-${s.villageois.length + 1}`, prenom: 'X' });
  assert(testMaisonVillageois(s, 1).ok);
  const r = arriverVillageois(s, { direct: true });
  assert(r.ok, r.error);
  assertEqual(lignes(s, 'dixieme').length, 1, 'le dixième');
  assert(texteLigne(lignes(s, 'dixieme')[0]).texte.includes(nomDe(s, 'village')), 'avec le nom du village');
  // l'arrivée, d'abord
  assertEqual(s.chronique.lignes[0].type, 'arrivee', 'l\'arrivée en premier');
  // et des clés toutes différentes
  const cles = s.chronique.lignes.map((l) => l.cle).filter(Boolean);
  assertEqual(new Set(cles).size, cles.length, 'une clé, une ligne');
  assertEqual(noterChronique(s, 'inconnu', {}), null, 'un type inconnu : rien');
});

test('les moments branchés : le port agrandi, une nuit où deux villageois deviennent proches', () => {
  const { s, V } = ile(4, 2);
  // (le port : agrandirPort écrit sa ligne)
  s.port.niveau = 1;
  const prix = DATA.PORT.NIVEAUX[1].prix;
  s.port.chantier = Object.fromEntries(Object.entries(prix).filter(([k]) => k !== 'pieces'));
  s.pieces = prix.pieces + 10;
  s.awakeMs = awakeMsAtHour(10);
  const r = agrandirPort(s, null, { sansPresence: true });
  assert(r.ok, r.error);
  assertEqual(lignes(s, 'port').map((l) => l.d.niveau), [2]);
  // (les liens : une paire passe « proche » pendant la nuit)
  const a = V[0], b = V[1];
  s.liens = { ordre: [a.id, b.id], aff: (74).toString(36).padStart(2, '0'), foyers: [], entraide: [] };
  runNight(s);
  const pr = lignes(s, 'proche');
  assertEqual(pr.length, 1, 'devenus proches cette nuit');
  assertEqual([pr[0].d.a, pr[0].d.b], [a.id, b.id].sort());
});

test('la borne : au-delà de MAX, les mois les plus anciens se résument ; les épinglées restent', () => {
  const s = partie(5);
  const max = CH.MAX;
  s.day = 1;
  assurerArrivee(s);
  let k = 0;
  // (trois mois de lignes : MAX + 30 lignes en tout)
  for (let d = 1; d <= 3 * DATA.LUNE.JOURS_MOIS && k < max + 30; d++) {
    s.day = d;
    for (let i = 0; i < 4 && k < max + 30; i++, k++) noterChronique(s, 'fete', { id: `f${k}`, jour: d, nom: `la fête ${k}` });
  }
  const premiere = s.chronique.lignes.find((l) => l.type === 'fete');
  assert(epinglerLigne(s, premiere.n, true).ok, 'épinglée');
  assert(noterLigne(s, premiere.n, 'Le jour où tout a commencé.').ok);
  s.day = 4 * DATA.LUNE.JOURS_MOIS + 1;
  for (let i = 0; i < 20; i++) noterChronique(s, 'projet', { id: `p${i}`, lieu: 'Le Gué', nom: `projet ${i}` });
  assert(s.chronique.lignes.length <= max, `bornée (${s.chronique.lignes.length} ≤ ${max})`);
  const R = lignes(s, 'mois');
  assert(R.length >= 1, 'des mois résumés');
  assert(s.chronique.lignes.some((l) => l.n === premiere.n && l.note), 'l\'épinglée et sa note sont gardées');
  assert(lignes(s, 'arrivee').length === 1, 'l\'arrivée ne se résume pas');
  const total = R.reduce((t, l) => t + (l.d.compte.fete || 0), 0) + lignes(s, 'fete').length;
  assertEqual(total, max + 30, 'rien ne se perd : chaque fête est comptée');
  assert(/^En \w+ : \d+ fêtes\.$/.test(texteLigne(R[R.length - 1]).texte) || /^De /.test(texteLigne(R[0]).texte), texteLigne(R[0]).texte);
  // (une ligne résumée ne se réécrit pas : la clé est gardée)
  const p = { ...s.chronique };
  void p;
  s.chronique.faits.push('palier:1');
  assertEqual(noterChronique(s, 'palier', { n: 1 }), null, 'le palier déjà résumé ne revient pas');
  // (la fenêtre : du plus récent au plus ancien)
  const M = chroniqueParMois(s);
  assert(M.length >= 2);
  for (let i = 1; i < M.length; i++) assert(M[i - 1].mois > M[i].mois, 'les mois du plus récent au plus ancien');
  for (const m of M) for (let i = 1; i < m.lignes.length; i++) if (!m.lignes[i].resume && !m.lignes[i - 1].resume) assert(m.lignes[i - 1].jour >= m.lignes[i].jour, 'les lignes aussi');
  // (bornerChronique est stable)
  const avant = JSON.stringify(s.chronique);
  bornerChronique(s);
  assertEqual(JSON.stringify(s.chronique), avant);
});

test('épingler : EPINGLES au plus ; un résumé ne s\'épingle pas', () => {
  const s = partie(6);
  for (let i = 0; i < CH.EPINGLES + 2; i++) noterChronique(s, 'fete', { id: `f${i}`, jour: i, nom: 'la fête' });
  const L = lignes(s, 'fete');
  for (let i = 0; i < CH.EPINGLES; i++) assert(epinglerLigne(s, L[i].n, true).ok);
  assert(!epinglerLigne(s, L[CH.EPINGLES].n, true).ok, 'pas plus de EPINGLES');
  assertEqual(lignesEpinglees(s).length, CH.EPINGLES);
  assert(epinglerLigne(s, L[0].n, false).ok, 'détachée');
  assert(epinglerLigne(s, L[CH.EPINGLES].n, true).ok, 'la place libérée');
  s.chronique.lignes.push({ n: 999, jour: 1, type: 'mois', d: { de: 1, a: 14, compte: { fete: 2 } } });
  assert(!epinglerLigne(s, 999, true).ok);
  assert(!noterLigne(s, 999, 'x').ok);
  assert(!epinglerLigne(s, 12345, true).ok, 'une ligne qui n\'est plus là');
});

test('renommer met à jour l\'affichage, pas les lignes passées ; le baptême du jour est corrigé', () => {
  const { s } = ile(7, 3);
  const nom1 = nomDe(s, 'village');
  // (le jour même : le baptême prend le nom choisi, pas de ligne en plus)
  let r = renommerEtNoter(s, 'village', 'Val-Joli');
  assert(r.ok, r.error);
  assertEqual(lignes(s, 'village').length, 1);
  assertEqual(lignes(s, 'village')[0].d.village, 'Val-Joli', 'le baptême du jour corrigé');
  assert(lignes(s, 'village_nom').length === 0);
  void nom1;
  // (plus tard : l'affichage change, les lignes passées gardent leur nom ; une ligne de plus)
  s.day += 5;
  r = renommerEtNoter(s, 'village', 'Mont-Doré');
  assert(r.ok);
  assertEqual(nomAffiche(s), 'Mont-Doré', 'le panneau et le titre');
  assertEqual(lignes(s, 'village')[0].d.village, 'Val-Joli', 'la ligne passée garde son nom');
  assertEqual(lignes(s, 'village_nom').length, 1);
  assert(texteLigne(lignes(s, 'village_nom')[0]).texte.includes('Mont-Doré'));
  assert(chroniqueHtml(s).includes('La chronique de Mont-Doré'), 'le titre de la fenêtre');
  assert(chroniqueHtml(s).includes('Val-Joli'), 'la ligne passée, telle quelle');
  // (l'île aussi ; un nom refusé ne change rien)
  const ile0 = nomDe(s, 'ile');
  assert(!renommerEtNoter(s, 'ile', 'x').ok);
  assertEqual(nomDe(s, 'ile'), ile0);
  assert(renommerEtNoter(s, 'ile', 'Île Lointaine').ok);
  assert(lignes(s, 'arrivee')[0].d.ile !== 'Île Lointaine', 'l\'arrivée garde le nom de son jour');
  assertEqual(lignes(s, 'ile_nom').length, 1);
  // (renommer pareil : rien)
  const n = s.chronique.lignes.length;
  assert(renommerEtNoter(s, 'ile', 'Île Lointaine').ok);
  assertEqual(s.chronique.lignes.length, n);
});

test('les notes du joueur : bornées, d\'une ligne, échappées à l\'affichage', () => {
  const { s } = ile(8, 1);
  const l = lignes(s, 'villageois')[0];
  const mechant = '<img src=x onerror="alert(1)"> & « joli »\n\tsuite ' + 'z'.repeat(400);
  const r = noterLigne(s, l.n, mechant);
  assert(r.ok, r.error);
  assertEqual(Array.from(l.note).length, CH.NOTE_MAX, 'bornée à NOTE_MAX signes');
  assert(!/[\n\t]/.test(l.note), 'une ligne');
  assert(l.epingle, 'la ligne s\'épingle');
  const html = chroniqueHtml(s);
  assert(!html.includes('<img src=x'), 'pas de balise du joueur dans la page');
  assert(html.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; « joli »'), 'échappée');
  assert(!noteHtml(s, l.n).includes('<img src=x'), 'le champ de la note aussi');
  // (un nom aussi : échappé dans la fenêtre et le champ)
  assert(renommer(s, 'village', '<b>Bourg</b>').ok);
  assert(!chroniqueHtml(s).includes('<b>Bourg'), 'le nom échappé');
  assert(!renommerHtml(s, 'village', nomDe(s, 'village')).includes('<b>Bourg'));
  // (effacer)
  assert(noterLigne(s, l.n, '   ').ok);
  assert(!('note' in l), 'la note effacée');
});

test('les souvenirs : un villageois reprend une ligne où il figure, après quelques jours', () => {
  const { s, V } = ile(9, 3);
  const [a, b] = V;
  noterChronique(s, 'proche', { a: a.id, b: b.id, pa: a.prenom, pb: b.prenom });
  commerceOuvert(s, { id: 'm-1', sorte: 'mercerie', qui: a.id });
  const ids = (v) => sujetsVillageois(s, v).filter((x) => x.id.startsWith('souvenir_')).map((x) => x.id);
  assertEqual(ids(a), [], 'pas le jour même');
  s.day += CH.SOUVENIR.DEPUIS;
  assertEqual(souvenirsDe(s, a.id).length, 3, 'son arrivée, le lien, le commerce');
  assertEqual(ids(a).sort(), ['souvenir_commerce', 'souvenir_proche', 'souvenir_villageois']);
  const pr = sujetsVillageois(s, a).find((x) => x.id === 'souvenir_proche');
  assertEqual(pr.mots.autre, b.prenom, 'l\'autre de la ligne');
  assertEqual(pr.mots.jours, CH.SOUVENIR.DEPUIS);
  const co = sujetsVillageois(s, a).find((x) => x.id === 'souvenir_commerce');
  assert(/^la mercerie /.test(co.mots.commerce) && /^La mercerie /.test(co.mots.Commerce), co.mots.commerce);
  assert(!ids(V[2]).includes('souvenir_proche'), 'le troisième n\'y était pas');
  // (chaque phrase tient en une bulle, une fois remplie)
  for (const [id, L] of Object.entries(DATA.VILLAGE.PROPOS)) {
    if (!id.startsWith('souvenir_')) continue;
    for (const t of L) assert(t.length <= 96, `${id} : « ${t} » tient en une bulle`);
  }
  s.day += CH.SOUVENIR.JUSQUA + 1;
  assertEqual(souvenirsDe(s, a.id).length, 0, 'trop vieux : oublié');
});

test('la sauvegarde : v95 → v96 (les noms et la chronique réparés ; une partie d\'avant, rien)', () => {
  assert(STATE_VERSION >= 96, 'le format 96 ou plus');
  const { s } = ile(10, 3);
  noterLigne(s, s.chronique.lignes[1].n, 'Ma note');
  const vieille = copie(s);
  delete vieille.noms;
  delete vieille.chronique;
  vieille.version = 92;
  const m = migrate({ v: 1, t: 0, s: vieille });
  assertEqual(m.version, STATE_VERSION);
  assert(m.noms && nomDe(m, 'ile'), 'l\'île nommée à la graine');
  assertEqual(nomDe(m, 'ile'), nomDe(s, 'ile'), 'le même nom que la graine donne');
  assertEqual(m.chronique, { seq: 0, lignes: [], faits: [] }, 'une chronique vide');
  // (gardée telle quelle)
  const bonne = copie(s);
  bonne.version = 92;
  const m2 = migrate({ v: 1, t: 0, s: bonne });
  assertEqual(m2.chronique, s.chronique, 'une chronique saine ne change pas');
  assertEqual(m2.noms, s.noms);
  // (abîmée : réparée)
  const abime = copie(s);
  abime.version = 92;
  abime.noms = { ile: 'x', village: 42, commerces: { a: '<ok>', b: 'y'.repeat(99) }, maisons: 'non' };
  abime.chronique = { seq: 'x', lignes: [null, { n: 1, jour: 1, type: 'arrivee', d: { famille: 'A' } }, { n: 1, jour: 2, type: 'fete', d: {} }, { n: 3, jour: 0, type: 'fete' }, { n: 4, jour: 2, type: 'inconnu' }, { n: 5, jour: 2, type: 'fete', d: { nom: 'z' }, note: 'a'.repeat(500), epingle: 'oui' }], faits: [3, 'palier:1'] };
  const m3 = migrate({ v: 1, t: 0, s: abime });
  assert(nomRefus(m3.noms.ile) === null && m3.noms.ile !== 'x', 'l\'île renommée à la graine');
  assertEqual(m3.noms.village, null);
  assertEqual(m3.noms.commerces, { a: '<ok>' });
  assertEqual(m3.noms.maisons, {});
  assertEqual(m3.chronique.lignes.map((l) => l.n), [1, 5]);
  assertEqual(Array.from(m3.chronique.lignes[1].note).length, CH.NOTE_MAX);
  assert(!m3.chronique.lignes[1].epingle);
  assertEqual(m3.chronique.faits, ['palier:1']);
  assertEqual(m3.chronique.seq, 5);
  assertEqual(reparerChronique(null), { seq: 0, lignes: [], faits: [] });
  // (une partie d'avant le chantier : rien)
  avecVillage(() => {
    const sans = copie(partie(11));
    sans.version = 92;
    const m4 = migrate({ v: 1, t: 0, s: sans });
    assert(!('noms' in m4) && !('chronique' in m4), 'rien hors du chantier');
  }, false);
});

test('éteint : ni noms, ni chronique, rien ne s\'écrit', () => {
  avecVillage(() => {
    const s = partie(12);
    assert(!('noms' in s) && !('chronique' in s), 'une partie neuve d\'avant');
    assertEqual(noterChronique(s, 'palier', { n: 1 }), null);
    assertEqual(assurerArrivee(s), null);
    noteCropHarvested(s, 'carotte');
    chroniqueVente(s, 'carotte');
    completeChapter(s);
    assertEqual(nommerCommerce(s, 'c', { sorte: 'forge' }), null);
    assertEqual(commerceOuvert(s, { id: 'c', sorte: 'forge' }), null);
    runNight(s);
    assert(!('noms' in s) && !('chronique' in s), 'toujours rien');
    assert(!renommer(s, 'ile', 'Île Neuve').ok);
    assertEqual(chroniqueAEcrit(s, 'arrivee'), false);
    void chroniqueDe; void nomsDe;
  }, false);
});
