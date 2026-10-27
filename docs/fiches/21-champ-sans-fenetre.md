# Fiche 21 — Toucher le champ n'ouvre plus de fenêtre

## Objectif

Aujourd'hui, toucher une case de la zone de culture où il n'y a rien à faire ouvre une fenêtre du
jeu. Par exemple, une plante déjà arrosée ouvre la fenêtre « zone » (`fenetre: 'zone'`, voir
`js/ui/stage.js`). Il ne faut plus ouvrir de fenêtre dans ce cas :

- **Une action possible** (labourer, semer, arroser, récolter avec l'outil en main) : elle se
  fait comme aujourd'hui.
- **Rien à faire** (déjà arrosée, en train de pousser, case vide sans outil adapté) : aucune
  fenêtre. Au plus une petite bulle discrète au-dessus de la case, quelques secondes : le nom de
  la plante, « arrosée », « prête dans 3 h »… Elle se répète sans s'empiler.
- **Ce qui ne se voyait que dans cette fenêtre** (détails de la zone, choix des graines…) reste
  accessible par un autre chemin déjà existant (menu, Inventaire, appui long), au choix motivé.
  Rien ne doit disparaître du jeu.
- **Le didacticiel** et les autres textes qui renvoient vers cette fenêtre (`arrosees: { fenetre:
  'zone' }`, notifications avec une cible) sont mis à jour.

## Contexte

- `js/ui/stage.js` (les appuis sur la carte et les cibles des notifications).
- `js/ui/plantation.js`, la fenêtre de la zone et ses fichiers, `js/carte/ferme/*` (l'appui sur
  une case), `js/ui/didacticiel.js`.

## Critères d'acceptation

- Dans Chromium, aucune erreur de console :
  - toucher une plante déjà arrosée, une plante qui pousse ou une case sans action n'ouvre aucune
    fenêtre ;
  - semer, arroser et récolter marchent comme avant ;
  - le didacticiel va au bout.
- `npm test` vert, test de fumée sans erreur.

## Livraison

Un commit, pas de push. Rendre compte :
- ce qui ouvrait une fenêtre et ce qui se passe maintenant ;
- où se trouve désormais ce qu'il y avait dans la fenêtre ;
- les vérifications ;
- 3 à 5 captures.
