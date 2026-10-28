import { DATA } from '../engine/catalog.js';
import { proposerScene } from './scene.js';
import { escapeHtml, formatLitres } from '../engine/format.js';
import { clockHours, nightActive } from '../engine/clock.js';
import { mainCharacter, setupPending } from '../engine/depart.js';
import { findDevice, isOwned, starterOf, tankCapacity } from '../engine/devices.js';
import { furnitureCount } from '../engine/meubles.js';
import { fridgeUnits } from '../engine/fridge.js';
import { memberPerso, petSheets } from '../engine/family.js';
import { allPlots, findPlot, growHoursLeft, hoeableTiles, terrainLines, isMature, maxStage, seedStock, soilCap, soilCount } from '../engine/crops.js';
import { ripeTrees, treeInBloom, treeStage } from '../engine/orchard.js';
import { coopCapacity, sheepToShear, stableHoused, woolReady } from '../engine/animals.js';
import { techAuto } from '../engine/techtree.js';
import { chapterProgress, isUnlocked, plantableCropsFor } from '../engine/campaign.js';
import { alertSnapshot, getNotifications } from '../engine/alerts.js';
import { aidant, aideAFaire, aideBetes, collectAt, pickUp, pickUpAll, piles } from '../engine/ramassage.js';
import { estTacheCompagnon, faireCompagnon, journeeCompagnon, tachesCompagnon } from '../engine/compagnon.js';
import { marcherMembre } from '../engine/repas.js';
import { fleursPourAbeilles, ruchePleine, ruchesARecolter } from '../engine/ruches.js';
import { TIRED } from '../engine/stamina.js';
import { brokenRocks, cutBushes, cutGrass, enSelle, fellenTrees, morceauxDe, poussesArbres, arbresPlantes } from '../engine/outils.js';
import { asleep } from '../engine/night.js';
import { absoluteHours } from '../engine/clock.js';
import { farmMap, farmTerrain, tileCount, voirRegion } from '../engine/terrain.js';
import { MONDE } from '../engine/monde.js';
import { BIOMES } from '../engine/monde-gen.js';
import { boussoleMontree, butBoussole, choisirBut, etatBoussole, lieuxDeLaCarte, voirAutour, vuDe } from '../engine/monde-vu.js';
import { LIEUX_ICONES, carteMondeVu } from './carte-monde.js';
import { tuilesChemins } from '../engine/ferme-generee.js';
import { solDuMonde } from './monde-sol.js';
import { robotBattery, robotChargePct, robotOn, robotStation, robotTrip } from '../engine/automation.js';
import { notify } from './toasts.js';
import { encyclopedieFaune, encyclopedieHameau, openEncyclopedie } from './encyclopedie.js';
import { HAMEAUX, voirHameau } from '../engine/monde-hameaux.js';
import { HABITANTS, habitantsPourLaCarte } from '../engine/habitants.js';
import { bienvenueModele } from '../engine/bienvenue.js';
import { visiteDepuisCarte } from './bienvenue.js';
import { habitantDepuisCarte, openFicheHameau, paroleDepuisCarte, peuplerDepuisCarte, peuplerLesVus } from './habitants.js';
import {
  activeTab, axeMode, buildMode, coucher, ecranFerme, hoeMode, pickMode, rodMode, scytheMode, setActiveTab, setComptoirTab, setEcranFerme, setInvTab, state, tabAvailable, TABS, etageVue, setEtageVue,
} from './store.js';
import { telView } from './consent.js';
import { persistState, safeStorageGet, safeStorageSet } from './storage.js';
import { morph, refresh, setLastRenderAt } from './render.js';
import {
  allerAuLieu, asleepFromStage, MAISON_TABS, openStageWindow, renderTabContent, setAncreVoulue,
  setStageInterior, setStageReturn, setStageWindow, stageInterior, STAGE_WINDOWS, windowLocked,
} from './stage-windows.js';
import { renderMoulin } from './cuisine.js';
import { objectiveValueText } from './chapitres.js';
import { registerActions } from './actions.js';
import { axeChipHtml, chopFromStage, fishFromStage, caillouFromStage, mineFromStage, mondeFromStage, morceauFromStage, pickChipHtml, rodChipHtml, scytheAroundFromStage, scytheChipHtml, scytheFromStage } from './outils.js';
import { casesOuvertesMonde, mondeCueillis, mondePris, noterIci } from '../engine/monde-recolte.js';
import { botteFromStage, ramasserFromStage, verserFromStage, verserGrainFromStage } from './atelier.js';
import { botteleuses } from '../engine/botteleuse.js';
import { distributeurDe, distributeurs, grainDans } from '../engine/distributeur.js';
import { chevalMonte, chevalOu, vitesseCheval } from '../engine/cheval.js';
import { countWithSilo } from '../engine/animals.js';
import { countItem } from '../engine/inventory.js';
import { ramassables } from '../engine/atelier.js';
import { blocsPoses, blocsDessusPoses, couchages, etatEcurie, etatEtable, etatMoulin, etatPoulailler, fenetresPosees, genrePiece, hauteursPosees, piecesCloses, serreMurs, serrePlaces, solsPoses } from '../engine/blocs.js';
import { buildChipHtml, meubleModele, niveauBati, niveauRang } from './chantier.js';
import { escaliers, etageBlocs, etageEmprise, fenetresEtage, toits } from '../engine/etage.js';
import { closeModal } from './modal.js';
import { itemsText } from './common.js';
import { aCruche, crucheCapacite, eauCruche, puitsPose } from '../engine/cruche.js';
import { allerAuPuits, puiserFromStage } from './cruche.js';
import { surbrillanceDidacticiel } from './didacticiel.js';
import { etapeDidacticiel, horsDeLaFerme } from '../engine/didacticiel.js';
import { alerteFaim, alerteSortie, vitessePied } from '../engine/equipement.js';
import { plantationModele } from './plantation.js';
import { runAction } from './events.js';
import { calecheDepuisCarte, calecheToucheeDepuisCarte, helerCaleche } from './caleche.js';


// Le Poulailler et l'Étable, bâtis (js/engine/blocs.js, etatEnclos) : les cases libres de
// l'enceinte et de l'enclos, et les bêtes qui y ont leur place (les autres ne se montrent pas).
function betesDesEnclos() {
  const out = [];
  if (state.poulailler.construit) {
    const e = etatPoulailler(state);
    out.push({ id: 'poulailler', piece: e.libresPiece, enclos: e.libresEnclos, betes: Array(Math.min(state.poulailler.poules, coopCapacity(state))).fill('poule') });
  }
  if (state.paturage.construit) {
    const e = etatEtable(state), l = stableHoused(state);
    out.push({ id: 'etable', piece: e.libresPiece, enclos: e.libresEnclos, betes: Array(l.moutons.size).fill('mouton').concat(Array(l.vaches.size).fill('vache')) });
  }
  // (le cheval, à l'Écurie quand il n'est ni monté ni attaché ailleurs : il y va et vient, jour et nuit)
  if (chevalOu(state) === 'ecurie') {
    const e = etatEcurie(state);
    if (e.piece && e.libresPiece.length) out.push({ id: 'ecurie', piece: e.libresPiece, enclos: e.libresPiece, betes: ['cheval'] });
  }
  return out;
}

// Les chemins posés (le bloc « chemin ») : les tuiles du sol qu'ils changent, calculées une
// fois par disposition (js/engine/ferme-generee.js, tuilesChemins).
let cheminsCle = null, cheminsVus = null;
function cheminsDuSol(T) {
  const cases = Object.entries(solsPoses(state)).filter(([, k]) => k === 'chemin').map(([c]) => Number(c));
  const cle = T.LARGEUR + ':' + cases.join(',');
  if (cle !== cheminsCle) {
    cheminsCle = cle;
    cheminsVus = { cases, tuiles: cases.length ? tuilesChemins(T, new Set(cases)) : [] };
  }
  return cheminsVus;
}
/* ---------- Carte Phaser (voir farm-stage.js et docs/architecture-phaser.md) ---------- */

// Découpe de chaque culture dans assets/crops.png (champ "sprite" de data/crops.json) :
// la scène ne lit pas DATA, elle la reçoit au montage.
function cropSprites() {
  const out = {};
  for (const [id, crop] of Object.entries(DATA.CULTURES)) if (crop.sprite) out[id] = crop.sprite;
  return out;
}

let stageMounted = false;
let stageMountedAt = 0;
let stageBroken = false; // Phaser a planté au montage : la Ferme garde sa liste classique
// Sans scène prête après ce délai (plantage au démarrage, images qui ne viennent pas), la
// Ferme repasse sur la liste classique ; la carte revient d'elle-même si elle finit par démarrer.
const STAGE_BOOT_MS = 12000;

export function stageUsable() {
  if (!(window.FarmStage && window.Phaser) || stageBroken) return false;
  // Jeu ouvert depuis le disque : le navigateur refuse de charger la carte et ses images.
  if (location.protocol === 'file:') return false;
  if (stageMounted && !FarmStage.ready() && Date.now() - stageMountedAt > STAGE_BOOT_MS) return false;
  return true;
}

// La carte est affichée si Phaser est disponible et qu'on est sur la Ferme (pas dans un écran
// de détail). Sans Phaser, la Ferme garde sa liste classique.
export function stageActive() {
  return stageUsable() && activeTab === 'ferme' && ecranFerme === null;
}

