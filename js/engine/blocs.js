import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { atelierConstruit, atelierOuvert, atelierStatus, buildAtelier } from './atelier.js';
import { farmSeed, farmTerrain, tileCount } from './terrain.js';
import { mainCharacter } from './depart.js';
import { memberHappiness, setHappiness } from './ville.js';
import { openStation } from './kitchen.js';
import { freedRockTiles, openSerre } from './crops.js';
import { casesBuissonsCoupes, foretArbres, foretProche, foretSurCase, foulerAutour, grassCut, planterGraine } from './outils.js';
import { fillSilo } from './animals.js';
import { arbreProche, arbreSurCase, planterArbre } from './orchard.js';
import { isUnlocked } from './campaign.js';
import { unlockLevel } from './levels.js';
import { installStarter, removeStarter, starterBlock } from './depart.js';
import { robotOn } from './automation.js';
import { couchagesEtage, etageHorsEmprise, rangerEtage } from './etage.js';
import { ruchePosee, rucheReprise } from './ruches.js';
import { botteleuseReprise } from './botteleuse.js';
import { noter } from './journal.js';
import { viderBoite } from './repas.js';

/* ---------- la ferme générée : construire bloc par bloc ---------- */

// docs/carte-generee.md, étape 4. Sur la ferme générée, on pose des blocs sur les cases de
// la carte (DATA.ATELIER.BLOCS) : murs en pierre, portes, paillasses, et l'Atelier une fois
// construit. state.blocs = { [case]: sorte } (case = rangée × LARGEUR + colonne du terrain).
// Un bloc posé quitte l'inventaire ; repris, il y revient.
//
// Une pièce close : des cases voisines (par les côtés) sans bloc qui ferme, entourées de
// blocs qui ferment (murs, portes, Atelier), sans toucher le bord de la carte, d'au plus
// PIECE_MAX cases, avec au moins une porte. Une paillasse ne se pose que dans une pièce close ;
// la famille ne dort (et ne regagne l'énergie de la nuit) que sur une paillasse d'une pièce
// close : il en faut une par personne (couchages, nuitCouchee).

const sorteDe = (sorte) => DATA.ATELIER.BLOCS[sorte] || null;

export function blocsPoses(state) {
  return state.blocs && typeof state.blocs === 'object' ? state.blocs : {};
}

// La sorte du bloc posé sur `tile`, ou null.
export function blocAt(state, tile) {
  return blocsPoses(state)[tile] || null;
}

// Les sols posés (le plancher) : { [case]: sorte }, sous les blocs (state.sols).
export function solsPoses(state) {
  return state.sols && typeof state.sols === 'object' ? state.sols : {};
}

// La sorte du sol posé sur `tile`, ou null.
export function solAt(state, tile) {
  return solsPoses(state)[tile] || null;
}

// Ce qui est posé sur les blocs (la pompe sur le puits, un tableau sur un mur) : { [case]: sorte }.
export function blocsDessusPoses(state) {
  return state.blocsDessus && typeof state.blocsDessus === 'object' ? state.blocsDessus : {};
}

// Ce qui est posé sur le bloc de `tile` (la pompe sur le puits : state.blocsDessus), ou null.
export function blocDessus(state, tile) {
  return blocsDessusPoses(state)[tile] || null;
}

// Un bloc de cette sorte est-il déjà posé (par terre ou sur un autre) ?
function dejaPose(state, sorte) {
  return Object.values(blocsPoses(state)).includes(sorte) || Object.values(state.blocsDessus || {}).includes(sorte);
}

// Le bloc `tile` empêche-t-il de passer ?
export function blocBloque(state, tile) {
  const s = sorteDe(blocAt(state, tile));
  return !!(s && s.bloque);
}

// Poser `sorte` sur `ancien` change le mur sans l'enlever ? (un mur en pierre, une fenêtre,
// une pierre d'angle : BLOCS[].mur ; l'ancien revient dans l'inventaire)
// Les cases qu'un meuble posé en `tile` couvre (DATA.ATELIER.BLOCS : largeur vers la droite,
// hauteur vers le haut ; sa case d'abord), ou null s'il sort de la ferme.
export function empriseMeuble(state, sorte, tile) {
  const s = sorteDe(sorte), T = farmTerrain(state), W = T.LARGEUR;
  const l = (s && s.largeur) || 1, h = (s && s.hauteur) || 1, c = tile % W;
  if (c + l > W || Math.floor(tile / W) - h + 1 < 0) return null;
  const out = [];
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < l; dx++) out.push(tile - dy * W + dx);
  return out;
}

// Les cases couvertes par un meuble posé, hors la sienne : Map(case → case du meuble).
// Les cases bâties (un bloc, un plancher, ce qui est posé dessus, un meuble, un arbre planté,
// le dedans d'une pièce close) : rien de la carte n'y repousse (outils.js : l'herbe haute, les
// rochers, les arbres).
export function casesBaties(state) {
  const out = new Set();
  if (atelierOuvert(state)) for (const p of piecesCloses(state)) for (const t of p.cases) out.add(t);
  for (const o of [state.blocs, state.sols, state.blocsDessus]) for (const k of Object.keys(o && typeof o === 'object' ? o : {})) out.add(Number(k));
  for (const j of casesCouvertes(state).keys()) out.add(j);
  if (farmSeed(state) !== null) for (const a of (state.verger && state.verger.arbres) || []) if (Number.isInteger(a.case)) out.add(a.case);
  for (const a of foretArbres(state)) out.add(a.case);   // (les arbres plantés d'une graine : outils.js)
  return out;
}

// Les touffes d'herbe haute (pas fauchées) de la case `tile` (le terrain : HERBES).
export function herbesSur(state, tile) {
  const H = farmTerrain(state).HERBES;
  return ((H && H[tile]) || []).filter((id) => !grassCut(state, id));
}

// Peut-on bâtir sur `tile` (quel que soit le bloc) : de l'herbe libre, sans bloc, sol, meuble,
// arbre, rocher ni terre labourée ; `herbe` : l'herbe haute (à faucher) est acceptée. Sert au
// didacticiel pour choisir où placer l'abri (didacticiel.js, planAbriCases).
export function caseBatissable(state, tile, { herbe = false } = {}) {
  const T = farmTerrain(state);
  if (!Number.isInteger(tile) || tile < 0 || tile >= tileCount(T)) return false;
  const c = tile % T.LARGEUR, r = Math.floor(tile / T.LARGEUR);
  if (c < 1 || r < 1 || c >= T.LARGEUR - 1 || r >= T.HAUTEUR - 1) return false;
  if (blocAt(state, tile) || solAt(state, tile) || casesCouvertes(state).has(tile)) return false;
  if (arbreSurCase(state, tile) || foretSurCase(state, tile)) return false;
  const ch = T.LIGNES[r][c];
  if (ch !== '#' && ch !== '+') return false;
  if (!herbe && herbesSur(state, tile).length) return false;
  return !(state.potager.parcelles || []).some((p) => p.case === tile);
}

