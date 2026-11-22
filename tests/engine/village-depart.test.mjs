/* ==========================================================================
   Tests du chantier « l'île à bâtir » : le nouveau départ (docs/ile.md, fiche I7b ; js/engine/depart-ile.js,
   js/engine/didacticiel-ile.js).
   - l'écran de départ : « Seul » (un adulte tiré de la graine, sans compagnon), le nom de l'île proposé et borné ;
   - la terre vierge : pas de chemin intérieur (ni coins, ni tuiles de chemin dans le sol de la ferme) ; le seul
     chemin part de la porte de l'abri et va, d'un seul tenant, à la sortie de la ferme ; l'abri tel quel ;
   - le premier jour sans visite : la visite de bienvenue et la scène d'arrivée n'ont pas lieu, ni abri ni rien de bâti
     sur l'île (docs/ile-300.md C18), ni plat ni conserves ;
   - le didacticiel : ses étapes passent d'elles-mêmes ; chacune se passe, le tout aussi ;
   - une partie seule et une partie à six, jouées par le joueur automatique : elles passent le didacticiel jusqu'au
     premier villageois et à sa tâche ;
   - la sauvegarde : v94 → v95.
   Lancer seul : node tests/run-tests.mjs village-depart
   ========================================================================== */

import {
  addItem, boiteCounts, butBoussole, commencerObjectifs, composeFamily, createNewGame, DATA, didacticielIleActif,
  etapeIle, familleSeule, farmMap, farmTerrain, fermeVierge, finishSetup, majDidacticielIle, mangeurs, migrate,
  nomIle, nomIlePropose, nommerIle, passerDidacticielIle, passerEtapeIle, simulatePlay, solsPoses, villageoisDe,
} from '../../js/engine/index.js';
import { countItem } from '../../js/engine/inventory.js';
import { blocGid } from '../../js/engine/planche.js';
import { assert, assertEqual, test } from './aide.mjs';

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

/* ---------- le premier jour sans visite ---------- */

test('le premier jour sans visite : pas de visite ni de scène d\'arrivée ; ni abri ni rien de bâti (C18), rien à manger d\'avance', () => {
  const s = departGarde();
  assertEqual(s.bienvenue.etat, 'faite', 'la visite n\'a pas lieu');
  // (fiche I7c : la scène d'arrivée n'a plus à être notée dite ; le récit est retiré à la bascule, I9h)
  assertEqual(s.recit.dites, {}, 'rien n\'est noté au récit');
  const plat = DATA.VILLAGE.DEPART.PLAT;
  assertEqual(s.abriDepart || null, null, 'pas d\'abri de départ (docs/ile-300.md C18)');
  assertEqual(Object.keys(s.blocs || {}).length, 0, 'rien de bâti');
  assertEqual(countItem(s, plat), 0, 'pas de plat : tout se trouve dans la nature');
  assertEqual(countItem(s, 'conserve'), 0, 'pas de conserves');
  assertEqual(countItem(s, 'tente'), 1, 'la tente, à poser');
});

/* ---------- le didacticiel ---------- */

test('le didacticiel : les étapes passent d\'elles-mêmes, chacune se passe, le tout aussi', () => {
  const s = departGarde(), L = DATA.VILLAGE.DEPART.ETAPES;
  assertEqual(etapeIle(s).id, 'ramasser', 'la première étape');
  assertEqual(etapeIle(s).total, L.length);
  for (const e of L) assert(e.ligne.length <= 70 && !e.ligne.includes('\n'), `${e.id} : une ligne`);
  addItem(s, 'pierre', 3); addItem(s, 'bois', 3);
  majDidacticielIle(s);
  assertEqual(etapeIle(s).id, 'atelier', 'ramassé : l\'Atelier');
  // (passer : rien ne bloque ; l'île de 300 × 300 : la place, la maison, le villageois, puis le comptoir du port)
  for (let k = 0; etapeIle(s).id !== 'comptoir'; k++) { assert(passerEtapeIle(s).ok); assert(k < L.length, 'jusqu\'au comptoir'); }
  assert(s.didacticielIle.passees.includes('houe'), 'les étapes passées sont notées');
  // (une étape déjà faite passe d'elle-même : une vente au port compte pour le chargement et la vente)
  s.blocs = { ...(s.blocs || {}), 1234: DATA.ILE.VILLAGE.PORT };
  s.campagne.compteurs.ventesPort = 5;
  majDidacticielIle(s);
  assertEqual(didacticielIleActif(s), false, 'le comptoir posé, vendu : fini');
  s.didacticielIle.fini = false; s.didacticielIle.etape = L.length - 1;
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
  const n = jusquauPremierVillageois(s);
  assert(n !== null, `fini (étape ${etapeIle(s) && etapeIle(s).id})`);
  assert(villageoisDe(s).some((v) => v.maison !== null && v.tache), 'un villageois logé, à sa tâche');
});

/* ---------- la sauvegarde ---------- */

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
