import { DATA } from '../engine/catalog.js';
import { energyLevel, enduranceReduction } from '../engine/stamina.js';
import { EPS } from '../engine/base.js';
import { allDevices, farmOpen, isOwned, starterOf } from '../engine/devices.js';
import { houseRepaired, mainCharacter } from '../engine/depart.js';
import { familyNameHtml } from './depart.js';
import { nightActive } from '../engine/clock.js';
import { asleep } from '../engine/night.js';
import { memberPerso, planMeal } from '../engine/family.js';
import { cowCount, sheepCount } from '../engine/animals.js';
import { isUnlocked, lastAutonomy, plannedAutonomy } from '../engine/campaign.js';
import { levelProgress, unlockLevel } from '../engine/levels.js';
import { notificationCount } from '../engine/alerts.js';
import { formatCoins, formatDay, formatNumber, formatPercent, weekdayShort } from '../engine/format.js';
import { dayOfMonth, monthName, moonPhase } from '../engine/lune.js';
import { renderCalendrier } from './calendrier.js';
import {
  activeTab, coucher, ecranFerme, FERME_LINKS, NAV_TABS, setActiveTab, setComptoirTab, setCoucher, setEcranFerme, setVergerCase, state, tabAvailable, TABS,
} from './store.js';
import { telView } from './consent.js';
import { notify } from './toasts.js';
import { MARKET_CLOSED } from '../engine/market.js';
import { actionSleep } from './game-actions.js';
import { artHtml } from './pixel-art.js';
import { renderVille } from './ville.js';
import { averageHappiness } from '../engine/ville.js';
import { morph, morphSlots, refresh, setLastRenderAt } from './render.js';
import {
  cibleAttrs, heureDuJour, horlogeEmoji, setStagePan, STAGE_LIEUX, stageActive, stageUsable,
} from './stage.js';
import {
  backToFerme, deviceName, renderDeviceFenetre, renderDeviceScreen, renderEauFenetre, renderEnergieFenetre, renderFerme,
  renderInstallationsMaison, renderPotager, renderRobotCard,
} from './ferme.js';
import { robotOn } from '../engine/automation.js';
import { renderPaturage, renderPoulailler, renderSilo } from './elevage.js';
import { renderFridgeCard, renderSerre, renderVerger } from './serre-verger-frigo.js';
import { renderAteliers, renderMoulin, renderRecettes, renderStationFenetre } from './cuisine.js';
import { renderTechno } from './techno.js';
import { memberNameHtml, persoSrc, renderFamille } from './famille.js';
import { renderCommerce } from './commerce.js';
import { renderNotifications } from './notifications.js';
import { fridgeSlots, inventoryTabsHtml, renderInventaire, subtabsHtml } from './inventaire.js';
import { renderAtelier } from './atelier.js';
import { atelierOuvert } from '../engine/atelier.js';
import { comptoirTabAOuvrir, marketTabsHtml, renderComptoir } from './marche.js';
import { renderChapterBanner } from './chapitres.js';
import { tutoTarget } from './aide.js';
import { registerActions } from './actions.js';
import { toolBarHtml, toolbarOpen } from './outils.js';
import { rememberFocus } from './modal.js';
import { jaugeClasse, plural } from './common.js';

/* ---------- Fenêtres de la carte ---------- */

// Un appui sur un bâtiment ou sur son étiquette ouvre une fenêtre dont le contenu est celui
// des sections de la Ferme, redessiné à chaque rendu : les boutons y fonctionnent comme
// dans la liste classique. Les fenêtres de #modal-root s'affichent par-dessus.
export let stageWindow = null; // null, 'maison', 'etable', 'poulailler', 'serre', 'moulin', 'verger', 'zone' ou 'chapitres'
export function setStageWindow(value) {
  stageWindow = value;
  return value;
}
export let stageReturn = null; // fenêtre à rouvrir en revenant d'un écran de détail (panneaux, batteries)
export function setStageReturn(value) {
  stageReturn = value;
  return value;
}
// Intérieur affiché à la place de la carte : null (dehors) ou 'serre'. On y entre en appuyant
// sur le bâtiment une fois qu'il est construit ; ses parcelles s'y travaillent d'un appui,
// comme celles des zones de culture. Rien n'est enregistré : c'est un état de l'affichage.
export let stageInterior = null;
export function setStageInterior(value) {
  stageInterior = value;
  return value;
}
// Intérieurs : la Serre (ses parcelles) et, une fois réparée, la maison (ses meubles : four,
// cuisine, réfrigérateur, chacun ouvre sa fenêtre). `gerer` : ce qu'ouvre le bouton « Gérer ».
const INTERIORS = {
  serre: { ok: () => state.serre.construit, gerer: 'agrandir, tout arroser, tout récolter' },
  maison: { ok: () => houseRepaired(state), gerer: 'livre de recette, commerce, installations' },
};
export function interiorHelp(id) {
  return INTERIORS[id] ? INTERIORS[id].gerer : '';
}

// L'intérieur peut-il être affiché ? Il faut le bâtiment, la carte, et que la scène ait pu
// charger la carte de l'intérieur (sinon la fenêtre du bâtiment reste le seul accès).
export function interiorAvailable(id) {
  const d = INTERIORS[id];
  return !!(d && d.ok() && stageUsable() && window.FarmStage && FarmStage.hasRoom && FarmStage.hasRoom(id));
}

export function enterInterior(id) {
  if (!interiorAvailable(id)) return false;
  stageInterior = id;
  stageWindow = null;
  stageReturn = null;
  setLastRenderAt(0); // rendu tout de suite : la vue change sans attendre la cadence
  refresh();
  return true;
}

export function leaveInterior() {
  if (!stageInterior) return;
  stageInterior = null;
  setCoucher(false); // sortir de la maison : il ne va plus se coucher (s'il dort déjà, il continue)
  stageWindow = null;
  stageReturn = null;
  setLastRenderAt(0);
  refresh();
}

