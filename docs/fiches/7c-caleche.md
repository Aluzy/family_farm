# Fiche 7c — La calèche : le Marché qui fait le tour du monde

## Objectif

Remplacer le Marché par une calèche qui fait le tour du monde par les chemins, de hameau en
hameau et jusqu'à la ferme : on la voit passer, on la hèle quand elle est près de soi ; elle
achète ce que le joueur et les habitants produisent, et ne vend que les produits des habitants
(pris dans la réserve des hameaux) et les graines. Ce que vend le Marché aujourd'hui (outils,
animaux, meubles, aliments) se fabrique désormais à l'Atelier.

## Contexte

- Lire d'abord `docs/grand-monde.md` (étapes 1 à 6, 7a et 7b faites ; la décision « Le Marché
  devient une calèche »), `docs/fiches/README.md`, puis :
  - le Marché d'aujourd'hui : `js/engine/market.js` (prix, cours, `buyItem`, `sellItem`,
    `sellableCount`), `js/ui/marche.js`, `js/ui/commerce.js`, `js/engine/commerce.js`,
    `data/general.json` (`MARCHE`), `data/items.json` (ce qui s'achète), `js/engine/bot.js` (le
    joueur automatique qui vend et achète), `js/engine/inventory.js` ;
  - l'Atelier : `js/engine/atelier.js`, `js/ui/atelier.js`, `data/recipes.json`, la fenêtre et ses
    catégories ; l'arbre des techniques (`js/engine/techtree.js`, `data/techtree.json`), la
    campagne et le didacticiel (`data/campaign.json`, `js/engine/campaign.js`,
    `js/engine/didacticiel.js` : « acheter une houe au Marché », les graines du début…), les
    animaux (`js/engine/animals.js`, `data/animals.json`, la fenêtre Élevage) ;
  - le monde : `js/engine/monde-gen.js` (les chemins du plan, qui relient les hameaux et font le
    tour de la ferme ; « la calèche la suivra »), `js/engine/monde-sol.js` (`caseMarchable`),
    `js/engine/monde-hameaux.js` (la place de chaque hameau), `js/engine/habitants.js` (7b : la
    réserve de chaque hameau, `state.monde.habitants[id].reserve`, les bourses des foyers,
    `ficheHameau`), `js/carte/ferme/habitants.js` ; le cheval (`js/carte/cheval.js`,
    `scripts/carte/cheval.py`) pour le dessin de l'attelage ; `js/carte/triporteur.js` (un
    véhicule qui suit un trajet ; retiré du jeu depuis, avec le triporteur) ; `js/engine/clock.js`, `js/engine/night.js`.

## À faire

1. **La tournée** (moteur, déterministe, réglée dans `data/`) : la calèche suit les chemins du plan
   d'un arrêt à l'autre — la ferme (un arrêt fixe devant son entrée) et les hameaux (leur place) —
   à une vitesse et selon un horaire réglés (par exemple : partir le matin, s'arrêter une heure à
   chaque arrêt, passer à la ferme au moins une fois par jour à heure à peu près fixe, dormir la
   nuit dans un hameau). Sa position se calcule à toute heure d'après le jour et l'heure (pas de
   simulation pas à pas : on peut la retrouver après une absence). Elle passe par les hameaux non
   découverts aussi, mais ne les montre pas. Un horaire lisible : « la calèche passe à la ferme
   vers 10 h ».
