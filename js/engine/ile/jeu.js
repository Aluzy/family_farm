/* ==========================================================================
   La partie sur l'île (docs/ile-300.md, étape 7a) : l'île de la partie, vivante en mémoire et gardée dans sa
   sauvegarde (state.ile) ; le terrain de la ferme qui en découle (l'île devient la ferme : C17) ; une partie
   neuve installée sur l'île (C18 : rien de bâti, une tente à poser).
   Une partie de l'île de 300 × 300 (js/engine/ile.js, docs/ile-300.md).

   Ce module ne dépend que de l'île et des données : js/engine/terrain.js le lit (farmTerrain) sans cycle.

   Les performances : l'île vivante se relit une fois par sauvegarde (depuisSauvegarde, ~10 ms) puis se garde ; le
   terrain de la ferme se refait seulement quand l'île a changé (ile.version), en quelques millisecondes.
   ========================================================================== */

import { DATA } from '../catalog.js';
import { ILE } from './reglages.js';
import { depuisSauvegarde, versSauvegarde } from './sauvegarde.js';
import { auLarge, estEau, indice, retirerObjet } from './vie.js';
import { herbesParCase, touffesDeLIle, touffesVisibles } from './herbes.js';

const P = () => DATA.ILE.PARTIE;

/**
 * La partie se joue-t-elle sur l'île de 300 × 300 (sa sauvegarde porte une île) ?
 * @param {object} state
 */
export function estPartieIle(state) {
  return !!(state && state.ile && state.ile.format === 'ile-300');
}

// L'île vivante de chaque sauvegarde d'île (state.ile) : relue une fois, puis gardée.
const vivantes = new WeakMap();

/**
 * L'île vivante de la partie (ses tableaux, ses listes : js/engine/ile/vie.js), ou null. Relue de state.ile la
 * première fois, puis gardée : les modifications se font sur elle, garderIle les écrit dans la partie.
 * @param {object} state
 * @returns {import('./vie.js').Ile | null}
 */
export function ileDeLaPartie(state) {
  if (!estPartieIle(state)) return null;
  let ile = vivantes.get(state.ile);
  if (!ile) {
    ile = depuisSauvegarde(state.ile);
    vivantes.set(state.ile, ile);
  }
  return ile;
}

// La version de chaque île vivante déjà écrite dans sa partie.
const gardees = new WeakMap();

/**
 * Écrit l'île vivante dans la partie (state.ile : la sauvegarde entière). À faire avant d'écrire la partie.
 * @param {object} state
 */
export function garderIle(state) {
  const ile = ileDeLaPartie(state);
  if (!ile) return;
  // (rien de changé depuis la dernière fois : la sauvegarde de la partie est à jour ; l'écrire coûte ≈ 3 ms, 4 fois
  // plus sur un téléphone)
  if (gardees.get(ile) === (ile.version ?? 0) && state.ile && state.ile.format === 'ile-300') return;
  gardees.set(ile, ile.version ?? 0);
  const s = versSauvegarde(ile);
  vivantes.delete(state.ile);
  state.ile = s;
  vivantes.set(s, ile);
}

/* ---------- le terrain de la ferme : l'île entière (C17) ---------- */

// Le terrain de chaque île vivante, et la version de l'île qu'il décrit.
const terrains = new WeakMap();

// Une rangée des LIGNES du terrain : « # » une case de terre libre (on y laboure, on y bâtit), « o » une case prise
// par une plante ou une roche (libre une fois qu'on l'a retirée), « . » l'eau et la mer du large.
function rangee(ile, y) {
  let ligne = '';
  for (let x = 0; x < ile.n; x++) {
    const i = indice(x, y);
    if (estEau(ile, i) || auLarge(i)) ligne += '.';
    else if (ile.bloque[i]) ligne += 'o';
    else ligne += '#';
  }
  return ligne;
}

/**
 * Le terrain de la ferme d'une partie sur l'île, au format de DATA.TERRAIN (js/engine/terrain.js) : l'île entière,
 * de 300 × 300 cases, est la ferme (FERME : tout) ; ses LIGNES viennent de l'île (sa terre libre, ses cases prises,
 * son eau). Pas de rochers ni d'arbres de la carte de Tiled : ceux de l'île sont ses objets. Refait quand l'île change.
 * @param {object} state
 * @returns {object | null}
 */
export function terrainDeLIle(state) {
  const ile = ileDeLaPartie(state);
  if (!ile) return null;
  const garde = terrains.get(ile);
  if (garde && garde.version === (ile.version ?? 0)) return garde.terrain;
  const n = ile.n;
  const terrain = {
    LARGEUR: n,
    HAUTEUR: n,
    LIGNES: Array.from({ length: n }, (_, y) => rangee(ile, y)),
    ROCHERS: {},
    ARBRES: {},
    // (l'herbe haute, que la faux fauche : js/engine/ile/herbes.js ; une case où elle pousse se bâtit une fois fauchée)
    HERBES: herbesParCase(touffesVisibles(ile, touffesDeLIle(ile, state.carte.graine)), n),
    // (les repères des anciennes zones de culture, que lisent le joueur automatique et les outils d'essai pour bâtir
    // « près des cultures » : à côté du point d'apparition)
    ZONES: {
      1: { X: ILE.APPARITION.x + 3, Y: ILE.APPARITION.y - 2, COLONNES: 5 },
      2: { X: ILE.APPARITION.x - 12, Y: ILE.APPARITION.y + 4, COLONNES: 8 },
    },
    FERME: { X: 0, Y: 0, LARGEUR: n, HAUTEUR: n },
    ILE: true,
  };
  terrains.set(ile, { version: ile.version ?? 0, terrain });
  return terrain;
}

