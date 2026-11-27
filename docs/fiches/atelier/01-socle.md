# Lot 1 — Le socle : document, vue, crayon, gomme, pipette, annuler

## Objectif

Un troisième module de l'atelier, **✏️ Dessin**, qui ouvre ou crée une image et la dessine au pixel près, avec
annuler/rétablir. C'est le socle sur lequel les lots suivants posent leurs outils.

## Contexte

Lire d'abord `docs/fiches/atelier/00-chantier.md` (garde-fous), puis dans `worker/src/sprites.html` :
- le commutateur `#atelierSwitch` et la règle CSS `.app[data-atelier="perso"]`. Un nouveau module se range
  dans `.app`, comme `#persoWorkspace` ;
- la retouche de Sprites 45° (`applyPaintAt`, `state.editsMap`), pour l'ergonomie actuelle ;
- `tests/test-atelier.mjs`, pour la façon d'extraire du code de la page dans un test.

## À faire

1. **Le module.** Un bouton `✏️ Dessin` dans `#atelierSwitch` (`data-atelier-btn="dessin"`) et un
   `#dessinWorkspace` dans `.app`, masqué hors de ce module, sur la même mise en page que Personnages : la vue,
   puis le panneau (3 colonnes sur ordinateur).
2. **Le noyau** (`<script id="editeur-pixels-noyau">`, `window.EditeurPixelsNoyau`), sans DOM :
   - `creerDocument(largeur, hauteur)` → `{ largeur, hauteur, frames: [{ calques: [{ nom, visible, opacite,
     pixels }] }], courant: { frame, calque } }`. Le lot 6 se sert déjà de cette forme (plusieurs frames et
     calques) ; ici, une seule frame et un seul calque ;
   - `lirePixel`, `ecrirePixel(doc, x, y, rgba)` (hors de l'image : sans effet), `trait(doc, x0, y0, x1, y1,
     rgba, taille)` : la ligne de Bresenham entre deux points du pointeur, pour qu'un geste rapide ne laisse
     pas de trous. Taille du crayon : 1 à 4 px, carrés ;
   - `composer(doc, frame)` → RGBA des calques visibles, par-dessus les uns les autres (alpha « source over »
     calculé en entiers, résultat déterministe) ;
   - **l'historique** : chaque geste ferme une entrée `{ avant, apres }` qui ne garde que la boîte des pixels
     touchés, pas une copie de l'image. `annuler` et `retablir`, 100 entrées au plus. Un geste neuf efface ce
     qui pouvait être rétabli.
3. **La vue** (un canvas) : le zoom (1× à 64×, molette ou pincement, centré sur le pointeur), le déplacement
   (barre d'espace + glisser, clic du milieu, deux doigts), la grille des pixels à partir de 6×, un damier
   sous la transparence, le pixel et la couleur survolés en pied de vue. Le rendu ne redessine que ce qui a
   changé (une seule mise à jour par image, `requestAnimationFrame`).
4. **Les outils** : crayon, gomme (alpha à 0), pipette (prend la couleur composée ; Alt maintenu = pipette
   pendant un autre outil). Couleur primaire au clic gauche ou au doigt, secondaire au clic droit, sans menu
   contextuel. Le choix de la couleur reste un `<input type="color">` en attendant le lot 2.
5. **Ouvrir et enregistrer** : nouveau document (largeur et hauteur de 1 à 512, préréglages 16, 32, 48 × 48
   et 64), ouvrir un PNG (glisser-déposer, choix de fichier, coller ; 1 px = 1 px, alpha gardé), exporter le
   PNG de la frame courante.
6. **Raccourcis** (proches de Piskel) : P crayon, E gomme, O pipette, Ctrl+Z / Ctrl+Y (et Ctrl+Maj+Z),
   + / − zoom, 0 « tout voir ». Ils ne jouent que dans le module Dessin et jamais dans un champ de saisie.
7. **La doc** : créer `docs/editeur-pixels.md` (le module, le noyau, les outils, les raccourcis) et la citer
   dans le tableau des docs du `README.md`.

## Hors périmètre

La couleur complète (lot 2), la sélection (lot 3), le remplissage (lot 4), la rotation (lot 5), les frames et
calques multiples (lot 6), les liens avec Sprites 45° et Personnages (lot 7).

## Critères d'acceptation

- Un trait rapide à la souris ou au doigt ne laisse aucun trou. Annuler défait le geste entier, rétablir le
  refait, au pixel près.
- Un PNG ouvert puis exporté sans retouche ressort identique octet par octet après décodage (mêmes RGBA).
- 128 × 128 à 16× : le dessin suit le doigt sans saccade (aucune image au-delà de 16 ms dans le profil
  Chromium pendant un trait).
- Sprites 45° et Personnages fonctionnent comme avant.

## Vérifications

- `tests/engine/editeur-pixels.test.mjs` (nouveau) : extrait le bloc `editeur-pixels-noyau` et teste `trait`
  (diagonales, trait d'un seul point, taille 4 au bord de l'image), `composer` (opacité, calque masqué),
  annuler/rétablir (y compris une branche effacée par un geste neuf, la limite de 100 entrées).
- Le test qui interdit les adresses externes dans `sprites.html` passe toujours.
- Chromium, en 412 × 860 et 1400 × 900 : créer un 32 × 32, dessiner, gommer, pipette, annuler, rétablir,
  exporter puis comparer le PNG ; aucune erreur dans la console.

## Livraison

Un commit sur la branche de travail, en français, terminé par les lignes d'attribution de la session. Mettre à
jour `docs/fiches/atelier/00-chantier.md` (lot 1 : fait).
