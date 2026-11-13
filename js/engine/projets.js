import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { countItem, takeItem } from './inventory.js';
import { habitantsDe } from './habitants.js';
import { ajouterConfiance } from './recit.js';
import { ajouterAmitie, cleDe } from './amitie.js';
import { noterChronique } from './chronique.js';

/* ---------- les projets collectifs des hameaux (data/projets.json, PROJETS ; le lot 5) ----------

   Chaque hameau a ses projets, l'un après l'autre (ORDRE[le style du hameau] : aménager la place, un
   jardin partagé). Un projet demande des matériaux (besoin). Le joueur en apporte depuis la fiche du hameau
   (apporterAuProjet : ce qu'il a, jusqu'à ce qui manque) ; les familles en ajoutent chaque nuit depuis la
   réserve du hameau (projetsNuit). Chaque apport du joueur, une fois par jour : +DON d'amitié à chaque
   habitant. Fini (la nuit où tout est là) : la confiance du hameau et l'amitié de ses habitants montent, la
   place reçoit son décor (la carte : js/carte/ferme/hameaux.js, projetsPourLaCarte), et ses habitants en
   parlent (merciProjet, à la première conversation du jour, les SOUVENIR jours qui suivent).

   state.projets = { [hameau]: { rang (le projet en cours dans ORDRE), recu: { objet: n }, don (le jour du
     dernier apport du joueur), faits: [{ sorte, jour }] } } */

export const PROJETS = DATA.PROJETS;
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const jourDe = (state) => Math.max(1, Math.floor(Number(state.day) || 1));

function projetsDe(state) {
  if (!objet(state.projets)) state.projets = {};
  return state.projets;
}

// L'état du projet du hameau `hid` (créé au besoin), ou null (un hameau qu'on ne connaît pas).
function fiche(state, hid) {
  const h = habitantsDe(state)[hid];
  if (!h) return null;
  const P = projetsDe(state);
  if (!objet(P[hid])) P[hid] = { rang: 0, recu: {}, don: null, faits: [] };
  const p = P[hid];
  if (!objet(p.recu)) p.recu = {};
  if (!Array.isArray(p.faits)) p.faits = [];
  return p;
}

const ordreDe = (h) => PROJETS.ORDRE[h && h.style] || Object.keys(PROJETS.SORTES);

// Le projet en cours du hameau `hid` : { sorte, nom, icone, texte, besoin, recu, manque, fait (tout est là,
// il s'achève la nuit) } ; null quand ils sont tous faits, ou pour un hameau inconnu.
export function projetDuHameau(state, hid) {
  const h = habitantsDe(state)[hid], p = fiche(state, hid);
  if (!p) return null;
  const sorte = ordreDe(h)[p.rang];
  const S = sorte && PROJETS.SORTES[sorte];
  if (!S) return null;
  const manque = {};
  for (const [it, n] of Object.entries(S.besoin)) { const m = n - (p.recu[it] || 0); if (m > 0) manque[it] = m; }
  return { sorte, nom: S.nom, icone: S.icone, texte: S.texte, besoin: { ...S.besoin }, recu: { ...p.recu }, manque, fait: !Object.keys(manque).length };
}

// Les projets faits du hameau `hid` : [{ sorte, jour }].
export function projetsFaits(state, hid) {
  const p = objet(state.projets) ? state.projets[hid] : null;
  return p && Array.isArray(p.faits) ? p.faits.slice() : [];
}

function membres(state, hid) {
  const h = habitantsDe(state)[hid];
  return ((h && h.foyers) || []).flatMap((f) => f.membres || []);
}

