/* ==========================================================================
   Tests du moteur : le rejeu (ticket F0-4). Une suite de commandes (js/engine/commandes.js), tirée au
   hasard à graine fixe parmi tous les gestes du chantier, du potager et de la nuit, puis rejouée sur la
   même partie de départ, redonne exactement la même partie (même empreinte, mêmes résultats) : le moteur
   est déterministe. C'est ce que fera le serveur d'un monde partagé : jouer les commandes dans l'ordre et
   comparer les empreintes avec celles des joueurs.
   Lancer seul : node --test tests/engine/rejeu.test.mjs (ou node tests/run-tests.mjs rejeu).
   ========================================================================== */

import {
  buildAtelier, defaire, empreintePartie, executerCommande, farmTerrain, mulberry32, poserBloc, testFarmMap,
} from '../../js/engine/index.js';
import { assert, assertEqual, garden, setInv, test, tireless } from './aide.mjs';

const N = 1000;              // commandes par journal
const GRAINE = 20261107;     // le hasard du tirage (pas celui de la partie) ; choisi pour que le journal
                             // fasse réussir chaque sorte de geste (vérifié ci-dessous)

// La partie de départ : une ferme générée, l'Atelier bâti, une pièce close de 8 × 7 cases (murs et porte)
// dans le coin de 14 × 10 cases où se joue le journal (ZONE), de quoi construire et semer.
let ZONE = null;
function depart() {
  const s = garden();
  tireless(s);
  testFarmMap(s, 'rejeu');
  setInv(s, { bois: 3, pierre: 3 });
  assert(buildAtelier(s).ok);
  setInv(s, {
    mur_pierre: 200, porte: 10, mur_fenetre: 20, paillasse: 4, escalier: 3, plancher: 40, sol_carrelage: 20,
    lanterne: 6, meuble_table: 3, meuble_chaise: 6, meuble_lit_enfant: 3, graine_carotte: 60, graine_tomate: 60,
  });
  const z = ZONE = terrainLibre(s, 14, 10), at = (dc, dr) => (z.r + dr) * z.W + z.c + dc;
  for (let dr = 0; dr < 7; dr++) for (let dc = 0; dc < 8; dc++) {
    if (dr && dc && dr < 6 && dc < 7) continue;
    assert(poserBloc(s, 'mur_pierre', at(dc, dr)).ok);
  }
  assert(poserBloc(s, 'porte', at(4, 6)).ok, 'la porte');
  return s;
}

// Un coin d'herbe libre de w × h cases (coin haut-gauche), loin des bords, sans parcelle.
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

