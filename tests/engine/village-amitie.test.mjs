/* ==========================================================================
   Tests du chantier « l'île à bâtir » : l'amitié avec les villageois (fiche I6a ; docs/ile.md ;
   js/engine/villageois-amitie.js, posé sur amitie.js, demandes.js, invitations.js et propos.js). Comme tous les
   fichiers tests/engine/village-*.test.mjs, il tourne avec VILLAGE.ACTIF forcé à true.
   - l'arrivée : ACCUEIL points, des goûts tirés (de tous les métiers), qui ne suivent pas la tâche ;
   - parler : les mêmes gains que chez les habitants (la première conversation du jour, les retrouvailles) ;
   - les cadeaux : un par jour, selon son goût, un palier passé, il confie un goût ; l'objectif du jour ;
   - ce que l'amitié change : il dit ses goûts, le présent d'un ami (donné en main propre), le salut au joueur, la
     famille amie dans la vie sociale, la tâche acceptée sans perdre d'humeur ; pas de bonus de production ;
   - les demandes : selon sa tâche, honorées (amitié, présent) ou oubliées (rien) ;
   - les invitations : inviter des villageois, ils répondent, viennent, mangent, s'en souviennent ;
   - les propos : ni hameau, ni calèche, ni cousin ; une bulle par phrase ;
   - la sauvegarde : v90 → v91 ;
   - éteint : rien.
   Lancer seul : node tests/run-tests.mjs village-amitie.
   ========================================================================== */

import {
  addItem, amitieAvec, amitieVillageois, amitieVillageoisNuit, arriverVillageois, attribuer, confierGout, connaissance, countItem,
  createNewGame, DATA, demandesDe, demandesNuit, demandesOuvertes, demandesVillageoisNuit, donnerPresent, echangeVillageois, farmSeed,
  HAMEAU_VILLAGE, invitationDuMoment, invitationsNuit, invitesModele, inviter, liensPourLaCarte, migrate, offrirVillageois,
  palierAmitie, parlerVillageois, paroleVillageois, proposVillageois, relationsInvitables, rendreDemande, servirRepas,
  souvenirParole, STATE_VERSION, sujetsVillageois, tacheSansHumeur, tachesNuit, testMaisonVillageois, trouverPnj, villageoisDe,
  donnerOutil,
} from '../../js/engine/index.js';
import { assert, assertEqual, avecVillage, boite, partie, test } from './aide.mjs';

const copie = (o) => JSON.parse(JSON.stringify(o));
const A = () => DATA.VILLAGE.AMITIE;
const P = DATA.RECIT.PALIERS;

// Une île : n maisons, n villageois installés (de quoi manger dans la boîte commune).
function ile(n = 2, seed = 1) {
  const s = partie(seed);
  boite(s, { pain: 80 });
  for (let k = 0; k < n; k++) assert(testMaisonVillageois(s).ok, `maison ${k + 1}`);
  const V = [];
  for (let k = 0; k < n; k++) {
    const r = arriverVillageois(s, { direct: true });
    assert(r.ok, `villageois ${k + 1}`);
    V.push(r.villageois);
  }
  return { s, V };
}

// Parler au villageois `id` (la bulle complétée par l'amitié), le `n`-ième appui.
const parler = (s, id, n = 0, heure = 10) => parlerVillageois(s, id, paroleVillageois(s, id, { heure, n }), { n });
const poser = (s, id, pts) => { s.amitie.pnj[id].pts = pts; };
const aHeure = (s, h) => { s.awakeMs = (h - DATA.TEMPS.HEURE_REVEIL) * DATA.TEMPS.SECONDES_PAR_HEURE * 1000; };
// (un réglage changé le temps d'un essai)
function avec(objet, cle, valeur, fn) {
  const avant = objet[cle];
  objet[cle] = valeur;
  try { return fn(); } finally { objet[cle] = avant; }
}

/* ---------- l'arrivée, les goûts ---------- */

