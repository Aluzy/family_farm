/* ---------- Fiche 10 : les notifications qui se cumulent (le calcul, sans le DOM) ---------- */

// Quand le joueur répète vite le même geste (« Fabriquer » à l'Atelier, vendre à la calèche…),
// une seule notification reste affichée et ses quantités montent : « +1 🧱 », puis « +2 🧱 »…
// Ce module ne fait que le compte, pour être testé sans navigateur (tests/engine/notif-cumul.test.mjs) ;
// js/ui/toasts.js (notify, option `cumul`) tient la notification affichée et son minuteur.

// Les sommes gardent trois décimales au plus : 0,1 + 0,2 doit faire 0,3, pas 0,30000000000000004.
const PRECISION = 1000;

// { a: 1, b: 2 } + { b: 1, c: 4 } → { a: 1, b: 3, c: 4 } : chaque clé s'additionne à part, les
// clés déjà là gardent leur ordre et les nouvelles viennent après ; une quantité négative (une
// dépense) se soustrait. Ni l'un ni l'autre objet n'est modifié.
export function additionner(totaux, quantites) {
  const somme = { ...(totaux || {}) };
  for (const [cle, n] of Object.entries(quantites || {})) {
    const v = Number(n) || 0;
    somme[cle] = Math.round(((somme[cle] || 0) + v) * PRECISION) / PRECISION;
  }
  return somme;
}

// Le cumul après un appui. `courant` : la notification de même clé encore affichée
// ({ totaux, finA }, finA en ms), ou null ; `quantites` : ce que rapporte (ou coûte) cet appui ;
// `maintenant` : l'heure en ms. Tant que la notification est à l'écran (maintenant < finA),
// l'appui s'ajoute à ses totaux ; sinon une nouvelle notification repart de cet appui seul.
// Renvoie { totaux, nouvelle } (nouvelle : il faut créer la notification).
export function cumulSuivant(courant, quantites, maintenant) {
  if (courant && maintenant < courant.finA) return { totaux: additionner(courant.totaux, quantites), nouvelle: false };
  return { totaux: additionner(null, quantites), nouvelle: true };
}
