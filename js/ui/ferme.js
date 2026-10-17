import { DATA } from '../engine/catalog.js';
import {
  batteryCapacity, efficiency, isBroken, isOwned, maintainCost, needsService, panelOutput, pumpFlow, repairCost,
  starterOf, tankCapacity, toggleDevice, upgradeCost, upgradeDevice, upgradeTank,
} from '../engine/devices.js';
import { hourOfDay, nightActive } from '../engine/clock.js';
import { deviceStatus, energyStats } from '../engine/energy.js';
import { energyChip } from './energie.js';
import { hoePanelHtml } from './houe.js';
import { renderStarterCards } from './depart.js';
import { isUnlocked } from '../engine/campaign.js';
import {
  formatCoins, formatLitres, formatLitresRate, formatNumber, formatWh, formatWhRate,
} from '../engine/format.js';
import { FERME_LINKS, hoeMode, setEcranFerme, state, tabAvailable, TABS } from './store.js';
import { telView } from './consent.js';
import { applyResult } from './game-actions.js';
import { refresh } from './render.js';
import {
  coopShown, herdShown, openStageWindow, renderAchatPoules, renderAchatTroupeau, setStageReturn,
  setStageWindow, stageReturn, stageWindow,
} from './stage-windows.js';
import { stageUsable } from './stage.js';
import { autoChip, groupButtons, plotCard, renderPaturage, renderPoulailler, renderSilo } from './elevage.js';
import { renderFridgeCard, renderSerre, renderVerger } from './serre-verger-frigo.js';
import { renderAteliers, renderMoulin } from './cuisine.js';
import { renderChapterBanner } from './chapitres.js';
import {
  robotAutonomy, robotBattery, robotBusy, robotChargePct, robotOn, robotTaskCapacity, robotTasksLeft, upgradeRobotBattery,
} from '../engine/automation.js';
import { artIcon } from './animations.js';
import { helpBtn, tutoTarget } from './aide.js';
import { registerActions } from './actions.js';
import { canPay, costLabel } from './common.js';

/* ---------- Ferme : cartes et écrans de détail ---------- */

const DEVICE_ICONS = { panneau: '☀️', batterie: '🔋', pompe: '⛲', moulin: '⚙️', presse: '🌻', frigo: '🧊' };
const DEVICE_NAMES = { panneau: 'Panneau solaire', batterie: 'Batterie', pompe: 'Pompe', moulin: 'Moulin', presse: 'Presse', frigo: 'Réfrigérateur' };

// Version 1.6 : un seul appareil de chaque type, son nom suffit.
export function deviceName(d) {
  return DEVICE_NAMES[d.type];
}

// Le soleil brille-t-il à l'heure actuelle de l'horloge ?
function sunText() {
  const h = hourOfDay(state);
  return h >= DATA.SOLEIL.DEBUT && h < DATA.SOLEIL.FIN
    ? `☀️ Soleil jusqu'à ${DATA.SOLEIL.FIN} h`
    : `🌙 Pas de soleil : le panneau produit de ${DATA.SOLEIL.DEBUT} h à ${DATA.SOLEIL.FIN} h`;
}

// FLU-26 : la production en mots et en jauge (les valeurs en Wh/s restent dans l'aide « ? »).
function powerGauge(prod, max) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((prod / max) * 100))) : 0;
  return `<span class="bar" role="progressbar" aria-label="Production : ${pct} % du maximum" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span class="bar-fill" style="width:${pct}%"></span></span>`;
}

function powerVerdict(e) {
  const p = state.pompe;
  const pompe = isOwned(starterOf(state, 'pompe')) && p.allume && !isBroken(p);
  if (e.production <= 0) return e.charge > 0 ? 'La batterie prend le relais.' : 'Les appareils attendent le soleil.';
  if (pompe && p.debit > 0 && p.debit + 1 < pumpFlow(p)) return '⚠️ Pas assez pour la pompe à plein débit.';
  if (pompe && p.debit > 0) return '✅ Assez pour la pompe.';
  return e.net > 0 ? '✅ Le surplus charge la batterie.' : '✅ Assez pour les appareils en marche.';
}

function panelsMax() {
  return state.panneaux.reduce((t, d) => t + (d.allume && !isBroken(d) ? panelOutput(d, state) : 0), 0);
}

function alertLine(aEntretenir, enPanne) {
  const parts = [];
  if (enPanne) parts.push(`⛔ ${enPanne} en panne`);
  if (aEntretenir) parts.push(`⚠️ ${aEntretenir} à entretenir`);
  return parts.length ? `<span class="alert">${parts.join(' · ')}</span>` : '';
}