test('l\'arrivée : ACCUEIL points (« poli »), des goûts tirés de tous les métiers, qui ne suivent pas sa tâche', () => {
  const { s, V: [v, w] } = ile();
  assertEqual(s.amitie.pnj[v.id].pts, A().ACCUEIL, 'les points de l\'accueil');
  assertEqual(palierAmitie(s, v.id), 1, 'poli');
  // (ses goûts : AMITIE.GOUTS objets de chaque sorte, tous du catalogue, aucun d'un enfant seulement)
  const par = { adore: 0, aime: 0, deteste: 0 };
  for (const [it, g] of Object.entries(v.gouts)) { assert(DATA.OBJETS[it], it); par[g] += 1; }
  assertEqual(par, { adore: DATA.AMITIE.GOUTS.adore, aime: DATA.AMITIE.GOUTS.aime, deteste: DATA.AMITIE.GOUTS.deteste }, 'combien de chaque');
  assert(JSON.stringify(v.gouts) !== JSON.stringify(w.gouts), 'deux villageois, deux goûts');
  // (la même partie, les mêmes goûts)
  const { V: [v2] } = ile(2, 1);
  assertEqual(v2.gouts, v.gouts, 'déterministe');
  // (sa tâche change : ses goûts restent les siens)
  const t = trouverPnj(s, HAMEAU_VILLAGE, v.id);
  const avant = { ...t.m.gouts };
  attribuer(s, v.id, 'bois');
  assertEqual(trouverPnj(s, HAMEAU_VILLAGE, v.id).m.gouts, avant, 'la tâche ne change pas ses goûts');
  assertEqual(amitieAvec(s, HAMEAU_VILLAGE, v.id).gouts, {}, 'rien de découvert encore');
});

/* ---------- parler ---------- */

test('parler : la première conversation du jour (+PAROLE), pas la seconde ; les retrouvailles ; endormi, rien', () => {
  const { s, V: [v] } = ile();
  const r = parler(s, v.id, 0);
  assertEqual(r.amitie.gain, DATA.AMITIE.PAROLE, 'la première du jour');
  assertEqual(r.amitie.pts, A().ACCUEIL + DATA.AMITIE.PAROLE);
  assertEqual(parler(s, v.id, 1).amitie.gain, 0, 'la seconde : rien de plus');
  s.day += 1;
  assertEqual(parler(s, v.id, 0).amitie.gain, DATA.AMITIE.PAROLE, 'le lendemain, de nouveau');
  // (une longue absence : il est joyeux de te retrouver, il le dit, et l'amitié monte un peu plus ; jamais de perte)
  const pts = s.amitie.pnj[v.id].pts;
  s.day += DATA.AMITIE.RETROUVAILLES.JOURS;
  assertEqual(s.amitie.pnj[v.id].pts, pts, 'l\'absence ne fait rien perdre');
  const salut = echangeVillageois(s, v.id, 'joueur', { n: 1 });
  assertEqual(salut.sorte, 'retrouvailles', 'il te salue avec joie en te revoyant');
  const R = parler(s, v.id, 0);
  assert(R.retrouvailles, 'les retrouvailles');
  assertEqual(R.amitie.gain, DATA.AMITIE.PAROLE + DATA.AMITIE.RETROUVAILLES.BONUS, 'le bonus des retrouvailles');
  assertEqual(R.emotion, 'joie');
  assert(A().PHRASES.retrouvailles.some((p) => R.texte.startsWith(p)), `il le dit : ${R.texte}`);
  // (il dort : on ne lui parle pas)
  const d = parlerVillageois(s, v.id, { ...paroleVillageois(s, v.id, { heure: 2 }), etat: 'dormir' });
  assert(!d.amitie, 'endormi : pas d\'amitié');
});

/* ---------- les cadeaux ---------- */

