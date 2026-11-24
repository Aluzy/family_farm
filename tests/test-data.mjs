#!/usr/bin/env node
// Tests des données du jeu (data/*.json) et de leur vérification
// (scripts/lib/data.mjs) : les fichiers actuels sont valides, et chaque erreur
// qu'on peut faire en ajoutant un objet, une recette ou une culture est bien
// signalée, avec un message qui dit où.
//
// Usage : node tests/test-data.mjs (ou node tests/run-tests.mjs data)

import { test as nodeTest } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { EFFETS_TECHNO, compileData, loadData, sourcesOf, stripNotes, validateData } from '../scripts/lib/data.mjs';

// Lancés par node:test (node tests/run-tests.mjs --tous, ou ce fichier seul), dans l'ordre,
// une fois le fichier chargé ; un test synchrone ou asynchrone (attendu).
const test = (name, fn) => nodeTest(name, () => fn());
function eq(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(message || `attendu ${b}, obtenu ${a}`);
}

const DATA = loadData();
const copy = () => JSON.parse(JSON.stringify(DATA));
// Erreurs obtenues après une modification des données.
const errorsAfter = (change) => {
  const d = copy();
  change(d);
  return validateData(d).errors;
};
// La modification produit exactement une erreur, qui contient ce texte.
const refuse = (name, change, text) => test(name, () => {
  const errors = errorsAfter(change);
  if (errors.length !== 1 || !errors[0].includes(text)) throw new Error(`attendu une erreur contenant « ${text} », obtenu ${JSON.stringify(errors)}`);
});

test('les données du dépôt sont valides', () => {
  eq(validateData(DATA).errors, []);
});

test('les notes ("//clé") sont retirées à tous les niveaux', () => {
  eq(stripNotes({ '//a': 'note', a: { '//b': ['x', 'y'], b: [{ '//': 'note', c: 1 }] } }), { a: { b: [{ c: 1 }] } });
  const reste = [];
  (function walk(v, path) {
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (k.startsWith('//')) reste.push(`${path}.${k}`); walk(x, `${path}.${k}`); }
  })(DATA, 'DATA');
  eq(reste, []);
});

test('compileData() : conservation et recettes libres rejoignent les tables du moteur', () => {
  const c = compileData(DATA);
  eq([c.CONSERVATION.tomate, c.CONSERVATION.pain, c.CONSERVATION.confiture_fraises], [5, 7, null]);
  eq('farine' in c.CONSERVATION, false, 'la farine ne périme pas : absente de la table');
  eq(c.CONSERVATION.ble, 10, 'le blé de l\'inventaire périme en 10 nuits (celui du Silo, jamais)');
  eq(['conservation' in c.OBJETS.tomate, 'conservation' in c.RECETTES.pain, 'libre' in c.RECETTES.pain], [false, false, false]);
  eq([c.ARBRE.RECETTES_LIBRES.includes('pain'), c.ARBRE.RECETTES_LIBRES.includes('pain_ail')], [true, false]);
  eq(DATA.OBJETS.tomate.conservation, 5, 'les données lues ne sont pas modifiées');
});

/* ---------- le chantier « l'île à bâtir », fiche I4 : les prix des filières ---------- */

