/* ==========================================================================
   La forme de l'île (docs/ile-300.md, étape 3) : la terre et la mer (formeIle), le relief doux (relief),
   l'humidité (humidite).
   Une partie de l'île de 300 × 300 (js/engine/ile.js, docs/ile-300.md).
   ========================================================================== */

import { distanceAux, flouterTerre, limiterLaPente, partDeTerreAutour, relieesA, voisinesDeTerre } from './grille.js';
import { bruit2D, fbm, hacher, prng } from './hasard.js';
import { REGLAGES } from './reglages.js';

// Une passe de lissage de la côte : une case prend l'avis de la majorité de ses huit voisines (5 sur 8, sinon elle
// garde le sien). Ôte les pointes et les trous d'une case.
function lisserCote(terre, n) {
  const avant = terre.slice();
  for (let y = 1; y < n - 1; y++) {
    for (let x = 1; x < n - 1; x++) {
      const i = y * n + x;
      const voisines = voisinesDeTerre(avant, n, i);
      if (voisines >= 5) terre[i] = 1;
      else if (voisines <= 3) terre[i] = 0;
    }
  }
}

// La masse de terre d'une case (positive : la terre) : la distance au centre, déformée et dentelée, plus la bosse.
function masseDeLaCase(x, y, ctx) {
  const { F, rayon, centre, g } = ctx;
  const dx = (fbm(x / F.DEFORMATION.echelle, y / F.DEFORMATION.echelle, g.dx, 3) - 0.5) * 2 * F.DEFORMATION.force;
  const dy = (fbm(x / F.DEFORMATION.echelle, y / F.DEFORMATION.echelle, g.dy, 3) - 0.5) * 2 * F.DEFORMATION.force;
  // tournée puis étirée (l'île est plus longue dans une direction)
  const px = x + dx - centre.x;
  const py = y + dy - centre.y;
  const ux = (px * ctx.cos + py * ctx.sin) / (rayon * ctx.long);
  const uy = (py * ctx.cos - px * ctx.sin) / (rayon / ctx.long);
  const distance = Math.hypot(ux, uy) * (1 - F.CARRE) + Math.max(Math.abs(ux), Math.abs(uy)) * F.CARRE;
  const decoupe = (fbm(x / F.DECOUPE.echelle, y / F.DECOUPE.echelle, g.decoupe, F.DECOUPE.octaves) - 0.5) * 2;
  const r2 = ((x - centre.x) ** 2 + (y - centre.y) ** 2) / F.BOSSE.rayon ** 2;
  // le fondu : sur les FONDU dernières cases avant la marge, la masse descend (la côte n'est jamais coupée droit)
  const versBord = Math.min(x, y, ctx.n - 1 - x, ctx.n - 1 - y) - ctx.bord;
  const fondu = versBord < F.FONDU ? ((F.FONDU - versBord) / F.FONDU) ** 2 : 0;
  return 1 - distance + decoupe * F.DECOUPE.force + F.BOSSE.force * Math.exp(-r2) - fondu;
}

/**
 * La forme de l'île : la terre et la mer, puis la distance au rivage. La bande de BORD_MER + MARGE cases est toujours
 * de la mer ; la terre est d'un seul tenant et porte le centre ; la mer touche le bord partout.
 * @param {Chantier} ch
 */