test('les cadeaux : un par jour, selon son goût ; un plat adoré fait passer un palier, il confie un goût ; l\'objectif du jour', () => {
  const { s, V: [v] } = ile();
  const adore = Object.keys(v.gouts).filter((k) => v.gouts[k] === 'adore');
  const deteste = Object.keys(v.gouts).find((k) => v.gouts[k] === 'deteste');
  addItem(s, adore[0], 2); addItem(s, deteste, 1);
  poser(s, v.id, P[2] - 3);   // (à 3 points de « cordial »)
  const r = offrirVillageois(s, v.id, adore[0]);
  assert(r.ok, r.error);
  assertEqual([r.gout, r.points, r.emotion], ['adore', DATA.AMITIE.CADEAU.adore, 'joie']);
  assert(r.monte && r.nom === 'cordial', 'un palier de plus');
  assert(A().PHRASES.cadeau.adore.includes(r.phrase), 'sa réaction');
  assert(r.confie && r.confie.gout === 'adore' && v.gouts[r.confie.objet] === 'adore', 'il confie ce qu\'il adore');
  const F = amitieVillageois(s, v.id);
  assertEqual(F.gouts[adore[0]], 'adore', 'le goût découvert en offrant');
  assertEqual(F.gouts[r.confie.objet], 'adore', 'le goût confié');
  assert(F.cadeauAujourdhui, 'un cadeau aujourd\'hui');
  assert(!offrirVillageois(s, v.id, adore[0]).ok, 'un seul par jour');
  assertEqual(countItem(s, adore[0]), 1, 'le refus ne prend rien');
  s.objectifs = { faits: {} };
  addItem(s, adore[1], 1);
  s.day += 1;
  assert(offrirVillageois(s, v.id, adore[1]).ok);
  assertEqual(s.objectifs.faits.cadeau_villageois, 1, 'l\'objectif du jour « cadeau_villageois »');
  s.day += 1;
  const n = offrirVillageois(s, v.id, deteste);
  assertEqual([n.gout, n.points, n.emotion], ['deteste', DATA.AMITIE.CADEAU.deteste, 'degout'], 'ce qu\'il déteste fait reculer');
  assert(!offrirVillageois(s, 'vg-99', deteste).ok, 'personne');
});

test('il dit ses goûts : dès CONFIE.PALIER, à la première conversation du jour ; jamais deux fois le même', () => {
  const { s, V: [v] } = ile();
  avec(A().CONFIE, 'CHANCE', 1, () => {
    poser(s, v.id, P[1]);
    assert(!parler(s, v.id).gout, 'poli : il ne confie rien');
    poser(s, v.id, P[2]);
    const vus = new Set();
    for (let j = 0; j < 10; j++) {
      s.day += 1;
      const r = parler(s, v.id);
      if (!r.gout) break;
      assert(!vus.has(r.gout.objet), 'pas deux fois le même');
      vus.add(r.gout.objet);
      assertEqual(v.gouts[r.gout.objet], r.gout.gout, 'un vrai goût');
    }
    assertEqual(vus.size, Object.keys(v.gouts).length, 'il finit par tout dire');
    assert(confierGout(s, v) === null, 'plus rien à dire');
  });
});

/* ---------- ce que l'amitié change ---------- */

