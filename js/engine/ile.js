/* ==========================================================================
   L'île de 300 × 300 (docs/ile-300.md) : la carte entière, générée une fois en début de partie puis
   enregistrée ; le joueur la modifie partout. Moteur pur : ni la page, ni le stockage, ni l'horloge ;
   le hasard vient d'une graine. Les réglages sont dans data/ile.json (DATA.ILE).

   Les sections, dans l'ordre (docs/ile-300.md, « Le code ») :
     1. les types et les constantes ;
     2. le hasard : hacher, prng, bruit2D, fbm ;
     3. le catalogue des espèces, fait des données du jeu ;
     4. à 11. : la génération, la lecture, la modification, la vie de l'île, la sauvegarde, la scène et le
        contrôle (les étapes suivantes du chantier).

   Les performances (60 images par seconde, docs/ile-300.md) : rien ici ne tourne à chaque image ; les
   fonctions appelées dans les boucles sur les cases (bruit2D, fbm, les tables du catalogue) n'allouent rien.
   ========================================================================== */

import { mulberry32 } from './base.js';
import { DATA } from './catalog.js';

/* ---------- 1. les types et les constantes ---------- */

/**
 * Une espèce du catalogue (section 3).
 * @typedef {object} Fiche
 * @property {string} id                  son nom, unique (le nom de la plante sauvage, ou <culture>_sauvage, <arbre>_sauvage)
 * @property {number} numero              son numéro dans le tableau `objet` de l'île (1 et plus ; 0 : rien)
 * @property {string} famille             arbre, fruitier, buisson, fleur, culture, herbe, champignon ou décor
 * @property {string} genre               arbre, buisson, haute ou basse (l'occupation de la case, l'ordre de dessin)
 * @property {boolean} bloque             le pied ne se traverse pas
 * @property {{ table: string, cle: string }} source   d'où vient l'espèce dans les données du jeu
 * @property {string[]} cultures          les cultures qu'elle porte à l'état sauvage
 * @property {string[]} fleurs            les fleurs des bacs qu'elle porte à l'état sauvage
 * @property {Placement[]} ou             où elle pousse
 * @property {[number, number]} groupe    le nombre de pieds d'un bosquet [au moins, au plus]
 * @property {number} min                 le nombre de pieds garanti sur l'île
 * @property {number} loinDuDepart        en deçà de cette distance au point d'apparition (cases), elle ne pousse pas
 * @property {number} stades              le nombre de stades de pousse (1 : elle ne pousse pas)
 * @property {object} dessin              l'image : { planche: 'vegetation', sorte, variantes } | { planche: 'crops', r, c, l, h }
 *                                        | { planche: 'verger', dessin }
 * @property {object | null} recolte      ce qu'elle donne (au format de RECOLTE, monde.json), null : rien
 */

/**
 * Une place où pousse une espèce.
 * @typedef {object} Placement
 * @property {string} condition   partout, berge ou lisiere (DATA.ILE.ESPECES.CONDITIONS)
 * @property {string} biome
 * @property {string} sol
 * @property {number} densite     la part des cases de ce sol qui portent l'espèce
 */

/**
 * Le catalogue des espèces (section 3).
 * @typedef {object} Catalogue
 * @property {Fiche[]} fiches                  dans l'ordre de leur numéro (fiches[n - 1].numero === n)
 * @property {Map<string, Fiche>} parId
 * @property {{ famille: Uint8Array, genre: Uint8Array, bloque: Uint8Array, stades: Uint8Array }} tables
 *           les réglages lus en jeu, rangés par numéro (l'indice 0 : rien) : une lecture, pas de recherche
 */

const REGLAGES = DATA.ILE;

/** Les dimensions de l'île et le point d'apparition. */
export const ILE = Object.freeze({
  TAILLE: REGLAGES.TAILLE,
  CASES: REGLAGES.TAILLE * REGLAGES.TAILLE,
  BORD_MER: REGLAGES.BORD_MER,
  REGION: REGLAGES.REGION,
  APPARITION: Object.freeze({ ...REGLAGES.APPARITION }),
});

/** Les biomes, dans l'ordre de leur numéro ; BIOME[nom] → numéro. */
export const BIOMES = Object.freeze([...REGLAGES.BIOMES]);
export const BIOME = Object.freeze(Object.fromEntries(BIOMES.map((nom, i) => [nom, i])));

