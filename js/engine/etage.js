// etage.js — un essai : l'escalier et le deuxième niveau (l'étage) au-dessus d'une pièce close.
//
// L'escalier (BLOCS escalier, fabriqué à l'Atelier) se pose dans une pièce close. Au-dessus de
// cette pièce et de ses murs (l'emprise : etageEmprise), il y a un étage : un plancher sur toute
// l'emprise, où l'on monte par l'escalier (la carte : js/carte/ferme/etage.js) et où l'on pose
// d'autres blocs (ETAGE_BLOCS : des murs, des portes, une paillasse, une lanterne, une
// barrière, des meubles ; ils n'ont pas d'autre effet que d'être là et d'arrêter le passage). Une case de
// l'emprise est libre : celle de l'escalier (on y redescend).
//
// state.etage = { [tuile]: sorte } : les blocs posés à l'étage. state.sensEtage = { [tuile]: 1 | 2 | 3 } : le
// sens d'un meuble de l'étage qui tourne (A-1, comme state.sens en bas : blocs.js sensBloc ; de face : rien).
// state.teintesEtage = { [tuile]: id } : la variante de couleur d'un meuble de l'étage (A-3, comme state.teintes
// en bas : blocs.js varianteBloc ; celle du dessin : rien). Une pièce qui perd son escalier
// (ou qui s'ouvre) perd son étage : ses blocs reviennent dans l'inventaire (rangerEtage).
//
// Les murs du bas rehaussés (blocs.js hauteurPile ≥ 2) sont les murs de l'étage, là où ils
// sont : rien d'autre ne s'y pose à l'étage, ils arrêtent le passage et ferment ses pièces.
// Aux niveaux 1 et 2, des sols (le plancher, les dalles…) se posent dans une pièce dont tout le
// pourtour monte à ce niveau (piecesNiveau), et au niveau 1 au-dessus de la pièce de l'escalier :
// state.solsEtage = { [tuile]: sorte } (niveau 1), state.solsHauts = { 2: { [tuile]: sorte } }
// (casesSolEtage, poserSolEtage, reprendreSolEtage : leur dernier argument, le niveau).

import { DATA } from './catalog.js';
import { fail } from './devices.js';
import { addItem, takeItem } from './inventory.js';
import { blocsEnMain, blocsPoses, changeMur, changeSol, empriseMeuble, genreBloc, hauteurMur, hauteurPile, matiereDessus, mesuresMeuble, piecesCloses, raisonFixe, solsPoses, tourneBloc, variantesBloc } from './blocs.js';
import { farmTerrain } from './terrain.js';
import { openStation } from './kitchen.js';
import { viderBoite } from './repas.js';
import { closeFridge, openFridge } from './fridge.js';

// Les blocs qui se posent à l'étage : un escalier (vers le niveau 2), des murs, des portes, une paillasse, une lanterne, un
// réverbère, une barrière, les meubles qui se posent au sol, les tableaux (sur un mur de l'étage :
// state.dessusEtage) et la décoration du jardin (des bancs, des tables, des bacs, des jarres… : DECOR_ETAGE).
// Les stations aussi (le créateur, novembre 2026 : « le joueur peut poser les stations à n'importe quel
// niveau ») : le réfrigérateur, la boîte à nourriture, le four, la cuisinière, le mortier, la meule
// (STATIONS_ETAGE). Ce qui sert dehors reste au sol (l'élevage, les machines, l'énergie, les arbres, la
// ruche, le puits, le silo).
export const DECOR_ETAGE = ['bac_fleurs', 'table_jardin', 'chaise_jardin', 'banc_jardin', 'banc_rondins', 'table_rondins', 'chaise_peinte', 'jarre_coquillages', 'lanterne_papier', 'bassin_nenuphars', 'banc_pierre', 'jardiniere_pierre', 'pergola', 'bac_lavande'];
export const STATIONS_ETAGE = ['refrigerateur', 'boite_nourriture', 'four', 'cuisiniere', 'mortier', 'meule'];
export const ETAGE_BLOCS = ['escalier', 'mur_pierre', 'mur_fenetre', 'fenetre_ronde', 'fenetre_cintree', 'fenetre_volets', 'fenetre_vitrail', 'pierre_angle', 'paroi_vitree', 'mur_brique_rouge', 'mur_brique_orange', 'mur_brique_ocre', 'mur_brique_bleue', 'mur_pierre_taille', 'mur_bois', 'porte', 'porte_chene', 'porte_vitree', 'porte_grange', 'porte_bleue', 'porte_fer', 'porte_ecurie', 'porte_blanche', 'paillasse', 'lanterne', 'candelabre', 'barriere', 'barriere_blanche', 'barriere_rouge', 'barriere_grise', 'barriere_chene', 'barriere_verte', 'barriere_lavande']
  .concat(Object.keys(DATA.ATELIER.BLOCS).filter((k) => DATA.ATELIER.BLOCS[k].meuble && !DATA.ATELIER.BLOCS[k].frigo))
  .concat(DECOR_ETAGE.filter((k) => DATA.ATELIER.BLOCS[k]))
  .concat(STATIONS_ETAGE.filter((k) => DATA.ATELIER.BLOCS[k]));

// Le bloc `sorte` est-il posé quelque part, en bas ou à un étage ? (une station : elle reste ouverte
// tant qu'il en reste une)
export function sortePosee(state, sorte) {
  return Object.values(blocsPoses(state)).includes(sorte) || niveauxEtage().some((n) => Object.values(etageBlocs(state, n)).includes(sorte));
}

// Les niveaux où l'on bâtit au-dessus du sol : 1 à ATELIER.HAUTEUR_MAX - 1 (chaque niveau, les mêmes
// mécaniques : le créateur, novembre 2026).
export const niveauxEtage = () => Array.from({ length: Math.max(0, DATA.ATELIER.HAUTEUR_MAX - 1) }, (_, i) => i + 1);

