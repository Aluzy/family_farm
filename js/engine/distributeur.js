import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { farmTerrain } from './terrain.js';
import { countWithSilo, feedHensFrom, hensToFeed, storeWithSilo, takeWithSilo } from './animals.js';
import { casesCouvertes, etatPoulailler } from './blocs.js';
import { hourOfDay, nightActive } from './clock.js';

/* ---------- le distributeur de grain du Poulailler ----------
   Trois blocs posés côte à côte sur une rangée, dans l'enclos du Poulailler, de gauche à droite :
   un entonnoir (celui de la botteleuse, DATA.ATELIER.BLOCS.entonnoir), le distributeur, puis la
   mangeoire à grain (2 cases de large). Le joueur y jette le blé (l'inventaire, puis le Silo) par
   l'entonnoir, comme les fibres dans la botteleuse (verserGrain) ; le distributeur en garde au
   plus DISTRIBUTEUR.CAPACITE. Chaque jour à partir de DISTRIBUTEUR.HEURE h, et jusqu'au soir, il
   nourrit les poules qui ne le sont pas encore (distribuerGrain), avec les mêmes rations qu'à la
   main (animals.js, feedHensFrom). Repris, son blé revient (distributeurReprise).
   state.distributeurs = { [case du distributeur]: { grain } }. */

const D = () => DATA.DISTRIBUTEUR;
const piece = (sorte) => (DATA.ATELIER.BLOCS[sorte] || {}).distributeur || null;
const entonnoir = (sorte) => (DATA.ATELIER.BLOCS[sorte] || {}).botteleuse === 'entonnoir';

function etats(state) {
  if (!state.distributeurs || typeof state.distributeurs !== 'object') state.distributeurs = {};
  return state.distributeurs;
}

// Le blé dans le distributeur de `tile` (0 à CAPACITE).
export function grainDans(state, tile) {
  const e = state.distributeurs && state.distributeurs[tile];
  return e ? Math.max(0, Math.min(D().CAPACITE, e.grain | 0)) : 0;
}

// Le distributeur dont `tile` est une pièce (l'entonnoir : la case à sa droite ; la mangeoire,
// ou sa deuxième case : la case à sa gauche), ou null.
export function distributeurDe(state, tile) {
  const blocs = state.blocs || {}, W = farmTerrain(state).LARGEUR;
  const couvre = casesCouvertes(state).get(tile);
  if (couvre !== undefined && piece(blocs[couvre]) === 'mangeoire') tile = couvre;
  const p = piece(blocs[tile]);
  if (p === 'machine') return tile;
  if (p === 'mangeoire') return tile % W > 0 && piece(blocs[tile - 1]) === 'machine' ? tile - 1 : null;
  if (entonnoir(blocs[tile])) return tile % W < W - 1 && piece(blocs[tile + 1]) === 'machine' ? tile + 1 : null;
  return null;
}

// Le distributeur de `tile` : { case, entonnoir, mangeoire, cases (ses quatre cases), grain,
// capacite, plein, ok, raison }. ok : raccordé (l'entonnoir à gauche, la mangeoire à droite) et
// tout entier dans l'enclos du Poulailler.
export function etatDistributeur(state, tile) {
  const blocs = state.blocs || {}, W = farmTerrain(state).LARGEUR, c = tile % W;
  const out = { case: tile, entonnoir: tile - 1, mangeoire: tile + 1, cases: [tile - 1, tile, tile + 1, tile + 2], grain: grainDans(state, tile), capacite: D().CAPACITE };
  out.plein = out.grain >= out.capacite;
  const enclos = new Set(etatPoulailler(state).enclos || []);
  if (c < 1 || !entonnoir(blocs[tile - 1])) out.raison = 'Pose un entonnoir juste à gauche du distributeur.';
  else if (c + 2 >= W || piece(blocs[tile + 1]) !== 'mangeoire') out.raison = 'Pose la mangeoire à grain juste à droite du distributeur.';
  else if (!out.cases.every((t) => enclos.has(t))) out.raison = 'Le distributeur, son entonnoir et sa mangeoire se posent dans l\'enclos du Poulailler (son enclos de barrières).';
  out.ok = !out.raison;
  return out;
}

// Les distributeurs de la ferme (un par distributeur posé).
export function distributeurs(state) {
  const blocs = state.blocs || {};
  return Object.keys(blocs).filter((t) => piece(blocs[t]) === 'machine').map((t) => etatDistributeur(state, Number(t)));
}

// Le joueur jette du blé dans l'entonnoir du distributeur dont `tile` est une pièce : autant qu'il
// en a (l'inventaire, puis le Silo), jusqu'à ce que le distributeur soit plein.
// { ok, case, versees, grain, plein }.
export function verserGrain(state, tile) {
  const m = distributeurDe(state, tile);
  if (m === null) return fail('Ce n\'est pas un distributeur de grain.');
  const e = etatDistributeur(state, m);
  if (!e.ok) return fail(e.raison);
  if (e.plein) return fail(`Le distributeur est plein (${e.capacite} ${DATA.OBJETS[DATA.SILO.ITEM].nom.toLowerCase()}).`);
  const a = countWithSilo(state, DATA.SILO.ITEM);
  if (a < 1) return fail('Il te faut du blé : récolte-le au champ, ou achète-le au Marché.');
  const n = Math.min(a, e.capacite - e.grain);
  if (!takeWithSilo(state, DATA.SILO.ITEM, n)) return fail('Il te faut du blé.');
  etats(state)[m] = { grain: e.grain + n };
  const grain = grainDans(state, m);
  return { ok: true, case: m, versees: n, grain, plein: grain >= e.capacite };
}

// Chaque jour, de DISTRIBUTEUR.HEURE h jusqu'au soir : les poules pas encore nourries le sont
// avec le blé des distributeurs raccordés (le Poulailler bâti). Appelée à chaque pas d'horloge
// (energy.js, farmStep). Renvoie le nombre de poules nourries (0 : rien à faire).
export function distribuerGrain(state) {
  if (!state.poulailler || !state.poulailler.construit || hensToFeed(state) <= 0) return 0;
  if (!state.distributeurs || nightActive(state)) return 0;
  const h = hourOfDay(state);
  if (h < D().HEURE || h >= DATA.TEMPS.HEURE_NUIT) return 0;
  let n = 0;
  for (const e of distributeurs(state)) {
    if (!e.ok || (e.grain < 1 && !(state.poulailler.restes > 0))) continue;
    const etat = etats(state)[e.case] || (etats(state)[e.case] = { grain: 0 });
    n += feedHensFrom(state, { total: () => grainDans(state, e.case), prendre: (k) => { etat.grain = Math.max(0, (etat.grain | 0) - k); } });
    if (hensToFeed(state) <= 0) break;
  }
  if (n) state.distribution = { jour: state.day, nourries: ((state.distribution && state.distribution.jour === state.day && state.distribution.nourries) || 0) + n };
  return n;
}

// Le distributeur de `tile` est repris : son blé revient (le Silo d'abord).
export function distributeurReprise(state, tile) {
  const g = grainDans(state, tile);
  if (g > 0) storeWithSilo(state, DATA.SILO.ITEM, g);
  if (state.distributeurs) delete state.distributeurs[tile];
}
