/* ==========================================================================
   Tests du chantier « l'île à bâtir » : les liens entre villageois (fiche I6b ; docs/ile.md ; js/engine/liens.js).
   Comme tous les fichiers tests/engine/village-*.test.mjs, il tourne avec VILLAGE.ACTIF forcé à true.
   - l'affinité : gardée (une demi-matrice), elle monte chaque nuit selon ce qu'ils ont vécu (l'île, le voisinage, le
     même poste, la même table, une sortie, un repas du joueur, le même toit, un repas apporté) et ne baisse jamais ;
     au-delà de LENT, moitié ; une paire sans valeur part de l'estimation d'I3b+ ; les paliers nommés ;
   - deux villageois au même poste deviennent camarades en quelques jours, puis amis ;
   - ce que les liens changent : le bonheur, le travail à deux (une action de plus à eux deux), l'entraide (un repas
     apporté le lendemain midi à qui se repose), les habitudes (le banc à deux, à table à côté d'un ami, la visite du
     soir) ;
   - le foyer à deux (proposé, dans une maison à deux lits ; chacun son lit ; leur ancienne maison se libère) ;
     l'enfant (un lit d'enfant, le prochain bac ; il ne travaille pas, il joue sur la place) ;
   - les propos (voisin, lien_ami, visite_*, entraide_*, foyer) ; la fiche (liensVillageois, quiEstLie) ;
   - le déterminisme ; la sauvegarde (v91 → v92, réparée) ; les commandes ; éteint : rien.
   Lancer seul : node tests/run-tests.mjs village-liens.
   ========================================================================== */

import {
  accueillirEnfant, addItem, affiniteGardee, arriveeEnfantRefus, arriverEnfant, arriverVillageois, attribuer, awakeMsAtHour, bonheurDesLiens,
  caseBatissable, connaissance, DATA, entraidesDuJour, executerCommande, farmTerrain, foyerDe, foyerRefus, formerFoyer, journeeDuVillage,
  jourDeBac, liensFinDeNuit, liensNuit, liensVillageois, lieuxDuVillage, maisonsLibres, maisonsMarquees, meteoDuJour, migrate, palierLien,
  poserAffinite, poserBloc, quiEstLie, reparerLiens, runNight, STATE_VERSION, sujetsVillageois, actionsDuJour, testMaisonVillageois,
  verifierMaisons, villageoisNuit, voisinsDe,
} from '../../js/engine/index.js';
import { assert, assertEqual, avecVillage, boite, partie, test } from './aide.mjs';

const copie = (o) => JSON.parse(JSON.stringify(o));
const LI = DATA.VILLAGE.LIENS, P = LI.PALIERS;

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

// La place : un puits, une table de jardin et ses quatre chaises, deux bancs côte à côte, un chemin.
function place(s) {
  const W = farmTerrain(s).LARGEUR, z = coin(s, 11, 8);
  assert(z !== null, 'un coin pour la place');
  const at = (x, y) => z + y * W + x;
  poser(s, 'puits', at(4, 1));
  poser(s, 'table_jardin', at(4, 5));
  poser(s, 'chaise_jardin', at(3, 5), 1); poser(s, 'chaise_jardin', at(5, 5), 3); poser(s, 'chaise_jardin', at(4, 6), 0); poser(s, 'chaise_jardin', at(4, 4), 2);
  poser(s, 'banc_jardin', at(8, 2)); poser(s, 'banc_jardin', at(9, 2));
  for (let x = 0; x < 11; x++) poser(s, 'chemin', at(x, 7));
  return { z, at };
}

// La partie d'essai : n maisons (`lits` lits chacune), la place, n villageois arrivés aujourd'hui.
function ile(seed = 1, n = 4, o = {}) {
  const s = partie(seed);
  if (!s.blocs) s.blocs = {};
  const M = [];
  for (let k = 0; k < n; k++) { const m = testMaisonVillageois(s, o.lits || 1); assert(m.ok, `maison ${k + 1}`); M.push(m); }
  if (o.place !== false) place(s);
  boite(s, { pain: 300 });
  for (let k = 0; k < n; k++) assert(arriverVillageois(s, { direct: true }).ok, `villageois ${k + 1}`);
  for (const v of s.villageois) v.avis = [];
  return { s, V: s.villageois, M };
}

