# Phase 4 : vie sociale, exploration et identité

La stratégie (`FAMILY_FARM_STRATEGIE_DEVELOPPEMENT.md`, § 6, phase 4) donne pour cette phase des PNJ
attachants, des dialogues contextuels, des relations et des activités collectives (axe C), des biomes,
une encyclopédie et des découvertes (axe D), et un son adaptatif avec un dernier coup de polish (axe G).
**Elle est réussie quand les joueurs reviennent pour les lieux et les personnages, pas seulement pour
produire.**

Ce document fait l'état des lieux du 5 novembre 2026 et propose les lots, par ordre de priorité.

## 1. Ce qui existe déjà

**Les habitants**
- **Les hameaux** : 6 à 10 sur la carte, dont 4 garantis, plus Le Gué. Leurs habitants sont générés en foyers (`js/engine/habitants.js`) :
  - 80 prénoms et 5 métiers ;
  - un garde-manger, une bourse, du bonheur et la faim ;
  - une vie la nuit, même loin du joueur.
- **Leurs routines se voient sur la carte** (`js/carte/ferme/habitants.js`) : un horaire en 6 temps, les gestes de leur métier, les enfants qui jouent sur la place, le lit de chacun.
- **Leurs paroles** : 60 phrases génériques (selon l'heure, l'activité, le métier, l'humeur), plus 7 saluts selon la confiance du hameau.

**Le récit écrit** (`js/engine/recit.js`, `data/recit.json`, `docs/recit/`)
- 12 personnages, 28 scènes, 43 répliques, 3 promesses, 8 fragments de carnet et 4 lieux qui se lisent.
- Des conditions riches : l'heure, la lune, le lieu, les faits, l'empreinte de la ferme.

**Les liens avec le joueur**
- **L'amitié** (`js/engine/amitie.js`) : une jauge à 5 paliers, les goûts selon le métier, un cadeau par jour, des retrouvailles, des présents devant la porte, des prix et délais plus doux.
- **Les réactions sur la carte** : la colère ou la peur devant un arbre abattu, la joie ou le dégoût devant un cadeau, l'admiration pour un coin dans son style.
- **Les invitations à un repas** (`js/engine/invitations.js`), et le souvenir dont on parle ensuite.
- **Les projets collectifs** : 2 sortes, la place et le jardin.
- **Le reste** : l'accueil au jour 2, les plans de meubles offerts, le compagnon, la calèche et les commandes aux ateliers des hameaux, les veillées de pleine lune, les scènes de fête du récit.

**L'exploration**
- **Le monde** : il est généré, avec 11 biomes, 29 végétaux, des rivières, des lacs, des chemins, des gués et 3 à 6 grottes.
- **Les lieux** : l'entrée des grottes, le ponton, l'épave, la cale, la cabane de Johnny, l'atelier de Frida.
- **Pour s'orienter** : le brouillard, la carte, la boussole et la tente.
- **La nature** :
  - 14 espèces de faune sauvage qui fuient, dorment et se cachent ;
  - 12 trouvailles (fossiles, cristaux, coquillages, champignons…).
- **L'encyclopédie** : 233 pages en 14 catégories, qui se découvrent selon des conditions.

**Le son et l'ambiance** (`js/son.js`, `docs/son.md`, `js/ambient-life.js`)
- Environ 100 sons.
- Un directeur de l'ambiance :
  - les oiseaux le jour, les grillons, la hulotte et les grenouilles la nuit ;
  - une boucle par biome, les sources de la ferme placées dans l'espace, les cris des bêtes ;
  - les pas sur 7 sols.
- 4 thèmes musicaux.
- La vie de la carte : nuages, papillons, oiseaux, feuilles, écureuils, lucioles.

## 2. Ce qui manque

**Les habitants**
- **Ils ne demandent jamais rien**, en dehors des 3 promesses écrites. Il n'y a pas de petites demandes facultatives.
- **Leurs paroles ignorent l'état du monde** : ta ferme, tes récoltes, tes cadeaux, les autres habitants, les événements. Seules 3 conditions du récit lisent la ferme.
- **Ils n'ont pas de liens entre eux** : l'amitié va seulement du joueur vers un habitant.
- **Ils ne se visitent pas d'un hameau à l'autre**, et ne s'entraident pas.
- **Ils vivent tous au même horaire**, avec des besoins réduits à la faim et au bonheur.
- **Aucune fête ni aucun marché générés** : il n'y a que les veillées et les scènes écrites.
- **Cinq personnages écrits ne sont pas encore placés dans le monde** : Garance, Lise, Fernand, Frida et Johnny. Quatre d'entre eux n'ont aucune réplique.

**L'exploration**
- **L'encyclopédie n'a pas de pages** pour les fossiles, les cristaux, les coquillages, les plantes sauvages ni les biomes.
- **La pêche n'a pas d'espèces** : un seul « poisson ».
- **Il n'y a pas de secrets génériques** : ruines, points de vue, arbres anciens, trésors.

**Le son et l'ambiance**
- Il n'y a ni pluie ni météo.
- La musique ne change pas selon le lieu.
- Les habitants n'ont pas de voix.

## 3. Les lots proposés

L'ordre suit la priorité P1 de la stratégie (« PNJ contextuels et relations »), puis la découverte, puis
l'ambiance. Chaque lot est jouable seul, testé, et ne touche ni le monde partagé ni la partie solo
existante.

| Lot | Contenu | Pourquoi |
|---|---|---|
| **V-1 · Ils parlent de ce qu'ils voient** ✅ | Des paroles contextuelles, choisies par conditions et sans répétition proche. Les habitants parlent de ta ferme (ses cultures, ses bêtes, ce que tu as construit), de leurs cadeaux reçus, des autres habitants, de la saison, de la lune, de la nuit passée et de leur dernier souvenir de repas. Environ 150 phrases. | L'objectif « dialogues sensibles à l'état du monde » ; c'est le plus gros manque ressenti. |
| **V-2 · Les petites demandes** ✅ | Des demandes facultatives des habitants (apporter, fabriquer, aider), tirées sans hasard caché selon leur métier et les besoins de leur hameau. Au plus 3 en cours, aucune pénalité si on ne les fait pas. Elles rapportent de l'amitié, un plan, une recette ou un souvenir. Un carnet des demandes. | « Entraide, demandes facultatives » ; une raison de revenir voir quelqu'un. |
| **V-3 · Entre voisins** ✅ | Des liens entre habitants (amis, voisins, cousins d'un hameau à l'autre). Ils se rendent visite, s'entraident quand un garde-manger est vide, et parlent les uns des autres. | « Relations » et « histoires émergentes ». |
| **V-4 · La fête du hameau** | Des événements locaux générés : une fête par saison dans un hameau, un petit marché, les habitants rassemblés sur la place, une musique de fête. | « Activités collectives », un rendez-vous. |
| **D-1 · Le carnet du naturaliste** ✅ | Des pages pour les trouvailles, les végétaux, les biomes et des espèces de poissons, et une condition « biome vu ». Des collections complètes qui donnent un objet à poser (une vitrine, un herbier). | « Encyclopédie : plantes, animaux, minéraux, fossiles », et une progression par curiosité. |
| **D-2 · Les secrets du monde** | Des lieux remarquables générés par biome : ruines, points de vue, arbres anciens, cairns. Chacun garde un petit trésor ou une page de carnet. | « Lieux remarquables, secrets » : que le monde ne soit pas grand mais vide. |
| **D-3 · Les personnages qui manquent** | Placer Garance, Lise, Fernand et Frida dans le monde (Johnny n'existe plus : § 12), et écrire leurs répliques (la bible et le plan du récit en visent environ 40 chacun). | Le récit déjà commencé. Il demande ta validation des textes. |
| **G-1 · Le temps qu'il fait** ✅ | Une météo tirée de la graine, jour après jour : pluie, brume du matin, ciel clair. On la voit et on l'entend, et la pluie arrose le potager. | « Ambiance chaleureuse », un monde qui vit. |
| **G-2 · Les voix et les musiques des lieux** | Un petit babil pour chaque habitant (des syllabes de synthé, pas des mots), et un thème musical par biome et par hameau. | « Audio adaptatif ». |

**Recommandation** : V-1, puis V-2. Ce sont eux qui font revenir pour les personnages. Ensuite D-1 et
G-1, plus courts, qui embellissent ce qui existe déjà.

## 4. Ce qu'on ne fait pas dans cette phase

- Pas de LLM pour les paroles (P3 de la stratégie) : tout est écrit et choisi par des règles, de façon déterministe.
- Pas d'agrandissement de la carte.
- Pas de commerce en ligne (M.4).
- Le grand monde reste au solo (`docs/monde-partage.md`).

## 5. V-1 : fait

- **Les données** : `data/monde.json` › `HABITANTS.PROPOS` contient 115 phrases, réparties en 29 sujets.
  - Pour les adultes : ta ferme (les cultures, le potager vide, les poules, les moutons, les vaches, les ruches, le verger, la maison, le moulin), le cadeau d'hier, ce qu'ils adorent (si tu l'as découvert), les voisins et leur métier, leur enfant, la lune, le mois qui commence, ce que le hameau a rentré hier, la calèche, le projet du hameau, la place finie, ton amitié, les jours depuis ton arrivée.
  - Pour les enfants : leurs propres sujets (leur parent, les poules, les jours comptés, leurs copains, la lune, la place).
- **Le moteur** : `js/engine/propos.js`.
  - Chaque sujet a sa condition, lue dans la partie : il n'est dit que s'il est vrai.
  - Un habitant ne redit pas ses 4 derniers sujets (`state.propos`).
  - Le tirage suit la graine de l'habitant, du jour et de la conversation : la même partie donne la même parole.
  - Pas de sujet quand il a faim : il le dit d'abord.
- **Le branchement** : `paroleHabitant` (`js/engine/habitants.js`) dit un sujet environ 6 fois sur 10 (`PART`), sinon les phrases d'avant. Les répliques écrites du récit, les souvenirs de repas et les remerciements des projets passent toujours en premier.
- **Sur la partie du jour 54** : 268 paroles sur 456 abordent un sujet, avec 19 sujets différents.
- **Les tests** : `tests/engine/propos.test.mjs`.

## 6. V-2 : fait

- **Les données** : `data/amitie.json` › `DEMANDES`.
  - Au plus 3 demandes ouvertes, chacune pour 7 jours. Chaque nuit, 60 % de chances qu'une nouvelle arrive, à partir du jour 3.
  - Par métier, 4 besoins (un objet, une quantité, un motif : « pour réparer mes filets »).
  - Les phrases : la demande, le merci, l'annonce du matin.
- **Le moteur** : `js/engine/demandes.js`.
  - `demandesNuit` vient dans `runNight`, après le changement de jour, mais pas dans un monde partagé. Une demande ne vient que d'un habitant adulte d'un **hameau déjà visité**.
  - Une demande qu'on ne fait pas **s'oublie sans rien coûter**.
  - `rendreDemande` donne 6 points d'amitié et un présent de son métier (`RETOUR.PRESENTS`).
  - Le tirage suit la graine de la ferme et le jour.
- **La parole** : un habitant qui a une demande la dit d'abord (`paroleHabitant`).
- **L'interface** (`js/ui/demandes.js`) :
  - l'annonce au matin ;
  - le carnet « 📜 Demandes » dans le menu, tant qu'une demande est ouverte (qui, quoi, ce que tu en as, le temps qui reste) ;
  - dans la fenêtre « 🎁 Offrir » de l'habitant, sa demande et le bouton « Donner ». Il faut donc aller le voir : c'est voulu.
- **En ligne** : les demandes appartiennent au grand monde, donc à la partie solo. Le geste est refusé dans un monde partagé.
- **Les tests** : `tests/engine/demandes.test.mjs`, et un essai dans le jeu avec la partie du jour 54 (l'annonce, le carnet, « Donner »).

## 7. D-1 : fait

- **30 pages de plus dans l'Encyclopédie** (`encyclopedie_ferme_familiale.json`, 263 pages en tout) :
  - « Les trouvailles du naturaliste » : les 12 trouvailles des biomes (fossiles, cristaux, coquillages, cueillette) ;
  - « Les poissons » : les 7 espèces ;
  - « Les paysages du grand monde » : les 11 biomes.
- **Une nouvelle condition de découverte**, `biome:<biome>` (`js/engine/decouverte.js`) : le personnage est entré dans ce biome. Elle est notée la première fois par `encyclopedieBiome`, appelée depuis `stageIci` (`js/ui/stage.js`).
- **Les collections** (`data/naturaliste.json`, `js/engine/naturaliste.js`). Une collection complète donne une fois un meuble à poser :

  | Collection | Récompense |
  |---|---|
  | Fossiles et cristaux (4) | une bibliothèque vitrée |
  | Trésors de la plage (4) | un tapis bleu |
  | Cueillette des sous-bois (4) | une fougère |
  | Poissons d'ici (7) | un tableau de la mer |
  | Les paysages du grand monde (11) | un bonsaï |

  Leur avancement s'affiche au sommaire de l'Encyclopédie (« 🏆 Collections du naturaliste »). Pas de récompense dans un monde en ligne : l'Encyclopédie est celle de chaque joueur.
- **Limites** :
  - une trouvaille se découvre quand on l'a sur soi, au frigo ou posée : une trouvaille vendue ou mangée avant cette version ne compte pas ;
  - un paysage se découvre en y entrant : ceux parcourus avant cette version se découvriront au prochain passage.
- **Les tests** : `tests/engine/naturaliste.test.mjs`, et un essai dans le jeu avec la partie du jour 54 (199 pages découvertes sur 263).

## 8. G-1 : fait

- **Le temps du jour** (`data/meteo.json`, `js/engine/meteo.js`) : il est tiré de la graine de la ferme et du jour, donc la même partie a le même ciel.
  - Sur une année : environ 61 % de beau temps, 22 % d'averses et 17 % de matins de brume.
  - Le mois compte : Pluvia est le plus pluvieux, Aurea le plus sec.
  - Une averse dure 2 à 5 heures et commence entre 8 h et 18 h. La brume se lève entre 6 h et 10 h.
  - Rien avant le jour 3.
- **La pluie arrose** (`pluieSurLaFerme`, à chaque pas de l'horloge : `js/engine/energy.js`) : pendant l'averse, les cultures de la ferme qui ne le sont pas encore sont arrosées, celles semées sous la pluie comprises. Cela ne coûte ni eau ni énergie. La Serre, couverte, n'est pas arrosée.
- **On le voit** (`js/carte/ferme/meteo.js`) :
  - la pluie : des traits fins qui tombent en biais et un voile gris-bleu, en fondu ;
  - la brume : un voile blanc qui se lève ;
  - à l'abri, dans une pièce dont le toit s'efface, la pluie se voit à peine ;
  - avec des animations réduites, la pluie ne tombe pas : seul son voile reste ;
  - l'icône 🌧️ ou 🌫️ au cadran de l'heure.
- **On l'entend** : une boucle de pluie (`assets/son/ambiance/pluie`, faite par `scripts/son/sons1.py`, `rain_loop`), et les oiseaux se taisent pendant l'averse.
- **On en parle** :
  - une annonce quand l'averse commence ;
  - deux sujets de conversation pour les habitants (V-1) : la pluie du jour, la brume du matin.
- **En ligne** : l'horloge du monde est figée. Le temps reste donc celui du jour, sans arrosage et sans annonce.
- **Les tests** : `tests/engine/meteo.test.mjs`, et un essai dans le jeu avec la partie du jour 54 (l'averse, la brume, le cadran).

## 9. V-3 : fait

- **Les liens** (`js/engine/voisins.js`) : chaque adulte d'un hameau a un ami dans son hameau (d'un autre foyer) et un cousin dans un autre hameau peuplé.
  - Ils sont tirés une fois, de la graine et de l'habitant, puis gardés (`state.voisins.liens`).
  - Ils vont dans les deux sens, tant que l'autre n'a pas déjà le sien.
- **La nuit** (`voisinsNuit`, après la journée des foyers ; pas dans un monde partagé) :
  - **l'entraide** : un foyer qui a eu faim reçoit jusqu'à 3 aliments du garde-manger d'un foyer ami ou cousin ;
  - **une visite** : environ une nuit sur trois, un cousin va voir l'autre.

  Les 40 derniers événements sont gardés (`data/amitie.json` › `VOISINS`).
- **Ils en parlent** (V-1, 6 sujets de plus) : leur ami, leur cousin ou leur cousine (au bon genre), la visite reçue ou faite, l'entraide reçue ou donnée.
- **La fiche du hameau** a une section « Entre voisins » : les derniers événements, par exemple « 👋 Maud, de Hautepierre, est venue voir Suzanne ».
- **En ligne** : la copie mise en ligne perd `state.voisins` (le grand monde, E-8).
- **Coût** : environ 2 ms par nuit sur la partie du jour 54 (63 liens noués).
- **Les tests** : `tests/engine/voisins.test.mjs`, et un essai dans le jeu (la fiche du hameau).

## 10. V-4 : fait

- **Le calendrier des fêtes** (`js/engine/fetes.js`, `data/amitie.json` › `FETES`) :
  - chaque mois (une lunaison de 14 jours), 2 hameaux peuplés font leur fête, chacun un jour différent, à partir du 3ᵉ jour du mois ;
  - le tirage vient de la graine de la ferme et du mois : rien n'est gardé, tout se recalcule ;
  - la fête dure de 17 h à 21 h. Son nom vient du métier du hameau : la fête du bois, de la pêche, de la roche, des laines, des récoltes (sinon « la fête du hameau »).
- **Sur la carte** (`js/carte/ferme/habitants.js`) : pendant la fête, tout le hameau, adultes et enfants, se retrouve sur la place. Toucher un habitant donne une phrase de fête.
- **Y aller** (`allerALaFete`, appelé par `js/ui/fetes.js` quand le personnage est dans le hameau) : une fois par fête, +4 d'amitié avec chaque adulte du hameau et un plat de fête (celui de la bienvenue, selon le métier).
- **On l'annonce** :
  - le matin, une annonce pour chaque fête des 3 jours qui viennent ;
  - le calendrier marque les jours de fête 🎉 et les liste sous la grille ;
  - les habitants en parlent (V-1, 3 sujets de plus) : la fête qui vient (« c'est dans 2 jours ! »), celle de ce soir, et le souvenir de celle où tu étais.
- **Pas de marché ni de musique** pour l'instant : le commerce reste celui du jeu solo (M.4), et les musiques sont prévues avec G-2.
- **En ligne** : rien. Les hameaux restent au grand monde (E-8), et la copie mise en ligne perd `state.fetes`.
- **Les tests** : `tests/engine/fetes.test.mjs`, et un essai dans le jeu avec la partie du jour 54 (la place pleine, l'annonce, le calendrier).

## 11. D-2 : fait

- **Le plan** (`js/engine/monde-gen.js`, `data/monde.json` › `PLAN_MONDE.SECRETS`) : 14 secrets par monde, tirés de la graine avec leur propre hasard (les autres lieux ne bougent pas) :
  - 3 ruines (prairie, lande, forêt), 3 cairns (montagne, lande), 3 arbres anciens (forêt, prairie), 2 belvédères (les plus hauts de la montagne), 3 pierres levées (lande, prairie, marais) ;
  - chacun entouré de terre qui se marche, hors des chemins, loin de la ferme (30 cases), des hameaux (18), des autres lieux (12) et des autres secrets (40) ;
  - environ 15 ms de plus au calcul du plan.
- **Sur la carte** (`scripts/carte/lieux.py`, `js/engine/monde-lieux.js`, `js/carte/ferme/lieux-monde.js`) : un dessin pour chacun (la ruine de la forêt est plus moussue), ses cases fermées à la marche. Tant qu'il n'est pas ouvert, une petite étoile y scintille de temps en temps.
- **L'ouvrir** (`js/engine/secrets.js`, `data/secrets.json`) : le toucher la première fois donne :
  - une page du carnet du voyageur (8 pages, dans l'ordre, une fois sur deux tant qu'il en reste),
  - ou un petit trésor selon la sorte (des pièces, une améthyste, du quartz, un fossile, du miel, des châtaignes…) ;
  - le belvédère, lui, montre le pays tout autour : le brouillard de la carte se lève sur 40 cases.

  Ensuite, une phrase : il a déjà donné son secret.
- **L'encyclopédie** : une catégorie « Les secrets du monde » (🗝️), avec une page par sorte et les 8 pages du carnet (`secret:<sorte>`, `secret:<page>`).
- **Le générateur passe à la version 2** (`GENERATEUR_VERSION`) : le plan a ses secrets, et la végétation est dégagée autour d'eux. La ferme, le sol, les hameaux et les autres lieux ne bougent pas. La migration 71 → 72 garde les parties du générateur 1 et les note au 2.
- **En ligne** : rien. Les secrets sont hors de la ferme, et la copie mise en ligne perd `state.secrets`.
- **Les tests** : `tests/engine/secrets.test.mjs`, et un essai dans le jeu avec la partie du jour 54 (les 14 secrets de son monde, les dessins, l'ouverture).

## 12. Le récit cosy : fait

L'histoire a été réécrite pour une île chaleureuse, comme dans *Animal Crossing* : la proposition, relue et validée, est
la nouvelle bible (`docs/recit/bible.md`, `docs/recit/personnages.md`).
- **Plus de deuil** : Maurice et Philomène, les grands-parents, sont vivants et partis faire le tour des îles en voilier.
  Ils écrivent eux-mêmes : `maurice_terre` au départ, à la place de la lettre du notaire, et `maurice_enveloppe` au
  niveau 9, une carte postale avec l'enveloppe.
- **Johnny supprimé** : sa cabane devient l'observatoire de Maurice (`visiteObservatoire` : de nuit, la longue-vue et
  le carnet du ciel, une page par phase de lune après deux nuits), l'épave la barque des premiers arrivants (le
  journal de bord). La pierre de lune est un fragment de l'étoile tombée il y a cinq siècles.
- **Personne de négatif** : 28 scènes, 44 répliques, les lettres, les pages du carnet, les lieux, les phrases des
  habitants et 25 fiches de l'encyclopédie réécrites. Odile tutoie dès la rencontre ; Achille parle à son cheval,
  Biscotte ; Fernand promet les dauphins ; Théo reste sur l'île (chez Frida, à l'atelier ou sur la calèche) ; les
  quatre fins sont heureuses (« riche » devient « genereuse »).
- **Les mécaniques adoucies** : les toits ne s'abîment plus (une fois par hameau, de 1 à 2 toits à rafraîchir) ;
  personne n'est en colère, même un hameau qui ne te connaît pas ; un coup de hache ou de pioche près d'un habitant
  le surprend gentiment (😮, « Oh ! Tu en replanteras un ? ») ; un cheval tout près aussi.
- **Les parties existantes** : la migration 72 → 73 renomme les faits, les pages du carnet, les scènes dites et les
  lettres (`RECIT_RENOMMAGES`, `js/engine/state.js`) ; Théo revient à Bois-Joli s'il était parti.
- **Les tests** : `tests/engine/recit-cosy.test.mjs` (aucun texte ne parle de Johnny, du notaire, d'un deuil, de
  l'hiver ni de partir ; Odile ne vouvoie pas ; la migration), et ceux du récit mis à jour.

## 13. D-3 : fait

- **Les personnages qui manquaient habitent l'île** (`data/recit.json` › `PERSONNAGES[].habite`, placés par
  `installerEcrits`, comme Odile, Basile et Théo) :
  - Fernand aux Mouettes (pêcheur), apparence 12 ;
  - Garance aux Genêts (bergère), apparence 30, et Lise dans son foyer (une enfant), apparence 32 ;
  - Frida au Gué, dans son propre foyer, apparence 34. Son atelier au bord de l'étang reste son lieu de travail : une
    bâtisse n'a pas d'habitant, et en faire un hameau l'aurait mêlée aux fêtes, aux voisins et aux demandes.
- **Les rencontres** : les toucher la première fois joue leur scène (`garance_rencontre`, `lise_rencontre`,
  `frida_gue`). Frida rencontrée au Gué a quand même sa scène des machines à la ferme, sans se présenter deux fois
  (`frida_ferme_amie`).
- **Leurs voix** : 24 répliques de plus (Fernand 6, Garance 6, Lise 5, Frida 7), dans les voix du récit cosy.
- **Le secret de Lise** (`lise_lucioles`), une fois amie : le souvenir des lucioles au-dessus des bois de la ferme
  (la page `souvenir_lise` du carnet, facultative pour le fil de la lune).
- **L'encyclopédie** : une fiche pour Lise ; celles de Frida et de Garance disent où elles vivent.
- **Les limites** : un hameau sans maison de deux lits n'a pas Lise (comme Théo à Bois-Joli) ; c'est rare.
- **La migration 73 → 74** : une partie qui a déjà vu Frida à la ferme note sa scène comme jouée.
- **Les tests** : `tests/engine/recit-d3.test.mjs`.

## 14. G-2 : fait

- **Les musiques des lieux** (`scripts/son/musique.py`, encodées par `vers_jeu.py`) : cinq thèmes de plus,
  synthétisés comme les autres, en boucle :
  - le hameau (`musique_hameau`, sol majeur, gai, une guitare pincée et un kalimba) ;
  - la côte (`musique_cote`, une flûte et une brise de fa majeur) ;
  - la montagne (`musique_montagne`, lent et ample, des cloches) ;
  - la forêt (`musique_foret`, un kalimba doux en mi mineur) ;
  - la fête du hameau (`musique_fete`, vive et dansante, sans pause pendant la fête).
- **Le directeur du son choisit** (`js/son.js`, `musiqueDuLieu`) : la fête du hameau où l'on est ; le soir et la
  nuit, leurs thèmes ; le jour, celui du lieu (un hameau, la montagne, la côte, la forêt, sinon le thème du matin).
  Un lieu tenu 4 s seulement, pour ne pas changer de musique à chaque pas sur une lisière.
- **La voix des habitants** (`FermeSon.babil`, `FermeSon.voixDe`) : un petit babil synthétisé, une note par
  syllabe, quand un habitant parle (sa bulle, sa réaction) et pour chaque ligne d'une scène du récit. Une voix par
  personnage écrit, et une par habitant généré (selon son genre, son âge et son id). Un réglage la coupe.
- **Les tests** : un essai dans le jeu avec la partie du jour 54 (la ferme le matin, le Gué à 10 h, la fête du bois à
  17 h 30, le soir hors du hameau ; le babil, et rien quand la voix est coupée).
