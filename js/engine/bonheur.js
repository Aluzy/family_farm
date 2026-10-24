import { DATA, ingredientOptions } from './catalog.js';

/* ---------- le bonheur de la famille (data/general.json, BONHEUR) ---------- */

// Bonheur d'un membre (0 à MAX) ; une ancienne sauvegarde sans bonheur part de DEPART.
export function memberHappiness(m) {
  return typeof m.bonheur === 'number' ? m.bonheur : DATA.BONHEUR.DEPART;
}

// Change le bonheur d'un membre, borné de 0 à MAX, arrondi.
export function setHappiness(m, value) {
  m.bonheur = Math.max(0, Math.min(DATA.BONHEUR.MAX, Math.round(value)));
}

// Bonheur moyen de la famille (brut, pour l'affichage).
export function averageHappiness(state) {
  const m = state.famille.membres;
  return m.length ? Math.round(m.reduce((t, x) => t + memberHappiness(x), 0) / m.length) : 0;
}

// Variation de bonheur d'un repas (version 1.11) : DECLIN chaque nuit, plus le bonheur des
// plats différents mangés (au plus PLATS_MAX, les meilleurs), FAIM en plus si le besoin
// n'est pas couvert. Les aliments crus ne donnent rien.
export function mealHappinessDelta(plan) {
  const B = DATA.BONHEUR;
  const valeurs = Object.keys(plan.mange || {})
    .filter((item) => (plan.mange[item] || 0) > 0)
    .map(dishHappiness)
    .filter((v) => v > 0)
    .sort((a, b) => b - a)
    .slice(0, B.PLATS_MAX);
  return B.DECLIN + valeurs.reduce((t, v) => t + v, 0) + (plan.couverture < 100 ? B.FAIM : 0);
}

// Version 1.11 (v2, lot 7) : bonheur que rend un plat (0 pour un aliment cru) : la base de
// son atelier (Cuisine ou Four), + HUILE_FRUIT s'il contient de l'huile ou un fruit, +
// SPECIALES.bonus s'il contient du cacao, du café ou de la vanille. Un ingrédient « l'un ou
// l'autre » compte si toutes ses options comptent.
export function dishHappiness(item) {
  const B = DATA.BONHEUR;
  const def = DATA.OBJETS[item];
  // (un plat de boutique : son bonheur, items.json)
  if (def && def.bonheur != null) return def.bonheur;
  if (!def || !def.plat) return 0;
  const r = DATA.RECETTES[item];
  if (!r || !(r.station in B.PLATS)) return B.PLATS.cuisine;
  const all = (ing, test) => ingredientOptions(ing).every(test);
  const huileFruit = r.ingredients.some((ing) => all(ing, (x) => x === 'huile' || (DATA.OBJETS[x] && DATA.OBJETS[x].categorie === 'fruit')));
  const speciale = r.ingredients.some((ing) => all(ing, (x) => B.SPECIALES.objets.includes(x)));
  return B.PLATS[r.station] + (huileFruit ? B.HUILE_FRUIT : 0) + (speciale ? B.SPECIALES.bonus : 0);
}