// La case `tile` est-elle sous un rocher ou un arbre de la carte ?
function rocherOuArbre(T, tile) {
  return [T.ROCHERS, T.ARBRES].some((L) => Object.values(L || {}).some((cs) => cs.includes(tile)));
}

export function casesCouvertes(state) {
  const out = new Map();
  for (const [k, sorte] of Object.entries(blocsPoses(state))) {
    const s = sorteDe(sorte), t = Number(k);
    if (!s || !s.meuble || ((s.largeur || 1) === 1 && (s.hauteur || 1) === 1)) continue;
    for (const j of empriseMeuble(state, sorte, t) || []) if (j !== t) out.set(j, t);
  }
  return out;
}

/* ---------- les murs rehaussés (version 1.25) ---------- */

// La hauteur d'un mur (1 à ATELIER.HAUTEUR_MAX) : state.hauteurs[tuile] quand il est rehaussé.
// 0 sans mur.
export function hauteurMur(state, tile) {
  const s = sorteDe(blocAt(state, tile));
  if (!s || !s.mur) return 0;
  const h = state.hauteurs && Number(state.hauteurs[tile]);
  return h > 1 ? Math.min(h, DATA.ATELIER.HAUTEUR_MAX) : 1;
}

// Les murs rehaussés : { [tuile]: hauteur } (2 ou plus).
export function hauteursPosees(state) {
  return state.hauteurs && typeof state.hauteurs === 'object' ? state.hauteurs : {};
}

function setHauteur(state, tile, h) {
  if (!state.hauteurs || typeof state.hauteurs !== 'object') state.hauteurs = {};
  if (h > 1) state.hauteurs[tile] = h;
  else delete state.hauteurs[tile];
}

// (une porte aussi : elle se pose sur un mur, à sa place, comme une fenêtre)
export function changeMur(ancien, sorte) {
  const a = sorteDe(ancien), s = sorteDe(sorte);
  return !!(a && s && a.mur && (s.mur || s.porte) && ancien !== sorte);
}

// La porte se pose sur un mur (elle prend sa place) : sans mur, la raison du refus.
export const PORTE_SUR_MUR = 'La porte se pose sur un mur (elle prend sa place, comme une fenêtre) : pose d\'abord le mur.';

// Combien de blocs `sorte` peut-on encore poser ? (l'Atelier : 1 s'il est construit et pas
// encore posé)
export function blocsEnMain(state, sorte) {
  const s = sorteDe(sorte);
  if (!s) return 0;
  // l'Atelier : à poser une fois ; pas encore construit, il se construit en le posant (poser)
  if (sorte === 'atelier') return !atelierConstruit(state) ? (atelierOuvert(state) ? 1 : 0) : !Object.values(blocsPoses(state)).includes('atelier') ? 1 : 0;
  return countItem(state, s.objet);
}

/* ---------- les pièces closes ---------- */

let piecesCle = null, piecesListe = [];

// Les pièces closes : [{ cases: [tuiles], portes: [tuiles], paillasses: [tuiles] }].
export function piecesCloses(state) {
  if (!atelierOuvert(state)) return [];
  const B = blocsPoses(state), T = farmTerrain(state), W = T.LARGEUR, H = T.HAUTEUR;
  const cle = W + ':' + JSON.stringify(B);
  if (cle === piecesCle) return piecesListe;
  const ferme = (t) => { const s = sorteDe(B[t]); return !!(s && s.ferme); };
  const faites = new Set(), out = [], max = DATA.ATELIER.PIECE_MAX;
  // une pièce touche forcément un bloc qui ferme : on part des cases voisines des blocs. Chaque
  // étendue a ses propres cases vues : celles qu'une étendue ouverte (trop grande) a vues sans
  // aller au-delà ne doivent pas en arrêter une autre (elles feraient un mur qui n'existe
  // pas) ; `faites` : les cases déjà parcourues, d'où l'on ne repart pas.
  for (const k of Object.keys(B)) {
    const b = Number(k);
    if (!ferme(b)) continue;
    const c0 = b % W;
    for (const d of [c0 > 0 ? b - 1 : -1, c0 < W - 1 ? b + 1 : -1, b - W, b + W]) {
      if (d < 0 || d >= W * H || ferme(d) || faites.has(d)) continue;
      const cases = [], bord = new Set(), pile = [d], vus = new Set([d]);
      let ouverte = false;
      while (pile.length) {
        const i = pile.pop(), c = i % W, r = Math.floor(i / W);
        cases.push(i);
        faites.add(i);
        if (c === 0 || r === 0 || c === W - 1 || r === H - 1 || cases.length > max) { ouverte = true; break; }
        for (const j of [c > 0 ? i - 1 : -1, c < W - 1 ? i + 1 : -1, r > 0 ? i - W : -1, r < H - 1 ? i + W : -1]) {
          if (j < 0) continue;
          if (ferme(j)) { bord.add(j); continue; }
          if (!vus.has(j)) { vus.add(j); pile.push(j); }
        }
      }
      if (ouverte) continue;
      const portes = [...bord].filter((t) => sorteDe(B[t]).porte);
      if (!portes.length) continue;
      out.push({ cases: cases.sort((a, b2) => a - b2), portes: portes.sort((a, b2) => a - b2), paillasses: cases.filter((t) => B[t] === 'paillasse' || (sorteDe(B[t]) && sorteDe(B[t]).lit)).sort((a, b2) => a - b2) });
    }
  }
  piecesCle = cle;
  piecesListe = out;
  return out;
}

// Reprendre le mur (ou la porte) de `tile` mêlerait-il deux genres ? null, ou la raison.
function melangeSansMur(state, tile) {
  const B = blocsPoses(state);
  const avant = new Set(piecesCloses(state).map((p) => genreDe(B, p)).filter(Boolean));
  if (!avant.size) return null;
  const { [tile]: _ote, ...reste } = B;
  const essai = { ...state, blocs: reste };
  const pieces = piecesCloses(essai);
  const mele = pieces.find((p) => intrus(reste, p).length);
  piecesCloses(state);   // (le cache revient sur la vraie partie)
  if (!mele) return null;
  const genres = [...new Set(blocsDe(reste, mele.cases).map((b) => genreBloc(b.sorte)).filter(Boolean))].map((g) => GENRES_PIECE[g]);
  return `Ce mur sépare ${genres.join(' et ')} : retiré, les deux ne feraient plus qu'une enceinte.`;
}

// Changer les blocs du bas (`blocs`, les blocs posés après le changement) ferait-il perdre des
// blocs posés à l'étage (la pièce de l'escalier ouverte ou coupée : son emprise rétrécit) ?
function etageEnPeril(state, blocs) {
  if (!Object.keys(state.etage || {}).length) return false;
  const avant = etageHorsEmprise(state).length;
  const perdus = etageHorsEmprise({ ...state, blocs }).length;
  piecesCloses(state);   // (le cache revient sur la vraie partie)
  return perdus > avant;
}

/* ---------- ce que devient une pièce close : une maison ou un bâtiment ---------- */

