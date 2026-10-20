// L'économie de la ville (docs/plan-ville.md, étape 5c ; data/economie.json, ECONOMIE). Chaque nuit
// (economieNuit, avant que les familles des immeubles ne vivent leur journée) :
//   1. les producteurs hors de la ville livrent leurs matières premières (± VARIATION %) ;
//   2. les fabriques, de l'amont à l'aval, en font leurs produits : assez pour couvrir la demande
//      du jour et garder STOCK.DEPART jours d'avance, dans la limite de leur capacité, des
//      matières en stock et des camions ; ce qui leur a manqué devient une pénurie, que le bureau
//      de négoce rachète au joueur (venteNegoce) ;
//   3. les habitants hors de la ville achètent leurs repas aux boutiques, tous les foyers usent
//      leurs biens, le train emporte l'export ;
//   4. les comptes du jour : chaque lieu touche ses ventes et paie ses matières et ses salaires ;
//      le joueur touche ENTREPRISES.PART % du bénéfice des entreprises qu'il possède ; le reste va
//      à la caisse de la ville, qui paie les services et reçoit les billets des sorties et l'impôt.
// Les citadins (js/engine/voisins.js, journee) achètent leurs repas aux boutiques
// (acheterRepasVille) et sortent au cinéma, au musée, à l'amphithéâtre (sortieVille) ; le joueur
// achète au comptoir (js/engine/ville.js, buyInShop : prendreStock).
//
// state.economie = { jour, stocks: { produit: n }, conso: { produit: n (la demande vue) },
// ventes: { lieu: pièces }, caisse, penuries: { matiere: n }, visites: { jour: { lieu: n } } (les derniers jours),
// acc: { produit: fraction }, bilan (le dernier jour : production, ventes, export, camions,
// comptes, caisse, pénuries) }.
import { DATA } from './catalog.js';
import { earn } from './compta.js';
import { ownsCompany } from './entreprises.js';

const E = () => DATA.ECONOMIE;
const ajoute = (o, k, n) => { o[k] = (o[k] || 0) + n; };

// La fabrique (ou la boutique) qui fait le produit `p` (undefined : une matière première).
const fabriqueDe = (p) => E().FABRIQUES.find((f) => f.produit === p);

// La population de la ville et des producteurs : { foyers, adultes, enfants } (les foyers des
// immeubles et des maisons : VOISINS.IMMEUBLE.LOGEMENTS, deux adultes et un enfant en moyenne
// par logement d'immeuble ; leur nombre exact est celui du plan, docs/plan-ville.md).
function population() {
  const L = DATA.VOISINS.IMMEUBLE.LOGEMENTS, H = E().HORS_VILLE;
  const foyers = Object.values(L).reduce((t, n) => t + n, 0);
  // (studios : 0 enfant ; T2 : 1 ; maisons : 2 ou 3 → 55 enfants pour 40 foyers, le plan)
  return { foyers: foyers + H.foyers, adultes: foyers * 2 + H.adultes, enfants: 55 + H.enfants, ville: foyers };
}

// La demande d'un jour, telle que le modèle la prévoit : { produit: unités } (les repas et les
// biens de toute la population, l'export, puis ce qu'il faut en amont pour les faire). Gardée.
let demandeMemo = null;
export function demandeTheorique() {
  if (demandeMemo && demandeMemo.data === DATA) return demandeMemo.d;
  const P = population(), AJ = DATA.FAMILLE.AJ, d = {};
  const energie = P.adultes * AJ.adulte + P.enfants * AJ.enfant;
  for (const [p, part] of Object.entries(E().REGIME)) ajoute(d, p, (energie * part) / 100 / DATA.OBJETS[E().REPAS[p]].energie);
  for (const [p, q] of Object.entries(E().BIENS)) ajoute(d, p, q * P.foyers);
  for (const [p, q] of Object.entries(E().EXPORT)) ajoute(d, p, q);
  // (de l'aval vers l'amont : chaque fabrique demande ses matières)
  for (const f of E().FABRIQUES.slice().reverse()) for (const [i, r] of Object.entries(f.recette)) ajoute(d, i, (d[f.produit] || 0) * r);
  demandeMemo = { data: DATA, d };
  return d;
}

