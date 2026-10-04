import { DATA } from '../engine/catalog.js';
import { EPS } from '../engine/base.js';
import { currentSeason } from '../engine/seasons.js';
import { allDevices } from '../engine/devices.js';
import { awakeRequired } from '../engine/clock.js';
import { planMeal } from '../engine/family.js';
import { cowCount, sheepCount } from '../engine/animals.js';
import { isUnlocked, lastAutonomy, plannedAutonomy } from '../engine/campaign.js';
import { canSleep } from '../engine/night.js';
import { notificationCount } from '../engine/alerts.js';
import { formatCoins, formatLitres, formatNumber, formatPercent } from '../engine/format.js';
import {
  activeTab, ecranFerme, FERME_LINKS, NAV_TABS, setActiveTab, setEcranFerme, state, tabAvailable, TABS,
} from './store.js';
import { telView } from './consent.js';
import { actionSleep } from './game-actions.js';
import { morph, morphSlots, refresh, setLastRenderAt } from './render.js';
import {
  cibleAttrs, heureDuJour, horlogeEmoji, setStagePan, STAGE_LIEUX, stageActive, stageUsable,
} from './stage.js';
import {
  backToFerme, deviceName, renderDeviceScreen, renderEnergieEau, renderFerme, renderPotager,
} from './ferme.js';
import { renderPaturage, renderPoulailler, renderSilo } from './elevage.js';
import { renderCalendar, renderSerre, renderVerger } from './serre-verger-frigo.js';
import { renderAteliers, renderMoulin, renderRecettes } from './cuisine.js';
import { renderTechno } from './techno.js';
import { renderFamille } from './famille.js';
import { renderNotifications } from './notifications.js';
import { renderInventaire, subtabsHtml } from './inventaire.js';
import { renderArbres, renderComptoir } from './marche.js';
import { renderChapterBanner } from './chapitres.js';
import { tutoTarget } from './aide.js';
import { registerActions } from './actions.js';

/* ---------- Fenêtres de la carte ---------- */

// Un appui sur un bâtiment ou sur son étiquette ouvre une fenêtre dont le contenu est celui
// des sections de la Ferme, redessiné à chaque rendu : les boutons y fonctionnent comme
// dans la liste classique. Les fenêtres de #modal-root s'affichent par-dessus.
export let stageWindow = null; // null, 'maison', 'etable', 'serre', 'moulin', 'verger', 'zone' ou 'chapitres'
export function setStageWindow(value) {
  stageWindow = value;
  return value;
}
export let stageReturn = null; // fenêtre à rouvrir en revenant d'un écran de détail (panneaux, batteries)
export function setStageReturn(value) {
  stageReturn = value;
  return value;
}
let stageWindowShown = null; // dernière fenêtre dessinée (avec son onglet) : pour remonter en haut au changement
let maisonTab = 'famille'; // onglet de la fenêtre Maison
export function setMaisonTab(value) {
  maisonTab = value;
  return value;
}
let ancreVoulue = null; // id de l'élément à amener en haut au prochain rendu (calendrier, eau…)
export function setAncreVoulue(value) {
  ancreVoulue = value;
  return value;
}

export const MAISON_TABS = [
  { id: 'famille', label: 'Famille', icon: '👨‍👩‍👧‍👦', ok: () => tabAvailable('famille'), corps: () => renderFamille() },
  { id: 'recettes', label: 'Livre de recette', icon: '📖', ok: () => tabAvailable('recettes'), corps: () => renderRecettes() },
  { id: 'techno', label: 'Arbre des technologies', icon: '🌳', ok: () => tabAvailable('techno'), corps: () => renderTechno() },
  { id: 'batiments', label: 'Installations', icon: '🏗️', ok: () => true, corps: () => renderBatiments() },
];

function maisonCurrentTab() {
  const tabs = MAISON_TABS.filter((t) => t.ok());
  return tabs.find((t) => t.id === maisonTab) || tabs[0];
}

