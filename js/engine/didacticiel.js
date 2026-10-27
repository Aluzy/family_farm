import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { addItem, countItem } from './inventory.js';
import { caseDepart } from './atelier.js';
import { blocAt, blocsPoses, caseBatissable, couchages, piecesCloses } from './blocs.js';
import { farmTerrain } from './terrain.js';
import { hasHoe, soilCount } from './crops.js';
import { aCruche, puitsPose } from './cruche.js';
import { marcheOuvert } from './devices.js';
import { absoluteHours } from './clock.js';
import { CALECHE, tourneeDe, etatCaleche } from './caleche.js';
import { hameauxVus } from './monde-hameaux.js';
import { butBoussole } from './monde-vu.js';
import { offrirSac } from './equipement.js';

/* ---------- le didacticiel d'une nouvelle partie ----------
   Une nouvelle partie (sur la ferme générée) commence par un didacticiel : une suite d'étapes
   (ETAPES), chacune une bulle de texte (js/ui/didacticiel.js), qui montre ce qu'il faut toucher.
   Les premières se lisent (« Suivant ») : les jauges, l'argent, le déplacement. Les autres ont un
   objectif : ramasser, poser l'Atelier, fabriquer, bâtir, cultiver ; quand il est atteint,
   l'étape suivante vient d'elle-même (majDidacticiel). Les compteurs (« 🪨 2 / 3 ») disent ce
   qu'il manque. Pendant le didacticiel, l'Atelier ne propose que les recettes déjà débloquées
   (recettesDidacticiel) et le menu Construire que les blocs utiles (blocsDidacticiel).
   state.didacticiel = { etape: indice dans ETAPES, fini, graines (offertes), sac (offert : fiche 11) } ; une ancienne
   partie n'en a pas : rien n'est caché.

   Fiche 9b : après la ferme, le grand monde (ETAPES_MONDE) : ouvrir la carte du monde (l'interface la
   valide quand elle s'ouvre), sortir de la ferme par son chemin (la case du personnage, state.monde.ici,
   hors de la ferme), prendre quelque chose dans le monde (state.monde.pris), rencontrer la calèche à
   10 h devant la ferme ou la héler (avant le niveau du Marché, où elle ne commerce pas encore : la
   toucher quand elle est arrêtée à côté, rencontreCaleche ; ensuite, lui vendre quelque chose), choisir
   un hameau sur la carte du monde pour la boussole (state.monde.but), puis y aller (state.monde.hameaux).
   Aucune ne bloque : chacune se passe (passerEtapeDidacticiel), et rien n'empêche de jouer pendant
   qu'elle attend (la calèche ne passe qu'une fois par jour). Ce qu'elles retiennent : d.ventes (les
   pièces gagnées à la calèche en arrivant à son étape), d.cocher (la calèche rencontrée), d.hameaux (les
   hameaux connus en arrivant à l'étape du hameau), d.but (le hameau choisi). La forme ne change pas :
   ces étapes sont avant « fin », et une partie qui était sur l'ancienne bulle de fin (le même indice)
   reprend à la première d'entre elles. */

export const ETAPES = [
  'sante', 'endurance', 'bonheur', 'xp', 'autonomie', 'argent', 'deplacement',
  'pierres', 'bois', 'atelier', 'atelier_ouvrir', 'faux', 'fibres', 'outils',
  'abri_ressources', 'arbres', 'abri_fabriquer', 'abri_construire', 'paillasses',
  'houe', 'graines', 'labour', 'semis', 'puits', 'arroser',
  // fiche 9b : le grand monde
  'carte', 'sortie', 'recolte_monde', 'caleche', 'hameau_choisir', 'hameau_aller',
  'fin',
];

// Les étapes du grand monde : elles se passent une à une (« Passer cette étape »).
export const ETAPES_MONDE = ['carte', 'sortie', 'recolte_monde', 'caleche', 'hameau_choisir', 'hameau_aller'];

// Les étapes qui se lisent : on passe à la suivante avec « Suivant » (suivantDidacticiel).
// (atelier_ouvrir : l'interface la valide quand la fenêtre de l'Atelier s'ouvre)
// (carte : l'interface la valide quand la carte du monde s'ouvre)
const A_LIRE = new Set(['sante', 'endurance', 'bonheur', 'xp', 'autonomie', 'argent', 'deplacement', 'atelier_ouvrir', 'arbres', 'graines', 'carte', 'fin']);

// Ce que chaque étape débloque, dès qu'on l'atteint : les recettes de l'Atelier, les blocs du
// menu Construire. (Après le didacticiel : tout.)
const RECETTES = { faux: ['faux'], outils: ['hache', 'pioche'], abri_fabriquer: ['planche', 'mur_bois', 'porte', 'paillasse'], houe: ['houe'], puits: ['puits_pierre', 'cruche'], carte: ['sac_petit'] };
const BLOCS = { atelier: ['atelier'], abri_construire: ['mur_bois', 'porte'], paillasses: ['paillasse'], puits: ['puits'] };

