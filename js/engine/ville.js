import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { fail, spend } from './devices.js';
import { addLot } from './inventory.js';
import { buyItem } from './market.js';
import { awakeMsAtHour, hourOfDay } from './clock.js';
import { flowStep, wearStep } from './energy.js';
import { refreshUnlocks } from './techtree.js';
import { noteEnergyRecord, updateChapters } from './campaign.js';
import { currentSeason } from './seasons.js';

/* ---------- version 1.5 : bonheur, sorties et marché de la ville (data/ville.json) ---------- */

export function newVille() {
  return { faits: {}, marche: 0 }; // faits : { sortie: jour où elle a été faite } ; marche : jour d'ouverture
}

// Bonheur d'un membre (0 à MAX) ; une ancienne sauvegarde sans bonheur part de DEPART.
export function memberHappiness(m) {
  return typeof m.bonheur === 'number' ? m.bonheur : DATA.VILLE.BONHEUR.DEPART;
}

function setHappiness(m, value) {
  m.bonheur = Math.max(0, Math.min(DATA.VILLE.BONHEUR.MAX, Math.round(value)));
}

// Bonheur moyen de la famille (brut, pour l'affichage).
export function averageHappiness(state) {
  const m = state.famille.membres;
  return m.length ? Math.round(m.reduce((t, x) => t + memberHappiness(x), 0) / m.length) : 0;
}

// Multiplicateur de productivité (%) du bonheur moyen des membres bien portants (les malades
// pèsent déjà sur la productivité par la santé). Personne de bien portant : sans effet.
export function happinessProductivity(state) {
  const m = state.famille.membres.filter((x) => !x.malade);
  if (!m.length) return 100;
  const avg = m.reduce((t, x) => t + memberHappiness(x), 0) / m.length;
  for (const tier of DATA.VILLE.BONHEUR.PRODUCTIVITE) {
    if (avg >= tier.min) return tier.pct;
  }
  return 100;
}

// Variation de bonheur d'un repas : REPAS_CRU tout cru, jusqu'à REPAS_CRU + REPAS_PLATS tout
// cuisiné (au prorata de l'énergie venue des plats), FAIM en plus si le besoin n'est pas couvert.
export function mealHappinessDelta(plan) {
  const B = DATA.VILLE.BONHEUR;
  let plats = 0;
  let total = 0;
  for (const [item, n] of Object.entries(plan.mange || {})) {
    const e = DATA.items[item].energie * n;
    total += e;
    if (DATA.items[item].plat) plats += e;
  }
  const part = total > 0 ? plats / total : 0;
  return Math.round(B.REPAS_CRU + B.REPAS_PLATS * part) + (plan.couverture < 100 ? B.FAIM : 0);
}

// Applique la variation du repas à toute la famille ; renvoie la variation.
export function applyMealHappiness(state, plan) {
  const delta = mealHappinessDelta(plan);
  for (const m of state.famille.membres) setHappiness(m, memberHappiness(m) + delta);
  return delta;
}

/* ---------- sorties ---------- */

function ville(state) {
  if (!state.ville || typeof state.ville !== 'object') state.ville = newVille();
  if (!state.ville.faits || typeof state.ville.faits !== 'object') state.ville.faits = {};
  return state.ville;
}

// Les membres qui partent : tous sauf les malades.
export function outingMembers(state) {
  return state.famille.membres.filter((m) => !m.malade);
}

// Prix d'une sortie pour les membres qui partent (un enfant paie ENFANT_PRIX %).
export function outingCost(state, id) {
  const s = DATA.VILLE.SORTIES[id];
  if (!s) return 0;
  return outingMembers(state).reduce((t, m) => t + (m.enfant ? Math.ceil((s.prix * DATA.VILLE.ENFANT_PRIX) / 100) : s.prix), 0);
}

// Ce que rapporte une sortie aujourd'hui (le butin de la saison s'il y en a un).
export function outingLoot(state, id) {
  const s = DATA.VILLE.SORTIES[id];
  if (!s) return {};
  if (s.saisons) return { ...(s.saisons[currentSeason(state)] || {}) };
  return { ...(s.butin || {}) };
}

// Heure de retour d'une sortie partie maintenant (avec les minutes, ex. 13,5).
function returnHour(state, heures) {
  const perHour = DATA.TIME.CLOCK_SECONDS_PER_HOUR * 1000;
  return DATA.TIME.DAY_START_HOUR + state.awakeMs / perHour + heures;
}

