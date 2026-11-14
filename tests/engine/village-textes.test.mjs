/* ==========================================================================
   Tests du chantier « l'île à bâtir » : le contrôle des textes (fiche I7d, docs/ile.md « Le récit retiré de
   l'interface »). Comme tous les fichiers tests/engine/village-*.test.mjs, il tourne avec VILLAGE.ACTIF forcé à true.
   Aucun texte qu'atteint une partie de l'île ne contient un nom du récit (VILLAGE.SANS_RECIT.NOMS : Maurice,
   Philomène, Adèle, Odile, Achille, Frida, Basile, Théo, Garance, Lise, Fernand, Céron, Cadolon, Le Gué, Bois-Joli,
   Les Genêts, Les Mouettes, Brumeval) ni « calèche », « cocher », « hameau » (VILLAGE.SANS_RECIT.MOTS) :
   - les données compilées que lit l'île (les sections du chantier, ses objectifs tirés, l'écran des niveaux, les
     phrases et les propos de ses villageois) ;
   - l'aide de l'île (js/ui/aide-ile.js) et le livre de l'île (encyclopedie_ile.json, js/encyclopedie-ile.generated.js) ;
   - les noms proposés (l'île, le village, les commerces, les maisons) et les prénoms tirés (les villageois, leurs
     enfants, le joueur « seul ») : aucun prénom du récit ;
   - une partie de l'île de 30 nuits (le joueur automatique) : ses villageois, ses noms, sa chronique, son livre ;
   - la carte du monde de l'île (fiche I7e) : ses lieux, ce qu'elle bâtit, la boussole (trois graines, tout vu) ;
   - éteint, rien ne change : les prénoms, le livre, les niveaux d'avant.
   Lancer seul : node tests/run-tests.mjs village-textes
   ========================================================================== */

import {
  choisirBut, commencerObjectifs, composeFamily, createNewGame, DATA, elementsSol, etatBoussole, familleSeule, farmTerrain, finishSetup,
  levelUnlocks, lieuxDeLaCarte, listeDuBut, niveauPort, planDuMonde, simulatePlay, solDirect, SORTES_BUTS, toutVoir,
} from '../../js/engine/index.js';
import { elementDuNiveau, noteDuNiveau, prenomsDuJeu, texteDuRecit } from '../../js/engine/village.js';
import { listeTiree, semaineDe } from '../../js/engine/objectifs.js';
import { proposerNom } from '../../js/engine/noms.js';
import { tirerVillageois } from '../../js/engine/villageois.js';
import { categoriesDe, entreeEncyclopedie, majEncyclopedie, nombreEntrees, pagesConnues } from '../../js/engine/encyclopedie.js';
import { ENCYCLOPEDIE_ILE } from '../../js/encyclopedie-ile.generated.js';
import { ficheIle, mondeIle, reglesIle, sourceEquipementIle } from '../../js/ui/aide-ile.js';
import { chroniqueHtml, nomsHtml } from '../../js/ui/chronique-html.js';
import { assert, assertEqual, avecVillage, test } from './aide.mjs';

// Les chaînes de `o` (un objet de données : ses clés « // » sont des commentaires) qui citent le récit, avec leur chemin.
function fautes(o, chemin = '', out = []) {
  if (typeof o === 'string') { const n = texteDuRecit(o); if (n) out.push(`${chemin} [${n}] ${o.slice(0, 80)}`); return out; }
  if (Array.isArray(o)) { o.forEach((x, i) => fautes(x, `${chemin}[${i}]`, out)); return out; }
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (!k.startsWith('//')) fautes(v, `${chemin}.${k}`, out);
  return out;
}
const sansBalises = (html) => String(html).replace(/<[^>]*>/g, ' ');

function partieIle(graine = 7) {
  const s = createNewGame(graine);
  assert(composeFamily(s, familleSeule(s)).ok, 'la famille');
  assert(finishSetup(s).ok, 'installée');
  commencerObjectifs(s);
  return s;
}

test('le contrôle lui-même : les noms, les mots, et ce qui n\'en est pas', () => {
  for (const t of ['Odile', 'au Gué', 'Bois-Joli', 'Île aux Mouettes', 'la calèche', 'des hameaux', 'Le cocher', 'Théo.']) assert(texteDuRecit(t), t);
  for (const t of ['le gué de la rivière', 'les mouettes crient', 'Théodore', 'il utilise', 'décoche la case', 'Bois-Fleuri']) assertEqual(texteDuRecit(t), null, t);
  assertEqual(DATA.VILLAGE.SANS_RECIT.NOMS.length, 18, 'les 18 noms de la fiche');
});

