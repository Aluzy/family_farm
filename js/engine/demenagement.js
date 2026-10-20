import { DATA } from './catalog.js';
import { fail, isOwned, starterOf } from './devices.js';
import { addItem } from './inventory.js';
import { farmSeed, farmTerrain } from './terrain.js';
import { ANCIENNE_COUR } from './ferme-generee.js';
import { houseRepaired } from './depart.js';
import { robotOn } from './automation.js';
import { pickUpAll } from './ramassage.js';
import { couchages, etatEtable, etatMoulin, etatPoulailler, majPoulailler, pieceDe, serrePlaces } from './blocs.js';

/* ---------- déménager une ancienne partie sur la ferme générée ---------- */

// Une partie de la carte de Tiled (sans graine) part sur la ferme générée d'après `graine`
// (docs/carte-generee.md, « Les anciennes parties »). Rien ne se perd : l'argent, l'inventaire, le
// niveau, la famille, les bêtes et ce qui pousse restent. Ce qui dépend de la carte change :
//   - les parcelles de la Zone de culture gardent leur place dans la cour (la cour de la carte de
//     Tiled est posée sur la ferme générée, DECALAGE), ou la terre labourable la plus proche ;
//   - chaque bâtiment déjà là est rebâti en blocs, près de sa place d'avant : le foyer (une
//     paillasse par membre, le four, la cuisinière), le Poulailler et l'Étable (leur enceinte et
//     un enclos de barrières, à la taille de leur niveau ou de leurs places), la Serre (une case
//     par parcelle), le Silo, le Moulin, le puits (et la pompe), le panneau, la citerne, la
//     batterie et la station du robot ;
//   - un bâtiment qui ne trouve pas sa place rend ses blocs dans l'inventaire (à poser) ;
//   - une maison pas encore réparée : les blocs d'un foyer sont dans l'inventaire ;
//   - les arbres du Verger sont plantés dans le sol, près de leur emplacement d'avant ;
//   - l'Atelier est construit (à poser) ; les arbres abattus, les rochers cassés et la cueillette
//     du jour repartent de zéro ; les tas à ramasser entrent dans l'inventaire.
// convertirPartie(state, graine) → { ok, graine, batis: [ids], rendus: { id: { objet: qté } } }.

const HERBE = new Set(['#', '+']);

// Les blocs d'un plan : [{ dx, dy, sorte }] dans un rectangle w × h (murs compris).
function enceinte(a, b) {
  const out = [];
  for (let x = 0; x <= a + 1; x++) out.push({ dx: x, dy: 0, sorte: 'mur_pierre' }, { dx: x, dy: b + 1, sorte: 'mur_pierre' });
  for (let y = 1; y <= b; y++) out.push({ dx: 0, dy: y, sorte: 'mur_pierre' }, { dx: a + 1, dy: y, sorte: 'mur_pierre' });
  return out;
}

// Pose `sorte` en (dx, dy) dans `plan` (remplace le mur qui y était).
function mettre(plan, dx, dy, sorte) {
  const i = plan.findIndex((p) => p.dx === dx && p.dy === dy);
  if (i >= 0) plan.splice(i, 1);
  plan.push({ dx, dy, sorte });
}

// Une pièce de a × b cases, sa porte au milieu du mur du bas.
function piece(a, b) {
  const plan = enceinte(a, b);
  mettre(plan, 1 + Math.floor(a / 2), b + 1, 'porte');
  return plan;
}

// Le foyer : une paillasse par membre (en haut), le four et la cuisinière (en bas, dans les coins).
function planFoyer(membres, four, cuisine) {
  const a = Math.max(5, Math.min(membres, 8)), rangs = Math.ceil(membres / a), b = rangs + 2;
  const plan = piece(a, b);
  for (let i = 0; i < membres; i++) plan.push({ dx: 1 + (i % a), dy: 1 + Math.floor(i / a), sorte: 'paillasse' });
  if (four) plan.push({ dx: 1, dy: b, sorte: 'four' });
  if (cuisine) plan.push({ dx: a, dy: b, sorte: 'cuisiniere' });
  return { w: a + 2, h: b + 2, plan };
}

