/* ==========================================================================
   Tests du chantier « l'île à bâtir » : la vie des villageois sur la ferme (docs/ile.md, fiche I3b ;
   js/engine/villageois-journee.js). Comme tous les fichiers tests/engine/village-*.test.mjs, il tourne avec
   VILLAGE.ACTIF forcé à true.
   - la journée : des segments de 0 à 24 h, sans trou, les états de la fiche ; dormir la nuit dans son lit, se lever,
     sortir, manger assis à midi et le soir, rentrer à la veillée ;
   - la position déduite de l'heure est déterministe : la même partie (une copie, rechargée) donne la même position à
     la même heure ; une autre graine, une autre journée ;
   - les lieux : la table de sa maison d'abord, sinon la table commune ; un siège par villageois ; les bancs, la
     place, les chemins posés ; sous la pluie, chez lui ; au repos, chez lui ;
   - jamais dans un mur : sur un lot de fermes générées (des maisons, une place, des chemins), aucun lieu n'est une
     case de mur ni d'un bloc qui arrête (un siège : la case d'où l'on s'y assoit est libre) ;
   - parler : la bulle tirée de la graine (le même appui, la même phrase), l'objectif du jour « parler » ;
   - éteint : rien.
   Lancer seul : node tests/run-tests.mjs village-journee.
   ========================================================================== */