// Le rangement d'un niveau. Au niveau 1, les clés d'origine : state.etage (les blocs), state.sensEtage,
// state.teintesEtage, state.fenetresEtage (le mur autour d'une fenêtre), state.dessusEtage (les tableaux),
// state.fenetresHautes (une fenêtre dans le haut d'un mur du bas rehaussé). Plus haut :
// state.niveauxHauts[n] = { blocs, sens, teintes, fenetres, dessus, hautes }, les mêmes.
const CLES_1 = { blocs: 'etage', sens: 'sensEtage', teintes: 'teintesEtage', fenetres: 'fenetresEtage', dessus: 'dessusEtage', hautes: 'fenetresHautes' };
function rangement(state, n, nom) {
  const o = n <= 1 ? state[CLES_1[nom]] : state.niveauxHauts && state.niveauxHauts[n] && state.niveauxHauts[n][nom];
  return o && typeof o === 'object' ? o : {};
}
function rangementAEcrire(state, n, nom) {
  if (n <= 1) {
    const k = CLES_1[nom];
    if (!state[k] || typeof state[k] !== 'object') state[k] = {};
    return state[k];
  }
  if (!state.niveauxHauts || typeof state.niveauxHauts !== 'object') state.niveauxHauts = {};
  if (!state.niveauxHauts[n] || typeof state.niveauxHauts[n] !== 'object') state.niveauxHauts[n] = {};
  const N = state.niveauxHauts[n];
  if (!N[nom] || typeof N[nom] !== 'object') N[nom] = {};
  return N[nom];
}

// Ce qui est accroché sur les murs du niveau `n` (les tableaux) : { [tuile]: sorte }, comme
// state.blocsDessus en bas.
export function dessusEtage(state, n = 1) {
  return rangement(state, n, 'dessus');
}
const surMur = (sorte) => !!(DATA.ATELIER.BLOCS[sorte] && DATA.ATELIER.BLOCS[sorte].sur === 'mur');
// La case `tile` est-elle un mur plein du niveau `n` (où s'accroche un tableau) ? Un mur posé à ce niveau
// (pas une fenêtre, une porte, la paroi vitrée), ou un mur du bas rehaussé jusqu'à ce niveau.
export function murEtage(state, tile, n = 1) {
  const e = etageBlocs(state, n)[tile];
  if (e) return murPlein(e) && !(DATA.ATELIER.BLOCS[e] && DATA.ATELIER.BLOCS[e].porte);
  return empriseNiveau(state, n).has(tile) && hauteurPile(state, tile) >= n + 1 && !fenetresHautes(state, n)[tile];
}

// Les blocs posés au niveau `n` : { [tuile]: sorte }.
export function etageBlocs(state, n = 1) {
  return rangement(state, n, 'blocs');
}

// Les fenêtres du niveau `n` percées dans un mur posé à ce niveau : { [case]: sorte du mur }, comme celles
// du bas (blocs.js fenetresPosees).
export function fenetresEtage(state, n = 1) {
  return rangement(state, n, 'fenetres');
}
// Les fenêtres du niveau `n` percées dans un mur du bas rehaussé jusqu'à ce niveau (ou plus haut) :
// { [case]: sorte de la fenêtre }. Le mur garde sa hauteur (state.hauteurs) : la pièce reste close
// (piecesNiveau).
export function fenetresHautes(state, n = 1) {
  return rangement(state, n, 'hautes');
}
const estFen = (sorte) => !!(DATA.ATELIER.BLOCS[sorte] && DATA.ATELIER.BLOCS[sorte].fenetre);
const murPlein = (sorte) => !!(DATA.ATELIER.BLOCS[sorte] && DATA.ATELIER.BLOCS[sorte].mur && !estFen(sorte)) && sorte !== 'paroi_vitree';
function setFenetreEtage(state, tile, mur, n = 1) {
  if (!mur) { delete rangement(state, n, 'fenetres')[tile]; return; }
  rangementAEcrire(state, n, 'fenetres')[tile] = mur;
}

// Le sens du meuble du niveau `n` posé sur `tile` (0 à 3 ; A-1).
export function sensEtage(state, tile, n = 1) {
  const v = Number(rangement(state, n, 'sens')[tile]);
  return v >= 1 && v <= 3 ? v : 0;
}
function setSensEtage(state, tile, sens, n = 1) {
  const v = ((Math.floor(Number(sens) || 0) % 4) + 4) % 4;
  if (v && tourneBloc(etageBlocs(state, n)[tile])) rangementAEcrire(state, n, 'sens')[tile] = v;
  else delete rangement(state, n, 'sens')[tile];
}

// La variante de couleur du meuble du niveau `n` posé sur `tile` (son id), ou null : celle du dessin (A-3).
export function varianteEtage(state, tile, n = 1) {
  const v = rangement(state, n, 'teintes')[tile];
  return typeof v === 'string' ? v : null;
}
function setVarianteEtage(state, tile, v, n = 1) {
  const sorte = etageBlocs(state, n)[tile];
  if (sorte && v && variantesBloc(sorte).some((x, i) => i > 0 && x.id === v)) rangementAEcrire(state, n, 'teintes')[tile] = v;
  else delete rangement(state, n, 'teintes')[tile];
}
// (un bloc ôté du niveau `n` : son sens et sa couleur avec lui)
function oterEtage(state, tile, n) {
  delete rangement(state, n, 'blocs')[tile];
  delete rangement(state, n, 'sens')[tile];
  delete rangement(state, n, 'teintes')[tile];
}

// Repeindre le meuble du niveau `n` de la case `tile` (une de ses cases), comme en bas (blocs.js peindreBloc).
export function peindreEtage(state, tile, v, n = 1) {
  if (!etageBlocs(state, n)[tile] && etageCouvertes(state, n).has(tile)) tile = etageCouvertes(state, n).get(tile);
  const sorte = etageBlocs(state, n)[tile];
  if (!sorte) return fail('Il n\'y a pas de meuble ici.');
  const l = variantesBloc(sorte);
  if (!l.length) return fail(`${DATA.ATELIER.BLOCS[sorte].nom} : une seule couleur pour l'instant.`);
  const id = v || l[0].id;
  if (!l.some((x) => x.id === id)) return fail(`${DATA.ATELIER.BLOCS[sorte].nom} : pas de couleur « ${id} ».`);
  const avant = varianteEtage(state, tile, n) || l[0].id;
  setVarianteEtage(state, tile, id, n);
  return { ok: true, sorte, case: tile, variante: id, avant, etage: true, ...(n > 1 ? { niveau: n } : {}) };
}

