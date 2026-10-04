// Les données du jeu : lecture de data/*.json, vérification, mise en forme pour
// le moteur. Utilisé par scripts/build-data.mjs.
//
// Les fichiers JSON sont écrits pour être modifiés à la main ; le moteur, lui,
// lit quelques tables dans une autre forme. compileData() fait le passage :
//
//   dans les fichiers                          pour le moteur
//   ----------------------------------------   --------------------------------
//   "conservation" sur un objet ou un plat     DATA.CONSERVATION[id]
//   "libre": true sur une recette              DATA.techtree.RECETTES_LIBRES
//   clés "//…" (notes)                         retirées
//
// Tout le reste passe tel quel.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './engine-source.mjs';

const isNote = (key) => key.startsWith('//');

// Retire les notes ("//clé": "texte") à tous les niveaux.
export function stripNotes(value) {
  if (Array.isArray(value)) return value.map(stripNotes);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([k]) => !isNote(k)).map(([k, v]) => [k, stripNotes(v)]));
  }
  return value;
}

// Lit data/index.json puis chaque fichier, et les réunit en un seul objet (sans
// les notes). Une clé de premier niveau ne peut venir que d'un seul fichier.
export function loadData(root = ROOT) {
  const dir = join(root, 'data');
  const read = (file) => {
    const path = join(dir, file);
    let text;
    try {
      text = readFileSync(path, 'utf8');
    } catch (err) {
      throw new Error(`data/${file} : fichier illisible (${err.message})`);
    }
    try {
      return JSON.parse(text);
    } catch (err) {
      throw new Error(`data/${file} : JSON invalide (${err.message})`);
    }
  };
  const index = read('index.json');
  if (!Array.isArray(index.fichiers)) throw new Error('data/index.json : la liste "fichiers" est absente');
  const data = {};
  const origin = {};
  for (const file of index.fichiers) {
    for (const [key, value] of Object.entries(stripNotes(read(file)))) {
      if (key in data) throw new Error(`data/${file} : la clé « ${key} » existe déjà dans data/${origin[key]}`);
      data[key] = value;
      origin[key] = file;
    }
  }
  return data;
}

/* ---------- vérification ---------- */

const CATEGORIES = ['légume', 'fruit', 'graine', 'ingrédient', 'produit', 'conserve'];
const LIEUX = ['potager', 'serre'];
const MODES_GRAINES = ['recolte', 'plant', 'montee'];

const isInt = (n) => Number.isInteger(n);
const isDish = (data, id) => !!data.recipes[id] && !data.recipes[id].transformation;

