import { genererFerme, teinteHerbe } from './ferme-generee.js';
import { fairePlan } from './monde-gen.js';

/* ---------- le grand monde (docs/grand-monde.md) ---------- */

// Le monde d'une partie : une seule carte de LARGEUR × HAUTEUR tuiles, la ferme générée
// (ferme-generee.js, telle quelle) posée en FERME (sa case en haut à gauche), au centre. Les
// cases sont numérotées sur la largeur du monde (rangée × LARGEUR + colonne) : le moteur, la
// carte et la sauvegarde parlent tous de ces cases-là (la migration 51 → 52 y a porté les
// anciennes parties, state.js).
//
// Autour de la ferme, les biomes du plan (monde-gen.js) : leur sol se calcule région par région
// (monde-sol.js : les tuiles de chaque case, où l'on marche), dans un Web Worker sur le site
// (js/monde-worker.js, js/ui/monde-sol.js), et la scène le peint sous les couches de la carte. Près
// de la ferme, c'est une prairie (le plan l'y force) : l'herbe de la ferme y continue, avec la même
// teinte qui ondule (teinteHerbe) et ses raccords, et son chemin rejoint ceux du monde à la sortie
// est. Le terrain du moteur (LIGNES) reste « rien » (« . ») hors de la ferme : on y marche, on n'y
// laboure ni n'y bâtit.
//
// genererMonde(graine) → { carte, terrain, plan } comme genererFerme : la carte au format de Tiled
// (ses couches à la taille du monde, vides hors de la ferme, ses objets décalés), le terrain de
// terrain-carte.js avec les mêmes ajouts (DECALAGE, BUISSONS, SOMMETS, TEINTES, HERBES, FLEURS,
// BUISSONS_CASES) dans les cases du monde, FERME : { X, Y, LARGEUR, HAUTEUR }, la place de la ferme
// (en tuiles), et MONDE (pas énumérable) : de quoi en calculer le sol (monde-sol.js) ; et `plan`, le
// plan entier du monde (monde-gen.js : biomes, relief, rivières, chemins, lieux), tiré à la première
// demande (ni le jeu ni le sol ne le demandent : l'aperçu et les tests seulement).

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

// `port` (le chantier « l'île à bâtir », fiche I1a) : le niveau du port de la partie (1 à 5), ou 0 : pas de
// port (le jeu publié, VILLAGE.ACTIF faux : le monde d'avant, le même objet). Le monde d'un port est celui de
// la graine, sa carte et son terrain les mêmes, seul son cadre porte PORT (le plan y place le port : monde-gen.js,
// elementsDuMonde) et MONDE.cle le distingue (les sols gardés par monde : monde-sol.js solDirect,
// js/ui/monde-sol.js).
export function genererMonde(graine, port = 0) {
  const g = String(graine), n = Number.isInteger(port) && port > 0 ? port : 0, cle = n ? g + '|port' + n : g;
  let m = mondes.get(cle);
  if (m) mondes.delete(cle);
  else m = n ? avecPort(genererMonde(g), n) : fabriquer(g);
  mondes.set(cle, m);
  while (mondes.size > MONDES_GARDES) mondes.delete(mondes.keys().next().value);
  return m;
}

// Le plan du monde de la graine (monde-gen.js : fairePlan), tiré à la première demande.
export function planDuMonde(graine, port = 0) {
  return genererMonde(graine, port).plan;
}

