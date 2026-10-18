import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { buildWith, fail, growthPrice, nextLevelCost, NO_COINS, pay, upgradeWith } from './devices.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { deposit } from './ramassage.js';
import { newNightStats } from './family.js';
import { techFlag } from './techtree.js';
import { bumpCounter } from './campaign.js';
import { gainActionXp } from './levels.js';
import { canAfford, spendEnergy, TIRED } from './stamina.js';
import { farmSeed } from './terrain.js';
import { etatPoulailler } from './blocs.js';

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
  return nextLevelCost(DATA.SILO.PRIX_NIVEAUX, state.silo.niveau);
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

// Le blé a deux places, l'inventaire et le Silo ; les autres objets, l'inventaire seul.
// Quantité d'un objet, blé du Silo compris (semis, ingrédients).
export function countWithSilo(state, item) {
  return item === DATA.SILO.ITEM ? wheatTotal(state) : countItem(state, item);
}

// Retire `qty` unités (le blé : tout ou rien, l'inventaire d'abord, puis le Silo) ;
// renvoie la quantité retirée.
export function takeWithSilo(state, item, qty) {
  if (item === DATA.SILO.ITEM) return takeWheat(state, qty, 'inventaire') ? qty : 0;
  return takeItem(state, item, qty);
}

// Range un produit : le blé d'abord au Silo (storeWheat), le reste dans l'inventaire.
export function storeWithSilo(state, item, qty) {
  if (item === DATA.SILO.ITEM) storeWheat(state, qty);
  else addItem(state, item, qty);
}

// Le Silo est offert (construction à 0 dans DATA) mais reste à construire.
export function buildSilo(state) {
  const s = state.silo;
  // la ferme générée : un coffre à grain, fabriqué à l'Atelier, posé dans une pièce close (blocs.js)
  if (farmSeed(state) !== null) return fail('Sur une terre sauvage, le Silo se bâtit : une pièce close et un coffre à grain (Atelier).');
  return buildWith(state, 'silo', { built: s.construit, deja: 'Le Silo est déjà construit.', cost: DATA.SILO.PRIX_CONSTRUCTION, libelle: 'Réparation du Silo' }, () => {
    s.construit = true;
    s.niveau = 1;
    fillSilo(state);
  });
}

export function upgradeSilo(state) {
  if (!state.silo.construit) return fail('Construis d\'abord le Silo.');
  return upgradeWith(state, siloUpgradeCost(state), 'Silo agrandi', () => {
    state.silo.niveau += 1;
    fillSilo(state);
  });
}

/* ---------- Lot 4 : Poulailler et poules ---------- */

// Sur la ferme générée, une poule par case libre de l'enceinte et de l'enclos, au plus
// (etatPoulailler, blocs.js) : la capacité du niveau, bornée par la place.
export function coopCapacity(state) {
  if (!state.poulailler.construit) return 0;
  const cap = DATA.POULAILLER.CAPACITE[state.poulailler.niveau - 1];
  return farmSeed(state) === null ? cap : Math.min(cap, etatPoulailler(state).places);
}

export function coopUpgradeCost(state) {
  return nextLevelCost(DATA.POULAILLER.PRIX_NIVEAUX, state.poulailler.niveau);
}

export function buildPoulailler(state) {
  const p = state.poulailler;
  // la ferme générée : un nichoir, fabriqué à l'Atelier, posé dans une pièce close (blocs.js)
  if (farmSeed(state) !== null) return fail('Sur une terre sauvage, le Poulailler se bâtit : une enceinte de murs avec une porte sur l\'extérieur, un nichoir (Atelier), et un enclos de barrières relié par une porte.');
  return buildWith(state, 'poulailler', { built: p.construit, deja: 'Le Poulailler est déjà construit.', cost: DATA.POULAILLER.PRIX_CONSTRUCTION, libelle: 'Poulailler' }, () => {
    p.construit = true;
    p.niveau = 1;
  });
}

export function upgradePoulailler(state) {
  if (!state.poulailler.construit) return fail('Construis d\'abord le Poulailler.');
  // la ferme générée : il faut aussi la place des poules du niveau suivant (une case libre par
  // poule dans l'enceinte et dans l'enclos)
  const refus = coopUpgradeRefus(state);
  if (refus) return fail(refus);
  return upgradeWith(state, coopUpgradeCost(state), 'Poulailler agrandi', () => { state.poulailler.niveau += 1; });
}

