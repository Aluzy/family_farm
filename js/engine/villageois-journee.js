import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { hache } from './ferme-generee.js';
import { farmSeed, farmTerrain } from './terrain.js';
import { villageActif } from './village.js';
import { blocsPoses, casesCouvertes, estCloture, etatEnclos, maisonsMarquees, piecesCloses, solsPoses } from './blocs.js';
import { lieuPort } from './port.js';
import { meteoDuJour } from './meteo.js';
import { noterObjectif } from './objectifs-compte.js';
import { humeurVillageois, trouverVillageois, villageoisDe } from './villageois.js';
import { connaissance } from './villageois-liens.js';
import { manqueDit, postesDe, signatureTaches, tacheDef, travailleAujourdhui } from './taches.js';
import { entraidesDuJour, foyerDe, liensSignature } from './liens.js';

/* ---------- la journée des villageois sur la ferme (le chantier « l'île à bâtir », fiche I3b) ----------

   Où est un villageois, et ce qu'il fait, à chaque heure du jour : tout se déduit de la partie (ses blocs, sa
   graine, la météo du jour) et de l'heure, sans rien garder (comme la tournée de la calèche, caleche-tournee.js) :
   deux joueurs voient la même chose (I9d), la scène n'a rien à calculer loin de la vue (elle le pose où il doit
   être, js/carte/ferme/villageois.js), et les tests le vérifient sans navigateur.

   L'horaire (VILLAGE.HORAIRE, d'après HABITANTS.HORAIRE) fait la journée : dormir (jusqu'au lever, dans son lit),
   lever (chez lui), puis des créneaux dehors (dehors : il va et vient ; flaner : un banc, la place), repas (midi et
   soir, assis), rentrer (la veillée chez lui), dormir. Les états de la fiche : lever, dehors, repas, flaner,
   rentrer, dormir, repos (il se repose chez lui entre les repas : mal nourri ou sans lit la nuit d'avant) ; et abri
   (sous la pluie, chez lui). Chacun a son retard (DECALE), tiré de la graine, du jour et de son id.

   Les lieux (lieuxDuVillage, gardés tant que les blocs ne changent pas) :
     - sa maison : les cases libres de sa pièce (ni bloc, ni lit) ; sans maison, l'abri de départ (ou la maison de
       la famille) ;
     - la table : celle de sa maison (une table et ses chaises dans sa pièce), sinon la table commune dehors (une
       table de jardin ou en rondins et les sièges qui la touchent) ; un siège par villageois, dans l'ordre des id ;
     - les bancs : les sièges dehors qui ne touchent pas de table ; un par villageois et par créneau ;
     - la place : les cases libres à PLACE cases au plus du puits (sinon de la table commune) ;
     - la promenade : les chemins posés de la ferme (state.sols « chemin ») et la place ; sans eux, les abords de sa
       porte (PROMENADE cases au plus).
   Une case libre : sur la ferme, de l'herbe ou ses abords (terrain « # » ou « + », pas sous un arbre ni un rocher),
   sans bloc, hors des pièces closes et des parcelles. Un lieu est { genre, case } : genre 'lit' (son couchage),
   'maison' (une case de sa maison ou de l'abri), 'siege' (la case du siège ; table : la case de la table, s'il y en
   a une), 'place', 'promenade'. Jamais une case de mur (le test : tests/engine/village-journee.test.mjs).

   I3b+ (la vie sociale) : les créneaux dehors ont un but (rendre visite à un ami, le retrouver sur la place ou au
   puits, se promener à deux, puiser de l'eau, voir le jardin, les bêtes, un ouvrage, descendre au port), tiré pour
   tout le village à la fois (calculerJournee) d'après qui se connaît (villageois-liens.js, connaissance) ; les lieux
   de ces buts (lieuxDesSorties) : 'devant' (une case, tournée vers `vers`) et 'groupe' (une case d'un petit cercle,
   tournée vers son centre `vers`). Les tests : tests/engine/village-social.test.mjs.

   I3c (les tâches, taches.js) : celui qui a une tâche, s'il peut la faire aujourd'hui (travailleAujourdhui : ni au
   repos, ni sans son outil, ni sans poste), travaille aux créneaux de TACHES.TRAVAIL (planDuTravail, avant les
   sorties) : l'état « travail », à son poste (lieu 'devant', tourné vers ce qu'il travaille : `vers`), le but
   { sorte: 'travail', tache, cle, avec (ses camarades au même poste), geste, emoji } ; PAUSE créneaux de chaque plage
   restent des sorties (le puits, un ami), et les repas, le matin avant le travail et la fin d'après-midi ne changent
   pas. Deux villageois à la même tâche ont des postes voisins (ceux du premier, rangés depuis sa maison) et la même
   clé : ils causent un peu. Les tests : tests/engine/village-taches.test.mjs.

   I6b (les liens, liens.js) : des amis s'assoient côte à côte (le but « banc » : deux bancs voisins, lieu 'siege',
   l'état « flaner » ; à table, chacun prend le siège le plus près d'un ami déjà assis) ; la visite du soir (après le
   souper, visitesDuSoir : il va devant la porte d'un ami, qui sort à côté ; le but « visite » avec soir: true) ; le
   repas apporté (entraidesDuJour : au repas de midi, l'ami va à la porte de celui qui se repose, qui sort le
   recevoir ; le but « visite » avec apporte: true, emoji 🍲) ; un enfant (v.enfant) ne travaille pas et joue sur la
   place (le but « jeu ») ; ni lui ni un villageois au repos ne sortent avec les adultes. Les tests :
   tests/engine/village-liens.test.mjs. */

const H = () => (DATA.VILLAGE && DATA.VILLAGE.HORAIRE) || {};
const P = () => (DATA.VILLAGE && DATA.VILLAGE.PHRASES) || {};
const SB = () => (DATA.VILLAGE && DATA.VILLAGE.SOCIAL && DATA.VILLAGE.SOCIAL.BUTS) || {};
const SIEGES = new Set(['chaise_jardin', 'banc_jardin', 'meuble_chaise', 'banc_rondins', 'chaise_peinte', 'banc_pierre']);
const TABLES_DEHORS = new Set(['table_jardin', 'table_rondins']);
const TABLES = new Set([...TABLES_DEHORS, 'meuble_table']);
export const ETATS_VILLAGEOIS = ['lever', 'dehors', 'repas', 'flaner', 'rentrer', 'dormir', 'repos', 'abri', 'recoit', 'travail'];
// (I3b+ : les buts d'une sortie, SOCIAL.BUTS ; le but d'un segment : seg.but.sorte)
export const BUTS_VILLAGEOIS = ['visite', 'rdv', 'promenade', 'eau', 'jardin', 'betes', 'ouvrage', 'port', 'banc', 'jeu'];

const graineDe = (state) => farmSeed(state) || 'ile';
const jourDe = (state) => Math.max(1, Math.floor(Number(state && state.day) || 1));
const rngDe = (cle) => mulberry32(hache(cle));
const sorteDe = (s) => DATA.ATELIER.BLOCS[s] || null;

/* ---------- les lieux ---------- */

let lieuxCle = null, lieuxMemo = null;

