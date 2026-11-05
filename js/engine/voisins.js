/* ---------- V-3 : entre voisins (docs/phase-4.md ; data/amitie.json, VOISINS) ----------
   Les habitants des hameaux ont des liens entre eux : chaque adulte a un ami dans son hameau (d'un autre
   foyer) et un cousin dans un autre hameau peuplé. Ils sont tirés une fois, de la graine de la ferme et de
   l'habitant, quand on en a besoin (liensDe), puis gardés : un lien noué ne change plus. Ils vont dans les
   deux sens (l'ami de mon ami, c'est moi), tant que l'autre n'a pas déjà le sien.

   La nuit (voisinsNuit, dans runNight, après la journée des foyers ; pas dans un monde partagé) :
     - l'entraide : un foyer qui a eu faim (sa journée n'a pas couvert son besoin) reçoit jusqu'à AIDE
       aliments du garde-manger d'un foyer ami ou cousin qui en a ;
     - une visite, parfois (VISITE) : un cousin va voir l'autre.
   Ce qui se passe est gardé (EVENEMENTS derniers) : les habitants en parlent (propos.js), la fiche du hameau
   le raconte (js/ui/habitants.js).

   state.voisins = { liens: { [membre]: { ami?: { id, hameau }, cousin?: { id, hameau } } },
     evenements: [{ jour, sorte: 'entraide' | 'visite', ... }] }. */

import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { hache } from './ferme-generee.js';
import { farmSeed } from './terrain.js';
import { habitantsDe } from './habitants.js';

const V = () => DATA.VOISINS;
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const mangeable = (item) => { const d = DATA.OBJETS[item]; return !!d && !!d.mangeable && d.energie > 0; };

export function voisinsDe(state) {
  if (!objet(state.voisins)) state.voisins = {};
  const v = state.voisins;
  if (!objet(v.liens)) v.liens = {};
  if (!Array.isArray(v.evenements)) v.evenements = [];
  return v;
}

// Tous les membres adultes des hameaux peuplés, dans un ordre fixe : [{ hid, h, f, m }].
function adultes(state) {
  const out = [];
  for (const [hid, h] of Object.entries(habitantsDe(state)).sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    for (const f of (h && h.foyers) || []) for (const m of f.membres || []) if (!m.enfant) out.push({ hid, h, f, m });
  }
  return out;
}

// L'habitant `id` (un adulte) : { hid, h, f, m } ou null.
export function trouverHabitant(state, id) {
  return adultes(state).find((x) => x.m.id === id) || null;
}

// Les liens de l'adulte `id` : { ami?: { id, hameau }, cousin?: { id, hameau } }, noués au besoin.
export function liensDe(state, id) {
  const v = voisinsDe(state), L = v.liens[id] || (v.liens[id] = {});
  const moi = trouverHabitant(state, id);
  if (!moi) return L;
  const tous = adultes(state);
  const rnd = mulberry32(hache(`${farmSeed(state)}:voisins:${id}`));
  const nouer = (sorte, cands) => {
    if (L[sorte] || !cands.length) return;
    // (d'abord ceux qui n'ont pas encore ce lien : il va dans les deux sens)
    const libres = cands.filter((x) => !(v.liens[x.m.id] && v.liens[x.m.id][sorte]));
    const choix = (libres.length ? libres : cands)[Math.floor(rnd() * (libres.length || cands.length))];
    L[sorte] = { id: choix.m.id, hameau: choix.hid };
    const autre = v.liens[choix.m.id] || (v.liens[choix.m.id] = {});
    if (!autre[sorte]) autre[sorte] = { id, hameau: moi.hid };
  };
  nouer('ami', tous.filter((x) => x.hid === moi.hid && x.f !== moi.f));
  nouer('cousin', tous.filter((x) => x.hid !== moi.hid));
  return L;
}

