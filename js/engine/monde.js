import { blocGid } from './planche.js';
import { genererFerme, hache, teinteHerbe } from './ferme-generee.js';
import { fairePlan } from './monde-gen.js';

/* ---------- le grand monde (docs/grand-monde.md) ---------- */

// Le monde d'une partie : une seule carte de LARGEUR × HAUTEUR tuiles, la ferme générée
// (ferme-generee.js, telle quelle) posée en FERME (sa case en haut à gauche), au centre. Les
// cases sont numérotées sur la largeur du monde (rangée × LARGEUR + colonne) : le moteur, la
// carte et la sauvegarde parlent tous de ces cases-là (la migration 51 → 52 y a porté les
// anciennes parties, state.js).
//
// Pour l'instant (étape 3), le monde autour de la ferme est une prairie : l'herbe de la ferme y
// continue, avec la même teinte qui ondule (teinteHerbe) et ses raccords, et le chemin de la
// ferme s'y arrête en s'arrondissant. Le générateur du monde (étape 4) y posera les biomes.
//
// genererMonde(graine) → { carte, terrain } comme genererFerme : la carte au format de Tiled (ses
// couches à la taille du monde, ses objets décalés), le terrain de terrain-carte.js avec les
// mêmes ajouts (DECALAGE, BUISSONS, SOMMETS, TEINTES, HERBES, FLEURS, BUISSONS_CASES) dans les
// cases du monde, et FERME : { X, Y, LARGEUR, HAUTEUR }, la place de la ferme (en tuiles) ; et
// `plan`, le plan du monde (monde-gen.js : biomes, relief, rivières, chemins, lieux), tiré à la
// première demande. Pour l'instant (fiche 4a), le plan n'est que des données : ni le terrain ni la
// carte ne le lisent encore (la fiche 4b les dessinera et les rendra marchables).

export const MONDE = { LARGEUR: 644, HAUTEUR: 510, T: 16, REGION: 64 };
// La place de la ferme dans le monde : au centre (en tuiles).
export const FERME_DANS_MONDE = [250, 198];

/* ---------- les régions du monde ---------- */

// Le monde se découpe en régions de MONDE.REGION × MONDE.REGION tuiles (la région « rx,ry » : les
// colonnes rx × REGION à (rx + 1) × REGION - 1, de même pour les rangées). C'est la seule source
// de cette taille : la scène de la ferme la reçoit au montage (js/ui/stage.js → CarteKit.REGION,
// js/carte/kit.js), où elle découpe son sol, ses arbres et ses rochers sur la même grille.
// Le moteur ne passe en revue que la ferme et les régions que le joueur a vues (state.monde.vues,
// terrain.js : casesDuTerrain, regionVue) ; la carte dit à la scène les régions qui ont quelque
// chose à relever (carte.regionsPleines : pour l'instant, celles de la ferme).

// La région de la case `t` d'un terrain de `largeur` tuiles : « rx,ry ».
export function regionDeCase(t, largeur = MONDE.LARGEUR) {
  const N = MONDE.REGION;
  return Math.floor((t % largeur) / N) + ',' + Math.floor(Math.floor(t / largeur) / N);
}

// Les régions que touche le rectangle de tuiles (X, Y, L × H) : [« rx,ry »…], rangée par rangée.
export function regionsDuRect(X, Y, L, H) {
  const N = MONDE.REGION, out = [];
  if (!(L > 0 && H > 0)) return out;
  for (let ry = Math.floor(Y / N); ry <= Math.floor((Y + H - 1) / N); ry++) {
    for (let rx = Math.floor(X / N); rx <= Math.floor((X + L - 1) / N); rx++) out.push(rx + ',' + ry);
  }
  return out;
}

// Les cases de la région « rx,ry » d'un terrain de `largeur` × `hauteur` tuiles (bornée à lui),
// dans l'ordre des cases.
export function casesDeRegion(cle, largeur = MONDE.LARGEUR, hauteur = MONDE.HAUTEUR) {
  const N = MONDE.REGION, [rx, ry] = String(cle).split(',').map(Number), out = [];
  if (!Number.isInteger(rx) || !Number.isInteger(ry)) return out;
  for (let r = Math.max(0, ry * N); r < Math.min(hauteur, (ry + 1) * N); r++) {
    for (let c = Math.max(0, rx * N); c < Math.min(largeur, (rx + 1) * N); c++) out.push(r * largeur + c);
  }
  return out;
}

// (les derniers mondes faits, MONDES_GARDES au plus : un monde pèse quelques dizaines de Mo, et
// une partie n'en a qu'un)
const mondes = new Map();
const MONDES_GARDES = 3;