// Les cases du niveau `n` couvertes par un meuble de plusieurs cases, hors la sienne (dans son sens) :
// Map(case → case du meuble).
export function etageCouvertes(state, n = 1) {
  const out = new Map();
  for (const [k, sorte] of Object.entries(etageBlocs(state, n))) {
    const s = DATA.ATELIER.BLOCS[sorte], t = Number(k);
    if (!s || !s.meuble) continue;
    for (const j of empriseMeuble(state, sorte, t, sensEtage(state, t, n)) || []) if (j !== t) out.set(j, t);
  }
  return out;
}

// Les escaliers posés (leurs cases).
export function escaliers(state) {
  return Object.entries(blocsPoses(state)).filter(([, s]) => s === 'escalier').map(([t]) => Number(t));
}
// Les escaliers posés à l'étage, qui montent au niveau 2 (leurs cases).
export function escaliersEtage(state) {
  return Object.entries(etageBlocs(state)).filter(([, s]) => s === 'escalier').map(([t]) => Number(t));
}

// L'emprise du niveau 2 : les pièces du niveau 2 (piecesNiveau) où un escalier de l'étage est
// posé, et les murs qui les bordent. On y monte par cet escalier ; on y marche sur ses sols
// (state.solsHauts[2]), entre les murs du bas qui montent au niveau 3. Un Set de tuiles.
let e2Pieces = null, e2Cle = null, e2Set = null;
export function etage2Emprise(state) {
  // (gardée tant que les pièces closes, les blocs de l'étage et les hauteurs des murs n'ont pas changé)
  const pieces = piecesCloses(state), cle = JSON.stringify(etageBlocs(state)) + JSON.stringify(state.hauteurs || null);
  if (pieces === e2Pieces && cle === e2Cle) return e2Set;
  const out = new Set(), E = etageBlocs(state), un = etageEmprise(state);
  e2Pieces = pieces; e2Cle = cle; e2Set = out;
  if (!un.size) return out;
  for (const p of piecesNiveau(state, 2)) {
    if (!p.cases.some((t) => E[t] === 'escalier' && un.has(t))) continue;
    for (const t of avecMurs(state, p.cases)) out.add(t);
  }
  return out;
}

// Une pièce close et les blocs qui ferment autour d'elle (les huit voisines) : un Set de tuiles.
function avecMurs(state, cases) {
  const out = new Set(), B = blocsPoses(state), W = farmTerrain(state).LARGEUR;
  for (const t of cases) {
    out.add(t);
    const c = t % W;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (c + dx < 0 || c + dx >= W) continue;
        const j = t + dy * W + dx, s = DATA.ATELIER.BLOCS[B[j]];
        if (s && s.ferme) out.add(j);
      }
    }
  }
  return out;
}

// L'emprise de l'étage : les cases des pièces closes où un escalier est posé, et celles des pièces
// dont tout le pourtour monte au niveau 1 (piecesNiveau : on y bâtit avant d'y mettre l'escalier, le
// créateur, novembre 2026), avec les murs et les portes qui les bordent (les huit voisines). Un Set
// de tuiles.
// (gardée tant que les pièces closes et les hauteurs des murs n'ont pas changé : la même liste, venue
// du cache de piecesCloses, veut dire les mêmes blocs posés, escaliers compris. Le mode Construire la
// lit pour chaque case affichée. Les appelants ne font que la lire.)
let empPieces = null, empCle = null, empSet = null;
export function etageEmprise(state) {
  const pieces = piecesCloses(state), cle = JSON.stringify(state.hauteurs || null);
  if (pieces === empPieces && cle === empCle) return empSet;
  const out = new Set();
  const B = blocsPoses(state);
  empPieces = pieces; empCle = cle; empSet = out;
  const hautes = new Set(piecesNiveau(state, 1).map((p) => p.cases));
  for (const p of pieces) {
    if (!hautes.has(p.cases) && !p.cases.some((t) => B[t] === 'escalier')) continue;
    for (const t of avecMurs(state, p.cases)) out.add(t);
  }
  return out;
}

// L'emprise du niveau `n`, où l'on bâtit à ce niveau : au niveau 1, etageEmprise ; plus haut, les pièces
// closes dont tout le pourtour monte au niveau n (piecesNiveau : avec ou sans escalier, comme au niveau 1)
// et les murs qui les bordent. Un Set de tuiles. (On y marche par l'escalier de l'étage : etage2Emprise.)
let empHautes = new Map();
export function empriseNiveau(state, n = 1) {
  if (n <= 1) return etageEmprise(state);
  const pieces = piecesNiveau(state, n), g = empHautes.get(n);
  if (g && g.pieces === pieces) return g.set;
  const out = new Set();
  for (const p of pieces) for (const t of avecMurs(state, p.cases)) out.add(t);
  empHautes.set(n, { pieces, set: out });
  return out;
}