// Le premier lit (paillasse) ou bloc clé posé dans une enceinte décide de ce qu'elle est :
//   - une maison : la paillasse, le four, la cuisinière (et les blocs sans genre, la batterie) ;
//   - un bâtiment : le nichoir (le Poulailler), la mangeoire (l'Étable), le bac à semis (la
//     Serre), la meule (le Moulin). Un bâtiment n'a que son bloc
//     clé (et un plancher au sol, state.sols, qui n'est pas un bloc ; les sols n'ont pas de genre).
// Un bloc d'un autre genre n'y entre pas (poseStatus) ; un mur ou une porte qui, repris,
// mêlerait deux enceintes de genres différents ne se reprend pas (reprendreBloc).
export const GENRES_PIECE = { maison: 'la maison', poulailler: 'le Poulailler', paturage: 'l\'Étable', serre: 'la Serre', silo: 'le Silo', moulin: 'le Moulin' };

// Le genre d'un bloc : 'maison', l'id d'un bâtiment, ou null (sans genre : la batterie ; ou
// dehors : les murs, les portes, le puits…).
export function genreBloc(sorte) {
  const s = sorteDe(sorte);
  if (!s) return null;
  if (s.batiment) return s.batiment;
  if (s.station === 'moulin') return 'moulin';
  if (sorte === 'paillasse' || s.station || s.meuble) return 'maison';
  return null;
}

// Les blocs posés dans les cases `cases` (hors murs et portes, qui la bordent) : [{ case, sorte }].
function blocsDe(B, cases) {
  return cases.filter((t) => B[t]).map((t) => ({ case: t, sorte: B[t] }));
}

// Le genre de la pièce `p` (le premier bloc à genre, dans l'ordre des cases), ou null.
function genreDe(B, p) {
  for (const b of blocsDe(B, p.cases)) { const g = genreBloc(b.sorte); if (g) return g; }
  return null;
}

// La pièce close de la tuile, ou null.
export function pieceDe(state, tile) {
  return piecesCloses(state).find((p) => p.cases.includes(tile)) || null;
}

// Le genre de la pièce close de la tuile ('maison', l'id d'un bâtiment) ou null.
export function genrePiece(state, tile) {
  const p = pieceDe(state, tile);
  return p ? genreDe(blocsPoses(state), p) : null;
}

// Le bloc `sorte` peut-il entrer dans la pièce `p` ? null, ou la raison du refus.
function refusGenre(state, sorte, p) {
  const B = blocsPoses(state), g = genreBloc(sorte), deja = genreDe(B, p);
  const s = sorteDe(sorte);
  if (deja && deja !== 'maison') return `Cette enceinte est ${GENRES_PIECE[deja]} : on n'y pose que son bloc (et un plancher). ${s.nom} : dans une autre enceinte.`;
  if (g && g !== 'maison') {
    if (deja === 'maison') return `Cette enceinte est la maison : ${GENRES_PIECE[g]} se bâtit dans une autre enceinte.`;
    if (blocsDe(B, p.cases).length) return `${GENRES_PIECE[g][0].toUpperCase()}${GENRES_PIECE[g].slice(1)} se bâtit dans une enceinte vide (seul un plancher peut y être).`;
  }
  return null;
}

// Les blocs de la pièce `p` qui n'y vont pas (une partie d'avant la règle) : tout ce qui n'est
// pas du genre du premier bloc à genre ; dans un bâtiment, tout le reste. [{ case, sorte }]
function intrus(B, p) {
  const g = genreDe(B, p);
  if (!g) return [];
  return blocsDe(B, p.cases).filter((b) => (g === 'maison' ? genreBloc(b.sorte) && genreBloc(b.sorte) !== 'maison' : genreBloc(b.sorte) !== g));
}

// Une partie d'avant la règle : les blocs qui mêlent deux genres dans une enceinte retournent
// dans l'inventaire (le premier genre trouvé reste). Renvoie les sortes reprises.
export function rangerPieces(state) {
  const repris = [];
  for (let k = 0; k < 50; k++) {
    const B = blocsPoses(state);
    const trop = piecesCloses(state).flatMap((p) => intrus(B, p));
    if (!trop.length) break;
    for (const b of trop) if (reprendreBloc(state, b.case, { force: true }).ok) repris.push(b.sorte);
  }
  return repris;
}

// La tuile est-elle dans une pièce close ?
export function dansPiece(state, tile) {
  return piecesCloses(state).some((p) => p.cases.includes(tile));
}

// Les paillasses et les lits où l'on peut dormir : ceux des pièces closes (leurs cases, dans
// l'ordre des pièces), puis ceux de l'étage (« etage:<tuile> », etage.js couchagesEtage).
export function couchages(state) {
  return piecesCloses(state).flatMap((p) => p.paillasses).concat(couchagesEtage(state));
}

// La Serre de la ferme générée sur la carte : les cases de la pièce close où est le bac à
// semis, sans bloc, hors celles juste derrière ses portes (le passage), dans l'ordre des
// cases. Ses parcelles s'y posent, une par case (les premières) ; [] sans bac dans une pièce.
export function serrePlaces(state) {
  const B = blocsPoses(state), W = farmTerrain(state).LARGEUR;
  const p = piecesCloses(state).find((q) => q.cases.some((t) => B[t] === 'bac_semis'));
  if (!p) return [];
  const passage = new Set();
  for (const d of p.portes) for (const j of [d - 1, d + 1, d - W, d + W]) passage.add(j);
  return p.cases.filter((t) => !B[t] && !passage.has(t));
}

// Les murs et les portes de l'enceinte de la Serre (la pièce du bac à semis : les blocs qui la
// bordent, coins compris), dans l'ordre des cases ; la carte les dessine en verre et en bois.
export function serreMurs(state) {
  const B = blocsPoses(state), W = farmTerrain(state).LARGEUR;
  const p = piecesCloses(state).find((q) => q.cases.some((t) => B[t] === 'bac_semis'));
  if (!p) return [];
  const out = new Set();
  for (const t of p.cases) {
    const c = t % W;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const j = t + dy * W + dx, s = sorteDe(B[j]);
        if (c + dx >= 0 && c + dx < W && s && (s.mur || s.porte)) out.add(j);
      }
    }
  }
  return [...out].sort((a, b) => a - b);
}

// La famille dort-elle cette nuit ? Partout sauf sur la ferme générée ; là, il faut une
// paillasse dans une pièce close pour le personnage principal (la première lui revient).
export function nuitCouchee(state) {
  return !atelierOuvert(state) || couchages(state).length > 0;
}

// La nuit (runNight), sur la ferme générée : il faut une paillasse d'une pièce close par
// personne, le personnage principal d'abord ; chaque membre sans couchage perd
// ATELIER.BONHEUR_SANS_COUCHAGE de bonheur. Renvoie les membres sans couchage.
export function nuitSansCouchage(state) {
  if (!atelierOuvert(state)) return [];
  const principal = mainCharacter(state);
  const ordre = [principal].concat(state.famille.membres.filter((m) => m !== principal)).filter(Boolean);
  const sans = ordre.slice(couchages(state).length);
  for (const m of sans) setHappiness(m, memberHappiness(m) + DATA.ATELIER.BONHEUR_SANS_COUCHAGE);
  return sans;
}

