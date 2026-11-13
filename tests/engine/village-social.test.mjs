/* ==========================================================================
   Tests du chantier « l'île à bâtir » : la vie sociale des villageois (I3b+, après la fiche I3b ; docs/ile.md ;
   js/engine/villageois-liens.js, js/engine/villageois-journee.js). Comme tous les fichiers
   tests/engine/village-*.test.mjs, il tourne avec VILLAGE.ACTIF forcé à true.
   - qui se connaît (connaissance) : déduit des jours passés ensemble, des maisons voisines, de la table commune et
     d'une affinité tirée de la graine ; symétrique ; la famille, connue dès l'arrivée, amie ensuite ; déterministe ;
   - les sorties ont un but : visite, rendez-vous, promenade à deux, eau, voir ; ceux qui le font ensemble partagent
     la même clé, au même moment (l'hôte attend chez lui, puis sort) ; jamais avec un inconnu ni un villageois au
     repos ; déterministe (la même partie, la même journée) ;
   - jamais dans un mur : sur un lot de fermes générées, chaque lieu d'une sortie (devant, groupe) est une case libre
     hors des pièces, tournée vers une case voisine ;
   - les répliques : tirées de la graine, du degré et de ce qu'ils font ; le salut au personnage du joueur ;
   - éteint : rien.
   Lancer seul : node tests/run-tests.mjs village-social.
   ========================================================================== */

import {
  addItem, arriverVillageois, blocsPoses, caseBatissable, casesCouvertes, connaissance, DATA, echangeVillageois, farmTerrain,
  journeeDuVillage, liensDuVillage, liensPourLaCarte, lieuxDuVillage, maisonsMarquees, meteoDuJour, paroleVillageois, piecesCloses,
  poserBloc, testMaisonVillageois, BUTS_VILLAGEOIS,
} from '../../js/engine/index.js';
import { assert, assertEqual, avecVillage, boite, partie, test } from './aide.mjs';

const copie = (o) => JSON.parse(JSON.stringify(o));

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

// La place : un puits, une table de jardin et ses quatre chaises, deux bancs, un chemin, une ruche (un ouvrage).
function place(s) {
  const W = farmTerrain(s).LARGEUR, z = coin(s, 11, 8);
  assert(z !== null, 'un coin pour la place');
  const at = (x, y) => z + y * W + x;
  poser(s, 'puits', at(4, 1));
  poser(s, 'table_jardin', at(4, 5));
  poser(s, 'chaise_jardin', at(3, 5), 1); poser(s, 'chaise_jardin', at(5, 5), 3); poser(s, 'chaise_jardin', at(4, 6), 0); poser(s, 'chaise_jardin', at(4, 4), 2);
  poser(s, 'banc_jardin', at(1, 2)); poser(s, 'banc_pierre', at(8, 2));
  poser(s, 'ruche', at(10, 4));
  for (let x = 0; x < 11; x++) poser(s, 'chemin', at(x, 7));
  return { z, at };
}

// La partie d'essai : n maisons de test, la place, n villageois installés, arrivés `il_y_a` jours plus tôt (en
// escalier : le k-ième deux jours après le précédent).
function ile(seed = 1, n = 4, o = {}) {
  const s = partie(seed);
  if (!s.blocs) s.blocs = {};
  for (let k = 0; k < n; k++) assert(testMaisonVillageois(s).ok, `maison ${k + 1}`);
  const P = o.place === false ? null : place(s);
  boite(s, { pain: 300 });
  for (let k = 0; k < n; k++) assert(arriverVillageois(s, { direct: true }).ok, `villageois ${k + 1}`);
  const il = o.il_y_a === undefined ? 12 : o.il_y_a;
  s.day = Math.max(s.day, il + 2);
  s.villageois.forEach((v, k) => { v.arrive = s.day - Math.max(0, il - 2 * k); });
  return { s, P };
}

function jourSec(s) {
  for (let d = s.day; d < s.day + 120; d++) if (meteoDuJour(s, d).sorte !== 'pluie') { s.day = d; return; }
  throw new Error('pas de jour sec');
}

// Tous les segments à but de la journée : [{ id, seg }].
const avecBut = (J) => [...J].flatMap(([id, segs]) => segs.filter((x) => x.but).map((seg) => ({ id, seg })));

/* ---------- qui se connaît ---------- */