// En-tête des écrans ouverts depuis la Ferme.
export function backToFerme() {
  return '<div class="screen-head"><button type="button" class="btn" data-action="switch-tab" data-tab="ferme">← Ferme</button></div>';
}

// Raccourcis de la Ferme : Famille, Livre de recette, Arbre des technologies
// (les deux derniers seulement une fois débloqués).
function renderFermeLinks() {
  const links = FERME_LINKS.filter((id) => tabAvailable(id))
    .map((id) => TABS.find((t) => t.id === id))
    .map((t) => `<button type="button" class="ferme-link" data-action="switch-tab" data-tab="${t.id}"><span aria-hidden="true">${t.icon}</span><span>${t.label}</span></button>`)
    .join('');
  return links ? `<nav class="ferme-links" aria-label="Raccourcis de la ferme">${links}</nav>` : '';
}

export function renderFerme() {
  // Lot 11 : une tranche par section, toujours le même nombre de tranches (une
  // section pas encore débloquée est vide) : chacune n'est mise à jour que si
  // son gabarit a changé.
  // Les achats d'animaux et d'arbres suivent leur section (comme dans les fenêtres de la
  // carte) ; les ancres sont celles des indicateurs du bandeau et des notifications.
  return [
    `<h2>🌾 Ferme</h2>${renderFermeLinks()}${renderChapterBanner()}`,
    renderPotager(),
    isUnlocked(state, 'serre') ? renderSerre() : '',
    isUnlocked(state, 'silo') ? renderSilo() : '',
    coopShown() ? `<div id="etable-poules" class="ancre">${renderPoulailler()}</div>` : '',
    coopShown() ? renderAchatPoules() : '',
    herdShown() ? `<div id="etable-troupeau" class="ancre">${renderPaturage()}</div>` : '',
    herdShown() ? renderAchatTroupeau() : '',
    isUnlocked(state, 'verger') ? renderVerger() : '',
    renderAteliers(),
    typeof renderMoulin === 'function' ? renderMoulin() : '',
    `<div id="bat-eau" class="ancre">${renderEnergieEau()}</div>`,
  ];
}

// Cartes « Énergie et eau », réparties : sur la carte, ⚡ Énergie (panneaux du toit) et
// 💧 Eau (pompe du puits, citerne) ont leur fenêtre ; la Maison garde les achats de départ et
// le frigo. Sans la carte, tout reste ensemble dans la liste de la Ferme.
export function renderEnergieEau() {
  const p = energieEauParts();
  return `
    <h3 class="section-title">⚡ Énergie et eau</h3>
    <div class="cards">
      ${p.starters}${p.panneau}${p.batterie}${p.pompe}${p.reservoir}${p.frigo}${p.robot}
    </div>
  `;
}

export function renderEnergieFenetre() {
  const p = energieEauParts();
  return `<div class="cards">${p.panneau}${p.batterie}</div>`;
}

export function renderEauFenetre() {
  const p = energieEauParts();
  return `<div class="cards">${p.pompe}${p.reservoir}</div>`;
}

// Fenêtre Installations, avec la carte : la maison à réparer, les appareils à acheter, le frigo
// (la fenêtre porte déjà le titre).
export function renderInstallationsMaison() {
  const p = energieEauParts();
  const cards = `${p.starters}${p.frigo}`;
  return cards.trim() ? `<div class="cards">${cards}</div>` : '';
}

