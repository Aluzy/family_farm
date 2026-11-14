/* ==========================================================================
   Tests du moteur : les villageois en ligne (fiche I9d ; docs/ile.md, « Les villageois en ligne »). Dans la partie
   d'un monde de l'île (l'horloge commune, I9a2 : js/engine/temps-monde.js) :
   - la journée du village se joue dans les pas, par les mêmes fonctions qu'en solo : chacun travaille à son heure, le
     bois arrive au coffre commun dans la matinée ; deux joueurs qui jouent les mêmes pas ont la même partie ;
   - chacun place les villageois d'après l'heure : la même position, chez deux joueurs, à dix heures tirées au hasard ;
   - l'amitié est par joueur (state.amities) : parler et offrir (villageois.parler, villageois.offrir) ne touchent que
     celle de l'acteur ; celle du village suit la meilleure ; une partie solo garde la sienne ;
   - le geste « accueilli » de la carte est une commande (villageois.accueillir) ; le visiteur ne parle qu'à sa page ;
   - le temps d'un pas avec quinze villageois, sous la limite ; le pas en lot donne le même résultat ;
   - un villageois et un joueur sur le même arbre : le premier joué l'a, l'autre passe proprement ;
   - la sauvegarde passe au format 106.
   Lancer seul : node tests/run-tests.mjs village-en-ligne.
   ========================================================================== */

import {
  amitieDuJoueur, arriverVillageois, attribuer, avancerJusqua, clockHours, countItem, DATA, donnerOutil, empreintePartie,
  executerCommande, farmSeed, horlogeDe, journeeDuVillage, migrate, mulberry32, nightActive, pasDe, pasDuMonde, pointsAmitie,
  portDuMonde, positionVillageois, refusDuRole, STATE_VERSION, tableauVillage, testMaisonVillageois, treeGone, villageoisDe,
} from '../../js/engine/index.js';
import { assert, assertEqual, boite, partie, test } from './aide.mjs';

const cloner = (v) => JSON.parse(JSON.stringify(v));
const PAS_PAR_HEURE = (DATA.TEMPS.SECONDES_PAR_HEURE * 1000) / DATA.VILLAGE.EN_LIGNE.PAS_MS;   // 6
const A = 'c-alex', B = 'c-sam';
const ACCUEIL = DATA.VILLAGE.AMITIE.ACCUEIL;

// La partie d'un monde de l'île (comme MondeRegistre.creer la garde : mondePartage, l'horloge, les amitiés de chacun),
// `n` maisons et leurs villageois, la boîte pleine, les outils du joueur ; à 6 h.
function ile(n = 3, seed = 1) {
  const s = partie(seed);
  portDuMonde(farmSeed(s));
  boite(s, { pain: 200 });
  for (let k = 0; k < n; k++) assert(testMaisonVillageois(s).ok, `la maison ${k + 1}`);
  for (let k = 0; k < n; k++) assert(arriverVillageois(s, { direct: true }).ok, `le villageois ${k + 1}`);
  s.outils = { hache: true, pioche: true, faux: true, canne: true, choisi: 'hache' };
  s.mondePartage = true;
  horlogeDe(s);
  s.amities = {};
  s.energies = {};
  s.awakeMs = 0;
  return s;
}
// Une tâche à chacun (et son outil : le coffre en a autant qu'il faut).
const TACHES = [['bois', 'hache'], ['pierre', 'pioche'], ['fauchage', 'faux'], ['cueillette', null], ['peche', 'canne']];
function auTravail(s, taches = TACHES) {
  villageoisDe(s).forEach((v, i) => {
    const [t, o] = taches[i % taches.length];
    if (o) { s.outils[o] = true; assert(donnerOutil(s, v.id, o).ok, `${v.id} : ${o}`); }
    assert(attribuer(s, v.id, t).ok, `${v.id} : ${t}`);
  });
  for (const [, o] of taches) if (o) s.outils[o] = true;
}
const jouer = (s, type, args, acteur = A) => executerCommande(s, { id: `c-${type}-${Math.random().toString(36).slice(2, 8)}`, type, args }, { acteur });

