# Le son

Le jeu a une bande-son complète : quatre thèmes de musique, les ambiances de la ferme et des
biomes du grand monde, les bêtes, les machines, chaque geste du personnage et les fenêtres de
l'interface. Tout est synthétisé pour le jeu par `scripts/son/`, sauf le cheval :
de vrais enregistrements libres de droits (voir « Les bêtes de la ferme » et `assets/son/CREDITS.md`).

## Découpage

| Fichier | Rôle |
|---|---|
| `js/son.js` | le moteur (`window.FermeSon`, script classique chargé après le kit des cartes) : Web Audio, cinq bus, les boucles, le « directeur » des ambiances, les pas |
| `js/ui/son.js` | côté interface (module ES) : `son(clé)` pour les écrans, l'écoute du journal (pièces, Atelier), la partie « Son » des Options |
| `assets/son/` | les sons, `.ogg` (Vorbis) et `.m4a` (AAC, pour Safari qui ne lit pas l'Ogg), rangés par dossier |
| `scripts/son/` | les générateurs : `musique.py`, `sons1.py`, `sons2.py` (synthèse), `vers_jeu.py` (encodage et table de `js/son.js`), `fabrique.py` (tout) |

Le moteur ne lit jamais l'état du jeu et ne change rien à la partie. Sans Web Audio, avant le
premier geste du joueur (les navigateurs ne jouent rien avant), ou le son coupé, chaque appel
ne fait rien : les scènes et l'interface l'appellent toujours par
`if (global.FermeSon) global.FermeSon.joue(…)` ou `son(…)`.

### Les bus

| Bus | Curseur des Options | Contenu |
|---|---|---|
| musique | 🎵 Musique | les thèmes |
| nature | 🌳 Ambiance | oiseaux, grillons, vent, mer, lac, rivière, forêt, montagne, grotte, grenouilles, cris d'oiseaux et chouette |
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
  de la nuit, un peu plus de vent la nuit ; de petits cris d'oiseaux le jour, la chouette la nuit ;
- **le biome sous le personnage** (le grand monde, comme `eauMondeSous`) : mer et plage, falaise,
  forêt, marais (grenouilles la nuit), montagne et sommet (le vent qui siffle, moins d'oiseaux),
  lac, rivière, lande ; et l'eau du monde à 5 cases autour de lui ;
- **sous un toit** (une pièce close, une maison de hameau) : le dehors s'étouffe ; **endormi** :
  la nature baisse, la musique se tait ;
- **ce qui tourne sur la ferme**, placé dans l'espace (volume selon la distance, gauche-droite) :
  la voilure du Moulin (`moulinTour.enMarche`), la meule (`meuleOn`), le four (`fireOn`), la
  pompe, les asperseurs en marche, le robot au travail, les ruches (de 7 h à 19 h 30), les mares
  et étangs, les hameaux (leurs bruits de travail, le jour) ;
- **le cheval** de temps en temps (les enclos, eux, sont silencieux : voir plus bas), le chat et le chien de la famille,
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

**Le Poulailler, l'Étable et la bergerie sont silencieux** : ni fond ni cris à l'approche. Les
enregistrements des poules, vaches et moutons (cinq par bête, plus des poussins, un agneau et une
clochette) restent dans `scripts/son/enregistrements/` avec leurs crédits, hors du jeu, prêts à
revenir : une ligne dans `vers_jeu.py` et un appel dans `directeur` (`js/son.js`).

**Le cheval** est de vrais enregistrements libres de droits : deux hennissements et un petit rire
grave (`cheval`), deux ébrouements (`ebrouement`). Le jeu en joue un de temps en temps près de lui
(toutes les 35 à 80 s), et l'ébrouement quand on monte en selle. Ils viennent de jeux libres qui
documentent la provenance de chaque son (Stendhal, VoxeLibre, 0 A.D.) ; leur licence est notée
fichier par fichier dans `scripts/son/enregistrements/credits.json`, et recopiée dans
`assets/son/CREDITS.md`, publié avec le site, qui tient lieu de crédits :

- **CC0** (1 fichier) : aucune obligation ;
- **CC BY 3.0** (3 fichiers : un hennissement, deux ébrouements) : citer l'auteur ;
- **CC BY-SA 3.0** (1 fichier de 0 A.D. : le petit rire) : citer Wildfire Games, et ce fichier
  (et ses modifications) reste sous CC BY-SA.

Les enregistrements nettoyés (silences coupés, volumes égalisés) sont gardés en FLAC dans
`scripts/son/enregistrements/` ; `vers_jeu.py` les encode comme les autres sons.

Restent synthétisés, faute d'enregistrement libre accessible : **le coq du réveil** (trois
variantes, réglées sur des mesures générales de chants de coq : hauteur ≈ 750 Hz, formants
≈ 880 / 1 680 / 2 970 Hz ; il chante à 6 h s'il y a des poules sur la ferme) et **les sabots**
(une diagonale de trot par fichier, sur pierre ferrée, terre battue et herbe), dans
`scripts/son/betes.py`. Un vrai chant de coq ou de vrais sabots libres (CC0) se mettraient à leur
place : un fichier dans `enregistrements/`, une ligne dans `credits.json` et dans `vers_jeu.py`.

À cheval, les sabots suivent le rythme d'un vrai trot (une diagonale toutes les 0,32 s tant
qu'il avance), sur le sol sous lui.

`scripts/son/analyse.py` et `betes_reelles.py` sont les outils d'analyse qui ont servi à
comparer les synthèses à de vrais cris (corpus ESC-50, sous licence non commerciale : les mesures
qui en sortent restent dans `_sortie/`, jamais commitées, et rien n'en vient dans le jeu).

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
- Le coq et les sabots sont encore synthétisés (voir « Les bêtes de la ferme »).
- Les portes posées en blocs ne s'animent pas : elles ne sonnent pas. Les habitants des hameaux
  n'ont pas de voix.
