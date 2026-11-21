// La configuration d'ESLint (docs/ile-300.md, étape 1).
//
// Pour l'instant, seul le code neuf du chantier « l'île de 300 × 300 » est vérifié : la liste NOUVEAUX
// plus bas. L'ancien code n'est pas encore passé par ESLint ; il le sera plus tard, à part, pour ne pas
// mêler ses milliers de remarques aux vraies erreurs du code neuf. Un fichier qui rejoint la vérification
// s'ajoute à NOUVEAUX ici et dans .prettierignore.
//
//   npm run lint        (ESLint, puis Prettier en vérification)
//   npm run format      (Prettier réécrit les fichiers vérifiés)

import js from '@eslint/js';
import globals from 'globals';

// Les fichiers vérifiés (des motifs, depuis la racine du dépôt).
const NOUVEAUX = [
  'eslint.config.js',
  'js/engine/ile.js',
  'js/engine/ile/**/*.js',
  'scripts/ile/**/*.mjs',
  'tests/engine/ile*.test.mjs',
];

export default [
  // Tout le reste est ignoré : un motif « ! » remet un fichier dans la vérification.
  { ignores: ['**/*.{js,mjs,cjs}', ...NOUVEAUX.map((m) => '!' + m)] },

  js.configs.recommended,

  {
    files: NOUVEAUX,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      // Le moteur tourne dans la page et dans Node (les tests, les scripts) : il ne doit compter que sur ce
      // que les deux ont en commun ; les globales des deux sont permises, la règle « pas de page » se vérifie
      // à part (le moteur n'importe rien de js/ui ni de js/carte).
      globals: { ...globals.browser, ...globals.node },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      // La justesse
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-shadow': 'error',
      'no-param-reassign': ['error', { props: false }],
      'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-implicit-coercion': ['error', { allow: ['!!'] }],
      'default-case-last': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // La lisibilité : un fichier qui dépasse se découpe en dossier (docs/ile-300.md)
      'max-lines': ['warn', { max: 1200, skipBlankLines: true, skipComments: true }],
      'max-depth': ['warn', 4],
      complexity: ['warn', 20],
      // Les performances (60 images par seconde, docs/ile-300.md) : pas de construction cachée dans les boucles
      'no-loop-func': 'error',
      'no-new-wrappers': 'error',
      'no-array-constructor': 'error',
    },
  },

  // Les scripts et les tests écrivent dans la console
  {
    files: ['scripts/ile/**/*.mjs', 'tests/engine/ile*.test.mjs'],
    rules: { 'no-console': 'off' },
  },
];
