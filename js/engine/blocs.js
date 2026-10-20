import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { atelierConstruit, atelierOuvert } from './atelier.js';
import { farmSeed, farmTerrain, tileCount } from './terrain.js';
import { mainCharacter } from './depart.js';
import { memberHappiness, setHappiness } from './ville.js';
import { openStation } from './kitchen.js';
import { openSerre } from './crops.js';
import { fillSilo } from './animals.js';
import { arbreProche, arbreSurCase, planterArbre } from './orchard.js';
import { isUnlocked } from './campaign.js';
import { unlockLevel } from './levels.js';
import { installStarter, removeStarter, starterBlock } from './depart.js';
import { robotOn } from './automation.js';
import { rangerEtage } from './etage.js';

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

// Ce qui est posé sur le bloc de `tile` (la pompe sur le puits : state.blocsDessus), ou null.
export function blocDessus(state, tile) {
  return (state.blocsDessus && state.blocsDessus[tile]) || null;
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
export function changeMur(ancien, sorte) {
  const a = sorteDe(ancien), s = sorteDe(sorte);
  return !!(a && s && a.mur && s.mur && ancien !== sorte);
}

// Combien de blocs `sorte` peut-on encore poser ? (l'Atelier : 1 s'il est construit et pas
// encore posé)
export function blocsEnMain(state, sorte) {
  const s = sorteDe(sorte);
  if (!s) return 0;
  if (sorte === 'atelier') return atelierConstruit(state) && !Object.values(blocsPoses(state)).includes('atelier') ? 1 : 0;
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
  const vus = new Set(), out = [], max = DATA.ATELIER.PIECE_MAX;
  // une pièce touche forcément un bloc qui ferme : on part des cases voisines des blocs
  for (const k of Object.keys(B)) {
    const b = Number(k);
    if (!ferme(b)) continue;
    const c0 = b % W;
    for (const d of [c0 > 0 ? b - 1 : -1, c0 < W - 1 ? b + 1 : -1, b - W, b + W]) {
      if (d < 0 || d >= W * H || ferme(d) || vus.has(d)) continue;
      const cases = [], bord = new Set(), pile = [d];
      let ouverte = false;
      vus.add(d);
      while (pile.length) {
        const i = pile.pop(), c = i % W, r = Math.floor(i / W);
        cases.push(i);
        if (c === 0 || r === 0 || c === W - 1 || r === H - 1 || cases.length > max) { ouverte = true; }
        for (const j of [c > 0 ? i - 1 : -1, c < W - 1 ? i + 1 : -1, r > 0 ? i - W : -1, r < H - 1 ? i + W : -1]) {
          if (j < 0) continue;
          if (ferme(j)) { bord.add(j); continue; }
          if (!vus.has(j)) { vus.add(j); pile.push(j); }
        }
        if (ouverte && cases.length > max) break;
      }
      if (ouverte) continue;
      const portes = [...bord].filter((t) => sorteDe(B[t]).porte);
      if (!portes.length) continue;
      out.push({ cases: cases.sort((a, b2) => a - b2), portes: portes.sort((a, b2) => a - b2), paillasses: cases.filter((t) => B[t] === 'paillasse').sort((a, b2) => a - b2) });
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

/* ---------- ce que devient une pièce close : une maison ou un bâtiment ---------- */

// Le premier lit (paillasse) ou bloc clé posé dans une enceinte décide de ce qu'elle est :
//   - une maison : la paillasse, le four, la cuisinière (et les blocs sans genre, la batterie) ;
//   - un bâtiment : le nichoir (le Poulailler), la mangeoire (l'Étable), le bac à semis (la
//     Serre), le coffre à grain (le Silo), la meule (le Moulin). Un bâtiment n'a que son bloc
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
  if (sorte === 'paillasse' || s.station) return 'maison';
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

// Les paillasses où l'on peut dormir (dans une pièce close), dans l'ordre des pièces.
export function couchages(state) {
  return piecesCloses(state).flatMap((p) => p.paillasses);
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
  if (blocsEnMain(state, sorte) < 1) return { ok: false, raison: sorte === 'atelier' ? 'L\'Atelier est déjà posé (ou pas encore construit).' : `Plus de ${s.nom.toLowerCase()} : fabrique-en à l'Atelier.` };
  // le bloc clé d'un bâtiment (ou la meule du Moulin) : pas avant le niveau où il se débloque
  const verrou = s.batiment || s.debloque;
  if (verrou && !isUnlocked(state, verrou)) return { ok: false, raison: `${s.nom} : se pose à partir du niveau ${unlockLevel(verrou)}.` };
  // un mur posé : une fenêtre (ou une pierre d'angle) le remplace, la pièce reste close
  if (changeMur(blocAt(state, tile), sorte)) return { ok: true };
  if (s.unique && dejaPose(state, sorte)) return { ok: false, raison: `Il y a déjà ${s.nom.toLowerCase() === 'citerne' ? 'une' : 'un'} ${s.nom.toLowerCase()} sur la ferme.` };
  // la station du robot : quand il est là (récolte ou semis automatiques)
  if (s.robot && !robotOn(state)) return { ok: false, raison: 'Il faut d\'abord le robot : la récolte ou le semis automatiques (arbre des technologies).' };
  if (s.appareil) {
    const r = starterBlock(state, s.appareil);
    if (r) return { ok: false, raison: r === 'Répare d\'abord la maison.' ? 'Bâtis d\'abord ton foyer : une pièce close avec une paillasse.' : r === 'Achète d\'abord le panneau et la pompe.' ? 'Pose d\'abord le panneau solaire et la pompe.' : r };
  }
  // la pompe : sur le puits, sans prendre de case
  if (s.sur) {
    const sous = sorteDe(s.sur);
    if (blocAt(state, tile) !== s.sur) return { ok: false, raison: `${s.nom} : à poser sur ${sous ? sous.nom.toLowerCase() : s.sur}.` };
    if (blocDessus(state, tile)) return { ok: false, raison: 'Il y a déjà quelque chose dessus.' };
    return { ok: true };
  }
  // un sol (le plancher) : sous les blocs, pas sous ce qui ferme une pièce
  if (s.sol) {
    if (solAt(state, tile)) return { ok: false, raison: `Il y a déjà un ${sorteDe(solAt(state, tile)).nom.toLowerCase()} ici.` };
    const b = sorteDe(blocAt(state, tile));
    if (b && b.ferme) return { ok: false, raison: `${s.nom} : pas sous un mur, une porte ni l'Atelier.` };
  } else if (blocAt(state, tile)) return { ok: false, raison: 'Il y a déjà un bloc ici.' };
  if (s.ferme && solAt(state, tile)) return { ok: false, raison: `Un ${sorteDe(solAt(state, tile)).nom.toLowerCase()} ici : reprends-le d'abord.` };
  if (arbreSurCase(state, tile)) return { ok: false, raison: 'Un arbre pousse ici.' };
  // un arbre fruitier : loin des autres (son feuillage), à côté d'aucun bloc
  if (s.arbre && arbreProche(state, tile, DATA.ATELIER.ARBRE_ECART)) return { ok: false, raison: 'Trop près d\'un autre arbre : laisse-lui de la place.' };
  const ch = T.LIGNES[Math.floor(tile / T.LARGEUR)][tile % T.LARGEUR];
  if (ch !== '#' && ch !== '+') return { ok: false, raison: 'On ne bâtit que sur l\'herbe : pas sur les chemins, l\'eau, les arbres, les rochers ni les bâtiments.' };
  if ((state.potager.parcelles || []).some((p) => p.case === tile)) return { ok: false, raison: 'Une terre labourée : rebouche-la d\'abord.' };
  if (s.dedans && !dansPiece(state, tile)) return { ok: false, raison: `${s.nom} : à poser dans une pièce close (des murs tout autour, et une porte).` };
  if (s.dehors && dansPiece(state, tile)) return { ok: false, raison: `${s.nom} : à poser dehors, pas dans une pièce close.` };
  // une maison ou un bâtiment : pas de bloc d'un autre genre (le premier posé décide)
  const p = !s.ferme && !s.sol && pieceDe(state, tile);
  const refus = p && refusGenre(state, sorte, p);
  if (refus) return { ok: false, raison: refus };
  return { ok: true };
}

export function poserBloc(state, sorte, tile) {
  const st = poseStatus(state, sorte, tile);
  if (!st.ok) return fail(st.raison);
  const s = sorteDe(sorte);
  const ancien = blocAt(state, tile);
  if (s.objet) takeItem(state, s.objet, 1);
  if (changeMur(ancien, sorte)) {
    addItem(state, sorteDe(ancien).objet, 1);
    state.blocs[tile] = sorte;
    return { ok: true, sorte, case: tile, remplace: ancien };
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
  // le bloc clé d'un bâtiment (le nichoir : le Poulailler ; la mangeoire : l'Étable , le bac à semis : la Serre ; le coffre à grain : le Silo) : le bâtiment est construit
  if (s.batiment) ouvrirBatiment(state, s.batiment);
  // un four, une cuisinière : la station est là (étape 5b, la maison)
  if (s.station && state.stations[s.station]) openStation(state, s.station);
  majPoulailler(state);
  rangerEtage(state);   // (un mur qui coupe la pièce de l'escalier : l'étage rétrécit)
  return { ok: true, sorte, case: tile };
}

// Reprend le bloc de `tile` : son objet revient dans l'inventaire (l'Atelier redevient à
// poser). Une paillasse d'une pièce qui s'ouvre reste là, mais on n'y dort plus. Ce qui est
// posé dessus d'abord (la pompe sur le puits), puis le bloc, puis le sol (le plancher).
export function reprendreBloc(state, tile, opts) {
  const dessus = blocDessus(state, tile), bloc = blocAt(state, tile);
  const sorte = dessus || bloc || solAt(state, tile);
  if (!sorte) return fail('Il n\'y a pas de bloc ici.');
  // un mur ou une porte entre une maison et un bâtiment (ou deux bâtiments) : il reste
  if (!dessus && bloc && sorteDe(bloc).ferme && !(opts && opts.force)) {
    const melange = melangeSansMur(state, tile);
    if (melange) return fail(melange);
  }
  if (dessus) delete state.blocsDessus[tile];
  else if (bloc) delete state.blocs[tile];
  else delete state.sols[tile];
  const s = sorteDe(sorte);
  if (s && s.appareil) removeStarter(state, s.appareil);
  if (s && s.batiment && state[s.batiment] && !['poulailler', 'paturage'].includes(s.batiment)) state[s.batiment].construit = false;
  if (s && s.objet) addItem(state, s.objet, 1);
  // la station s'en va avec lui (s'il n'y en a pas une autre posée)
  if (s && s.station && state.stations[s.station] && !Object.values(blocsPoses(state)).includes(sorte)) state.stations[s.station].construit = false;
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
}
