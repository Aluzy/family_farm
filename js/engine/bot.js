import { caseEtal, envieDe, mettreALEtal, vendableALEtal } from './bourse.js';
import { DATA, dishPrice, ingredientOptions } from './catalog.js';
import { EPS } from './base.js';
import {
  allDevices, batteryCapacity, canPay, farmOpen, isBroken, isOwned, maintainDevice, needsService, panelOutput, pay, pumpFlow,
  repairDevice, starterOf, sunlitMs, tankCapacity, toggleDevice, upgradeCost, upgradeDevice, upgradeTank,
} from './devices.js';
import { awakeHours, awakeRequired } from './clock.js';
import { marcheOuvert } from './devices.js';
import { tick } from './energy.js';
import { addItem, countItem, expiringSoon, inventoryCounts, lotRank, lotsOf } from './inventory.js';
import { fridgeLevel, fridgeRate, fridgeUpgradeCost, moveAllToFridge, moveFromFridge, stockCount, upgradeFridge } from './fridge.js';
import { buyItem, buyPrice, isBuyable, sellableCount, sellPrice } from './market.js';
import { eatSnack } from './family.js';
import { boitePosee, depenserMembre, deposerBoite, jaugeMembre, mangeurs, repasStep, valeurAliment } from './repas.js';
import { actionCost, energyLevel, energyMax } from './stamina.js';
import { levelBlock } from './levels.js';
import { averageHappiness, dishHappiness } from './bonheur.js';
import {
  allPlots, cropProduct, harvest, hasHoe, hoe, hoeStatus, isArable, isMature, plant, plotAtTile, seedItem, seedStock,
  soilCount, water, waterCost,
} from './crops.js';
import {
  buyPasture, canFeedHen, cowCount, freeCowPlaces,
  coopCapacity, coopUpgradeCost, feedAllHens, freeSheepPlaces, hensToFeed, pastureCost, shear, sheepCount,
  strawNeed, strawStock, upgradePoulailler, wheatTotal, woolReady,
} from './animals.js';
import { harvestTree, ripeTrees } from './orchard.js';
import { millPending, recipeUnlocked, startMilling, startRecipe } from './kitchen.js';
import { buyTech, hasTech, techPoints, techResources, techStatus } from './techtree.js';
import {
  chapterCount, chapterProgress, chapterReached, cropUnlocked, isUnlocked, objectiveChapter, objectiveDef, plantableCropsFor,
  readMail, unreadMail,
} from './campaign.js';
import { isAutomated } from './automation.js';
import { grassCut, hasTool, scytheGrass } from './outils.js';
import { bottelerSansCarte } from './botteleuse.js';
import { chainesSansCarte } from './chaines.js';
import { sleep } from './night.js';
import { casesDuTerrain, farmSeed, farmTerrain } from './terrain.js';
import { createNewGame, houseRepaired, starterBlock } from './depart.js';
import { poserEtalLibre, testBatir, testLabourerSerre, testLocalCommerce, testMaisonVillageois } from './testmode.js';
import { commerceOuvertDeSorte, commercesOuverts, conditionsCommerce, defCommerce, localLibre, locaux, ouvrirCommerce } from './artisans.js';
import { maisonsLibres, plafondVillageois, villageoisDe } from './villageois.js';
import { attribuer, donnerOutil, marquerAVendre, postesDe, reprendreOutil, tacheDef, tacheManque } from './taches.js';
import { soldeLePlusBas } from './tableau.js';
import { paliersSuivis } from './paliers.js';
import { aCruche, crucheCapacite, eauCruche, puitsCases, puitsPose, remplirCruche } from './cruche.js';
import { acheterCaleche, vendreCaleche, poserTournee, tourneeDuPlan } from './caleche.js';
import { genererMonde, regionDeCase } from './monde.js';
import { elementsSol, solDirect } from './monde-sol.js';
import { hameauxVus, voirHameau } from './monde-hameaux.js';
import { peuplerHameau } from './habitants.js';
import { caseVue, voirAutour } from './monde-vu.js';
import { castLine } from './outils.js';
import { atelierConstruit, buildAtelier, craft, craftStatus, ramassables, ramasser } from './atelier.js';
import { commencerObjectifs, majObjectifs } from './objectifs.js';
import { majCaleche } from './caleche.js';
import { goutPour, HAMEAU_VILLAGE, offrable, offrir, parlerAmitie, visiterHameau } from './amitie.js';
import { habitantsDe } from './habitants.js';
import { invitationDuMoment, invitationsDe, inviter, platsServables, relationsInvitables, servirRepas } from './invitations.js';
import { apporterAuProjet, projetDuHameau } from './projets.js';
import { noterEncyclopedie } from './encyclopedie.js';
import { ESPECES_FAUNE } from './monde-faune.js';
import { buildFridge, FRIGO_OBJET } from './fridge.js';
import { takeItem } from './inventory.js';
import { villageActif } from './village.js';
import { acheterAuPort, dechargerAuPort, niveauPort, PORT, portDuMonde, vendreAuPort } from './port.js';
import {
  agrandirPort, apporterAuChantier, articleDe, articleRefus, avancerBac, commanderImport, commandesDuBac, honorerCommande,
  importsAttendus, objetImporte, prochainNiveau,
} from './bac.js';
import { chargeDe, chargerPortage, choisirVehicule, refusVehicule, volumeDe } from './portage.js';
import { bonusChemin } from './dehors.js';
import { chevalPossede } from './cheval.js';
import { takeWheat } from './animals.js';
import { posteCompta, suivreComptes } from './compta.js';
import { accepterContrat, contratsAcceptes, contratsDuPort, livrerContrat } from './contrats.js';
import { quiEstLie } from './liens.js';
import { scoreVocation } from './vocations.js';
import { poserBloc } from './blocs.js';

/* ==========================================================================
   Lot 10 : simulation d'un joueur automatique (conception, sections 8.10 et
   8.11). Le joueur automatique joue avec les vraies actions du moteur, sans
   interface : il sert au script scripts/simulate.mjs et au bouton du mode test.
   Il ne lit ni l'horloge ni Math.random : une partie simulée est entièrement
   déterminée par sa graine. Tout ce qu'il vise ou garde vit dans
   DATA.SIMULATION.
   ========================================================================== */

/* ---------- I0b : la partie d'aujourd'hui : ramasser, réunir, fabriquer à l'Atelier ----------
   Sur la terre sauvage, rien ne s'achète plus en pièces pour bâtir : l'Atelier se monte avec des pierres
   et du bois ramassés, puis il fabrique les outils, les meubles et les pièces des bâtiments (la boîte à
   nourriture, le four, la meule, le nichoir…). Le joueur simulé ramasse ce que la ferme offre chaque
   matin (botRamasser : les vraies places du jour, l'énergie du geste) ; ce qu'il ne trouve pas sur la
   ferme, il est censé aller le couper, le piocher ou le faucher plus loin, ce qu'il ne fait pas pas à pas :
   ces matériaux bruts (SIMULATION.BRUTS) lui sont fournis, et comptés (materiauxFournis) pour que la
   mesure le dise. Rien de tout cela ne coûte de pièces : c'est ce que dit le jeu. */

// Fiche I8b : la partie → la stratégie de vocation qu'il joue (SIMULATION.VOCATIONS.production) ; rien pour les autres.
const vocationDe = new WeakMap();
// Les matériaux bruts fournis à la partie `state` (hors sauvegarde : un compteur à côté de la partie).
const fournisDe = new WeakMap();
export function materiauxFournis(state) {
  return { ...(fournisDe.get(state) || {}) };
}
function fournir(state, item, n) {
  if (!(n > 0)) return;
  addItem(state, item, n);
  const f = fournisDe.get(state) || {};
  f[item] = (f[item] || 0) + n;
  fournisDe.set(state, f);
}

// Ramasse ce que la ferme offre aujourd'hui : les baies (gratuites, de quoi manger) toujours ; les pierres
// et le bois tant qu'il en a moins de MATERIAUX_GARDES, en gardant l'énergie de trois récoltes.
export function botRamasser(state) {
  const S = DATA.SIMULATION, reserve = actionCost(state, 'recolter') * 3;
  for (const p of ramassables(state)) {
    const def = DATA.ATELIER.RAMASSAGE[p.sorte];
    if (!def.gratuit && (countItem(state, p.objet) >= S.MATERIAUX_GARDES || state.energie < reserve + actionCost(state, 'ramasser'))) continue;
    ramasser(state, p.id);
  }
}

// Réunit `besoin` ({ objet: n }) dans l'inventaire : une planche se fabrique à l'Atelier (avec du bois), le
// blé se prend au Silo, un brut qui manque est fourni ; autre chose (une récolte, un produit) doit être là.
// → vrai si tout y est.
function botReunir(state, besoin) {
  const S = DATA.SIMULATION;
  for (const [item, n] of Object.entries(besoin || {})) {
    let manque = n - countItem(state, item);
    if (manque <= 0) continue;
    if (item === DATA.SILO.ITEM && state.silo.ble >= manque && takeWheat(state, manque, 'silo')) { addItem(state, item, manque); continue; }
    if (S.BRUTS.includes(item)) { fournir(state, item, manque); continue; }
    // (la paille : des fibres fauchées, bottelées par BOTTELEUSE.FIBRES)
    if (item === DATA.PATURAGE.NOURRITURE) {
      const B = DATA.BOTTELEUSE, bottes = Math.ceil(manque / B.PAILLE);
      fournir(state, 'fibre', Math.max(0, bottes * B.FIBRES - countItem(state, 'fibre')));
      bottelerSansCarte(state);
      if (countItem(state, item) < n) return false;
      continue;
    }
    if (item === 'planche') { if (!botFabriquer(state, 'planche', manque)) return false; continue; }
    return false;
  }
  return true;
}

// Fabrique `n` fois la recette `id` de l'Atelier (l'Atelier d'abord, monté avec ses matériaux), ses entrées
// réunies (botReunir). → vrai si c'est fait (faux : trop fatigué, verrouillé, sans place pour l'animal…).
export function botFabriquer(state, id, n = 1) {
  if (!atelierConstruit(state) && !(botReunir(state, DATA.ATELIER.CONSTRUCTION) && buildAtelier(state).ok)) return false;
  const r = DATA.ATELIER.RECETTES[id];
  if (!r) return false;
  for (let k = 0; k < n; k++) {
    const st = craftStatus(state, id);
    if (!st.ok && !Object.keys(st.manque).length) return false;
    if (!botReunir(state, r.entrees) || !craft(state, id).ok) return false;
  }
  return true;
}

// Un outil de l'Atelier (houe, faux, hache, pioche, canne), fabriqué s'il manque. → vrai s'il l'a.
function botOutil(state, id) {
  if (id === 'houe' ? hasHoe(state) : hasTool(state, id)) return true;
  return botFabriquer(state, id);
}

/* ---------- I3c : les villageois et leurs tâches ---------- */

// Le chantier allumé (SIMULATION.VILLAGEOIS) : dès le palier MAISON_PALIER, une maison de villageois quand aucune
// n'est libre et que le port en laisse venir un de plus (ses pièces maîtresses fabriquées à l'Atelier, les murs
// posés d'un coup : testMaisonVillageois) ; puis à chacun la première tâche de TACHES que personne n'a et qui a
// son poste, avec l'outil qu'elle demande (fabriqué à l'Atelier, puis donné).
export function botVillageois(state) {
  const S = DATA.SIMULATION.VILLAGEOIS;
  if (!S || !villageActif(state)) return;
  const V = villageoisDe(state);
  const palier = paliersSuivis(state) ? state.palier : Infinity;
  if (palier >= S.MAISON_PALIER && !maisonsLibres(state).length && !V.some((v) => v.maison === null || v.maison === undefined)
    && (V.length === 0 || V.length < plafondVillageois(state))) {
    const objets = S.MAISON || {};
    let ok = true;
    for (const [o, n] of Object.entries(objets)) {
      const k = n - countItem(state, o);
      if (k > 0 && !botFabriquer(state, o, k)) { ok = false; break; }
    }
    if (ok && testMaisonVillageois(state).ok) for (const [o, n] of Object.entries(objets)) takeItem(state, o, n);
  }
  // (fiche I8b : une stratégie de vocation a sa liste, où une tâche peut revenir : deux navettes)
  const strat = vocationDe.get(state);
  const liste = strat && strat.TACHES ? Object.entries(strat.TACHES).flatMap(([t, n]) => Array(Math.max(0, n | 0)).fill(t)) : S.TACHES || [];
  for (const v of V) {
    if (v.tache || v.accueil) continue;
    const prises = {};
    for (const x of V) if (x.tache) prises[x.tache] = (prises[x.tache] || 0) + 1;
    const voulues = {};
    for (const t of liste) voulues[t] = (voulues[t] || 0) + 1;
    for (const t of [...new Set(liste)]) {
      const def = tacheDef(t);
      if (!def || (prises[t] || 0) >= voulues[t]) continue;
      // (l'outil qu'il faut : fabriqué, puis donné)
      if (def.outil && v.outil !== def.outil) {
        if (v.outil || !botOutil(state, def.outil) || !donnerOutil(state, v.id, def.outil).ok) continue;
      }
      if (tacheManque(state, v, t)) continue;
      attribuer(state, v.id, t);
      break;
    }
  }
  // (I8b : la tournée du port de la stratégie « production » porte aussi VENDRE, une fois les contrats livrés)
  if (strat && Array.isArray(strat.VENDRE)) for (const v of V) if (v.tache === 'navette' && !(v.vendre || []).length) marquerAVendre(state, v.id, strat.VENDRE);
  if (strat && strat.REATTRIBUER === false) return;
  botReattribuer(state, V);
  botEtal(state, V);
  botCommerce(state, V);
}