import {
  addItem, arriverVillageois, blocsPoses, caseBatissable, casesCouvertes, DATA, farmTerrain, journeeDuVillage, journeesPourLaCarte,
  lieuxDuVillage, maisonsMarquees, meteoDuJour, paroleVillageois, piecesCloses, poserBloc, positionVillageois, testMaisonVillageois,
  ETATS_VILLAGEOIS,
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

// La place : un puits, une table de jardin et ses quatre chaises, deux bancs ; et un chemin posé de 10 cases.
function place(s) {
  const W = farmTerrain(s).LARGEUR, z = coin(s, 9, 7);
  assert(z !== null, 'un coin pour la place');
  const at = (x, y) => z + y * W + x;
  poser(s, 'puits', at(4, 1));
  poser(s, 'table_jardin', at(4, 4));
  poser(s, 'chaise_jardin', at(3, 4), 1); poser(s, 'chaise_jardin', at(5, 4), 3); poser(s, 'chaise_jardin', at(4, 5), 0); poser(s, 'chaise_jardin', at(4, 3), 2);
  poser(s, 'banc_jardin', at(1, 2)); poser(s, 'banc_pierre', at(7, 2));
  for (let x = 0; x < 9; x++) poser(s, 'chemin', at(x, 6));
  return { z, at };
}

// Une maison de villageois plus grande (7 × 6, murs compris), à la main : un lit, une table de trois cases et deux
// chaises, la boîte aux lettres contre la porte.
function grandeMaison(s) {
  const W = farmTerrain(s).LARGEUR, z = coin(s, 7, 7);
  assert(z !== null, 'un coin pour la maison');
  const at = (x, y) => z + y * W + x;
  for (let y = 0; y < 6; y++) for (let x = 0; x < 7; x++) if (y === 0 || x === 0 || y === 5 || x === 6) s.blocs[at(x, y)] = 'mur_pierre';
  s.blocs[at(3, 5)] = 'porte';
  poser(s, 'paillasse', at(1, 1));
  poser(s, 'meuble_table', at(2, 3));
  poser(s, 'meuble_chaise', at(3, 2), 0);
  poser(s, 'meuble_chaise', at(3, 4), 2);
  poser(s, 'boite_aux_lettres', at(2, 6));
  return { z, at, lit: at(1, 1) };
}

// La partie d'essai : n maisons de test, la place, n villageois installés.
function ile(seed = 1, n = 3, o = {}) {
  const s = partie(seed);
  if (!s.blocs) s.blocs = {};
  const G = o.grande ? grandeMaison(s) : null;
  for (let k = 0; k < n - (G ? 1 : 0); k++) assert(testMaisonVillageois(s).ok, `maison ${k + 1}`);
  const P = o.place === false ? null : place(s);
  boite(s, { pain: 200 });
  for (let k = 0; k < n; k++) assert(arriverVillageois(s, { direct: true }).ok, `villageois ${k + 1}`);
  return { s, P, G };
}

// La nuit (state.day) : un jour sans pluie, ou avec (la météo du jour, tirée de la graine).
function jourOu(s, pluie) {
  for (let d = s.day; d < s.day + 120; d++) {
    const m = meteoDuJour(s, d);
    if ((m.sorte === 'pluie') === pluie && (!pluie || m.debut <= 15)) { s.day = d; return m; }
  }
  throw new Error('pas de tel jour');
}

/* ---------- la journée ---------- */

test('la journée : de 0 à 24 h sans trou, les états de la fiche ; dormir, se lever, sortir, manger, rentrer', () => {
  avecVillage(() => {
    const { s } = ile(1, 3);
    jourOu(s, false);
    const J = journeeDuVillage(s), H = DATA.VILLAGE.HORAIRE;
    assertEqual(J.size, 3, 'une journée par villageois');
    for (const [id, segs] of J) {
      assertEqual(segs[0].de, 0, `${id} : depuis minuit`);
      assertEqual(segs[segs.length - 1].a, 24, `${id} : jusqu'à minuit`);
      for (let k = 1; k < segs.length; k++) assert(Math.abs(segs[k].de - segs[k - 1].a) < 1e-9, `${id} : sans trou à ${segs[k].de}`);
      for (const x of segs) assert(ETATS_VILLAGEOIS.includes(x.etat) && x.a > x.de, `${id} : ${x.etat}`);
      const v = s.villageois.find((q) => q.id === id);
      const a = (h) => positionVillageois(s, id, h);
      assertEqual([a(3).etat, a(3).lieu.genre, a(3).lieu.case], ['dormir', 'lit', v.lit], `${id} : la nuit, dans son lit`);
      assertEqual(a(23.5).etat, 'dormir', `${id} : couché avant minuit`);
      assertEqual(a(H.LEVER + H.DECALE / 2 + 0.26).etat, 'lever', `${id} : levé, chez lui`);
      assert(['dehors', 'flaner', 'recoit'].includes(a(H.SORTIE + H.DECALE + 0.3).etat), `${id} : dehors le matin (ou il attend une visite)`);
      assertEqual(a(H.MIDI + 0.5).etat, 'repas', `${id} : à table à midi`);
      assertEqual(a(H.SOUPER + 0.6).etat, 'repas', `${id} : à table le soir`);
      assertEqual(a(H.VEILLEE + H.DECALE + 0.1).etat, 'rentrer', `${id} : rentré à la veillée`);
    }
  });
});

test('la position déduite de l\'heure est déterministe : la même partie, la même place ; une autre graine, une autre journée', () => {
  avecVillage(() => {
    const { s } = ile(2, 3);
    const t = copie(s);
    for (const h of [0.5, 6.8, 8.1, 9.6, 12.4, 14.2, 16.9, 18.9, 20.2, 22.9]) {
      for (const v of s.villageois) assertEqual(positionVillageois(t, v.id, h), positionVillageois(s, v.id, h), `${v.id} à ${h} h`);
    }
    assertEqual(copie([...journeeDuVillage(t)]), copie([...journeeDuVillage(s)]), 'la même journée');
    // (le lendemain : une autre journée ; le même jour rejoué : la même)
    const avant = copie([...journeeDuVillage(s)]);
    s.day += 1;
    const lendemain = copie([...journeeDuVillage(s)]);
    assert(JSON.stringify(lendemain) !== JSON.stringify(avant), 'le lendemain change');
    s.day -= 1;
    assertEqual(copie([...journeeDuVillage(s)]), avant, 'le même jour rejoué');
    // (une autre graine : d'autres retards, d'autres lieux)
    const { s: u } = ile(5, 3);
    u.day = s.day;
    assert(JSON.stringify(copie([...journeeDuVillage(u)])) !== JSON.stringify(avant), 'une autre graine');
  });
});

/* ---------- les lieux ---------- */

test('les repas : la table de sa maison d\'abord, sinon la table commune ; un siège chacun, assis', () => {
  avecVillage(() => {
    const { s, G } = ile(3, 3, { grande: true });
    jourOu(s, false);
    const L = lieuxDuVillage(s);
    assert(L.commune && L.commune.sieges.length === 4, 'la table commune et ses quatre chaises');
    const H = DATA.VILLAGE.HORAIRE;
    const midi = s.villageois.map((v) => positionVillageois(s, v.id, H.MIDI + 0.6));
    for (const p of midi) assertEqual([p.etat, p.lieu.genre], ['repas', 'siege'], 'assis à table');
    const chez = s.villageois.find((v) => v.lit === G.lit);
    const sa = midi[s.villageois.indexOf(chez)];
    assert(!sa.lieu.dehors && G.at(0, 0) < sa.lieu.case && sa.lieu.case < G.at(6, 5), 'celui de la grande maison mange chez lui');
    const sieges = midi.map((p) => p.lieu.case);
    assertEqual(new Set(sieges).size, sieges.length, 'pas deux sur le même siège');
    // (plus de villageois que de sièges : les autres mangent chez eux)
    const { s: t } = ile(4, 6);
    jourOu(t, false);
    const P = t.villageois.map((v) => positionVillageois(t, v.id, H.SOUPER + 0.6));
    assertEqual(P.filter((p) => p.lieu.genre === 'siege').length, 4, 'quatre à la table commune');
    assert(P.filter((p) => p.lieu.genre !== 'siege').every((p) => p.lieu.genre === 'maison'), 'les autres chez eux');
  });
});

test('flâner : un banc libre (un par créneau), sinon la place ; dehors sans but : les chemins posés et la place', () => {
  avecVillage(() => {
    const { s, P } = ile(6, 5);
    jourOu(s, false);
    const L = lieuxDuVillage(s), J = journeeDuVillage(s);
    assertEqual(L.bancs.length, 2, 'deux bancs (les chaises de la table n\'en sont pas)');
    const chemins = new Set(L.chemins), place = new Set(L.place);
    assert(chemins.size >= 9 && chemins.has(P.at(0, 6)), 'les chemins posés');
    let flane = 0, dehors = 0;
    for (const segs of J.values()) for (const x of segs) {
      if (x.etat === 'flaner') { flane++; assert(x.lieu.genre === 'siege' ? L.bancs.includes(x.lieu.case) : place.has(x.lieu.case), 'un banc ou la place'); }
      // (I3b+ : une sortie avec un but va à son lieu, village-social.test.mjs ; sans but, il va et vient)
      if (x.etat === 'dehors' && !x.but) { dehors++; assert(chemins.has(x.lieu.case) || place.has(x.lieu.case), 'un chemin ou la place'); }
      if (x.etat === 'dehors' && x.but) dehors++;
    }
    assert(flane > 0 && dehors > 0, `ils flânent (${flane}) et vont et viennent (${dehors})`);
    // (un banc n'a qu'un villageois à la fois)
    for (let h = 7.5; h < 18.5; h += 0.1) {
      const B = [...J.keys()].map((id) => positionVillageois(s, id, h)).filter((p) => p.etat === 'flaner' && p.lieu.genre === 'siege').map((p) => p.lieu.case);
      assertEqual(new Set(B).size, B.length, `un par banc à ${h.toFixed(1)} h`);
    }
  });
});

test('sous la pluie, il s\'abrite chez lui (repas du dehors compris) ; au repos, il reste chez lui', () => {
  avecVillage(() => {
    const { s } = ile(7, 3);
    const m = jourOu(s, true);
    for (const v of s.villageois) {
      const piece = maisonsMarquees(s).find((x) => x.boite === v.maison).piece;
      for (let h = m.debut + 0.01; h < m.fin; h += 0.2) {
        const p = positionVillageois(s, v.id, h);
        assert(!['dehors', 'flaner'].includes(p.etat) && !(p.etat === 'repas' && p.lieu.dehors), `${v.id} à l'abri à ${h.toFixed(2)} h : ${p.etat}`);
        if (p.etat === 'abri') assert(piece.cases.includes(p.lieu.case), 'chez lui');
      }
    }
    // le repos (mal nourri la nuit d'avant) : chez lui entre les repas
    const { s: t } = ile(8, 2);
    jourOu(t, false);
    t.villageois[0].repos = true;
    const segs = journeeDuVillage(t).get(t.villageois[0].id);
    assert(segs.some((x) => x.etat === 'repos') && !segs.some((x) => x.etat === 'dehors' || x.etat === 'flaner'), 'il se repose');
    assert(journeeDuVillage(t).get(t.villageois[1].id).some((x) => x.etat === 'dehors' || x.etat === 'flaner'), 'l\'autre sort');
  });
});

/* ---------- jamais dans un mur ---------- */

test('jamais dans un mur : sur un lot de fermes générées, chaque lieu de la journée est une case où se tenir', () => {
  avecVillage(() => {
    let lieux = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const { s } = ile(seed * 11, 4, { grande: seed % 2 === 0, place: seed % 3 !== 0 });
      const B = blocsPoses(s), couv = casesCouvertes(s), W = farmTerrain(s).LARGEUR;
      const bloque = (t) => { const b = B[t] !== undefined ? B[t] : B[couv.get(t)]; return b !== undefined && DATA.ATELIER.BLOCS[b] && (DATA.ATELIER.BLOCS[b].bloque || DATA.ATELIER.BLOCS[b].mur || DATA.ATELIER.BLOCS[b].porte); };
      const pieces = piecesCloses(s);
      for (let j = 0; j < 3; j++) {
        s.day += 1;
        for (const [id, segs] of journeeDuVillage(s)) {
          const v = s.villageois.find((q) => q.id === id), piece = maisonsMarquees(s).find((x) => x.boite === v.maison).piece;
          for (const x of segs) {
            const t = x.lieu.case;
            assert(Number.isInteger(t), `graine ${seed}, ${id} : un lieu`);
            lieux++;
            if (x.lieu.genre === 'siege') {
              assert(['chaise_jardin', 'banc_jardin', 'meuble_chaise', 'banc_rondins', 'chaise_peinte', 'banc_pierre'].includes(B[t]), 'un siège');
              assert([t + W, t - 1, t + 1, t - W].some((q) => !bloque(q) && B[q] === undefined && !couv.has(q)), 'une case libre d\'où s\'y asseoir');
              continue;
            }
            assert(!bloque(t), `graine ${seed}, ${id}, ${x.etat} : pas dans un mur (${B[t]})`);
            if (x.lieu.genre === 'lit') assertEqual(t, v.lit, 'son lit');
            else if (x.lieu.genre === 'maison') assert(piece.cases.includes(t) && B[t] === undefined, 'une case libre de sa maison');
            else assert(!pieces.some((p) => p.cases.includes(t)), `graine ${seed} : dehors, hors des pièces`);
          }
        }
      }
    }
    assert(lieux > 500, `des lieux vérifiés (${lieux})`);
  });
});