function energieEauParts() {
  const e = energyStats(state), p = state.pompe, ps = deviceStatus(state, p), cap = tankCapacity(state);
  const tankUp = upgradeCost({ type: 'reservoir', niveau: state.reservoir.niveau });
  let netText = 'Ni charge ni décharge';
  if (e.net > 0) netText = 'En charge';
  else if (e.net < 0) netText = 'En décharge';
  const tankText = state.eauMl >= cap ? 'Réservoir plein' : `Vitesse de remplissage : ${formatLitresRate(state.flux.eau)}`;
  // version 1.12 : la maison à réparer et les appareils à acheter passent en premier ;
  // un appareil pas encore acheté n'a pas de carte
  const owned = (t) => isOwned(starterOf(state, t));
  const panneauCard = owned('panneau') ? `
      <button type="button" class="card" data-action="open-screen" data-screen="panneaux">
        <span class="card-title"><span>${artIcon('panneau')}Production d'énergie</span><span class="chevron" aria-hidden="true">›</span></span>
        <span>${powerVerdict(e)}</span>
        ${powerGauge(e.production, panelsMax())}
        <span class="muted">Panneau niveau ${state.panneaux[0].niveau} · ${sunText()}</span>
        ${alertLine(e.panneauxAEntretenir, e.panneauxEnPanne)}
      </button>` : '';
  const batterieCard = owned('batterie') ? `
      <button type="button" class="card" data-action="open-screen" data-screen="batteries">
        <span class="card-title"><span>${artIcon('batterie')}Stockage d'énergie</span><span class="chevron" aria-hidden="true">›</span></span>
        <span class="big">${formatNumber(Math.floor(e.charge / 1000))} / ${formatWh(e.capacite)}</span>
        <span class="muted">${netText}</span>
        ${alertLine(e.batteriesAEntretenir, e.batteriesEnPanne)}
      </button>` : '';
  const pompeCard = owned('pompe') ? `
      <div class="card ancre${tutoTarget('eau')}" id="dev-pompe">
        <span class="card-title"><span>${artIcon('pompe')}Pompe · niveau ${p.niveau}</span><span class="chips"><span class="chip${ps.code === 'panne' ? ' panne' : ''}">${ps.label}</span>${helpBtn('pompe')}</span></span>
        <span class="muted">Débit réel : <span class="num">${formatLitresRate(p.debit)}</span> (max ${formatLitresRate(pumpFlow(p))})</span>
        ${wearHtml(p)}
        ${deviceControls(p)}
      </div>` : '';
  const reservoirCard = owned('reservoir') ? `
      <div class="card${tutoTarget('eau')}">
        <span class="card-title"><span>${artIcon('reservoir')}Réservoir · niveau ${state.reservoir.niveau}</span>${helpBtn('reservoir')}</span>
        <span class="big">${formatNumber(Math.floor(state.eauMl / 1000))} / ${formatLitres(cap)}</span>
        <span class="muted">${tankText}</span>
        ${tankUp === null
          ? '<button type="button" class="btn" disabled>Niveau max</button>'
          : `<button type="button" class="btn" data-action="upgrade-tank"${canPay(tankUp) ? '' : ' disabled'}>Agrandir : ${formatLitres(DATA.GRID.reservoir.litres[state.reservoir.niveau] * 1000)} (${costLabel(tankUp)})</button>`}
      </div>` : '';
  return {
    robot: renderRobotCard(),
    starters: renderStarterCards(),
    panneau: panneauCard,
    batterie: batterieCard,
    pompe: pompeCard,
    reservoir: reservoirCard,
    frigo: isUnlocked(state, 'frigo') ? renderFridgeCard() : '',
  };
}

// Le robot de la ferme (récolte et semis automatiques) : sa batterie, ce qu'il fait, son
// autonomie et l'achat d'un palier de plus. Sur la carte : un appui sur lui ou sur sa station.
export function renderRobotCard() {
  if (!robotOn(state)) return '';
  const B = DATA.ROBOT.BATTERIE, bat = robotBattery(state), r = state.robot;
  const pct = robotChargePct(state);
  const aujourdhui = r && r.jour === state.day;
  let etat = 'Au repos à sa station : sa liste du jour est faite.';
  if (aujourdhui && r.charge) etat = `🔋 Sa batterie s'est vidée : il se recharge et reprendra sa liste à ${DATA.ROBOT.BATTERIE.REPRISE} %.`;
  else if (robotBusy(state)) etat = `🤖 Au travail : tâche ${r.i + 1} / ${r.taches.length}.`;
  else if (!aujourdhui) etat = `À sa station : il dresse sa liste à ${DATA.ROBOT.HEURE} h.`;
  let charge = 'Pas de charge en ce moment : pas assez d\'électricité';
  if (bat.conso > 0) charge = `⚡ En charge : ${formatWhRate(bat.conso)}`;
  else if (pct >= 100) charge = 'Batterie pleine';
  else if (robotBusy(state)) charge = 'il se rechargera à sa station';
  else if (nightActive(state)) charge = 'il se recharge cette nuit';
  const cls = pct < 20 ? ' bad' : pct < 40 ? ' warn' : '';
  const max = bat.paliers >= B.PALIERS_MAX;
  const btn = max
    ? '<button type="button" class="btn" disabled>Autonomie maximale</button>'
    : `<button type="button" class="btn" data-action="robot-autonomie"${canPay(B.PALIER_PRIX) ? '' : ' disabled'}>Autonomie +${B.PALIER_PCT} % (${costLabel(B.PALIER_PRIX)})</button>`;
  return `
      <div class="card ancre" id="dev-robot">
        <span class="card-title"><span><span aria-hidden="true">🤖</span> Robot de la ferme</span><span class="chip">🔋 ${formatNumber(pct)} %</span></span>
        <span class="bar" role="progressbar" aria-label="Batterie du robot" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span class="bar-fill${cls}" style="width:${pct}%"></span></span>
        <span class="muted">Encore <span class="num">${formatNumber(robotTasksLeft(state))}</span> tâches · ${charge}</span>
        <span>${etat}</span>
        <span class="muted">Autonomie : <span class="num">${formatNumber(robotAutonomy(state))} %</span>, soit ${formatNumber(robotTaskCapacity(state))} tâches batterie pleine. Sa station, à côté de la maison, le recharge sur l'électricité de la ferme (${formatNumber(B.WH_TACHE)} Wh par tâche).</span>
        <span class="device-actions">${btn}</span>
      </div>`;
}

