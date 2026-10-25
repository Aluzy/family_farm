import { blocGid } from './planche.js';
import { hache, teinteHerbe } from './ferme-generee.js';
import { AUCUNE_EAU, BIOME, BIOMES, bruitDuMonde, champsDuMonde, elementsDuMonde, releve } from './monde-gen.js';
import { bassesRoches, rochesDeRegion } from './monde-roches.js';
import { reservesDuMonde, vegetationDeRegion, VEGETATION } from './monde-vegetation.js';
import { lieuxDeRegion } from './monde-lieux.js';
import { fauneDeRegion } from './monde-faune.js';
import { hameauxDeRegion, plansDesHameaux, TERRE_HAMEAU } from './monde-hameaux.js';

/* ---------- le sol du grand monde, région par région (docs/grand-monde.md : fiches 4b et 5a) ---------- */

// Le plan du monde (monde-gen.js : les biomes, les rivières, les lacs, les chemins) devient ici un
// sol : pour chaque case hors de la ferme, les tuiles à peindre, et si l'on peut y marcher. Le
// calcul se fait région par région (MONDE.REGION × MONDE.REGION cases, monde.js) : dans un Web
// Worker sur le site (js/monde-worker.js, que js/ui/monde-sol.js fait travailler et dont il garde
// les régions faites), en direct sans Worker (Node, les tests, un vieux navigateur : solDirect).
// Rien de ce fichier ne touche à la ferme : ses cases ne reçoivent rien (la scène y peint les
// couches de sa carte, inchangées), seuls les coins de son bord (ses SOMMETS, ses TEINTES)
// servent à raccorder la prairie autour, comme avant.
//
// Le contexte d'un monde (contexteSol) : les champs (le relief, l'humidité, le biome de chaque case,
// par les seuls bruits), les bruits du sol (les taches, les bords, la largeur des chemins), puis,
// une fois pour tout le monde, les éléments (rivières, lacs, chemins : elementsDuMonde), les cases
// des chemins (où l'on marche, les gués) et leurs coins dessinés. Une région (solDeRegion) ne lit
// ensuite que ses cases et six de plus autour.
//
// Le sol d'une case : celui de son biome, ou l'un des siens par taches (solDe : la forêt, ses
// feuilles, ses aiguilles en hauteur et sa mousse où c'est humide ; le marais, sa vase et son eau
// basse ; la lande, son herbe rase et sa terre nue ; la plage, son sable et ses galets ; la
// montagne, ses éboulis et sa roche nue). Il se dessine par les quatre coins de la case, comme
// l'herbe et l'eau de la ferme. Les bords naturels (fiche 5a) : la frontière entre deux sols ne
// suit plus la grille des cases.
//   - Chaque case prend le sol d'une case un peu plus loin (jusqu'à DERIVE cases, selon deux bruits
//     lents) : les frontières se déforment à l'échelle de quelques cases.
//   - Un coin prend l'eau dès que deux des quatre cases qui le touchent en sont (la rive suit les
//     cases où l'on ne marche pas) ; sinon, le sol qui pèse le plus parmi les seize cases autour,
//     chaque poids poussé par un bruit propre à ce sol : une frontière en biais devient une ligne en
//     biais, qui ondule, et non un escalier.
//   - Les tuiles de bord de assets/sols_monde.png sont tracées comme des « carrés qui marchent »
//     (scripts/carte/sols_monde.py) : la frontière y coupe chaque côté en son milieu et va droit
//     d'un côté à l'autre (une ligne à 45° le long d'une diagonale de coins), ondulée par un bruit,
//     en trois variantes ; les sols doux (les herbes, le sable, la vase…) ont un bord tramé.
//   - Le chemin : une bande autour du fil lissé de chaque chemin du plan (LARGEUR_CHEMIN cases de
//     demi-largeur, ± un bruit), et non trois cases en carré autour de chacune ; aux abords de la
//     ferme, la règle d'avant (son raccord avec la sortie de la ferme ne bouge pas).
//   - L'eau profonde : un coin d'eau sans terre dans un rond de PROFOND coins (± un bruit), posée
//     sur l'eau peu profonde par les tuiles de la planche des sols (même tracé que les bords).
// Puis :
//   - une case toute d'herbe (la prairie) : exactement comme la prairie d'avant (monde.js, étape 3) :
//     l'herbe de herbe_chemin, ses trois teintes et leurs raccords ; ses chemins, aux abords de la
//     ferme par les raccords de herbe_chemin, ailleurs le chemin posé sur l'herbe ;
//   - une case où se touchent des sols différents : le sol le plus bas (SOLS, dans l'ordre :
//     l'herbe, le sable… la neige) en entier, puis chaque sol plus haut posé sur ses coins (les
//     tuiles « bord » de assets/sols_monde.png) ;
//   - une case qui touche l'eau : l'eau de la planche de la ferme (ses tuiles animées : la scène
//     les anime, js/carte/ferme/eau-monde.js), l'eau profonde sur ses coins, puis la terre posée sur
//     ses coins par une rive (rive_herbe pour l'herbe, rive_sable au bout d'un chemin, les tuiles
//     « rive » des autres sols) ;
//   - un chemin hors de l'herbe : le chemin de la ferme posé sur ses coins ; sur une rivière, un
//     gué (des pierres plates : on y passe à pied).
//
// Une tuile est un nombre : moins de SOLS_MONDE.DECALAGE, le numéro (gid) d'une tuile de la planche
// de la ferme (assets/farm_spring_summer.png, planche.js) ; à partir de lui, DECALAGE + le numéro
// d'une tuile de assets/sols_monde.png (16 colonnes, à partir de 0).