// Le bâtiment `id` est construit par son bloc clé (comme acheté, sans payer) ; repris puis
// reposé, il retrouve son niveau (l'Étable : ses places ; la Serre : ses parcelles et ce qui y pousse ; le Silo : son blé).
function ouvrirBatiment(state, id) {
  const b = state[id];
  if (!b) return;
  if (id === 'serre' && !(b.parcelles && b.parcelles.length)) { openSerre(state); return; }
  b.construit = true;
  if (!b.niveau && id !== 'paturage') b.niveau = 1;
  if (id === 'poulailler' || id === 'paturage') { majPoulailler(state); return; }   // (pas sans leur enclos : etatEnclos)
  if (id === 'silo') fillSilo(state);   // le blé de l'inventaire y entre, comme à sa réparation
}

/* ---------- poser, reprendre ---------- */

// Peut-on poser `sorte` sur `tile` ? { ok, raison }
export function poseStatus(state, sorte, tile) {
  const s = sorteDe(sorte);
  if (!atelierOuvert(state)) return { ok: false, raison: 'On construit sur une ferme générée.' };
  if (!s) return { ok: false, raison: 'Bloc inconnu.' };
  const T = farmTerrain(state);
  if (!Number.isInteger(tile) || tile < 0 || tile >= tileCount(T)) return { ok: false, raison: 'Hors de la ferme.' };
  if (blocsEnMain(state, sorte) < 1) return { ok: false, raison: sorte === 'atelier' ? 'L\'Atelier est déjà posé (ou pas encore construit).' : s.meuble ? `Plus de ${s.nom.toLowerCase()} : achète-en au Marché (rayon Meubles).` : s.marche ? `Plus de ${s.nom.toLowerCase()} : achète-en au Marché (rayon ${s.marche}).` : s.semis ? `Plus de ${s.nom.toLowerCase()} : abats ${s.semis === 'pin' ? 'un sapin' : 'un arbre'} pour en avoir.` : `Plus de ${s.nom.toLowerCase()} : fabrique-en à l'Atelier.` };
  // le bloc clé d'un bâtiment (ou la meule du Moulin) : pas avant le niveau où il se débloque
  const verrou = s.batiment || s.debloque;
  if (verrou && !isUnlocked(state, verrou)) return { ok: false, raison: `${s.nom} : se pose à partir du niveau ${unlockLevel(verrou)}.` };
  // l'Atelier pas encore construit : ses matériaux (DATA.ATELIER.CONSTRUCTION) dans l'inventaire
  if (sorte === 'atelier' && !atelierConstruit(state) && !atelierStatus(state).ok) {
    const C = DATA.ATELIER.CONSTRUCTION;
    return { ok: false, raison: `L'Atelier : il faut ${Object.entries(C).map(([o, n]) => `${n} ${DATA.OBJETS[o].nom.toLowerCase()}`).join(' et ')} (ramasse-les sur la carte).` };
  }
  // le même mur posé sur un mur : il se rehausse d'un bloc (jusqu'à HAUTEUR_MAX)
  if (s.mur && blocAt(state, tile) === sorte) {
    return hauteurMur(state, tile) < DATA.ATELIER.HAUTEUR_MAX ? { ok: true } : { ok: false, raison: `Ce mur est déjà haut de ${DATA.ATELIER.HAUTEUR_MAX} blocs.` };
  }
  // un bloc de silo posé sur une colonne du silo : elle se rehausse d'un bloc (jusqu'à SILO.HAUTEUR_MAX)
  if (s.silo && blocAt(state, tile) === sorte) {
    const max = DATA.ATELIER.SILO.HAUTEUR_MAX;
    return hauteurSilo(state, tile) < max ? { ok: true } : { ok: false, raison: `Cette colonne du silo est déjà haute de ${max} blocs.` };
  }
  // un mur posé : une fenêtre (ou une pierre d'angle, une porte) le remplace, la pièce reste close
  if (changeMur(blocAt(state, tile), sorte)) {
    return hauteurMur(state, tile) > 1 ? { ok: false, raison: 'Ce mur est rehaussé : reprends d\'abord ses blocs du dessus.' } : { ok: true };
  }
  if (s.porte) return { ok: false, raison: PORTE_SUR_MUR };
  if (s.boite && state.frigo && state.frigo.construit) return { ok: false, raison: 'La famille mange au réfrigérateur : la boîte à nourriture ne sert plus.' };
  if (s.unique && dejaPose(state, sorte)) return { ok: false, raison: `Il y a déjà ${s.nom.toLowerCase() === 'citerne' ? 'une' : 'un'} ${s.nom.toLowerCase()} sur la ferme.` };
  // la station du robot : quand il est là (récolte ou semis automatiques)
  if (s.robot && !robotOn(state)) return { ok: false, raison: 'Il faut d\'abord le robot : la récolte ou le semis automatiques (arbre des technologies).' };
  if (s.appareil) {
    const r = starterBlock(state, s.appareil);
    if (r) return { ok: false, raison: r === 'Répare d\'abord la maison.' ? 'Bâtis d\'abord ton foyer : une pièce close avec une paillasse.' : r === 'Achète d\'abord le panneau et la pompe.' ? 'Pose d\'abord le panneau solaire et la pompe.' : r };
  }
  // la pompe : sur le puits, sans prendre de case
  if (s.sur) {
    const sous = sorteDe(s.sur), b = sorteDe(blocAt(state, tile));
    // (un tableau : sur un mur, quel qu'il soit)
    if (s.sur === 'mur' ? !(b && b.mur) : blocAt(state, tile) !== s.sur) return { ok: false, raison: `${s.nom} : à ${s.sur === 'mur' ? 'accrocher à un mur' : `poser sur ${sous ? sous.nom.toLowerCase() : s.sur}`}.` };
    if (blocDessus(state, tile)) return { ok: false, raison: 'Il y a déjà quelque chose dessus.' };
    // (un tableau : sur la face du mur, qu'on voit quand rien ne ferme sous lui)
    const dessous = s.sur === 'mur' && sorteDe(blocAt(state, tile + T.LARGEUR));
    if (dessous && dessous.ferme) return { ok: false, raison: `${s.nom} : sur un mur dont on voit la face (sans mur ni porte juste en dessous).` };
    return { ok: true };
  }
  // un sol (le plancher) : sous les blocs, pas sous ce qui ferme une pièce
  if (s.sol) {
    if (solAt(state, tile)) return { ok: false, raison: `Il y a déjà un ${sorteDe(solAt(state, tile)).nom.toLowerCase()} ici.` };
    const b = sorteDe(blocAt(state, tile));
    if (b && b.ferme) return { ok: false, raison: `${s.nom} : pas sous un mur, une porte ni l'Atelier.` };
  } else if (blocAt(state, tile)) return { ok: false, raison: 'Il y a déjà un bloc ici.' };
  else if (casesCouvertes(state).has(tile)) return { ok: false, raison: 'Un meuble occupe cette case.' };
  if (s.ferme && solAt(state, tile)) return { ok: false, raison: `Un ${sorteDe(solAt(state, tile)).nom.toLowerCase()} ici : reprends-le d'abord.` };
  if (arbreSurCase(state, tile) || foretSurCase(state, tile)) return { ok: false, raison: 'Un arbre pousse ici.' };
  // un arbre fruitier : loin des autres (son feuillage), à côté d'aucun bloc
  // (une graine d'arbre, la pomme de pin, le gland : n'importe quelle case d'herbe libre, dehors,
  // loin des autres arbres plantés)
  if ((s.arbre || s.semis) && (arbreProche(state, tile, DATA.ATELIER.ARBRE_ECART) || foretProche(state, tile, DATA.ATELIER.ARBRE_ECART))) return { ok: false, raison: 'Trop près d\'un autre arbre : laisse-lui de la place.' };
  // (une case sous un rocher ou un arbre de la carte : une fois cassé, abattu, elle se bâtit)
  const ch = T.LIGNES[Math.floor(tile / T.LARGEUR)][tile % T.LARGEUR];
  if (ch === 'o' && (rocherOuArbre(T, tile)) && !freedRockTiles(state).has(tile)) return { ok: false, raison: 'Un rocher ou un arbre occupe cette case : casse-le ou abats-le d\'abord.' };
  // (une case sous un buisson coupé : de l'herbe, tant qu'il est coupé ; il ne repousse pas sous ce qui est bâti)
  if (ch !== '#' && ch !== '+' && !(ch === 'o' && freedRockTiles(state).has(tile)) && !(ch === '.' && casesBuissonsCoupes(state).has(tile))) return { ok: false, raison: 'On ne bâtit que sur l\'herbe : pas sur les chemins, l\'eau, les arbres, les rochers ni les bâtiments.' };
  // (l'herbe haute : à faucher d'abord)
  if ((s.meuble ? empriseMeuble(state, sorte, tile) || [tile] : [tile]).some((j) => herbesSur(state, j).length)) return { ok: false, raison: 'De l\'herbe haute pousse ici : fauche-la d\'abord (la faux).' };
  if ((state.potager.parcelles || []).some((p) => p.case === tile)) return { ok: false, raison: 'Une terre labourée : rebouche-la d\'abord.' };
  if (s.dedans && !dansPiece(state, tile)) return { ok: false, raison: `${s.nom} : à poser dans une pièce close (des murs tout autour, et une porte).` };
  if (s.dehors && dansPiece(state, tile)) return { ok: false, raison: `${s.nom} : à poser dehors, pas dans une pièce close.` };
  // (un mur qui couperait la pièce de l'escalier : l'étage perdrait ce qui est posé au-dessus)
  if (s.ferme && etageEnPeril(state, { ...blocsPoses(state), [tile]: sorte })) return { ok: false, raison: `${s.nom} : couperait la pièce de l'escalier, et l'étage perdrait ce qui y est posé. Reprends d'abord ces blocs de l'étage.` };
  // un bloc de silo au sol : à côté des colonnes déjà posées (un seul silo)
  if (s.silo) {
    const refus = refusSilo(state, tile);
    if (refus) return { ok: false, raison: refus };
  }
  // une maison ou un bâtiment : pas de bloc d'un autre genre (le premier posé décide)
  const p = !s.ferme && !s.sol && pieceDe(state, tile);
  const refus = p && refusGenre(state, sorte, p);
  if (refus) return { ok: false, raison: refus };
  // un meuble de plusieurs cases : toutes libres, dans la même pièce
  const cases = s.meuble ? empriseMeuble(state, sorte, tile) : [tile];
  if (!cases || cases.length > 1) {
    const couv = casesCouvertes(state), labour = new Set((state.potager.parcelles || []).map((q) => q.case));
    const ok = cases && p && cases.every((j) => p.cases.includes(j) && !blocAt(state, j) && !couv.has(j) && !labour.has(j));
    if (!ok) return { ok: false, raison: `${s.nom} : il lui faut ${s.largeur || 1} × ${s.hauteur || 1} cases libres dans la pièce (vers la droite${(s.hauteur || 1) > 1 ? ' et vers le haut' : ''}).` };
  }
  return { ok: true };
}