// Onglet « Installations » de la Maison (identifiant interne : batiments) : ce qui n'a pas
// de dessin sur la carte : ateliers (Four, Cuisine, Presse), énergie et eau,
// Silo, calendrier. Les ancres servent aux indicateurs du bandeau (💧, saison).
function renderBatiments() {
  return `${renderAteliers()}<div id="bat-eau" class="ancre">${renderEnergieEau()}</div>${isUnlocked(state, 'silo') ? renderSilo() : ''}<h3 class="section-title ancre" id="bat-calendrier">📅 Calendrier</h3>${renderCalendar()}`;
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

export function renderAchatArbres() {
  return state.verger.construit ? renderArbres() : '';
}

// Une partie peut avoir des animaux avant que le chapitre n'ouvre leur logement (mode
// test, sauvegarde modifiée) : l'Étable et ses sections existent alors quand même, pour
// qu'aucun animal ne soit caché (et qu'aucune alerte ne parle d'animaux invisibles).
export function coopShown() {
  return isUnlocked(state, 'poulailler') || state.poulailler.construit;
}

export function herdShown() {
  return isUnlocked(state, 'paturage') || state.paturage.construit || sheepCount(state) + cowCount(state) > 0;
}

function renderEtableWindow() {
  const poules = coopShown() ? `<div id="etable-poules" class="ancre">${renderPoulailler()}${renderAchatPoules()}</div>` : '';
  const troupeau = herdShown() ? `<div id="etable-troupeau" class="ancre">${renderPaturage()}${renderAchatTroupeau()}</div>` : '';
  return poules + troupeau;
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
    ok: () => coopShown() || herdShown(),
    corps: () => renderEtableWindow(),
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
    corps: () => renderVerger() + renderAchatArbres(),
  },
  zone: {
    nom: DATA.POTAGER.NOM, icone: '🌱', ok: () => true, haute: true, sansTitre: true,
    detail: () => `niveau ${state.potager.niveau}`,
    corps: () => renderPotager(),
  },
  chapitres: { nom: 'Chapitres', icone: '📜', ok: () => true, corps: () => renderChapterBanner() },
};

export function renderStageWindow() {
  const root = document.getElementById('window-root');
  const w = stageWindow ? STAGE_WINDOWS[stageWindow] : null;
  if (stageWindow && (!w || !w.ok() || !stageActive())) stageWindow = null;
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
          <button type="button" class="icon-btn" id="stage-window-close" data-action="stage-close" aria-label="Fermer la fenêtre" title="Fermer">✕</button>
        </header>
        ${w.onglets ? `<div class="window-tabs">${w.onglets()}</div>` : ''}
        <div class="window-body${w.sansTitre ? ' sans-titre' : ''}">${w.corps()}</div>
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
  if (!STAGE_WINDOWS[id] || !STAGE_WINDOWS[id].ok()) return;
  stageWindow = id;
  stageReturn = null;
  renderStageWindow(); // tout de suite, sans attendre la cadence de rendu
  refresh();
}

