import { DATA } from './catalog.js';
import { EPS, nextRandom } from './base.js';
import { fail, growthPrice, spend } from './devices.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { newNightStats, productivity } from './family.js';
import { techFlag } from './techtree.js';
import { bumpCounter } from './campaign.js';
import { gainActionXp } from './levels.js';

/* ---------- Lot 4 : Silo et blé ---------- */

// Le blé du Silo est un nombre à part (state.silo.ble) qui ne périme jamais ;
// le surplus vit dans l'inventaire, où il périme comme un aliment frais (voir
// items.json) et ne se range pas au frigo. Le blé se prend donc d'abord dans
// l'inventaire, et le Silo se remplit dès qu'il a de la place (fillSilo).
// Les quantités sont entières : 1 blé nourrit 2 poules (voir feedHen).

export function siloCapacity(state) {
  return state.silo.construit ? DATA.SILO.CAPACITE[state.silo.niveau - 1] : 0;
}

export function siloUpgradeCost(state) {
  return state.silo.niveau >= DATA.LEVEL_MAX ? null : DATA.SILO.COUT[state.silo.niveau];
}

export function wheatTotal(state) {
  return state.silo.ble + countItem(state, DATA.SILO.ITEM);
}

// Range du blé récolté : d'abord dans le Silo jusqu'à sa capacité, le surplus
// dans l'inventaire. Renvoie { silo, inventaire }.
export function storeWheat(state, qty) {
  if (!(qty > 0)) return { silo: 0, inventaire: 0 };
  const room = Math.max(0, siloCapacity(state) - state.silo.ble);
  const silo = Math.min(room, qty);
  state.silo.ble += silo;
  const inventaire = qty - silo;
  if (inventaire > 0) addItem(state, DATA.SILO.ITEM, inventaire);
  return { silo, inventaire };
}

// Fait passer le blé de l'inventaire dans le Silo, tant qu'il y a de la place
// (le lot le plus ancien d'abord : c'est lui qui périrait le premier). Renvoie
// la quantité rangée.
export function fillSilo(state) {
  const room = Math.max(0, siloCapacity(state) - state.silo.ble);
  const n = takeItem(state, DATA.SILO.ITEM, room);
  state.silo.ble += n;
  return n;
}

// Retire exactement `qty` blé (tout ou rien), en commençant par l'inventaire
// (`first` = 'inventaire', par défaut : ce blé-là périme) ou par le Silo
// (`first` = 'silo'). Renvoie true si le retrait a eu lieu.
export function takeWheat(state, qty, first = 'inventaire') {
  if (wheatTotal(state) + EPS < qty) return false;
  let rest = qty;
  const fromSilo = () => {
    const n = Math.min(state.silo.ble, rest);
    state.silo.ble -= n;
    rest -= n;
  };
  const fromStock = () => {
    if (rest > EPS) rest -= takeItem(state, DATA.SILO.ITEM, rest);
  };
  if (first === 'silo') {
    fromSilo();
    fromStock();
  } else {
    fromStock();
    fromSilo();
  }
  return true;
}

// Le Silo est offert (construction à 0 dans DATA) mais reste à construire.
export function buildSilo(state) {
  const s = state.silo;
  if (s.construit) return fail('Le Silo est déjà construit.');
  const cost = DATA.SILO.CONSTRUCTION;
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  s.construit = true;
  s.niveau = 1;
  fillSilo(state);
  return { ok: true, cost };
}

export function upgradeSilo(state) {
  if (!state.silo.construit) return fail('Construis d\'abord le Silo.');
  const cost = siloUpgradeCost(state);
  if (cost === null) return fail('Niveau maximum atteint.');
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  state.silo.niveau += 1;
  fillSilo(state);
  return { ok: true, cost };
}

/* ---------- Lot 4 : Poulailler et poules ---------- */

export function coopCapacity(state) {
  return state.poulailler.construit ? DATA.POULAILLER.CAPACITE[state.poulailler.niveau - 1] : 0;
}

export function coopUpgradeCost(state) {
  return state.poulailler.niveau >= DATA.LEVEL_MAX ? null : DATA.POULAILLER.COUT[state.poulailler.niveau];
}

