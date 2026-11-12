# Fiche I3d — Le tableau des villageois

## Objectif

Donner au joueur un tableau où il lit, pour chaque villageois, ce qu'il a coûté et ce qu'il a produit
hier et sur les sept derniers jours, pour décider qui fait quoi.

## Contexte

- `docs/ile.md` (D4). I3c (le journal de chaque villageois : tâche, actions, produit, repas).
- Les comptes du joueur : `js/engine/compta.js`, `js/ui/compta.js` (la fenêtre des pièces).
- La valeur d'un objet : `js/engine/market.js` (`sellPrice`). L'énergie d'un aliment :
  `DATA.OBJETS[...].energie`.
- Les fenêtres : `js/ui/modal.js`, `js/ui/famille.js`, `js/ui/fiche-membre.js`, `js/ui/common.js`.

## À faire

1. **Le calcul** (`js/engine/tableau.js`, pur, sans interface) : pour un villageois et une période,
   - **coût** : ce qu'il a mangé, en pièces (au prix de vente des aliments pris à la boîte) ; sa part
     versée (0 avant I4) ;
   - **produit** : chaque objet, sa quantité, sa valeur au port ;
   - **solde** : produit moins coût ; et le **rendement** de sa tâche comparé à la moyenne de `TACHES`.
   Des entiers partout. Un jour de repos compte son repas et aucun produit.
2. **La fenêtre** (`js/ui/tableau.js`) : une ligne par villageois (portrait, prénom, tâche, coût,
   produit, solde, humeur), triable par colonne ; deux périodes (hier, 7 jours) ; un total du
   village ; un appui sur une ligne ouvre le détail jour par jour. Lisible sur un téléphone (les
   colonnes secondaires se replient).
3. **L'accès** : un bouton sur la carte du joueur, à côté des pièces, quand il y a un villageois.
4. **Des repères, pas des reproches** : un solde négatif s'affiche sans alerte ni couleur d'alarme
   (B-1) ; une ligne dit ce qui manque (« sans outil », « en repos : pas assez à manger »).
5. **Le joueur automatique** s'en sert pour réattribuer une tâche dont le solde est le plus bas.
6. **Les tests** (`village-tableau.test.mjs`) : coût, produit et solde sur une semaine écrite à la
   main ; le jour de repos ; le total ; sept jours glissants.

## Hors périmètre

- Les prix et la part (I4) ; les ventes des commerces (lot 5 : elles s'ajouteront au tableau).

## Critères d'acceptation

- Dans Chromium : avec trois villageois sur trois tâches, le tableau donne trois soldes différents ;
  le détail d'un villageois montre ses sept jours ; le tri marche ; sur un écran de 380 px de large,
  rien ne déborde.

## Vérifications et livraison

Celles du README du chantier. Captures : le tableau (bureau, téléphone), le détail, le total.
