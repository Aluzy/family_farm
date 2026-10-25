# Fiche 8 — S'orienter : le brouillard, la carte du monde et la boussole

## Objectif

Rendre la découverte du monde visible et utile : un brouillard couvre ce qu'on n'a pas encore vu
et se lève autour du personnage à mesure qu'il marche ; une carte du monde montre tout ce qui a
été vu (biomes, eaux, chemins, hameaux, grottes, coins de pêche, la ferme, la calèche) ; une
boussole aide à revenir à la ferme ou à aller vers un lieu choisi.

## Contexte

- Lire d'abord `docs/grand-monde.md` (étapes 1 à 7 faites ; la décision « Découverte » : le monde
  caché au départ, le brouillard qui se lève, la carte qui ne montre que ce qui a été vu),
  `docs/fiches/README.md`, puis :
  - ce qui retient déjà le vu : `state.monde.vues` (les régions de 64 × 64 tuiles vues :
    `voirRegion`, `regionVue`, `js/engine/terrain.js`), `state.monde.hameaux` (les hameaux
    découverts, 7a), les grottes et coins de pêche (6b), la faune vue (encyclopédie) ;
  - le monde : `js/engine/monde.js`, `js/engine/monde-gen.js` (plan, champs, biomes par case, lieux,
    chemins), `js/engine/monde-sol.js`, `js/monde-worker.js`, `js/ui/monde-sol.js` (le Worker et
    son cache), `js/engine/caleche-tournee.js` (la position de la calèche à toute heure) ;
  - la scène : `js/farm-stage.js`, `js/carte/ferme/sol.js` (`syncRegions`), `js/carte/ferme/camera.js`,
    `js/carte/lumiere.js` (le voile de la nuit : comment un calque couvre la scène),
    `js/carte/ferme/caleche.js` (l'icône au bord de l'écran qui montre la direction de la
    calèche : la boussole peut s'en inspirer) ; l'interface : `js/ui/stage.js`, les fenêtres
    (`js/ui/modal.js`, `js/ui/stage-windows.js`), le menu, `js/ui/testmode.js` (le god mode).

## À faire

1. **Le vu, plus fin que la région** : retenir ce qui a été vu à une maille plus fine que 64 × 64
   (par exemple des cellules de 8 × 8 tuiles, un bit chacune, rangées de façon compacte dans la
   sauvegarde : un tableau de bits en base64 ou par région), mis à jour quand le personnage marche
   (un rayon de vue réglé, plus grand en montagne en hauteur, plus petit en forêt dense ou la
   nuit, au choix motivé) ; la ferme et sa prairie vues d'office ; `state.monde.vues` (les
   régions) reste ce que le moteur lit pour borner ses revues, déduit du nouveau vu ou tenu à
   côté. Format de sauvegarde + 1, avec migration (les régions déjà vues deviennent vues en
   entier) et test.
2. **Le brouillard dans la scène** : sur ce qui n'a pas été vu, un brouillard dans le style du jeu
   (nappes douces aux bords, pas de cases dures ; il bouge un peu, immobile avec « animations
   réduites ») qui se lève en fondu quand on s'approche ; rien de ce qui est sous le brouillard ne
   se laisse deviner (pas d'arbres, de bêtes, d'habitants, ni de calèche qui dépasse). Le coût
   reste faible (un calque par région ou une texture de la vue, à mesurer).
3. **La carte du monde** : une fenêtre (un bouton dans le menu ou la barre, et une touche « M » au
   clavier) qui montre le monde vu, dessiné à petite échelle dans le style du jeu (couleurs des
   biomes, eaux, falaises, chemins, la ferme), le reste dans le brouillard ; les lieux découverts
   avec leurs icônes et leurs noms (hameaux, entrées de grotte, coins de pêche), le personnage
   et sa direction, la calèche si elle est dans une partie vue ; on la déplace et on zoome au doigt
   et à la souris ; toucher un lieu donne son nom et permet de le choisir comme but de la boussole.
   La carte se calcule sans bloquer la page (dans le Worker ou par morceaux), et reste juste pendant
   qu'on la regarde.
4. **La boussole** : une petite boussole à l'écran (dans le style du HUD) dont l'aiguille montre la
   ferme, ou le lieu choisi sur la carte, avec la distance en cases ; elle se cache à la ferme et
   quand aucun but n'est choisi, au choix motivé ; on peut l'enlever dans les options.
5. **Le god mode** (mode test) : « tout voir » et « tout cacher » pour essayer.
6. **Les performances** : mesurer le temps d'une image en marchant (avant/après), le coût de la
   mise à jour du vu, celui de l'ouverture de la carte et la taille de la sauvegarde après un long
   voyage.
7. **Les tests** : le vu (marcher découvre, la nuit et la forêt voient moins loin ; déterministe) ;
   la ferme vue d'office ; les régions vues déduites ; la sauvegarde compacte et sa migration ; la
   carte n'expose rien de non vu (les lieux non découverts absents) ; la boussole (direction,
   distance) ; la ferme et le reste du jeu inchangés.

## Hors périmètre

- La finition (étape 9 : anciennes parties, performances mobiles, aide, encyclopédie,
  didacticiel), sauf ce qu'il faut pour expliquer le brouillard, la carte et la boussole dans
  l'aide.
- Se téléporter avec la carte.

## Critères d'acceptation

- Dans Chromium : une nouvelle partie montre la ferme et sa prairie, le reste dans le brouillard ;
  en marchant, le brouillard se lève en fondu ; la carte du monde montre exactement ce qui a été
  vu, avec les hameaux et les lieux découverts ; on choisit un hameau sur la carte et la boussole
  y mène ; en rouvrant la partie, tout est retenu.
- La ferme est identique ; la fluidité ne baisse pas de façon notable ; la sauvegarde reste
  petite.
- `npm test` vert, test de fumée sans erreur, docs à jour (`docs/grand-monde.md` : étape 8 faite ;
  `docs/fiches/README.md` : 8 fait ; aide et encyclopédie).

## Vérifications

- `npm run build && npm test`, `node tests/smoke.mjs`.
- Chromium : captures du départ (la ferme, le brouillard autour), d'un bord de brouillard pendant
  qu'il se lève, de la carte du monde au début et après un long voyage, d'un lieu choisi sur la
  carte, de la boussole qui y mène, du brouillard la nuit. Les regarder et corriger avant de
  livrer. Donner 6 à 8 captures (chemins absolus).

## Livraison

Un commit sur la branche de travail (conventions de `docs/fiches/README.md`), pas de push.
Rendre compte : le vu (maille, rayon, sauvegarde, migration), le brouillard, la carte du monde, la
boussole, le god mode, les mesures avant/après, les vérifications et leurs résultats exacts, les
captures, ce qui reste.
