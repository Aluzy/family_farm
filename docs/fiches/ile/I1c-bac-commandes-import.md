# Fiche I1c — Le bac, les commandes et le catalogue d'import

## Objectif

Donner un rythme et une dépense longue à l'économie sans borner la vente : un bac qui passe à dates
fixes et emporte tout ce qu'on lui donne, des commandes à honorer, un catalogue d'import et des
niveaux du port à payer.

## Contexte

- `docs/ile.md` (D11 : la vente n'est pas bornée, il n'y a pas d'entrepôt ; les constats : l'argent
  s'empile, aucune dépense récurrente).
- I1a (le port prévu en 5 niveaux), I1b (`js/engine/port.js`, `js/ui/port.js` : on vend sous la
  halle, payé tout de suite).
- Le calendrier : `js/engine/lune.js`, `data/crops.json` (`LUNE` : mois de 14 jours),
  `js/ui/calendrier.js`. La nuit : `js/engine/night.js`. L'absence : `js/engine/offline.js`.
- Les déblocages : `data/niveaux.json`, `js/engine/levels.js`, `js/engine/techtree.js`
  (`refreshUnlocks`). Les arbres du verger et la vigne s'achetaient à la calèche (`orchard.js`).
- Les objectifs tirés : `js/engine/objectifs.js` (`OBJECTIFS.TIRES` : un tirage à graine, par jour).

## À faire

1. **La vente reste libre** : sous la halle, tout se vend, sans quota ni attente, au prix de vente
   (I1b). Le bac « emporte tout ce qu'on lui donne » : c'est lui qu'on voit charger ce qui a été
   vendu depuis son dernier passage (des caisses sur le quai, qui partent avec lui). Aucune règle
   d'entrepôt, aucune place à gérer.
2. **Le bac** (`js/engine/bac.js`) : il accoste tous les `PORT.BAC.PERIODE` jours (3 par défaut), de
   `HEURES[0]` à `HEURES[1]` h ; sa venue se déduit du jour (pas de simulation pas à pas ; une
   absence rattrape les passages manqués, `RATTRAPAGE` au plus). La scène : le bac à quai, sa
   passerelle, les caisses chargées, un tintement à l'arrivée ; le calendrier marque ses jours.
   C'est lui qui apporte les imports, les commandes et les nouveaux villageois (I3a).
3. **Les commandes du bac** : à chaque passage, `COMMANDES.NOMBRE` demandes tirées à la graine parmi
   ce que le joueur sait produire (objet, quantité, prime en %), valables jusqu'au passage suivant ;
   honorée, la commande paie le prix plus la prime et donne de l'XP ; manquée, elle s'efface sans
   rien coûter (B-1).
4. **Le catalogue d'import** : ce que le bac apporte, par niveau du port (semences, jeunes arbres,
   plants de vigne, puis espèces nouvelles, animaux, plans d'objets). Une commande d'import se paie
   d'avance et arrive au passage suivant. Les cultures que les niveaux débloquaient restent liées au
   niveau du joueur ; le catalogue ajoute la condition du port. Les **plants sauvages** rapportés de
   l'île (I7e) s'y inscrivent une fois cultivés (on peut alors en racheter).
5. **Les niveaux du port** (`PORT.NIVEAUX` : 1 à 5) : chacun coûte des pièces et des matériaux
   (planches, pierre, lingots) apportés sur place, et ouvre un quai plus long, un rang du catalogue,
   plus de commandes par passage, plus de villageois accueillis (`VILLAGE.ARRIVEE.PLAFOND`).
   Puisque la vente n'est pas bornée, **c'est ici que l'argent doit partir** : proposer les prix
   d'après la simulation (ordre de grandeur des anciens commerces : 3 000, 8 000, 20 000) et dire
   franchement, chiffres à l'appui, si les pièces s'empilent encore à la nuit 80.
6. **La sauvegarde** : `state.port` (niveau, commandes, imports attendus, ce qui a été vendu depuis
   le dernier passage, pour l'affichage) ; format + 1, migration, test.
7. **Les tests** (`village-bac.test.mjs`) : les jours du bac ; la vente sans limite ; commandes
   honorées et oubliées ; l'import livré ; le rattrapage après une absence ; les niveaux.

## Hors périmètre

- Les prix des objets (I4) ; les contrats d'export en volume (I8b) ; le port en ligne (I9c).
- Toute borne à la vente (quota, entrepôt) : écartée.

## Critères d'acceptation

- Dans Chromium : on vend sous la halle sans limite ; le bac accoste au jour dit et charge les
  caisses ; une commande honorée paie sa prime ; une graine importée arrive au passage suivant ; le
  port passe au niveau 2 et son quai s'allonge.
- La simulation sur 80 nuits : le revenu par jour et les pièces en caisse, avant et après.

## Vérifications et livraison

Celles du README du chantier. Captures : le bac à quai, l'onglet Commandes, l'onglet Import, le port
au niveau 2, le calendrier.