// Les lieux de la ferme (voir plus haut) : { W, libre(case), maisons: Map(boite → { cases, table }), commune
// ({ table, sieges } ou null), bancs, place, promenade, abri ([cases] ou null) }. Gardés tant que les blocs et
// les sols ne changent pas (piecesCloses rend la même liste tant que les blocs sont les mêmes).
export function lieuxDuVillage(state) {
  const pieces = piecesCloses(state), sols = solsPoses(state), parcelles = state.potager && state.potager.parcelles;
  const cle = [pieces, Object.keys(sols).length, parcelles ? parcelles.length : 0, graineDe(state), state.abriDepart ? 1 : 0];
  if (lieuxMemo && lieuxCle && cle.every((x, k) => x === lieuxCle[k])) return lieuxMemo;
  lieuxCle = cle;
  lieuxMemo = calculerLieux(state, pieces, sols);
  return lieuxMemo;
}

function calculerLieux(state, pieces, sols) {
  const T = farmTerrain(state), W = T.LARGEUR, B = blocsPoses(state), couvertes = casesCouvertes(state);
  const F = T.FERME || { X: 0, Y: 0, LARGEUR: W, HAUTEUR: T.HAUTEUR };
  const dedans = new Set();
  for (const p of pieces) for (const t of p.cases) dedans.add(t);
  const terres = new Set(((state.potager && state.potager.parcelles) || []).map((p) => p.case));
  const surFerme = (t) => { const c = t % W, r = Math.floor(t / W); return c >= F.X && c < F.X + F.LARGEUR && r >= F.Y && r < F.Y + F.HAUTEUR; };
  const sol = (t) => { const r = Math.floor(t / W), L = T.LIGNES[r]; const ch = L ? L[t % W] : '.'; return ch === '#' || ch === '+'; };
  const vide = (t) => B[t] === undefined && !couvertes.has(t);
  // (une case où se tenir dehors)
  const libre = (t) => Number.isInteger(t) && surFerme(t) && sol(t) && vide(t) && !dedans.has(t) && !terres.has(t);
  // (une case où se tenir dans une pièce : ni bloc, ni lit, ni meuble)
  const libreDedans = (t) => vide(t);
  const voisins = (t) => [t + W, t - 1, t + 1, t - W];
  const tableDe = (t) => (couvertes.has(t) ? couvertes.get(t) : t);
  // les tables et leurs sièges (un siège s'assoit d'une case libre qui le touche, sieges.js placeSiege)
  const tables = new Map();
  for (const [k, s] of Object.entries(B)) {
    if (!TABLES.has(s)) continue;
    const t = Number(k), cases = [t, ...[...couvertes].filter(([, o]) => o === t).map(([j]) => j)];
    const sieges = [];
    for (const c of cases) for (const j of voisins(c)) if (SIEGES.has(B[j]) && !sieges.includes(j) && voisins(j).some((q) => q !== c && (dedans.has(j) ? libreDedans(q) && dedans.has(q) : libre(q)))) sieges.push(j);
    tables.set(t, { table: t, sorte: s, sieges: sieges.sort((a, b) => a - b), dehors: !dedans.has(t) });
  }
  const autourDeTable = new Set();
  for (const tb of tables.values()) for (const j of tb.sieges) autourDeTable.add(tableDe(j));
  // les maisons des villageois : leurs cases libres, leur table
  const maisons = new Map();
  for (const m of maisonsMarquees(state)) {
    const cases = m.piece.cases.filter((t) => libreDedans(t) && !m.piece.paillasses.includes(t));
    const tb = [...tables.values()].find((x) => !x.dehors && m.piece.cases.includes(x.table) && x.sieges.length) || null;
    maisons.set(m.boite, { cases, table: tb, porte: m.piece.portes[0] });
  }
  // la table commune : dehors, celle qui a le plus de sièges (à égalité : la première)
  let commune = null;
  for (const tb of tables.values()) if (tb.dehors && TABLES_DEHORS.has(tb.sorte) && tb.sieges.length && (!commune || tb.sieges.length > commune.sieges.length)) commune = tb;
  // les bancs : les sièges dehors qui ne touchent pas de table, d'où l'on s'assoit
  const bancs = Object.keys(B).map(Number).filter((t) => SIEGES.has(B[t]) && !dedans.has(t) && !autourDeTable.has(t) && voisins(t).some(libre)).sort((a, b) => a - b);
  // (I6b : deux bancs côte à côte, sur la même rangée, pour s'asseoir à deux)
  const duos = bancs.filter((t) => bancs.includes(t + 1) && Math.floor(t / W) === Math.floor((t + 1) / W)).map((t) => [t, t + 1]);
  // la place : autour du puits, sinon de la table commune
  const puits = Object.keys(B).map(Number).find((t) => B[t] === 'puits');
  const centre = puits !== undefined ? puits : commune ? commune.table : null;
  const R = Math.max(1, Number(H().PLACE) || 3);
  const place = [];
  if (centre !== null) {
    const c0 = centre % W, r0 = Math.floor(centre / W);
    // (pas contre le puits ni la table, ni juste derrière un bloc, qui le cacherait)
    for (let dr = -R; dr <= R + 1; dr++) for (let dc = -R; dc <= R; dc++) {
      const t = (r0 + dr) * W + c0 + dc;
      if (Math.max(Math.abs(dr), Math.abs(dc)) >= 2 && libre(t) && B[t + W] === undefined) place.push(t);
    }
  }
  // la promenade : les chemins posés de la ferme (un sur deux : il y en a beaucoup), puis la place
  const chemins = Object.keys(sols).map(Number).filter((t) => sols[t] === 'chemin' && libre(t)).sort((a, b) => a - b);
  const promenade = chemins.filter((t, k) => k % 2 === 0).concat(place);
  // l'abri de départ (sans maison), sinon la maison de la famille (la première pièce avec un lit hors des maisons
  // des villageois)
  const marquees = new Set(maisonsMarquees(state).map((m) => m.piece));
  const A = state.abriDepart;
  const pAbri = (A && Array.isArray(A.sols) && pieces.find((p) => p.cases.includes(A.sols[0])))
    || pieces.find((p) => !marquees.has(p) && p.paillasses.length) || null;
  const abri = pAbri ? pAbri.cases.filter((t) => libreDedans(t) && !pAbri.paillasses.includes(t)) : null;
  const sorties = lieuxDesSorties(state, { W, B, couvertes, libre, maisons, puits, place, chemins, terres, centre });
  return { W, libre, maisons, commune, bancs, duos, place, promenade, chemins, abri: abri && abri.length ? abri : null, F, puits: puits === undefined ? null : puits, ...sorties };
}

