import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { fail } from './devices.js';
import { hourOfDay } from './clock.js';
import { moonPhase } from './lune.js';
import { chapterReached, isUnlocked } from './campaign.js';
import { findMember, memberName } from './family.js';
import { hache } from './ferme-generee.js';
import { farmSeed } from './terrain.js';
import { soilCount } from './crops.js';
import { fellenTrees } from './outils.js';
import { garantiDuHameau, habitantsDe, paroleHabitant, retirerEcrit } from './habitants.js';
import { usureNuit } from './usure.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { earn } from './compta.js';
import { piecesPrincipal } from './equipement.js';

/* ---------- le récit de Céron : la mémoire, les relations et les répliques (docs/recit/) ----------

   Le moteur du récit ne raconte rien de lui-même : il se souvient de ce que le joueur a fait (les
   faits), de ce que chaque personnage écrit pense de lui (les relations), de la confiance de chaque
   hameau, des répliques déjà dites et des pages du carnet, puis il choisit, quand la page le lui
   demande, la réplique ou la scène qui convient. Tout le texte et toutes les conditions sont dans
   data/recit.json (RECIT) ; aucune phrase d'histoire n'est écrite ici.

   state.recit = {
     faits: { [fait]: [premier jour, dernier jour, nombre de fois] } — un acte notable (« achille.cle »,
       « vente.caleche ») ; le dernier jour sert à l'âge du souvenir (récent, souvenir, ancien) ;
     relations: { [personnage]: points } — de 0 à RELATION_MAX, entiers ; leur palier se lit dans PALIERS ;
     confiance: { [hameau]: points } — de 0 à CONFIANCE.MAX, entiers ; absent : CONFIANCE.DEPART ;
     dites: { [réplique ou scène]: jour } — le dernier jour où elle a été dite (une scène, jouée) ;
     carnet: [fragment] — les pages du carnet du joueur, dans l'ordre où elles sont venues ;
     promesses: { [promesse]: { [objet]: quantité donnée } } — ce que le joueur a déjà confié à Achille
       pour chaque promesse de Maurice (lot 6).
   }

   Absent d'une partie d'avant (ou abîmé) : recitDe le remet vide, et reparerPartie le remet au
   chargement (comme state.compagnon, fiche 19 : le format de sauvegarde ne change pas).

   Le choix (choisirReplique) : parmi les répliques du personnage dont toutes les conditions sont
   vraies, hors celles « une fois » déjà dites et celles encore au repos, la plus prioritaire ; à
   priorité égale, un tirage de la graine du monde, du personnage, du jour et du nombre de touchers
   (ctx.n), comme paroleHabitant : le moteur reste déterministe, et deux touchers de suite peuvent
   donner deux répliques différentes.

   Le contexte `ctx` vient de la page : { lieu (« ferme », « maison_maurice », l'id d'un hameau…),
   hameau (l'id du hameau où l'on est, pour la confiance), humeur, n (le nombre de touchers), vars
   (les variables du texte : { hameau, objet, quand }) }. Tout y est facultatif. */

export const RECIT = DATA.RECIT;

export function nouveauRecit() {
  return { faits: {}, relations: {}, confiance: {}, dites: {}, carnet: [], promesses: {} };
}

const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const liste = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
const entier = (v) => Math.round(Number(v) || 0);
const borne = (v, max) => Math.max(0, Math.min(max, entier(v)));
// Un nombre de la sauvegarde (relation, confiance) : un nombre fini, sinon rien (un texte n'en est pas un).
const nombre = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
// Une entrée de fait saine : trois entiers [premier jour, dernier jour, nombre de fois], sinon rien.
const faitSain = (f) => Array.isArray(f) && f.length === 3 && f.every((x) => Number.isInteger(x)) ? f : null;
const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));

// Le récit de la partie (réparé au besoin : un champ manquant ou d'un autre type est remis vide).
export function recitDe(state) {
  if (!objet(state.recit)) state.recit = nouveauRecit();
  const r = state.recit;
  for (const k of ['faits', 'relations', 'confiance', 'dites', 'promesses']) if (!objet(r[k])) r[k] = {};
  if (!Array.isArray(r.carnet)) r.carnet = [];
  return r;
}

/* ---------- les faits ---------- */

// Note un fait (ou une liste) aujourd'hui : le premier jour reste, le dernier et le nombre de fois
// suivent. Renvoie true si c'était la première fois (pour le premier fait d'une liste).
export function noterFait(state, fait) {
  const r = recitDe(state), j = jourDe(state);
  let premier = false;
  liste(fait).forEach((id, i) => {
    if (typeof id !== 'string' || !id) return;
    const f = faitSain(r.faits[id]);
    if (f) r.faits[id] = [f[0], j, f[2] + 1];
    else { r.faits[id] = [j, j, 1]; if (i === 0) premier = true; }
  });
  return premier;
}