function jourSec(s) {
  for (let d = s.day; d < s.day + 120; d++) if (meteoDuJour(s, d).sorte !== 'pluie') { s.day = d; return; }
  throw new Error('pas de jour sec');
}

// Une nuit des liens seulement (le jour vécu, puis le suivant).
function nuit(s) {
  const r = liensNuit(s);
  s.day += 1;
  return r;
}

// Deux villageois ont travaillé à la même tâche aujourd'hui (ce que la nuit lit : v.travail).
function auPoste(s, ids, tache = 'bois') {
  for (const id of ids) { const v = s.villageois.find((x) => x.id === id); v.tache = tache; v.travail = { jour: s.day, tache, actions: 3, produit: {}, essai: 0 }; }
}

/* ---------- l'affinité ---------- */

test('l\'affinité : gardée, elle monte de ce qu\'ils vivent ensemble, jamais ne baisse ; une paire sans valeur vaut l\'estimation', () => {
  const { s, V: [a, b, c, d] } = ile(1, 4);
  // (les causes une à une, sans les traits qui s'accordent : fiche I6c, village-traits.test.mjs)
  for (const v of s.villageois) v.traits = [];
  // (avant la première nuit : rien de gardé, l'estimation d'I3b+ : l'affinité tirée seule, arrivés le même jour)
  assertEqual(affiniteGardee(s, a.id, b.id), null, 'rien de gardé');
  const e0 = connaissance(s, a.id, b.id).score;
  assert(e0 <= LI.AFFINITE, `l'affinité tirée seule (${e0})`);
  nuit(s);
  assert(affiniteGardee(s, a.id, b.id) >= e0, 'gardée après une nuit');
  assertEqual(typeof s.liens.aff, 'string', 'une demi-matrice compacte');
  assertEqual(s.liens.aff.length, 2 * 6, 'deux chiffres par paire, six paires');
  // (les causes, une à une : deux paires au même départ, l'une vit quelque chose de plus)
  const G = LI.GAINS, delta = (prep) => {
    for (const [x, y] of [[a, b], [c, d]]) poserAffinite(s, x.id, y.id, 20);
    prep();
    nuit(s);
    for (const v of s.villageois) { v.travail = null; }
    return affiniteGardee(s, a.id, b.id) - affiniteGardee(s, c.id, d.id);
  };
  assertEqual(delta(() => auPoste(s, [a.id, b.id])), G.POSTE, 'POSTE : la même tâche, le même jour');
  for (const v of s.villageois) v.tache = null;
  // (le même repas du joueur : un souvenir du jour, l'invitation de la fiche I6a)
  assertEqual(delta(() => { for (const v of [a, b]) s.amitie.pnj[v.id].souvenirs = [{ jour: s.day, plat: 'pain', terrasse: false }]; }), G.FETE, 'FETE : le même repas du joueur');
  // (un repas apporté)
  jourSec(s);
  assert(delta(() => { b.repos = true; s.liens.entraide.push({ jour: s.day, de: a.id, a: b.id }); }) >= G.ENTRAIDE, 'ENTRAIDE');
  b.repos = false;
  // (jamais de baisse, jamais plus de 100 ; au-delà de LENT, moitié)
  poserAffinite(s, a.id, b.id, LI.LENT + 10);
  poserAffinite(s, c.id, d.id, LI.LENT - 20);
  const ab = affiniteGardee(s, a.id, b.id), cd = affiniteGardee(s, c.id, d.id);
  nuit(s);
  assert((affiniteGardee(s, a.id, b.id) - ab) * 2 >= (affiniteGardee(s, c.id, d.id) - cd) - 1, 'moitié au-delà de LENT');
  const avant = copie(s.liens.aff);
  for (let k = 0; k < 60; k++) nuit(s);
  const n = s.villageois.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const x = s.villageois[i].id, y = s.villageois[j].id;
    const k = (j * (j - 1)) / 2 + i, v0 = parseInt(avant.slice(2 * k, 2 * k + 2), 36);
    assert(affiniteGardee(s, x, y) >= v0, 'jamais de baisse');
    assert(affiniteGardee(s, x, y) <= 100, 'au plus 100');
  }
});