// Sur la ferme générée, pourquoi le Poulailler ne peut pas monter de niveau (la place), ou null.
export function coopUpgradeRefus(state) {
  const p = state.poulailler;
  if (farmSeed(state) === null || !p.construit || p.niveau >= DATA.POULAILLER.CAPACITE.length) return null;
  const e = etatPoulailler(state), besoin = DATA.POULAILLER.CAPACITE[p.niveau];
  if (e.libresPiece.length >= besoin && e.libresEnclos.length >= besoin) return null;
  return `Pour le niveau ${p.niveau + 1} (${besoin} poules), il faut ${besoin} cases libres dans le poulailler et dans l'enclos : il y en a ${e.libresPiece.length} et ${e.libresEnclos.length}.`;
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
  if (!pay(state, price, 'Achat : Poule')) return fail(NO_COINS);
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
// d'abord dans l'inventaire (il y périme), puis dans le Silo. (Version 1.8 : plus de
// productivité, une poule nourrie à la main l'est toujours.)
export function feedHen(state) {
  const p = state.poulailler;
  if (p.poules <= 0) return fail('Aucune poule à nourrir.');
  if (hensToFeed(state) <= 0) return fail('Toutes les poules sont nourries.');
  if (!canFeedHen(state)) return fail('Pas assez de blé.');
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
  return { ok: true };
}

// Ration des poules : { ble, poules } (1 blé → 2 poules, ou 2 blé → 5 poules).
function henRation(state) {
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

// « Nourrir tout » : une poule après l'autre, tant qu'il reste du blé.
// Renvoie { ok, nourries } ; refusé si rien n'était possible.
export function feedAllHens(state) {
  const p = state.poulailler;
  if (p.poules <= 0) return fail('Aucune poule à nourrir.');
  if (hensToFeed(state) <= 0) return fail('Toutes les poules sont nourries.');
  if (!canFeedHen(state)) return fail('Pas assez de blé.');
  let nourries = 0;
  const attempts = hensToFeed(state);
  for (let i = 0; i < attempts; i++) {
    if (!feedHen(state).ok) break; // plus de blé
    nourries += 1;
  }
  return { ok: true, nourries };
}

// Étape nocturne : chaque poule nourrie pond ses œufs, puis les compteurs
// repartent à zéro. Les œufs pondus sont notés pour l'écran de réveil.
export function layEggs(state) {
  const p = state.poulailler;
  const def = DATA.ANIMAUX.poule;
  // (les poules en trop, au-delà des places, ne pondent pas : la ferme générée, coopCapacity)
  const eggs = Math.min(p.nourries, coopCapacity(state)) * def.oeufsParNuit;
  // version 1.18 : les œufs attendent au Poulailler que le personnage vienne les chercher
  if (eggs > 0) deposit(state, 'poulailler', null, { [def.produit]: eggs });
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
  return Math.floor(places / DATA.PATURAGE.PLACES_PAR_MOUTON);
}

// Nombre de vaches que `places` places accueillent (3 places chacune).
export function maxCows(places) {
  return Math.floor(places / DATA.PATURAGE.PLACES_PAR_VACHE);
}

export function sheepCount(state) {
  return state.paturage.moutons.length;
}

export function cowCount(state) {
  return state.paturage.vaches.length;
}

// Places prises par les moutons seuls / par les vaches seules.
export function sheepPlaces(state) {
  return sheepCount(state) * DATA.PATURAGE.PLACES_PAR_MOUTON;
}

export function cowPlaces(state) {
  return cowCount(state) * DATA.PATURAGE.PLACES_PAR_VACHE;
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
  const rank = Math.max(0, state.paturage.places - P.PLACES_DEPART) + 1;
  // arbre v2 (Étable agrandie) : croissance du prix réduite
  const croissance = techFlag(state, 'croissanceSurface') || P.CROISSANCE;
  return growthPrice(P.PRIX_PLACE, croissance, rank - 1);
}

// Ouvre l'Étable aux moutons et aux vaches : les places de départ sont acquises.
export function buildPaturage(state) {
  const p = state.paturage;
  const deja = 'L\'Étable accueille déjà les moutons et les vaches.';
  // la ferme générée : une mangeoire, fabriquée à l'Atelier, posée dans une pièce close (blocs.js)
  if (farmSeed(state) !== null) return fail('Sur une terre sauvage, l\'Étable se bâtit : une pièce close et une mangeoire (Atelier).');
  return buildWith(state, 'paturage', { built: p.construit, deja, cost: DATA.PATURAGE.PRIX_CONSTRUCTION, libelle: 'Étable préparée' }, () => {
    p.construit = true;
    p.places = DATA.PATURAGE.PLACES_DEPART;
    return { places: p.places };
  });
}

// Achète une place. Les places s'achètent à la suite, autant que les pièces le
// permettent, même s'il en reste de libres (une vache en demande 3) ; le prix
// suit les places déjà achetées (voir pastureCost()).
export function buyPasture(state) {
  const p = state.paturage;
  if (!p.construit) return fail('Prépare d\'abord l\'Étable pour les moutons et les vaches.');
  const cost = pastureCost(state);
  if (!pay(state, cost, 'Place à l\'Étable')) return fail(NO_COINS);
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
  if (!pay(state, price, 'Achat : Mouton')) return fail(NO_COINS);
  const sheep = makeSheep(state);
  p.moutons.push(sheep);
  return { ok: true, cost: price, id: sheep.id };
}

function findSheep(state, id) {
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
    return fail(`Pas assez de place pour une vache : il lui faut ${DATA.PATURAGE.PLACES_PAR_VACHE} places libres.`);
  }
  const price = animalPrice('vache');
  if (!pay(state, price, 'Achat : Vache')) return fail(NO_COINS);
  const cow = makeCow(state);
  p.vaches.push(cow);
  return { ok: true, cost: price, id: cow.id };
}

function findCow(state, id) {
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
  return countItem(state, DATA.PATURAGE.NOURRITURE);
}

// Paille que les moutons et les vaches mangent en une nuit (sans les vaches qui
// mangeront des herbes de montagne à la place, voir cowsOnHerbs()).
export function strawNeed(state) {
  const A = DATA.ANIMAUX;
  return sheepCount(state) * A.mouton.pailleParNuit + (cowCount(state) - cowsOnHerbs(state)) * A.vache.pailleParNuit;
}

/* -- les herbes de montagne : le lait d'alpage -- */

// Herbes de montagne en stock (une trouvaille de la montagne, DATA.PATURAGE.HERBES).
export function herbStock(state) {
  return countItem(state, DATA.PATURAGE.HERBES);
}

// Les vaches reçoivent-elles les herbes de montagne ? (state.paturage.herbes : le
// bouton de l'Étable ; absent dans les sauvegardes d'avant : non.)
export function herbsOn(state) {
  return !!(state.paturage && state.paturage.herbes);
}

// Donner (ou non) les herbes de montagne aux vaches, chaque nuit, tant qu'il y en a.
// (Le champ n'est écrit que s'il vaut true : l'Étable des sauvegardes d'avant ne change pas.)
export function setCowHerbs(state, on) {
  const p = state.paturage;
  if (on && !p.construit) return fail('Prépare d\'abord l\'Étable pour les moutons et les vaches.');
  if (on) p.herbes = true;
  else delete p.herbes;
  return { ok: true, herbes: !!on };
}

// Vaches qui mangeront des herbes cette nuit (les premières de la liste) : autant
// que le stock en nourrit, si l'Étable les leur donne.
export function cowsOnHerbs(state) {
  if (!herbsOn(state)) return 0;
  return Math.min(cowCount(state), Math.floor(herbStock(state) / DATA.ANIMAUX.vache.herbesParNuit));
}

// Paille qui manque pour nourrir tout le monde cette nuit (0 si le stock suffit).
export function strawMissing(state) {
  return Math.max(0, strawNeed(state) - strawStock(state));
}

// Compte rendu de la nuit à l'Étable : animaux présents, animaux nourris,
// paille mangée, paille qui a manqué ; herbes de montagne mangées et vaches
// nourries aux herbes (comptées aussi dans vachesNourries).
export function newStableReport() {
  return { moutons: 0, vaches: 0, moutonsNourris: 0, vachesNourries: 0, paille: 0, manque: 0, herbes: 0, vachesAlpage: 0 };
}

// Étape nocturne, juste après la ponte : les moutons puis les vaches mangent
// leur paille, dans l'ordre de leur liste, tant qu'il en reste assez pour
// l'animal suivant. Un mouton nourri voit sa laine avancer d'une nuit (jusqu'à
// la tonte) ; une vache nourrie donne son lait. Un animal qui n'a pas mangé ne
// produit rien cette nuit, et rien d'autre ne lui arrive : ni perte, ni maladie.
// La paille ne se partage pas : une vache qui n'a pas ses 2 pailles n'en mange aucune.
// Les herbes de montagne (si l'Étable les donne, voir setCowHerbs()) : une vache
// en mange herbesParNuit à la place de sa paille, tant qu'il en reste, et donne
// son lait en lait d'alpage ; sans herbes, elle reprend sa paille.
export function feedLivestock(state) {
  const A = DATA.ANIMAUX;
  const item = DATA.PATURAGE.NOURRITURE;
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
  let laitAlpage = 0;
  const herbes = DATA.PATURAGE.HERBES;
  for (const v of p.vaches) {
    if (herbsOn(state) && countItem(state, herbes) >= A.vache.herbesParNuit) {
      takeItem(state, herbes, A.vache.herbesParNuit);
      rap.herbes += A.vache.herbesParNuit;
      rap.vachesAlpage += 1;
      rap.vachesNourries += 1;
      laitAlpage += A.vache.laitParNuit;
      continue;
    }
    if (!eat(A.vache.pailleParNuit)) continue;
    rap.vachesNourries += 1;
    lait += A.vache.laitParNuit;
  }
  const produit = {};
  if (lait > 0) produit[A.vache.lait] = lait;
  if (laitAlpage > 0) produit[A.vache.laitAlpage] = laitAlpage;
  deposit(state, 'etable', null, produit); // version 1.18 : à l'Étable
  gainActionXp(state, 'lait', lait + laitAlpage); // version 1.7
  if (!state.nuit) state.nuit = newNightStats();
  state.nuit.lait = lait;
  state.nuit.laitAlpage = laitAlpage;
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
  if (!auto && !canAfford(state, 'tondre')) return fail(TIRED); // version 1.8
  const aRamasser = deposit(state, 'etable', null, { [M.laine]: M.laineParTonte }, !auto); // version 1.18
  m.laine = 0;
  bumpCounter(state, 'laines', M.laineParTonte); // Lot 9
  if (!auto) spendEnergy(state, 'tondre');
  gainActionXp(state, 'tondre', 1, auto);
  return { ok: true, laine: M.laineParTonte, aRamasser };
}
