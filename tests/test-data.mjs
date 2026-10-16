#!/usr/bin/env node
// Tests des données du jeu (data/*.json) et de leur vérification
// (scripts/lib/data.mjs) : les fichiers actuels sont valides, et chaque erreur
// qu'on peut faire en ajoutant un objet, une recette ou une culture est bien
// signalée, avec un message qui dit où.
//
// Usage : node tests/test-data.mjs

import { readdirSync, readFileSync } from 'node:fs';
import { EFFETS_TECHNO, compileData, loadData, sourcesOf, stripNotes, validateData } from '../scripts/lib/data.mjs';

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed++; } catch (e) { failures.push(`${name} : ${e.message}`); }
}
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
  eq(['conservation' in c.items.tomate, 'conservation' in c.recipes.pain, 'libre' in c.recipes.pain], [false, false, false]);
  eq([c.techtree.RECETTES_LIBRES.includes('pain'), c.techtree.RECETTES_LIBRES.includes('pain_ail')], [true, false]);
  eq(DATA.items.tomate.conservation, 5, 'les données lues ne sont pas modifiées');
});

/* ---------- ajouter une recette ---------- */

const recette = (extra = {}) => ({ nom: 'Tarte aux poires', icone: '🥧', station: 'four', temps: 40, ingredients: [{ item: 'farine', qte: 2 }, { item: 'poire', qte: 3 }], libre: true, ...extra });

test('une nouvelle recette bien écrite passe', () => {
  eq(errorsAfter((d) => { d.recipes.tarte_poires = recette(); }), []);
  eq(errorsAfter((d) => { d.recipes.tarte_poires = recette({ conservation: null, ingredients: [{ item: 'pain', qte: 1 }, { ou: ['pomme', 'poire'], qte: 2 }] }); }), []);
});
refuse('recette : ingrédient inconnu', (d) => { d.recipes.tarte_poires = recette({ ingredients: [{ item: 'poires', qte: 3 }] }); }, 'recipes.tarte_poires.ingredients[0] : « poires »');
refuse('recette : station inconnue', (d) => { d.recipes.tarte_poires = recette({ station: 'fourneau' }); }, 'station « fourneau » inconnue');
refuse('recette : quantité nulle', (d) => { d.recipes.tarte_poires = recette({ ingredients: [{ item: 'poire', qte: 0 }] }); }, 'qte doit être un entier supérieur à 0');
refuse('recette : ni libre ni débloquée par l\'arbre', (d) => { d.recipes.tarte_poires = recette({ libre: undefined }); }, 'recette inaccessible');
refuse('recette : un plat ne peut pas porter le nom d\'un objet', (d) => { d.recipes.cafe = recette(); }, '« cafe » est déjà un objet');
refuse('recette : conservation en texte', (d) => { d.recipes.tarte_poires = recette({ conservation: '7' }); }, 'conservation doit être un nombre entier');
refuse('recette : transformation vers un objet inconnu', (d) => { d.recipes.jus = recette({ transformation: true, sortie: 'jus_pomme', qteSortie: 1 }); }, 'sortie « jus_pomme » inconnue');
test('recettes en boucle', () => {
  const errors = errorsAfter((d) => { d.recipes.pain.ingredients.push({ item: 'pain_ail', qte: 1 }); });
  if (!errors.some((e) => e.includes('recettes en boucle : pain → pain_ail → pain'))) throw new Error(JSON.stringify(errors));
});
refuse('arbre : un nœud débloque une recette qui n\'existe pas', (d) => { Object.values(d.techtree.noeuds).find((n) => n.effet.recettes).effet.recettes.push('tarte_poires'); }, 'débloque la recette « tarte_poires », qui n\'existe pas');
refuse('arbre : prérequis inconnu', (d) => { Object.values(d.techtree.noeuds)[0].requiert.push({ noeud: 'en_fusion' }); }, 'requiert le nœud « en_fusion »');

/* ---------- ajouter un objet, une culture ---------- */

refuse('objet : catégorie inconnue', (d) => { d.items.melon = { nom: 'Melon', icone: '🍈', energie: 9, prix: 2, edible: true, category: 'fruits' }; }, 'category « fruits » inconnue');
refuse('objet : comestible sans énergie', (d) => { d.items.melon = { nom: 'Melon', icone: '🍈', prix: 2, edible: true, category: 'fruit' }; }, 'a besoin d\'une energie');

