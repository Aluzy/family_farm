import { DATA, roundPct } from './catalog.js';
import { EPS, unlockTab } from './base.js';
import { canPay, fail, NO_COINS, spend } from './devices.js';
import { isAutomated } from './automation.js';
import { chapterReached } from './campaign.js';
import { soilCap, soilCount } from './crops.js';
import { countItem, takeItem } from './inventory.js';

/* ---------- Lot 7 : arbre des technologies (v2) ---------- */

// state.technologies = liste des identifiants de nœuds acquis. On ignore les
// identifiants inconnus (sauvegarde importée d'une autre version).
//
// Ces fonctions sont appelées des dizaines de fois par tick : on garde, pour chaque
// liste, les nœuds connus (Set) et leurs effets rangés par clé, recalculés dès que la
// liste change (buyTech et grantTech la complètent, une migration la remplace, un test
// peut y pousser directement) : la copie gardée de la liste (sig) le détecte.
const techCache = new WeakMap();
const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
function techIndex(state) {
  const list = state.technologies;
  if (!Array.isArray(list)) return null;
  let c = techCache.get(list);
  if (c && c.noeuds === DATA.techtree.noeuds && sameList(c.sig, list)) return c;
  const noeuds = DATA.techtree.noeuds;
  const owned = list.filter((id) => noeuds[id]);
  const effets = new Map();
  for (const id of owned) {
    const e = noeuds[id].effet;
    if (!e) continue;
    for (const [key, v] of Object.entries(e)) {
      if (v === undefined) continue;
      if (!effets.has(key)) effets.set(key, []);
      effets.get(key).push(v);
    }
  }
  c = { sig: list.slice(), noeuds, owned, set: new Set(owned), effets };
  techCache.set(list, c);
  return c;
}

export function ownedTechs(state) {
  const c = techIndex(state);
  return c ? c.owned.slice() : [];
}

export function hasTech(state, id) {
  const c = techIndex(state);
  return !!c && c.set.has(id);
}

// Effets acquis portant la clé `key` (dans l'ordre des nœuds acquis).
export function techEffects(state, key) {
  const c = techIndex(state);
  const list = c && c.effets.get(key);
  return list ? list.slice() : [];
}

// Effet en % : produit des % acquis, arrondi à chaque étape (100 = sans effet).
export function techPct(state, key) {
  return techEffects(state, key).reduce((m, pct) => roundPct(m, pct), 100);
}

// Effet additif (+1 nuit, +1 graine…) : somme des valeurs acquises.
export function techSum(state, key) {
  return techEffects(state, key).reduce((t, v) => t + v, 0);
}

// Effet présent (booléen ou objet de réglage) : la dernière valeur acquise, ou null.
export function techFlag(state, key) {
  const list = techEffects(state, key);
  return list.length ? list[list.length - 1] : null;
}

// Automatisation d'une tâche ('arrosage', 'recolte', 'semis', 'nourrissage',
// 'tonte') sur un lieu ('potager', 'serre', 'poulailler', 'paturage').
export function techAuto(state, tache, lieu) {
  return techEffects(state, 'auto').some((a) => Array.isArray(a[tache]) && a[tache].includes(lieu));
}

// Temps de préparation en % : produit des paliers acquis (80 % puis 64 %).
export function prepTimeMult(state) {
  return techPct(state, 'tempsPrepa');
}

// Temps de préparation d'une recette avec les technologies actuelles, en
// secondes entières à vitesse 1 (arrondi à la seconde supérieure).
export function recipeTime(state, id) {
  return Math.ceil((DATA.recipes[id].temps * prepTimeMult(state)) / 100);
}

// Niveau d'un bâtiment (0 s'il n'est pas construit).
function buildingLevel(state, id) {
  if (id === 'pompe') return state.pompe.niveau;
  // version 1.6 : un seul panneau, une seule batterie ; le réservoir a ses niveaux
  if (id === 'panneau') return state.panneaux[0].niveau;
  if (id === 'batterie') return state.batteries[0].niveau;
  if (id === 'reservoir') return state.reservoir.niveau;
  const b = state[id];
  return b && b.construit ? b.niveau : 0;
}

// Un bâtiment, un atelier ou un appareil est-il construit ?
export function isBuilt(state, id) {
  if (state.stations && state.stations[id]) return !!state.stations[id].construit;
  if (['potager', 'pompe', 'panneau', 'batterie', 'reservoir'].includes(id)) return true;
  const b = state[id];
  return !!(b && b.construit);
}

// Chapitre en cours pour les paliers (au-delà du dernier une fois la campagne finie).
// (Sans campagne : le premier ; chapterReached, lui, y voit le mode libre.)
function techChapter(state) {
  return state.campagne ? chapterReached(state) : 1;
}

// Prérequis d'un nœud, palier compris : [{ ok, texte }].
export function techPrereqs(state, id) {
  const n = DATA.techtree.noeuds[id];
  const B = DATA.techtree.batiments;
  const palier = DATA.techtree.PALIERS[n.palier];
  const list = [{ ok: techChapter(state) >= palier.chapitre, texte: `📖 Palier ${n.palier} (${palier.nom}) : chapitre ${palier.chapitre}` }];
  for (const r of n.requiert) {
    if (r.batiment) {
      const b = B[r.batiment];
      list.push({ ok: buildingLevel(state, r.batiment) >= r.niveau, texte: `${b.icone} ${b.nom} niveau ${r.niveau}` });
    } else if (r.tuiles) {
      // version 1.9 : un nombre de tuiles de terre (à la place d'un niveau de la Zone de culture)
      list.push({ ok: soilCount(state) >= r.tuiles, texte: `🟫 ${r.tuiles} tuiles de terre` });
    } else if (r.construit) {
      const b = B[r.construit];
      list.push({ ok: isBuilt(state, r.construit), texte: `${b.icone} ${b.nom} construit` });
    } else {
      const m = DATA.techtree.noeuds[r.noeud];
      list.push({ ok: hasTech(state, r.noeud), texte: `${m.icone} ${m.nom}` });
    }
  }
  return list;
}

