import { DATA, recipeOutput, recipeOutputQty } from './catalog.js';
import { fail } from './devices.js';
import { absoluteHours, clockHours, nightActive } from './clock.js';
import { villageActif } from './village.js';
import { farmTerrain } from './terrain.js';
import { inventoryCounts } from './inventory.js';
import { canFeedHen, feedAllHens, hensToFeed, wheatTotal, woolReady, shear } from './animals.js';
import { harvestPlot, isMature, plantPlot, rockGone, seedStock, treeGone, waterCost, waterPlot } from './crops.js';
import { harvestTree, ripeTrees } from './orchard.js';
import { castLine, chopTree, chopsLeft, fishLeft, foretArbres, foretGrand, grassCut, hasTool, mineRock, scytheGrass, toolDef } from './outils.js';
import { ramassables, ramasser } from './atelier.js';
import { recolterRuche, ruchesARecolter, ruchesPosees } from './ruches.js';
import { pickUp } from './ramassage.js';
import { botteleuses, sortirBotte, verserFibres } from './botteleuse.js';
import { recipeStatus, startRecipe } from './kitchen.js';
import { casesCouvertes, piecesCloses } from './blocs.js';
import { comptoirDuPort, lieuPort, portOuvert } from './port.js';
import { sellItem } from './market.js';
import { noterVenteBac } from './bac.js';
import { bumpCounter } from './campaign.js';
import { trouverVillageois, villageoisDe } from './villageois.js';
import { journeeDuVillage, lieuxDuVillage } from './villageois-journee.js';

/* ---------- les tâches attribuées (le chantier « l'île à bâtir », fiche I3c) ----------

   Le joueur confie une tâche à chaque villageois (attribuer) : les champs, les bêtes, le verger et les ruches, le
   bois, la pierre, la pêche, la cueillette, le fauchage, la cuisine, la navette du port (DATA.TACHES.LISTE,
   data/village.json). Il la fait chaque jour à son poste, aux heures de travail (TACHES.TRAVAIL : la journée,
   villageois-journee.js, lui donne des créneaux « travail » à la place de sorties), et la nuit fait ce qui reste de
   ses ACTIONS du jour (tachesNuit, avant villageoisNuit). Le moteur fait le travail à l'heure (avancerTaches, à chaque
   pas de la ferme, energy.js) : la scène ne fait que le montrer (js/carte/ferme/villageois-travail.js) ; ce qui se
   passe sous les yeux du joueur compte une fois (la règle de la fiche 7b).

   Chaque action passe par les fonctions du joueur (crops.js, animals.js, orchard.js, outils.js, atelier.js,
   ruches.js, ramassage.js, botteleuse.js, kitchen.js, port.js) : une carotte récoltée par lui est une carotte
   récoltée (les compteurs de la campagne et des paliers comptent), dans les bornes du monde (un arbre coupé repousse
   comme les autres, le quota de pêche du jour est celui du joueur). Mais ni l'énergie, ni l'expérience, ni les
   objectifs du jour du joueur (commeLeJoueur : remis comme avant l'action) : c'est le travail du villageois. Ce
   qu'il produit va au coffre de la ferme (l'inventaire, le blé au Silo).

   Les automatisations ne sont pas doublées : tout se lit dans la partie au moment de l'action. Une parcelle arrosée
   (par l'asperseur, l'averse, le robot, le joueur) n'a plus soif : il ne l'arrose pas ; une récolte prise par le robot
   n'est plus mûre : il ne la prend pas, et inversement (le premier passé la prend).

   Les outils : une tâche demande le sien (outil) ; le joueur le fabrique à l'Atelier et le lui donne (donnerOutil :
   il quitte la barre d'outils du joueur, le villageois le garde : v.outil) ; on peut le reprendre (reprendreOutil).
   Sans son outil, ou sans poste (pas d'arbre, pas de champ), la tâche attend (tacheAttente) et le dit : il vit sa
   journée comme avant. L'outil amélioré (la pioche de cuivre, de fer : state.outils.niveauPioche) lui profite comme au
   joueur. En repos (v.repos, I3a), il ne fait rien.

   Ce que la partie garde (format 88) : v.tache (l'id de sa tâche, ou null), v.outil (l'outil confié, ou null),
   v.vendre (la navette : les objets que le joueur a marqués « à vendre »), v.semis ({ case: culture } : ce qu'il
   ressèmera là), v.travail ({ jour, tache, actions, produit: { objet: n }, utilise (I3d : ce qu'il a pris au coffre),
   essai } : sa journée de travail). Le journal du villageois (villageois.js, nuitDe) reçoit chaque nuit { jour, tache,
   actions, produit, utilise, mange } (le tableau des villageois le lit : tableau.js). Les tests :
   tests/engine/village-taches.test.mjs. */

const TA = () => DATA.TACHES || {};
const LISTE = () => TA().LISTE || {};
const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));
const objet = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

// Les tâches, dans l'ordre de la fiche.
export function listeTaches() {
  return Object.keys(LISTE());
}

// La définition de la tâche `id` (TACHES.LISTE), ou null.
export function tacheDef(id) {
  return (typeof id === 'string' && LISTE()[id]) || null;
}

// Les outils qu'un villageois peut tenir : ceux qu'une tâche demande.
export function outilsDesTaches() {
  return [...new Set(Object.values(LISTE()).map((d) => d.outil).filter(Boolean))];
}

