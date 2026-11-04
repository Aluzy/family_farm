// chrono.js — le chronomètre des mesures sur l'appareil (le mode test, 📏 Mesures : js/ui/mesures.js).
//
// mesurer(nom, f) appelle f ; pendant une mesure (chrono.actif), le temps passé est ajouté au poste
// `nom` (un temps « inclus » : un poste appelé depuis un autre compte dans les deux). Éteint, il ne
// coûte qu'un test. Les scripts classiques (la carte : js/farm-stage.js) le trouvent sur window.Chrono.

export const chrono = { actif: false, postes: new Map() };

export function mesurer(nom, f) {
  if (!chrono.actif) return f();
  const t = performance.now();
  try {
    return f();
  } finally {
    noter(nom, performance.now() - t);
  }
}

// Ajoute `ms` au poste `nom` (une fois de plus).
export function noter(nom, ms) {
  if (!chrono.actif) return;
  const p = chrono.postes.get(nom) || { ms: 0, n: 0, max: 0 };
  p.ms += ms;
  p.n += 1;
  p.max = Math.max(p.max, ms);
  chrono.postes.set(nom, p);
}

// Remet les postes à zéro et allume (ou éteint) le chronomètre.
export function demarrer(actif = true) {
  chrono.postes = new Map();
  chrono.actif = actif;
}

// Les postes, du plus lourd au plus léger : [{ nom, ms, n, max }].
export function postes() {
  return [...chrono.postes].map(([nom, p]) => ({ nom, ...p })).sort((a, b) => b.ms - a.ms);
}

if (typeof window !== 'undefined') window.Chrono = { chrono, mesurer, noter };