export const SOLS_MONDE = {
  fichier: 'sols_monde.png', colonnes: 16, DECALAGE: 8192,
  // dans l'ordre de la planche (scripts/carte/sols_monde.py, SOLS), du plus bas au plus haut : un
  // sol plus haut se pose sur un plus bas par ses bords (le sable sur l'herbe, la mousse sur les
  // feuilles, la vase sur l'eau basse…)
  sols: ['sable', 'galets', 'eau_basse', 'vase', 'terre', 'lande', 'feuilles', 'aiguilles', 'mousse', 'eboulis', 'roche', 'falaise', 'neige'],
  // les rangées de chaque sol dans la planche : 1 de sols pleins (16 variantes), BORDS de bords
  // sur un sol plus bas, RIVES de rives sur l'eau (16 tuiles de coins chacune) ; puis CHEMINS
  // rangées du chemin posé sur un autre sol que l'herbe (ou sur l'herbe, loin de la ferme), une de
  // gués, une d'eau profonde posée sur l'eau peu profonde
  BORDS: 3, RIVES: 2, CHEMINS: 3,
  // les couches d'une case au plus (l'eau, le profond, la rive, trois sols, le chemin, le gué)
  COUCHES: 8,
  // le bord de la région dessiné en plus (une case de chaque côté : la scène en déborde d'autant,
  // CarteKit.REGION.bord)
  BORD: 1,
  // la montagne : la roche nue au-dessus de ce relief, des éboulis dessous
  ROCHE: 0.8,
  // la plage : des galets là où ce bruit (PAS_GALETS cases) dépasse GALETS
  GALETS: 0.62, PAS_GALETS: 18,
  // les sols de chaque biome, par taches (un bruit de PAS_TACHES cases, SOUS_SOLS) : le marais,
  // de l'eau basse où le bruit passe EAU_BASSE ; la lande, de la terre nue au-delà de TERRE ; la
  // forêt, des aiguilles au-dessus d'un relief AIGUILLES, de la mousse au-dessus d'une humidité
  // MOUSSE, des feuilles ailleurs (le bruit déplace ces seuils de ± TACHES)
  PAS_TACHES: 7, EAU_BASSE: 0.56, TERRE: 0.66, AIGUILLES: 0.54, MOUSSE: 0.7, TACHES: 0.12,
  // les bords naturels (voir solDeRegion) : le poids des cases autour d'un coin (les quatre qui
  // le touchent, les huit d'à côté, les quatre des angles), un bruit de PAS_BORDS coins qui pousse
  // la frontière de ± BRUIT_BORDS ; le chemin, une bande de LARGEUR_CHEMIN cases de demi-largeur
  // autour de son fil, ± BRUIT_CHEMIN (pas à moins de PRES_FERME cases de la ferme : son raccord)
  PROFOND: [1.8, 3.6],
  POIDS: [1, 0.37, 0.14], PAS_BORDS: 5, BRUIT_BORDS: 1.5, DERIVE: 4, PAS_DERIVE: 8,
  LARGEUR_CHEMIN: 1.5, PAS_CHEMIN: 6, BRUIT_CHEMIN: 0.55, PRES_FERME: 6,
};
const D = SOLS_MONDE.DECALAGE, NS = SOLS_MONDE.sols.length;
const RS = 1 + SOLS_MONDE.BORDS + SOLS_MONDE.RIVES;
const tuile = (k) => D + k;
const plein = (s, v) => tuile(RS * s * 16 + v);
const bord = (s, m, j) => tuile((RS * s + 1 + j) * 16 + m);
const rive = (s, m, j) => tuile((RS * s + 1 + SOLS_MONDE.BORDS + j) * 16 + m);
const cheminSur = (m, j) => tuile((RS * NS + j) * 16 + m);
const gue = (v) => tuile((RS * NS + SOLS_MONDE.CHEMINS) * 16 + v);
const profond = (m) => tuile((RS * NS + SOLS_MONDE.CHEMINS + 1) * 16 + m);

// Les sols d'un coin, du plus bas au plus haut (un sol plus haut se pose sur un plus bas) : l'eau,
// l'herbe, puis ceux de la planche (2 + leur rang dans SOLS_MONDE.sols).
const EAU = 0, HERBE = 1;
const SOL = Object.fromEntries(SOLS_MONDE.sols.map((n, k) => [n, 2 + k]));
// (le code de chaque sol par son nom, l'herbe comprise : les tables de la végétation)
const CODES_SOLS = Object.assign({ herbe: HERBE }, SOL);

// Les biomes où l'on ne marche pas : la mer, les lacs, les rivières (sauf à gué), les falaises,
// les sommets.
export const BIOMES_FERMES = ['mer', 'lac', 'riviere', 'falaise', 'sommet'];
const FERMES = new Uint8Array(BIOMES.length);
for (const b of BIOMES_FERMES) FERMES[BIOME[b]] = 1;
const EAUX = new Uint8Array(BIOMES.length);
for (const b of ['mer', 'lac', 'riviere']) EAUX[BIOME[b]] = 1;

