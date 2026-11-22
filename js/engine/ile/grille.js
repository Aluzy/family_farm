/* ==========================================================================
   Les outils de la grille de l'île : les voisines, les cases reliées, les groupes, la distance (chanfrein 3-4),
   les flous, la part de terre autour, le limiteur de pente, la file de priorité, les seuils.
   Une partie de l'île de 300 × 300 (js/engine/ile.js, docs/ile-300.md).
   ========================================================================== */

// Les quatre voisines d'une case (dx, dy).
const VOISINES_4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// Les quatre voisines d'une case, ou -1 hors de la carte.
export function voisinesDe(i, n) {
  const x = i % n;
  return [x > 0 ? i - 1 : -1, x < n - 1 ? i + 1 : -1, i >= n ? i - n : -1, i < n * n - n ? i + n : -1];
}

// Les cases de `masque` (valeur 1) reliées à `depart` par leurs côtés ; renvoie un masque des cases atteintes.
export function relieesA(masque, n, departs) {
  const atteintes = new Uint8Array(n * n);
  const file = new Int32Array(n * n);
  let fin = 0;
  for (const i of departs) {
    if (masque[i] && !atteintes[i]) {
      atteintes[i] = 1;
      file[fin++] = i;
    }
  }
  for (let debut = 0; debut < fin; debut++) {
    const i = file[debut];
    const x = i % n;
    const y = (i - x) / n;
    for (const [dx, dy] of VOISINES_4) {
      const vx = x + dx;
      const vy = y + dy;
      if (vx < 0 || vy < 0 || vx >= n || vy >= n) continue;
      const j = vy * n + vx;
      if (masque[j] && !atteintes[j]) {
        atteintes[j] = 1;
        file[fin++] = j;
      }
    }
  }
  return atteintes;
}

// Les groupes de cases d'un masque reliées par leurs côtés.
export function groupesDe(masque, n) {
  const vue = new Uint8Array(n * n);
  const groupes = [];
  for (let d = 0; d < n * n; d++) {
    if (!masque[d] || vue[d]) continue;
    const groupe = [d];
    vue[d] = 1;
    for (let k = 0; k < groupe.length; k++) {
      for (const j of voisinesDe(groupe[k], n)) {
        if (j >= 0 && masque[j] && !vue[j]) {
          vue[j] = 1;
          groupe.push(j);
        }
      }
    }
    groupes.push(groupe);
  }
  return groupes;
}

// La distance (cases, à peu près euclidienne : le chanfrein 3-4) de chaque case à la plus proche des cases sources
// (source[i] = 1). Deux passes, sans file.
export function distanceAux(source, n) {
  const LOIN = 1e9;
  const d = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) d[i] = source[i] ? 0 : LOIN;
  const passer = (x, y, vx, vy, cout) => {
    if (vx < 0 || vy < 0 || vx >= n || vy >= n) return;
    const v = d[vy * n + vx] + cout;
    if (v < d[y * n + x]) d[y * n + x] = v;
  };
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      passer(x, y, x - 1, y, 3);
      passer(x, y, x - 1, y - 1, 4);
      passer(x, y, x, y - 1, 3);
      passer(x, y, x + 1, y - 1, 4);
    }
  }
  for (let y = n - 1; y >= 0; y--) {
    for (let x = n - 1; x >= 0; x--) {
      passer(x, y, x + 1, y, 3);
      passer(x, y, x + 1, y + 1, 4);
      passer(x, y, x, y + 1, 3);
      passer(x, y, x - 1, y + 1, 4);
    }
  }
  for (let i = 0; i < n * n; i++) d[i] /= 3;
  return d;
}

// Le nombre de cases de terre parmi les huit voisines de i.
export function voisinesDeTerre(terre, n, i) {
  return (
    terre[i - n - 1] +
    terre[i - n] +
    terre[i - n + 1] +
    terre[i - 1] +
    terre[i + 1] +
    terre[i + n - 1] +
    terre[i + n] +
    terre[i + n + 1]
  );
}

// La moyenne des 3 × 3 cases autour de i (la mer compte pour 0 : le rivage reste bas).
function moyenneAutour(valeurs, terre, n, i) {
  let somme = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const j = i + dy * n + dx;
      if (terre[j]) somme += valeurs[j];
    }
  }
  return somme / 9;
}