// Heure du jour, de 0 à 24 (fractionnaire) : la journée commence à HEURE_REVEIL au réveil,
// puis une heure passe toutes les SECONDES_PAR_HEURE secondes d'éveil (30 s).
export function heureDuJour() {
  return clockHours(state); // version 1.19 : la nuit défile aussi (22 h → 6 h)
}

// Lieux de la carte qui portent une étiquette (et une fenêtre du même nom).
export const STAGE_LIEUX = ['maison', 'etable', 'poulailler', 'moulin', 'serre', 'zone', 'silo'];

// Le Moulin a-t-il sa propre fenêtre de travail (renderMoulin) ? Sinon ses commandes
// restent dans le Livre de recette.
function moulinSurPlace() {
  return typeof renderMoulin === 'function';
}

// Une « cible » dit où mène une notification, un indicateur ou un raccourci :
//   { fenetre, onglet, ancre } : une fenêtre de la carte (et, pour la Maison, son onglet) ;
//   { ecran, ancre }           : un écran de détail (panneaux, batteries) ;
//   { page, sous, ancre }      : un onglet du menu du bas (et son sous-onglet).
// `ancre` est l'id de l'élément à amener en haut : on arrive sur la ligne concernée.

// Où se règle un appareil (panne, entretien) : sa propre carte.
function lieuAppareil(id) {
  const d = id ? findDevice(state, id) : null;
  const eau = isOwned(starterOf(state, 'pompe')) ? { fenetre: 'eau' } : { fenetre: 'installations', ancre: 'bat-eau' };
  if (!d) return eau;
  if (d.type === 'panneau') return { ecran: 'panneaux', ancre: `dev-${d.id}` };
  if (d.type === 'batterie') return { ecran: 'batteries', ancre: `dev-${d.id}` };
  if (d.type === 'moulin' && moulinSurPlace()) return { fenetre: 'moulin', ancre: 'moulin-appareil' };
  if (d.type === 'moulin' || d.type === 'presse') return { fenetre: 'maison', onglet: 'recettes', ancre: `station-${d.type}` };
  if (d.type === 'frigo') return { fenetre: 'installations', ancre: 'dev-frigo' };
  if (d.type === 'pompe') return { fenetre: 'eau', ancre: 'dev-pompe' };
  return eau;
}

// Fenêtre de la carte où ranger une cible (pour les pastilles des étiquettes).
function fenetreDeCible(c) {
  return c.fenetre || (c.ecran ? 'maison' : null);
}

// Parcelles d'un lieu ('potager' ou 'serre') qui attendent un geste, avec les règles des
// notifications : à arroser, ou mûres (sauf ce que l'Arbre des technologies automatise).
function parcellesAFaire(lieu, quoi) {
  return allPlots(state).filter((p) => {
    if (!p.culture || p.lieu !== lieu) return false;
    if (isMature(p)) return quoi !== 'arrosage' && !techAuto(state, 'recolte', lieu);
    return quoi !== 'recolte' && !p.arrose && !techAuto(state, 'arrosage', lieu);
  }).length;
}

// Nombre de choses à faire par lieu de la carte : la pastille des étiquettes. Rien de
// nouveau : ce sont les alertes de getNotifications() et de alertSnapshot(), rangées là
// où elles se règlent.
function aFaireParLieu() {
  const n = { maison: 0, etable: 0, poulailler: 0, moulin: 0, serre: 0, verger: 0, zone: 0 };
  const snap = alertSnapshot(state);
  for (const id of snap.panne.concat(snap.entretien)) {
    const f = fenetreDeCible(lieuAppareil(id));
    if (f) n[f] += 1;
  }
  if (snap.batteriesVides) n.maison += 1;
  if (snap.frigoCoupe) n.maison += 1;
  for (const a of getNotifications(state)) {
    if (a.type === 'poules') n.poulailler += a.nombre;
    if (a.type === 'tonte') n.etable += a.nombre;
  }
  n.zone = parcellesAFaire('potager', null);
  n.serre = parcellesAFaire('serre');
  n.verger = ripeTrees(state).length; // version 1.13 : arbres en fruits à cueillir
  return n;
}

// Première parcelle d'un lieu qui attend le geste `quoi` ('arrosage' ou 'recolte').
function premiereParcelle(lieu, quoi) {
  return allPlots(state).find((p) => {
    if (!p.culture || p.lieu !== lieu) return false;
    if (isMature(p)) return quoi === 'recolte' && !techAuto(state, 'recolte', lieu);
    return quoi === 'arrosage' && !p.arrose && !techAuto(state, 'arrosage', lieu);
  }) || null;
}

// Où mène une alerte : la cible où elle se règle, à la ligne concernée. `type` est celui
// de getNotifications() ou de alertEvents() ; `id` l'appareil d'une panne ou d'un entretien.
export function cibleAlerte(type, id) {
  switch (type) {
    case 'peremption': return { page: 'inventaire', sous: 'frais' };
    case 'sacVide': return { fenetre: 'famille' }; // (fiche 11 : la fiche du personnage, son sac)
    case 'panne': case 'entretien': return lieuAppareil(id || alertSnapshot(state)[type][0]);
    case 'batteriesVides': return { ecran: 'batteries' };
    case 'frigoCoupe': return { fenetre: 'installations', ancre: 'dev-frigo' };
    case 'arrosage': case 'recolte': {
      // La Zone de culture d'abord, puis la Serre.
      const ou = parcellesAFaire('potager', type) > 0 ? ['potager', 'zone']
        : isUnlocked(state, 'serre') ? ['serre', 'serre'] : ['potager', 'zone'];
      const p = premiereParcelle(ou[0], type);
      return { fenetre: ou[1], ancre: p ? `plot-${p.id}` : null };
    }
    case 'poules': return { fenetre: 'poulailler', ancre: 'etable-poules' };
    case 'tonte': {
      const m = state.paturage.moutons.find(woolReady);
      return { fenetre: 'etable', ancre: m ? `animal-${m.id}` : 'etable-animaux' };
    }
    // La paille se fauche (version 1.23) : on montre le stock à l'Étable.
    case 'paille': case 'pailleManque':
      return { fenetre: 'etable', ancre: 'etable-paille' };
    default: return { page: 'ferme' };
  }
}

export function notifCible(n) {
  return cibleAlerte(n.type);
}

// Attributs d'un bouton qui mène à une cible (action `aller`, lue par cibleDe()).
export function cibleAttrs(c) {
  const a = ['data-action="aller"'];
  if (c.page) a.push(`data-page="${c.page}"`);
  if (c.ecran) a.push(`data-screen="${c.ecran}"`);
  if (c.fenetre) a.push(`data-window="${c.fenetre}"`);
  if (c.onglet || c.sous) a.push(`data-tab="${c.onglet || c.sous}"`);
  if (c.ancre) a.push(`data-anchor="${c.ancre}"`);
  return a.join(' ');
}

function cibleDe(d) {
  if (d.page) return { page: d.page, sous: d.tab || null, ancre: d.anchor || null };
  if (d.screen) return { ecran: d.screen, ancre: d.anchor || null };
  return { fenetre: d.window, onglet: d.tab || null, ancre: d.anchor || null };
}

// Nom du lieu où mène une cible, pour l'écrire sous une notification.
export function cibleNom(c) {
  if (c.page) return TABS.find((t) => t.id === c.page).label;
  if (c.ecran) return c.ecran === 'panneaux' ? 'Panneaux solaires' : 'Batteries';
  if (!stageUsable()) return 'Ferme';
  if (c.fenetre === 'maison' && (c.onglet === 'famille' || c.onglet === 'techno')) return STAGE_WINDOWS[c.onglet].nom; // ancienne cible
  if (c.fenetre === 'maison' && c.onglet === 'batiments') return STAGE_WINDOWS.installations.nom;
  const w = STAGE_WINDOWS[c.fenetre];
  const onglet = c.fenetre === 'maison' && c.onglet ? MAISON_TABS.find((t) => t.id === c.onglet) : null;
  return onglet ? `${w.nom} › ${onglet.label}` : w.nom;
}

// Va à une cible : ouvre le bon menu et amène la ligne concernée en haut.
function allerA(c) {
  if (!c) return;
  if (c.page === 'notifications' && stageUsable()) {
    allerAuLieu('notifications');
    return;
  }
  if (c.page) {
    setActiveTab(tabAvailable(c.page) ? c.page : 'ferme');
    if (c.page === 'inventaire' && c.sous) setInvTab(c.sous);
    if (c.page === 'comptoir' && c.sous) setComptoirTab(c.sous);
    setStageWindow(null);
    setStageReturn(null);
    setStageInterior(null);
    setEcranFerme(null);
  } else if (c.ecran && stageUsable()) {
    // Avec la carte : la fenêtre des panneaux ou des batteries, dans le cadre bois.
    allerAuLieu(c.ecran, null, c.ancre);
    return;
  } else if (c.ecran) {
    // Écran de détail : au retour, on retombe sur Maison › Installations.
    setActiveTab('ferme');
    // au retour d'un écran de détail (panneaux, batteries) : la fenêtre Énergie
    setStageReturn(stageUsable() ? (STAGE_WINDOWS.energie.ok() ? 'energie' : 'installations') : null);
    setStageWindow(null);
    setStageInterior(null);
    setEcranFerme(c.ecran);
  } else {
    allerAuLieu(c.fenetre, c.onglet, c.ancre);
    return;
  }
  setAncreVoulue(c.ancre || null);
  telView();
  setLastRenderAt(0); // rendu tout de suite
  refresh();
}