const culture = (extra = {}) => ({ nom: 'Melon', icone: '🍈', lieux: ['potager'], stades: 6, litres: 3, rendement: 4, graines: { item: 'graine_melon', mode: 'recolte', min: 1, max: 2 }, sprite: { r: 1, h: 32, c: [0, 1, 2, 3] }, ...extra });
const avecMelon = (d) => {
  d.items.melon = { nom: 'Melon', icone: '🍈', energie: 9, prix: 2, edible: true, category: 'fruit', conservation: 5 };
  d.items.graine_melon = { nom: 'Graines de melon', icone: '🌱', prix: 1, edible: false, category: 'graine' };
};
test('une nouvelle culture bien écrite passe', () => {
  eq(errorsAfter((d) => { avecMelon(d); d.crops.melon = culture(); }), []);
});
refuse('culture : la récolte n\'est pas un objet', (d) => { d.crops.melon = culture({ graines: { item: 'tomate', mode: 'plant' } }); }, 'la récolte « melon » n\'est pas un objet');
refuse('culture : graine inconnue', (d) => { avecMelon(d); delete d.items.graine_melon; d.crops.melon = culture(); }, 'graines.item « graine_melon »');
refuse('culture : lieu inconnu', (d) => { avecMelon(d); d.crops.melon = culture({ lieux: ['verger'] }); }, 'lieux doit contenir');
refuse('culture : bâtiment requis inconnu', (d) => { avecMelon(d); d.crops.melon = culture({ requiert: 'champs' }); }, 'requiert « champs » inconnu');
refuse('niveaux : une culture débloquée deux fois', (d) => { d.NIVEAUX.liste[1].debloque.push('carotte'); }, '« carotte » est déjà débloqué');
refuse('niveaux : un déblocage inconnu', (d) => { d.NIVEAUX.liste[1].debloque.push('fusee'); }, 'debloque « fusee »');
refuse('culture : découpe incomplète', (d) => { avecMelon(d); d.crops.melon = culture({ sprite: { r: 1, h: 32, c: [0, 1, 2] } }); }, 'sprite :');
test('culture sans découpe : un avertissement, pas une erreur', () => {
  const d = copy();
  avecMelon(d);
  d.crops.melon = culture({ sprite: undefined });
  const r = validateData(d);
  eq([r.errors, r.warnings.filter((w) => w.startsWith('crops.melon')).length], [[], 1]);
});

/* ---------- ce que les autres tables citent ---------- */

refuse('courrier : cadeau inconnu', (d) => { d.COURRIER.cousin_venezuela.cadeaux.mangue = 1; }, '« mangue »');
refuse('inventaire de départ : objet inconnu', (d) => { d.START.INVENTAIRE.graine_melon = 2; }, 'START.INVENTAIRE : « graine_melon »');
refuse('animal : produit inconnu', (d) => { d.ANIMAUX.poule.produit = 'oeufs'; }, 'ANIMAUX.poule.produit : « oeufs »');
refuse('commerce : matière inconnue', (d) => { d.COMMERCE.TYPES.cremerie.prend.push('lait_chevre'); }, 'COMMERCE.TYPES.cremerie.prend : « lait_chevre »');
refuse('entreprise : intrant inconnu', (d) => { d.VILLE.ENTREPRISES.LISTE.confiturerie.intrants.push('mangue'); }, 'VILLE.ENTREPRISES.LISTE.confiturerie.intrants : « mangue »');
refuse('sortie : butin inconnu', (d) => { d.VILLE.SORTIES.montagne.butin.edelweiss = 1; }, 'VILLE.SORTIES.montagne.butin : « edelweiss »');
refuse('sortie : cueillette inconnue', (d) => { d.VILLE.SORTIES.foret.cueillettes[0].truffe = 1; }, 'VILLE.SORTIES.foret.cueillettes[0] : « truffe »');

/* ---------- arbre : clés d'effet ; objets qu'on peut obtenir ---------- */

refuse('arbre : clé d\'effet que le moteur ne lit pas', (d) => { d.techtree.noeuds.cu_outils.effet.vitesseRecolte = 120; }, '« vitesseRecolte » : aucun code du moteur');
test('chaque clé d\'effet de EFFETS_TECHNO est lue dans js/', () => {
  const src = readdirSync('js/engine').map((f) => readFileSync(`js/engine/${f}`, 'utf8')).join('\n') + readFileSync('js/ville-carte.js', 'utf8');
  const lue = (cle) => new RegExp(`(tech(Effects|Pct|Sum|Flag)\\(state, '${cle}'|withBonus\\([^)]*'${cle}'|e\\.${cle}\\b|tech\\('${cle}'\\))`).test(src);
  eq(EFFETS_TECHNO.filter((cle) => !lue(cle)), []);
});
test('objet impossible à obtenir : un avertissement, pas une erreur', () => {
  eq(validateData(DATA).warnings.filter((w) => w.includes('aucun moyen de l\'obtenir')), [], 'tout objet du dépôt s\'obtient');
  const d = copy();
  d.items.melon = { nom: 'Melon', icone: '🍈', energie: 9, prix: 2, edible: true, category: 'fruit', rachetable: false };
  const r = validateData(d);
  eq([r.errors, r.warnings.filter((w) => w.startsWith('items.melon'))], [[], ['items.melon : aucun moyen de l\'obtenir (ni récolte, ni recette, ni animal, ni pêche, ni sortie, ni achat, ni inventaire de départ…)']]);
  eq(sourcesOf(d, 'minerai_or'), ['grotte']);
  eq(sourcesOf(d, 'anchois'), ['pêche mer']);
});

console.log('');
console.log('Ferme Familiale — tests des données');
console.log('-'.repeat(35));
for (const f of failures) console.log(`✗ ${f}`);
console.log('');
console.log(`${passed}/${passed + failures.length} test(s) passé(s), ${failures.length} échec(s).`);
process.exit(failures.length ? 1 : 0);
