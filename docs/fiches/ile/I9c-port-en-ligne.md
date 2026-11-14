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

## Revu par I9a2 (l'horloge commune)

- **Le bac et les contrats sont dans le pas du monde** (`pasDuMonde` : `avancerBac`, puis `avancerContrats` quand il
  passe) : chacun voit le bac accoster au même pas, calculé chez lui ; plus besoin de diffuser son arrivée. En ligne, le
  veilleur de la page (`js/ui/port.js` `watchBac`) ne fait plus avancer le bac : il ne dit que ses avis, une fois chacun.
- **Les heures du port** sont celles du pas de la commande (le monde la joue au pas où il est).
- **Le lieu du port** est posé à la mise en ligne (I9f) : en ligne, la page ne l'écrit plus (`watchPort`).
- **Les avis tirés de la partie locale** (bac, contrats) se redisaient après chaque partie refaite : ils sont gardés
  une fois dits (par leur texte). Les autres avis du port (l'étal, les commerces) restent à faire de même.

## Revu par I9b (les changements de l'île)

- **La frontière s'ouvre commande par commande** (`js/engine/frontiere.js`, `COMMANDES_DEHORS`) : les commandes du port
  (`port.*`, `portage.*`) portent la case du personnage (`case`), hors de la ferme : elles sont aujourd'hui refusées sur
  une île (« Hors de la ferme, ce geste ne se fait pas »). Les ajouter à `COMMANDES_DEHORS` ; le moteur vérifie déjà
  la distance au comptoir (`PORT.PORTEE`).
- **Ce qu'un geste lâche dehors va au coffre commun** (le choix d'I9b) ; le sac de chacun (`state.sacs`) ne garde que
  les provisions de sortie. La charge de chacun (ses mains, sa brouette) est à faire ici, à côté : par compte, posée le
  temps d'une commande comme l'énergie et le sac (`avecActeur`, `js/engine/temps-monde.js`).
- **Le monde ne sait pas où est chacun** : `case` (comme `depuis` pour une pièce du monde) vient de la page. Une vente
  « au comptoir » depuis l'autre bout de l'île passerait avec un jeu trafiqué : à garder en tête pour la caisse commune.
- **Les positions des joueurs loin** arrivent une fois toutes les 2 s (l'intérêt par région) : au port, tous ceux qui
  y sont se voient à leur pas.

## Hors périmètre

- Les villageois et la navette en ligne (I9d) ; les contrats d'export (ils suivent, sans fiche
  propre, si I8b est fait).

## Critères d'acceptation

- Deux onglets : l'un vend des carottes, l'autre du bois ; la caisse commune monte de la somme
  juste ; le bac accoste sous leurs yeux à tous deux ; le journal dit qui a vendu quoi.

## Vérifications et livraison

Celles du README du chantier, plus les tests de synchronisation.