test('les paliers : connaissance, camarade, ami, proche ; le degré de la vie sociale (1, 1, 2, 3)', () => {
  const { s, V: [a, b] } = ile(2, 2);
  assertEqual([0, P.connaissance, P.camarade, P.ami, P.proche].map(palierLien), [0, 1, 2, 3, 4]);
  const noms = [];
  for (const sc of [0, P.connaissance, P.camarade, P.ami, P.proche]) {
    poserAffinite(s, a.id, b.id, sc);
    const c = connaissance(s, a.id, b.id);
    noms.push([c.nom, c.degre]);
    assertEqual(connaissance(s, b.id, a.id).score, sc, 'symétrique');
  }
  assertEqual(noms, [['inconnu', 0], ['connaissance', 1], ['camarade', 1], ['ami', 2], ['proche', 3]]);
});

test('au même poste, deux villageois deviennent camarades en quelques jours, puis amis', () => {
  const { s, V: [a, b, c] } = ile(3, 3);
  const jours = { camarade: null, ami: null };
  for (let j = 1; j <= 14; j++) {
    auPoste(s, [a.id, b.id]);
    nuit(s);
    const nom = connaissance(s, a.id, b.id).nom;
    if (!jours.camarade && ['camarade', 'ami', 'proche'].includes(nom)) jours.camarade = j;
    if (!jours.ami && ['ami', 'proche'].includes(nom)) jours.ami = j;
  }
  assert(jours.camarade !== null && jours.camarade <= 4, `camarades en ${jours.camarade} jours`);
  assert(jours.ami !== null && jours.ami <= 8, `amis en ${jours.ami} jours`);
  // (le troisième, à une autre tâche, est moins lié)
  assert(connaissance(s, a.id, c.id).score < connaissance(s, a.id, b.id).score, 'moins lié à un autre poste');
});

/* ---------- ce que les liens changent ---------- */

test('le bonheur : un ami au village, un proche, un repas apporté', () => {
  const { s, V: [a, b, c] } = ile(4, 3);
  for (const [x, y] of [[a, b], [a, c], [b, c]]) poserAffinite(s, x.id, y.id, 0);
  assertEqual(bonheurDesLiens(s, a), 0, 'personne');
  poserAffinite(s, a.id, b.id, P.ami);
  assertEqual(bonheurDesLiens(s, a), LI.BONHEUR.AMI, 'un ami');
  poserAffinite(s, a.id, c.id, P.proche);
  assertEqual(bonheurDesLiens(s, a), LI.BONHEUR.PROCHE, 'un proche (le plus grand)');
  s.liens.entraide.push({ jour: s.day, de: c.id, a: a.id });
  assertEqual(bonheurDesLiens(s, a), LI.BONHEUR.PROCHE + LI.ENTRAIDE.BONHEUR, 'un repas apporté');
  // (la nuit du villageois le lit : sa cible monte)
  const t = copie(s);
  const sans = copie(s);
  sans.liens = { ordre: [], aff: '', foyers: [], entraide: [] };
  for (const [x, y] of [[a, b], [a, c], [b, c]]) poserAffinite(sans, x.id, y.id, 0);
  villageoisNuit(t); villageoisNuit(sans);
  assert(t.villageois[0].bonheur >= sans.villageois[0].bonheur, `plus heureux avec ses amis (${t.villageois[0].bonheur} ≥ ${sans.villageois[0].bonheur})`);
});

