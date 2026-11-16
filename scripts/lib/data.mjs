// Les données du jeu : lecture de data/*.json, vérification, mise en forme pour
// le moteur. Utilisé par scripts/build-data.mjs.
//
// Les fichiers JSON sont écrits pour être modifiés à la main ; le moteur, lui,
// lit quelques tables dans une autre forme. compileData() fait le passage :
//
//   dans les fichiers                          pour le moteur
//   ----------------------------------------   --------------------------------
//   "conservation" sur un objet ou un plat     DATA.CONSERVATION[id]
//   "libre": true sur une recette              DATA.ARBRE.RECETTES_LIBRES
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

const CATEGORIES = ['légume', 'fruit', 'graine', 'ingrédient', 'produit', 'conserve', 'matériau', 'équipement', 'souvenir'];
const LIEUX = ['potager', 'serre'];
const MODES_GRAINES = ['recolte', 'plant'];

// Les clés d'effet des nœuds de l'arbre (techtree.noeuds[*].effet) que le moteur
// lit, et où. Une clé écrite dans les données mais absente d'ici n'aurait aucun
// effet en jeu : c'est une erreur. test-data.mjs vérifie que chacune est bien
// lue dans js/ (techEffects, techPct, techSum, techFlag, techAuto…).
export const EFFETS_TECHNO = [
  'arrosagePrioritaire', // techFlag (automation.js)
  'auto', // techAuto (techtree.js)
  'conservation', // techSum (fridge.js)
  'coupsMoins', // techSum (outils.js)
  'croissanceSurface', // techFlag (animals.js)
  'delestage', // techFlag (energy.js)
  'eauArrosage', // techPct (crops.js)
  'economie', // techEffects (energy.js)
  'entretienAuto', // techFlag (devices.js)
  'fileAttente', // techFlag (kitchen.js)
  'frigoConso', // techPct (energy.js)
  'gouter', // techFlag (family.js)
  'grainesBonus', // techSum (crops.js)
  'grotte', // techFlag (outils.js bonusMinerai : la Lampe de mineur, son bonus de minerai)
  'groupeEconome', // techFlag (crops.js)
  'parBle', // techFlag (animals.js)
  'pecheJour', // techSum (outils.js)
  'pecheTouche', // techSum (outils.js)
  'pluie', // techFlag (crops.js)
  'poulesParBle', // techFlag (animals.js)
  'recettes', // techEffects (kitchen.js)
  'recolteBonus', // techSum via withBonus() (outils.js)
  'reveilEnergie', // techFlag (family.js)
  'solaireBonus', // techFlag (energy.js)
  'tempsPrepa', // techPct (techtree.js)
  'usure', // techPct (devices.js)
  'whParLitre', // techPct (energy.js)
];

// Les façons d'obtenir un objet (liste vide : aucune). Sert à l'avertissement
// « objet introuvable » de validateData(). (Les minerais viennent des gisements : RECOLTE.SORTES, docs/gisements.md.)
export function sourcesOf(data, id) {
  const out = [];
  const it = data.OBJETS[id] || {};
  for (const [rid, r] of Object.entries(data.RECETTES)) {
    if ((r.transformation ? r.sortie : rid) === id) out.push(`recette ${rid}`);
    if (r.sousProduit && r.sousProduit.item === id) out.push(`sous-produit de ${rid}`);
    if (r.cave === id) out.push(`chaîne ${rid} (avant le tonnelet)`);
  }
  for (const [cid, c] of Object.entries(data.CULTURES)) {
    if ((c.produit || cid) === id) out.push(`récolte ${cid}`);
    if (c.graines && c.graines.mode === 'recolte' && c.graines.item === id) out.push(`graines de ${cid}`);
  }
  for (const [aid, a] of Object.entries(data.VERGER.ARBRES)) if (a.fruit === id) out.push(`verger ${aid}`);
  for (const [aid, a] of Object.entries(data.ANIMAUX)) {
    for (const champ of ['produit', 'laine', 'lait', 'laitAlpage']) if (a[champ] === id) out.push(`animal ${aid}`);
  }
  for (const [eau, p] of Object.entries((data.CANNE && data.CANNE.PRISES) || {})) if (id in p) out.push(`pêche ${eau}`);
  for (const [eau, p] of Object.entries((data.CANNE && data.CANNE.COINS && data.CANNE.COINS.PRISES) || {})) if (id in p) out.push(`coin de pêche (${eau})`);
  const A = data.ATELIER;
  for (const [rid, r] of Object.entries((A && A.RECETTES) || {})) if (id in (r.sortie || {})) out.push(`atelier ${rid}`);
  for (const [rid, r] of Object.entries((A && A.RAMASSAGE) || {})) if (r.objet === id) out.push(`ramassage ${rid}`);
  for (const [bid, b] of Object.entries((A && A.BLOCS) || {})) if (b.meuble && b.objet === id && data.MEUBLES && data.MEUBLES[b.meuble]) out.push(`meuble ${b.meuble} (un hameau)`);
  if (data.DEHORS && data.DEHORS[id]) out.push('Marché (dehors)');
  if (data.RUCHE && id === data.RUCHE.OBJET) out.push('ruche (Marché)');
  for (const b of Object.values((A && A.BLOCS) || {})) if (b.frigo && b.objet === id && data.FRIGO) out.push('achat du Réfrigérateur');
  if (data.RUCHE && id === data.RUCHE.PRODUIT) out.push('ruche');
  if (data.COMPOST && id === data.COMPOST.ENGRAIS) out.push('bac à compost (ce qui périme)');
  if (data.HACHE && id === 'bois') out.push('hache');
  if (data.HACHE && Object.values(data.HACHE.GRAINES || {}).includes(id)) out.push('hache (graine d\'un arbre abattu)');
  if (data.PIOCHE && id === 'pierre') out.push('pioche');
  if (data.FAUX && id === 'fibre') out.push('faux');
  if (data.BOTTELEUSE && data.PATURAGE && id === data.PATURAGE.NOURRITURE) out.push('botteleuse');
  if (it.trouvaille) out.push(`trouvaille du grand monde (${it.trouvaille})`);
  // (la boutique du jeu en ligne, achetée avec des gemmes : worker/src/boutique.mjs ARTICLES)
  if (it.boutique === true) out.push('boutique (gemmes)');
  for (const [nom, r0] of Object.entries((data.RECOLTE && data.RECOLTE.SORTES) || {})) for (const r of [r0, r0.aussi].filter(Boolean)) if (id in (r.fin || {}) || id in (r.coup || {}) || id in (r.chance || {})) out.push(`récolte du grand monde (${nom})`);
  if (it.cueillette) out.push(`cueillette (${it.cueillette})`);
  if (data.DEPART && id in data.DEPART.INVENTAIRE) out.push('DEPART.INVENTAIRE');
  if (data.DEPART && data.DEPART.ETAT_INITIAL && id in data.DEPART.ETAT_INITIAL.INVENTAIRE) out.push('DEPART.ETAT_INITIAL.INVENTAIRE');
  if (data.FAMILLE && id in data.FAMILLE.RESERVE_DEPART) out.push('FAMILY.RESERVE_DEPART');
  if (it.rachetable !== false) out.push('Marché');
  // (le chantier « l'île à bâtir », fiche I8a : un projet du village donne son bâtiment, ou son décor)
  for (const v of Object.values(data.VOCATIONS || {})) for (const [sid, p] of Object.entries((v.PROJETS && v.PROJETS.SORTES) || {})) {
    const b = p.bloc && A && A.BLOCS && A.BLOCS[p.bloc];
    if ((b && b.objet === id) || id in (p.donne || {})) out.push(`projet du village ${sid}`);
  }
  // (le chantier « l'île à bâtir », fiches I5a, I5b, I5c : ce que fait un commerce d'artisan, ses recettes et celles de
  // VILLAGE.PRIX.ARTISANS qui portent sa sorte)
  for (const [sorte, c] of Object.entries((data.ARTISANS && data.ARTISANS.COMMERCES) || {})) {
    for (const r of Object.values((c && c.RECETTES) || {})) if (r && id in (r.sortie || {})) out.push(`commerce ${sorte}`);
  }
  for (const r of Object.values((data.VILLAGE && data.VILLAGE.PRIX && data.VILLAGE.PRIX.ARTISANS) || {})) if (r && r.commerce && id in (r.sortie || {})) out.push(`commerce ${r.commerce}`);
  if (it.retire) out.push('ancienne sauvegarde (retire)');
  return out;
}

const isInt = (n) => Number.isInteger(n);
// les minerais d'un gisement (RECOLTE.SORTES, minerai ; PIOCHE.MINERAIS : le niveau qu'il leur faut)
const DATA_MINERAIS = ['fer', 'cuivre', 'or', 'platine'];
const isDish = (data, id) => !!data.RECETTES[id] && !data.RECETTES[id].transformation;

