/* ==========================================================================
   Tests du moteur : les commandes du chantier (js/engine/commandes.js, ticket F0-3). Une commande
   bien formée fait ce que faisaient les fonctions du moteur ; mal formée, elle ne touche à rien ; ses
   inverses ramènent la partie exactement où elle était ; un inverse dont la case a changé échoue
   sans rien toucher.
   Lancer seul : node --test tests/engine/commandes.test.mjs (ou node tests/run-tests.mjs commandes).
   ========================================================================== */

import {
  blocAt, buildAtelier, buyFurniture, casesCouvertes, COMMANDES, commandeInvalide, countItem, defaire,
  etageBlocs, executerCommande, farmTerrain, hauteurPile, poserBloc, rehausser, sensBloc, solsEtage, surCase,
  testFarmMap,
} from '../../js/engine/index.js';
import { assert, assertEqual, garden, setInv, test, tireless } from './aide.mjs';

/* ---------- le chantier d'essai (comme tests/engine/ferme-generee.cas.mjs) ---------- */

function chantier(graine) {
  const s = garden();
  tireless(s);
  testFarmMap(s, graine);
  setInv(s, { bois: 3, pierre: 3 });
  assert(buildAtelier(s).ok);
  return s;
}
// Une case d'herbe libre de `w` × `h` cases (coin haut-gauche), loin des bords.
function terrainLibre(s, w, h) {
  const T = farmTerrain(s), W = T.LARGEUR;
  for (let r = 4; r < T.HAUTEUR - h - 4; r++) {
    for (let c = 4; c < W - w - 4; c++) {
      let ok = true;
      for (let dr = 0; dr < h && ok; dr++) for (let dc = 0; dc < w && ok; dc++) ok = T.LIGNES[r + dr][c + dc] === '#' && !s.potager.parcelles.some((p) => p.case === (r + dr) * W + c + dc) && !(T.HERBES && T.HERBES[(r + dr) * W + c + dc]);
      if (ok) return { c, r, W };
    }
  }
  return null;
}
// Les murs d'une pièce de w × h cases (murs compris), la porte au milieu du bas.
function murs({ c, r, W }, w, h) {
  const out = [];
  for (let dr = 0; dr < h; dr++) for (let dc = 0; dc < w; dc++) if (dr === 0 || dc === 0 || dr === h - 1 || dc === w - 1) out.push((r + dr) * W + c + dc);
  return { murs: out.filter((t) => t !== (r + h - 1) * W + c + Math.floor(w / 2)), porte: (r + h - 1) * W + c + Math.floor(w / 2), dedans: (r + 1) * W + c + 1 };
}
// Une pièce close de w × h cases, bâtie par les fonctions du moteur.
function piece(s, w, h) {
  const z = terrainLibre(s, w, h), p = murs(z, w, h);
  for (const t of p.murs) assert(poserBloc(s, 'mur_pierre', t).ok);
  assert(poserBloc(s, 'mur_pierre', p.porte).ok);
  assert(poserBloc(s, 'porte', p.porte).ok);
  return { ...p, W: z.W, at: (dc, dr) => (z.r + dr) * z.W + z.c + dc };
}

// La partie sous une forme comparable : les clés des objets triées (un objet repris puis rendu revient
// en dernier dans l'inventaire : même partie), sans les objets vides du premier niveau (reprendre un
// bloc crée en passant `hauteurs: {}`, qui ne change rien au jeu).
const trie = (v) => (Array.isArray(v) ? v.map(trie)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, trie(v[k])])) : v);
const copie = (s) => Object.fromEntries(Object.entries(trie(JSON.parse(JSON.stringify(s))))
  .filter(([, v]) => !(v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length)));
let n = 0;
const jouer = (s, type, args) => executerCommande(s, { id: `essai-${++n}`, type, args });

// Joue la commande, vérifie qu'elle réussit, puis que ses inverses ramènent la partie à l'identique ;
// rejoue la commande (la partie reste celle d'après) et rend son résultat.
function allerRetour(s, type, args, quoi) {
  const avant = copie(s);
  const r = jouer(s, type, args);
  assert(r.ok, `${quoi} : ${r.error}`);
  assert(r.inverses.length > 0, `${quoi} : de quoi la défaire`);
  const apres = copie(s);
  assertEqual(defaire(s, r.inverses), r.inverses.length, `${quoi} : défaite`);
  assertEqual(copie(s), avant, `${quoi} : la partie revient exactement où elle était`);
  const r2 = jouer(s, type, args);
  assert(r2.ok, `${quoi} (rejouée) : ${r2.error}`);
  assertEqual(copie(s), apres, `${quoi} : rejouée, le même résultat`);
  return r2;
}

/* ---------- les tests ---------- */

