import { DATA, dishEnergy, ingredientOptions } from './catalog.js';
import { randomInt } from './base.js';
import { treeGone } from './crops.js';
import { buyPrice, isBuyable, sellPrice } from './market.js';
import { maisonPlan, transitionPlan, transitionSeed } from './transition.js';
import { mealHappinessDelta } from './ville.js';

/* ---------- les voisins de la carte de transition : leur économie ---------- */

// docs/carte-generee.md (les voisins). Chaque maison du plan de la transition (js/engine/
// transition.js) a son foyer : son métier (bûcheron ou agriculteur, donné par le plan), sa
// bourse, son garde-manger, son champ (un agriculteur), le bonheur de la famille et le
// journal de ses dernières journées. state.voisins = { foyers: { <maison>: foyer } }.
//
// Un foyer naît à la première visite de la carte (la famille, tirée par la page, dit combien
// elle compte d'adultes et d'enfants : voisinFoyer) ; ensuite il vit une journée à chaque nuit
// du jeu (voisinsNuit, appelé par runNight), que le joueur soit là ou non, avec les règles de
// la famille du joueur : le besoin journalier (FAMILLE.AJ), le bonheur des repas (les plats
// cuisinés en rendent, la faim en coûte : mealHappinessDelta). Les réglages : DATA.VOISINS.
//
//   - le bûcheron abat des arbres de la carte (ceux du plan, debout ; ils repoussent comme ceux
//     du joueur), vend leur bois au marché et y achète ce qu'il mange ;
//   - ce qu'il vend part dans sa caisse de collecte ; le livreur l'emmène au marché le lendemain
//     matin, et la famille en touche le prix quand il y arrive (livraison, sous les yeux du
//     joueur ; sinon au début de la journée suivante) ;
//   - l'agriculteur achète ses graines, récolte son champ, garde de quoi cuisiner et vend le
//     reste ; il n'achète que ce qu'il ne produit pas (VOISINS.AGRICULTEUR.ACHATS) ;
//   - chacun cuisine ce que son métier sait faire (VOISINS.RECETTES), tant que le besoin n'est
//     pas couvert, puis complète avec des aliments crus.
//
// Sous les yeux du joueur, la carte montre la même journée : un bûcheron qui abat un arbre le
// fait par voisinAbat (le bois va à son foyer, l'arbre compte dans sa journée).

const ID_ARBRE = (a) => `transition:${Math.round(a.x)},${Math.round(a.y)}`;

function voisins(state) {
  if (!state.voisins || typeof state.voisins !== 'object') state.voisins = { foyers: {} };
  if (!state.voisins.foyers || typeof state.voisins.foyers !== 'object') state.voisins.foyers = {};
  return state.voisins;
}

function planDe(state) {
  return transitionPlan(transitionSeed(state));
}

function maisonDe(state, nom) {
  return planDe(state).maisons.find((m) => m.nom === nom) || null;
}

// Les parcelles du champ d'une maison (une par case ; aucune sans champ) : la culture de
// chacune (VOISINS.AGRICULTEUR.CULTURES, en boucle), plantée le jour `plante`, prête le jour `pret`.
// Au départ, tout est planté, à des jours différents (le champ tourne déjà).
function parcelles(m, jour) {
  if (!m.champ) return [];
  const C = DATA.VOISINS.AGRICULTEUR.CULTURES;
  return Array.from({ length: m.champ.w * m.champ.h }, (_, i) => {
    const culture = C[i % C.length], n = DATA.CULTURES[culture].stades, plante = jour - (i % n);
    return { culture, plante, pret: plante + n };
  });
}

