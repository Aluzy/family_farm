/* ==========================================================================
   La sauvegarde de l'île (docs/ile-300.md, étape 6) : l'île entière (au coucher), ou seulement les régions
   changées depuis la dernière fois (pendant le jeu : une écriture courte, sous 2 ms) ; et l'île relue.
   Une partie de l'île de 300 × 300 (js/engine/ile.js, docs/ile-300.md).

   Le format : un objet JSON. Chaque tableau de l'île (le sol, la hauteur, les objets, leur état) est codé par
   plages (une valeur et combien de fois elle se répète : la mer, les sols, les cases vides se répètent beaucoup),
   puis en base 64 ; les objets (16 bits) en deux plans d'octets. La table des numéros du catalogue est gardée
   (une espèce ajoutée par une mise à jour ne décale rien : renumerotation). Synchrone, sans dépendance : la page
   et Node ont btoa et atob.
   ========================================================================== */

import { catalogue, renumerotation, tableDesNumeros } from './catalogue.js';
import { ILE, REGLAGES } from './reglages.js';
import { deduireDesObjets, REGIONS } from './vie.js';

const FORMAT = 'ile-300';
const VERSION = REGLAGES.VIE.SAUVEGARDE;
const N = ILE.TAILLE;
const R = ILE.REGION;
const PAR_COTE = Math.ceil(N / R);

/* ---------- le codage ---------- */

// Des octets en base 64 (par morceaux : String.fromCharCode n'accepte pas des centaines de milliers d'arguments).
function versBase64(octets) {
  let texte = '';
  for (let k = 0; k < octets.length; k += 0x8000) texte += String.fromCharCode(...octets.subarray(k, k + 0x8000));
  return btoa(texte);
}

function depuisBase64(texte) {
  const brut = atob(texte);
  const octets = new Uint8Array(brut.length);
  for (let k = 0; k < brut.length; k++) octets[k] = brut.charCodeAt(k);
  return octets;
}

/**
 * Code des octets par plages (valeur, longueur jusqu'à 255), puis en base 64.
 * @param {Uint8Array} octets
 * @returns {string}
 */
export function coder(octets) {
  const sortie = new Uint8Array(octets.length * 2 + 2);
  let k = 0;
  for (let i = 0; i < octets.length;) {
    const v = octets[i];
    let longueur = 1;
    while (i + longueur < octets.length && octets[i + longueur] === v && longueur < 255) longueur++;
    sortie[k++] = v;
    sortie[k++] = longueur;
    i += longueur;
  }
  return versBase64(sortie.subarray(0, k));
}

/**
 * Le contraire de coder : `longueur` octets.
 * @param {string} texte
 * @param {number} longueur
 * @returns {Uint8Array}
 */
export function decoder(texte, longueur) {
  const plages = depuisBase64(texte);
  const octets = new Uint8Array(longueur);
  let i = 0;
  for (let k = 0; k + 1 < plages.length; k += 2) {
    if (i + plages[k + 1] > longueur) throw new Error('sauvegarde de l’île : un tableau trop long');
    octets.fill(plages[k], i, i + plages[k + 1]);
    i += plages[k + 1];
  }
  if (i !== longueur) throw new Error('sauvegarde de l’île : un tableau trop court');
  return octets;
}

// Les quatre tableaux de l'île (ou d'un morceau), codés.
function coderTableaux({ sol, hauteur, objet, etat }) {
  const bas = new Uint8Array(objet.length);
  const haut = new Uint8Array(objet.length);
  for (let i = 0; i < objet.length; i++) {
    bas[i] = objet[i] & 0xff;
    haut[i] = objet[i] >> 8;
  }
  return { sol: coder(sol), hauteur: coder(hauteur), objetBas: coder(bas), objetHaut: coder(haut), etat: coder(etat) };
}

function decoderTableaux(s, longueur) {
  const bas = decoder(s.objetBas, longueur);
  const haut = decoder(s.objetHaut, longueur);
  const objet = new Uint16Array(longueur);
  for (let i = 0; i < longueur; i++) objet[i] = bas[i] | (haut[i] << 8);
  return {
    sol: decoder(s.sol, longueur),
    hauteur: decoder(s.hauteur, longueur),
    objet,
    etat: decoder(s.etat, longueur),
  };
}

/* ---------- l'île entière ---------- */

/**
 * L'île entière, prête à écrire (au coucher). Les régions à sauver sont vidées.
 * @param {import('./vie.js').Ile} ile
 * @returns {object}
 */
export function versSauvegarde(ile, cat = catalogue()) {
  ile.aSauver.clear();
  return {
    format: FORMAT,
    version: VERSION,
    graine: ile.graine,
    taille: ile.n,
    apparition: { ...ile.apparition },
    table: tableDesNumeros(cat),
    repousse: ile.repousse.map((r) => [r.i, r.numero, r.jour]),
    ...coderTableaux(ile),
  };
}

