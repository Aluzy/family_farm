import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { fail } from './devices.js';
import { hache } from './ferme-generee.js';
import { farmSeed, farmTerrain } from './terrain.js';
import { villageActif } from './village.js';
import { hourOfDay, nightActive } from './clock.js';
import { penalite } from './inventory.js';
import { maisonsMarquees, litsDeLaFamille } from './blocs.js';
import { mangerAuRangement, reserveRangement } from './repas.js';
import { platsBonheur, varieteBonheur, versCible } from './bonheur.js';
import { cleDiversite, tirerApparence } from './apparence.js';
import { goutsDe } from './amitie.js';
import { validApparence } from './family.js';

/* ---------- les villageois de l'île (le chantier « l'île à bâtir », fiche I3a) ----------

   Le moteur des villageois reprend des habitants des hameaux (habitants.js) ce qui sert : le tirage à graine des
   prénoms et des personnages (HABITANTS.PRENOMS, PERSOS), l'apparence (apparence.js), les goûts (amitie.js), un
   repas qui couvre le besoin d'un adulte (FAMILLE.AJ.adulte) et le bonheur qui suit les règles de la famille
   (bonheur.js). Il laisse le reste (le métier, le garde-manger, la réserve du hameau) : un villageois mange à la
   boîte commune de la ferme. Un villageois est un adulte seul (les couples et les enfants : I6b) ; il ne travaille
   pas encore (I3c). Tout est derrière le réglage du chantier (village.js, villageActif) : éteint, rien ici ne se
   lit, et une partie n'a pas de state.villageois (le champ naît avec le premier villageois).

   state.villageois = [{
     id (« vg-1 », « vg-2 »… : son rang d'arrivée), prenom, genre ('f' | 'm'), perso (son personnage du catalogue),
     apparence ({ identite, tenue }, comme un habitant), gouts ({ objet: 'adore' | 'aime' | 'deteste' }),
     maison (la case de la boîte aux lettres de sa maison, ou null : il attend une maison et dort à l'abri),
     lit (son couchage : une case de sa maison, ou null), bourse (ses pièces), bonheur (0 à BONHEUR.MAX),
     faim (ce qui a manqué à son dernier repas, en énergie : 0, il a mangé à sa faim), arrive (le jour de son
     arrivée), repos (true : mal nourri ou sans lit la nuit dernière, il se repose aujourd'hui ; il ne part pas),
     accueil ('en_route' : il marche du port à sa maison, la scène le montre ; null : il est chez lui),
     sansMaison (le jour où il a perdu sa maison, ou null), avis ([« arrive », « sans_maison », « installe »] :
     ce que la page doit encore dire au joueur), journal ([{ jour, mange, energie, besoin, lit, bonheur }] :
     ses derniers jours, VILLAGE.ARRIVEE.JOURNAL au plus) }].

   Une maison libre : une pièce close du genre maison de la terre du joueur, marquée « à un villageois » par une
   boîte aux lettres posée contre sa porte (blocs.js, maisonsMarquees), où personne n'habite, avec un lit que la
   famille ne prend pas (la famille dort d'abord dans les autres lits : blocs.js, couchages). L'arrivée
   (VILLAGE.ARRIVEE) : un jour de bac, de HEURE à FIN h (la page appelle arriveeDue puis arriverVillageois ; la nuit
   installe d'un coup celui qui n'est pas venu), voir arriveeRefus. La nuit (villageoisNuit, appelé par runNight) :
   chacun mange à la boîte commune, dort dans son lit ; son bonheur suit la règle de la famille ; mal nourri ou
   sans lit, il se repose le lendemain. Sa maison retirée (sa boîte, son lit ou sa pièce disparus), il dort à
   l'abri et attend une maison libre, qu'il prend dès qu'il y en a une (verifierMaisons). */

export const ARRIVEE = (DATA.VILLAGE && DATA.VILLAGE.ARRIVEE) || {};
const HABITANTS = DATA.HABITANTS;

const graineDe = (state) => farmSeed(state) || 'ile';
const rngDe = (cle) => mulberry32(hache(cle));
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));
const besoinAdulte = () => DATA.FAMILLE.AJ.adulte;

/* ---------- les villageois de la partie ---------- */

