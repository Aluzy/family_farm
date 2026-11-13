/* ---------- les noms que le joueur donne (le chantier « l'île à bâtir », fiche I7g) ----------

   L'île, le village, chaque commerce et, si le joueur le veut, chaque maison ont un nom (VILLAGE.NOMS, data/village.json) :
   proposé à la graine de la ferme, modifiable à tout moment, borné comme le nom de famille (DEPART.NOM_MIN à
   DEPART.NOM_MAX signes). Les lignes de la chronique gardent le nom du jour où elles s'écrivent (chronique.js) :
   renommer change ce qui s'affiche (la fenêtre, le panneau du village), pas les lignes passées.

   state.noms = {
     ile (le nom de l'île : la fiche I7b le pose à la création ; une partie qui n'en a pas en reçoit un, tiré de sa graine),
     village (null tant que le village n'est pas nommé : il l'est quand le NOMS.VILLAGE_A-ième villageois adulte
       s'installe, nommerVillageSiBesoin),
     commerces: { id du commerce: nom } (la fiche I5a : nommerCommerce, à son ouverture),
     maisons: { case de la boîte aux lettres: nom } (si le joueur le veut),
     avis: ['village'] (ce que la page doit encore proposer au joueur : nommer le village) }.
   Il ne naît qu'avec le chantier allumé (createInitialState, allumerEssaiVillage, ou le premier besoin) ; éteint, une
   partie n'en a pas. Les tests : tests/engine/village-chronique.test.mjs. */

import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { hache } from './ferme-generee.js';
import { farmSeed } from './terrain.js';
import { texteDuRecit, villageActif } from './village.js';

const N = () => (DATA.VILLAGE && DATA.VILLAGE.NOMS) || {};
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const SORTES = ['ile', 'village', 'commerce', 'maison'];
const longueur = (t) => Array.from(t).length;

/* ---------- borner un nom ---------- */

// Un nom nettoyé : les caractères de contrôle et les blancs répétés deviennent une espace, sans espace au bout.
export function nettoyerNom(texte) {
  if (typeof texte !== 'string') return '';
  return texte.replace(/[\u0000-\u001f\u007f\u2028\u2029\s]+/g, ' ').trim();
}

// Pourquoi ce nom ne va pas (un texte), ou null : de DEPART.NOM_MIN à DEPART.NOM_MAX signes une fois nettoyé.
export function nomRefus(texte) {
  const D = DATA.DEPART, n = longueur(nettoyerNom(texte));
  return n < D.NOM_MIN || n > D.NOM_MAX ? `Un nom fait de ${D.NOM_MIN} à ${D.NOM_MAX} signes.` : null;
}

const valide = (t) => typeof t === 'string' && nomRefus(t) === null && nettoyerNom(t) === t;

/* ---------- la partie ---------- */

// Les noms de la partie (créés au besoin, réparés s'ils sont abîmés). Ne nomme pas le village.
export function nomsDe(state) {
  if (!objet(state.noms)) state.noms = {};
  const n = state.noms;
  if (!valide(n.ile)) n.ile = proposerNom(state, 'ile');
  if (n.village !== null && !valide(n.village)) n.village = null;
  for (const k of ['commerces', 'maisons']) {
    if (!objet(n[k])) n[k] = {};
    for (const [id, v] of Object.entries(n[k])) if (!valide(v)) delete n[k][id];
  }
  if (!Array.isArray(n.avis)) n.avis = [];
  n.avis = n.avis.filter((a) => a === 'village');
  return n;
}

// Les noms d'une partie neuve du chantier : l'île nommée à la graine, le reste à venir.
export function nouveauxNoms(state) {
  return { ile: proposerNom(state, 'ile'), village: null, commerces: {}, maisons: {}, avis: [] };
}