export function economie(state) {
  if (!state.economie || typeof state.economie !== 'object') state.economie = {};
  const e = state.economie;
  if (!e.stocks) {
    // (au départ : STOCK.DEPART jours de la demande en stock)
    e.stocks = {};
    for (const [p, q] of Object.entries(demandeTheorique())) if (fabriqueDe(p)) e.stocks[p] = Math.round(q * E().STOCK.DEPART);
  }
  for (const k of ['conso', 'ventes', 'penuries', 'acc', 'visites']) if (!e[k] || typeof e[k] !== 'object') e[k] = {};
  if (typeof e.caisse !== 'number') e.caisse = E().CAISSE.DEPART;
  if (typeof e.jour !== 'number') e.jour = state.day - 1;
  return e;
}

// Le coefficient du prix du produit `p` : un produit rare coûte plus cher (PRIX).
export function coefPrix(state, p) {
  const e = economie(state), C = E().PRIX;
  const vise = (demandeTheorique()[p] || 0) * E().STOCK.DEPART;
  if (!vise) return 1;
  const c = 1 + (C.ELASTICITE * (vise - (e.stocks[p] || 0))) / vise;
  return Math.max(C.MIN / 100, Math.min(C.MAX / 100, c));
}

// Le prix du jour d'une unité du produit `p`.
export function prixEco(state, p) {
  return Math.max(1, Math.round(E().PRODUITS[p].prix * coefPrix(state, p)));
}

// Vendre `n` unités du produit `p` au détail (les repas, le comptoir) : prises au stock, payées
// à la boutique qui le vend. Renvoie le nombre vendu (le stock peut manquer).
export function prendreStock(state, p, n, recette = 0) {
  const e = economie(state), k = Math.max(0, Math.min(n, Math.floor(e.stocks[p] || 0)));
  if (!k) return 0;
  e.stocks[p] -= k;
  ajoute(e.conso, p, k);
  const f = fabriqueDe(p);
  if (f) ajoute(e.ventes, f.lieu, recette);
  return k;
}

