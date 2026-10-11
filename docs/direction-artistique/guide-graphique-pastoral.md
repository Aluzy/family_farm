# Guide graphique — Pipeline de sprites pixel art pastoral

Oct 5, 2026 · @Alexandre

## L'essentiel

Le style tient en dix règles mesurables. Un sprite qui les respecte toutes s'intègre au monde, quel que soit son sujet.

1. **Grille 16×16.** Une case vaut 16×16 pixels logiques. Tout gabarit est un multiple de 16.
2. **Pixel entier.** Dessin en 1×, agrandissement par multiples entiers au plus proche voisin. Alpha binaire, sauf l'ombre de contact.
3. **Palette fermée.** 124 couleurs en 21 rampes, tirées des planches sources. Aucun pixel hors palette.
4. **Deux sombres, jamais de noir.** Prune `#4A2433` / `#3C1123` pour le bois, la pierre et les toits. Pétrole `#02303A` / `#0B4A4F` pour le végétal, l'eau et le verre.
5. **Dérive de teinte.** Les ombres virent au bleu (teinte 191°), les lumières au jaune-vert (78°).
6. **Lumière haut-gauche.** Quatre à cinq niveaux en aplats durs. Les ombres couvrent environ 35 % d'un volume.
7. **Contour selon la famille.** Objet construit : 1 px continu, du ton sombre de son matériau. Roche : côté ombre seulement. Feuillage : bord d'ombre surtout. Terrain : aucun.
8. **Ombre de contact.** Une bande de 1 à 2 px sous le pied, en prune translucide à 41 %.
9. **Textures en amas.** Amas de 2 à 12 pixels, semis de brins aux transitions, damier jamais au-delà de 3 × 3.
10. **Monde sourd, objets vifs.** Sols et décors restent peu saturés. Les couleurs vives vont aux cultures, aux récoltes et aux poissons.

**Version 2.** Les trois planches PNG d'origine ont remplacé la lecture des captures. Elles confirment la grille, la lumière et 58 des 60 couleurs relevées, à 5 unités près. Elles corrigent quatre points : la taille de la palette, les budgets de couleurs, la règle du damier et la nature de l'ombre de contact.

## Mesures sur les trois captures

La case fait exactement 16 pixels logiques : c'est la mesure qui tranche le principal désaccord entre les deux documents. Chaque capture a été ramenée à sa résolution logique, puis mesurée par programme.

&#91;image: Capture 3 à la résolution logique, avec un quadrillage de 16 pixels aligné sur les pavés et les cultures\]

Les planches PNG reçues ensuite donnent les valeurs exactes. Elles valident la lecture des captures : 58 des 60 couleurs relevées tombent à 5 unités ou moins d'une couleur source.

### Planches sources

| Mesure | Résultat |
| --- | --- |
| Planche de tuiles | 1200 × 720 px, soit 75 × 45 cases ; 1 239 tuiles pleines |
| Planche de cultures | 256 × 224 px ; 16 espèces |
| Planche de poissons | 64 × 32 px ; 7 poissons de 16 × 16 |
| Échelle | 1 pixel du fichier = 1 pixel logique |
| Couleurs distinctes | 744 au total : 490, 226 et 66 par planche |
| Couleurs jumelles | 333 ont une voisine à 6 unités ou moins |
| Palette retenue | 124 couleurs ; 0,35 % des arêtes de couleur perdues au plus |
| Noir et blanc purs | Absents ; extrêmes `#071609` et `#D6D6E1` |
| Transparence | Binaire, sauf 1 729 pixels d'ombre de contact |
| Ombre de contact | Prune `#2C0F28` à 41 % sous les objets ; brun `#5A2B1E` à 51 % sous les cultures |
| Damier | 293 motifs de 3 × 3, aucun de 4 × 4 |
| Couleurs par tuile pleine | Médiane 7 ; 94 % en 10 ou moins ; maximum 17 |
| Bande de transition | 9 px dans la tuile de bord, entre 4 px vides et 3 px pleins |
| Saturation médiane des tons moyens et clairs | 0,44 pour le monde ; 0,63 pour les cultures ; 0,56 pour les poissons |
| Animation de l'eau | 3 images jouées 0-1-2-1 ; 5 % des pixels d'eau changent |
| Animation des coffres | 3 images : fermé, entrouvert, ouvert |

### Captures d'écran

| Mesure | Résultat |
| --- | --- |
| Taille des captures | 1080 × 1365 à 1408 px écran |
| Taille d'un pixel logique | 5,12 px écran, identique sur les deux axes et les trois captures |
| Résolution logique visible | 210 × 266 à 274 px, soit 13 × 17 cases |
| Période des pavés, de la terre et du pas des cultures | 16 px logiques |
| Période de la séquence de pavés | 48 px, soit 3 tuiles |
| Couleur dominante | `#226152`, 46,5 % des pixels |
| Couleurs distinctes | 67 amas au-dessus de 0,05 % de surface, teintes parasites JPEG comprises |
| Pixel le plus sombre | `#1B1515` (encre du panneau) ; aucun noir pur |
| Pixel le plus clair | `#D6D5E9` ; valeur maximale 0,91 |
| Saturation des tons moyens et clairs | médiane 0,44 ; 95e centile 0,67 |
| Répartition des teintes | 68 % froides, 23 % chaudes |
| Damier complet 3×3 | 0,05 % de la surface au plus |
| Bande de transition herbe sombre vers herbe claire | 13 px, en trois tons |
| Bande de transition herbe claire vers terre | 11 px |
| Décalage du centre lumineux, buisson et rochers | 1,4 px vers la gauche, 1,3 à 1,6 px vers le haut |

### Tailles et couleurs des sprites mesurés

Mesures prises sur les planches sources. Les couleurs sont comptées après projection sur la palette de 124.

| Élément | Boîte mesurée (px) | Couleurs | Gabarit (px) |
| --- | --- | --- | --- |
| Champignon | 10 × 13 à 14 × 11 | 7 à 11 | 16 × 16 |
| Poisson | 16 × 16 | 7 à 12 | 16 × 16 |
| Sachet de graines | 14 × 16 | 10 à 15 | 16 × 16 |
| Stade de culture | 5 × 3 à 14 × 16 | 3 à 9 | 16 × 16 |
| Culture haute | 7 × 21 à 13 × 26 | 8 à 13 | 16 × 32 |
| Seau, coffre, panneau | 11 × 12 à 16 × 14 | 7 à 8 | 16 × 16 |
| Baril | 18 × 24 | 5 à 6 | 32 × 32 |
| Rocher | 24 × 15 à 27 × 21 | 6 | 32 × 32 |
| Buisson | 32 × 26 | 6 | 32 × 32 |
| Épouvantail | 40 × 47 | 15 | 48 × 48 |
| Arbre, stade 1 | 16 × 20 à 20 × 22 | 9 | 32 × 32 |
| Arbre, stade 2 | 30 × 36 à 34 × 36 | 9 | 48 × 48 |
| Arbre, stade 3 | 42 × 53 à 48 × 55 | 10 | 64 × 64 |
| Arbre adulte | 58 × 74 à 74 × 69 | 9 à 10 ; 13 en fleurs ; 15 à 18 en fruits | 80 × 80 |
| Serre | 96 × 80 | 13 | 96 × 80 |
| Maison | 91 × 95 | 23 à 28 | 96 × 96 |
| Grange | 102 × 91 | 13 | 112 × 96 |
| Moulin | 80 × 117 | 13 | 80 × 128 |

## Arbitrages entre les deux documents

Les deux analyses divergent sur quinze points. Les planches sources en tranchent quatorze ; la symétrie des façades reste un choix de production. « A » désigne la spécification courte (`attachment.txt`), « B » l'analyse de direction artistique (`pixel_art_style_guide.md`).