test('le travail à deux : deux amis au même poste gagnent une action par jour à eux deux', () => {
  const { s, V: [a, b] } = ile(5, 2);
  s.outils = { hache: true, pioche: true, faux: true, canne: true, choisi: 'hache' };
  for (const v of [a, b]) { addItem(s, 'hache', 0); v.outil = 'hache'; assert(attribuer(s, v.id, 'bois').ok, 'la tâche'); }
  const A = DATA.TACHES.LISTE.bois.ACTIONS;
  poserAffinite(s, a.id, b.id, P.camarade);
  assertEqual([actionsDuJour(s, a), actionsDuJour(s, b)], [A, A], 'des camarades : rien de plus');
  poserAffinite(s, a.id, b.id, P.ami);
  assertEqual(actionsDuJour(s, a) + actionsDuJour(s, b), 2 * A + LI.TRAVAIL.ACTIONS, 'des amis : une action de plus à eux deux');
  // (l'un au repos : rien de plus)
  b.repos = true;
  assertEqual(actionsDuJour(s, a), A, 'l\'autre au repos');
});

test('l\'entraide : qui se repose reçoit le lendemain midi la visite d\'un ami qui lui apporte un repas', () => {
  const { s, V: [a, b, c] } = ile(6, 3);
  jourSec(s);
  poserAffinite(s, a.id, b.id, P.ami + 5); poserAffinite(s, a.id, c.id, P.connaissance); poserAffinite(s, b.id, c.id, P.connaissance);
  a.repos = true;
  const r = liensFinDeNuit(s);
  assertEqual(r.entraide, [{ de: b.id, a: a.id }], 'son meilleur ami lui apportera un repas');
  // (pas de repas d'un simple connu)
  const t = copie(s);
  t.liens.entraide = [];
  poserAffinite(t, a.id, b.id, P.camarade);
  assertEqual(liensFinDeNuit(t).entraide, [], 'pas d\'un camarade');
  // le lendemain : à midi, il va à sa porte avec le repas ; l'autre, chez lui, sort le recevoir
  s.day += 1;
  jourSec(s);
  s.liens.entraide = s.liens.entraide.map((e) => ({ ...e, jour: s.day }));
  assertEqual(entraidesDuJour(s).length, 1, 'le repas du jour');
  const J = journeeDuVillage(s), L = lieuxDuVillage(s), D = L.maisons.get(a.maison).devant;
  const midi = DATA.VILLAGE.HORAIRE.MIDI + 0.6;
  const sb = J.get(b.id).find((x) => midi >= x.de && midi < x.a), sa = J.get(a.id).find((x) => midi >= x.de && midi < x.a);
  assert(sb.but && sb.but.apporte && sb.but.role === 'visiteur', 'il apporte le repas');
  assertEqual([sb.lieu.case, sb.lieu.vers], [D.front, D.porte], 'devant sa porte, tourné vers elle');
  assertEqual(sb.but.emoji, DATA.VILLAGE.SOCIAL.BUTS.EMOJI.apporte, '🍲');
  assert(sa.but && sa.but.apporte && sa.but.role === 'hote' && sa.lieu.case === D.cote, 'l\'autre sort le recevoir');
  // la nuit : un événement entre voisins, un avis, du bonheur et de l'affinité de plus
  const av = affiniteGardee(s, a.id, b.id);
  const n = liensNuit(s);
  assert(n.evenements.some((e) => e.sorte === 'entraide' && e.qui === b.id && e.chez === a.id), 'l\'événement');
  assert(voisinsDe(s).evenements.some((e) => e.hameau === 'village' && e.sorte === 'entraide'), 'avec les événements entre voisins');
  assert(a.avis.includes(`entraide:${b.id}`), 'l\'avis');
  assert(affiniteGardee(s, a.id, b.id) > av, 'ils se lient');
  assertEqual(bonheurDesLiens(s, a) >= LI.ENTRAIDE.BONHEUR, true, 'son bonheur');
  // (les propos)
  const ids = sujetsVillageois(s, a).map((x) => x.id), idsB = sujetsVillageois(s, b).map((x) => x.id);
  assert(ids.includes('entraide_recue') && idsB.includes('entraide_donnee'), 'ils en parlent');
});

