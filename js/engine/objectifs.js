import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { addItem } from './inventory.js';
import { gainXp } from './levels.js';
import { atelierConstruit } from './atelier.js';
import { blocsPoses } from './blocs.js';
import { hasHoe } from './crops.js';
import { aCruche, puitsPose } from './cruche.js';
import { offrirSac } from './equipement.js';
import { butBoussole } from './monde-vu.js';
import { hameauxVus } from './monde-hameaux.js';
import { horsDeLaFerme } from './didacticiel.js';
import { batirAbriDepart } from './abri-depart.js';
import { mulberry32 } from './base.js';
import { hache } from './ferme-generee.js';
import { farmSeed } from './terrain.js';
import { marcheOuvert } from './devices.js';
import { hasTool } from './outils.js';
import { cowCount } from './animals.js';
import { villageActif } from './village.js';
import { commencerNouveauDepart } from './depart-ile.js';

/* ---------- les objectifs du jour (la refonte du didacticiel, lot 2) ----------
   Une nouvelle partie (commencerObjectifs) commence dans son abri (abri-depart.js) avec la première semaine
   d'objectifs (DATA.OBJECTIFS.SEMAINE) : chaque jour, deux ou trois objectifs, chacun ses tâches. Une tâche
   « etat » (quoi : ce qui doit être vrai : l'Atelier posé, la houe, le puits…) reste faite une fois atteinte ;
   une tâche « compte » compte ce qui est fait depuis le début du jour (objectifs-compte.js : noterObjectif).
   Le jour fini (majObjectifs, à chaque rendu), sa récompense (XP, pièces, objets) ; le suivant commence le
   lendemain matin. Un jour pas fini reste : on avance à son rythme. Après la semaine (lot 3), chaque jour tire
   ses objectifs (DATA.OBJECTIFS.TIRES : parmi ceux que la partie peut faire, à la mesure de son niveau ; un
   peut se changer par jour : changerObjectif), et sa récompense grandit avec le niveau.

   state.objectifs = { jour (l'indice dans SEMAINE), debut (le jour du jeu où il a commencé), faits ({ quoi: n },
   objectifs-compte.js), atteints ([quoi] : les états atteints), base ({ pris : les prises du monde au début du
   jour }), recu (le jour du jeu où sa récompense a été donnée, ou null), tire (après la semaine : le jour tiré,
   { titre, intro, recompense, objectifs }), changes (les objectifs changés aujourd'hui) }.
   Une partie d'avant (state.didacticiel) n'en a pas : elle garde son didacticiel. Voir docs/didacticiel.md.

   Le chantier « l'île à bâtir » allumé (villageActif, fiche I7a) : la semaine est celle du nouveau départ
   (DATA.VILLAGE.OBJECTIFS.SEMAINE : sans phrase d'ambiance, ni hameau ni calèche) et les objectifs tirés gagnent
   ceux du port et du village (DATA.VILLAGE.OBJECTIFS.TIRES.LISTE, ajoutés à la liste ; une entrée de même id
   remplace celle d'avant). */

const ileObjectifs = (state) => (villageActif(state) && DATA.VILLAGE && DATA.VILLAGE.OBJECTIFS) || null;
export function semaineDe(state) {
  const I = ileObjectifs(state);
  return (I && Array.isArray(I.SEMAINE) && I.SEMAINE) || DATA.OBJECTIFS.SEMAINE;
}
const SEMAINE = (state) => semaineDe(state);
const prises = (state) => Object.keys((state.monde && state.monde.pris) || {}).length;

// Les états qu'une tâche « etat » peut demander : vrai quand c'est fait.
const ETATS = {
  atelier: (s) => atelierConstruit(s),
  houe: (s) => hasHoe(s),
  faux: (s) => !!(s.outils && s.outils.faux),
  hache: (s) => !!(s.outils && s.outils.hache),
  pioche: (s) => !!(s.outils && s.outils.pioche),
  puits: (s) => puitsPose(s),
  cruche: (s) => aCruche(s),
  cuisiniere: (s) => Object.values(blocsPoses(s)).includes('cuisiniere'),
  sortie: (s) => horsDeLaFerme(s),
  prise_monde: (s) => prises(s) > ((s.objectifs.base && s.objectifs.base.pris) || 0),
  boussole_hameau: (s) => { const b = butBoussole(s); return !!(b && b.sorte === 'hameau'); },
  hameau: (s) => Object.keys(hameauxVus(s)).length > 0,
};
export const ETATS_OBJECTIFS = Object.keys(ETATS);