| Sujet | Document A | Document B | Mesure | Règle retenue |
| --- | --- | --- | --- | --- |
| Taille de case | 16 × 16, confiance haute | Inconnue ; 16, 24 ou 32 | Période de 16 px sur les captures ; planche de 75 × 45 cases | 16 × 16 |
| Échelle d'affichage | 1 | Environ 6 | 1 dans les fichiers ; 5,12 px écran sur les captures | Source en 1× ; l'échelle des captures n'est pas une contrainte |
| Tramage | Absent | Local, en amas | 293 damiers de 3 × 3, aucun de 4 × 4 ; semis de brins aux transitions | Damier toléré jusqu'à 3 × 3 ; semis de brins sur le terrain |
| Contour | Continu, 1 px, tous les objets, ton sombre de la rampe locale | 1 px, partiel, teinte du matériau | Trois régimes selon l'objet ; teinte du matériau confirmée | Contour par famille (section Construction) |
| Couleurs par sprite | 4 à 8 | 5 à 25 selon la taille | 3 à 28 selon la classe | Budget par classe (section Palette) |
| Palette globale | 32 à 48 teintes | 35 à 70 teintes | 744 couleurs distinctes, dont 333 jumelles | 124 couleurs |
| Valeurs hexadécimales | Verts `#1b332b` à `#a3d9ad` | Fond `#226051`, eau `#5B9CAE` | Fond `#226151`, eau `#5B9DAE` | Valeurs exactes des planches ; celles de A n'y figurent pas |
| Couleur des toits | Rouge `#8c3a38` | Non précisée | Prune `#4A2433`, joints `#3C1123` | Prune |
| Largeur des transitions | Encoches de 1 à 3 px | Bords « détaillés » | 9 px dans la tuile de bord ; 11 à 13 px quand deux sols se superposent | Bande de 9 px par tuile ; brins de 1 px de large, 1 à 3 px de haut |
| Répartition des valeurs | 10 % reflet, 50 % base, 30 % ombre, 10 % contour | 3 à 5 niveaux, sans proportions | Buisson : 34 % lumières, 28 % base, 35 % ombres | 30 à 40 % lumières, 25 à 30 % base, 30 à 40 % ombres |
| Symétrie des façades | Stricte | Faible à moyenne | Serre et grange symétriques, maisons asymétriques | Symétrie par module, jamais imposée au bâtiment entier |
| Ancrage des objets | Bas-centre | Centre optique | Objets et arbres au ras du bas de case ; pied des cultures 4 à 7 px plus haut | Bas-centre ; pied de culture sur les rangées 9 à 12 |
| Détail minimal | 1 × 1 ou 2 × 2 | 2 × 2 en général | 7 à 26 % de pixels isolés dans les arbres et les rochers | Pixel isolé permis, plafonné par famille |
| Transparence | Non traitée | Non traitée | 1 729 pixels d'ombre semi-transparente | Alpha binaire, sauf l'ombre de contact |
| Marge autour des objets | 1 px | 10 à 20 % | Buissons et poissons occupent toute la largeur de leur case | Aucune marge imposée |

Les deux documents s'accordent sur le reste, et les planches le confirment : lumière en haut à gauche, absence de noir pur, ombres dures, palette naturelle. L'interface reste non observée. L'animation l'est en partie, sur l'eau et les coffres.

## Fondations techniques

Tout sprite est dessiné en 1× sur une grille de 16 px, dans un gabarit multiple de 16, avec un pivot en bas au centre.

### Pixel et fichiers

- **Résolution source :** 1 pixel dessiné = 1 pixel logique. Aucun sprite n'est produit agrandi.
- **Agrandissement :** multiples entiers uniquement (×2, ×3, ×4…), au plus proche voisin, fait par le moteur.
- **Format :** PNG RGBA. Chaque pixel opaque appartient à la palette maîtresse.
- **Transparence :** alpha à 0 ou 255, sauf l'ombre de contact, seule zone semi-transparente. Aucun lissage.
- **Transformations permises :** décalage au pixel ; miroir horizontal pour les seules tuiles sans volume, car il inverse la lumière. Rotation libre et mise à l'échelle non entière sont interdites.

### Projection

- Le sol est vu du dessus, sans perspective.
- Les objets dressés sont dessinés en élévation frontale : on voit la façade et le dessus (toit, couvercle du baril, dessus des pierres).
- Aucune ligne de fuite. Les verticales restent verticales ; les toits utilisent des pentes en escalier.
- La profondeur vient du recouvrement : un objet plus bas à l'écran passe devant.

### Gabarits

| Classe | Gabarit (px) | Emprise au sol (cases) | Exemples mesurés |
| --- | --- | --- | --- |
| Tuile de terrain | 16 × 16 | 1 × 1 | Herbe, sable, terre, eau, pavés |
| Micro-décor | 16 × 16 | Aucune | Champignon 10 × 13, fleur 11 × 12, caillou 13 × 8 |
| Icône d'inventaire | 16 × 16 | Sans objet | Poisson 16 × 16, sachet 14 × 16, récolte 10 × 11 |
| Culture | 16 × 16 ou 16 × 32 | 1 × 1 | Pousse 7 × 6, plant mûr 14 × 16, plant haut 13 × 26 |
| Objet | 16 × 16 à 32 × 32 | 1 × 1 ou 2 × 1 | Seau 11 × 12, baril 18 × 24, rocher 27 × 21, buisson 32 × 26 |
| Arbre, par stade | 32 × 32, 48 × 48, 64 × 64, 80 × 80 | 1 × 1 | 16 × 20, 34 × 36, 48 × 54, 74 × 69 |
| Bâtiment | 96 × 96 à 112 × 112 | 6 × 3 environ | Maison 91 × 95, grange 102 × 91, moulin 80 × 117 |
| Module linéaire | 16 × 16, répétable | 1 × 1 | Clôture : 14 px de haut, un piquet tous les 8 px |

### Ancrage

- **Pivot :** milieu du bord inférieur du gabarit, au pixel.
- **Base :** objets, arbres et bâtiments descendent jusqu'à la dernière rangée du gabarit. Une rangée vide est tolérée, ombre de contact comprise.
- **Cultures :** le pied se pose 4 à 7 px au-dessus du bas de la case, sur les rangées 9 à 12.
- **Marge :** aucune n'est imposée. Buissons et poissons occupent toute la largeur de leur case.
- **Emprise :** la collision n'occupe que les cases du pied. Le reste du sprite dépasse vers le haut et se trie en profondeur.

## Palette maîtresse

La palette compte 124 couleurs en 21 rampes, et le pipeline n'en accepte aucune autre. Les planches sources en contiennent 744, mais la plupart sont des jumelles : ces 124 conservent plus de 99,6 % des arêtes de couleur. Les identifiants (V3, N2, E2…) servent de vocabulaire commun dans tout le guide.

&#91;image: Palette du monde : les douze rampes d'origine, 59 couleurs aux valeurs exactes des planches\]

Les trois captures ne montraient presque que le monde. Les cultures, les récoltes et les poissons ajoutent 65 couleurs plus vives, et l'ombre de contact se révèle translucide.

&#91;image: Extension de la palette : neuf rampes de couleurs vives et les deux ombres translucides\]

La liste à copier se trouve dans la section Spécification machine.

### Règles de couleur

- **Sombre chaud : prune.** Bois, pierre, toits et berges s'ombrent avec N0 à N2, ou W0 pour le bois.
- **Sombre froid : pétrole.** Végétal, eau et verre s'ombrent avec V0 et V1.
- **Indigo d'ombre.** A0 se pose en amas de 2 à 6 px au creux des feuillages et sur le verre. Il reste sous 2 % du sprite.
- **Dérive de teinte.** Vers l'ombre, la teinte glisse vers le bleu ; vers la lumière, vers le jaune. Végétal : de 191° à 78°. Bois : de 351° à 32°. Pavés : de 23° à 41°.
- **Deux registres de saturation.** Le monde reste sourd : saturation médiane de 0,44. Cultures et poissons montent à 0,63 et 0,56.
- **Couleurs vives réservées.** Les rampes d'ocres, de rouges, de violets et de bleus couvrent 1 % de la planche de tuiles, 15 % des cultures et 51 % des poissons.
- **Ni blanc ni noir.** La couleur la plus claire a une valeur de 0,89. La plus sombre, K0, ne sert qu'à l'œil des poissons ; S1 sert au texte.
- **Rampe entière ou rien.** Un matériau utilise des tons voisins de sa rampe. Sauter deux crans crée un contraste étranger au style.
- **Deux ombres translucides.** S0 et S2 sont les seules couleurs semi-transparentes. Elles ne servent qu'à l'ombre de contact.

### Budget par classe de sprite

| Classe | Couleurs mesurées | Budget maximal |
| --- | --- | --- |
| Tuile de terrain | 1 à 10 pour 94 % des tuiles | 10 |
| Tuile de relief : falaise, berge, sol de serre | 11 à 17 | 18 |
| Micro-décor | 7 à 11 | 12 |
| Culture | 3 à 13 | 14 |
| Icône d'inventaire | 7 à 15 | 16 |
| Animal | Non observé ; aligné sur les poissons | 16 |
| Objet | 5 à 8 | 10 |
| Arbre et grand objet | 9 à 18 | 18 |
| Bâtiment | 13 à 28 | 32 |

L'ombre de contact ne compte pas dans le budget. Les couleurs sont comptées après projection sur la palette.

## Lumière et volume

Une seule lumière, en haut à gauche, éclaire tout le monde ; chaque volume se lit en quatre ou cinq aplats durs.

### Direction

- La source est en haut à gauche, à 45° environ. Sur des sprites de 32 px, le centre lumineux est décalé de 1,4 px à gauche et de 1,5 px vers le haut.
- Les faces tournées vers le ciel sont les plus claires : dessus des pavés, couvercle du baril, dessus de berge.
- Les faces tournées vers le spectateur sont un cran plus sombres.
- Le bas et la droite d'un volume reçoivent l'ombre.

Les planches le confirment sans exception : sur 34 volumes compacts (28 arbres, 2 buissons, 3 rochers, 1 souche), le centre lumineux est décalé vers le haut-gauche.

