# La vie d'ambiance de la carte (prototype)

But : donner à la carte l'impression d'un monde vivant, avec très peu d'animations et presque
aucun calcul. Tout est dans `js/ambient-life.js`, chargé avant `js/farm-stage.js`. Le fichier est
facultatif : sans lui, la carte s'affiche comme avant, immobile.

## 1. Principe

- **Mouvement procédural** : ombres de nuages, et un seul champ de vent
  (`windAt(x, y, t)`, deux ondes qui traversent la carte d'ouest en est, modulées par une rafale
  lente) qui pousse les feuilles qui tombent et dévie les papillons.
- **Les arbres ne bougent pas**, ni ceux de la carte ni ceux du Verger : c'est voulu.
- **L'eau n'est pas animée ici** : c'est la carte qui l'anime, avec ses tuiles Tiled (voir
  `makeTileAnims()` dans `farm-stage.js`). Les cases
  d'eau ne servent qu'à empêcher les bêtes de s'y poser.
- **Bêtes** : de petites machines à états, dessinées en 2 à 4 images. Chacune tire sa vitesse,
  sa phase et son amplitude à la naissance : deux papillons ne volent jamais ensemble.
- **Événements rares** : la date de la prochaine naissance de chaque type est tirée une seule
  fois (`arm()`), puis seulement comparée à l'horloge. Aucun tirage au sort par image.
- **Un habitant** : le chat ne passe pas, il vit sur la carte. Voir la section 3.

## 2. Ce qui bouge

| Élément | Comment | Quand |
|---|---|---|
| Ombres de nuages | 3 images agrandies qui dérivent vers l'est | de 6 h 30 à 19 h 30 |
| Papillon | traverse la vue en zigzag, poussé par le vent, se pose une fois | le jour, sauf en hiver |
| Oiseau | arrive en vol, se pose, picore et sautille, repart ; s'envole si on appuie à moins de 48 px | le jour |
| Feuille | tombe d'un feuillage, s'efface au sol | sauf en hiver ; trois fois plus souvent en automne |
| Écureuil | descend d'un arbre, court jusqu'à un autre en s'arrêtant une fois, y grimpe | le jour, sauf en hiver |
| Lucioles | 5 points lumineux au-dessus du voile de lumière | à partir de 19 h 45, au printemps et en été |
| Chat | marche, s'assoit, fait sa toilette, se couche, fait la sieste, court ; détale si on appuie à moins de 48 px | toute la journée ; à partir de 19 h 45 il dort sur son toit, jusqu'à 6 h 30 |

L'eau et les arbres sont lus dans la carte Tiled, rien n'est écrit en dur : une case est de l'eau
si sa tuile la plus haute est bleue ; un arbre est un groupe de tuiles de 3 à 5 de large et de 4
à 6 de haut dans une couche dont le nom contient `tree` ou `arbre` (sauf `top`). Sur la carte
actuelle : 70 cases d'eau, 39 arbres. Renommer ces couches fait disparaître feuilles et écureuils.

## 3. Le chat

Les autres bêtes naissent au bord de la vue et repartent. Le chat, lui, reste : il a une position
sur la carte, qu'on le regarde ou non, et une vraie planche d'images (`assets/chat.png`).

**Ce qu'il fait** est un graphe, `CAT_NEXT` : pour chaque activité, celles qui peuvent suivre, avec
un poids.

```
debout   → marche 6, assis 2, couche 1, course 1
marche   → debout 3, marche 3, assis 2, course 1
course   → debout 3, marche 1
assis    → debout 4, toilette 3, couche 2
toilette → debout 3, assis 2, couche 1
couche   → debout 3, assis 2, sieste 2
sieste   → couche
```

Pourquoi deux cycles ne se ressemblent jamais :

- la suite est **tirée au poids** à la fin de chaque activité, et ce qu'il faisait juste avant
  pèse trois fois moins (`CAT_AGAIN`) : pas d'aller-retour assis, debout, assis ;
- la **durée** de chaque activité est tirée à son début (`CAT_TIME`, en secondes) ;
- une marche tire sa **destination** (2 à 6 tuiles, 5 à 10 pour une course), sa **vitesse** et
  sa direction ; il ne part que si le trajet est libre (ni eau, ni bâtiment, ni arbre) et il
  reste à moins de 14 tuiles du pied de son toit (`CAT_RANGE`) ;
- l'image de marche suit la **distance parcourue**, pas l'horloge : les pattes ne patinent pas,
  et il démarre et s'arrête progressivement ;
- entre couché et debout, il passe un instant par la pose assise.

Comme pour le reste de l'ambiance, rien n'est tiré au sort par image : tout est décidé au début
de l'activité.

**La nuit.** À 19 h 45 (en même temps que les lucioles) il rentre au trot, se ramasse au pied du
mur, saute sur son toit et dort en boule : deux images qui alternent pour le souffle, et de temps
en temps il lève la tête. À 6 h 30 il lève la tête, s'assoit, saute à terre. Si le jeu s'ouvre
de nuit ou à 6 h, il est déjà sur son toit.

**Son toit** se règle dans Tiled : un objet nommé `chat_toit` (un point suffit), dans n'importe
quelle couche d'objets, posé là où il doit dormir. S'il est dans le rectangle d'un bâtiment, le
chat saute du pied de ce bâtiment et passe devant son image. Sans cet objet, il dort sur
l'appentis de la maison. Penser à `node scripts/build-map.mjs` après avoir modifié la carte.

**La planche** `assets/chat.png` : une rangée de cases de 16×16, chat de profil tourné vers la
droite, pattes sur la dernière rangée de pixels de la case (l'image est ancrée en bas, au
milieu). Le profil gauche est la même image retournée : inutile de le dessiner.

