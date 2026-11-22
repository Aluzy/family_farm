# L'économie de l'île — règles à valider

Statut : **proposition, rien n'est codé**. Ce document fixe les règles avant le chantier ; les points marqués
**[À trancher]** attendent une réponse. Il complète docs/ile-300.md (C1 à C19) et s'appuie sur ce qui existe
déjà : les tâches des villageois (js/engine/taches.js), leur part (js/engine/bourse.js), les commerces
d'artisans (js/engine/artisans.js), l'étal, le port (js/engine/port.js).

## 1. Deux argents distincts

- **E1. La bourse du joueur** : ses pièces (comme aujourd'hui). Il en gagne en vendant, il en dépense en
  achetant aux villageois, en payant ses employés et en faisant des dons.
- **E2. La bourse du village** : un compte à part, qui n'appartient à personne. Elle reçoit les taxes et les
  dons ; elle paie les niveaux de la place et les projets de développement. Le joueur ne peut pas y puiser.
- **E3. La bourse de chaque villageois** : la sienne (il arrive avec ARRIVEE.BOURSE, 20 pièces aujourd'hui).
  Il en gagne par son salaire ou son commerce, il en dépense en achetant (au joueur, aux autres villageois).
- Une bourse ne descend jamais sous zéro : pas de dette (comme la règle B-1 d'aujourd'hui).

## 2. Le port : vendre seulement

- **E4.** Le port (le bloc comptoir_port, une fois le village fondé) **achète** les productions de l'île ;
  il **ne vend rien** : l'onglet d'achat disparaît sur l'île (etalPort vide). Les graines, les outils, les
  matériaux viennent de l'île (la nature, l'Atelier, les commerces des villageois).
- **E5.** Le joueur y exporte ce qu'il a porté au comptoir (comme aujourd'hui). Un villageois y exporte
  aussi son surplus (E12), au passage du bac.
- **[À trancher] E6.** Les contrats d'export du port (fiche I8b) restent-ils ?

## 3. La taxe du village

- **E7.** Chaque revenu du joueur et des villageois est taxé au profit de la bourse du village :
  **taxe = ⌈revenu × taux⌉**, le taux à **5 %** au départ (1 pièce gagnée → 1 pièce de taxe ; 20 → 1 ;
  21 → 2).
- **E8.** Est un revenu : une vente au port, une vente à un villageois ou au joueur, un salaire reçu. N'est
  pas un revenu : un don, une pièce trouvée, un remboursement.