// Fiche I5a (artisans.js) : la forge (SIMULATION.VILLAGEOIS.COMMERCE). Dès le palier PALIER, sans commerce de la sorte
// SORTE, il choisit un candidat (celui qui fait déjà la tâche de la filière, sinon le dernier arrivé qui ne fait pas une
// tâche de GARDER) et lui confie cette tâche (son outil fabriqué et donné) ; le tableau ne la lui reprend pas
// (botReattribuer). Il lui parle chaque jour (l'amitié : +2 par jour, AMITIE.PAROLE). Dès que son envie est née, il
// bâtit le local (l'établi, le comptoir, l'enseigne fabriqués à l'Atelier, posés comme le joueur ; les murs d'un coup :
// testLocalCommerce), puis il décide l'ouverture quand tout y est. Ouvert, il garde au coffre MATIERES (le minerai, le bois) de la
// filière (les matériaux bruts qu'il va chercher plus loin : SIMULATION.BRUTS, comptés par materiauxFournis), que
// l'artisan lui achète. → l'id du commerce ouvert aujourd'hui, ou null.
const candidatsCommerce = new WeakMap();   // la partie → { id (le candidat), jour (sa dernière conversation) }
export function botCommerce(state, V = villageoisDe(state)) {
  const S = DATA.SIMULATION.VILLAGEOIS && DATA.SIMULATION.VILLAGEOIS.COMMERCE;
  if (!S || !villageActif(state) || !defCommerce(S.SORTE)) return null;
  const d = defCommerce(S.SORTE), palier = paliersSuivis(state) ? state.palier : Infinity;
  if (commerceOuvertDeSorte(state, S.SORTE)) {
    for (const [o, n] of Object.entries(S.MATIERES || {})) fournir(state, o, Math.max(0, n - Math.floor(countItem(state, o))));
    // (il parle chaque jour à l'artisan : l'amitié lui apprend de nouvelles pièces)
    const c = commercesOuverts(state).find((x) => x.sorte === S.SORTE), m = candidatsCommerce.get(state) || {};
    candidatsCommerce.set(state, m);
    if (c && m.jour !== state.day) { m.jour = state.day; parlerAmitie(state, HAMEAU_VILLAGE, c.qui); }
    return null;
  }
  if (palier < (S.PALIER || 1)) return null;
  const adultes = V.filter((v) => !v.enfant && !v.accueil);
  if (!adultes.length) return null;
  const m = candidatsCommerce.get(state) || {};
  candidatsCommerce.set(state, m);
  let v = adultes.find((x) => x.id === m.id) || adultes.find((x) => x.envies && Number.isInteger(x.envies[S.SORTE])) || adultes.find((x) => x.tache === d.tache);
  const garder = new Set(((DATA.SIMULATION.VILLAGEOIS.REATTRIBUER || {}).GARDER) || []);
  // (le dernier arrivé qui ne fait pas une tâche de GARDER ; et dont l'outil, s'il en a un, peut revenir au joueur)
  const T = tacheDef(d.tache);
  const libre = (x) => !garder.has(x.tache) && (!x.outil || x.outil === T.outil || !hasTool(state, x.outil));
  if (!v) v = [...adultes].reverse().find(libre);
  if (!v) return null;
  m.id = v.id;
  // (sa tâche : celle de la filière, tant que l'envie n'est pas née)
  if (v.tache !== d.tache && !(v.envies && Number.isInteger(v.envies[S.SORTE]))) {
    if (T.outil && v.outil !== T.outil) {
      if (!botOutil(state, T.outil)) return null;
      if (!donnerOutil(state, v.id, T.outil).ok) { m.id = null; return null; }
    }
    attribuer(state, v.id, d.tache);
  }
  // (l'amitié : une conversation par jour)
  if (m.jour !== state.day) { m.jour = state.day; parlerAmitie(state, HAMEAU_VILLAGE, v.id); }
  if (!(v.envies && Number.isInteger(v.envies[S.SORTE]))) return null;
  // (le local : fabriqué, posé)
  if (!localLibre(state, S.SORTE) && !locaux(state, S.SORTE).length) {
    const blocs = [d.etabli, (DATA.ARTISANS || {}).COMPTOIR || 'comptoir', d.enseigne];
    // (les pièces qu'il faut d'abord : les clous, les charnières, fabriqués à l'Atelier tant qu'aucune forge ne les fait)
    const R = DATA.ATELIER.RECETTES;
    const avecPieces = (b) => {
      for (const [o, n] of Object.entries((R[b] && R[b].entrees) || {})) {
        const manque = n - Math.floor(countItem(state, o));
        const sous = manque > 0 && Object.keys(R).find((k) => R[k].sortie && R[k].sortie[o] && R[k].commerce);
        if (sous && !botFabriquer(state, sous, Math.ceil(manque / R[sous].sortie[o]))) return false;
      }
      return botFabriquer(state, b);
    };
    for (const b of blocs) if (!countItem(state, b) && !avecPieces(b)) return null;
    if (!testLocalCommerce(state, S.SORTE, false).ok) return null;
  }
  const C = conditionsCommerce(state, v.id, S.SORTE);
  if (!C || !C.ok) return null;
  const r = ouvrirCommerce(state, v.id, S.SORTE);
  return r.ok ? r.commerce.id : null;
}

// I4 (bourse.js) : l'étal. Dès qu'un villageois est là, il le fabrique et le pose ; chaque jour, il y met de ce qu'un
// villageois adore, aime ou dont il a besoin (ETAL.PAR_OBJET unités au plus de chaque objet), sans passer sous
// VIVRES_GARDES dans l'inventaire (deux fois autant de ce qui se mange : la boîte commune passe avant).
export function botEtal(state, V = villageoisDe(state)) {
  const E = DATA.SIMULATION.VILLAGEOIS && DATA.SIMULATION.VILLAGEOIS.ETAL;
  if (!E || !villageActif(state) || !V.some((v) => !v.enfant && !v.accueil)) return false;
  if (caseEtal(state) === null) {
    if (!countItem(state, 'etal') && !botFabriquer(state, 'etal')) return false;
    if (!poserEtalLibre(state).ok) return false;
  }
  const garde = DATA.SIMULATION.VIVRES_GARDES || 0, deja = (state.etal && state.etal.objets) || {};
  const voulus = Object.keys(inventoryCounts(state)).filter((o) => vendableALEtal(o) && V.some((v) => !v.enfant && envieDe(v, o))).sort();
  for (const o of voulus) {
    const n = Math.min(E.PAR_OBJET - (deja[o] || 0), Math.floor(countItem(state, o)) - garde * (DATA.OBJETS[o].energie > 0 ? 2 : 1));
    if (n > 0) mettreALEtal(state, o, n);
  }
  return true;
}

// I3d : le tableau des villageois (tableau.js). Une fois par jour, il regarde le villageois dont le solde de la semaine
// est le plus bas. S'il a fait sa tâche une semaine pleine (REATTRIBUER.JOURS jours de suite, sans repos : le solde
// juge alors la tâche, pas la faim), et pas plus tôt que JOURS jours après le relevé d'avant, ce solde est relevé pour
// cette tâche (par villageois). Les SEMAINES derniers relevés de sa tâche faits, leur somme la juge : une tâche libre
// qu'il a déjà faite a donné mieux, de plus de MARGE pièces : il y retourne, et s'y tient ; sinon, sous SEUIL, et
// s'il ne s'est pas encore tenu à une tâche, il essaie la première tâche libre de VERS (TACHES par défaut) qu'il n'a
// pas faite. Une seule semaine juge mal les champs (une récolte tombe ou non dans la semaine). → la tâche donnée, ou
// null.
const essaisTaches = new WeakMap();   // la partie → { jour (le dernier passage), [id]: { releves: { tache: [soldes] }, dernier, tenu } }
export function botReattribuer(state, V = villageoisDe(state)) {
  const S = DATA.SIMULATION.VILLAGEOIS, R = S && S.REATTRIBUER;
  if (!R || !villageActif(state) || !V.length) return null;
  const memo = essaisTaches.get(state) || {};
  essaisTaches.set(state, memo);
  if (memo.jour === state.day) return null;
  memo.jour = state.day;
  // (fiche I5a : un artisan tient son commerce, on ne le déplace pas)
  const cand = candidatsCommerce.get(state);
  const avecTache = V.filter((v) => tacheDef(v.tache) && !tacheDef(v.tache).commerce && !v.accueil && !(cand && cand.id === v.id && !commercesOuverts(state).length));
  if (!avecTache.length) return null;
  const bas = soldeLePlusBas(state, R.JOURS, avecTache.map((v) => v.id));
  if (!bas || !bas.complet) return null;
  const v = V.find((x) => x.id === bas.id);
  if ((R.GARDER || []).includes(v.tache)) return null;   // (ce qui nourrit le village ne se retire pas)
  const m = memo[v.id] || (memo[v.id] = { releves: {}, dernier: { tache: null, jour: -Infinity }, tenu: false });
  if (m.dernier.tache === v.tache && state.day - m.dernier.jour < R.JOURS) return null;
  const releves = m.releves[v.tache] || (m.releves[v.tache] = []);
  if (m.dernier.tache !== v.tache) releves.length = 0;   // (une tâche reprise : ses relevés recommencent)
  releves.push(bas.solde);
  m.dernier = { tache: v.tache, jour: state.day };
  const n = Math.max(1, Number(R.SEMAINES) || 1);
  if (releves.length < n) return null;
  const juge = (t) => m.releves[t].slice(-n).reduce((a, x) => a + x, 0);
  const solde = juge(v.tache);
  const prises = new Set(V.filter((x) => x !== v).map((x) => x.tache).filter(Boolean));
  const libres = (R.VERS || S.TACHES || []).filter((t) => t !== v.tache && tacheDef(t) && !prises.has(t));
  const faites = (t) => Array.isArray(m.releves[t]) && m.releves[t].length >= n;
  const mieux = libres.filter((t) => faites(t) && juge(t) > solde + (Number(R.MARGE) || 0)).sort((a, b) => juge(b) - juge(a));
  const neuves = m.tenu || solde >= (Number(R.SEUIL) || 0) ? [] : libres.filter((t) => !faites(t));
  for (const t of [...mieux, ...neuves]) {
    const def = tacheDef(t);
    if (!postesDe(state, t, v).length) continue;   // (pas de poste : pas aujourd'hui)
    if (def.outil && v.outil !== def.outil) {
      if (!botOutil(state, def.outil)) continue;
      if (v.outil && hasTool(state, v.outil)) continue;
      if (!donnerOutil(state, v.id, def.outil).ok) continue;
    } else if (!def.outil && v.outil && !hasTool(state, v.outil)) reprendreOutil(state, v.id);
    if (tacheManque(state, v, t)) continue;
    attribuer(state, v.id, t);
    if (mieux.includes(t)) m.tenu = true;
    return t;
  }
  return null;
}

/* ---------- entretien, énergie, infrastructure ---------- */

// Répare ce qui est en panne (et le rallume), entretient ce qui est usé.
function botMaintenance(state) {
  for (const d of allDevices(state)) {
    if (isBroken(d)) {
      if (repairDevice(state, d.id).ok) toggleDevice(state, d.id);
    } else if (needsService(d)) {
      maintainDevice(state, d.id);
    }
  }
}

