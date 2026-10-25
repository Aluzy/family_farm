import { DATA } from './catalog.js';
import { countItem } from './inventory.js';
import { blocsDessusPoses, blocsPoses, piecesCloses, solsPoses } from './blocs.js';
import { allPlots } from './crops.js';
import { hasTool } from './outils.js';
import { levelReached } from './levels.js';
import { isUnlocked } from './campaign.js';
import { recipeUnlocked } from './kitchen.js';
import { ETAPES } from './didacticiel.js';
import { hameauxVus } from './monde-hameaux.js';

/* ---------- quand une page de l'encyclopédie se découvre ----------
   Chaque entrée de l'encyclopédie (encyclopedie_ferme_familiale.json) a sa liste
   « decouverte » : des conditions « sorte:valeur » ; la première remplie fait découvrir la page
   (js/engine/encyclopedie.js). Les sortes :
     depart              connue dès le début de la partie
     objet:<objet>       l'objet est dans l'inventaire ou au frigo, ou posé sur la carte (bloc)
     outil:<outil>       l'outil est à nous (houe, hache, faux, pioche, canne)
     culture:<culture>   la récolte, sa graine, ou une parcelle qui la porte
     recette:<recette>   la recette se lit dans le Livre de recette (débloquée, atelier construit)
     animal:<animal>     une poule, un mouton, une vache à la ferme
     famille:enfant      un enfant dans la famille ; famille:animal : un animal de compagnie
     construit:<bât.>    state[<bât.>].construit (silo, poulailler, paturage, serre, verger, frigo)
     didacticiel:<étape> le didacticiel a atteint l'étape (ou il est fini, ou la partie n'en a pas)
     carte:<carte>       la carte a été visitée (noterEncyclopedie, à l'arrivée ; grotte : la mine
                         ou une grotte de la montagne, grotte_monde : une grotte de la montagne)
     faune:<espèce>      une bête du grand monde a été vue (noterEncyclopedie, la première fois :
                         DATA.FAUNE.ESPECES, data/monde.json)
     hameau              un hameau du grand monde a été vu (state.monde.hameaux, monde-hameaux.js)
     onglet:<onglet>     l'onglet est ouvert (state.unlockedTabs)
     techno:<nœud>       la technologie est acquise ; technologies : un point de technologie gagné
     jour:<n>            la partie a atteint le jour n ; niveau:<n> : le niveau n
     piece_close         une pièce close sur la carte ; commerce : le commerce du niveau 10 ;
     courrier            une lettre reçue */

export const CARTES_ENCYCLOPEDIE = ['grotte', 'grotte_monde'];
const SEULES = ['depart', 'piece_close', 'commerce', 'courrier', 'technologies', 'hameau'];
const OUTILS = ['houe', 'hache', 'faux', 'pioche', 'canne'];
const ANIMAUX = ['poule', 'mouton', 'vache'];
const BATIMENTS = ['silo', 'poulailler', 'paturage', 'serre', 'verger', 'frigo'];

// L'objet `id` est-il posé sur la carte (un bloc, un sol, ce qui est posé sur un bloc) ?
function pose(state, id) {
  const B = DATA.ATELIER.BLOCS;
  for (const poses of [blocsPoses(state), solsPoses(state), blocsDessusPoses(state)]) {
    for (const sorte of Object.values(poses)) if (sorte === id || (B[sorte] && B[sorte].objet === id)) return true;
  }
  return false;
}

function objet(state, id) {
  return countItem(state, id) > 0 || !!(state.frigo && state.frigo.items && state.frigo.items[id] && state.frigo.items[id].length) || pose(state, id);
}

function animal(state, id) {
  if (id === 'poule') return !!(state.poulailler && state.poulailler.poules > 0);
  const p = state.paturage || {};
  const liste = id === 'mouton' ? p.moutons : p.vaches;
  return Array.isArray(liste) && liste.length > 0;
}

function etapeAtteinte(state, etape) {
  const d = state.didacticiel;
  if (!d || d.fini) return true;
  return d.etape >= ETAPES.indexOf(etape);
}

// La condition `cond` (« sorte:valeur ») est-elle remplie ? `evenements` : ce qui a été noté
// (les cartes visitées).
export function conditionRemplie(state, cond, evenements = {}) {
  const [sorte, v] = String(cond).split(':');
  switch (sorte) {
    case 'depart': return true;
    case 'objet': return objet(state, v);
    case 'outil': return hasTool(state, v);
    case 'culture': return objet(state, v) || objet(state, `graine_${v}`) || allPlots(state).some((p) => p.culture === v);
    case 'recette': {
      const r = DATA.RECETTES[v];
      return !!(r && recipeUnlocked(state, v) && state.stations && state.stations[r.station] && state.stations[r.station].construit);
    }
    case 'animal': return animal(state, v);
    case 'famille': {
      const f = state.famille || {};
      return v === 'enfant' ? (f.membres || []).some((m) => m.enfant) : (f.animaux || []).length > 0;
    }
    case 'construit': return !!(state[v] && state[v].construit);
    case 'didacticiel': return etapeAtteinte(state, v);
    case 'carte': return !!evenements[`carte:${v}`];
    case 'faune': return !!evenements[`faune:${v}`];
    case 'hameau': return Object.keys(hameauxVus(state)).length > 0;
    case 'onglet': return Array.isArray(state.unlockedTabs) && state.unlockedTabs.includes(v);
    case 'techno': return Array.isArray(state.technologies) && state.technologies.includes(v);
    case 'technologies': return !!((state.pointsTech && state.pointsTech.gagnes > 0) || (Array.isArray(state.technologies) && state.technologies.length));
    case 'jour': return state.day >= Number(v);
    case 'niveau': return levelReached(state) >= Number(v);
    case 'piece_close': return piecesCloses(state).length > 0;
    case 'commerce': return isUnlocked(state, 'commerce');
    case 'courrier': return Array.isArray(state.courrier) && state.courrier.length > 0;
    default: return false;
  }
}

// La condition `cond` est-elle bien écrite (sa sorte connue, sa valeur dans les données) ?
// Renvoie un message d'erreur, ou null. (scripts/build-encyclopedie.mjs)
export function erreurCondition(cond) {
  const [sorte, v, ...reste] = String(cond).split(':');
  if (reste.length) return `condition mal formée : ${cond}`;
  if (SEULES.includes(sorte)) return v === undefined ? null : `« ${sorte} » ne prend pas de valeur : ${cond}`;
  const ok = {
    objet: () => !!DATA.OBJETS[v],
    outil: () => OUTILS.includes(v),
    culture: () => !!DATA.CULTURES[v],
    recette: () => !!DATA.RECETTES[v],
    animal: () => ANIMAUX.includes(v),
    famille: () => v === 'enfant' || v === 'animal',
    construit: () => BATIMENTS.includes(v),
    didacticiel: () => ETAPES.includes(v),
    carte: () => CARTES_ENCYCLOPEDIE.includes(v),
    faune: () => !!(DATA.FAUNE && DATA.FAUNE.ESPECES && DATA.FAUNE.ESPECES[v]),
    onglet: () => typeof v === 'string' && v.length > 0,
    techno: () => !!DATA.ARBRE.noeuds[v],
    jour: () => Number(v) >= 1,
    niveau: () => Number(v) >= 1,
  }[sorte];
  if (!ok) return `sorte de condition inconnue : ${cond}`;
  return ok() ? null : `valeur inconnue : ${cond}`;
}