// Le journal : N commandes tirées au hasard (graine fixe) et jouées sur `s`, dans un petit coin de la
// ferme (pour que les gestes se rencontrent : des murs qui ferment des pièces, des meubles dedans, des
// reprises de ce qui a été posé), plus des annulations (les inverses d'une commande passée) et les
// gestes du potager sur les parcelles de départ. Chaque entrée : la commande et son résultat.
function journal(s) {
  const r = mulberry32(GRAINE), un = (liste) => liste[Math.floor(r() * liste.length)];
  // (la pièce de départ garde ses murs : les meubles se posent dedans, les murs tirés au hasard autour ;
  // reprendre, déplacer, tourner visent tout le coin sauf ses murs)
  const z = ZONE, at = (dc, dr) => (z.r + dr) * z.W + z.c + dc, cases = [], dedans = [], autour = [], piece = new Set();
  for (let dr = 0; dr < 10; dr++) for (let dc = 0; dc < 14; dc++) {
    const c = at(dc, dr), dansPiece = dr < 7 && dc < 8, bord = dansPiece && (!dr || !dc || dr === 6 || dc === 7);
    if (bord) piece.add(c); else cases.push(c);
    if (dansPiece && !bord) dedans.push(c);
    if (!dansPiece) autour.push(c);
  }
  const parcelles = s.potager.parcelles.map((p) => p.id);
  const murs = ['mur_pierre', 'mur_pierre', 'mur_pierre', 'porte', 'mur_fenetre'];
  const objets = ['paillasse', 'escalier', 'lanterne', 'meuble_table', 'meuble_chaise', 'plancher', 'sol_carrelage'];
  const fait = [];
  let n = 0;
  const jouer = (type, args) => {
    const cmd = { id: `rejeu-${++n}`, type, args };
    const res = executerCommande(s, cmd);
    fait.push({ cmd: JSON.parse(JSON.stringify(cmd)), res: resume(res) });
    return res;
  };
  const annulables = [], meubles = [], meublesEtage = [];
  for (let i = 0; i < N; i++) {
    const t = r();
    let res;
    if (t < 0.30) res = jouer('bloc.poser', { sorte: un(murs), case: un(autour) });
    else if (t < 0.35) res = jouer('bloc.poser', { sorte: un(['porte', 'mur_fenetre']), case: un([...piece]) });
    else if (t < 0.47) res = jouer('bloc.poser', { sorte: un(objets), case: un(dedans), sens: Math.floor(r() * 4) });
    else if (t < 0.55) res = jouer('bloc.reprendre', { case: un(cases) });
    else if (t < 0.59) res = jouer('bloc.deplacer', { de: meubles.length && r() < 0.8 ? un(meubles) : un(cases), vers: un(cases) });
    // (tourner, déplacer : le plus souvent un meuble posé plus tôt)
    else if (t < 0.62) res = jouer('bloc.tourner', { case: meubles.length && r() < 0.8 ? un(meubles) : un(cases) });
    // (A-3 : repeindre un meuble posé, dans une couleur de la table ou de la chaise, ou une qui n'existe pas)
    else if (t < 0.63) res = jouer('bloc.peindre', { case: meubles.length && r() < 0.8 ? un(meubles) : un(cases), variante: un(['miel', 'noyer', 'bleu', 'blanchi', 'rouge']) });
    else if (t < 0.68) res = jouer('mur.rehausser', { sorte: 'mur_pierre', case: un([...piece, ...autour]) });
    else if (t < 0.70) res = jouer('mur.abaisser', { case: un([...piece, ...autour]) });
    else if (t < 0.73) res = jouer('etage.poser', { sorte: un(['mur_pierre', 'paillasse', 'mur_fenetre', 'meuble_chaise', 'meuble_lit_enfant']), case: un([...piece, ...dedans]), sens: Math.floor(r() * 4) });
    else if (t < 0.74) res = jouer('solEtage.poser', { sorte: un(['plancher', 'sol_carrelage']), case: un(dedans), niveau: 1 });
    else if (t < 0.745) res = jouer('etage.tourner', { case: meublesEtage.length && r() < 0.8 ? un(meublesEtage) : un(dedans) });
    else if (t < 0.75) {
      // (déplacer un meuble de l'étage : sa nouvelle place devient la sienne pour la suite)
      const k = meublesEtage.length && r() < 0.8 ? Math.floor(r() * meublesEtage.length) : -1, vers = un(dedans);
      res = jouer('etage.deplacer', { de: k >= 0 ? meublesEtage[k] : un(dedans), vers });
      if (res.ok && k >= 0) meublesEtage[k] = vers;
    }
    else if (t < 0.80) res = jouer('potager.planter', { parcelle: un(parcelles), culture: un(['carotte', 'tomate']) });
    else if (t < 0.84) res = jouer('potager.arroser', { parcelle: un(parcelles) });
    else if (t < 0.87) res = jouer('potager.recolter', { parcelle: un(parcelles) });
    else if (t < 0.88) res = jouer('nuit.dormir', {});
    else if (annulables.length) {
      // (une annulation : les inverses d'une commande passée, comme le bouton ↶)
      const inv = annulables.splice(Math.floor(r() * annulables.length), 1)[0];
      for (const c of [...inv].reverse()) jouer(c.type, c.args);
      continue;
    } else continue;
    if (res.ok && res.inverses.length) annulables.push(res.inverses);
    if (res.ok && fait[fait.length - 1].cmd.type === 'bloc.poser' && /^meuble_/.test(fait[fait.length - 1].cmd.args.sorte)) meubles.push(fait[fait.length - 1].cmd.args.case);
    if (res.ok && fait[fait.length - 1].cmd.type === 'etage.poser' && /^meuble_/.test(fait[fait.length - 1].cmd.args.sorte)) meublesEtage.push(fait[fait.length - 1].cmd.args.case);
  }
  return fait;
}