// Le Poulailler ou l'Étable : l'enceinte (le bloc clé dans le coin), sa porte sur le dehors en bas,
// une porte à l'est sur un enclos de barrières de la même hauteur ; `places` cases libres de chaque côté.
const placesMax = () => DATA.ATELIER.PIECE_MAX - 10;
function planEnclos(cle, places) {
  const n = Math.max(1, Math.min(places, placesMax()));
  const b = Math.max(3, Math.min(10, Math.ceil(Math.sqrt(n + 1)))), a = Math.max(3, Math.ceil((n + 1) / b)), e = Math.max(2, Math.ceil(n / b));
  const plan = piece(a, b);
  plan.push({ dx: 1, dy: 1, sorte: cle });
  mettre(plan, a + 1, 1 + Math.floor((b - 1) / 2), 'porte');
  for (let x = a + 2; x <= a + 2 + e; x++) plan.push({ dx: x, dy: 0, sorte: 'barriere' }, { dx: x, dy: b + 1, sorte: 'barriere' });
  for (let y = 1; y <= b; y++) plan.push({ dx: a + 2 + e, dy: y, sorte: 'barriere' });
  return { w: a + 3 + e, h: b + 2, plan };
}

// La Serre : le bac dans le coin, une case libre par parcelle (hors le passage de la porte).
function planSerre(parcelles) {
  const n = Math.max(1, parcelles), b = Math.max(3, Math.ceil(Math.sqrt(n + 2))), a = Math.max(3, Math.ceil((n + 2) / b));
  const plan = piece(a, b);
  plan.push({ dx: 1, dy: 1, sorte: 'bac_semis' });
  return { w: a + 2, h: b + 2, plan };
}

// Une petite pièce (le Silo, le Moulin) avec son bloc au milieu du fond.
function planPetit(cle) {
  const plan = piece(3, 2);
  plan.push({ dx: 2, dy: 1, sorte: cle });
  return { w: 5, h: 4, plan };
}

// Le Moulin (version 1.25) : la petite pièce, la meule au centre, ses murs hauts de
// MOULIN.HAUTEUR blocs (etatMoulin).
function planMoulin() {
  const p = planPetit('meule');
  for (const b of p.plan) if (DATA.ATELIER.BLOCS[b.sorte].mur) b.hauteur = DATA.ATELIER.MOULIN.HAUTEUR;
  return p;
}

// Des blocs dehors, en ligne, une case entre chacun.
function planLigne(sortes) {
  return { w: sortes.length * 2 - 1, h: 1, plan: sortes.map((sorte, i) => ({ dx: i * 2, dy: 0, sorte })) };
}

// Le centre d'un rectangle de la carte de Tiled (px), en tuiles de la ferme générée.
function centre([x, y, w, h], D) {
  const T = 16;
  return [Math.floor((x + w / 2) / T) + D[0], Math.floor((y + h / 2) / T) + D[1]];
}

