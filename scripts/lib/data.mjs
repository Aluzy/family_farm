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

const CATEGORIES = ['légume', 'fruit', 'graine', 'ingrédient', 'produit', 'conserve', 'matériau'];
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
  'grotte', // techFlag (outils.js, ville-carte.js)
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
// « objet introuvable » de validateData(). Les minerais viennent de la grotte
// (mineOre, js/engine/outils.js : minerai_<sorte>), hors des données.
export function sourcesOf(data, id) {
  const out = [];
  const it = data.OBJETS[id] || {};
  for (const [rid, r] of Object.entries(data.RECETTES)) {
    if ((r.transformation ? r.sortie : rid) === id) out.push(`recette ${rid}`);
    if (r.sousProduit && r.sousProduit.item === id) out.push(`sous-produit de ${rid}`);
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
  for (const [sid, s] of Object.entries((data.VILLE && data.VILLE.SORTIES) || {})) {
    if (id in (s.butin || {}) || (s.cueillettes || []).some((c) => id in c)) out.push(`sortie ${sid}`);
  }
  const A = data.ATELIER;
  for (const [rid, r] of Object.entries((A && A.RECETTES) || {})) if (id in (r.sortie || {})) out.push(`atelier ${rid}`);
  for (const [rid, r] of Object.entries((A && A.RAMASSAGE) || {})) if (r.objet === id) out.push(`ramassage ${rid}`);
  for (const [bid, b] of Object.entries((A && A.BLOCS) || {})) if (b.meuble && b.objet === id && data.MEUBLES && data.MEUBLES[b.meuble]) out.push(`meuble ${b.meuble} (Marché)`);
  if (data.HACHE && id === 'bois') out.push('hache');
  if (data.PIOCHE && id === 'pierre') out.push('pioche');
  if (data.FAUX && data.PATURAGE && id === data.PATURAGE.NOURRITURE) out.push('faux');
  if (id.startsWith('minerai_')) out.push('grotte');
  if (it.trouvaille) out.push(`trouvaille (${it.trouvaille})`);
  if (it.cueillette) out.push(`cueillette (${it.cueillette})`);
  if (data.DEPART && id in data.DEPART.INVENTAIRE) out.push('DEPART.INVENTAIRE');
  if (data.DEPART && data.DEPART.ETAT_INITIAL && id in data.DEPART.ETAT_INITIAL.INVENTAIRE) out.push('DEPART.ETAT_INITIAL.INVENTAIRE');
  if (data.FAMILLE && id in data.FAMILLE.RESERVE_DEPART) out.push('FAMILY.RESERVE_DEPART');
  for (const [lid, l] of Object.entries(data.COURRIER || {})) if (id in (l.cadeaux || {})) out.push(`courrier ${lid}`);
  for (const [bid, b] of Object.entries((data.VILLE && data.VILLE.BOUTIQUES && data.VILLE.BOUTIQUES.LISTE) || {})) if ((b.objets || []).includes(id)) out.push(`boutique ${bid}`);
  if (it.ville) out.push('marché de la ville');
  else if (it.rachetable !== false) out.push('Marché');
  if (it.retire) out.push('ancienne sauvegarde (retire)');
  return out;
}

const isInt = (n) => Number.isInteger(n);
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

  /* recettes */
  for (const [id, r] of Object.entries(recipes)) {
    const where = `RECETTES.${id}`;
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
    const g = c.graines || {};
    if (!MODES_GRAINES.includes(g.mode)) err(where, `graines.mode « ${g.mode} » inconnu (${MODES_GRAINES.join(', ')})`);
    if (!(g.item in items)) err(where, `graines.item « ${g.item} » n'est pas un objet (OBJETS)`);
    if (g.mode === 'recolte' && !(isInt(g.min) && isInt(g.max) && g.min >= 0 && g.max >= g.min)) err(where, 'graines.min et graines.max : deux entiers, min ≤ max');
    const s = c.sprite;
    if (!s) warn(where, 'pas de sprite : la carte affichera l\'icône à la place d\'un dessin');
    else if (!(isInt(s.r) && [16, 32].includes(s.h) && Array.isArray(s.c) && [4, 5].includes(s.c.length) && s.c.every(isInt))) {
      err(where, 'sprite : { "r": rangée, "h": 16 ou 32, "c": [4 ou 5 colonnes, une par phase : la graine d\'abord, la plante mûre en dernier] }');
    }
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
  const RT = data.PIOCHE && data.PIOCHE.RETOUR;
  if (!(Array.isArray(RT) && RT.length === 2 && RT.every((x) => isInt(x) && x >= 1) && RT[0] <= RT[1])) err('PIOCHE.RETOUR', 'deux entiers [min, max], 1 ≤ min ≤ max');
  const FX = data.FAUX || {};
  if (!(isInt(FX.PAILLE) && FX.PAILLE > 0 && isInt(FX.BOT_TOUFFES) && FX.BOT_TOUFFES > 0)) err('FAUX', 'PAILLE et BOT_TOUFFES : deux entiers supérieurs à 0');
  const RF = FX.RETOUR;
  if (!(Array.isArray(RF) && RF.length === 2 && RF.every((x) => isInt(x) && x >= 1) && RF[0] <= RF[1])) err('FAUX.RETOUR', 'deux entiers [min, max], 1 ≤ min ≤ max');
  const CN = data.CANNE || {};
  if (!(CN.PRISES && typeof CN.PRISES === 'object' && Object.keys(CN.PRISES).length)) err('CANNE.PRISES', 'les chances de prise par eau');
  for (const [eau, p] of Object.entries(CN.PRISES || {})) {
    for (const item of Object.keys(p)) needItem(`CANNE.PRISES.${eau}`, item);
    const total = Object.values(p).reduce((a, b) => a + b, 0);
    if (Object.values(p).some((x) => !isInt(x) || x < 0) || total > 100) err(`CANNE.PRISES.${eau}`, 'des pourcentages entiers, 100 au plus en tout');
    if (!(isInt(CN.JOUR && CN.JOUR[eau]) && CN.JOUR[eau] > 0)) err(`CANNE.JOUR.${eau}`, 'un entier supérieur à 0');
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
  for (const [id, lettre] of Object.entries(data.COURRIER)) {
    const where = `COURRIER.${id}`;
    for (const cadeau of Object.keys(lettre.cadeaux || {})) needItem(`${where}.cadeaux`, cadeau);
    const q = lettre.quand || {};
    if (q.debloque !== undefined && !elements.includes(q.debloque)) err(where, `quand.debloque « ${q.debloque} » inconnu (NIVEAUX.ELEMENTS)`);
  }
  // Commerces de la ferme, entreprises et sorties de la ville, Silo, Étable, joueur simulé.
  // (Les meubles, eux, ne citent aucun objet : rien à vérifier.)
  const C = data.COMMERCE || {};
  for (const [id, t] of Object.entries(C.TYPES || {})) for (const item of t.prend || []) needItem(`COMMERCE.TYPES.${id}.prend`, item);
  const V = data.VILLE || {};
  for (const [id, e] of Object.entries((V.ENTREPRISES && V.ENTREPRISES.LISTE) || {})) {
    for (const item of e.intrants || []) needItem(`VILLE.ENTREPRISES.LISTE.${id}.intrants`, item);
  }
  for (const [id, s] of Object.entries(V.SORTIES || {})) {
    for (const item of Object.keys(s.butin || {})) needItem(`VILLE.SORTIES.${id}.butin`, item);
    (s.cueillettes || []).forEach((c, i) => { for (const item of Object.keys(c)) needItem(`VILLE.SORTIES.${id}.cueillettes[${i}]`, item); });
  }
  for (const item of (V.BONHEUR && V.BONHEUR.SPECIALES && V.BONHEUR.SPECIALES.objets) || []) needItem('VILLE.BONHEUR.SPECIALES.objets', item);
  if (data.SILO) needItem('SILO.ITEM', data.SILO.ITEM);
  if (data.PATURAGE) needItem('PATURAGE.NOURRITURE', data.PATURAGE.NOURRITURE);
  const SIM = data.SIMULATION || {};
  for (const item of Object.keys(SIM.ACHATS_CUISINE || {})) needItem('SIMULATION.ACHATS_CUISINE', item);
  if (SIM.DEPANNAGE) needItem('SIMULATION.DEPANNAGE.item', SIM.DEPANNAGE.item);

  /* les grottes et le bus de ligne (ville.json, lus par les cartes : js/carte/ville/config.js) */
  const G = data.GROTTE;
  if (G) {
    for (const cle of ['LARGEUR', 'HAUTEUR', 'NIVEAUX', 'PASSES', 'COUPS']) {
      if (!(isInt(G[cle]) && G[cle] >= 1)) err(`GROTTE.${cle}`, `un entier supérieur à 0 ; reçu ${JSON.stringify(G[cle])}`);
    }
    for (const cle of ['MURS', 'MINERAI']) {
      if (!(typeof G[cle] === 'number' && G[cle] >= 0 && G[cle] <= 1)) err(`GROTTE.${cle}`, `une part entre 0 et 1 ; reçu ${JSON.stringify(G[cle])}`);
    }
    for (const cle of ['MINERAI_NIVEAU', 'COUP']) {
      if (!(typeof G[cle] === 'number' && G[cle] >= 0)) err(`GROTTE.${cle}`, `un nombre positif ; reçu ${JSON.stringify(G[cle])}`);
    }
    // chaque sorte est l'objet minerai_<sorte> (mineOre, js/engine/outils.js) ; FIXE, ou DEPUIS et PENTE
    for (const [sorte, p] of Object.entries(G.POIDS || {})) {
      needItem('GROTTE.POIDS', `minerai_${sorte}`);
      const ok = (n) => typeof n === 'number' && n >= 0;
      if (!(p && ('FIXE' in p ? ok(p.FIXE) : ok(p.DEPUIS) && ok(p.PENTE)))) err(`GROTTE.POIDS.${sorte}`, 'FIXE, ou DEPUIS et PENTE : des nombres positifs');
    }
  }
  const NV = data.NAVETTE;
  if (NV) {
    const h = NV.HORAIRES || {};
    if (!(isInt(h.DEBUT) && isInt(h.FIN) && h.DEBUT >= 0 && h.FIN <= 24 && h.DEBUT < h.FIN)) err('NAVETTE.HORAIRES', `DEBUT et FIN : des heures entières, 0 ≤ DEBUT < FIN ≤ 24 ; reçu ${JSON.stringify(h)}`);
    for (const cle of ['MONTEE', 'DEPART', 'DESCENTE', 'REPART']) {
      const d = (NV.DUREES || {})[cle];
      if (!(typeof d === 'number' && d >= 0)) err(`NAVETTE.DUREES.${cle}`, `une durée en secondes ; reçu ${JSON.stringify(d)}`);
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
      if (!r.sortie === !r.outil) err(`ATELIER.RECETTES.${rid}`, 'une sortie ou un outil (l\'un des deux)');
      if (r.outil && !['houe', 'hache', 'pioche', 'faux'].includes(r.outil)) err(`ATELIER.RECETTES.${rid}.outil`, 'houe, hache, pioche ou faux');
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
  if (!Array.isArray(N.CHAPITRES_XP) || N.CHAPITRES_XP.length !== data.CHAPITRES.liste.length) err('NIVEAUX.CHAPITRES_XP', 'un nombre par chapitre');
  if (!Array.isArray(N.CHAPITRE_NIVEAU) || N.CHAPITRE_NIVEAU.length !== data.CHAPITRES.liste.length + 1) err('NIVEAUX.CHAPITRE_NIVEAU', 'un niveau par chapitre, plus un pour la campagne finie');

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
