import { DATA } from './catalog.js';
import { dispositionPort } from './monde-gen.js';
import { contenuPort } from './port.js';

/* ---------- les lieux bâtis du grand monde : le port et les bâtisses muettes (docs/ile.md, I1a, I7c, I7e) ----------

   Ce qui reste des hameaux bâtis d'avant (docs/grand-monde.md, fiche 7a ; retirés à la bascule, I9h) : leurs pièces
   (murs, fenêtres, portes, planchers, meubles, toits : data/monde.json HAMEAUX.SORTES, la planche
   scripts/carte/hameaux.py, assets/hameaux.png), dont le port prend les siennes (PORT.SORTES, à la suite), et deux
   bâtisses muettes du plan (lieux.recit : la cabane, l'atelier ; leur forme : HAMEAUX.BATISSES). Ils sont faits une
   fois pour tout le monde, avec les éléments (monde-sol.js, elementsSol : plansDesHameaux), puis chaque région en
   prend sa part (hameauxDeRegion : les cases fermées à la marche, les images, ce qui se peint dans le sol). Tout ce
   qui est bâti, et RESERVE cases autour, est « réservé » : la végétation, les rochers et les bêtes ne s'y posent pas
   (ctx.reserves). Les hameaux du plan (lieux.hameaux, des « fantômes » sur l'île : monde-gen.js) ne sont plus bâtis.

   Les cases du monde : rangée × LARGEUR + colonne (comme partout). Les pièces : [sorte, x, y, variante], le pied en
   px (comme la végétation), la sorte : son rang dans SORTES_HAMEAUX. */

export const HAMEAUX = DATA.HAMEAUX;
// (les dessins du port, fiche I1a : data/village.json PORT.SORTES, à la suite de ceux des hameaux dans la
// même planche ; scripts/carte/port.py)
export const SORTES_HAMEAUX = [...HAMEAUX.SORTES, ...((DATA.PORT && DATA.PORT.SORTES) || [])];
export const SORTE_HAMEAU = Object.fromEntries(SORTES_HAMEAUX.map((s, k) => [s.nom, k]));
const BLOQUE = new Uint8Array(SORTES_HAMEAUX.length);
for (const n of [...HAMEAUX.BLOQUE, ...((DATA.PORT && DATA.PORT.BLOQUE) || [])]) BLOQUE[SORTE_HAMEAU[n]] = 1;
export const STYLES_HAMEAUX = Object.keys(HAMEAUX.STYLES);
const T = 16;
const MATIERES = { pierre: 'pierre', taille: 'taille', bois: 'bois' };
// la terre battue d'une case (la place, une ruelle) : son sol, que monde-sol.js peint comme un chemin
export const TERRE_HAMEAU = 1;

/* ---------- les bâtisses muettes : la cabane, l'atelier (lot 3b ; le récit qui les habitait est retiré) ----------

   Bâties comme les maisons des hameaux d'avant, avec les mêmes pièces (murs, fenêtres, porte, planchers,
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
      id: l.id, nom: l.sorte === 'cabane' ? 'L\'observatoire' : 'Un atelier', case: l.case, style: B.style, metier: null, batisse: l.sorte,
      cadre: { x0: x0 - 3, y0: y0 - 1, x1: x0 + B.l + 2, y1: Y + 1 },
      place: { centre: l.case, cases: [], puits: null, banc: null, panneau: null },
      maisons: [maison], jardins: [], travail: [], ruelles: [],
    },
    pieces, basses, bloque: [...bloque], terre, emprise: [...emprise].sort((a, b) => a - b),
  };
}

/* ---------- le port (le chantier « l'île à bâtir », fiche I1a) ----------

   Le port du plan (monde-gen.js, lieux.port : sa case, le sens de son quai) bâti au niveau `niveau`
   (js/engine/port.js, contenuPort ; data/village.json PORT.NIVEAUX) avec les pièces des hameaux et les siennes
   (PORT.SORTES), à la place que lui donne dispositionPort (monde-gen.js) :
     - le quai : des planches sur la mer, deux cases de large, de la rive vers le large (sa longueur : celle du
       niveau) ; ses cases s'ouvrent à la marche (ouvre) ; son bout montre sa face et ses pieux ; sa culée, une
       première travée sur la terre de la rive, le relie au sable par-dessus le ressac ;
     - la cale : deux cases de pierre qui descendent dans l'eau, à côté du pied du quai (on y marche aussi), sa
       tête à plat sur la terre de la rive ;
     - la halle : un plancher, un toit (la scène : js/carte/ferme/hameaux.js, comme celui d'une maison, qui
       s'efface quand on y entre : sa « maison », toutes ses cases dedans) sur quatre poteaux, un comptoir et une
       balance ;
     - le panneau (son nom), deux lanternes (au pied du quai et à son bout : elles s'allument le soir, la
       scène ; plan.lanternes), puis selon le niveau des caisses, des tonneaux, le mât à fanion ;
     - ses abords en terre battue (peinte comme un chemin) ; tout ce qui est bâti et RESERVE cases autour,
       le quai et une case autour, réservés (ni arbre, ni rocher, ni bête).
   → { plan, pieces, basses, bloque, terre, emprise, ouvre } comme planBatisse (plan.batisse : « port » ; son
   cadre couvre le quai : on n'y casse ni n'y bâtit rien). */