// Version 1.8 : quand l'énergie ne suffit plus pour une récolte, le joueur mange un
// en-cas (l'aliment le plus nourrissant d'abord, hors réserve de semences), et jamais
// au-delà du maximum.
export function botSnack(state) {
  for (let guard = 0; guard < 10; guard++) {
    if (state.energie >= actionCost(state, 'recolter') || state.energie >= energyMax(state)) return;
    const spare = Object.keys(DATA.OBJETS)
      .filter((k) => DATA.OBJETS[k].mangeable && countItem(state, k) - (state.famille.reserve[k] || 0) >= 1)
      .sort((a, b) => DATA.OBJETS[b].energie - DATA.OBJETS[a].energie);
    if (!spare.length || !eatSnack(state, spare[0]).ok) return;
  }
}

// Eau demandée par une journée : toutes les parcelles arrosées, plus la cuisine.
function botWaterPerDay(state) {
  const S = DATA.SIMULATION;
  let litres = S.LITRES_CUISINE;
  for (const p of allPlots(state)) litres += p.culture ? waterCost(state, p) : S.LITRES_PARCELLE;
  return litres;
}

// Énergie demandée par une journée (mWh) : pompe, réfrigérateur, Moulin et Presse.
function botEnergyPerDay(state, eveilS) {
  let mwh = botWaterPerDay(state) * 1000 * DATA.POMPE.WH_PAR_L;
  if (state.frigo && state.frigo.construit) mwh += fridgeRate(state) * (eveilS + DATA.FRIGO.BLOC_NUIT_S);
  for (const id of Object.keys(DATA.STATIONS)) {
    const st = state.stations[id];
    if (DATA.STATIONS[id].electrique && st && st.construit) mwh += Math.floor((DATA.STATIONS[id].whParS * 1000 * eveilS * DATA.SIMULATION.MARCHE_STATIONS) / 100);
  }
  return mwh;
}

// Pompe, réservoir, panneau et batterie : le joueur ne laisse pas la ferme manquer
// d'eau ni d'énergie. Version 1.6 : un seul appareil de chaque, qu'il améliore ; le
// panneau ne produit qu'au soleil (de 7 h à 19 h), sur la part ensoleillée de son
// temps d'éveil. Renvoie la prochaine amélioration nécessaire { cost, buy }, ou
// { done: true }.
function botInfraInfo(state, eveilS) {
  const S = DATA.SIMULATION;
  // version 1.12 : rien à améliorer avant d'avoir acheté le panneau, la pompe et le réservoir
  if (!farmOpen(state) || !isOwned(state.reservoir)) return { locked: true };
  const litres = botWaterPerDay(state);
  const pump = state.pompe;
  const needsFlow = litres * 1000 * 100 > pumpFlow(pump) * eveilS * S.MARGE_EAU;
  if (pump.niveau < DATA.NIVEAU_MAX && needsFlow) return { cost: upgradeCost(pump), buy: () => upgradeDevice(state, pump.id) };
  const needsTank = isAutomated(state, 'potager') && litres * 1000 * 100 > tankCapacity(state) * S.MARGE_EAU;
  if (state.reservoir.niveau < DATA.NIVEAU_MAX && needsTank) {
    return { cost: upgradeCost({ type: 'reservoir', niveau: state.reservoir.niveau }), buy: () => upgradeTank(state) };
  }

  const panel = state.panneaux[0];
  const produced = Math.floor((panelOutput(panel) * sunlitMs(0, eveilS * 1000)) / 1000);
  const need = botEnergyPerDay(state, eveilS);
  if (panel.niveau < DATA.NIVEAU_MAX && produced * 100 < need * S.MARGE_ENERGIE) return { cost: upgradeCost(panel), buy: () => upgradeDevice(state, panel.id) };
  const battery = state.batteries[0];
  if (isOwned(battery) && battery.niveau < DATA.NIVEAU_MAX && batteryCapacity(battery) * 100 < need * S.MARGE_BATTERIE) {
    return { cost: upgradeCost(battery), buy: () => upgradeDevice(state, battery.id) };
  }
  return { done: true };
}

/* ---------- cultures ---------- */

// Énergie rendue par une parcelle et par nuit (critère de choix des légumes).
function botCropScore(culture) {
  const c = DATA.CULTURES[culture];
  const item = DATA.OBJETS[cropProduct(culture)];
  return ((item.energie || 0) * c.rendement) / c.stades;
}

// Achète une unité de graine si le prix reste raisonnable ; renvoie true si elle est là.
// (à la calèche, à son passage : botCalecheLa)
function botBuySeed(state, item) {
  if (!isBuyable(item) || !botCalecheLa(state)) return false;
  const price = buyPrice(state, item);
  if (price > DATA.SIMULATION.PRIX_GRAINE_MAX + EPS || !canPay(state, price)) return false;
  return botAcheter(state, item, 1).ok === true;
}

function botHasSeed(state, culture) {
  return seedStock(state, culture) >= 1 - EPS || botBuySeed(state, seedItem(culture));
}

// Vrai tant que l'objectif « carottes récoltées » du chapitre en cours n'est pas
// couvert par les récoltes faites et les carottes déjà en terre.
function botWantsCarrots(state) {
  const obj = objectiveDef('carottes');
  if (!obj || chapterReached(state) > objectiveChapter('carottes')) return false;
  const inGround = allPlots(state).filter((p) => p.culture === 'carotte').length * DATA.CULTURES.carotte.rendement;
  return state.campagne.compteurs.carottes + inGround < obj.cible;
}

// Une culture de plein champ (blé, tournesol, riz, houblon).
export function botIsFieldCrop(culture) {
  return !!DATA.CULTURES[culture].pleinChamp;
}

// Parcelles de la Zone de culture que le joueur réserve au plein champ (blé et
// tournesol) : PART_PLEIN_CHAMP % de la zone une fois le blé plantable (niveau
// atteint et Silo construit), 0 avant.
export function botFieldTarget(state) {
  if (!cropUnlocked(state, 'ble')) return 0;
  const v = vocationDe.get(state);
  const part = v && Number.isFinite(v.PART_PLEIN_CHAMP) ? v.PART_PLEIN_CHAMP : DATA.SIMULATION.PART_PLEIN_CHAMP;
  return Math.floor((state.potager.parcelles.length * part) / 100);
}

// Culture à planter sur une parcelle vide, ou null.
function botPickCrop(state, plot) {
  const S = DATA.SIMULATION;
  const options = plantableCropsFor(state, plot.lieu);
  if (plot.lieu === DATA.POTAGER.LIEU) {
    // Tant que la part de plein champ n'est pas atteinte : du blé (pour les poules
    // et la farine), et un peu de tournesol quand la Presse existe.
    const zone = state.potager.parcelles;
    const field = zone.filter((p) => p.culture && botIsFieldCrop(p.culture)).length;
    if (field < botFieldTarget(state)) {
      const sun = zone.filter((p) => p.culture === 'tournesol').length;
      const wanted = isUnlocked(state, 'chaines') && sun < S.PARCELLES_TOURNESOL ? ['tournesol', 'ble'] : ['ble'];
      const culture = wanted.find((c) => options.includes(c) && botHasSeed(state, c));
      if (culture) return culture;
    }
  }
  // Le reste de la zone (et la Serre) nourrit la famille : les légumes, pas le plein champ.
  // Version 1.14 : le joueur varie ses cultures (des plats variés font le bonheur) : la
  // culture la moins présente (en terre et en stock) passe devant, la plus nourrissante
  // à égalité.
  const presence = (c) => allPlots(state).filter((p) => p.culture === c).length
    + countItem(state, cropProduct(c)) / Math.max(1, DATA.CULTURES[c].rendement * S.DIVERSITE_STOCK);
  const foods = options.filter((c) => !botIsFieldCrop(c) && DATA.OBJETS[cropProduct(c)].mangeable)
    .sort((a, b) => presence(a) - presence(b) || botCropScore(b) - botCropScore(a));
  // l'objectif du chapitre 2 demande des carottes : elles passent devant
  if (botWantsCarrots(state)) foods.sort((a, b) => (b === 'carotte') - (a === 'carotte'));
  return foods.find((c) => botHasSeed(state, c)) || null;
}

// Récolte, replante, arrose.
export function botFarm(state) {
  const S = DATA.SIMULATION;
  for (const p of allPlots(state)) {
    if (isMature(p)) harvest(state, p.id);
    if (!p.culture) {
      // On étale les semis sur plusieurs jours : une ferme plantée d'un coup est
      // récoltée d'un coup, et la famille jeûne entre deux récoltes.
      const lieu = allPlots(state).filter((x) => x.lieu === p.lieu);
      const fresh = lieu.filter((x) => x.culture && x.stade === 0).length;
      if (fresh >= Math.max(1, Math.ceil(lieu.length / S.ETALEMENT_JOURS))) continue;
      const culture = botPickCrop(state, p);
      if (culture) plant(state, p.id, culture);
    }
  }
  const thirsty = allPlots(state).filter((p) => p.culture && !p.arrose && !isMature(p));
  thirsty.sort((a, b) => b.stade - a.stade);
  // (la cruche vide : il va la remplir au puits, puis la parcelle arrosée)
  for (const p of thirsty) if (!water(state, p.id).ok && remplirCruche(state, puitsCases(state)[0]).ok) water(state, p.id);
}

// Avant la pompe : le puits (son bloc fabriqué à l'Atelier, posé : botBatir) et la cruche (fabriquée à
// l'Atelier), remplie au puits.
function botEau(state) {
  if (!houseRepaired(state)) return;
  if (!puitsPose(state) && !botBatir(state, 'puits').buy().ok) return;
  if (!aCruche(state) && !botFabriquer(state, 'cruche')) return;
  if (eauCruche(state) < crucheCapacite()) remplirCruche(state, puitsCases(state)[0]);
}

// Tuiles labourables, des plus proches de l'ancienne Zone de culture aux plus lointaines
// (version 1.15 : le joueur automatique cultive d'un seul tenant).
// (Une fois par terrain et par blocs posés : ce qui est bâti ne se laboure pas.)
let botTilesCache = null, botTilesPour = null;
function botTiles(state) {
  const T = farmTerrain(state), cases = casesDuTerrain(T, state);
  const cle = farmSeed(state) + ':' + cases.length + ':' + Object.keys(state.blocs || {}).join(',');
  if (botTilesPour === cle) return botTilesCache;
  const W = T.LARGEUR, Z = T.ZONES[1];
  const tiles = [], aucune = new Set(); // (les tuiles sous un rocher ou un arbre n'y sont pas)
  for (const t of cases) if (isArable(t, state, aucune)) tiles.push(t);
  const d = (t) => Math.hypot((t % W) - (Z.X + 2), Math.floor(t / W) - (Z.Y + 2.5));
  botTilesCache = tiles.sort((a, b) => d(a) - d(b) || a - b);
  botTilesPour = cle;
  return botTilesCache;
}

// Version 1.9 : avec la houe, laboure des tuiles d'herbe jusqu'au plafond du niveau, en
// gardant de l'énergie pour trois récoltes.
export function botHoe(state) {
  if (!hasHoe(state)) return;
  const reserve = actionCost(state, 'recolter') * 3;
  for (const t of botTiles(state)) {
    if (plotAtTile(state, t)) continue;
    if (state.energie < reserve + actionCost(state, 'labourer')) return;
    const st = hoeStatus(state, t);
    if (!st.ok && st.dessin) continue; // version 1.15 : sa bordure ne se dessinerait pas
    if (!st.ok) return;
    hoe(state, t);
  }
}

/* ---------- animaux ---------- */

function botHens(state) {
  const p = state.poulailler;
  if (!p.construit || p.poules <= 0) return;
  // pas de blé pour les poules : un dépannage à la calèche (le blé se sème : elle en vend)
  while (hensToFeed(state) > 0 && !canFeedHen(state) && botBuySeed(state, DATA.SILO.ITEM)) {
    if (canFeedHen(state)) break;
  }
  for (let i = 0; i < p.poules + 3 && hensToFeed(state) > 0; i++) {
    if (!feedAllHens(state).ok) break;
  }
}

// Tond les moutons dont la laine est prête.
export function botSheep(state) {
  const p = state.paturage;
  if (!p.construit) return;
  for (const m of p.moutons) {
    if (woolReady(m)) shear(state, m.id);
  }
}

// Version 1.13 : cueille les arbres en fruits du Verger.
function botOrchard(state) {
  for (const t of ripeTrees(state)) {
    if (!harvestTree(state, t.id).ok) break;
  }
}