// Modèle de vue : tout ce que la carte a le droit de savoir. Aucune référence à `state`.
export function stageModel() {
  const vue = (p) => {
    if (!p.culture) return { id: p.id, culture: null, icone: '', phase: -1, mature: false, arrosee: !!p.arrose };
    const max = maxStage(p);
    const mature = isMature(p);
    // l'image de la plante : la graine (0) le jour du semis, la plante mûre (la dernière), et
    // entre les deux, les autres images selon la croissance (sprite.c : 4 ou 5 images)
    const n = (DATA.CULTURES[p.culture].sprite && DATA.CULTURES[p.culture].sprite.c.length) || 4;
    const phase = mature ? n - 1 : p.stade <= 0 ? 0 : Math.min(n - 2, 1 + Math.floor((p.stade / max) * (n - 2)));
    return { id: p.id, culture: p.culture, icone: DATA.CULTURES[p.culture].icone, phase, mature, arrosee: mouillee(p) };
  };
  // Avec l'arrosage automatique, la terre sèche la dernière heure du cycle (de 6 h à 7 h pour
  // une plante arrosée la veille à 7 h) : les asperseurs la mouillent sous les yeux du joueur.
  const seche = DATA.TEMPS.ARROSAGE_HEURE - DATA.TEMPS.HEURE_REVEIL;
  const mouillee = (p) => !!p.arrose && !(techAuto(state, 'arrosage', p.lieu) && growHoursLeft(state, p) <= seche);
  // version 1.9 : chaque parcelle de zone a sa case ; la carte en tire la terre et ses bordures
  const zoneVue = () => (p) => ({ ...vue(p), case: p.case });
  const plots = state.potager.parcelles.map(zoneVue(1));
  // La Serre : ses parcelles, labourées à la houe sur les cases de sa pièce, chacune avec sa
  // case (vide tant qu'elle n'est pas construite). `interieur` dit si le joueur y est entré.
  const serre = state.serre.construit ? state.serre.parcelles.map(zoneVue(1)) : [];
  // Version 1.13 : chaque case achetée du Verger, arbre ou emplacement libre, avec son dessin
  // (assets/verger.png : 0 libre, 1 jeune arbre, puis pour chaque espèce, à partir de
  // 2 + 4 × ARBRES[espèce].dessin : arbuste, arbre, en fleur, en fruits).
  const dessinArbre = (t, st) => {
    if (st === 0) return 1;
    const d = 2 + 4 * ((DATA.VERGER.ARBRES[t.espece] && DATA.VERGER.ARBRES[t.espece].dessin) || 0);
    return st === 1 ? d : t.fruits ? d + 3 : treeInBloom(state, t) ? d + 2 : d + 1;
  };
  // chaque arbre planté dans le sol, sa case de la carte, sans emplacement
  const arbres = state.verger.arbres.map((t) => {
    const st = treeStage(state, t);
    return { case: t.case, id: t.id, fruits: !!t.fruits, dessin: dessinArbre(t, st), stade: Math.min(st, 2), sol: true };
  });
  // Lieux étiquetés : seulement ceux que le jeu a débloqués (la maison et la zone sont
  // toujours là), avec leur nom et le nombre de choses à y faire.
  const aFaire = aFaireParLieu();
  const batiments = {};
  for (const id of STAGE_LIEUX) batiments[id] = { visible: STAGE_WINDOWS[id].ok() || windowLocked(id), nom: STAGE_WINDOWS[id].nom, badge: aFaire[id] };
  // (plus d'étiquette sur l'ancienne Zone de culture)
  batiments.zone.visible = false;
  // le Moulin ne tourne que quand il moud (du blé en cours)
  batiments.moulin.enMarche = !!(state.stations && state.stations.moulin && state.stations.moulin.tache);
  const hauteurs = hauteursPosees(state), fenetres = fenetresPosees(state);
  const tour = etatMoulin(state);
  // Heure arrondie au quart d'heure : la lumière de la carte change par petits pas.
  const heure = (Math.round(heureDuJour() * 4) / 4) % 24;
  // Les bêtes de l'Étable et du Poulailler : seulement des nombres, la carte en fait des
  // bêtes dans l'enclos et des poules en liberté autour du Poulailler.
  const animaux = { vache: state.paturage.vaches.length, mouton: state.paturage.moutons.length, poule: state.poulailler.poules };
  // les animaux de compagnie de la famille : la planche de chacun (aucun : pas de chat ni de chien)
  const compagnons = petSheets(state).map((p) => p.planche);
  // Version 1.15 : une parcelle porte le numéro de sa tuile sur la carte ; `terrain` dit
  // quelles tuiles la houe peut labourer (une chaîne par rangée, « # » labourable).
  const T = farmTerrain(state);
  const houe = hoeMode && !!state.potager.houe;
  // la hache en main : un appui sur un arbre de la carte le coupe
  const hache = axeMode && !!(state.outils && state.outils.hache) && !stageInterior;
  // la pioche en main : un appui sur un rocher de la carte le casse ; les rochers cassés n'y sont plus
  const pioche = pickMode && !!(state.outils && state.outils.pioche) && !stageInterior;
  const rochers = brokenRocks(state);
  // la hache : les arbres abattus n'y sont plus (ils repoussent comme les rochers)
  const abattus = fellenTrees(state);
  // les buissons se coupent aussi (d'un coup) ; les coupés n'y sont plus
  const buissons = true;
  const buissonsCoupes = cutBushes(state);
  // la faux en main : un appui sur une touffe d'herbe haute la fauche ; les touffes fauchées
  // n'y sont plus (elles repoussent)
  const faux = scytheMode && !!(state.outils && state.outils.faux) && !stageInterior;
  const fauchees = cutGrass(state);
  // la canne à pêche en main : un appui sur l'eau y fait pêcher
  const canne = rodMode && !!(state.outils && state.outils.canne) && !stageInterior;
  // L'arrosage automatique : des asperseurs au milieu des parcelles (voir sprinklerSpots) ; un
  // asperseur tourne ARROSAGE_S secondes après l'arrosage de 7 h s'il a arrosé une de ses cases.
  const asperseurs = sprinklers();
  // le robot de la ferme : sa tâche en cours (voir robotModel)
  const robot = robotModel();
  // Panneaux solaires sur le toit de la maison une fois le panneau acheté : un de plus par
  // niveau (2 au niveau 1, 6 au niveau 5).
  const panneau = starterOf(state, 'panneau');
  const panneaux = isOwned(panneau) ? panneau.niveau + 1 : 0;
  // Le puits, en haut à gauche du Moulin : la pompe s'y ajoute une fois achetée.
  const pompe = isOwned(starterOf(state, 'pompe'));
  const pompeEnMarche = pompe && state.pompe.debit > 0; // elle remplit la citerne : elle vibre
  // La citerne (le réservoir), une fois achetée : plus haute à chaque niveau de capacité (5 images
  // par niveau), son tube de niveau vide (0) à plein (4).
  const cap = tankCapacity(state);
  const remplie = cap > 0 ? Math.round((Math.min(state.eauMl, cap) * 4) / cap) : 0;
  const citerne = isOwned(starterOf(state, 'reservoir')) ? (Math.max(1, state.reservoir.niveau || 1) - 1) * 5 + remplie : -1;
  // Meubles de l'intérieur de la maison : 0 absent (pas encore débloqué), 1 en filigrane (à
  // construire : un appui ouvre sa fiche), 2 construit.
  const meuble = (shown, built) => (built ? 2 : shown ? 1 : 0);
  const meubles = {
    four: meuble(isUnlocked(state, 'four'), state.stations.four.construit),
    cuisine: meuble(isUnlocked(state, 'cuisine'), state.stations.cuisine.construit),
    frigo: meuble(isUnlocked(state, 'frigo'), state.frigo.construit),
    // le décor de la cuisine, toujours là
    evier: { dessin: 'evier' }, plan: { dessin: 'plan' }, fenetre: { dessin: 'fenetre' }, plante: { dessin: 'plante' },
  };
  // Meubles de la maison (fabriqués à l'Atelier) : chacun à sa place (chaise_1…, lit_1… : les lits d'adulte d'abord ;
  // sans lit d'adulte, la première place a une paillasse, où le personnage dort).
  for (const id of Object.keys(DATA.MEUBLES)) {
    const n = furnitureCount(state, id);
    if (id === 'chaise') for (let i = 1; i <= n; i++) meubles[`chaise_${i}`] = { dessin: 'chaise' };
    else if (!id.startsWith('lit_') && n > 0) meubles[id] = { dessin: id };
  }
  const adultes = furnitureCount(state, 'lit_adulte');
  const lits = [...(adultes ? Array(adultes).fill('lit_adulte') : ['paillasse']), ...Array(furnitureCount(state, 'lit_enfant')).fill('lit_enfant')];
  lits.forEach((dessin, i) => { meubles[`lit_${i + 1}`] = { dessin }; });
  // Appui long sur la citerne : une bulle dit combien de litres elle contient.
  const citerneTexte = citerne >= 0 ? `💧 ${formatLitres(Math.min(state.eauMl, cap))} / ${formatLitres(cap)}` : '';
  // Pour le personnage (js/fermier.js) : le jour (une case qui change le même jour est un
  // geste du joueur), la préparation en cours, le contenu du frigo.
  const cuisson = ['cuisine', 'four'].find((id) => state.stations[id] && state.stations[id].construit && state.stations[id].tache) || null;
  // Version 1.18 : ce qui attend que le personnage le ramasse, à sa place (parcelle : sa
  // case ; arbre : sa case du Verger ; Poulailler, Étable), avec le texte de sa bulle.
  // (et les ruches pleines : leur miel attend qu'il vienne le récolter, js/engine/ruches.js)
  const tas = piles(state).concat(ruchesARecolter(state));
  // Version 1.19 : la laine des moutons prêts à tondre s'annonce dans la bulle de l'Étable (le
  // personnage les tond quand le joueur l'y envoie).
  const M = DATA.ANIMAUX.mouton;
  const tondre = state.paturage && state.paturage.construit ? sheepToShear(state) * M.laineParTonte : 0;
  if (tondre > 0) {
    const e = tas.find((p) => p.id === 'etable');
    const items = { ...(e ? e.items : {}) };
    items[M.laine] = (items[M.laine] || 0) + tondre;
    if (e) e.items = items; else tas.push({ id: 'etable', lieu: 'etable', ref: null, items });
  }
  const ramasser = tas.map((p) => ({ id: p.id, lieu: p.lieu, ref: p.ref, texte: itemsText(p.items, 'bulle') })); // « 🥕 6 🌱 2 » : les emojis deviennent des icônes
  return {
    // la nuit (22 h → 6 h) : la lumière ; la famille est au lit (le joueur, lui, peut agir)
    nuit: nightActive(state),
    // fiche 16b : quand la famille va au lit et se lève (js/famille-ferme.js : les enfants, les adultes)
    horaire: DATA.FAMILLE.HORAIRE,
    // le joueur a appuyé sur « Dormir » : le personnage va à son lit (js/fermier.js) ; il y
    // dort (la nuit défile en accéléré), même quand on regarde la carte de la ferme
    coucher: (coucher || asleep(state)) && nightActive(state),
    dort: asleep(state),
    ramasser,
    // version 1.17 : le personnage du joueur sur la carte (son numéro dans le catalogue)
    perso: memberPerso(mainCharacter(state)),
    // les autres membres de la famille, qui font leur journée sur la carte (js/famille-ferme.js)
    famille: state.famille.membres.filter((m) => m !== mainCharacter(state)).map((m) => ({ id: m.id, perso: memberPerso(m), enfant: !!m.enfant })),
    // le second adulte du foyer et où il a à faire (le Poulailler, l'Étable : aideAFaire ; fiche 19 :
    // puis ses initiatives, arroser, cuisiner, ramasser, js/engine/compagnon.js tachesCompagnon)
    aide: aidant(state) ? { id: aidant(state).id, lieux: [...aideAFaire(state), ...tachesCompagnon(state)] } : null,
    // les fleurs où butinent les abeilles des ruches (des cases ; la carte y ajoute l'herbe haute fleurie)
    fleurs: fleursPourAbeilles(state),
    jour: state.day, cuisson, frigo: state.frigo && state.frigo.construit ? fridgeUnits(state) : 0,
    heure, cols: T.LARGEUR, cases: tileCount(T), terrain: terrainNow(rochers.concat(abattus)), plots,
    // la ferme générée : ce qui est à ramasser à la main (js/engine/atelier.js)
    ramassables: ramassables(state).map((r) => ({ id: r.id, sorte: r.sorte, case: r.case, buisson: !!r.buisson })),
    // le bois et la pierre lâchés par la hache et la pioche, à ramasser en marchant dessus
    morceaux: morceauxDe(state, 'ferme').map((m) => ({ n: m.n, item: m.item, x: m.x, y: m.y, ...(m.image ? { image: m.image } : {}) })),
    // le grand monde : ce qui y est pris (ni dessiné, ni fermé à la marche), ce qui y est cueilli
    // (sans ses fruits), par identifiant (js/engine/monde-recolte.js, js/carte/ferme/recolte-monde.js)
    monde: { pris: mondePris(state), cueillis: mondeCueillis(state) },
    // ce qui n'a pas été vu du grand monde, sous le brouillard, et la boussole (fiche 8 : js/engine/monde-vu.js,
    // js/carte/ferme/brouillard.js, boussole.js)
    brouillard: brouillardModele(),
    boussole: boussoleModele(),
    // les habitants des hameaux peuplés (js/engine/habitants.js : qui, quel personnage, quel métier,
    // quel lit) et leur horaire (js/carte/ferme/habitants.js) ; ceux d'un hameau déjà vu naissent
    // dès que les plans sont là (une partie d'avant la fiche 7b)
    habitants: { horaire: HABITANTS.HORAIRE, hameaux: (peuplerLesVus(), habitantsPourLaCarte(state)) },
    // la visite de bienvenue (js/engine/bienvenue.js, fiche 18) : le visiteur en route, ou son plat qui
    // attend devant la porte (js/carte/ferme/visite.js) ; null le reste du temps
    visite: bienvenueModele(state),
    // les botteleuses (js/engine/botteleuse.js : l'entonnoir, la machine, le convoyeur ; pleine,
    // elle vibre VIBRE_S s et sa botte sort) et les fibres de l'inventaire, à y jeter
    botteleuses: botteleuses(state),
    botteVibre: DATA.BOTTELEUSE.VIBRE_S,
    fibres: countItem(state, 'fibre'),
    // les distributeurs de grain du Poulailler (js/engine/distributeur.js : l'entonnoir, le
    // distributeur, la mangeoire) et le blé du joueur (l'inventaire et le Silo), à y jeter
    distributeurs: distributeurs(state),
    grainEnMain: countWithSilo(state, DATA.SILO.ITEM),
    // les arbres plantés d'une graine (sur une case d'herbe libre) : une jeune pousse
    pousses: poussesArbres(state),
    // puis, grands, des arbres de la carte (js/carte/ferme/foret.js)
    foret: arbresPlantes(state),
    // et ses blocs posés, le mode Construire (les pièces closes s'y voient), les paillasses où
    // l'on dort (js/engine/blocs.js)
    // (un meuble : son dessin, ses cases en largeur et en hauteur, s'il arrête le passage, s'il est à plat ou un lit)
    // (un mur rehaussé, version 1.25 : sa hauteur en blocs)
    // (une fenêtre percée dans un mur : la matière de ce mur)
    blocs: Object.entries(blocsPoses(state)).map(([c, sorte]) => ({ case: Number(c), sorte, ...meubleDe(sorte, Number(c)), ...(hauteurs[c] > 1 ? { hauteur: hauteurs[c] } : {}), ...(sorte === 'ruche' && ruchePleine(state, Number(c)) ? { pleine: true } : {}), ...(fenetres[c] ? { mur: fenetres[c] } : {}) })),
    // le Moulin de la ferme générée (version 1.25) : sa tour bâtie, ses bornes (les cases de la
    // pièce) ; la voilure tourne quand il moud (batiments.moulin.enMarche)
    // le didacticiel (js/ui/didacticiel.js) : ce que la carte entoure (pierres, bois, Atelier, puits)
    surbrillance: surbrillanceDidacticiel(),
    // planter un arbre depuis l'Inventaire (js/ui/plantation.js) : les cases possibles
    plantation: stageInterior ? null : plantationModele(),
    moulinTour: tour && tour.ok ? { ...tour.bornes, enMarche: batiments.moulin.enMarche } : null,
    // les tableaux accrochés aux murs (DATA.ATELIER.BLOCS : sur « mur »)
    tableaux: Object.entries(blocsDessusPoses(state)).filter(([, k]) => DATA.ATELIER.BLOCS[k] && DATA.ATELIER.BLOCS[k].meuble).map(([c, sorte]) => ({ case: Number(c), dessin: DATA.ATELIER.BLOCS[sorte].meuble })),
    // les sols posés (le plancher, les dalles… : [{ case, sorte }] ; le chemin change les tuiles du sol, ci-dessous)
    sols: Object.entries(solsPoses(state)).filter(([, k]) => k !== 'chemin').map(([c, sorte]) => ({ case: Number(c), sorte })),
    // les chemins posés : les tuiles du sol qu'ils changent ([[case, tuile]]) et leurs cases
    chemins: cheminsDuSol(T),
    // le Poulailler et l'Étable de la ferme générée : leurs cases libres et les bêtes qui y ont leur place
    enclos: betesDesEnclos(),
    // le four (son bloc) cuit-il ? ses flammes bougent (js/carte/ferme/chantier.js, stepFires)
    fourAllume: !!(state.stations.four && state.stations.four.construit && state.stations.four.tache),
    // le Moulin moud-il ? sa meule (son bloc) tourne (js/carte/ferme/chantier.js, stepFires)
    meuleTourne: batiments.moulin.enMarche,
    bati: buildMode && !stageInterior ? { sorte: buildMode, rang: niveauRang(), meuble: meubleModele() } : null,
    // l'étage (un essai, js/engine/etage.js) et le niveau où est le personnage (0 : en bas)
    ...etageModel(),
    pieces: buildMode && !stageInterior ? piecesCloses(state).map((p) => p.cases) : null,
    // la Serre de la ferme générée : les cases de sa pièce où ses parcelles se posent (serrePlaces)
    serreCases: state.serre.construit ? serrePlaces(state) : null,
    // et ses murs et ses portes, en verre et en bois (serreMurs)
    serreMurs: serreMurs(state),
    // les toits des bâtiments, sur leur dernier niveau (js/carte/ferme/toits.js)
    toits: stageInterior ? null : toits(state),
    couchages: couchages(state),
    foyer: foyerPorte(),
    houe, hache, pioche, faux, canne, triporteur: enSelle(state), cheval: chevalMonte(state), chevalVitesse: vitesseCheval(state), pied: piedIci, rochers, abattus: abattus.concat(buissonsCoupes), buissons, fauchees, asperseurs, robot, parAuto: autoDone(), labourables: houe ? labourables() : null, serre, interieur: stageInterior, arbres, batiments, animaux, compagnons, panneaux, pompe, pompeEnMarche, citerne, citerneTexte, meubles,
  };
}

