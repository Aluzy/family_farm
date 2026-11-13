/* ==========================================================================
   Le portage (le chantier « l'île à bâtir », fiche I2 ; docs/ile.md). Les réglages : data/village.json
   (VILLAGE.PORTAGE).

   Ce qu'on vend au port, on l'y porte. state.portage = { vehicule, charge } (né au premier chargement, le
   chantier allumé) :
     - vehicule : 'mains' (MAINS volumes), 'brouette' (BROUETTE volumes : une brouette dans l'inventaire) ou
       'charrette' (CHARRETTE volumes : une charrette dans l'inventaire et un cheval ; elle s'attelle au cheval,
       on la mène en selle) ;
     - charge : { objet: [lots] } : ce qui est chargé, sorti de l'inventaire et du réfrigérateur avec sa
       fraîcheur (comme la malle de la calèche, caleche.js).
   Chaque objet a un volume (volumeDe : un, ou VOLUMES pour les lourds). On charge sur la ferme (chargerPortage :
   ce qui ne tient pas reste à la ferme, rien ne se perd), on reprend sur la ferme (dechargerPortage), on décharge
   sous la halle du port (dechargerAuPort : tout ce qui est chargé se vend d'un coup, au prix du port ; port.js
   vendreAuPort ne vend plus que ce qui est chargé). Les semences achetées au port vont droit à la ferme.
   `o.sansPresence` : le joueur automatique (bot.js), qui n'a pas de carte, charge et décharge sans case.
   ========================================================================== */

import { DATA } from './catalog.js';
import { EPS } from './base.js';
import { fail } from './devices.js';
import { keepLots, lotsOf, pullLots, pushLots } from './inventory.js';
import { fridgeLots } from './fridge.js';
import { encaisserVente, sellableCount } from './market.js';
import { bumpCounter } from './campaign.js';
import { villageActif } from './village.js';
import { farmTerrain } from './terrain.js';
import { chevalPossede } from './cheval.js';
import { horsFerme } from './dehors.js';
import { noterVenteBac } from './bac.js';

const P = () => DATA.VILLAGE.PORTAGE;
const nLots = (lots) => (Array.isArray(lots) ? lots.reduce((t, l) => t + (l.qty || 0), 0) : 0);
export const VEHICULES = ['mains', 'brouette', 'charrette'];

// Un matériau du chantier du port (fiche I1c : PORT.NIVEAUX[].prix, les planches, la pierre, les lingots) : il se
// porte au port même s'il ne se vend pas (les lingots) ; déchargé sous la halle, ce qui ne se vend pas reste chargé.
export function materiauDuChantier(item) {
  return item !== 'pieces' && ((DATA.PORT && DATA.PORT.NIVEAUX) || []).some((n) => n.prix && n.prix[item] > 0);
}

// Le volume d'une unité de `item`.
export function volumeDe(item) {
  const v = P().VOLUMES && P().VOLUMES[item];
  return Number.isInteger(v) && v > 0 ? v : 1;
}

// Le portage de la partie (créé s'il manque), ou null le chantier éteint.
export function portageDe(state) {
  if (!villageActif(state)) return null;
  if (!state.portage || typeof state.portage !== 'object' || Array.isArray(state.portage)) state.portage = { vehicule: 'mains', charge: {} };
  const p = state.portage;
  if (!VEHICULES.includes(p.vehicule)) p.vehicule = 'mains';
  if (!p.charge || typeof p.charge !== 'object' || Array.isArray(p.charge)) p.charge = {};
  return p;
}

// Ce que porte le véhicule `v` (en volumes).
export function capaciteDe(v) {
  return v === 'charrette' ? P().CHARRETTE : v === 'brouette' ? P().BROUETTE : P().MAINS;
}

