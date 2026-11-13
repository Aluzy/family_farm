# Fiche I7f — La migration des parties en cours

## Objectif

Porter une partie d'aujourd'hui dans l'île à bâtir sans rien faire perdre au joueur de ce qu'il a
bâti, gagné ou noué : sa ferme, son inventaire, ses pièces, sa progression, et ses amis des hameaux,
qui deviennent les premiers candidats à s'installer chez lui.

## Contexte

- `docs/ile.md` (D7, D8). Toutes les fiches des lots 1 à 7 ont ajouté des champs à la sauvegarde.
- Les migrations : `js/engine/state.js` (1 711 lignes : `MIGRATIONS`), `js/engine/base.js`
  (`STATE_VERSION`, 86 au 12 novembre 2026), `tests/engine/migrations.test.mjs`,
  `tests/engine/anciennes-parties.json` (des parties réelles gardées pour les tests), la fiche 9a.
- Le précédent d'un remboursement : `remboursementCommerce` (`ile.js`, `state.js`).
- Le précédent d'un grand déménagement : `js/engine/demenagement.js`, la migration 51 → 52.
- Le retour du joueur : la fenêtre « Ravi de te revoir ! » (`js/engine/offline.js`, `js/ui/`).
- Ce qu'une partie porte du monde d'avant : `state.monde` (hameaux découverts, habitants, réserves,
  bourses), la calèche (coffre, commandes en cours, malle), l'amitié, les demandes, les projets,
  le récit (scènes vues, confiance, carnet), le courrier, les régions vues (`monde-vu.js`).

## À faire

1. **Un inventaire écrit**, d'abord : chaque champ de la sauvegarde touché, ce qu'il devient
   (gardé, converti, remboursé, archivé, retiré). Le joindre au compte rendu ; le faire valider
   avant de coder s'il y a une perte.
2. **Ce qui ne bouge pas** : la ferme et tout ce qui y est bâti, l'inventaire, les pièces, le
   niveau, l'arbre des technologies, les bêtes, la famille, l'équipement, les plans, les styles.
3. **Le monde** : même graine, même relief (garanti par I7e). Les hameaux disparaissent des régions
   déjà vues ; le brouillard levé reste levé ; le port et le tronçon de chemin paraissent, connus
   d'emblée. Le tronçon devient des blocs du joueur (I2).
4. **Les amis** : chaque habitant dont l'amitié atteint un palier réglé (`MIGRATION.AMI`) devient un
   **candidat** : il garde son prénom, son personnage, ses goûts, son amitié ; il arrivera par le
   bac dès qu'une maison libre l'attend, avant tout villageois tiré. Les autres habitants sont
   oubliés sans bruit.
5. **Les remboursements** : les commandes en cours au cocher et aux ateliers, les semences payées
   et pas reçues, ce que la malle portait : rendus en objets ou en pièces, notés dans les comptes.
   Les matériaux donnés à un projet de hameau inachevé sont rendus.
6. **La progression** : le chapitre atteint donne le palier de l'île correspondant (I7a) ; les
   récompenses déjà reçues ne sont pas redonnées ; ce que le courrier non ouvert contenait est
   remis.
7. **Le récit** : ce que le joueur a vu est résumé en quelques lignes datées dans la chronique
   (I7g), sans nom propre s'il n'y a pas d'autre façon : « Jour 14 : tu découvres un hameau dans la
   forêt ». Rien d'autre n'est gardé.
8. **Le retour** : au premier lancement après la migration, une fenêtre d'une page dit ce qui a
   changé (cinq lignes : le port, les villageois, tes amis vont venir, tes commandes sont
   remboursées, les prix ont changé) et offre un cadeau de bienvenue (réglé). Les prix (fiche I4) : rien à migrer
   (ils ne se gardent pas dans la sauvegarde ; `market.js` `sellPrice(objet, state)` lit ceux de l'île dès que
   `villageActif`) ; la ligne dit que ce qu'on fabrique se vend désormais plus cher que ses matières (de 30 à 60 %),
   et que les villageois gardent une part de ce qu'ils produisent.
9. **La sûreté** : avant de migrer, garder une copie de la partie d'avant dans le navigateur
   (exportable depuis ⚙️ Options), au cas où.
10. **Les tests** : chaque partie de `anciennes-parties.json` migre sans erreur, puis joue 10 nuits
    simulées ; la ferme est identique avant et après (une empreinte des blocs) ; les pièces ne
    baissent jamais ; les amis deviennent candidats ; les remboursements ; la copie de sûreté. Ajouter
    au fichier deux parties récentes (une en début de jeu, une avancée).

## Hors périmètre

- Les mondes en ligne (I9f) ; allumer le réglage pour tout le monde (I9h).

## Critères d'acceptation

- Dans Chromium : une partie avancée, chargée avec le réglage allumé, s'ouvre sur sa ferme intacte ;
  la fenêtre de retour s'affiche ; le port est sur la carte ; au bac suivant, un ancien ami débarque.
- Tous les tests de migration passent ; l'inventaire écrit ne compte aucune perte non validée.

## Vérifications et livraison

Celles du README du chantier. Captures : la fenêtre de retour, la carte du monde avant et après,
l'arrivée d'un ancien ami.