// Un meuble posé sur la ferme générée (DATA.ATELIER.BLOCS.meuble_<id>), ou un bloc dessiné comme
// lui (`dessin` : le distributeur de grain, sa mangeoire ; leur image suit ce qu'ils contiennent) :
// ce que la carte en a besoin ; {} pour un autre bloc.
function meubleDe(sorte, tile) {
  const b = DATA.ATELIER.BLOCS[sorte];
  if (b && b.dessin) return { meuble: { dessin: dessinBloc(b, tile), largeur: b.largeur || 1, hauteur: b.hauteur || 1, bloque: !!b.bloque, plat: false, lit: false } };
  if (!b || !b.meuble) return {};
  return { meuble: { dessin: b.meuble, largeur: b.largeur || 1, hauteur: b.hauteur || 1, bloque: !!b.bloque, plat: !!b.plat, lit: !!b.lit } };
}

// L'image d'un bloc dessiné comme un meuble : le distributeur selon son blé (assets/
// meuble_distributeur_<0 à 4>.png : vide à plein), la mangeoire pleine tant qu'il en a.
function dessinBloc(b, tile) {
  if (b.distributeur === 'machine') {
    const f = grainDans(state, tile) / DATA.DISTRIBUTEUR.CAPACITE;
    return `distributeur_${f > 0 ? Math.max(1, Math.round(f * 4)) : 0}`;
  }
  if (b.distributeur === 'mangeoire') {
    const m = distributeurDe(state, tile);
    return `mangeoire_grain_${m !== null && grainDans(state, m) > 0 ? 'pleine' : 'vide'}`;
  }
  return b.dessin;
}

