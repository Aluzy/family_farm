import { DATA } from '../engine/catalog.js';
import { findDevice } from '../engine/devices.js';
import { wakeSummary } from '../engine/night.js';
import {
  formatLitres, formatNumber, formatPercent, formatQty, formatSigned, formatWh,
} from '../engine/format.js';
import { state } from './store.js';
import { tel } from './consent.js';
import { deviceName } from './ferme.js';
import { formatStraw } from './elevage.js';
import { memberNameHtml } from './famille.js';
import { itemsSummary } from './inventaire.js';
import { registerActions } from './actions.js';
import { costLabel, plural } from './common.js';

// Lignes du réveil pour les automatisations (Lot 7) : ce qui a été fait, puis ce qui a manqué.
function autoLines(a) {
  if (!a || !(a.potager || a.serre || a.poulailler || a.tondus)) return [];
  const done = [];
  if (a.potager || a.serre) done.push(`💧 ${plural(a.arrosees, 'parcelle')} arrosée${a.arrosees > 1 ? 's' : ''}`);
  const harvested = itemsSummary(a.recoltes || {});
  if (harvested) done.push(`🧺 ${harvested}`);
  if (a.semees > 0) done.push(`🌱 ${plural(a.semees, 'semis')}`);
  if (a.montees > 0) done.push(`🥕 ${plural(a.montees, 'parcelle')} laissée${a.montees > 1 ? 's' : ''} à monter en graine`);
  if (a.poulailler) done.push(`🌾 ${plural(a.nourries, 'poule')} nourrie${a.nourries > 1 ? 's' : ''}`);
  if (a.tondus > 0) done.push(`✂️ ${plural(a.tondus, 'mouton')} tondu${a.tondus > 1 ? 's' : ''}`);
  const lines = [`<li>🤖 Automatisations : <strong>${done.join(' · ')}</strong></li>`];
  if (a.sansEau > 0) lines.push(`<li class="alert">💧 Eau insuffisante : ${plural(a.sansEau, 'parcelle')} non arrosée${a.sansEau > 1 ? 's' : ''} cette nuit.</li>`);
  if (a.sansBle > 0) lines.push(`<li class="alert">🌾 Blé insuffisant : ${plural(a.sansBle, 'poule')} non nourrie${a.sansBle > 1 ? 's' : ''}, pas d'œuf.</li>`);
  if (a.attendent > 0) lines.push(`<li>⏳ ${plural(a.attendent, 'parcelle')} mûre${a.attendent > 1 ? 's' : ''} en attente de graines pour être replantée${a.attendent > 1 ? 's' : ''}.</li>`);
  if (a.sansGraine > 0) lines.push(`<li class="alert">🌱 Pas de graine au-delà de la réserve : ${plural(a.sansGraine, 'parcelle')} laissée${a.sansGraine > 1 ? 's' : ''} vide${a.sansGraine > 1 ? 's' : ''}.</li>`);
  return lines;
}

// Version 1.1 : la nuit à l'Étable. Qui a mangé, la laine prête, le lait donné,
// la paille qui a manqué cette nuit et celle qui manque pour la nuit prochaine.
// (Un compte rendu d'avant la version 1.1 n'a pas de champ `etable`.)
function stableLines(report) {
  const lines = [];
  const e = report.etable || null;
  const straw = DATA.items[DATA.PATURAGE.nourriture].icone;
  if (report.moutons > 0) {
    const fed = e ? ` · nourris : <strong class="num">${e.moutonsNourris} / ${e.moutons}</strong>` : '';
    lines.push(`<li>🐑 Moutons : <strong class="num">${report.moutons}</strong>${fed}${report.lainePrete > 0 ? ` · 🧶 Laine prête : <strong class="num">${report.lainePrete}</strong> mouton${report.lainePrete > 1 ? 's' : ''} à tondre` : ''}</li>`);
  }
  if (report.vaches > 0) {
    const fed = e ? ` · nourries : <strong class="num">${e.vachesNourries} / ${e.vaches}</strong>` : '';
    lines.push(`<li>🐄 Vaches : <strong class="num">${report.vaches}</strong>${fed} · 🥛 Lait : <strong class="num">${formatNumber(report.lait)}</strong></li>`);
  }
  if (e && e.paille > 0) lines.push(`<li>${straw} Paille mangée cette nuit : <strong class="num">${formatNumber(e.paille)}</strong></li>`);
  if (e && e.manque > 0) {
    const sans = (e.moutons - e.moutonsNourris) + (e.vaches - e.vachesNourries);
    lines.push(`<li class="alert">${straw} Il a manqué ${formatStraw(e.manque)} cette nuit : ${plural(sans, 'animal').replace('animals', 'animaux')} n'${sans > 1 ? 'ont' : 'a'} pas mangé, donc pas de laine ni de lait pour ${sans > 1 ? 'eux' : 'lui'}. Rien d'autre ne leur arrive.</li>`);
  }
  if (typeof report.pailleBesoin === 'number' && report.pailleBesoin > report.paille) {
    lines.push(`<li class="alert">${straw} Il manque de la paille pour la nuit prochaine : ${formatNumber(report.paille)} en stock, il en faut ${formatNumber(report.pailleBesoin)}. Mouds du blé au Moulin.</li>`);
  }
  return lines;
}

