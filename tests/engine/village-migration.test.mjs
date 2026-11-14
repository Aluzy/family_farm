/* ==========================================================================
   Tests du chantier « l'île à bâtir » : la migration des parties en cours (fiche I7f ; docs/ile.md ;
   js/engine/migration-ile.js). Comme tous les fichiers tests/engine/village-*.test.mjs, il tourne avec VILLAGE.ACTIF
   forcé à true.
   - chaque partie d'avant (tests/engine/anciennes-parties.json : les deux d'avant la ferme générée, format 46, et deux
     récentes, format 101, jouées le réglage éteint ; tests/engine/temoins.json : une par époque du format, v50 à v57,
     la dernière avec un voisinage vu, ses habitants, la calèche) passe sur l'île sans erreur, une seule fois, puis joue
     10 nuits du joueur automatique ; la ferme est la même (une empreinte des blocs) que celle de la même partie migrée
     le réglage éteint ; les pièces ne baissent jamais ; le port, le tronçon à poser, le palier, la chronique ;
   - les amis d'avant deviennent candidats (leur prénom, leur personnage, leurs goûts, leur amitié ; pas de prénom du
     récit) ; au bac, avant tout villageois tiré, ils débarquent ;
   - les remboursements : la commande payée au marchand ambulant, ce que portait la malle, la commande à l'atelier, ce
     qui avait été apporté au projet, la lettre jamais ouverte, l'enveloppe ;
   - la progression : le chapitre devient le palier ; les récompenses ne sont pas redonnées ;
   - le récit résumé dans la chronique (des lignes « avant », datées, sans nom du récit) ; rien d'autre n'est gardé ;
   - la fenêtre du retour : cinq lignes, le cadeau donné une fois ; la copie de sûreté (le moteur : copie) ;
   - le tronçon converti est celui d'une partie neuve de la même terre ;
   - éteint, une partie d'avant n'est pas touchée ; la partie d'essai (jeu.html?village=1) ; le format 102.
   Lancer seul : node tests/run-tests.mjs village-migration
   ========================================================================== */

import { readFileSync } from 'node:fs';
import {
  arriverVillageois, assurerTroncon, candidatsDAvant, chroniqueAEcrit, copieRetourGardee, countItem, createInitialState, DATA,
  essayerSurLIle, fermerRetourIle, lignesRetour, migrate, migrationIleDue, partieDAvant, pointsAmitie, retourIle,
  simulatePlay, STATE_VERSION, testMaisonVillageois, texteLigne,
} from '../../js/engine/index.js';
import { texteDuRecit } from '../../js/engine/village.js';
import { assert, assertEqual, avecVillage, boite, test } from './aide.mjs';

const lire = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8'));
const ANCIENNES = lire('./anciennes-parties.json');
const TEMOINS = lire('./temoins.json');
const PARTIES = {
  ...Object.fromEntries(['avancee', 'debut', 'recente_debut', 'recente_avancee'].map((k) => [k, ANCIENNES[k]])),
  ...Object.fromEntries(['v50', 'v51', 'v52', 'v54', 'v57'].map((k) => [k, TEMOINS[k].s])),
};
const copie = (o) => structuredClone(o);
const migre = (s) => migrate({ v: s.version, t: 0, s: copie(s) });
const eteint = (s) => avecVillage(() => migre(s), false);
// (l'empreinte de la ferme : ses blocs, ses sols, ses hauteurs, ses fenêtres, ce qui est posé dessus, ses parcelles)
const empreinte = (s) => JSON.stringify(['blocs', 'sols', 'hauteurs', 'fenetres', 'blocsDessus', 'meubles'].map((k) => s[k] || null).concat([(s.potager && s.potager.parcelles) || []]));
const avant = (s) => (s.chronique ? s.chronique.lignes : []).filter((l) => l.type === 'avant');