// Les toits : chaque bâtiment (une pièce close aménagée : un bloc qui en fait une maison ou un
// bâtiment, un plancher ou un escalier ; plusieurs pièces sans escalier qui partagent un mur ou
// une porte n'en font qu'un) a le sien, posé sur son dernier niveau. Une pièce close
// sans rien de tout ça reste à ciel ouvert : une cour, un passage enfermé entre les murs de
// bâtiments voisins.
//   - une pièce sans escalier : sur ses murs (niveau 0 ; ses murs rehaussés, version 1.25 : un
//     niveau de plus par bloc du plus bas d'entre eux, la tour du Moulin) ;
//   - une pièce à escalier : sur les murs de l'étage, au-dessus de ce qu'ils ferment dans
//     l'emprise (niveau 1 ; plus haut quand tous ses murs sont des murs du bas rehaussés plus
//     haut : le plus bas d'entre eux) ; un étage sans murs tout autour reste à ciel ouvert (une terrasse).
// [{ niveau, cases: [tuiles couvertes], dedans: [tuiles d'où l'on est dans le bâtiment], verre (la Serre),
//    maison (une pièce de la maison : on y allume la nuit, js/carte/ferme/fenetres.js) }]
// (gardés tant que la partie n'a pas changé ce dont ils dépendent : les blocs du bas, ceux de l'étage,
// les sols, les hauteurs des murs ; comme piecesCloses, blocs.js. Les appelants ne font que les lire.)
let toitsCle = null, toitsListe = [];
export function toits(state) {
  const B = blocsPoses(state), E = etageBlocs(state), W = farmTerrain(state).LARGEUR;
  const cle = W + ':' + JSON.stringify(B) + JSON.stringify(E) + JSON.stringify(solsPoses(state)) + JSON.stringify(state.hauteurs || null) + JSON.stringify(state.rehausses || null);
  if (cle === toitsCle) return toitsListe;
  toitsListe = calculerToits(state, B, E, W);
  toitsCle = cle;
  return toitsListe;
}
function calculerToits(state, B, E, W) {
  const ferme = (t) => { const s = DATA.ATELIER.BLOCS[E[t]]; return !!(s && s.ferme) || hauteurPile(state, t) >= 2; };
  const out = [], simples = [], S = solsPoses(state), tri = (a) => [...a].sort((x, y) => x - y);
  for (const p of piecesCloses(state)) {
    if (!p.cases.some((t) => genreBloc(B[t]) || S[t] || B[t] === 'escalier')) continue;   // (une cour)
    const emprise = avecMurs(state, p.cases);
    // (la Serre, la pièce du bac à semis : un toit de verre, on voit ce qui pousse dessous)
    const verre = p.cases.some((t) => B[t] === 'bac_semis');
    const maison = p.cases.some((t) => genreBloc(B[t]) === 'maison');
    if (!p.cases.some((t) => B[t] === 'escalier')) {
      const hauts = [...emprise].map((t) => hauteurMur(state, t)).filter((h) => h > 0);
      simples.push({ niveau: hauts.length ? Math.min(...hauts) - 1 : 0, emprise, verre, maison });
      continue;
    }
    // à l'étage : les cases libres de l'emprise qu'on ne rejoint pas depuis son bord
    const voisins = (t) => { const c = t % W; return [c > 0 ? t - 1 : -1, c < W - 1 ? t + 1 : -1, t - W, t + W]; };
    const libre = (t) => emprise.has(t) && !ferme(t);
    const ouvert = new Set(), pile = [];
    for (const t of emprise) if (libre(t) && voisins(t).some((j) => !emprise.has(j))) { ouvert.add(t); pile.push(t); }
    while (pile.length) for (const j of voisins(pile.pop())) if (libre(j) && !ouvert.has(j)) { ouvert.add(j); pile.push(j); }
    const vus = new Set();
    for (const t of emprise) {
      if (!libre(t) || ouvert.has(t) || vus.has(t)) continue;
      const zone = [t], cases = new Set();
      vus.add(t);
      for (let i = 0; i < zone.length; i++) {
        const k = zone[i], c = k % W;
        cases.add(k);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (c + dx < 0 || c + dx >= W) continue;
            const j = k + dy * W + dx;
            if (ferme(j) && emprise.has(j)) cases.add(j);
          }
        }
        for (const j of voisins(k)) if (libre(j) && !vus.has(j)) { vus.add(j); zone.push(j); }
      }
      // (posé sur le plus bas de ses murs : un mur de l'étage, au niveau 1 ; un mur du bas qui
      // monte plus haut que l'étage, à son sommet)
      const hauts = [...cases].filter((j) => ferme(j)).map((j) => (E[j] && DATA.ATELIER.BLOCS[E[j]] && DATA.ATELIER.BLOCS[E[j]].ferme ? 2 : hauteurPile(state, j)));
      out.push({ niveau: Math.max(1, Math.min(...hauts) - 1), cases: tri(cases), dedans: tri(emprise), verre, maison });
    }
  }
  // les pièces sans escalier qui partagent un mur ou une porte forment un seul bâtiment, sous un
  // seul toit (posé sur le plus bas de leurs murs) ; la Serre garde son toit de verre à part
  const groupes = [];
  for (const p of simples) {
    const lies = groupes.filter((g) => g.verre === p.verre && [...p.emprise].some((t) => g.emprise.has(t)));
    const g = { niveau: p.niveau, emprise: new Set(p.emprise), verre: p.verre, maison: p.maison };
    for (const l of lies) {
      for (const t of l.emprise) g.emprise.add(t);
      g.niveau = Math.min(g.niveau, l.niveau);
      g.maison = g.maison || l.maison;
      groupes.splice(groupes.indexOf(l), 1);
    }
    groupes.push(g);
  }
  return groupes.map((g) => ({ niveau: g.niveau, cases: tri(g.emprise), dedans: tri(g.emprise), verre: g.verre, maison: g.maison })).concat(out);
}

// Les couchages de l'étage : ses paillasses et ses lits, dans une pièce close de l'étage (des
// murs de l'étage tout autour : un toit de niveau 1), dans l'ordre des cases. Identifiants
// « etage:<tuile> » (blocs.js couchages : après ceux du bas).
export function couchagesEtage(state) {
  const E = etageBlocs(state);
  if (!Object.keys(E).length) return [];
  const clos = new Set();
  for (const t of toits(state)) if (t.niveau === 1) for (const c of t.cases) clos.add(c);
  return Object.keys(E).map(Number).filter((t) => clos.has(t) && (E[t] === 'paillasse' || (DATA.ATELIER.BLOCS[E[t]] && DATA.ATELIER.BLOCS[E[t]].lit)))
    .sort((a, b) => a - b).map((t) => 'etage:' + t);
}

