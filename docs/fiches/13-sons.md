# Fiche 13 — Trois sons : l'arrosage à la cruche, le hibou la nuit, plus de bruit d'eau

## Objectif

- **L'arrosage** : remplacer le son de l'arrosage avec la cruche (`arrosage` dans `js/son.js`)
  par un vrai bruit d'eau versée d'un arrosoir sur la terre, doux et court.
- **Le hibou** : la nuit, un vrai cri de hibou (hulotte, « hou-hou »). Il remplace ou complète
  `chouette`, à des moments espacés, plus présent près des forêts.
- **L'eau** : retirer le bruit d'ambiance de l'eau qui monte quand on s'approche d'une rivière,
  d'un lac ou de la mer (`etat.eaux` et ce qui s'en sert dans `js/son.js`). Les pas dans l'eau
  restent.

## Contexte

- `js/son.js` : les sons et leurs fichiers, les groupes, les ambiances.
- `assets/son/` et `assets/son/CREDITS.md` ; `scripts/son/` : comment les enregistrements libres
  de droits ont été choisis, coupés, normalisés et convertis (ogg et m4a).
- Les PR #331, #332 et #333 (la bande-son, les bêtes enregistrées, les fonds d'ambiance retirés)
  montrent la méthode.

## À faire

1. Trouver des enregistrements sous licence libre (CC0 de préférence, sinon CC-BY crédité dans
   `CREDITS.md`) et les préparer avec les outils de `scripts/son/`.
   - Si le réseau ne permet pas de les télécharger, le dire et garder la méthode prête plutôt
     que de synthétiser un faux son.
2. Les brancher dans `js/son.js`. Retirer les fichiers qui ne servent plus.
3. Mettre les tests à jour s'il en existe sur les sons.

## Critères d'acceptation

- Dans Chromium, aucune erreur de console :
  - la cruche fait le nouveau bruit ;
  - la nuit, le hibou se fait entendre de temps en temps ;
  - près de l'eau, plus de bruit de fond d'eau.
- `npm test` vert, test de fumée sans erreur.

## Livraison

Un commit, pas de push. Rendre compte :
- les sons choisis (source, licence, durée) ;
- ce qui est retiré ;
- les vérifications.