// La couleur unie de chaque biome (dans l'ordre de BIOMES), pour le sol provisoire d'une région
// pas encore faite (la scène la peint ainsi en attendant) : la couleur moyenne de ses sols (celles
// que donne scripts/carte/sols_monde.py ; le marais, sa vase et un peu d'eau basse ; l'eau et
// l'herbe, celles des tuiles de la ferme).
export const COULEURS_BIOMES = {
  mer: '#2461aa', plage: '#dfc188', falaise: '#736960', prairie: '#84a93c', foret: '#4c6329', marais: '#596a46',
  lande: '#a0a048', montagne: '#8a8278', sommet: '#eaf0f9', lac: '#4facd3', riviere: '#4facd3',
};

// Un nombre au hasard pour la case i (toujours le même pour une même graine) : celui de la prairie
// d'avant (monde.js), pour qu'elle garde ses tuiles.
export function hasardCase(g0, i) {
  let h = (g0 ^ Math.imul(i + 1, 2654435761)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return (h ^ (h >>> 16)) >>> 0;
}

/* ---------- le contexte d'un monde ---------- */

// contexteSol(graine, cadre, ferme[, taille]) → le contexte (à garder : les éléments s'y tirent une
// fois). `cadre` : celui du plan (monde-gen.js : LARGEUR, HAUTEUR, FERME, SORTIE) ; `ferme` : les
// coins de la ferme ({ sommets, teintes } : ses SOMMETS et TEINTES, (LARGEUR + 1) × (HAUTEUR + 1)) ;
// `taille` : celle des régions (MONDE.REGION).
export function contexteSol(graine, cadre, ferme, taille) {
  const champs = champsDuMonde(graine, cadre), S = SOLS_MONDE, W = cadre.LARGEUR, H = cadre.HAUTEUR;
  const b = (usage, pas, octaves, w = W, h = H) => bruitDuMonde(String(graine) + ':monde:' + usage, pas, octaves, w, h);
  return {
    graine: String(graine), cadre, ferme, taille, champs, lire: releve(champs, cadre),
    teinte: teinteHerbe(graine), g0: hache(graine + ':monde'),
    galets: b('galets', S.PAS_GALETS, 2),
    // les taches des sols d'un biome (deux bruits), les bords (deux bruits, sur les coins), la
    // largeur du chemin (sur les coins)
    taches: b('taches', S.PAS_TACHES, 2), taches2: b('taches2', S.PAS_TACHES, 2),
    bords: b('bords', S.PAS_BORDS, 2, W + 1, H + 1), bords2: b('bords2', S.PAS_BORDS, 2, W + 1, H + 1),
    largeur: b('largeur', S.PAS_CHEMIN, 1, W + 1, H + 1),
    derive: b('derive', S.PAS_DERIVE, 2), derive2: b('derive2', S.PAS_DERIVE, 2),
    // la végétation (monde-vegetation.js) : son hasard, les clairières de la forêt, les taches des
    // petites plantes ; les cases réservées (autour des lieux), avec les éléments
    gv: hache(graine + ':vegetation'),
    clairieres: b('clairieres', VEGETATION.CLAIRIERES.PAS, 2), touffes: b('touffes', VEGETATION.TOUFFES.PAS, 2),
    reserves: null,
    // les rochers (monde-roches.js) : leur hasard ; l'épave du monde, tirée à la première région
    gr: hache(graine + ':roches'), epave: undefined,
    elements: null, chemins: null, cheminCoins: null, mesures: { elements: 0 },
  };
}

// Les éléments du monde (rivières, lacs, chemins), tirés à la première région ; et les cases des
// chemins : 1 un chemin sur la terre, 2 un gué (sur une rivière). Les chemins du plan font une case
// de large : ils sont élargis à trois, comme celui de la ferme (sa sortie aussi en a trois), sauf
// sur ce qu'on ne peut traverser (la mer, un lac, une falaise, un sommet) et sur la ferme.
export function elementsSol(ctx) {
  if (ctx.elements) return ctx.elements;
  const t0 = Date.now();
  const { cadre, lire } = ctx, W = cadre.LARGEUR, H = cadre.HAUTEUR, F = cadre.FERME;
  const el = elementsDuMonde(ctx.graine, cadre, lire);
  const chemins = new Uint8Array(W * H);
  const { riviere } = BIOME;
  for (const ch of el.chemins) {
    for (const i of ch) {
      const c = i % W, r = Math.floor(i / W);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const x = c + dc, y = r + dr;
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          if (x >= F.X && y >= F.Y && x < F.X + F.LARGEUR && y < F.Y + F.HAUTEUR) continue;
          const j = y * W + x, e = el.eaux[j], b = e !== AUCUNE_EAU ? e : lire.biome(j);
          if (b === riviere) chemins[j] = 2;
          else if (!FERMES[b]) chemins[j] = 1;
        }
      }
    }
  }
  // Le chemin dessiné : les coins (W + 1) × (H + 1) à moins de LARGEUR_CHEMIN cases (± le bruit) de
  // son fil, lissé (une moyenne glissante sur sept cases : le fil du plan va de case en case, en
  // escalier dans les diagonales). Une bande ronde, qui suit la courbe, et non trois cases en
  // carré autour de chacune ; près de la ferme, sans bruit (sa sortie a ses trois cases de large).
  const S = SOLS_MONDE, cv = W + 1, coins = new Uint8Array(cv * (H + 1));
  const pres = (X, Y) => X >= F.X - S.PRES_FERME && Y >= F.Y - S.PRES_FERME && X <= F.X + F.LARGEUR + S.PRES_FERME && Y <= F.Y + F.HAUTEUR + S.PRES_FERME;
  for (const ch of el.chemins) {
    const n = ch.length, px = new Float64Array(n), py = new Float64Array(n);
    for (let k = 0; k < n; k++) {
      let sx = 0, sy = 0, c = 0;
      for (let d = -3; d <= 3; d++) {
        const q = ch[Math.max(0, Math.min(n - 1, k + d))];
        sx += q % W; sy += Math.floor(q / W); c++;
      }
      px[k] = sx / c + 0.5; py[k] = sy / c + 0.5;
    }
    for (let k = 0; k < n; k++) {
      const ax = px[k], ay = py[k], bx = px[Math.min(n - 1, k + 1)], by = py[Math.min(n - 1, k + 1)];
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, M = S.LARGEUR_CHEMIN + S.BRUIT_CHEMIN;
      for (let Y = Math.max(0, Math.floor(Math.min(ay, by) - M)); Y <= Math.min(H, Math.ceil(Math.max(ay, by) + M)); Y++) {
        for (let X = Math.max(0, Math.floor(Math.min(ax, bx) - M)); X <= Math.min(W, Math.ceil(Math.max(ax, bx) + M)); X++) {
          const j = Y * cv + X;
          if (coins[j]) continue;
          const t = l2 ? Math.max(0, Math.min(1, ((X - ax) * dx + (Y - ay) * dy) / l2)) : 0;
          const ex = X - ax - t * dx, ey = Y - ay - t * dy;
          const R = S.LARGEUR_CHEMIN + (pres(X, Y) ? 0 : S.BRUIT_CHEMIN * (ctx.largeur(X, Y) - 0.5) * 2);
          if (ex * ex + ey * ey <= R * R + 1e-6) coins[j] = 1;
        }
      }
    }
  }
  ctx.elements = el;
  ctx.reserves = reservesDuMonde(el, W, H);
  ctx.chemins = chemins;
  ctx.cheminCoins = coins;
  // les hameaux bâtis (monde-hameaux.js, fiche 7a) : leur plan, une fois ; ce qu'ils bâtissent est
  // réservé (ni arbre, ni rocher, ni bête), leur terre battue se peint comme un chemin
  ctx.hameaux = plansDesHameaux({ graine: ctx.graine, W, H, F, lieux: el.lieux, chemins, biome: (i) => biomeDe(ctx, i) });
  for (let i = 0; i < W * H; i++) if (ctx.hameaux.emprise[i]) ctx.reserves[i] = 1;
  ctx.mesures.hameaux = ctx.hameaux.ms;
  ctx.mesures.elements = Date.now() - t0;
  return el;
}

