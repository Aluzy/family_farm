/* ==========================================================================
   Ce qui pousse sur l'île (docs/ile-300.md, étape 5) : la végétation (vegetation), les roches (roches), et le
   minimum de chaque espèce (quotasEspeces).
   Une partie de l'île de 300 × 300 (js/engine/ile.js, docs/ile-300.md).
   ========================================================================== */

import { catalogue } from './catalogue.js';
import { distanceAux, voisinesDe } from './grille.js';
import { bruit2D, entre, hacher, prng } from './hasard.js';
import { REGLAGES, SOL, SOLS } from './reglages.js';

// Les conditions d'une case (data/ile.json ESPECES.CONDITIONS), en bits : 1 la berge d'un lac, 2 la lisière d'un
// biome, 4 les hauts de l'île.
const BERGE = 1;

const LISIERE = 2;

const HAUT = 4;

const BIT_DE_CONDITION = { partout: 0, berge: BERGE, lisiere: LISIERE, haut: HAUT };

function conditionsDesCases(ch) {
  const C = REGLAGES.ESPECES.CONDITIONS;
  const n = ch.n;
  const versLac = distanceAux(ch.lac, n);
  // le bord d'un biome de terre : une case dont une voisine est d'un autre biome de terre
  const bord = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) {
    if (!ch.terre[i] || ch.lac[i]) continue;
    for (const j of voisinesDe(i, n)) {
      if (j >= 0 && ch.terre[j] && !ch.lac[j] && ch.biome[j] !== ch.biome[i]) bord[i] = 1;
    }
  }
  const versBord = distanceAux(bord, n);
  const bits = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) {
    if (versLac[i] <= C.berge.rayon && !ch.lac[i]) bits[i] |= BERGE;
    if (versBord[i] <= C.lisiere.rayon) bits[i] |= LISIERE;
    if (ch.hauteur[i] >= C.haut.hauteur) bits[i] |= HAUT;
  }
  // combien il manque à une case pour remplir chaque condition (0 : elle la remplit), pour le repli des quotas
  const manque = {
    partout: () => 0,
    berge: (i) => Math.max(0, versLac[i] - C.berge.rayon),
    lisiere: (i) => Math.max(0, versBord[i] - C.lisiere.rayon),
    haut: (i) => Math.max(0, (C.haut.hauteur - ch.hauteur[i]) * 100),
  };
  return { bits, manque };
}

// Les listes de tirage : pour chaque sol et chaque jeu de conditions (sol × 8 + bits), les espèces qui peuvent y
// pousser (parmi celles que `garder` retient) et leur densité ; et la table « permis » (l'espèce peut-elle pousser là ?).
// `bitDe` : la condition d'une place (le repli des quotas l'ignore).
function listesDeTirage(cat, garder, bitDe = (p) => BIT_DE_CONDITION[p.condition]) {
  const cles = SOLS.length * 8;
  const listes = Array.from({ length: cles }, () => []);
  const permis = Array.from({ length: cles }, () => new Uint8Array(cat.fiches.length + 1));
  for (const f of cat.fiches) {
    if (!garder(f)) continue;
    for (const p of f.ou) {
      const s = SOL[p.sol];
      const bit = bitDe(p);
      for (let bits = 0; bits < 8; bits++) {
        if ((bits & bit) !== bit) continue;
        listes[s * 8 + bits].push({ f, densite: p.densite });
        permis[s * 8 + bits][f.numero] = 1;
      }
    }
  }
  return { listes, permis };
}

// Ce qui pousse : le terrain de la pousse, partagé par vegetation, roches et quotasEspeces.
function terrainDePousse(ch) {
  if (ch.pousse) return ch.pousse;
  const n = ch.n;
  const A = REGLAGES.APPARITION;
  const degage = new Uint8Array(n * n);
  for (let y = A.y - A.rayon - 1; y <= A.y + A.rayon + 1; y++) {
    for (let x = A.x - A.rayon - 1; x <= A.x + A.rayon + 1; x++) {
      if (Math.hypot(x - A.x, y - A.y) <= A.rayon + 1) degage[y * n + x] = 1;
    }
  }
  ch.objet = new Uint16Array(n * n);
  ch.etat = new Uint8Array(n * n);
  ch.pousse = {
    cat: catalogue(),
    ...conditionsDesCases(ch),
    occupe: new Uint8Array(n * n), // une case prise (le pied ou l'empreinte d'un bloc)
    blocs: new Uint8Array(n * n), // le pied d'un bloc
    garde: new Uint8Array(n * n), // l'écart d'un bloc : pas d'autre bloc ici
    degage,
  };
  return ch.pousse;
}

