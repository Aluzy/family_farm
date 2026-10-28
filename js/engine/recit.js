import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { fail } from './devices.js';
import { hourOfDay } from './clock.js';
import { moonPhase } from './lune.js';
import { chapterReached } from './campaign.js';
import { findMember, memberName } from './family.js';
import { hache } from './ferme-generee.js';
import { farmSeed } from './terrain.js';

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
     carnet: [fragment] — les pages du carnet du joueur, dans l'ordre où elles sont venues.
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
  return { faits: {}, relations: {}, confiance: {}, dites: {}, carnet: [] };
}

const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const liste = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
const entier = (v) => Math.round(Number(v) || 0);
const borne = (v, max) => Math.max(0, Math.min(max, entier(v)));
const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));

// Le récit de la partie (réparé au besoin : un champ manquant ou d'un autre type est remis vide).
export function recitDe(state) {
  if (!objet(state.recit)) state.recit = nouveauRecit();
  const r = state.recit;
  for (const k of ['faits', 'relations', 'confiance', 'dites']) if (!objet(r[k])) r[k] = {};
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
    const f = r.faits[id];
    if (Array.isArray(f) && f.length === 3) r.faits[id] = [f[0], j, f[2] + 1];
    else { r.faits[id] = [j, j, 1]; if (i === 0) premier = true; }
  });
  return premier;
}

export function aFait(state, id) {
  return Array.isArray(recitDe(state).faits[id]);
}

// Le nombre de fois qu'un fait a été noté (0 s'il ne l'a jamais été).
export function foisFait(state, id) {
  const f = recitDe(state).faits[id];
  return Array.isArray(f) ? f[2] : 0;
}

// L'âge d'un fait, en jours depuis la dernière fois qu'il a été noté (0 : aujourd'hui), ou null.
export function ageFait(state, id) {
  const f = recitDe(state).faits[id];
  return Array.isArray(f) ? Math.max(0, jourDe(state) - f[1]) : null;
}

// « recent », « souvenir » ou « ancien » (AGES) ; null pour un fait jamais noté.
export function ageSouvenir(state, id) {
  const a = ageFait(state, id);
  if (a === null) return null;
  return a <= RECIT.AGES.RECENT ? 'recent' : a <= RECIT.AGES.SOUVENIR ? 'souvenir' : 'ancien';
}

/* ---------- les relations ---------- */

export function relation(state, perso) {
  return borne(recitDe(state).relations[perso], RECIT.RELATION_MAX);
}

// Ajoute (ou retire) des points de relation à un personnage écrit ; renvoie la nouvelle valeur.
export function ajouterRelation(state, perso, points) {
  if (!RECIT.PERSONNAGES[perso]) return fail('Personnage inconnu.');
  const r = recitDe(state);
  r.relations[perso] = borne(relation(state, perso) + entier(points), RECIT.RELATION_MAX);
  return r.relations[perso];
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
  const v = recitDe(state).confiance[hameau];
  return typeof v === 'number' && Number.isFinite(v) ? borne(v, RECIT.CONFIANCE.MAX) : RECIT.CONFIANCE.DEPART;
}

export function ajouterConfiance(state, hameau, points) {
  if (typeof hameau !== 'string' || !hameau) return fail('Hameau inconnu.');
  const r = recitDe(state);
  r.confiance[hameau] = borne(confiance(state, hameau) + entier(points), RECIT.CONFIANCE.MAX);
  return r.confiance[hameau];
}

// « reservee », « cordiale » ou « chaleureuse ».
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

function genreJoueur(state) {
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
      case 'genre': if (genreJoueur(state) !== v) return false; break;
      case 'enfants': if (aDesEnfants(state) !== v) return false; break;
      case 'humeur': if (!liste(v).includes(ctx.humeur)) return false; break;
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
  recitDe(state).dites[id] = jourDe(state);
  appliquerEffet(state, s.effet, s.lignes[0] && s.lignes[0].qui, ctx);
  const lignes = s.lignes.map((l) => ({ qui: l.qui, nom: RECIT.PERSONNAGES[l.qui].nom, texte: texteRecit(state, l.texte, ctx) }));
  return { ok: true, id, lignes };
}
