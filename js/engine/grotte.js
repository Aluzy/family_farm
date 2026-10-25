import { DATA } from './catalog.js';

/* ---------- les grottes : la mine de la ferme et celles de la montagne (fiche 6b) ----------

   Un niveau de grotte est tiré au hasard d'après sa graine (le même toute la journée) : des murs
   semés, lissés par un automate cellulaire, la plus grande salle gardée, l'échelle (on arrive d'en
   haut) contre un mur, le puits (on descend) le plus loin possible, le minerai dans les murs qui
   bordent le sol. La scène (js/grotte.js, GrotteScene) le dessine et y fait marcher le personnage ;
   le tirage est ici, dans le moteur, pour qu'il soit le même partout (la page, les tests).

   Deux sortes de grottes, une seule scène :
     - la mine de la ferme (l'entrée « ferme », sous le tas de terre de la ferme générée) : réglée
       par data/grotte.json (GROTTE), sa graine « ferme:<niveau>:<jour> » ;
     - les grottes de la montagne du grand monde (les entrées du plan, lieux.grottes : « grotte_1 »…,
       js/engine/monde-gen.js) : GROTTE.MONDE en plus (moins de niveaux, plus de minerai, l'or et le
       platine plus tôt, des pierres : quartz, améthyste), un filon propre à chaque entrée, tiré de
       la graine du monde et de l'entrée ; leur graine « <monde>:<entrée>:<niveau>:<jour> ».
   La mine de la ferme ne change pas : sa graine et ses réglages sont ceux d'avant. */

// Les minerais (l'objet minerai_<sorte>) et les pierres (l'objet lui-même) qui se piochent dans un mur.
export const MINERAIS_GROTTE = ['fer', 'cuivre', 'or', 'platine'];
export const PIERRES_GROTTE = ['quartz', 'amethyste'];

// L'identifiant d'une grotte du grand monde (l'entrée du plan : « grotte_<n> »), ou null.
export function idGrotteMonde(id) {
  const m = /^grotte_(\d{1,2})$/.exec(String(id || ''));
  return m && Number(m[1]) >= 1 ? m[0] : null;
}

