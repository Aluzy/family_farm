import { DATA } from './catalog.js';
import { ownedTechs } from './techtree.js';

/* ---------- l'heure ---------- */

// Éveil minimal avant de dormir : celui de départ, ou le plus bas des paliers
// « Réveil matinal » acquis (Lot 7).
export function awakeRequired(state) {
  let required = DATA.TIME.MIN_AWAKE_S;
  for (const id of ownedTechs(state)) {
    const e = DATA.techtree.noeuds[id].effet;
    if (e && e.eveilMin !== undefined) required = Math.min(required, e.eveilMin);
  }
  return required;
}

// Heure de la journée (0 à 23) : 6 h au réveil, +1 heure toutes les
// CLOCK_SECONDS_PER_HOUR secondes d'éveil (30 s). À 19 h la famille prend son
// repas (mealDue / takeMeal) ; à 22 h la nuit se déroule d'elle-même
// (bedtimeDue : c'est l'interface qui lance sleep(), jeu ouvert). Si rien ne
// la lance, l'horloge repasse à 0 h et continue. (L'usure des appareils a sa
// propre « heure de marche », SECONDS_PER_HOUR : voir wearStep().)
export function hourOfDay(state) {
  if (nightActive(state)) return Math.floor(clockHours(state));
  const hours = Math.floor(state.awakeMs / (DATA.TIME.CLOCK_SECONDS_PER_HOUR * 1000));
  return (DATA.TIME.DAY_START_HOUR + hours) % 24;
}

// La même heure avec sa partie décimale, dans [0, 24) : 6,5 pour 6 h 30. Sert à
// dessiner l'horloge et la lumière du jour sans à-coups.
export function clockHours(state) {
  if (nightActive(state)) {
    const h = DATA.TIME.NIGHT_HOUR + state.nuitEnCours.ms / (DATA.TIME.CLOCK_SECONDS_PER_HOUR * 1000);
    return h >= 24 ? h - 24 : h;
  }
  const ms = Math.max(0, Number(state.awakeMs) || 0);
  const perDay = 24 * DATA.TIME.CLOCK_SECONDS_PER_HOUR * 1000;
  const h = DATA.TIME.DAY_START_HOUR + (ms % perDay) / (DATA.TIME.CLOCK_SECONDS_PER_HOUR * 1000);
  return h >= 24 ? h - 24 : h;
}

// L'heure absolue, en heures depuis minuit du jour 1 (décimales comprises) : 30,5 le jour 2
// à 6 h 30. Le jour, d'après l'éveil ; la nuit, d'après le temps de nuit (passé minuit, le
// jour a déjà changé). Sert aux cycles de pousse (growDue).
export function absoluteHours(state) {
  const H = DATA.TIME.CLOCK_SECONDS_PER_HOUR * 1000;
  const day = Number(state.day) || 1;
  if (nightActive(state)) {
    const n = state.nuitEnCours;
    return ((n.minuit ? day - 1 : day) - 1) * 24 + DATA.TIME.NIGHT_HOUR + n.ms / H;
  }
  return (day - 1) * 24 + DATA.TIME.DAY_START_HOUR + Math.max(0, Number(state.awakeMs) || 0) / H;
}

/* ---------- version 1.19 : la nuit défile ---------- */

// De NIGHT_HOUR (22 h) à DAY_START_HOUR (6 h), la nuit passe à la vitesse du jour :
// state.nuitEnCours = { ms (temps de nuit écoulé depuis 22 h), minuit (la nuit est-elle
// déjà calculée ?), dort (le personnage dort dans son lit : la nuit défile en accéléré) }, null le jour. Voir startNight(), advanceNight() et skipNight().
export function nightActive(state) {
  return !!(state && state.nuitEnCours && Number.isFinite(state.nuitEnCours.ms));
}

// Durée de toute la nuit (22 h → 6 h) et moment de minuit, en ms de nuit.
export function nightLengthMs() {
  return (24 - DATA.TIME.NIGHT_HOUR + DATA.TIME.DAY_START_HOUR) * DATA.TIME.CLOCK_SECONDS_PER_HOUR * 1000;
}
export function midnightMs() {
  return (24 - DATA.TIME.NIGHT_HOUR) * DATA.TIME.CLOCK_SECONDS_PER_HOUR * 1000;
}

// Temps d'éveil (ms) auquel l'horloge marque `hour` heures (19 h → 65 000 ms).
export function awakeMsAtHour(hour) {
  return (hour - DATA.TIME.DAY_START_HOUR) * DATA.TIME.CLOCK_SECONDS_PER_HOUR * 1000;
}

// Version 1.1.1 : le repas de 19 h est-il à prendre maintenant ? (pas encore
// pris aujourd'hui, et l'horloge a atteint MEAL_HOUR)
export function mealDue(state) {
  return !state.repas && state.awakeMs >= awakeMsAtHour(DATA.TIME.MEAL_HOUR);
}

// L'heure du coucher (NIGHT_HOUR, 22 h) est-elle passée sans que personne n'ait
// dormi ? L'interface lance alors
// la nuit (sleep()) : repas s'il n'a pas été pris, puis les étapes habituelles.
export function bedtimeDue(state) {
  return state.awakeMs >= awakeMsAtHour(DATA.TIME.NIGHT_HOUR);
}
