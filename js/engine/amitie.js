import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { fail } from './devices.js';
import { hache } from './ferme-generee.js';
import { countItem, takeItem } from './inventory.js';
import { STYLES, styleInfo, stylePrefere } from './styles.js';
import { projetBati } from './ile/economie.js';

/* ---------- l'amitié (data/amitie.json) ----------

   L'amitié du joueur avec les villageois de l'île (fiche I6a, js/engine/villageois-amitie.js : ce qui la fait vivre).
   Chacun a une jauge d'amitié de 0 à ECHELLE.MAX, lue en paliers (ECHELLE.PALIERS : inconnu, poli, cordial, proche,
   intime). Elle monte à la première conversation du jour (PAROLE) et avec un cadeau, un par jour (CADEAU, selon son goût
   pour l'objet : adoré, aimé, neutre, détesté). Elle ne baisse jamais avec l'absence (un jeu sans pression) : une
   personne qui te connaît, revue après RETROUVAILLES.JOURS jours sans échange, est joyeuse de te retrouver
   (RETROUVAILLES.BONUS de plus à la première conversation). Les goûts d'un villageois sont les siens (goutsTires, à son
   arrivée) ; ceux d'un habitant d'un hameau d'avant (goutsDe : de son id, dans la liste de son métier) ne servent plus
   qu'à la migration de ses amis (migration-ile.js).

   state.amitie = {
     pnj: { [l'id du villageois]: { pts, parle (le jour de la dernière conversation), cadeau (le jour du dernier cadeau),
       vu (le jour du dernier échange), gouts: { objet: 'adore' | 'aime' | 'neutre' | 'deteste' } (ceux qu'on a
       découverts), souvenirs… } },
     visites, porte : des clés d'avant (le passage dans un hameau, les présents devant la porte), gardées vides. }
   Les hameaux, leurs habitants, la confiance et les ateliers du récit sont retirés à la bascule (I9h). */

export const AMITIE = DATA.AMITIE;
const SORTES = ['adore', 'aime', 'deteste'];

const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const jourDe = (state) => Math.max(1, Math.floor(Number(state.day) || 1));
const ECHELLE = AMITIE.ECHELLE;
const borne = (v) => Math.max(0, Math.min(ECHELLE.MAX, Math.round(v)));

// L'amitié de la partie (réparée : une ancienne partie n'en a pas).
export function amitieDe(state) {
  if (!objet(state.amitie)) state.amitie = {};
  const a = state.amitie;
  if (!objet(a.pnj)) a.pnj = {};
  if (!objet(a.visites)) a.visites = {};
  if (!Array.isArray(a.porte)) a.porte = [];
  return a;
}

// L'île à bâtir (fiche I6a, js/engine/villageois-amitie.js) : les villageois ont leur amitié ici, sous le « hameau »
// HAMEAU_VILLAGE (la clé : l'id du villageois, « vg-1 »). Ses goûts sont les siens (v.gouts, tirés à son arrivée :
// goutsTires).
export const HAMEAU_VILLAGE = 'village';
const VILLAGE_H = Object.freeze({ nom: 'le village', foyers: [], style: null });
const estVillageois = (m) => !!m && typeof m.id === 'string' && /^vg-\d+$/.test(m.id) && objet(m.gouts);

// Le villageois `membreId` (`hameauId` : HAMEAU_VILLAGE) : { h, f: null, m (le villageois), cle (son id),
// villageois: true }, ou null.
export function trouverPnj(state, hameauId, membreId) {
  if (hameauId === HAMEAU_VILLAGE) {
    const v = Array.isArray(state.villageois) ? state.villageois.find((x) => x && x.id === membreId) : null;
    return v ? { h: VILLAGE_H, f: null, m: v, cle: v.id, villageois: true } : null;
  }
  return null;
}

// La clé d'une personne : son id (les personnages écrits du récit d'avant sont retirés, I9h).
export const cleDe = (m) => m.id;

// La fiche d'amitié d'une personne (créée au besoin) : { pts, parle, cadeau, vu, gouts, souvenirs… }.
export function fiche(state, cle) {
  const a = amitieDe(state);
  if (!objet(a.pnj[cle])) a.pnj[cle] = {};
  const p = a.pnj[cle];
  if (!objet(p.gouts)) p.gouts = {};
  return p;
}

// Les points d'amitié (0 à RELATION_MAX).
export function pointsAmitie(state, cle) {
  const p = amitieDe(state).pnj[cle];
  const v = p && Number(p.pts);
  return Number.isFinite(v) ? borne(v) : 0;
}