// (une entrée abîmée de la sauvegarde compte comme un fait jamais noté : le prochain noterFait la refait)
export function aFait(state, id) {
  return !!faitSain(recitDe(state).faits[id]);
}

// Le nombre de fois qu'un fait a été noté (0 s'il ne l'a jamais été).
export function foisFait(state, id) {
  const f = faitSain(recitDe(state).faits[id]);
  return f ? f[2] : 0;
}

// L'âge d'un fait, en jours depuis la dernière fois qu'il a été noté (0 : aujourd'hui), ou null.
export function ageFait(state, id) {
  const f = faitSain(recitDe(state).faits[id]);
  return f ? Math.max(0, jourDe(state) - f[1]) : null;
}

// « recent », « souvenir » ou « ancien » (AGES) ; null pour un fait jamais noté.
export function ageSouvenir(state, id) {
  const a = ageFait(state, id);
  if (a === null) return null;
  return a <= RECIT.AGES.RECENT ? 'recent' : a <= RECIT.AGES.SOUVENIR ? 'souvenir' : 'ancien';
}

/* ---------- les relations ---------- */

export function relation(state, perso) {
  const v = nombre(recitDe(state).relations[perso]);
  return v === null ? 0 : borne(v, RECIT.RELATION_MAX);
}

// Ajoute (ou retire) des points de relation à un personnage écrit : { ok, valeur } (la nouvelle valeur).
export function ajouterRelation(state, perso, points) {
  if (!RECIT.PERSONNAGES[perso]) return fail('Personnage inconnu.');
  const r = recitDe(state);
  r.relations[perso] = borne(relation(state, perso) + entier(points), RECIT.RELATION_MAX);
  return { ok: true, valeur: r.relations[perso] };
}

// Le rang du palier (0 : inconnu … 4 : intime).
export function palier(state, perso) {
  const pts = relation(state, perso);
  let rang = 0;
  RECIT.PALIERS.forEach((seuil, i) => { if (pts >= seuil) rang = i; });
  return rang;
}

export function palierNom(state, perso) {
  return RECIT.PALIER_NOMS[palier(state, perso)];
}

/* ---------- la confiance des hameaux ---------- */

export function confiance(state, hameau) {
  const v = nombre(recitDe(state).confiance[hameau]);
  return v === null ? RECIT.CONFIANCE.DEPART : borne(v, RECIT.CONFIANCE.MAX);
}

// Ajoute (ou retire) des points de confiance à un hameau : { ok, valeur } (la nouvelle valeur).
export function ajouterConfiance(state, hameau, points) {
  if (typeof hameau !== 'string' || !hameau) return fail('Hameau inconnu.');
  const r = recitDe(state);
  r.confiance[hameau] = borne(confiance(state, hameau) + entier(points), RECIT.CONFIANCE.MAX);
  return { ok: true, valeur: r.confiance[hameau] };
}

// « reservee », « cordiale » ou « chaleureuse » : le plus haut niveau atteint (les seuils sont croissants,
// le premier à 0 : build-data.mjs le vérifie).
export function niveauConfiance(state, hameau) {
  const v = confiance(state, hameau);
  let nom = null;
  for (const [n, seuil] of Object.entries(RECIT.CONFIANCE.NIVEAUX)) if (v >= seuil) nom = n;
  return nom;
}

/* ---------- le carnet du joueur ---------- */

// Ajoute une page au carnet (une seule fois) ; renvoie true si elle est nouvelle.
export function ajouterFragment(state, id) {
  if (!RECIT.FRAGMENTS[id]) return false;
  const r = recitDe(state);
  if (r.carnet.includes(id)) return false;
  r.carnet.push(id);
  return true;
}

// Les pages du carnet : [{ id, titre, texte }], dans l'ordre où elles sont venues.
export function carnet(state) {
  return recitDe(state).carnet.filter((id) => RECIT.FRAGMENTS[id]).map((id) => ({ id, ...RECIT.FRAGMENTS[id] }));
}

/* ---------- les actes ---------- */

// Les nuits passées sur l'île (la première nuit passée, le jour 2).
export function nuitsSurIle(state) {
  return jourDe(state) - 1;
}