// Une station posée à l'étage : elle est là, comme en bas (blocs.js poserBloc) ; reprise (ou rangée),
// elle s'en va s'il n'en reste pas une autre, en bas ou à l'étage (blocs.js reprendreBloc).
function stationPosee(state, sorte) {
  const s = DATA.ATELIER.BLOCS[sorte];
  if (!s) return;
  if (s.frigo) openFridge(state);
  if (s.station && s.station !== 'moulin' && state.stations && state.stations[s.station]) openStation(state, s.station);
}
function stationReprise(state, sorte) {
  const s = DATA.ATELIER.BLOCS[sorte];
  if (!s) return;
  if (s.boite && !sortePosee(state, sorte)) viderBoite(state);
  if (s.frigo && !sortePosee(state, sorte)) closeFridge(state);
  if (s.station && s.station !== 'moulin' && state.stations && state.stations[s.station] && !sortePosee(state, sorte)) state.stations[s.station].construit = false;
}

// Ce qui est sous la case `tile` au niveau `n` et qui en est le plancher ouvert : le haut d'un escalier
// (en bas pour le niveau 1, au niveau d'en dessous plus haut). On ne pose rien dessus.
const hautEscalier = (state, tile, n) => (n <= 1 ? blocsPoses(state)[tile] : etageBlocs(state, n - 1)[tile]) === 'escalier';
const nomNiveau = (n) => (n <= 1 ? 'l\'étage' : `le niveau ${n}`);
const auNiveau = (n) => (n <= 1 ? 'à l\'étage' : `au niveau ${n}`);

// Peut-on poser `sorte` au niveau `n` (1 : l'étage), sur `tile` (dans le sens `sens` : un meuble qui
// tourne) ? { ok, raison }. Chaque niveau a les mêmes règles (le créateur, novembre 2026).
export function poseEtageStatus(state, sorte, tile, sens = 0, n = 1) {
  const s = DATA.ATELIER.BLOCS[sorte];
  if (!s || !ETAGE_BLOCS.includes(sorte)) return { ok: false, raison: `${s ? s.nom : 'Ce bloc'} : ne se pose pas ${auNiveau(n)} (il sert dehors).` };
  // (un escalier monte au niveau du dessus : pas au dernier niveau)
  if (sorte === 'escalier' && n + 1 >= DATA.ATELIER.HAUTEUR_MAX) return { ok: false, raison: `Escalier : ${nomNiveau(n)} est le dernier niveau, il n'y a rien au-dessus.` };
  if (!empriseNiveau(state, n).has(tile)) return { ok: false, raison: `${n <= 1 ? 'À l\'étage' : `Au niveau ${n}`}, on bâtit au-dessus d'une pièce close dont les murs montent ${auNiveau(n)}${n <= 1 ? ', ou qui a un escalier' : ''}.` };
  if (s.boite && state.frigo && state.frigo.construit) return { ok: false, raison: 'La famille mange au réfrigérateur : la boîte à nourriture ne sert plus.' };
  const D = dessusEtage(state, n);
  // (un tableau : sur un mur de ce niveau, un seul par mur)
  if (s.sur === 'mur') {
    if (!murEtage(state, tile, n)) return { ok: false, raison: `${s.nom} : à accrocher sur un mur de ${nomNiveau(n)}.` };
    if (D[tile]) return { ok: false, raison: 'Un tableau est déjà accroché ici.' };
    if (blocsEnMain(state, sorte) < 1) return { ok: false, raison: `Plus de ${s.nom.toLowerCase()} : achète-en un.` };
    return { ok: true };
  }
  if (D[tile]) return { ok: false, raison: 'Un tableau est accroché ici : reprends-le d\'abord.' };
  if (hautEscalier(state, tile, n)) return { ok: false, raison: 'Ici, c\'est le haut de l\'escalier.' };
  if (hauteurPile(state, tile) >= n + 1) {
    // (une fenêtre se perce dans le haut d'un mur du bas rehaussé jusqu'à ce niveau, qui reste rehaussé :
    // fenetresHautes ; la pièce reste close)
    if (!estFen(sorte)) return { ok: false, raison: `Le mur du bas monte jusqu'ici : il est déjà le mur de ${nomNiveau(n)}.` };
    if (fenetresHautes(state, n)[tile]) return { ok: false, raison: 'Une fenêtre est déjà percée ici : reprends-la d\'abord.' };
    if (!murPlein(matiereDessus(state, tile))) return { ok: false, raison: 'Ici, le haut du mur n\'est pas un mur plein.' };
    if (blocsEnMain(state, sorte) < 1) return { ok: false, raison: `Plus de ${s.nom.toLowerCase()} : fabrique-en à l'Atelier.` };
    return { ok: true, percerHaut: true };
  }
  // (l'escalier d'un niveau : dans une pièce dont les murs montent tous au niveau du dessus)
  if (sorte === 'escalier' && !casesSolEtage(state, n + 1).has(tile)) return { ok: false, raison: `L'escalier ${n <= 1 ? 'de l\'étage' : `du niveau ${n}`} se pose dans une pièce dont les murs montent tous au niveau ${n + 1}.` };
  const H = etageBlocs(state, n);
  if (H[tile] && !changeMur(H[tile], sorte)) return { ok: false, raison: 'Il y a déjà un bloc ici.' };
  const couvertes = etageCouvertes(state, n);
  if (couvertes.has(tile)) return { ok: false, raison: 'Un meuble occupe cette case.' };
  // un meuble de plusieurs cases : toutes à ce niveau, libres
  if (s.meuble) {
    const E = empriseNiveau(state, n);
    const m = mesuresMeuble(sorte, tourneBloc(sorte) ? sens : 0);
    const cases = empriseMeuble(state, sorte, tile, tourneBloc(sorte) ? sens : 0);
    if (!cases || !cases.every((j) => E.has(j) && !hautEscalier(state, j, n) && hauteurPile(state, j) < n + 1 && (j === tile || (!H[j] && !couvertes.has(j))))) {
      return { ok: false, raison: `${s.nom} : il lui faut ${m.largeur} × ${m.hauteur} cases libres ${auNiveau(n)} (vers la droite${m.hauteur > 1 ? ' et vers le haut' : ''}).` };
    }
  }
  if (blocsEnMain(state, sorte) < 1) return { ok: false, raison: `Plus de ${s.nom.toLowerCase()} : fabrique-en à l'Atelier.` };
  return { ok: true };
}