// Ajoute (ou retire) des points : la nouvelle valeur.
export function ajouterAmitie(state, cle, points) {
  const p = fiche(state, cle);
  // (l'île : le lieu de divertissement bâti, l'amitié monte plus vite ; docs/economie.md E15)
  if (points > 0 && projetBati(state, 'divertissement')) points = Math.ceil(points * DATA.ILE.PROJETS.divertissement.amitie);
  p.pts = borne(pointsAmitie(state, cle) + points);
  return p.pts;
}

// Le rang du palier (0 : inconnu … 4 : intime) et son nom.
export function palierAmitie(state, cle) {
  const pts = pointsAmitie(state, cle);
  let rang = 0;
  ECHELLE.PALIERS.forEach((seuil, i) => { if (pts >= seuil) rang = i; });
  return rang;
}
export function palierAmitieNom(state, cle) {
  return ECHELLE.NOMS[palierAmitie(state, cle)];
}

// Le métier qui fait ses goûts et ses présents : enfant, son métier, ou jardinier.
const sorteDe = (m) => (m.enfant ? 'enfant' : AMITIE.METIERS[m.metier] ? m.metier : 'jardinier');

// Ses goûts : { objet: 'adore' | 'aime' | 'deteste' } (les autres objets : neutres). Un villageois a les siens ; un
// habitant d'un hameau d'avant (la migration de ses amis, migration-ile.js) les tire de son id dans la liste de son
// métier, puis la liste commune.
export function goutsDe(m) {
  // (un villageois : les siens, tirés à son arrivée)
  if (estVillageois(m)) return { ...m.gouts };
  const out = {};
  const rnd = mulberry32(hache(`gouts:${m.id}`));
  const L = AMITIE.METIERS[sorteDe(m)] || {};
  for (const s of SORTES) {
    const tas = [...(L[s] || []), ...(AMITIE.COMMUN[s] || [])].filter((it) => !out[it]);
    const n = AMITIE.GOUTS[s] || 0;
    // (son métier d'abord : la moitié au moins vient de sa liste)
    for (let k = 0; k < n && tas.length; k++) {
      const pris = k < Math.ceil(n / 2) && (L[s] || []).some((it) => tas.includes(it))
        ? tas.filter((it) => (L[s] || []).includes(it)) : tas;
      const it = pris[Math.floor(rnd() * pris.length)];
      out[it] = s;
      tas.splice(tas.indexOf(it), 1);
    }
  }
  return out;
}

// Les goûts d'un villageois (fiche I6a), tirés de `graine` (« graine:villageois:rang ») : GOUTS[sorte] objets de
// chaque sorte, pris parmi les listes de tous les métiers adultes des hameaux et la liste commune (pas de métier
// sur l'île : ses goûts sont à lui, ils ne suivent pas la tâche qu'on lui confie, qui change). Un objet n'est que
// d'une sorte ; l'ordre est fixe (la même graine, les mêmes goûts).
export function goutsTires(graine) {
  const rnd = mulberry32(hache(`gouts-tires:${graine}`));
  const out = {};
  for (const s of SORTES) {
    const tas = [];
    for (const [metier, L] of Object.entries(AMITIE.METIERS).sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      if (metier === 'enfant') continue;
      for (const it of L[s] || []) if (!tas.includes(it)) tas.push(it);
    }
    for (const it of AMITIE.COMMUN[s] || []) if (!tas.includes(it)) tas.push(it);
    const libres = tas.filter((it) => !out[it] && DATA.OBJETS[it]);
    for (let k = 0; k < (AMITIE.GOUTS[s] || 0) && libres.length; k++) {
      const it = libres.splice(Math.floor(rnd() * libres.length), 1)[0];
      out[it] = s;
    }
  }
  return out;
}

// Son goût pour `item` : 'adore', 'aime', 'neutre' ou 'deteste'.
export function goutPour(m, item) {
  return goutsDe(m)[item] || 'neutre';
}

// Ce qui s'offre : un objet des catégories OFFRABLES (ou un plat) qu'on a.
export function offrable(item) {
  const def = DATA.OBJETS[item];
  return !!def && (AMITIE.OFFRABLES.includes(def.categorie) || !!def.plat);
}
export function cadeauxPossibles(state) {
  return Object.keys(state.inventaire || {}).filter((it) => offrable(it) && countItem(state, it) >= 1).sort((a, b) => (DATA.OBJETS[a].nom < DATA.OBJETS[b].nom ? -1 : 1));
}