// Ce qu'une ancienne partie avait de bâti, et les plans à poser (dans l'ordre).
function plans(state) {
  const membres = state.famille && state.famille.membres ? state.famille.membres.length : 1;
  const st = (id) => !!(state.stations && state.stations[id] && state.stations[id].construit);
  const out = [];
  const foyer = houseRepaired(state);
  out.push({ id: 'maison', ou: 'maison', pose: foyer, ...planFoyer(membres, st('four'), st('cuisine')) });
  const poul = state.poulailler;
  if (poul && poul.construit) {
    const cap = DATA.POULAILLER.CAPACITE[Math.max(1, Math.min(poul.niveau || 1, DATA.POULAILLER.CAPACITE.length)) - 1];
    out.push({ id: 'poulailler', ou: 'poulailler', pose: true, places: Math.min(cap, placesMax()), ...planEnclos('nichoir', cap) });
  }
  const pat = state.paturage;
  if (pat && pat.construit) {
    const places = pat.places || DATA.PATURAGE.PLACES_DEPART;
    out.push({ id: 'paturage', ou: 'paturage', pose: true, places: Math.min(places, placesMax()), ...planEnclos('mangeoire', places) });
  }
  if (state.serre && state.serre.construit) out.push({ id: 'serre', ou: 'serre', pose: true, parcelles: state.serre.parcelles.length, ...planSerre(state.serre.parcelles.length) });
  if (state.silo && state.silo.construit) out.push({ id: 'silo', ou: 'silo', pose: true, ...planPetit('coffre_grain') });
  if (st('moulin')) out.push({ id: 'moulin', ou: 'moulin', pose: true, ...planMoulin() });
  // dehors : le puits (le décor de la cour d'avant ; la pompe dessus), le panneau, la citerne, la batterie
  const a = (type) => isOwned(starterOf(state, type));
  const dehors = ['puits'].concat(a('panneau') ? ['panneau'] : [], a('reservoir') ? ['citerne'] : [], a('batterie') ? ['batterie'] : []);
  out.push({ id: 'appareils', ou: 'puits', pose: true, pompe: a('pompe'), ...planLigne(dehors) });
  if (robotOn(state)) out.push({ id: 'station_robot', ou: 'maison', decale: [6, 0], pose: true, ...planLigne(['station_robot']) });
  return out;
}

// Les objets des blocs d'un plan (et la pompe) : { objet: qté }.
function objetsDe(p) {
  const out = {};
  for (const { sorte, hauteur } of p.plan) { const o = DATA.ATELIER.BLOCS[sorte].objet; out[o] = (out[o] || 0) + (hauteur || 1); }
  if (p.pompe) out.pompe = (out.pompe || 0) + 1;
  return out;
}

// Les cases de (c, r) à distance d, en anneaux de plus en plus loin.
function* autour(c0, r0, max) {
  yield [c0, r0];
  for (let d = 1; d <= max; d++) {
    for (let x = -d; x <= d; x++) { yield [c0 + x, r0 - d]; yield [c0 + x, r0 + d]; }
    for (let y = -d + 1; y <= d - 1; y++) { yield [c0 - d, r0 + y]; yield [c0 + d, r0 + y]; }
  }
}