// I3b+ : les lieux des sorties (SOCIAL.BUTS). Chaque maison de villageois gagne `devant` ({ porte, front (la case
// devant sa porte, dehors), cote (une case libre à côté), dedans (une case de sa pièce près de la porte) }, ou
// null) ; et :
//   - eau : la case d'où l'on puise (devant le puits, sinon à côté), ou null ;
//   - cercles : les centres d'un petit cercle de conversation ({ case, puits }) : le centre et ses cases de gauche,
//     de droite et du bas libres (on s'y tient en se faisant face) ; devant le puits d'abord, puis sur la place
//     (sinon sur les chemins), espacés ;
//   - voir : { jardin, betes, ouvrage } : des cases d'où regarder ({ case, vers }) une parcelle, une bête dans son
//     enclos (par-dessus la barrière), un ouvrage de la famille (SOCIAL.BUTS.OUVRAGES).
function lieuxDesSorties(state, o) {
  const { W, B, couvertes, libre, maisons, puits, place, chemins, terres } = o;
  const autour = (t) => [t + W, t - 1, t + 1, t - W];
  for (const m of maisons.values()) {
    m.devant = null;
    const porte = m.porte;
    if (!Number.isInteger(porte)) continue;
    const front = autour(porte).find(libre);
    if (front === undefined) continue;
    const cote = [front - 1, front + 1, front + W].find((t) => t !== porte && libre(t));
    if (cote === undefined) continue;
    const dedans = autour(porte).find((t) => m.cases.includes(t));
    m.devant = { porte, front, cote, dedans: dedans === undefined ? (m.cases[0] ?? null) : dedans };
  }
  const eau = puits !== undefined ? [puits + W, puits - 1, puits + 1].find(libre) : undefined;
  const pris = new Set(eau === undefined ? [] : [eau]);
  const spots = (c) => [c - 1, c + 1, c + W];
  const cercle = (c) => libre(c) && spots(c).every((t) => libre(t) && !pris.has(t)) && !pris.has(c);
  const cercles = [];
  const prendre = (c, puitsAussi) => {
    if (!cercle(c) || cercles.some((x) => Math.max(Math.abs((x.case % W) - (c % W)), Math.abs(Math.floor(x.case / W) - Math.floor(c / W))) < 3)) return;
    cercles.push({ case: c, puits: !!puitsAussi });
    for (const t of [c, ...spots(c)]) pris.add(t);
  };
  if (puits !== undefined) prendre(puits + 2 * W, true);
  // (sur la place, au plus près de son centre (le puits, la table commune), devant lui plutôt que derrière (un puits
  // cache ce qui est derrière lui) ; sans place, sur les chemins)
  const c0 = o.centre;
  const loin = (t) => (c0 === null ? 0 : Math.abs((t % W) - (c0 % W)) + Math.abs(Math.floor(t / W) - Math.floor(c0 / W))
    + (Math.floor(t / W) < Math.floor(c0 / W) ? 6 : 0));
  for (const t of (place.length ? [...place] : [...chemins]).sort((a, b) => loin(a) - loin(b) || a - b)) { if (cercles.length >= 3) break; prendre(t, false); }
  // (au plus `n` lieux d'où regarder, répartis sur la liste)
  const etale = (l, n) => (l.length <= n ? l : Array.from({ length: n }, (x, k) => l[Math.floor((k * l.length) / n)]));
  const vus = new Set();
  const jardin = [];
  for (const p of [...terres].sort((a, b) => a - b)) {
    const t = autour(p).find((q) => libre(q) && !vus.has(q));
    if (t !== undefined) { vus.add(t); jardin.push({ case: t, vers: p }); }
  }
  const betes = [];
  for (const cle of ['nichoir', 'mangeoire']) {
    let e = null;
    try { e = etatEnclos(state, cle); } catch (err) { e = null; }
    const enclos = e && Array.isArray(e.enclos) ? e.enclos : [];
    for (const x of enclos) {
      for (const f of autour(x)) {
        if (!estCloture(B[f])) continue;
        const t = f + (f - x);
        if (libre(t) && !vus.has(t)) { vus.add(t); betes.push({ case: t, vers: x }); }
      }
    }
  }
  const O = Array.isArray(SB().OUVRAGES) ? SB().OUVRAGES : [];
  const ouvrage = [];
  for (const k of Object.keys(B).map(Number).sort((a, b) => a - b)) {
    const s = B[k];
    if (s === 'puits' || !O.some((x) => (x.endsWith('_') ? s.startsWith(x) : s === x))) continue;
    const cases = [k, ...[...couvertes].filter(([, q]) => q === k).map(([j]) => j)];
    let t;
    for (const c of cases) { t = autour(c).find((q) => libre(q) && !vus.has(q)); if (t !== undefined) break; }
    if (t !== undefined) { vus.add(t); ouvrage.push({ case: t, vers: k }); }
  }
  return { eau: eau === undefined ? null : eau, cercles, voir: { jardin: etale(jardin, 12), betes: etale(betes, 8), ouvrage: etale(ouvrage, 12) } };
}

// Les abords de la porte `porte` (pour la promenade sans chemin ni place) : les cases libres de 2 à PROMENADE cases.
function abords(L, porte) {
  const W = L.W, out = [], R = Math.max(2, Number(H().PROMENADE) || 8);
  if (!Number.isInteger(porte)) return out;
  const c0 = porte % W, r0 = Math.floor(porte / W);
  for (let dr = -R; dr <= R; dr++) for (let dc = -R; dc <= R; dc++) {
    if (Math.max(Math.abs(dr), Math.abs(dc)) < 2) continue;
    const t = (r0 + dr) * W + c0 + dc;
    if (L.libre(t)) out.push(t);
  }
  return out;
}

/* ---------- la journée ---------- */

const memoJours = new Map();   // (cle → Map(id → segments)) : la dernière journée calculée

// La journée du village le jour `jour` (state.day par défaut) : Map(id → [{ de, a, etat, lieu: { genre, case,
// table?, vers? }, but? }]), les segments de 0 à 24 h, dans l'ordre. Les repas sont faits dans l'ordre des id : un
// siège pris par l'un ne l'est pas par un autre ; les créneaux dehors, créneau par créneau, pour tout le village à
// la fois (I3b+ : un ami rendu visite, un rendez-vous, une promenade à deux engagent les deux). Gardée tant que la
// partie et le jour ne changent pas (ni l'horaire). Vide le chantier éteint.
export function journeeDuVillage(state, jour = jourDe(state)) {
  const V = villageoisDe(state);
  if (!V.length) return new Map();
  const L = lieuxDuVillage(state);
  const lp = lieuPort(state);
  // (I3c : sa tâche, et si elle attend : un outil donné, une parcelle labourée la remettent en route)
  const avecTache = V.some((v) => v.tache);
  // (I6b : les liens, gardés dans la partie, et les repas apportés)
  const cle = JSON.stringify([graineDe(state), jour, H(), SB(), (DATA.VILLAGE.SOCIAL || {}).CONNAISSANCE, (DATA.VILLAGE || {}).LIENS, liensSignature(state), lp ? [lp.case, lp.chemin] : 0, avecTache ? signatureTaches(state) : 0,
    V.map((v) => [v.id, v.maison, v.lit, !!v.repos, v.accueil || 0, v.arrive, v.tache || 0, v.outil || 0, v.tache === 'navette' ? (v.vendre || []).length : 0, v.enfant ? 1 : 0])]);
  const deja = memoJours.get(cle);
  if (deja && deja.L === L) return deja.J;
  const J = calculerJournee(state, jour, V, L);
  memoJours.clear();
  memoJours.set(cle, { L, J });
  return J;
}

