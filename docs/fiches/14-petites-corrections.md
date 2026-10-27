# Fiche 14 — Petites corrections : le brouillard sur la ferme, la mine, les canards, l'encyclopédie

## Objectif

1. **Le brouillard couvre la ferme.** Le brouillard couvre toute la carte, y compris la ferme,
   alors que la ferme et sa prairie doivent être vues d'office.
   - Trouver la cause dans `js/engine/monde-vu.js` (la ferme vue d'office, le bitset `monde.vu`,
     la migration) et `js/carte/ferme/brouillard.js` (la texture de la vue, ses coordonnées,
     le décalage de la ferme à [250,198]).
   - Corriger, sur une nouvelle partie comme sur une partie ancienne (témoins de
     `tests/engine/temoins.*`), avec un test qui l'aurait vu.
2. **Les flèches bleues de la mine** : les retirer (`js/grotte.js`, `js/carte/kit.js`…). Si elles
   servaient à indiquer quelque chose (l'échelle, la sortie), garder ce qui est utile sous une
   forme plus discrète dans le style du jeu, ou rien si le dessin le montre déjà.
3. **Les canards** : hors du marais (et hors de l'eau), un canard se tient sur ses pattes, au
   lieu d'être dessiné comme s'il nageait. Dans l'eau ou le marais, il nage comme aujourd'hui.
   - Voir `js/engine/monde-faune.js`, `js/carte/ferme/faune-monde.js` et le script de dessin
     des animaux (`scripts/`).
   - Ajouter les cases « debout » et « marche » si elles manquent.
4. **L'encyclopédie** : mettre à jour les visuels des animaux avec leurs dessins d'aujourd'hui
   (animaux de la ferme, cheval, faune du monde, poissons).
   - Voir `js/engine/encyclopedie.js`, `js/ui/encyclopedie.js`, `encyclopedie.html` et les
     scripts qui en tirent les images.

## Critères d'acceptation

- Dans Chromium : une nouvelle partie montre la ferme sans brouillard ; la mine n'a plus de
  flèches bleues ; un canard sur l'herbe est debout ; les pages des animaux de l'encyclopédie
  montrent leurs dessins actuels.
- `npm test` vert, test de fumée sans erreur.

## Livraison

Un commit, pas de push. Rendre compte :
- la cause du brouillard et sa correction ;
- les autres changements ;
- les vérifications ;
- 4 à 6 captures.
