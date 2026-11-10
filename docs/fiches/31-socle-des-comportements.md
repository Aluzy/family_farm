# Fiche 31 — Le socle des comportements : états, perception et pas communs

> **Fait (2026-11-10)** : `js/carte/comportement.js`, la faune du grand monde y est passée à l'identique.
> La visite de bienvenue n'est pas réécrite en `Time.Timeline` (voir « Ce qui a été fait »).

Chantier « Phaser 4 », piste 7 du rapport (le socle ; ce qu'il permet ensuite est la fiche 32). Dépend de
la fiche 30 (le corps et `deplacer`).

## Objectif

Un seul socle pour tout ce qui vit sur la carte (bêtes du monde, bêtes de la ferme, compagnons, famille,
habitants) : une machine à états déclarée en table, une perception calculée une fois par image et rangée
dans une grille spatiale, un pas de déplacement commun, et une séparation douce pour que les acteurs ne se
marchent plus dessus. Sans rien changer à ce qu'on voit dans cette fiche : la faune est migrée telle
quelle, pour prouver le socle.

## Contexte

- Chaque famille d'acteurs a aujourd'hui sa machine à états, ses fonctions d'avance et de choix de case :
  - les bêtes du grand monde : `js/carte/ferme/faune-monde.js` (`switch (b.etat)` : repos, marche, fuite,
    envol, cache, revient, vol, saut, plonge ; la fuite à moins de `e.fuite` px du personnage, quatre
    styles : court, terrier, envol, nage) ;
  - la vie d'ambiance : `js/ambient-life.js` (`EVENTS`, compagnons en tirage pondéré, bêtes de l'Étable et
    du Poulailler sur horaire) ;
  - les habitants : `js/carte/ferme/habitants.js` (horaire, métier, trajets A*, `EVITE` : ils contournent
    le seul personnage du joueur) ;
  - la famille : `js/famille-ferme.js` (flânerie, jeux d'enfants, repas, table).
- Les séquences scénarisées (`visite.js`, `invites.js`, `rencontre.js`) sont pilotées à la main par des
  compteurs dans `stepVisite`, `stepInvites`, `stepRencontre` (`js/farm-stage.js`, lignes 637 à 640).
  `Phaser.Time.Timeline` (présent dans 4.2.1) enchaîne appels, tweens et sons à des instants donnés et se
  met en pause avec la scène.
- Les chemins : `CarteKit.chemin` (`js/carte/chemins.js`) ; le corps : `deplacer` (fiche 30) ; le ressort
  des bêtes : `js/carte/ressort.js`.

## À faire

1. **`js/carte/comportement.js`** (script classique du kit, testé en Node dans une fausse `window`) :
   - une machine à états : par état `{ entre(a, ctx), pas(a, dt, ctx), sort(a, ctx) }`, et une table de
     transitions déclarées (`{ de, vers, si(a, ctx) }`) évaluée à cadence réglable (10 Hz par défaut, pas à
     chaque image) ;
   - la **perception** : une fois par image, la position et la vitesse du personnage, du cheval, des
     chiens, des habitants et des bêtes proches de la vue, rangées dans une grille spatiale (cellules de
     64 px) ; une requête `voisins(x, y, rayon, filtre)` sans allocation ;
   - un **pas commun** : aller vers un but (chemin ou ligne droite), contourner, s'arrêter, via `deplacer` ;
   - la **séparation douce** : une répulsion à courte portée entre acteurs (pas de collision dure), réglée
     par famille d'acteurs (une vache pousse plus qu'une poule).
2. **Migrer la faune du monde** sur le socle, à l'identique : mêmes états, mêmes distances de fuite, mêmes
   styles. Les habitants, la famille et la vie d'ambiance gardent leur code ; chacun pourra migrer dans sa
   propre PR (la fiche 32 dit lesquels).
3. **Les séquences en `Timeline`** : réécrire une seule séquence, la visite de bienvenue (`visite.js`), avec
   `Time.Timeline`, à l'identique ; dire dans la PR si les deux autres valent la peine.
4. Le hasard de la faune passe par un générateur à graine par acteur (graine du monde + identifiant de la
   bête), le même que la fiche 33 généralisera.

## Hors périmètre

- Les nouveaux comportements (alerte, contagion, chiens, habitants qui s'évitent : fiche 32).
- La séparation appliquée aux bêtes de la ferme et aux habitants (fiche 32) : ici, seulement le socle et
  ses tests.

## Critères d'acceptation

- La faune se comporte comme avant : mêmes états, mêmes fuites (un parcours enregistré dans Chromium, même
  graine, avant et après : mêmes trajectoires à quelques px près une fois le hasard à graine en place).
- Tests Node du socle : transitions, perception (voisins dans un rayon, à la frontière des cellules),
  séparation (deux acteurs superposés s'écartent en moins d'1 s), aucune allocation dans `voisins`.
- Le coût par image de la faune ne monte pas (🧪 **Mesurer 30 s** dans une forêt peuplée).
- La visite de bienvenue se joue comme avant (fiche 18).

## Vérifications

`npm run build`, `npm test`, `node tests/smoke.mjs` ; Chromium dans le grand monde (forêt, lande, côte) et
une partie neuve pour la visite de bienvenue.

## Livraison

Un commit ; `docs/architecture-phaser.md` (une section « Les comportements ») mis à jour.

## Ce qui a été fait

- `js/carte/comportement.js` (script classique du kit, chargé après `ressort.js` ; testé en Node :
  `tests/engine/comportement.test.mjs`) : `CarteKit.machine` (les états, l'état suivant que rend leur pas, les
  transitions en table revues à leur cadence, `avant` entre les deux), `CarteKit.perception` (une grille de
  64 px, `voisins` sans tableau neuf, la vitesse d'une image à l'autre), `CarteKit.avance` (le pas commun),
  `CarteKit.separation` (la poussée douce entre voisins), `CarteKit.hasard` et `CarteKit.graine` (le hasard à
  graine).
- **La faune du grand monde** (`faune-monde.js`) y est passée : son `switch` est devenu la table d'états
  `ETATS` et la machine `VIE`, la fuite une transition revue à chaque image (cadence 0, comme avant), son pas
  `CarteKit.avance`, son hasard une graine par bête (son espèce et sa place : le même spectacle pour le
  même monde). Vérifié dans Chromium contre main, en forêt, sur la côte et en montagne : la même
  répartition des états (repos, marche, fuite, envol, cachée), la fuite dès que le personnage approche
  (lapin au terrier, mouette et perdrix en vol), le même coût (≈ 0,04 ms par image).
- **Pas encore appliqués** : la perception et la séparation (les bêtes de la ferme, les habitants : fiche
  32) ; les habitants, la famille et la vie d'ambiance gardent leur code.
- **La visite de bienvenue n'est pas réécrite en `Time.Timeline`** : elle suit des événements (le chemin
  jusqu'à la porte, le personnage proche ou non, la nuit qui tombe), pas des instants fixes ; une Timeline
  n'y retirerait rien. Les invités d'un repas et les scènes du récit sur la carte sont du même genre.