// Version 1.14 : le joueur ouvre son courrier (l'héritage du niveau 9 est versé à l'ouverture).
function botMail(state) {
  for (const l of unreadMail(state)) readMail(state, l.id);
}

// La paille vient des fibres de la faux (FAUX), bottelées (BOTTELEUSE) : dès qu'il a des
// moutons ou des vaches, il fabrique la faux et fauche les touffes de son pré (botPre : il
// n'a pas de carte) pour PAILLE_NUITS nuits d'avance, tant qu'il en reste et qu'il a de
// l'énergie ; ses fibres sont bottelées sans machine (bottelerSansCarte).
export function botScythe(state) {
  const besoin = strawNeed(state);
  if (besoin <= 0) return;
  if (!botOutil(state, 'faux')) return;
  const voulu = besoin * DATA.SIMULATION.PAILLE_NUITS;
  for (const id of botPre(state)) {
    if (strawStock(state) >= voulu) break;
    if (grassCut(state, id)) continue;
    if (!scytheGrass(state, id).ok) break;
    bottelerSansCarte(state);
  }
}

// I0b : les touffes de son pré : BOT_TOUFFES cases d'herbe de la ferme, les plus loin de la Zone de culture,
// nommées comme celles de la carte (le pied de la touffe, en px : outils.js) pour qu'elles repoussent
// (regrowGrass) ; l'ancien « pre_k » ne repoussait jamais.
let preCache = null, prePour = null;
function botPre(state) {
  const T = farmTerrain(state), cle = farmSeed(state) + ':' + T.LARGEUR;
  if (prePour !== cle) {
    const P = 16;
    preCache = botTiles(state).slice().reverse().slice(0, DATA.FAUX.BOT_TOUFFES).map((t) => `${(t % T.LARGEUR) * P + P / 2},${Math.floor(t / T.LARGEUR) * P + P}`);
    prePour = cle;
  }
  return preCache;
}

// Le troupeau a-t-il ses PAILLE_NUITS nuits de paille d'avance ? (avant d'attirer une bête de plus)
function botTroupeauNourri(state) {
  return strawStock(state) >= strawNeed(state) * DATA.SIMULATION.PAILLE_NUITS;
}

// Le Moulin : il moud de quoi garder un peu de farine (STOCK_FARINE). Le blé des poules et
// des semis reste de côté.
export function botMill(state) {
  const S = DATA.SIMULATION;
  const st = state.stations.moulin;
  if (!st.construit) return;
  const d = st.appareil;
  if (d && (!d.allume || isBroken(d))) return;
  const voulu = S.STOCK_FARINE - countItem(state, 'farine') - millPending(state);
  if (voulu < 1) return;
  const n = Math.min(voulu, Math.max(0, wheatTotal(state) - botWheatKept(state)));
  if (n >= 1) startMilling(state, n);
}

/* ---------- cuisine ---------- */

// Unités disponibles d'un ingrédient (inventaire et frigo), sans la réserve de semences.
function botSpare(state, item) {
  if (item === DATA.SILO.ITEM) return wheatTotal(state);
  const reserve = state.famille.reserve[item] || 0;
  return stockCount(state, item) - reserve;
}

// Option retenue pour un ingrédient (celle dont il reste assez), ou null.
function botIngredient(state, ing) {
  return ingredientOptions(ing).find((item) => botSpare(state, item) + EPS >= ing.qte) || null;
}

// Intérêt d'une recette : gain en pièces par seconde de préparation, ou 0 si elle ne vaut pas le coup.
export function botRecipeValue(state, id) {
  const S = DATA.SIMULATION;
  const r = DATA.RECETTES[id];
  if (r.horsLivre) return 0; // le blé se moud au Moulin : voir botMill()
  if (!recipeUnlocked(state, id)) return 0; // arbre v2 : recette encore verrouillée
  if (r.eau && state.eauMl < r.eau * 1000) return 0;
  const items = r.ingredients.map((ing) => botIngredient(state, ing));
  if (items.some((i) => i === null)) return 0;
  if (r.transformation) {
    if (r.sortie === 'huile') {
      const spare = countItem(state, 'graine_tournesol') - S.PARCELLES_TOURNESOL;
      return countItem(state, 'huile') < S.STOCK_HUILE && spare >= r.ingredients[0].qte ? 1 / r.temps : 0;
    }
    return 0;
  }
  // I0b : le pain passe devant tant que le chapitre en cours demande des pains cuits
  const pains = objectiveDef('pains');
  if (pains && id === pains.recette && chapterReached(state) === objectiveChapter('pains') && state.campagne.compteurs.pains < pains.cible) {
    return (2 * S.PRIORITE_BONHEUR) / r.temps;
  }
  // version 1.14 : un plat jamais préparé passe devant tant que le chapitre en cours
  // demande des plats différents
  const plats = objectiveDef('plats');
  if (plats && chapterReached(state) === objectiveChapter('plats') && !(plats.exclut || []).includes(id)
    && !state.campagne.compteurs.plats.includes(id)) {
    return (2 * S.PRIORITE_BONHEUR) / r.temps;
  }
  // version 1.11 : sous le bonheur visé, un plat qui manque à la famille passe avant
  // tout (le meilleur bonheur d'abord), même s'il ne rapporte rien
  if (averageHappiness(state) < S.BONHEUR_CIBLE && botSpare(state, id) < 1 && dishHappiness(id) > 0) {
    return (S.PRIORITE_BONHEUR + dishHappiness(id)) / r.temps;
  }
  let cost = (r.eau || 0) * DATA.CUISINE.PRIX_EAU;
  r.ingredients.forEach((ing, i) => { cost += DATA.OBJETS[items[i]].prix * ing.qte; });
  const gain = dishPrice(id) - cost;
  return gain > 0 ? gain / r.temps : 0;
}

// Blé à ne pas moudre : les semis de plein champ et trois nuits de poules.
export function botWheatKept(state) {
  const S = DATA.SIMULATION;
  const hens = Math.ceil(state.poulailler.poules / DATA.ANIMAUX.poule.poulesParBle) * S.BLE_JOURS_GARDES;
  return hens + botFieldTarget(state);
}

// Sort du frigo ce qu'il faut pour une recette, puis la lance.
function botStartRecipe(state, id) {
  const r = DATA.RECETTES[id];
  r.ingredients.forEach((ing) => {
    const item = botIngredient(state, ing);
    const missing = ing.qte - countItem(state, item);
    if (item !== DATA.SILO.ITEM && missing > 0) moveFromFridge(state, item, missing);
  });
  return startRecipe(state, id).ok === true;
}

// Ce qui manque des ressources d'un nœud de l'arbre, mis dans l'inventaire du bot.
function botGather(state, id) {
  for (const r of techResources(state, id)) if (!r.ok) fournir(state, r.item, r.qte - r.stock);
}

// Les objectifs « objet » du chapitre en cours (gisements, cristaux, Four) : le joueur simulé rapporte
// les minerais des gisements et le quartz de la montagne (fournis, comme botGather pour l'arbre), et fond un
// lingot au Four dès qu'il le peut, minerais et bois compris. (I0b : plus de bois offert pour l'objectif
// « vendre à la calèche » : ce sont ses ventes de tous les jours qui le remplissent.)
function botObjectives(state) {
  if (!state.campagne || state.campagne.fini) return;
  for (const o of chapterProgress(state).objectifs) {
    if (o.type !== 'objet' || o.ok) continue;
    const manque = o.cible - o.valeur;
    const r = DATA.RECETTES[o.item];
    if (o.item.startsWith('minerai_') || o.item === 'quartz') fournir(state, o.item, manque);
    else if (r && r.transformation && r.sortie === o.item) {
      const st = state.stations && state.stations[r.station];
      if (!st || !st.construit || st.tache || !recipeUnlocked(state, o.item)) continue;
      for (const ing of r.ingredients) {
        const item = ingredientOptions(ing)[0];
        if (countItem(state, item) + EPS < ing.qte) fournir(state, item, ing.qte - countItem(state, item));
      }
      botStartRecipe(state, o.item);
    }
  }
}

function botCook(state) {
  // (les chaînes de production, sans carte : son tournesol devient de l'huile, js/engine/chaines.js)
  if (isUnlocked(state, 'chaines')) chainesSansCarte(state, ['huile']);
  if (!state.stations) return;
  for (const station of Object.keys(DATA.STATIONS)) {
    const st = state.stations[station];
    if (!st || !st.construit || st.tache) continue;
    let best = null;
    for (const id of Object.keys(DATA.RECETTES)) {
      if (DATA.RECETTES[id].station !== station) continue;
      const v = botRecipeValue(state, id);
      if (v > 0 && (!best || v > best.v)) best = { id, v };
    }
    if (best) botStartRecipe(state, best.id);
  }
}

/* ---------- achats ---------- */

// Bâtir `id` (un bâtiment, un appareil : testBatir) : ses pièces maîtresses (SIMULATION.BATIR : la boîte,
// le four, la meule, le nichoir, les blocs du Silo…) sont fabriquées à l'Atelier avec de vrais matériaux, puis
// posées ; les murs, les portes et les barrières qui les entourent sont posés d'un coup (le joueur simulé ne
// pose pas bloc à bloc). Rien ne se paie en pièces : la terre sauvage ne vend pas ses bâtiments. { cost, buy }.
function botBatir(state, id) {
  return {
    cost: 0,
    buy: () => {
      const objets = DATA.SIMULATION.BATIR[id] || {};
      for (const [o, n] of Object.entries(objets)) {
        const k = n - countItem(state, o);
        if (k > 0 && !botFabriquer(state, o, k)) return { ok: false, error: `Pas de quoi fabriquer : ${o}.` };
      }
      const r = testBatir(state, id);
      // (testBatir pose un exemplaire qu'il donne : ceux qu'il a fabriqués en tiennent lieu)
      if (r.ok) for (const [o, n] of Object.entries(objets)) takeItem(state, o, n);
      return r;
    },
  };
}

// Un jeune arbre du Verger : acheté à la calèche (son prix), puis planté. { cost, buy }.
// (I1c, le chantier allumé : il vient par le bac ; commandé au port, payé d'avance, il est planté à sa livraison)
function botArbre(state, espece) {
  const item = DATA.ATELIER.BLOCS[espece] && DATA.ATELIER.BLOCS[espece].objet;
  if (!item || !isBuyable(item)) return { locked: true };
  if (villageActif(state) && objetImporte(item)) return botImport(state, `objet:${item}`, () => {
    const r = testBatir(state, espece);
    if (r.ok) takeItem(state, item, 1);
    return r;
  });
  const cost = buyPrice(state, item);
  return {
    cost,
    buy: () => {
      if (!botCalecheLa(state)) return { ok: false, error: 'La calèche n\'est pas là.' };
      if (countItem(state, item) < 1 && !botAcheter(state, item, 1).ok) return { ok: false, error: 'Pas assez de pièces.' };
      const r = testBatir(state, espece);
      if (r.ok) takeItem(state, item, 1);
      return r;
    },
  };
}

// I1c : un article du catalogue d'import, pour un usage (`utiliser` : planter le jeune arbre…) : livré, il s'en sert ;
// attendu, il patiente ; sinon il le commande au port (payé d'avance, il arrive au passage suivant du bac). { cost, buy }
// ou { locked }.
function botImport(state, cle, utiliser) {
  const a = articleDe(cle, state);
  if (!a) return { locked: true };
  if (a.sorte === 'objet' && countItem(state, a.id) >= 1) return { cost: 0, buy: utiliser };
  if (importsAttendus(state).some((x) => x.cle === cle)) return { locked: true };
  if (articleRefus(state, a)) return { locked: true };
  return {
    cost: a.prix,
    buy: () => (botCalecheLa(state) ? commanderImport(state, cle, 1, null, { sansPresence: true }) : { ok: false, error: 'Pas au port.' }),
  };
}

// I1c : agrandir le port jusqu'au niveau `niveau` : les matériaux apportés au chantier (il les charge avant sa sortie :
// botChargement), puis les pièces. { done }, { locked } ou { cost, buy }.
function botPort(state, niveau) {
  if (!villageActif(state)) return { done: true };
  if (niveauPort(state) >= niveau) return { done: true };
  const nx = prochainNiveau(state);
  if (!nx) return { done: true };
  // (il économise pour lui : tant que les pièces manquent, botBuy s'arrête là ; ses pièces réunies, il attend d'être
  // au port, ses matériaux apportés, sans les dépenser ailleurs : `attendre`)
  if (!canPay(state, nx.pieces + DATA.SIMULATION.CAISSE)) return { cost: nx.pieces, buy: () => ({ ok: false }) };
  if (!botCalecheLa(state)) return { attendre: true };
  apporterAuChantier(state, null, { sansPresence: true });
  if (!prochainNiveau(state).pret) return { attendre: true };
  return { cost: nx.pieces, buy: () => agrandirPort(state, null, { sansPresence: true }) };
}