export function genererMonde(graine) {
  const cle = String(graine);
  let m = mondes.get(cle);
  if (m) mondes.delete(cle);
  else m = fabriquer(cle);
  mondes.set(cle, m);
  while (mondes.size > MONDES_GARDES) mondes.delete(mondes.keys().next().value);
  return m;
}

// Le plan du monde de la graine (monde-gen.js : fairePlan), tiré à la première demande.
export function planDuMonde(graine) {
  return genererMonde(graine).plan;
}

// Une case de la ferme (rangée × largeur de la ferme + colonne) → la même case du monde.
export function caseDuMonde(i, largeurFerme, [ox, oy] = FERME_DANS_MONDE) {
  return (Math.floor(i / largeurFerme) + oy) * MONDE.LARGEUR + (i % largeurFerme) + ox;
}

// Un identifiant « colonne,rangée » (en tuiles) ou « x,y » (en px, `px` : la taille d'une tuile)
// de la ferme → celui du monde.
export function idDuMonde(id, px = 1, [ox, oy] = FERME_DANS_MONDE) {
  const m = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(String(id));
  if (!m) return id;
  return (Number(m[1]) + ox * px) + ',' + (Number(m[2]) + oy * px);
}

// Un nombre au hasard pour la case i (toujours le même pour une même graine).
function hasardCase(g0, i) {
  let h = (g0 ^ Math.imul(i + 1, 2654435761)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return (h ^ (h >>> 16)) >>> 0;
}

function fabriquer(graine) {
  const { carte: f, terrain: tf } = genererFerme(graine);
  const W = MONDE.LARGEUR, H = MONDE.HAUTEUR, T = MONDE.T, N = W * H, V = W + 1;
  const fw = f.width, fh = f.height, fv = fw + 1, [OX, OY] = FERME_DANS_MONDE;
  const g0 = hache(graine + ':monde');
  const dansFerme = (c, r) => c >= OX && r >= OY && c < OX + fw && r < OY + fh;
  const versMonde = (i) => (Math.floor(i / fw) + OY) * W + (i % fw) + OX;

  // ---- 1. les coins des cases : ceux de la ferme, la prairie autour (sa teinte continue).
  // Calculés à la première demande (les chemins posés, la carte) : le moteur n'en a souvent pas
  // besoin, et le monde est grand.
  let coinsFaits = null;
  const coins = () => {
    if (coinsFaits) return coinsFaits;
    const teinteDe = teinteHerbe(graine);
    const sommets = new Uint8Array(V * (H + 1)), teintes = new Uint8Array(V * (H + 1));
    for (let y = 0; y <= H; y++) {
      for (let x = 0; x <= W; x++) {
        const lx = x - OX, ly = y - OY, k = y * V + x;
        if (lx >= 0 && ly >= 0 && lx <= fw && ly <= fh) { sommets[k] = tf.SOMMETS[ly * fv + lx]; teintes[k] = tf.TEINTES[ly * fv + lx]; }
        else teintes[k] = teinteDe(lx, ly);
      }
    }
    return (coinsFaits = { sommets, teintes });
  };

  // ---- 2. les couches : celles de la ferme à leur place ; le sol de la prairie autour (à la
  // première demande aussi : seule la scène les lit)
  let carteFaite = null;
  const carte = () => {
    if (carteFaite) return carteFaite;
    const { sommets, teintes } = coins();
    const layers = f.layers.map((l) => {
      if (l.type === 'tilelayer') {
        const data = new Array(N).fill(0);
        for (let r = 0; r < fh; r++) for (let c = 0; c < fw; c++) data[(r + OY) * W + c + OX] = l.data[r * fw + c];
        return { ...l, width: W, height: H, data };
      }
      return { ...l, objects: (l.objects || []).map((o) => ({ ...o, x: o.x + OX * T, y: o.y + OY * T })) };
    });
    const ground = layers.find((l) => l.name === 'ground').data;
    const masque = (f2, x, y) => (f2(x, y) ? 8 : 0) | (f2(x + 1, y) ? 4 : 0) | (f2(x, y + 1) ? 2 : 0) | (f2(x + 1, y + 1) ? 1 : 0);
    const chemin = (x, y) => sommets[y * V + x] === 1;
    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        if (dansFerme(tx, ty)) continue;
        const i = ty * W + tx, k = ty * V + tx;
        const t0 = teintes[k], t1 = teintes[k + 1], t2 = teintes[k + V], t3 = teintes[k + V + 1];
        const h = Math.min(t0, t1, t2, t3), r = hasardCase(g0, i);
        if (sommets[k] === 1 || sommets[k + 1] === 1 || sommets[k + V] === 1 || sommets[k + V + 1] === 1) {
          const n = masque(chemin, tx, ty);
          ground[i] = blocGid('herbe_chemin', n === 15 ? 4 * 16 + (r % 8) : (5 + h * 2) * 16 + n);
        } else if (Math.max(t0, t1, t2, t3) > h) {
          ground[i] = blocGid('herbe_chemin', (13 + h) * 16 + masque((x, y) => teintes[y * V + x] > h, tx, ty));
        } else {
          ground[i] = blocGid('herbe_chemin', h * 16 + (r % 16));
        }
      }
    }
    // (les régions où la scène relève les arbres, les rochers, les barrières, l'eau… : celles de
    // la ferme ; la prairie autour n'a que du sol. L'étape 4 y ajoutera celles des biomes.)
    const regionsPleines = regionsDuRect(OX, OY, fw, fh);
    return (carteFaite = { ...f, width: W, height: H, layers, regionsPleines });
  };

  // ---- 3. le terrain : celui de la ferme porté dans les cases du monde (sans relire la carte du
  // monde case par case). Autour, pour l'instant, la prairie n'est « rien » (« . ») : on y
  // marche, on n'y laboure ni n'y bâtit (les biomes du monde viendront à l'étape 4) ; le moteur
  // ne parcourt que les cases de la ferme (casesDuTerrain, terrain.js).
  const sh = (id) => idDuMonde(id);
  // (`trie` : dans l'ordre de leurs identifiants, comme terrain-carte.js range les arbres ; les
  // rochers, dans l'ordre des cases, ne changent pas d'ordre)
  const decale = (o, trie) => {
    const e = Object.entries(o || {}).map(([id, cs]) => [sh(id), cs.map(versMonde)]);
    return Object.fromEntries(trie ? e.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)) : e);
  };
  const vide = '.'.repeat(W), gauche = '.'.repeat(OX), droite = '.'.repeat(W - OX - fw);
  const lignes = [];
  for (let r = 0; r < H; r++) lignes.push(r >= OY && r < OY + fh ? gauche + tf.LIGNES[r - OY] + droite : vide);
  const zones = Object.fromEntries(Object.entries(tf.ZONES || {}).map(([z, o]) => [z, { ...o, X: o.X + OX, Y: o.Y + OY }]));
  const herbes = {};
  for (const [i, ids] of Object.entries(tf.HERBES || {})) herbes[versMonde(Number(i))] = ids.map((id) => idDuMonde(id, T));
  const buissonsCases = {};
  for (const [id, cs] of Object.entries(tf.BUISSONS_CASES || {})) buissonsCases[idDuMonde(id)] = cs.map(versMonde);
  const terrain = {
    LARGEUR: W, HAUTEUR: H, ZONES: zones, LIGNES: lignes, ROCHERS: decale(tf.ROCHERS), ARBRES: decale(tf.ARBRES, true),
    DECALAGE: [tf.DECALAGE[0] + OX, tf.DECALAGE[1] + OY],
    BUISSONS: (tf.BUISSONS || []).map(([c, r, w, h, taille]) => [c + OX, r + OY, w, h, taille]),
    HERBES: herbes,
    FLEURS: (tf.FLEURS || []).map(versMonde),
    BUISSONS_CASES: buissonsCases,
    FERME: { X: OX, Y: OY, LARGEUR: fw, HAUTEUR: fh },
  };
  Object.defineProperty(terrain, 'SOMMETS', { get: () => coins().sommets, enumerable: true });
  Object.defineProperty(terrain, 'TEINTES', { get: () => coins().teintes, enumerable: true });
  // ---- 4. le plan du monde (monde-gen.js), à la première demande : la ferme à sa place, et la
  // sortie de son chemin (le rectangle `vers_la_transition`, couche « passages », sur les trois
  // rangées du chemin au bord est) : le réseau des chemins du monde part de la case juste à l'est.
  let planFait = null;
  const plan = () => {
    if (planFait) return planFait;
    const passage = f.layers.find((l) => l.name === 'passages').objects.find((o) => o.name === 'vers_la_transition');
    const sortie = Math.round(passage.y / T) + 1;
    planFait = fairePlan(graine, {
      LARGEUR: W, HAUTEUR: H, FERME: terrain.FERME, SORTIE: (OY + sortie) * W + OX + fw,
    });
    return planFait;
  };
  return { get carte() { return carte(); }, terrain, get plan() { return plan(); } };
}