/** Les sols, dans l'ordre de leur numéro ; SOL[nom] → numéro ; SOL_BIOME et SOL_EAU, rangés par numéro. */
export const SOLS = Object.freeze(
  BIOMES.flatMap((biome) =>
    Object.entries(REGLAGES.SOLS[biome] ?? {}).map(([nom, r]) => Object.freeze({ nom, biome, eau: r.eau === true })),
  ),
);
export const SOL = Object.freeze(Object.fromEntries(SOLS.map((s, i) => [s.nom, i])));
export const SOL_BIOME = Uint8Array.from(SOLS, (s) => BIOME[s.biome]);
export const SOL_EAU = Uint8Array.from(SOLS, (s) => (s.eau ? 1 : 0));

/** Les genres d'une plante (monde.json VEGETATION.SORTES), dans l'ordre de leur numéro (tables.genre). */
export const GENRES = Object.freeze(['arbre', 'buisson', 'haute', 'basse']);

/* ---------- 2. le hasard ---------- */

/**
 * Un nombre de 32 bits tiré d'un texte (FNV-1a) : la même graine donne toujours le même nombre.
 * @param {string | number} texte
 * @returns {number}
 */
export function hacher(texte) {
  const s = String(texte);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Le tirage d'une étape de la génération : chaque étape a le sien, tiré de la graine de l'île et du nom de
 * l'étape. En changer une ne déplace rien dans les autres.
 * @param {string | number} graine
 * @param {string} etape
 * @returns {() => number} un nombre dans [0, 1) à chaque appel
 */
export function prng(graine, etape) {
  return mulberry32(hacher(`${graine}/${etape}`));
}

/**
 * Un entier tiré dans [min, max] (bornes comprises).
 * @param {() => number} alea
 * @param {number} min
 * @param {number} max
 */
export function entre(alea, min, max) {
  return min + Math.floor(alea() * (max - min + 1));
}

// Un nombre dans [0, 1) attaché à un point entier (x, y) et à une graine : le même point donne toujours le même.
function hasardDuPoint(x, y, graine) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ graine;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Le lissage des coins (la courbe de Perlin : nulle en pente aux bords, pas de cassure d'une maille à l'autre).
const lisser = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * Le bruit de valeur : un relief continu, dans [0, 1), des valeurs tirées aux points entiers et lissées entre
 * eux. N'alloue rien.
 * @param {number} x
 * @param {number} y
 * @param {number} graine   un entier (hacher)
 * @returns {number}
 */
export function bruit2D(x, y, graine) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const u = lisser(x - x0);
  const v = lisser(y - y0);
  const a = hasardDuPoint(x0, y0, graine);
  const b = hasardDuPoint(x0 + 1, y0, graine);
  const c = hasardDuPoint(x0, y0 + 1, graine);
  const d = hasardDuPoint(x0 + 1, y0 + 1, graine);
  const haut = a + (b - a) * u;
  const bas = c + (d - c) * u;
  return haut + (bas - haut) * v;
}

/**
 * Le bruit fractal : plusieurs octaves de bruit2D, de plus en plus fines et de moins en moins fortes, ramenées
 * dans [0, 1). N'alloue rien.
 * @param {number} x
 * @param {number} y
 * @param {number} graine        un entier (hacher)
 * @param {number} octaves
 * @param {number} persistance   la force d'une octave par rapport à la précédente (0,5 : moitié moins)
 * @param {number} lacunarite    la finesse d'une octave par rapport à la précédente (2 : deux fois plus fine)
 * @returns {number}
 */
export function fbm(x, y, graine, octaves = 4, persistance = 0.5, lacunarite = 2) {
  let somme = 0;
  let total = 0;
  let force = 1;
  let echelle = 1;
  for (let o = 0; o < octaves; o++) {
    somme += force * bruit2D(x * echelle, y * echelle, (graine + Math.imul(o + 1, 0x9e3779b9)) | 0);
    total += force;
    force *= persistance;
    echelle *= lacunarite;
  }
  return somme / total;
}

/* ---------- 3. le catalogue des espèces ---------- */

// Parcourt un bloc de placements { condition: { biome: { sol: X } } } : rappel(condition, biome, sol, X).
function parcourirPlacements(bloc, rappel) {
  for (const [condition, parBiome] of Object.entries(bloc)) {
    for (const [biome, parSol] of Object.entries(parBiome)) {
      for (const [sol, valeur] of Object.entries(parSol)) rappel(condition, biome, sol, valeur);
    }
  }
}

