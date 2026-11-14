# Fiche I2b — La charrette du village

## Objectif

Donner au village un véhicule à lui, que mène le villageois de la tournée du port : **la charrette du
village**. Elle emporte au port les marchandises marquées « à vendre » dans le coffre du village, les vend
au comptoir et revient. Elle a deux branches d'évolution, payées en pièces : **la capacité** (ce qu'elle
porte par voyage) et **la vitesse** (combien de voyages tiennent dans la journée). La vitesse change ce
qu'on voit : le villageois la tire à bras, puis un cheval de trait la tire, enfin un **wagonnet** roule
sur des **rails** que le joueur pose le long du chemin du port, tiré par le cheval sur le chemin de
halage. C'est une dépense longue pour l'argent qui s'empile (le constat d'I0b, I1c, I4).

La demande de l'utilisateur : « La charrette doit avoir une capacité et permettre de faire transiter des
marchandises plus rapidement entre le coffre du village et le port. Cette capacité peut être augmentée en
échange d'argent. La vitesse de la charrette peut également être augmentée contre de l'argent. […] La
charrette pourrait être tirée par un cheval quand la vitesse aura suffisamment augmenté pour que le dessin
du villageois qui la tire devienne incohérent. On peut imaginer des rails qu'on pourrait poser entre le
village et le port pour mettre un wagonnet qui serait l'évolution de la charrette à cheval. »

## Contexte

- **I2, le portage** (`js/engine/portage.js`, `VILLAGE.PORTAGE`) : chaque objet a un volume (un ; bois et
  planche 2, pierre, minerais, lingots 3) ; le joueur porte `MAINS` 12, la brouette `BROUETTE` 40, la
  charrette attelée à son cheval `CHARRETTE` 160. Sur un chemin, on va `VILLAGE.CHEMIN.VITESSE` % plus vite
  (100). Le tronçon du chemin du port est fait de blocs du joueur (`state.dehors`, `js/engine/dehors.js`) ;
  il les retire, les déplace, en pose ailleurs. Les dessins : `scripts/carte/portage.py` (la brouette, la
  charrette attelée, 3 vues, d'après `scripts/carte/caleche.py`).
- **La tournée du port** (`TACHES.LISTE.navette`, I3c) : `ACTIONS` 2 allers-retours par jour, `PORTEE` 10
  **objets** (pas des volumes) chacun ; aucun temps de trajet n'est compté (le villageois loin de la vue
  saute à son poste : `js/carte/ferme/villageois.js`, `LOIN`). I8b l'a élargie (`porteeNavette`,
  `PRODUCTION.NAVETTE`) : 25 objets avec une brouette à la ferme, 60 avec la charrette **et le cheval du
  joueur**, le quai de chargement × 2 ; elle livre d'abord les contrats d'export. Aujourd'hui : de 20 à
  240 objets par jour selon ce que le joueur possède.
- **I9c, en ligne** : la brouette et la charrette du joueur sont des objets du coffre commun ; la
  charrette est attelée par un seul joueur à la fois ; la charrette des autres ne se voit pas.
- **Le cheval** (`js/engine/cheval.js`, `CHEVAL` de `data/animals.json`) : un seul, `state.cheval`, venu
  par le licol de l'Atelier, l'Écurie (`CHEVAL.PLACES` 2), `VITESSE` 1,4 au pas, le galop de la pomme
  (`vitesse` 2) ; il mange `RATION` 2 pailles par nuit.
- **Les prix** (I1c, I4) : les niveaux du port 1 800 / 5 000 / 11 000 / 24 000 pièces ; les prix de l'île
  (le lingot de fer 20, la planche 6, la pierre 3, les récoltes 2 à 4, le pain 11, la laine 12).
- **Les rôles en ligne** (`js/engine/roles.js`, I9e à faire), le village dans l'horloge commune (I9d :
  tout se déduit de l'heure, « le serveur seul fait compter »).
- `docs/ile.md`, sections I2, I3c, I8b, I9c.

## Ce qu'est la charrette du village (la proposition)