let stageWindowShown = null; // dernière fenêtre dessinée (avec son onglet) : pour remonter en haut au changement
let windowFocusBack = null; // rend le focus à ce qui a ouvert la fenêtre (voir rememberFocus)
let maisonTab = 'recettes'; // onglet de la fenêtre Maison
let maisonTabChoisi = 'recettes'; // FLU-03 : le dernier onglet que le joueur a choisi
export function setMaisonTab(value) {
  maisonTab = value;
  return value;
}

// FLU-03 : la Maison s'ouvre là où il y a à faire : les Installations (leur propre fenêtre,
// aussi au menu latéral) tant que la maison est à réparer ou que le panneau, la pompe ou le
// réservoir manquent, ou tant que la Maison n'a aucun onglet ; sinon le dernier onglet choisi.
function maisonOuInstallations() {
  const manque = !houseRepaired(state) || ['panneau', 'pompe', 'reservoir'].some((id) => !isOwned(starterOf(state, id)));
  return manque || !MAISON_TABS.some((t) => t.ok()) ? 'installations' : 'maison';
}
let ancreVoulue = null; // id de l'élément à amener en haut au prochain rendu (calendrier, eau…)
export function setAncreVoulue(value) {
  ancreVoulue = value;
  return value;
}

export const MAISON_TABS = [
  // FLU-04 : `court` s'affiche sur l'onglet, `label` reste le nom complet (infobulle, lecteurs d'écran)
  { id: 'recettes', label: 'Livre de recette', court: 'Recettes', icon: '📖', ok: () => tabAvailable('recettes'), corps: () => renderRecettes() },
  // version 1.14 : le commerce du niveau 10
  { id: 'commerce', label: 'Commerce', icon: '🏪', ok: () => isUnlocked(state, 'commerce'), corps: () => renderCommerce() },
];

// La Famille et l'Arbre des technologies ne sont plus des onglets de la Maison : la Famille a
// sa fenêtre (carte du joueur), l'Arbre la sienne (menu latéral). Une ancienne cible
// « Maison › Famille » ou « Maison › Techno » (notification sauvegardée) y mène aussi.
function lieuFamille(fenetre, onglet) {
  if (fenetre !== 'maison') return fenetre;
  if (onglet === 'famille' || onglet === 'techno') return onglet;
  // les Installations ont quitté la Maison (onglet « batiments » des anciennes cibles)
  if (onglet === 'batiments') return 'installations';
  if (onglet) return MAISON_TABS.some((t) => t.id === onglet && t.ok()) ? 'maison' : 'installations';
  // la maison réparée : on y entre (voir allerAuLieu)
  return interiorAvailable('maison') ? 'maison' : maisonOuInstallations();
}

function maisonCurrentTab() {
  const tabs = MAISON_TABS.filter((t) => t.ok());
  return tabs.find((t) => t.id === maisonTab) || tabs[0];
}

// Fenêtre « Installations » (autrefois onglet « batiments » de la Maison) : ce qui n'a pas
// de dessin sur la carte : ateliers (Four, Cuisine, Presse), énergie et eau,
// Silo. L'ancre de l'eau sert à l'indicateur 💧 du bandeau.
function renderBatiments() {
  return `${renderAteliers()}<div id="bat-eau" class="ancre">${renderInstallationsMaison()}</div>${isUnlocked(state, 'silo') ? renderSilo() : ''}`;
}

// Version 1.1.1 : les animaux s'achètent au Marché ; l'Étable y mène par un raccourci.
// (Les arbres, eux, s'achètent toujours au Verger.)
function lienMarcheAnimaux(libelle) {
  return `<p class="row"><button type="button" class="btn" ${cibleAttrs({ page: 'comptoir', sous: 'animaux' })}>🛒 ${libelle} au Marché <span aria-hidden="true">›</span></button></p>`;
}

export function renderAchatPoules() {
  return state.poulailler.construit ? lienMarcheAnimaux('Acheter des poules') : '';
}

export function renderAchatTroupeau() {
  return state.paturage.construit ? lienMarcheAnimaux('Acheter des moutons et des vaches') : '';
}


// Une partie peut avoir des animaux avant que le chapitre n'ouvre leur logement (mode
// test, sauvegarde modifiée) : l'Étable et ses sections existent alors quand même, pour
// qu'aucun animal ne soit caché (et qu'aucune alerte ne parle d'animaux invisibles).
// Version 1.12 : les bâtiments de la carte sont là dès le départ, délabrés. Tant que leur
// niveau n'est pas atteint, leur fenêtre dit seulement à quel niveau on pourra les réparer.
// fenêtre → élément débloqué par un niveau (DATA.NIVEAUX.liste).
export const LOCKED_BUILDINGS = { etable: 'paturage', poulailler: 'poulailler', moulin: 'moulin', serre: 'serre', silo: 'silo' };

// La fenêtre `id` est-elle celle d'un bâtiment encore verrouillé (montré, mais pas réparable) ?
export function windowLocked(id) {
  const w = STAGE_WINDOWS[id];
  return !!(w && LOCKED_BUILDINGS[id] && !w.ok());
}

function lockedBody(id) {
  const el = LOCKED_BUILDINGS[id];
  const def = DATA.NIVEAUX.ELEMENTS[el] || {};
  const n = unlockLevel(el);
  return `
    <div class="card locked-building">
      <span class="card-title"><span>🏚️ ${STAGE_WINDOWS[id].nom} délabré${id === 'serre' || id === 'etable' ? 'e' : ''}</span><span class="chip">🔒 niveau ${n}</span></span>
      <span class="muted">Le bâtiment du grand-père attend des jours meilleurs. Il se répare à partir du <strong>niveau ${n}</strong> (tu es au niveau ${state.progression ? state.progression.niveau : 1}).</span>
      ${def.note ? `<span class="muted">Une fois réparé : ${def.note}.</span>` : ''}
    </div>`;
}

export function coopShown() {
  return isUnlocked(state, 'poulailler') || state.poulailler.construit;
}