// Lot 8 : fruits du verger et nuit du frigo.
function orchardFridgeLines(report) {
  const lines = [];
  const fruits = itemsSummary(report.fruits || {});
  if (fruits) lines.push(`<li>🌳 Fruits du verger : <strong>${fruits}</strong></li>`);
  const f = report.frigo;
  if (f && f.construit) {
    lines.push(`<li>🧊 Frigo : <strong class="num">${formatWh(f.mwh)}</strong> prélevés pour la nuit · ${f.unites} unité${f.unites > 1 ? 's' : ''} au frais</li>`);
    if (f.panne) lines.push('<li class="alert">⚠️ Panne de froid cette nuit : batteries insuffisantes (ou frigo éteint).</li>');
    if (f.vieillis) lines.push('<li class="alert">⚠️ Le frigo n\'a pas assez tenu : chaque lot a perdu une nuit de conservation.</li>');
    else if (!f.couvreLaNuit) lines.push('<li class="alert">⚠️ La batterie ne couvrira pas la prochaine nuit du frigo.</li>');
  }
  return lines;
}

export function openWakeModal(report, auto = false) {
  tel('modal', 'wake');
  const root = document.getElementById('modal-root');
  const line = (d, text) => {
    const dev = findDevice(state, d.id);
    return `<li>${text.replace('{nom}', dev ? deviceName(dev) : d.id).replace('{usure}', formatNumber(d.usure))}</li>`;
  };
  const problems = [
    ...report.enPanne.map((d) => line(d, '⛔ {nom} : en panne, à réparer.')),
    ...report.aEntretenir.map((d) => line(d, '⚠️ {nom} : à entretenir (usure {usure} %).')),
  ];
  const eaten = itemsSummary(report.mange);
  const spoiled = itemsSummary(report.perimes);
  const expiring = itemsSummary(report.aPerimer);
  const shownEnergy = Math.min(report.energieMangee, report.besoin);
  const covered = report.couverture;
  const ready = report.pretes.length
    ? report.pretes
        .map((r) => `${r.nombre} ${DATA.crops[r.culture].icone} ${DATA.crops[r.culture].nom.toLowerCase()}${r.montee ? ' (graines)' : ''}`)
        .join(', ')
    : '';
  const family = [
    `<li>🍽️ Énergie mangée : <strong class="num">${formatNumber(shownEnergy)} / ${formatNumber(report.besoin)}</strong> (${covered} %)${eaten ? ` — ${eaten}` : ''}</li>`,
    `<li>🌿 Autonomie de la nuit : <strong class="num">${formatPercent(report.autonomie)}</strong> (${formatNumber(report.energieProduit)} énergie produite par la ferme sur ${formatNumber(report.besoin)})</li>`,
    `<li>❤️ Santé moyenne : <strong class="num">${formatNumber(report.santeAvant)} → ${formatNumber(report.santeApres)}</strong> (${formatSigned(report.santeApres - report.santeAvant)})${report.bonusPlats > 0 ? ` · bonus des plats : +${report.bonusPlats}` : ''}</li>`,
    Object.keys(report.termine).length ? `<li>🍳 Terminé pendant la nuit : <strong>${itemsSummary(report.termine)}</strong></li>` : '',
    // Le compte rendu porte des identifiants ; le prénom est lu ici, et échappé.
    ...report.nouveauxMalades.map((id) => `<li class="alert">🤒 ${memberNameHtml(id) || 'Quelqu\'un'} est malade : un soin est nécessaire.</li>`),
    report.poules > 0 || report.oeufs > 0
      ? `<li>🥚 Œufs pondus : <strong class="num">${formatNumber(report.oeufs)}</strong> · 🌾 Blé consommé par les poules : <strong class="num">${formatQty(report.bleConsomme)}</strong></li>`
      : '',
    ...stableLines(report),
    ...autoLines(report.auto),
    report.pluie > 0 ? `<li>🌧️ Eau de pluie récupérée : <strong class="num">${formatNumber(report.pluie)} L</strong></li>` : '',
    ...(report.entretiens || []).map((e) => { const d = findDevice(state, e.id); return `<li>🛠️ Entretien automatique : ${d ? deviceName(d) : e.id} (${costLabel(e.cost)})</li>`; }),
    ...orchardFridgeLines(report),
    ready ? `<li>🧺 Récoltes prêtes : <strong>${ready}</strong></li>` : '<li>🌱 Aucune récolte prête pour l\'instant.</li>',
    spoiled ? `<li class="alert">🗑️ Aliments périmés cette nuit : <strong>${spoiled}</strong></li>` : '<li>✅ Rien n\'a péri cette nuit.</li>',
    expiring ? `<li>⏳ À manger vite, périme à la prochaine nuit : <strong>${expiring}</strong></li>` : '',
  ];
  // Résumé allégé : autonomie, santé, récolte de la nuit. Tout le reste (ancien contenu du
  // réveil, inchangé) est dans « Voir plus ».
  const w = wakeSummary(report);
  const harvestName = (r) => `<span aria-hidden="true">${DATA.items[r.item].icone}</span> ${DATA.items[r.item].nom.toLowerCase()} ×${formatNumber(r.qte)}`;
  const harvestLine = w.recolte.affiches.length
    ? w.recolte.affiches.map(harvestName).join(', ') + (w.recolte.reste.length ? ` <span class="muted">+ ${w.recolte.reste.length} autre${w.recolte.reste.length > 1 ? 's' : ''}</span>` : '')
    : '<span class="muted">Rien récolté cette nuit</span>';
  const fullHarvest = w.recolte.reste.length
    ? `<li>🧺 Récolte complète de la nuit : <strong>${[...w.recolte.affiches, ...w.recolte.reste].map(harvestName).join(', ')}</strong></li>`
    : '';
  root.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="wake-title" data-stop-propagation>
        <h2 id="wake-title">🌅 Réveil : nuit ${report.nuit}</h2>
        <p class="muted wake-hour">${auto ? `Il était ${DATA.TIME.NIGHT_HOUR}&nbsp;h : la famille est allée se coucher. ` : ''}Il est ${DATA.TIME.DAY_START_HOUR}&nbsp;h. La journée commence quand tu fermes ce résumé.</p>
        <div class="wake-kpis">
          <div class="wake-kpi"><span class="muted">🌿 Autonomie</span><strong class="num">${formatPercent(w.autonomie)}</strong></div>
          <div class="wake-kpi"><span class="muted">❤️ Santé</span><strong class="num">${formatPercent(w.sante)}</strong></div>
        </div>
        <p class="wake-harvest"><strong>🧺 Récolte</strong> : ${harvestLine}</p>
        <div id="wake-detail" hidden>
          <ul class="report-list">
            ${fullHarvest}
            ${family.join('')}
            <li>⚡ Énergie stockée : <strong class="num">${formatNumber(Math.floor(report.energie / 1000))} / ${formatWh(report.capacite)}</strong></li>
            <li>💧 Eau disponible : <strong class="num">${formatNumber(Math.floor(report.eau / 1000))} / ${formatLitres(report.capaciteEau)}</strong></li>
            ${report.energiePerdue >= 1000 ? `<li>☀️ Énergie perdue pendant la journée (batteries pleines) : <strong class="num">${formatWh(report.energiePerdue)}</strong></li>` : ''}
            ${problems.length ? problems.join('') : '<li>✅ Tous les appareils sont en bon état.</li>'}
          </ul>
        </div>
        <div class="row wake-actions">
          <button type="button" class="btn btn-pill" data-action="wake-more" id="wake-more" aria-expanded="false" aria-controls="wake-detail">Voir plus</button>
          <button type="button" class="btn primary btn-pill" data-action="close-modal" id="wake-close">Bonne journée</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('wake-close').focus();
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'wake-more': (target) => {
    const detail = document.getElementById('wake-detail');
    if (!detail) return;
    const open = detail.hidden; // hidden = replié : on ouvre
    detail.hidden = !open;
    target.setAttribute('aria-expanded', String(open));
    target.textContent = open ? 'Voir moins' : 'Voir plus';
  },
});
