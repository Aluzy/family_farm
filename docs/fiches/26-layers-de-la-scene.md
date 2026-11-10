# Fiche 26 — Le décor loin de la vue hors de la liste d'affichage (au lieu des Layers)

Chantier « Phaser 4 », piste 2 du rapport. **Fait**, autrement que prévu : les mesures ont montré que
les quatre Layers proposés (sol, monde trié, ciel, voiles) n'auraient presque rien gagné.

## Ce que disaient les mesures

Sur la partie du jour 75 (Chromium, sans ralenti) :

- la liste d'affichage tient ≈ 4 600 images ; Phaser la trie **à chaque image**, même immobile : les
  bêtes de l'Étable et du Poulailler (`chantier.js`, 38 demandes de tri par image), les abeilles (13 à
  40), les rouges-gorges (5) changent de profondeur sans arrêt ;
- ≈ 3 250 de ces images se rangent selon leur pied (le Layer « Monde » de la fiche), ≈ 1 320 sont au
  sol : les Layers n'auraient retiré du tri que le sol (≈ 30 %), au prix des 186 appels à `setDepth` ;
- seules ≈ 320 des images « monde » sont près de la vue ; un tri limité à la vue, essayé, donne la même
  image au pixel près mais **ne gagne rien** (0,84 ms contre 0,9) : ce qui coûte n'est pas l'algorithme
  de tri, c'est de passer sur 4 600 objets à chaque image (Phaser le fait aussi au rendu) ;
- sortir de la liste ce qui est loin de la vue gagne, lui : le rendu par image (tri et parcours) passe de
  2,75 à 1,8 ms sur la ferme et de 1,9 à 0,9 ms dans le grand monde.

## Ce qui est fait

- `js/carte/ferme/decor.js`, `cullScene` (déjà là : il marquait `horsVue` les images hors de la vue,
  toutes les 300 ms ou quand la vue bouge de 8 px) : les images du **décor fixe** loin de la vue (au-delà
  d'une vue de chaque côté, un quart de plus pour ne pas aller et venir) passent dans un calque caché
  (`this.reserveVue`, un `Layer` invisible) ; elles reviennent quand la vue approche (revu toutes les
  secondes, ou quand la vue a bougé d'un quart), le tri les remet à leur rang, le brouillard est revu.
- **Le décor fixe** (`img.fixe`) : les arbres, rochers, herbes hautes, ramassables, blocs et végétation du
  grand monde (ceux que `cullDecor` marquait déjà), les dalles des murs, les sols posés, la terre et les
  cultures des parcelles. Le reste (sprites des personnages et des bêtes, abeilles, ombres, images des
  réserves réutilisées, voiles) ne quitte jamais la liste : une image que son code déplace pourrait revenir
  près de la vue sans que la vue bouge et manquer jusqu'à la revue suivante (c'est arrivé à l'ombre du
  soleil pendant l'essai) ; les surveiller toutes à chaque image coûtait 0,7 ms, autant que le gain.

## Mesures (Chromium, la sauvegarde du jour 75 ; rendu + cullScene, par image)

| | main | après |
|---|---|---|
| Ferme (≈ 2 060 images restent dans la liste sur 4 580) | 2,66 à 2,77 ms | 2,11 à 2,56 ms |
| Grand monde (≈ 730 sur 3 070) | 1,68 à 1,73 ms | 0,98 ms |

Le premier passage (≈ 2 500 images mises à l'écart d'un coup) coûte ≈ 16 ms, une fois, au chargement.

## Vérifié

- Les captures, scène en pause, avec la réserve et tout remis dans la liste : identiques au pixel près
  (ferme de jour, ferme de nuit, grand monde).
- À chaque image, aucune image mise à l'écart à l'écran : 6 s de marche dans chaque direction (≈ 700
  images sur la ferme, ≈ 850 dans le monde), et des sauts de la vue d'un bout à l'autre de la carte.
- `npm test`, `node tests/smoke.mjs`.
