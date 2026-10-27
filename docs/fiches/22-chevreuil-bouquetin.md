# Fiche 22 — Le chevreuil et le bouquetin redessinés

## Objectif

Le joueur a redessiné la première image (`debout_0`) du chevreuil et du bouquetin
(`assets/faune_chevreuil.png`, `assets/faune_bouquetin.png`, 6 cases de 32 × 32 :
`debout_0`, `debout_1` (il broute), `marche_0..3`). Il faut régénérer les 5 autres images à
partir de ce modèle, en respectant ce qu'il a changé :

- les pattes du côté opposé sont plus courtes (la vue est en plongée, top-down) ;
- un vrai museau, la tête de profil tournée vers l'avant ;
- une forme harmonieuse, fidèle à l'animal réel (proportions, encolure, dos, croupe).

## Contexte

- Les dessins viennent de `scripts/carte/faune.py` (fonctions `chevreuil(k, marche)` et
  `bouquetin(k, marche)`), qui écrit les planches et `assets/faune.json`.
- Les modèles du joueur (192 × 32, la première case seule compte) sont dans le dossier de travail
  `faune/` (modele_chevreuil.png, modele_bouquetin.png).

## À faire

- Reprendre la case `debout_0` du joueur pixel pour pixel.
- En déduire les autres : `debout_1` (la tête baissée vers l'herbe, il broute) et un cycle de
  marche en 4 images (les pattes proches et lointaines en opposition, les lointaines plus
  courtes, le corps qui bouge à peine).
- Faire produire les planches par le script (pas d'image peinte à la main hors du script), sans
  changer les tailles, l'ancre ni les noms des cases.

## Critères d'acceptation

- La première case de chaque planche est identique au modèle du joueur.
- Les 5 autres gardent sa silhouette, ses couleurs et ses proportions.
- `npm test` vert, test de fumée sans erreur.

## Livraison

Un commit, pas de push. Rendre compte : les planches avant/après en grand et une animation
de la marche.