export function buildPoulailler(state) {
  const p = state.poulailler;
  if (p.construit) return fail('Le Poulailler est déjà construit.');
  const cost = DATA.POULAILLER.CONSTRUCTION;
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  p.construit = true;
  p.niveau = 1;
  return { ok: true, cost };
}

export function upgradePoulailler(state) {
  if (!state.poulailler.construit) return fail('Construis d\'abord le Poulailler.');
  const cost = coopUpgradeCost(state);
  if (cost === null) return fail('Niveau maximum atteint.');
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  state.poulailler.niveau += 1;
  return { ok: true, cost };
}

// Prix fixe d'un animal : il ne dépend ni du nombre d'animaux ni du Marché.
export function animalPrice(kind) {
  return DATA.ANIMAUX[kind].prix;
}

// Achat d'une poule au Marché : refusé si le Poulailler n'existe pas, s'il
// est plein ou si les pièces manquent. Pas de revente.
export function buyAnimal(state, kind) {
  if (kind === 'mouton') return buySheep(state);
  if (kind === 'vache') return buyCow(state);
  if (kind !== 'poule') return fail('Cet animal n\'est pas en vente.');
  const p = state.poulailler;
  if (!p.construit) return fail('Construis d\'abord le Poulailler.');
  if (p.poules >= coopCapacity(state)) return fail('Le Poulailler est plein.');
  const price = animalPrice(kind);
  if (state.pieces + EPS < price) return fail('Pas assez de pièces.');
  spend(state, price);
  p.poules += 1;
  return { ok: true, cost: price };
}

// Combien d'animaux d'une espèce on peut encore acheter : les places libres,
// et ce que les pièces permettent (prix fixe).
export function animalRoom(state, kind) {
  if (kind === 'poule') return state.poulailler.construit ? Math.max(0, coopCapacity(state) - state.poulailler.poules) : 0;
  if (kind === 'mouton') return state.paturage.construit ? freeSheepPlaces(state) : 0;
  if (kind === 'vache') return state.paturage.construit ? freeCowPlaces(state) : 0;
  return 0;
}

export function animalBuyMax(state, kind) {
  if (!DATA.ANIMAUX[kind]) return 0;
  const price = animalPrice(kind);
  const payes = price > 0 ? Math.floor((state.pieces + EPS) / price) : Infinity;
  return Math.max(0, Math.min(animalRoom(state, kind), payes));
}

// Achète jusqu'à `qty` animaux, un par un (buyAnimal) : s'arrête quand la place
// ou les pièces manquent. Renvoie { ok, bought, cost }.
export function buyAnimals(state, kind, qty = 1) {
  let bought = 0;
  let cost = 0;
  let last = null;
  for (let i = 0; i < Math.max(1, Math.floor(Number(qty)) || 1); i++) {
    last = buyAnimal(state, kind);
    if (!last.ok) break;
    bought += 1;
    cost += last.cost;
  }
  if (bought === 0) return last;
  return { ok: true, bought, cost };
}

// Poules restant à nourrir cette nuit.
export function hensToFeed(state) {
  return state.poulailler.poules - state.poulailler.nourries;
}

// Nourrit une poule (au clic). Sous productivité 1, le geste ne compte qu'avec
// une probabilité égale à la productivité (tirage du générateur de l'état) : s'il
// rate, rien n'est retiré du blé et la poule reste à nourrir. Le blé est pris
// d'abord dans l'inventaire (il y périme), puis dans le Silo.
// Lot 7 : `auto` = true pour le nourrissage automatique du niveau 5, jamais
// réduit par la productivité.
export function feedHen(state, auto = false) {
  const p = state.poulailler;
  if (p.poules <= 0) return fail('Aucune poule à nourrir.');
  if (hensToFeed(state) <= 0) return fail('Toutes les poules sont nourries.');
  if (!canFeedHen(state)) return fail('Pas assez de blé.');
  const prod = auto ? 100 : productivity(state);
  if (prod < 100 && Math.floor(nextRandom(state) * 100) >= prod) return { ok: true, compte: false };
  if (!(p.restes > 0)) {
    // Un blé entamé : il nourrit cette poule et laisse des rations pour les
    // suivantes. Ration équilibrée (arbre v2) : 2 blé pour 5 poules si possible.
    const r = henRation(state);
    const ble = wheatTotal(state) >= r.ble ? r.ble : 1;
    takeWheat(state, ble, 'inventaire');
    state.jour.ble += ble;
    p.restes = ble === r.ble ? r.poules : DATA.ANIMAUX.poule.poulesParBle;
  }
  p.restes -= 1;
  p.nourries += 1;
  return { ok: true, compte: true };
}