// Ce qu'il reste à faire pour une étape du plan : { done }, { locked } ou { cost, buy }.
export function botStepInfo(state, step, eveilS) {
  const built = (b) => b.construit && b.niveau >= step.niveau;
  switch (step.type) {
    case 'infra':
      return botInfraInfo(state, eveilS);
    // le foyer à bâtir, les appareils de départ à poser
    // (une partie neuve a son abri : le foyer est déjà là)
    case 'maison':
      return houseRepaired(state) ? { done: true } : botBatir(state, 'foyer');
    case 'achat':
      if (isOwned(starterOf(state, step.id))) return { done: true };
      if (starterBlock(state, step.id) || levelBlock(state, 'energie')) return { locked: true };
      return botBatir(state, step.id);
    // (la houe se fabrique à l'Atelier)
    case 'houe':
      if (hasHoe(state)) return { done: true };
      return { cost: 0, buy: () => ({ ok: botOutil(state, 'houe') }) };
    case 'silo':
      if (!isUnlocked(state, 'silo')) return { locked: true };
      return state.silo.construit ? { done: true } : botBatir(state, 'silo');
    case 'poulailler':
      if (!isUnlocked(state, 'poulailler')) return { locked: true };
      if (built(state.poulailler)) return { done: true };
      return state.poulailler.construit ? { cost: coopUpgradeCost(state), buy: () => upgradePoulailler(state) } : botBatir(state, 'poulailler');
    case 'poules': {
      if (!isUnlocked(state, 'poulailler')) return { locked: true };
      const p = state.poulailler;
      if (p.poules >= step.n) return { done: true };
      if (!p.construit) return botBatir(state, 'poulailler');
      if (p.poules >= coopCapacity(state)) return { cost: coopUpgradeCost(state), buy: () => upgradePoulailler(state) };
      // (une poule s'attire avec un nid garni, fabriqué à l'Atelier : fibres et blé)
      return { cost: 0, buy: () => ({ ok: botFabriquer(state, 'nid_poule') }) };
    }
    case 'station': {
      const def = DATA.STATIONS[step.id];
      if (!isUnlocked(state, step.id)) return { locked: true };
      if (state.stations[step.id].construit) return { done: true };
      if (def.requiert && !state.stations[def.requiert].construit) return { locked: true };
      return botBatir(state, step.id);
    }
    case 'paturage':
      if (!isUnlocked(state, 'paturage')) return { locked: true };
      return state.paturage.construit ? { done: true } : botBatir(state, 'etable');
    case 'moutons': {
      if (!isUnlocked(state, 'moutons')) return { locked: true };
      const p = state.paturage;
      if (!p.construit) return botBatir(state, 'etable');
      if (sheepCount(state) >= step.n) return { done: true };
      if (freeSheepPlaces(state) <= 0) return { cost: pastureCost(state), buy: () => buyPasture(state) };
      // (un mouton s'attire avec une pierre à sel et du foin, fabriqués à l'Atelier ; I0b : pas de bête de
      // plus tant que le troupeau n'a pas ses nuits de paille d'avance)
      if (!botTroupeauNourri(state)) return { locked: true };
      return { cost: 0, buy: () => ({ ok: botFabriquer(state, 'sel_mouton') }) };
    }
    // version 1.14 : des vaches pour le lait
    case 'vaches': {
      if (!isUnlocked(state, 'moutons')) return { locked: true };
      const p = state.paturage;
      if (!p.construit) return botBatir(state, 'etable');
      if (cowCount(state) >= step.n) return { done: true };
      if (freeCowPlaces(state) <= 0) return { cost: pastureCost(state), buy: () => buyPasture(state) };
      if (!botTroupeauNourri(state)) return { locked: true };
      return { cost: 0, buy: () => ({ ok: botFabriquer(state, 'sel_vache') }) };
    }
    case 'serre':
      if (!isUnlocked(state, 'serre')) return { locked: true };
      // (plus de niveaux, v76 : bâtie, elle laboure toutes les cases libres de sa pièce, comme le joueur à la houe)
      if (state.serre.construit) { testLabourerSerre(state); return { done: true }; }
      return botBatir(state, 'serre');
    // (le Verger s'ouvre avec le premier arbre planté)
    case 'verger':
      return isUnlocked(state, 'verger') ? { done: true } : { locked: true };
    // I1c : un niveau du port (le chantier allumé ; éteint : rien à faire)
    case 'port':
      return botPort(state, step.niveau || 2);
    case 'arbres': {
      if (!isUnlocked(state, 'verger')) return { locked: true };
      const v = state.verger;
      if (v.arbres.length >= step.n) return { done: true };
      const espece = Object.keys(DATA.VERGER.ARBRES)[v.arbres.length % Object.keys(DATA.VERGER.ARBRES).length];
      return botArbre(state, espece);
    }
    case 'frigo':
      if (!isUnlocked(state, 'frigo')) return { locked: true };
      // (le Réfrigérateur s'achète, puis se pose dans le foyer)
      if (!state.frigo.construit) {
        return {
          cost: countItem(state, FRIGO_OBJET) > 0 ? 0 : DATA.FRIGO.PRIX_CONSTRUCTION,
          buy: () => (countItem(state, FRIGO_OBJET) > 0 || buildFridge(state).ok ? testBatir(state, 'frigo') : { ok: false }),
        };
      }
      // version 1.10 : un niveau de frigo visé (capacité)
      return fridgeLevel(state) >= (step.niveau || 1) ? { done: true } : { cost: fridgeUpgradeCost(state), buy: () => upgradeFridge(state) };
    case 'pompe':
      if (chapterReached(state) < 4) return { locked: true }; // d'abord les achats essentiels
      if (state.pompe.niveau < step.niveau && !hasTech(state, step.niveau === 2 ? 'cu_outils' : 'ea_econome')) return { locked: true }; // après le nœud précédent
      return state.pompe.niveau >= step.niveau ? { done: true } : { cost: upgradeCost(state.pompe), buy: () => upgradeDevice(state, state.pompe.id) };
    case 'tech': {
      if (hasTech(state, step.id)) return { done: true };
      if (chapterReached(state) < 4) return { locked: true }; // d'abord les achats essentiels
      if (techStatus(state, step.id) !== 'disponible') return { locked: true };
      if (techPoints(state).solde < DATA.ARBRE.noeuds[step.id].pt) return { locked: true }; // arbre v2 : PT
      // les ressources (bois, pierre, lingots) : le joueur simulé va les chercher (couper,
      // piocher, fondre au Four), ce que le bot ne fait pas pas à pas : elles lui sont données
      return { cost: DATA.ARBRE.noeuds[step.id].prix, buy: () => { botGather(state, step.id); return buyTech(state, step.id); } };
    }
    default:
      return { done: true };
  }
}

// Vend juste assez de conserves pour payer un achat, sans descendre sous le stock gardé.
export function botRaiseFunds(state, cost) {
  const price = DATA.OBJETS.conserve.prix;
  const spare = countItem(state, 'conserve') - DATA.SIMULATION.CONSERVES_GARDEES;
  const needed = Math.ceil((cost - state.pieces - EPS) / price);
  if (needed > 0 && needed <= spare) sellItem(state, 'conserve', needed);
}

// Achète, dans l'ordre, ce qui fait le plus avancer le chapitre en cours puis le
// plan général ; s'arrête sur la première étape trop chère (il économise pour elle).
export function botBuy(state, eveilS) {
  const S = DATA.SIMULATION;
  const chapitre = Math.min(chapterReached(state), chapterCount());
  // Version 1.6 : ce qui fait avancer le chapitre passe avant les appareils (une
  // amélioration coûte désormais 100 à 2 200 pièces ; avant, la pompe pouvait tout
  // absorber dès l'ouverture du Champ).
  const steps = [...(S.PRIORITE[chapitre] || []), { type: 'infra' }, ...S.PLAN];
  // (I0b : ce qui échoue sans être une question de pièces, trop fatigué pour fabriquer, pas de place, pas
  // encore de quoi attirer la bête, est laissé pour cette fois ; le plan continue)
  const rates = new Set();
  for (let guard = 0; guard < 40; guard++) {
    let bought = false;
    for (const step of steps) {
      if (rates.has(step)) continue;
      const info = botStepInfo(state, step, eveilS);
      if (info.done || info.locked) continue;
      if (info.attendre) return;   // (I1c : il garde ses pièces pour le port, botPort)
      // une caisse reste en réserve pour les graines et le blé (sauf pour l'eau et l'énergie)
      // (ce qui ne coûte rien, fabriqué à l'Atelier, ne demande pas de caisse : fiche 7c)
      const target = info.cost ? info.cost + (step.type === 'infra' ? 0 : S.CAISSE) : 0;
      if (!canPay(state, target)) botRaiseFunds(state, target);
      if (!canPay(state, target)) return;
      if (!info.buy().ok) { rates.add(step); continue; }
      bought = true;
      break; // l'état a changé : on relit le plan depuis le début
    }
    if (!bought) return;
  }
}

/* ---------- ventes et rangement du soir ---------- */

// Fiche 9b : il vend à la calèche ; ses ventes comptent pour la campagne (« Vendre pour 100 pièces à la
// calèche »). I0b : elle passe à la ferme une fois par jour (vers 10 h) : le joueur simulé, qui n'a pas de
// carte, la retrouve à son passage (la série d'actions du soir, botActions : botPassageCaleche) et ne
// commerce qu'à ce moment-là, et seulement quand elle commerce avec lui (son niveau, marcheOuvert).
const aLaCaleche = new WeakSet();
function botCalecheLa(state) {
  return aLaCaleche.has(state) && marcheOuvert(state);
}
// Joue `fn` pendant le passage de la calèche (le commerce est possible). → ce que `fn` renvoie.
export function botPassageCaleche(state, fn) {
  const deja = aLaCaleche.has(state);
  aLaCaleche.add(state);
  try { return fn(); } finally { if (!deja) aLaCaleche.delete(state); }
}
// (le chantier « l'île à bâtir » allumé, fiche I1b : au port, où le mène sa sortie, botSortiePort ; fiche I2 : avant
// de partir, sur la ferme, ce qu'il vendrait est noté pour être chargé, botChargement)
const aCharger = new WeakMap();   // la partie → ce que le joueur simulé vendrait : [{ item, qty }] (le chargement)
const sellItem = (state, item, qty) => {
  if (aCharger.has(state)) { if (qty >= 1) aCharger.get(state).push({ item, qty: Math.floor(qty) }); return { ok: true, sold: 0, gain: 0 }; }
  if (!botCalecheLa(state)) return { ok: false };
  return villageActif(state) ? vendreAuPort(state, item, qty, null, { sansPresence: true }) : vendreCaleche(state, item, qty, null, { sansPresence: true });
};
function botAcheter(state, item, qty) {
  if (!botCalecheLa(state)) return { ok: false };
  return villageActif(state) ? acheterAuPort(state, item, qty, null, { sansPresence: true }) : acheterCaleche(state, item, qty, null, { sansPresence: true });
}

/* -- I1b : la sortie au port (le chantier allumé) --
   La calèche ne commerce plus : le joueur simulé va au port, au bout du chemin, quand ce qu'il a à vendre vaut
   SIMULATION.PORT.SEUIL pièces ou plus, ou qu'il lui manque des graines pour une parcelle vide ; une sortie par
   jour au plus, à la dernière série d'actions de la journée. La marche se compte en temps d'éveil d'après la
   distance (le chemin du port et la moitié de la ferme, à SIMULATION.PORT.VITESSE cases par seconde) : à
   l'aller, il commerce à son arrivée (le comptoir ouvert, PORT.HEURES), puis il rentre. */
const sortiesPort = new WeakMap();   // la partie → le jour de sa dernière sortie au port

