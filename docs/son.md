# Le son

Le jeu a une bande-son complète : quatre thèmes de musique, les ambiances de la ferme et des
biomes du grand monde, les bêtes, les machines, chaque geste du personnage et les fenêtres de
l'interface. Tout est synthétisé pour le jeu par `scripts/son/`, sauf les bêtes de la ferme,
le chat et le chien de la famille, l'arrosoir, la hulotte et la grenouille : de vrais enregistrements
libres de droits (voir « Les bêtes de la ferme », « Le chat et le chien de la famille », « L'arrosoir,
la hulotte et la grenouille » et `assets/son/CREDITS.md`).

## Découpage

| Fichier | Rôle |
|---|---|
| `js/son.js` | le moteur (`window.FermeSon`, script classique chargé après le kit des cartes) : Web Audio, cinq bus, les boucles, le « directeur » des ambiances, les pas |
| `js/ui/son.js` | côté interface (module ES) : `son(clé)` pour les écrans, l'écoute du journal (pièces, Atelier), la partie « Son » des Options |
| `assets/son/` | les sons, `.ogg` (Vorbis) et `.m4a` (AAC, pour Safari qui ne lit pas l'Ogg), rangés par dossier |
| `scripts/son/` | les générateurs : `musique.py`, `sons1.py`, `sons2.py` (synthèse), `libres.py` (les enregistrements libres de l'arrosoir, de la hulotte, de la grenouille, du chat et du chien, coupés et égalisés), `vers_jeu.py` (encodage et table de `js/son.js` ; `vers_jeu.py clé…` n'encode que ces clés), `fabrique.py` (tout) |

Le moteur ne lit jamais l'état du jeu et ne change rien à la partie. Sans Web Audio, avant le
premier geste du joueur (les navigateurs ne jouent rien avant), ou le son coupé, chaque appel
ne fait rien : les scènes et l'interface l'appellent toujours par
`if (global.FermeSon) global.FermeSon.joue(…)` ou `son(…)`.

### Les bus

| Bus | Curseur des Options | Contenu |
|---|---|---|
| musique | 🎵 Musique | les thèmes |
| nature | 🌳 Ambiance | oiseaux, grillons, vent, forêt, montagne, grotte, grenouilles, cris d'oiseaux et hulotte |
| monde | 🌳 Ambiance | bêtes de la ferme et du grand monde, moulin, four, pompe, asperseurs, robot, ruches, hameaux, botteleuse |
| effets | 🪓 Gestes | outils, pas, ramassage, pêche, construction, échelle |
| interface | 🔔 Fenêtres et messages | fenêtres, onglets, notifications, pièces, niveau, chapitre, technologie |

Un limiteur sur la sortie évite la saturation ; au plus 14 sons courts à la fois (les moins
prioritaires cèdent leur place). Les réglages sont ceux de l'appareil (localStorage
`ferme-son` : volumes, musique « par moments », « continue » ou « coupée », tout couper) ; ils
n'entrent pas dans la sauvegarde.

## Ce qui sonne, et où

### Le directeur (4 fois par seconde)

`directeur()` lit ce que les cartes montrent déjà (`CarteJeu.affichee()`, le modèle de la ferme
`FarmStage.scene().ctx.lastModel`, `FermeHote.maintenant()`) et règle les boucles, en fondus :

- **l'heure** : oiseaux du matin (vers 7 h), du jour (9 h-18 h), grillons du soir (vers 20 h) et
  de la nuit, un peu plus de vent la nuit ; de petits cris d'oiseaux le jour ;
- **la hulotte la nuit** (`hibou`) : un chant toutes les une à deux minutes, toutes les 20 à 45 s
  en forêt ou à moins de 6 cases d'elle (le biome sondé dans 8 directions), et alors depuis les
  arbres ; ni en mer, ni au sommet, ni sous un toit ;