// Toute transformation rend entre FOURCHETTE[0] et FOURCHETTE[1] % de ses entrées (au prix de l'île, déduit au
// chargement : js/engine/catalog.js prixDeLIle), sauf exception notée (VILLAGE.PRIX.EXCEPTIONS).
test('les prix de l\'île : chaque recette de prix rend dans la fourchette, une fois les prix arrondis', async () => {
  const { buildCatalog, recettesDePrix, prixIle } = await import('../js/engine/catalog.js');
  const D = buildCatalog(compileData(DATA)), [min, max] = D.VILLAGE.PRIX.FOURCHETTE, EX = D.VILLAGE.PRIX.EXCEPTIONS || {};
  const hors = [];
  const l = recettesDePrix(D);
  if (l.length < 100) throw new Error(`attendu plus de 100 recettes de prix, obtenu ${l.length}`);
  for (const r of l) {
    const cout = r.entrees.reduce((t, e) => t + Math.max(...e.options.map((o) => prixIle(o, D))) * e.qte, 0);
    const valeur = prixIle(r.sortie, D) * r.qte;
    if (!(valeur * 100 >= min * cout && valeur * 100 <= max * cout) && !EX[r.id]) hors.push(`${r.id} : ${cout} → ${valeur}`);
    if (!Number.isInteger(prixIle(r.sortie, D))) hors.push(`${r.id} : un prix entier`);
  }
  eq(hors, []);
  // aucune filière ne perd de valeur : bois → planche → porte ; laine → tissu → manteau ; blé → farine → pain ;
  // minerai → lingot ; fibre → corde
  const p = (o) => prixIle(o, D);
  for (const [a, na, b, nb] of [['bois', 2, 'planche', 1], ['planche', 3, 'porte', 1], ['laine', 2, 'tissu', 1], ['tissu', 3, 'manteau_chaud', 1],
    ['ble', 1, 'farine', 1], ['farine', 2, 'pain', 1], ['fibre', 3, 'corde', 1], ['planche', 6, 'meuble_lit_adulte', 1]]) {
    if (!(p(b) * nb > p(a) * na)) throw new Error(`${na} ${a} (${p(a) * na}) → ${nb} ${b} (${p(b) * nb}) : la filière perd de la valeur`);
  }
  // le jeu d'avant garde ses prix écrits
  eq([D.OBJETS.planche.prix, D.OBJETS.tissu.prix, D.OBJETS.pain.prix], [4, 18, 8], 'les prix écrits ne changent pas');
});
refuse('les prix de l\'île : une recette de l\'Atelier hors de la fourchette', (d) => { d.ATELIER.RECETTES.porte.coefPrix = 120; }, 'hors de la fourchette');
refuse('les prix de l\'île : une transformation hors de la fourchette', (d) => { d.RECETTES.farine.coefPrix = 200; }, 'hors de la fourchette');
refuse('les prix de l\'île : une recette d\'artisan sans coefficient', (d) => { delete d.VILLAGE.PRIX.ARTISANS.tissu.coefPrix; }, 'son coefPrix');
test('les prix de l\'île : une exception notée passe', () => {
  eq(errorsAfter((d) => { d.ATELIER.RECETTES.porte.coefPrix = 200; d.VILLAGE.PRIX.EXCEPTIONS.porte = 'Un essai.'; }), []);
});

/* ---------- ajouter une recette ---------- */

const recette = (extra = {}) => ({ nom: 'Tarte aux poires', icone: '🥧', station: 'four', temps: 40, ingredients: [{ item: 'farine', qte: 2 }, { item: 'poire', qte: 3 }], libre: true, ...extra });

