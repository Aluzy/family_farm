# Le plan d'implémentation du récit

Douze lots en trois priorités : P1 construit la fondation et la première séquence jouable (l'acte
I), P2 l'acte II et l'économie de l'île, P3 la fin de l'aventure et le fil de la lune. Chaque lot
se termine par une validation avant le suivant.

## Les lots

| Lot | Contenu | Fichiers principaux | Dépend de | Priorité | État |
|---|---|---|---|---|---|
| 0. Bible | Ce dossier | `docs/recit/` | — | P1 | fait |
| 1. Moteur du récit | Faits, relations, confiance, répliques dites, carnet ; actes ; conditions ; choix déterministe ; scènes ; validation | `js/engine/recit.js`, `data/recit.json`, `scripts/lib/data.mjs`, `tests/engine/recit.test.mjs` | — | P1 | fait |
| 2. Empreinte et confiance | Calcul de l'empreinte ; montée et baisse de la confiance des hameaux | `js/engine/recit.js`, `crops.js`, `orchard.js`, `devices.js`, `automation.js` ; calibrage avec `scripts/simulate.mjs` | 1 | P1 | fait |
| 3a. Le Gué et la maison de Maurice | Un hameau garanti près de la ferme, la maison de Maurice (vide, jamais fermée) | `js/engine/monde-gen.js`, `monde-hameaux.js`, `js/engine/habitants.js`, `data/monde.json` | — | P1 | fait |
| 4. Personnages écrits et scènes | Achille comme cocher nommé (fiche 12) ; Odile et les autres dans leur hameau ; la fenêtre de scène ; les bulles branchées sur le récit | `js/engine/habitants.js`, `recit.js`, `caleche.js`, `js/ui/habitants.js`, `js/ui/caleche.js`, `js/ui/scene.js` | 1 | P1 | fait |
| 5. Première séquence jouable | L'acte I complet (ci-dessous) | `data/recit.json`, `data/campaign.json`, `js/ui/caleche.js`, `js/ui/didacticiel.js`, `js/ui/carnet.js` | 1, 3a, 4 | P1 | fait |
| 6. Acte II | La première veillée, Frida à la ferme, la fortune de Maurice, les promesses confiées à Achille (l'atelier de Frida vient avec le lot 3b) | `data/recit.json`, `js/engine/recit.js`, `js/ui/caleche.js`, `js/ui/loop.js`, `js/ui/stage.js` | 5 | P2 | fait |
| 3b. Les autres lieux garantis | Bois-Joli, Les Genêts, Les Mouettes, Brumeval, cabane de Johnny, atelier de Frida, l'épave | `monde-gen.js`, `monde-roches.js`, `monde-lieux.js` | 3a | P2 | à faire |
| 7. Économie de l'île | Tissage et couture aux Genêts ; scierie et ébéniste à Bois-Joli ; l'Atelier ne fait plus de meubles ; les commerces du niveau 10 disparaissent | `habitants.js`, `blocs.js`, `data/items.json`, `data/meubles.json`, `data/recipes.json`, `data/niveaux.json` | 3b | P2 | à faire |
| 8. Exploration | Compagnon qui garde la ferme (fiche 19), tente et bivouac, l'équipement (fiche 11) complété de la tente | `compagnon.js`, `night.js`, `equipement.js`, `data/equipement.json` | 1 | P2 | à faire |
| 9. Actes III et IV | L'enveloppe, l'usure des maisons, la seconde veillée, la fête et ses fins, les lettres d'Adèle, les arcs de Théo et d'Achille | `data/recit.json`, `data/campaign.json`, `habitants.js` | 2, 6, 7 | P3 | à faire |
| 10. Le fil de la lune | Fragments, lanterne, repas à Johnny, galerie secrète, pierre et pousse accélérée | `js/engine/grotte.js`, `js/grotte.js`, `js/engine/crops.js`, `data/grotte.json` | 3b, 6 | P3 | à faire |
| 11. Textes et encyclopédie | Retirer « Printemps 2021 », Adèle à la place de Mateo, intros des chapitres, pages des hameaux et des personnages | `data/general.json`, `data/campaign.json`, `encyclopedie_ferme_familiale.json` | 5 | P2 | à faire |

## La première séquence jouable (lot 5)

De l'arrivée par le bac jusqu'à la maison de Maurice ouverte : environ 10 nuits.

1. L'arrivée aux Mouettes, à la place de l'écran d'histoire orphelin.
2. La première lettre d'Adèle et la lettre du notaire raccourcie.
3. Achille et la clé, au premier arrêt de la calèche ; la réplique du cocher et la phrase du
   didacticiel corrigées.
4. Le Gué, hameau garanti ; la maison de Maurice, vide (on ne ferme pas, au Gué).
5. Odile devant la maison et le premier carnet de Maurice, rangé dans le carnet du joueur.
6. Les bulles des habitants du Gué sur le nouveau système, incohérences de l'audit corrigées.
7. Les intros des chapitres 1 et 2 dans la voix d'Adèle et d'Achille.
8. Le plancher de 10 nuits avant l'acte II.

Critères d'achèvement :

- [x] Une nouvelle partie joue les quatre moments dans l'ordre, chacun une seule fois.
- [x] Sauter une scène ou quitter la partie au milieu ne bloque rien.
- [x] Le Gué existe dans 100 mondes tirés au hasard, près de la ferme, sans casser les autres hameaux.
- [ ] Les habitants du Gué se souviennent d'un don pendant 14 jours, en trois répliques selon l'âge du
  souvenir. Reporté : le jeu n'a pas encore de geste pour donner aux habitants (les conditions
  `fait_recent` et `fait_souvenir` sont prêtes) ; à faire avec l'économie de l'île (lot 7).