// (une partie du lot 2 qui avait fini sa semaine, « fini » : elle passe aux objectifs tirés, majObjectifs)
export function objectifsActifs(state) {
  return !!state.objectifs;
}

/* -- après la première semaine (lot 3) : les objectifs tirés chaque jour (DATA.OBJECTIFS.TIRES) -- */

const TIRES = () => DATA.OBJECTIFS.TIRES;
const niveau = (state) => Math.max(1, (state.progression && state.progression.niveau) || 1);

// Ce qu'un objectif tiré demande d'avoir (si) : vrai quand la partie peut le faire.
const SI = {
  houe: (s) => hasHoe(s),
  puits: (s) => puitsPose(s),
  faux: (s) => hasTool(s, 'faux'),
  hache: (s) => hasTool(s, 'hache'),
  pioche: (s) => hasTool(s, 'pioche'),
  canne: (s) => hasTool(s, 'canne'),
  cuisiniere: (s) => Object.values(blocsPoses(s)).includes('cuisiniere'),
  marche: (s) => marcheOuvert(s),
  poules: (s) => !!(s.poulailler && s.poulailler.poules > 0),
  vaches: (s) => cowCount(s) > 0,
  hameau: (s) => Object.keys(hameauxVus(s)).length > 0,
  // le chantier « l'île à bâtir » (fiche I7a), lus de façon défensive : un villageois installé (state.villageois,
  // fiche I3a), une commande du bac en cours (state.port.commandes, fiche I1c)
  villageois: (s) => Array.isArray(s.villageois) && s.villageois.some((v) => v && typeof v === 'object'),
  bac: (s) => !!(s.port && typeof s.port === 'object' && Array.isArray(s.port.commandes) && s.port.commandes.length > 0),
};
export const SI_OBJECTIFS = Object.keys(SI);

// La liste des objectifs qui se tirent : celle d'OBJECTIFS.TIRES, et le chantier allumé, celle du port et du
// village (une entrée de même id remplace celle d'avant, à sa place ; les autres s'ajoutent à la fin).
// (fiche I7e : sur l'île, ce qui se fait dans un hameau — `si: 'hameau'` — sort de la liste : elle n'en a pas)
export function listeTiree(state) {
  const I = ileObjectifs(state), L = TIRES().LISTE;
  const ile = (I && I.TIRES && Array.isArray(I.TIRES.LISTE) && I.TIRES.LISTE) || [];
  if (!ile.length) return L;
  const parId = new Map(ile.map((d) => [d.id, d]));
  return [...L.map((d) => parId.get(d.id) || d), ...ile.filter((d) => !L.some((x) => x.id === d.id))].filter((d) => d.si !== 'hameau');
}

// Les objectifs de la liste que la partie peut faire aujourd'hui.
export function objectifsPossibles(state) {
  return listeTiree(state).filter((d) => !d.si || (SI[d.si] && SI[d.si](state)));
}

// L'objectif tiré `d` à ce niveau : { id, icone, libelle, sous, taches: [une tâche « compte »] }.
function objectifTire(state, d) {
  const [base, par, max] = d.n;
  const n = Math.max(1, Math.min(max, Math.round(base + par * (niveau(state) - 1))));
  return { id: d.id, icone: d.icone, libelle: d.libelle.replace('{n}', String(n)).replace('{s}', n > 1 ? 's' : ''), sous: '', taches: [{ type: 'compte', quoi: d.quoi, n, guide: d.guide }] };
}