// Le foyer de la maison `maison` (null : pas de telle maison sur la carte de la partie). La
// première fois, il naît (`compo` : { adultes, enfants }, la famille tirée par la page) ; il
// est refait si la carte a changé (une autre graine). `compo` met à jour la famille.
export function voisinFoyer(state, maison, compo) {
  const m = maisonDe(state, maison);
  if (!m) return null;
  const V = voisins(state), plan = planDe(state);
  let f = V.foyers[maison];
  if (!f || f.graine !== plan.graine || f.metier !== m.metier) {
    f = {
      graine: plan.graine, metier: m.metier, adultes: 2, enfants: 1, argent: DATA.VOISINS.ARGENT, stock: {}, niveau: 0,
      champ: parcelles(m, state.day), bonheur: DATA.VILLE.BONHEUR.DEPART, jour: state.day - 1, coupes: { jour: state.day, n: 0 }, journal: [],
    };
    V.foyers[maison] = f;
  }
  if (compo) {
    // (un lit chacun : la famille tient dans la maison)
    f.adultes = Math.max(1, Math.min(m.lits || Infinity, compo.adultes | 0));
    f.enfants = Math.max(0, Math.min((m.lits || Infinity) - f.adultes, compo.enfants | 0));
  }
  return f;
}

// Les foyers de la carte de la partie (ceux qui sont nés), par maison.
export function voisinsFoyers(state) {
  const plan = planDe(state), V = voisins(state);
  const out = {};
  for (const m of plan.maisons) if (V.foyers[m.nom] && V.foyers[m.nom].graine === plan.graine) out[m.nom] = V.foyers[m.nom];
  return out;
}

/* ---------- les arbres du bûcheron ---------- */

// Abattu par un voisin : l'arbre repousse comme ceux du joueur (HACHE.RETOUR jours).
function abattre(state, id) {
  if (!state.outils || typeof state.outils !== 'object') state.outils = {};
  if (!state.outils.arbres || typeof state.outils.arbres !== 'object') state.outils.arbres = {};
  const R = DATA.HACHE.RETOUR;
  state.outils.arbres[id] = { retour: state.day + randomInt(state, R[0], R[1]) };
}

// Les arbres du plan encore debout, du plus proche au plus loin de la porte de `m` : [id].
export function arbresDebout(state, maison) {
  const m = maisonDe(state, maison);
  if (!m) return [];
  const px = m.porte.x * 16 + 8, py = m.porte.y * 16 + 8;
  return planDe(state).arbres
    .map((a) => ({ id: ID_ARBRE(a), d: Math.hypot(a.x - px, a.y - py) }))
    .filter((a) => !treeGone(state, a.id))
    .sort((a, b) => a.d - b.d)
    .map((a) => a.id);
}

// Arbres que le bûcheron de `maison` peut encore abattre aujourd'hui (0 : un agriculteur).
export function voisinQuota(state, maison) {
  const f = voisinsFoyers(state)[maison];
  if (!f || f.metier !== 'bucheron') return 0;
  const faits = f.coupes && f.coupes.jour === state.day ? f.coupes.n : 0;
  return Math.max(0, DATA.VOISINS.BUCHERON.ARBRES * f.adultes - faits);
}

// Sous les yeux du joueur, le bûcheron de `maison` abat l'arbre `id` (un arbre du plan,
// debout) : son bois va au foyer, l'arbre compte dans sa journée. { ok, bois, reste } ou { ok: false }.
export function voisinAbat(state, maison, id) {
  const f = voisinsFoyers(state)[maison];
  if (!f || f.metier !== 'bucheron' || !voisinQuota(state, maison)) return { ok: false };
  if (treeGone(state, id) || !planDe(state).arbres.some((a) => ID_ARBRE(a) === id)) return { ok: false };
  abattre(state, id);
  if (!f.coupes || f.coupes.jour !== state.day) f.coupes = { jour: state.day, n: 0 };
  f.coupes.n++;
  const bois = DATA.VOISINS.BUCHERON.BOIS;
  f.stock.bois = (f.stock.bois || 0) + bois;
  return { ok: true, bois, reste: voisinQuota(state, maison) };
}

/* ---------- la journée d'un foyer ---------- */

const ajoute = (o, k, n) => { o[k] = (o[k] || 0) + n; };

// Peut-il acheter `item` au marché ? (le bûcheron, le fromager : tout ce qui s'achète ;
// l'agriculteur : ce qu'il ne produit pas, et ses graines)
function peutAcheter(f, item, graine = false) {
  if (!isBuyable(item)) return false;
  return f.metier !== 'agriculteur' || graine || DATA.VOISINS.AGRICULTEUR.ACHATS.includes(item);
}

