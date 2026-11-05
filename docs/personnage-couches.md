# Les personnages en couches : identité, tenue, expressions (chantier)

Statut : **étape E0 (contrat et maquettes), à valider.** Rien n'a changé dans le jeu.

Le but : séparer un personnage de ses vêtements et de ses attributs (peau, yeux, coiffure, expression),
et donner des expressions aux visages, **en gardant la base actuelle** : les 100 personnages
(`perso_01` à `perso_50`, `enfant_01` à `enfant_50`), leurs planches de 16 × 32 aux 112 cases nommées
(`assets/personnages/cases.json`) et les générateurs Python de `scripts/personnage/` (voir
[`personnage.md`](personnage.md)), qui restent l'outil de dessin.

## 1. Décisions prises

| # | Question | Décision |
|---|---|---|
| 1 | Frontière identité / tenue | La barbe et la moustache sont de l'identité ; lunettes, boucles d'oreilles et couvre-chef sont des accessoires de la tenue |
| 2 | Où se fait l'assemblage final | Dans le jeu, en JS (étape E5). Python reste l'outil de dessin : il écrit des planches par couche, des palettes et des ancrages |
| 3 | Rendu des expressions | Un **calque visage** superposé à la planche (un mini-atlas par personnage), pas une planche refaite par expression |
| 4 | La teinte de peau des émotions (`js/carte/ferme/amis.js`) | Gardée, avec l'emoji ; l'expression s'y ajoute |
| 5 | Le premier lot d'expressions | Les 9 ci-dessous (§ 4) |
| 6 | Les modèles retouchés à la main (`perso_01` à `perso_03`) | Convertis en lettres (étape E4) |
| 7 | Le choix du joueur | Libre, attribut par attribut, dès l'étape E6 ; les 100 personnages restent des modèles prêts |

## 2. Le modèle

```
Personnage = Identité + Tenue + Expression (variable dans le temps)

Identité   : morphologie (adulte, enfant), peau, couleur des yeux, coupe, couleur des cheveux,
             barbe ou moustache, signes (rousseur, joues roses)
Tenue      : haut (forme, couleur, motif), bas, chaussures, couvre-chef, accessoires (lunettes, boucles,
             bandeau, fleur, nœud, serre-tête, pansement) ; plus tard l'équipement (data/equipement.json)
Expression : l'état du visage, choisi par le jeu ; plus le clignement
```

Un modèle prêt (`perso_07`) devient « l'identité 07 avec la tenue 07 ». Une sauvegarde qui ne connaît que
`member.perso` reste valide.

## 3. Ce que dit déjà chaque pixel : les familles de lettres

Les modèles sont tirés de grilles de lettres (`scripts/personnage/modeles.py`, `palette()`) ; chaque
lettre appartient à une famille, qui devient une couche ou une palette :

| Famille | Lettres | Devient |
|---|---|---|
| Peau | `k` la teinte, `e` le clair, `d` `t` `m` les ombres mêlées, `l` l'ombre (lèvres, cou), `P` les joues | couche corps ; palette « peau » |
| Yeux | `g` `i` le blanc, `h` `j` la pupille | calque visage ; palette « yeux » |
| Cheveux | `B` `C` `E` | couche coiffure ; palette « cheveux » (aussi la barbe) |
| Haut | `p` `q` le tissu, `o` le motif, `v_` l'ombre des rayures | couche haut ; palette « tissu » |
| Bas | `s` `r` `u` `v` `A` `Z` | couche bas ; palette « tissu » |
| Chaussures | `w` `x` `y` | couche chaussures |
| Couvre-chef, accessoire | `R` `Q` `H` `V` ; `S` `T` `U` la paille ; `Y` l'or des boucles | couche couvre-chef ou accessoire ; palette « accessoire » |
| Détails | `G` lunettes, `X` rousseur, `W` pansement | couche du détail |
| Contour | `a` (43, 29, 20) | recalculé après l'assemblage (`Canvas.outline()` : la silhouette seule) |

Aujourd'hui, `chibi.py` fabrique les poses à partir des **couleurs** du modèle. L'étape E4 les fera sur les
**lettres** : chaque pixel de chaque case saura alors à quelle couche il appartient.

Les règles de masquage, aujourd'hui écrites en dur, deviendront des données :
- sous une casquette, un bonnet ou un chapeau de paille, le haut des cheveux (rangées 0 à 3) disparaît (`modeles.vue`) ;
- la barbe n'écrase pas les yeux (`modeles.vue`) ;
- les cheveux, la barbe, les lunettes et le couvre-chef couvrent l'expression (§ 4).

## 4. Le visage et les expressions

### La zone du visage