// Le joueur apporte au projet du hameau `hid` ce qu'il a de ce qui manque (tout ce qu'il peut). → { ok,
// donne: { objet: n }, amitie (les points de l'apport du jour, 0 s'il a déjà apporté aujourd'hui), fait }
// ou un refus.
export function apporterAuProjet(state, hid) {
  const pr = projetDuHameau(state, hid);
  if (!pr) return fail('Ce hameau n\'a plus de projet en cours.');
  if (pr.fait) return fail('Tout est là : le hameau s\'y met cette nuit.');
  const p = fiche(state, hid), donne = {};
  for (const [it, m] of Object.entries(pr.manque)) {
    const n = Math.min(m, countItem(state, it));
    if (n <= 0) continue;
    takeItem(state, it, n);
    p.recu[it] = (p.recu[it] || 0) + n;
    donne[it] = n;
  }
  if (!Object.keys(donne).length) return fail(`Il te manque de quoi aider : ${Object.keys(pr.manque).map((it) => (DATA.OBJETS[it] || { nom: it }).nom.toLowerCase()).join(', ')}.`);
  let amitie = 0;
  if (p.don !== jourDe(state)) {
    p.don = jourDe(state);
    amitie = PROJETS.DON;
    for (const m of membres(state, hid)) ajouterAmitie(state, cleDe(m), amitie);
  }
  return { ok: true, donne, amitie, fait: projetDuHameau(state, hid).fait };
}

// La nuit (runNight, après la journée des hameaux) : chaque hameau apporte à son projet un peu de sa
// réserve (NUIT de chaque matériau qui manque, au plus) ; un projet où tout est là s'achève. → [{ hameau,
// sorte }] (les projets finis cette nuit).
export function projetsNuit(state) {
  const out = [], H = habitantsDe(state);
  for (const hid of Object.keys(objet(state.projets) ? state.projets : {})) {
    const h = H[hid], pr = projetDuHameau(state, hid);
    if (!h || !pr) continue;
    const p = fiche(state, hid);
    // (le hameau, de sa réserve : seulement un projet que le joueur a commencé)
    if (!pr.fait && objet(h.reserve)) {
      for (const [it, m] of Object.entries(pr.manque)) {
        const n = Math.min(m, PROJETS.NUIT, h.reserve[it] || 0);
        if (n > 0) { h.reserve[it] -= n; p.recu[it] = (p.recu[it] || 0) + n; }
      }
    }
    if (!projetDuHameau(state, hid).fait) continue;
    p.faits.push({ sorte: pr.sorte, jour: jourDe(state) });
    p.rang += 1;
    p.recu = {};
    ajouterConfiance(state, hid, PROJETS.FIN.CONFIANCE);
    for (const m of membres(state, hid)) ajouterAmitie(state, cleDe(m), PROJETS.FIN.AMITIE);
    out.push({ hameau: hid, sorte: pr.sorte });
    // (l'île à bâtir, fiche I7g : le projet fini, dans la chronique ; rien le chantier éteint)
    noterChronique(state, 'projet', { id: `${hid}:${pr.sorte}`, lieu: h.nom || '', nom: pr.nom.charAt(0).toLowerCase() + pr.nom.slice(1), icone: pr.icone });
  }
  return out;
}

// Ce qu'un habitant du hameau `hid` dit du dernier projet fini, à la première conversation du jour (les
// SOUVENIR jours qui suivent sa fin). → la phrase, ou null.
export function merciProjet(state, hid, n = 0) {
  const F = projetsFaits(state, hid), f = F[F.length - 1];
  if (!f) return null;
  const age = jourDe(state) - f.jour;
  if (age < 0 || age > PROJETS.SOUVENIR) return null;
  const L = PROJETS.MERCI, S = PROJETS.SORTES[f.sorte];
  return L[((n % L.length) + L.length) % L.length].replace('{projet}', S ? S.nom.toLowerCase().replace(/^aménager la /, '').replace(/^un /, '') : 'projet');
}

// Pour la carte : le décor des projets faits, par hameau : { [hameau]: [bloc…] } (dans l'ordre de pose).
export function projetsPourLaCarte(state) {
  const out = {};
  for (const hid of Object.keys(objet(state.projets) ? state.projets : {})) {
    const L = projetsFaits(state, hid).flatMap((f) => (PROJETS.SORTES[f.sorte] || { decor: [] }).decor);
    if (L.length) out[hid] = L;
  }
  return out;
}