// Renvoie { errors, warnings } : des phrases prêtes à afficher. Une erreur
// empêche de générer le jeu ; un avertissement signale une valeur douteuse.
export function validateData(data) {
  const errors = [];
  const warnings = [];
  const err = (where, message) => errors.push(`${where} : ${message}`);
  const warn = (where, message) => warnings.push(`${where} : ${message}`);
  const { OBJETS: items, RECETTES: recipes, CULTURES: crops, ARBRE: techtree } = data;
  // Ce qui peut être rangé dans l'inventaire : un objet, ou un plat (recette qui n'est pas une transformation).
  const exists = (id) => id in items || isDish(data, id);
  const needItem = (where, id) => {
    if (!exists(id)) err(where, `« ${id} » n'est ni un objet (OBJETS) ni un plat (RECETTES)`);
  };
  const conservation = (where, def) => {
    if (!('conservation' in def)) return;
    const c = def.conservation;
    if (c !== null && !(isInt(c) && c > 0)) err(where, `conservation doit être un nombre entier de nuits, ou null (ne périme jamais) ; reçu ${JSON.stringify(c)}`);
  };

  /* objets */
  for (const [id, it] of Object.entries(items)) {
    const where = `OBJETS.${id}`;
    if (typeof it.nom !== 'string' || !it.nom) err(where, 'nom manquant');
    if (typeof it.icone !== 'string' || !it.icone) err(where, 'icone manquante');
    if (!(isInt(it.prix) && it.prix >= 0)) err(where, `prix doit être un entier positif ; reçu ${JSON.stringify(it.prix)}`);
    if (!CATEGORIES.includes(it.categorie)) err(where, `categorie « ${it.categorie} » inconnue (${CATEGORIES.join(', ')})`);
    if (typeof it.mangeable !== 'boolean') err(where, 'mangeable doit être true ou false');
    if (it.mangeable && !(isInt(it.energie) && it.energie > 0)) err(where, 'un objet comestible (mangeable) a besoin d\'une energie entière');
    conservation(where, it);
  }

  /* ateliers */
  const xpActions = (data.NIVEAUX && data.NIVEAUX.XP) || {};
  for (const [id, st] of Object.entries(data.STATIONS)) {
    if (!(st.action in xpActions)) err(`STATIONS.${id}`, `action « ${st.action} » inconnue (NIVEAUX.XP)`);
  }

  /* les chaînes de production */
  if (data.CHAINES) {
    const C = data.CHAINES, blocsAt = (data.ATELIER && data.ATELIER.BLOCS) || {}, vues = new Map();
    if (!(isInt(C.RESERVOIR) && C.RESERVOIR > 0)) err('CHAINES.RESERVOIR', 'un nombre entier d\'ingrédients');
    if (!(isInt(C.TAS) && C.TAS > 0)) err('CHAINES.TAS', 'un nombre entier de produits');
    for (const [o, d] of Object.entries(C.OUTILS || {})) {
      if (!blocsAt[o] || blocsAt[o].chaine !== 'outil') err(`CHAINES.OUTILS.${o}`, 'il lui faut son bloc (ATELIER.BLOCS, chaine : « outil »)');
      if (!(d.whParS > 0) || !(isInt(d.secondes) && d.secondes > 0)) err(`CHAINES.OUTILS.${o}`, 'whParS et secondes (entiers) positifs');
    }
    for (const [b, d] of Object.entries(blocsAt)) if (d.chaine === 'outil' && !(C.OUTILS || {})[b]) err(`ATELIER.BLOCS.${b}`, 'un outil de chaîne sans CHAINES.OUTILS');
    for (const [rid, suite] of Object.entries(C.RECETTES || {})) {
      const w = `CHAINES.RECETTES.${rid}`;
      if (!recipes[rid] || recipes[rid].station !== 'chaine') err(w, 'une recette de DATA.RECETTES de station « chaine »');
      if (!Array.isArray(suite) || !suite.length || suite.some((o) => !(C.OUTILS || {})[o])) err(w, 'une suite d\'outils de CHAINES.OUTILS');
      const cle = (suite || []).join('>');
      if (vues.has(cle)) err(w, `même suite d'outils que ${vues.get(cle)}`);
      vues.set(cle, rid);
    }
  }

  /* recettes */
  for (const [id, r] of Object.entries(recipes)) {
    const where = `RECETTES.${id}`;
    if (typeof r.nom !== 'string' || !r.nom) err(where, 'nom manquant');
    if (typeof r.icone !== 'string' || !r.icone) err(where, 'icone manquante');
    // (station « chaine » : elle se fait sur une chaîne de production, DATA.CHAINES.RECETTES)
    if (r.station === 'chaine') { if (!(data.CHAINES && data.CHAINES.RECETTES && id in data.CHAINES.RECETTES)) err(where, 'station « chaine » : il lui faut sa chaîne dans CHAINES.RECETTES'); }
    else if (!data.STATIONS[r.station]) err(where, `station « ${r.station} » inconnue (chaine, ${Object.keys(data.STATIONS).join(', ')})`);
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
      // L'énergie du plat est calculée avec la première option ; son prix avec
      // l'option la plus chère (voir recipeSum() dans js/engine/catalog.js).
      if (options.length > 1 && options.every((o) => o in items)) {
        const first = items[options[0]];
        const autres = (champ) => options.filter((o) => (items[o][champ] || 0) !== (first[champ] || 0));
        if (r.energieForcee == null && autres('energie').length) {
          warn(at, `les options n'ont pas la même énergie : celle du plat est calculée avec « ${options[0]} » seulement`);
        }
      }
    });
    if (r.transformation) {
      if (!r.sortie || !(r.sortie in items)) err(where, `une transformation rend un objet existant : sortie « ${r.sortie} » inconnue`);
      if (!(isInt(r.qteSortie) && r.qteSortie > 0)) err(where, 'qteSortie doit être un entier supérieur à 0');
      if ('conservation' in r) err(where, 'la conservation d\'une transformation se règle sur l\'objet rendu (OBJETS), pas sur la recette');
    } else if (id in items) {
      err(where, `un plat porte le nom de sa recette : « ${id} » est déjà un objet (OBJETS), il serait remplacé. Renommer la recette (comme cafe_boisson)`);
    }
    if (r.cave) {
      needItem(`${where}.cave`, r.cave);
      if (!(data.TONNELET && data.TONNELET.AFFINE[r.cave] === (r.sortie || id))) err(`${where}.cave`, 'la tomme, le moût d\'une recette doit s\'affiner au tonnelet en son produit (TONNELET.AFFINE)');
    }
    if (r.sousProduit) {
      needItem(`${where}.sousProduit`, r.sousProduit.item);
      if (!(isInt(r.sousProduit.qte) && r.sousProduit.qte > 0)) err(`${where}.sousProduit`, 'qte doit être un entier supérieur à 0');
    }
    if (r.energieForcee != null && !(isInt(r.energieForcee) && r.energieForcee > 0)) err(where, 'energieForcee doit être un entier supérieur à 0');
    if (r.coefPrix != null && !(isInt(r.coefPrix) && r.coefPrix > 0)) err(where, 'coefPrix est un pourcentage entier (130 = ×1,3)');
    if (r.libre !== undefined && r.libre !== true) err(where, 'libre vaut true, ou n\'est pas écrit');
    conservation(where, r);
  }

  // Un plat fait avec un autre plat (pain à l'ail) : pas de boucle.
  const etat = {};
  const visiter = (id, chemin) => {
    if (etat[id] === 'fait') return;
    if (etat[id] === 'en cours') {
      err(`RECETTES.${id}`, `recettes en boucle : ${[...chemin, id].join(' → ')}`);
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
    const where = `ARBRE.noeuds.${id}`;
    if (!branches.includes(n.branche)) err(where, `branche « ${n.branche} » inconnue (${branches.join(', ')})`);
    if (!paliers.includes(String(n.palier))) err(where, `palier ${n.palier} inconnu (${paliers.join(', ')})`);
    for (const req of n.requiert || []) {
      if (req.noeud !== undefined && !techtree.noeuds[req.noeud]) err(where, `requiert le nœud « ${req.noeud} », qui n'existe pas`);
      if (req.noeud === id) err(where, 'un nœud ne peut pas se demander lui-même');
      if (req.batiment !== undefined && !techtree.batiments[req.batiment]) err(where, `requiert le bâtiment « ${req.batiment} », absent de ARBRE.batiments`);
      if (req.tuiles !== undefined && !(Number.isInteger(req.tuiles) && req.tuiles > 0)) err(where, 'requiert des tuiles : un entier supérieur à 0');
    }
    for (const [item, qte] of Object.entries(n.ressources || {})) {
      if (!data.OBJETS[item]) err(where, `coûte « ${item} », qui n'existe pas`);
      else if (!(item === 'bois' || item === 'pierre' || data.OBJETS[item].categorie === 'matériau')) err(where, `coûte « ${item} » : bois, pierre ou un matériau (lingot) seulement`);
      if (!(Number.isInteger(qte) && qte > 0)) err(where, `ressource « ${item} » : un entier supérieur à 0`);
    }
    for (const rid of (n.effet && n.effet.recettes) || []) {
      if (!recipes[rid]) err(where, `débloque la recette « ${rid} », qui n'existe pas`);
      (debloqueePar[rid] = debloqueePar[rid] || []).push(id);
    }
  }
  for (const [id, r] of Object.entries(recipes)) {
    const noeuds = debloqueePar[id] || [];
    if (!r.libre && !noeuds.length) err(`RECETTES.${id}`, 'recette inaccessible : ni "libre": true, ni débloquée par un nœud de l\'arbre (effet.recettes)');
    if (r.libre && noeuds.length) warn(`RECETTES.${id}`, `déjà libre : le nœud ${noeuds.join(', ')} ne débloque rien`);
  }

  /* cultures */
  const elements = Object.keys(data.NIVEAUX.ELEMENTS);
  const deblocables = [...elements, ...Object.keys(crops)];
  for (const [id, c] of Object.entries(crops)) {
    const where = `CULTURES.${id}`;
    if (typeof c.nom !== 'string' || !c.nom) err(where, 'nom manquant');
    if (!Array.isArray(c.lieux) || !c.lieux.length || c.lieux.some((l) => !LIEUX.includes(l))) err(where, `lieux doit contenir ${LIEUX.join(' et/ou ')}`);
    for (const champ of ['stades', 'litres', 'rendement']) {
      if (!(isInt(c[champ]) && c[champ] > 0)) err(where, `${champ} doit être un entier supérieur à 0`);
    }
    const recolte = c.produit || id;
    if (!(recolte in items)) err(where, `la récolte « ${recolte} » n'est pas un objet (OBJETS)${c.produit ? '' : ' : ajouter l\'objet, ou le champ "produit"'}`);
    if (c.requiert !== undefined && !elements.includes(c.requiert)) err(where, `requiert « ${c.requiert} » inconnu (NIVEAUX.ELEMENTS)`);
    if (c.vivace !== undefined && !(c.vivace && isInt(c.vivace.stade) && c.vivace.stade >= 1 && c.vivace.stade < c.stades)) err(`${where}.vivace`, `{ stade : celui où le pied revient après la récolte, de 1 à ${c.stades - 1} }`);
    const g = c.graines || {};
    if (!MODES_GRAINES.includes(g.mode)) err(where, `graines.mode « ${g.mode} » inconnu (${MODES_GRAINES.join(', ')})`);
    if (!(g.item in items)) err(where, `graines.item « ${g.item} » n'est pas un objet (OBJETS)`);
    if (g.mode === 'recolte' && !(isInt(g.min) && isInt(g.max) && g.min >= 0 && g.max >= g.min)) err(where, 'graines.min et graines.max : deux entiers, min ≤ max');
    const s = c.sprite;
    if (!s) warn(where, 'pas de sprite : la carte affichera l\'icône à la place d\'un dessin');
    else if (!(isInt(s.r) && s.r >= 0 && isInt(s.l) && isInt(s.h) && s.l >= 16 && s.l <= 48 && s.h >= 16 && s.h <= 64 && Array.isArray(s.c) && [4, 5].includes(s.c.length) && s.c.every(isInt))) {
      err(where, 'sprite : { "r": rangée, "c": [4 ou 5 colonnes, une par phase : la graine d\'abord, la plante mûre en dernier], "l", "h": la taille d\'une case } (scripts/carte/planche_cultures.py)');
    } else if (s.monte !== undefined) err(where, 'sprite.monte : plus de réglage par culture ; les dessins sont alignés (scripts/carte/planche_cultures.py)');
  }

  /* le Champ (deuxième zone de culture) */
  const Z = data.POTAGER.ZONE2;
  if (!Z || typeof Z.ID !== 'string' || !Z.ID || Z.ID === data.POTAGER.LIEU) err('POTAGER.ZONE2', 'ID manquant, ou identique à POTAGER.LIEU (les identifiants des parcelles se confondraient)');
  else {
    if (!(isInt(Z.CASES) && Z.CASES > 0 && isInt(Z.COLONNES) && Z.COLONNES > 0)) err('POTAGER.ZONE2', 'CASES et COLONNES : deux entiers supérieurs à 0');
    if (!elements.includes(Z.DEBLOCAGE)) err('POTAGER.ZONE2', `DEBLOCAGE « ${Z.DEBLOCAGE} » inconnu (NIVEAUX.ELEMENTS)`);
  }

  /* version 1.9 : la grille de la Zone de culture et le plafond de tuiles */
  const P = data.POTAGER;
  if (!(isInt(P.CASES) && P.CASES > 0 && isInt(P.COLONNES) && P.COLONNES > 0)) err('POTAGER', 'CASES et COLONNES : deux entiers supérieurs à 0');
  if (!Array.isArray(P.DEPART) || P.DEPART.some((c, i) => !isInt(c) || c < 0 || c >= P.CASES || P.DEPART.indexOf(c) !== i)) err('POTAGER.DEPART', 'des cases distinctes de la grille');
  if (!(data.HOUE && isInt(data.HOUE.PRIX) && data.HOUE.PRIX >= 0)) err('HOUE', 'PRIX : un entier positif');
  if (!(isInt(data.HACHE && data.HACHE.BOIS) && data.HACHE.BOIS > 0 && isInt(data.HACHE.COUPES) && data.HACHE.COUPES > 0)) err('HACHE', 'BOIS et COUPES : deux entiers supérieurs à 0');
  needItem('HACHE (bois)', 'bois');
  if (!(isInt(data.PIOCHE && data.PIOCHE.PIERRE) && data.PIOCHE.PIERRE > 0 && isInt(data.PIOCHE.COUPS) && data.PIOCHE.COUPS > 0)) err('PIOCHE', 'PIERRE et COUPS : deux entiers supérieurs à 0');
  needItem('PIOCHE (pierre)', 'pierre');
  if (!(isInt(data.PIOCHE && data.PIOCHE.MAIN) && data.PIOCHE.MAIN > 0)) err('PIOCHE.MAIN', 'un entier supérieur à 0 (les pierres d\'un caillou ramassé à la main)');
  const RT = data.PIOCHE && data.PIOCHE.RETOUR;
  if (!(Array.isArray(RT) && RT.length === 2 && RT.every((x) => isInt(x) && x >= 1) && RT[0] <= RT[1])) err('PIOCHE.RETOUR', 'deux entiers [min, max], 1 ≤ min ≤ max');
  const FX = data.FAUX || {};
  if (!(isInt(FX.FIBRE) && FX.FIBRE > 0 && isInt(FX.BOT_TOUFFES) && FX.BOT_TOUFFES > 0)) err('FAUX', 'FIBRE et BOT_TOUFFES : deux entiers supérieurs à 0');
  needItem('FAUX (fibre)', 'fibre');
  const BT = data.BOTTELEUSE || {};
  if (!['FIBRES', 'PAILLE', 'CONVOYEUR', 'VIBRE_S'].every((k) => isInt(BT[k]) && BT[k] > 0)) err('BOTTELEUSE', 'FIBRES, PAILLE, CONVOYEUR et VIBRE_S : des entiers supérieurs à 0');
  for (const piece of ['entonnoir', 'machine', 'convoyeur']) if (!Object.values((data.ATELIER && data.ATELIER.BLOCS) || {}).some((b) => b.botteleuse === piece)) err('BOTTELEUSE', `un bloc de l'Atelier « ${piece} » (ATELIER.BLOCS : botteleuse)`);
  const RF = FX.RETOUR;
  if (!(Array.isArray(RF) && RF.length === 2 && RF.every((x) => isInt(x) && x >= 1) && RF[0] <= RF[1])) err('FAUX.RETOUR', 'deux entiers [min, max], 1 ≤ min ≤ max');
  const CF = data.COUP_FORT || {};
  if (!(isInt(CF.COUPS) && CF.COUPS >= 1 && isInt(CF.ENERGIE) && CF.ENERGIE >= 1)) err('COUP_FORT', 'COUPS et ENERGIE : deux entiers d\'au moins 1');
  const CN = data.CANNE || {};
  if (!(CN.PRISES && typeof CN.PRISES === 'object' && Object.keys(CN.PRISES).length)) err('CANNE.PRISES', 'les chances de prise par eau');
  for (const [eau, p] of Object.entries(CN.PRISES || {})) {
    for (const item of Object.keys(p)) needItem(`CANNE.PRISES.${eau}`, item);
    const total = Object.values(p).reduce((a, b) => a + b, 0);
    if (Object.values(p).some((x) => !isInt(x) || x < 0) || total > 100) err(`CANNE.PRISES.${eau}`, 'des pourcentages entiers, 100 au plus en tout');
    if (!(isInt(CN.JOUR && CN.JOUR[eau]) && CN.JOUR[eau] > 0)) err(`CANNE.JOUR.${eau}`, 'un entier supérieur à 0');
  }
  // les eaux du grand monde (fiche 6b) et ses coins de pêche (CANNE.COINS : leurs chances, leurs prises)
  for (const eau of ['lac', 'riviere', 'mer']) if (!(CN.PRISES && CN.PRISES[eau])) err(`CANNE.PRISES.${eau}`, 'une eau du grand monde (la scène y pêche)');
  const CC = CN.COINS;
  if (CC) {
    if (!(isInt(CC.RAYON) && CC.RAYON >= 1)) err('CANNE.COINS.RAYON', 'un entier supérieur à 0 (des cases)');
    for (const [eau, p] of Object.entries(CC.PRISES || {})) {
      if (!(CN.PRISES && CN.PRISES[eau])) err(`CANNE.COINS.PRISES.${eau}`, 'une eau de CANNE.PRISES');
      for (const item of Object.keys(p)) needItem(`CANNE.COINS.PRISES.${eau}`, item);
      const total = Object.values(p).reduce((a, b) => a + b, 0);
      if (Object.values(p).some((x) => !isInt(x) || x < 0) || total > 100) err(`CANNE.COINS.PRISES.${eau}`, 'des pourcentages entiers, 100 au plus en tout');
      if (!(isInt(CC.JOUR && CC.JOUR[eau]) && CC.JOUR[eau] > 0)) err(`CANNE.COINS.JOUR.${eau}`, 'un entier supérieur à 0');
    }
  }
  for (const k of ['HACHE', 'PIOCHE', 'FAUX']) if (!(data[k] && isInt(data[k].PRIX) && data[k].PRIX >= 0 && data[k].NOM && data[k].ICONE)) err(k, 'NOM, ICONE et PRIX (un entier positif)');
  const TU = data.NIVEAUX.TUILES;
  if (!Array.isArray(TU) || TU.length !== data.NIVEAUX.SEUILS.length || TU.some((x, i) => !isInt(x) || (i > 0 && x < TU[i - 1]))) err('NIVEAUX.TUILES', 'un entier par niveau, jamais en baisse');
  else if (TU[0] < P.DEPART.length) err('NIVEAUX.TUILES', 'le premier plafond doit contenir les tuiles de départ');

  /* le reste : chaque objet cité ailleurs doit exister */
  for (const [id, a] of Object.entries(data.VERGER.ARBRES)) needItem(`VERGER.ARBRES.${id}.fruit`, a.fruit);
  for (const [id, a] of Object.entries(data.ANIMAUX)) {
    for (const champ of ['produit', 'laine', 'lait']) if (a[champ] !== undefined) needItem(`ANIMAUX.${id}.${champ}`, a[champ]);
  }
  for (const id of Object.keys(data.DEPART.ETAT_INITIAL.INVENTAIRE)) needItem('DEPART.ETAT_INITIAL.INVENTAIRE', id);
  for (const id of Object.keys(data.DEPART.INVENTAIRE)) needItem('DEPART.INVENTAIRE', id); // version 1.12
  for (const id of Object.keys(data.FAMILLE.RESERVE_DEPART)) needItem('FAMILY.RESERVE_DEPART', id);
  for (const id of data.MARCHE.TRANSFORMATIONS_DOUBLEES) needItem('MARCHE.TRANSFORMATIONS_DOUBLEES', id);
  for (const id of Object.keys(data.PLATS_RETIRES)) {
    if (exists(id)) err(`PLATS_RETIRES.${id}`, 'ce plat existe encore (OBJETS ou RECETTES) : il n\'est pas retiré');
  }
  // Commerces de la ferme, bonheur, Silo, Étable, joueur simulé.
  // (Les meubles, eux, ne citent aucun objet : rien à vérifier.)
  // La tente du bivouac (le récit, lot 8 : data/equipement.json TENTE) : un objet d'équipement.
  const TE = data.EQUIPEMENT && data.EQUIPEMENT.TENTE;
  if (TE !== undefined) { needItem('EQUIPEMENT.TENTE', TE); if (items[TE] && items[TE].categorie !== 'équipement') err('EQUIPEMENT.TENTE', 'un objet de la catégorie « équipement »'); }
  {
    // A-3 : les palettes (des rampes de couleurs #rrggbb) et les variantes des meubles (la première, celle du
    // dessin, sans `remplace` ; les autres remplacent des rampes par des rampes de même longueur)
    const PAL = data.PALETTES || {};
    for (const [pid, r] of Object.entries(PAL)) if (!(Array.isArray(r) && r.length >= 2 && r.every((c) => /^#[0-9a-f]{6}$/.test(c)))) err(`PALETTES.${pid}`, 'une liste d\'au moins 2 couleurs « #rrggbb » (minuscules)');
    for (const [mid, m] of Object.entries(data.MEUBLES || {})) {
      if (m.variantes === undefined) continue;
      const w = `MEUBLES.${mid}.variantes`;
      if (!(Array.isArray(m.variantes) && m.variantes.length >= 2)) { err(w, 'au moins deux variantes (la première : celle du dessin)'); continue; }
      const ids = new Set();
      m.variantes.forEach((v, i) => {
        const wv = `${w}[${i}]`;
        if (!v || !/^[a-z_]+$/.test(String(v.id || '')) || ids.has(v.id)) err(`${wv}.id`, 'un identifiant (a-z, _) unique');
        ids.add(v && v.id);
        if (!v || typeof v.nom !== 'string' || !v.nom) err(`${wv}.nom`, 'un nom');
        if (!i) { if (v && v.remplace) err(`${wv}.remplace`, 'la première variante est celle du dessin : rien à remplacer'); return; }
        const R = v && v.remplace;
        if (!R || typeof R !== 'object' || !Object.keys(R).length) { err(`${wv}.remplace`, '{ rampe du dessin : rampe de la variante }'); return; }
        for (const [de, vers] of Object.entries(R)) {
          if (!PAL[de] || !PAL[vers]) err(`${wv}.remplace.${de}`, `des rampes de PALETTES (${de} → ${vers})`);
          else if (PAL[de].length !== PAL[vers].length) err(`${wv}.remplace.${de}`, `${de} et ${vers} n'ont pas la même longueur`);
        }
      });
    }
  }
  const B = data.BONHEUR || {};
  for (const item of (B.SPECIALES && B.SPECIALES.objets) || []) needItem('BONHEUR.SPECIALES.objets', item);
  if (data.SILO) needItem('SILO.ITEM', data.SILO.ITEM);
  if (data.PATURAGE) needItem('PATURAGE.NOURRITURE', data.PATURAGE.NOURRITURE);
  const SIM = data.SIMULATION || {};
  if (SIM.DEPANNAGE) needItem('SIMULATION.DEPANNAGE.item', SIM.DEPANNAGE.item);

  /* le plan du grand monde (data/monde.json, lu par js/engine/monde-gen.js) */
  if (data.BIOMES || data.PLAN_MONDE) {
    const BI = data.BIOMES;
    // le générateur nomme ces biomes-là ; leur code est leur place dans la liste (255 : « aucune eau »)
    const attendus = ['mer', 'plage', 'falaise', 'prairie', 'foret', 'marais', 'lande', 'montagne', 'sommet', 'lac', 'riviere'];
    if (!Array.isArray(BI) || BI.length > 254 || new Set(BI).size !== BI.length || !BI.every((b) => typeof b === 'string')) {
      err('BIOMES', 'une liste de noms, chacun une fois (254 au plus)');
    } else {
      for (const b of attendus) if (!BI.includes(b)) err('BIOMES', `« ${b} » manque (le générateur du monde le lit)`);
    }
    const PM = data.PLAN_MONDE || {};
    const fourchette = (cle, v) => {
      if (!(Array.isArray(v) && v.length === 2 && v.every((n) => isInt(n) && n >= 0) && v[0] <= v[1])) err(`PLAN_MONDE.${cle}`, `[au moins, au plus] : deux entiers positifs dans l'ordre ; reçu ${JSON.stringify(v)}`);
    };
    for (const cle of ['RIVIERES', 'LACS', 'HAMEAUX', 'GROTTES']) fourchette(`${cle}.NOMBRE`, (PM[cle] || {}).NOMBRE);
    fourchette('LACS.TAILLE', (PM.LACS || {}).TAILLE);
    const H = PM.HAMEAUX || {};
    if (!(Array.isArray(H.NOMS) && H.NOMS.length && H.NOMS.every((n) => typeof n === 'string' && n))) err('PLAN_MONDE.HAMEAUX.NOMS', 'une liste de noms');
    if (H.GUE !== undefined && !(typeof H.GUE === 'string' && H.GUE)) err('PLAN_MONDE.HAMEAUX.GUE', 'le nom du hameau le plus proche de la ferme');
    // les hameaux garantis du récit : un id, un nom (pas celui du Gué, pas deux fois), un pays, un métier
    const paysOk = ['cote', 'montagne', 'foret', 'lande'], metiers = Object.keys((data.HAMEAUX && data.HAMEAUX.METIERS && data.HAMEAUX.METIERS.NOMS) || {});
    const vusG = new Set([H.GUE]);
    (H.GARANTIS || []).forEach((g, k) => {
      const w = `PLAN_MONDE.HAMEAUX.GARANTIS[${k}]`;
      if (!(typeof g.id === 'string' && g.id && g.id !== 'gue')) err(`${w}.id`, 'un id (pas « gue »)');
      if (!(typeof g.nom === 'string' && g.nom) || vusG.has(g.nom)) err(`${w}.nom`, 'un nom, pris par aucun autre hameau garanti');
      vusG.add(g.nom);
      if (!paysOk.includes(g.pays)) err(`${w}.pays`, `un pays parmi ${paysOk.join(', ')}`);
      if (g.metier !== undefined && !metiers.includes(g.metier)) err(`${w}.metier`, `un métier parmi ${metiers.join(', ')}`);
    });
    const PRc = data.PLAN_MONDE.RECIT || {};
    for (const [lieu, cles] of Object.entries({ CABANE: ['CHEMIN', 'HAMEAU', 'FERME'], ATELIER: ['HAMEAU'], EPAVE: ['HAMEAU'] })) {
      for (const c of cles) if (PRc[lieu] && !(isInt(PRc[lieu][c]) && PRc[lieu][c] >= 0)) err(`PLAN_MONDE.RECIT.${lieu}.${c}`, 'un entier positif ou nul');
    }
    // les bâtisses du récit (la cabane, l'atelier : monde-hameaux.js planBatisse) : un style, une taille, la porte
    // et les fenêtres dans le mur du bas, des meubles et des objets de la planche des hameaux
    const HS = (data.HAMEAUX && data.HAMEAUX.SORTES || []).map((x) => x.nom);
    for (const [id, b] of Object.entries((data.HAMEAUX && data.HAMEAUX.BATISSES) || {})) {
      const w = `HAMEAUX.BATISSES.${id}`;
      if (!((data.HAMEAUX.STYLES || {})[b.style])) err(`${w}.style`, 'un style de HAMEAUX.STYLES');
      if (!(isInt(b.l) && isInt(b.h) && b.l >= 3 && b.h >= 3)) err(w, 'l et h : des entiers, 3 au moins');
      if (!(isInt(b.porte) && b.porte > 0 && b.porte < b.l - 1)) err(`${w}.porte`, 'une colonne du mur du bas, hors des coins');
      for (const x of b.fenetres || []) if (!(isInt(x) && x > 0 && x < b.l - 1 && x !== b.porte)) err(`${w}.fenetres`, 'des colonnes du mur du bas, hors des coins et de la porte');
      for (const [nom, x, y] of [...(b.meubles || []), ...(b.dehors || [])]) {
        if (!HS.includes(nom)) err(w, `« ${nom} » n'est pas une pièce de HAMEAUX.SORTES`);
        if (!(isInt(x) && isInt(y))) err(w, `« ${nom} » : une place en cases entières`);
      }
      for (const [nom, x, y] of b.meubles || []) if (!(x >= 1 && y >= 1 && x < b.l - 1 && y < b.h - 1)) err(w, `« ${nom} » : dedans, hors des murs`);
    }
    for (const so of (data.LIEUX && data.LIEUX.SORTES) || []) {
      if (so.genre !== 'recit') continue;
      if (!(Array.isArray(so.bloque) && so.bloque.every((d) => Array.isArray(d) && d.length === 2 && d.every(isInt)))) err(`LIEUX.SORTES.${so.nom}.bloque`, 'des décalages [colonne, rangée] entiers');
      if (!(Array.isArray(so.boite) && so.boite.length === 2 && so.boite.every((n) => isInt(n) && n > 0))) err(`LIEUX.SORTES.${so.nom}.boite`, '[demi-largeur, hauteur] en px');
    }
    for (const [b, c] of Object.entries((PM.CHEMINS || {}).COUTS || {})) {
      if (b !== 'chemin' && !(Array.isArray(BI) && BI.includes(b))) err('PLAN_MONDE.CHEMINS.COUTS', `« ${b} » n'est pas un biome (BIOMES)`);
      if (!(typeof c === 'number' && c > 0)) err(`PLAN_MONDE.CHEMINS.COUTS.${b}`, `un nombre positif ; reçu ${JSON.stringify(c)}`);
    }
    const S = PM.SEUILS || {};
    if (!(S.MER < S.MONTAGNE && S.MONTAGNE < S.SOMMET)) err('PLAN_MONDE.SEUILS', 'MER < MONTAGNE < SOMMET');
    for (const cle of ['GRILLE', 'SAUT', 'LENT']) if (!(isInt(PM[cle]) && PM[cle] >= 1)) err(`PLAN_MONDE.${cle}`, `un entier supérieur à 0 ; reçu ${JSON.stringify(PM[cle])}`);
  }

  /* la végétation du grand monde (data/monde.json, lue par js/engine/monde-vegetation.js) */
  if (data.VEGETATION) {
    const V = data.VEGETATION, BI = data.BIOMES || [];
    const genres = ['arbre', 'buisson', 'haute', 'basse'];
    // les sols : l'herbe de la prairie, ceux de js/engine/monde-sol.js (SOLS_MONDE.sols), la clairière
    const sols = ['herbe', 'clairiere', 'sable', 'galets', 'eau_basse', 'vase', 'terre', 'lande', 'feuilles', 'aiguilles', 'mousse', 'eboulis', 'roche', 'falaise', 'neige'];
    const noms = new Set();
    for (const [k, s] of (V.SORTES || []).entries()) {
      const ou = `VEGETATION.SORTES[${k}]`;
      if (!s || typeof s.nom !== 'string' || noms.has(s.nom)) { err(ou, 'un nom, chacun une fois'); continue; }
      noms.add(s.nom);
      if (!genres.includes(s.genre)) err(`${ou}.genre`, `l'un de ${genres.join(', ')} ; reçu ${JSON.stringify(s.genre)}`);
      if (!(isInt(s.variantes) && s.variantes >= 1)) err(`${ou}.variantes`, 'un entier positif');
      if (s.teinte && s.variantes % 4) err(`${ou}.variantes`, 'par quatre (une par teinte de l\'herbe)');
      if ((s.genre === 'arbre' || s.genre === 'buisson') && !(Array.isArray(s.bloque) && s.bloque.some(([dx, dy]) => !dx && !dy))) err(`${ou}.bloque`, 'les cases fermées, dont celle du pied [0, 0]');
      if (s.genre !== 'basse' && !(isInt(s.ecart) && s.ecart >= 0 && s.ecart <= 3)) err(`${ou}.ecart`, 'un entier de 0 à 3');
    }
    for (const [b, parSol] of Object.entries(V.DENSITES || {})) {
      if (!BI.includes(b)) err('VEGETATION.DENSITES', `« ${b} » n'est pas un biome (BIOMES)`);
      for (const [sol, parts] of Object.entries(parSol)) {
        if (!sols.includes(sol)) err(`VEGETATION.DENSITES.${b}`, `« ${sol} » n'est pas un sol`);
        let total = 0;
        for (const [nom, p] of Object.entries(parts)) {
          if (!noms.has(nom)) err(`VEGETATION.DENSITES.${b}.${sol}`, `« ${nom} » n'est pas une sorte (SORTES)`);
          if (!(typeof p === 'number' && p > 0)) err(`VEGETATION.DENSITES.${b}.${sol}.${nom}`, 'une part positive');
          total += p;
        }
        if (total > 1) err(`VEGETATION.DENSITES.${b}.${sol}`, `des parts qui font plus que 1 (${total})`);
      }
    }
    // (REMPLACE : une part des images d'une sorte en devient une autre, de mêmes cases fermées et du même écart)
    for (const [i, r] of (V.REMPLACE || []).entries()) {
      const ou = `VEGETATION.REMPLACE[${i}]`, de = V.SORTES.find((s) => s.nom === r.de), vers = V.SORTES.find((s) => s.nom === r.vers);
      if (!BI.includes(r.biome)) err(ou, `« ${r.biome} » n'est pas un biome`);
      if (!(Array.isArray(r.sols) && r.sols.every((sol) => (V.DENSITES[r.biome] || {})[sol] && (V.DENSITES[r.biome][sol][r.de] > 0)))) err(`${ou}.sols`, `des sols du biome où « ${r.de} » pousse`);
      if (!de || !vers) err(ou, 'de, vers : deux sortes (SORTES)');
      else if (JSON.stringify(de.bloque) !== JSON.stringify(vers.bloque) || de.ecart !== vers.ecart || de.genre !== vers.genre) err(ou, `« ${r.vers} » : le même genre, les mêmes cases fermées et le même écart que « ${r.de} »`);
      if (!(typeof r.part === 'number' && r.part > 0 && r.part < 1)) err(`${ou}.part`, 'une part de 0 à 1');
    }
    for (const [b, bornes] of Object.entries(V.BORNES || {})) {
      if (!BI.includes(b)) err('VEGETATION.BORNES', `« ${b} » n'est pas un biome (BIOMES)`);
      for (const q of ['images', 'basses']) if (!(Array.isArray(bornes[q]) && bornes[q].length === 2 && bornes[q][0] <= bornes[q][1])) err(`VEGETATION.BORNES.${b}.${q}`, '[au moins, au plus]');
    }
  }

  /* les rochers, les falaises et la côte du grand monde (data/monde.json, lus par js/engine/monde-roches.js) */
  if (data.ROCHES) {
    const R = data.ROCHES, BI = data.BIOMES || [];
    const genres = ['bloc', 'mer', 'epave', 'paroi', 'basse'];
    const sols = ['herbe', 'haut', 'sable', 'galets', 'eau_basse', 'vase', 'terre', 'lande', 'feuilles', 'aiguilles', 'mousse', 'eboulis', 'roche', 'falaise', 'neige'];
    const noms = new Set();
    for (const [k, s] of (R.SORTES || []).entries()) {
      const ou = `ROCHES.SORTES[${k}]`;
      if (!s || typeof s.nom !== 'string' || noms.has(s.nom)) { err(ou, 'un nom, chacun une fois'); continue; }
      noms.add(s.nom);
      if (!genres.includes(s.genre)) err(`${ou}.genre`, `l'un de ${genres.join(', ')} ; reçu ${JSON.stringify(s.genre)}`);
      if (!(isInt(s.variantes) && s.variantes >= 1)) err(`${ou}.variantes`, 'un entier positif');
      if (s.genre === 'paroi' && s.variantes !== 81) err(`${ou}.variantes`, '81 (3 hauteurs × 9 bouts × 3 tranches)');
      if ((s.genre === 'bloc' || s.genre === 'epave') && !(Array.isArray(s.bloque) && s.bloque.some(([dx, dy]) => !dx && !dy))) err(`${ou}.bloque`, 'les cases fermées, dont celle du pied [0, 0]');
      if ((s.genre === 'bloc' || s.genre === 'mer') && !(isInt(s.ecart) && s.ecart >= 0 && s.ecart <= 3)) err(`${ou}.ecart`, 'un entier de 0 à 3');
    }
    for (const n of ['rocher_mer', 'epave', 'eboulis', 'paroi', 'paroi_herbe', 'paroi_neige']) if (!noms.has(n)) err('ROCHES.SORTES', `« ${n} » manque (monde-roches.js le pose)`);
    for (const [b, parSol] of Object.entries(R.DENSITES || {})) {
      if (!BI.includes(b)) err('ROCHES.DENSITES', `« ${b} » n'est pas un biome (BIOMES)`);
      for (const [sol, parts] of Object.entries(parSol)) {
        if (!sols.includes(sol)) err(`ROCHES.DENSITES.${b}`, `« ${sol} » n'est pas un sol`);
        let total = 0;
        for (const [nom, p] of Object.entries(parts)) {
          const so = (R.SORTES || []).find((x) => x.nom === nom);
          if (!so || !['bloc', 'basse'].includes(so.genre)) err(`ROCHES.DENSITES.${b}.${sol}`, `« ${nom} » n'est pas une sorte posée par les tables (bloc ou basse)`);
          if (!(typeof p === 'number' && p > 0)) err(`ROCHES.DENSITES.${b}.${sol}.${nom}`, 'une part positive');
          total += p;
        }
        if (total > 1) err(`ROCHES.DENSITES.${b}.${sol}`, `des parts qui font plus que 1 (${total})`);
      }
    }
    const paire = (v) => Array.isArray(v) && v.length === 2 && v[0] <= v[1];
    if (!(typeof R.HAUT === 'number' && R.HAUT > 0 && R.HAUT < 1)) err('ROCHES.HAUT', 'un relief de 0 à 1');
    if (!(isInt(R.SOMMET) && R.SOMMET >= 3)) err('ROCHES.SOMMET', 'un entier, 3 au moins (la face des falaises a 3 cases)');
    if (!(R.EBOULIS && paire(R.EBOULIS.PENTE) && R.EBOULIS.PENTE[0] < R.EBOULIS.PENTE[1])) err('ROCHES.EBOULIS.PENTE', '[de, à]');
    if (!(R.MER && paire(R.MER.DISTANCE) && R.MER.DISTANCE[1] <= 4 && paire(R.MER.TACHES))) err('ROCHES.MER', 'DISTANCE [au moins, au plus 4], TACHES [de, à]');
    if (!(R.PAROIS && isInt(R.PAROIS.EAU) && isInt(R.PAROIS.TERRE) && R.PAROIS.EAU >= 0 && R.PAROIS.TERRE <= 16)) err('ROCHES.PAROIS', 'EAU, TERRE : des px de 0 à 16');
    for (const [b, bornes] of Object.entries(R.BORNES || {})) {
      if (!BI.includes(b)) err('ROCHES.BORNES', `« ${b} » n'est pas un biome (BIOMES)`);
      for (const q of ['images', 'basses']) if (!paire(bornes[q])) err(`ROCHES.BORNES.${b}.${q}`, '[au moins, au plus]');
    }
  }

  /* les hameaux bâtis du grand monde (data/monde.json, lus par js/engine/monde-hameaux.js) */
  if (data.HAMEAUX) {
    const HA = data.HAMEAUX, genres = ['mur', 'porte', 'meuble', 'barriere', 'objet', 'arbre', 'basse'];
    const paire = (v) => Array.isArray(v) && v.length === 2 && v.every((n) => isInt(n) && n >= 0) && v[0] <= v[1];
    for (const cle of ['MAISONS', 'LARGEUR', 'HAUTEUR', 'JARDINS']) if (!paire(HA[cle])) err(`HAMEAUX.${cle}`, '[au moins, au plus] : deux entiers positifs dans l\'ordre');
    if (paire(HA.MAISONS) && HA.MAISONS[0] < 1) err('HAMEAUX.MAISONS', 'une maison au moins');
    if (paire(HA.LARGEUR) && HA.LARGEUR[0] < 5) err('HAMEAUX.LARGEUR', '5 cases au moins (des murs, une pièce de trois cases)');
    if (paire(HA.HAUTEUR) && HA.HAUTEUR[0] < 5) err('HAMEAUX.HAUTEUR', '5 cases au moins');
    for (const cle of ['RAYON', 'PLACE', 'ESSAIS', 'RUELLE', 'CHAMBRE', 'DEUX_CHAMBRES', 'VERGER', 'TAS', 'RESERVE', 'LIEUX', 'AGRANDI']) if (!(isInt(HA[cle]) && HA[cle] >= 0)) err(`HAMEAUX.${cle}`, `un entier positif ; reçu ${JSON.stringify(HA[cle])}`);
    const noms = new Map();
    for (const [k, s2] of (HA.SORTES || []).entries()) {
      const ou = `HAMEAUX.SORTES[${k}]`;
      if (!s2 || typeof s2.nom !== 'string' || noms.has(s2.nom)) { err(ou, 'un nom, chacun une fois'); continue; }
      noms.set(s2.nom, s2);
      if (!genres.includes(s2.genre)) err(`${ou}.genre`, `l'un de ${genres.join(', ')} ; reçu ${JSON.stringify(s2.genre)}`);
      if (!(isInt(s2.variantes) && s2.variantes >= 1)) err(`${ou}.variantes`, 'un entier positif');
      if (s2.genre === 'mur' && s2.variantes !== 16) err(`${ou}.variantes`, '16 (le masque des murs voisins)');
    }
    for (const n of HA.BLOQUE || []) if (!noms.has(n)) err('HAMEAUX.BLOQUE', `« ${n} » n'est pas une sorte (SORTES)`);
    for (const [st, S] of Object.entries(HA.STYLES || {})) {
      for (const k of ['mur_', 'fenetre_', 'porte_']) if (!noms.has(k + S.mur)) err(`HAMEAUX.STYLES.${st}.mur`, `« ${k}${S.mur} » manque (SORTES)`);
      if (!noms.has(S.sol) || !noms.has(S.foyer)) err(`HAMEAUX.STYLES.${st}`, 'son sol et son foyer : des sortes (SORTES)');
      if (!['tuiles', 'ardoise', 'chaume', 'roseaux'].includes(S.toit)) err(`HAMEAUX.STYLES.${st}.toit`, 'tuiles, ardoise, chaume ou roseaux (CarteKit.toit)');
      if (!['terre', 'paves'].includes(S.place)) err(`HAMEAUX.STYLES.${st}.place`, 'terre ou paves');
    }
    if (!HA.STYLES || !HA.STYLES.prairie) err('HAMEAUX.STYLES', '« prairie » manque (le style par défaut)');
    for (const k of (HA.CARACTERE && HA.CARACTERE.ORDRE) || []) if (!(HA.STYLES || {})[k] || !(HA.CARACTERE.SEUILS[k] > 0)) err('HAMEAUX.CARACTERE', `« ${k} » : un style et un seuil positif`);
    const metiers = (HA.METIERS && HA.METIERS.ORDRE) || [];
    if (!metiers.includes('cueilleur')) err('HAMEAUX.METIERS.ORDRE', '« cueilleur » (le métier par défaut) manque');
    for (const mt of metiers) {
      const t = (HA.TRAVAIL || {})[mt];
      if (!t || !['atelier', 'ponton', 'enclos'].includes(t.lieu) || !Array.isArray(t.pieces) || t.pieces.some((n) => !noms.has(n))) err(`HAMEAUX.TRAVAIL.${mt}`, 'son lieu (atelier, ponton, enclos) et ses pièces (des sortes)');
    }
  }

  /* s'orienter : le vu, le rayon de vue, la boussole (data/monde.json, lus par js/engine/monde-vu.js : fiche 8) */
  if (data.DECOUVERTE) {
    const D = data.DECOUVERTE, BI = data.BIOMES || [];
    // (une cellule divise une région du monde : MONDE.REGION, 64 cases)
    if (!(isInt(D.CELLULE) && D.CELLULE >= 2 && 64 % D.CELLULE === 0)) err('DECOUVERTE.CELLULE', 'un entier qui divise 64 (la taille des régions)');
    for (const cle of ['MARGE_FERME', 'ARRIVEE']) if (!(isInt(D[cle]) && D[cle] >= 0)) err(`DECOUVERTE.${cle}`, 'un entier positif ou nul');
    for (const cle of ['RAYON', 'RAYON_MIN']) if (!(typeof D[cle] === 'number' && D[cle] > 0 && D[cle] <= 40)) err(`DECOUVERTE.${cle}`, 'un nombre de cases, de 0 à 40');
    // (les biomes du générateur, et ceux de BIOMES)
    const connus = new Set(['mer', 'plage', 'falaise', 'prairie', 'foret', 'marais', 'lande', 'montagne', 'sommet', 'lac', 'riviere'].concat(Array.isArray(BI) ? BI : []));
    for (const [b, r] of Object.entries(D.RAYONS || {})) {
      if (!connus.has(b)) err('DECOUVERTE.RAYONS', `« ${b} » n'est pas un biome (BIOMES)`);
      if (!(typeof r === 'number' && r >= D.RAYON_MIN && r <= 40)) err(`DECOUVERTE.RAYONS.${b}`, 'un nombre de cases, de RAYON_MIN à 40');
    }
    if (!(typeof D.NUIT === 'number' && D.NUIT > 0 && D.NUIT <= 1)) err('DECOUVERTE.NUIT', 'un facteur, de 0 à 1');
  }
  // Les plans des meubles de collection (data/plans.json, js/engine/plans.js) : des blocs dont la recette a « plan ».
  if (data.PLANS) {
    const R = (data.ATELIER && data.ATELIER.RECETTES) || {}, vus = new Set();
    for (const [cid, c] of Object.entries(data.PLANS.COLLECTIONS || {})) {
      if (!Array.isArray(c.plans) || !c.plans.length) err(`PLANS.COLLECTIONS.${cid}.plans`, 'une liste de meubles');
      for (const id of c.plans || []) {
        if (!R[id] || !R[id].plan) err(`PLANS.COLLECTIONS.${cid}.plans`, `« ${id} » : il lui faut une recette de l'Atelier avec « plan »`);
        if (vus.has(id)) err(`PLANS.COLLECTIONS.${cid}.plans`, `« ${id} » est déjà dans une autre collection`);
        vus.add(id);
      }
    }
    for (const [id, r] of Object.entries(R)) if (r.plan && !vus.has(id)) err(`ATELIER.RECETTES.${id}.plan`, 'un plan qu\'aucune collection ne donne (PLANS.COLLECTIONS)');
  }
  // Les styles d'aménagement (data/styles.json, js/engine/styles.js) : des blocs de l'Atelier, un style chacun.
  if (data.STYLES) {
    const S = data.STYLES, B = (data.ATELIER && data.ATELIER.BLOCS) || {}, vu = new Map();
    for (const [id, st] of Object.entries(S.LISTE || {})) {
      if (!st.nom || !st.icone) err(`STYLES.LISTE.${id}`, 'il lui faut un nom et une icône');
      for (const b of st.blocs || []) {
        if (!B[b]) err(`STYLES.LISTE.${id}.blocs`, `« ${b} » n'est pas un bloc de l'Atelier (ATELIER.BLOCS)`);
        if (vu.has(b)) err(`STYLES.LISTE.${id}.blocs`, `« ${b} » a déjà le style « ${vu.get(b)} »`);
        vu.set(b, id);
      }
    }
    for (const [biome, L] of Object.entries(S.BIOMES || {})) for (const st of L) if (!(S.LISTE || {})[st]) err(`STYLES.BIOMES.${biome}`, `« ${st} » n'est pas un style`);
  }
  // L'amitié (data/amitie.json, js/engine/amitie.js) : les objets nommés existent, les nombres sont sensés.
  if (data.AMITIE) {
    const AM = data.AMITIE;
    const sortes = ['adore', 'aime', 'deteste'];
    const liste = (where, l) => {
      if (!Array.isArray(l)) { err(where, 'une liste d\'objets'); return; }
      for (const it of l) needItem(where, it);
    };
    for (const k of [...sortes, 'neutre']) if (typeof (AM.CADEAU || {})[k] !== 'number') err(`AMITIE.CADEAU.${k}`, 'un nombre');
    for (const k of sortes) if (!(isInt((AM.GOUTS || {})[k]) && AM.GOUTS[k] >= 0)) err(`AMITIE.GOUTS.${k}`, 'un entier positif');
    for (const [m, g] of Object.entries(AM.METIERS || {})) for (const k of sortes) liste(`AMITIE.METIERS.${m}.${k}`, g[k]);
    for (const k of sortes) liste(`AMITIE.COMMUN.${k}`, (AM.COMMUN || {})[k]);
    for (const [m, t] of Object.entries((AM.RETOUR && AM.RETOUR.PRESENTS) || {})) for (const [it, v] of Object.entries(t)) {
      needItem(`AMITIE.RETOUR.PRESENTS.${m}`, it);
      if (!(Array.isArray(v) && v.length === 2 && v.every((n) => isInt(n) && n >= 1) && v[0] <= v[1])) err(`AMITIE.RETOUR.PRESENTS.${m}.${it}`, '[de, à] : deux entiers, 1 ou plus, dans l\'ordre');
    }
    // (fiche I7c : l'échelle de l'amitié, la même que celle du récit tant qu'il est là ; les villageois de l'île la lisent ici)
    const E = AM.ECHELLE || {};
    if (!(isInt(E.MAX) && E.MAX > 0)) err('AMITIE.ECHELLE.MAX', 'un entier positif');
    if (!Array.isArray(E.PALIERS) || E.PALIERS[0] !== 0 || E.PALIERS.some((x, i) => !isInt(x) || (i > 0 && x <= E.PALIERS[i - 1]) || x > E.MAX)) err('AMITIE.ECHELLE.PALIERS', 'des entiers croissants, le premier à 0, jusqu\'à MAX');
    if (!Array.isArray(E.NOMS) || !Array.isArray(E.PALIERS) || E.NOMS.length !== E.PALIERS.length || E.NOMS.some((n) => typeof n !== 'string' || !n)) err('AMITIE.ECHELLE.NOMS', 'un nom par palier');
    const paliers = (E.PALIERS || []).length;
    for (const k of ['REMISE', 'DELAI']) if (!(Array.isArray(AM[k]) && AM[k].length === paliers && AM[k].every((n) => isInt(n) && n >= 0))) err(`AMITIE.${k}`, `un entier positif par palier (${paliers})`);
  }
  if (data.HABITANTS) {
    const HB = data.HABITANTS, paire = (v) => Array.isArray(v) && v.length === 2 && v.every((n) => isInt(n) && n >= 0) && v[0] <= v[1];
    for (const cle of ['ADULTES', 'ENFANTS']) if (!paire(HB[cle])) err(`HABITANTS.${cle}`, '[au moins, au plus] : deux entiers positifs dans l\'ordre');
    if (paire(HB.ADULTES) && (HB.ADULTES[0] < 1 || HB.ADULTES[1] > 2)) err('HABITANTS.ADULTES', 'un ou deux adultes par foyer');
    for (const cle of ['ARGENT', 'JOURNAL', 'RATTRAPAGE', 'GARDE', 'RESERVE_MAX']) if (!(isInt(HB[cle]) && HB[cle] >= 0)) err(`HABITANTS.${cle}`, 'un entier positif');
    for (const cle of ['SEUL', 'TRISTE', 'HEUREUX']) if (!(typeof HB[cle] === 'number' && HB[cle] >= 0 && HB[cle] <= 100)) err(`HABITANTS.${cle}`, 'de 0 à 100');
    const S = HB.SECOND || {};
    if (!(S.MEME >= 0 && S.AUTRE >= 0 && S.MEME + S.AUTRE <= 100)) err('HABITANTS.SECOND', 'MEME et AUTRE : des % dont la somme ne passe pas 100');
    const metiers = (data.HAMEAUX && data.HAMEAUX.METIERS && data.HAMEAUX.METIERS.ORDRE) || [];
    for (const mt of S.METIERS || []) if (!metiers.includes(mt)) err('HABITANTS.SECOND.METIERS', `« ${mt} » n'est pas un métier (HAMEAUX.METIERS.ORDRE)`);
    for (const g of ['f', 'm']) {
      const L = (HB.PRENOMS || {})[g] || [];
      if (L.length < 20 || new Set(L).size !== L.length || L.some((n) => typeof n !== 'string' || !n || n.length > 12)) err(`HABITANTS.PRENOMS.${g}`, 'au moins 20 prénoms différents, de 12 lettres au plus');
      for (const age of ['adulte', 'enfant']) {
        const P = ((HB.PERSOS || {})[age] || {})[g] || [], max = data.FAMILLE.PROFIL[age === 'adulte' ? 'PERSOS' : 'PERSOS_ENFANT'];
        if (!P.length || P.some((n) => !isInt(n) || n < 1 || n > max) || new Set(P).size !== P.length) err(`HABITANTS.PERSOS.${age}.${g}`, `des personnages de 1 à ${max}, chacun une fois`);
      }
    }
    const gestes = ['couper', 'pecher', 'piocher', 'traire', 'cueillir'];
    for (const mt of metiers) {
      const M = (HB.METIERS || {})[mt], ou = `HABITANTS.METIERS.${mt}`;
      if (!M) { err(ou, 'manque : chaque métier des hameaux a ses habitants'); continue; }
      if (!M.nom || !M.nom.f || !M.nom.m) err(`${ou}.nom`, '{ f, m }');
      if (!gestes.includes(M.geste)) err(`${ou}.geste`, `l'un de ${gestes.join(', ')}`);
      if (!(isInt(M.ACTIONS) && M.ACTIONS >= 1)) err(`${ou}.ACTIONS`, 'un entier positif');
      for (const [item, q] of Object.entries(M.donne || {})) { needItem(`${ou}.donne`, item); if (!paire(q) || q[0] < 1) err(`${ou}.donne.${item}`, '[au moins, au plus], 1 au moins'); }
      for (const [eau, t] of Object.entries(M.une_de || {})) {
        if (!['*', 'mer', 'lac', 'riviere'].includes(eau)) err(`${ou}.une_de`, `« ${eau} » : *, mer, lac ou riviere`);
        for (const [item, w] of Object.entries(t || {})) { needItem(`${ou}.une_de.${eau}`, item); if (!(w > 0)) err(`${ou}.une_de.${eau}.${item}`, 'un poids positif'); }
      }
      if (M.une_de && !paire(M.nombre)) err(`${ou}.nombre`, '[au moins, au plus]');
      if (!M.donne && !M.une_de) err(ou, 'ce que donne une action : donne ou une_de');
      for (const [item, p] of Object.entries(M.chance || {})) { needItem(`${ou}.chance`, item); if (!(p > 0 && p <= 100)) err(`${ou}.chance.${item}`, 'un % de 0 à 100'); }
      for (const r of M.RECETTES || []) if (!(data.RECETTES || {})[r]) err(`${ou}.RECETTES`, `« ${r} » n'est pas une recette`);
    }
    for (const r of (HB.JARDINIER && HB.JARDINIER.RECETTES) || []) if (!(data.RECETTES || {})[r]) err('HABITANTS.JARDINIER.RECETTES', `« ${r} » n'est pas une recette`);
    const J = HB.JARDIN || {};
    for (const cle of ['FOYER', 'JARDINIER', 'POTAGER', 'VERGER', 'OEUFS']) if (!paire(J[cle])) err(`HABITANTS.JARDIN.${cle}`, '[au moins, au plus]');
    for (const cle of ['LEGUMES', 'FRUITS']) for (const [item, w] of Object.entries(J[cle] || {})) { needItem(`HABITANTS.JARDIN.${cle}`, item); if (!(w > 0) || !(data.OBJETS[item] || {}).mangeable) err(`HABITANTS.JARDIN.${cle}.${item}`, 'un aliment, un poids positif'); }
    const HO = HB.HORAIRE || {}, ordre = ['LEVER', 'TRAVAIL', 'MIDI', 'REPRISE', 'RENTREE', 'COUCHER'];
    if (!ordre.every((k, i) => typeof HO[k] === 'number' && (!i || HO[k] > HO[ordre[i - 1]]))) err('HABITANTS.HORAIRE', `${ordre.join(' < ')}, en heures`);
    const P = HB.PHRASES || {};
    for (const [cle, liste] of [['salut', ['matin', 'jour', 'soir', 'nuit']], ['activite', ['dort', 'maison', 'chemin', 'joue', 'repas', 'rentre', 'soir']], ['travail', [...metiers, 'jardinier']], ['humeur', ['heureux', 'content', 'triste', 'faim']]]) {
      for (const k of liste) if (!(Array.isArray((P[cle] || {})[k]) && P[cle][k].length && P[cle][k].every((t) => typeof t === 'string' && t))) err(`HABITANTS.PHRASES.${cle}.${k}`, 'des phrases');
    }
  }

  /* ce que donne chaque pièce du grand monde (data/monde.json, lu par js/engine/monde-recolte.js) */
  if (data.RECOLTE) {
    const RC = data.RECOLTE, gestes = ['couper', 'casser', 'faucher', 'cueillir', 'ramasser'];
    const toutes = [...((data.VEGETATION && data.VEGETATION.SORTES) || []), ...((data.ROCHES && data.ROCHES.SORTES) || [])];
    if (!(isInt(RC.PORTEE) && RC.PORTEE > 0)) err('RECOLTE.PORTEE', 'un entier positif (des cases)');
    // (une règle, et son second geste `aussi` : le châtaignier se coupe et se cueille)
    const regles = [];
    for (const [nom, r] of Object.entries(RC.SORTES || {})) {
      regles.push([nom, r, `RECOLTE.SORTES.${nom}`]);
      if (r.aussi !== undefined) {
        if (!r.aussi || typeof r.aussi !== 'object' || r.aussi.geste === r.geste || r.aussi.aussi !== undefined) err(`RECOLTE.SORTES.${nom}.aussi`, 'un second geste (une règle, d\'un autre geste, sans aussi)');
        else regles.push([nom, r.aussi, `RECOLTE.SORTES.${nom}.aussi`]);
      }
    }
    for (const [nom, r, ou] of regles) {
      const so = toutes.find((x) => x.nom === nom);
      if (!so) { err(ou, `« ${nom} » n'est pas une sorte du monde (VEGETATION.SORTES, ROCHES.SORTES)`); continue; }
      if (['paroi', 'mer', 'epave'].includes(so.genre)) err(ou, `une ${so.genre} reste du décor`);
      if (!gestes.includes(r.geste)) err(`${ou}.geste`, `l'un de ${gestes.join(', ')} ; reçu ${JSON.stringify(r.geste)}`);
      const frappe = r.geste === 'couper' || r.geste === 'casser';
      if (frappe ? !(isInt(r.coups) && r.coups >= 1) : r.coups !== undefined) err(`${ou}.coups`, frappe ? 'un entier positif' : 'seulement pour couper ou casser');
      if (r.coup !== undefined && !frappe) err(`${ou}.coup`, 'seulement pour couper ou casser');
      for (const [item, n] of Object.entries(r.coup || {})) { needItem(`${ou}.coup`, item); if (!(isInt(n) && n >= 1)) err(`${ou}.coup.${item}`, 'un entier positif'); }
      if (!(r.fin && Object.keys(r.fin).length)) err(`${ou}.fin`, 'ce qu\'elle donne : { objet: [au moins, au plus] }');
      for (const [item, q] of Object.entries(r.fin || {})) { needItem(`${ou}.fin`, item); if (!(Array.isArray(q) && q.length === 2 && isInt(q[0]) && isInt(q[1]) && q[0] >= 1 && q[0] <= q[1])) err(`${ou}.fin.${item}`, '[au moins, au plus], des entiers positifs'); }
      for (const [item, p] of Object.entries(r.chance || {})) { needItem(`${ou}.chance`, item); if (!(typeof p === 'number' && p > 0 && p <= 100)) err(`${ou}.chance.${item}`, 'un % de 0 à 100'); }
      if (!(Array.isArray(r.retour) && r.retour.length === 2 && isInt(r.retour[0]) && r.retour[0] >= 1 && r.retour[0] <= r.retour[1])) err(`${ou}.retour`, '[au moins, au plus] jours, 1 au moins');
      // (au sol, la scène dessine le bois, la pierre, la fibre, les graines d'arbre et les minerais : js/carte/nature.js, MORCEAUX)
      const AU_SOL = ['bois', 'pierre', 'fibre', 'pomme_de_pin', 'gland', 'minerai_fer', 'minerai_cuivre', 'minerai_or', 'minerai_platine', 'quartz', 'amethyste'];
      if (r.geste !== 'cueillir' && r.geste !== 'ramasser') for (const item of [...Object.keys(r.coup || {}), ...Object.keys(r.fin || {}), ...Object.keys(r.chance || {})]) if (!AU_SOL.includes(item)) err(ou, `« ${item} » tomberait au sol, qui n'a pas son image (${AU_SOL.join(', ')})`);
      if (r.minerai !== undefined && !(r.geste === 'casser' && DATA_MINERAIS.includes(r.minerai))) err(`${ou}.minerai`, `un gisement : casser, et un minerai (${DATA_MINERAIS.join(', ')})`);
      if (r.geste === 'cueillir') {
        if (!(Array.isArray(r.variantes) && r.variantes.length && r.variantes.every((v) => isInt(v) && v >= 0 && v < so.variantes))) err(`${ou}.variantes`, `des variantes de la sorte (0 à ${so.variantes - 1})`);
        if (!(isInt(r.apres) && r.apres >= 0 && r.apres < so.variantes)) err(`${ou}.apres`, `une variante de la sorte (0 à ${so.variantes - 1})`);
      } else if (r.variantes !== undefined || r.apres !== undefined) err(ou, 'variantes et apres : seulement pour cueillir');
      if (r.geste === 'faucher' && so.genre !== 'basse' && so.genre !== 'haute') err(`${ou}.geste`, 'on ne fauche qu\'une petite plante ou une plante haute');
      if ((r.geste === 'couper' || r.geste === 'casser') && !(Array.isArray(so.bloque) && so.bloque.length)) err(`${ou}.geste`, 'on ne coupe ou ne casse qu\'une pièce qui ferme sa case (bloque)');
    }
  }

  /* arbre des technologies : chaque clé d'effet est lue par le moteur */
  for (const [id, n] of Object.entries(techtree.noeuds)) {
    for (const cle of Object.keys(n.effet || {})) {
      if (!EFFETS_TECHNO.includes(cle)) err(`ARBRE.noeuds.${id}.effet`, `« ${cle} » : aucun code du moteur ne lit cette clé (EFFETS_TECHNO, scripts/lib/data.mjs)`);
    }
  }

  /* chaque objet s'obtient d'une façon ou d'une autre (avertissement seulement) */
  // L'Atelier de la ferme générée : sa construction, ses recettes, ce qui se ramasse.
  const A = data.ATELIER;
  if (A) {
    for (const item of Object.keys(A.CONSTRUCTION || {})) needItem('ATELIER.CONSTRUCTION', item);
    for (const [rid, r] of Object.entries(A.RECETTES || {})) {
      for (const [item, n] of Object.entries(r.entrees || {})) { needItem(`ATELIER.RECETTES.${rid}.entrees`, item); if (!isInt(n) || n <= 0) err(`ATELIER.RECETTES.${rid}.entrees.${item}`, 'une quantité entière positive'); }
      for (const item of Object.keys(r.sortie || {})) needItem(`ATELIER.RECETTES.${rid}.sortie`, item);
      // (fiche 7c : ce que vendait le Marché se fabrique ici : un outil, un animal qu'on attire, le
      // cheval, un meuble ; la sacoche du cheval, js/engine/cheval.js)
      const effets = ['sortie', 'outil', 'animal', 'cheval', 'meuble', 'sacoche'].filter((k) => r[k]);
      if (effets.length !== 1) err(`ATELIER.RECETTES.${rid}`, 'une sortie, un outil, un animal, le cheval, un meuble ou la sacoche du cheval (l\'un des six)');
      if (r.outil && !['houe', 'hache', 'pioche', 'faux', 'canne'].includes(r.outil)) err(`ATELIER.RECETTES.${rid}.outil`, 'houe, hache, pioche, faux ou canne');
      if (r.animal && !['poule', 'mouton', 'vache'].includes(r.animal)) err(`ATELIER.RECETTES.${rid}.animal`, 'poule, mouton ou vache');
      if (r.meuble && !(data.MEUBLES && data.MEUBLES[r.meuble])) err(`ATELIER.RECETTES.${rid}.meuble`, `« ${r.meuble} » n'est pas un meuble (MEUBLES)`);
      if (r.debloque && !(data.NIVEAUX && data.NIVEAUX.ELEMENTS && data.NIVEAUX.ELEMENTS[r.debloque]) && !(data.CULTURES && data.CULTURES[r.debloque])) err(`ATELIER.RECETTES.${rid}.debloque`, `« ${r.debloque} » n'est pas un élément des niveaux`);
      if ((r.animal || r.cheval || r.meuble || r.sacoche) && typeof r.nom !== 'string' && !r.meuble) err(`ATELIER.RECETTES.${rid}.nom`, 'le nom de la recette (elle ne donne pas d\'objet)');
    }
    for (const [bid, b] of Object.entries(A.BLOCS || {})) {
      if (b.objet) needItem(`ATELIER.BLOCS.${bid}.objet`, b.objet);
      if (b.station && !(data.STATIONS && data.STATIONS[b.station])) err(`ATELIER.BLOCS.${bid}.station`, `« ${b.station} » n'est pas une station (STATIONS)`);
    }
    for (const [rid, r] of Object.entries(A.RAMASSAGE || {})) {
      needItem(`ATELIER.RAMASSAGE.${rid}.objet`, r.objet);
      if (!isInt(r.nombre) || r.nombre < 0) err(`ATELIER.RAMASSAGE.${rid}.nombre`, 'un entier positif ou nul');
      if (r.quantite !== undefined && (!isInt(r.quantite) || r.quantite < 1)) err(`ATELIER.RAMASSAGE.${rid}.quantite`, 'un entier au moins égal à 1');
    }
  }
  // Fiche 11 : l'équipement de la famille et les sacs à provisions (data/equipement.json).
  const E = data.EQUIPEMENT;
  if (E) {
    if (!isInt(E.CASES) || E.CASES < 1) err('EQUIPEMENT.CASES', 'un entier au moins égal à 1');
    const places = Object.keys(E.PLACES || {});
    const actions = Object.keys((data.PERSONNAGE && data.PERSONNAGE.COUTS) || {});
    const biomes = Object.keys((data.DECOUVERTE && data.DECOUVERTE.RAYONS) || {});
    const pct = (where, v) => { if (!(typeof v === 'number' && v > 0 && v <= 300)) err(where, 'un pourcentage (de 1 à 300)'); };
    for (const [id, p] of Object.entries(E.PIECES || {})) {
      const where = `EQUIPEMENT.PIECES.${id}`;
      if (!items[id]) err(where, `« ${id} » n'est pas un objet (OBJETS)`);
      else if (items[id].categorie !== 'équipement') err(where, 'son objet doit être de la catégorie « équipement »');
      if (!places.includes(p.place)) err(`${where}.place`, `une place parmi ${places.join(', ')}`);
      if (typeof p.enfant !== 'boolean') err(`${where}.enfant`, 'true ou false');
      for (const [a, v] of Object.entries(p.economie || {})) {
        if (!actions.includes(a)) err(`${where}.economie.${a}`, 'un geste de PERSONNAGE.COUTS');
        if (!(isInt(v) && v > 0 && v < 100)) err(`${where}.economie.${a}`, 'un pourcentage entier (1 à 99)');
      }
      if (p.toutes !== undefined && !(isInt(p.toutes) && p.toutes > 0 && p.toutes < 100)) err(`${where}.toutes`, 'un pourcentage entier (1 à 99)');
      if (p.soleil !== undefined && !(Array.isArray(p.soleil) && p.soleil.length === 2 && p.soleil[0] < p.soleil[1])) err(`${where}.soleil`, '[de, à] heures');
      for (const [b, v] of Object.entries(p.pied || {})) { if (!biomes.includes(b)) err(`${where}.pied.${b}`, 'un biome de DECOUVERTE.RAYONS'); pct(`${where}.pied.${b}`, v); }
      for (const k of ['vueNuit']) if (p[k] !== undefined) pct(`${where}.${k}`, p[k]);
      for (const k of ['faimMarche', 'faimAide']) if (p[k] !== undefined && !(isInt(p[k]) && p[k] > 0 && p[k] < 100)) err(`${where}.${k}`, 'un pourcentage entier (1 à 99)');
    }
    for (const [id, sac] of Object.entries(E.SACS || {})) {
      if (!items[id]) err(`EQUIPEMENT.SACS.${id}`, `« ${id} » n'est pas un objet (OBJETS)`);
      if (!isInt(sac.portions) || sac.portions < 1) err(`EQUIPEMENT.SACS.${id}.portions`, 'un entier au moins égal à 1');
      if (E.PIECES && E.PIECES[id]) err(`EQUIPEMENT.SACS.${id}`, 'un sac n\'est pas une pièce d\'équipement');
    }
    for (const [id, it] of Object.entries(items)) {
      if (it.categorie === 'équipement' && !(E.PIECES && E.PIECES[id]) && !(E.SACS && E.SACS[id]) && E.TENTE !== id) err(`OBJETS.${id}`, 'un équipement sans réglage (EQUIPEMENT.PIECES, SACS ou TENTE)');
    }
    const S = data.DIDACTICIEL && data.DIDACTICIEL.SAC;
    if (S) {
      if (!(E.SACS && E.SACS[S.objet])) err('DIDACTICIEL.SAC.objet', 'un sac de EQUIPEMENT.SACS');
      for (const item of Object.keys(S.provisions || {})) if (!(items[item] && items[item].mangeable)) err(`DIDACTICIEL.SAC.provisions.${item}`, 'un aliment');
    }
  }
  for (const id of Object.keys(items)) {
    if (!sourcesOf(data, id).length) warn(`OBJETS.${id}`, 'aucun moyen de l\'obtenir (ni récolte, ni recette, ni animal, ni pêche, ni sortie, ni achat, ni inventaire de départ…)');
  }
  /* niveaux (version 1.7) : chaque élément ou culture débloqué une seule fois */
  const N = data.NIVEAUX;
  if (!Array.isArray(N.SEUILS) || N.SEUILS[0] !== 0 || N.SEUILS.some((x, i) => !isInt(x) || (i > 0 && x <= N.SEUILS[i - 1]))) err('NIVEAUX.SEUILS', 'des entiers croissants, le premier à 0');
  if (!Array.isArray(N.liste) || N.liste.length !== N.SEUILS.length) err('NIVEAUX.liste', 'un niveau par seuil');
  const vus = new Set();
  (N.liste || []).forEach((niv, i) => {
    for (const e of niv.debloque || []) {
      if (!deblocables.includes(e)) err(`NIVEAUX.liste[${i}]`, `debloque « ${e} » : ni un élément (NIVEAUX.ELEMENTS) ni une culture`);
      if (vus.has(e)) err(`NIVEAUX.liste[${i}]`, `« ${e} » est déjà débloqué par un autre niveau`);
      vus.add(e);
    }
  });
  // (une culture qu'aucun niveau ne cite est disponible dès le niveau 1)
  // le lot 6 : la récompense d'un chapitre (des plans de meubles de collection, des objets)
  const plansCollections = new Set(Object.values((data.PLANS && data.PLANS.COLLECTIONS) || {}).flatMap((c) => c.plans || []));
  data.CHAPITRES.liste.forEach((ch, i) => {
    const r = ch.recompense, where = `CHAPITRES.liste[${i}].recompense`;
    if (r === undefined) return;
    for (const id of r.plans || []) if (!plansCollections.has(id)) err(where, `${id} : un meuble d'une collection de plans`);
    for (const [id, n] of Object.entries(r.objets || {})) {
      if (!items[id]) err(where, `${id} : un objet inconnu`);
      if (!(isInt(n) && n > 0)) err(where, `${id} : un nombre entier positif`);
    }
  });
  if (!Array.isArray(N.CHAPITRES_XP) || N.CHAPITRES_XP.length !== data.CHAPITRES.liste.length) err('NIVEAUX.CHAPITRES_XP', 'un nombre par chapitre');
  if (!Array.isArray(N.CHAPITRE_NIVEAU) || N.CHAPITRE_NIVEAU.length !== data.CHAPITRES.liste.length + 1) err('NIVEAUX.CHAPITRE_NIVEAU', 'un niveau par chapitre, plus un pour la campagne finie');

  // Le chantier « l'île à bâtir », fiche I4 : les prix des filières. Toute transformation (une recette de l'Atelier qui
  // rend un objet, une transformation des stations, une recette d'artisan de VILLAGE.PRIX.ARTISANS) porte un coefPrix
  // dans VILLAGE.PRIX.FOURCHETTE, sauf exception notée (VILLAGE.PRIX.EXCEPTIONS : l'id de la recette, et pourquoi).
  // (fiche I7c : le plat du premier jour sur l'île, sans visite de bienvenue : un plat cuisiné qui existe)
  const DP = data.VILLAGE && data.VILLAGE.DEPART;
  if (DP && !isDish(data, DP.PLAT)) err('VILLAGE.DEPART.PLAT', 'un plat (une recette de RECETTES)');

  const PX = data.VILLAGE && data.VILLAGE.PRIX;
  if (PX) {
    const F = PX.FOURCHETTE, EX = PX.EXCEPTIONS || {};
    if (!(Array.isArray(F) && F.length === 2 && F.every(isInt) && F[0] > 100 && F[0] <= F[1])) err('VILLAGE.PRIX.FOURCHETTE', 'deux pourcentages entiers [min, max], au-dessus de 100');
    else {
      const borne = (where, id, coef) => {
        if (coef == null) return;
        if (!isInt(coef)) err(where, 'coefPrix est un pourcentage entier (140 = ×1,4)');
        else if ((coef < F[0] || coef > F[1]) && typeof EX[id] !== 'string') err(where, `coefPrix ${coef} hors de la fourchette ${F[0]}–${F[1]} % (sinon, une exception notée : VILLAGE.PRIX.EXCEPTIONS)`);
      };
      for (const [id, r] of Object.entries((data.ATELIER && data.ATELIER.RECETTES) || {})) borne(`ATELIER.RECETTES.${id}`, id, r.coefPrix);
      for (const [id, r] of Object.entries(data.RECETTES || {})) if (r.transformation) borne(`RECETTES.${id}`, id, r.coefPrix);
      for (const [id, r] of Object.entries(PX.ARTISANS || {})) {
        const where = `VILLAGE.PRIX.ARTISANS.${id}`;
        if (!r || typeof r !== 'object' || !r.sortie || Object.keys(r.sortie).length !== 1) { err(where, 'une recette : entrees, sortie (un objet), coefPrix'); continue; }
        for (const [o, n] of Object.entries(r.entrees || {})) { needItem(`${where}.entrees`, o); if (!(isInt(n) && n > 0)) err(`${where}.entrees.${o}`, 'une quantité entière positive'); }
        for (const [o, n] of Object.entries(r.sortie)) { needItem(`${where}.sortie`, o); if (!(isInt(n) && n > 0)) err(`${where}.sortie.${o}`, 'une quantité entière positive'); }
        if (r.coefPrix == null) err(where, 'il lui faut son coefPrix');
        borne(where, id, r.coefPrix);
        // (I5c : une recette d'un commerce : sa sorte existe, son palier et ses nuits de cave sont des entiers)
        if (r.commerce !== undefined && !(data.ARTISANS && data.ARTISANS.COMMERCES && data.ARTISANS.COMMERCES[r.commerce])) err(where, `commerce « ${r.commerce} » : une sorte de ARTISANS.COMMERCES`);
        for (const k of ['palier', 'stock', 'cave']) if (r[k] !== undefined && !(isInt(r[k]) && r[k] >= 0)) err(`${where}.${k}`, 'un entier positif ou nul');
      }
    }
  }
  // (fiches I5a, I5c : chaque sorte de commerce a son établi et son enseigne, des blocs du chantier qui la disent, et une
  // tâche de filière qui existe)
  for (const [sorte, c] of Object.entries((data.ARTISANS && data.ARTISANS.COMMERCES) || {})) {
    if (sorte.startsWith('//')) continue;
    const where = `ARTISANS.COMMERCES.${sorte}`, B = (data.ATELIER && data.ATELIER.BLOCS) || {};
    if (!B[c.etabli] || B[c.etabli].commerce !== sorte) err(where, `etabli « ${c.etabli} » : un bloc de l'Atelier qui porte commerce: « ${sorte} »`);
    if (!B[c.enseigne] || B[c.enseigne].enseigneCommerce !== sorte) err(where, `enseigne « ${c.enseigne} » : un bloc de l'Atelier qui porte enseigneCommerce: « ${sorte} »`);
    if (!(data.TACHES && data.TACHES.LISTE && data.TACHES.LISTE[c.tache])) err(where, `tache « ${c.tache} » : une tâche de TACHES.LISTE`);
    for (const [id, r] of Object.entries(c.RECETTES || {})) {
      for (const o of [...Object.keys(r.entrees || {}), ...Object.keys(r.sortie || {})]) needItem(`${where}.RECETTES.${id}`, o);
    }
  }

  // le chantier de l'île, fiche I6c : les traits (un opposé, des tâches, des accords qui existent ; des phrases d'une bulle)
  if (data.TRAITS) {
    const TL = data.TRAITS.LISTE || {}, taches = (data.TACHES && data.TACHES.LISTE) || {};
    for (const [id, t] of Object.entries(TL)) {
      const where = `TRAITS.LISTE.${id}`;
      if (t.oppose !== undefined && !(TL[t.oppose] && TL[t.oppose].oppose === id)) err(where, `oppose « ${t.oppose} » : un trait qui le dit aussi`);
      for (const [k, g] of Object.entries(t.POSTE || {})) if (!taches[k] || !['aime', 'boude'].includes(g)) err(where, `POSTE.${k} : une tâche, « aime » ou « boude »`);
      for (const p of t.PHRASES || []) if (String(p).length > 96) err(where, `« ${p} » : une bulle, 96 caractères au plus`);
      if (!Array.isArray(t.nom) || t.nom.length !== 2) err(where, 'nom : [au féminin, au masculin]');
    }
    (data.TRAITS.ACCORDS || []).forEach((p, i) => { if (!Array.isArray(p) || p.length !== 2 || !p.every((x) => TL[x])) err(`TRAITS.ACCORDS[${i}]`, 'deux traits'); });
    const nb = data.TRAITS.NOMBRE;
    if (!(Array.isArray(nb) && isInt(nb[0]) && isInt(nb[1]) && nb[0] >= 1 && nb[0] <= nb[1])) err('TRAITS.NOMBRE', '[au moins, au plus]');
  }

  return { errors, warnings };
}

/* ---------- mise en forme pour le moteur ---------- */

// Reconstitue les tables que le moteur lit (voir l'en-tête). Ne modifie pas `data`.
export function compileData(data) {
  const out = JSON.parse(JSON.stringify(data));
  const CONSERVATION = {};
  for (const table of [out.OBJETS, out.RECETTES]) {
    for (const [id, def] of Object.entries(table)) {
      if ('conservation' in def) {
        CONSERVATION[id] = def.conservation;
        delete def.conservation;
      }
    }
  }
  out.CONSERVATION = CONSERVATION;
  out.ARBRE.RECETTES_LIBRES = [];
  for (const [id, r] of Object.entries(out.RECETTES)) {
    if (r.libre) out.ARBRE.RECETTES_LIBRES.push(id);
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