test('connaissance : les jours ensemble, les maisons voisines, la table, l\'affinité ; symétrique ; la famille', () => {
  avecVillage(() => {
    const { s } = ile(1, 4, { il_y_a: 0 });
    const [a, b, c] = s.villageois.map((v) => v.id);
    // (arrivés le même jour : l'affinité seule)
    const c0 = connaissance(s, a, b);
    assertEqual(c0.jours, 0, 'aucun jour ensemble');
    assert(c0.score <= DATA.VILLAGE.SOCIAL.CONNAISSANCE.AFFINITE, `l'affinité seule (${c0.score})`);
    assertEqual(connaissance(s, b, a), c0, 'symétrique');
    assertEqual(connaissance(s, a, a), null, 'pas soi-même');
    assertEqual(connaissance(s, a, 'vg-99'), null, 'personne');
    // (des voisins se lient plus vite que des villageois loin l'un de l'autre)
    s.day += 4;
    const W = farmTerrain(s).LARGEUR, va = s.villageois[0];
    const ecart = (v) => Math.max(Math.abs((v.maison % W) - (va.maison % W)), Math.abs(Math.floor(v.maison / W) - Math.floor(va.maison / W)));
    const loin = s.villageois.slice(1).sort((x, y) => ecart(x) - ecart(y))[0], m0 = loin.maison;
    assert(ecart(loin) <= DATA.VILLAGE.SOCIAL.CONNAISSANCE.VOISINE, 'des voisins');
    const avant = connaissance(s, a, loin.id).score;
    loin.maison = m0 + 40 * W;   // (sa boîte aux lettres, loin : plus voisins)
    const apres = connaissance(s, a, loin.id).score;
    loin.maison = m0;
    assert(apres < avant, `loin, moins liés (${apres} < ${avant})`);
    s.day -= 4;
    // (le score monte avec les jours, jusqu'à l'amitié)
    const scores = [];
    for (let j = 0; j < 30; j += 5) { s.day += 5; scores.push(connaissance(s, a, c).score); }
    for (let k = 1; k < scores.length; k++) assert(scores[k] >= scores[k - 1], `il ne baisse pas (${scores})`);
    // (I6b : les paliers de VILLAGE.LIENS.PALIERS ; ami ou proche, degré 2 ou plus)
    assert(connaissance(s, a, c).degre >= 2 && ['ami', 'proche'].includes(connaissance(s, a, c).nom), 'amis après un mois');
    // la famille : connue dès l'arrivée, amie dès le palier VILLAGE.AMITIE.FAMILLE_AMI de l'amitié (I6a)
    const { s: t } = ile(2, 2, { il_y_a: 0 });
    assertEqual(connaissance(t, t.villageois[0].id, 'famille').nom, 'connaissance', 'connue dès l\'arrivée');
    t.day += 30;
    assertEqual(connaissance(t, t.villageois[0].id, 'famille').nom, 'connaissance', 'les jours seuls n\'en font pas une amie');
    t.amitie.pnj[t.villageois[0].id].pts = DATA.RECIT.PALIERS[DATA.VILLAGE.AMITIE.FAMILLE_AMI];
    assertEqual(connaissance(t, t.villageois[0].id, 'famille').nom, 'ami', 'amie avec l\'amitié');
    // la carte : les deux sens
    const C = liensPourLaCarte(s);
    assertEqual(C.paires[a][b], C.paires[b][a]);
    assertEqual(C.paires[a][b], connaissance(s, a, b).degre);
  });
});

test('connaissance : déterministe (la même partie, le même degré), une autre graine, une autre affinité', () => {
  avecVillage(() => {
    const { s } = ile(3, 5);
    const t = copie(s);
    for (const v of s.villageois) for (const w of s.villageois) assertEqual(connaissance(t, v.id, w.id), connaissance(s, v.id, w.id), `${v.id}, ${w.id}`);
    const ids = s.villageois.map((v) => v.id);
    const { s: u } = ile(4, 5);
    const aff = (x) => ids.flatMap((a) => ids.map((b) => (a < b ? connaissance(x, a, b).score : 0)));
    assert(JSON.stringify(aff(u)) !== JSON.stringify(aff(s)), 'une autre graine');
    // (I6b remplacera le calcul : la forme de ce qu'on lit ne change pas)
    const Lk = liensDuVillage(s);
    assertEqual(Lk.paires.size, 10, 'une paire par couple de villageois');
  });
});

/* ---------- des sorties qui ont un but ---------- */