// Peut-on partir avec `v` ? null, ou la raison.
export function refusVehicule(state, v) {
  if (v === 'mains') return null;
  if (v === 'brouette') return (state.inventaire && nLots(state.inventaire.brouette) > 0) ? null : 'Il te faut une brouette (l\'Atelier).';
  if (v === 'charrette') {
    if (!(state.inventaire && nLots(state.inventaire.charrette) > 0)) return 'Il te faut une charrette (l\'Atelier).';
    if (!chevalPossede(state)) return 'La charrette s\'attelle au cheval : il te faut un cheval.';
    return null;
  }
  return 'Véhicule inconnu.';
}

// Les façons de porter : [{ id, nom, icone, capacite, refus }].
export function vehiculesPortage(state) {
  const N = { mains: ['À la main', '🧺'], brouette: ['La brouette', '🛒'], charrette: ['La charrette attelée', '🐴'] };
  return VEHICULES.map((id) => ({ id, nom: N[id][0], icone: N[id][1], capacite: capaciteDe(id), refus: refusVehicule(state, id) }));
}

// Le véhicule de la partie : celui choisi, s'il est encore possible (une brouette vendue, un cheval parti : à la
// main). La scène montre la brouette devant le personnage à pied, la charrette attelée au cheval en selle.
export function vehiculePortage(state) {
  const p = portageDe(state);
  if (!p) return 'mains';
  return refusVehicule(state, p.vehicule) ? 'mains' : p.vehicule;
}

// Choisir comment porter (sur la ferme). → { ok, vehicule } ou le refus.
export function choisirVehicule(state, v, ou = null, o = {}) {
  const p = portageDe(state);
  if (!p) return fail('Il n\'y a pas de port.');
  if (!VEHICULES.includes(v)) return fail('Véhicule inconnu.');
  const r = refusVehicule(state, v);
  if (r) return fail(r);
  if (!o.sansPresence && !surLaFerme(state, ou)) return fail('On choisit son véhicule sur la ferme.');
  p.vehicule = v;
  return { ok: true, vehicule: v };
}

// La capacité du moment (en volumes).
export function capacitePortage(state) {
  return capaciteDe(vehiculePortage(state));
}

// Ce qui est chargé : { objet: n }.
export function chargeDe(state) {
  const p = villageActif(state) && state.portage && state.portage.charge;
  const out = {};
  if (!p || typeof p !== 'object') return out;
  for (const [k, lots] of Object.entries(p)) { const n = nLots(lots); if (n > 0 && DATA.OBJETS[k]) out[k] = n; }
  return out;
}

// Le volume chargé.
export function volumeCharge(state) {
  return Object.entries(chargeDe(state)).reduce((t, [k, n]) => t + n * volumeDe(k), 0);
}

// La place qui reste (en volumes ; 0 au plus bas : un chargement fait avec la charrette, en selle, reste chargé à
// pied, rien ne se perd).
export function placeRestante(state) {
  return Math.max(0, capacitePortage(state) - volumeCharge(state));
}

// Le personnage, sur la case `ou`, est-il sur la ferme ? (sans case : oui, le joueur automatique)
function surLaFerme(state, ou) {
  if (!Number.isInteger(ou) || ou < 0) return true;
  return !horsFerme(farmTerrain(state), ou);
}