// Les placements de PLACEMENTS ({ … sol: { espèce: densité } }), rangés par espèce.
function placementsParEspece(placements) {
  const parEspece = new Map();
  parcourirPlacements(placements, (condition, biome, sol, especes) => {
    for (const [id, densite] of Object.entries(especes)) {
      if (!parEspece.has(id)) parEspece.set(id, []);
      parEspece.get(id).push({ condition, biome, sol, densite });
    }
  });
  return parEspece;
}

// Les placements d'une espèce seule ({ … sol: densité } : PAR_FAMILLE, EXCEPTIONS).
function placementsDUneEspece(placement) {
  const ou = [];
  parcourirPlacements(placement, (condition, biome, sol, densite) => ou.push({ condition, biome, sol, densite }));
  return ou;
}

// Une table { clé: [valeurs] } faite de paires [valeur, clé] (les liens d'une plante sauvage vers ses fleurs, ses cultures).
function grouperPar(paires) {
  const table = new Map();
  for (const [valeur, cle] of paires) {
    if (!table.has(cle)) table.set(cle, []);
    table.get(cle).push(valeur);
  }
  return table;
}

// Ce que donne une culture sauvage ou un fruitier sauvage (RECOLTES) : le produit, et une graine (ou un jeune arbre)
// par chance. Cueillie, la plante reste et repart de son premier stade.
function recolteCueillie(reglage, produit, enPlus, objets) {
  const recolte = { geste: reglage.geste, fin: { [produit]: [...reglage.fin] }, repousse: 'stades' };
  if (enPlus && enPlus !== produit && objets[enPlus]) recolte.chance = { [enPlus]: reglage.chance };
  return recolte;
}

// La famille d'une plante sauvage : CLASSEMENT, puis fleur des bacs, puis culture, puis son genre.
function familleDeSorte(sorte, classement, fleurs, cultures) {
  if (classement.has(sorte.nom)) return classement.get(sorte.nom);
  if (fleurs.length) return 'fleur';
  if (cultures.length) return 'culture';
  return sorte.genre === 'arbre' || sorte.genre === 'buisson' ? sorte.genre : 'herbe';
}

// La fiche d'une plante sauvage du monde (monde.json VEGETATION.SORTES).
function ficheDeSorte(sorte, liens, data) {
  const fleurs = liens.fleurs.get(sorte.nom) ?? [];
  const cultures = liens.cultures.get(sorte.nom) ?? [];
  return {
    id: sorte.nom,
    famille: familleDeSorte(sorte, liens.classement, fleurs, cultures),
    genre: sorte.genre,
    bloque: Array.isArray(sorte.bloque) && sorte.bloque.length > 0,
    source: { table: 'VEGETATION.SORTES', cle: sorte.nom },
    cultures,
    fleurs,
    stades: 1,
    dessin: { planche: 'vegetation', sorte: sorte.nom, variantes: sorte.variantes ?? 1 },
    recolte: data.RECOLTE.SORTES[sorte.nom] ?? null,
  };
}

// La forme sauvage d'une culture qui n'a pas encore de plante sauvage : le dessin de la culture, tous ses stades (C12).
function ficheDeCulture(cle, culture, data) {
  const { r, c, l, h } = culture.sprite;
  return {
    id: `${cle}_sauvage`,
    famille: 'culture',
    genre: 'haute',
    bloque: false,
    source: { table: 'CULTURES', cle },
    cultures: [cle],
    fleurs: [],
    stades: culture.stades,
    dessin: { planche: 'crops', r, c: [...c], l, h },
    recolte: recolteCueillie(
      data.ILE.ESPECES.RECOLTES.culture,
      culture.produit ?? cle,
      culture.graines?.item,
      data.OBJETS,
    ),
  };
}

// La forme sauvage d'un fruitier du verger : le dessin du verger, ses stades.
function ficheDeFruitier(cle, arbre, data) {
  return {
    id: `${cle}_sauvage`,
    famille: 'fruitier',
    genre: 'arbre',
    bloque: true,
    source: { table: 'VERGER.ARBRES', cle },
    cultures: [],
    fleurs: [],
    stades: data.VERGER.STADES.length,
    dessin: { planche: 'verger', dessin: arbre.dessin },
    recolte: recolteCueillie(data.ILE.ESPECES.RECOLTES.fruitier, arbre.fruit, `jeune_${cle}`, data.OBJETS),
  };
}