test('les sorties ont un but : visites, rendez-vous, promenades, eau, voir ; ceux qui le font ensemble, ensemble', () => {
  avecVillage(() => {
    const { s } = ile(5, 6);
    const vus = new Set();
    for (let j = 0; j < 4; j++) {
      s.day += 1;
      jourSec(s);
      const J = journeeDuVillage(s), L = lieuxDuVillage(s);
      const parCle = new Map();
      for (const { id, seg } of avecBut(J)) {
        const b = seg.but;
        vus.add(b.sorte);
        assert(BUTS_VILLAGEOIS.includes(b.sorte), `un but connu (${b.sorte})`);
        // (I6b : le banc à deux, assis : « flaner »)
        assert(seg.etat === (b.sorte === 'banc' ? 'flaner' : 'dehors'), 'dehors');
        assert(typeof b.cle === 'string' && Array.isArray(b.avec), 'une clé, des compagnons');
        if (!parCle.has(b.cle)) parCle.set(b.cle, []);
        parCle.get(b.cle).push({ id, seg });
      }
      for (const [cle, l] of parCle) {
        const b = l[0].seg.but;
        if (!b.avec.length) { assertEqual(l.length, 1, `${cle} : seul`); continue; }
        // (les compagnons font la même chose au même moment)
        const ids = new Set(l.map((x) => x.id));
        for (const x of l) for (const o of x.seg.but.avec) assert(ids.has(o), `${cle} : ${o} y est aussi`);
        const de = Math.max(...l.map((x) => x.seg.de)), a = Math.min(...l.map((x) => x.seg.a));
        assert(a > de, `${cle} : ensemble un moment`);
        // (jamais avec un inconnu)
        for (const x of l) for (const o of x.seg.but.avec) assert(connaissance(s, x.id, o).degre >= 1, `${cle} : ils se connaissent`);
        if (b.sorte === 'visite') {
          const hote = l.find((x) => x.seg.but.role === 'hote'), visiteur = l.find((x) => x.seg.but.role === 'visiteur');
          assert(hote && visiteur, `${cle} : un hôte, un visiteur`);
          const v = s.villageois.find((q) => q.id === hote.id), D = L.maisons.get(v.maison).devant;
          assertEqual([visiteur.seg.lieu.case, visiteur.seg.lieu.vers], [D.front, D.porte], 'le visiteur devant la porte de l\'hôte, tourné vers elle');
          assertEqual(hote.seg.lieu.case, D.cote, 'l\'hôte sorti à côté');
          // (l'hôte attend chez lui, juste avant)
          const segs = J.get(hote.id), k = segs.indexOf(hote.seg);
          assert(k > 0 && ['recoit', 'abri'].includes(segs[k - 1].etat) || segs[k - 1].but, `${cle} : il attendait chez lui (${segs[k - 1].etat})`);
        }
        if (b.sorte === 'rdv') {
          assert(l.length >= 2 && l.length <= 3, `${cle} : à deux ou trois`);
          const centre = l[0].seg.lieu.vers;
          for (const x of l) assertEqual([x.seg.lieu.genre, x.seg.lieu.vers], ['groupe', centre], `${cle} : en cercle`);
          assertEqual(new Set(l.map((x) => x.seg.lieu.case)).size, l.length, `${cle} : chacun sa place`);
        }
        if (b.sorte === 'promenade') {
          assertEqual(l.map((x) => x.seg.but.role).sort(), ['meneur', 'suit'], `${cle} : un meneur, un ami`);
          for (const x of l) assert(connaissance(s, x.id, x.seg.but.avec[0]).degre >= 2, 'entre amis');
        }
      }
    }
    for (const b of ['visite', 'rdv', 'eau', 'ouvrage']) assert(vus.has(b), `des sorties « ${b} » (${[...vus]})`);
  });
});

test('pas de sortie à deux avec un inconnu ni avec un villageois au repos ; la journée est déterministe', () => {
  avecVillage(() => {
    // (arrivés le jour même : la plupart s'ignorent encore)
    const { s } = ile(6, 5, { il_y_a: 0 });
    jourSec(s);
    s.villageois[1].repos = true;
    const J = journeeDuVillage(s);
    for (const { id, seg } of avecBut(J)) {
      for (const o of seg.but.avec) {
        assert(connaissance(s, id, o).degre >= 1, `${id} et ${o} se connaissent`);
        assert(o !== s.villageois[1].id && id !== s.villageois[1].id, 'pas le villageois au repos');
      }
    }
    assert(!J.get(s.villageois[1].id).some((x) => x.etat === 'dehors'), 'au repos, il reste chez lui');
    // déterministe : la même partie (une copie), la même journée ; le lendemain, une autre
    const t = copie(s);
    assertEqual(copie([...journeeDuVillage(t)]), copie([...J]), 'la même journée');
    t.day += 1;
    assert(JSON.stringify(copie([...journeeDuVillage(t)])) !== JSON.stringify(copie([...J])), 'le lendemain change');
  });
});

/* ---------- jamais dans un mur ---------- */