export function poserEtage(state, sorte, tile, sens = 0, variante = null, n = 1) {
  const st = poseEtageStatus(state, sorte, tile, sens, n);
  if (!st.ok) return fail(st.raison);
  takeItem(state, DATA.ATELIER.BLOCS[sorte].objet, 1);
  const niv = n > 1 ? { niveau: n } : {};
  if (surMur(sorte)) {
    rangementAEcrire(state, n, 'dessus')[tile] = sorte;
    return { ok: true, sorte, case: tile, etage: true, dessus: true, ...niv };
  }
  // une fenêtre dans le haut d'un mur du bas rehaussé : le mur reste (state.hauteurs), la fenêtre est
  // notée à part (fenetresHautes) ; reprise, elle laisse le mur
  if (st.percerHaut) {
    rangementAEcrire(state, n, 'hautes')[tile] = sorte;
    return { ok: true, sorte, case: tile, etage: true, haute: true, perce: matiereDessus(state, tile), ...niv };
  }
  const ancien = etageBlocs(state, n)[tile], dans = fenetresEtage(state, n)[tile];
  const E = rangementAEcrire(state, n, 'blocs');
  // une fenêtre dans un mur plein : il reste autour d'elle
  if (ancien && estFen(sorte) && murPlein(ancien)) {
    setFenetreEtage(state, tile, ancien, n);
    E[tile] = sorte;
    return { ok: true, sorte, case: tile, etage: true, perce: ancien, ...niv };
  }
  // un mur changé (une porte à la place d'un mur en pierre) : l'ancien revient ; à la place d'une
  // fenêtre (sauf une autre fenêtre), son mur aussi
  if (ancien) addItem(state, DATA.ATELIER.BLOCS[ancien].objet, 1);
  if (dans && !(estFen(sorte) && estFen(ancien))) {
    addItem(state, DATA.ATELIER.BLOCS[dans].objet, 1);
    setFenetreEtage(state, tile, null, n);
  }
  E[tile] = sorte;
  setSensEtage(state, tile, tourneBloc(sorte) ? sens : 0, n);
  setVarianteEtage(state, tile, variante, n);
  stationPosee(state, sorte);
  if (ancien) stationReprise(state, ancien);
  // (un escalier : ce qui était posé au niveau du dessus, sur son haut, revient dans l'inventaire)
  if (sorte === 'escalier') rangerEtage(state);
  const v = sensEtage(state, tile, n), t = varianteEtage(state, tile, n);
  return { ok: true, sorte, case: tile, etage: true, ...niv, ...(ancien ? { remplace: ancien } : {}), ...(v ? { sens: v } : {}), ...(t ? { variante: t } : {}) };
}

// Reprend le bloc du niveau `n` posé sur `tile` (ou le meuble qui couvre `tile`) : son objet revient
// dans l'inventaire.
export function reprendreEtage(state, tile, n = 1) {
  const niv = n > 1 ? { niveau: n } : {};
  // (un tableau accroché : repris d'abord, le mur reste)
  const haut = dessusEtage(state, n)[tile];
  if (haut) {
    delete rangement(state, n, 'dessus')[tile];
    addItem(state, DATA.ATELIER.BLOCS[haut].objet, 1);
    return { ok: true, sorte: haut, case: tile, etage: true, dessus: true, ...niv };
  }
  // (une fenêtre percée dans le haut d'un mur du bas rehaussé : reprise, le mur reste)
  const fh = fenetresHautes(state, n)[tile];
  if (fh && !etageBlocs(state, n)[tile]) {
    delete rangement(state, n, 'hautes')[tile];
    addItem(state, DATA.ATELIER.BLOCS[fh].objet, 1);
    return { ok: true, sorte: fh, case: tile, etage: true, haute: true, reste: matiereDessus(state, tile), ...niv };
  }
  if (!etageBlocs(state, n)[tile] && etageCouvertes(state, n).has(tile)) tile = etageCouvertes(state, n).get(tile);
  const sorte = etageBlocs(state, n)[tile];
  if (!sorte) return fail('Il n\'y a pas de bloc ici.');
  // une fenêtre percée dans un mur : elle revient, le mur reste
  const mur = fenetresEtage(state, n)[tile], sens = sensEtage(state, tile, n), variante = varianteEtage(state, tile, n);
  oterEtage(state, tile, n);
  if (estFen(sorte) && mur) rangementAEcrire(state, n, 'blocs')[tile] = mur;
  setFenetreEtage(state, tile, null, n);
  addItem(state, DATA.ATELIER.BLOCS[sorte].objet, 1);
  stationReprise(state, sorte);
  return { ok: true, sorte, case: tile, etage: true, ...niv, ...(mur && estFen(sorte) ? { reste: mur } : {}), ...(sens ? { sens } : {}), ...(variante ? { variante } : {}) };
}

// Déplacer un bloc du niveau `n` (le mode Construire : un glissement, comme en bas : blocs.js deplacerBloc) :
// celui de la case `de` (un meuble : une de ses cases) repris, puis reposé avec sa case d'ancrage sur
// `vers`, dans son sens et sa couleur. S'il ne tient pas là, il est reposé où il était : { ok: false,
// error }. Sinon { ok: true, sorte, de (son ancienne case d'ancrage), vers, etage }.
export function deplacerEtage(state, de, vers, n = 1) {
  const r = reprendreEtage(state, de, n);
  if (!r.ok) return r;
  const sens = r.sens || 0, v = r.variante || null, niv = n > 1 ? { niveau: n } : {};
  const remet = () => poserEtage(state, r.sorte, r.case, sens, v, n);
  if (r.case === vers) { remet(); return { ok: true, sorte: r.sorte, de: r.case, vers, etage: true, ...niv }; }
  const st = poseEtageStatus(state, r.sorte, vers, sens, n);
  if (!st.ok) { remet(); return fail(st.raison); }
  const p = poserEtage(state, r.sorte, vers, sens, v, n);
  if (!p.ok) { remet(); return p; }
  return { ok: true, sorte: r.sorte, de: r.case, vers, etage: true, ...niv };
}