test('les données compilées que lit l\'île : les sections du chantier, ses objectifs, ses niveaux, ses villageois', () => {
  // (les sections du chantier, sauf la liste des noms elle-même et les noms proposés, filtrés à la proposition)
  const V = { ...DATA.VILLAGE, SANS_RECIT: null, NOMS: { ...DATA.VILLAGE.NOMS, ILE: [], COMPLEMENTS: [] } };
  const L = [
    ...fautes(V, 'VILLAGE'), ...fautes(DATA.PORT, 'PORT'), ...fautes(DATA.TACHES, 'TACHES'), ...fautes(DATA.TRAITS, 'TRAITS'),
    ...fautes(DATA.VOCATIONS, 'VOCATIONS'), ...fautes(DATA.PRODUCTION, 'PRODUCTION'), ...fautes(DATA.AMITIE.ECHELLE, 'AMITIE.ECHELLE'),
  ];
  // (les objectifs de l'île : sa semaine, ses objectifs tirés — ceux d'avant qu'elle garde compris)
  const s = partieIle();
  L.push(...fautes(semaineDe(s), 'semaine'), ...fautes(listeTiree(s), 'tirés'));
  // (l'écran de chaque niveau : ses éléments et sa note, tels que l'île les montre)
  for (let n = 1; n <= DATA.NIVEAUX.liste.length; n++) {
    const u = levelUnlocks(n);
    L.push(...fautes(u.elements.map((id) => elementDuNiveau(s, id)).filter(Boolean), `niveau ${n}`), ...fautes(noteDuNiveau(s, n, u.note) || '', `note ${n}`));
  }
  // (ce que disent les villageois : leurs phrases de tous les jours, leurs saluts, et les propos qu'ils gardent)
  const H = DATA.HABITANTS, G = DATA.VILLAGE.PROPOS.GARDES || [];
  L.push(...fautes(H.PHRASES.salut, 'HABITANTS.PHRASES.salut'));
  for (const id of G) if (!DATA.VILLAGE.PROPOS[id]) L.push(...fautes(H.PROPOS[id], `HABITANTS.PROPOS.${id}`));
  assertEqual(L, [], 'un texte de l\'île cite le récit');
  // (le niveau 10 : la veillée des voisins des hameaux n'est plus montrée ; sa note dit la veillée du village)
  assertEqual(elementDuNiveau(s, 'veillee'), null, 'pas de veillée des hameaux');
  assert(/veillée/.test(noteDuNiveau(s, 10, levelUnlocks(10).note)), 'la note du niveau 10');
  assertEqual(noteDuNiveau(s, 9, levelUnlocks(9).note), null, 'pas de carte postale au niveau 9');
  assertEqual(elementDuNiveau(s, 'marche'), DATA.PORT.ELEMENT, 'le port à la place de la calèche');
});

test('l\'aide de l\'île : sa fiche, le grand monde, les règles ; aucune trace du récit', () => {
  const s = partieIle();
  const f = ficheIle(s);
  const titres = f.lignes.map(([t]) => t);
  for (const t of ['Le port', 'Le bac', 'Les commandes du bac', 'L\'import', 'Le chemin et le portage', 'Les villageois', 'Les tâches', 'Le tableau', 'L\'amitié', 'Les liens', 'Les traits', 'La part', 'L\'étal', 'Les vocations', 'Les fêtes', 'Les projets', 'La chronique et les noms', 'Les commerces']) {
    assert(titres.includes(t), `la fiche dit « ${t} »`);
  }
  assertEqual(fautes(f, 'ficheIle'), [], 'la fiche de l\'île');
  assertEqual(fautes(reglesIle(s), 'reglesIle'), [], 'les règles');
  assertEqual(fautes(sourceEquipementIle, 'equipement'), []);
  // (le grand monde : les lignes d'avant qui parlent des hameaux sortent, celles qui citent la calèche sont réécrites)
  const avant = [['Le pays', 'Des prés.'], ['Chemins et gués', 'de hameau en hameau : la calèche les suit.'], ['La carte du monde', 'les hameaux, la calèche'], ['Les hameaux', '…'], ['Les habitants', '…'], ['L\'amitié', '…'], ['La visite de bienvenue', '…'], ['Inviter à un repas', 'Achille'], ['La calèche', '…'], ['L\'Atelier', 'par la calèche'], ['Les styles d\'aménagement', 'Aucun n\'est plus beau. Chaque habitant a son style préféré.'], ['Les projets des hameaux', '…'], ['Les plans de collection', `${DATA.PLANS ? 'Leur recette' : ''} : la première fois que tu passes dans un pays, un ami d'un hameau. Le carnet de plans, sous l'Atelier.`], ['Pêche', 'Des poissons.']];
  const m = mondeIle(avant);
  assertEqual(m.map(([t]) => t), ['Le pays', 'Chemins et gués', 'La carte du monde', 'L\'Atelier', 'Les styles d\'aménagement', 'Les plans de collection', 'Pêche'], 'les lignes gardées');
  assertEqual(fautes(m, 'monde'), [], 'le grand monde de l\'île');
});

