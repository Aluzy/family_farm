# Fiche I5c — La scierie, la boulangerie, la fromagerie

## Objectif

Compléter le village avec trois commerces bâtis sur le socle d'I5a, presque sans code neuf : la
scierie-menuiserie (le bois), la boulangerie (le blé), la fromagerie (le lait).

## Contexte

- I5a (le socle, la forge), I5b (un commerce à trois étapes, à deux artisans).
- La scierie et l'ébéniste d'aujourd'hui : `data/ile.json` (3 planches pour 2 bois ; les meubles
  vendus par un hameau), `data/meubles.json` (36 meubles, leur `vendeur`), `js/engine/meubles.js`,
  `js/engine/styles.js`, `data/styles.json`.
- Le pain et le fromage : `data/recipes.json` (four, cuisine), `js/engine/kitchen.js`, le Moulin
  (`blocs.js`, `STATIONS`), les chaînes (`js/engine/chaines.js` : `fromage_frais`,
  `fromage_alpage`, à réserver à la vocation productive, I8b).

## À faire

1. **La scierie-menuiserie** : bois → planches (mieux que l'Atelier du joueur), planches → meubles.
   Les 36 meubles passent du vendeur « hameau » au menuisier : il en fait `LOTS` par jour, sur
   commande du joueur ou pour les maisons des villageois. Les styles (`styles.js`) restent.
2. **La boulangerie** : farine → pains et tartes, au four à bois (pas le four électrique du joueur).
   Le boulanger nourrit le village : ce qu'il vend aux villageois compte dans leurs repas et leur
   bonheur (les plats, `bonheur.js`).
3. **La fromagerie** : lait → fromage frais, puis fromage affiné (une cave : des jours d'attente,
   comme le tonnelet, `tonnelets.js`).
4. **Une règle commune**, à écrire dans `docs/ile.md` : un commerce ne retire rien au joueur (il peut
   toujours scier, cuire et cailler lui-même) ; il fait mieux ou autre chose, en petite quantité.
5. **Les dessins** (45°) : la scie de long et l'établi, le four à bois et l'étal à pains, la cave et
   ses meules, trois enseignes. Réutiliser ce qui existe (`four.py`, les meubles).
6. **Le plafond** : le nombre de commerces suit le nombre de villageois et le niveau du port
   (`ARTISANS.PLAFOND`), pour que le village grandisse par paliers.
7. **Les tests** : les trois filières dans la fourchette d'I4 ; les meubles commandés au menuisier ;
   le pain du boulanger dans les repas des villageois ; l'affinage ; le plafond.

## Hors périmètre

- De nouveaux meubles ; les chaînes de production (I8b).

## Critères d'acceptation

- Dans Chromium : trois commerces ouverts dans un village de huit villageois ; on commande une table
  au menuisier, on achète un pain, un fromage s'affine ; le tableau montre trois lignes « commerce ».

## Vérifications et livraison

Celles du README du chantier. Captures : les trois commerces, une commande de meuble, la cave.