export function herdShown() {
  return isUnlocked(state, 'paturage') || state.paturage.construit || sheepCount(state) + cowCount(state) > 0;
}

// L'Étable loge les moutons et les vaches ; le Poulailler, bâtiment à part sur la carte,
// loge les poules (l'ancre garde son ancien nom, `etable-poules`, que la page sans carte
// utilise aussi).
function renderEtableWindow() {
  return herdShown() ? `<div id="etable-troupeau" class="ancre">${renderPaturage()}${renderAchatTroupeau()}</div>` : '';
}

function renderPoulaillerWindow() {
  return coopShown() ? `<div id="etable-poules" class="ancre">${renderPoulailler()}${renderAchatPoules()}</div>` : '';
}

// Fenêtres de la carte. Deux tailles seulement : pleine hauteur (`haute`) ou demi-hauteur.
// Toutes sont dans le cadre bois des cartes (`bois: false` pour s'en passer).
//   nom      : le lieu, tel qu'il est écrit sur son étiquette ;
//   detail   : complément du titre (niveau, emplacements) ;
//   sansTitre: le premier titre du contenu répète le titre de la fenêtre, il est masqué (CSS) ;
//   onglets  : rangée d'onglets fixe, sous le titre ;
//   ok       : la fenêtre (et son bâtiment sur la carte) existe-t-elle à ce stade de la partie ?
export const STAGE_WINDOWS = {
  maison: {
    nom: 'Maison', icone: '🏠', ok: () => true, haute: true, sansTitre: true,
    onglets: () => subtabsHtml(MAISON_TABS.filter((t) => t.ok()), maisonCurrentTab().id, 'maison-tab'),
    corps: () => maisonCurrentTab().corps(),
  },
  // Inventaire (menu latéral) : fenêtre flottante dans le cadre bois ; en-tête : les onglets
  // en icônes seules, à la place du titre.
  inventaire: {
    nom: 'Inventaire', icone: '📦', ok: () => tabAvailable('inventaire'), bois: true, flottante: true,
    enTete: () => inventoryTabsHtml(),
    corps: () => renderInventaire(true),
  },
  // L'Atelier (menu latéral, sur la ferme générée seulement : js/ui/atelier.js) : fenêtre
  // flottante dans le cadre bois, comme l'Inventaire.
  atelier: {
    nom: 'Atelier', icone: '🔨', ok: () => atelierOuvert(state), bois: true, flottante: true,
    corps: () => renderAtelier(),
  },
  // Marché (menu latéral) : fenêtre flottante comme l'Inventaire ; en-tête : les rayons en
  // icônes seules et le « ? » du rayon ouvert.
  comptoir: {
    nom: 'Marché', icone: '🧺', ok: () => tabAvailable('comptoir'), bois: true, flottante: true,
    enTete: () => marketTabsHtml(),
    corps: () => renderComptoir(true),
  },
  // Notifications (menu latéral) : fenêtre flottante dans le cadre bois, comme l'Inventaire.
  notifications: {
    nom: 'Notifications', icone: '✉️', ok: () => true, flottante: true,
    corps: () => renderNotifications(true),
  },
  // Énergie (un appui sur les panneaux solaires du toit) et Eau (sur la pompe du puits ou la
  // citerne) : leurs appareils, dès qu'ils sont achetés (les achats se font dans la Maison).
  energie: {
    nom: 'Énergie', icone: '⚡', ok: () => isOwned(starterOf(state, 'panneau')), bois: true,
    corps: () => renderEnergieFenetre(),
  },
  // Panneaux solaires et batteries : un appui sur leur carte de la fenêtre Énergie (ou une
  // alerte d'entretien, de panne) ; usure, entretien, réparation et amélioration.
  panneaux: {
    nom: 'Production d\'énergie', icone: '☀️', ok: () => isOwned(starterOf(state, 'panneau')), bois: true,
    corps: () => renderDeviceFenetre('panneaux'),
  },
  batteries: {
    nom: 'Stockage d\'énergie', icone: '🔋', ok: () => isOwned(starterOf(state, 'batterie')), bois: true,
    corps: () => renderDeviceFenetre('batteries'),
  },
  eau: {
    nom: 'Eau', icone: '💧', ok: () => isOwned(starterOf(state, 'pompe')) || isOwned(starterOf(state, 'reservoir')), bois: true,
    corps: () => renderEauFenetre(),
  },
  // Le robot de la ferme : un appui sur lui ou sur sa station de charge, à côté de la maison.
  robot: {
    nom: 'Robot', icone: '🤖', ok: () => robotOn(state), bois: true,
    corps: () => `<div class="cards">${renderRobotCard()}</div>`,
  },
  // Meubles de la maison (intérieur) : chacun ouvre sa fenêtre, dans le cadre bois.
  four: {
    nom: 'Four', icone: '🔥', ok: () => isUnlocked(state, 'four') || state.stations.four.construit, bois: true,
    corps: () => renderStationFenetre('four'),
  },
  cuisine: {
    nom: 'Cuisine', icone: '🍳', ok: () => isUnlocked(state, 'cuisine') || state.stations.cuisine.construit, bois: true,
    corps: () => renderStationFenetre('cuisine'),
  },
  frigo: {
    nom: 'Réfrigérateur', icone: '🧊', ok: () => isUnlocked(state, 'frigo') || state.frigo.construit, bois: true,
    corps: () => `<div class="cards">${renderFridgeCard()}</div>${state.frigo.construit ? fridgeSlots() : ''}`,
  },
  // Installations (menu latéral ; la maison aussi tant qu'elle est à réparer et la ferme à
  // équiper) : la maison, les appareils à acheter, les ateliers, le frigo, le Silo.
  installations: {
    nom: 'Installations', icone: '🏗️', ok: () => true, haute: true, bois: true,
    corps: () => renderBatiments(),
  },
  // Commerce (menu latéral, au niveau qui le débloque) : l'étal de bocaux, la crèmerie ou le
  // tissage, son niveau et ses quotas ; aussi un onglet de la Maison.
  commerce: {
    nom: 'Commerce', icone: '🏪', ok: () => isUnlocked(state, 'commerce'), haute: true, bois: true,
    corps: () => renderCommerce(),
  },
  // Calendrier lunaire (carte en haut à droite) : le mois, ses phases de lune et leurs effets.
  calendrier: {
    nom: 'Calendrier', icone: '📅', ok: () => true, bois: true,
    corps: () => renderCalendrier(),
  },
  // Arbre des technologies (menu latéral, dès le premier point) : dans le cadre bois.
  techno: {
    nom: 'Arbre des technologies', icone: '🌳', ok: () => tabAvailable('techno'), haute: true, sansTitre: true, bois: true,
    corps: () => renderTechno(),
  },
  // Fenêtre de la Famille (carte du joueur, en haut à gauche) : dans le cadre bois des cartes.
  famille: {
    nom: 'Famille', icone: '👨‍👩‍👧‍👦', ok: () => tabAvailable('famille'), haute: true, sansTitre: true, bois: true,
    detail: () => familyNameHtml(),
    corps: () => renderFamille(),
  },
  etable: {
    nom: 'Étable', icone: '🐄', bois: true,
    ok: () => herdShown(),
    corps: () => renderEtableWindow(),
  },
  poulailler: {
    nom: 'Poulailler', icone: '🐔', bois: true,
    ok: () => coopShown(),
    corps: () => renderPoulaillerWindow(),
  },
  serre: {
    nom: 'Serre', icone: '🪴', ok: () => isUnlocked(state, 'serre'), sansTitre: true,
    detail: () => (state.serre.construit ? `niveau ${state.serre.niveau}` : ''),
    corps: () => renderSerre(),
  },
  // Le Moulin : on y fait la farine (renderMoulin). Les autres ateliers sont dans la Maison.
  moulin: {
    nom: 'Moulin', icone: '⚙️', ok: () => isUnlocked(state, 'moulin'), bois: true,
    corps: () => (typeof renderMoulin === 'function' ? renderMoulin() : renderAteliers()),
  },
  verger: {
    nom: 'Verger', icone: '🍎', ok: () => isUnlocked(state, 'verger'), sansTitre: true,
    detail: () => (state.verger.construit ? `${state.verger.arbres.length} / ${state.verger.places} emplacements` : ''),
    corps: () => renderVerger(),
  },
  zone: {
    nom: DATA.POTAGER.NOM, icone: '🌱', ok: () => true, haute: true, sansTitre: true, // version 1.12 : toujours sur la carte, même en herbe
    detail: () => `${state.potager.parcelles.length} parcelles`,
    corps: () => renderPotager(),
  },
  chapitres: { nom: 'Chapitres', icone: '📜', ok: () => true, corps: () => renderChapterBanner() },
  // Version 1.5 : le poteau « Ville » au bout du chemin (sorties, voyages, marché de la ville).
  ville: { nom: 'Ville', icone: '🏙️', ok: () => true, sansTitre: true, corps: () => renderVille() },
  // Le Silo : sur la carte dès qu'il est débloqué (comme le Poulailler) ; on le construit,
  // l'agrandit et on voit son blé dans sa fenêtre.
  silo: { nom: 'Silo', icone: '🌾', ok: () => isUnlocked(state, 'silo') || state.silo.construit, sansTitre: true, corps: () => renderSilo() },
};

