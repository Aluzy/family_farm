import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { fail } from './devices.js';
import { hache } from './ferme-generee.js';
import { farmSeed } from './terrain.js';
import { countItem, takeItem } from './inventory.js';
import { habitantsDe } from './habitants.js';
import { acteEnCours, aFait, ajouterConfiance, noterFait } from './recit.js';

/* ---------- l'usure des maisons des hameaux (le récit, lot 9 ; docs/recit/aventure.md, « la narration
   émergente ») ----------

   Depuis que Maurice est parti en voyage, quelques toits ont besoin d'un coup de main (rien ne s'abîme : le
   récit cosy). Les réglages : RECIT.USURE.
     - À partir de l'acte USURE.ACTE, la nuit, chaque hameau découvert et peuplé reçoit une fois (h.toitsVus)
       de 1 à USURE.MAX toits à rafraîchir, tirés avec la graine du monde et le hameau ; jamais plus ensuite.
       Le fait « toits.uses » est noté (les répliques).
     - Le joueur le répare depuis la fiche du hameau, sur place (reparerToit) : USURE.REPARER (pris dans
       son inventaire) ; la confiance du hameau gagne USURE.CONFIANCE points ; « toit.repare » est noté
       (une fois de plus à chaque toit : il compte dans ce que le joueur a rendu à l'île, finAventure).
     - L'enveloppe de Maurice portée à Odile (« enveloppe.donnee ») : plus aucun toit ne s'abîme, et
       chaque nuit l'un des toits abîmés est réparé (ENVELOPPE_CONFIANCE points pour son hameau ;
       « toit.repare.odile » est noté).
   Un toit abîmé se voit sur la carte (js/carte/ferme/hameaux.js : la couverture trouée).

   habitants[id].usees = [id de maison] : les maisons au toit abîmé (absent : aucune ; une maison
   inconnue de ses foyers est ôtée). */

export const USURE = DATA.RECIT.USURE;


// Les maisons au toit abîmé du hameau `id` (réparé au besoin : seulement des maisons de ses foyers, une
// fois chacune). → [id de maison] (la liste gardée dans la partie, [] sans habitants).
export function toitsUses(state, id) {
  const h = habitantsDe(state)[id];
  if (!h) return [];
  const maisons = new Set((h.foyers || []).map((f) => f.maison));
  const vu = new Set();
  const L = (Array.isArray(h.usees) ? h.usees : []).filter((m) => maisons.has(m) && !vu.has(m) && vu.add(m));
  if (L.length) h.usees = L; else delete h.usees;
  return L;
}

// Tous les toits abîmés : { [hameau]: [maisons] } (seulement les hameaux qui en ont).
export function tousLesToitsUses(state) {
  const out = {};
  for (const id of Object.keys(habitantsDe(state))) { const L = toitsUses(state, id); if (L.length) out[id] = L.slice(); }
  return out;
}

// La maison `maison` du hameau `id` a-t-elle son toit abîmé ?
export function toitUse(state, id, maison) {
  return toitsUses(state, id).includes(maison);
}

// Le personnage répare le toit de la maison `maison` du hameau `id` (il est sur place : la fiche du
// hameau). → { ok, items (ce qui est pris), confiance (la nouvelle) } ou un refus.
export function reparerToit(state, id, maison) {
  if (!toitUse(state, id, maison)) return fail('Ce toit n\'est pas abîmé.');
  const manque = Object.entries(USURE.REPARER).filter(([item, n]) => countItem(state, item) < n);
  if (manque.length) return fail(`Il faut ${Object.entries(USURE.REPARER).map(([item, n]) => `${n} ${DATA.OBJETS[item].nom.toLowerCase()}`).join(' et ')} pour réparer un toit.`);
  for (const [item, n] of Object.entries(USURE.REPARER)) takeItem(state, item, n);
  const h = habitantsDe(state)[id];
  h.usees = toitsUses(state, id).filter((m) => m !== maison);
  if (!h.usees.length) delete h.usees;
  noterFait(state, 'toit.repare');
  const r = ajouterConfiance(state, id, USURE.CONFIANCE);
  return { ok: true, items: { ...USURE.REPARER }, confiance: r.valeur };
}

// La nuit (recitNuit, js/engine/recit.js, avant que le jour change) : un toit s'abîme, ou, l'enveloppe donnée,
// un toit est réparé. → { use: { hameau, maison } | null, repare: { hameau, maison } | null }.
export function usureNuit(state) {
  const out = { use: null, repare: null };
  const H = habitantsDe(state);
  const ids = Object.keys(H).filter((id) => Array.isArray(H[id].foyers) && H[id].foyers.length);
  if (!ids.length) return out;
  if (aFait(state, 'enveloppe.donnee')) {
    const id = ids.find((x) => toitsUses(state, x).length);
    if (id) {
      const maison = toitsUses(state, id)[0];
      H[id].usees = toitsUses(state, id).slice(1);
      if (!H[id].usees.length) delete H[id].usees;
      ajouterConfiance(state, id, USURE.ENVELOPPE_CONFIANCE);
      noterFait(state, 'toit.repare.odile');
      out.repare = { hameau: id, maison };
    }
    return out;
  }
  // (une seule fois par hameau, à partir de l'acte USURE.ACTE : de 1 à USURE.MAX toits ont besoin d'un coup de main,
  // tirés avec la graine du monde et le hameau ; rien ne s'abîme ensuite. Un hameau qui en avait déjà : rien de plus.)
  if (acteEnCours(state) < USURE.ACTE) return out;
  for (const id of ids) {
    if (H[id].toitsVus) continue;
    H[id].toitsVus = true;
    if (toitsUses(state, id).length) continue;
    const rnd = mulberry32(hache(`${farmSeed(state) || 'monde'}:toits:${id}`));
    const maisons = H[id].foyers.map((f) => f.maison);
    const n = Math.min(maisons.length, 1 + Math.floor(rnd() * USURE.MAX));
    const choix = [];
    while (choix.length < n) { const m = maisons[Math.floor(rnd() * maisons.length)]; if (!choix.includes(m)) choix.push(m); }
    H[id].usees = choix;
    noterFait(state, 'toits.uses');
    if (!out.use) out.use = { hameau: id, maison: choix[0] };
  }
  return out;
}
