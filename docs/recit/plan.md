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
| 3b. Les autres lieux garantis | Bois-Joli, Les Genêts, Les Mouettes, Brumeval, cabane de Johnny, atelier de Frida, l'épave | `monde-gen.js`, `monde-hameaux.js`, `monde-lieux.js`, `scripts/carte/lieux.py` | 3a | P2 | fait |
| 7. Économie de l'île | Tissage et couture aux Genêts ; scierie et ébéniste à Bois-Joli ; l'Atelier ne fait plus de meubles ; les commerces du niveau 10 disparaissent | `js/engine/ile.js`, `data/ile.json`, `js/ui/habitants.js`, `data/meubles.json`, `data/recipes.json`, `data/niveaux.json` | 3b | P2 | fait |
| 8. Exploration | Compagnon qui garde la ferme (fiche 19), tente et bivouac, l'équipement (fiche 11) complété de la tente | `compagnon.js`, `night.js`, `equipement.js`, `blocs.js`, `data/equipement.json`, `js/ui/depart.js`, `js/ui/fiche-membre.js`, `js/ui/stage-windows.js`, `js/ui/loop.js` | 1 | P2 | fait |
| 9. Actes III et IV | L'enveloppe, l'usure des maisons, la seconde veillée, la fête et ses fins, les lettres d'Adèle, les arcs de Théo et d'Achille | `data/recit.json`, `data/campaign.json`, `js/engine/recit.js`, `js/engine/usure.js`, `js/engine/habitants.js`, `js/ui/habitants.js`, `js/carte/ferme/hameaux.js` | 2, 6, 7 | P3 | fait |
| 10. Le fil de la lune | Fragments, lanterne, repas à Johnny, galerie secrète, pierre et pousse accélérée | `js/engine/fil-lune.js`, `js/grotte.js`, `js/ui/excursion.js`, `js/engine/crops.js`, `data/recit.json`, `scripts/carte/galerie.py` | 3b, 6 | P3 | fait |
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

## Les autres lieux garantis (lot 3b)

- **Les hameaux** : après le Gué, Les Mouettes, Brumeval, Bois-Joli et Les Genêts prennent, dans cet
  ordre, le hameau dont le pays (la côte, la montagne, la forêt, la lande) pèse le plus autour de lui
  (`PLAN_MONDE.HAMEAUX.GARANTIS`). Seuls les noms bougent ; un hameau qui avait tiré un de ces noms en
  reçoit un libéré. Leurs habitants ont le métier du lieu : pêcheurs, mineurs, bûcherons, bergers (le
  tissage et la scierie viendront avec le lot 7). Vérifié sur 100 mondes : les cinq noms, une fois
  chacun, sans doublon.
- **Les lieux isolés** (`lieux.recit` du plan, `PLAN_MONDE.RECIT`) : la cabane de Johnny au fond de la
  forêt, loin des chemins et des hameaux ; l'atelier de Frida sur la rive d'un lac (sinon d'une
  rivière), le plus près de deux hameaux à la fois ; l'épave sur une plage au bord de la mer, loin des
  hameaux. Présents dans les 100 mondes. La cabane et l'atelier sont bâtis en blocs de construction, comme
  les maisons des hameaux (`HAMEAUX.BATISSES`, `planBatisse` : murs, porte, fenêtres, plancher, meubles,
  toit qui s'efface quand on entre) ; y entrer donne un texte (`RECIT.LIEUX`) et note le fait
  `lieu.<sorte>`. L'épave est un dessin (`scripts/carte/lieux.py`), qu'on touche. Ils ne sont pas montrés sur la carte
  du monde : on les trouve en marchant (le fil de la lune n'est jamais signalé).
- **Les anciennes parties** : comme pour le Gué, le monde tiré de la même graine peut changer de noms de
  hameaux ; un hameau déjà visité garde le nom noté dans la partie (la décision sur les anciennes parties
  reste ouverte).

## L'économie de l'île (lot 7)

- **Les ateliers des hameaux** (`data/ile.json`, `js/engine/ile.js`) : on leur passe commande par le cocher, à
  la calèche (l'onglet Commandes, avec les promesses), une fois le hameau connu (décision du lot 8) ; le
  cocher rend les commandes prêtes à son arrêt près du joueur. La fiche du hameau les nomme : à Bois-Joli, la scierie de Basile (2 bois → 3 planches, prêtes le lendemain ; l'Atelier
  garde sa recette, 2 bois → 1 planche, tout de suite) et l'ébéniste, qui vend les meubles ; aux Genêts, le
  métier à tisser de Garance (2 laines → 1 tissu, nouvel objet), la couture (gants, manteau chaud, salopette :
  du tissu et quelques pièces) et les tapis. Une commande se reprend au passage suivant ; l'argent va aux
  familles du hameau (leur bourse). Les commandes sont gardées avec les habitants (`commandes`).
- **L'Atelier** ne fabrique plus de meubles, ni les vêtements de laine (le tablier, le chapeau, les bottes,
  les sacs et le casque y restent).
- **Le niveau 10** : les commerces disparaissent ; la veillée à la ferme les remplace (l'élément
  `veillee`) : un soir de pleine lune, le joueur à la ferme, les voisins viennent (la première fois, la
  scène `veillee_ferme` ; ensuite une fois par pleine lune, de la confiance pour chaque hameau). Une
  ancienne partie qui avait un commerce reçoit ce qu'elle y avait mis (migration 62 → 63 : la somme des
  niveaux payés ; une notification le dit).
- Le joueur automatique n'achète plus de commerce ; les ateliers des hameaux ne lui servent pas encore.
- Décision du lot 8 : loin de la ferme, ce que donne un geste tombe au sol, comme sur la ferme ; ramassé, il
  entre dans l'inventaire de la ferme (il n'y a qu'un inventaire : rien ne change, `js/engine/outils.js`
  ramasserMorceau).

