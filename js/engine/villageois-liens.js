import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { hache } from './ferme-generee.js';
import { farmSeed, farmTerrain } from './terrain.js';
import { meteoDuJour } from './meteo.js';
import { memberName } from './family.js';
import { humeurVillageois, trouverVillageois, villageoisDe } from './villageois.js';
import { lieuxDuVillage } from './villageois-journee.js';
import { AMITIE, palierAmitie } from './amitie.js';
import { degreDuPalier, liensSignature, NOMS_LIENS, palierLien, scorePaire } from './liens.js';

/* ---------- qui se connaît, au village (le chantier « l'île à bâtir », I3b+ : la vie sociale) ----------

   connaissance(state, a, b) dit si deux villageois se connaissent, et à quel degré : 0 inconnu, 1 connaissance,
   2 ami (I6b : 3 proche). I3b+ : rien n'était gardé, le degré se déduisait de la partie, chaque jour
   (VILLAGE.SOCIAL.CONNAISSANCE) :
     - les jours passés ensemble sur l'île, depuis l'arrivée du second (v.arrive) : PAR_JOUR chacun ;
     - des maisons voisines (leurs boîtes aux lettres à VOISINE cases au plus) : VOISIN de plus par jour ;
     - la même table aux repas (celle de sa maison, sinon la table commune : lieuxDuVillage) : TABLE de plus par jour ;
     - une affinité tirée de la graine et des deux ids (de 0 à AFFINITE), qui ne change pas.
   Le score (0 à 100) donne le degré (I6b : les paliers de VILLAGE.LIENS.PALIERS). La famille du
   joueur (b = 'famille') : connue dès l'arrivée (elle l'a accueilli), amie dès que l'amitié du joueur avec lui
   (fiche I6a, amitie.js : state.amitie.pnj[id]) atteint le palier VILLAGE.AMITIE.FAMILLE_AMI (« cordial ») : ce que la
   scène montre (le salut au personnage) suit ce que le joueur a vécu avec lui.

   Fiche I6b : le score est désormais l'affinité gardée (js/engine/liens.js, qui monte chaque nuit de ce que les
   villageois vivent ensemble ; une paire qui n'a pas encore passé de nuit ensemble vaut le calcul ci-dessus, son
   estimation) ; seul le corps de scoreDe a changé. Les paliers sont ceux de VILLAGE.LIENS.PALIERS (connaissance,
   camarade, ami, proche) ; le degré qu'en lisent la journée, la scène et les répliques : 0 inconnu, 1 connaissance
   ou camarade, 2 ami, 3 proche (degre >= 2 : des amis).

   echangeVillageois(state, a, b, o) : le petit échange de deux villageois qui se croisent, se rendent visite ou
   causent en groupe (VILLAGE.SOCIAL.REPLIQUES), ou ce que dit un villageois au personnage du joueur (b = 'joueur' :
   SOCIAL.JOUEUR), tiré de la graine, du jour, de la paire et du rang `o.n` de l'échange. */

const S = () => (DATA.VILLAGE && DATA.VILLAGE.SOCIAL) || {};
const C = () => S().CONNAISSANCE || {};
export const DEGRES = ['inconnu', 'connaissance', 'ami', 'proche'];

const graineDe = (state) => farmSeed(state) || 'ile';
const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));
const rngDe = (cle) => mulberry32(hache(cle));
const paire = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// Le score de la paire (0 à 100), et les jours passés ensemble. Fiche I6b : l'affinité gardée (js/engine/liens.js :
// elle monte chaque nuit de ce qu'ils ont vécu ensemble), sinon (une paire qui n'a pas encore passé de nuit ensemble)
// l'estimation d'I3b+ (les jours ensemble, les maisons voisines, la table, la même tâche, l'affinité tirée).
function scoreDe(state, va, vb, L, W) {
  return scorePaire(state, va, vb, L, W);
}

// (fiche I6b : le palier, 0 inconnu à 4 proche, et le degré qu'en lit la vie sociale : 0, 1 connaissance ou
// camarade, 2 ami, 3 proche)
const degreDe = (score) => degreDuPalier(palierLien(score));

let memoCle = null, memo = null;

