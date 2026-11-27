# L'éditeur de pixels de l'atelier des sprites — fiche de chantier

## But

Dessiner dans l'atelier des sprites (`worker/src/sprites.html`, `/admin/sprites`) comme dans Piskel, sans
quitter la console : une couleur choisie sans limite, la sélection rectangle, le remplissage, la recoloration
de tous les pixels d'une couleur, les frames, la rotation d'une sélection. Puis s'en servir là où l'atelier
retouche aujourd'hui au crayon 1 px (Sprites 45°) et là où il renvoie vers Piskel (Personnages).

## Ce qui existe

- **Sprites 45°** : une retouche au crayon, à la gomme et à la pipette sur le sprite rendu (`[data-tool]`,
  `state.editsMap`, `applyPaintAt`, `btnUndoEdit`), sans sélection, sans remplissage ni frames.
- **🧑 Personnages** (`docs/studio-personnages.md`) : les gabarits sortent en projet `.piskel` à 3 calques
  (`genererFichierPiskel`). On dessine dans Piskel, puis le PNG revient par le vérificateur
  (`verifierEtExtrairePiece`) dans la bibliothèque. Le module expose `window.StudioPersonnages`.

## Garde-fous (toutes les fiches)

- **Une seule page.** La console sert `sprites.html` seule, avec `script-src 'unsafe-inline'`
  (`worker/src/admin.mjs`) : pas de fichier JS à part, pas de bibliothèque, aucune adresse `http(s)://`
  (`tests/engine/studio-personnages.test.mjs` le vérifie). Tout le code est dans la page.
- **Un noyau sans DOM.** La logique de dessin (pixels, remplissage, recoloration, sélection, rotation, frames,
  historique) vit dans un seul bloc `<script id="editeur-pixels-noyau">` qui ne touche ni au DOM ni aux canvas.
  Il publie `window.EditeurPixelsNoyau`. Les tests Node extraient ce bloc par son `id` et l'évaluent avec
  `new Function` (comme `tests/test-atelier.mjs` le fait pour `rampePy`). L'interface est dans un autre bloc.
- **Les pixels.** Un calque est un `Uint8ClampedArray` RGBA de `largeur × hauteur`. Rien n'est lissé
  (`imageSmoothingEnabled = false` partout) et une couleur garde ses octets exacts du crayon à l'export.
- **Téléphone et ordinateur.** L'atelier passe en 3 colonnes à partir de 1120 px. Tout outil se sert au doigt
  (un doigt dessine, deux doigts déplacent et zooment) comme à la souris (clic droit : couleur secondaire).
- **Rien ne régresse.** Sprites 45° et Personnages marchent comme avant tant que le lot 7 ne les branche pas.
- **Avant chaque PR.** `node tests/all.mjs` finit sur « Tout est vert ». Essai dans Chromium (Playwright) de
  chaque outil livré, en 412 × 860 et en 1400 × 900, sans erreur dans la console. Captures dans le dossier de
  travail de l'agent, pas dans le dépôt.
- **La doc.** `docs/editeur-pixels.md` est créée au lot 1 et tenue à jour à chaque lot : outils, raccourcis,
  formats.

## Lots

| Lot | Fiche | Dépend de |
|---|---|---|
| 1 | [Le socle : document, vue, crayon, gomme, pipette, annuler](01-socle.md) | — |
| 2 | [La couleur : sélecteur complet, alpha, palettes](02-couleur.md) | 1 |
| 3 | [La sélection rectangle : déplacer, copier, couper, coller](03-selection.md) | 1 |
| 4 | [Le remplissage et la recoloration d'une couleur](04-remplissage.md) | 1 (3 pour se limiter à la sélection) |
| 5 | [La rotation et le retournement](05-rotation.md) | 3 |
| 6 | [Les frames et les calques, l'aperçu animé, les formats](06-frames.md) | 1 |
| 7 | [Brancher l'éditeur sur Sprites 45° et sur Personnages](07-integration.md) | 1 à 6 |

Ordre conseillé : 1 → 2 → 3 → 4 → 5 → 6 → 7. Les lots 2, 3 et 6 ne dépendent que du lot 1 et peuvent être
confiés en parallèle. Les lots 4 et 5 touchent ensuite à la sélection. Sept PR.

## Hors chantier

Ce que Piskel fait aussi, mais qui n'est pas demandé : la ligne, le rectangle et l'ellipse dessinés, le crayon
miroir, la baguette magique, le lasso, l'éclaircir/assombrir, le tramage. Une fiche de plus si besoin, sur le
même noyau.