// Les villageois de la partie (une liste ; [] sans eux, ou le chantier éteint). Ne crée rien.
export function villageoisDe(state) {
  if (!villageActif(state)) return [];
  return Array.isArray(state.villageois) ? state.villageois : [];
}

// Le villageois `id`, ou null.
export function trouverVillageois(state, id) {
  return villageoisDe(state).find((v) => v.id === id) || null;
}

// Combien de villageois sur l'île (la carte du joueur les compte).
export function nombreVillageois(state) {
  return villageoisDe(state).length;
}

/* ---------- les maisons ---------- */

// Les maisons libres : [{ boite (la case de sa boîte aux lettres : le nom de la maison), piece, lits (les
// couchages de la pièce que la famille ne prend pas) }], dans l'ordre des boîtes. Une maison où habite un
// villageois n'est pas libre (un villageois par maison : les foyers viendront avec I6b).
export function maisonsLibres(state) {
  if (!villageActif(state)) return [];
  const prises = new Set(villageoisDe(state).map((v) => v.maison).filter((m) => m !== null && m !== undefined));
  const famille = litsDeLaFamille(state);
  const out = [];
  for (const m of maisonsMarquees(state)) {
    if (prises.has(m.boite)) continue;
    const lits = m.piece.paillasses.filter((c) => !famille.has(c));
    if (lits.length) out.push({ boite: m.boite, piece: m.piece, lits });
  }
  return out;
}

// La maison du villageois `v` telle qu'elle est sur la carte : { boite, piece, lits (ceux que la famille ne
// prend pas) }, ou null (sa boîte, sa pièce ou ses lits disparus).
function maisonDe(state, v) {
  if (v.maison === null || v.maison === undefined) return null;
  const m = maisonsMarquees(state).find((x) => x.boite === v.maison);
  if (!m) return null;
  const famille = litsDeLaFamille(state);
  const lits = m.piece.paillasses.filter((c) => !famille.has(c));
  return lits.length ? { boite: m.boite, piece: m.piece, lits } : null;
}

// Les maisons des villageois sont-elles toujours là ? Celui dont la maison a disparu (sa boîte aux lettres
// reprise, sa pièce ouverte, ses lits repris ou pris par la famille) dort à l'abri et attend (sansMaison ;
// l'avis « sans_maison ») ; son lit repris mais un autre libre dans sa maison : il le prend. Puis ceux qui
// attendent prennent les maisons libres, dans l'ordre d'arrivée (l'avis « installe »).
// → { perdues: [id], installes: [id] }.
export function verifierMaisons(state) {
  const out = { perdues: [], installes: [] };
  for (const v of villageoisDe(state)) {
    if (v.maison === null || v.maison === undefined) continue;
    const m = maisonDe(state, v);
    if (m && m.lits.includes(v.lit)) continue;
    if (m) { v.lit = m.lits[0]; continue; }
    v.maison = null;
    v.lit = null;
    v.sansMaison = jourDe(state);
    avis(v, 'sans_maison');
    out.perdues.push(v.id);
  }
  for (const v of villageoisDe(state)) {
    if (v.maison !== null && v.maison !== undefined) continue;
    const libre = maisonsLibres(state)[0];
    if (!libre) break;
    v.maison = libre.boite;
    v.lit = libre.lits[0];
    v.sansMaison = null;
    // (celui qui attendait sa première maison n'en avait pas perdu : seulement l'avis qu'il s'installe)
    v.avis = (v.avis || []).filter((a) => a !== 'sans_maison');
    avis(v, 'installe');
    out.installes.push(v.id);
  }
  return out;
}

function avis(v, quoi) {
  if (!Array.isArray(v.avis)) v.avis = [];
  if (!v.avis.includes(quoi)) v.avis.push(quoi);
}

// Ce que la page doit encore dire au joueur : [{ id, quoi }] ; ils sont retirés (la page les dit une fois).
export function prendreAvis(state) {
  const out = [];
  for (const v of villageoisDe(state)) {
    for (const quoi of v.avis || []) out.push({ id: v.id, quoi });
    v.avis = [];
  }
  return out;
}

/* ---------- l'arrivée ---------- */

