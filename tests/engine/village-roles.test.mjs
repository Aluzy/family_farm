/* ==========================================================================
   Tests du moteur : les rôles en ligne (fiche I9e ; docs/monde-partage.md § 10 et § 13, docs/ile.md, « Les rôles en
   ligne »). Le monde en ligne est l'île d'un propriétaire ; ses amis invités viennent l'aider à faire progresser son
   village. Dans la partie d'un monde de l'île (l'horloge commune, I9a2) :
   - la grille complète (js/engine/roles.js, GRILLE_ILE) : chaque commande et son rôle minimal, un tableau de cas ; le
     visiteur, l'ami jardinier, le bâtisseur, le propriétaire ;
   - la délégation : un réglage du monde (taches) confie l'attribution des tâches aux bâtisseurs ;
   - la maison d'un villageois (sa boîte aux lettres, sa porte, son lit, ses murs) ne se retire que par le propriétaire ;
   - les gestes de gestion du village sont des commandes (villageois.attribuer, villageois.outil, villageois.vendre,
     villageois.foyer, villageois.enfant, nom.donner) : jouées avec leur acteur, elles font ce que fait le moteur en solo ;
   - la suggestion d'un invité (commerce.suggerer) : il faut l'envie du villageois et l'amitié de l'invité ; rien ne
     change dans la partie ;
   - la chronique du monde : une ligne épinglée ou annotée porte le compte de qui l'a fait (par) ; un villageois ne se
     renvoie pas (aucune commande) ;
   - la sauvegarde passe au format 108.
   Lancer seul : node tests/run-tests.mjs village-roles.
   ========================================================================== */

import {
  arriverVillageois, attribuer, chroniqueDe, COMMANDES, DATA, empreintePartie, executerCommande, farmSeed, farmTerrain,
  GRILLE_ILE, horlogeDe, ilePartagee, migrate, nomDe, noterChronique, portDuMonde, refusDuRole, reglagesMonde, reparerChronique,
  roleDemande, ROLES_MONDE, STATE_VERSION, testMaisonVillageois, trouverVillageois, villageoisDe,
} from '../../js/engine/index.js';
import { assert, assertEqual, boite, partie, test } from './aide.mjs';

const cloner = (v) => JSON.parse(JSON.stringify(v));
const A = 'c-alex', B = 'c-sam';
const RANG = Object.fromEntries(ROLES_MONDE.map((r, i) => [r, i]));

// La partie d'un monde de l'île (comme dans village-en-ligne.test.mjs) : `n` maisons et leurs villageois.
function ile(n = 2, seed = 1) {
  const s = partie(seed);
  portDuMonde(farmSeed(s));
  boite(s, { pain: 200 });
  const maisons = [];
  for (let k = 0; k < n; k++) { const m = testMaisonVillageois(s); assert(m.ok, `la maison ${k + 1}`); maisons.push(m); }
  for (let k = 0; k < n; k++) assert(arriverVillageois(s, { direct: true }).ok, `le villageois ${k + 1}`);
  s.outils = { hache: true, pioche: true, faux: true, canne: true, choisi: 'hache' };
  s.mondePartage = true;
  horlogeDe(s);
  s.amities = {};
  s.energies = {};
  s.awakeMs = 0;
  return { s, maisons };
}
const jouer = (s, type, args, acteur = A) => executerCommande(s, { id: `c-${type}-${Math.random().toString(36).slice(2, 8)}`, type, args }, { acteur });

