# Lot 3 — La sélection rectangle : déplacer, copier, couper, coller

## Objectif

Sélectionner un rectangle de pixels, puis le déplacer, le copier, le couper, le coller ou l'effacer, comme
l'outil « sélection rectangle » de Piskel. Les autres outils restent dans la sélection quand il y en a une.

## Contexte

Le lot 1 est fait (le noyau, la vue, l'historique). Le lot 2 peut l'être ou non : ce lot n'en dépend pas.

## À faire

1. **Le noyau** :
   - une sélection `{ x, y, largeur, hauteur }`, coupée aux bords de l'image ;
   - `lever(doc, sel)` crée un **calque flottant** `{ x, y, largeur, hauteur, pixels }` et vide la place
     d'origine ;
   - `poser(doc, flottant)` le colle sur le calque courant, en mélange alpha comme `composer` ;
   - `copier`, `couper`, `effacer`, `toutSelectionner`. Chaque action est **une** entrée de l'historique
     (lever, déplacer puis poser ne font qu'un geste).
2. **L'outil** (raccourci S) : un glisser trace le rectangle (pointillés animés, taille en pied de vue). Un
   glisser à l'intérieur de la sélection lève son contenu et le déplace au pixel entier ; les flèches le
   déplacent de 1 px, avec Maj de 10 px. Entrée ou un clic hors de la sélection pose le contenu, Échap annule
   le déplacement en cours.
3. **Le presse-papiers** : Ctrl+C, Ctrl+X, Ctrl+V. Le collage arrive flottant au coin haut-gauche de la vue
   visible (ou à la place copiée si elle est visible), prêt à être déplacé. Copier écrit aussi un PNG dans le
   presse-papiers du système quand le navigateur le permet (`navigator.clipboard.write`). Coller lit d'abord
   une image du système, sinon le presse-papiers interne. Un refus du navigateur n'est pas une erreur : on
   garde l'interne.
4. **Les autres outils dans la sélection** : crayon, gomme et, au lot 4, remplissage et recoloration ne
   touchent que l'intérieur. Ctrl+D (ou un bouton) désélectionne, Ctrl+A sélectionne tout.
5. **Au doigt** : les boutons « Copier », « Couper », « Coller », « Effacer », « Valider » apparaissent dans
   la barre de l'outil pendant une sélection.

## Hors périmètre

La rotation et le retournement de la sélection (lot 5), le lasso et la baguette magique (hors chantier).

## Critères d'acceptation

- Couper puis coller à la même place rend l'image identique ; annuler une fois défait tout le déplacement.
- Une sélection qui dépasse du bord de l'image est coupée au bord. Un contenu posé en partie hors de l'image
  perd ce qui dépasse, sans erreur.
- Les pixels semi-transparents d'un contenu déplacé gardent leur alpha exact.

## Vérifications

- `tests/engine/editeur-pixels.test.mjs` : lever et poser (bord, hors de l'image, alpha), un seul pas
  d'historique pour un déplacement, couper-coller identique.
- Chromium : sélectionner, déplacer à la souris et aux flèches, copier dans un autre document, coller une image
  copiée depuis un autre onglet, Échap pendant un déplacement.

## Livraison

Un commit, en français, terminé par les lignes d'attribution. Mettre à jour `docs/editeur-pixels.md` et
`00-chantier.md`.
