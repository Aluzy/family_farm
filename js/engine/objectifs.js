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

/* ---------- les objectifs du jour (la refonte du didacticiel, lot 2) ----------
   Une nouvelle partie (commencerObjectifs) commence dans son abri (abri-depart.js) avec la première semaine
   d'objectifs (DATA.OBJECTIFS.SEMAINE) : chaque jour, deux ou trois objectifs, chacun ses tâches. Une tâche
   « etat » (quoi : ce qui doit être vrai : l'Atelier posé, la houe, le puits…) reste faite une fois atteinte ;
   une tâche « compte » compte ce qui est fait depuis le début du jour (objectifs-compte.js : noterObjectif).
   Le jour fini (majObjectifs, à chaque rendu), sa récompense (XP, pièces, objets) ; le suivant commence le
   lendemain matin. Un jour pas fini reste : on avance à son rythme.

   state.objectifs = { jour (l'indice dans SEMAINE), debut (le jour du jeu où il a commencé), faits ({ quoi: n },
   objectifs-compte.js), atteints ([quoi] : les états atteints), base ({ pris : les prises du monde au début du
   jour }), recu (le jour du jeu où sa récompense a été donnée, ou null), fini (la semaine est faite) }.
   Une partie d'avant (state.didacticiel) n'en a pas : elle garde son didacticiel. Voir docs/didacticiel.md. */

const SEMAINE = () => DATA.OBJECTIFS.SEMAINE;
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

export function objectifsActifs(state) {
  return !!(state.objectifs && !state.objectifs.fini);
}

// Une nouvelle partie : son abri, ses pièces de départ, et le premier jour d'objectifs.
export function commencerObjectifs(state) {
  state.pieces = DATA.DEPART.PIECES_SAUVAGE;
  if (state.aide) state.aide.fini = true;
  batirAbriDepart(state);
  state.objectifs = { jour: -1, debut: state.day, faits: {}, atteints: [], base: {}, recu: null, fini: false };
  entrer(state, 0);
  return { ok: true };
}

// Arriver au jour `k` de la semaine : ses compteurs repartent de zéro, ce qu'il offre est donné.
function entrer(state, k) {
  const o = state.objectifs;
  o.jour = k; o.debut = state.day; o.faits = {}; o.atteints = []; o.base = { pris: prises(state) }; o.recu = null;
  const J = SEMAINE()[k];
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
  const o = state.objectifs, J = SEMAINE()[o.jour];
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
    fait: faits === objectifs.length, attente: o.recu !== null,
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
  const o = state.objectifs, J = SEMAINE()[o.jour];
  if (!J) { o.fini = true; return null; }
  if (o.recu !== null) {
    if (state.day <= o.recu) return null;
    if (o.jour + 1 >= SEMAINE().length) { o.fini = true; return { fin: true }; }
    entrer(state, o.jour + 1);
    return { nouveau: o.jour + 1 };
  }
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
  if (!(k >= 1 && k <= SEMAINE().length)) return fail('Ce jour n\'existe pas.');
  state.objectifs.fini = false;
  entrer(state, k - 1);
  return { ok: true };
}