// Le monde `m` (celui de la graine, sans port) avec le port au niveau n : sa carte, son terrain (les mêmes
// propriétés : ses coins se calculent une fois), son cadre avec PORT, son plan à part.
function avecPort(m, n) {
  const T = m.terrain, M = T.MONDE, cadre = { ...M.cadre, PORT: n };
  const { MONDE: _m, ...props } = Object.getOwnPropertyDescriptors(T);
  const terrain = Object.defineProperties({}, props);
  Object.defineProperty(terrain, 'MONDE', { value: { ...M, cadre, cle: M.graine + '|port' + n } });
  let planFait = null;
  return { get carte() { return m.carte; }, terrain, get plan() { return planFait || (planFait = fairePlan(M.graine, cadre)); } };
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

function fabriquer(graine) {
  const { carte: f, terrain: tf } = genererFerme(graine);
  const W = MONDE.LARGEUR, H = MONDE.HAUTEUR, T = MONDE.T, N = W * H, V = W + 1;
  const fw = f.width, fh = f.height, fv = fw + 1, [OX, OY] = FERME_DANS_MONDE;
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

  // ---- 2. les couches : celles de la ferme à leur place, vides autour (à la première demande :
  // seule la scène les lit). Le sol du monde autour de la ferme ne passe pas par elles : il se
  // calcule région par région (monde-sol.js, dans un Web Worker sur le site : js/ui/monde-sol.js)
  // et la scène le peint sous les couches de la carte.
  let carteFaite = null;
  const carte = () => {
    if (carteFaite) return carteFaite;
    const layers = f.layers.map((l) => {
      if (l.type === 'tilelayer') {
        const data = new Array(N).fill(0);
        for (let r = 0; r < fh; r++) for (let c = 0; c < fw; c++) data[(r + OY) * W + c + OX] = l.data[r * fw + c];
        return { ...l, width: W, height: H, data };
      }
      return { ...l, objects: (l.objects || []).map((o) => ({ ...o, x: o.x + OX * T, y: o.y + OY * T })) };
    });
    // (les régions où la scène relève les arbres, les rochers, les barrières, l'eau… : celles de
    // la ferme ; autour, le monde n'a encore que du sol. L'étape 5 y ajoutera les décors des biomes.)
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
  // la malle de la calèche (caleche.js, « la malle » ; la scène : js/carte/ferme/malle.js), au bout du chemin :
  // ses cases sont réservées (« . » : on n'y bâtit, ne laboure ni ne plante ; la scène y arrête le personnage)
  const malle = placeMalle(f, tf, fw);
  const lignesFerme = tf.LIGNES.slice();
  if (malle) for (const [c, r] of malle.cases) lignesFerme[r] = lignesFerme[r].slice(0, c) + '.' + lignesFerme[r].slice(c + 1);
  const lignes = [];
  for (let r = 0; r < H; r++) lignes.push(r >= OY && r < OY + fh ? gauche + lignesFerme[r - OY] + droite : vide);
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
    // MALLE : { cases (ses trois cases, de gauche à droite), x (px : le bord gauche), y (px : le bas de ses cases) }, ou null
    MALLE: malle ? { cases: malle.cases.map(([c, r]) => (r + OY) * W + c + OX), x: (malle.cases[0][0] + OX) * T, y: (malle.cases[0][1] + OY + 1) * T } : null,
  };
  Object.defineProperty(terrain, 'SOMMETS', { get: () => coins().sommets, enumerable: true });
  Object.defineProperty(terrain, 'TEINTES', { get: () => coins().teintes, enumerable: true });
  // ---- 4. le plan du monde (monde-gen.js), à la première demande : la ferme à sa place, et la
  // sortie de son chemin (le rectangle `vers_la_transition`, couche « passages », sur les trois
  // rangées du chemin au bord est) : le réseau des chemins du monde part de la case juste à l'est.
  const passage = f.layers.find((l) => l.name === 'passages').objects.find((o) => o.name === 'vers_la_transition');
  const cadre = { LARGEUR: W, HAUTEUR: H, FERME: terrain.FERME, SORTIE: (OY + Math.round(passage.y / T) + 1) * W + OX + fw };
  let planFait = null;
  const plan = () => planFait || (planFait = fairePlan(graine, cadre));
  // ---- 5. de quoi calculer le sol du monde (monde-sol.js : solDirect, caseMarchable ; la page le
  // donne à son Worker, js/ui/monde-sol.js) : la graine, le cadre du plan, les coins de la ferme
  // (pour que la prairie autour s'y raccorde), la taille des régions. Pas énumérable : le terrain
  // garde sa forme.
  Object.defineProperty(terrain, 'MONDE', {
    value: { graine, cle: graine, cadre, ferme: { sommets: tf.SOMMETS, teintes: tf.TEINTES }, taille: MONDE.REGION },
  });
  return { get carte() { return carte(); }, terrain, get plan() { return plan(); } };
}

// La place de la malle de la calèche dans la ferme `f` (sa carte) et son terrain `tf` (fw : sa largeur) : trois cases
// d'herbe libre côte à côte (« # » ou « + » : pas sous un rocher, un arbre, un buisson ; sans herbe haute), le long du
// chemin (les trois cases juste devant, ou juste derrière, sont du chemin : leurs coins, tf.SOMMETS, 1 le chemin, 2
// l'eau), la plus proche de sa sortie à l'est (à MALLE.RAYON cases au plus ; MALLE.PRES cases au moins du bord) ;
// au nord du chemin de préférence (elle lui fait face : MALLE.SUD de plus pour le sud).
// → { cases: [[c, r]…] } (en cases de la ferme), ou null (pas de place).
export const MALLE = { PRES: 4, RAYON: 30, SUD: 4 };
export function placeMalle(f, tf, fw) {
  const passages = f.layers.find((l) => l.name === 'passages');
  const passage = passages && (passages.objects || []).find((o) => o.name === 'vers_la_transition');
  if (!passage || !tf.SOMMETS) return null;
  const sortie = Math.round(passage.y / MONDE.T) + 1, H = tf.LIGNES.length, V = fw + 1;
  const libre = (c, r) => r >= 1 && r < H - 1 && c >= 1 && c < fw - 1 && (tf.LIGNES[r][c] === '#' || tf.LIGNES[r][c] === '+') && !(tf.HERBES && tf.HERBES[r * fw + c]);
  const coin = (x, y) => tf.SOMMETS[y * V + x];
  const chemin = (c, r) => {
    if (r < 0 || r >= H || c < 0 || c >= fw) return false;
    const k = [coin(c, r), coin(c + 1, r), coin(c, r + 1), coin(c + 1, r + 1)];
    return k.includes(1) && !k.includes(2);
  };
  let best = null;
  for (let r = Math.max(1, sortie - MALLE.RAYON); r <= Math.min(H - 2, sortie + MALLE.RAYON); r++) {
    for (let c = fw - MALLE.PRES; c >= fw - MALLE.RAYON; c--) {
      const trois = [c - 2, c - 1, c];
      if (!trois.every((x) => libre(x, r))) continue;
      const nord = trois.every((x) => chemin(x, r + 1)), sud = !nord && trois.every((x) => chemin(x, r - 1));
      if (!nord && !sud) continue;
      const cout = (fw - 1 - c) + Math.abs(r - sortie) + (sud ? MALLE.SUD : 0);
      if (!best || cout < best.cout) best = { cout, cases: trois.map((x) => [x, r]) };
    }
  }
  return best ? { cases: best.cases } : null;
}