export function formeIle(ch) {
  const F = REGLAGES.FORME;
  const n = ch.n;
  const bord = REGLAGES.BORD_MER + F.MARGE;
  const centre = { x: REGLAGES.APPARITION.x, y: REGLAGES.APPARITION.y };
  const alea = prng(ch.graine, 'forme');
  const angle = alea() * Math.PI;
  const ctx = {
    F,
    n,
    bord,
    rayon: (n / 2 - bord) * (F.TAILLE[0] + (F.TAILLE[1] - F.TAILLE[0]) * alea()),
    long: 1 + F.ALLONGEMENT * alea(),
    cos: Math.cos(angle),
    sin: Math.sin(angle),
    centre,
    g: {
      dx: hacher(`${ch.graine}/forme/dx`),
      dy: hacher(`${ch.graine}/forme/dy`),
      decoupe: hacher(`${ch.graine}/forme`),
    },
  };
  let terre = new Uint8Array(n * n);
  for (let y = bord; y < n - bord; y++) {
    for (let x = bord; x < n - bord; x++) terre[y * n + x] = masseDeLaCase(x, y, ctx) > 0 ? 1 : 0;
  }
  for (let p = 0; p < F.LISSAGE; p++) lisserCote(terre, n);
  // la bande de mer, de nouveau (le lissage ne la touche pas, mais une règle se garde au plus près)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) if (x < bord || y < bord || x >= n - bord || y >= n - bord) terre[y * n + x] = 0;
  }
  const iCentre = centre.y * n + centre.x;
  if (!terre[iCentre])
    throw new Error(`île « ${ch.graine} » : le centre n'est pas sur la terre (FORME.BOSSE trop faible)`);
  // la terre d'un seul tenant qui porte le centre
  terre = relieesA(terre, n, [iCentre]);
  // la mer qui touche le bord ; une mer enclavée devient de la terre
  const mer = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) mer[i] = terre[i] ? 0 : 1;
  const merOuverte = relieesA(mer, n, [0]);
  for (let i = 0; i < n * n; i++) terre[i] = merOuverte[i] ? 0 : 1;
  ch.terre = terre;
  // la distance au rivage : positive sur la terre (à la mer la plus proche), négative en mer (à la terre)
  const versMer = distanceAux(merOuverte, n);
  const versTerre = distanceAux(terre, n);
  ch.cote = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) ch.cote[i] = terre[i] ? versMer[i] : -versTerre[i];
}

/**
 * Le relief doux : de 0 au rivage à 1 au plus haut ; des collines et des vallées, sans falaise.
 * @param {Chantier} ch
 */
export function relief(ch) {
  const R = REGLAGES.RELIEF;
  const n = ch.n;
  const g = hacher(`${ch.graine}/relief`);
  const gRivage = hacher(`${ch.graine}/relief/rivage`);
  const etroit = partDeTerreAutour(ch.terre, n, Math.round(R.PENTE * R.RIVAGES[0]));
  const large = partDeTerreAutour(ch.terre, n, Math.round(R.PENTE * R.RIVAGES[1]));
  const h = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (!ch.terre[i]) continue;
      // loin de la mer : la part de terre autour (0,5 au rivage, 1 loin dedans), d'un rayon qui varie le long de la côte
      const m = bruit2D(x / 40, y / 40, gRivage);
      const dedans = Math.min(1, Math.max(0, ((1 - m) * etroit[i] + m * large[i] - 0.5) * 2));
      const rivage = dedans * dedans * (3 - 2 * dedans) * Math.min(1, ch.cote[i] / 3);
      const collines = fbm(x / R.COLLINES.echelle, y / R.COLLINES.echelle, g, R.COLLINES.octaves);
      h[i] = rivage * (R.PLAINES + (1 - R.PLAINES) * collines);
    }
  }
  for (let p = 0; p < R.LISSAGE; p++) flouterTerre(h, ch.terre, n);
  let max = 0;
  for (let i = 0; i < n * n; i++) if (h[i] > max) max = h[i];
  for (let i = 0; i < n * n; i++) h[i] = ch.terre[i] ? h[i] / max : 0;
  limiterLaPente(h, n, R.PENTE_MAX * 0.95);
  ch.hauteur = h;
}

/**
 * L'humidité : un bruit, et les bas plus humides que les hauts ; la mer à 1.
 * @param {Chantier} ch
 */
export function humidite(ch) {
  const H = REGLAGES.HUMIDITE;
  const n = ch.n;
  const g = hacher(`${ch.graine}/humidite`);
  const u = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (!ch.terre[i]) {
        u[i] = 1;
        continue;
      }
      const bruit = fbm(x / H.echelle, y / H.echelle, g, H.octaves);
      u[i] = (1 - H.BAS) * bruit + H.BAS * (1 - ch.hauteur[i]);
    }
  }
  // étirée sur toute l'échelle : chaque île a ses terres sèches et ses terres humides (la lande, la forêt)
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < n * n; i++) {
    if (!ch.terre[i]) continue;
    min = Math.min(min, u[i]);
    max = Math.max(max, u[i]);
  }
  for (let i = 0; i < n * n; i++) if (ch.terre[i]) u[i] = (u[i] - min) / (max - min);
  ch.humidite = u;
}