// Les noms d'une sauvegarde (la migration v92 → v93) : la forme réparée ; l'île nommée si elle ne l'est pas.
export function reparerNoms(state) {
  const n = objet(state.noms) ? state.noms : {};
  state.noms = { ile: n.ile, village: n.village === undefined ? null : n.village, commerces: n.commerces, maisons: n.maisons, avis: n.avis };
  nomsDe(state);
  return state.noms;
}

// Le nom donné à `quoi` ('ile', 'village', 'commerce', 'maison' ; `id` : le commerce, la case de la boîte aux lettres),
// ou null. Ne crée rien (une partie sans noms : l'île n'a pas encore de nom).
export function nomDe(state, quoi, id = null) {
  const n = state && objet(state.noms) ? state.noms : null;
  if (!n) return null;
  if (quoi === 'ile') return valide(n.ile) ? n.ile : null;
  if (quoi === 'village') return valide(n.village) ? n.village : null;
  const L = quoi === 'commerce' ? n.commerces : quoi === 'maison' ? n.maisons : null;
  const v = objet(L) ? L[String(id)] : null;
  return valide(v) ? v : null;
}

// Le nom que portent le panneau et le titre de la chronique : le village, sinon l'île, sinon ''.
export function nomAffiche(state) {
  return nomDe(state, 'village') || nomDe(state, 'ile') || '';
}

/* ---------- proposer ---------- */

const tirage = (state, quoi, id, rang) => mulberry32(hache(`${farmSeed(state) || 'ile'}:noms:${quoi}:${id === null ? '' : id}:${rang}`));

// Les noms possibles pour `quoi` (dans l'ordre des données), sans ceux qui passent NOM_MAX signes.
function possibles(quoi, sorte = null) {
  const M = N(), max = DATA.DEPART.NOM_MAX;
  let L = [];
  if (quoi === 'ile') L = M.ILE || [];
  else if (quoi === 'village') {
    const V = M.VILLAGE || {};
    for (const d of V.DEBUTS || []) for (const f of V.FINS || []) L.push(d + f);
  } else if (quoi === 'commerce') {
    const mot = motCommerce(sorte)[1];
    L = (M.COMPLEMENTS || []).map((c) => `${mot} ${c}`);
  } else if (quoi === 'maison') L = (M.MAISONS || []).map((c) => `Maison ${c}`);
  // (fiche I7d : aucun nom du récit — « Bois-Joli », « Île aux Mouettes » ne sont pas proposés ; village.js texteDuRecit)
  return L.filter((t) => longueur(t) <= max && longueur(t) >= DATA.DEPART.NOM_MIN && !texteDuRecit(t));
}

// L'article et le mot d'un commerce (NOMS.COMMERCES : la forge, la mercerie… ; un commerce inconnu : l'échoppe).
export function motCommerce(sorte) {
  const C = N().COMMERCES || {};
  return C[sorte] || C['*'] || ["l'", 'Échoppe'];
}

// Un nom proposé pour `quoi`, tiré de la graine de la ferme, de `id` et du rang (`rang` 0, puis 1 pour « un autre nom »…) ;
// pour un commerce, `o.sorte` (forge…). Un autre nom que ceux déjà pris quand il y en a.
export function proposerNom(state, quoi, id = null, rang = 0, o = {}) {
  if (!SORTES.includes(quoi)) return '';
  const L = possibles(quoi, o.sorte);
  if (!L.length) return quoi === 'ile' ? 'Île' : 'Village';
  const n = objet(state && state.noms) ? state.noms : {};
  const pris = new Set([n.ile, n.village, ...Object.values(objet(n.commerces) ? n.commerces : {}), ...Object.values(objet(n.maisons) ? n.maisons : {})].filter(Boolean));
  const libres = L.filter((t) => !pris.has(t));
  const pool = libres.length ? libres : L;
  const rnd = tirage(state, quoi, id, Math.max(0, Math.floor(Number(rang) || 0)));
  return pool[Math.floor(rnd() * pool.length)];
}

