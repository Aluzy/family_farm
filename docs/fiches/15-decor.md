# Fiche 15 — Le décor : les bords des chemins et les candélabres

## Objectif

1. **Les bords des chemins** sur la carte (ferme et monde) sont moins anguleux :
   - des brins d'herbe qui dépassent de la tuile d'herbe sur le chemin ;
   - des coins arrondis ;
   - un bord irrégulier, mais régulier d'une tuile à l'autre (aucune couture visible).
   - Voir `js/carte/ferme/sol.js` (`paintRegion`), `js/engine/monde-sol.js` et les scripts de
     tuiles (`scripts/carte/`).
   - Le coût du rendu ne doit pas monter : mesurer avant et après.
2. **Les candélabres** : un nouveau bloc à poser, de 2 blocs de haut et d'un demi-bloc de large.
   - Un pied de fer forgé et une ou plusieurs bougies (ou une lanterne) en haut, dans le style des
     blocs (`scripts/carte/blocs.py`).
   - Il éclaire la nuit comme les autres lumières (`js/carte/lumiere.js`).
   - Il se fabrique à l'Atelier (lingots de fer, cire ou suif s'ils existent, sinon un ingrédient
     cohérent), se pose dans le mode Construire, dedans comme dehors, et compte comme meuble ou
     décor selon les règles des blocs (`js/engine/blocs*`, `data/meubles.json`).
   - Prévoir son icône, sa page d'encyclopédie et sa ligne d'aide.

## Critères d'acceptation

- Dans Chromium, aucune erreur de console :
  - les chemins de la ferme et du monde ont des bords doux, avec de l'herbe qui déborde ;
  - un candélabre se fabrique, se pose, a la bonne taille et s'allume la nuit.
- `npm test` vert, test de fumée sans erreur.

## Livraison

Un commit, pas de push. Rendre compte :
- le rendu des bords et sa mesure ;
- le candélabre (dessin, recette, lumière) ;
- les vérifications ;
- 4 à 6 captures (bords avant/après, candélabre de jour et de nuit).