// Le nom du sol de la case i (« herbe », « sable », « eau_basse »…, « eau » : SOLS_MONDE.sols), sans
// les bords naturels (les bêtes du grand monde, monde-faune.js : les canards sur l'eau basse du marais).
export function nomSolDeCase(ctx, i) {
  elementsSol(ctx);
  const W = ctx.cadre.LARGEUR, s = solDe(ctx, biomeDe(ctx, i), i, i % W, Math.floor(i / W));
  return s === EAU ? 'eau' : s === HERBE ? 'herbe' : SOLS_MONDE.sols[s - 2];
}

// Le biome de la case i (les eaux posées comprises).
function biomeDe(ctx, i) {
  const e = ctx.elements.eaux[i];
  return e !== AUCUNE_EAU ? e : ctx.lire.biome(i);
}

// Le sol que donne le biome b à la case i (x, y) : celui du biome, ou l'un des siens, par taches
// (SOLS_MONDE : le marais, la lande, la forêt, la plage, la montagne).
function solDe(ctx, b, i, x, y) {
  if (EAUX[b]) return EAU;
  const S = SOLS_MONDE;
  switch (BIOMES[b]) {
    case 'plage': return ctx.galets(x, y) > S.GALETS ? SOL.galets : SOL.sable;
    case 'falaise': return SOL.falaise;
    case 'foret': {
      const n = (ctx.taches(x, y) - 0.5) * 2 * S.TACHES;
      if (ctx.lire.relief(i) + n > S.AIGUILLES) return SOL.aiguilles;
      return ctx.lire.humidite(i) + (ctx.taches2(x, y) - 0.5) * 2 * S.TACHES > S.MOUSSE ? SOL.mousse : SOL.feuilles;
    }
    case 'marais': return ctx.taches(x, y) > S.EAU_BASSE ? SOL.eau_basse : SOL.vase;
    case 'lande': return ctx.taches2(x, y) > S.TERRE ? SOL.terre : SOL.lande;
    case 'montagne': return ctx.lire.relief(i) + (ctx.taches(x, y) - 0.5) * 0.08 > S.ROCHE ? SOL.roche : SOL.eboulis;
    case 'sommet': return SOL.neige;
    default: return HERBE;
  }
}

/* ---------- une région ---------- */

