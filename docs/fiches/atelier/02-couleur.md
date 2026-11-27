# Lot 2 — La couleur : sélecteur complet, alpha, palettes

## Objectif

Choisir n'importe quelle couleur, transparence comprise, de toutes les façons qu'offre Piskel : la teinte à
l'œil, les valeurs exactes, la pipette, les couleurs récentes, les palettes du jeu et celles qu'on importe.

## Contexte

Le lot 1 est fait : le module ✏️ Dessin, le noyau `EditeurPixelsNoyau`, des couleurs primaire et secondaire
choisies par un `<input type="color">` (sans alpha). Lire aussi dans `sprites.html` :
- `PALETTE_GPL` et `CFG.TONS_RESERVES` / `CFG.POINTS_ATTACHE` (module Personnages) : les 28 tons réservés et
  les 9 couleurs d'attache ;
- `RAMPES`, `installerRampes` et `chargerDonneesJeu` : les rampes du jeu servies par `/admin/api/atelier`
  (une palette de secours hors de la console).

## À faire

1. **Le sélecteur**, dessiné dans la page (pas l'`<input type="color">` du système, qui n'a pas d'alpha) :
   - un carré saturation × valeur et une barre de teinte (TSV), une barre d'alpha sur damier ;
   - les champs hexadécimal (`#RRGGBB` et `#RRGGBBAA`), R, V, B, A (0–255), T (0–360), S et V ou L (0–100) ;
     ils se suivent tous ;
   - la pastille primaire et la pastille secondaire. On les inverse avec X ou en les touchant ; la pastille
     touchée est celle qu'on règle ;
   - la conversion TSV ↔ RVB est dans le noyau (`versTSV`, `depuisTSV`, `versTSL`, `depuisTSL`, `hex`),
     arrondie de façon stable : une couleur saisie en hexadécimal ressort avec les mêmes octets.
2. **La pipette**, déjà là, remplit la pastille active et la met en tête des couleurs récentes.
3. **Les couleurs récentes** : les 16 dernières employées, sans doublon.
4. **Les palettes** (une liste déroulante, des pastilles qu'on touche) :
   - *Couleurs du dessin* : les couleurs opaques du document, de la plus à la moins employée, avec leur nombre
     (la règle du CLAUDE.md sur le nombre de couleurs se lit d'un coup d'œil) ;
   - *Personnages* : les 28 tons réservés, le contour `#2B1D14`, le blanc de l'œil `#FAF6F0`, le masque
     `#00FF00` et les 9 couleurs d'attache, nommés comme dans `PALETTE_GPL` ;
   - *Rampes du jeu* : une rampe choisie (rangées par groupe, comme `optionsRampes`) donne ses tons ;
   - *Mes palettes* : importer un `.gpl` (GIMP) ou un `.json` de palette Piskel, ajouter la couleur active,
     retirer une couleur, exporter en `.gpl`. Elles sont gardées dans `localStorage` (lecture et écriture dans
     un `try/catch`).
5. **Les raccourcis** : X inverse les deux couleurs ; les flèches, dans le carré, avancent d'un cran.

## Hors périmètre

Remplacer une couleur partout (lot 4), les contrôles propres à Personnages (couleur non permise, attaches :
lot 7).

## Critères d'acceptation

- Toute couleur RVBA s'obtient, au clavier comme à l'œil, et le crayon pose exactement ces octets.
- Un `.gpl` exporté puis réimporté donne la même palette, dans le même ordre.
- Le sélecteur tient sur un écran de 412 px de large, sans débordement horizontal.

## Vérifications

- `tests/engine/editeur-pixels.test.mjs` : aller-retour RVB → TSV → RVB et RVB → TSL → RVB sur les 28 tons
  réservés et sur 1 000 couleurs tirées d'une graine fixe (aucun écart d'octet), lecture et écriture `.gpl`
  (commentaires, colonnes, espaces).
- Chromium : régler une couleur par chaque moyen, la peindre, la relire à la pipette ; importer
  `moon-bloom-personnages.gpl` (le bouton « Palette Piskel » de Personnages).

## Livraison

Un commit, en français, terminé par les lignes d'attribution. Mettre à jour `docs/editeur-pixels.md` et
`00-chantier.md`.
