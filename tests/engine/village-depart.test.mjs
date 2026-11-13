/* ==========================================================================
   Tests du chantier « l'île à bâtir » : le nouveau départ (docs/ile.md, fiche I7b ; js/engine/depart-ile.js,
   js/engine/didacticiel-ile.js). Comme tous les fichiers tests/engine/village-*.test.mjs, il tourne avec
   VILLAGE.ACTIF forcé à true.
   - l'écran de départ : « Seul » (un adulte tiré de la graine, sans compagnon), le nom de l'île proposé et borné ;
   - la terre vierge : pas de chemin intérieur (ni coins, ni tuiles de chemin dans le sol de la ferme) ; le seul
     chemin part de la porte de l'abri et va, d'un seul tenant, à la sortie de la ferme ; l'abri tel quel ;
   - le premier jour sans visite : la visite de bienvenue et la scène d'arrivée n'ont pas lieu, le plat est dans la
     boîte à nourriture de l'abri ;
   - le didacticiel : ses étapes passent d'elles-mêmes ; chacune se passe, le tout aussi ;
   - une partie seule et une partie à six, jouées par le joueur automatique : elles passent le didacticiel jusqu'au
     premier villageois et à sa tâche ;
   - la sauvegarde : v94 → v95 ; éteint, rien ne change.
   Lancer seul : node tests/run-tests.mjs village-depart
   ========================================================================== */

import {
  addItem, boiteCounts, butBoussole, commencerObjectifs, composeFamily, createNewGame, DATA, didacticielIleActif,
  etapeIle, familleSeule, farmMap, farmTerrain, fermeVierge, finishSetup, majDidacticielIle, mangeurs, migrate, nomIle,
  nomIlePropose, nommerIle, passerDidacticielIle, passerEtapeIle, simulatePlay, solsPoses, STATE_VERSION, villageoisDe,
} from '../../js/engine/index.js';
import { blocGid } from '../../js/engine/planche.js';
import { assert, assertEqual, avecVillage, test } from './aide.mjs';

const copie = (o) => JSON.parse(JSON.stringify(o));

// Une partie neuve du chantier, la famille `choix` (sinon seul), commencée comme à l'accueil.
function depart(graine = 5, choix = null) {
  const s = createNewGame(graine);
  const r = composeFamily(s, choix || familleSeule(s));
  assert(r.ok, r.error);
  assert(finishSetup(s).ok, 'installée');
  commencerObjectifs(s);
  return s;
}
const gardees = new Map();
function departGarde(graine = 5) {
  if (!gardees.has(graine)) gardees.set(graine, copie(depart(graine)));
  return copie(gardees.get(graine));
}

/* ---------- l'écran de départ ---------- */

test('seul : un adulte tiré de la graine, sans compagnon, ni enfant, ni animal', () => {
  const s = createNewGame(21);
  const a = familleSeule(s), b = familleSeule(createNewGame(21));
  assertEqual(a, b, 'la même graine, le même');
  assertEqual([a.compagnon, a.enfants, a.animaux], [null, [], []]);
  assert(composeFamily(s, a).ok, 'il se compose');
  assertEqual(s.famille.membres.length, 1);
  assertEqual(s.famille.membres[0].enfant, false);
  assertEqual(s.famille.membres[0].prenom, a.prenom);
  // (d'autres graines, d'autres gens)
  const prenoms = new Set([1, 2, 3, 4, 5, 6].map((g) => familleSeule(createNewGame(g)).prenom));
  assert(prenoms.size > 1, 'pas toujours le même');
});