// Pose `sorte` sur `tile` ; l'herbe haute des cases voisines qui déborde sur ce qui est bâti
// est foulée (fauchée, sans paille : foulerAutour).
export function poserBloc(state, sorte, tile) {
  const r = poser(state, sorte, tile);
  if (r.ok) { foulerAutour(state, tile); noter('pose', { sorte }); }
  return r;
}

function poser(state, sorte, tile) {
  const st = poseStatus(state, sorte, tile);
  if (!st.ok) return fail(st.raison);
  const s = sorteDe(sorte);
  const ancien = blocAt(state, tile);
  if (s.objet) takeItem(state, s.objet, 1);
  if (sorte === 'atelier' && !atelierConstruit(state)) buildAtelier(state);   // (ses matériaux quittent l'inventaire)
  if (s.mur && ancien === sorte) {
    setHauteur(state, tile, hauteurMur(state, tile) + 1);
    majPoulailler(state);
    return { ok: true, sorte, case: tile, hauteur: hauteurMur(state, tile) };
  }
  if (s.silo && ancien === sorte) {
    setHauteur(state, tile, hauteurSilo(state, tile) + 1);
    majPoulailler(state);
    return { ok: true, sorte, case: tile, hauteur: hauteurSilo(state, tile) };
  }
  if (changeMur(ancien, sorte)) {
    addItem(state, sorteDe(ancien).objet, 1);
    state.blocs[tile] = sorte;
    return { ok: true, sorte, case: tile, remplace: ancien };
  }
  // une graine d'arbre : plantée dans le sol, elle n'est pas un bloc ; un arbre y poussera
  if (s.semis) {
    const a = planterGraine(state, s.semis, tile);
    majPoulailler(state);
    return { ok: true, sorte, case: tile, arbre: a.id };
  }
  // un arbre fruitier : planté dans le sol, il n'est pas un bloc (orchard.js)
  if (s.arbre) {
    const tree = planterArbre(state, s.arbre, tile);
    majPoulailler(state);
    return { ok: true, sorte, case: tile, arbre: tree.id };
  }
  if (s.sur) {
    if (!state.blocsDessus || typeof state.blocsDessus !== 'object') state.blocsDessus = {};
    state.blocsDessus[tile] = sorte;
  } else if (s.sol) {
    if (!state.sols || typeof state.sols !== 'object') state.sols = {};
    state.sols[tile] = sorte;
  } else {
    if (!state.blocs || typeof state.blocs !== 'object') state.blocs = {};
    state.blocs[tile] = sorte;
  }
  // le panneau, la pompe, la citerne, la batterie : l'appareil est là (étape 5b-2)
  if (s.appareil) installStarter(state, s.appareil);
  // une ruche : vide, elle commence à se remplir (js/engine/ruches.js)
  if (s.ruche) ruchePosee(state, tile);
  // le bloc clé d'un bâtiment (le nichoir : le Poulailler ; la mangeoire : l'Étable , le bac à semis : la Serre) : le bâtiment est construit
  if (s.batiment) ouvrirBatiment(state, s.batiment);
  // un four, une cuisinière : la station est là (étape 5b, la maison) ; la meule : le Moulin
  // quand sa tour est bâtie (majMoulin)
  if (s.station && s.station !== 'moulin' && state.stations[s.station]) openStation(state, s.station);
  majPoulailler(state);
  rangerEtage(state);   // (un mur qui coupe la pièce de l'escalier : l'étage rétrécit)
  return { ok: true, sorte, case: tile };
}