### Niveaux de valeur

| Niveau | Part visée | Buisson mesuré | Rocher mesuré |
| --- | --- | --- | --- |
| Reflet | 0 à 15 % | V11, 15 % | Absent |
| Lumière | 20 % | V8, 19 % | R3, 21 % |
| Base | 25 à 30 % | V6, 28 % | R2, 26 % |
| Ombre | 20 à 25 % | V2, 23 % | R1, 21 % |
| Ombre profonde | 10 à 17 % | V0, 10 % | N2, 17 % |
| Accent d'ombre | 4 % au plus | A0, 2 % | R0, 4 % |

Un sprite de 16 px ou moins se contente de trois niveaux : ombre, base, lumière.

### Ombres

- **Dures.** Deux niveaux voisins se touchent par une frontière nette. Aucun dégradé, aucun flou.
- **Ombre de contact.** Une bande de 1 à 2 px sous le pied, semi-transparente. Prune S0 à 41 % sous les objets, brun S2 à 51 % sous les cultures.
- **Valable sur tous les sols.** Translucide, la même ombre s'adapte à chaque sol : `#263F40` sur l'herbe sombre, `#835B3F` sur la terre.
- **Qui en porte.** Rochers, barils, panneaux, champignons, cultures. Ni les arbres, ni les buissons, ni les bâtiments.
- **Pas d'ombre portée longue.** Rien ne projette d'ombre allongée sur le sol.
- **Ombre de surplomb.** Sous un avant-toit ou une berge, une bande plus sombre : 1 à 3 px sous un toit, 6 à 8 px d'eau profonde sous la berge nord.

## Construction des sprites

Un sprite se construit en six passes, de la silhouette à l'ombre de contact ; seule la passe de contour change selon la famille de l'objet.

&#91;image: Deux sprites originaux de 16 pixels, une caisse et un rocher, montrés aux six étapes de construction\]

1. **Silhouette.** Un aplat de la couleur de base. L'objet doit déjà se reconnaître.
2. **Ombres.** En bas et à droite, un ou deux crans plus sombres, posées en amas.
3. **Lumières.** En haut et à gauche, un cran plus clair.
4. **Reflets et accents.** Quelques pixels du ton le plus clair sur les arêtes éclairées, un accent d'ombre au creux.
5. **Contour.** Selon la famille, voir ci-dessous.
6. **Ombre de contact.** Ajoutée par le pipeline sous la base.

### Contour par famille

&#91;image: Baril, rocher et buisson des planches sources : contour continu, contour côté ombre, bord éclairé ouvert\]

| Famille | Exemples | Contour extérieur | Couleur | Mesure sur les planches |
| --- | --- | --- | --- | --- |
| Construit | Bâtiments, barils, coffres, panneaux, statue | 1 px continu | Le ton le plus sombre du matériau : W0 pour le bois, N0 pour les toits, V1 pour la serre, un ocre pour la paille | 48 à 100 % du pourtour dans les tons sombres du sprite |
| Organique dur | Rochers, souches | Côté ombre ; le bord éclairé touche le fond | N2 | 89 à 95 % côté ombre, 20 à 69 % côté éclairé |
| Feuillage | Arbres, buissons | Bord d'ombre cerné, bord éclairé plus ouvert | V0 et V1 | Bord éclairé moins cerné que le bord d'ombre : 30 sprites sur 30 |
| Icône | Poissons, sachets, récoltes | 1 px continu, coloré | Le ton sombre de la teinte de l'objet | 72 à 100 % sur les poissons |
| Terrain | Tuiles, pavés | Aucun | Sans objet | Sans objet |

La part du pourtour est mesurée ainsi : un pixel de bord compte s'il fait partie des 30 % les plus sombres du sprite. Le contour d'un objet clair n'est donc pas forcément foncé : celui de l'épouvantail est ocre, celui de la statue gris-beige.

Les séparations internes sont des joints de 1 px, un cran plus sombre que la surface : W1 entre deux planches, N0 entre deux tuiles de toit.

### Amas et pixels isolés

- Une texture est faite d'amas de 2 à 12 pixels du même ton, jamais de bruit pixel par pixel.
- Le pixel isolé est courant mais borné : 2 à 12 % des pixels d'un objet construit, 7 à 26 % de ceux d'un arbre ou d'un rocher.
- Le damier ne dépasse jamais 3 × 3. Les planches en comptent 293 de cette taille et aucun de 4 × 4.
- Aucun lissage : pas de ton intermédiaire posé pour adoucir un escalier.

### Courbes et diagonales

- **Courbes.** Des paliers qui raccourcissent puis rallongent : 3, 2, 1, 1, 2, 3. Pas de palier long entre deux courts.
- **Toits.** Pente régulière de 2 px horizontaux pour 1 px vertical, mesurée sur la maison.
- **Construit.** Pentes 1:1 ou 2:1, sans changement de cadence.
- **Organique.** Cadence volontairement irrégulière : aucun bord de plus de 4 px en ligne droite.

## Matériaux

Chaque matière a un motif qui lui est propre : on doit la reconnaître en noir et blanc, sans l'aide de la couleur.

| Matière | Rampe | Motif | Lumière | Sombre |
| --- | --- | --- | --- | --- |
| Bois | W0 à W4, B1, B2 | Planches de 3 à 4 px ; veines en traits verticaux de 1 px, longs de 2 à 6 px | Arête haute en W4 ou B2 | Joints W1, contour W0 |
| Toiture | N0 à N3 | Rangs de 5 px ; tuiles de 8 à 12 px, joints décalés d'un rang à l'autre | Aplat N2 ; traits N3 sur les appentis | Joints et contour N0 |
| Enduit | C0, P4, C1 | Aplat sans texture, découpé par un colombage en W3 | Aplat P4 | C0 sous l'avant-toit |
| Pavés | P0 à P4 | Pierres arrondies de 6 à 8 px, deux par rangée, rangées décalées | Dessus P4 et P3 | Dessous P0 ou P1 sur 1 à 2 px ; joints laissés à l'herbe |
| Roche | R0 à R3, N2 | Plans anguleux de 4 à 10 px séparés par des fissures | Plans du haut et de gauche en R3 | Fissures et bord d'ombre N2 ; reflet R0 sur 2 à 4 px |
| Falaise | L1, W2, B0 à B2, N2 | Blocs arrondis de 8 à 12 px, sur deux cases de haut ; herbe en surplomb | Dessus des blocs en B2 | Joints N2 |
| Verre | G0 à G3, A1, A9 | Panneaux de 3 à 6 px entre des montants de 1 px | Reflets diagonaux G3 ; touches A1 de 1 px sur 2 à 4 | Montants G0 et V1 |
| Eau | E0 à E4 | Aplat E2 ; tirets horizontaux de 2 à 5 px | Écume E4, reflets E3 | Bande E1 sous la berge, stries E0 |
| Feuillage | V0 à V11, A0 | Amas de feuilles de 6 à 12 px, superposés ; bord dentelé | Amas V10 et V11 en haut à gauche | Creux V0 et V1, touches A0 |
| Feuilles de culture | K1, K2, G0, V9 | Feuilles de 2 à 4 px, plus saturées que le feuillage des arbres | Pointes en V9 | Nervures et dessous en K1 et G0 |
| Herbe au sol | V3, V6, V8, K5 | Quatre aplats, du sombre au jaune ; touffes en V de trois brins | Sans objet | Sans objet |
| Sable | D0, D1, A5 | Aplat D1 marbré de A5 et de D0, sans grain | Sans objet | Sans objet |
| Terre de chemin | T1 à T3 | Chevrons T2 sur fond T3, période de 16 px | Sans objet | T0 au bord |
| Terre labourée | T0, L2, D1 | Mottes en amas ; parcelles bordées d'un pointillé D1 | Sans objet | W2 dans les creux |

Le feu, la glace et le cristal ne figurent ni dans les captures ni dans les planches. Le métal n'apparaît que sur les ferrures des coffres. Leur recette reste à définir avec une référence.

## Terrains et tuiles

Sept sols s'empilent en couches. Chaque sol se pose sur les autres grâce à deux blocs de 3 × 3 tuiles à fond transparent : aucune tuile n'est dédiée à une paire de terrains.

### Les sept sols

| Sol | Couleur de base | Texture |
| --- | --- | --- |
| Herbe sombre | V3 | Aplat ; variantes à touffes |
| Herbe moyenne | V6 | Aplat ; variantes à touffes |
| Herbe claire | V8 | Aplat ; variantes à touffes |
| Herbe jaune | K5 | Aplat ; variantes à touffes |
| Sable | D1 | Marbrures A5 et D0 |
| Terre de chemin | T3 | Chevrons T2, période de 16 px |
| Terre labourée | T0 | Mottes L2, parcelles bordées d'un pointillé D1 |

### Ordre des couches

Du fond vers l'avant :