| Case | Nom (`CAT_FRAMES`) | Sert à |
|---|---|---|
| 0 | `idle` | debout ; pas intermédiaire de la marche |
| 1, 2 | `marche0`, `marche1` | marche (`marche0`, `idle`, `marche1`, `idle`), course et saut |
| 3 | `assis` | assis ; pose de passage entre couché et debout ; avant le saut |
| 4 | `leche` | toilette (alterne avec `assis`) |
| 5 | `couche` | couché, tête levée ; demi-réveil sur le toit |
| 6, 7 | `boule0`, `boule1` | en boule, souffle (sieste et nuit) |

Huit images suffisent : la course et le saut réutilisent celles de la marche (plus vite, avec un
petit bond, ou inclinées). Pour ajouter une activité : une ligne dans `CAT_NEXT`, sa durée dans
`CAT_TIME`, sa case à la fin de la planche et de `CAT_FRAMES`, son image dans `step()`.

**Dessiner une nouvelle pose.** Toutes les cases doivent être à la même échelle : le corps du
chat fait 12 pixels de long et 5 de haut dans chacune. Réduire chaque image séparément « pour
qu'elle remplisse la case » donne un chat qui grossit et rétrécit d'une image à l'autre.

## 4. Budget

- 8 bêtes ou feuilles au plus à la fois (`MAX_ACTORS`), tous types confondus, et un plafond par type.
- Décisions à 10 Hz (`TICK_MS`). Par image : seulement les bêtes présentes, le chat
  et les 3 ombres.
- Rien hors de la vue : une bête naît au bord de la vue et elle est retirée si le joueur fait
  glisser la carte ailleurs. Seule exception, le chat : une image en plus des 8, jamais retirée
  (une addition et un changement d'image par image affichée, 0,004 ms mesuré).
- « Réduire les animations » (`prefers-reduced-motion`) : tout est retiré.
- Onglet autre que la Ferme : la boucle Phaser dort, donc l'ambiance aussi.
- Mesure (Chromium sans carte graphique, budget plein, 600 images) : 0,1 ms par image en moyenne,
  0,9 ms au pire.

## 5. Branchement

`farm-stage.js` appelle l'ambiance en quatre endroits et ne dépend pas d'elle :

```
preload() this.load.spritesheet('chat', 'chat.png', { frameWidth: 16, frameHeight: 16 })
create()  this.ambient = AmbientLife.attach(this, { world, map, tiles, objects, lightDepth, reduced, cat })
update()  this.ambient.update(delta)
sync()    this.ambient.setContext({ hour, season, trees })   // jamais le modèle de vue
tap()     this.ambient.scare(wx, wy)
```

`cat` est le nom de la planche du chat si elle a été chargée. Sans `assets/chat.png`, il n'y a
pas de chat et rien d'autre ne change.

L'ambiance ne lit ni l'état du jeu ni le modèle de vue, et ne déclenche aucune action.

## 6. Ajouter un événement

1. Une ligne dans `EVENTS` : `gap` (secondes entre deux naissances), `max`, `when(contexte)`.
2. Une fonction dans `MAKERS` qui renvoie `{ sprites, step(dt) }` ; `step` renvoie `false` quand
   la bête a fini, et la fonction renvoie `null` s'il n'y a pas d'endroit convenable dans la vue.
3. Le dessin dans `ART` (une lettre par pixel) si la bête n'a pas encore d'image.

## 7. Essayer

Depuis la console, sur l'onglet Ferme :

```
const a = FarmStage.scene().ambient
a.spawn('oiseau')      // aussi : papillon, feuille, ecureuil, lucioles
a.stats()              // bêtes présentes, date des prochaines naissances, ce que fait le chat
a.chat('toilette')     // lance une activité du chat : debout, marche, course, assis, toilette, couche, sieste
a.chat('nuit')         // l'envoie se coucher sur son toit (en plein jour, il se réveille aussitôt)
```

## 8. Limites

- **Les dessins des bêtes de passage sont provisoires**, tracés pixel par pixel dans le code. De
  vraies planches (ou un squelette pour la famille et le bétail, qui ne sont pas encore sur la
  carte) les remplaceront. Le chat a déjà la sienne.
- **Cinq poses du chat sont provisoires** : `assis`, `leche`, `couche`, `boule0` et `boule1` ont
  été dessinées à la main en attendant, dans la palette des trois autres. `idle`, `marche0` et
  `marche1` viennent des dessins d'origine, ramenés ensemble à 16×16.
- **Le chat ne sait pas contourner** : il ne part que si la ligne droite est libre. Pour rentrer
  le soir il essaie tout droit, puis en deux temps ; faute de mieux il va tout droit et passe
  derrière ce qui le gêne. Il évite l'eau, les rectangles nommés et les couches d'arbres, pas
  les rochers ni les barrières.
- **Le chat n'a qu'un profil** : il se déplace surtout de côté, et un trajet presque vertical
  se fait de profil.
- **L'herbe et les fleurs de la carte ne bougent pas** : elles sont cuites dans l'image du fond
  (`bakeGround()`). Les animer demande de sortir leurs couches du fond et de les poser en images.
- En dessous de 20 images par seconde, l'ambiance ralentit au lieu de sauter (`delta` plafonné à
  50 ms).
- Essayé dans Chromium sur ordinateur seulement, pas sur un vrai téléphone. Le redessin des
  textures après une perte de mémoire graphique (`repaint()`) suit la même méthode que
  `repairGround()`, sans avoir été vérifié.