export function renderStageWindow() {
  const root = document.getElementById('window-root');
  // une Maison sans onglet ouvert (Livre de recette, Commerce) : ce sont les Installations
  if (stageWindow === 'maison' && !MAISON_TABS.some((t) => t.ok())) stageWindow = 'installations';
  const w = stageWindow ? STAGE_WINDOWS[stageWindow] : null;
  if (stageWindow && (!w || !(w.ok() || windowLocked(stageWindow)) || !stageActive())) stageWindow = null;
  if (!stageWindow) {
    if (root.childElementCount) morph(root, '');
    stageWindowShown = null;
    // la fenêtre fermée rend le focus au bouton (ou à l'étiquette) qui l'avait ouverte
    if (windowFocusBack) windowFocusBack();
    windowFocusBack = null;
    return;
  }
  if (stageWindowShown === null) windowFocusBack = rememberFocus();
  const detail = w.detail ? w.detail() : '';
  morph(root, `
    <div class="window-layer${w.flottante ? ' flottante' : ''}">
      <div class="window-backdrop" data-action="stage-close"></div>
      <section class="stage-window ${w.flottante ? 'flottante' : w.haute ? 'tall' : 'half'}${w.bois === false ? '' : ' bois'}" role="dialog" aria-modal="true" aria-labelledby="stage-window-title">
        <header class="window-head">
          ${w.enTete ? `<h2 id="stage-window-title" class="visually-hidden">${w.nom}</h2>${w.enTete()}` : `<h2 id="stage-window-title"><span aria-hidden="true">${w.icone}</span> ${w.nom}${detail ? `<span class="window-detail"> · ${detail}</span>` : ''}</h2>`}
          ${stageWindow !== 'chapitres' && !w.enTete ? '<button type="button" class="icon-btn window-chapter" data-action="stage-open" data-window="chapitres" aria-label="Voir le chapitre en cours" title="Voir le chapitre">📜</button>' : ''}
          <button type="button" class="icon-btn" id="stage-window-close" data-action="stage-close" aria-label="Fermer" title="Fermer">✕</button>
        </header>
        ${w.onglets && !windowLocked(stageWindow) ? `<div class="window-tabs">${w.onglets()}</div>` : ''}
        <div class="window-body${w.sansTitre ? ' sans-titre' : ''}">${windowLocked(stageWindow) ? lockedBody(stageWindow) : w.corps()}</div>
      </section>
    </div>`);
  // Autre fenêtre ou autre onglet : le contenu repart du haut ; à l'ouverture, le focus va sur ✕.
  const shown = stageWindow + (stageWindow === 'maison' ? ':' + maisonCurrentTab().id : '');
  if (shown !== stageWindowShown) {
    const opening = stageWindowShown === null;
    stageWindowShown = shown;
    root.querySelector('.window-body').scrollTop = 0;
    if (opening) document.getElementById('stage-window-close').focus({ preventScroll: true });
  }
}