export function didacticielActif(state) {
  return !!(state.didacticiel && !state.didacticiel.fini);
}

// L'étape en cours (son nom), ou null.
export function etapeDidacticiel(state) {
  if (!didacticielActif(state)) return null;
  return ETAPES[state.didacticiel.etape] || null;
}

// Une nouvelle partie : le didacticiel commence (les anciennes bulles d'aide n'ont plus lieu),
// avec les pièces d'une terre sauvage (DEPART.PIECES_SAUVAGE).
export function commencerDidacticiel(state) {
  state.didacticiel = { etape: 0, fini: false };
  state.pieces = DATA.DEPART.PIECES_SAUVAGE;
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

// Où bâtir l'abri : le didacticiel allume ces cases sur la carte (étapes abri_construire et
// paillasses). Une rangée de N cases (N paillasses) entourée de murs : { murs: [cases],
// porte: case (au milieu du mur du bas), dedans: [cases] } ; null sans place. L'emplacement,
// choisi près de l'Atelier sur de l'herbe libre (sans herbe haute si possible), est gardé dans
// state.didacticiel.abri tant qu'il reste bâtissable (ce qui est déjà posé à sa place compte).
export function planAbriCases(state) {
  if (!state.didacticiel) return null;
  const T = farmTerrain(state), W = T.LARGEUR, n = planAbri(state).paillasses;
  const forme = (c, r) => {
    const murs = [], dedans = [];
    for (let dc = 0; dc < n + 2; dc++) { murs.push(r * W + c + dc); murs.push((r + 2) * W + c + dc); }
    murs.push((r + 1) * W + c, (r + 1) * W + c + n + 1);
    for (let k = 1; k <= n; k++) dedans.push((r + 1) * W + c + k);
    const porte = (r + 2) * W + c + 1 + Math.floor((n - 1) / 2);
    return { c, r, murs: murs.filter((t) => t !== porte), porte, dedans };
  };
  // une case du plan : libre, ou déjà ce qu'il y faut (un mur, la porte, une paillasse)
  const tenable = (t, voulu, herbe) => {
    const b = sorteDe(blocAt(state, t));
    if (b) return voulu === 'mur' ? !!(b.mur || b.porte) : voulu === 'porte' ? !!b.porte || !!b.mur : blocAt(state, t) === 'paillasse';
    return caseBatissable(state, t, { herbe });
  };
  const valable = (p, herbe) => p.murs.every((t) => tenable(t, 'mur', herbe)) && tenable(p.porte, 'porte', herbe)
    && p.dedans.every((t) => tenable(t, 'paillasse', herbe)) && caseBatissable(state, p.porte + W, { herbe: true });
  const g = state.didacticiel.abri;
  if (g && g.n === n) {
    const p = forme(g.c, g.r);
    if (valable(p, true)) return p;
  }
  // près de l'Atelier (sinon de la case de départ), en spirale
  const at = Object.entries(blocsPoses(state)).find(([, s]) => s === 'atelier');
  const o = at ? Number(at[0]) : caseDepart(T);
  const c0 = o % W, r0 = Math.floor(o / W);
  for (const herbe of [false, true]) {
    for (let d = 2; d <= 14; d++) {
      for (let dr = -d; dr <= d; dr++) {
        for (let dc = -d; dc <= d; dc++) {
          if (Math.max(Math.abs(dr), Math.abs(dc)) !== d) continue;
          const p = forme(c0 + dc, r0 + dr);
          if (p.c < 1 || p.r < 1 || p.c + n + 2 >= W || p.r + 4 >= T.HAUTEUR) continue;
          if (!valable(p, herbe)) continue;
          state.didacticiel.abri = { c: p.c, r: p.r, n };
          return p;
        }
      }
    }
  }
  return null;
}

// Les cases de l'abri qui restent à poser : [{ case, sorte }] (sorte : mur_bois, porte,
// paillasse), pour l'étape `etape` (abri_construire : murs et porte ; paillasses : les paillasses).
export function casesAbriAPoser(state, etape) {
  const p = planAbriCases(state);
  if (!p) return [];
  if (etape === 'paillasses') return p.dedans.filter((t) => blocAt(state, t) !== 'paillasse').map((t) => ({ case: t, sorte: 'paillasse' }));
  const out = p.murs.filter((t) => { const b = sorteDe(blocAt(state, t)); return !(b && (b.mur || b.porte)); }).map((t) => ({ case: t, sorte: 'mur_bois' }));
  if (blocAt(state, p.porte) !== 'porte') out.push({ case: p.porte, sorte: 'porte' });
  return out;
}

const sorteDe = (sorte) => DATA.ATELIER.BLOCS[sorte] || null;

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
    // fiche 9b : le grand monde (des compteurs à cocher : 0 / 1)
    case 'sortie': { const ok = horsDeLaFerme(state); return { compteurs: [{ objet: 'sortie', n: ok ? 1 : 0, besoin: 1 }], fait: ok }; }
    case 'recolte_monde': { const ok = Object.keys((state.monde && state.monde.pris) || {}).length > 0; return { compteurs: [{ objet: 'prise', n: ok ? 1 : 0, besoin: 1 }], fait: ok }; }
    case 'caleche': {
      const d = state.didacticiel, vendre = marcheOuvert(state);
      const ok = vendre ? ventesCaleche(state) > (d.ventes || 0) : !!d.cocher;
      return { compteurs: [{ objet: vendre ? 'vente' : 'cocher', n: ok ? 1 : 0, besoin: 1 }], fait: ok, vendre };
    }
    case 'hameau_choisir': { const b = butBoussole(state); const ok = !!(b && b.sorte === 'hameau'); return { compteurs: [], fait: ok }; }
    case 'hameau_aller': {
      const d = state.didacticiel, vus = hameauxVus(state);
      const ok = (d.but && !!vus[d.but]) || Object.keys(vus).length > (d.hameaux || 0);
      return { compteurs: [{ objet: 'hameau', n: ok ? 1 : 0, besoin: 1 }], fait: ok };
    }
    default: return { compteurs: [], fait: false };
  }
}

