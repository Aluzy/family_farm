# Les personnages en couches : identité, tenue, expressions (chantier)

Statut : **E0 validée** (les 9 expressions, de face et de profil) ; **E1 faite** (§ 6) ; **E2 faite** (§ 7) ;
**E3 faite** (§ 8 : la carte ; § 9 : les portraits vivants du menu Famille) ; **E4 faite** (§ 10, § 11).

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
| rire | fermés : un trait sous une rangée de peau (en haut, il se perdait dans la frange ou la visière) | ouverte, joues roses | réaction forte |
| colère | paupière sombre côté nez | trait serré | arbre abattu sous ses yeux |
| tristesse | paupière tombante côté extérieur | à l'envers, une larme | refus, départ |
| peur | pupilles réduites, blanc agrandi | en O | cheval lancé, surprise |
| fatigue | paupières mi-closes | cernes | énergie basse, le soir |
| concentré | plissés : la paupière couleur de peau, la pupille dessous | de côté | houe, hache, pêche |

Une expression ne remplace jamais un pixel de cheveux, de barbe, de lunettes, de couvre-chef, de rousseur
ou de contour : une mèche ou une barbe reste devant. Le blanc, la pupille, la peau et les lèvres sont relevés
sur le modèle lui-même ; quatre lettres s'ajoutent à la palette : `L` trait sombre, `M` bouche marquée,
`O` bouche ouverte, `N` larme.