test('commandes : une commande mal formée est refusée et ne touche à rien', () => {
  const s = chantier('cmd-forme');
  setInv(s, { mur_pierre: 5 });
  const avant = copie(s), z = terrainLibre(s, 3, 3), c = z.r * z.W + z.c;
  const mauvaises = [
    [null, 'Commande illisible.'],
    [{ type: 'bloc.voler', args: {} }, 'Commande inconnue : bloc.voler.'],
    [{ type: 'bloc.poser' }, 'bloc.poser : arguments illisibles.'],
    [{ type: 'bloc.poser', args: { sorte: 'mur_pierre' } }, 'bloc.poser : il manque « case ».'],
    [{ type: 'bloc.poser', args: { sorte: 'licorne', case: c } }, 'bloc.poser : « sorte » invalide.'],
    [{ type: 'bloc.poser', args: { sorte: 'mur_pierre', case: -1 } }, 'bloc.poser : « case » invalide.'],
    [{ type: 'bloc.poser', args: { sorte: 'mur_pierre', case: 1.5 } }, 'bloc.poser : « case » invalide.'],
    [{ type: 'bloc.poser', args: { sorte: 'mur_pierre', case: c, sens: 4 } }, 'bloc.poser : « sens » invalide.'],
    [{ type: 'bloc.poser', args: { sorte: 'mur_pierre', case: c, pieces: 1000 } }, 'bloc.poser : argument inconnu « pieces ».'],
    [{ type: 'solEtage.poser', args: { sorte: 'plancher', case: c, niveau: 3 } }, 'solEtage.poser : « niveau » invalide.'],
  ];
  for (const [cmd, raison] of mauvaises) {
    assertEqual(commandeInvalide(cmd), raison);
    const r = executerCommande(s, cmd);
    assertEqual([r.ok, r.error], [false, raison]);
  }
  assertEqual(copie(s), avant, 'la partie n\'a pas bougé');
  // bien formée : l'identifiant revient tel quel, la case est posée
  const r = executerCommande(s, { id: 'abc-1', type: 'bloc.poser', args: { sorte: 'mur_pierre', case: c } });
  assertEqual([r.ok, r.id, blocAt(s, c), r.inverses], [true, 'abc-1', 'mur_pierre', [{ type: 'bloc.reprendre', args: { case: c, attendu: 'mur_pierre' } }]]);
  // chaque commande déclare ses arguments
  for (const [type, def] of Object.entries(COMMANDES)) assert(def.args && typeof def.executer === 'function', type);
});

test('commandes : au sol, chaque geste du chantier se défait à l\'identique', () => {
  const s = chantier('cmd-sol');
  s.pieces = 10000;
  setInv(s, { mur_pierre: 40, porte: 2, mur_fenetre: 2, paillasse: 1 });
  const p = piece(s, 8, 7);
  assert(poserBloc(s, 'paillasse', p.dedans).ok);
  for (const id of ['table', 'chaise']) assert(buyFurniture(s, id).ok, id);
  // un mur seul, dehors
  const dehors = p.at(-2, 3);
  allerRetour(s, 'bloc.poser', { sorte: 'mur_pierre', case: dehors }, 'un mur posé');
  allerRetour(s, 'bloc.reprendre', { case: dehors }, 'un mur repris');
  // une fenêtre sur un mur : un changement, défait par bloc.remettre (la fenêtre reprise rend son mur)
  const f = p.murs[2];
  const r = allerRetour(s, 'bloc.poser', { sorte: 'mur_fenetre', case: f }, 'une fenêtre percée');
  assertEqual([r.inverses, blocAt(s, f)], [[{ type: 'bloc.remettre', args: { case: f, avant: 'mur_pierre', apres: 'mur_fenetre' } }], 'mur_fenetre']);
  // la table, posée de profil, tournée, déplacée, reprise par une case qu'elle couvre
  const t = p.at(2, 4);
  allerRetour(s, 'bloc.poser', { sorte: 'meuble_table', case: t, sens: 1 }, 'une table de profil');
  assertEqual(sensBloc(s, t), 1);
  const tour = allerRetour(s, 'bloc.tourner', { case: t }, 'la table tournée');
  assertEqual(tour.inverses, [{ type: 'bloc.orienter', args: { case: t, sorte: 'meuble_table', sens: 1 } }]);
  const d = allerRetour(s, 'bloc.deplacer', { de: t, vers: p.at(4, 3) }, 'la table déplacée');
  assertEqual(d.inverses, [{ type: 'bloc.deplacer', args: { de: p.at(4, 3), vers: t, attendu: 'meuble_table' } }]);
  const couverte = [...casesCouvertes(s)].find(([c, ancre]) => ancre === p.at(4, 3) && c !== ancre)[0];
  assertEqual(surCase(s, couverte), null, 'une case couverte : rien n\'y est posé');
  const rep = allerRetour(s, 'bloc.reprendre', { case: couverte }, 'la table reprise par une case qu\'elle couvre');
  assertEqual([rep.sorte, countItem(s, 'meuble_table')], ['meuble_table', 1]);
  // la chaise : posée d'un appui, dans le sens voulu
  allerRetour(s, 'bloc.poser', { sorte: 'meuble_chaise', case: p.at(2, 2), sens: 3 }, 'une chaise vers la gauche');
});