// Reprend le bloc de `tile` : son objet revient dans l'inventaire (l'Atelier redevient à
// poser). Une paillasse d'une pièce qui s'ouvre reste là, mais on n'y dort plus. Ce qui est
// posé dessus d'abord (la pompe sur le puits), puis le bloc, puis le sol (le plancher).
export function reprendreBloc(state, tile, opts) {
  // (une case couverte par un meuble : le meuble)
  if (!blocDessus(state, tile) && !blocAt(state, tile) && casesCouvertes(state).has(tile)) tile = casesCouvertes(state).get(tile);
  const dessus = blocDessus(state, tile), bloc = blocAt(state, tile);
  const sorte = dessus || bloc || solAt(state, tile);
  if (!sorte) return fail('Il n\'y a pas de bloc ici.');
  // un mur rehaussé, une colonne du silo : le bloc du dessus d'abord
  if (!dessus && bloc && hauteurEmpilee(state, tile) > 1) {
    setHauteur(state, tile, hauteurEmpilee(state, tile) - 1);
    addItem(state, sorteDe(bloc).objet, 1);
    majPoulailler(state);
    return { ok: true, sorte: bloc, case: tile, hauteur: hauteurEmpilee(state, tile) };
  }
  // (la colonne du silo du milieu : elle le couperait en deux)
  if (!dessus && estSilo(bloc)) {
    const W = farmTerrain(state).LARGEUR, r = Math.floor(tile / W);
    const voisin = (k) => estSilo(blocAt(state, k)) && Math.floor(k / W) === r;
    if (voisin(tile - 1) && voisin(tile + 1)) return fail('Cette colonne couperait le silo en deux : reprends d\'abord une colonne d\'un bout.');
  }
  // un mur ou une porte entre une maison et un bâtiment (ou deux bâtiments) : il reste
  if (!dessus && bloc && sorteDe(bloc).ferme && !(opts && opts.force)) {
    const melange = melangeSansMur(state, tile);
    if (melange) return fail(melange);
    // un mur (une porte) qui porte l'étage : retiré, la pièce de l'escalier s'ouvrirait et ce qui
    // est posé à l'étage tomberait ; il reste
    const { [tile]: _ote, ...reste } = blocsPoses(state);
    if (etageEnPeril(state, reste)) return fail(`${sorteDe(bloc).nom} : il porte l'étage. Reprends d'abord ce qui est posé à l'étage au-dessus.`);
  }
  if (dessus) delete state.blocsDessus[tile];
  else if (bloc) { delete state.blocs[tile]; setHauteur(state, tile, 1); }
  else delete state.sols[tile];
  const s = sorteDe(sorte);
  if (s && s.appareil) removeStarter(state, s.appareil);
  // (une ruche pleine : son miel vient avec elle)
  if (s && s.ruche) rucheReprise(state, tile);
  // (une botteleuse : les fibres qu'elle a reçues reviennent, js/engine/botteleuse.js)
  if (s && s.botteleuse === 'machine') botteleuseReprise(state, tile);
  // (la boîte à nourriture : ce qu'elle contient revient dans l'inventaire)
  if (s && s.boite) viderBoite(state);
  if (s && s.batiment && state[s.batiment] && !['poulailler', 'paturage'].includes(s.batiment)) state[s.batiment].construit = false;
  if (s && s.objet) addItem(state, s.objet, 1);
  // la station s'en va avec lui (s'il n'y en a pas une autre posée)
  if (s && s.station && s.station !== 'moulin' && state.stations[s.station] && !Object.values(blocsPoses(state)).includes(sorte)) state.stations[s.station].construit = false;
  majPoulailler(state);
  rangerEtage(state);   // (l'escalier repris, la pièce ouverte : l'étage s'en va)
  return { ok: true, sorte, case: tile };
}

/* ---------- le Poulailler et l'Étable de la ferme générée : une enceinte, un bloc clé, un enclos ---------- */

// Le Poulailler (le nichoir) et l'Étable (la mangeoire) sont là quand tout y est :
//   - une enceinte de murs (une pièce close) où le bloc clé est posé ;
//   - une porte de l'enceinte qui donne sur l'extérieur ;
//   - un enclos : une étendue close de barrières (elle peut s'appuyer sur les murs de
//     l'enceinte), reliée à l'enceinte par une autre de ses portes ;
//   - une case libre au moins, dans l'enceinte (hors bloc clé) et dans l'enclos.
// Une place par case libre de l'enceinte et de l'enclos : places = le plus petit des deux (une
// poule, un mouton : une place ; une vache : PATURAGE.PLACES_PAR_VACHE). Le Poulailler le borne
// aussi par son niveau (coopCapacity), l'Étable par ses places achetées (stablePlaces).
// etatEnclos(state, cle) → { ok, conditions: [{ id, texte, ok }], piece, enclos (leurs cases),
// porteDehors, porteEnclos, libresPiece, libresEnclos (cases), places }.
const ENCLOS = {
  nichoir: { batiment: 'poulailler', bloc: 'Un nichoir', bete: 'poule', horsCle: 'hors nichoir' },
  mangeoire: { batiment: 'paturage', bloc: 'Une mangeoire', bete: 'place (un mouton : 1, une vache : {vache})', horsCle: 'hors mangeoire' },
};
function conditionsEnclos(cle) {
  const d = ENCLOS[cle];
  return [
    ['enceinte', 'Une enceinte de murs (une pièce close)'],
    ['cle', `${d.bloc} dans l'enceinte`],
    ['dehors', 'Une porte de l\'enceinte qui donne sur l\'extérieur'],
    ['enclos', 'Un enclos de barrières, relié à l\'enceinte par une autre porte'],
    ['place', `Une case libre par ${d.bete.replace('{vache}', DATA.PATURAGE.PLACES_PAR_VACHE)}, dans l'enceinte (${d.horsCle}) et dans l'enclos`],
  ];
}

const enclosCache = new Map();

