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
import { blocsEnMain, blocsPoses, changeMur, changeSol, empriseMeuble, genreBloc, hauteurMur, hauteurPile, mesuresMeuble, piecesCloses, raisonFixe, solsPoses, tourneBloc, variantesBloc } from './blocs.js';
import { farmTerrain } from './terrain.js';

// Les blocs qui se posent à l'étage : un escalier (vers le niveau 2), des murs, des portes, une paillasse, une lanterne, un
// réverbère, une barrière, et les meubles qui se posent au sol (pas les tableaux, accrochés à un mur ;
// pas le réfrigérateur, qui reste en bas, où la famille mange).
export const ETAGE_BLOCS = ['escalier', 'mur_pierre', 'mur_fenetre', 'fenetre_ronde', 'fenetre_cintree', 'fenetre_volets', 'fenetre_vitrail', 'pierre_angle', 'paroi_vitree', 'mur_brique_rouge', 'mur_brique_orange', 'mur_brique_ocre', 'mur_brique_bleue', 'mur_pierre_taille', 'mur_bois', 'porte', 'porte_chene', 'porte_vitree', 'porte_grange', 'porte_bleue', 'porte_fer', 'porte_ecurie', 'porte_blanche', 'paillasse', 'lanterne', 'candelabre', 'barriere']
  .concat(Object.keys(DATA.ATELIER.BLOCS).filter((k) => DATA.ATELIER.BLOCS[k].meuble && !DATA.ATELIER.BLOCS[k].sur && !DATA.ATELIER.BLOCS[k].frigo));

// Les blocs posés à l'étage : { [tuile]: sorte }.
export function etageBlocs(state) {
  return state.etage && typeof state.etage === 'object' ? state.etage : {};
}

// Les fenêtres de l'étage percées dans un mur : { [case]: sorte du mur } (state.fenetresEtage),
// comme celles du bas (blocs.js fenetresPosees).
export function fenetresEtage(state) {
  return state.fenetresEtage && typeof state.fenetresEtage === 'object' ? state.fenetresEtage : {};
}
const estFen = (sorte) => !!(DATA.ATELIER.BLOCS[sorte] && DATA.ATELIER.BLOCS[sorte].fenetre);
const murPlein = (sorte) => !!(DATA.ATELIER.BLOCS[sorte] && DATA.ATELIER.BLOCS[sorte].mur && !estFen(sorte)) && sorte !== 'paroi_vitree';
function setFenetreEtage(state, tile, mur) {
  if (!mur) { if (state.fenetresEtage) delete state.fenetresEtage[tile]; return; }
  if (!state.fenetresEtage || typeof state.fenetresEtage !== 'object') state.fenetresEtage = {};
  state.fenetresEtage[tile] = mur;
}

// Le sens du meuble de l'étage posé sur `tile` (0 à 3 ; A-1).
export function sensEtage(state, tile) {
  const v = state.sensEtage && typeof state.sensEtage === 'object' ? Number(state.sensEtage[tile]) : 0;
  return v >= 1 && v <= 3 ? v : 0;
}
function setSensEtage(state, tile, sens) {
  const v = ((Math.floor(Number(sens) || 0) % 4) + 4) % 4;
  if (v && tourneBloc(etageBlocs(state)[tile])) {
    if (!state.sensEtage || typeof state.sensEtage !== 'object') state.sensEtage = {};
    state.sensEtage[tile] = v;
  } else if (state.sensEtage) delete state.sensEtage[tile];
}

// La variante de couleur du meuble de l'étage posé sur `tile` (son id), ou null : celle du dessin (A-3).
export function varianteEtage(state, tile) {
  const v = state.teintesEtage && typeof state.teintesEtage === 'object' ? state.teintesEtage[tile] : null;
  return typeof v === 'string' ? v : null;
}
function setVarianteEtage(state, tile, v) {
  const sorte = etageBlocs(state)[tile];
  if (sorte && v && variantesBloc(sorte).some((x, i) => i > 0 && x.id === v)) {
    if (!state.teintesEtage || typeof state.teintesEtage !== 'object') state.teintesEtage = {};
    state.teintesEtage[tile] = v;
  } else if (state.teintesEtage) delete state.teintesEtage[tile];
}