// Renvoie { errors, warnings } : des phrases prêtes à afficher. Une erreur
// empêche de générer le jeu ; un avertissement signale une valeur douteuse.
export function validateData(data) {
  const errors = [];
  const warnings = [];
  const err = (where, message) => errors.push(`${where} : ${message}`);
  const warn = (where, message) => warnings.push(`${where} : ${message}`);
  const { items, recipes, crops, techtree } = data;
  // Ce qui peut être rangé dans l'inventaire : un objet, ou un plat (recette qui n'est pas une transformation).
  const exists = (id) => id in items || isDish(data, id);
  const needItem = (where, id) => {
    if (!exists(id)) err(where, `« ${id} » n'est ni un objet (items) ni un plat (recipes)`);
  };
  const conservation = (where, def) => {
    if (!('conservation' in def)) return;
    const c = def.conservation;
    if (c !== null && !(isInt(c) && c > 0)) err(where, `conservation doit être un nombre entier de nuits, ou null (ne périme jamais) ; reçu ${JSON.stringify(c)}`);
  };

  /* objets */
  for (const [id, it] of Object.entries(items)) {
    const where = `items.${id}`;
    if (typeof it.nom !== 'string' || !it.nom) err(where, 'nom manquant');
    if (typeof it.icone !== 'string' || !it.icone) err(where, 'icone manquante');
    if (!(isInt(it.prix) && it.prix >= 0)) err(where, `prix doit être un entier positif ; reçu ${JSON.stringify(it.prix)}`);
    if (!CATEGORIES.includes(it.category)) err(where, `category « ${it.category} » inconnue (${CATEGORIES.join(', ')})`);
    if (typeof it.edible !== 'boolean') err(where, 'edible doit être true ou false');
    if (it.edible && !(isInt(it.energie) && it.energie > 0)) err(where, 'un objet comestible (edible) a besoin d\'une energie entière');
    conservation(where, it);
  }

  /* recettes */
  for (const [id, r] of Object.entries(recipes)) {
    const where = `recipes.${id}`;
    if (typeof r.nom !== 'string' || !r.nom) err(where, 'nom manquant');
    if (typeof r.icone !== 'string' || !r.icone) err(where, 'icone manquante');
    if (!data.STATIONS[r.station]) err(where, `station « ${r.station} » inconnue (${Object.keys(data.STATIONS).join(', ')})`);
    if (!(isInt(r.temps) && r.temps > 0)) err(where, `temps doit être un entier de secondes ; reçu ${JSON.stringify(r.temps)}`);
    if (r.eau !== undefined && !(isInt(r.eau) && r.eau > 0)) err(where, 'eau doit être un nombre entier de litres');
    if (!Array.isArray(r.ingredients) || !r.ingredients.length) {
      err(where, 'ingredients est vide');
      continue;
    }
    r.ingredients.forEach((ing, i) => {
      const at = `${where}.ingredients[${i}]`;
      if (!(isInt(ing.qte) && ing.qte > 0)) err(at, 'qte doit être un entier supérieur à 0');
      const options = ing.ou || [ing.item];
      if (ing.ou && ing.item) err(at, '« item » et « ou » ne vont pas ensemble : un seul des deux');
      if (!options.length || options.some((o) => typeof o !== 'string')) {
        err(at, 'il faut « item » (un objet) ou « ou » (une liste d\'objets)');
        return;
      }
      options.forEach((o) => needItem(at, o));
      // Le prix et l'énergie du plat sont calculés avec la première option.
      if (options.length > 1 && options.every((o) => o in items)) {
        const first = items[options[0]];
        const autres = (champ) => options.filter((o) => (items[o][champ] || 0) !== (first[champ] || 0));
        if (r.energieForcee == null && autres('energie').length) {
          warn(at, `les options n'ont pas la même énergie : celle du plat est calculée avec « ${options[0]} » seulement`);
        }
        if (autres('prix').length) {
          warn(at, `les options n'ont pas le même prix (${autres('prix').join(', ')}) : celui du plat est calculé avec « ${options[0]} » seulement`);
        }
      }
    });
    if (r.transformation) {
      if (!r.sortie || !(r.sortie in items)) err(where, `une transformation rend un objet existant : sortie « ${r.sortie} » inconnue`);
      if (!(isInt(r.qteSortie) && r.qteSortie > 0)) err(where, 'qteSortie doit être un entier supérieur à 0');
      if ('conservation' in r) err(where, 'la conservation d\'une transformation se règle sur l\'objet rendu (items), pas sur la recette');
    } else if (id in items) {
      err(where, `un plat porte le nom de sa recette : « ${id} » est déjà un objet (items), il serait remplacé. Renommer la recette (comme cafe_boisson)`);
    }
    if (r.sousProduit) {
      needItem(`${where}.sousProduit`, r.sousProduit.item);
      if (!(isInt(r.sousProduit.qte) && r.sousProduit.qte > 0)) err(`${where}.sousProduit`, 'qte doit être un entier supérieur à 0');
    }
    if (r.energieForcee != null && !(isInt(r.energieForcee) && r.energieForcee > 0)) err(where, 'energieForcee doit être un entier supérieur à 0');
    if (r.priceMultiplier != null && !(isInt(r.priceMultiplier) && r.priceMultiplier > 0)) err(where, 'priceMultiplier est un pourcentage entier (130 = ×1,3)');
    if (r.libre !== undefined && r.libre !== true) err(where, 'libre vaut true, ou n\'est pas écrit');
    conservation(where, r);
  }

  // Un plat fait avec un autre plat (pain à l'ail) : pas de boucle.
  const etat = {};
  const visiter = (id, chemin) => {
    if (etat[id] === 'fait') return;
    if (etat[id] === 'en cours') {
      err(`recipes.${id}`, `recettes en boucle : ${[...chemin, id].join(' → ')}`);
      return;
    }
    etat[id] = 'en cours';
    for (const ing of recipes[id].ingredients || []) {
      for (const o of ing.ou || [ing.item]) if (isDish(data, o)) visiter(o, [...chemin, id]);
    }
    etat[id] = 'fait';
  };
  Object.keys(recipes).filter((id) => isDish(data, id)).forEach((id) => visiter(id, []));

  /* arbre des technologies : chaque recette est libre, ou débloquée par un nœud */
  const debloqueePar = {};
  const paliers = Object.keys(techtree.PALIERS);
  const branches = techtree.branches.map((b) => b.id);
  for (const [id, n] of Object.entries(techtree.noeuds)) {
    const where = `techtree.noeuds.${id}`;
    if (!branches.includes(n.branche)) err(where, `branche « ${n.branche} » inconnue (${branches.join(', ')})`);
    if (!paliers.includes(String(n.palier))) err(where, `palier ${n.palier} inconnu (${paliers.join(', ')})`);
    for (const req of n.requiert || []) {
      if (req.noeud !== undefined && !techtree.noeuds[req.noeud]) err(where, `requiert le nœud « ${req.noeud} », qui n'existe pas`);
      if (req.noeud === id) err(where, 'un nœud ne peut pas se demander lui-même');
      if (req.batiment !== undefined && !techtree.batiments[req.batiment]) err(where, `requiert le bâtiment « ${req.batiment} », absent de techtree.batiments`);
    }
    for (const rid of (n.effet && n.effet.recettes) || []) {
      if (!recipes[rid]) err(where, `débloque la recette « ${rid} », qui n'existe pas`);
      (debloqueePar[rid] = debloqueePar[rid] || []).push(id);
    }
  }
  for (const [id, r] of Object.entries(recipes)) {
    const noeuds = debloqueePar[id] || [];
    if (!r.libre && !noeuds.length) err(`recipes.${id}`, 'recette inaccessible : ni "libre": true, ni débloquée par un nœud de l\'arbre (effet.recettes)');
    if (r.libre && noeuds.length) warn(`recipes.${id}`, `déjà libre : le nœud ${noeuds.join(', ')} ne débloque rien`);
  }

  /* cultures */
  const elements = Object.keys(data.CHAPITRES.ELEMENTS);
  for (const [id, c] of Object.entries(crops)) {
    const where = `crops.${id}`;
    if (typeof c.nom !== 'string' || !c.nom) err(where, 'nom manquant');
    if (!Array.isArray(c.lieux) || !c.lieux.length || c.lieux.some((l) => !LIEUX.includes(l))) err(where, `lieux doit contenir ${LIEUX.join(' et/ou ')}`);
    for (const champ of ['stades', 'litres', 'rendement']) {
      if (!(isInt(c[champ]) && c[champ] > 0)) err(where, `${champ} doit être un entier supérieur à 0`);
    }
    const recolte = c.produit || id;
    if (!(recolte in items)) err(where, `la récolte « ${recolte} » n'est pas un objet (items)${c.produit ? '' : ' : ajouter l\'objet, ou le champ "produit"'}`);
    if (c.deblocage !== undefined && !elements.includes(c.deblocage)) err(where, `deblocage « ${c.deblocage} » inconnu (CHAPITRES.ELEMENTS)`);
    const g = c.graines || {};
    if (!MODES_GRAINES.includes(g.mode)) err(where, `graines.mode « ${g.mode} » inconnu (${MODES_GRAINES.join(', ')})`);
    if (!(g.item in items)) err(where, `graines.item « ${g.item} » n'est pas un objet (items)`);
    if (g.mode === 'recolte' && !(isInt(g.min) && isInt(g.max) && g.min >= 0 && g.max >= g.min)) err(where, 'graines.min et graines.max : deux entiers, min ≤ max');
    if (g.mode === 'montee' && !(isInt(g.stadesSupp) && isInt(g.quantite))) err(where, 'graines.stadesSupp et graines.quantite : deux entiers');
    const s = c.sprite;
    if (!s) warn(where, 'pas de sprite : la carte affichera l\'icône à la place d\'un dessin');
    else if (!(isInt(s.r) && [16, 32].includes(s.h) && Array.isArray(s.c) && s.c.length === 4 && s.c.every(isInt))) {
      err(where, 'sprite : { "r": rangée, "h": 16 ou 32, "c": [4 colonnes, une par phase] }');
    }
  }

  /* le reste : chaque objet cité ailleurs doit exister */
  for (const [id, a] of Object.entries(data.VERGER.ARBRES)) needItem(`VERGER.ARBRES.${id}.fruit`, a.fruit);
  for (const [id, a] of Object.entries(data.ANIMAUX)) {
    for (const champ of ['produit', 'laine', 'lait']) if (a[champ] !== undefined) needItem(`ANIMAUX.${id}.${champ}`, a[champ]);
  }
  for (const id of Object.keys(data.START.INVENTAIRE)) needItem('START.INVENTAIRE', id);
  for (const id of Object.keys(data.FAMILY.RESERVE_DEPART)) needItem('FAMILY.RESERVE_DEPART', id);
  for (const id of data.MARCHE.TRANSFORMATIONS_DOUBLEES) needItem('MARCHE.TRANSFORMATIONS_DOUBLEES', id);
  for (const id of Object.keys(data.PLATS_RETIRES)) {
    if (exists(id)) err(`PLATS_RETIRES.${id}`, 'ce plat existe encore (items ou recipes) : il n\'est pas retiré');
  }
  for (const [id, lettre] of Object.entries(data.COURRIER)) {
    const where = `COURRIER.${id}`;
    for (const cadeau of Object.keys(lettre.cadeaux || {})) needItem(`${where}.cadeaux`, cadeau);
    const q = lettre.quand || {};
    if (q.debloque !== undefined && !elements.includes(q.debloque)) err(where, `quand.debloque « ${q.debloque} » inconnu (CHAPITRES.ELEMENTS)`);
  }
  data.CHAPITRES.liste.forEach((ch, i) => {
    for (const e of ch.debloque || []) if (!elements.includes(e)) err(`CHAPITRES.liste[${i}]`, `debloque « ${e} » inconnu (CHAPITRES.ELEMENTS)`);
  });

  return { errors, warnings };
}