- **E9.** La taxe est prise à chaque vente, sur le montant de la vente (pas une fois par jour).
  **[À trancher]** ou bien une fois par nuit, sur le total du jour (l'arrondi pèse moins).
- **E10.** Le taux se règle au **panneau de contrôle**, un meuble posé dans la mairie à sa construction.
  Avant la mairie, il reste à 5 %. **[À trancher]** ses bornes (proposition : de 0 à 30 %, par pas de 1 %).

## 4. Les villageois : employé ou à son compte

Chaque villageois a l'un de deux statuts, choisi sur sa fiche.

### Employé du joueur (E11)

- C'est la tâche d'aujourd'hui : il travaille à son poste, ce qu'il produit va au coffre du joueur.
- **Il est payé en pièces par le joueur, chaque jour travaillé** (un jour de repos n'est pas payé). Le
  salaire remplace la part en nature d'aujourd'hui (PART : des objets gardés dans son panier).
- **Le salaire, tel que je comprends ta règle** : il est fixé d'avance, d'après ce que le villageois
  rapporte **au minimum** par jour à son poste (la valeur, au prix de l'île, de sa plus petite journée de
  production). Le salaire du jour = 30 % de ce minimum. Exemple : un poste qui rapporte au moins
  100 pièces par jour → 30 pièces par jour, fixes, même un jour où il rapporte 150.
- **[À trancher]** Est-ce bien cela ? Autres lectures possibles :
  - (b) 30 % de ce qu'il a vraiment rapporté ce jour-là (variable chaque jour) ;
  - (c) 30 % de ce qu'il a rapporté, plus un fixe de 30 pièces les jours où il a rapporté 100 ou plus.
- **[À trancher]** Si le joueur n'a pas de quoi payer le salaire du jour : le villageois travaille quand
  même et la dette attend (contre la règle sans dette), ou il ne travaille pas le lendemain (proposition),
  ou il quitte l'emploi au bout de N jours impayés.

### À son compte (E12)

- C'est le commerce d'artisan d'aujourd'hui (fiche I5a : un local, l'établi, le comptoir, l'enseigne). Il
  achète ses matières au joueur (les pièces vont au joueur, taxées), fabrique, et vend au joueur, aux autres
  villageois, puis exporte son surplus au port. Chacune de ses ventes est taxée.
- **[À trancher]** Seulement les métiers d'artisan d'aujourd'hui (filage, forge, menuiserie…), ou aussi un
  villageois qui cueille, pêche ou cultive pour lui-même et vend sa récolte ?
- **E13.** Les villageois achètent entre eux et au joueur (l'étal d'aujourd'hui, à réactiver sur l'île) :
  ce qu'ils aiment, ce dont ils ont besoin (BESOINS), de leur bourse.

## 5. Ce que paie la bourse du village

- **E14. La place** : sa construction reste payée par le joueur, en matériaux (comme aujourd'hui). Ses
  niveaux suivants (NIVEAUX : 600, 2 000, 5 000, 12 000 pièces) sont payés par la bourse du village.
- **E15. Les projets de développement** : la mairie, l'école, des lieux de divertissement, un restaurant
  communautaire, le développement du port, des logements. Chacun a un prix en pièces (payé par la bourse du
  village) et, je propose, des matériaux (fournis par le joueur au chantier, comme la place).
- **E16. Les dons** : le joueur verse des pièces de sa bourse à celle du village (au panneau du village, et
  à la mairie une fois bâtie), pour avancer un niveau ou un projet. Un don n'est pas taxé et ne se reprend pas.
- **[À trancher] E17.** Qui choisit le projet en cours : le joueur (un seul projet à la fois, la bourse du
  village l'achète dès qu'elle a la somme), ou le village tout seul, dans un ordre fixe ?

### Proposition de projets (prix et effets à valider)

| Projet | Prérequis | Prix (village) | Effet proposé |
| --- | --- | --- | --- |
| Mairie | place niveau 2 | 1 500 | le panneau de contrôle (taux de taxe), la liste des projets |
| Logements (par maison) | place | 400 | une maison de plus pour un arrivant, sans que le joueur la bâtisse |
| Restaurant communautaire | mairie | 2 500 | les villageois y mangent : plus de repos faute de repas |
| École | mairie | 3 000 | un villageois apprend un métier plus vite (envie d'artisan plus tôt) |
| Lieu de divertissement | mairie | 2 000 | l'amitié monte plus vite, les villageois sortent le soir |
| Développer le port | port | 1 000, puis ×2 par niveau | de meilleurs prix à l'export, plus de contrats |

**[À trancher]** Ces effets et ces prix sont des propositions de ma part : à garder, changer ou remplacer.

## 6. Ce qui change dans le code (pour plus tard)

- Une bourse du village dans l'état de la partie (sauvegardée), son journal (taxes, dons, dépenses).
- Une fonction unique « encaisser(qui, montant) » par laquelle passe chaque revenu, qui prélève la taxe.
- Le port sans achat sur l'île ; l'étal réactivé sur l'île.
- La fiche du villageois : employé ou à son compte ; le salaire calculé et payé la nuit.
- La mairie et son panneau de contrôle ; la fenêtre des projets ; les niveaux de la place payés par le village.
- Les tests : la taxe arrondie, aucune bourse négative, un don, un niveau payé par le village.
