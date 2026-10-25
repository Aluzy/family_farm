# Fiche 9b — L'aide, l'encyclopédie, le didacticiel et la campagne du grand monde

## Objectif

Finir le projet du grand monde : un joueur qui commence une partie apprend, sans rien lire
d'ailleurs, à sortir de la ferme, à s'orienter, à récolter dans le monde, à trouver les hameaux et
à commercer avec la calèche ; l'aide et l'encyclopédie décrivent le jeu tel qu'il est
aujourd'hui (plus rien de la ville, du Marché, du train…) ; la campagne donne des objectifs qui
mènent dans le monde ; une partie neuve se joue de bout en bout sans accroc.

## Contexte

- Lire d'abord `docs/grand-monde.md` (étapes 1 à 8 et 9a faites ; ce qui a été ajouté à chaque
  étape), `docs/fiches/README.md`, puis :
  - le didacticiel : `js/engine/didacticiel.js` (`ETAPES`, objectifs, déblocages, graines
    offertes), `js/ui/didacticiel.js` (bulle, surbrillances, compteurs), ses tests ;
  - la campagne : `data/campaign.json`, `js/engine/campaign.js`, `js/ui/chapitres.js` ;
  - l'aide : `js/ui/aide.js` ; l'encyclopédie : `js/engine/encyclopedie.js`,
    `js/ui/encyclopedie.js`, `encyclopedie_ferme_familiale.json`, `encyclopedie.html`, les
    scripts qui les génèrent (`scripts/`), `js/encyclopedie.generated.js` ;
  - les alertes et notifications (`js/engine/alerts.js`, `js/ui/notifications.js`), les textes des
    fenêtres et des boutons, `data/*.json` (noms et descriptions des objets) ;
  - le monde et ses lieux : `js/engine/monde-hameaux.js`, `habitants.js`, `caleche.js`,
    `caleche-tournee.js`, `monde-vu.js`, `monde-recolte.js`, `js/ui/carte-monde.js`,
    `js/carte/ferme/boussole.js` ; le joueur automatique (`js/engine/bot.js`).

## À faire

1. **Le didacticiel** : après les étapes de la ferme (gardées, sauf ce qui a changé), une courte
   suite d'étapes qui mène dans le monde, par exemple : ouvrir la carte du monde ; suivre le
   chemin jusqu'à la sortie de la ferme ; couper un arbre ou ramasser quelque chose dans le
   monde ; attendre la calèche à 10 h devant la ferme (ou la héler) et lui vendre une récolte ;
   choisir un hameau sur la carte et y aller avec la boussole. Chaque étape a sa bulle, sa
   surbrillance (le bouton de la carte, la boussole, la calèche…), son compteur, et se valide par
   l'action réelle ; une étape ne bloque jamais (si la calèche est loin : on peut passer, ou
   l'étape attend sans empêcher de jouer). Une partie déjà au-delà du didacticiel n'est pas
   touchée ; une partie en cours dans l'ancien didacticiel le continue sans se perdre (migration
   si la forme change, avec test).
2. **La campagne** : relire tous les chapitres et objectifs : plus rien qui demande la ville, le
   Marché, le train ou un objet qu'on ne peut plus obtenir ; ajouter des objectifs qui font vivre
   le monde (découvrir N hameaux, voir X % du monde, pêcher dans la mer, entrer dans une grotte de
   la montagne, vendre à la calèche, acheter aux hameaux…), répartis dans les chapitres selon la
   progression ; chaque objectif est atteignable (le vérifier par le joueur automatique ou un test
   qui le joue).
3. **L'aide** : réécrire les entrées touchées et ajouter ce qui manque, en phrases courtes, dans le
   style de l'aide d'aujourd'hui : le monde (biomes, chemins, gués), récolter dans le monde,
   grottes, pêche, animaux, hameaux et habitants, calèche, Atelier (ce qui ne s'achète plus),
   brouillard, carte du monde, boussole, option de qualité.
4. **L'encyclopédie** : une relecture complète : pas de page qui parle de ce qui n'existe plus ;
   chaque objet, bête, lieu, métier a sa page juste (comment l'obtenir aujourd'hui) ; les liens
   entre pages marchent ; les conditions de découverte sont atteignables. Un test qui vérifie
   qu'aucune page ne cite un objet retiré ou une fenêtre disparue (« Marché », « ville », «
   train »…) sauf dans un historique voulu.
5. **La chasse aux restes** : chercher dans tout le jeu (textes, données, interface, alertes,
   noms de boutons) les mentions de ce qui a disparu à l'étape 1 et de l'ancien Marché, et les
   corriger ; un test qui l'interdit à l'avenir (une liste de mots, avec des exceptions écrites).
6. **De bout en bout** : dans Chromium, une partie neuve jouée de la première bulle à la fin du
   didacticiel (puis quelques jours) sans erreur de console, sur ordinateur et sur le profil mobile
   de la 9a ; le joueur automatique sur 60 nuits atteint les chapitres comme avant (ou mieux).

## Hors périmètre

- De nouvelles fonctions de jeu (sauf les objectifs de campagne et les étapes du didacticiel).
- Les performances (fiche 9a).

## Critères d'acceptation

- Une partie neuve mène, par le didacticiel, de la ferme au monde, jusqu'à un hameau et à la
  calèche, sans blocage ; la campagne n'a que des objectifs atteignables, dont plusieurs dans le
  monde ; l'aide et l'encyclopédie décrivent le jeu d'aujourd'hui, sans reste de l'ancien.
- `npm test` vert, test de fumée sans erreur, docs à jour (`docs/grand-monde.md` : 9b et l'étape 9
  faits, le projet terminé, avec un récapitulatif de ce qui reste à vérifier sur un vrai
  appareil ; `docs/fiches/README.md` : 9b fait).

## Vérifications

- `npm run build && npm test`, `node tests/smoke.mjs`.
- Chromium : captures des nouvelles étapes du didacticiel (la carte, la sortie de la ferme, la
  calèche, la boussole vers un hameau), d'un chapitre de la campagne avec ses objectifs du monde,
  d'une page de l'aide, d'une page de l'encyclopédie, de la fin du didacticiel sur téléphone. Les
  regarder et corriger avant de livrer. Donner 6 à 8 captures (chemins absolus).

## Livraison

Un commit sur la branche de travail (conventions de `docs/fiches/README.md`), pas de push.
Rendre compte : les étapes ajoutées au didacticiel, les objectifs de campagne (avant/après), les
entrées d'aide et pages d'encyclopédie revues ou ajoutées, les restes trouvés et corrigés, le test
anti-restes, la partie jouée de bout en bout, les vérifications et leurs résultats exacts, les
captures, ce qui reste.