/* ---------- mise en forme pour le moteur ---------- */

// Reconstitue les tables que le moteur lit (voir l'en-tête). Ne modifie pas `data`.
export function compileData(data) {
  const out = JSON.parse(JSON.stringify(data));
  const CONSERVATION = {};
  for (const table of [out.items, out.recipes]) {
    for (const [id, def] of Object.entries(table)) {
      if ('conservation' in def) {
        CONSERVATION[id] = def.conservation;
        delete def.conservation;
      }
    }
  }
  out.CONSERVATION = CONSERVATION;
  out.techtree.RECETTES_LIBRES = [];
  for (const [id, r] of Object.entries(out.recipes)) {
    if (r.libre) out.techtree.RECETTES_LIBRES.push(id);
    delete r.libre;
  }
  return out;
}

/* ---------- le fichier généré ---------- */

// Une ligne par entrée tant qu'elle tient dans la largeur, sinon développée :
// le fichier reste lisible et ses diffs suivent ceux des JSON.
function inline(v) {
  if (Array.isArray(v)) return `[${v.map(inline).join(', ')}]`;
  if (v && typeof v === 'object') {
    const e = Object.entries(v);
    return e.length ? `{ ${e.map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(', ')} }` : '{}';
  }
  return JSON.stringify(v);
}