export function openStageWindow(id) {
  if (!STAGE_WINDOWS[id] || !(STAGE_WINDOWS[id].ok() || windowLocked(id))) return;
  if (windowLocked(id)) { // version 1.12 : un bâtiment verrouillé n'ouvre que sa fiche
    stageWindow = id;
    stageReturn = null;
    renderStageWindow();
    refresh();
    return;
  }
  // Un bâtiment qui a un intérieur : depuis la carte, on y entre. Une fois dedans, la même
  // action ouvre sa fenêtre (agrandir, tout arroser, tout récolter).
  if (INTERIORS[id] && stageInterior !== id && enterInterior(id)) return;
  // la Maison (de l'intérieur, « Gérer ») : ses onglets, ou les Installations s'il n'y en a pas
  if (id === 'maison') id = maisonOuInstallations();
  if (id === 'maison') maisonTab = maisonTabChoisi;
  stageWindow = id;
  stageReturn = null;
  renderStageWindow(); // tout de suite, sans attendre la cadence de rendu
  refresh();
}

export function closeStageWindow() {
  stageWindow = null;
  setVergerCase(null); // version 1.13 : le choix d'un arbre se referme avec la fenêtre
  stageReturn = null;
  renderStageWindow();
  refresh();
}

// Règle de rangement : un lieu s'ouvre sur la carte. Va à la fenêtre `fenetre` (et, pour la
// Maison, à son onglet), fait glisser la carte jusqu'au bâtiment et amène `ancre` en haut.
// Sans la carte, ce sont les pages classiques : Famille, Livre de recette, Arbre des
// technologies, ou la liste de la Ferme.
export function allerAuLieu(fenetre, onglet, ancre) {
  fenetre = lieuFamille(fenetre, onglet);
  setEcranFerme(null);
  stageReturn = null;
  if (stageUsable()) {
    setActiveTab('ferme');
    if (fenetre === 'maison' && onglet) maisonTab = onglet;
    stageWindow = STAGE_WINDOWS[fenetre] && STAGE_WINDOWS[fenetre].ok() ? fenetre : null;
    // Un lieu qui a un intérieur : on y entre, ses parcelles sont sous les yeux. Tout autre
    // lieu fait sortir.
    // un onglet de la Maison demandé (Livre de recette…) : sa fenêtre, sans entrer
    stageInterior = INTERIORS[fenetre] && !(fenetre === 'maison' && onglet) && interiorAvailable(fenetre) ? fenetre : null;
    if (stageInterior) stageWindow = null;
    if (STAGE_LIEUX.includes(fenetre)) setStagePan(fenetre);
  } else {
    stageWindow = null;
    stageInterior = null;
    setActiveTab(fenetre === 'ville' ? 'ville' : ['famille', 'inventaire', 'comptoir', 'techno'].includes(fenetre) && tabAvailable(fenetre) ? fenetre : fenetre === 'installations' ? 'ferme' : fenetre === 'maison' && FERME_LINKS.includes(onglet) && tabAvailable(onglet) ? onglet : 'ferme');
  }
  ancreVoulue = ancre || null;
  telView();
  setLastRenderAt(0); // rendu tout de suite : la fenêtre s'ouvre sans attendre la cadence
  refresh();
}

// Amène l'ancre demandée en haut de ce qui défile (fenêtre de la carte ou page).
export function applyAnchor() {
  if (!ancreVoulue) return;
  const el = document.getElementById(ancreVoulue);
  ancreVoulue = null;
  if (el) el.scrollIntoView({ block: 'start' });
}

// Carte du joueur, en haut à gauche (elle remplace le bandeau du haut) : le portrait du
// personnage principal, son prénom dessous, puis sur une même ligne le niveau (avec sa barre
// vers le niveau suivant, FLU-30 ; ouvre les niveaux) et l'autonomie de la dernière nuit
// (ouvre la Famille).
// Le prénom est saisi par le joueur : escapeHtml (memberNameHtml), jamais dans un data-*.
let playerHeight = 0;
let playerHtml = null; // dernier contenu de la carte du joueur
let playerMeasure = true; // à mesurer : contenu changé, fenêtre redimensionnée, police chargée
window.addEventListener('resize', () => { playerMeasure = true; });
if (document.fonts) document.fonts.ready.then(() => { playerMeasure = true; }); // police chargée : autre hauteur
export function renderIndicators() {
  const m = mainCharacter(state);
  const p = levelProgress(state);
  const xp = p.max ? `${formatNumber(p.xp)} XP, niveau maximal` : `${formatNumber(p.xp)} / ${formatNumber(p.fin)} XP`;
  const niveau = `Niveau ${p.niveau} : ${xp}. Voir les niveaux`;
  const auto = formatPercent(lastAutonomy(state));
  const autoTitre = `Autonomie de la dernière nuit : ${auto}. Ouvrir la Famille`;
  const famille = 'data-action="stage-goto" data-window="famille"';
  const el = document.getElementById('player-card');
  const html =
    `<button type="button" class="player-head" ${famille} title="Ouvrir la Famille">` +
      // le portrait du personnage du joueur (version 1.17 : celui choisi dans sa fiche ; le
      // personnage principal est toujours un adulte)
      `<img class="player-portrait" src="${m && memberPerso(m) ? persoSrc(memberPerso(m)) : 'assets/portrait_fermiere.png'}" alt="" width="48" height="48">` +
      `<span class="player-name">${m ? memberNameHtml(m.id) : ''}</span></button>` +
    `<span class="player-stats">` +
    `<button type="button" class="player-line level-ind" data-action="open-levels" title="${niveau}" aria-label="${niveau}"><span aria-hidden="true">⭐</span><span class="num" aria-hidden="true">Niv. ${p.niveau}</span><span class="level-ind-bar" aria-hidden="true"><span style="width:${p.pct}%"></span></span></button>` +
    `<button type="button" class="player-line" ${famille} title="${autoTitre}" aria-label="${autoTitre}"><span aria-hidden="true">🌿</span><span class="num" aria-hidden="true">${auto}</span></button>` +
    `</span>` +
    playerGaugesHtml();
  if (html !== playerHtml) {
    playerHtml = html;
    playerMeasure = true;
    morph(el, html);
  }
  // Le contenu des écrans sans carte commence sous la carte du joueur. Sa hauteur n'est lue
  // (ce qui force la mise en page) que si son contenu ou la taille de la fenêtre a changé.
  if (playerMeasure && el.offsetHeight) {
    playerMeasure = false;
    if (el.offsetHeight !== playerHeight) {
      playerHeight = el.offsetHeight;
      document.documentElement.style.setProperty('--player-h', playerHeight + 'px');
    }
  }
  renderHud();
}