- [x] Aucune bulle de plus de 110 caractères ; variantes de genre présentes.
- [x] Une ancienne partie se charge sans erreur et reçoit la clé au prochain passage de la calèche.
- [x] `npm test` vert, dont le test anti-restes.
- [x] Sur téléphone (390 × 844 px), jamais deux fenêtres à la fois.

Ce qui a changé en route : la maison de Maurice n'est pas fermée (on ne ferme pas, au Gué) ; la clé
d'Achille dit qu'elle est au joueur (« On ferme pas, ici. C'est pour dire que c'est à toi. »). La scène
d'arrivée attend que le joueur ait répondu au bandeau des cookies. Le Gué garde son nom sur la carte du
monde avant qu'on y soit allé (la lettre d'Adèle et le cocher en parlent).

## L'acte II (lot 6)

- **La première veillée** : au Gué, une nuit de pleine lune, de 19 h à 22 h, l'acte II ouvert et Odile
  rencontrée. Une annonce le soir de pleine lune (à partir de 17 h), Achille et Odile en parlent avant.
  Ses lignes dépendent de ce que le joueur a fait (une promesse commencée, une machine posée, rien) :
  une ligne de scène peut avoir ses conditions. Odile tutoie ensuite ; chaque hameau découvert gagne
  5 points de confiance (`confiance_partout`) ; Achille devient « cordial ».