// Achète `n` `item` (false : pas assez d'argent, rien n'est acheté). Le prix est celui du marché.
function acheter(state, f, J, item, n) {
  const cout = buyPrice(state, item) * n;
  if (cout > f.argent) return false;
  f.argent -= cout;
  J.achete += cout;
  ajoute(J.achats, item, n);
  ajoute(f.stock, item, n);
  return true;
}

// Ce qu'il vend va dans sa caisse de collecte (f.caisse) : le livreur l'emmène au marché le
// lendemain matin, et la famille en touche le prix à son arrivée (livrer).
function enCaisse(f, J, item, n) {
  if (n <= 0) return;
  f.stock[item] -= n;
  if (!f.caisse || typeof f.caisse !== 'object') f.caisse = {};
  ajoute(f.caisse, item, n);
  ajoute(J.caisse, item, n);
}

// Ce que vaut la caisse au marché (prix de vente de chaque objet).
function valeurCaisse(f) {
  return Object.entries(f.caisse || {}).reduce((t, [item, n]) => t + sellPrice(item) * n, 0);
}

// Le livreur arrive au marché avec la caisse du foyer `f` (le matin du jour `jour`) : son prix
// est crédité à la famille. Renvoie { gain, ventes }.
function livrer(f, jour) {
  const ventes = { ...(f.caisse || {}) }, gain = valeurCaisse(f);
  f.argent += gain;
  f.caisse = {};
  f.livre = jour;
  f.livraison = { jour, gain, ventes };
  return { gain, ventes };
}

// Ce que le plat `id` coûterait au marché (les ingrédients qui manquent ; Infinity : il ne
// peut pas les avoir), et ses ingrédients : { cout, besoin }.
function devis(state, f, id) {
  const r = DATA.RECETTES[id];
  if (!r) return { cout: Infinity, besoin: {} };
  const besoin = {};
  for (const ing of r.ingredients) {
    const opts = ingredientOptions(ing);
    const item = opts.find((x) => (f.stock[x] || 0) >= ing.qte) || opts.find((x) => peutAcheter(f, x)) || opts[0];
    ajoute(besoin, item, ing.qte);
  }
  let cout = 0;
  for (const [item, n] of Object.entries(besoin)) {
    const manque = n - (f.stock[item] || 0);
    if (manque <= 0) continue;
    if (!peutAcheter(f, item)) return { cout: Infinity, besoin };
    cout += buyPrice(state, item) * manque;
  }
  return { cout, besoin };
}

// Cuisine le plat `id` s'il a (ou peut acheter) ses ingrédients : true, ingrédients pris.
function cuisiner(state, f, J, id) {
  const { cout, besoin } = devis(state, f, id);
  if (cout > f.argent) return false;
  for (const [item, n] of Object.entries(besoin)) {
    const manque = n - (f.stock[item] || 0);
    if (manque > 0) acheter(state, f, J, item, manque);
    f.stock[item] -= n;
  }
  return true;
}

// Les plants que l'agriculteur garde pour replanter ({ culture: n } : une par parcelle de
// cette culture qui se replante de sa récolte, comme la patate).
function plantsGardes(f) {
  const out = {};
  for (const p of f.champ) {
    const g = DATA.CULTURES[p.culture].graines;
    if (g.mode === 'plant') ajoute(out, g.item, 1);
  }
  return out;
}

// L'étape suivante de la maison du foyer `f` (VOISINS.MAISON.ETAPES ; null : tout est fait,
// ou un logement de l'immeuble, déjà meublé).
function prochaineEtape(f) {
  if (f.metier === 'fromager') return null;
  return DATA.VOISINS.MAISON.ETAPES[f.niveau || 0] || null;
}

