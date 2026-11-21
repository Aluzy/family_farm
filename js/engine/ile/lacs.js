/* ==========================================================================
   Les lacs (docs/ile-300.md, étape 4) : les creux naturels du relief (Priority-Flood), puis les lacs dessinés.
   Une partie de l'île de 300 × 300 (js/engine/ile.js, docs/ile-300.md).
   ========================================================================== */

import { distanceAux, FileDesPlusBasses, groupesDe, limiterLaPente, relieesA, voisinesDe } from './grille.js';
import { bruit2D, entre, fbm, hacher, prng } from './hasard.js';
import { REGLAGES } from './reglages.js';

// Le remplissage des creux (Priority-Flood, Barnes et al. 2014) : la hauteur qu'aurait l'eau de pluie si elle
// remplissait chaque creux jusqu'à son point de débordement. L'eau part de la mer et monte vers l'intérieur, toujours
// par la case la plus basse.
function remplirLesCreux(ch) {
  const n = ch.n;
  const plein = new Float32Array(n * n);
  const vue = new Uint8Array(n * n);
  const file = new FileDesPlusBasses(n * n);
  for (let i = 0; i < n * n; i++) {
    if (ch.terre[i]) continue;
    vue[i] = 1;
    file.ajouter(i, 0);
  }
  while (file.longueur) {
    const i = file.retirer();
    for (const j of voisinesDe(i, n)) {
      if (j < 0 || vue[j]) continue;
      vue[j] = 1;
      plein[j] = Math.max(ch.hauteur[j], plein[i]);
      file.ajouter(j, plein[j]);
    }
  }
  return plein;
}

// Les creux naturels du relief assez profonds pour garder l'eau : leurs cases (l'eau y sera mise au niveau de la rive
// la plus basse, jamais plus haut).
function creuxNaturels(ch, L) {
  const n = ch.n;
  const plein = remplirLesCreux(ch);
  const masque = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) if (ch.terre[i] && plein[i] - ch.hauteur[i] > L.CREUX.profondeur) masque[i] = 1;
  return groupesDe(masque, n).map((cases) => ({ cases }));
}

// La distance déformée d'une case au centre d'un lac dessiné (sous le rayon : dans le lac).
function distanceDeformee(x, y, c, f) {
  const px = x - c.x + f.deformation * (fbm(x / f.echelle, y / f.echelle, f.g, 3) - 0.5) * 2;
  const py = y - c.y + f.deformation * (fbm(x / f.echelle, y / f.echelle, f.g ^ 0x5bd1e995, 3) - 0.5) * 2;
  const u = (px * f.cos + py * f.sin) / f.long;
  const v = (py * f.cos - px * f.sin) * f.long;
  return Math.hypot(u, v);
}

// La forme d'un lac dessiné : une ellipse (tournée, étirée) dont le bord est déformé par un bruit ; les cases dont la
// distance déformée au centre est sous le rayon, d'un seul tenant avec le centre, sans île au milieu.
function formeDuLac(ch, c, rayon, alea, F) {
  const n = ch.n;
  const angle = alea() * Math.PI;
  const f = {
    long: 1 + F.allongement * alea(),
    cos: Math.cos(angle),
    sin: Math.sin(angle),
    g: hacher(`${ch.graine}/lac/${c.x}/${c.y}`),
    echelle: rayon * F.echelle,
    deformation: rayon * F.deformation,
  };
  const boite = Math.ceil(rayon * (f.long + F.deformation) + 2);
  const masque = new Uint8Array(n * n);
  for (let y = Math.max(1, c.y - boite); y <= Math.min(n - 2, c.y + boite); y++) {
    for (let x = Math.max(1, c.x - boite); x <= Math.min(n - 2, c.x + boite); x++) {
      if (distanceDeformee(x, y, c, f) < rayon) masque[y * n + x] = 1;
    }
  }
  if (!masque[c.y * n + c.x]) return null;
  // le morceau qui porte le centre, puis ses trous comblés (pas d'île dans un lac : tout reste à portée de pied)
  const lac = relieesA(masque, n, [c.y * n + c.x]);
  const dehors = relieesA(
    lac.map((v) => 1 - v),
    n,
    [0],
  );
  const cases = [];
  for (let i = 0; i < n * n; i++) if (!dehors[i]) cases.push(i);
  return cases;
}

// Le niveau de l'eau d'un lac : la plus basse des cases de terre qui le bordent (l'eau n'est jamais plus haute que
// sa rive). Les cases du lac plus hautes sont creusées, les plus basses remplies : la surface est plate.
function niveauDuLac(ch, cases, lac) {
  let niveau = Infinity;
  for (const i of cases) {
    for (const j of voisinesDe(i, ch.n)) if (j >= 0 && !lac[j] && ch.terre[j]) niveau = Math.min(niveau, ch.hauteur[j]);
  }
  return niveau;
}

// Les fonds possibles d'un lac dessiné, du plus bas au plus haut : une case sur trois, loin du rivage et du point
// d'apparition ; un peu de bruit dans la note, pour varier les vallées.
function fondsPossibles(ch, L) {
  const n = ch.n;
  const { x: ax, y: ay } = REGLAGES.APPARITION;
  const g = hacher(`${ch.graine}/lacs`);
  const fonds = [];
  for (let y = 0; y < n; y += 3) {
    for (let x = 0; x < n; x += 3) {
      const i = y * n + x;
      if (ch.cote[i] < L.FOND_COTE_MIN || Math.hypot(x - ax, y - ay) < L.LOIN_DEPART + 4) continue;
      fonds.push({ i, x, y, note: ch.hauteur[i] + 0.25 * bruit2D(x / 30, y / 30, g) });
    }
  }
  return fonds.sort((a, b) => a.note - b.note);
}

