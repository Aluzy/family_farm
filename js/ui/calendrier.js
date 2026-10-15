import { DATA } from '../engine/catalog.js';
import { dayOfMonth, monthIndex, monthName, moonPhase, yearNumber } from '../engine/lune.js';
import { formatDay, weekdayName } from '../engine/format.js';
import { state } from './store.js';

/* ---------- le calendrier lunaire (carte en haut à droite › Calendrier) ---------- */

// Ce que fait une phase de la lune aux cultures, en mots (valeurs de data/crops.json, LUNE).
export function moonEffect(phase) {
  const L = DATA.LUNE;
  switch (phase.id) {
    case 'croissante': return `une plante arrosée a ${L.POUSSE_CHANCE} % de chances de pousser de 2 stades`;
    case 'pleine': return `les récoltes rendent ${L.RECOLTE_PLEINE - 100} % de plus`;
    case 'decroissante': return `un arrosage coûte ${100 - L.EAU_DECROISSANTE} % d'eau en moins`;
    case 'nouvelle': return L.POUSSE_NOUVELLE > 0 ? `les plantes arrosées gagnent ${L.POUSSE_NOUVELLE} stade` : 'les cultures ne poussent pas la nuit';
    default: return '';
  }
}

// Le mois en cours : une case par jour (le mois commence un lundi), sa phase de lune, le jour
// d'aujourd'hui en avant ; dessous, les phases et leur effet sur les cultures.
export function renderCalendrier() {
  const L = DATA.LUNE;
  const today = state.day;
  const debut = today - dayOfMonth(today) + 1;
  const phase = moonPhase(today);
  const tetes = Array.from({ length: 7 }, (_, k) => `<span class="cal-head" aria-hidden="true">${weekdayName(debut + k, true).slice(0, 1)}</span>`).join('');
  const cases = Array.from({ length: L.JOURS_MOIS }, (_, k) => {
    const d = debut + k;
    const p = moonPhase(d);
    const cls = d === today ? ' today' : d < today ? ' past' : '';
    return `<span class="cal-day${cls}" title="${formatDay(d)} : ${p.nom}"${d === today ? ' aria-current="date"' : ''}><span class="num">${k + 1}</span><span aria-hidden="true">${p.icone}</span><span class="visually-hidden">${weekdayName(d)}, ${p.nom}</span></span>`;
  }).join('');
  const phases = L.PHASES.map((p) => `<li class="cal-phase${p.id === phase.id ? ' current' : ''}"><span aria-hidden="true">${p.icone}</span><span><strong>${p.nom}</strong> (${p.jours} jours) : ${moonEffect(p)}.</span></li>`).join('');
  const reste = L.JOURS_MOIS - dayOfMonth(today) + 1;
  const suivant = L.MOIS[(monthIndex(today) + 1) % L.MOIS.length];
  return `
    <div class="card calendrier">
      <span class="card-title"><span>${monthName(today)} · an ${yearNumber(today)}</span></span>
      <span>Aujourd'hui : <strong>${formatDay(today)}</strong>, ${phase.icone} ${phase.nom.toLowerCase()}.</span>
      <div class="cal-grid" role="group" aria-label="${monthName(today)}">${tetes}${cases}</div>
      <ul class="cal-phases">${phases}</ul>
      <span class="muted">Un mois dure ${L.JOURS_MOIS} jours, une lunaison. ${suivant} commence ${reste > 1 ? `dans ${reste} jours` : 'demain'}.</span>
    </div>`;
}
