import { mulberry32 } from './base.js';
import { DATA } from './catalog.js';
import { hache } from './ferme-generee.js';
import { BIOME } from './monde-gen.js';

/* ---------- les hameaux bâtis du grand monde (docs/grand-monde.md : fiche 7a) ----------

   Chaque hameau du plan (monde-gen.js, lieux.hameaux : { id, case, nom }, sa case sur le chemin)
   devient un petit village, tiré de la graine du monde et de l'id du hameau : toujours le même, que
   le calcul se fasse dans le Web Worker (js/monde-worker.js) ou en direct (Node, les tests). Il est
   fait une fois pour tout le monde, avec les éléments (monde-sol.js, elementsSol : plansDesHameaux),
   puis chaque région en prend sa part (hameauxDeRegion : les cases fermées à la marche, les images,
   ce qui se peint dans le sol). Les réglages : data/monde.json (HAMEAUX) ; les dessins :
   scripts/carte/hameaux.py (assets/hameaux.png, hameaux.json).

   Le plan d'un hameau (planHameau), dans un carré de RAYON cases autour de sa case :
     - le style, d'après le pays autour (caractere : la montagne, la côte, le marais, la forêt, la
       lande, sinon la prairie) : la matière des murs, le toit, le sol des maisons, la place ;
     - la place : un rond de terre battue (PLACE cases de rayon, pavé en montagne et sur la côte)
       autour de la case du hameau, que traversent les chemins du plan ; son puits, son banc, le
       panneau à son nom, au bord de la place, là où un chemin arrive ;
     - les maisons (MAISONS) : un rectangle de murs, la porte au sud (on la voit), des fenêtres sur
       la façade ; une ou deux cloisons (une chambre, deux) percées d'une porte ; chaque pièce a ses
       meubles (le foyer, la table, le coffre… dans la salle commune ; les lits partout : chaque
       pièce close a les siens, la salle son lit clos) ; une ruelle mène de sa porte à la place, à
       un chemin ou à une autre ruelle (RUELLE cases au plus) ; les maisons ne se touchent pas (une
       case libre autour de chacune) ;
     - les jardins (JARDINS) : un potager (des rangs de légumes sur la terre) ou un verger (des
       arbres fruitiers), clôturés, leur portillon relié par une ruelle ;
     - les dépendances : des tas de bois contre les maisons, un poulailler (vide : les bêtes
       viendront avec les habitants), le lieu de travail du métier (TRAVAIL) ;
     - pour la fiche 7b (les habitants) : le métier que le lieu suggère, les maisons (id, emprise,
       porte, pièces, lits, foyer), les lieux de travail.
   Rien n'est posé sur l'eau, une falaise, un sommet, un chemin (ils restent ouverts), près d'une
   entrée de grotte ou d'un coin de pêche (LIEUX cases), ni hors du monde ; la ferme est loin (le
   plan met les hameaux à 45 cases au moins). Tout ce qui est bâti, et RESERVE cases autour, est
   « réservé » : la végétation, les rochers et les bêtes ne s'y posent pas (monde-vegetation.js,
   monde-roches.js, monde-faune.js : ctx.reserves). Ailleurs, le monde ne change pas.

   Les cases du monde : rangée × LARGEUR + colonne (comme partout). Les pièces : [sorte, x, y,
   variante], le pied en px (comme la végétation), la sorte : son rang dans HAMEAUX.SORTES. */

export const HAMEAUX = DATA.HAMEAUX;
export const SORTES_HAMEAUX = HAMEAUX.SORTES;
export const SORTE_HAMEAU = Object.fromEntries(SORTES_HAMEAUX.map((s, k) => [s.nom, k]));
const BLOQUE = new Uint8Array(SORTES_HAMEAUX.length);
for (const n of HAMEAUX.BLOQUE) BLOQUE[SORTE_HAMEAU[n]] = 1;
export const STYLES_HAMEAUX = Object.keys(HAMEAUX.STYLES);
const T = 16;
const MATIERES = { pierre: 'pierre', taille: 'taille', bois: 'bois' };
// la terre battue d'une case (la place, une ruelle) : son sol, que monde-sol.js peint comme un chemin
export const TERRE_HAMEAU = 1;

// Ce qui occupe une case du carré d'un hameau (son plan), pendant le tirage.
const LIBRE = 0, PLACE = 1, RUELLE = 2, BATI = 3, MARGE = 4, JARDIN = 5, DEPENDANCE = 6;

// Le biome qui ferme une case (l'eau, la falaise, les sommets) : on n'y bâtit ni n'y marche.
const FERMES = new Set(['mer', 'lac', 'riviere', 'falaise', 'sommet'].map((b) => BIOME[b]));

/* ---------- le caractère et le métier ---------- */

// Le style d'un hameau (une clé de HAMEAUX.STYLES) et les parts du pays autour : { style, parts }.
// `biome(i)` : le biome de la case i (les eaux posées comprises).
export function caractere(c, r, W, H, biome) {
  const C = HAMEAUX.CARACTERE, R = C.RAYON;
  const n = { montagne: 0, cote: 0, marais: 0, foret: 0, lande: 0, eau: 0 };
  let total = 0;
  for (let y = Math.max(0, r - R); y <= Math.min(H - 1, r + R); y += C.PAS) {
    for (let x = Math.max(0, c - R); x <= Math.min(W - 1, c + R); x += C.PAS) {
      if ((x - c) ** 2 + (y - r) ** 2 > R * R) continue;
      const b = biome(y * W + x);
      total++;
      if (b === BIOME.montagne || b === BIOME.sommet) n.montagne++;
      else if (b === BIOME.plage || b === BIOME.mer || b === BIOME.falaise) n.cote++;
      else if (b === BIOME.marais) n.marais++;
      else if (b === BIOME.foret) n.foret++;
      else if (b === BIOME.lande) n.lande++;
      if (b === BIOME.mer || b === BIOME.lac || b === BIOME.riviere) n.eau++;
    }
  }
  const parts = {};
  for (const k of Object.keys(n)) parts[k] = total ? n[k] / total : 0;
  // (le pays qui pèse le plus, rapporté à son seuil ; aucun ne l'atteint : la prairie)
  let style = 'prairie', best = 1;
  for (const k of C.ORDRE) if (parts[k] / C.SEUILS[k] >= best) { best = parts[k] / C.SEUILS[k]; style = k; }
  return { style, parts };
}

// Le métier que le lieu suggère (HAMEAUX.METIERS) : mineur près d'une grotte, pêcheur près de l'eau,
// bûcheron près de la forêt, berger sur la lande, sinon cueilleur.
export function metierDuLieu(c, r, parts, lieux, W) {
  const M = HAMEAUX.METIERS;
  const pres = (liste, d) => (liste || []).some((l) => Math.hypot((l.case % W) - c, Math.floor(l.case / W) - r) <= d);
  const ok = {
    mineur: pres(lieux.grottes, M.GROTTE),
    pecheur: parts.eau >= M.EAU || pres(lieux.peche, M.PECHE),
    bucheron: parts.foret >= M.FORET,
    berger: parts.lande >= M.LANDE,
    cueilleur: true,
  };
  return M.ORDRE.find((m) => ok[m]) || 'cueilleur';
}

/* ---------- le plan d'un hameau ---------- */

