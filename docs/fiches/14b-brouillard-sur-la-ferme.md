# Fiche 14b — Le brouillard couvre aussi la ferme

La fiche 14 avait mal compris la demande. Le joueur ne veut pas une ferme dégagée : il veut que le
brouillard couvre **tout**, la ferme comprise, pour que tout soit à découvrir.

## Objectif

- **Une nouvelle partie** commence sous le brouillard partout, ferme comprise. Seul le cercle de
  vue autour du personnage est dégagé dès le départ, et le reste se découvre en marchant, ferme
  et prairie comme le monde.
- **Retirer la règle « la ferme et sa prairie vues d'office »** :
  - dans le moteur (`js/engine/monde-vu.js` : les cellules de la ferme relues comme vues, à la
    création comme à la lecture) ;
  - dans la scène (`js/carte/ferme/brouillard.js`) ;
  - et la protection ajoutée par la fiche 14 (`brouillardDe`, `rectFerme`,
    `modèle.brouillard.ferme` dans `js/ui/stage.js`).
- **Les régions vues** (`state.monde.vues`, que le moteur lit pour borner ses revues) doivent
  rester justes. La ferme doit continuer de vivre normalement (cultures, bêtes, famille,
  bâtiments) même sous le brouillard ; si un calcul se servait du « vu » de la ferme, le corriger.
- **Ce qui est sous le brouillard ne se devine pas**, sur la ferme comme ailleurs :
  - **à corriger s'il y a lieu** : les bêtes, la famille, la calèche ;
  - **à voir et à motiver** : ce que le joueur a lui-même construit (maison, cultures) peut
    rester voilé jusqu'à ce qu'il y repasse, ou se voir à travers le voile. Le plus simple : tout
    ce qui a été vu une fois reste vu. Au départ, le joueur n'a rien construit hors de sa vue.
- **La carte du monde et la boussole** suivent : la ferme apparaît sur la carte une fois vue. La
  boussole vers la ferme marche toujours, puisque le personnage sait où elle est.
- **Le didacticiel** reste jouable : ses étapes sur la ferme (la porte, le puits, les cultures…)
  ne doivent pas pointer vers une zone voilée que le joueur ne peut pas atteindre ou comprendre.
  Le rayon de vue au départ doit couvrir ce dont la première étape a besoin, ou la surbrillance
  dégage la cible, au choix motivé. Corriger les textes qui disent que la ferme est dégagée
  (« Ta ferme n'est qu'un coin du grand monde, caché sous le brouillard » peut rester).
- **Les anciennes parties** gardent ce qu'elles ont déjà vu : pas de nouveau brouillard sur une
  ferme déjà découverte. Pas de changement de format si possible.
- **L'aide, l'encyclopédie et les docs** (`docs/grand-monde.md`, la section de la fiche 14) sont
  mis à jour. Les tests qui affirmaient « la ferme vue d'office » sont réécrits pour dire
  l'inverse.

## Critères d'acceptation

- Dans Chromium : une nouvelle partie montre le personnage dans un cercle dégagé, et le reste de la
  ferme sous le brouillard, qui se lève en marchant.
- Le didacticiel va au bout.
- Une ancienne partie garde sa ferme découverte.
- `npm test` vert, test de fumée sans erreur.

## Livraison

Un commit, pas de push. Rendre compte :
- ce qui a été retiré et changé ;
- le choix pour ce qui est construit sous le brouillard ;
- le didacticiel ;
- les vérifications ;
- 4 à 5 captures : le départ d'une nouvelle partie, la ferme à moitié découverte, le
  didacticiel, une ancienne partie.
