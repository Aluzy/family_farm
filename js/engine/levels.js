import { DATA } from './catalog.js';

/* ---------- version 1.7 (v2, lot 3) : niveaux d'expérience ---------- */

// state.progression = { xp, niveau, annonces } : xp cumulée (entier) ; niveau :
// le plus haut atteint (il ne redescend jamais) ; annonces : niveaux atteints
// dont l'écran n'a pas encore été vu [{ niveau, nuit }].
export function newProgression() {
  return { xp: 0, niveau: 1, annonces: [] };
}

export function levelCount() {
  return DATA.NIVEAUX.SEUILS.length;
}

// Niveau correspondant à une XP cumulée (1 à levelCount()).
export function levelForXp(xp) {
  const S = DATA.NIVEAUX.SEUILS;
  let n = 1;
  while (n < S.length && xp >= S[n]) n++;
  return n;
}

// Niveau atteint par la partie. Un état sans progression (parties très
// anciennes avant migration, états de test partiels) a tout débloqué.
export function levelReached(state) {
  const p = state && state.progression;
  return p ? p.niveau : levelCount();
}

// Niveau qui débloque un élément ou une culture ; 1 si rien ne le débloque.
export function unlockLevel(id) {
  const i = DATA.NIVEAUX.liste.findIndex((n) => (n.debloque || []).includes(id));
  return i < 0 ? 1 : i + 1;
}

// XP de l'action : DATA.NIVEAUX.XP[action] × n, à AUTO % quand une automatisation
// la fait (arrondi vers le bas).
export function actionXp(action, n = 1, auto = false) {
  const base = (DATA.NIVEAUX.XP[action] || 0) * n;
  return auto ? Math.floor((base * DATA.NIVEAUX.AUTO) / 100) : base;
}

// Ajoute de l'XP ; chaque niveau franchi est annoncé (une seule fois). Renvoie
// les niveaux gagnés.
export function gainXp(state, amount) {
  const p = state && state.progression;
  const n = Math.floor(Number(amount) || 0);
  if (!p || n <= 0) return [];
  p.xp += n;
  const gained = [];
  const target = levelForXp(p.xp);
  while (p.niveau < target) {
    p.niveau += 1;
    p.annonces.push({ niveau: p.niveau, nuit: state.day });
    gained.push(p.niveau);
  }
  return gained;
}

// XP d'une action du joueur (ou d'une automatisation).
export function gainActionXp(state, action, n = 1, auto = false) {
  return gainXp(state, actionXp(action, n, auto));
}

// Pour l'interface : niveau, XP, bornes du niveau en cours et part accomplie (%).
export function levelProgress(state) {
  const p = state.progression || newProgression();
  const S = DATA.NIVEAUX.SEUILS;
  const max = p.niveau >= S.length;
  const debut = S[p.niveau - 1];
  const fin = max ? null : S[p.niveau];
  const pct = max ? 100 : Math.min(100, Math.floor(((p.xp - debut) * 100) / (fin - debut)));
  return { niveau: p.niveau, xp: p.xp, debut, fin, max, pct, reste: max ? 0 : Math.max(0, fin - p.xp) };
}

// Ce que débloque un niveau : { niveau, seuil, elements: [id], cultures: [id], note }.
export function levelUnlocks(niveau) {
  const def = DATA.NIVEAUX.liste[niveau - 1] || { debloque: [] };
  const ids = def.debloque || [];
  return {
    niveau,
    seuil: DATA.NIVEAUX.SEUILS[niveau - 1],
    elements: ids.filter((id) => DATA.NIVEAUX.ELEMENTS[id]),
    cultures: ids.filter((id) => DATA.crops[id]),
    note: def.note || null,
  };
}

// L'écran du niveau atteint a été vu.
export function acknowledgeLevel(state) {
  const p = state.progression;
  if (!p || !p.annonces.length) return { ok: false, error: 'Rien à annoncer.' };
  p.annonces.shift();
  return { ok: true, restantes: p.annonces.length };
}