export function wearHtml(d) {
  const pct = d.usure;
  const cls = isBroken(d) ? ' bad' : needsService(d) ? ' warn' : '';
  return `
    <span class="muted">Usure : <span class="num">${formatNumber(pct)} %</span> · rendement ${formatNumber(efficiency(d))} %</span>
    <span class="bar" role="progressbar" aria-label="Usure" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(d.usure)}"><span class="bar-fill${cls}" style="width:${pct}%"></span></span>
  `;
}

// Interrupteur à deux positions : rouge à l'arrêt, vert en marche, et l'état
// est aussi écrit (la couleur n'est jamais la seule indication).
export function switchHtml(d) {
  const broken = isBroken(d);
  const on = d.allume && !broken;
  const text = broken ? 'En panne' : on ? 'Marche' : 'Arrêt';
  return `<button type="button" class="switch" role="switch" aria-checked="${on}" aria-label="${deviceName(d)}" data-action="toggle" data-id="${d.id}"${broken ? ' disabled' : ''}><span class="knob" aria-hidden="true"></span><span>${text}</span></button>`;
}

function deviceControls(d) {
  const up = upgradeCost(d);
  const maintain = maintainCost(d);
  const repair = repairCost(d);
  const broken = isBroken(d);
  const upgradeBtn =
    up === null
      ? '<button type="button" class="btn" disabled>Niveau max</button>'
      : `<button type="button" class="btn" data-action="upgrade" data-id="${d.id}"${canPay(up) ? '' : ' disabled'}>Améliorer (${costLabel(up)})</button>`;
  const maintainOk = !broken && (d.usure > 0 || d.usureMs > 0) && canPay(maintain);
  const repairOk = broken && canPay(repair);
  // FLU-26 : « Entretenir » seulement s'il y a de l'usure, « Réparer » seulement en panne
  const maintainBtn = !broken && d.usure > 0 ? `<button type="button" class="btn" data-action="maintain" data-id="${d.id}"${maintainOk ? '' : ' disabled'}>Entretenir (${costLabel(maintain)})</button>` : '';
  const repairBtn = broken ? `<button type="button" class="btn" data-action="repair" data-id="${d.id}"${repairOk ? '' : ' disabled'}>Réparer (${costLabel(repair)})</button>` : '';
  return `
    <span class="device-actions">
      ${switchHtml(d)}
      ${upgradeBtn}
      ${maintainBtn}${repairBtn}
    </span>
  `;
}

function deviceRow(d) {
  const st = deviceStatus(state, d);
  let detail;
  if (d.type === 'panneau') {
    detail = `<span class="muted">Production, de ${DATA.SOLEIL.DEBUT} h à ${DATA.SOLEIL.FIN} h :</span>${powerGauge(d.prod, panelOutput(d, state))}`;
  } else {
    const cap = batteryCapacity(d);
    let flow = 'Ni charge ni décharge';
    if (st.code === 'decharge') flow = 'Elle alimente les appareils';
    else if (st.code === 'charge') flow = 'Elle se charge';
    detail = `
      <span class="muted">Charge : <span class="num">${formatNumber(Math.floor(d.chargeMwh / 1000))} / ${formatWh(cap)}</span></span>
      <span class="muted">${flow}</span>`;
  }
  const badge = st.badge ? `<span class="chip warn">⚠️ ${st.badge}</span>` : '';
  return `
    <article class="card ancre" id="dev-${d.id}">
      <span class="card-title"><span>${DEVICE_ICONS[d.type]} ${deviceName(d)} · niveau ${d.niveau}</span><span class="chip${st.code === 'panne' ? ' panne' : ''}">${st.label}</span></span>
      ${badge}
      ${detail}
      ${wearHtml(d)}
      ${deviceControls(d)}
    </article>
  `;
}

