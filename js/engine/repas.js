import { DATA } from './catalog.js';
import { floorPercent } from './base.js';
import { fail } from './devices.js';
import { awakeMsAtHour } from './clock.js';
import { weekdayIndex } from './format.js';
import { addItem, countItem, keepLots, lotList, lotRank, lotsOf, pullLots, pushLots } from './inventory.js';
import { mainCharacter } from './depart.js';
import { dishHappiness, memberHappiness, setHappiness } from './ville.js';
import { noter } from './journal.js';

/* ---------- la boîte à nourriture et la faim de la famille (FAMILLE.FAIM) ---------- */

// Chaque membre de la famille, sauf le personnage principal (qui a son énergie, stamina.js), a
// une jauge m.energie de 0 à FAIM.MAX. Elle baisse quand il marche sur la carte (marcherMembre)
// ou qu'il aide (depenserMembre) ; arrivée à FAIM.SEUIL, il mange jusqu'à MAX (repasStep) :
// au réfrigérateur s'il est construit, sinon dans la boîte à nourriture posée dans le foyer.
// Ce que la famille mange dans la journée s'additionne dans state.repasJour, que la nuit
// recopie dans son compte rendu (feedFamily) : autonomie, bonheur des plats, réveil.

const F = () => DATA.FAMILLE.FAIM;
const B = () => DATA.ATELIER.BOITE;

// Ce que rend un aliment, à la famille comme au personnage : son énergie ÷ MANGER_DIVISEUR,
// + MANGER_BONUS %, arrondie au-dessus. 0 pour ce qui ne se mange pas.
export function valeurAliment(item) {
  const def = DATA.OBJETS[item];
  if (!def || !def.mangeable) return 0;
  const P = DATA.PERSONNAGE;
  return Math.ceil((def.energie * (100 + P.MANGER_BONUS)) / (P.MANGER_DIVISEUR * 100));
}

/* -- les jauges -- */

// Jauge d'un membre (MAX tant qu'il n'a rien dépensé).
export function jaugeMembre(m) {
  return m && typeof m.energie === 'number' && Number.isFinite(m.energie) ? m.energie : F().MAX;
}

function setJauge(m, v) {
  m.energie = Math.max(0, Math.min(F().MAX, Math.round(v * 100) / 100));
}

// Les membres qui mangent à la boîte : tous sauf le personnage principal.
export function mangeurs(state) {
  const p = mainCharacter(state);
  return ((state.famille && state.famille.membres) || []).filter((m) => m !== p);
}

// Jauge moyenne de ces membres (en %, entière) ; 100 sans eux.
export function jaugeFamille(state) {
  const m = mangeurs(state);
  return m.length ? Math.floor(m.reduce((t, x) => t + jaugeMembre(x), 0) / m.length) : 100;
}

function membre(state, id) {
  return mangeurs(state).find((m) => m.id === id) || null;
}

// Le membre `id` dépense `points` de sa jauge (une aide, par exemple).
export function depenserMembre(state, id, points) {
  const m = membre(state, id);
  if (!m || !(points > 0)) return 0;
  setJauge(m, jaugeMembre(m) - points);
  return jaugeMembre(m);
}

// Le membre `id` a marché `px` pixels sur la carte : 1 point tous les PX_PAR_POINT pixels.
export function marcherMembre(state, id, px) {
  return depenserMembre(state, id, (Number(px) || 0) / F().PX_PAR_POINT);
}

/* -- la boîte -- */

export function boiteItems(state) {
  if (!state.boite || typeof state.boite !== 'object') state.boite = { items: {} };
  if (!state.boite.items || typeof state.boite.items !== 'object') state.boite.items = {};
  return state.boite.items;
}

export function boiteCount(state, item) {
  return lotList(boiteItems(state), item).reduce((t, l) => t + l.qty, 0);
}

// Ce que contient la boîte : { item: quantité }.
export function boiteCounts(state) {
  const out = {};
  for (const item of Object.keys(boiteItems(state))) {
    const n = boiteCount(state, item);
    if (n > 0) out[item] = n;
  }
  return out;
}

// La boîte est-elle posée sur la carte ?
export function boitePosee(state) {
  return Object.values(state.blocs || {}).includes('boite_nourriture');
}