**Maquettes** : `python3 scripts/personnage/expressions.py --apercu` écrit à la racine du dépôt (fichiers jamais
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

## 6. Étape E1 : ce qui a été fait

**Le catalogue en JSON.** `assets/personnages/catalogue.json` est la seule source des 100 personnages :

```json
{ "version": 1,
  "palettes": { "peau": {…}, "yeux": {…}, "cheveux": {…}, "tissus": {…}, "bas": {…}, "accessoires": {…} },
  "personnages": {
    "perso_12": { "age": "adulte",
      "identite": { "peau": "foncee", "yeux": "noisette", "cheveux": "gris", "coupe": "courts", "pilosite": "barbe", "signes": [] },
      "tenue": { "haut": { "tissu": "jean", "motif": null }, "bas": { "tissu": "brun" }, "couvre_chef": "paille",
                 "accessoire": "bleu", "accessoires": [] } } } }
```

- `scripts/personnage/catalogue.py` le lit et le présente aux générateurs comme avant ;
  `python3 scripts/personnage/catalogue.py` le réécrit dans sa mise en forme (un personnage par ligne).
  `portraits_enfants.py` ne fait plus que le relayer.
- Les règles qui étaient cachées dans le code sont résolues une fois pour toutes dans les données : la
  couleur des yeux selon les cheveux, les joues roses des enfants, le bas en alternance, l'accessoire
  rouge par défaut, les habits qui imposent leur motif.
- Les détails du visage se posent dans un ordre fixe (`catalogue.ORDRE_DETAILS` : barbe, moustache,
  rousseur, lunettes, boucles, pansement, joues), le dernier l'emportant.
- Le bas est une salopette pour tous (le corps la dessine) : le détail `salopette` de 4 enfants, qui
  n'était pas dessiné, n'est pas repris.
- **Preuve** : régénérés depuis le JSON, les 97 modèles, les 100 planches, `fermiere.png`,
  `fermier.png` et `peau.json` étaient identiques au bit près (premier commit d'E1).
- **Test** : `tests/engine/personnages-catalogue.test.mjs` (dans `npm test`) vérifie la forme du
  catalogue, que chaque identité et chaque tenue renvoient à des palettes et des formes connues, et qu'il
  y a un modèle prêt et une planche par personnage proposé par le jeu.

**La lisibilité des yeux** (`modeles.py`, second commit d'E1) ; deux règles de dessin, à reprendre telles
quelles dans le composeur JS (E5) :

- **Peau foncée** (teinte moins lumineuse que `PEAU_FONCEE` = 110) : le haut de la pupille est assombri
  (× 0,4), le bas éclairci dans sa propre teinte jusqu'à 40 de luminosité au-dessus de la peau
  (`ECART_PUPILLE`) : les yeux violets restent violets, les bruns deviennent d'un brun chaud.
- **Cheveux pâles** (blancs, gris, platine : le plus petit canal de leur teinte au-dessus de 150) : les
  cheveux qui touchent le blanc d'un œil prennent leur ton sombre (la lettre `D`, `palettes.cheveux.*.sombre`) ;
  au-dessus de l'œil, cela fait comme un sourcil.

33 personnages changent (les 13 aux cheveux pâles et les 23 à la peau foncée, 3 étant les deux), et
seulement autour des yeux : 5 800 pixels, dans les rangées 10 à 21 et les colonnes 4 à 10 des cases.
Au passage, `peau.json` perd une teinte, `#523518` : c'était l'ancienne pupille de 8 personnages à la
peau foncée, prise à tort pour de la peau ; une émotion recolorait leurs pupilles avec la peau.

## 7. Étape E2 : l'atlas des visages

`python3 scripts/personnage/expressions.py` (à relancer après `chibi.py`) écrit :

- **`assets/personnages/visages.png`** (144 × 500 px) : pour chacun des 100 personnages (une rangée, dans
  l'ordre du catalogue), chaque expression de face puis de profil (18 colonnes) : la **zone du visage**,
  8 × 5 px (colonnes 2 à 9, rangées 5 à 9 du modèle), telle qu'elle apparaît sur sa planche, ce qui la
  couvre compris (cheveux, lunettes, barbe, contour). Posée sur la case, la tuile remplace exactement la
  zone : le jeu n'a qu'à la dessiner par-dessus le personnage.
- **`assets/personnages/visages.json`** : les expressions, les vues, l'ordre des personnages et, pour
  chaque âge et chaque case, où est la zone : `{ vue, x, y, expr }` (de profil, la carte retourne la case :
  la zone va en `16 - x - w`, soit le même x, 4), ou `null` quand le visage n'est pas dégagé. `expr` est
  ce que la case montre déjà : `fermes` pour le sommeil.

**Mesuré, pas calculé.** La zone de la pose debout est cherchée, rangée par rangée, dans chaque case de
chaque planche ; on la trouve (telle quelle, ou avec une expression) là où le visage est dégagé. Une même
table vaut pour tous les personnages d'un même âge (vérifié : sinon l'atlas n'est pas écrit).

| | Adultes | Enfants |
|---|---|---|
| Cases au visage dégagé | 51 sur 111 | 49 sur 111 |

- **Dégagées** : debout et la marche (face et profil), le panier, planter, arroser, ramasser, des temps
  de la houe, de la hache, de la pioche, de la pêche et du jet, assis (les mains sur la table), le sommeil
  (yeux fermés).
- **Pas de visage** : tout ce qui est de dos (`_haut_`), la cuisine et le frigo (de dos), la faux, et
  les temps où un bras ou un outil passe devant le visage (outil levé, fourchette à la bouche :
  `assis_*_1`).
- ~~Limite~~ (corrigée à l'étape E4, § 10) : un enfant assis avait le menton rogné par le raccourci des enfants,
  et donc pas de calque ; il en a un maintenant (51 cases au visage dégagé, comme un adulte).
- Les yeux fermés de l'expression `fermes` sont exactement ceux du sommeil de `chibi.py` (la peau relevée
  comme dans `Modele.yeux_fermes`) : les cases `dort_bas_*` sont reconnues comme `fermes`.

**Test** : `tests/engine/personnages-visages.test.mjs` (dans `npm test`) :
- sur les 5 000 cases au visage dégagé des 100 planches, la tuile posée à sa place redonne exactement la planche ;
- une expression garde la silhouette (mêmes pixels transparents) et change bien le visage de chacun des
  100 personnages, de face et de profil ;
- une planche régénérée sans l'atlas fait échouer le test (vérifié en modifiant un pixel).

La lecture des PNG des tests est mise en commun : `tests/engine/png.mjs` (reprise de `marche.test.mjs`).

## 8. Étape E3 : les expressions sur la carte

**`js/carte/visages.js`** (`window.CarteVisages`, script classique chargé après `kit.js`) : le visage d'un
personnage est un petit calque, une tuile de `visages.png` posée sur son image. `CarteVisages.suivre(scène,
image, options)` est appelé juste après que l'image a été placée (sa case, sa place, son sens, sa
profondeur) ; le calque prend la case, la place, le retournement, la rotation (un lit tourné), l'échelle,
l'opacité, et la profondeur de l'image + 0,005 (sous le voile d'une émotion, + 0,01). Il est détruit avec
l'image ; un calque dont l'image n'a pas été suivie pendant une image du jeu (hors de la vue, rentrée) est
caché ; il porte `personnage` (caché en mode Construire).

**L'expression**, à chaque image :

| Situation | Expression |
|---|---|
| La case montre déjà la sienne (le sommeil) | rien n'est posé (les yeux fermés sont sur la planche) |
| Une réaction (`amis.js`) : joie, colère, peur, tristesse | la même ; une joie forte (un cadeau, un invité qui admire le coin) : **rire** |
| Une réaction de dégoût (un plat détesté) | **concentré** (yeux plissés, bouche de côté) : il n'y a pas d'expression de dégoût |
| Un geste de travail : houe, hache, pioche, pêche, planter, arroser, jeter | **concentré** |
| Le soir et la nuit, de 19 h à 6 h (l'heure du modèle de la carte) | **fatigue** |
| Le reste du temps | neutre : rien n'est posé |
| De temps en temps (toutes les 2,2 à 6,5 s, 130 ms) | **yeux fermés** : il cligne ; jamais avec « réduire les animations » |

**Qui** : le personnage principal (`js/fermier.js`), la famille (`js/famille-ferme.js`), les habitants des
hameaux et les invités d'un repas (par `teinteHabitant`, `amis.js`, avec leurs réactions), le visiteur
(`visite.js`). Pas la mine (`js/grotte.js`) : décidé, on la garde ainsi pour l'instant.

**Les émotions** (`amis.js`) gardent leur teinte de peau et leur emoji. Pendant une réaction, les tuiles du
visage sont recolorées comme la planche (`visagePeau`, mêmes teintes de `peau.json` que `planchePeau`).
Au passage, un défaut corrigé : les planches des habitants ont des clés à un chiffre (`perso_7`), `peau.json`
des noms à deux (`perso_07`) : les personnages 1 à 9 n'avaient jamais la peau colorée d'une émotion (ils
avaient le voile) ; `tablePeau` cherche les deux.

**Vérifié** (Chromium, Playwright) :
- au pixel, caméra au zoom 8, boucle du jeu figée : de face (`idle_bas_0`) et de profil retourné
  (`marche_cote_1`, vers la gauche), le soir : l'éclairage de l'aube corrigé (une teinte uniforme, apprise sur
  le corps), le corps redonne l'image attendue à 1 près et la zone du visage est exactement « fatigue » (le
  neutre en diffère jusqu'à 120) ;
- la houe : « concentré » sur les cases au visage dégagé, rien sur celles où l'outil passe devant ; le
  clignement du personnage et de son compagnon ;
- les réactions, pour un adulte (`perso_3`) et un enfant (`enfant_4`) et les 5 émotions : la planche
  recolorée existe (la clé corrigée) et, sur chaque case au visage dégagé, la tuile recolorée est identique à
  la zone de la planche recolorée ;
- `npm run smoke` : une partie, la mine et une grotte, sans erreur.

**Tests** (`tests/engine/personnages-visages.test.mjs`) : le nom d'un personnage d'après la clé de sa planche,
et le choix de l'expression (la case, les réactions, le travail, le soir, le clignement, « réduire les
animations »).

**Retouche après essai** : dans le rire (puis dans « concentré »), les yeux étaient un trait sombre en rangée 5,
collé à la rangée 4 toujours sombre (frange, visière, bord du chapeau) : sous une casquette, on ne voyait plus
d'yeux. Le rire a maintenant les yeux fermés un rang plus bas, sous une rangée de peau ; « concentré », la
paupière couleur de peau au-dessus de la pupille.

## 9. Les portraits vivants du menu Famille

Dans le menu Famille, le portrait de la fiche du membre (avec son équipement) et ceux de la liste des membres
(en mode modification) **respirent et clignent des yeux** (`persoHtml(n, enfant, id, vivant)`,
`js/ui/famille.js` ; les autres portraits du jeu ne bougent pas).

- **Tout en CSS** (`css/jeu.css`, `.perso-px.vivant`) : rien ne tourne quand la fenêtre est fermée ; la
  fenêtre redessinée (`morph`) garde les éléments, l'animation ne repart pas ; « réduire les animations »
  (`prefers-reduced-motion`) les arrête toutes.
- **La respiration** : les cases `idle_bas_0` et `idle_bas_1` de la planche, en alternance (1,2 s), comme sur la
  carte.
- **Le clignement** : un calque (`.perso-cligne`), la tuile des yeux fermés de face de `visages.png`, posé sur
  la zone du visage (x 4, y 12 puis 13 en respirant ; 16 puis 17 pour un enfant), visible 3 % du temps d'une
  période de 3,4 à 6,2 s, avec un décalage : les deux tirés de l'id du membre (toujours les mêmes ; deux
  membres ne clignent pas ensemble).
- **L'équipement** de la fiche suit la respiration : chaque calque en deux, le haut du corps (rangées 0 à 24
  de la case d'un adulte, 0 à 26 d'un enfant) qui descend d'un pixel avec lui, et le bas.
  Chez l'adulte, la respiration est exactement ce décalage (vérifié sur les 50 planches) ; chez l'enfant, le
  raccourci la rend moins simple : le partage à la rangée 27 est une approximation pour l'équipement.

**Vérifié** (Chromium, les animations figées à un instant choisi) : debout et en respirant, yeux ouverts et
fermés, le portrait de la fiche est identique au pixel près à la case de la planche (avec la tuile des yeux
fermés) ; en marche, il passe par 3 images différentes ; avec « réduire les animations », aucune animation ;
le casque-lampe descend avec la tête, les bottes restent ; les portraits de la liste des membres sont vivants.
Test : `tests/engine/personnages-visages.test.mjs` (les constantes du portrait d'accord avec l'atlas).

## 10. Étape E4 : les planches en couches (première partie)

**Les modèles retouchés à la main en lettres.** `perso_01` à `perso_03` sont maintenant des grilles de lettres,
dans `scripts/personnage/retouches.json`, avec leurs 36 couleurs propres. Chacune est une **nuance** d'une
lettre de la palette (sa « base » : sa famille, donc sa couche), rattachée à la main d'après sa place et ses
voisines : la place tranche là où la couleur la plus proche se trompe (le blanc d'une chemise n'est pas le
blanc d'un œil). `modeles.py` écrit les 100 modèles depuis des lettres (`lettres()`, `palette_de()`, `base()`) :
les trois retouchés sont **identiques au pixel près**.

**Des lettres qui disent l'élément.** Quelques lettres servaient à deux éléments ; elles ont maintenant des
sœurs **de mêmes couleurs** (aucune image ne change) :

| Élément | Avant | Maintenant |
|---|---|---|
| La barbe, la moustache | B, C (les cheveux), l (la bouche dans la barbe) | b, c, J |
| La peau que la coupe laisse dans l'ombre (le front), le crâne d'un chauve | d, e | f, z |
| Les rubans des couettes | R (l'accessoire du couvre-chef) | N |
| Le cœur de la fleur | Y (l'or des boucles d'oreilles) | F |

**Les planches lues en lettres** (`scripts/personnage/couches.py`). `chibi.py` est relancé sur un modèle
« marqué » (une couleur unique par lettre, tout près de la vraie, pour que ses tests sur les couleurs donnent
la même réponse) : chaque pixel des 112 cases se relit en lettre, en couleur calculée (`L×0.8` la manche
lointaine, `L×0.7` la chaussure assise, `L×0.85` les cils), en outil (un nom de `fermier.C`), en contour
intérieur (`K`) ou en contour de la silhouette (`Ko`, recalculable). **Preuve** : recolorées, les 100 planches
en lettres redonnent exactement les planches du jeu (`python3 scripts/personnage/couches.py`, une minute).
Chaque lettre a sa couche (`couches.FAMILLES`) : corps, joues, rousseur, coiffure, pilosité, haut, bas,
chaussures, couvre-chef, lunettes, boucles, pansement, outils, contour.

**L'enfant assis.** Le raccourci des enfants retirait les rangées 20, 21, 26 et 27 de chaque case ; assis, la
tête descendue de 4, elles tombaient dans le menton et le cou. Pour les cases `assis_*`, il retire maintenant
les rangées 24, 27, 28 et 29 (le ventre, sous les mains, les cuisses : `chibi.ENFANT_RANGEES_ASSIS`) : la tête et
les pieds restent où ils étaient, la chemise et les mains restent visibles. Seules ces 6 cases des 50 planches
d'enfants changent.

**Ce que la mesure a appris** (la forme de chaque élément, case par case, chez tous ceux qui le portent) :
- **Même forme pour tous** : les chaussures, les couvre-chefs, la barbe, la moustache, les joues, le pansement.
- **Des écarts qui viennent de ce qui recouvre l'élément** (les cheveux sur le corps, le chapeau sur les
  cheveux, les cheveux longs sur le dos) : un assemblage par couches dans le bon ordre les refait.
- **Des écarts qui viennent de règles de chibi.py qui dépendent du contenu** :
  - quand les bras sont redessinés, il efface du torse les pixels **dont la couleur** est celle des bras,
    relevée sur le modèle : un motif (carreaux, pois, rayures : 33 personnages) change ce qui est effacé ;
  - sous une casquette, un bonnet ou un chapeau de paille, le haut des cheveux est effacé du modèle à plat :
    la peau dessous a déjà disparu, il reste un trou (bordé de contour) ;
  - le contour d'un bras devant la tête suit la forme de la tête, donc la coupe et le couvre-chef.

Décision prise : la voie A, rendre la pose indépendante du contenu (§ 11).

## 11. Étape E4 : la pose indépendante du contenu, les couches, l'assembleur

**Décision** (voie A) : `chibi.py` pose un personnage sans dépendre de ses couleurs ni de ses habits ; chaque
élément a la même forme chez tous ceux qui le portent ; le jeu (E5) n'aura qu'à empiler des couches.

**`chibi.py` dessine en lettres** (`chibi.Modele`, lu dans `modeles.lettres` ; `render()` donne les couleurs).
Les règles qui dépendaient du contenu sont fixes :

| Règle | Avant | Maintenant |
|---|---|---|
| Les bras retirés du torse quand ils sont redessinés | les pixels de la couleur des bras, relevée sur le modèle (un motif la changeait) | les cases des zones des bras où le corps (`modeles.CORPS`) a une manche ou une main, `chibi.ZONES` ; seulement le corps et le haut (une mèche reste) |
| Sous une casquette, un bonnet, un chapeau de paille | les cheveux des rangées 0 à 3 effacés (la peau d'un crâne chauve restait) | le corps et la coupe des rangées 0 à 3 effacés (`modeles.MASQUE_TETE`) |
| Les cheveux pâles près des yeux | une lettre D posée d'après la couleur des cheveux | des lettres `B_`, `E_` toujours posées ; la palette les fait sombres pour des cheveux pâles |

Les couleurs que `chibi.py` relevait sur le modèle (la manche, la main, les jambes et les chaussures assises,
la peau des yeux fermés) sont des **rôles de la palette** : `Mp`, `Mk`, `Ms`, `Mr`, `Mw`, `Mv` ; les cils, `L`
(`modeles.palette_de`). Chaque personnage garde ses couleurs (les retouchés aussi) ; seules les formes sont fixes.

**Ce qui change** : 22 planches (et `fermiere.png`, la copie de `perso_01`), seulement quelques pixels par case :

| Personnages | Pixels | Pourquoi |
|---|---|---|
| Les 8 hauts à carreaux (`perso_18`, `34`, `40` ; `enfant_14`, `18`, `34`, `40` ; et `perso_44`) | 69 à 138 par planche | le bord d'un bras ou d'une manche, quand les bras sont redessinés |
| 12 hauts à pois (`perso_13`, `16`, `27`, `32`, `38`, `47` ; `enfant_02`, `08`, `13`, `27`, `38`, `47`) | 1, dans `marche_bas_0` | le col, qui n'est plus effacé |
| `perso_44` (chauve, chapeau de paille) | 778 | les deux pointes de crâne qui dépassaient du chapeau, dans toutes les cases (et les carreaux) |
| `perso_01`, `perso_02` (retouchés à la main) | 110, 155 | le bord d'un bras redessiné (leurs bras dessinés à la main n'étaient pas tout à fait dans les zones) |

**Les éléments** (`modeles.elements`) : chaque modèle est l'empilement de ses éléments, chacun sa grille sans ce
qui le recouvre, dans l'ordre `modeles.ORDRE_COUCHES` (corps, haut, bas, chaussures, coiffure, couvre-chef,
pilosité, rousseur, lunettes, boucles, pansement, joues) ; empilés (`aplatir`, avec le masque du couvre-chef), ils
redonnent les 100 modèles. Un modèle retouché : ses lettres rangées par famille, des éléments à son nom.

**Les couches communes** : `chibi.py` retient, pour chaque pixel, l'étape qui l'a posé (`Canvas.calques` : derrière,
le bras lointain, les jambes, les bras sous le corps, le modèle, les bras posés dessus un par un, devant) et la pose
de chaque case (`cv.trace` : la vue, le décalage du haut du corps, les bras retirés, les yeux fermés, le contour de
chaque bras). Les outils, les bras et les poses sont **les mêmes pour tous** les personnages d'un âge (vérifié) ; les
jambes aussi, sauf celles des trois retouchés.

**L'assembleur** (`scripts/personnage/couches.py`, la référence pour le jeu) : les couches communes et les jambes,
puis chaque élément posé (décalé de `dy`, moins les zones des bras pour le corps et le haut, le masque d'un
couvre-chef, les yeux fermés), puis les bras posés dessus (un contour les détache de la tête, ou du torse, comme
`chibi.bras`), devant, le contour de la silhouette, le raccourci d'un enfant. **Vérifié** :
- les 100 personnages assemblés depuis leurs couches sont identiques, lettre pour lettre, aux cases de `chibi.py` ;
- **60 personnages tirés au hasard, hors du catalogue** (toutes les coupes, couvre-chefs, détails, motifs ; adultes
  et enfants) aussi (`python3 scripts/personnage/couches.py --combinaisons`) : la libre combinaison fonctionne.

**Pour le jeu : `assets/personnages/couches.json`** (`couches.py --exporter` ; 326 Ko, 25 Ko compressé) : les
grilles des éléments, les couches communes et les jambes de chaque case, les poses, les zones des bras, les yeux
fermés, les règles (l'ordre, le masque, le raccourci, le contour), les couleurs des outils, et la palette résolue
des 100 personnages (chaque lettre qu'il emploie, les couleurs calculées comprises : Python arrondit les moitiés au
pair, `Math.round` vers le haut ; rien n'est donc à recalculer dans le jeu). Pixels en texte compact : `x,y,lettre;…`.
Test : `tests/engine/personnages-couches.test.mjs` (chaque personnage, ses éléments, ses jambes, une couleur pour
chaque lettre).

**Suite (E5)** : l'assembleur en JS, qui lit `couches.json`, vérifié contre les planches PNG (au pixel, pour les 100) ;
le jeu l'emploie derrière un réglage, avec repli sur les PNG ; puis les palettes d'une combinaison libre (E6).
