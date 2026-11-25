// cles.js — les clés des caches du bâti (js/engine/blocs.js, js/engine/etage.js) : JSON.stringify, rien de
// plus. Pendant une mesure en jeu (le mode test, 📏 Mesures : js/ui/mesures.js), CLES.actif allumé, chaque
// clé est comptée et chronométrée (son nombre, son temps, sa longueur), pour savoir ce qu'elles coûtent
// (le dossier « chantiers », piste 01). Le résultat ne change pas : la même chaîne qu'avant.
export const CLES = { actif: false, n: 0, ms: 0, caracteres: 0 };

export function cleJson(v) {
  if (!CLES.actif) return JSON.stringify(v);
  const t = performance.now();
  const s = JSON.stringify(v);
  CLES.ms += performance.now() - t;
  CLES.n++;
  CLES.caracteres += s ? s.length : 0;
  return s;
}