// L'acte en cours (1 à 4) : le plus avancé dont le chapitre est atteint et le plancher de nuits passé.
export function acteEnCours(state) {
  const ch = state.campagne ? chapterReached(state) : 1, nuits = nuitsSurIle(state);
  let acte = 1;
  for (const a of RECIT.ACTES) if (ch >= a.chapitre && nuits >= a.nuits) acte = Math.max(acte, a.numero);
  return acte;
}

/* ---------- les conditions ---------- */

// Le personnage principal (comme mainCharacter, js/engine/depart.js, sans en dépendre), ou null.
function principal(state) {
  const f = state.famille;
  if (!f || !Array.isArray(f.membres)) return null;
  return findMember(state, f.principal) || f.membres.find((m) => !m.enfant) || f.membres[0] || null;
}

// Le genre du personnage principal : 'f' ou 'm' (par défaut).
export function genreJoueur(state) {
  const m = principal(state);
  return m && m.genre === 'f' ? 'f' : 'm';
}

function aDesEnfants(state) {
  return !!(state.famille && Array.isArray(state.famille.membres) && state.famille.membres.some((m) => m.enfant));
}

// L'heure h est-elle dans [de, à[ ? (à < de : la plage passe minuit.)
function dansHeures(h, [de, a]) {
  return de <= a ? h >= de && h < a : h >= de || h < a;
}

// Toutes les conditions `quand` sont-elles vraies ? `qui` : le personnage pour les paliers.
export function conditionsVraies(state, quand, qui = null, ctx = {}) {
  const q = quand || {};
  const age = (id) => ageFait(state, id);
  for (const [cle, v] of Object.entries(q)) {
    switch (cle) {
      case 'heure': if (!dansHeures(hourOfDay(state), v)) return false; break;
      case 'lune': if (!liste(v).includes(moonPhase(state.day).id)) return false; break;
      case 'lieu': if (!liste(v).includes(ctx.lieu)) return false; break;
      case 'palier_min': if (!qui || palier(state, qui) < v) return false; break;
      case 'palier_max': if (!qui || palier(state, qui) > v) return false; break;
      case 'confiance_min': if (!ctx.hameau || confiance(state, ctx.hameau) < v) return false; break;
      case 'confiance_max': if (!ctx.hameau || confiance(state, ctx.hameau) > v) return false; break;
      case 'fait': if (!liste(v).every((id) => aFait(state, id))) return false; break;
      case 'sans_fait': if (liste(v).some((id) => aFait(state, id))) return false; break;
      case 'fait_recent': if (!liste(v).every((id) => age(id) !== null && age(id) <= RECIT.AGES.RECENT)) return false; break;
      case 'fait_souvenir': if (!liste(v).every((id) => age(id) !== null && age(id) <= RECIT.AGES.SOUVENIR)) return false; break;
      case 'acte_min': if (acteEnCours(state) < v) return false; break;
      case 'acte_max': if (acteEnCours(state) > v) return false; break;
      case 'chapitre_min': if (!state.campagne || chapterReached(state) < v) return false; break;
      case 'jour_min': if (jourDe(state) < v) return false; break;
      // (jour_max : une scène de début de partie ne se joue pas dans une partie plus avancée ; installee :
      // la famille est composée — une partie neuve, avant l'écran de départ, ne l'est pas)
      case 'jour_max': if (jourDe(state) > v) return false; break;
      case 'installee': if ((!state.famille || state.famille.configuree !== false) !== v) return false; break;
      case 'genre': if (genreJoueur(state) !== v) return false; break;
      case 'enfants': if (aDesEnfants(state) !== v) return false; break;
      case 'humeur': if (!liste(v).includes(ctx.humeur)) return false; break;
      case 'debloque': if (!state.campagne || !isUnlocked(state, v)) return false; break;
      case 'empreinte': if (!liste(v).includes(empreinteFerme(state).niveau)) return false; break;
      case 'machines': if ((Object.keys(empreinteFerme(state).detail.machines).length > 0) !== v) return false; break;
      // (le récit, lot 9) objet : le joueur a cet objet (ou ces objets) dans son inventaire ; touche : le
      // personnage qu'il vient de toucher (la page le donne) ; voie et fin : ce que devient sa ferme
      // (finAventure) ; hameaux_min : le nombre de hameaux découverts.
      case 'objet': if (!liste(v).every((id) => countItem(state, id) >= 1)) return false; break;
      case 'touche': if (!liste(v).includes(ctx.touche)) return false; break;
      case 'voie': if (finAventure(state).voie !== v) return false; break;
      case 'fin': if (!liste(v).includes(finAventure(state).fin)) return false; break;
      case 'hameaux_min': if (hameauxConnus(state).length < v) return false; break;
      // (le récit, lot 10) equipe : une pièce portée par le personnage principal (la lanterne-tempête) ;
      // plat : il a un plat cuisiné ; fragment / sans_fragment : une page (ou une liste) au carnet, ou non.
      case 'equipe': if (!liste(v).every((id) => piecesPrincipal(state).includes(id))) return false; break;
      case 'plat': if (Object.keys(DATA.OBJETS).some((id) => DATA.OBJETS[id].plat && !DATA.OBJETS[id].retire && countItem(state, id) >= 1) !== v) return false; break;
      case 'fragment': if (!liste(v).every((id) => recitDe(state).carnet.includes(id))) return false; break;
      case 'sans_fragment': if (liste(v).some((id) => recitDe(state).carnet.includes(id))) return false; break;
      default: return false; // une condition inconnue n'est jamais vraie (build-data.mjs les refuse)
    }
  }
  return true;
}

