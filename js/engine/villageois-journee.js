import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { hache } from './ferme-generee.js';
import { farmSeed, farmTerrain } from './terrain.js';
import { villageActif } from './village.js';
import { blocsPoses, casesCouvertes, maisonsMarquees, piecesCloses, solsPoses } from './blocs.js';
import { meteoDuJour } from './meteo.js';
import { noterObjectif } from './objectifs-compte.js';
import { humeurVillageois, trouverVillageois, villageoisDe } from './villageois.js';

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
   a une), 'place', 'promenade'. Jamais une case de mur (le test : tests/engine/village-journee.test.mjs). */

const H = () => (DATA.VILLAGE && DATA.VILLAGE.HORAIRE) || {};
const P = () => (DATA.VILLAGE && DATA.VILLAGE.PHRASES) || {};
const SIEGES = new Set(['chaise_jardin', 'banc_jardin', 'meuble_chaise', 'banc_rondins', 'chaise_peinte', 'banc_pierre']);
const TABLES_DEHORS = new Set(['table_jardin', 'table_rondins']);
const TABLES = new Set([...TABLES_DEHORS, 'meuble_table']);
export const ETATS_VILLAGEOIS = ['lever', 'dehors', 'repas', 'flaner', 'rentrer', 'dormir', 'repos', 'abri'];

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
  return { W, libre, maisons, commune, bancs, place, promenade, chemins, abri: abri && abri.length ? abri : null, F };
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
// table? } }]), les segments de 0 à 24 h, dans l'ordre. Les villageois sont faits dans l'ordre de leur id : un siège
// pris par l'un (un repas, un créneau) ne l'est pas par un autre. Gardée tant que la partie et le jour ne changent
// pas (ni l'horaire). Vide le chantier éteint.
export function journeeDuVillage(state, jour = jourDe(state)) {
  const V = villageoisDe(state);
  if (!V.length) return new Map();
  const L = lieuxDuVillage(state);
  const cle = JSON.stringify([graineDe(state), jour, H(), V.map((v) => [v.id, v.maison, v.lit, !!v.repos, v.accueil || 0])]);
  const deja = memoJours.get(cle);
  if (deja && deja.L === L) return deja.J;
  const J = calculerJournee(state, jour, V, L);
  memoJours.clear();
  memoJours.set(cle, { L, J });
  return J;
}

