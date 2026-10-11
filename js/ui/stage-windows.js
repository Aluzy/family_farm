import { DATA } from '../engine/catalog.js';
import { energyLevel } from '../engine/stamina.js';
import { EPS } from '../engine/base.js';
import { allDevices, farmOpen, isOwned, starterOf } from '../engine/devices.js';
import { houseRepaired, mainCharacter } from '../engine/depart.js';
import { awakeRequired } from '../engine/clock.js';
import { memberPortrait, planMeal } from '../engine/family.js';
import { cowCount, sheepCount } from '../engine/animals.js';
import { zone2Open, zone2Plots } from '../engine/crops.js';
import { isUnlocked, lastAutonomy, plannedAutonomy } from '../engine/campaign.js';
import { levelProgress, unlockLevel } from '../engine/levels.js';
import { canSleep } from '../engine/night.js';
import { notificationCount } from '../engine/alerts.js';
import { formatCoins, formatNumber, formatPercent } from '../engine/format.js';
import {
  activeTab, ecranFerme, FERME_LINKS, hoeMode, NAV_TABS, setActiveTab, setComptoirTab, setEcranFerme, setVergerCase, state, tabAvailable, TABS,
} from './store.js';
import { telView } from './consent.js';
import { showToast } from './toasts.js';
import { MARKET_CLOSED } from '../engine/market.js';
import { actionSleep } from './game-actions.js';
import { artHtml, pxText } from './pixel-art.js';
import { renderVille } from './ville.js';
import { morph, morphSlots, refresh, setLastRenderAt } from './render.js';
import {
  cibleAttrs, heureDuJour, horlogeEmoji, setStagePan, STAGE_LIEUX, stageActive, stageUsable,
} from './stage.js';
import {
  backToFerme, deviceName, renderDeviceScreen, renderEnergieEau, renderFerme, renderPotager, renderZone2,
} from './ferme.js';
import { renderPaturage, renderPoulailler, renderSilo } from './elevage.js';
import { renderSerre, renderVerger } from './serre-verger-frigo.js';
import { renderAteliers, renderMoulin, renderRecettes } from './cuisine.js';
import { renderTechno } from './techno.js';
import { memberNameHtml, renderFamille } from './famille.js';
import { renderCommerce } from './commerce.js';
import { renderNotifications } from './notifications.js';
import { renderInventaire, subtabsHtml } from './inventaire.js';
import { comptoirTabAOuvrir, renderComptoir } from './marche.js';
import { renderChapterBanner } from './chapitres.js';
import { tutoTarget } from './aide.js';
import { registerActions } from './actions.js';

/* ---------- Fenêtres de la carte ---------- */

// Un appui sur un bâtiment ou sur son étiquette ouvre une fenêtre dont le contenu est celui
// des sections de la Ferme, redessiné à chaque rendu : les boutons y fonctionnent comme
// dans la liste classique. Les fenêtres de #modal-root s'affichent par-dessus.
export let stageWindow = null; // null, 'maison', 'etable', 'poulailler', 'serre', 'moulin', 'verger', 'zone', 'zone2' ou 'chapitres'
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
const INTERIORS = { serre: { ok: () => state.serre.construit } };

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
  stageWindow = null;
  stageReturn = null;
  setLastRenderAt(0);
  refresh();
}

let stageWindowShown = null; // dernière fenêtre dessinée (avec son onglet) : pour remonter en haut au changement
let maisonTab = 'famille'; // onglet de la fenêtre Maison
let maisonTabChoisi = 'famille'; // FLU-03 : le dernier onglet que le joueur a choisi
export function setMaisonTab(value) {
  maisonTab = value;
  return value;
}

// FLU-03 : la Maison s'ouvre là où il y a à faire : Installations tant que la maison est à
// réparer ou que le panneau, la pompe ou le réservoir manquent ; sinon le dernier onglet choisi.
function maisonTabAOuvrir() {
  const manque = !houseRepaired(state) || ['panneau', 'pompe', 'reservoir'].some((id) => !isOwned(starterOf(state, id)));
  return manque ? 'batiments' : maisonTabChoisi;
}
let ancreVoulue = null; // id de l'élément à amener en haut au prochain rendu (calendrier, eau…)
export function setAncreVoulue(value) {
  ancreVoulue = value;
  return value;
}