// L'étendue d'herbe atteinte depuis `depart` sans passer un mur, une porte, l'Atelier ou une
// barrière : { cases, close (elle ne touche ni le bord ni ne dépasse PIECE_MAX), barriere (une
// barrière la borde) }.
function etendue(state, depart) {
  const B = blocsPoses(state), T = farmTerrain(state), W = T.LARGEUR, H = T.HAUTEUR, max = DATA.ATELIER.PIECE_MAX;
  const arret = (t) => { const s = sorteDe(B[t]); return !!(s && (s.ferme || B[t] === 'barriere')); };
  const vus = new Set([depart]), pile = [depart], cases = [];
  let close = true, barriere = false;
  while (pile.length) {
    const i = pile.pop(), c = i % W, r = Math.floor(i / W);
    cases.push(i);
    if (c === 0 || r === 0 || c === W - 1 || r === H - 1 || cases.length > max) { close = false; break; }
    for (const j of [i - 1, i + 1, i - W, i + W]) {
      if (arret(j)) { if (B[j] === 'barriere') barriere = true; continue; }
      if (!vus.has(j)) { vus.add(j); pile.push(j); }
    }
  }
  return { cases, close, barriere };
}

export function etatEnclos(state, sorteCle) {
  const B = blocsPoses(state);
  const cle = farmSeed(state) + ':' + JSON.stringify(B) + ':' + (state.verger ? state.verger.arbres.map((a) => a.case).join(',') : '');
  const vu = enclosCache.get(sorteCle);
  if (vu && vu.cle === cle) return vu.etat;
  const T = farmTerrain(state), W = T.LARGEUR;
  const ok = {}, e = { ok: false, piece: null, enclos: null, porteDehors: null, porteEnclos: null, libresPiece: [], libresEnclos: [], places: 0 };
  const nid = Object.keys(B).map(Number).find((t) => B[t] === sorteCle);
  const pieces = atelierOuvert(state) ? piecesCloses(state) : [];
  const p = nid === undefined ? null : pieces.find((q) => q.cases.includes(nid)) || null;
  ok.cle = nid !== undefined && !!p;
  ok.enceinte = !!p;
  if (p) {
    e.piece = p.cases;
    // chaque porte : la case de l'autre côté (hors de l'enceinte) ; un enclos, ou le dehors
    for (const d of p.portes) {
      const o = [d - 1, d + 1, d - W, d + W].find((j) => !p.cases.includes(j) && !(sorteDe(B[j]) && (sorteDe(B[j]).ferme || B[j] === 'barriere')));
      if (o === undefined || pieces.some((q) => q !== p && q.cases.includes(o))) continue;
      const x = etendue(state, o);
      if (x.close && x.barriere) { if (!e.enclos || x.cases.length > e.enclos.length) { e.enclos = x.cases; e.porteEnclos = d; } } else if (!x.close && e.porteDehors === null) e.porteDehors = d;
    }
    const arbres = new Set(state.verger ? state.verger.arbres.map((a) => a.case) : []);
    const herbe = (t) => { const ch = T.LIGNES[Math.floor(t / W)][t % W]; return ch === '#' || ch === '+'; };
    e.libresPiece = p.cases.filter((t) => !B[t]);
    e.libresEnclos = (e.enclos || []).filter((t) => !B[t] && herbe(t) && !arbres.has(t));
    e.places = e.enclos ? Math.min(e.libresPiece.length, e.libresEnclos.length) : 0;
  }
  ok.dehors = e.porteDehors !== null;
  ok.enclos = !!e.enclos;
  ok.place = e.places > 0;
  e.conditions = conditionsEnclos(sorteCle).map(([id, texte]) => ({ id, texte, ok: !!ok[id] }));
  e.ok = e.conditions.every((c) => c.ok);
  enclosCache.set(sorteCle, { cle, etat: e });
  return e;
}

export function etatPoulailler(state) {
  return etatEnclos(state, 'nichoir');
}

export function etatEtable(state) {
  return etatEnclos(state, 'mangeoire');
}

// Sur la ferme générée, le Poulailler et l'Étable existent quand tout y est (etatEnclos) ; ils
// gardent leur niveau, leurs places et leurs bêtes quand ils ne le sont plus. Appelée après
// chaque bloc posé ou repris.
export function majPoulailler(state) {
  if (farmSeed(state) === null) return;
  if (state.poulailler) {
    const e = etatPoulailler(state);
    state.poulailler.construit = e.ok;
    if (e.ok && !state.poulailler.niveau) state.poulailler.niveau = 1;
  }
  if (state.paturage) {
    const e = etatEtable(state);
    state.paturage.construit = e.ok;
    if (e.ok && !state.paturage.places) state.paturage.places = DATA.PATURAGE.PLACES_DEPART;
  }
  majMoulin(state);
  majSilo(state);
}

/* ---------- le Moulin de la ferme générée : une tour et sa meule (version 1.25) ---------- */

// Le Moulin est là quand :
//   - la meule est posée dans une pièce close ;
//   - elle est au centre de la pièce (la case du milieu de ses cases, en largeur et en hauteur ;
//     l'une des deux du milieu quand le côté est pair) ;
//   - tous les murs de la pièce (les blocs `mur` qui la bordent, ses huit voisines ; pas les
//     portes) ont MOULIN.HAUTEUR blocs de haut.
// etatMoulin(state) → { ok, conditions: [{ id, texte, ok }], piece, meule, bornes: { c0, c1, r0, r1 }
// (les cases de la pièce), murs: { hauts, total } }.
export function etatMoulin(state) {
  const H = DATA.ATELIER.MOULIN.HAUTEUR;
  const B = blocsPoses(state), W = farmTerrain(state).LARGEUR;
  const meule = Object.keys(B).map(Number).find((t) => B[t] === 'meule');
  const piece = meule !== undefined ? pieceDe(state, meule) : null;
  let centre = false, bornes = null, hauts = 0, total = 0, murs = new Set();
  if (piece) {
    const cs = piece.cases.map((t) => t % W), rs = piece.cases.map((t) => Math.floor(t / W));
    bornes = { c0: Math.min(...cs), c1: Math.max(...cs), r0: Math.min(...rs), r1: Math.max(...rs) };
    const mil = (a, b) => [Math.floor((a + b) / 2), Math.ceil((a + b) / 2)];
    centre = mil(bornes.c0, bornes.c1).includes(meule % W) && mil(bornes.r0, bornes.r1).includes(Math.floor(meule / W));
    for (const t of piece.cases) {
      const c = t % W;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (c + dx < 0 || c + dx >= W) continue;
          const j = t + dy * W + dx, s = sorteDe(B[j]);
          if (s && s.mur) murs.add(j);
        }
      }
    }
    total = murs.size;
    hauts = [...murs].filter((j) => hauteurMur(state, j) >= H).length;
  }
  const conditions = [
    { id: 'meule', texte: 'Une meule dans une pièce close (des murs tout autour, et une porte)', ok: !!piece },
    { id: 'centre', texte: 'La meule au centre de la pièce', ok: centre },
    { id: 'hauteur', texte: `Les murs de la pièce hauts de ${H} blocs (${hauts} / ${total}) : en mode Construire, choisis le niveau 1 puis 2 et touche les murs pour les rehausser${total > hauts && hauts > 0 ? ` ; ${manquants(state, murs, H)}` : ''}`, ok: !!piece && total > 0 && hauts === total },
  ];
  return { ok: conditions.every((c) => c.ok), conditions, piece, meule: meule === undefined ? null : meule, bornes, murs: { hauts, total } };
}

