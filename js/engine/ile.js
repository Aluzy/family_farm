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
