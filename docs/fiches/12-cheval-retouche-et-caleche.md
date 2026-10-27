# Fiche 12 — Le cheval retouché, généralisé, et la calèche avec un vrai cocher

## Objectif

Le joueur a retouché à la main certaines cases du cheval : `docs/fiches/12-cheval-retouche.png`,
même format que `assets/cheval.png`, soit 14 cases de 48 × 40. Il faut :

1. **Repérer ce qui a changé** et en tirer des règles de dessin (des « patterns »). Les
   différences avec `assets/cheval.png` sont dans les cases de profil, de 0 à 5. Pour chaque
   partie retouchée — crinière, tête, oreilles, queue, pattes, ombres, contour… — décrire la
   règle : quelle couleur où, quelle forme, quel contour.
2. **Garder telles quelles les cases retouchées** et appliquer ces règles aux dessins que le
   joueur n'a pas touchés :
   - les cases de face et de dos de `cheval.png` (6 à 13), et les cases de profil qu'il n'a pas
     retouchées s'il y en a ;
   - `assets/cheval_monte.png` (le cheval sellé sous le cavalier, dans les trois vues) ;
   - l'icône du cheval (`scripts/icones/art_cheval.py`) ;
   - tout autre dessin du même cheval.
3. **Refaire la calèche** (`scripts/carte/caleche.py` → ses images) :
   - l'attelage avec le nouveau cheval, dans toutes ses vues et tous les temps du pas, de jour
     et de nuit ;
   - à la place du cocher dessiné à part (`cocher()` dans `caleche.py`), un vrai personnage du
     jeu, pris dans les planches de `assets/personnages/` (`cases.json`) : assis de profil sur le
     banc, les rênes en main, et ses vues de face et de dos pour les autres directions. Il est
     dessiné comme le cavalier de `cheval_monte.png`, qui utilise les cases `assis_<vue>`.

## Contexte

- `scripts/personnage/cheval.py` dessine aujourd'hui tout le cheval par programme (`profil`,
  `face`, `dos`, `monte`, `planche_seul`, `planche_monte`) ; `scripts/pixel.py` contient les
  outils communs.
- Le générateur ne doit pas écraser les retouches du joueur. Deux façons de faire, au choix
  motivé :
  - il lit les cases retouchées depuis un fichier source gardé dans le dépôt (par exemple
    `scripts/personnage/cheval_retouche.png`) et dessine le reste avec les nouvelles règles ;
  - ou il est réécrit pour produire exactement ces pixels.

  Dans les deux cas, une nouvelle exécution du script redonne les mêmes images.
- `scripts/carte/caleche.py`, `js/carte/ferme/caleche.js` (comment la scène découpe et anime la
  calèche), `js/carte/cheval.js`, `js/carte/ferme/config.js`.
- Le personnage assis : les cases `assis_*` de `assets/personnages/` et leur emploi dans
  `planche_monte`. Le cocher doit avoir une apparence fixe, prise parmi les personnages
  existants : un habit et un chapeau qui le distinguent de la famille du joueur.

## À faire

1. Faire la comparaison case par case, au pixel près (avant/après), et écrire les règles
   trouvées dans le commentaire en tête de `cheval.py`.
2. Mettre la planche retouchée dans `assets/cheval.png`, puis régénérer avec ces règles les
   cases et les images qu'il n'a pas touchées.
3. Régénérer `cheval_monte.png`, l'icône, `poteau_attache.png` et `meuble_ratelier.png`
   (ceux-ci inchangés si rien ne les touche), puis la calèche avec le nouveau cheval et le vrai
   cocher.
4. Si une image change de taille ou de cases, mettre à jour la scène et sa configuration. Sinon,
   ne pas toucher au JS.
5. Ne pas toucher aux autres images. Si le build en régénère sans rapport avec le cheval,
   restaurer `assets/art.png` et les autres fichiers concernés.

## Hors périmètre

- Un autre cheval, d'autres robes, une nouvelle animation.

## Critères d'acceptation

- Les cases retouchées par le joueur sont identiques, au pixel près, dans `assets/cheval.png`.
- Les autres cases et le cheval monté suivent les mêmes règles : mis côte à côte, ils ne se
  distinguent pas des cases retouchées.
- La calèche tire le nouveau cheval, avec un vrai personnage de profil sur le banc, qui tient
  les rênes.
- Dans Chromium : le cheval à l'Écurie, le cheval monté, la calèche sur un chemin (de profil, de
  face, de dos), de jour et de nuit, sans erreur de console.
- `npm test` vert, test de fumée sans erreur, `docs/fiches/README.md` : 12 fait.

## Vérifications

- `npm run build && npm test`, `node tests/smoke.mjs`.
- Planches agrandies ×4 à regarder et à donner : le cheval avant/après, le cheval monté
  avant/après, la calèche avant/après.
- Captures Chromium : l'Écurie, la promenade à cheval, la calèche dans les trois vues.
- Donner 6 à 8 chemins absolus.

## Livraison

Un commit sur la branche de travail (conventions de `docs/fiches/README.md`), pas de push.

Rendre compte :
- les règles trouvées dans les retouches ;
- ce qui a été changé dans chaque image ;
- le choix pour garder les retouches (fichier source ou script) ;
- le cocher : quel personnage, quelles cases ;
- les vérifications et leurs résultats exacts ;
- les captures ;
- ce qui reste.
