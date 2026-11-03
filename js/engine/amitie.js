import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { fail } from './devices.js';
import { hache } from './ferme-generee.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { habitantsDe } from './habitants.js';
import { ajouterConfiance, ajouterRelation, confiance, relation, RECIT } from './recit.js';

/* ---------- l'amitié avec les habitants des hameaux (data/amitie.json) ----------

   Chaque habitant d'un hameau a une jauge d'amitié de 0 à RECIT.RELATION_MAX, lue en paliers (RECIT.PALIERS :
   inconnu, poli, cordial, proche, intime). Un personnage écrit du récit (Odile, Basile, Théo… : m.recit)
   garde sa relation du récit (state.recit.relations), que les scènes font déjà bouger ; les autres ont la
   leur ici. Elle monte :
     - à la première conversation du jour (PAROLE) ;
     - au premier passage du jour dans son hameau (VISITE) ;
     - avec un cadeau, un par jour (CADEAU, selon son goût pour l'objet : adoré, aimé, neutre, détesté).
   Elle ne baisse jamais avec l'absence (un jeu sans pression) : une personne qui te connaît, revue après
   RETROUVAILLES.JOURS jours sans échange (parole ou cadeau), est joyeuse de te retrouver (RETROUVAILLES.BONUS
   de plus à la première conversation).

   Chacun a ses goûts (goutsDe) : quelques objets adorés, aimés, détestés, tirés de son id dans la liste de
   son métier, complétée par la liste commune (ou fixés, pour un personnage écrit). Ils se découvrent en
   offrant.

   Ce que l'amitié apporte : la confiance du hameau monte vers l'amitié moyenne de ses habitants ; un ami
   proche laisse parfois un présent devant la porte de la ferme (la nuit, RETOUR) ; l'amitié avec qui tient
   un atelier de hameau baisse le prix et le délai de ses commandes (remiseAmitie, delaiAmitie : ile.js).

   L'humeur (humeurPnj) : la joie (un ami proche), la tristesse (son foyer est malheureux, HABITANTS.TRISTE), la
   colère (un hameau qui n'a plus confiance). Elle ne teinte plus le personnage sur la carte : seules les
   réactions d'un instant (un cadeau : joie ou dégoût ; la peur ; la colère d'un arbre abattu sous ses yeux ;
   la joie des retrouvailles, d'un repas) colorent tout son corps, dites par la scène.

   state.amitie = {
     pnj: { [clé : l'id du personnage écrit, ou celui du membre]: { pts (pas pour un écrit), parle (le jour
       de la dernière conversation), cadeau (le jour du dernier cadeau), vu (le jour du dernier échange),
       gouts: { objet: 'adore' | 'aime' | 'neutre' | 'deteste' } (ceux qu'on a découverts) } },
     visites: { [hameau]: le jour du dernier passage },
     porte: [{ de (le prénom), objet, n }] (les présents laissés devant la porte, à ramasser) } */

export const AMITIE = DATA.AMITIE;
const SORTES = ['adore', 'aime', 'deteste'];

const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const jourDe = (state) => Math.max(1, Math.floor(Number(state.day) || 1));
const borne = (v) => Math.max(0, Math.min(RECIT.RELATION_MAX, Math.round(v)));

// L'amitié de la partie (réparée : une ancienne partie n'en a pas).
export function amitieDe(state) {
  if (!objet(state.amitie)) state.amitie = {};
  const a = state.amitie;
  if (!objet(a.pnj)) a.pnj = {};
  if (!objet(a.visites)) a.visites = {};
  if (!Array.isArray(a.porte)) a.porte = [];
  return a;
}

// L'habitant `membreId` du hameau `hameauId` : { h, f, m, cle } ou null.
export function trouverPnj(state, hameauId, membreId) {
  const h = habitantsDe(state)[hameauId];
  for (const f of (h && h.foyers) || []) {
    const m = (f.membres || []).find((x) => x.id === membreId);
    if (m) return { h, f, m, cle: cleDe(m) };
  }
  return null;
}