const nomOutil = (o) => { const d = toolDef(o); return d ? d.NOM.toLowerCase() : o; };
const unOutil = (o) => { const d = toolDef(o); return `${d && d.ARTICLE === 'un' ? 'un' : 'une'} ${nomOutil(o)}`; };

/* ---------- les postes ---------- */

const distance = (W, a, b) => Math.max(Math.abs((a % W) - (b % W)), Math.abs(Math.floor(a / W) - Math.floor(b / W)));

// La case d'où il part (sa boîte aux lettres, sinon le puits, sinon le milieu de la ferme).
function origineDe(state, v, L) {
  if (v && Number.isInteger(v.maison)) return v.maison;
  if (Number.isInteger(L.puits)) return L.puits;
  const F = L.F;
  return (F.Y + (F.HAUTEUR >> 1)) * L.W + F.X + (F.LARGEUR >> 1);
}

// Les cases libres à côté de la cible (des cases `cases`) : à gauche et à droite de sa rangée du bas d'abord (on
// travaille de profil, la hache, la pioche, la faux : deux camarades de part et d'autre du même arbre), sinon devant
// (dessous), sinon derrière. → [{ case, vers }] (deux au plus).
function desCotes(L, cases) {
  const W = L.W, bas = Math.max(...cases.map((t) => Math.floor(t / W)));
  const rang = cases.filter((t) => Math.floor(t / W) === bas).sort((a, b) => a - b);
  const pied = rang[rang.length >> 1];
  const l = [rang[0] - 1, rang[rang.length - 1] + 1].filter((t) => L.libre(t)).map((t) => ({ case: t, vers: pied }));
  if (l.length) return l;
  const p = aCote(L, cases, true);
  return p ? [p] : [];
}

function aCote(L, cases, profil = true) {
  const W = L.W, bas = Math.max(...cases.map((t) => Math.floor(t / W)));
  const rang = cases.filter((t) => Math.floor(t / W) === bas).sort((a, b) => a - b);
  const g = rang[0] - 1, d = rang[rang.length - 1] + 1, pied = rang[rang.length >> 1];
  const essais = profil ? [g, d, pied + W, g + W, d + W] : [pied + W, g, d, pied - W * (1 + Math.max(...cases.map((t) => Math.floor(t / W))) - Math.min(...cases.map((t) => Math.floor(t / W))))];
  for (const t of essais) if (L.libre(t)) return { case: t, vers: pied };
  return null;
}

// Les tuiles d'eau de la ferme (leurs quatre coins dans l'eau : terrain.SOMMETS, 2), par étendue : [{ eau ('etang'
// ou 'mare', selon sa taille, comme la scène : FISHING), cases }] ; gardées par terrain.
const eauxMemo = new WeakMap();
function eauxDeLaFerme(T) {
  if (eauxMemo.has(T)) return eauxMemo.get(T);
  const S = T.SOMMETS, W = T.LARGEUR, V = W + 1, F = T.FERME;
  const out = [];
  if (S && F) {
    const est = (c, r) => [S[r * V + c], S[r * V + c + 1], S[(r + 1) * V + c], S[(r + 1) * V + c + 1]].every((x) => x === 2);
    const vu = new Set();
    for (let r = F.Y; r < F.Y + F.HAUTEUR; r++) for (let c = F.X; c < F.X + F.LARGEUR; c++) {
      const t = r * W + c;
      if (vu.has(t) || !est(c, r)) continue;
      const cases = [], pile = [t];
      vu.add(t);
      while (pile.length) {
        const k = pile.pop();
        cases.push(k);
        for (const n of [k - 1, k + 1, k - W, k + W]) {
          const nc = n % W, nr = Math.floor(n / W);
          if (!vu.has(n) && nc >= F.X && nc < F.X + F.LARGEUR && nr >= F.Y && nr < F.Y + F.HAUTEUR && est(nc, nr)) { vu.add(n); pile.push(n); }
        }
      }
      const P = TA().LISTE && TA().LISTE.peche && TA().LISTE.peche.EAUX ? TA().LISTE.peche.EAUX : { etang: 30, mare: 4 };
      const eau = cases.length >= P.etang ? 'etang' : cases.length >= P.mare ? 'mare' : null;
      if (eau) out.push({ eau, cases: new Set(cases) });
    }
  }
  eauxMemo.set(T, out);
  return out;
}

const terrainMemo = new WeakMap();