// Une passe de flou sur la terre seule.
export function flouterTerre(valeurs, terre, n) {
  const avant = valeurs.slice();
  for (let y = 1; y < n - 1; y++) {
    for (let x = 1; x < n - 1; x++) {
      const i = y * n + x;
      if (terre[i]) valeurs[i] = moyenneAutour(avant, terre, n, i);
    }
  }
}

// La part de terre dans le carré de (2r + 1) cases autour de chaque case (une image intégrale : le même coût quel
// que soit r). Lisse, sans les arêtes d'une distance : elle sert à éloigner le relief du rivage.
export function partDeTerreAutour(terre, n, r) {
  const integrale = new Float64Array((n + 1) * (n + 1));
  for (let y = 0; y < n; y++) {
    let ligne = 0;
    for (let x = 0; x < n; x++) {
      ligne += terre[y * n + x];
      integrale[(y + 1) * (n + 1) + x + 1] = integrale[y * (n + 1) + x + 1] + ligne;
    }
  }
  const part = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(n, y + r + 1);
    for (let x = 0; x < n; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(n, x + r + 1);
      const somme =
        integrale[y1 * (n + 1) + x1] -
        integrale[y0 * (n + 1) + x1] -
        integrale[y1 * (n + 1) + x0] +
        integrale[y0 * (n + 1) + x0];
      part[y * n + x] = somme / ((2 * r + 1) * (2 * r + 1));
    }
  }
  return part;
}

// Le limiteur de pente : abaisse ce qui est trop raide pour qu'entre deux cases voisines, l'écart ne dépasse jamais
// `pente` (√2 × pente en diagonale), mer comprise (pas de falaise au rivage). Seuls les sommets et les bords trop
// vifs baissent ; une pente douce ne bouge pas. Deux passes, comme une distance (h[i] ≤ h[j] + pente × d(i, j)).
export function limiterLaPente(h, n, pente) {
  const diagonale = pente * Math.SQRT2;
  const abaisser = (i, vx, vy, cout) => {
    if (vx < 0 || vy < 0 || vx >= n || vy >= n) return;
    const v = h[vy * n + vx] + cout;
    if (v < h[i]) h[i] = v;
  };
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      abaisser(i, x - 1, y, pente);
      abaisser(i, x - 1, y - 1, diagonale);
      abaisser(i, x, y - 1, pente);
      abaisser(i, x + 1, y - 1, diagonale);
    }
  }
  for (let y = n - 1; y >= 0; y--) {
    for (let x = n - 1; x >= 0; x--) {
      const i = y * n + x;
      abaisser(i, x + 1, y, pente);
      abaisser(i, x + 1, y + 1, diagonale);
      abaisser(i, x, y + 1, pente);
      abaisser(i, x - 1, y + 1, diagonale);
    }
  }
}

// Une file de priorité (un tas binaire) de cases, la plus basse d'abord.
export class FileDesPlusBasses {
  constructor(taille) {
    this.cases = new Int32Array(taille);
    this.cles = new Float32Array(taille);
    this.longueur = 0;
  }

  ajouter(i, cle) {
    let k = this.longueur++;
    while (k > 0) {
      const parent = (k - 1) >> 1;
      if (this.cles[parent] <= cle) break;
      this.cases[k] = this.cases[parent];
      this.cles[k] = this.cles[parent];
      k = parent;
    }
    this.cases[k] = i;
    this.cles[k] = cle;
  }

  retirer() {
    const sortie = this.cases[0];
    const dernier = --this.longueur;
    const i = this.cases[dernier];
    const cle = this.cles[dernier];
    let k = 0;
    for (;;) {
      let enfant = 2 * k + 1;
      if (enfant >= dernier) break;
      if (enfant + 1 < dernier && this.cles[enfant + 1] < this.cles[enfant]) enfant++;
      if (this.cles[enfant] >= cle) break;
      this.cases[k] = this.cases[enfant];
      this.cles[k] = this.cles[enfant];
      k = enfant;
    }
    this.cases[k] = i;
    this.cles[k] = cle;
    return sortie;
  }
}

// Le seuil sous lequel tombe la part `part` des valeurs (0,2 : les 20 % les plus bas).
export function seuilDeLaPart(valeurs, part) {
  if (!valeurs.length) return Infinity;
  const triees = Float32Array.from(valeurs).sort();
  return triees[Math.min(triees.length - 1, Math.max(0, Math.floor(part * triees.length)))];
}
