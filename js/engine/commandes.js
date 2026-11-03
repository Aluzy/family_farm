/* ---------- les commandes : ce que fait le joueur, nommé, vérifié, annulable ----------
   (la nouvelle vision, ticket F0-3 : un pas vers les mondes partagés, où un serveur jouera les mêmes
   commandes avec le même moteur)

   Une commande est un objet simple, que l'on peut écrire, envoyer, garder dans un journal et rejouer :
     { id, type, args }
   `type` est l'une des clés de COMMANDES ; `args` ses arguments (des nombres, des textes) ; `id` un
   identifiant unique donné par celui qui l'émet (l'interface, plus tard un autre joueur) : le moteur
   ne le fabrique pas (il n'a ni horloge ni hasard à lui), il le rend tel quel.

   executerCommande(state, cmd) applique la commande par les fonctions du moteur qui existaient déjà
   (blocs.js, etage.js : elles vérifient tout et mutent la partie) et renvoie leur résultat, plus :
     - `id` : celui de la commande ;
     - `inverses` : les commandes qui la défont (vide : rien à défaire, comme une colonne de silo
       rehaussée). Une commande inverse vérifie d'abord que ce qu'elle défait est
       toujours là (`attendu`) : si la case a changé depuis, elle échoue sans rien toucher.
   Une commande refusée ne change rien à la partie : { ok: false, error }.

   Les commandes du chantier (le mode Construire, js/ui/chantier.js) :
     bloc.poser       { sorte, case, sens? }   poser au sol (sur un mur : le changer ; un meuble : son sens)
     bloc.reprendre   { case, attendu? }       reprendre ce qui est sur la case (un meuble : sur l'une de ses cases)
     bloc.remettre    { case, avant, apres }   défaire un changement : `apres` repris, `avant` reposé
     bloc.deplacer    { de, vers, attendu? }   emporter un bloc seul ou un meuble de sa case d'ancrage `de` à `vers`
     bloc.tourner     { case }                 un quart de tour
     bloc.orienter    { case, sorte, sens }    remettre un meuble dans le sens `sens`
     mur.rehausser    { sorte, case }          un bloc de plus sur un mur (niveaux 1 et 2)
     mur.abaisser     { case, niveau?, attendu? } reprendre le bloc du dessus d'un mur
     etage.poser      { sorte, case }          sur l'étage d'une pièce
     etage.reprendre  { case, attendu? }
     etage.remettre   { case, avant, apres }   défaire un changement sur l'étage
     solEtage.poser   { sorte, case, niveau }  un sol aux niveaux 1 et 2
     solEtage.reprendre { case, niveau, attendu? }
     solEtage.remettre { case, niveau, avant, apres } défaire un sol changé pour un autre

   Les commandes du potager et de la nuit (sans inverse : une graine semée, une parcelle arrosée, une
   récolte, une nuit dormie ne se défont pas ; l'énergie dépensée non plus) :
     potager.planter  { parcelle, culture }    semer une parcelle (son identifiant), à la main
     potager.arroser  { parcelle }
     potager.recolter { parcelle }
     nuit.dormir      { }                       se coucher, la nuit (elle défile jusqu'au réveil)
*/

import { DATA } from './catalog.js';
import { fail } from './devices.js';
import {
  blocAt, blocDessus, casesCouvertes, deplacerBloc, hauteurPile, matiereDessus, poserBloc, rehausser,
  reprendreBloc, sensBloc, solAt, tournerBloc,
} from './blocs.js';
import { etageBlocs, poserEtage, poserSolEtage, reprendreEtage, reprendreSolEtage, solsEtage } from './etage.js';
import { harvest, plant, water } from './crops.js';
import { goToSleep } from './night.js';

const CHANGE = 'Ce qui était posé là a changé depuis.';

// Ce qui est sur la case `c` au sol : le bloc du dessus, le bloc, le sol (ce que reprend un appui).
export function surCase(state, c) {
  return blocDessus(state, c) || blocAt(state, c) || solAt(state, c) || null;
}
// La case d'ancrage du meuble qui couvre `c` (sinon `c`).
function ancreDe(state, c) {
  if (blocAt(state, c)) return c;
  const couvertes = casesCouvertes(state);
  return couvertes.has(c) ? couvertes.get(c) : c;
}

const cmd = (type, args) => ({ type, args });