// Extension de la carte du joueur, collée à sa droite sur un fond bois uni : les jauges
// d'énergie, d'endurance (réduction du coût des actions, qui grandit avec le niveau) et de
// bonheur de la famille, verticales, côte à côte. Elles ouvrent la Famille.
function playerGaugesHtml() {
  const P = DATA.PERSONNAGE;
  const e = energyLevel(state);
  const ePct = Math.max(0, Math.min(100, Math.round((e / P.MAX) * 100)));
  // mêmes seuils que la jauge de bonheur (jaugeClasse) : vert, jaune, rouge
  const eCls = jaugeClasse(ePct);
  const endu = enduranceReduction(state);
  const enduMax = P.ENDURANCE * (DATA.NIVEAUX.SEUILS.length - 1);
  const dPct = enduMax > 0 ? Math.max(0, Math.min(100, Math.round((endu * 100) / enduMax))) : 0;
  const bonheur = Math.max(0, Math.min(100, averageHappiness(state)));
  const bCls = jaugeClasse(bonheur);
  const titre = `Énergie : ${e} / ${P.MAX}. Endurance : tes actions coûtent ${endu} % de moins. Bonheur de la famille : ${bonheur} %. Ouvrir la Famille`;
  const jauge = (icone, cls, pct) =>
    `<span class="player-gauge"><span class="player-gauge-icon">${icone}</span>` +
    `<span class="player-gauge-bar"><span class="player-gauge-fill${cls ? ` ${cls}` : ''}" style="height:${pct}%"></span></span></span>`;
  return `<button type="button" class="player-gauges" data-action="stage-goto" data-window="famille" title="${titre}" aria-label="${titre}">` +
    `<span class="player-gauges-in" aria-hidden="true">${jauge('⚡', eCls, ePct)}${jauge('💪', 'endu', dPct)}${jauge('😊', bCls, bonheur)}</span></button>`;
}

// Carte flottante en haut à droite (comme dans Stardew Valley), dans le même cadre que la
// carte du joueur : la phase de la lune, le jour de la semaine et du mois (« 🌒 Lun. 8 »), le
// mois du calendrier lunaire dessous (un appui ouvre le Calendrier), puis l'heure, puis les pièces (qui ouvrent les comptes).
// L'heure avance par tranches de 10 minutes.
function renderHud() {
  const h = heureDuJour();
  const heure = Math.floor(h);
  const minutes = Math.floor((h - heure) * 6) * 10;
  const horaire = `${heure} h ${String(minutes).padStart(2, '0')}`;
  const lune = moonPhase(state.day);
  morph(document.getElementById('hud'),
    `<button type="button" class="hud-date" data-action="stage-goto" data-window="calendrier" title="Calendrier" aria-label="${formatDay(state.day)}, ${lune.nom.toLowerCase()}. Ouvrir le calendrier">` +
      `<span class="hud-day" aria-hidden="true">${lune.icone} ${weekdayShort(state.day)} <span class="num">${dayOfMonth(state.day)}</span></span>` +
      `<span class="hud-month" aria-hidden="true">${monthName(state.day)}</span></button>` +
    `<span class="hud-line"><span aria-hidden="true">${horlogeEmoji(heure)}</span> <span class="num">${horaire}</span></span>` +
    `<button type="button" class="hud-line hud-money" data-action="open-compta" title="Voir les comptes"><span aria-hidden="true">💰</span> <span class="num">${formatCoins(state.pieces)}</span><span class="visually-hidden"> pièces. Voir les comptes</span></button>`
  );
}

// Menu latéral rabattable, à gauche de l'écran (il remplace le menu du bas) : les icônes
// les unes au-dessus des autres, dans le cadre bois des cartes. Fermé, il ne dépasse que sa
// languette (un triangle en pixel art pointé vers la droite, et le nombre d'alertes). Il se
// referme dès qu'on choisit une entrée, ou avec Échap.
export let menuOpen = false;
export function setMenuOpen(open) {
  menuOpen = !!open;
  renderTabbar();
}
let menuClickBound = false;

// Triangle en pixel art (5 × 9 pixels), pointé vers la droite.
const MENU_ARROW = '<svg class="side-tab-arrow" viewBox="0 0 5 9" width="10" height="18" aria-hidden="true" shape-rendering="crispEdges">' +
  '<rect x="0" y="0" width="1" height="9"/><rect x="1" y="1" width="1" height="7"/><rect x="2" y="2" width="1" height="5"/><rect x="3" y="3" width="1" height="3"/><rect x="4" y="4" width="1" height="1"/></svg>';

