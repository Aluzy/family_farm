# Fiche I9c — Le port et la caisse en ligne

## Objectif

Faire marcher l'économie à plusieurs : le port, le bac, les commandes et le catalogue d'import
jouent en ligne, avec une caisse et un coffre communs, et chacun voit ce que l'autre vend.

## Contexte

- `docs/ile.md` (D11 : vente libre, pas d'entrepôt ; D14 : la caisse en ligne est commune).
- I1b, I1c (`port.js`, `bac.js`, `state.port`), I2 (le portage), I9a2 (l'horloge commune : le port
  a ses heures, le bac ses jours), I9b (les commandes du monde).
- Les décisions des mondes partagés : F.1, le coffre commun (`worker/src/monde.mjs`) ; les rôles
  (`js/engine/roles.js`) ; le journal du monde (qui a fait quoi) ; les sauvegardes du monde.
- Aujourd'hui, « le Marché » n'est pas ouvert en ligne (README : « Les autres gestes (le Marché…)
  viendront ensuite »).
- Les gemmes et la boutique (`js/ui/gemmes.js`, `worker/src/boutique.mjs`) sont hors de l'économie
  du jeu : ne pas les mêler au port.

## À faire

1. **La caisse commune** : les pièces du monde sont à tous ses membres, comme le coffre. Une vente
   de n'importe quel joueur l'alimente ; un achat de n'importe quel joueur autorisé y puise.
2. **Les commandes** `port.vendre`, `port.acheter`, `port.commander`, `port.niveau` : jouées par le
   serveur, payées tout de suite.
3. **Le bac** accoste à son jour et à son heure de l'horloge commune : tous les joueurs connectés
   le voient arriver, charger et repartir ; il livre les imports et tire les nouvelles commandes.
4. **Le portage à plusieurs** : chaque joueur a sa charge (ses mains, sa brouette) ; la charrette
   est un objet du monde, attelée par un joueur à la fois.
5. **Les rôles** : qui peut vendre, acheter, monter le port (I9e fixe la grille complète ; ici, au
   moins : le visiteur ne vend ni n'achète).
6. **Le journal du monde** note les ventes, les achats et les niveaux du port, avec leur auteur.
7. **Les tests** : deux joueurs vendent le même lot du coffre en même temps (un seul est payé) ;
   une commande honorée à deux ; le bac vu par les deux à la même heure ; la charrette ; les refus
   de rôle.

## Hors périmètre

- Les villageois et la navette en ligne (I9d) ; les contrats d'export (ils suivent, sans fiche
  propre, si I8b est fait).

## Critères d'acceptation

- Deux onglets : l'un vend des carottes, l'autre du bois ; la caisse commune monte de la somme
  juste ; le bac accoste sous leurs yeux à tous deux ; le journal dit qui a vendu quoi.

## Vérifications et livraison

Celles du README du chantier, plus les tests de synchronisation.