// Les arguments : chaque commande dit ce qu'elle attend (« case » : une case, « sorte » : un bloc de
// l'Atelier, « sens » : 0 à 3, « niveau » : 1 ou 2, « texte » : un texte quelconque) ; un « ? » le rend
// facultatif.
const CONTROLES = {
  case: (v) => Number.isInteger(v) && v >= 0,
  sorte: (v) => typeof v === 'string' && !!DATA.ATELIER.BLOCS[v],
  sens: (v) => Number.isInteger(v) && v >= 0 && v <= 3,
  niveau: (v) => v === 1 || v === 2,
  texte: (v) => typeof v === 'string' && v.length > 0,
  culture: (v) => typeof v === 'string' && !!DATA.CULTURES[v],
};

export const COMMANDES = {
  'bloc.poser': {
    args: { sorte: 'sorte', case: 'case', sens: 'sens?' },
    executer(state, { sorte, case: c, sens = 0 }) {
      const b = DATA.ATELIER.BLOCS[sorte];
      const avant = surCase(state, c), sous = blocAt(state, c);
      // (la pompe sur un puits libre : posée dessus, le puits reste ; un bloc de silo sur le silo : la
      // colonne monte, rien à défaire)
      const surLibre = !!b.sur && sous === b.sur && !blocDessus(state, c);
      const empile = !!sous && sous === sorte && !!b.silo;
      const r = poserBloc(state, sorte, c, sens);
      if (!r.ok) return r;
      const inverses = empile ? []
        : avant && avant !== sorte && !surLibre ? [cmd('bloc.remettre', { case: c, avant, apres: sorte })]
          : [cmd('bloc.reprendre', { case: c, attendu: sorte })];
      return { ...r, inverses };
    },
  },
  'bloc.reprendre': {
    args: { case: 'case', attendu: 'sorte?' },
    executer(state, { case: c, attendu }) {
      const avant = surCase(state, c);
      if (attendu && avant !== attendu) return fail(CHANGE);
      const sensAvant = sensBloc(state, ancreDe(state, c));
      const r = reprendreBloc(state, c);
      if (!r.ok) return r;
      const sorte = r.sorte || avant;
      return { ...r, inverses: [cmd('bloc.poser', { sorte, case: r.case !== undefined ? r.case : c, sens: r.sens || sensAvant || 0 })] };
    },
  },
  'bloc.remettre': {
    args: { case: 'case', avant: 'sorte', apres: 'sorte' },
    executer(state, { case: c, avant, apres }) {
      if (surCase(state, c) !== apres) return fail(CHANGE);
      const r = reprendreBloc(state, c);
      if (!r.ok) return r;
      // (une fenêtre percée rend son mur d'elle-même ; sinon l'ancien bloc est reposé)
      if (surCase(state, c) !== avant) {
        const p = poserBloc(state, avant, c);
        if (!p.ok) { poserBloc(state, apres, c); return p; }
      }
      return { ok: true, sorte: avant, case: c, inverses: [cmd('bloc.poser', { sorte: apres, case: c })] };
    },
  },
  'bloc.deplacer': {
    args: { de: 'case', vers: 'case', attendu: 'sorte?' },
    executer(state, { de, vers, attendu }) {
      if (attendu && surCase(state, de) !== attendu) return fail(CHANGE);
      if (de === vers) return fail('Il est déjà là.');
      const r = deplacerBloc(state, de, vers);
      if (!r.ok) return r;
      return { ...r, inverses: [cmd('bloc.deplacer', { de: vers, vers: r.de, attendu: r.sorte })] };
    },
  },
  'bloc.tourner': {
    args: { case: 'case' },
    executer(state, { case: c }) {
      const sensAvant = sensBloc(state, ancreDe(state, c));
      const r = tournerBloc(state, c);
      if (!r.ok) return r;
      return { ...r, inverses: [cmd('bloc.orienter', { case: r.case, sorte: r.sorte, sens: sensAvant })] };
    },
  },
  // (tournerBloc saute un sens où le meuble ne tient pas : au plus trois quarts de tour)
  'bloc.orienter': {
    args: { case: 'case', sorte: 'sorte', sens: 'sens' },
    executer(state, { case: c, sorte, sens }) {
      if (blocAt(state, c) !== sorte) return fail(CHANGE);
      const avant = sensBloc(state, c);
      for (let k = 0; k < 3 && sensBloc(state, c) !== sens; k++) if (!tournerBloc(state, c).ok) break;
      if (sensBloc(state, c) !== sens) return fail(`${DATA.ATELIER.BLOCS[sorte].nom} : pas la place de le tourner ici.`);
      return { ok: true, sorte, case: c, sens, inverses: [cmd('bloc.orienter', { case: c, sorte, sens: avant })] };
    },
  },
  'mur.rehausser': {
    args: { sorte: 'sorte', case: 'case' },
    executer(state, { sorte, case: c }) {
      const r = rehausser(state, sorte, c);
      if (!r.ok) return r;
      return { ...r, inverses: [cmd('mur.abaisser', { case: c, attendu: r.sorte || sorte })] };
    },
  },
  'mur.abaisser': {
    args: { case: 'case', niveau: 'niveau?', attendu: 'sorte?' },
    executer(state, { case: c, niveau, attendu }) {
      if (niveau && hauteurPile(state, c) !== niveau + 1) return fail(`Niveau ${niveau} : la gomme reprend le bloc du dessus des murs hauts de ${niveau + 1} blocs.`);
      if (attendu && !(hauteurPile(state, c) > 1 && matiereDessus(state, c) === attendu)) return fail(CHANGE);
      const r = reprendreBloc(state, c);
      if (!r.ok) return r;
      return { ...r, inverses: [cmd('mur.rehausser', { sorte: r.sorte, case: c })] };
    },
  },
  'etage.poser': {
    args: { sorte: 'sorte', case: 'case' },
    executer(state, { sorte, case: c }) {
      const avant = etageBlocs(state)[c];
      const r = poserEtage(state, sorte, c);
      if (!r.ok) return r;
      return { ...r, inverses: [avant && avant !== sorte ? cmd('etage.remettre', { case: c, avant, apres: sorte }) : cmd('etage.reprendre', { case: c, attendu: sorte })] };
    },
  },
  'etage.reprendre': {
    args: { case: 'case', attendu: 'sorte?' },
    executer(state, { case: c, attendu }) {
      const avant = etageBlocs(state)[c];
      if (attendu && avant !== attendu) return fail(CHANGE);
      const r = reprendreEtage(state, c);
      if (!r.ok) return r;
      return { ...r, inverses: [cmd('etage.poser', { sorte: r.sorte || avant, case: c })] };
    },
  },
  'etage.remettre': {
    args: { case: 'case', avant: 'sorte', apres: 'sorte' },
    executer(state, { case: c, avant, apres }) {
      if (etageBlocs(state)[c] !== apres) return fail(CHANGE);
      const r = reprendreEtage(state, c);
      if (!r.ok) return r;
      if (etageBlocs(state)[c] !== avant) {
        const p = poserEtage(state, avant, c);
        if (!p.ok) { poserEtage(state, apres, c); return p; }
      }
      return { ok: true, sorte: avant, case: c, etage: true, inverses: [cmd('etage.poser', { sorte: apres, case: c })] };
    },
  },
  'solEtage.poser': {
    args: { sorte: 'sorte', case: 'case', niveau: 'niveau' },
    executer(state, { sorte, case: c, niveau }) {
      const avant = solsEtage(state, niveau)[c];
      const r = poserSolEtage(state, sorte, c, niveau);
      if (!r.ok) return r;
      return { ...r, inverses: [avant && avant !== sorte ? cmd('solEtage.remettre', { case: c, niveau, avant, apres: sorte }) : cmd('solEtage.reprendre', { case: c, niveau, attendu: sorte })] };
    },
  },
  'solEtage.reprendre': {
    args: { case: 'case', niveau: 'niveau', attendu: 'sorte?' },
    executer(state, { case: c, niveau, attendu }) {
      const avant = solsEtage(state, niveau)[c];
      if (attendu && avant !== attendu) return fail(CHANGE);
      const r = reprendreSolEtage(state, c, niveau);
      if (!r.ok) return r;
      return { ...r, inverses: [cmd('solEtage.poser', { sorte: r.sorte || avant, case: c, niveau })] };
    },
  },
  'solEtage.remettre': {
    args: { case: 'case', niveau: 'niveau', avant: 'sorte', apres: 'sorte' },
    executer(state, { case: c, niveau, avant, apres }) {
      if (solsEtage(state, niveau)[c] !== apres) return fail(CHANGE);
      // (un sol posé sur un autre prend sa place : l'ancien, reposé, reprend la sienne)
      const r = poserSolEtage(state, avant, c, niveau);
      if (!r.ok) return r;
      return { ok: true, sorte: avant, case: c, sol: true, inverses: [cmd('solEtage.poser', { sorte: apres, case: c, niveau })] };
    },
  },
  'potager.planter': {
    args: { parcelle: 'texte', culture: 'culture' },
    executer: (state, { parcelle, culture }) => plant(state, parcelle, culture),
  },
  'potager.arroser': {
    args: { parcelle: 'texte' },
    executer: (state, { parcelle }) => water(state, parcelle),
  },
  'potager.recolter': {
    args: { parcelle: 'texte' },
    executer: (state, { parcelle }) => harvest(state, parcelle),
  },
  'nuit.dormir': {
    args: {},
    executer: (state) => goToSleep(state),
  },
};

