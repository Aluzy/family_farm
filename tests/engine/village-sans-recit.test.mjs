/* ==========================================================================
   Tests du chantier « l'île à bâtir » : le récit retiré du moteur (docs/ile.md, fiche I7c ; l'aiguillage :
   js/engine/recit-aiguillage.js, ses deux implémentations : recit-ancien.js et recit-muet.js). Comme tous les
   fichiers tests/engine/village-*.test.mjs, il tourne avec VILLAGE.ACTIF forcé à true.
   - la lecture des imports : aucun module du moteur n'importe le récit (recit.js, fil-lune.js, usure.js,
     secrets.js, ile.js, bienvenue.js), sauf ces modules entre eux et recit-ancien.js (que seul l'aiguillage importe) ;
     l'index ne les ré-exporte plus (fiche I7d) ; depuis village.js, et depuis tout autre module, on n'atteint pas le
     récit sans passer par l'aiguillage ; aucun fichier de la page (js/ui, js/carte, js/*.js) n'importe un module du
     récit : elle passe par l'aiguillage (recitPage pour ce que la page d'avant lit encore, null sur l'île) ;
   - le moteur allumé, le récit vidé (DATA.RECIT, et les secrets, les ateliers, le courrier) : 30 nuits du joueur
     automatique, les hameaux du récit peuplés, sans erreur ; ni personnage écrit, ni fait, ni relation, ni
     confiance, ni courrier, ni carnet ; aucune scène, aucun lieu ni secret qui parle, aucun atelier ;
   - éteint, l'aiguillage rend le récit d'avant.
   Lancer seul : node tests/run-tests.mjs village-sans-recit
   ========================================================================== */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  commencerObjectifs, composeFamily, createNewGame, DATA, elementsSol, familleSeule, finishSetup, genererMonde, moonPhase,
  simulatePlay, solDirect,
} from '../../js/engine/index.js';
import { habitantsDe, peuplerHameau } from '../../js/engine/habitants.js';
import { amitieNuit, palierAmitieNom, pointsAmitie } from '../../js/engine/amitie.js';
import { relationsInvitables } from '../../js/engine/invitations.js';
import { heuresPousse } from '../../js/engine/crops.js';
import {
  ateliersDuHameau, fermeLuit, geodeLuit, jouerScene, noterVisite, ouvrirSecret, paroleHameau, recitPage, recitPour,
  scenesPossibles, toucherLieu, visiteObservatoire,
} from '../../js/engine/recit-aiguillage.js';
import { RECIT_ANCIEN } from '../../js/engine/recit-ancien.js';
import { RECIT_MUET } from '../../js/engine/recit-muet.js';
import { assert, assertEqual, avecVillage, test } from './aide.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const JS = join(ICI, '..', '..', 'js');
const MOTEUR = join(JS, 'engine');

/* ---------- la lecture des imports ---------- */

const RETIRES = ['recit.js', 'fil-lune.js', 'usure.js', 'secrets.js', 'ile.js', 'bienvenue.js'];
const ANCIEN = 'recit-ancien.js', AIGUILLAGE = 'recit-aiguillage.js', INDEX = 'index.js';

