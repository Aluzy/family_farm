import { RAW_DATA } from '../data.generated.js';

/* ==========================================================================
   DATA — toutes les valeurs d'équilibrage du jeu.
   Elles sont écrites dans data/*.json (un fichier par domaine : objets,
   recettes, cultures, arbre des technologies…) ; scripts/build-data.mjs les
   vérifie et en fait RAW_DATA (js/data.generated.js), chargé avant ce fichier.
   Aucune valeur d'équilibrage ne doit exister ailleurs que dans ces fichiers.
   Références : conception v15, sections 1.2, 1.4 et 8.2.

   buildCatalog() fait de RAW_DATA le DATA que tout le jeu lit : une copie, à
   laquelle s'ajoutent les valeurs calculées au chargement (prix de production
   doublés, temps de préparation des plats, plats enregistrés comme objets).
   RAW_DATA, lui, n'est jamais modifié.
   ========================================================================== */
export function buildCatalog(raw) {
  const data = JSON.parse(JSON.stringify(raw));
  // L'ordre compte : les plats lisent des prix d'ingrédients déjà doublés, une
  // seule fois, jamais l'inverse.
  applyProductionPriceMultiplier(data);
  applyDishTimeDivisor(data);
  registerDishItems(data);
  return data;
}

export const DATA = buildCatalog(RAW_DATA);

// Lot 12 (doublement des prix de vente des productions de la ferme) : les
// objets concernés (récolte d'une culture, fruit du Verger, produit animal)
// se déduisent des tables existantes plutôt que d'une liste écrite en dur,
// pour qu'une nouvelle culture, un nouvel arbre ou un nouvel animal ajouté
// plus tard à DATA.crops / DATA.VERGER.ARBRES / DATA.ANIMAUX soit couvert
// automatiquement, sans exception dispersée dans le code :
// - DATA.crops : l'objet réellement récolté par chaque culture (`produit`
//   s'il diffère du nom de la culture, sinon la clé de la culture elle-même),
//   en excluant tout objet de catégorie « graine » — le tournesol récolte
//   ainsi `graine_tournesol`, une graine, qui n'est jamais concernée ;
// - DATA.VERGER.ARBRES : le fruit (`fruit`) de chaque arbre ;
// - DATA.ANIMAUX : ce que chaque animal produit régulièrement (`produit` :
//   l'œuf de la poule), tond (`laine`) ou donne au trait (`lait`).
// Un même objet peut apparaître via plusieurs entrées (le blé, à la fois
// récolté et semé) : l'ensemble `keys` déduplique, donc chaque prix n'est
// doublé qu'une seule fois. Les graines dédiées (graine_carotte, etc.), les
// transformations (farine, huile) et les plats cuisinés ne figurent dans
// aucune de ces trois tables : ils restent donc intacts.
// (`data` : le catalogue lu ; buildCatalog() passe celui qu'il construit.)
export function productionItemKeys(data = DATA) {
  const keys = new Set();
  for (const [cropKey, crop] of Object.entries(data.crops)) {
    const item = crop.produit || cropKey;
    if (data.items[item] && data.items[item].category !== 'graine') keys.add(item);
  }
  for (const arbre of Object.values(data.VERGER.ARBRES)) {
    if (data.items[arbre.fruit]) keys.add(arbre.fruit);
  }
  for (const animal of Object.values(data.ANIMAUX)) {
    for (const champ of ['produit', 'laine', 'lait']) {
      if (animal[champ] && data.items[animal[champ]]) keys.add(animal[champ]);
    }
  }
  return keys;
}

// Appelé par buildCatalog(), avant registerDishItems() : les plats dont le prix
// se calcule à partir des prix des ingrédients (omelette, gratin, fromage
// frais, etc.) doivent lire des prix d'ingrédients déjà doublés.
export function applyProductionPriceMultiplier(data) {
  const mult = data.MARCHE.MULTIPLICATEUR_PRODUCTION;
  const keys = productionItemKeys(data);
  for (const key of data.MARCHE.TRANSFORMATIONS_DOUBLEES) keys.add(key);
  for (const key of keys) {
    data.items[key].prix *= mult;
  }
}

// Lot 14 : temps de préparation des plats (voir DATA.RECETTES.DIVISEUR_TEMPS).
// Chaque recette est traitée une seule fois, ce qui rend le résultat stable
// (20 s → 10 s, 15 s → 8 s, 45 s → 23 s, etc.).
export function applyDishTimeDivisor(data) {
  const R = data.RECETTES;
  for (const r of Object.values(data.recipes)) {
    if (R.STATIONS_TEMPS_DIVISE.includes(r.station)) r.temps = Math.ceil(r.temps / R.DIVISEUR_TEMPS);
  }
}

// Facteur saisonnier d'un type de calcul : 'solaire', 'potager' ou 'eau'.
// Les calculs existants le multiplient à leur valeur de base.
// Arrondi entier de x × pct ÷ 100 (au plus proche, demi vers le haut).
export function roundPct(x, pct) {
  return Math.floor((x * pct + 50) / 100);
}