export function renderTabbar() {
  const current = ['commerce', 'inventaire', 'atelier', 'comptoir', 'techno'].includes(stageWindow) ? stageWindow : FERME_LINKS.includes(activeTab) ? 'ferme' : activeTab;
  const alerts = notificationCount(state);
  const nav = document.getElementById('bottom-nav');
  if (!menuClickBound) {
    menuClickBound = true;
    // choisir une entrée referme le menu (l'action, elle, passe par le registre comme d'habitude)
    nav.addEventListener('click', (e) => { if (menuOpen && e.target.closest('.nav-btn')) setMenuOpen(false); });
  }
  document.getElementById('side-menu').classList.toggle('open', menuOpen);
  nav.inert = !menuOpen;
  const tab = document.getElementById('side-tab');
  tab.setAttribute('aria-expanded', String(menuOpen));
  tab.setAttribute('aria-label', menuOpen ? 'Fermer le menu' : `Ouvrir le menu${alerts > 0 ? ` (${plural(alerts, 'alerte')})` : ''}`);
  morph(tab, MENU_ARROW + (alerts > 0 && !menuOpen ? `<span class="side-tab-badge" aria-hidden="true">${alerts > 9 ? '9+' : alerts}</span>` : ''));
  morph(
    nav,
    NAV_TABS.map((id) => TABS.find((t) => t.id === id))
      // « Ferme » ramène sur la carte de la ferme : son bouton est une carte (sans Phaser, la
      // Ferme reste une liste et garde sa maison)
      .map((t) => (t.id === 'ferme' && stageUsable() ? { ...t, label: 'Carte de la ferme', icon: '🗺️' } : t))
      // FLU-08 : le Marché est là dès le départ (verrouillé) : les onglets ne bougent jamais
      .filter((t) => tabAvailable(t.id) || t.id === 'comptoir')
      .map((t) => {
        if (!tabAvailable(t.id)) {
          return `<button type="button" class="nav-btn locked" data-action="market-locked" title="${t.label}" aria-label="${t.label} : s'ouvre avec le panneau et la pompe"><span class="nav-icon" aria-hidden="true">${t.icon}<span class="nav-lock">🔒</span></span><span class="nav-label">${t.label}</span></button>`;
        }
        const badge = t.id === 'notifications' && alerts > 0 ? `<span class="nav-badge" aria-hidden="true">${alerts}</span>` : '';
        const label = t.id === 'notifications' && alerts > 0 ? `${t.label} (${plural(alerts, 'alerte')})` : t.label;
        return `<button type="button" class="nav-btn${t.id === current ? ' active' : ''}" data-action="switch-tab" data-tab="${t.id}" title="${t.label}" aria-label="${label}"${t.id === current ? ' aria-current="page"' : ''}><span class="nav-icon" aria-hidden="true">${t.icon}${badge}</span><span class="nav-label">${t.label}</span></button>`;
      })
      .join('') +
      // Version 1.4 : les Options ne sont plus dans le bandeau mais ici, au bout du menu.
      '<button type="button" class="nav-btn" id="options-btn" data-action="open-options" title="Options" aria-label="Options"><span class="nav-icon" aria-hidden="true">⚙️</span><span class="nav-label">Options</span></button>'
  );
}

// Chaque onglet donne une liste de tranches (la Ferme en a une par section).
// render() ramène déjà un onglet non débloqué sur la Ferme.
const TAB_RENDERERS = {
  // Avec la carte, tout passe par elle et ses fenêtres ; sans Phaser, la liste classique.
  ferme: () => (ecranFerme === 'panneaux' || ecranFerme === 'batteries' ? [renderDeviceScreen(ecranFerme)] : stageActive() ? [''] : renderFerme()),
  famille: () => [backToFerme() + renderFamille()],
  inventaire: () => [renderInventaire()],
  comptoir: () => [renderComptoir()],
  recettes: () => [backToFerme() + renderRecettes()],
  commerce: () => [backToFerme() + renderCommerce()],
  techno: () => [backToFerme() + renderTechno()],
  ville: () => [backToFerme() + renderVille()],
  notifications: () => [renderNotifications()],
};

export function renderTabContent() {
  morphSlots(document.getElementById('tab-content'), (TAB_RENDERERS[activeTab] || TAB_RENDERERS.ferme)());
}

// Bouton « Dormir » (lune en pixel art), en bas à droite sur tous les onglets. L'aperçu du repas est dans
// son libellé (title / aria-label) ; une pastille ne s'affiche que si le repas prévu est insuffisant.
export function renderSleepBar() {
  // Version 1.19 : le bouton « Zzz » n'est là que la nuit (de 22 h à 6 h), tant que le personnage ne
  // dort pas ; il l'envoie dans son lit (actionGoToBed), puis la nuit défile en accéléré.
  const nuit = nightActive(state) && !asleep(state); // il dort : plus rien à faire
  // Après 19 h, le repas est pris : on montre ce qui a été mangé, plus ce qui est prévu.
  const plan = state.repas || planMeal(state);
  const short = plan.energie + EPS < plan.besoin;
  const eaten = `${formatNumber(Math.min(plan.energie, plan.besoin))} / ${formatNumber(plan.besoin)}`;
  const meal = `${state.repas ? `Repas pris à ${DATA.TEMPS.HEURE_REPAS} h` : `Repas prévu à ${DATA.TEMPS.HEURE_REPAS} h`} : ${eaten} énergie${short ? ' (insuffisant)' : ''} · autonomie ${formatPercent(plannedAutonomy(state))}`;
  const label = state.nuitEnCours && state.nuitEnCours.minuit
    ? `Dormir : réveil à ${DATA.TEMPS.HEURE_REVEIL} h`
    : `Dormir : réveil à ${DATA.TEMPS.HEURE_REVEIL} h. ${meal}`;
  // La barre d'outils (houe, pioche, hache, canne à pêche), en bas de la carte de la ferme,
  // sans fenêtre ouverte, dès qu'un outil est acheté (elle remplace le bouton rond de FLU-05).
  const outils = activeTab === 'ferme' && stageActive() && !stageWindow && !stageInterior ? toolBarHtml() : '';
  const barre = document.getElementById('tool-bar');
  morph(barre, outils);
  barre.hidden = !outils;
  barre.classList.toggle('open', toolbarOpen);
  document.body.classList.toggle('has-toolbar', !!outils);
  morph(
    document.getElementById('sleep-fab'),
    (short ? `<span class="chip warn meal-chip" title="${meal}"><span aria-hidden="true">🍽️ ${eaten} ⚠️</span><span class="visually-hidden">${meal}</span></span>` : '') +
      (nuit ? `<button type="button" class="sleep-btn${tutoTarget('dormir')}" data-action="sleep" title="${label}" aria-label="${label}">${artHtml('sleep-on', 'sleep-art')}</button>` : '')
  );
}