/* ---------- les textes ---------- */

// Le texte d'une réplique, pour cette partie : la variante du genre du personnage principal, puis
// {prenom}, {nom} et les variables de la page (ctx.vars) ; une variable absente devient vide.
export function texteRecit(state, texte, ctx = {}) {
  const t = objet(texte) ? texte[genreJoueur(state)] || texte.m || '' : String(texte || '');
  const m = principal(state);
  const vars = { prenom: m ? memberName(state, m.id) : '', nom: (state.famille && state.famille.nom) || '', ...(ctx.vars || {}) };
  return t.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined || vars[k] === null ? '' : String(vars[k])));
}

/* ---------- les répliques ---------- */

function auRepos(state, e) {
  const dite = recitDe(state).dites[e.id];
  if (typeof dite !== 'number') return false;
  if (e.une_fois) return true;
  return jourDe(state) - dite < (e.repos_jours || 0);
}

// Les répliques de `qui` qu'on pourrait dire maintenant (conditions vraies, ni dites une fois, ni au
// repos), de la plus prioritaire à la moins.
export function repliquesPossibles(state, qui, ctx = {}) {
  return RECIT.REPLIQUES
    .filter((e) => e.qui === qui && !auRepos(state, e) && conditionsVraies(state, e.quand, qui, ctx))
    .sort((a, b) => (b.priorite || 0) - (a.priorite || 0));
}

// La réplique que dirait `qui` (sans rien noter) : { id, qui, texte } (le texte rendu), ou null.
export function choisirReplique(state, qui, ctx = {}) {
  const possibles = repliquesPossibles(state, qui, ctx);
  if (!possibles.length) return null;
  const haut = possibles.filter((e) => (e.priorite || 0) === (possibles[0].priorite || 0));
  const rnd = mulberry32(hache(`${farmSeed(state) || 'monde'}:recit:${qui}:${jourDe(state)}:${entier(ctx.n)}`));
  const e = haut[Math.floor(rnd() * haut.length)];
  return { id: e.id, qui, texte: texteRecit(state, e.texte, ctx) };
}

// Les effets d'une réplique ou d'une scène (voir l'en-tête de data/recit.json).
function appliquerEffet(state, effet, qui, ctx) {
  if (!effet) return;
  if (effet.fait) noterFait(state, effet.fait);
  if (typeof effet.relation === 'number' && qui) ajouterRelation(state, qui, effet.relation);
  else if (objet(effet.relation)) for (const [p, n] of Object.entries(effet.relation)) ajouterRelation(state, p, n);
  if (typeof effet.confiance === 'number' && ctx.hameau) ajouterConfiance(state, ctx.hameau, effet.confiance);
  if (effet.fragment) ajouterFragment(state, effet.fragment);
  if (typeof effet.confiance_partout === 'number') for (const h of hameauxConnus(state)) ajouterConfiance(state, h, effet.confiance_partout);
  // (le récit, lot 9 : un objet qu'on reçoit, un objet qu'on donne : l'enveloppe de Maurice, la cloche)
  if (objet(effet.prendre)) for (const [item, n] of Object.entries(effet.prendre)) takeItem(state, item, Math.min(entier(n), Math.floor(countItem(state, item))));
  if (objet(effet.donner)) for (const [item, n] of Object.entries(effet.donner)) if (DATA.OBJETS[item]) addItem(state, item, entier(n));
}

// `qui` parle : la réplique choisie est notée comme dite aujourd'hui et ses effets appliqués.
// Renvoie { id, qui, texte } ou null (il n'a rien à dire).
export function parler(state, qui, ctx = {}) {
  const choix = choisirReplique(state, qui, ctx);
  if (!choix) return null;
  const e = RECIT.REPLIQUES.find((x) => x.id === choix.id);
  recitDe(state).dites[e.id] = jourDe(state);
  appliquerEffet(state, e.effet, qui, ctx);
  return choix;
}

