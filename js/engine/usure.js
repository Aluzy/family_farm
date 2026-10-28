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

   Depuis que Maurice ne paie plus les toits, les maisons s'usent. Les réglages : RECIT.USURE.
     - À partir de l'acte USURE.ACTE, toutes les USURE.NUITS nuits, un toit s'abîme : dans un hameau
       découvert et peuplé (tiré avec la graine du monde et le jour), une maison qui ne l'est pas encore,
       tant que le hameau en a moins de USURE.MAX ; le fait « toits.uses » est noté (les répliques).
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

const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));

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
  if (acteEnCours(state) < USURE.ACTE || jourDe(state) % USURE.NUITS !== 0) return out;
  const rnd = mulberry32(hache(`${farmSeed(state) || 'monde'}:usure:${jourDe(state)}`));
  const possibles = ids.filter((id) => toitsUses(state, id).length < USURE.MAX);
  if (!possibles.length) return out;
  const id = possibles[Math.floor(rnd() * possibles.length)];
  const uses = new Set(toitsUses(state, id));
  const maisons = H[id].foyers.map((f) => f.maison).filter((m) => !uses.has(m));
  if (!maisons.length) return out;
  const maison = maisons[Math.floor(rnd() * maisons.length)];
  H[id].usees = [...uses, maison];
  noterFait(state, 'toits.uses');
  out.use = { hameau: id, maison };
  return out;
}
