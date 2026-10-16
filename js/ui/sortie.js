import { tick } from '../engine/energy.js';
import { bedtimeDue, clockHours, mealDue, nightActive } from '../engine/clock.js';
import { takeMeal } from '../engine/family.js';
import { setupPending } from '../engine/depart.js';
import { state } from './store.js';
import { persistState, safeStorageGet, safeStorageSet } from './storage.js';
import { setSimulatedAt, simulatedAt } from './loop.js';
import { showToast } from './toasts.js';
import { DATA } from '../engine/catalog.js';
import { buyCompany, companyIds, companyPlan, sellInTown, setCompanyQuota, townSellList } from '../engine/entreprises.js';

/* ---------- la promenade hors de la ferme : le temps continue de passer ---------- */

// En partant pour la carte de transition ou la ville (la flèche du bout du chemin, le bouton
// « Se promener en ville »), la partie est sauvegardée et le moment du départ noté. Là-bas,
// l'heure se déduit des deux (js/horloge-sortie.js). Au retour, le temps passé dehors est
// rejoué comme si le jeu était resté ouvert (le repas de 19 h compris), jusqu'à 22 h au plus :
// la nuit commence alors ici, comme d'habitude. Sans sortie notée, une absence suit la règle
// hors-ligne (l'horloge s'arrête quand le jeu est fermé).
const CLE = 'ferme-sortie';
// Version 1.20 : en partant, la ferme écrit aussi sa « vitrine » (ce qu'on peut vendre aux étals
// de la ville et à quel prix, les pièces, les entreprises) ; la page de la ville (qui n'a pas le
// moteur du jeu) l'affiche et note les ordres du joueur (« ferme-ordres » : ventes, achats
// d'entreprises, quotas). Au retour, ils sont passés par le moteur, après le temps rejoué.
const VITRINE = 'ferme-vitrine';
const ORDRES = 'ferme-ordres';

function vitrine(depuis) {
  const owned = (state.ville && state.ville.entreprises) || {};
  return {
    depuis,
    pieces: Math.floor(state.pieces),
    vente: townSellList(state).map((r) => ({ ...r, nom: DATA.items[r.item].nom, icone: DATA.items[r.item].icone })),
    entreprises: companyIds().map((id) => {
      const d = DATA.VILLE.ENTREPRISES.LISTE[id], c = owned[id];
      return {
        id, nom: d.nom, icone: d.icone, prix: d.prix, texte: d.texte, par: d.par, intrantNom: d.intrantNom,
        produit: d.produit, prixProduit: d.prixProduit, quotaMax: d.quotaMax, heure: DATA.VILLE.ENTREPRISES.HEURE,
        achetee: !!c, quota: c ? c.quota : d.quota, dispo: c ? companyPlan(state, id).dispo : null, bilan: c ? c.bilan : null,
      };
    }),
  };
}

// Les ordres notés en ville (ventes d'abord : elles paient les achats), puis le résumé.
function applyOrdres(depuis) {
  let o = null;
  try { o = JSON.parse(safeStorageGet(ORDRES) || 'null'); } catch (e) { o = null; }
  try { localStorage.removeItem(ORDRES); localStorage.removeItem(VITRINE); } catch (e) { /* ignoré */ }
  if (!o || o.depuis !== depuis) return '';
  const parts = [];
  let gain = 0, n = 0;
  for (const [item, q] of Object.entries(o.ventes || {})) {
    const r = DATA.items[item] ? sellInTown(state, item, q) : null;
    if (r && r.ok) { gain += r.gain; n += r.sold; }
  }
  if (n) parts.push(`vendu en ville : ${n} produits, +${gain} 💰`);
  for (const id of o.achats || []) {
    const r = buyCompany(state, id);
    if (r.ok) parts.push(`${DATA.VILLE.ENTREPRISES.LISTE[id].nom.toLowerCase()} achetée`);
  }
  for (const [id, q] of Object.entries(o.quotas || {})) setCompanyQuota(state, id, q);
  return parts.join(' · ');
}
const PAS_MS = 200;
const MAX_MS = 30 * 60 * 1000;

export function markSortie() {
  persistState();
  safeStorageSet(CLE, JSON.stringify({ depuis: simulatedAt }));
  try { localStorage.removeItem(ORDRES); } catch (e) { /* ignoré */ }
  safeStorageSet(VITRINE, JSON.stringify(vitrine(simulatedAt)));
}

// Au chargement de la page : rejoue la sortie notée (et l'efface). Renvoie les heures passées,
// ou 0.
export function applySortie(now = Date.now()) {
  let rec = null;
  try { rec = JSON.parse(safeStorageGet(CLE) || 'null'); } catch (e) { rec = null; }
  try { localStorage.removeItem(CLE); } catch (e) { /* ignoré */ }
  if (!rec || !Number.isFinite(rec.depuis) || Math.abs(rec.depuis - simulatedAt) > 10000) {
    try { localStorage.removeItem(ORDRES); localStorage.removeItem(VITRINE); } catch (e) { /* ignoré */ }
    return 0;
  }
  if (setupPending(state)) return 0;
  if (nightActive(state)) {
    const fait = applyOrdres(rec.depuis);
    if (fait) { persistState(); showToast(`🏙️ ${fait}`); }
    return 0;
  }
  const avant = clockHours(state);
  let ms = Math.min(MAX_MS, Math.max(0, now - rec.depuis));
  while (ms >= PAS_MS && !bedtimeDue(state)) {
    tick(state, PAS_MS / 1000, false);
    if (mealDue(state)) takeMeal(state);
    ms -= PAS_MS;
  }
  setSimulatedAt(now);
  const fait = applyOrdres(rec.depuis);
  persistState();
  const heures = clockHours(state) - avant;
  if (heures >= 0.25 || fait) showToast(`🏙️ De retour à la ferme : il est ${Math.floor(clockHours(state))} h.${fait ? ` ${fait[0].toUpperCase()}${fait.slice(1)}.` : ''}`);
  return heures;
}

// Les liens vers la ville notent la sortie ; la flèche de la carte (js/farm-stage.js) aussi.
document.addEventListener('click', (e) => {
  const a = e.target && e.target.closest ? e.target.closest('a[href^="ville-carte.html"]') : null;
  if (a) markSortie();
}, true);
window.FermeSortie = { mark: markSortie };