// planHameau(m, h[, rayon, serre]) → le plan du hameau h ({ id, case, nom }) ; `m` : le monde ({ graine, W, H, F (la
// ferme), lieux (ceux du plan), chemins (Uint8Array : 1 un chemin, 2 un gué), biome(i) }). Le plan :
// { id, nom, case, style, metier, [gue, maisonMaurice : le Gué du récit et l'id de la maison de Maurice],
//   cadre: { x0, y0, x1, y1 } (les cases bâties, bornes comprises),
//   place: { centre, cases, puits, banc, panneau }, maisons: [{ id, x0, y0, l, h, porte, devant,
//   pieces: [{ genre, cases }], lits: [{ case, sorte }], foyer, fenetres, dedans }], jardins: [{ genre,
//   cases, portillon }], travail: [{ genre, case }], ruelles: [cases] } ; et, à part (pas envoyés à la
//   page) : pieces ([sorte, x, y, variante]…), basses (de même), bloque (les cases fermées), terre (les
//   cases de terre battue), emprise (les cases réservées).
export function planHameau(m, h, rayon = HAMEAUX.RAYON, serre = false) {
  const { W, H, F } = m, Rr = rayon, N = 2 * Rr + 1;
  const cx = h.case % W, cy = Math.floor(h.case / W), gx0 = cx - Rr, gy0 = cy - Rr;
  const rnd = mulberry32(hache(m.graine + ':hameau:' + h.id));
  const entre = ([a, b]) => a + Math.floor(rnd() * (b - a + 1));
  const { style, parts } = caractere(cx, cy, W, H, m.biome);
  const S = HAMEAUX.STYLES[style];
  // (un hameau garanti du récit, PLAN_MONDE.HAMEAUX.GARANTIS : son métier, si un peu de son pays l'entoure)
  const G = (DATA.PLAN_MONDE.HAMEAUX.GARANTIS || []).find((g) => g.id === h.garanti);
  const metier = G && G.metier && parts[G.pays] > 0 ? G.metier : metierDuLieu(cx, cy, parts, m.lieux, W);
  // le carré : ses cases (j, local) ↔ celles du monde (i)
  const dans = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
  const monde = (x, y) => (gy0 + y) * W + gx0 + x;
  const occ = new Uint8Array(N * N);
  const route = new Uint8Array(N * N);       // un chemin du plan (on y marche, on n'y bâtit pas)
  const ouvert = new Uint8Array(N * N);      // on peut y marcher (la terre, un chemin, un gué)
  const batissable = new Uint8Array(N * N);  // on peut y bâtir
  const bloque = new Uint8Array(N * N);
  const lieuxPres = [...(m.lieux.grottes || []), ...(m.lieux.peche || [])].filter((l) => Math.abs((l.case % W) - cx) <= Rr + HAMEAUX.LIEUX + 3 && Math.abs(Math.floor(l.case / W) - cy) <= Rr + HAMEAUX.LIEUX + 3);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const X = gx0 + x, Y = gy0 + y, j = y * N + x;
      if (X < 3 || Y < 3 || X >= W - 3 || Y >= H - 3) continue;
      if (X >= F.X - 8 && Y >= F.Y - 8 && X < F.X + F.LARGEUR + 8 && Y < F.Y + F.HAUTEUR + 8) continue;
      const i = Y * W + X, b = m.biome(i);
      if (m.chemins[i]) { route[j] = 1; ouvert[j] = 1; continue; }
      if (FERMES.has(b)) continue;
      ouvert[j] = 1;
      // (près d'une entrée de grotte ou d'un coin de pêche, on ne bâtit pas : ils restent tels quels)
      if (lieuxPres.some((l) => Math.max(Math.abs((l.case % W) - X), Math.abs(Math.floor(l.case / W) - Y)) <= HAMEAUX.LIEUX)) continue;
      batissable[j] = 1;
    }
  }
  const pieces = [], basses = [];
  const pose = (nom, X, Y, v = 0, basse = false) => (basse ? basses : pieces).push(SORTE_HAMEAU[nom], X, Y, v);
  // une pièce posée sur la case locale (x, y) : son pied au milieu du bas de sa case (de ses cases)
  const poseCase = (nom, x, y, v = 0) => {
    const s = SORTES_HAMEAUX[SORTE_HAMEAU[nom]], l = s.largeur || 1;
    pose(nom, (gx0 + x) * T + (l * T) / 2, (gy0 + y + 1) * T - (s.pied || 0), v, s.genre === 'basse');
    if (BLOQUE[SORTE_HAMEAU[nom]]) for (let k = 0; k < l; k++) bloque[y * N + x + k] = 1;
  };
  // Le chemin le plus court (en cases) de `depart` (locale) à une case de `buts` (une fonction), par
  // les cases `passe` ; au plus `max` pas. → la liste des cases (le départ d'abord), ou null.
  const chercher = (depart, buts, passe, max = Infinity) => {
    const de = new Int32Array(N * N).fill(-2), dist = new Int32Array(N * N), file = [depart];
    de[depart] = -1;
    for (let k = 0; k < file.length; k++) {
      const j = file[k];
      if (buts(j)) { const out = []; for (let q = j; q !== -1; q = de[q]) out.push(q); return out.reverse(); }
      if (dist[j] >= max) continue;
      const x = j % N, y = (j / N) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x2 = x + dx, y2 = y + dy, j2 = y2 * N + x2;
        if (!dans(x2, y2) || de[j2] !== -2 || !passe(j2)) continue;
        de[j2] = j;
        dist[j2] = dist[j] + 1;
        file.push(j2);
      }
    }
    return null;
  };
  const reseau = (j) => route[j] || occ[j] === PLACE || occ[j] === RUELLE;
  const passant = (j) => ouvert[j] && !bloque[j] && occ[j] !== BATI && occ[j] !== JARDIN && occ[j] !== DEPENDANCE;

  /* -- la place -- */
  const c0 = Rr * N + Rr, P = serre ? 1 : HAMEAUX.PLACE;
  const place = [];
  for (let y = Rr - P; y <= Rr + P; y++) {
    for (let x = Rr - P; x <= Rr + P; x++) {
      const j = y * N + x;
      if ((x - Rr) ** 2 + (y - Rr) ** 2 > P * P + 1 || !ouvert[j]) continue;
      if (!route[j] && !batissable[j]) continue;
      occ[j] = PLACE;
      place.push(j);
    }
  }
  // le puits : la case de la place hors du chemin la plus proche du centre, ses voisines ouvertes
  const libres = (j) => [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => passant(j + dy * N + dx));
  const parDistance = (liste, x0, y0) => liste.slice().sort((a, b) => ((a % N) - x0) ** 2 + (((a / N) | 0) - y0) ** 2 - (((b % N) - x0) ** 2 + (((b / N) | 0) - y0) ** 2) || a - b);
  const puits = parDistance(place.filter((j) => j !== c0 && !route[j] && batissable[j] && libres(j)), Rr, Rr)[0];
  if (puits !== undefined) poseCase('puits', puits % N, (puits / N) | 0);
  // le banc : deux cases de la place hors du chemin, pas collées au puits
  let banc = null;
  for (const j of parDistance(place, Rr, Rr - 2)) {
    const x = j % N, y = (j / N) | 0;
    if (j === c0 || j + 1 === c0 || route[j] || route[j + 1] || occ[j + 1] !== PLACE || bloque[j] || bloque[j + 1] || !batissable[j] || !batissable[j + 1]) continue;
    if (puits !== undefined && Math.abs(x - (puits % N)) <= 2 && Math.abs(y - ((puits / N) | 0)) <= 1) continue;
    if (!libres(j) || !libres(j + 1)) continue;
    banc = j;
    poseCase('banc', x, y);
    // (le banc ne doit pas couper la place : ses cases voisines restent reliées)
    break;
  }
  // le panneau : au bord de la place, à côté d'une case de chemin qui y arrive
  let panneau = null;
  const bords = [];
  for (let y = 1; y < N - 1; y++) {
    for (let x = 1; x < N - 1; x++) {
      const j = y * N + x, d = Math.hypot(x - Rr, y - Rr);
      if (d < P + 0.5 || d > P + 2.5 || route[j] || !batissable[j] || occ[j]) continue;
      if (![1, -1, N, -N].some((q) => route[j + q])) continue;
      bords.push(j);
    }
  }
  panneau = parDistance(bords, Rr, Rr + P + 1)[0];
  if (panneau === undefined) panneau = parDistance(place.filter((j) => !route[j] && !bloque[j] && batissable[j] && libres(j)), Rr, Rr + P)[0];
  if (panneau !== undefined) { poseCase('panneau', panneau % N, (panneau / N) | 0); occ[panneau] = occ[panneau] || DEPENDANCE; }
  // (le centre du hameau, s'il n'est pas un chemin, est de la place : le réseau y commence)
  if (!route[c0] && occ[c0] !== PLACE && ouvert[c0]) { occ[c0] = PLACE; place.push(c0); }

  /* -- les maisons -- */
  const maisons = [], ruelles = [];
  const voulues = entre(HAMEAUX.MAISONS);
  const tracerRuelle = (chemin) => { for (const j of chemin) if (!route[j] && occ[j] !== PLACE && occ[j] !== RUELLE) { occ[j] = RUELLE; ruelles.push(j); } };
  // (une maison qui ne trouve pas sa place : une autre essaie, plus petite s'il en manque pour faire
  // le nombre minimal ; la ruelle peut alors être deux fois plus longue)
  for (let n = 0; n < voulues + 4 && maisons.length < voulues; n++) {
    let best = null;
    const manque = maisons.length < HAMEAUX.MAISONS[0] && n >= maisons.length + 1;
    for (let essai = 0; essai < HAMEAUX.ESSAIS * (manque ? 4 : 1); essai++) {
      const petite = manque && essai >= HAMEAUX.ESSAIS * 2;
      const l = petite ? HAMEAUX.PETITE[0] : entre(HAMEAUX.LARGEUR), hh = petite ? HAMEAUX.PETITE[1] : entre(HAMEAUX.HAUTEUR);
      const x0 = 1 + Math.floor(rnd() * (N - l - 2)), y0 = 1 + Math.floor(rnd() * (N - hh - 2));
      const xd = x0 + 2 + Math.floor(rnd() * Math.max(1, l - 4)), sc = rnd();
      let ok = true;
      for (let y = y0 - 1; y <= y0 + hh && ok; y++) {
        for (let x = x0 - 1; x <= x0 + l && ok; x++) {
          const j = y * N + x, bord = x < x0 || y < y0 || x >= x0 + l || y >= y0 + hh;
          if (!dans(x, y)) { ok = false; break; }
          if (bord) { if (!ouvert[j] || (occ[j] !== LIBRE && occ[j] !== PLACE && occ[j] !== RUELLE && occ[j] !== MARGE) || bloque[j]) ok = false; } else if (!batissable[j] || route[j] || occ[j] !== LIBRE) ok = false;
        }
      }
      if (!ok) continue;
      const devant = (y0 + hh) * N + xd;
      // (sa ruelle : de la case devant la porte au réseau, sans passer sous elle-même)
      const dedans = (j) => { const x = j % N, y = (j / N) | 0; return x >= x0 && y >= y0 && x < x0 + l && y < y0 + hh; };
      const ch = chercher(devant, reseau, (j) => passant(j) && !dedans(j), HAMEAUX.RUELLE * (manque ? 2 : 1));
      if (!ch) continue;
      const note = ch.length + 0.25 * Math.hypot(x0 + l / 2 - Rr, y0 + hh / 2 - Rr) + 3 * sc;
      if (!best || note < best.note) best = { note, x0, y0, l, hh, xd, devant, ch };
    }
    if (!best) continue;
    const { x0, y0, l, hh, xd, devant, ch } = best;
    for (let y = y0 - 1; y <= y0 + hh; y++) for (let x = x0 - 1; x <= x0 + l; x++) { const j = y * N + x; if (x >= x0 && y >= y0 && x < x0 + l && y < y0 + hh) occ[j] = BATI; else if (occ[j] === LIBRE) occ[j] = MARGE; }
    tracerRuelle(ch);
    maisons.push({ x0, y0, l, h: hh, xd, devant });
  }
  // (du nord au sud, de l'ouest à l'est : l'ordre des id ne dépend que du plan)
  maisons.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  // (trop peu de place pour le nombre minimal de maisons : le carré s'agrandit, le tirage recommence)
  // (et, en dernier recours, une place réduite à la case du hameau et ses voisines : un hameau à l'étroit)
  if (maisons.length < HAMEAUX.MAISONS[0] && rayon < HAMEAUX.RAYON + HAMEAUX.AGRANDI) return planHameau(m, h, rayon + 4, serre);
  if (maisons.length < HAMEAUX.MAISONS[0] && !serre) return planHameau(m, h, HAMEAUX.RAYON, true);

  /* -- les intérieurs -- */
  const murs = new Map();      // case locale → 'mur' | 'fenetre' | 'porte' | 'porte_cote'
  const tapis = [];            // (peints après les planchers : [x, y, variante])
  const sols = new Map();      // case locale → sorte du sol (les planchers)
  const plans = [];
  maisons.forEach((mz, k) => {
    const { x0, y0, l, h: hh, xd } = mz, id = h.id + '_maison_' + (k + 1);
    for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + l; x++) if (x === x0 || y === y0 || x === x0 + l - 1 || y === y0 + hh - 1) murs.set(y * N + x, 'mur');
    murs.set((y0 + hh - 1) * N + xd, 'porte');
    // les cloisons (verticales), de quoi faire une ou deux chambres ; la salle commune autour de la porte
    const cloisons = [];
    const ix0 = x0 + 1, ix1 = x0 + l - 2;
    const c1 = Math.max(x0 + 3, xd - 2 - Math.floor(rnd() * 2)), c2 = Math.min(x0 + l - 4, xd + 2 + Math.floor(rnd() * 2));
    if (l >= HAMEAUX.DEUX_CHAMBRES && xd - x0 >= 4 && x0 + l - 1 - xd >= 4 && c2 - c1 - 1 >= 3) {
      cloisons.push(c1, c2);
    } else if (l >= HAMEAUX.CHAMBRE) {
      const gauche = xd - x0 <= l / 2;
      const a = gauche ? Math.max(xd + 2, x0 + 4) : x0 + 3, b = gauche ? x0 + l - 4 : Math.min(xd - 2, x0 + l - 5);
      if (a <= b) cloisons.push(a + Math.floor(rnd() * (b - a + 1)));
    }
    const portesInt = [];
    for (const xc of cloisons) {
      for (let y = y0 + 1; y < y0 + hh - 1; y++) murs.set(y * N + xc, 'mur');
      const yd = y0 + 1 + Math.floor((hh - 2) / 2) + (hh > 6 && rnd() < 0.5 ? 1 : 0);
      murs.set(yd * N + xc, 'porte_cote');
      portesInt.push(yd * N + xc);
    }
    // les pièces : des colonnes entre les cloisons
    const bornes = [ix0 - 1, ...cloisons, ix1 + 1];
    const pieces = [];
    for (let q = 0; q < bornes.length - 1; q++) {
      const a = bornes[q] + 1, b = bornes[q + 1] - 1, cases = [];
      for (let y = y0 + 1; y < y0 + hh - 1; y++) for (let x = a; x <= b; x++) cases.push(y * N + x);
      pieces.push({ genre: xd >= a && xd <= b ? 'salle' : 'chambre', a, b, cases });
    }
    // les fenêtres : sur la façade (le mur du sud), pas à côté de la porte ni d'une cloison, ni deux
    // côte à côte ; une ou deux par pièce
    const fenetres = [];
    for (const p of pieces) {
      const xs = [];
      for (let x = p.a; x <= p.b; x++) if (Math.abs(x - xd) > 1 && !cloisons.some((xc) => Math.abs(x - xc) < 1)) xs.push(x);
      const nf = Math.min(xs.length, p.b - p.a >= 3 ? 2 : 1);
      const pris = [];
      for (const x of xs.sort((u, v) => ((u * 7 + k * 3) % 5) - ((v * 7 + k * 3) % 5) || u - v)) {
        if (pris.length >= nf || pris.some((x2) => Math.abs(x2 - x) < 2)) continue;
        pris.push(x);
      }
      for (const x of pris) { murs.set((y0 + hh - 1) * N + x, 'fenetre'); fenetres.push((y0 + hh - 1) * N + x); }
    }
    // (une maison trop étroite : une fenêtre à côté de la porte, au moins)
    if (!fenetres.length) for (const x of [xd + 1, xd - 1]) if (!fenetres.length && x > x0 && x < x0 + l - 1 && !cloisons.includes(x)) { murs.set((y0 + hh - 1) * N + x, 'fenetre'); fenetres.push((y0 + hh - 1) * N + x); }
    // les meubles, contre les murs ; le milieu reste libre (on va de la porte à chaque lit)
    const meubles = [];       // { nom, x, y } (la case du pied, la plus à gauche)
    const garde = new Set([(y0 + hh - 2) * N + xd]);
    for (const pd of portesInt) { garde.add(pd - 1); garde.add(pd + 1); }
    const prisMeuble = new Set();
    // (`passe` : un meuble qui ne ferme pas, un lit, peut se poser devant une porte, en dernier recours)
    const libre = (x, y, lg = 1, ht = 1, passe = false) => {
      for (let dy = 0; dy < ht; dy++) for (let dx = 0; dx < lg; dx++) { const j = (y - dy) * N + x + dx; if (murs.has(j) || prisMeuble.has(j) || (garde.has(j) && !passe)) return false; }
      return true;
    };
    const met = (nom, x, y, passe = false) => {
      const s = SORTES_HAMEAUX[SORTE_HAMEAU[nom]], lg = s.largeur || 1, ht = s.hauteur || 1;
      if (!libre(x, y, lg, ht, passe)) return false;
      for (let dy = 0; dy < ht; dy++) for (let dx = 0; dx < lg; dx++) prisMeuble.add((y - dy) * N + x + dx);
      meubles.push({ nom, x, y });
      return true;
    };
    const lits = [];
    let foyer = null;
    for (const p of pieces) {
      const haut = y0 + 1, bas = y0 + hh - 2, larg = p.b - p.a + 1, cols = [];
      for (let x = p.a; x <= p.b; x++) cols.push(x);
      if (p.genre === 'salle') {
        // le lit clos de la salle (chaque pièce a ses lits), dans un coin du bas, sinon où il tient ;
        // puis le foyer contre le mur du fond, la table au milieu, un coffre ou un buffet
        const lit = () => {
          for (const x of [p.a, p.b, ...cols]) if (met('lit_adulte', x, bas)) return bas * N + x;
          for (let y = bas - 1; y > haut; y--) for (const x of cols) if (met('lit_adulte', x, y)) return y * N + x;
          for (let y = bas; y > haut; y--) for (const x of cols) if (met('lit_adulte', x, y, true)) return y * N + x;
          return null;
        };
        const lc = lit();
        if (lc !== null) lits.push({ case: lc, sorte: 'lit_adulte' });
        const f0 = Math.floor(rnd() * cols.length);
        for (let q = 0; q < cols.length && foyer === null; q++) { const fx = cols[(f0 + q) % cols.length]; if (met(S.foyer, fx, haut)) foyer = haut * N + fx; }
        const fx = foyer === null ? -1 : foyer % N;
        const meuble = rnd() < 0.5 ? 'buffet' : 'armoire';
        for (const x of cols.slice().reverse()) if (x !== fx && x + 1 !== fx && met(meuble, x, haut)) break;
        const rangee = Math.min(bas - 1, haut + 1 + (bas - haut >= 3 ? 1 : 0));
        if (larg >= 5) {
          const tx = p.a + Math.floor((larg - 3) / 2);
          if (rangee > haut && met('table', tx, rangee)) { met('chaise', tx - 1, rangee); met('chaise', tx + 3, rangee); }
        } else if (larg >= 3 && rangee > haut) met('table_basse', p.a + Math.floor((larg - 2) / 2), rangee);
        // le coffre, au bas d'un coin
        met('coffre', p.a, bas) || met('coffre', p.b - 1, bas);
      } else {
        // les lits contre le mur du fond (un adulte ou deux, puis des enfants), un chevet, une armoire
        const n = Math.max(1, Math.min(3, larg - (larg > 2 ? 1 : 0)));
        let mis = 0;
        for (const x of cols) {
          if (mis >= n) break;
          const sorte = mis < (pieces.length > 2 && rnd() < 0.5 ? 1 : 2) ? 'lit_adulte' : 'lit_enfant';
          if (met(sorte, x, haut + 1)) { lits.push({ case: (haut + 1) * N + x, sorte }); mis++; }
        }
        if (!mis) for (const y of [bas, haut + 1]) for (const x of cols) if (!mis && met('lit_adulte', x, y)) { lits.push({ case: y * N + x, sorte: 'lit_adulte' }); mis++; }
        for (const x of cols) if (met('chevet', x, haut)) break;
        if (bas - haut >= 3) met('armoire', p.b - 1, bas) || met('armoire', p.a, bas);
      }
    }
    // chaque lit, chaque case libre, se rejoint depuis la porte : sinon, le dernier meuble qui ferme
    // est ôté (les lits, les tapis s'ouvrent)
    const ferme = (nom) => BLOQUE[SORTE_HAMEAU[nom]];
    const caseDe = (mb) => { const s = SORTES_HAMEAUX[SORTE_HAMEAU[mb.nom]], out = []; for (let dy = 0; dy < (s.hauteur || 1); dy++) for (let dx = 0; dx < (s.largeur || 1); dx++) out.push((mb.y - dy) * N + mb.x + dx); return out; };
    const interieur = pieces.flatMap((p) => p.cases).concat(portesInt);
    for (let essai = 0; essai < meubles.length + 1; essai++) {
      const fermees = new Set(meubles.filter((mb) => ferme(mb.nom)).flatMap(caseDe));
      const vus = new Set(), file = [(y0 + hh - 2) * N + xd];
      vus.add(file[0]);
      for (let q = 0; q < file.length; q++) {
        const j = file[q];
        for (const d of [1, -1, N, -N]) { const j2 = j + d; if (!vus.has(j2) && interieur.includes(j2) && !fermees.has(j2)) { vus.add(j2); file.push(j2); } }
      }
      const manque = interieur.some((j) => !fermees.has(j) && !vus.has(j));
      if (!manque) break;
      const idx = meubles.map((mb, q) => (ferme(mb.nom) && !['four', 'cuisiniere', 'table'].includes(mb.nom) ? q : -1)).filter((q) => q >= 0).pop();
      if (idx === undefined) break;
      meubles.splice(idx, 1);
    }
    // le tapis de la salle, s'il y a la place sous la table (peint sur le plancher)
    const salle = pieces.find((p) => p.genre === 'salle');
    for (const mb of meubles) poseCase(mb.nom, mb.x, mb.y);
    if (salle && salle.b - salle.a + 1 >= 5 && rnd() < 0.6) {
      const table = meubles.find((mb) => mb.nom === 'table');
      if (table && table.y + 1 < y0 + hh - 1) tapis.push([table.x, table.y + 1, Math.floor(rnd() * 3)]);
    }
    for (const j of interieur) sols.set(j, S.sol);
    const casesM = (liste) => liste.map((j) => monde(j % N, (j / N) | 0));
    plans.push({
      id, x0: gx0 + x0, y0: gy0 + y0, l, h: hh,
      porte: monde(xd, y0 + hh - 1), devant: monde(xd, y0 + hh),
      pieces: pieces.map((p) => ({ genre: p.genre, cases: casesM(p.cases) })),
      lits: lits.map((b) => ({ case: monde(b.case % N, (b.case / N) | 0), sorte: b.sorte })),
      foyer: foyer === null ? null : monde(foyer % N, (foyer / N) | 0),
      fenetres: casesM(fenetres), dedans: casesM(interieur),
    });
  });

  /* -- les jardins -- */
  const jardins = [];
  const voulusJ = entre(HAMEAUX.JARDINS);
  for (let n = 0; n < voulusJ; n++) {
    let best = null;
    for (let essai = 0; essai < HAMEAUX.ESSAIS * (jardins.length ? 1 : 3); essai++) {
      const l = entre(HAMEAUX.JARDIN[0]), hh = entre(HAMEAUX.JARDIN[1]);
      const x0 = 1 + Math.floor(rnd() * (N - l - 2)), y0 = 1 + Math.floor(rnd() * (N - hh - 2));
      let ok = true;
      for (let y = y0 - 1; y <= y0 + hh && ok; y++) {
        for (let x = x0 - 1; x <= x0 + l && ok; x++) {
          const j = y * N + x, bord = x < x0 || y < y0 || x >= x0 + l || y >= y0 + hh;
          if (bord) { if (!ouvert[j] || occ[j] === BATI || occ[j] === JARDIN || occ[j] === DEPENDANCE || bloque[j]) ok = false; } else if (!batissable[j] || route[j] || occ[j] !== LIBRE) ok = false;
        }
      }
      if (!ok) continue;
      // le portillon : au milieu d'un côté, relié au réseau par une ruelle
      const cotes = [[x0 + (l >> 1), y0 + hh - 1, 0, 1], [x0 + (l >> 1), y0, 0, -1], [x0, y0 + (hh >> 1), -1, 0], [x0 + l - 1, y0 + (hh >> 1), 1, 0]];
      let portillon = null, ch = null;
      for (const [x, y, dx, dy] of cotes) {
        const dehors = (y + dy) * N + x + dx;
        const dedans = (j) => { const u = j % N, v = (j / N) | 0; return u >= x0 && v >= y0 && u < x0 + l && v < y0 + hh; };
        const c = chercher(dehors, reseau, (j) => passant(j) && !dedans(j), HAMEAUX.RUELLE);
        if (c && (!ch || c.length < ch.length)) { ch = c; portillon = y * N + x; }
      }
      if (!ch) continue;
      // (près d'une maison : le jardin de quelqu'un)
      const pres = Math.min(99, ...maisons.map((mz) => Math.max(Math.abs(mz.x0 + mz.l / 2 - (x0 + l / 2)) - (mz.l + l) / 2, Math.abs(mz.y0 + mz.h / 2 - (y0 + hh / 2)) - (mz.h + hh) / 2)));
      const note = ch.length + 2 * Math.max(0, pres) + 2 * rnd();
      if (!best || note < best.note) best = { note, x0, y0, l, hh, portillon, ch };
    }
    if (!best) continue;
    const { x0, y0, l, hh, portillon, ch } = best;
    const genre = rnd() * HAMEAUX.VERGER < 1 ? 'verger' : 'potager';
    const cases = [];
    for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + l; x++) { const j = y * N + x; occ[j] = JARDIN; cases.push(j); }
    tracerRuelle(ch);
    jardins.push({ genre, x0, y0, l, h: hh, portillon, cases });
  }
  // les clôtures (une barrière sur le bord de chaque jardin, sauf le portillon), le dedans
  const barrieres = new Set();
  for (const jd of jardins) {
    for (const j of jd.cases) {
      const x = j % N, y = (j / N) | 0;
      const bord = x === jd.x0 || y === jd.y0 || x === jd.x0 + jd.l - 1 || y === jd.y0 + jd.h - 1;
      if (bord && j !== jd.portillon) barrieres.add(j);
    }
    const espece = Math.floor(rnd() * 5), legumes = [0, 1, 2, 3, 4, 5].sort(() => rnd() - 0.5);
    for (let y = jd.y0 + 1; y < jd.y0 + jd.h - 1; y++) {
      for (let x = jd.x0 + 1; x < jd.x0 + jd.l - 1; x++) {
        if (jd.genre === 'potager') { poseCase('terre', x, y); poseCase('potager', x, y, legumes[(y - jd.y0 - 1) % 6]); } else if ((x - jd.x0) % 3 === 2 && (y - jd.y0) % 3 === 2 - ((x - jd.x0) % 2)) poseCase('fruitier', x, y, (espece + x) % 5);
      }
    }
    // (un verger trop petit pour qu'un arbre y tombe juste : au moins un, au milieu)
    if (jd.genre === 'verger' && !pieces.some((v, q) => q % 4 === 0 && v === SORTE_HAMEAU.fruitier && Math.floor(pieces[q + 1] / T) - gx0 >= jd.x0 && Math.floor(pieces[q + 1] / T) - gx0 < jd.x0 + jd.l && Math.floor((pieces[q + 2] - 1) / T) - gy0 >= jd.y0 && Math.floor((pieces[q + 2] - 1) / T) - gy0 < jd.y0 + jd.h)) {
      poseCase('fruitier', jd.x0 + (jd.l >> 1), jd.y0 + (jd.h >> 1), espece);
    }
  }
  const masqueDe = (ens, j) => (ens.has(j - N) ? 1 : 0) + (ens.has(j + 1) ? 2 : 0) + (ens.has(j + N) ? 4 : 0) + (ens.has(j - 1) ? 8 : 0);

  /* -- les dépendances et le lieu de travail -- */
  // Une pièce de `largeur` cases posée sur des cases libres, près d'un point ; elle ne doit couper
  // aucun passage (chaque porte, chaque portillon reste relié à la place). → la case, ou null.
  const portes = maisons.map((mz) => mz.devant).concat(jardins.map((jd) => {
    const x = jd.portillon % N, y = (jd.portillon / N) | 0;
    return x === jd.x0 ? jd.portillon - 1 : x === jd.x0 + jd.l - 1 ? jd.portillon + 1 : y === jd.y0 ? jd.portillon - N : jd.portillon + N;
  }));
  const tousRelies = () => {
    const vus = new Uint8Array(N * N), file = [];
    for (const j of place) if (passant(j)) { vus[j] = 1; file.push(j); }
    for (let k = 0; k < file.length; k++) {
      const j = file[k], x = j % N, y = (j / N) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j2 = (y + dy) * N + x + dx;
        if (dans(x + dx, y + dy) && !vus[j2] && passant(j2) && !barrieres.has(j2)) { vus[j2] = 1; file.push(j2); }
      }
    }
    return portes.every((j) => vus[j]);
  };
  const essaiePiece = (nom, autour, rayon, occs = [LIBRE]) => {
    const lg = SORTES_HAMEAUX[SORTE_HAMEAU[nom]].largeur || 1;
    const ax = autour % N, ay = (autour / N) | 0, cand = [];
    for (let y = Math.max(1, ay - rayon); y <= Math.min(N - 2, ay + rayon); y++) {
      for (let x = Math.max(1, ax - rayon); x <= Math.min(N - 1 - lg, ax + rayon); x++) {
        let ok = true;
        for (let d = 0; d < lg && ok; d++) { const j = y * N + x + d; if (!batissable[j] || route[j] || bloque[j] || barrieres.has(j) || !occs.includes(occ[j]) || portes.includes(j)) ok = false; }
        if (ok) cand.push(y * N + x);
      }
    }
    for (const j of parDistance(cand, ax, ay)) {
      for (let d = 0; d < lg; d++) bloque[j + d] = 1;
      if (tousRelies()) { for (let d = 0; d < lg; d++) bloque[j + d] = 0; for (let d = 0; d < lg; d++) if (occ[j + d] === LIBRE) occ[j + d] = DEPENDANCE; poseCase(nom, j % N, (j / N) | 0, nom === 'tas_bois' ? (j % 2) : 0); return j; }
      for (let d = 0; d < lg; d++) bloque[j + d] = 0;
    }
    return null;
  };
  // des tas de bois contre le mur d'une maison (sur sa marge), une fois sur TAS
  for (const mz of maisons) {
    if (rnd() * HAMEAUX.TAS >= 1) continue;
    const cote = rnd() < 0.5 ? mz.x0 - 1 : mz.x0 + mz.l;
    essaiePiece('tas_bois', (mz.y0 + mz.h - 2) * N + cote, 0, [MARGE]);
  }
  // le lieu de travail, près de la place (ou l'enclos du berger), puis le poulailler près d'une maison
  const travail = [];
  const TR = HAMEAUX.TRAVAIL[metier];
  if (TR.lieu === 'enclos') {
    // un enclos clôturé : la meilleure place libre près de la place, son entrée vers elle
    const [el, eh] = HAMEAUX.ENCLOS;
    let fait = false;
    for (const d of [P + 2, P + 4, P + 6, P + 9, P + 12]) {
      for (const [ux, uy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        if (fait) break;
        const x0 = Rr + ux * d - (ux < 0 ? el - 1 : ux === 0 ? el >> 1 : 0), y0 = Rr + uy * d - (uy < 0 ? eh - 1 : uy === 0 ? eh >> 1 : 0);
        let ok = x0 >= 1 && y0 >= 1 && x0 + el < N - 1 && y0 + eh < N - 1;
        for (let y = y0; y < y0 + eh && ok; y++) for (let x = x0; x < x0 + el && ok; x++) { const j = y * N + x; if (!batissable[j] || route[j] || occ[j] !== LIBRE || bloque[j]) ok = false; }
        if (!ok) continue;
        const entree = (uy <= 0 ? y0 + eh - 1 : y0) * N + x0 + (el >> 1);
        const ajout = [];
        for (let y = y0; y < y0 + eh; y++) for (let x = x0; x < x0 + el; x++) { const j = y * N + x; if ((x === x0 || y === y0 || x === x0 + el - 1 || y === y0 + eh - 1) && j !== entree) ajout.push(j); }
        for (const j of ajout) barrieres.add(j);
        const dehors = entree + (uy <= 0 ? N : -N);
        const ch = passant(dehors) && !barrieres.has(dehors) ? chercher(dehors, reseau, (j) => passant(j) && !barrieres.has(j), HAMEAUX.RUELLE) : null;
        const relie = ch && tousRelies();
        if (!relie) { for (const j of ajout) barrieres.delete(j); continue; }
        for (let y = y0; y < y0 + eh; y++) for (let x = x0; x < x0 + el; x++) occ[y * N + x] = JARDIN;
        tracerRuelle(ch);
        portes.push(dehors);
        const auge = (y0 + 1) * N + x0 + 1;
        poseCase('auge', x0 + 1, y0 + 1);
        travail.push({ genre: 'enclos', case: monde(x0 + (el >> 1), y0 + (eh >> 1)), cases: [] }, { genre: 'auge', case: monde(auge % N, (auge / N) | 0) });
        fait = true;
      }
      if (fait) break;
    }
  } else {
    for (const nom of TR.pieces) {
      const j = essaiePiece(nom, c0, P + 6);
      if (j !== null) travail.push({ genre: nom, case: monde(j % N, (j / N) | 0) });
    }
  }
  if (maisons.length) {
    const mz = maisons[Math.floor(rnd() * maisons.length)];
    const j = essaiePiece('poulailler', (mz.y0 + mz.h) * N + mz.x0 + mz.l + 1, 5);
    if (j !== null) travail.push({ genre: 'poulailler', case: monde(j % N, (j / N) | 0) });
  }
  if (travail.length) travail[0].lieu = TR.lieu;

  /* -- les murs, les fenêtres, les portes, les barrières, les sols : leurs pièces -- */
  const M = MATIERES[S.mur];
  const estMur = (j) => { const t = murs.get(j); return t === 'mur' || t === 'fenetre'; };
  const estPorte = (j) => { const t = murs.get(j); return t === 'porte' || t === 'porte_cote'; };
  for (const [j, t] of murs) {
    const x = j % N, y = (j / N) | 0;
    if (t === 'porte') { poseCase('porte_' + M, x, y); continue; }
    if (t === 'porte_cote') { poseCase('porte_cote', x, y); continue; }
    // (le masque des murs voisins, comme js/carte/ferme/chantier.js wallFrame : une porte compte à
    // gauche et à droite)
    const v = (estMur(j - N) ? 1 : 0) + (estMur(j + 1) || estPorte(j + 1) ? 2 : 0) + (estMur(j + N) ? 4 : 0) + (estMur(j - 1) || estPorte(j - 1) ? 8 : 0);
    poseCase((t === 'fenetre' ? 'fenetre_' : 'mur_') + M, x, y, v);
  }
  // (la barrière se raccorde à ses voisines, comme celle de la ferme)
  for (const j of barrieres) poseCase('barriere', j % N, (j / N) | 0, masqueDe(barrieres, j));
  for (const [j, s] of sols) {
    const meme = (q) => sols.get(q) === s;
    poseCase(s, j % N, (j / N) | 0, (meme(j - N) ? 1 : 0) + (meme(j + 1) ? 2 : 0) + (meme(j + N) ? 4 : 0) + (meme(j - 1) ? 8 : 0));
  }
  for (const [x, y, v] of tapis) poseCase('tapis', x, y, v);
  // la place pavée (la montagne, la côte), sur la terre battue
  if (S.place === 'paves') {
    const pav = new Set(place);
    for (const j of pav) poseCase('paves', j % N, (j / N) | 0, masqueDe(pav, j));
  }
  // le platelage du marais : des planches devant les maisons (la rangée sous la façade)
  if (S.platelage) {
    const pl = new Set();
    for (const mz of maisons) for (let x = mz.x0 - 1; x <= mz.x0 + mz.l; x++) { const j = (mz.y0 + mz.h) * N + x; if (ouvert[j] && !route[j] && !bloque[j] && occ[j] !== JARDIN && occ[j] !== DEPENDANCE) pl.add(j); }
    for (const j of pl) poseCase('sol_plancher', j % N, (j / N) | 0, masqueDe(pl, j));
  }
  for (const [j, t] of murs) if (t === 'mur' || t === 'fenetre') bloque[j] = 1;
  for (const j of barrieres) bloque[j] = 1;

  /* -- ce que le monde en garde -- */
  const terre = [], bloquees = [], emprise = new Set();
  let x0 = N, y0 = N, x1 = -1, y1 = -1;
  const RES = HAMEAUX.RESERVE;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const j = y * N + x;
      if (bloque[j]) bloquees.push(monde(x, y));
      if ((occ[j] === PLACE || occ[j] === RUELLE) && !route[j]) terre.push(monde(x, y));
      const bati = occ[j] === PLACE || occ[j] === RUELLE || occ[j] === BATI || occ[j] === JARDIN || occ[j] === DEPENDANCE || bloque[j];
      if (!bati) continue;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      for (let dy = -RES; dy <= RES; dy++) for (let dx = -RES; dx <= RES; dx++) if (dans(x + dx, y + dy)) emprise.add(monde(x + dx, y + dy));
    }
  }
  return {
    plan: {
      id: h.id, nom: h.nom, case: h.case, style, metier, ...(h.garanti ? { garanti: h.garanti } : {}),
      // le Gué (le récit) : sa première maison est celle de Maurice, vide, sans foyer (habitants.js)
      ...(h.gue && plans.length ? { gue: true, maisonMaurice: plans[0].id } : {}),
      cadre: { x0: gx0 + x0, y0: gy0 + y0, x1: gx0 + x1, y1: gy0 + y1 },
      place: {
        centre: h.case, cases: place.map((j) => monde(j % N, (j / N) | 0)),
        puits: puits === undefined ? null : monde(puits % N, (puits / N) | 0),
        banc: banc === null ? null : monde(banc % N, (banc / N) | 0),
        panneau: panneau === undefined ? null : monde(panneau % N, (panneau / N) | 0),
      },
      maisons: plans,
      jardins: jardins.map((jd) => ({ genre: jd.genre, cases: jd.cases.map((j) => monde(j % N, (j / N) | 0)), portillon: monde(jd.portillon % N, (jd.portillon / N) | 0) })),
      travail,
      ruelles: ruelles.map((j) => monde(j % N, (j / N) | 0)),
    },
    pieces, basses, bloque: bloquees, terre, emprise: [...emprise].sort((a, b) => a - b),
  };
}