// Ration des poules : { ble, poules } (1 blé → 2 poules, ou 2 blé → 5 poules).
export function henRation(state) {
  const poules = techFlag(state, 'poulesParBle');
  const ble = techFlag(state, 'parBle');
  return poules && ble ? { ble, poules } : { ble: 1, poules: DATA.ANIMAUX.poule.poulesParBle };
}

// Peut-on nourrir une poule de plus ? Oui s'il reste une ration entamée ou un blé.
export function canFeedHen(state) {
  return state.poulailler.restes > 0 || wheatTotal(state) >= 1;
}

// Blé nécessaire pour nourrir `n` poules de plus (rations entamées déduites).
export function wheatForHens(state, n) {
  const left = Math.max(0, n - (state.poulailler.restes || 0));
  const r = henRation(state);
  return Math.ceil((left * r.ble) / r.poules);
}

// « Nourrir tout » : une tentative par poule restante, tant qu'il reste du blé.
// Renvoie { ok, nourries, ratees } ; refusé si rien n'était possible.
export function feedAllHens(state, auto = false) {
  const p = state.poulailler;
  if (p.poules <= 0) return fail('Aucune poule à nourrir.');
  if (hensToFeed(state) <= 0) return fail('Toutes les poules sont nourries.');
  if (!canFeedHen(state)) return fail('Pas assez de blé.');
  let nourries = 0;
  let ratees = 0;
  const attempts = hensToFeed(state);
  for (let i = 0; i < attempts; i++) {
    const r = feedHen(state, auto);
    if (!r.ok) break; // plus de blé
    if (r.compte) nourries += 1;
    else ratees += 1;
  }
  return { ok: true, nourries, ratees };
}

// Étape nocturne : chaque poule nourrie pond ses œufs, puis les compteurs
// repartent à zéro. Les œufs pondus sont notés pour l'écran de réveil.
export function layEggs(state) {
  const p = state.poulailler;
  const def = DATA.ANIMAUX.poule;
  const eggs = p.nourries * def.oeufsParNuit;
  if (eggs > 0) addItem(state, def.produit, eggs);
  gainActionXp(state, 'oeuf', eggs); // version 1.7
  state.nuit.oeufs = eggs;
  p.nourries = 0;
  p.restes = 0; // une ration entamée ne se garde pas
  return eggs;
}

/* ---------- Lot 6 : Étable — moutons et vaches (paille, laine, lait) ---------- */

// state.paturage = { construit, places, compteur, compteurVache, moutons: [ { id,
// laine } ], vaches: [ { id } ] }. (« paturage » : identifiant historique ; le
// joueur lit « Étable ».)
// places : places acquises (0 avant l'ouverture) ; compteur / compteurVache :
// numéro du dernier mouton / de la dernière vache achetés (les identifiants ne
// sont jamais réutilisés) ; laine : nuits nourries depuis la dernière tonte (le
// mouton seulement : la vache donne son lait la nuit même où elle mange).

// Nombre de moutons que `places` places accueillent (1 place chacun).
export function maxSheep(places) {
  return Math.floor(places / DATA.PATURAGE.placesParMouton);
}

// Nombre de vaches que `places` places accueillent (3 places chacune).
export function maxCows(places) {
  return Math.floor(places / DATA.PATURAGE.placesParVache);
}

export function sheepCount(state) {
  return state.paturage.moutons.length;
}

export function cowCount(state) {
  return state.paturage.vaches.length;
}

// Places prises par les moutons seuls / par les vaches seules.
export function sheepPlaces(state) {
  return sheepCount(state) * DATA.PATURAGE.placesParMouton;
}

export function cowPlaces(state) {
  return cowCount(state) * DATA.PATURAGE.placesParVache;
}

// Places prises par tous les animaux (les places sont communes aux deux espèces).
export function stableOccupied(state) {
  return sheepPlaces(state) + cowPlaces(state);
}

// Places encore libres.
export function stableFree(state) {
  return state.paturage.construit ? Math.max(0, state.paturage.places - stableOccupied(state)) : 0;
}

