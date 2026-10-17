# Le personnage de la carte (version provisoire)

Tout est dans `js/fermier.js`, chargé avant `js/farm-stage.js`. Le fichier et son image sont
facultatifs : sans eux, la carte s'affiche comme avant.

## L'image

Sept personnages : `fermier`, `fermiere`, et cinq qui suivent les portraits de `assets/portraits` (`papi`, `jeune_homme`, `rousse`, `lunettes`, `garcon`). Leur style (coupe, chapeau ou casquette, barbe, lunettes, taches de rousseur, motif de la chemise) est décrit dans `VARIANTES`. Pour chacun, `assets/<nom>.png` (cases de 16 × 32
px, 8 par rangée), `assets/<nom>.json` (le nom de chaque case, dans l'ordre) et
`assets/portrait_<nom>.png` (20 × 20, la tête et les épaules de face). Tout est écrit par
`scripts/personnage/fermier.py` (`--apercu` écrit aussi les planches agrandies) ; les deux
planches ont les mêmes cases, seules les couleurs et le style changent.

**Le catalogue** : 50 personnages de plus, `perso_01` à `perso_50`, décrits dans
`scripts/personnage/catalogue.py` (peau, cheveux, coupe, couvre-chef, détails, habit, motif).
`scripts/personnage/portraits.py` en tire leur portrait 16 × 16 (`assets/portraits/perso_XX.png`),
`scripts/personnage/fermier.py` leur planche de 70 cases (`assets/personnages/perso_XX.png`, les
noms des cases, les mêmes pour tous, dans `assets/personnages/cases.json`). Coupes : longs, mi,
carré, courts, frange, carré à frange, couettes, chignon, crâne dégarni ; sur la tête : chapeau de
paille, casquette, bonnet, béret, bandeau, fleur ; détails : barbe, moustache, lunettes, taches de
rousseur, boucles d'oreilles ; habits unis, à rayures, à carreaux ou à pois.

**Les adultes de la famille** (version 1.17) ont l'apparence d'un de ces 50 personnages : dans la
fiche d'un adulte (✏️), la grille « Personnage » remplace le sexe, la coiffure et la teinte des
emojis (`member.perso`, 1 à 50 ; sans choix, `PERSO_DEFAUT` selon le sexe : 1 pour une femme, 7
pour un homme). Leur portrait s'affiche dans l'écran de départ, la Famille et la carte du joueur ;
**sur la carte de la ferme, c'est celui du personnage principal** (le premier adulte : son choix
est masqué à l'écran de départ, `CHOIX_PRINCIPAL` dans `js/ui/depart.js`) :
`modèle.perso`, sa planche est chargée à la demande (`syncPerso`).

**Les enfants** ont de même un des 50 portraits d'enfants (`assets/portraits/enfant_XX.png`,
dérivés de `modele_enfant.png` par `scripts/personnage/portraits_enfants.py` ; 9 coupes, chapeaux,
nœud, serre-tête, fleur, lunettes, taches de rousseur, joues roses, pansement, salopette). Leur
fiche a la même grille ; sans choix, `PERSO_DEFAUT_ENFANT` (1 pour un garçon, 2 pour une fille).
Ils ne sont pas encore sur la carte : pas de planche d'enfant.

Avant que la planche choisie soit chargée, la carte montre la fermière.