test('le présent d\'un ami : préparé la nuit (dès « proche »), donné en main propre (le salut ou la parole), une fois', () => {
  const { s, V: [v, w] } = ile();
  poser(s, v.id, P[3]); poser(s, w.id, P[2]);
  avec(DATA.AMITIE.RETOUR.CHANCE, '3', 100, () => {
    const n = amitieVillageoisNuit(s);
    assertEqual(n.presents.map((x) => x.id), [v.id], 'l\'ami proche seulement');
    assertEqual(amitieVillageoisNuit(s).presents, [], 'un à la fois');
  });
  const x = amitieVillageois(s, v.id).present;
  assert(x && DATA.OBJETS[x.objet] && x.n > 0, 'il le garde pour toi');
  assert(Object.keys(DATA.AMITIE.RETOUR.PRESENTS.jardinier).includes(x.objet), 'sans tâche : les présents du jardinier');
  assert(liensPourLaCarte(s).present[v.id], 'la scène le sait (il salue de plus loin)');
  const salut = echangeVillageois(s, v.id, 'joueur', { n: 1 });
  assertEqual(salut.sorte, 'present', 'il le dit en saluant');
  const avant = countItem(s, x.objet);
  const d = donnerPresent(s, v.id);
  assertEqual([d.objet, d.n], [x.objet, x.n]);
  assertEqual(countItem(s, x.objet), avant + x.n, 'dans l\'inventaire');
  assert(donnerPresent(s, v.id) === null, 'une fois');
  // (par la parole : il le donne en te parlant)
  avec(DATA.AMITIE.RETOUR.CHANCE, '3', 100, () => { s.day += 1; amitieVillageoisNuit(s); });
  const p = amitieVillageois(s, v.id).present, r = parler(s, v.id);
  assertEqual(r.present, p, 'donné en parlant');
  assertEqual(r.emotion, 'joie');
  assert(!amitieVillageois(s, v.id).present, 'plus rien à donner');
  // (bûcheron : ce que donne un bûcheron)
  attribuer(s, v.id, 'bois');
  avec(DATA.AMITIE.RETOUR.CHANCE, '3', 100, () => { s.day += 1; amitieVillageoisNuit(s); });
  assert(Object.keys(DATA.AMITIE.RETOUR.PRESENTS.bucheron).includes(amitieVillageois(s, v.id).present.objet), 'selon sa tâche');
});

test('le salut au joueur suit l\'amitié ; la famille est son amie dès FAMILLE_AMI ; la tâche sans perdre d\'humeur', () => {
  const { s, V: [v] } = ile();
  const sorte = () => echangeVillageois(s, v.id, 'joueur', { n: 2 }).sorte;
  assertEqual(sorte(), 'connaissance', 'poli : une connaissance');
  assertEqual(connaissance(s, v.id, 'famille').degre, 1);
  poser(s, v.id, P[A().FAMILLE_AMI]);
  assertEqual(connaissance(s, v.id, 'famille').degre, 2, 'amie dès « cordial »');
  assertEqual(sorte(), 'ami');
  assertEqual(liensPourLaCarte(s).famille[v.id], 2, 'la carte aussi');
  assert(!tacheSansHumeur(s, v.id), 'cordial : pas encore');
  poser(s, v.id, P[3]);
  assertEqual(sorte(), 'proche', 'plus chaleureux');
  assert(tacheSansHumeur(s, v.id), 'proche : il accepte une tâche qu\'il n\'aime pas');
  poser(s, v.id, P[4]);
  assertEqual(sorte(), 'intime');
  assert(DATA.VILLAGE.SOCIAL.JOUEUR.intime.length && DATA.VILLAGE.SOCIAL.EMOJI.intime.length, 'les répliques et les emojis');
  assertEqual(liensPourLaCarte(s).amitie[v.id], 4, 'le palier, pour la scène');
});

test('pas de bonus de production : un ami intime travaille comme une simple connaissance', () => {
  const produit = (pts) => {
    const { s, V: [v] } = ile(1, 3);
    s.outils = { hache: true, pioche: true, faux: true, canne: true, choisi: 'hache' };
    donnerOutil(s, v.id, 'hache'); attribuer(s, v.id, 'bois');
    poser(s, v.id, pts);
    tachesNuit(s);
    return JSON.stringify([v.travail, s.inventaire]);
  };
  assertEqual(produit(P[4]), produit(P[1]), 'la même journée, les mêmes bûches');
});

/* ---------- les demandes ---------- */