// La distance d'une case au point d'apparition.
function auDepart(i, n) {
  const x = i % n;
  return Math.hypot(x - REGLAGES.APPARITION.x, (i - x) / n - REGLAGES.APPARITION.y);
}

// Une case libre pour un pied (pas de bloc, pas d'empreinte, pas le départ dégagé).
function caseLibre(ch, P, i) {
  return ch.objet[i] === 0 && !P.occupe[i] && !P.degage[i];
}

// Un pied de l'espèce f peut-il pousser en i ? La case est libre et assez loin du départ ; un bloc a toute son
// empreinte libre sur la terre ferme, hors de l'écart d'un autre bloc, et aucun autre bloc dans son propre écart.
function peutPousser(ch, P, f, i) {
  const n = ch.n;
  if (!caseLibre(ch, P, i) || auDepart(i, n) < f.loinDuDepart) return false;
  if (!f.bloque) return true;
  const x = i % n;
  const y = (i - x) / n;
  for (const [dx, dy] of f.empreinte) {
    const vx = x + dx;
    const vy = y + dy;
    if (vx < 0 || vy < 0 || vx >= n || vy >= n) return false;
    const j = vy * n + vx;
    if (!caseLibre(ch, P, j) || P.garde[j] || !ch.terre[j] || ch.lac[j]) return false;
  }
  for (let dy = -f.ecart; dy <= f.ecart; dy++) {
    for (let dx = -f.ecart; dx <= f.ecart; dx++) {
      const vx = x + dx;
      const vy = y + dy;
      if (vx >= 0 && vy >= 0 && vx < n && vy < n && P.blocs[vy * n + vx]) return false;
    }
  }
  return true;
}

// Pose un pied de f en i, à son stade : le dernier, ou un plus jeune pour une part des cultures et des fruitiers.
function pousser(ch, P, f, i, alea) {
  const n = ch.n;
  ch.objet[i] = f.numero;
  if (P.compte) P.compte[f.numero]++;
  const jeune = f.stades > 1 && alea() < REGLAGES.POUSSE.JEUNES;
  ch.etat[i] = jeune ? entre(alea, 0, f.stades - 2) : f.stades - 1;
  P.occupe[i] = 1;
  if (!f.bloque) return;
  const x = i % n;
  const y = (i - x) / n;
  P.blocs[i] = 1;
  for (const [dx, dy] of f.empreinte) P.occupe[(y + dy) * n + x + dx] = 1;
  for (let dy = -f.ecart; dy <= f.ecart; dy++) {
    for (let dx = -f.ecart; dx <= f.ecart; dx++) {
      const vx = x + dx;
      const vy = y + dy;
      if (vx >= 0 && vy >= 0 && vx < n && vy < n) P.garde[vy * n + vx] = 1;
    }
  }
}

// Les autres pieds du bosquet de f, autour du premier (en i) : là où l'espèce peut pousser, à au plus BOSQUET.rayon
// cases (un peu plus pour un grand bosquet).
function bosquet(ch, P, f, i, permis, alea) {
  const n = ch.n;
  const voulus = entre(alea, f.groupe[0], f.groupe[1]) - 1;
  const rayon = REGLAGES.POUSSE.BOSQUET.rayon + Math.floor(voulus / 3);
  const x = i % n;
  const y = (i - x) / n;
  let poses = 0;
  for (let essai = 0; essai < voulus * 8 && poses < voulus; essai++) {
    const vx = x + entre(alea, -rayon, rayon);
    const vy = y + entre(alea, -rayon, rayon);
    if (vx < 0 || vy < 0 || vx >= n || vy >= n) continue;
    const j = vy * n + vx;
    if (permis[ch.sol[j] * 8 + P.bits[j]][f.numero] && peutPousser(ch, P, f, j)) {
      pousser(ch, P, f, j, alea);
      poses++;
    }
  }
}