// Les événements récents (RECENT jours) qui touchent l'habitant `id` (ou son foyer, pour l'entraide).
export function evenementsDe(state, id, foyer = null) {
  const v = voisinsDe(state), depuis = state.day - V().RECENT;
  return v.evenements.filter((e) => e.jour >= depuis && (e.qui === id || e.chez === id || (foyer && (e.aFoyer === foyer || e.deFoyer === foyer))));
}

// Les événements d'un hameau (les derniers d'abord) : pour sa fiche.
export function evenementsDuHameau(state, hid, n = 5) {
  return voisinsDe(state).evenements.filter((e) => e.hameau === hid || e.deHameau === hid).slice(-n).reverse();
}

// La nuit : l'entraide, puis peut-être une visite. → { entraides, visite }.
export function voisinsNuit(state) {
  if (state.mondePartage) return { entraides: 0, visite: null };
  const v = voisinsDe(state), jour = state.day;
  const H = habitantsDe(state), tous = adultes(state);
  if (!tous.length) return { entraides: 0, visite: null };
  for (const a of tous) liensDe(state, a.m.id);
  const foyerDe = (id) => { const x = tous.find((t) => t.m.id === id); return x || null; };
  let entraides = 0;
  // l'entraide : un foyer qui a eu faim, aidé par le foyer d'un ami ou d'un cousin de l'un de ses adultes
  for (const [hid, h] of Object.entries(H).sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    for (const f of (h && h.foyers) || []) {
      const J = f.journal && f.journal[f.journal.length - 1];
      if (!J || J.couverture >= 100) continue;
      const aide = f.membres.filter((m) => !m.enfant).flatMap((m) => [v.liens[m.id] && v.liens[m.id].ami, v.liens[m.id] && v.liens[m.id].cousin]).filter(Boolean)
        .map((l) => foyerDe(l.id)).filter((x) => x && x.f !== f && x.f.garde && Object.keys(x.f.garde).some((it) => mangeable(it) && x.f.garde[it] > 0))[0];
      if (!aide) continue;
      if (!objet(f.garde)) f.garde = {};
      let n = 0;
      while (n < V().AIDE) {
        const it = Object.keys(aide.f.garde).filter((x) => mangeable(x) && aide.f.garde[x] > 0).sort((a, b) => DATA.OBJETS[b].energie - DATA.OBJETS[a].energie || (a < b ? -1 : 1))[0];
        if (!it) break;
        aide.f.garde[it] -= 1;
        if (!(aide.f.garde[it] > 0)) delete aide.f.garde[it];
        f.garde[it] = (f.garde[it] || 0) + 1;
        n += 1;
      }
      if (!n) continue;
      const recoit = f.membres.find((m) => !m.enfant) || f.membres[0];
      v.evenements.push({ jour, sorte: 'entraide', qui: aide.m.id, de: aide.m.prenom, deHameau: aide.hid, deFoyer: aide.f.maison, a: recoit.prenom, aFoyer: f.maison, hameau: hid, n });
      entraides += 1;
    }
  }
  // une visite, parfois : un cousin va voir l'autre
  const rnd = mulberry32(hache(`${farmSeed(state)}:visites:${jour}`));
  let visite = null;
  if (rnd() < V().VISITE) {
    const avecCousin = tous.filter((a) => v.liens[a.m.id] && v.liens[a.m.id].cousin && foyerDe(v.liens[a.m.id].cousin.id));
    if (avecCousin.length) {
      const a = avecCousin[Math.floor(rnd() * avecCousin.length)], c = foyerDe(v.liens[a.m.id].cousin.id);
      visite = { jour, sorte: 'visite', qui: a.m.id, quiPrenom: a.m.prenom, quiGenre: a.m.genre, deHameau: a.hid, chez: c.m.id, chezPrenom: c.m.prenom, hameau: c.hid };
      v.evenements.push(visite);
    }
  }
  if (v.evenements.length > V().EVENEMENTS) v.evenements.splice(0, v.evenements.length - V().EVENEMENTS);
  return { entraides, visite };
}