test('les demandes : la nuit, selon sa tâche ; il la dit ; honorée (amitié, présent) ; oubliée, rien', () => {
  const { s, V: [v, w] } = ile();
  attribuer(s, v.id, 'peche'); attribuer(s, w.id, 'peche');
  s.day += A().DEMANDES.DEPUIS;
  const dem = avec(A().DEMANDES, 'CHANCE', 1, () => demandesVillageoisNuit(s, villageoisDe(s)));
  assert(dem && dem.hameau === HAMEAU_VILLAGE, 'une demande du village');
  assertEqual(dem.metier, 'pecheur', 'les besoins d\'un pêcheur');
  assert(DATA.DEMANDES.BESOINS.pecheur.some((b) => b[0] === dem.objet), 'un besoin de sa tâche');
  avec(A().DEMANDES, 'CHANCE', 1, () => { demandesVillageoisNuit(s, villageoisDe(s)); demandesVillageoisNuit(s, villageoisDe(s)); });
  assertEqual(demandesOuvertes(s).filter((d) => d.hameau === HAMEAU_VILLAGE).length, A().DEMANDES.MAX, 'MAX pour le village');
  // (il la dit, à la première conversation du jour)
  const qui = dem.membre;
  const r = parler(s, qui, 0);
  assertEqual(r.demande, dem.id);
  assert(r.texte.includes(DATA.OBJETS[dem.objet].nom), `il la dit : ${r.texte}`);
  assertEqual(amitieVillageois(s, qui).demande.id, dem.id, 'sur sa fiche');
  // (honorée)
  addItem(s, dem.objet, dem.n);
  const avant = s.amitie.pnj[qui].pts;
  const h = rendreDemande(s, dem.id);
  assert(h.ok, h.error);
  assertEqual(s.amitie.pnj[qui].pts, avant + DATA.DEMANDES.AMITIE, 'l\'amitié');
  assert(h.cadeau && Object.keys(DATA.AMITIE.RETOUR.PRESENTS.pecheur).includes(h.cadeau.item), 'un présent de pêcheur');
  // (oubliée : rien ne se perd)
  const autre = demandesOuvertes(s).find((d) => d.hameau === HAMEAU_VILLAGE);
  const pts = s.amitie.pnj[autre.membre].pts, inv = copie(s.inventaire);
  s.day = autre.fin + 1;
  demandesVillageoisNuit(s, []);
  avec(A().DEMANDES, 'CHANCE', 0, () => demandesVillageoisNuit(s, villageoisDe(s)));
  assert(!demandesOuvertes(s).some((d) => d.id === autre.id), 'elle s\'oublie');
  assertEqual(s.amitie.pnj[autre.membre].pts, pts, 'sans rien coûter');
  assertEqual(s.inventaire, inv);
  // (chaque demande du village est celle d'un villageois de l'île)
  avec(A().DEMANDES, 'CHANCE', 1, () => demandesVillageoisNuit(s, villageoisDe(s)));
  assert(demandesDe(s).liste.every((d) => d.hameau !== HAMEAU_VILLAGE || villageoisDe(s).some((x) => x.id === d.membre)));
  // (les hameaux gardent leur compte : MAX demandes du village ne les empêchent pas d'en faire)
  const L = demandesDe(s).liste;
  while (L.filter((d) => d.hameau === HAMEAU_VILLAGE).length < DATA.DEMANDES.MAX) L.push({ id: `x${L.length}`, hameau: HAMEAU_VILLAGE, membre: v.id, objet: 'pain', n: 1, fin: s.day + 5 });
  avec(DATA.DEMANDES, 'CHANCE', 0, () => assertEqual(demandesNuit(s), null, 'le tirage des hameaux a lieu (CHANCE 0 : rien)'));
});

/* ---------- les invitations ---------- */

