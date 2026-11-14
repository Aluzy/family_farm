import { DATA } from '../engine/catalog.js';
import { formatNumber } from '../engine/format.js';
import {
  actionCost, actionsLeft, energyLevel, energyMax, enduranceBonus, happinessCostPct, snackEnergy,
} from '../engine/stamina.js';
import { cibleBonheur, meublesBonheur } from '../engine/bonheur.js';
import { STYLES, styleInfo, styleMaison } from '../engine/styles.js';
import { state } from './store.js';
import { applyResult } from './game-actions.js';
import { executer } from './commandes.js';
import { notify } from './toasts.js';
import { registerActions } from './actions.js';

/* ---------- version 1.8 : l'énergie du personnage ---------- */

// Énergie en points, avec une décimale quand il le faut (« 1,5 »).
// FLU-23 : un coût s'affiche arrondi à l'entier supérieur (le calcul garde ses millièmes) ;
// un gain, à l'entier inférieur. Jamais de décimale.
export function formatEnergy(milli) {
  return formatNumber(Math.ceil(Math.round(milli) / 1000));
}

export function formatEnergyGain(milli) {
  return formatNumber(Math.floor(Math.round(milli) / 1000));
}

// Puce d'énergie des écrans d'action : énergie restante, et ce que coûte l'action
// principale de l'écran (`action`, une clé de DATA.PERSONNAGE.COUTS).
export function energyChip(action) {
  const e = energyLevel(state), max = energyMax(state) / 1000;
  const cost = action ? actionCost(state, action) : 0;
  const low = cost > 0 && actionsLeft(state, action) < 1;
  const title = cost > 0
    ? `Énergie : ${e} / ${max}. Cette action en coûte ${formatEnergy(cost)}.`
    : `Énergie : ${e} / ${max}.`;
  // FLU-23 : « ⚡ 100 · arroser : 1 », en mots
  return `<span class="chip${low ? ' warn' : ''}" title="${title}">⚡ ${e}${cost > 0 ? ` · ${ACTION_LABELS[action] || action} : ${formatEnergy(cost)}` : ''}</span>`;
}

// « 4 plats différents : +4, 6 : +8 »
function varieteTexte() {
  return Object.entries(DATA.BONHEUR.CIBLE.VARIETE || {}).map(([n, b], i) => `${i ? `${n} : ` : `${n} plats différents : `}+${b}`).join(', ');
}

// L'aménagement de la ferme (js/engine/styles.js) : les styles qu'on y trouve, et le bonus s'il est atteint.
function styleHtml() {
  const S = styleMaison(state), M = STYLES.MAISON;
  const liste = Object.entries(S.decor).sort((a, b) => b[1] - a[1]).map(([id, n]) => { const i = styleInfo(id); return `${i.icone} ${i.nom} ${n}`; }).join(' · ') || 'aucun encore';
  const etat = S.bonus ? `+${S.bonus} à la cible de bonheur (${S.complet ? `un style complet : ${styleInfo(S.complet).nom}` : `${S.varies.length} styles variés`})` : `+${M.BONUS} avec ${M.VARIETE} styles d'au moins ${M.PIECES} sortes de blocs, ou ${M.COMPLET} sortes d'un même style`;
  return `<span class="muted">🏡 L'aménagement (sortes de blocs par style) : ${liste}. ${etat}.</span>`;
}