// Les liens de tout le village aujourd'hui : { paires: Map('a|b' → { degre, score, jours }), famille: Map(id →
// { degre, jours }) }. Gardés tant que le jour, les villageois et les lieux ne changent pas.
export function liensDuVillage(state) {
  const V = villageoisDe(state);
  const L = V.length ? lieuxDuVillage(state) : null;
  const cle = JSON.stringify([graineDe(state), jourDe(state), C(), (DATA.VILLAGE || {}).LIENS, liensSignature(state), V.map((v) => [v.id, v.maison, v.arrive, v.tache || 0, v.foyer || 0])]);
  if (memo && memoCle === cle && memo.L === L) return memo;
  const paires = new Map(), famille = new Map();
  const W = farmTerrain(state).LARGEUR;
  for (let i = 0; i < V.length; i++) {
    const jours = Math.max(0, jourDe(state) - (Number(V[i].arrive) || 0));
    famille.set(V[i].id, { jours });
    for (let j = i + 1; j < V.length; j++) {
      const r = scoreDe(state, V[i], V[j], L, W);
      paires.set(paire(V[i].id, V[j].id), { degre: degreDe(r.score), palier: palierLien(r.score), score: r.score, jours: r.jours });
    }
  }
  memoCle = cle;
  memo = { paires, famille, L };
  return memo;
}

// Le lien de `a` et `b` (deux ids de villageois ; b = 'famille' : la famille du joueur) : { degre (0, 1, 2, 3), palier
// (I6b : 0 à 4), nom (NOMS_LIENS : inconnu, connaissance, camarade, ami, proche ; la famille : DEGRES), score, jours },
// ou null (l'un n'est pas là, ou a === b).
export function connaissance(state, a, b) {
  if (a === b) return null;
  const Lk = liensDuVillage(state);
  if (b === 'famille' || a === 'famille') {
    const id = a === 'famille' ? b : a, f = Lk.famille.get(id);
    if (!f) return null;
    const d = degreFamille(state, id);
    return { degre: d, nom: DEGRES[d], score: d === 2 ? 100 : 50, jours: f.jours };
  }
  const p = Lk.paires.get(paire(a, b));
  return p ? { degre: p.degre, palier: p.palier, nom: NOMS_LIENS[p.palier], score: p.score, jours: p.jours } : null;
}

// Le degré du lien de la famille du joueur avec le villageois `id` (fiche I6a) : 1 (connue dès l'arrivée), 2 dès le
// palier d'amitié VILLAGE.AMITIE.FAMILLE_AMI. Pas gardé avec le jour : un cadeau le change aussitôt.
function degreFamille(state, id) {
  const P = Number(((DATA.VILLAGE && DATA.VILLAGE.AMITIE) || {}).FAMILLE_AMI);
  return palierAmitie(state, id) >= (Number.isFinite(P) ? P : 2) ? 2 : 1;
}

// Ce que la scène doit savoir de l'amitié du joueur avec le villageois `v` (fiche I6a) : { palier, present (il a un
// présent pour lui), retrouvailles (il te connaît et ne t'a pas parlé depuis AMITIE.RETROUVAILLES.JOURS jours) }.
export function amitiePourLaScene(state, v) {
  const p = ((state.amitie && state.amitie.pnj) || {})[v.id] || {};
  const palier = palierAmitie(state, v.id), R = AMITIE.RETROUVAILLES;
  const present = !!(p.present && typeof p.present === 'object' && DATA.OBJETS[p.present.objet]);
  const retrouvailles = palier >= 1 && Number.isFinite(p.vu) && jourDe(state) - p.vu >= R.JOURS;
  return { palier, present, retrouvailles };
}

// Pour la carte : { [a]: { [b]: degré } } (les deux sens) et famille: { [id]: degré } ; null sans villageois.
// Fiche I6a : amitie: { [id]: le palier d'amitié du joueur avec lui }, present: { [id]: true } (il a un présent pour
// le joueur : il le salue de plus loin).
export function liensPourLaCarte(state) {
  const V = villageoisDe(state);
  if (!V.length) return null;
  const Lk = liensDuVillage(state), out = { paires: {}, famille: {} };
  out.amitie = {}; out.present = {};
  for (const v of V) {
    out.paires[v.id] = {};
    out.famille[v.id] = Lk.famille.has(v.id) ? degreFamille(state, v.id) : 0;
    const A = amitiePourLaScene(state, v);
    out.amitie[v.id] = A.palier;
    if (A.present) out.present[v.id] = true;
  }
  for (const [k, p] of Lk.paires) {
    const [a, b] = k.split('|');
    out.paires[a][b] = p.degre; out.paires[b][a] = p.degre;
  }
  return out;
}

/* ---------- les répliques ---------- */

// Le moment de l'heure `h` : matin, jour, soir.
const momentDe = (h) => (h < 11 ? 'matin' : h < 18 ? 'jour' : 'soir');

