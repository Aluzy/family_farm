# La vie d'ambiance de la carte (prototype)

But : donner à la carte l'impression d'un monde vivant, avec très peu d'animations et presque
aucun calcul. Tout est dans `js/ambient-life.js`, chargé avant `js/farm-stage.js`. Le fichier est
facultatif : sans lui, la carte s'affiche comme avant, immobile.

## 1. Principe

- **Mouvement procédural** : ombres de nuages, reflets sur l'eau, et un seul champ de vent
  (`windAt(x, y, t)`, deux ondes qui traversent la carte d'ouest en est, modulées par une rafale
  lente) qui pousse les feuilles qui tombent et dévie les papillons.
- **Les arbres ne bougent pas**, ni ceux de la carte ni ceux du Verger : c'est voulu.
- **Bêtes** : de petites machines à états, dessinées en 2 à 4 images. Chacune tire sa vitesse,
  sa phase et son amplitude à la naissance : deux papillons ne volent jamais ensemble.
- **Événements rares** : la date de la prochaine naissance de chaque type est tirée une seule
  fois (`arm()`), puis seulement comparée à l'horloge. Aucun tirage au sort par image.

## 2. Ce qui bouge

| Élément | Comment | Quand |
|---|---|---|
| Ombres de nuages | 3 images agrandies qui dérivent vers l'est | de 6 h 30 à 19 h 30 |
| Reflets sur l'eau | 4 points qui s'allument un instant sur une case d'eau visible | toujours |
| Papillon | traverse la vue en zigzag, poussé par le vent, se pose une fois | le jour, sauf en hiver |
| Oiseau | arrive en vol, se pose, picore et sautille, repart ; s'envole si on appuie à moins de 48 px | le jour |
| Feuille | tombe d'un feuillage, s'efface au sol | sauf en hiver ; trois fois plus souvent en automne |
| Écureuil | descend d'un arbre, court jusqu'à un autre en s'arrêtant une fois, y grimpe | le jour, sauf en hiver |
| Lucioles | 5 points lumineux au-dessus du voile de lumière | à partir de 19 h 45, au printemps et en été |

L'eau et les arbres sont lus dans la carte Tiled, rien n'est écrit en dur : une case est de l'eau
si sa tuile la plus haute est bleue ; un arbre est un groupe de tuiles de 3 à 5 de large et de 4
à 6 de haut dans une couche dont le nom contient `tree` ou `arbre` (sauf `top`). Sur la carte
actuelle : 70 cases d'eau, 37 arbres. Renommer ces couches fait disparaître feuilles et écureuils.

## 3. Budget

- 8 bêtes ou feuilles au plus à la fois (`MAX_ACTORS`), tous types confondus, et un plafond par type.
- Décisions et reflets à 10 Hz (`TICK_MS`). Par image : seulement les bêtes présentes
  et les 3 ombres.
- Rien hors de la vue : une bête naît au bord de la vue et elle est retirée si le joueur fait
  glisser la carte ailleurs.
- « Réduire les animations » (`prefers-reduced-motion`) : tout est retiré.
- Onglet autre que la Ferme : la boucle Phaser dort, donc l'ambiance aussi.
- Mesure (Chromium sans carte graphique, budget plein, 600 images) : 0,1 ms par image en moyenne,
  0,9 ms au pire.

## 4. Branchement

`farm-stage.js` appelle l'ambiance en quatre endroits et ne dépend pas d'elle :

```
create()  this.ambient = AmbientLife.attach(this, { world, map, tiles, objects, lightDepth, reduced })
update()  this.ambient.update(delta)
sync()    this.ambient.setContext({ hour, season, trees })   // jamais le modèle de vue
tap()     this.ambient.scare(wx, wy)
```

L'ambiance ne lit ni l'état du jeu ni le modèle de vue, et ne déclenche aucune action.

## 5. Ajouter un événement

1. Une ligne dans `EVENTS` : `gap` (secondes entre deux naissances), `max`, `when(contexte)`.
2. Une fonction dans `MAKERS` qui renvoie `{ sprites, step(dt) }` ; `step` renvoie `false` quand
   la bête a fini, et la fonction renvoie `null` s'il n'y a pas d'endroit convenable dans la vue.
3. Le dessin dans `ART` (une lettre par pixel) si la bête n'a pas encore d'image.

## 6. Essayer

Depuis la console, sur l'onglet Ferme :

```
const a = FarmStage.scene().ambient
a.spawn('oiseau')      // aussi : papillon, feuille, ecureuil, lucioles
a.stats()              // bêtes présentes, date des prochaines naissances
```

## 7. Limites

- **Les dessins des bêtes sont provisoires**, tracés pixel par pixel dans le code. De vraies
  planches (ou un squelette pour la famille et le bétail, qui ne sont pas encore sur la carte)
  les remplaceront.
- **L'herbe et les fleurs de la carte ne bougent pas** : elles sont cuites dans l'image du fond
  (`bakeGround()`). Les animer demande de sortir leurs couches du fond et de les poser en images.
- En dessous de 20 images par seconde, l'ambiance ralentit au lieu de sauter (`delta` plafonné à
  50 ms).
- Essayé dans Chromium sur ordinateur seulement, pas sur un vrai téléphone. Le redessin des
  textures après une perte de mémoire graphique (`repaint()`) suit la même méthode que
  `repairGround()`, sans avoir été vérifié.
