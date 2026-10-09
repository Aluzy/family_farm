# Ferme Familiale — Conception v2 (niveaux, énergie du personnage, houe)

> **Statut** : document de travail. Il reprend les notes de game design du 9 octobre 2026,
> répond aux deux questions qu'elles posent (tuiles voisines de la houe, cultures par
> niveau) et chiffre ce qu'elles laissent ouvert. Les valeurs proposées ici (et non
> données dans les notes) sont marquées 🟡 : elles servent de base et doivent être
> confirmées puis vérifiées avec `scripts/simulate.mjs`.
>
> **Rien n'est encore codé.** Quand ce document sera validé, il remplacera dans
> [`conception.md`](conception.md) tout ce qui le contredit (saisons, santé, parc
> d'appareils, chapitres, réfrigérateur illimité, Zone de culture à 5 niveaux). Le plan de
> mise en œuvre est en section 12.

Sommaire :

1. Vue d'ensemble des changements
2. Avant la partie : configurer sa famille
3. Histoire : chapitres 1 et 2
4. Niveaux et expérience
5. Énergie, bonheur et endurance
6. Cultures par niveau
7. La houe et les tuiles voisines
8. Électricité : un panneau, une batterie
9. Réfrigérateur à capacité limitée
10. Plats et bonheur
11. Suppression des saisons
12. Plan de mise en œuvre
13. Incohérences relevées et questions ouvertes

---

## 1. Vue d'ensemble des changements

| Domaine | Aujourd'hui (v1.4 / 1.5) | v2 |
|---|---|---|
| Départ | 350 💰, maison en état, 160 conserves | **1 500 💰**, ferme héritée **délabrée** à réparer |
| Progression | 7 chapitres à objectifs | **10 niveaux d'expérience (XP)** + chapitres d'histoire qui rapportent de l'XP |
| Rythme d'une journée | horloge seule (Dormir après 30 s) | **jauge d'énergie** du personnage : nombre d'actions au clic limité |
| Santé | jauge de santé, soins payants, malus de productivité | **supprimée**, remplacée par la jauge d'énergie |
| Bonheur | modifie la productivité | **ralentit la baisse d'énergie** |
| Saisons | 4 saisons de 10 nuits | **supprimées** |
| Électricité | plusieurs panneaux et batteries | **1 panneau, 1 batterie**, qui montent de niveau ; panneau actif **de 7 h à 19 h** |
| Zone de culture | 6 → 30 parcelles déjà en terre | l'herbe se transforme **à la houe**, nombre de tuiles plafonné par le niveau |
| Réfrigérateur | capacité illimitée | **capacité par niveau** (25 → 120), consommation par unité stockée |
| Verger | arbres achetés au Marché | **clic sur une tuile → choix de l'arbre → planter**, croissance en 3 ou 4 dessins |
| Personnage | la famille entière | un **personnage principal** (choisi dans la famille) fait les actions |

---

## 2. Avant la partie : configurer sa famille

Écran unique avant la première journée (et seulement pour une nouvelle partie).

| Réglage | Valeurs | Remarques |
|---|---|---|
| Nom de famille | texte, 2 à 20 signes | affiché dans le bandeau et les lettres de l'histoire |
| Nombre de membres | 1 à 6, au moins un adulte (règle actuelle) | + jusqu'à 3 chiens ou chats (règle actuelle) |
| Pour chaque membre | prénom, adulte / enfant, **avatar** | avatars : planche de portraits pixel art (8 adultes, 8 enfants 🟡) |
| Personnage principal | un des adultes | c'est lui qui porte la jauge d'énergie et fait les actions |

Le besoin alimentaire de la famille (50 par adulte, 25 par enfant) ne change pas.

---

## 3. Histoire : chapitres 1 et 2

Les chapitres de l'histoire ne débloquent plus rien par eux-mêmes : **les déblocages
viennent des niveaux d'XP** (section 4). L'histoire guide le joueur et rapporte de l'XP à
chaque jalon (succès).

### 3.1 Texte d'ouverture (proposition)

> *Printemps 2021. Après des mois enfermés dans un appartement trop petit, la famille
> {nom} décide de tout quitter. Le grand-père, disparu l'hiver dernier, leur a laissé sa
> ferme : quelques hectares au bout d'un chemin de terre, une maison aux volets fermés, un
> moulin qui ne tourne plus. « Elle n'attend que vous », disait sa dernière lettre.
> Les cartons sont dans le coffre. Il est temps de redonner vie à la ferme.*

Puis une lettre du notaire : la ferme est à vous, mais rien ne fonctionne.

### 3.2 Chapitre 1 : L'héritage (niveaux 1 et 2)

Chaque étape débloque la suivante ; aucune n'est imposée dans le temps.

| # | Étape | Coût | Débloque |
|---|---|---|---|
| 1 | Hériter de la ferme (texte d'ouverture) | — | réparation de la maison |
| 2 | **Réparer la ferme** (la maison) | 650 💰 | achat du panneau, de la batterie, de la pompe |
| 3 | Acheter le **panneau solaire** | 150 💰 | — |
| 4 | Acheter la **batterie** | 180 💰 | ✅ **facultative** : jamais imposée tant qu'elle n'est pas nécessaire (elle sert le soir, la nuit, puis au frigo) |
| 5 | Acheter la **pompe** | 90 💰 | — |
| 6 | Panneau **et** pompe achetés | — | **réservoir niveau 1**, **zone de culture**, **Marché** |
| 7 | Acheter le **réservoir niveau 1** | 50 💰 | l'eau peut être stockée et les parcelles arrosées |
| 8 | Acheter la **houe** au Marché | 40 💰 🟡 | transformer l'herbe en terre (section 7) |
| 9 | Labourer, acheter des **graines**, planter | ~2 💰 la graine | — |
| 10 | **Première récolte** | — | fin du chapitre 1 |

Budget : 1 500 − 650 − 150 − 180 − 90 − 50 − 40 = **340 💰** pour les graines et les
premières semaines (sans la batterie : 520 💰). **40 conserves** au départ
pour tenir jusqu'à la première récolte (simulation en 13.3) 🟡.

### 3.3 Chapitre 2 : Le grenier (à partir du niveau 3)

| # | Étape | Débloque |
|---|---|---|
| 1 | Atteindre le niveau 2 : nouvelles tuiles et nouvelles cultures | — |
| 2 | Cultiver au moins 4 cultures différentes 🟡 | — |
| 3 | Atteindre le niveau 3, **réparer le Silo** | le **blé** devient plantable |
| 4 | Planter du blé | — |
| 5 | Stocker **50 blés** au Silo 🟡 | fin du chapitre 2 |

> ✅ **Décidé** : le blé et le Silo sont au **niveau d'XP 3** (les notes les plaçaient au
> « Niveau 2 » de l'histoire). L'histoire parle de **chapitres**, les niveaux sont ceux de
> l'XP.

### 3.4 Succès

Un chapitre terminé est un succès qui rapporte de l'XP 🟡 :

| Succès | XP |
|---|---|
| Chapitre 1 terminé | 200 |
| Chapitre 2 terminé | 500 |
| Chapitre 3 terminé | 1 000 |
| Chapitre 4 terminé | 2 500 |
| Chapitres suivants | ≈ 10 % du seuil du niveau suivant |

✅ **Décidé** : les « charités » des notes étaient les **chapitres**. Seuls l'histoire et
ses chapitres servent de jalons.

---

## 4. Niveaux et expérience

### 4.1 Paliers

| Niv. | XP cumulée | Débloque | Tuiles cultivables 🟡 |
|---|---|---|---|
| 1 | 0 | patate, tomate, carotte | 6 |
| 2 | 500 | courgette, aubergine, oignon ; **achat de la Cuisine** ; **huile au Marché** | 12 |
| 3 | 1 200 | poivron, ail, fraise, **blé** ; **réparation du Silo** ; **réparation du Poulailler** | 20 |
| 4 | 3 000 | épinard, tournesol, riz ; **réparation du Moulin** (et le Champ) | 32 |
| 5 | 7 500 | houblon ; **achat du Four** ; **réparation de l'Étable** | 48 |
| 6 | 20 000 | **achat de la Presse** ; **Verger** | 64 |
| 7 | 40 000 | cacao, vanille, café ; **réparation de la Serre** | 64 (+ Serre) |
| 8 | 80 000 | **achat du Réfrigérateur** | 64 |
| 9 | 180 000 | **courrier du notaire : héritage de 15 000 💰** (section 4.4) | 64 |
| 10 | 400 000 | **choix d'un commerce** : conserverie, crèmerie ou métier à tisser (section 4.5) | 64 |

✅ **Décidé** : le **Poulailler** (absent des notes alors que les œufs rapportent de l'XP)
se répare au **niveau 3**, avec le Silo, puisque les poules mangent du blé.

### 4.2 Gains d'XP

| Action | XP | Action | XP |
|---|---|---|---|
| Labourer | 10 | Ramasser un œuf | 10 |
| Planter | 10 | Traire (lait) | 30 |
| Arroser | 10 | Tondre (laine) | 30 |
| Récolter | 20 | Cuisiner (Cuisine) | 40 |
| Moudre | 10 | Cuire au four | 50 |
| Vendre | 1 XP par pièce gagnée | Succès | voir 3.4 |

**Automatisations** : une action faite par une automatisation rapporte **la moitié** de
l'XP de l'action manuelle 🟡 (arrosage auto : 5 XP la parcelle) et ne coûte pas d'énergie.
La moitié garde un intérêt à agir soi-même sans rendre l'automatisation inutile.

### 4.3 Rythme estimé 🟡

Premiers jours, 6 parcelles : labourer + planter + arroser = 180 XP le jour 1, puis 60 XP
par jour d'arrosage, et 120 XP par récolte de 6 parcelles. Le niveau 2 tombe vers la
**nuit 4 ou 5** (première récolte et premières ventes), le niveau 3 vers la nuit 8. À partir
du niveau 6, la vente (1 XP par pièce) devient la première source d'XP : à vérifier en
simulation que les niveaux 8 à 10 ne s'atteignent pas uniquement en vendant du cacao.

### 4.4 Niveau 9 : l'héritage caché ✅

En atteignant le niveau 9, la famille reçoit un **courrier du notaire** :

> *« Votre grand-père vous a aussi légué 15 000 pièces, faites-en bon usage ! »*

- **+15 000 💰**, versés une seule fois, à l'ouverture du courrier.
- Le courrier reste lisible dans ✉️ Notifications (ou l'historique des chapitres).
- Ces pièces ne rapportent **pas d'XP** (seules les ventes en rapportent) 🟡 : sinon le
  joueur gagnerait d'un coup 15 000 des 220 000 XP qui séparent les niveaux 9 et 10.

### 4.5 Niveau 10 : choisir un commerce ✅

Au niveau 10, le joueur choisit **un** commerce. Ce commerce prend chaque nuit une
partie de la production de la ferme, la transforme et la **vend automatiquement** :
c'est un revenu régulier, sans clic.

| Commerce | Prend | Produit | Recette 🟡 | Vente 🟡 | Valeur des ingrédients bruts |
|---|---|---|---|---|---|
| 🥫 **Conserverie** | légumes (au choix du moteur : ce qui périme le plus tôt) | conserve de légumes | 4 légumes → 1 conserve | 18 💰 | ≈ 12 💰 (légume moyen ≈ 3 💰) |
| 🧀 **Crèmerie** | lait | fromage | 3 laits → 1 fromage | 36 💰 | 24 💰 |
| 🧵 **Métier à tisser** | laine | tissu | 2 laines → 1 tissu | 36 💰 | 24 💰 |

Règles proposées 🟡 :

1. **Un seul commerce, choix définitif.** Une fenêtre présente les trois avec leur
   chiffre d'affaires estimé à partir de la production actuelle de la ferme. Pour
   changer d'avis : 5 000 💰 (sinon le choix serait sans conséquence).
2. **Quota** : le joueur règle dans la fenêtre du commerce combien d'unités brutes
   partent chaque nuit (de 0 à la capacité). La famille mange **d'abord** : le commerce
   ne prend que ce qui reste après le repas du soir.
3. **Capacité** : 10 transformations par nuit au départ, améliorable 3 fois (20 / 35 / 50)
   pour 3 000 / 8 000 / 20 000 💰.
4. **Vente** : au prix fixe ci-dessus, sans passer par le Marché (le coefficient d'achat
   et de vente n'est pas touché). Les pièces s'ajoutent au réveil, dans le résumé de la
   nuit (« Crèmerie : 8 fromages vendus, +288 💰 »).
5. **XP** : comme une vente, 1 XP par pièce gagnée.
6. Le commerce **ne consomme ni énergie du personnage ni électricité** 🟡.
7. Choisir un commerce donne un intérêt à monter la production qu'il utilise : légumes
   pour la conserverie, vaches pour la crèmerie, moutons pour le métier à tisser.

Repère : une crèmerie à 10 fromages par nuit prend 30 laits (30 vaches) et rapporte
360 💰 par nuit, contre 240 💰 si l'on vendait le lait au Marché.

---

## 5. Énergie, bonheur et endurance

### 5.1 La jauge d'énergie remplace la santé

- Une jauge de **0 à 100**, celle du **personnage principal**.
- Chaque **action au clic** en coûte (tableau 5.2). À 0, plus aucune action au clic n'est
  possible jusqu'à ce qu'il mange ou dorme ; ce qui tourne seul (panneau, pompe,
  automatisations, ateliers) continue.
- Disparaissent : la santé des membres, les soins payants, le malus de productivité, le
  portrait malade.

> ✅ **Noms décidés** : la jauge du personnage s'appelle **Énergie ⚡**, la valeur
> nutritive des aliments devient **« calories » 🍽️** (« 150 calories par jour ») et
> l'électricité reste **« électricité » (Wh)**.

### 5.2 Coût des actions

| Action | Énergie | Action | Énergie |
|---|---|---|---|
| Labourer | 5 | Ramasser un œuf | 1 |
| Planter | 3 | Traire (lait) | 5 |
| Arroser | 2 | Tondre (laine) | 8 |
| Récolter | 4 | Cuisiner | 3 |
| Moudre | 1 | Cuire au four | 3 |

Acheter, vendre, ouvrir un écran, mettre au frigo : **gratuit**.

### 5.3 Le bonheur ralentit la baisse d'énergie

Coût réel d'une action :

```
coût = coût de base × (100 − bonheur ÷ 2) % × (100 − 3 × (niveau − 1)) %
```

- **Bonheur 0** : coût plein. **Bonheur 100** : coût divisé par 2.
- Vérification avec les exemples des notes : une action « moyenne » coûte ≈ 3,3 (les
  quatre actions de culture font 3,5 en moyenne). Énergie 100 et bonheur 0 → 100 ÷ 3,3 ≈
  **30 actions** ; énergie 100 et bonheur 100 → 100 ÷ 1,65 ≈ **60 actions**. ✅
- Le bonheur utilisé est la **moyenne de la famille** (tout le monde mange les mêmes plats).

**Chiffres entiers** (règle v25) : l'énergie est stockée en **millièmes** (`state.energie`
de 0 à 100 000), affichée en entier arrondi vers le bas, comme l'électricité en mWh.

### 5.4 Endurance

- Nouvelle barre **Endurance** sous la jauge d'énergie : elle affiche la réduction de coût
  acquise, **−3 % par niveau** au-delà du premier (niveau 10 : −27 %).
- Réduction **additive** (−3 points par niveau), pas composée : plus lisible pour le joueur.
- Avec bonheur 100 et niveau 10 : coût × 50 % × 73 % → ≈ **82 actions** par jour.

### 5.5 Remplir la jauge

| Source | Effet 🟡 |
|---|---|
| **Dormir** | l'énergie remonte à **60 + 40 × couverture du repas du soir** (repas complet → 100 ; rien mangé → 60) |
| **Manger** en journée (bouton « Manger » sur un aliment ou un plat) | + calories de l'aliment ÷ 5 (gratin 150 → +30 ; carotte 10 → +2), jusqu'à 100 |

Manger en journée retire l'aliment des réserves : c'est un arbitrage entre agir plus
aujourd'hui et nourrir la famille ce soir.

### 5.6 Remplir le bonheur

Le bonheur (0 à 100, par membre, système actuel de la v1.5) :

- **baisse de 5 chaque nuit** 🟡 ;
- **monte avec les plats mangés** au repas du soir (tableau de la section 10) : on compte
  au plus **3 plats différents** par repas 🟡 ;
- les aliments crus ne donnent rien ;
- les sorties en ville gardent leurs gains actuels.

La règle actuelle « −3 si tout est cru, jusqu'à +5 si tout est cuisiné » est remplacée.

---

## 6. Cultures par niveau

### 6.1 Réponse : quelles cultures, à quel niveau ?

Les 17 cultures du jeu sont toutes placées (pas de nouvelle culture à créer) :

| Niv. | Nouvelles cultures | Lieu | Condition supplémentaire |
|---|---|---|---|
| 1 | 🥔 patate, 🍅 tomate, 🥕 carotte | Zone de culture | houe |
| 2 | 🥒 courgette, 🍆 aubergine, 🧅 oignon | Zone de culture | — |
| 3 | 🫑 poivron, 🧄 ail, 🍓 fraise, 🌾 **blé** | Zone de culture | **blé : Silo réparé** |
| 4 | 🥬 épinard, 🌻 tournesol, 🍚 riz | Zone de culture / Champ | — |
| 5 | 🍺 houblon | Zone de culture / Champ | — |
| 6 | 🍎 pommier, 🍐 poirier | Verger | — |
| 7 | 🍫 cacao, 🌼 vanille, ☕ café | **Serre uniquement** | Serre réparée |

### 6.2 Règle du blé

> Le **blé ne peut être planté que si le Silo a été réparé.** Tant que le Silo est délabré,
> la graine de blé apparaît grisée dans le menu « Planter » avec la mention « Réparez
> d'abord le Silo ». Dans le code, la culture `ble` passe de `deblocage: "champ"` à une
> double condition : niveau 3 et `silo` réparé.

### 6.3 Verger (niveau 6)

1. Clic sur une **tuile de verger libre** → fenêtre « Choisir un arbre » (pommier,
   poirier ; prix et délai affichés).
2. Clic **Planter** → un **jeune arbre** apparaît (le prix est payé à ce moment).
3. Croissance en **4 dessins** : jeune arbre → arbuste → arbre → arbre en fruits.
4. Arbre en fruits : **récolte au clic** (4 énergie, 20 XP) ou **automatique** avec
   l'automatisation « Récolte du verger » (moitié de l'XP).
5. Sans saisons : un arbre adulte donne **6 fruits toutes les 3 nuits**, toute l'année
   (ancienne production réservée à l'été et à l'automne) ; le dessin repasse à « arbre »
   après la récolte puis à « arbre en fruits » 3 nuits plus tard.

Le délai avant la première récolte (15 nuits) se répartit sur les dessins : 5 nuits par
dessin 🟡.

---

## 7. La houe et les tuiles voisines

### 7.1 Réponse : quelles règles pour les tuiles voisines ?

**Proposition retenue : la bordure est dessinée sur la tuile de terre, l'herbe ne change
jamais.** C'est la méthode des jeux du genre (Stardew Valley) et la plus simple à
programmer et à expliquer :

1. **Trois états logiques seulement** : `herbe`, `terre` (labourée, plantable), et rien
   d'autre. « Bordure » n'est **pas un état**, c'est un dessin.
2. Labourer une tuile d'**herbe** la change en **terre**. Ses voisines ne changent pas
   d'état.
3. Le dessin de chaque tuile de terre dépend de ses **4 voisines directes** (haut, droite,
   bas, gauche) : chaque côté qui touche de l'herbe porte une bordure, chaque côté qui
   touche de la terre est ouvert. 4 côtés → **16 dessins** (masque de 4 bits).
4. Après un labour, on **redessine la tuile et ses 4 voisines** de terre (leurs côtés
   communs s'ouvrent pour former un seul champ).
5. Pour soigner les coins intérieurs (deux côtés ouverts et la diagonale en herbe), on peut
   passer à **47 dessins** (masque de 8 bits, méthode « blob ») ; à faire seulement si le
   pack graphique les fournit.

Exemple (T = terre, h = herbe) : on laboure la tuile à gauche de la terre existante.

```
avant         après
h h h h       h h h h
h h T h   →   h T T h
h h h h       h h h h
```

Avant, la tuile T porte une bordure sur ses 4 côtés. Après, les deux tuiles de terre
s'ouvrent l'une vers l'autre (gauche : bordure en haut, en bas, à gauche ; droite : bordure
en haut, en bas, à droite) et forment un seul carré de terre. Les tuiles d'herbe ne
changent pas.

**Alternative écartée** (bordure dessinée sur l'herbe, à la manière des « coins » de
Tiled) : labourer une tuile changerait l'aspect de ses **8 voisines**, et une tuile d'herbe
entourée de terre deviendrait visuellement de la terre sans être labourée. C'est plus joli
sur de grands champs, mais crée un cas ambigu (« cette tuile qui ressemble à de la terre
est-elle plantable ? »). À reconsidérer seulement si le pack ne permet pas l'autre méthode.

### 7.2 Règles de la houe

| Règle | Valeur |
|---|---|
| Où | seulement dans les zones cultivables de la carte (`zone_culture_1`, puis `zone_culture_2` au niveau 4) ; jamais sur un chemin, un bâtiment, l'eau |
| Combien | plafond de tuiles de terre fixé par le niveau (tableau 4.1) ; au plafond, la houe affiche « Niveau suivant : +N tuiles » |
| Coût | 5 énergie, 10 XP |
| Reboucher | clic avec la houe sur une terre **vide** : redevient de l'herbe, sans coût ni XP, la place est rendue au plafond |
| Terre plantée | ne se rebouche pas |
| Après récolte | la terre reste de la terre (pas besoin de relabourer) |
| Arrosée | la terre arrosée garde ses bordures, en plus sombre (dessins `soil_wet`) |

### 7.3 Dessins à produire

16 dessins de terre sèche + 16 de terre mouillée (ou 47 + 47 en version blob). Les dessins
actuels `soil_dry.png` / `soil_wet.png` deviennent la variante « ouverte sur 4 côtés ». À
générer en code comme les ruines (`scripts/batiments/`), en découpant la bordure dans
`soil_dry.png`.

---

## 8. Électricité : un panneau, une batterie

- **Un seul panneau et une seule batterie**, qui montent de niveau ; plus d'achat
  d'appareil supplémentaire (supprimer `PURCHASE`).
- Le **panneau ne produit qu'entre 7 h et 19 h**. Le soir (19 h – 22 h) et la nuit, la
  pompe et le frigo vivent sur la batterie.
- La **pompe** et le **réservoir** redeviennent deux achats distincts (le réservoir ne suit
  plus le niveau de la pompe).

Un seul appareil devant remplacer le parc, les niveaux produisent et stockent plus 🟡 :

| Niv. | Panneau (Wh/s, de 7 h à 19 h) | Batterie (Wh) | Pompe (L/s) | Réservoir (L) |
|---|---|---|---|---|
| 1 | 40 | 6 000 | 1 | 40 |
| 2 | 90 | 15 000 | 2 | 80 |
| 3 | 160 | 30 000 | 4 | 160 |
| 4 | 260 | 60 000 | 6 | 300 |
| 5 | 400 | 100 000 | 10 | 500 |

| Coût 🟡 | Niv. 1 | → 2 | → 3 | → 4 | → 5 |
|---|---|---|---|---|---|
| Panneau | 150 | 150 | 400 | 900 | 2 000 |
| Batterie | 180 | 180 | 450 | 1 000 | 2 200 |
| Pompe | 90 | 100 | 250 | 600 | 1 300 |
| Réservoir | 50 | 120 | 300 | 700 | 1 500 |

Repère : une heure de jeu = 18 s. De 7 h à 19 h, le panneau de niveau 1 produit
40 × 216 = **8 640 Wh** par jour.

**Écran « Pendant votre absence »** : il **n'affiche plus** l'électricité produite et
stockée. Ces chiffres ne se voient plus que dans **Ferme › Installations** (clic sur la
ferme, puis menu Installations).

---

## 9. Réfrigérateur à capacité limitée

- Achat au **niveau 8** (600 💰, valeur actuelle).
- Capacité par niveau : **25 / 40 / 60 / 90 / 120** unités. Plein : « Ranger » est grisé ;
  « Tout ranger au frigo » range ce qui tient (d'abord ce qui périme le plus tôt).
- Consommation **proportionnelle au stock** : 100 mWh/s par unité 🟡, sans part fixe
  (frigo vide = 0). Frigo de niveau 5 plein : 12 Wh/s.
- Coûts d'amélioration 🟡 : 300 / 700 / 1 500 / 3 000 💰.
- Inchangé : bloc de nuit de 30 s, perte d'une nuit de conservation s'il manque de courant.

---

## 10. Plats et bonheur

### 10.1 Règles (des notes)

1. Un plat de la **Cuisine** rend **moins** de bonheur qu'un plat du **Four**.
2. Un plat qui contient de l'**huile** ou des **fruits** rend plus de bonheur.
3. Un plat issu des **cultures spéciales** (cacao, café, vanille) rend plus de bonheur.

### 10.2 Barème proposé 🟡

`bonheur = base de l'atelier + 2 (huile ou fruit) + 4 (culture spéciale)`

| Base | Bonus |
|---|---|
| Cuisine : **+3** | huile ou fruit : **+2** (une seule fois, même si le plat a les deux) |
| Four : **+5** | cacao, café ou vanille : **+4** |

Fruits : pomme, poire, fraise, myrtille, châtaigne 🟡.

| Plat | Atelier | Bonus | Bonheur |
|---|---|---|---|
| Soupe de légumes, Bocal de légumes, Fromage frais, Riz au lait, Bière artisanale, Omelette aux champignons, Poisson grillé, Raclette | Cuisine | — | **+3** |
| Omelette, Ratatouille, Salade de tomates (huile) ; Compote, Confiture de fraises, Crème de marrons (fruit) | Cuisine | +2 | **+5** |
| Pain, Gratin de patates, Quiche aux épinards, Pain d'épices | Four | — | **+5** |
| Pain à l'ail (huile) ; Tarte aux pommes, Tarte aux fraises, Tarte aux myrtilles (fruit) | Four | +2 | **+7** |
| Chocolat chaud, Café, Crème à la vanille | Cuisine | +4 | **+7** |

Repère : un soir à 3 plats à +5 compense 3 nuits de baisse (−5 par nuit).

---

## 11. Suppression des saisons ✅ (fait, version 1.6)

But : un seul jeu de dessins par lieu au lieu de quatre ; le temps gagné sert à dessiner
**3 nouvelles zones** ✅ : la **Ville**, une **grande Forêt** et une **zone de
Montagne** (aujourd'hui des sorties sans carte, voir 6.12 de `conception.md`).

Ce qui a été retiré ou remplacé (détail dans la note v27 de `conception.md`) :

| Où | Avant | Version 1.6 |
|---|---|---|
| Cultures, eau, soleil | facteurs par saison | aucun facteur |
| Verger | fruits en fin d'été et en automne | 6 fruits toutes les 3 nuits toute l'année, chaque arbre à son rythme |
| Serre | « insensible aux saisons » | inchangée ; deviendra le lieu des cultures spéciales (niveau 7) |
| Sortie Forêt | cueillette par saison | cueillette qui tourne d'un jour à l'autre (3 champignons ; 5 myrtilles ; 2 champignons et 4 châtaignes) |
| Chapitre 6 « Toute l'année » | traverser un hiver | 10 nuits d'affilée à 80 % d'autonomie en moyenne, sans soin |
| Bandeau, réveil, Ferme | saison, calendrier | retirés |
| Carte | `grass_*`, `*_au/_wi.png` | supprimés ; seul le printemps (`_sp`) reste |
| Mode test | « Saison suivante » | retiré |
| Arbre des technologies | Panneaux orientables (hiver 85 %), pluie selon la saison | +10 % toute l'année ; 15 L par nuit |

---

## 12. Plan de mise en œuvre

Chaque lot est livrable seul, avec ses tests, une migration de sauvegarde si l'état
change, et la mise à jour de `conception.md` et du README.

| Lot | Contenu | Migration |
|---|---|---|
| 1 ✅ | **Saisons retirées** (moteur, données, carte, bandeau) — fait, version 1.6 | oui (format 23) |
| 2 | **Un panneau, une batterie**, panneau de 7 h à 19 h, réservoir séparé ; « absence » sans électricité | oui (parc → un appareil, au plus haut niveau possédé) |
| 3 | **Niveaux et XP** : `state.xp`, `niveau()`, gains, déblocages par niveau (remplacent ceux des chapitres) | oui (XP estimée depuis le chapitre atteint) |
| 4 | **Énergie, bonheur, endurance** ; santé et soins retirés | oui |
| 5 | **Houe** : herbe / terre, 16 dessins, plafond de tuiles | oui (parcelles existantes = terre) |
| 6 | **Frigo à capacité**, consommation par unité | oui (surplus rendu à l'inventaire) |
| 7 | **Plats et bonheur** (barème 10.2) | non |
| 8 | **Départ v2** : 1 500 💰, configuration de la famille, chapitres 1 et 2, succès | nouvelle partie seulement |
| 9 | **Verger au clic** et ses 4 dessins | oui |
| 10 | **Niveaux 9 et 10** : courrier du notaire, commerce automatique | oui (`state.commerce`) |

Ordre conseillé : 1 et 2 d'abord (ils simplifient le reste), puis 3 et 4 (le cœur du
nouvel équilibre), puis 8 pour rejouer le début de partie, enfin 5, 6, 7, 9 et 10. Le joueur
automatique (`js/engine/bot.js`) doit suivre à chaque lot pour que `simulate.mjs` reste
utilisable.

---

## 13. Décisions et questions ouvertes

### 13.1 Décidé ✅

| Point | Décision |
|---|---|
| Blé et Silo | **niveau 3** (section 3.3) |
| Huile avant la Presse | l'huile **s'achète au Marché dès le niveau 2** (pour l'omelette, la ratatouille, la salade de tomates) |
| Poulailler | réparé au **niveau 3**, avec le Silo |
| « Charités » | c'étaient les **chapitres** (section 3.4) |
| Niveau 9 | courrier du notaire, **+15 000 💰** (section 4.4) |
| Niveau 10 | **choix d'un commerce** : conserverie, crèmerie ou métier à tisser (section 4.5) |
| Mot « énergie » | **Énergie** = jauge du personnage, **calories** = aliments, **électricité** = Wh |
| Batterie | **facultative**, jamais imposée tant qu'elle n'est pas nécessaire |
| Plus gros jalon | **100 % d'autonomie 7 jours d'affilée** : la famille a pérennisé son installation |
| Niveau 10 | **pas le dernier niveau** : d'autres viendront ensuite |
| 3 nouvelles zones | **Ville**, **grande Forêt**, **Montagne** |
| Presse (niv. 6) après le tournesol (niv. 4), Moulin (niv. 4) avant le Four (niv. 5) | **laissés tels quels** |

### 13.2 Encore ouvert

1. **Tuiles après le niveau 6** : les notes n'en ajoutent plus ; la carte en compte 94
   au plus (30 + 64).
2. **Commerce** (section 4.5) : recettes, prix, capacité, choix définitif et coût du
   changement sont des propositions 🟡.
3. **Conserves de départ et rythme de l'autonomie** : voir 13.3.

### 13.3 Simulation : conserves de départ et jours avant l'autonomie

Joueur automatique de `scripts/simulate.mjs` (moteur **actuel**, version 1.5 : saisons,
santé et règles de départ d'avant la v2), 150 nuits, graines 1 à 5, joueur appliqué et
joueur minimal. Seul le stock de conserves change. Résultats identiques pour les 5 graines
et les 2 joueurs :

| Conserves | Durée (6 par nuit) | Fin des conserves | 1re nuit à 100 % | **100 % 7 nuits d'affilée** | Nuit sans repas complet | Santé à 0 |
|---|---|---|---|---|---|---|
| 20 | 3 nuits | nuit 4 | nuit 5 | **nuit 11** | nuit 4 (33 % couvert) | jamais |
| 40 | 6 nuits | jamais (la ferme prend le relais) | nuit 5 | **nuit 11** | aucune | jamais |
| 80 | 13 nuits | jamais | nuit 5 | **nuit 11** | aucune | jamais |
| 160 (actuel) | 26 nuits | jamais | nuit 5 | **nuit 11** | aucune | jamais |

Lecture :

- La première récolte (carottes, 4 nuits) nourrit toute la famille dès la **nuit 5** : il
  suffit de couvrir **4 nuits**, soit **24 conserves**. **20** laisse un repas incomplet
  (nuit 4), **40** suffit avec une marge, **80 et 160** ne servent qu'à être revendues.
  Proposition : **40 conserves** au départ v2.
- ⚠️ **Le plus gros jalon arrive trop tôt** : 100 % pendant 7 nuits dès la **nuit 11**,
  avec 6 parcelles de carottes, alors que la conception visait la nuit 60. C'est l'effet,
  déjà signalé en 8.10 de `conception.md`, des calories augmentées de 25 % (v17) : une
  récolte de 6 parcelles de carottes (60 × 10 calories) couvre 4 jours de besoin
  (150 par jour).
- En v2, la première récolte arrive aussi vers la nuit 5 (réparations, houe et graines
  s'achètent le jour 1), donc la conclusion sur les conserves tient. Pour que le jalon
  reste le plus gros du jeu, il faudra le rendre plus exigeant. Pistes, à choisir :
  (a) baisser rendements ou calories ; (b) faire grandir la famille avec les niveaux
  (plus de bouches) ; (c) exiger aussi un bonheur minimum pendant les 7 jours, donc des
  plats variés et pas seulement des carottes. **(c)** colle le mieux à la v2.