export function energyDetailsHtml() {
  const P = DATA.PERSONNAGE, C = DATA.BONHEUR.CIBLE;
  const endu = enduranceBonus(state), enduMax = P.ENDURANCE * (DATA.NIVEAUX.SEUILS.length - 1);
  const reduc = 100 - happinessCostPct(state);
  const bonheur = reduc > 0 ? `tes actions coûtent ${reduc} % d'énergie en moins` : 'il ne change pas encore le coût de tes actions';
  // la cible de cette nuit, avec ce que la famille a déjà mangé aujourd'hui
  const cible = Math.round(cibleBonheur(state, (state.repasJour && state.repasJour.mange) || {}));
  const meubles = meublesBonheur(state);
  const costs = Object.entries(P.COUTS).map(([a]) => `${ACTION_LABELS[a] || a} ${formatEnergy(actionCost(state, a))}`).join(' · ');
  return `
    <div class="card">
      <span class="card-title"><span>⚡ L'énergie en détail</span></span>
      <span class="muted">Chaque action au clic en dépense ; à 0, plus d'action jusqu'à un en-cas ou une nuit de sommeil (elle remonte peu à peu en dormant). Ce qui tourne seul (automatisations, ateliers, panneau) n'en coûte pas.</span>
      <span>😊 Bonheur de la famille : ${bonheur}.</span>
      <span class="muted">Chaque nuit, il fait ${C.VITESSE} % du chemin vers sa cible : ${cible} cette nuit (${C.BASE}, plus les plats différents du jour, plus ${varieteTexte()} pour une table variée, plus ${meubles} pour les meubles, au plus ${C.MEUBLES_MAX}). Qui a eu faim vise un peu plus bas (${C.FAIM}), qui dort sans paillasse aussi.</span>
      ${styleHtml()}
      <span class="muted">Ce que coûte chaque action maintenant : ${costs}. Bonheur, technologies et équipement se cumulent, jamais sous ${P.PLANCHER} % du coût de base.</span>
      <span class="level-line"><span>💪 Endurance : avec ton niveau, ta jauge d'énergie monte à ${P.MAX + endu}</span><span class="num">+${endu}</span></span>
      <span class="bar" role="progressbar" aria-label="Endurance" aria-valuemin="0" aria-valuemax="${enduMax}" aria-valuenow="${endu}"><span class="bar-fill" style="width:${enduMax > 0 ? Math.round((endu * 100) / enduMax) : 0}%"></span></span>
      <span class="muted">Au réveil, l'énergie remonte à ${P.REVEIL_BASE} % de la jauge, + ${P.REVEIL_REPAS} % × la jauge de faim moyenne du reste de la famille au coucher (famille rassasiée : la jauge pleine). Un aliment mangé dans la journée, depuis l'Inventaire, rend son énergie ÷ ${P.MANGER_DIVISEUR}, + ${P.MANGER_BONUS} %, arrondie au-dessus.</span>
    </div>`;
}

const ACTION_LABELS = {
  planter: 'planter', arroser: 'arroser', recolter: 'récolter', tondre: 'tondre',
  cuisiner: 'cuisiner', cuireFour: 'cuire au four', moudre: 'moudre (par blé)', presser: 'presser',
};

// Bouton « Manger » d'un aliment de l'Inventaire (ce qu'il rendrait).
export function eatButton(item, texte = '') {
  const def = DATA.OBJETS[item];
  if (!def || !def.mangeable) return '';
  const gain = snackEnergy(state, item);
  return `<button type="button" class="btn" data-action="eat" data-item="${item}" title="Manger : +${formatEnergyGain(gain)} énergie">🍴 ${texte ? `${texte} · ` : ''}+${formatEnergyGain(gain)} ⚡</button>`;
}

/* ---------- actions de cet écran (voir ui/actions.js) ---------- */

registerActions({
  'eat': (target) => {
    // (I9b : en ligne, son personnage hors de la ferme : il ne mange que ce que contient son sac, js/ui/en-ligne.js)
    const dehors = typeof window !== 'undefined' && !!(window.FermeEnLigne && window.FermeEnLigne.dehors);
    const r = applyResult(executer('manger', { objet: target.dataset.item || null, ...(dehors ? { dehors: true } : {}) }));
    // fiche 10 : manger plusieurs fois de suite additionne l'énergie dans une seule notification
    if (r && r.ok) notify(null, { cumul: { cle: 'manger', quantites: { gain: r.gain }, texte: (t) => `⚡ +${formatEnergyGain(t.gain)} énergie` } });
  },
});