1. **Un véhicule du village, pas du joueur.** `state.charrette` (une seule) : ses paliers de capacité et
   de vitesse, son cheval, son wagonnet. Elle naît au premier villageois mis à la tournée du port, au
   palier 1 des deux branches (offert) : une charrette à bras de 20 volumes. Elle se range sur la ferme
   (devant le coffre, ou au quai de chargement s'il est posé) quand elle ne roule pas.
2. **La tournée du port devient la tournée de la charrette.** Les villageois de la tournée en sont les
   **charretiers** (D17) : un seul suffit, plusieurs **se relaient**. La charrette est une : un seul
   charretier la mène à la fois, voyage par voyage ; au retour d'un voyage, elle passe au suivant de la
   tournée qui est disponible (pas à son jour de repos, pas trop fatigué, son repas pris). Le relais sert à
   ce que la charrette ne s'arrête pas : un jour de repos, une fatigue ou un repas d'un charretier ne la
   laissent plus au coffre ; il ne fait pas aller plus vite (c'est la vitesse qui le fait). Sa journée de tournée va de 7 h à 17 h
   (`CHARRETTE.JOUR`, 10 h : il part au lever, il mange au port, son repas compte comme les autres) ; il
   enchaîne des **voyages entiers** : charger au coffre (`CHARGE` 0,25 h ; 0,1 h au quai), l'aller,
   décharger et vendre au comptoir (`VENTE` 0,25 h), le retour. Un voyage ne part que s'il revient avant
   17 h : le nombre de voyages par jour est entier. Chaque voyage emporte jusqu'à la **capacité** en
   volumes (les volumes d'I2, plus des objets), d'abord pour les contrats acceptés (I8b), puis ce qui est
   marqué « à vendre », le plus cher au volume d'abord. La vente se fait à l'heure d'arrivée (le port
   ouvert, `PORT.HEURES`), par `vendreAuPort`, comme aujourd'hui.
3. **Ce qu'elle remplace** : `TACHES.LISTE.navette.ACTIONS` et `PORTEE`, `PRODUCTION.NAVETTE.BROUETTE` et
   `CHARRETTE` (la tournée n'emprunte plus les véhicules du joueur) ; `PRODUCTION.NAVETTE.QUAI` change de
   sens : le quai de chargement devient le **point de départ** de la charrette (posé près de la sortie de
   la ferme, il épargne jusqu'à la demi-ferme, 72 cases d'après I2), on y charge en 0,1 h, et c'est la
   **gare** où commence la voie du wagonnet. Le palier 1 × 1 vaut la tournée d'aujourd'hui sans rien
   (20 par jour).
4. **La charrette du joueur (I2) est gardée, à part.** Elle sert au joueur : porter lui-même, au port, ce
   que la tournée ne fait pas (les lingots et les matériaux du chantier du port, une commande du bac à
   honorer tout de suite), monté sur son propre cheval. Les fusionner ferait s'arrêter la tournée chaque
   fois que le joueur part avec, et en ligne (I9c) la charrette du joueur est tenue par un joueur à la
   fois, alors que celle du village roule pour tous. Les remplacer retirerait au joueur seul son moyen de
   porter 160 volumes avant d'avoir un villageois.

## Les deux branches et leurs prix

### La capacité (volumes par voyage)

| Palier | Capacité | Prix | Ce qu'on voit |
|---|---|---|---|
| C1 | 20 | offert | la caisse nue, ridelles basses |
| C2 | 40 | 300 | des ridelles plus hautes |
| C3 | 80 | 1 000 | les rehausses à claire-voie |
| C4 | 160 | 2 500 | les rehausses et une bâche |
| C5 | 320 | 6 000 | une longue charrette à quatre roues ; sur la voie (V5), un second wagonnet en rame |

### La vitesse (en fois la marche d'un villageois sur le chemin)

La **marche** (× 1) est celle d'un personnage à pied sur le chemin : 58 px/s, doublés sur le chemin
(`CHEMIN.VITESSE`), soit **217 cases par heure de jeu**. (Le villageois qui flâne sur la ferme va à 26 px/s,
49 cases par heure : à ce pas, un aller au port prendrait près de 9 heures. Le charretier marche d'un pas
de route, celui du joueur.) Hors du chemin (un chemin coupé), la charrette va deux fois moins vite.

| Palier | Vitesse | Prix | Ce qu'on voit, ce qu'il faut |
|---|---|---|---|
| V1 | × 0,75 | offert | le villageois la tire à bras, chargée, à petit pas |
| V2 | × 1 | 400 | roues cerclées de fer, moyeux graissés : il marche d'un bon pas |
| V3 | × 1,4 | 1 500 | **le cheval de trait** (au pas, `CHEVAL.VITESSE`) : la limonière, le siège du charretier ; le cheval compris, il faut une place à l'Écurie |
| V4 | × 2 | 3 000 | le cheval ferré, le harnais à collier : au trot (la vitesse du galop de la pomme) |
| V5 | × 3 | 5 000 | **le wagonnet** sur la voie complète, tiré au halage ; les rails posés par le joueur, à part |

Au-delà de × 1, le dessin du villageois qui tire devient incohérent (il courrait avec une charrette
chargée) : c'est là que vient le cheval. Les deux branches coûtent 9 800 et 9 900 pièces (19 700 en
tout, plus la voie).

### D'où viennent ces ordres de grandeur

- **La dépense qui manque** : le joueur simulé appliqué gagne 10 800 à 13 300 pièces sur 80 nuits (I8b,
  graines 1 à 3), soit 135 à 165 par jour ; il garde 2 700 à 3 500 pièces à la nuit 80 et n'a plus rien à
  acheter après la nuit 60 (I4, I6c). Les niveaux du port (1 800 à 24 000, I1c) sont la seule dépense longue.
- **L'échelle** : C2 + V2 (700) se paie vers le niveau 2 du port (nuit 30 de la simulation) ; C3 + V3
  (2 500) vaut la moitié du niveau 3 ; C4 + V4 (5 500) le niveau 3 ; C5 + V5 (11 000) le niveau 4. Les
  deux branches entières valent à peu près le niveau 5 : une seconde dépense longue, à côté du port.
- **Le cheval** : 600 pièces (`CHEVAL.PRIX`, son prix d'avant au Marché) dans les 1 500 du palier V3.
- **Le retour sur dépense** (plus bas) : les premiers paliers se remboursent en quelques jours, les
  derniers en quelques semaines, et seulement si le village produit assez (la ferme productive).

## Les temps de trajet, avant et après

Les longueurs (I2, mesurées sur les graines 1 à 8) : l'aller du milieu de la ferme au comptoir fait **350
à 517 cases** (430 en moyenne), dont 72 de demi-ferme ; le tronçon seul, 280 à 445. 30 s font une heure de
jeu. Le calcul : `2 × aller / (217 × vitesse) + chargement + vente`, la journée de 10 h.

| Vitesse | Aller de 430 cases | Un voyage | Voyages par jour (300 / 430 / 520 cases) |
|---|---|---|---|
| × 0,75 (à bras) | 2,6 h (79 s) | 5,8 h | 2 / **1** / 1 |
| × 1 (roues cerclées) | 2,0 h (59 s) | 4,5 h | 3 / **2** / 1 |
| × 1,4 (le cheval) | 1,4 h (42 s) | 3,3 h | 4 / **3** / 2 |
| × 2 (au trot) | 1,0 h (30 s) | 2,5 h | 5 / **4** / 3 |
| × 3 (le wagonnet) | 0,7 h (20 s) | 1,8 h | 7 / **5** / 4 |

Le débit (volumes par jour, aller de 430 cases) : capacité × voyages.

| | × 0,75 | × 1 | × 1,4 | × 2 | × 3 |
|---|---|---|---|---|---|
| 20 | 20 | 40 | 60 | 80 | 100 |
| 40 | 40 | 80 | 120 | 160 | 200 |
| 80 | 80 | 160 | 240 | 320 | 400 |
| 160 | 160 | 320 | 480 | 640 | 800 |
| 320 | 320 | 640 | 960 | 1 280 | 1 600 |

**Avant** : la tournée porte 20 objets par jour (40 avec deux villageois), 50 avec une brouette, 120 avec
la charrette et le cheval du joueur, 240 avec le quai, sans compter le chemin. **Après** : le palier 1 × 1
fait 20 volumes, comme aujourd'hui ; une tournée de 240 volumes (C3 × V3) vaut l'équipement complet
d'aujourd'hui (charrette, cheval, quai). La longueur du chemin compte enfin : le raccourcir (le joueur le
modifie, I2) ou poser le quai près de la sortie fait gagner un voyage.

**Le gain pour le village** (estimé, à mesurer par la simulation une fois branché) : ce qui est vendu
par jour, c'est le plus petit du débit et de ce que le village a « à vendre ». Un villageois des champs
produit ≈ 43 objets et 87 pièces par jour (I3c, I4 : 2 à 4 pièces le volume) ; un village de six en a peut-
être 60 à 120 volumes à vendre (≈ 4 pièces le volume) ; une ferme productive, du pain à 11 et du lait à 8.

| Le village | Aujourd'hui (20 par jour) | C2 × V2 (700 pièces) | C3 × V3 (+ 2 500) | C4 × V4 (+ 5 500) |
|---|---|---|---|---|
| petit (40 volumes à 3) | 60 par jour | 120 (+ 60 : remboursé en 12 jours) | 120 | 120 |
| de six (100 volumes à 4) | 80 | 320 (+ 240 : 3 jours) | 400 (+ 80 : 31 jours) | 400 |
| productif (300 volumes à 10, une hypothèse haute) | 200 | 800 | 2 400 (+ 1 600 : 2 jours) | 3 000 (+ 600 : 9 jours) |

La conclusion : C2 × V2 sert tout village ; C3 × V3 suffit à un village de six ; les paliers 4 et 5 et la
voie sont la dépense de la ferme productive et du joueur qui aime voir passer son wagonnet. À vérifier
par `node scripts/simulate.mjs --vocations` (la ligne « production » de I8b) : si la ferme productive simulée
ne vend pas 300 volumes par jour, baisser les prix des paliers 4 et 5 plutôt que de les laisser inutiles.

## Les étapes visuelles

1. **À bras (V1, V2)** : le villageois de la tournée entre les deux brancards, les mains dessus, la
   charrette derrière lui (de profil : la case `marche_cote` de sa planche, le bras arrière tendu sur le
   brancard ; de face et de dos : `idle_bas`, `idle_haut`, les mains le long du corps sur les brancards ;
   au pas, les quatre cases de la marche). Une charrette à deux roues hautes (16 px), un plateau de 30 × 16
   à ridelles basses, la ridelle de devant peinte du bleu-vert du village, marquée du croissant de lune.
2. **Le cheval (V3, V4)** : la même caisse, la limonière (deux brancards longs jusqu'au collier), le siège
   du charretier en travers devant, le cheval de trait harnaché (le cheval du jeu,
   `scripts/personnage/cheval.py` `harnache_redessine`, comme l'attelage de la calèche et la charrette du
   joueur) ; le charretier assis (ses cases `assis_<vue>`), les rênes en main. Au trot (V4), les quatre
   temps du pas, joués deux fois plus vite.
   **Le cheval du village** est à acheter avec le palier V3 : il arrive par le bac au passage suivant
   (comme une bête de l'import, I1c) et loge à l'Écurie, dont il prend une place (`PLACES` 2 : l'autre
   reste à celui du joueur). Sans Écurie ou sans place, le palier est refusé et la fenêtre le dit. Il mange
   sa ration chaque nuit (2 pailles, du coffre) : le tableau (I3d) la compte dans le coût du charretier
   (« 🐴 La ration du cheval »). Ce n'est pas le cheval du joueur : celui-ci reste à lui, monté.
3. **Les rails et le wagonnet (V5)** :
   - **Les rails** sont un bloc (`rails`, l'Atelier : 1 lingot de fer, 2 planches et 1 pierre donnent
     8 cases ; ≈ 4,4 pièces de matières la case au prix de l'île), posé au mode Construire sur la ferme et
     dehors (`VILLAGE.DEHORS`), une case à la fois ou en traînant. Son image se choisit d'après les
     voisins, comme le pont de planches : droit (nord-sud, est-ouest), courbe (quatre coins, d'un quart de
     cercle), et, posé sur une case de chemin, **le passage planchéié** (les rails à fleur entre des
     madriers ; la case reste un chemin, on y passe à pied, à cheval, en charrette). Refusés comme les
     autres blocs du dehors : l'eau profonde, la falaise, la rivière (un pont de planches d'abord : les
     rails s'y posent), l'emprise du port. Ils ne gênent pas la marche.
   - **La voie** est complète quand une suite de rails voisins va de la gare (le quai de chargement, ou à
     défaut une case de rails au bord de la ferme) au bord de l'emprise du port. Elle se cherche une fois
     par changement de rails (comme les chemins du sol). La longueur du tronçon (280 à 445 cases) fait 35 à
     56 recettes : 35 à 56 lingots, 70 à 112 planches, 35 à 56 pierres (≈ 1 200 à 2 000 pièces de matières). Proposé en plus :
     le forgeron (I5a) vend les rails au mètre, 6 pièces la case, pour qui n'a pas la mine.
   - **Le wagonnet** (acheté au palier V5) ne roule que sur la voie complète ; tant qu'elle ne l'est pas,
     la charrette garde le palier V4 et la fenêtre dit ce qui manque (« il manque 37 cases de rails, ici »).
     Une caisse de bois cerclée de fer sur quatre petites roues de fer à boudin, la ridelle peinte et le
     croissant du village.
   - **La traction : le cheval au halage.** Pas de locomotive (hors du ton) : le cheval du village marche
     sur le chemin de terre qui longe la voie (le chemin du port lui-même sert de chemin de halage) et
     tire le wagonnet par un trait de corde accroché au palonnier ; le charretier est assis sur le bord
     avant de la caisse, les rênes longues. Sur rails, le cheval tire sans peine une caisse lourde au
     trot : d'où × 3. C'est un chemin de fer à chevaux, comme les premiers. Écarté : le wagonnet à bras
     sur une pente (l'île n'a pas de pente continue de la ferme au port, et le retour à vide se ferait à
     la main) ; le cheval entre les rails (il faudrait combler les traverses).
4. **La capacité se voit aussi** (proposé, au moins C3 et C4) : les rehausses à claire-voie, puis la bâche.

Les maquettes (aperçus agrandis, la composition sur une capture du chemin du port dans Chromium) ont été
faites avec cette fiche, hors du dépôt : la charrette à bras (3 vues, vide et chargée : 408 à 510 couleurs
chacune), au cheval (298 à 458), les rails (8 images de 16 × 16 : 110 à 174 couleurs, 553 pour les six sans
terre ; 4 traverses par case, une tous les 4 px), le wagonnet et son cheval (216 à 422 ; la caisse seule,
309 vide et 448 chargée). Les dessins définitifs les reprennent (`scripts/carte/charrette_village.py`).

## À faire

1. **Les réglages** (`data/village.json`, section `CHARRETTE` et son commentaire `//CHARRETTE`) :
   `CAPACITES` [20, 40, 80, 160, 320] et `PRIX_CAPACITE` [0, 300, 1000, 2500, 6000] ; `VITESSES` [0.75, 1,
   1.4, 2, 3] et `PRIX_VITESSE` [0, 400, 1500, 3000, 5000] ; `JOUR` [7, 17] ; `CHARGE` 0,25, `QUAI` 0,1,
   `VENTE` 0,25 ; `HORS_CHEMIN` 50 (%) ; `CHEVAL` (le palier qui le demande, sa ration). **Les deux branches sont
   libres** (décision du joueur) : un palier de capacité ne demande aucun palier de vitesse, et l'inverse ;
   seul le wagonnet (V5) demande la voie complète. Une grande capacité tirée à bras reste lente, c'est
   tout ; `RAILS` (la recette, la case de la gare).
   `TACHES.LISTE.navette.ACTIONS` et `PORTEE`, `PRODUCTION.NAVETTE` : retirés le réglage allumé (gardés pour
   le jeu éteint) ; le quai lu comme ci-dessus.
2. **Le moteur** (`js/engine/charrette.js`) : `charretteDu(state)`, `acheterPalier(state, branche)` (les
   prix, l'ordre, les conditions : l'Écurie et sa place, la voie ; « Charrette du village : … » dans les
   Comptes) ; `trajetCharrette(state)` (le parcours du coffre ou du quai au comptoir par les chemins
   possédés, sinon à travers champs à `HORS_CHEMIN` %, sa longueur, gardé tant que `state.dehors` ne change
   pas) ; `voieComplete(state)` ; `voyagesDuJour(state)` (les heures de départ, d'arrivée, de vente, de
   retour : **tout se déduit de l'heure**, comme la journée des villageois d'I9d) ; `ouEstLaCharrette(state,
   heure)` (la case et le sens, pour la scène). Dans `taches.js`, la tournée : une action par voyage, à
   l'heure de la vente (`avancerTaches`), la nuit fait ce qui reste ; les contrats d'abord ; ce qu'elle
   porte en volumes.
3. **Le cheval du village** : `state.charrette.cheval` (attendu au bac, arrivé), sa place à l'Écurie
   (`etatEcurie`), sa ration la nuit (après celle du cheval du joueur), le tableau.
4. **Les rails** : l'objet et la recette (`data/items.json`, `data/recipes.json` : le bloc `rails`,
   `dehors`, `tourne` d'après les voisins) ; sur la ferme, des blocs ; dehors, `state.dehors.rails` (des
   segments, comme les chemins : `encoderSegments`) ; `poseDehorsStatus` les accepte ; le sol les peint
   (les régions touchées refaites, comme `majCheminsSol`) ; la carte du monde dessine la voie.
5. **L'interface** : la fenêtre du port gagne l'onglet « La charrette du village » 🛞 (sa capacité, sa
   vitesse, les deux branches et le prochain palier de chacune, ce qu'il faut, « Améliorer » ; ses voyages
   d'aujourd'hui, ce qu'elle a vendu, où elle est ; la voie : complète ou ce qui manque, « Montre-moi ») ;
   la fiche du charretier dit sa charrette ; la boussole peut mener à la charrette.
6. **La scène** (`js/carte/ferme/charrette-village.js`) : la charrette sur le chemin, à sa place de
   l'heure (`ouEstLaCharrette`), le charretier dedans ou devant ; à quai sous la halle pendant la vente ;
   rangée sur la ferme la nuit. Loin de la vue, rien n'est dessiné.
7. **Les dessins** (`scripts/carte/charrette_village.py`, vus de haut à 45°, d'après les maquettes et
   `portage.py`) : la charrette à bras (3 vues, 4 temps de roue, vide et chargée ; deux couches : derrière
   et devant le villageois), au cheval (3 vues, 5 temps), le wagonnet (4 vues : la voie a deux sens, vide et
   chargé ; le palonnier et le trait), les 8 images des rails (droit ×2, courbe ×4, passage planchéié ×2),
   les rehausses (C3, C4). Compter les couleurs ; l'aperçu agrandi ; la capture dans le jeu, de jour.
8. **Le joueur automatique** (`bot.js`) : il achète un palier quand sa caisse vaut deux fois le prix et que
   le village a plus « à vendre » que la charrette n'en porte ; il pose la voie à la fin de son plan s'il a
   les lingots. Dans `node scripts/simulate.mjs --village` et `--vocations` : le débit de la tournée, les
   pièces dépensées en paliers, les pièces en caisse à la nuit 80, avant et après.
9. **La sauvegarde** : format 109 ; `state.charrette` (`capacite`, `vitesse`, `cheval`, `wagonnet`) et
   `state.dehors.rails` ; la migration 108 → 109 : une partie dont un villageois fait la tournée reçoit la
   charrette au palier de ce qu'elle portait (rien : C1 V1 ; une brouette : C2 V2 ; la charrette et le
   cheval du joueur : C3 V3, son cheval à elle offert si l'Écurie a la place, sinon V2), pour que la tournée
   ne porte jamais moins qu'avant ; une partie sans tournée ne reçoit rien.
10. **Les tests** (`tests/engine/village-charrette.test.mjs`) : les paliers (prix, ordre, refus sans
    pièces, sans Écurie, sans voie ; la capacité 160 sans cheval refusée) ; les voyages du jour pour trois
    longueurs de chemin (le tableau ci-dessus) ; le chemin coupé (plus lent) ; les volumes ; les contrats
    d'abord ; la vente à l'heure d'arrivée, le port fermé ; le cheval arrivé au bac, sa ration, le tableau ;
    les rails (les images d'après les voisins, les refus, la voie complète ou non, le wagonnet) ; la
    sauvegarde et la migration ; le joueur automatique ; éteint, rien. `village-taches`,
    `village-production` adaptés (la tournée en volumes).

## En ligne (I9c, I9e)

- **La charrette du village est un objet du monde** : `state.charrette` est dans la partie du monde, ses
  voyages se déduisent de l'horloge commune (I9a2, I9d) : chaque joueur la voit au même endroit sur le
  chemin, sans aucun message de plus ; la vente d'un voyage est une action du pas du monde (« le serveur
  seul fait compter »), payée à la caisse commune (D14) et dite au journal (« La charrette du village a
  vendu 80 volumes au port : +312 »). Personne ne l'attelle : rien à voir avec la règle « un joueur à la
  fois » de la charrette du joueur (I9c), qui reste.
- **Les commandes** : `charrette.palier` (une branche) et les rails, par les blocs du dehors (`bloc.*`,
  I9b). Les rôles, à mettre dans la grille d'I9e : acheter un palier, le **propriétaire** (une grosse
  dépense de la caisse commune, comme agrandir le port) ; poser et reprendre des rails, le **bâtisseur** ;
  mettre un villageois à la tournée, celui qui attribue les tâches (le propriétaire, ou les bâtisseurs
  s'il le délègue). La frontière (`COMMANDES_DEHORS`) les ouvre.
- **Le poids** : `state.charrette` tient en quelques dizaines d'octets ; une voie de 400 cases en
  segments, quelques centaines (à mesurer, comme I2 l'a fait pour les chemins).

## Sa place dans le lot

**Après I9e, avant I9f.** Après I9e : les commandes de la charrette entrent dans la grille des rôles
qu'I9e pose (le propriétaire, le bâtisseur), au lieu d'y être ajoutées en provisoire puis revues. Avant
I9f : la mise en ligne d'une île emporte alors `state.charrette` et les rails (I9f, point 1 : « la copie
emporte l'île ») et la migration des mondes d'avant n'a qu'une forme à connaître. Elle ne dépend pas
d'I9e pour le jeu solo : si I9e tarde, elle peut se faire avant, ses rôles posés à titre provisoire dans
`roles.js` et relus par I9e.

## Hors périmètre

- Une seconde charrette (le relais des charretiers est dans la fiche, D17) ; les aiguillages, une voie double, un dépôt au port.
- Une locomotive, une machine à vapeur, l'électricité sur les rails (D5 et le ton).
- Améliorer la charrette du joueur (I2) ; le portage du joueur ne change pas.
- La voie ailleurs que vers le port (vers la mine, par exemple) : les rails se posent partout, seule la
  voie de la gare au port fait rouler le wagonnet.
- Un pont de rails sur une rivière (un pont de planches porte les rails).

## Critères d'acceptation

- Dans Chromium (`jeu.html?village=1`) : un villageois mis à la tournée tire la charrette à bras vers le
  port à 7 h ; on la voit sur le chemin, chargée, puis à quai, puis revenir vide ; ce qu'elle vend est
  aux Comptes. On achète C2 et V2 : un voyage de plus, 40 volumes. On achète V3 : le cheval arrive au bac,
  la charrette est attelée. On pose une voie complète de la ferme au port (courbes et passage planchéié
  compris) et on achète V5 : le wagonnet roule au halage, plus vite. Captures de jour.
- La simulation (`--village`, `--vocations`) : le débit de la tournée, les paliers achetés, les pièces à la
  nuit 80, avant et après ; éteint, le CSV est le même octet pour octet.
- Les voyages par jour pour trois longueurs de chemin : ceux du tableau, mesurés.

## Vérifications et livraison

Celles du README du chantier. Captures : la charrette à bras, au cheval, la voie (droite, courbe,
passage planchéié), le wagonnet au halage, l'onglet de la charrette, le soir (la charrette rangée).