test('chaque partie d\'avant passe sur l\'île, une seule fois, sa ferme intacte, ses pièces jamais en baisse', () => {
  for (const [nom, p] of Object.entries(PARTIES)) {
    const off = eteint(p), m = migre(p);
    assert(partieDAvant(off) && !migrationIleDue(m), `${nom} : passée`);
    assertEqual(m.version, STATE_VERSION, `${nom} : le format`);
    assertEqual(empreinte(m), empreinte(off), `${nom} : la ferme`);
    assert(m.pieces >= off.pieces, `${nom} : les pièces (${off.pieces} → ${m.pieces})`);
    assertEqual([m.day, m.famille.membres.length, m.progression, m.technologies, m.paturage, m.equipement], [off.day, off.famille.membres.length, off.progression, off.technologies, off.paturage, off.equipement], `${nom} : le reste`);
    assertEqual([m.monde.vues, m.monde.vu, m.monde.pris], [off.monde.vues, off.monde.vu, off.monde.pris], `${nom} : le brouillard levé`);
    // (l'île : le port, le tronçon à poser, le palier du chapitre, la chronique, plus de voisins ni de marchand)
    assertEqual([m.port.niveau, m.dehors.troncon, m.palier], [DATA.PORT.NIVEAU_DEPART, 'a_poser', off.campagne.chapitre], `${nom} : le port, le tronçon, le palier`);
    assertEqual([m.monde.hameaux, m.monde.habitants, m.projets, m.courrier], [{}, {}, {}, []], `${nom} : les voisins d'avant`);
    assertEqual(m.caleche, { coffre: {}, haltes: [], fait: null, jour: null }, `${nom} : le marchand ambulant`);
    assertEqual(m.recit, { faits: {}, relations: {}, confiance: {}, dites: {}, carnet: [], promesses: {} }, `${nom} : le récit`);
    assert(avant(m).length >= 3 && chroniqueAEcrit(m, 'arrivee') && !m.chronique.lignes.some((l) => l.type === 'arrivee'), `${nom} : la chronique d'avant, sans débarquer`);
    for (const l of m.chronique.lignes) assertEqual(texteDuRecit(texteLigne(l).texte), null, `${nom} : ${texteLigne(l).texte}`);
    assert(retourIle(m), `${nom} : la fenêtre du retour`);
    // (une seule fois)
    assertEqual(migrate({ v: m.version, t: 0, s: copie(m) }), m, `${nom} : une seule fois`);
  }
});

test('puis chaque partie joue 10 nuits du joueur automatique', () => {
  for (const [nom, p] of Object.entries(PARTIES)) {
    const m = migre(p), blocs = Object.keys(m.blocs).length;
    assert(assurerTroncon(m), `${nom} : le tronçon posé`);
    const rows = simulatePlay(m, 'applique', 10);
    assertEqual(rows.length, 10, `${nom} : 10 nuits`);
    assert(rows.every((r) => Number.isFinite(r.pieces) && r.pieces >= 0), `${nom} : l'argent`);
    assert(Object.keys(m.blocs).length >= blocs * 0.9, `${nom} : la ferme reste`);
    assertEqual([m.monde.hameaux, m.monde.habitants], [{}, {}], `${nom} : aucun voisin ne renaît`);
  }
});

