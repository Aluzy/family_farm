# Fiche 24 — L'eau vivante refondue : tout ce qui bouge se déduit du temps dans le shader

## Objectif

Rendre l'eau vivante (`js/carte/eau.js`) plus belle et moins chère à la fois : plus aucune texture
redessinée à chaque image sans raison, plus aucun sprite pour des points d'un pixel, un seul objet
dessiné par étendue ; et, le coût ainsi libéré, un dégradé de profondeur qui porte au large, des
caustiques, des scintillements plus nombreux et des reflets qui ondulent exactement avec l'eau.

## Contexte

- L'eau vivante : `js/carte/eau.js` (`CarteKit.eauVive`, `EAU`, les shaders `EAU_FRAG` et `EAU_MER`),
  posée sur la scène de la ferme par `js/carte/ferme/eau.js` ; les blocs d'eau du grand monde :
  `js/carte/ferme/eau-monde.js` ; le repeint des étendues : `js/carte/ferme/sol.js`
  (`paintAnimArea`, qui appelle `eauRive`) ; la pêche fait des ronds (`peche.js`, `rond`).
- Les mesures : `docs/perf.md` (« Près de l'étang » : 3,8 ips avant, 8,9 après les premières
  retouches ; « ce qui reste près de l'étang est surtout le dessin de l'eau vivante ») ; le panneau
  🧪 Test › **Mesurer 30 s**.
- La méthode de référence, comparée ici : les cinq couches classiques de l'eau en pixel art (un
  calque d'eau à part ; une carte de hauteur pour la profondeur ; une texture de caustiques tuilée,
  atténuée au fond ; une carte de déplacement (DUDV) pour les ondulations, quantifiée au pixel ; les
  reflets, l'image retournée, déformée de la même façon ; la rive animée).

### Le constat

Le dépôt a déjà chacune des cinq couches, souvent mieux que la méthode de référence (l'écume qui
suit une vraie distance à la terre, la houle et le ressac de la mer, la berge, l'ombre du soleil,
la nuit). Le coût n'est pas dans le shader : il est dans la glue autour, qui refait à chaque image
ce que le shader sait déduire de `uTemps`. Par étendue visible et par image :

| Ce qui se fait | Pourquoi c'est de trop |
|---|---|
| La carte des vaguelettes (`DynamicTexture` : `clear().draw(ta).draw(tb).render()`) | un rendu hors-écran pour faire glisser deux textures sans raccord : `fract((p + t·v) / 64)` dans le shader fait la même chose pour deux lectures |
| Les reflets : la `DynamicTexture` vidée et redessinée (chaque image proche, les ronds, `erase`, `render`) | même quand rien n'a bougé : les arbres et les maisons au bord d'un étang ne bougent jamais |
| Le filtre Displacement sur l'image des reflets | une deuxième passe plein format ; et il déplace en flottant, le shader en pixels entiers : l'onde et le reflet ne coïncident pas tout à fait |
| L'image de la rive (`terre`) et le masque `sec` (`erase`) | le shader peut lire la rive en premier et rendre ses pixels tels quels : plus besoin ni de l'image ni du masque |
| Les scintillements : jusqu'à `0,05 × cases` Images en mode ADD (≈ 17 sur l'étang de 341 cases), déplacées en JS | des objets de scène pour des croix de 5 px, et le mode ADD coupe le lot de rendu |
| L'ombre de la berge : jusqu'à 6 lectures de `uChamp` par pixel | la distance verticale à la terre ne change pas : elle se calcule une fois, avec le champ |
| `reflet()` : 4 sinus imbriqués par pixel | une texture de caustiques tuilée, dans le canal bleu libre de `eau_bruit`, coûte une lecture |
| La profondeur : `uChamp.r` plafonné à 15 px, assombrissement de 12 % | à une case de la rive, l'eau est déjà plate ; en pixel art, des paliers nets valent mieux qu'un dégradé de 12 % |

### Le principe

> Tout ce qui est statique se calcule une fois (sur le processeur, à la création de l'étendue :
> le champ, la rive, la berge). Tout ce qui bouge se déduit de `uTemps` dans le shader. Aucune
> texture n'est redessinée par image sans qu'une chose ait changé.

Budget par étendue visible et par image : **1 objet dessiné, 0 rendu hors-écran** (les reflets :
seulement quand un objet proche a bougé), ≈ 9 lectures de texture par pixel (13 avant, dont 6
pour l'ombre), 1 sinus (6 avant).

## À faire

Dans l'ordre, chaque étape mesurable à part (🧪 **Mesurer 30 s** près de l'étang des automates,
puis sur la côte du grand monde) :