## L'exploration (lot 8)

- **Le compagnon est obligatoire** au départ (`js/ui/depart.js` : l'écran « avec un compagnon ? » est ôté,
  on choisit directement son personnage et son prénom). Le moteur (`composeFamily`) l'accepte encore absent :
  les anciennes parties et les tests sans compagnon marchent.
- **Il garde la ferme** : il faisait déjà ses gestes pendant que le joueur est loin (fiche 19) ; ce qu'il fait
  quand le joueur explore ou bivouaque est compté (`noterGarde`, `state.compagnon.garde`), et au retour à la
  ferme il le dit chaleureusement, une fois (`retourCompagnon`, `watchGarde` dans `js/ui/loop.js`) : les
  phrases de `RECIT.COMPAGNON` (un accueil, puis arroser, cuisiner, ramasser, bêtes, au plus trois, puis la fin :
  « La maison était trop calme sans toi. Assieds-toi et raconte-moi tout. »). Ton plus chaleureux demandé à la
  relecture du lot 8.
- **La tente** (nouvel objet, `EQUIPEMENT.TENTE`) : elle se fabrique à l'Atelier (onglet équipement : 12 fibres,
  2 planches, 2 cordes, recette provisoire) et se porte dans une case de la fiche du personnage, à côté du
  sac (`poserTente`, `retirerTente`, l'action `fiche-tente`). La clé `equipement.tente` n'existe que si elle
  est portée (rien à migrer).
- **Le bivouac** : loin de la ferme, la nuit, sa tente portée, « Dormir » plante la tente là où il est
  (`dormirSousTente`, `state.bivouac`) au lieu de le faire rentrer ; l'énergie remonte comme dans un lit ; il
  ne prend pas de couchage de la maison (`nuitSansCouchage`) ; le bivouac finit avec la nuit et il se réveille
  au même endroit. La tente est dessinée là (`assets/tente.png`, `scripts/carte/tente.py`). Sans tente, il
  rentre dormir à la ferme (une notification le dit).
- Icônes pixel ajoutées : ⛺ 🧵 🪡 🪑 📓 💌. Corrigé en passant : la notification « mal dormi » nommait
  « Adulte 2 » au lieu du prénom.
- Tests : `tests/engine/exploration.test.mjs`.

## Les actes III et IV (lot 9)

- **L'enveloppe de Maurice** : au niveau 9, la seconde lettre du notaire apporte l'enveloppe (un objet,
  `enveloppe_maurice`, catégorie « souvenir », ni vendue ni rachetée) au lieu des 15 000 pièces. Le mot de
  Maurice est sur le dessus : « Pour les toits de Céron : Odile saura. Ou pour toi, si tu en as plus besoin
  qu'eux. Tu sauras. M. » L'ouvrir (sa fiche, dans l'inventaire) garde les pièces (`ouvrirEnveloppe`,
  `enveloppe.ouverte`) ; toucher Odile l'enveloppe en poche joue la scène `enveloppe_odile` et la donne
  (`enveloppe.donnee`) : les toits abîmés sont réparés, un par nuit, et plus aucun ne s'abîme. Migration
  63 → 64 : une partie qui avait reçu les pièces a ouvert l'enveloppe ; une partie qui avait la lettre sans
  l'avoir ouverte reçoit l'enveloppe.
- **L'usure des toits** (`js/engine/usure.js`, `RECIT.USURE`) : à partir de l'acte III, toutes les 4 nuits, un
  toit s'abîme dans un hameau découvert (au plus 2 par hameau). Il se voit sur la carte (des trous dans la
  couverture, `js/carte/ferme/hameaux.js`). On le répare depuis la fiche du hameau, sur place (6 planches,
  4 pierres : provisoire) : la confiance du hameau gagne 5 points.
