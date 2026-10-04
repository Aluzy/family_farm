import { DATA } from '../engine/catalog.js';
import {
  testAddCows, testAddDevice, testAddEggs, testAddFlour, testAddFood, testAddHens, testAddOil,
  testAddPieces, testAddSeeds, testAddSheep, testAddStraw, testAddTechPoints, testAddWheat,
  testAgeInventory, testBuildFridge, testBuildSerre, testBuildStations, testBuildVerger,
  testCompleteChapter, testEmptyBatteries, testFillBatteries, testFillTank, testGoToChapter, testNextSeason,
  testRipenAll, testSetBuildingLevel5, testSetHealthZero, testSetWear, testSkipAwake, testSleepNights,
  testUnlockAllTechs, testWearMill, testWoolReady,
} from '../engine/testmode.js';
import { formatCoins, formatNumber, formatPercent } from '../engine/format.js';
import { simulateFromCopy, simulationReach } from '../engine/bot.js';
import { state, testMode } from './store.js';
import { persistState } from './storage.js';
import { applyResult } from './game-actions.js';
import { syncJobs } from './loop.js';
import { refresh } from './render.js';
import { syncTestDeviceSelect } from './stage-windows.js';
import { itemsSummary } from './inventaire.js';
import { openWakeModal } from './reveil.js';
import { showToast } from './toasts.js';
import { registerActions } from './actions.js';

function actionTestNights(count) {
  const { report } = testSleepNights(state, count);
  syncJobs();
  persistState();
  refresh();
  if (report) openWakeModal(report);
}

/* ---------- Lot 10 : simulation d'un joueur automatique (mode test) ---------- */

const SIM_NIGHTS = 60;

// Courbe d'autonomie d'une simulation : la valeur de chaque nuit en gris, la
// moyenne mobile en couleur, la courbe cible de la conception en pointillés, et
// une bande rouge pour les nuits où un membre de la famille est à 0 de santé.
function simulationHtml(rows) {
  const S = DATA.SIMULATION;
  const W = 320, H = 150, left = 30, right = 8, top = 8, bottom = 22;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const first = rows[0].nuit;
  const last = rows[rows.length - 1].nuit;
  const span = Math.max(1, last - first);
  const x = (nuit) => left + plotW * ((nuit - first) / span);
  const y = (pct) => top + plotH * (1 - pct / 100);
  const smooth = rows.map((r, i) => {
    const w = rows.slice(Math.max(0, i - S.LISSAGE + 1), i + 1);
    return w.reduce((t, q) => t + q.autonomie, 0) / w.length;
  });
  const grid = [0, 25, 50, 75, 100]
    .map((g) => `<line class="chart-grid" x1="${left}" y1="${y(g).toFixed(1)}" x2="${W - right}" y2="${y(g).toFixed(1)}"/><text class="chart-label" x="${left - 4}" y="${(y(g) + 3).toFixed(1)}" text-anchor="end">${g}</text>`)
    .join('');
  const step = Math.max(1, Math.ceil(span / 6 / 5) * 5);
  const ticks = rows
    .filter((r) => (r.nuit - first) % step === 0)
    .map((r) => `<text class="chart-label" x="${x(r.nuit).toFixed(1)}" y="${H - 6}" text-anchor="middle">${r.nuit}</text>`)
    .join('');
  const death = rows
    .filter((r) => r.santeMin <= 0)
    .map((r) => `<rect class="chart-death" x="${(x(r.nuit) - plotW / span / 2).toFixed(1)}" y="${top}" width="${(plotW / span).toFixed(1)}" height="${plotH}"/>`)
    .join('');
  const raw = rows.map((r) => `${x(r.nuit).toFixed(1)},${y(r.autonomie).toFixed(1)}`).join(' ');
  const curve = rows.map((r, i) => `${x(r.nuit).toFixed(1)},${y(smooth[i]).toFixed(1)}`).join(' ');
  const goal = S.JALONS.filter((j) => j.nuit >= first && j.nuit <= last).map((j) => `${x(j.nuit).toFixed(1)},${y(j.pct).toFixed(1)}`).join(' ');
  const goalLine = goal.includes(' ') ? `<polyline class="chart-target" fill="none" points="${goal}"><title>Courbe cible de la conception (section 8.10)</title></polyline>` : '';
  const zero = rows.find((r) => r.santeMin <= 0);
  const reach = S.JALONS.map((j) => {
    const n = simulationReach(rows, j.pct);
    return `${j.pct} % : ${n === null ? 'pas atteint' : 'nuit ' + n}`;
  }).join(' · ');
  const final = smooth[smooth.length - 1];
  const summary = `Simulation de ${rows.length} nuits (nuits ${first} à ${last}) : autonomie finale ${formatPercent(final)} (moyenne sur ${S.LISSAGE} nuits) ; ${zero ? 'un membre de la famille tombe à 0 de santé dès la nuit ' + zero.nuit : 'aucune santé à 0'}.`;
  return `
    <strong>Joueur appliqué, ${rows.length} nuits</strong>
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${summary}">${grid}${death}<polyline class="chart-raw" points="${raw}"/>${goalLine}<polyline class="chart-curve" points="${curve}"/>${ticks}</svg>
    <p class="muted">Ligne colorée : moyenne sur ${S.LISSAGE} nuits · gris : chaque nuit · pointillés : courbe cible · bande rouge : santé à 0.</p>
    <p>${summary}</p>
    <p class="muted">Jalons (lissés) : ${reach}.</p>
    <p class="muted">Pièces à la fin : ${formatCoins(rows[rows.length - 1].pieces)} · conserves restantes : ${formatNumber(rows[rows.length - 1].conserves)} · soins payés : ${rows[rows.length - 1].soinsPayes}. Ta partie n'a pas été modifiée.</p>`;
}

