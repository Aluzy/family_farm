import { DATA } from './catalog.js';
import { mulberry32 } from './base.js';
import { fail } from './devices.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { gainActionXp } from './levels.js';
import { canAfford, spendEnergy, TIRED } from './stamina.js';
import { hasHoe, plotAtTile } from './crops.js';
import { farmSeed, farmTerrain, tileCount } from './terrain.js';

/* ---------- la ferme générée : ramasser à la main, l'Atelier ---------- */

// docs/carte-generee.md, étape 3. Sur la ferme générée seulement (une partie avec une graine :
// farmSeed) :
//   - chaque matin, des petites pierres, des morceaux de bois et des herbes sont posés sur
//     l'herbe de la carte (DATA.ATELIER.RAMASSAGE : combien de chaque), à des places tirées
//     d'après la graine et le jour ; le personnage les ramasse à la main (geste « ramasser »),
//     chacun donne son objet (pierre, bois, fibre). state.cueillette = { jour, pris: [ids] } :
//     ceux déjà ramassés aujourd'hui ;
//   - l'Atelier se construit avec des matériaux (ATELIER.CONSTRUCTION), sans pièces
//     (state.atelier = { construit, niveau }) ; ses recettes (ATELIER.RECETTES) transforment des
//     objets de l'inventaire (geste « fabriquer ») : planche, mur en pierre, porte, paillasse, et
//     les outils de pierre (houe, hache, pioche : comme achetés au Marché).

// L'Atelier et le ramassage existent-ils dans cette partie ? (la ferme générée)
export function atelierOuvert(state) {
  return farmSeed(state) !== null;
}

export function atelierConstruit(state) {
  return !!(state.atelier && state.atelier.construit);
}

/* ---------- ramasser à la main ---------- */