test('les habitudes : deux amis côte à côte sur deux bancs, à table à côté d\'un ami, la visite du soir', () => {
  const { s, V } = ile(7, 6);
  jourSec(s);
  // (tous amis : les bancs à deux, les visites)
  for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) poserAffinite(s, V[i].id, V[j].id, P.ami + 10);
  const L = lieuxDuVillage(s);
  assert(L.duos.length >= 1, 'deux bancs voisins');
  let bancs = 0, soirs = 0, voisins = 0, tables = 0;
  for (let j = 0; j < 8; j++) {
    s.day += 1;
    jourSec(s);
    const J = journeeDuVillage(s);
    const parCle = new Map();
    for (const [id, segs] of J) for (const x of segs) if (x.but) { if (!parCle.has(x.but.cle)) parCle.set(x.but.cle, []); parCle.get(x.but.cle).push({ id, x }); }
    for (const l of parCle.values()) {
      const b = l[0].x.but;
      if (b.sorte === 'banc') {
        assertEqual(l.length, 2, 'à deux');
        assert(l.every((e) => e.x.etat === 'flaner' && e.x.lieu.genre === 'siege'), 'assis');
        const [p, q] = l.map((e) => e.x.lieu.case).sort((u, w) => u - w);
        assertEqual(q - p, 1, 'côte à côte');
        bancs++;
      }
      if (b.soir) {
        const vis = l.find((e) => e.x.but.role === 'visiteur'), hote = l.find((e) => e.x.but.role === 'hote');
        assert(vis && hote, 'un visiteur, un hôte');
        assert(vis.x.de >= DATA.VILLAGE.HORAIRE.VEILLEE, `après le souper (${vis.x.de})`);
        const vh = s.villageois.find((v) => v.id === hote.id);
        assertEqual(vis.x.lieu.vers, L.maisons.get(vh.maison).devant.porte, 'à la porte de l\'ami');
        soirs++;
      }
    }
    // (à table : chacun près d'un ami)
    const W = L.W, tab = [];
    for (const [id, segs] of J) for (const x of segs) if (x.etat === 'repas' && x.lieu.table === (L.commune && L.commune.table) && x.de < 15) tab.push({ id, c: x.lieu.case });
    if (tab.length >= 2) {
      tables++;
      const [u, w] = tab;
      const d = Math.abs((u.c % W) - (w.c % W)) + Math.abs(Math.floor(u.c / W) - Math.floor(w.c / W));
      if (d <= 2) voisins++;
    }
  }
  assert(bancs >= 1, `des bancs à deux (${bancs})`);
  assert(soirs >= 2, `des visites du soir (${soirs})`);
  assert(tables >= 1 && voisins === tables, 'à table, à côté d\'un ami');
  // (la nuit garde la visite du soir : les propos)
  const n = liensNuit(s);
  if (n.evenements.some((e) => e.soir)) {
    const e = n.evenements.find((x) => x.soir);
    assert(sujetsVillageois(s, s.villageois.find((v) => v.id === e.chez)).some((x) => x.id === 'visite_recue'), 'visite_recue');
  }
});

/* ---------- les foyers ---------- */