// solDeRegion(ctx, rx, ry) → { cle, x0, y0, l, h (le rectangle des cases peintes : la région et
// BORD case autour, borné au monde), couches (Uint16Array, COUCHES tuiles par case de ce rectangle,
// rangée par rangée ; 0 : rien ; les cases de la ferme n'ont rien), cx0, cy0, cl, ch (la région
// elle-même), biome, marche (Uint8Array, une valeur par case de la région : son biome, 1 si l'on
// peut y marcher : ni l'eau, ni le pied d'un arbre, d'un buisson ou d'un gros rocher, ni une entrée
// de grotte ; un ponton, oui), vegetation ({ images, basses } : monde-vegetation.js), roches
// ({ images, basses } : monde-roches.js), lieux ({ images, basses } : monde-lieux.js), hameau
// ({ images, basses } : monde-hameaux.js, les hameaux bâtis), faune
// (Int32Array : monde-faune.js), ms (la durée du calcul) }.
export function solDeRegion(ctx, rx, ry) {
  const t0 = Date.now();
  elementsSol(ctx);
  const { cadre, ferme, taille } = ctx, W = cadre.LARGEUR, H = cadre.HAUTEUR, F = cadre.FERME;
  const fv = F.LARGEUR + 1, B = SOLS_MONDE.BORD, K = SOLS_MONDE.COUCHES;
  const cx0 = rx * taille, cy0 = ry * taille, cl = Math.max(0, Math.min(taille, W - cx0)), chh = Math.max(0, Math.min(taille, H - cy0));
  const x0 = Math.max(0, cx0 - B), y0 = Math.max(0, cy0 - B), x1 = Math.min(W, cx0 + cl + B), y1 = Math.min(H, cy0 + chh + B);
  const l = x1 - x0, h = y1 - y0;
  // les cases lues : le rectangle et six de plus autour (bornées au monde : la case du bord)
  const S = SOLS_MONDE;
  const M = 6, gx0 = x0 - M, gy0 = y0 - M, gw = l + 2 * M, gh = h + 2 * M;
  // (le sol de chaque case, puis celui d'une case un peu plus loin, DERIVE cases au plus, selon deux
  // bruits lents : les frontières entre sols se déforment ; l'eau ne bouge pas, ni ne vient, ni la
  // falaise et la neige des sommets, où l'on ne marche pas : leur sol suit leurs cases, sous les
  // falaises en relief de monde-roches.js)
  const RD = Math.ceil(S.DERIVE), bw = gw + 2 * RD, bh = gh + 2 * RD, brut = new Uint8Array(bw * bh);
  for (let y = 0; y < bh; y++) {
    const wy = Math.min(H - 1, Math.max(0, gy0 - RD + y));
    for (let x = 0; x < bw; x++) {
      const wx = Math.min(W - 1, Math.max(0, gx0 - RD + x)), i = wy * W + wx;
      brut[y * bw + x] = solDe(ctx, biomeDe(ctx, i), i, wx, wy);
    }
  }
  const gSol = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) {
    const wy = Math.min(H - 1, Math.max(0, gy0 + y));
    for (let x = 0; x < gw; x++) {
      const wx = Math.min(W - 1, Math.max(0, gx0 + x));
      let v = brut[(y + RD) * bw + x + RD];
      if (v !== EAU && v !== SOL.falaise && v !== SOL.neige) {
        const dx = Math.round((ctx.derive(wx, wy) - 0.5) * 2 * S.DERIVE), dy = Math.round((ctx.derive2(wx, wy) - 0.5) * 2 * S.DERIVE);
        // (bornée au monde, comme la case elle-même)
        const ux = Math.min(W - 1, Math.max(0, wx + dx)) - wx, uy = Math.min(H - 1, Math.max(0, wy + dy)) - wy;
        const u = brut[(y + RD + uy) * bw + x + RD + ux];
        if (u !== EAU && u !== SOL.falaise && u !== SOL.neige) v = u;
      }
      gSol[y * gw + x] = v;
    }
  }
  // les coins : de (x0 - 4, y0 - 4) à (x1 + 4, y1 + 4). Les bords naturels : l'eau d'un coin reste
  // celle de ses quatre cases (dès que deux en sont : la rive suit les cases où l'on ne marche pas) ;
  // sinon, le sol d'un coin n'est plus le plus présent de ses quatre cases (un escalier, case par
  // case, le long d'une frontière en biais) mais celui qui pèse le plus parmi les seize cases
  // autour (POIDS : les quatre qui le touchent, les huit d'à côté, les quatre des angles), chaque
  // poids poussé par un bruit propre à ce sol (± BRUIT_BORDS, PAS_BORDS coins) : la frontière
  // s'arrondit et ondule, à l'échelle de quelques cases. Une étendue d'un seul sol (la prairie
  // autour de la ferme) ne change pas.
  const [P0, P1, P2] = S.POIDS, cv = W + 1, CC = ctx.cheminCoins;
  const cw = l + 9, chc = h + 9, kx0 = x0 - 4, ky0 = y0 - 4;
  const cSol = new Uint8Array(cw * chc), cCh = new Uint8Array(cw * chc), cTe = new Uint8Array(cw * chc), cDeep = new Uint8Array(cw * chc);
  const poids = new Float32Array(2 + NS), vus = [];
  // (un coin de la terre battue d'un hameau : une des quatre cases qui le touchent en est ; la place
  // et les ruelles se peignent comme le chemin, monde-hameaux.js)
  const TH = ctx.hameaux.terre;
  const terreHameau = (X, Y) => {
    for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 0; dx++) { const x = X + dx, y = Y + dy; if (x >= 0 && y >= 0 && x < W && y < H && TH[y * W + x] === TERRE_HAMEAU) return true; }
    return false;
  };
  for (let y = 0; y < chc; y++) {
    for (let x = 0; x < cw; x++) {
      const X = kx0 + x, Y = ky0 + y, k = y * cw + x;
      if (X >= F.X && Y >= F.Y && X <= F.X + F.LARGEUR && Y <= F.Y + F.HAUTEUR) {
        // un coin de la ferme (son bord) : le sien
        const s = ferme.sommets[(Y - F.Y) * fv + X - F.X];
        cSol[k] = s === 2 ? EAU : HERBE; cCh[k] = s === 1 ? 1 : 0; cTe[k] = ferme.teintes[(Y - F.Y) * fv + X - F.X];
        continue;
      }
      const g = (Y - 1 - gy0) * gw + X - 1 - gx0;   // la case haut-gauche du coin
      const a = gSol[g], b2 = gSol[g + 1], c2 = gSol[g + gw], d = gSol[g + gw + 1];
      let s = EAU;
      if ((a === EAU) + (b2 === EAU) + (c2 === EAU) + (d === EAU) < 2) {
        // (seize cases du même sol, le cas de presque tous les coins : ce sol)
        let seul = a === EAU ? b2 === EAU ? c2 : b2 : a, un = true;
        for (let dy = -1; dy <= 2 && un; dy++) for (let dx = -1; dx <= 2; dx++) { const v = gSol[g + dy * gw + dx]; if (v !== EAU && v !== seul) { un = false; break; } }
        if (!un) {
          for (const v of vus) poids[v] = 0;
          vus.length = 0;
          for (let dy = -1; dy <= 2; dy++) {
            for (let dx = -1; dx <= 2; dx++) {
              const v = gSol[g + dy * gw + dx];
              if (v === EAU) continue;
              const bx = dx === 0 || dx === 1, by = dy === 0 || dy === 1;
              if (!poids[v]) vus.push(v);
              poids[v] += bx && by ? P0 : bx || by ? P1 : P2;
            }
          }
          const n1 = ctx.bords(X, Y) - 0.5, n2 = ctx.bords2(X, Y) - 0.5;
          let best = -1;
          // (la falaise et la neige des sommets, où l'on ne marche pas, ne prennent un coin que si
          // toutes ses cases de terre en sont : leur sol reste dans leurs cases, sous les falaises
          // en relief, sans déborder sur la case où l'on marche)
          const tout = (v) => (a === EAU || a === v) && (b2 === EAU || b2 === v) && (c2 === EAU || c2 === v) && (d === EAU || d === v);
          if ((poids[SOL.falaise] && !tout(SOL.falaise)) || (poids[SOL.neige] && !tout(SOL.neige))) {
            if (!tout(SOL.falaise)) poids[SOL.falaise] = 0;
            if (!tout(SOL.neige)) poids[SOL.neige] = 0;
          }
          for (const v of vus) {
            if (!poids[v]) continue;
            const p = poids[v] * (1 + S.BRUIT_BORDS * 2 * (n1 * Math.cos(v * 2.4) + n2 * Math.sin(v * 2.4)));
            if (p > best || (p === best && v > seul)) { best = p; seul = v; }
          }
        }
        s = seul;
      }
      cSol[k] = s;
      if (X >= F.X - S.PRES_FERME && Y >= F.Y - S.PRES_FERME && X <= F.X + F.LARGEUR + S.PRES_FERME && Y <= F.Y + F.HAUTEUR + S.PRES_FERME) {
        // (aux abords de la ferme, le chemin d'avant : un coin dont deux des quatre cases sont du
        // chemin ; son raccord avec celui de la ferme ne bouge pas)
        let n = 0;
        for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
          const x2 = Math.min(W - 1, Math.max(0, X + dx)), y2 = Math.min(H - 1, Math.max(0, Y + dy));
          if (ctx.chemins[y2 * W + x2] === 1) n++;
        }
        cCh[k] = s !== EAU && n >= 2 ? 1 : 0;
      } else cCh[k] = s !== EAU && s !== SOL.falaise && s !== SOL.neige && X >= 0 && Y >= 0 && X <= W && Y <= H && (CC[Y * cv + X] || terreHameau(X, Y)) ? 1 : 0;
      cTe[k] = ctx.teinte(X - F.X, Y - F.Y);
    }
  }
  // l'eau profonde : un coin d'eau sans terre dans un rond de PROFOND coins de rayon (± un bruit :
  // la limite du profond ondule, sans suivre l'escalier de la rive)
  for (let y = 3; y < chc - 3; y++) {
    for (let x = 3; x < cw - 3; x++) {
      let p = cSol[y * cw + x] === EAU;
      let terre = false;
      for (let dy = -3; dy <= 3 && p && !terre; dy++) for (let dx = -3; dx <= 3; dx++) if (cSol[(y + dy) * cw + x + dx] !== EAU) { terre = true; break; }
      if (p && terre) {
        const R = S.PROFOND[0] + (S.PROFOND[1] - S.PROFOND[0]) * ctx.bords(kx0 + x, ky0 + y), R2 = R * R;
        for (let dy = -3; dy <= 3 && p; dy++) for (let dx = -3; dx <= 3 && p; dx++) if (dx * dx + dy * dy <= R2 && cSol[(y + dy) * cw + x + dx] !== EAU) p = false;
      }
      cDeep[y * cw + x] = p ? 1 : 0;
    }
  }
  const couches = new Uint16Array(l * h * K);
  const masque = (f, k) => (f(k) ? 8 : 0) | (f(k + 1) ? 4 : 0) | (f(k + cw) ? 2 : 0) | (f(k + cw + 1) ? 1 : 0);
  // (les sols pleins : les variantes 0 à 11 le plus souvent, 12 à 15, avec un détail, une fois sur
  // six ; les bords, les rives, le chemin : leurs variantes)
  const variante = (r) => ((r % 100) < 84 ? (r >>> 8) % 12 : 12 + ((r >>> 12) % 4));
  const vb = (r) => (r >>> 20) % S.BORDS, vr = (r) => (r >>> 22) % S.RIVES, vc = (r) => (r >>> 24) % S.CHEMINS;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < l; x++) {
      const X = x0 + x, Y = y0 + y;
      if (X >= F.X && Y >= F.Y && X < F.X + F.LARGEUR && Y < F.Y + F.HAUTEUR) continue;   // la ferme
      const i = Y * W + X, o = (y * l + x) * K, k = (Y - ky0) * cw + X - kx0;
      const r = hasardCase(ctx.g0, i);
      const ks = [k, k + 1, k + cw, k + cw + 1];
      let n = 0;
      const pose = (v) => { couches[o + n++] = v; };
      const s0 = cSol[k], s1 = cSol[k + 1], s2 = cSol[k + cw], s3 = cSol[k + cw + 1];
      const t0 = cTe[k], t1 = cTe[k + 1], t2 = cTe[k + cw], t3 = cTe[k + cw + 1];
      const hh = Math.min(t0, t1, t2, t3);
      const terre = (q) => cSol[q] !== EAU;
      const nCh = masque((q) => cCh[q] === 1, k);
      if (s0 === EAU || s1 === EAU || s2 === EAU || s3 === EAU) {
        // l'eau, puis la terre sur ses coins (une rive), puis le chemin, le gué
        const nd = masque((q) => cDeep[q] === 1, k);
        // (l'eau de la ferme, peu profonde ou profonde ; entre les deux, l'eau profonde de la planche
        // des sols posée sur ses coins : sa limite suit la courbe de la rive)
        const f = nd === 15 ? 8 + (((r >>> 4) % 100) < 70 ? ((r >>> 12) & 1 ? 2 : 0) : (r >>> 16) % 8) : nd === 0 && (r % 100) >= 70 ? 1 + ((r >>> 8) % 7) : 0;
        pose(blocGid('eau', f));
        if (nd && nd !== 15) pose(profond(nd));
        let premier = true;
        for (let c = HERBE; c < 2 + NS; c++) {
          if (!ks.some((q) => cSol[q] === c)) continue;
          const m = masque((q) => terre(q) && cSol[q] >= c, k);
          if (premier) {
            if (c === HERBE) pose(ks.every((q) => !terre(q) || cCh[q]) ? blocGid('rive_sable', m) : blocGid('rive_herbe', hh * 16 + m));
            else pose(rive(c - 2, m, vr(r)));
            premier = false;
          } else pose(bord(c - 2, m, vb(r)));
        }
        if (nCh) pose(cheminSur(nCh, vc(r)));
        if (ctx.chemins[i] === 2) pose(gue(r % 8));
      } else if (s0 === HERBE && s1 === HERBE && s2 === HERBE && s3 === HERBE) {
        // la prairie, comme avant ; le chemin, aux abords de la ferme, par ses raccords (comme à sa
        // sortie), ailleurs posé sur l'herbe (son bord suit la courbe, pas l'escalier des cases)
        const abords = X >= F.X - S.PRES_FERME && Y >= F.Y - S.PRES_FERME && X < F.X + F.LARGEUR + S.PRES_FERME && Y < F.Y + F.HAUTEUR + S.PRES_FERME;
        if (nCh === 15) pose(blocGid('herbe_chemin', 4 * 16 + (r % 8)));
        else if (nCh && abords) pose(blocGid('herbe_chemin', (5 + hh * 2) * 16 + nCh));
        else {
          if (Math.max(t0, t1, t2, t3) > hh) pose(blocGid('herbe_chemin', (13 + hh) * 16 + masque((q) => cTe[q] > hh, k)));
          else pose(blocGid('herbe_chemin', hh * 16 + (r % 16)));
          if (nCh) pose(cheminSur(nCh, vc(r)));
        }
      } else if (nCh === 15) {
        pose(blocGid('herbe_chemin', 4 * 16 + (r % 8)));
      } else {
        // des sols différents : le plus bas en entier, les autres sur leurs coins
        const bas = Math.min(s0, s1, s2, s3);
        pose(bas === HERBE ? blocGid('herbe_chemin', hh * 16 + (r % 16)) : plein(bas - 2, variante(r)));
        for (let c = bas + 1; c < 2 + NS; c++) if (ks.some((q) => cSol[q] === c)) pose(bord(c - 2, masque((q) => cSol[q] >= c, k), vb(r)));
        if (nCh) pose(cheminSur(nCh, vc(r)));
      }
    }
  }
  // la région elle-même : ses biomes, où l'on marche
  const biome = new Uint8Array(cl * chh), marche = new Uint8Array(cl * chh);
  for (let y = 0; y < chh; y++) {
    for (let x = 0; x < cl; x++) {
      const i = (cy0 + y) * W + cx0 + x, b = biomeDe(ctx, i);
      biome[y * cl + x] = b;
      marche[y * cl + x] = !FERMES[b] || ctx.chemins[i] === 2 ? 1 : 0;
    }
  }
  // la végétation (monde-vegetation.js) : ses images, ses petites plantes ; les pieds des arbres
  // et des buissons ferment leurs cases. Entre ses tirages et sa pose, les rochers, les falaises,
  // l'épave (monde-roches.js), qui s'écartent des arbres ; leurs petites pièces après les plantes.
  const g = {
    cx0, cy0, cl, ch: chh, x0, y0, l, h, cSol, cCh, cTe, cw, kx0, ky0, EAU, codes: CODES_SOLS, marche, biomeDe: (i) => biomeDe(ctx, i),
    solBrut: (i, x, y) => solDe(ctx, biomeDe(ctx, i), i, x, y),
  };
  let r = null, tir = null;
  g.apresTirages = (t) => { tir = t; r = rochesDeRegion(ctx, g, t); return r.pris; };
  const vegetation = vegetationDeRegion(ctx, g);
  const roches = { images: Int32Array.from(r.images), basses: bassesRoches(ctx, g, r, tir, vegetation.basses) };
  // les lieux qui ont leur dessin (monde-lieux.js : l'entrée des grottes, les pontons et les piquets
  // des coins de pêche ; ils ferment ou ouvrent leurs cases), puis les bêtes (monde-faune.js), sur la
  // marche finale de la région
  const lieux = lieuxDeRegion(ctx, g);
  // les hameaux bâtis (monde-hameaux.js) : leurs murs, leurs meubles, leurs clôtures ferment leurs cases
  const hameau = hameauxDeRegion(ctx, g);
  g.biome = biome;
  g.nomSol = (i) => nomSolDeCase(ctx, i);
  const faune = fauneDeRegion(ctx, g);
  return { cle: rx + ',' + ry, x0, y0, l, h, couches, cx0, cy0, cl, ch: chh, biome, marche, vegetation, roches, lieux, hameau, faune, ms: Date.now() - t0 };
}