// Les cibles de la tâche `id` aujourd'hui, les plus proches de `o` d'abord : [{ id, cases, case (où l'on vise) }].
function ciblesDe(state, id, L, o) {
  const T = farmTerrain(state), W = L.W, F = L.F, R = Math.max(4, Number(TA().RAYON) || 28);
  const surFerme = (t) => { const c = t % W, r = Math.floor(t / W); return c >= F.X && c < F.X + F.LARGEUR && r >= F.Y && r < F.Y + F.HAUTEUR; };
  // (sur la ferme ; à RAYON cases de sa maison s'il y en a, sinon les plus proches de la ferme)
  const pres = (t) => surFerme(t);
  const tri = (l) => {
    l.sort((a, b) => distance(W, a.case, o) - distance(W, b.case, o) || a.case - b.case);
    const proches = l.filter((x) => distance(W, x.case, o) <= R);
    return proches.length ? proches : l.slice(0, 12);
  };
  // (les arbres, les rochers, l'herbe haute de la ferme, relevés une fois par terrain ; ceux à RAYON cases d'abord)
  let pt = terrainMemo.get(T);
  if (!pt) {
    const pied = (cases) => cases.reduce((m, t) => (t > m ? t : m), cases[0]);
    const ferme = (obj) => Object.entries(obj || {}).filter(([, c]) => c.length && pres(pied(c))).map(([k, c]) => ({ id: k, cases: c, case: pied(c) }));
    pt = { arbres: ferme(T.ARBRES), rochers: ferme(T.ROCHERS), herbes: Object.entries(T.HERBES || {}).filter(([k]) => pres(Number(k))).map(([k, ids]) => ({ ids, case: Number(k) })) };
    terrainMemo.set(T, pt);
  }
  const dans = (l) => { const p = l.filter((x) => distance(W, x.case, o) <= R); return p.length ? p : l; };
  if (id === 'bois') {
    const l = [];
    for (const a of dans(pt.arbres)) if (!treeGone(state, a.id) && chopsLeft(state, a.id) > 0) l.push(a);
    for (const a of foretArbres(state)) if (foretGrand(state, a) && Number.isInteger(a.case) && !treeGone(state, a.id) && pres(a.case)) l.push({ id: a.id, cases: [a.case], case: a.case });
    return tri(l);
  }
  if (id === 'pierre') {
    return tri(dans(pt.rochers).filter((r) => !rockGone(state, r.id)));
  }
  if (id === 'fauchage') {
    const l = [];
    for (const h of dans(pt.herbes)) {
      const reste = h.ids.filter((x) => !grassCut(state, x));
      if (reste.length) l.push({ id: reste[0], ids: reste, cases: [h.case], case: h.case });
    }
    return tri(l);
  }
  if (id === 'cueillette') return tri(ramassables(state).filter((p) => pres(p.case)).map((p) => ({ id: p.id, cases: [p.case], case: p.case })));
  if (id === 'peche') {
    const l = [];
    for (const e of eauxDeLaFerme(T)) for (const t of e.cases) if (!e.cases.has(t - W) && pres(t)) l.push({ id: e.eau, eau: e.eau, cases: [t], case: t });
    return tri(l);
  }
  return [];
}

// Les postes de la tâche `id` pour le villageois `v` : [{ case (où il se tient), vers (ce qu'il travaille), dedans? }],
// les plus proches de sa maison d'abord ; [] : pas de poste (la tâche attend). Rien n'est gardé dans la partie.
// Ce qui change les postes et les cibles, en peu de mots (un texte) : le jour, les arbres abattus, les rochers cassés,
// l'herbe fauchée, la cueillette du jour, le verger, les blocs, les stations, les bêtes, le port, les parcelles. Rien
// n'est parcouru : la journée du village et les postes le relisent souvent.
export function signatureTaches(state) {
  const O = state.outils || {}, n = (x) => (x && typeof x === 'object' ? Object.keys(x).length : 0);
  const S = state.stations || {}, P = state.poulailler, E = state.paturage;
  return [jourDe(state), n(O.arbres), n(O.rochers), n(O.herbes), state.cueillette && state.cueillette.jour === state.day ? state.cueillette.pris.length : 0,
    ((state.verger && state.verger.arbres) || []).length, n(state.blocs), !!(S.cuisine && S.cuisine.construit), !!(S.four && S.four.construit),
    P ? P.poules : 0, E ? (E.moutons || []).length + (E.vaches || []).length : 0, foretArbres(state).length, lieuPort(state) ? 1 : 0,
    ((state.potager && state.potager.parcelles) || []).length].join(':');
}

// (gardés tant que le jour, les lieux, sa maison et ce qui change les cibles (les arbres abattus, les rochers cassés,
// l'herbe fauchée, la cueillette du jour, le verger, les ruches, les stations, les bêtes, le port) ne changent pas :
// la journée du village les relit souvent)
const postesMemo = new Map();
export function postesDe(state, id, v = null) {
  if (!villageActif(state)) return [];
  const def = tacheDef(id);
  if (!def) return [];
  const L = lieuxDuVillage(state);
  const sig = `${id}:${v && Number.isInteger(v.maison) ? v.maison : '-'}:${signatureTaches(state)}`;
  const m = postesMemo.get(sig);
  if (m && m.L === L) return m.postes;
  const postes = calculerPostes(state, id, v, def, L);
  if (postesMemo.size > 64) postesMemo.clear();
  postesMemo.set(sig, { L, postes });
  return postes;
}