1. Eau, avec sa berge.
2. Herbes et sable, posés en taches les uns sur les autres.
3. Terre de chemin, puis terre labourée.
4. Pavés.
5. Micro-décor : touffes, fleurs, champignons, cailloux.
6. Ombres de contact.
7. Objets, arbres et bâtiments, triés par l'ordonnée de leur pivot.

### Jeu de tuiles d'un sol

&#91;image: Blocs tache et trou d'une herbe sur fond transparent, puis la tache posée sur le sable\]

- **Tache.** Neuf tuiles : quatre coins sortants, quatre bords, un centre.
- **Trou.** Huit tuiles utiles : quatre bords inversés et quatre coins rentrants.
- **Pose.** Les deux blocs ont un fond transparent à alpha binaire. Ils se posent sur n'importe quel sol.
- **Tuile de bord.** 4 px vides, 9 px de bande, 3 px pleins.
- **Frange.** Deux tons de bordure plus sombres entrent d'abord, de 6 à 69 % de couverture. La couleur du centre suit, de 12 à 88 %. Pour l'herbe jaune, la frange est en V9 et V10.
- **Brins.** 1 px de large dans 65 % des cas, 1 à 3 px de haut dans 84 %.
- **Compte.** 17 tuiles par sol, soit 119 pour les sept sols, hors remplissages, eau et relief.

### Ce que cela donne à l'écran

Deux sols superposés additionnent leurs franges. Les captures montrent 13 px entre herbe sombre et herbe claire, 11 px entre herbe claire et terre.

&#91;image: Frontières herbe sombre, herbe claire et terre agrandies, avec la répartition des tons ligne par ligne\]

### Eau et berge

&#91;image: Angle de plan d'eau agrandi, avec ses cinq bandes légendées de la berge vers le large\]

- La berge fait partie de la tuile d'eau : elle mord de 4 à 9 px sur la case.
- La berge nord montre son dessus et sa face, soit 7 à 9 px. Les berges latérales et sud ne montrent que le dessus, soit 4 à 5 px.
- Les reflets sont des tirets horizontaux ; seule l'écume des berges latérales est verticale, en traits de 1 px sur 2.
- L'eau s'anime en 3 images jouées 0-1-2-1. D'une image à l'autre, 5 % des pixels d'eau changent : l'écume et les tirets.
- La planche fournit trois assemblages par rive : un îlot de 5 × 5 cases, une croix et un T.
- Les plantes d'eau sont des sprites indépendants, posés sur la tuile.

### Relief

Les planches ajoutent un relief absent des captures : falaise de deux cases de haut, escalier de bois, entrée de grotte. Ces tuiles montent à 17 couleurs et forment la classe « relief ».

### Remplissage et répétition

- Une tuile de remplissage se raccorde à elle-même sur ses quatre côtés. L'herbe unie est un aplat d'une seule couleur.
- Les pavés existent en trois variantes, qui diffèrent par 20 à 28 % de leurs pixels.
- Deux variantes décorées identiques ne se touchent jamais.
- Le micro-décor reste clairsemé : environ un élément pour 8 à 12 cases d'herbe libre, d'après un comptage visuel des captures.

## Objets, végétation et bâtiments

Chaque famille a son gabarit, son régime de contour et quelques règles propres, mesurées sur les planches.

### Micro-décor, gabarit 16 × 16

- **Touffe.** Trois brins en V, 14 × 8 px au plus, tons V4 et V5, sans ombre.
- **Fleur.** Trois à cinq pétales de 2 × 2 px en A2 et A3, ou en A4 ; tige V6 ; 11 × 12 px au plus.
- **Champignon.** 10 × 13 à 14 × 11 px, 7 à 11 couleurs, ombre de contact S0.
- **Caillou.** 13 × 8 px, tons R1 à R3, bord d'ombre N2.
- Le micro-décor n'a pas de collision.

### Cultures, gabarit 16 × 16 ou 16 × 32

- La planche compte 16 espèces. Chacune a ses graines semées, 3 ou 4 stades de croissance, sa récolte et son sachet.
- Les plants suivent un pas de 16 px. Le pied est centré et posé sur les rangées 9 à 12 de la case.
- Tailles relevées : pousse 7 × 6, jeune plant 9 × 10, plant mûr 14 × 16, plant haut jusqu'à 13 × 26.
- Un plant haut déborde sur la case du dessus.
- Un stade compte 3 à 9 couleurs, 13 avec ses fruits. Les feuilles sont en K1, K2 et G0 ; le fruit porte la couleur vive.
- L'ombre de contact S2 couvre 5 à 20 px sous le pied.

### Icônes d'inventaire, gabarit 16 × 16

- **Poisson.** Il occupe toute la case, en diagonale, tête en haut à gauche. 7 à 12 couleurs.
- **Détails du poisson.** Contour continu du ton sombre de sa teinte, œil en K0, quelques pixels irisés roses ou violets sur les écailles.
- **Sachet de graines.** 14 × 16 px, toile en L3, vignette du légume cerclée de F4. 10 à 15 couleurs.
- **Récolte.** 9 × 11 à 14 × 16 px, 8 à 10 couleurs.
- Une icône n'a ni ombre de contact ni marge.

### Objets, gabarit 16 × 16 à 32 × 32

- Caisses, barils, seaux, coffres, panneaux et clôtures relèvent du construit : contour continu.
- Le dessus est visible et occupe environ un cinquième de la hauteur, comme le couvercle du baril.
- Le coffre mesure 16 × 13 px. Il existe en trois teintes et en trois images d'ouverture ; ses ferrures claires interrompent le contour sombre.
- La clôture a un piquet de 3 px tous les 8 px, pour 14 px de haut.
- L'épouvantail et la statue sont cernés du ton sombre de leur matière : ocre pour la paille, gris-beige pour la pierre.

### Arbres et buissons

- **Quatre espèces.** Chacune a quatre stades de croissance, un état en fleurs, un état en fruits, un état nu, une souche et une bûche.
- **Stades.** 16 × 20, 34 × 36, 48 × 54 puis 74 × 69 px pour l'espèce la plus large.
- **Couleurs.** 9 à 10 pour l'arbre feuillu ; les fleurs en ajoutent 3, les fruits 5 à 8.
- **Volume.** Le houppier occupe les deux tiers de la hauteur. Le tronc fait 6 à 8 px de large et ses fourches se voient dans le feuillage.
- **Contour.** Il varie selon l'espèce : 45 à 96 % du bord d'ombre, 11 à 73 % du bord éclairé.
- **Buisson, 32 × 26.** Pas de tronc. Trois ou quatre amas, les plus clairs en haut à gauche.
- L'indigo A0 se place dans la moitié basse et droite du houppier.
- Arbres et buissons n'ont pas d'ombre de contact.

### Bâtiments, gabarit 96 × 96 à 112 × 112

- Le bâtiment s'assemble par modules de 16 px : terrasse, façade, toit.
- Le toit occupe près de la moitié de la hauteur, avec une pente de 2 pour 1 et un faîtage en bois.
- Deux toitures existent : prune N2 pour les maisons, bardeaux bruns pour la grange et la boutique.
- La façade associe enduit P4 et colombage W3. La porte mesure environ 12 × 16 px, les fenêtres 8 × 8 px.
- Un bâtiment compte 13 couleurs (grange, moulin, serre) à 28 (maison).
- La maison et le moulin existent avec et sans plantes grimpantes : 5 % des pixels changent.
- La porte tombe sur l'axe d'une case, et le chemin de pavés part de son milieu.

## Interface et animation

Les planches montrent des icônes d'inventaire et deux animations. Les panneaux, les boutons et la police restent non observés : ce qui les concerne est une proposition à valider.

### Interface

| Élément | Statut | Règle |
| --- | --- | --- |
| Icônes | Observé | 16 × 16 px, contour coloré continu, sans ombre ni marge |
| Panneaux | Proposé | Neuf pièces de 8 px : quatre coins, quatre bords, un centre |
| Matière des panneaux | Proposé | Fond P4, cadre en bois W2 et W3, contour W0 de 1 px, coins en escalier de 2 px |
| Texte | Proposé | S1 sur fond clair, A3 sur fond sombre ; police à choisir |
| Bouton survolé | Proposé | Le cadre monte d'un cran, en W4 |
| Bouton enfoncé | Proposé | Le contenu descend de 1 px et le reflet haut disparaît |
| Bouton désactivé | Proposé | Passage sur la rampe roche, R1 à R3 |

### Animation

| Élément | Statut | Images | Mouvement |
| --- | --- | --- | --- |
| Eau | Observé | 3, jouées 0-1-2-1 | 5 % des pixels d'eau changent : écume et tirets |
| Coffre | Observé | 3 | Fermé, entrouvert, ouvert |
| Feuillage | Proposé | 2 à 3 | Les amas clairs se décalent de 1 px |
| Fleurs et cultures | Proposé | 2 | La tête se décale de 1 px |
| Particules | Proposé | 4 à 8 | Pixels isolés en A3 ou A4 |

La croissance d'un arbre ou d'une culture n'est pas une animation : chaque stade est un sprite distinct.