/* La journée de chacun : son squelette (lever, sortie, repas, veillée, coucher, tirés de son retard), puis ses
   créneaux dehors, faits créneau par créneau pour tout le village (planDesCreneaux), puis les segments.

   Un créneau dehors (I3b+) : une fois sur FLANER, il flâne (un banc libre, sinon la place) ; sinon il tire un but au
   poids (SOCIAL.BUTS.POIDS), parmi ceux qui ont un lieu libre et, pour ceux qu'on fait à plusieurs, un ami libre à ce
   créneau (connaissance : un ami pour la promenade, une connaissance au moins pour la visite et le rendez-vous) :
     - visite : il va devant la porte de l'ami (lieu 'devant', tourné vers la porte) ; l'ami, chez lui le temps de
       RECOIT h (« recoit »), sort à côté de sa porte ; ils causent ;
     - rdv : avec un ou deux amis, en petit cercle (lieu 'groupe' : une case du cercle, tournée vers son centre),
       devant le puits ou sur la place ;
     - promenade : à deux ; le meneur va à un point des chemins ou de la place, l'autre à la case d'à côté ; la scène
       les fait marcher ensemble ;
     - eau (devant le puits), jardin, betes, ouvrage (une case d'où regarder) ; port (si son chemin est court) ;
   à défaut, il va et vient (un point des chemins posés, de la place ou des abords de sa porte : comme en I3b). Une
   visite, un rendez-vous, une promenade durent DUREE créneaux (le temps d'y aller et d'y rester), si tous y sont
   libres ; l'ami chez qui l'on va, celui qu'on retrouve, est plutôt un voisin.
   Le but du segment : { sorte, cle (la même pour tous ceux qui le font ensemble), avec (les ids des autres), role
   ('visiteur', 'hote', 'meneur', 'suit'), emoji } ; ni but ni lieu inventé loin de la vue : tout vient de l'heure. */
function calculerJournee(state, jour, V, L) {
  const h = H(), C = Math.max(0.25, Number(h.CRENEAU) || 0.75), g = graineDe(state);
  const meteo = meteoDuJour(state, jour);
  const pluie = meteo.sorte === 'pluie' ? [meteo.debut, meteo.fin] : null;
  const pris = new Map();                 // (créneau ou repas → Set des sièges, cases pris)
  const prendre = (k, t) => { let s = pris.get(k); if (!s) pris.set(k, (s = new Set())); if (s.has(t)) return false; s.add(t); return true; };
  const tries = [...V].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  // 1. le squelette de chacun
  const gens = [];
  for (const v of tries) {
    const rnd = rngDe(`${g}:vie:${v.id}:${jour}`);
    const d = rnd() * (Number(h.DECALE) || 0);
    const maison = v.maison !== null && v.maison !== undefined ? L.maisons.get(v.maison) || null : null;
    const chez = maison && maison.cases.length ? maison.cases : L.abri;
    // (une case de chez lui, tirée ; sans maison ni abri : la place, ou rien)
    const caseChez = (r) => (chez && chez.length ? chez[Math.floor(r * chez.length)] : L.place.length ? L.place[Math.floor(r * L.place.length)] : null);
    const ici = (genre, t) => (t === null || t === undefined ? null : { genre, case: t });
    const enMaison = () => ici(maison && maison.cases.length ? 'maison' : 'abri', caseChez(rnd()));
    const promenade = L.promenade.length ? L.promenade : abords(L, maison ? maison.porte : L.abri ? L.abri[0] : null);
    const x = {
      v, rnd, maison, enMaison, promenade, ici,
      lever: h.LEVER + d, sortie: h.SORTIE + d, midi: h.MIDI + d / 2, reprise: h.REPRISE + d / 2,
      souper: h.SOUPER + d / 2, veillee: h.VEILLEE + d, coucher: Math.min(h.COUCHER + d / 2, DATA.TEMPS.HEURE_NUIT - 0.25),
      lit: Number.isInteger(v.lit) && maison ? { genre: 'lit', case: v.lit } : null,
    };
    const FL = h.FLANER || [];
    x.matin = bornesCreneaux(x.sortie, x.midi, C, Number(FL[0]) || 0);
    x.apres = bornesCreneaux(x.reprise, x.souper, C, Number(FL[1]) || 0);
    x.parK = new Map([...x.matin, ...x.apres].map((p) => [p.k, p]));
    x.plan = new Map();
    gens.push(x);
  }
  // 2. I3c : les créneaux de travail ; puis les créneaux dehors, pour tout le village
  planDuTravail(state, jour, gens, L, prendre, C);
  planDesCreneaux(state, jour, gens, L, prendre);
  // (I6b : les repas apportés à midi, les visites du soir)
  const apportes = repasApportes(state, jour, gens, L);
  const soirees = visitesDuSoir(state, jour, gens, L);
  // 3. les segments
  const out = new Map(), assis = new Map();
  for (const x of gens) {
    const segs = [];
    const pousse = (de, a, etat, lieu, but) => {
      if (!(a > de + 1e-9)) return;
      const l = lieu || x.enMaison(), prec = segs[segs.length - 1];
      // (le même but, au même lieu, sur deux créneaux : un seul segment)
      if (but && prec && prec.but === but && prec.etat === etat && prec.lieu === l && Math.abs(prec.a - de) < 1e-9) { prec.a = a; return; }
      segs.push(but ? { de, a, etat, lieu: l, but } : { de, a, etat, lieu: l });
    };
    const nuit = x.lit || x.enMaison();
    pousse(0, x.lever, 'dormir', nuit);
    pousse(x.lever, x.sortie, 'lever', x.enMaison());
    const creneaux = (liste) => {
      for (const p of liste) {
        const a = x.plan.get(p.k) || { etat: 'repos', lieu: x.enMaison() };
        if (a.avant) {
          const fin = Math.min(p.y, p.x + Math.min(a.avant.duree, (p.y - p.x) / 3));
          pousse(p.x, fin, a.avant.etat, a.avant.lieu);
          pousse(fin, p.y, a.etat, a.lieu, a.but);
        } else pousse(p.x, p.y, a.etat, a.lieu, a.but);
      }
    };
    // un repas : un siège de sa table, sinon de la table commune ; sans siège, chez lui. I6b : le siège le plus près
    // d'un ami déjà assis (à égalité, le premier) : des amis mangent côte à côte
    const repas = (de, a, cle) => {
      const tables = [x.maison && x.maison.table, L.commune].filter(Boolean);
      for (const tb of tables) {
        const k = cle + ':' + tb.table, deja = assis.get(k) || [];
        const amis = deja.filter((o) => { const c = connaissance(state, x.v.id, o.id); return c && c.degre >= 2; }).map((o) => o.case);
        const pres = (t) => (amis.length ? Math.min(...amis.map((q) => Math.abs((q % L.W) - (t % L.W)) + Math.abs(Math.floor(q / L.W) - Math.floor(t / L.W)))) : 0);
        const libres = tb.sieges.filter((t) => !(pris.get(k) || new Set()).has(t));
        const s = [...libres].sort((p, q) => pres(p) - pres(q))[0];
        if (s !== undefined && prendre(k, s)) {
          if (!assis.has(k)) assis.set(k, []);
          assis.get(k).push({ id: x.v.id, case: s });
          pousse(de, a, 'repas', { genre: 'siege', case: s, table: tb.table, dehors: tb.dehors });
          return;
        }
      }
      pousse(de, a, 'repas', x.enMaison());
    };
    creneaux(x.matin);
    // (I6b : le repas apporté — il va le porter à la porte de son ami ; l'ami, chez lui, sort le recevoir)
    const ap = apportes.get(x.v.id);
    if (ap) {
      if (ap.avant) { const fin = Math.min(x.reprise, x.midi + ap.avant.duree); pousse(x.midi, fin, ap.avant.etat, ap.avant.lieu); pousse(fin, x.reprise, 'dehors', ap.lieu, ap.but); }
      else pousse(x.midi, x.reprise, 'dehors', ap.lieu, ap.but);
    } else repas(x.midi, x.reprise, 'midi');
    creneaux(x.apres);
    repas(x.souper, x.veillee, 'souper');
    // (I6b : la visite du soir, après le souper : il va chez un ami, qui sort à sa porte ; puis chacun rentre)
    const so = soirees.get(x.v.id);
    if (so) {
      const de = Math.max(x.veillee, so.de);
      pousse(x.veillee, de, 'rentrer', x.enMaison());
      if (so.avant) { const fin = Math.min(so.a, de + so.avant.duree); pousse(de, fin, so.avant.etat, so.avant.lieu); pousse(fin, so.a, 'dehors', so.lieu, so.but); }
      else pousse(de, so.a, 'dehors', so.lieu, so.but);
      pousse(so.a, x.coucher, 'rentrer', x.enMaison());
    } else pousse(x.veillee, x.coucher, 'rentrer', x.enMaison());
    pousse(x.coucher, 24, 'dormir', nuit);
    out.set(x.v.id, pluie ? sousLaPluie(segs, pluie, x.enMaison) : segs);
  }
  return out;
}