/* ---------- les bâtisses du récit : la cabane de Johnny, l'atelier de Frida (lot 3b) ----------

   Bâties comme les maisons des hameaux, avec les mêmes pièces (murs, fenêtres, porte, planchers,
   meubles ; le toit de leur style, qui s'efface quand on entre : js/carte/ferme/hameaux.js) : un plan
   de hameau d'une seule maison, sans place, sans habitants, marqué `batisse` (la sorte du lieu). Leur
   case (lieux.recit, monde-gen.js) est celle devant la porte. Leur forme : HAMEAUX.BATISSES
   (data/monde.json). */

const BATISSES = HAMEAUX.BATISSES || {};
export const SORTES_BATISSES = Object.keys(BATISSES);


// planBatisse(m, l) → { plan, pieces, basses, bloque, terre, emprise } comme planHameau, pour le lieu
// `l` ({ id, sorte, case }) ; null pour une sorte qui n'est pas bâtie (l'épave : un dessin).
export function planBatisse(m, l) {
  const B = BATISSES[l.sorte];
  if (!B) return null;
  const { W } = m, S = HAMEAUX.STYLES[B.style], M = MATIERES[S.mur];
  const X = l.case % W, Y = Math.floor(l.case / W);
  const x0 = X - B.porte, y0 = Y - B.h, ix = (x, y) => (y0 + y) * W + x0 + x;
  const pieces = [], basses = [], bloque = new Set();
  const pose = (nom, cx, cy, v = 0) => {
    const so = SORTES_HAMEAUX[SORTE_HAMEAU[nom]], lg = so.largeur || 1;
    (so.genre === 'basse' ? basses : pieces).push(SORTE_HAMEAU[nom], cx * T + (lg * T) / 2, (cy + 1) * T - (so.pied || 0), v);
    if (BLOQUE[SORTE_HAMEAU[nom]]) for (let k = 0; k < lg; k++) bloque.add(cy * W + cx + k);
  };
  // les murs (la porte au milieu du bas, les fenêtres de la façade), leur masque comme planHameau
  const murs = new Map();
  for (let y = 0; y < B.h; y++) for (let x = 0; x < B.l; x++) if (x === 0 || y === 0 || x === B.l - 1 || y === B.h - 1) murs.set(ix(x, y), 'mur');
  murs.set(ix(B.porte, B.h - 1), 'porte');
  for (const x of B.fenetres) murs.set(ix(x, B.h - 1), 'fenetre');
  const estMur = (j) => { const t = murs.get(j); return t === 'mur' || t === 'fenetre'; };
  for (const [j, t] of murs) {
    const cx = j % W, cy = Math.floor(j / W);
    if (t === 'porte') { pose('porte_' + M, cx, cy); continue; }
    const v = (estMur(j - W) ? 1 : 0) + (estMur(j + 1) || murs.get(j + 1) === 'porte' ? 2 : 0) + (estMur(j + W) ? 4 : 0) + (estMur(j - 1) || murs.get(j - 1) === 'porte' ? 8 : 0);
    pose((t === 'fenetre' ? 'fenetre_' : 'mur_') + M, cx, cy, v);
    bloque.add(j);
  }
  // le plancher, puis les meubles
  const dedans = [];
  for (let y = 1; y < B.h - 1; y++) for (let x = 1; x < B.l - 1; x++) dedans.push(ix(x, y));
  const sol = new Set(dedans);
  for (const j of dedans) pose(S.sol, j % W, Math.floor(j / W), (sol.has(j - W) ? 1 : 0) + (sol.has(j + 1) ? 2 : 0) + (sol.has(j + W) ? 4 : 0) + (sol.has(j - 1) ? 8 : 0));
  const lits = [];
  let foyer = null;
  for (const [nom, x, y] of B.meubles) {
    pose(nom, x0 + x, y0 + y);
    if (nom.startsWith('lit_')) lits.push({ case: ix(x, y), sorte: nom });
    if (nom === 'four' || nom === 'cuisiniere') foyer = ix(x, y);
  }
  for (const [nom, dx, dy] of B.dehors) pose(nom, X + dx, Y + dy);
  // ce que le monde en garde : la terre battue devant la porte, l'emprise (la maison et RESERVE cases)
  const terre = [l.case, l.case - 1, l.case + 1, l.case + W];
  const emprise = new Set(), RES = HAMEAUX.RESERVE;
  for (let y = -RES; y < B.h + RES + 1; y++) for (let x = -RES - 3; x < B.l + RES + 3; x++) emprise.add(ix(x, y));
  const maison = {
    id: l.id + '_maison', x0, y0, l: B.l, h: B.h, porte: ix(B.porte, B.h - 1), devant: l.case,
    pieces: [{ genre: 'salle', cases: dedans }], lits, foyer, fenetres: B.fenetres.map((x) => ix(x, B.h - 1)), dedans,
  };
  return {
    plan: {
      id: l.id, nom: l.sorte === 'cabane' ? 'Une cabane' : 'Un atelier', case: l.case, style: B.style, metier: null, batisse: l.sorte,
      cadre: { x0: x0 - 3, y0: y0 - 1, x1: x0 + B.l + 2, y1: Y + 1 },
      place: { centre: l.case, cases: [], puits: null, banc: null, panneau: null },
      maisons: [maison], jardins: [], travail: [], ruelles: [],
    },
    pieces, basses, bloque: [...bloque], terre, emprise: [...emprise].sort((a, b) => a - b),
  };
}

