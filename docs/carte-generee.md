# La ferme générée (projet)

Une ferme quatre fois plus grande que la carte dessinée dans Tiled, générée d'après une graine,
sans bâtiment au départ : on ramasse, on fabrique et on construit bloc par bloc.

## Décisions

- **Taille** : 4 fois la surface de la carte actuelle, soit 144 × 114 tuiles de 16 px
  (2304 × 1824 px).
- **Graine** : la même graine donne toujours la même carte. La sauvegarde ne garde que la
  graine et ce que le joueur a changé (blocs posés, ressources prises).
- **Accès à la transition** : un chemin garanti mène au bord est. Il se termine sur le
  rectangle `vers_la_transition`, que la carte générée fournit comme celle de Tiled.
- **Parties en cours** : elles gardent la carte de Tiled. Seules les nouvelles parties ont la
  carte générée.
- **Paiement** : les bâtiments se paient en matériaux seulement. Les pièces ne servent qu'à
  acheter des matériaux au Marché.

### Ramassage à la main

Des petites pierres, des morceaux de bois et des herbes se ramassent sans outil, avec un petit
coût d'énergie :

| Ressource ramassée | Objet obtenu |
|---|---|
| petite pierre | 1 pierre |
| morceau de bois | 1 bois |
| herbe | 1 fibre |

Chaque nuit, quelques-unes repoussent à des endroits tirés d'après la graine et le jour.

### L'atelier niveau 1

L'atelier coûte 3 bois et 3 pierres. Il permet de fabriquer :

| Recette | Résultat |
|---|---|
| 2 bois | 1 planche |
| 4 pierres | 1 mur en pierre |
| 3 planches | 1 porte |
| 3 fibres | 1 paillasse |
| bois + pierre + fibre | hache, pioche et houe en pierre (quantités à fixer) |

Le Marché vend toujours les outils.

### Construction bloc par bloc

- On pose chaque mur et chaque porte sur une case de la carte.
- Un espace entièrement entouré de murs, avec au moins une porte, devient une **pièce close**.
- Les autres bâtiments suivent la même logique.
- Il n'y a **pas de toit** : on voit les murs et l'intérieur d'en haut.

### Dormir

- Une paillasse ne se pose que dans une pièce close.
- Il faut **une paillasse par personne**. Un membre de la famille sans paillasse ne dort pas et
  ne regagne pas l'énergie de la nuit.

## La ferme générée (étape 2)

- **La carte** : `genererFerme(graine)` rend une carte au format de Tiled (144 × 114 tuiles),
  dessinée avec les tuiles du décor version 2, comme `scripts/carte/carte_v2.py` dessine la carte
  de Tiled :
  - l'herbe en trois teintes, qui ondulent selon un bruit ;
  - 2 à 4 étangs avec leurs rives (le premier assez grand pour le brochet), et le tronc creux au
    bord de l'un d'eux ;
  - des bois (arbres clairs, pins, buissons), plus denses vers les bords ;
  - 64 rochers, des fleurs, des touffes d'herbe haute.
- **Le chemin** est tracé par un A* (`js/engine/chemin.js`), de la porte de la maison au bord
  est. Le rectangle `vers_la_transition` y est posé.
- **Le terrain** (`js/engine/terrain-carte.js`) est calculé d'après la carte, avec les règles de
  `scripts/carte/terres.py`. Un test vérifie qu'il redonne exactement `data/terrain.json` pour la
  carte de Tiled.
- **La cour, provisoire** : en attendant la construction bloc par bloc (étape 4), les bâtiments
  de la carte de Tiled gardent leur disposition dans une cour dégagée (`DECALAGE` : son
  emplacement, en tuiles). Le sommeil, les bêtes, le robot, les parcelles de départ et le Verger
  marchent comme avant.
- **La partie** garde sa graine dans `state.carte.graine` (sauvegardée). `farmTerrain(state)`,
  `farmMap(state)` et `farmPoint(state, p)` (un point de la carte de Tiled, décalé avec la cour)
  la lisent. La page passe la carte à la scène au montage (`ctx.carte`).
- **Performances**, sur une ferme quatre fois plus grande :
  - les ombres du soleil sont peintes dans un canevas de la taille de la vue ;
  - les arbres, rochers et touffes hors de la vue ne sont pas dessinés ;
  - l'eau animée n'est repeinte que dans la vue.

  Le calcul par image reste celui de la carte de Tiled (environ 1 ms dans Chromium). Le sol
  reste une seule image (2304 × 1824 px, sous la limite de 4096 px des téléphones) : le passer en
  calques de tuiles ne s'est pas révélé nécessaire.

## Étapes

1. ✅ Le terrain ne dépend plus de la carte. Le moteur passe par `farmTerrain(state)`
   (`js/engine/terrain.js`). La scène lit la taille de la carte et la sortie
   `vers_la_transition`.
2. ✅ Le générateur à partir de la graine (`js/engine/ferme-generee.js`), à essayer dans le
   mode test (« Essayer la ferme générée », une graine au choix ou au hasard ; « Revenir à la
   ferme dessinée »). Voir « La ferme générée » plus haut.
3. Les ressources ramassables, l'atelier, et les objets et recettes de matériaux.
4. La pose bloc par bloc, la détection des pièces closes, les paillasses et le sommeil.
5. La nouvelle partie sur la carte générée, l'ajustement de la progression, et les tests.