/* ---------- les scènes ---------- */

// Les scènes qui pourraient se jouer maintenant (jamais jouées, conditions vraies), de la plus
// prioritaire à la moins : leurs ids.
export function scenesPossibles(state, ctx = {}) {
  const dites = recitDe(state).dites;
  return RECIT.SCENES
    .filter((s) => typeof dites[s.id] !== 'number' && conditionsVraies(state, s.quand, s.lignes[0] && s.lignes[0].qui, ctx))
    .sort((a, b) => (b.priorite || 0) - (a.priorite || 0))
    .map((s) => s.id);
}

// Joue la scène `id` : elle est notée (elle ne se rejoue plus) et ses effets appliqués. Renvoie
// { ok, id, lignes: [{ qui, nom, texte }] }. Une scène qui ne peut pas se jouer maintenant : un refus.
export function jouerScene(state, id, ctx = {}) {
  const s = RECIT.SCENES.find((x) => x.id === id);
  if (!s) return fail('Scène inconnue.');
  if (!scenesPossibles(state, ctx).includes(id)) return fail('Cette scène ne peut pas se jouer maintenant.');
  // (une ligne peut porter le nom sous lequel le joueur connaît encore le personnage : « Le cocher » ; une
  // ligne qui a ses conditions n'est dite que si elles sont vraies, évaluées avant les effets de la scène)
  const dites = s.lignes.filter((l) => !l.quand || conditionsVraies(state, l.quand, l.qui, ctx));
  recitDe(state).dites[id] = jourDe(state);
  appliquerEffet(state, s.effet, s.lignes[0] && s.lignes[0].qui, ctx);
  const lignes = dites.map((l) => ({ qui: l.qui, nom: l.nom || RECIT.PERSONNAGES[l.qui].nom, texte: texteRecit(state, l.texte, ctx) }));
  return { ok: true, id, lignes };
}

/* ---------- l'empreinte de la ferme et la confiance des hameaux (lot 2) ----------

   L'empreinte dit la place que prend la ferme sur l'île (docs/recit/aventure.md, « les décisions et les
   fins ») : elle se calcule de l'état de la ferme (RECIT.EMPREINTE), jamais stockée. Elle ne s'affiche
   pas en jauge : les répliques, les veillées et les fins la lisent. */

const nb = (v) => (Array.isArray(v) ? v.length : Math.max(0, Math.floor(Number(v) || 0)));

/* ---------- les lieux du récit (lot 3b) ---------- */

// Le joueur touche le lieu du récit `sorte` (cabane, atelier, epave : lieux.recit du plan) : le texte de
// la première entrée de RECIT.LIEUX[sorte] dont les conditions sont vraies, et le fait « lieu.<sorte> »
// noté. → { texte } ou null (une sorte inconnue).
// Le récit, lot 10 : une entrée peut avoir ses effets (la page de bord de l'épave, à la lanterne) : appliqués
// quand elle est lue ; → { texte, fragment (la page gagnée, ou null) }.
export function toucherLieu(state, sorte, ctx = {}) {
  const liste = (RECIT.LIEUX || {})[sorte];
  if (!Array.isArray(liste)) return null;
  const e = liste.find((x) => conditionsVraies(state, x.quand, null, ctx));
  if (!e) return null;
  noterFait(state, `lieu.${sorte}`);
  const avant = recitDe(state).carnet.length;
  appliquerEffet(state, e.effet, null, ctx);
  const fragment = recitDe(state).carnet.length > avant ? recitDe(state).carnet[recitDe(state).carnet.length - 1] : null;
  return { texte: texteRecit(state, e.texte, ctx), fragment };
}

/* ---------- les promesses de Maurice (lot 6) ---------- */

// Les promesses ouvertes : celles que le carnet de Maurice a fait connaître (la page carnet_promesses).
// → [{ id, titre, qui, besoin, donne, manque, commencee, tenue }], dans l'ordre de RECIT.PROMESSES ; []
// tant que le carnet n'est pas trouvé. (donne : { objet: quantité confiée } ; manque : ce qui reste)
export function promesses(state) {
  if (!recitDe(state).carnet.includes('carnet_promesses')) return [];
  return Object.keys(RECIT.PROMESSES || {}).map((id) => etatPromesse(state, id));
}

