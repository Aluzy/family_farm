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
 * @property {Float32Array} humidite    de 0 (sec) à 1 (humide) ; 1 en mer (humidite, puis lacs)
 * @property {Uint8Array} lac           1 : une case de lac (lacs ; sa hauteur est celle de l'eau, plate)
 * @property {{ x: number, y: number, aire: number, origine: string }[]} lacs   le centre, l'aire et l'origine
 *           (creux, dessin) de chaque lac (lacs)
 * @property {Uint8Array} biome         le numéro du biome de chaque case (BIOME ; biomes, plages, pointApparition)
 * @property {Uint8Array} sol           le numéro du sol de chaque case (SOL ; biomes, plages, pointApparition)
 * @property {{ x: number, y: number, rayon: number }} apparition   la prairie plate du départ (pointApparition)
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

// Une file de priorité (un tas binaire) de cases, la plus basse d'abord.
class FileDesPlusBasses {
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

// Les quatre voisines d'une case, ou -1 hors de la carte.
function voisinesDe(i, n) {
  const x = i % n;
  return [x > 0 ? i - 1 : -1, x < n - 1 ? i + 1 : -1, i >= n ? i - n : -1, i < n * n - n ? i + n : -1];
}

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

// Les groupes de cases d'un masque reliées par leurs côtés.
function groupesDe(masque, n) {
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
function lacs(ch) {
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

// Le seuil sous lequel tombe la part `part` des valeurs (0,2 : les 20 % les plus bas).
function seuilDeLaPart(valeurs, part) {
  if (!valeurs.length) return Infinity;
  const triees = Float32Array.from(valeurs).sort();
  return triees[Math.min(triees.length - 1, Math.max(0, Math.floor(part * triees.length)))];
}

// Les cases de terre (hors lacs) d'un biome.
function casesDuBiome(ch, biome) {
  const cases = [];
  for (let i = 0; i < ch.n * ch.n; i++) if (ch.biome[i] === biome) cases.push(i);
  return cases;
}

// Une tache de bruit : vraie là où le bruit (echelle) passe le seuil.
function tache(ch, i, reglage, etape) {
  const x = i % ch.n;
  const y = (i - x) / ch.n;
  return bruit2D(x / reglage.echelle, y / reglage.echelle, hacher(`${ch.graine}/${etape}`)) > reglage.seuil;
}

// Les sols de la forêt : les aiguilles en haut, la mousse dans les plus humides, les clairières en taches, les
// feuilles ailleurs.
function solsDeLaForet(ch, S) {
  const foret = casesDuBiome(ch, BIOME.foret);
  const hautes = seuilDeLaPart(
    foret.map((i) => ch.hauteur[i]),
    1 - S.aiguilles,
  );
  const humides = seuilDeLaPart(
    foret.map((i) => ch.humidite[i]),
    1 - S.mousse,
  );
  for (const i of foret) {
    if (tache(ch, i, S.clairiere, 'clairieres')) ch.sol[i] = SOL.clairiere;
    else if (ch.hauteur[i] >= hautes) ch.sol[i] = SOL.aiguilles;
    else if (ch.humidite[i] >= humides) ch.sol[i] = SOL.mousse;
    else ch.sol[i] = SOL.feuilles;
  }
}

/**
 * Les biomes et les sols : la mer, les lacs, puis la terre partagée entre la lande (le plus sec), la forêt (le plus
 * humide) et la prairie, dans les parts de REPARTITION ; puis les sols de chaque biome.
 * @param {Chantier} ch
 */
function biomes(ch) {
  const R = REGLAGES.REPARTITION;
  const n = ch.n;
  const g = hacher(`${ch.graine}/biomes`);
  ch.biome = new Uint8Array(n * n).fill(BIOME.mer);
  ch.sol = new Uint8Array(n * n).fill(SOL.eau_profonde);
  const terre = [];
  const notes = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) {
    if (!ch.terre[i]) continue;
    if (ch.lac[i]) {
      ch.biome[i] = BIOME.lac;
      continue;
    }
    const x = i % n;
    const y = (i - x) / n;
    const bruit = (bruit2D(x / R.BRUIT.echelle, y / R.BRUIT.echelle, g) - 0.5) * 2 * R.BRUIT.force;
    notes[i] = ch.humidite[i] - R.HAUTEUR * ch.hauteur[i] + bruit;
    terre.push(i);
  }
  const sec = seuilDeLaPart(
    terre.map((i) => notes[i]),
    R.lande,
  );
  const humide = seuilDeLaPart(
    terre.map((i) => notes[i]),
    1 - R.foret,
  );
  for (const i of terre) {
    if (notes[i] < sec) ch.biome[i] = BIOME.lande;
    else if (notes[i] >= humide) ch.biome[i] = BIOME.foret;
    else ch.biome[i] = BIOME.prairie;
  }
  // les sols
  for (let i = 0; i < n * n; i++) {
    if (ch.biome[i] === BIOME.prairie) ch.sol[i] = SOL.herbe;
    else if (ch.biome[i] === BIOME.lande) ch.sol[i] = tache(ch, i, R.SOLS.terre, 'terre') ? SOL.terre : SOL.lande;
    else if (ch.biome[i] === BIOME.lac) ch.sol[i] = auBordDuLac(ch, i) ? SOL.eau_basse : SOL.eau;
  }
  solsDeLaForet(ch, R.SOLS);
}

// Une case de lac qui touche la terre (ses huit voisines) : l'eau basse du bord.
function auBordDuLac(ch, i) {
  const n = ch.n;
  for (const d of [-n - 1, -n, -n + 1, -1, 1, n - 1, n, n + 1]) if (!ch.lac[i + d]) return true;
  return false;
}

/**
 * Les plages : la terre basse du rivage, d'une largeur qui varie le long de la côte (par endroits, aucune) ; du sable,
 * et des galets en taches.
 * @param {Chantier} ch
 */
function plages(ch) {
  const P = REGLAGES.PLAGES;
  const n = ch.n;
  const g = hacher(`${ch.graine}/plages`);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (!ch.terre[i] || ch.lac[i] || ch.hauteur[i] > P.HAUTEUR_MAX) continue;
      const largeur = P.LARGEUR[0] + (P.LARGEUR[1] - P.LARGEUR[0]) * bruit2D(x / P.echelle, y / P.echelle, g);
      if (ch.cote[i] > largeur) continue;
      ch.biome[i] = BIOME.plage;
      ch.sol[i] = tache(ch, i, REGLAGES.REPARTITION.SOLS.galets, 'galets') ? SOL.galets : SOL.sable;
    }
  }
}

/**
 * Le point d'apparition : une prairie plate dans un rayon autour du centre, où le joueur apparaît en début de partie ;
 * au-delà, sur « fondu » cases, le relief retrouve le sien (puis le limiteur de pente le garde doux).
 * @param {Chantier} ch
 */
function pointApparition(ch) {
  const A = REGLAGES.APPARITION;
  const n = ch.n;
  const loin = A.rayon + A.fondu;
  let somme = 0;
  let compte = 0;
  for (let y = A.y - A.rayon; y <= A.y + A.rayon; y++) {
    for (let x = A.x - A.rayon; x <= A.x + A.rayon; x++) {
      if (Math.hypot(x - A.x, y - A.y) > A.rayon) continue;
      somme += ch.hauteur[y * n + x];
      compte++;
    }
  }
  const plat = somme / compte;
  for (let y = A.y - loin; y <= A.y + loin; y++) {
    for (let x = A.x - loin; x <= A.x + loin; x++) {
      const i = y * n + x;
      const d = Math.hypot(x - A.x, y - A.y);
      if (d > loin) continue;
      const t = Math.min(1, Math.max(0, (d - A.rayon) / A.fondu));
      const garde = t * t * (3 - 2 * t);
      ch.hauteur[i] = plat * (1 - garde) + ch.hauteur[i] * garde;
      if (d <= A.rayon) {
        ch.biome[i] = BIOME.prairie;
        ch.sol[i] = SOL.herbe;
      }
    }
  }
  // la prairie autour du départ, au bord irrégulier : la lande et la forêt y deviennent de l'herbe
  const g = hacher(`${ch.graine}/apparition`);
  for (let y = A.y - 2 * A.prairie; y <= A.y + 2 * A.prairie; y++) {
    for (let x = A.x - 2 * A.prairie; x <= A.x + 2 * A.prairie; x++) {
      const i = y * n + x;
      const bord = A.prairie * (0.6 + 0.8 * bruit2D(x / 9, y / 9, g));
      const enPrairie = ch.biome[i] === BIOME.lande || ch.biome[i] === BIOME.foret;
      if (enPrairie && Math.hypot(x - A.x, y - A.y) <= bord) {
        ch.biome[i] = BIOME.prairie;
        ch.sol[i] = SOL.herbe;
      }
    }
  }
  limiterLaPente(ch.hauteur, n, REGLAGES.RELIEF.PENTE_MAX * 0.95);
  ch.apparition = { x: A.x, y: A.y, rayon: A.rayon };
}

/** Les étapes de la génération, dans l'ordre (docs/ile-300.md, « Le code »). */
export const ETAPES = Object.freeze(['forme', 'relief', 'humidite', 'lacs', 'biomes', 'plages', 'pointApparition']);
const FAIRE = { forme: formeIle, relief, humidite, lacs, biomes, plages, pointApparition };

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