// Sans maison : la porte du foyer (la première pièce close où l'on dort, sinon
// la première pièce close du genre maison), où le personnage rentre le soir et ressort le matin ;
// null sans maison (une enceinte vide, un bâtiment ne sont pas le foyer).
function foyerPorte() {
  const pieces = piecesCloses(state);
  const p = pieces.find((q) => q.paillasses.length) || pieces.find((q) => genrePiece(state, q.cases[0]) === 'maison');
  return p ? p.portes[0] : null;
}

// Les asperseurs de la carte (voir stageModel) : [{ x, y (px de carte, le pied), on }]. Un
// asperseur se pose à un coin de case et arrose les 4 × 4 cases autour de lui. Placement
// glouton, recalculé seulement quand les parcelles changent : pour la première parcelle pas
// encore couverte (de haut en bas, de gauche à droite), le coin qui couvre le plus de parcelles
// pas encore couvertes (à égalité, le plus au milieu d'elles).
let sprinklerCache = { key: null, list: [] };
function sprinklerSpots() {
  const cases = state.potager.parcelles.filter((p) => Number.isInteger(p.case)).map((p) => p.case).sort((a, b) => a - b);
  const W = farmTerrain(state).LARGEUR;
  const key = W + ':' + cases.join();
  if (sprinklerCache.key === key) return sprinklerCache.list;
  const libres = new Set(cases);
  const couvre = (cx, cy) => {
    const out = [];
    for (let r = cy - 2; r <= cy + 1; r++) for (let c = cx - 2; c <= cx + 1; c++) if (c >= 0 && c < W && libres.has(r * W + c)) out.push(r * W + c);
    return out;
  };
  const list = [];
  for (const t of cases) {
    if (!libres.has(t)) continue;
    const c = t % W, r = Math.floor(t / W);
    let best = null;
    for (let cy = r - 1; cy <= r + 2; cy++) {
      for (let cx = c - 1; cx <= c + 2; cx++) {
        const l = couvre(cx, cy);
        // à égalité, le coin le plus près du milieu des cases qu'il couvre
        const mx = l.reduce((a, x) => a + (x % W) + 0.5, 0) / l.length, my = l.reduce((a, x) => a + Math.floor(x / W) + 0.5, 0) / l.length;
        const d = Math.hypot(cx - mx, cy - my);
        if (!best || l.length > best.cases.length || (l.length === best.cases.length && d < best.d)) best = { cx, cy, cases: l, d };
      }
    }
    for (const x of best.cases) libres.delete(x);
    list.push(best);
  }
  sprinklerCache = { key, list };
  return list;
}

// L'étage pour la carte : { etage: { emprise, blocs, escaliers } ou null, niveau, vueNiveau }.
// vueNiveau : en mode Construire, le niveau où l'on construit (la vue le montre), sinon null.
// Plus d'étage, ou le coucher : on redescend.
function etageModel() {
  const emprise = etageEmprise(state);
  if ((!emprise.size || coucher || asleep(state) || stageInterior) && etageVue) setEtageVue(false);
  if (!emprise.size) return { etage: null, niveau: 0 };
  return {
    etage: { emprise: [...emprise].sort((a, b) => a - b), blocs: Object.entries(etageBlocs(state)).map(([c, sorte]) => ({ case: Number(c), sorte, ...meubleDe(sorte), ...(fenetresEtage(state)[c] ? { mur: fenetresEtage(state)[c] } : {}) })), escaliers: escaliers(state) },
    niveau: etageVue ? 1 : 0,
    vueNiveau: buildMode && !stageInterior ? niveauBati() : null,
  };
}

// Le robot (récolte et semis automatiques) pour la carte : null sans lui ; { etat: 'repos' }
// quand sa liste du jour est faite (ou pas commencée) ; { etat: 'charge' } rentré recharger sa
// batterie vide (batterie : sa charge en % ; enCharge : sa station le recharge) ; sinon sa tâche en cours : la case
// visée (une tuile de la carte, ou 'serre'), 'recolter' ou 'planter', où elle en est (prog,
// de 0 à 1 ; elle dure dureeS secondes, dont la part `route` à rouler jusqu'à la parcelle), et
// son rang dans la liste. `vitesse` : la sienne, en px par seconde (le retour à sa base).
// `station` : sa station de charge (robotStation : la case du bloc posé, null, ou 'maison').
function robotModel() {
  if (!robotOn(state)) return null;
  const R = DATA.ROBOT, S = DATA.TEMPS.SECONDES_PAR_HEURE;
  const vitesse = (R.VITESSE * 16 * 60) / S;
  const r = state.robot;
  // sa batterie (en %) ; enCharge : sa station la recharge en ce moment
  const batterie = robotChargePct(state), enCharge = robotBattery(state).conso > 0;
  // sa station : la case du bloc posé, null s'il n'est pas posé (ferme générée), 'maison'
  const station = robotStation(state);
  if (nightActive(state) || !r || r.jour !== state.day || r.i >= r.taches.length) return { etat: 'repos', vitesse, batterie, enCharge, station };
  if (r.charge) return { etat: 'charge', vitesse, batterie, enCharge, station };
  const tache = r.taches[r.i];
  const p = allPlots(state).find((x) => x.id === tache.id);
  const d = robotTrip(state, r, r.i), duree = d.route + d.travail;
  return {
    etat: 'travail', t: tache.t, a: p && p.lieu === 'potager' && Number.isInteger(p.case) ? p.case : 'serre',
    prog: Math.max(0, Math.min(1, (absoluteHours(state) - r.debut) / duree)), dureeS: duree * S, route: d.route / duree,
    n: r.i + 1, total: r.taches.length, vitesse, batterie, enCharge, station,
  };
}

// Ce que les automatisations ont fait aujourd'hui dans la Zone de culture (« recolter:12 »,
// « planter:12 », « arroser:12 ») : le personnage ne va pas refaire ces gestes sur la carte.
function autoDone() {
  const out = [];
  const r = state.robot;
  if (r && r.jour === state.day) {
    for (const tache of r.taches.slice(0, r.i)) {
      const p = allPlots(state).find((x) => x.id === tache.id);
      if (p && Number.isInteger(p.case)) out.push(`${tache.t}:${p.case}`);
    }
  }
  const I = state.irrigation;
  if (I && I.jour === state.day) for (const c of I.faites || I.cases || []) out.push(`arroser:${c}`);
  return out;
}

function sprinklers() {
  if (!techAuto(state, 'arrosage', 'potager')) return [];
  const I = state.irrigation;
  const actif = !!I && I.jour === state.day && (absoluteHours(state) - I.h) * DATA.TEMPS.SECONDES_PAR_HEURE < DATA.TEMPS.ARROSAGE_S;
  const arrosees = new Set(actif ? I.cases || [] : []);
  return sprinklerSpots().map((a) => ({ x: a.cx * 16, y: a.cy * 16, on: a.cases.some((t) => arrosees.has(t)) }));
}

// Version 1.18 : le personnage de la carte ramasse ce qui est produit. Sans lui (pas de
// carte, ou une carte prête mais sans personnage), tout va directement à l'inventaire, et
// ce qui attendait encore y entre.
function syncRamassage() {
  const on = stageUsable() && (!FarmStage.ready() || FarmStage.hasFermier());
  state.ramassage = on;
  if (!on && piles(state).length) pickUpAll(state);
}

// Le personnage prend un tas (appelé par la carte, jamais par un bouton) : renvoie ce qu'il
// contenait ({ item: qté }), ou null s'il n'y avait plus rien.
function stagePickup(id) {
  const r = pickUp(state, id);
  if (!r.ok) return null;
  persistState();
  refresh();
  return r.items;
}