// Charge `qty` unités de `item` (de l'inventaire, puis du réfrigérateur, les plus anciennes d'abord), autant qu'il
// en tient ; le reste demeure à la ferme. → { ok, n (chargé), reste (pas chargé faute de place) } ou le refus.
export function chargerPortage(state, item, qty, ou = null, o = {}) {
  const p = portageDe(state), def = DATA.OBJETS[item];
  if (!p) return fail('Il n\'y a pas de port.');
  if (!def) return fail('Objet inconnu.');
  if (def.invendable && !materiauDuChantier(item)) return fail(`${def.nom} ne se vend pas au port.`);
  if (!o.sansPresence && !surLaFerme(state, ou)) return fail('On charge sur la ferme.');
  const voulu = Math.min(Math.floor(Number(qty)) || 0, Math.floor(sellableCount(state, item) + EPS));
  if (voulu <= 0) return fail('Rien à charger.');
  const tient = Math.floor(placeRestante(state) / volumeDe(item));
  const n = Math.min(voulu, tient);
  if (n <= 0) return fail(`Plus de place (${capacitePortage(state)} volumes : ${def.nom.toLowerCase()} en prend ${volumeDe(item)}).`);
  const pris = [], inv = lotsOf(state, item), a = pullLots(inv, n);
  keepLots(state.inventaire, item, inv);
  pris.push(...a);
  let reste = n - nLots(a);
  if (reste > 0 && state.frigo && state.frigo.items) {
    const fr = fridgeLots(state, item), b = pullLots(fr, reste);
    keepLots(state.frigo.items, item, fr);
    pris.push(...b);
    reste -= nLots(b);
  }
  const lots = Array.isArray(p.charge[item]) ? p.charge[item] : [];
  pushLots(lots, pris);
  p.charge[item] = lots;
  return { ok: true, n: nLots(pris), reste: voulu - nLots(pris) };
}

// Reprend `qty` unités de `item` (tout sans qty ; tout le chargement sans item) dans l'inventaire, sur la ferme.
// → { ok, n } ou le refus.
export function dechargerPortage(state, item = null, qty = Infinity, ou = null, o = {}) {
  const p = portageDe(state);
  if (!p) return fail('Il n\'y a pas de port.');
  if (!o.sansPresence && !surLaFerme(state, ou)) return fail('On décharge à la ferme (ou sous la halle du port, pour vendre).');
  let n = 0;
  for (const k of item ? [item] : Object.keys(p.charge)) {
    const lots = p.charge[k], q = Math.min(nLots(lots), Math.floor(Number(qty)) || 0);
    if (!(q > 0)) continue;
    const pris = pullLots(lots, q);
    keepLots(p.charge, k, lots);
    const inv = lotsOf(state, k);
    pushLots(inv, pris);
    if (!state.inventaire) state.inventaire = {};
    keepLots(state.inventaire, k, inv);
    n += q;
  }
  return n > 0 ? { ok: true, n } : fail('Rien à reprendre.');
}

// Vend `qty` unités chargées de `item` (le port ouvert : port.js le vérifie). → { ok, sold, gain } ou le refus.
export function vendreCharge(state, item, qty) {
  const p = portageDe(state), def = DATA.OBJETS[item];
  if (!p || !def) return fail('Objet inconnu.');
  if (def.invendable) return fail(`${def.nom} ne se vend pas.`);
  const lots = p.charge[item], n = Math.min(nLots(lots), Math.floor(Number(qty)) || 0);
  if (!(n > 0)) return fail(`${def.nom} : rien de chargé. Ce qu'on vend au port, on l'y porte (charge-le à la ferme).`);
  pullLots(lots, n);
  keepLots(p.charge, item, lots);
  const gain = encaisserVente(state, item, n, 'Port');
  bumpCounter(state, 'ventesPort', gain);   // (les paliers de l'île, paliers.js : ventesPort)
  noterVenteBac(state, item, n);            // (fiche I1c : la vente attend le bac, en caisses sur le quai)
  return { ok: true, sold: n, gain };
}

// Tout ce qui est chargé se vend (sous la halle : port.js dechargerAuPort). → { ok, gain, vendus: { objet: n } }.
export function vendreToutLaCharge(state) {
  const vendus = {};
  let gain = 0;
  for (const [k, n] of Object.entries(chargeDe(state))) {
    if (DATA.OBJETS[k].invendable) continue;
    const r = vendreCharge(state, k, n);
    if (r.ok) { vendus[k] = r.sold; gain += r.gain; }
  }
  return Object.keys(vendus).length ? { ok: true, gain, vendus } : fail('Rien de chargé à vendre.');
}