export function convertirPartie(state, graine) {
  if (farmSeed(state) !== null) return fail('Cette partie est déjà sur une ferme générée.');
  const g = String(graine === undefined || graine === null ? '' : graine).trim();
  if (!g) return fail('Il faut une graine.');
  const T0 = farmTerrain(state), W0 = T0.LARGEUR;
  const aBatir = plans(state);   // (avant la graine : la maison réparée, les stations, les appareils d'avant)
  // ce qui traîne à ramasser (ses cases sont celles de l'ancienne carte) entre dans l'inventaire
  pickUpAll(state);
  state.carte = { graine: g };
  const T = farmTerrain(state), W = T.LARGEUR, H = T.HAUTEUR, D = T.DECALAGE || [0, 0];
  const herbe = (c, r) => c >= 1 && r >= 1 && c < W - 1 && r < H - 1 && HERBE.has(T.LIGNES[r][c]);
  const pris = new Set();

  // 1. les parcelles : à leur place dans la cour, ou sur la terre labourable libre la plus proche
  const parcelles = state.potager.parcelles;
  for (const p of parcelles) {
    if (!Number.isInteger(p.case)) continue;
    const c0 = (p.case % W0) + D[0], r0 = Math.floor(p.case / W0) + D[1];
    let t = null;
    for (const [c, r] of autour(c0, r0, 40)) {
      if (c >= 0 && r >= 0 && c < W && r < H && T.LIGNES[r][c] === '#' && !pris.has(r * W + c)) { t = r * W + c; break; }
    }
    p.case = t;
    if (t !== null) pris.add(t);
  }
  state.potager.parcelles = parcelles.filter((p) => Number.isInteger(p.case)).sort((a, b) => a.case - b.case);

  // 2. les bâtiments : chacun près de sa place d'avant, avec une case libre tout autour
  state.blocs = {};
  state.sols = {};
  state.blocsDessus = {};
  state.hauteurs = {};
  const batis = [], rendus = {};
  const rendre = (p) => {
    const objets = objetsDe(p);
    for (const [o, n] of Object.entries(objets)) addItem(state, o, n);
    rendus[p.id] = objets;
  };
  const tient = (x, y, w, h) => {
    for (let r = y - 1; r <= y + h; r++) for (let c = x - 1; c <= x + w; c++) if (!herbe(c, r) || pris.has(r * W + c)) return false;
    return true;
  };
  for (const p of aBatir) {
    if (!p.pose) { rendre(p); continue; }
    const [cx, cy] = centre(ANCIENNE_COUR[p.ou], D);
    const [ox, oy] = p.decale || [0, 0];
    let ici = null;
    for (const [c, r] of autour(cx + ox - Math.floor(p.w / 2), cy + oy - Math.floor(p.h / 2), 50)) if (tient(c, r, p.w, p.h)) { ici = [c, r]; break; }
    if (!ici) { rendre(p); continue; }
    p.cases = [];
    for (let r = ici[1]; r < ici[1] + p.h; r++) for (let c = ici[0]; c < ici[0] + p.w; c++) pris.add(r * W + c);
    for (const { dx, dy, sorte, hauteur } of p.plan) {
      const t = (ici[1] + dy) * W + ici[0] + dx;
      state.blocs[t] = sorte;
      if (hauteur > 1) state.hauteurs[t] = hauteur;
      p.cases.push(t);
      if (sorte === 'puits' && p.pompe) state.blocsDessus[t] = 'pompe';
    }
    batis.push(p);
  }

  // 3. chaque bâtiment posé est-il reconnu ? sinon, ses blocs reviennent dans l'inventaire
  const cleDe = (p, sorte) => p.cases.find((t) => state.blocs[t] === sorte);
  const verifie = {
    maison: (p) => couchages(state).length >= p.plan.filter((b) => b.sorte === 'paillasse').length,
    poulailler: (p) => { const e = etatPoulailler(state); return e.ok && e.places >= p.places; },
    paturage: (p) => { const e = etatEtable(state); return e.ok && e.places >= p.places; },
    serre: (p) => serrePlaces(state).length >= p.parcelles,
    silo: (p) => !!pieceDe(state, cleDe(p, 'coffre_grain')),
    moulin: () => etatMoulin(state).ok,
  };
  for (const p of batis) {
    if (!verifie[p.id] || verifie[p.id](p)) continue;
    for (const t of p.cases) { delete state.blocs[t]; delete state.blocsDessus[t]; delete state.hauteurs[t]; }
    rendre(p);
    p.rendu = true;
  }

  // 4. les arbres du Verger : dans le sol, près de leur emplacement d'avant, loin les uns des autres
  const v = state.verger;
  if (v && Array.isArray(v.arbres) && v.arbres.length) {
    const ecart = DATA.ATELIER.ARBRE_ECART, places = [];
    const libre = (c, r) => {
      if (!herbe(c, r) || places.some(([pc, pr]) => Math.max(Math.abs(pc - c), Math.abs(pr - r)) < ecart)) return false;
      for (let y = r - 1; y <= r + 1; y++) for (let x = c - 1; x <= c + 1; x++) if (pris.has(y * W + x) || state.blocs[y * W + x]) return false;
      return true;
    };
    const emplacements = ANCIENNE_COUR.verger;
    for (const [i, tree] of v.arbres.entries()) {
      const slot = emplacements[Number.isInteger(tree.case) ? tree.case % emplacements.length : i % emplacements.length];
      const [cx, cy] = centre(slot, D);
      let ici = null;
      for (const [c, r] of autour(cx, cy, 60)) if (libre(c, r)) { ici = [c, r]; break; }
      tree.case = ici ? ici[1] * W + ici[0] : null;
      if (ici) { places.push(ici); pris.add(tree.case); }
    }
    // (un arbre sans place, sur une carte trop pleine : il redevient un jeune arbre à planter)
    for (const tree of v.arbres.filter((t) => t.case === null)) addItem(state, (DATA.ATELIER.BLOCS[tree.espece] || DATA.ATELIER.BLOCS.pommier).objet, 1);
    v.arbres = v.arbres.filter((t) => t.case !== null);
  }

  // 4 bis. les meubles achetés (l'intérieur de la maison) : dans l'inventaire, à poser
  const meubles = {};
  for (const [id, n] of Object.entries(state.meubles || {})) if (n > 0 && DATA.OBJETS['meuble_' + id]) meubles['meuble_' + id] = n;
  for (const [o, n] of Object.entries(meubles)) addItem(state, o, n);
  if (Object.keys(meubles).length) rendus.meubles = meubles;

  // 5. le reste : l'Atelier (à poser), les arbres abattus, les rochers cassés, la cueillette, le robot
  if (!state.atelier || !state.atelier.construit) state.atelier = { construit: true, niveau: DATA.ATELIER.NIVEAU };
  if (state.outils) { state.outils.arbres = {}; state.outils.rochers = {}; }
  delete state.cueillette;
  delete state.robot;
  majPoulailler(state);
  return { ok: true, graine: g, batis: batis.filter((p) => !p.rendu).map((p) => p.id), rendus };
}

