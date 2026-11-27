# Lot 7 — Brancher l'éditeur sur Sprites 45° et sur Personnages

## Objectif

Se servir de l'éditeur là où l'atelier en a besoin : retoucher un sprite de Sprites 45° avec tous les outils,
et dessiner une pièce de personnage dans l'atelier, du gabarit à la bibliothèque, sans passer par Piskel.

## Contexte

Les lots 1 à 6 sont faits. Lire dans `sprites.html` :
- Sprites 45° : `state.editsMap`, `applyPaintAt`, `shadeGBuffer` (les retouches posées après le rendu), les
  exports (`btnExpSprite`, `buildExtrudedSheet`) ;
- Personnages : `construireCalques48`, `genererFichierPiskel`, `verifierEtExtrairePiece`,
  `enregistrerResultatVerif`, `window.StudioPersonnages`, et `docs/studio-personnages.md`.

## À faire

1. **Une porte d'entrée commune** : `window.EditeurPixels.ouvrir({ document, titre, palette, verrous,
   auRetour })` ouvre le module Dessin sur ce document. Un bouton « ✓ Renvoyer » appelle `auRetour(doc)`
   puis revient au module d'origine. « Annuler » revient sans rien changer.
2. **Sprites 45°** :
   - « ✏️ Retoucher dans l'éditeur » ouvre le sprite rendu (avec ses retouches) dans un document à deux
     calques : le rendu, verrouillé, et un calque de retouche vierge ;
   - au retour, le calque de retouche devient les retouches (`editsMap` : pixels posés et pixels gommés à
     alpha 0). Les réglages qui suivent repeignent le rendu sous elles, comme aujourd'hui ;
   - la barre crayon, gomme et pipette 1 px reste pour les petites touches.
3. **Personnages** :
   - sur chaque gabarit, « ✏️ Dessiner ici » ouvre l'éditeur avec les 3 calques de `construireCalques48` :
     le guide fantôme (verrouillé, jamais exporté), les points d'attache (verrouillés, sauf « déplacer un
     point »), le dessin (le calque courant). La pièce déjà validée en bibliothèque s'ouvre si elle existe ;
   - la palette « Personnages » (lot 2) est la palette active. Toute couleur hors des tons permis est
     signalée en direct (comme le vérificateur : tons réservés, contour, blanc de l'œil, attaches, et
     `#00FF00` sur un couvre-chef seulement). Les couleurs à alpha partiel sont refusées sur ce calque ;
   - « ✓ Renvoyer » compose les calques attaches et dessin et passe le résultat par `verifierEtExtrairePiece`
     sous le nom du gabarit. Une pièce acceptée entre dans la bibliothèque (`enregistrerResultatVerif`). Un
     refus reste dans l'éditeur, avec le rapport et chaque erreur pointée sur ses pixels ;
   - les gestes de plusieurs temps (houe, hache…) : une pièce d'outil peut s'ouvrir avec une frame par temps,
     chacune renvoyée sous son nom (`outil_houe-pret`, `-leve`…).
4. **La doc** : `docs/studio-personnages.md` (dessiner dans l'atelier, Piskel devient facultatif) et
   `docs/editeur-pixels.md` (`EditeurPixels.ouvrir`).

## Hors périmètre

Retirer l'export `.piskel` des gabarits : il reste pour qui préfère Piskel.

## Critères d'acceptation

- Une retouche faite dans l'éditeur se retrouve à l'identique dans l'export PNG de Sprites 45°.
- Une pièce dessinée dans l'éditeur et renvoyée est acceptée par le vérificateur aussi bien qu'un PNG exporté
  de Piskel : mêmes ancres, mêmes pixels.
- L'assemblage (onglet « 3. Assembler & 111 Cases ») prend aussitôt la pièce dessinée à la place de la pièce
  démo.
- Les tests de `tests/engine/studio-personnages.test.mjs` passent sans changement.

## Vérifications

- `tests/engine/editeur-pixels.test.mjs` : le passage d'un document à `editsMap` (posés, gommés), la
  composition attaches + dessin d'un gabarit (le guide jamais pris).
- Chromium : retoucher le renard de démonstration et l'exporter. Dessiner un buste femme de face depuis son
  gabarit, le renvoyer, le voir accepté puis dans l'assemblage. Provoquer un refus (une couleur dérivée) et
  voir le pixel pointé.

## Livraison

Un commit, en français, terminé par les lignes d'attribution. Mettre à jour `00-chantier.md` (le chantier est
fait).