// Les cases de l'île dans un ordre mêlé (Fisher-Yates) : aucun sens n'est privilégié par l'écart entre les blocs.
function ordreMele(n, alea) {
  const ordre = new Int32Array(n * n);
  for (let i = 0; i < n * n; i++) ordre[i] = i;
  for (let i = n * n - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    const t = ordre[i];
    ordre[i] = ordre[j];
    ordre[j] = t;
  }
  return ordre;
}

// Les petites plantes vont par taches (TOUFFES) : herbes, fleurs, champignons.
const EN_TOUFFES = new Set(['herbe', 'fleur', 'champignon']);

// L'espèce que tire la case i (ou null) : un nombre au hasard parcourt les densités de sa liste, celles des petites
// plantes multipliées par le bruit des touffes.
function tirerUneEspece(liste, touffe, alea) {
  const r = alea();
  let cumul = 0;
  for (const { f, densite } of liste) {
    cumul += EN_TOUFFES.has(f.famille) ? densite * touffe : densite;
    if (r < cumul) return f;
  }
  return null;
}

// Fait pousser sur toute l'île les espèces que `garder` retient, d'après leurs densités.
function fairePousser(ch, etape, garder) {
  const n = ch.n;
  const P = terrainDePousse(ch);
  const T = REGLAGES.POUSSE.TOUFFES;
  const alea = prng(ch.graine, etape);
  const g = hacher(`${ch.graine}/${etape}/touffes`);
  const { listes, permis } = listesDeTirage(P.cat, garder);
  for (const i of ordreMele(n, alea)) {
    const liste = listes[ch.sol[i] * 8 + P.bits[i]];
    if (!liste.length || !caseLibre(ch, P, i)) continue;
    const x = i % n;
    const touffe = T.min + (T.max - T.min) * bruit2D(x / T.pas, (i - x) / n / T.pas, g);
    const f = tirerUneEspece(liste, touffe, alea);
    if (!f || !peutPousser(ch, P, f, i)) continue;
    pousser(ch, P, f, i, alea);
    if (f.groupe[1] > 1) bosquet(ch, P, f, i, permis, alea);
  }
}

/**
 * La végétation : chaque case tire au plus une plante (arbres, fruitiers, buissons, fleurs, cultures sauvages,
 * herbes, champignons, décor), d'après les densités de son sol et de ses conditions ; les cultures vont par bosquets,
 * les petites plantes par touffes. La prairie du départ reste dégagée, sauf ce qu'on y ramasse en arrivant.
 * @param {Chantier} ch
 */
export function vegetation(ch) {
  fairePousser(ch, 'vegetation', (f) => f.famille !== 'roche');
  ramassageDuDepart(ch);
}

/**
 * Les roches : rochers, pierres, coquillages, gisements et cristaux (les minerais de l'ancienne montagne vont sur les
 * hauts de la lande). Elles viennent avant la végétation, qui pousse autour (sinon la forêt, déjà pleine, ne laisserait
 * plus de place à ses rochers moussus).
 * @param {Chantier} ch
 */
export function roches(ch) {
  fairePousser(ch, 'roches', (f) => f.famille === 'roche');
}

// Ce qu'on ramasse en arrivant (POUSSE.DEPART) : des pierres et du bois, autour du point d'apparition.
function ramassageDuDepart(ch) {
  const n = ch.n;
  const P = terrainDePousse(ch);
  const D = REGLAGES.POUSSE.DEPART;
  const A = REGLAGES.APPARITION;
  const alea = prng(ch.graine, 'depart');
  for (const id of ['pierres', 'bois_flotte']) {
    const f = P.cat.parId.get(id);
    let poses = 0;
    for (let essai = 0; essai < 200 && poses < D[id]; essai++) {
      const angle = alea() * 2 * Math.PI;
      const d = D.distance[0] + alea() * (D.distance[1] - D.distance[0]);
      const i = Math.round(A.y + d * Math.sin(angle)) * n + Math.round(A.x + d * Math.cos(angle));
      if (ch.objet[i] || ch.sol[i] !== SOL.herbe || i === A.y * n + A.x) continue;
      pousser(ch, P, f, i, alea);
      poses++;
    }
  }
}

/**
 * Compte les pieds de chaque espèce (le pied d'un bloc, pas son empreinte) : compte[numéro].
 * @param {Uint16Array} objet
 * @param {Catalogue} [cat]
 * @returns {Uint32Array}
 */
export function compterEspeces(objet, cat = catalogue()) {
  const compte = new Uint32Array(cat.fiches.length + 1);
  for (let i = 0; i < objet.length; i++) compte[objet[i]]++;
  return compte;
}