test('I9d : la journée du village se joue dans les pas ; deux joueurs qui jouent les mêmes pas ont la même partie à chaque heure ; le bois arrive au coffre dans la matinée', () => {
  const a = ile(3);
  auTravail(a, [['bois', 'hache']]);
  const b = cloner(a), bois0 = countItem(a, 'bois');
  const heures = [];
  for (let h = 1; h <= 16; h++) {
    avancerJusqua(a, h * PAS_PAR_HEURE);
    avancerJusqua(b, h * PAS_PAR_HEURE);
    assertEqual(empreintePartie(a), empreintePartie(b), `la même partie à ${clockHours(a).toFixed(1)} h`);
    heures.push({ h: Math.round(clockHours(a)), bois: countItem(a, 'bois') - bois0, actions: villageoisDe(a).reduce((n, v) => n + ((v.travail && v.travail.actions) || 0), 0) });
    if (h === 6) {
      // (un joueur qui arrive à midi : la partie du monde par le réseau, puis les mêmes pas)
      const c = cloner(a);
      avancerJusqua(c, 16 * PAS_PAR_HEURE);
      avancerJusqua(a, 16 * PAS_PAR_HEURE);
      avancerJusqua(b, 16 * PAS_PAR_HEURE);
      assertEqual([empreintePartie(c) === empreintePartie(a), empreintePartie(b) === empreintePartie(a)], [true, true], 'arrivé à midi : la même partie le soir');
      break;
    }
  }
  const midi = heures.find((x) => x.h === 12);
  assert(midi && midi.bois > 0 && midi.actions >= 3, `le bois au coffre commun avant midi (${JSON.stringify(heures)})`);
  assert(heures.some((x) => x.h <= 9 && x.actions === 0), 'personne ne travaille avant ses heures de travail');
});

test('I9d : deux joueurs placent chaque villageois au même endroit, à dix heures tirées au hasard (rien n\'est envoyé : l\'heure et l\'horaire)', () => {
  const s = ile(4);
  auTravail(s);
  avancerJusqua(s, 3 * PAS_PAR_HEURE);
  const a = cloner(s), b = cloner(s);
  // (chacun refait la journée du village de son côté : rien n'est gardé de l'autre)
  avancerJusqua(a, 4 * PAS_PAR_HEURE);
  avancerJusqua(b, 4 * PAS_PAR_HEURE);
  const rnd = mulberry32(0x19d);
  const etats = new Set();
  for (let k = 0; k < 10; k++) {
    const h = 6 + rnd() * 16;
    for (const v of villageoisDe(a)) {
      const pa = positionVillageois(a, v.id, h), pb = positionVillageois(b, v.id, h);
      assertEqual(pa, pb, `${v.id} à ${h.toFixed(2)} h`);
      if (pa) etats.add(pa.etat);
    }
  }
  assert(etats.has('travail') && etats.has('repas'), `au travail et à table (${[...etats].join(', ')})`);
  assertEqual(cloner(journeeDuVillage(a).get('vg-1')), cloner(journeeDuVillage(b).get('vg-1')), 'la même journée');
});