// Combien d'unités de `item` peuvent encore entrer dans la boîte (PLATS aliments différents,
// QUANTITE de chacun).
export function placeBoite(state, item) {
  const def = DATA.OBJETS[item];
  if (!def || !def.mangeable) return 0;
  const counts = boiteCounts(state);
  if (!counts[item] && Object.keys(counts).length >= B().PLATS) return 0;
  return Math.max(0, B().QUANTITE - (counts[item] || 0));
}

// Met `qty` unités de `item` de l'inventaire dans la boîte (les plus anciennes d'abord).
export function deposerBoite(state, item, qty = 1) {
  const def = DATA.OBJETS[item];
  if (!def || !def.mangeable) return fail('Seuls les aliments vont dans la boîte.');
  if (state.frigo && state.frigo.construit) return fail('La famille mange au réfrigérateur.');
  if (!countItem(state, item)) return fail(`Plus de ${def.nom.toLowerCase()} dans l'inventaire.`);
  const place = placeBoite(state, item);
  if (!place) return fail(boiteCount(state, item) ? `La boîte a déjà ${B().QUANTITE} ${def.nom.toLowerCase()}.` : `La boîte a déjà ${B().PLATS} aliments différents.`);
  const n = Math.min(place, countItem(state, item), Math.max(1, Math.floor(Number(qty) || 1)));
  const inv = lotsOf(state, item);
  const pulled = pullLots(inv, n);
  keepLots(state.inventaire, item, inv);
  const lots = lotList(boiteItems(state), item);
  pushLots(lots, pulled);
  boiteItems(state)[item] = lots;
  return { ok: true, moved: n };
}

// Reprend `qty` unités de `item` de la boîte dans l'inventaire.
export function reprendreBoite(state, item, qty = 1) {
  const n = Math.min(boiteCount(state, item), Math.max(1, Math.floor(Number(qty) || 1)));
  if (!(n > 0)) return fail('Il n\'y en a pas dans la boîte.');
  const lots = lotList(boiteItems(state), item);
  const pulled = pullLots(lots, n);
  keepLots(boiteItems(state), item, lots);
  const inv = lotsOf(state, item);
  pushLots(inv, pulled);
  state.inventaire[item] = inv;
  return { ok: true, moved: n };
}

// Tout le contenu de la boîte revient dans l'inventaire (la boîte reprise, le frigo construit).
export function viderBoite(state) {
  const counts = boiteCounts(state);
  for (const [item, n] of Object.entries(counts)) reprendreBoite(state, item, n);
  return counts;
}

// Le réfrigérateur construit : la boîte posée et son contenu reviennent dans l'inventaire.
export function rangerBoite(state) {
  const contenu = viderBoite(state);
  let boite = false;
  for (const [tile, sorte] of Object.entries(state.blocs || {})) {
    if (sorte !== 'boite_nourriture') continue;
    delete state.blocs[tile];
    addItem(state, 'boite_nourriture', 1);
    boite = true;
  }
  return { contenu, boite };
}

/* -- les repas -- */

// Où la famille mange : 'frigo' (le réfrigérateur construit), 'boite' (la boîte posée), ou
// null (rien où manger).
export function sourceRepas(state) {
  if (state.frigo && state.frigo.construit) return 'frigo';
  return boitePosee(state) ? 'boite' : null;
}

function rangement(state, source) {
  if (source === 'frigo') return state.frigo.items || (state.frigo.items = {});
  if (source === 'boite') return boiteItems(state);
  return null;
}

// Le prochain aliment d'un rangement : ce qui périme le plus tôt, puis le plat qui rend le
// plus de bonheur, puis ce qui rend le plus.
function prochainAliment(store) {
  let best = null;
  for (const item of Object.keys(store)) {
    const def = DATA.OBJETS[item];
    const lots = lotList(store, item);
    if (!def || !def.mangeable || lots.reduce((t, l) => t + l.qty, 0) <= 0) continue;
    const cle = [lotRank(lots[0]), -dishHappiness(item), -valeurAliment(item)];
    if (!best || cle[0] < best.cle[0] || (cle[0] === best.cle[0] && (cle[1] < best.cle[1] || (cle[1] === best.cle[1] && cle[2] < best.cle[2])))) best = { item, cle };
  }
  return best && best.item;
}

