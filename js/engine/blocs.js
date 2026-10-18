import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { addItem, countItem, takeItem } from './inventory.js';
import { atelierConstruit, atelierOuvert } from './atelier.js';
import { farmTerrain, tileCount } from './terrain.js';
import { mainCharacter } from './depart.js';
import { memberHappiness, setHappiness } from './ville.js';
import { openStation } from './kitchen.js';
import { openSerre } from './crops.js';
import { fillSilo } from './animals.js';
import { isUnlocked } from './campaign.js';
import { unlockLevel } from './levels.js';
import { installStarter, removeStarter, starterBlock } from './depart.js';

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

// La tuile est-elle dans une pièce close ?
export function dansPiece(state, tile) {
  return piecesCloses(state).some((p) => p.cases.includes(tile));
}

// Les paillasses où l'on peut dormir (dans une pièce close), dans l'ordre des pièces.
export function couchages(state) {
  return piecesCloses(state).flatMap((p) => p.paillasses);
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
  if (id === 'paturage') { if (!b.places) b.places = DATA.PATURAGE.PLACES_DEPART; } else if (!b.niveau) b.niveau = 1;
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
  if (s.unique && dejaPose(state, sorte)) return { ok: false, raison: `Il y a déjà ${s.nom.toLowerCase() === 'citerne' ? 'une' : 'un'} ${s.nom.toLowerCase()} sur la ferme.` };
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
  if (blocAt(state, tile)) return { ok: false, raison: 'Il y a déjà un bloc ici.' };
  const ch = T.LIGNES[Math.floor(tile / T.LARGEUR)][tile % T.LARGEUR];
  if (ch !== '#' && ch !== '+') return { ok: false, raison: 'On ne bâtit que sur l\'herbe : pas sur les chemins, l\'eau, les arbres, les rochers ni les bâtiments.' };
  if ((state.potager.parcelles || []).some((p) => p.case === tile)) return { ok: false, raison: 'Une terre labourée : rebouche-la d\'abord.' };
  if (s.dedans && !dansPiece(state, tile)) return { ok: false, raison: `${s.nom} : à poser dans une pièce close (des murs tout autour, et une porte).` };
  if (s.dehors && dansPiece(state, tile)) return { ok: false, raison: `${s.nom} : à poser dehors, pas dans une pièce close.` };
  return { ok: true };
}

export function poserBloc(state, sorte, tile) {
  const st = poseStatus(state, sorte, tile);
  if (!st.ok) return fail(st.raison);
  const s = sorteDe(sorte);
  if (s.objet) takeItem(state, s.objet, 1);
  if (s.sur) {
    if (!state.blocsDessus || typeof state.blocsDessus !== 'object') state.blocsDessus = {};
    state.blocsDessus[tile] = sorte;
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
  return { ok: true, sorte, case: tile };
}

// Reprend le bloc de `tile` : son objet revient dans l'inventaire (l'Atelier redevient à
// poser). Une paillasse d'une pièce qui s'ouvre reste là, mais on n'y dort plus.
export function reprendreBloc(state, tile) {
  // ce qui est posé dessus d'abord (la pompe sur le puits)
  const dessus = blocDessus(state, tile);
  const sorte = dessus || blocAt(state, tile);
  if (!sorte) return fail('Il n\'y a pas de bloc ici.');
  if (dessus) delete state.blocsDessus[tile];
  else delete state.blocs[tile];
  const s = sorteDe(sorte);
  if (s && s.appareil) removeStarter(state, s.appareil);
  if (s && s.batiment && state[s.batiment]) state[s.batiment].construit = false;
  if (s && s.objet) addItem(state, s.objet, 1);
  // la station s'en va avec lui (s'il n'y en a pas une autre posée)
  if (s && s.station && state.stations[s.station] && !Object.values(blocsPoses(state)).includes(sorte)) state.stations[s.station].construit = false;
  return { ok: true, sorte, case: tile };
}