test('le nom de l\'île : proposé d\'après la graine, modifiable, borné comme le nom de famille', () => {
  const s = createNewGame(22);
  const n = nomIlePropose(s);
  assert(DATA.VILLAGE.NOMS.ILE.includes(n), n);
  assertEqual(nomIlePropose(createNewGame(22)), n, 'la même graine, le même nom');
  for (const x of DATA.VILLAGE.NOMS.ILE) assert(x.length >= DATA.DEPART.NOM_MIN && x.length <= DATA.DEPART.NOM_MAX, `${x} : dans les bornes`);
  assertEqual(nomIle(s), n, 'nommée d\'emblée du nom proposé (I7g), que l\'écran de départ propose');
  assertEqual(nommerIle(s, 'x').ok, false, 'trop court');
  assertEqual(nommerIle(s, 'x'.repeat(DATA.DEPART.NOM_MAX + 1)).ok, false, 'trop long');
  assert(nommerIle(s, '  Île   des Essais ').ok);
  assertEqual(s.noms.ile, 'Île des Essais', 'gardé dans state.noms.ile, nettoyé');
  // (une partie commencée sans nom choisi : le nom proposé)
  const d = depart(22);
  assertEqual(nomIle(d), n);
});

/* ---------- la terre vierge ---------- */

test('la terre vierge : pas de chemin intérieur ; le seul chemin va de la porte de l\'abri à la sortie de la ferme', () => {
  const s = departGarde();
  assert(fermeVierge(s), 'une terre vierge');
  const T = farmTerrain(s), F = T.FERME, W = T.LARGEUR, V = W + 1;
  // (aucun coin de chemin peint sur la ferme)
  let coins = 0;
  for (let r = F.Y; r <= F.Y + F.HAUTEUR; r++) for (let c = F.X; c <= F.X + F.LARGEUR; c++) if (T.SOMMETS[r * V + c] === 1) coins++;
  assertEqual(coins, 0, 'pas de coin de chemin');
  // (le sol de la ferme : pas une tuile de chemin, rangées 4 à 12 de herbe_chemin)
  const chemin = new Set();
  for (let k = 4 * 16; k < 13 * 16; k++) chemin.add(blocGid('herbe_chemin', k));
  const ground = farmMap(s).layers.find((l) => l.name === 'ground').data;
  let tuiles = 0;
  for (let r = F.Y; r < F.Y + F.HAUTEUR; r++) for (let c = F.X; c < F.X + F.LARGEUR; c++) if (chemin.has(ground[r * W + c] & 0x0fffffff)) tuiles++;
  assertEqual(tuiles, 0, 'pas de tuile de chemin dans le sol');
  // (le monde d'avant, éteint, a bien un chemin : la même graine, une partie d'avant)
  const avant = copie(s);
  delete avant.dehors.ferme;
  let avantCoins = 0;
  const Ta = farmTerrain(avant);
  for (let i = 0; i < Ta.SOMMETS.length; i++) if (Ta.SOMMETS[i] === 1) avantCoins++;
  assert(avantCoins > 100, 'une partie d\'avant garde son chemin peint');
  // (les cases du chemin d'avant se labourent et se bâtissent maintenant : de l'herbe)
  const lignesAvant = Ta.LIGNES, lignes = T.LIGNES;
  let gagnees = 0;
  for (let r = F.Y; r < F.Y + F.HAUTEUR; r++) for (let c = F.X; c < F.X + F.LARGEUR; c++) if (lignesAvant[r][c] === '.' && lignes[r][c] === '#') gagnees++;
  assert(gagnees > 100, `l'herbe à la place du chemin (${gagnees} cases)`);
  // (le chemin du joueur : des blocs de chemin, d'un seul tenant, de la case devant la porte à la sortie)
  const sols = new Set(Object.entries(solsPoses(s)).filter(([, k]) => k === 'chemin').map(([t]) => Number(t)));
  assert(sols.size > 50, `un chemin posé (${sols.size} cases)`);
  const devant = s.abriDepart.porte + W, sortie = T.MONDE.cadre.SORTIE - 1;
  assert(sols.has(devant), 'devant la porte de l\'abri');
  for (const t of [sortie - W, sortie, sortie + W]) assert(sols.has(t), 'les trois rangées de la sortie');
  const vus = new Set([devant]), pile = [devant];
  while (pile.length) { const t = pile.pop(); for (const j of [t - 1, t + 1, t - W, t + W]) if (sols.has(j) && !vus.has(j)) { vus.add(j); pile.push(j); } }
  assertEqual(vus.size, sols.size, 'd\'un seul tenant');
  for (const t of sols) { const c = t % W, r = Math.floor(t / W); assert(c >= F.X && r >= F.Y && c < F.X + F.LARGEUR && r < F.Y + F.HAUTEUR, 'sur la ferme'); }
  // (l'abri tel quel : ses murs, sa porte, ses paillasses)
  assertEqual(s.abriDepart.paillasses.length, 1, 'une paillasse pour un seul');
});