// Combien de moutons les places actuelles peuvent accueillir, compte tenu de
// celles que prennent les vaches.
export function pastureCapacity(state) {
  return state.paturage.construit ? maxSheep(Math.max(0, state.paturage.places - cowPlaces(state))) : 0;
}

// Combien de vaches les places actuelles peuvent accueillir, compte tenu de
// celles que prennent les moutons.
export function cowCapacity(state) {
  return state.paturage.construit ? maxCows(Math.max(0, state.paturage.places - sheepPlaces(state))) : 0;
}

// Moutons qu'on peut encore acheter.
export function freeSheepPlaces(state) {
  return Math.max(0, pastureCapacity(state) - sheepCount(state));
}

// Vaches qu'on peut encore acheter. Une vache demande 3 places : il faut
// parfois acheter plusieurs places à la suite (voir buyPasture()) avant qu'une
// vache tienne.
export function freeCowPlaces(state) {
  return Math.max(0, cowCapacity(state) - cowCount(state));
}

// Prix de la place suivante : 40 × 1,2^(n − 1) arrondi à l'entier supérieur, n
// étant le rang de l'achat au-delà des places de départ (11ᵉ place : 40,
// 12ᵉ : 48, 13ᵉ : 58). Le rang suit les places déjà achetées en plus, pas le
// nombre d'animaux.
export function pastureCost(state) {
  const P = DATA.PATURAGE;
  const rank = Math.max(0, state.paturage.places - P.placesDepart) + 1;
  // arbre v2 (Étable agrandie) : croissance du prix réduite
  const croissance = techFlag(state, 'croissanceSurface') || P.croissance;
  return growthPrice(P.prixPlace, croissance, rank - 1);
}

// Ouvre l'Étable aux moutons et aux vaches : les places de départ sont acquises.
export function buildPaturage(state) {
  const p = state.paturage;
  if (p.construit) return fail('L\'Étable accueille déjà les moutons et les vaches.');
  const cost = DATA.PATURAGE.deblocage;
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  p.construit = true;
  p.places = DATA.PATURAGE.placesDepart;
  return { ok: true, cost, places: p.places };
}

// Achète une place. Les places s'achètent à la suite, autant que les pièces le
// permettent, même s'il en reste de libres (une vache en demande 3) ; le prix
// suit les places déjà achetées (voir pastureCost()).
export function buyPasture(state) {
  const p = state.paturage;
  if (!p.construit) return fail('Prépare d\'abord l\'Étable pour les moutons et les vaches.');
  const cost = pastureCost(state);
  if (state.pieces + EPS < cost) return fail('Pas assez de pièces.');
  spend(state, cost);
  p.places += 1;
  return { ok: true, cost, places: p.places };
}

export function makeSheep(state) {
  const p = state.paturage;
  p.compteur += 1;
  return { id: `mouton-${p.compteur}`, laine: 0 };
}

// Achat d'un mouton au Marché : prix fixe, refusé si l'Étable n'est pas prête,
// sans place libre ou sans assez de pièces. Pas de revente.
export function buySheep(state) {
  const p = state.paturage;
  if (!p.construit) return fail('Prépare d\'abord l\'Étable pour les moutons et les vaches.');
  if (freeSheepPlaces(state) <= 0) return fail('L\'Étable est pleine : achète une place de plus.');
  const price = animalPrice('mouton');
  if (state.pieces + EPS < price) return fail('Pas assez de pièces.');
  spend(state, price);
  const sheep = makeSheep(state);
  p.moutons.push(sheep);
  return { ok: true, cost: price, id: sheep.id };
}

export function findSheep(state, id) {
  return state.paturage.moutons.find((m) => m.id === id) || null;
}

// La vache, sur le modèle du mouton (makeCow/buyCow/findCow).
export function makeCow(state) {
  const p = state.paturage;
  p.compteurVache += 1;
  return { id: `vache-${p.compteurVache}` };
}