// La commande `c` est-elle bien formée ? null si oui, sinon la raison.
export function commandeInvalide(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return 'Commande illisible.';
  const def = COMMANDES[c.type];
  if (!def) return `Commande inconnue : ${String(c.type)}.`;
  const args = c.args;
  if (!args || typeof args !== 'object' || Array.isArray(args)) return `${c.type} : arguments illisibles.`;
  for (const k of Object.keys(args)) if (!(k in def.args)) return `${c.type} : argument inconnu « ${k} ».`;
  for (const [k, genre] of Object.entries(def.args)) {
    const facultatif = genre.endsWith('?'), g = facultatif ? genre.slice(0, -1) : genre;
    if (args[k] === undefined || args[k] === null) { if (facultatif) continue; return `${c.type} : il manque « ${k} ».`; }
    if (!CONTROLES[g](args[k])) return `${c.type} : « ${k} » invalide.`;
  }
  return null;
}

// Joue la commande sur la partie (voir l'en-tête). Une commande mal formée ne touche à rien.
export function executerCommande(state, c) {
  const err = commandeInvalide(c);
  const id = c && typeof c === 'object' ? c.id : undefined;
  if (err) return { ...fail(err), id };
  const args = Object.fromEntries(Object.entries(c.args).filter(([, v]) => v !== undefined && v !== null));
  const r = COMMANDES[c.type].executer(state, args);
  return r.ok ? { ...r, id, inverses: r.inverses || [] } : { ...r, id };
}

