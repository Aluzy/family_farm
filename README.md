# Ferme Familiale

Idle game de gestion agricole familiale. Tout le jeu tient dans un seul
fichier `index.html` : pas de build, pas de dépendance, pas de framework.

## Jouer en local

Ouvre `index.html` directement dans un navigateur (double-clic, ou
glisser-déposer dans une fenêtre). Ça fonctionne aussi en ouvrant le fichier
depuis le disque (`file://`), sans serveur.

La partie se sauvegarde automatiquement dans le navigateur (`localStorage`),
toutes les 10 secondes et à la fermeture de la page. Le menu **⚙️ Options**
permet d'exporter la sauvegarde en texte (à coller ailleurs, par exemple pour
en garder une copie), de l'importer, de démarrer une nouvelle partie, et
d'activer un **mode test** utile pour le développement.

## Lancer les tests

```
node run-tests.mjs
```

Aucune installation nécessaire (Node seul suffit). Le script lit
`index.html`, en extrait les blocs `core` et `tests`, les exécute, puis
affiche le nombre de tests passés/échoués. Il sort avec un code non nul si
un test échoue, ce qui permet de le brancher sur une CI plus tard.

## Les quatre blocs de index.html

Le fichier est volontairement découpé en quatre blocs, toujours dans cet
ordre, et ils ne doivent jamais être mélangés :

1. **`<style>`** — variables de thème (clair et sombre, sur `:root`), puis
   les styles des composants.
2. **`<script id="core">`** — `DATA` (toutes les valeurs d'équilibrage) puis
   `ENGINE` (la simulation pure : état, actions, tick). Ce bloc n'a aucun
   accès au DOM, à `window`, au stockage ou à l'horloge : le temps lui
   arrive en paramètre (`dt`, en secondes) et l'aléatoire vient uniquement
   du générateur à graine stocké dans l'état (`mulberry32`).
3. **`<script id="tests" type="text/plain">`** — les tests du moteur, avec
   une petite fonction `test`/`assert` maison. Le `type="text/plain"`
   empêche le navigateur de l'exécuter ; seul `run-tests.mjs` l'exécute,
   via Node.
4. **`<script id="app">`** — tout ce qui touche au DOM, au stockage
   (`localStorage`), à l'horloge et à l'interface : sauvegarde, boucle de
   jeu, rendu des onglets, menu Options, mode test.

## Où changer l'équilibrage

Toutes les valeurs de jeu (prix, rendements, durées, etc.) vivent dans
l'objet `DATA`, au début du bloc `core` de `index.html`. Aucune valeur
d'équilibrage ne doit se trouver ailleurs dans le fichier — c'est la seule
règle à respecter pour retrouver et ajuster un chiffre.

## Conception

Le document de référence est `docs/conception.md`. C'est lui qui fait foi
pour toutes les règles du jeu.

## Bugs et retours

Pas de suivi de tickets ici : je signale ce qui ne va pas directement dans
la conversation avec Claude, lot par lot.