test('I9d : l\'amitié est par joueur : parler et offrir ne touchent que celle de l\'acteur ; celle du village suit la meilleure ; un joueur nouveau commence à l\'accueil', () => {
  const s = ile(2);
  const v = villageoisDe(s)[0];
  avancerJusqua(s, 2 * PAS_PAR_HEURE);   // (8 h : il est debout)
  const monde0 = pointsAmitie(s, v.id);
  const r = jouer(s, 'villageois.parler', { id: v.id, n: 0 }, A);
  assert(r.ok && r.prenom === v.prenom && r.amitie, `la bulle (${r.error || ''})`);
  const pa = s.amities[A].pnj[v.id].pts;
  assertEqual([pa, r.amitie.pts, B in s.amities], [ACCUEIL + DATA.AMITIE.PAROLE, pa, false], 'A a gagné la conversation du jour ; B n\'a rien');
  assertEqual(amitieDuJoueur(s, B).pnj[v.id].pts, ACCUEIL, 'B commence à l\'accueil');
  assertEqual(pointsAmitie(s, v.id), Math.max(monde0, pa), 'l\'amitié du village suit la meilleure');
  // (une deuxième conversation du jour ne rapporte rien ; celle de B, si)
  jouer(s, 'villageois.parler', { id: v.id, n: 1 }, A);
  assertEqual(s.amities[A].pnj[v.id].pts, pa, 'une fois par jour');
  const pomme = 'pomme';
  s.inventaire[pomme] = [{ qty: 3, nightsLeft: 9 }];
  const o = jouer(s, 'villageois.offrir', { id: v.id, objet: pomme }, B);
  assert(o.ok, o.error);
  assertEqual([s.amities[A].pnj[v.id].pts, s.amities[B].pnj[v.id].pts, s.amities[B].pnj[v.id].cadeau], [pa, Math.max(0, ACCUEIL + o.points), s.day], 'le cadeau de B est à B');
  assertEqual(jouer(s, 'villageois.offrir', { id: v.id, objet: pomme }, B).ok, false, 'un cadeau par jour, pour B');
  assertEqual(jouer(s, 'villageois.offrir', { id: v.id, objet: pomme }, A).ok, true, 'A offre le sien');
  // (rejoué chez un autre : le même résultat)
  const t = cloner(s);
  assertEqual(empreintePartie(t), empreintePartie(s));
  // (le monde, entre deux commandes, a l'amitié du village ; une partie solo n'a pas d'amitiés par joueur)
  assert(!('pnj' in s) && s.amitie.pnj[v.id].pts >= pa, 'l\'amitié du village');
  const solo = ile(1);
  delete solo.amities;
  solo.mondePartage = false;
  avancerJusqua(solo, 2 * PAS_PAR_HEURE);
  const u = villageoisDe(solo)[0];
  assert(executerCommande(solo, { id: 'c-solo', type: 'villageois.parler', args: { id: u.id } }).ok);
  assertEqual([pointsAmitie(solo, u.id), 'amities' in solo], [ACCUEIL + DATA.AMITIE.PAROLE, false], 'en solo, l\'amitié de la partie');
});

test('I9d : l\'accueil du nouveau venu est une commande ; parler, offrir et accueillir demandent un ami jardinier (le visiteur parle à sa page, sans rien changer)', () => {
  const s = ile(1);
  assert(testMaisonVillageois(s).ok);
  assert(arriverVillageois(s).ok);
  const v = villageoisDe(s)[1];
  assertEqual(v.accueil, 'en_route');
  assert(jouer(s, 'villageois.accueillir', { id: v.id }).ok);
  assertEqual([v.accueil, v.avis.includes('arrive'), jouer(s, 'villageois.accueillir', { id: v.id }).ok], [null, true, false]);
  for (const type of ['villageois.parler', 'villageois.offrir', 'villageois.accueillir']) {
    const c = { type, args: { id: v.id, objet: 'pomme' } };
    assert(refusDuRole('visiteur', s, c), `${type} : pas le visiteur`);
    assertEqual(refusDuRole('jardinier', s, c), null, `${type} : l'ami jardinier`);
  }
});

test('I9d : le temps d\'un pas avec quinze villageois au travail, sous la limite (une journée de pas) ; le tableau est le même chez deux joueurs', () => {
  const s = ile(15);
  auTravail(s);
  const b = cloner(s);
  const jour = [];
  for (let i = 0; i < 16 * PAS_PAR_HEURE; i++) {
    const t0 = performance.now();
    pasDuMonde(s);
    if (!nightActive(s)) jour.push(performance.now() - t0);
  }
  avancerJusqua(b, pasDe(s));
  const moy = jour.reduce((x, y) => x + y, 0) / jour.length, max = Math.max(...jour.slice(1));
  // (la limite : un pas de jour en moyenne sous LIMITE_MS — le serveur en rejoue jusqu'à 240 d'un coup, chaque joueur deux
  // fois chacun, sa partie et la confirmée)
  const LIMITE_MS = 25;
  assert(moy < LIMITE_MS && max < 10 * LIMITE_MS, `un pas de jour : ${moy.toFixed(2)} ms en moyenne, ${max.toFixed(1)} au plus`);
  assert(villageoisDe(s).filter((v) => v.travail && v.travail.actions > 0).length >= 10, 'ils ont travaillé');
  assertEqual(JSON.stringify(tableauVillage(s)), JSON.stringify(tableauVillage(b)), 'le même tableau');
  console.log(`   (quinze villageois : un pas de jour ${moy.toFixed(2)} ms en moyenne, ${max.toFixed(1)} ms au plus)`);
});

