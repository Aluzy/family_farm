import { DATA } from './catalog.js';
import { fail, NO_COINS, pay } from './devices.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { garantiDuHameau, habitantsDe } from './habitants.js';
import { ajouterMeuble, meubleRefus } from './meubles.js';
import { isUnlocked } from './campaign.js';
import { hourOfDay } from './clock.js';
import { moonPhase } from './lune.js';
import { aFait, ageFait, ajouterConfiance, noterFait } from './recit.js';

/* ---------- l'économie de l'île (docs/recit/aventure.md ; le récit, lot 7) ----------

   Les hameaux garantis du récit ont leurs ateliers (data/ile.json, ILE.ATELIERS) : la scierie et
   l'ébéniste de Bois-Joli, le métier à tisser, la couture et les tapis des Genêts. Le joueur passe ses
   commandes au cocher, à la calèche (js/ui/caleche.js, l'onglet Commandes), une fois le hameau connu (ses
   habitants nés : il y est allé) ; le cocher porte ce qu'il faut et rapporte ce qui est fait :
     - une commande (sorte « commande ») : il laisse ce qu'il faut (les entrées, et les pièces s'il y en
       a) et reprend ce qui est fait `jours` jours plus tard (retirer, à son prochain passage) ;
     - un meuble (sorte « meubles ») : il l'achète sur place, au prix du meuble.
   L'argent va aux foyers du hameau (leur bourse, en parts égales, comme la calèche : caleche.js).

   Les commandes sont gardées avec les habitants du hameau : state.monde.habitants[id].commandes =
   [{ atelier, recette, lots, pret (le jour où elles sont prêtes) }] (absent : aucune ; le format de
   sauvegarde ne change pas, comme la réserve).

   La veillée à la ferme (l'élément « veillee » du niveau 10, à la place des commerces) : la première
   fois, la scène veillee_ferme (data/recit.json) ; ensuite, une fois par pleine lune, veilleeFerme. */

export const ILE = DATA.ILE;

// Le hameau garanti que sont les habitants `hameauId` (js/engine/habitants.js, le récit s'en sert aussi).
export { garantiDuHameau };

// Les ateliers du hameau `hameauId` : [{ id, nom, icone, sorte, qui, recettes, jours, max }] ([] : aucun).
export function ateliersDuHameau(state, hameauId) {
  const g = garantiDuHameau(state, hameauId);
  if (!g) return [];
  return Object.entries(ILE.ATELIERS).filter(([, a]) => a.hameau === g).map(([id, a]) => ({ id, ...a }));
}

// Les commandes du hameau (une liste saine : une entrée abîmée de la sauvegarde est ôtée).
export function commandesDe(state, hameauId) {
  const h = habitantsDe(state)[hameauId];
  if (!h) return [];
  const ok = (c) => c && ILE.ATELIERS[c.atelier] && (ILE.ATELIERS[c.atelier].recettes || {})[c.recette] && Number.isInteger(c.lots) && c.lots > 0 && Number.isInteger(c.pret);
  if (!Array.isArray(h.commandes)) h.commandes = [];
  h.commandes = h.commandes.filter(ok);
  return h.commandes;
}

// L'argent `pieces` aux foyers du hameau, en parts égales (le reste aux premiers).
function payerFoyers(h, pieces) {
  const F = (h.foyers || []).filter((f) => f && typeof f === 'object');
  if (!F.length || !pieces) return;
  const part = Math.floor(pieces / F.length);
  F.forEach((f, k) => { f.bourse = (Number(f.bourse) || 0) + part + (k < pieces - part * F.length ? 1 : 0); });
}

// Combien de lots de la recette `recetteId` de l'atelier `atelierId` le joueur peut commander maintenant
// (ses objets, ses pièces, et ce que l'atelier a déjà en cours : au plus `max` lots).
export function lotsPossibles(state, hameauId, atelierId, recetteId) {
  const A = ILE.ATELIERS[atelierId], r = A && A.recettes && A.recettes[recetteId];
  if (!r) return 0;
  const enCours = commandesDe(state, hameauId).filter((c) => c.atelier === atelierId).reduce((n, c) => n + c.lots, 0);
  let n = A.max - enCours;
  for (const [item, q] of Object.entries(r.entrees)) n = Math.min(n, Math.floor(countItem(state, item) / q));
  if (r.pieces > 0) n = Math.min(n, Math.floor((Number(state.pieces) || 0) / r.pieces));
  return Math.max(0, n);
}

// Le joueur commande `lots` lots de la recette `recetteId` à l'atelier `atelierId` du hameau `hameauId`.
// → { ok, pret (le jour), lots } ou un refus.
export function commander(state, hameauId, atelierId, recetteId, lots = 1) {
  const A = ILE.ATELIERS[atelierId], r = A && A.recettes && A.recettes[recetteId];
  const h = habitantsDe(state)[hameauId];
  if (!h || !r || A.sorte !== 'commande' || !ateliersDuHameau(state, hameauId).some((a) => a.id === atelierId)) return fail('Cet atelier n\'est pas ici.');
  const n = Math.floor(Number(lots) || 0);
  if (n < 1) return fail('Rien à commander.');
  if (n > lotsPossibles(state, hameauId, atelierId, recetteId)) return fail(r.pieces > 0 && (Number(state.pieces) || 0) < r.pieces * n ? NO_COINS : 'Tu n\'as pas de quoi faire autant.');
  if (r.pieces > 0 && !pay(state, r.pieces * n, `${A.nom} : ${r.nom}`)) return fail(NO_COINS);
  for (const [item, q] of Object.entries(r.entrees)) takeItem(state, item, q * n);
  payerFoyers(h, r.pieces * n);
  const jour = Math.max(1, Math.floor(Number(state.day) || 1));
  commandesDe(state, hameauId).push({ atelier: atelierId, recette: recetteId, lots: n, pret: jour + A.jours });
  noterFait(state, `ile.${atelierId}`);
  return { ok: true, pret: jour + A.jours, lots: n };
}