export function planPort(m, port, niveau) {
  const { W } = m, PP = DATA.PORT.PLAN, [HL, HH] = PP.HALLE;
  const X = port.case % W, Y = Math.floor(port.case / W), sud = port.sens === 1;
  const D = dispositionPort(X, Y, port.sens, PP.QUAI, HL, HH, W), C = contenuPort(niveau);
  const pieces = [], basses = [], bloque = new Set(), ouvre = new Set(), emprise = new Set(), lanternes = [];
  const ix = (x, y) => y * W + x;
  const pose = (nom, cx, cy, v = 0) => {
    const so = SORTES_HAMEAUX[SORTE_HAMEAU[nom]], lg = so.largeur || 1;
    (so.genre === 'basse' ? basses : pieces).push(SORTE_HAMEAU[nom], cx * T + (lg * T) / 2, (cy + 1) * T - (so.pied || 0), v);
    if (BLOQUE[SORTE_HAMEAU[nom]]) for (let k = 0; k < lg; k++) bloque.add(ix(cx + k, cy));
  };
  // le quai : ses planches (variantes : vers le sud, la gauche 0 et la droite 1, leur bout 2 et 3 ; vers l'est,
  // le haut 4 et le bas 5, leur bout 6 et 7), de la rive vers le large
  const Q = C.quai, quai = D.quai.slice(0, 2 * Q);
  quai.forEach((i, n) => {
    const k = (n >> 1) + 1, j = n & 1;
    pose('quai', i % W, Math.floor(i / W), (sud ? 0 : 4) + j + (k === Q ? 2 : 0));
    ouvre.add(i);
  });
  // la culée : la première travée, posée sur la terre, sur la case du port et sa voisine (au pied du quai) ; ses
  // planches commencent sur le sable et couvrent le ressac du rivage : on monte sur le quai à pied sec (variantes :
  // vers le sud, la gauche 8 et la droite 9 ; vers l'est, le haut 10 et le bas 11). Des cases de terre, où l'on
  // marche déjà ; le quai lui-même (plan.quai, le bac le long de ses quatre dernières cases) n'en change pas.
  (sud ? [[X, Y], [X + 1, Y]] : [[X, Y], [X, Y + 1]]).forEach(([cx, cy], j) => pose('quai', cx, cy, (sud ? 8 : 10) + j));
  // la cale : une image de deux cases (vers le sud : de haut en bas, son pied au bas de la seconde ; vers l'est :
  // de gauche à droite, son pied au milieu du bas des deux), et sa tête, qui déborde d'une case sur la terre de la
  // rive (scripts/carte/port.py : on y descend sans se mouiller)
  if (C.ajoute.has('cale')) {
    const [[ax, ay], [bx, by]] = D.cale;
    if (sud) pieces.push(SORTE_HAMEAU.cale_port, ax * T + T / 2, (by + 1) * T, 0);
    else pieces.push(SORTE_HAMEAU.cale_port, ax * T + T, (ay + 1) * T, 1);
    ouvre.add(ix(ax, ay));
    ouvre.add(ix(bx, by));
  }
  // la halle : son plancher, ses poteaux, son comptoir, sa balance
  const h = D.halle, dedans = [];
  for (let y = h.y0; y < h.y0 + h.h; y++) for (let x = h.x0; x < h.x0 + h.l; x++) dedans.push(ix(x, y));
  const sol = new Set(dedans);
  for (const j of dedans) pose('sol_plancher', j % W, Math.floor(j / W), (sol.has(j - W) ? 1 : 0) + (sol.has(j + 1) ? 2 : 0) + (sol.has(j + W) ? 4 : 0) + (sol.has(j - 1) ? 8 : 0));
  for (const [x, y] of D.poteaux) pose('poteau_halle', x, y);
  const O = D.objets;
  if (C.ajoute.has('comptoir')) pose('comptoir', ...O.comptoir);
  if (C.ajoute.has('balance')) pose('balance', ...O.balance);
  if (C.ajoute.has('panneau')) pose('panneau_port', ...O.panneau);
  // les lanternes : au pied du quai, sur la terre, et au bout du quai (sa case de droite, vers le sud ; du bas,
  // vers l'est)
  const bout = quai[quai.length - 1];
  if (C.ajoute.has('lanternes')) {
    for (const [x, y] of [O.lanterne, [bout % W, Math.floor(bout / W)]]) {
      pose('lanterne_port', x, y);
      lanternes.push({ x: x * T + T / 2, y: (y + 1) * T });
    }
  }
  // sur le quai (k : la case depuis la rive, sur la rangée de droite ou du bas), puis sur la terre
  const surQuai = (k) => { const i = quai[2 * (k - 1) + 1]; return [i % W, Math.floor(i / W)]; };
  if (C.ajoute.has('caisses')) pose('caisses', ...surQuai(2), 0);
  if (C.ajoute.has('tonneaux')) pose('tonneaux', ...surQuai(3), 0);
  if (C.ajoute.has('mat')) pose('mat_fanion', ...surQuai(Q - 2));
  // le bac (fiche I1c : la scène le pose quand il est à quai, js/carte/ferme/bac.js) : le long des quatre dernières
  // cases du quai, du côté opposé à la cale (vers le sud : à droite ; vers l'est : en dessous), son pied (px : le milieu
  // du bas de son image) ; sa passerelle, de l'avant-dernière case du quai à son bord ; ses caisses, sur l'autre
  // rangée du quai (l'avant-dernière case et deux avant ; vers le sud, plutôt vers le milieu du quai : elles sont plus
  // larges qu'une case) ; le large, d'où il arrive et où il repart
  const Yb = sud ? Y + Q : Y + 3;
  const bac = sud
    ? { sens: 0, x: (X + 3) * T, y: (Y + Q + 1) * T, passerelle: { x: (X + 2) * T, y: (Y + Q) * T }, large: { dx: 0, dy: 7 * T },
      caisses: [Q - 1, Q - 3].map((k) => ({ x: X * T + T - 3, y: (Y + k + 1) * T - 2 })) }
    : { sens: 1, x: (X + Q - 1) * T, y: (Yb + 1) * T, passerelle: { x: (X + Q - 1) * T + T / 2, y: (Y + 2) * T + 4 }, large: { dx: 8 * T, dy: 0 },
      caisses: [Q - 1, Q - 3].map((k) => ({ x: (X + k) * T + T / 2, y: (Y + 1) * T - 2 })) };
  if (C.ajoute.has('caisses_terre')) pose('caisses', ...O.caisses_terre, 1);
  if (C.ajoute.has('tonneaux_terre')) pose('tonneaux', ...O.tonneaux_terre, 1);
  // la terre battue : ses abords, hors de la halle ; l'emprise : tout, RESERVE cases autour, le quai et une
  // case autour (au niveau 5 : il s'allongera), la cale
  const t = D.terre, terre = [];
  for (let y = t.y0; y <= t.y1; y++) for (let x = t.x0; x <= t.x1; x++) if (!sol.has(ix(x, y))) terre.push(ix(x, y));
  const RES = HAMEAUX.RESERVE;
  for (let y = t.y0 - RES; y <= t.y1 + RES; y++) for (let x = t.x0 - RES; x <= t.x1 + RES; x++) emprise.add(ix(x, y));
  for (const i of D.quai) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) emprise.add(i + dy * W + dx);
  for (const [x, y] of D.cale) emprise.add(ix(x, y));
  // le cadre : les abords, le quai entier, la cale
  let x0 = t.x0, y0 = t.y0, x1 = t.x1, y1 = t.y1;
  for (const i of [...D.quai, ...D.cale.map(([x, y]) => ix(x, y))]) {
    const x = i % W, y = Math.floor(i / W);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  const halle = {
    id: 'port_halle', x0: h.x0, y0: h.y0, l: h.l, h: h.h, porte: null, devant: port.case,
    pieces: [{ genre: 'halle', cases: dedans }], lits: [], foyer: null, fenetres: [], dedans,
  };
  const panneau = C.ajoute.has('panneau') ? ix(...O.panneau) : null;
  // (le comptoir, ses cases : un appui dessus ouvre la fenêtre du port, fiche I1b, js/carte/ferme/hameaux.js)
  const lgComptoir = SORTES_HAMEAUX[SORTE_HAMEAU.comptoir].largeur || 1;
  const comptoir = C.ajoute.has('comptoir') ? Array.from({ length: lgComptoir }, (_, k) => ix(O.comptoir[0] + k, O.comptoir[1])) : [];
  return {
    plan: {
      id: 'port', nom: DATA.PORT.NOM, case: port.case, style: 'cote', metier: null, batisse: 'port', niveau, comptoir,
      cadre: { x0, y0, x1, y1 },
      place: { centre: port.case, cases: [], puits: null, banc: null, panneau },
      maisons: [halle], jardins: [], travail: [], ruelles: [], lanternes, quai, bac,
    },
    pieces, basses, bloque: [...bloque], terre, emprise: [...emprise].sort((a, b) => a - b), ouvre: [...ouvre],
  };
}