// Un aperçu des biomes de tout le monde (une valeur tous les `pas` cases, au milieu de chaque bloc,
// sans les eaux des éléments : les champs seuls, vite faits) : le sol provisoire des régions pas
// encore faites. → { pas, l, h, biomes (Uint8Array) }.
export function apercuDesBiomes(ctx, pas = 8) {
  const W = ctx.cadre.LARGEUR, H = ctx.cadre.HAUTEUR, l = Math.ceil(W / pas), h = Math.ceil(H / pas), out = new Uint8Array(l * h), v = [0, 0, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < l; x++) out[y * l + x] = ctx.champs.valeurs(Math.min(W - 1, x * pas + (pas >> 1)), Math.min(H - 1, y * pas + (pas >> 1)), v)[2];
  }
  return { pas, l, h, biomes: out };
}

/* ---------- marcher ---------- */

// Le sol du monde du terrain T, calculé en direct (sans Worker : Node, les tests, la page sans
// Worker), ses régions gardées : { region(rx, ry) → solDeRegion… }. null pour un terrain sans
// monde (la carte de Tiled, la ferme seule d'une ancienne partie).
const directs = new Map();
export function solDirect(T) {
  const m = T && T.MONDE;
  if (!m) return null;
  let s = directs.get(m.graine);
  if (!s) {
    const ctx = contexteSol(m.graine, m.cadre, m.ferme, m.taille);
    const regions = new Map();
    s = {
      ctx,
      region(rx, ry) {
        const cle = rx + ',' + ry;
        if (!regions.has(cle)) regions.set(cle, solDeRegion(ctx, rx, ry));
        return regions.get(cle);
      },
    };
    directs.set(m.graine, s);
    while (directs.size > 2) directs.delete(directs.keys().next().value);
  }
  return s;
}