1. **Les vaguelettes dans le shader.** Une seule texture `eau_vague` de 128 × 64 px (la vaguelette
   `a` à gauche, `b` à droite, chacune un carreau de 64 px sans raccord), générée une fois. Le
   shader lit `a` en `p + t·va` et `b` en `p − t·vb` (`uVit`), et compose comme avant
   (`w = (a + b) / 2`, l'ancien `tb` à alpha 0,5). Supprimer la `DynamicTexture` `carte`, les
   `TileSprite` `ta`/`tb`, `eauCommune` (la carte commune des blocs du monde), et le filtre
   Displacement des reflets (étape 2). La fuite de la fiche 9a liée à la `DynamicTexture` des
   vagues disparaît avec elle (`dynamique()` reste pour la texture des reflets).
2. **Les reflets et la rive lus dans le shader principal.** Deux lecteurs de plus : `uRefl` (la
   `DynamicTexture` des reflets et des ronds, lue avec le même décalage entier `off` que l'eau :
   l'onde et le reflet coïncident au pixel) et `uRive` (les pixels de terre et la berge : s'il y en
   a un, il est rendu tel quel, en premier). Supprimer l'image `terre`, l'image `reflet` et son
   filtre, le masque `sec`/`secImg` et le `erase` : la rive rendue en premier fait le même travail.
   La mer (`EAU_MER`) lit `uRefl` aussi (ses ronds), et garde `uTerre`. Les textures hors-écran de
   Phaser 4 sont rendues avec la même projection que les canevas (`ortho(0, w, h, 0)`, v = 0 en
   bas) : les deux se lisent avec les mêmes coordonnées, sans retournement. Leur contenu est
   prémultiplié : `c = c · (1 − r.a) + r.rgb`.
3. **Les reflets redessinés seulement quand ils changent.** À chaque image, une empreinte
   numérique des objets proches (`v.pres`, déjà relevés toutes les 500 ms) : place, image, sens,
   opacité, échelle ; plus les ronds (vivants, ils changent à chaque image). Si l'empreinte est
   celle de l'image d'avant, ni `clear` ni `render`. Un étang bordé d'arbres : zéro rendu
   hors-écran tant que personne ne passe.
4. **Les scintillements dans le shader.** Supprimer `stepScintille` et ses Images. Dans le shader,
   par cellule de 5 × 5 px de carte et par tranche de temps (décalée d'une cellule à l'autre), un
   hachage décide si la cellule brille ; une croix de 5 px (le cœur plein, le bout des branches pâle), qui
   naît et s'éteint en sinus, ajoutée à la couleur (l'ancien mode ADD) ; loin de la rive
   (`d ≥ 3`). `uScint` : la densité (plus quand le soleil est bas), l'éclat (celui du soleil, rien
   la nuit), la part des dorés.
5. **Les améliorations visuelles, à coût nul** (une fois le cadre stabilisé) :
   - la profondeur : `cap` 15 → 48 px pour les lacs, et trois paliers nets de bleu au lieu du
     dégradé ; la couleur de base vient toujours de la tuile, chaque biome garde sa teinte ;
   - les caustiques : un motif pré-cuit une fois dans le canal bleu de `eau_bruit` ; deux
     lectures en sens contraires, multipliées, atténuées par la profondeur, à la place des quatre
     sinus de `reflet()` ;
   - l'ombre de la berge : la distance verticale à la terre au-dessus (0 à 8 px) dans `uChamp.b`,
     calculée avec le champ ; une lecture au lieu de six (le cisaillement du soleil approché d'une
     lecture décalée : à 4 px de haut, invisible).
6. **Les ronds en uniformes** (facultatif, le dernier gain) : jusqu'à 8 `vec4(x, y, rayon, alpha)` ;
   un anneau = `step(abs(length(p − xy) − r), 0,7)`, un vrai cercle d'un pixel quelle que soit sa
   taille, et plus de rendu hors-écran pour une bulle d'insecte.

Fait dans ce chantier : les étapes 1 à 4. Restent les étapes 5 et 6.

## Hors périmètre

- La mer (houle, lames, ressac, sable mouillé), le champ de distance, la berge, la lune et les
  lueurs de la nuit (`stepEauLumiere`) : déjà corrects et payés une fois ; seules les étapes 1 et 2
  les touchent (les vagues, les ronds).
- Les tuiles animées de Tiled (`assets/eau.tsx`), la qualité « économie » (`merVivante`), le mode
  « animations réduites » (sans eau vivante).

## Critères d'acceptation

- Près de l'étang des automates et sur une côte du monde, aucun rendu hors-écran par image quand
  rien ne bouge au bord (à vérifier dans le profil : plus de `render()` de `DynamicTexture` par
  image hors des moments où un personnage passe).
- Une étendue d'eau vivante est un seul objet de scène (le shader) : plus d'image `terre`, plus
  d'image `reflet`, plus de sprites `eau_scintille`.
- À l'œil : l'eau ondule comme avant (même amplitude, même rythme), la terre des rives ne bouge
  pas, les reflets ondulent avec l'eau, l'écume avance et recule, les scintillements paraissent et
  s'éteignent le jour (plus nombreux et dorés le soir, aucun la nuit), les ronds de la pêche et des
  insectes s'élargissent sur l'eau, la mer bat la plage. Pas de couture entre deux blocs d'eau du
  monde (les vagues et les bruits suivent `uOrigine`).
- Le nombre d'images par seconde près de l'étang ne baisse pas (il doit monter) : mesure avant et
  après dans `docs/perf.md`.
- Pas de fuite sur les allers-retours le long de la mer (fiche 9a : la mémoire graphique revient
  au même niveau).

## Vérifications

- `node --check js/carte/eau.js` ; `npm run build` puis `npm test` (« Tout est vert ») ;
  `node tests/smoke.mjs`.
- Dans Chromium (Playwright) : ouvrir la ferme près de l'étang, la nuit et le jour (le panneau de
  test change l'heure) ; aller à la mer du grand monde ; comparer des captures avant/après.
- 🧪 **Mesurer 30 s** près de l'étang, avant et après chaque étape ; reporter dans `docs/perf.md`.

## Livraison

Un commit par étape (ou un pour les étapes 1 à 4 si elles sont faites ensemble), message en
français ; `docs/perf.md` et `docs/fiches/README.md` à jour (24 : étapes 1 à 4 faites, 5 et 6 à
faire) ; pas de push, pas de PR.
