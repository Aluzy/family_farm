import { DATA } from '../engine/catalog.js';
import { formatLitres, weekdayIndex } from '../engine/format.js';
import { clockHours, nightActive } from '../engine/clock.js';
import { houseRepaired, mainCharacter } from '../engine/depart.js';
import { findDevice, isOwned, starterOf, tankCapacity } from '../engine/devices.js';
import { furnitureCount } from '../engine/meubles.js';
import { fridgeUnits } from '../engine/fridge.js';
import { memberPerso } from '../engine/family.js';
import { allPlots, growHoursLeft, hoeableTiles, terrainLines, isMature, maxStage, soilCap, soilCount } from '../engine/crops.js';
import { ripeTrees, treeAt, treeStage } from '../engine/orchard.js';
import { sheepToShear, woolReady } from '../engine/animals.js';
import { techAuto } from '../engine/techtree.js';
import { chapterProgress, isUnlocked } from '../engine/campaign.js';
import { alertSnapshot, getNotifications } from '../engine/alerts.js';
import { collectAt, pickUp, pickUpAll, piles } from '../engine/ramassage.js';
import { TIRED } from '../engine/stamina.js';
import { brokenRocks, fellenTrees } from '../engine/outils.js';
import { asleep } from '../engine/night.js';
import { absoluteHours } from '../engine/clock.js';
import { farmMap, farmTerrain, tileCount } from '../engine/terrain.js';
import { robotBattery, robotChargePct, robotOn, robotTrip } from '../engine/automation.js';
import { notify } from './toasts.js';
import {
  activeTab, axeMode, buildMode, coucher, ecranFerme, hoeMode, pickMode, rodMode, setActiveTab, setComptoirTab, setEcranFerme, setInvTab, state, tabAvailable, TABS,
} from './store.js';
import { telView } from './consent.js';
import { persistState, safeStorageGet, safeStorageSet } from './storage.js';
import { morph, refresh, setLastRenderAt } from './render.js';
import {
  allerAuLieu, asleepFromStage, interiorAvailable, interiorHelp, MAISON_TABS, openStageWindow, renderTabContent, setAncreVoulue,
  setStageInterior, setStageReturn, setStageWindow, stageInterior, STAGE_WINDOWS, windowLocked,
} from './stage-windows.js';
import { renderMoulin } from './cuisine.js';
import { objectiveValueText } from './chapitres.js';
import { registerActions } from './actions.js';
import { axeChipHtml, chopFromStage, fishFromStage, mineFromStage, pickChipHtml, rodChipHtml } from './outils.js';
import { ramasserFromStage } from './atelier.js';
import { ramassables } from '../engine/atelier.js';
import { blocsPoses, couchages, piecesCloses } from '../engine/blocs.js';
import { atelierOuvert } from '../engine/atelier.js';
import { buildChipHtml } from './chantier.js';
import { closeModal } from './modal.js';
import { itemsText } from './common.js';
import { runAction } from './events.js';

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

// Cadran d'horloge de l'heure entière : 🕐 (1 h) à 🕛 (12 h), le même le matin et le soir.
export function horlogeEmoji(heure) {
  return String.fromCodePoint(0x1f550 + ((Math.floor(heure) + 11) % 12));
}

// Lieux de la carte qui portent une étiquette (et une fenêtre du même nom).
export const STAGE_LIEUX = ['maison', 'etable', 'poulailler', 'moulin', 'serre', 'verger', 'zone', 'silo', 'ville'];