// Version 1.19 : le personnage est au Poulailler ou à l'Étable (envoyé par un double appui) :
// il prend ce qui l'attend (et tond les moutons prêts). Renvoie ce qu'il a pris, ou null.
// Le second adulte du foyer a fini au Poulailler ou à l'Étable (appelé par la carte) : ce qu'il
// a pris ({ item: qté }), ou null.
// Fiche 19 : ou il a fini une de ses initiatives (arroser une plante, remplir sa cruche au puits,
// cuisiner, ramasser) : ce qu'elle a donné (une plante arrosée : { arrose: 1 }, la bulle « +1 💧 »).
function stageAide(lieu) {
  const r = estTacheCompagnon(lieu) ? faireCompagnon(state, lieu) : aideBetes(state, lieu);
  if (!r.ok) return null;
  persistState();
  refresh();
  return r.items;
}

// Un membre de la famille a marché `px` pixels sur la carte : il a un peu plus faim
// (js/engine/repas.js ; il ira manger au prochain pas du moteur).
function stageMarche(id, px) {
  marcherMembre(state, id, px);
}

// Le personnage entre dans une région du monde (la carte le dit quand il change de région, avec
// sa case) : elle devient vue (state.monde.vues, js/engine/terrain.js), une fois.
function stageRegion(tile) {
  if (voirRegion(state, tile)) persistState();
}

// La case du personnage sur la carte (à chaque case : rien ne repousse sous lui dans le grand
// monde, js/engine/monde-recolte.js ; cela ne se sauvegarde pas tout de suite). Fiche 8 : ce qu'il voit
// de là devient vu (js/engine/monde-vu.js : le rayon de vue du biome de sa case, plus court la nuit) et
// le brouillard s'y lève (modèle.brouillard, js/carte/ferme/brouillard.js) ; le lieu choisi pour la
// boussole, une fois atteint, la rend à la ferme. L'un ou l'autre : la partie est sauvegardée.
function stageIci(tile) {
  noterIci(state, tile);
  let change = voirAutour(state, tile, { biome: biomeDeCase(tile), nuit: nightActive(state) }) > 0;
  const T = farmTerrain(state), sol = solDuMonde(T);
  if (butBoussole(state) && sol) {
    const e = etatBoussole(state, tile % T.LARGEUR + 0.5, Math.floor(tile / T.LARGEUR) + 0.5, sol.lieux(), T.MONDE.cadre.SORTIE, T);
    if (e && e.arrive) {
      choisirBut(state, null);
      notify(`🧭 Te voilà : ${e.nom}. La boussole montre de nouveau la ferme.`, { kind: 'info' });
      change = true;
    }
  }
  if (change) { persistState(); carteMondeVu(); }
  // (le didacticiel, fiche 9b : sorti de la ferme, son étape passe)
  if (etapeDidacticiel(state) === 'sortie' && horsDeLaFerme(state)) refresh();
  expedition(tile);
}

// Fiche 11 : l'expédition. En sortant de la ferme, une alerte si le sac à provisions manque, est vide
// ou presque (loin de la ferme, il ne mange que ce qu'il contient) ; loin de la ferme, une alerte (une
// fois par sortie) quand l'énergie baisse et que le sac est vide. Ses bottes : sa vitesse à pied dans
// le biome de sa case (modèle.pied, js/fermier.js).
let piedIci = 1, dehorsAvant = null, faimDite = false;
function expedition(tile) {
  const dehors = horsDeLaFerme(state);
  if (dehors && dehorsAvant === false) {
    const t = alerteSortie(state);
    if (t) notify(`🎒 ${t}`, { kind: 'alerte', cible: { fenetre: 'famille' } });
  }
  if (!dehors) faimDite = false;
  else if (!faimDite && alerteFaim(state)) {
    faimDite = true;
    notify('🎒 Ton énergie baisse et ton sac à provisions est vide : rentre à la ferme pour manger.', { kind: 'alerte', cible: { fenetre: 'famille' } });
  }
  dehorsAvant = dehors;
  const v = vitessePied(state, biomeDeCase(tile));
  if (v !== piedIci) { piedIci = v; setLastRenderAt(0); refresh(); }
}

// Le biome de la case (son nom), d'après l'aperçu des biomes du Web Worker (un par bloc de 8 × 8 cases :
// js/ui/monde-sol.js), ou null tant qu'il n'est pas là.
function biomeDeCase(tile) {
  const T = farmTerrain(state), sol = solDuMonde(T), a = sol && sol.apercu();
  if (!a) return null;
  const { pas, l, h, biomes } = a.apercu, c = Math.floor((tile % T.LARGEUR) / pas), r = Math.floor(Math.floor(tile / T.LARGEUR) / pas);
  return c >= 0 && r >= 0 && c < l && r < h ? BIOMES[biomes[r * l + c]] || null : null;
}

// Le brouillard pour la carte (js/carte/ferme/brouillard.js) : le vu de la partie (une chaîne base64,
// un bit par cellule), la taille des cellules et de leur grille ; null sans grand monde
// (js/engine/monde-vu.js, vuDe). La ferme y est comme le reste du monde (fiche 14b : rien n'est vu d'office).
function brouillardModele() {
  const v = vuDe(state);
  return v ? { vu: v.vu, C: v.C, L: v.L, H: v.H } : null;
}

// La boussole pour la carte (js/carte/ferme/boussole.js) : le lieu choisi sur la carte du monde (s'il est
// encore vu), la ferme (le bout de sa sortie), le rectangle de la ferme (en px) ; montree : les Options.
function boussoleModele() {
  const T = farmTerrain(state), sol = T.MONDE ? solDuMonde(T) : null;
  if (!T.FERME || !sol) return null;
  const W = T.LARGEUR, px = (c) => ({ x: (c % W) * 16 + 8, y: Math.floor(c / W) * 16 + 8 }), F = T.FERME;
  const b = butBoussole(state), lieux = sol.lieux();
  let but = null;
  if (b && lieux) {
    const L = lieuxDeLaCarte(state, lieux, T), l = (b.sorte === 'hameau' ? L.hameaux : b.sorte === 'grotte' ? L.grottes : L.peche).find((q) => q.id === b.id);
    if (l) but = { ...px(l.case), nom: l.nom, icone: LIEUX_ICONES[b.sorte] };
  }
  return {
    montree: boussoleMontree(state), but,
    ferme: { ...px(T.MONDE.cadre.SORTIE), nom: 'La ferme', icone: LIEUX_ICONES.ferme },
    surFerme: { x0: F.X * 16, y0: F.Y * 16, x1: (F.X + F.LARGEUR) * 16, y1: (F.Y + F.HAUTEUR) * 16 },
  };
}

// Une bête du grand monde paraît pour la première fois dans la vue (js/carte/ferme/faune-monde.js) :
// sa page de l'encyclopédie se découvre (« faune:<espèce> »).
function stageFauneVue(espece) {
  if (DATA.FAUNE && DATA.FAUNE.ESPECES[espece]) encyclopedieFaune(espece);
}

// Un appui sur une bête du grand monde : son nom, et sa page de l'encyclopédie (découverte s'il le
// faut). On ne la chasse pas.
function stageFaune(espece) {
  const e = DATA.FAUNE && DATA.FAUNE.ESPECES[espece];
  if (!e) return;
  encyclopedieFaune(espece);
  notify(`👀 ${e.nom} — sa page dans l'Encyclopédie.`, { kind: 'info' });
  openEncyclopedie('faune_' + espece);
}

// Le personnage arrive dans un hameau du grand monde (js/carte/ferme/hameaux.js : { id, nom, style }) :
// la première fois, il est noté dans la sauvegarde (state.monde.hameaux) et une bannière l'annonce, à
// son nom ; sa page de l'encyclopédie se découvre.
// Ses habitants naissent (js/ui/habitants.js : peuplerDepuisCarte, le plan du hameau ; fiche 7b), la
// première fois, ou à la première visite d'une partie d'avant eux.
function stageHameau(h) {
  // (appelé pendant l'image de la carte : la vue se refait juste après)
  const nes = peuplerDepuisCarte(h.id);
  if (!voirHameau(state, h)) { if (nes) setTimeout(refresh, 0); return; }
  persistState();
  banniereHameau(h);
  encyclopedieHameau();
  setTimeout(refresh, 0);
}

// Le récit : le personnage entre dans une maison de hameau (js/carte/ferme/hameaux.js) ; celle de Maurice,
// au Gué, est le lieu de la scène d'Odile (odile_maison, data/recit.json ; js/ui/scene.js). Elle n'est pas
// fermée : on ne ferme pas, au Gué ; la clé d'Achille dit que la maison est au joueur. (appelé pendant
// l'image de la carte : la fenêtre s'ouvre juste après)
function stageMaison(m) {
  if (!m || !m.maurice) return;
  setTimeout(() => proposerScene({ lieu: 'maison_maurice', hameau: m.hameau }), 0);
}