test('I9d : un villageois et un joueur sur le même arbre : le premier joué l\'a ; l\'autre passe à l\'arbre suivant ou son coup est refusé, rien en double', () => {
  const s = ile(1);
  auTravail(s, [['bois', 'hache']]);
  const v = villageoisDe(s)[0];
  const coups = (id) => (s.outils.arbres || {})[id];
  // le villageois entame un arbre ; le joueur le finit : le villageois passe au suivant, sans erreur ni bois en double
  let entame = null;
  for (let i = 0; i < 16 * PAS_PAR_HEURE && !entame; i++) {
    pasDuMonde(s);
    entame = Object.keys(s.outils.arbres || {}).find((id) => typeof coups(id) === 'number' && coups(id) > 0 && !treeGone(s, id)) || null;
  }
  assert(entame, 'un arbre entamé par lui');
  const actions0 = v.travail.actions, produit0 = v.travail.produit.bois || 0, bois0 = countItem(s, 'bois');
  let gainJoueur = 0;
  for (let k = 0; k < 10 && !treeGone(s, entame); k++) {
    const avant = countItem(s, 'bois');
    const r = jouer(s, 'outil.couper', { arbre: entame });
    assert(r.ok, `le coup du joueur (${r.error})`);
    gainJoueur += countItem(s, 'bois') - avant;
  }
  assert(treeGone(s, entame), 'le joueur l\'a abattu');
  while (clockHours(s) < 21) pasDuMonde(s);
  assert(v.travail.actions > actions0, `il a continué, ailleurs (${actions0} → ${v.travail.actions} actions)`);
  assertEqual(countItem(s, 'bois') - bois0, gainJoueur + (v.travail.produit.bois || 0) - produit0, 'le bois : celui du joueur plus celui du villageois, rien en double');
  // le villageois abat un arbre (le lendemain) ; le coup du joueur sur cet arbre-là est refusé, sans bois
  let abattu = null;
  for (let i = 0; i < 2 * 144 && !abattu; i++) {
    pasDuMonde(s);
    abattu = Object.keys(s.outils.arbres || {}).find((id) => id !== entame && treeGone(s, id)) || null;
  }
  assert(abattu, 'il a abattu un arbre');
  const bois = countItem(s, 'bois');
  const r = jouer(s, 'outil.couper', { arbre: abattu });
  assertEqual([r.ok, countItem(s, 'bois')], [false, bois], `refusé (${r.error})`);
});

test('I9d : la sauvegarde passe au format 107, après les charges d\'I9c (l\'amitié de chacun dans la partie d\'un monde ; une partie solo n\'y gagne rien)', () => {
  assertEqual(STATE_VERSION, 107);
  const s = ile(1);
  const v106 = { ...cloner(s), version: 106, amities: { [A]: { pnj: { 'vg-1': { pts: 500, gouts: { pomme: 'adore', licorne: 'aime' } }, x: 3 } }, [B]: 'abîmé' } };
  delete v106.amities[A].visites;
  const m = migrate({ v: 106, t: 0, s: v106 });
  assertEqual([m.version, Object.keys(m.amities), m.amities[A].pnj['vg-1'].pts, m.amities[A].pnj['vg-1'].gouts, 'x' in m.amities[A].pnj], [107, [A], DATA.AMITIE.ECHELLE.MAX, { pomme: 'adore' }, false]);
  const ancien = { ...cloner(s), version: 106 };
  delete ancien.amities;
  assertEqual(migrate({ v: 106, t: 0, s: ancien }).amities, {}, 'un monde d\'avant : chacun commence à l\'accueil');
  const solo = { ...cloner(s), version: 106, mondePartage: false };
  delete solo.amities;
  assertEqual('amities' in migrate({ v: 106, t: 0, s: solo }), false, 'une partie solo n\'y gagne rien');
});