/**
 * L'île relue d'une sauvegarde (entière, éventuellement complétée de régions : fusionnerRegions). Les numéros du
 * catalogue sont retrouvés par leur nom ; une espèce qui n'existe plus disparaît. Lève une erreur si la sauvegarde
 * n'est pas une île de ce format.
 * @param {object} s
 * @returns {import('./vie.js').Ile}
 */
export function depuisSauvegarde(s, cat = catalogue()) {
  if (s?.format !== FORMAT || s.version !== VERSION || s.taille !== N) {
    throw new Error(`sauvegarde de l’île : format inconnu (${s?.format} ${s?.version}, ${s?.taille} cases de côté)`);
  }
  const t = decoderTableaux(s, N * N);
  const nouveau = renumerotation(s.table, cat);
  for (let i = 0; i < N * N; i++) t.objet[i] = nouveau[t.objet[i]] ?? 0;
  const ile = {
    graine: s.graine,
    n: N,
    apparition: { ...s.apparition },
    ...t,
    repousse: s.repousse
      .map(([i, numero, jour]) => ({ i, numero: nouveau[numero] ?? 0, jour }))
      .filter((r) => r.numero),
    modifiees: new Set(),
    aSauver: new Set(),
  };
  deduireDesObjets(ile, cat);
  return ile;
}

/* ---------- les régions changées ---------- */

// Les cases d'une région (dans l'ordre des lignes).
function casesDeLaRegion(r) {
  const x0 = (r % PAR_COTE) * R;
  const y0 = Math.floor(r / PAR_COTE) * R;
  const cases = [];
  for (let y = y0; y < Math.min(N, y0 + R); y++) for (let x = x0; x < Math.min(N, x0 + R); x++) cases.push(y * N + x);
  return cases;
}

/**
 * Les régions changées depuis la dernière sauvegarde, prêtes à écrire (pendant le jeu) ; puis elles sont vidées.
 * Avec la repousse (toute : elle est courte) et la table des numéros.
 * @param {import('./vie.js').Ile} ile
 * @returns {{ format: string, version: number, table: string[], repousse: number[][], regions: object[] }}
 */
export function versSauvegardeRegions(ile, cat = catalogue()) {
  const regions = [...ile.aSauver]
    .sort((a, b) => a - b)
    .map((r) => {
      const cases = casesDeLaRegion(r);
      const morceau = {
        sol: Uint8Array.from(cases, (i) => ile.sol[i]),
        hauteur: Uint8Array.from(cases, (i) => ile.hauteur[i]),
        objet: Uint16Array.from(cases, (i) => ile.objet[i]),
        etat: Uint8Array.from(cases, (i) => ile.etat[i]),
      };
      return { r, ...coderTableaux(morceau) };
    });
  ile.aSauver.clear();
  return {
    format: FORMAT,
    version: VERSION,
    table: tableDesNumeros(cat),
    repousse: ile.repousse.map((x) => [x.i, x.numero, x.jour]),
    regions,
  };
}

/**
 * Une sauvegarde entière, complétée des régions changées depuis (dans l'ordre où elles ont été écrites) : une
 * sauvegarde entière à jour. Les numéros des régions sont ramenés à la table de la sauvegarde entière.
 * @param {object} entiere   versSauvegarde
 * @param {object[]} partielles   versSauvegardeRegions, de la plus ancienne à la plus récente
 * @returns {object}
 */
export function fusionnerRegions(entiere, partielles) {
  if (!partielles.length) return entiere;
  const t = decoderTableaux(entiere, N * N);
  let repousse = entiere.repousse;
  const versEntiere = new Map(entiere.table.map((id, k) => [id, k]));
  const table = [...entiere.table];
  for (const p of partielles) {
    if (p.format !== FORMAT || p.version !== VERSION) throw new Error('sauvegarde de l’île : région d’un autre format');
    // un numéro de la partielle → celui de la table de l'entière (une espèce nouvelle s'y ajoute)
    const numero = p.table.map((id) => {
      if (!versEntiere.has(id)) {
        versEntiere.set(id, table.length);
        table.push(id);
      }
      return versEntiere.get(id);
    });
    for (const region of p.regions) {
      const cases = casesDeLaRegion(region.r);
      const m = decoderTableaux(region, cases.length);
      cases.forEach((i, k) => {
        t.sol[i] = m.sol[k];
        t.hauteur[i] = m.hauteur[k];
        t.objet[i] = numero[m.objet[k]] ?? 0;
        t.etat[i] = m.etat[k];
      });
    }
    repousse = p.repousse.map(([i, n, jour]) => [i, numero[n] ?? 0, jour]);
  }
  return { ...entiere, table, repousse, ...coderTableaux(t) };
}

/** Le nombre de régions (pour les tests). */
export const NOMBRE_DE_REGIONS = REGIONS;