export function etatPromesse(state, id) {
  const P = RECIT.PROMESSES[id];
  if (!P) return null;
  const d = objet(recitDe(state).promesses[id]) ? recitDe(state).promesses[id] : {};
  const donne = {}, manque = {};
  for (const [item, n] of Object.entries(P.besoin)) {
    donne[item] = Math.min(n, Math.max(0, entier(d[item])));
    if (donne[item] < n) manque[item] = n - donne[item];
  }
  return { id, titre: P.titre, qui: P.qui, besoin: { ...P.besoin }, donne, manque, commencee: aFait(state, `promesse.${id}.commencee`), tenue: aFait(state, `promesse.${id}`) };
}

// Le joueur confie à Achille ce qu'il a de ce qui manque à la promesse `id` (son inventaire : les
// matériaux ne vont pas au frigo). Le premier don note « promesse.<id>.commencee » ; le dernier,
// « promesse.<id> » et les effets de la promesse. → { ok, donnes: { objet: n }, tenue } ou un refus.
export function livrerPromesse(state, id) {
  const e = etatPromesse(state, id);
  if (!e || !promesses(state).some((p) => p.id === id)) return fail('Promesse inconnue.');
  if (e.tenue) return fail('Cette promesse est déjà tenue.');
  const r = recitDe(state);
  if (!objet(r.promesses[id])) r.promesses[id] = {};
  const donnes = {};
  for (const [item, n] of Object.entries(e.manque)) {
    const pris = takeItem(state, item, Math.min(n, Math.floor(countItem(state, item))));
    if (pris > 0) { donnes[item] = pris; r.promesses[id][item] = e.donne[item] + pris; }
  }
  if (!Object.keys(donnes).length) return fail('Tu n\'as rien de ce qu\'il manque.');
  noterFait(state, `promesse.${id}.commencee`);
  const tenue = !Object.keys(etatPromesse(state, id).manque).length;
  if (tenue) {
    noterFait(state, `promesse.${id}`);
    appliquerEffet(state, RECIT.PROMESSES[id].effet, RECIT.PROMESSES[id].qui, {});
  }
  return { ok: true, donnes, tenue };
}

// L'empreinte de la ferme : { points, niveau, detail: { tuiles, abattus, plantes, betes, machines } }.
// Les points ne descendent pas sous 0 (une ferme qui a replanté plus qu'elle n'a pris n'a pas de
// « dette » à rendre).
export function empreinteFerme(state) {
  const E = RECIT.EMPREINTE;
  const tuiles = state.potager ? soilCount(state) : 0;
  const abattus = state.outils ? fellenTrees(state).length : 0;
  const plantes = state.foret ? nb(state.foret.arbres) : 0;
  const betes = {
    poule: state.poulailler ? nb(state.poulailler.poules) : 0,
    mouton: state.paturage ? nb(state.paturage.moutons) : 0,
    vache: state.paturage ? nb(state.paturage.vaches) : 0,
  };
  const machines = {};
  for (const sorte of Object.values(objet(state.blocs) ? state.blocs : {})) if (sorte in E.MACHINES) machines[sorte] = (machines[sorte] || 0) + 1;
  let points = tuiles * E.TUILE + abattus * E.ARBRE_ABATTU + plantes * E.ARBRE_PLANTE;
  for (const [b, n] of Object.entries(betes)) points += n * (E.BETES[b] || 0);
  for (const [m, n] of Object.entries(machines)) points += n * E.MACHINES[m];
  points = Math.max(0, entier(points));
  let niveau = 'basse';
  for (const [nom, seuil] of Object.entries(E.NIVEAUX)) if (points >= seuil) niveau = nom;
  return { points, niveau, detail: { tuiles, abattus, plantes, betes, machines } };
}

/* ---------- ce que devient la ferme : la voie et la fin (le récit, lot 9) ----------

   Deux mesures (docs/recit/aventure.md, « les décisions et les fins ») : la voie, petite exploitation ou
   grande ferme (l'empreinte au niveau FINS.GRANDE ou plus) ; ce que le joueur a rendu à l'île : l'entretien
   (les promesses de Maurice tenues, les toits réparés, l'enveloppe portée à Odile : FINS.POIDS) et la
   nature (les arbres plantés). La fin en découle, jamais choisie dans un menu :
     - petite, l'entretien à FINS.ENTRETIEN ou plus : « nouveau_maurice » ; sinon « voisin_tranquille » ;
     - grande, l'entretien à FINS.ENTRETIEN et la nature à FINS.NATURE ou plus : « autrement » ; sinon « riche ».
   La fête la fige (le fait « fin.<id> » : les lettres d'Adèle d'après la lisent) ; avant, elle suit la ferme.
   → { voie, entretien, nature, fin }. */