// La carte a douze emplacements d'arbres (rectangles arbre_verger_1 à 12) : autant que le
// Verger peut en compter.
const STAGE_ARBRES = 12;

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
    // La paille se fait au Moulin ; tant qu'il n'existe pas, on montre le stock à l'Étable.
    case 'paille': case 'pailleManque':
      return isUnlocked(state, 'moulin') && state.stations.moulin.construit && moulinSurPlace()
        ? { fenetre: 'moulin', ancre: 'moulin-moudre' }
        : { fenetre: 'etable', ancre: 'etable-paille' };
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
    const phase = mature ? 3 : p.stade <= 0 ? 0 : p.stade / max < 0.5 ? 1 : 2;
    return { id: p.id, culture: p.culture, icone: DATA.CULTURES[p.culture].icone, phase, mature, arrosee: mouillee(p) };
  };
  // Avec l'arrosage automatique, la terre sèche la dernière heure du cycle (de 6 h à 7 h pour
  // une plante arrosée la veille à 7 h) : les asperseurs la mouillent sous les yeux du joueur.
  const seche = DATA.TEMPS.ARROSAGE_HEURE - DATA.TEMPS.HEURE_REVEIL;
  const mouillee = (p) => !!p.arrose && !(techAuto(state, 'arrosage', p.lieu) && growHoursLeft(state, p) <= seche);
  // version 1.9 : chaque parcelle de zone a sa case ; la carte en tire la terre et ses bordures
  const zoneVue = () => (p) => ({ ...vue(p), case: p.case });
  const plots = state.potager.parcelles.map(zoneVue(1));
  // La Serre : ses parcelles se posent dans les bacs de son intérieur (vide tant qu'elle
  // n'est pas construite). `interieur` dit si le joueur y est entré.
  const serre = state.serre.construit ? state.serre.parcelles.map(vue) : [];
  // Version 1.13 : chaque case achetée du Verger, arbre ou emplacement libre, avec son
  // dessin (0 libre, 1 jeune arbre, 2 arbuste, 3 arbre, 4 pommier et 5 poirier en fruits).
  const arbres = [];
  // (la ferme générée : chaque arbre planté dans le sol, sa case de la carte, sans emplacement)
  if (atelierOuvert(state)) {
    for (const t of state.verger.arbres) {
      const st = treeStage(state, t);
      arbres.push({ case: t.case, id: t.id, fruits: !!t.fruits, dessin: st < 3 ? st + 1 : t.espece === 'poirier' ? 5 : 4, sol: true });
    }
  } else if (isUnlocked(state, 'verger') && state.verger.construit) {
    for (let c = 0; c < Math.min(state.verger.places, STAGE_ARBRES); c++) {
      const t = treeAt(state, c);
      if (!t) { arbres.push({ case: c, libre: true, dessin: 0 }); continue; }
      const st = treeStage(state, t);
      arbres.push({ case: c, id: t.id, fruits: !!t.fruits, dessin: st < 3 ? st + 1 : t.espece === 'poirier' ? 5 : 4 });
    }
  }
  // Lieux étiquetés : seulement ceux que le jeu a débloqués (la maison et la zone sont
  // toujours là), avec leur nom et le nombre de choses à y faire.
  const aFaire = aFaireParLieu();
  const batiments = {};
  // version 1.12 : les bâtiments verrouillés sont aussi sur la carte (délabrés)
  for (const id of STAGE_LIEUX) batiments[id] = { visible: STAGE_WINDOWS[id].ok() || windowLocked(id), nom: STAGE_WINDOWS[id].nom, badge: aFaire[id], ruine: buildingInRuins(id) };
  // le Moulin ne tourne que quand il moud (du blé en cours)
  batiments.moulin.enMarche = !!(state.stations && state.stations.moulin && state.stations.moulin.tache);
  // Heure arrondie au quart d'heure : la lumière de la carte change par petits pas.
  const heure = (Math.round(heureDuJour() * 4) / 4) % 24;
  // Les bêtes de l'Étable et du Poulailler : seulement des nombres, la carte en fait des
  // bêtes dans l'enclos et des poules en liberté autour du Poulailler.
  const animaux = { vache: state.paturage.vaches.length, mouton: state.paturage.moutons.length, poule: state.poulailler.poules };
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
  // La citerne (le réservoir), une fois achetée : son tube de niveau, vide (0) à plein (4).
  const cap = tankCapacity(state);
  const citerne = isOwned(starterOf(state, 'reservoir')) ? (cap > 0 ? Math.round((Math.min(state.eauMl, cap) * 4) / cap) : 0) : -1;
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
  // Meubles achetés au Marché : chacun à sa place (chaise_1…, lit_1… : les lits d'adulte d'abord ;
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
  const tas = piles(state);
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
    // la nuit (22 h → 6 h) : la lumière ; la famille reste dedans (le joueur, lui, peut agir)
    nuit: nightActive(state),
    // le joueur a appuyé sur « Dormir » : le personnage va à son lit (js/fermier.js) ; il y
    // dort (la nuit défile en accéléré), même quand on regarde la carte de la ferme
    coucher: (coucher || asleep(state)) && nightActive(state),
    dort: asleep(state),
    ramasser,
    // version 1.17 : le personnage du joueur sur la carte (son numéro dans le catalogue)
    perso: memberPerso(mainCharacter(state)),
    // les autres membres de la famille, qui font leur journée sur la carte (js/famille-ferme.js),
    // et le jour de la semaine (0 : lundi) : les enfants vont à l'école les jours d'école
    famille: state.famille.membres.filter((m) => m !== mainCharacter(state)).map((m) => ({ id: m.id, perso: memberPerso(m), enfant: !!m.enfant })),
    semaine: weekdayIndex(state.day),
    jour: state.day, cuisson, frigo: state.frigo && state.frigo.construit ? fridgeUnits(state) : 0,
    heure, cols: T.LARGEUR, cases: tileCount(T), terrain: terrainNow(rochers.concat(abattus)), plots,
    // la ferme générée : ce qui est à ramasser à la main (js/engine/atelier.js)
    ramassables: ramassables(state).map((r) => ({ id: r.id, sorte: r.sorte, case: r.case, buisson: !!r.buisson })),
    // et ses blocs posés, le mode Construire (les pièces closes s'y voient), les paillasses où
    // l'on dort (js/engine/blocs.js)
    blocs: Object.entries(blocsPoses(state)).map(([c, sorte]) => ({ case: Number(c), sorte })),
    bati: buildMode && !stageInterior ? { sorte: buildMode } : null,
    pieces: buildMode && !stageInterior ? piecesCloses(state).map((p) => p.cases) : null,
    couchages: couchages(state),
    foyer: foyerPorte(),
    houe, hache, pioche, canne, rochers, abattus, asperseurs, robot, parAuto: autoDone(), labourables: houe ? labourables() : null, serre, interieur: stageInterior, arbres, batiments, animaux, panneaux, pompe, pompeEnMarche, citerne, citerneTexte, meubles,
  };
}