test('les amis d\'avant deviennent candidats, puis débarquent les premiers', () => {
  const p = PARTIES.recente_avancee, m = migre(p);
  const H = p.monde.habitants, pnj = p.amitie.pnj, seuil = DATA.AMITIE.ECHELLE.PALIERS[DATA.VILLAGE.MIGRATION.AMI];
  const membres = Object.values(H).flatMap((h) => h.foyers.flatMap((f) => f.membres));
  const amis = membres.filter((x) => !x.enfant && !x.recit && pnj[x.id] && pnj[x.id].pts >= seuil);
  assert(amis.length >= 2, `des amis (${amis.length})`);
  assertEqual(m.candidats.map((c) => c.ancien).sort(), amis.map((x) => x.id).sort(), 'chacun, et eux seuls');
  for (let i = 1; i < m.candidats.length; i++) assert(m.candidats[i - 1].pts >= m.candidats[i].pts, 'du plus ami au moins ami');
  for (const c of m.candidats) {
    const x = membres.find((y) => y.id === c.ancien);
    assertEqual([c.perso, c.genre, c.pts], [x.perso, x.genre, pnj[x.id].pts], `${c.prenom} : son personnage, son amitié`);
    assert(texteDuRecit(x.prenom) ? c.prenom !== x.prenom && !texteDuRecit(c.prenom) : c.prenom === x.prenom, `${x.prenom} : son prénom (sauf un prénom du récit)`);
    assert(Object.keys(c.gouts).length > 0, `${c.prenom} : ses goûts`);
  }
  assertEqual(m.retourIle.amis, m.candidats.map((c) => c.prenom), 'la fenêtre les nomme');
  // (au bac : une maison libre, le premier candidat débarque, avec son amitié et ses goûts découverts)
  const premier = copie(m.candidats[0]), second = m.candidats[1].prenom;
  assert(testMaisonVillageois(m, 1).ok, 'une maison');
  boite(m, { pain: 300 });
  const v = arriverVillageois(m, { direct: true }).villageois;
  assertEqual([v.prenom, v.perso, v.genre, v.ancienAmi, v.gouts], [premier.prenom, premier.perso, premier.genre, true, premier.gouts], 'le premier ami débarque');
  assertEqual(pointsAmitie(m, v.id), premier.pts, 'son amitié');
  assertEqual(m.amitie.pnj[v.id].gouts, premier.connus, 'ses goûts découverts');
  assert(Array.isArray(v.traits) && v.traits.length >= 2, 'ses traits, tirés');
  assertEqual(m.candidats[0].prenom, second, 'le suivant attend');
  // (le joueur automatique, 10 nuits : il bâtit, les amis débarquent avant tout villageois tiré)
  const n = migre(p);
  assurerTroncon(n);
  simulatePlay(n, 'applique', 10);
  assert(n.villageois && n.villageois.length >= 1 && n.villageois.every((x) => x.ancienAmi), 'au bac suivant, un ancien ami');
  // (une partie sans ami : personne n'attend, la fenêtre le dit)
  const d = migre(PARTIES.recente_debut);
  assertEqual(['candidats' in d, d.retourIle.amis], [false, []], 'sans ami');
  assertEqual(lignesRetour(d).lignes[2].texte, DATA.VILLAGE.MIGRATION.RETOUR.SANS_AMIS, 'la ligne sans ami');
  // (le palier d'amitié réglé : plus haut, moins de candidats)
  const AMI = DATA.VILLAGE.MIGRATION.AMI;
  try { DATA.VILLAGE.MIGRATION.AMI = 3; assert(candidatsDAvant({ ...copie(p), essais: { village: true } }).length < amis.length, 'AMI 3'); } finally { DATA.VILLAGE.MIGRATION.AMI = AMI; }
});