export function finAventure(state) {
  const F = RECIT.FINS, P = F.POIDS;
  const e = empreinteFerme(state);
  const voie = Object.keys(RECIT.EMPREINTE.NIVEAUX).indexOf(e.niveau) >= Object.keys(RECIT.EMPREINTE.NIVEAUX).indexOf(F.GRANDE) ? 'grande' : 'petite';
  const tenues = Object.keys(RECIT.PROMESSES || {}).filter((id) => aFait(state, `promesse.${id}`)).length;
  const entretien = tenues * P.promesse + foisFait(state, 'toit.repare') * P.toit + (aFait(state, 'enveloppe.donnee') ? P.enveloppe : 0);
  const nature = e.detail.plantes;
  const figee = (F.LISTE || []).find((id) => aFait(state, `fin.${id}`));
  const fin = figee || (voie === 'petite'
    ? (entretien >= F.ENTRETIEN ? 'nouveau_maurice' : 'voisin_tranquille')
    : (entretien >= F.ENTRETIEN && nature >= F.NATURE ? 'autrement' : 'riche'));
  return { voie, entretien, nature, fin };
}

/* ---------- l'enveloppe de Maurice (le récit, lot 9) ----------

   Au niveau 9, la lettre du notaire apporte l'enveloppe (un objet, ENVELOPPE.OBJET) au lieu des pièces : le
   joueur l'ouvre (il garde ENVELOPPE.PIECES pièces : « enveloppe.ouverte ») ou la porte à Odile, au Gué (la
   scène enveloppe_odile : « enveloppe.donnee », les toits usés réparés les nuits suivantes, js/engine/usure.js). */
export function ouvrirEnveloppe(state) {
  const E = RECIT.ENVELOPPE;
  if (countItem(state, E.OBJET) < 1) return fail('Tu n\'as pas l\'enveloppe.');
  takeItem(state, E.OBJET, 1);
  earn(state, E.PIECES, 'L\'enveloppe de Maurice');
  noterFait(state, 'enveloppe.ouverte');
  return { ok: true, pieces: E.PIECES };
}

/* ---------- les visites des hameaux garantis (le récit, lot 9) ----------

   La page dit où est le personnage (lieuDuPerso) : dans un hameau garanti, « visite.<garanti> » est noté (une
   fois par jour suffit) ; pendant la tournée d'Achille (le cheval boite : « achille.tournee.demandee », pas
   encore « achille.tournee »), « tournee.<garanti> » aussi : il demande qu'on passe aux Genêts et à Bois-Joli
   à sa place (RECIT.TOURNEE). → true si un fait vient d'être noté. */
export function noterVisite(state, garanti) {
  if (typeof garanti !== 'string' || !garanti) return false;
  let note = false;
  if (ageFait(state, `visite.${garanti}`) !== 0) { noterFait(state, `visite.${garanti}`); note = true; }
  if (aFait(state, 'achille.tournee.demandee') && !aFait(state, 'achille.tournee') && (RECIT.TOURNEE || []).includes(garanti) && !aFait(state, `tournee.${garanti}`)) {
    noterFait(state, `tournee.${garanti}`);
    note = true;
  }
  return note;
}

// Les hameaux découverts (leurs ids).
export function hameauxConnus(state) {
  return state.monde && objet(state.monde.hameaux) ? Object.keys(state.monde.hameaux) : [];
}

// La nuit du récit (appelée par runNight, avant que le jour change) : le niveau de l'empreinte est
// noté comme fait (son dernier jour suit : « fait_recent: empreinte.haute » veut dire « la ferme
// est grande en ce moment ») ; toutes les DERIVE.NUITS nuits, la confiance des hameaux découverts
// dérive selon ce niveau, sans passer sous DERIVE.PLANCHER par cette seule dérive. Renvoie
// { niveau, points, derive } (derive : les points appliqués à chaque hameau cette nuit, 0 sinon).
export function recitNuit(state) {
  recitDe(state);
  const e = empreinteFerme(state);
  if (e.niveau !== 'basse') noterFait(state, `empreinte.${e.niveau}`);
  // (le récit, lot 9 : chaque sorte de machine posée, « machine.<sorte> » : la lettre d'Adèle sur le robot)
  for (const sorte of Object.keys(e.detail.machines)) noterFait(state, `machine.${sorte}`);
  const D = RECIT.DERIVE;
  let derive = 0;
  if (jourDe(state) % D.NUITS === 0) {
    derive = D.POINTS[e.niveau] || 0;
    if (derive) {
      for (const h of hameauxConnus(state)) {
        const avant = confiance(state, h);
        const apres = derive < 0 ? Math.max(Math.min(avant, D.PLANCHER), avant + derive) : avant + derive;
        if (apres !== avant) ajouterConfiance(state, h, apres - avant);
      }
    }
  }
  // (le récit, lot 9) les toits des hameaux (js/engine/usure.js) ; Théo, s'il part, quitte Bois-Joli la nuit
  // qui suit la scène (« theo.parti » : il ne revient pas ; sa lettre vient plus tard, data/campaign.json)
  const usure = usureNuit(state);
  if (aFait(state, 'theo.part') && !aFait(state, 'theo.parti')) { retirerEcrit(state, 'theo'); noterFait(state, 'theo.parti'); }
  return { niveau: e.niveau, points: e.points, derive, usure };
}

