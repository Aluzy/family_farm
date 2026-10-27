# Fiche 10 — Les notifications qui se cumulent

## Objectif

Quand le joueur appuie plusieurs fois de suite sur « Fabriquer » à l'Atelier, chaque appui ouvre
aujourd'hui une nouvelle notification « +1 [mur en bois] ». Il faut qu'une seule notification
reste affichée et que sa quantité augmente : « +1 », puis « +2 », « +3 »… (et si un appui fabrique
plusieurs objets d'un coup, la quantité augmente d'autant). La notification reste à l'écran tant
qu'on continue d'appuyer, puis disparaît comme les autres.

## Contexte

- Lire d'abord `docs/fiches/README.md`, puis :
  - `js/ui/toasts.js` : `notify` (la pile de notifications, une notification identique remplace
    l'ancienne, `notifyDuration`) ;
  - `js/ui/atelier.js` (vers la ligne 274 : `notify(itemsText(r.items, 'gain'))`) et `itemsText`
    (là où il est défini) : le texte « +1 » suivi de l'icône de l'objet ;
  - les autres boutons qu'on presse plusieurs fois de suite et qui annoncent un gain ou une
    dépense par `notify` (chercher `notify(` dans `js/ui/` : la calèche — vendre, acheter —, la
    cuisine, l'Élevage, le coffre, la récolte à la main…).

## À faire

1. **Le cumul dans `notify`** : une option (par exemple une clé de cumul et les objets/quantités
   du gain, ou une fonction qui refait le texte) qui, si une notification de même clé est encore
   affichée, met à jour son texte avec la somme des quantités, repart pour une durée complète et
   ne crée pas de nouvelle notification ; les objets différents d'une même source se cumulent
   chacun (« +2 [planche] +1 [clou] »), une dépense et un gain restent justes (l'argent aussi :
   « +30 » puis « +60 »). Les lecteurs d'écran entendent la nouvelle quantité sans répétition
   gênante. Sans cette option, `notify` ne change pas.
2. **L'Atelier** : « Fabriquer » utilise le cumul (clé : la recette, ou l'objet fabriqué) ;
   changer de recette commence une nouvelle notification.
3. **Les autres boutons répétés** : appliquer le même cumul là où le joueur répète le même geste
   et où une pile de notifications identiques apparaît aujourd'hui (au choix motivé, en restant
   dans des changements simples) ; ne pas toucher aux alertes, repas et lettres.
4. **Les tests** : le cumul (même clé → une notification dont la quantité monte ; clé différente →
   une autre ; après expiration → une nouvelle qui repart de la quantité de l'appui) ; un test
   d'interface s'il en existe pour les notifications.

## Hors périmètre

- Le fond de la fenêtre, le contenu de l'Atelier, de nouvelles fonctions de jeu.

## Critères d'acceptation

- Dans Chromium : cinq appuis rapides sur « Fabriquer » à l'Atelier montrent une seule
  notification « +5 [objet] » ; une autre recette ensuite en montre une seconde ; les autres
  boutons choisis se comportent pareil ; aucune erreur de console.
- `npm test` vert, test de fumée sans erreur, `docs/fiches/README.md` : 10 fait.

## Vérifications

- `npm run build && npm test`, `node tests/smoke.mjs`.
- Chromium : captures de l'Atelier après un appui, après cinq appuis rapides, après un changement
  de recette, et d'un autre bouton cumulé (sur ordinateur et sur le profil mobile). Les regarder et
  corriger avant de livrer. Donner 4 à 6 captures (chemins absolus).

## Livraison

Un commit sur la branche de travail (conventions de `docs/fiches/README.md`), pas de push.
Rendre compte : l'option de `notify`, les boutons qui l'utilisent, les tests, les vérifications et
leurs résultats exacts, les captures, ce qui reste.