/* ---------- tous les hameaux d'un monde ---------- */

// plansDesHameaux(m) → { plans (planHameau(…).plan de chacun, dans l'ordre du plan, puis les bâtisses du
// récit : planBatisse), pieces, basses
// (une liste par hameau), bloque, terre (Uint8Array, une valeur par case du monde : 1 une case
// fermée ; TERRE_HAMEAU la terre battue), emprise (Uint8Array : 1 une case réservée), ms }.
export function plansDesHameaux(m) {
  const t0 = Date.now(), N = m.W * m.H;
  const bloque = new Uint8Array(N), terre = new Uint8Array(N), emprise = new Uint8Array(N);
  const plans = [], pieces = [], basses = [];
  // (les hameaux, puis les bâtisses du récit : la cabane, l'atelier ; leurs plans sont marqués `batisse`)
  const batisses = ((m.lieux && m.lieux.recit) || []).map((l) => planBatisse(m, l)).filter(Boolean);
  for (const r of [...((m.lieux && m.lieux.hameaux) || []).map((h) => planHameau(m, h)), ...batisses]) {
    plans.push(r.plan);
    pieces.push(r.pieces);
    basses.push(r.basses);
    for (const i of r.bloque) bloque[i] = 1;
    for (const i of r.terre) terre[i] = TERRE_HAMEAU;
    for (const i of r.emprise) emprise[i] = 1;
  }
  return { plans, pieces, basses, bloque, terre, emprise, ms: Date.now() - t0 };
}