// Une fiche complétée de sa place, de son bosquet, de son minimum : l'exception de l'espèce, sinon ses lignes de
// PLACEMENTS, sinon le défaut de sa famille.
function completerFiche(fiche, numero, E, placements) {
  const defaut = E.PAR_FAMILLE[fiche.famille] ?? {};
  const exception = E.EXCEPTIONS[fiche.id] ?? {};
  let ou = placements.get(fiche.id) ?? [];
  if (exception.placement) ou = placementsDUneEspece(exception.placement);
  else if (!ou.length && defaut.placement) ou = placementsDUneEspece(defaut.placement);
  return {
    ...fiche,
    numero,
    ou,
    groupe: [...(exception.groupe ?? defaut.groupe ?? [1, 1])],
    min: exception.min ?? defaut.min ?? 0,
    loinDuDepart: exception.loinDuDepart ?? defaut.loinDuDepart ?? 0,
  };
}

// Les réglages lus en jeu, rangés par numéro (l'indice 0 : rien).
function tablesDuCatalogue(fiches, familles) {
  const n = fiches.length + 1;
  const tables = {
    famille: new Uint8Array(n),
    genre: new Uint8Array(n),
    bloque: new Uint8Array(n),
    stades: new Uint8Array(n),
  };
  for (const f of fiches) {
    tables.famille[f.numero] = familles.indexOf(f.famille);
    tables.genre[f.numero] = GENRES.indexOf(f.genre);
    tables.bloque[f.numero] = f.bloque ? 1 : 0;
    tables.stades[f.numero] = f.stades;
  }
  return tables;
}

/**
 * Le catalogue des espèces, construit depuis les données du jeu (docs/ile-300.md, « Le catalogue des espèces ») :
 * les plantes sauvages, puis les formes sauvages des cultures, puis celles des fruitiers, numérotées dans cet ordre.
 * Ne modifie pas les données. Lève une erreur si deux espèces ont le même nom.
 * @param {object} [data]   DATA, ou une copie (les tests)
 * @returns {Catalogue}
 */
export function construireCatalogue(data = DATA) {
  const E = data.ILE.ESPECES;
  const placements = placementsParEspece(E.PLACEMENTS);
  const liens = {
    classement: new Map(Object.entries(E.CLASSEMENT).flatMap(([famille, ids]) => ids.map((id) => [id, famille]))),
    fleurs: grouperPar(Object.entries(data.MASSIFS.DESSIN)),
    cultures: grouperPar(Object.entries(E.CULTURES_DEJA_SAUVAGES)),
  };
  const brutes = [
    ...data.VEGETATION.SORTES.map((sorte) => ficheDeSorte(sorte, liens, data)),
    ...Object.entries(data.CULTURES)
      .filter(([cle]) => !E.CULTURES_DEJA_SAUVAGES[cle])
      .map(([cle, culture]) => ficheDeCulture(cle, culture, data)),
    ...Object.entries(data.VERGER.ARBRES).map(([cle, arbre]) => ficheDeFruitier(cle, arbre, data)),
  ];
  const fiches = [];
  const parId = new Map();
  for (const brute of brutes) {
    if (parId.has(brute.id)) throw new Error(`catalogue de l'île : deux espèces s'appellent « ${brute.id} »`);
    const fiche = completerFiche(brute, fiches.length + 1, E, placements);
    fiches.push(fiche);
    parId.set(fiche.id, fiche);
  }
  return { fiches, parId, tables: tablesDuCatalogue(fiches, E.FAMILLES) };
}

let catalogueDuJeu = null;

/**
 * Le catalogue des données du jeu, construit au premier appel puis gardé.
 * @returns {Catalogue}
 */
export function catalogue() {
  if (!catalogueDuJeu) catalogueDuJeu = construireCatalogue(DATA);
  return catalogueDuJeu;
}

/**
 * La table des numéros, gardée dans la sauvegarde : table[numéro] = id (table[0] : rien). Une espèce ajoutée par une
 * mise à jour ne décale rien dans une partie en cours (renumerotation).
 * @param {Catalogue} cat
 * @returns {string[]}
 */
export function tableDesNumeros(cat) {
  return ['', ...cat.fiches.map((f) => f.id)];
}