| Cases | Pour |
|---|---|
| `idle_<vue>_0..1` | debout, il respire |
| `marche_<vue>_0..3` | marcher (l'image suit la distance parcourue) |
| `houe_<vue>_0..3` | labourer ; la case change au coup (image 3) |
| `plante_<vue>_0..2` | planter (et récolter) |
| `arrose_<vue>_0..2` | arroser |
| `panier_<vue>_0..3` | marcher avec le panier d'œufs |
| `cuisine_0..3`, `frigo_0..2`, `ramasse_0..2` | cuisiner, ouvrir le frigo, ramasser un œuf |

Une vraie planche remplacera celle-ci : il suffit de garder les mêmes noms de cases (ou d'en
ajouter : le JSON donne l'ordre).

## Ce qu'il fait

- **Le jour** (de 6 h à 21 h 30) il sort de la maison et flâne devant ; le soir il rentre et
  disparaît derrière la porte.
- **Les gestes du joueur.** La carte compare deux modèles de vue qui se suivent, le même jour :
  une case qui devient de la terre (ou redevient de l'herbe), une graine, un arrosage ou une
  récolte est un geste. Il va à la case (à sa gauche, tourné vers elle) et fait le geste. Le jeu
  a déjà changé : la carte garde l'ancien dessin de la case (« retenue ») jusqu'au coup de houe
  ou au geste de la main. Pour un geste sur beaucoup de cases (« Arroser tout », un glissement
  de houe), il va aux 4 plus proches ; les autres changent en cascade après son dernier geste.
  Une retenue ne dure jamais plus de 9 s. Une case loin de lui (plus de 24 tuiles de chemin) :
  il y apparaît directement.
- **Il ramasse** (version 1.18). L'inventaire est celui du personnage principal : ce qui est
  produit n'y entre que quand il le prend. Une récolte au clic sur la carte (une case, « Récolter
  tout », un arbre du Verger), une tonte au clic, les œufs et le lait de la nuit attendent à leur
  place (`state.aRamasser`, `js/engine/ramassage.js`). Une récolte se ramasse au geste même ;
  le reste, il va le chercher dès qu'il est libre et dehors (le plus proche d'abord), ou tout de
  suite quand le joueur appuie sur sa bulle (« 🥚 6 » au-dessus du Poulailler, « 🥛 2 🧶 1 » au-dessus
  de l'Étable, « 🍎 4 » sur l'arbre…), même la nuit. Au Poulailler et à l'Étable, il remplit son
  panier et le rapporte devant la maison. À chaque prise, une bulle « +6 🥕 » monte au-dessus de
  lui, reste un instant puis s'estompe ; une prise qui arrive avant qu'elle ait disparu s'y
  additionne.
- **Poulailler et Étable** (version 1.19) : ils ne se vident plus d'eux-mêmes. Un double appui
  sur le bâtiment (ou un appui sur sa bulle) l'y envoie (`collect`) : au Poulailler, il prend les
  œufs ; à l'Étable, il tond les moutons prêts (énergie de la tonte, comme le bouton « Tondre » ;
  la laine prête s'annonce dans la bulle de l'Étable) puis prend lait et laine (`collectAt` du
  moteur). Rien à y prendre : le double appui ouvre la fenêtre du bâtiment. L'appui simple ouvre
  toujours la fenêtre, 300 ms plus tard.
- **Ce qui ne l'attend pas** : les automatisations (récolte et tonte de nuit, Arbre des
  technologies), la Serre, et tout quand la carte n'a pas de personnage (pas de carte, joueur
  automatique, essais du moteur) : directement dans l'inventaire (`state.ramassage` faux, réglé
  par la page à chaque rendu ; ce qui attendait y entre alors). Au début de chaque nuit, ce qui
  traîne encore est rentré (`collectLeftovers`, première étape nocturne) : rien ne se perd et
  les repas de la nuit le trouvent.
- **Double appui** (version 1.19) : dehors, deux appuis rapprochés (300 ms, 30 px) sur l'herbe
  ou un chemin l'y envoient (`goTo`, au point libre le plus proche) : il y va avant ses gestes en
  attente, puis flâne autour jusqu'au soir. Un petit rond marque l'arrivée. Sur l'herbe
  labourable, l'appui simple (la fenêtre de la Zone de culture) attend donc 300 ms. La nuit, rien.
- **Au doigt** : dehors, le doigt posé puis glissé (plus de 8 px) le fait marcher dans la
  direction du glissement tant qu'il reste posé, et il tourne avec le doigt (`steer`,
  `CarteKit.manette`) ; il glisse le long de ce qui le gêne. Le geste qu'il fait finit d'abord,
  ceux qui attendent reprennent au relâchement ; il souffle un instant puis flâne là. Pas avec la
  houe qui laboure en glissant, ni pendant la pêche, ni au lit.
- **Dans la maison** (l'intérieur) : il cuisine devant la Cuisine (ou le Four) tant qu'une
  préparation est en cours ; quand le contenu du réfrigérateur change, il va l'ouvrir.
- **Animations réduites** : ni marche ni retenue ; il se pose directement où il travaille.

Le modèle de vue lui donne `jour`, `cuisson` (`'cuisine'`, `'four'` ou `null`), `frigo` (les
unités au frais) et `ramasser` (les tas : `{ id, lieu, ref, texte }`), en plus des parcelles. Il
prend un tas par `o.pickup(id, fin)` (`FarmStage.mount(…, { pickup })`, qui appelle `pickUp()` du
moteur hors de la boucle d'image) et montre la bulle par `o.gain(items)`.

## Chemin

A\* sur les cases de la carte (8 directions), puis le chemin est tendu (il va tout droit tant
que rien ne le gêne). Bloqué : les rectangles nommés des bâtiments, l'eau et les pieds des
arbres (lus par `js/ambient-life.js`, `ground()`). Les zones de culture restent libres.

## Limites

- Image provisoire, dessinée par un script.
- Il ne voit ni les barrières ni les rochers du décor (comme le chat).
- Un seul personnage : la famille n'est pas encore sur la carte.
- Dehors et dans la maison, ce sont deux images : on ne voit jamais les deux à la fois.

Pour les essais : `FarmStage.scene().fermier.info()` (dont `aRamasser` et `prevus`), et
`.fetch('poulailler')` l'envoie chercher un tas, comme un appui sur sa bulle.
