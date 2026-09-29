# Ferme Familiale — Idle Game d'autonomie alimentaire
## Document de conception v15 : 3 structures organisationnelles & stratégie de développement web

> **v25** : **chiffres entiers partout** (données, état du jeu et affichage).
> Règles d'arrondi : un **coût** (prix, eau d'un arrosage, durée) est arrondi à
> l'entier **supérieur** (sauf l'eau d'un arrosage : au plus proche, 1 L
> minimum), un **stock** s'affiche arrondi vers le **bas**, un **gain** (récolte,
> énergie d'un plat) au plus **proche**. Changements :
> - **Pièces entières** : prix croissants (appareils, surface, emplacements,
>   soins), entretien, réparation et prix d'achat du Comptoir arrondis à
>   l'entier supérieur (panneau : 60, 72, 87, 104 ; carotte achetée 3 au lieu
>   de 2,4). Le **coefficient d'achat** est en % (plancher 120 %, graines 200 %,
>   ±10 points par unité).
> - **Coefficients en %** : saisons (110 %, 70 %…), productivité (100 / 80 /
>   50 / 25 %), plats (130 %, pain 160 %, luxe 300 %), arbre techno (80 %),
>   seuils de santé (75 %, 50 %), frigo (50 %), batterie pleine (98 %).
> - **Blé** : **1 blé nourrit 2 poules** (n poules → ⌈n ÷ 2⌉ blé ; une ration
>   entamée se perd à la fin de la nuit). Plus de demi-blé.
> - **Énergie en Wh** (état en mWh) : panneaux 30 / 50 / 80 / 120 / 180 Wh/s,
>   batteries 5 000 à 80 000 Wh, pompe 10 Wh/L, Moulin 20 Wh/s, Presse 30 Wh/s,
>   frigo 5 Wh/s + 50 mWh/s par unité. Objectif du chapitre 1 : 3 000 Wh.
> - **Eau** : état en mL, affichage en L entiers ; litres par arrosage entiers.
> - **Temps** : état en ms ; temps de préparation en secondes entières
>   (ragoût 23 s × 80 % = 19 s).
> - **Usure** : +1 point toutes les **2 heures** de marche (même rythme que
>   0,5 point/heure), rendement = 100 − ⌊usure ÷ 2⌋ %.
> - **Pâturage en ares** : 50 a au départ, 5 a par mouton, 15 a par vache.
>   **Poids en hg** (affiché en kg) : mouton 200 → 500 hg, +5 hg/nuit ; vache
>   400 → 1 500 hg, +10 hg/nuit ; portions = kg.
> - **Autonomie, santé moyenne, couverture** : % entiers, arrondis vers le bas.
> - Sauvegarde **v13** (`MIGRATIONS[12]`, `migrateToIntegers()`) ; version 0.13.0 ; arbre des technologies v2 : sauvegarde **v14** (`MIGRATIONS[13]`), version 0.14.0.
> Les tableaux de la section 8 sont mis à jour pour l'énergie et le parc ;
> ailleurs, lire 0,05 ha = 5 a, kWh = 1 000 Wh, ×1,2 = 120 %.
>
> **v24** : **le temps de préparation des plats du Four et de la Cuisine est
> divisé par 2, arrondi à l'entier supérieur** (pain 20 s → 10 s, omelette 15 s
> → 8 s, ragoût 45 s → 23 s, etc. ; voir les tableaux de recettes). Réglé à la
> source : `DATA.RECETTES.DIVISEUR_TEMPS` (2) et `STATIONS_TEMPS_DIVISE`
> (`four`, `cuisine`), appliqués une seule fois au chargement par
> `applyDishTimeDivisor()`. Le Moulin (5 s) et la Presse (10 s) ne changent
> pas. Les nœuds « Préparation rapide » de l'arbre techno (×0,8 puis ×0,64)
> s'appliquent ensuite sur ce nouveau temps de base, donc ils peuvent encore
> donner des durées décimales (ex. ragoût 23 s × 0,8 = 18,4 s). Aucune
> migration : une préparation en cours garde sa durée déjà enregistrée dans la
> sauvegarde.
>
> **v23** : **les articles rangés au réfrigérateur se vendent depuis le Comptoir
> (onglet Vendre)**. Avant, seul l'inventaire était vendable : il fallait sortir
> les articles du frigo un par un pour les vendre. `sellItem()` vend désormais
> l'inventaire **d'abord** (ce qui périt), puis le frigo (dont la conservation
> est figée) ; `sellableCount()` (inventaire + frigo) sert de stock vendable. La
> ligne de vente affiche « ❄️ dont N au frigo ». Les prix et le coefficient
> d'achat se comportent exactement comme pour une vente ordinaire. Aucune
> migration (la structure de `state.frigo` est inchangée).
>
> **v22** : **la farine et le pain se vendent aussi ×2** (farine 1 → 2, pain
> 4 → 8). La farine, transformation du blé, est ajoutée à la liste explicite
> `DATA.MARCHE.TRANSFORMATIONS_DOUBLEES`, traitée par la même fonction centrale
> `applyProductionPriceMultiplier()` que les productions de v21 (l'huile n'y
> figure pas : inchangée à 4). Le pain est un plat : avec la farine doublée, la
> formule normale (2 × 2 + 1 L d'eau) × 1,3 donnerait 7 ; pour qu'il vaille
> exactement le double (8), la recette `pain` porte `priceMultiplier: 1.6`
> (5 × 1,6), sur le mécanisme existant des recettes de luxe. Conséquence : les
> plats qui utilisent de la farine ou du pain augmentent aussi (tarte aux
> pommes 23 → 26, quiche aux épinards 26 → 29, tarte aux fraises 23 → 26, pain à
> l'ail 16 → 21). Aucune migration de sauvegarde (`STATE_VERSION` inchangé). 🟡
> Voir « Décisions ouvertes (v22) » en 8.9.
>
> **v21** : **les productions de la ferme se vendent ×2** au Comptoir (voir
> 8.9). Sont concernés les objets issus directement de la ferme : récoltes des
> cultures (carotte, patate, tomate, courgette, aubergine, oignon, ail,
> poivron, épinard, fraise, riz, houblon, cacao, vanille, café, blé), fruits du
> Verger (pomme, poire) et produits animaux (œuf, lait, laine, viande de
> mouton / bœuf / volaille). Le doublement est défini **à la source** : le
> coefficient `DATA.MARCHE.MULTIPLICATEUR_PRODUCTION` (2) est appliqué une
> seule fois, au chargement, par `applyProductionPriceMultiplier()` (juste
> après `DATA`, avant `registerDishItems()`), sur la liste déduite de
> `DATA.crops`, `DATA.VERGER.ARBRES` et `DATA.ANIMAUX`
> (`productionItemKeys()`) : une future culture, un futur arbre ou un futur
> animal est couvert automatiquement. **Ne sont pas doublés** : les graines
> (y compris `graine_tournesol`, récolte du tournesol), la conserve, la
> huile (transformation ; la farine est doublée depuis v22), les bâtiments, appareils, animaux,
> arbres, soins, améliorations et services, ni le coefficient d'achat du
> marché (le prix d'achat = nouveau prix de vente × coefficient, inchangé). Les
> **plats cuisinés** ne reçoivent pas de ×2 propre : leur prix suit la formule
> existante (somme des prix d'ingrédients × 1,3, ou ×3 pour le luxe) sur des
> ingrédients déjà doublés, donc **une seule fois** — ils n'augmentent pas
> exactement de ×2 (l'eau, la farine et l'huile ne bougent pas, et l'arrondi
> s'applique). Les prix ne sont pas enregistrés dans les sauvegardes : **aucune
> migration** n'est nécessaire (`STATE_VERSION` inchangé). 🟡 Voir « Décisions
> ouvertes (v21) » en 8.9.
>
> **v20** : **15 nouvelles recettes** (voir 1.4 et 8.9bis) : Soupe de légumes,
> Salade de tomates, Quiche aux épinards, Fromage frais, Riz au lait, Pain à
> l'ail (utilise le pain comme ingrédient), Poivrons farcis (viande de
> mouton), Tarte aux fraises, Confiture de fraises, Rôti de bœuf, Poulet rôti
> à l'ail, et **4 recettes de luxe** — Chocolat chaud, Café, Crème à la
> vanille, Bière artisanale — qui se vendent **×3 le prix de leurs
> ingrédients** au lieu du coefficient ×1,3 normal (champ optionnel
> `priceMultiplier` sur la recette, lu par `dishPrice()` ; l'énergie suit
> toujours le calcul normal). Aucun nouvel item de base : toutes les
> nouvelles recettes réutilisent des ingrédients déjà en jeu (légumes/fruits
> des 10 cultures de v18, viande_boeuf/viande_volaille/lait de v19, et les
> cultures de rente cacao/vanille/café/houblon). La **Bière artisanale ne
> périme pas** (comme le blé/la farine/la laine) ; le **Fromage frais** se
> conserve 8 nuits (mieux que le lait cru, 4 nuits) et la **Confiture de
> fraises** ne périme pas non plus — ces deux derniers chiffres sont des 🟡
> décisions de game design ouvertes, la demande d'origine ne les chiffrant
> pas. Pure addition de données (`DATA.recipes`) : **aucune migration de
> sauvegarde n'est nécessaire**, comme pour les 10 cultures de v18.
>
> **v19** : la **vache** rejoint le pâturage (achat au Comptoir, 200 💰) — elle occupe **0,15 ha** (3× un mouton), grossit de 1 kg/nuit (40 → 150 kg) et donne **1 lait par nuit dès l'achat**, sans délai de maturité ni condition autre que la place au pâturage (contrairement à la laine du mouton). Abattage sur le même modèle que le mouton (poids × 50 %), donnant un item distinct `viande_boeuf`. L'ancien item générique « viande » (mouton) est renommé **`viande_mouton`** pour laisser la place à `viande_boeuf` et à `viande_volaille`. Les **poules peuvent désormais être abattues** au clic (bouton dédié au Poulailler, avec confirmation) : rendement fixe et volontairement modeste (3 portions de `viande_volaille`), la poule abattue quitte le cheptel (ne pond plus, ne mange plus de blé), sa place se libère mais n'est pas rachetée automatiquement. Voir 1.4, 8.5 et 8.6 pour le détail chiffré et la logique d'équilibrage.
>
> **v18** : **10 nouvelles cultures** — Potager (oignon, ail, poivron, épinard, fraise), Champ (riz, houblon), et 3 **cultures de rente exclusives à la Serre** (cacao, vanille, café : jamais comestibles, vente et recettes de luxe uniquement). Le poivron reprend le mécanisme Potager + Serre de la tomate/courgette/aubergine. Voir 1.4 (« Cultures de rente ») et 8.3 (tableau chiffré complet). 🟡 Le riz demande 4 L par arrosage (le double du blé) : aucune règle de pompe n'a été changée pour autant, à surveiller si le débit devient un goulot d'étranglement.
>
> **v17** : la valeur nutritionnelle de tous les aliments de base existants est **augmentée de 25 %** (arrondie à l'entier le plus proche, règle centralisée — voir 1.1 et 8.1). Le **Gratin de patates** reçoit une valeur nutritionnelle dédiée de **150** (au lieu du calcul ingrédients × 1,3) pour couvrir à lui seul l'Apport Journalier d'une famille de 2 adultes + 2 enfants (voir 1.4). Les prix de vente ne changent pas. 🟡 Conséquence non traitée par ce changement : la courbe de progression cible (8.10) suppose des rendements de production non modifiés ; avec des aliments plus nutritifs pour les mêmes récoltes, l'autonomie mesurée progresse mécaniquement plus vite que cette courbe (à confirmer/ajuster).
>
> **v16** : la partie démarre désormais avec **350 pièces** (au lieu de 50) ; aucune autre règle économique n'est modifiée, et les parties déjà en cours conservent leur solde actuel.
>
> **v15** : ajout du **parc d'appareils électriques** — plusieurs panneaux et plusieurs batteries, chacun avec son niveau, son usure et son interrupteur — d'une **heure d'ambiance** en en-tête, et séparation de la **Pompe** et du **Réservoir**.
>
> **v14** : **toutes les règles sont validées**. Le coefficient d'achat ne redescend qu'à la vente, les 160 conserves de départ sont retenues, et le rythme du tableau d'équilibrage (100 % vers la nuit 60) est adopté comme cible.
>
> **v13** : **tableau d'équilibrage complet** (section 8), **Livre de recette ouvert par le Four**, **verger extensible par achat de surface**, valeurs énergétiques harmonisées.
>
> **v12** : **pas de revente d'animaux vivants**, le **Livre de recette est un onglet** (unique, non vendable) qui sert à lancer les plats, **arbres fruitiers achetés au Comptoir**.
>
> **v11** : consommation nocturne du frigo = **bloc de 30 s au Dormir**, **prix fixes** pour les animaux, **prix de vente fixes** toute l'année.
>
> **v10** : le **Réfrigérateur consomme des kWh en permanence**, **temps d'éveil minimal = 30 s**, **système de graines par plante validé**.
>
> **v9** : **Réfrigérateur illimité**, la santé ne pénalise **que les actions au clic**, la **batterie conserve son stock** la nuit.
>
> **v8** : **péremption moyenne (5 à 7 nuits)** hors frigo, **Inventaire illimité**, **replantation automatique** via un nœud de l'arbre techno.
>
> **v7** : la **laine sert uniquement à la vente**, la **poule pond toute sa vie**, **une seule station de chaque type**.
>
> **v6** : graines **achetables en dépannage** à prix majoré, **poules et moutons achetés au Comptoir**, **une préparation à la fois par station**.
>
> **v5** : les **graines viennent des récoltes**, la **parcelle est libérée** après récolte, la famille mange aussi **fruits, pain et plats cuisinés**.
>
> **v4** : **saisons légères** (10 nuits chacune), **soins payants** quand la santé tombe à 0, **temps d'éveil minimal** avant de pouvoir dormir.
>
> **v3** : le temps avance avec un bouton **« Dormir »**, un AJ non couvert entraîne un **malus de santé et de productivité**, et le mouton est **tondu régulièrement** (laine) puis **abattu** (viande).
>
> **v2** : intègre les nouveaux éléments (énergie en kWh et batterie, potager et serre par stades de pousse, verger, poulailler, pâturage en hectares, moulin et presse, silo, réfrigérateur, inventaire, recettes à temps de préparation, prix dynamiques du Comptoir, Apport Journalier en énergies). Les hypothèses provisoires sont signalées par 🟡 et les questions ouvertes sont regroupées à la fin.

---

## 1. Socle commun

### 1.1 Apport Journalier (AJ)

| Membre | Nombre | AJ unitaire | Total |
|---|---|---|---|
| Adulte | 2 | 50 énergies | 100 |
| Enfant | 2 | 25 énergies | 50 |
| **Famille** | 4 | — | **150 énergies / jour** |

La famille consomme **œufs, viande, légumes, fruits, pain et plats cuisinés**. L'huile, la farine et le blé sont des ingrédients, pas des aliments consommés directement.

> **+25 % (§4)** : la valeur nutritionnelle de tous les aliments de base a été
> augmentée de 25 % par rapport aux valeurs d'origine, arrondie à l'entier le
> plus proche (`Math.round`, règle centralisée dans `scaleEnergie()` — voir
> 8.1). Le tableau ci-dessous donne les valeurs **actuelles** ; l'Apport
> Journalier (AJ) de la famille n'a pas changé (toujours 150 énergies/jour).

Valeurs énergétiques (détail en section 8) :

| Aliment | Énergie / unité | Aliment | Énergie / unité |
|---|---|---|---|
| Œuf | 13 | Patate | 19 |
| Viande (portion 0,5 kg) | 38 | Aubergine | 10 |
| Carotte | 8 | Courgette | 10 |
| Tomate | 8 | Pomme / Poire | 10 |
| Pain | 34 | Conserve (départ) | 25 |
| Plats cuisinés | voir 1.4 | | |

*Ingrédients non consommables seuls, mais comptés dans l'énergie des plats* : farine 13, huile 13.

*Exemple d'une journée à 150 énergies* : 1 **Gratin de patates** (150, voir 1.4 — sa recette porte une valeur nutritionnelle dédiée pour couvrir à elle seule le besoin d'une famille de 2 adultes + 2 enfants sur une journée).

### 1.2 Entités et chaînes de production

**Énergie**
```
Panneau solaire ──► kWh ──► Batterie (stock kWh)
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
     Pompe (débit/kWh)   Moulin [kWh]      Presse [kWh]
                              │
                              ▼
                    Réfrigérateur [kWh en continu]
```

**Eau**
```
Puit (illimité) + Pompe [kWh] ──► Eau (L) ──► Potager [L] · Serre [L] · Champ [L]
```

**Végétal**
```
Potager ─ graine ─► carotte · courgette · tomate · aubergine · patate
                    · poivron · oignon · ail · épinard · fraise
Serre   ─ graine ─► tomate · courgette · aubergine · poivron
Serre   ─ graine ─► cacao · vanille · café (cultures de rente, exclusives à la Serre,
                    jamais comestibles : vente et recettes de luxe seulement)
Champ   ─ graine ─► blé · tournesol · riz · houblon
Verger  ─ arbre  ─► pommier → pomme · poirier → poire
```

**Transformation**
```
Blé ─────────────► Moulin [kWh] ─► Farine
Graine tournesol ─► Presse [kWh] ─► Huile de tournesol
Ingrédients ─────► Recette (clic + temps de préparation) ─► Plat
```

**Animal**
```
Silo (stock blé) ─► Poulailler ─► Poule [consomme blé] ─► 1 œuf / jour si nourrie
                                          └─► (v19) Abattage ─► Viande de volaille (portion fixe)
Pâturage (ha)   ─► Mouton (poids) ─► Viande de mouton | Laine
Pâturage (ha)   ─► Vache (poids, v19) ─► Viande de bœuf | Lait (chaque nuit, sans condition)
```

**Stockage et économie**
```
Inventaire ─► contient tous les items
Réfrigérateur ─► aliments frais et plats sans péremption
Surplus ─► Comptoir ─► Pièces ─► achats, améliorations, surface
```

### 1.3 Règles de mécanique définies

**Potager (et culture en général)**
- On plante une graine sur une parcelle.
- La plante **gagne un stade par jour si elle a été arrosée** ce jour-là ; sinon elle stagne.
- La carotte est mature en **4 stades** (🟡 durées des autres plantes à définir).
- Arrosage **au clic** au début ; **arrosage automatique au niveau 5** du Potager.
- Chaque arrosage consomme de l'eau (L).

**Poulailler**
- La capacité (nombre de poules) augmente avec le niveau.
- Nourrissage **au clic** au début ; **automatique au niveau 5**.
- Une poule nourrie pond **1 œuf par jour** et consomme du blé pris dans le Silo.

**Pâturage et moutons**
- Surface de départ : **0,5 ha = 10 moutons max** (0,05 ha / mouton).
- Chaque mouton supplémentaire nécessite l'achat de **0,05 ha**.
- Le prix de ces 0,05 ha est **multiplié par 1,2** à chaque nouveau mouton :

`prix(n) = prix_base × 1,2^(n − 1)` où *n* = rang du mouton au-delà du 10ᵉ.

| Mouton n° | 11 | 12 | 13 | 15 | 20 |
|---|---|---|---|---|---|
| Coefficient | ×1,00 | ×1,20 | ×1,44 | ×2,07 | ×5,16 |

**Comptoir — prix dynamiques**
- Vente des surplus → **pièces**.
- **Prix de vente fixes** : ils ne varient ni avec la saison ni avec la fraîcheur. Seul le **coefficient d'achat** est dynamique.
- Prix d'achat = **1,2 × prix de vente** au départ.
- Chaque unité **achetée** ajoute **+0,1** au coefficient ; chaque unité **vendue** retire **−0,1**, sans descendre sous 1,2.

`coef_achat = max(1,2 ; coef_achat + 0,1 × achetés − 0,1 × vendus)`
`prix_achat = prix_vente × coef_achat`

*Exemple* (carotte vendue 2 pièces) : 1ʳᵉ carotte achetée 2,4 → 2ᵉ 2,6 → 3ᵉ 2,8. Vendre 2 carottes ramène le prix à 2,6.

**Recettes**
- Clic sur une recette → vérification des ingrédients dans l'Inventaire → ingrédients retirés → **minuteur de préparation** → plat ajouté à l'Inventaire.

**Livre de recette**
- Le Livre de recette **n'est pas un objet** : c'est un **onglet unique** du jeu, **débloqué par la construction du Four** (chapitre 4). La **Cuisine** se construit ensuite, et ses recettes apparaissent dans le même onglet.
- Il n'est ni vendable ni stocké dans l'Inventaire.
- C'est depuis cet onglet qu'on **lance la confection des plats** : il liste les recettes, indique les ingrédients disponibles ou manquants, la station requise et son état.

**Verger**
- Pommiers et poiriers s'**achètent au Comptoir** (🟡 prix fixe, comme les animaux) et se plantent sur un emplacement libre du verger.
- Un arbre acheté est un jeune plant : il met 🟡 15 nuits avant sa première récolte, puis produit pendant les saisons de fruits (fin d'été, automne).
- **Emplacements limités** (🟡 2 au départ), **extensibles par achat de surface** au Comptoir, à prix croissant (voir section 8).

**Réfrigérateur**
- Les aliments frais et les plats qui y sont rangés **ne périment pas**.
- **Capacité illimitée.**
- **Consommation électrique permanente** : le frigo tire des kWh sur la batterie à chaque instant, jour et nuit (🟡 base 0,01 kWh/s + 0,0001 kWh/s par unité stockée).
- **Panne** : si la batterie tombe à 0, le frigo s'arrête. 🟡 Si le frigo a été hors tension plus de **50 % de la journée**, chaque aliment qu'il contient **perd 1 nuit de conservation** au moment de Dormir (son compteur, figé tant que le frigo fonctionne, reprend alors).
- Le frigo est débloqué tardivement (chapitre 6) et coûte cher 🟡 : conserver a un coût réel en énergie, et plus on stocke, plus il consomme.

### 1.4 Décisions validées (v3)

**⏰ Le temps : bouton « Dormir »**
- Une journée ne se termine **que lorsque le joueur clique sur « Dormir »**.
- Pendant la journée, l'électricité et l'eau circulent en **temps réel** (panneau → batterie → pompe → réservoir), et les recettes, le moulin et la presse avancent sur leur minuteur.
- Tout ce qui est « par jour » se résout **au clic sur Dormir** : pousse, ponte, repas, santé, péremption, croissance des moutons, repousse de la laine.
- Conséquence de design : le joueur contrôle le rythme. La journée devient un **tour de planification** (arroser, nourrir, cuisiner, vendre, puis dormir), et l'aspect idle porte sur les flux d'énergie et d'eau et sur les automatisations.
- **Temps d'éveil minimal** : le bouton Dormir reste grisé pendant **30 s** après le réveil (compte à rebours affiché). Le soleil a ainsi le temps de recharger la batterie, et le joueur ne peut pas enchaîner les nuits. 🟡 L'arbre techno peut réduire ce délai (ex. « Routine du matin » : 30 s → 20 s → 10 s).
- 🟡 Un **écran de réveil** résume la nuit : récoltes prêtes, œufs pondus, énergie consommée, santé, aliments périmés.

**❤️ Santé et productivité**
- Chaque membre de la famille a une **santé de 0 à 100** (🟡 départ à 100).
- Au repas du soir, le taux de couverture de l'AJ fait évoluer la santé :

| Couverture de l'AJ | Effet sur la santé 🟡 |
|---|---|
| 100 % | +5 (plafond 100) |
| 75 – 99 % | −5 |
| 50 – 74 % | −10 |
| < 50 % | −20 |

- La santé moyenne de la famille donne un **multiplicateur de productivité** qui s'applique **uniquement aux actions au clic** : arrosage, nourrissage, récolte et préparations lancées à la main. Les **automatisations** (arrosage et nourrissage au niveau 5, semis automatique) fonctionnent toujours à 100 %.
- Conséquence : automatiser protège la ferme d'une mauvaise passe de santé, ce qui renforce l'intérêt des niveaux 5.

| Santé moyenne | Productivité 🟡 | Effet concret |
|---|---|---|
| 80 – 100 | ×1,0 | Normal |
| 50 – 79 | ×0,8 | Récoltes et vitesse des recettes réduites |
| 20 – 49 | ×0,5 | Un seul arrosage / nourrissage sur deux compte |
| < 20 | ×0,25 | Famille « épuisée » : actions au clic limitées |

- **Santé à 0 → soins payants** :
  - le membre concerné est **malade** : il ne mange pas moins, mais n'apporte plus rien à la productivité (compte comme santé 0 dans la moyenne) ;
  - un bouton **« Soigner »** apparaît sur son portrait ; les soins coûtent des pièces et remontent sa santé à 🟡 **50** ;
  - 🟡 coût : `soin = 20 pièces × 1,5^(nombre de soins déjà payés)`, pour que la négligence répétée coûte de plus en plus cher ;
  - 🟡 sans pièces, le membre reste malade et sa santé ne remonte que lentement (+2 par nuit bien nourrie) : pas de fin de partie, mais un fort ralentissement.
- 🟡 Les enfants et les adultes peuvent avoir des malus différents (ex. adultes → vitesse des tâches, enfants → aide aux corvées).

**🌱 Graines issues des récoltes**
- Les graines proviennent **normalement des récoltes**. 🟡 Un **kit de départ** (ex. 6 graines de carotte, 4 patates, 4 graines de blé) lance la partie.
- **Dépannage au Comptoir** : on peut acheter des graines, mais à **prix majoré**. 🟡 Leur coefficient d'achat démarre à **2,0** au lieu de 1,2 (plancher 2,0), puis suit la même règle (+0,1 par achat, −0,1 par vente). Acheter reste donc possible, mais produire ses propres graines est toujours plus rentable.
- Les graines en surplus peuvent aussi être **vendues** au Comptoir.
- **Exception du blé** : le blé reste classé comme **ingrédient** (Silo, Moulin, alimentation des poules, plancher de marché normal ×1,2, inchangé), mais il est **listé en plus dans l'onglet Graines du Comptoir** puisqu'il sert aussi de semence pour le Champ — sans y perdre sa place dans l'onglet Acheter. Ce n'est pas généralisé aux autres cultures qui se replantent avec leur propre récolte (la patate reste seulement dans l'onglet Acheter).
- Chaque plante a son propre mode de reproduction (**validé**, quantités 🟡) :

| Plante | Comment obtenir des graines |
|---|---|
| Tomate, courgette, aubergine, poivron | Chaque récolte rend aussi 1 à 2 graines |
| Oignon, épinard | Chaque récolte rend aussi 1 à 2 graines |
| Fraise | Chaque récolte rend aussi 2 à 3 graines |
| Patate | On garde des patates : 1 patate = 1 plant (choix manger / replanter) |
| Ail, riz | On garde ail/riz : 1 ail ou 1 riz = 1 plant (choix manger / replanter) |
| Blé | On garde du blé : 1 blé = 1 graine (choix manger via farine / nourrir les poules / replanter) |
| Houblon, cacao, vanille, café | On garde une partie de la récolte : 1 unité = 1 plant (jamais mangées : voir « cultures de rente » ci-dessous) |
| Tournesol | La récolte donne des graines : à **replanter** ou à **presser** en huile (même ressource) |
| Carotte | 🟡 Option « Laisser monter en graine » : la plante reste 2 stades de plus et donne des graines au lieu de carottes |
| Pommier, poirier | Arbres permanents : pas de graines ; nouveaux arbres **achetés au Comptoir** |

**🌰 Cultures de rente (cacao, vanille, café)**
- Exclusives à la **Serre** : `lieux: ['serre']` seul dans la culture, sans Potager ni Champ. La fonction de plantation elle-même refuse toute autre parcelle (pas seulement l'écran de plantation, qui se contente de ne pas les proposer).
- **Jamais comestibles** (`edible: false`) : la composition du repas familial les ignore totalement, même si la famille est affamée et même si elles sont en stock.
- Elles ne servent qu'à la **vente** (prix élevé, doublé en v21 : cacao 16, vanille 30, café 12) et comme ingrédients de recettes de luxe à venir.
- Poussent et se récoltent en Serre exactement comme les autres cultures de Serre : aucune saison ne les affecte, et l'absence d'arrosage/récolte automatique en Serre (aucune culture n'y est aujourd'hui automatisée, cacao/vanille/café compris) reste identique à ce qui existait déjà pour tomate/courgette/aubergine.

- Tension de jeu : **manger ou replanter**. Une famille affamée qui mange ses semences compromet la saison suivante.

**🧺 Récolte et replantation**
- Une plante mature se récolte (au clic, 🟡 automatique au niveau 5 du Potager), puis la **parcelle redevient vide** : il faut replanter.
- **Semis automatique** : nœud de l'arbre techno. Une fois débloqué, chaque parcelle récoltée est **replantée avec la même culture** si une graine est disponible au-delà de la réserve de semences. 🟡 Prérequis : Arrosage automatique (Potager niveau 5) ; coût élevé, en fin de branche Culture.
- 🟡 Le joueur peut **verrouiller une culture** par parcelle ou désactiver le semis automatique parcelle par parcelle.
- Exception : les arbres du verger restent en place et produisent à chaque saison de récolte.

**🍽️ Fruits, pain et plats cuisinés**
- Tous sont consommés par la famille.
- Les **plats cuisinés** valent plus que leurs ingrédients crus 🟡 : **énergie du plat = somme des ingrédients × 1,3**, et un **bonus de santé** (+1 par plat différent mangé dans la journée, plafonné à +3).
- Le **Four** redevient une infrastructure : il est nécessaire au pain et aux plats cuits.
- **Une préparation à la fois par station** : Cuisine, Four, Moulin et Presse traitent chacun **une seule préparation**. Tant qu'elle n'est pas terminée, la station est occupée. Il n'y a pas de file d'attente : le joueur relance lui-même.
- Conséquence : pendant le temps d'éveil, le joueur choisit **quoi préparer en priorité** ; les recettes longues (ragoût, tarte) prennent une vraie place dans la journée.
- **Une seule station de chaque type** sur la ferme : 1 Cuisine, 1 Four, 1 Moulin, 1 Presse. On ne peut pas en construire d'autres.
- 🟡 L'arbre techno peut **réduire les temps de préparation** (ex. « Cuisinière expérimentée » −20 %). C'est le seul levier pour produire plus de plats par jour.
- 🟡 Une préparation lancée continue pendant la nuit et le hors-ligne.

| Recette 🟡 | Ingrédients | Station | Temps | Énergie |
|---|---|---|---|---|
| Pain | 2 farine + 1 L eau | Four | 10 s | 34 |
| Omelette | 3 œufs + 1 huile | Cuisine | 8 s | 68 |
| Ratatouille | 1 tomate + 1 courgette + 1 aubergine + 1 huile | Cuisine | 15 s | 53 |
| Gratin de patates | 3 patates + 1 œuf | Four | 15 s | **150** (valeur dédiée, voir ci-dessous) |
| Ragoût | 2 viande de mouton + 2 carottes + 1 patate | Cuisine | 23 s | 144 |
| Compote | 3 pommes ou 3 poires | Cuisine | 8 s | 39 |
| Tarte aux pommes | 2 farine + 3 pommes + 1 œuf | Four | 23 s | 90 |

Énergie = somme des ingrédients × 1,3, arrondie (mise à jour au §4 avec les
valeurs d'aliments +25 %). Les temps des plats sont divisés par 2 depuis v24
(arrondis au supérieur) : sur un éveil minimal de 30 s, on peut désormais
enchaîner plusieurs recettes courtes par journée, et même les recettes les plus
longues (30 s) tiennent dans un éveil minimal.

**Exception — Gratin de patates (§4)** : le calcul ingrédients × 1,3 donnerait
91 (3 patates à 19 + 1 œuf à 13, soit 70 × 1,3), mais la recette porte un
champ `energieForcee: 150` (override explicite dans `DATA.recipes`, lu par
`dishEnergy()`) pour qu'une seule unité couvre exactement le besoin d'une
journée de la famille de départ (2 adultes + 2 enfants = 150, voir 1.1). Le
prix de vente du gratin, lui, reste calculé normalement depuis ses
ingrédients (`dishPrice()` n'est pas concerné par l'override).

**🍽️bis 15 nouvelles recettes (v20)**

Même système, mêmes fonctions (`DATA.recipes`, `dishEnergy()`, `dishPrice()`,
`registerDishItems()`) : aucune nouvelle mécanique de cuisine, seulement de
nouvelles entrées de données. Énergie et prix suivis dans la colonne
« Énergie/Prix » sont calculés par le système existant (`recipeSum() ×
COEF_PLAT`, sauf les 4 recettes de luxe — voir plus bas).

| Recette | Ingrédients | Station | Temps | Énergie | Prix | Note |
|---|---|---|---|---|---|---|
| Soupe de légumes | 1 carotte + 1 oignon + 1 patate + 1 L eau | Cuisine | 15 s | 43 | 12 | repas familial |
| Salade de tomates | 2 tomates + 1 huile | Cuisine | 5 s | 38 | 10 | rapide, léger |
| Quiche aux épinards | 2 farine + 2 œufs + 1 lait + 1 épinard | Four | 20 s | 95 | 29 | repas familial |
| Fromage frais | 3 lait | Cuisine | 30 s | 62 | 31 | se conserve 8 nuits (mieux que le lait cru, 4 nuits) |
| Riz au lait | 2 riz + 1 lait | Cuisine | 15 s | 47 | 16 | repas familial |
| Pain à l'ail | 1 pain + 1 ail + 1 huile | Four | 8 s | 69 | 21 | utilise le pain comme ingrédient (retiré du stock comme n'importe quel autre) |
| Poivrons farcis | 2 poivrons + 1 viande de mouton + 1 riz | Four | 20 s | 81 | 26 | repas copieux (viande = mouton, comme le ragoût) |
| Tarte aux fraises | 2 farine + 3 fraises + 1 œuf | Four | 20 s | 70 | 26 | dessert |
| Confiture de fraises | 4 fraises | Cuisine | 15 s | 26 | 21 | se conserve bien : imperissable |
| Chocolat chaud 🌟 | 1 cacao + 1 lait | Cuisine | 10 s | 21 | **72** (×3) | luxe |
| Café 🌟 | 1 café + 1 L eau | Cuisine | 5 s | 0 | **39** (×3) | luxe ; id technique `cafe_boisson` (distinct de l'item `cafe`) |
| Crème à la vanille 🌟 | 1 vanille + 2 lait + 2 œufs | Cuisine | 23 s | 75 | **162** (×3) | luxe |
| Bière artisanale 🌟 | 2 houblon + 1 L eau | Cuisine | 30 s | 0 | **39** (×3) | luxe ; ne périme pas (comme le blé/la farine/la laine) |
| Rôti de bœuf | 2 viande de bœuf + 2 carottes + 1 patate | Four | 30 s | 144 | 36 | repas copieux |
| Poulet rôti à l'ail | 1 viande de volaille + 2 patates + 1 ail | Four | 23 s | 75 | 23 | repas familial |

**Recettes de luxe (🌟) — règle du multiplicateur** : ces 4 recettes portent un
champ optionnel `priceMultiplier: 3` sur leur entrée `DATA.recipes`, lu par
`dishPrice()` à la place de `DATA.RECETTES.COEF_PLAT` (×1,3 pour toutes les
autres recettes) — sans dupliquer la formule de calcul (`recipeSum()` reste
l'unique somme des prix). L'énergie de ces 4 plats suit toujours le calcul
normal (`dishEnergy()`, ×1,3, jamais concerné par `priceMultiplier`) : le café
et la bière tombent à 0 énergie faute d'ingrédient comestible (le café et le
houblon ne sont pas des aliments, voir 1.4 « Cultures de rente »), ce qui est
cohérent avec le reste du jeu.

**🟡 Décisions de game design ouvertes (v20)**, faute de chiffre fourni par la
demande d'origine :
- Fromage frais : conservation choisie à 8 nuits (entre le lait cru et
  l'indéfini du frigo). À ajuster si besoin.
- Confiture de fraises : « se conserve bien » interprété comme imperissable
  (comme une conserve), faute de durée précisée.
- Les notes « repas familial », « repas copieux », « rapide, léger », «
  dessert » sont **purement descriptives** (aucun effet mécanique, à la
  différence du Gratin de patates qui porte un `energieForcee` explicite) :
  aucune de ces 11 recettes ne couvre à elle seule l'AJ d'une journée (150).
  Si une ou plusieurs doivent devenir des « repas complets » comme le gratin,
  c'est une décision de contenu distincte, non traitée ici.

**📦 Inventaire et péremption**
- L'**Inventaire est illimité** : aucune gestion de place, la contrainte vient de la péremption.
- Les aliments frais et les plats **périment en 5 à 7 nuits** hors réfrigérateur ; le Réfrigérateur les conserve sans limite de temps.
- Chaque unité garde son âge. 🟡 Les lots sont regroupés par nuit de récolte pour rester lisibles (« 6 carottes — 2 nuits restantes »).

| Catégorie | Péremption hors frigo 🟡 |
|---|---|
| Viande | 5 nuits |
| Tomate, courgette, aubergine | 5 nuits |
| Œuf, carotte, plats cuisinés | 6 nuits |
| Pomme, poire, pain | 7 nuits |
| Patate | 7 nuits |
| Fromage frais (v20) | 8 nuits (exception, plus long que le lait cru) |
| Blé, farine, huile, graines, laine, bière artisanale, confiture de fraises (v20) | jamais |

- La famille mange **d'abord ce qui périme le plus tôt** (voir 6.9).
- 🟡 Une notification au réveil signale les lots qui périment la nuit suivante.

**🕐 L'heure de la journée**
- La journée commence à **6 h 00**. 🟡 **1 heure de jeu = 30 s de temps d'éveil**, et l'heure s'affiche en en-tête (6 h, 7 h, 8 h…).
- C'est une **heure d'ambiance** : elle donne le rythme de la journée, mais **la production ne varie pas selon l'heure**. Les saisons restent le seul facteur qui module le solaire.
- L'éveil minimal de 30 s correspond donc à **une heure de jeu** : on ne peut pas dormir avant 7 h. Après 22 h, l'heure continue de défiler sans pénalité.

**🔌 Le parc d'appareils électriques**
Le joueur ne possède plus un panneau et une batterie, mais un **parc** qu'il agrandit.

- **Panneaux solaires** et **batteries** s'achètent à l'unité. Chaque appareil a son **niveau** (1 à 5, amélioré séparément, même grille de coûts), sa propre **usure** et son **interrupteur**.
- **Prix croissant** : chaque unité supplémentaire coûte **1,2 fois la précédente** (🟡 panneau 60 💰, batterie 80 💰 pour la première). Pas de nombre maximum.
- **Écrans dédiés** : la carte « Production d'énergie » et la carte « Stockage d'énergie » de la Ferme ouvrent chacune la liste de leurs appareils — niveau, état, usure, production ou charge, interrupteur.
- **Batteries en série** : la charge remplit la **première batterie disponible**, puis la suivante. La décharge se fait dans l'**ordre inverse** : on vide d'abord la dernière remplie. Chaque batterie affiche donc un état lisible (pleine, en charge, en décharge, vide, à l'arrêt).
- Une batterie **ne se décharge pas** d'elle-même : le stock de kWh est conservé d'une nuit à l'autre. Seuls les consommateurs (pompe, moulin, presse, réfrigérateur) la vident. Le frigo étant permanent, sa consommation nocturne est **prélevée d'un bloc au clic sur Dormir, équivalente à 30 s de fonctionnement** ; si le parc ne couvre pas ce bloc, la nuit compte comme une panne pour le frigo.
- **Une batterie en décharge affiche la puissance soutirée** (−x,xx kWh/s), et l'écran de stockage affiche le total soutiré.

**🔴🟢 Interrupteurs**
- Chaque appareil de production ou de consommation (panneau, batterie, pompe, moulin, presse, réfrigérateur) porte un **interrupteur à deux positions**, rouge à l'arrêt et vert en marche.
- Un appareil à l'arrêt ne produit ni ne consomme rien, et **ne s'use pas**. C'est le levier pour protéger la réserve d'énergie ou retarder un entretien.
- Couper une batterie la sort du circuit : elle garde sa charge sans pouvoir la rendre.

**🛠️ Usure et entretien**
- Chaque appareil a une **usure de 0 à 100 %**, qui monte de 🟡 **0,5 point par heure de fonctionnement** (donc jamais à l'arrêt).
- L'usure **réduit les performances** : production d'un panneau, capacité utile d'une batterie, débit d'une pompe, vitesse d'un moulin ou d'une presse. 🟡 Rendement = 1 − usure ÷ 200 (soit −50 % à 100 % d'usure).
- À **100 % d'usure, l'appareil tombe en panne** et s'arrête. Il faut le **réparer** : 🟡 50 % de son prix d'achat.
- **Entretenir** avant la panne remet l'usure à 0 pour 🟡 20 % du prix d'achat. Entretenir régulièrement coûte donc moins cher que réparer.
- L'état affiché résume tout : en marche, à l'arrêt, en charge, en décharge, pleine, vide, en attente d'énergie, **à entretenir** (usure ≥ 🟡 70 %), **en panne**.

**🍂 Saisons légères**
- 4 saisons de **10 nuits** chacune → une année = 40 nuits.
- Les saisons **nuancent** la production sans jamais la bloquer : aucune culture n'est impossible, seuls les rendements et la consommation varient de ±10 à 30 %.
- La **Serre** ignore les saisons : son avantage est la régularité.
- Le **Verger** reste saisonnier : il ne donne des fruits qu'en 🟡 fin d'été et en automne.

**🐔 Achat des animaux**
- Poules, moutons et **vaches** (v19) s'obtiennent **uniquement par achat au Comptoir** (pas de reproduction).
- Un achat n'est possible que s'il reste de la place :
  - poule → **capacité du Poulailler** ;
  - mouton → **surface de pâturage** (0,05 ha / mouton ; au-delà de 10, acheter d'abord la surface au prix × 1,2ⁿ) ;
  - vache (v19) → **surface de pâturage**, comme le mouton, mais **0,15 ha / vache** (3× un mouton) ; le pâturage est un terrain **commun aux deux espèces** : la surface libre se calcule sur leur occupation totale.
- **Prix fixes**, quel que soit le nombre d'animaux possédés : 🟡 poule 15 pièces, mouton 60 pièces, **vache 200 pièces** (v19, ≈ 3,3× le mouton — un peu plus que le seul rapport de surface/viande, le lait quotidien dès l'achat justifiant l'écart). La croissance est freinée par la capacité du Poulailler et par le coût du pâturage (× 1,2 par 0,05 ha au-delà de la surface de départ), pas par le prix de l'animal.
- **Pas de revente** d'animaux vivants : un achat est définitif. Un mouton ou une vache ne quitte la ferme que par l'abattage ; une poule, par la ponte à vie ou (v19) par l'abattage.
- Un mouton ou une vache abattu(e) doit être **racheté(e)** : l'abattage a un vrai coût. Une poule abattue (v19) aussi : sa place se libère mais n'est **jamais remplacée automatiquement**.
- **La poule pond toute sa vie** : pas de vieillissement, pas de baisse de ponte. Une poule est d'abord un investissement permanent, tant qu'elle est nourrie. Depuis v19, elle peut aussi être **abattue** (viande de volaille), mais seulement comme option de dernier recours : voir plus bas.

**🐑 Mouton : laine régulière, viande à l'abattage**
- Le mouton **grossit chaque jour** tant que le pâturage suffit (🟡 jusqu'à un poids maximal).
- La **laine repousse** : tonte possible tous les 🟡 7 jours → 🟡 1 unité de laine, sans perte du mouton.
- **Abattage** au clic : viande de mouton (`viande_mouton`, v19 : anciennement l'item générique « viande ») = poids × 🟡 50 % (rendement carcasse). Le mouton disparaît et libère sa place de pâturage (la surface achetée reste acquise).
- **La laine sert uniquement à la vente** au Comptoir : c'est un revenu régulier en pièces, sans usage d'artisanat ni effet sur la santé. Elle n'est pas périssable.
- Tension de jeu : garder un mouton pour la laine (pièces régulières) ou l'abattre pour nourrir la famille (viande immédiate).

**🐄 Vache (v19) : lait quotidien, viande à l'abattage**
- La vache **grossit chaque jour** tant que le pâturage suffit (même règle de saison que le mouton), de 1 kg/nuit, de 40 à 150 kg.
- **Le lait est produit chaque nuit, sans aucune condition** au-delà de la place au pâturage : ni délai de maturité, ni tonte à déclencher (contrairement à la laine du mouton). 1 unité de `lait` par vache et par nuit, dès l'achat.
- **Abattage** au clic, sur le modèle exact du mouton : viande de bœuf (`viande_boeuf`) = poids × 50 %. La vache disparaît, la surface reste acquise. Au poids maximal (150 kg), une vache rend 150 portions — exactement 3× le maximum du mouton (50 portions à 50 kg), le même rapport que l'occupation au pâturage : à surface égale, une vache n'est ni plus ni moins rentable en viande que des moutons.
- Tension de jeu : un investissement plus lourd (200 💰, 0,15 ha) mais qui rapporte tout de suite (lait) et sur la durée (croissance vers une viande abondante), en concurrence directe avec l'espace qu'occuperaient des moutons.

**🍗 Abattage des poules (v19) : dernier recours, jamais une rente**
- Contrairement au mouton et à la vache, la poule n'est **pas suivie individuellement** (pas de poids) : l'abattage rend un nombre **fixe** de portions de `viande_volaille` (3 portions), quel que soit son âge ou son historique de ponte.
- Conçu en v19 pour être **peu rentable à court terme** : 3 portions à 3 💰 (9 💰) contre un prix d'achat de 15 💰, donc une perte sèche. 🟡 **Depuis v21** (prix de vente ×2), la volaille se vend 6 💰 : 3 portions rapportent **18 💰**, soit **plus que le prix d'achat (15 💰)**. Cette intention d'équilibrage n'est plus respectée ; décision de game design ouverte (voir 8.9).
- La poule abattue **quitte le cheptel immédiatement** : elle ne pond plus et ne consomme plus de blé dès la nuit suivante. La capacité du Poulailler ne change pas ; la place libérée peut accueillir une poule rachetée au Comptoir (jamais automatiquement).

### 1.5 Paramètres par entité

| Entité | Paramètres |
|---|---|
| Panneau solaire (plusieurs) | {niveau}, {production kWh/s}, {usure}, {interrupteur}, {prix × 1,2ⁿ} |
| Batterie (plusieurs) | {niveau}, {capacité kWh}, {charge}, {usure}, {interrupteur}, {prix × 1,2ⁿ}, {ordre de remplissage} |
| Pompe | {niveau}, {débit L}, {conso kWh}, {usure}, {interrupteur} |
| Réservoir | {capacité L}, {contenu} — carte séparée de la Pompe |
| Heure | {début 6 h}, {1 h = 30 s d'éveil}, {sans effet sur la production} |
| Potager | {nb parcelles}, {niveau}, {arrosage auto ≥ niv. 5}, {L / arrosage} |
| Serre | {nb parcelles}, {L / arrosage}, 🟡 {insensible aux saisons ?} |
| Champ | {surface}, {L / jour}, {rendement} |
| Verger | {nb emplacements}, {prix fixe des arbres}, {fruits / récolte}, {délai avant première récolte} |
| Moulin / Presse | {conso kWh}, {ratio entrée → sortie}, {temps} |
| Silo | {capacité blé} |
| Poulailler | {niveau}, {capacité}, {nourrissage auto ≥ niv. 5} |
| Poule | {1 œuf / jour si nourrie, à vie}, {blé / jour}, {pas de vieillissement}, {v19 : abattage à rendement fixe, viande_volaille} |
| Pâturage | {surface ha}, {0,05 ha / mouton, 0,15 ha / vache (v19)}, {prix base × 1,2ⁿ, terrain commun aux deux espèces} |
| Mouton | {poids, croissance / jour, poids max}, {rendement viande_mouton}, {jours entre tontes}, {laine / tonte}, {prix de vente de la laine} |
| Vache (v19) | {poids, croissance / jour, poids max}, {rendement viande_boeuf}, {lait / nuit, sans délai de maturité} |
| Réfrigérateur | {capacité illimitée}, {conservation tant qu'alimenté}, {conso kWh permanente : base + par unité}, {seuil de panne} |
| Inventaire | {illimité}, {lots datés : nuits restantes} |
| Station (Cuisine, Four, Moulin, Presse — 1 exemplaire chacune) | {occupée / libre}, {préparation en cours}, {temps restant} |
| Recette | {ingrédients}, {station : cuisine / four}, {temps de préparation}, {énergie = ingrédients × 1,3}, {bonus santé} |
| Plante | {stades}, {rendement}, {graines rendues}, {mode de reproduction} |
| Comptoir | {prix de vente}, {coef d'achat dynamique : plancher 1,2 (graines 2,0)}, {prix de vente fixes}, {prix fixes poule / mouton / vache (v19)} |
| Famille | {AJ adulte 50}, {AJ enfant 25}, {santé 0–100}, {multiplicateur de productivité} |

---

## 2. Structure A — « Le Réseau de Flux »

### Principe
Le moteur tourne en continu : l'électricité et l'eau sont des **flux** (kWh et L par seconde), la batterie absorbe les variations. Les cultures et les animaux avancent quand le joueur clique sur **« Dormir »**. Le joueur surveille les jauges et supprime les goulots.

### Organisation
```
Tick (200 ms) : Panneau → Batterie → Pompe / Moulin / Presse → réservoir d'eau
Clic Dormir  : pousse des plantes (si arrosées) → ponte (si nourries)
               → repas familial (150 énergies) → santé → péremption → bilan
```

### Particularités
- **Batterie** = tampon central : si elle est vide, pompe, moulin et presse ralentissent au prorata.
- Les stocks techniques (Silo, Batterie, réservoir d'eau) sont plafonnés ; l'Inventaire, lui, est illimité, et c'est la péremption qui pousse à vendre ou à conserver.
- Les clics (arrosage, nourrissage) sont des **tâches de la journée** ; l'automatisation au niveau 5 est le premier grand palier idle.

### Forces / faiblesses
- ✅ Visuellement vivant ; l'énergie et l'eau prennent tout leur sens.
- ⚠️ Mélange flux continu / événements journaliers à bien expliquer au joueur.
- ⚠️ Le Moulin et la Presse, limités à une préparation à la fois, deviennent des goulots naturels.

---

## 3. Structure B — « Le Calendrier de la Ferme »

### Principe
Le temps avance **par journées**, chaque journée se terminant par le bouton **« Dormir »** (après un temps d'éveil minimal), et par **saisons légères** de 10 nuits. C'est la structure la plus cohérente avec les règles validées : tout est exprimé « par jour » et le joueur maîtrise le passage du temps.

### Déroulé d'une journée
| Phase | Actions |
|---|---|
| 🌅 Réveil | Écran de bilan de la nuit ; le soleil recharge la batterie en temps réel ; compte à rebours avant de pouvoir dormir |
| ☀️ Journée (temps libre) | Le joueur arrose, nourrit, tond, cuisine, moud, presse, vend |
| 😴 Clic « Dormir » | Repas familial (150 énergies) → santé → pousse (+1 stade si arrosé) → ponte (si nourrie) → croissance et laine des moutons → croissance et lait des vaches (v19) → péremption hors frigo |

### Rôle des nouveaux éléments
- **Serre** : rendement constant toute l'année, sans malus d'hiver.
- **Réfrigérateur** : conserver la récolte d'été pour l'hiver.
- **Silo** : stocker le blé récolté pour nourrir les poules toute l'année.
- **Verger** : récolte en fin d'été et en automne.
- **Presse / Moulin** : transformer quand la batterie est pleine (été).

### Modificateurs saisonniers (légers) 🟡
| Saison | Solaire | Rendement potager | Eau consommée | Champ | Pâturage (croissance moutons **et vaches**, v19) | Verger |
|---|---|---|---|---|---|---|
| 🌱 Printemps | ×1,0 | ×1,1 | ×1,0 | ×1,0 | ×1,2 | — |
| ☀️ Été | ×1,3 | ×1,0 | ×1,3 | ×1,2 | ×1,0 | fruits (fin) |
| 🍂 Automne | ×0,9 | ×1,0 | ×0,9 | ×0,9 | ×1,0 | fruits |
| ❄️ Hiver | ×0,7 | ×0,7 | ×0,8 | ×0,7 | ×0,8 | — |
| Serre | — | ×1,0 toute l'année | ×1,0 | — | — | — |

(v19) La croissance de la vache réutilise le même facteur saisonnier que le mouton (même colonne) plutôt que d'en introduire un dédié ; seul son lait échappe aux saisons, comme la ponte des poules.

L'hiver reste plus serré, sans être punitif : stocker au réfrigérateur et investir dans la serre aident, mais ne sont pas obligatoires pour survivre.

### Forces / faiblesses
- ✅ Donne tout son sens à l'autonomie : anticiper, stocker, conserver.
- ✅ Simulation discrète, très facile à tester.
- ✅ Le bouton Dormir supprime la pression du temps réel : idéal pour un public familial.
- ⚠️ Plus exigeant en attention avant l'automatisation ; le temps d'éveil minimal empêche d'enchaîner les nuits (voir 6.10).

---

## 4. Structure C — « Les Paliers d'Autonomie »

### Principe
La progression suit des **chapitres**, mesurés par le **% d'autonomie** = énergie produite sur la ferme ÷ 150. La nourriture achetée au Comptoir ne compte pas.

### Chapitres
| # | Titre | Débloque | Objectif |
|---|---|---|---|
| 1 | *L'eau et le soleil* | Panneau, Batterie, Puit, Pompe | Stocker 5 kWh et 50 L |
| 2 | *Le premier potager* | Potager (carotte, patate) | Récolter 20 carottes, replanter sans épuiser ses graines — 25 % d'autonomie |
| 3 | *Le poulailler* | Champ (blé), Silo, Poulailler | 7 jours de ponte sans interruption, santé ≥ 80 |
| 4 | *Le four et le livre de recette* | Four → onglet Livre de recette, puis Cuisine, Moulin, Presse, tournesol | Cuire 5 pains et préparer 3 plats différents |
| 5 | *Le troupeau* | Pâturage, Moutons **et Vaches (v19)**, tonte, abattage, lait | Tondre 10 laines — 60 % d'autonomie |
| 6 | *Toute l'année* | Serre, Verger, Réfrigérateur | Traverser un hiver à 80 % sans payer de soins |
| 7 | *Famille autonome* | Automatisations avancées | 100 % pendant 7 jours → mode libre |

### Particularité
L'automatisation au niveau 5 (arrosage, nourrissage) marque la **transition clic → idle** : elle est présentée comme une récompense de chapitre.

### Forces / faiblesses
- ✅ Tutoriel naturel ; message éducatif clair.
- ⚠️ Rejouabilité plus faible après la campagne.

---

## 5. Comparatif et recommandation

| Critère | A — Flux | B — Calendrier | C — Paliers |
|---|---|---|---|
| Cohérence avec les règles « par jour » | ★★ | ★★★ | ★★ |
| Esprit idle | ★★★ | ★★ | ★★ |
| Clarté du message « autonomie » | ★★ | ★★★ | ★★★ |
| Onboarding | ★★ | ★★ | ★★★ |

**Recommandation : B comme ossature (journée + Dormir), flux continus de A pour l'énergie et l'eau, progression de C.**
Le bouton Dormir confirme ce choix : le **jour** est l'unité de base et le joueur en contrôle le rythme. L'électricité et l'eau circulent en temps réel pendant la journée pour donner vie à l'écran, la santé rend le repas du soir décisif, et les chapitres guident l'apprentissage.

---

## 6. Développer le jeu dans un navigateur

### 6.1 Stack

| Besoin | Choix |
|---|---|
| Langage | **TypeScript** |
| Build | **Vite** |
| Interface | **Svelte** (ou Preact) |
| État | Store unique sérialisable |
| Sauvegarde | `localStorage` versionné + export / import texte |
| Tests & équilibrage | **Vitest** + script de simulation |
| Hébergement | GitHub Pages / Netlify / itch.io |

Pas de moteur de jeu nécessaire : l'idle est une interface de données. Des illustrations SVG suffisent pour les parcelles et les animaux.

### 6.2 Arborescence

```
src/
├── data/                     ← équilibrage, aucune logique
│   ├── items.ts                  aliments, graines, produits, énergie, prix
│   ├── crops.ts                  plantes : lieu, stades, eau
│   ├── buildings.ts              panneau, batterie, pompe, moulin, presse, silo...
│   ├── animals.ts                poule, mouton, vache (v19)
│   ├── recipes.ts                ingrédients, temps, énergie
│   ├── techtree.ts
│   └── chapters.ts
├── engine/                   ← simulation pure, sans DOM
│   ├── state.ts
│   ├── tick.ts                   flux kWh et eau
│   ├── day.ts                    pousse, ponte, repas, péremption
│   ├── crops.ts                  planter, arroser, récolter
│   ├── animals.ts                nourrir, pâturage, abattage (mouton, vache, poule — v19)
│   ├── family.ts                 consommation des 150 énergies
│   ├── market.ts                 prix dynamiques
│   ├── kitchen.ts                file de recettes
│   ├── inventory.ts              inventaire, frigo, silo
│   └── offline.ts
├── persistence/save.ts
├── ui/tabs/  Ferme · Inventaire · LivreRecette · ArbreTechno · Comptoir
└── main.ts
```

### 6.3 Données : une plante

```ts
// data/crops.ts
export const crops = {
  // stages = nuits arrosées ; yield = unités par récolte ; water = L par arrosage
  carotte:   { places: ['potager'],          stages: 4, water: 2, yield: 10, boltStages: 2, boltSeeds: 6 },
  patate:    { places: ['potager'],          stages: 6, water: 3, yield: 8,  seedFrom: 'patate' },
  tomate:    { places: ['potager', 'serre'], stages: 5, water: 3, yield: 10, seeds: [1, 2] },
  courgette: { places: ['potager', 'serre'], stages: 5, water: 4, yield: 6,  seeds: [1, 2] },
  aubergine: { places: ['potager', 'serre'], stages: 6, water: 4, yield: 6,  seeds: [1, 2] },
  ble:       { places: ['champ'],            stages: 7, water: 2, yield: 8,  seedFrom: 'ble' },
  tournesol: { places: ['champ'],            stages: 7, water: 2, yield: 9,  seedFrom: 'graine_tournesol' },
} satisfies Record<string, CropDef>;
```

### 6.4 Arrosage et pousse

```ts
// engine/crops.ts
export function water(s: GameState, plotId: string) {
  const plot = s.plots[plotId];
  const need = crops[plot.crop!].waterPerDay;
  if (plot.wateredToday || s.stock.eau < need) return false;
  s.stock.eau -= need;
  plot.wateredToday = true;
  return true;
}

// appelé à la fin de chaque jour
export function growAll(s: GameState) {
  for (const plot of Object.values(s.plots)) {
    if (!plot.crop) continue;
    if (s.levels[plot.place] >= 5 && !plot.wateredToday) water(s, plot.id); // auto
    if (plot.wateredToday && plot.stage < crops[plot.crop].stages) plot.stage++;
    plot.wateredToday = false;
  }
}
```

### 6.4 bis Planter et récolter

```ts
const seedItem = (crop: string) => crops[crop].seedFrom ?? `graine_${crop}`;

export function plant(s: GameState, plotId: string, crop: string) {
  const plot = s.plots[plotId];
  const seed = seedItem(crop);
  if (plot.crop || !crops[crop].places.includes(plot.place) || s.inventory[seed] < 1) return false;
  s.inventory[seed]--;
  Object.assign(plot, { crop, stage: 0, bolting: false });
  return true;
}

// auto = true quand la récolte vient d'une automatisation (non pénalisée par la santé)
export function harvest(s: GameState, plotId: string, auto = false) {
  const plot = s.plots[plotId];
  const def = crops[plot.crop!];
  const max = def.stages + (plot.bolting ? def.boltStages ?? 0 : 0);
  if (plot.stage < max) return false;
  if (plot.bolting) {
    s.inventory[seedItem(plot.crop!)] += def.boltSeeds!;              // carotte montée en graine
  } else {
    s.inventory[plot.crop!] += Math.round(def.yield * (auto ? 1 : productivity(s)) * seasonFactor(s, plot));
    if (def.seeds) s.inventory[seedItem(plot.crop!)] += randInt(...def.seeds);
  }
  Object.assign(plot, { crop: null, stage: 0, bolting: false });      // parcelle libérée
  return true;
}
```

### 6.5 Poulailler

```ts
export function layEggs(s: GameState) {
  const coop = s.buildings.poulailler;
  if (coop.level >= 5) feedAllHens(s);            // auto
  for (const hen of s.hens) {
    if (hen.fedToday) s.inventory.oeuf++;
    hen.fedToday = false;
  }
}
function feedHen(s: GameState, hen: Hen) {
  if (hen.fedToday || s.silo.ble < BLE_PAR_POULE) return;
  s.silo.ble -= BLE_PAR_POULE;
  hen.fedToday = true;
}

// v19 : abattage d'une poule. Contrairement au mouton/à la vache, la poule
// n'est pas suivie individuellement : un simple décompte (voir 6.6 bis pour
// le parallèle avec slaughter()). Rendement fixe et volontairement modeste
// (voir 8.5) pour ne jamais concurrencer la ponte, le mouton ou la vache.
export function slaughterHen(s: GameState) {
  if (s.hens.length === 0) return false;
  s.hens.pop();                                    // une poule de moins, place libérée
  s.inventory.viande_volaille += PORTIONS_ABATTAGE_POULE; // 3 (fixe)
  return true;
}
```

### 6.6 Pâturage (v19 : terrain commun aux moutons et aux vaches)

```ts
export const maxSheep = (ha: number) => Math.floor(ha / 0.05 + 1e-9);
export const maxCows = (ha: number) => Math.floor(ha / 0.15 + 1e-9); // v19

// v19 : la surface libre se calcule sur l'occupation totale du troupeau
// (moutons + vaches), pas seulement sur le nombre de moutons.
export const occupiedHa = (s: GameState) =>
  s.sheep.length * 0.05 + s.cows.length * 0.15;

export function pastureCost(s: GameState) {
  // v19 : le rang suit désormais les hectares déjà achetés au-delà de la
  // surface de départ (et non plus le nombre de moutons), pour rester correct
  // quand des vaches achètent, elles aussi, leur part de terrain par les
  // mêmes pas de 0,05 ha.
  const extraHa = Math.max(0, s.pasture.ha - 0.5);
  const rank = Math.round(extraHa / 0.05) + 1;
  return Math.round(PRIX_BASE_005HA * 1.2 ** (rank - 1));
}
```

### 6.6 bis Moutons et vaches (v19) : croissance, tonte, lait, abattage

```ts
// engine/animals.ts
export function growSheep(s: GameState) {             // appelé par sleep()
  const ok = occupiedHa(s) <= s.pasture.ha;           // v19 : troupeau entier
  for (const m of s.sheep) {
    if (ok) m.weight = Math.min(SHEEP_MAX_KG, m.weight + SHEEP_GAIN_KG);
    m.woolDays = Math.min(WOOL_DAYS, m.woolDays + 1);
  }
}

// v19 : sur le même modèle que growSheep(), appelé juste après dans sleep().
// Contrairement à la laine, le lait n'a pas de délai : il est produit chaque
// nuit, sans condition autre que la place au pâturage.
export function growCattle(s: GameState) {
  const ok = occupiedHa(s) <= s.pasture.ha;
  let milk = 0;
  for (const c of s.cows) {
    if (!ok) continue;
    c.weight = Math.min(COW_MAX_KG, c.weight + COW_GAIN_KG);
    milk += 1;
  }
  s.inventory.lait += milk;
}

export function shear(s: GameState, id: string) {
  const m = s.sheep.find(x => x.id === id);
  if (!m || m.woolDays < WOOL_DAYS) return false;
  s.inventory.laine += WOOL_PER_SHEAR;               // item vendable uniquement (edible: false)
  m.woolDays = 0;
  return true;
}

// v19 : un seul point d'entrée pour l'abattage du pâturage, qui distingue le
// mouton de la vache — jamais un stock générique de « viande ».
export function slaughter(s: GameState, id: string) {
  const si = s.sheep.findIndex(x => x.id === id);
  if (si >= 0) {
    s.inventory.viande_mouton += Math.floor(s.sheep[si].weight * MEAT_RATIO / PORTION_KG);
    s.sheep.splice(si, 1);                            // la surface reste acquise
    return;
  }
  const ci = s.cows.findIndex(x => x.id === id);
  if (ci >= 0) {
    s.inventory.viande_boeuf += Math.floor(s.cows[ci].weight * MEAT_RATIO / PORTION_KG);
    s.cows.splice(ci, 1);
  }
}
```

### 6.7 Comptoir

```ts
// engine/market.ts
const floor = (item: string) => (items[item].category === 'graine' ? 2.0 : 1.2); // 🟡

export const buyPrice = (s: GameState, item: string) =>
  items[item].sellPrice * s.market[item].coef;

export function buy(s: GameState, item: string, qty: number) {
  for (let i = 0; i < qty; i++) {
    const p = buyPrice(s, item);
    if (s.pieces < p) break;
    s.pieces -= p;
    s.inventory[item]++;
    s.market[item].coef += 0.1;
  }
}

export function sell(s: GameState, item: string, qty: number) {
  const n = Math.min(qty, s.inventory[item]);
  s.inventory[item] -= n;
  s.pieces += n * items[item].sellPrice;
  s.market[item].coef = Math.max(floor(item), s.market[item].coef - 0.1 * n);
}
// état initial : s.market[item].coef = floor(item)

// achat d'animaux (v19 : 'vache' rejoint 'poule' et 'mouton')
export const animalPrice = (_s: GameState, kind: 'poule' | 'mouton' | 'vache') =>
  ANIMAL_PRICE[kind];                                  // prix fixes (🟡 15 / 60 / 200), pas de revente

export function buyAnimal(s: GameState, kind: 'poule' | 'mouton' | 'vache') {
  // v19 : la place d'un mouton ou d'une vache se calcule sur l'occupation
  // totale du pâturage (occupiedHa), pas seulement sur les moutons.
  const room = kind === 'poule'
    ? s.animals.poule.length < coopCapacity(s)
    : kind === 'mouton'
      ? maxSheep(s.pasture.ha - s.cows.length * 0.15) - s.sheep.length > 0
      : maxCows(s.pasture.ha - s.sheep.length * 0.05) - s.cows.length > 0;
  const price = animalPrice(s, kind);
  if (!room || s.pieces < price) return false;
  s.pieces -= price;
  s.animals[kind].push(newAnimal(kind));   // les poules n'ont ni âge ni poids
  return true;
}
```

### 6.8 Recettes et stations

```ts
// engine/kitchen.ts
// une seule préparation par station : s.stations.four = { id, remaining } | null
export function startRecipe(s: GameState, id: string) {
  const r = recipes[id];
  if (s.stations[r.station]) return false;                     // station occupée
  if (!Object.entries(r.ingredients).every(([k, q]) => s.inventory[k] >= q)) return false;
  for (const [k, q] of Object.entries(r.ingredients)) s.inventory[k] -= q;
  s.stations[r.station] = { id, remaining: r.prepSeconds * prepSpeed(s) };
  return true;
}

// dans tick()
for (const [st, job] of Object.entries(s.stations)) {
  if (!job) continue;
  job.remaining -= dt * productivity(s);
  if (job.remaining <= 0) {
    s.inventory[recipes[job.id].output ?? job.id]++;
    s.stations[st] = null;                                     // station libérée
  }
}

// énergie d'un plat calculée depuis ses ingrédients
export const dishEnergy = (id: string) =>
  Math.round(1.3 * Object.entries(recipes[id].ingredients)
    .reduce((t, [k, q]) => t + (items[k].energy ?? 0) * q, 0));      // 🟡
```

### 6.9 Repas familial (150 énergies)

```ts
// engine/family.ts
export function feedFamily(s: GameState) {
  const need = s.family.reduce((t, m) => t + (m.child ? 60 : 100), 0);
  let covered = 0;
  const eatenToday = new Set<string>();
  const reserved = s.seedReserve;          // 🟡 graines protégées choisies par le joueur
  const edible = Object.keys(s.inventory)
    .filter(k => items[k].edible && s.inventory[k] > (reserved[k] ?? 0))
    .sort((a, b) => expiresSoonest(s, a) - expiresSoonest(s, b)  // 🟡 d'abord ce qui périme
                 || items[b].energy - items[a].energy);
  for (const k of edible) {
    if (covered >= need) break;
    const n = Math.min(s.inventory[k] - (reserved[k] ?? 0), Math.ceil((need - covered) / items[k].energy));
    s.inventory[k] -= n;
    covered += n * items[k].energy;
    if (n > 0) eatenToday.add(k);
  }
  s.report.coverage = Math.min(1, covered / need);
  const dishBonus = Math.min(3, [...eatenToday].filter(k => items[k].dish).length); // 🟡
  updateHealth(s, s.report.coverage, dishBonus);
}

export function updateHealth(s: GameState, c: number, bonus = 0) {
  const delta = (c >= 1 ? 5 : c >= 0.75 ? -5 : c >= 0.5 ? -10 : -20) + bonus;   // 🟡
  for (const m of s.family) m.health = Math.max(0, Math.min(100, m.health + delta));
}

export function productivity(s: GameState) {
  const h = s.family.reduce((t, m) => t + m.health, 0) / s.family.length;
  return h >= 80 ? 1 : h >= 50 ? 0.8 : h >= 20 ? 0.5 : 0.25;         // 🟡
}
// productivity(s) ne s'applique qu'aux actions au clic : récolte manuelle,
// arrosage / nourrissage manuels, préparations. Jamais aux automatisations.

export const careCost = (s: GameState) => Math.round(20 * 1.5 ** s.caresPaid);   // 🟡

export function heal(s: GameState, memberId: string) {
  const m = s.family.find(x => x.id === memberId);
  const cost = careCost(s);
  if (!m || m.health > 0 || s.pieces < cost) return false;
  s.pieces -= cost;
  s.caresPaid++;
  m.health = 50;
  return true;
}
```

### 6.9 ter Saisons

```ts
// data/seasons.ts
export const SEASON_LENGTH = 10;
export const seasons = ['printemps', 'ete', 'automne', 'hiver'] as const;
export const seasonMods = {
  printemps: { solar: 1.0, garden: 1.1, water: 1.0, field: 1.0, sheep: 1.2 },
  ete:       { solar: 1.3, garden: 1.0, water: 1.3, field: 1.2, sheep: 1.0 },
  automne:   { solar: 0.9, garden: 1.0, water: 0.9, field: 0.9, sheep: 1.0 },
  hiver:     { solar: 0.7, garden: 0.7, water: 0.8, field: 0.7, sheep: 0.8 },
};
export const currentSeason = (day: number) =>
  seasons[Math.floor(day / SEASON_LENGTH) % 4];
// la serre n'applique pas seasonMods.garden
```

### 6.9 bis Le bouton « Dormir »

```ts
// engine/day.ts — l'ordre compte
export const MIN_AWAKE_S = 30;   // validé ; 🟡 réductible par l'arbre techno

export const canSleep = (s: GameState) => s.awakeSeconds >= awakeRequired(s);

export function sleep(s: GameState) {
  if (!canSleep(s)) return;
  feedFamily(s);          // 1. repas + santé
  autoTasks(s);           // 2. automatisations niveau 5 (arrosage, nourrissage)
  growAll(s);             // 3. pousse
  layEggs(s);             // 4. ponte
  growSheep(s);           // 5. moutons
  growCattle(s);          // 5 bis (v19) : vaches, juste après les moutons
  nightPower(s);          // 6. bloc nocturne du frigo (30 s)
  fridgeNight(s);         //    panne éventuelle du frigo
  spoil(s);               // 7. péremption (hors frigo, + frigo si panne > 50 %)
  s.day++;
  s.awakeSeconds = 0;     // relance le compte à rebours
  s.report = buildMorningReport(s);   // écran de réveil
  save(s);
}
```

### 6.9 quater Réfrigérateur alimenté en continu

```ts
// engine/tick.ts — appelé à chaque tick, après la production solaire
export function fridgeTick(s: GameState, dt: number) {
  if (!s.fridge.built) return;
  const units = Object.values(s.fridge.items).reduce((t, x) => t + x.qty, 0);
  const need = (FRIDGE_BASE + FRIDGE_PER_UNIT * units) * dt;       // 🟡
  const powered = s.stock.kwh >= need;
  if (powered) s.stock.kwh -= need;
  s.fridge.poweredSeconds += powered ? dt : 0;
  s.fridge.awakeSeconds += dt;
  s.fridge.on = powered;                                             // UI : ❄️ / ⚠️
}

// au Dormir : bloc nocturne de 30 s prélevé d'un coup
export function nightPower(s: GameState) {
  if (!s.fridge.built) return;
  const units = Object.values(s.fridge.items).reduce((t, x) => t + x.qty, 0);
  const need = (FRIDGE_BASE + FRIDGE_PER_UNIT * units) * NIGHT_BLOCK_S; // 30 s
  if (s.stock.kwh >= need) s.stock.kwh -= need;
  else { s.stock.kwh = 0; s.fridge.poweredSeconds = 0; }             // nuit = panne
}

// puis : si panne > 50 % de la journée, le contenu vieillit d'une nuit
export function fridgeNight(s: GameState) {
  const ratio = s.fridge.poweredSeconds / Math.max(1, s.fridge.awakeSeconds);
  if (ratio < 0.5) for (const lot of Object.values(s.fridge.items)) lot.nightsLeft--;
  s.fridge.poweredSeconds = s.fridge.awakeSeconds = 0;
}
```

### 6.9 quinquies Péremption

```ts
// data/items.ts : shelfLife en nuits (undefined = ne périme pas)
// s.inventory.lots[item] = [{ qty, nightsLeft }]  — s.fridge[item] = qty
export function spoil(s: GameState) {
  for (const [item, lots] of Object.entries(s.inventory.lots)) {
    for (const lot of lots) lot.nightsLeft--;
    const lost = lots.filter(l => l.nightsLeft <= 0).reduce((t, l) => t + l.qty, 0);
    s.inventory.lots[item] = lots.filter(l => l.nightsLeft > 0);
    if (lost) s.report.spoiled[item] = lost;
  }
}

// retrait : toujours dans le lot le plus ancien (FIFO)
export function take(s: GameState, item: string, qty: number) {
  const lots = s.inventory.lots[item].sort((a, b) => a.nightsLeft - b.nightsLeft);
  for (const lot of lots) {
    const n = Math.min(lot.qty, qty);
    lot.qty -= n; qty -= n;
    if (!qty) break;
  }
  s.inventory.lots[item] = lots.filter(l => l.qty > 0);
}
```

### 6.10 Boucle, hors-ligne, sauvegarde
- **Pas de temps fixe** (200 ms) pour les flux d'énergie, d'eau et les minuteurs ; les jours ne passent **que** via `sleep()`.
- **Temps d'éveil minimal** : `tick()` incrémente `s.awakeSeconds` ; le bouton Dormir est actif quand `canSleep(s)` est vrai. 🟡 Le temps hors-ligne compte comme temps d'éveil (au retour, on peut dormir tout de suite).
- **Hors-ligne** : seuls les flux (batterie, eau) et les minuteurs de recettes avancent, plafonnés par les capacités ; **aucun jour ne passe** sans le joueur. 🟡 Un nœud tardif de l'arbre techno (« Routine familiale ») pourrait permettre de dormir automatiquement une fois toutes les automatisations débloquées.
- **Sauvegarde** JSON versionnée avec migrations, auto toutes les 10 s, export / import.

### 6.11 Interface
- **Ferme** : grille de parcelles avec stades visibles et bouton 💧 ; poulailler avec bouton 🌾 ; jauges kWh / L.
- **Inventaire** : onglets Frais / Frigo / Silo / Graines / Plats ; indicateur de péremption ; 🟡 curseur **« Réserve de semences »** par item (patates, blé, graines de tournesol) que la famille ne mangera pas.
- **Parcelle** : vide → menu « Planter » (graines disponibles) ; mature → « Récolter » ou, pour la carotte, « Laisser monter en graine ».
- **Livre de recette** (onglet, pas un objet) : point d'entrée unique pour lancer les plats ; recettes réalisables en surbrillance, ingrédients manquants signalés ; chaque station (🍳 Cuisine, 🔥 Four, ⚙️ Moulin, 🌻 Presse) affiche **libre** ou **occupée** avec son minuteur ; les recettes d'une station occupée sont grisées.
- **Comptoir** : l'onglet Vendre inclut les articles rangés au frigo (v23) ; onglets Vendre / Acheter / Graines (badge « dépannage ») / Animaux / Arbres ; prix d'achat actuel et coefficient affichés ; animaux grisés si le poulailler ou le pâturage est plein. Le blé apparaît à la fois dans Acheter (à prix normal, comme ingrédient) et dans Graines (comme semence du Champ), sans doublon d'objet ; les autres onglets Graines restent réservés aux items de catégorie « graine ».
- **Famille** : 4 portraits avec barre de santé, jauge 150 énergies, % d'autonomie, multiplicateur de productivité.
- **Bouton « Dormir »** toujours visible : grisé avec compte à rebours tant que l'éveil minimal n'est pas atteint, puis aperçu « Repas prévu : 130 / 150 énergies ⚠️ ».
- **Portrait malade** : icône 🤒 et bouton « Soigner (X pièces) ».
- **Calendrier** : saison en cours, nuit n / 10, icônes des modificateurs actifs.
- **Réfrigérateur** : icône ❄️ (alimenté) / ⚠️ (en panne), consommation actuelle en kWh/s, alerte si la batterie ne tiendra pas la nuit.
- **Moutons** : fiche par animal (poids, jauge de laine, boutons ✂️ Tondre / 🔪 Abattre).
- **Poules** : simple compteur « nourries / total » ; aucune fiche individuelle nécessaire.

---

## 7. Feuille de route

| Étape | Contenu |
|---|---|
| 0 | Store, boucle, panneau → batterie → pompe → eau, bouton Dormir, écran de réveil |
| 1 | Potager (carotte, patate), kit de départ, planter / arroser / récolter, graines issues des récoltes, repas familial, santé |
| 2 | Inventaire, Comptoir avec prix dynamiques, graines en dépannage |
| 3 | Champ (blé), Silo, achat de poules, Poulailler au clic, ponte |
| 4 | Moulin, Presse, Four, tournesol, recettes avec minuteur, énergie et bonus des plats |
| 5 | Pâturage, achat de moutons et de vaches (v19) et de surface, croissance, tonte, lait, abattage |
| 6 | Arbre techno, automatisations niveau 5, semis automatique |
| 7 | Saisons légères, Serre, Verger, péremption par lots, Réfrigérateur, soins |
| 8 | Chapitres, hors-ligne, finitions, mobile |

---

## 8. Tableau d'équilibrage ✅

> Valeurs **validées comme base de départ**. Le rythme cible (100 % d'autonomie vers la nuit 60) est adopté ; les chiffres pourront être affinés avec le script de simulation (section 6) sans changer les règles. Unités : **pièces** (💰), **nuits**, **L**, **kWh**, **s** (secondes d'éveil).

### 8.1 Départ de partie

| Élément | Valeur |
|---|---|
| Pièces | 350 |
| Conserves (non périssables, 25 énergie depuis le §4, vendables 3 💰, non rachetables) ✅ | 160 → 10 nuits d'autonomie |
| Graines | 10 carotte, 6 patates, 4 tomate |
| Bâtiments | Panneau niv. 1, Batterie niv. 1, Puit + Pompe niv. 1, Potager niv. 1 |
| Famille | 4 membres, santé 100 |
| Saison | Printemps, nuit 1 |

Les conserves laissent le temps de lancer le potager avant que la santé ne soit menacée.

### 8.2 Énergie et eau

| Niveau | Panneau (Wh/s) | Batterie (Wh) | Pompe (L/s) | Réservoir (L) | Coût amélioration 💰 |
|---|---|---|---|---|---|
| 1 | 30 | 5 000 | 1 | 40 | départ |
| 2 | 50 | 10 000 | 2 | 80 | 40 |
| 3 | 80 | 20 000 | 4 | 160 | 100 |
| 4 | 120 | 40 000 | 6 | 300 | 250 |
| 5 | 180 | 80 000 | 10 | 500 | 600 |

- Pompe : **10 Wh par litre** pompé.
- Chaque appareil s'améliore séparément, avec la même grille de coûts.
- Repère : une heure de jeu (30 s) avec un panneau de niveau 1 → 900 Wh, soit de quoi pomper 90 L.

**Parc d'appareils** ✅

| Élément | Valeur 🟡 |
|---|---|
| Panneau supplémentaire | 60 💰 × 120 %ⁿ, arrondi supérieur (n = panneaux déjà possédés) : 60, 72, 87, 104… |
| Batterie supplémentaire | 80 💰 × 120 %ⁿ, arrondi supérieur |
| Départ | 1 panneau et 1 batterie de niveau 1 |
| Usure | +1 point toutes les 2 heures de fonctionnement ; aucune usure à l'arrêt |
| Effet de l'usure | rendement = 100 − ⌊usure ÷ 2⌋ % |
| Seuil « à entretenir » | 70 % d'usure |
| Panne | à 100 % d'usure, l'appareil s'arrête |
| Entretien | 20 % du prix d'achat (arrondi supérieur), remet l'usure à 0 |
| Réparation | 50 % du prix d'achat (arrondi supérieur) |
| Batteries | remplissage dans l'ordre, décharge en sens inverse |

| Consommateur | Consommation |
|---|---|
| Moulin | 1 blé → 1 farine, 5 s, 20 Wh/s |
| Presse | 3 graines de tournesol → 1 huile, 10 s, 30 Wh/s |
| Réfrigérateur | 5 Wh/s + 50 mWh/s par unité stockée ; bloc nocturne = 30 s |
| Four, Cuisine | pas d'électricité (bois / gaz implicite) |

### 8.3 Cultures

| Plante | Lieu | Stades (nuits) | Eau / arrosage | Rendement | Graines | Énergie / unité | Vente 💰 |
|---|---|---|---|---|---|---|---|
| Carotte | Potager | 4 | 2 L | 10 | montée en graine : +2 nuits → 6 graines | 8 | 1 |
| Patate | Potager | 6 | 3 L | 8 | 1 patate = 1 plant | 19 | 2 |
| Tomate | Potager, Serre | 5 | 3 L | 10 | +1 à 2 | 8 | 1 |
| Courgette | Potager, Serre | 5 | 4 L | 6 | +1 à 2 | 10 | 2 |
| Aubergine | Potager, Serre | 6 | 4 L | 6 | +1 à 2 | 10 | 2 |
| Blé | Champ | 7 | 2 L | 8 | 1 blé = 1 graine | — | 1 |
| Tournesol | Champ | 7 | 2 L | 9 graines | 1 graine = 1 plant | — | 1 |
| Oignon | Potager | 5 | 3 L | 8 | +1 à 2 | 6 | 1 |
| Ail | Potager | 6 | 2 L | 6 | 1 ail = 1 plant | 6 | 2 |
| Poivron | Potager, Serre | 6 | 4 L | 6 | +1 à 2 | 7 | 2 |
| Épinard | Potager | 3 | 3 L | 8 | +1 à 2 | 5 | 1 |
| Fraise | Potager | 4 | 3 L | 10 | +2 à 3 | 5 | 2 |
| Riz | Champ | 8 | 4 L | 10 | 1 riz = 1 graine | 10 | 1 |
| Houblon | Champ | 6 | 2 L | 6 | 1 houblon = 1 graine | — | 3 |
| Cacao *(Serre uniquement)* | Serre | 8 | 3 L | 5 | 1 fève = 1 plant | — (non comestible) | 8 |
| Vanille *(Serre uniquement)* | Serre | 10 | 2 L | 3 | 1 gousse = 1 plant | — (non comestible) | 15 |
| Café *(Serre uniquement)* | Serre | 8 | 3 L | 6 | 1 grain = 1 plant | — (non comestible) | 6 |

Graines de légumes : vente 1 💰 ; achat en dépannage au coefficient 2,0 (soit 2 💰 la première).

**Point de vigilance (riz)** : le riz demande 4 L par arrosage au Champ, contre 2 L pour le blé — soit le double. La pompe et le réservoir (§8.2) ne changent pas : au niveau 1 (1 L/s, réservoir 40 L), planter beaucoup de riz en même temps peut mettre le débit d'eau sous tension si le joueur ne monte pas la pompe en parallèle. Aucune règle de pompe n'a été modifiée pour cette raison ; à surveiller au playtest / avec le script de simulation (§6).

**Rendement moyen par parcelle** (énergie / nuit, graine déduite, mis à jour au §4) : carotte ≈ 20 · patate ≈ 22 · tomate ≈ 16 · courgette ≈ 12 · aubergine ≈ 10.

| Niveau | Parcelles Potager | Parcelles Champ | Coût Potager 💰 | Coût Champ 💰 |
|---|---|---|---|---|
| 1 | 6 | 4 | départ | 60 (construction) |
| 2 | 9 | 6 | 80 | 120 |
| 3 | 12 | 9 | 200 | 280 |
| 4 | 16 | 12 | 450 | 600 |
| 5 | 20 + **arrosage auto** | 16 + **arrosage auto** | 1 000 | 1 300 |

| Autre | Valeur |
|---|---|
| Serre (construction) | 400 💰, 6 parcelles, +3 par niveau (300 / 600 / 1 000 / 1 800 💰) |
| Semis automatique (nœud techno) | 1 500 💰, prérequis Potager niv. 5 |

### 8.4 Verger

| Élément | Valeur |
|---|---|
| Emplacements de départ | 2 (débloqués au chapitre 6) |
| Emplacement supplémentaire | 50 💰 × 1,25ⁿ (n = emplacements déjà achetés) |
| Pommier / Poirier | 40 💰, prix fixe |
| Délai avant première récolte | 15 nuits |
| Production | 6 fruits toutes les 3 nuits, pendant les 5 dernières nuits de l'été et tout l'automne |
| Arrosage | aucun |
| Fruit | 10 énergie (§4), vente 2 💰 |

Un arbre adulte donne environ **30 fruits par an** (≈ 300 énergie).

### 8.5 Poulailler et poules

| Niveau | Capacité | Coût 💰 |
|---|---|---|
| 1 | 4 poules | 40 (construction) |
| 2 | 8 | 100 |
| 3 | 12 | 220 |
| 4 | 16 | 450 |
| 5 | 24 + **nourrissage auto** | 900 |

| Poule | Valeur |
|---|---|
| Prix | 15 💰 (fixe, pas de revente vivante) |
| Consommation | 0,5 blé / nuit |
| Production | 1 œuf / nuit si nourrie (13 énergie depuis le §4, vente 2 💰) |
| Silo (niv. 1 → 5) | 20 · 50 · 100 · 200 · 400 blé (coûts 30 · 80 · 180 · 400) |
| **Abattage (v19)** | **rendement fixe : 3 portions de `viande_volaille`** (14 énergie chacune, vente 6 💰 depuis v21, 3 💰 avant), quel que soit l'historique de la poule. La poule quitte le cheptel : elle ne pond plus, ne mange plus de blé ; sa place se libère (rachat au Comptoir, jamais automatique). |

Repère : 12 poules = 156 énergie / nuit et 6 blé / nuit, soit environ 6 parcelles de blé.

Repère (v19, équilibrage de l'abattage) : abattre une poule tout de suite rendait 3 × 3 = **9 💰** de viande, contre un prix d'achat de **15 💰** — une perte sèche. 🟡 **Depuis v21** elle rend 3 × 6 = **18 💰** : plus que le prix d'achat. La ponte reste plus rentable sur la durée (1 œuf/nuit à 4 💰 depuis v21), mais l'abattage n'est plus une perte sèche (décision ouverte, voir 8.9).

### 8.6 Pâturage, moutons et vaches (v19)

| Élément | Valeur |
|---|---|
| Déblocage du pâturage (0,5 ha, 10 moutons **ou** 3 vaches, ou un mélange) | 150 💰 |
| 0,05 ha supplémentaire | 40 💰 × 1,2ⁿ⁻¹ (n = rang de l'achat de surface au-delà de la surface de départ — le terrain est commun aux moutons et aux vaches, voir 1.4) |
| Mouton | 60 💰 (fixe, pas de revente), 0,05 ha |
| Poids de départ / gain / max (mouton) | 20 kg / +0,5 kg par nuit / 50 kg |
| Viande de mouton à l'abattage | `viande_mouton` = poids × 50 % ÷ 0,5 kg → 20 à 50 portions (38 énergie depuis le §4, vente 10 💰 depuis v21, 5 💰 avant) |
| Tonte | toutes les 7 nuits → 1 laine (vente 12 💰 depuis v21, 6 💰 avant ; non périssable) |
| **Vache (v19)** | **200 💰** (fixe, pas de revente), **0,15 ha** (3× un mouton) |
| Poids de départ / gain / max (vache) | 40 kg / +1 kg par nuit / 150 kg |
| **Lait (v19)** | **1 lait / nuit et par vache, dès l'achat**, sans condition de maturité — tant que le pâturage suffit au troupeau entier (16 énergie, vente 8 💰 depuis v21, 4 💰 avant ; périssable 4 nuits comme l'épinard) |
| **Viande de bœuf à l'abattage (v19)** | `viande_boeuf` = poids × 50 % ÷ 0,5 kg → 20 à 150 portions (même barème que le mouton : 38 énergie, vente 10 💰 depuis v21, 5 💰 avant) |

Repère : un mouton élevé jusqu'à 50 kg (60 nuits) rapporte **8 laines (96 💰 depuis v21, 48 💰 avant)** puis **50 portions (1 900 énergie)**.

Repère (v19) : une vache élevée jusqu'à 150 kg (110 nuits) rapporte **110 laits (880 💰 de vente depuis v21, 440 💰 avant)** en cours d'élevage, puis **150 portions de bœuf (5 700 énergie)** à l'abattage — exactement 3× le rendement en viande d'un mouton au maximum (50 portions), le même rapport que l'occupation au sol (0,15 ha contre 0,05 ha) : à surface égale, élever des vaches ou des moutons donne la même viande totale, la vache ajoutant en plus le revenu régulier du lait, en échange d'un investissement de départ et d'une croissance plus lents.

### 8.7 Stations et bâtiments

| Bâtiment | Coût 💰 | Débloque |
|---|---|---|
| Four | 100 | onglet Livre de recette ; pain, gratin, tarte |
| Cuisine | 150 | omelette, ratatouille, ragoût, compote |
| Moulin | 120 | farine |
| Presse | 150 | huile |
| Réfrigérateur | 600 | conservation sans péremption |
| Préparation −20 % (nœud techno) | 400 puis 900 | temps de préparation réduits |
| Éveil minimal −10 s (nœud techno) | 300 puis 800 | 30 s → 20 s → 10 s |

### 8.8 Santé et soins

| Élément | Valeur |
|---|---|
| Santé | 0–100, départ 100 |
| Variation nocturne | +5 (100 %) · −5 (75–99 %) · −10 (50–74 %) · −20 (< 50 %) |
| Bonus plats | +1 par plat différent mangé, max +3 |
| Productivité (clics seulement) | ×1 (≥ 80) · ×0,8 (50–79) · ×0,5 (20–49) · ×0,25 (< 20) |
| Soin (santé 0 → 50) | 20 💰 × 1,5ⁿ |
| Sans soin | +2 par nuit bien nourrie |

### 8.9 Prix de vente (fixes)

| Item | 💰 | Item | 💰 | Item | 💰 |
|---|---|---|---|---|---|
| Carotte | 2 | Œuf | 4 | Farine | 2 |
| Patate | 4 | Viande (mouton / bœuf) | 10 | Huile | 4 |
| Tomate | 2 | Viande de volaille | 6 | Laine | 12 |
| Courgette | 4 | Lait | 8 | Blé | 2 |
| Aubergine | 4 | Pomme / Poire | 4 | Pain | 8 |
| Oignon / Épinard / Riz | 2 | Ail / Poivron / Fraise | 4 | Conserve | 3 |
| Houblon | 6 | Cacao | 16 | Graines | 1 |
| Vanille | 30 | Café | 12 | | |

**Règle v21 : productions de la ferme ×2.** Les prix ci-dessus des récoltes, fruits et produits animaux valent 2 × leur valeur d'origine (carotte 1, patate 2, œuf 2, viande 5, laine 6, blé 1, pomme/poire 2, cacao 8, vanille 15, café 6, houblon 3, lait 4, volaille 3, etc.). Le multiplicateur (`DATA.MARCHE.MULTIPLICATEUR_PRODUCTION`) est appliqué à la source par `applyProductionPriceMultiplier()`. Doublés en v22 : farine (1 → 2) et pain (4 → 8). Inchangés : graines, conserve, huile, bâtiments, appareils, animaux, arbres, soins, améliorations. Le prix d'achat au Comptoir reste prix de vente × coefficient : il double donc lui aussi pour ces productions (carotte : 2,4 au départ au lieu de 1,2).

Plats cuisinés : prix de vente = somme des ingrédients × 1,3, arrondi (formule inchangée, **pas de ×2 supplémentaire** : les ingrédients sont déjà doublés ; ex. gratin de patates 10 → 21, ragoût 18 → 36). Prix d'achat = vente × coefficient (plancher 1,2 ; graines 2,0 ; +0,1 par unité achetée, −0,1 par unité vendue).

**🟡 Décisions de game design ouvertes (v21)** :
- **Abattage des poules** : 3 × 6 = 18 💰 de viande pour une poule achetée 15 💰 (avant : 9 💰). La note d'équilibrage de v19 (« jamais une perte évitée ») ne tient plus. À trancher : réduire `portionsAbattage`, ou revoir le prix de la volaille, ou accepter.
- **Ratio graines / récolte** : les graines restent à 1 💰 de vente (achat 2,0 au plancher) alors que les récoltes valent le double ; produire est encore plus avantageux qu'acheter, ce qui va dans le sens voulu, mais l'écart de dépannage grandit.
- **Courbe de progression cible (8.10)** : les revenus de vente doublent ; la courbe et les achats du bot de simulation (`simulate.mjs`) n'ont pas été recalibrés.
- **Meunerie** : depuis v22, la farine (2 💰) vaut autant que le blé qu'elle transforme (2 💰) ; le Moulin ne fait donc plus perdre de valeur à la vente. La **Presse** est inchangée : 3 graines de tournesol (1 💰 chacune) donnent 1 huile à 4 💰, elle crée déjà de la valeur.

**🟡 Décisions de game design ouvertes (v22)** :
- **Pain à 8 via un coefficient dédié (1,6)** : la formule normale des plats (×1,3) donnerait 7. Le coefficient 1,6 est un réglage choisi pour obtenir exactement le double ; si l'on préfère laisser la formule agir (pain à 7), il suffit de retirer `priceMultiplier` de la recette `pain`.
- **Plats à base de farine ou de pain** : ils montent de 3 à 5 💰 (voir v22) sans que leurs propres recettes aient été retouchées.

### 8.10 Courbe de progression cible

> 🟡 **À rediscuter depuis le §4/v17** : cette courbe a été calée avec les
> valeurs nutritionnelles d'avant l'augmentation de 25 %. Les rendements de
> récolte (unités/nuit) n'ont pas changé, mais chaque unité valant 25 % de
> plus en énergie, l'autonomie mesurée par `simulate.mjs` franchit désormais
> les paliers ci-dessous plus tôt que prévu (vérifié : 75 %/90 %/100 % sont
> atteints largement avant les nuits 25/40/60 avec le joueur automatique
> « appliqué »). Deux options, à trancher par un⋅e game designer : (a)
> accepter que l'autonomie progresse plus vite (et mettre à jour cette
> courbe et `DATA.SIMULATION`) ; (b) revoir à la baisse un autre paramètre
> (rendements, coûts d'amélioration) pour retrouver le rythme visé. Ce choix
> n'a pas été fait ici : seule la valeur nutritionnelle des aliments a été
> modifiée, conformément à la demande.

| Étape | Nuit visée | Production estimée | Autonomie |
|---|---|---|---|
| Départ | 1 | conserves | 0 % (réserve de 10 nuits) |
| Potager niv. 2 | ~8 | 9 parcelles ≈ 120 | ~35 % |
| + 4 poules, Champ | ~15 | 120 + 40 | ~50 % |
| Potager niv. 3, 8 poules | ~25 | 170 + 80 | ~75 % |
| Four, pain, premiers moutons | ~40 | 250 + plats + viande | ~90 % |
| Potager niv. 5, 12 poules, verger | ~60 | 300 + 120 + fruits + viande | **100 %** |

### 8.11 Points de vigilance pour les tests

- **Coefficient d'achat** ✅ : il ne redescend **qu'à la vente**. C'est un choix assumé : le Comptoir est un **dépannage**, pas une source de nourriture durable. Un aliment acheté régulièrement devient de plus en plus cher, ce qui pousse à le produire. À vérifier en simulation : qu'un joueur en difficulté puisse encore acheter quelques unités sans être bloqué. L'interface doit afficher clairement le prix de la prochaine unité.
- **Argent en début de partie** : le Potager niv. 2 (80 💰) doit rester atteignable avant la fin des conserves (vente de quelques conserves et des premiers surplus de carottes).
- **Transition 35 % → 50 %** : les 160 conserves ✅ doivent couvrir cette phase, où la santé baisserait de 20 par nuit.

---

## 9. Récapitulatif des décisions et prochaines étapes

### Décisions validées ✅

| Domaine | Décision |
|---|---|
| Temps | Bouton **Dormir**, éveil minimal **30 s**, saisons **légères** de 10 nuits |
| Santé | Malus de productivité sur les **actions au clic uniquement** ; **soins payants** à 0 |
| Cultures | Pousse d'un stade par nuit arrosée ; parcelle libérée après récolte ; graines issues des récoltes (système par plante) + dépannage au Comptoir ; **semis automatique** via l'arbre techno |
| Verger | Arbres **achetés** au Comptoir ; emplacements limités, **extensibles par achat de surface** |
| Animaux | Achat au Comptoir à **prix fixes**, **sans revente vivante** ; poule qui **pond à vie** (v19 : ou s'abat, rendement fixe et modeste) ; mouton : **laine tondue** (vente uniquement), **viande_mouton à l'abattage** ; **vache (v19)** : **lait chaque nuit** dès l'achat, **viande_boeuf à l'abattage** (0,15 ha, 3× le mouton) |
| Cuisine | **Livre de recette = onglet** ouvert par le **Four** ; **une station de chaque type**, une préparation à la fois |
| Stockage | Inventaire et Réfrigérateur **illimités** ; péremption **5 à 7 nuits** ; frigo alimenté **en continu** + **bloc nocturne de 30 s** ; batterie **sans autodécharge** |
| Économie | Prix de vente **fixes** ; coefficient d'achat **+0,1 / achat, −0,1 / vente uniquement**, plancher 1,2 (graines 2,0) |
| Départ | 350 💰 + **160 conserves** (10 nuits) |
| Rythme | **100 % d'autonomie vers la nuit 60** |

### Ajouts de la v15 ✅

| Domaine | Décision |
|---|---|
| Heure | Journée à partir de 6 h, 1 h = 30 s d'éveil, **heure d'ambiance** sans effet sur la production |
| Parc | Plusieurs **panneaux** et plusieurs **batteries**, chacun avec niveau, usure et interrupteur |
| Prix | Chaque appareil supplémentaire coûte **1,2 fois le précédent** |
| Batteries | Remplissage **l'une après l'autre**, décharge en sens inverse ; puissance soutirée affichée |
| Appareils | **Usure et entretien** : −0,5 point par heure d'usage, panne à 100 %, entretien à 20 % du prix |
| Interrupteurs | Bascule **rouge / verte** sur chaque appareil de production et de consommation |
| Interface | En-tête : nuit, **heure**, **eau du réservoir**, pièces. Jauges du panneau et du réservoir retirées. **Pompe et Réservoir séparés**. Cartes « Production d'énergie » et « Stockage d'énergie » ouvrant la liste des appareils |

### Prochaines étapes

1. **Prototype (étape 0 de la feuille de route)** : store, boucle de tick, panneau → batterie → pompe, bouton Dormir, écran de réveil.
2. **Script de simulation** : jouer automatiquement 60 nuits avec les valeurs de la section 8 et vérifier la courbe de progression et les points de vigilance (8.11).
3. **Étapes 1 à 8** de la feuille de route, en ajustant les chiffres après chaque étape.