// Les créneaux de la grille commune entre `de` et `a` h : [{ k (son rang dans la grille), x, y, fl (la chance de
// flâner) }] ; un bout de moins de C / 3 h, au début ou à la fin, va au voisin.
function bornesCreneaux(de, a, C, fl) {
  const b = [];
  for (let k = Math.floor(de / C); k * C < a; k++) b.push({ k, x: Math.max(de, k * C), y: Math.min(a, (k + 1) * C), fl });
  if (b.length > 1 && b[0].y - b[0].x < C / 3) { b[1].x = b[0].x; b.shift(); }
  const z = b.length - 1;
  if (z > 0 && b[z].y - b[z].x < C / 3) { b[z - 1].y = b[z].y; b.pop(); }
  return b.filter((p) => p.y > p.x);
}

// I3c : les créneaux de travail de ceux qui travaillent aujourd'hui (voir plus haut). Pour chaque plage de
// TACHES.TRAVAIL, les créneaux dont le milieu y tombe, moins PAUSE tirés (jamais le premier) ; un poste tient POSTE
// créneaux de la grille commune (le même rang de poste pour tous à la même heure), les camarades d'une tâche se
// suivent sur les postes de celui qui a le plus petit id (des postes voisins). Remplit x.plan.
function planDuTravail(state, jour, gens, L, prendre, C) {
  const TT = DATA.TACHES || {}, plages = Array.isArray(TT.TRAVAIL) ? TT.TRAVAIL : [];
  if (!plages.length) return;
  const g = graineDe(state), N = Math.max(1, Number(TT.POSTE) || 2), pauses = Math.max(0, Number(TT.PAUSE) || 0);
  const parTache = new Map();
  for (const x of gens) {
    if (!x.v.tache || !travailleAujourdhui(state, x.v)) continue;
    let l = parTache.get(x.v.tache);
    if (!l) parTache.set(x.v.tache, (l = []));
    l.push(x);
  }
  for (const [tache, equipe] of parTache) {
    const def = tacheDef(tache), postes = postesDe(state, tache, equipe[0].v);
    if (!postes.length) continue;
    // (les créneaux de travail de chacun : k → le rang du poste)
    const travail = equipe.map((x) => {
      const ks = new Map();
      plages.forEach(([a, b], w) => {
        const l = [...x.parK.values()].filter((p) => (p.x + p.y) / 2 >= a && (p.x + p.y) / 2 < b).map((p) => p.k);
        const rnd = rngDe(`${g}:pause:${x.v.id}:${jour}:${w}`);
        const libres = new Set();
        for (let n = 0; n < pauses && l.length > 2; n++) libres.add(l[1 + Math.floor(rnd() * (l.length - 1))]);
        const k0 = Math.floor(a / C);
        for (const k of l) if (!libres.has(k)) ks.set(k, w * 1000 + Math.floor((k - k0) / N));
      });
      return ks;
    });
    const buts = new Map(), W = L.W;
    equipe.forEach((x, r) => {
      for (const [k, rang] of travail[r]) {
        // (son poste : au rang du poste, celui de l'équipe (le premier, tiré de la liste), puis, pour ses camarades,
        // les plus proches de lui (l'autre côté du même arbre, le rocher voisin) ; pris à ce créneau : le suivant)
        const ordre = ordreDesPostes(postes, rang, W);
        let p = null;
        for (let i = 0; i < ordre.length && !p; i++) if (prendre('c' + k, ordre[(r + i) % ordre.length].case)) p = ordre[(r + i) % ordre.length];
        if (!p) continue;
        const cle = `travail:${tache}:${rang}:${p.case}`;
        let but = buts.get(cle);
        // (le même but et le même lieu sur les créneaux d'un même poste : un seul segment)
        if (!but) {
          buts.set(cle, (but = { sorte: 'travail', tache, cle: `travail:${tache}:${rang}`, avec: [], geste: def.geste || 'ramasse', emoji: def.emoji || '', poste: p.case }));
          but.lieu = { genre: 'devant', case: p.case, vers: Number.isInteger(p.vers) ? p.vers : undefined, dedans: !!p.dedans, travail: true };
        }
        x.plan.set(k, { etat: 'travail', lieu: but.lieu, but });
      }
    });
    // (ses camarades : ceux de la même tâche, au même rang de poste, à 4 cases au plus)
    const pres = (a, b) => Math.max(Math.abs((a % W) - (b % W)), Math.abs(Math.floor(a / W) - Math.floor(b / W))) <= 4;
    const tous = [...buts.values()], qui = new Map();
    for (const x of equipe) for (const a of x.plan.values()) if (a.but && a.but.sorte === 'travail') qui.set(a.but, x.v.id);
    const groupes = tous.map((b) => tous.filter((o) => o.cle === b.cle && pres(o.poste, b.poste)).map((o) => qui.get(o)).filter(Boolean));
    tous.forEach((b, i) => {
      const ids = [...new Set(groupes[i])].sort();
      b.avec = ids.filter((id) => id !== qui.get(b));
      b.cle = `${b.cle}:${ids[0] || qui.get(b)}`;
    });
  }
}

// Les postes au rang `rang` (planDuTravail) : celui de l'équipe (un rang sur deux, le suivant de la liste), puis
// les autres, du plus proche au plus loin de lui.
function ordreDesPostes(postes, rang, W) {
  const n = postes.length, i0 = (((Math.floor(rang / 1000) * 5) + (rang % 1000)) * 2) % n, p0 = postes[i0].case;
  // (pas juste au-dessus ou au-dessous de lui : ils se cacheraient l'un l'autre)
  const d = (t) => { const dc = Math.abs((t % W) - (p0 % W)), dr = Math.abs(Math.floor(t / W) - Math.floor(p0 / W)); return Math.max(dc, dr) + (dc === 0 && dr <= 1 ? 3 : 0); };
  return postes.map((p, i) => [p, i === i0 ? -1 : d(p.case)]).sort((a, b) => a[1] - b[1]).map((e) => e[0]);
}