// Le bouton travaille sur une copie de l'état : la partie en cours ne bouge pas.
function actionTestSimulate() {
  const rows = simulateFromCopy(state, 'applique', SIM_NIGHTS);
  const box = document.getElementById('sim-result');
  box.innerHTML = simulationHtml(rows);
  box.hidden = false;
  showToast(`Simulation de ${SIM_NIGHTS} nuits terminée`);
}

export function renderTestPanel() {
  const panel = document.getElementById('test-panel');
  panel.hidden = !testMode;
  if (!testMode) return;
  syncTestDeviceSelect();
  // Lot 11 : l'état complet n'est sérialisé que si le panneau est déplié.
  if (!panel.open) return;
  const dump = document.getElementById('state-dump');
  const text = JSON.stringify(state, null, 2);
  if (dump.textContent !== text) dump.textContent = text;
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'test-straw': () => {
    applyResult(testAddStraw(state));
  },
  'test-tech-points': () => {
    applyResult(testAddTechPoints(state, 10));
  },
  'test-level5': () => {
    const result = applyResult(testSetBuildingLevel5(state, document.getElementById('test-building').value));
    if (result.ok) showToast('Bâtiment au niveau 5.');
  },
  'test-techs': () => {
    applyResult(testUnlockAllTechs(state));
  },
  'test-next-season': () => {
    const result = applyResult(testNextSeason(state));
    showToast(`Saison : ${DATA.SAISONS.INFOS[result.saison].icone} ${DATA.SAISONS.INFOS[result.saison].nom} (nuit ${state.day})`);
  },
  'test-serre': () => {
    applyResult(testBuildSerre(state));
  },
  'test-verger': () => {
    applyResult(testBuildVerger(state));
  },
  'test-fridge': () => {
    applyResult(testBuildFridge(state));
  },
  'test-empty-batteries': () => {
    applyResult(testEmptyBatteries(state));
  },
  'test-sheep': () => {
    applyResult(testAddSheep(state));
  },
  'test-wool': () => {
    applyResult(testWoolReady(state));
  },
  'test-cows': () => {
    applyResult(testAddCows(state));
  },
  'test-stations': () => {
    applyResult(testBuildStations(state));
  },
  'test-flour': () => {
    applyResult(testAddFlour(state));
  },
  'test-oil': () => {
    applyResult(testAddOil(state));
  },
  'test-eggs': () => {
    applyResult(testAddEggs(state));
  },
  'test-wear-mill': () => {
    applyResult(testWearMill(state));
  },
  'test-wheat': () => {
    applyResult(testAddWheat(state));
  },
  'test-hens': () => {
    applyResult(testAddHens(state));
  },
  'test-food': () => {
    applyResult(testAddFood(state));
  },
  'test-age': () => {
    const result = applyResult(testAgeInventory(state));
    const lost = itemsSummary(result.perdus);
    showToast(lost ? `Périmés : ${lost}` : 'Rien n\'a péri.');
  },
  'test-seeds': () => {
    applyResult(testAddSeeds(state));
  },
  'test-ripen': () => {
    applyResult(testRipenAll(state));
  },
  'test-sick': () => {
    applyResult(testSetHealthZero(state));
  },
  'test-add-100': () => {
    applyResult(testAddPieces(state, 100));
  },
  'test-add-1000': () => {
    applyResult(testAddPieces(state, 1000));
  },
  'test-add-panel': () => {
    applyResult(testAddDevice(state, 'panneau'));
  },
  'test-add-battery': () => {
    applyResult(testAddDevice(state, 'batterie'));
  },
  'test-fill-batteries': () => {
    applyResult(testFillBatteries(state));
  },
  'test-fill-tank': () => {
    applyResult(testFillTank(state));
  },
  'test-wear': () => {
    applyResult(testSetWear(state, document.getElementById('test-device').value, DATA.WEAR.BREAKDOWN));
  },
  'test-skip-awake': () => {
    applyResult(testSkipAwake(state));
  },
  'test-complete-chapter': () => {
    const result = applyResult(testCompleteChapter(state));
    if (result.ok) showToast(result.fini ? '🏆 Campagne terminée' : `Chapitre ${result.chapitre} atteint`);
  },
  'test-goto-chapter': () => {
    const result = applyResult(testGoToChapter(state, document.getElementById('test-chapter').value));
    if (result.ok) showToast(result.fini ? '🏆 Mode libre : tout est débloqué' : `Chapitre ${result.chapitre}, compteurs remis à zéro`);
  },
  'test-simulate': () => {
    actionTestSimulate();
  },
  'test-nights-1': () => {
    actionTestNights(1);
  },
  'test-nights-5': () => {
    actionTestNights(5);
  },
});