La même pour les 100 modèles, retouchés compris (vérifié sur `perso_01` à `perso_03`), dans les
coordonnées du modèle (12 × 25 par vue ; dans la case de 16 × 32, le modèle est posé en x 2, y 7, puis
la tête se décale de la respiration et de l'accroupi) :

| Vue | Yeux | Bouche | Remarque |
|---|---|---|---|
| De face (`bas`) | colonnes 3-4 et 7-8, rangées 5-6 (le blanc dehors, la pupille vers le nez) | rangée 8, colonnes 5 à 7 | |
| De profil (`cote`, tourné vers la droite) | colonnes 6-7, rangées 5-6 | rangée 8, colonne 7 | la gauche est le profil retourné |
| De dos (`haut`) | — | — | aucune expression |

**La rangée 4 est toujours couverte** (frange, visière, bord du chapeau) : pas de sourcils ; tout se joue
dans les rangées 5 à 9, sur 6 colonnes de face.

### Les 9 expressions (`scripts/personnage/expressions.py`)

| Expression | Yeux | Bouche, extra | Usage prévu |
|---|---|---|---|
| neutre | ceux du modèle | celle du modèle | par défaut |
| yeux fermés | trait de cils en bas (les mêmes pixels que le sommeil, `Modele.yeux_fermes`) | | clignement, sommeil |
| joie | ouverts | sourire, coins relevés | cadeau, repas, amitié |
| rire | arcs, trait en haut | ouverte, joues roses | réaction forte |
| colère | paupière sombre côté nez | trait serré | arbre abattu sous ses yeux |
| tristesse | paupière tombante côté extérieur | à l'envers, une larme | refus, départ |
| peur | pupilles réduites, blanc agrandi | en O | cheval lancé, surprise |
| fatigue | paupières mi-closes | cernes | énergie basse, le soir |
| concentré | plissés | de côté | houe, hache, pêche |

Une expression ne remplace jamais un pixel de cheveux, de barbe, de lunettes, de couvre-chef, de rousseur
ou de contour : une mèche ou une barbe reste devant. Le blanc, la pupille, la peau et les lèvres sont relevés
sur le modèle lui-même ; quatre lettres s'ajoutent à la palette : `L` trait sombre, `M` bouche marquée,
`O` bouche ouverte, `N` larme.

**Maquettes** : `python3 scripts/personnage/expressions.py` écrit à la racine du dépôt (fichiers jamais
commités) `apercu_expressions.png` (9 personnages témoins × 9 expressions, de face et de profil, × 8) et
`apercu_expressions_jeu.png` (en pied, dans la case, × 3, l'échelle d'un téléphone).

### Constats sur les maquettes

- De face, à l'échelle du jeu, les yeux fermés, le rire, la peur et la tristesse (la larme) se lisent ;
  la joie, la colère et la fatigue sont plus discrètes. **De profil, presque rien ne se lit à l'échelle du
  jeu** : un œil de 2 px et une bouche d'un pixel. Les portraits de l'interface (agrandis) sont là où les
  expressions se verront le mieux ; sur la carte, l'emoji et la teinte restent utiles.
- Deux défauts du dessin actuel, antérieurs au chantier : les cheveux blancs ou gris (`perso_29`)
  ont presque la couleur du blanc des yeux (239, 239, 239), si bien que les yeux se confondent avec les
  cheveux ; sur les peaux foncées (`perso_12`, `enfant_04`), la pupille sombre se lit mal. À corriger dans
  les palettes (étape E1 ou E2), sans toucher aux expressions.

## 5. Les étapes

Chaque étape s'arrête sur un résultat vérifiable et peut être livrée seule ; à chaque étape, l'image
actuelle reste la référence (comparaison pixel par pixel).

| # | Étape | Condition de sortie |
|---|---|---|
| **E0** | Ce contrat, et les maquettes des 9 expressions | Les visages validés |
| **E1** | Séparer les données : `catalogue.py` et `portraits_enfants.py` scindés en identités, tenues et modèles prêts ; palettes exportées en JSON | Les 100 planches régénérées identiques au bit près |
| **E2** | Les expressions dans les générateurs : pour chaque personnage, un atlas visage et, par case, le décalage de la tête et un drapeau « visage libre » (pas de bras ni d'outil devant) | Aperçu validé ; le visage neutre posé sur la planche redonne exactement la planche |
| **E3** | Les premières expressions en jeu : calque visage sur la carte et les portraits, clignement, émotions de `amis.js`, yeux fermés au lit | Captures Chromium ; `npm test` vert ; mouvements réduits respectés |
| **E4** | Les planches en couches : `chibi.py` sur les lettres, une planche par couche ; `perso_01` à `perso_03` convertis en lettres | L'assemblage redonne les 100 planches actuelles (ou des écarts listés un à un) |
| **E5** | Le composeur JS (couches, masquages, palettes, contour), sans DOM, testé sous Node ; le jeu l'emploie derrière un réglage, repli sur les PNG | Tests de non-régression ; temps mesurés pour 1, 20 et 50 personnages |
| **E6** | L'apparence dans la sauvegarde (`member.apparence = { identite, tenue }`, migration depuis `perso`) ; l'écran de création attribut par attribut, les modèles prêts en raccourci | Une ancienne sauvegarde se charge à l'identique |
| **E7** | Les habitants tirés par graine (identité et tenue indépendantes) ; l'équipement visible sur la carte (fiche 11) | Même graine, mêmes habitants ; l'équipement suit toutes les cases |