test('une nouvelle recette bien écrite passe', () => {
  eq(errorsAfter((d) => { d.RECETTES.tarte_poires = recette(); }), []);
  eq(errorsAfter((d) => { d.RECETTES.tarte_poires = recette({ conservation: null, ingredients: [{ item: 'pain', qte: 1 }, { ou: ['pomme', 'poire'], qte: 2 }] }); }), []);
});
refuse('recette : ingrédient inconnu', (d) => { d.RECETTES.tarte_poires = recette({ ingredients: [{ item: 'poires', qte: 3 }] }); }, 'RECETTES.tarte_poires.ingredients[0] : « poires »');
refuse('recette : station inconnue', (d) => { d.RECETTES.tarte_poires = recette({ station: 'fourneau' }); }, 'station « fourneau » inconnue');
refuse('atelier : action inconnue', (d) => { d.STATIONS.four.action = 'voler'; }, 'STATIONS.four : action « voler » inconnue');
refuse('recette : quantité nulle', (d) => { d.RECETTES.tarte_poires = recette({ ingredients: [{ item: 'poire', qte: 0 }] }); }, 'qte doit être un entier supérieur à 0');
refuse('recette : ni libre ni débloquée par l\'arbre', (d) => { d.RECETTES.tarte_poires = recette({ libre: undefined }); }, 'recette inaccessible');
refuse('recette : un plat ne peut pas porter le nom d\'un objet', (d) => { d.RECETTES.cafe = recette(); }, '« cafe » est déjà un objet');
refuse('recette : conservation en texte', (d) => { d.RECETTES.tarte_poires = recette({ conservation: '7' }); }, 'conservation doit être un nombre entier');
refuse('recette : transformation vers un objet inconnu', (d) => { d.RECETTES.jus = recette({ transformation: true, sortie: 'jus_pomme', qteSortie: 1 }); }, 'sortie « jus_pomme » inconnue');
test('recettes en boucle', () => {
  const errors = errorsAfter((d) => { d.RECETTES.pain.ingredients.push({ item: 'pain_ail', qte: 1 }); });
  if (!errors.some((e) => e.includes('recettes en boucle : pain → pain_ail → pain'))) throw new Error(JSON.stringify(errors));
});
refuse('arbre : un nœud débloque une recette qui n\'existe pas', (d) => { Object.values(d.ARBRE.noeuds).find((n) => n.effet.recettes).effet.recettes.push('tarte_poires'); }, 'débloque la recette « tarte_poires », qui n\'existe pas');
refuse('arbre : prérequis inconnu', (d) => { Object.values(d.ARBRE.noeuds)[0].requiert.push({ noeud: 'en_fusion' }); }, 'requiert le nœud « en_fusion »');

/* ---------- ajouter un objet, une culture ---------- */

refuse('objet : catégorie inconnue', (d) => { d.OBJETS.melon = { nom: 'Melon', icone: '🍈', energie: 9, prix: 2, mangeable: true, categorie: 'fruits' }; }, 'categorie « fruits » inconnue');
refuse('objet : comestible sans énergie', (d) => { d.OBJETS.melon = { nom: 'Melon', icone: '🍈', prix: 2, mangeable: true, categorie: 'fruit' }; }, 'a besoin d\'une energie');

const culture = (extra = {}) => ({ nom: 'Melon', icone: '🍈', lieux: ['potager'], stades: 6, litres: 3, rendement: 4, graines: { item: 'graine_melon', mode: 'recolte', min: 1, max: 2 }, sprite: { r: 1, c: [0, 1, 2, 3], l: 24, h: 40 }, ...extra });
const avecMelon = (d) => {
  d.OBJETS.melon = { nom: 'Melon', icone: '🍈', energie: 9, prix: 2, mangeable: true, categorie: 'fruit', conservation: 5 };
  d.OBJETS.graine_melon = { nom: 'Graines de melon', icone: '🌱', prix: 1, mangeable: false, categorie: 'graine' };
};
test('une nouvelle culture bien écrite passe', () => {
  eq(errorsAfter((d) => { avecMelon(d); d.CULTURES.melon = culture(); }), []);
});
refuse('culture : la récolte n\'est pas un objet', (d) => { d.CULTURES.melon = culture({ graines: { item: 'tomate', mode: 'plant' } }); }, 'la récolte « melon » n\'est pas un objet');
refuse('culture : graine inconnue', (d) => { avecMelon(d); delete d.OBJETS.graine_melon; d.CULTURES.melon = culture(); }, 'graines.item « graine_melon »');
refuse('culture : lieu inconnu', (d) => { avecMelon(d); d.CULTURES.melon = culture({ lieux: ['verger'] }); }, 'lieux doit contenir');
refuse('culture : bâtiment requis inconnu', (d) => { avecMelon(d); d.CULTURES.melon = culture({ requiert: 'champs' }); }, 'requiert « champs » inconnu');
refuse('niveaux : une culture débloquée deux fois', (d) => { d.NIVEAUX.liste[1].debloque.push('carotte'); }, '« carotte » est déjà débloqué');
refuse('niveaux : un déblocage inconnu', (d) => { d.NIVEAUX.liste[1].debloque.push('fusee'); }, 'debloque « fusee »');
refuse('culture : découpe incomplète', (d) => { avecMelon(d); d.CULTURES.melon = culture({ sprite: { r: 1, c: [0, 1, 2], l: 24, h: 40 } }); }, 'sprite :');
test('culture sans découpe : un avertissement, pas une erreur', () => {
  const d = copy();
  avecMelon(d);
  d.CULTURES.melon = culture({ sprite: undefined });
  const r = validateData(d);
  eq([r.errors, r.warnings.filter((w) => w.startsWith('CULTURES.melon')).length], [[], 1]);
});