test('le foyer à deux : proposé à deux proches, dans une maison à deux lits ; chacun son lit ; l\'autre maison se libère', () => {
  const { s, V: [a, b, c], M } = ile(8, 3, { lits: 2 });
  poserAffinite(s, a.id, b.id, P.ami);
  assert(/proche/.test(foyerRefus(s, a.id, b.id)), 'pas avant d\'être proches');
  assert(!formerFoyer(s, a.id, b.id).ok, 'refusé');
  poserAffinite(s, a.id, b.id, P.proche);
  assertEqual(foyerRefus(s, a.id, b.id), null, 'proches, une maison à deux lits');
  const libresAvant = maisonsLibres(s).length;
  const r = formerFoyer(s, a.id, b.id, a.maison);
  assert(r.ok, r.error);
  assertEqual(a.maison, b.maison, 'sous le même toit');
  assert(a.lit !== b.lit && Number.isInteger(a.lit) && Number.isInteger(b.lit), 'chacun son lit');
  assertEqual(foyerDe(s, a.id), foyerDe(s, b.id), 'le même foyer');
  assertEqual(maisonsLibres(s).length, libresAvant + 1, 'la maison de l\'autre se libère');
  // (rien ne les sépare : la vérification des maisons les laisse ensemble)
  verifierMaisons(s);
  assertEqual([a.maison === b.maison, a.lit !== b.lit], [true, true], 'toujours ensemble');
  assert(foyerRefus(s, a.id, c.id), 'un seul foyer chacun');
  // (la journée : la même maison, chacun dans son lit)
  const J = journeeDuVillage(s);
  assertEqual(J.get(a.id)[0].lieu, { genre: 'lit', case: a.lit });
  assertEqual(J.get(b.id)[0].lieu, { genre: 'lit', case: b.lit });
  // (le même toit : ils se lient)
  const av = affiniteGardee(s, a.id, b.id);
  liensNuit(s);
  assert(affiniteGardee(s, a.id, b.id) > av, 'FOYER');
  assert(sujetsVillageois(s, a).some((x) => x.id === 'foyer'), 'il en parle');
  assertEqual(quiEstLie(s).foyers.length, 1, 'la vue d\'ensemble');
  assertEqual(liensVillageois(s, a.id)[0].id, b.id, 'le plus lié d\'abord');
  void M;
});

test('l\'enfant : un lit d\'enfant chez un foyer, le joueur le propose, il vient par le bac ; il ne travaille pas, il joue', () => {
  const { s, V: [a, b] } = ile(9, 2, { lits: 2 });
  poserAffinite(s, a.id, b.id, P.proche);
  // (dans la maison de b : la boîte à nourriture a pris un coin de la première)
  assert(formerFoyer(s, a.id, b.id, b.maison).ok, 'le foyer');
  const f = foyerDe(s, a.id);
  assert(/lit d'enfant/.test(accueillirEnfant(s, f.id).error || ''), 'il faut un lit d\'enfant');
  // un lit d'enfant dans leur maison
  const m = maisonsMarquees(s).find((x) => x.boite === a.maison);
  const W = farmTerrain(s).LARGEUR;
  // (il prend deux cases, vers le haut)
  const libre = m.piece.cases.find((t) => !s.blocs[t] && !s.blocs[t - W] && m.piece.cases.includes(t - W));
  poser(s, 'meuble_lit_enfant', libre);
  assert(accueillirEnfant(s, f.id).ok, 'proposé');
  // (le bac du jour, à quai)
  for (let d = s.day + 1; d < s.day + 20; d++) if (jourDeBac(s, d)) { s.day = d; break; }
  s.awakeMs = awakeMsAtHour(DATA.PORT.BAC.HEURES[0] + 1);
  assertEqual(arriveeEnfantRefus(s), null, 'il peut venir');
  const r = arriverEnfant(s);
  assert(r.ok, r.error);
  const e = r.villageois;
  assert(e.enfant && e.foyer === f.id && e.maison === a.maison, 'chez ses parents');
  assert(DATA.ATELIER.BLOCS[s.blocs[e.lit]].meuble === 'lit_enfant', 'dans le lit d\'enfant');
  assertEqual(f.enfant, e.id);
  assert(DATA.HABITANTS.PERSOS.enfant[e.genre].includes(e.perso), 'un personnage d\'enfant');
  assert(arriveeEnfantRefus(s), 'un seul par bac');
  assert(!attribuer(s, e.id, 'bois').ok, 'il ne travaille pas');
  assertEqual(connaissance(s, e.id, a.id).nom, 'proche', 'proche de ses parents');
  // (sa journée : il joue sur la place)
  e.accueil = null;
  jourSec(s);
  const J = journeeDuVillage(s).get(e.id);
  assert(J.some((x) => x.but && x.but.sorte === 'jeu'), 'il joue');
  assert(!J.some((x) => x.etat === 'travail'), 'pas de travail');
  assert(sujetsVillageois(s, a).some((x) => x.id === 'enfant'), 'les parents en parlent');
});