function calculerPostes(state, id, v, def, L) {
  const W = L.W, o = origineDe(state, v, L);
  const proche = (l) => l.sort((a, b) => distance(W, a.case, o) - distance(W, b.case, o) || a.case - b.case);
  const vers = (l) => proche(l.map((q) => ({ case: q.case, vers: q.vers })));
  switch (def.lieu) {
    case 'champs': return vers(L.voir.jardin);
    case 'betes': return (state.poulailler && state.poulailler.poules > 0) || (state.paturage && (state.paturage.moutons || []).length + (state.paturage.vaches || []).length > 0) ? vers(L.voir.betes) : [];
    case 'verger': {
      const l = [];
      const pris = new Set();
      const cibles = [...((state.verger && state.verger.arbres) || []).filter((t) => Number.isInteger(t.case)).map((t) => t.case), ...ruchesPosees(state)];
      for (const c of cibles) {
        const p = [c + W, c - 1, c + 1, c - W].find((t) => L.libre(t) && !pris.has(t));
        if (p !== undefined) { pris.add(p); l.push({ case: p, vers: c }); }
      }
      return proche(l);
    }
    case 'arbre': case 'rocher': case 'herbe': case 'cueillette': case 'rive': {
      const cibles = ciblesDe(state, id, L, o), l = [], pris = new Set();
      for (const c of cibles) {
        if (l.length >= 10) break;
        let p = null;
        if (def.lieu === 'rive') {
          // (sur la rive, au-dessus de l'eau (le sable de la berge passé), tourné vers elle)
          const t = [c.case - W, c.case - 2 * W, c.case - 3 * W].find((q) => L.libre(q));
          p = t !== undefined ? { case: t, vers: c.case } : null;
        } else if (def.lieu !== 'cueillette') {
          for (const q of desCotes(L, c.cases)) if (!pris.has(q.case)) { pris.add(q.case); l.push(q); }
          continue;
        } else p = aCote(L, c.cases, false);
        if (p && !pris.has(p.case)) { pris.add(p.case); l.push(p); }
      }
      return l;
    }
    case 'cuisine': {
      const B = state.blocs || {}, S = state.stations || {};
      const sortes = [S.cuisine && S.cuisine.construit ? 'cuisiniere' : null, S.four && S.four.construit ? 'four' : null].filter(Boolean);
      const couvertes = casesCouvertes(state), l = [];
      for (const p of piecesCloses(state)) {
        const dedans = new Set(p.cases);
        for (const t of p.cases) {
          if (!sortes.includes(B[t])) continue;
          const cases = [t, ...[...couvertes].filter(([, a]) => a === t).map(([j]) => j)];
          const libre = (q) => dedans.has(q) && B[q] === undefined && !couvertes.has(q) && !p.paillasses.includes(q);
          const q = cases.map((c) => c + W).concat(cases.map((c) => c - 1), cases.map((c) => c + 1)).find(libre);
          if (q !== undefined) l.push({ case: q, vers: t, dedans: true });
        }
      }
      return proche(l);
    }
    case 'port': {
      const c = comptoirDuPort(state);
      if (!c || !lieuPort(state)) return [];
      // (le coffre : devant la maison de la famille, d'où il part avec ce qu'il porte ; puis le comptoir du port)
      const abri = L.abri && L.abri.length ? L.abri[0] : null;
      const coffre = abri !== null ? [abri + W, abri].find((t) => t !== null) : origineDe(state, null, L);
      return [{ case: coffre, vers: null, coffre: true, dedans: !!L.abri }, { case: c.devant, vers: c.cases[0], port: true }];
    }
    default: return [];
  }
}

// Un appui long sur la case `t` de la carte (« confier à… ») : les tâches dont c'est un poste ou une cible ([ids],
// dans l'ordre de la fiche ; [] : rien à confier ici). Un arbre, un rocher, l'eau d'un étang, une touffe d'herbe
// haute, un arbre fruitier ou une ruche, la cuisinière ou le four, le poulailler et l'étable (leurs pièces, leurs
// enclos), un buisson ; une parcelle (son appui long ouvre déjà sa zone : les champs passent par la fiche).
const arbresMemo = new WeakMap();
export function tachesDuPoste(state, t) {
  if (!villageActif(state) || !Number.isInteger(t)) return [];
  const T = farmTerrain(state), W = T.LARGEUR, B = state.blocs || {}, out = new Set();
  let parCase = arbresMemo.get(T);
  if (!parCase) {
    parCase = new Map();
    for (const [k, cases] of Object.entries(T.ARBRES || {})) for (const c of cases) parCase.set(c, 'bois');
    for (const [k, cases] of Object.entries(T.ROCHERS || {})) for (const c of cases) parCase.set(c, 'pierre');
    arbresMemo.set(T, parCase);
  }
  if (parCase.has(t)) out.add(parCase.get(t));
  if (foretArbres(state).some((a) => a.case === t)) out.add('bois');
  if (eauxDeLaFerme(T).some((e) => e.cases.has(t))) out.add('peche');
  if ((T.HERBES || {})[t]) out.add('fauchage');
  const couvertes = casesCouvertes(state), b = B[couvertes.has(t) ? couvertes.get(t) : t];
  if (((state.verger && state.verger.arbres) || []).some((a) => a.case === t) || b === DATA.RUCHE.OBJET) out.add('verger');
  if (b === 'cuisiniere' || b === 'four') out.add('cuisine');
  if (b === 'nichoir' || b === 'mangeoire' || b === 'barriere') out.add('betes');
  else for (const p of piecesCloses(state)) if (p.cases.includes(t) && p.cases.some((c) => B[c] === 'nichoir' || B[c] === 'mangeoire')) out.add('betes');
  if ((T.BUISSONS || []).some(([x, y, w, h]) => (t % W) >= x && (t % W) < x + w && Math.floor(t / W) <= y && Math.floor(t / W) > y - h)) out.add('cueillette');
  return listeTaches().filter((id) => out.has(id));
}

/* ---------- ce qui manque ---------- */

