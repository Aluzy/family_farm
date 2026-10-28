import { DATA, dishEnergy, ingredientOptions } from './catalog.js';
import { mulberry32 } from './base.js';
import { fail } from './devices.js';
import { hache } from './ferme-generee.js';
import { mealHappinessDelta } from './bonheur.js';
import { farmSeed } from './terrain.js';
import { lireIdMonde, objetPris, prendreParHabitant } from './monde-recolte.js';

/* ---------- les habitants des hameaux du grand monde (docs/grand-monde.md : fiche 7b) ----------

   Chaque maison d'un hameau bâti (monde-hameaux.js, planHameau : ses maisons, leurs lits) a son
   foyer : un ou deux adultes, des enfants, jamais plus que de lits ; le premier adulte fait le métier
   du hameau (bûcheron, pêcheur, mineur, berger, cueilleur : metierDuLieu), le second le même, un
   autre, ou il tient le jardin. Les réglages : data/monde.json (HABITANTS).

   Ils naissent à la découverte du hameau (peuplerHameau : la page lui donne le plan, que le Web
   Worker a tiré ; la sauvegarde ne porte que les hameaux vus, et le moteur ne refait jamais le plan :
   tout ce dont la nuit a besoin est recopié dans le foyer). Le tirage vient de la graine du monde, du
   hameau et de la maison (jamais de state.rngSeed : la ferme ne change pas) ; les prénoms et les
   personnages ne se répètent pas dans un hameau.

   state.monde.habitants = { [id du hameau]: {
     nom, metier, style, eau (celle du pêcheur : mer, lac, riviere), jour (sa découverte),
     jardins: { potager, verger } (leur nombre), poulailler (bool), reserve: { objet: n },
     foyers: [{ maison (son id), membres: [{ id, prenom, genre, enfant, perso, metier (null : le
       jardin ; un enfant : null), lit (son rang dans les lits de la maison, ou null), recit (un
       personnage écrit du récit : son id dans RECIT.PERSONNAGES ; absent pour les autres) }],
       bourse, garde: { objet: n } (le garde-manger), bonheur, jour (le dernier jour vécu),
       vus: null | { jour, n: { membre: actions }, items } (ce qu'il a fait sous les yeux du joueur
       aujourd'hui), journal: [journées] }] } }

   La nuit (habitantsNuit, appelé par runNight), chaque foyer vit sa journée, que le joueur soit là
   ou non (au plus RATTRAPAGE jours d'un coup) : le métier produit (ACTIONS par adulte, moins celles
   déjà faites sous les yeux du joueur), le jardin donne ses légumes, les jardins et le poulailler
   du hameau leur part ; la famille mange (les plats de sa cuisine, puis des aliments crus, pour le
   besoin de FAMILLE.AJ), son bonheur suit les règles de la famille du joueur (mealHappinessDelta :
   le déclin, les plats, la faim) ; le garde-manger garde GARDE aliments de chaque sorte, le reste va
   à la réserve du hameau (que la calèche de la fiche 7c achètera). Le journal garde les derniers
   jours.

   Sous les yeux du joueur, la scène (js/carte/ferme/habitants.js) montre la même journée : un geste
   fini (un arbre abattu, un poisson pris…) passe par habitantAgit, qui le compte une fois (le quota
   du jour, l'arbre pris comme si le joueur l'avait coupé : monde-recolte.js). */

export const HABITANTS = DATA.HABITANTS;
const METIERS = HABITANTS.METIERS;

const graineDe = (state) => farmSeed(state) || 'monde';
const rngDe = (cle) => mulberry32(hache(cle));
const entre = (rnd, [a, b]) => a + Math.floor(rnd() * (b - a + 1));
const ajoute = (o, k, n) => { if (n > 0) o[k] = (o[k] || 0) + n; };
const somme = (o) => Object.values(o || {}).reduce((t, n) => t + n, 0);
// Une clé tirée selon ses poids ({ clé: poids }).
function parPoids(rnd, poids) {
  const e = Object.entries(poids || {});
  let x = rnd() * e.reduce((t, [, w]) => t + w, 0);
  for (const [k, w] of e) { x -= w; if (x < 0) return k; }
  return e.length ? e[e.length - 1][0] : null;
}
const mangeable = (item) => { const d = DATA.OBJETS[item]; return !!d && !!d.mangeable && d.energie > 0; };