/* ---------- le premier jour sans visite ---------- */

test('le premier jour sans visite : pas de visite ni de scène d\'arrivée, le plat attend dans l\'abri', () => {
  const s = departGarde();
  assertEqual(s.bienvenue.etat, 'faite', 'la visite n\'a pas lieu');
  assert(Number.isInteger(s.recit.dites.arrivee), 'la scène d\'arrivée est notée dite');
  const plat = DATA.BIENVENUE.PLATS['*'];
  assertEqual(boiteCounts(s), { [plat]: 1 }, 'le plat dans la boîte à nourriture');
  const boite = Object.entries(s.blocs).find(([, k]) => k === 'boite_nourriture');
  assert(boite && s.abriDepart.sols.includes(Number(boite[0])), 'la boîte est dans l\'abri');
  assert(boite[0] !== String(s.abriDepart.porte - farmTerrain(s).LARGEUR), 'pas sur le passage');
});

/* ---------- le didacticiel ---------- */

test('le didacticiel : les étapes passent d\'elles-mêmes, chacune se passe, le tout aussi ; la boussole vers le port', () => {
  const s = departGarde(), L = DATA.VILLAGE.DEPART.ETAPES;
  assertEqual(etapeIle(s).id, 'ramasser', 'la première étape');
  assertEqual(etapeIle(s).total, L.length);
  for (const e of L) assert(e.ligne.length <= 70 && !e.ligne.includes('\n'), `${e.id} : une ligne`);
  addItem(s, 'pierre', 3); addItem(s, 'bois', 3);
  majDidacticielIle(s);
  assertEqual(etapeIle(s).id, 'atelier', 'ramassé : l\'Atelier');
  // (passer : rien ne bloque)
  for (let k = 0; etapeIle(s).id !== 'port'; k++) { assert(passerEtapeIle(s).ok); assert(k < L.length, 'jusqu\'au port'); }
  assertEqual(butBoussole(s), { sorte: 'port', id: 'port' }, 'la boussole montre le port');
  assert(s.didacticielIle.passees.includes('houe'), 'les étapes passées sont notées');
  // (une étape déjà faite passe d'elle-même : la vente compte pour le chemin et la vente)
  s.campagne.compteurs.ventesPort = 5;
  majDidacticielIle(s);
  assertEqual(etapeIle(s).id, 'graines', 'au port et vendu : les graines');
  assert(passerDidacticielIle(s).ok);
  assertEqual(didacticielIleActif(s), false, 'fini');
  assertEqual(etapeIle(s), null);
  assertEqual(passerEtapeIle(s).ok, false, 'plus rien à passer');
});

/* ---------- le joueur automatique ---------- */

// Joue la partie nuit après nuit jusqu'à ce que le didacticiel soit fini (au plus `max` nuits). → la nuit, ou null.
function jusquauPremierVillageois(s, max = 40) {
  for (let n = 0; n < max; n++) {
    simulatePlay(s, 'applique', 1);
    majDidacticielIle(s);
    if (!didacticielIleActif(s)) return n + 1;
  }
  return null;
}

