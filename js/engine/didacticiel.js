import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { addItem, countItem } from './inventory.js';
import { atelierOuvert } from './atelier.js';
import { blocsPoses, couchages, piecesCloses } from './blocs.js';
import { hasHoe, soilCount } from './crops.js';
import { aCruche, puitsPose } from './cruche.js';

/* ---------- le didacticiel d'une nouvelle partie ----------
   Une nouvelle partie (sur la ferme générée) commence par un didacticiel : une suite d'étapes
   (ETAPES), chacune une bulle de texte (js/ui/didacticiel.js), qui montre ce qu'il faut toucher.
   Les premières se lisent (« Suivant ») : les jauges, l'argent, le déplacement. Les autres ont un
   objectif : ramasser, poser l'Atelier, fabriquer, bâtir, cultiver ; quand il est atteint,
   l'étape suivante vient d'elle-même (majDidacticiel). Les compteurs (« 🪨 2 / 3 ») disent ce
   qu'il manque. Pendant le didacticiel, l'Atelier ne propose que les recettes déjà débloquées
   (recettesDidacticiel) et le menu Construire que les blocs utiles (blocsDidacticiel).
   state.didacticiel = { etape: indice dans ETAPES, fini, graines (offertes) } ; une ancienne
   partie n'en a pas : rien n'est caché. */

export const ETAPES = [
  'sante', 'endurance', 'bonheur', 'xp', 'autonomie', 'argent', 'deplacement',
  'pierres', 'bois', 'atelier', 'atelier_ouvrir', 'faux', 'fibres', 'outils',
  'abri_ressources', 'abri_fabriquer', 'abri_construire', 'paillasses',
  'houe', 'graines', 'labour', 'semis', 'puits', 'arroser', 'fin',
];

// Les étapes qui se lisent : on passe à la suivante avec « Suivant » (suivantDidacticiel).
// (atelier_ouvrir : l'interface la valide quand la fenêtre de l'Atelier s'ouvre)
const A_LIRE = new Set(['sante', 'endurance', 'bonheur', 'xp', 'autonomie', 'argent', 'deplacement', 'atelier_ouvrir', 'graines', 'fin']);

// Ce que chaque étape débloque, dès qu'on l'atteint : les recettes de l'Atelier, les blocs du
// menu Construire. (Après le didacticiel : tout.)
const RECETTES = { faux: ['faux'], outils: ['hache', 'pioche'], abri_fabriquer: ['planche', 'mur_bois', 'porte', 'paillasse'], houe: ['houe'], puits: ['puits_pierre', 'cruche'] };
const BLOCS = { atelier: ['atelier'], abri_construire: ['mur_bois', 'porte'], paillasses: ['paillasse'], puits: ['puits'] };

export function didacticielActif(state) {
  return !!(state.didacticiel && !state.didacticiel.fini && atelierOuvert(state));
}

// L'étape en cours (son nom), ou null.
export function etapeDidacticiel(state) {
  if (!didacticielActif(state)) return null;
  return ETAPES[state.didacticiel.etape] || null;
}

// Une nouvelle partie : le didacticiel commence (les anciennes bulles d'aide n'ont plus lieu).
export function commencerDidacticiel(state) {
  state.didacticiel = { etape: 0, fini: false };
  if (state.aide) state.aide.fini = true;
  return { ok: true };
}

/* -- l'abri : une pièce de 1 case de profondeur, une paillasse par membre -- */

// Ce que demande l'abri : { murs, porte, paillasses } (des murs en bois : une rangée de N
// cases, N le nombre de membres, entourée de murs ; l'un d'eux devient la porte).
export function planAbri(state) {
  const n = Math.max(1, state.famille.membres.length);
  return { murs: 2 * n + 5, porte: 1, paillasses: n };
}

// Combien de `sorte` on a : en main et posés.
function possedes(state, sorte) {
  return countItem(state, sorte) + Object.values(blocsPoses(state)).filter((s) => s === sorte).length;
}

// Les matériaux qu'il reste à réunir pour l'abri, d'après ce qui est déjà fabriqué : { objet: n }.
function besoinAbri(state) {
  const p = planAbri(state), R = DATA.ATELIER.RECETTES;
  const murs = Math.max(0, p.murs - possedes(state, 'mur_bois'));
  const portes = Math.max(0, p.porte - possedes(state, 'porte'));
  const paill = Math.max(0, p.paillasses - possedes(state, 'paillasse'));
  const planches = Math.max(0, portes * R.porte.entrees.planche - countItem(state, 'planche'));
  return {
    bois: murs * R.mur_bois.entrees.bois + planches * R.planche.entrees.bois,
    fibre: paill * R.paillasse.entrees.fibre,
  };
}

// Les entrées des recettes `ids` dont l'outil manque encore : { objet: n }.
function besoinOutils(state, ids) {
  const out = {};
  for (const id of ids) {
    const r = DATA.ATELIER.RECETTES[id];
    const deja = r.outil === 'houe' ? hasHoe(state) : !!(state.outils && state.outils[r.outil]);
    if (deja) continue;
    for (const [o, n] of Object.entries(r.entrees)) out[o] = (out[o] || 0) + n;
  }
  return out;
}

const compte = (state, besoin) => Object.entries(besoin).filter(([, n]) => n > 0).map(([objet, n]) => ({ objet, n: countItem(state, objet), besoin: n }));
const atteint = (cs) => cs.every((c) => c.n >= c.besoin);