// Ce qui manque au villageois `v` pour la tâche `id` : null (rien : il peut s'y mettre), ou la raison, un texte.
export function tacheManque(state, v, id) {
  const def = tacheDef(id);
  if (!def) return 'Tâche inconnue.';
  if (def.outil && (!v || v.outil !== def.outil)) {
    const d = toolDef(def.outil), une = d && d.ARTICLE === 'un' ? 'le' : 'la';
    return hasTool(state, def.outil)
      ? `Il lui faut ${unOutil(def.outil)} : donne-lui ${une} tienne (« Donner un outil »).`
      : `Il lui faut ${unOutil(def.outil)} : fabrique-${une} à l'Atelier, puis donne-${une}-lui.`;
  }
  if (!postesDe(state, id, v).length) return def.SANS || 'Pas de poste pour cette tâche.';
  if (id === 'navette' && !(Array.isArray(v && v.vendre) && v.vendre.length)) return 'Rien n\'est marqué « à vendre » : coche sur sa fiche ce qu\'il doit porter au port.';
  return null;
}

// Ce qui manque, dit par lui (sa bulle) : « il me faut une hache. », ou ce que dit la fiche ; '' : rien.
export function manqueDit(state, v) {
  const def = v && tacheDef(v.tache);
  if (!def || !tacheAttente(state, v)) return '';
  if (def.outil && v.outil !== def.outil) return `il me faut ${unOutil(def.outil)}.`;
  if (v.tache === 'navette' && postesDe(state, 'navette', v).length) return 'dis-moi ce que je dois porter au port.';
  const s = def.SANS || '';
  return s ? s[0].toLowerCase() + s.slice(1) : '';
}

// Sa tâche attend-elle ? null (il travaille aujourd'hui, ou n'a pas de tâche), ou la raison. (Gardé tant que rien ne
// change : sa tâche, son outil, sa maison, ce qu'il porte, signatureTaches.)
const attenteMemo = new Map();
export function tacheAttente(state, v) {
  if (!v || !tacheDef(v.tache)) return null;
  const cle = `${v.tache}:${v.outil || ''}:${v.maison ?? ''}:${(v.vendre || []).length}:${hasTool(state, tacheDef(v.tache).outil || 'houe') ? 1 : 0}:${signatureTaches(state)}`;
  const m = attenteMemo.get(v.id);
  if (m && m.cle === cle && m.s === state) return m.r;
  const r = tacheManque(state, v, v.tache);
  if (attenteMemo.size > 200) attenteMemo.clear();
  attenteMemo.set(v.id, { cle, r, s: state });
  return r;
}

// Travaille-t-il aujourd'hui ? (une tâche, rien ne lui manque, pas au repos, il est chez lui sur l'île)
export function travailleAujourdhui(state, v) {
  return !!v && !!tacheDef(v.tache) && !v.repos && !v.accueil && !tacheAttente(state, v);
}

// Les tâches pour la fiche du villageois `id` : [{ id, nom, icone, outil, donne, manque (null ou la raison), prise
// (les prénoms de ceux qui l'ont déjà), choisie }].
export function tachesPour(state, id) {
  const v = trouverVillageois(state, id);
  if (!v) return [];
  const V = villageoisDe(state);
  return listeTaches().map((t) => {
    const d = tacheDef(t);
    return {
      id: t, nom: d.nom, icone: d.icone, outil: d.outil || null, donne: d.donne || '', actions: d.ACTIONS,
      manque: tacheManque(state, v, t), choisie: v.tache === t, prise: V.filter((x) => x !== v && x.tache === t).map((x) => x.prenom),
    };
  });
}

/* ---------- attribuer, les outils ---------- */

// Le joueur confie la tâche `tache` (TACHES.LISTE ; null : plus de tâche) au villageois `id`. → { ok, tache, manque }.
export function attribuer(state, id, tache) {
  if (!villageActif(state)) return fail('Le chantier de l\'île n\'est pas allumé.');
  const v = trouverVillageois(state, id);
  if (!v) return fail('Villageois inconnu.');
  if (tache !== null && tache !== '' && !tacheDef(tache)) return fail('Tâche inconnue.');
  v.tache = tache || null;
  if (!Array.isArray(v.vendre)) v.vendre = [];
  return { ok: true, tache: v.tache, manque: v.tache ? tacheManque(state, v, v.tache) : null };
}

// La navette : ce que le joueur marque « à vendre » (des objets de l'inventaire qui se vendent). → { ok, vendre }.
export function marquerAVendre(state, id, objets) {
  const v = trouverVillageois(state, id);
  if (!v) return fail('Villageois inconnu.');
  const l = Array.isArray(objets) ? objets : [];
  v.vendre = [...new Set(l.filter((o) => typeof o === 'string' && DATA.OBJETS[o] && DATA.OBJETS[o].prix > 0))].slice(0, 40);
  return { ok: true, vendre: v.vendre };
}

const outilsJoueur = (state) => {
  if (!objet(state.outils)) state.outils = { hache: false, pioche: false, canne: false, choisi: 'houe' };
  return state.outils;
};

// Le joueur donne son outil `outil` (hache, pioche, faux, canne) au villageois `id`, qui le garde (il quitte la
// barre d'outils du joueur). Celui que le villageois tenait revient au joueur. → { ok, outil } ou un refus.
export function donnerOutil(state, id, outil) {
  const v = trouverVillageois(state, id);
  if (!v) return fail('Villageois inconnu.');
  if (!outilsDesTaches().includes(outil)) return fail('Ce n\'est pas un outil de travail.');
  if (v.outil === outil) return fail(`Il a déjà ${unOutil(outil)}.`);
  if (!hasTool(state, outil)) return fail(`Tu n'as pas de ${nomOutil(outil)} : fabrique-la à l'Atelier.`);
  if (v.outil && hasTool(state, v.outil)) return fail(`Reprends-lui d'abord sa ${nomOutil(v.outil)} : tu en as déjà une.`);
  const o = outilsJoueur(state);
  if (v.outil) o[v.outil] = true;
  o[outil] = false;
  if (o.choisi === outil) o.choisi = 'houe';
  v.outil = outil;
  return { ok: true, outil };
}

