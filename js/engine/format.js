import { EPS } from './base.js';
import { dayOfMonth, monthName, yearNumber } from './lune.js';

// Texte sûr à écrire dans une page : les caractères spéciaux du HTML sont
// remplacés. À utiliser pour tout texte saisi par le joueur (les prénoms).
export function escapeHtml(text) {
  return String(text === null || text === undefined ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Formatage des nombres à la française : toujours un entier, avec une espace
// tous les 3 chiffres (« 80 000 », « 1 234 567 »), jamais de décimale.
// Fonction pure : elle vit dans ENGINE pour rester testable par Node, même
// si c'est l'app qui l'utilise pour l'affichage.
export function formatNumber(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '0';
  const r = Math.round(n);
  const sign = r < 0 ? '-' : '';
  return sign + groupThousands(Math.abs(r));
}

// Groupe un entier positif par milliers avec des espaces : 1234 -> "1 234".
export function groupThousands(intValue) {
  const s = String(Math.trunc(intValue));
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const posFromEnd = s.length - i;
    out += s[i];
    if (posFromEnd > 1 && posFromEnd % 3 === 1) out += ' ';
  }
  return out;
}

// Nombre signé avec le vrai signe moins : « +5 », « −20 », « 0 ».
export function formatSigned(n) {
  const r = Math.round(Number(n) || 0);
  if (r === 0) return '0';
  return (r < 0 ? '−' : '+') + groupThousands(Math.abs(r));
}

// Énergie stockée (mWh) en Wh entiers, arrondis vers le bas : « 2 340 Wh ».
export function formatWh(mwh) {
  return `${formatNumber(Math.floor((Number(mwh) || 0) / 1000))} Wh`;
}

// Puissance (mWh/s) en Wh/s entiers : « 30 Wh/s » ; signée avec `signed`.
export function formatWhRate(mwhPerS, signed = false) {
  const v = Math.trunc((Number(mwhPerS) || 0) / 1000);
  return `${signed ? formatSigned(v) : formatNumber(v)} Wh/s`;
}

// Eau (mL) en litres entiers, arrondis vers le bas : « 38 L ».
export function formatLitres(ml) {
  return `${formatNumber(Math.floor((Number(ml) || 0) / 1000))} L`;
}

// Débit (mL/s) en litres par seconde, entiers : « 2 L/s ».
export function formatLitresRate(mlPerS) {
  return `${formatNumber(Math.floor((Number(mlPerS) || 0) / 1000))} L/s`;
}

// Pièces : toujours un entier (tous les prix sont arrondis à l'entier supérieur).
export function formatCoins(n) {
  return formatNumber(Math.round(Number(n) || 0));
}


// Quantité d'un stock : toujours un entier.
export function formatQty(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '0';
  return formatNumber(n);
}

export function formatHour(h) {
  return `${h} h`;
}

// Lot 11 : durée d'une absence, arrondie vers le bas : « 45 s », « 12 min »,
// « 2 h 05 min », « 8 h ».
export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor((Number(seconds) || 0) + EPS));
  if (s < 60) return `${s} s`;
  const min = Math.floor(s / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')} min` : `${h} h`;
}

// Pourcentage entier arrondi vers le bas (99,6 s'affiche « 99 % » : 100 % veut
// dire 100), avec une espace insécable avant le signe.
export function formatPercent(p) {
  return `${formatNumber(Math.floor((Number(p) || 0) + EPS))}\u00a0%`;
}


// Jours de la semaine : le jour 1 de la partie est un lundi, puis la semaine tourne (le
// jour 8 est un lundi, le jour 14 un dimanche). Les noms sont en minuscules, comme dans une
// phrase ; weekdayName(day, true) met la majuscule, weekdayShort donne l'abréviation.
export const JOURS_SEMAINE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export function weekdayIndex(day) {
  return (Math.max(1, Math.floor(Number(day) || 1)) - 1) % 7;
}

export function weekdayName(day, majuscule = false) {
  const nom = JOURS_SEMAINE[weekdayIndex(day)];
  return majuscule ? nom[0].toUpperCase() + nom.slice(1) : nom;
}

// « Lun. », « Mar. »…
export function weekdayShort(day) {
  return `${weekdayName(day, true).slice(0, 3)}.`;
}

// La date du calendrier lunaire : « Mardi 9 Solaria », avec l'année à partir de l'an 2
// (« Lundi 1 Solaria, an 2 »).
export function formatDay(day) {
  const an = yearNumber(day);
  return `${weekdayName(day, true)} ${dayOfMonth(day)} ${monthName(day)}${an > 1 ? `, an ${an}` : ''}`;
}