test('les invitations : des villageois à table ; ils répondent, viennent de chez eux, mangent, s\'en souviennent', () => {
  const { s, V: [v, w] } = ile();
  const R = relationsInvitables(s).filter((r) => r.hameau === HAMEAU_VILLAGE);
  assertEqual(R.map((r) => r.id).sort(), [v.id, w.id], 'on les connaît tous');
  poser(s, v.id, P[4]); poser(s, w.id, P[4]);   // (intimes : ils acceptent toujours, ACCEPTE)
  const i = inviter(s, s.day + 1, 'soir', [{ hameau: HAMEAU_VILLAGE, id: v.id }, { hameau: HAMEAU_VILLAGE, id: w.id }]);
  assert(i.ok, i.error);
  invitationsNuit(s);
  assert(i.invitation.invites.every((q) => q.reponse === 'oui'), 'ils viennent');
  s.day += 1;
  aHeure(s, 19);
  const inv = invitationDuMoment(s);
  assert(inv && inv.id === i.invitation.id, 'le moment');
  const M = invitesModele(s);
  assert(M.invites.every((g) => g.villageois && Number.isInteger(g.depart)), 'chacun vient de sa porte (la scène : de là où il est)');
  assert(!M.paroles.table.some((t) => /calèche/i.test(t)), 'à table, pas de calèche');
  const plat = Object.keys(v.gouts).find((k) => v.gouts[k] === 'adore' && DATA.OBJETS[k].plat) || 'pain';
  addItem(s, plat, 1);
  const avant = s.amitie.pnj[v.id].pts;
  const r = servirRepas(s, inv.id, [plat], true);
  assert(r.ok, r.error);
  assert(s.amitie.pnj[v.id].pts >= avant, 'l\'amitié (au plus haut, elle y reste)');
  poser(s, w.id, P[2]);
  // (le lendemain, il s'en souvient)
  s.day += 1;
  assert(souvenirParole(copie(s), v.id), 'un souvenir');
  const p = parler(s, v.id);
  assertEqual(p.emotion, 'joie');
  assert(/repas/.test(p.texte), `il en parle : ${p.texte}`);
});

/* ---------- les propos ---------- */

test('les propos : ni hameau, ni calèche, ni cousin, ni fête ; les sujets de l\'île ; une bulle par phrase', () => {
  const { s, V: [v, w] } = ile();
  attribuer(s, v.id, 'bois'); attribuer(s, w.id, 'bois');
  s.day += 20;
  poser(s, v.id, P[3]);
  const ids = sujetsVillageois(s, v).map((x) => x.id);
  for (const id of ids) assert(!/^(voisin|voisin_metier|lien_|visite_|entraide_|reserve_hier|caleche|projet|fete_|famille_)/.test(id), `pas ${id}`);
  for (const id of ['village_collegue', 'village_depuis', 'ami_proche', 'jours']) assert(ids.includes(id), `${id} est vrai`);
  // (il dit les sujets à tour de rôle, sans redire les derniers)
  const dits = [];
  for (let k = 0; k < 6; k++) { const x = proposVillageois(s, v, () => (k * 0.37) % 1); if (x) dits.push(x.id); }
  assertEqual(new Set(dits.slice(0, DATA.HABITANTS.PROPOS.MEMOIRE)).size, Math.min(DATA.HABITANTS.PROPOS.MEMOIRE, dits.length), 'pas deux fois de suite');
  // (une bulle : chaque phrase tient en BULLE caractères, mots remplacés par un long prénom)
  const BULLE = 96, P2 = DATA.VILLAGE.PROPOS, H = DATA.HABITANTS.PROPOS;
  const toutes = [
    ...Object.entries(P2).filter(([k, L]) => k !== 'GARDES' && Array.isArray(L)).flatMap(([, L]) => L),
    ...P2.GARDES.flatMap((k) => H[k] || []),
    ...Object.values(A().PHRASES.cadeau).flat(), ...Object.values(A().PHRASES.gout).flat(),
    ...A().PHRASES.present, ...A().PHRASES.retrouvailles, ...A().PHRASES.table,
    ...['proche', 'intime', 'retrouvailles', 'present'].flatMap((k) => DATA.VILLAGE.SOCIAL.JOUEUR[k]),
  ];
  assert(toutes.length > 60, 'des phrases');
  for (const t of toutes) {
    const l = t.replace(/\{\w+\}/g, 'Maximilienne').replace('{quoi}', '3 × pomme de pin');
    assert(l.length <= BULLE, `une bulle (${l.length}) : ${t}`);
    assert(!/hameau|calèche|cousin/i.test(t), `pas de hameau ni de calèche : ${t}`);
  }
  for (const k of P2.GARDES) assert(Array.isArray(H[k]) && H[k].length, `${k} existe chez les habitants`);
});