test('seul, joué par le joueur automatique : le didacticiel jusqu\'au premier villageois et à sa tâche', () => {
  const s = depart(11);
  assertEqual(mangeurs(s).length, 0, 'seul : personne d\'autre à nourrir');
  const n = jusquauPremierVillageois(s);
  assert(n !== null, `fini (étape ${etapeIle(s) && etapeIle(s).id})`);
  assertEqual(s.didacticielIle.passees, [], 'sans rien passer');
  const V = villageoisDe(s);
  assert(V.some((v) => v.maison !== null && v.tache), 'un villageois logé, à sa tâche');
  assertEqual(s.famille.membres.length, 1, 'toujours seul');
  assert(s.famille.membres[0].bonheur >= 0, 'le bonheur se lit');
});

test('à six, joué par le joueur automatique : le didacticiel jusqu\'au premier villageois', () => {
  const s = depart(12, {
    perso: 3, prenom: 'Léa', nom: 'Essai', compagnon: { perso: 7, prenom: 'Paul' },
    enfants: [{ prenom: 'Zoé' }, { prenom: 'Tom' }, { prenom: 'Lou' }, { prenom: 'Max' }], animaux: [{ espece: 'chien', nom: 'Rex' }],
  });
  assertEqual(s.famille.membres.length, 6);
  assertEqual(s.abriDepart.paillasses.length, 6, 'une paillasse chacun');
  const n = jusquauPremierVillageois(s);
  assert(n !== null, `fini (étape ${etapeIle(s) && etapeIle(s).id})`);
  assert(villageoisDe(s).some((v) => v.maison !== null && v.tache), 'un villageois logé, à sa tâche');
});

/* ---------- la sauvegarde, le réglage éteint ---------- */

test('la sauvegarde : v94 → v95, une partie d\'avant inchangée, ce qui est abîmé réparé', () => {
  const s = departGarde();
  const avant = copie(s);
  delete avant.noms; delete avant.didacticielIle; delete avant.dehors.ferme;
  const m = migrate({ v: 92, t: 0, s: { ...copie(avant), version: 92 } }, 95);
  assertEqual(m.version, 95, 'jusqu\'à la fiche I7b (I7g, ensuite, nomme l\'île d\'une partie du chantier)');
  assertEqual(['noms' in m, 'didacticielIle' in m, m.dehors.ferme], [false, false, undefined], 'rien d\'ajouté à une partie d\'avant');
  const abime = migrate({ v: 92, t: 0, s: { ...copie(s), version: 92, noms: { ile: 'x', autre: 'Le Village' }, didacticielIle: 'non' } }, 95);
  assert(abime.noms.ile !== 'x', 'un nom illisible s\'en va (noms.js, reparerNoms : l\'île renommée à la graine)');
  assertEqual(abime.didacticielIle.fini, true, 'un didacticiel illisible est fini');
  const bon = migrate({ v: 92, t: 0, s: { ...copie(s), version: 92 } }, 95);
  assertEqual([bon.noms, bon.didacticielIle, bon.dehors.ferme], [s.noms, s.didacticielIle, 'vierge'], 'gardé tel quel');
});

test('éteint : la partie neuve d\'avant (le chemin peint, la visite de bienvenue, ni nom ni didacticiel de l\'île)', () => {
  avecVillage(() => {
    const s = createNewGame('eteint', { nom: 'Martin' });
    commencerObjectifs(s);
    assertEqual(['noms' in s, 'didacticielIle' in s, 'dehors' in s], [false, false, false]);
    assertEqual(s.bienvenue.etat, 'attendue', 'la visite viendra');
    assertEqual(Object.values(solsPoses(s)).filter((k) => k === 'chemin').length, 0, 'pas de chemin posé');
    assertEqual(fermeVierge(s), false);
    let coins = 0;
    for (const k of farmTerrain(s).SOMMETS) if (k === 1) coins++;
    assert(coins > 100, 'le chemin peint');
  }, false);
});