// Tire `nombre` objectifs (sans ceux de `sauf`, leurs id) : la graine de la partie, le jour, `sel`.
function tirer(state, nombre, sauf = [], sel = '') {
  const r = mulberry32(hache(`${farmSeed(state) || 'ferme'}:objectifs:${state.day}:${sel}`));
  const liste = objectifsPossibles(state).filter((d) => !sauf.includes(d.id));
  const out = [];
  while (out.length < nombre && liste.length) out.push(objectifTire(state, liste.splice(Math.floor(r() * liste.length), 1)[0]));
  return out;
}

// La récompense d'un jour tiré, à ce niveau : { xp, pieces }.
function recompenseTiree(state) {
  const R = TIRES().RECOMPENSE, n = niveau(state) - 1;
  return { xp: Math.round(R.xp[0] + R.xp[1] * n), pieces: Math.round(R.pieces[0] + R.pieces[1] * n) };
}

// Le jour en cours : celui de la semaine, ou le jour tiré (state.objectifs.tire) ; null.
function jourDef(state) {
  const o = state.objectifs;
  return SEMAINE(state)[o.jour] || o.tire || null;
}

// Changer l'objectif `id` du jour tiré (TIRES.CHANGER fois par jour) : un autre est tiré à sa place.
export function changerObjectif(state, id) {
  const o = state.objectifs;
  if (!o || !o.tire) return fail('Les objectifs de la première semaine ne se changent pas.');
  if (o.recu !== null) return fail('La journée est déjà faite.');
  if ((o.changes || 0) >= TIRES().CHANGER) return fail('Tu as déjà changé un objectif aujourd\'hui.');
  const i = o.tire.objectifs.findIndex((b) => b.id === id);
  if (i < 0) return fail('Cet objectif n\'est pas au carnet.');
  const [nouveau] = tirer(state, 1, o.tire.objectifs.map((b) => b.id), `change${o.changes || 0}`);
  if (!nouveau) return fail('Il n\'y a pas d\'autre objectif à tirer pour l\'instant.');
  o.tire.objectifs[i] = nouveau;
  o.changes = (o.changes || 0) + 1;
  return { ok: true, objectif: nouveau };
}

// Peut-on encore changer un objectif aujourd'hui ?
export function changementPossible(state) {
  const o = state.objectifs;
  return !!(o && o.tire && o.recu === null && (o.changes || 0) < TIRES().CHANGER);
}

// Une nouvelle partie : son abri, ses pièces de départ, et le premier jour d'objectifs.
export function commencerObjectifs(state) {
  state.pieces = DATA.DEPART.PIECES_SAUVAGE;
  if (state.aide) state.aide.fini = true;
  batirAbriDepart(state);
  state.objectifs = { jour: -1, debut: state.day, faits: {}, atteints: [], base: {}, recu: null, fini: false };
  entrer(state, 0);
  // (le chantier allumé, fiche I7b : le nouveau départ, la terre vierge, le plat dans l'abri, le didacticiel de l'île)
  if (villageActif(state) && !state.didacticielIle) commencerNouveauDepart(state);
  return { ok: true };
}

// Arriver au jour `k` de la semaine : ses compteurs repartent de zéro, ce qu'il offre est donné.
function entrer(state, k) {
  const o = state.objectifs;
  o.jour = k; o.debut = state.day; o.faits = {}; o.atteints = []; o.base = { pris: prises(state) }; o.recu = null; o.changes = 0;
  // (après la semaine : les objectifs tirés du jour)
  o.tire = k >= SEMAINE(state).length ? { titre: 'Les objectifs du jour', intro: '', recompense: recompenseTiree(state), objectifs: tirer(state, TIRES().NOMBRE) } : null;
  const J = SEMAINE(state)[k];
  for (const [item, n] of Object.entries((J && J.offre) || {})) {
    if (item === 'sac') offrirSac(state);
    else addItem(state, item, n);
  }
}

// Où en est la tâche `t` : { n, besoin, fait } (un état : 0 ou 1 sur 1).
function avancee(state, t) {
  const o = state.objectifs;
  if (t.type === 'etat') {
    const f = o.atteints.includes(t.quoi) || !!(ETATS[t.quoi] && ETATS[t.quoi](state));
    return { n: f ? 1 : 0, besoin: 1, fait: f };
  }
  const n = Math.min(t.n, (o.faits && o.faits[t.quoi]) || 0);
  return { n, besoin: t.n, fait: n >= t.n };
}

