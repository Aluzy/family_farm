import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { hache } from './ferme-generee.js';
import { farmSeed, farmTerrain } from './terrain.js';
import { meteoDuJour } from './meteo.js';
import { memberName } from './family.js';
import { humeurVillageois, trouverVillageois, villageoisDe } from './villageois.js';
import { lieuxDuVillage } from './villageois-journee.js';

/* ---------- qui se connaît, au village (le chantier « l'île à bâtir », I3b+ : la vie sociale) ----------

   connaissance(state, a, b) dit si deux villageois se connaissent, et à quel degré : 0 inconnu, 1 connaissance,
   2 ami. Rien n'est gardé : le degré se déduit de la partie, chaque jour (VILLAGE.SOCIAL.CONNAISSANCE) :
     - les jours passés ensemble sur l'île, depuis l'arrivée du second (v.arrive) : PAR_JOUR chacun ;
     - des maisons voisines (leurs boîtes aux lettres à VOISINE cases au plus) : VOISIN de plus par jour ;
     - la même table aux repas (celle de sa maison, sinon la table commune : lieuxDuVillage) : TABLE de plus par jour ;
     - une affinité tirée de la graine et des deux ids (de 0 à AFFINITE), qui ne change pas.
   Le score (0 à 100) donne le degré : connaissance dès PALIERS.connaissance, ami dès PALIERS.ami. La famille du
   joueur (b = 'famille') : connue dès l'arrivée (elle l'a accueilli), amie après FAMILLE_AMI jours.

   C'est un remplaçant : la fiche I6b posera une affinité sauvegardée (js/engine/liens.js, qui monte avec ce que les
   villageois vivent ensemble). Elle n'aura qu'à changer le corps de scoreDe (le score de la paire, de 0 à 100) : ceux
   qui lisent (la journée, villageois-journee.js ; la scène, par le modèle de la carte ; les répliques) ne demandent
   que connaissance, liensDuVillage et echangeVillageois. Pas de changement de format de sauvegarde ici.

   echangeVillageois(state, a, b, o) : le petit échange de deux villageois qui se croisent, se rendent visite ou
   causent en groupe (VILLAGE.SOCIAL.REPLIQUES), ou ce que dit un villageois au personnage du joueur (b = 'joueur' :
   SOCIAL.JOUEUR), tiré de la graine, du jour, de la paire et du rang `o.n` de l'échange. */

const S = () => (DATA.VILLAGE && DATA.VILLAGE.SOCIAL) || {};
const C = () => S().CONNAISSANCE || {};
export const DEGRES = ['inconnu', 'connaissance', 'ami'];

const graineDe = (state) => farmSeed(state) || 'ile';
const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));
const rngDe = (cle) => mulberry32(hache(cle));
const paire = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// L'affinité de la paire (de 0 à 1), tirée de la graine et des deux ids : la même dans les deux sens.
function affinite(state, a, b) {
  return hache(`${graineDe(state)}:affinite:${paire(a, b)}`) / 4294967296;
}

// La table où mange le villageois `v` (la case de la table : celle de sa maison, sinon la table commune), ou null.
function tableDe(L, v) {
  const m = v.maison !== null && v.maison !== undefined ? L.maisons.get(v.maison) : null;
  const tb = (m && m.table) || L.commune;
  return tb ? tb.table : null;
}