// Le joueur reprend l'outil du villageois `id`. → { ok, outil } ou un refus (il n'en a pas, le joueur en a déjà un).
export function reprendreOutil(state, id) {
  const v = trouverVillageois(state, id);
  if (!v) return fail('Villageois inconnu.');
  if (!v.outil) return fail('Il n\'a pas d\'outil.');
  if (hasTool(state, v.outil)) return fail(`Tu as déjà ${unOutil(v.outil)}.`);
  const outil = v.outil;
  outilsJoueur(state)[outil] = true;
  v.outil = null;
  return { ok: true, outil };
}

/* ---------- le travail : une action ---------- */

// Ce que la ferme a en stock (l'inventaire, le blé du Silo compris) : { objet: n }.
function stock(state) {
  const s = inventoryCounts(state);
  if (state.silo) s[DATA.SILO.ITEM] = wheatTotal(state);
  return s;
}

// `fn` comme le joueur le ferait, l'outil `outil` en main, sans rien lui coûter : son énergie, son expérience et ses
// objectifs du jour sont remis comme avant (le travail est celui du villageois). → le résultat de fn, avec `produit`
// ({ objet: n } : ce qui est entré au coffre) et (I3d) `utilise` ({ objet: n } : ce qui en est sorti pour le travail :
// les ingrédients d'une préparation, la graine ressemée, le blé des poules, ce que la tournée vend).
function commeLeJoueur(state, outil, fn) {
  const energie = state.energie;
  const prog = state.progression ? JSON.stringify(state.progression) : null;
  const faits = state.objectifs && objet(state.objectifs.faits) ? { ...state.objectifs.faits } : null;
  const avait = outil ? hasTool(state, outil) : true;
  if (!avait) outilsJoueur(state)[outil] = true;
  const avant = stock(state);
  state.energie = 1e12;
  let r;
  try {
    r = fn();
  } finally {
    state.energie = energie;
    if (prog) state.progression = JSON.parse(prog);
    if (faits) state.objectifs.faits = faits;
    if (!avait) state.outils[outil] = false;
  }
  if (!r || !r.ok) return r || fail('Rien à faire.');
  const apres = stock(state), produit = {}, utilise = {};
  for (const [k, n] of Object.entries(apres)) if (n > (avant[k] || 0)) produit[k] = n - (avant[k] || 0);
  for (const [k, n] of Object.entries(avant)) if (n > (apres[k] || 0)) utilise[k] = n - (apres[k] || 0);
  return { ...r, produit: { ...produit, ...(r.produit || {}) }, utilise };
}

// La cible la plus proche de la case `pres` parmi `l` ([{ case }]).
function laPlusProche(W, l, pres) {
  if (!Number.isInteger(pres)) return l[0] || null;
  let m = null;
  for (const x of l) if (!m || distance(W, x.case, pres) < distance(W, m.case, pres)) m = x;
  return m;
}