// Un nombre de 32 bits d'après une chaîne (FNV-1a).
function hache(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

// Les tuiles d'herbe labourable (« # ») du terrain T, une fois par terrain.
const herbesDe = new WeakMap();
function herbes(T) {
  if (!herbesDe.has(T)) {
    const out = [], n = tileCount(T);
    for (let t = 0; t < n; t++) if (T.LIGNES[Math.floor(t / T.LARGEUR)][t % T.LARGEUR] === '#') out.push(t);
    herbesDe.set(T, out);
  }
  return herbesDe.get(T);
}

// Les places du jour `jour` : [{ id, sorte, objet, case }] (id : « sorte:case »), toutes les
// sortes tirées dans la même suite, sans deux sur la même tuile. Gardées pour le dernier jour.
let placesCle = null, placesListe = [];
function placesDuJour(state, jour) {
  const graine = farmSeed(state), cle = graine + ':' + jour;
  if (cle === placesCle) return placesListe;
  const T = farmTerrain(state), libres = herbes(T), r = mulberry32(hache(graine + ':ramassage:' + jour));
  const prises = new Set(), out = [];
  for (const [sorte, def] of Object.entries(DATA.ATELIER.RAMASSAGE)) {
    for (let k = 0, essais = 0; k < def.nombre && essais < def.nombre * 20 && prises.size < libres.length; essais++) {
      const t = libres[Math.floor(r() * libres.length)];
      if (prises.has(t)) continue;
      prises.add(t);
      out.push({ id: sorte + ':' + t, sorte, objet: def.objet, case: t });
      k++;
    }
  }
  placesCle = cle;
  placesListe = out;
  return out;
}

function cueillette(state) {
  if (!state.cueillette || state.cueillette.jour !== state.day) state.cueillette = { jour: state.day, pris: [] };
  return state.cueillette;
}

// Ce qu'il y a à ramasser sur la carte aujourd'hui (pas encore pris, pas sous une terre
// labourée, pas sous un bloc posé) : [{ id, sorte, objet, case }]. Rien hors de la ferme générée.
export function ramassables(state) {
  if (!atelierOuvert(state)) return [];
  const pris = state.cueillette && state.cueillette.jour === state.day ? state.cueillette.pris : [];
  return placesDuJour(state, state.day).filter((p) => !pris.includes(p.id) && !plotAtTile(state, p.case) && !(state.blocs && state.blocs[p.case]));
}

// Le personnage ramasse `id` : son objet entre dans l'inventaire.
export function ramasser(state, id) {
  const p = ramassables(state).find((q) => q.id === id);
  if (!p) return fail('Il n\'y a plus rien à ramasser ici.');
  if (!canAfford(state, 'ramasser')) return fail(TIRED);
  cueillette(state).pris.push(id);
  addItem(state, p.objet, 1);
  spendEnergy(state, 'ramasser');
  gainActionXp(state, 'ramasser');
  return { ok: true, sorte: p.sorte, items: { [p.objet]: 1 } };
}

/* ---------- l'Atelier ---------- */

// Ce qui manque dans l'inventaire pour `besoin` ({ objet: qté }) : { objet: qté manquante }.
function manque(state, besoin) {
  const out = {};
  for (const [item, n] of Object.entries(besoin || {})) {
    const k = n - countItem(state, item);
    if (k > 0) out[item] = k;
  }
  return out;
}

function prendre(state, besoin) {
  for (const [item, n] of Object.entries(besoin || {})) takeItem(state, item, n);
}

// Peut-on construire l'Atelier ? { ok, raison, manque }
export function atelierStatus(state) {
  const A = DATA.ATELIER;
  if (!atelierOuvert(state)) return { ok: false, raison: 'L\'Atelier se construit sur une ferme générée.', manque: {} };
  if (atelierConstruit(state)) return { ok: false, raison: 'L\'Atelier est déjà construit.', manque: {} };
  const m = manque(state, A.CONSTRUCTION);
  return Object.keys(m).length ? { ok: false, raison: 'Il manque des matériaux.', manque: m } : { ok: true, manque: {} };
}

export function buildAtelier(state) {
  const st = atelierStatus(state);
  if (!st.ok) return fail(st.raison);
  prendre(state, DATA.ATELIER.CONSTRUCTION);
  state.atelier = { construit: true, niveau: DATA.ATELIER.NIVEAU };
  return { ok: true };
}

// L'outil d'une recette est-il déjà là ?
function aDejaOutil(state, outil) {
  return outil === 'houe' ? hasHoe(state) : !!(state.outils && state.outils[outil]);
}

// Peut-on fabriquer la recette `id` ? { ok, raison, manque }
export function craftStatus(state, id) {
  const r = DATA.ATELIER.RECETTES[id];
  if (!r) return { ok: false, raison: 'Recette inconnue.', manque: {} };
  if (!atelierConstruit(state)) return { ok: false, raison: 'Il faut d\'abord construire l\'Atelier.', manque: {} };
  if (r.outil && aDejaOutil(state, r.outil)) return { ok: false, raison: 'Tu as déjà cet outil.', manque: {} };
  const m = manque(state, r.entrees);
  if (Object.keys(m).length) return { ok: false, raison: 'Il manque des matériaux.', manque: m };
  if (!canAfford(state, 'fabriquer')) return { ok: false, raison: TIRED, manque: {} };
  return { ok: true, manque: {} };
}

// Fabrique la recette `id` à l'Atelier : ses entrées quittent l'inventaire, sa sortie y entre
// (ou l'outil est là, comme acheté au Marché ; le premier outil devient celui en main).
export function craft(state, id) {
  const st = craftStatus(state, id);
  if (!st.ok) return fail(st.raison);
  const r = DATA.ATELIER.RECETTES[id];
  prendre(state, r.entrees);
  if (r.outil === 'houe') state.potager.houe = true;
  else if (r.outil) {
    if (!state.outils || typeof state.outils !== 'object') state.outils = { hache: false, pioche: false, canne: false, choisi: 'houe' };
    state.outils[r.outil] = true;
  }
  for (const [item, n] of Object.entries(r.sortie || {})) addItem(state, item, n);
  spendEnergy(state, 'fabriquer');
  gainActionXp(state, 'fabriquer');
  return { ok: true, items: { ...(r.sortie || {}) }, outil: r.outil || null };
}