/* ---------- une région ---------- */

// hameauxDeRegion(ctx, g) → { images, basses } (Int32Array : [sorte, x, y, variante], le pied en px) ;
// ferme dans g.marche (la marche de la région : cx0, cy0, cl, ch) les cases bâties. Les images : celles
// dont le pied est dans la région ; ce qui se peint : celles des cases de la région et deux de plus
// autour (le bord peint, ce qui déborde d'une case voisine), dans l'ordre du plan (les planchers sous
// les tapis).
export function hameauxDeRegion(ctx, g) {
  const H = ctx.hameaux;
  const images = [], basses = [];
  if (!H || !H.plans.length) return { images: new Int32Array(0), basses: new Int32Array(0) };
  const W = ctx.cadre.LARGEUR, { cx0, cy0, cl, ch, marche } = g;
  H.plans.forEach((p, k) => {
    const c = p.cadre;
    if (c.x1 < cx0 - 3 || c.y1 < cy0 - 3 || c.x0 > cx0 + cl + 2 || c.y0 > cy0 + ch + 2) return;
    for (let y = Math.max(cy0, c.y0); y <= Math.min(cy0 + ch - 1, c.y1); y++) {
      for (let x = Math.max(cx0, c.x0); x <= Math.min(cx0 + cl - 1, c.x1); x++) if (H.bloque[y * W + x]) marche[(y - cy0) * cl + x - cx0] = 0;
    }
    const pi = H.pieces[k], ba = H.basses[k];
    for (let q = 0; q < pi.length; q += 4) {
      const X = Math.floor(pi[q + 1] / T), Y = Math.floor((pi[q + 2] - 1) / T);
      if (X >= cx0 && Y >= cy0 && X < cx0 + cl && Y < cy0 + ch) images.push(pi[q], pi[q + 1], pi[q + 2], pi[q + 3]);
    }
    for (let q = 0; q < ba.length; q += 4) {
      const X = Math.floor(ba[q + 1] / T), Y = Math.floor((ba[q + 2] - 1) / T);
      if (X >= cx0 - 3 && Y >= cy0 - 2 && X < cx0 + cl + 3 && Y < cy0 + ch + 3) basses.push(ba[q], ba[q + 1], ba[q + 2], ba[q + 3]);
    }
  });
  return { images: Int32Array.from(images), basses: Int32Array.from(basses) };
}