// Les créneaux dehors de tout le village (voir calculerJournee) : pour chaque créneau de la grille, dans l'ordre des
// heures, ceux qui sont dehors choisissent, dans un ordre tiré du créneau ; celui qu'un autre a déjà engagé (une
// visite, un rendez-vous) ne choisit pas. Remplit x.plan (k → { etat, lieu, but?, avant? }).
function planDesCreneaux(state, jour, gens, L, prendre) {
  const g = graineDe(state), B = SB(), poids = B.POIDS || {};
  const ks = [...new Set(gens.flatMap((x) => [...x.parK.keys()]))].sort((a, b) => a - b);
  const libreA = (x, k) => x.parK.has(k) && !x.plan.has(k) && !x.v.repos;
  const occupe = new Map();               // (k → Set des cases prises à ce créneau : les mêmes que `prendre`)
  const libreCase = (k, t) => Number.isInteger(t) && !(occupe.get(k) || new Set()).has(t);
  const tenir = (k, t) => { if (!prendre('c' + k, t)) return false; let s = occupe.get(k); if (!s) occupe.set(k, (s = new Set())); s.add(t); return true; };
  const emoji = (s) => ((B.EMOJI || {})[s]) || '';
  const lp = lieuPort(state), port = lp && Number.isInteger(lp.case) && Number(lp.chemin) <= (Number(B.PORT_MAX) || 0) ? lp.case : null;
  // (engager x au créneau k, et aux DUREE - 1 suivants si tous y sont libres, aux mêmes cases : le temps d'y aller
  // et d'y rester)
  const engager = (rnd, k, membres) => {
    for (const [x, a] of membres) x.plan.set(k, a);
    for (let k2 = k + 1; k2 < k + Math.max(1, Number(B.DUREE) || 1); k2++) {
      if (!membres.every(([x, a]) => libreA(x, k2) && libreCase(k2, a.lieu.case))) break;
      for (const [x, a] of membres) { tenir(k2, a.lieu.case); x.plan.set(k2, { etat: a.etat, lieu: a.lieu, but: a.but }); }
    }
  };
  // (la distance de deux maisons, en cases ; sans maison : loin)
  const ecart = (x, y) => (Number.isInteger(x.v.maison) && Number.isInteger(y.v.maison)
    ? Math.max(Math.abs((x.v.maison % L.W) - (y.v.maison % L.W)), Math.abs(Math.floor(x.v.maison / L.W) - Math.floor(y.v.maison / L.W))) : 30);
  for (const k of ks) {
    const r0 = rngDe(`${g}:creneau:${jour}:${k}`);
    const ordre = gens.filter((x) => x.parK.has(k)).map((x) => [r0(), x]).sort((a, b) => a[0] - b[0]).map((e) => e[1]);
    for (const x of ordre) {
      if (x.plan.has(k)) continue;
      const v = x.v, p = x.parK.get(k), rnd = rngDe(`${g}:but:${v.id}:${jour}:${k}`);
      if (v.repos) { x.plan.set(k, { etat: 'repos', lieu: x.enMaison() }); continue; }
      // (I6b : un enfant joue sur la place, sinon sur les chemins ou devant sa porte)
      if (v.enfant) {
        const P = L.place.length ? L.place : x.promenade;
        const q = P.length ? [P[Math.floor(rnd() * P.length)], ...P].find((t) => tenir(k, t)) : undefined;
        x.plan.set(k, q !== undefined ? { etat: 'dehors', lieu: { genre: 'place', case: q }, but: { sorte: 'jeu', cle: `jeu:${v.id}:${k}`, avec: [], emoji: emoji('jeu') } } : { etat: 'repos', lieu: x.enMaison() });
        continue;
      }
      // flâner : un banc libre (le sien pris : un autre), sinon la place
      if (rnd() < p.fl) {
        const banc = L.bancs.length ? L.bancs[Math.floor(rnd() * L.bancs.length)] : null;
        const b = banc !== null ? [banc, ...L.bancs].find((t) => tenir(k, t)) : undefined;
        if (b !== undefined) { x.plan.set(k, { etat: 'flaner', lieu: x.ici('siege', b) }); continue; }
        const q = L.place.length ? [L.place[Math.floor(rnd() * L.place.length)], ...L.place].find((t) => tenir(k, t)) : undefined;
        if (q !== undefined) { x.plan.set(k, { etat: 'flaner', lieu: x.ici('place', q) }); continue; }
      }
      // les amis libres à ce créneau (le degré, le score : connaissance)
      const amis = gens.filter((y) => y !== x && !y.v.enfant && libreA(y, k)).map((y) => [y, connaissance(state, v.id, y.v.id)]).filter(([, c]) => c && c.degre >= 1);
      // (au poids du score, et des voisins plutôt que ceux qui habitent loin ; celui qu'il vient de quitter, au
      // créneau d'avant, beaucoup moins : on varie)
      const avant = x.plan.get(k - 1), quitte = new Set(avant && avant.but ? avant.but.avec : []);
      const poidsDe = ([y, c]) => ((c.score + 1) / (1 + ecart(x, y) / 10)) * (quitte.has(y.v.id) ? 0.15 : 1);
      const tire = (l) => {
        const tot = l.reduce((s, e) => s + poidsDe(e), 0);
        let r = rnd() * tot;
        for (const e of l) { r -= poidsDe(e); if (r <= 0) return e; }
        return l[l.length - 1];
      };
      const essais = {
        visite: () => {
          const l = amis.filter(([y]) => y.maison && y.maison.devant && libreCase(k, y.maison.devant.front) && libreCase(k, y.maison.devant.cote));
          if (!l.length) return false;
          const [y] = tire(l), D = y.maison.devant;
          tenir(k, D.front); tenir(k, D.cote);
          const cle = `visite:${v.id}:${k}`;
          const dedans = Number.isInteger(D.dedans) ? { genre: 'maison', case: D.dedans } : y.enMaison();
          engager(rnd, k, [
            [x, { etat: 'dehors', lieu: { genre: 'devant', case: D.front, vers: D.porte }, but: { sorte: 'visite', cle, avec: [y.v.id], role: 'visiteur' } }],
            [y, { etat: 'dehors', lieu: { genre: 'devant', case: D.cote, vers: D.front }, but: { sorte: 'visite', cle, avec: [v.id], role: 'hote' }, avant: { etat: 'recoit', lieu: dedans, duree: Number(B.RECOIT) || 0.1 } }],
          ]);
          return true;
        },
        rdv: () => {
          const cs = L.cercles.filter((c) => [c.case, c.case - 1, c.case + 1, c.case + L.W].every((t) => libreCase(k, t)));
          if (!amis.length || !cs.length) return false;
          const c = cs[Math.floor(rnd() * cs.length)];
          const l = [...amis], avec = [tire(l)];
          if (l.length > 1 && rnd() < 0.5) { const reste = l.filter((e) => e !== avec[0]); avec.push(tire(reste)); }
          const qui = [x, ...avec.map(([y]) => y)], places = [c.case - 1, c.case + 1, c.case + L.W];
          tenir(k, c.case);
          const cle = `rdv:${v.id}:${k}`;
          engager(rnd, k, qui.map((y, i) => {
            tenir(k, places[i]);
            return [y, { etat: 'dehors', lieu: { genre: 'groupe', case: places[i], vers: c.case }, but: { sorte: 'rdv', cle, avec: qui.filter((z) => z !== y).map((z) => z.v.id), puits: c.puits } }];
          }));
          return true;
        },
        promenade: () => {
          const l = amis.filter(([, c]) => c.degre >= 2);
          if (!l.length || x.promenade.length < 2) return false;
          const P = x.promenade, i0 = Math.floor(rnd() * P.length);
          for (let i = 0; i < P.length; i++) {
            const t = P[(i0 + i) % P.length];
            const t2 = [t + 1, t - 1, t + L.W].find((q) => L.libre(q) && libreCase(k, q));
            if (t2 === undefined || !libreCase(k, t)) continue;
            const [y] = tire(l);
            tenir(k, t); tenir(k, t2);
            const cle = `promenade:${v.id}:${k}`;
            engager(rnd, k, [
              [x, { etat: 'dehors', lieu: { genre: 'devant', case: t, vers: t2 }, but: { sorte: 'promenade', cle, avec: [y.v.id], role: 'meneur', emoji: emoji('promenade') } }],
              [y, { etat: 'dehors', lieu: { genre: 'devant', case: t2, vers: t }, but: { sorte: 'promenade', cle, avec: [v.id], role: 'suit', emoji: emoji('promenade') } }],
            ]);
            return true;
          }
          return false;
        },
        // I6b : deux amis s'assoient côte à côte, sur deux bancs voisins
        banc: () => {
          const l = amis.filter(([, c]) => c.degre >= 2);
          const ds = (L.duos || []).filter(([a, b]) => libreCase(k, a) && libreCase(k, b));
          if (!l.length || !ds.length) return false;
          const [a, b] = ds[Math.floor(rnd() * ds.length)], [y] = tire(l);
          if (!tenir(k, a) || !tenir(k, b)) return false;
          const cle = `banc:${v.id}:${k}`;
          engager(rnd, k, [
            [x, { etat: 'flaner', lieu: { genre: 'siege', case: a }, but: { sorte: 'banc', cle, avec: [y.v.id], emoji: emoji('banc') } }],
            [y, { etat: 'flaner', lieu: { genre: 'siege', case: b }, but: { sorte: 'banc', cle, avec: [v.id] } }],
          ]);
          return true;
        },
        eau: () => {
          if (L.eau === null || !tenir(k, L.eau)) return false;
          x.plan.set(k, { etat: 'dehors', lieu: { genre: 'devant', case: L.eau, vers: L.puits }, but: { sorte: 'eau', cle: `eau:${v.id}:${k}`, avec: [], emoji: emoji('eau') } });
          return true;
        },
        voir: () => {
          const sortes = ['jardin', 'betes', 'ouvrage'].filter((s) => L.voir[s].some((q) => libreCase(k, q.case)));
          if (!sortes.length) return false;
          const s = sortes[Math.floor(rnd() * sortes.length)], l = L.voir[s].filter((q) => libreCase(k, q.case));
          const q = l[Math.floor(rnd() * l.length)];
          tenir(k, q.case);
          x.plan.set(k, { etat: 'dehors', lieu: { genre: 'devant', case: q.case, vers: q.vers }, but: { sorte: s, cle: `${s}:${v.id}:${k}`, avec: [], emoji: emoji(s) } });
          return true;
        },
        port: () => {
          if (port === null) return false;
          x.plan.set(k, { etat: 'dehors', lieu: { genre: 'devant', case: port }, but: { sorte: 'port', cle: `port:${v.id}:${k}`, avec: [], emoji: emoji('port') } });
          return true;
        },
      };
      // le tirage au poids ; un but qui ne trouve pas de lieu laisse la place au suivant
      const choix = Object.keys(essais).map((s) => [s, Math.max(0, Number(poids[s]) || 0)]).filter(([, w]) => w > 0);
      let fait = false;
      while (choix.length && !fait) {
        const tot = choix.reduce((s, [, w]) => s + w, 0);
        let r = rnd() * tot, i = 0;
        for (; i < choix.length - 1; i++) { r -= choix[i][1]; if (r <= 0) break; }
        fait = essais[choix[i][0]]();
        choix.splice(i, 1);
      }
      if (fait) continue;
      // à défaut : il va et vient (un point des chemins, de la place ou des abords de sa porte), sinon il reste chez lui
      const P = x.promenade;
      const q = P.length ? [P[Math.floor(rnd() * P.length)], ...P].find((t) => tenir(k, t)) : undefined;
      x.plan.set(k, q !== undefined ? { etat: 'dehors', lieu: x.ici('promenade', q) } : { etat: 'repos', lieu: x.enMaison() });
    }
  }
}