/* ---------- Lot 5 : plats cuisinés (objets calculés depuis DATA.recipes) ---------- */

// Les ingrédients d'une recette : un seul objet, ou l'un des objets de `ou`.
export function ingredientOptions(ing) {
  return ing.ou || [ing.item];
}

// Somme d'un champ (energie ou prix) des ingrédients d'une recette, eau comprise.
// Pour un ingrédient « l'un ou l'autre », on prend le premier (les valeurs sont égales).
export function recipeSum(recipe, field, waterValue, data = DATA) {
  const sum = recipe.ingredients.reduce((t, ing) => t + (data.items[ingredientOptions(ing)[0]][field] || 0) * ing.qte, 0);
  return sum + (recipe.eau || 0) * waterValue;
}

// Lot 11 (nutrition) : applique la règle d'arrondi centralisée d'une
// revalorisation nutritionnelle des aliments de base (Math.round, arrondi
// standard au demi supérieur). Utilisée pour dériver DATA.items[*].energie
// (voir commentaires « × 1,25 » sur chaque objet) ; centralisée ici pour que
// toute future revalorisation applique la même règle, plutôt que des arrondis
// ad hoc dispersés dans DATA.
export function scaleEnergie(valeurBase, augmentation = DATA.NUTRITION.AUGMENTATION) {
  return roundPct(valeurBase, augmentation);
}

// Énergie d'un plat : somme des ingrédients × 1,3, arrondie (pain 34, omelette 68, ragoût 144),
// sauf si la recette porte un champ energieForcee (override explicite, voir gratin_patates).
export function dishEnergy(id, data = DATA) {
  const recipe = data.recipes[id];
  if (recipe.energieForcee != null) return recipe.energieForcee;
  const R = data.RECETTES;
  return roundPct(recipeSum(recipe, 'energie', R.ENERGIE_EAU, data), R.COEF_PLAT);
}

// Prix de vente d'un plat : somme des prix × 1,3, arrondi, sauf si la recette
// porte un champ priceMultiplier (override explicite du coefficient, pas de
// la formule elle-même — voir les 4 recettes « luxe » : chocolat chaud, café,
// crème à la vanille, bière artisanale, toutes à ×3 au lieu de ×1,3).
export function dishPrice(id, data = DATA) {
  const recipe = data.recipes[id];
  const R = data.RECETTES;
  const coef = recipe.priceMultiplier != null ? recipe.priceMultiplier : R.COEF_PLAT;
  return roundPct(recipeSum(recipe, 'prix', R.PRIX_EAU, data), coef);
}

// Ajoute chaque plat aux objets (énergie et prix calculés). Ils se gardent
// 6 nuits (catégorie « plat »), sauf le pain (7 nuits, voir CONSERVATION).
// Les plats retirés du livre (PLATS_RETIRES) restent des plats, à valeurs
// fixes, pour les sauvegardes qui en ont encore : ils ne s'achètent pas.
// Appelé par buildCatalog(). Un plat peut servir d'ingrédient à un autre (le
// pain du pain à l'ail) : chaque plat est calculé après ceux qu'il utilise,
// quel que soit l'ordre des recettes dans le fichier. Les objets, eux, sont
// ajoutés dans l'ordre des recettes (c'est l'ordre du Livre de recette).
export function registerDishItems(data) {
  const isDish = (id) => !!data.recipes[id] && !data.recipes[id].transformation;
  const known = { ...data, items: { ...data.items } }; // les objets, plus les plats déjà calculés
  const dishes = {};
  const enCours = [];
  const compute = (id) => {
    if (dishes[id]) return;
    if (enCours.includes(id)) throw new Error(`Recettes en boucle : ${[...enCours, id].join(' → ')}`);
    enCours.push(id);
    const r = data.recipes[id];
    for (const ing of r.ingredients) {
      for (const option of ingredientOptions(ing)) if (isDish(option)) compute(option);
    }
    dishes[id] = { nom: r.nom, icone: r.icone, energie: dishEnergy(id, known), prix: dishPrice(id, known), edible: true, category: 'plat', plat: true };
    known.items[id] = dishes[id];
    enCours.pop();
  };
  const ids = Object.keys(data.recipes).filter(isDish);
  ids.forEach(compute);
  for (const id of ids) data.items[id] = dishes[id];
  for (const [id, p] of Object.entries(data.PLATS_RETIRES)) {
    data.items[id] = { nom: p.nom, icone: p.icone, energie: p.energie, prix: p.prix, edible: true, category: 'plat', plat: true, rachetable: false, retire: true };
  }
}

// Objet rendu par une recette et quantité rendue.
export function recipeOutput(id) {
  return DATA.recipes[id].sortie || id;
}

export function recipeOutputQty(id) {
  return DATA.recipes[id].qteSortie || 1;
}
