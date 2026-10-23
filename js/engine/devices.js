import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { techFlag } from './techtree.js';
import { noteCompta } from './compta.js';
import { levelBlock, unlockLevel } from './levels.js';

/* ---------- appareils : fabrication et sélecteurs ---------- */

export function newDayStats() {
  // produite, perdue : mWh ; eau : mL pompés ; ble : blé mangé par les poules
  // pendant la journée (Lot 4). Version 1.8 : plus de soins.
  return { produite: 0, perdue: 0, eau: 0, ble: 0 };
}

// Unités entières du moteur : le temps en ms, l'énergie en mWh, l'eau en mL.
// Une quantité par seconde (mWh/s, mL/s) × une durée en ms → ⌊taux × ms ÷ 1 000⌋.
export function perTick(rate, dtMs) {
  return Math.floor((rate * dtMs) / 1000);
}

// Taux par seconde (arrondi vers le bas) d'une quantité écoulée en `dtMs` ms.
export function perSecond(amount, dtMs) {
  return dtMs > 0 ? Math.floor((amount * 1000) / dtMs) : 0;
}

// Appareil qui consomme quand il tourne (d.conso) : le frigo et les ateliers électriques
// (Moulin, Presse : DATA.STATIONS[].electrique).
export function drawsPower(type) {
  return type === 'frigo' || !!(DATA.STATIONS[type] && DATA.STATIONS[type].electrique);
}

export function makeDevice(type, id, prix) {
  // usure : points entiers ; usureMs : temps de marche (ms) depuis le dernier point.
  const d = { id, type, niveau: 1, allume: true, usure: 0, usureMs: 0, prix };
  if (type === 'batterie') {
    d.chargeMwh = 0;
    d.entree = 0; // mWh/s reçus au dernier tick
    d.sortie = 0; // mWh/s soutirés au dernier tick
  } else if (type === 'panneau') {
    d.prod = 0; // mWh/s produits au dernier tick
  } else if (type === 'pompe') {
    d.debit = 0; // mL/s réellement pompés au dernier tick
    d.conso = 0; // mWh/s consommés au dernier tick
  } else if (drawsPower(type)) {
    d.conso = 0; // mWh/s consommés au dernier tick (0 en pause ou au repos)
  }
  return d;
}

// Appareils des stations électriques déjà construites (Moulin, Presse).
function stationDevices(state) {
  if (!state.stations) return [];
  return Object.keys(DATA.STATIONS)
    .filter((id) => DATA.STATIONS[id].electrique && state.stations[id] && state.stations[id].appareil)
    .map((id) => state.stations[id].appareil);
}

// Appareils et réserves de départ : le panneau, la batterie, la pompe et le
// réservoir. Version 1.6 : un seul panneau et une seule batterie, qui montent de
// niveau ; `panneaux` et `batteries` restent des listes (d'un seul appareil) pour
// que le flux d'énergie garde sa forme. Le réservoir n'est pas un appareil (ni
// usure, ni interrupteur) : `reservoir.niveau` fixe sa capacité, `eauMl` est son
// contenu en mL.
export function startFarm() {
  const prix = DATA.DEPART.PRIX_APPAREIL;
  return {
    panneaux: [makeDevice('panneau', 'panneau-1', prix)],
    batteries: [makeDevice('batterie', 'batterie-1', prix)],
    pompe: makeDevice('pompe', 'pompe', prix),
    reservoir: { niveau: 1 },
    eauMl: 0,
    flux: { perdue: 0, eau: 0 }, // mWh/s perdus, mL/s reçus par le réservoir au dernier tick
    jour: newDayStats(),
    report: null,
  };
}

/* ---------- version 1.12 (v2, lot 8) : appareils de départ à acheter ---------- */