// Une action de la tâche de `v`, près de la case `pres` (ce qu'il a devant lui à son poste). → { ok, produit } ou un
// refus (rien à faire : rien de mûr, plus de poisson…).
function uneAction(state, v, pres) {
  const id = v.tache, def = tacheDef(id), L = lieuxDuVillage(state), W = L.W, o = origineDe(state, v, L);
  const outil = def.outil || null;
  switch (id) {
    case 'champs': {
      const P = ((state.potager && state.potager.parcelles) || []).filter((p) => Number.isInteger(p.case));
      const mures = P.filter((p) => p.culture && isMature(p)), soif = P.filter((p) => p.culture && !p.arrose && !isMature(p) && state.eauMl >= waterCost(state, p) * 1000);
      const semis = objet(v.semis) ? v.semis : (v.semis = {});
      const vides = P.filter((p) => !p.culture && semis[p.case] && seedStock(state, semis[p.case]) > 0);
      const p1 = laPlusProche(W, mures, pres);
      if (p1) {
        const culture = p1.culture;
        return commeLeJoueur(state, null, () => {
          const r = harvestPlot(state, p1, true, true);
          if (r.ok && !p1.culture) semis[p1.case] = culture;
          return r;
        });
      }
      const p2 = laPlusProche(W, soif, pres);
      if (p2) return commeLeJoueur(state, null, () => waterPlot(state, p2, true));
      const p3 = laPlusProche(W, vides, pres);
      if (p3) return commeLeJoueur(state, null, () => { const r = plantPlot(state, p3, semis[p3.case], true); if (r.ok) delete semis[p3.case]; return r; });
      return fail('Rien à faire aux champs.');
    }
    case 'betes': {
      const P = state.poulailler, E = state.paturage, a = state.aRamasser || {};
      if (P && P.poules > 0 && hensToFeed(state) > 0 && canFeedHen(state)) return commeLeJoueur(state, null, () => feedAllHens(state));
      if (a.poulailler) return commeLeJoueur(state, null, () => pickUp(state, 'poulailler'));
      const m = E && (E.moutons || []).find(woolReady);
      if (m) return commeLeJoueur(state, null, () => shear(state, m.id, true));
      if (a.etable) return commeLeJoueur(state, null, () => pickUp(state, 'etable'));
      return fail('Les bêtes n\'ont besoin de rien.');
    }
    case 'verger': {
      const t = laPlusProche(W, ripeTrees(state).filter((x) => Number.isInteger(x.case)), pres);
      if (t) {
        return commeLeJoueur(state, null, () => {
          const r = harvestTree(state, t.id, true);
          if (r.ok) t.prochaine -= 1;   // (cueilli dans la journée, comme par le joueur : harvestTree compte comme la nuit)
          return r;
        });
      }
      const ru = ruchesARecolter(state)[0];
      if (ru) return commeLeJoueur(state, null, () => recolterRuche(state, ru.ref));
      return fail('Rien n\'est mûr au verger.');
    }
    case 'bois': case 'pierre': case 'fauchage': case 'cueillette': {
      const l = ciblesDe(state, id, L, o);
      // (un arbre, un rocher entamé : il le finit d'abord)
      const coups = (k) => (id === 'bois' ? state.outils && state.outils.arbres : id === 'pierre' ? state.outils && state.outils.rochers : null) || {};
      const entame = l.filter((x) => Number.isFinite(coups()[x.id]) && coups()[x.id] > 0);
      const c = laPlusProche(W, entame.length ? entame : l, pres);
      if (!c) return fail('Plus rien à faire ici.');
      if (id === 'bois') return commeLeJoueur(state, outil, () => chopTree(state, c.id));
      if (id === 'pierre') return commeLeJoueur(state, outil, () => mineRock(state, c.id));
      if (id === 'cueillette') return commeLeJoueur(state, null, () => ramasser(state, c.id));
      return commeLeJoueur(state, outil, () => {
        const r = scytheGrass(state, c.id);
        // (une botteleuse posée : la fibre devient de la paille, comme quand le joueur la verse)
        if (r.ok) for (const b of botteleuses(state)) if (b.ok && verserFibres(state, b.case).pleine) sortirBotte(state, b.case);
        return r;
      });
    }
    case 'peche': {
      const eaux = new Set(eauxDeLaFerme(farmTerrain(state)).map((e) => e.eau));
      const ordre = ['etang', 'mare'].filter((e) => eaux.has(e) && fishLeft(state, e) > 0);
      if (!ordre.length) return fail('Le poisson se fait rare aujourd\'hui.');
      return commeLeJoueur(state, outil, () => castLine(state, ordre[0]));
    }
    case 'cuisine': {
      const r0 = (def.RECETTES || []).find((rec) => DATA.RECETTES[rec] && recipeStatus(state, rec).ok);
      if (!r0) return fail('Il n\'y a pas de quoi cuisiner.');
      const r = commeLeJoueur(state, null, () => startRecipe(state, r0));
      // (le plat sortira de la cuisinière ou du four à son heure : on le compte au lancement)
      if (r.ok) r.produit = { [recipeOutput(r0)]: recipeOutputQty(r0) };
      return r;
    }
    case 'navette': {
      const c = comptoirDuPort(state);
      if (!c) return fail('Pas de port.');
      let reste = Math.max(1, Number(def.PORTEE) || 10), gain = 0;
      const vendu = {};
      for (const it of v.vendre || []) {
        if (reste <= 0) break;
        const n = Math.min(reste, stock(state)[it] || 0);
        if (n <= 0) continue;
        // (il porte lui-même ses objets, sans le portage du joueur (I2) : il vend depuis le stock, au comptoir ouvert)
        const r = commeLeJoueur(state, null, () => {
          const ici = portOuvert(state, c.devant);
          if (!ici.ok) return fail(ici.raison);
          const v = sellItem(state, it, n, 'Port');
          if (v.ok) { bumpCounter(state, 'ventesPort', v.gain); noterVenteBac(state, it, v.sold); }   // (les paliers de l'île, paliers.js : ventesPort ; I1c : les caisses du bac)
          return v;
        });
        if (r && r.ok) { reste -= n; gain += r.gain || 0; vendu[it] = n; }
      }
      if (!gain) return fail('Rien à porter au port.');
      return { ok: true, vendu, gain, produit: { pieces: gain } };
    }
    default: return fail('Tâche inconnue.');
  }
}

/* ---------- la journée de travail ---------- */

// Sa journée de travail (v.travail), remise à zéro un autre jour.
function travailDe(state, v) {
  const j = jourDe(state);
  if (!objet(v.travail) || v.travail.jour !== j) v.travail = { jour: j, tache: v.tache || null, actions: 0, produit: {}, utilise: {}, essai: 0 };
  v.travail.tache = v.tache || null;
  return v.travail;
}

// Ses créneaux de travail d'aujourd'hui (villageois-journee.js) : [[de, a]], et leur durée.
function heuresDeTravail(state, v) {
  const segs = journeeDuVillage(state).get(v.id) || [];
  const l = segs.filter((s) => s.etat === 'travail').map((s) => [s.de, s.a, s.lieu]);
  return { l, total: l.reduce((t, [de, a]) => t + (a - de), 0) };
}

// Combien d'actions il devrait avoir faites à l'heure `h` : ACTIONS, à parts égales sur ses heures de travail.
export function actionsDues(state, v, h = clockHours(state)) {
  const def = tacheDef(v.tache);
  if (!def || !travailleAujourdhui(state, v)) return 0;
  const { l, total } = heuresDeTravail(state, v);
  if (!(total > 0)) return 0;
  const fait = l.reduce((t, [de, a]) => t + Math.max(0, Math.min(h, a) - de), 0);
  return Math.min(def.ACTIONS, Math.floor((def.ACTIONS * fait) / total + 1e-9));
}