test('les remboursements : le marchand ambulant, la malle, l\'atelier, le projet, la lettre, l\'enveloppe', () => {
  const p = copie(PARTIES.recente_avancee);
  // (une lettre jamais ouverte, qui porterait des pièces — aucune n'en porte plus depuis le lot 9 : on lui en donne le
  // temps du test — ; une enveloppe jamais ouverte)
  const lettre = Object.keys(DATA.COURRIER)[0], piecesLettre = DATA.COURRIER[lettre].pieces;
  DATA.COURRIER[lettre].pieces = 40;
  p.courrier.push({ id: lettre, nuit: p.day, lu: false });
  p.inventaire.enveloppe_maurice = [{ qty: 1, nightsLeft: null, origin: 'produit' }];
  let off, m;
  try { off = eteint(p); m = migre(p); } finally { if (piecesLettre === undefined) delete DATA.COURRIER[lettre].pieces; else DATA.COURRIER[lettre].pieces = piecesLettre; }
  const malle = p.caleche.malle;
  assert(malle.commande.graine_tomate && malle.vente.oeuf, 'la malle porte une commande et un dépôt');
  const cmd = malle.commande.graine_tomate.cout, lettrePieces = 40, env = DATA.RECIT.ENVELOPPE.PIECES;
  assertEqual(m.pieces, off.pieces + cmd + lettrePieces + env, 'les pièces : la commande, la lettre, l\'enveloppe');
  assertEqual(m.retourIle.rendu.pieces, cmd + lettrePieces + env, 'dans la fenêtre');
  for (const l of ['Commande annulée : ', 'Lettre jamais ouverte', 'Enveloppe ouverte']) assert(m.compta.some((x) => x.libelle.startsWith(l)), `dans les comptes : ${l}`);
  const atelier = Object.values(p.monde.habitants).flatMap((h) => h.commandes || []);
  assert(atelier.length, 'une commande à l\'atelier');
  const projet = Object.values(p.projets)[0].recu;
  const attendu = { oeuf: 3, tissu: 2 };
  for (const [k, n] of Object.entries(projet)) attendu[k] = (attendu[k] || 0) + n;
  for (const [k, n] of Object.entries(attendu)) {
    assertEqual(countItem(m, k), countItem(off, k) + n, `rendu : ${k}`);
    assert(m.retourIle.rendu.objets[k] >= n, `dans la fenêtre : ${k}`);
  }
  assertEqual([countItem(m, 'enveloppe_maurice'), countItem(m, 'cloche_maurice'), countItem(m, 'pierre_lune')], [0, 0, 0], 'les souvenirs du récit');
  assert(/rendus/.test(lignesRetour(m).lignes[3].texte), 'la ligne des remboursements');
});

test('la progression : le chapitre devient le palier, les récompenses ne sont pas redonnées', () => {
  for (const nom of ['recente_avancee', 'v57', 'avancee']) {
    const off = eteint(PARTIES[nom]), m = migre(PARTIES[nom]);
    assertEqual([m.palier, m.campagne.chapitre, m.campagne.fini, m.campagne.recompenses, m.campagne.annonces], [off.campagne.chapitre, off.campagne.chapitre, off.campagne.fini, off.campagne.recompenses, []], nom);
    assertEqual([m.pointsTech, m.progression], [off.pointsTech, off.progression], `${nom} : les points et l'XP`);
  }
});

test('le récit d\'avant : quelques lignes datées dans la chronique, sans nom du récit', () => {
  const p = PARTIES.recente_avancee, m = migre(p), L = avant(m);
  const T = (l) => texteLigne(l).texte;
  assertEqual(L[0].jour, 1, 'la famille s\'installe, le jour 1');
  assert(T(L[0]).includes(p.famille.nom), 'son nom de famille');
  assertEqual(L.filter((l) => /^voisins:/.test(l.d.id)).length, Object.keys(p.monde.hameaux).length, 'chaque voisinage rencontré');
  for (const [hid, h] of Object.entries(p.monde.hameaux)) assertEqual(L.find((l) => l.d.id === `voisins:${hid}`).jour, h.jour, `le jour de ${hid}`);
  assert(L.some((l) => /^amis:/.test(l.d.id)), 'les amis');
  assertEqual(L.find((l) => l.d.id === 'vente').jour, p.recit.faits['vente.caleche'][0], 'la première vente');
  assertEqual(L.filter((l) => l.jour === m.day).map((l) => l.d.id), ['bilan', 'ile'], 'le bilan et l\'île, ce jour');
  for (const l of L) {
    assertEqual(texteDuRecit(T(l)), null, T(l));
    for (const h of Object.values(p.monde.hameaux)) assert(!T(l).includes(h.nom), `pas de nom de lieu : ${T(l)}`);
  }
  // (rien d'autre n'est gardé du récit ; la visite de bienvenue, faite)
  assertEqual([m.bienvenue.etat, m.amitie.pnj, m.amitie.visites, m.voisins.liens], ['faite', {}, {}, {}], 'le récit oublié');
});