// L'amitié avec un habitant, pour l'affichage : { cle, pts, palier, nom, max, gouts (découverts),
// cadeauAujourdhui, prochain (les points du palier suivant, ou null) }.
export function amitieAvec(state, hameauId, membreId) {
  const t = trouverPnj(state, hameauId, membreId);
  if (!t) return null;
  const p = amitieDe(state).pnj[t.cle] || {};
  const rang = palierAmitie(state, t.cle);
  return {
    cle: t.cle, prenom: t.m.prenom, pts: pointsAmitie(state, t.cle), palier: rang, nom: ECHELLE.NOMS[rang], max: ECHELLE.MAX,
    prochain: rang + 1 < ECHELLE.PALIERS.length ? ECHELLE.PALIERS[rang + 1] : null,
    gouts: objet(p.gouts) ? { ...p.gouts } : {}, cadeauAujourdhui: p.cadeau === jourDe(state),
    // son style préféré (js/engine/styles.js) : connu après un repas partagé, ou dès le palier STYLES.REVELE
    style: styleConnu(state, t, p) ? styleInfo(styleHabitant(state, t)) : null,
  };
}

// Le style préféré de l'habitant trouvé `t` (trouverPnj), d'après le style de son hameau.
export function styleHabitant(state, t) {
  return stylePrefere(t.cle, t.m.id, t.h && t.h.style);
}
// Le connaît-on ? (un repas partagé l'a montré : p.styleVu ; ou l'amitié, au palier STYLES.REVELE)
function styleConnu(state, t, p) {
  return !!(p && p.styleVu) || palierAmitie(state, t.cle) >= STYLES.REVELE;
}

// Une gain qui fait passer un palier ? (`avant`, `apres` : des points)
const rangDe = (pts) => { let r = 0; ECHELLE.PALIERS.forEach((s, i) => { if (pts >= s) r = i; }); return r; };

// La première conversation du jour avec cet habitant : +PAROLE (+RETROUVAILLES.BONUS s'il te connaît et ne
// t'avait pas vu depuis RETROUVAILLES.JOURS jours). → { gain, premiere, retrouvailles, pts, palier, nom, monte }
// ou null.
export function parlerAmitie(state, hameauId, membreId) {
  const t = trouverPnj(state, hameauId, membreId);
  if (!t) return null;
  const p = fiche(state, t.cle), jour = jourDe(state);
  const avant = pointsAmitie(state, t.cle);
  // (les retrouvailles : il te connaît, et vous ne vous étiez pas vus depuis RETROUVAILLES.JOURS jours)
  const R = AMITIE.RETROUVAILLES;
  const premiere = p.parle !== jour;
  const retrouvailles = premiere && avant >= AMITIE.HUMEUR.CONNU && Number.isFinite(p.vu) && jour - p.vu >= R.JOURS;
  if (premiere) { ajouterAmitie(state, t.cle, AMITIE.PAROLE + (retrouvailles ? R.BONUS : 0)); p.parle = jour; }
  p.vu = jour;
  const apres = pointsAmitie(state, t.cle);
  return { gain: apres - avant, premiere, retrouvailles, pts: apres, palier: rangDe(apres), nom: ECHELLE.NOMS[rangDe(apres)], monte: rangDe(apres) > rangDe(avant) };
}

// Offrir `item` à l'habitant : un cadeau par jour et par personne. → { ok, gout, points, emotion ('joie',
// 'degout' ou null), pts, palier, nom, monte } ou un refus.
export function offrir(state, hameauId, membreId, item) {
  const t = trouverPnj(state, hameauId, membreId);
  if (!t) return fail('Personne de ce nom ici.');
  if (!offrable(item)) return fail('Ça ne s\'offre pas.');
  if (countItem(state, item) < 1) return fail('Tu n\'en as plus.');
  const p = fiche(state, t.cle), jour = jourDe(state);
  if (p.cadeau === jour) return fail(`Tu as déjà offert un cadeau à ${t.m.prenom} aujourd'hui.`);
  takeItem(state, item, 1);
  const gout = goutPour(t.m, item);
  const avant = pointsAmitie(state, t.cle);
  ajouterAmitie(state, t.cle, AMITIE.CADEAU[gout]);
  p.cadeau = jour;
  p.vu = jour;
  p.gouts[item] = gout;
  const apres = pointsAmitie(state, t.cle);
  const emotion = gout === 'adore' || gout === 'aime' ? 'joie' : gout === 'deteste' ? 'degout' : null;
  return { ok: true, gout, points: apres - avant, emotion, pts: apres, palier: rangDe(apres), nom: ECHELLE.NOMS[rangDe(apres)], monte: rangDe(apres) > rangDe(avant), prenom: t.m.prenom };
}