// Le niveau du port (fiche I1c ; un port sans niveau, ou pas encore de port : le niveau 1).
export function niveauPort(state) {
  const n = Math.floor(Number(state && state.port && state.port.niveau));
  return n >= 1 ? n : 1;
}

// Combien de villageois au plus avec ce port (PLAFOND[niveau] ; au-delà du dernier niveau réglé : le dernier).
export function plafondVillageois(state) {
  const P = ARRIVEE.PLAFOND || {}, n = niveauPort(state);
  const niveaux = Object.keys(P).map(Number).filter((k) => k <= n).sort((a, b) => a - b);
  return niveaux.length ? P[niveaux[niveaux.length - 1]] : 0;
}

// Le jour `jour` est-il un jour de bac ? (avant le bac de la fiche I1c : tous les PERIODE jours ; un bac
// réglé par le port, state.port.bac = { jours: [...] }, le remplacera)
export function jourDeBac(state, jour = jourDe(state)) {
  const B = state && state.port && state.port.bac;
  if (B && Array.isArray(B.jours)) return B.jours.includes(jour);
  const P = Math.max(1, Math.floor(Number(ARRIVEE.PERIODE) || 1));
  return jour % P === 0;
}

// Le prochain jour de bac, aujourd'hui compris.
export function prochainBac(state) {
  let j = jourDe(state);
  for (let k = 0; k < 400 && !jourDeBac(state, j); k++) j++;
  return j;
}

// Le rangement des repas (frigo ou boîte) couvre-t-il RESERVE_JOURS jours du besoin de `bouches` villageois ?
export function reserveSuffit(state, bouches) {
  return reserveRangement(state) >= (Number(ARRIVEE.RESERVE_JOURS) || 0) * besoinAdulte() * bouches;
}

// Un nouveau venu peut-il débarquer ? null, ou la raison (un texte pour le joueur). `o.jour` : false pour ne
// pas regarder le jour (ce qu'il manque, hors du bac : la fiche de la maison).
export function arriveeRefus(state, o = {}) {
  if (!villageActif(state)) return 'Le chantier de l\'île n\'est pas allumé.';
  const V = villageoisDe(state), n = V.length, jour = jourDe(state);
  if (o.jour !== false) {
    if (!jourDeBac(state, jour)) return `Le bac ne passe pas aujourd'hui (prochain passage : jour ${prochainBac(state)}).`;
    if (V.some((v) => v.arrive === jour)) return 'Un seul nouveau venu par passage du bac.';
  }
  if (!maisonsLibres(state).length) return 'Il faut une maison libre : une pièce close avec un lit libre et une boîte aux lettres contre sa porte.';
  // (le premier vient dès la première maison libre ; les suivants veulent de quoi manger et un port assez grand)
  if (n >= 1) {
    if (!reserveSuffit(state, n + 1)) return `Il faut de quoi nourrir une bouche de plus : la boîte à nourriture doit couvrir ${ARRIVEE.RESERVE_JOURS} jours de repas des villageois.`;
    if (n >= plafondVillageois(state)) return `Le port ne fait débarquer que ${plafondVillageois(state)} villageois à son niveau.`;
  }
  return null;
}

// Est-ce l'heure qu'un nouveau venu débarque (la page le met en route) ? Le jour de bac, de HEURE à FIN h, de
// jour, la famille installée, s'il peut venir (arriveeRefus).
export function arriveeDue(state) {
  if (!villageActif(state) || nightActive(state)) return false;
  if (!state.famille || state.famille.configuree === false) return false;
  const h = hourOfDay(state);
  if (h < ARRIVEE.HEURE || h >= ARRIVEE.FIN) return false;
  return arriveeRefus(state) === null;
}