/* ---------- le déterminisme, la sauvegarde, les commandes, éteint ---------- */

test('déterministe : la même partie, les mêmes nuits, les mêmes liens et la même journée', () => {
  const { s } = ile(10, 5);
  const t = copie(s);
  for (let k = 0; k < 6; k++) { nuit(s); nuit(t); }
  assertEqual(s.liens, t.liens, 'les mêmes liens');
  jourSec(s); t.day = s.day;
  assertEqual(JSON.stringify([...journeeDuVillage(s)]), JSON.stringify([...journeeDuVillage(t)]), 'la même journée');
  // (une vraie nuit : la même chose)
  const u = copie(s), w = copie(s);
  runNight(u); runNight(w);
  assertEqual(u.liens, w.liens, 'runNight');
  assert(u.liens.aff !== s.liens.aff, 'runNight fait monter les liens');
});

test('la sauvegarde : v91 → v92 (les liens réparés ; sans villageois, rien) ; les commandes', () => {
  assert(STATE_VERSION >= 92, 'le format 92 ou plus');
  const { s, V: [a, b, c] } = ile(11, 3, { lits: 2 });
  // (une partie d'avant : ni liens ; l'estimation d'I3b+ garde ce qu'elle montrait)
  const vieille = copie(s);
  delete vieille.liens;
  vieille.version = 91;
  const m = migrate({ v: 1, t: 0, s: vieille });
  assertEqual(m.version, STATE_VERSION);
  assertEqual(m.liens, { ordre: [], aff: '', foyers: [], entraide: [] }, 'des liens vides');
  // (abîmés : réparés)
  const abime = copie(s);
  abime.liens = { ordre: [a.id, b.id, 'vg-99', 3], aff: '1g2zzz!!', foyers: [{ membres: [a.id, 'vg-99'] }, { id: 'fy-2', membres: [a.id, b.id], maison: a.maison, enfant: 'vg-77', attend: 'oui' }], entraide: [{ jour: 3, de: a.id, a: 'vg-99' }, 'x'] };
  const R = reparerLiens(abime).liens;
  assertEqual(R.ordre, [a.id, b.id, 'vg-99']);
  assertEqual(R.aff, '1g', 'les chiffres lisibles, au plus une paire de trop coupée');
  assertEqual(R.foyers.length, 1);
  assertEqual([R.foyers[0].enfant, R.foyers[0].attend], [null, true]);
  assertEqual(R.entraide, []);
  // (sans villageois : rien)
  const sans = copie(partie(12));
  sans.version = 91;
  assert(!('liens' in migrate({ v: 1, t: 0, s: sans })), 'rien sans villageois');
  // les commandes
  poserAffinite(s, a.id, b.id, P.proche);
  const r = executerCommande(s, { type: 'villageois.foyer', args: { a: a.id, b: b.id, maison: b.maison } });
  assert(r.ok, r.error);
  assertEqual(a.maison, b.maison);
  assert(!executerCommande(s, { type: 'villageois.enfant', args: { foyer: foyerDe(s, a.id).id } }).ok, 'sans lit d\'enfant');
  void c;
});

test('éteint : ni liens, ni nuit des liens, ni journée', () => {
  avecVillage(() => {
    const s = partie(13);
    assertEqual(liensNuit(s), null);
    assertEqual(liensFinDeNuit(s), null);
    assert(!('liens' in s), 'pas de state.liens');
    runNight(s);
    assert(!('liens' in s), 'toujours rien');
  }, false);
});
