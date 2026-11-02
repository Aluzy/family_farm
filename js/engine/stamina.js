import { DATA } from './catalog.js';
import { levelReached } from './levels.js';
import { techEffects, techFlag } from './techtree.js';
import { averageHappiness } from './bonheur.js';
import { noter } from './journal.js';
import { valeurAliment } from './repas.js';
import { economiePct } from './equipement.js';

/* ---------- version 1.8 (v2, lot 4) : l'énergie du personnage ---------- */

// state.energie : la jauge du personnage, en millièmes (0 à energyMax(state)).
// Elle remplace la santé : chaque action au clic en coûte, le sommeil et les repas
// la remplissent. Les automatisations, les ateliers qui tournent seuls et les
// achats ne coûtent rien.

const MILLE = 1000;

// Endurance : les points d'énergie que le niveau ajoute à la jauge (ENDURANCE par niveau au-delà
// du premier). Sans état : 0.
export function enduranceBonus(state) {
  return state ? DATA.PERSONNAGE.ENDURANCE * (levelReached(state) - 1) : 0;
}

// La jauge pleine (millièmes) : MAX + l'endurance.
export function energyMax(state) {
  return (DATA.PERSONNAGE.MAX + enduranceBonus(state)) * MILLE;
}

// Énergie entière affichée (arrondie vers le bas).
export function energyLevel(state) {
  return Math.floor((Number(state.energie) || 0) / MILLE);
}

// Part du coût que le bonheur laisse (%) : 100 à bonheur 0, 50 à bonheur 100.
export function happinessCostPct(state) {
  return 100 - Math.floor((averageHappiness(state) * DATA.PERSONNAGE.BONHEUR_REDUCTION) / 100);
}

// Coût réel d'une action (millièmes), arrondi au millième supérieur ; 0 pour une
// action qui ne coûte rien. Bonheur, Arbre des technologies et équipement se cumulent, sans
// descendre sous PERSONNAGE.PLANCHER % du coût de base.
export function actionCost(state, action, n = 1) {
  const base = (DATA.PERSONNAGE.COUTS[action] || 0) * n * MILLE;
  if (!base) return 0;
  // arbre des technologies (branche Outils) : economie = { action: % en moins }, cumulés
  const outils = techEffects(state, 'economie').reduce((m, e) => (e[action] ? (m * (100 - e[action])) / 100 : m), 100);
  // fiche 11 : l'équipement du personnage principal (gants, tablier, chapeau au soleil…), en % aussi
  const equipe = economiePct(state, action);
  const pct = (happinessCostPct(state) * outils * equipe) / 10000;
  return Math.ceil((base * Math.max(DATA.PERSONNAGE.PLANCHER, pct)) / 100);
}

// Le personnage a-t-il assez d'énergie pour cette action ?
export function canAfford(state, action, n = 1) {
  return (Number(state.energie) || 0) >= actionCost(state, action, n);
}

export const TIRED = 'Plus assez d\'énergie : mange quelque chose ou va dormir.';

// Retire le coût de l'action (à appeler une fois l'action faite).
export function spendEnergy(state, action, n = 1) {
  const cout = actionCost(state, action, n);
  state.energie = Math.max(0, (Number(state.energie) || 0) - cout);
  if (cout) noter('energie', { action, mille: cout });
}

// Combien de fois l'action peut encore être faite avec l'énergie restante.
export function actionsLeft(state, action) {
  const c = actionCost(state, action);
  return c > 0 ? Math.floor((Number(state.energie) || 0) / c) : Infinity;
}

// Énergie au réveil (millièmes) : REVEIL_BASE + REVEIL_REPAS × la jauge moyenne de la famille au
// coucher (0 à 100 %, repas.js : jaugeFamille), en % de la jauge pleine, plus le bonus de l'arbre
// (Bon sommeil, en points), jusqu'au maximum.
export function wakeEnergy(state, couverture) {
  const P = DATA.PERSONNAGE;
  const pct = P.REVEIL_BASE + (P.REVEIL_REPAS * Math.max(0, Math.min(100, couverture))) / 100;
  const max = energyMax(state);
  return Math.min(max, Math.floor((max * pct) / 100 / MILLE) * MILLE + (techFlag(state, 'reveilEnergie') || 0) * MILLE);
}

// Étape du réveil : l'énergie remonte à wakeEnergy() si elle était plus basse.
export function restoreEnergy(state, couverture) {
  state.energie = Math.max(Number(state.energie) || 0, wakeEnergy(state, couverture));
  return state.energie;
}

// Énergie (millièmes) que rend un aliment mangé en journée : sa valeur (repas.js,
// valeurAliment), +50 % avec le Goûter de l'arbre (en %).
export function snackEnergy(state, item) {
  const def = DATA.OBJETS[item];
  if (!def || !def.mangeable) return 0;
  const pct = techFlag(state, 'gouter') || 100;
  return Math.floor((valeurAliment(item) * MILLE * pct) / 100);
}
