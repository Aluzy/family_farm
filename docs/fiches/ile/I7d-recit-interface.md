# Fiche I7d — Le récit retiré de l'interface, de l'aide et de l'encyclopédie

## Objectif

Faire que le joueur d'une partie `ACTIF` ne rencontre plus aucune trace du récit dans ce qu'il voit
et entend : fenêtres, carnet, aide, encyclopédie, pages du site, sons.

## Contexte

- I7c (le moteur ne lit plus le récit).
- Qui s'en sert, dans l'interface et la scène (relevé du 12 novembre 2026) : `js/ui/aide.js`,
  `amitie.js`, `caleche.js`, `carnet.js`, `depart.js`, `didacticiel.js`, `habitants.js`,
  `inventaire.js`, `loop.js`, `notifications.js`, `plans.js`, `scene.js`, `son.js`,
  `stage-windows.js`, `stage.js` ; `js/carte/ferme/habitants.js`, `lieux-monde.js` ; `js/son.js`.
  Refaire le relevé.
- L'encyclopédie : `encyclopedie_ferme_familiale.json` (une trentaine de mentions de Maurice, Odile
  ou Céron), `scripts/build-encyclopedie.mjs`, `js/engine/encyclopedie.js`, `js/ui/encyclopedie.js`,
  `encyclopedie.html`.
- L'aide et les règles : `js/ui/aide.js`, `tests/engine/aide.mjs`, ⚙️ Options › À propos
  (`js/ui/options.js`).
- Les pages : `index.html` (la page d'accueil), `js/ui/accueil-vivant.js`, `README.md`.
- Le son : `docs/son.md`, `js/ui/son.js` (des ambiances ou des jingles liés aux scènes ?).

## À faire

1. **Les fenêtres** : le carnet du récit (`carnet.js`) ne s'ouvre plus avec `ACTIF` (I7g mettra la
   chronique à sa place) ; les fenêtres de scène et de courrier ne sont plus atteignables ; les
   notifications et les plans ne citent plus de personnage.
2. **L'aide** : réécrite pour l'île à bâtir (le port, le bac, les villageois, les tâches, le tableau,
   les commerces), dans le ton de l'aide actuelle : des règles, pas d'histoire.
3. **L'encyclopédie** : les entrées du monde (Céron, les hameaux, les personnages, la calèche)
   sortent ; des entrées neuves pour le port, le bac, les villageois, les tâches, chaque commerce.
   Deux sources pendant le chantier (une par état du réglage), une seule après la bascule : le dire
   dans `scripts/build-encyclopedie.mjs`.
4. **La page d'accueil et le README** : préparer les textes de l'île à bâtir dans des fichiers à
   part, que I9h mettra en place ; ne pas changer le site publié.
5. **Le son** : couper ce qui se déclenchait sur une scène ; garder musiques et ambiances.
6. **Un contrôle de textes** (`village-textes.test.mjs`) : aucun texte atteint par une partie
   `ACTIF` (données compilées, aide, encyclopédie neuve) ne contient un nom du récit (la liste :
   Maurice, Philomène, Adèle, Odile, Achille, Frida, Basile, Théo, Garance, Lise, Fernand, Céron,
   Cadolon, Le Gué, Bois-Joli, Les Genêts, Les Mouettes, Brumeval) ni « calèche », « cocher »,
   « hameau ».

## Hors périmètre

- Supprimer les fichiers du récit et `docs/recit/` (I9h) ; la chronique (I7g).

## Critères d'acceptation

- Le contrôle de textes passe.
- Dans Chromium, `?village=1` : parcourir toutes les fenêtres, l'aide et l'encyclopédie sans trouver
  de trace du récit ; avec le réglage éteint, tout est comme avant.

## Vérifications et livraison

Celles du README du chantier. Captures : l'aide, trois entrées neuves de l'encyclopédie.