/* ---------- les habitants de la partie ---------- */

// Les hameaux peuplés : { [id]: hameau } (lecture ; {} sans eux).
export function habitantsDe(state) {
  const h = state && state.monde && state.monde.habitants;
  return h && typeof h === 'object' ? h : {};
}

// Les habitants du hameau `id`, ou null (pas encore peuplé).
export function hameauHabite(state, id) {
  return habitantsDe(state)[id] || null;
}

/* ---------- la naissance des foyers ---------- */

// Le hameau `plan` (planHameau(…).plan : maisons, lits, métier, jardins, travail) est découvert :
// chaque maison prend son foyer, une fois. `o.eau` : l'eau où pêche son pêcheur (le coin de pêche le
// plus proche ; sinon la mer sur la côte, la rivière ailleurs). → les habitants du hameau, ou null.
export function peuplerHameau(state, plan, o = {}) {
  if (!state || !state.monde || typeof state.monde !== 'object' || !plan || !plan.id || !Array.isArray(plan.maisons)) return null;
  if (!state.monde.habitants || typeof state.monde.habitants !== 'object') state.monde.habitants = {};
  const H = state.monde.habitants;
  if (H[plan.id]) return H[plan.id];
  const g = graineDe(state), rnd = rngDe(`${g}:habitants:${plan.id}`);
  // (les prénoms et les personnages du hameau, mélangés une fois : chacun le sien)
  const melange = (liste) => liste.map((v) => [rnd(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const prenoms = { f: melange(HABITANTS.PRENOMS.f), m: melange(HABITANTS.PRENOMS.m) };
  const P = HABITANTS.PERSOS;
  const persos = { adulte: { f: melange(P.adulte.f), m: melange(P.adulte.m) }, enfant: { f: melange(P.enfant.f), m: melange(P.enfant.m) } };
  const autre = (g2) => (g2 === 'f' ? 'm' : 'f');
  const tire = (listes, genre) => (listes[genre].length ? listes[genre].shift() : listes[autre(genre)].shift());
  const metier = METIERS[plan.metier] ? plan.metier : 'cueilleur';
  const S = HABITANTS.SECOND;
  // (la maison de Maurice, au Gué, reste fermée : personne n'y vit ; docs/recit/bible.md)
  const foyers = plan.maisons.filter((mz) => mz.id !== plan.maisonMaurice).map((mz) => {
    // (la composition : la graine du monde, le hameau, la maison)
    const rm = rngDe(`${g}:habitants:${plan.id}:${mz.id}`);
    const lits = Array.isArray(mz.lits) ? mz.lits : [];
    const total = lits.length;
    const [aMin, aMax] = HABITANTS.ADULTES;
    let adultes = rm() * 100 < HABITANTS.SEUL ? aMin : aMax;
    adultes = Math.max(1, Math.min(adultes, aMax, Math.max(1, total)));
    const enfants = Math.max(0, Math.min(entre(rm, HABITANTS.ENFANTS), total - adultes));
    const g1 = rm() < 0.5 ? 'f' : 'm', g2 = rm() < 0.85 ? autre(g1) : g1;
    // (les lits : les adultes dans ceux d'adulte d'abord, les enfants dans ceux d'enfant)
    const libres = lits.map((l, k) => ({ k, sorte: l.sorte }));
    const prend = (sorte) => {
      let q = libres.findIndex((l) => l.sorte === sorte);
      if (q < 0) q = libres.length ? 0 : -1;
      return q < 0 ? null : libres.splice(q, 1)[0].k;
    };
    const membres = [];
    for (let k = 0; k < adultes; k++) {
      const genre = k === 0 ? g1 : g2;
      let mt = metier;
      if (k > 0) {
        const r = rm() * 100;
        const autres = S.METIERS.filter((x) => x !== metier && METIERS[x]);
        mt = r < S.MEME ? metier : r < S.MEME + S.AUTRE && autres.length ? autres[Math.floor(rm() * autres.length)] : null;
      }
      membres.push({ id: `${mz.id}:${membres.length}`, prenom: tire(prenoms, genre) || 'Jean', genre, enfant: false, perso: tire(persos.adulte, genre) || 1, metier: mt, lit: prend('lit_adulte') });
    }
    for (let k = 0; k < enfants; k++) {
      const genre = rm() < 0.5 ? 'f' : 'm';
      membres.push({ id: `${mz.id}:${membres.length}`, prenom: tire(prenoms, genre) || 'Jean', genre, enfant: true, perso: tire(persos.enfant, genre) || 1, metier: null, lit: prend('lit_enfant') });
    }
    return { maison: mz.id, membres, bourse: HABITANTS.ARGENT, garde: {}, bonheur: DATA.BONHEUR.DEPART, jour: state.day - 1, vus: null, journal: [] };
  });
  // Le récit (docs/recit/personnages.md) : les personnages écrits qui vivent dans ce hameau garanti
  // (RECIT.PERSONNAGES[].habite ; « gue » : le Gué) occupent, seuls, les premiers foyers, avec leur prénom
  // et leur apparence ; ils portent l'id de leur personnage (recit : leurs répliques, js/engine/recit.js).
  // Personne d'autre dans le hameau n'a leur prénom ni leur apparence.
  const ecrits = Object.entries((DATA.RECIT && DATA.RECIT.PERSONNAGES) || {})
    .filter(([, d]) => d.habite && d.habite.hameau === 'gue' && plan.gue);
  ecrits.forEach(([rid, d], k) => {
    const f = foyers[k];
    if (!f) return;
    const mz = plan.maisons.find((x) => x.id === f.maison) || {};
    const lits = Array.isArray(mz.lits) ? mz.lits : [];
    const q = lits.findIndex((l) => l.sorte === 'lit_adulte');
    f.membres = [{ id: `${f.maison}:0`, prenom: d.nom, genre: d.habite.genre, enfant: false, perso: d.perso, metier: d.habite.metier || null, lit: q >= 0 ? q : lits.length ? 0 : null, recit: rid }];
  });
  for (const [, d] of ecrits) {
    for (const f of foyers) for (const m of f.membres) {
      if (m.recit) continue;
      if (m.prenom === d.nom) m.prenom = tire(prenoms, m.genre) || 'Jean';
      if (!m.enfant && m.perso === d.perso) m.perso = tire(persos.adulte, m.genre) || 1;
    }
  }
  const jardins = { potager: 0, verger: 0 };
  for (const j of plan.jardins || []) if (j.genre in jardins) jardins[j.genre]++;
  const eau = ['mer', 'lac', 'riviere'].includes(o.eau) ? o.eau : plan.style === 'cote' ? 'mer' : 'riviere';
  H[plan.id] = {
    nom: String(plan.nom || plan.id), metier, style: plan.style || 'prairie', eau, jour: state.day,
    jardins, poulailler: (plan.travail || []).some((t) => t.genre === 'poulailler'), reserve: {}, foyers,
  };
  return H[plan.id];
}

/* ---------- le travail ---------- */

// Les actions du jour d'un adulte du métier M (une de moins quand le foyer est triste).
function quotaDe(f, M) {
  return Math.max(1, M.ACTIONS - (f.bonheur < HABITANTS.TRISTE ? 1 : 0));
}

// Ce que donne une action du métier M (au bord de l'eau `eau`) : { objet: n }.
function action(rnd, M, eau) {
  const out = {};
  for (const [item, q] of Object.entries(M.donne || {})) ajoute(out, item, entre(rnd, q));
  if (M.une_de) {
    const table = M.une_de[eau] || M.une_de['*'] || Object.values(M.une_de)[0];
    const n = entre(rnd, M.nombre || [1, 1]);
    for (let k = 0; k < n; k++) ajoute(out, parPoids(rnd, table), 1);
  }
  for (const [item, pct] of Object.entries(M.chance || {})) if (rnd() * 100 < pct) ajoute(out, item, 1);
  return out;
}

// Le foyer et le membre `membreId` du hameau `h`, ou null.
function trouver(h, membreId) {
  for (const f of (h && h.foyers) || []) {
    const m = f.membres.find((x) => x.id === membreId);
    if (m) return { f, m };
  }
  return null;
}

// Sous les yeux du joueur, l'habitant `membreId` du hameau `hameauId` vient de finir un geste de son
// métier (`geste` : couper, pecher, piocher, traire, cueillir ; `id` : l'arbre du monde qu'un
// bûcheron abat) : il compte dans la journée de son foyer, une fois (le quota du jour : la nuit ne
// fera que ce qui reste). → { ok, items (ce qu'il a pris, dans le garde-manger), reste (ses actions
// d'aujourd'hui qui restent) } ou un refus (fini : il a fait sa journée).
export function habitantAgit(state, hameauId, membreId, geste, id) {
  const h = hameauHabite(state, hameauId), t = trouver(h, membreId);
  if (!t) return fail('Personne de ce nom ici.');
  const { f, m } = t, M = METIERS[m.metier];
  if (m.enfant || !M) return fail('Ce n\'est pas son métier.');
  if (M.geste !== geste) return fail('Ce n\'est pas son métier.');
  if (!f.vus || f.vus.jour !== state.day) f.vus = { jour: state.day, n: {}, items: {} };
  const faits = f.vus.n[m.id] || 0, quota = quotaDe(f, M);
  if (faits >= quota) return { ok: false, error: 'Sa journée est faite.', fini: true };
  if (id !== undefined && id !== null) {
    // (un arbre du monde : il est pris comme si le joueur l'avait coupé, monde-recolte.js)
    const o = lireIdMonde(id);
    if (geste !== 'couper' || !o || !o.regle || o.regle.geste !== 'couper') return fail('Il n\'y a rien à couper ici.');
    if (objetPris(state, id) || !prendreParHabitant(state, id)) return fail('Déjà abattu.');
  }
  const items = action(rngDe(`${graineDe(state)}:${m.id}:vu:${state.day}:${faits}`), M, h.eau);
  for (const [item, n] of Object.entries(items)) { ajoute(f.garde, item, n); ajoute(f.vus.items, item, n); }
  f.vus.n[m.id] = faits + 1;
  return { ok: true, items, reste: quota - faits - 1 };
}

// Ce qui reste à faire aujourd'hui à l'habitant `membreId` (ses actions ; 0 : un enfant, le jardin,
// ou sa journée faite).
export function habitantReste(state, hameauId, membreId) {
  const t = trouver(hameauHabite(state, hameauId), membreId);
  if (!t || t.m.enfant || !METIERS[t.m.metier]) return 0;
  const faits = t.f.vus && t.f.vus.jour === state.day ? t.f.vus.n[t.m.id] || 0 : 0;
  return Math.max(0, quotaDe(t.f, METIERS[t.m.metier]) - faits);
}

/* ---------- la journée d'un foyer ---------- */

// Les plats que le foyer sait faire : la cuisine du métier de son premier adulte (ou du jardin).
function recettesDu(f) {
  const a = f.membres.find((m) => !m.enfant);
  const M = a && METIERS[a.metier];
  return ((M && M.RECETTES) || HABITANTS.JARDINIER.RECETTES).filter((id) => DATA.RECETTES[id]);
}

// Le plat `id` avec ce qu'il y a au garde-manger : ses ingrédients pris (true), ou rien (false).
function cuisiner(garde, id) {
  const r = DATA.RECETTES[id], pris = {};
  for (const ing of r.ingredients) {
    const x = ingredientOptions(ing).find((it) => (garde[it] || 0) - (pris[it] || 0) >= ing.qte);
    if (!x) return false;
    ajoute(pris, x, ing.qte);
  }
  for (const [it, n] of Object.entries(pris)) garde[it] -= n;
  return true;
}

// Ce qui part à la réserve du hameau (RESERVE_MAX par objet ; ce qui dépasse se perd).
function versReserve(h, item, n, J) {
  const avant = h.reserve[item] || 0, apres = Math.min(HABITANTS.RESERVE_MAX, avant + n);
  if (apres > avant) { h.reserve[item] = apres; ajoute(J.reserve, item, apres - avant); }
}

// Le foyer `f` du hameau `h` vit la journée `jour`. → son entrée du journal.
function journee(h, f, jour, g) {
  const rnd = rngDe(`${g}:${f.maison}:jour:${jour}`);
  const J = { jour, produit: {}, jardin: {}, mange: {}, couverture: 100, bonheur: 0, reserve: {}, vus: 0 };
  if (!f.garde || typeof f.garde !== 'object') f.garde = {};
  const vus = f.vus && f.vus.jour === jour ? f.vus : null;
  // le travail : les actions qui restent (celles faites sous les yeux du joueur comptent déjà)
  for (const m of f.membres) {
    const M = !m.enfant && METIERS[m.metier];
    if (!M) continue;
    const faits = vus ? vus.n[m.id] || 0 : 0;
    for (let k = faits; k < quotaDe(f, M); k++) for (const [item, n] of Object.entries(action(rnd, M, h.eau))) { ajoute(f.garde, item, n); ajoute(J.produit, item, n); }
  }
  if (vus) { for (const [item, n] of Object.entries(vus.items)) ajoute(J.produit, item, n); J.vus = somme(vus.n); }
  // le jardin du foyer (et son jardinier), les potagers, les vergers et le poulailler du hameau
  const JD = HABITANTS.JARDIN;
  let legumes = 0;
  for (const m of f.membres) legumes += entre(rnd, JD.FOYER);
  if (f.membres.some((m) => !m.enfant && !m.metier)) legumes += entre(rnd, JD.JARDINIER);
  for (let k = 0; k < (h.jardins.potager || 0); k++) legumes += entre(rnd, JD.POTAGER);
  for (let k = 0; k < legumes; k++) ajoute(J.jardin, parPoids(rnd, JD.LEGUMES), 1);
  for (let k = 0; k < (h.jardins.verger || 0); k++) for (let q = entre(rnd, JD.VERGER); q > 0; q--) ajoute(J.jardin, parPoids(rnd, JD.FRUITS), 1);
  if (h.poulailler) ajoute(J.jardin, 'oeuf', entre(rnd, JD.OEUFS));
  for (const [item, n] of Object.entries(J.jardin)) ajoute(f.garde, item, n);
  // le repas : des plats différents d'abord (chacun rend son bonheur une fois : PLATS_MAX au plus,
  // même le besoin couvert, pour le plaisir), encore des plats, puis des aliments crus, tant que le
  // besoin n'est pas couvert
  const AJ = DATA.FAMILLE.AJ;
  const besoin = f.membres.reduce((t, m) => t + (m.enfant ? AJ.enfant : AJ.adulte), 0);
  const livre = recettesDu(f);
  let energie = 0;
  for (const id of livre) {
    if (Object.keys(J.mange).length >= DATA.BONHEUR.PLATS_MAX) break;
    if (cuisiner(f.garde, id)) { energie += dishEnergy(id); ajoute(J.mange, id, 1); }
  }
  for (let fait = true; fait && energie < besoin;) {
    fait = false;
    for (const id of livre) if (energie < besoin && cuisiner(f.garde, id)) { energie += dishEnergy(id); ajoute(J.mange, id, 1); fait = true; }
  }
  while (energie < besoin) {
    const x = Object.keys(f.garde).filter((it) => f.garde[it] > 0 && mangeable(it)).sort((a, b) => DATA.OBJETS[b].energie - DATA.OBJETS[a].energie || (a < b ? -1 : 1))[0];
    if (!x) break;
    f.garde[x] -= 1;
    energie += DATA.OBJETS[x].energie;
    ajoute(J.mange, x, 1);
  }
  J.couverture = besoin ? Math.min(100, Math.round((energie / besoin) * 100)) : 100;
  J.bonheur = mealHappinessDelta({ mange: J.mange, couverture: J.couverture });
  f.bonheur = Math.max(0, Math.min(DATA.BONHEUR.MAX, Math.round((Number(f.bonheur) || 0) + J.bonheur)));
  // le garde-manger garde GARDE aliments de chaque sorte ; le reste va à la réserve du hameau
  for (const item of Object.keys(f.garde).sort()) {
    const surplus = f.garde[item] - (mangeable(item) ? HABITANTS.GARDE : 0);
    if (surplus > 0) { f.garde[item] -= surplus; versReserve(h, item, surplus, J); }
    if (!(f.garde[item] > 0)) delete f.garde[item];
  }
  if (!Array.isArray(f.journal)) f.journal = [];
  f.journal.push(J);
  if (f.journal.length > HABITANTS.JOURNAL) f.journal.splice(0, f.journal.length - HABITANTS.JOURNAL);
  f.jour = jour;
  if (f.vus && !(f.vus.jour > jour)) f.vus = null;
  return J;
}

// La nuit (runNight, avant le jour suivant) : chaque foyer de chaque hameau peuplé vit les journées
// qui lui manquent jusqu'à aujourd'hui (au plus RATTRAPAGE), que le joueur soit là ou non. →
// { foyers (vécus), journees }.
export function habitantsNuit(state) {
  const H = habitantsDe(state), g = graineDe(state);
  let foyers = 0, journees = 0;
  for (const h of Object.values(H)) {
    if (!h || !Array.isArray(h.foyers)) continue;
    if (!h.reserve || typeof h.reserve !== 'object') h.reserve = {};
    if (!h.jardins || typeof h.jardins !== 'object') h.jardins = { potager: 0, verger: 0 };
    for (const f of h.foyers) {
      if (!Number.isFinite(Number(f.jour))) f.jour = state.day - 1;
      if (!(Number(f.jour) < state.day)) continue;
      foyers++;
      for (let jour = Math.max(Number(f.jour) + 1, state.day - HABITANTS.RATTRAPAGE + 1); jour <= state.day; jour++) { journee(h, f, jour, g); journees++; }
    }
  }
  return { foyers, journees };
}

/* ---------- la parole et la fiche ---------- */

const genreDe = (m) => (m.genre === 'm' ? 'm' : 'f');

// Le métier de l'habitant, dit pour lui (« bûcheronne », « jardinier », « fille de Jeanne »).
export function metierHabitant(h, m) {
  if (m.enfant) {
    const f = (h.foyers || []).find((x) => x.membres.includes(m)), parent = f && f.membres.find((x) => !x.enfant);
    // (« fille de Jeanne », « fils d'Adrien »)
    return (m.genre === 'm' ? 'fils' : 'fille') + (parent ? (/^[aeiouyhàâéèêëîïôûAEIOUYHÀÂÉÈÊËÎÏÔÛ]/.test(parent.prenom) ? ` d'${parent.prenom}` : ` de ${parent.prenom}`) : '');
  }
  const M = METIERS[m.metier];
  return ((M || HABITANTS.JARDINIER).nom || {})[genreDe(m)] || '';
}

// Toucher un habitant : { prenom, metier, texte } (son salut selon l'heure, ce qu'il fait,
// son humeur) ; `o` : { heure, activite (dort, maison, chemin, travail, joue, repas, rentre, soir),
// n (le rang de l'appui : une autre phrase à chaque fois), salut (un salut qui remplace celui de
// l'heure : la confiance du hameau, paroleHameau dans recit.js) }. null : personne de ce nom.
// Un foyer qui a eu faim ne parle pas de passer à table : la phrase du repas saute.
export function paroleHabitant(state, hameauId, membreId, o = {}) {
  const h = hameauHabite(state, hameauId), t = trouver(h, membreId);
  if (!t) return null;
  const { f, m } = t, P = HABITANTS.PHRASES;
  const rnd = rngDe(`${membreId}:${state.day}:${o.n || 0}`);
  const un = (liste) => (liste && liste.length ? liste[Math.floor(rnd() * liste.length)] : '');
  const heure = Number(o.heure) || 12;
  const out = { prenom: m.prenom, metier: metierHabitant(h, m), texte: '' };
  if (o.activite === 'dort') { out.texte = un(P.activite.dort); return out; }
  const salutHeure = un(P.salut[heure < 10 ? 'matin' : heure < 18 ? 'jour' : heure < 22 ? 'soir' : 'nuit']);
  const salut = typeof o.salut === 'string' && o.salut ? o.salut : salutHeure;
  const dernier = f.journal && f.journal[f.journal.length - 1];
  const humeur = dernier && dernier.couverture < 100 ? 'faim' : f.bonheur >= HABITANTS.HEUREUX ? 'heureux' : f.bonheur < HABITANTS.TRISTE ? 'triste' : 'content';
  const fait = o.activite === 'travail' ? un(P.travail[m.metier] || P.travail.jardinier)
    : o.activite === 'repas' && humeur === 'faim' ? '' : un(P.activite[o.activite] || P.activite.maison);
  out.texte = [salut, fait, un(P.humeur[humeur])].filter(Boolean).join(' ');
  out.humeur = humeur;
  return out;
}

// La fiche du hameau `id` (le panneau de la place) : { nom, metier, style, familles: [{ maison,
// membres: [{ id, prenom, metier, enfant, perso }], bonheur, couverture (hier), bourse }], reserve
// ([objet, n], du plus nombreux au moins), hier ({ objet: n } : ce qui y est entré la dernière nuit),
// jour (sa découverte) }, ou null.
export function ficheHameau(state, id) {
  const h = hameauHabite(state, id);
  if (!h) return null;
  const hier = {};
  let dernier = -Infinity;
  for (const f of h.foyers) { const J = f.journal && f.journal[f.journal.length - 1]; if (J && J.jour > dernier) dernier = J.jour; }
  for (const f of h.foyers) { const J = f.journal && f.journal[f.journal.length - 1]; if (J && J.jour === dernier) for (const [it, n] of Object.entries(J.reserve || {})) ajoute(hier, it, n); }
  return {
    nom: h.nom, metier: h.metier, style: h.style, jour: h.jour,
    familles: h.foyers.map((f) => {
      const J = f.journal && f.journal[f.journal.length - 1];
      return {
        maison: f.maison, bonheur: f.bonheur, couverture: J ? J.couverture : null, bourse: f.bourse,
        membres: f.membres.map((m) => ({ id: m.id, prenom: m.prenom, metier: metierHabitant(h, m), enfant: !!m.enfant, perso: m.perso })),
      };
    }),
    reserve: Object.entries(h.reserve).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)),
    hier,
    // le dernier passage de la calèche (caleche.js, fiche 7c) : { jour, achats, pieces }, ou null
    caleche: h.caleche && typeof h.caleche === 'object' ? h.caleche : null,
  };
}

// Pour la scène (le modèle de la carte, js/ui/stage.js) : les hameaux peuplés, { [id]: { foyers:
// [{ maison, membres: [{ id, perso, enfant, metier, lit }] }] } }.
export function habitantsPourLaCarte(state) {
  const out = {};
  for (const [id, h] of Object.entries(habitantsDe(state))) {
    if (!h || !Array.isArray(h.foyers)) continue;
    out[id] = { metier: h.metier, foyers: h.foyers.map((f) => ({ maison: f.maison, membres: f.membres.map((m) => ({ id: m.id, perso: m.perso, enfant: !!m.enfant, metier: m.metier || null, lit: m.lit })) })) };
  }
  return out;
}