Un mouvement déplace des amas de 1 à 2 px. Il ne déforme ni n'étire jamais la silhouette. La cadence reste inconnue : les planches donnent le nombre d'images, pas leur durée.

## Pipeline de production

Le pipeline compte six étapes, et le contrôle automatique en est le verrou : un sprite rejeté repart en génération avec son rapport.

&#91;embedded content: pipeline de production · 6 étapes, 2 boucles de retour\]

La revue visuelle ne reçoit que des sprites déjà conformes. Elle juge ce qu'un script ne voit pas : la lisibilité et le charme.

### Fiche de commande

Chaque sprite naît d'une fiche. Elle fixe tout ce que le générateur n'a pas le droit de choisir.

| Champ | Exemple | Rôle |
| --- | --- | --- |
| Identifiant | `objet_construit_caisse_16x16` | Nom du fichier et clé dans l'atlas |
| Classe | `objet` | Fixe le budget de couleurs |
| Famille | `construit` | Fixe le régime de contour |
| Gabarit | 16 × 16 | Taille du canevas |
| Rampes | Bois, berge et bois clair | Couleurs autorisées |
| Accent | Aucun | Un seul identifiant de la rampe d'accents |
| Emprise | 1 × 1 | Cases bloquées au sol |
| Variantes | 2 | Nombre de déclinaisons attendues |

### Normalisation

1. Recadrer sur le gabarit et placer le pied au centre du bord bas.
2. Seuiller l'alpha à 50 % : chaque pixel devient opaque ou transparent.
3. Ramener chaque pixel à la couleur la plus proche parmi les rampes de la fiche.
4. Rejeter le sprite si plus de 5 % de ses pixels ont bougé de plus de 24 en distance RGB. Ce seuil est une valeur de départ.
5. Ajouter l'ombre de contact sous le pied : S0 pour un objet, S2 pour une culture, aucune pour un arbre ou un bâtiment.
6. Enregistrer en PNG RGBA : l'ombre translucide interdit le PNG indexé à transparence binaire.

### Ce qui est fixe, ce qui peut varier

| Toujours fixe | Libre d'un sprite à l'autre |
| --- | --- |
| Palette et rampes | Sujet et silhouette |
| Direction de la lumière | Position des amas de texture |
| Contour selon la famille | Choix de l'accent |
| Grille, gabarits et pivot | Densité des petits détails |
| Proportions ombre, base, lumière | Nombre et forme des variantes |
| Largeur et recette des transitions | Emplacement du micro-décor |

### Nommage et métadonnées

Le nom suit le schéma `<classe>_<famille>_<nom>_<L>x<H>[_vN].png`. Les classes sont `tuile`, `relief`, `micro`, `culture`, `icone`, `animal`, `objet`, `arbre` et `batiment`. Les familles sont `construit`, `organique`, `feuillage`, `terrain`, `transition` et `verre`.

Chaque sprite s'accompagne d'une entrée de métadonnées : pivot, emprise, couche et rampes utilisées.

### Lots et ordre de production

Les documents sources prévoyaient 100 sprites d'environnement, 100 objets et 50 éléments d'interface. Les planches donnent un inventaire plus précis, à produire dans cet ordre.

| Lot | Contenu, d'après les planches | Nombre |
| --- | --- | --- |
| 1 · Sols | 7 sols de 17 tuiles | 119 |
| 2 · Eau et relief | Rives en 3 images, falaises, escaliers | À chiffrer |
| 3 · Arbres | 4 espèces à 7 états, plus souche et bûche | 36 |
| 4 · Cultures | 16 espèces : graines, 3 ou 4 stades, récolte, sachet | 110 environ |
| 5 · Objets et décor | Mobilier, clôtures, coffres, rochers, champignons | À chiffrer |
| 6 · Bâtiments | 2 maisons, 1 grange, 1 moulin, 1 serre ; une maison et le moulin en 2 variantes | 7 |
| 7 · Poissons | Icônes de 16 × 16 | 7 |
| 8 · Interface | Panneaux, boutons, onglets, jauges, curseurs | 50, non observé |

Les sols passent en premier : tout le reste se juge posé dessus.

## Génération et matriçage

La génération tient en trois commandes, l'assemblage pour Tiled en une quatrième. Les fiches deviennent des prompts, Nano Banana produit les images, puis `matricer.py` les ramène au gabarit, à la palette et aux règles du guide.

```
python prompts.py fiches.csv prompts/
# générer les images dans brut/, à la main ou avec : --generer brut/
python matricer.py fiches.csv brut/ sprites/
```

### Ce que contient un prompt

Chaque prompt est assemblé à partir de la fiche et du guide. Il est rédigé en anglais.

| Phrase | Ce qu'elle impose | Source |
| --- | --- | --- |
| Sujet | L'objet à dessiner | Colonne `sujet` de la fiche |
| Cadrage | Un seul objet, centré, sur 70 % de l'image ; vue de face avec le dessus visible | Section Fondations |
| Gros pixels | « L'objet ne fait que N pixels de large », grille régulière | Gabarit de la fiche |
| Aplats | Amas à bords nets, ni dégradé ni lissage | Section Construction |
| Palette | Nombre maximal de couleurs et teintes clés des rampes | Budget de la classe, colonne `matieres` |
| Lumière | Haut-gauche ; ombres prune ou pétrole, jamais noires | Section Lumière |
| Contour | Continu, côté ombre ou absent | Famille de la fiche |
| Exclusions | Ni ombre portée, ni sol, ni texte, ni autre objet | Section Interdits |
| Fond | Aplat noir, ou magenta avec `--fond magenta` | Besoin du détourage |

### Ce que fait matricer.py

| Étape | Traitement |
| --- | --- |
| 1 · Conversion | JPG, PNG ou WebP vers RGBA |
| 2 · Détourage | Le fond est la couleur médiane du cadre. Seules les zones de cette couleur reliées au bord sont retirées : un détail sombre à l'intérieur de l'objet est épargné |
| 3 · Grille | Mesure du pas et de la position des faux pixels, puis de leur netteté |
| 4 · Réduction | Grille détectée si l'objet tient dans le gabarit ; sinon grille imposée. Chaque cellule prend la couleur dominante de son cœur |
| 5 · Couleurs | Recalage global de clarté et de saturation, puis projection sur les rampes de la fiche |
| 6 · Budget | Les couleurs les plus rares sont fondues dans leurs voisines |
| 7 · Nettoyage | Miettes détachées retirées, pixels isolés ramenés sous le plafond |
| 8 · Lumière et contour | Miroir si la lumière vient de droite. Contour ajouté ou ouvert, seulement quand le sprite échouerait au contrôle |
| 9 · Ombre et ancrage | Ombre S0 ou S2 selon la classe, pied au centre du bord bas, cultures sur les rangées 9 à 12 |
| 10 · Contrôle | Passage par `qa_sprites.py`, `rapport.csv` et planche de revue sur quatre sols |

Chaque correction automatique est inscrite dans le rapport. Les bâtiments font exception à l'étape 8 : ils mêlent trop de matières, le contrôle juge seul.

### Essais

Aucune image réelle de Nano Banana n'a été traitée : les essais portent sur des images simulées. Les sprites des planches ont été agrandis d'un facteur non entier, floutés, bruités et compressés en JPEG sur fond noir, puis repassés dans le script.

| Essai | Résultat |
| --- | --- |
| 109 sprites dégradés, sans dérive de couleur | Forme retrouvée à 99,2 %, couleurs à 98,2 %, 109 conformes |
| Les mêmes, saturation +15 % et luminosité +5 % | Couleurs retrouvées à 89,8 % ; 62,0 % sans le recalage |
| Arbre de 64 px demandé en 48 × 48 | Grille imposée, conforme |
| Rocher éclairé par la droite | Miroir appliqué, conforme |
| Fond magenta, PNG déjà transparent, tuile de terre | Traités, conformes |
| Caisse sans contour, rocher cerné partout | Contour ajouté, bord éclairé ouvert, conformes |
| Sapin à 70 couleurs bruitées | Ramené à 18 couleurs, conforme |
| Illustration lisse, sans pixels | Convertie par grille imposée, conforme mais sans caractère |

### Limites connues

- **Réglages à caler.** Les trois constantes en tête de `matricer.py` (tolérance du fond, confiance et netteté de la grille) sont à ajuster sur le premier lot réel.
- **Appel à l'API.** L'option `--generer` est écrite d'après la documentation de Google et n'a pas été exécutée. Le reste fonctionne sans elle.
- **Fond noir.** Un objet très sombre peut être rogné là où il touche le fond. Pour un coffre sombre ou un objet de nuit, générer sur magenta.
- **Trous.** Le fond visible à travers une anse ou entre deux barreaux n'est pas retiré.
- **Tuiles.** Le script ne rend pas une texture raccordable : le test de raccord la rejette. Les blocs tache et trou ne sont pas générés.
- **Images lisses.** Une image sans faux pixels passe, mais le résultat est mou. Le prompt doit obtenir de gros pixels nets.

