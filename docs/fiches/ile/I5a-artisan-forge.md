# Fiche I5a — L'atelier d'artisan, sa boutique, la forge

## Objectif

Poser le socle des commerces d'artisans et le premier d'entre eux : un villageois qui tient la tâche
« pierre et minerai » peut devenir forgeron. Il achète le minerai, fond des lingots, forge quelques
pièces par jour et les vend dans sa boutique. Tout reste artisanal.

## Contexte

- `docs/ile.md` (D5, D15). I3c (les tâches), I4 (la fourchette de valeur, la bourse, l'étal), I6a
  (l'amitié avec le joueur, les demandes).
- Les ateliers sur commande d'aujourd'hui, à remplacer : `js/engine/ile.js` (`ILE.ATELIERS` : la
  scierie, le tissage, la couture, « commande » et « meubles »), `data/ile.json`.
- Les bâtiments reconnus par un bloc clé : `js/engine/blocs.js` (nichoir : le Poulailler ; meule : le
  Moulin…), `js/engine/atelier.js` (recettes, catégories), `docs/gisements.md`, `docs/pioche.md`
  (minerais, lingots, niveaux de pioche).
- Les enseignes : `scripts/batiments/enseignes.py`, `tests/engine/enseignes.test.mjs`.
- Le feu et la fumée : `js/carte/ferme/vapeur.js`, `scripts/batiments/cheminees.py`, `four.py`.

## À faire

1. **Le socle** (`js/engine/artisans.js`, `data/village.json` : `ARTISANS`) : un commerce = une pièce
   close avec son **établi** (le bloc clé), une **enseigne** et un **comptoir** ; un villageois y est
   nommé artisan (à la place de sa tâche). Chaque commerce : ses recettes (`entrees`, `sortie`),
   `LOTS` par jour (3 par défaut), aucune électricité.
2. **Son économie** : l'artisan **achète** ses matières au coffre de la ferme avec sa bourse, au
   prix de vente (les pièces vont au joueur) ; il **transforme** ; il **vend** au comptoir : au
   joueur (au prix de vente), aux autres villageois (leur bourse), et il confie le reste à la
   navette pour le port. Bourse vide : il travaille à façon (le joueur apporte la matière et paie la
   façon). Tout s'écrit dans son journal et paraît au tableau (I3d : une ligne « commerce »).
3. **Ouvrir un commerce** (D15) : trois conditions, puis la décision du joueur.
   - **l'affinité** : l'amitié du villageois avec le joueur atteint le palier réglé
     (`ARTISANS.AMITIE`) ;
   - **l'envie** : il la manifeste de lui-même, une fois qu'il a pratiqué la tâche de la filière
     (`JOURS` jours, 10 proposé) : une bulle (« J'aimerais bien ouvrir une forge… »), une marque sur
     sa fiche, une ligne à la chronique. L'envie ne s'éteint pas (B-1) ;
   - **le local** : le joueur l'a bâti (l'établi, l'enseigne, le comptoir).
   Alors le joueur **décide** (un bouton sur la fiche) ; il peut aussi laisser l'envie sans suite.
   Pas de minuterie cachée : la fiche dit ce qui manque.
4. **La forge** : l'établi « enclume et foyer » ; recettes : minerai → lingot (fer, cuivre, puis or),
   lingots → outils et pièces (clous, charnières, lames) qui entrent dans les recettes de l'Atelier.
   Retirer de l'Atelier du joueur ce que la forge fait désormais **seulement si** une forge existe
   (sinon le joueur reste autonome : pas de blocage).
5. **Artisanal** : `LOTS` ne monte ni avec l'argent ni avec une machine ; il monte d'un lot avec
   l'ancienneté (`ANCIENNETE` jours), et l'amitié (I6a) lui apprend de nouvelles pièces.
6. **Les dessins** (45°) : l'enclume, le foyer de forge (sa lueur le soir), l'enseigne du forgeron,
   le comptoir ; le geste « forger » (d'après « piocher », sans nouvelle planche si possible).
7. **L'interface** : la fenêtre du commerce (ce qu'il fait aujourd'hui, ce qu'il a en vente, lui
   commander une pièce) ; nommer le commerce (I7g gardera les noms).
8. **La sauvegarde** : les commerces, leur stock, leur ancienneté ; format + 1, migration, test.
9. **Les tests** (`village-artisans.test.mjs`) : l'affinité, l'envie et la décision ; l'achat des matières par la
   bourse ; `LOTS` par jour ; la vente aux trois clients ; le travail à façon ; le joueur jamais
   bloqué sans forge.

## Hors périmètre

- La mercerie (I5b), les autres commerces (I5c) ; retirer `ile.js` (I7c).

## Critères d'acceptation

- Dans Chromium : un mineur de dix jours, devenu ami du joueur, dit son envie d'une forge ; le
  joueur bâtit le local et décide ; il
  achète le minerai, fond trois lingots dans la journée, en vend au comptoir ; sa forge rougeoie le
  soir ; le tableau montre son commerce.
- Sans forge, une partie se joue comme avant.

## Vérifications et livraison

Celles du README du chantier. Captures : la forge de jour et le soir, la fenêtre du commerce, le
tableau.