test('commandes : murs rehaussés, étage et sols des niveaux se défont à l\'identique', () => {
  const s = chantier('cmd-haut');
  setInv(s, { mur_pierre: 80, porte: 1, plancher: 4, sol_carrelage: 2, escalier: 1, paillasse: 2 });
  const p = piece(s, 5, 5), dedans = p.dedans + p.W + 1;
  // rehausser, abaisser (la gomme du niveau 1 : seulement un mur haut de 2 blocs)
  allerRetour(s, 'mur.rehausser', { sorte: 'mur_pierre', case: p.murs[0] }, 'un mur rehaussé');
  assertEqual(hauteurPile(s, p.murs[0]), 2);
  assertEqual(jouer(s, 'mur.abaisser', { case: p.murs[1], niveau: 1 }).error, 'Niveau 1 : la gomme reprend le bloc du dessus des murs hauts de 2 blocs.');
  allerRetour(s, 'mur.abaisser', { case: p.murs[0], niveau: 1 }, 'un mur abaissé');
  for (const t of [...p.murs, p.porte]) if (hauteurPile(s, t) < 2) assert(rehausser(s, 'mur_pierre', t).ok);
  // un sol au niveau 1, changé, repris
  allerRetour(s, 'solEtage.poser', { sorte: 'plancher', case: dedans, niveau: 1 }, 'un plancher au niveau 1');
  const ch = allerRetour(s, 'solEtage.poser', { sorte: 'sol_carrelage', case: dedans, niveau: 1 }, 'un carrelage à sa place');
  assertEqual(ch.inverses, [{ type: 'solEtage.remettre', args: { case: dedans, niveau: 1, avant: 'plancher', apres: 'sol_carrelage' } }]);
  allerRetour(s, 'solEtage.reprendre', { case: dedans, niveau: 1 }, 'le sol repris');
  assertEqual(solsEtage(s)[dedans], undefined);
  // l'étage : l'escalier en bas, une paillasse en haut
  assert(poserBloc(s, 'escalier', p.dedans + 2).ok);
  allerRetour(s, 'etage.poser', { sorte: 'paillasse', case: dedans }, 'une paillasse à l\'étage');
  assertEqual(etageBlocs(s)[dedans], 'paillasse');
  allerRetour(s, 'etage.reprendre', { case: dedans }, 'la paillasse de l\'étage reprise');
  assertEqual(etageBlocs(s)[dedans], undefined);
});

test('commandes : un mur à l\'étage, une fenêtre percée dedans, se défont à l\'identique', () => {
  const s = chantier('cmd-etage');
  setInv(s, { mur_pierre: 40, porte: 1, mur_fenetre: 2, escalier: 1 });
  const p = piece(s, 6, 5);
  assert(poserBloc(s, 'escalier', p.dedans).ok);
  // (au-dessus du mur du haut, au milieu)
  const haut = p.murs[2];
  allerRetour(s, 'etage.poser', { sorte: 'mur_pierre', case: haut }, 'un mur à l\'étage');
  const fen = allerRetour(s, 'etage.poser', { sorte: 'mur_fenetre', case: haut }, 'une fenêtre à l\'étage');
  assertEqual([fen.inverses, etageBlocs(s)[haut]], [[{ type: 'etage.remettre', args: { case: haut, avant: 'mur_pierre', apres: 'mur_fenetre' } }], 'mur_fenetre']);
});

test('commandes : un inverse dont la case a changé échoue sans rien toucher', () => {
  const s = chantier('cmd-change');
  setInv(s, { mur_pierre: 5, porte: 1 });
  const z = terrainLibre(s, 3, 3), c = z.r * z.W + z.c;
  const r = jouer(s, 'bloc.poser', { sorte: 'mur_pierre', case: c });
  assert(r.ok);
  // entre-temps, une porte a pris la place du mur
  assert(jouer(s, 'bloc.poser', { sorte: 'porte', case: c }).ok);
  const avant = copie(s);
  assertEqual(defaire(s, r.inverses), 0);
  assertEqual(executerCommande(s, r.inverses[0]).error, 'Ce qui était posé là a changé depuis.');
  assertEqual(copie(s), avant);
  assertEqual(jouer(s, 'bloc.deplacer', { de: c, vers: c + 1, attendu: 'meuble_table' }).error, 'Ce qui était posé là a changé depuis.');
  assertEqual(jouer(s, 'bloc.orienter', { case: c, sorte: 'meuble_table', sens: 0 }).error, 'Ce qui était posé là a changé depuis.');
  assertEqual(copie(s), avant);
});