// Le foyer `f` (de la maison `maison`) vit la journée `jour`.
function journee(state, maison, f, jour) {
  const V = DATA.VOISINS;
  const J = { jour, arbres: 0, bois: 0, recolte: {}, plante: 0, caisse: {}, ventes: {}, vendu: 0, salaire: 0, achete: 0, achats: {}, plats: [], couverture: 0, bonheur: 0 };
  // le matin, la tournée du livreur : la caisse d'hier vendue au marché (si le joueur ne l'a pas
  // déjà vue arriver : livraison)
  if (f.livre !== jour) {
    const l = livrer(f, jour);
    J.vendu = l.gain;
    J.ventes = l.ventes;
  } else if (f.livraison && f.livraison.jour === jour) {
    J.vendu = f.livraison.gain;
    J.ventes = { ...f.livraison.ventes };
  }
  if (f.metier === 'bucheron') {
    // les arbres de la journée : ceux que le joueur l'a vu abattre, puis le reste du quota
    const vus = f.coupes && f.coupes.jour === jour ? f.coupes.n : 0;
    J.arbres = vus;
    const ids = arbresDebout(state, maison);
    for (let k = vus; k < V.BUCHERON.ARBRES * f.adultes && ids.length; k++) {
      abattre(state, ids.shift());
      ajoute(f.stock, 'bois', V.BUCHERON.BOIS);
      J.arbres++;
    }
    J.bois = f.stock.bois || 0;
    enCaisse(f, J, 'bois', f.stock.bois || 0);
  } else if (f.metier === 'fromager') {
    // chaque adulte fait sa journée à la fromagerie : son salaire
    J.salaire = V.FROMAGER.SALAIRE * f.adultes;
    f.argent += J.salaire;
  } else {
    // le champ : la récolte de ce qui est prêt, puis les semis (une graine achetée, ou un plant
    // de la récolte), prêts au bout des stades de la culture
    for (const p of f.champ) {
      if (p.pret == null || p.pret > jour) continue;
      const n = Math.round((DATA.CULTURES[p.culture].rendement * V.AGRICULTEUR.RENDEMENT) / 100);
      ajoute(f.stock, p.culture, n);
      ajoute(J.recolte, p.culture, n);
      p.plante = p.pret = null;
    }
    for (const p of f.champ) {
      if (p.pret != null) continue;
      const c = DATA.CULTURES[p.culture], graine = c.graines.item;
      if ((f.stock[graine] || 0) < 1 && !(peutAcheter(f, graine, true) && acheter(state, f, J, graine, 1))) continue;
      f.stock[graine] -= 1;
      p.plante = jour;
      p.pret = jour + c.stades;
      J.plante++;
    }
  }
  // le repas : des plats tant que le besoin n'est pas couvert, puis des aliments crus
  const AJ = DATA.FAMILLE.AJ, besoin = f.adultes * AJ.adulte + f.enfants * AJ.enfant;
  const mange = {};
  let energie = 0;
  // (des plats différents : chacun rend son bonheur une fois ; une fois le besoin couvert, il en
  // cuisine encore pour le plaisir avec au plus PLAISIR % de ce qu'il a au-delà de CONFORT
  // pièces ; sans ce confort, les plats qui nourrissent le plus pour le moins d'argent d'abord)
  const livre = V.RECETTES[f.metier].slice();
  if (f.argent < V.CONFORT) livre.sort((a, b) => devis(state, f, a).cout / dishEnergy(a) - devis(state, f, b).cout / dishEnergy(b));
  for (const id of livre) {
    if (J.plats.length >= DATA.VILLE.BONHEUR.PLATS_MAX) break;
    if (energie >= besoin && devis(state, f, id).cout > ((f.argent - V.CONFORT) * V.PLAISIR) / 100) continue;
    if (!cuisiner(state, f, J, id)) continue;
    energie += dishEnergy(id);
    ajoute(mange, id, 1);
    J.plats.push(id);
  }
  const plants = plantsGardes(f);
  const crus = () => Object.keys(f.stock).filter((x) => f.stock[x] > (plants[x] || 0) && DATA.OBJETS[x] && DATA.OBJETS[x].mangeable && DATA.OBJETS[x].energie > 0)
    .sort((a, b) => DATA.OBJETS[b].energie - DATA.OBJETS[a].energie);
  while (energie < besoin) {
    let x = crus()[0];
    if (!x) {
      // (plus rien : il en achète, le moins cher pour l'énergie, s'il en a le droit et les moyens)
      x = Object.keys(DATA.OBJETS).filter((k) => DATA.OBJETS[k].mangeable && DATA.OBJETS[k].energie > 0 && !DATA.OBJETS[k].plat && peutAcheter(f, k))
        .sort((a, b) => buyPrice(state, a) / DATA.OBJETS[a].energie - buyPrice(state, b) / DATA.OBJETS[b].energie)[0];
      if (!x || !acheter(state, f, J, x, 1)) break;
    }
    f.stock[x] -= 1;
    energie += DATA.OBJETS[x].energie;
    ajoute(mange, x, 1);
  }
  J.couverture = besoin ? Math.min(100, Math.round((energie / besoin) * 100)) : 100;
  J.bonheur = mealHappinessDelta({ mange, couverture: J.couverture });
  f.bonheur = Math.max(0, Math.min(DATA.VILLE.BONHEUR.MAX, f.bonheur + J.bonheur));
  // l'agriculteur vend ce qu'il ne garde pas pour sa cuisine
  if (f.metier === 'agriculteur') {
    for (const item of Object.keys(f.stock)) {
      if (DATA.CULTURES[item] && DATA.OBJETS[item] && DATA.OBJETS[item].categorie === 'légume') enCaisse(f, J, item, (f.stock[item] || 0) - V.AGRICULTEUR.GARDE - (plants[item] || 0));
    }
  }
  for (const k of Object.keys(f.stock)) if (!(f.stock[k] > 0)) delete f.stock[k];
  // la maison : l'étape suivante, s'il lui reste sa réserve après l'achat
  const e = prochaineEtape(f);
  if (e && f.argent - e.prix >= V.MAISON.RESERVE) {
    f.argent -= e.prix;
    f.niveau = (f.niveau || 0) + 1;
    f.bonheur = Math.min(DATA.VILLE.BONHEUR.MAX, f.bonheur + e.bonheur);
    J.maison = e.id;
  }
  f.journal.push(J);
  if (f.journal.length > V.JOURNAL) f.journal.splice(0, f.journal.length - V.JOURNAL);
  f.jour = jour;
  return J;
}

