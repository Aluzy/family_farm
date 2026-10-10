import { DATA } from '../engine/catalog.js';
import { findDevice } from '../engine/devices.js';
import { allPlots, isMature, maxStage, plotZone, zone2Plots } from '../engine/crops.js';
import { isTreeAdult } from '../engine/orchard.js';
import { woolReady } from '../engine/animals.js';
import { techAuto } from '../engine/techtree.js';
import { chapterProgress, isUnlocked } from '../engine/campaign.js';
import { alertSnapshot, getNotifications } from '../engine/alerts.js';
import {
  activeTab, ecranFerme, setActiveTab, setComptoirTab, setEcranFerme, setInvTab, state, tabAvailable, TABS,
} from './store.js';
import { telView } from './consent.js';
import { safeStorageGet, safeStorageSet } from './storage.js';
import { morph, refresh, setLastRenderAt } from './render.js';
import {
  allerAuLieu, interiorAvailable, MAISON_TABS, openStageWindow, renderTabContent, setAncreVoulue, setMaisonTab,
  setStageInterior, setStageReturn, setStageWindow, stageInterior, STAGE_WINDOWS,
} from './stage-windows.js';
import { renderMoulin } from './cuisine.js';
import { objectiveValueText } from './chapitres.js';
import { registerActions } from './actions.js';
import { closeModal } from './common.js';

/* ---------- Carte Phaser (voir farm-stage.js et docs/architecture-phaser.md) ---------- */

// Découpe de chaque culture dans assets/crops.png (champ "sprite" de data/crops.json) :
// la scène ne lit pas DATA, elle la reçoit au montage.
function cropSprites() {
  const out = {};
  for (const [id, crop] of Object.entries(DATA.crops)) if (crop.sprite) out[id] = crop.sprite;
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

// Colonnes de la zone de culture selon le nombre de parcelles : 6, 12, 18, 24, 30 parcelles =
// 2×3, 3×4, 3×6, 4×6, 5×6 (colonnes × rangées), à partir du coin de `zone_culture` de la carte.
function stageCols(n) {
  return n <= 6 ? 2 : n <= 18 ? 3 : n <= 24 ? 4 : 5;
}

// Heure du jour, de 0 à 24 (fractionnaire) : la journée commence à DAY_START_HOUR au réveil,
// puis une heure passe toutes les CLOCK_SECONDS_PER_HOUR secondes d'éveil (18 s).
export function heureDuJour() {
  const parHeure = DATA.TIME.CLOCK_SECONDS_PER_HOUR * 1000;
  return (DATA.TIME.DAY_START_HOUR + state.awakeMs / parHeure) % 24;
}

// Cadran d'horloge de l'heure entière : 🕐 (1 h) à 🕛 (12 h), le même le matin et le soir.
export function horlogeEmoji(heure) {
  return String.fromCodePoint(0x1f550 + ((Math.floor(heure) + 11) % 12));
}

// Lieux de la carte qui portent une étiquette (et une fenêtre du même nom).
export const STAGE_LIEUX = ['maison', 'etable', 'poulailler', 'moulin', 'serre', 'verger', 'zone', 'zone2', 'silo', 'ville'];

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
  if (!d) return { fenetre: 'maison', onglet: 'batiments', ancre: 'bat-eau' };
  if (d.type === 'panneau') return { ecran: 'panneaux', ancre: `dev-${d.id}` };
  if (d.type === 'batterie') return { ecran: 'batteries', ancre: `dev-${d.id}` };
  if (d.type === 'moulin' && moulinSurPlace()) return { fenetre: 'moulin', ancre: 'moulin-appareil' };
  if (d.type === 'moulin' || d.type === 'presse') return { fenetre: 'maison', onglet: 'recettes', ancre: `station-${d.type}` };
  if (d.type === 'frigo') return { fenetre: 'maison', onglet: 'batiments', ancre: 'dev-frigo' };
  if (d.type === 'pompe') return { fenetre: 'maison', onglet: 'batiments', ancre: 'dev-pompe' };
  return { fenetre: 'maison', onglet: 'batiments', ancre: 'bat-eau' };
}

// Fenêtre de la carte où ranger une cible (pour les pastilles des étiquettes).
function fenetreDeCible(c) {
  return c.fenetre || (c.ecran ? 'maison' : null);
}

// Parcelles d'un lieu ('potager' ou 'serre') qui attendent un geste, avec les règles des
// notifications : à arroser, ou mûres (sauf ce que l'Arbre des technologies automatise).
// `zone` (facultatif, pour 'potager') : 1 = la Zone de culture, 2 = le Champ.
function parcellesAFaire(lieu, quoi, zone) {
  return allPlots(state).filter((p) => {
    if (!p.culture || p.lieu !== lieu || (zone && plotZone(p) !== zone)) return false;
    if (isMature(p)) return quoi !== 'arrosage' && !techAuto(state, 'recolte', lieu);
    return quoi !== 'recolte' && !p.arrose && !techAuto(state, 'arrosage', lieu);
  }).length;
}