export function format(v, { width = 150, indent = '', keyLen = 0, top = true } = {}) {
  const flat = inline(v);
  if (!top && indent.length + keyLen + flat.length <= width) return flat;
  const inner = `${indent}  `;
  if (Array.isArray(v) && v.length) {
    return `[\n${v.map((x) => inner + format(x, { width, indent: inner, top: false })).join(',\n')}\n${indent}]`;
  }
  if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length) {
    return `{\n${Object.entries(v).map(([k, x]) => `${inner}${JSON.stringify(k)}: ${format(x, { width, indent: inner, keyLen: JSON.stringify(k).length + 2, top: false })}`).join(',\n')}\n${indent}}`;
  }
  return flat;
}

export const GENERATED_FILE = 'js/data.generated.js';

export function generatedSource(compiled) {
  return `// FICHIER GÉNÉRÉ par scripts/build-data.mjs à partir de data/*.json.
// Ne pas le modifier : changer les fichiers JSON, puis lancer
//   node scripts/build-data.mjs
// (GitHub le régénère aussi à chaque mise en ligne.)
// Les valeurs sont celles des fichiers, avant les calculs du chargement (prix
// de production doublés, temps de cuisson, plats) : voir buildCatalog() dans
// js/engine/catalog.js, qui en fait DATA.
export const RAW_DATA = ${format(compiled)};
`;
}