/* ---------- la sauvegarde ---------- */

test('la sauvegarde : v90 → v91 ; l\'amitié des villageois réparée, les hameaux intacts ; sans villageois, rien', () => {
  assert(STATE_VERSION >= 91, 'le format 91 ou plus');
  const { s, V: [v, w] } = ile();
  parler(s, v.id);
  const m = migrate(copie(s));
  assertEqual(m.version, STATE_VERSION);
  assertEqual(m.amitie.pnj[v.id], s.amitie.pnj[v.id], 'gardée telle quelle');
  // (une partie de v89 : sans fiche d'amitié, des goûts abîmés, un présent illisible, la demande d'un parti)
  const vieille = { ...copie(s), version: 90 };
  delete vieille.amitie.pnj[v.id];
  vieille.villageois[1].gouts = { licorne: 'adore' };
  vieille.amitie.pnj[w.id].present = { objet: 'licorne', n: 2 };
  vieille.amitie.pnj.hameau_1 = { pts: 33, gouts: {} };
  vieille.demandes = { seq: 2, faites: 0, annonces: [], liste: [{ id: 'dem-1', hameau: HAMEAU_VILLAGE, membre: 'vg-9', objet: 'pain', n: 1, fin: 99 }, { id: 'dem-2', hameau: 'h1', membre: 'h1:0', objet: 'pain', n: 1, fin: 99 }] };
  const r = migrate(vieille);
  assertEqual(r.version, STATE_VERSION);
  assertEqual(r.amitie.pnj[v.id].pts, A().ACCUEIL, 'l\'accueil');
  assert(Object.keys(r.villageois[1].gouts).length && Object.keys(r.villageois[1].gouts).every((it) => DATA.OBJETS[it]), 'des goûts tirés');
  assert(!('present' in r.amitie.pnj[w.id]), 'le présent illisible s\'en va');
  assertEqual(r.amitie.pnj.hameau_1, { pts: 33, gouts: {} }, 'un habitant : pas touché (I7f)');
  assertEqual(r.demandes.liste.map((d) => d.id), ['dem-2'], 'la demande d\'un villageois parti s\'oublie');
  // (sans villageois : rien ne change)
  const sans = { ...copie(createNewGame(3)), version: 89 };
  const z = migrate(copie(sans));
  assert(!('villageois' in z), 'pas de villageois');
  assertEqual(z.amitie, sans.amitie, 'l\'amitié telle quelle');
});

/* ---------- éteint ---------- */

test('éteint : pas de villageois dans l\'amitié, ni présent, ni demande ; la partie n\'est pas touchée', () => {
  const { s, V: [v] } = ile();
  avecVillage(() => {
    assertEqual(trouverPnj(s, HAMEAU_VILLAGE, v.id), null, 'pas de villageois');
    const avant = JSON.stringify(s);
    assertEqual(amitieVillageoisNuit(s), null);
    assertEqual(demandesVillageoisNuit(s, s.villageois), null);
    assert(!relationsInvitables(s).some((r) => r.hameau === HAMEAU_VILLAGE), 'on ne les invite pas');
    assertEqual(JSON.stringify(s), avant, 'rien n\'a bougé');
    const t = createNewGame(5);
    assert(!t.amitie || !Object.keys(t.amitie.pnj || {}).some((k) => /^vg-/.test(k)), 'une partie neuve : rien');
    assertEqual(farmSeed(t) !== undefined, true);
  }, false);
});