// La liste des appareils du mode test n'est reconstruite que si le parc change.
export function syncTestDeviceSelect() {
  const sel = document.getElementById('test-device');
  const devices = allDevices(state);
  const signature = devices.map((d) => d.id).join('|');
  if (sel.dataset.signature === signature) return;
  const previous = sel.value;
  sel.innerHTML = devices.map((d) => `<option value="${d.id}">${deviceName(d)}</option>`).join('');
  sel.dataset.signature = signature;
  if (devices.some((d) => d.id === previous)) sel.value = previous;
}

// « Dormir » : pour dormir, le personnage doit être dans son lit. Sur la carte de la ferme, il
// marche jusqu'à la porte de la maison (la vue glisse jusqu'à elle), puis l'intérieur s'ouvre ;
// il va à son lit, s'y couche, et quand il dort la nuit défile en accéléré (asleepFromStage).
// Un deuxième appui, pendant qu'il y va, l'endort tout de suite. Sans la carte, sans
// l'intérieur de la maison (encore en ruine) ou sans personnage, il s'endort tout de suite.
// On ne dort que la nuit.
export function actionGoToBed() {
  if (!nightActive(state)) { actionSleep(); return; }   // hors de la nuit : « on ne dort que la nuit »
  if (asleep(state)) return;
  if (coucher) { actionSleep(); return; }
  const scene = window.FarmStage;
  if (!interiorAvailable('maison') || !(scene && scene.hasFermier && scene.hasFermier() && scene.goHome)) { actionSleep(); return; }
  setCoucher(true);
  setVergerCase(null);
  setActiveTab('ferme');
  setEcranFerme(null);
  stageWindow = null;
  stageReturn = null;
  if (stageInterior) {
    // déjà dans la maison : il va au lit ; dans la Serre : il traverse jusqu'à la maison
    if (stageInterior !== 'maison') enterInterior('maison');
    setLastRenderAt(0);
    refresh();
    return;
  }
  setLastRenderAt(0);
  refresh();
  scene.goHome(() => { if (coucher && nightActive(state)) enterInterior('maison'); });
}

// Le repas de 19 h sur la carte : sur la Ferme, sans fenêtre ouverte, la maison réparée. Le
// personnage rentre (la vue le suit jusqu'à la porte), l'intérieur de la maison s'ouvre ; il va
// à table, la famille le rejoint, tous s'assoient et mangent. `heureux` : une bulle 😊
// au-dessus de chacun. Renvoie false si la scène ne se joue pas (l'annonce suffit).
export function startMealScene(repas) {
  const scene = window.FarmStage;
  if (activeTab !== 'ferme' || !stageActive() || stageWindow || nightActive(state)) return false;
  if (!interiorAvailable('maison') || !(scene && scene.mealScene && scene.hasFermier && scene.hasFermier())) return false;
  const B = DATA.VILLE.BONHEUR;
  const heureux = repas.couverture >= 100 && (Number(repas.bonheur) || 0) - B.DECLIN >= B.BULLE;
  const principal = mainCharacter(state);
  const convives = state.famille.membres.filter((m) => m !== principal).map((m) => ({ perso: memberPerso(m), enfant: !!m.enfant }));
  if (!scene.mealScene({ convives, heureux })) return false;
  if (stageInterior === 'maison') return true;
  if (stageInterior) { enterInterior('maison'); return true; }
  scene.goHome(() => {
    // le joueur a ouvert une fenêtre ou changé d'onglet entre-temps : il n'entre pas
    if (activeTab === 'ferme' && stageActive() && !stageWindow && !stageInterior && !nightActive(state)) enterInterior('maison');
  });
  return true;
}

// La carte : il est couché dans son lit, il s'endort ; la nuit défile en accéléré.
export function asleepFromStage() {
  if (!coucher) return;
  if (!nightActive(state)) { setCoucher(false); refresh(); return; }
  actionSleep();
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'stage-close': () => {
    closeStageWindow();
  },
  'stage-exit': () => {
    leaveInterior();
  },
  'maison-tab': (target) => {
    maisonTab = target.dataset.tab;
    maisonTabChoisi = maisonTab;
    renderStageWindow();
    refresh();
  },
  'menu-toggle': () => {
    setMenuOpen(!menuOpen);
  },
  'market-locked': () => {
    notify(`🔒 ${MARKET_CLOSED}`);
  },
  'stage-goto': (target) => {
    allerAuLieu(target.dataset.window, target.dataset.tab, target.dataset.anchor);
  },
  'switch-tab': (target) => {
    // L'Inventaire et le Marché, avec la carte, sont des fenêtres flottantes par-dessus elle.
    if (['installations', 'commerce', 'inventaire', 'atelier', 'comptoir', 'techno', 'notifications'].includes(target.dataset.tab) && stageUsable()) {
      if (target.dataset.tab === 'comptoir') setComptoirTab(comptoirTabAOuvrir()); // FLU-13
      allerAuLieu(target.dataset.tab);
      return;
    }
    if (FERME_LINKS.includes(target.dataset.tab) && stageUsable()) {
      if (target.dataset.tab === 'ville') allerAuLieu('ville');
      else allerAuLieu('maison', target.dataset.tab);
      return;
    }
    setActiveTab(target.dataset.tab);
    if (target.dataset.tab === 'comptoir') setComptoirTab(comptoirTabAOuvrir()); // FLU-13
    stageWindow = null;
    stageReturn = null;
    stageInterior = null; // changer d'onglet (ou revenir sur « Ferme ») ramène à la carte
    setCoucher(false);
    setEcranFerme(null);
    telView();
    refresh();
  },
  'sleep': () => {
    actionGoToBed();
  },
});