// 'acquis', 'disponible' (prérequis remplis) ou 'verrouille'.
export function techStatus(state, id) {
  if (hasTech(state, id)) return 'acquis';
  return techPrereqs(state, id).every((p) => p.ok) ? 'disponible' : 'verrouille';
}

// Points de technologie : { solde, gagnes, maitrise: [ids], libre, annonces }.
export function techPoints(state) {
  if (!state.pointsTech || typeof state.pointsTech !== 'object') state.pointsTech = newTechPoints();
  return state.pointsTech;
}

export function newTechPoints() {
  return { solde: 0, gagnes: 0, maitrise: [], libre: 0, annonces: [] };
}

// Crédite `n` PT ; `raison` est gardée pour l'annonce à l'interface.
export function grantTechPoints(state, n, raison) {
  if (!(n > 0)) return;
  const pt = techPoints(state);
  pt.solde += n;
  pt.gagnes += n;
  pt.annonces.push({ pt: n, raison });
}

// Les ressources d'un nœud (bois, pierre, lingots : n.ressources), avec ce qu'on en a :
// [{ item, qte, stock, ok }].
export function techResources(state, id) {
  const res = DATA.techtree.noeuds[id].ressources || {};
  return Object.entries(res).map(([item, qte]) => {
    const stock = Math.floor(countItem(state, item) + EPS);
    return { item, qte, stock, ok: stock >= qte };
  });
}

export function hasTechResources(state, id) {
  return techResources(state, id).every((r) => r.ok);
}

export function buyTech(state, id) {
  const n = DATA.techtree.noeuds[id];
  if (!n) return fail('Technologie inconnue.');
  if (hasTech(state, id)) return fail('Déjà acquise.');
  if (techStatus(state, id) !== 'disponible') return fail('Prérequis manquants.');
  const pt = techPoints(state);
  if (pt.solde < n.pt) return fail('Pas assez de points de technologie.');
  if (!canPay(state, n.cout)) return fail(NO_COINS);
  const manque = techResources(state, id).filter((r) => !r.ok);
  if (manque.length) return fail(`Il manque : ${manque.map((r) => `${r.qte - r.stock} ${DATA.items[r.item].icone} ${DATA.items[r.item].nom.toLowerCase()}`).join(', ')}.`);
  spend(state, n.cout, `Technologie : ${n.nom || id}`);
  for (const r of techResources(state, id)) takeItem(state, r.item, r.qte);
  pt.solde -= n.pt;
  if (!Array.isArray(state.technologies)) state.technologies = [];
  state.technologies.push(id);
  return { ok: true, cost: n.cout, pt: n.pt, ressources: n.ressources || {} };
}

// Valeur d'un jalon de maîtrise.
export function masteryValue(state, m) {
  const k = state.campagne ? state.campagne.compteurs : {};
  switch (m.compteur) {
    case 'litres': return Math.floor((k.eauMl || 0) / 1000);
    case 'plats': return Array.isArray(k.plats) ? k.plats.length : 0;
    case 'nuits': return Math.max(0, state.day - 1);
    default: return k[m.compteur] || 0;
  }
}

// Jalons de maîtrise atteints : 1 PT chacun, une seule fois.
export function checkMastery(state) {
  if (!state.campagne) return 0;
  const pt = techPoints(state);
  let n = 0;
  for (const m of DATA.techtree.POINTS.MAITRISE) {
    if (pt.maitrise.includes(m.id) || masteryValue(state, m) < m.cible) continue;
    pt.maitrise.push(m.id);
    grantTechPoints(state, 1, `Maîtrise : ${m.libelle}`);
    n++;
  }
  return n;
}

// Progression affichée dans une branche (les améliorations se font sur les
// cartes des bâtiments) : [{ cle, nom, icone, type, ... }].
export function techProgress(state, brancheId) {
  const branche = DATA.techtree.branches.find((b) => b.id === brancheId);
  return branche.suivi.map((cle) => {
    const def = DATA.techtree.suivi[cle];
    const e = { cle, nom: def.nom, icone: def.icone, type: def.type, note: def.note || null, max: DATA.LEVEL_MAX };
    if (def.type === 'niveau') {
      e.niveau = buildingLevel(state, cle);
      e.automatise = isAutomated(state, cle);
    } else if (def.type === 'tuiles') {
      // version 1.9 : la Zone de culture n'a plus de niveau : ses tuiles de terre
      // (Champ compris) sur le plafond du niveau du joueur
      e.tuiles = soilCount(state);
      e.max = Math.max(e.tuiles, soilCap(state));
      e.automatise = isAutomated(state, cle);
    } else {
      e.ateliers = Object.keys(DATA.STATIONS).map((id) => ({
        id, nom: DATA.STATIONS[id].nom, icone: DATA.STATIONS[id].icone, construit: !!(state.stations && state.stations[id].construit),
      }));
    }
    return e;
  });
}

// Première fois à SEUIL_PIECES pièces : l'onglet s'ajoute et ne disparaît plus.
export function refreshUnlocks(state) {
  const tab = DATA.TECHNO.ONGLET;
  if (state.pieces + EPS >= DATA.TECHNO.SEUIL_PIECES) unlockTab(state, tab);
}
