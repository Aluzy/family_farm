# Fiche 35 — Le sol du grand monde en TilemapGPULayer

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