- **La seconde veillée** (`veillee_2`) : au Gué, à la pleine lune de l'acte III ; elle parle de la ferme
  (l'empreinte, les machines, les promesses, l'enveloppe, les toits). Une annonce le soir, comme la première.
- **La voie et la fin** (`finAventure`, `RECIT.FINS`) : grande ferme quand l'empreinte est haute ; ce que le
  joueur a rendu (l'entretien : une promesse tenue 1, un toit réparé 1, l'enveloppe donnée 3 ; la nature : les
  arbres plantés). Petite et 4 points d'entretien : « le nouveau Maurice » ; petite, sinon : « le voisin
  tranquille » ; grande, 4 points et 10 arbres : « celui qui a fait autrement » ; grande, sinon : « le riche
  d'à côté ». Seuils provisoires.
- **La fête des premiers arrivants** : Achille l'annonce à la calèche à l'acte IV (`fete_annonce`, Brumeval
  montré sur la carte) ; à Brumeval, une nuit de pleine lune, de 19 h à 23 h, la scène de la fin
  (`fete_<fin>`) se joue et la fige (`fin.<id>`). Le nouveau Maurice reçoit la cloche de la calèche de Maurice
  (`cloche_maurice`). Une annonce le soir.
- **Les lettres** (`COURRIER`, conditions `chapitre`, `fait`, `apres`) : Adèle à la première récolte, à la
  première veillée, au robot (`machine.station_robot`, noté la nuit), puis une lettre par fin ; Théo, cinq
  jours après son départ. Une ancienne partie reçoit, déjà lues, celles dont le moment est passé.
- **Théo et Basile** vivent à Bois-Joli, dans le même foyer (`habite.avec`, `installerEcrits` : un Bois-Joli
  peuplé avant les reçoit). Toucher Théo : la rencontre, puis, à l'acte III, il veut partir (`theo_confie`) ;
  toucher Basile, c'est lui parler : Théo devient l'apprenti d'Achille (le joueur a fait sa tournée), reprend
  l'atelier en le modernisant (une machine à la ferme), ou part (il quitte Bois-Joli la nuit suivante ; sa
  lettre arrive cinq jours après). Une scène peut maintenant s'ouvrir au toucher d'un personnage (`touche`).
- **La relève d'Achille** : à l'acte III, à la calèche, Achille « cordial » : son cheval boite (plutôt que lui
  malade : la bible interdit la maladie comme sujet) ; il demande qu'on passe aux Genêts et à Bois-Joli
  (`noterVisite`, `tournee.<hameau>`, les deux hameaux montrés). Fait, il le remercie (`achille.tournee`) ; à
  l'acte IV, il dit qui reprendra : Théo (apprenti), un jeune d'un hameau (6 hameaux découverts), ou personne.
- Des répliques de plus : Achille, Odile, Fernand, Basile et Théo (les toits, l'enveloppe, l'empreinte à
  l'acte III, la fête, la cloche).
- Le lieu d'un hameau garanti est maintenant son id (`gue`, `bois_joli`, `brumeval`…) ; l'effet `montrer`
  accepte un hameau garanti ou une liste ; les effets `donner` et `prendre` ; les conditions `objet`, `touche`,
  `voie`, `fin`, `hameaux_min`.
- Tests : `tests/engine/recit-actes34.test.mjs`.

## La cale du bac (après le lot 9)

- Aux Mouettes, la cale du bac : la seule porte vers Cadolon, par où la famille est arrivée (docs/recit/bible.md).
  Un lieu du récit de plus (`lieux.recit`, sorte `cale`, monde-gen.js `calePossible`) : une case de terre au bord
  de la mer, la plus près du hameau (à 8 tuiles au moins, 40 au plus, loin des coins de pêche), d'où une jetée
  de pierre de 5 cases avance droit dans la mer, le bac amarré le long de son bout. Présente dans les 48 mondes
  essayés. On marche jusqu'au bout de la jetée ; toucher le bac donne un texte (`RECIT.LIEUX.cale` : les
  premiers jours, il repart ; la nuit, il dort ; sinon, la porte vers Cadolon) et note `lieu.cale`.