// Défait une opération : les inverses de ses commandes, notés dans l'ordre où elles ont été jouées,
// joués de la dernière à la première. Combien ont réussi.
export function defaire(state, inverses) {
  let n = 0;
  for (const c of [...inverses].reverse()) if (executerCommande(state, c).ok) n += 1;
  return n;
}

/* ---------- l'empreinte d'une partie (F0-4 : le rejeu, plus tard le contrôle client/serveur) ----------
   Deux exécutions de la même suite de commandes sur la même partie de départ doivent donner la même
   partie. L'empreinte le vérifie en peu de place : elle lit la partie sous sa forme JSON, les clés des
   objets triées (l'ordre dans lequel un objet a reçu ses clés ne compte pas), un objet vide compté
   comme absent (le moteur crée certains tableaux en passant, `hauteurs: {}`, et lit un tableau
   absent comme vide), et en fait 16 chiffres
   hexadécimaux (deux FNV-1a de 32 bits, de graines différentes). Deux parties égales ont la même
   empreinte ; deux parties différentes, presque sûrement deux empreintes différentes. */

// La valeur `v` (déjà passée par JSON) avec les clés de ses objets triées, à toute profondeur, sans
// les objets vides.
const objetVide = (v) => !!v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length;
function triee(v) {
  if (Array.isArray(v)) return v.map(triee);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).sort()) {
      const t = triee(v[k]);
      if (!objetVide(t)) o[k] = t;
    }
    return o;
  }
  return v;
}

export function empreintePartie(state) {
  const texte = JSON.stringify(triee(JSON.parse(JSON.stringify(state))));
  let a = 0x811c9dc5, b = 0x01000193 ^ 0x9e3779b9;
  for (let i = 0; i < texte.length; i++) {
    const c = texte.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x01000193) ^ (b >>> 15);
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}