// Le bloc du niveau `n` de la case `de` tiendrait-il, ancré sur `vers` ? Sur une copie de la partie : rien
// ne change. { ok, raison, cases } (cases : celles qu'il couvrirait, pour l'aperçu).
export function deplacerEtageStatus(state, de, vers, n = 1) {
  const copie = structuredClone(state);
  const r = reprendreEtage(copie, de, n);
  if (!r.ok) return { ok: false, raison: r.error, cases: [vers] };
  const cases = empriseMeuble(copie, r.sorte, vers, r.sens || 0) || [vers];
  const st = poseEtageStatus(copie, r.sorte, vers, r.sens || 0, n);
  return { ok: st.ok, raison: st.ok ? '' : st.raison, cases };
}

// Tourner d'un quart de tour le meuble du niveau `n` de la case `tile` (une de ses cases), comme en bas
// (blocs.js tournerBloc) : un meuble qui ne tient pas dans le sens suivant passe au sens d'après ;
// aucun ne tient : il reste comme il est. → { ok, sorte, case, sens, etage } ou un refus.
export function tournerEtage(state, tile, pas = 1, n = 1) {
  // (un tableau accroché à un mur : il suit le mur, comme en bas)
  const haut = dessusEtage(state, n)[tile];
  if (haut) return fail(raisonFixe(state, tile, haut));
  if (!etageBlocs(state, n)[tile] && etageCouvertes(state, n).has(tile)) tile = etageCouvertes(state, n).get(tile);
  const sorte = etageBlocs(state, n)[tile];
  if (!sorte) return fail('Il n\'y a pas de meuble ici.');
  const tourne = tourneBloc(sorte);
  if (!tourne) return fail(raisonFixe(state, tile, sorte));
  const avant = sensEtage(state, tile, n), niv = n > 1 ? { niveau: n } : {};
  const { largeur, hauteur } = mesuresMeuble(sorte, 0);
  const E = rangementAEcrire(state, n, 'blocs');
  for (let k = 1; k <= 3; k++) {
    const sens = (((avant + k * (pas < 0 ? 1 : 3)) % 4) + 4) % 4;
    if (tourne === 'symetrique' || (largeur === 1 && hauteur === 1) || sens % 2 === avant % 2) {
      setSensEtage(state, tile, sens, n);
      return { ok: true, sorte, case: tile, sens, etage: true, ...niv };
    }
    // (l'emprise change : le meuble ôté le temps de voir s'il tient dans ce sens)
    delete E[tile];
    const libre = (() => {
      const P = empriseNiveau(state, n), H = etageBlocs(state, n), couvertes = etageCouvertes(state, n);
      const cases = empriseMeuble(state, sorte, tile, sens);
      return !!cases && cases.every((j) => P.has(j) && !hautEscalier(state, j, n) && hauteurPile(state, j) < n + 1 && (j === tile || (!H[j] && !couvertes.has(j))));
    })();
    E[tile] = sorte;
    if (!libre) continue;
    setSensEtage(state, tile, sens, n);
    return { ok: true, sorte, case: tile, sens, etage: true, ...niv };
  }
  return fail(`${DATA.ATELIER.BLOCS[sorte].nom} : pas la place de le tourner ici.`);
}

// Ce qui, à chaque niveau, n'est plus au-dessus d'une pièce de ce niveau (ou se trouve sur le haut d'un
// escalier posé ensuite) revient dans l'inventaire : rien n'est perdu, rien ne bloque. Renvoie leur nombre.
export function rangerEtage(state) {
  let total = 0;
  for (const n of niveauxEtage()) {
    const E = etageBlocs(state, n);
    const hors = etageHorsEmprise(state, n);
    for (const k of hors) {
      const sorte = E[k];
      addItem(state, DATA.ATELIER.BLOCS[sorte].objet, 1);
      // (le mur d'une fenêtre aussi)
      const mur = fenetresEtage(state, n)[k];
      if (mur) addItem(state, DATA.ATELIER.BLOCS[mur].objet, 1);
      setFenetreEtage(state, k, null, n);
      oterEtage(state, k, n);
      stationReprise(state, sorte);
    }
    total += hors.length;
    // (un tableau dont le mur n'est plus là, ou hors de ce niveau : il revient aussi)
    const D = dessusEtage(state, n);
    for (const k of Object.keys(D)) {
      if (murEtage(state, Number(k), n)) continue;
      addItem(state, DATA.ATELIER.BLOCS[D[k]].objet, 1);
      delete D[k];
      total += 1;
    }
    // (une fenêtre haute dont le mur ne monte plus jusque-là : elle revient)
    const F = fenetresHautes(state, n);
    for (const k of Object.keys(F)) {
      if (hauteurPile(state, Number(k)) >= n + 1) continue;
      addItem(state, DATA.ATELIER.BLOCS[F[k]].objet, 1);
      delete F[k];
      total += 1;
    }
  }
  // (les sols d'un niveau hors d'une pièce de ce niveau, ou de l'étage : ils reviennent aussi)
  for (const n of niveauxSols()) {
    const S = solsEtage(state, n);
    if (!Object.keys(S).length) continue;
    const ok = casesSolEtage(state, n);
    for (const k of Object.keys(S)) {
      if (ok.has(Number(k))) continue;
      addItem(state, DATA.ATELIER.BLOCS[S[k]].objet, 1);
      delete S[k];
      total += 1;
    }
  }
  return total;
}