// Panneaux solaires ou batteries : le résumé, puis la carte de chaque appareil (usure,
// entretien, réparation, amélioration).
function deviceDetail(kind) {
  const isPanels = kind === 'panneaux';
  const list = isPanels ? state.panneaux : state.batteries;
  const e = energyStats(state);
  const summary = isPanels
    ? `<span>${powerVerdict(e)}</span>
       ${powerGauge(e.production, panelsMax())}
       <span class="muted">${sunText()}</span>`
    : `<span class="big">${formatNumber(Math.floor(e.charge / 1000))} / ${formatWh(e.capacite)}</span>
       <span class="muted">${e.net > 0 ? 'En charge' : e.net < 0 ? 'En décharge' : 'Ni charge ni décharge'}</span>`;
  return `
    <div class="stack">${summary}</div>
    <div class="device-list">${list.map(deviceRow).join('')}</div>
  `;
}

// Sans la carte : écran de détail de la Ferme, avec son retour.
export function renderDeviceScreen(kind) {
  const isPanels = kind === 'panneaux';
  const type = isPanels ? 'panneau' : 'batterie';
  return `
    <div class="screen-head">
      <button type="button" class="btn" data-action="close-screen">← Ferme</button>
      <h2>${artIcon(type)}${isPanels ? 'Production d\'énergie' : 'Stockage d\'énergie'}</h2>
      ${helpBtn(type)}
    </div>
    ${deviceDetail(kind)}
  `;
}

// Avec la carte : fenêtre dans le cadre bois (elle porte déjà le titre) ; « ‹ Énergie »
// ramène à la fenêtre d'où l'on vient.
export function renderDeviceFenetre(kind) {
  const type = kind === 'panneaux' ? 'panneau' : 'batterie';
  return `
    <div class="section-head">
      <button type="button" class="btn" data-action="stage-open" data-window="energie">‹ Énergie</button>
      <span class="chips">${helpBtn(type)}</span>
    </div>
    ${deviceDetail(kind)}
  `;
}

/* ---------- Ferme : Zone de culture (state.potager) ---------- */

// Version 1.9 : plus d'agrandissement en pièces ; la houe laboure l'herbe (plafond de tuiles
// par niveau). Version 1.15 : partout sur la carte (une seule Zone de culture).
export function renderPotager() {
  const pot = state.potager;
  const plots = `<div class="plots${tutoTarget('potager')}">${pot.parcelles.map((p, i) => plotCard(p, i + 1)).join('')}</div>
    <div class="row plot-foot">${groupButtons('potager')}</div>`;
  return `
    <div class="section-head">
      <h3>${artIcon('potager')}${DATA.POTAGER.NOM} · ${pot.parcelles.length} parcelles</h3>
      <span class="chips">${autoChip('potager', `Un robot récolte et replante dès ${DATA.ROBOT.HEURE} h, les asperseurs arrosent à ${DATA.TIME.ARROSAGE_HEURE} h, à 100 %`)}${energyChip('arroser')}${helpBtn('potager')}</span>
    </div>
    ${hoePanelHtml()}
    ${plots}
  `;
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'open-screen': (target) => {
    // Avec la carte : la fenêtre du même nom, dans le cadre bois.
    if (stageUsable()) {
      openStageWindow(target.dataset.screen);
      telView();
      return;
    }
    setStageReturn(stageWindow);
    setStageWindow(null);
    setEcranFerme(target.dataset.screen);
    telView();
    refresh();
  },
  'close-screen': () => {
    setEcranFerme(null);
    setStageWindow(stageReturn);
    setStageReturn(null);
    telView();
    refresh();
  },
  'toggle': (target) => {
    applyResult(toggleDevice(state, target.dataset.id));
  },
  'upgrade': (target) => {
    applyResult(upgradeDevice(state, target.dataset.id));
  },
  'upgrade-tank': () => {
    applyResult(upgradeTank(state));
  },
  'robot-autonomie': () => {
    applyResult(upgradeRobotBattery(state));
  },
});