test('le livre de l\'île : sans le récit ni les hameaux ; les entrées neuves ; chaque lien vers une entrée du livre', () => {
  const ile = categoriesDe(partieIle());
  assert(ile === ENCYCLOPEDIE_ILE.categories, 'l\'île lit son livre');
  const ids = new Set(ile.flatMap((c) => c.entrees.map((e) => e.id)));
  for (const c of ['ile', 'hameaux', 'secrets', 'commerce']) assert(!ile.some((x) => x.id === c), `la catégorie ${c} sort`);
  for (const id of ['maurice', 'odile', 'le_gue', 'comptoir', 'courrier', 'carnet', 'veillee_lune', 'hameaux', 'habitants']) assert(!ids.has(id), `${id} sort`);
  for (const id of ['port', 'bac', 'commandes_bac', 'import', 'niveaux_port', 'chemin_port', 'portage', 'village', 'maison_libre', 'villageois', 'taches', 'tableau_villageois', 'part', 'etal', 'amitie_villageois', 'liens_villageois', 'traits', 'commerces', 'vocations', 'fetes_village', 'projets_village', 'chronique', 'noms']) {
    assert(ids.has(id), `l'entrée neuve ${id}`);
  }
  for (const id of ['tente', 'lanterne_tempete', 'b_foret', 'faune_renard', 'pain']) assert(ids.has(id), `${id} reste`);
  const L = [];
  for (const c of ile) for (const e of c.entrees) {
    L.push(...fautes([c.nom, e.terme, e.description], `${c.id}/${e.id}`));
    for (const l of e.liens) assert(ids.has(l), `${e.id} → ${l}`);
  }
  assertEqual(L, [], 'une entrée du livre de l\'île cite le récit');
  // (les collections du naturaliste lisent des pages qui restent)
  for (const c of Object.values(DATA.NATURALISTE.COLLECTIONS)) for (const p of c.pages) assert(ids.has(p), `la page ${p}`);
});

test('les noms proposés et les prénoms tirés : aucun nom du récit', () => {
  const s = partieIle(11);
  const L = [];
  for (let rang = 0; rang < 200; rang++) {
    for (const [quoi, id, o] of [['ile', null, {}], ['village', null, {}], ['commerce', 'c1', { sorte: 'forge' }], ['commerce', 'c2', { sorte: 'mercerie' }], ['maison', 'm1', {}]]) {
      const n = proposerNom(s, quoi, id, rang, o);
      if (texteDuRecit(n)) L.push(`${quoi} ${rang} : ${n}`);
    }
  }
  assertEqual(L, [], 'un nom proposé cite le récit');
  const recit = new Set(DATA.VILLAGE.SANS_RECIT.NOMS);
  for (const g of ['f', 'm']) {
    assert(DATA.HABITANTS.PRENOMS[g].some((p) => recit.has(p)), `des prénoms du récit dans HABITANTS.PRENOMS.${g}`);
    assertEqual(prenomsDuJeu(s, g).filter((p) => recit.has(p)), [], `ni Odile ni Achille parmi les prénoms de l'île (${g})`);
  }
  // (les villageois tirés de 60 graines, et le joueur « seul »)
  const tires = [];
  for (let graine = 1; graine <= 60; graine++) {
    const t = partieIle(graine);
    tires.push(t.famille.membres[0].prenom);
    for (let rang = 1; rang <= 8; rang++) tires.push(tirerVillageois(t, rang).prenom);
  }
  assertEqual(tires.filter((p) => recit.has(p)), [], 'un prénom du récit tiré pour l\'île');
});