- **Frida** vient à la ferme au chapitre 4 (le palier « Automatisation » de l'arbre) ; elle parle de la
  taille de la ferme (la condition `empreinte`).
- **La fortune de Maurice** : Achille, à la calèche garée à la ferme, une fois « cordial », après la
  veillée et la nuit 20.
- **Les promesses** (`RECIT.PROMESSES`) : le toit de Garance, les lames de la scie de Bois-Joli, la pompe
  des Mouettes. Le carnet de Maurice les ouvre ; le joueur confie ce qu'il a à Achille, à la calèche, en
  une ou plusieurs fois (`livrerPromesse`). Les quantités sont provisoires.

Reste pour plus tard : la confiance du hameau de chaque promesse (les Genêts, Bois-Joli et Les Mouettes
n'existent qu'avec le lot 3b ; en attente, une promesse tenue donne 3 points à chaque hameau découvert) ;
l'atelier de Frida (lot 3b) ; les veillées suivantes (acte III).

## Les critères de qualité narrative

- **Tests automatiques** : ids uniques, personnages connus, conditions connues et jamais
  impossibles, bulles de 110 caractères au plus, variantes de genre, mots interdits, connaissance
  des personnages, choix déterministe.
- **Simulation longue** (`scripts/simulate.mjs`, joueur automatique) sur 100 nuits en petite ferme
  puis en grande ferme : chaque scène jouée une fois ; aucun acte avant son plancher ; aucune
  galerie sans les quatre fragments ; moins de 10 % de répliques revues dans les 3 jours ; au moins
  30 % de répliques qui dépendent d'un fait, d'une relation ou de la lune ; les deux voies mènent
  à leur fin ; l'autonomie complète pas plus de 10 % plus tôt avec la pierre.
- **Test joueur** (extension de `docs/test-utilisateur.md`), après une heure, sans aide : Pourquoi
  ta famille est-elle venue ici ? Qui est Achille ? As-tu eu envie de retourner voir quelqu'un ?
  As-tu remarqué qu'un personnage se souvenait de toi ? As-tu lu une réplique fausse ou répétée ?
  Réussi si 4 joueurs sur 5 répondent juste à la première question et 3 sur 5 citent quelqu'un à
  la troisième.

## L'extension, tranche par tranche

Chaque tranche : le lieu garanti, les personnages en données, environ 40 répliques chacun, les
faits et leurs réactions, les tests, une simulation, un test joueur.

1. Acte I : Le Gué, Odile, Achille, la maison de Maurice.
2. Cœur de l'acte II : Frida et son atelier, la première veillée, la fortune de Maurice.
3. Les Genêts : Garance, Lise, le tissage.
4. Bois-Joli : Basile, Théo, la scierie et l'ébéniste.
5. Les Mouettes : Fernand, la pêche durable, la pompe.
6. L'exploration : compagnon, tente, équipement.
7. Brumeval, Johnny et le fil de la lune.
8. Actes III et IV.
9. Les hameaux générés : familles de voix et réactions partout.

Les tranches 3 à 5 peuvent changer d'ordre ; 2 et 6 précèdent 7.

## Décisions prises

- La pêche est autorisée ; personne ne chasse.
- Personne ne quitte l'île.
- L'enveloppe de Maurice devient une décision (garder ou donner aux toits).
- La pierre fait tout pousser plus vite sur la ferme.
- Les actes ont des planchers de nuits (10, 25, 45).
- Le carnet du joueur, sans marqueur de quête.
- Les scènes attendent un écran libre ; l'enveloppe est un objet, pas un bouton.
- L'Atelier ne fabrique plus de meubles ; les planches y restent.
- Les commerces du niveau 10 disparaissent.
- L'inventaire du joueur : 3 équipements, une tente, un sac de nourriture (fiche 11 pour
  l'équipement et le sac).
- Format de sauvegarde : `state.recit` est remis par `reparerPartie`, sans changer de version.

## Décisions encore ouvertes

- **Les anciennes parties** : proposé, l'histoire complète pour les nouvelles parties ; pour une
  ancienne, la clé au prochain passage de la calèche et le hameau le plus proche dans le rôle du Gué.
- **La scierie** : proposé, un meilleur rendement que l'Atelier (3 planches pour 2 bois) contre un
  jour d'attente.
- **Le niveau 10**, sans les commerces : proposé, la ferme peut accueillir une veillée de pleine lune.
  Un commerce déjà ouvert dans une ancienne partie : proposé, le remboursement de la somme investie.
- **L'inventaire** : les équipements de la fiche 11 sont des vêtements (tête, corps, mains, pieds) ;
  où vont le bois et la pierre ramassés au loin (proposé : une hotte, liée au nœud « Hotte de
  bûcheron ») ?