// La grille d'une île : [type, args, rôle minimal]. Ce qui n'est pas propre à l'île garde sa règle d'E-11.
const CAS = (v) => [
  // le visiteur ne change rien ; l'ami jardinier produit, vend, se lie, outille
  ['potager.arroser', { parcelle: 'potager-1' }, 'jardinier'],
  ['monde.recolter', { piece: 'arbre:10,10', geste: 'couper' }, 'jardinier'],
  ['sac.remplir', { objet: 'pomme', quantite: 1 }, 'jardinier'],
  ['port.vendre', { objet: 'bois', quantite: 1, case: 1 }, 'jardinier'],
  ['portage.charger', { objet: 'bois', quantite: 1, case: 1 }, 'jardinier'],
  ['villageois.parler', { id: v }, 'jardinier'],
  ['villageois.offrir', { id: v, objet: 'pomme' }, 'jardinier'],
  ['villageois.accueillir', { id: v }, 'jardinier'],
  ['villageois.outil', { id: v, outil: 'hache' }, 'jardinier'],
  ['villageois.vendre', { id: v, objets: ['bois'] }, 'jardinier'],
  ['atelier.fabriquer', { recette: 'x' }, 'jardinier'],
  ['etal.mettre', { objet: 'pomme', quantite: 1 }, 'jardinier'],
  ['etal.reprendre', { objet: 'pomme', quantite: 1 }, 'jardinier'],
  ['commerce.suggerer', { id: v, sorte: 'forge' }, 'jardinier'],
  ['chronique.epingler', { n: 1, oui: true }, 'jardinier'],
  ['chronique.noter', { n: 1, texte: 'x' }, 'jardinier'],
  // le bâtisseur : construire, acheter, régler le village au quotidien
  ['bloc.poser', { sorte: 'mur_pierre', case: 1 }, 'batisseur'],
  ['port.acheter', { objet: 'graine_carotte', quantite: 1, case: 1 }, 'batisseur'],
  ['port.contrat', { contrat: 'x', case: 1 }, 'batisseur'],
  ['commerce.acheter', { commerce: 'forge-1', objet: 'hache', quantite: 1 }, 'batisseur'],
  ['commerce.commander', { commerce: 'forge-1', recette: 'x' }, 'batisseur'],
  ['village.commun', { oui: true }, 'batisseur'],
  ['village.reserve', { jours: 2 }, 'batisseur'],
  ['village.cuisine', { case: 1, oui: true }, 'batisseur'],
  ['tech.acheter', { noeud: 'x' }, 'batisseur'],
  ['charrette.ameliorer', {}, 'batisseur'],   // (I2b, à venir : une famille inconnue, le bâtisseur par défaut)
  // le propriétaire : ce qui est structurant
  ['villageois.attribuer', { id: v, tache: 'bois' }, 'proprietaire'],
  ['villageois.foyer', { a: v, b: v }, 'proprietaire'],
  ['villageois.enfant', { foyer: 'f-1' }, 'proprietaire'],
  ['commerce.ouvrir', { id: v, sorte: 'forge' }, 'proprietaire'],
  ['commerce.rejoindre', { id: v, commerce: 'forge-1' }, 'proprietaire'],
  ['commerce.lettres', { commerce: 'forge-1' }, 'proprietaire'],
  ['nom.donner', { quoi: 'village', texte: 'Bourg' }, 'proprietaire'],
  // (I2b : un palier de la charrette du village, au propriétaire ; les rails, des blocs, au bâtisseur)
  ['charrette.palier', { branche: 'capacite' }, 'proprietaire'],
  ['bloc.poser', { sorte: 'rails', case: 1 }, 'batisseur'],
  ['port.agrandir', { case: 1 }, 'proprietaire'],
];

test('I9e : la grille des rôles d\'une île, commande par commande (le rôle minimal ; refusé en dessous, permis au-dessus)', () => {
  const { s } = ile(1);
  assert(ilePartagee(s), 'une île');
  const v = villageoisDe(s)[0].id;
  const lignes = [];
  for (const [type, args, minimal] of CAS(v)) {
    const c = { type, args };
    assertEqual(roleDemande(s, c), minimal, type);
    for (const role of ROLES_MONDE) {
      const refus = refusDuRole(role, s, c);
      assertEqual(refus === null, RANG[role] >= RANG[minimal], `${type} pour ${role} (${refus})`);
      if (refus) assert(typeof refus === 'string' && refus.length > 20, `${type} : un refus en mots`);
    }
    lignes.push(`${type}:${minimal}`);
  }
  // (la grille d'une île porte sur ce qui est propre au village ; tout ce qu'elle nomme est une commande du jeu, sauf rien)
  for (const type of Object.keys(GRILLE_ILE)) assert(COMMANDES[type], `${type} est une commande`);
  // (les refus du propriétaire disent ce qui lui revient)
  assert(/attribue les tâches/.test(refusDuRole('batisseur', s, { type: 'villageois.attribuer', args: { id: v, tache: 'bois' } })));
  assert(/suggère-le-lui/.test(refusDuRole('jardinier', s, { type: 'commerce.ouvrir', args: { id: v, sorte: 'forge' } })));
  assert(/nomme/.test(refusDuRole('batisseur', s, { type: 'nom.donner', args: { quoi: 'ile', texte: 'x' } })));
  console.log(`   (${lignes.length} commandes dans le tableau)`);
});

test('I9e : la délégation : le propriétaire confie l\'attribution des tâches aux bâtisseurs (un réglage du monde, éteint par défaut)', () => {
  const { s } = ile(1);
  const c = { type: 'villageois.attribuer', args: { id: villageoisDe(s)[0].id, tache: 'bois' } };
  assertEqual(reglagesMonde(null), { taches: false }, 'éteint par défaut');
  assert(refusDuRole('batisseur', s, c), 'le bâtisseur, sans la délégation');
  assertEqual(refusDuRole('batisseur', s, c, reglagesMonde({ taches: true })), null, 'le bâtisseur, avec');
  assert(refusDuRole('jardinier', s, c, { taches: true }), 'l\'ami jardinier, jamais');
  assertEqual(refusDuRole('proprietaire', s, c, { taches: false }), null, 'le propriétaire, toujours');
  // (le reste de ce qui est au propriétaire ne se délègue pas)
  assert(refusDuRole('batisseur', s, { type: 'commerce.ouvrir', args: { id: 'x', sorte: 'forge' } }, { taches: true }));
});