// Ce qui arrive en atteignant une étape : les graines offertes ; avant de sortir de la ferme (l'étape
// de la carte du monde), le premier sac à provisions, déjà porté et garni (fiche 11 : loin de la
// ferme, on ne mange que ce qu'il contient) ; ce qu'il faut retenir pour les étapes du monde (les
// ventes à la calèche jusque-là, les hameaux connus, le hameau choisi).
function entrer(state) {
  const d = state.didacticiel, e = ETAPES[d.etape];
  if (e === 'graines' && !d.graines) {
    d.graines = true;
    for (const [item, n] of Object.entries(DATA.DIDACTICIEL.GRAINES)) addItem(state, item, n);
  }
  if (e === 'carte') donnerSac(state);
  if (e === 'caleche') d.ventes = ventesCaleche(state);
  if (e === 'hameau_choisir') d.hameaux = Object.keys(hameauxVus(state)).length;
  if (e === 'hameau_aller') { const b = butBoussole(state); d.but = b && b.sorte === 'hameau' ? b.id : null; }
}

// Le premier sac à provisions, une fois (d.sac).
function donnerSac(state) {
  const d = state.didacticiel;
  if (d.sac) return;
  d.sac = true;
  offrirSac(state);
}

/* -- fiche 9b : le grand monde -- */

// Les pièces gagnées à la calèche depuis le début de la partie (campaign.js : calecheVentes).
const ventesCaleche = (state) => (state.campagne && state.campagne.compteurs && state.campagne.compteurs.calecheVentes) || 0;

// Le personnage est-il hors de la ferme (sa case : state.monde.ici, que la carte donne à chaque pas) ?
export function horsDeLaFerme(state) {
  const t = state.monde && state.monde.ici, T = farmTerrain(state), F = T.FERME;
  if (!F || !Number.isInteger(t)) return false;
  const c = t % T.LARGEUR, r = Math.floor(t / T.LARGEUR);
  return c < F.X || r < F.Y || c >= F.X + F.LARGEUR || r >= F.Y + F.HAUTEUR;
}

// L'étape de la calèche, avant le niveau du Marché : le personnage (sur la case `ou`) touche la calèche
// arrêtée à côté de lui (à un arrêt, ou hélée) : la rencontre est faite. → vrai si elle compte.
export function rencontreCaleche(state, ou) {
  if (etapeDidacticiel(state) !== 'caleche' || !Number.isInteger(ou)) return false;
  const tour = tourneeDe(state);
  if (!tour) return false;
  const e = etatCaleche(tour, absoluteHours(state), (state.caleche && state.caleche.haltes) || []);
  if (e.etat !== 'arret' && e.etat !== 'halte') return false;
  const dist = Math.hypot((ou % tour.W) + 0.5 - e.x, Math.floor(ou / tour.W) + 0.5 - e.y);
  if (dist > (e.etat === 'halte' ? CALECHE.HELER : CALECHE.PORTEE) + 1e-9) return false;
  state.didacticiel.cocher = true;
  return true;
}

// « Passer cette étape » : une étape du grand monde ne bloque jamais (la calèche est loin, la carte du
// monde ne s'affiche pas…).
export function passerEtapeDidacticiel(state) {
  const e = etapeDidacticiel(state);
  if (!e) return fail('Le didacticiel est terminé.');
  if (!ETAPES_MONDE.includes(e)) return fail('Cette étape ne se passe pas : fais ce que demande la bulle.');
  avancer(state);
  majDidacticiel(state);
  return { ok: true, etape: etapeDidacticiel(state) };
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
  donnerSac(state);
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