/* ---------- le déménagement d'une ancienne partie (au chargement) ---------- */

// Une ancienne partie déménage (écran de départ passé) : la fenêtre ne propose pas de rester sur
// la carte de Tiled, seulement de choisir sa terre (la graine).
export function demenagementPossible(state) {
  return farmSeed(state) === null && !!(state.famille && state.famille.configuree);
}

// La graine proposée : tirée de la partie (toujours la même pour elle).
export function graineDemenagement(state) {
  return String((Number(state.rngSeed) >>> 0) % 1000000);
}

// Ce que donnerait le déménagement sur la graine `graine`, sans toucher à la partie :
// { ok, graine, batis, rendus, largeur, hauteur, sol (une lettre par case : h herbe, a arbre ou
// rocher, e eau, c chemin), blocs: { case: sorte }, parcelles: [cases], arbres: [cases], cour: [c0, r0, c1, r1] }.
export function apercuDemenagement(state, graine) {
  const copie = JSON.parse(JSON.stringify(state));
  const r = convertirPartie(copie, graine);
  if (!r.ok) return r;
  const T = farmTerrain(copie), W = T.LARGEUR, H = T.HAUTEUR, V = W + 1;
  let sol = '';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ch = T.LIGNES[y][x], k = T.SOMMETS ? T.SOMMETS[y * V + x] : 0;
      sol += ch === 'o' ? 'a' : ch !== '.' ? 'h' : k === 2 ? 'e' : 'c';
    }
  }
  const tout = Object.keys(copie.blocs).map(Number).concat(copie.potager.parcelles.map((p) => p.case), copie.verger.arbres.map((t) => t.case));
  const cs = tout.map((t) => t % W), rs = tout.map((t) => Math.floor(t / W));
  return {
    ...r, largeur: W, hauteur: H, sol, blocs: { ...copie.blocs },
    parcelles: copie.potager.parcelles.map((p) => p.case), arbres: copie.verger.arbres.map((t) => t.case),
    cour: tout.length ? [Math.min(...cs), Math.min(...rs), Math.max(...cs), Math.max(...rs)] : null,
  };
}