// Le panneau, la batterie, la pompe et le réservoir d'une nouvelle partie portent
// `achete: false` jusqu'à leur achat (voir depart.js) ; une ancienne partie ou une
// partie de test n'a pas ce champ : tout y est acheté.
export function starterOf(state, type) {
  if (type === 'panneau') return state.panneaux[0];
  if (type === 'batterie') return state.batteries[0];
  if (type === 'pompe') return state.pompe;
  if (type === 'reservoir') return state.reservoir;
  return null;
}

export function isOwned(obj) {
  return !!obj && obj.achete !== false;
}

// Le panneau ET la pompe posés.
export function farmOpen(state) {
  return isOwned(starterOf(state, 'panneau')) && isOwned(starterOf(state, 'pompe'));
}

// Le Marché de la ferme est-il ouvert ? Au niveau qui débloque « marche » (NIVEAUX).
export function marcheOuvert(state) {
  return !levelBlock(state, 'marche');
}

// Pourquoi le Marché est fermé (texte).
export function marcheFerme() {
  return `Le Marché ouvre au niveau ${unlockLevel('marche')}.`;
}

const NOT_OWNED = 'Cet appareil n\'est pas encore acheté.';

// Lot 8 : le réfrigérateur est un appareil du parc une fois construit.
function fridgeDevices(state) {
  return state.frigo && state.frigo.construit && state.frigo.appareil ? [state.frigo.appareil] : [];
}

export function allDevices(state) {
  return [...state.panneaux, ...state.batteries, state.pompe, ...stationDevices(state), ...fridgeDevices(state)];
}

export function findDevice(state, id) {
  return allDevices(state).find((d) => d.id === id) || null;
}

// Rendement d'un appareil en % entier : 100 − ⌊usure ÷ 2⌋.
export function efficiency(d) {
  return 100 - Math.floor((d.usure * 100) / DATA.USURE.DIVISEUR_RENDEMENT);
}

export function isBroken(d) {
  return d.usure >= DATA.USURE.PANNE;
}

export function needsService(d) {
  return !isBroken(d) && d.usure >= DATA.USURE.SEUIL_ENTRETIEN;
}

// Production d'un panneau à son niveau et son usure actuels (mWh/s entiers).
// Avec `state`, le bonus solaire de l'arbre (Panneaux orientables) s'y applique.
export function panelOutput(d, state) {
  const base = Math.floor((DATA.RESEAU.panneau.whParS[d.niveau - 1] * 1000 * efficiency(d)) / 100);
  return state ? Math.floor((base * solarFactor(state)) / 100) : base;
}

// Facteur solaire (%) : 100, ou le bonus des Panneaux orientables (version 1.6 :
// plus de saisons, le nœud donne un bonus toute l'année).
function solarFactor(state) {
  return techFlag(state, 'solaireBonus') || 100;
}

// Capacité utile d'une batterie (mWh) : capacité(niveau) × rendement.
export function batteryCapacity(d) {
  return Math.floor((DATA.RESEAU.batterie.wh[d.niveau - 1] * 1000 * efficiency(d)) / 100);
}

// Énergie stockée dans toutes les batteries (mWh), et leur capacité utile totale.
export function storedEnergy(state) {
  return state.batteries.reduce((t, b) => t + b.chargeMwh, 0);
}

export function storageCapacity(state) {
  return state.batteries.reduce((t, b) => t + batteryCapacity(b), 0);
}

// Débit de la pompe (mL/s) selon son niveau et son rendement.
export function pumpFlow(d) {
  return Math.floor((DATA.RESEAU.pompe.litresParS[d.niveau - 1] * 1000 * efficiency(d)) / 100);
}

// Capacité du réservoir (mL), selon son propre niveau.
export function tankCapacity(state) {
  if (!isOwned(state.reservoir)) return 0; // version 1.12 : pas encore acheté
  return DATA.RESEAU.reservoir.litres[state.reservoir.niveau - 1] * 1000;
}