/**
 * Ce qui pousse sans bloquer (une fleur, une herbe, une culture sauvage) s'en va de la case `t` quand le joueur y
 * bâtit ou y laboure (js/engine/blocs.js poserBloc, js/engine/crops.js hoe) ; rien sur une partie d'avant l'île.
 * @param {object} state
 * @param {number} t
 */
export function degagerIle(state, t) {
  const ile = ileDeLaPartie(state);
  if (!ile || !Number.isInteger(t) || t < 0 || t >= ile.n * ile.n || !ile.objet[t] || ile.bloque[t]) return;
  retirerObjet(ile, t);
}

/* ---------- une partie neuve sur l'île (C18) ---------- */

/**
 * Installe l'île de la graine `graine` dans une partie neuve (js/engine/depart.js createNewGame) : l'île (state.ile), la graine de la carte, le personnage au point d'apparition (state.monde.ici), rien de
 * bâti ni de labouré, et ce qu'on a en plus en arrivant (PARTIE.INVENTAIRE : la tente). Le jeu en ligne est fermé
 * sur l'île (C19).
 * @param {object} state
 * @param {string} graine
 * @param {(state: object, item: string, n: number) => void} ajouter   ajoute à l'inventaire (inventory.js addItem)
 * @param {(graine: string) => import('./vie.js').Ile} creer   crée l'île (js/engine/ile.js creerIle)
 */
export function installerIle(state, graine, ajouter, creer) {
  const ile = creer(String(graine));
  state.ile = versSauvegarde(ile);
  vivantes.set(state.ile, ile);
  state.carte = { graine: String(graine), ile: true };
  const { x, y } = ILE.APPARITION;
  state.monde = { vues: [], ici: indice(x, y) };
  state.potager.parcelles = [];
  for (const k of ['blocs', 'sols', 'blocsDessus', 'hauteurs', 'rehausses', 'etage', 'solsEtage', 'solsHauts'])
    state[k] = {};
  for (const [item, n] of Object.entries(P().INVENTAIRE)) ajouter(state, item, n);
  return state;
}

/**
 * Le jeu en ligne est-il ouvert à cette partie ? Pas sur l'île (C19).
 * @param {object} state
 */
/**
 * La carte de la scène pour l'île (le format de Tiled qu'elle attend) : vide, de la taille de l'île ; tout son sol
 * vient de ctx.monde (js/ui/ile-sol.js), ses constructions de la partie.
 * @param {object} state
 */
export function carteDeLIle(state) {
  if (!estPartieIle(state)) return null;
  const ile = ileDeLaPartie(state);
  const n = ILE.TAILLE,
    vide = () => new Array(n * n).fill(0);
  const couche = (id, name) => ({
    id,
    name,
    type: 'tilelayer',
    width: n,
    height: n,
    x: 0,
    y: 0,
    opacity: 1,
    visible: true,
    data: vide(),
  });
  const groupe = (id, name) => ({
    id,
    name,
    type: 'objectgroup',
    draworder: 'topdown',
    x: 0,
    y: 0,
    opacity: 1,
    visible: true,
    objects: [],
  });
  const noms = [
    'ground',
    'contour_herbe',
    'plantes_pierres',
    'layer_tree_4',
    'layer_tree_3',
    'layer_tree_2',
    'layer_tree_1',
    'layer_tree_0',
  ];
  return {
    type: 'map',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    infinite: false,
    width: n,
    height: n,
    tilewidth: 16,
    tileheight: 16,
    nextlayerid: noms.length + 4,
    nextobjectid: 1,
    graine: state.carte.graine,
    layers: [
      ...noms.map((nm, k) => couche(k + 1, nm)),
      groupe(noms.length + 1, 'batiment'),
      {
        ...groupe(noms.length + 2, 'herbe_haute'),
        objects: touffesVisibles(ile, touffesDeLIle(ile, state.carte.graine)).map(([x, y, v], k) => ({
          id: 9000 + k,
          name: '',
          type: String(v),
          x,
          y,
          width: 0,
          height: 0,
          rotation: 0,
          visible: true,
          point: true,
        })),
      },
      groupe(noms.length + 3, 'passages'),
    ],
    tilesets: [],
    regionsPleines: [],
    ile: true,
  };
}

// Le jeu en ligne : suspendu tant que ILE.PARTIE.EN_LIGNE est faux (C19 ; son code est gardé, débranché).
export const enLigneOuvert = () => !!(DATA.ILE.PARTIE && DATA.ILE.PARTIE.EN_LIGNE);