// La nuit : chaque foyer vit les journées qui lui manquent jusqu'à aujourd'hui (au plus
// VOISINS.RATTRAPAGE). Appelé par runNight avant le jour suivant.
export function voisinsNuit(state) {
  for (const [maison, f] of Object.entries(voisinsFoyers(state))) {
    if (!(Number(f.jour) < state.day)) continue;
    let jour = Math.max(Number(f.jour) + 1, state.day - DATA.VOISINS.RATTRAPAGE + 1);
    for (; jour <= state.day; jour++) journee(state, maison, f, jour);
  }
}

// Sous les yeux du joueur, le livreur arrive au marché : la caisse de chaque foyer (pas encore
// livrée aujourd'hui) est vendue, son prix crédité à la famille. { total, foyers: { <maison>: gain } }.
export function livraison(state) {
  const out = { total: 0, foyers: {} };
  for (const [maison, f] of Object.entries(voisinsFoyers(state))) {
    if (f.livre === state.day) continue;
    const { gain } = livrer(f, state.day);
    out.foyers[maison] = gain;
    out.total += gain;
  }
  return out;
}

/* ---------- les familles des immeubles de la ville ---------- */

// docs/carte-generee.md (les familles des immeubles). Chaque logement des immeubles d'habitation
// en blocs de la ville (VOISINS.IMMEUBLE.LOGEMENTS : « logement_1 »…, « residence_verre_1 »…) a
// son foyer, comme une maison de la
// transition : state.immeuble = { foyers: { <logement>: foyer } }. Ses adultes travaillent à la
// fromagerie de la ville (VOISINS.FROMAGER.HORAIRES) ; chacun y gagne VOISINS.FROMAGER.SALAIRE
// pièces par jour, que la famille dépense au marché pour acheter les ingrédients de ses repas
// (VOISINS.RECETTES.fromager), avec les mêmes règles que les voisins (journee).

function immeuble(state) {
  if (!state.immeuble || typeof state.immeuble !== 'object') state.immeuble = { foyers: {} };
  if (!state.immeuble.foyers || typeof state.immeuble.foyers !== 'object') state.immeuble.foyers = {};
  return state.immeuble;
}