// Le joueur reprend, au hameau `hameauId`, les commandes prêtes. → { ok, items: { objet: n } } (vide :
// rien de prêt).
export function retirerCommandes(state, hameauId) {
  const jour = Math.max(1, Math.floor(Number(state.day) || 1)), items = {};
  const h = habitantsDe(state)[hameauId];
  if (!h) return { ok: true, items };
  const reste = [];
  for (const c of commandesDe(state, hameauId)) {
    if (c.pret > jour) { reste.push(c); continue; }
    for (const [item, q] of Object.entries(ILE.ATELIERS[c.atelier].recettes[c.recette].sortie)) {
      addItem(state, item, q * c.lots);
      items[item] = (items[item] || 0) + q * c.lots;
    }
  }
  h.commandes = reste;
  return { ok: true, items };
}

// Les meubles qu'on achète au hameau `hameauId` : [id] (ceux dont il est le vendeur, s'il a un atelier de
// meubles).
export function meublesDuHameau(state, hameauId) {
  const g = garantiDuHameau(state, hameauId);
  if (!g || !ateliersDuHameau(state, hameauId).some((a) => a.sorte === 'meubles')) return [];
  return Object.keys(DATA.MEUBLES).filter((id) => (DATA.MEUBLES[id].vendeur || 'bois_joli') === g);
}

// Le joueur achète le meuble `id` au hameau `hameauId` : il le paie (aux foyers du hameau), le meuble
// arrive dans l'inventaire et donne son bonheur (ajouterMeuble). → { ok, cost } ou un refus.
export function acheterMeubleHameau(state, hameauId, id) {
  if (!meublesDuHameau(state, hameauId).includes(id)) return fail('Ce meuble ne se vend pas ici.');
  const refus = meubleRefus(state, id);
  if (refus) return fail(refus);
  const def = DATA.MEUBLES[id];
  if (!pay(state, def.prix, `Meuble : ${def.nom}`)) return fail(NO_COINS);
  payerFoyers(habitantsDe(state)[hameauId], def.prix);
  noterFait(state, 'ile.meuble');
  return { ...ajouterMeuble(state, id), cost: def.prix };
}

// Les ateliers que le joueur connaît (ceux des hameaux garantis où il est allé) : [{ id, hameau (l'id du
// hameau de la partie), garanti (« bois_joli »…), … }].
export function ateliersConnus(state) {
  const out = [];
  for (const id of Object.keys(habitantsDe(state))) for (const a of ateliersDuHameau(state, id)) out.push({ ...a, garanti: a.hameau, hameau: id });
  return out;
}

// Toutes les commandes prêtes, de tous les hameaux (le cocher les rapporte). → { ok, items }.
export function retirerToutes(state) {
  const items = {};
  for (const id of Object.keys(habitantsDe(state))) {
    for (const [item, n] of Object.entries(retirerCommandes(state, id).items)) items[item] = (items[item] || 0) + n;
  }
  return { ok: true, items };
}

/* ---------- la veillée à la ferme ---------- */

// Les voisins viennent-ils veiller à la ferme maintenant ? (l'élément « veillee », une nuit de pleine
// lune, de HEURES[0] à HEURES[1] h, la première veillée déjà faite — la scène —, et pas encore pendant
// cette pleine lune)
export function veilleeFermePossible(state) {
  const V = ILE.VEILLEE, h = hourOfDay(state);
  if (!isUnlocked(state, 'veillee') || moonPhase(state.day).id !== 'pleine' || h < V.HEURES[0] || h >= V.HEURES[1]) return false;
  if (!aFait(state, 'veillee.ferme')) return false;
  const pleine = DATA.LUNE.PHASES.find((p) => p.id === 'pleine');
  return ageFait(state, 'veillee.ferme') >= ((pleine && pleine.jours) || 1);
}

// La veillée a lieu (le joueur est à la ferme) : le fait noté, la confiance de chaque hameau découvert.
// → { ok, confiance } ou un refus.
export function veilleeFerme(state) {
  if (!veilleeFermePossible(state)) return fail('Pas de veillée ce soir.');
  noterFait(state, 'veillee.ferme');
  const C = ILE.VEILLEE.CONFIANCE;
  for (const id of Object.keys((state.monde && state.monde.hameaux) || {})) ajouterConfiance(state, id, C);
  return { ok: true, confiance: C };
}

/* ---------- les anciennes parties : le commerce du niveau 10 ---------- */

// Ce que valait le commerce d'une partie d'avant (version 62) : la somme des PRIX_NIVEAUX jusqu'à son
// niveau (0 sans commerce choisi).
export function remboursementCommerce(commerce) {
  if (!commerce || typeof commerce !== 'object' || !commerce.type) return 0;
  const P = ILE.REMBOURSEMENT.PRIX_NIVEAUX, n = Math.max(1, Math.min(P.length, Math.floor(Number(commerce.niveau) || 1)));
  return P.slice(0, n).reduce((a, b) => a + b, 0);
}