// Repeindre le meuble de l'étage de la case `tile` (une de ses cases), comme en bas (blocs.js peindreBloc).
export function peindreEtage(state, tile, v) {
  if (!etageBlocs(state)[tile] && etageCouvertes(state).has(tile)) tile = etageCouvertes(state).get(tile);
  const sorte = etageBlocs(state)[tile];
  if (!sorte) return fail('Il n\'y a pas de meuble ici.');
  const l = variantesBloc(sorte);
  if (!l.length) return fail(`${DATA.ATELIER.BLOCS[sorte].nom} : une seule couleur pour l'instant.`);
  const id = v || l[0].id;
  if (!l.some((x) => x.id === id)) return fail(`${DATA.ATELIER.BLOCS[sorte].nom} : pas de couleur « ${id} ».`);
  const avant = varianteEtage(state, tile) || l[0].id;
  setVarianteEtage(state, tile, id);
  return { ok: true, sorte, case: tile, variante: id, avant, etage: true };
}

// Les cases de l'étage couvertes par un meuble de plusieurs cases, hors la sienne (dans son sens) :
// Map(case → case du meuble).
export function etageCouvertes(state) {
  const out = new Map();
  for (const [k, sorte] of Object.entries(etageBlocs(state))) {
    const s = DATA.ATELIER.BLOCS[sorte], t = Number(k);
    if (!s || !s.meuble) continue;
    for (const j of empriseMeuble(state, sorte, t, sensEtage(state, t)) || []) if (j !== t) out.set(j, t);
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
export function etage2Emprise(state) {
  const out = new Set(), E = etageBlocs(state), un = etageEmprise(state);
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

// L'emprise de l'étage : les cases des pièces closes où un escalier est posé, et les murs et
// les portes qui les bordent (les huit voisines). Un Set de tuiles.
export function etageEmprise(state) {
  const out = new Set();
  const B = blocsPoses(state);
  for (const p of piecesCloses(state)) {
    if (!p.cases.some((t) => B[t] === 'escalier')) continue;
    for (const t of avecMurs(state, p.cases)) out.add(t);
  }
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

// Peut-on poser `sorte` à l'étage, sur `tile` (dans le sens `sens` : un meuble qui tourne) ? { ok, raison }
export function poseEtageStatus(state, sorte, tile, sens = 0) {
  const s = DATA.ATELIER.BLOCS[sorte];
  if (!s || !ETAGE_BLOCS.includes(sorte)) return { ok: false, raison: `${s ? s.nom : 'Ce bloc'} : ne se pose pas à l'étage.` };
  if (!etageEmprise(state).has(tile)) return { ok: false, raison: 'À l\'étage, on ne bâtit qu\'au-dessus d\'une pièce close qui a un escalier.' };
  if (blocsPoses(state)[tile] === 'escalier') return { ok: false, raison: 'Ici, c\'est le haut de l\'escalier.' };
  if (hauteurPile(state, tile) >= 2) return { ok: false, raison: 'Le mur du bas monte jusqu\'ici : il est déjà le mur de l\'étage.' };
  // (le second escalier : dans une pièce dont les murs montent tous au niveau 2)
  if (sorte === 'escalier' && !casesSolEtage(state, 2).has(tile)) return { ok: false, raison: 'L\'escalier de l\'étage se pose dans une pièce dont les murs montent tous au niveau 2.' };
  if (etageBlocs(state)[tile] && !changeMur(etageBlocs(state)[tile], sorte)) return { ok: false, raison: 'Il y a déjà un bloc ici.' };
  const couvertes = etageCouvertes(state);
  if (couvertes.has(tile)) return { ok: false, raison: 'Un meuble occupe cette case.' };
  // un meuble de plusieurs cases : toutes à l'étage, libres
  if (s.meuble) {
    const E = etageEmprise(state), B = blocsPoses(state), H = etageBlocs(state);
    const m = mesuresMeuble(sorte, tourneBloc(sorte) ? sens : 0);
    const cases = empriseMeuble(state, sorte, tile, tourneBloc(sorte) ? sens : 0);
    if (!cases || !cases.every((j) => E.has(j) && B[j] !== 'escalier' && (j === tile || (!H[j] && !couvertes.has(j))))) {
      return { ok: false, raison: `${s.nom} : il lui faut ${m.largeur} × ${m.hauteur} cases libres à l'étage (vers la droite${m.hauteur > 1 ? ' et vers le haut' : ''}).` };
    }
  }
  if (blocsEnMain(state, sorte) < 1) return { ok: false, raison: `Plus de ${s.nom.toLowerCase()} : fabrique-en à l'Atelier.` };
  return { ok: true };
}

export function poserEtage(state, sorte, tile, sens = 0, variante = null) {
  const st = poseEtageStatus(state, sorte, tile, sens);
  if (!st.ok) return fail(st.raison);
  takeItem(state, DATA.ATELIER.BLOCS[sorte].objet, 1);
  const ancien = etageBlocs(state)[tile], dans = fenetresEtage(state)[tile];
  if (!state.etage || typeof state.etage !== 'object') state.etage = {};
  // une fenêtre dans un mur plein : il reste autour d'elle
  if (ancien && estFen(sorte) && murPlein(ancien)) {
    setFenetreEtage(state, tile, ancien);
    state.etage[tile] = sorte;
    return { ok: true, sorte, case: tile, etage: true, perce: ancien };
  }
  // un mur changé (une porte à la place d'un mur en pierre) : l'ancien revient ; à la place d'une
  // fenêtre (sauf une autre fenêtre), son mur aussi
  if (ancien) addItem(state, DATA.ATELIER.BLOCS[ancien].objet, 1);
  if (dans && !(estFen(sorte) && estFen(ancien))) {
    addItem(state, DATA.ATELIER.BLOCS[dans].objet, 1);
    setFenetreEtage(state, tile, null);
  }
  state.etage[tile] = sorte;
  setSensEtage(state, tile, tourneBloc(sorte) ? sens : 0);
  setVarianteEtage(state, tile, variante);
  const v = sensEtage(state, tile), t = varianteEtage(state, tile);
  return { ok: true, sorte, case: tile, etage: true, ...(ancien ? { remplace: ancien } : {}), ...(v ? { sens: v } : {}), ...(t ? { variante: t } : {}) };
}

// Reprend le bloc de l'étage posé sur `tile` (ou le meuble qui couvre `tile`) : son objet revient
// dans l'inventaire.
export function reprendreEtage(state, tile) {
  if (!etageBlocs(state)[tile] && etageCouvertes(state).has(tile)) tile = etageCouvertes(state).get(tile);
  const sorte = etageBlocs(state)[tile];
  if (!sorte) return fail('Il n\'y a pas de bloc ici.');
  // une fenêtre percée dans un mur : elle revient, le mur reste
  const mur = fenetresEtage(state)[tile], sens = sensEtage(state, tile), variante = varianteEtage(state, tile);
  if (estFen(sorte) && mur) state.etage[tile] = mur;
  else delete state.etage[tile];
  setFenetreEtage(state, tile, null);
  if (state.sensEtage) delete state.sensEtage[tile];
  if (state.teintesEtage) delete state.teintesEtage[tile];
  addItem(state, DATA.ATELIER.BLOCS[sorte].objet, 1);
  return { ok: true, sorte, case: tile, etage: true, ...(mur && estFen(sorte) ? { reste: mur } : {}), ...(sens ? { sens } : {}), ...(variante ? { variante } : {}) };
}

// Tourner d'un quart de tour le meuble de l'étage de la case `tile` (une de ses cases), comme en bas
// (blocs.js tournerBloc) : un meuble qui ne tient pas dans le sens suivant passe au sens d'après ;
// aucun ne tient : il reste comme il est. → { ok, sorte, case, sens, etage } ou un refus.
export function tournerEtage(state, tile, pas = 1) {
  if (!etageBlocs(state)[tile] && etageCouvertes(state).has(tile)) tile = etageCouvertes(state).get(tile);
  const sorte = etageBlocs(state)[tile];
  if (!sorte) return fail('Il n\'y a pas de meuble ici.');
  const tourne = tourneBloc(sorte);
  if (!tourne) return fail(raisonFixe(state, tile, sorte));
  const avant = sensEtage(state, tile);
  const { largeur, hauteur } = mesuresMeuble(sorte, 0);
  for (let k = 1; k <= 3; k++) {
    const sens = (((avant + k * (pas < 0 ? 1 : 3)) % 4) + 4) % 4;
    if (tourne === 'symetrique' || (largeur === 1 && hauteur === 1) || sens % 2 === avant % 2) {
      setSensEtage(state, tile, sens);
      return { ok: true, sorte, case: tile, sens, etage: true };
    }
    // (l'emprise change : le meuble ôté le temps de voir s'il tient dans ce sens)
    delete state.etage[tile];
    const libre = (() => {
      const E = etageEmprise(state), B = blocsPoses(state), H = etageBlocs(state), couvertes = etageCouvertes(state);
      const cases = empriseMeuble(state, sorte, tile, sens);
      return !!cases && cases.every((j) => E.has(j) && B[j] !== 'escalier' && hauteurPile(state, j) < 2 && (j === tile || (!H[j] && !couvertes.has(j))));
    })();
    state.etage[tile] = sorte;
    if (!libre) continue;
    setSensEtage(state, tile, sens);
    return { ok: true, sorte, case: tile, sens, etage: true };
  }
  return fail(`${DATA.ATELIER.BLOCS[sorte].nom} : pas la place de le tourner ici.`);
}

// Les blocs de l'étage qui ne sont plus au-dessus d'une pièce à escalier reviennent dans
// l'inventaire. Renvoie leur nombre.
export function rangerEtage(state) {
  const E = etageBlocs(state);
  const hors = etageHorsEmprise(state);
  for (const k of hors) {
    addItem(state, DATA.ATELIER.BLOCS[E[k]].objet, 1);
    // (le mur d'une fenêtre aussi)
    const mur = fenetresEtage(state)[k];
    if (mur) addItem(state, DATA.ATELIER.BLOCS[mur].objet, 1);
    setFenetreEtage(state, k, null);
    delete E[k];
    if (state.sensEtage) delete state.sensEtage[k];
    if (state.teintesEtage) delete state.teintesEtage[k];
  }
  // (les sols d'un niveau hors d'une pièce de ce niveau, ou de l'étage : ils reviennent aussi)
  let sols = 0;
  for (const n of niveauxSols()) {
    const S = solsEtage(state, n);
    if (!Object.keys(S).length) continue;
    const ok = casesSolEtage(state, n);
    for (const k of Object.keys(S)) {
      if (ok.has(Number(k))) continue;
      addItem(state, DATA.ATELIER.BLOCS[S[k]].objet, 1);
      delete S[k];
      sols += 1;
    }
  }
  return hors.length + sols;
}

// Les blocs de l'étage hors de son emprise (une case qui n'y est plus, ou celle de l'escalier) :
// leurs tuiles. Ce que rangerEtage remettrait dans l'inventaire.
export function etageHorsEmprise(state) {
  const E = etageBlocs(state);
  const tiles = Object.keys(E);
  if (!tiles.length) return [];
  const emprise = etageEmprise(state), B = blocsPoses(state);
  // (un meuble : toutes ses cases)
  const dedans = (k) => (DATA.ATELIER.BLOCS[E[k]].meuble ? empriseMeuble(state, E[k], Number(k), sensEtage(state, Number(k))) || [Number(k)] : [Number(k)])
    .every((j) => emprise.has(j) && B[j] !== 'escalier');
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
export function piecesNiveau(state, n = 1) {
  const out = [];
  for (const p of piecesCloses(state)) {
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