test('I9e : la maison d\'un villageois (sa boîte aux lettres, sa porte, son lit, ses murs) ne se retire que par le propriétaire ; une maison libre, si', () => {
  const { s, maisons } = ile(1);
  const W = farmTerrain(s).LARGEUR, v = villageoisDe(s)[0], m = maisons.find((x) => x.boite === v.maison);
  assert(m, 'sa maison');
  const cas = { boite: m.boite, porte: m.porte, lit: v.lit, mur: m.coin + W };
  for (const [quoi, c] of Object.entries(cas)) {
    const cmd = { type: 'bloc.reprendre', args: { case: c } };
    assertEqual(roleDemande(s, cmd), 'proprietaire', quoi);
    assert(/maison d'un villageois/.test(refusDuRole('batisseur', s, cmd)), `${quoi} : ${refusDuRole('batisseur', s, cmd)}`);
  }
  assertEqual(roleDemande(s, { type: 'bloc.deplacer', args: { de: m.boite, vers: m.boite + 3 } }), 'proprietaire', 'déplacer sa boîte');
  // (une maison libre : la seconde, où personne n'habite)
  const t = cloner(s);
  const libre = testMaisonVillageois(t);
  assert(libre.ok);
  assertEqual(roleDemande(t, { type: 'bloc.reprendre', args: { case: libre.boite } }), 'batisseur', 'une maison libre');
  // (le villageois parti de sa maison — elle n'est plus habitée)
  t.villageois.forEach((x) => { x.maison = null; x.lit = null; });
  assertEqual(roleDemande(t, { type: 'bloc.reprendre', args: { case: m.boite } }), 'batisseur', 'plus habitée');
});

test('I9e : les gestes de gestion du village sont des commandes ; jouées par le monde avec leur acteur, elles font ce que fait le moteur en solo', () => {
  const { s } = ile(2);
  const solo = cloner(s);
  const [v, w] = villageoisDe(s);
  // la tâche
  const r = jouer(s, 'villageois.attribuer', { id: v.id, tache: 'bois' });
  assert(r.ok, r.error);
  assertEqual([r.avant, r.tache, r.prenom], [null, 'bois', v.prenom], 'la tâche d\'avant et d\'après, le prénom (le journal)');
  assert(attribuer(solo, v.id, 'bois').ok);
  assertEqual(trouverVillageois(s, v.id).tache, trouverVillageois(solo, v.id).tache);
  assertEqual(jouer(s, 'villageois.attribuer', { id: v.id, tache: 'aucune' }).avant, 'bois', 'puis plus de tâche');
  // l'outil, rendu, la navette
  assert(jouer(s, 'villageois.outil', { id: w.id, outil: 'hache' }).ok);
  assertEqual([trouverVillageois(s, w.id).outil, s.outils.hache], ['hache', false]);
  assert(jouer(s, 'villageois.outil', { id: w.id, outil: 'reprendre' }).ok);
  assertEqual([trouverVillageois(s, w.id).outil, s.outils.hache], [null, true]);
  assert(jouer(s, 'villageois.vendre', { id: w.id, objets: ['bois'] }).ok);
  assertEqual(trouverVillageois(s, w.id).vendre, ['bois']);
  // un foyer, un enfant : le moteur dit pourquoi pas (ils ne sont pas proches), la commande le rend
  const f = jouer(s, 'villageois.foyer', { a: v.id, b: w.id });
  assertEqual(f.ok, false);
  assert(typeof f.error === 'string' && f.error.length > 5, f.error);
  assertEqual(jouer(s, 'villageois.enfant', { foyer: 'f-x' }).ok, false);
  // le nom du village, de l'île, d'une maison (et sa ligne de chronique)
  const n = jouer(s, 'nom.donner', { quoi: 'village', texte: 'Bourg-Lune' });
  assert(n.ok, n.error);
  assertEqual([nomDe(s, 'village'), n.quoi, n.nom], ['Bourg-Lune', 'village', 'Bourg-Lune']);
  assert(jouer(s, 'nom.donner', { quoi: 'maison', texte: 'Les Tilleuls', id: String(v.maison) }).ok);
  assertEqual(nomDe(s, 'maison', v.maison), 'Les Tilleuls');
  assertEqual(jouer(s, 'nom.donner', { quoi: 'ile', texte: '' }).ok, false, 'un nom vide');
  // (rejoué chez un autre joueur, la même partie)
  assertEqual(empreintePartie(cloner(s)), empreintePartie(s));
});

test('I9e : un invité suggère un commerce : il faut l\'envie du villageois et l\'amitié de l\'invité ; rien ne change dans la partie', () => {
  const { s } = ile(1);
  const v = villageoisDe(s)[0];
  // (sans envie)
  assert(/envie/.test(jouer(s, 'commerce.suggerer', { id: v.id, sorte: 'forge' }, B).error || ''), 'sans envie');
  v.envies = { forge: s.day };
  // (l'envie, sans l'amitié de B : il est à l'accueil)
  const r0 = jouer(s, 'commerce.suggerer', { id: v.id, sorte: 'forge' }, B);
  assert(!r0.ok && /très ami/.test(r0.error), r0.error);
  // (B très ami : la suggestion passe ; le villageois et les commerces ne changent pas)
  s.amities[B] = { pnj: { [v.id]: { pts: DATA.AMITIE.ECHELLE.MAX } } };
  const avant = JSON.stringify([s.villageois, s.commerces || [], s.pieces]);
  const r = jouer(s, 'commerce.suggerer', { id: v.id, sorte: 'forge' }, B);
  assert(r.ok, r.error);
  assertEqual([r.villageois, r.sorte, r.prenom], [v.id, 'forge', v.prenom]);
  assertEqual(JSON.stringify([s.villageois, s.commerces || [], s.pieces]), avant, 'rien ne change');
  // (l'amitié qui compte pour ouvrir est celle du propriétaire : c'est lui qui joue commerce.ouvrir, avec la sienne)
  assertEqual(roleDemande(s, { type: 'commerce.ouvrir', args: { id: v.id, sorte: 'forge' } }), 'proprietaire');
});

test('I9e : la chronique du monde : une ligne épinglée ou annotée porte le compte de qui l\'a fait ; en solo, rien ; un villageois ne se renvoie pas', () => {
  const { s } = ile(1);
  noterChronique(s, 'recolte', { culture: 'carotte' });
  const l = chroniqueDe(s).lignes[chroniqueDe(s).lignes.length - 1];
  assert(jouer(s, 'chronique.noter', { n: l.n, texte: 'Notre première carotte !' }, B).ok);
  assertEqual([l.note, l.epingle, l.par], ['Notre première carotte !', true, B], 'signée de B');
  assert(jouer(s, 'chronique.epingler', { n: l.n, oui: false }, A).ok);
  assertEqual([!!l.epingle, 'par' in l], [false, false], 'détachée : plus de signature');
  assert(jouer(s, 'chronique.epingler', { n: l.n, oui: true }, A).ok);
  assertEqual(l.par, A, 'épinglée par A');
  // (en solo : pas de signature)
  const solo = partie(1);
  noterChronique(solo, 'recolte', { culture: 'carotte' });
  const ls = chroniqueDe(solo).lignes[chroniqueDe(solo).lignes.length - 1];
  assert(executerCommande(solo, { id: 'c-n', type: 'chronique.noter', args: { n: ls.n, texte: 'à moi' } }).ok);
  assertEqual([ls.note, 'par' in ls], ['à moi', false]);
  // (la réparation garde une signature lisible, retire les autres)
  const C = reparerChronique({ ...cloner(chroniqueDe(s)), lignes: chroniqueDe(s).lignes.map((x) => (x.n === l.n ? x : { ...x, par: '<b>', epingle: true })) });
  assertEqual(C.lignes.find((x) => x.n === l.n).par, A);
  assert(C.lignes.filter((x) => x.n !== l.n).every((x) => !('par' in x)), 'une signature illisible s\'en va');
  // (aucune commande ne renvoie un villageois)
  assertEqual(Object.keys(COMMANDES).filter((t) => /^villageois\.(renvoyer|chasser|retirer|expulser)/.test(t)), []);
});

test('I9e : la sauvegarde passe au format 108 (la chronique signée d\'un monde ; une partie solo n\'y gagne rien)', () => {
  assert(STATE_VERSION >= 108);
  const { s } = ile(1);
  noterChronique(s, 'recolte', { culture: 'carotte' });
  const l = chroniqueDe(s).lignes[chroniqueDe(s).lignes.length - 1];
  l.epingle = true;
  l.note = 'signée';
  l.par = B;
  const v107 = { ...cloner(s), version: 107 };
  v107.chronique.lignes.push({ ...cloner(l), n: 999, par: 'x y z' });
  const m = migrate({ v: 107, t: 0, s: v107 });
  assertEqual([m.version, m.chronique.lignes.find((x) => x.n === l.n).par, 'par' in m.chronique.lignes.find((x) => x.n === 999)], [STATE_VERSION, B, false]);
  const solo = { ...cloner(partie(1)), version: 107 };
  assertEqual(migrate({ v: 107, t: 0, s: solo }).version, STATE_VERSION, 'une partie solo : le format seul');
});