/**
 * Le passage des numéros d'une sauvegarde à ceux du catalogue : nouveau[ancien] (0 : une espèce qui n'existe plus).
 * @param {string[]} table   la table des numéros de la sauvegarde
 * @param {Catalogue} cat
 * @returns {Uint16Array}
 */
export function renumerotation(table, cat) {
  const nouveau = new Uint16Array(table.length);
  for (let i = 1; i < table.length; i++) nouveau[i] = cat.parId.get(table[i])?.numero ?? 0;
  return nouveau;
}

// Chaque culture, fleur des bacs, fruitier et plante sauvage du jeu a sa fiche.
function erreursDeCouverture(cat, data) {
  const erreurs = [];
  const portee = (cle, liste) => cat.fiches.some((f) => f[liste].includes(cle));
  for (const cle of Object.keys(data.CULTURES)) {
    if (!portee(cle, 'cultures')) erreurs.push(`la culture « ${cle} » n'a pas de forme sauvage`);
  }
  for (const cle of Object.keys(data.BACS.FLEURS)) {
    if (!portee(cle, 'fleurs')) erreurs.push(`la fleur « ${cle} » n'a pas de plante sauvage (MASSIFS.DESSIN)`);
  }
  for (const cle of Object.keys(data.VERGER.ARBRES)) {
    if (!cat.parId.has(`${cle}_sauvage`)) erreurs.push(`le fruitier « ${cle} » n'a pas de forme sauvage`);
  }
  for (const sorte of data.VEGETATION.SORTES) {
    if (!cat.parId.has(sorte.nom)) erreurs.push(`la plante sauvage « ${sorte.nom} » n'a pas de fiche`);
  }
  return erreurs;
}

// Une place : un biome de l'île, un sol de ce biome, une condition qui existe, une densité dans ]0, 1].
function erreursDePlacement(f, p, conditions) {
  const erreurs = [];
  const sol = SOLS[SOL[p.sol]];
  if (!(p.biome in BIOME)) erreurs.push(`${f.id} : le biome « ${p.biome} » n'existe pas sur l'île`);
  else if (!sol || sol.biome !== p.biome) erreurs.push(`${f.id} : le sol « ${p.sol} » n'est pas du biome ${p.biome}`);
  if (p.condition !== 'partout' && !(p.condition in conditions)) {
    erreurs.push(`${f.id} : la condition « ${p.condition} » n'existe pas`);
  }
  if (!(p.densite > 0 && p.densite <= 1)) erreurs.push(`${f.id} : densité ${p.densite} hors de ]0, 1]`);
  return erreurs;
}

// Ce que donne une espèce : des objets du jeu.
function erreursDeRecolte(f, objets) {
  const r = f.recolte;
  if (!r) return [];
  const blocs = [r.fin, r.coup, r.chance, r.aussi?.fin, r.aussi?.chance];
  return blocs
    .flatMap((bloc) => Object.keys(bloc ?? {}))
    .filter((objet) => !objets[objet])
    .map((objet) => `${f.id} : donne « ${objet} », qui n'est pas un objet du jeu`);
}

// Une fiche : sa famille, son genre ; une espèce vivante pousse quelque part, avec un minimum ; un bosquet valide.
function erreursDeFiche(f, E) {
  const erreurs = [];
  if (!E.FAMILLES.includes(f.famille)) erreurs.push(`${f.id} : la famille « ${f.famille} » n'existe pas`);
  if (!GENRES.includes(f.genre)) erreurs.push(`${f.id} : le genre « ${f.genre} » n'existe pas`);
  const vivante = f.famille !== 'decor';
  if (vivante && !f.ou.length) erreurs.push(`${f.id} : ne pousse nulle part sur l'île`);
  if (vivante && !(f.min > 0)) erreurs.push(`${f.id} : pas de nombre de pieds garanti (min)`);
  if (!(f.groupe[0] >= 1 && f.groupe[1] >= f.groupe[0])) erreurs.push(`${f.id} : groupe invalide`);
  return erreurs;
}