- Décision : la partie commence toujours à la ferme (la scène d'arrivée raconte le débarquement) ; la cale
  existe pour qu'on puisse y revenir.
- Le dessin : `scripts/carte/lieux.py` (`cale`, quatre sens), posé comme un ponton (`js/engine/monde-lieux.js`).

## Le fil de la lune (lot 10)

Rien ne le signale (`js/engine/fil-lune.js`, `RECIT.FIL`) ; seules les pages du carnet s'annoncent.

- **La note « J. »** : Achille, à la calèche, une fois « proche », après la fortune de Maurice (`note_j`).
- **La page de bord** : à l'épave, la nuit, la lanterne-tempête à la main. La lanterne est une pièce
  d'équipement (les mains, un peu de vue la nuit), fabriquée à l'Atelier (1 lingot de fer, 1 planche,
  1 champignon lumineux : provisoire) ; dessinée sur le portrait. Une entrée de `RECIT.LIEUX` peut maintenant
  avoir son effet (la page), et les conditions `equipe`, `fragment`, `sans_fragment`, `plat` existent.
- **Les relevés de Frida** : la deuxième fois qu'on entre dans son atelier, Frida rencontrée (`frida_releves`).
- **Johnny** (`visiteJohnny`) : on entre dans sa cabane ; il accueille sans se souvenir ; un plat cuisiné
  apporté, un par jour, est un repas ; après trois repas, la nuit (20 h – 6 h), une bribe par phase (croissante,
  pleine, nouvelle) va au carnet ; tard les nuits de pleine lune (23 h – 5 h), la cabane est vide. Johnny ne se
  montre pas sur la carte : sa voix seulement.
- **La galerie secrète** : les six pages au carnet, une nuit de pleine lune, de 22 h à 4 h : au niveau 4 de la
  mine de la ferme, une fissure d'une lumière froide sur une paroi (`fissureDuNiveau`) ; on y passe : une
  petite chambre fixe (`niveauGalerie`, `niveau=galerie`), une couverture, une tasse, des phases de lune
  gravées, la pierre (un appui la prend). Les images : `assets/galerie.png` (`scripts/carte/galerie.py`).
- **La pierre** : sa fiche dans l'inventaire, à la ferme : « La poser sur la ferme » (`poserPierre`). Tout y
  pousse plus vite, tout le temps : un stade toutes les 18 heures au lieu de 24 (`heuresPousse`, provisoire,
  pas encore calibré avec le joueur automatique) ; la ferme luit faiblement les nuits de pleine lune (une
  lueur bleutée, `js/carte/ferme/chantier.js`). Frida doute (`frida_pierre`) ; Johnny : « Ah. Elle est rentrée. »
- Pas fait : le souvenir de Lise (facultatif : Lise n'habite pas encore les Genêts) ; Johnny qui maigrit sans
  visite.
- Icônes pixel : la lanterne-tempête, la pierre. Tests : `tests/engine/fil-lune.test.mjs`.

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
- Les commerces du niveau 10 disparaissent ; la ferme accueille une veillée de pleine lune à la place (le
  commerce d'une ancienne partie est remboursé).
- La scierie de Bois-Joli : 3 planches pour 2 bois, contre un jour d'attente.
- L'inventaire du joueur : 3 équipements, une tente, un sac de nourriture (fiche 11 pour
  l'équipement et le sac).
- Format de sauvegarde : `state.recit` est remis par `reparerPartie`, sans changer de version.

## Décisions encore ouvertes

- **Les anciennes parties** : proposé, l'histoire complète pour les nouvelles parties ; pour une
  ancienne, la clé au prochain passage de la calèche et le hameau le plus proche dans le rôle du Gué.
- **L'inventaire** : les équipements de la fiche 11 sont des vêtements (tête, corps, mains, pieds) ;
  où vont le bois et la pierre ramassés au loin (proposé : une hotte, liée au nœud « Hotte de
  bûcheron ») ?