// Une action faite : son compte et ce qu'elle a donné.
function noterAction(v, T, r) {
  T.actions += 1;
  for (const [k, n] of Object.entries(r.produit || {})) if (n > 0) T.produit[k] = (T.produit[k] || 0) + n;
  // (I3d : ce qu'elle a pris au coffre, que le tableau compte dans son coût : tableau.js)
  if (!objet(T.utilise)) T.utilise = {};
  for (const [k, n] of Object.entries(r.utilise || {})) if (n > 0) T.utilise[k] = (T.utilise[k] || 0) + n;
}

// Il fait ses actions dues jusqu'à `dues` ; une action sans rien à faire se retente ESSAI h plus tard (sauf la
// nuit, qui fait le reste d'un coup : `nuit`). → les actions faites.
function travailler(state, v, dues, nuit = false) {
  const T = travailDe(state, v);
  const maintenant = absoluteHours(state);
  if (!nuit && maintenant < (Number(T.essai) || 0)) return 0;
  let n = 0;
  // (le poste de l'heure : ce qu'il a devant lui)
  let pres = null;
  if (!nuit) {
    const h = clockHours(state);
    const s = (journeeDuVillage(state).get(v.id) || []).find((x) => x.etat === 'travail' && h >= x.de && h < x.a);
    if (s && s.lieu) pres = Number.isInteger(s.lieu.vers) ? s.lieu.vers : s.lieu.case;
  }
  for (let garde = 0; T.actions < dues && garde < 60; garde++) {
    const r = uneAction(state, v, pres);
    if (!r || !r.ok) { T.essai = maintenant + Math.max(0.1, Number(TA().ESSAI) || 0.5); break; }
    noterAction(v, T, r);
    n++;
  }
  return n;
}

const derniers = new WeakMap();   // (la partie → l'heure absolue du dernier passage : avancerTaches, dix fois par heure de jeu au plus)

// À chaque pas de la ferme (energy.js) : chacun fait les actions que l'heure lui doit. Rien le chantier éteint, sans
// villageois au travail, la nuit. → les actions faites.
export function avancerTaches(state) {
  if (!villageActif(state) || !Array.isArray(state.villageois) || !state.villageois.length || nightActive(state)) return 0;
  const t = absoluteHours(state);
  if (t - (derniers.get(state) ?? -Infinity) < 0.1) return 0;
  derniers.set(state, t);
  let n = 0;
  for (const v of villageoisDe(state)) {
    if (!v.tache || !travailleAujourdhui(state, v)) continue;
    const dues = actionsDues(state, v);
    if (dues > travailDe(state, v).actions) n += travailler(state, v, dues);
  }
  return n;
}

// La nuit (runNight, avant villageoisNuit) : chacun fait ce qui reste de ses ACTIONS (une journée finie avant l'heure,
// la page fermée, l'averse) ; sa journée de travail reste dans v.travail, que la nuit du villageois met dans son
// journal (villageois.js, nuitDe). → { [id]: { tache, actions, produit } } ; null le chantier éteint ou sans tâche.
export function tachesNuit(state) {
  if (!villageActif(state) || !Array.isArray(state.villageois)) return null;
  const out = {};
  for (const v of villageoisDe(state)) {
    if (!v.tache) continue;
    const T = travailDe(state, v);
    if (travailleAujourdhui(state, v)) travailler(state, v, tacheDef(v.tache).ACTIONS, true);
    out[v.id] = { tache: v.tache, actions: T.actions, produit: { ...T.produit } };
  }
  return Object.keys(out).length ? out : null;
}

/* ---------- qui fait quoi ---------- */

// La vue d'ensemble : [{ id, prenom, tache (id ou null), nom, icone, outil, etat ('travail', 'attend', 'repos',
// 'libre'), raison (ce qui manque), actions (faites aujourd'hui), sur (ACTIONS), produit }].
export function quiFaitQuoi(state) {
  return villageoisDe(state).map((v) => {
    const def = tacheDef(v.tache), T = objet(v.travail) && v.travail.jour === jourDe(state) ? v.travail : null;
    const raison = def ? tacheAttente(state, v) : null;
    const etat = !def ? 'libre' : v.repos ? 'repos' : raison ? 'attend' : 'travail';
    return {
      id: v.id, prenom: v.prenom, genre: v.genre, tache: def ? v.tache : null, nom: def ? def.nom : '', icone: def ? def.icone : '',
      outil: v.outil || null, etat, raison, actions: T ? T.actions : 0, sur: def ? def.ACTIONS : 0, produit: T ? { ...T.produit } : {},
    };
  });
}

// Pour la scène : { [id]: { tache, actions, emoji, geste } } (ce qu'il a fait aujourd'hui : la bulle à chaque action
// vue) ; null sans tâche.
export function travailPourLaCarte(state) {
  const out = {};
  for (const v of villageoisDe(state)) {
    const def = tacheDef(v.tache);
    if (!def) continue;
    const T = objet(v.travail) && v.travail.jour === jourDe(state) ? v.travail : null;
    out[v.id] = { tache: v.tache, actions: T ? T.actions : 0, emoji: def.emoji || '', geste: def.geste || 'ramasse', outil: v.outil || null };
  }
  return Object.keys(out).length ? out : null;
}
