/* ==========================================================================
   Le catalogue des espèces (docs/ile-300.md, « Le catalogue des espèces ») : construit depuis les données du
   jeu, numéroté, ses tables lues en jeu, la table des numéros de la sauvegarde, et son contrôle.
   Une partie de l'île de 300 × 300 (js/engine/ile.js, docs/ile-300.md).
   ========================================================================== */

import { DATA } from '../catalog.js';
import { BIOME, GENRES, SOL, SOLS } from './reglages.js';

/**
 * Une espèce du catalogue (section 3).
 * @typedef {object} Fiche
 * @property {string} id                  son nom, unique (le nom de la plante sauvage, ou <culture>_sauvage, <arbre>_sauvage)
 * @property {number} numero              son numéro dans le tableau `objet` de l'île (1 et plus ; 0 : rien)
 * @property {string} famille             arbre, fruitier, buisson, fleur, culture, herbe, champignon ou décor
 * @property {string} genre               arbre, buisson, haute, basse ou bloc (l'occupation de la case, l'ordre de dessin)
 * @property {number[][]} empreinte       les cases que prend un pied qui bloque, [dx, dy] depuis la case de son pied
 * @property {number} ecart               les cases gardées libres de tout autre bloc autour d'un pied qui bloque
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
 *                                        | { planche: 'verger', dessin } | { planche: 'roches', sorte, variantes }
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
 * @property {{ famille: Uint8Array, genre: Uint8Array, bloque: Uint8Array, stades: Uint8Array, ecart: Uint8Array }} tables
 *           les réglages lus en jeu, rangés par numéro (l'indice 0 : rien) : une lecture, pas de recherche
 */

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
// par chance. `apres` : ce que devient la plante cueillie : { repousse: 'jamais' } (elle s'en va et ne revient pas :
// une culture sauvage), ou { repousse: 'stade', stade } (elle reste et revient à ce stade : un fruitier, sans ses
// fruits ; la vigne, une vivace).
function recolteCueillie(reglage, produit, enPlus, objets, apres) {
  const recolte = { geste: reglage.geste, fin: { [produit]: [...reglage.fin] }, ...apres };
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

// La fiche d'une plante sauvage du monde (monde.json VEGETATION.SORTES). Une culture sauvage (l'ail des ours, la
// salicorne) ne repousse pas une fois récoltée.
function ficheDeSorte(sorte, liens, data) {
  const fleurs = liens.fleurs.get(sorte.nom) ?? [];
  const cultures = liens.cultures.get(sorte.nom) ?? [];
  const famille = familleDeSorte(sorte, liens.classement, fleurs, cultures);
  const recolte = data.RECOLTE.SORTES[sorte.nom] ?? null;
  return {
    id: sorte.nom,
    famille,
    genre: sorte.genre,
    bloque: Array.isArray(sorte.bloque) && sorte.bloque.length > 0,
    empreinte: (sorte.bloque ?? []).map(([dx, dy]) => [dx, dy]),
    ecart: sorte.ecart ?? 0,
    source: { table: 'VEGETATION.SORTES', cle: sorte.nom },
    cultures,
    fleurs,
    stades: 1,
    dessin: { planche: 'vegetation', sorte: sorte.nom, variantes: sorte.variantes ?? 1 },
    recolte: recolte && famille === 'culture' ? { ...recolte, repousse: 'jamais' } : recolte,
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
    empreinte: [],
    ecart: 0,
    source: { table: 'CULTURES', cle },
    cultures: [cle],
    fleurs: [],
    stades: culture.stades,
    dessin: { planche: 'crops', r, c: [...c], l, h },
    recolte: recolteDeCulture(culture, cle, data),
  };
}

// Ce que donne une culture sauvage : à la main, son produit (une culture s'en va et ne repousse pas ; une vivace
// revient à son stade de vivace) ; à la faux, si elle en a une (CULTURES[…].faux : le tournesol), autre chose.
function recolteDeCulture(culture, cle, data) {
  const apres = culture.vivace ? { repousse: 'stade', stade: culture.vivace.stade } : { repousse: 'jamais' };
  const recolte = recolteCueillie(
    data.ILE.ESPECES.RECOLTES.culture,
    culture.produit ?? cle,
    culture.graines?.item,
    data.OBJETS,
    apres,
  );
  if (culture.faux) {
    const fin = Object.fromEntries(Object.entries(culture.faux).map(([objet, n]) => [objet, [...n]]));
    recolte.faux = { geste: 'faucher', fin };
  }
  return recolte;
}

// La forme sauvage d'un fruitier du verger : le dessin du verger, ses stades.
function ficheDeFruitier(cle, arbre, data) {
  return {
    id: `${cle}_sauvage`,
    famille: 'fruitier',
    genre: 'arbre',
    bloque: true,
    empreinte: [[0, 0]],
    ecart: 2,
    source: { table: 'VERGER.ARBRES', cle },
    cultures: [],
    fleurs: [],
    stades: data.VERGER.STADES.length,
    dessin: { planche: 'verger', dessin: arbre.dessin },
    // cueilli, il garde sa taille : il revient au stade « arbre » (sans fruits), ses fruits repoussent (vie.js)
    recolte: recolteCueillie(data.ILE.ESPECES.RECOLTES.fruitier, arbre.fruit, `jeune_${cle}`, data.OBJETS, {
      repousse: 'stade',
      stade: data.VERGER.STADES.length - 2,
    }),
  };
}

// La fiche d'une roche de l'île (monde.json ROCHES.SORTES) : un rocher, des pierres, un gisement, des cristaux.
function ficheDeRoche(sorte, data) {
  return {
    id: sorte.nom,
    famille: 'roche',
    genre: sorte.genre === 'bloc' ? 'bloc' : 'basse',
    bloque: Array.isArray(sorte.bloque) && sorte.bloque.length > 0,
    empreinte: (sorte.bloque ?? []).map(([dx, dy]) => [dx, dy]),
    ecart: sorte.ecart ?? 0,
    source: { table: 'ROCHES.SORTES', cle: sorte.nom },
    cultures: [],
    fleurs: [],
    stades: 1,
    dessin: { planche: 'roches', sorte: sorte.nom, variantes: sorte.variantes ?? 1 },
    recolte: data.RECOLTE.SORTES[sorte.nom] ?? null,
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
    ecart: new Uint8Array(n),
  };
  for (const f of fiches) {
    tables.ecart[f.numero] = f.ecart;
    tables.famille[f.numero] = familles.indexOf(f.famille);
    tables.genre[f.numero] = GENRES.indexOf(f.genre);
    tables.bloque[f.numero] = f.bloque ? 1 : 0;
    tables.stades[f.numero] = f.stades;
  }
  return tables;
}

/**
 * Le catalogue des espèces, construit depuis les données du jeu (docs/ile-300.md, « Le catalogue des espèces ») :
 * les plantes sauvages, puis les formes sauvages des cultures, puis celles des fruitiers, puis les roches, numérotées dans
 * cet ordre.
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
    ...data.VEGETATION.SORTES.filter((sorte) => !E.EXCLUES.includes(sorte.nom)).map((sorte) =>
      ficheDeSorte(sorte, liens, data),
    ),
    ...Object.entries(data.CULTURES)
      .filter(([cle]) => !E.CULTURES_DEJA_SAUVAGES[cle])
      .map(([cle, culture]) => ficheDeCulture(cle, culture, data)),
    ...Object.entries(data.VERGER.ARBRES).map(([cle, arbre]) => ficheDeFruitier(cle, arbre, data)),
    ...data.ROCHES.SORTES.filter((sorte) => E.ROCHES.includes(sorte.nom)).map((sorte) => ficheDeRoche(sorte, data)),
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
    if (data.ILE.ESPECES.EXCLUES.includes(sorte.nom)) continue;
    if (!cat.parId.has(sorte.nom)) erreurs.push(`la plante sauvage « ${sorte.nom} » n'a pas de fiche`);
  }
  for (const nom of data.ILE.ESPECES.EXCLUES) {
    if (!data.VEGETATION.SORTES.some((s) => s.nom === nom))
      erreurs.push(`EXCLUES : « ${nom} » n'est pas une plante sauvage`);
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
  const blocs = [r.fin, r.coup, r.chance, r.aussi?.fin, r.aussi?.chance, r.faux?.fin];
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
  const vivante = f.famille !== 'decor' && f.famille !== 'roche';
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
    ...E.ROCHES,
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