// Nombre de choses à faire par lieu de la carte : la pastille des étiquettes. Rien de
// nouveau : ce sont les alertes de getNotifications() et de alertSnapshot(), rangées là
// où elles se règlent.
function aFaireParLieu() {
  const n = { maison: 0, etable: 0, poulailler: 0, moulin: 0, serre: 0, verger: 0, zone: 0, zone2: 0 };
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
  n.zone = parcellesAFaire('potager', null, 1);
  n.zone2 = parcellesAFaire('potager', null, 2);
  n.serre = parcellesAFaire('serre');
  return n;
}

// Première parcelle d'un lieu qui attend le geste `quoi` ('arrosage' ou 'recolte').
function premiereParcelle(lieu, quoi, zone) {
  return allPlots(state).find((p) => {
    if (!p.culture || p.lieu !== lieu || (zone && plotZone(p) !== zone)) return false;
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
    case 'frigoCoupe': return { fenetre: 'maison', onglet: 'batiments', ancre: 'dev-frigo' };
    case 'arrosage': case 'recolte': {
      // La Zone de culture d'abord, puis le Champ, puis la Serre.
      const ou = parcellesAFaire('potager', type, 1) > 0 ? ['potager', 1, 'zone']
        : parcellesAFaire('potager', type, 2) > 0 ? ['potager', 2, 'zone2']
          : isUnlocked(state, 'serre') ? ['serre', null, 'serre'] : ['potager', 1, 'zone'];
      const p = premiereParcelle(ou[0], type, ou[1]);
      return { fenetre: ou[2], ancre: p ? `plot-${p.id}` : null };
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
  const w = STAGE_WINDOWS[c.fenetre];
  const onglet = c.fenetre === 'maison' && c.onglet ? MAISON_TABS.find((t) => t.id === c.onglet) : null;
  return onglet ? `${w.nom} › ${onglet.label}` : w.nom;
}

// Va à une cible : ouvre le bon menu et amène la ligne concernée en haut.
function allerA(c) {
  if (!c) return;
  if (c.page) {
    setActiveTab(tabAvailable(c.page) ? c.page : 'ferme');
    if (c.page === 'inventaire' && c.sous) setInvTab(c.sous);
    if (c.page === 'comptoir' && c.sous) setComptoirTab(c.sous);
    setStageWindow(null);
    setStageReturn(null);
    setStageInterior(null);
    setEcranFerme(null);
  } else if (c.ecran) {
    // Écran de détail : au retour, on retombe sur Maison › Installations.
    setActiveTab('ferme');
    setMaisonTab('batiments');
    setStageReturn(stageUsable() ? 'maison' : null);
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
    return { id: p.id, culture: p.culture, icone: DATA.crops[p.culture].icone, phase, mature, arrosee: !!p.arrose };
  };
  const plots = state.potager.parcelles.map(vue);
  // Le Champ (vide tant que le Moulin n'est pas débloqué) et les arbres du Verger, dans
  // l'ordre où ils ont été plantés : chacun prend l'emplacement suivant de la carte.
  const plots2 = zone2Plots(state).map(vue);
  // La Serre : ses parcelles se posent dans les bacs de son intérieur (vide tant qu'elle
  // n'est pas construite). `interieur` dit si le joueur y est entré.
  const serre = state.serre.construit ? state.serre.parcelles.map(vue) : [];
  const arbres = isUnlocked(state, 'verger')
    ? state.verger.arbres.slice(0, STAGE_ARBRES).map((t) => ({ id: t.id, jeune: !isTreeAdult(state, t) }))
    : [];
  // Lieux étiquetés : seulement ceux que le jeu a débloqués (la maison et la zone sont
  // toujours là), avec leur nom et le nombre de choses à y faire.
  const aFaire = aFaireParLieu();
  const batiments = {};
  for (const id of STAGE_LIEUX) batiments[id] = { visible: STAGE_WINDOWS[id].ok(), nom: STAGE_WINDOWS[id].nom, badge: aFaire[id] };
  // Heure arrondie au quart d'heure : la lumière de la carte change par petits pas.
  const heure = (Math.round(heureDuJour() * 4) / 4) % 24;
  // Les bêtes de l'Étable et du Poulailler : seulement des nombres, la carte en fait des
  // bêtes dans l'enclos et des poules en liberté autour du Poulailler.
  const animaux = { vache: state.paturage.vaches.length, mouton: state.paturage.moutons.length, poule: state.poulailler.poules };
  return { heure, cols: stageCols(plots.length), plots, cols2: DATA.POTAGER.ZONE2.COLONNES, plots2, serre, interieur: stageInterior, arbres, batiments, animaux };
}

// Pont carte → jeu : crée un bouton invisible portant data-action et le clique. La
// délégation d'événements existante fait le reste (action, fenêtre, suivi).
function stageAct(action, data) {
  const b = document.createElement('button');
  b.type = 'button';
  b.hidden = true;
  b.dataset.action = action;
  for (const k of Object.keys(data || {})) b.dataset[k] = data[k];
  document.getElementById('farm-stage').appendChild(b);
  b.click();
  b.remove();
}

export function renderStage() {
  const el = document.getElementById('farm-stage');
  let on = stageActive();
  const wasOn = stageMounted && !el.hidden; // la carte était-elle déjà à l'écran ?
  if (on && !stageMounted) {
    stageMounted = true;
    stageMountedAt = Date.now();
    el.hidden = false;
    // Ne pas laisser un plantage de Phaser empêcher de jouer : repli sur la liste classique.
    try {
      if (!FarmStage.mount(el, { act: stageAct, onView: stageOnView, base: 'assets/', crops: cropSprites() })) stageBroken = true;
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
  const head = document.querySelector('.app-header');
  document.documentElement.style.setProperty('--header-h', head.offsetHeight + 'px');
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

/* Par-dessus la carte (DOM) : l'objectif du chapitre en haut, les trois points en bas, et
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

// Objectif en cours, en une ligne : le premier objectif pas encore atteint du chapitre.
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
  return `<button type="button" class="stage-chip" data-action="stage-open" data-window="chapitres" aria-label="Chapitre ${p.chapitre}${suite} : ${o.libelle}${valeur ? `, ${valeur}` : ''}. Ouvrir les chapitres" title="Chapitre ${p.chapitre} : ${p.titre}"><span class="stage-chip-pill"><span aria-hidden="true">${p.icone}</span><span class="stage-chip-text">${o.libelle}</span><span class="stage-chip-val num">${valeur}</span><span class="stage-chip-go" aria-hidden="true">›</span><span class="stage-chip-bar" aria-hidden="true"><span style="width:${pct}%"></span></span></span></button>`;
}

function renderStageHud(el) {
  let hud = el.querySelector('.stage-hud');
  if (!hud) {
    el.insertAdjacentHTML('beforeend', '<div class="stage-hud"></div><div class="stage-nav"></div>');
    hud = el.querySelector('.stage-hud');
  }
  morph(hud, chapterChipHtml());
  if (!stageView) stageView = FarmStage.view();
  renderStageNav(el);
}

// Les trois points (écran de gauche, du milieu, de droite) et les flèches des bords.
function renderStageNav(el) {
  const nav = el.querySelector('.stage-nav');
  const v = stageView;
  if (!nav) return;
  // Dans un intérieur : sortir, ou ouvrir la fenêtre du bâtiment.
  if (stageInterior) {
    const w = STAGE_WINDOWS[stageInterior];
    morph(nav, `<div class="stage-room-bar" role="group" aria-label="${w.nom}">
      <button type="button" class="stage-room-btn" data-action="stage-exit" aria-label="Sortir : retour à la carte" title="Retour à la carte"><span aria-hidden="true">‹</span> Sortir</button>
      <button type="button" class="stage-room-btn" data-action="stage-open" data-window="${stageInterior}" aria-label="${w.nom} : agrandir, tout arroser, tout récolter" title="Agrandir, tout arroser, tout récolter"><span aria-hidden="true">${w.icone}</span> Gérer</button>
    </div>`);
    return;
  }
  if (!v || !v.mobile) {
    morph(nav, '');
    return;
  }
  const noms = ['Écran de gauche : l\'étable', 'Écran du milieu : la maison', 'Écran de droite : le moulin et la serre'];
  const dots = noms
    .map((nom, i) => `<button type="button" class="stage-dot${i === v.ecran ? ' active' : ''}" data-action="stage-pan" data-ecran="${i}" aria-label="${nom}" title="${nom}"${i === v.ecran ? ' aria-current="true"' : ''}><span aria-hidden="true"></span></button>`)
    .join('');
  const fleche = (cote, ecran, signe, nom) =>
    `<button type="button" class="stage-arrow ${cote}" data-action="stage-pan" data-ecran="${ecran}" aria-label="${nom}" title="${nom}"><span aria-hidden="true">${signe}</span></button>`;
  const arrows = stageDragged
    ? ''
    : (v.gauche ? fleche('gauche', Math.max(0, v.ecran - 1), '‹', 'La carte continue à gauche') : '') +
      (v.droite ? fleche('droite', Math.min(v.ecrans - 1, v.ecran + 1), '›', 'La carte continue à droite') : '');
  morph(nav, `<div class="stage-dots" role="group" aria-label="Écrans de la carte">${dots}</div>${arrows}`);
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
});