// Ce que botSell vendrait au port, en pièces (à peu près : la laine, le blé et les vivres en trop).
function botValeurAVendre(state) {
  const S = DATA.SIMULATION, semences = botSemences(state);
  let v = countItem(state, 'laine') * sellPrice('laine', state);
  v += Math.max(0, Math.floor(countItem(state, DATA.SILO.ITEM) - S.BLE_MAX)) * sellPrice(DATA.SILO.ITEM, state);
  for (const item of Object.keys(inventoryCounts(state))) {
    const def = DATA.OBJETS[item];
    if (!def || def.plat || !def.mangeable || !['légume', 'fruit', 'produit'].includes(def.categorie)) continue;
    v += Math.max(0, Math.floor(countItem(state, item) - S.VIVRES_GARDES - (semences[item] || 0))) * def.prix;
  }
  return v;
}

// Lui manque-t-il des graines : une parcelle vide, et rien à y semer ?
function botManqueGraines(state) {
  const vide = state.potager.parcelles.some((p) => !p.culture);
  return vide && !plantableCropsFor(state, DATA.POTAGER.LIEU).some((c) => seedStock(state, c) >= 1 - EPS);
}

// La marche (aller ou retour) : `secondes` d'éveil, par pas de PAS_S.
function botMarche(state, secondes) {
  const pas = DATA.SIMULATION.PAS_S;
  for (let t = 0; t + EPS < secondes; t += pas) tick(state, Math.min(pas, secondes - t));
}

/* -- I2 : le portage. Ce qu'il vend au port, il l'y porte : avant de partir, il note ce que botSell vendrait
   (botStore et botSell en mode chargement) et en charge le plus cher au volume d'abord, autant qu'il en tient (le
   reste demeure à la ferme) ; la brouette dès qu'il peut la fabriquer (l'Atelier), la charrette s'il en a une et
   un cheval. La marche va VILLAGE.CHEMIN.VITESSE % plus vite (le chemin du port), et CHEVAL.VITESSE fois plus vite
   avec un cheval. Au port, il décharge sous la halle (tout se vend), puis joue le reste de sa sortie. */
function botVehicule(state) {
  if (countItem(state, 'brouette') < 1) botFabriquer(state, 'brouette');
  const v = ['charrette', 'brouette'].find((x) => !refusVehicule(state, x)) || 'mains';
  choisirVehicule(state, v, null, { sansPresence: true });
  return v;
}
function botChargement(state) {
  const voulu = [];
  aCharger.set(state, voulu);
  try { botStore(state); botSell(state); } finally { aCharger.delete(state); }
  voulu.sort((a, b) => sellPrice(b.item, state) / volumeDe(b.item) - sellPrice(a.item, state) / volumeDe(a.item) || (a.item < b.item ? -1 : 1));
  // (I1c : d'abord ce qui honore une commande du bac et les matériaux du chantier du port : botAPorter)
  let n = 0;
  for (const { item, qty } of [...botAPorter(state, true), ...voulu]) { const r = chargerPortage(state, item, qty, null, { sansPresence: true }); if (r.ok) n += r.n; }
  return n;
}

/* -- I1c : le bac, ses commandes, le chantier du port. Avant de partir, il charge en premier de quoi honorer les
   commandes du bac (ce qu'il a, hors semences gardées) et, quand ses pièces approchent du prix du niveau suivant du
   port (SIMULATION.PORT.CHANTIER, en part du prix) et qu'il le vise encore (NIVEAU_MAX), ses matériaux (réunis : les
   planches fabriquées, la pierre et les lingots fournis). Au port, avant de décharger (tout ce qui reste se vend), il
   honore les commandes et apporte les matériaux au chantier ; botBuy paie le niveau (l'étape « port » du plan). */
function botVisePort(state) {
  const SP = DATA.SIMULATION.PORT, nx = villageActif(state) ? prochainNiveau(state) : null;
  return nx && nx.niveau <= (SP.NIVEAU_MAX || 1) && state.pieces >= nx.pieces * (SP.CHANTIER || 0) ? nx : null;
}
// Ce qu'il porte en plus : [{ item, qty }]. `reunir` : les matériaux qui manquent sont réunis (sinon : ce qu'il a).
function botAPorter(state, reunir = false) {
  if (!villageActif(state)) return [];
  const out = [], semences = botSemences(state), charge = (k) => chargeDe(state)[k] || 0;
  // (fiche I8b, la stratégie « production » : ce qu'il a pour ses contrats d'export, avant le reste)
  if (vocationDe.has(state)) {
    for (const c of contratsAcceptes(state)) {
      const q = Math.min(c.quantite - c.livre - charge(c.objet), Math.floor(sellableCount(state, c.objet) + EPS) - (semences[c.objet] || 0));
      if (q >= 1) out.push({ item: c.objet, qty: q });
    }
  }
  for (const c of commandesDuBac(state)) {
    const manque = c.quantite - c.charge;
    if (manque <= 0) continue;
    if (Math.floor(sellableCount(state, c.objet) + EPS) - (semences[c.objet] || 0) >= manque) out.push({ item: c.objet, qty: manque });
  }
  const nx = botVisePort(state);
  if (nx) {
    for (const [k, n] of Object.entries(nx.manque)) {
      const q = n - charge(k);
      if (q <= 0) continue;
      // (les planches : fabriquées à l'Atelier ; trop fatigué pour toutes, le reste lui est fourni, compté comme les
      // bruts : materiauxFournis)
      if (reunir && !botReunir(state, { [k]: q }) && k === 'planche') fournir(state, k, q - countItem(state, k));
      if (countItem(state, k) >= 1) out.push({ item: k, qty: Math.min(q, Math.floor(countItem(state, k))) });
    }
  }
  return out;
}
// Au port (avant de décharger) : les commandes qu'il peut honorer, les matériaux au chantier.
function botAuBac(state) {
  avancerBac(state);
  for (const c of commandesDuBac(state)) if (c.prete) honorerCommande(state, c.id, null, { sansPresence: true });
  if (prochainNiveau(state)) apporterAuChantier(state, null, { sansPresence: true });
  botContrats(state);
}

/* -- fiche I8b : la stratégie « production » (SIMULATION.VOCATIONS.production) --
   Au port, il livre à ses contrats ce qu'il a porté, puis accepte ceux qu'il sait tenir (CONTRATS : les objets qu'il
   produit en volume, le pain d'abord). Ses villageois : TACHES (les champs, les machines qui moulent et cuisent, la
   tournée qui livre les contrats) ; il ne les réattribue pas. Le quai de chargement, dès que le port l'ouvre. Plus de
   blé aux champs (PART_PLEIN_CHAMP). La stratégie « village » est le joueur appliqué (la fiche I8a n'a pas encore de
   fêtes ni de projets pour lui). */
function botContrats(state) {
  const strat = vocationDe.get(state);
  if (!strat || !strat.CONTRATS) return;
  for (const c of contratsAcceptes(state)) if ((chargeDe(state)[c.objet] || 0) > 0) livrerContrat(state, c.id, null, { sansPresence: true });
  const d = contratsDuPort(state);
  if (!d) return;
  for (const c of d.proposes) {
    if (contratsAcceptes(state).length >= d.max) break;
    if (strat.CONTRATS.includes(c.objet)) accepterContrat(state, c.id, null, { sansPresence: true });
  }
}

// Le quai de chargement (dès que le port l'ouvre) : fabriqué à l'Atelier (ses lingots fournis s'il en manque, comptés),
// posé sur deux cases libres de la ferme.
function botQuai(state) {
  const strat = vocationDe.get(state);
  if (!strat || !strat.QUAI || Object.values(state.blocs || {}).includes('quai_chargement')) return;
  if (craftStatus(state, 'quai_chargement').raison && /port/.test(craftStatus(state, 'quai_chargement').raison)) return;
  if (countItem(state, 'quai_chargement') < 1) {
    const e = DATA.ATELIER.RECETTES.quai_chargement.entrees;
    for (const [k, n] of Object.entries(e)) if (countItem(state, k) < n && ['lingot_fer', 'pierre'].includes(k)) fournir(state, k, n - countItem(state, k));
    if (!botFabriquer(state, 'quai_chargement')) return;
  }
  const T = farmTerrain(state), W = T.LARGEUR, F = T.FERME;
  for (let r = F.Y + 2; r < F.Y + F.HAUTEUR - 2; r++) {
    for (let c = F.X + 2; c < F.X + F.LARGEUR - 3; c++) {
      const t = r * W + c;
      if (poserBloc(state, 'quai_chargement', t).ok) return;
    }
  }
}

// Le bilan d'une partie pour comparer les vocations : { pieces, gagne (tout ce qui est entré au fil de la partie : à
// remplir par l'appelant), bonheurFamille, bonheurVillageois (la moyenne), villageois, amis (les paires « ami » ou
// « proche »), liens (les paires « camarade » ou plus), production (le score), contrats (honorés) }.
export function bilanVocation(state) {
  const V = villageoisDe(state).filter((v) => !v.enfant);
  const paires = villageActif(state) ? quiEstLie(state).paires : [];
  return {
    pieces: Math.round(state.pieces), bonheurFamille: Math.round(averageHappiness(state)),
    bonheurVillageois: V.length ? Math.round(V.reduce((t, v) => t + (Number(v.bonheur) || 0), 0) / V.length) : 0,
    villageois: V.length, amis: paires.filter((p) => p.palier >= 3).length, liens: paires.length,
    production: scoreVocation(state, 'production').score,
    contrats: (state.production && state.production.contrats && state.production.contrats.honores) || 0,
  };
}

// La sortie au port, si elle s'impose : il y va, joue `fn` (le commerce possible), rentre. → vrai s'il y est allé.
export function botSortiePort(state, fn) {
  const SP = DATA.SIMULATION.PORT;
  if (!villageActif(state) || !marcheOuvert(state) || sortiesPort.get(state) === state.day) return false;
  if (botValeurAVendre(state) < SP.SEUIL && !botManqueGraines(state) && !botAPorter(state).length) return false;
  const g = farmSeed(state), lieu = g === null ? null : portDuMonde(g), T = farmTerrain(state);
  if (!lieu) return false;
  const vehicule = botVehicule(state);
  const vitesse = SP.VITESSE * bonusChemin(state) * (vehicule === 'charrette' || chevalPossede(state) ? DATA.CHEVAL.VITESSE : 1);
  const aller = (lieu.chemin + (T.FERME ? T.FERME.LARGEUR / 2 : 0)) / vitesse;
  // (il faut arriver au comptoir ouvert)
  const arrivee = awakeHours(state) + aller / DATA.TEMPS.SECONDES_PAR_HEURE;
  if (arrivee < PORT.HEURES[0] || arrivee >= PORT.HEURES[1]) return false;
  sortiesPort.set(state, state.day);
  const charge = botChargement(state);
  botMarche(state, aller);
  botPassageCaleche(state, () => { botAuBac(state); if (charge) dechargerAuPort(state, null, { sansPresence: true }); fn(); });
  botMarche(state, aller);
  return true;
}

// Vend ce qui périrait demain (hors réserve de semences et ce que la famille mangera ce soir), la laine,
// le blé en trop et la paille en trop. Avec un réfrigérateur en marche, on range au lieu de vendre.
export function botSell(state) {
  const S = DATA.SIMULATION;
  // version 1.10 : le frigo a une capacité ; ce qui n'y tient pas et périrait se vend
  {
    const expiring = expiringSoon(state);
    // (la famille qui mangera ce soir, FAIM_JOUR dépensés : on lui garde de quoi se rassasier)
    let faim = familleAffameeCeSoir(state);
    const semences = botSemences(state);
    for (const item of Object.keys(expiring)) {
      const garde = Math.min(expiring[item], Math.ceil(faim / Math.max(1, valeurAliment(item))));
      faim -= garde * valeurAliment(item);
      const spare = Math.min(expiring[item] - garde, countItem(state, item) - (semences[item] || 0));
      if (spare >= 1) sellItem(state, item, Math.floor(spare));
    }
  }
  const laine = countItem(state, 'laine');
  if (laine >= 1) sellItem(state, 'laine', laine);
  const ble = countItem(state, DATA.SILO.ITEM) - S.BLE_MAX;
  if (ble >= 1) sellItem(state, DATA.SILO.ITEM, ble);
  // la paille en trop (sans animaux, toute la paille), et la farine en trop
  const paille = strawStock(state) - strawNeed(state) * S.PAILLE_MAX_NUITS;
  if (paille >= 1) sellItem(state, DATA.PATURAGE.NOURRITURE, paille);
  const vs = vocationDe.get(state);   // (I8b : la stratégie « production » garde sa farine pour le pain)
  const farine = countItem(state, 'farine') - (vs && Number.isFinite(vs.FARINE_MAX) ? vs.FARINE_MAX : S.FARINE_MAX);
  if (farine >= 1) sellItem(state, 'farine', farine);
  // I0b : les récoltes et les œufs en trop (la boîte remplie : botStore passe avant), au-delà de
  // VIVRES_GARDES de chacun et des semences gardées (de quoi cuisiner, ressemer, offrir)
  const semences = botSemences(state);
  for (const item of Object.keys(inventoryCounts(state))) {
    const def = DATA.OBJETS[item];
    if (!def || def.plat || !def.mangeable || !['légume', 'fruit', 'produit'].includes(def.categorie)) continue;
    const trop = Math.floor(countItem(state, item) - S.VIVRES_GARDES - (semences[item] || 0));
    if (trop >= 1) sellItem(state, item, trop);
  }
}

