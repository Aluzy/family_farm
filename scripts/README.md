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
`carte/grotte.py` (les tuiles et les objets des niveaux de la mine : `assets/grotte_tuiles.png`,
`grotte_objets.png`, `grotte.json`, lus par `js/grotte.js`), `carte/briques.py` (les matières de brique et de pierre de
taille des murs de la ferme, pour `carte/blocs.py`) et `carte/faune.py` (les animaux des biomes à
venir du grand monde). Les icônes ne sont plus dessinées par un script : leurs PNG
(`assets/icones/`, `assets/dessins/`) sont la source, que `icones/build.py` assemble en planches. N'y vont que les aides vraiment identiques d'un dossier à l'autre : les
`planche()`, `tsx()`, `coins()`… de chaque dossier font chacun autre chose et restent chez eux.

Une retouche de `pixel.py` touche toutes les images : relancer les générateurs et vérifier que
leurs sorties (les pixels décodés, pas les octets : les PNG de `assets/` sont en palette) ne
changent pas.