export const MAISON_TABS = [
  // FLU-04 : `court` s'affiche sur l'onglet, `label` reste le nom complet (infobulle, lecteurs d'écran)
  { id: 'famille', label: 'Famille', icon: '👨‍👩‍👧‍👦', ok: () => tabAvailable('famille'), corps: () => renderFamille() },
  { id: 'recettes', label: 'Livre de recette', court: 'Recettes', icon: '📖', ok: () => tabAvailable('recettes'), corps: () => renderRecettes() },
  { id: 'techno', label: 'Arbre des technologies', court: 'Techno', icon: '🌳', ok: () => tabAvailable('techno'), corps: () => renderTechno() },
  { id: 'batiments', label: 'Installations', court: 'Énergie', icon: '🏗️', ok: () => true, corps: () => renderBatiments() },
  // version 1.14 : le commerce du niveau 10
  { id: 'commerce', label: 'Commerce', icon: '🏪', ok: () => isUnlocked(state, 'commerce'), corps: () => renderCommerce() },
];

function maisonCurrentTab() {
  const tabs = MAISON_TABS.filter((t) => t.ok());
  return tabs.find((t) => t.id === maisonTab) || tabs[0];
}

// Onglet « Installations » de la Maison (identifiant interne : batiments) : ce qui n'a pas
// de dessin sur la carte : ateliers (Four, Cuisine, Presse), énergie et eau,
// Silo. L'ancre de l'eau sert à l'indicateur 💧 du bandeau.
function renderBatiments() {
  return `${renderAteliers()}<div id="bat-eau" class="ancre">${renderEnergieEau()}</div>${isUnlocked(state, 'silo') ? renderSilo() : ''}`;
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
  etable: {
    nom: 'Étable', icone: '🐄',
    ok: () => herdShown(),
    corps: () => renderEtableWindow(),
  },
  poulailler: {
    nom: 'Poulailler', icone: '🐔',
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
    nom: 'Moulin', icone: '⚙️', ok: () => isUnlocked(state, 'moulin'),
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
  // Le Champ : la deuxième zone de culture, ouverte avec le Moulin.
  zone2: {
    nom: DATA.POTAGER.ZONE2.NOM, icone: DATA.POTAGER.ZONE2.ICONE, ok: () => zone2Open(state), haute: true, sansTitre: true,
    detail: () => `${zone2Plots(state).length} parcelles`,
    corps: () => renderZone2(),
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
  const w = stageWindow ? STAGE_WINDOWS[stageWindow] : null;
  if (stageWindow && (!w || !(w.ok() || windowLocked(stageWindow)) || !stageActive())) stageWindow = null;
  if (!stageWindow) {
    if (root.childElementCount) morph(root, '');
    stageWindowShown = null;
    return;
  }
  const detail = w.detail ? w.detail() : '';
  morph(root, `
    <div class="window-layer">
      <div class="window-backdrop" data-action="stage-close"></div>
      <section class="stage-window ${w.haute ? 'tall' : 'half'}" role="dialog" aria-modal="true" aria-labelledby="stage-window-title">
        <header class="window-head">
          <h2 id="stage-window-title"><span aria-hidden="true">${w.icone}</span> ${w.nom}${detail ? `<span class="window-detail"> · ${detail}</span>` : ''}</h2>
          ${stageWindow !== 'chapitres' ? '<button type="button" class="icon-btn window-chapter" data-action="stage-open" data-window="chapitres" aria-label="Voir le chapitre en cours" title="Voir le chapitre">📜</button>' : ''}
          <button type="button" class="icon-btn" id="stage-window-close" data-action="stage-close" aria-label="Fermer la fenêtre" title="Fermer">✕</button>
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
  if (id === 'maison') maisonTab = maisonTabAOuvrir();
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
  setEcranFerme(null);
  stageReturn = null;
  if (stageUsable()) {
    setActiveTab('ferme');
    if (fenetre === 'maison' && onglet) maisonTab = onglet;
    stageWindow = STAGE_WINDOWS[fenetre] && STAGE_WINDOWS[fenetre].ok() ? fenetre : null;
    // Un lieu qui a un intérieur : on y entre, ses parcelles sont sous les yeux. Tout autre
    // lieu fait sortir.
    stageInterior = INTERIORS[fenetre] && interiorAvailable(fenetre) ? fenetre : null;
    if (stageInterior) stageWindow = null;
    if (STAGE_LIEUX.includes(fenetre)) setStagePan(fenetre);
  } else {
    stageWindow = null;
    stageInterior = null;
    setActiveTab(fenetre === 'ville' ? 'ville' : fenetre === 'maison' && FERME_LINKS.includes(onglet) && tabAvailable(onglet) ? onglet : 'ferme');
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
// personnage principal, son prénom dessous, puis le niveau (avec sa barre vers le niveau
// suivant, FLU-30 ; ouvre les niveaux) et l'autonomie de la dernière nuit (ouvre la Famille).
// Le prénom est saisi par le joueur : escapeHtml (memberNameHtml), jamais dans un data-*.
let playerHeight = 0;
export function renderIndicators() {
  const m = mainCharacter(state);
  const p = levelProgress(state);
  const xp = p.max ? `${formatNumber(p.xp)} XP, niveau maximal` : `${formatNumber(p.xp)} / ${formatNumber(p.fin)} XP`;
  const niveau = `Niveau ${p.niveau} : ${xp}. Voir les niveaux`;
  const auto = formatPercent(lastAutonomy(state));
  const autoTitre = `Autonomie de la dernière nuit : ${auto}. Ouvrir la Famille`;
  const famille = 'data-action="stage-goto" data-window="maison" data-tab="famille"';
  const el = document.getElementById('player-card');
  morph(el,
    `<button type="button" class="player-head" ${famille} title="Ouvrir la Famille">` +
      `<span class="player-portrait" aria-hidden="true">${m ? memberPortrait(state, m.id) || '🙂' : '🙂'}</span>` +
      `<span class="player-name">${m ? memberNameHtml(m.id) : ''}</span></button>` +
    `<button type="button" class="player-line level-ind" data-action="open-levels" title="${niveau}" aria-label="${niveau}"><span aria-hidden="true">⭐</span><span class="num" aria-hidden="true">Niv. ${p.niveau}</span><span class="level-ind-bar" aria-hidden="true"><span style="width:${p.pct}%"></span></span></button>` +
    `<button type="button" class="player-line" ${famille} title="${autoTitre}" aria-label="${autoTitre}"><span aria-hidden="true">🌿</span><span class="num" aria-hidden="true">${auto}</span></button>`
  );
  // La puce des chapitres (sur la carte) et le contenu des autres écrans commencent sous la carte du joueur.
  if (el.offsetHeight && el.offsetHeight !== playerHeight) {
    playerHeight = el.offsetHeight;
    document.documentElement.style.setProperty('--player-h', playerHeight + 'px');
  }
  renderHud();
}

// Carte flottante en haut à droite (comme dans Stardew Valley) : le jour et l'heure côte à
// côte, les pièces dessous ; et, en bas à droite, la jauge verticale de l'énergie, qui ouvre
// la Famille. L'heure avance par tranches de 10 minutes.
function renderHud() {
  const h = heureDuJour();
  const heure = Math.floor(h);
  const minutes = Math.floor((h - heure) * 6) * 10;
  const horaire = `${heure} h ${String(minutes).padStart(2, '0')}`;
  morph(document.getElementById('hud'),
    `<span class="hud-row"><span class="hud-cell">Jour <span class="num">${state.day}</span></span><span class="hud-cell"><span aria-hidden="true">${horlogeEmoji(heure)}</span> <span class="num">${horaire}</span></span></span>` +
    `<span class="hud-row hud-money"><span class="hud-cell"><span aria-hidden="true">💰</span> <span class="num">${formatCoins(state.pieces)}</span><span class="visually-hidden"> pièces</span></span></span>`
  );
  const e = energyLevel(state);
  const max = DATA.PERSONNAGE.MAX;
  const pct = Math.max(0, Math.min(100, Math.round((e / max) * 100)));
  // mêmes seuils que la jauge de bonheur : vert à 65 % et plus, jaune de 20 à 64 %, rouge en dessous
  const cls = pct >= 65 ? '' : pct >= 20 ? ' mid' : ' low';
  const titre = `Ton énergie : ${e} / ${max}. Ouvrir la Famille`;
  morph(document.getElementById('hud-energy'),
    `<button type="button" class="hud-energy-btn" data-action="stage-goto" data-window="maison" data-tab="famille" title="${titre}" aria-label="${titre}">` +
    `<span class="hud-energy-label" aria-hidden="true">⚡</span>` +
    `<span class="hud-energy-bar" aria-hidden="true"><span class="hud-energy-fill${cls}" style="height:${pct}%"></span></span></button>`
  );
}

export function renderTabbar() {
  const current = FERME_LINKS.includes(activeTab) ? 'ferme' : activeTab;
  const alerts = notificationCount(state);
  morph(
    document.getElementById('bottom-nav'),
    NAV_TABS.map((id) => TABS.find((t) => t.id === id))
      // FLU-08 : le Marché est là dès le départ (verrouillé) : les onglets ne bougent jamais
      .filter((t) => tabAvailable(t.id) || t.id === 'comptoir')
      .map((t) => {
        if (!tabAvailable(t.id)) {
          return `<button type="button" class="nav-btn locked" data-action="market-locked" aria-label="${t.label} : s'ouvre avec le panneau et la pompe"><span class="nav-icon" aria-hidden="true">${t.icon}<span class="nav-lock">🔒</span></span><span class="nav-label">${t.label}</span></button>`;
        }
        const badge = t.id === 'notifications' && alerts > 0 ? `<span class="nav-badge" aria-hidden="true">${alerts}</span>` : '';
        const label = t.id === 'notifications' && alerts > 0 ? `${t.label} (${alerts} alerte${alerts > 1 ? 's' : ''})` : t.label;
        return `<button type="button" class="nav-btn${t.id === current ? ' active' : ''}" data-action="switch-tab" data-tab="${t.id}" aria-label="${label}"${t.id === current ? ' aria-current="page"' : ''}><span class="nav-icon" aria-hidden="true">${t.icon}${badge}</span><span class="nav-label">${t.label}</span></button>`;
      })
      .join('') +
      // Version 1.4 : les Options ne sont plus dans le bandeau mais ici, au bout du menu.
      '<button type="button" class="nav-btn" id="options-btn" data-action="open-options" aria-label="Options"><span class="nav-icon" aria-hidden="true">⚙️</span><span class="nav-label">Options</span></button>'
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
  const remaining = Math.max(1, Math.ceil((awakeRequired(state) * 1000 - state.awakeMs) / 1000));
  // Après 19 h, le repas est pris : on montre ce qui a été mangé, plus ce qui est prévu.
  const plan = state.repas || planMeal(state);
  const short = plan.energie + EPS < plan.besoin;
  const eaten = `${formatNumber(Math.min(plan.energie, plan.besoin))} / ${formatNumber(plan.besoin)}`;
  const meal = `${state.repas ? `Repas pris à ${DATA.TIME.MEAL_HOUR} h` : `Repas prévu à ${DATA.TIME.MEAL_HOUR} h`} : ${eaten} énergie${short ? ' (insuffisant)' : ''} · autonomie ${formatPercent(plannedAutonomy(state))}`;
  const ok = canSleep(state);
  const label = `${ok ? 'Dormir' : `Dormir (dans ${remaining} s)`}. ${meal}`;
  // FLU-05 : houe achetée et rangée, un bouton rond la met en main depuis la carte
  const houe = state.potager.houe && !hoeMode && activeTab === 'ferme' && stageActive() && !stageWindow && !stageInterior
    ? `<button type="button" class="hoe-fab" data-action="hoe-toggle" aria-label="Prendre la houe" title="Prendre la houe">${artHtml('hoe-btn', 'hoe-art')}</button>`
    : '';
  morph(
    document.getElementById('sleep-fab'),
    houe + (short ? `<span class="chip warn meal-chip" title="${meal}"><span aria-hidden="true">🍽️ ${eaten} ⚠️</span><span class="visually-hidden">${meal}</span></span>` : '') +
      `<button type="button" class="sleep-btn${tutoTarget('dormir')}" data-action="sleep" title="${label}" aria-label="${label}"${ok ? '' : ' disabled'}>${artHtml(ok ? 'sleep-on' : 'sleep-off', 'sleep-art')}${ok ? '' : pxText(`${remaining}s`, 'sleep-wait light')}</button>`
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
  'market-locked': () => {
    showToast(`🔒 ${MARKET_CLOSED}`);
  },
  'stage-goto': (target) => {
    allerAuLieu(target.dataset.window, target.dataset.tab, target.dataset.anchor);
  },
  'switch-tab': (target) => {
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
    setEcranFerme(null);
    telView();
    refresh();
  },
  'sleep': () => {
    actionSleep();
  },
});