// Achat d'une vache au Marché : prix fixe, refusé si l'Étable n'est pas prête,
// sans 3 places libres (voir freeCowPlaces()) ou sans assez de pièces. Pas de revente.
export function buyCow(state) {
  const p = state.paturage;
  if (!p.construit) return fail('Prépare d\'abord l\'Étable pour les moutons et les vaches.');
  if (freeCowPlaces(state) <= 0) {
    return fail(`Pas assez de place pour une vache : il lui faut ${DATA.PATURAGE.placesParVache} places libres.`);
  }
  const price = animalPrice('vache');
  if (state.pieces + EPS < price) return fail('Pas assez de pièces.');
  spend(state, price);
  const cow = makeCow(state);
  p.vaches.push(cow);
  return { ok: true, cost: price, id: cow.id };
}

export function findCow(state, id) {
  return state.paturage.vaches.find((v) => v.id === id) || null;
}

// Un mouton se tond quand il a été nourri le nombre de nuits voulu (2).
export function woolReady(m) {
  return m.laine >= DATA.ANIMAUX.mouton.joursLaine;
}

export function sheepToShear(state) {
  return state.paturage.moutons.filter(woolReady).length;
}

/* -- la paille -- */

// Paille en stock.
export function strawStock(state) {
  return countItem(state, DATA.PATURAGE.nourriture);
}

// Paille que tous les moutons et toutes les vaches mangent en une nuit.
export function strawNeed(state) {
  const A = DATA.ANIMAUX;
  return sheepCount(state) * A.mouton.pailleParNuit + cowCount(state) * A.vache.pailleParNuit;
}

// Paille qui manque pour nourrir tout le monde cette nuit (0 si le stock suffit).
export function strawMissing(state) {
  return Math.max(0, strawNeed(state) - strawStock(state));
}

// Compte rendu de la nuit à l'Étable : animaux présents, animaux nourris,
// paille mangée, paille qui a manqué, laine avancée et lait donné.
export function newStableReport() {
  return { moutons: 0, vaches: 0, moutonsNourris: 0, vachesNourries: 0, paille: 0, manque: 0 };
}

// Étape nocturne, juste après la ponte : les moutons puis les vaches mangent
// leur paille, dans l'ordre de leur liste, tant qu'il en reste assez pour
// l'animal suivant. Un mouton nourri voit sa laine avancer d'une nuit (jusqu'à
// la tonte) ; une vache nourrie donne son lait. Un animal qui n'a pas mangé ne
// produit rien cette nuit, et rien d'autre ne lui arrive : ni perte, ni maladie.
// La paille ne se partage pas : une vache qui n'a pas ses 2 pailles n'en mange aucune.
export function feedLivestock(state) {
  const A = DATA.ANIMAUX;
  const item = DATA.PATURAGE.nourriture;
  const p = state.paturage;
  const rap = newStableReport();
  rap.moutons = p.moutons.length;
  rap.vaches = p.vaches.length;
  const eat = (qty) => {
    if (countItem(state, item) < qty) {
      rap.manque += qty;
      return false;
    }
    takeItem(state, item, qty);
    rap.paille += qty;
    return true;
  };
  for (const m of p.moutons) {
    if (!eat(A.mouton.pailleParNuit)) continue;
    rap.moutonsNourris += 1;
    m.laine = Math.min(A.mouton.joursLaine, (m.laine || 0) + 1);
  }
  let lait = 0;
  for (const v of p.vaches) {
    if (!eat(A.vache.pailleParNuit)) continue;
    rap.vachesNourries += 1;
    lait += A.vache.laitParNuit;
  }
  if (lait > 0) addItem(state, A.vache.lait, lait);
  gainActionXp(state, 'lait', lait); // version 1.7
  if (!state.nuit) state.nuit = newNightStats();
  state.nuit.lait = lait;
  state.nuit.etable = rap;
  return rap;
}

// Tonte au clic : 1 laine, le compteur repart de zéro, le mouton reste. `auto` :
// tonte planifiée (moitié de l'XP, version 1.7).
export function shear(state, id, auto = false) {
  const m = findSheep(state, id);
  if (!m) return fail('Mouton introuvable.');
  const M = DATA.ANIMAUX.mouton;
  if (!woolReady(m)) return fail(`La laine n'est pas encore prête (${m.laine} / ${M.joursLaine} nuits nourri).`);
  addItem(state, M.laine, M.laineParTonte);
  m.laine = 0;
  bumpCounter(state, 'laines', M.laineParTonte); // Lot 9
  gainActionXp(state, 'tondre', 1, auto);
  return { ok: true, laine: M.laineParTonte };
}