### Feuille de sprites pour Tiled

Une quatrième commande range les sprites conformes dans deux jeux de tuiles que Tiled ouvre directement.

```
python assembler.py sprites/ tiled/
```

| Fichier produit | Nature | Usage dans Tiled |
| --- | --- | --- |
| `tuiles.png` et `tuiles.tsx` | Feuille en grille de 16 px, 32 colonnes | Calques de tuiles : peindre les sols, tamponner un objet en sélectionnant toutes ses cases |
| `objets.tsx` et dossier `objets/` | Collection d'images, une par sprite | Calque d'objets : poser arbres, objets et bâtiments entiers, ancrés par le bas |
| `carte_vide.tmx` | Carte de 40 × 30 cases, trois calques de tuiles et un calque d'objets | Point de départ : elle référence déjà les deux jeux |
| `index.json` | Emplacement de chaque sprite | À conserver avec le dossier |

- **Emplacements stables.** Relancer la commande après un nouveau lot ajoute les sprites dans les cases libres. Ceux déjà placés ne bougent pas : les cartes déjà peintes restent justes.
- **Largeur figée.** Le nombre de colonnes est fixé à la première exécution. Le changer décalerait tous les numéros de tuiles.
- **Tri des rejets.** Un sprite refusé par le contrôle qualité est écarté, sauf avec `--tout`. Les icônes d'inventaire et les animaux sont laissés de côté, sauf avec `--avec-icones`.
- **Profondeur.** Le calque d'objets est réglé sur l'ordre « haut vers bas » : un objet plus bas à l'écran passe devant, comme le veut le guide.
- **Non vérifié dans Tiled.** Les fichiers suivent le format TMX et leur cohérence interne est contrôlée, mais ils n'ont pas été ouverts dans le logiciel.
- **Pas encore de pinceau de terrain.** Les blocs tache et trou n'étant pas générés, les transitions entre sols ne se peignent pas automatiquement.

## Contrôle qualité automatisé

Dix tests décident seuls du verdict. Leurs seuils sont calés sur les planches sources : le script accepte les 1 348 tuiles et sprites qui en sont tirés, et rejette dix variantes volontairement fautives.

| N° | Test | Seuil | Portée |
| --- | --- | --- | --- |
| 1 | Gabarit | Largeur et hauteur multiples de 16, conformes au nom du fichier | Tous |
| 2 | Alpha | 0 ou 255, sauf les deux ombres S0 et S2, à leur valeur exacte | Tous |
| 3 | Palette fermée | 100 % des pixels opaques parmi les 124 couleurs | Tous |
| 4 | Budget | 10, 18, 12, 14, 16, 10, 18 ou 32 couleurs selon la classe | Tous |
| 5 | Damier | Aucun damier de 4 × 4 ou plus | Tous |
| 6 | Raccord | Écart à la couture inférieur à 1,5 fois l'écart moyen entre colonnes voisines, plus 8 | Tuiles de remplissage |
| 7 | Ancrage | Une rangée vide au plus sous le sprite ; centré à 3 px près ; pied de culture 3 à 7 px au-dessus du bas | Hors tuiles et icônes |
| 8 | Lumière | Centre lumineux décalé vers le haut-gauche | Volumes organiques et feuillages compacts |
| 9 | Contour | Construit : 45 % du pourtour au moins dans les tons sombres. Organique : 60 % côté ombre. Feuillage : 40 % côté ombre. Bord éclairé toujours moins cerné que le bord d'ombre | Objets, arbres, bâtiments |
| 10 | Pixels isolés | 15 % au plus pour le construit, 30 % pour l'organique et le feuillage | Objets, arbres, bâtiments |

Les seuils des tests 8 à 10 viennent des valeurs extrêmes relevées sur les planches, avec une marge. Le test 6 garde un seuil de départ, à recaler sur vos propres tuiles.

### Vérification du script

| Lot soumis | Soumis | Acceptés |
| --- | --- | --- |
| Tuiles pleines de la planche | 1 239 | 1 239 |
| Dont tuiles de remplissage, soumises au test de raccord | 24 | 24 |
| Arbres, arbres nus et buissons | 33 | 33 |
| Objets construits et épouvantail | 9 | 9 |
| Rochers, souche et champignons | 6 | 6 |
| Bâtiments | 6 | 6 |
| Cultures | 32 | 32 |
| Poissons et sachets de graines | 23 | 23 |
| Sprites d'exemple du guide | 2 | 2 |
| Variantes fautives | 10 | 0 |

Deux limites à cette vérification. Les sprites des planches ont été projetés sur la palette avant le contrôle : le test 3 ne les départage pas. Les tuiles ont été rangées en « tuile » ou « relief » d'après leur nombre de couleurs : le test 4 non plus.

| Variante fautive | Motif du rejet |
| --- | --- |
| Caisse à contour noir pur | Hors palette `#000000` |
| Caisse à contour clair | Contour trop clair, 0 % du pourtour |
| Rocher retourné, lumière en bas à droite | Lumière mal orientée |
| Rocher agrandi en bilinéaire | Semi-transparence, 73 couleurs |
| Rocher cerné sur tout le pourtour | Bord éclairé aussi cerné que le bord d'ombre |
| Rocher à texture en bruit | 43 % de pixels isolés |
| Rocher à ombre noire à 50 % | Semi-transparence hors S0 et S2 |
| Caisse en 17 × 16 | Gabarit non multiple de 16 |
| Tuile avec une colonne étrangère | Couture visible au raccord |
| Tuile à damier de 6 × 6 | Damier de 4 × 4 ou plus |

### Revue visuelle

Un sprite conforme passe ensuite cinq examens à l'œil.

- **Silhouette.** Rempli d'une seule couleur, l'objet reste reconnaissable.
- **Taille réelle.** Il se lit en 1×, sans agrandissement.
- **Tous les sols.** Il se détache sur les quatre herbes, le sable, la terre et les pavés.
- **Voisinage.** Posé entre trois sprites déjà validés, il ne paraît ni plus net ni plus saturé.
- **Niveaux de gris.** La matière se reconnaît encore sans la couleur.

### Script

Usage : `python qa_sprites.py palette_pastorale.hex sprites/*.png`. Le fichier de palette contient une valeur hexadécimale par ligne.