// La ferme générée, sans maison : la porte du foyer (la première pièce close où l'on dort, sinon
// la première pièce close), où le personnage rentre le soir et ressort le matin ; null sans pièce.
function foyerPorte() {
  if (!atelierOuvert(state)) return null;
  const pieces = piecesCloses(state);
  const p = pieces.find((q) => q.paillasses.length) || pieces[0];
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

// Le robot (récolte et semis automatiques) pour la carte : null sans lui ; { etat: 'repos' }
// quand sa liste du jour est faite (ou pas commencée) ; { etat: 'charge' } rentré recharger sa
// batterie vide (batterie : sa charge en % ; enCharge : sa station le recharge) ; sinon sa tâche en cours : la case
// visée (une tuile de la carte, ou 'serre'), 'recolter' ou 'planter', où elle en est (prog,
// de 0 à 1 ; elle dure dureeS secondes, dont la part `route` à rouler jusqu'à la parcelle), et
// son rang dans la liste. `vitesse` : la sienne, en px par seconde (le retour à sa base).
function robotModel() {
  if (!robotOn(state)) return null;
  const R = DATA.ROBOT, S = DATA.TEMPS.SECONDES_PAR_HEURE;
  const vitesse = (R.VITESSE * 16 * 60) / S;
  const r = state.robot;
  // sa batterie (en %) ; enCharge : sa station la recharge en ce moment
  const batterie = robotChargePct(state), enCharge = robotBattery(state).conso > 0;
  if (nightActive(state) || !r || r.jour !== state.day || r.i >= r.taches.length) return { etat: 'repos', vitesse, batterie, enCharge };
  if (r.charge) return { etat: 'charge', vitesse, batterie, enCharge };
  const tache = r.taches[r.i];
  const p = allPlots(state).find((x) => x.id === tache.id);
  const d = robotTrip(state, r, r.i), duree = d.route + d.travail;
  return {
    etat: 'travail', t: tache.t, a: p && p.lieu === 'potager' && Number.isInteger(p.case) ? p.case : 'serre',
    prog: Math.max(0, Math.min(1, (absoluteHours(state) - r.debut) / duree)), dureeS: duree * S, route: d.route / duree,
    n: r.i + 1, total: r.taches.length, vitesse, batterie, enCharge,
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

// Version 1.12 : un bâtiment pas encore réparé ou construit se dessine délabré.
function buildingInRuins(id) {
  switch (id) {
    case 'maison': return !houseRepaired(state);
    case 'etable': return !state.paturage.construit;
    case 'poulailler': return !state.poulailler.construit;
    case 'moulin': return !(state.stations && state.stations.moulin && state.stations.moulin.construit);
    case 'serre': return !state.serre.construit;
    case 'silo': return !state.silo.construit;
    default: return false;
  }
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
  let on = stageActive();
  // Une autre carte est affichée (js/ui/excursion.js) : celle de la ferme se cache, les
  // fenêtres et la barre d'outils restent.
  if (on && document.body.classList.contains('en-excursion')) {
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
      if (!FarmStage.mount(el, { act: stageAct, onView: stageOnView, pickup: stagePickup, collect: stageCollect, chop: chopFromStage, mine: mineFromStage, fish: fishFromStage, ramasser: ramasserFromStage, asleep: asleepFromStage, icone: (item) => (DATA.OBJETS[item] ? DATA.OBJETS[item].icone : ''), base: 'assets/', crops: cropSprites(), carte: farmMap(state) })) stageBroken = true;
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
    if (window.FarmStage) FarmStage.hide();
    return;
  }
  // Un intérieur qui n'existe plus (nouvelle partie, par exemple) : retour à la carte.
  if (stageInterior && !interiorAvailable(stageInterior)) setStageInterior(null);
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
const OBJECTIF_CIBLES = {
  maison: { fenetre: 'installations' },
  panneau: { fenetre: 'installations' },
  pompe: { fenetre: 'installations' },
  reservoir: { fenetre: 'installations' },
  houe: { page: 'comptoir', sous: 'acheter' },
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
  const compacte = ((hoeMode && state.potager.houe) || axeMode || pickMode || rodMode || buildMode) && !stageInterior;
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
  morph(hud, chapterChipHtml() + hoeChipHtml() + axeChipHtml() + pickChipHtml() + rodChipHtml() + buildChipHtml());
  if (!stageView) stageView = FarmStage.view();
  renderStageNav(el);
}

// Les flèches des bords (tant que le joueur n'a pas fait glisser la carte).
function renderStageNav(el) {
  const nav = el.querySelector('.stage-nav');
  const v = stageView;
  if (!nav) return;
  // Dans un intérieur : sortir, ou ouvrir la fenêtre du bâtiment.
  if (stageInterior) {
    const w = STAGE_WINDOWS[stageInterior];
    morph(nav, `<div class="stage-room-bar" role="group" aria-label="${w.nom}">
      <button type="button" class="btn btn-pill stage-room-btn" data-action="stage-exit" aria-label="Sortir : retour à la carte" title="Retour à la carte"><span aria-hidden="true">‹</span> Sortir</button>
      <button type="button" class="btn primary btn-pill stage-room-btn" data-action="stage-open" data-window="${stageInterior}" aria-label="${w.nom} : ${interiorHelp(stageInterior)}" title="${interiorHelp(stageInterior)}"><span aria-hidden="true">${w.icone}</span> Gérer</button>
    </div>`);
    return;
  }
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