// Le carnet du jour en cours, pour l'interface : { jour (1, 2…), titre, intro, recompense, objectifs: [{ id,
// icone, libelle, sous, taches: [{ ...tâche, n, besoin, fait }], n, besoin, fait }], faits, total, fait,
// attente (fini, le suivant vient demain) } ; null sans objectifs.
export function carnetDuJour(state) {
  if (!objectifsActifs(state)) return null;
  const o = state.objectifs, J = jourDef(state);
  if (!J) return null;
  const objectifs = J.objectifs.map((b) => {
    const taches = b.taches.map((t) => ({ ...t, ...avancee(state, t) }));
    // (un objectif d'une seule tâche « compte » montre son compte ; sinon ses tâches faites sur leur nombre)
    const une = taches.length === 1 ? taches[0] : null;
    const n = une ? une.n : taches.filter((t) => t.fait).length, besoin = une ? une.besoin : taches.length;
    return { id: b.id, icone: b.icone, libelle: b.libelle, sous: b.sous || '', taches, n, besoin, fait: taches.every((t) => t.fait) };
  });
  const faits = objectifs.filter((b) => b.fait).length;
  return {
    jour: o.jour + 1, titre: J.titre, intro: J.intro || '', recompense: J.recompense || {}, objectifs, faits, total: objectifs.length,
    fait: faits === objectifs.length, attente: o.recu !== null, tire: !!o.tire, changer: changementPossible(state),
  };
}

// La première tâche à faire du jour (celle que « Montre-moi » montre) : { objectif, tache } ou null.
export function tacheAFaire(state) {
  const c = carnetDuJour(state);
  if (!c || c.fait) return null;
  for (const b of c.objectifs) for (const t of b.taches) if (!t.fait) return { objectif: b, tache: t };
  return null;
}

// Après chaque changement : les états atteints restent atteints ; le jour fini, sa récompense ; le lendemain
// matin, le jour suivant. → { recompense, jour, titre } quand un jour vient d'être fini, { nouveau: son numéro (1, 2…) } quand un
// jour commence, sinon null.
export function majObjectifs(state) {
  if (!objectifsActifs(state)) return null;
  const o = state.objectifs;
  // (une partie du lot 2 qui avait fini sa semaine : le jour suivant, tiré)
  if (o.fini) { o.fini = false; o.recu = Math.min(o.recu === null || o.recu === undefined ? state.day - 1 : o.recu, state.day - 1); }
  if (o.recu !== null && o.recu !== undefined) {
    if (state.day <= o.recu) return null;
    entrer(state, o.jour + 1);
    return { nouveau: o.jour + 1 };
  }
  const J = jourDef(state);
  if (!J) { entrer(state, o.jour); return null; }
  for (const b of J.objectifs) for (const t of b.taches) {
    if (t.type === 'etat' && !o.atteints.includes(t.quoi) && ETATS[t.quoi] && ETATS[t.quoi](state)) o.atteints.push(t.quoi);
  }
  const c = carnetDuJour(state);
  if (!c.fait) return null;
  o.recu = state.day;
  const R = J.recompense || {};
  if (R.xp) gainXp(state, R.xp);
  if (R.pieces) state.pieces = (state.pieces || 0) + R.pieces;
  for (const [item, n] of Object.entries(R.objets || {})) addItem(state, item, n);
  return { recompense: R, jour: o.jour + 1, titre: J.titre };
}

// Pour les essais et le mode test : passer au jour `k` (1, 2…) de la semaine.
export function allerAuJourObjectifs(state, k) {
  if (!state.objectifs) return fail('Pas d\'objectifs du jour.');
  if (!(k >= 1)) return fail('Ce jour n\'existe pas.');
  state.objectifs.fini = false;
  entrer(state, k - 1);
  return { ok: true };
}
