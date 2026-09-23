# Ferme Familiale — Idle Game d'autonomie alimentaire
## Document de conception v15 : 3 structures organisationnelles & stratégie de développement web

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
| Adulte | 2 | 100 énergies | 200 |
| Enfant | 2 | 60 énergies | 120 |
| **Famille** | 4 | — | **320 énergies / jour** |

La famille consomme **œufs, viande, légumes, fruits, pain et plats cuisinés**. L'huile, la farine et le blé sont des ingrédients, pas des aliments consommés directement.

Valeurs énergétiques (validées, détail en section 8) :

| Aliment | Énergie / unité | Aliment | Énergie / unité |
|---|---|---|---|
| Œuf | 10 | Patate | 15 |
| Viande (portion 0,5 kg) | 30 | Aubergine | 8 |
| Carotte | 6 | Courgette | 8 |
| Tomate | 6 | Pomme / Poire | 8 |
| Pain | 26 | Conserve (départ) | 20 |
| Plats cuisinés | voir 1.4 | | |

*Ingrédients non consommables seuls, mais comptés dans l'énergie des plats* : farine 10, huile 10.

*Exemple d'une journée à 320 énergies* : 1 ragoût (113) + 2 pains (52) + 1 omelette (52) + 4 patates (60) + 6 carottes (36) + 1 pomme (8) = **321**.

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
Serre   ─ graine ─► tomate · courgette · aubergine
Champ   ─ graine ─► blé · tournesol
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
Pâturage (ha)   ─► Mouton (poids) ─► Viande | Laine
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
- Chaque plante a son propre mode de reproduction (**validé**, quantités 🟡) :

| Plante | Comment obtenir des graines |
|---|---|
| Tomate, courgette, aubergine | Chaque récolte rend aussi 🟡 1 à 2 graines |
| Patate | On garde des patates : 1 patate = 1 plant (choix manger / replanter) |
| Blé | On garde du blé : 1 blé = 1 graine (choix manger via farine / nourrir les poules / replanter) |
| Tournesol | La récolte donne des graines : à **replanter** ou à **presser** en huile (même ressource) |
| Carotte | 🟡 Option « Laisser monter en graine » : la plante reste 2 stades de plus et donne des graines au lieu de carottes |
| Pommier, poirier | Arbres permanents : pas de graines ; nouveaux arbres **achetés au Comptoir** |

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
| Pain | 2 farine + 1 L eau | Four | 20 s | 26 |
| Omelette | 3 œufs + 1 huile | Cuisine | 15 s | 52 |
| Ratatouille | 1 tomate + 1 courgette + 1 aubergine + 1 huile | Cuisine | 30 s | 42 |
| Gratin de patates | 3 patates + 1 œuf | Four | 30 s | 72 |
| Ragoût | 2 viande + 2 carottes + 1 patate | Cuisine | 45 s | 113 |
| Compote | 3 pommes ou 3 poires | Cuisine | 15 s | 31 |
| Tarte aux pommes | 2 farine + 3 pommes + 1 œuf | Four | 45 s | 70 |