// Une variation de ± VARIATION % (fixe pour un jour et une clé) : pseudo-hasard, sans graine.
function variation(jour, cle) {
  let h = 2166136261;
  for (const c of `${jour}:${cle}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return 1 + (((h >>> 0) % 2001) / 1000 - 1) * (E().VARIATION / 100);
}

// Les salaires du jour des postes du lieu `lieu` (VOISINS.EMPLOIS).
const salairesDe = (lieu) => DATA.VOISINS.EMPLOIS.filter((q) => q.LIEU === lieu).reduce((t, q) => t + q.POSTES * q.SALAIRE, 0);

// Une journée de l'économie (la nuit du jour `jour`).
function journeeEco(state, jour) {
  const e = economie(state), D = demandeTheorique(), X = E();
  const B = { jour, production: {}, ventes: {}, export: {}, transport: 0, camions: 0, comptes: {}, penuries: {}, caisse: 0, part: 0 };
  const recettes = e.ventes; // les ventes au détail d'hier (repas des citadins, comptoir)
  e.ventes = {};
  B.conso = e.conso; // (ce qui s'est vendu au détail depuis la nuit d'avant)
  e.conso = {};
  const comptes = {};
  const compte = (lieu) => (comptes[lieu] = comptes[lieu] || { recette: 0, depense: 0 });
  for (const [l, r] of Object.entries(recettes)) compte(l).recette += r;
  // 1. les producteurs : leur récolte du jour, livrée tant que la ville en manque (ils gardent
  // le reste)
  for (const [id, pr] of Object.entries(X.PRODUCTEURS)) {
    const q = Math.round(pr.n * pr.qte * variation(jour, id));
    const vise = (D[pr.produit] || 0) * (1 + X.STOCK.DEPART) - (e.stocks[pr.produit] || 0);
    const k = Math.max(0, Math.min(q, Math.ceil(vise)));
    ajoute(e.stocks, pr.produit, k);
    ajoute(B.production, pr.produit, k);
  }
  // 2. les fabriques, de l'amont à l'aval (les camions : la capacité du jour)
  let camion = X.CAMIONS.n * X.CAMIONS.capacite;
  const manque = {};
  for (const f of X.FABRIQUES) {
    const vise = (D[f.produit] || 0) * (1 + X.STOCK.DEPART) - (e.stocks[f.produit] || 0);
    if (vise <= 0) continue;
    let n = Math.min(f.cap, Math.ceil(vise));
    for (const [i, r] of Object.entries(f.recette)) {
      const peut = Math.floor((e.stocks[i] || 0) / r + 1e-9);
      if (peut < n) { ajoute(manque, i, (n - peut) * r); n = peut; }
    }
    // (les camions portent les matières, et le produit s'il ne se vend pas sur place)
    const parUnite = Object.values(f.recette).reduce((t, r) => t + r, 0) + (f.comptoir ? 0 : 1);
    n = Math.max(0, Math.min(n, Math.floor(camion / parUnite)));
    if (!n) continue;
    camion -= n * parUnite;
    B.transport += Math.round(n * parUnite);
    for (const [i, r] of Object.entries(f.recette)) {
      const q = n * r, cout = Math.round(q * prixEco(state, i));
      e.stocks[i] -= q;
      compte(f.lieu).depense += cout;
      const amont = fabriqueDe(i);
      if (amont) compte(amont.lieu).recette += cout;
    }
    ajoute(e.stocks, f.produit, n);
    ajoute(B.production, f.produit, n);
  }
  B.camions = Math.ceil(B.transport / X.CAMIONS.capacite);
  // les pénuries : les matières premières qui ont manqué (le négoce les rachète)
  e.penuries = {};
  for (const [m, q] of Object.entries(manque)) if (X.MATIERES[m] && q >= 1) e.penuries[m] = Math.ceil(q);
  B.penuries = { ...e.penuries };
  // 3. les repas des habitants hors de la ville, les biens de tous les foyers, l'export
  const P = population(), AJ = DATA.FAMILLE.AJ, horsE = X.HORS_VILLE.adultes * AJ.adulte + X.HORS_VILLE.enfants * AJ.enfant;
  const acc = (p, q) => { e.acc[p] = (e.acc[p] || 0) + q; const k = Math.floor(e.acc[p] + 1e-9); e.acc[p] -= k; return k; };
  for (const [p, part] of Object.entries(X.REGIME)) {
    const k = prendreStock(state, p, acc('repas_' + p, (horsE * part) / 100 / DATA.OBJETS[X.REPAS[p]].energie));
    if (k) { compte(fabriqueDe(p).lieu).recette += k * prixEco(state, p); ajoute(B.ventes, p, k); }
  }
  for (const [p, q] of Object.entries(X.BIENS)) {
    const k = prendreStock(state, p, acc('bien_' + p, q * P.foyers));
    if (k) { compte(fabriqueDe(p).lieu).recette += k * prixEco(state, p); ajoute(B.ventes, p, k); }
  }
  for (const [p, q] of Object.entries(X.EXPORT)) {
    const k = prendreStock(state, p, q);
    if (k) { compte(fabriqueDe(p).lieu).recette += Math.round((k * prixEco(state, p) * X.EXPORT_PRIX) / 100); ajoute(B.export, p, k); }
  }
  // 4. les comptes : salaires, bénéfices, part du joueur, caisse de la ville
  for (const f of X.FABRIQUES) compte(f.lieu).depense += salairesDe(f.lieu);
  let caisse = 0;
  for (const [lieu, c] of Object.entries(comptes)) {
    const benefice = Math.round(c.recette - c.depense);
    B.comptes[lieu] = { recette: Math.round(c.recette), depense: Math.round(c.depense), benefice };
    // (une entreprise du joueur : sa part du bénéfice)
    if (benefice > 0 && DATA.VILLE.ENTREPRISES.LISTE[lieu] && ownsCompany(state, lieu)) {
      const part = Math.round((benefice * X.ENTREPRISES.PART) / 100);
      earn(state, part, `${DATA.VILLE.ENTREPRISES.LISTE[lieu].nom} : part du bénéfice`);
      B.part += part;
      caisse += benefice - part;
    } else caisse += benefice;
  }
  for (const s of X.CAISSE.SERVICES) caisse -= salairesDe(s);
  // (l'impôt sur les salaires des habitants ; les billets des sorties, payés hier)
  caisse += Math.round((DATA.VOISINS.EMPLOIS.reduce((t, q) => t + q.POSTES * q.SALAIRE, 0) * X.CAISSE.IMPOT) / 100);
  caisse += e.billets || 0;
  e.billets = 0;
  e.caisse += caisse;
  B.caisse = caisse;
  e.bilan = B;
  e.jour = jour;
}

// La nuit : l'économie vit les journées qui lui manquent (au plus RATTRAPAGE).
export function economieNuit(state) {
  const e = economie(state);
  for (let j = Math.max(e.jour + 1, state.day - E().RATTRAPAGE + 1); j <= state.day; j++) journeeEco(state, j);
}

// Les repas d'un foyer de citadins `f` (journee, js/engine/voisins.js) : pour chaque produit du
// REGIME, sa part de l'énergie du jour (besoin), achetée aux boutiques tant qu'il y en a et que
// le foyer peut payer (les parts d'unité s'ajoutent d'un jour à l'autre : f.repas). Renvoie
// { energie, mange: { objet: n }, cout }.
export function acheterRepasVille(state, f, besoin) {
  const X = E(), out = { energie: 0, mange: {}, cout: 0 };
  if (!f.repas || typeof f.repas !== 'object') f.repas = {};
  for (const [p, part] of Object.entries(X.REGIME)) {
    const item = X.REPAS[p], en = DATA.OBJETS[item].energie, prix = prixEco(state, p);
    f.repas[p] = (f.repas[p] || 0) + (besoin * part) / 100 / en;
    let n = Math.floor(f.repas[p] + 1e-9);
    f.repas[p] -= n;
    n = Math.min(n, Math.floor(f.argent / prix));
    const k = prendreStock(state, p, n);
    if (!k) continue;
    f.argent -= k * prix;
    ajoute(economie(state).ventes, fabriqueDe(p).lieu, k * prix);
    out.cout += k * prix;
    out.energie += k * en;
    ajoute(out.mange, item, k);
  }
  return out;
}

// Une sortie du foyer `f` le jour `jour` (journee) : si son bonheur est sous SEUIL et qu'il garde
// RESERVE pièces, il va (une fois) au loisir qui a encore de la place, au hasard selon `part` ;
// il paie, gagne son bonheur ; les billets vont à la caisse. Renvoie le lieu, ou null.
export function sortieVille(state, f, jour) {
  const L = E().LOISIRS, e = economie(state);
  if (f.bonheur >= L.SEUIL) return null;
  // (les places de chaque jour : les familles rattrapent parfois plusieurs journées d'un coup)
  for (const j of Object.keys(e.visites)) if (!(Number(j) >= jour - E().RATTRAPAGE)) delete e.visites[j];
  const V = e.visites[jour] || (e.visites[jour] = {});
  const lieux = Object.entries(L.LIEUX).filter(([id, l]) => (V[id] || 0) + f.adultes + f.enfants <= l.cap);
  if (!lieux.length) return null;
  const tot = lieux.reduce((t, [, l]) => t + l.part, 0);
  let x = (variation(jour, f.argent + ':' + f.bonheur) - 1 + E().VARIATION / 100) / ((2 * E().VARIATION) / 100) * tot;
  const [id, l] = lieux.find(([, q]) => (x -= q.part) < 0) || lieux[0];
  const cout = l.prix * f.adultes + Math.ceil(l.prix / 2) * f.enfants;
  if (f.argent - cout < L.RESERVE) return null;
  f.argent -= cout;
  f.bonheur = Math.min(DATA.VILLE.BONHEUR.MAX, f.bonheur + l.bonheur);
  V[id] = (V[id] || 0) + f.adultes + f.enfants;
  e.billets = (e.billets || 0) + cout;
  return id;
}

// La matière que l'objet `item` de l'inventaire fournit au négoce (null : aucune).
export function matiereDe(item) {
  const o = DATA.OBJETS[item];
  if (!o) return null;
  for (const [m, d] of Object.entries(E().MATIERES)) if ((d.objets && d.objets.includes(item)) || (d.categorie && d.categorie === o.categorie && o.mangeable)) return m;
  return null;
}

// Le prix que le négoce paie au joueur une unité de la matière `m` (PRIME %, au cours du jour).
export function prixNegoce(state, m) {
  return Math.max(1, Math.round((E().PRODUITS[m].prix * E().NEGOCE.PRIME * coefPrix(state, m)) / 100));
}

// Ce que le bureau de négoce rachète aujourd'hui : [{ matiere, quantite (la pénurie), prix }].
export function negoceVue(state) {
  const e = economie(state);
  return Object.entries(e.penuries).filter(([, q]) => q > 0).map(([matiere, quantite]) => ({ matiere, quantite, prix: prixNegoce(state, matiere) }));
}

// Le joueur vend au négoce `n` `item` de son inventaire (au plus ce qui manque de sa matière) :
// payés prixNegoce, ils vont au stock de la ville. `prendre(item, n)` retire de l'inventaire et
// renvoie le nombre retiré (js/engine/ville.js : sellToNegoce).
export function venteNegoce(state, item, n, prendre) {
  const m = matiereDe(item), e = economie(state);
  if (!m || !(e.penuries[m] > 0)) return { ok: false, error: 'Le bureau de négoce n\'en a pas besoin aujourd\'hui.' };
  const k = prendre(item, Math.min(n, e.penuries[m]));
  if (!k) return { ok: false, error: 'Il n\'y en a pas dans l\'inventaire.' };
  const prix = prixNegoce(state, m), gain = k * prix;
  e.penuries[m] -= k;
  ajoute(e.stocks, m, k);
  earn(state, gain, `Bureau de négoce : ${DATA.OBJETS[item].nom}`, k);
  return { ok: true, sold: k, gain, matiere: m };
}

// Ce que la mairie montre de l'économie : le bilan d'hier, les stocks, les pénuries, la caisse ;
// produits : [{ id, nom, icone, stock, demande (par jour), prix (du jour), base, matiere }] (les
// matières premières d'abord) ; sorties : les visites des loisirs, le dernier jour de sortie.
export function economieVue(state) {
  const e = economie(state), D = demandeTheorique(), X = E();
  const stocks = Object.fromEntries(Object.entries(e.stocks).map(([p, q]) => [p, Math.floor(q)]));
  const prix = Object.fromEntries(Object.keys(X.PRODUITS).map((p) => [p, prixEco(state, p)]));
  const produits = Object.entries(X.PRODUITS).map(([id, d]) => ({
    id, nom: d.nom, icone: d.icone, stock: stocks[id] || 0, demande: Math.round(D[id] || 0), prix: prix[id], base: d.prix, matiere: !!X.MATIERES[id],
  })).sort((a, b) => b.matiere - a.matiere);
  const jours = Object.keys(e.visites).map(Number), jour = jours.length ? Math.max(...jours) : null;
  const sorties = jour == null ? {} : { ...e.visites[jour] };
  return { jour: e.jour, caisse: Math.round(e.caisse), bilan: e.bilan || null, stocks, prix, produits, penuries: { ...e.penuries }, demande: D, sorties, sortiesJour: jour ?? null, part: X.ENTREPRISES.PART };
}