// La bannière d'un hameau découvert : son nom, son pays, quelques secondes en haut de la carte.
const BANNIERE_MS = 4200;
function banniereHameau(h) {
  const el = document.createElement('div');
  const S = HAMEAUX.STYLES[h.style];
  el.className = 'hameau-banniere';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="hameau-banniere-sous">Un hameau ${S ? escapeHtml(S.nom) : ''}</span><strong>${escapeHtml(h.nom)}</strong>`;
  (document.getElementById('farm-stage') || document.body).appendChild(el);
  requestAnimationFrame(() => el.classList.add('visible'));
  setTimeout(() => { el.classList.remove('visible'); setTimeout(() => el.remove(), 700); }, BANNIERE_MS);
}

// Un appui sur le panneau d'un hameau : sa fiche (ses familles, sa réserve : js/ui/habitants.js), ou
// son nom tant qu'il n'a pas d'habitants.
function stageHameauPanneau(h) {
  openFicheHameau(h);
}

// Un outil qui n'a rien à faire dans un hameau (js/carte/ferme/hameaux.js, hameauOutil) : il le dit.
// (« à Brumeval », « au Gué », « aux Saules », « à la Bruyère » ; « de », « du », « des »…)
const aNom = (n) => n.replace(/^Les /, 'aux ').replace(/^Le /, 'au ').replace(/^La /, 'à la ').replace(/^L'/, 'à l\'').replace(/^(?!aux |au |à )/, 'à ');
const deNom = (n) => n.replace(/^Les /, 'des ').replace(/^Le /, 'du ').replace(/^La /, 'de la ').replace(/^L'/, 'de l\'').replace(/^(?!des |du |de )/, 'de ');
const REFUS_HAMEAU = {
  hache: (n) => `🪓 On ne coupe pas les arbres des jardins ${deNom(n)} : ils sont aux habitants.`,
  pioche: (n) => `⛏️ On ne casse rien ${aNom(n)} : les murs, les clôtures et les puits sont aux habitants.`,
  faux: (n) => `On ne fauche pas les potagers ${deNom(n)} : ils sont aux habitants.`,
  houe: (n) => `On ne laboure pas ${aNom(n)} : c'est un hameau, pas un champ.`,
  bati: (n) => `🏘️ On ne bâtit pas ${aNom(n)} : on ne bâtit que sur la ferme.`,
  planter: (n) => `On ne plante pas d'arbre ${aNom(n)} : on ne plante que sur la ferme.`,
};
function stageHameauRefus(outil, nom) {
  const f = REFUS_HAMEAU[outil];
  if (f) notify(f(String(nom)), { kind: 'info' });
}

// Fiche 21 : un appui sur une parcelle de la carte. Un geste possible (semer, arroser, récolter) :
// null, la scène le fait comme avant. Rien à faire : le texte de la petite bulle qu'elle pose
// au-dessus de la case, à la place de l'ancienne fenêtre de la zone (qui s'ouvre maintenant d'un
// appui long, des notifications et de la puce d'objectif).
function stageParcelle(id) {
  const p = findPlot(state, id);
  if (!p) return null;
  if (!p.culture) {
    // (une terre sans aucune graine à y semer : la fenêtre du choix n'aurait que des boutons grisés)
    return plantableCropsFor(state, p.lieu).some((c) => seedStock(state, c) > 0) ? null : 'Terre labourée · aucune graine à semer';
  }
  if (isMature(p) || !p.arrose) return null;
  const def = DATA.CULTURES[p.culture];
  const h = growHoursLeft(state, p);
  const mure = p.stade + 1 >= maxStage(p);   // (ce stade-ci est le dernier)
  const quand = h >= 1 ? `${mure ? 'mûre' : 'un stade'} dans ${Math.ceil(h)} h` : mure ? 'bientôt mûre' : 'pousse bientôt';
  return `${def.icone} ${def.nom} · arrosée · ${quand}`;
}

// Le sol du grand monde pour la carte (js/ui/monde-sol.js), et les cases que ce qui y est pris rend
// à la marche (casesOuvertesMonde, d'après la partie en cours).
function mondeDeLaCarte() {
  const sol = solDuMonde(farmTerrain(state));
  if (sol) sol.ouvertes = () => casesOuvertesMonde(state);
  return sol;
}

// Sans la carte de la ferme à l'écran (une autre carte, pas de carte) : le second adulte fait
// quand même son travail aux heures où il travaille (comme js/famille-ferme.js : levé avec le
// personnage, jusqu'à FAMILLE.HORAIRE.FIN_TRAVAIL_ADULTES ; ensuite il flâne).
function aideSansCarte() {
  if (nightActive(state) || clockHours(state) >= DATA.FAMILLE.HORAIRE.FIN_TRAVAIL_ADULTES) return;
  for (const lieu of aideAFaire(state)) aideBetes(state, lieu);
  // (fiche 19 : ses initiatives aussi, d'un coup, sans dessin)
  if (journeeCompagnon(state).length) persistState();
}

function stageCollect(lieu) {
  const r = collectAt(state, lieu);
  if (r.ok && r.fatigue) notify(TIRED);
  else if (!r.ok && r.error === TIRED) notify(TIRED);
  if (r.ok || r.error === TIRED) { persistState(); refresh(); }
  return r.ok ? r.items : null;
}

// Version 1.15 : tuiles que la houe peut labourer (la grille verte de la carte en mode houe),
// recalculées seulement quand la terre change.
let labourablesCache = { key: null, tiles: null };
function labourables() {
  const key = state.potager.parcelles.map((p) => p.case).join() + '|' + brokenRocks(state).join(';') + '|' + fellenTrees(state).join(';');
  if (labourablesCache.key !== key) labourablesCache = { key, tiles: hoeableTiles(state) };
  return labourablesCache.tiles;
}

// Les rangées du terrain (une tuile sous un rocher cassé ou un arbre abattu se laboure),
// recalculées seulement quand ils changent.
let terrainCache = { key: null, lines: null };
function terrainNow(rochers) {
  const key = rochers.join(';');
  if (terrainCache.key !== key) terrainCache = { key, lines: terrainLines(state) };
  return terrainCache.lines;
}

// Pont carte → jeu : l'action du registre, comme un clic sur un bouton qui porterait
// data-action et ces data-* (en texte, comme dans le DOM) ; suivi et sommeil compris.
function stageAct(action, data) {
  const target = { dataset: Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, String(v)])) };
  runAction(action, target, { target });
}

export function renderStage() {
  syncRamassage();
  const el = document.getElementById('farm-stage');
  // Tant que la partie n'est pas configurée (écran « Ta famille »), pas de carte : la ferme
  // générée n'a pas encore de graine (js/ui/depart.js). Seules les fenêtres de configuration
  // s'affichent (body.configuration, css/jeu.css) ; la page se recharge au départ.
  const configuration = !!state && setupPending(state);
  document.body.classList.toggle('configuration', configuration);
  let on = stageActive() && !configuration;
  // Une autre carte est affichée (js/ui/excursion.js) : celle de la ferme se cache, les
  // fenêtres et la barre d'outils restent.
  if (on && document.body.classList.contains('en-excursion')) {
    aideSansCarte();
    el.hidden = true;
    document.body.classList.add('has-stage');
    if (window.FarmStage && stageMounted) FarmStage.hide();
    return;
  }
  const wasOn = stageMounted && !el.hidden; // la carte était-elle déjà à l'écran ?
  if (on && !stageMounted) {
    stageMounted = true;
    stageMountedAt = Date.now();
    el.hidden = false;
    // Ne pas laisser un plantage de Phaser empêcher de jouer : repli sur la liste classique.
    try {
      if (!FarmStage.mount(el, { act: stageAct, onView: stageOnView, pickup: stagePickup, collect: stageCollect, aide: stageAide, marche: stageMarche, region: stageRegion, ici: stageIci, faune: stageFaune, fauneVue: stageFauneVue, hameau: stageHameau, maison: stageMaison, hameauPanneau: stageHameauPanneau, hameauRefus: stageHameauRefus, parcelle: stageParcelle, caleche: calecheDepuisCarte, calecheTouchee: calecheToucheeDepuisCarte, calecheHeler: helerCaleche, habitantAgit: habitantDepuisCarte, habitantParle: paroleDepuisCarte, visite: visiteDepuisCarte, regionTuiles: MONDE.REGION, chop: chopFromStage, recolte: mondeFromStage, mine: mineFromStage, caillou: caillouFromStage, scythe: scytheFromStage, scytheAround: scytheAroundFromStage, fish: fishFromStage, ramasser: ramasserFromStage, morceau: morceauFromStage, verser: verserFromStage, puiser: puiserFromStage, verserGrain: verserGrainFromStage, botte: botteFromStage, asleep: asleepFromStage, icone: (item) => (DATA.OBJETS[item] ? DATA.OBJETS[item].icone : item === 'arrose' ? '💧' : ''), base: 'assets/', crops: cropSprites(), carte: farmMap(state), monde: mondeDeLaCarte() })) stageBroken = true;
    } catch (err) {
      stageBroken = true;
    }
    if (stageBroken) {
      on = false;
      renderTabContent();
    }
  }
  el.hidden = !on;
  document.body.classList.toggle('has-stage', on);
  if (!on) {
    aideSansCarte();
    if (window.FarmStage) FarmStage.hide();
    return;
  }
  FarmStage.show();
  FarmStage.update(stageModel());
  // Déplacement demandé par une notification ou un indicateur : sans animation si la carte
  // vient d'apparaître. Tant que la scène n'est pas prête, la demande attend.
  if (stagePan && FarmStage.ready()) {
    FarmStage.panTo(stagePan, !wasOn);
    stagePan = null;
  }
  renderStageHud(el);
}

/* Par-dessus la carte (DOM) : l'objectif du chapitre en bas, et
   une flèche sur chaque bord tant que le joueur n'a pas fait glisser la carte. */

const STAGE_DRAG_KEY = 'ferme-carte-glissee';
let stageDragged = safeStorageGet(STAGE_DRAG_KEY) === '1'; // le joueur a déjà fait glisser la carte
let stageView = null;  // dernière vue signalée par la scène (voir viewInfo() dans farm-stage.js)
let stagePan = null;   // lieu vers lequel la carte doit glisser au prochain rendu
export function setStagePan(value) {
  stagePan = value;
  return value;
}