Énergie = somme des ingrédients × 1,3, arrondie. Les temps sont calés sur le temps d'éveil minimal (30 s) : on peut lancer au moins une recette courte par journée, et une recette longue continue pendant la nuit.

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
| Blé, farine, huile, graines, laine | jamais |

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
- Poules et moutons s'obtiennent **uniquement par achat au Comptoir** (pas de reproduction).
- Un achat n'est possible que s'il reste de la place :
  - poule → **capacité du Poulailler** ;
  - mouton → **surface de pâturage** (0,05 ha / mouton ; au-delà de 10, acheter d'abord la surface au prix × 1,2ⁿ).
- **Prix fixes**, quel que soit le nombre d'animaux possédés : 🟡 poule 15 pièces, mouton 60 pièces. La croissance est freinée par la capacité du Poulailler et par le coût du pâturage (× 1,2 par mouton au-delà de 10), pas par le prix de l'animal.
- **Pas de revente** d'animaux vivants : un achat est définitif. Un mouton ne quitte la ferme que par l'abattage.
- Un mouton abattu doit être **racheté** : l'abattage a un vrai coût.
- **La poule pond toute sa vie** : pas de vieillissement, pas de baisse de ponte, pas d'abattage. Une poule est un investissement permanent, tant qu'elle est nourrie. Elle ne fournit jamais de viande : la viande vient uniquement des moutons.

**🐑 Mouton : laine régulière, viande à l'abattage**
- Le mouton **grossit chaque jour** tant que le pâturage suffit (🟡 jusqu'à un poids maximal).
- La **laine repousse** : tonte possible tous les 🟡 7 jours → 🟡 1 unité de laine, sans perte du mouton.
- **Abattage** au clic : viande = poids × 🟡 50 % (rendement carcasse). Le mouton disparaît et libère sa place de pâturage (la surface achetée reste acquise).
- **La laine sert uniquement à la vente** au Comptoir : c'est un revenu régulier en pièces, sans usage d'artisanat ni effet sur la santé. Elle n'est pas périssable.
- Tension de jeu : garder un mouton pour la laine (pièces régulières) ou l'abattre pour nourrir la famille (viande immédiate).

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
| Poule | {1 œuf / jour si nourrie, à vie}, {blé / jour}, {pas de vieillissement ni d'abattage} |
| Pâturage | {surface ha}, {0,05 ha / mouton}, {prix base × 1,2ⁿ} |
| Mouton | {poids, croissance / jour, poids max}, {rendement viande}, {jours entre tontes}, {laine / tonte}, {prix de vente de la laine} |
| Réfrigérateur | {capacité illimitée}, {conservation tant qu'alimenté}, {conso kWh permanente : base + par unité}, {seuil de panne} |
| Inventaire | {illimité}, {lots datés : nuits restantes} |
| Station (Cuisine, Four, Moulin, Presse — 1 exemplaire chacune) | {occupée / libre}, {préparation en cours}, {temps restant} |
| Recette | {ingrédients}, {station : cuisine / four}, {temps de préparation}, {énergie = ingrédients × 1,3}, {bonus santé} |
| Plante | {stades}, {rendement}, {graines rendues}, {mode de reproduction} |
| Comptoir | {prix de vente}, {coef d'achat dynamique : plancher 1,2 (graines 2,0)}, {prix de vente fixes}, {prix fixes poule / mouton} |
| Famille | {AJ adulte 100}, {AJ enfant 60}, {santé 0–100}, {multiplicateur de productivité} |

---

## 2. Structure A — « Le Réseau de Flux »

### Principe
Le moteur tourne en continu : l'électricité et l'eau sont des **flux** (kWh et L par seconde), la batterie absorbe les variations. Les cultures et les animaux avancent quand le joueur clique sur **« Dormir »**. Le joueur surveille les jauges et supprime les goulots.

### Organisation
```
Tick (200 ms) : Panneau → Batterie → Pompe / Moulin / Presse → réservoir d'eau
Clic Dormir  : pousse des plantes (si arrosées) → ponte (si nourries)
               → repas familial (320 énergies) → santé → péremption → bilan
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
| 😴 Clic « Dormir » | Repas familial (320 énergies) → santé → pousse (+1 stade si arrosé) → ponte (si nourrie) → croissance et laine des moutons → péremption hors frigo |

### Rôle des nouveaux éléments
- **Serre** : rendement constant toute l'année, sans malus d'hiver.
- **Réfrigérateur** : conserver la récolte d'été pour l'hiver.
- **Silo** : stocker le blé récolté pour nourrir les poules toute l'année.
- **Verger** : récolte en fin d'été et en automne.
- **Presse / Moulin** : transformer quand la batterie est pleine (été).

### Modificateurs saisonniers (légers) 🟡
| Saison | Solaire | Rendement potager | Eau consommée | Champ | Pâturage (croissance moutons) | Verger |
|---|---|---|---|---|---|---|
| 🌱 Printemps | ×1,0 | ×1,1 | ×1,0 | ×1,0 | ×1,2 | — |
| ☀️ Été | ×1,3 | ×1,0 | ×1,3 | ×1,2 | ×1,0 | fruits (fin) |
| 🍂 Automne | ×0,9 | ×1,0 | ×0,9 | ×0,9 | ×1,0 | fruits |
| ❄️ Hiver | ×0,7 | ×0,7 | ×0,8 | ×0,7 | ×0,8 | — |
| Serre | — | ×1,0 toute l'année | ×1,0 | — | — | — |

L'hiver reste plus serré, sans être punitif : stocker au réfrigérateur et investir dans la serre aident, mais ne sont pas obligatoires pour survivre.

### Forces / faiblesses
- ✅ Donne tout son sens à l'autonomie : anticiper, stocker, conserver.
- ✅ Simulation discrète, très facile à tester.
- ✅ Le bouton Dormir supprime la pression du temps réel : idéal pour un public familial.
- ⚠️ Plus exigeant en attention avant l'automatisation ; le temps d'éveil minimal empêche d'enchaîner les nuits (voir 6.10).

---

## 4. Structure C — « Les Paliers d'Autonomie »

### Principe
La progression suit des **chapitres**, mesurés par le **% d'autonomie** = énergie produite sur la ferme ÷ 320. La nourriture achetée au Comptoir ne compte pas.

### Chapitres
| # | Titre | Débloque | Objectif |
|---|---|---|---|
| 1 | *L'eau et le soleil* | Panneau, Batterie, Puit, Pompe | Stocker 5 kWh et 50 L |
| 2 | *Le premier potager* | Potager (carotte, patate) | Récolter 20 carottes, replanter sans épuiser ses graines — 25 % d'autonomie |
| 3 | *Le poulailler* | Champ (blé), Silo, Poulailler | 7 jours de ponte sans interruption, santé ≥ 80 |
| 4 | *Le four et le livre de recette* | Four → onglet Livre de recette, puis Cuisine, Moulin, Presse, tournesol | Cuire 5 pains et préparer 3 plats différents |
| 5 | *Le troupeau* | Pâturage, Moutons, tonte, abattage | Tondre 10 laines — 60 % d'autonomie |
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
│   ├── animals.ts                poule, mouton
│   ├── recipes.ts                ingrédients, temps, énergie
│   ├── techtree.ts
│   └── chapters.ts
├── engine/                   ← simulation pure, sans DOM
│   ├── state.ts
│   ├── tick.ts                   flux kWh et eau
│   ├── day.ts                    pousse, ponte, repas, péremption
│   ├── crops.ts                  planter, arroser, récolter
│   ├── animals.ts                nourrir, pâturage
│   ├── family.ts                 consommation des 320 énergies
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
```

### 6.6 Pâturage

```ts
export const maxSheep = (ha: number) => Math.floor(ha / 0.05 + 1e-9);

export function pastureCost(s: GameState) {
  const extra = s.sheep.length - 10 + 1;          // rang au-delà du 10ᵉ
  return Math.round(PRIX_BASE_005HA * 1.2 ** Math.max(0, extra - 1));
}
```

### 6.6 bis Moutons : croissance, tonte, abattage

```ts
// engine/animals.ts
export function growSheep(s: GameState) {             // appelé par sleep()
  const ok = s.sheep.length <= maxSheep(s.pasture.ha);
  for (const m of s.sheep) {
    if (ok) m.weight = Math.min(SHEEP_MAX_KG, m.weight + SHEEP_GAIN_KG);
    m.woolDays = Math.min(WOOL_DAYS, m.woolDays + 1);
  }
}

export function shear(s: GameState, id: string) {
  const m = s.sheep.find(x => x.id === id);
  if (!m || m.woolDays < WOOL_DAYS) return false;
  s.inventory.laine += WOOL_PER_SHEAR;               // item vendable uniquement (edible: false)
  m.woolDays = 0;
  return true;
}

export function slaughter(s: GameState, id: string) {
  const i = s.sheep.findIndex(x => x.id === id);
  if (i < 0) return;
  s.inventory.viande += Math.floor(s.sheep[i].weight * MEAT_RATIO / PORTION_KG);
  s.sheep.splice(i, 1);                               // la surface reste acquise
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

// achat d'animaux
export const animalPrice = (_s: GameState, kind: 'poule' | 'mouton') =>
  ANIMAL_PRICE[kind];                                  // prix fixes (🟡 15 / 60), pas de revente

export function buyAnimal(s: GameState, kind: 'poule' | 'mouton') {
  const room = kind === 'poule'
    ? s.animals.poule.length < coopCapacity(s)
    : s.animals.mouton.length < maxSheep(s.pasture.ha);
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

### 6.9 Repas familial (320 énergies)

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
- **Comptoir** : onglets Vendre / Acheter / Graines (badge « dépannage ») / Animaux / Arbres ; prix d'achat actuel et coefficient affichés ; animaux grisés si le poulailler ou le pâturage est plein.
- **Famille** : 4 portraits avec barre de santé, jauge 320 énergies, % d'autonomie, multiplicateur de productivité.
- **Bouton « Dormir »** toujours visible : grisé avec compte à rebours tant que l'éveil minimal n'est pas atteint, puis aperçu « Repas prévu : 280 / 320 énergies ⚠️ ».
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
| 5 | Pâturage, achat de moutons et de surface, croissance, tonte, abattage |
| 6 | Arbre techno, automatisations niveau 5, semis automatique |
| 7 | Saisons légères, Serre, Verger, péremption par lots, Réfrigérateur, soins |
| 8 | Chapitres, hors-ligne, finitions, mobile |

---

## 8. Tableau d'équilibrage ✅

> Valeurs **validées comme base de départ**. Le rythme cible (100 % d'autonomie vers la nuit 60) est adopté ; les chiffres pourront être affinés avec le script de simulation (section 6) sans changer les règles. Unités : **pièces** (💰), **nuits**, **L**, **kWh**, **s** (secondes d'éveil).

### 8.1 Départ de partie

| Élément | Valeur |
|---|---|
| Pièces | 50 |
| Conserves (non périssables, 20 énergie, vendables 3 💰, non rachetables) ✅ | 160 → 10 nuits d'autonomie |
| Graines | 10 carotte, 6 patates, 4 tomate |
| Bâtiments | Panneau niv. 1, Batterie niv. 1, Puit + Pompe niv. 1, Potager niv. 1 |
| Famille | 4 membres, santé 100 |
| Saison | Printemps, nuit 1 |

Les conserves laissent le temps de lancer le potager avant que la santé ne soit menacée.

### 8.2 Énergie et eau

| Niveau | Panneau (kWh/s) | Batterie (kWh) | Pompe (L/s) | Réservoir (L) | Coût amélioration 💰 |
|---|---|---|---|---|---|
| 1 | 0,03 | 5 | 1 | 40 | départ |
| 2 | 0,05 | 10 | 2 | 80 | 40 |
| 3 | 0,08 | 20 | 4 | 160 | 100 |
| 4 | 0,12 | 40 | 6 | 300 | 250 |
| 5 | 0,18 | 80 | 10 | 500 | 600 |

- Pompe : **0,01 kWh par litre** pompé.
- Chaque appareil s'améliore séparément, avec la même grille de coûts.
- Repère : une heure de jeu (30 s) avec un panneau de niveau 1 → 0,9 kWh, soit de quoi pomper 90 L.

**Parc d'appareils** ✅

| Élément | Valeur 🟡 |
|---|---|
| Panneau supplémentaire | 60 💰 × 1,2ⁿ (n = panneaux déjà possédés) |
| Batterie supplémentaire | 80 💰 × 1,2ⁿ |
| Départ | 1 panneau et 1 batterie de niveau 1 |
| Usure | +0,5 point par heure de fonctionnement ; aucune usure à l'arrêt |
| Effet de l'usure | rendement = 1 − usure ÷ 200 |
| Seuil « à entretenir » | 70 % d'usure |
| Panne | à 100 % d'usure, l'appareil s'arrête |
| Entretien | 20 % du prix d'achat, remet l'usure à 0 |
| Réparation | 50 % du prix d'achat |
| Batteries | remplissage dans l'ordre, décharge en sens inverse |

| Consommateur | Consommation |
|---|---|
| Moulin | 1 blé → 1 farine, 5 s, 0,02 kWh/s |
| Presse | 3 graines de tournesol → 1 huile, 10 s, 0,03 kWh/s |
| Réfrigérateur | 0,005 kWh/s + 0,00005 kWh/s par unité stockée ; bloc nocturne = 30 s |
| Four, Cuisine | pas d'électricité (bois / gaz implicite) |

### 8.3 Cultures

| Plante | Lieu | Stades (nuits) | Eau / arrosage | Rendement | Graines | Énergie / unité | Vente 💰 |
|---|---|---|---|---|---|---|---|
| Carotte | Potager | 4 | 2 L | 10 | montée en graine : +2 nuits → 6 graines | 6 | 1 |
| Patate | Potager | 6 | 3 L | 8 | 1 patate = 1 plant | 15 | 2 |
| Tomate | Potager, Serre | 5 | 3 L | 10 | +1 à 2 | 6 | 1 |
| Courgette | Potager, Serre | 5 | 4 L | 6 | +1 à 2 | 8 | 2 |
| Aubergine | Potager, Serre | 6 | 4 L | 6 | +1 à 2 | 8 | 2 |
| Blé | Champ | 7 | 2 L | 8 | 1 blé = 1 graine | — | 1 |
| Tournesol | Champ | 7 | 2 L | 9 graines | 1 graine = 1 plant | — | 1 |

Graines de légumes : vente 1 💰 ; achat en dépannage au coefficient 2,0 (soit 2 💰 la première).

**Rendement moyen par parcelle** (énergie / nuit, graine déduite) : carotte ≈ 15 · patate ≈ 17 · tomate ≈ 12 · courgette ≈ 10 · aubergine ≈ 8.

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
| Fruit | 8 énergie, vente 2 💰 |

Un arbre adulte donne environ **30 fruits par an** (≈ 240 énergie).

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
| Prix | 15 💰 (fixe, pas de revente) |
| Consommation | 0,5 blé / nuit |
| Production | 1 œuf / nuit si nourrie (10 énergie, vente 2 💰) |
| Silo (niv. 1 → 5) | 20 · 50 · 100 · 200 · 400 blé (coûts 30 · 80 · 180 · 400) |

Repère : 12 poules = 120 énergie / nuit et 6 blé / nuit, soit environ 6 parcelles de blé.

### 8.6 Pâturage et moutons

| Élément | Valeur |
|---|---|
| Déblocage du pâturage (0,5 ha, 10 moutons) | 150 💰 |
| 0,05 ha supplémentaire | 40 💰 × 1,2ⁿ⁻¹ (n = rang du mouton au-delà du 10ᵉ) |
| Mouton | 60 💰 (fixe, pas de revente) |
| Poids de départ / gain / max | 20 kg / +0,5 kg par nuit / 50 kg |
| Viande à l'abattage | poids × 50 % ÷ 0,5 kg → 20 à 50 portions (30 énergie, vente 5 💰) |
| Tonte | toutes les 7 nuits → 1 laine (vente 6 💰, non périssable) |

Repère : un mouton élevé jusqu'à 50 kg (60 nuits) rapporte **8 laines (48 💰)** puis **50 portions (1 500 énergie)**.

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
| Carotte | 1 | Œuf | 2 | Farine | 1 |
| Patate | 2 | Viande | 5 | Huile | 4 |
| Tomate | 1 | Pain | 4 | Laine | 6 |
| Courgette | 2 | Pomme / Poire | 2 | Blé | 1 |
| Aubergine | 2 | Conserve | 3 | Graines | 1 |

Plats cuisinés : prix de vente = somme des ingrédients × 1,3, arrondi. Prix d'achat = vente × coefficient (plancher 1,2 ; graines 2,0 ; +0,1 par unité achetée, −0,1 par unité vendue).

### 8.10 Courbe de progression cible

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
| Animaux | Achat au Comptoir à **prix fixes**, **sans revente** ; poule qui **pond à vie** ; mouton : **laine tondue** (vente uniquement), **viande à l'abattage** |
| Cuisine | **Livre de recette = onglet** ouvert par le **Four** ; **une station de chaque type**, une préparation à la fois |
| Stockage | Inventaire et Réfrigérateur **illimités** ; péremption **5 à 7 nuits** ; frigo alimenté **en continu** + **bloc nocturne de 30 s** ; batterie **sans autodécharge** |
| Économie | Prix de vente **fixes** ; coefficient d'achat **+0,1 / achat, −0,1 / vente uniquement**, plancher 1,2 (graines 2,0) |
| Départ | 50 💰 + **160 conserves** (10 nuits) |
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
