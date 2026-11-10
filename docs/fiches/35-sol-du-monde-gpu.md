# Fiche 35 — Le sol du grand monde en TilemapGPULayer

> **Écartée (2026-11-10)** sur la mesure du téléphone (le point 1) : le sol GPU y est nettement moins fluide que
> le sol peint (31 à 32 images par seconde au lieu de 55, une image de 3 à 4 s au premier dessin). Le sol du grand
> monde reste peint ; l'essai de la fiche 34, sa planche et le bouton « Essai sol GPU » ont ensuite été retirés
> (l'historique git les garde). Voir « La mesure du téléphone » en fin de fiche.

Chantier « Phaser 4 », suite de l'essai de la fiche 34 (la décision : `docs/architecture-phaser.md`, « Les objets
GPU de Phaser 4 »). À faire seulement si la mesure sur le téléphone de référence (point 1) confirme celle de
Chromium.

## Objectif

Que le sol du grand monde hors de la ferme ne soit plus peint dans des morceaux de canevas (`sol.js`) mais
dessiné par des `TilemapGPULayer` : moins de peinture en marchant, moins de mémoire de canevas, plus de
canevas vidés par le navigateur à réparer (`repairGround`) pour ces régions.

## Contexte

- L'essai : `js/carte/ferme/sol-gpu.js` (éteint, `localStorage['ferme-essai-sol-gpu']`), la planche réunie et
  extrudée `assets/sol_gpu.png` (`scripts/carte/planche_sol_gpu.py`). Mesures et captures : fiche 34, `docs/perf.md`.
- Ce que l'essai ne fait pas : le décor des chemins (`gravier.js`), les petites plantes et pierres (peintes dans
  le sol ; le SpriteGPULayer a été écarté : plus lent en forêt), la lecture du sol par les touffes (`lireSol`),
  la repeinture partielle (une petite pièce prise refait toute la région).

## La mesure sur le téléphone (le point 1)

Le panneau de test (🧪, 📏 Mesures) a un bouton **« Essai sol GPU : … »** : chaque appui passe à l'état
suivant (éteint → le sol → le sol et le décor → éteint) et recharge la page (l'état est gardé dans l'appareil,
`localStorage['ferme-essai-sol-gpu']`). Le rapport de **« Mesurer 30 s »** dit l'état de l'essai et combien des
régions dessinées le sont en GPU (« régions dessinées : 4, dont 4 en GPU »).

Le protocole : dans une forêt du grand monde, loin de la ferme (toutes les régions de la vue en GPU),
« Mesurer 30 s » en marchant, l'essai éteint, puis « le sol », puis « le sol et le décor » ; la même chose près
de la ferme ; copier les six rapports (le bouton « Copier le rapport »). Remettre l'essai à « éteint » ensuite.

## À faire

1. **Mesurer sur le téléphone** (🧪 **Mesurer 30 s**, essai '1' et éteint, en forêt et près de la ferme) : images
   par seconde, chargement, mémoire. Écarter la fiche si le sol GPU n'y est pas au moins aussi fluide.
2. **Les petites plantes et pierres** : un canevas de décor par région, transparent, peint par morceaux comme
   aujourd'hui mais sans le sol (ou des images ordinaires, rangées en lots) ; choisir sur mesure.
3. **Le décor des chemins** : le même canevas de décor que le point 2.
4. **La repeinture partielle** : `putTileAt` et `generateLayerDataTexture()` sur les seules cases changées.
5. **Les touffes** (`herbes.js`) : leur couleur lue dans la planche (la tuile de la case) au lieu du canevas.
6. **Le chargement** : la planche réunie (13 Mo au GPU) chargée seulement quand une région du monde en a besoin.
7. Retirer le réglage d'essai une fois la migration faite ; les régions qui touchent la ferme gardent leurs morceaux.

## Critères d'acceptation

- Le même sol au pixel près (captures, zoom entier et non entier) ; aucun liseré.
- Sur le téléphone : au moins autant d'images par seconde qu'avant en forêt ; le chargement pas plus long de
  plus de 0,5 s.

## Vérifications

`npm run build`, `npm test`, `node tests/smoke.mjs` ; Chromium et le téléphone de référence.

## La mesure du téléphone (2026-11-10)

Android 10, Chrome 156, 8 processeurs, 8 Go, écran 393 × 873 à la densité 2,53, qualité « économie » ; la partie
du jour 75 ; « Mesurer 30 s » en marchant dans le grand monde, l'essai éteint puis allumé :

| essai | régions (en GPU) | images par seconde | images de plus de 34 ms | 95 % sous | la plus longue | jeu affiché |
|---|---|---|---|---|---|---|
| éteint (le sol peint) | 4 (0) | 55,4 | 0,4 % | 16,7 ms | 898 ms | 4,8 s |
| le sol | 2 (2) | 32,4 | 4,6 % | 33,4 ms | 3 226 ms | 5,0 s |
| le sol et le décor | 4 (4) | 30,9 | 4,2 % | 33,4 ms | 3 874 ms | 4,5 s |

Le contraire de Chromium sans écran (rendu logiciel, fiche 34) : sur le GPU du téléphone, plusieurs
`TilemapGPULayer` superposés (un quad de toute la région par niveau de tuiles, une lecture de texture de données
par pixel et par niveau) coûtent plus que les morceaux peints, qui ne sont qu'une image par morceau. Et la
première fois, la planche réunie (13 Mo) envoyée au GPU et ses shaders compilés figent l'image 3 à 4 s.
**Décision : écartée.** Le point 1 le prévoyait. Une autre forme (une seule couche par région, les niveaux
fusionnés dans la planche) demanderait une planche de toutes les combinaisons de tuiles : hors de portée.