// Appelé par la scène quand l'écran courant change, quand un bord est atteint ou quitté,
// et au premier glissement.
function stageOnView(v) {
  stageView = v;
  if (v.glisse && !stageDragged) {
    stageDragged = true;
    safeStorageSet(STAGE_DRAG_KEY, '1');
  }
  const el = document.getElementById('farm-stage');
  if (el && !el.hidden) renderStageNav(el);
}

// Fluidité (FLU-01) : la puce d'objectif mène là où l'objectif se fait. Type d'objectif →
// cible (voir cibleAttrs) ; 'niveaux' : la fenêtre Niveaux ; un type absent : la liste des
// chapitres.
// Fiche 21 : un appui sur une parcelle n'ouvre plus la fenêtre de la zone (un geste, ou une
// bulle) ; ces raccourcis vers { fenetre: 'zone' }, comme les notifications d'arrosage et de
// récolte (cibleAlerte) et celle du robot, restent avec l'appui long sur une parcelle les chemins
// vers elle et ses boutons de groupe (Planter partout, Arroser tout, Récolter tout).
const OBJECTIF_CIBLES = {
  maison: { fenetre: 'installations' },
  panneau: { fenetre: 'installations' },
  pompe: { fenetre: 'installations' },
  reservoir: { fenetre: 'installations' },
  houe: { fenetre: 'atelier' },   // (fiche 7c : la houe se fabrique à l'Atelier)
  recoltes: { fenetre: 'zone' },
  cultures: { fenetre: 'zone' },
  semisBle: { fenetre: 'zone' },
  // FLU-42 : labourer → la houe en main ; planter et arroser → la fiche des parcelles
  labours: 'houe',
  semis: { fenetre: 'zone' },
  arrosees: { fenetre: 'zone' },
  silo: { fenetre: 'silo' },
  siloBle: { fenetre: 'silo' },
  pains: { fenetre: 'installations' },
  plats: { fenetre: 'installations' },
  niveau: 'niveaux',
};

// Attributs du bouton qui mène à l'objectif `type`.
export function objectifAttrs(type) {
  const c = OBJECTIF_CIBLES[type];
  if (c === 'niveaux') return 'data-action="open-levels"';
  if (c === 'houe') return 'data-action="hoe-take"';
  if (c) return cibleAttrs(c);
  return 'data-action="stage-open" data-window="chapitres"';
}

// Objectif en cours, en une ligne : le premier objectif pas encore atteint du chapitre.
// Houe en main (FLU-41), la puce se réduit à son icône et à sa valeur, pour laisser la
// place à la puce de la houe.
function chapterChipHtml() {
  const c = state.campagne;
  if (c.fini) {
    return '<button type="button" class="stage-chip done" data-action="stage-open" data-window="chapitres" aria-label="Campagne terminée, mode libre. Ouvrir les chapitres"><span class="stage-chip-pill"><span aria-hidden="true">🏆</span><span class="stage-chip-text">Mode libre</span><span class="stage-chip-go" aria-hidden="true">›</span></span></button>';
  }
  const p = chapterProgress(state);
  const faits = p.objectifs.filter((o) => o.ok).length;
  const o = p.objectifs.find((x) => !x.ok) || p.objectifs[p.objectifs.length - 1];
  const valeur = objectiveValueText(o);
  const pct = Math.round(o.ratio * 100);
  const suite = p.objectifs.length > 1 ? `, objectif ${Math.min(faits + 1, p.objectifs.length)} sur ${p.objectifs.length}` : '';
  const compacte = ((hoeMode && state.potager.houe) || axeMode || pickMode || scytheMode || rodMode || buildMode) && !stageInterior;
  const vers = OBJECTIF_CIBLES[o.type] ? 'Y aller' : 'Ouvrir les chapitres';
  return `<button type="button" class="stage-chip${compacte ? ' compact' : ''}" ${objectifAttrs(o.type)} aria-label="Chapitre ${p.chapitre}${suite} : ${o.libelle}${valeur ? `, ${valeur}` : ''}. ${vers}" title="Chapitre ${p.chapitre} : ${p.titre} — ${o.libelle}"><span class="stage-chip-pill"><span aria-hidden="true">${p.icone}</span>${compacte ? '' : `<span class="stage-chip-text">${o.libelle}</span>`}<span class="stage-chip-val num">${valeur}</span><span class="stage-chip-go" aria-hidden="true">›</span><span class="stage-chip-bar" aria-hidden="true"><span style="width:${pct}%"></span></span></span></button>`;
}

// Version 1.9 : en mode houe, un bouton sur la carte rappelle les tuiles et range la houe.
// FLU-06 : la première fois que la houe est en main, une bulle dit quoi faire (quelques secondes).
let hoeHintUntil = 0;
export function showHoeHint() {
  hoeHintUntil = Date.now() + 8000;
  const tiles = labourables();
  // sur la carte, après le rendu : glisse vers les cases vertes si aucune n'est visible
  setTimeout(() => { if (window.FarmStage && FarmStage.showTiles) FarmStage.showTiles(tiles); }, 50);
}

function hoeChipHtml() {
  if (!hoeMode) hoeHintUntil = 0;                 // la houe rangée, la bulle ne revient pas
  if (!hoeMode || !state.potager.houe || stageInterior) return '';
  const bulle = Date.now() < hoeHintUntil ? '<span class="hoe-hint" role="status">Touche une case verte pour la labourer</span>' : '';
  return `<button type="button" class="stage-chip hoe" data-action="hoe-toggle" aria-pressed="true" aria-label="Houe en main : ${soilCount(state)} tuiles sur ${soilCap(state)}. Ranger la houe" title="Touche une tuile d'herbe de la carte pour la labourer"><span class="stage-chip-pill"><span aria-hidden="true">${DATA.HOUE.ICONE}</span><span class="stage-chip-text">Houe</span><span class="stage-chip-val num">${soilCount(state)} / ${soilCap(state)}</span><span class="stage-chip-go" aria-hidden="true">✕</span></span></button>${bulle}`;
}

function renderStageHud(el) {
  let hud = el.querySelector('.stage-hud');
  if (!hud) {
    el.insertAdjacentHTML('beforeend', '<div class="stage-hud"></div><div class="stage-nav"></div>');
    hud = el.querySelector('.stage-hud');
  }
  // le mode Construire : son menu prend le haut de l'écran, le HUD du haut s'efface (jeu.css)
  document.body.classList.toggle('construction', !!buildMode && !stageInterior);
  morph(hud, chapterChipHtml() + hoeChipHtml() + axeChipHtml() + pickChipHtml() + scytheChipHtml() + rodChipHtml() + buildChipHtml());
  if (!stageView) stageView = FarmStage.view();
  renderStageNav(el);
}

// Les flèches des bords (tant que le joueur n'a pas fait glisser la carte).
function renderStageNav(el) {
  const nav = el.querySelector('.stage-nav');
  const v = stageView;
  if (!nav) return;
  if (!v || !v.mobile) {
    morph(nav, '');
    return;
  }
  const fleche = (cote, ecran, signe, nom) =>
    `<button type="button" class="stage-arrow ${cote}" data-action="stage-pan" data-ecran="${ecran}" aria-label="${nom}" title="${nom}"><span aria-hidden="true">${signe}</span></button>`;
  const arrows = stageDragged
    ? ''
    : (v.gauche ? fleche('gauche', Math.max(0, v.ecran - 1), '‹', 'La carte continue à gauche') : '') +
      (v.droite ? fleche('droite', Math.min(v.ecrans - 1, v.ecran + 1), '›', 'La carte continue à droite') : '') +
      // FLU-07 : un chevron discret annonce que la carte continue aussi vers le bas
      (v.bas ? '<button type="button" class="stage-arrow bas" data-action="stage-pan-down" aria-label="La carte continue vers le bas" title="La carte continue vers le bas"><span aria-hidden="true">⌄</span></button>' : '');
  morph(nav, arrows);
}

// Fait glisser la carte jusqu'à un repère (0, 1 ou 2) : l'étable, la maison, le moulin et la serre.
function stagePanToScreen(i) {
  const v = window.FarmStage ? FarmStage.view() : null;
  if (!v || !v.mobile) return;
  const n = Math.max(0, Math.min(v.ecrans - 1, Number(i) || 0));
  FarmStage.panTo(v.points[n]);
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'stage-open': (target) => {
    // le puits, la cruche pas pleine : le personnage va la remplir au puits (fiche 17,
    // js/ui/cruche.js) ; sinon sa fenêtre
    if (target.dataset.window === 'eau' && aCruche(state) && puitsPose(state) && eauCruche(state) < crucheCapacite()) {
      allerAuPuits();
      return;
    }
    openStageWindow(target.dataset.window);
  },
  'aller': (target) => {
    closeModal();
    allerA(cibleDe(target.dataset));
  },
  'stage-pan': (target) => {
    stagePanToScreen(target.dataset.ecran);
  },
  // FLU-07 : descend d'une demi-hauteur de vue
  'stage-pan-down': () => {
    // TODO : FarmStage n'expose pas la vue de la caméra ; une méthode publique (son centre et
    // sa taille) éviterait de lire ici les objets internes de Phaser (cameras.main.worldView).
    const s = window.FarmStage && FarmStage.scene();
    if (!s || !s.ready) return;
    const cam = s.cameras.main;
    FarmStage.panTo({ x: cam.worldView.centerX, y: cam.worldView.centerY + cam.worldView.height / 2 });
  },
});