// I6b : les repas apportés aujourd'hui (liens.js entraidesDuJour : { de, a }) : Map(id → { lieu, but, avant? }). Celui
// qui apporte va devant la porte de son ami (tourné vers elle) au repas de midi ; l'ami, chez lui (il se repose),
// sort à côté de sa porte (après RECOIT h, « recoit »). Sans porte praticable, rien : chacun mange comme d'habitude.
function repasApportes(state, jour, gens, L) {
  const out = new Map(), B = SB(), parId = new Map(gens.map((x) => [x.v.id, x]));
  for (const e of entraidesDuJour(state, jour)) {
    const x = parId.get(e.de), y = parId.get(e.a);
    if (!x || !y || x.v.repos || out.has(x.v.id) || out.has(y.v.id)) continue;
    const D = y.maison && y.maison.devant;
    if (!D) continue;
    const cle = `apporte:${x.v.id}:${jour}`, emoji = (B.EMOJI || {}).apporte || '';
    const dedans = Number.isInteger(D.dedans) ? { genre: 'maison', case: D.dedans } : y.enMaison();
    out.set(x.v.id, { lieu: { genre: 'devant', case: D.front, vers: D.porte }, but: { sorte: 'visite', cle, avec: [y.v.id], role: 'visiteur', apporte: true, emoji } });
    out.set(y.v.id, { lieu: { genre: 'devant', case: D.cote, vers: D.front }, but: { sorte: 'visite', cle, avec: [x.v.id], role: 'hote', apporte: true }, avant: { etat: 'recoit', lieu: dedans, duree: Number(B.RECOIT) || 0.1 } });
  }
  return out;
}