// La clé d'un membre : le personnage écrit qu'il est, ou son id.
export const cleDe = (m) => (m.recit && RECIT.PERSONNAGES[m.recit] ? m.recit : m.id);
const ecrit = (cle) => !!RECIT.PERSONNAGES[cle];

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
  if (ecrit(cle)) return relation(state, cle);
  const p = amitieDe(state).pnj[cle];
  const v = p && Number(p.pts);
  return Number.isFinite(v) ? borne(v) : 0;
}

// Ajoute (ou retire) des points : la nouvelle valeur.
export function ajouterAmitie(state, cle, points) {
  if (ecrit(cle)) return ajouterRelation(state, cle, points).valeur;
  const p = fiche(state, cle);
  p.pts = borne(pointsAmitie(state, cle) + points);
  return p.pts;
}

// Le rang du palier (0 : inconnu … 4 : intime) et son nom.
export function palierAmitie(state, cle) {
  const pts = pointsAmitie(state, cle);
  let rang = 0;
  RECIT.PALIERS.forEach((seuil, i) => { if (pts >= seuil) rang = i; });
  return rang;
}
export function palierAmitieNom(state, cle) {
  return RECIT.PALIER_NOMS[palierAmitie(state, cle)];
}

// Le métier qui fait ses goûts et ses présents : enfant, son métier, ou jardinier.
const sorteDe = (m) => (m.enfant ? 'enfant' : AMITIE.METIERS[m.metier] ? m.metier : 'jardinier');

// Ses goûts : { objet: 'adore' | 'aime' | 'deteste' } (les autres objets : neutres). Un personnage écrit a
// les siens (ECRITS) ; un autre les tire de son id dans la liste de son métier, puis la liste commune.
export function goutsDe(m) {
  const cle = cleDe(m);
  const out = {};
  if (AMITIE.ECRITS[cle]) {
    for (const s of SORTES) for (const it of AMITIE.ECRITS[cle][s] || []) if (!out[it]) out[it] = s;
    return out;
  }
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
    cle: t.cle, prenom: t.m.prenom, pts: pointsAmitie(state, t.cle), palier: rang, nom: RECIT.PALIER_NOMS[rang], max: RECIT.RELATION_MAX,
    prochain: rang + 1 < RECIT.PALIERS.length ? RECIT.PALIERS[rang + 1] : null,
    gouts: objet(p.gouts) ? { ...p.gouts } : {}, cadeauAujourdhui: p.cadeau === jourDe(state),
  };
}

// Une gain qui fait passer un palier ? (`avant`, `apres` : des points)
const rangDe = (pts) => { let r = 0; RECIT.PALIERS.forEach((s, i) => { if (pts >= s) r = i; }); return r; };

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
  return { gain: apres - avant, premiere, retrouvailles, pts: apres, palier: rangDe(apres), nom: RECIT.PALIER_NOMS[rangDe(apres)], monte: rangDe(apres) > rangDe(avant) };
}

// Le premier passage du jour dans le hameau : +VISITE pour chacun de ses habitants. → true si c'est le
// premier aujourd'hui.
export function visiterHameau(state, hameauId) {
  const h = habitantsDe(state)[hameauId];
  if (!h || !Array.isArray(h.foyers)) return false;
  const a = amitieDe(state), jour = jourDe(state);
  if (a.visites[hameauId] === jour) return false;
  a.visites[hameauId] = jour;
  for (const f of h.foyers) for (const m of f.membres || []) ajouterAmitie(state, cleDe(m), AMITIE.VISITE);
  return true;
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
  return { ok: true, gout, points: apres - avant, emotion, pts: apres, palier: rangDe(apres), nom: RECIT.PALIER_NOMS[rangDe(apres)], monte: rangDe(apres) > rangDe(avant), prenom: t.m.prenom };
}