/* ---------- les personnages écrits sur la carte (lot 4) ---------- */

// Le nom d'un hameau précédé de « de » (« du Gué », « des Genêts », « de la Combe », « de Brumeval »).
export function deHameau(nom) {
  const n = String(nom || '');
  if (/^Le /.test(n)) return 'du ' + n.slice(3);
  if (/^Les /.test(n)) return 'des ' + n.slice(4);
  if (/^La /.test(n)) return 'de la ' + n.slice(3);
  if (/^L'/.test(n)) return "de l'" + n.slice(2);
  return (/^[aeiouyhàâéèêëîïôûAEIOUYHÀÂÉÈÊËÎÏÔÛ]/.test(n) ? "d'" : 'de ') + n;
}

// Le nom du cocher pour le joueur : « Achille » une fois qu'il s'est présenté (la scène de la clé), « le
// cocher » avant. `majuscule` : en début de phrase.
export function nomCocher(state, majuscule = true) {
  if (aFait(state, 'achille.cle')) return RECIT.PERSONNAGES.achille.nom;
  return majuscule ? 'Le cocher' : 'le cocher';
}

// Le membre `membreId` des habitants du hameau `hameauId`, ou null.
function membreDuHameau(state, hameauId, membreId) {
  const h = habitantsDe(state)[hameauId];
  if (!h || !Array.isArray(h.foyers)) return null;
  for (const f of h.foyers) for (const m of f.membres || []) if (m.id === membreId) return m;
  return null;
}

// Le salut d'un adulte du hameau `hameauId` selon la confiance de son hameau (RECIT.SALUTS), une fois sur
// deux (tiré avec la graine du monde, le jour et le rang de l'appui) ; null : celui de l'heure (un enfant,
// quelqu'un qui dort, l'autre fois sur deux, un niveau sans liste).
function salutConfiance(state, hameauId, m, o) {
  if (m.enfant || o.activite === 'dort') return null;
  const liste = (RECIT.SALUTS || {})[niveauConfiance(state, hameauId)];
  if (!Array.isArray(liste) || !liste.length) return null;
  const rnd = mulberry32(hache(`${farmSeed(state) || 'monde'}:salut:${m.id}:${jourDe(state)}:${entier(o.n)}`));
  if (rnd() < 0.5) return null;
  return texteRecit(state, liste[Math.floor(rnd() * liste.length)]) || null;
}

// Toucher un habitant (le pont de la carte) : sa bulle { prenom, metier, texte, humeur[, recit] }. Un
// personnage écrit (m.recit) dit une réplique du récit (parler : elle est notée, ses effets
// appliqués) ; s'il n'a rien à dire, ou pour les autres, la phrase des habitants (paroleHabitant). `o` :
// { heure, activite, n } comme paroleHabitant ; le contexte du récit : le lieu (« gue » au Gué, sinon
// l'id du hameau), le hameau, l'humeur de son foyer, le rang de l'appui, le nom du hameau ({hameau}).
export function paroleHameau(state, hameauId, membreId, o = {}) {
  const m = membreDuHameau(state, hameauId, membreId);
  const salut = m ? salutConfiance(state, hameauId, m, o) : null;
  const base = paroleHabitant(state, hameauId, membreId, salut ? { ...o, salut } : o);
  if (!base) return null;
  if (!m || !m.recit || !RECIT.PERSONNAGES[m.recit] || o.activite === 'dort') return base;
  const h = habitantsDe(state)[hameauId];
  const plan = state.monde && state.monde.hameaux && state.monde.hameaux[hameauId];
  const nomH = (h && h.nom) || (plan && plan.nom) || '';
  const lieu = garantiDuHameau(state, hameauId) || hameauId;
  const r = parler(state, m.recit, { lieu, hameau: hameauId, humeur: base.humeur, n: o.n, touche: m.recit, vars: { hameau: nomH } });
  return r ? { ...base, texte: r.texte, recit: r.id } : base;
}