// Un nombre de 32 bits tiré d'un texte (FNV-1a), le même que le tirage des niveaux.
function hacheTexte(t) {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Les réglages d'une grotte : `id` (« ferme », ou l'entrée d'une grotte du monde), `monde` (la
// graine du monde de la partie, pour une grotte du monde). → { id, monde, nom, filon, LARGEUR,
// HAUTEUR, NIVEAUX, MURS, PASSES, MINERAI, MINERAI_NIVEAU, POIDS, COUPS, COUP } ; la mine de la
// ferme : GROTTE tel quel (nom « La mine », pas de filon).
export function reglagesGrotte(id, monde = '') {
  const G = DATA.GROTTE;
  const base = { id: 'ferme', monde: '', nom: 'La mine', filon: null, ...G };
  delete base.MONDE;
  const ent = idGrotteMonde(id);
  if (!ent || !G.MONDE) return base;
  const M = G.MONDE, filons = Object.keys(M.FILONS || {});
  // (le filon de l'entrée : le même pour une même partie, une autre entrée en a souvent un autre)
  const filon = filons.length ? filons[hacheTexte(`${monde}:${ent}:filon`) % filons.length] : null;
  const POIDS = {};
  for (const [sorte, p] of Object.entries(M.POIDS)) POIDS[sorte] = { ...p, FOIS: sorte === filon ? M.FILONS[filon] : 1 };
  return {
    ...base, id: ent, monde: String(monde), nom: M.NOM, filon,
    NIVEAUX: M.NIVEAUX, MINERAI: M.MINERAI, MINERAI_NIVEAU: M.MINERAI_NIVEAU, POIDS,
  };
}

// Le poids de chaque sorte (minerai ou pierre) au niveau n : FIXE partout, sinon
// max(0, (n − DEPUIS) × PENTE) ; × FOIS (le filon d'une grotte du monde). { fer: 1, cuivre: … }.
export function poidsGrotte(J, n) {
  const out = {};
  for (const [sorte, p] of Object.entries(J.POIDS)) out[sorte] = ('FIXE' in p ? p.FIXE : Math.max(0, (n - p.DEPUIS) * p.PENTE)) * (p.FOIS || 1);
  return out;
}

// La graine d'un niveau : la mine de la ferme, « ferme:<niveau>:<jour> » (comme avant) ; une grotte
// du monde, la graine du monde devant.
export function graineNiveau(J, niveau, jour) {
  return J.monde ? `${J.monde}:${J.id}:${niveau}:${jour}` : `${J.id}:${niveau}:${jour}`;
}

// Le niveau `niveau` de la grotte réglée par J (reglagesGrotte), le jour `jour` : { W, H, g
// (Uint8Array : 1 un mur, 0 le sol), sol(x, y), echelle { x, y }, puits { x, y } ou null (le
// dernier niveau), ores [{ x, y, kind }] (dans les murs : un minerai, ou une pierre), decor [{ x, y,
// kind : 'champignon' | 'cristal' }], stalag [{ x, y, v }] }. Le même pour la même graine.
export function genererNiveau(J, niveau, jour) {
  const graine = graineNiveau(J, niveau, jour);
  const W = J.LARGEUR, H = J.HAUTEUR;
  let a = hacheTexte(graine);
  const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const idx = (x, y) => y * W + x;
  let g, salle;
  for (let essai = 0; essai < 8; essai++) {
    g = new Uint8Array(W * H);                       // 1 : mur, 0 : sol
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[idx(x, y)] = x < 2 || y < 2 || x >= W - 2 || y >= H - 2 || rnd() < J.MURS ? 1 : 0;
    for (let p = 0; p < J.PASSES; p++) {
      const n = new Uint8Array(g);
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        let k = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) k += g[idx(x + dx, y + dy)];
        n[idx(x, y)] = k >= 5 ? 1 : k <= 3 ? 0 : g[idx(x, y)];
      }
      for (let x = 0; x < W; x++) { n[idx(x, 0)] = n[idx(x, 1)] = n[idx(x, H - 1)] = n[idx(x, H - 2)] = 1; }
      for (let y = 0; y < H; y++) { n[idx(0, y)] = n[idx(1, y)] = n[idx(W - 1, y)] = n[idx(W - 2, y)] = 1; }
      g = n;
    }
    // la plus grande salle (4-voisins) ; les autres sont rebouchées
    const zone = new Int32Array(W * H).fill(-1);
    let best = null;
    for (let i = 0; i < W * H; i++) {
      if (g[i] || zone[i] >= 0) continue;
      const q = [i];
      zone[i] = i;
      for (let k = 0; k < q.length; k++) {
        const c = q[k], cx = c % W, cy = (c - cx) / W;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = idx(cx + dx, cy + dy);
          if (!g[n] && zone[n] < 0) { zone[n] = i; q.push(n); }
        }
      }
      if (!best || q.length > best.length) best = q;
    }
    if (!best) continue;
    const garde = new Set(best);
    for (let i = 0; i < W * H; i++) if (!g[i] && !garde.has(i)) g[i] = 1;
    salle = best;
    if (best.length > W * H * 0.28) break;
  }
  const sol = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !g[idx(x, y)];
  const ouvert = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].every(([dx, dy]) => sol(x + dx, y + dy));
  // l'échelle : une case de sol sous un mur, avec du sol devant (on y arrive)
  const pieds = salle.map((c) => [c % W, Math.floor(c / W)]).filter(([x, y]) => !sol(x, y - 1) && sol(x, y + 1) && sol(x - 1, y + 1) && sol(x + 1, y + 1));
  const [ex, ey] = pieds.length ? pieds[Math.floor(rnd() * pieds.length)] : [salle[0] % W, Math.floor(salle[0] / W)];
  // le puits : la case ouverte la plus loin de l'échelle
  const dist = new Int32Array(W * H).fill(-1);
  const q = [idx(ex, ey)];
  dist[q[0]] = 0;
  for (let k = 0; k < q.length; k++) {
    const c = q[k], cx = c % W, cy = (c - cx) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = idx(cx + dx, cy + dy);
      if (sol(cx + dx, cy + dy) && dist[n] < 0) { dist[n] = dist[c] + 1; q.push(n); }
    }
  }
  let px = ex, py = ey + 1, pd = -1;
  for (const c of salle) { const x = c % W, y = Math.floor(c / W); if (ouvert(x, y) && dist[c] > pd) { pd = dist[c]; px = x; py = y; } }
  // le minerai : les murs qui bordent le sol, la sorte tirée selon le niveau
  const poids = poidsGrotte(J, niveau), total = Object.values(poids).reduce((s, w) => s + w, 0);
  const ores = [], decor = [], stalag = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (g[idx(x, y)]) {
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => sol(x + dx, y + dy)) || rnd() > J.MINERAI * (1 + niveau * J.MINERAI_NIVEAU)) continue;
      let r = rnd() * total, kind = 'fer';
      for (const [k, w] of Object.entries(poids)) { if (r < w) { kind = k; break; } r -= w; }
      ores.push({ x, y, kind });
      continue;
    }
    const pres = Math.abs(x - ex) + Math.abs(y - ey) < 4 || Math.abs(x - px) + Math.abs(y - py) < 3;
    const r = rnd();
    if (pres) continue;
    if (r < 0.025 && ouvert(x, y)) stalag.push({ x, y, v: rnd() < 0.5 ? 0 : 1 });
    else if (r < 0.06) decor.push({ x, y, kind: rnd() < 0.6 ? 'champignon' : 'cristal' });
  }
  return { W, H, g, sol, echelle: { x: ex, y: ey }, puits: niveau < J.NIVEAUX ? { x: px, y: py } : null, ores, decor, stalag };
}