2. **Le commerce** :
   - **Elle achète** au joueur ce que la ferme produit et ce qu'il trouve dans le monde (prix et cours
     du Marché d'aujourd'hui, `market.js`, gardés) ; elle achète aussi la réserve de chaque hameau
     quand elle s'y arrête (l'argent va aux bourses des foyers ; la réserve diminue) ;
   - **Elle vend** les graines (comme aujourd'hui) et les produits des habitants qu'elle a dans son
     coffre (ce qu'elle a acheté aux hameaux : bois, poisson, minerai, lait, laine, baies,
     champignons…), en quantité limitée, à un prix réglé ; rien d'autre ;
   - **On commerce** quand la calèche est à côté du personnage : arrêtée à un arrêt, ou hélée en
     chemin (un appui sur elle, ou un bouton quand elle est assez proche : elle s'arrête un moment).
     La fenêtre du commerce (celle du Marché, renommée et adaptée) dit ce qu'elle achète, ce
     qu'elle vend et son stock ; hors de sa présence, elle dit où est la calèche et quand elle
     passe à la ferme.
3. **L'Atelier** : tout ce qui ne s'achète plus (outils, animaux, meubles, aliments, appareils,
   bâtiments…) a sa recette à l'Atelier, avec des ingrédients cohérents avec ce qu'on trouve dans
   le monde (bois, pierre, minerais et lingots, fibres, laine…) ; les animaux, d'une façon simple et
   plausible (par exemple un nichoir ou un enclos avec de quoi les attirer, au choix motivé). Les
   recettes se rangent dans les catégories de l'Atelier, avec leurs déblocages (niveaux, arbre des
   techniques) gardés ou adaptés. La campagne, le didacticiel, l'aide, l'encyclopédie, les
   alertes et le joueur automatique ne parlent plus d'acheter au Marché ce qui se fabrique : vérifier
   qu'une nouvelle partie se joue de bout en bout (le didacticiel arrive au bout, les graines du
   début se trouvent).
4. **La scène** : la calèche dessinée dans le style du jeu (un cheval de `cheval.py` attelé à une
   voiture couverte, le cocher, 4 directions au moins, roues qui tournent, une lanterne la nuit),
   qui roule sur les chemins, s'arrête aux arrêts, se gare devant l'entrée de la ferme ; créée
   seulement près de la vue (sinon sa position seule) ; un tintement ou une bulle quand elle arrive
   à la ferme ; une icône sur le bord de l'écran qui montre sa direction quand elle est proche.
5. **La sauvegarde** : ce qui doit l'être (son coffre, les ventes du jour, l'arrêt hélé…) ; format +
   1, avec migration et test (une partie qui avait un Marché : rien n'est perdu, l'argent et
   l'inventaire restent ; un achat du Marché en cours ou un objet déjà acheté reste au joueur).
6. **Les tests** : la tournée (position déterministe à toute heure, sur les chemins, passage à la
   ferme chaque jour) ; acheter, vendre, ne pas pouvoir quand elle est loin ; la réserve des hameaux
   achetée et payée aux foyers ; elle ne vend que les produits des habitants et les graines ; chaque
   objet qui se vendait a sa recette ; une nouvelle partie va au bout du didacticiel ; le joueur
   automatique tient la route ; la migration.

## Hors périmètre

- Le brouillard, la carte du monde, la boussole (étape 8) ; les maisons qui grandissent, les
  habitants qui achètent à la calèche (plus tard, si besoin).
- Les prix de vente des productions de la ferme (gardés).

## Critères d'acceptation

- Dans Chromium : la calèche arrive à la ferme à l'heure dite, on y vend une récolte et on y achète
  des graines ; on la croise sur un chemin, on la hèle, elle s'arrête ; elle s'arrête à un hameau
  et sa réserve baisse, les bourses montent ; elle vend du bois ou du poisson venu d'un hameau ;
  une houe et un animal se fabriquent à l'Atelier ; une nouvelle partie se joue jusqu'au bout du
  didacticiel.
- La fluidité ne baisse pas de façon notable ; la ferme et ses récoltes se vendent au même prix.
- `npm test` vert, test de fumée sans erreur, docs à jour (`docs/grand-monde.md` : 7c et l'étape 7
  faits ; `docs/fiches/README.md` : 7c fait ; aide, encyclopédie, campagne).

## Vérifications

- `npm run build && npm test`, `node tests/smoke.mjs`.
- Les nouveaux dessins regardés en grand ; Chromium : captures de la calèche sur un chemin (le
  jour, la nuit), arrêtée à la ferme, à un hameau, de la fenêtre du commerce (présente, absente),
  de l'Atelier avec les nouvelles recettes, du didacticiel au moment des graines. Les regarder et
  corriger avant de livrer. Donner 6 à 8 captures (chemins absolus).

## Livraison

Un commit sur la branche de travail (conventions de `docs/fiches/README.md`), pas de push.
Rendre compte : la tournée (arrêts, horaire, calcul de la position), le commerce (achats, ventes,
réserve des hameaux, prix), les recettes ajoutées à l'Atelier et leurs ingrédients, ce qui change
dans la campagne, le didacticiel et le joueur automatique, la scène, la sauvegarde, les mesures,
les vérifications et leurs résultats exacts, les captures, ce qui reste.