/* ---------- ce que les autres tables citent ---------- */

refuse('inventaire de départ : objet inconnu', (d) => { d.DEPART.ETAT_INITIAL.INVENTAIRE.graine_melon = 2; }, 'DEPART.ETAT_INITIAL.INVENTAIRE : « graine_melon »');
refuse('animal : produit inconnu', (d) => { d.ANIMAUX.poule.produit = 'oeufs'; }, 'ANIMAUX.poule.produit : « oeufs »');
refuse('monde : un biome manque', (d) => { d.BIOMES = d.BIOMES.filter((b) => b !== 'sommet'); delete d.ROCHES.DENSITES.sommet; delete d.ROCHES.BORNES.sommet; }, 'BIOMES : « sommet » manque');
refuse('rochers : une sorte inconnue dans les densités', (d) => { d.ROCHES.DENSITES.montagne.roche.menhir = 0.01; }, '« menhir » n\'est pas une sorte');
refuse('rochers : une falaise sans toutes ses colonnes', (d) => { d.ROCHES.SORTES.find((s) => s.nom === 'paroi').variantes = 24; }, 'ROCHES.SORTES[10].variantes');
refuse('monde : un coût de chemin sur un biome inconnu', (d) => { d.PLAN_MONDE.CHEMINS.COUTS.desert = 3; }, '« desert » n\'est pas un biome');
refuse('monde : des hameaux en nombre impossible', (d) => { d.PLAN_MONDE.HAMEAUX.NOMBRE = [10, 6]; }, 'PLAN_MONDE.HAMEAUX.NOMBRE');
refuse('récolte du monde : une sorte inconnue', (d) => { d.RECOLTE.SORTES.baobab = { geste: 'couper', coups: 3, fin: { bois: [1, 2] }, retour: [2, 3] }; }, '« baobab » n\'est pas une sorte du monde');
refuse('récolte du monde : un butin qui n\'existe pas', (d) => { d.RECOLTE.SORTES.ronces.aussi.fin = { framboise: [1, 2] }; }, 'RECOLTE.SORTES.ronces.aussi.fin');
refuse('récolte du monde : une falaise reste du décor', (d) => { d.RECOLTE.SORTES.paroi = { geste: 'ramasser', fin: { pierre: [1, 2] }, retour: [2, 3] }; }, 'une paroi reste du décor');

/* ---------- arbre : clés d'effet ; objets qu'on peut obtenir ---------- */