export function closeStageWindow() {
  stageWindow = null;
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
    if (STAGE_LIEUX.includes(fenetre)) setStagePan(fenetre);
  } else {
    stageWindow = null;
    setActiveTab(fenetre === 'maison' && FERME_LINKS.includes(onglet) && tabAvailable(onglet) ? onglet : 'ferme');
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

// Bandeau : chaque indicateur porte sa légende ; ceux qui ont un lieu y mènent (saison →
// calendrier, eau → Maison › Installations, autonomie → Maison › Famille).
export function renderIndicators() {
  const saison = DATA.SAISONS.INFOS[currentSeason(state)];
  const heure = Math.floor(heureDuJour());
  const cell = (icone, valeur, legende, titre) =>
    `<span class="indicator" title="${titre}"><span class="ind-val"><span aria-hidden="true">${icone}</span>${valeur ? `<span class="num">${valeur}</span>` : ''}</span><span class="ind-leg">${legende}</span></span>`;
  const lien = (icone, valeur, legende, titre, lieu) =>
    `<button type="button" class="indicator indicator-btn" data-action="stage-goto" data-window="${lieu.fenetre}" data-tab="${lieu.onglet}"${lieu.ancre ? ` data-anchor="${lieu.ancre}"` : ''} title="${titre}" aria-label="${titre}"><span class="ind-val"><span aria-hidden="true">${icone}</span>${valeur ? `<span class="num">${valeur}</span>` : ''}</span><span class="ind-leg">${legende}</span></button>`;
  // Première ligne, à côté du titre : la nuit et l'heure. Deuxième ligne : le reste.
  morph(document.getElementById('app-clock'),
    cell('🌙', state.day, 'Nuit', `Nuit ${state.day}`) +
    cell(horlogeEmoji(heure), `${heure} h`, 'Heure', `Heure de la journée : ${heure} h`));
  morph(document.getElementById('indicators'),
    lien(saison.icone, '', saison.nom, `Saison : ${saison.nom}. Ouvrir le calendrier`, { fenetre: 'maison', onglet: 'batiments', ancre: 'bat-calendrier' }) +
    lien('💧', formatLitres(state.eauMl), 'Eau', `Eau du réservoir : ${formatLitres(state.eauMl)}. Ouvrir l'énergie et l'eau`, { fenetre: 'maison', onglet: 'batiments', ancre: 'bat-eau' }) +
    cell('💰', formatCoins(state.pieces), 'Pièces', `Pièces : ${formatCoins(state.pieces)}`) +
    lien('🌿', formatPercent(lastAutonomy(state)), 'Autonomie', `Autonomie de la dernière nuit : ${formatPercent(lastAutonomy(state))}. Ouvrir la Famille`, { fenetre: 'maison', onglet: 'famille' })
  );
}

export function renderTabbar() {
  const current = FERME_LINKS.includes(activeTab) ? 'ferme' : activeTab;
  const alerts = notificationCount(state);
  morph(
    document.getElementById('bottom-nav'),
    NAV_TABS.map((id) => TABS.find((t) => t.id === id))
      .filter((t) => tabAvailable(t.id))
      .map((t) => {
        const badge = t.id === 'notifications' && alerts > 0 ? `<span class="nav-badge" aria-hidden="true">${alerts}</span>` : '';
        const label = t.id === 'notifications' && alerts > 0 ? `${t.label} (${alerts} alerte${alerts > 1 ? 's' : ''})` : t.label;
        return `<button type="button" class="nav-btn${t.id === current ? ' active' : ''}" data-action="switch-tab" data-tab="${t.id}" aria-label="${label}"${t.id === current ? ' aria-current="page"' : ''}><span class="nav-icon" aria-hidden="true">${t.icon}${badge}</span><span class="nav-label">${t.label}</span></button>`;
      })
      .join('')
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
  notifications: () => [renderNotifications()],
};

export function renderTabContent() {
  morphSlots(document.getElementById('tab-content'), (TAB_RENDERERS[activeTab] || TAB_RENDERERS.ferme)());
}

// Bouton « Zzz » (Dormir), en bas à droite sur tous les onglets. L'aperçu du repas est dans
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
  morph(
    document.getElementById('sleep-fab'),
    (short ? `<span class="chip warn meal-chip" title="${meal}"><span aria-hidden="true">🍽️ ${eaten} ⚠️</span><span class="visually-hidden">${meal}</span></span>` : '') +
      `<button type="button" class="sleep-btn${tutoTarget('dormir')}" data-action="sleep" title="${label}" aria-label="${label}"${ok ? '' : ' disabled'}><span aria-hidden="true">Zzz</span>${ok ? '' : `<span class="sleep-wait" aria-hidden="true">${remaining} s</span>`}</button>`
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
  'maison-tab': (target) => {
    maisonTab = target.dataset.tab;
    renderStageWindow();
    refresh();
  },
  'stage-goto': (target) => {
    allerAuLieu(target.dataset.window, target.dataset.tab, target.dataset.anchor);
  },
  'switch-tab': (target) => {
    if (FERME_LINKS.includes(target.dataset.tab) && stageUsable()) {
      allerAuLieu('maison', target.dataset.tab);
      return;
    }
    setActiveTab(target.dataset.tab);
    stageWindow = null;
    stageReturn = null;
    setEcranFerme(null);
    telView();
    refresh();
  },
  'sleep': () => {
    actionSleep();
  },
});