/* ---------- tous les lieux bâtis d'un monde ---------- */

// plansDesHameaux(m) → { plans (les bâtisses muettes : planBatisse, puis le port : planPort), pieces, basses
// (une liste par hameau), bloque, terre (Uint8Array, une valeur par case du monde : 1 une case
// fermée ; TERRE_HAMEAU la terre battue), emprise (Uint8Array : 1 une case réservée), ms }.
export function plansDesHameaux(m) {
  const t0 = Date.now(), N = m.W * m.H;
  const bloque = new Uint8Array(N), terre = new Uint8Array(N), emprise = new Uint8Array(N);
  const plans = [], pieces = [], basses = [];
  // (les bâtisses muettes du plan : la cabane, l'atelier ; leurs plans sont marqués `batisse` ; puis le port, fiche
  // I1a, s'il y en a un : `m.niveauPort`, son niveau)
  const batisses = ((m.lieux && m.lieux.recit) || []).map((l) => planBatisse(m, l)).filter(Boolean);
  const port = m.lieux && m.lieux.port && m.niveauPort ? [planPort(m, m.lieux.port, m.niveauPort)] : [];
  let ouvre = null;
  for (const r of [...batisses, ...port]) {
    plans.push(r.plan);
    pieces.push(r.pieces);
    basses.push(r.basses);
    for (const i of r.bloque) bloque[i] = 1;
    for (const i of r.terre) terre[i] = TERRE_HAMEAU;
    for (const i of r.emprise) emprise[i] = 1;
    if (r.ouvre) { ouvre = ouvre || new Uint8Array(N); for (const i of r.ouvre) ouvre[i] = 1; }
  }
  // (ouvre : les cases qu'un plan ouvre à la marche, le quai et la cale du port ; null sans port)
  return { plans, pieces, basses, bloque, terre, emprise, ouvre, ms: Date.now() - t0 };
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
      for (let x = Math.max(cx0, c.x0); x <= Math.min(cx0 + cl - 1, c.x1); x++) {
        const i = y * W + x;
        if (H.bloque[i]) marche[(y - cy0) * cl + x - cx0] = 0;
        else if (H.ouvre && H.ouvre[i]) marche[(y - cy0) * cl + x - cx0] = 1;   // (le quai, la cale du port)
      }
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