// Les logements des immeubles : [« logement_1 », …, « residence_verre_1 », …].
export function logementsImmeuble() {
  return Object.entries(DATA.VOISINS.IMMEUBLE.LOGEMENTS).flatMap(([nom, n]) => Array.from({ length: n }, (_, i) => `${nom}_${i + 1}`));
}

// Le foyer du logement `logement` (null : pas de tel logement). La première fois, il naît
// (`compo` : { adultes, enfants }, la famille tirée par la page, un lit chacun) ; `compo` met
// à jour la famille.
export function immeubleFoyer(state, logement, compo) {
  if (!logementsImmeuble().includes(logement)) return null;
  const I = immeuble(state), lits = DATA.VOISINS.IMMEUBLE.LITS;
  let f = I.foyers[logement];
  if (!f || f.metier !== 'fromager') {
    f = { metier: 'fromager', adultes: 2, enfants: 1, argent: DATA.VOISINS.ARGENT, stock: {}, champ: [], bonheur: DATA.VILLE.BONHEUR.DEPART, jour: state.day - 1, journal: [] };
    I.foyers[logement] = f;
  }
  if (compo) {
    f.adultes = Math.max(1, Math.min(lits, compo.adultes | 0));
    f.enfants = Math.max(0, Math.min(lits - f.adultes, compo.enfants | 0));
  }
  return f;
}

// Les foyers des immeubles (ceux qui sont nés), par logement.
export function immeubleFoyers(state) {
  const I = immeuble(state), out = {};
  for (const l of logementsImmeuble()) if (I.foyers[l]) out[l] = I.foyers[l];
  return out;
}

// La nuit : chaque foyer des immeubles vit les journées qui lui manquent (comme voisinsNuit).
export function immeubleNuit(state) {
  for (const [logement, f] of Object.entries(immeubleFoyers(state))) {
    if (!(Number(f.jour) < state.day)) continue;
    let jour = Math.max(Number(f.jour) + 1, state.day - DATA.VOISINS.RATTRAPAGE + 1);
    for (; jour <= state.day; jour++) journee(state, logement, f, jour);
  }
}

// Ce que la carte montre et raconte de chaque foyer des immeubles : { <logement>: { metier,
// adultes, enfants, argent, bonheur, hier } }.
export function immeubleVue(state) {
  const out = {};
  for (const [logement, f] of Object.entries(immeubleFoyers(state))) {
    out[logement] = { metier: f.metier, adultes: f.adultes, enfants: f.enfants, argent: f.argent, bonheur: f.bonheur, hier: f.journal.length ? f.journal[f.journal.length - 1] : null };
  }
  return out;
}

// Le stade d'une parcelle à dessiner (0 à 3 ; -1 : rien de planté ; 3 : prête).
function stade(p, jour) {
  if (p.pret == null) return -1;
  if (jour >= p.pret) return 3;
  return Math.max(0, Math.min(2, Math.floor(((jour - p.plante) / (p.pret - p.plante)) * 3)));
}

// Ce que la carte montre et raconte de chaque foyer : { <maison>: { caisse (ce qui attend le
// livreur), valeur (son prix au marché), livree (le livreur est passé aujourd'hui), metier, lits, niveau (l'étape
// de la maison), projet (la suivante, ou null), maison (son plan : maisonPlan), adultes, enfants, argent, bonheur,
// quota, champ: [{ culture, stade }], hier: journal du dernier jour ou null } }.
export function voisinsVue(state) {
  const out = {};
  for (const [maison, f] of Object.entries(voisinsFoyers(state))) {
    out[maison] = {
      caisse: { ...(f.caisse || {}) }, valeur: valeurCaisse(f), livree: f.livre === state.day,
      metier: f.metier, lits: maisonDe(state, maison).lits, niveau: f.niveau || 0, projet: prochaineEtape(f),
      maison: maisonPlan(maisonDe(state, maison), f.niveau || 0), adultes: f.adultes, enfants: f.enfants, argent: f.argent, bonheur: f.bonheur, quota: voisinQuota(state, maison),
      champ: f.champ.map((p) => ({ culture: p.culture, stade: stade(p, state.day) })),
      hier: f.journal.length ? f.journal[f.journal.length - 1] : null,
    };
  }
  return out;
}
