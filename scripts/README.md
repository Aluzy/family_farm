# scripts/

Les outils du dépôt : les scripts Node (`*.mjs` : données, carte, site, simulation) et les
générateurs d'images en Python (`scripts/<dossier>/*.py`, Pillow : `pip install -r requirements.txt`).
Chaque générateur dit en tête comment le lancer, toujours depuis la racine du dépôt :

    python3 scripts/<dossier>/<fichier>.py [--apercu]

## Les outils communs des générateurs : `scripts/pixel.py`

Ce que tous les dossiers partagent :

- les chemins : `ROOT` (la racine du dépôt), `ASSETS` (`assets/`), et `T` (une tuile : 16 px) ;
- les couleurs : `rgb('#rrggbb')`, `hls(c)`, `mel(a, b, t)` (a + (b − a)·t, en RGB) et
  `melange(a, b, t)` (a·(1 − t) + b·t : les arrondis diffèrent un peu de `mel`, chacun garde le sien),
  `hasard(*clés)` (un nombre fixe dans [0, 1[), la trame `BAYER` 4 × 4 ;
- les images : `contour(im, couleur, diagonales, seuil)`, `points({(x, y): couleur}, w, h)`,
  `rangee(images, w, h)` (une planche d'une rangée), `cote_a_cote(a, b)`, `apercu(im, nom, zoom, fond)`
  (l'image agrandie, écrite en `apercu_*.png` à la racine), `copie(grille)` ;
- Tiled : `wangid(n, c1, c2)` (le jeu de coins d'une tuile n).

Un générateur l'importe après avoir mis `scripts/` dans le chemin, par la même ligne partout :

```python
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # scripts/pixel.py
from pixel import ASSETS, T, contour  # noqa: E402
```

Quelques modules de `carte/`, venus de l'ancienne ville (`scripts/ville/`, retiré avec elle :
docs/grand-monde.md), passent par `carte/commun.py`, qui reprend ce qu'il faut de `pixel.py` :
`carte/briques.py` (les matières de brique et de pierre de
taille des murs de la ferme, pour `carte/blocs.py`) et `carte/faune.py` (les animaux des biomes à
venir du grand monde). Les icônes ne sont plus dessinées par un script : leurs PNG
(`assets/icones/`, `assets/dessins/`) sont la source, que `icones/build.py` assemble en planches. N'y vont que les aides vraiment identiques d'un dossier à l'autre : les
`planche()`, `tsx()`, `coins()`… de chaque dossier font chacun autre chose et restent chez eux.

Une retouche de `pixel.py` touche toutes les images : relancer les générateurs et vérifier que
leurs sorties (les pixels décodés, pas les octets : les PNG de `assets/` sont en palette) ne
changent pas.

## D'une capture d'écran à un dessin : `scripts/capture/pixelart.py`

Un outil à part des générateurs : il ne dessine rien, il relit un dessin en pixel art depuis sa
capture d'écran (le dessin agrandi, sur un fond) et le rend à sa taille, en PNG à palette :

    python3 scripts/capture/pixelart.py capture.png [sortie.png] [--apercu 8]

Dans l'ordre : le fond est lu sur le bord de l'image et retiré (ce qui lui ressemble et touche
l'extérieur ; `--trous` pour le fond enfermé dans le dessin) ; la taille d'un pixel du dessin est
cherchée dans les changements de couleur, et le dessin tient sur une toile de 16 × 16 ou de
32 × 32 (`--taille`, sinon la plus petite qui convient ; un dessin plus grand y est ramené) ; la
palette est lue puis réduite à 16 couleurs au plus (`--couleurs`), chacune une vraie couleur du
dessin ; les motifs sont relevés (symétrie, motif répété, trames, contour : un motif répété à
95 % est corrigé, sauf `--sans-motifs`) ; le dessin est composé et écrit. Le programme imprime ce
qu'il a lu (`--rapport fichier.json` pour le garder). Les autres options sont en tête du fichier.

`python3 scripts/capture/essais.py` le vérifie sur de fausses captures (agrandissement entier ou
non, damier de transparence, JPEG) ; il n'est pas lancé par l'action GitHub, qui n'a pas Python.