/* ---------- parler ---------- */

test('parler : sa bulle (le salut de l\'heure, ce qu\'il fait, son humeur), tirée de la graine ; l\'objectif « parler »', () => {
  avecVillage(() => {
    const { s } = ile(9, 2);
    s.objectifs = { faits: {} };
    const id = s.villageois[0].id;
    const a = paroleVillageois(s, id, { heure: 9, activite: 'flaner', n: 0 });
    const b = paroleVillageois(copie(s), id, { heure: 9, activite: 'flaner', n: 0 });
    assertEqual(a, b, 'le même appui, la même bulle');
    assertEqual([a.prenom, a.etat], [s.villageois[0].prenom, 'flaner']);
    assert(a.salut && DATA.HABITANTS.PHRASES.salut.matin.includes(a.salut), 'le salut du matin');
    assert(DATA.VILLAGE.PHRASES.ACTIVITE.flaner.includes(a.texte), 'ce qu\'il fait');
    assert(DATA.VILLAGE.PHRASES.HUMEUR[a.humeur].includes(a.humeurTexte), 'son humeur');
    assertEqual(s.objectifs.faits.parler, 1, 'l\'appui compté (pas celui de la copie)');
    const nuit = paroleVillageois(s, id, { heure: 2, activite: 'dormir', n: 1 });
    assertEqual([nuit.salut, nuit.humeurTexte], ['', ''], 'il dort : rien que son ronflement');
    assert(DATA.VILLAGE.PHRASES.ACTIVITE.dormir.includes(nuit.texte));
    // (sans activité dite : celle de son horaire)
    assertEqual(paroleVillageois(s, id, { heure: 3 }).etat, 'dormir');
    assertEqual(paroleVillageois(s, 'vg-99', {}), null, 'personne');
  });
});

test('éteint : ni journée ni lieux pour la carte', () => {
  avecVillage(() => {
    const { s } = ile(10, 1, { place: false });
    avecVillage(() => {
      assertEqual(journeesPourLaCarte(s), null, 'rien sur la carte');
      assertEqual(journeeDuVillage(s).size, 0, 'pas de journée');
      assertEqual(positionVillageois(s, 'vg-1', 12), null);
    }, false);
    assert(journeesPourLaCarte(s)['vg-1'].length > 5, 'allumé : sa journée');
  });
});