// Les modules qu'importe (ou ré-exporte) le fichier `f` du dossier `dossier`, nommés comme dans ce dossier
// (« recit.js » ; ceux d'un autre dossier : « ../engine/recit.js »). Les commentaires sont ôtés d'abord.
function importsDe(dossier, f) {
  const src = readFileSync(join(dossier, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
  const out = new Set();
  for (const re of [/\b(?:import|export)\s[^;'"]*?\bfrom\s*['"]([^'"]+)['"]/g, /\bimport\s*['"]([^'"]+)['"]/g, /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g]) {
    for (const m of src.matchAll(re)) out.add(m[1].replace(/^\.\//, ''));
  }
  return [...out];
}

const fichiersMoteur = () => readdirSync(MOTEUR).filter((f) => f.endsWith('.js'));
const graphe = () => new Map(fichiersMoteur().map((f) => [f, importsDe(MOTEUR, f)]));

test('lecture des imports : seuls le récit lui-même et recit-ancien.js importent le récit ; l\'index ne le ré-exporte pas', () => {
  const G = graphe(), fautifs = [];
  // (fiche I7d : l'index ne ré-exporte plus le récit)
  assertEqual(G.get(INDEX).filter((i) => RETIRES.includes(i)), [], 'l\'index ré-exporte le récit');
  for (const [f, imp] of G) {
    if (RETIRES.includes(f) || f === ANCIEN) continue;
    for (const i of imp) if (RETIRES.includes(i)) fautifs.push(`${f} → ${i}`);
  }
  assertEqual(fautifs, [], 'un module du moteur importe le récit sans passer par l\'aiguillage');
  // (recit-ancien.js : seul l'aiguillage l'importe ; recit-muet.js n'importe rien du récit)
  const ancien = [...G].filter(([f, imp]) => imp.includes(ANCIEN) && f !== INDEX).map(([f]) => f);
  assertEqual(ancien, [AIGUILLAGE], 'seul l\'aiguillage importe le récit d\'avant');
  assert(!G.get('recit-muet.js').some((i) => RETIRES.includes(i) || i === ANCIEN), 'le récit muet n\'importe pas le récit');
  // (l'index ne ré-exporte ni l'aiguillage ni ses deux implémentations : leurs noms sont ceux du récit)
  assert(!G.get(INDEX).some((i) => [ANCIEN, AIGUILLAGE, 'recit-muet.js'].includes(i)), 'l\'index ne ré-exporte pas l\'aiguillage');
});

test('lecture des imports : depuis village.js (et tout autre module), le récit ne s\'atteint que par l\'aiguillage', () => {
  const G = graphe();
  // (le parcours ne passe ni par l'index, ni de l'aiguillage au récit d'avant : le seul fil, choisi par recitPour)
  const atteints = (depart) => {
    const vus = new Set([depart]), file = [depart];
    while (file.length) {
      const f = file.shift();
      for (const i of G.get(f) || []) {
        if (i === INDEX || (f === AIGUILLAGE && i === ANCIEN) || vus.has(i) || !G.has(i)) continue;
        vus.add(i); file.push(i);
      }
    }
    return vus;
  };
  const depuisVillage = atteints('village.js');
  for (const m of ['night.js', 'state.js', 'paliers.js', 'villageois.js', 'bac.js', 'fetes-village.js', 'chronique.js', AIGUILLAGE, 'recit-muet.js']) {
    assert(depuisVillage.has(m), `${m} est atteint depuis village.js`);
  }
  assertEqual(RETIRES.filter((r) => depuisVillage.has(r)), [], 'le récit est atteint depuis village.js');
  assert(!depuisVillage.has(ANCIEN), 'le récit d\'avant n\'est atteint que par l\'aiguillage');
  for (const f of G.keys()) {
    if (RETIRES.includes(f) || f === ANCIEN) continue;
    const r = RETIRES.filter((x) => atteints(f).has(x));
    assertEqual(r, [], `depuis ${f}`);
  }
});

test('lecture des imports : aucun fichier de la page n\'importe le récit (fiche I7d : par l\'aiguillage)', () => {
  // (la page : js/ui, js/carte et ses sous-dossiers, les fichiers de js/ ; tout import, nommé, global ou dynamique, d'un
  // module du récit ; les modules du moteur et les fichiers générés n'en sont pas)
  const fautifs = [], vus = [];
  const parcourir = (dossier) => {
    for (const e of readdirSync(join(JS, dossier), { withFileTypes: true })) {
      const rel = dossier === '.' ? e.name : `${dossier}/${e.name}`;
      if (e.isDirectory()) { if (dossier !== '.' || ['ui', 'carte'].includes(e.name)) parcourir(rel); continue; }
      if (!e.name.endsWith('.js') || e.name.endsWith('.generated.js')) continue;
      vus.push(rel);
      for (const i of importsDe(JS, rel)) if (RETIRES.includes(i.split('/').pop()) && /(^|\/)engine\//.test(i)) fautifs.push(`${rel} → ${i}`);
    }
  };
  parcourir('.');
  assert(vus.length > 150 && vus.includes('ui/loop.js') && vus.includes('ui/caleche.js') && vus.includes('carte/ferme/habitants.js'), `les fichiers de la page (${vus.length})`);
  assertEqual(fautifs, [], 'la page importe le récit sans l\'aiguillage');
});

test('allumé, la page n\'a rien du récit à lire (recitPage) ; éteint, ce que la page d\'avant lisait', () => {
  const s = createNewGame(4);
  assertEqual(recitPage(s), null, 'l\'île : rien');
  const t = avecVillage(() => createNewGame(4), false);
  avecVillage(() => {
    const R = recitPage(t);
    assert(R && R.RECIT === DATA.RECIT && R.ILE === DATA.ILE, 'le récit d\'avant');
    for (const k of ['carnet', 'acteEnCours', 'aFait', 'tousLesToitsUses', 'toitsUses', 'reparerToit', 'bienvenueDe', 'bienvenueDonne', 'bienvenueDue', 'bienvenueEnRoute', 'bienvenueModele', 'bienvenuePose', 'bienvenuePrepare', 'parler', 'promesses', 'livrerPromesse', 'ateliersConnus', 'commander', 'commandesDe', 'retirerToutes', 'ouvrirEnveloppe', 'poserPierre', 'veilleeFerme', 'veilleeFermePossible']) {
      assert(typeof R[k] === 'function', `la page d'avant lit ${k}`);
    }
    assertEqual(R.carnet(t), [], 'un carnet vide au départ');
  }, false);
});

/* ---------- le moteur allumé, sans récit ---------- */

// Le récit vidé, le temps de `fn` : DATA.RECIT, les secrets, les ateliers des hameaux, le courrier (les objets
// restent : leurs clés sont ôtées, puis remises).
function sansRecit(fn) {
  const cles = ['RECIT', 'SECRETS', 'ILE', 'COURRIER'];
  const gardes = cles.map((k) => [k, { ...DATA[k] }]);
  for (const k of cles) for (const c of Object.keys(DATA[k])) delete DATA[k][c];
  try {
    return fn();
  } finally {
    for (const [k, g] of gardes) Object.assign(DATA[k], g);
  }
}

// Une partie neuve de l'île (seul), commencée comme à l'accueil, et ses hameaux du récit peuplés (les garantis,
// et un autre).
function partie(graine = 4) {
  const s = createNewGame(graine);
  assert(composeFamily(s, familleSeule(s)).ok, 'la famille');
  assert(finishSetup(s).ok, 'installée');
  commencerObjectifs(s);
  const sol = solDirect(genererMonde(s.carte.graine).terrain);
  elementsSol(sol.ctx);
  const plans = sol.ctx.hameaux.plans.filter((p) => !p.batisse);
  const peuples = [...plans.filter((p) => p.garanti), plans.find((p) => !p.garanti)].filter(Boolean);
  for (const p of peuples) assert(peuplerHameau(s, p), `${p.nom} est peuplé`);
  return { s, peuples, lieux: sol.ctx.lieux || null };
}

const RECIT_VIDE = { faits: {}, relations: {}, confiance: {}, dites: {}, carnet: [], promesses: {} };

test('allumé, le récit vidé : 30 nuits du joueur automatique, les hameaux du récit peuplés, sans rien du récit', () => {
  sansRecit(() => {
    const { s, peuples } = partie();
    assert(recitPour(s) === RECIT_MUET, 'l\'île prend le récit muet');
    assertEqual(s.bienvenue.etat, 'faite', 'pas de visite de bienvenue');
    // (ni personnage écrit dans les hameaux garantis : Odile, Basile, Garance… n'y sont pas installés)
    const membres = peuples.flatMap((p) => habitantsDe(s)[p.id].foyers.flatMap((f) => f.membres));
    assert(membres.length > 0, 'des habitants');
    assertEqual(membres.filter((m) => m.recit), [], 'aucun personnage écrit');
    // (on parle à un habitant : sa phrase de tous les jours, l'amitié monte comme pour les autres)
    const adulte = membres.find((m) => !m.enfant);
    const p = peuples.find((x) => habitantsDe(s)[x.id].foyers.some((f) => f.membres.includes(adulte)));
    const b = paroleHameau(s, p.id, adulte.id, { heure: 10, n: 0 });
    assert(b && typeof b.texte === 'string' && b.texte.length > 0 && !b.recit, 'une phrase, pas une réplique du récit');
    for (const x of peuples) for (const g of [x.garanti, x.id]) for (const lieu of ['ferme', 'monde', g]) {
      assertEqual(scenesPossibles(s, { lieu, hameau: x.id }), [], `aucune scène (${lieu})`);
    }
    assertEqual(jouerScene(s, 'arrivee', { lieu: 'ferme' }).ok, false, 'une scène ne se joue pas');
    for (const sorte of ['cabane', 'atelier', 'epave', 'cale', 'geode']) assertEqual(toucherLieu(s, sorte, { lieu: 'monde' }), null, `le lieu ${sorte} est muet`);
    assertEqual([visiteObservatoire(s), ouvrirSecret(s, { id: 'cairn_0', sorte: 'cairn', case: 0 }), noterVisite(s, 'gue')], [null, null, false]);
    for (const x of peuples) assertEqual(ateliersDuHameau(s, x.id), [], 'aucun atelier de personnage');

    // 30 nuits (une pleine lune au moins : la veillée du récit ne se joue pas, celle du village est à fetes-village.js)
    let pleine = false;
    const rows = simulatePlay(s, 'applique', 30);
    assertEqual(rows.length, 30, '30 nuits');
    for (let j = 1; j <= s.day; j++) if (moonPhase(j).id === 'pleine') pleine = true;
    assert(pleine, 'une pleine lune passée');
    amitieNuit(s);
    for (const lieu of ['ferme', 'gue', 'place']) assertEqual(scenesPossibles(s, { lieu }), [], 'pas de veillée du récit');
    assertEqual(s.recit, RECIT_VIDE, 'rien n\'est écrit au récit : ni fait, ni relation, ni confiance, ni carnet');
    assertEqual(s.courrier, [], 'aucun courrier');
    assertEqual([geodeLuit(s), fermeLuit(s)], [false, false], 'ni la pierre ni l\'amas ne luisent');
    assertEqual(heuresPousse(s), DATA.TEMPS.POUSSE_HEURES, 'la pousse de toujours (pas de pierre de lune)');
    assert(s.day >= 31 && s.palier >= 3, `la partie avance (jour ${s.day}, palier ${s.palier})`);
    // (l'amitié a son échelle à elle : data/amitie.json ECHELLE)
    assert(DATA.AMITIE.ECHELLE.NOMS.includes(palierAmitieNom(s, adulte.id)) && pointsAmitie(s, adulte.id) <= DATA.AMITIE.ECHELLE.MAX, 'le palier d\'amitié d\'un habitant');
    assert(relationsInvitables(s).every((r) => DATA.AMITIE.ECHELLE.NOMS.includes(r.nomPalier)), 'les noms des paliers d\'amitié');
  });
});

test('éteint, l\'aiguillage rend le récit d\'avant ; les deux récits ont la même interface', () => {
  const s = avecVillage(() => createNewGame(4), false);
  avecVillage(() => assert(recitPour(s) === RECIT_ANCIEN, 'le jeu d\'avant'), false);
  assertEqual(s.bienvenue.etat, 'attendue', 'la visite viendra');
  assert(recitPour(s) === RECIT_MUET, 'allumé, le muet');
  assertEqual(Object.keys(RECIT_MUET).filter((k) => k !== 'nom').sort(),
    Object.keys(RECIT_ANCIEN).filter((k) => !['nom', 'jourBienvenue', 'remboursementCommerce', 'objetEnveloppe'].includes(k)).sort(),
    'la même interface (sauf les migrations, qui ne lisent que le récit d\'avant)');
  assertEqual([DATA.AMITIE.ECHELLE.MAX, DATA.AMITIE.ECHELLE.PALIERS, DATA.AMITIE.ECHELLE.NOMS], [DATA.RECIT.RELATION_MAX, DATA.RECIT.PALIERS, DATA.RECIT.PALIER_NOMS], 'l\'échelle de l\'amitié est celle du récit');
});
