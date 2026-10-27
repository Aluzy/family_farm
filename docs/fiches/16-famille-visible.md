# Fiche 16 — La famille reste visible et ne traverse pas les murs

## Objectif

1. **Les enfants ne disparaissent pas** : trouver quand et pourquoi un enfant disparaît de la carte
   (école retirée, trajets, sortie de la vue, fin de trajet sans cible…) et le corriger.
2. **À 19 h, la famille ne disparaît plus en rentrant** : elle rentre dans la maison et y reste
   visible quand le toit est levé. Elle vit dans les pièces (s'assoit, mange, se couche dans ses
   lits) au lieu de s'effacer à la porte.
3. **Les personnages ne traversent pas les murs** : la famille, le personnage principal et les
   habitants des hameaux passent par les portes et contournent les murs, les meubles et les
   blocs posés.
   - Voir la recherche de chemin et les trajets bornés de `js/fermier.js`,
     `js/famille-ferme.js` et `js/carte/ferme/habitants.js`, et les blocs de
     `js/engine/blocs*`.
   - Un trajet impossible (pièce fermée sans porte) s'arrête proprement, sans traversée.

## Contexte

- `js/famille-ferme.js` (la famille sur la carte : horaires, repas, sommeil),
  `js/engine/repas.js`, `js/engine/night.js`, `js/fermier.js`, `js/carte/ferme/chantier.js`
  (le toit qui se lève), `js/engine/habitants.js` et `js/carte/ferme/habitants.js`.

## À faire

- Reproduire chaque défaut dans Chromium.
- Les corriger.
- Ajouter des tests sur ce qui se teste sans navigateur (chemins à travers les murs, cibles des
  trajets, présence des membres à chaque heure).

## Critères d'acceptation

- Dans Chromium, sur une journée complète de 6 h à 23 h :
  - chaque membre reste visible (sur la carte, ou dans la maison quand le toit est levé) ;
  - aucun ne traverse un mur ;
  - les habitants d'un hameau non plus.
- `npm test` vert, test de fumée sans erreur.

## Livraison

Un commit, pas de push. Rendre compte :
- les causes trouvées et leurs corrections ;
- les tests ajoutés ;
- les vérifications ;
- 4 à 6 captures (la famille à 19 h dans la maison, un enfant l'après-midi, un trajet qui
  contourne un mur).