// Les blocs du niveau `n` hors de son emprise (une case qui n'y est plus, ou le haut d'un escalier) :
// leurs tuiles. Ce que rangerEtage remettrait dans l'inventaire.
export function etageHorsEmprise(state, n = 1) {
  const E = etageBlocs(state, n);
  const tiles = Object.keys(E);
  if (!tiles.length) return [];
  const emprise = empriseNiveau(state, n);
  // (un meuble : toutes ses cases)
  const dedans = (k) => (DATA.ATELIER.BLOCS[E[k]].meuble ? empriseMeuble(state, E[k], Number(k), sensEtage(state, Number(k), n)) || [Number(k)] : [Number(k)])
    .every((j) => emprise.has(j) && !hautEscalier(state, j, n));
  return tiles.filter((k) => !dedans(k));
}

/* ---------- les sols des niveaux 1 et 2 ---------- */

// Les sols posés au niveau `n` : { [tuile]: sorte } (le niveau 1 : state.solsEtage ; plus haut :
// state.solsHauts[n]).
export function solsEtage(state, n = 1) {
  if (n === 1) return state.solsEtage && typeof state.solsEtage === 'object' ? state.solsEtage : {};
  const H = state.solsHauts && typeof state.solsHauts === 'object' ? state.solsHauts : {};
  return H[n] && typeof H[n] === 'object' ? H[n] : {};
}
function solsAEcrire(state, n) {
  if (n === 1) {
    if (!state.solsEtage || typeof state.solsEtage !== 'object') state.solsEtage = {};
    return state.solsEtage;
  }
  if (!state.solsHauts || typeof state.solsHauts !== 'object') state.solsHauts = {};
  if (!state.solsHauts[n] || typeof state.solsHauts[n] !== 'object') state.solsHauts[n] = {};
  return state.solsHauts[n];
}
// Les niveaux où des sols se posent : 1 à ATELIER.HAUTEUR_MAX - 1.
export const niveauxSols = () => Array.from({ length: Math.max(0, DATA.ATELIER.HAUTEUR_MAX - 1) }, (_, i) => i + 1);

// Les pièces du niveau `n` : les pièces closes dont tout le pourtour (murs, fenêtres, portes)
// monte au niveau n (hauteurPile ≥ n + 1). [{ cases, bord }]
// (gardées tant que les pièces closes et les hauteurs des murs n'ont pas changé ; par niveau)
let nivPieces = null, nivCle = null, nivListes = new Map();
export function piecesNiveau(state, n = 1) {
  const pieces = piecesCloses(state), cle = JSON.stringify(state.hauteurs || null);
  if (pieces !== nivPieces || cle !== nivCle) { nivPieces = pieces; nivCle = cle; nivListes = new Map(); }
  if (nivListes.has(n)) return nivListes.get(n);
  const out = [];
  nivListes.set(n, out);
  for (const p of pieces) {
    const dedans = new Set(p.cases), bord = [...avecMurs(state, p.cases)].filter((t) => !dedans.has(t));
    if (bord.length && bord.every((t) => hauteurPile(state, t) >= n + 1)) out.push({ cases: p.cases, bord });
  }
  return out;
}
export const piecesNiveau1 = (state) => piecesNiveau(state, 1);

// Les cases où un sol se pose au niveau `n` : le dedans des pièces du niveau n (au niveau 1,
// aussi de celles qui ont un escalier, sans la case de l'escalier) ; jamais sur un mur du bas.
// Un Set de tuiles.
export function casesSolEtage(state, n = 1) {
  const out = new Set(), B = blocsPoses(state);
  for (const p of piecesNiveau(state, n)) for (const t of p.cases) out.add(t);
  if (n === 1) {
    for (const p of piecesCloses(state)) if (p.cases.some((t) => B[t] === 'escalier')) for (const t of p.cases) out.add(t);
    for (const t of [...out]) if (B[t] === 'escalier') out.delete(t);
  }
  // (au niveau 2 : pas sur le haut de l'escalier de l'étage)
  if (n === 2) { const E = etageBlocs(state); for (const t of [...out]) if (E[t] === 'escalier') out.delete(t); }
  for (const t of [...out]) if (hauteurPile(state, t) >= 1) out.delete(t);
  return out;
}

// Peut-on poser le sol `sorte` au niveau `n`, sur `tile` ? { ok, raison }
export function poseSolEtageStatus(state, sorte, tile, n = 1) {
  const s = DATA.ATELIER.BLOCS[sorte];
  if (!s || !s.sol || s.dehors || s.meuble) return { ok: false, raison: `${s ? s.nom : 'Ce bloc'} : ce n'est pas un sol de pièce.` };
  if (!casesSolEtage(state, n).has(tile)) {
    return { ok: false, raison: `Au niveau ${n}, un sol se pose dans une pièce dont les murs montent tous au niveau ${n}${n === 1 ? ' (ou au-dessus de la pièce de l\'escalier)' : ''}.` };
  }
  const ancien = solsEtage(state, n)[tile];
  if (ancien && !changeSol(ancien, sorte)) return { ok: false, raison: 'Il y a déjà ce sol ici.' };
  if (blocsEnMain(state, sorte) < 1) return { ok: false, raison: `Plus de ${s.nom.toLowerCase()} : fabrique-en à l'Atelier.` };
  return { ok: true };
}

export function poserSolEtage(state, sorte, tile, n = 1) {
  const st = poseSolEtageStatus(state, sorte, tile, n);
  if (!st.ok) return fail(st.raison);
  takeItem(state, DATA.ATELIER.BLOCS[sorte].objet, 1);
  const S = solsAEcrire(state, n), ancien = S[tile];
  if (ancien) addItem(state, DATA.ATELIER.BLOCS[ancien].objet, 1);
  S[tile] = sorte;
  return ancien ? { ok: true, sorte, case: tile, sol: true, remplace: ancien } : { ok: true, sorte, case: tile, sol: true };
}

export function reprendreSolEtage(state, tile, n = 1) {
  const S = solsEtage(state, n), sorte = S[tile];
  if (!sorte) return fail('Il n\'y a pas de sol ici.');
  delete S[tile];
  addItem(state, DATA.ATELIER.BLOCS[sorte].objet, 1);
  return { ok: true, sorte, case: tile, sol: true };
}
