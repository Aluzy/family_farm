# Fiche 4a — Le générateur du monde (les données)

## Objectif

Tirer d'après la graine de la partie le plan du grand monde : relief, humidité, biomes, rivières,
côte, chemins et lieux (hameaux, entrées de grotte, coins de pêche), autour de la ferme posée au
centre. Cette fiche ne fait que les données (et une image d'aperçu pour les relire) : le jeu ne
change pas encore d'aspect. La fiche 4b les dessinera et les rendra marchables.

## Contexte

- Lire d'abord `docs/grand-monde.md` (décisions : taille, monde fermé, biomes, la ferme au centre,
  la calèche ; étapes 1 à 3 faites), puis `js/engine/monde.js` (`MONDE` : 644 × 510 tuiles de
  16 px, régions de `MONDE.REGION` = 64 tuiles ; `FERME_DANS_MONDE` ; `genererMonde` : la ferme
  générée posée au centre, une prairie autour qui n'a encore « rien » ; la carte et les coins de
  cases se font à la première demande ; `regionsPleines`), `js/engine/ferme-generee.js` (le
  générateur de la ferme : `hache`, `bruit`, `teinteHerbe`, son style : un tirage par usage,
  tout déterministe), `js/engine/terrain.js` (`casesDuTerrain`, `regionsVues`) et
  `js/engine/chemin.js` (A* du moteur).
- Décisions à respecter (`docs/grand-monde.md`) :
  - monde fermé : la mer au sud et à l'est, la montagne au nord et à l'ouest, sans bord visible
    (la mer et les sommets ferment le monde) ;
  - biomes : prairie (autour de la ferme), forêt profonde, marais, lande, montagne, sommets
    enneigés, côte (plage, falaises), mer ; des rivières descendent de la montagne à la mer ;
  - la ferme générée reste telle quelle au centre, dans la prairie (ses 144 × 114 tuiles et une
    marge de prairie autour ne changent pas) ;
  - des hameaux reliés par des chemins (ils accueilleront les habitants et la tournée de la
    calèche, étape 7) ; le chemin de la ferme (qui sort à l'est de la ferme, rangée de sa sortie)
    rejoint le réseau ; des entrées de grotte en montagne ; des coins de pêche (lacs, rivières,
    mer).
- Le monde doit rester rapide : le moteur n'a souvent besoin que du terrain ; la carte complète
  ne se fait qu'à la demande (étape 3). La fiche 4b mettra la génération par régions dans un Web
  Worker : écrire le générateur de façon qu'il puisse produire une région à la fois (les champs
  continus : bruits ; les éléments globaux : rivières, chemins, lieux, tirés une fois pour tout le
  monde, légers).

## À faire

1. **Le générateur** (`js/engine/monde-gen.js` ou dans `monde.js`, au choix, en expliquant) :
   `planDuMonde(graine)` → `{ biome (Uint8Array, une valeur par tuile), relief, humidite (si
   utiles, en Uint8Array ou fonctions), rivieres: [[cases…]…], chemins: [[cases…]…], lieux: {
   hameaux: [{ id, case, nom? }], grottes: [{ id, case }], peche: [{ id, case, eau }] } }`.
   Les codes de biome dans un tableau nommé (`BIOMES`), dans les données si c'est l'usage du dépôt
   pour ce genre de réglage (`data/*.json`, voir `data/index.json` et `scripts/lib/data.mjs`) ; les
   réglages (seuils, nombres de hameaux, largeur de la côte…) dans les données aussi.
2. **Les contraintes du monde fermé** : un gradient vers la mer au sud et à l'est, vers les
   sommets au nord et à l'ouest, modulé par des bruits pour que les bords ne soient pas droits ; la
   ferme et sa marge forcées en prairie, avec une transition douce.
3. **Les rivières** : de sources en montagne jusqu'à la mer, en descendant le relief (sans boucle,
   sans traverser la ferme ; un lac là où une rivière ne peut plus descendre, ou elle creuse) ;
   largeur 1 à 3 tuiles.
4. **Les chemins et les lieux** : 6 à 10 hameaux dans les biomes habitables (prairie, lande,
   lisière de forêt, côte), loin les uns des autres ; des chemins (A* sur un coût par biome :
   cher en montagne et en marais, un pont pour une rivière) reliant la sortie est de la ferme et
   les hameaux en un réseau qui fait le tour du monde (la calèche le suivra) ; 3 à 6 entrées de
   grotte au pied de la montagne ; des coins de pêche sur les rives (lac, rivière, mer).
5. **Branchement** : `genererMonde(graine)` expose le plan (`monde.plan` ou `terrain.BIOMES`,
   `terrain.LIEUX`…) sans rien changer encore au terrain (« . » autour de la ferme) ni à la
   carte : la fiche 4b s'en servira. Rien n'est calculé tant qu'on ne le demande pas (paresseux,
   comme la carte), pour que les tests du moteur ne ralentissent pas.
6. **L'aperçu** : un script `scripts/monde/apercu.mjs <graine> [fichier.png]` qui écrit une image
   du plan (un pixel par tuile ou deux, une couleur par biome, les rivières, les chemins, les
   lieux, le rectangle de la ferme) ; écrire le PNG en Node sans dépendance (zlib de Node). Ne
   pas commiter les images produites ; en produire 3 (graines différentes) dans le dossier de
   travail et les donner dans le compte rendu.
7. **Les tests** (`tests/engine/monde.test.mjs` ou un nouveau fichier) : déterministe (même graine,
   même plan ; graines différentes, plans différents) ; la ferme et sa marge en prairie ; la mer
   touche les bords sud et est, la montagne les bords nord et ouest, sur toute leur longueur (pas
   de passage hors du monde) ; chaque rivière va de la montagne à la mer (ou à un lac) en cases
   voisines ; chaque hameau est relié à la ferme par les chemins ; les lieux sont dans des biomes
   qui leur conviennent ; durée de génération mesurée (viser moins de 300 ms dans Node pour le
   plan complet).

## Hors périmètre

- Dessiner le monde, le rendre marchable, le Web Worker, le cache par région (fiche 4b).
- Les décors des biomes (étape 5), leurs ressources et animaux (étape 6), les habitants et la
  calèche (étape 7), le brouillard (étape 8).
- Toucher à la ferme générée ou à son terrain.

## Critères d'acceptation

- Le plan respecte toutes les contraintes ci-dessus, vérifiées par des tests.
- Le jeu est inchangé (`npm test` vert, test de fumée sans erreur, aucune différence visible) et
  `npm test` n'est pas plus lent de plus de quelques secondes.
- Les trois aperçus montrent un monde lisible et varié : biomes en bandes et en taches, côte
  découpée, rivières, réseau de chemins qui fait le tour, la ferme au centre dans la prairie.
- `docs/grand-monde.md` (4a fait, le format du plan) et `docs/fiches/README.md` (fiche 4a :
  fait) à jour.

## Vérifications

- `npm run build && npm test`, `node tests/smoke.mjs`.
- `node scripts/monde/apercu.mjs <graine> <png>` pour 3 graines ; regarder les images (les lire)
  et corriger ce qui n'est pas convaincant avant de livrer.

## Livraison

Un commit sur la branche de travail (conventions de `docs/fiches/README.md`), pas de push.
Rendre compte : le format du plan, les choix (et pourquoi), les mesures, les chemins absolus des
trois aperçus, ce qui reste.