// Part (ms) d'une période de l'horloge, de `fromMs` à `fromMs + dtMs` (temps
// d'éveil), où le soleil brille : entre SOLEIL.DEBUT h et SOLEIL.FIN h, chaque jour
// de l'horloge (elle repasse à 0 h si personne ne dort).
export function sunlitMs(fromMs, dtMs) {
  const hourMs = DATA.TEMPS.SECONDES_PAR_HEURE * 1000;
  const dayMs = 24 * hourMs;
  const debut = (DATA.SOLEIL.DEBUT - DATA.TEMPS.HEURE_REVEIL) * hourMs;
  const fin = (DATA.SOLEIL.FIN - DATA.TEMPS.HEURE_REVEIL) * hourMs;
  let lit = 0;
  const end = fromMs + dtMs;
  for (let day = Math.floor(fromMs / dayMs) * dayMs; day < end; day += dayMs) {
    lit += Math.max(0, Math.min(end, day + fin) - Math.max(fromMs, day + debut));
  }
  return lit;
}

export function maintainCost(d) {
  return percentCeil(d.prix, DATA.USURE.TAUX_ENTRETIEN);
}

export function repairCost(d) {
  return percentCeil(d.prix, DATA.USURE.TAUX_REPARATION);
}

// Coût du niveau suivant d'un appareil (ou du réservoir : { type: 'reservoir',
// niveau }). Le Moulin, la Presse et le frigo n'ont pas de niveaux (null).
export function upgradeCost(d) {
  if (!DATA.RESEAU[d.type]) return null;
  return nextLevelCost(DATA.RESEAU[d.type].prixNiveaux, d.niveau);
}

// Prix du niveau suivant dans une table de prix (couts[n] : du niveau n au niveau n + 1),
// ou null à partir du niveau `max` (DATA.NIVEAU_MAX par défaut).
export function nextLevelCost(couts, niveau, max = DATA.NIVEAU_MAX) {
  return niveau >= max ? null : couts[niveau];
}

// Pièces entières : tout prix calculé est arrondi à l'entier supérieur.
// percentCeil(x, p) = ⌈x × p ÷ 100⌉, en arithmétique entière.
export function percentCeil(x, pct) {
  const num = BigInt(Math.round(x)) * BigInt(Math.round(pct));
  return Number((num + 99n) / 100n);
}

// Prix croissant : ⌈base × (pct ÷ 100)^n⌉, calculé exactement en entiers
// (BigInt) pour éviter toute dérive des puissances décimales.
export function growthPrice(base, pct, n) {
  const k = Math.max(0, Math.floor(n));
  const num = BigInt(Math.round(base)) * BigInt(Math.round(pct)) ** BigInt(k);
  const den = 100n ** BigInt(k);
  return Number((num + den - 1n) / den);
}

/* ---------- actions du moteur ---------- */

export function fail(error) {
  return { ok: false, error };
}

// Toute dépense passe par ici, avec son libellé pour les Comptes (compta.js).
export function spend(state, cost, libelle = 'Dépense') {
  state.pieces = Math.round(state.pieces - cost);
  noteCompta(state, -cost, libelle);
}

export const NO_COINS = 'Pas assez de pièces.';

// Les pièces suffisent-elles pour payer `cost` ? (à EPS près)
export function canPay(state, cost) {
  return !(state.pieces + EPS < cost);
}

// Paie `cost` (spend, avec son libellé) si les pièces suffisent ; sinon renvoie false
// sans rien dépenser : `if (!pay(state, cost, libelle)) return fail(NO_COINS);`.
export function pay(state, cost, libelle) {
  if (!canPay(state, cost)) return false;
  spend(state, cost, libelle);
  return true;
}