// Marque autour d'un lac une marge où un autre lac ne vient pas (les lacs ne se touchent pas).
function marquerLaMarge(proche, cases, n, marge) {
  for (const i of cases) {
    const x = i % n;
    const y = (i - x) / n;
    for (let dy = -marge; dy <= marge; dy++) {
      for (let dx = -marge; dx <= marge; dx++) {
        const vx = x + dx;
        const vy = y + dy;
        if (vx >= 0 && vy >= 0 && vx < n && vy < n) proche[vy * n + vx] = 1;
      }
    }
  }
}

// Le centre (moyen) d'un groupe de cases.
function centreDe(cases, n) {
  let sx = 0;
  let sy = 0;
  for (const i of cases) {
    sx += i % n;
    sy += Math.floor(i / n);
  }
  return { x: Math.round(sx / cases.length), y: Math.round(sy / cases.length) };
}

// Le lac dessiné qui tient au fond `f` : son aire tirée, rétrécie jusqu'à trois fois s'il touche une case interdite ;
// null s'il ne tient pas (il ne sera jamais coupé).
function lacDessine(ch, f, L, alea, permis) {
  let rayon = Math.sqrt(entre(alea, L.AIRE[0], L.AIRE[1]) / Math.PI);
  for (let essai = 0; essai < 4; essai++, rayon *= 0.8) {
    const cases = formeDuLac(ch, f, rayon, alea, L.FORME);
    const bonneTaille = cases && cases.length >= L.AIRE[0] / 2 && cases.length <= L.AIRE[1];
    if (bonneTaille && permis(cases)) return cases;
  }
  return null;
}

/**
 * Les lacs, la seule eau douce de l'île (C13), en deux temps. D'abord les creux naturels du relief (le remplissage
 * des creux) qui ont la bonne taille et la bonne place : leur bord suit les courbes du relief. Puis, s'il en manque,
 * des lacs dessinés : une ellipse au bord déformé par un bruit, posée au fond d'une vallée, entière (si elle touche
 * une case interdite, elle rétrécit ou va ailleurs : un lac n'est jamais coupé droit). L'eau est plate, au niveau de
 * la rive la plus basse ; le limiteur de pente adoucit les berges. L'humidité monte autour.
 * @param {Chantier} ch
 */
export function lacs(ch) {
  const L = REGLAGES.LACS;
  const n = ch.n;
  const { x: ax, y: ay } = REGLAGES.APPARITION;
  const alea = prng(ch.graine, 'lacs');
  const voulus = entre(alea, L.NOMBRE[0], L.NOMBRE[1]);
  const lac = new Uint8Array(n * n);
  const proche = new Uint8Array(n * n);
  const interdit = (j) => {
    const x = j % n;
    const y = (j - x) / n;
    return proche[j] === 1 || ch.cote[j] < L.COTE_MIN || Math.hypot(x - ax, y - ay) < L.LOIN_DEPART;
  };
  const permis = (cases) => cases.every((i) => !interdit(i));
  const poses = [];
  const poser = (cases, origine) => {
    for (const i of cases) lac[i] = 1;
    const eau = niveauDuLac(ch, cases, lac);
    for (const i of cases) ch.hauteur[i] = eau;
    marquerLaMarge(proche, cases, n, 3);
    poses.push({ ...centreDe(cases, n), aire: cases.length, origine });
  };
  const assezLoin = (c, ecart) => poses.every((p) => Math.hypot(p.x - c.x, p.y - c.y) >= ecart);

  // 1. les creux naturels, les plus grands d'abord
  const creux = creuxNaturels(ch, L).sort((a, b) => b.cases.length - a.cases.length);
  for (const c of creux) {
    if (poses.length >= voulus) break;
    const bonneTaille = c.cases.length >= L.AIRE[0] && c.cases.length <= L.AIRE[1];
    if (bonneTaille && permis(c.cases) && assezLoin(centreDe(c.cases, n), L.ECART)) poser(c.cases, 'creux');
  }

  // 2. les lacs dessinés, au fond des vallées ; un tour avec l'écart voulu, puis d'autres, l'écart réduit de moitié
  const fonds = fondsPossibles(ch, L);
  for (const ecart of [L.ECART, L.ECART / 2, L.ECART / 4]) {
    for (const f of fonds) {
      if (poses.length >= voulus) break;
      if (interdit(f.i) || !assezLoin(f, ecart)) continue;
      const cases = lacDessine(ch, f, L, alea, permis);
      if (cases) poser(cases, 'dessin');
    }
  }
  limiterLaPente(ch.hauteur, n, REGLAGES.RELIEF.PENTE_MAX * 0.95);
  ch.lac = lac;
  ch.lacs = poses;
  // l'humidité monte autour des lacs
  const versLac = distanceAux(lac, n);
  for (let i = 0; i < n * n; i++) {
    if (!ch.terre[i] || lac[i]) continue;
    ch.humidite[i] = Math.min(1, ch.humidite[i] + L.BERGE.humidite * 0.5 ** (versLac[i] / L.BERGE.portee));
  }
}