// Les réglages ne nomment que des espèces et des cultures qui existent (une faute de frappe ne passe pas en silence).
function erreursDeNoms(cat, data) {
  const E = data.ILE.ESPECES;
  const nommees = new Set([
    ...placementsParEspece(E.PLACEMENTS).keys(),
    ...Object.keys(E.EXCEPTIONS),
    ...Object.values(E.CLASSEMENT).flat(),
    ...Object.values(E.CULTURES_DEJA_SAUVAGES),
  ]);
  const erreurs = [...nommees]
    .filter((id) => !cat.parId.has(id))
    .map((id) => `data/ile.json nomme « ${id} », qui n'existe pas`);
  for (const cle of Object.keys(E.CULTURES_DEJA_SAUVAGES)) {
    if (!data.CULTURES[cle]) erreurs.push(`CULTURES_DEJA_SAUVAGES : « ${cle} » n'est pas une culture`);
  }
  return erreurs;
}

/**
 * Le contrôle du catalogue : la liste de ce qui ne va pas (vide : tout va bien). Chaque culture, fleur des bacs,
 * fruitier et plante sauvage du jeu a sa fiche ; chaque espèce vivante a une place et un minimum ; chaque place
 * renvoie à un biome et à un sol de ce biome ; ce que donne une espèce existe ; les réglages ne nomment que des
 * espèces qui existent.
 * @param {Catalogue} cat
 * @param {object} [data]
 * @returns {string[]}
 */
export function verifierCatalogue(cat, data = DATA) {
  const E = data.ILE.ESPECES;
  return [
    ...erreursDeCouverture(cat, data),
    ...cat.fiches.flatMap((f) => [
      ...erreursDeFiche(f, E),
      ...f.ou.flatMap((p) => erreursDePlacement(f, p, E.CONDITIONS)),
      ...erreursDeRecolte(f, data.OBJETS),
    ]),
    ...erreursDeNoms(cat, data),
  ];
}

/* ---------- 4. la génération ---------- */

/**
 * Le chantier de la génération : ce que les étapes se passent, dans l'ordre d'ETAPES. Seuls le sol, la hauteur, les
 * objets et leur état resteront dans l'île ; le reste ne sert qu'à générer.
 * @typedef {object} Chantier
 * @property {string} graine
 * @property {number} n                 le côté de l'île (cases)
 * @property {Uint8Array} terre         1 : la terre, 0 : la mer (formeIle)
 * @property {Float32Array} cote        la distance au rivage (cases) : positive sur la terre, négative en mer (formeIle)
 * @property {Float32Array} hauteur     de 0 au rivage à 1 au plus haut ; 0 en mer (relief)
 * @property {Float32Array} humidite    de 0 (sec) à 1 (humide) ; 1 en mer (humidite)
 */

// Les quatre voisines d'une case (dx, dy).
const VOISINES_4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// Les cases de `masque` (valeur 1) reliées à `depart` par leurs côtés ; renvoie un masque des cases atteintes.
function relieesA(masque, n, departs) {
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

// La distance (cases, à peu près euclidienne : le chanfrein 3-4) de chaque case à la plus proche des cases sources
// (source[i] = 1). Deux passes, sans file.
function distanceAux(source, n) {
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
function voisinesDeTerre(terre, n, i) {
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
function formeIle(ch) {
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
function flouterTerre(valeurs, terre, n) {
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
function partDeTerreAutour(terre, n, r) {
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
function limiterLaPente(h, n, pente) {
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

/**
 * Le relief doux : de 0 au rivage à 1 au plus haut ; des collines et des vallées, sans falaise.
 * @param {Chantier} ch
 */
function relief(ch) {
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
function humidite(ch) {
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

/** Les étapes de la génération, dans l'ordre (docs/ile-300.md, « Le code »). */
export const ETAPES = Object.freeze(['forme', 'relief', 'humidite']);
const FAIRE = { forme: formeIle, relief, humidite };

/**
 * Le chantier d'une graine, mené jusqu'à une étape (comprise) : pour les tests, l'aperçu, et creerIle.
 * @param {string | number} graine
 * @param {string} [jusqua]   une étape d'ETAPES (par défaut la dernière)
 * @returns {Chantier}
 */
export function genererChantier(graine, jusqua = ETAPES[ETAPES.length - 1]) {
  const fin = ETAPES.indexOf(jusqua);
  if (fin < 0) throw new Error(`étape inconnue : « ${jusqua} » (${ETAPES.join(', ')})`);
  const ch = { graine: String(graine), n: REGLAGES.TAILLE };
  for (const etape of ETAPES.slice(0, fin + 1)) FAIRE[etape](ch);
  return ch;
}
