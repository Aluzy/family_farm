import { DATA } from './catalog.js';
import { levelReached } from './levels.js';
import { techFlag } from './techtree.js';
import { averageHappiness } from './ville.js';

/* ---------- version 1.8 (v2, lot 4) : l'énergie du personnage ---------- */

// state.energie : la jauge du personnage, en millièmes (0 à PERSONNAGE.MAX × 1 000).
// Elle remplace la santé : chaque action au clic en coûte, le sommeil et les repas
// la remplissent. Les automatisations, les ateliers qui tournent seuls et les
// achats ne coûtent rien.

const MILLE = 1000;

export function energyMax() {
  return DATA.PERSONNAGE.MAX * MILLE;
}

// Énergie entière affichée (arrondie vers le bas).
export function energyLevel(state) {
  return Math.floor((Number(state.energie) || 0) / MILLE);
}

// Réduction d'endurance (%) : ENDURANCE points par niveau au-delà du premier.
export function enduranceReduction(state) {
  return DATA.PERSONNAGE.ENDURANCE * (levelReached(state) - 1);
}

// Part du coût que le bonheur laisse (%) : 100 à bonheur 0, 50 à bonheur 100.
export function happinessCostPct(state) {
  return 100 - Math.floor((averageHappiness(state) * DATA.PERSONNAGE.BONHEUR_REDUCTION) / 100);
}

// Coût réel d'une action (millièmes), arrondi au millième supérieur ; 0 pour une
// action qui ne coûte rien.
export function actionCost(state, action, n = 1) {
  const base = (DATA.PERSONNAGE.COUTS[action] || 0) * n * MILLE;
  if (!base) return 0;
  const pct = happinessCostPct(state) * (100 - enduranceReduction(state));
  return Math.ceil((base * pct) / 10000);
}

// Le personnage a-t-il assez d'énergie pour cette action ?
export function canAfford(state, action, n = 1) {
  return (Number(state.energie) || 0) >= actionCost(state, action, n);
}

export const TIRED = 'Plus assez d\'énergie : mange quelque chose ou va dormir.';

// Retire le coût de l'action (à appeler une fois l'action faite).
export function spendEnergy(state, action, n = 1) {
  state.energie = Math.max(0, (Number(state.energie) || 0) - actionCost(state, action, n));
}

// Combien de fois l'action peut encore être faite avec l'énergie restante.
export function actionsLeft(state, action) {
  const c = actionCost(state, action);
  return c > 0 ? Math.floor((Number(state.energie) || 0) / c) : Infinity;
}

// Énergie au réveil (millièmes) selon la couverture du repas du soir (0 à 100 %),
// plus le bonus de l'arbre (Bon sommeil), jusqu'au maximum.
export function wakeEnergy(state, couverture) {
  const P = DATA.PERSONNAGE;
  const pts = P.REVEIL_BASE + Math.floor((P.REVEIL_REPAS * Math.max(0, Math.min(100, couverture))) / 100) + (techFlag(state, 'reveilEnergie') || 0);
  return Math.min(energyMax(), pts * MILLE);
}

// Étape du réveil : l'énergie remonte à wakeEnergy() si elle était plus basse.
export function restoreEnergy(state, couverture) {
  state.energie = Math.max(Number(state.energie) || 0, wakeEnergy(state, couverture));
  return state.energie;
}

// Énergie (millièmes) que rend un aliment mangé en journée : calories ÷ MANGER_DIVISEUR,
// +50 % avec le Goûter de l'arbre (en %).
export function snackEnergy(state, item) {
  const def = DATA.items[item];
  if (!def || !def.edible) return 0;
  const pct = techFlag(state, 'gouter') || 100;
  return Math.floor((def.energie * MILLE * pct) / (DATA.PERSONNAGE.MANGER_DIVISEUR * 100));
}