- **le biome sous le personnage** (le grand monde) : mer et plage (moins d'oiseaux), falaise,
  forêt, marais (grenouilles la nuit), montagne et sommet (le vent qui siffle, moins d'oiseaux),
  lande. **Pas de fond d'eau** : la mer, les lacs, les rivières et les mares n'ont pas de boucle
  (leur bruit montait dès qu'on approchait d'une rive) ; restent les pas dans l'eau et, la nuit,
  les grenouilles près des mares de la ferme ;
- **sous un toit** (une pièce close, une maison de hameau) : le dehors s'étouffe ; **endormi** :
  la nature baisse, la musique se tait ;
- **ce qui tourne sur la ferme**, placé dans l'espace (volume selon la distance, gauche-droite) :
  la voilure du Moulin (`moulinTour.enMarche`), la meule (`meuleOn`), le four (`fireOn`), la
  pompe, les asperseurs en marche, le robot au travail, les ruches (de 7 h à 19 h 30), les
  hameaux (leurs bruits de travail, le jour) ;
- **les cris des bêtes de la ferme** (voir plus bas), le chat et le chien de la famille,
  la faune du grand monde près de la vue ;
- **la musique** : le thème du matin (5 h 30-17 h), du soir (17 h-21 h), de la nuit, celui de la
  mine sous terre. « Par moments » (le réglage par défaut) : deux à trois minutes de musique,
  puis une à deux minutes et demie de monde seul.

Dans la mine : la grotte (le grondement, les gouttes) et son thème, rien de la ferme.

### Les gestes et l'interface

| Moment | Clé | Où |
|---|---|---|
| un pas (images 0 et 2 de la marche) ; le sol : plancher, chemin, terre labourée, eau, biome | `pas_herbe`, `pas_terre`, `pas_pierre`, `pas_bois`, `pas_sable`, `pas_eau`, `pas_feuilles` | `js/fermier.js` (`bruitPas`), `js/grotte.js` (la roche) |
| à cheval, à triporteur | `sabots_*`, `ebrouement` ; `pedalier`, `sonnette` | `FermeSon.pas` |
| houe, semis, arrosage, récolte (au coup) | `houe`, `semis`, `arrosage`, `recolte` | `js/fermier.js` (`GESTE_SON`) |
| hache, arbre qui tombe, buisson | `hache`, `arbre_tombe`, `recolte`, `arracher` | `hache.js`, `recolte-monde.js`, `habitants.js` (le bûcheron) |
| pioche, rocher brisé, minerai | `pioche`, `retrait`, `pioche_minerai` | `pioche.js`, `recolte-monde.js`, `js/grotte.js` |
| faux, coup fort, coup dans le vide | `faux`, `houe`, `coup_vide` | `decor.js`, `recolte-monde.js`, `coupfort.js` |
| ce qu'il prend (la bulle « +x ») | `pris_bois`, `pris_pierre`, `pris_herbe`, `pris_minerai`, `oeuf`, `lait`, `tonte` | `etiquettes.js` (`showGain`), `js/grotte.js` (`popGain`) |
| pêche : lancer, bouchon, touche, moulinet, prise, rien | `lancer`, `plouf`, `touche`, `moulinet`, `prise`, `rate` | `peche.js` |
| un bloc posé (bois, pierre, métal), retiré | `pose_bois`, `pose_pierre`, `pose_metal`, `retrait` | `chantier.js` (`syncBlocks`, pas au premier dessin) |
| la porte de la mine, l'échelle, l'escalier | `porte_ouvre`, `echelle` | `passages.js`, `js/grotte.js`, `etage.js` |
| une bête du monde touchée ou qui fuit | son cri (`FermeSon.cri`) | `faune-monde.js` |
| la botteleuse qui se met en marche | `botteleuse` | `botteleuse.js` |
| il s'endort ; 6 h (et le coq s'il y a des poules) | `dodo` ; `nouveau_jour`, `coq` | `js/fermier.js` ; `js/ui/game-actions.js` (`wakeUp`) |
| une fenêtre, une fenêtre de la carte, un onglet | `ouvre`, `ferme`, `onglet` | `js/ui/modal.js`, `js/ui/stage-windows.js` |
| une notification, selon son genre ; une action refusée | `info`, `alerte`, `cloche` (repas), `reussite` (lettre) ; `erreur` | `js/ui/toasts.js` (`notify`, option `son`), `js/ui/game-actions.js` (`applyResult`) |
| des pièces gagnées ou dépensées ; l'Atelier | `pieces`, `fabrique` | `js/ui/son.js` (le journal) |
| un plat prêt, une technologie, une page de l'encyclopédie | `cuisine`, `techno`, `decouverte` | `js/ui/loop.js`, `js/ui/techno.js`, `js/ui/encyclopedie.js` |
| un niveau, un chapitre (la musique s'efface un instant) | `niveau`, `chapitre` | `js/ui/niveaux.js`, `js/ui/chapitres.js` |
| poules nourries, tonte, étape du didacticiel, « Ravi de te revoir » | `grain`, `tonte`, `reussite`, `retour` | `js/ui/elevage.js`, `js/ui/didacticiel.js`, `js/ui/loop.js` |

La hache, la pioche et la houe ont un court élan avant l'impact : la carte les joue au coup
avec `depuis` (on part de l'impact dans le fichier). L'arbre qui tombe part à 1,7 s moins
la durée de la chute (`NATURE.chute.ms`) : le craquement pendant qu'il bascule, le fracas
quand il touche le sol.

## L'API

```js
FermeSon.joue(clé, { x, y, portee, gain, vitesse, varie, delai, depuis, prio, ecart })
// x, y : en px de la carte (sinon sur le personnage) ; portee en cases (22) ; ecart : pas deux fois plus près (s)
FermeSon.pas(x, y, monture, roule)   // un pas, ou les sabots / le pédalier
FermeSon.prise(items, options)       // le bruit de ce qui est pris ({ objet: n })
FermeSon.cri(espèce, x, y, gain)     // le cri d'une bête du grand monde
FermeSon.matin()                     // 6 h
FermeSon.reglages(), FermeSon.regle({ musique: 0.5 })
FermeSon.boucles()                   // ce qui tourne (tests, débogage)
```

Chaque clé a plusieurs variantes quand le bruit revient souvent : jamais deux fois la même de
suite, avec un peu de hauteur et de volume au hasard.

## Les bêtes de la ferme

Poules, vaches, moutons et cheval sont **de vrais enregistrements**, cinq par bête (le jeu en
tire un au hasard à chaque cri), plus des poussins, un agneau et une clochette de vache. Ils
viennent de jeux libres qui documentent la provenance de chaque son (Stendhal, VoxeLibre,
0 A.D.), et la plupart de Freesound et SoundBible. Leur licence est notée fichier par fichier
dans `scripts/son/enregistrements/credits.json`, et recopiée dans `assets/son/CREDITS.md` :

- **CC0 et domaine public** (13 fichiers) : aucune obligation ;
- **CC BY 3.0** (5 fichiers : deux poules, un hennissement, deux ébrouements) : citer l'auteur ;
- **CC BY-SA 3.0** (3 fichiers de 0 A.D. : deux vaches, le petit rire du cheval) : citer
  Wildfire Games, et ces fichiers (et leurs modifications) restent sous CC BY-SA.

`assets/son/CREDITS.md`, publié avec le site, tient lieu de crédits. Les enregistrements nettoyés
(silences coupés, volumes égalisés) sont gardés en FLAC dans `scripts/son/enregistrements/` ;
`vers_jeu.py` les encode comme les autres sons.

**Le coq du réveil** est lui aussi un vrai enregistrement : trois cocoricos de trois coqs
différents (BigSoundBank, CC0, `scripts/son/libres.py`), un peu plus forts que les autres bêtes.

Restent synthétisés, faute d'enregistrement libre accessible, **les sabots** (une diagonale de
trot par fichier, sur pierre ferrée, terre battue et herbe), dans `scripts/son/betes.py`. De
vrais sabots libres (CC0) se mettraient à leur place : un fichier dans `enregistrements/`, une
ligne dans `credits.json` et dans `vers_jeu.py`.

**À l'approche d'un enclos** (`directeur`, `ENCLOS` dans `js/son.js`), pour chaque sorte de bête
de la ferme (`FarmStage.scene().beasts`) :

- pas de fond d'ambiance autour des bâtiments : seulement les cris ;
- leurs **cris** reviennent toutes les 4 à 9 s à moins de 6 cases, toutes les 12 à 25 s plus
  loin (le cheval : 35 à 80 s) ;
- en arrivant à moins de 7 cases (`SALUT_CASES`), **une ou deux bêtes saluent**, une fois par
  minute au plus ;
- de temps en temps, ce qu'on entend en plus : les poussins, la clochette d'une vache, le cheval
  qui s'ébroue.

À cheval, les sabots suivent le rythme d'un vrai trot (une diagonale toutes les 0,32 s tant
qu'il avance), sur le sol sous lui.

`scripts/son/analyse.py` et `betes_reelles.py` sont les outils d'analyse qui ont servi à
comparer les synthèses à de vrais cris (corpus ESC-50, sous licence non commerciale : les mesures
qui en sortent restent dans `_sortie/`, jamais commitées, et rien n'en vient dans le jeu).

## Le chat et le chien de la famille

Quand la famille a un chat ou un chien (`stats().compagnons` de `js/ambient-life.js`), il se fait
entendre de temps en temps (`COMPAGNON` dans `js/son.js`) : le chien toutes les 30 à 80 s (deux
fois sur cinq, il aboie deux fois de suite), jusqu'à 24 cases ; le chat toutes les 40 à 100 s,
jusqu'à 22 cases. Ni la nuit (de 21 h à 5 h 30), ni quand le personnage dort, ni quand la bête dort (le chat
sur son toit, la sieste) : le chien n'a pas de toit et dort sur place, son `nuit` reste faux, c'est
l'heure qui le fait taire.

Ce sont de vrais enregistrements de Joseph Sardin sur BigSoundBank, sous CC0, préparés par
`libres.py` (au niveau des bêtes de la ferme) :

- **le chat** (`chat`, trois variantes de 1,7 à 2,2 s) : trois miaulements d'un chat domestique pris
  de près dans une pièce calme (« Meow cat #14 », « #2 » avec son petit roulement, « #1 ») ;
- **le chien** (`chien`, trois variantes de 0,7 à 1 s) : un chien de traîneau seul, dehors
  (« Barking Dog #2 ») : deux « wouf-wouf » et un aboiement seul. Pas un molosse : un chien de
  travail de taille moyenne, sans grognement.

Le renard du grand monde ne crie pas (il n'a pas de vrai cri libre de droits).

## L'arrosoir, la hulotte et la grenouille

D'autres vrais enregistrements, sous CC0, préparés par `scripts/son/libres.py` (télécharger,
couper les grondements, garder les passages choisis, fondus, volume égalisé sur la tranche de
100 ms la plus forte, crêtes arrondies) qui écrit les FLAC dans `enregistrements/` et leur ligne
dans `credits.json` :

- **l'arrosage à la cruche** (`arrosage`, trois variantes d'1,4 s, au niveau des autres gestes) :
  « Watering with a Watering Can » de Bricklover sur Freesound, un arrosoir versé sur la terre ; trois
  moments du même versé, le premier avec l'eau qui part. L'original (MP3) demande un compte : on
  prend l'aperçu Ogg de haute qualité que Freesound publie ;
- **la hulotte** (`hibou`, quatre variantes) : deux chants entiers de Joseph Sardin (« hou… », puis
  « hou-hou-houuu » ; 5,5 et 5,7 s, le long silence entre les deux raccourci) et deux « hou » seuls
  du « Tiroir du fond » (1,3 et 1,4 s), sur BigSoundBank, en AIFF sans perte ;
- **la grenouille** (`grenouilles`, une boucle de 11,4 s) : « One frog » de Joseph Sardin sur
  BigSoundBank, une grenouille qui chante la nuit près d'une petite mare, sans autre bruit, coupée
  de silence à silence pour que la reprise de la boucle ne s'entende pas. Elle chante la nuit à
  moins de 10 cases des mares et étangs de la ferme, et dans le marais (un peu le jour aussi). Les
  autres grenouilles de BigSoundBank ont une cascade, du vent ou des oiseaux derrière : écartées,
  puisque le jeu n'a plus de bruit d'eau.

## Ajouter ou changer un son

1. Le dessiner dans `scripts/son/sons2.py` (une fonction qui rend un tableau numpy, puis une
   ligne `S('sfx/…/nom_01.ogg', …)` dans le bloc final), ou changer une mélodie dans
   `scripts/son/musique.py` (notation texte : `note temps durée`, mesures séparées par `|`).
2. Lui donner une clé dans `scripts/son/vers_jeu.py` (`T` : clé → dossier, fichiers).
3. `python3 scripts/son/fabrique.py` (une à deux minutes) : `assets/son/` et la table de
   `js/son.js` sont refaits. Les masters WAV restent dans `scripts/son/_sortie/` (ignoré par git).
4. Le jouer : `FermeSon.joue('ma_clé', …)` là où le geste a lieu. Un nouveau bus ou un volume
   propre : `DOSSIER` et `PROPRE` dans `js/son.js`.

## Limites connues

- Il n'y a ni pluie ni météo dans le jeu : le son n'en a pas non plus.
- Les sabots sont encore synthétisés (voir « Les bêtes de la ferme »).
- Les portes posées en blocs ne s'animent pas : elles ne sonnent pas. Les habitants des hameaux
  n'ont pas de voix.