```python
#!/usr/bin/env python3
"""Contrôle qualité des sprites — style pastoral 16x16, seuils calés sur les planches sources.
Usage : python qa_sprites.py palette_pastorale.hex sprite1.png [sprite2.png ...]
Nom de fichier attendu : <classe>_<famille>_<nom>_<L>x<H>[_vN].png
  classe  : tuile | relief | micro | culture | icone | animal | objet | arbre | batiment
  famille : construit | organique | feuillage | terrain | transition | verre
Code de sortie : 0 si tous les sprites passent, 1 sinon."""
import re, sys
import numpy as np
from PIL import Image

BUDGET = {"tuile": 10, "relief": 18, "micro": 12, "culture": 14, "icone": 16, "animal": 16, "objet": 10, "arbre": 18, "batiment": 32}
OMBRES = {(44, 15, 40, 105), (90, 43, 30, 131)}        # S0 prune à 41 %, S2 brun à 51 % : seuls pixels semi-transparents admis
VOLUME = ("objet", "arbre", "batiment")                # classes soumises aux tests de lumière, de contour et de pixels isolés
NOM = re.compile(r"^(tuile|relief|micro|culture|icone|animal|objet|arbre|batiment)_(construit|organique|feuillage|terrain|transition|verre)_[a-z0-9-]+_(\d+)x(\d+)(_v\d+)?\.png$")

def lire_palette(chemin):
    return {tuple(int(l[i:i + 2], 16) for i in (0, 2, 4)) for l in open(chemin).read().split() if l}

def controler(chemin, palette):
    erreurs, nom = [], chemin.replace("\\", "/").split("/")[-1]
    m = NOM.match(nom)
    if not m:
        return ["nom de fichier non conforme"]
    classe, famille, L, H = m.group(1), m.group(2), int(m.group(3)), int(m.group(4))
    px = np.asarray(Image.open(chemin).convert("RGBA")).astype(int)
    h, w = px.shape[:2]
    rgb, alpha = px[..., :3], px[..., 3]
    opaque = alpha == 255
    # 1. Gabarit
    if (w, h) != (L, H): erreurs.append(f"taille {w}x{h} différente du nom {L}x{H}")
    if w % 16 or h % 16: erreurs.append("gabarit non multiple de 16")
    # 2. Alpha binaire, sauf les deux ombres de contact
    semi = (alpha > 0) & (alpha < 255)
    if any(tuple(p) not in OMBRES for p in np.unique(px[semi], axis=0)): erreurs.append("pixels semi-transparents hors ombres S0 et S2")
    # 3. Palette fermée
    couleurs = {tuple(c) for c in np.unique(rgb[opaque], axis=0)}
    hors = couleurs - palette
    if hors: erreurs.append("hors palette : " + ", ".join("#%02X%02X%02X" % c for c in sorted(hors)[:5]))
    # 4. Budget de couleurs
    if len(couleurs) > BUDGET[classe]: erreurs.append(f"{len(couleurs)} couleurs, budget {BUDGET[classe]} pour la classe {classe}")
    # 5. Damier : toléré jusqu'à 3x3, interdit à partir de 4x4
    idx = np.where(opaque, rgb[..., 0] * 65536 + rgb[..., 1] * 256 + rgb[..., 2], -1)
    a, b, c, d = idx[:-1, :-1], idx[:-1, 1:], idx[1:, :-1], idx[1:, 1:]
    dam = (a == d) & (b == c) & (a != b) & (a >= 0) & (b >= 0)
    if h >= 4 and w >= 4 and np.logical_and.reduce([dam[i:h - 3 + i, j:w - 3 + j] for i in range(3) for j in range(3)]).any(): erreurs.append("damier de 4x4 ou plus")
    # 6. Raccord des tuiles de remplissage : la couture ne tranche pas plus que l'intérieur
    if famille == "terrain" and opaque.all():
        dx = np.abs(np.diff(rgb, axis=1)).sum(axis=2).mean(); dy = np.abs(np.diff(rgb, axis=0)).sum(axis=2).mean()
        cx = np.abs(rgb[:, 0] - rgb[:, -1]).sum(axis=1).mean(); cy = np.abs(rgb[0] - rgb[-1]).sum(axis=1).mean()
        if cx > 1.5 * dx + 8 or cy > 1.5 * dy + 8: erreurs.append("couture visible au raccord")
    if classe in ("tuile", "relief") or not opaque.any():
        return erreurs
    ys, xs = np.nonzero(opaque)
    # 7. Ancrage
    vide = h - 1 - np.nonzero(alpha > 0)[0].max()
    if classe == "culture":
        if not 3 <= h - 1 - ys.max() <= 7: erreurs.append("pied de culture hors des rangées 9 à 12 de la case")
    elif classe != "icone":
        if vide > 1: erreurs.append("plus d'une rangée vide sous le sprite")
        if classe in VOLUME and abs((xs.min() + xs.max()) / 2 - (w - 1) / 2) > 3: erreurs.append("sprite décentré de plus de 3 px")
    if classe not in VOLUME:
        return erreurs
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    # 8. Lumière en haut à gauche, sur les volumes compacts d'une seule matière
    compacite = opaque.sum() / ((xs.max() - xs.min() + 1) * (ys.max() - ys.min() + 1))
    if famille in ("organique", "feuillage") and compacite >= 0.4:
        poids = lum[opaque] - lum[opaque].min()
        if poids.sum() > 0:
            dxy = (xs * poids).sum() / poids.sum() - xs.mean() + (ys * poids).sum() / poids.sum() - ys.mean()
            if dxy > 0: erreurs.append(f"lumière mal orientée (décalage {dxy:+.2f} px sur l'axe haut-gauche)")
    # 9. Contour : part du pourtour prise dans les 30 % les plus sombres du sprite
    p = np.pad(opaque, 1); bord = opaque & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])
    sombre = lum <= np.percentile(lum[opaque], 30)
    yy, xx = np.nonzero(bord); eclaire = (xx - xs.mean()) + (yy - ys.mean()) < 0
    tout, cote_lum, cote_ombre = sombre[bord].mean(), sombre[bord][eclaire].mean(), sombre[bord][~eclaire].mean()
    if famille == "construit" and tout < 0.45: erreurs.append(f"contour trop clair ({tout:.0%} du pourtour)")
    if famille in ("organique", "feuillage"):
        seuil = 0.60 if famille == "organique" else 0.40
        if cote_ombre < seuil: erreurs.append(f"bord d'ombre insuffisant ({cote_ombre:.0%})")
        if cote_lum >= cote_ombre: erreurs.append("bord éclairé aussi cerné que le bord d'ombre")
    # 10. Pixels isolés
    pad = np.pad(idx, 1, constant_values=-2)
    seul = (pad[1:-1, 1:-1] != pad[:-2, 1:-1]) & (pad[1:-1, 1:-1] != pad[2:, 1:-1]) & (pad[1:-1, 1:-1] != pad[1:-1, :-2]) & (pad[1:-1, 1:-1] != pad[1:-1, 2:])
    part, plafond = seul[opaque].mean(), 0.15 if famille in ("construit", "verre") else 0.30
    if part > plafond: erreurs.append(f"{part:.0%} de pixels isolés (plafond {plafond:.0%})")
    return erreurs

if __name__ == "__main__":
    if len(sys.argv) < 3: sys.exit(__doc__)
    palette, echecs = lire_palette(sys.argv[1]), 0
    for chemin in sys.argv[2:]:
        erreurs = controler(chemin, palette)
        echecs += bool(erreurs)
        print(("REJET  " if erreurs else "OK     ") + chemin + "".join("\n         - " + e for e in erreurs))
    sys.exit(1 if echecs else 0)
```

## Spécification machine

Ce fichier est la forme exécutable du guide, à fournir au générateur. Il est valide en JSON et remplace les deux blocs de paramètres des documents sources. Ses valeurs viennent des planches PNG ; le bloc `controle` reprend les seuils du script.