// Les murs de la tour encore trop bas, dits pour les trouver (vu de 3/4, les blocs de leurs
// voisins les cachent) : leur côté et leur hauteur.
function manquants(state, murs, H) {
  const W = farmTerrain(state).LARGEUR, liste = [...murs].filter((j) => hauteurMur(state, j) < H);
  const cs = [...murs].map((t) => t % W), rs = [...murs].map((t) => Math.floor(t / W));
  const c0 = Math.min(...cs), c1 = Math.max(...cs), r0 = Math.min(...rs), r1 = Math.max(...rs);
  const cote = (t) => { const c = t % W, r = Math.floor(t / W); return r === r0 ? 'au fond' : r === r1 ? 'en façade' : c === c0 ? 'à gauche' : c === c1 ? 'à droite' : 'dedans'; };
  const parCote = {};
  for (const t of liste) { const k = `${cote(t)} (${hauteurMur(state, t)} bloc${hauteurMur(state, t) > 1 ? 's' : ''})`; parCote[k] = (parCote[k] || 0) + 1; }
  return `à rehausser : ${Object.entries(parCote).map(([k, n]) => `${n} ${k}`).join(', ')} — marqués en rouge aux niveaux 1 et 2`;
}

// Le Moulin de la ferme générée existe quand sa tour est bâtie (etatMoulin) : la station
// moulin (son appareil, ses moutures) suit. Appelée après chaque bloc posé ou repris.
export function majMoulin(state) {
  if (farmSeed(state) === null || !state.stations || !state.stations.moulin) return;
  const ok = etatMoulin(state).ok;
  if (ok && !state.stations.moulin.construit) openStation(state, 'moulin');
  else if (!ok) state.stations.moulin.construit = false;
}

/* ---------- le Silo de la ferme générée : des blocs de silo empilés ---------- */

// Les blocs de silo (fabriqués à l'Atelier une fois le Silo débloqué) se posent dehors, en
// colonnes jointives sur une même rangée de la carte : un bloc posé sur un autre rehausse sa
// colonne (jusqu'à SILO.HAUTEUR_MAX). Le Silo est là quand au moins SILO.LARGEUR colonnes
// sont hautes d'au moins SILO.HAUTEUR blocs : leurs blocs deviennent un silo en bois
// (js/carte/ferme/silo.js). Un seul silo ; sa capacité : SILO.BLES_PAR_BLOC blés par bloc de ces
// colonnes.

const estSilo = (sorte) => !!(sorteDe(sorte) && sorteDe(sorte).silo);

// Les cases des blocs de silo posés (les colonnes), de gauche à droite.
export function casesSilo(state) {
  const B = blocsPoses(state);
  return Object.keys(B).map(Number).filter((t) => estSilo(B[t])).sort((a, b) => a - b);
}

// La hauteur de la colonne de silo de `tile` (en blocs), 0 sans bloc de silo.
export function hauteurSilo(state, tile) {
  if (!estSilo(blocAt(state, tile))) return 0;
  const h = state.hauteurs && Number(state.hauteurs[tile]);
  return h > 1 ? Math.min(h, DATA.ATELIER.SILO.HAUTEUR_MAX) : 1;
}

// La hauteur d'un bloc qui s'empile (un mur, une colonne de silo), 0 sinon.
const hauteurEmpilee = (state, tile) => hauteurMur(state, tile) || hauteurSilo(state, tile);

// Un bloc de silo posé au sol en `tile` : pas d'autre silo ailleurs, la même rangée, à côté
// d'une colonne déjà là (ou le premier). Renvoie la raison d'un refus, ou ''.
function refusSilo(state, tile) {
  const cases = casesSilo(state);
  if (!cases.length) return '';
  const W = farmTerrain(state).LARGEUR, r = Math.floor(tile / W);
  const voisin = (k) => cases.includes(k) && Math.floor(k / W) === r;
  return voisin(tile - 1) || voisin(tile + 1) ? '' : 'Un seul silo sur la ferme : pose ce bloc juste à côté de ses colonnes (sur la même rangée), ou sur l\'une d\'elles pour la rehausser.';
}

// Ce qu'il faut pour que le Silo soit là, et ce qu'il est. Une colonne haute d'au moins
// SILO.HAUTEUR blocs est « pleine » : elle fait partie du silo ; plus basse, elle est en
// construction (ses blocs ne comptent pas encore). etatSilo(state) → { ok, conditions: [{ id,
// texte, ok }], cases (les colonnes, de gauche à droite), hauteurs, pleines (les cases des
// colonnes pleines), largeur, blocs (ceux des colonnes pleines), capacite (blés, 0 tant qu'il
// n'est pas là) }.
export function etatSilo(state) {
  const S = DATA.ATELIER.SILO, cases = casesSilo(state);
  const hauteurs = cases.map((t) => hauteurSilo(state, t));
  const pleines = cases.filter((_, i) => hauteurs[i] >= S.HAUTEUR);
  const blocs = hauteurs.filter((h) => h >= S.HAUTEUR).reduce((a, b) => a + b, 0);
  const conditions = [
    { id: 'largeur', texte: `Au moins ${S.LARGEUR} colonnes de blocs de silo côte à côte, dehors, sur une même rangée (${Math.min(cases.length, S.LARGEUR)} / ${S.LARGEUR})`, ok: cases.length >= S.LARGEUR },
    { id: 'hauteur', texte: `Au moins ${S.LARGEUR} colonnes hautes de ${S.HAUTEUR} blocs : pose un bloc sur une colonne pour la rehausser (${Math.min(pleines.length, S.LARGEUR)} / ${S.LARGEUR})`, ok: pleines.length >= S.LARGEUR },
  ];
  const ok = conditions.every((c) => c.ok);
  return { ok, conditions, cases, hauteurs, pleines, largeur: cases.length, blocs, capacite: ok ? blocs * S.BLES_PAR_BLOC : 0 };
}

// Le Silo de la ferme générée existe quand ses blocs le forment (etatSilo) ; son blé reste
// quand il ne l'est plus. Plus petit, ce qui ne tient plus revient dans l'inventaire ; plus
// grand, le blé de l'inventaire y entre. Appelée après chaque bloc posé ou repris.
export function majSilo(state) {
  if (farmSeed(state) === null || !state.silo || typeof state.silo !== 'object') return;
  const e = etatSilo(state), s = state.silo;
  s.construit = e.ok;
  if (!e.ok) return;
  if (!s.niveau) s.niveau = 1;
  if (s.ble > e.capacite) {
    const trop = s.ble - e.capacite;
    s.ble = e.capacite;
    addItem(state, DATA.SILO.ITEM, trop);
  }
  fillSilo(state);
}