/* ---------- nommer, renommer ---------- */

// Donne le nom `texte` à `quoi` (`id` pour un commerce ou une maison). Borné (nomRefus) ; une chaîne vide efface le
// nom d'une maison. → { ok, nom, avant } ou un refus.
export function renommer(state, quoi, texte, id = null) {
  if (!villageActif(state)) return { ok: false, error: 'Le chantier de l\'île n\'est pas allumé.' };
  if (!SORTES.includes(quoi)) return { ok: false, error: 'Rien à nommer ici.' };
  const n = nomsDe(state), nom = nettoyerNom(texte);
  if (quoi === 'maison' && !nom) {
    const avant = n.maisons[String(id)] || null;
    delete n.maisons[String(id)];
    return { ok: true, nom: null, avant };
  }
  const refus = nomRefus(nom);
  if (refus) return { ok: false, error: refus };
  if ((quoi === 'commerce' || quoi === 'maison') && (id === null || id === undefined || String(id) === '')) return { ok: false, error: 'Lequel ?' };
  let avant;
  if (quoi === 'ile') { avant = n.ile; n.ile = nom; }
  else if (quoi === 'village') { avant = n.village; n.village = nom; n.avis = n.avis.filter((a) => a !== 'village'); }
  else if (quoi === 'commerce') { avant = n.commerces[String(id)] || null; n.commerces[String(id)] = nom; }
  else { avant = n.maisons[String(id)] || null; n.maisons[String(id)] = nom; }
  return { ok: true, nom, avant: avant || null };
}

// Le village prend un nom quand le NOMS.VILLAGE_A-ième villageois adulte s'installe : le nom proposé est pris, et la page
// propose au joueur de le changer (l'avis « village »). → le nom donné, ou null (déjà nommé, pas encore le moment).
export function nommerVillageSiBesoin(state) {
  if (!villageActif(state)) return null;
  const adultes = (Array.isArray(state.villageois) ? state.villageois : []).filter((v) => objet(v) && !v.enfant).length;
  if (adultes < Math.max(1, Number(N().VILLAGE_A) || 3)) return null;
  const n = nomsDe(state);
  if (n.village) return null;
  n.village = proposerNom(state, 'village');
  if (!n.avis.includes('village')) n.avis.push('village');
  return n.village;
}

// Le nom d'un commerce qui ouvre (la fiche I5a l'appellera) : celui qu'il a déjà, sinon un nom proposé à la graine
// (« Forge du Vieux Chêne »), gardé. `o.sorte` : forge, mercerie… → le nom, ou null le chantier éteint.
export function nommerCommerce(state, id, o = {}) {
  if (!villageActif(state) || id === null || id === undefined || String(id) === '') return null;
  const n = nomsDe(state), k = String(id);
  if (!n.commerces[k]) n.commerces[k] = proposerNom(state, 'commerce', k, 0, o);
  return n.commerces[k];
}

// Le nom de l'île dans une phrase : « l'Île aux Mouettes » (un nom qui commence par « Île »), sinon tel quel.
export function ileEnPhrase(nom) {
  return typeof nom === 'string' && /^[ÎI]le\b/.test(nom) ? `l'${nom}` : nom || '';
}

// Le nom d'un commerce dans une phrase : « la forge du Vieux Chêne » (le nom commence par le mot du commerce : son
// article, le mot en minuscules), sinon « la forge « La Belle Enclume » ».
export function commerceEnPhrase(nom, sorte = null) {
  const [article, mot] = motCommerce(sorte);
  const lie = article.endsWith("'") ? article : `${article} `;
  if (nom && nom.toLowerCase().startsWith(mot.toLowerCase())) return `${lie}${mot.toLowerCase()}${nom.slice(mot.length)}`;
  return nom ? `${lie}${mot.toLowerCase()} « ${nom} »` : `${lie}${mot.toLowerCase()}`;
}