```json
{
  "style": {"nom": "pastoral_16", "vue": "dessus_trois_quarts", "source": "planches_png_d_origine"},
  "grille": {"case_px": 16, "echelle_source": 1, "agrandissement": "entier_plus_proche_voisin", "pivot": "bas_centre",
             "alpha": "binaire_sauf_ombres_de_contact"},
  "palette": {
    "taille": 124,
    "rampes": {
      "vegetal": {"V0": "#02303A", "V1": "#0B4A4F", "V2": "#125241", "V3": "#226151", "V4": "#2A6D52", "V5": "#307850", "V6": "#3F804E", "V7": "#61803E", "V8": "#699654", "V9": "#79A059", "V10": "#90A962", "V11": "#9BAC74"},
      "eau": {"E0": "#156682", "E1": "#29809F", "E2": "#5B9DAE", "E3": "#84B8C5", "E4": "#B5C9CC"},
      "terre": {"T0": "#7E5E3F", "T1": "#966F49", "T2": "#A27F56", "T3": "#AE8D62"},
      "pave": {"P0": "#966D54", "P1": "#A58666", "P2": "#B29F7C", "P3": "#B8AB8F", "P4": "#C1B7A2"},
      "bois": {"W0": "#42141B", "W1": "#523228", "W2": "#603F31", "W3": "#6C4E3A", "W4": "#836B4F"},
      "beige": {"B0": "#38201B", "B1": "#8B775C", "B2": "#9C8E79"},
      "prune": {"N0": "#3C1123", "N1": "#48172A", "N2": "#4A2433", "N3": "#5A2C37"},
      "roche": {"R0": "#5F405E", "R1": "#66584D", "R2": "#80817F", "R3": "#9E9C9A"},
      "enduit": {"C0": "#AE9C89", "C1": "#C8C5C1"},
      "verre": {"G0": "#18654B", "G1": "#429186", "G2": "#7BAC9F", "G3": "#9EBCB6"},
      "accent": {"A0": "#2A3979", "A1": "#7686CC", "A2": "#B6B1D2", "A3": "#D6D6E1", "A4": "#DAC381", "A5": "#C6C079", "A6": "#B58B4B", "A7": "#701515", "A8": "#973049", "A9": "#3D94B4"},
      "service": {"S1": "#1B1517"},
      "vifs": {"K0": "#071609", "K1": "#1C764B", "K2": "#338B44", "K3": "#849264", "K4": "#569A37", "K5": "#A2B16C"},
      "sable": {"D0": "#CBAE78", "D1": "#D6C496"},
      "labour": {"L0": "#49403C", "L1": "#6F5641", "L2": "#7C5738", "L3": "#7E4F2C", "L4": "#C49660"},
      "ocre": {"O0": "#903617", "O1": "#935826", "O2": "#A4401B", "O3": "#A8602F", "O4": "#B47136", "O5": "#CE8544", "O6": "#D0A34B", "O7": "#E3B653"},
      "rouge": {"M0": "#5C0D0D", "M1": "#6C1531", "M2": "#6C2A50", "M3": "#772933", "M4": "#8F1D1D", "M5": "#903970", "M6": "#91666F", "M7": "#96185C", "M8": "#A34662", "M9": "#A9698A", "M10": "#AB5870", "M11": "#BF6285"},
      "violet": {"I0": "#480B39", "I1": "#3B296E", "I2": "#751770", "I3": "#796196", "I4": "#A0829E", "I5": "#9E65A7", "I6": "#7364BA", "I7": "#C59FC0", "I8": "#B596D6"},
      "bleu": {"U0": "#080E33", "U1": "#13285B", "U2": "#2C3B5F", "U3": "#2A4E75", "U4": "#60647B", "U5": "#495A82", "U6": "#495EA6", "U7": "#3C36B1", "U8": "#5381B1", "U9": "#79A0BB", "U10": "#5679CC", "U11": "#7997CE", "U12": "#979CD6", "U13": "#9FC1E3"},
      "sarcelle": {"Q0": "#24686A", "Q1": "#466F69", "Q2": "#5B827C", "Q3": "#75918F"},
      "pale": {"F0": "#393138", "F1": "#AB90A0", "F2": "#9CA7B6", "F3": "#BC9FA3", "F4": "#D5CEC7"}
    },
    "ombres_translucides": {"S0": {"rgba": [44, 15, 40, 105], "usage": "objets poses sur le sol"}, "S2": {"rgba": [90, 43, 30, 131], "usage": "cultures et gerbes sur la terre"}},
    "sols": {"herbe_sombre": "V3", "herbe_moyenne": "V6", "herbe_claire": "V8", "herbe_jaune": "K5", "sable": "D1", "terre": "T3", "labour": "T0", "eau": "E2"},
    "sombre_chaud": ["N0", "N1", "N2", "W0"], "sombre_froid": ["V0", "V1"],
    "limites": {"valeur_max": 0.89, "noir_pur": false, "blanc_pur": false, "saturation_mediane": {"monde": 0.44, "cultures": 0.63, "poissons": 0.56}}
  },
  "budget_couleurs": {"tuile": 10, "relief": 18, "micro": 12, "culture": 14, "icone": 16, "animal": 16, "objet": 10, "arbre": 18, "batiment": 32},
  "gabarits_px": {"tuile": [16, 16], "micro": [16, 16], "icone": [16, 16], "animal": [[16, 16], [32, 32]], "culture": [[16, 16], [16, 32]], "objet": [[16, 16], [32, 16], [32, 32]],
                  "arbre_par_stade": [[32, 32], [48, 48], [64, 64], [80, 80]], "batiment": [[96, 96], [112, 96], [112, 112], [96, 128]]},
  "lumiere": {"direction": "haut_gauche", "niveaux": [3, 5], "ombres": "dures", "ombre_portee_longue": false,
              "parts": {"lumieres": [0.30, 0.40], "base": [0.25, 0.30], "ombres": [0.30, 0.40]}},
  "ombre_de_contact": {"forme": "bande de 1 a 2 px sous le pied", "objets": "S0", "cultures": "S2", "arbres_et_batiments": "aucune"},
  "contour": {
    "construit": {"mode": "continu", "epaisseur_px": 1, "couleur": "ton le plus sombre du materiau", "exemples": {"bois": "W0", "toit": "N0", "serre": "V1"}},
    "organique": {"mode": "cote_ombre", "epaisseur_px": 1, "couleurs": ["N2"]},
    "feuillage": {"mode": "cote_ombre_dominant", "bord_eclaire": "moins cerne que le bord d_ombre", "creux": ["V0", "V1", "A0"]},
    "icone": {"mode": "continu", "couleur": "ton le plus sombre de la teinte de l_objet"},
    "terrain": {"mode": "aucun"}
  },
  "texture": {"amas_px": [2, 12], "damier_max": "3x3", "lissage": false,
              "pixels_isoles_max": {"construit": 0.15, "organique": 0.30, "feuillage": 0.30}},
  "terrain": {
    "sols": ["herbe_sombre", "herbe_moyenne", "herbe_claire", "herbe_jaune", "sable", "terre", "labour"],
    "jeu_par_sol": {"tache_3x3": 9, "trou_3x3": 8, "pose": "surimpression_alpha_binaire"},
    "tuile_de_bord": {"vide_px": 4, "bande_px": 9, "plein_px": 3, "brin_largeur_px": [1, 2], "brin_hauteur_px": [1, 3]},
    "relief": ["berge", "falaise", "escalier", "grotte"],
    "remplissage": {"raccord": true, "variantes_paves": 3}
  },
  "eau": {"bandes": ["dessus_berge", "face_berge", "ecume", "eau_profonde", "eau_base"], "berge_nord_px": [7, 9], "berge_laterale_px": [4, 5],
          "eau_profonde_px": [6, 8], "tiret_px": [2, 5], "animation": {"images": 3, "cycle": [0, 1, 2, 1], "part_des_pixels_d_eau_qui_changent": 0.05}},
  "cultures": {"pas_px": 16, "stades": [3, 4], "pied_rangee": [9, 12], "ombre": "S2", "extras": ["graines", "recolte", "sachet"]},
  "arbres": {"stades_de_croissance": 4, "etats": ["feuillu", "en_fleurs", "en_fruits", "nu", "souche"]},
  "animation_observee": {"eau": "3 images, cycle 0-1-2-1", "coffre": "3 images : ferme, entrouvert, ouvert"},
  "transformations": {"permises": ["decalage_pixel", "miroir_horizontal_tuiles_plates"], "interdites": ["rotation_libre", "echelle_non_entiere", "interpolation"]},
  "interdits": ["noir_pur", "blanc_pur", "degrade_continu", "flou", "lissage", "damier_4x4_ou_plus", "bruit_pixel", "pixels_melanges", "contour_2px",
                "lumiere_multiple", "couleur_hors_palette", "ombre_portee_longue", "semi_transparence_hors_ombres"],
  "controle": {"contour_construit_min": 0.45, "bord_ombre_organique_min": 0.60, "bord_ombre_feuillage_min": 0.40, "bord_eclaire": "inferieur_au_bord_d_ombre",
               "pixels_isoles_construit_max": 0.15, "pixels_isoles_organique_max": 0.30, "decalage_lumiere_max_px": 0, "compacite_min_test_lumiere": 0.4,
               "raccord_facteur": 1.5, "raccord_marge": 8, "pied_culture_px_du_bas": [3, 7]},
  "non_observe": ["panneaux_d_interface", "typographie", "personnages", "animaux_terrestres", "metal_poli", "feu", "glace", "cristal"]
}
```

## Interdits et points à valider

Douze interdits résument le style par la négative. Les planches sources ont levé cinq des questions ouvertes ; sept restent à trancher.

### Interdits

1. Noir pur ou blanc pur.
2. Couleur hors palette, y compris les teintes nées d'un redimensionnement.
3. Dégradé continu, flou ou lueur.
4. Lissage d'un escalier par un ton intermédiaire.
5. Damier de 4 × 4 ou plus.
6. Bruit pixel par pixel en guise de texture.
7. Contour de 2 px, ou contour de même couleur sur toutes les matières.
8. Feuillage dont le bord éclairé est aussi cerné que le bord d'ombre.
9. Seconde source de lumière, ou miroir horizontal d'un sprite ombré.
10. Pixels de tailles différentes, rotation libre ou échelle non entière.
11. Ombre portée longue, ou semi-transparence ailleurs que dans l'ombre de contact.
12. Couleur vive des rampes d'extension sur un sol ou un bâtiment.

Les captures fournissent un langage, pas des modèles : aucun sprite n'en est recopié.

### À valider

- [ ] Licence des planches : vérifier ce qu'elle autorise avant de s'en servir comme référence de production ou d'en redistribuer des extraits.
- [ ] Résolution interne du jeu et facteur d'agrandissement à l'écran.
- [ ] Règle d'assemblage des blocs tache et trou attendue par le moteur.
- [ ] Cadence des animations : seul le nombre d'images est connu.
- [ ] Panneaux d'interface, police et états des boutons.
- [ ] Personnages et animaux terrestres : proportions, contour et teintes de peau, sans aucune référence à ce jour.
- [ ] Matières absentes : métal poli, feu, glace, cristal.
- [x] Palette source exacte : relevée sur les planches PNG.
- [x] Rouge des fruits et jaune des fleurs : rampes d'ocres et de rouges ajoutées.
- [x] Structure du jeu de tuiles : deux blocs de 3 × 3 par sol.
- [x] Ombre de contact sur tous les sols : translucide, donc unique.
- [x] Animation de l'eau : 3 images jouées 0-1-2-1.

### Fichiers d'accompagnement

| Fichier | Contenu |
| --- | --- |
| `palette_pastorale.gpl` | Palette de 124 couleurs pour Aseprite, GIMP et Krita |
| `palette_pastorale.hex` | La même palette, une valeur par ligne, lue par les scripts |
| `style_pastoral.json` | Spécification machine de ce guide |
| `qa_sprites.py` | Script de contrôle, identique à celui de la section Contrôle qualité |
| `prompts.py` | Fiches de commande vers prompts Nano Banana ; appel à l'API en option |
| `matricer.py` | Image générée vers sprite conforme, avec rapport et planche de revue |
| `assembler.py` | Sprites conformes vers jeux de tuiles et carte de départ pour Tiled |
| `fiches_exemple.csv` | Onze fiches de commande prêtes à adapter |
| `objet_construit_caisse_16x16.png` | Sprite d'exemple conforme, famille construit |
| `objet_organique_rocher_16x16.png` | Sprite d'exemple conforme, famille organique |

La palette, la spécification, le script de contrôle et les deux exemples remplacent ceux de la première version : la palette, les seuils et l'ombre des exemples ont changé.