// L'humeur durable d'un habitant (sa teinte sur la carte) : 'colere', 'tristesse' (son foyer est malheureux),
// 'joie' ou null. `foyer` : le sien (cherché s'il n'est pas donné).
export function humeurPnj(state, hameauId, m, foyer = null) {
  const H = AMITIE.HUMEUR, cle = cleDe(m);
  if (confiance(state, hameauId) < H.COLERE) return 'colere';
  const f = foyer || ((habitantsDe(state)[hameauId] || {}).foyers || []).find((x) => (x.membres || []).includes(m));
  if (f && Number.isFinite(f.bonheur) && f.bonheur < DATA.HABITANTS.TRISTE) return 'tristesse';
  if (palierAmitie(state, cle) >= H.JOIE) return 'joie';
  return null;
}

// Pour la carte : { [id du membre]: humeur } (ceux qui en ont une).
export function humeursPourLaCarte(state) {
  const out = {};
  for (const [id, h] of Object.entries(habitantsDe(state))) {
    for (const f of (h && h.foyers) || []) for (const m of f.membres || []) {
      const e = humeurPnj(state, id, m, f);
      if (e) out[m.id] = e;
    }
  }
  return out;
}

/* -- ce que l'amitié apporte -- */

// La remise (%) et le délai gagné (jours) des commandes à l'atelier tenu par `qui` (un personnage écrit).
export function remiseAmitie(state, qui) {
  return qui && ecrit(qui) ? AMITIE.REMISE[palierAmitie(state, qui)] || 0 : 0;
}
export function delaiAmitie(state, qui) {
  return qui && ecrit(qui) ? AMITIE.DELAI[palierAmitie(state, qui)] || 0 : 0;
}
// Un prix après la remise de l'amitié avec `qui` (arrondi au-dessus, jamais négatif).
export function prixAmitie(state, qui, prix) {
  const p = Math.max(0, Number(prix) || 0);
  return Math.ceil((p * (100 - remiseAmitie(state, qui))) / 100);
}

// Les présents laissés devant la porte (à ramasser).
export function presentsPorte(state) {
  return amitieDe(state).porte.slice();
}
// Le personnage passe devant la porte : il prend les présents. → [{ de, objet, n }] (vide : rien).
export function ramasserPresents(state) {
  const a = amitieDe(state);
  const pris = a.porte.filter((x) => DATA.OBJETS[x.objet] && x.n > 0);
  for (const x of pris) addItem(state, x.objet, x.n);
  a.porte = [];
  return pris;
}

// La nuit (runNight, avant que le jour change) : les amis proches laissent parfois un présent devant la
// porte ; la confiance de chaque hameau monte vers l'amitié moyenne de ses habitants (l'absence ne fait rien
// perdre). → { presents: [{ de, objet, n }], confiance: { hameau: +n } }.
export function amitieNuit(state) {
  const a = amitieDe(state), jour = jourDe(state), R = AMITIE.RETOUR;
  const out = { presents: [], confiance: {} };
  for (const [hid, h] of Object.entries(habitantsDe(state))) {
    if (!h || !Array.isArray(h.foyers)) continue;
    let total = 0, n = 0;
    for (const f of h.foyers) for (const m of f.membres || []) {
      const cle = cleDe(m);
      // le présent d'un ami proche
      const rang = palierAmitie(state, cle);
      if (rang >= R.PALIER) {
        const rnd = mulberry32(hache(`present:${cle}:${jour}`));
        if (rnd() * 100 < (R.CHANCE[String(rang)] || 0)) {
          const table = Object.entries(R.PRESENTS[sorteDe(m)] || {});
          if (table.length) {
            const [it, [de, aa]] = table[Math.floor(rnd() * table.length)];
            const q = de + Math.floor(rnd() * (aa - de + 1));
            const x = { de: m.prenom, objet: it, n: q };
            a.porte.push(x);
            out.presents.push(x);
          }
        }
      }
      total += pointsAmitie(state, cle);
      n += 1;
    }
    // la confiance du hameau monte vers l'amitié de ses habitants (jamais ne baisse par elle)
    if (n) {
      const cible = AMITIE.CONFIANCE.BASE + ((total / n) * AMITIE.CONFIANCE.PART) / 100;
      if (confiance(state, hid) < Math.floor(cible)) { ajouterConfiance(state, hid, 1); out.confiance[hid] = 1; }
    }
  }
  return out;
}
