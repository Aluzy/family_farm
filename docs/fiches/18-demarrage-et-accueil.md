# Fiche 18 — Choisir ses enfants au démarrage et la visite de bienvenue

À faire après la fiche 16.

## Objectif

1. **Les enfants se choisissent au démarrage** : à l'écran de départ, où l'on choisit déjà son
   personnage et son compagnon (`js/ui/depart.js`, `js/engine/depart.js`), on choisit aussi
   l'apparence (et le prénom) de chaque enfant, dans le même style que pour les adultes, parmi
   les personnages enfants (`assets/personnages/`, `memberPerso`, `persoMax`).
   - Une partie déjà commencée ne change pas.
2. **La visite de bienvenue** : le deuxième jour de jeu, en fin de matinée ou à midi, un habitant
   d'un hameau proche vient à pied jusqu'à la maison.
   - Il frappe ou attend devant la porte, dit une phrase d'accueil (« Bienvenue ! Je vous ai
     apporté un bon plat… ») et donne un plat cuisiné : un aliment existant, nourrissant.
   - Puis il repart et disparaît au loin (ou au bord du brouillard).
   - Cela n'arrive qu'une fois par partie (sauvegardé). Le jeu ne doit pas se bloquer si le
     joueur est loin : le plat est alors posé devant la porte ou donné au retour, au choix
     motivé.
   - Voir `js/engine/habitants.js` (choisir l'habitant), `js/carte/ferme/habitants.js` (le
     dessiner, le faire marcher sans traverser les murs), `js/engine/clock.js` et les bulles de
     parole.

## Critères d'acceptation

- Dans Chromium :
  - une nouvelle partie demande les enfants et les montre comme choisis ;
  - le jour 2, l'habitant arrive, parle, donne le plat (+1 à l'inventaire, notification) et
    repart.
- Tests : le choix des enfants, la visite une seule fois, le plat donné même si le joueur est
  absent.
- `npm test` vert, test de fumée sans erreur.

## Livraison

Un commit, pas de push. Rendre compte :
- ce qui a été fait ;
- les vérifications ;
- 4 à 6 captures.