// Ce que la famille a mangé aujourd'hui : { mange: { item: n }, energie, produit } (points
// rendus, dont ceux d'aliments produits à la ferme), et les étapes du jour faites.
export function repasJour(state) {
  if (!state.repasJour || typeof state.repasJour !== 'object') state.repasJour = { mange: {}, energie: 0, produit: 0 };
  return state.repasJour;
}

// Le membre `m` mange jusqu'à `cible` (MAX par défaut), tant qu'il y a de quoi.
// Renvoie { ok, mange: { item: n }, energie }.
export function mangerMembre(state, m, cible = F().MAX) {
  const source = sourceRepas(state);
  const store = rangement(state, source);
  const mange = {};
  let e = jaugeMembre(m);
  while (store && e < cible) {
    const item = prochainAliment(store);
    if (!item) break;
    const lots = lotList(store, item);
    const [p] = pullLots(lots, 1);
    keepLots(store, item, lots);
    const v = valeurAliment(item);
    e = Math.min(F().MAX, e + v);
    mange[item] = (mange[item] || 0) + 1;
    const R = repasJour(state);
    R.mange[item] = (R.mange[item] || 0) + 1;
    R.energie += v;
    if (p && p.origin === DATA.ORIGINE.PRODUIT) R.produit += v;
  }
  setJauge(m, e);
  const ok = Object.keys(mange).length > 0;
  if (ok) noter('repasMembre', { id: m.id, mange, source });
  return { ok, mange, energie: jaugeMembre(m), source };
}

// Les jours d'école, les enfants rentrent à ECOLE.RETOUR_H h avec au plus ECOLE.NIVEAU points.
function retourEcole(state) {
  const E = F().ECOLE;
  const R = repasJour(state);
  if (R.ecole || !E.JOURS.includes(weekdayIndex(state.day)) || state.awakeMs < awakeMsAtHour(E.RETOUR_H)) return;
  R.ecole = true;
  for (const m of mangeurs(state)) if (m.enfant) setJauge(m, Math.min(jaugeMembre(m), E.NIVEAU));
}

// Un pas de la journée : le retour de l'école, puis chaque membre arrivé à SEUIL va manger ;
// s'il n'y a rien, il a faim (m.affame : il perdra du bonheur la nuit).
export function repasStep(state) {
  if (!state.famille) return;
  retourEcole(state);
  for (const m of mangeurs(state)) {
    if (jaugeMembre(m) > F().SEUIL) continue;
    mangerMembre(state, m);
    if (jaugeMembre(m) <= F().SEUIL && !m.affame) {
      m.affame = true;
      noter('faim', { id: m.id, source: sourceRepas(state) });
    }
  }
}

// Au coucher, les enfants mangent jusqu'à MAX (une fois par jour).
export function repasCoucher(state) {
  const R = repasJour(state);
  if (R.coucher) return;
  R.coucher = true;
  for (const m of mangeurs(state)) if (m.enfant) mangerMembre(state, m);
}

// Ceux qui ont eu faim aujourd'hui (leurs id).
export function affames(state) {
  return mangeurs(state).filter((m) => m.affame).map((m) => m.id);
}

// Le bonheur de la nuit : DECLIN pour tous, plus le bonheur des plats différents mangés dans
// la journée (au plus PLATS_MAX, les meilleurs) ; FAIM en plus pour qui a eu faim. Renvoie la
// variation commune (sans la faim).
export function bonheurRepas(state, mange) {
  const H = DATA.VILLE.BONHEUR;
  const plats = Object.keys(mange || {})
    .filter((item) => (mange[item] || 0) > 0)
    .map(dishHappiness)
    .filter((v) => v > 0)
    .sort((a, b) => b - a)
    .slice(0, H.PLATS_MAX);
  const delta = H.DECLIN + plats.reduce((t, v) => t + v, 0);
  for (const m of state.famille.membres) setHappiness(m, memberHappiness(m) + delta + (m.affame ? H.FAIM : 0));
  return delta;
}

// Autonomie du jour en cours (en %) : la part des points mangés qui vient de la ferme ;
// `defaut` si la famille n'a encore rien mangé.
export function autonomieJour(state, defaut = 0) {
  const R = repasJour(state);
  return R.energie > 0 ? floorPercent(R.produit, R.energie) : defaut;
}