// Points de jauge que la famille mangera ce soir : ceux des membres qui, FAIM_JOUR dépensés,
// arriveront au seuil (botDay) et mangeront jusqu'à rassasiés.
function familleAffameeCeSoir(state) {
  const F = DATA.FAMILLE.FAIM;
  return mangeurs(state).reduce((t, m) => {
    const j = jaugeMembre(m) - DATA.SIMULATION.FAIM_JOUR;
    return j <= F.SEUIL ? t + F.MAX - Math.max(0, j) : t;
  }, 0);
}

// Ce que le joueur garde de côté pour ressemer : les récoltes qui sont leur propre semence (la patate),
// SEMENCES_GARDEES de chacune. { item: n }
function botSemences(state) {
  const out = { ...(state.famille.reserve || {}) };
  for (const c of Object.keys(DATA.CULTURES)) {
    if (seedItem(c) === cropProduct(c)) out[seedItem(c)] = Math.max(out[seedItem(c)] || 0, DATA.SIMULATION.SEMENCES_GARDEES);
  }
  return out;
}

// Range au frais ce qui périme (sauf les semences gardées), tant qu'il y a de la place : d'abord ce qui
// périme le plus tôt. Sans frigo, la famille mange à la boîte à nourriture du foyer (fabriquée à
// l'Atelier et posée : botBatir) : elle s'y remplit, les plats d'abord.
function botStore(state) {
  const f = state.frigo, reserve = botSemences(state);
  if (f.construit) {
    // (I4 : sur l'île, les baies — des milliers, cueillies en passant — ne remplissent plus le frigo, où mangent la
    // famille et les villageois : il en garde VIVRES_GARDES au frais, le reste attend dans l'inventaire ; avant, le
    // frigo plein de baies laissait les villageois sur leur faim, cinq baies par repas)
    if (villageActif(state)) reserve.baies = Math.max(reserve.baies || 0, Math.floor(countItem(state, 'baies')) - DATA.SIMULATION.VIVRES_GARDES);
    if (f.appareil.allume && !isBroken(f.appareil)) moveAllToFridge(state, reserve);
    return;
  }
  if (!boitePosee(state) && (!houseRepaired(state) || !botBatir(state, 'boite').buy().ok)) return;
  // (les plats d'abord : ils rendent du bonheur ; puis ce qui périme le plus tôt)
  const items = Object.keys(inventoryCounts(state)).filter((k) => DATA.OBJETS[k] && DATA.OBJETS[k].mangeable);
  items.sort((a, b) => dishHappiness(b) - dishHappiness(a) || lotRank(lotsOf(state, a)[0]) - lotRank(lotsOf(state, b)[0]));
  for (const item of items) {
    const n = countItem(state, item) - (reserve[item] || 0);
    if (n >= 1) deposerBoite(state, item, Math.floor(n));
  }
}

/* ---------- fiche 9b : sortir dans le grand monde ---------- */

// Les objectifs de la campagne qui se font dans le monde, et que le joueur simulé sait faire.
const OBJECTIFS_MONDE = new Set(['hameaux', 'monde', 'pecheMer', 'faune']);

// Ce qu'il sait du monde de sa graine : la tournée de la calèche (le fil des chemins, ses arrêts dans
// l'ordre), les plans des hameaux, les coins de pêche. Tiré une fois par graine
// (les éléments du plan : quelques centaines de ms), seulement le jour où un objectif le demande.
const mondes = new Map();
function mondeDuBot(state) {
  const T = farmTerrain(state), g = farmSeed(state);
  if (!T.MONDE || g === null) return null;
  if (!mondes.has(g)) {
    const sol = solDirect(T), el = elementsSol(sol.ctx), cadre = sol.ctx.cadre;
    const tour = cadre.PORT ? null : poserTournee(g, tourneeDuPlan({ W: cadre.LARGEUR, chemins: el.chemins, hameaux: el.lieux.hameaux, sortie: cadre.SORTIE, ferme: cadre.FERME }));
    const plans = new Map(sol.ctx.hameaux.plans.map((p) => [p.id, p]));
    mondes.set(g, { W: cadre.LARGEUR, tour, plans, lieux: el.lieux, sortie: cadre.SORTIE });
    while (mondes.size > 3) mondes.delete(mondes.keys().next().value);
  }
  return mondes.get(g);
}

// La case du point k du tour.
const caseDuTour = (m, k) => Math.floor(m.tour.y[k]) * m.W + Math.floor(m.tour.x[k]);
const distCases = (m, a, b) => Math.hypot((a % m.W) - (b % m.W), Math.floor(a / m.W) - Math.floor(b / m.W));

// Une excursion par jour, le soir, quand le chapitre en cours demande d'aller dans le monde : il suit
// le chemin de la calèche jusqu'au prochain hameau qu'il ne connaît pas (ce qu'il voit en route devient
// vu, le hameau découvert et peuplé) ; une fois tous vus, il fait le tour entier ; il pêche dans la mer, à son
// coin le plus proche. Ce sont les
// actions du moteur (voirAutour, voirHameau, peuplerHameau, castLine), sans carte : le trajet n'est pas
// marché pas à pas, et ne coûte que l'énergie de la pêche.
export function botMonde(state) {
  const c = state.campagne;
  if (!c || c.fini) return false;
  const restants = chapterProgress(state).objectifs.filter((o) => !o.ok && OBJECTIFS_MONDE.has(o.type)).map((o) => o.type);
  if (!restants.length) return false;
  const m = mondeDuBot(state);
  if (!m || !m.tour) return false;
  const voirJusqua = (k1) => {
    for (let k = 0; k <= k1; k += 4) voirAutour(state, caseDuTour(m, k));
  };
  if (restants.includes('hameaux') || restants.includes('monde') || restants.includes('faune')) {
    const vus = hameauxVus(state);
    const suivant = m.tour.arrets.find((a) => a.sorte === 'hameau' && !vus[a.id] && m.plans.has(a.id));
    if (suivant) {
      voirJusqua(suivant.k);
      const plan = m.plans.get(suivant.id);
      voirHameau(state, plan);
      peuplerHameau(state, plan);
    } else voirJusqua(m.tour.x.length - 1);
  }
  // I0b : les bêtes du monde qu'il croise : celles des régions du chemin dont la place est dans ce qu'il a
  // vu (leur page de l'encyclopédie se découvre, comme quand la scène en montre une)
  if (restants.includes('faune')) botFaune(state, m);
  if (restants.includes('pecheMer')) {
    const coin = [...(m.lieux.peche || [])].filter((p) => p.eau === 'mer').sort((a, b) => distCases(m, a.case, m.sortie) - distCases(m, b.case, m.sortie))[0];
    if (coin) {
      voirAutour(state, coin.case, { biome: 'plage' });
      if (!botOutil(state, 'canne')) return true;
      for (let k = 0; k < DATA.SIMULATION.LANCERS_MER && (c.compteurs.pecheMer || 0) < 1; k++) if (!castLine(state, 'mer', coin.id).ok) break;
    }
  }
  return true;
}

// Les bêtes des régions que traverse la tournée, vues si leur place l'a été (caseVue).
function botFaune(state, m) {
  const T = farmTerrain(state), sol = solDirect(T);
  if (!sol) return;
  const regions = new Set();
  for (let k = 0; k < m.tour.x.length; k += 4) regions.add(regionDeCase(caseDuTour(m, k), m.W));
  for (const cle of [...regions].sort()) {
    const [rx, ry] = cle.split(',').map(Number);
    const f = sol.region(rx, ry).faune;
    for (let i = 0; i + 3 < f.length; i += 4) {
      const t = Math.floor(f[i + 2] / 16) * m.W + Math.floor(f[i + 1] / 16);
      const e = `faune:${ESPECES_FAUNE[f[i]]}`;
      if (!(state.encyclopedie && state.encyclopedie.evenements && state.encyclopedie.evenements[e]) && caseVue(state, t, T)) noterEncyclopedie(state, e);
    }
  }
}

/* ---------- I0b : les habitants des hameaux (l'amitié, les projets, le repas partagé) ---------- */

// Les objectifs du chapitre en cours pas encore remplis, par type.
function restantsDuChapitre(state) {
  const c = state.campagne;
  if (!c || c.fini) return new Set();
  return new Set(chapterProgress(state).objectifs.filter((o) => !o.ok).map((o) => o.type));
}

// Le hameau où il va voir les habitants : le premier peuplé de la tournée de la calèche (le plus proche).
function botHameauVoisin(state) {
  const m = mondeDuBot(state), H = habitantsDe(state);
  if (!m || !m.tour) return null;
  const a = m.tour.arrets.find((x) => x.sorte === 'hameau' && H[x.id] && Array.isArray(H[x.id].foyers) && H[x.id].foyers.length);
  return a ? a.id : null;
}

// Le cadeau pour l'habitant `mb` : ce qu'il adore, sinon ce qu'il aime, parmi ce qui s'offre (hors semences
// gardées) ; null s'il n'y a rien qui lui plaise.
function botCadeau(state, mb) {
  const garde = botSemences(state);
  const rang = { adore: 2, aime: 1 };
  const choix = Object.keys(state.inventaire || {}).filter((it) => offrable(it) && countItem(state, it) - (garde[it] || 0) >= 1 && rang[goutPour(mb, it)])
    .sort((a, b) => rang[goutPour(mb, b)] - rang[goutPour(mb, a)] || DATA.OBJETS[a].prix - DATA.OBJETS[b].prix || (a < b ? -1 : 1));
  return choix[0] || null;
}

// Une visite au hameau voisin, le soir, quand le chapitre demande un ami, un repas partagé ou un projet : il
// passe (visiterHameau), parle à chacun (parlerAmitie), offre à chacun ce qu'il aime s'il l'a (offrir), et
// apporte au projet du hameau ce qui lui manque (apporterAuProjet : du bois, des pierres, des fibres, fournis
// comme les autres matériaux bruts). Le trajet n'est pas marché, comme les sorties de botMonde.
export function botVoisins(state) {
  const restants = restantsDuChapitre(state);
  if (!['amis', 'repas', 'projets'].some((t) => restants.has(t))) return false;
  const hid = botHameauVoisin(state);
  if (!hid) return false;
  visiterHameau(state, hid);
  for (const f of habitantsDe(state)[hid].foyers) {
    for (const mb of f.membres || []) {
      parlerAmitie(state, hid, mb.id);
      const cadeau = botCadeau(state, mb);
      if (cadeau) offrir(state, hid, mb.id, cadeau);
    }
  }
  if (restants.has('projets')) {
    const pr = projetDuHameau(state, hid);
    if (pr && !pr.fait && botReunir(state, pr.manque)) apporterAuProjet(state, hid);
  }
  return true;
}

// Le repas partagé (objectif « repas ») : il invite pour le déjeuner du lendemain les habitants qu'il
// connaît le mieux (INVITES_MAX au plus) ; le jour dit, il reste éveillé jusqu'au repas (botDay) et le sert
// (botServir). Une invitation refusée ou manquée ne coûte rien : il en refait une.
function botInviter(state) {
  if (!restantsDuChapitre(state).has('repas')) return;
  const I = DATA.AMITIE.INVITATION, j = state.day;
  if (invitationsDe(state).liste.some((x) => x.jour > j && (x.etat === 'envoyee' || x.etat === 'repondue'))) return;
  const qui = relationsInvitables(state).slice(0, I.INVITES_MAX).map((r) => ({ hameau: r.hameau, id: r.id }));
  if (qui.length) inviter(state, j + I.DELAI[0], 'midi', qui);
}

// L'heure (en secondes d'éveil depuis le réveil) où il doit être à table aujourd'hui, ou 0.
function botHeureDuRepas(state) {
  const I = DATA.AMITIE.INVITATION;
  const inv = invitationsDe(state).liste.find((x) => x.jour === state.day && x.etat === 'repondue' && x.invites.some((q) => q.reponse === 'oui'));
  return inv ? (I.MOMENTS[inv.moment].heure - DATA.TEMPS.HEURE_REVEIL) * DATA.TEMPS.SECONDES_PAR_HEURE : 0;
}