// {prenom} : le prénom de l'autre ; {e} : l'accord de l'autre (« e » au féminin) ; {joueur} : le personnage du joueur.
function remplir(texte, autre, joueur) {
  return String(texte || '')
    .replace(/\{prenom\}/g, autre ? autre.prenom : '')
    .replace(/\{e\}/g, autre && autre.genre !== 'm' ? 'e' : '')
    .replace(/\{joueur\}/g, joueur || '')
    .replace(/,\s*([!?])/g, ' $1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Le petit échange de `a` et `b` : { degre, emoji: [celui de a, celui de b] (des chaînes, '' : rien), lignes: [ce que
// dit a, ce que répond b] }. `o` : { n (le rang de l'échange de cette paire, aujourd'hui), sorte ('croise', 'visite',
// 'groupe', 'promenade', 'repas'), heure }. b = 'joueur' : ce que dit `a` au personnage du joueur ({ degre, emoji: [e],
// lignes: [texte] }). null : l'un n'est pas là.
export function echangeVillageois(state, a, b, o = {}) {
  const va = trouverVillageois(state, a);
  if (!va) return null;
  const R = S().REPLIQUES || {}, E = S().EMOJI || {};
  const n = Math.max(0, Math.floor(Number(o.n) || 0)), h = Number.isFinite(o.heure) ? o.heure : 12;
  const un = (rnd, l) => (Array.isArray(l) && l.length ? l[Math.floor(rnd() * l.length)] : null);
  if (b === 'joueur') {
    const c = connaissance(state, a, 'famille'), d = c ? c.degre : 1;
    const rnd = rngDe(`${graineDe(state)}:salue:${a}:${jourDe(state)}:${n}`);
    const nom = state.famille && state.famille.principal ? memberName(state, state.famille.principal) : '';
    const J = S().JOUEUR || {};
    // (fiche I6a : le salut suit l'amitié du joueur avec lui : plus chaleureux pour un ami proche ou intime ; joyeux
    // de le revoir après une longue absence ; il a un présent pour lui : il le dit, la page le lui donne)
    const A = amitiePourLaScene(state, va);
    const sorte = A.present ? 'present' : A.retrouvailles ? 'retrouvailles' : A.palier >= 4 ? 'intime' : A.palier >= 3 ? 'proche' : DEGRES[d];
    const L = (J[sorte] && J[sorte].length ? J[sorte] : null) || J[DEGRES[d]] || J.connaissance;
    const t = un(rnd, L) || '';
    return { degre: d, palier: A.palier, sorte, present: A.present, emoji: [un(rnd, E[sorte] || E[DEGRES[d]]) || '👋'], lignes: [remplir(t, null, nom)] };
  }
  const vb = trouverVillageois(state, b);
  if (!vb) return null;
  const c = connaissance(state, a, b), d = c ? c.degre : 0;
  if (!d) return { degre: 0, emoji: ['', ''], lignes: [] };
  const rnd = rngDe(`${graineDe(state)}:echange:${paire(a, b)}:${jourDe(state)}:${o.sorte || 'croise'}:${n}`);
  // (les répliques possibles : celles du degré, du moment, de la météo, de l'humeur, de ce qu'ils font ; ce qu'ils
  // font, d'abord : une visite parle de visite, un groupe de ce qui se dit en groupe)
  const m = meteoDuJour(state, jourDe(state)), pluie = m.sorte === 'pluie' && h >= m.debut && h < m.fin;
  const triste = [va, vb].some((v) => ['triste', 'faim'].includes(humeurVillageois(v)));
  const pool = [...(R[DEGRES[d]] || []), ...(d >= 2 ? R.connaissance || [] : []), ...(d >= 3 ? R.ami || [] : []), ...(R[momentDe(h)] || [])];
  if (pluie) pool.push(...(R.pluie || []), ...(R.pluie || []));
  else if (m.sorte === 'clair') pool.push(...(R.clair || []));
  if (triste) pool.push(...(R.triste || []), ...(R.triste || []));
  // (le rang `n` de l'échange avance dans les listes depuis un point tiré pour la paire et le jour : une causerie ne
  // redit pas la même chose avant d'avoir fait le tour ; ce qu'ils font, un échange sur deux)
  const propres = R[o.sorte] && R[o.sorte].length ? R[o.sorte] : (o.sorte || 'croise') === 'croise' && (R[momentDe(h)] || []).length ? R[momentDe(h)] : null;
  const base = rngDe(`${graineDe(state)}:echange:${paire(a, b)}:${jourDe(state)}:${o.sorte || 'croise'}`)();
  const pris = (l, k) => (l.length ? l[(Math.floor(base * l.length) + k) % l.length] : null);
  const p = (propres ? (n % 2 === 0 || !pool.length ? pris(propres, n >> 1) : pris(pool, n >> 1)) : pris(pool, n)) || ['Bonjour !', 'Bonjour !'];
  const emo = (rnd2) => (triste && rnd2() < 0.4 ? un(rnd2, E.triste) : un(rnd2, E[DEGRES[d]])) || '';
  return { degre: d, emoji: [emo(rnd), emo(rnd)], lignes: [remplir(p[0], vb), remplir(p[1], va)] };
}