test('jamais dans un mur : les lieux des sorties sont des cases libres, hors des pièces, tournées vers un voisin', () => {
  avecVillage(() => {
    let n = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const { s } = ile(seed * 7, 5, { place: seed % 3 !== 0 });
      const B = blocsPoses(s), couv = casesCouvertes(s), W = farmTerrain(s).LARGEUR;
      const dedans = new Set(piecesCloses(s).flatMap((p) => p.cases));
      const libre = (t) => B[t] === undefined && !couv.has(t) && !dedans.has(t);
      for (let j = 0; j < 3; j++) {
        s.day += 1;
        for (const { id, seg } of avecBut(journeeDuVillage(s))) {
          const l = seg.lieu;
          if (seg.but.sorte === 'port') continue;
          n++;
          assert(['devant', 'groupe'].includes(l.genre), `graine ${seed}, ${id} : ${l.genre}`);
          assert(libre(l.case), `graine ${seed}, ${id}, ${seg.but.sorte} : une case libre dehors (${B[l.case] || ''})`);
          assert(Number.isInteger(l.vers), 'tourné vers quelque chose');
          if (l.genre === 'groupe') {
            assert(libre(l.vers), 'le centre du cercle, libre');
            assert([l.vers - 1, l.vers + 1, l.vers + W].includes(l.case), 'autour du centre');
          } else {
            const d = Math.abs((l.case % W) - (l.vers % W)) + Math.abs(Math.floor(l.case / W) - Math.floor(l.vers / W));
            assert(d <= 2, `tout près de ce qu'il vient voir (${seg.but.sorte} : ${d})`);
          }
        }
        // (une maison de villageois : le devant de sa porte, dehors)
        for (const m of maisonsMarquees(s)) {
          const D = lieuxDuVillage(s).maisons.get(m.boite).devant;
          if (D) assert(libre(D.front) && libre(D.cote) && m.piece.cases.includes(D.dedans), 'devant la porte, dehors ; à l\'intérieur, dedans');
        }
      }
    }
    assert(n > 100, `des lieux vérifiés (${n})`);
  });
});

/* ---------- les répliques ---------- */

test('les répliques : tirées de la graine, selon le degré ; le salut au personnage du joueur ; plusieurs dizaines', () => {
  avecVillage(() => {
    const R = DATA.VILLAGE.SOCIAL.REPLIQUES;
    const paires = Object.values(R).flat();
    assert(paires.length >= 60, `plusieurs dizaines de paires (${paires.length})`);
    for (const p of paires) assert(Array.isArray(p) && p.length === 2 && p.every((x) => typeof x === 'string' && x.length > 0 && x.length <= 48), `une paire courte : ${JSON.stringify(p)}`);
    const { s } = ile(8, 3);
    const [a, b] = s.villageois.map((v) => v.id);
    const e = echangeVillageois(s, a, b, { n: 2, sorte: 'croise', heure: 9 });
    assertEqual(echangeVillageois(copie(s), a, b, { n: 2, sorte: 'croise', heure: 9 }), e, 'le même échange');
    assert(e.degre >= 1 && e.lignes.length === 2 && e.lignes.every((x) => x && !/[{}]/.test(x)), `deux répliques remplies : ${JSON.stringify(e.lignes)}`);
    assert(e.emoji.every((x) => typeof x === 'string'), 'les émotions');
    const autres = new Set();
    for (let n = 0; n < 12; n++) autres.add(echangeVillageois(s, a, b, { n, sorte: 'groupe', heure: 15 }).lignes[0]);
    assert(autres.size >= 4, `variées (${autres.size})`);
    // (inconnus : rien à se dire)
    const { s: t } = ile(9, 4, { il_y_a: 0 });
    const ids = t.villageois.map((v) => v.id);
    const inconnus = ids.flatMap((x) => ids.map((y) => [x, y])).find(([x, y]) => x < y && connaissance(t, x, y).degre === 0);
    if (inconnus) assertEqual(echangeVillageois(t, inconnus[0], inconnus[1], { n: 0 }).lignes, [], 'deux inconnus : rien');
    // le personnage du joueur
    const j = echangeVillageois(s, a, 'joueur', { n: 1 });
    assert(j.lignes.length === 1 && j.lignes[0] && !/[{}]/.test(j.lignes[0]), `un salut : ${j.lignes[0]}`);
    // (sa bulle, à un but : ce qu'il y fait)
    const p = paroleVillageois(s, a, { heure: 9, activite: 'dehors', but: 'eau', n: 0 });
    assert(DATA.VILLAGE.SOCIAL.ACTIVITE.eau.includes(p.texte), 'il puise de l\'eau');
    assertEqual(echangeVillageois(s, 'vg-99', b, {}), null, 'personne');
  });
});

test('éteint : ni liens ni échanges', () => {
  avecVillage(() => {
    const { s } = ile(10, 2);
    avecVillage(() => {
      assertEqual(liensPourLaCarte(s), null, 'rien pour la carte');
      assertEqual(connaissance(s, 'vg-1', 'vg-2'), null);
      assertEqual(echangeVillageois(s, 'vg-1', 'vg-2', {}), null);
    }, false);
    assert(liensPourLaCarte(s).paires['vg-1'], 'allumé : les liens');
  });
});