// À table : il sert les plats qu'il a (PLATS_MAX au plus, les plats d'abord).
function botServir(state) {
  const inv = invitationDuMoment(state);
  if (!inv || inv.etat === 'servie') return;
  servirRepas(state, inv.id, platsServables(state).slice(0, DATA.AMITIE.INVITATION.REPAS.PLATS_MAX), false);
}

// Les produits des hameaux (objectif « achatsHameaux ») : à son passage, il achète au coffre de la calèche ce
// qui coûte le moins, jusqu'au compte.
function botAchatsHameaux(state) {
  const o = state.campagne && !state.campagne.fini && chapterProgress(state).objectifs.find((x) => x.type === 'achatsHameaux' && !x.ok);
  if (!o || !botCalecheLa(state)) return;
  const coffre = (state.caleche && state.caleche.coffre) || {};
  const items = Object.keys(coffre).filter((it) => coffre[it] > 0 && DATA.OBJETS[it]).sort((a, b) => DATA.OBJETS[a].prix - DATA.OBJETS[b].prix || (a < b ? -1 : 1));
  let reste = o.cible - o.valeur;
  for (const it of items) {
    if (reste <= 0) break;
    const r = acheterCaleche(state, it, Math.min(reste, coffre[it]), null, { sansPresence: true });
    if (r.ok) reste -= r.bought;
  }
}

/* ---------- une journée, une partie ---------- */

// Série d'actions du joueur. `soir` : dernière série avant de dormir.
function botActions(state, strat, options, soir) {
  // (ce que l'écran fait en jeu à chaque rendu : la tournée de la calèche avance, les objectifs du jour se
  // valident et donnent leur récompense)
  majCaleche(state);
  majObjectifs(state);
  botMaintenance(state);
  botMail(state);
  botSnack(state);
  botRamasser(state); // I0b : les pierres, le bois et les baies que la ferme offre ce matin
  botBuy(state, strat.eveilS);
  botEau(state);
  // version 1.14 : les plats d'abord (quelques points d'énergie) : sans eux, plus de
  // bonheur, et chaque action coûte jusqu'au double ; une grande ferme épuisait l'énergie
  // avant la cuisine.
  botObjectives(state);
  botCook(state);
  // (les bêtes d'abord, leur paille et leur tonte : les cultures et le labour prennent
  // l'énergie qui reste)
  botScythe(state);
  botHens(state);
  botSheep(state);
  botFarm(state);
  botHoe(state);
  botOrchard(state);
  botMill(state);
  botCook(state);
  botServir(state); // I0b : un repas partagé, s'il y a des invités à table
  botVillageois(state); // I3c : une maison de villageois, leurs tâches (le chantier allumé ; éteint : rien)
  if (vocationDe.has(state)) botQuai(state); // I8b : la stratégie « production »
  if (!soir) return;
  botMonde(state); // fiche 9b : une sortie dans le grand monde, si le chapitre la demande
  botVoisins(state); // I0b : le hameau voisin, si le chapitre demande un ami, un repas, un projet
  botInviter(state);
  // I0b : la calèche à son passage (le seul moment où il commerce) ; I1b : le chantier allumé, sa sortie au port
  (villageActif(state) ? botSortiePort : botPassageCaleche)(state, () => {
    botStore(state); // version 1.10 : ranger d'abord, vendre ce qui n'a pas tenu au frais
    botSell(state);
    botAchatsHameaux(state);
    botFarm(state); // (les graines achetées : semées tout de suite)
    botBuy(state, strat.eveilS);
    if (options.depannage) {
      const item = options.depannage.item;
      const price = buyPrice(state, item);
      options.depannage.dernier = { prix: price, possible: marcheOuvert(state) && canPay(state, price) };
      if (options.depannage.dernier.possible) buyItem(state, item, 1);
    }
  });
  botStore(state);
}

// Une journée complète : des séries d'actions tous les PAS_S secondes pendant
// `eveilS` secondes, puis Dormir. Renvoie le compte rendu du réveil. I0b : un jour de repas
// partagé, il reste éveillé jusqu'à l'heure du repas (botHeureDuRepas).
export function botDay(state, strat, options) {
  const S = DATA.SIMULATION;
  const eveil = Math.max(strat.eveilS, awakeRequired(state), botHeureDuRepas(state));
  botActions(state, strat, options, false);
  let t = 0;
  while (t + EPS < eveil) {
    const dt = Math.min(S.PAS_S, eveil - t);
    tick(state, dt);
    t += dt;
    botActions(state, strat, options, t + EPS >= eveil);
  }
  // la famille ne marche pas sur une carte : sa faim de la journée est simulée (FAIM_JOUR)
  for (const m of mangeurs(state)) depenserMembre(state, m.id, S.FAIM_JOUR);
  repasStep(state);
  return sleep(state);
}

/* ---------- I0b : les comptes de la simulation ---------- */

// Le poste d'une écriture des Comptes (compta.js), pour la simulation : les ventes par sorte (cultures,
// plats, produits, autres), les graines, les achats aux hameaux, les appareils, les technologies, les
// bâtiments, l'entretien, le courrier ; sinon le début du libellé (posteCompta).
let nomsObjets = null;
// (I1b : « Port : … » est une vente au port quand `montant` est un gain, un achat sinon)
export function posteSimulation(libelle, montant = 0) {
  let [tete, ...reste] = String(libelle || '').split(' : ');
  if (tete === 'Port') tete = montant > 0 ? 'Vente' : 'Achat';
  // (I1c : une commande du bac honorée est une vente, sa prime à part ; un import, un achat ; un niveau du port)
  if (tete === 'Bac') tete = 'Vente';
  if (tete === 'Import' && montant < 0) tete = 'Achat';
  if (tete === 'Prime du bac') return 'primes_bac';
  // (I8b : une livraison à un contrat d'export est une vente ; sa prime à part)
  if (tete === 'Contrat') tete = 'Vente';
  if (tete === 'Prime du contrat') return 'primes_contrats';
  if (tete.startsWith('Port agrandi')) return 'port';
  const nom = reste.join(' : ');
  if (!nomsObjets) nomsObjets = new Map(Object.entries(DATA.OBJETS).map(([id, d]) => [d.nom, id]));
  const id = nomsObjets.get(nom), def = id ? DATA.OBJETS[id] : null;
  const cultures = new Set(Object.keys(DATA.CULTURES).map((c) => cropProduct(c)));
  switch (tete) {
    case 'Vente':
      if (!def) return 'vente_autres';
      if (def.plat) return 'vente_plats';
      if (def.categorie === 'légume' || def.categorie === 'fruit' || cultures.has(id)) return 'vente_cultures';
      if (def.categorie === 'produit' || def.categorie === 'ingrédient') return 'vente_produits';
      return 'vente_autres';
    case 'Achat':
      if (def && def.arbre) return 'arbres';
      if (def && (def.categorie === 'graine' || Object.keys(DATA.CULTURES).some((c) => seedItem(c) === id))) return 'graines';
      if (id === FRIGO_OBJET) return 'appareils';
      return 'achats_autres';
    case 'Calèche': return 'achats_hameaux';
    case 'Commande': return 'commandes';
    case 'Technologie': return 'technologies';
    case 'Amélioration': return 'appareils';
    case 'Entretien': case 'Réparation': return 'entretien';
    case 'Lettre': return 'courrier';
    case 'Poulailler agrandi': case 'Place à l\'Étable': return 'batiments';
    default: return posteCompta(libelle);
  }
}

// Joue `nuits` nuits à partir de `state` (l'appelant passe une copie : elle est
// modifiée). Renvoie une ligne par nuit : chapitre au début de la journée,
// énergie du personnage et bonheur au réveil,
// pièces et conserves au réveil.
// I0b : et les comptes de la journée (gains, depenses : { poste: pièces }, posteSimulation), suivis à
// chaque écriture (suivreComptes : sans la borne de COMPTA_MAX lignes, hors sauvegarde) ; ce qui change
// les pièces sans passer par les Comptes (la récompense des objectifs du jour) est mis au poste
// « objectifs_du_jour » ; fournis : les matériaux bruts fournis ce jour-là (materiauxFournis).
// options.depannage = { item } : chaque soir, le joueur achète aussi une unité de
// cet aliment au Marché (vérification de la section 8.11).
export function simulatePlay(state, strategyId, nights = DATA.SIMULATION.NUITS, options = {}) {
  const strat = options.strat || DATA.SIMULATION.STRATEGIES[strategyId];
  if (!strat) throw new Error(`Stratégie inconnue : ${strategyId}`);
  const rows = [];
  let jour = null;
  const arreter = suivreComptes((s, montant, libelle) => {
    if (s !== state || !jour) return;
    const poste = posteSimulation(libelle, montant), sorte = montant > 0 ? jour.gains : jour.depenses;
    sorte[poste] = (sorte[poste] || 0) + Math.abs(montant);
  });
  try {
    for (let i = 0; i < nights; i++) {
      const nuit = state.day;
      const chapitre = chapterReached(state);
      if (options.depannage) options.depannage.dernier = null;
      jour = { gains: {}, depenses: {} };
      const avant = state.pieces, fournisAvant = materiauxFournis(state);
      botDay(state, strat, options);
      const somme = (o) => Object.values(o).reduce((t, v) => t + v, 0);
      const horsComptes = Math.round(state.pieces - avant - (somme(jour.gains) - somme(jour.depenses)));
      if (horsComptes > 0) jour.gains.objectifs_du_jour = horsComptes;
      else if (horsComptes < 0) jour.depenses.hors_comptes = -horsComptes;
      const fournisApres = materiauxFournis(state), fournis = {};
      for (const [k, n] of Object.entries(fournisApres)) if (n > (fournisAvant[k] || 0)) fournis[k] = n - (fournisAvant[k] || 0);
      rows.push({
        nuit,
        chapitre,
        couverture: state.nuit.couverture,
        energie: energyLevel(state),
        energieMax: Math.floor(energyMax(state) / 1000),
        bonheur: averageHappiness(state),
        niveau: state.progression ? state.progression.niveau : 0,
        pieces: state.pieces,
        conserves: countItem(state, 'conserve'),
        tuiles: soilCount(state),
        depannage: options.depannage ? options.depannage.dernier : null,
        gains: jour.gains,
        depenses: jour.depenses,
        fournis,
      });
    }
  } finally {
    arreter();
  }
  return rows;
}

// Partie neuve de `nights` nuits, jouée par la stratégie donnée. I0b : la partie neuve d'aujourd'hui,
// celle que le joueur commence (js/ui/depart.js) : la terre sauvage, la famille de départ, son abri, les
// pièces d'une terre sauvage (DEPART.PIECES_SAUVAGE) et les objectifs du jour (commencerObjectifs).
export function simulateGame(strategyId, nights = DATA.SIMULATION.NUITS, seed = DATA.SIMULATION.GRAINE, options = {}) {
  const state = createNewGame(seed, { nom: 'Simulation' });
  commencerObjectifs(state);
  return simulatePlay(state, strategyId, nights, options);
}

// Fiche I8b : une partie neuve jouée par une stratégie de vocation (SIMULATION.VOCATIONS : « village », « production »),
// le chantier allumé par l'appelant. → { rows (comme simulatePlay), bilan (bilanVocation à la dernière nuit), state }.
export function simulateVocation(id, nights = DATA.SIMULATION.NUITS, seed = DATA.SIMULATION.GRAINE) {
  const strat = DATA.SIMULATION.VOCATIONS && DATA.SIMULATION.VOCATIONS[id];
  if (!strat) throw new Error(`Vocation inconnue : ${id}`);
  const state = createNewGame(seed, { nom: 'Simulation' });
  commencerObjectifs(state);
  if (strat.vocation === 'production') vocationDe.set(state, strat);
  const rows = simulatePlay(state, id, nights, { strat });
  return { rows, bilan: bilanVocation(state), state };
}

// Joue `nights` nuits sur une COPIE de la partie (la partie en cours n'est pas
// touchée) : sert au bouton du mode test.
export function simulateFromCopy(state, strategyId = 'applique', nights = 60) {
  const copy = JSON.parse(JSON.stringify(state));
  copy.ramassage = false; // version 1.18 : le joueur automatique n'a pas de personnage qui ramasse
  return simulatePlay(copy, strategyId, nights);
}