refuse('arbre : clé d\'effet que le moteur ne lit pas', (d) => { d.ARBRE.noeuds.cu_outils.effet.vitesseRecolte = 120; }, '« vitesseRecolte » : aucun code du moteur');
test('chaque clé d\'effet de EFFETS_TECHNO est lue dans js/', () => {
  // (les sous-dossiers compris : js/engine/ile/, docs/ile-300.md)
  const src = readdirSync('js/engine', { recursive: true }).filter((f) => f.endsWith('.js')).map((f) => readFileSync(`js/engine/${f}`, 'utf8')).join('\n');
  const lue = (cle) => new RegExp(`(tech(Effects|Pct|Sum|Flag)\\(state, '${cle}'|withBonus\\([^)]*'${cle}'|e\\.${cle}\\b|tech\\('${cle}'\\))`).test(src);
  eq(EFFETS_TECHNO.filter((cle) => !lue(cle)), []);
});
test('objet impossible à obtenir : un avertissement, pas une erreur', () => {
  eq(validateData(DATA).warnings.filter((w) => w.includes('aucun moyen de l\'obtenir')), [], 'tout objet du dépôt s\'obtient');
  const d = copy();
  d.OBJETS.melon = { nom: 'Melon', icone: '🍈', energie: 9, prix: 2, mangeable: true, categorie: 'fruit', rachetable: false };
  const r = validateData(d);
  eq([r.errors, r.warnings.filter((w) => w.startsWith('OBJETS.melon'))], [[], ['OBJETS.melon : aucun moyen de l\'obtenir (ni récolte, ni recette, ni animal, ni pêche, ni sortie, ni achat, ni inventaire de départ…)']]);
  eq(sourcesOf(d, 'minerai_or'), ['récolte du grand monde (gisement_or)']);
  eq(sourcesOf(d, 'anchois'), ['pêche mer', 'coin de pêche (mer)']);
});
test('le fromage d\'alpage : herbes de montagne (trouvaille, récolte du grand monde) → lait d\'alpage (vache) → fromage (Cuisine)', () => {
  eq(sourcesOf(DATA, 'herbes_montagne'), ['trouvaille du grand monde (montagne)', 'récolte du grand monde (touffe_mont)']);
  eq(sourcesOf(DATA, 'lait_alpage'), ['animal vache']);
  eq(sourcesOf(DATA, 'fromage_alpage'), ['recette fromage_alpage', 'Marché']);
});

/* ---------- le plan du monde : les hameaux garantis, les lieux, les bâtisses (le récit est retiré à la bascule, I9h) ---------- */

refuse('monde : deux hameaux garantis du même nom', (d) => { d.PLAN_MONDE.HAMEAUX.GARANTIS[1].nom = 'Les Mouettes'; }, 'pris par aucun autre hameau garanti');
refuse('monde : un hameau garanti au pays inconnu', (d) => { d.PLAN_MONDE.HAMEAUX.GARANTIS[0].pays = 'desert'; }, 'un pays parmi');
refuse('monde : un hameau garanti au métier inconnu', (d) => { d.PLAN_MONDE.HAMEAUX.GARANTIS[0].metier = 'astronaute'; }, 'un métier parmi');
refuse('monde : un lieu du récit sans cases fermées', (d) => { d.LIEUX.SORTES.find((x) => x.nom === 'epave').bloque = 'tout'; }, 'des décalages');
refuse('monde : une bâtisse au meuble inconnu', (d) => { d.HAMEAUX.BATISSES.cabane.meubles.push(['piano', 1, 1]); }, '« piano » n\'est pas une pièce');
refuse('monde : une bâtisse au meuble dans le mur', (d) => { d.HAMEAUX.BATISSES.atelier.meubles[0][1] = 0; }, 'dedans, hors des murs');
refuse('monde : une bâtisse au style inconnu', (d) => { d.HAMEAUX.BATISSES.cabane.style = 'gothique'; }, 'un style de HAMEAUX.STYLES');

// A-3 : les palettes et les variantes de couleur des meubles
refuse('variante : une rampe inconnue', (d) => { d.MEUBLES.chaise.variantes[1].remplace = { bois_miel: 'bois_inconnu' }; }, 'des rampes de PALETTES');
refuse('variante : deux rampes de longueurs différentes', (d) => { d.MEUBLES.chaise.variantes[1].remplace = { bois_miel: 'tissu_rouge' }; }, 'pas la même longueur');
refuse('variante : la première remplace quelque chose', (d) => { d.MEUBLES.canape.variantes[0].remplace = { tissu_vert: 'tissu_rouge' }; }, 'la première variante est celle du dessin');
refuse('variante : deux fois le même identifiant', (d) => { d.MEUBLES.table.variantes[2].id = 'noyer'; }, 'unique');
refuse('palette : une couleur mal écrite', (d) => { d.PALETTES.tissu_bleu[0] = 'bleu'; }, 'PALETTES.tissu_bleu');