// L'objectif de l'étape en cours : { compteurs: [{ objet, n, besoin }], fait } ; null pour une
// étape à lire.
export function objectifDidacticiel(state) {
  const e = etapeDidacticiel(state);
  if (!e || A_LIRE.has(e)) return null;
  const C = DATA.ATELIER.CONSTRUCTION, poses = Object.values(blocsPoses(state));
  const R = DATA.ATELIER.RECETTES;
  switch (e) {
    case 'pierres': { const cs = compte(state, { pierre: C.pierre }); return { compteurs: cs, fait: atteint(cs) }; }
    case 'bois': { const cs = compte(state, { bois: C.bois }); return { compteurs: cs, fait: atteint(cs) }; }
    case 'atelier': return { compteurs: [], fait: poses.includes('atelier') };
    case 'faux': return { compteurs: compte(state, besoinOutils(state, ['faux'])), fait: !!(state.outils && state.outils.faux) };
    case 'fibres': {
      // celles de la hache, de la pioche et des paillasses
      const n = (R.hache.entrees.fibre || 0) + (R.pioche.entrees.fibre || 0) + planAbri(state).paillasses * R.paillasse.entrees.fibre;
      const cs = compte(state, { fibre: n });
      return { compteurs: cs, fait: atteint(cs) };
    }
    case 'outils': return { compteurs: compte(state, besoinOutils(state, ['hache', 'pioche'])), fait: !!(state.outils && state.outils.hache && state.outils.pioche) };
    case 'abri_ressources': { const cs = compte(state, besoinAbri(state)); return { compteurs: cs, fait: atteint(cs) }; }
    case 'abri_fabriquer': {
      const p = planAbri(state);
      const cs = [['mur_bois', p.murs], ['porte', p.porte], ['paillasse', p.paillasses]].map(([objet, n]) => ({ objet, n: possedes(state, objet), besoin: n }));
      return { compteurs: cs, fait: atteint(cs) };
    }
    case 'abri_construire': return { compteurs: [], fait: piecesCloses(state).length > 0 };
    case 'paillasses': {
      const n = planAbri(state).paillasses;
      return { compteurs: [{ objet: 'paillasse', n: Math.min(n, couchages(state).length), besoin: n }], fait: couchages(state).length >= n };
    }
    case 'houe': return { compteurs: compte(state, besoinOutils(state, ['houe'])), fait: hasHoe(state) };
    case 'labour': {
      const n = DATA.DIDACTICIEL.LABOURS;
      return { compteurs: [{ objet: 'terre', n: Math.min(n, soilCount(state)), besoin: n }], fait: soilCount(state) >= n };
    }
    case 'semis': return { compteurs: [], fait: state.potager.parcelles.some((p) => p.culture) };
    case 'puits': {
      const besoin = {};
      if (!puitsPose(state) && countItem(state, 'puits_pierre') < 1) for (const [o, n] of Object.entries(R.puits_pierre.entrees)) besoin[o] = (besoin[o] || 0) + n;
      if (!aCruche(state)) for (const [o, n] of Object.entries(R.cruche.entrees)) besoin[o] = (besoin[o] || 0) + n;
      return { compteurs: compte(state, besoin), fait: puitsPose(state) && aCruche(state) };
    }
    case 'arroser': return { compteurs: [], fait: state.potager.parcelles.some((p) => p.culture && p.arrose) };
    default: return { compteurs: [], fait: false };
  }
}

// Ce qui arrive en atteignant une étape (les graines offertes).
function entrer(state) {
  const d = state.didacticiel;
  if (ETAPES[d.etape] === 'graines' && !d.graines) {
    d.graines = true;
    for (const [item, n] of Object.entries(DATA.DIDACTICIEL.GRAINES)) addItem(state, item, n);
  }
}

// Après chaque changement : tant que l'objectif de l'étape est atteint, l'étape suivante.
// Renvoie vrai si l'étape a changé.
export function majDidacticiel(state) {
  let change = false;
  for (let k = 0; k < ETAPES.length && didacticielActif(state); k++) {
    const o = objectifDidacticiel(state);
    if (!o || !o.fait) break;
    avancer(state);
    change = true;
  }
  return change;
}

function avancer(state) {
  const d = state.didacticiel;
  d.etape += 1;
  if (d.etape >= ETAPES.length) { d.fini = true; return; }
  entrer(state);
}

// « Suivant » sur une étape à lire (ou `etape` : celle que l'interface valide, si c'est elle).
export function suivantDidacticiel(state, etape = null) {
  const e = etapeDidacticiel(state);
  if (!e) return fail('Le didacticiel est terminé.');
  if (etape && etape !== e) return fail('Ce n\'est pas l\'étape en cours.');
  if (!A_LIRE.has(e)) return fail('Fais d\'abord ce que demande la bulle.');
  avancer(state);
  majDidacticiel(state);
  return { ok: true, etape: etapeDidacticiel(state) };
}

// « Passer le didacticiel » : tout se débloque (les graines sont offertes quand même).
export function passerDidacticiel(state) {
  if (!didacticielActif(state)) return fail('Le didacticiel est terminé.');
  const d = state.didacticiel;
  if (!d.graines) { d.graines = true; for (const [item, n] of Object.entries(DATA.DIDACTICIEL.GRAINES)) addItem(state, item, n); }
  d.fini = true;
  return { ok: true };
}

// Ce que l'étape `e` et les précédentes ont débloqué dans `table`.
function debloques(state, table) {
  if (!didacticielActif(state)) return null;
  const k = state.didacticiel.etape, out = new Set();
  for (let i = 0; i <= k; i++) for (const id of table[ETAPES[i]] || []) out.add(id);
  return out;
}

// Les recettes de l'Atelier visibles (un Set), ou null : toutes.
export function recettesDidacticiel(state) {
  return debloques(state, RECETTES);
}

// Les blocs du menu Construire visibles (un Set), ou null : tous.
export function blocsDidacticiel(state) {
  return debloques(state, BLOCS);
}