// Le score de la paire (0 à 100), et les jours passés ensemble. Le seul calcul que I6b remplacera.
function scoreDe(state, va, vb, L, W) {
  const c = C(), jours = Math.max(0, jourDe(state) - Math.max(Number(va.arrive) || 0, Number(vb.arrive) || 0));
  let parJour = Number(c.PAR_JOUR) || 0;
  if (Number.isInteger(va.maison) && Number.isInteger(vb.maison)) {
    const d = Math.max(Math.abs((va.maison % W) - (vb.maison % W)), Math.abs(Math.floor(va.maison / W) - Math.floor(vb.maison / W)));
    if (d <= (Number(c.VOISINE) || 0)) parJour += Number(c.VOISIN) || 0;
  }
  const ta = tableDe(L, va);
  if (ta !== null && ta === tableDe(L, vb)) parJour += Number(c.TABLE) || 0;
  // (I3c : la même tâche, on se lie en travaillant ensemble)
  if (va.tache && va.tache === vb.tache) parJour += Number(c.COLLEGUE) || 0;
  const score = Math.min(100, Math.round(jours * parJour + affinite(state, va.id, vb.id) * (Number(c.AFFINITE) || 0)));
  return { score, jours };
}

const degreDe = (score) => {
  const P = C().PALIERS || {};
  return score >= (Number(P.ami) || 36) ? 2 : score >= (Number(P.connaissance) || 12) ? 1 : 0;
};

let memoCle = null, memo = null;

// Les liens de tout le village aujourd'hui : { paires: Map('a|b' → { degre, score, jours }), famille: Map(id →
// { degre, jours }) }. Gardés tant que le jour, les villageois et les lieux ne changent pas.
export function liensDuVillage(state) {
  const V = villageoisDe(state);
  const L = V.length ? lieuxDuVillage(state) : null;
  const cle = JSON.stringify([graineDe(state), jourDe(state), C(), V.map((v) => [v.id, v.maison, v.arrive, v.tache || 0])]);
  if (memo && memoCle === cle && memo.L === L) return memo;
  const paires = new Map(), famille = new Map();
  const W = farmTerrain(state).LARGEUR, fa = Math.max(0, Number(C().FAMILLE_AMI) || 0);
  for (let i = 0; i < V.length; i++) {
    const jours = Math.max(0, jourDe(state) - (Number(V[i].arrive) || 0));
    famille.set(V[i].id, { degre: jours >= fa ? 2 : 1, jours });
    for (let j = i + 1; j < V.length; j++) {
      const r = scoreDe(state, V[i], V[j], L, W);
      paires.set(paire(V[i].id, V[j].id), { degre: degreDe(r.score), score: r.score, jours: r.jours });
    }
  }
  memoCle = cle;
  memo = { paires, famille, L };
  return memo;
}

// Le lien de `a` et `b` (deux ids de villageois ; b = 'famille' : la famille du joueur) : { degre (0, 1, 2), nom
// (DEGRES), score, jours }, ou null (l'un n'est pas là, ou a === b).
export function connaissance(state, a, b) {
  if (a === b) return null;
  const Lk = liensDuVillage(state);
  if (b === 'famille' || a === 'famille') {
    const f = Lk.famille.get(a === 'famille' ? b : a);
    return f ? { degre: f.degre, nom: DEGRES[f.degre], score: f.degre === 2 ? 100 : 50, jours: f.jours } : null;
  }
  const p = Lk.paires.get(paire(a, b));
  return p ? { degre: p.degre, nom: DEGRES[p.degre], score: p.score, jours: p.jours } : null;
}

// Pour la carte : { [a]: { [b]: degré } } (les deux sens) et famille: { [id]: degré } ; null sans villageois.
export function liensPourLaCarte(state) {
  const V = villageoisDe(state);
  if (!V.length) return null;
  const Lk = liensDuVillage(state), out = { paires: {}, famille: {} };
  for (const v of V) { out.paires[v.id] = {}; out.famille[v.id] = (Lk.famille.get(v.id) || {}).degre || 0; }
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
    const t = un(rnd, J[DEGRES[d]] || J.connaissance) || '';
    return { degre: d, emoji: [un(rnd, E[DEGRES[d]]) || '👋'], lignes: [remplir(t, null, nom)] };
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
  const pool = [...(R[DEGRES[d]] || []), ...(d === 2 ? R.connaissance || [] : []), ...(R[momentDe(h)] || [])];
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