test('la fenêtre du retour : cinq lignes, le cadeau donné une fois ; la copie de sûreté', () => {
  const m = migre(PARTIES.recente_avancee), L = lignesRetour(m);
  assertEqual(L.lignes.length, 5, 'cinq lignes');
  for (const t of [L.titre, L.intro, ...L.lignes.map((l) => l.texte), L.cadeau]) assertEqual(texteDuRecit(t), null, t);
  assert(/30 à 60 %/.test(L.lignes[4].texte), 'les prix');
  assertEqual(m.retourIle.copie, false, 'pas encore de copie');
  copieRetourGardee(m);
  assertEqual(m.retourIle.copie, true, 'la page a gardé la copie');
  const pieces = m.pieces, planches = countItem(m, 'planche'), C = DATA.VILLAGE.MIGRATION.CADEAU;
  const donne = fermerRetourIle(m);
  assertEqual(donne, C, 'le cadeau');
  assertEqual([m.pieces, countItem(m, 'planche')], [pieces + C.pieces, planches + C.objets.planche], 'reçu');
  assertEqual([fermerRetourIle(m), retourIle(m), lignesRetour(m)], [null, null, null], 'une fois');
});

test('le tronçon converti est celui d\'une partie neuve de la même terre', () => {
  for (const nom of ['recente_avancee', 'v57']) {
    const m = migre(PARTIES[nom]);
    const neuve = createInitialState(m.rngSeed);
    neuve.carte = copie(m.carte);
    neuve.dehors = { troncon: 'a_poser', chemins: [] };
    assert(assurerTroncon(m) && assurerTroncon(neuve), `${nom} : posés`);
    assertEqual(m.dehors, neuve.dehors, `${nom} : le même tronçon`);
    assert(m.dehors.chemins.length > 0, `${nom} : des chemins`);
  }
});

test('éteint, une partie d\'avant n\'est pas touchée ; la partie d\'essai ; le format 102', () => {
  avecVillage(() => {
    const p = PARTIES.recente_avancee, off = migre(p);
    for (const k of ['port', 'dehors', 'palier', 'noms', 'chronique', 'candidats', 'retourIle']) assertEqual(k in off, false, `éteint : pas de ${k}`);
    assertEqual([off.monde.hameaux, off.caleche, off.recit], [p.monde.hameaux, p.caleche, p.recit], 'éteint : le monde d\'avant');
    // (jeu.html?village=1 : la partie d'avant devient une partie d'essai et passe sur l'île)
    const e = migre(p);
    assert(essayerSurLIle(e), 'l\'essai');
    assertEqual([e.essais.village, e.palier, !!e.port, e.candidats.length], [true, 7, true, 7], 'une partie d\'essai, sur l\'île');
    assertEqual(essayerSurLIle(e), null, 'une seule fois');
  }, false);
  // (le format 102 : une partie de l'île au format 101 ; ses candidats et sa fenêtre, réparés)
  const m = migre(PARTIES.recente_avancee);
  const v101 = { ...copie(m), version: 101, candidats: [m.candidats[0], { prenom: 3 }, null, { ...m.candidats[1], pts: 900, gouts: { inconnu: 'aime' } }], retourIle: 'abîmée' };
  const r = migrate({ v: 101, t: 0, s: v101 });
  assertEqual(r.candidats.map((c) => [c.prenom, c.pts]), [[m.candidats[0].prenom, m.candidats[0].pts], [m.candidats[1].prenom, DATA.AMITIE.ECHELLE.MAX]], 'les candidats réparés');
  assertEqual(r.candidats[1].gouts, {}, 'un goût inconnu s\'en va');
  assertEqual('retourIle' in r, false, 'une fenêtre illisible s\'efface');
});