// Les cases où l'espèce f peut pousser, dans un ordre mêlé.
function casesPermises(ch, P, f, permis, alea) {
  const cases = [];
  for (let i = 0; i < ch.n * ch.n; i++) if (permis[ch.sol[i] * 8 + P.bits[i]][f.numero]) cases.push(i);
  for (let k = cases.length - 1; k > 0; k--) {
    const j = Math.floor(alea() * (k + 1));
    [cases[k], cases[j]] = [cases[j], cases[k]];
  }
  return cases;
}

// Fait de la place pour un pied de f en i (les quotas) : les petites plantes qui ne bloquent pas, d'une espèce bien
// au-dessus de son minimum, laissent leur case (le pied et l'empreinte de f). Jamais un bloc, ni une espèce rare.
function fairePlace(ch, P, f, i, compte) {
  const n = ch.n;
  const x = i % n;
  const y = (i - x) / n;
  const cases = f.bloque ? f.empreinte.map(([dx, dy]) => (y + dy) * n + x + dx) : [i];
  for (const j of cases) {
    const o = j >= 0 && j < n * n ? ch.objet[j] : 0;
    if (!o || P.cat.tables.bloque[o]) continue;
    const autre = P.cat.fiches[o - 1];
    if (compte[o] <= Math.max(2 * autre.min, 20)) continue;
    ch.objet[j] = 0;
    ch.etat[j] = 0;
    P.occupe[j] = 0;
    compte[o]--;
  }
}

// Les cases du repli : celles d'un sol où l'espèce pousse, même hors de sa condition (la berge, la lisière, les
// hauts), les plus proches de la remplir d'abord.
function casesDuRepli(ch, P, f) {
  const sols = new Map();
  for (const p of f.ou) {
    const s = SOL[p.sol];
    if (!sols.has(s)) sols.set(s, []);
    sols.get(s).push(P.manque[p.condition]);
  }
  const notees = [];
  for (let i = 0; i < ch.n * ch.n; i++) {
    const manques = sols.get(ch.sol[i]);
    if (manques) notees.push({ i, note: Math.min(...manques.map((m) => m(i))) });
  }
  return notees.sort((a, b) => a.note - b.note || a.i - b.i).map((c) => c.i);
}

// Plante des bosquets de f sur les cases données, jusqu'à son minimum (en faisant de la place au besoin).
function completer(ch, P, f, cases, permis, alea) {
  const compte = P.compte;
  for (let k = 0; k < Math.min(cases.length, REGLAGES.POUSSE.QUOTAS.essais) && compte[f.numero] < f.min; k++) {
    fairePlace(ch, P, f, cases[k], compte);
    if (!peutPousser(ch, P, f, cases[k])) continue;
    pousser(ch, P, f, cases[k], alea);
    if (f.groupe[1] > 1) bosquet(ch, P, f, cases[k], permis, alea);
  }
  return compte[f.numero] >= f.min;
}

/**
 * Les quotas : chaque espèce a au moins son minimum de pieds sur l'île (C4) ; il manque des pieds ? des bosquets de
 * plus, là où elle peut pousser (une espèce rare reste loin du départ), en faisant au besoin de la place parmi les
 * petites plantes les plus communes. Si sa place manque sur cette île (peu de berges, peu de hauts), le repli : son
 * sol, hors de sa condition, au plus près de la remplir.
 * @param {Chantier} ch
 */
export function quotasEspeces(ch) {
  const P = terrainDePousse(ch);
  const alea = prng(ch.graine, 'quotas');
  const { permis } = listesDeTirage(P.cat, () => true);
  // le repli pose sur un sol de l'espèce sans regarder la condition : sa table « permis » ignore les conditions
  const partout = listesDeTirage(
    P.cat,
    () => true,
    () => 0,
  ).permis;
  // les comptes, tenus à jour par pousser et fairePlace
  P.compte = compterEspeces(ch.objet, P.cat);
  for (const f of P.cat.fiches) {
    if (P.compte[f.numero] >= f.min) continue;
    if (completer(ch, P, f, casesPermises(ch, P, f, permis, alea), permis, alea)) continue;
    completer(ch, P, f, casesDuRepli(ch, P, f), partout, alea);
  }
  delete ch.pousse;
}