// Peut-on partir ? { ok, raison } ; raison : 'faite', 'tard', 'enfants', 'personne', 'pieces'.
export function outingStatus(state, id) {
  const s = DATA.VILLE.SORTIES[id];
  if (!s) return { ok: false, raison: 'inconnue', texte: 'Sortie inconnue.' };
  const v = ville(state);
  if (v.faits[id] === state.day) return { ok: false, raison: 'faite', texte: 'Déjà fait aujourd\'hui.' };
  if (returnHour(state, s.heures) > DATA.TIME.NIGHT_HOUR + EPS) return { ok: false, raison: 'tard', texte: `Trop tard : il faut ${s.heures} h, retour avant ${DATA.TIME.NIGHT_HOUR} h.` };
  const partants = outingMembers(state);
  if (!partants.length) return { ok: false, raison: 'personne', texte: 'Personne n\'est en état de sortir.' };
  if (s.enfants && !partants.some((m) => m.enfant)) return { ok: false, raison: 'enfants', texte: 'Il faut un enfant à emmener.' };
  if (state.pieces + EPS < outingCost(state, id)) return { ok: false, raison: 'pieces', texte: 'Pas assez de pièces.' };
  return { ok: true, raison: '', texte: '' };
}

// Le temps passe pendant `heures` heures, comme si on attendait : panneaux, batteries,
// pompe, ateliers et usure (par pas d'une seconde). Ni repas ni nuit ici : l'interface
// les déclenche à l'heure, comme d'habitude, au retour.
export function advanceHours(state, heures) {
  let left = Math.round(heures * DATA.TIME.CLOCK_SECONDS_PER_HOUR * 1000);
  while (left > 0) {
    const dt = Math.min(1000, left);
    flowStep(state, dt);
    wearStep(state, dt);
    state.awakeMs += dt;
    noteEnergyRecord(state);
    left -= dt;
  }
  refreshUnlocks(state);
  updateChapters(state);
}

// Part en sortie : paie, fait passer le temps, puis bonheur et butin.
export function goOut(state, id) {
  const st = outingStatus(state, id);
  if (!st.ok) return fail(st.texte);
  const s = DATA.VILLE.SORTIES[id];
  const cost = outingCost(state, id);
  const partants = outingMembers(state);
  spend(state, cost);
  ville(state).faits[id] = state.day;
  advanceHours(state, s.heures);
  const gains = {};
  for (const m of partants) {
    const avant = memberHappiness(m);
    setHappiness(m, avant + s.bonheur[m.enfant ? 'enfant' : 'adulte']);
    gains[m.id] = m.bonheur - avant;
  }
  const butin = outingLoot(state, id);
  for (const [item, n] of Object.entries(butin)) if (n > 0) addLot(state, item, n, DATA.ORIGINE.ACHETE);
  state.jour.sorties = (state.jour.sorties || 0) + 1;
  return { ok: true, cost, heures: s.heures, butin, gains, retour: hourOfDay(state) };
}

/* ---------- marché de la ville ---------- */

export function townMarketOpen(state) {
  return ville(state).marche === state.day;
}

export function townMarketStatus(state) {
  const M = DATA.VILLE.MARCHE;
  if (townMarketOpen(state)) return { ok: false, raison: 'ouvert', texte: 'Déjà au marché aujourd\'hui.' };
  if (returnHour(state, M.HEURES) > DATA.TIME.NIGHT_HOUR + EPS) return { ok: false, raison: 'tard', texte: `Trop tard : il faut ${M.HEURES} h, retour avant ${DATA.TIME.NIGHT_HOUR} h.` };
  if (state.pieces + EPS < M.PRIX) return { ok: false, raison: 'pieces', texte: 'Pas assez de pièces.' };
  return { ok: true, raison: '', texte: '' };
}

// Un adulte va au marché de la ville : il est ouvert jusqu'au soir.
export function goToTownMarket(state) {
  const st = townMarketStatus(state);
  if (!st.ok) return fail(st.texte);
  const M = DATA.VILLE.MARCHE;
  spend(state, M.PRIX);
  advanceHours(state, M.HEURES);
  ville(state).marche = state.day;
  return { ok: true, cost: M.PRIX, heures: M.HEURES };
}

// Les objets du marché de la ville, dans l'ordre des objets.
export function townItems() {
  return Object.keys(DATA.items).filter((k) => DATA.items[k].ville);
}

export function buyInTown(state, item, qty = 1) {
  if (!townMarketOpen(state)) return fail('Va d\'abord au marché de la ville.');
  if (!DATA.items[item] || !DATA.items[item].ville) return fail('Cet objet ne se vend pas au marché de la ville.');
  return buyItem(state, item, qty, { ville: true });
}

// Heure (ms d'éveil) au-delà de laquelle une sortie de `heures` heures n'est plus possible.
export function latestStart(heures) {
  return awakeMsAtHour(DATA.TIME.NIGHT_HOUR - heures);
}