// Le hameau dont le cadre (et MARGE cases autour) contient la case t : son plan, ou null.
export function hameauDeCase(plans, t, W, marge = 0) {
  const c = t % W, r = Math.floor(t / W);
  for (const p of plans || []) if (c >= p.cadre.x0 - marge && c <= p.cadre.x1 + marge && r >= p.cadre.y0 - marge && r <= p.cadre.y1 + marge) return p;
  return null;
}

/* ---------- la découverte (la sauvegarde) ---------- */

// Les hameaux vus : state.monde.hameaux = { [id]: { nom, style, jour } } (la sauvegarde, format 55).
export function hameauxVus(state) {
  const h = state && state.monde && state.monde.hameaux;
  return h && typeof h === 'object' ? h : {};
}

// Le personnage arrive dans le hameau `plan` ({ id, nom, style }) : noté la première fois. → true si
// c'est nouveau.
export function voirHameau(state, plan) {
  if (!state || !plan || !plan.id) return false;
  if (!state.monde || typeof state.monde !== 'object') return false;
  if (!state.monde.hameaux || typeof state.monde.hameaux !== 'object') state.monde.hameaux = {};
  if (state.monde.hameaux[plan.id]) return false;
  state.monde.hameaux[plan.id] = { nom: String(plan.nom || plan.id), style: STYLES_HAMEAUX.includes(plan.style) ? plan.style : 'prairie', jour: state.day || 1 };
  return true;
}