// Le nouveau venu, tiré de la graine de la partie et de son rang d'arrivée : { prenom, genre, perso, apparence,
// gouts }. Ni son prénom, ni son personnage, ni son apparence ne sont ceux d'un autre villageois ou d'un membre
// de la famille (deux villageois ne sont jamais identiques). Ne change pas la partie.
export function tirerVillageois(state, rang = villageoisDe(state).length + 1) {
  const g = graineDe(state), rnd = rngDe(`${g}:villageois:${rang}`);
  const V = villageoisDe(state), F = (state.famille && state.famille.membres) || [];
  const genre = rnd() < 0.5 ? 'f' : 'm';
  const prenomsPris = new Set([...V, ...F].map((m) => String(m.prenom || '').toLowerCase()));
  const persosPris = new Set([...V.map((v) => v.perso), ...F.filter((m) => !m.enfant).map((m) => m.perso)]);
  const un = (liste) => liste[Math.floor(rnd() * liste.length)];
  const prenoms = (HABITANTS.PRENOMS[genre] || []).filter((p) => !prenomsPris.has(p.toLowerCase()));
  const prenom = prenoms.length ? un(prenoms) : `${un(HABITANTS.PRENOMS[genre])} ${rang}`;
  const persos = (HABITANTS.PERSOS.adulte[genre] || []).filter((p) => !persosPris.has(p));
  const perso = persos.length ? un(persos) : un(HABITANTS.PERSOS.adulte[genre]);
  const deja = new Set(V.filter((v) => objet(v.apparence)).map((v) => cleDiversite(v.apparence)));
  const apparence = tirerApparence(rngDe(`${g}:villageois:apparence:${rang}`), { enfant: false, genre }, deja);
  // (ses goûts : ceux d'amitie.js, tirés de son id dans la partie, gardés avec lui)
  const gouts = goutsDe({ id: `${g}:villageois:${rang}`, enfant: false, metier: null });
  return { prenom, genre, perso, apparence, gouts };
}

// Un nouveau venu débarque et s'installe dans la première maison libre (sans vérifier le jour : arriveeRefus le
// fait). `o.direct` : il y est d'un coup (la nuit, loin de la vue) ; sinon il marche du port à sa maison
// (accueil « en_route » : la scène le montre, puis accueillirVillageois). → { ok, villageois } ou un refus.
export function arriverVillageois(state, o = {}) {
  if (!villageActif(state)) return fail('Le chantier de l\'île n\'est pas allumé.');
  const libre = maisonsLibres(state)[0];
  if (!libre) return fail('Pas de maison libre.');
  if (!Array.isArray(state.villageois)) state.villageois = [];
  const rang = state.villageois.length + 1;
  const t = tirerVillageois(state, rang);
  const v = {
    id: `vg-${rang}`, ...t, maison: libre.boite, lit: libre.lits[0], bourse: Number(ARRIVEE.BOURSE) || 0,
    bonheur: DATA.BONHEUR.DEPART, faim: 0, arrive: jourDe(state), repos: false,
    accueil: o.direct ? null : 'en_route', sansMaison: null, avis: o.direct ? ['arrive'] : [], journal: [],
  };
  state.villageois.push(v);
  return { ok: true, villageois: v };
}

// Il est arrivé à sa maison (la scène : il a frappé et dit sa ligne ; ou la nuit, s'il marchait encore) : il est
// chez lui, la page le dit au joueur (l'avis « arrive »). → le villageois, ou null.
export function accueillirVillageois(state, id) {
  const v = trouverVillageois(state, id);
  if (!v || v.accueil !== 'en_route') return null;
  v.accueil = null;
  avis(v, 'arrive');
  return v;
}

// Sa bulle à la porte : le salut de l'heure (HABITANTS.PHRASES.salut) et sa ligne (ARRIVEE.PHRASES), tirés de la
// graine. Une seule ligne.
export function phraseArrivee(state, id) {
  const v = trouverVillageois(state, id);
  if (!v) return '';
  const rnd = rngDe(`${graineDe(state)}:villageois:${v.id}:arrivee`);
  const un = (l) => (l && l.length ? l[Math.floor(rnd() * l.length)] : '');
  const h = hourOfDay(state), S = HABITANTS.PHRASES.salut;
  // (le salut de l'heure, sauf ce que dit qui reçoit une visite : c'est lui qui arrive)
  const salut = un((S[h < 10 ? 'matin' : h < 18 ? 'jour' : h < 22 ? 'soir' : 'nuit'] || []).filter((p) => !/visite|dort déjà/.test(p)));
  return [salut, un(ARRIVEE.PHRASES).replace('{prenom}', v.prenom)].filter(Boolean).join(' ');
}