// Le résultat d'une commande, sans ce qui ne se compare pas tel quel (rien : tout y est des données).
const resume = (res) => JSON.parse(JSON.stringify(res));

// Rejoue un journal (ses commandes seulement) sur la partie `s` : les résultats.
function rejouer(s, entrees) {
  return entrees.map(({ cmd }) => resume(executerCommande(s, cmd)));
}

test('rejeu : 1000 commandes tirées au hasard, rejouées sur la même partie, donnent la même partie', () => {
  const a = depart(), b = depart();
  assertEqual(empreintePartie(a), empreintePartie(b), 'deux parties de départ identiques');
  const depart0 = empreintePartie(a);
  const entrees = journal(a);
  // le journal n'est pas trivial : une bonne part des gestes réussit, de toutes les sortes
  const reussies = entrees.filter((e) => e.res.ok);
  const sortes = new Set(reussies.map((e) => e.cmd.type));
  assert(reussies.length > entrees.length * 0.2, `${reussies.length} commandes réussies sur ${entrees.length}`);
  for (const type of ['bloc.poser', 'bloc.reprendre', 'bloc.remettre', 'bloc.deplacer', 'bloc.tourner', 'bloc.orienter', 'bloc.peindre', 'mur.rehausser', 'mur.abaisser', 'etage.poser', 'etage.tourner', 'etage.deplacer', 'solEtage.poser', 'potager.planter', 'potager.arroser']) {
    assert(sortes.has(type), `au moins un « ${type} » réussi`);
  }
  assert(empreintePartie(a) !== depart0, 'la partie a changé');
  // rejoué sur une autre partie de départ identique : mêmes résultats, une à une, et même partie
  const resultats = rejouer(b, entrees);
  for (let i = 0; i < entrees.length; i++) assertEqual(resultats[i], entrees[i].res, `commande ${i + 1} (${entrees[i].cmd.type})`);
  assertEqual(empreintePartie(b), empreintePartie(a), 'la même partie au bout du journal');
});

test('rejeu : le journal et la partie passent par du JSON (un envoi, une sauvegarde) sans rien changer', () => {
  const a = depart();
  const depart0 = JSON.stringify(a);
  const entrees = journal(a);
  // la partie de départ relue d'un texte, le journal aussi (comme reçus d'un serveur)
  const b = JSON.parse(depart0);
  const lu = JSON.parse(JSON.stringify(entrees.map((e) => ({ cmd: e.cmd }))));
  rejouer(b, lu);
  assertEqual(empreintePartie(b), empreintePartie(a));
  // à mi-chemin : la partie sauvegardée (JSON) puis reprise, la suite du journal y donne la même fin
  const c = JSON.parse(depart0), moitie = entrees.length >> 1;
  rejouer(c, entrees.slice(0, moitie));
  const d = JSON.parse(JSON.stringify(c));
  rejouer(d, entrees.slice(moitie));
  assertEqual(empreintePartie(d), empreintePartie(a), 'sauvegardée et reprise au milieu du journal');
});

test('rejeu : l\'empreinte change avec la partie, pas avec l\'ordre de ses clés', () => {
  const a = depart();
  const e = empreintePartie(a);
  assertEqual(e.length, 16);
  // les mêmes données, clés écrites dans l'ordre inverse
  const inverse = (v) => (Array.isArray(v) ? v.map(inverse) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).reverse().map((k) => [k, inverse(v[k])])) : v);
  assertEqual(empreintePartie(inverse(JSON.parse(JSON.stringify(a)))), e);
  // un seul geste : une autre empreinte ; le défaire : la même qu'avant
  const r = executerCommande(a, { id: 'x', type: 'bloc.poser', args: { sorte: 'lanterne', case: (() => { const z = terrainLibre(a, 2, 2); return z.r * z.W + z.c; })() } });
  assert(r.ok, r.error);
  assert(empreintePartie(a) !== e, 'une lanterne posée change l\'empreinte');
  assertEqual(defaire(a, r.inverses), 1);
  assertEqual(empreintePartie(a), e, 'reprise : la partie retrouve son empreinte (un objet vide créé en passant ne compte pas)');
});