// Peut-on marcher sur la case t du terrain T ? Sur la ferme, oui (ses bâtiments, ses arbres, son
// eau sont les obstacles de la scène, comme avant) ; ailleurs, selon le plan : ni la mer, ni un lac,
// ni une rivière (sauf à gué, où un chemin la traverse), ni une falaise, ni un sommet. `sol` : qui
// donne les régions (region(rx, ry) → solDeRegion, ou null si elle n'est pas encore faite : on n'y
// va pas) ; par défaut, le calcul direct (solDirect). Hors du monde : non. `ouvertes` (un Set de
// cases, ou rien) : celles qu'une pièce prise rend à la marche (un arbre abattu, un rocher cassé :
// monde-recolte.js, casesOuvertesMonde).
export function caseMarchable(T, t, sol = solDirect(T), ouvertes = null) {
  if (!T.FERME || !sol) return true;
  const W = T.LARGEUR, c = t % W, r = Math.floor(t / W), F = T.FERME;
  if (!(t >= 0 && t < W * T.HAUTEUR)) return false;
  if (c >= F.X && r >= F.Y && c < F.X + F.LARGEUR && r < F.Y + F.HAUTEUR) return true;
  const N = T.MONDE.taille, reg = sol.region(Math.floor(c / N), Math.floor(r / N));
  return !!reg && (reg.marche[(r - reg.cy0) * reg.cl + c - reg.cx0] === 1 || (!!ouvertes && ouvertes.has(t)));
}