// La case d'où il arrive : le port (plan.lieux.port, posé par la fiche I1a : une case, ou { case }), sinon le
// bout du chemin de la ferme (la malle de la calèche, terrain.MALLE), sinon le bord est de la ferme, à mi-hauteur.
// `plan` : le plan du monde, ou ses lieux (js/ui/monde-sol.js, lieux()) ; null sans lui.
export function caseArrivee(state, plan = null) {
  const L = plan && objet(plan.lieux) ? plan.lieux : plan;
  const p = L && L.port;
  if (Number.isInteger(p)) return p;
  if (objet(p) && Number.isInteger(p.case)) return p.case;
  const T = farmTerrain(state);
  if (T.MALLE && Array.isArray(T.MALLE.cases) && T.MALLE.cases.length) return T.MALLE.cases[T.MALLE.cases.length - 1];
  const F = T.FERME;
  return F ? (F.Y + (F.HAUTEUR >> 1)) * T.LARGEUR + F.X + F.LARGEUR - 1 : null;
}

/* ---------- la nuit ---------- */

// Le bonheur que les meubles de sa maison ajoutent à sa cible (comme ceux de la famille : CIBLE.MEUBLES_MAX au
// plus) : les meubles posés dans sa pièce.
export function meublesMaison(state, v) {
  const m = maisonDe(state, v);
  if (!m) return 0;
  let t = 0;
  for (const c of m.piece.cases) {
    const s = DATA.ATELIER.BLOCS[(state.blocs || {})[c]], def = s && s.meuble && DATA.MEUBLES && DATA.MEUBLES[s.meuble];
    if (def) t += def.bonheur || 0;
  }
  return Math.min(DATA.BONHEUR.CIBLE.MEUBLES_MAX, t);
}

// La nuit d'un villageois (le jour `jour`) : il mange au rangement commun (le besoin d'un adulte), dort dans son
// lit ; son bonheur fait CIBLE.VITESSE % du chemin vers sa cible (la base, ses plats, leur variété, les meubles
// de sa maison ; CIBLE.FAIM de moins s'il a eu faim) ; sans pénalité (PENALITES.BONHEUR_BAISSE coupée), il ne
// baisse pas. Mal nourri ou sans lit : il se repose demain. → son entrée du journal.
function nuitDe(state, v, jour) {
  const besoin = besoinAdulte();
  const r = mangerAuRangement(state, besoin);
  const C = DATA.BONHEUR.CIBLE;
  const cible = Math.max(0, Math.min(DATA.BONHEUR.MAX, C.BASE + platsBonheur(r.mange) + varieteBonheur(r.mange) + meublesMaison(state, v)));
  const avant = Number.isFinite(Number(v.bonheur)) ? Number(v.bonheur) : DATA.BONHEUR.DEPART;
  const faim = Math.max(0, besoin - r.energie);
  // (comme la famille : CIBLE.FAIM s'il a eu faim, ATELIER.BONHEUR_SANS_COUCHAGE sans lit ; 0 tous deux dans le jeu, B-1)
  const sansLit = v.lit === null || v.lit === undefined;
  let apres = versCible(avant, cible + (faim > 0 ? C.FAIM : 0) + (sansLit ? DATA.ATELIER.BONHEUR_SANS_COUCHAGE : 0));
  if (!penalite('BONHEUR_BAISSE')) apres = Math.max(avant, apres);
  v.bonheur = Math.max(0, Math.min(DATA.BONHEUR.MAX, Math.round(apres)));
  v.faim = faim;
  v.repos = faim > 0 || sansLit;
  const J = { jour, mange: r.mange, energie: r.energie, besoin, lit: v.lit ?? null, bonheur: v.bonheur - Math.round(avant) };
  if (!Array.isArray(v.journal)) v.journal = [];
  v.journal.push(J);
  const max = Math.max(1, Number(ARRIVEE.JOURNAL) || 7);
  if (v.journal.length > max) v.journal.splice(0, v.journal.length - max);
  return J;
}