function calculerJournee(state, jour, V, L) {
  const h = H(), C = Math.max(0.25, Number(h.CRENEAU) || 0.75), g = graineDe(state);
  const meteo = meteoDuJour(state, jour);
  const pluie = meteo.sorte === 'pluie' ? [meteo.debut, meteo.fin] : null;
  const pris = new Map();                 // (créneau ou repas → Set des sièges, cases pris)
  const prendre = (k, t) => { let s = pris.get(k); if (!s) pris.set(k, (s = new Set())); if (s.has(t)) return false; s.add(t); return true; };
  const out = new Map();
  const tries = [...V].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const v of tries) {
    const rnd = rngDe(`${g}:vie:${v.id}:${jour}`), un = (l) => l[Math.floor(rnd() * l.length)];
    const d = rnd() * (Number(h.DECALE) || 0);
    const maison = v.maison !== null && v.maison !== undefined ? L.maisons.get(v.maison) || null : null;
    const chez = maison && maison.cases.length ? maison.cases : L.abri;
    // (une case de chez lui, tirée ; sans maison ni abri : la place, ou rien)
    const caseChez = (r) => (chez && chez.length ? chez[Math.floor(r * chez.length)] : L.place.length ? L.place[Math.floor(r * L.place.length)] : null);
    const ici = (genre, t) => (t === null || t === undefined ? null : { genre, case: t });
    const lit = Number.isInteger(v.lit) && maison ? { genre: 'lit', case: v.lit } : null;
    const enMaison = () => ici(maison && maison.cases.length ? 'maison' : 'abri', caseChez(rnd()));
    const promenade = L.promenade.length ? L.promenade : abords(L, maison ? maison.porte : L.abri ? L.abri[0] : null);
    const segs = [];
    const pousse = (de, a, etat, lieu) => { if (a > de + 1e-9) segs.push({ de, a, etat, lieu: lieu || enMaison() }); };
    const lever = h.LEVER + d, sortie = h.SORTIE + d, midi = h.MIDI + d / 2, reprise = h.REPRISE + d / 2;
    const souper = h.SOUPER + d / 2, veillee = h.VEILLEE + d, coucher = Math.min(h.COUCHER + d / 2, DATA.TEMPS.HEURE_NUIT - 0.25);
    const nuit = lit || enMaison();
    pousse(0, lever, 'dormir', nuit);
    pousse(lever, sortie, 'lever', enMaison());
    // les créneaux entre deux repas : dehors, flâner, ou se reposer chez lui
    const creneaux = (de, a, flaner) => {
      // (les créneaux de la grille commune ; un bout de moins de C / 3 h, au début ou à la fin, va au voisin)
      const bornes = [];
      for (let k = Math.floor(de / C); k * C < a; k++) bornes.push([k, Math.max(de, k * C), Math.min(a, (k + 1) * C)]);
      if (bornes.length > 1 && bornes[0][2] - bornes[0][1] < C / 3) { bornes[1][1] = bornes[0][1]; bornes.shift(); }
      const z = bornes.length - 1;
      if (z > 0 && bornes[z][2] - bornes[z][1] < C / 3) { bornes[z - 1][2] = bornes[z][2]; bornes.pop(); }
      for (const [k, x, y] of bornes) {
        const r = rnd();
        if (y <= x) continue;
        if (v.repos) { pousse(x, y, 'repos', enMaison()); continue; }
        if (r < flaner) {
          const banc = L.bancs.length ? L.bancs[Math.floor(rnd() * L.bancs.length)] : null;
          // (son banc pris : un autre libre, sinon la place)
          const b = banc !== null ? [banc, ...L.bancs].find((t) => prendre('c' + k, t)) : undefined;
          if (b !== undefined) { pousse(x, y, 'flaner', ici('siege', b)); continue; }
          const p = L.place.length ? [un(L.place), ...L.place].find((t) => prendre('c' + k, t)) : undefined;
          if (p !== undefined) { pousse(x, y, 'flaner', ici('place', p)); continue; }
        }
        const q = promenade.length ? [un(promenade), ...promenade].find((t) => prendre('c' + k, t)) : undefined;
        pousse(x, y, q !== undefined ? 'dehors' : 'repos', q !== undefined ? ici('promenade', q) : enMaison());
      }
    };
    // un repas : un siège de sa table, sinon de la table commune ; sans siège, chez lui
    const repas = (de, a, cle) => {
      const tables = [maison && maison.table, L.commune].filter(Boolean);
      for (const tb of tables) {
        const s = tb.sieges.find((t) => prendre(cle + ':' + tb.table, t));
        if (s !== undefined) { pousse(de, a, 'repas', { genre: 'siege', case: s, table: tb.table, dehors: tb.dehors }); return; }
      }
      pousse(de, a, 'repas', enMaison());
    };
    creneaux(sortie, midi, Number((h.FLANER || [])[0]) || 0);
    repas(midi, reprise, 'midi');
    creneaux(reprise, souper, Number((h.FLANER || [])[1]) || 0);
    repas(souper, veillee, 'souper');
    pousse(veillee, coucher, 'rentrer', enMaison());
    pousse(coucher, 24, 'dormir', nuit);
    out.set(v.id, pluie ? sousLaPluie(segs, pluie, enMaison) : segs);
  }
  return out;
}

// Sous la pluie (de p[0] à p[1] h) : ce qui se fait dehors (dehors, flâner, un repas à une table du dehors) devient
// « abri », chez lui ; les segments sont coupés aux heures de l'averse.
function sousLaPluie(segs, p, enMaison) {
  const dehors = (s) => s.etat === 'dehors' || s.etat === 'flaner' || (s.etat === 'repas' && s.lieu && s.lieu.dehors);
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
// le voit faire (un état de ETATS_VILLAGEOIS ; sinon celui de son horaire). L'objectif du jour « parler » compte.
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
  return {
    id: v.id, prenom: v.prenom, genre: v.genre, etat, salut, texte: un((P().ACTIVITE || {})[etat]),
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
