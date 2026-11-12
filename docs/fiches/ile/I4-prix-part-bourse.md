# Fiche I4 — Les prix des filières, la part et la bourse

## Objectif

Rendre l'économie des villageois juste et lisible : chaque étape de transformation ajoute de la
valeur, le villageois garde une part de ce qu'il produit, et sa bourse sert à quelque chose.

## Contexte

- `docs/ile.md`, « Les constats » : la laine, le bois et les vêtements perdent de la valeur en étant
  transformés ; un villageois rapporterait 2 à 7 fois ce qu'il mange ; les bourses ne sont jamais
  dépensées.
- Les prix : `data/items.json` (`prix`), `data/general.json` (`MARCHE.MULTIPLICATEUR_PRODUCTION` : 2,
  `TRANSFORMATIONS_DOUBLEES`), `data/recipes.json` (`coefPrix` : 160 à 300 pour la cuisine),
  `js/engine/catalog.js` (où le multiplicateur s'applique), `DATA.ATELIER.RECETTES`.
- Les outils de mesure : I0b (les comptes de la simulation), I3d (`tableau.js`).
- `tests/test-data.mjs` (les contrôles de cohérence des données).

## À faire

1. **Le relevé**, d'abord, dans le compte rendu : pour chaque recette de l'Atelier et chaque filière
   (bois → planche → meuble ; minerai → lingot → outil ; laine → tissu → vêtement ; lait → fromage ;
   blé → farine → pain ; fibre → paille, corde), le coût des entrées et la valeur de la sortie.
2. **La règle** : toute transformation rend entre 130 et 160 % de la valeur de ses entrées (la
   cuisine garde ses coefficients). La poser dans les données comme un `coefPrix` par recette de
   l'Atelier, le prix de la sortie en étant déduit au chargement (comme les plats), plutôt que des
   prix écrits à la main. Un contrôle dans `tests/test-data.mjs` refuse une recette hors de la
   fourchette, sauf exception notée.
3. **La part** (`VILLAGE.PART`, 30 % proposé) : chaque jour, la part de la valeur de ce qu'il a
   produit va à sa bourse, **prise sur le produit** et non sur la caisse du joueur (il garde une
   part de la récolte, vendue pour lui au prochain passage au port) : pas de dette possible (B-1).
   Le tableau (I3d) l'affiche dans le coût.
4. **La bourse dépensée** : un villageois achète ce qu'il aime (ses goûts, `amitie.js`) et ce dont
   il a besoin (un meuble pour sa maison, un vêtement) : à l'**étal** du joueur (un bloc de
   l'Atelier où le joueur met en vente, à son prix de vente), puis aux commerces (lot 5), enfin par
   le bac (un import à lui, qui retire de l'argent de l'île). Un achat qui lui plaît monte son
   bonheur.
5. **L'équilibre visé**, à vérifier par la simulation et à donner en chiffres : un villageois bien
   placé rapporte 1,5 à 2,5 fois ce qu'il coûte (repas et part) ; mal placé, à peine plus que son
   coût ; les pièces en caisse à la nuit 80 ne dépassent plus la borne d'I0b.
6. **Les parties en cours** : les prix changent pour tout le monde à la bascule ; rien à migrer dans
   la sauvegarde (les prix ne s'y gardent pas), mais le noter pour I7f (une ligne dans la fenêtre de
   retour).
7. **Les tests** : la fourchette des recettes ; la part prise sur le produit, jamais sur la caisse ;
   l'achat à l'étal ; l'entier partout ; `marche.test.mjs`, `cuisine.test.mjs` adaptés.

## Hors périmètre

- Les commerces d'artisans (lot 5) ; les contrats d'export (I8b) ; le port (I1c).

## Critères d'acceptation

- Le relevé avant/après : plus aucune filière ne perd de valeur.
- Le tableau des villageois montre des soldes contrastés selon la tâche ; un villageois achète à
  l'étal et sa bourse baisse.
- La simulation tient l'équilibre visé, ou l'écart est expliqué et un réglage proposé.

## Vérifications et livraison

Celles du README du chantier. Joindre le relevé (un tableau) et le résumé de la simulation.