// Construction (ou ouverture) d'un bâtiment `id` débloqué par un niveau : refusée s'il
// l'est déjà (`built` vrai, refus `deja`), avant son niveau (levelBlock, version 1.12),
// si `requis()` renvoie un refus, ou sans assez de pièces. Sinon le prix est payé et
// `poser()` installe le bâtiment (ce qu'il renvoie complète le résultat { ok, cost }).
export function buildWith(state, id, { built, deja, cost, libelle, requis = null }, poser) {
  if (built) return fail(deja);
  const lock = levelBlock(state, id);
  if (lock) return fail(lock);
  const refus = requis ? requis() : '';
  if (refus) return fail(refus);
  if (!pay(state, cost, libelle)) return fail(NO_COINS);
  return { ok: true, cost, ...poser() };
}

// Niveau suivant d'un bâtiment ou d'un appareil : refusé au niveau maximum (`cost` null,
// refus `maxi`) ou sans assez de pièces. Sinon le prix est payé et `monter()` fait monter
// le niveau (ce qu'il renvoie complète le résultat { ok, cost }).
export function upgradeWith(state, cost, libelle, monter, maxi = 'Niveau maximum atteint.') {
  if (cost === null) return fail(maxi);
  if (!pay(state, cost, libelle)) return fail(NO_COINS);
  return { ok: true, cost, ...monter() };
}

// Nom d'un appareil, pour les libellés des Comptes (un atelier : son nom, DATA.STATIONS).
const DEVICE_LABELS = { panneau: 'Panneau solaire', batterie: 'Batterie', pompe: 'Pompe', reservoir: 'Réservoir', frigo: 'Réfrigérateur' };
export function deviceLabel(type) {
  return DEVICE_LABELS[type] || (DATA.STATIONS[type] && DATA.STATIONS[type].nom) || type;
}

export function toggleDevice(state, id) {
  const d = findDevice(state, id);
  if (!d) return fail('Appareil introuvable.');
  if (!isOwned(d)) return fail(NOT_OWNED);
  if (isBroken(d)) return fail('Appareil en panne : il faut le réparer.');
  d.allume = !d.allume;
  if (!d.allume && drawsPower(d.type)) d.conso = 0;
  return { ok: true };
}

export function upgradeDevice(state, id) {
  const d = findDevice(state, id);
  if (!d) return fail('Appareil introuvable.');
  if (!isOwned(d)) return fail(NOT_OWNED);
  if (!DATA.RESEAU[d.type]) return fail('Cet appareil n\'a pas de niveaux.');
  return upgradeWith(state, upgradeCost(d), `Amélioration : ${deviceLabel(d.type)}`, () => { d.niveau += 1; });
}

// Le réservoir monte de niveau (version 1.6 : il ne suit plus la pompe).
export function upgradeTank(state) {
  if (!isOwned(state.reservoir)) return fail('Le réservoir n\'est pas encore acheté.');
  const cost = upgradeCost({ type: 'reservoir', niveau: state.reservoir.niveau });
  return upgradeWith(state, cost, 'Amélioration : Réservoir', () => { state.reservoir.niveau += 1; });
}

export function maintainDevice(state, id) {
  const d = findDevice(state, id);
  if (!d) return fail('Appareil introuvable.');
  if (isBroken(d)) return fail('Appareil en panne : il faut le réparer.');
  if (d.usure <= 0 && !(d.usureMs > 0)) return fail('Cet appareil n\'est pas usé.');
  const cost = maintainCost(d);
  if (!pay(state, cost, `Entretien : ${deviceLabel(d.type)}`)) return fail(NO_COINS);
  d.usure = 0;
  d.usureMs = 0;
  return { ok: true, cost };
}

// Une réparation remet l'usure à 0 ; l'appareil reste éteint : c'est au
// joueur de le rallumer.
export function repairDevice(state, id) {
  const d = findDevice(state, id);
  if (!d) return fail('Appareil introuvable.');
  if (!isBroken(d)) return fail('Cet appareil n\'est pas en panne.');
  const cost = repairCost(d);
  if (!pay(state, cost, `Réparation : ${deviceLabel(d.type)}`)) return fail(NO_COINS);
  d.usure = 0;
  d.usureMs = 0;
  d.allume = false;
  return { ok: true, cost };
}