test('une partie de l\'île de 30 nuits : ni ses villageois, ni ses noms, ni sa chronique, ni son livre ne citent le récit', () => {
  const s = partieIle(1);
  const rows = simulatePlay(s, 'applique', 30);
  assertEqual(rows.length, 30, '30 nuits');
  const V = s.villageois || [];
  assert(V.length >= 1, `des villageois (${V.length})`);
  const L = [
    ...fautes(V.map((v) => v.prenom), 'villageois'), ...fautes(s.famille.membres.map((m) => m.prenom), 'famille'),
    ...fautes(s.noms, 'noms'), ...fautes(sansBalises(chroniqueHtml(s)), 'chronique'), ...fautes(sansBalises(nomsHtml(s)), 'noms (page)'),
  ];
  majEncyclopedie(s);
  const pages = pagesConnues(s);
  assert(pages.length > 30 && pages.includes('port') && pages.includes('villageois'), `les pages découvertes (${pages.length})`);
  for (const id of pages) { const e = entreeEncyclopedie(id, s); L.push(...fautes([e.terme, e.description], id)); }
  assertEqual(L, [], 'la partie de l\'île cite le récit');
  assertEqual(nombreEntrees(s), ENCYCLOPEDIE_ILE.categories.reduce((t, c) => t + c.entrees.length, 0), 'le livre de l\'île');
});

test('la carte du monde de l\'île (fiche I7e) : ni hameau ni nom du récit, ni dans ses lieux, ni dans ce qu\'elle bâtit, ni sur la boussole', () => {
  for (const g of [3, 11, 29]) {
    const s = partieIle(g);
    toutVoir(s);
    const T = farmTerrain(s), sol = solDirect(T), lieux = planDuMonde(s.carte.graine, niveauPort(s)).lieux;
    elementsSol(sol.ctx);
    // (le plan de l'île : aucun hameau ; ses noms, ceux de ses lieux)
    assertEqual(lieux.hameaux, [], `${g} : aucun hameau dans le plan`);
    const L = lieuxDeLaCarte(s, lieux, T);
    assertEqual(L.hameaux, [], `${g} : aucun hameau sur la carte, tout vu`);
    assertEqual(fautes(L, 'carte'), [], `${g} : les lieux de la carte`);
    // (ce que le monde bâtit et nomme : le port, les bâtisses muettes du récit)
    assertEqual(fautes(sol.ctx.hameaux.plans.map((p) => ({ id: p.id, nom: p.nom })), 'plans'), [], `${g} : les plans bâtis`);
    // (la boussole, vers chaque lieu de la carte, et vers la ferme)
    const W = T.LARGEUR, F = T.FERME;
    for (const sorte of SORTES_BUTS) {
      for (const l of listeDuBut(L, sorte)) {
        assert(choisirBut(s, { sorte, id: l.id }, lieux).ok, `${g} : la boussole vers ${l.id}`);
        const b = etatBoussole(s, F.X - 20, F.Y - 20, lieux, null, T);
        assertEqual(texteDuRecit(b.nom), null, `${g} : la boussole (${b.nom})`);
      }
    }
    choisirBut(s, null);
    const b = etatBoussole(s, F.X - 20, F.Y - 20, lieux, T.MONDE.cadre.SORTIE, T);
    assertEqual([b.sorte, texteDuRecit(b.nom)], ['ferme', null], `${g} : la boussole vers la ferme`);
    assert(Math.abs(b.x - ((T.MONDE.cadre.SORTIE % W) + 0.5)) < 1e-9, 'au bout du chemin');
  }
});

test('éteint, rien ne change : les prénoms, le livre et les niveaux d\'avant', () => {
  avecVillage(() => {
    const s = createNewGame(3);
    for (const g of ['f', 'm']) assert(prenomsDuJeu(s, g) === DATA.HABITANTS.PRENOMS[g], `la liste de toujours (${g})`);
    assert(categoriesDe(s) !== ENCYCLOPEDIE_ILE.categories && categoriesDe(s).some((c) => c.id === 'ile'), 'le livre d\'avant');
    assert(entreeEncyclopedie('maurice', s) && !entreeEncyclopedie('villageois', s), 'ses pages');
    assertEqual(elementDuNiveau(s, 'veillee'), DATA.NIVEAUX.ELEMENTS.veillee, 'la veillée du niveau 10');
    assertEqual(noteDuNiveau(s, 9, levelUnlocks(9).note), levelUnlocks(9).note, 'la note du niveau 9');
  }, false);
});