// La nuit (runNight, avant le jour suivant) : les maisons vérifiées ; un jour de bac où personne n'est venu
// (la journée finie avant l'heure, la page fermée), le nouveau venu qui pouvait venir est là d'un coup ; celui
// qui marchait encore est chez lui ; puis chacun vit sa nuit. → { arrive (son id, ou null), repas (combien ont
// mangé à leur faim), sansLit (leurs id) } ; null le chantier éteint ou sans villageois.
export function villageoisNuit(state) {
  if (!villageActif(state)) return null;
  verifierMaisons(state);
  let arrive = null;
  if (arriveeRefus(state) === null) {
    const r = arriverVillageois(state, { direct: true });
    if (r.ok) arrive = r.villageois.id;
  }
  const V = villageoisDe(state);
  if (!V.length) return null;
  const jour = jourDe(state);
  let repas = 0;
  const sansLit = [];
  for (const v of V) {
    if (v.accueil === 'en_route') accueillirVillageois(state, v.id);
    const J = nuitDe(state, v, jour);
    if (J.energie >= J.besoin) repas++;
    if (J.lit === null) sansLit.push(v.id);
  }
  return { arrive, repas, sansLit };
}

/* ---------- la fiche et la carte ---------- */

// La porte de la maison `m` contre laquelle est sa boîte aux lettres (sinon sa première porte).
function porteDe(state, m) {
  const W = farmTerrain(state).LARGEUR, b = m.boite;
  const pres = (d) => Math.abs((d % W) - (b % W)) <= 1 && Math.abs(Math.floor(d / W) - Math.floor(b / W)) <= 1;
  return m.piece.portes.find(pres) ?? m.piece.portes[0];
}

// Son humeur, d'après son bonheur et son dernier repas : 'faim', 'heureux', 'content' ou 'triste' (les seuils des
// habitants, HABITANTS.HEUREUX et TRISTE).
export function humeurVillageois(v) {
  if (v.faim > 0) return 'faim';
  return v.bonheur >= HABITANTS.HEUREUX ? 'heureux' : v.bonheur < HABITANTS.TRISTE ? 'triste' : 'content';
}

const HUMEURS = { heureux: ['heureuse', 'heureux'], content: ['contente', 'content'], triste: ['un peu triste', 'un peu triste'], faim: ['a eu faim', 'a eu faim'] };

// La fiche du villageois `id` (un appui sur lui, ou la liste des villageois) : { id, prenom, genre, perso,
// apparence, maison (un texte : « sa maison », « à l'abri, il attend une maison »), chezLui (bool), humeur (la
// clé), humeurTexte, bonheur, depuis (le jour de son arrivée), jours (depuis combien de jours il est là), repos,
// bourse, accueil }, ou null.
export function ficheVillageois(state, id) {
  const v = trouverVillageois(state, id);
  if (!v) return null;
  const m = maisonDe(state, v);
  const chezLui = !!m && m.boite === v.maison;
  const il = v.genre === 'f' ? 'elle' : 'il';
  const ou = chezLui ? `chez ${il === 'elle' ? 'elle' : 'lui'}, dans sa maison` : `à l'abri : ${il} attend une maison libre`;
  const humeur = humeurVillageois(v);
  return {
    id: v.id, prenom: v.prenom, genre: v.genre, perso: v.perso, apparence: validApparence(v.apparence, false),
    maison: ou, chezLui, humeur, humeurTexte: HUMEURS[humeur][v.genre === 'm' ? 1 : 0], bonheur: v.bonheur, depuis: v.arrive,
    jours: Math.max(0, jourDe(state) - v.arrive), repos: !!v.repos, bourse: v.bourse, accueil: v.accueil || null,
  };
}

// Pour la scène (le modèle de la carte) : [{ id, prenom, genre, perso, apparence, accueil, porte (une case d'une
// porte de sa maison, ou null), lit (son couchage, ou null), depart (la case d'où il arrive), toc, phrase }] ;
// null le chantier éteint ou sans villageois. `plan` : celui du monde (caseArrivee).
export function villageoisPourLaCarte(state, plan = null) {
  const V = villageoisDe(state);
  if (!V.length) return null;
  const depart = caseArrivee(state, plan);
  return V.map((v) => {
    const m = maisonDe(state, v);
    return {
      id: v.id, prenom: v.prenom, genre: v.genre, perso: v.perso, apparence: validApparence(v.apparence, false),
      accueil: v.accueil || null, porte: m ? porteDe(state, m) : null, lit: m && m.lits.includes(v.lit) ? v.lit : null,
      depart, toc: ARRIVEE.TOC || '', phrase: v.accueil ? phraseArrivee(state, v.id) : '',
    };
  });
}