// I6b : les visites du soir (LIENS.SOIR) : Map(id → { de, a, lieu, but, avant? }). Après le souper, chacun (dans un
// ordre tiré du jour), avec CHANCE, va voir un ami (le degré « ami » ou plus ; ni un enfant, ni sous son toit, ni au
// repos, ni déjà pris ce soir ; plutôt un voisin, plutôt le plus lié), MAX visites au plus : une par PAR villageois.
// Le visiteur devant la porte, l'hôte sort à côté (« recoit » RECOIT h d'abord) ; DUREE h, et chacun rentre avant de
// se coucher.
function visitesDuSoir(state, jour, gens, L) {
  const S = ((DATA.VILLAGE || {}).LIENS || {}).SOIR || {}, B = SB(), out = new Map();
  const chance = Number(S.CHANCE) || 0, max = Math.floor(gens.length / Math.max(1, Number(S.PAR) || 3)) || (gens.length >= 2 ? 1 : 0);
  if (!(chance > 0) || !max) return out;
  const rnd0 = rngDe(`${graineDe(state)}:soir:${jour}`);
  const ordre = gens.map((x) => [rnd0(), x]).sort((a, b) => a[0] - b[0]).map((e) => e[1]);
  const ecart = (x, y) => (Number.isInteger(x.v.maison) && Number.isInteger(y.v.maison)
    ? Math.max(Math.abs((x.v.maison % L.W) - (y.v.maison % L.W)), Math.abs(Math.floor(x.v.maison / L.W) - Math.floor(y.v.maison / L.W))) : 30);
  const libre = (x) => !x.v.repos && !x.v.enfant && !x.v.accueil && !out.has(x.v.id);
  let n = 0;
  for (const x of ordre) {
    if (n >= max) break;
    if (!libre(x) || !Number.isInteger(x.v.maison)) continue;
    const rnd = rngDe(`${graineDe(state)}:soir:${x.v.id}:${jour}`);
    if (rnd() >= chance) continue;
    const f = foyerDe(state, x.v.id);
    const amis = gens.filter((y) => y !== x && libre(y) && y.maison && y.maison.devant && y.v.maison !== x.v.maison && !(f && f.membres.includes(y.v.id)))
      .map((y) => [y, connaissance(state, x.v.id, y.v.id)]).filter(([, c]) => c && c.degre >= 2);
    if (!amis.length) continue;
    const poids = ([y, c]) => (c.score + 1) / (1 + ecart(x, y) / 10);
    const tot = amis.reduce((t, e) => t + poids(e), 0);
    let r = rnd() * tot, pris = amis[amis.length - 1];
    for (const e of amis) { r -= poids(e); if (r <= 0) { pris = e; break; } }
    const y = pris[0], D = y.maison.devant;
    const de = Math.max(x.veillee, y.veillee) + 0.05, a = Math.min(de + (Number(S.DUREE) || 1), Math.min(x.coucher, y.coucher) - 0.25);
    if (!(a > de + 0.25)) continue;
    const cle = `soir:${x.v.id}:${jour}`, emoji = (B.EMOJI || {}).soir || '';
    const dedans = Number.isInteger(D.dedans) ? { genre: 'maison', case: D.dedans } : y.enMaison();
    out.set(x.v.id, { de, a, lieu: { genre: 'devant', case: D.front, vers: D.porte }, but: { sorte: 'visite', cle, avec: [y.v.id], role: 'visiteur', soir: true, emoji } });
    out.set(y.v.id, { de, a, lieu: { genre: 'devant', case: D.cote, vers: D.front }, but: { sorte: 'visite', cle, avec: [x.v.id], role: 'hote', soir: true }, avant: { etat: 'recoit', lieu: dedans, duree: Number(B.RECOIT) || 0.1 } });
    n++;
  }
  return out;
}

// Sous la pluie (de p[0] à p[1] h) : ce qui se fait dehors (dehors, flâner, un repas à une table du dehors) devient
// « abri », chez lui ; les segments sont coupés aux heures de l'averse.
function sousLaPluie(segs, p, enMaison) {
  // (I3c : le travail dehors aussi ; à la cuisine, il reste à son poste)
  const dehors = (s) => s.etat === 'dehors' || s.etat === 'flaner' || (s.etat === 'repas' && s.lieu && s.lieu.dehors) || (s.etat === 'travail' && !(s.lieu && s.lieu.dedans));
  const out = [];
  let abri = null;
  for (const s of segs) {
    if (!dehors(s) || s.a <= p[0] || s.de >= p[1]) { out.push(s); continue; }
    if (s.de < p[0]) out.push({ ...s, a: p[0] });
    // (un seul lieu pour toute l'averse : il ne va pas d'une case de chez lui à l'autre)
    if (!abri) abri = enMaison();
    const de = Math.max(s.de, p[0]), a = Math.min(s.a, p[1]);
    const prec = out[out.length - 1];
    if (prec && prec.etat === 'abri' && Math.abs(prec.a - de) < 1e-9) prec.a = a; else out.push({ de, a, etat: 'abri', lieu: abri });
    if (s.a > p[1]) out.push({ ...s, de: p[1] });
  }
  return out;
}

// Où est le villageois `id` à l'heure `heure` (0 à 24, décimales comprises ; l'heure du jeu par défaut) du jour en
// cours : { etat, lieu, de, a } (le segment de sa journée), ou null.
export function positionVillageois(state, id, heure) {
  const segs = journeeDuVillage(state).get(id);
  if (!segs || !segs.length) return null;
  const h = ((Number(heure) % 24) + 24) % 24;
  return segs.find((s) => h >= s.de && h < s.a) || segs[segs.length - 1];
}

/* ---------- parler ---------- */

// Toucher un villageois (le pont de la carte) : sa bulle { prenom, salut, texte (ce qu'il fait), humeur (la clé),
// humeurTexte }, tirée de la graine, du jour, de son id et du rang de l'appui `n` ; `activite` : ce que la scène
// le voit faire (un état de ETATS_VILLAGEOIS ; sinon celui de son horaire) ; `but` (I3b+) : le but de sa sortie
// (BUTS_VILLAGEOIS), dehors. L'objectif du jour « parler » compte.
// null : pas de tel villageois.
export function paroleVillageois(state, id, o = {}) {
  const v = trouverVillageois(state, id);
  if (!v) return null;
  noterObjectif(state, 'parler');
  const heure = Number.isFinite(o.heure) ? o.heure : null;
  const etat = ETATS_VILLAGEOIS.includes(o.activite) ? o.activite : ((heure !== null && positionVillageois(state, id, heure)) || {}).etat || 'dehors';
  const rnd = rngDe(`${graineDe(state)}:parole:${v.id}:${jourDe(state)}:${Math.max(0, Math.floor(Number(o.n) || 0))}`);
  const un = (l) => (Array.isArray(l) && l.length ? l[Math.floor(rnd() * l.length)] : '');
  const h = heure === null ? 12 : heure, S = DATA.HABITANTS.PHRASES.salut || {};
  const salut = etat === 'dormir' ? '' : un((S[h < 10 ? 'matin' : h < 18 ? 'jour' : h < 22 ? 'soir' : 'nuit'] || []).filter((p) => !/hameau|chez nous|visite/i.test(p)));
  const humeur = humeurVillageois(v);
  // (I3b+ : au but d'une sortie, ce qu'il y fait : SOCIAL.ACTIVITE)
  const A = (DATA.VILLAGE.SOCIAL || {}).ACTIVITE || {};
  const but = (etat === 'dehors' || (etat === 'flaner' && o.but === 'banc')) && BUTS_VILLAGEOIS.includes(o.but) && A[o.but] ? o.but : null;
  // (I3c : au travail, une phrase de sa tâche ; sa tâche attend (un outil, un poste) : il le dit)
  const def = tacheDef(v.tache), manque = etat !== 'dormir' && etat !== 'repas' ? manqueDit(state, v) : '';
  const texte = etat === 'travail' && def ? un(def.PHRASES) : manque ? un((P().ACTIVITE || {}).attend).replace('{raison}', manque) : un(but ? A[but] : (P().ACTIVITE || {})[etat]);
  return {
    id: v.id, prenom: v.prenom, genre: v.genre, etat, but, salut, texte, tache: def ? v.tache : null,
    humeur, humeurTexte: etat === 'dormir' ? '' : un((P().HUMEUR || {})[humeur]),
  };
}

// Pour la scène : la journée de chacun, aujourd'hui ({ [id]: segments }), et les lieux qu'elle doit connaître ;
// null le chantier éteint ou sans villageois.
export function journeesPourLaCarte(state) {
  if (!villageActif(state) || !villageoisDe(state).length) return null;
  const J = journeeDuVillage(state), out = {};
  for (const [id, segs] of J) out[id] = segs;
  return out;
}
